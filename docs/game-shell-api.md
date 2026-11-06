# GameShell — the platform contract for a game page

`game-shell.js` builds the whole page chrome and runs the game lifecycle. A game page only supplies what is
specific to that game. **Do not re-implement anything listed under "The shell owns".**

Source of truth: [game-shell.js](../game-shell.js). If this document and the code disagree, the code wins — fix the doc.

## Page skeleton

```html
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>…</title>
  <link rel="stylesheet" href="../style.css" />
  <style>/* ONLY this game's CSS: background, question visuals, custom widgets */</style>
</head>
<body>
  <div id="app"></div>
  <script src="../common.js"></script>
  <script src="../game-shell.js"></script>
  <script>
    /* game logic */
    GameShell.mount({ /* config */ });
  </script>
</body>
</html>
```

Do not add `<script>` tags for confetti / XLSX / sounds / animated emoji, a font link or a favicon: the shell loads them.
The page's `<style>` follows the rules in [design-system.md](design-system.md) (tokens, no hard-coded colours, `--game` accent).

## The shell owns (never duplicate in a game)

Fonts (Baloo Bhaijaan 2 + Alexandria) and favicon, the whole page look (sky header with home link, island emoji, H1 and
banner; board; settings and students panels; leaderboard; footer with the credits link), timer input and the draining
timer pill, numerals toggle, sound toggle (voice + sound effects, remembered in `localStorage["home_sfx"]`), student
add/delete/select, start and regenerate buttons, the `#problem` / choices / status / reaction-emoji area, export / import /
reset / finalize buttons, results table (with an empty-state note), winners dialog, `<audio id="player">`, localStorage
persistence, scoring (`ok` / `bad` / `time`), praise and consolation messages (with the student's name), confetti, speech,
sound effects (`go` on start, `win(streak)` / `lose()` on every answer), the animated reaction emoji (🎉 right, 💪 wrong),
number keys 1–9 picking an answer, rotation to the next student, highlighting + locking of the choices, the
"practice question (not counted)" flow, timeout handling.

## `GameShell.mount(config)`

| Field | Type | Meaning |
|---|---|---|
| `id` | string, required | Unique game id. |
| `title` | string, required | `<title>` and fallback H1. |
| `heading` | string | H1 text — plain Arabic name, **no emoji** (the mascot goes in `emoji`). Defaults to `title`. |
| `emoji` | `{code, fallback}` | The game's animated mascot beside the H1: Noto code point (`imgs/emoji/<code>.json` must exist) and a plain-character fallback. Use the same emoji as the game's island on the map (`index.html`). |
| `storagePrefix` | string | localStorage prefix → keys `<prefix>_students`, `<prefix>_results`. Defaults to `id`. **Never change it for an existing game** — it would orphan the teacher's saved students and results. |
| `banner` | `{src, alt}` | The teacher's banner artwork, shown as a framed poster in the header (max height ≈ 26vh, never cropped). Hides itself if the image fails. |
| `settingsHTML` | string | The game's own controls (inputs, selects, `.checkbox-option` groups) inside `.toolbar` blocks. Rendered in the "إعدادات اللعبة" panel, above the shell's question-time input. |
| `gameAreaHTML` | string | Replaces the default `<div class="choices" id="choices">`. Only for custom-interaction games. |
| `intro` | string (HTML) | Shown in `#problem` before the first round (small grey text; the shell removes that style when a round starts). Default: a hint to pick a student. |
| `footerHTML` | string | Replaces the default footer note. The "الشكر والتراخيص" link is always added by the shell and must stay (CC BY 4.0). |
| `timer` | `{value,min,max}` | Defaults `20 / 5 / 90`. |
| `exportFilename` | string | Excel file name. Defaults to `<id>_results.xlsx`. |
| `used` | store | A **persistent** `GameShell.createUsedStore(key)`; adds the "clear used questions" button. |
| `buildQuestion(ctx)` | fn | Multiple-choice games. See below. |
| `newRound(ctx, {counted})` | fn | Custom-interaction games. See below. |
| `onStart(ctx)` | fn | Called when the teacher presses Start. Return `false` to cancel (e.g. after a `confirm`). Typical use: clear a session `used` store. |
| `onNumbersToggle(ctx)` | fn | After Arabic/Hindi numerals were switched. By default a running question is re-rolled so it shows the new numerals; return `false` to prevent that. |
| `onReady(ctx)` | fn | Once, after the markup exists and data was loaded. Wire game-specific widgets here. |

`mount` returns `ctx`.

Element ids the shell creates (game code may read them; a game's own ids must not collide with these):
`timerInput`, `toggleNums`, `toggleSound`, `newStudent`, `addStudent`, `studentSelect`, `deleteStudent`,
`deleteAll`, `startBtn`, `regenerateBtn`, `problem`, `choices` (unless `gameAreaHTML` replaces it), `timerDisplay`,
`status`, `face`, `exportBtn`, `importFile`, `resetResults`, `finalizeResultsBtn`, `clearUsed` (only with `used`),
`resultsTable`, `resultsEmpty`, `bannerOverlay`, `resultsBanner`, `bannerContent`, `player`, and the root `app`.
Show/hide of `#startBtn` / `#regenerateBtn` uses the `hidden` attribute (not `style.display`): test visibility with `getComputedStyle(el).display`.

After `mount`, `GameShell.current` is the same `ctx` (used by `tools/check-games.js`).

## Style A — multiple-choice game (`buildQuestion`)

```js
function buildQuestion(ctx) {
  // read your settings from the DOM, generate a question
  return {
    html: '<div style="font-size:2rem">٣ + ٤ = ?</div>',   // goes into #problem
    choices: [7, 6, 9],            // numbers are shown with toArabicNumber(); strings as-is;
                                   // or objects {value, label} for custom labels
    answer: 7                      // compared with === against the chosen value
  };
  // return null if you cannot build a question (call alert() first to tell the user why)
}
```

- `ctx.counted` is `false` when the teacher pressed "regenerate" (practice question, not scored). Games that
  avoid repeats should only record the question as used when `ctx.counted` is true.
- Build numbers with `toArabicNumber(n)` so they follow the numerals toggle.
- Return only the question content in `html` — the shell sizes `#problem` (no inline `font-size`). Use `.problem-hint` for a small helper line.
- Choice buttons get `data-key` (the number key that picks them) and cycle through the sticker colours automatically.
- The shell starts the timer, checks the answer, colours the right/wrong choice, disables the buttons, scores,
  speaks, shows confetti and moves to the next student. A timeout counts as a wrong answer.
- Examples: [pages/equations.html](../pages/equations.html), [pages/math-operations.html](../pages/math-operations.html), [pages/multi-tables.html](../pages/multi-tables.html).

## Style B — custom-interaction game (`newRound` + `finishRound`)

For games where the student does not pick from choices (e.g. tapping banknotes).

```js
const game = GameShell.mount({
  gameAreaHTML: '…your widgets…',
  newRound(ctx, { counted }) {
    // reset round state, render #problem, enable widgets
    startTimer(() => finish(false, '❌ الوقت انتهى!'));   // common.js timer: callback runs at 0
  },
});

function finish(correct, message) {
  game.finishRound(correct, { counted: roundCounted, message, delay: 2000 });
}
```

`ctx.finishRound(correct, opts)` — scoring + feedback + save + hand over to the next student:

| Option | Default | Meaning |
|---|---|---|
| `counted` | `true` | `false` = practice, not scored. Remember `counted` from `newRound`. |
| `message` | icon + random praise with the student's name | Full status text. Use it to say *why* it was wrong. |
| `speak` | the praise phrase | Text to speak. |
| `face` | 🎉 / 💪 | Reaction emoji (a character; its animation `imgs/emoji/<code>.json` is used when it exists, else the character is shown). |
| `delay` | `0` | ms to wait before the "start" button returns and the next student is selected. |

While a round is running `gameStarted === true && answered === false`; guard widget clicks with that.
Example: [pages/counting-money.html](../pages/counting-money.html).

A custom game may still render its own answer buttons: put `<div class="choices" id="choices"></div>` inside `gameAreaHTML`,
fill it with `<button class="choice" data-key="١">` elements and set `btn._value` — the shared sticker styling, the `.correct` / `.wrong`
classes and the number-key shortcut then work as in a multiple-choice game (see [pages/doubles-bingo.html](../pages/doubles-bingo.html),
[pages/robot-rescue.html](../pages/robot-rescue.html)). Start the timer (`startTimer(cb)`) in `newRound`; a round that ends without a
question must still have a timer running or have set `questionStartTime`, otherwise its elapsed time is wrong.

Custom widgets should be real `<button>`s (keyboard + touch) styled with the design tokens. `ctx.sfx(name, arg)` plays a
sound effect safely (`'pop'`, `'hover'`, `'go'`, `'win'`, `'lose'` — see `js/sfx.js`); the counting game uses `'pop'` per tap.

## The question-type cube

`GameShell.cubeHTML(faces, active)` returns the markup of a decorative 3D cube (six faces, one Phosphor icon each) that rolls
onto face `active`, plus a label chip with that face's title. `faces` is `[{title, icon}]` with exactly six entries (`icon` = Phosphor name
without `ph-`). Put it first in the `html` of a multiple-choice question and pick the question type from `active` — see
[pages/rounding-cube.html](../pages/rounding-cube.html) and [pages/order-cube.html](../pages/order-cube.html). Styles (`.cube-*`,
`.kind-chip`) are in `style.css`; the roll is skipped under `prefers-reduced-motion`.

## Avoiding repeated questions

```js
const used = GameShell.createUsedStore('my_game_used_v1'); // persistent across sessions → also pass as `used:`
const session = GameShell.createUsedStore();               // memory only; call session.clear() in onStart
used.has(fp); used.add(fp); used.clear();
```

Use `fingerprint(obj)` from common.js to make `fp`.

## Settings controls

Wrap settings in `<div class="toolbar">` → `<div class="group">` → `<span class="label">` + control. For
multi-select options use the shared styled checkboxes (the shell keeps the `checked` look in sync):

```html
<label class="checkbox-option checked"><input type="checkbox" name="kind" value="a" checked><span>🔢 …</span></label>
```
