---
name: verify-game
description: Run a game page of this math-games platform in a real browser and check it with the standard scenario (start, correct, wrong, timeout, practice question, persistence, results table, winners banner, numerals toggle, mobile overflow). Use after creating or changing any file in pages/, game-shell.js, common.js or style.css, and whenever the user asks to test, verify or check a game.
---

# verify-game

Verifies a game in a real browser through the chrome-devtools MCP tools. Background: [docs/testing.md](../../../docs/testing.md).
Do not claim a UI change works without running this.

## Steps

1. **Serve the site** (skip if already running on 8123): run `python tools/serve.py` in the background.
   It disables caching — a normal static server can show a stale page from the browser cache.
2. **Open the page with a clean state.** Use `new_page` / `navigate_page` to
   `http://127.0.0.1:8123/pages/<game>.html`, then `navigate_page` with `type: "reload"`, `ignoreCache: true`,
   `initScript: "try{localStorage.clear()}catch(e){}"` and `timeout: 60000` (CDN libraries make first loads slow).
   Confirm the page really is the new version (e.g. `typeof GameShell` is `"object"`).
3. **Pick the scenario:**
   - Multiple-choice game (`buildQuestion`): `scenario-choice.js` in this folder.
   - Custom-interaction game (`newRound`/`finishRound`): copy `scenario-money.js`, replace the widget-driving
     parts for the game at hand, and keep the same checks. Save the adapted copy in the scratchpad, not in the repo,
     unless the user asks otherwise.
4. **Run it:** `evaluate_script` with `sourcePath` = the absolute path of the scenario file (and `dialogAction: "accept"`).
   It returns `{ passed, failed[], details }`. Any entry in `failed` is a real problem to fix or explain.
5. **Console and network:** `list_console_messages` with types `error`/`warn` must be empty, and no request may fail
   — check with `evaluate_script`: `performance.getEntriesByType('resource').filter(r => r.responseStatus >= 400)`.
   Also check the Cairo font loaded (`[...document.fonts].some(f => f.family.includes('Cairo') && f.status === 'loaded')`).
   Anything else is a finding (see [docs/known-issues.md](../../../docs/known-issues.md) for open issues).
   If a `confirm`/`alert` dialog is left open, `handle_dialog` before continuing.
6. **Look at it:** `resize_page` to 1280×900 and take a full-page screenshot; then 390×800 and check for overflow
   (the scenario already checks horizontal scrolling) and that widgets are usable. Read the screenshot.
7. **Game-specific checks** the scenario cannot know about: its own settings (each option changes the generated
   questions), edge cases (nothing selected, extreme values), and the numerals toggle on the question text.
8. **Report** what was run and the result: passed/failed checks, console errors, screenshots reviewed. If something
   failed, say so plainly with the failing check — do not report success.

## Notes

- The scenarios turn sound off (`soundOn = false`) so no ElevenLabs requests are made.
- They create students "أحمد" and "سارة" in the page's `localStorage`; clean state is required (step 2).
- Choice buttons carry the underlying value in the JS property `btn._value` (set by the shell).
- After a deliberate behaviour change in the shell, expect the scenario's assertions to need updating — update
  the scenario and [docs/testing.md](../../../docs/testing.md) together with the change.
