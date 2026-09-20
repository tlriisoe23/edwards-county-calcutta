# Batch F — phone header controls and TV intermediate sizes

2026-09-15 UTC. The owner approved Batch F exactly as proposed in [TASK-TRACKER.md](archive/TASK-TRACKER-2026-09-19-pre-readoption.md): **CAL-P2-004 and CAL-P2-005 are implemented and verified locally** on branch `claude/cal-f-phone-header-tv` (one commit on top of `6116f44`; the hash is in the branch and the handoff). No deployment, container, route, migration, dependency or production access change occurred; the live container at `calcutta.edcogolf.org` still runs the previous build. Lifecycle state: **implemented → validated (local)**, not deployed.

Recorded decision for CAL-P2-005 ([DECISIONS.md](DECISIONS.md) D-CAL-1): a one-screen TV layout **is** required below 700 px height. A 1366×768 laptop at 125 % OS scaling (1093×614 CSS px) mirrored to the clubhouse TV must show every statistic without spilling or scrolling.

## What changed

**CAL-P2-004 — header links without an icon vanished at ≤ 700 px.** The phone rule in `app/globals.css` used to set `font-size:0` on every `.mast nav a`, assuming each link carried an SVG; the operator's *Sign out* and the public *Auction board* (`#board`) links had none and collapsed to 0 × 22 px while staying in the tab order. Now only links that actually contain an icon (`.mast nav a:has(svg)`, the same `:has()` the TV grid already relies on) hide their text; every header link and button has a 24 px minimum hit area; header icons are 24 px. *Sign out* in `app/operator.tsx` gained a `LogOut` icon and `title`, and *Auction board* in `app/auction.tsx` gained a `LayoutGrid` icon and `title`, matching the existing icon-link pattern (*TV mode*, *Operator*, *Public board*, *Launch TV Display*). Accessible names are unchanged: the link text remains in the accessibility tree at phone width. Above 700 px the header shows the same text links as before, now with a small leading icon on those two links.

**CAL-P2-005 — TV statistics overlapped and the page scrolled at 951–1099 px wide or under 700 px tall.** Three CSS changes, all inside the TV rules:

1. `.tv .stats strong` is capped by its container (`min(38px,18cqw)`, `white-space:nowrap`) for every TV width above the phone rules, so a money value can no longer spill into the next statistic cell whether or not the one-screen grid is active.
2. The Batch C one-screen grid now engages at `min-width:951px and min-height:500px` instead of `1100px / 700px`. The 951 px threshold matches the existing two-column `.bidline` breakpoint; below 951 px wide the tablet/phone TV rules still apply as before.
3. A compact band `(min-height:500px) and (max-height:699px)` keeps the same grid rows with a 48 px header, tighter page-head/statistic/recent-sales spacing, dvh-scaled headline, queue and bidder type, `min(28px,18cqw)` statistics, and recent-sale cards laid out name-left / price-right (the layout the non-grid TV already used) so three sales fit in one short strip.

Bid, headline and money sizing continue to use the container-query units introduced in Batch C. Public projections, auction actions, monetary values and calculations, settlement, ownership, event context and access rules are unchanged; only `app/globals.css`, the *Sign out* anchor in `app/operator.tsx` and the `#board` anchor in `app/auction.tsx` changed in product source.

## Commands

Local dev server `npm run dev` on 5173 against the existing `.wrangler/state` store and the E2 synthetic fixtures in [audit-e2-evidence/fixtures.json](audit-e2-evidence/fixtures.json) (`AUDIT-E2 Live` six metrics, `AUDIT-E2 Completed` seven metrics, `AUDIT-E2 Large` 100 teams with a $3,000 bid on the block, demo, and the no-team event). Browser evidence: Playwright 1.62.1 headless Chromium 151 with axe-core 4.13, driven by [batch-f-evidence/scripts/batch-f.mjs](batch-f-evidence/scripts/batch-f.mjs) (derived from the E2 `public-tv.mjs`/`followup.mjs` measurements; localhost only). Then `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm run lint`, `npm run build`, `node tests/acceptance.mjs`, `node tests/refinement.mjs`.

The harness checks, per header control: bounding box ≥ 24 × 24 px, an accessible name, and `:focus-visible` with a visible outline when reached by Tab. Per TV configuration: DOM text bounds for bid, headline, players, bidder, statistics, queue and recent-sale text inside their parents and the viewport; statistic value versus its own cell and neighbouring cells (the E2 `followup.mjs` method); section intersections between header, page-head, live grid, statistics and recent sales; vertical containment of children inside the block, queue, statistics and sales strip; and `scrollHeight`/`scrollWidth` within the viewport.

## Results

| Check | Result | Evidence |
|---|---|---|
| Baseline reproduction before the change | FAIL as registered: *Sign out* and *Auction board* 0 × 22 px at 320–700 px and Playwright could not tap *Sign out*; TV live/paused/completed fail at 960×540, 1024×768, 1093×614, 1099×618, 1100×619 (e.g. 1093×614: Net pool spills 33 px into Teams sold, document 1098 px tall for a 614 px viewport; 960×540: 53 px spill, 1112 px document) | [before.json](batch-f-evidence/before.json) — 24 PASS / 31 FAIL, of which two "tv empty" rows were the harness wrongly expecting an empty-state element (the no-team event renders an open block on one screen; the final script measures it like every other state) |
| Header controls at 320/390/430/700 px on `/` and `/admin` | PASS — every control 24 × 24 px (*Help* 29 × 24), named, focus-visible; tab order Auction board → TV mode → Operator and Public board → Launch TV Display → Help → Sign out | [batch-f.json](batch-f-evidence/batch-f.json), [public-header-390.png](batch-f-evidence/public-header-390.png), [operator-header-390.png](batch-f-evidence/operator-header-390.png) |
| Header controls at 701 px | PASS — text links 111/82/80 px wide on `/`, 96/133/29/71 px on `/admin`, all focus-visible | same |
| axe on the header region at 390 px, both routes | PASS, no violations | same |
| Keyboard Enter on *Auction board* at 390 px | PASS — `#board` in view | same |
| Phone-width operator taps *Sign out* | PASS — lands on `/?event=<same id>` showing the public header | same |
| TV live (Large and Live fixtures), paused, completed at 960×540, 1024×768, 1093×614, 1099×618, 1100×619, 1280×720 | PASS all 24 configurations: one screen, no statistic spill or neighbour overlap, no section intersection, no clipped or out-of-container text; six and seven metrics | batch-f.json; [tv-live-960x540.png](batch-f-evidence/tv-live-960x540.png), [tv-live-1093x614.png](batch-f-evidence/tv-live-1093x614.png), [tv-paused-1093x614.png](batch-f-evidence/tv-paused-1093x614.png), [tv-completed-1024x768.png](batch-f-evidence/tv-completed-1024x768.png) |
| Batch C / E2 matrix at 1366×768 and 1920×1080: live (two fixtures), paused, completed, large, demo, no-team event | PASS all 14 configurations; statistic size at 1366 remains 34.5 px / 36 px at 1920 as in Batch C | batch-f.json |
| Public board 320/390/430 × 850 containment (shared header) | PASS | batch-f.json |
| Harness total | **55 PASS, 0 FAIL, 0 WARN** (24 PASS / 31 FAIL before) | batch-f.json |
| TypeScript | PASS | command output |
| `npm run lint` | FAIL — pre-existing: 48 errors / 43 warnings, message-for-message identical at `6116f44` and after this change; none in the edited lines | command output |
| `npm run build` | PASS | command output |
| Existing acceptance | **58 / 58 PASS** (events `3477a9a7…`, `e4245e34…`) | command output |
| Existing refinements | **72 / 72 PASS** (event `6d5bce32…`) | command output |

Rendered screenshots were inspected directly: at 960×540 and 1093×614 the header, headline, block with bid, three-row queue, six statistics and three recent sales all sit inside the viewport; at 1024×768 with seven metrics two statistic labels wrap to two lines inside their cells (values contained and aligned to the cell start — an observation, not a spill). Phone headers show four operator icons (public board, TV, Help, sign out) and three public icons (board, TV, operator).

## Isolation and cleanup

The only write during browser evidence was a PAUSED → LIVE status round trip on the synthetic `AUDIT-E2 Live` event `bf15b3ff…` (revision 38 → 40 in the baseline run, 40 → 42 in the final run; status LIVE afterwards, sales and bid untouched). The acceptance and refinement suites created their own disposable rehearsal events as always. No real bids, sales or settlement records exist in this store; no fixture was deleted. The production container, its volume, `/data/calcutta.sqlite`, `portable/` and `.env.portable` were not touched or read.

The dev server exited on its own after the baseline run (the same "Tunnel closed" exit Batch C recorded) and was restarted before the final run; every result above comes from a complete run against a healthy server. The Playwright harness lives outside the repository (scratch directory symlinked to a sibling checkout's Playwright 1.62.1 and this repo's axe-core); only the script, two JSON reports and six cited screenshots (704 KB total) are committed. The dev server was stopped at the end.

## Reproduction

Start `npm run dev` on 5173 with the local `.wrangler/state` store and the E2 fixture IDs in `audit-e2-evidence/fixtures.json`. From a scratch directory with Playwright and axe-core resolvable, run `OUT=/abs/out node docs/batch-f-evidence/scripts/batch-f.mjs` (add `--shots` for a screenshot of every configuration). The script refuses non-localhost origins, signs in with the starter's mock identity, pauses and resumes only the synthetic Live fixture, and writes `batch-f.json` plus screenshots to `OUT`. Use a new output directory to preserve the committed evidence.

## Limitations

Physical TV/projector output, HDMI overscan, real OS scaling, Safari/Firefox, real phones and screen readers remain unverified; the 1093×614 case emulates 125 % scaling with a CSS viewport, not a scaled display. Below 500 px viewport height or between 701 and 950 px width the TV route still uses the earlier scrolling tablet/phone rules (outside the approved acceptance list). `:has()` is required by the phone header rule as it already was by the TV grid (Chromium 105+, Safari 15.4+, Firefox 121+). Lint failures are pre-existing repository debt and are not resolved by this batch. These local results do not certify hosted operation or the live container, which has not been updated.

## Next scope

Open after Batch F: CAL-P2-006 (Batch G), CAL-P2-007 and CAL-P3-002 (Batch H), CAL-P3-003/004/005/007 (Batch I), policy-gated CAL-P3-006 (Batch J) and optional CAL-P3-001 (Batch E). Applying this batch to the live container needs the separate release authorization described in `AGENTS.md`.
