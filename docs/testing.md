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

## All games at once: `tools/check-games.js`

```
python tools/serve.py                                    # terminal 1
node tools/check-games.js [baseUrl] [outDir] [--only=<game-id>]   # terminal 2
```

Needs Node 22+ and Chrome; no packages. It **discovers every `pages/*.html`** (so a new game is covered automatically) and
for each game checks: seven viewports (no horizontal scroll, nothing off-screen, touch targets ≥ 44 px, text ≥ 14 px,
fonts and icons loaded, no failed requests, no console errors); screenshots of the real states (idle, question, right,
wrong, winners dialog) on a laptop and a phone; the standard scenario (`scenario-choice.js` for multiple-choice games,
`scenario-<game-id>.js` for a custom game, or a generic start → timeout smoke test if none exists yet); and the shell
behaviour (number keys, sounds locked before a real click and playing after it, mute + persistence, animated emoji,
credits link). Exit code 1 on any failure. **Open the screenshots (outDir) and look** — numbers do not catch everything.
Speech requests to ElevenLabs are blocked during the run. Use the `verify-game` skill for a deeper look at one game.

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

Same checks, but drive the game's own widgets (see `.claude/skills/verify-game/scenario-counting-money.js`, `scenario-doubles-bingo.js` (card board, teacher-judged cards, bingo line, random pick) and `scenario-robot-rescue.js` (dice, challenge / surprise / mission cards, rescue); name a new one
`scenario-<game-id>.js` and `check-games.js` runs it).

## Landing page (`index.html`)

```
python tools/serve.py                       # terminal 1
node tools/check-landing.js [baseUrl] [outDir]    # terminal 2 — baseUrl defaults to http://127.0.0.1:8123
```

Needs Node 22+ and Chrome (set `CHROME=` if it is not in a default path); no packages. It audits seven viewports
(phones, tablets in both orientations, laptop, 1080p projector) for horizontal scroll, off-screen elements, touch
targets < 44 px and text < 14 px, saves a full-page screenshot per viewport, then checks the behaviour: sounds
(silent before the first gesture, island hover/boat, quiz win/lose/timeout, mute switch and persistence), the quiz
(timer, wrong/right/timeout/keyboard), podium counters, island click navigation and console errors. Exit code 1
means something failed. Look at the screenshots too — numbers do not catch everything (an entrance animation left
transparent, for example). Details and the checklist are in [landing-page.md](landing-page.md).

## Tips

- Turn sound off in tests (`soundOn = false`) so speech does not call the ElevenLabs API (note: the switch is stored in
  `localStorage["home_sfx"]`; clear it between runs). Sound effects are synthesized and silent until a real click.
- Start each run from a clean `localStorage` (clear it, then reload).
- Page state is in globals; scripts evaluated in the page can read `students`, `results`, `currentStudent`,
  `correctAnsGlobal`, `gameStarted`, `answered`.
- Choice buttons expose the underlying value as the JS property `btn._value`; evaluating scripts can use it to
  find the correct button (`correctAnsGlobal`).
- Check a 390 px wide viewport: no horizontal scrolling.
