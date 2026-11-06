# Math games platform (Mr. Ismail Mostafa Amer)

Static, build-less website of educational math games for primary-school children. Arabic UI, RTL. Teacher runs it
on a classroom screen; students take turns; results are kept in `localStorage`. No backend, no bundler, no
package manager (do not add one unless asked).

## Run and verify

- Serve: `python tools/serve.py` → http://127.0.0.1:8123/ (caching disabled; plain static servers can show stale pages).
- Verify UI changes in a real browser, not by reading code: use the **verify-game** skill (see [docs/testing.md](docs/testing.md)).
  For `index.html` run `node tools/check-landing.js`; for all games run `node tools/check-games.js` (both need the dev server and Chrome;
  they save screenshots — look at them).
- After editing, reload with the cache bypassed. Pages pull libraries from CDNs, so allow ~15 s for a first load.

## Map

- `index.html` — landing page: an illustrated sea map with one island per game, a live "try it yourself" question,
  an example podium and sound effects. Inline component CSS (it does not use `style.css`); see [docs/landing-page.md](docs/landing-page.md).
- `credits.html` — attribution for the animated emoji / icons (linked from the landing footer; keep that link).
- `tokens.css` — the design tokens (colours, fonts, spacing) shared by the landing page and every game: the "sea map" look.
- `js/` (`sfx.js`, `animated-emoji.js` for landing + games; `home-demo.js` landing only), `vendor/` (lottie, Phosphor icons), `imgs/emoji/*.json` (animated emoji).
- `style.css` — shared styles for game pages (built on `tokens.css`). `common.js` — shared globals/helpers. `game-shell.js` — page chrome + game lifecycle.
- `pages/*.html` — one file per game. Ignore files starting with a dot (archived drafts).
- `docs/` — read what you need: [architecture](docs/architecture.md) · [GameShell contract](docs/game-shell-api.md) · [common.js API](docs/common-js-api.md) · [design system](docs/design-system.md) · [landing page](docs/landing-page.md) · [testing](docs/testing.md) · [known issues](docs/known-issues.md).
- `tools/` — `serve.py` (dev server), `check-landing.js` (landing page: 7 viewports, sounds, quiz), `check-games.js` (every game in `pages/`: 7 viewports, states, scenario, shell behaviour).

## Rules

1. **A game page contains only game-specific code** (its CSS, settings controls, question logic) and plugs into `GameShell.mount()`.
   Never copy page chrome, student handling, timer, scoring, results, export/import or the winners banner into a game.
2. **Use only functions that exist.** Check [docs/common-js-api.md](docs/common-js-api.md) / `common.js` before calling a helper — do not invent names.
3. **Don't let games drift.** Behaviour shared by games (highlighting, scoring, timeout, confetti…) lives in `game-shell.js`;
   change it there so every game gets it. A difference between games must be a deliberate feature.
4. **All user-facing text is Arabic.** Render numbers with `toArabicNumber(n)` so the numerals toggle works.
5. **Never change an existing game's `storagePrefix`** — it would orphan the teacher's saved students and results.
6. **Shared CSS goes in `style.css`**; do not redefine shared classes in a page. A game's own CSS uses the design tokens (no hard-coded colours),
   sets its accent `--game` (its island's colour), has no inline font sizes or body background, and every game sets `emoji` in `mount` (same as its island).
7. **No secrets in the repo.** (Known exception: the ElevenLabs key already in `common.js` — see known-issues; don't spread it.)
8. Libraries (confetti, XLSX) are loaded by the shell; don't add `<script>` tags for them in games.
9. Keep docs in sync: if you change the shell's or common.js's behaviour or API, update the matching file in `docs/` in the same change.
   Likewise for the landing page: changes to its structure, sounds, quiz or island recipe go in [docs/landing-page.md](docs/landing-page.md).
10. The site-wide sound switch (landing and games) stores `localStorage["home_sfx"]` — don't reuse that key; the animated-emoji
    credit link ("الشكر والتراخيص" → `credits.html`) in the landing footer and in every game footer must stay (CC BY 4.0).

## Skills

- **new-game** — turn a prepared HTML game (any shape) into a platform-compliant page and add it to the index.
- **verify-game** — run a game in a browser and check the standard scenario (and look at it).

## Notes

- Every game has `#startBtn`, `#studentSelect`, etc. created by the shell; see the id list in [docs/game-shell-api.md](docs/game-shell-api.md).
- The owner works on Windows; shell commands run in Git Bash / PowerShell.
