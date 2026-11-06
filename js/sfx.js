/*
 * Landing-page sound effects, synthesized with the Web Audio API (no audio files, no network).
 *
 *   Sfx.win(streak)  rising arpeggio, a little higher for every answer in a row
 *   Sfx.lose()       soft falling two-note "oops" (gentle on purpose: the audience is 6-9 years old)
 *   Sfx.pop(i)       small bubble when an island appears
 *   Sfx.hover(i)     pentatonic note per island, so moving across the map plays a tune
 *   Sfx.sail()       soft whoosh while the boat moves
 *   Sfx.go()         "let's go" blip when a game is opened
 *   Sfx.willPlay()   true when sound is on AND the browser allows it (after a first tap/click/key)
 *   Sfx.bindToggle(button)  turns a <button> into the on/off switch (state kept in localStorage "home_sfx")
 *
 * Browsers block audio until the user touches the page once, so nothing plays before the first
 * pointer/key event; that is expected and not an error.
 */
(function () {
  'use strict';

  var STORE = 'home_sfx';
  var AC = window.AudioContext || window.webkitAudioContext;
  var ctx = null, master = null, unlocked = false, enabled = true, lastHover = 0;

  try { enabled = window.localStorage.getItem(STORE) !== 'off'; } catch (e) { /* storage blocked: stay on */ }

  function ensure() {
    if (!AC) return null;
    if (!ctx) {
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.3;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended' && ctx.resume) ctx.resume();
    return ctx;
  }

  function unlock() {
    unlocked = true;
    ensure();
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.removeEventListener(t, unlock, true); });
  }
  ['pointerdown', 'keydown', 'touchstart'].forEach(function (t) { window.addEventListener(t, unlock, true); });

  function ready() { return enabled && unlocked && ctx && ctx.state === 'running'; }

  /* one note: oscillator with a quick attack and an exponential decay */
  function tone(freq, when, dur, type, vol, glideTo, destination) {
    var t0 = ctx.currentTime + when;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(destination || master);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  /* filtered noise sweep (the boat) */
  function whoosh(when, dur, f0, f1, vol) {
    var t0 = ctx.currentTime + when, n = Math.floor(ctx.sampleRate * dur);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.35);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t0); src.stop(t0 + dur + 0.05);
  }

  var PENTA = [523.25, 587.33, 659.25, 783.99, 880.0]; /* C D E G A */

  var api = {
    willPlay: function () { return ready(); },
    isEnabled: function () { return enabled; },

    win: function (streak) {
      if (!ready()) return;
      var up = Math.pow(2, Math.min(Math.max((streak || 1) - 1, 0), 4) * 2 / 12); /* +2 semitones per answer in a row */
      var notes = [523.25, 659.25, 783.99, 1046.5];
      if ((streak || 1) >= 3) notes.push(1318.5);
      notes.forEach(function (f, i) { tone(f * up, i * 0.085, 0.32, 'triangle', 0.32); });
      tone(2093 * up, notes.length * 0.085, 0.4, 'sine', 0.12);
    },

    lose: function () {
      if (!ready()) return;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(master);
      tone(392, 0, 0.26, 'sine', 0.3, 349, lp);
      tone(311, 0.24, 0.5, 'sine', 0.3, 233, lp);
    },

    pop: function (i) { if (ready()) tone(430 + (i || 0) * 85, 0, 0.11, 'sine', 0.22, 900 + (i || 0) * 90); },

    hover: function (i) {
      if (!ready()) return;
      var now = Date.now();
      if (now - lastHover < 90) return;
      lastHover = now;
      var f = PENTA[(i || 0) % PENTA.length];
      tone(f, 0, 0.26, 'triangle', 0.2);
      tone(f * 2, 0, 0.14, 'sine', 0.05);
    },

    sail: function () { if (ready()) whoosh(0, 0.75, 350, 1500, 0.1); },

    go: function () {
      if (!ready()) return;
      tone(659.25, 0, 0.09, 'triangle', 0.26);
      tone(987.77, 0.08, 0.16, 'triangle', 0.26);
    },

    setEnabled: function (on) {
      enabled = !!on;
      try { window.localStorage.setItem(STORE, enabled ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (enabled) { unlocked = true; ensure(); }
    },

    bindToggle: function (btn) {
      if (!btn) return;
      var label = btn.querySelector('[data-sfx-label]'), icon = btn.querySelector('i');
      function paint() {
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        if (label) label.textContent = enabled ? 'الصوت: تشغيل' : 'الصوت: إيقاف';
        if (icon) icon.className = enabled ? 'ph-bold ph-speaker-high' : 'ph-bold ph-speaker-slash';
      }
      btn.addEventListener('click', function () {
        api.setEnabled(!enabled);
        paint();
        if (enabled) setTimeout(function () { api.go(); }, 30);
      });
      paint();
    }
  };

  window.Sfx = api;
})();
