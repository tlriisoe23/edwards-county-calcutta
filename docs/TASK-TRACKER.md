# Finding tracker and proposed batches

Separate approved portability work now has a [hosting implementation](PORTABLE-HOSTING.md)
and [validation record](PORTABLE-VALIDATION.md). Remaining: configure real Google
credentials and owner recovery password; verify owner-data import/cutover; configure
HTTPS/DNS and off-host backup retention. This does not approve optional Batch E.

2026-09-14 UTC · A/B/C/D approved and verified locally (`4dc2900`, `3d00923`, `4da7b9b`, `a76e57f`) · optional E awaits approval · no production deployment authorized.

The canonical description, reproduction, confidence and acceptance for every ID is in [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md). Do not renumber an ID when its status changes; append validation evidence and a commit reference after an approved fix. A source change is not verified until its acceptance passes, and a local pass is not hosted verification.

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
| CAL-P2-004 | P2 USABILITY / ACCESSIBILITY | Icon-less header links (operator Sign out, public Auction board) vanish at ≤ 700 px but stay focusable | OPEN — audit E2 2026-09-15, [evidence](audit-e2-evidence/header-links.json) | F |
| CAL-P2-005 | P2 USABILITY DEFECT | TV stats overlap and page scrolls at 951–1099 px wide or < 700 px tall (1024×768, 1093×614) | OPEN — audit E2, [evidence](audit-e2-evidence/followup.json) | F |
| CAL-P2-006 | P2 USABILITY | Escape with buyer suggestions open discards the whole Sold dialog | OPEN — audit E2, [evidence](audit-e2-evidence/new-event-journey-3.json) | G |
| CAL-P2-007 | P2 ACCESSIBILITY | Lot numbers 3.27:1, sale buyer line 4.01:1, payout % 4.01:1, inactive operator tabs 3.70:1, eyebrow 4.27:1 | OPEN — audit E2, [evidence](audit-e2-evidence/followup.json) | H |
| CAL-P3-002 | P3 ACCESSIBILITY | Flight and settlement filter tabs reference non-existent panels | OPEN — audit E2 | H |
| CAL-P3-003 | P3 USABILITY | Cleared minimum bid / deduction saves 0 with “Saved” | OPEN — audit E2, [evidence](audit-e2-evidence/rules-validation.json) | I |
| CAL-P3-004 | P3 USABILITY | Import preview blocks import without marking invalid rows | OPEN — audit E2, [evidence](audit-e2-evidence/operator-import-preview.png) | I |
| CAL-P3-005 | P3 USABILITY | Access tab accepts owner email; duplicate grants report “Saved” | OPEN — audit E2, [evidence](audit-e2-evidence/operator.json) | I |
| CAL-P3-006 | P3 BUSINESS RULE | Unsold team can take a finishing place; empty states then contradict | OPEN — policy recorded 2026-09-15 (house receives unclaimed share; house returns to pot or keeps) | J (proposed) |
| CAL-P3-007 | P3 USABILITY | Hammer / bid entry below the fold on first paint at 1280×720 / 1024×768 | OPEN — optional observation | I (optional) |

After audit E2 (2026-09-15, `d992d1c`): **four open P2 and seven open P3 (one optional debt, one policy-gated); no open P1; P0: none demonstrated.** Canonical descriptions for the new IDs are in [PRODUCT-AUDIT.md § Incremental audit E2](PRODUCT-AUDIT.md#incremental-audit-e2--2026-09-15). Local resolution does not waive the blocked hosted gates in [VALIDATION.md](VALIDATION.md).

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

### Batch F — Phone header controls and TV intermediate widths (proposed)

- **Status:** PROPOSED, awaiting approval.
- **Exact IDs:** `CAL-P2-004`, `CAL-P2-005`.
- **Objective:** Every header control remains usable at phone width (operator can sign out); the TV view stays readable at 960–1099 px wide and under 700 px tall.
- **Why together:** Both are bounded responsive CSS corrections to shared header/TV rules introduced or left by earlier layout work; neither touches data or rules.
- **Expected areas:** `app/globals.css` (phone `.mast nav`, TV grid thresholds and `.tv .stats strong` sizing); an icon or visible text on the Sign out and `#board` anchors in `app/operator.tsx` / `app/auction.tsx`.
- **Risk:** Low–medium; shared header and TV CSS need the existing Batch C matrix rerun.
- **Acceptance:** Header controls non-zero, named and focus-visible at 320/390/430/700/701 px on `/` and `/admin`; TV live/paused/completed contain all statistics at 960×540, 1024×768, 1093×614, 1099×618, 1100×619, 1280×720 plus the existing 1366×768 / 1920×1080 checks. Decision needed: whether one-screen TV is required below 700 px height.
- **Order:** 6 — recommended first of the E2 batches (spectator display and phone operator).

### Batch G — Sold dialog Escape (proposed)

- **Status:** PROPOSED, awaiting approval.
- **Exact IDs:** `CAL-P2-006`.
- **Objective:** Escape dismisses buyer suggestions before it dismisses the sale.
- **Expected areas:** `app/auction-controls.tsx` `SoldDialog`; `components/ui/combobox.tsx` or `components/ui/dialog.tsx` escape handling.
- **Risk:** Low; verify stale-dialog, inline buyer creation and keyboard shortcut suppression still pass.
- **Acceptance:** Keyboard-only: type → Escape keeps dialog and focus → Escape closes; Cancel/Confirm unchanged; one-click “Add buyer here” with the list open still works.
- **Order:** 7.

### Batch H — Contrast and filter semantics (proposed)

- **Status:** PROPOSED, awaiting approval.
- **Exact IDs:** `CAL-P2-007`, `CAL-P3-002`.
- **Objective:** The five listed supporting texts meet 4.5:1; filter tabs reference real panels or use non-tab semantics.
- **Expected areas:** `app/globals.css` colour tokens, `components/ui/tabs.tsx` trigger colour, `app/auction.tsx` board tools, `app/settlement.tsx` settlement tools.
- **Risk:** Low; visual regression only.
- **Acceptance:** Computed ratios ≥ 4.5:1 on public, TV and operator; axe reports no serious `color-contrast` and no `aria-valid-attr-value` on `/`, `/tv`, operator console, Settlement, Exports.
- **Order:** 8.

### Batch I — Operator data-entry feedback (proposed)

- **Status:** PROPOSED, awaiting approval.
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

## Completed original audit work

- Reconciled all requested current capabilities against code and test evidence.
- Created project/architecture/current-state/validation/coverage/audit/tracker foundation and durable synthetic evidence.
- Performed original suites, independent seeded oracle, expanded API/export/queue/correction tests, keyboard and four-tab journeys, responsive/contrast review, isolated outage/restart and scale checks.
- Kept product code and schema unchanged; preserved user review and isolated all mutation fixtures.
- Recorded interrupted harness attempts and unavailable hosted/hardware checks without passing them.

## Compact handoff

**Remaining optional scope: Batch E, exact ID `CAL-P3-001`.** A/B/C/D are complete locally. All eight original findings are resolved locally; E is not a release blocker by itself. **Audit E2 (2026-09-15) adds proposed Batches F–I (CAL-P2-004…007, CAL-P3-002…005/007) and one policy-gated item (CAL-P3-006); nothing from E2 is approved.** Do not implement E–I merely because they are listed here. After the user approves the next bounded set, preserve KEEP / PROTECT, run its focused reproductions and relevant regression suites, and update this tracker with evidence. Deployment needs separate authorization; the live container was not changed by the audit.
