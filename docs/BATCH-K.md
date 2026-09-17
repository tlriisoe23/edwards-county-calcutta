# Batch K — TV popup window and state-driven compact console (C2, v2)

Implemented on `claude/c2v2-dual-screen-compact-console`, branched from `main` at
`9c4319c` (after S1 and UI2 both merged). **Supersedes the first C2 pass**
(`claude/c2-tv-popup-compact-console`, branched from pre-S1 `f4a7e77`), which is left
in place as a historical record but should not be merged — it references
`NavShortcut`/`NavHelp` and a four-`NavGroup` layout (including a `TOOLS` group) that
UI2 removed in favor of a header `Tools ▾` dropdown and a `PrepareSteps` card grid.
This is **not an audit finding batch**; it implements the C2 blueprint requirements
recorded in `docs/TASK-TRACKER.md` under "C2 requirements recorded during S1 recovery,"
now reworked against the merged UI2 nav.

## What changed (same two fixes as the first pass, rebuilt against the new nav)

1. **TV window is a real popup, not a same-window tab.** "Launch TV Display" (operator
   header, `app/operator.tsx`), "Open TV View" (Display & sharing, `app/sharing.tsx`)
   and the Auction Night checklist's "Launch TV Display" (`app/sharing.tsx`
   `AuctionHelp`) call a shared `openTvWindow()` helper (`lib/sharing.ts`) instead of
   `<a target="_blank">`. It opens `window.open(path, 'ecgc-tv-display', 'popup,
   width=<screen.availWidth>,height=<screen.availHeight>,left=0,top=0')` — a distinct
   OS-level window sized to fill the current screen, still triggered synchronously
   inside the click handler so the browser's popup-blocker treats it as a genuine user
   gesture. No Window Management / Multi-Screen Window Placement API — the
   browser-universal baseline fix, matching the scope decision from the first pass.
2. **State-driven compact console**, adapted to the post-UI2 nav: `compact` derives
   from `e.status === 'LIVE' || e.status === 'PAUSED'`, with a persistent three-way
   `localStorage` override (`calcutta-compact-console`, read via a lazy `useState`
   initializer — no load-effect, no `react-hooks/set-state-in-effect`). When compact,
   the masthead/heading/event-toolbar hide (same `.compact.console-active` mechanism as
   before, generalized from the pre-existing `:fullscreen`-only rule) and the nav
   (now: a `PrepareSteps` block + `RUN AUCTION` + `AFTER AUCTION` — `TOOLS` is already a
   compact header dropdown, untouched) condenses to a one-line bar: phase tag, the
   `RUN AUCTION` console/sales quick-pills kept directly visible, the Compact view
   switch, and an inline `components/ui/collapsible.tsx` "All sections" toggle that
   expands the same unchanged `PrepareSteps`/`NavGroup` markup in place — no
   drawer/overlay, no duplicated JSX (`navGroups` is built once, reused in both the
   expanded and collapsed render paths).

## Files touched

`lib/sharing.ts` (new `openTvWindow` export), `app/operator.tsx` (compact state, nav
restructuring against the UI2 layout, TV link), `app/sharing.tsx` (two TV links
switched to the same helper, `TVInstructions` copy updated), `app/refinements.css`
(`.compact`, `.op-nav-compact`, `.op-nav-expanded`, `.compact-toggle`, `.nav-expand` —
using theme tokens like `var(--text-secondary)`, not hardcoded colors, matching the
S1/UI2 theming convention). No schema, API route, or business-rule change.

## Validation

- `node node_modules/typescript/bin/tsc --noEmit --incremental false`: PASS, no errors.
- `npm run build`: PASS, all build stages complete.
- `npm run lint`: **48 errors / 37 warnings — identical to the `main` baseline at
  `9c4319c`** (confirmed by rerunning lint on main itself with the same
  `--ignore-pattern .sites-runtime --ignore-pattern dist` the raw command otherwise
  picks up from stray build artifacts); zero new issues.
- `node tests/acceptance.mjs`: **58/58 PASS** against a freshly migrated local
  `.wrangler/state` in this worktree (both drizzle migrations applied fresh).
- `node tests/refinement.mjs`: **72/72 PASS**, same store.
- Local dev server booted and served 200 on `/` with the mock identity confirmed in
  its startup log.

### Still UNVERIFIED (browser/visual — same gap as the first pass, unchanged)

No rendered-browser check was possible in this environment: the Claude-in-Chrome
extension was not connected (retried before writing this doc), and this session's
available computer-use desktop control targets a different physical machine than the
one running this sandbox's dev server. **No Playwright/axe evidence, no screenshots.**
Specifically still open:

- Actual rendered layout/spacing of the compact bar and the expanded "All sections"
  collapsible at 1366×768, 1280×720, 1024×768 — whether the Hammer/bid row clears the
  fold has not been re-measured, the same acceptance bar `CAL-P3-007`'s rejected
  sticky-panel attempt was measured against.
- The TV popup window's real behavior on an actual OS (separate window, draggable to a
  second display, operator console independently interactive) — confirmed by code
  review (a real `window.open` popup, not `target="_blank"`), not observed live.
- Keyboard/focus behavior of the new Collapsible trigger and Switch, and axe/contrast
  on `.compact-toggle`/`.nav-current-tag`.
- Interaction with UI2's other new surfaces (Tools dropdown, HelpTip, local user
  accounts, theme quick-picker) under compact mode specifically — code review only;
  not exercised together in a live browser session.
- Physical multi-monitor behavior, other browser engines, screen readers.

## Rollback

Plain revert; no migration, no schema, no API contract change. Production container
unchanged — implemented and locally (statically) validated only, not deployed.

## Superseded branch

`claude/c2-tv-popup-compact-console` (worktree `edwards-county-calcutta-c2`) predates
S1 and UI2 and cannot be cleanly rebased — it targets deleted components. Left in place
rather than force-deleted; recommend deleting it once this branch is reviewed, unless
there's a reason to keep it as a reference.
