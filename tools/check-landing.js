#!/usr/bin/env node
/*
 * Landing-page check (index.html) in a real headless Chrome, driven through the DevTools protocol.
 * No packages needed (Node 22+ has a global WebSocket).
 *
 *   python tools/serve.py                      # in one terminal (http://127.0.0.1:8123)
 *   node tools/check-landing.js [baseUrl] [outDir]
 *
 * 1. Responsive audit at 7 viewports: horizontal overflow, touch targets < 44px, text < 14px,
 *    plus a full-page screenshot per viewport (outDir, default: the OS temp folder / check-landing).
 * 2. Behaviour (laptop viewport): "try it yourself" quiz (timer, wrong / right / timeout / keyboard),
 *    podium counters, sound effects (locked before the first gesture, win/lose/hover/sail/pop after it,
 *    mute switch + persistence), island click navigation, console errors.
 * Exit code 1 if any check fails. Set CHROME=/path/to/chrome if Chrome is not in a default location.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { wait, PROFILES, session } = require('./lib/cdp');

const BASE = (process.argv[2] || 'http://127.0.0.1:8123').replace(/\/$/, '');
const OUT = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'check-landing'));
fs.mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, label, extra) => { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}${extra ? '  ' + extra : ''}`); };

/* ---------------------------------------------------------------- 1. responsive audit */
const AUDIT = `(() => {
  const vw = innerWidth, out = { vw, overflowX: document.documentElement.scrollWidth - vw, small: [], tiny: [], offscreen: [] };
  const vis = (el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && cs.opacity !== '0'; };
  const name = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\\s+/).slice(0, 2).join('.') : '');
  document.querySelectorAll('a[href], button, [role=button]').forEach((el) => {
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    const inlineText = getComputedStyle(el).display === 'inline' && el.closest('p, small');
    if ((r.width < 44 || r.height < 44) && !inlineText) out.small.push(name(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height));
  });
  const seen = new Set();
  document.querySelectorAll('body *').forEach((el) => {
    if (!el.childNodes.length) return;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText || !vis(el)) return;
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (fs < 14 && !seen.has(name(el))) { seen.add(name(el)); out.tiny.push(name(el) + ' ' + fs + 'px'); }
  });
  document.querySelectorAll('body *').forEach((el) => {
    if (el.closest('.cloud, .sea, .night, svg, .critter, .night__deco') && !el.matches('a, button, h1, h2, p')) return;
    if (!vis(el)) return;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && getComputedStyle(el).position !== 'fixed') out.offscreen.push(name(el) + ' L' + Math.round(r.left) + ' R' + Math.round(r.right));
  });
  out.offscreen = out.offscreen.slice(0, 6); out.small = [...new Set(out.small)].slice(0, 8); out.tiny = out.tiny.slice(0, 8);
  return JSON.stringify(out);
})()`;

async function audit(port) {
  console.log('\n== Responsive audit ==');
  const s = await session(port);
  for (const p of PROFILES) {
    await s.send('Emulation.setDeviceMetricsOverride', { width: p.w, height: p.h, deviceScaleFactor: p.dpr, mobile: p.mobile });
    if (p.mobile) await s.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); else await s.send('Emulation.setTouchEmulationEnabled', { enabled: false });
    await s.send('Page.navigate', { url: BASE + '/index.html' });
    await wait(4000);
    // scroll through so every section reveals and the map appears
    const H = await s.ev('document.documentElement.scrollHeight');
    for (let y = 0; y < H; y += Math.max(300, p.h * 0.6)) { await s.ev(`window.scrollTo(0, ${y}); true`); await wait(250); }
    await wait(1500);
    await s.ev("window.scrollTo({ top: 0, behavior: 'instant' }); true"); await wait(300);
    const a = JSON.parse(await s.ev(AUDIT));
    ok(a.overflowX <= 1, `${p.name} ${p.w}x${p.h}: no horizontal scroll`, a.overflowX > 1 ? `(+${a.overflowX}px)` : '');
    ok(a.offscreen.length === 0, `${p.name}: nothing pushed outside the viewport`, a.offscreen.join(' | '));
    ok(a.small.length === 0, `${p.name}: touch targets >= 44px`, a.small.join(' | '));
    ok(a.tiny.length === 0, `${p.name}: text >= 14px`, a.tiny.join(' | '));
    // full-page screenshot: grow the viewport to the page height, let the entrance animations settle, then capture
    // (captureBeyondViewport restarts CSS animations, which would leave the islands transparent in the picture)
    const m = await s.send('Page.getLayoutMetrics');
    const h = Math.min(Math.ceil(m.result.cssContentSize.height), 9000);
    await s.send('Emulation.setDeviceMetricsOverride', { width: p.w, height: h, deviceScaleFactor: 1, mobile: p.mobile });
    await wait(2800);
    const shot = await s.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, `landing-${p.name}.png`), Buffer.from(shot.result.data, 'base64'));
  }
  await s.close();
}

/* ---------------------------------------------------------------- 2. behaviour */
async function behaviour(port) {
  console.log('\n== Behaviour (laptop viewport) ==');
  const s = await session(port);
  await s.send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await s.send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { window.__a = { osc: 0, noise: 0 }; const AC = window.AudioContext; if (!AC) return;
    window.AudioContext = function (...a) { const c = new AC(...a); const o = c.createOscillator.bind(c); c.createOscillator = () => { window.__a.osc++; return o(); };
    const b = c.createBufferSource.bind(c); c.createBufferSource = () => { window.__a.noise++; return b(); }; return c; }; window.AudioContext.prototype = AC.prototype; })();` });
  await s.send('Page.navigate', { url: BASE + '/index.html' });
  await wait(4500);

  const $snap = `(() => { const $ = (x) => document.querySelector(x); return JSON.stringify({ q: $('[data-q]').textContent.replace(/[\\u202D\\u202C]/g, ''), msg: $('[data-msg]').textContent, streak: $('[data-streak]').textContent, score: $('[data-score]').textContent, time: $('[data-time]').textContent, locked: $('[data-choices]').classList.contains('is-locked') }); })()`;
  await s.ev(`window.__t = { toLat: (x) => x.replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)),
    solve(t) { const m = this.toLat(t).match(/(\\d+) ([+−×]) (\\d+)/); const a = +m[1], b = +m[3]; return m[2] === '+' ? a + b : m[2] === '−' ? a - b : a * b; },
    btns: () => [...document.querySelectorAll('[data-choices] .choice')], q: () => document.querySelector('[data-q]').textContent.replace(/[\\u202D\\u202C]/g, '') }; true`);
  const audio = () => s.ev('JSON.stringify(window.__a)').then(JSON.parse);
  const mouse = async (type, x, y) => s.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  const center = (sel, i = 0) => s.ev(`(() => { const el = document.querySelectorAll('${sel}')[${i}]; el.scrollIntoView({ block: 'center', behavior: 'instant' }); const r = el.getBoundingClientRect(); return JSON.stringify({ x: r.left + r.width / 2, y: r.top + r.height / 2 }); })()`).then(JSON.parse);

  // islands & sound (locked until the first gesture)
  let c = await center('[data-island]', 0); await wait(1400);
  c = await center('[data-island]', 0);
  await mouse('mouseMoved', c.x, c.y); await wait(500);
  let a0 = await audio();
  ok(a0.osc === 0 && a0.noise === 0, 'sound stays silent before the first click/tap (browser autoplay rule)');
  await mouse('mouseMoved', 5, 5); await mouse('mousePressed', 5, 5); await mouse('mouseReleased', 5, 5); await wait(1500);
  c = await center('[data-island]', 1);
  await mouse('mouseMoved', 5, 5); await wait(200);
  await mouse('mouseMoved', c.x, c.y); await wait(900);
  let a1 = await audio();
  ok(a1.osc > a0.osc, 'hovering an island plays its note', `(oscillators ${a0.osc} -> ${a1.osc})`);
  ok(a1.noise > a0.noise, 'the boat sailing plays a whoosh', `(noise ${a0.noise} -> ${a1.noise})`);
  const boat = await s.ev(`getComputedStyle(document.getElementById('boat')).transform`);
  ok(boat && boat !== 'none', 'the boat moved to the hovered island', boat);

  // quiz: timer, wrong / right / timeout / keyboard, with sounds
  await s.ev(`document.querySelector('[data-quiz]').scrollIntoView({ block: 'center', behavior: 'instant' }); true`); await wait(1500);
  const t0 = JSON.parse(await s.ev($snap)).time; await wait(2600); const t1 = JSON.parse(await s.ev($snap)).time;
  ok(t0 !== t1, 'quiz timer counts down', `(${t0} -> ${t1})`);
  let before = await audio();
  await s.ev(`(() => { const T = window.__t; const a = T.solve(T.q()); T.btns().find((b) => +b.dataset.v !== a).click(); return true; })()`); await wait(450);
  let afterWrong = JSON.parse(await s.ev($snap)); let aw = await audio();
  ok(afterWrong.locked && afterWrong.streak === '٠' && afterWrong.score === '٠ / ١', 'wrong answer: locks, shows the right one, streak 0', afterWrong.msg);
  ok(aw.osc - before.osc === 2, 'wrong answer plays the soft "lose" sound (2 notes)', `(+${aw.osc - before.osc})`);
  await wait(2300);
  before = await audio();
  await s.ev(`(() => { const T = window.__t; const a = T.solve(T.q()); T.btns().find((b) => +b.dataset.v === a).click(); return true; })()`); await wait(450);
  const afterRight = JSON.parse(await s.ev($snap)); const ar = await audio();
  ok(afterRight.streak === '١' && afterRight.score === '١ / ٢', 'right answer: streak 1, score 1/2', afterRight.msg);
  ok(ar.osc - before.osc >= 5, 'right answer plays the "win" arpeggio', `(+${ar.osc - before.osc})`);
  await wait(1800);
  before = await audio();
  let timedOut = false;
  for (let i = 0; i < 60; i++) { await wait(300); const sn = JSON.parse(await s.ev($snap)); if (sn.msg.includes('انتهى الوقت')) { timedOut = true; break; } }
  const at = await audio();
  ok(timedOut, 'unanswered question times out with a friendly message');
  ok(at.osc - before.osc === 2, 'timeout plays the soft "lose" sound', `(+${at.osc - before.osc})`);
  await wait(2700);
  await s.send('Input.dispatchKeyEvent', { type: 'keyDown', key: '2', code: 'Digit2', text: '2', windowsVirtualKeyCode: 50 });
  await s.send('Input.dispatchKeyEvent', { type: 'keyUp', key: '2', code: 'Digit2', windowsVirtualKeyCode: 50 }); await wait(300);
  ok(JSON.parse(await s.ev($snap)).locked, 'keyboard key 2 selects the second answer');

  // podium counters
  await s.ev(`document.querySelector('[data-podium]').scrollIntoView({ block: 'center', behavior: 'instant' }); true`); await wait(3000);
  const pc = JSON.parse(await s.ev(`JSON.stringify([...document.querySelectorAll('[data-count]')].map((e) => e.textContent))`));
  ok(pc.join(',') === '١٦,١٨,١٤', 'podium scores count up to their values', pc.join(' '));

  // mute switch
  await s.ev(`window.scrollTo({ top: 0, behavior: 'instant' }); true`); await wait(400);
  const tg = await center('#sfxToggle');
  await mouse('mousePressed', tg.x, tg.y); await mouse('mouseReleased', tg.x, tg.y); await wait(300);
  const off = await s.ev(`JSON.stringify({ p: document.getElementById('sfxToggle').getAttribute('aria-pressed'), ls: localStorage.getItem('home_sfx') })`).then(JSON.parse);
  ok(off.p === 'false' && off.ls === 'off', 'mute switch turns sound off and remembers it', JSON.stringify(off));
  await s.ev(`document.querySelector('[data-quiz]').scrollIntoView({ block: 'center', behavior: 'instant' }); true`); await wait(600);
  before = await audio();
  await s.ev(`(() => { const T = window.__t; const a = T.solve(T.q()); T.btns().find((b) => +b.dataset.v !== a) && T.btns().find((b) => +b.dataset.v === a).click(); return true; })()`); await wait(400);
  const am = await audio();
  ok(am.osc === before.osc, 'no sound while muted', `(+${am.osc - before.osc})`);
  await s.ev(`window.scrollTo({ top: 0, behavior: 'instant' }); true`); await wait(300);
  const tg2 = await center('#sfxToggle'); await mouse('mousePressed', tg2.x, tg2.y); await mouse('mouseReleased', tg2.x, tg2.y); await wait(300);

  // island click navigates (after the short blip)
  c = await center('[data-island]', 0); await wait(300);
  await mouse('mouseMoved', c.x, c.y); await mouse('mousePressed', c.x, c.y); await mouse('mouseReleased', c.x, c.y); await wait(1500);
  const url = await s.ev('location.pathname');
  ok(/pages\/math-operations\.html$/.test(url), 'clicking an island opens its game', url);

  const real = s.errors.filter((e) => !/favicon\.ico/.test(e));
  ok(real.length === 0, 'no console errors', real.slice(0, 3).join(' | '));
  await s.close();
}

(async () => {
  await audit(9460);
  await behaviour(9461);
  console.log(`\n${failures ? failures + ' check(s) FAILED' : 'All checks passed'}  (screenshots: ${OUT})`);
  process.exit(failures ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
