# Known issues and decisions

Things an engineer or an AI should know before changing the project. Remove an entry when it is fixed.

## Open

- **ElevenLabs API key is in the browser code** ([common.js](../common.js), `ELEVENLABS_API_KEY`, plus two old
  keys in comments) and in git history. The owner decided to leave it (personal experimental site). Anyone who
  opens the site can read it. Do not add further secrets to the repo; if the site ever becomes public, revoke
  the keys and move the call behind a proxy.
- **Speech needs network and a valid key.** If the request fails, the game continues silently (error in console).
- **No automated test suite**; verification is the browser scenario described in [testing.md](testing.md).

## Decisions

- **Behaviour is unified across games.** Choice games always colour the correct/wrong answer and lock the
  buttons, use the same confetti, finalize the results with at least one student, and treat a timeout as a
  wrong answer. A difference between games must be a deliberate game feature, not drift.
- **Regenerated ("أعد توليد السؤال") questions are practice**: shown with a 🔁 message, not scored.
- **`storagePrefix` values are frozen** (see [architecture.md](architecture.md)).
- **Game pages no longer include the CDN `<script>` tags**; the shell loads `canvas-confetti` and `xlsx`
  asynchronously. The unused `tsparticles` confetti bundle was removed.

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
- `pages/multi-tables-temp.html` (a stale duplicate) was deleted; `prompts/` (hand-written AI prompts that
  described functions which did not exist in `common.js`) was replaced by these docs and the project skills.
