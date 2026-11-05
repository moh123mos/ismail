async () => {
  // Standard scenario for multiple-choice games (buildQuestion style).
  // Run on a freshly loaded page with an EMPTY localStorage. Returns { passed, failed[], details }.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  soundOn = false; // never call the ElevenLabs API from tests

  const failed = [];
  const check = (name, cond, info) => { if (!cond) failed.push(info === undefined ? name : `${name} — ${JSON.stringify(info)}`); };
  const details = {};

  const choices = () => [...document.querySelectorAll('#choices .choice')];
  const isRight = b => b._value !== undefined ? b._value === correctAnsGlobal
    : (b.textContent.trim() === String(correctAnsGlobal) || parseDisplayedNumber(b.textContent) === correctAnsGlobal);
  const vis = id => getComputedStyle($(id)).display !== 'none';
  const addStudentUI = async n => { $('newStudent').value = n; $('addStudent').click(); await sleep(50); };
  const start = async (student, seconds) => {
    $('studentSelect').value = student; $('timerInput').value = seconds || 20;
    $('startBtn').click(); await sleep(350);
  };
  const resultsOf = n => (results[n] ? [results[n].ok, results[n].bad] : null);

  // --- setup
  await addStudentUI('أحمد'); await addStudentUI('سارة');
  check('two students added', students.length === 2, students);

  // --- start
  await start('أحمد');
  check('start: choices rendered', choices().length >= 2, choices().length);
  check('start: problem shown', $('problem').textContent.trim().length > 0);
  check('start: start hidden, regenerate shown', !vis('startBtn') && vis('regenerateBtn'));
  check('start: timer shows a value', /[0-9٠-٩]/.test($('timerDisplay').textContent));

  // --- correct answer
  const cs = choices();
  details.choiceCount = cs.length;
  cs.find(isRight).click(); await sleep(250);
  check('correct: ✅ message with student name', $('status').textContent.includes('✅') && $('status').textContent.includes('أحمد'), $('status').textContent);
  check('correct: ok=1', JSON.stringify(resultsOf('أحمد')) === '[1,0]', resultsOf('أحمد'));
  check('correct: right choice marked, all locked', cs.filter(b => b.classList.contains('correct')).length === 1 && cs.every(b => b.disabled));
  check('correct: next student selected', $('studentSelect').value === 'سارة', $('studentSelect').value);
  check('correct: start back, regenerate hidden', vis('startBtn') && !vis('regenerateBtn'));
  check('correct: time recorded', results['أحمد'].time > 0);

  // --- wrong answer
  await start('سارة');
  const cw = choices();
  cw.find(b => !isRight(b)).click(); await sleep(250);
  check('wrong: ❌ message', $('status').textContent.includes('❌'), $('status').textContent);
  check('wrong: bad=1', JSON.stringify(resultsOf('سارة')) === '[0,1]', resultsOf('سارة'));
  check('wrong: one wrong + one correct marked', cw.filter(b => b.classList.contains('wrong')).length === 1 && cw.filter(b => b.classList.contains('correct')).length === 1);

  // --- timeout counts as wrong
  const badBefore = results['أحمد'].bad;
  await start('أحمد', 1);
  await sleep(1700);
  check('timeout: counted as wrong', results['أحمد'].bad === badBefore + 1, resultsOf('أحمد'));
  check('timeout: round ended', vis('startBtn') && !vis('regenerateBtn'));

  // --- regenerate = practice question, not counted
  const snap = JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]);
  await start('أحمد');
  $('regenerateBtn').click(); await sleep(250);
  check('regenerate: new question rendered', choices().length >= 2);
  choices().find(isRight).click(); await sleep(250);
  check('regenerate: not counted', JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]) === snap, resultsOf('أحمد'));
  check('regenerate: 🔁 message', $('status').textContent.includes('🔁'), $('status').textContent);

  // --- persistence
  const resKeys = Object.keys(localStorage).filter(k => k.endsWith('_results'));
  check('one results key in localStorage', resKeys.length === 1, resKeys);
  if (resKeys.length === 1) {
    const saved = JSON.parse(localStorage.getItem(resKeys[0]));
    check('saved results match memory', saved['أحمد'] && saved['أحمد'].ok === results['أحمد'].ok && saved['أحمد'].bad === results['أحمد'].bad && saved['سارة'].bad === results['سارة'].bad, saved);
    details.storageKey = resKeys[0];
  }
  check('students saved', Object.keys(localStorage).some(k => k.endsWith('_students')));

  // --- results table + winners banner
  check('results table has 2 rows', document.querySelectorAll('#resultsTable tbody tr').length === 2);
  $('finalizeResultsBtn').click(); await sleep(300);
  check('winners banner opens', getComputedStyle($('resultsBanner')).display !== 'none' && $('bannerContent').textContent.length > 0);
  $('bannerOverlay').click(); await sleep(300);
  check('winners banner closes on overlay click', getComputedStyle($('resultsBanner')).display === 'none');

  // --- numerals toggle
  const label0 = $('toggleNums').textContent; $('toggleNums').click();
  check('numerals toggle changes label', $('toggleNums').textContent !== label0);
  $('toggleNums').click();

  // --- layout
  check('no horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
    [document.documentElement.scrollWidth, document.documentElement.clientWidth]);

  return { passed: failed.length === 0, failed, details };
}
