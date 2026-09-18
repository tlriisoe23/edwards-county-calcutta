# Batch L — UI3: flat operator tab bar, guided start, always-visible controls, two bug fixes

Implemented on `claude/ui3-flat-tabs-operator`, branched from `main` at `8405a8a` (after UI2 + C2
merged and deployed, Batch K). **Not an audit finding batch** — an owner-requested UI/UX pass over
the operator desk, recorded in the same non-audit pattern as UI2, plus two reported defects that
were reproduced before being fixed. No schema, API contract or business-rule change.

## 1. One flat tab bar (replaces RUN AUCTION / AFTER AUCTION)

The two `NavGroup` sections — their `RUN AUCTION` / `AFTER AUCTION` labels, their captions and the
`.nav-notes` `HelpTip` row each rendered below its tabs — are gone. In their place is a single
unlabelled strip: **Auction console · View and Edit Sales · Results · Settlement · Exports**
("Sales" renamed, moved out of the former RUN AUCTION group). The `NavGroup` component is deleted;
`NavItem` remains and now carries a hover tip instead of a note below the list.

**Return to console** (`.event-toolbar`, conditional on `tab !== 'console'` and LIVE/PAUSED) is
removed with its CSS — the console is the first tab in the same bar, one click away.

**Active-state affordance.** The active tab is drawn as the front edge of the panel below it, not
as a recoloured pill: it takes the page surface colour, gains a border on three sides, carries a
3 px `--selected` accent bar, and overlaps the strip's own 2 px rule so the rule is visibly notched
where the tab sits. Measured in-browser: active background equals `body` background, differs from
the inactive surface, `border-bottom-width: 0px` against the bar's `2px`.

> **Gotcha worth keeping.** Each tab is wrapped in a `ControlTip`, and when Radix Tooltip composes
> with Radix Tabs through `asChild` the **tooltip trigger's `data-slot` and `data-state` overwrite
> the tab's**. The first version of this CSS keyed off `[data-slot=tabs-trigger][data-state=active]`
> and therefore applied *nothing at all* — the JSX was right and the screen was wrong. The rules now
> key off `[role=tab][aria-selected=true]`, which Radix keeps correct on the element that is
> actually a tab. `app/refinements.css` carries this as a comment.

## 2. Prepare steps: step 4 renamed, step 5 added, TV placement asked once

Step 4 is **TV / Display Settings** (same action — opens Display & sharing). New step 5,
**Start Auction**, opens a dialog asking where the TV display should open, with the owner's context
note kept close to verbatim:

- *Open TV/Display on this screen* — "This window becomes the TV display. You will need to sign in
  to calcutta.edcogolf.org/admin from a different device to keep operating the auction."
- *Open on an external TV/Monitor* (tagged **Most operators**) — "The TV window that opens can be
  dragged to that screen and made full screen. You keep controlling everything from this device."

The external path calls the existing `openTvWindow()` (`lib/sharing.ts`) **synchronously inside the
click**, before the status write is awaited, so the popup blocker still sees a genuine user gesture
(the constraint Batch K established). The this-screen path navigates *this* window to the TV route
with `window.location.assign` — `fullscreen()` cannot survive a same-window navigation, so the TV
route's own **Full screen** button is the follow-on step and the dialog copy says the window becomes
the display. Both paths then run `act('status', { status: 'LIVE' })`.

**Decision — both entry points remain.** Step 5 is the guided first start (it is the only place the
TV placement question is asked); the in-console **Start / Resume / Restart** button stays because it
is also Resume from PAUSED and Restart from COMPLETED, which an operator needs mid-auction and where
the TV question is already answered. Both route through one `startAuction()` helper, so both start
the auction *and* scroll the tab bar to the top of the viewport, leaving the prepare block and the
event toolbar out of view. Verified for both.

**Secondary "AFTER AUCTION next to step 4" request:** folding those tabs into the same flat strip
already removed the stacked block, and the five prepare cards now sit on one row down to 1250 px.
No side-by-side layout was forced at narrow widths, per the instruction to treat it as polish.

## 3. Compact toggle, theme picker (and Undo) pinned to the masthead

`compactToggle` (was inline in the nav) and the theme quick-picker (was in `.event-toolbar`) now
live in `<header className="mast">`. **Load demo** and **Reset demo data** moved into the Tools
dropdown; the standalone `.demo-reset` panel is gone, and the working toolbar is down to the event
picker and **New event**.

The C2 rule `.compact.console-active .mast{display:none}` had to change — controls pinned to a
hidden header are not pinned to anything. The masthead now stays visible and shrinks to 54 px while
compact (`.admin-site.compact`, brand subtitle dropped).

**The "Auto" button was kept, not deleted.** It now carries a hover tip saying exactly what it does:
*"Compact view is manually set — click to let it follow the auction status automatically again."*
Verified in a browser: it appears only after a manual override, the tip renders on hover, clicking
it restores status-driven compact and the button removes itself.

**Undo moved to the masthead too — beyond the literal list, and here is why.** `.event-toolbar` is
hidden by the compact console, so **Undo last action was unreachable during a LIVE auction on the
console tab** (true on `main` as well — only the `U` shortcut worked). Item 5 below makes the undo
confirmation informative, which is worthless if the button is invisible exactly when a mistaken
hammer happens. It now sits with the other always-visible controls and is verified reachable while
LIVE. Flagging it explicitly as an addition to the requested scope.

**"Regardless of scroll position" — a scoped trade-off.** The masthead is `position: sticky`, but
**not on the auction console**. A sticky bar there costs ~74 px and pushed the Hammer row from
707 px to 814 px at 1366×768, past the fold — breaking the one-screen bar D-CAL-5 / CAL-P3-007 set
and that Batch I deferred a sticky panel over. The console is one screen and starting the auction
already pins the tab bar to the top, so there is nothing above to scroll past there; every other
tab (Teams, Sales, Settlement, Results) is long and does stick. Measured both ways.

## 4. Hover help on controls; the note blocks are gone

`.nav-notes` / the `HelpTip` list under each nav group is removed with its CSS. `app/help-tooltip.tsx`
gains **`ControlTip`**, which attaches help to a control the operator already uses rather than to a
separate info icon, built on the tooltip primitive (`components/ui/tooltip.tsx`) so it never takes
focus and never swallows the wrapped control's click. Applied to the five tabs, Public board, Launch
TV Display, Full screen, Complete, Start/Resume, Mark unsold, both Skip for now buttons, On block,
New event, Undo, Compact view, Auto and the Setup steps toggle — plain-language "what this does and
where it takes you", e.g. Sales: *"Every hammer on record — go here to correct a price, reopen or
void a sale."* Prepare step 1 gained the `help` text the other steps already had.

**Deviation, deliberate: Tools menu items describe themselves inline** (a `<small>` line under each
label) rather than on hover. A tooltip over an open dropdown covers the neighbouring items the
operator is reading past. Every one of the eight items now carries a description; verified in the
browser.

## 5. Undo confirmation names what it will undo

New `lib/audit.ts` mirrors the server's own selection (`route.ts`, case `"undo"`:
`before IS NOT NULL AND undone=0 AND action<>'undo'`) against the `meta.audit` rows the Activity tab
already reads — `create_event` / `load_demo` are excluded because `freshEvent` writes those rows
without a before-snapshot. **No new plumbing or API change was needed.** Both confirmations (the
`U` shortcut and the button) now read e.g. *"This will undo: Team skipped for now — Reed / Foster,
recorded 1:30 PM by op@test."*, with sales named by team and amount, and *"There is no recorded
action to undo yet."* on a fresh event — in which case the caller's follow-on sentence (version
check / audit trail) is deliberately *not* appended, so the dialog does not reassure you about a
correction that is not going to happen. The same sentence is the Undo button's hover tip.

## 6. Bug — Next Up arrows renumbered the lot without moving the team

**Reproduced first, in a browser, on the demo fixture.** Clicking *Move Reed / Foster up* changed
the displayed lot `07 → 06 → 05` across two clicks while the Next up list order never changed once.

**Cause.** `move()` swapped neighbours in the full `teams` array, but "Next up" is `teams` filtered
to `UPCOMING` and sliced to 8. From the top of that list the raw predecessor is the team **on the
block** (then already-sold teams), so the swap moved an upcoming team *above already-sold lots* —
renumbering, never reordering anything visible. Exactly matches "especially when starting from the
top of the Next Up list". Not a stale-closure or poll race: the 2 s refresh rebuilds the handler
each render and `act()` sends the full order under a revision check.

**Fix.** `reorderVisible()` (`lib/model.ts`) swaps a team with its neighbour **in the sequence the
operator can see**, then returns the complete id order to save. `move()` now takes that visible list
— `next` in the console queue, `filtered` in the roster table, which has the same defect under a
search/flight/status filter. At either end of the visible list it is a no-op instead of a silent
renumber.

**Regression test:** `tests/ui3-reorder.mjs` — 20 pure checks (10 reorder, 10 undo-description),
including the on-block-predecessor case, a hidden team between two visible ones, the filtered
roster, both boundaries and a single-row list. Plus four browser checks in `tests/ui3-browser.mjs`.

## 7. Bug — the page scrolled back to the top on its own

**Reproduced first**, by instrumenting `window.scrollTo` / `scrollIntoView` / `HTMLElement.focus`
and wheel-scrolling with the pointer over the page. On Teams & flights the scroll position jumped
`180 → 0 → 360 → 10` with a stack trace naming the cause — not the 2 s poll, not the keyboard-shortcut
effect, both of which were cleared.

**Cause.** `HelpTip` is a Radix **Popover**. On close Radix's `onCloseAutoFocus` calls
`trigger.focus()` *without* `preventScroll`, and these triggers sit in the nav at the top of the
page — so the browser scrolled the trigger back into view. The operator's pointer only had to cross
a help icon while scrolling: hover opened the tip, the page moved under the cursor, the pointer left,
and 100 ms later the close yanked the page up. A second defect from the same source: Radix also
focuses the popover **content** on open, so hovering a help icon **stole focus from the bid field**
mid-auction — confirmed, then fixed.

**Fix.** `HelpTip` suppresses both auto-focus behaviours (`onOpenAutoFocus` / `onCloseAutoFocus`
`preventDefault`). It is a tooltip, not a dialog: it must never move focus. Keyboard users still get
it on focus, and the content stays linked by `aria-describedby`. `ControlTip` is built on the
tooltip primitive, which has the correct behaviour by construction — so item 4's much larger number
of hover targets does not reintroduce this.

**Verified after:** every tab holds scroll steady across poll refreshes (max drift 0–4 px over 7 s,
instrumentation log empty), and focus stays in the bid field while hovering help.

## 8. Public board "Auction board" anchor

**Kept, made self-hiding** — rather than removed. The link is genuinely useful: `#board` sits below
the fold at 390 px and at 1080p, so it saves real scrolling. The complaint was that it stays visible
once you are already there. An `IntersectionObserver` on `#board` (`app/auction.tsx`, public route
only) hides it while the board is on screen and brings it back when you scroll up; its `title` is now
"Jump down to the complete field". Verified in all three states.

## Files touched

`app/operator.tsx` (nav restructure, prepare step 5 + dialog, masthead controls, Tools menu, tips,
`move()`, undo copy, `startAuction`/`scrollToTabs`), `app/help-tooltip.tsx` (focus fix, `ControlTip`),
`app/auction.tsx` (board anchor), `lib/model.ts` (`reorderVisible`), `lib/audit.ts` (**new**),
`app/refinements.css`, `app/globals.css` (two renamed selectors). New tests:
`tests/ui3-reorder.mjs`, `tests/ui3-browser.mjs`. No schema, API route or business-rule change.

## Validation

| Check | Result |
|---|---|
| `node node_modules/typescript/bin/tsc --noEmit --incremental false` | **PASS**, no errors |
| `npm run build` | **PASS**, all stages, routes unchanged |
| `npm run lint` (build artifacts excluded, as Batch K established) | **85 problems — 48 errors / 37 warnings, byte-identical to the `main` baseline**; zero new debt |
| `node tests/acceptance.mjs` | **58 / 58 PASS** |
| `node tests/refinement.mjs` | **72 / 72 PASS** |
| `node tests/ui3-reorder.mjs` (new) | **20 / 20 PASS** |
| `node tests/ui3-browser.mjs` (new, rendered) | **63 / 63 PASS** |
| Responsive containment 390 / 820 / 1366 / 1920 + TV 1920 | **PASS**, no horizontal overflow anywhere; TV one screen |
| Moved controls still *work*, not just render | **PASS** — the `U` shortcut opens the dialog with the new wording, Tools → Load demo creates an event, Tools → Reset demo data still gates on the typed `RESET DEMO DATA` confirmation |

**The `main` lint baseline was measured, not quoted**: a `git worktree` of `main` @ `8405a8a` was
linted with the same ignore patterns and produced 48 errors / 37 warnings, matching Batch K's record.
A per-rule, per-file diff of the two JSON reports was used to catch the two issues this branch did
briefly introduce (an unused `HelpTip` import, one unescaped apostrophe); both are fixed.

### Rendered-browser evidence — the gap Batches I and K left open is closed here

Unlike Batch K, this batch **was** exercised in a real browser (headless Chromium via Playwright,
resolved from a sibling checkout the way `tests/s1-browser.mjs` already supports). 63 assertions and
22 screenshots in [batch-l-evidence](batch-l-evidence/), at 1920×1080, 1366×768, 820 and 390:
[checks.json](batch-l-evidence/checks.json), [responsive.json](batch-l-evidence/responsive.json).
Reproduce: start the local dev server with a fresh store, then
`UI3_PLAYWRIGHT_MODULE=<path-to-an-installed-playwright> node tests/ui3-browser.mjs` and
`node docs/batch-l-evidence/responsive.mjs`. Both refuse a non-localhost origin.

**Console fold, measured against `main` at the same viewports** (a second dev server was run from
the `main` worktree for a true before/after):

| Viewport | `main` @ `8405a8a` | This branch | Fits |
|---|---|---|---|
| 1366×768 | 713 px | **707 px** | yes (both) |
| 1280×720 | 713 px | **707 px** | yes (both) |
| 1024×768 | 762 px | **756 px** | yes (both) |

The Hammer row clears the fold by a slightly wider margin than before: the `.op-nav-bar` now draws
the rule under the tabs, so the old `.op-nav` padding/border/margin that drew a second one was
removed. An intermediate version of this batch *did* regress that number to 744 px (over the fold at
1280×720 and 1024×768) before the duplicated spacing was found — recorded because a green build
would not have caught it.

### Still UNVERIFIED

- **Nothing here has been applied to production.** `ecgc-calcutta-app-1` still runs `ba0f0b3`
  (Batch K). No container, volume or Cloudflare route was touched. Deployment is a separate decision.
- Physical multi-monitor behaviour of the step 5 "external" path — the popup is confirmed to be a
  real separate window on the TV route, and dragging it to a second display is unchanged from
  Batch K's mechanism, but no second physical display was used.
- The "this screen" path was verified to navigate this window to the TV route and start the auction;
  the subsequent manual **Full screen** press on that route was not scripted.
- Only headless Chromium. No Firefox, Safari or WebKit; no screen reader; no axe/contrast rerun for
  the new tab-strip surfaces (the tokens are the existing themed ones, but that is inference, not a
  contrast measurement).
- Touch behaviour of `ControlTip` on a real touch device (tooltips do not fire on hover there;
  `HelpTip`'s tap-to-open path is unchanged and still covers the prepare cards).

## Rollback

Plain revert of the branch; no migration, no schema, no API contract change in either direction.
