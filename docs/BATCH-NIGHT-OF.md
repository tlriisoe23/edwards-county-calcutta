# Night-of correctness (owner-directed, 2026-09-18)

Implemented on `claude/cal-night-of`, off `main` at `b6fb0f0` (the Batch L merge). **No schema
change.**

The four findings §5.1 of the [2026-09-17 UI audit](UI-AUDIT-2026-09-17.md) put first, on the
grounds that "each one removes a way to record a wrong number or stall the room". Each is verified
against **the audit's own acceptance test** in the new `tests/night-of.mjs`, rather than against the
implementation — 12 checks.

## UI-CA-08 — the bid field appended instead of replacing

The worst of the four, and the reason this batch went first. The input is kept equal to the server's
current bid, and `B` focused it without selecting. So the documented keyboard path — press `B`, type
the new number — **appended**: `1300` typed over a `$1,250` field sent `12501300`. That is rejected
if it happens to miss the increment rule, and **recorded as a $12,501,300 bid if it does not**.

`B` now selects, the field selects on any focus, and `min` is the event's own minimum bid rather
than `0`.

> **Asserted:** B, type `1300`, Enter records **$1,300** — and the appended value never reaches the
> server.

## UI-CA-09 — the sale could not be confirmed from the keyboard

The hammer in the Sold dialog was not a submit and nothing handled Enter at dialog level, so the
keyboard path the Help screen advertises stopped halfway. Worse, a dialog opened with `S` left
`activeElement` on `<body>`, so the dialog returned focus there on close and the clerk was handed
back to the mouse **between every lot**.

Enter now confirms once a buyer is chosen — but not while the buyer list is open, which owns Enter
for its own selection, and not while the inline "add buyer" form is up, which owns its own. It is
handled on the dialog rather than by wrapping the body in a `<form>`, because the add-buyer form is
already inside it and a nested form would be invalid.

> **Asserted:** `S`, choose a buyer, Enter records the sale; the dialog closes; focus is back in the
> bid field, ready for the next lot.

## UI-CA-16 — reopening a completed auction took one unconfirmed click

From COMPLETED, a single click flipped the public board from a final summary back to live bidding
and re-enabled the hammer — while **Complete**, the less consequential direction, has always
confirmed. It asks now, states that recorded sales are kept, and its action button reads **Reopen
auction** rather than the default "Confirm" (UI-CA-15's smaller half, applied where this change
already touched the dialog).

> **Asserted:** restarting asks first, names what happens to the sales, and nothing changes until it
> is confirmed.

## UI-CA-07 — Undo was live with nothing to undo

Clicking it opened a dialog whose description said "There is no recorded action to undo yet." above
a working Confirm button that posted `undo` and earned a server error. The two ways in also
explained the same action differently, the button's version written for nobody: "Other operator
changes are protected by a version check."

Disabled until there is something to undo; one sentence for both paths.

> **Asserted:** on a fresh event the Undo button is disabled.

## Validation

| Check | Result |
|---|---|
| `tsc --noEmit` | **PASS** |
| `npm run lint` | **unchanged** — 82 problems (48 errors, 34 warnings), the repository's pre-existing count, none from this change |
| `npm run build` | **PASS** |
| `tests/acceptance.mjs` | **PASS** — 58 |
| `tests/refinement.mjs` | **PASS** — 72 |
| `tests/ui3-reorder.mjs` | **PASS** — 20 |
| `tests/ui3-browser.mjs` | **PASS** — 63/63 |
| `tests/night-of.mjs` | **PASS** — 12/12 (new) |

Local `.wrangler/state` and disposable demo events only. The production container, its volume and
the Cloudflare route were not touched. **Not deployed.**

## Two things the next session should know

- **Neither browser suite runs from a clean checkout.** `playwright` is not a dependency of this
  repository, unlike the leaderboard's. Both accept `UI3_PLAYWRIGHT_MODULE`, and both were run here
  with it pointed at the sibling's installed copy. Worth fixing so the suites stand on their own.
- **Both write screenshots into `docs/batch-l-evidence` by default**, which overwrites Batch L's
  recorded evidence simply by running them. The originals were restored and `UI3_EVIDENCE` pointed
  at a scratch directory instead. A default that overwrites another batch's evidence is a trap.

## Not done

The rest of the `UI-CA-*` set, including UI-CA-15 proper (every confirmation's button reads
"Confirm" in the default primary style, with no destructive flag) and the whole of §4's P2 list.
