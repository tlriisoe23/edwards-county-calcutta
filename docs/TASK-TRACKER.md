# Finding tracker and proposed batches

## Current planned work — 2026-09-17

- **UI3 operator desk refinement (Batch L):** owner-requested pass — one flat tab bar replacing the
  RUN AUCTION / AFTER AUCTION groups, prepare step 4 renamed and step 5 "Start Auction" with a TV
  placement dialog, compact toggle / theme picker / Undo pinned to the masthead, Load demo and Reset
  demo data moved into Tools, hover help on controls in place of the below-nav note blocks, an undo
  confirmation that names the action it will undo, and two reported defects reproduced and fixed
  (Next Up arrows renumbering instead of reordering; the page scrolling itself back to the top).
  IMPLEMENTED → VALIDATED (local, **including rendered-browser evidence**) on
  `claude/ui3-flat-tabs-operator`, branched from `main` @ `8405a8a`. **Not merged, not deployed** —
  the live container still runs `ba0f0b3`. See [BATCH-L.md](BATCH-L.md).
- **UI audit 2026-09-17 (`UI-CA-*`) — PROPOSED, not approved, nothing implemented.** A cleanliness /
  usability / readability pass over this product and the ECGC Leaderboard together. It was read on
  `claude/ui3-flat-tabs-operator` @ `775f1cf` (Batch L / UI3, **unmerged** — this branch and the live
  container both predate it), because UI3 is the direction the console is heading. **Every finding records
  whether it is `main + UI3`, a UI3 regression, or UI3-only**, so a UI3-only finding lapses if UI3 is
  abandoned and the `main + UI3` ones apply to what is deployed today. 34 findings in
  [UI-AUDIT-2026-09-17.md](UI-AUDIT-2026-09-17.md) §4 (0 P1, 15 P2, 19 P3) plus 10 cross-product `UI-X-*`
  items in §5; evidence in [ui-audit-2026-09-17-evidence/](ui-audit-2026-09-17-evidence/).
  **IDs are a separate series and do not collide with the `CAL-*` / `D-CAL-*` register below.** Each finding
  has an acceptance test and can be approved individually; the suggested first batch is §5.1.
  The `UI-LB-*` half lives in `ecgc-leaderboard/docs/UI-AUDIT-2026-09-17.md`.
  *Audit only — no source, schema, container or route was changed to produce it.*

## Current planned work — 2026-09-16

- **C1 Operator Navigation:** complete and merged; accepted foundation at `f4a7e77`.
- **S1 Purposeful Themes + Advanced Settings:** accepted by the human and **released** — committed as `494929b`, `task/s1-themes-advanced` fast-forwarded to the same commit, `ecgc-calcutta-app-1` rebuilt and healthy; see the dated entry in [CURRENT-STATE.md](CURRENT-STATE.md) for the read-only production verification performed in this session and its limits. [Scope and measured evidence](S1.md). Existing lint debt remains; physical hardware is unverified.
- **C2 Auction Night / dual-screen operation:** requirements below were recorded during S1 recovery. **Reworked, implemented and merged to `main`** (`d4b3709`, from `claude/c2v2-dual-screen-compact-console`) — a TV popup window instead of a same-window tab, and a state-driven compact console with a persistent override replacing the rejected sticky-panel approach to `CAL-P3-007`, rebuilt against the merged UI2 nav (Tools dropdown, Prepare step cards) after UI2 removed the four-`NavGroup`/`NavShortcut`/`NavHelp` layout the first C2 pass depended on — see [BATCH-K.md](BATCH-K.md). The original `claude/c2-tv-popup-compact-console` pass (worktree `edwards-county-calcutta-c2`) is superseded, kept only as a reference; it was never merged. tsc/lint/build/58-58/72-72 all passed pre-merge and tsc/build were re-verified clean immediately after merging. **Deployed** — `ecgc-calcutta-app-1` rebuilt 2026-09-17T14:01 UTC (same rebuild as UI2 above, same commit `ba0f0b3`); public routes read-only verified 200. Browser-rendered verification of the compact layout, and the TV popup window's real multi-window behavior, remain outstanding — not exercised against production or any live browser in this session.


### C2 requirements recorded during S1 recovery — not implemented

- Primary display is the operator desk; secondary display is the TV/fullscreen board. The operator must retain normal mouse/focus use on the primary monitor while TV remains on the secondary display.
- Investigate the reported fullscreen mouse/focus “capture” on actual dual-display hardware. Source inspection during S1 found no `requestPointerLock` or pointer-lock listener in app/components/lib; this is not a runtime or physical-hardware conclusion. Pointer lock must not be required.
- Improve **Launch TV Display** using the best supported multi-monitor/window-placement behavior, with a clear manual fallback when placement APIs/permissions are unavailable. Test focus changes and fullscreen retention on relevant browsers/OS combinations.
- Provide a compact **Auction Night** operating layout for LIVE/PAUSED: core controls fit a typical 1366×768 working viewport without routine vertical scrolling. Current lot/team, bid controls, buyer/bidder, increment, Sold/advance and Pause/correction dominate.
- Collapse or de-emphasize PREPARE / AFTER AUCTION / TOOLS during active operation while keeping them accessible. Preserve C1’s accepted information architecture; adapt density rather than replacing navigation.
- Acceptance must include actual two-display operator/TV use and the reported focus issue. S1’s browser viewport checks cannot close C2.


Separate approved portability work now has a [hosting implementation](PORTABLE-HOSTING.md)
and [validation record](PORTABLE-VALIDATION.md). Remaining: configure real Google
credentials and owner recovery password; verify owner-data import/cutover; configure
HTTPS/DNS and off-host backup retention. This does not approve optional Batch E.

2026-09-15 UTC · A/B/C/D approved and verified locally (`4dc2900`, `3d00923`, `4da7b9b`, `a76e57f`) · **F, G, H and I approved, merged to `main`, and redeployed to the live `ecgc-calcutta-app-1` container** (CAL-P3-007 deferred) · optional E awaits approval · production deployment has been performed for the merged branch.

The canonical description, reproduction, confidence and acceptance for every ID is in [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md). Do not renumber an ID when its status changes; append validation evidence and a commit reference after an approved fix. A source change is not verified until its acceptance passes, and a local pass is not hosted verification.

## Owner scope 2026-09-18 — requested, not started

Written as task prompts: each carries enough context to be picked up without the conversation that
produced it. Nothing here is approved for implementation. The leaderboard's half of the same list is
in [ecgc-leaderboard/docs/TASK-TRACKER.md](../../ecgc-leaderboard/docs/TASK-TRACKER.md) under
"Owner scope 2026-09-18"; the two are deliberately separate, per the isolation this repository's
AGENTS.md sets out.

| ID | Task |
|---|---|
| WC-1 | **Make the admin sign-in page look like the leaderboard's.** The two products sit in one clubhouse and share volunteers; their sign-in screens should not look like different software. Compare `portable/auth-handler.mjs` here with the leaderboard's and bring this one to match. |
| WC-2 | **Local login without an email address.** This product already has Local Users (Tools → Local Users, UI2-G) and the leaderboard does not — so this half is the model, not the follower. Give local accounts their own section keyed by **username and password, no email address**, and call it a **local login** rather than a recovery login. The leaderboard's matching task is W-1; do them together so the two products end up with one model rather than two. |
| WC-3 | **Remove the leftover inline help words.** *Results* under the Results button, *Settlement* under the Settlement button, *Sales* under the auction console — small help words with context popups that were never reviewed. Remove them, and move anything worth keeping into a click-to-open disclosure like the leaderboard's "Keyboard and rules", **made to look like something you can click**. The leaderboard's matching task is W-6, and it improves that styling first for this one to copy. |
| WC-4 | **There is no way to delete an event.** Same gap the leaderboard had until 2026-09-18: an event can be hidden but never removed, so a demo loaded once stays forever. The leaderboard's `deleteEvent()` in `lib/store.ts` is the model — snapshots and dependent rows first, version-checked, the active pointer cleared, refused while anything is locked, and a confirmation that names what goes. **This product holds real settlement records, so the guards matter more here, not less**: a deleted event takes its sales, ownership splits, payments and audit trail with it. |
| WC-5 | **Step 5 and the auction controls** (from the owner's list, recorded as written: *"Make step 5 and move auction"*). The intent is not clear from the note alone and needs a sentence from the owner before it is worked on. It is very likely the same ground as **UI-CA-16**, which found the Prepare step 5 card renders identically while LIVE, PAUSED and COMPLETED, and that restarting a completed auction takes one unconfirmed click. |
| WC-6 | **Import teams from the leaderboard.** Today they are retyped or pasted by hand. The leaderboard's side of this is W-9/O-10, which specifies the format this product's bulk import already parses — `team · player 1 · player 2 · flight · handicap` — with the Calcutta pop carried in the handicap column. Whether it stays a paste or becomes a sync is a decision the owner has to make first, because a sync crosses the isolation both repositories' AGENTS.md set out (see the leaderboard's D-LB-50..52). |
| WC-7 | **A 50-team fixture matching the leaderboard's new demo.** The leaderboard is gaining a 50-team, two-day, two-man demo (W-2); this product needs the same 50 teams so a full evening — flights, auction, settlement — can be rehearsed against the format actually being run. |
| WC-8 | **An auto-scrolling public/TV board, and the Calcutta equivalent of the leaderboard's.** The owner wants a continuously scrolling option rather than a paging slideshow, and a Calcutta board that matches the leaderboard's exactly with one extra column for the pop. The leaderboard's side is W-8. Note this product's TV is already the best screen in either app per the 2026-09-17 audit — **do not regress it** to gain a scroll mode. |

## Stable register

| ID | Severity/category | Title | Status | Batch |
|---|---|---|---|---|
| CAL-P1-001 | P1 RELIABILITY | Event context lost on refresh/navigation | RESOLVED LOCAL — `4dc2900`, [evidence](BATCH-A.md) | A |
| CAL-P1-002 | P1 SECURITY/PRIVACY | Rejected access change can still apply | RESOLVED LOCAL — `4dc2900`, [evidence](BATCH-A.md); hosted roles pending | A |
| CAL-P1-003 | P1 DEFECT | Signed financial CSV becomes text | RESOLVED LOCAL — `3d00923`, [evidence](BATCH-B.md) | B |
| CAL-P1-004 | P1 USABILITY DEFECT | Public/TV content clips and overlaps | RESOLVED LOCAL — `4da7b9b`, [evidence](BATCH-C.md); hardware pending | C |
| CAL-P1-005 | P1 BUSINESS RULE | Collection summary offsets other buyers' debts | RESOLVED LOCAL — `3d00923`, [evidence](BATCH-B.md), includes reproduced payout equivalent | B |
| CAL-P2-001 | P2 DEFECT | Quoted pipe/tab breaks CSV delimiter detection | RESOLVED LOCAL — `a76e57f`, [evidence](BATCH-D.md) | D |
| CAL-P2-002 | P2 RELIABILITY | Repeated creation request creates two events | RESOLVED LOCAL — `a76e57f`, [evidence](BATCH-D.md), includes demo | D |
| CAL-P2-003 | P2 ACCESSIBILITY | Recent-sales caption contrast 3.77:1 | RESOLVED LOCAL — `4da7b9b`, [evidence](BATCH-C.md); now 6.02/6.21:1 | C |
| CAL-P3-001 | P3 TECHNICAL DEBT | Distributed export contracts | OPEN — optional, awaiting approval | E |
| CAL-P2-004 | P2 USABILITY / ACCESSIBILITY | Icon-less header links (operator Sign out, public Auction board) vanish at ≤ 700 px but stay focusable | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [evidence](BATCH-F.md): all header controls 24 × 24 px, named and focus-visible at 320–700 px | F |
| CAL-P2-005 | P2 USABILITY DEFECT | TV stats overlap and page scrolls at 951–1099 px wide or < 700 px tall (1024×768, 1093×614) | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [evidence](BATCH-F.md): one screen and contained statistics at 960×540 … 1920×1080, live/paused/completed; hardware pending | F |
| CAL-P2-006 | P2 USABILITY | Escape with buyer suggestions open discards the whole Sold dialog | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-G.md](BATCH-G.md), [evidence](batch-g-evidence/batch-g.json) | G |
| CAL-P2-007 | P2 ACCESSIBILITY | Lot numbers 3.27:1, sale buyer line 4.01:1, payout % 4.01:1, inactive operator tabs 3.70:1, eyebrow 4.27:1 | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-H.md](BATCH-H.md), [evidence](batch-h-evidence/batch-h.json): now 5.34 / 4.88 / 5.70 / 5.27 / 5.27, axe 0 contrast nodes on public, TV, console, Settlement, Exports | H |
| CAL-P3-002 | P3 ACCESSIBILITY | Flight and settlement filter tabs reference non-existent panels | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-H.md](BATCH-H.md): real `TabsContent` panels, arrow keys and Tab order unchanged, axe `aria-valid-attr-value` clean | H |
| CAL-P3-003 | P3 USABILITY | Cleared minimum bid / deduction saves 0 with “Saved” | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-I.md](BATCH-I.md), [evidence](batch-i-evidence/batch-i.json): blank or < $1.00 minimum blocked client- and server-side with “Enter a minimum starting bid of at least $1.00”; Percent/Fixed deduction must be > 0, *None* is the only no-cut | I |
| CAL-P3-004 | P3 USABILITY | Import preview blocks import without marking invalid rows | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-I.md](BATCH-I.md), [evidence](batch-i-evidence/import-preview-marked-1280.png): per-row “flight not found / name required / index must be a number”, button “Import N teams · M rows need attention”, import still atomic | I |
| CAL-P3-005 | P3 USABILITY | Access tab accepts owner email; duplicate grants report “Saved” | IMPLEMENTED — merged to `main` and deployed on `ecgc-calcutta-app-1` after the 2026-09-15 rebuild; [BATCH-I.md](BATCH-I.md), [evidence](batch-i-evidence/checks.json): owner email → “already an owner”, duplicate → “already has access”, neither writes a row or audit entry; owners listed read-only above operators | I |
| CAL-P3-006 | P3 BUSINESS RULE | Unsold team can take a finishing place; empty states then contradict | OPEN — policy recorded 2026-09-15 (house receives unclaimed share; house returns to pot or keeps) | J (proposed) |
| CAL-P3-007 | P3 USABILITY | Hammer / bid entry below the fold on first paint at 1280×720 / 1024×768 | DEFERRED (Batch I, D-CAL-5) — a sticky bid panel cannot keep team and current bid visible: even with a compacted panel and block it still covers 76 / 65 px of the bid at 1280×720 / 1024×768 ([sticky-experiment.json](batch-i-evidence/sticky-experiment.json)); meeting the proviso needs ~260 px out of the operator header stack, not a small layout change. Remains an optional observation | I (deferred) |

After audit E2 (2026-09-15, `d992d1c`) and Batches F, G, H and I: **no open P2 and three open P3 (one optional debt, one policy-gated, one deferred optional observation); no open P1; P0: none demonstrated.** CAL-P2-004/005 (Batch F), CAL-P2-006 (Batch G, stacked on F), CAL-P2-007 / CAL-P3-002 (Batch H, stacked on G) and CAL-P3-003/004/005 (Batch I, stacked on H; CAL-P3-007 deferred) are implemented and validated locally on their branches and remain unmerged and undeployed. Canonical descriptions for the new IDs are in [PRODUCT-AUDIT.md § Incremental audit E2](PRODUCT-AUDIT.md#incremental-audit-e2--2026-09-15). Local resolution does not waive the blocked hosted gates in [VALIDATION.md](VALIDATION.md).

## Proposed implementation roadmap

### Batch A — Event context and access guarantees

- **Status:** APPROVED → IMPLEMENTED → VERIFIED LOCAL, commit `4dc2900`. [Batch A report](BATCH-A.md): 27 focused API/role checks, 130 existing regression checks, 1,000 seeded allocation cases and 10 browser observation groups passed. Two pre-existing CSV probes remain failing outside this scope. No migration or deployment.
- **Exact IDs:** `CAL-P1-001`, `CAL-P1-002`.
- **Objective:** Keep actions/viewers tied to the event the user selected and make an access-change response accurately reflect durable access state.
- **Why together:** Both prevent the operator/owner acting with a false understanding of current context or saved state. They are bounded reliability protections, not new features.
- **Expected areas:** `app/auction.tsx`, related navigation in operator/sharing; `app/api/admin/route.ts`, access/audit transaction boundaries and focused tests.
- **Risk:** Medium-high: browser history, polling event changes and authorization transactions require careful regression. A migration is not presumed authorized; propose one only if demonstrably needed and separately reviewable.
- **Acceptance:** A/B selector + reload/back/forward + public↔TV links retain ID; dirty drafts remain event-isolated; stale responses never replace current event. Access invalid-event/audit failure changes nothing; success commits audit/access together; repeated requests remain consistent; owner-only guard stays enforced.
- **Regression surface:** Event creation/selection, live refresh, admin/public/TV links, sharing QR, access grant/revoke, concurrent stale actions, audit visibility. Hosted distinct-user revocation remains a later gate.
- **Order:** 1 — completed locally.

### Batch B — Financial summaries and exported signed values

- **Status:** APPROVED → IMPLEMENTED → VERIFIED LOCAL, commit `3d00923`. [Batch B report](BATCH-B.md): 33 focused checks, 21 independent file checks, 141 existing regression/workflow checks, 1,000 seeded cases and six browser groups passed. One quoted-delimiter probe remains failing outside scope. No migration or deployment.
- **Exact IDs:** `CAL-P1-003`, `CAL-P1-005`.
- **Objective:** Make collector summaries and downloaded financial columns independently reconcilable without changing party history or payout formulas.
- **Why together:** Both affect a treasurer's interpretation of already-correct signed ledger records.
- **Expected areas:** `lib/settlement.ts`, `lib/exports.ts`, `lib/model.ts`, settlement/print/export UI labels, actual-file tests.
- **Risk:** High regression sensitivity around money; scope must preserve integer cents, party ownership, receipts/payables separation and formula-safe untrusted text. No automatic refund/transfer/netting feature.
- **Acceptance:** Positive debts and credits reported separately; signed party balances unchanged. Receipt/payout reversals and negative balances export as numeric amounts and reconcile through an independent CSV reader; text injection fixtures remain escaped. Re-run 1,000 seeded oracle cases and settlement/correction/undo suites.
- **Regression surface:** Every export/download variant, payment history, Mark paid, correction/reversal/undo, receipt/payable totals, print summary. Review analogous payable aggregation with an explicit test before broadening a correction.
- **Order:** 2 — completed locally.

### Batch C — Public/TV containment and readable captions

- **Status:** APPROVED → IMPLEMENTED → VERIFIED LOCAL, commit `4da7b9b`. [Batch C report](BATCH-C.md): final TV state/long-name matrix, phone/tablet/notification containment, filters and caption contrast passed; 130 existing scripted checks, TypeScript and production build passed. CSS-only; no migration or deployment.

- **Exact IDs:** `CAL-P1-004`, `CAL-P2-003`.
- **Objective:** Keep the whole bid and essential summary content readable on normal/scaled TVs and phones while retaining the existing visual design.
- **Why together:** Both are bounded spectator display corrections with overlapping CSS and visual regression needs.
- **Expected areas:** `app/globals.css`, relevant responsive/refinement rules, shared Block/Stats/recent layouts in `app/auction.tsx`.
- **Risk:** Medium: typography/grid changes can affect public, TV and operator shared components.
- **Acceptance:** 1920×1080 and 1366×768 TV, live/paused/completed, four flights, short/long names and max per-bid value show no clipping/overlap or normal TV scrolling; public 320/390/430 preserves full price and usable filters; caption contrast ≥4.5:1. Use screenshots and within-container bounds, not only page size.
- **Regression surface:** Operator shared block/tablet, public filters/pools, recent sale toast, display flags, completed metrics, reduced-motion styles. Actual fullscreen/projector remains a later hardware gate.
- **Order:** 3 — completed locally; physical clubhouse display rehearsal remains a later gate.

### Batch D — Reliable setup import and creation retries

- **Status:** APPROVED → IMPLEMENTED → VERIFIED LOCAL, commit `a76e57f`. [Batch D report](BATCH-D.md): 42 focused checks, 20 Batch A assertions, 130 existing checks, 1,000 allocation cases and all three CSV probes passed; four browser groups, TypeScript and final build passed. No migration or deployment.

- **Exact IDs:** `CAL-P2-001`, `CAL-P2-002`.
- **Objective:** Accept valid roster text and avoid duplicate events when creation requests repeat.
- **Why together:** Both reduce pre-auction setup rework and ambiguous duplicate records; neither changes auction rules.
- **Expected areas:** `lib/model.ts` delimiter parsing, import preview/validation, creation branch in `app/api/admin/route.ts` and request-result persistence.
- **Risk:** Medium: import formats and intentional event creation semantics must remain compatible.
- **Acceptance:** Quoted pipe/tab/comma/quote/newline/Unicode fixtures preview correctly; 100-team atomic import works; malformed rows do not partially save. Same create UUID sequential/concurrent returns one event; distinct IDs create separate events; include load_demo replay tests. Batch A event context tests stay green.
- **Regression surface:** Quick/team import, roster export round-trip, flights/players mapping, new event/demo/defaults, audit and newest-event fallback.
- **Order:** 4 — completed locally, preserving Batch A event-context behavior.

### Batch E — Explicit export contracts (optional)

- **Exact IDs:** `CAL-P3-001` only.
- **Objective:** Reduce future divergence between in-tab downloads and central exports while preserving their intentional formats.
- **Why together:** Single small debt project; no broad application refactor included.
- **Expected areas:** In-tab CSV functions in `app/operator.tsx`, `lib/exports.ts`, serializer contracts and focused format tests/documentation.
- **Risk:** Low-medium if schema differences are made explicit; higher if formats are silently unified, which is not approved scope.
- **Acceptance:** Existing download buttons keep their promised columns, roster reimport compatibility and privacy policy; financial files reconcile; shared contracts do not contain duplicate row mappings. No new dependency unless justified.
- **Regression surface:** All existing CSV variants and importer. Perform after B/D so cleanup preserves corrected behavior.
- **Order:** 5, optional after user-visible defects; do not treat it as a release blocker by itself.

### Batch F — Phone header controls and TV intermediate widths (implemented locally)

- **Status:** APPROVED 2026-09-15 · IMPLEMENTED (local) and validated on `claude/cal-f-phone-header-tv`, see [BATCH-F.md](BATCH-F.md). **Since merged to `main` and deployed on `ecgc-calcutta-app-1`** (see the Stable register above, CAL-P2-004/005). Decision recorded: one-screen TV **is** required below 700 px height (1366×768 at 125 % scaling = 1093×614); implemented down to 951 × 500 px.
- **Exact IDs:** `CAL-P2-004`, `CAL-P2-005`.
- **Objective:** Every header control remains usable at phone width (operator can sign out); the TV view stays readable at 960–1099 px wide and under 700 px tall.
- **Why together:** Both are bounded responsive CSS corrections to shared header/TV rules introduced or left by earlier layout work; neither touches data or rules.
- **Expected areas:** `app/globals.css` (phone `.mast nav`, TV grid thresholds and `.tv .stats strong` sizing); an icon or visible text on the Sign out and `#board` anchors in `app/operator.tsx` / `app/auction.tsx`.
- **Risk:** Low–medium; shared header and TV CSS need the existing Batch C matrix rerun.
- **Acceptance:** Header controls non-zero, named and focus-visible at 320/390/430/700/701 px on `/` and `/admin`; TV live/paused/completed contain all statistics at 960×540, 1024×768, 1093×614, 1099×618, 1100×619, 1280×720 plus the existing 1366×768 / 1920×1080 checks. Decision needed: whether one-screen TV is required below 700 px height.
- **Order:** 6 — recommended first of the E2 batches (spectator display and phone operator).

### Batch G — Sold dialog Escape (implemented locally)

- **Status:** APPROVED 2026-09-15 · IMPLEMENTED (local) and validated on `claude/cal-g-sold-dialog-escape` (stacked on the Batch F branch), see [BATCH-G.md](BATCH-G.md). **Since merged to `main` and deployed on `ecgc-calcutta-app-1`** (see the Stable register above, CAL-P2-006). Implemented as an `onEscapeKeyDown` guard on the Sold `DialogContent`; shared dialog/combobox primitives unchanged.
- **Exact IDs:** `CAL-P2-006`.
- **Objective:** Escape dismisses buyer suggestions before it dismisses the sale.
- **Expected areas:** `app/auction-controls.tsx` `SoldDialog`; `components/ui/combobox.tsx` or `components/ui/dialog.tsx` escape handling.
- **Risk:** Low; verify stale-dialog, inline buyer creation and keyboard shortcut suppression still pass.
- **Acceptance:** Keyboard-only: type → Escape keeps dialog and focus → Escape closes; Cancel/Confirm unchanged; one-click “Add buyer here” with the list open still works.
- **Order:** 7.

### Batch H — Contrast and filter semantics (implemented locally)

- **Status:** APPROVED 2026-09-15 · IMPLEMENTED (local) and validated on `claude/cal-h-contrast-tabs` (stacked on the Batch G branch), see [BATCH-H.md](BATCH-H.md). **Since merged to `main` and deployed on `ecgc-calcutta-app-1`** (see the Stable register above, CAL-P2-007/CAL-P3-002). Token-level fix (`--muted-foreground` → `#5c6a5f`, new `--lot-foreground` `#636e60`, tab trigger `text-muted-foreground`); the filter tabs gained real `TabsContent` panels rather than switching to toggle buttons, keeping arrow-key behaviour unchanged.
- **Exact IDs:** `CAL-P2-007`, `CAL-P3-002`.
- **Objective:** The five listed supporting texts meet 4.5:1; filter tabs reference real panels or use non-tab semantics.
- **Expected areas:** `app/globals.css` colour tokens, `components/ui/tabs.tsx` trigger colour, `app/auction.tsx` board tools, `app/settlement.tsx` settlement tools.
- **Risk:** Low; visual regression only.
- **Acceptance:** Computed ratios ≥ 4.5:1 on public, TV and operator; axe reports no serious `color-contrast` and no `aria-valid-attr-value` on `/`, `/tv`, operator console, Settlement, Exports.
- **Order:** 8.

### Batch I — Operator data-entry feedback (implemented locally)

- **Status:** APPROVED 2026-09-15 (D-CAL-2…5) · `CAL-P3-003/004/005` IMPLEMENTED (local) and validated on `claude/cal-i-data-entry` (stacked on the Batch H branch), see [BATCH-I.md](BATCH-I.md); `CAL-P3-007` DEFERRED under D-CAL-5 with measurements (a sticky panel would cover the current bid at both laptop sizes) — since addressed architecturally by Batch K/C2, see the Stable register above. **`CAL-P3-003/004/005` since merged to `main` and deployed on `ecgc-calcutta-app-1`.** Harness 17/17 on the implemented IDs, focused suite 43/43 (server rules, Access, Batch A access and Batch D import reruns), acceptance 58/58, refinement 72/72.
- **Exact IDs:** `CAL-P3-003`, `CAL-P3-004`, `CAL-P3-005`; `CAL-P3-007` optional.
- **Objective:** No silent zero settings, identified invalid import rows, honest Access messages; optionally keep the Hammer above the fold on laptops.
- **Expected areas:** `app/rules.tsx`, `app/editors.tsx`, `app/operator.tsx` Access form, `app/api/admin/route.ts` messages (no schema).
- **Risk:** Low–medium; decision needed on whether $0 minimum / 0 % deduction remain legal.
- **Acceptance:** Per finding in PRODUCT-AUDIT; rerun import fixtures from Batch D and the Access checks from Batch A.
- **Order:** 9.

### Batch J — Unclaimed purse to the house (proposed)

- **Status:** PROPOSED, awaiting approval. Policy recorded 2026-09-15 by the owner: an unclaimed purse share (place held by an unsold team) goes to the house; the house then chooses, per event, to add it back to the winners' pot or keep it.
- **Exact IDs:** `CAL-P3-006`.
- **Objective:** Placing an unsold team is legal; Results and Settlement show the unclaimed amount and the house's choice explicitly instead of empty-state copy that says results are missing.
- **Expected areas:** `lib/model.ts` `compute()` (house-retained vs redistributed unclaimed share), a per-event house choice and Results-panel messaging in `app/rules.tsx`, settlement messaging in `app/settlement.tsx`, seeded oracle cases in `tests/audit-math.mjs`.
- **Risk:** Medium — changes money arithmetic; the independent BigInt oracle must be extended with the new rule before `compute()` changes, and redistribution must remain cent-exact under largest-remainder.
- **Acceptance:** Both house choices produce cent-exact totals that reconcile against the oracle; existing 1,000 seeded cases unchanged when no place is unclaimed; explicit messages in Results and Settlement.
- **Order:** after F–I; route through `approved-findings-implementation`.

## User scope 2026-09-17 — UI2 purposeful UI refinement

Not an audit finding: an owner-requested UI/UX refinement pass (Tools menu, contextual help,
top-level theme selector, Prepare 1–4 redesign, TV auction-board polish, statistics hierarchy and
semantic team-count color, local user accounts). Recorded here in the same non-audit pattern used
for Leaderboard's L2/L3/R1 scope; does not approve anything else listed in this tracker.

| ID | Scope | Status | Record |
|---|---|---|---|
| UI2-A…F | Tools dropdown, Prepare 1–4 redesign, theme quick-select, contextual `HelpTip`, TV bid-pulse/sold-settle animation, statistics hierarchy + semantic team-count color | IMPLEMENTED → VALIDATED (local) on `claude/ui2-refinement`, off clean `main` @ `cf3c0ca`. Merged to `main` as `9c4319c` on 2026-09-17. **Deployed** — `ecgc-calcutta-app-1` rebuilt 2026-09-17T14:01 UTC; public routes read-only verified 200; operator-side (Tools dropdown, theme picker, Local Users) not exercised against production. | [BATCH-CAL-UI2.md](BATCH-CAL-UI2.md) |
| UI2-G | Local user accounts (Tools → Local Users), operator-level only, scrypt-hashed, portable-runtime-only | IMPLEMENTED → VALIDATED (local): `npm run test:portable` end-to-end incl. a real HTTP sign-in as a created local operator; owner-gated admin actions exercised against a live portable server; plain-build stub fails loudly, verified in-browser | [BATCH-CAL-UI2.md](BATCH-CAL-UI2.md) |
| UI2-H | Responsive/TV `clamp()` audit at 1366×768/1920×1080/2560×1440/3840×2160 + narrow width | VALIDATED (local) — no source change needed; existing S1 proportional-typography system scales correctly through everything UI2 added; keyboard/focus and reduced-motion verified programmatically | [BATCH-CAL-UI2.md](BATCH-CAL-UI2.md) |

## User scope 2026-09-17 — UI3 operator desk refinement (Batch L)

Not an audit finding: a second owner-requested UI/UX pass over the operator desk, recorded in the
same non-audit pattern as UI2. Items 6 and 7 are reported defects, reproduced in a browser before
being fixed. Does not approve anything else listed in this tracker.

| ID | Scope | Status | Record |
|---|---|---|---|
| UI3-1 | One flat, unlabelled tab bar (Auction console · View and Edit Sales · Results · Settlement · Exports); `NavGroup`, its captions and *Return to console* removed; active tab drawn as the front edge of the panel below it | IMPLEMENTED → VALIDATED (local, rendered) | [BATCH-L.md](BATCH-L.md) |
| UI3-2 | Prepare step 4 → *TV / Display Settings*; new step 5 *Start Auction* with the TV-placement dialog; both entry points start the auction and scroll the tab bar to the top | IMPLEMENTED → VALIDATED (local, rendered). Decision recorded: step 5 and the in-console Start/Resume both remain | [BATCH-L.md](BATCH-L.md) |
| UI3-3 | Compact toggle, theme picker and Undo pinned to the masthead; Load demo + Reset demo data into Tools; *Auto* kept and explained, not deleted | IMPLEMENTED → VALIDATED (local, rendered). Trade-off recorded: the masthead sticks on every tab **except** the console, where a sticky bar breaks the D-CAL-5 / CAL-P3-007 one-screen bar | [BATCH-L.md](BATCH-L.md) |
| UI3-4 | `.nav-notes` blocks removed; new `ControlTip` hover help on 19 rendered controls (15 sites); Tools items describe themselves inline | IMPLEMENTED → VALIDATED (local, rendered). Deviation recorded: inline descriptions for dropdown items instead of hover | [BATCH-L.md](BATCH-L.md) |
| UI3-5 | Undo confirmation names the actual action, record, time and operator, from existing `meta.audit` — no new plumbing | IMPLEMENTED → VALIDATED (local, rendered + 10 unit checks) | [BATCH-L.md](BATCH-L.md) |
| UI3-6 | **Bug:** Next Up / roster arrows renumbered the lot without moving the team. Cause: `move()` swapped neighbours in the full `teams` array while the visible list is filtered. Fixed by `reorderVisible()` | REPRODUCED → FIXED → VALIDATED (local, rendered + 10 reorder unit checks in `tests/ui3-reorder.mjs`) | [BATCH-L.md](BATCH-L.md) |
| UI3-7 | **Bug:** the operator page scrolled itself back to the top. Cause: Radix Popover's `onCloseAutoFocus` refocusing a nav `HelpTip` trigger without `preventScroll`; same source also stole focus from the bid field on hover | REPRODUCED (instrumented stack trace) → FIXED → VALIDATED (local, rendered) | [BATCH-L.md](BATCH-L.md) |
| UI3-8 | Public board `#board` anchor kept but self-hiding via `IntersectionObserver` while the board is in view | IMPLEMENTED → VALIDATED (local, rendered). Decision recorded: kept rather than removed — the board is below the fold at 390 px and at 1080p | [BATCH-L.md](BATCH-L.md) |

## Future ideas, not authorized

Recorded only so the idea is not lost. **Nothing here is approved, scoped or started, and none of it
may be built without an explicit, separate go-ahead.**

- **Offline operation for venues without internet access.** The owner raised wanting to explore a
  version of the app that can run an auction at a venue with no connectivity. Nothing has been
  designed or estimated. It would touch areas this project currently treats as settled — the
  operator/board/TV split all assume a reachable server, and the portable container still expects a
  network for its Cloudflare tunnel and Google sign-in — so it needs its own requirements pass,
  decision record and approval before any code. Not part of Batch L.

## Completed original audit work

- Reconciled all requested current capabilities against code and test evidence.
- Created project/architecture/current-state/validation/coverage/audit/tracker foundation and durable synthetic evidence.
- Performed original suites, independent seeded oracle, expanded API/export/queue/correction tests, keyboard and four-tab journeys, responsive/contrast review, isolated outage/restart and scale checks.
- Kept product code and schema unchanged; preserved user review and isolated all mutation fixtures.
- Recorded interrupted harness attempts and unavailable hosted/hardware checks without passing them.

## Compact handoff

**Remaining optional scope: Batch E, exact ID `CAL-P3-001`.** A/B/C/D are complete locally. All eight original findings are resolved locally; E is not a release blocker by itself. **Audit E2 (2026-09-15) adds proposed Batches F–I (CAL-P2-004…007, CAL-P3-002…005/007) and one policy-gated item (CAL-P3-006). Batch F (CAL-P2-004/005), Batch G (CAL-P2-006), Batch H (CAL-P2-007, CAL-P3-002) and Batch I (CAL-P3-003/004/005; CAL-P3-007 deferred per D-CAL-5) were each approved and are implemented and validated locally on stacked branches `claude/cal-f-phone-header-tv` → `claude/cal-g-sold-dialog-escape` → `claude/cal-h-contrast-tabs` → `claude/cal-i-data-entry` — unmerged, undeployed ([BATCH-F.md](BATCH-F.md), [BATCH-G.md](BATCH-G.md), [BATCH-H.md](BATCH-H.md), [BATCH-I.md](BATCH-I.md)). J has its owner decision recorded in [DECISIONS.md](DECISIONS.md) (D-CAL-6) but was not part of those approvals.** Do not implement E or J merely because they are listed here; each needs its own explicit go-ahead. After the user approves the next bounded set, preserve KEEP / PROTECT, run its focused reproductions and relevant regression suites, and update this tracker with evidence. Deployment needs separate authorization; the live container was not changed by the audit.
