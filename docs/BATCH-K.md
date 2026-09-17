# Batch K — TV popup window and state-driven compact console (C2)

Implemented on `claude/c2-tv-popup-compact-console`, branched from `main` at `f4a7e77`
(the same commit C1 landed on). This is **not an audit finding batch** — it implements
the C2 blueprint the owner commissioned separately (dual-screen TV operation and a
compact Auction Night operator layout), and it resolves the deferred `CAL-P3-007`
(`D-CAL-5`) as a side effect rather than as its primary driver. IDs are not renumbered;
see the appended note on `CAL-P3-007` in [TASK-TRACKER.md](TASK-TRACKER.md).

## What changed

1. **TV window is a real popup, not a same-window tab.** "Launch TV Display" (operator
   header, `app/operator.tsx`), "Open TV View" (Display & sharing, `app/sharing.tsx`)
   and the Auction Night checklist's "Launch TV Display" (`app/sharing.tsx`
   `AuctionHelp`) now call a shared `openTvWindow()` helper (`lib/sharing.ts`) instead
   of an `<a target="_blank">`. It opens `window.open(path, 'ecgc-tv-display', 'popup,
   width=<screen.availWidth>,height=<screen.availHeight>,left=0,top=0')` — a distinct
   OS-level window sized to fill the current screen, still triggered synchronously
   inside the click handler so the browser's popup-blocker treats it as a genuine user
   gesture. The operator's own console is untouched and stays interactive in its own
   window regardless of what the TV window does. No Window Management / Multi-Screen
   Window Placement API is used — this is the browser-universal baseline fix; per-screen
   placement was explicitly deferred (out of scope for this pass).
2. **State-driven compact console.** `app/operator.tsx` now derives `compact` from
   `e.status === 'LIVE' || e.status === 'PAUSED'`, with a persistent three-way manual
   override (`auto`/`on`/`off`) stored in `localStorage` under `calcutta-compact-console`
   and read via a lazy `useState` initializer (no load-effect, so it can't fight
   hydration or trip `react-hooks/set-state-in-effect`). `compact` never reads from or
   writes back to `e.status`/auction state — it is a pure presentation derivation.
3. **Collapsible nav instead of a sticky bid panel.** When compact, the masthead,
   operator heading and event toolbar hide (same technique the existing
   `:fullscreen .console-active` rule already used, now keyed off `.compact` instead of
   requiring real Fullscreen) and the four PREPARE/RUN AUCTION/AFTER AUCTION/TOOLS groups
   collapse into a one-line bar (current phase tag + Compact view switch + inline
   `components/ui/collapsible.tsx` "All sections" toggle that expands the same, unchanged
   `NavGroup` markup in place — no drawer/overlay, no duplicated JSX). This is the
   larger structural change the original `D-CAL-5` audit called for ("meeting the
   proviso needs ~260px out of the operator header stack, not a small layout change")
   instead of the sticky-panel approach that was tried and rejected. C1's PREPARE / RUN
   AUCTION / AFTER AUCTION / TOOLS grouping and every existing nav item, status pill and
   help disclosure are unchanged — only the show/hide/condense wrapper around them.

## Files touched

`lib/sharing.ts` (new `openTvWindow` export), `app/operator.tsx` (compact state, nav
restructuring, TV link), `app/sharing.tsx` (two TV links switched to the same helper,
`TVInstructions` copy updated to describe the new popup behavior), `app/refinements.css`
(`.compact`, `.op-nav-compact`, `.op-nav-expanded`, `.compact-toggle`, `.nav-expand`
rules). No schema, API route, or business-rule change; `lib/model.ts`/`lib/store.ts`
untouched.

## Validation

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS, no errors.
- `npm run build`: PASS, all five build stages complete.
- `npm run lint`: **48 errors / 42 warnings — identical count to the `main` baseline
  at `f4a7e77`; none introduced.** (An earlier draft of the compact-state effects
  introduced two `react-hooks/set-state-in-effect` errors; fixed by using a lazy
  `useState` initializer and dropping an unnecessary reset-effect before this count
  was recorded.)
- `node tests/acceptance.mjs`: **58/58 PASS** against a freshly migrated local
  `.wrangler/state` (both drizzle migrations applied fresh in this worktree).
- `node tests/refinement.mjs`: **72/72 PASS**, same store.
- Local dev server (`npm run dev`) started and responded 200 on `/admin` with the
  starter's mock identity (`seedy@sites.test`); confirms the app boots and serves under
  the changed code, not just that it type-checks.

### Explicitly UNVERIFIED (browser/visual — matches this repo's own PASS/FAIL/BLOCKED/UNVERIFIED convention)

No rendered-browser check was possible in this environment: the Claude-in-Chrome
extension was not connected, and the available computer-use desktop control targets a
different physical machine than the one running this sandbox's dev server, so it cannot
reach `localhost` here. Unlike Batches F–I, **no Playwright/axe evidence, no screenshots,
and no geometry measurements were produced for this batch.** Specifically UNVERIFIED:

- Actual rendered layout/spacing of the compact bar, the condensed masthead-hidden
  state, and the expanded "All sections" collapsible at 1366×768, 1280×720, 1024×768 —
  i.e., whether the Hammer/bid row actually clears the fold has not been re-measured the
  way `sticky-experiment.json` measured the rejected sticky-panel approach. This is the
  acceptance bar this batch is intended to meet and should be re-measured with the same
  kind of harness Batch F/I used before this is treated as resolving `CAL-P3-007` for
  real, not just architecturally.
- The TV popup window actually opening as a separate OS window, being draggable to a
  second display, and the operator console remaining independently interactive —
  confirmed by code/API review (a real `window.open` popup call, not `target="_blank"`)
  but not observed in a live browser.
- Keyboard/focus behavior of the new Collapsible trigger and Switch, and axe/contrast
  on the new `.compact-toggle`/`.nav-current-tag` condensed bar.
- Physical multi-monitor behavior, other browser engines, and screen readers — same
  standing gaps this repo already carries for TV/fullscreen work.

## Rollback

Plain revert of this branch's commits; no migration, no schema change, no API contract
change. The live container (`ecgc-calcutta-app-1`) was not touched — this work is
implemented and locally (statically) validated only, not deployed.
