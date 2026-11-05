# Architecture

A static, build-less website of educational math games for primary-school children (about 6–9 years old), in
Arabic (RTL). The teacher, Mr. Ismail Mostafa Amer, runs the games on a classroom screen: students take turns
answering questions and a leaderboard tracks the results. Everything runs in the browser; data lives in
`localStorage`. There is no backend, no bundler and no package manager.

## Files

```
index.html          Landing page: hero, one card per game, features. Self-contained (own inline CSS).
style.css           Shared look for all game pages (see design-system.md).
common.js           Shared globals/helpers: students, results, timer, persistence, export/import, speech.
game-shell.js       Page chrome + game lifecycle. Games plug into it with GameShell.mount().
pages/<game>.html   One file per game: only its CSS, settings controls and question logic.
imgs/               Banners and currency images.
favicon.svg         Site icon (linked by the shell and index.html).
docs/               This documentation.
tools/serve.py      Dev server with caching disabled.
.claude/skills/     Project skills: new-game, verify-game.
```

Script order on a game page: `common.js` → `game-shell.js` → inline script calling `GameShell.mount(...)`.

## Layers

1. **common.js** — low-level globals and helpers ([common-js-api.md](common-js-api.md)).
2. **game-shell.js** — builds the page, wires every standard control, runs a round
   (`start → question → answer/timeout → score → next student`) ([game-shell-api.md](game-shell-api.md)).
3. **A game page** — supplies settings markup and either `buildQuestion` (multiple choice) or
   `newRound` (custom interaction).

Why a JS-built shell instead of copying the HTML into every page: the page chrome and the round lifecycle were
once copied into every game and drifted apart (different bugs per page). One implementation means one fix.

## Data model (localStorage)

- `<storagePrefix>_students` → `string[]`
- `<storagePrefix>_results` → `{ [student]: { ok, bad, time, avatar? } }`
- Optional per-game "used questions" list (`GameShell.createUsedStore(key)`).

Existing prefixes (do not rename — it would orphan saved data): `equations`, `add_minus` (math-operations),
`mul_game` (multi-tables), `counting_money`.

Ranking: `score = ok − 0.5 × bad`; ties broken by lower total time, then name.

## Games

| Page | Style | Notes |
|---|---|---|
| `equations.html` | multiple choice | Solve equations or classify equation vs. algebraic expression; persistent used-questions store. |
| `math-operations.html` | multiple choice | Add/subtract with/without carrying; vertical or horizontal layout. |
| `multi-tables.html` | multiple choice | Pick multiplication tables 2–12 or 1×2 / 2×2 digit modes. |
| `counting-money.html` | custom interaction | Tap Saudi riyal notes/coins to reach a target amount. |

Files starting with a dot in `pages/` (e.g. `.counting-money-old.html`) are archived drafts, git-ignored by
`*old.html`; do not edit or link them.

## External dependencies (CDN)

`canvas-confetti@1.6.0`, `xlsx@0.18.5` and the Google Font Cairo (loaded by the shell; `index.html` links the font itself),
ElevenLabs text-to-speech API (called from `common.js`).

## Conventions

- All UI text is Arabic; code, comments for AI-facing docs and commit messages may be English.
- A new game is a new file in `pages/` plus a card in `index.html` — use the `new-game` skill.
- Verify UI changes in a real browser — use the `verify-game` skill and [testing.md](testing.md).
