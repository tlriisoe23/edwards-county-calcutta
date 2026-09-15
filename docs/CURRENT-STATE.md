# Current state — 2026-09-15 UTC

**Batch I (2026-09-15, merged to `main` and redeployed to `ecgc-calcutta-app-1`):** the owner approved CAL-P3-003/004/005 (and CAL-P3-007 conditionally) under D-CAL-2…5; the three are implemented and validated locally per [BATCH-I.md](BATCH-I.md) — a blank or sub-$1.00 minimum starting bid and a blank Percent/Fixed deduction now block *Save event & rules* with the decision's messages, client- and server-side, and only deduction type *None* means no house cut; the import preview names each blocking row's reasons and counts them in the button ("Import 3 teams · 2 rows need attention"); Access rejects the owner email ("already an owner") and duplicates ("already has access") without writing a row or audit entry and lists owners read-only above operators (17/17 implemented-ID harness rows, 43/43 focused server checks including the Batch A access and Batch D import reruns, 58/58 and 72/72 suites; lint failures pre-existing). **CAL-P3-007 is deferred**: a sticky bid panel, even compacted together with the block, still covers 65–76 px of the current bid at 1024×768 / 1280×720, so it cannot meet D-CAL-5's proviso as a small layout change. The live portable container was rebuilt and restarted on 2026-09-15 against the merged `main` branch.

**Batch H (2026-09-15, merged to `main` and redeployed):** the owner approved CAL-P2-007 and CAL-P3-002; both are implemented and validated locally per [BATCH-H.md](BATCH-H.md) — the muted text token darkens to `#5c6a5f` and lot numbers get their own `#636e60` token, so lot numbers, sale buyer lines, payout percentages, inactive tabs and the operator eyebrow measure 5.34 / 4.88 / 5.70 / 5.27 / 5.27 : 1 (from 3.27 / 4.01 / 4.01 / 3.71 / 4.27) and axe reports no serious contrast node on public, TV, console, Settlement or Exports; the public flight filter and the Settlement view switch now control real `tabpanel`s with arrow-key behaviour and Tab order unchanged (37/37 harness checks, 58/58 and 72/72 suites; lint failures pre-existing). The change is present in the live container after the 2026-09-15 rebuild.

**Batch G (2026-09-15, merged to `main` and redeployed):** the owner approved CAL-P2-006; it is implemented and validated locally per [BATCH-G.md](BATCH-G.md) — with the buyer suggestion list open in the Sold dialog, Escape now closes only the list and keeps the dialog and the input's focus, and a second Escape closes the dialog; Cancel/Confirm, one-click *Add buyer here*, stale-dialog protection and the `U`/`S`/`+` shortcut suppression are unchanged (15/15 harness checks, 58/58 and 72/72 suites; lint failures pre-existing). One `onEscapeKeyDown` guard in `app/auction-controls.tsx`; shared primitives untouched. This live fix is shipped in the current container.

**Batch F (2026-09-15, merged to `main` and redeployed):** the owner approved CAL-P2-004 and CAL-P2-005; both are implemented and validated locally per [BATCH-F.md](BATCH-F.md) — phone-width header controls (operator *Sign out*, public *Auction board*) are visible 24 px icon links, and the TV one-screen grid now engages from 951 × 500 px with a compact band under 700 px tall, so 960×540, 1024×768, 1093×614 (a 1366×768 laptop at 125 % scaling), 1099×618, 1100×619 and 1280×720 contain every statistic on one screen alongside the unchanged 1366×768 / 1920×1080 results. Existing suites pass 58/58 and 72/72; lint failures are pre-existing. The running container was refreshed with this build.

Portability implementation: a separate Node/SQLite container target now exists,
with Google authentication integration, local owner recovery and tested synthetic
restore/import workflows. See [hosting](PORTABLE-HOSTING.md) and
[validation](PORTABLE-VALIDATION.md). The planned origin is
`https://calcutta.edcogolf.org`; real Google credentials, owner-data migration and
public routing are still pending. Existing Sites behavior is preserved.

**Incremental audit E2 (2026-09-15, `d992d1c`, audit-only):** the app is live and production-verified per [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md); this pass used only a fresh local store and touched no container, route or real record. It adds four open P2 (phone header links vanish, TV overlap at 1024–1099 px / < 700 px tall, Escape discards the Sold dialog, five contrast tokens) and six open P3 findings, all unapproved, in [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md#incremental-audit-e2--2026-09-15) and [TASK-TRACKER.md](TASK-TRACKER.md) (proposed Batches F–I). It also resolved locally: results tablet keyboard entry, emulated-touch tablet sale, 100-team/six-flight browser rerun, 200 % zoom equivalents, reduced-motion runtime, Chromium print pagination, and non-owner/non-operator role screens; hosted identities, physical devices and printers stay blocked. Existing suites pass 58/58 and 72/72 at HEAD.

The product was audited at `dfab14906c04b5a6d99ffffbfba4249883750eae`; documentation baseline is `782eb3b`. Approved [Batch A](BATCH-A.md) (`4dc2900`) and [Batch B](BATCH-B.md) (`3d00923`) resolve CAL-P1-001/002/003/005 locally. Type checking, build and focused/regression checks passed; schema is unchanged. [Batch C](BATCH-C.md) (`4da7b9b`) resolves display containment and caption contrast locally. [Batch D](BATCH-D.md) (`a76e57f`) resolves quoted roster imports and creation retries. Only one optional P3 remains open; no open P1/P2 or demonstrated P0. These counts do not imply production readiness.

Sites still has saved version 2 and no reported live/hosted-preview URL. No deployment was performed. The review stays at localhost:5173; isolated audit data lives in `.sites-runtime/audit-checkout/.wrangler/state` and is not part of a deployment archive.

## Event state and preservation

The original review event `f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2` remains outside audit mutations. At audit snapshot time the newest review event was the user's demo `c8146050-5c78-4246-b189-ed9b20f04f78`. Its revision changed from 0 to 5 while the user continued reviewing. The audit made **no mutation request to port 5173** and deliberately did not overwrite that newer state with a snapshot. See `audit-evidence/summary.json` for the read-only comparison.

The main isolated fixture has 100 teams, four flights, three buyers and 18 sales. It was completed for results/export testing, then reopened into a paused stress display with a long team name and $1,000,000 current bid. Its pre/post-restart full event snapshot matched. Other isolated fixtures cover drafts, empty, normal live, keyboard and correction journeys. IDs are in the evidence reports; they are disposable local audit records, not review or live events.

## Capability reconciliation

IMPLEMENTED means a representative behavior was exercised successfully in this audit, within the cited scope. PARTIAL means useful behavior exists but has a verified defect or meaningful untested branch. BROKEN means a named promised path was demonstrated failing. UNVERIFIED means code/configuration alone does not prove runtime behavior. NOT IMPLEMENTED means absent by inspection, not necessarily required. Hosted behavior is not inferred from a local pass.

Evidence: A = 58-check acceptance; R = 72-check refinement; M = 1,000 seeded cases; X = original API audit; W = correction/queue probes; B = original browser observations; BA = [Batch A](BATCH-A.md); BB = [Batch B](BATCH-B.md), 33 focused checks, 21 independent file checks and six browser groups. A/R/M/W were rerun for BB. BC = [Batch C](BATCH-C.md), final TV/phone/tablet/notification geometry and caption contrast; A/R rerun for BC. BD = [Batch D](BATCH-D.md), 42 focused checks, 20 BA assertions and four browser groups; A/R/M and all three CSV probes rerun successfully. BF = [Batch F](BATCH-F.md), 55 header/TV geometry checks on its branch; A/R rerun. BG = [Batch G](BATCH-G.md), 15 keyboard-first Sold-dialog checks on its branch; A/R rerun. BH = [Batch H](BATCH-H.md), 37 read-only contrast / axe / tab-semantics / keyboard checks on its branch; A/R rerun. BI = [Batch I](BATCH-I.md), 17 browser rows on a disposable event plus 43 focused server checks (rules, Access, Batch A / D reruns) on its branch; A/R rerun. Exact reports and limitations: [VALIDATION.md](VALIDATION.md).

| Capability | Status | Evidence / practical limit |
|---|---|---|
| Event creation | IMPLEMENTED (local) | BD event/demo sequential and eight-way concurrent retries return one event; changed input/actor/action conflicts; late failure rolls back. Browser creation/history/reload pass. |
| Flights | IMPLEMENTED | A/X create/edit grouping; B flight editor; sold-team flight move tested. |
| Teams | IMPLEMENTED | A/X/W create/edit/order/status; B quick entry/import. |
| Players | IMPLEMENTED | A/X/B player rows and quoted/Unicode names. Not tournament scoring. |
| Buyers/syndicates | IMPLEMENTED | A/W edits; B adds purchaser inside Sold; separate private contact fields. |
| Auction order | IMPLEMENTED | A reorder; R skip and undo; B automatic advance. |
| Quick team entry | IMPLEMENTED | B quick-adds Birch / Elm then sees field row. |
| Bulk import | IMPLEMENTED (local) | BD quote-aware comma/tab/pipe cases, 100-team mapping, roster round-trip, malformed atomic rejection and browser preview/save pass. BI (branch): preview names each blocking row's reasons and the button counts them; BD fixtures rerun. |
| Bidding | IMPLEMENTED | A/R/W/B amount, increments, explicit lowering correction, pause rejection. |
| Opening-bid buttons | IMPLEMENTED | R/B no-buyer start; structured edit/reorder in B. |
| Bid increments | IMPLEMENTED | A/R/B minimum and configurable choices; keyboard +. |
| Bidder tracking | IMPLEMENTED | R off/on/unattributed/clear-identity; B default off. |
| Hammer / Sold | IMPLEMENTED | A/R/B exact bid, purchaser and current team validation. |
| Sale confirmation | IMPLEMENTED (local) | B add/select purchaser, stale dialog disabled, double click produces one sale. BG (branch): Escape closes the open suggestion list before the dialog; keyboard Enter and double-click Confirm each record one sale; shortcuts suppressed while open. |
| Sale correction | IMPLEMENTED | A/W/B price and purchaser corrections, receipt retention, public propagation. |
| Reopen | IMPLEMENTED | A returns team to Upcoming and removes old active contribution. |
| Void | IMPLEMENTED | A retains history and removes gross/entitlements; undo restores. |
| Undo | IMPLEMENTED | A/R/W and keyboard B; settlement compensation retains originals. |
| Skip for now | IMPLEMENTED | R current/queued skip, queue end, no finance, undo. |
| Mark Unsold | IMPLEMENTED | R/W removes active block/queue without sale. |
| Withdraw | IMPLEMENTED | W retains record, excludes start/block; A prevents silent withdrawal of sold team. |
| Payout ladders | IMPLEMENTED | A/R invalid totals; B 70/30 editor; M 2–10 places. |
| Flight pools | IMPLEMENTED | A/M/X isolation and recalculation. |
| Combined pools | IMPLEMENTED | A/M preserve total and group contributions. |
| Custom pools | IMPLEMENTED | A/M own/shared flights. |
| House deductions | IMPLEMENTED | A/M none, percent, fixed, odd cents and caps. BI (branch): Percent/Fixed amounts must be > 0 and the minimum starting bid ≥ $1.00, enforced in the form and the API; *None* is the only no-cut. |
| Projected payouts | IMPLEMENTED | A/M/B pool cards and cent totals. |
| Buyback modes | IMPLEMENTED | R off/calculate/track; W $1,250 × 50% = $625; X odd-cent private consideration. |
| Ownership | IMPLEMENTED | A/R/M/X 50/50, partial, declined, preserved on mode changes and exact awards. |
| Results | IMPLEMENTED | A/R/X saved unique positions and final entitlements. Browser form inspected; no scoring/tie resolution engine. |
| Settlement | IMPLEMENTED (local) | BB separates positive outstanding from overpayments for receipts and payouts, preserving signed parties/history. Corrections, reversals and undo pass. BH (branch): the Auction payments / Tournament payouts switch controls a real tabpanel; inactive label 4.89 : 1. |
| Payments received | IMPLEMENTED | R/X/W/B partial/multiple/Mark paid, method/note persistence, reversal and audit. |
| Payout disbursements | IMPLEMENTED | R/X partial/full/reversal/undo; separate from receipts. |
| Exports | IMPLEMENTED (CSV/JSON), UNVERIFIED (print pagination) | BB independently reopened nine CSV variants; signed values and formula-like text pass. JSON backup and print-summary content checked; physical pagination remains unverified. |
| Public sharing | IMPLEMENTED (local) | R/BA event URLs/QR; BA selector, history, reload, creation and operator/public/TV links retain ID. Hosted sharing remains a gate. |
| QR codes | IMPLEMENTED | R independent decode matches localhost and synthetic HTTPS public URLs; B rendered/copy. Physical phone scan unverified. |
| Public board | IMPLEMENTED (local) | A/R/X/B privacy, filters, live/empty/pause/reconnect; BA context fixed. BC full-price containment at 320/390/430, filters and readable caption pass. BF (branch): header links visible, named and focus-visible at 320–700 px. BH (branch): flight filter tabs control a real tabpanel; lot numbers, buyer lines, payout % and tabs ≥ 4.88 : 1; axe clean at 1280 and 390. |
| TV display | IMPLEMENTED (local viewports), UNVERIFIED (hardware) | BC live/paused short/long names, all-long queue/recent and completed seven metrics fit 1366×768 and 1920×1080. BF (branch): live/paused/completed also one screen with contained statistics at 960×540, 1024×768, 1093×614, 1099×618, 1100×619, 1280×720. BH (branch): lot numbers 5.34 and buyer lines 4.88 : 1 at 1920×1080, 1366×768 and 1093×614; axe clean. Physical fullscreen and scaled displays remain blocked. |
| Operator help | IMPLEMENTED | B reads guide at tablet size; source covers queue/corrections/settlement. |
| Auction Night instructions | IMPLEMENTED | B setup/running/after/TV guide; keyboard journey exercises instructions. |
| Authentication | UNVERIFIED (hosted) | Local mock and forged-header denial pass A/R. Real ChatGPT sessions not available at hosted origin. |
| Operators/access | IMPLEMENTED (local), UNVERIFIED (hosted) | BA atomic grant/revoke/audit under forced failures, concurrent replay, non-owner denial and revoked-session denial. BI (branch): owner email → "already an owner", duplicate → "already has access", no row or audit entry for either; owners listed read-only. Distinct hosted sessions remain unverified. |
| Audit history | IMPLEMENTED | A/R/X actor/action/undo; complete history in opened JSON backup. Retention at long duration unverified. |
| Concurrency protection | IMPLEMENTED | A 200/409 race; B four tabs stale dialog, sale, correction convergence. One local identity. |
| Mutation guards | IMPLEMENTED (tested paths) | A/R sale/payment replay and stale protection; BA atomic access replay; BD matching event/demo creation retries return the original result. Distinct UUIDs remain distinct operations. |
| Public/private separation | IMPLEMENTED (local) | A/R/X/B server flags, sentinels, private-export auth and public-only WebMCP. Hosted boundary remains a gate. |
| Reconnect behavior | IMPLEMENTED (local viewers) | B stop/restart retains safe board, warns on failed save, recovers automatically. Unsaved admin dialog remounts on dev restart. |
| WebMCP | IMPLEMENTED | B sole zero-input read-only public tool; no mutation tools. |
| Demo reset/restore | IMPLEMENTED (demo undo) | A exact confirmation/reset/undo. Full backup import/restore is NOT IMPLEMENTED. |

## Known limits and next action

The product is locally usable for representative journeys; it is not a hosted acceptance sign-off. A/B/C fix context, access atomicity, signed CSV, debt/overpayment summaries and display containment/contrast locally. BD also fixes roster delimiters and creation retries. Only optional export-contract cleanup remains in the finding register. Physical devices, screen readers, zoom, print pagination and other engines remain unverified or blocked. Scratch exited during the original audit, B's first regression attempt and C's early browser setup; complete suites passed after restart, but long-running stability/root cause remain unverified.

**Remaining scope: optional Batch E (`CAL-P3-001`), the policy-gated Batch J (`CAL-P3-006`, rule D-CAL-6, still needing its own go-ahead) and the deferred optional observation `CAL-P3-007`; Batches F, G, H and I (stacked) await merge and a separate deployment decision.** A/B/C/D implementation and local verification are complete and F, G, H and I are implemented and validated locally on their branches. E2 re-observed every A–D resolution as intact and found no P1; no P2 remains open after Batch H. Hosted and hardware gates still apply. See [TASK-TRACKER.md](TASK-TRACKER.md) for status and [COVERAGE.md](COVERAGE.md) for tested versus partial surfaces.
