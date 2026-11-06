/*
 * Landing-page demos shared by the design variants.
 *  1) [data-quiz]   a small live question ("try it yourself") that feels like the real games.
 *  2) [data-count]  numbers that count up when they scroll into view (podium scores).
 *
 * Markup contract for the quiz (each design styles it its own way):
 *   <div data-quiz>
 *     <div data-timer></div>            -> receives style --t (1 -> 0) and data-low="1" in the last seconds
 *     <span data-time></span>           -> seconds left
 *     <p data-q></p>                    -> the equation
 *     <div data-choices></div>          -> four <button class="choice" data-i data-key> are created here
 *     <p data-msg aria-live="polite"></p>
 *     <b data-streak></b> <b data-score></b>
 *     <span data-reaction></span>       -> receives data-on while a reaction emoji plays
 *   </div>
 * Reactions use imgs/emoji/*.json through lottie (vendor/lottie_light.min.js).
 * Win/lose sounds come from js/sfx.js when it is loaded (window.Sfx); the quiz works without it.
 */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var nf = new Intl.NumberFormat('ar-EG', { useGrouping: false });
  function ar(n) { return nf.format(n); }
  function rnd(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }
  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = rnd(0, i), t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* ---------- question generation ---------- */
  var TYPES = ['add', 'mul', 'sub', 'mul', 'add', 'sub'];

  function makeQuestion(n) {
    var type = TYPES[n % TYPES.length], a, b, ans, sign;
    if (type === 'add') { a = rnd(6, 29); b = rnd(4, 19); ans = a + b; sign = '+'; }
    else if (type === 'sub') { a = rnd(14, 40); b = rnd(3, a - 4); ans = a - b; sign = '−'; }
    else { a = rnd(2, 9); b = rnd(2, 9); ans = a * b; sign = '×'; }

    var pool = [ans + 1, ans - 1, ans + 2, ans - 2, ans + 10, ans - 10];
    if (type === 'mul') pool.push(ans + a, ans - a, ans + b, ans - b);
    var seen = {};
    pool = pool.filter(function (v) {
      if (v <= 0 || v === ans || seen[v]) return false;
      seen[v] = true; return true;
    });
    var picks = shuffle(pool).slice(0, 3);
    while (picks.length < 3) {
      var v = ans + rnd(3, 12);
      if (v !== ans && picks.indexOf(v) < 0) picks.push(v);
    }
    return { text: ar(a) + ' ' + sign + ' ' + ar(b) + ' = ؟', ans: ans, choices: shuffle([ans].concat(picks)) };
  }

  /* ---------- quiz ---------- */
  var KEYS = ['أ', 'ب', 'ج', 'د'];
  var PRAISE = ['أحسنت!', 'ممتاز!', 'إجابة صحيحة!', 'رائع، استمر!', 'بطل!'];
  var LIMIT = 12;

  function initQuiz(root) {
    function $(s) { return root.querySelector(s); }
    var qEl = $('[data-q]'), choicesEl = $('[data-choices]'), timerEl = $('[data-timer]'), timeEl = $('[data-time]'),
        msgEl = $('[data-msg]'), streakEl = $('[data-streak]'), scoreEl = $('[data-score]'), reactEl = $('[data-reaction]');
    if (!qEl || !choicesEl) return;

    var n = 0, streak = 0, right = 0, tried = 0;
    var q, locked = false, left = LIMIT, tick = null, nextT = null, reactT = null, reactAnim = null, visible = false;

    function msg(t) { if (msgEl) msgEl.textContent = t; }
    function stats() {
      if (streakEl) streakEl.textContent = ar(streak);
      if (scoreEl) scoreEl.textContent = ar(right) + ' / ' + ar(tried);
    }
    function paint() {
      if (timerEl) {
        timerEl.style.setProperty('--t', (left / LIMIT).toFixed(3));
        timerEl.setAttribute('data-low', left <= 4 ? '1' : '0');
      }
      if (timeEl) timeEl.textContent = ar(Math.ceil(left));
    }
    function stop() { if (tick) { clearInterval(tick); tick = null; } }
    function start() {
      if (tick || locked) return;
      var last = performance.now();
      tick = setInterval(function () {
        var now = performance.now();
        left -= (now - last) / 1000; last = now;
        if (left <= 0) { left = 0; paint(); stop(); timeout(); } else { paint(); }
      }, 100);
    }

    function clearReaction() {
      clearTimeout(reactT);
      if (reactAnim) { try { reactAnim.destroy(); } catch (e) { /* ignore */ } reactAnim = null; }
      if (reactEl) { reactEl.removeAttribute('data-on'); reactEl.textContent = ''; }
    }
    function react(code, fallback) {
      if (!reactEl) return;
      clearReaction();
      reactEl.setAttribute('data-on', '');
      if (window.lottie) {
        reactAnim = window.lottie.loadAnimation({
          container: reactEl, renderer: 'svg', loop: false, autoplay: !reduce,
          path: 'imgs/emoji/' + code + '.json'
        });
        if (reduce) {
          reactAnim.addEventListener('DOMLoaded', function () {
            reactAnim.goToAndStop(Math.floor(reactAnim.totalFrames * 0.5), true);
          });
        }
      } else {
        reactEl.textContent = fallback;
      }
      reactT = setTimeout(clearReaction, 1700);
    }

    function lock() {
      locked = true; stop();
      choicesEl.classList.add('is-locked');
      Array.prototype.forEach.call(choicesEl.children, function (b) {
        b.setAttribute('aria-disabled', 'true');
        if (Number(b.getAttribute('data-v')) === q.ans) b.classList.add('is-correct');
      });
    }
    function answer(v, btn) {
      if (locked) return;
      lock(); tried++;
      if (v === q.ans) {
        streak++; right++;
        msg(PRAISE[rnd(0, PRAISE.length - 1)]);
        react('1f389', '🎉');
        if (window.Sfx) window.Sfx.win(streak);
        nextT = setTimeout(next, 1600);
      } else {
        streak = 0; btn.classList.add('is-wrong');
        msg('الإجابة الصحيحة ' + ar(q.ans) + ' — جرّب السؤال التالي!');
        react('1f4aa', '💪');
        if (window.Sfx) window.Sfx.lose();
        nextT = setTimeout(next, 2300);
      }
      stats();
    }
    function timeout() {
      if (locked) return;
      lock(); tried++; streak = 0;
      msg('انتهى الوقت! الإجابة الصحيحة ' + ar(q.ans));
      react('1f4aa', '💪');
      if (window.Sfx) window.Sfx.lose();
      stats();
      nextT = setTimeout(next, 2300);
    }

    function render() {
      q = makeQuestion(n);
      /* LRO..PDF: force left-to-right order; Arabic-Indic digits would otherwise reorder inside an RTL page */
      qEl.textContent = '‭' + q.text + '‬';
      choicesEl.innerHTML = '';
      choicesEl.classList.remove('is-locked');
      q.choices.forEach(function (v, i) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'choice';
        b.setAttribute('data-i', i);
        b.setAttribute('data-key', KEYS[i]);
        b.setAttribute('data-v', v);
        b.setAttribute('aria-label', KEYS[i] + ': ' + ar(v));
        b.innerHTML = '<span class="choice__val">' + ar(v) + '</span>';
        b.addEventListener('click', function () { answer(v, b); });
        choicesEl.appendChild(b);
      });
      msg('اختر الإجابة الصحيحة');
      locked = false; left = LIMIT; paint();
      if (visible && !document.hidden) start();
    }
    function next() { n++; clearReaction(); render(); }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible && !document.hidden) start(); else stop();
      }, { threshold: 0.4 }).observe(root);
    } else {
      visible = true;
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else if (visible) start();
    });
    document.addEventListener('keydown', function (e) {
      if (!visible || locked || e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^(input|textarea|select)$/i.test(e.target.tagName)) return;
      var idx = '1234'.indexOf(e.key);
      if (idx < 0) idx = '١٢٣٤'.indexOf(e.key);
      if (idx >= 0 && choicesEl.children[idx]) choicesEl.children[idx].click();
    });

    stats(); render();
  }

  /* ---------- count-up numbers ---------- */
  function initCounters() {
    var els = document.querySelectorAll('[data-count]');
    if (!els.length) return;
    function run(el) {
      var target = parseInt(el.getAttribute('data-count'), 10) || 0;
      if (reduce) { el.textContent = ar(target); return; }
      var t0 = performance.now(), dur = 1400;
      (function step(t) {
        var p = Math.min(1, (t - t0) / dur);
        el.textContent = ar(Math.round(target * (1 - Math.pow(1 - p, 4))));
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { run(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.6 });
    els.forEach(function (el) { if (!reduce) el.textContent = ar(0); io.observe(el); });
  }

  var quizRoot = document.querySelector('[data-quiz]');
  if (quizRoot) initQuiz(quizRoot);
  initCounters();

  /* exposed only so the question generator can be unit-tested in a browser */
  window.HomeDemo = { makeQuestion: makeQuestion };
})();
