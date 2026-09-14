# Batch C — public/TV containment and readable captions

2026-09-14 UTC. The user approved the recommended Batch C with “proceed.” **CAL-P1-004 and CAL-P2-003 are resolved and verified locally in `4da7b9b`**, based on `a8045a4`. No deployment, saved Sites version, migration, dependency or production access change occurred.

## What changed

The TV layout now reserves content-sized rows for the heading, statistics and recent sales, leaving the remaining screen for the active lot and queue. Bid and title sizes respond to available space. The queue has more width and tighter spacing, and completed auctions keep all seven metrics on one row. The complete bid remains visible instead of being cropped.

Shared public/operator amounts fit their columns, long names and buyer text wrap, and phone sale notifications use the available width with side margins. The recent-sales caption is 14px with foreground `#526047`: measured contrast is **6.02:1 on TV and 6.21:1 on the public board**, above the 4.5:1 requirement.

Only `app/globals.css` changed in product source. Public projections, auction actions, monetary values/calculations, settlement, ownership, event context and access rules are unchanged.

## Validation

| Check | Result | Evidence |
|---|---|---|
| TV at 1366×768 and 1920×1080 | Passed live/paused with short and long active names; completed with seven metrics | [browser.json](batch-c-evidence/browser.json), final 10 configurations |
| Long queue and recent sales | All three upcoming and recent names long; no out-of-container text or section overlap | Final TV matrix; 12 teams, four flights, eight $1,000,000 sales |
| Public at 320/390/430×850 | Full $1,000,000 bid and statistics fit; expected vertical page scrolling | Same browser evidence |
| Operator at 768×1024 and 1024×768 | Full amount and long names remain inside shared block | Same browser evidence |
| Phone sale notification | Full long name and amount fit at all three widths, with 16px side margins | Same browser evidence |
| Public filters/pools | At 320px, Third Flight + “Display Team 08” returns one card; four pool summaries observed | Filters restored afterward |
| Hidden display flags | Bid, bidder, queue and sale prices absent; two summary metrics fit both TV sizes | Observed before final queue-only sizing change |
| Caption contrast | TV 6.0225:1; public 6.2107:1 | Computed foreground/background colors |
| Existing acceptance | 58 passed | [acceptance.json](batch-c-evidence/acceptance.json) |
| Existing refinements | 72 passed | [refinement.json](batch-c-evidence/refinement.json) |
| TypeScript and final production build | Passed | [environment.json](batch-c-evidence/environment.json) |
| Reduced motion | Original animation suppression rule preserved | Source check only; runtime preference unverified |

**130 existing scripted checks passed.** Browser observations are separate manual evidence, not additional automated test cases. Final TV geometry was repeated after the last queue adjustment. The earlier phone/operator rules were unaffected by that TV-only change. The separate 1,000-case allocation oracle and workflow suite were not rerun for this CSS-only batch; Batch B retains their prior evidence.

Measurements checked DOM Range text bounds inside the block, queue, statistic and recent-sale containers, plus section intersections and document dimensions. Screenshots were visually inspected in tool output; no durable screenshot files are claimed. A single-screen page-size measurement alone was not used to dismiss internal clipping. The completed state correctly has no active bid.

## Isolation and interruptions

All synthetic writes used port 5174 and the independent `.sites-runtime/audit-checkout/.wrangler/state`. Root and scratch CSS hashes matched. No mutation or snapshot restoration targeted the user's 5173 review. Temporary viewport overrides were reset, the test tab closed and the scratch server stopped; the original review process remained running.

The first cold navigation timed out, and the initial scratch process later exited unexpectedly. The same tab and a restarted retained process were used for successful checks. Long-running development stability remains unresolved. An initial completed-fixture request correctly failed because a team was still active; the helper now marks that test team Unsold first. Several short-lived toast observations missed the notice and were not counted as passes. A synchronized test sale then captured all phone sizes.

The extra all-long queue check exposed another overlap during implementation. The wider queue and reduced spacing fixed it, and the final TV matrix passed. The Sites build helper's known Windows npm resolution issue recurred; the installed npm entrypoint completed all five phases after the final CSS edit.

## Reproduction and limits

Follow [VALIDATION.md](VALIDATION.md) to start the existing isolated checkout; do not replay migrations. Copy the current CSS into scratch. From the root, `node tests/batch-c-fixture.mjs init` creates a new disposable 12-team/four-flight fixture and writes its ID. The helper supports `long`, `short`, `live`, `paused`, `completed`, `hidden`, `visible`, `maxbid`, `longqueue` and `toast`. Run only against the hard-coded scratch port. The toast action waits ten seconds before recording a synthetic sale so a browser observer can be ready.

Use the explicit event URL on public, TV and admin routes. Check both TV sizes across live/paused/completed, long and short active names, three long queue names and long recent names; check phone and tablet sizes above. Preserve committed evidence by using a new output directory for a future run.

Actual fullscreen/physical TV, projector, HDMI overscan, room viewing distance, real phone input, Safari/Firefox, OS scaling, runtime reduced motion and screen-reader speech remain unverified. These local results do not certify every possible string, currency or setting combination or hosted operation.

## Next scope

Three findings remain open: **CAL-P2-001** (quoted roster delimiters), **CAL-P2-002** (creation retries), and optional **CAL-P3-001** (export contracts). No open P1 or demonstrated P0 remains in this register.

**Recommended next: Batch D, CAL-P2-001 and CAL-P2-002.** D/E require further approval. Sites remains at saved version 2 with no reported live/hosted-preview URL; deployment and hosted acceptance remain separate.
