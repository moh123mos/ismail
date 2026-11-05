# common.js — shared globals and helpers

`common.js` is a classic script: everything is a global. It is loaded **before** `game-shell.js` and is also used
directly by the game pages. Source of truth: [common.js](../common.js). Only the functions listed here exist —
do not call or invent others (for example there is no `shuffle`, `saveToStorage` or `playCorrectSound`).

Most game code should go through [GameShell](game-shell-api.md) instead of calling the student/result functions
directly.

## Global state

| Name | Meaning |
|---|---|
| `students` | `string[]` of student names, in rotation order. |
| `results` | `{ [name]: { ok, bad, time, avatar? } }` — correct count, wrong count, total seconds, optional avatar URL. |
| `currentStudent` | Name of the student whose turn it is, or `null`. |
| `gameStarted` / `answered` | Round flags. `answered` is reset by the shell for each round. |
| `correctAnsGlobal` | The current question's correct answer (set from `buildQuestion().answer`). |
| `useArabicIndic` | `true` (default) → numerals display as ٠١٢٣ (the UI calls these "هندية"); `false` → 0123 ("عربية"). |
| `soundOn` | Speech enabled. |
| `timerDuration`, `currentTimeLeft`, `questionStartTime` | Timer internals; `questionStartTime` (ms) is set by `startTimer` and used to compute the answer time. |
| `praisePhrases`, `negativePhrases` | Message templates containing `{name}`. |

## Numbers

- `toArabicNumber(n)` → string; converts digits to ٠١٢٣ when `useArabicIndic` is true, otherwise returns `String(n)`.
- `parseDisplayedNumber(text)` → integer parsed from text that may contain either numeral set.
- `rnd(min, max)` → random integer, both ends inclusive.
- `fingerprint(obj)` → base64 string of the JSON of `obj` (for the used-questions stores).
- `getRandomColors(n)` → `n` shuffled colour strings.

## Timer

- `startTimer(callback)` → counts down from `#timerInput`'s value in 0.1 s steps, writes `#timerDisplay`, sets
  `questionStartTime`, and calls `callback()` when it reaches 0. **Always pass a callback** — without one, a
  timeout silently does nothing.
- `stopTimer()`.

## Persistence

- `saveToLocalStorage(studentsKey, resultsKey)` / `loadFromLocalStorage(studentsKey, resultsKey)` — save/load
  `students` and `results` (load also rebuilds `#studentSelect`). Both keys are required; passing none writes
  under the key `"undefined"`. The shell wraps them as the globals `saveData()` / `loadData()`.

## Students and results (all take an optional `saveCallback` run after a successful change)

- `addStudent(saveCb)`, `deleteStudent(saveCb)`, `deleteAllStudents(saveCb)` — read/write `#newStudent` and `#studentSelect`.
- `pickNextStudent()` — advances `currentStudent` (round-robin), updates `#studentSelect`, creates an empty result
  entry if missing. **Returns nothing.**
- `getSortedResultsArray()` → `[{name, ok, bad, time (string, 2 decimals), score}]` sorted by
  `score = ok − 0.5·bad`, then time, then name.
- `updateResultsTable()` — re-renders `#resultsTable tbody` (gold/silver/bronze rows, medals, optional avatars).
- `resetAllResults(saveCb)` — confirms, then zeroes every result.
- `exportResultsToExcel(filename)` / `importResultsFromFile(eventOrFile, saveCb)` — need the XLSX library
  (the shell loads it). Import **replaces** all students and results.
- `showWinnersBanner(top3)` / `hideBanner()` — the modal in `#resultsBanner` + `#bannerOverlay`.

## Speech

- `speak(text, voiceId?)` — plays `text` through ElevenLabs text-to-speech if `soundOn`; needs a network and
  `<audio id="player">`. `generateVoice(text, voiceId)` is the underlying call. See [known-issues.md](known-issues.md)
  about the API key.
