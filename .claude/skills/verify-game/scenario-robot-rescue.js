async () => {
  // Scenario for the CUSTOM-INTERACTION game robot-rescue (dice + cards + a shared track; newRound/finishRound style).
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
  const choices = () => [...document.querySelectorAll('#choices .choice')];
  const waitFor = async (cond, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { if (cond()) return true; await sleep(100); } return false; };
  const start = async (student, seconds) => { $('studentSelect').value = student; $('timerInput').value = seconds || 45; $('startBtn').click(); await sleep(250); };
  const only = cards => { deckKey = [...enabledTypes()].sort().join(); deck = cards.slice().reverse(); };   // the first card of the list is drawn first
  const challenge = (i) => MASTER.filter(c => c.type === 'challenge')[i];
  const surprise = MASTER.find(c => c.type === 'surprise' && c.reward === 2);
  const mission = MASTER.filter(c => c.type === 'mission')[2];   // reward 2, penalty -1
  const rollAndWait = async () => { $('rollBtn').click(); return waitFor(() => phase === 'card'); };

  await addStudentUI('أحمد'); await addStudentUI('سارة');
  check('track drawn: 25 stones and the crew', document.querySelectorAll('.stone').length === 25 && !!$('crew'), document.querySelectorAll('.stone').length);
  check('before start: roll disabled', $('rollBtn').disabled);

  // --- challenge answered right: the crew moves by the dice, then by the reward
  only([challenge(0)]);
  await start('أحمد');
  check('start: start hidden, regenerate shown', !vis('startBtn') && vis('regenerateBtn'));
  check('start: roll enabled, asks to roll', !$('rollBtn').disabled && $('problem').textContent.includes('ارمِ النرد'), $('problem').textContent);
  check('start: timer shows a value', /[0-9٠-٩]/.test($('timerDisplay').textContent));
  const reached = await rollAndWait();
  check('roll: a card appears', reached && choices().length === 4, choices().length);
  check('roll: the crew moved by the dice (1-4)', pos >= 1 && pos <= 4, pos);
  const afterDice = pos;
  choices().find(b => b._value === correctAnsGlobal).click();
  await sleep(300);
  check('correct: ✅ message', $('status').textContent.includes('✅'), $('status').textContent);
  check('correct: ok=1', JSON.stringify(resultsOf('أحمد')) === '[1,0]', resultsOf('أحمد'));
  check('correct: right choice marked, all locked', choices().filter(b => b.classList.contains('correct')).length === 1 && choices().every(b => b.disabled));
  await sleep(700);
  check('correct: the crew advanced by the reward', pos === afterDice + challenge(0).reward, [afterDice, pos]);
  await sleep(1500);
  check('correct: next student selected, start back', $('studentSelect').value === 'سارة' && vis('startBtn'), $('studentSelect').value);

  // --- wrong with a penalty card: the crew steps back
  only([challenge(3)]);   // penalty -1
  await start('سارة'); await rollAndWait();
  const beforeWrong = pos;
  choices().find(b => b._value !== correctAnsGlobal).click();
  await sleep(1000);
  check('wrong: ❌ message mentions the step back', $('status').textContent.includes('❌') && $('status').textContent.includes('تتراجع'), $('status').textContent);
  check('wrong: bad=1', JSON.stringify(resultsOf('سارة')) === '[0,1]', resultsOf('سارة'));
  check('wrong: the crew stepped back', pos === beforeWrong - 1, [beforeWrong, pos]);
  await sleep(1500);

  // --- timeout without rolling => wrong
  const badBefore = results['أحمد'].bad;
  await start('أحمد', 1); await sleep(1700);
  check('timeout: counted as wrong', results['أحمد'].bad === badBefore + 1, resultsOf('أحمد'));
  await sleep(1200);   // the next-student hand-over waits 1.8 s after the answer so the result stays visible
  check('timeout: round ended, roll disabled', vis('startBtn') && !vis('regenerateBtn') && $('rollBtn').disabled);
  await sleep(1500);

  // --- team mission: the teacher judges
  only([mission]);
  await start('سارة'); await rollAndWait();
  check('mission: judge buttons shown, no choices', vis('judge') && choices().length === 0);
  $('judgeBad').click(); await sleep(300);
  check('mission: ❌ and bad+1', $('status').textContent.includes('❌') && results['سارة'].bad === 2, [$('status').textContent, resultsOf('سارة')]);
  await sleep(2000);

  // --- surprise: claim it, the crew jumps, then the next card comes
  only([surprise, challenge(1)]);
  await start('أحمد');
  $('rollBtn').click();
  const sawClaim = await waitFor(() => !$('claimBtn').hidden);
  check('surprise: claim button shown', sawClaim);
  check('surprise: nothing scored yet', JSON.stringify(resultsOf('أحمد')) === `[1,${results['أحمد'].bad}]`);
  const beforeSurprise = pos;
  $('claimBtn').click();
  const next = await waitFor(() => phase === 'card');
  check('surprise: then a scored card is drawn', next && choices().length === 4);
  check('surprise: the crew advanced (reward 2, or to the end)', pos === Math.min(24, beforeSurprise + 2), [beforeSurprise, pos]);
  choices().find(b => b._value === correctAnsGlobal).click(); await sleep(2800);

  // --- reaching the robot: celebration, counted as a success, the track starts over
  only([challenge(0)]);
  pos = 23; placeCrew();
  const okBefore = results['سارة'].ok;
  await start('سارة'); $('rollBtn').click();
  await waitFor(() => $('status').textContent.includes('🎉'), 6000);
  check('rescue: celebration message', $('status').textContent.includes('أنقذ') || $('status').textContent.includes('وصلنا'), $('status').textContent);
  check('rescue: counted as correct', results['سارة'].ok === okBefore + 1, resultsOf('سارة'));
  await sleep(3200);
  check('rescue: the track starts over', pos === 0, pos);
  check('rescue: next student can start', vis('startBtn'));

  // --- practice (regenerate): not counted, the crew does not move
  const snap = JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]);
  only([challenge(0), challenge(1)]);
  await start('أحمد');
  $('regenerateBtn').click(); await sleep(250);
  const posBefore = pos;
  await rollAndWait();
  check('practice: the crew stays', pos === posBefore, [posBefore, pos]);
  choices().find(b => b._value === correctAnsGlobal).click(); await sleep(400);
  check('practice: not counted', JSON.stringify([resultsOf('أحمد'), resultsOf('سارة')]) === snap, resultsOf('أحمد'));
  check('practice: 🔁 message', $('status').textContent.includes('🔁'), $('status').textContent);
  await sleep(2000);

  // --- numerals toggle keeps the open card
  only([challenge(1)]);
  await start('سارة'); await rollAndWait();
  const text0 = $('problem').textContent;
  $('toggleNums').click(); await sleep(150);
  check('numerals toggle: card and choices stay', $('problem').textContent.trim().length > 0 && choices().length === 4 && $('problem').textContent !== text0);
  $('toggleNums').click(); await sleep(100);
  choices().find(b => b._value === correctAnsGlobal).click(); await sleep(2300);

  // --- persistence + layout
  const resKeys = Object.keys(localStorage).filter(k => k.endsWith('_results'));
  check('results persisted', resKeys.length === 1 && JSON.parse(localStorage.getItem(resKeys[0]))['أحمد'].ok >= 1, resKeys);
  check('no horizontal overflow', document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);

  return { passed: failed.length === 0, failed, details: { storageKey: resKeys[0] } };
}
