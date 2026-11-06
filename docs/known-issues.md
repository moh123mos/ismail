# Known issues and decisions

Things an engineer or an AI should know before changing the project. Remove an entry when it is fixed.

## Open

- **ElevenLabs API key is in the browser code** ([common.js](../common.js), `ELEVENLABS_API_KEY`, plus two old
  keys in comments) and in git history. The owner decided to leave it (personal experimental site). Anyone who
  opens the site can read it. Do not add further secrets to the repo; if the site ever becomes public, revoke
  the keys and move the call behind a proxy.
- **Speech needs network and a valid key.** If the request fails, the game continues silently (error in console).
- **No automated test suite**; verification is the browser scenario described in [testing.md](testing.md)
  (games) and `tools/check-landing.js` (landing page).
- **Landing-page sounds need a first tap/click/key** (browser autoplay rule), so the island "pop" sounds on first
  scroll are silent until the user has interacted once. The mute switch state lives in `localStorage["home_sfx"]`.
- **Equations are laid out right-to-left inside `#problem`** (e.g. `٣ + ٤ = ؟` reads from the right). The landing quiz forces
  left-to-right (U+202D…U+202C); the games were left as they were during the redesign. Decide with the teacher which is
  expected, then fix it for all games at once (shell or `dir="ltr"` in the question content). The five games added from the teacher's files (rounding-cube, order-cube, order-festival, doubles-bingo, robot-rescue) already
  force equations left-to-right (`.expr` / `toArabicText`), so those are consistent with the landing quiz and differ from the older four.
- **`imgs/money.png` is not referenced anywhere** (kept, not deleted); `imgs/profile.png` is the teacher's photo on the landing page.

## Decisions

- **Behaviour is unified across games.** Choice games always colour the correct/wrong answer and lock the
  buttons, use the same confetti, finalize the results with at least one student, and treat a timeout as a
  wrong answer. A difference between games must be a deliberate game feature, not drift.
- **Regenerated ("أعد توليد السؤال") questions are practice**: shown with a 🔁 message, not scored.
- **`storagePrefix` values are frozen** (see [architecture.md](architecture.md)).
- **Game pages no longer include the CDN `<script>` tags**; the shell loads `canvas-confetti` and `xlsx`
  asynchronously. The unused `tsparticles` confetti bundle was removed.
- **The whole site uses the "sea map" design (Nov 2026)**: the landing page, then every game page through `style.css` + the
  shell, all on one set of tokens (`tokens.css`). The landing design was chosen from several drafts; the other two drafts are kept
  as `.index-d.html` / `.index-e.html` (unlinked, safe to delete). Its "try it yourself" quiz and the podium are
  demonstrations: the podium names/scores are made up and labelled "مثال توضيحي"; the quiz never writes any data.
- **Animated emoji credit is required** (Google Noto, CC BY 4.0). It lives on `credits.html`, linked from the
  landing footer and added by the shell to every game footer; the footer's other text is free to change but keep a visible link.
- The old landing "download multi-tables" button was removed: it fetched a file that no longer exists.

## History worth knowing

- Before the GameShell refactor each page had its own copy of the lifecycle. Bugs fixed by unifying:
  `math-operations` saved results under the key `"undefined"`; `multi-tables` never saved results after a
  round; both ignored the timer running out; `equations` labelled the numerals button wrongly on load.
- Also fixed during the refactor: page background images used `imgs/…` inside page CSS (resolves to
  `pages/imgs/…`, a 404) — CSS `url()` in a game page must be `../imgs/…`; the Cairo font was never loaded on
  game pages (the shell now loads it); every page 404'd on `favicon.ico` (`favicon.svg` is now linked by the shell
  and `index.html`); `multi-tables` kept its 4rem question size on phones.
- `common.js` fixes made during the refactor: `showWinnersBanner` threw when fewer than 3 students had results
  (its spoken text read `top3[1]`/`top3[2]` unconditionally — this is why `counting-money` used to require 3
  students); the timer could display a negative time on the last tick.
- `tools/serve.py` was single-threaded with a listen queue of 5; the landing page requests a dozen animated-emoji
  files at once, so connections were refused (measured: ~85 % of 39 parallel requests) and the emoji fell back to
  still characters. It now uses `ThreadingHTTPServer` with `request_queue_size = 128` (0 refused). Threads alone
  were not enough (~30 % still refused). On Windows, starting a second `serve.py` on the same port does not fail
  (`SO_REUSEADDR`): requests are split between both processes, so stop old servers before starting a new one.
- `pages/multi-tables-temp.html` (a stale duplicate) was deleted; `prompts/` (hand-written AI prompts that
  described functions which did not exist in `common.js`) was replaced by these docs and the project skills.
