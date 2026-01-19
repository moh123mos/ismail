# AI Prompt: Educational Math Game Builder

> **Use this prompt to build a new educational math game that maintains consistency with existing games in the project.**

---

## 🎯 TASK

Build a complete, interactive educational math game as a standalone HTML file following the **exact structure and patterns** described below. The game should:

1. **Match the existing design system** (colors, fonts, layout)
2. **Use shared functionality** from `common.js` and `style.css`
3. **Support Arabic/RTL interface** with bilingual number systems
4. **Include student management** with score tracking
5. **Provide interactive feedback** with animations and sounds
6. **Be fully responsive** and accessible

---

## 📋 REQUIRED HTML STRUCTURE

### 1. Document Head
```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>[Game Title in Arabic]</title>
  <link rel="stylesheet" href="../style.css" />
  <script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"></script>
  <style>
    body { /* Add game-specific styles only */ }
  </style>
</head>
```

### 2. Header Section
```html
<div class="header">
  <a href="../index.html" class="home-button">🏠 الصفحة الرئيسية</a>
  <div class="banner-wrap" style="height: 50vh;" aria-hidden="false">
    <img src="../imgs/[appropriate-image].png" alt="[description]">
  </div>
  <div class="h1-row" style="margin-top: 4px; margin-bottom: 30px;">
    <h1>[Attractive Arabic Game Title]</h1>
    <div class="credit">🌟 إعداد معلم الرياضيات <strong>إسماعيل مصطفى عامر</strong> 🌟</div>
  </div>
</div>
```

### 3. Game Settings Toolbar
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

**Notes:**
- Add multiple toolbars if needed for more settings
- Use `<div class="group">` for each setting group
- Always place `<span class="label">` before each input/select

### 4. Optional Features Row
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

### 5. Student Management Section
```html
<div class="students" style="width:92%">
  <input type="text" id="newStudent" placeholder="أدخل اسم الطالب">
  <button id="addStudent">➕ إضافة طالب</button>
  <select id="studentSelect" style="min-width:300px;height:70px;font-size:30px;padding:6px;"></select>
  <button id="deleteStudent">🗑 حذف الطالب</button>
  <button id="deleteAll">🗑 حذف الجميع</button>
</div>
```

### 6. Main Control Buttons
```html
<div style="display:flex;gap:8px;align-items:center;width:92%;justify-content:center">
  <button id="startBtn">🚀 ابدأ اللعب</button>
  <button id="regenerateBtn" style="display:none">🔁 أعد توليد السؤال</button>
</div>
```

### 7. Game Area (Question & Choices)
```html
<div id="problem" aria-live="polite"></div>
<div class="choices" id="choices" role="list"></div>
<div id="timerDisplay">⏱ 00</div>
<div class="status" id="status" style="font-size: 30px;"></div>
<div class="face" id="face"></div>
```

### 8. Results Management Buttons
```html
<div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center;width:92%;justify-content:center">
  <button id="exportBtn">📥 تصدير النتائج</button>
  <input type="file" id="importFile" accept=".xlsx,.csv">
  <button id="resetResults">🔄 إعادة ضبط النتائج</button>
  <button id="clearUsed">🧹 مسح سجل الأسئلة المستخدمة</button>
  <button id="finalizeResultsBtn">🎤 حسم النتيجة</button>
</div>
```

### 9. Results Table
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

### 10. Results Banner (Modal)
```html
<div id="bannerOverlay"></div>
<div id="resultsBanner" role="dialog" aria-modal="true">
  <button class="banner-close" aria-label="إغلاق">✖</button>
  <div id="bannerContent"></div>
</div>
```

### 11. Footer & Scripts
```html
<div class="footer-note">نسخة تفاعلية محلية — تعمل مباشرة في المتصفح دون اتصال.</div>

<audio id="player" hidden></audio>
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="../common.js"></script>
<script>
  // Game-specific JavaScript here
</script>
</body>
</html>
```

---

## 🎨 CSS DESIGN SYSTEM

### Required CSS Variables
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

### Base Styling Requirements
```css
body {
  direction: rtl;
  font-family: 'Cairo', sans-serif;
  background: var(--bg);
  color: #fff;
}
```

### State Classes (Required)
```css
.choice.correct {
  background: linear-gradient(135deg, #43a047, #66bb6a);
}

.choice.wrong {
  background: linear-gradient(135deg, #e53935, #ef5350);
}

tr.gold { background: rgba(255, 215, 0, 0.2); }
tr.silver { background: rgba(192, 192, 192, 0.2); }
tr.bronze { background: rgba(205, 127, 50, 0.2); }
```

### Animation Keyframes Used
- `@keyframes shake` - wrong answer animation
- `@keyframes bounceIn` - results appearance
- `@keyframes pulse` - pulsing elements
- `@keyframes rotate3d` - 3D rotation effects

**Important:** Use classes from `style.css`. Don't redefine shared styles. Add only game-specific styles in the internal `<style>` tag.

---

## ⚙️ JAVASCRIPT IMPLEMENTATION

### 1. Storage Keys (Use Unique Names)
```javascript
const STORAGE_KEY_STUDENTS = '[game_name]_students';
const STORAGE_KEY_RESULTS = '[game_name]_results';
const STORAGE_KEY_USED = '[game_name]_used'; // optional
```

### 2. Shared Functions from common.js

**DON'T reimplement these - they're already available:**

#### Data Management
```javascript
saveToStorage(key, data)    // Save to localStorage
loadFromStorage(key, defaultValue)  // Load from localStorage
```

#### Student Management
```javascript
addStudent()           // Add new student to list
deleteStudent()        // Delete selected student
deleteAllStudents()    // Clear all students
pickNextStudent()      // Get next student in rotation
updateStudentSelect()  // Refresh student dropdown
```

#### Results Management
```javascript
updateResultsTable()      // Refresh results table display
getSortedResultsArray()   // Get sorted results for rankings
resetAllResults()         // Clear all scores
```

#### Import/Export
```javascript
exportResultsToExcel()    // Export to Excel file
importResultsFromFile()   // Import from file
```

#### Sound & Effects
```javascript
speak(text)              // Text-to-speech
playCorrectSound()       // Play success sound
playWrongSound()         // Play error sound
launchConfetti()         // Launch confetti animation
```

#### Timer
```javascript
startTimer(duration, onTick, onComplete)  // Start countdown
stopTimer()                                // Stop countdown
```

#### Number Conversion
```javascript
toArabicNumber(num)      // Convert to Hindi-Arabic numerals
toggleNumberType()       // Switch between Arabic/Hindi numerals
```

#### Results Banner
```javascript
showWinnersBanner()      // Display winners modal
hideBanner()             // Close modal
```

### 3. Game-Specific Functions (YOU MUST IMPLEMENT)

#### A) Generate New Problem
```javascript
function newProblem() {
  // 1. Generate question based on settings and difficulty level
  // 2. Calculate correct answer
  // 3. Generate answer choices (including wrong options)
  // 4. Display question and choices in DOM
  // 5. Start the timer
  // 6. Optionally speak the question (if sound enabled)
  
  // Example structure:
  const difficulty = document.getElementById('level').value;
  const digits = parseInt(document.getElementById('digits').value);
  
  // Generate question based on game type
  // ...
  
  // Display choices
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = useArabicNums ? toArabicNumber(choice) : choice;
    btn.onclick = () => checkAnswer(choice);
    choicesDiv.appendChild(btn);
  });
  
  // Start timer
  const duration = parseInt(document.getElementById('timerInput').value);
  startTimer(duration, updateTimerDisplay, handleTimeout);
}
```

#### B) Check Answer
```javascript
function checkAnswer(selectedAnswer) {
  // 1. Stop timer
  stopTimer();
  
  // 2. Disable all choice buttons
  document.querySelectorAll('.choice').forEach(btn => btn.disabled = true);
  
  // 3. Visual feedback (color correct/wrong choices)
  const isCorrect = (selectedAnswer === correctAnswer);
  event.target.classList.add(isCorrect ? 'correct' : 'wrong');
  
  // 4. Update student's results
  if (currentStudent) {
    if (!results[currentStudent]) {
      results[currentStudent] = { correct: 0, wrong: 0 };
    }
    results[currentStudent][isCorrect ? 'correct' : 'wrong']++;
  }
  
  // 5. Play appropriate sound
  if (soundEnabled) {
    isCorrect ? playCorrectSound() : playWrongSound();
  }
  
  // 6. Launch effects (confetti for correct, shake for wrong)
  if (isCorrect) {
    launchConfetti();
    document.getElementById('face').textContent = '🎉';
    document.getElementById('status').textContent = 'ممتاز! 🌟';
  } else {
    document.querySelector('.choice.wrong').classList.add('shake');
    document.getElementById('face').textContent = '😢';
    document.getElementById('status').textContent = 'حاول مرة أخرى 💪';
  }
  
  // 7. Save data
  saveData();
  
  // 8. Update results table
  updateResultsTable();
  
  // 9. Move to next student (after delay)
  setTimeout(() => {
    pickNextStudent();
    newProblem();
  }, 2000);
}
```

#### C) Start Game
```javascript
function startGame() {
  // 1. Check if students exist
  if (students.length === 0) {
    alert('الرجاء إضافة طلاب أولاً!');
    return;
  }
  
  // 2. Hide start button, show regenerate button
  document.getElementById('startBtn').style.display = 'none';
  document.getElementById('regenerateBtn').style.display = 'inline-block';
  
  // 3. Select first student
  pickNextStudent();
  
  // 4. Generate first question
  newProblem();
}
```

#### D) Regenerate Problem
```javascript
function regenerateProblem() {
  // 1. Stop current timer
  stopTimer();
  
  // 2. Clear previous state
  document.getElementById('status').textContent = '';
  document.getElementById('face').textContent = '';
  
  // 3. Generate new question
  newProblem();
}
```

### 4. Helper Functions
```javascript
// Random integer between min and max (inclusive)
function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Pick random element from array
function randomChoice(arr) {
  return arr[rnd(0, arr.length - 1)];
}

// Shuffle array
function shuffle(arr) {
  return arr.sort(() => Math.random() - 0.5);
}

// Generate random colors
function getRandomColors() {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];
  return shuffle(colors);
}
```

---

## 🔄 WORKFLOW & INITIALIZATION

### Page Load
```javascript
window.addEventListener('DOMContentLoaded', () => {
  // 1. Load saved data
  loadData();
  
  // 2. Update UI
  updateStudentSelect();
  updateResultsTable();
  
  // 3. Setup event listeners
  document.getElementById('startBtn').addEventListener('click', startGame);
  document.getElementById('regenerateBtn').addEventListener('click', regenerateProblem);
  document.getElementById('addStudent').addEventListener('click', addStudent);
  document.getElementById('deleteStudent').addEventListener('click', deleteStudent);
  document.getElementById('deleteAll').addEventListener('click', deleteAllStudents);
  document.getElementById('exportBtn').addEventListener('click', exportResultsToExcel);
  document.getElementById('importFile').addEventListener('change', importResultsFromFile);
  document.getElementById('resetResults').addEventListener('click', resetAllResults);
  document.getElementById('finalizeResultsBtn').addEventListener('click', showWinnersBanner);
  document.getElementById('toggleNums').addEventListener('click', toggleNumberType);
  document.getElementById('toggleSound').addEventListener('click', toggleSound);
});
```

### Game Flow
1. **Start:** User clicks "ابدأ اللعب" → `startGame()`
2. **Question:** Generate and display problem → `newProblem()`
3. **Answer:** User selects answer → `checkAnswer()`
4. **Feedback:** Show result, update scores, effects
5. **Next:** Auto-advance to next student → `pickNextStudent()` → `newProblem()`
6. **Repeat:** Continue until user stops or all students complete

---

## 📱 RESPONSIVE DESIGN

```css
@media (max-width: 720px) {
  /* Reduce font sizes */
  h1 { font-size: 1.8em; }
  #problem { font-size: 2em; }
  .choice { font-size: 1.5em; }
  
  /* Stack toolbars vertically */
  .toolbar { flex-direction: column; }
  .students { flex-direction: column; }
  
  /* Adjust button sizes */
  button { padding: 10px; font-size: 1em; }
}
```

---

## ♿ ACCESSIBILITY REQUIREMENTS

Include these attributes:
- `aria-live="polite"` on dynamic content elements
- `aria-label` on icon-only buttons
- `role="dialog"` and `aria-modal="true"` on modals
- `role="list"` on choice containers
- Keyboard navigation support (Enter to select, Tab to navigate)

---

## 🔧 REQUIRED EXTERNAL RESOURCES

### JavaScript Libraries
```html
<script src="https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@tsparticles/confetti@3.0.3/tsparticles.confetti.bundle.min.js"></script>
```

### Local Files
- `style.css` - shared styles
- `common.js` - shared functions
- `imgs/[appropriate-image].png` - banner image

---

## ✅ CHECKLIST

Before considering the game complete, verify:

- [ ] HTML structure matches the template exactly
- [ ] All required sections included (Header, Toolbar, Students, Game Area, Results)
- [ ] Uses `style.css` for shared styles
- [ ] Uses `common.js` for shared functions
- [ ] Unique storage keys defined for this game
- [ ] `newProblem()` implemented for this game type
- [ ] `checkAnswer()` handles scoring correctly
- [ ] Number conversion (Arabic/Hindi) works
- [ ] Sound toggle works (on/off)
- [ ] Timer counts down correctly
- [ ] Confetti and shake animations work
- [ ] Export/import functionality works
- [ ] Winners banner displays correctly
- [ ] Responsive on mobile devices
- [ ] Accessibility attributes present
- [ ] Appropriate banner image added to `imgs/`
- [ ] Attractive Arabic title chosen

---

## 💡 BEST PRACTICES

1. **Start with an existing game** (like `equations.html`) as a template
2. **Only modify game-specific logic** (question generation, answer checking)
3. **Never reimplement shared functions** - use `common.js`
4. **Maintain design consistency** (colors, fonts, layout)
5. **Test on mobile devices** before finalizing
6. **Document game-specific changes** in code comments
7. **Use Arabic for all UI text** (interface language)
8. **Support both Arabic (١٢٣) and Hindi (123) numerals**

---

## 📝 EXAMPLE IMPLEMENTATION

Here's a minimal example structure:

```javascript
// Game variables
let students = [];
let results = {};
let currentStudent = null;
let correctAnswer = null;
let useArabicNums = false;
let soundEnabled = true;

const STORAGE_KEY_STUDENTS = 'my_game_students';
const STORAGE_KEY_RESULTS = 'my_game_results';

// Data management
function saveData() {
  saveToStorage(STORAGE_KEY_STUDENTS, students);
  saveToStorage(STORAGE_KEY_RESULTS, results);
}

function loadData() {
  students = loadFromStorage(STORAGE_KEY_STUDENTS, []);
  results = loadFromStorage(STORAGE_KEY_RESULTS, {});
}

// Game logic
function newProblem() {
  // Generate your game-specific question here
  const a = rnd(1, 10);
  const b = rnd(1, 10);
  correctAnswer = a + b;
  
  // Display question
  document.getElementById('problem').textContent = 
    `${useArabicNums ? toArabicNumber(a) : a} + ${useArabicNums ? toArabicNumber(b) : b} = ?`;
  
  // Generate choices
  const choices = [correctAnswer];
  while (choices.length < 4) {
    const wrong = correctAnswer + rnd(-5, 5);
    if (wrong !== correctAnswer && !choices.includes(wrong)) {
      choices.push(wrong);
    }
  }
  shuffle(choices);
  
  // Display choices
  const choicesDiv = document.getElementById('choices');
  choicesDiv.innerHTML = '';
  choices.forEach(choice => {
    const btn = document.createElement('button');
    btn.className = 'choice';
    btn.textContent = useArabicNums ? toArabicNumber(choice) : choice;
    btn.onclick = () => checkAnswer(choice);
    choicesDiv.appendChild(btn);
  });
  
  // Start timer
  startTimer(parseInt(document.getElementById('timerInput').value), 
    updateTimerDisplay, handleTimeout);
}

function checkAnswer(selected) {
  stopTimer();
  const isCorrect = (selected === correctAnswer);
  
  // Update results
  if (currentStudent) {
    if (!results[currentStudent]) {
      results[currentStudent] = { correct: 0, wrong: 0 };
    }
    results[currentStudent][isCorrect ? 'correct' : 'wrong']++;
    saveData();
    updateResultsTable();
  }
  
  // Feedback
  if (isCorrect) {
    launchConfetti();
    document.getElementById('status').textContent = 'ممتاز! 🎉';
  } else {
    document.getElementById('status').textContent = 'حاول مرة أخرى 💪';
  }
  
  // Next question
  setTimeout(() => {
    pickNextStudent();
    newProblem();
  }, 2000);
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
  loadData();
  updateStudentSelect();
  updateResultsTable();
  // ... setup event listeners
});
```

---

## 🎯 FINAL NOTES

**This is a complete specification.** Follow it precisely to create games that:
- Look and feel identical to existing games
- Share code efficiently through `common.js` and `style.css`
- Work offline in any browser
- Support Arabic language and RTL layout
- Provide engaging educational experiences

**Focus on:** Writing the game-specific `newProblem()` logic. Everything else is already handled by the shared codebase.

---

📅 **Last Updated:** January 2026  
✍️ **Prepared by:** Ismail Mostafa Amer
