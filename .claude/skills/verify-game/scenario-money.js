async () => {
  // Reference scenario for a CUSTOM-INTERACTION game (newRound/finishRound style): counting-money.
  // Copy and adapt it for other custom games: replace the widget-driving parts, keep the structure and checks.
  // Run on a freshly loaded page with an EMPTY localStorage. Returns { passed, failed[], details }.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  soundOn = false;

  const failed = [];
  const check = (name, cond, info) => { if (!cond) failed.push(info === undefined ? name : `${name} — ${JSON.stringify(info)}`); };
  const vis = id => getComputedStyle($(id)).display !== 'none';
  const bill = v => document.querySelector(`.currency-item[data-val="${v}"]`);
  const addStudentUI = async n => { $('newStudent').value = n; $('addStudent').click(); await sleep(50); };
  const resultsOf = n => (results[n] ? [results[n].ok, results[n].bad] : null);

  await addStudentUI('أحمد'); await addStudentUI('سارة');

  // --- exact amount => correct
  $('studentSelect').value = 'أحمد'; $('timerInput').value = 20;
  $('startBtn').click(); await sleep(300);
  check('start: start hidden, regenerate shown', !vis('startBtn') && vis('regenerateBtn'));
  check('start: target shown', typeof targetAmount === 'number' && targetAmount >= 5);
  let rest = targetAmount;
  for (const v of [50, 10, 5, 2, 1]) { while (rest >= v) { bill(v).click(); rest -= v; } }
  await sleep(300);
  check('correct: ✅ message', $('status').textContent.includes('✅'), $('status').textContent);
  check('correct: ok=1', JSON.stringify(resultsOf('أحمد')) === '[1,0]', resultsOf('أحمد'));
  check('correct: widgets disabled', [...document.querySelectorAll('.currency-item')].every(i => i.classList.contains('disabled')));
  check('correct: waits before next round', !vis('startBtn'));
  await sleep(2300);
  check('correct: start returns after the delay', vis('startBtn') && $('studentSelect').value === 'سارة', $('studentSelect').value);

  // --- overshoot => wrong
  $('studentSelect').value = 'سارة';
  $('startBtn').click(); await sleep(300);
  while (currentAmount <= targetAmount) bill(50).click();
  await sleep(300);
  check('overshoot: ❌ message', $('status').textContent.includes('❌'), $('status').textContent);
  check('overshoot: bad=1', JSON.stringify(resultsOf('سارة')) === '[0,1]', resultsOf('سارة'));
  await sleep(2300);

  // --- timeout => wrong
  $('studentSelect').value = 'أحمد'; $('timerInput').value = 1;
  $('startBtn').click(); await sleep(1700);
  check('timeout: counted as wrong', resultsOf('أحمد')[1] === 1, resultsOf('أحمد'));
  await sleep(2300);

  // --- persistence
  const resKeys = Object.keys(localStorage).filter(k => k.endsWith('_results'));
  check('results persisted', resKeys.length === 1 && JSON.parse(localStorage.getItem(resKeys[0]))['أحمد'].ok === 1, resKeys);
  check('no horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

  return { passed: failed.length === 0, failed, details: { storageKey: resKeys[0] } };
}
