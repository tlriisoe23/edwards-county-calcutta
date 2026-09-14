# Edwards County Calcutta — refinement review

Status: local review build, ready to save as the next Sites version. No deployment or DNS change is authorized by this refinement request. Saving a version stores source and build; it does not create a hosted staging preview.

Open the existing demo's [operator console](http://localhost:5173/admin?event=f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2), [public board](http://localhost:5173/?event=f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2), or [TV display](http://localhost:5173/tv?event=f76b2c03-ca9d-4a99-aac0-20c6ad2e60d2) while the local server runs. These localhost links are development links, not internet-accessible spectator links. The existing 12-team, two-flight demo was preserved; bidding in this review remains editable.

## What changed

The original Vinext/React, Worker and normalized D1 architecture remains. This pass refines the live console, makes rule configuration visual, adds transaction-based manual settlement, and makes exports, sharing and operator guidance easy to find.

New events default to bidder tracking **Off** and buyback tools **Off**. Existing events that predate these settings retain their earlier bidder/ownership behavior; the demonstration is not silently reconfigured. The original cent and basis-point calculations, largest-remainder allocation, event/board revisions, concurrency guards, sale uniqueness, idempotency, audit history, public projections and reconnect behavior are retained.

## Auction Night walkthrough

### Before guests arrive

1. In **Teams**, verify names, players, flights and auction order. Quick add, full editing and spreadsheet/CSV preview remain available.
2. In **Setup & rules**, verify pool structure and house share. Use structured payout ladders to select a preset or edit percentages; every ladder must total exactly 100%.
3. Edit **Opening bid buttons** and **Bid increment buttons** as rows: add, edit, remove or move amounts up/down. Values must be positive, with up to eight buttons in each group.
4. Choose optional bidder tracking and buyback modes. Verify public display settings independently.
5. Open **Display & sharing**. Choose **Launch TV Display**, move its separate window to the TV/projector, and use its Full Screen control or the browser's full-screen command. Keep the operator console on the primary screen.
6. Open the public board in a second browser and check the correct first team. A spectator phone requires an approved hosted public deployment; localhost is not a shareable internet address.

### Running the auction

1. With no current bid, click **Start bid** ($100, $200, $300 or $500 by default). Buttons that cannot meet the configured minimum are disabled.
2. The same area switches to **Increase bid** with the configured increments. Direct keyboard entry remains available. Ordinary bids require only an amount.
3. If **Track bidder during live bidding** is enabled, a buyer can optionally accompany the bid. Public displays omit current-bidder attribution when tracking is off.
4. Press **Hammer / Sold**. Check team and final price; search/select a buyer, use a recent buyer, or **Add buyer** directly in the dialog. A tracked bidder is preselected as a convenience. A final buyer is required.
5. Confirm the sale. The server checks the staged revision, exact team and price and rejects stale confirmations. The next eligible team advances when auto-advance is enabled.

Keyboard shortcuts: **B** focuses bid entry; **Enter** records the bid; **+** applies the minimum increment; **S** opens Sold; **U** opens Undo. Text editing and open dialogs suppress global shortcuts. Console full screen reduces setup chrome.

### Corrections and queue actions

| Action | Meaning |
| --- | --- |
| **Skip for now** | Keeps the team eligible and moves it to the end of the queue as Upcoming. If it was on the block, clears its uncompleted bid and advances to the next team. Creates no sale, receivable or pool change. Confirmation explains this; the queue change is audited and Undo restores its prior position and state. |
| **Mark unsold** | Explicitly ends that team's current auction attempt as Unsold. This is distinct from temporarily postponing it. |
| **Withdraw team** | Removes the team from the eligible auction field. A sold team requires the sale to be voided/reopened first. |
| **Edit sale** | Corrects price or purchaser and recalculates totals and settlement balances. Existing payment records remain; corrections can reveal an overpaid balance. |
| **Reopen / void sale** | Uses the existing audited workflow to reverse the active sale's financial contribution; reopen makes the team available for auction again. |
| **Undo last action** | Restores the prior auction action with revision protection. Settlement history is retained; undoing a settlement action appends a compensating entry. Undo cannot remove a buyer/team referenced by retained settlement history. |

Pool changes with sales and ladder changes with dollars/results require explanatory confirmation. Pool membership cannot change while finishing positions exist. Clearing finishing positions is a separate confirmed action; recorded payouts are retained. Demo reset is explicitly confirmed and should be used only on disposable demonstration data.

## Visual payout setup

Each applicable flight or shared/combined pool has a **Payout ladder**. Choose 70/30, 70/20/10, 60/30/10, 50/30/20, 40/30/20/10, or Custom. Add up to ten paying places, edit percentages inline, remove places and reorder rows. The live total shows the percentage; Save is disabled unless it is exactly 100%. When dollars exist, each row shows its projected amount using the original cent-exact allocation engine.

Rules still support separate flight pools, one combined pool, and custom shared/independent flights. House share remains None, Percentage or Fixed amount, with proportional allocation of fixed amounts across pools. Stale setup drafts are rejected rather than overwriting another operator's work.

## Optional buyback assistance

| Mode | Behavior |
| --- | --- |
| **Off** | Default for new events. Hides routine buyback actions, calculations and deadlines. New sales remain 100% owned by their purchaser. Creates no buyback obligation. |
| **Calculation only** | Shows a configurable suggested percentage beside completed sales (50% by default). A $1,200 sale shows a $600 suggested calculation. The label states that this is a private agreement, not money owed to the club. No ownership or pool change is made. |
| **Track ownership** | Enables the existing completed partial/full buyback records and ownership allocation, subject to configured limits. Public ownership visibility remains independently configurable. |

Buyback consideration never increases gross/net auction pools and never becomes a club receivable. Switching modes does not erase historically recorded ownership; final entitlements continue to respect it. Recording a sale no longer automatically creates a pending buyback record.

## Settlement walkthrough

**Settlement** keeps **Auction receivables** and **Payout payables** separate. Search by party and filter status to find unpaid, partial or paid accounts. Buyback consideration is excluded. No automatic netting occurs between purchases owed and winnings.

1. Find a buyer. Expand the account to inspect every purchased team and active sale amount, total owed, and full payment history.
2. Choose **Record payment** for a partial amount or **Mark paid** to prefill the remaining balance. Confirm amount, date/time, method and optional reference/note. Cash, Check, Venmo and Other are labels only.
3. Balances and Unpaid/Partial/Paid status derive from active sales and signed payment records. Stale submissions, duplicate requests and payments above the current remaining balance are rejected.
4. To correct a transaction, **Reverse** it with a reason, then record the replacement if needed. The original remains visible and the reversal is a new signed entry. Audit history records both.
5. After completing the auction and entering results, inspect the separate payout accounts. Purchaser/team entitlements respect ladders and ownership. Record disbursements with the same partial/paid workflow; payout recording requires a completed event and an entitlement.

If a later sale, ownership or result correction reduces the amount owed below an already-recorded amount, the account shows **Overpaid**. The app does not automatically move money, refund it, net it against another balance, or discard history. Reconcile the real-world situation and record appropriate corrections deliberately. Avoid sensitive banking/card details in notes.

## Exports and printed records

**Exports** provides **Auction Results CSV**, **Buyer Settlement CSV**, **Teams & Flights CSV**, **Final Results / Payouts CSV**, **Ownership / Buyback CSV**, **Payment History CSV** and **Full Event JSON Backup**. Ownership export is useful when tracked ownership exists. CSV fields are escaped and protected against spreadsheet formula injection.

- Auction Results includes sale history/status; sum **active** rows to reconcile the current gross pool.
- Buyer Settlement includes purchased teams, total owed, recorded receipts, balance and status.
- Final Results / Payouts includes pool, place, payout percentage, team prize, ownership percentage, entitled party and amount, plus party payment status. Party totals repeat across a party's multiple entitlements; sum entitlement amounts, not repeated party totals.
- Payment History includes original entries and signed corrections for both receipts and disbursements.
- Full Event JSON Backup includes complete event records and audit history, with private buyer/contact/audit fields clearly labeled. It is an administrator-only archive, not a public download or an implemented restore workflow. It excludes deployment secrets and the global operator allowlist.
- **Print event summary** provides a dedicated print layout for browser Print / Save as PDF. Display & sharing also has a printable QR handout and downloadable QR PNG.

All download endpoints enforce server-side operator authorization. Public views and share links contain no settlement/contact/audit data or write credentials.

## Public sharing, QR and TV

In **Display & sharing**, choose **Open Public Board**, **Copy Public Link**, or download/print the QR. It is generated locally and encodes exactly the view-only public URL. **Open TV View / Launch TV Display** and **Copy TV Link** use the separate TV route. Links derive from the actual origin and contain only route and event ID, without admin state or tokens.

Localhost links are clearly labeled development-only. After an approved hosted deployment, the same UI uses the hosted origin. Spectator access also depends on the site's public audience setting; hosted access has not yet been tested.

The public board retains current team/bid, optional attribution, aggregate and flight pools, projected/final purses, recent sales, search/filter and house rules. TV retains current team, queue, aggregate totals and recent sales at 1080p. **Help** and the **Auction Night checklist** are accessible directly in the operator interface, including on a tablet.

## Schema and integrity

Migration `0001_normal_magdalene.sql` adds two relational tables without modifying existing tables:

- `settlement_payments`: event/buyer references, signed integer-cent amount, occurred-at time, method, note, actor, creation time, and optional unique reversal reference.
- `payout_disbursements`: the same transaction fields, with exactly one buyer or team reference enforced by a check constraint.

Both reject zero amounts and index event lookups; receipts also index buyers. Unique reversal references prevent reversing an original twice. Balances derive from these records and authoritative sales/entitlements, not event configuration. They use the existing atomic mutation batches, revision checks, idempotency guards and audit history. Undo preserves transaction history and appends compensations where appropriate.

The original 12 tables remain: events, flights, teams, players, buyers, auction_state, sales, ownership, payout_rules, audit, operators and mutation_guards. Configuration JSON gains quick-start amounts and optional bidder/buyback settings; it does not hold settlement history.

## Validation performed

- **58 existing acceptance checks passed**, preserving the original assertions. Legacy fixtures explicitly enable former bidder/ownership modes so original coverage remains exercised.
- **72 new acceptance checks passed**: first bid without buyer, increments, mandatory final purchaser, exact/stale/idempotent Sold, optional tracking/public attribution, all buyback modes, private consideration exclusion, multiple purchases, partial/paid states, overpayment protection, immutable correction/undo, disbursements, exports and exact reconciliation, Skip/Undo versus Unsold, ladder validation, public URL safety and independent QR decoding.
- The existing suite retained concurrency, CSRF, forged-header rejection, mutation guards, privacy, cent math, combined/custom pools, undo, 100-team and demo reset/restore coverage. **500 randomized cent-exact allocations passed.**
- TypeScript checking and the Vinext production Worker build passed. Local D1 `foreign_key_check` returned no violations.
- Browser review exercised first-bid/increment controls, inline buyer creation in Sold, partial payment and Mark paid, custom ladder add/edit/remove/reorder and invalid-total blocking, confirmation/resave behavior, calculation-only assistance, copied public URL, visible QR and TV launch in a separate tab.
- Phone public board at **390 × 844** and tablet guide/setup at **768 × 1024** remained readable without horizontal overflow. TV at **1920 × 1080** fit without scrolling.
- After stopping/restarting the local server, payments, reversals, disbursements and derived balances matched the saved snapshot exactly. The public board retained its last state with Reconnecting and recovered without manual refresh.
- All seven authenticated download variants passed HTTP checks; unauthorized and forged-header requests were rejected. The generated QR was independently decoded to the exact public URL. Print layouts were implemented, but a physical printout or saved browser PDF was not independently inspected.

Tests used separate fictional events; disposable rehearsals were removed after inspection while retaining the original demo and its ongoing operator edits. Ignored reports remain in `.sites-runtime/acceptance-report.json` and `.sites-runtime/refinement-report.json`.

## Authentication and hosted verification boundary

Hosted ownership remains restricted to **tlriisoe@gmail.com** through the Sites `ADMIN_EMAILS` secret configured for this project. The owner can add/revoke operator emails in **Access**; added operators cannot change the owner allowlist or grant access themselves. Authorization is evaluated server-side on each request. An empty owner allowlist grants no owner access.

Local preview uses Sites' labeled simulated sign-in, `seedy@sites.test`. It is dev-server middleware, not authentication in the built production Worker. Local tests do **not** verify actual hosted ChatGPT sign-in, dispatch identity-header protection, anonymous public accessibility/audience, D1 provisioning/migration/redeployment behavior, or production multi-user performance. Those remain checks for the first explicitly approved hosted deployment.

No payment processing, remote participant bidding, pre-bidding, silent auction or golf scoring engine was added. Local data is excluded from the deployment archive. Do not deploy this saved review version until the user explicitly approves deployment.
