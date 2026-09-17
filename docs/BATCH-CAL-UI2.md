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

## Validation performed

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
