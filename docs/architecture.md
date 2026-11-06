# Architecture

A static, build-less website of educational math games for primary-school children (about 6–9 years old), in
Arabic (RTL). The teacher, Mr. Ismail Mostafa Amer, runs the games on a classroom screen: students take turns
answering questions and a leaderboard tracks the results. Everything runs in the browser; data lives in
`localStorage`. There is no backend, no bundler and no package manager.

## Files

```
index.html          Landing page: sea map with one island per game, "try it yourself" demo, example podium.
                    Own design and inline CSS (see landing-page.md).
credits.html        Attribution (animated emoji, icons, fonts), linked from the landing footer.
tokens.css          Design tokens (colours, fonts, spacing) shared by the landing page and all games.
style.css           Shared look for all game pages, built on tokens.css (see design-system.md).
common.js           Shared globals/helpers: students, results, timer, persistence, export/import, speech.
game-shell.js       Page chrome + game lifecycle. Games plug into it with GameShell.mount().
pages/<game>.html   One file per game: only its CSS, settings controls and question logic.
imgs/               Banners and currency images; imgs/emoji/ = animated emoji (landing page and games).
js/                 sfx.js and animated-emoji.js (landing + games, loaded by the shell), home-demo.js (landing only).
vendor/             lottie_light.min.js and phosphor/ (icon font) — local copies, no CDN.
favicon.svg         Site icon (linked by the shell, index.html and credits.html).
docs/               This documentation.
tools/serve.py      Dev server with caching disabled.
tools/check-landing.js   Browser check of the landing page (responsive audit + behaviour + sounds).
tools/check-games.js     Browser check of EVERY game in pages/ (7 viewports, states, standard scenario, shell behaviour).
tools/lib/cdp.js         Shared headless-Chrome helpers for the two checks.
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

Game pages: `canvas-confetti@1.6.0`, `xlsx@0.18.5` and the Google Fonts Baloo Bhaijaan 2 + Alexandria (all loaded by the
shell), ElevenLabs text-to-speech API (called from `common.js`). Landing page: the same Google Fonts only.
Icons (Phosphor), animated emoji and lottie are local files; sound effects are synthesized (no network).

## Conventions

- All UI text is Arabic; code, comments for AI-facing docs and commit messages may be English.
- A new game is a new file in `pages/` plus an island on the map in `index.html` — use the `new-game` skill. The game
  gets the site design from the shell + `style.css` automatically; it only sets its accent colour and emoji.
- Verify UI changes in a real browser — use the `verify-game` skill, `node tools/check-games.js` and [testing.md](testing.md).
