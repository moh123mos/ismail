# Landing page (`index.html`)

The landing page keeps its component CSS inline and does not use `style.css` (that is for game pages), but it shares
the design tokens (`tokens.css`) and the look with every game page — see [design-system.md](design-system.md).
Concept: an illustrated sea map. Each game is an island; the teacher's photo is a ship's porthole.
It is meant first for a classroom projector (teacher drives, children watch and take turns), and must also work
on phones and tablets. Audience: children 6–9 years old, Arabic, RTL.

## Files

```
index.html              The whole page: inline component CSS + two inline scripts (page logic, nothing else)
tokens.css              Shared design tokens (colours, fonts, spacing) — also used by style.css / game pages
credits.html            Attribution page (linked from the footer — see "Licences")
js/sfx.js               Sound effects (Web Audio, synthesized; no audio files)
js/home-demo.js         "Try it yourself" quiz + count-up numbers
js/animated-emoji.js    Plays Noto animated emoji (lottie) for every [data-emoji] element; AnimatedEmoji.scan(root) / .set(el, code, fallback)
vendor/phosphor/        Phosphor icons 2.1.1 (MIT), local copy (bold + fill)
vendor/lottie_light.min.js   lottie-web 5.12.2 (light build, MIT) — local copy, no CDN
imgs/emoji/<code>.json  Animated emoji, one file per Unicode code point (only the ones in use)
favicon.svg             Site icon
tools/check-landing.js  Browser check for this page (see Verification)
```

External: Google Fonts only (Baloo Bhaijaan 2 for headings, Alexandria for body). Icons are the local Phosphor copy
(`ph-bold` / `ph-fill` classes). Game pages use the same fonts and icons.

## Page structure (top to bottom)

1. **Sky header** — sun, drifting clouds, brand + sound switch (`#sfxToggle`), greeting with a waving-hand emoji,
   `h1` with the teacher's name, one-line description, the photo in a porthole that overlaps the horizon.
2. **Map** (`.sea#map`) — ribbon title "اختر اللعبة التي تريد البدء بها", then `.map#mapEl` with the dotted route,
   nine islands (`a.island[data-island]`) in a 3 × 3 snake, the boat (`#boat`) and a whale.
3. **Try it yourself** (`.sea.harbor#try`) — a live question (see below).
4. **How it works** (`.beach`) — three honest steps and a note that data is saved on this device.
5. **Podium** (`.night#podium`) — example winners (labelled "مثال توضيحي"; names and scores are made up).
6. **Footer** — credit line, "الشكر والتراخيص" link to `credits.html`.

Do not claim features the games do not have (earlier text promised "advanced performance tracking"; results are
only stored in `localStorage` on the device).

## Design tokens (`tokens.css`)

Colours in OKLCH, neutrals tinted toward the blue hue: `--sky`, `--sea`, `--sea-deep`, `--sea-deeper`, `--ink`,
`--ink-soft`, `--sand`, `--sun`, `--coral`, `--brass`, `--white` (full list in [design-system.md](design-system.md)).
Fonts: `--f-display`, `--f-body`. Spacing scale `--s-1 … --s-24` (4 px based), easing `--ease-out`.
Change a token in `tokens.css`, not in the page.
Rules the page follows: no gradient text, no side-stripe borders, no glass/blur, flat hard-offset shadows,
no bounce/elastic easing, animate `transform`/`opacity` (plus individual `translate`/`scale`/`rotate`).

## Responsive behaviour

| Viewport | Layout |
|---|---|
| ≥ 62rem (992 px) | Full map: islands positioned by `--x` / `--y` (percent of the map), route + boat + whale shown |
| 40rem – 62rem (tablet) | Islands in a 2-column grid, second column shifted down; route/boat hidden |
| < 40rem (phone) | One column, islands alternate sides; the quiz choices stay 2 × 2 |
| ≥ 106rem (1696 px) | Root font size 112.5 % and wider container (projectors, big monitors); ≥ 137.5rem: 125 % |

Hover effects are inside `@media (hover: hover)` so they never stick on touch screens. Touch targets are ≥ 44 px,
text ≥ 14 px (island descriptions are the smallest; both are audited by `tools/check-landing.js`). `prefers-reduced-motion` turns off entrance animations, drifting clouds/waves, the boat
transition and the "pop" sounds; the emoji show a still frame.

## Sound (`js/sfx.js`)

All sounds are synthesized in the browser. Browsers block audio until the first tap/click/key, so nothing plays
before that — this is normal. The switch `#sfxToggle` stores its state in `localStorage["home_sfx"]` (`on`/`off`;
do not reuse this key). API: `Sfx.win(streak)`, `Sfx.lose()`, `Sfx.pop(i)`, `Sfx.hover(i)`, `Sfx.sail()`,
`Sfx.go()`, `Sfx.willPlay()`, `Sfx.bindToggle(button)`.

| Event | Sound |
|---|---|
| Map scrolls into view | `pop(i)` for each island, in step with its entrance animation |
| Pointer enters / keyboard focuses an island | `hover(i)` (one pentatonic note per island) and, on wide screens, `sail()` while the boat moves |
| Click on an island | `go()`; navigation waits 220 ms only when sound will actually play (plain left click) |
| Quiz right answer | `win(streak)` — pitch rises with answers in a row |
| Quiz wrong answer / timeout | `lose()` — soft, falling, intentionally not harsh |

## "Try it yourself" quiz (`js/home-demo.js`)

Markup contract (the page styles it; the script only fills it): a root with `data-quiz` containing `[data-timer]`
(gets CSS var `--t` 1→0 and `data-low="1"` in the last 4 s), `[data-time]`, `[data-q]`, `[data-choices]`
(the script creates four `button.choice` with `data-i`, `data-key`, `data-v`), `[data-msg]`, `[data-streak]`,
`[data-score]`, `[data-reaction]` (gets `data-on` while a reaction emoji plays).
Behaviour: 12 s per question, mixes addition, subtraction and multiplication, runs only while visible, supports
keys 1–4, a timeout counts as wrong, reactions use `1f389` / `1f4aa`. The equation is forced left-to-right with
U+202D…U+202C — without it Arabic-Indic digits are reordered inside an RTL page.
`[data-count]` elements count up when scrolled into view (the podium scores).
This quiz is a demo; it does not touch `localStorage` or any game's data.

## Animated emoji

`<span class="emoji" data-emoji="1f525" data-fallback="🔥" aria-hidden="true"></span>` — `js/animated-emoji.js`
loads `imgs/emoji/1f525.json`, plays it only while on screen, shows a still frame under reduced motion, and shows
the fallback character if the file cannot be loaded (e.g. page opened with `file://`; use the dev server).
To add one: download `https://fonts.gstatic.com/s/e/notoemoji/latest/<code>/lottie.json` to
`imgs/emoji/<code>.json` (not every emoji exists as an animation). Keep the folder limited to what is used.

## Adding a game (island)

Done by the `new-game` skill; by hand:

1. Copy one `<a class="island" … data-island>` block in `index.html` and set:
   `--x` / `--y` (percent of the map; the map is 1200 × `--map-h` units, islands are 36 % wide, so keep centres
   ≥ 38 % apart horizontally or ≥ 45 % vertically), `--g` (grass colour), `--i` (entrance order),
   `href="pages/<id>.html"`, the Arabic name (`.island__sign`), one short sentence (`.island__desc`), and an
   emoji (`data-emoji` + `data-fallback`). **The island's emoji and grass colour are the game's identity:** the game page
   uses the same emoji in `GameShell.mount({ emoji })` and the same colour as `--game` in its `<style>`.
2. More than four games: raise `--map-h` on `.map` (it is 1350 now, for nine islands: three columns at `--x` 18 / 50 / 82 % (islands are 36 % wide, so the outer ones touch the map's edges exactly — any further out and the page scrolls sideways at 1024 px),
   three rows around `--y` 15 / 50 / 85 %, a few percent of vertical jitter so it does not look like a grid; keep rows ≥ 28 % apart,
   an island is about 27 % of the map height) and re-place the islands (and the whale `.critter`). The dotted route is drawn from the islands' `--x`/`--y` by script, boat/hover/sound logic picks the
   island up automatically (`[data-island]`), and the tablet/phone layouts need no change.
3. Run `node tools/check-landing.js`.

## Licences

The animated emoji are Google Noto (CC BY 4.0), which requires attribution; Phosphor Icons are MIT, lottie-web is
MIT. They are credited on `credits.html`, linked from the footer. **Keep that link (or move the credits somewhere
equally visible) if the footer text changes.**

## Verification

`python tools/serve.py`, then `node tools/check-landing.js` (Node 22+, Chrome installed, no packages; shared Chrome helpers
are in `tools/lib/cdp.js`). The game pages have their own check, `tools/check-games.js`. It checks
seven viewports (320×640 and 390×844 phones, 844×390 phone landscape, 768×1024 and 1024×768 tablets, 1440×900,
1920×1080): no horizontal scroll, nothing pushed outside the viewport, touch targets ≥ 44 px, text ≥ 14 px and saves
a full-page screenshot of each; then the behaviour: sounds silent before the first gesture, island hover note and
boat whoosh, quiz timer / wrong / right / timeout / keyboard with their sounds, podium counters, mute switch and
its persistence, island click navigation, no console errors. It exits with code 1 on any failure.

## Archived drafts

`.index-d.html` (theatre stage) and `.index-e.html` (geometric poster) are two alternative designs that were built
from the same content. They are not linked and not maintained; delete them freely.
