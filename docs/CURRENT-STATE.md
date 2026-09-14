# Current state — 2026-09-14 UTC

The product was audited at `dfab14906c04b5a6d99ffffbfba4249883750eae`; documentation baseline is `782eb3b`. Approved [Batch A](BATCH-A.md) (`4dc2900`) and [Batch B](BATCH-B.md) (`3d00923`) resolve CAL-P1-001/002/003/005 locally. Type checking, build and focused/regression checks passed; schema is unchanged. Five findings remain open: no demonstrated P0, one P1, three P2 and one P3. These counts do not imply production readiness.

Sites still has saved version 2 and no reported live/hosted-preview URL. No deployment was performed. The review stays at localhost:5173; isolated audit data lives in `.sites-runtime/audit-checkout/.wrangler/state` and is not part of a deployment archive.

## Event state and preservation

The original review event `f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2` remains outside audit mutations. At audit snapshot time the newest review event was the user's demo `c8146050-5c78-4246-b189-ed9b20f04f78`. Its revision changed from 0 to 5 while the user continued reviewing. The audit made **no mutation request to port 5173** and deliberately did not overwrite that newer state with a snapshot. See `audit-evidence/summary.json` for the read-only comparison.

The main isolated fixture has 100 teams, four flights, three buyers and 18 sales. It was completed for results/export testing, then reopened into a paused stress display with a long team name and $1,000,000 current bid. Its pre/post-restart full event snapshot matched. Other isolated fixtures cover drafts, empty, normal live, keyboard and correction journeys. IDs are in the evidence reports; they are disposable local audit records, not review or live events.

## Capability reconciliation

IMPLEMENTED means a representative behavior was exercised successfully in this audit, within the cited scope. PARTIAL means useful behavior exists but has a verified defect or meaningful untested branch. BROKEN means a named promised path was demonstrated failing. UNVERIFIED means code/configuration alone does not prove runtime behavior. NOT IMPLEMENTED means absent by inspection, not necessarily required. Hosted behavior is not inferred from a local pass.

Evidence: A = 58-check acceptance; R = 72-check refinement; M = 1,000 seeded cases; X = original API audit; W = correction/queue probes; B = original browser observations; BA = [Batch A](BATCH-A.md); BB = [Batch B](BATCH-B.md), 33 focused checks, 21 independent file checks and six browser groups. A/R/M/W were rerun for BB. Exact reports and limitations: [VALIDATION.md](VALIDATION.md).

| Capability | Status | Evidence / practical limit |
|---|---|---|
| Event creation | PARTIAL | B creates an event; X duplicate request creates two, CAL-P2-002. |
| Flights | IMPLEMENTED | A/X create/edit grouping; B flight editor; sold-team flight move tested. |
| Teams | IMPLEMENTED | A/X/W create/edit/order/status; B quick entry/import. |
| Players | IMPLEMENTED | A/X/B player rows and quoted/Unicode names. Not tournament scoring. |
| Buyers/syndicates | IMPLEMENTED | A/W edits; B adds purchaser inside Sold; separate private contact fields. |
| Auction order | IMPLEMENTED | A reorder; R skip and undo; B automatic advance. |
| Quick team entry | IMPLEMENTED | B quick-adds Birch / Elm then sees field row. |
| Bulk import | PARTIAL | Tab-separated preview/import and 100-team import pass; quoted pipe in CSV fails CAL-P2-001. |
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
| Public board | PARTIAL | A/R/X/B privacy, filters, live/empty/pause/reconnect; BA context fixed locally. Clipping/contrast findings remain. |
| TV display | PARTIAL | Normal 1920×1080 works; long/scaled/completed layout fails CAL-P1-004; physical fullscreen blocked. |
| Operator help | IMPLEMENTED | B reads guide at tablet size; source covers queue/corrections/settlement. |
| Auction Night instructions | IMPLEMENTED | B setup/running/after/TV guide; keyboard journey exercises instructions. |
| Authentication | UNVERIFIED (hosted) | Local mock and forged-header denial pass A/R. Real ChatGPT sessions not available at hosted origin. |
| Operators/access | IMPLEMENTED (local), UNVERIFIED (hosted) | BA atomic grant/revoke/audit under forced failures, concurrent replay, non-owner denial and revoked-session denial. Distinct hosted sessions remain unverified. |
| Audit history | IMPLEMENTED | A/R/X actor/action/undo; complete history in opened JSON backup. Retention at long duration unverified. |
| Concurrency protection | IMPLEMENTED | A 200/409 race; B four tabs stale dialog, sale, correction convergence. One local identity. |
| Mutation guards | PARTIAL | A/R exact sale/payment replay and stale batch protection; BA atomic/replay-safe access changes. Creation retry exception remains CAL-P2-002. |
| Public/private separation | IMPLEMENTED (local) | A/R/X/B server flags, sentinels, private-export auth and public-only WebMCP. Hosted boundary remains a gate. |
| Reconnect behavior | IMPLEMENTED (local viewers) | B stop/restart retains safe board, warns on failed save, recovers automatically. Unsaved admin dialog remounts on dev restart. |
| WebMCP | IMPLEMENTED | B sole zero-input read-only public tool; no mutation tools. |
| Demo reset/restore | IMPLEMENTED (demo undo) | A exact confirmation/reset/undo. Full backup import/restore is NOT IMPLEMENTED. |

## Known limits and next action

The product is locally usable for representative journeys; it is not a hosted acceptance sign-off. A/B fix context, access atomicity, signed CSV and debt/overpayment summaries locally. Display containment/contrast, roster delimiters and creation retries still require approved corrections. Physical devices, screen readers, zoom, print pagination and other engines remain unverified or blocked. Scratch exited during the original audit and B's first regression attempt; complete suites passed after restart, but long-running stability/root cause remain unverified.

**Recommended next scope: Batch C (`CAL-P1-004`, `CAL-P2-003`), awaiting approval.** A/B implementation and local verification are complete. See [TASK-TRACKER.md](TASK-TRACKER.md) for status and [COVERAGE.md](COVERAGE.md) for tested versus partial surfaces.
