# Design system (game pages)

Source of truth: [style.css](../style.css). Game pages must use its classes and variables and add **only
game-specific CSS** in their own `<style>`. (`index.html` has its own inline styles and is not covered here.)

## Language and direction

- `<html lang="ar" dir="rtl">`, every user-facing string in Arabic.
- Two numeral sets, switched by the teacher at runtime: Eastern Arabic ٠١٢٣ (the UI label calls them "هندية",
  the default) and Western 0123 (label "عربية"). Always render numbers through `toArabicNumber(n)`.
- When a layout must stay left-to-right (e.g. column addition) wrap it in an element with `direction: ltr`
  (see `.vert-wrapper` in `pages/math-operations.html`).

## Variables (`:root`)

| Variable | Value | Use |
|---|---|---|
| `--bg` | `#0b1020` | page background |
| `--brand` / `--brand-dark` | `#ff9800` / `#fb8c00` | primary orange (headings, choices, accents) |
| `--panel` | `#111217` | control panels (`.group`) |
| `--accent` | `#ffb366` | soft orange |
| `--blue` | `#4FC3F7` | secondary |
| `--fuchsia` | `#ff77d1` | highlight (e.g. algebra variables) |

Font: Cairo (`font-family: "Cairo", sans-serif`), loaded from Google Fonts by the shell (`index.html` links it
itself). It falls back to `sans-serif` when offline.

## Classes provided by style.css

Layout: `.header`, `.home-button`, `.banner-wrap`, `.h1-row`, `.credit`, `.toolbar`, `.students`, `.group`,
`.label` (`.label.blue`), `.footer-note`, `.results-area`.

Game area: `#problem`, `.choices` / `.choice` (`.choice.correct`, `.choice.wrong`), `.status`, `.face`
(`.face.sad`), `#timerDisplay`.

Results: `table`, `tr.gold`, `tr.silver`, `tr.bronze`, `.medal`, `#resultsBanner` (+ `.show`), `#bannerOverlay`,
`.banner-close`, `.winner-row` (`.first/.second/.third`), `.winner-medal`, `.winner-info`, `.winner-name`,
`.winner-stats`.

Settings controls: `.checkbox-group`, `.checkbox-option` (`.checked`).

Animations: `shake`, `rotateBorder`, `bounceIn`, `pulse`, `rotate3d`.

## Rules

- Do not redefine shared classes in a game page. If a style would help several games, add it to `style.css`.
- Page background and the banner image are per-game (`body { background: … }`). Inside a page's `<style>`, image
  URLs are relative to the page: write `url('../imgs/…')`, not `url('imgs/…')`.
- Mobile breakpoint is `max-width: 720px`; every game-specific widget needs a mobile rule.
- Keep a visible focus state and `aria-live="polite"` on dynamic regions (the shell already does this for
  `#problem` and the results table).
- Settings blocks use `.toolbar > .group > .label + control`.
