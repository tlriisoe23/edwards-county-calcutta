# Finding tracker and proposed batches

2026-09-14 UTC · A and B approved and verified locally (`4dc2900`, `3d00923`) · C–E await approval · no production deployment authorized.

The canonical description, reproduction, confidence and acceptance for every ID is in [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md). Do not renumber an ID when its status changes; append validation evidence and a commit reference after an approved fix. A source change is not verified until its acceptance passes, and a local pass is not hosted verification.

## Stable register

| ID | Severity/category | Title | Status | Batch |
|---|---|---|---|---|
| CAL-P1-001 | P1 RELIABILITY | Event context lost on refresh/navigation | RESOLVED LOCAL — `4dc2900`, [evidence](BATCH-A.md) | A |
| CAL-P1-002 | P1 SECURITY/PRIVACY | Rejected access change can still apply | RESOLVED LOCAL — `4dc2900`, [evidence](BATCH-A.md); hosted roles pending | A |
| CAL-P1-003 | P1 DEFECT | Signed financial CSV becomes text | RESOLVED LOCAL — `3d00923`, [evidence](BATCH-B.md) | B |
| CAL-P1-004 | P1 USABILITY DEFECT | Public/TV content clips and overlaps | OPEN — awaiting approval | C |
| CAL-P1-005 | P1 BUSINESS RULE | Collection summary offsets other buyers' debts | RESOLVED LOCAL — `3d00923`, [evidence](BATCH-B.md), includes reproduced payout equivalent | B |
| CAL-P2-001 | P2 DEFECT | Quoted pipe/tab breaks CSV delimiter detection | OPEN — awaiting approval | D |
| CAL-P2-002 | P2 RELIABILITY | Repeated creation request creates two events | OPEN — awaiting approval | D |
| CAL-P2-003 | P2 ACCESSIBILITY | Recent-sales caption contrast 3.77:1 | OPEN — awaiting approval | C |
| CAL-P3-001 | P3 TECHNICAL DEBT | Distributed export contracts | OPEN — optional, awaiting approval | E |

Five findings remain open: one P1, three P2 and one P3. P0: none demonstrated. Local resolution does not waive the blocked hosted gates in [VALIDATION.md](VALIDATION.md).

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

- **Exact IDs:** `CAL-P1-004`, `CAL-P2-003`.
- **Objective:** Keep the whole bid and essential summary content readable on normal/scaled TVs and phones while retaining the existing visual design.
- **Why together:** Both are bounded spectator display corrections with overlapping CSS and visual regression needs.
- **Expected areas:** `app/globals.css`, relevant responsive/refinement rules, shared Block/Stats/recent layouts in `app/auction.tsx`.
- **Risk:** Medium: typography/grid changes can affect public, TV and operator shared components.
- **Acceptance:** 1920×1080 and 1366×768 TV, live/paused/completed, four flights, short/long names and max per-bid value show no clipping/overlap or normal TV scrolling; public 320/390/430 preserves full price and usable filters; caption contrast ≥4.5:1. Use screenshots and within-container bounds, not only page size.
- **Regression surface:** Operator shared block/tablet, public filters/pools, recent sale toast, display flags, completed metrics, reduced-motion styles. Actual fullscreen/projector remains a later hardware gate.
- **Order:** 3; complete before a clubhouse display rehearsal.

### Batch D — Reliable setup import and creation retries

- **Exact IDs:** `CAL-P2-001`, `CAL-P2-002`.
- **Objective:** Accept valid roster text and avoid duplicate events when creation requests repeat.
- **Why together:** Both reduce pre-auction setup rework and ambiguous duplicate records; neither changes auction rules.
- **Expected areas:** `lib/model.ts` delimiter parsing, import preview/validation, creation branch in `app/api/admin/route.ts` and request-result persistence.
- **Risk:** Medium: import formats and intentional event creation semantics must remain compatible.
- **Acceptance:** Quoted pipe/tab/comma/quote/newline/Unicode fixtures preview correctly; 100-team atomic import works; malformed rows do not partially save. Same create UUID sequential/concurrent returns one event; distinct IDs create separate events; include load_demo replay tests. Batch A event context tests stay green.
- **Regression surface:** Quick/team import, roster export round-trip, flights/players mapping, new event/demo/defaults, audit and newest-event fallback.
- **Order:** 4; creation work builds on Batch A event-context behavior.

### Batch E — Explicit export contracts (optional)

- **Exact IDs:** `CAL-P3-001` only.
- **Objective:** Reduce future divergence between in-tab downloads and central exports while preserving their intentional formats.
- **Why together:** Single small debt project; no broad application refactor included.
- **Expected areas:** In-tab CSV functions in `app/operator.tsx`, `lib/exports.ts`, serializer contracts and focused format tests/documentation.
- **Risk:** Low-medium if schema differences are made explicit; higher if formats are silently unified, which is not approved scope.
- **Acceptance:** Existing download buttons keep their promised columns, roster reimport compatibility and privacy policy; financial files reconcile; shared contracts do not contain duplicate row mappings. No new dependency unless justified.
- **Regression surface:** All existing CSV variants and importer. Perform after B/D so cleanup preserves corrected behavior.
- **Order:** 5, optional after user-visible defects; do not treat it as a release blocker by itself.

## Completed original audit work

- Reconciled all requested current capabilities against code and test evidence.
- Created project/architecture/current-state/validation/coverage/audit/tracker foundation and durable synthetic evidence.
- Performed original suites, independent seeded oracle, expanded API/export/queue/correction tests, keyboard and four-tab journeys, responsive/contrast review, isolated outage/restart and scale checks.
- Kept product code and schema unchanged; preserved user review and isolated all mutation fixtures.
- Recorded interrupted harness attempts and unavailable hosted/hardware checks without passing them.

## Compact handoff

**Recommended next scope: Batch C, exact IDs `CAL-P1-004` and `CAL-P2-003`.** A and B are complete locally. Do not implement C–E merely because they are listed here. After the user approves the next bounded set, preserve KEEP / PROTECT, run its focused reproductions and relevant regression suites, and update this tracker with evidence. Deployment needs separate authorization.
