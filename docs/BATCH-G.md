# Batch G — Sold dialog Escape

2026-09-15 UTC. The owner approved Batch G exactly as proposed in [TASK-TRACKER.md](TASK-TRACKER.md): **CAL-P2-006 is implemented and verified locally** on branch `claude/cal-g-sold-dialog-escape` (one commit stacked on the Batch F tip `8230c80`; the hash is in the branch and the handoff). No deployment, container, route, migration, dependency or production access change occurred; the live container at `calcutta.edcogolf.org` still runs the previous build and Batch F is also still unmerged. Lifecycle state: **implemented → validated (local)**, not merged, not deployed.

## What changed

**CAL-P2-006 — Escape with buyer suggestions open discarded the whole Sold dialog.** Radix's dialog listens for Escape on `document` in the capture phase, so the keydown reached the dialog's dismiss handler before the base-ui combobox input ever saw it; a keyboard operator who typed part of a buyer name and pressed Escape to dismiss the suggestions lost the staged sale instead. Stopping propagation inside the combobox could not help (capture runs first), so the smallest correction is in `SoldDialog` (`app/auction-controls.tsx`): `DialogContent` now receives `onEscapeKeyDown={escapeClosesListFirst}`, a four-line guard that calls `preventDefault()` only when the key's target is a `[role=combobox]` whose `aria-expanded` is `"true"`. Radix then leaves the dialog open, and the combobox's own Escape handling (base-ui `useDismiss`, which does not consult `defaultPrevented`) closes the list and keeps focus in the input. With the list closed the guard is inert, so the next Escape, *Cancel*, the ✕ button and *Confirm sale* behave exactly as before. The shared `components/ui/dialog.tsx` and `components/ui/combobox.tsx` primitives are unchanged, as are `onOpenChange`, the stale-revision check, the inline *Add buyer here* form and the operator keyboard-shortcut guard in `app/operator.tsx`.

Observation, not a change: when base-ui closes the list on Escape it also resets the typed filter text (`"Ta"` → `""`), its standard combobox behaviour. The operator retypes, picks a recent-buyer chip or uses *Add buyer here*; the finding's acceptance (list closed, dialog kept, focus kept) does not cover the filter text.

## Commands

Local dev server `npm run dev` on 5173 against the existing `.wrangler/state` store. Browser evidence: Playwright 1.62.1 headless Chromium 151 with axe-core 4.13, driven by [batch-g-evidence/scripts/batch-g.mjs](batch-g-evidence/scripts/batch-g.mjs) (localhost only; the same scratch symlink arrangement as Batch F). The script creates one **disposable synthetic event** `BATCH-G Escape · 2026-09-15` (one flight, four fictional teams, four fictional buyers, LIVE) and records its sales only there; it does not touch the E2 fixtures. Then `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm run lint`, `npm run build`, `node tests/acceptance.mjs`, `node tests/refinement.mjs`.

The harness is keyboard-first: it opens the Sold dialog with the `S` shortcut, types into the buyer combobox and reads, after every key, whether `.sale-dialog` exists, whether a `[role=listbox]` is mounted, the combobox's `aria-expanded` and value, the active element, the inline form, the stale `[role=alert]` notice and the *Confirm sale* disabled state. Sale counts and revisions are read back through `/api/admin`.

## Results

| Check | Result | Evidence |
|---|---|---|
| Baseline reproduction before the change | FAIL as registered: after one Escape with the list open `{dialog:false, focus:BODY}` at 1024×768, in the stale-dialog case and at 390 px; second-Escape check BLOCKED because the dialog was already gone | [before.json](batch-g-evidence/before.json) — 10 PASS / 4 FAIL / 1 BLOCKED (the fourth FAIL is a page-wide axe run that hit the separate open CAL-P2-007 contrast items; the final script scopes axe to the dialog and popup) |
| `S` opens the dialog with focus in the buyer combobox; typing `Ta` opens the list (`aria-expanded="true"`, three matches) | PASS | [batch-g.json](batch-g-evidence/batch-g.json), [sold-dialog-list-open.png](batch-g-evidence/sold-dialog-list-open.png) |
| **First Escape closes only the list**: dialog retained, listbox unmounted, `aria-expanded="false"`, active element still the *Final purchaser* combobox | PASS | batch-g.json, [sold-dialog-after-first-escape.png](batch-g-evidence/sold-dialog-after-first-escape.png) |
| Second Escape closes the dialog | PASS | batch-g.json |
| Escape with the list closed closes the dialog (unchanged); *Cancel* closes the dialog (unchanged) | PASS | batch-g.json |
| `U` / `S` / `+` while the dialog is open (focus on a dialog button): no confirm dialog, still one Sold dialog, revision 8 → 8, bid unchanged | PASS | batch-g.json |
| Mouse click on *Add buyer here* with the list open opens the inline form in one click; *Add & select* creates and selects `Batch G Buyer`, *Confirm* enabled | PASS | batch-g.json |
| *Confirm sale* by keyboard Enter records exactly one sale (0 → 1) and advances the block; keyboard-selected *Weekend Club* then a double-click on *Confirm* records exactly one more (1 → 2) | PASS | batch-g.json |
| Stale dialog: after an API bid raised the revision the notice appears and *Confirm* is disabled; with the list open, Escape closes the list first and the second Escape closes the stale dialog | PASS | batch-g.json |
| axe on the open dialog and suggestion list (`region` landmark rule off for the popup) | PASS, no violations | batch-g.json |
| Phone 390 × 844: first Escape closes only the list, focus retained | PASS | batch-g.json, [sold-dialog-390-after-first-escape.png](batch-g-evidence/sold-dialog-390-after-first-escape.png) |
| Harness total | **15 PASS, 0 FAIL** (10 PASS / 4 FAIL / 1 BLOCKED before) | batch-g.json |
| TypeScript | PASS | command output |
| `npm run lint` | FAIL — pre-existing: 48 errors / 43 warnings, message-for-message identical at `8230c80`; the only diff is the pre-existing `PayoutLadder` `react-hooks/set-state-in-effect` error moving from line 30 to 32 in `auction-controls.tsx` | command output |
| `npm run build` | PASS | command output |
| Existing acceptance | **58 / 58 PASS** (events `7489a064…`, `5ac9475f…`) | command output |
| Existing refinements | **72 / 72 PASS** (event `1136a0d6…`) | command output |

Rendered screenshots were inspected directly: with the list open the three `Ta…` buyers overlay the dialog footer; after the first Escape the dialog, team, `$100` price, focused input with its focus ring, *Add buyer here*, *Cancel* and the disabled *Confirm sale* are all still on screen and the list is gone.

## Isolation and cleanup

Writes went only to two disposable synthetic events named `BATCH-G Escape · 2026-09-15` in the local store: `ada04938-9d88-48c7-b52c-e88a15c7a6a5` (baseline run: two sales, one added buyer) and `31e9fdc4-3abe-4262-a097-89eb52eb9c17` (final run: two sales, one added buyer, LIVE, revision 14, $150 bid on the block). They are left in place like the E2 fixtures. The acceptance and refinement suites created their own rehearsal events as always. The AUDIT-E2 fixtures were read once and not modified; no fixture was deleted. The production container, its volume, `/data/calcutta.sqlite`, `portable/` and `.env.portable` were not touched or read.

The dev server exited on its own ("Tunnel closed") at the very end of the baseline run, after every baseline check had been logged; it was restarted before the final run and stayed up through the final harness, acceptance and refinement runs. It was stopped at the end. Only the script, two JSON reports and three cited screenshots (272 KB) are committed.

## Reproduction

Start `npm run dev` on 5173 with the local `.wrangler/state` store. From a scratch directory with Playwright and axe-core resolvable, run `OUT=/abs/out node docs/batch-g-evidence/scripts/batch-g.mjs` (add `--shots` for the phone screenshot; set `EVENT=<id>` to reuse an existing disposable event that still has unsold teams). The script refuses non-localhost origins, signs in with the starter's mock identity, creates its own synthetic event and writes `batch-g.json`, `event.json` and screenshots to `OUT`.

## Limitations

Firefox/Safari, screen readers, real phones and hosted operation remain unverified for this interaction; the check relies on base-ui setting `aria-expanded` on the combobox input, which the same primitive already exposes for the E2 evidence. The typed filter text is cleared by the combobox when the list closes on Escape (see above). Lint failures are pre-existing repository debt. These local results do not certify the live container, which has not been updated.

## Next scope

Open after Batch G: CAL-P2-007 and CAL-P3-002 (Batch H), CAL-P3-003/004/005/007 (Batch I), policy-gated CAL-P3-006 (Batch J) and optional CAL-P3-001 (Batch E). Batches F and G are stacked on one another and both await merge; applying them to the live container needs the separate release authorization described in `AGENTS.md`.
