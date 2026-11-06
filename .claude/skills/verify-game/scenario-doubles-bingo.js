async () => {
  // Scenario for the CUSTOM-INTERACTION game doubles-bingo (board of cards; newRound/finishRound style).
  // Named scenario-<game-id>.js so tools/check-games.js picks it up. Run on a freshly loaded page with an EMPTY localStorage.
  // Returns { passed, failed[], details }.
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const $ = id => document.getElementById(id);
  soundOn = false;

  const failed = [];
  const check = (name, cond, info) => { if (!cond) failed.push(info === undefined ? name : `${name} — ${JSON.stringify(info)}`); };
  const vis = id => getComputedStyle($(id)).display !== 'none';
  const addStudentUI = async n => { $('newStudent').value = n; $('addStudent').click(); await sleep(50); };
  const resultsOf = n => (results[n] ? [results[n].ok, results[n].bad] : null);
  const claimed = () => document.querySelectorAll('.tile.is-claimed').length;
  const freeTile = () => document.querySelector('.tile:not(.is-claimed)');
  const choices = () => [...document.querySelectorAll('#choices .choice')];
  const start = async (student, seconds) => { $('studentSelect').value = student; $('timerInput').value = seconds || 40; $('startBtn').click(); await sleep(250); };
  // open a free card, and answer it right (true) or wrong (false), whatever its kind (multiple choice or teacher-judged)
  const play = async right => {
    freeTile().click(); await sleep(200);
    const cs = choices();
    if (cs.length) (right ? cs.find(b => b._value === correctAnsGlobal) : cs.find(b => b._value !== correctAnsGlobal)).click();
    else (right ? $('judgeOk') : $('judgeBad')).click();
    await sleep(250);
  };

  // 3 x 3 board keeps the scenario short
  $('boardSize').value = '3'; $('boardSize').dispatchEvent(new Event('change'));
  await sleep(100);
  check('board: nine cards', document.querySelectorAll('.tile').length === 9, document.querySelectorAll('.tile').length);
  await addStudentUI('أحمد'); await addStudentUI('سارة');

  // --- start: the board waits for a pick
  await start('أحمد');
  check('start: start hidden, regenerate shown', !vis('startBtn') && vis('regenerateBtn'));
  check('start: asks to pick a card', $('problem').textContent.includes('اختر بطاقة'), $('problem').textContent);
  check('start: no choices yet', choices().length === 0);
  freeTile().click(); await sleep(200);
  check('pick: a question appears', $('problem').textContent.trim().length > 10 && active !== null, $('problem').textContent);
  check('pick: question kind chip shown', !!document.querySelector('#problem .kind-chip'));
  check('pick: the card is highlighted', document.querySelectorAll('.tile.is-active').length === 1);
  const hasChoices = choices().length > 0;
  check('pick: choices or teacher judge shown', hasChoices ? choices().length >= 2 : vis('judge'));
  // --- correct => the card is won by the student
  if (hasChoices) choices().find(b => b._value === correctAnsGlobal).click(); else $('judgeOk').click();
  await sleep(250);
  check('correct: ✅ message', $('status').textContent.includes('✅') || $('status').textContent.includes('🎉'), $('status').textContent);
  check('correct: ok=1', JSON.stringify(resultsOf('أحمد')) === '[1,0]', resultsOf('أحمد'));
  check('correct: the card now belongs to أحمد', claimed() === 1 && document.querySelector('.tile.is-claimed').textContent.includes('أحمد'), document.querySelector('.tile.is-claimed') && document.querySelector('.tile.is-claimed').textContent);
  check('correct: choices locked', choices().every(b => b.disabled));
  check('correct: next student selected, start back', $('studentSelect').value === 'سارة' && vis('startBtn'), $('studentSelect').value);

  // --- wrong => no card, bad+1
  await start('سارة'); await play(false);
  check('wrong: ❌ message', $('status').textContent.includes('❌'), $('status').textContent);
  check('wrong: bad=1', JSON.stringify(resultsOf('سارة')) === '[0,1]', resultsOf('سارة'));
  check('wrong: no new card claimed', claimed() === 1, claimed());

  // --- timeout without picking => wrong
  const badBefore = results['أحمد'].bad;
  await start('أحمد', 1); await sleep(1700);
  check('timeout: counted as wrong', results['أحمد'].bad === badBefore + 1, resultsOf('أحمد'));
  check('timeout: round ended', vis('startBtn') && !vis('regenerateBtn'));

  // --- practice (regenerate): not counted, no card won
  const snap = JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]), claimedBefore = claimed();
  await start('أحمد');
  $('regenerateBtn').click(); await sleep(250);
  await play(true);
  check('practice: not counted', JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]) === snap, [resultsOf('أحمد'), resultsOf('سارة')]);
  check('practice: no card won', claimed() === claimedBefore, claimed());
  check('practice: 🔁 message', $('status').textContent.includes('🔁'), $('status').textContent);

  // --- numerals toggle keeps an open question
  await start('سارة');
  freeTile().click(); await sleep(200);
  const before = $('problem').textContent;
  $('toggleNums').click(); await sleep(150);
  check('numerals toggle: the open question stays', active !== null && $('problem').textContent.trim().length > 0);
  $('toggleNums').click(); await sleep(100);
  check('numerals toggle back: same text', $('problem').textContent === before);
  if (choices().length) choices().find(b => b._value === correctAnsGlobal).click(); else $('judgeOk').click();
  await sleep(250);

  // --- fill the board with right answers: bingo + a fresh board
  let sawBingo = false, rounds = 0;
  while (document.querySelectorAll('.tile:not(.is-claimed)').length && rounds++ < 12) {
    await start(rounds % 2 ? 'أحمد' : 'سارة'); await play(true);
    if ($('status').textContent.includes('بينجو')) sawBingo = true;
  }
  check('full board: message about the finished board', $('status').textContent.includes('اكتملت اللوحة'), $('status').textContent);
  check('bingo: a complete line was announced', sawBingo);
  check('bingo: complete line highlighted', document.querySelectorAll('.tile.is-bingo').length >= 3, document.querySelectorAll('.tile.is-bingo').length);
  await start('أحمد');
  check('next round after a full board: new board', document.querySelectorAll('.tile.is-claimed').length === 0 && document.querySelectorAll('.tile').length === 9);
  $('regenerateBtn').click(); await sleep(200); await play(true);

  // --- random pick mode opens a card by itself
  $('pickMode').value = 'random';
  await start('سارة'); await sleep(2600);
  check('random: a card was opened', active !== null && $('problem').textContent.trim().length > 10, $('problem').textContent);
  if (choices().length) choices().find(b => b._value === correctAnsGlobal).click(); else $('judgeOk').click();
  await sleep(250);

  // --- persistence + layout
  const resKeys = Object.keys(localStorage).filter(k => k.endsWith('_results'));
  check('results persisted', resKeys.length === 1 && JSON.parse(localStorage.getItem(resKeys[0]))['أحمد'].ok >= 1, resKeys);
  check('no horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

  return { passed: failed.length === 0, failed, details: { storageKey: resKeys[0], rounds } };
}
