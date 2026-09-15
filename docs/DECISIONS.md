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
