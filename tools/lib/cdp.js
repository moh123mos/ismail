/*
 * Shared helpers for the browser checks (tools/check-landing.js, tools/check-games.js):
 * start a headless Chrome and drive it through the DevTools protocol. No packages (Node 22+ has a global WebSocket).
 * Set CHROME=/path/to/chrome if Chrome is not in a default location.
 */
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');

const CHROME = process.env.CHROME || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome not found. Set CHROME=/path/to/chrome'); process.exit(2); }

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const getJSON = (url) => new Promise((res, rej) => http.get(url, (r) => { let b = ''; r.on('data', (d) => (b += d)); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }).on('error', rej));

/** The seven viewports every page must work at: phones, tablets (both orientations), laptop, 1080p projector. */
const PROFILES = [
  { name: 'phone-small', w: 320, h: 640, dpr: 2, mobile: true },
  { name: 'phone', w: 390, h: 844, dpr: 3, mobile: true },
  { name: 'phone-landscape', w: 844, h: 390, dpr: 3, mobile: true },
  { name: 'tablet', w: 768, h: 1024, dpr: 2, mobile: true },
  { name: 'tablet-landscape', w: 1024, h: 768, dpr: 2, mobile: true },
  { name: 'laptop', w: 1440, h: 900, dpr: 1, mobile: false },
  { name: 'projector-1080p', w: 1920, h: 1080, dpr: 1, mobile: false }
];

/**
 * Open a Chrome with a throw-away profile and return a handle:
 *   send(method, params)  raw DevTools call          ev(expression)  evaluate (awaits promises), returns the value
 *   errors[]              uncaught exceptions + console errors
 *   failedRequests[]      requests that failed or answered >= 400 (cleared with failedRequests.length = 0)
 *   dialogs[]             alert/confirm texts that appeared (they are accepted automatically)
 *   close()               stop Chrome and delete the profile
 */
async function session(port) {
  const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'cdp-check-'));
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${prof}`, '--window-size=1440,900', 'about:blank'], { stdio: 'ignore' });
  let targets;
  for (let i = 0; i < 60; i++) { try { targets = await getJSON(`http://127.0.0.1:${port}/json/list`); if (targets.length) break; } catch (e) { /* not ready yet */ } await wait(250); }
  const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  let id = 0; const pending = {}; const errors = []; const failedRequests = []; const dialogs = []; const urls = {};
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending[d.id]) { pending[d.id](d); delete pending[d.id]; }
    if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || ''));
    if (d.method === 'Network.requestWillBeSent') urls[d.params.requestId] = d.params.request.url;
    if (d.method === 'Network.loadingFailed' && !d.params.canceled) failedRequests.push('FAILED ' + (urls[d.params.requestId] || '?') + ' ' + d.params.errorText);
    if (d.method === 'Network.responseReceived' && d.params.response.status >= 400) failedRequests.push(d.params.response.status + ' ' + d.params.response.url);
    if (d.method === 'Page.javascriptDialogOpening') { dialogs.push(d.params.message); send('Page.handleJavaScriptDialog', { accept: true }); }
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending[i] = r; ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails)); return r.result.result.value; };
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable'); await send('Network.enable');
  return {
    send, ev, errors, failedRequests, dialogs,
    close: async () => { try { ws.close(); } catch (e) { /* ignore */ } chrome.kill(); await wait(400); try { fs.rmSync(prof, { recursive: true, force: true }); } catch (e) { /* ignore */ } }
  };
}

module.exports = { CHROME, wait, getJSON, PROFILES, session };
