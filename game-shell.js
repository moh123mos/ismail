/**
 * game-shell.js — الهيكل المشترك لصفحات الألعاب + دورة حياة اللعبة.
 *
 * Load order on a game page:  common.js  →  game-shell.js  →  inline script that calls GameShell.mount({...})
 * The page only needs an empty <div id="app"></div>.
 *
 * What the shell owns: page markup, students, timer, scoring, feedback, persistence,
 * export/import, winners banner, number/sound toggles.
 * What a game owns: its settings controls, its question/round logic, its extra CSS.
 *
 * Two ways to write a game:
 *   1. Multiple-choice game  → provide `buildQuestion(ctx)`; the shell renders choices and checks answers.
 *   2. Custom-interaction game → provide `newRound(ctx, {counted})` and call `ctx.finishRound(correct, opts)` yourself.
 *
 * See docs/ for the full contract.
 */
(function () {
  'use strict';

  // Folder of this script (the project root): lets the shell find shared assets from a page at any depth.
  const ROOT_URL = new URL('./', document.currentScript.src).href;

  const LIBS = [
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  ];
  const SFX_KEY = 'home_sfx';   // the site-wide sound switch (same key as the landing page, see js/sfx.js)

  const addScript = (src, onload) => {
    const s = document.createElement('script');
    s.src = src; s.async = true;
    if (onload) s.onload = onload;
    document.head.appendChild(s);
  };

  /* Libraries are loaded without blocking the first paint; they are only needed on first use. */
  function loadLibs() {
    LIBS.forEach(src => addScript(src));
    addScript(ROOT_URL + 'js/sfx.js');                      // win / lose / start sounds (window.Sfx)
    addScript(ROOT_URL + 'vendor/lottie_light.min.js', () =>   // animated emoji (window.AnimatedEmoji)
      addScript(ROOT_URL + 'js/animated-emoji.js'));
  }

  /* Web fonts (Baloo Bhaijaan 2 for headings, Alexandria for text) + favicon, for every game page. Icons come from style.css. */
  function loadFontAndIcon() {
    const add = (rel, href, extra) => {
      const l = document.createElement('link');
      l.rel = rel; l.href = href;
      Object.assign(l, extra || {});
      document.head.appendChild(l);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', { crossOrigin: 'anonymous' });
    add('stylesheet', 'https://fonts.googleapis.com/css2?family=Baloo+Bhaijaan+2:wght@500;700;800&family=Alexandria:wght@400;500;600;700&display=swap');
    if (!document.querySelector('link[rel~="icon"]')) add('icon', ROOT_URL + 'favicon.svg', { type: 'image/svg+xml' });
  }

  /** Call a sound effect if js/sfx.js has loaded and sound is allowed (never throws). */
  function sfx(name, arg) {
    try { if (window.Sfx && typeof window.Sfx[name] === 'function') window.Sfx[name](arg); } catch (e) { /* sound is optional */ }
  }

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pick = arr => arr[rnd(0, arr.length - 1)];
  const $ = id => document.getElementById(id);

  /* ===== سجل الأسئلة المستخدمة (اختياري) ===== */
  /**
   * Set of question fingerprints, so a game can avoid repeating questions.
   * With a `key` it persists in localStorage; without one it lives only in memory (per page load / until clear()).
   */
  function createUsedStore(key) {
    let list = [];
    if (key) { try { const raw = localStorage.getItem(key); if (raw) list = JSON.parse(raw); } catch (e) { } }
    const save = () => { if (key) { try { localStorage.setItem(key, JSON.stringify(list)); } catch (e) { } } };
    return {
      has: fp => list.includes(fp),
      add: fp => { list.push(fp); save(); },
      clear: () => { list = []; if (key) { try { localStorage.removeItem(key); } catch (e) { } } },
    };
  }

  /* ===== الهيكل ===== */
  function markup(cfg) {
    const t = cfg.timer;
    const banner = cfg.banner || {};
    const emoji = cfg.emoji || null;   // { code: '1f4b8', fallback: '💸' } — the game's animated "island" emoji
    return `
  <header class="header">
    <div class="sun" aria-hidden="true"></div>
    <div class="wrap g-top">
      <a href="${ROOT_URL}index.html" class="btn home-button"><i class="ph-bold ph-map-trifold" aria-hidden="true"></i> العودة إلى الخريطة</a>
      <div class="g-tools">
        <button type="button" id="toggleNums"></button>
        <button type="button" id="toggleSound"></button>
      </div>
    </div>
    <div class="wrap g-hero">
      <div class="h1-row">
        ${emoji ? `<span class="emoji" data-emoji="${esc(emoji.code)}" data-fallback="${esc(emoji.fallback || '')}" aria-hidden="true"></span>` : ''}
        <div>
          <h1>${esc(cfg.heading || cfg.title)}</h1>
          <div class="credit">إعداد معلم الرياضيات <strong>إسماعيل مصطفى عامر</strong></div>
        </div>
      </div>
      ${banner.src ? `<div class="banner-wrap"><img src="${esc(banner.src)}" alt="${esc(banner.alt || '')}"></div>` : ''}
    </div>
    <svg class="horizon" viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true"><path fill="currentColor" d="M0 44C140 8 280 8 420 40s280 36 420 6 280-40 420-4c70 18 130 20 180 8V80H0z"/></svg>
  </header>

  <main class="wrap g-main">
    <section class="board" aria-label="منطقة اللعب">
      <div class="face" id="face" aria-hidden="true"></div>
      <div class="board__top">
        <label class="turn"><span class="label">الدور على</span><select id="studentSelect"></select></label>
        <div class="board__actions">
          <button type="button" id="startBtn" class="btn--primary"><i class="ph-fill ph-play" aria-hidden="true"></i> ابدأ اللعب</button>
          <button type="button" id="regenerateBtn" hidden><i class="ph-bold ph-arrows-clockwise" aria-hidden="true"></i> أعد توليد السؤال</button>
        </div>
        <div class="timer-pill" role="timer" aria-label="الوقت المتبقي"><i class="ph-bold ph-timer" aria-hidden="true"></i><span id="timerDisplay">٠٠</span></div>
      </div>
      <div id="problem" class="is-idle" aria-live="polite">${cfg.intro || 'اختر الطالب ثم اضغط «ابدأ اللعب». أضف الطلاب أولًا من قسم «الطلاب».'}</div>
      ${cfg.gameAreaHTML || '<div class="choices" id="choices" role="list"></div>'}
      <div class="status" id="status" aria-live="polite"></div>
    </section>

    <aside class="side">
      <section class="panel">
        <h2 class="panel__title"><i class="ph-bold ph-sliders-horizontal" aria-hidden="true"></i> إعدادات اللعبة</h2>
        ${cfg.settingsHTML || ''}
        <div class="toolbar">
          <div class="group"><label class="label" for="timerInput">زمن السؤال (ث):</label><input type="number" id="timerInput" value="${t.value}" min="${t.min}" max="${t.max}"></div>
        </div>
      </section>

      <section class="panel">
        <h2 class="panel__title"><i class="ph-bold ph-users-three" aria-hidden="true"></i> الطلاب</h2>
        <div class="students">
          <div class="students__add">
            <input type="text" id="newStudent" placeholder="اسم الطالب" aria-label="اسم الطالب الجديد">
            <button type="button" id="addStudent"><i class="ph-bold ph-user-plus" aria-hidden="true"></i> إضافة</button>
          </div>
          <div class="students__remove">
            <button type="button" id="deleteStudent" class="btn--danger"><i class="ph-bold ph-trash" aria-hidden="true"></i> حذف الطالب</button>
            <button type="button" id="deleteAll" class="btn--danger"><i class="ph-bold ph-trash" aria-hidden="true"></i> حذف الجميع</button>
          </div>
        </div>
      </section>
    </aside>

    <section class="panel results-panel">
      <div class="results-head">
        <h2 class="panel__title"><i class="ph-bold ph-ranking" aria-hidden="true"></i> لوحة الصدارة</h2>
        <div class="results-actions">
          <button type="button" id="finalizeResultsBtn" class="btn--sun"><i class="ph-fill ph-trophy" aria-hidden="true"></i> حسم النتيجة</button>
          <button type="button" id="exportBtn"><i class="ph-bold ph-download-simple" aria-hidden="true"></i> تصدير النتائج</button>
          <label class="btn" for="importFile"><i class="ph-bold ph-upload-simple" aria-hidden="true"></i> استيراد النتائج<input type="file" id="importFile" class="visually-hidden" accept=".xlsx,.csv"></label>
          <button type="button" id="resetResults" class="btn--danger"><i class="ph-bold ph-arrow-counter-clockwise" aria-hidden="true"></i> إعادة ضبط النتائج</button>
          ${cfg.used ? '<button type="button" id="clearUsed"><i class="ph-bold ph-broom" aria-hidden="true"></i> مسح سجل الأسئلة المستخدمة</button>' : ''}
        </div>
      </div>
      <div class="results-area">
        <table id="resultsTable" aria-live="polite">
          <thead>
            <tr>
              <th>الطالب</th>
              <th>صحيحة</th>
              <th>خاطئة</th>
              <th>الزمن (ث)</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <p class="empty-note" id="resultsEmpty">أضف الطلاب وابدأ اللعب لتظهر النتائج هنا.</p>
      </div>
    </section>
  </main>

  <footer class="g-footer">
    <div class="wrap">
      <p class="footer-note">${cfg.footerHTML || 'تُحفظ أسماء الطلاب ونتائجهم على هذا الجهاز.'}</p>
      <a href="${ROOT_URL}credits.html">الشكر والتراخيص</a>
    </div>
  </footer>

  <div id="bannerOverlay"></div>
  <div id="resultsBanner" role="dialog" aria-modal="true" aria-label="نتائج المسابقة">
    <button type="button" class="banner-close" aria-label="إغلاق"><i class="ph-bold ph-x" aria-hidden="true"></i></button>
    <div id="bannerContent"></div>
  </div>
  <audio id="player" hidden></audio>`;
  }

  /* ===== التركيب ===== */
  /**
   * @param {object} cfg
   * @param {string} cfg.id               Unique game id (used for defaults).
   * @param {string} cfg.title            <title> and fallback heading.
   * @param {string} [cfg.heading]        H1 text (defaults to title).
   * @param {{code:string,fallback?:string}} [cfg.emoji]  The game's animated "island" emoji next to the H1: Noto code point (file imgs/emoji/<code>.json) + plain-character fallback. Use the same one as the game's island on the map.
   * @param {string} [cfg.storagePrefix]  localStorage prefix; keys are `${prefix}_students` / `${prefix}_results`. Defaults to id.
   * @param {{src:string,alt?:string}} [cfg.banner]
   * @param {string} [cfg.settingsHTML]   Game-specific toolbar markup (inputs/selects/checkboxes).
   * @param {string} [cfg.gameAreaHTML]   Replaces the default `.choices` container (custom-interaction games).
   * @param {string} [cfg.intro]          HTML shown in the question area before the first round.
   * @param {string} [cfg.footerHTML]     Replaces the default footer note (the credits link is always added by the shell).
   * @param {{value:number,min:number,max:number}} [cfg.timer]
   * @param {string} [cfg.exportFilename]
   * @param {object} [cfg.used]           A *persistent* store from GameShell.createUsedStore(key); adds the "clear used questions" button.
   * @param {function} [cfg.buildQuestion]  (ctx) => { html, choices: [value | {value,label}], answer } | null
   *                                        ctx.counted tells whether this question will be scored (false after "regenerate").
   *                                        Return null if the question can't be built (after telling the user why).
   * @param {function} [cfg.newRound]       (ctx, {counted}) => void   (custom-interaction games)
   * @param {function} [cfg.onStart]        (ctx) => void|false   before a game starts; return false to cancel
   * @param {function} [cfg.onNumbersToggle] (ctx) => void|false   after Arabic/Hindi numerals were switched; by default a running
   *                                        question is re-rolled so it shows the new numerals — return false to prevent that
   * @param {function} [cfg.onReady]        (ctx) => void  called once after mount
   */
  function mount(userCfg) {
    const cfg = Object.assign({}, userCfg);
    cfg.timer = Object.assign({ value: 20, min: 5, max: 90 }, userCfg.timer);
    const prefix = cfg.storagePrefix || cfg.id;
    const KEY_STUDENTS = prefix + '_students';
    const KEY_RESULTS = prefix + '_results';
    const exportFilename = cfg.exportFilename || (cfg.id + '_results.xlsx');

    document.title = cfg.title;
    $('app').innerHTML = markup(cfg);
    loadLibs();
    loadFontAndIcon();

    // One site-wide sound switch (voice + sound effects), remembered between pages and visits.
    try { soundOn = window.localStorage.getItem(SFX_KEY) !== 'off'; } catch (e) { /* storage blocked: stay on */ }
    let streak = 0;   // correct answers in a row (the win jingle rises with it)

    // The banner is the teacher's artwork: if the file is missing, hide the frame instead of showing a broken image.
    const bannerImg = document.querySelector('.banner-wrap img');
    if (bannerImg) bannerImg.addEventListener('error', () => { bannerImg.parentElement.hidden = true; });

    /* ----- persistence (exposed globally: games and common.js callbacks use them) ----- */
    window.saveData = function saveData() { saveToLocalStorage(KEY_STUDENTS, KEY_RESULTS); };
    window.loadData = function loadData() { loadFromLocalStorage(KEY_STUDENTS, KEY_RESULTS); updateResultsTable(); };

    /* ----- toggles ----- */
    const paintToggle = (id, icon, text, pressed) => {
      const b = $(id);
      b.innerHTML = `<i class="ph-bold ${icon}" aria-hidden="true"></i><span>${text}</span>`;
      if (pressed !== undefined) b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
    };
    const paintNums = () => paintToggle('toggleNums', 'ph-hash', 'الأرقام: ' + (useArabicIndic ? 'هندية' : 'عربية'));
    const paintSound = () => paintToggle('toggleSound', soundOn ? 'ph-speaker-high' : 'ph-speaker-slash', soundOn ? 'الصوت: تشغيل' : 'الصوت: إيقاف', soundOn);
    paintNums();
    paintSound();

    /* ----- small UI helpers ----- */
    const setShown = (id, shown) => { $(id).hidden = !shown; };
    /** Reaction emoji in the board's corner: animated when the emoji files are available, a plain character otherwise. */
    const setFace = (emojiChar) => {
      const el = $('face');
      const code = emojiChar ? Array.from(emojiChar)[0].codePointAt(0).toString(16) : '';
      if (window.AnimatedEmoji) window.AnimatedEmoji.set(el, code, emojiChar || '');
      else el.textContent = emojiChar || '';
    };

    /* ----- round lifecycle ----- */
    const ctx = {
      cfg,
      $,
      saveData: () => window.saveData(),
      newRound,
      finishRound,
    };

    function newRound(opts) {
      const counted = !opts || opts.counted !== false;
      answered = false;
      $('status').textContent = '';
      setFace('');
      $('problem').classList.remove('is-idle');
      if (cfg.newRound) { cfg.newRound(ctx, { counted }); return; }
      renderQuestion(counted);
    }

    /** Put the UI back to "waiting to start" (e.g. the game could not build a question). */
    function abortRound() {
      stopTimer();
      gameStarted = false;
      setShown('startBtn', true);
      setShown('regenerateBtn', false);
    }

    function renderQuestion(counted) {
      ctx.counted = counted;
      const q = cfg.buildQuestion(ctx);
      if (!q) { abortRound(); return; }   // the game already told the user why (e.g. nothing selected)
      $('choices').innerHTML = '';
      $('problem').innerHTML = q.html;
      correctAnsGlobal = q.answer;
      q.choices.forEach((c, i) => {
        const value = (c !== null && typeof c === 'object') ? c.value : c;
        const label = (c !== null && typeof c === 'object' && c.label != null) ? c.label : (typeof value === 'number' ? toArabicNumber(value) : value);
        const btn = document.createElement('button');
        btn.className = 'choice';
        btn.type = 'button';
        btn.dataset.key = toArabicNumber(i + 1);   // shown as a small badge: the number key picks this answer
        btn.textContent = label;
        btn._value = value;
        btn.onclick = () => checkAnswer(value, counted);
        $('choices').appendChild(btn);
      });
      // A timeout always counts, even on a regenerated (uncounted) question.
      startTimer(() => checkAnswer(null, true));
    }

    function checkAnswer(value, counted) {
      if (!gameStarted) { alert('⚠️ اضغط على زر ابدأ اللعبة أولاً'); return; }
      if (answered) return;
      const correct = value === correctAnsGlobal;
      // Show the right answer (and the wrong pick), and lock the choices.
      document.querySelectorAll('#choices .choice').forEach(b => {
        if (b._value === correctAnsGlobal) b.classList.add('correct');
        else if (b._value === value) b.classList.add('wrong');
        b.disabled = true;
      });
      finishRound(correct, { counted });
    }

    /**
     * Record the result of a round: score, feedback, persistence, then hand over to the next student.
     * @param {boolean} correct
     * @param {object} [o]
     * @param {boolean} [o.counted=true]  false = practice question, not scored.
     * @param {string}  [o.message]       Full status text (default: icon + random praise/consolation using the student's name).
     * @param {string}  [o.speak]         Text to speak (default: the praise/consolation phrase).
     * @param {string}  [o.face]          Face emoji.
     * @param {number}  [o.delay=0]       ms to wait before moving to the next student and showing "start".
     */
    function finishRound(correct, o) {
      o = o || {};
      const counted = o.counted !== false;
      stopTimer();
      answered = true;
      const name = currentStudent || '';
      const elapsed = (Date.now() - questionStartTime) / 1000;

      streak = correct ? streak + 1 : 0;
      sfx(correct ? 'win' : 'lose', streak);   // a sound for every answered round, even a practice one

      if (counted && name) {
        if (!results[name]) results[name] = { ok: 0, bad: 0, time: 0 };
        const phrase = pick(correct ? praisePhrases : negativePhrases).replace('{name}', name);
        $('status').textContent = o.message || ((correct ? '✅ ' : '❌ ') + phrase);
        setFace(o.face || (correct ? '🎉' : '💪'));
        if (correct) {
          results[name].ok++;
          try { confetti({ particleCount: 80, spread: 60, origin: { y: 0.6 } }); } catch (e) { }
        } else {
          results[name].bad++;
          $('face').classList.add('sad');
          setTimeout(() => $('face').classList.remove('sad'), 600);
        }
        speak(o.speak || phrase);
        results[name].time = (results[name].time || 0) + elapsed;
      } else {
        $('status').textContent = '🔁 تم توليد سؤال جديد (لا يُحسب في النتائج)';
      }

      const advance = () => {
        pickNextStudent();
        setShown('startBtn', true);
        setShown('regenerateBtn', false);
        gameStarted = false;
      };
      updateResultsTable();
      if (o.delay) setShown('regenerateBtn', false);   // the round is over: no "regenerate" while waiting
      if (!o.delay) advance();
      window.saveData();
      if (o.delay) setTimeout(advance, o.delay);
    }

    /* ----- controls ----- */
    $('startBtn').addEventListener('click', () => {
      const sel = $('studentSelect').value;
      if (!sel) { alert('اختر طالبًا'); return; }
      currentStudent = sel;
      if (!results[currentStudent]) results[currentStudent] = { ok: 0, bad: 0, time: 0 };
      timerDuration = parseInt($('timerInput').value) || 20;
      if (cfg.onStart && cfg.onStart(ctx) === false) return;   // the game can veto the start
      gameStarted = true;
      sfx('go');
      newRound({ counted: true });
      setShown('startBtn', false);
      setShown('regenerateBtn', true);
    });

    $('regenerateBtn').addEventListener('click', () => {
      if (!gameStarted) { alert('ابدأ اللعبة أولاً'); return; }
      newRound({ counted: false });
    });

    $('addStudent').addEventListener('click', () => addStudent(() => window.saveData()));
    $('deleteStudent').addEventListener('click', () => deleteStudent(() => window.saveData()));
    $('deleteAll').addEventListener('click', () => deleteAllStudents(() => window.saveData()));

    $('toggleNums').addEventListener('click', () => {
      useArabicIndic = !useArabicIndic;
      paintNums();
      if (cfg.onNumbersToggle && cfg.onNumbersToggle(ctx) === false) return;   // false = don't re-roll the question
      if (gameStarted) newRound({ counted: true });
    });
    $('toggleSound').addEventListener('click', () => {
      soundOn = !soundOn;
      paintSound();
      try { window.localStorage.setItem(SFX_KEY, soundOn ? 'on' : 'off'); } catch (e) { /* ignore */ }
      if (window.Sfx) { window.Sfx.setEnabled(soundOn); if (soundOn) sfx('go'); }
    });

    $('exportBtn').addEventListener('click', () => exportResultsToExcel(exportFilename));
    $('importFile').addEventListener('change', e => importResultsFromFile(e, () => window.saveData()));
    $('resetResults').addEventListener('click', () => resetAllResults(() => window.saveData()));

    if (cfg.used) {
      $('clearUsed').addEventListener('click', () => {
        if (confirm('هل تريد مسح سجل الأسئلة المستخدمة (سيؤدي ذلك لإمكانية تكرار أسئلة قديمة)؟')) {
          cfg.used.clear();
          alert('تم مسح سجل الأسئلة.');
        }
      });
    }

    document.querySelector('#resultsBanner .banner-close').addEventListener('click', hideBanner);
    $('bannerOverlay').addEventListener('click', hideBanner);
    $('finalizeResultsBtn').addEventListener('click', () => {
      const sorted = getSortedResultsArray();
      if (!sorted.length) { alert('لا توجد نتائج لحسمها بعد.'); return; }
      showWinnersBanner(sorted.slice(0, 3));   // shows the banner and announces the winners
    });

    // Styled checkbox options (.checkbox-option) in the game's settings: keep the "checked" look in sync.
    document.querySelectorAll('.checkbox-option input[type="checkbox"]').forEach(cb => {
      cb.addEventListener('change', () => cb.closest('.checkbox-option').classList.toggle('checked', cb.checked));
    });

    // Number keys 1..9 (or ١..٩) pick the matching answer, for a teacher driving the game from the keyboard.
    document.addEventListener('keydown', e => {
      if (!gameStarted || answered || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName)) return;
      const hindi = '١٢٣٤٥٦٧٨٩'.indexOf(e.key);
      const n = /^[1-9]$/.test(e.key) ? Number(e.key) : hindi + 1;
      const btn = n > 0 ? document.querySelectorAll('#choices .choice')[n - 1] : null;
      if (btn && !btn.disabled) { e.preventDefault(); btn.click(); }
    });

    ctx.sfx = sfx;                // games may play effects too: ctx.sfx('pop', 2) (safe even if sounds are unavailable)
    window.GameShell.current = ctx;
    window.loadData();
    if (cfg.onReady) cfg.onReady(ctx);
    return ctx;
  }

  window.GameShell = { mount, createUsedStore, current: null };
})();
