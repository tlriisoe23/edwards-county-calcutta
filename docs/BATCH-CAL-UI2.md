# UI2 — purposeful UI refinement pass (owner-directed, 2026-09-17)

Not an audit finding batch. The owner requested a direct UI/UX refinement pass across Calcutta and
Leaderboard (Tools menu, contextual help, top-level theme selector, Prepare 1–4 redesign, TV
auction-board polish, statistics hierarchy and semantic team-count color, local user accounts,
Leaderboard theming, and a responsive/TV scaling audit). Recorded here in the same non-audit
"user scope" pattern Leaderboard's tracker already uses for L2/L3/R1, following this repo's own
per-batch documentation convention. Implemented on a dedicated worktree/branch
(`edwards-county-calcutta-ui2`, `claude/ui2-refinement`), off clean `main` @ `cf3c0ca` — not
merged, not deployed.

Sub-batches A–F below were implemented and validated together in one working session (single
consolidated doc rather than six separate `BATCH-CAL-A.md`…`BATCH-CAL-F.md` files, a deliberate
efficiency tradeoff for a large pre-authorized scope rather than an audited finding queue).

**Status update, 2026-09-17:** `claude/ui2-refinement` has since been merged into `main`
(merge commit `9c4319c`) — the "not merged" framing above is now stale. Left the original
prose above intact as the as-implemented record rather than rewritten.

**Status update, 2026-09-17 (later the same day):** merged to `main` @ `ba0f0b3` together
with Batch K/C2, then `ecgc-calcutta-app-1` was rebuilt and restarted at 2026-09-17T14:01
UTC. `docker compose ps` reports healthy; `GET /`, `GET /tv`, `GET /api/public` all
returned 200. This is a read-only public-path check only — the Tools dropdown, theme
quick-picker, `HelpTip`, and Local Users feature were not exercised against production
(no production operator credentials available in this session). The only event on the
container is the pre-existing `demo: 1` fixture; no real settlement data was touched.

## A — Tools dropdown menu

Replaced the `TOOLS` nav group (a row of tab buttons: Display & sharing / Help / Activity / Access
/ Advanced settings) with a single `Tools ▾` dropdown (`components/ui/dropdown-menu.tsx`, Radix —
already present but previously unused anywhere in this app) in the operator header, next to Public
board / Launch TV Display / Sign out. Every item calls the exact same tab-switching logic the
former `TabsTrigger`/shortcut called (e.g. `{ setAdvancedRequest(0); setTab('sharing'); }`) — a
relocation, not a new state machine. Access stays hidden (not disabled) for non-owners, unchanged.
Radix supplies full keyboard (arrow keys, Esc), outside-click, and touch support without extra
code. `app/operator.tsx`, `app/refinements.css`.

## B — Prepare 1–4 redesign

New `app/prepare-steps.tsx` (`PrepareSteps`), replacing the `PREPARE` nav group with four
equal-width "Step N" cards (`grid-template-columns:repeat(4,1fr)` → 2 columns ≤950px → 1 column
≤700px, reusing the app's existing breakpoints so steps reflow to fewer columns rather than
shrinking). Status pills (`teamsFlightsStatus`/`buyersStatus`) and their Circle/AlertCircle/
CheckCircle2 icon set are reused verbatim — no new readiness logic. The current step gets both a
border/box-shadow accent and a text "Current" tag, not a color-only signal.

## C — Theme quick-select

A compact "Theme ▾" `Choice` control in the same header row, next to New event/Load demo. No new
persistence path: it calls the identical `act('theme_update', { theme }, { message: … })` the
existing `ThemeSettings` panel (Display & sharing) already uses — both read/write
`e.settings.theme`, so they cannot drift. The full radio-group settings panel is untouched as the
detailed surface; this is a faster path to the same setting, not a second source of truth.

## D — Contextual help (`HelpTip`)

New `app/help-tooltip.tsx` (`HelpTip`), a Radix Popover driven by a controlled `open` state:
hover/focus opens it (desktop/keyboard), a click/tap toggles it (touch, which fires no hover
events), and a short close delay lets the pointer travel from trigger to content. Replaces the
former `<details>`-based `NavHelp` pattern for the genuinely non-obvious explanations already
present (Teams & flights, Buyers step hints; Sales, Results, Settlement nav-group notes) — the
`NavGroup` component's internal note rendering now uses `HelpTip` instead of `NavHelp`, so all
five prior explanations are preserved. Deliberately **not** added to the Hammer/Sold, Pause/Start/
Complete, Save, Record bid, Undo, New event, Load demo, or Check TV display / Advanced settings
controls — these are self-explanatory, or (Advanced settings/Check TV display) the destination
screen already explains itself; adding tooltips there would be help for its own sake. Dead code
removed in the process: `NavHelp`, `NavShortcut`, and their now-unused icon imports.

## E — TV bid pulse + sold acknowledgement

CSS-only, `app/globals.css`. `.tv .big-bid` (TV route only, not the operator console or public
board) gets a slow (2.8s, ease-in-out, infinite) opacity breathing keyframe, `bid-pulse` —
verified via computed style in a headless browser that `animationName` resolves to `bid-pulse` on
the live TV route. `.sold-toast` keeps its existing `.25s` slide-in entrance and gains a
~0.9s `sold-settle` keyframe layered after it (scale-and-brightness settle, not `infinite`). Both
new keyframes are declared without `!important`, so the existing global
`@media(prefers-reduced-motion:reduce){*{animation:none!important}}` rule continues to win
regardless of source order — no reduced-motion regression risk.

## F — Statistics hierarchy + semantic team-count color

`Stats` in `app/auction.tsx` gains a small local `remainingTone(remaining)` helper (1→critical,
2→warning, 3→caution, otherwise none — matching the requested absolute thresholds) and a
`data-emphasis` flag on "Net Calcutta pool" for a slightly larger/bolder headline treatment,
implemented purely with `data-*` attributes consumed by CSS — no prop-threading, no new component.
A new `--caution`/`--caution-surface` token pair was added to all four themes in `app/themes.css`
(reusing the existing `--warning`/`--destructive` tokens for the other two tiers) so the 3-tier
scale stays theme-harmonized rather than introducing raw hex colors. Every toned value also gets a
small icon + word ("Getting close" / "Wrapping up" / "Almost done") — never color alone.

**Known limitation, recorded rather than silently ignored:** the thresholds are absolute team
counts, as literally requested ("3/2/1 remaining"), not proportional to the event's total team
count. A very small event (e.g. 2 total teams) would show "Warning" at its very start. This
matches the explicit instruction; a proportional variant was not implemented without a separate
decision, since the request was unambiguous.

**Contrast evidence (computed, not eyeballed):** `--caution` on `--caution-surface` — classic
6.17:1, high-contrast 8.94:1, dark-event 11.21:1, light-event 6.17:1 (WCAG relative-luminance
formula, all ≥4.5:1 AA for normal text).

## G — Local user accounts (Tools → Local Users)

Extends the existing owner-only "local recovery login" (`portable/auth-handler.mjs`,
`portable/sessions.mjs`) into a general, lightweight local-account feature — without changing how
the owner is determined, and without adding a new hashing dependency.

**Schema:** `portable_local_users(email PK, display_name, password_hash, enabled, created_by,
created_at)` added to `portable/migrate.mjs` alongside the existing `portable_credentials` /
`portable_sessions` / `portable_login_attempts` tables — kept **separate** from
`portable_credentials`, which stays exclusively the original owner-recovery path.

**Hashing:** the existing hand-rolled `scrypt` scheme in `portable/sessions.mjs`
(`scryptSync`/`timingSafeEqual`, format `scrypt:<salt>:<hash>`) — no bcrypt/argon2 dependency
added, no plaintext ever stored, no password ever logged, no hash ever returned to the client
(`listLocalUsers()` only ever selects `email,display_name,enabled,created_by,created_at`).

**Auth wiring:** `checkLocal(email, password)` now tries the owner-recovery path first (unchanged
behavior), then an **enabled** `portable_local_users` row, returning `{ displayName }` on success
so `portable/auth-handler.mjs`'s login POST can use the stored display name instead of hardcoding
the email. The shared five-attempt/15-minute rate-limit bucket is unchanged and still covers both
paths together.

**Operator-level only, by construction (confirmed decision):** `local_user_create` (in
`app/api/admin/route.ts`) writes to **both** `operators` (reusing the exact insert path
`operator_add` already uses) and `portable_local_users` in the same request. Owner is still
computed exclusively from `ADMIN_EMAILS` (`ownerEmails()`) — untouched by this feature — so a
local account can never become owner regardless of what it's granted; the create action explicitly
rejects an email that's already on the owner allowlist.

**Cross-build-target seam (the one real architectural wrinkle, resolved with existing
precedent):** `app/api/admin/route.ts` is shared, compiled source for both the portable deployment
(what's actually live in production, per `AGENTS.md`) and a separate, non-production Sites/ChatGPT
build target that must not statically pull in the portable runtime's `node:sqlite`-backed code.
Checked-in source defines four throwing placeholders (`createLocalUser`, `listLocalUsers`,
`setLocalUserEnabled`, `resetLocalUserPassword`, all delegating to one `portableOnly(): never`
thrower so no stub parameter is ever "unused" — zero new lint warnings) between
`// PORTABLE-STUB-START/END` markers. `scripts/stage-portable.mjs` replaces that block with a real
import from `@/portable/sessions.mjs` at staging time — the *same* mechanism already used one line
above it for `publicOrigin()`, just extended. Verified, not assumed: `npm run build:portable`
compiles cleanly with the real imports substituted (Next's own TypeScript pass), and the plain
`npm run build` compiles cleanly with the stub in place.

The account write and the audit-trail write are two sequential steps, not one atomic transaction
— `portable_local_users` lives on the portable runtime's raw SQLite connection, a different API
surface from the D1-style batched statements used for `operators`/`audit`, even though (verified
via `portable/runtime.mjs`'s `env.DB` getter) they are the same physical database file in
production. The account write is the source of truth for sign-in; a lost audit row on a rare
mid-request failure is a traceability gap, not a security issue. Recorded here rather than left
implicit.

**UI:** `Tools ▾ → Local Users` opens a dialog (`LocalUsersDialog` in `app/operator.tsx`) with a
create form (login email, display name, password, confirm — deliberately **no role selector**,
since operator-only isn't a choice) and a list of existing local users with Disable/Enable and
Reset password actions, mirroring the existing Access tab's `.access-row` pattern. Client-side
validation (password length/match) mirrors the server's rules so failures are never opaque.

**Known caveat, recorded rather than quietly worked around:** the feature is portable-runtime-only
by design, matching the existing local-recovery login's own scope. If the Sites/ChatGPT target is
ever activated for real use, the GET payload's `localUsers` list degrades gracefully to `[]`
(caught, not thrown), but the Tools → Local Users menu entry itself would still render there today
— revisit its visibility if that target ever becomes a real second production deployment (it isn't
one now).

### Validation for G specifically

- `node tests/portable-local-users.mjs` (new, mirrors the existing `tests/portable-auth.mjs`
  style — no full server, direct module-level calls): create → login succeeds with the stored
  display name; wrong password rejected; unknown email rejected; listing never includes the
  password hash; duplicate email rejected (not silently overwritten); disabling blocks sign-in
  even with the correct password, re-enabling restores it; a password reset invalidates the old
  password and accepts the new one; a full real HTTP round-trip through `/signin-with-chatgpt` →
  `/api/auth/local` as the newly created account, confirming the resulting session is never the
  owner identity. Wired into `npm run test:portable`.
- `tests/acceptance.mjs` gained a block (guarded by `process.env.CALCUTTA_TEST_PASSWORD`, exactly
  matching the existing convention in `tests/test-session.mjs` that only the portable test harness
  signs in via the real local-login HTTP form) exercising the actual admin-API actions —
  `local_user_create`/`local_user_set_enabled`/`local_user_reset_password` — through a live running
  server as the real owner: create, duplicate rejected (400), password-mismatch rejected (400),
  disable, enable, reset. Confirmed this block is skipped (not run, not failed) under the plain
  `node tests/acceptance.mjs` dev-server command that this repo's `AGENTS.md` documents as the
  default — no regression to that existing command.
- Full `npm run test:portable` (`portable-storage` → `portable-auth` → `portable-local-users` →
  `portable-integration`) passed end-to-end against the actual built standalone portable server,
  including the pre-existing acceptance (62 checks, +4 from this batch) and refinement (72 checks)
  suites and the database-import roundtrip check.
- `npm run build:portable` and plain `npm run build` both compile cleanly.
- Headless-browser check against the plain (non-portable) dev server: Tools → Local Users opens a
  correctly laid-out dialog; attempting to create an account there surfaces the exact honest error
  "Local accounts require the portable deployment." as a toast, not a crash or silent failure —
  confirming the stub fails loudly outside its intended runtime, per the documented caveat above.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — clean.
- `npm run lint` (excluding the gitignored `.sites-runtime`/`dist` build-artifact directories,
  which are not part of this change and were not previously excluded from this repo's lint script
  either — a pre-existing config gap, not introduced here): 48 errors (unchanged from baseline) /
  37 warnings (down from the 43-warning baseline; this batch introduced zero new warnings and the
  A–F dead-code removal net-reduced the total).

## Validation performed for A–F

- `node node_modules/typescript/bin/tsc --noEmit --incremental false` — clean, no errors.
- `npm run lint` — unchanged from baseline (48 pre-existing errors / 43 warnings, none introduced
  by this batch; confirmed the two functions this batch made dead — `NavShortcut`, `NavHelp` —
  were removed rather than left as new unused-var warnings).
- `npm run build` — production build succeeds (`vinext build`, all routes compile).
- `node tests/acceptance.mjs` — 58/58 PASS (fresh local D1 store, migrations applied via
  `wrangler d1 execute` since this worktree's `.wrangler/state` started empty; `ADMIN_EMAILS` set
  to the same `seedy@sites.test` dev value the main worktree uses — local-only, gitignored `.env`).
- `node tests/refinement.mjs` — 72/72 PASS.
- Headless browser smoke check (Playwright/Chromium against the local dev server): Tools ▾ opens
  with exactly the five expected items and closes on Escape; the four Prepare cards render with
  correct labels/status pills/current-phase tagging; a HelpTip opens on hover near its trigger
  without covering the triggering control; the theme quick-select renders and lists the four
  presets; a demo event's TV route (`/tv`) renders the live block, stats and recent-sales strip
  with no layout breakage and confirmed `bid-pulse` as the computed `animationName` on `.big-bid`.
  Screenshots retained in the session scratchpad (not committed to the repo).
- Not yet performed (deferred to the consolidated **Batch H** responsive/TV audit): the full
  1366×768/1920×1080/2560×1440/3840×2160/narrow-width sweep, axe accessibility scan, and a
  physical-hardware TV check (matches this repo's existing convention that hardware verification
  is always a separate, later gate).

No schema, auction/settlement math, authentication, or route changed in A–F. No migration, no
deployment, no production access.

## H — Responsive/TV scaling audit

No source changes were required by this pass — the existing S1 proportional-typography system
(`--tv-unit`/container queries in `app/globals.css`, documented in `docs/ARCHITECTURE.md`) already
scales correctly through everything A–G added; this batch is verification, not new CSS.

**Method:** headless Chromium (Playwright, via a scratch install — this repo has no `playwright`
devDependency of its own; existing `tests/*-browser.mjs` files in this repo use the same
dynamic-import pattern against whatever `playwright` is available) against the local dev server,
sweeping 1366×768, 1920×1080, 2560×1440, 3840×2160 and a 390×844 narrow width, on `/tv`, `/`
(public) and `/admin`, using the same demo event throughout.

**Results:**

| Viewport | TV bid font | TV stats font | Horizontal overflow | Vertical overflow |
|---|---|---|---|---|
| 1366×768 | 83.3px | 39.8px | none | none |
| 1920×1080 | 117.1px | 56px | none | none |
| 2560×1440 | 156.1px | 74.7px | none | none |
| 3840×2160 | 234.2px | 112px | none | none |
| 390×844 (phone, `/tv`) | 46.75px | 26px | none | scrolls vertically |

Bid font scales exactly proportionally from 1080p→4K (117.1px → 234.2px, a clean 2.00× for a
2.00× linear resolution increase) — not "comically huge," about 6% of the 4K frame's width, and
never depends on browser zoom. No route showed horizontal overflow at any tested width, including
the public board's responsive stats grid (6 columns down to 2 at phone width). The phone-width
`/tv` result scrolling vertically is expected and out of this requirement's scope — the TV route
targets clubhouse-display aspect ratios (already the subject of the existing Batch C/F work), not
portrait phones; nobody views the clubhouse TV on a held phone.

**Reduced motion:** with `prefers-reduced-motion: reduce` emulated, the new `.tv .big-bid`
`bid-pulse` animation resolves to computed `animationName: "none"` — confirmed programmatically,
not just by reading the CSS source order.

**Keyboard/focus:** Tab reaches the new Tools trigger (confirmed via `aria-label="Tools menu"`);
Enter opens the menu; ArrowDown moves through items in order (Display & sharing → Help → Activity
confirmed); Escape closes the menu **and returns focus to the trigger** (Radix's built-in behavior,
verified, not assumed); the theme quick-select shows a 3px solid focus outline when focused via
keyboard.

**Not performed in this session** (recorded rather than silently skipped): an axe-core automated
scan (this scratch Playwright install didn't have `@axe-core/playwright` on hand; the manual
contrast math and keyboard checks above cover the highest-risk items from this batch specifically),
and physical-hardware TV/projector viewing — both remain the same kind of later gate this repo's
tracker already treats every prior batch's hardware verification as (see Batch C/F: "physical
clubhouse display rehearsal remains a later gate").
