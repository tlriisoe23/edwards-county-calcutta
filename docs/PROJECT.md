# Edwards County Calcutta

This is an operator-run recordkeeping application for a verbal, in-person golf Calcutta. A club volunteer records bids and final purchasers; spectators follow an anonymous public board or clubhouse TV. After the auction, the club records receipts, tournament results, ownership-adjusted entitlements and payments made outside the application.

This document describes the existing product. [CURRENT-STATE.md](CURRENT-STATE.md) records what was verified; [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md) records demonstrated problems; [TASK-TRACKER.md](TASK-TRACKER.md) is the approval boundary for changes.

## People and workflows

| User | Primary workflow |
|---|---|
| Owner | Configure the event, manage the operator email allowlist, review records and exports. |
| Operator | Set flights/teams/buyers/rules; start, bid, sell, correct and manage the queue; record settlement. |
| Spectator | View current team, bid, public buyer information, pools, recent sales and the field. |
| Treasurer | Reconcile purchases and receipts separately from final awards and payout disbursements; export records. |

The normal sequence is Setup → Teams → Buyers → Start auction → Record amount → Hammer / Sold → Select purchaser and confirm → Correct exceptions → Complete → Record receipts → Enter results → Record payouts → Export. Results may arrive later than the auction. Help includes an Auction Night checklist and TV instructions.

## Business rules and terminology

| Term | Current meaning |
|---|---|
| Event | One tournament/auction configuration and its relational records. An explicit `?event=ID` identifies it; an unqualified browser entry resolves the newest event once and pins its ID in the URL. |
| Flight | Group of teams. A flight can have its own pool or contribute to the combined/shared pool according to configuration. |
| Team / players | Auction lot with one to four player records, flight, order, public notes and separate private notes. |
| Buyer / syndicate | Final purchaser, optionally with a group/contact/private notes. Names identify people/groups; these are not bidder login accounts. |
| Gross pool | Sum of ACTIVE auction sales. Voided/reopened sale history is retained but excluded. |
| Net pool | Gross less the configured house/charity deduction, capped by available gross. |
| Payout ladder | One to ten places whose stored percentages total 10,000 basis points (100%). Rounding reconciles to available cents. |
| Projected / final purse | Allocation of pool money to finishing places. A final entitlement additionally needs a recorded result and eligible sale ownership. |
| Buyback | Optional private agreement between purchaser and team. Off, Calculation only and Track ownership are separate modes. |
| Receipt | Manual record of an auction payment received outside the app. Reversals retain the original entry. |
| Disbursement | Separate manual record of a tournament payout made outside the app. |
| Skip for now | Move an eligible team to the queue end; no financial entry or permanent unsold classification. |
| Mark Unsold | Remove the team from the active queue without a sale; it can later return. |
| Withdraw | Retain a team record but exclude it from auction participation. Active sales must first be corrected explicitly. |
| Reopen / void | Reopen returns a sold team to Upcoming; void marks it Unsold. Both remove the old sale from the active pool. |

Money is stored as integer cents and percentages as integer basis points. New events default to amount-only bidding, $100 minimum, $25 increment, opening choices 100/200/300/500, separate flight pools, a 10% house share, auto-advance and buyback tools Off. Legacy events retain existing bidder/ownership behavior through normalization. Defaults are configuration, not an inferred requirement to change existing events.

The purchaser is mandatory at final sale; selecting one on every bid is optional, including when bidder tracking is enabled. One ACTIVE sale per team, expected revisions, request IDs and transactional writes protect routine auction actions. Batch A also makes access changes and their audit atomic and replay-safe. Batch D makes event/demo creation replay-safe for a matching UUID, actor, action and normalized input, with the result stored atomically in audit.

Buyback consideration never increases the pool or becomes a club receivable. Completed ownership affects entitlement; turning the tools Off preserves ownership. Receipts and payout obligations remain separate; purchases are not netted against winnings. Per-party overpayments stay attached to their party. Batch B reports positive outstanding amounts and overpayments separately on both sides, retaining signed party balances and numeric signed CSV exports.

Finishing positions are entered by an operator. Ties are resolved outside the app. No policy for distributing unclaimed places or prizes to unsold/withdrawn teams is inferred by this audit; confirm such a policy before proposing any business-rule change.

## Protected constraints and non-goals

Preserve the [KEEP / PROTECT list](PRODUCT-AUDIT.md#keep--protect). Server-side authority, exact cents, audit/undo, public field allowlisting, view-only spectator routes and server authorization are product requirements. A localhost link must be identified as local-only.

Participant accounts/bidding, pre-bidding, silent or timed remote auctions, payment processing and full tournament scoring are future ideas, not missing requirements. This project remains separate from ECGC WordPress, Fairway Ops and Golf Management products. The current audit does not authorize redesign, architecture replacement, data migration, business-rule changes or production deployment.

## Deployment and durable context

Audit baseline: Git `dfab14906c04b5a6d99ffffbfba4249883750eae`, 2026-09-14 UTC. Sites project `appgprj_6aa756cabf648191a8711a28256d49a7`, slug `edwards-calcutta-live`, latest saved version **2**. Native Sites metadata returned no current live or hosted preview URL. Access mode is `custom`; that metadata alone does not establish anonymous hosted viewing.

The existing review is local at port 5173. Audit fixtures use an exact source checkout with a separate D1 store and dependency installation at `.sites-runtime/audit-checkout`, port 5174. They do not replace the user's review. The user's review changed independently during the audit; no old snapshot was restored over their edits.

Hosted ownership was configured for `tlriisoe@gmail.com` in the prior authorized pass. The owner can manage additional operator emails in Access. Actual hosted owner/non-owner sessions and revocation remain unverified. The ignored local `.env` uses the starter's mock identity; never use it as hosted owner configuration or publish local credentials/data.

The original audit established the baseline; approved [Batch A](BATCH-A.md) (`4dc2900`) and [Batch B](BATCH-B.md) (`3d00923`) resolved CAL-P1-001/002/003/005 locally without migration or deployment. Approved [Batch C](BATCH-C.md) (`4da7b9b`) also resolves CAL-P1-004 and CAL-P2-003 through CSS-only display fixes. Approved [Batch D](BATCH-D.md) (`a76e57f`) resolves quoted roster imports and creation retries. Only optional Batch E, CAL-P3-001, remains open in [TASK-TRACKER.md](TASK-TRACKER.md).
