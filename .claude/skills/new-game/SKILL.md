---
name: new-game
description: Add a game to this math-games platform from an HTML file the owner prepared (any shape: a standalone page, a prototype, a single-file game). Reads it for the game-specific parts and builds a NEW page that plugs into GameShell and the platform's shared features instead of copying the file, then adds its island to the sea map in index.html and verifies it. Use when the user attaches or points to an HTML game, or asks to add/create/port a game or page to the platform.
---

# new-game

Input: an HTML game file (path given by the user). Output: `pages/<game-id>.html` built on the platform, plus an island
on the map in `index.html`. **The attached file is source material, not the deliverable** — its shape is unpredictable, so
never drop it into `pages/` as is. Build a clean page that follows the platform.

Read first: [docs/game-shell-api.md](../../../docs/game-shell-api.md) (the contract),
[docs/design-system.md](../../../docs/design-system.md) (the site's "sea map" look: tokens, classes, rules for a game's CSS), and one example game for the style you will use.
Read the whole input file before deciding anything.

## 1. Understand the input

Classify every part of the file:

| Part of the input | What happens to it |
|---|---|
| Game-specific: question/round generation, rules, its own settings controls, special visuals, game CSS | **Keep** the logic and widgets; **restyle** them with the site's tokens (colours, fonts, backgrounds, emoji of the input are NOT carried over) |
| Already provided by the platform: header/banner, student management, timer, score/results table, export/import, winners banner, sound/numerals toggles, praise/consolation messages, confetti, speech, localStorage, "next student" logic | **Drop** — the shell does it. Do not port it, even if the input does it differently |
| Asset references (images, fonts) | Keep if needed; copy local assets into `imgs/` (see step 4) |
| Third-party libraries | Drop confetti/XLSX (shell loads them); ask before adding anything else |

Decide the **style**:
- The student picks one answer from a list → **multiple choice** (`buildQuestion`).
- The student interacts some other way (tapping, dragging, typing, building) → **custom interaction**
  (`newRound` + `ctx.finishRound`).

If the input has no clear question/answer model, or the scoring concept does not map to correct/wrong per round,
**stop and ask the user** how it should be scored. Do not guess. Also ask when something in the input is ambiguous
(several modes, unclear difficulty rules, an unknown asset).

## 2. Pick identity

- `id`: kebab-case file name, e.g. `fractions` → `pages/fractions.html`. Must not exist yet.
- `storagePrefix`: a new unique snake_case prefix (`fractions`). Check the existing ones in
  [docs/architecture.md](../../../docs/architecture.md) — never reuse or rename one.
- Arabic `title`, `heading` (plain name, no emoji), the animated `emoji` (a Noto code point whose `imgs/emoji/<code>.json` exists, plus its character; the same one as the island), the accent colour `--game` (the island's grass colour), banner image and alt text, export file name.
- If the title, description or banner image are not obvious from the input, ask.

## 3. Build `pages/<id>.html`

Start from the skeleton in `docs/game-shell-api.md`.

- `<style>`: only game-specific CSS. Start it with `:root { --game: <island colour>; }`. Use the tokens from `tokens.css`
  (`--ink`, `--sand`, `--white`, `--c1…--c6`, `--s-*`, `--f-display`…) — **no hard-coded colours, no `body` background, no inline
  font sizes on the question** (the shell styles `#problem`). Add a `@media (max-width: 40rem)` rule for every custom widget.
  Shared styling belongs in `style.css` — never redefine shared classes; reuse `.toggle-chip`, `.checkbox-option`, `.group--stack`,
  `.problem-hint`, `.btn--*` (see the class table in the design system).
- `settingsHTML`: the game's settings as `.toolbar > .group > .label + control` (`<label for>` on every control), using
  `.checkbox-option` groups for multi-select and Phosphor icons (`<i class="ph-bold ph-…">`) instead of emoji. Do not add a timer,
  numerals or sound control — the shell has them.
- Logic: `buildQuestion(ctx)` or `newRound`/`finishRound`. Numbers shown to the user go through `toArabicNumber`.
  Honour `ctx.counted` for repeat-avoidance. Validate settings (e.g. nothing selected) with an Arabic `alert` and
  `return null`.
- Use only helpers that exist (`docs/common-js-api.md`): `rnd`, `fingerprint`, `getRandomColors`, `toArabicNumber`, …
  If the game needs a helper that several games would share, say so and propose adding it to `common.js` + docs
  instead of copying it.
- Custom widgets (tap targets, boards) are real `<button>`s ≥ 44 px, styled with the tokens; `ctx.sfx('pop', i)` can give tap feedback.
- All user-facing text Arabic. No new global names that collide with `common.js`/`game-shell.js` globals.
- No `<script>` for confetti/XLSX; no copy of the shell's HTML.

## 4. Assets

Copy only the images the game needs into `imgs/` (or `imgs/<topic>/`), with clear names; reference them as
`../imgs/...` from the page, **including `url()` inside the page's own CSS** (relative to the page, not to the root). Do not touch existing files in `imgs/`.

## 5. Register on the map

`index.html` is an illustrated sea map: one **island** per game (full recipe and rules in
[docs/landing-page.md](../../../docs/landing-page.md), "Adding a game"). Copy an existing island block inside
`<div class="map" id="mapEl">` (keep it before the `#boat` element) and change it:

```html
<a class="island" style="--x:NN%; --y:NN%; --g:oklch(0.85 0.13 120); --i:N" href="pages/<id>.html" data-island>
  <svg class="island__shape" viewBox="0 0 372 306" preserveAspectRatio="none" aria-hidden="true">
    <!-- copy the three <path class="foam|sandbed|grass"> from another island -->
  </svg>
  <span class="emoji island__emoji" data-emoji="<noto-code>" data-fallback="<emoji>" aria-hidden="true"></span>
  <span class="island__sign"><Arabic name></span>
  <span class="island__desc"><one short Arabic sentence></span>
  <span class="island__cta">ابدأ اللعب <i class="ph-bold ph-arrow-left" aria-hidden="true"></i></span>
</a>
```

- `--x` / `--y` are percentages of the map; islands are 36 % wide, so keep centres ≥ 38 % apart horizontally or
  ≥ 45 % vertically. For more than four games raise `--map-h` on `.map` (default 760, about 1000 for six) and
  re-place the islands. The dotted route, boat, hover sounds and the tablet/phone layouts pick the island up
  automatically — no other edit.
- Emoji: download `https://fonts.gstatic.com/s/e/notoemoji/latest/<code>/lottie.json` to `imgs/emoji/<code>.json`
  (if it does not exist, pick another emoji). Do not add unused files.
- Text must be Arabic, short enough for a 2-line description; the banner image is not used on the landing page.

## 6. Verify

Run the **verify-game** skill on the new page (choice scenario, or an adapted custom scenario). For a custom-interaction
game save its scenario as `.claude/skills/verify-game/scenario-<game-id>.js` so `check-games.js` runs it. Also exercise the
game's own settings and edge cases. Then, with the dev server running, run `node tools/check-games.js --only=<id>`
(7 viewports, states, scenario, shell behaviour — **open the screenshots and look at the game**) and `node tools/check-landing.js`
(the new island appears and the landing page still passes). Fix and re-run until both pass.

## 7. Update docs and report

- Add the game to the table in [docs/architecture.md](../../../docs/architecture.md) (including its `storagePrefix`).
- Update `docs/` if you had to extend the platform (and [docs/landing-page.md](../../../docs/landing-page.md) if you
  changed how the map works, e.g. a taller `--map-h`).
- Report: what was kept, what was dropped because the platform provides it, anything from the input that could not
  be mapped (and what you decided or asked), verification results. Do not commit unless asked.
