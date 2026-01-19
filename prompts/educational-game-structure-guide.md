# دليل بناء الألعاب التعليمية - قالب موحد

> **الغرض من هذا الملف:** استخدم هذا الدليل كـ prompt شامل عند بناء أي لعبة تعليمية جديدة لضمان التوحيد والتناسق مع الألعاب الموجودة.

---

## 📋 الهيكل الأساسي للصفحة (HTML Structure)

### 1. الـ Head
```html
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>عنوان اللعبة المناسب</title>
  <link rel="stylesheet" href="../style.css" />
  <script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"></script>
  <style>
    /* أنماط خاصة باللعبة فقط */
  </style>
</head>
```

### 2. الهيدر (Header)
```html
<div class="header">
  <a href="../index.html" class="home-button">🏠 الصفحة الرئيسية</a>
  <div class="banner-wrap" style="height: 50vh;" aria-hidden="false">
    <img src="../imgs/[اسم_الصورة_المناسبة].png" alt="وصف الصورة">
  </div>
  <div class="h1-row" style="margin-top: 4px; margin-bottom: 30px;">
    <h1>عنوان اللعبة بشكل جذاب</h1>
    <div class="credit">🌟 إعداد معلم الرياضيات <strong>إسماعيل مصطفى عامر</strong> 🌟</div>
  </div>
</div>
```

### 3. شريط الأدوات (Toolbar)
```html
<div class="toolbar" style="margin-top:6px">
  <div class="group">
    <span class="label">عدد الأرقام:</span>
    <input type="number" id="digits" value="1" min="1" max="3">
  </div>
  <div class="group">
    <span class="label">زمن السؤال (ث):</span>
    <input type="number" id="timerInput" value="20" min="5" max="60">
  </div>
  <div class="group">
    <span class="label">مستوى:</span>
    <select id="level">
      <option value="easy">سهل</option>
      <option value="medium">متوسط</option>
      <option value="hard">صعب</option>
    </select>
  </div>
</div>
```

**ملاحظات:**
- أضف toolbar إضافية حسب الحاجة
- استخدم `<div class="group">` لكل مجموعة إعدادات
- ضع `<span class="label">` قبل كل input/select

### 4. خيارات إضافية (Optional Features)
```html
<div style="width:92%;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin-top:6px">
  <div class="group">
    <button id="toggleNums">🔢 الأرقام: عربية</button>
  </div>
  <div class="group">
    <button id="toggleSound">🔊 الصوت: تشغيل</button>
  </div>
</div>
```

### 5. إدارة الطلاب (Students Management)
```html
<div class="students" style="width:92%">
  <input type="text" id="newStudent" placeholder="أدخل اسم الطالب">
  <button id="addStudent">➕ إضافة طالب</button>
  <select id="studentSelect" style="min-width:300px;height:70px;font-size:30px;padding:6px;"></select>
  <button id="deleteStudent">🗑 حذف الطالب</button>
  <button id="deleteAll">🗑 حذف الجميع</button>
</div>
```

### 6. أزرار التحكم الرئيسية
```html
<div style="display:flex;gap:8px;align-items:center;width:92%;justify-content:center">
  <button id="startBtn">🚀 ابدأ اللعب</button>
  <button id="regenerateBtn" style="display:none">🔁 أعد توليد السؤال</button>
</div>
```

### 7. منطقة اللعب (Game Area)
```html
<div id="problem" aria-live="polite"></div>
<div class="choices" id="choices" role="list"></div>
<div id="timerDisplay">⏱ 00</div>
<div class="status" id="status" style="font-size: 30px;"></div>
<div class="face" id="face"></div>
```

### 8. أزرار إدارة النتائج
```html
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:92%;justify-content:center">
  <button id="exportBtn">📥 تصدير النتائج</button>
  <input type="file" id="importFile" accept=".xlsx,.csv">
  <button id="resetResults">🔄 إعادة ضبط النتائج</button>
  <button id="clearUsed">🧹 مسح سجل الأسئلة المستخدمة</button>
  <button id="finalizeResultsBtn">🎤 حسم النتيجة</button>
</div>
```

### 9. جدول النتائج (Results Table)
```html
<div class="results-area">
  <table id="resultsTable" aria-live="polite">
    <thead>
      <tr>
        <th>الطالب</th>
        <th>صحيحة</th>
        <th>خاطئة</th>
        <th>النسبة</th>
        <th>المجموع</th>
        <th>الترتيب</th>
      </tr>
    </thead>
    <tbody></tbody>
  </table>
</div>
```

### 10. شريط النتائج النهائي (Results Banner)
```html
<div id="bannerOverlay"></div>
<div id="resultsBanner" role="dialog" aria-modal="true">
  <button class="banner-close" aria-label="إغلاق">✖</button>
  <div id="bannerContent"></div>
</div>
```

### 11. مشغل الصوت والمكتبات
```html
<audio id="player" hidden></audio>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="../common.js"></script>
```

### 12. الملاحظة السفلية (Footer Note)
```html
<div class="footer-note">نسخة تفاعلية محلية — تعمل مباشرة في المتصفح دون اتصال.</div>
```

---

## 🎨 التصميم (CSS Styling)

### 1. متغيرات CSS الأساسية (يجب استخدامها)
```css
:root {
  --bg: #0b1020;
  --brand: #ff9800;
  --brand-dark: #fb8c00;
  --panel: #111217;
  --accent: #ffb366;
  --blue: #4FC3F7;
  --fuchsia: #ff77d1;
}
```

### 2. التنسيقات الأساسية المطلوبة
```css
body {
  direction: rtl;
  font-family: 'Cairo', sans-serif;
  background: var(--bg);
  color: #fff;
  /* خلفية متدرجة أو متحركة */
}
```

### 3. أنماط CSS يجب الالتزام بها
- استخدم الـ classes الموجودة في `style.css`
- لا تعيد تعريف الأنماط المشتركة
- أضف فقط الأنماط الخاصة باللعبة في `<style>` الداخلي

### 4. أنماط الحالات المطلوبة
```css
.choice.correct {
  background: linear-gradient(135deg, #43a047, #66bb6a);
  /* تأثير الإجابة الصحيحة */
}

.choice.wrong {
  background: linear-gradient(135deg, #e53935, #ef5350);
  /* تأثير الإجابة الخاطئة */
}

tr.gold { background: rgba(255, 215, 0, 0.2); }
tr.silver { background: rgba(192, 192, 192, 0.2); }
tr.bronze { background: rgba(205, 127, 50, 0.2); }
```

### 5. الرسوم المتحركة المستخدمة
- `@keyframes shake` - عند الإجابة الخاطئة
- `@keyframes bounceIn` - عند ظهور النتائج
- `@keyframes pulse` - للعناصر النابضة
- `@keyframes rotate3d` - للتأثيرات الدورانية

---

## ⚙️ العمليات البرمجية (JavaScript Operations)

### 1. مفاتيح التخزين المطلوبة
```javascript
const STORAGE_KEY_STUDENTS = '[اسم_اللعبة]_students';
const STORAGE_KEY_RESULTS = '[اسم_اللعبة]_results';
const STORAGE_KEY_USED = '[اسم_اللعبة]_used'; // اختياري
```

### 2. الدوال الأساسية المطلوبة من common.js

#### أ) إدارة البيانات
```javascript
// حفظ البيانات
function saveData() {
  saveToStorage(STORAGE_KEY_STUDENTS, students);
  saveToStorage(STORAGE_KEY_RESULTS, results);
}

// تحميل البيانات
function loadData() {
  students = loadFromStorage(STORAGE_KEY_STUDENTS, []);
  results = loadFromStorage(STORAGE_KEY_RESULTS, {});
}
```

#### ب) إدارة الطلاب
```javascript
// استخدم الدوال من common.js:
- addStudent()
- deleteStudent()
- deleteAllStudents()
- pickNextStudent()
- updateStudentSelect()
```

#### ج) إدارة النتائج
```javascript
// استخدم الدوال من common.js:
- updateResultsTable()
- getSortedResultsArray()
- resetAllResults()
```

#### د) الاستيراد والتصدير
```javascript
// استخدم الدوال من common.js:
- exportResultsToExcel()
- importResultsFromFile()
```

#### هـ) الصوت والمؤثرات
```javascript
// استخدم الدوال من common.js:
- speak(text) // قراءة النص
- playCorrectSound() // صوت الإجابة الصحيحة
- playWrongSound() // صوت الإجابة الخاطئة
- launchConfetti() // إطلاق الألعاب النارية
```

#### و) المؤقت
```javascript
// استخدم الدوال من common.js:
- startTimer(duration, onTick, onComplete)
- stopTimer()
```

#### ز) تحويل الأرقام
```javascript
// استخدم الدوال من common.js:
- toArabicNumber(num) // تحويل للأرقام الهندية
- toggleNumberType() // تبديل نوع الأرقام
```

#### ح) شاشة النتائج
```javascript
// استخدم الدوال من common.js:
- showWinnersBanner()
- hideBanner()
```

### 3. الدوال الخاصة باللعبة (يجب تطويرها)

#### أ) توليد السؤال
```javascript
function newProblem() {
  // 1. توليد السؤال حسب المستوى والإعدادات
  // 2. حساب الإجابة الصحيحة
  // 3. توليد خيارات إجابة (بعضها خاطئ)
  // 4. عرض السؤال والخيارات
  // 5. بدء المؤقت
  // 6. تفعيل الصوت (اختياري)
}
```

#### ب) التحقق من الإجابة
```javascript
function checkAnswer(selectedAnswer) {
  // 1. إيقاف المؤقت
  // 2. تعطيل جميع الخيارات
  // 3. تلوين الإجابة (صحيحة/خاطئة)
  // 4. تحديث النتائج للطالب الحالي
  // 5. تشغيل الصوت المناسب
  // 6. إطلاق المؤثرات (confetti للصحيح، shake للخطأ)
  // 7. عرض رسالة تشجيعية
  // 8. حفظ البيانات
  // 9. الانتقال للطالب التالي (بعد تأخير)
}
```

#### ج) بدء اللعبة
```javascript
function startGame() {
  // 1. التحقق من وجود طلاب
  // 2. إخفاء زر البدء
  // 3. إظهار زر إعادة التوليد
  // 4. اختيار أول طالب
  // 5. توليد أول سؤال
}
```

#### د) إعادة توليد السؤال
```javascript
function regenerateProblem() {
  // 1. إيقاف المؤقت الحالي
  // 2. مسح الحالة السابقة
  // 3. توليد سؤال جديد
}
```

### 4. دوال مساعدة مشتركة
```javascript
// رقم عشوائي
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// اختيار عنصر عشوائي من مصفوفة
function randomChoice(arr) {
  return arr[rnd(0, arr.length - 1)];
}

// خلط مصفوفة
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// توليد ألوان عشوائية
function getRandomColors() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  return shuffle(colors);
}
```

---

## 🎯 سير العمل (Workflow)

### 1. عند تحميل الصفحة
```javascript
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  updateStudentSelect();
  updateResultsTable();
  setupEventListeners();
});
```

### 2. عند بدء اللعب
1. التحقق من وجود طالب محدد
2. بدء اللعبة
3. اختيار الطالب الأول
4. توليد السؤال الأول

### 3. عند الإجابة على السؤال
1. إيقاف المؤقت
2. التحقق من الإجابة
3. تحديث النتائج
4. عرض المؤثرات
5. الانتقال للطالب التالي تلقائياً

### 4. عند انتهاء المسابقة
1. عرض جدول النتائج المحدث
2. إظهار شريط الفائزين (عند الضغط على "حسم النتيجة")
3. إطلاق الألعاب النارية للفائزين

---

## 📱 Responsive Design

### نقاط التوقف (Breakpoints)
```css
@media (max-width: 720px) {
  /* تصغير حجم الخطوط */
  h1 { font-size: 1.8em; }
  #problem { font-size: 2em; }
  .choice { font-size: 1.5em; }
  
  /* تعديل التخطيط */
  .toolbar { flex-direction: column; }
  .students { flex-direction: column; }
}
```

---

## ♿ إمكانية الوصول (Accessibility)

### يجب تضمين:
- `aria-live="polite"` على عناصر المحتوى الديناميكي
- `aria-label` على الأزرار المهمة
- `role="dialog"` و `aria-modal="true"` على النوافذ المنبثقة
- `role="list"` على قوائم الخيارات
- دعم لوحة المفاتيح للتنقل

---

## 🔧 المتطلبات الإضافية

### 1. المكتبات المطلوبة
- Canvas Confetti: `https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js`
- Particles Confetti: `https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js`
- XLSX: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

### 2. الملفات المطلوبة
- `style.css` - الأنماط المشتركة
- `common.js` - الوظائف المشتركة
- صور في مجلد `imgs/`

### 3. الأصوات المطلوبة
- استخدم Web Speech API لقراءة النصوص
- أصوات للإجابات الصحيحة/الخاطئة (اختياري)

---

## 📝 قائمة التحقق (Checklist)

عند بناء لعبة جديدة، تأكد من:

- [ ] استخدام الهيكل HTML الموحد
- [ ] تضمين جميع الأقسام الأساسية (Header, Toolbar, Students, Game Area, Results)
- [ ] استخدام `style.css` للأنماط المشتركة
- [ ] استخدام `common.js` للوظائف المشتركة
- [ ] تعريف مفاتيح تخزين فريدة للعبة
- [ ] تنفيذ دوال `newProblem()` و `checkAnswer()` الخاصة باللعبة
- [ ] دعم تحويل الأرقام (عربية/هندية)
- [ ] دعم الصوت (تشغيل/إيقاف)
- [ ] إضافة المؤقت
- [ ] إضافة المؤثرات (confetti, shake)
- [ ] اختبار التصدير/الاستيراد
- [ ] اختبار شاشة النتائج النهائية
- [ ] اختبار Responsive Design على الموبايل
- [ ] اختبار إمكانية الوصول (Accessibility)
- [ ] إضافة صورة مناسبة في مجلد `imgs/`
- [ ] كتابة عنوان جذاب للعبة

---

## 💡 نصائح عند التطوير

1. **ابدأ بنسخ ملف موجود** (مثل `equations.html`) كقالب
2. **غير المحتوى الخاص باللعبة فقط** (توليد الأسئلة، التحقق من الإجابات)
3. **لا تعيد كتابة الوظائف المشتركة** - استخدم `common.js`
4. **حافظ على التناسق** في الألوان، الخطوط، والتصميم
5. **اختبر على الموبايل** قبل الإطلاق
6. **وثّق أي تعديلات خاصة** باللعبة في التعليقات

---

## 📌 مثال: بناء لعبة جديدة (خطوات سريعة)

```bash
# 1. انسخ ملف موجود
cp equations.html new-game.html

# 2. عدّل العنوان والمحتوى
# 3. غيّر مفاتيح التخزين
const STORAGE_KEY_STUDENTS = 'new_game_students';
const STORAGE_KEY_RESULTS = 'new_game_results';

# 4. اكتب دالة newProblem() الخاصة بلعبتك
# 5. عدّل دالة checkAnswer() حسب الحاجة
# 6. اختبر جميع الوظائف
# 7. أضف الصورة المناسبة
# 8. أضف اللعبة لـ index.html
```

---

## 🎓 خلاصة

هذا الدليل يوفر **قالباً موحداً** لبناء ألعاب تعليمية متسقة وسهلة الصيانة. استخدمه كـ **Prompt** عند إنشاء لعبة جديدة للحصول على نتائج احترافية ومتناسقة مع الألعاب الموجودة.

**تذكر:** الهدف هو التركيز على **محتوى اللعبة** وترك التصميم والوظائف الأساسية للقالب الموحد.

---

📅 **تاريخ التحديث:** يناير 2026  
✍️ **إعداد:** محمد مصطفى عامر