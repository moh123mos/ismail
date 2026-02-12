/**
 * ملف JavaScript مشترك لجميع صفحات ألعاب الرياضيات
 * إعداد: الأستاذ إسماعيل مصطفى عامر
 */

/* ===== إعدادات عامة ===== */
let students = [];
let results = {};
let currentStudent = null;
let timer = null;
let timerDuration = 20;
let correctAnsGlobal = null;
let gameStarted = false;
let answered = false;
let useArabicIndic = true;
let soundOn = true;
let availableVoices = [];
let currentTimeLeft = 0;
let questionStartTime = 0; // وقت بداية السؤال بالميلي ثانية

const praisePhrases = [
  "أحسنت يا {name}!",
  "ممتاز يا {name}!",
  "عمل رائع يا {name}!",
  "مبدع يا {name}!",
  "رائع جدًا يا {name}!"
];

const negativePhrases = [
  "حاول مرة أخرى يا {name}.",
  "قربت جدًا يا {name}.",
  "أعد التفكير يا {name}."
];

/* ===== دوال تحويل الأرقام ===== */
/**
 * تحويل الأرقام إلى الهندية أو العربية حسب الإعداد
 */
function toArabicNumber(num) {
  const s = String(num);
  if (!useArabicIndic) return s;
  return s.replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

/**
 * تحويل الأرقام الهندية/العربية إلى أرقام لاتينية
 */
function parseDisplayedNumber(txt) {
  const map = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let s = '';
  for (const ch of ('' + txt)) {
    if (map[ch] !== undefined) s += map[ch];
    else if (ch >= '0' && ch <= '9') s += ch;
  }
  return parseInt(s, 10) || 0;
}

/* ===== دوال Local Storage ===== */
/**
 * حفظ البيانات إلى Local Storage
 */
function saveToLocalStorage(studentsKey, resultsKey) {
  try {
    localStorage.setItem(studentsKey, JSON.stringify(students));
    localStorage.setItem(resultsKey, JSON.stringify(results));
  } catch (e) {
    console.error('خطأ في حفظ البيانات:', e);
  }
}

/**
 * تحميل البيانات من Local Storage
 */
function loadFromLocalStorage(studentsKey, resultsKey) {
  try {
    const savedStudents = localStorage.getItem(studentsKey);
    const savedResults = localStorage.getItem(resultsKey);

    if (savedStudents) {
      students = JSON.parse(savedStudents);
      const sel = document.getElementById('studentSelect');
      if (sel) {
        sel.innerHTML = '';
        students.forEach(name => {
          const opt = document.createElement('option');
          opt.value = opt.textContent = name;
          sel.appendChild(opt);
        });
      }
    }

    if (savedResults) {
      results = JSON.parse(savedResults);
    }
  } catch (e) {
    console.error('خطأ في تحميل البيانات:', e);
  }
}

/* ===== دوال الصوت (ElevenLabs) ===== */
// const ELEVENLABS_API_KEY = "sk_556898af74b1dec110fc164bfbfa389cebdcd3063fe3f6de";
const ELEVENLABS_API_KEY = "sk_d74b0f18fc5eedf41e6576f45cca73d6d0ccca10b8c9eeb4";
const VOICE_ID_HAYTHAM = "IES4nrmZdUBHByLBde0P"; // haytham Arabic
const VOICE_ID_SUDIA = "3nav5pHC1EYvWOd5LmnA"; // SUDIA voice

/**
 * توليد صوت باستخدام ElevenLabs API
 */
async function generateVoice(text, voiceId = VOICE_ID_SUDIA) {
  const player = document.getElementById("player");
  if (!text.trim()) {
    console.warn("لا يوجد نص لتحويله إلى صوت");
    return;
  }

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
  const body = {
    text: text,
    model_id: "eleven_multilingual_v2",
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.7
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    player.src = audioUrl;
    await player.play();
  } catch (error) {
    console.error("خطأ في توليد الصوت:", error);
  }
}

/**
 * تشغيل النص كصوت (إذا كان الصوت مفعلاً)
 */
async function speak(text, voiceId) {
  if (soundOn && text) {
    await generateVoice(text, voiceId);
  }
}

/* ===== دوال مساعدة ===== */
/**
 * توليد رقم عشوائي بين min و max
 */
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * إنشاء بصمة للكائن (fingerprint)
 */
function fingerprint(obj) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(obj))));
}

/**
 * الحصول على ألوان عشوائية
 */
function getRandomColors(n) {
  const colors = ["#f44336", "#4caf50", "#2196f3", "#ff9800", "#9c27b0", "#00bcd4"];
  let arr = [];
  for (let i = 0; i < n; i++) {
    arr.push(colors[i % colors.length]);
  }
  return arr.sort(() => Math.random() - 0.5);
}

/* ===== دوال المؤقت ===== */
/**
 * بدء المؤقت
 */
function startTimer(callback) {
  clearInterval(timer);

  const timerInput = document.getElementById('timerInput');
  timerDuration = parseInt(timerInput?.value || 20);
  currentTimeLeft = timerDuration;
  questionStartTime = Date.now(); // حفظ وقت بداية السؤال بالميلي ثانية

  const timerDisplay = document.getElementById('timerDisplay');
  if (timerDisplay) {
    timerDisplay.textContent = '⏱ ' + toArabicNumber(((currentTimeLeft * 1000) / 1000).toFixed(2));
  }

  timer = setInterval(() => {
    currentTimeLeft -= 0.1;
    if (timerDisplay) {
      timerDisplay.textContent = '⏱ ' + toArabicNumber(((currentTimeLeft * 1000) / 1000).toFixed(2));
    }

    if (currentTimeLeft <= 0) {
      clearInterval(timer);
      if (callback) callback();
    }
  }, 100);
}

/**
 * إيقاف المؤقت
 */
function stopTimer() {
  clearInterval(timer);
}

/* ===== دوال الطلاب ===== */
/**
 * اختيار الطالب التالي
 */
function pickNextStudent() {
  const sel = document.getElementById('studentSelect');
  if (!sel || students.length === 0) return;

  let idx = students.indexOf(currentStudent);
  if (idx === -1) {
    currentStudent = students[0];
  } else {
    currentStudent = students[(idx + 1) % students.length];
  }

  sel.value = currentStudent || '';

  if (currentStudent && !results[currentStudent]) {
    results[currentStudent] = { ok: 0, bad: 0, time: 0, avatar: '' };
  }
}

/**
 * إضافة طالب جديد
 */
function addStudent(saveCallback) {
  const input = document.getElementById('newStudent');
  if (!input) return false;

  const name = input.value.trim();
  if (!name) {
    alert('يرجى إدخال اسم الطالب');
    return false;
  }

  if (students.includes(name)) {
    alert('الطالب موجود بالفعل');
    return false;
  }

  students.push(name);
  results[name] = { ok: 0, bad: 0, time: 0, avatar: '' };

  const sel = document.getElementById('studentSelect');
  if (sel) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = name;
    sel.appendChild(opt);
    sel.value = name;
  }

  currentStudent = name;
  input.value = '';

  updateResultsTable();
  if (saveCallback) saveCallback();

  return true;
}

/**
 * حذف طالب
 */
function deleteStudent(saveCallback) {
  const sel = document.getElementById('studentSelect');
  if (!sel) return false;

  const name = sel.value;
  if (!name) {
    alert('يرجى اختيار طالب للحذف');
    return false;
  }

  if (!confirm(`هل تريد حذف ${name}؟`)) {
    return false;
  }

  const idx = students.indexOf(name);
  if (idx !== -1) {
    students.splice(idx, 1);
    delete results[name];

    sel.innerHTML = '';
    students.forEach(n => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = n;
      sel.appendChild(opt);
    });

    if (students.length > 0) {
      sel.value = students[0];
      currentStudent = students[0];
    } else {
      currentStudent = null;
    }

    updateResultsTable();
    if (saveCallback) saveCallback();
    return true;
  }
  return false;
}

/**
 * حذف جميع الطلاب
 */
function deleteAllStudents(saveCallback) {
  if (!confirm('هل تريد حذف جميع الطلاب؟')) {
    return false;
  }

  students = [];
  results = {};
  currentStudent = null;

  const sel = document.getElementById('studentSelect');
  if (sel) sel.innerHTML = '';

  updateResultsTable();
  if (saveCallback) saveCallback();
  return true;
}

/* ===== دوال الجدول والنتائج ===== */
/**
 * الحصول على النتائج مرتبة
 */
function getSortedResultsArray() {
  return Object.entries(results)
    .map(([name, data]) => ({
      name,
      ok: data.ok || 0,
      bad: data.bad || 0,
      time: (Math.round((data.time || 0) * 1000) / 1000).toFixed(2),
      score: (data.ok || 0) - (data.bad || 0) * 0.5
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.time !== b.time) return a.time - b.time;
      return a.name.localeCompare(b.name, 'ar');
    });
}

/**
 * تحديث جدول النتائج
 */
function updateResultsTable() {
  const tbody = document.querySelector('#resultsTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  const sorted = getSortedResultsArray();

  // تحديد المراكز الثلاثة الأولى
  const podium = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i === 0 || sorted[i].score === sorted[i - 1].score) {
      if (i < 3) podium.push(i);
    } else if (podium.length < 3) {
      podium.push(i);
    }
  }

  sorted.forEach((r, idx) => {
    const tr = document.createElement('tr');
    let medal = '';
    let rowClass = '';

    if (podium.indexOf(idx) !== -1) {
      const pos = podium.indexOf(idx);
      if (pos === 0) { medal = '🥇'; rowClass = 'gold'; }
      else if (pos === 1) { medal = '🥈'; rowClass = 'silver'; }
      else if (pos === 2) { medal = '🥉'; rowClass = 'bronze'; }
    }

    if (rowClass) tr.className = rowClass;

    // بناء خلية الاسم مع الصورة
    let nameCell = '';
    if (medal) nameCell += '<span class="medal">' + medal + '</span>';

    // إضافة الصورة إذا كانت موجودة
    const studentData = results[r.name];
    if (studentData && studentData.avatar) {
      nameCell += `<img src="${studentData.avatar}" alt="${r.name}" class="student-avatar" style="width: 60px; height: 60px; border-radius: 50%; margin-left: 10px; object-fit: cover; vertical-align: middle; border: 3px solid #4CAF50; box-shadow: 0 4px 8px rgba(0,0,0,0.2); transition: transform 0.3s ease;">`;
    }
    nameCell += r.name;

    tr.innerHTML = `
      <td>${nameCell}</td>
      <td>${r.ok}</td>
      <td>${r.bad}</td>
      <td>${r.time}</td>
    `;
    tbody.appendChild(tr);
  });
}

/**
 * إعادة ضبط النتائج للصفر
 */
function resetAllResults(saveCallback) {
  if (!confirm('هل تريد إعادة ضبط نتائج جميع الطلاب للصفر؟')) {
    return false;
  }

  for (const name in results) {
    results[name] = { ok: 0, bad: 0, time: 0 };
  }
  updateResultsTable();
  if (saveCallback) saveCallback();
  return true;
}

/* ===== دوال التصدير والاستيراد ===== */
/**
 * تصدير النتائج إلى Excel
 */
function exportResultsToExcel(filename = 'results.xlsx') {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة XLSX غير متوفرة');
    return;
  }

  const wb = XLSX.utils.book_new();
  const ws_data = [["الطالب", "صحيحة", "خاطئة", "الزمن (ثواني)", "الصورة"]];

  for (const [name, r] of Object.entries(results)) {
    ws_data.push([name, r.ok || 0, r.bad || 0, Math.round(r.time || 0), r.avatar || '']);
  }

  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  XLSX.utils.book_append_sheet(wb, ws, "النتائج");
  XLSX.writeFile(wb, filename);
}

/**
 * استيراد النتائج من Excel
 */
function importResultsFromFile(fileOrEvent, saveCallback) {
  if (typeof XLSX === 'undefined') {
    alert('مكتبة XLSX غير متوفرة');
    return;
  }

  // تحديد الملف من Event أو File مباشرة
  const file = fileOrEvent.target ? fileOrEvent.target.files[0] : fileOrEvent;
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (evt) {
    try {
      const data = new Uint8Array(evt.target.result);
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { header: 1 });

      // حذف جميع البيانات القديمة
      students = [];
      results = {};

      const sel = document.getElementById('studentSelect');
      if (sel) sel.innerHTML = '';

      // إضافة البيانات الجديدة من الملف
      for (let i = 1; i < json.length; i++) {
        const row = json[i];
        if (!row[0]) continue;

        const name = String(row[0]).trim();
        const ok = parseInt(row[1]) || 0;
        const bad = parseInt(row[2]) || 0;
        const time = parseFloat(row[3]) || 0;
        const avatar = row[4] ? String(row[4]).trim() : '';

        students.push(name);
        results[name] = { ok, bad, time, avatar };

        // قراءة رابط الصورة من العمود E (index 4)
        // ملاحظة: يجب أن يحتوي العمود على رابط نصي للصورة، وليس صورة مدرجة
        const imageUrl = row[4] ? String(row[4]).trim() : '';
        if (imageUrl) {
          results[name].avatar = imageUrl;
        }
        // إضافة للقائمة المنسدلة
        if (sel) {
          const opt = document.createElement('option');
          opt.value = opt.textContent = name;
          sel.appendChild(opt);
        }
      }

      // تحديث الطالب الحالي
      if (students.length > 0) {
        currentStudent = students[0];
        if (sel) sel.value = currentStudent;
      } else {
        currentStudent = null;
      }

      updateResultsTable();
      if (saveCallback) saveCallback();

      //   alert(`تم استيراد ${students.length} طالب بنجاح`);
    } catch (error) {
      console.error('خطأ في استيراد البيانات:', error);
      alert('فشل استيراد البيانات');
    }
  };
  reader.readAsArrayBuffer(file);
}

/* ===== دوال العرض والتفاعل ===== */
/**
 * عرض شاشة التهنئة للفائزين
 */
function showWinnersBanner(top3) {
  const banner = document.getElementById('resultsBanner');
  const content = document.getElementById('bannerContent');
  const overlay = document.getElementById('bannerOverlay');

  if (!banner || !content) return;

  const medals = ['🥇', '🥈', '🥉'];
  const colors = ['gold', 'silver', 'bronze'];
  let html = '<div class="banner-title">🎉 نتائج المسابقة 🎉</div>';

  top3.forEach((p, i) => {
    const cls = colors[i] || '';
    html += `
      <div class="winner-row ${cls === 'gold' ? 'first' : cls === 'silver' ? 'second' : cls === 'bronze' ? 'third' : ''}">
        <div class="winner-medal">${medals[i]}</div>
        <div class="winner-info">
          <div class="winner-name">${p.name}</div>
          <div class="winner-stats">${p.ok} صحيح — ${p.bad} خاطئ</div>
        </div>
      </div>
    `;
  });

  content.innerHTML = html;

  if (overlay) overlay.style.display = 'block';
  banner.style.display = 'block';
  banner.classList.add('show');
  speak(`
    ألف مبروك للأبطال الفائزين!
    في المركز الأول، بطلنا ${top3[0].name} بـ ${top3[0].ok} إجابة صحيحة رائعة!
    وفي المركز الثاني، المتألق ${top3[1].name} بـ ${top3[1].ok} إجابة صحيحة ممتازة!
    وفي المركز الثالث، المبدع ${top3[2].name} بـ ${top3[2].ok} إجابة صحيحة مميزة!
    أحسنتم جميعاً، أنتم نجوم ساطعة!   `);  
  // تأثير الاحتفال
  try {
    if (typeof confetti !== 'undefined') {
      const duration = 15 * 1000,
        animationEnd = Date.now() + duration,
        defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min, max) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function () {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // since particles fall down, start a bit higher than random
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          })
        );
        confetti(
          Object.assign({}, defaults, {
            particleCount,
            origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          })
        );
      }, 250);
      // confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
    }
  } catch (e) {
    console.error('خطأ في تشغيل confetti:', e);
  }
}

/**
 * إخفاء شاشة التهنئة
 */
function hideBanner() {
  const banner = document.getElementById('resultsBanner');
  const overlay = document.getElementById('bannerOverlay');

  if (banner) {
    banner.style.display = 'none';
    banner.classList.remove('show');
  }

  if (overlay) {
    overlay.style.display = 'none';
  }

  const content = document.getElementById('bannerContent');
  if (content) content.innerHTML = '';
}

/* ===== تهيئة عند تحميل الصفحة ===== */
window.addEventListener('load', () => {
});
