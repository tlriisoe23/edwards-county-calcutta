# Product decisions

Recorded by the owner (via Claude Code) on 2026-09-15 to unblock the audit E2 batches in
[TASK-TRACKER.md](TASK-TRACKER.md). Each entry is the rule an implementer must follow;
change the rule here first if the club changes its mind. Rationale cites common Calcutta
practice (club rule sheets, Golf Genius Calcutta module, auction software conventions).

| ID | Finding | Decision |
|---|---|---|
| D-CAL-1 | CAL-P2-005 | A one-screen TV layout is required below 700 px height; a 1366×768 laptop at 125 % scaling (1093×614) is a realistic clubhouse display. (Applied in Batch F.) |
| D-CAL-2 | CAL-P3-003 | **Minimum starting bid** must be at least $1.00; an empty field blocks save with "Enter a minimum starting bid of at least $1.00". **House deduction**: "no house cut" is expressed only by deduction type *None*; when the type is Percent or Fixed the amount must be greater than 0 and an empty field blocks save. Saving never silently coerces a blank to 0. Rationale: auction systems require a positive opening bid; a zero cut is a mode, not a value. |
| D-CAL-3 | CAL-P3-004 | Import preview marks each blocking row inline ("flight not found", "name required", "index must be a number") and the button reads "Import N teams · M rows need attention". Import stays atomic. |
| D-CAL-4 | CAL-P3-005 | Granting an owner's email returns "already an owner" with no row and no audit entry. Granting an existing operator (case-insensitive) returns "already has access" with no audit entry. Owners are listed read-only above operators. |
| D-CAL-5 | CAL-P3-007 | Approved as part of Batch I: make the bid-entry / Hammer panel sticky at the bottom of the console column for viewports under 800 px tall, provided the block still shows team and current bid. If that cannot be done as a small layout change, defer. |
| D-CAL-6 | CAL-P3-006 (Batch J) | An unclaimed purse share (a paid place held by an unsold team) **goes to the house**. Per event, in Rules, the house chooses **Keep** (default) or **Return to pot**. Return to pot redistributes that place's amount across the remaining claimed paid places *in the same pool*, proportionally to their ladder percentages renormalized, cent-exact under the existing largest-remainder method; if no claimed paid place exists in that pool the amount stays with the house. Placing an unsold team is legal. Results and Settlement show "Place N — unsold team — $X to house (kept / returned to pot)". The chosen rule is shown in Rules and on the public board/handout rules line so bidders know it before the auction. Withdrawn teams remain rejected. Rationale: most Calcutta rule sheets state that unsold teams are owned by the house; keeping is the conservative default because redistribution changes other buyers' payouts. |
| D-CAL-7 | CAL-P3-001 (Batch E) | Remains optional and unscheduled; not a release blocker. |

Batch order stands as proposed: F → G → H → I → J. Nothing here authorizes a redeploy of
`ecgc-calcutta-app-1`; that remains a separate decision.

## Night-of correctness — 2026-09-18

| ID | Finding | Decision |
|---|---|---|
| D-CAL-8 | UI-CA-08 | The bid field **replaces** what it holds. It is kept equal to the server's current bid so a clerk can see and correct it, which is right — but that made the documented `B`-then-type path append, turning $1,300 into $12,501,300 whenever the result happened to satisfy the increment rule. Selecting on focus keeps the visible-current-bid behaviour and removes the trap, and `min` is now the event's minimum bid so an impossible number is refused by the control as well as the server. |
| D-CAL-9 | UI-CA-09 | Enter confirms the sale, handled **on the dialog** rather than by wrapping its body in a form — the inline add-buyer form already lives inside it, and a nested `<form>` is invalid. Enter is deliberately not intercepted while the buyer list is open or the add-buyer form is up, because each owns the key for its own purpose. Focus returns to the bid field on close, so the keyboard path runs lot to lot without reaching for the mouse. |
| D-CAL-10 | UI-CA-16 | Reopening a completed auction confirms, like every other consequential act in this product. Its button names the act — **Reopen auction** — rather than reading "Confirm", which is the pattern UI-CA-15 asks for across every dialog; it is applied here only, where this change already touched one, rather than swept through all of them unasked. |
| D-CAL-11 | UI-CA-07 | Undo is disabled when `lastUndoable()` finds nothing, and both ways in — the `U` key and the button — carry one sentence. A control that opens a dialog explaining it cannot work is worse than a disabled control that says why. |

## The fifty-team two-day fixture (2026-09-18)

| ID | Scope | Decision |
|---|---|---|
| D-CAL-12 | The demo is the evening, not a snapshot of one | The twelve-team demo loads mid-auction, with sales already recorded and a team on the block — right for practising the console, wrong for rehearsing the night. The fifty-team one loads at **SETUP**, with nothing sold, nothing on the block, and buyers already in the list: the state the room is in ten minutes before the first lot. Both stay; the Tools menu offers each by what it is for. |
| D-CAL-13 | The same fifty teams as the leaderboard, copied rather than shared | `lib/demo-two-day.ts` is a literal table of the fifty teams the leaderboard's own `demoTwoDay()` builds — the same names, the same four flights at 13 · 13 · 12 · 12, and each team's pop as that product worked it out. It is copied because the two repositories share no code by design (AGENTS.md), and copying is stated plainly in the file rather than hidden: it can drift, and `tests/two-day-demo.mjs` pins the shape it must not drift out of. The pop rides in the **handicap** column, which is where this product already keeps a per-team number the room can see. |
| D-CAL-14 | A fixture that will not commit is not a fixture | Fifty teams and a hundred players is a hundred and seventy-odd inserts, and the local D1 runner drops the connection outright at that size — the first attempt failed with "Network connection lost", not a validation error. `insertMany()` folds rows into multi-row INSERTs, and folds them **in chunks**, because D1 allows only about a hundred bound parameters per query; one statement per table would have traded one limit for the other. The whole event still commits as a single batch, so a retry cannot leave half a demo behind. |

