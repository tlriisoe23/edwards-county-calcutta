# Edwards County Calcutta — product audit

2026-09-14 UTC · original audited product `dfab14906c04b5a6d99ffffbfba4249883750eae` · updated with approved Batch A resolution `4dc2900`.

## Executive assessment

The operator-first product is substantially implemented. A volunteer can configure an event, record verbal bids without selecting a buyer each time, confirm a purchaser, correct/undo sales, maintain a meaningful queue, track manual settlement and export records. Exact payout and ownership allocation performed well under independent deterministic testing. Preserve that foundation.

**The original audit identified nine findings. Batch A resolves two locally; seven remain open: 0 demonstrated P0, 3 P1, 3 P2, 1 P3.** Event context and access-change atomicity are fixed in `4dc2900`; numeric CSV reconciliation, clipped/overlapping displays and aggregate collection summary remain P1. None of the original tests demonstrated stored sale/ownership/receipt corruption, an unauthorized-user access bypass, or lost updates in routine guarded sale mutations. Those boundaries explain the P1 rather than P0 ratings; they are not a general security or financial certification.

The original 58-check and 72-check suites passed. Eleven extra correction/queue checks passed. All 1,000 seeded allocation cases passed. Additional audit probes deliberately retain failing assertions for actual findings. Detailed counts, commands and gaps are in [VALIDATION.md](VALIDATION.md); the full capability reconciliation is in [CURRENT-STATE.md](CURRENT-STATE.md), and the surface/state/device/input matrix is in [COVERAGE.md](COVERAGE.md).

The original audit changed no product source, schema, infrastructure or business rule. The user subsequently approved Batch A; its bounded source changes and evidence are in [BATCH-A.md](BATCH-A.md). No schema change or deployment occurred. B–E in [TASK-TRACKER.md](TASK-TRACKER.md) await approval. Historical reproductions below and original evidence files are retained; resolution status supersedes the old behavior for fixed IDs.

## KEEP / PROTECT

| Invariant or product choice | Current evidence and boundary |
|---|---|
| Authoritative server-side auction state | API calculations, staged sale validation, revision races and four-client convergence pass. Client display is not the ledger. |
| Normalized relational event records | Fourteen tables with event/party relationships; isolated `foreign_key_check` returned no violations. |
| Integer-cent money and basis-point percentages | Independent BigInt oracle passed 1,000 seeded allocation cases, including tiny/large pots and uneven shares. |
| Cent-exact purse and ownership reconciliation | Separate/combined/custom, fixed/percentage deductions, 2–10 places and ownership all reconcile in tested domains. |
| One ACTIVE sale per team | Unique constraint plus server validation; exact replay and rapid double confirm preserve one sale. |
| Idempotent sale/payment mutations | Routine audit request IDs and mutation guard batch pass; Batch A also protects access replay. Creation retry remains an exception. |
| Expected-revision and double-SOLD protection | Concurrent bids yielded one 200 and one 409; stale sale dialogs explain changed state and disable confirmation. |
| Auditability and undo | Sale/void/reopen/queue/reset undo and settlement compensations retain accountable history. Do not replace signed reversals with silent deletion. |
| Public/private data separation | Explicit public projection, hidden display flags and private sentinel tests pass. Financial/history exports remain authorized. |
| Anonymous view-only public and TV | No public write UI or WebMCP mutation tool; local anonymous admin/export denial passes. Hosted audience still needs verification. |
| Server-side operator and owner checks | Server reads owner/allowlist; Batch A verifies atomic access changes, local owner-only enforcement and revoked-session denial. Hosted identities remain a gate. |
| Purchaser required at Sold, optional during bids | Amount-only default, recent-buyer chips, inline buyer creation and staged team/price improve live auction operation. |
| Optional buyback modes | Off avoids prompts/obligations; Calculation only remains informational; Track changes ownership only. Mode changes retain agreements. |
| Buybacks do not inflate auction pools or club receipts | $1,250 × 50% gives $625 information without changing $1,250 pool/receivable; odd-cent partial ownership also passes. |
| Settlement is manual bookkeeping | Receipts and payouts stay separate. No collection, transfer or automatic purchase/winnings netting. |
| Distinct queue outcomes | Skip preserves eligibility; Unsold removes from queue; Withdraw preserves record but excludes participation. |
| Structured configuration | Amount rows, payout rows, dropdowns, toggles, previewed import and plain-language rule notes are already present. No comma-delimited amount syntax is required. |
| Local sharing honesty | Copied links/QR include only view route and event ID, with explicit local-only warning. |
| Useful small payloads and recovery | Public full snapshot 30,692 bytes at 100 teams; bid delta 1,435 bytes; 204 unchanged; safe board survives outage and recovers. |
| Existing visual identity and hierarchy | Normal phone and full-size TV put current team/bid first; operator primary sale action is clear. Target specific containment/contrast faults, not broad redesign. |
| Explicit release boundary | Local review and saved Sites version are not production availability. No production deployment without separate explicit approval. |

## Findings register

All findings below are demonstrated in local review or source inspection, not inferred from aesthetic preference. Confidence is about the observation, not certainty of a future correction. Proposed changes are the smallest reasonable direction; implementation must still preserve invariants and validate behavior.

### CAL-P1-001 — Event context is lost on refresh and some navigation

- **Current status:** RESOLVED LOCAL in `4dc2900`. [Batch A browser evidence](batch-a-evidence/browser.json) covers selection, dirty draft isolation, history, reload, public/TV/operator links, creation, newest fallback and delayed responses. Original reproduction follows for traceability.
- **Severity/category:** P1 · RELIABILITY / USABILITY DEFECT.
- **Surface/route:** Operator event selector at `/admin?event=A`; public `/` and `/tv` header navigation.
- **Preconditions:** At least two events; currently viewing an explicit event other than the newest, or selecting B while the URL names A.
- **Evidence:** Browser BR-04. Draft A `27f4bc69-c716-442e-8148-83cc0afe8498` → select Draft B `eda7fe9a-5c18-4422-be13-c463ded05866`: form correctly switches, URL remains A, reload returns A. Public explicit demo `afb40eba-b7a1-49fe-a585-f5267a7e53d6` → TV mode points to `/tv` and showed newest Audit Browser Journey instead.
- **Reproduce:** Create A then B; open admin with A ID; select B; reload. Separately open A's public link and use its TV navigation while B is newest.
- **Expected:** Explicit event selection survives reload and navigation between related surfaces.
- **Actual:** React selection and URL diverge; unqualified links invoke newest-event fallback.
- **User impact/business risk:** An operator may resume in the wrong auction after refresh; spectators can be shown another event. No cross-event write was demonstrated, but the context error raises the risk of an operator mistake.
- **Probable area:** `app/auction.tsx` selector callback around line 99, header/Brand links around lines 13/105; route initialization and admin-created event navigation.
- **Smallest correction:** Synchronize the selected event ID with browser history and retain it in related public/TV/operator links. Keep an intentional newest-event fallback only for genuinely unqualified entry.
- **Acceptance:** A/B selection, reload, back/forward, public↔TV and admin links preserve the chosen ID; create-event navigation follows the new event; stale polling cannot apply A to B; unsaved A rules never become B's draft.
- **Confidence:** High, browser reproduction plus source. Dirty-form cross-event corruption was specifically tested and disproven; do not conflate it with this finding.

### CAL-P1-002 — Rejected operator access change can still change access

- **Current status:** RESOLVED LOCAL in `4dc2900`. [Batch A API evidence](batch-a-evidence/api.json) proves grant/revoke/audit rollback and replay under forced failures/concurrency; [role evidence](batch-a-evidence/roles.json) proves local non-owner and revoked-session denial. Hosted distinct-user acceptance remains pending. Original reproduction follows for traceability.
- **Severity/category:** P1 · SECURITY/PRIVACY / RELIABILITY.
- **Surface/route:** Owner access administration, `POST /api/admin`, `operator_add` / shared access branch.
- **Preconditions:** Authorized owner submits an allowlist change with an event ID whose audit insert fails (tested with nonexistent event). The test used only disposable `audit-atomic@sites.test` in the isolated environment.
- **Evidence:** `audit-evidence/api.json`, “Rejected access change is atomic”: response 400, `The change could not be saved. No partial change was applied.`, while `operatorExists:true`. A subsequent explicit removal passed and was verified.
- **Reproduce:** As isolated owner, send `operator_add` with a fresh test email and nonexistent event ID, then read the owner operator list.
- **Expected:** Failed request leaves access unchanged; success records both access change and audit.
- **Actual:** Allowlist insert runs first and commits; a separate audit insert fails. Error response incorrectly promises rollback.
- **User impact/business risk:** Owner can believe a grant failed although the email has been allowed; audit evidence of the change is absent. This did not demonstrate unauthenticated privilege escalation; the owner check remains present.
- **Probable area:** `app/api/admin/route.ts:45`, access insert/delete and audit outside the routine batch.
- **Smallest correction:** Validate the optional event context first; atomically commit allowlist and audit, and make repeated request handling consistent. Preserve owner-only access and allow adding emails after initial setup.
- **Acceptance:** Invalid event/audit failure causes no grant/revoke; valid change and audit appear together; retry causes one logical change; local non-owner is denied; later hosted test proves an allowed email can enter and revoked email loses access on a fresh request.
- **Confidence:** High for add failure. Remove has the same split-write structure; its failure mode was identified by source, not separately fault-injected.

### CAL-P1-003 — Signed financial CSV values are exported as text

- **Severity/category:** P1 · DEFECT / financial reconciliation.
- **Surface/route:** Payment History CSV; signed balances in related financial exports; `/api/export?event=ID&kind=payments`.
- **Preconditions:** A receipt or payout has a reversing negative entry, or a party has a negative balance after correction.
- **Evidence:** Actual downloaded `sample-payments.csv` contains amount cells `100.01`, `200.02`, `'-100.01`. Independent CSV parser preserves the apostrophe; numeric reconciliation produces NaN instead of 20,002 cents. Also reproduced with -12.50 in `audit-evidence/math.json`.
- **Reproduce:** Record 100.01 and 200.02, reverse the 100.01 entry, export payment history, parse Amount as a number and sum it.
- **Expected:** Financial amount columns are signed numeric decimal values whose sum reconciles with the ledger; untrusted text remains protected against formula execution.
- **Actual:** Generic CSV injection protection prefixes a negative numeric amount with an apostrophe, turning it into text. A consumer that ignores text may overstate totals; the independent parser fails explicitly.
- **User impact/business risk:** Treasurer/accountant cannot reliably total corrections without manual cleaning. This is an export defect; stored integer entries and in-app party balances remained correct.
- **Probable area:** `lib/model.ts:67` generic `csv()`; `lib/exports.ts:3` converts amounts to decimal strings before escaping; legacy in-tab downloads share CSV serializer.
- **Smallest correction:** Preserve column value types through serialization so known numeric values keep their sign while arbitrary names/notes beginning with formula characters stay escaped. Do not disable CSV injection protection globally.
- **Acceptance:** Download/reopen receipt and payout histories containing positive/negative/zero values; signed sums reconcile in an independent parser and spreadsheet import. Check negative settlement balances. Names such as `=2+3`, `+text`, `-text` and `@name`, commas, quotes, CR/LF and Unicode remain safe/intact.
- **Confidence:** High, exact bytes from generated financial export and independent parse.

### CAL-P1-004 — Display containment hides bids and overlaps TV sections

- **Severity/category:** P1 · USABILITY DEFECT / RELIABILITY.
- **Surface/route:** Public `/?event=ID` at narrow widths; TV `/tv?event=ID` at exact 1920×1080 and scaled 1366×768.
- **Preconditions:** Long current team name or large permitted bid; a scaled TV viewport; completed state with seven summary metrics. Four-flight/100-team fixture and a normal 12-team demo were tested.
- **Evidence:** BR-09/10/11 and viewport records. At 1920×1080 the long-name block ends near y796 while `$1,000,000` extends to y849, clipping the amount. At 1366×768 normal team content overlaps stats/recent areas. Completed TV adds Lowest sale into a second stats row overlapping recent sales. On 390px/320px public screens the large amount clips on the right.
- **Reproduce:** Put `Christopher Montgomery-Wellington / Alexander Richardson-Harrington` on the block with a 1,000,000-unit bid; inspect TV at 1920×1080 and public at 390×844/320×740. Inspect normal demo TV at 1366×768. Complete an event and inspect all seven TV metrics.
- **Expected:** Entire current bid remains readable; TV's block, queue, stats and recent sales occupy non-overlapping areas without scrolling during normal operation. Public phone content may scroll vertically but must not hide currency digits.
- **Actual:** Fixed TV tracks/min-content and overflow clipping hide content even when document scroll height equals viewport height. Responsive price sizing exceeds narrow block width.
- **User impact/business risk:** Spectators cannot reliably read the called amount, and the room display loses confidence at common browser scale or final state. No stored bid corruption was observed.
- **Probable area:** `app/globals.css` TV grid/block/big-bid rules; `app/auction.tsx` Block/Stats; responsive overrides.
- **Smallest correction:** Make content allocation and typography adapt to available width/height and the number of summary items. Preserve on-block/bid priority, readable long names and normal visual identity. Do not solve it by silently hiding necessary bid digits or adding routine TV scrolling.
- **Acceptance:** Screenshot plus element containment/overlap assertions at 1920×1080 and 1366×768, live/paused/completed, short/long names, four flights, maximum per-bid currency; phone 320/390/430. Verify full amount glyphs fit, stat rows do not overlap recents, normal TV remains a single screen and public filters still scroll intentionally.
- **Confidence:** High, visible screenshots and geometry. Fullscreen hardware/browser zoom remain separate verification gaps.

### CAL-P1-005 — Collection summary offsets unrelated buyer overpayments

- **Severity/category:** P1 · BUSINESS RULE / misleading financial summary.
- **Surface/route:** Settlement → Auction payments; `/admin?event=ID`.
- **Preconditions:** At least one buyer overpaid after a sale correction and another buyer still owes money. Direct overpayment entry is correctly rejected, but later corrections can create a legitimate negative party balance.
- **Evidence:** `audit-evidence/balance.json`: positive outstanding balances 750,120 cents; another buyer's overpayment -10,000 cents; displayed receivable 740,120 cents. Per-party entries are retained and correct.
- **Reproduce:** Mark one buyer fully paid, reduce one of their sale amounts by 100.00, leave other buyers unpaid, then compare “remaining” summary with the sum of positive buyer balances.
- **Expected:** The amount still to collect reflects positive debts (7,501.20), with 100.00 of overpayments/credits shown separately if the product displays net position too.
- **Actual:** Signed balances are summed to 7,401.20 and presented as collection remaining, although one buyer's credit does not settle another buyer's debt.
- **User impact/business risk:** Treasurer can understate collections still required by 100.00 in the reproduced example. The app did not transfer a receipt or silently net purchases against tournament winnings; this is a cross-party summary problem.
- **Probable area:** `lib/settlement.ts:25`, `app/settlement.tsx`, labels and any export/print summaries derived from the same aggregate.
- **Smallest correction:** Distinguish positive outstanding from overpayments/net position while leaving each party's signed balance and original entries unchanged. Review the analogous payable aggregate for the same semantics; do not assume automatic refunds or transfers.
- **Acceptance:** Multiple debtors plus a credited buyer show full positive collection total and separate credit; per-party totals, history and CSV agree. Test sale purchaser/amount changes, undo and reversals; receipts and tournament payables remain separate.
- **Confidence:** High, exact-cent independent sum. Payable-summary equivalent needs an explicit follow-up fixture before claiming a second defect.

### CAL-P2-001 — Quoted delimiter characters break valid CSV import

- **Severity/category:** P2 · DEFECT.
- **Surface/route:** Teams → Bulk import at `/admin?event=ID`.
- **Preconditions:** Comma-separated input contains a pipe or tab inside a quoted cell, such as team name `North | South`.
- **Evidence:** `audit-evidence/math.json`: valid comma header/data yields a single combined header field because delimiter detection chooses pipe from anywhere in the text. Ordinary commas/quotes/Unicode round-trip passed.
- **Reproduce:** Paste `Team Name,Player 1,Player 2,Flight` followed by a comma-CSV row beginning `"North | South"`; inspect preview columns using `parsePaste()` or the import UI.
- **Expected:** Quoted content is treated as cell text; external delimiters define columns.
- **Actual:** `text.includes('|')` / tab selection ignores quote boundaries and changes the whole file's delimiter.
- **User impact/business risk:** A valid roster cannot be correctly previewed/imported without editing names; operator may repair the wrong columns manually. No silent imported corruption was demonstrated because the preview exists.
- **Probable area:** `lib/model.ts:69`, `parsePaste()` and preview validation in `app/editors.tsx`.
- **Smallest correction:** Detect delimiter outside quoted cells or provide a clear explicit delimiter choice; retain preview and existing tab/pipe support.
- **Acceptance:** Comma CSV with quoted pipe/tab, embedded commas, doubled quotes, line endings and Unicode previews correctly; normal tab/pipe input still works; malformed rows are understandable and never partially imported.
- **Confidence:** High, deterministic pure-function reproduction.

### CAL-P2-002 — Event creation ignores repeated request identity

- **Severity/category:** P2 · RELIABILITY.
- **Surface/route:** New event, `POST /api/admin`, `create_event`.
- **Preconditions:** An authorized caller retries an identical create request with the same UUID, such as retry after an uncertain response.
- **Evidence:** `audit-evidence/api.json`: same request created `6290630b-c8ff-4e11-842d-87a02c515a8f` and `dd934e70-440e-47e4-b3bf-05d8ba303f75`.
- **Reproduce:** Send the same valid create body twice with the same requestId; compare returned event IDs and event list.
- **Expected:** One event and a stable result for a repeated logical request.
- **Actual:** Creation returns before the routine duplicate-request lookup, so a second event is inserted.
- **User impact/business risk:** Duplicate setup events confuse selection and unqualified public newest-event entry. Existing event contents were not damaged.
- **Probable area:** `app/api/admin/route.ts:56`, creation branch before common guard; `freshEvent()` persistence contract.
- **Smallest correction:** Persist creation request identity and returned event ID atomically; return the original result on retry. Include the shared load-demo creation path in bounded regression review.
- **Acceptance:** Sequential and concurrent retry with one UUID creates exactly one event and consistent result; different UUIDs still create separate intentional events; reload/new-event selection remains correct. Repeat for demo creation before claiming that path fixed.
- **Confidence:** High for create-event runtime reproduction; demo uses the same branch but duplicate demo request was not independently tested.

### CAL-P2-003 — Recent-sales caption has insufficient contrast

- **Severity/category:** P2 · ACCESSIBILITY.
- **Surface/route:** Public and TV recent-sales section, `/` and `/tv`.
- **Preconditions:** Default rendered theme; 12px bold `RECENT SALES` caption.
- **Evidence:** BR-15. Foreground rgb(116,130,105), actual opaque background rgb(247,246,240), calculated contrast 3.7737:1. Six other sampled label/status combinations met their tested normal-text threshold.
- **Reproduce:** Inspect computed `.recent .eyebrow` colors and font size, calculate relative luminance contrast.
- **Expected:** Normal-size text meets 4.5:1; see [W3C Contrast Minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- **Actual:** 3.77:1. The caption is too small to use the large-text exception.
- **User impact/business risk:** Low-vision users and viewers on a dim display may lose this supporting label. Primary sale amounts are not the measured failure here.
- **Probable area:** `app/globals.css` recent-section/eyebrow color rule.
- **Smallest correction:** Adjust the caption foreground token against its actual background; preserve hierarchy and recheck related uses.
- **Acceptance:** Computed default-theme ratio ≥4.5:1 for this caption and any changed shared-token uses; visual regression checks ensure no loss of state meaning.
- **Confidence:** High for sampled theme. This is not a whole-product WCAG compliance verdict.

### CAL-P3-001 — Parallel export definitions increase maintenance drift

- **Severity/category:** P3 · TECHNICAL DEBT (not a demonstrated current ledger defect).
- **Surface/route:** Operator Teams/Sales downloads and Exports tab, `/admin?event=ID`.
- **Preconditions:** Maintaining financial/privacy behavior across existing download paths.
- **Evidence:** `app/operator.tsx:24,93–94` constructs browser CSV rows and downloads; `lib/exports.ts` independently constructs authorized report rows. The layouts differ, including reimport-oriented team columns versus reporting columns. Both share a loosely typed generic CSV serializer.
- **Reproduce:** Compare the two export definitions and their column contracts; change proposals must presently account for both paths. The signed-number finding shows why serialized-output tests matter, but is separately tracked in CAL-P1-003.
- **Expected:** Intentional format differences are explicit, documented and validated consistently.
- **Actual:** Export contracts are distributed across UI and domain files; a future privacy/format adjustment could address one path and miss another. No current mismatch beyond separately listed findings is claimed.
- **User impact/business risk:** Low present impact; avoidable regression risk for future accountant exports and roster reimport.
- **Probable area:** `app/operator.tsx`, `lib/exports.ts`, `lib/model.ts`, export tests.
- **Smallest correction:** After correctness fixes, make export variants explicit in a shared typed serialization contract or document/test distinct schemas. Preserve intentionally different roster import/report formats; do not blindly merge all reports.
- **Acceptance:** Existing download buttons retain their promised columns; round-trip roster and independently parsed financial files pass; private field inclusion is explicit per report; no duplicate row-mapping implementation for the same contract.
- **Confidence:** High that the parallel paths exist; medium for future savings. Optional, lower priority than user-visible defects.

## Auction-night and setup assessment

The observed fast sale path with a recent purchaser is three activations: Hammer, purchaser chip, Confirm. An opening bid is one activation and an increment is one. Inline buyer creation avoids abandoning Sold; the keyboard journey successfully created/selected a new buyer, confirmed sale and undid it. A timed human usability study was not performed, so these interaction counts are not claimed as measured volunteer completion times.

Setup already uses structured amounts, a row-based ladder with total validation, mode selections, flight editors and public switches. Payout 120% could not save; removing an extra row yielded 70/30. “Skip for now,” “Mark unsold,” “Withdraw,” reopen, void and payment reversal have different explained outcomes. Keep the precise destructive-action confirmation and the requirement to choose final purchaser. No excessive-confirmation defect was demonstrated.

Original failures affecting this journey were event context after refresh/navigation, retried creation, CSV import delimiters and display containment. Batch A fixes event context locally; the others remain. The suspected dirty setup leaking into another event and missing import labels were disproven. Long setup sections and tablet landscape scrolling are observations, not fabricated defects; physical touch operation remains partial coverage.

## Settlement, exports and accounting assessment

Purchase totals, multiple partial receipts, Mark paid, method/notes, signed reversals, correction/undo history and persistence passed. Payout entitlement, partial/full disbursement and independent receipt/payable totals passed. Changing a purchaser left old receipts with their original buyer, exposing an overpayment appropriately; undo restored the debt without deleting payment history.

Actual generated auction, settlement, teams, payout, ownership, payment-history and full JSON files were opened and independently parsed. ACTIVE auction sums, receipt totals and entitlement-row sums reconciled. Party totals repeat on each entitlement row by design; sum Entitled Amount for awards, not repeated Party Total Entitlement. Standard CSVs omit contacts/private notes but are still operator reports. Ownership consideration and payment-history notes are not public-board data.

Correct CAL-P1-003 before treating signed financial CSV imports as dependable, and CAL-P1-005 before treating the summary as total cash still to collect. In-app individual accounts remain useful. The JSON archive contains full relational data and audit history; there is no demonstrated restore-import workflow. Real printer/PDF pagination is unverified.

## Accessibility, public and TV assessment

Keyboard B/Enter/+/S/U worked with focus management and no shortcut leakage into buyer text/notes/dialogs. Import/editor labels and icon action names were present; status used text as well as color. The Hammer target measured 54px high at tablet portrait. Smaller row icons were observed around 32px; this alone is not a WCAG AA failure. [W3C Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24px with exceptions; 44px is an enhanced target/recommendation.

The confirmed accessibility finding is CAL-P2-003. Display clipping is CAL-P1-004. Reduced-motion CSS exists but runtime emulation was not verified. Native screen reader, 200% browser zoom and physical touch/soft keyboard need follow-up; no compliance badge is warranted.

Public flight tabs intentionally scroll within their strip and worked with four flights and search. Normal 390×844 and 430×932 public views place team/bid before totals and field. The full-size normal TV is healthy; long-name, scaled and completed cases are not. The public↔TV navigation defect is separate from layout. Completed TV still lists eligible upcoming teams under its queue heading when any remain; retained queue data is an observation needing business/display intent clarification, not an additional approved finding.

## Security and privacy assessment

Local anonymous admin/write/export denial, forged identity-header stripping, exact-origin CSRF rejection, stale guards and public private-field filtering passed. A team-editor mass-assignment probe could not change event/status/finish. Inspected text rendering did not use raw HTML. CSV formula-like text is escaped, but that protection currently breaks signed numeric cells; preserve protection when correcting it.

The original security-adjacent failure was owner access mutation atomicity, CAL-P1-002, now resolved locally by Batch A. Its role probes also verify a local allowed non-owner and denial after revocation of the same session. Real ChatGPT owner, distinct allowed/revoked operators and signed-in non-allowed users remain unavailable on a hosted URL; do not claim hosted multi-user acceptance passed. WebMCP exposed only the public reader and rejected extra input.

## Simplification / debt map

| Area | Evidence | Reliability/product value and current disposition |
|---|---|---|
| Multiple export definitions | Two in-tab builders and central report builders | CAL-P3-001: worthwhile after correctness work, preserving intentional schemas. |
| Large mutation module and broad `Row`/`any` | Most actions and undo live in one route; `Row = Record<string, any>` | Hard to reason about transaction boundaries; access atomicity is fixed locally, creation replay remains P2. Do not authorize a broad rewrite. Narrow contracts may be justified during approved fixes. |
| Audit before-snapshots | Complete event snapshot per routine mutation; synthetic JSON backup 4,692,424 bytes | Backup grows with actions and event size. At 100 teams it downloaded in 242ms locally; no limit failure demonstrated. Retention/compaction is future investigation, not current defect. |
| Existing test blind spots | Legacy unseeded 500-case loop; row-level export assertions missed final serialization; page-height check missed internal clipping | New seeded oracle/actual-file tests and geometry/visual audit now provide evidence. Keep these; do not change tests to hide current failures. |
| Setup complexity | Long event/rules page but structured controls and explanations already present | No magic amount syntax remains; no need for a broad configuration redesign. |
| Dependency surface | Starter includes more UI packages than the custom screens obviously use | No package-removal claim without import/bundle evidence. No dependency removed in this audit. |
| Documentation drift | Prior narrative combined implementation/review/release notes | This foundation separates current evidence, architecture, findings and approval state; README now routes to it. |

## Future ideas and comparative lens

The prompt's BidParTee concepts were used only as review lenses: operator Lite workflow, customizable increments, flights/pools, QR, public display, bookkeeping and reconciliation. This audit did not independently verify current competitor features or copy proprietary UI. Amount-only operator mode, QR and separate settlement fit this product's intent.

Participant/mobile bidding, accounts, pre-bidding, silent/timed auctions, actual payment processing and tournament scoring remain **FUTURE IDEA / NOT REQUIRED**. They are not included in the finding count or batches. Physical TV validation, hosted access checks and print output are verification work for existing behavior, not feature expansion.

## Handoff and release boundary

Read [TASK-TRACKER.md](TASK-TRACKER.md) for exact acceptance criteria and batch status. **Batch A (`CAL-P1-001`, `CAL-P1-002`) is complete locally in `4dc2900`. Recommended next: Batch B (`CAL-P1-003`, `CAL-P1-005`)**, correcting signed CSV values and collection summaries.

The user must approve the next bounded set before B–E implementation. Batch A's approval does not authorize migration, production access changes or deployment. Hosted acceptance remains a later gate even after local findings are corrected.
