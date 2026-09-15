# Current state — 2026-09-14 UTC

Portability implementation: a separate Node/SQLite container target now exists,
with Google authentication integration, local owner recovery and tested synthetic
restore/import workflows. See [hosting](PORTABLE-HOSTING.md) and
[validation](PORTABLE-VALIDATION.md). The planned origin is
`https://calcutta.edcogolf.org`; real Google credentials, owner-data migration and
public routing are still pending. Existing Sites behavior is preserved.

The product was audited at `dfab14906c04b5a6d99ffffbfba4249883750eae`; documentation baseline is `782eb3b`. Approved [Batch A](BATCH-A.md) (`4dc2900`) and [Batch B](BATCH-B.md) (`3d00923`) resolve CAL-P1-001/002/003/005 locally. Type checking, build and focused/regression checks passed; schema is unchanged. [Batch C](BATCH-C.md) (`4da7b9b`) resolves display containment and caption contrast locally. [Batch D](BATCH-D.md) (`a76e57f`) resolves quoted roster imports and creation retries. Only one optional P3 remains open; no open P1/P2 or demonstrated P0. These counts do not imply production readiness.

Sites still has saved version 2 and no reported live/hosted-preview URL. No deployment was performed. The review stays at localhost:5173; isolated audit data lives in `.sites-runtime/audit-checkout/.wrangler/state` and is not part of a deployment archive.

## Event state and preservation

The original review event `f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2` remains outside audit mutations. At audit snapshot time the newest review event was the user's demo `c8146050-5c78-4246-b189-ed9b20f04f78`. Its revision changed from 0 to 5 while the user continued reviewing. The audit made **no mutation request to port 5173** and deliberately did not overwrite that newer state with a snapshot. See `audit-evidence/summary.json` for the read-only comparison.

The main isolated fixture has 100 teams, four flights, three buyers and 18 sales. It was completed for results/export testing, then reopened into a paused stress display with a long team name and $1,000,000 current bid. Its pre/post-restart full event snapshot matched. Other isolated fixtures cover drafts, empty, normal live, keyboard and correction journeys. IDs are in the evidence reports; they are disposable local audit records, not review or live events.

## Capability reconciliation

IMPLEMENTED means a representative behavior was exercised successfully in this audit, within the cited scope. PARTIAL means useful behavior exists but has a verified defect or meaningful untested branch. BROKEN means a named promised path was demonstrated failing. UNVERIFIED means code/configuration alone does not prove runtime behavior. NOT IMPLEMENTED means absent by inspection, not necessarily required. Hosted behavior is not inferred from a local pass.

Evidence: A = 58-check acceptance; R = 72-check refinement; M = 1,000 seeded cases; X = original API audit; W = correction/queue probes; B = original browser observations; BA = [Batch A](BATCH-A.md); BB = [Batch B](BATCH-B.md), 33 focused checks, 21 independent file checks and six browser groups. A/R/M/W were rerun for BB. BC = [Batch C](BATCH-C.md), final TV/phone/tablet/notification geometry and caption contrast; A/R rerun for BC. BD = [Batch D](BATCH-D.md), 42 focused checks, 20 BA assertions and four browser groups; A/R/M and all three CSV probes rerun successfully. Exact reports and limitations: [VALIDATION.md](VALIDATION.md).

| Capability | Status | Evidence / practical limit |
|---|---|---|
| Event creation | IMPLEMENTED (local) | BD event/demo sequential and eight-way concurrent retries return one event; changed input/actor/action conflicts; late failure rolls back. Browser creation/history/reload pass. |
| Flights | IMPLEMENTED | A/X create/edit grouping; B flight editor; sold-team flight move tested. |
| Teams | IMPLEMENTED | A/X/W create/edit/order/status; B quick entry/import. |
| Players | IMPLEMENTED | A/X/B player rows and quoted/Unicode names. Not tournament scoring. |
| Buyers/syndicates | IMPLEMENTED | A/W edits; B adds purchaser inside Sold; separate private contact fields. |
| Auction order | IMPLEMENTED | A reorder; R skip and undo; B automatic advance. |
| Quick team entry | IMPLEMENTED | B quick-adds Birch / Elm then sees field row. |
| Bulk import | IMPLEMENTED (local) | BD quote-aware comma/tab/pipe cases, 100-team mapping, roster round-trip, malformed atomic rejection and browser preview/save pass. |
| Bidding | IMPLEMENTED | A/R/W/B amount, increments, explicit lowering correction, pause rejection. |
| Opening-bid buttons | IMPLEMENTED | R/B no-buyer start; structured edit/reorder in B. |
| Bid increments | IMPLEMENTED | A/R/B minimum and configurable choices; keyboard +. |
| Bidder tracking | IMPLEMENTED | R off/on/unattributed/clear-identity; B default off. |
| Hammer / Sold | IMPLEMENTED | A/R/B exact bid, purchaser and current team validation. |
| Sale confirmation | IMPLEMENTED | B add/select purchaser, stale dialog disabled, double click produces one sale. |
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
| House deductions | IMPLEMENTED | A/M none, percent, fixed, odd cents and caps. |
| Projected payouts | IMPLEMENTED | A/M/B pool cards and cent totals. |
| Buyback modes | IMPLEMENTED | R off/calculate/track; W $1,250 × 50% = $625; X odd-cent private consideration. |
| Ownership | IMPLEMENTED | A/R/M/X 50/50, partial, declined, preserved on mode changes and exact awards. |
| Results | IMPLEMENTED | A/R/X saved unique positions and final entitlements. Browser form inspected; no scoring/tie resolution engine. |
| Settlement | IMPLEMENTED (local) | BB separates positive outstanding from overpayments for receipts and payouts, preserving signed parties/history. Corrections, reversals and undo pass. |
| Payments received | IMPLEMENTED | R/X/W/B partial/multiple/Mark paid, method/note persistence, reversal and audit. |
| Payout disbursements | IMPLEMENTED | R/X partial/full/reversal/undo; separate from receipts. |
| Exports | IMPLEMENTED (CSV/JSON), UNVERIFIED (print pagination) | BB independently reopened nine CSV variants; signed values and formula-like text pass. JSON backup and print-summary content checked; physical pagination remains unverified. |
| Public sharing | IMPLEMENTED (local) | R/BA event URLs/QR; BA selector, history, reload, creation and operator/public/TV links retain ID. Hosted sharing remains a gate. |
| QR codes | IMPLEMENTED | R independent decode matches localhost and synthetic HTTPS public URLs; B rendered/copy. Physical phone scan unverified. |
| Public board | IMPLEMENTED (local) | A/R/X/B privacy, filters, live/empty/pause/reconnect; BA context fixed. BC full-price containment at 320/390/430, filters and readable caption pass. |
| TV display | IMPLEMENTED (local viewports), UNVERIFIED (hardware) | BC live/paused short/long names, all-long queue/recent and completed seven metrics fit 1366×768 and 1920×1080. Physical fullscreen remains blocked. |
| Operator help | IMPLEMENTED | B reads guide at tablet size; source covers queue/corrections/settlement. |
| Auction Night instructions | IMPLEMENTED | B setup/running/after/TV guide; keyboard journey exercises instructions. |
| Authentication | UNVERIFIED (hosted) | Local mock and forged-header denial pass A/R. Real ChatGPT sessions not available at hosted origin. |
| Operators/access | IMPLEMENTED (local), UNVERIFIED (hosted) | BA atomic grant/revoke/audit under forced failures, concurrent replay, non-owner denial and revoked-session denial. Distinct hosted sessions remain unverified. |
| Audit history | IMPLEMENTED | A/R/X actor/action/undo; complete history in opened JSON backup. Retention at long duration unverified. |
| Concurrency protection | IMPLEMENTED | A 200/409 race; B four tabs stale dialog, sale, correction convergence. One local identity. |
| Mutation guards | IMPLEMENTED (tested paths) | A/R sale/payment replay and stale protection; BA atomic access replay; BD matching event/demo creation retries return the original result. Distinct UUIDs remain distinct operations. |
| Public/private separation | IMPLEMENTED (local) | A/R/X/B server flags, sentinels, private-export auth and public-only WebMCP. Hosted boundary remains a gate. |
| Reconnect behavior | IMPLEMENTED (local viewers) | B stop/restart retains safe board, warns on failed save, recovers automatically. Unsaved admin dialog remounts on dev restart. |
| WebMCP | IMPLEMENTED | B sole zero-input read-only public tool; no mutation tools. |
| Demo reset/restore | IMPLEMENTED (demo undo) | A exact confirmation/reset/undo. Full backup import/restore is NOT IMPLEMENTED. |

## Known limits and next action

The product is locally usable for representative journeys; it is not a hosted acceptance sign-off. A/B/C fix context, access atomicity, signed CSV, debt/overpayment summaries and display containment/contrast locally. BD also fixes roster delimiters and creation retries. Only optional export-contract cleanup remains in the finding register. Physical devices, screen readers, zoom, print pagination and other engines remain unverified or blocked. Scratch exited during the original audit, B's first regression attempt and C's early browser setup; complete suites passed after restart, but long-running stability/root cause remain unverified.

**Remaining optional scope: Batch E (`CAL-P3-001`), awaiting approval.** A/B/C/D implementation and local verification are complete. No open audited functional defect remains; hosted and hardware gates still apply. See [TASK-TRACKER.md](TASK-TRACKER.md) for status and [COVERAGE.md](COVERAGE.md) for tested versus partial surfaces.
