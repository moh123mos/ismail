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

  /* Libraries are loaded without blocking the first paint; they are only needed on first use. */
  function loadLibs() {
    LIBS.forEach(src => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      document.head.appendChild(s);
    });
  }

  /* Cairo web font + favicon, for every game page. */
  function loadFontAndIcon() {
    const add = (rel, href, extra) => {
      const l = document.createElement('link');
      l.rel = rel; l.href = href;
      Object.assign(l, extra || {});
      document.head.appendChild(l);
    };
    add('preconnect', 'https://fonts.googleapis.com');
    add('preconnect', 'https://fonts.gstatic.com', { crossOrigin: 'anonymous' });
    add('stylesheet', 'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
    if (!document.querySelector('link[rel~="icon"]')) add('icon', ROOT_URL + 'favicon.svg', { type: 'image/svg+xml' });
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
    return `
  <div class="header">
    <a href="../index.html" class="home-button">🏠 الصفحة الرئيسية</a>
    ${banner.src ? `<div class="banner-wrap" style="height: 50vh;" aria-hidden="false">
      <img src="${esc(banner.src)}" alt="${esc(banner.alt || '')}" class="banner-image" width="100%" onerror="this.style.display='none'" />
    </div>` : ''}
    <div class="h1-row" style="margin-top: 4px; margin-bottom: 30px;">
      <h1 style="font-size: 40px;">${esc(cfg.heading || cfg.title)}</h1>
      <div class="credit">🌟 إعداد معلم الرياضيات <strong>إسماعيل مصطفى عامر</strong> 🌟</div>
    </div>
  </div>

  ${cfg.settingsHTML || ''}

  <div class="toolbar" style="margin-top:6px">
    <div class="group"><span class="label">زمن السؤال (ث):</span><input type="number" id="timerInput" value="${t.value}" min="${t.min}" max="${t.max}"></div>
    <div class="group"><button id="toggleNums"></button></div>
    <div class="group"><button id="toggleSound"></button></div>
  </div>

  <div class="students" style="width:92%">
    <input type="text" id="newStudent" placeholder="أدخل اسم الطالب">
    <button id="addStudent">➕ إضافة طالب</button>
    <select id="studentSelect" style="min-width:300px;height:70px;font-size:30px;padding:6px;"></select>
    <button id="deleteStudent">🗑 حذف الطالب</button>
    <button id="deleteAll">🗑 حذف الجميع</button>
  </div>

  <div style="display:flex;gap:8px;align-items:center;width:92%;justify-content:center">
    <button id="startBtn">🚀 ابدأ اللعب</button>
    <button id="regenerateBtn" style="display:none">🔁 أعد توليد السؤال</button>
  </div>

  <div id="problem" aria-live="polite">${cfg.intro || ''}</div>
  ${cfg.gameAreaHTML || '<div class="choices" id="choices" role="list"></div>'}
  <div id="timerDisplay">⏱ 00</div>
  <div class="status" style="font-size: 30px;" id="status"></div>
  <div class="face" id="face"></div>

  <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:92%;justify-content:center">
    <button id="exportBtn">📥 تصدير النتائج</button>
    <input type="file" id="importFile" accept=".xlsx,.csv">
    <button id="resetResults">🔄 إعادة ضبط النتائج</button>
    ${cfg.used ? '<button id="clearUsed">🧹 مسح سجل الأسئلة المستخدمة</button>' : ''}
    <button id="finalizeResultsBtn">🎤 حسم النتيجة</button>
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
  </div>

  <div class="footer-note">${cfg.footerHTML || 'نسخة تفاعلية محلية — تعمل مباشرة في المتصفح دون اتصال.'}</div>

  <div id="bannerOverlay"></div>
  <div id="resultsBanner" role="dialog" aria-modal="true">
    <button class="banner-close" aria-label="إغلاق">✖</button>
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
   * @param {string} [cfg.storagePrefix]  localStorage prefix; keys are `${prefix}_students` / `${prefix}_results`. Defaults to id.
   * @param {{src:string,alt?:string}} [cfg.banner]
   * @param {string} [cfg.settingsHTML]   Game-specific toolbar markup (inputs/selects/checkboxes).
   * @param {string} [cfg.gameAreaHTML]   Replaces the default `.choices` container (custom-interaction games).
   * @param {string} [cfg.intro]          HTML shown in the question area before the first round.
   * @param {string} [cfg.footerHTML]     Replaces the default footer note.
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

    /* ----- persistence (exposed globally: games and common.js callbacks use them) ----- */
    window.saveData = function saveData() { saveToLocalStorage(KEY_STUDENTS, KEY_RESULTS); };
    window.loadData = function loadData() { loadFromLocalStorage(KEY_STUDENTS, KEY_RESULTS); updateResultsTable(); };

    /* ----- toggles ----- */
    const numsLabel = () => '🔢 الأرقام: ' + (useArabicIndic ? 'هندية' : 'عربية');
    const soundLabel = () => soundOn ? '🔊 الصوت: تشغيل' : '🔇 الصوت: إيقاف';
    $('toggleNums').textContent = numsLabel();
    $('toggleSound').textContent = soundLabel();

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
      $('face').textContent = '';
      if (cfg.newRound) { cfg.newRound(ctx, { counted }); return; }
      renderQuestion(counted);
    }

    /** Put the UI back to "waiting to start" (e.g. the game could not build a question). */
    function abortRound() {
      stopTimer();
      gameStarted = false;
      $('startBtn').style.display = 'inline-block';
      $('regenerateBtn').style.display = 'none';
    }

    function renderQuestion(counted) {
      ctx.counted = counted;
      const q = cfg.buildQuestion(ctx);
      if (!q) { abortRound(); return; }   // the game already told the user why (e.g. nothing selected)
      $('choices').innerHTML = '';
      $('problem').innerHTML = q.html;
      correctAnsGlobal = q.answer;
      q.choices.forEach(c => {
        const value = (c !== null && typeof c === 'object') ? c.value : c;
        const label = (c !== null && typeof c === 'object' && c.label != null) ? c.label : (typeof value === 'number' ? toArabicNumber(value) : value);
        const btn = document.createElement('button');
        btn.className = 'choice';
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

      if (counted && name) {
        if (!results[name]) results[name] = { ok: 0, bad: 0, time: 0 };
        const phrase = pick(correct ? praisePhrases : negativePhrases).replace('{name}', name);
        $('status').textContent = o.message || ((correct ? '✅ ' : '❌ ') + phrase);
        $('face').textContent = o.face || (correct ? '🎉' : '😢');
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
        $('startBtn').style.display = 'inline-block';
        $('regenerateBtn').style.display = 'none';
        gameStarted = false;
      };
      updateResultsTable();
      if (o.delay) $('regenerateBtn').style.display = 'none';   // the round is over: no "regenerate" while waiting
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
      newRound({ counted: true });
      $('startBtn').style.display = 'none';
      $('regenerateBtn').style.display = 'inline-block';
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
      $('toggleNums').textContent = numsLabel();
      if (cfg.onNumbersToggle && cfg.onNumbersToggle(ctx) === false) return;   // false = don't re-roll the question
      if (gameStarted) newRound({ counted: true });
    });
    $('toggleSound').addEventListener('click', () => {
      soundOn = !soundOn;
      $('toggleSound').textContent = soundLabel();
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

    window.loadData();
    if (cfg.onReady) cfg.onReady(ctx);
    return ctx;
  }

  window.GameShell = { mount, createUsedStore };
})();
