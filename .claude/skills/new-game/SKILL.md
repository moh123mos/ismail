---
name: new-game
description: Add a game to this math-games platform from an HTML file the owner prepared (any shape: a standalone page, a prototype, a single-file game). Reads it for the game-specific parts and builds a NEW page that plugs into GameShell and the platform's shared features instead of copying the file, then adds its card to index.html and verifies it. Use when the user attaches or points to an HTML game, or asks to add/create/port a game or page to the platform.
---

# new-game

Input: an HTML game file (path given by the user). Output: `pages/<game-id>.html` built on the platform, plus a card
in `index.html`. **The attached file is source material, not the deliverable** — its shape is unpredictable, so
never drop it into `pages/` as is. Build a clean page that follows the platform.

Read first: [docs/game-shell-api.md](../../../docs/game-shell-api.md) (the contract),
[docs/design-system.md](../../../docs/design-system.md), and one example game for the style you will use.
Read the whole input file before deciding anything.

## 1. Understand the input

Classify every part of the file:

| Part of the input | What happens to it |
|---|---|
| Game-specific: question/round generation, rules, its own settings controls, special visuals, game CSS | **Keep** (rewritten into the new page) |
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
- Arabic `title`, `heading` (emoji + name), banner image and alt text, export file name.
- If the title, description or banner image are not obvious from the input, ask.

## 3. Build `pages/<id>.html`

Start from the skeleton in `docs/game-shell-api.md`.

- `<style>`: only game-specific CSS, using the variables and classes from `style.css`; add a `max-width: 720px` rule
  for every custom widget. Shared styling belongs in `style.css` — never redefine shared classes.
- `settingsHTML`: the game's settings as `.toolbar > .group > .label + control`, using `.checkbox-option` groups for
  multi-select. Do not add a timer, numerals or sound control — the shell has them.
- Logic: `buildQuestion(ctx)` or `newRound`/`finishRound`. Numbers shown to the user go through `toArabicNumber`.
  Honour `ctx.counted` for repeat-avoidance. Validate settings (e.g. nothing selected) with an Arabic `alert` and
  `return null`.
- Use only helpers that exist (`docs/common-js-api.md`): `rnd`, `fingerprint`, `getRandomColors`, `toArabicNumber`, …
  If the game needs a helper that several games would share, say so and propose adding it to `common.js` + docs
  instead of copying it.
- All user-facing text Arabic. No new global names that collide with `common.js`/`game-shell.js` globals.
- No `<script>` for confetti/XLSX; no copy of the shell's HTML.

## 4. Assets

Copy only the images the game needs into `imgs/` (or `imgs/<topic>/`), with clear names; reference them as
`../imgs/...` from the page, **including `url()` inside the page's own CSS** (relative to the page, not to the root). Do not touch existing files in `imgs/`.

## 5. Register in the index

Add a card inside `<div class="pages-grid">` in `index.html`, after the last card, with the same markup as the others:

```html
<div class="page-card">
  <div class="card-image-wrapper">
    <img src="imgs/<banner>" alt="<Arabic name>" class="card-image">
    <div class="card-overlay"></div>
  </div>
  <div class="card-content">
    <div class="card-icon"><emoji></div>
    <h3 class="card-title"><Arabic name></h3>
    <p class="card-description"><one Arabic sentence></p>
    <a href="pages/<id>.html" class="card-btn">
      <span>ابدأ اللعب</span>
      <span class="arrow">⬅️</span>
    </a>
  </div>
</div>
```

## 6. Verify

Run the **verify-game** skill on the new page (choice scenario, or an adapted custom scenario). Also exercise the
game's own settings and edge cases, and check mobile width. Fix and re-run until it passes.

## 7. Update docs and report

- Add the game to the table in [docs/architecture.md](../../../docs/architecture.md) (including its `storagePrefix`).
- Update `docs/` if you had to extend the platform.
- Report: what was kept, what was dropped because the platform provides it, anything from the input that could not
  be mapped (and what you decided or asked), verification results. Do not commit unless asked.
