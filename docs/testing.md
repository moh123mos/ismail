# Testing

There is no test runner and no package manager. Games are verified in a real browser by driving the page with
a scripted scenario and reading back the state. The `verify-game` skill (`.claude/skills/verify-game/`) automates
this and contains the scenario scripts.

## Run the site

```
python tools/serve.py          # http://127.0.0.1:8123/  — caching disabled
```

Use this server (not just any static server): browsers cache old HTML/JS heuristically and will happily show
the pre-edit version of a page. After changing a file, load the page again with the cache bypassed (hard reload).
Opening `file://` URLs does not work reliably for these pages — use the server.

The pages load libraries from CDNs, so a first load can take several seconds; allow a generous navigation timeout.

## What a scenario checks (choice games)

1. Page loads with no console errors and no failed requests (there are no accepted exceptions).
2. Add two students through the UI.
3. Start → a question and choices appear; the start button hides and "regenerate" shows.
4. Correct answer → status starts with ✅ and mentions the student, correct choice marked, all choices
   disabled, `ok` incremented, next student selected, start button back.
5. Wrong answer → ❌, `bad` incremented.
6. Timeout (set the timer to 1 s) → counted as wrong.
7. Regenerate then answer → not counted (🔁 message).
8. Results persisted in `localStorage` under `<storagePrefix>_results`, and the results table matches.

## Custom-interaction games

Same checks, but drive the game's own widgets (see `.claude/skills/verify-game/scenario-money.js`).

## Tips

- Turn sound off in tests (`soundOn = false`) so speech does not call the ElevenLabs API.
- Start each run from a clean `localStorage` (clear it, then reload).
- Page state is in globals; scripts evaluated in the page can read `students`, `results`, `currentStudent`,
  `correctAnsGlobal`, `gameStarted`, `answered`.
- Choice buttons expose the underlying value as the JS property `btn._value`; evaluating scripts can use it to
  find the correct button (`correctAnsGlobal`).
- Check a 390 px wide viewport: no horizontal scrolling.
