# Design system (the whole site)

One visual language for the landing page **and** every game page: the "sea map" — a bright day, sky, sea and sand,
flat hard-offset shadows, chunky sticker buttons, animated emoji. It is made for a classroom projector first
(teacher drives, children 6–9 watch and take turns) and must also work on tablets and phones.

Sources of truth (change a value there, never copy it into a page):

| File | Holds |
|---|---|
| [tokens.css](../tokens.css) | Colours, fonts, spacing, easing, the per-game accent `--game`. Loaded by `index.html` (`<link>`) and by `style.css` (`@import`). |
| [style.css](../style.css) | Everything shared by game pages: base, buttons, form controls, header, board, panels, choices, timer, results table, winners dialog, footer, responsive rules. |
| [vendor/phosphor/](../vendor/phosphor) | Phosphor icons 2.1.1 (MIT), local copy: `ph-bold` and `ph-fill` classes. Imported by `style.css`. |
| `js/animated-emoji.js` + `vendor/lottie_light.min.js` + `imgs/emoji/*.json` | Animated Noto emoji (CC BY 4.0, credited on `credits.html`). The shell loads them on game pages. |
| `js/sfx.js` | Synthesized sound effects (no audio files). The shell loads it on game pages. |

The landing page keeps its own *component* CSS inline (map, islands, quiz…) but uses the same tokens; see
[landing-page.md](landing-page.md).

## Language and direction

- `<html lang="ar" dir="rtl">`, every user-facing string in Arabic.
- Two numeral sets, switched by the teacher at runtime: Eastern Arabic ٠١٢٣ (label "هندية", default) and
  Western 0123 (label "عربية"). Always render numbers through `toArabicNumber(n)`.
- A layout that must stay left-to-right (column addition…) goes in an element with `direction: ltr`
  (`.vert-wrapper` in `pages/math-operations.html`).

## Tokens (`tokens.css`)

| Group | Names |
|---|---|
| Colour | `--sky --sea --sea-deep --sea-deeper --ink --ink-soft --sand --sand-deep --sun --coral --brass --white` (OKLCH; neutrals tinted toward the sea hue) |
| Feedback | `--ok --ok-deep --bad --bad-deep --alert` |
| Answer stickers | `--c1 … --c6` and their shadow colours `--c1d … --c6d` (coral, sun, teal, blue, lilac, green) |
| Game accent | `--game` — the colour of the game's island; a game page sets it: `:root { --game: oklch(0.85 0.15 135); }` (copy the island's `--g`) |
| Type | `--f-display` Baloo Bhaijaan 2 (headings, numbers, buttons that matter), `--f-body` Alexandria |
| Space | `--s-1 … --s-24` (4 px based) |
| Motion | `--ease-out` |

Legacy names from the old dark/orange design (`--bg --brand --brand-dark --panel --accent --blue --fuchsia`) still
resolve so old CSS does not turn invisible, but **do not use them in new code**.

Rules the design follows (keep to them in new CSS): ink text on light surfaces, no pure black/white, no gradient
text, no coloured side-stripe borders, no blur/glass, flat hard-offset shadows (`0 0.4rem 0 <darker colour>`), no
bounce/elastic easing, animate `transform`/`opacity`/individual `translate`/`scale`/`rotate` only, rem units so the
projector scaling works.

## Page anatomy (built by the shell — a game does not write this)

```
header.header         sky band: home link "العودة إلى الخريطة", numerals + sound switches, island emoji + H1 + credit,
                      the teacher's banner artwork as a framed poster, a wave horizon
main.g-main
  section.board       the game: "الدور على" student select, start / regenerate, timer pill, #problem, answers, status,
                      the reaction emoji (#face) popping out of the corner
  aside.side          .panel "إعدادات اللعبة" (the game's settingsHTML + question time), .panel "الطلاب"
  section.results-panel   leaderboard table + finalize / export / import / reset
footer.g-footer       note + credits link (always present)
#resultsBanner        winners dialog
```

Wide screens (> 62rem): board on the right (7fr) and the side panels on the left (4fr); results below.
Narrower: one column — board, settings/students, results. ≥ 106rem the root font grows to 112.5 % (≥ 137.5rem: 125 %)
for projectors. Breakpoints: `62rem` (tablet and below), `40rem` (phone), and a short-landscape rule.

## Classes a game can use (from `style.css`)

| Purpose | Classes |
|---|---|
| Settings | `.toolbar` > `.group` (white card, `.group--stack` for a column) > `.label` (`.label.blue`) + control. Always pair a control with a `<label for>` or a `.label`. |
| Multi-select option | `<label class="checkbox-option">` + `input[type=checkbox]` + optional `<i class="ph-bold ph-…">` + `<span>`. The shell keeps `.checked`; `:has(input:checked)` covers first paint. |
| On/off chip button | `<button class="toggle-chip" aria-pressed="false">`; set `.active` and `aria-pressed="true"` when on. `.chip-row` lays several out. |
| Buttons | a bare `<button>` is already a white sticker pill (≥ 44 px). Variants: `.btn--primary` (big coral), `.btn--sun`, `.btn--danger`. `.btn` gives the same look to `<a>`/`<label>`. |
| Inputs | bare `input`, `select` are styled; `input[type=number]` is 5.5rem wide. |
| Question text | the shell styles `#problem` (Baloo, fluid 2.5–5.5rem, centred). Put only the content in it — **no inline font sizes**. `.problem-hint` = small grey line under the question. |
| Answers | `.choices` / `.choice` are built by the shell for multiple-choice games; colours cycle through `--c1…--c6`; `.correct` / `.wrong` are added by the shell. |
| Custom play area | a game with its own widgets (`gameAreaHTML`) uses tokens: white/sand surfaces, `--ink` outlines (`box-shadow: 0 0 0 3px var(--ink)`), sticker shadows. Make widgets real `<button>`s so they work with keyboard and touch. |
| Medals / avatars | `.medal--gold|silver|bronze` and `.student-avatar` (written by `common.js`). |
| Utility | `.visually-hidden`, `[hidden]` (always wins), `.emoji` (animated-emoji slot), `.wrap`. |

## Rules for a game's own CSS

1. Only game-specific rules (its widgets). Never redefine shared classes; if several games would want it, add it to `style.css`.
2. Use tokens — **no hard-coded colours** except per-game artwork. The page background is the shared sea; do not set
   `body { background }`. Set `--game` to the island's colour.
3. Text on `--sand`/`--white` is `--ink`; on coloured stickers it is `--ink` too (check contrast ≥ 4.5:1).
4. Touch targets ≥ 44 px, text ≥ 14 px, no horizontal scroll from 320 px up — `tools/check-games.js` audits this.
5. Image `url()` inside a page's CSS is relative to the page: `url('../imgs/…')`.
6. Mobile: use the `40rem` breakpoint (`@media (max-width: 40rem)`), in rem not px.
7. Keep a visible focus state (global `:focus-visible` already does) and `aria-live` on dynamic regions (the shell does it
   for `#problem`, `#status`, the results table).
8. Icons: Phosphor (`<i class="ph-bold ph-plus" aria-hidden="true"></i>`, `ph-fill` for solid), not emoji characters, in
   buttons, labels and options. Emoji characters stay only where a message is *text* (the `✅ ❌ 🔁` markers in the status line).
   The game's mascot is its animated `emoji` (see [game-shell-api.md](game-shell-api.md)).

## Sound and motion

- Sound is part of the experience and can be muted: one site-wide switch (`#toggleSound` in games, `#sfxToggle` on the
  landing page) stored in `localStorage["home_sfx"]`; it controls the voice reading and the sound effects together.
  The shell plays `Sfx.go()` on start and `Sfx.win(streak)` / `Sfx.lose()` on every answer. Browsers keep audio locked
  until the first tap/click/key, so nothing sounds before that.
- Motion has a purpose: one entrance (`rise`), press feedback, the draining timer, a shake on a wrong answer, the pop of
  the winners dialog. Everything honours `prefers-reduced-motion`.
- Keyboard: number keys 1–9 (or ١–٩) pick the matching answer in multiple-choice games.

## Adding a new look element

Add it to `style.css` (game pages) or to the landing page's inline CSS, using tokens; document it here in the table above.
Check it with `node tools/check-games.js` (all games, 7 viewports) and `node tools/check-landing.js`.
