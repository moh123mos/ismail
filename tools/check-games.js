#!/usr/bin/env node
/*
 * Check of EVERY game page (pages/*.html, files starting with a dot are skipped) in a real headless Chrome.
 * A new game is picked up automatically; nothing to register here.
 *
 *   python tools/serve.py                                  # in one terminal (http://127.0.0.1:8123)
 *   node tools/check-games.js [baseUrl] [outDir] [--only=<game-id>]
 *
 * For each game:
 *  1. Responsive audit at 7 viewports (phones, tablets in both orientations, laptop, 1080p projector):
 *     no horizontal scroll, nothing pushed off-screen, touch targets >= 44px, text >= 14px,
 *     fonts and icons loaded, no failed requests, no console errors. A full-page screenshot per viewport.
 *  2. Look: screenshots of the real states (question / right / wrong / winners dialog) on a laptop and a phone.
 *  3. Standard scenario: .claude/skills/verify-game/scenario-choice.js for multiple-choice games, or
 *     scenario-<game-id>.js for a custom-interaction game, or a generic smoke test (start -> timeout counts as wrong)
 *     when a custom game has no scenario yet.
 *  4. Shell behaviour: number keys pick an answer, sounds are silent before the first real click and play after it,
 *     the sound switch mutes and is remembered, the animated emoji loads, the credits link is present.
 * Exit code 1 if anything fails. Screenshots go to outDir (default: the OS temp folder / check-games).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wait, PROFILES, session } = require('./lib/cdp');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7);
const pos = args.filter((a) => !a.startsWith('--'));
const BASE = (pos[0] || 'http://127.0.0.1:8123').replace(/\/$/, '');
const OUT = path.resolve(pos[1] || path.join(os.tmpdir(), 'check-games'));
fs.mkdirSync(OUT, { recursive: true });

const SCENARIO_DIR = path.join(ROOT, '.claude', 'skills', 'verify-game');
const GAMES = fs.readdirSync(path.join(ROOT, 'pages'))
  .filter((f) => /^[^.].*\.html$/.test(f)).map((f) => f.replace(/\.html$/, '')).filter((g) => !only || g === only);
if (!GAMES.length) { console.error('No game pages found' + (only ? ` matching "${only}"` : '')); process.exit(2); }

let failures = 0;
const ok = (cond, label, extra) => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); };

/* ------------------------------------------------------------------ audit script (runs in the page) */
const AUDIT = `(() => {
  const vw = innerWidth, out = { vw, overflowX: document.documentElement.scrollWidth - vw, small: [], tiny: [], offscreen: [], fonts: [], badIcons: 0, icons: 0 };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const name = (el) => el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  document.querySelectorAll('a[href], button, select, input:not([type=hidden]):not([type=checkbox]):not([type=file]), label.btn, label.checkbox-option, [role=button]').forEach((el) => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    if (r.width < 44 || r.height < 44) out.small.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText || !vis(el) || el.closest('svg, option')) return;
    const f = parseFloat(getComputedStyle(el).fontSize);
    if (f < 14 && !seen.has(name(el))) { seen.add(name(el)); out.tiny.push(name(el) + ' ' + f + 'px'); }
  });
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('svg, .sun, .visually-hidden, #resultsBanner, #bannerOverlay') || !vis(el)) return;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') out.offscreen.push(name(el) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
  });
  document.querySelectorAll('i[class*="ph-"]').forEach((i) => { out.icons++; const c = getComputedStyle(i, '::before').content; if (!c || c === 'none' || c === 'normal') out.badIcons++; });
  out.fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, ''));
  out.offscreen = out.offscreen.slice(0, 6); out.small = [...new Set(out.small)].slice(0, 8); out.tiny = out.tiny.slice(0, 8);
  return JSON.stringify(out);
})()`;

const SHOT = async (s, file, p, full) => {
  let h = p.h;
  if (full) { const m = await s.send('Page.getLayoutMetrics'); h = Math.min(Math.ceil(m.result.cssContentSize.height), 9000); }
  await s.send('Emulation.setDeviceMetricsOverride', { width: p.w, height: h, deviceScaleFactor: 1, mobile: p.mobile });
  await wait(900);
  const shot = await s.send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, file), Buffer.from(shot.result.data, 'base64'));
  await s.send('Emulation.setDeviceMetricsOverride', { width: p.w, height: p.h, deviceScaleFactor: p.dpr, mobile: p.mobile });
};
const setViewport = async (s, p) => {
  await s.send('Emulation.setDeviceMetricsOverride', { width: p.w, height: p.h, deviceScaleFactor: p.dpr, mobile: p.mobile });
  await s.send('Emulation.setTouchEmulationEnabled', { enabled: p.mobile, maxTouchPoints: 5 });
};
const open = async (s, game, clean) => {
  await s.send('Page.navigate', { url: `${BASE}/pages/${game}.html` });
  await wait(2500);
  if (clean) { await s.ev('try { localStorage.clear() } catch (e) {} true'); await s.send('Page.navigate', { url: `${BASE}/pages/${game}.html` }); await wait(2500); }
  await s.ev('document.fonts.ready.then(() => true)');
};
const LAPTOP = PROFILES.find((p) => p.name === 'laptop');
const PHONE = PROFILES.find((p) => p.name === 'phone');

/* ------------------------------------------------------------------ 1. responsive audit */
async function audit(port, game) {
  console.log(`\n== ${game}: responsive audit ==`);
  const s = await session(port);
  for (const p of PROFILES) {
    await setViewport(s, p);
    s.errors.length = 0; s.failedRequests.length = 0;
    await open(s, game, false);
    await s.ev("window.scrollTo({ top: 0, behavior: 'instant' }); true");
    const a = JSON.parse(await s.ev(AUDIT));
    ok(a.overflowX <= 1, `${game} ${p.name} ${p.w}x${p.h}: no horizontal scroll`, a.overflowX > 1 ? `(+${a.overflowX}px)` : '');
    ok(a.offscreen.length === 0, `${game} ${p.name}: nothing pushed outside the viewport`, a.offscreen.join(' | '));
    ok(a.small.length === 0, `${game} ${p.name}: touch targets >= 44px`, a.small.join(' | '));
    ok(a.tiny.length === 0, `${game} ${p.name}: text >= 14px`, a.tiny.join(' | '));
    if (p.name === 'laptop') {
      for (const f of ['Baloo Bhaijaan 2', 'Alexandria', 'Phosphor-Bold', 'Phosphor-Fill']) ok(a.fonts.includes(f), `${game}: font "${f}" loaded`);
      ok(a.icons > 5 && a.badIcons === 0, `${game}: icons render`, `(${a.icons} icons, ${a.badIcons} without glyph)`);
      ok(s.failedRequests.length === 0, `${game}: no failed requests`, s.failedRequests.join(' | '));
      ok(s.errors.length === 0, `${game}: no console errors`, s.errors.join(' | '));
    }
    await SHOT(s, `${game}-${p.name}.png`, p, true);
  }
  await s.close();
}

/* ------------------------------------------------------------------ 2. real states, for the eyes */
async function states(port, game) {
  console.log(`\n== ${game}: states (screenshots) ==`);
  const s = await session(port);
  for (const p of [LAPTOP, PHONE]) {
    await setViewport(s, p);
    await open(s, game, true);
    await s.ev(`(async () => { soundOn = false; const $ = (i) => document.getElementById(i); const sleep = (m) => new Promise((r) => setTimeout(r, m));
      for (const n of ['أحمد', 'سارة', 'يوسف']) { $('newStudent').value = n; $('addStudent').click(); await sleep(40); }
      $('studentSelect').value = 'أحمد'; return true; })()`);
    await SHOT(s, `${game}-state-0-idle-${p.name}.png`, p, true);
    await s.ev("document.getElementById('startBtn').click(); true"); await wait(900);
    await SHOT(s, `${game}-state-1-question-${p.name}.png`, p, true);
    const choice = await s.ev('!!document.querySelector("#choices .choice")');
    // right answer
    await s.ev(`(() => { const ctx = GameShell.current; const b = [...document.querySelectorAll('#choices .choice')].find((x) => x._value === correctAnsGlobal);
      if (b) b.click(); else ctx.finishRound(true, { counted: true }); return true; })()`);
    await wait(1100);
    await SHOT(s, `${game}-state-2-right-${p.name}.png`, p, true);
    await wait(2400);
    // wrong answer (next student)
    await s.ev("document.getElementById('startBtn').click(); true"); await wait(700);
    await s.ev(`(() => { const ctx = GameShell.current; const b = [...document.querySelectorAll('#choices .choice')].find((x) => x._value !== correctAnsGlobal);
      if (b) b.click(); else ctx.finishRound(false, { counted: true }); return true; })()`);
    await wait(1100);
    await SHOT(s, `${game}-state-3-wrong-${p.name}.png`, p, true);
    await wait(2400);
    await s.ev("document.getElementById('finalizeResultsBtn').click(); true"); await wait(1500);
    await SHOT(s, `${game}-state-4-banner-${p.name}.png`, p, false);
    ok(true, `${game} ${p.name}: state screenshots saved`, choice ? '(multiple choice)' : '(custom interaction)');
  }
  await s.close();
}

/* ------------------------------------------------------------------ 3. the standard scenario */
async function scenario(port, game) {
  console.log(`\n== ${game}: standard scenario ==`);
  const s = await session(port);
  await setViewport(s, LAPTOP);
  await open(s, game, true);
  const isChoice = await s.ev('typeof GameShell === "object" && !!GameShell.current && typeof GameShell.current.cfg.buildQuestion === "function"');
  const custom = path.join(SCENARIO_DIR, `scenario-${game}.js`);
  let file = null;
  if (isChoice) file = path.join(SCENARIO_DIR, 'scenario-choice.js'); else if (fs.existsSync(custom)) file = custom;
  let res;
  if (file) {
    res = JSON.parse(await s.ev(`(async () => JSON.stringify(await (${fs.readFileSync(file, 'utf8')})()))()`));
    ok(res.passed, `${game}: ${path.basename(file)}`, res.failed.join(' | '));
  } else {
    // generic custom-interaction smoke test: start, let the timer run out, the round must be counted as wrong
    res = JSON.parse(await s.ev(`(async () => { soundOn = false; const $ = (i) => document.getElementById(i); const sleep = (m) => new Promise((r) => setTimeout(r, m)); const failed = [];
      $('newStudent').value = 'أحمد'; $('addStudent').click(); await sleep(50); $('studentSelect').value = 'أحمد'; $('timerInput').value = 1;
      $('startBtn').click(); await sleep(400);
      if (getComputedStyle($('startBtn')).display !== 'none') failed.push('start did not hide the start button');
      await sleep(1600);
      if (!(results['أحمد'] && results['أحمد'].bad === 1)) failed.push('timeout was not counted as wrong: ' + JSON.stringify(results['أحمد']));
      return JSON.stringify({ passed: !failed.length, failed }); })()`));
    ok(res.passed, `${game}: generic smoke test (no scenario-${game}.js yet — add one for deeper checks)`, res.failed.join(' | '));
  }
  ok(s.dialogs.every((d) => !/undefined|NaN/.test(d)), `${game}: dialogs shown have sane text`, s.dialogs.join(' | '));
  await s.close();
}

/* ------------------------------------------------------------------ 4. shell behaviour: keys, sound, emoji, credits */
async function shell(port, game) {
  console.log(`\n== ${game}: shell behaviour ==`);
  const s = await session(port);
  await setViewport(s, LAPTOP);
  await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__a = { osc: 0 }; const AC = window.AudioContext; if (!AC) return;
    window.AudioContext = function (...a) { const c = new AC(...a); const o = c.createOscillator.bind(c); c.createOscillator = () => { window.__a.osc++; return o(); }; return c; }; window.AudioContext.prototype = AC.prototype; })();` });
  await s.send('Network.setBlockedURLs', { urls: ['*elevenlabs.io*'] });   // speech must never hit the real API from a test
  await open(s, game, true);
  const audio = () => s.ev('window.__a.osc');
  const mouse = (type, x, y) => s.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  const center = async (sel) => JSON.parse(await s.ev(`(() => { const el = document.querySelector('${sel}'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`));

  ok(await s.ev('!!document.querySelector(".g-footer a[href$=\\"credits.html\\"]")'), `${game}: footer links to the credits page`);
  const hasEmoji = await s.ev('!!document.querySelector(".h1-row [data-emoji]")');
  ok(hasEmoji, `${game}: has an island emoji (cfg.emoji) next to the title`);
  if (hasEmoji) { await wait(800); ok(await s.ev('!!document.querySelector(".h1-row [data-emoji] svg")'), `${game}: the animated emoji loaded (not just the fallback character)`); }

  await s.ev(`(() => { const $ = (i) => document.getElementById(i); for (const n of ['أحمد', 'سارة']) { $('newStudent').value = n; $('addStudent').click(); } $('studentSelect').value = 'أحمد'; return true; })()`);
  // JS clicks are not real gestures: the browser keeps audio locked, so no note may sound yet
  await s.ev("document.getElementById('startBtn').click(); true"); await wait(500);
  ok((await audio()) === 0, `${game}: sound stays silent before a real click (browser autoplay rule)`);
  await s.ev("GameShell.current.finishRound(true, { counted: false }); true"); await wait(1000);
  await s.ev("document.getElementById('startBtn').hidden === false; true");

  // a real click unlocks audio: start plays the "go" blip, a right answer the win jingle, a wrong one the soft lose sound
  const c = await center('#startBtn'); await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await wait(700);
  const n1 = await audio(); ok(n1 >= 2, `${game}: starting a round plays a sound after a real click`, `(${n1} notes)`);
  const isChoice = await s.ev('typeof GameShell.current.cfg.buildQuestion === "function"');
  if (isChoice) {
    ok(await s.ev('[...document.querySelectorAll("#choices .choice")].every((b) => b.dataset.key)'), `${game}: answers carry a key badge`);
    await s.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '1', code: 'Digit1', text: '1', windowsVirtualKeyCode: 49 });
    await s.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '1', code: 'Digit1', windowsVirtualKeyCode: 49 });
    await wait(500);
    ok(await s.ev('answered === true'), `${game}: pressing the key 1 picks the first answer`);
    const n2 = await audio(); ok(n2 > n1, `${game}: an answer plays a win or lose sound`, `(${n1} -> ${n2})`);
  } else {
    await s.ev("GameShell.current.finishRound(true, { counted: false }); true"); await wait(600);
    const n2 = await audio(); ok(n2 > n1, `${game}: a finished round plays a sound`, `(${n1} -> ${n2})`);
  }
  await wait(2600);
  // sound switch: mute -> stored, nothing more plays
  const t = await center('#toggleSound'); await mouse('mousePressed', t.x, t.y); await mouse('mouseReleased', t.x, t.y); await wait(300);
  ok((await s.ev("localStorage.getItem('home_sfx')")) === 'off' && (await s.ev('soundOn')) === false, `${game}: the sound switch mutes and is remembered`);
  const n3 = await audio();
  await s.ev("document.getElementById('studentSelect').value = 'سارة'; document.getElementById('startBtn').click(); true"); await wait(500);
  await s.ev("GameShell.current.finishRound(true, { counted: false }); true"); await wait(600);
  ok((await audio()) === n3, `${game}: muted means silent`);
  // the choice persists across a reload
  await s.send('Page.navigate', { url: `${BASE}/pages/${game}.html` }); await wait(2500);
  ok((await s.ev('soundOn')) === false, `${game}: the mute choice survives a reload`);
  await s.ev("localStorage.removeItem('home_sfx'); true");
  await s.close();
}

/* ------------------------------------------------------------------ main */
(async () => {
  console.log(`Games: ${GAMES.join(', ')}   (${BASE})`);
  let port = 9460;
  for (const game of GAMES) {
    await audit(port++, game);
    await states(port++, game);
    await scenario(port++, game);
    await shell(port++, game);
  }
  console.log(`\n${failures ? failures + ' check(s) FAILED' : 'All checks passed'}  (screenshots: ${OUT})`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
