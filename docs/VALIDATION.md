# Validation ladder and evidence

2026-09-14 UTC · baseline `dfab14906c04b5a6d99ffffbfba4249883750eae`. Reports are local audit evidence, not production sign-off. PASS = observed expected result; FAIL = demonstrated mismatch; BLOCKED = a needed environment/tool is unavailable; UNVERIFIED = not exercised sufficiently. A successful build does not convert any browser or hosted gap into PASS.

## Tournament eve — 19 September 2026

Nothing deployed, nothing live touched. Branch `claude/cal-console-rehearsal`; the leaderboard's half
is `claude/lb-restore-rehearsal`, whose `docs/VALIDATION.md` ("Tournament eve") holds the full
dress-rehearsal record. Decision D-CAL-23.

| Check | Result |
|---|---|
| Signed-in desk rehearsal (OC-2) | **PASS** — `tests/console-rehearsal.mjs` on the deployed `ecgc-calcutta:portable` (`b2f583e`) against the **desktop's off-host copy** `calcutta-20260919T001421.sqlite` (sha256-identical to the local file): anonymous `/api/admin` 403 and `/admin` 307; five tabs and four prepare steps at 1600 and 390 with no JavaScript error and no failed request; a buyer added through the dialog and the revision moved; public board at 1440 and 390 and the TV at 1920; **37 checks**. Carried: OC-5 (axe on the sales table at 390) and OC-7 (the Teams tab's leaderboard probe, 400 with none configured) |
| Restore from the off-host copy (O-14) | **PASS** — the sibling's `scripts/restore-rehearsal.sh calcutta <desktop copy>`: integrity ok, events 2 / teams 0 / sales 0 / ownership 0, restored into a fresh named volume by the image, up in 1 s serving *Edwards County 2 Day 2 Man Calcutta*, closed to anonymous callers, removed |
| Dress rehearsal, this side | **PASS with two defects** — on a copy of the real *2 Day 2 Man* event over the private wire: *Import from the leaderboard* created the four missing flights in leaderboard order and imported 50 teams with pops as the index; ten lots sold with every price equal to the buttons pressed, one by keyboard; *Skip for now* confirmed and requeued to 50 of 50; *Undo* named its sale and put the team back on the block with the bid standing; totals $3,925 / $392.50 / $3,532.50 agreed across the console, the sales tab, the TV and the public board. The corrected field brought over again with the auction LIVE: eleven sold-or-on-block teams named and left alone, an unsold pop updated — but a **renamed team arrived as a new one** (**OC-8**), and the compact console's **Setup steps button did nothing** (**OC-6**), so the Teams tab was reached through the *Compact view* switch |

**Not covered**: Results, Settlement and Exports were rendered signed in but not driven — no finishing
positions were entered and no payments recorded on the rehearsal copy.

## The import's missing half — 2026-09-19

**Merged and deployed `b2f583e` 2026-09-19T04:12 UTC**, healthy in 6 s, no schema change, live data
unchanged. See [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md).

Reported from the owner's first real use, against the deployed `9ba8c15`: *"No flight here is called
Championship or A Flight or B Flight or C Flight or D Flight. Add them under Event & rules, then
import again."* Both live Calcutta events had **zero flights** while the leaderboard had five with a
full field — Championship 7, A 4, B 8, C 8, D 5. Decisions D-CAL-20..22.

| Suite | Result |
|---|---|
| Types, build | **PASS** |
| Lint | **unchanged** — 77 problems (48 errors, 29 warnings), the same figure as `main` |
| Acceptance / refinement | **PASS** — 58 / 72 |
| Night-of / UI3 / two-day / reorder | **PASS** — 12/12, 63/63, 19/19, 20 |
| **Leaderboard import** | **PASS** — **30/30** (was 13): the API behaviours, an event with no flights at all, and the whole path through the dialog |

**Three defects, all of them in the dialog rather than the API**, which is why the suite now drives
the dialog:

1. Rows were resolved against the flight list as it stood **before** the flights were created, so
   creating them left all fifty rows still saying "pick a flight". `flight_import` returns what it
   made and the dialog resolves against that, rather than racing a refresh.
2. The dialog commits against the revision it was opened at. Creating the flights advanced that
   revision, so the import immediately after was **rejected 409 on the operator's own click**. The
   dialog now adopts the revision its own write returned (D-CAL-22).
3. The pull silently meant "whatever event the leaderboard is showing". Now named and changeable.

End to end from an event with no flights: four flights created in the leaderboard's order, fifty
teams imported **13 · 13 · 12 · 12**, thirty-nine carrying a pop, nothing rejected on the way.

**Not covered**: an event whose flights partly match — some present, some missing. The code path is
the same filter, and the API check covers "already exists is refused", but no test mixes the two.

## Importing the flighted field — 2026-09-18

**Merged `9ba8c15` and deployed 2026-09-19T01:15 UTC**, healthy in 7 s, no schema change, live data
unchanged. On production this container read the field over the private wire in **70 ms** and
assembled 32 importable rows. See [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md).

WC-6, closed; the leaderboard's half is W-9/P-6 there. Branch `claude/cal-leaderboard-import`;
decisions D-CAL-17..19.

| Check | Result |
|---|---|
| Types | **PASS** |
| Lint | **unchanged** — 77 problems (48 errors, 29 warnings) on `app lib`, the same figure measured on `main` in the same tree |
| Build | **PASS** |
| Acceptance / refinement | **PASS** — 58 / 72 |
| Two-day fixture / night-of / UI3 / reorder | **PASS** — 19/19, 12/12, 63/63, 20 |
| **Leaderboard import** | **PASS** — `tests/leaderboard-import.mjs`, **13/13** (new) |

The new suite is written against the second import rather than the first, because that is the real
case — a score corrected after the flights are drawn, brought over again, possibly mid-auction:

| Behaviour | Result |
|---|---|
| Fifty rows arrive with team, both players, flight and pop | **PASS** |
| A first import over an existing roster **updates fifty, creates none** | **PASS** |
| Importing the same field twice leaves fifty teams, not a hundred | **PASS** |
| An import that would move a **sold** team refuses and names it | **PASS** |
| That team's flight and pop are **exactly** as they were | **PASS** |
| The rest of the field still imports | **PASS** |
| An event the leaderboard does not have is reported, never silent | **PASS** |

**A React defect was found and fixed during this work**, not by a test but by the lint baseline: the
drift check first depended on `data.teams` and `flights`, which are rebuilt on every render, so it
would have fetched the leaderboard on **every render**. The second attempt fixed that with a ref
written during render, which is its own rule violation. The shape that is correct is neither: the
effect fetches, and the comparison happens during render — which also means importing updates the
line immediately without going back to the leaderboard.

**Not covered**: the drift line itself is not exercised by a rendered test; the pull, the merge and
the refusal are. And nobody has removed the interconnect from under a running pair — the unreachable
case is tested by asking for an event that does not exist, not by pulling the wire.

## A backup script — 2026-09-18

OC-1, closed. Branch `claude/cal-backup-script`; decisions D-CAL-15/16. The off-host half is
O-4/P-4 in the sibling leaderboard repository.

| Check | Result |
|---|---|
| Runs | **PASS** — `events=2 teams=0 sales=0 ownership=0 audit=129`, 2,621,440 bytes written to `~/backups/ecgc-calcutta/`, mode 600 |
| Verification | **PASS** — `integrity_check` plus referential checks: no sale pointing at a missing team, no ownership row pointing at a missing sale |
| Under cron's environment | **PASS** — clean under `env -i PATH=/usr/bin:/bin`, which is where a nightly job usually dies |
| Leaves no sidecars | **PASS** — verification runs against a scratch copy; `~/backups` holds zero `-wal`/`-shm` files after repeated runs |
| Off-host | **PASS** — replicated to `//tanner-z390/Backups/ecgc-backups/ecgc-calcutta`, checksummed there and read back |
| Scheduled | 02:45 nightly, before the 03:15 replication |

**Not covered**: a restore rehearsal. The snapshots are proven to open, on this host and on the
desktop; nobody has yet rebuilt a running container from one.

## The fifty-team two-day fixture — 2026-09-18, merged and deployed

Branch `claude/cal-demo-50`, off `main` @ `bd79867`. WC-7, the Calcutta half of the owner's
"create another demo with 50 teams to simulate our 2 day 2 man coming up". Decisions D-CAL-12..14.

| Check | Result and provenance |
|---|---|
| Types | **PASS** — `tsc --noEmit --incremental false` |
| Lint | **unchanged** — 77 problems (48 errors, 29 warnings) on `app lib`, the same figure measured on `main` from a stash in the same tree; none introduced |
| Build | **PASS** — `npm run build` |
| Acceptance | **PASS** — `tests/acceptance.mjs`, 58 |
| Refinement | **PASS** — `tests/refinement.mjs`, 72 |
| Queue reorder | **PASS** — `tests/ui3-reorder.mjs`, 20 |
| UI3 rendered | **PASS** — `tests/ui3-browser.mjs`, 63/63 |
| Night-of rendered | **PASS** — `tests/night-of.mjs`, 12/12 |
| **Two-day fixture** | **PASS** — `tests/two-day-demo.mjs`, **19/19** (new): fifty teams with no repeated name, two players each, four flights splitting 13 · 13 · 12 · 12, every pop a non-negative half stroke with each flight's leader level, and the event at **SETUP** with no sales, nothing on the block and buyers already listed |
| Production | **DEPLOYED** 2026-09-18 — merged at `799cdc7`, healthy in 7 s, no schema change. Pre-deploy snapshot copied off the volume by hand and verified (ok, 2 events, 129 audit, 0 sales); rollback image `ecgc-calcutta:pre-demo50-20260918`. `/` 200, `/tv` 200, `/api/public` 200, `/admin` 307, anonymous `/api/admin` 403, zero JavaScript errors, live data unchanged. The operator console was **not** driven signed in on production (OC-2). |

**The first attempt did not commit.** A hundred and seventy-odd single-row inserts made the local D1
runner answer *"Network connection lost"* rather than any validation error; folding them into
multi-row INSERTs chunked under D1's ~100-parameter ceiling fixed it (D-CAL-14). Worth recording
because the failure names nothing about size.

**Not covered**: that the fifty names here still match the leaderboard's. They were copied from it on
2026-09-18 and nothing checks the two against each other — by design, since the repositories share no
code, but it means a reshape there needs a re-emit here.

## Night-of correctness — 2026-09-18, merged and deployed

Branch `claude/cal-night-of`, off `main` @ `b6fb0f0` (the Batch L merge). The four findings the
2026-09-17 audit put first; scope and decisions in [BATCH-NIGHT-OF.md](BATCH-NIGHT-OF.md),
D-CAL-8..11.

| Check | Result and provenance |
|---|---|
| Types | **PASS** — `tsc --noEmit --incremental false` |
| Lint | **unchanged** — 82 problems (48 errors, 34 warnings), compared against `main` from a detached worktree; none introduced here. The raw `npm run lint` figure of ~6,900 comes from the script linting generated `.sites-runtime` output. |
| Build | **PASS** — `npm run build` |
| Acceptance | **PASS** — `tests/acceptance.mjs`, 58 checks |
| Refinement | **PASS** — `tests/refinement.mjs`, 72 checks |
| Queue reorder | **PASS** — `tests/ui3-reorder.mjs`, 20 checks |
| UI3 rendered | **PASS** — `tests/ui3-browser.mjs`, 63/63 |
| **Night-of rendered** | **PASS** — `tests/night-of.mjs`, **12/12**, each written against the audit's own acceptance test: B-then-type records $1,300 and not $12,501,300; Enter records the sale and focus returns to the bid field; restarting a completed auction asks first and changes nothing until confirmed; Undo is disabled with nothing to undo |
| Production | **DEPLOYED** 2026-09-18 — merged at `1fd3718` and rebuilt into `ecgc-calcutta-app-1`, healthy in 15 s, no schema change. Pre-deploy snapshot copied off the volume and verified (`integrity_check` ok, 2 events, 129 audit, 0 sales); rollback image `ecgc-calcutta:pre-nightof-20260918`. The Cloudflare route was not touched. |
| Production — public paths | **PASS** — `/` 200, `/tv` 200, `/api/public` 200, `/admin` 307, anonymous `/api/admin` 403; rendered `/` at 1440 and 390 and `/tv` at 1920 with **zero JavaScript errors** |
| Production — operator console | **BLOCKED** — behind Google sign-in, and this repository has no signed-in rehearsal harness (the sibling leaderboard's `tests/console-rehearsal.mjs` is the model). Every operator-side result above is from a local instance. This is the same standing gap recorded after S1, UI2 and C2, not a new one. |

**Both browser suites need `UI3_PLAYWRIGHT_MODULE`**: playwright is not a dependency of this
repository, so neither runs from a clean checkout. They also write screenshots into
`docs/batch-l-evidence` by default, overwriting Batch L's evidence; `UI3_EVIDENCE` was pointed at a
scratch directory and the originals restored.

## Batch L (UI3) — 2026-09-17, merged `b6fb0f0` and deployed 2026-09-18

Branch `claude/ui3-flat-tabs-operator`, branched from `main` @ `8405a8a`. Local `.wrangler/state`
and disposable demo events only; the production container, its volume and the Cloudflare route were
not touched. Scope and decisions: [BATCH-L.md](BATCH-L.md).

| Check | Result and provenance |
|---|---|
| TypeScript | **PASS**, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, no errors |
| Build | **PASS**, `npm run build`, all stages; route table unchanged |
| Lint against a **measured** `main` baseline | **PASS — no new debt.** 48 errors / 37 warnings on the branch, identical to `main` @ `8405a8a` linted in a `git worktree` with the same ignore patterns. Compared per rule and per file from two `-f json` reports, which caught the two diagnostics this branch briefly added (unused `HelpTip` import, one unescaped apostrophe); both fixed |
| Existing acceptance rehearsal | **PASS**, 58 / 58 |
| Existing refinement rehearsal | **PASS**, 72 / 72 |
| New reorder + undo-description units, `node tests/ui3-reorder.mjs` | **PASS**, 20 / 20 — on-block predecessor, hidden team between visible ones, filtered roster, both boundaries, single-row list, server-mirrored undo selection |
| New rendered operator checks, `node tests/ui3-browser.mjs` | **PASS**, 63 / 63, headless Chromium at 1920×1080 and 1366×768; [checks.json](batch-l-evidence/checks.json) |
| Responsive containment 390 / 820 / 1366 / 1920, operator + public + step-5 dialog | **PASS**, zero horizontal overflow at every width; [responsive.json](batch-l-evidence/responsive.json) |
| TV route 1920×1080 | **PASS**, still one screen, no overflow in either axis (route unchanged by this batch) |
| Console fold vs `main`, measured on two dev servers | **PASS, slightly improved**: Hammer row bottom 707 px (branch) vs 713 px (`main`) at 1366×768 and 1280×720; 756 px vs 762 px at 1024×768. All clear the fold |
| Bug UI3-6 reproduced before fixing | **FAIL observed on `main` behaviour, then PASS after fix.** Demo fixture: *Move Reed / Foster up* moved the lot 07 → 06 → 05 over two clicks with the Next up order unchanged both times |
| Bug UI3-7 reproduced before fixing | **FAIL observed, then PASS after fix.** Instrumented `scrollTo`/`scrollIntoView`/`focus`: scroll jumped 180 → 0 → 360 → 10 on Teams & flights, stack trace naming Radix Popover `onCloseAutoFocus`. After the fix the instrumentation log is empty and drift is 0–4 px over 7 s on every tab |
| Hover help stealing focus from the bid field | **FAIL observed, then PASS after fix**; focus now stays on *Bid amount* while hovering help |
| Sticky masthead vs one-screen console | **Recorded trade-off, measured both ways.** Sticky everywhere pushed the Hammer row to 814 px at 1366×768 (past the fold, breaking D-CAL-5 / CAL-P3-007), so the masthead sticks on every tab except the console |
| Controls moved into Tools / the masthead exercised for behaviour | **PASS** — `U` shortcut dialog, Tools → Load demo creates an event, Tools → Reset demo data still requires the typed confirmation before Confirm enables |
| Production behaviour of anything in this batch | **Merged `b6fb0f0`, deployed 2026-09-18 in `1fd3718`.** Public paths PASS; the signed-in operator console remains **UNVERIFIED** on production — behind Google, no rehearsal harness in this repository |
| Other browser engines, screen readers, physical second display, touch tooltips, axe/contrast rerun for the new tab-strip surfaces | **UNVERIFIED**; headless Chromium only |

Reproduce: start a local dev server with a fresh store, then
`UI3_PLAYWRIGHT_MODULE=<path to an installed playwright> node tests/ui3-browser.mjs`,
`node tests/ui3-reorder.mjs`, and `node docs/batch-l-evidence/responsive.mjs` /
`fold.mjs` for the viewport and fold measurements. All browser scripts refuse a non-localhost origin.
Playwright is intentionally outside this project's dependency tree, matching `tests/s1-browser.mjs`.

## S1 recovery — 2026-09-16, local candidate, no merge/deployment

Recovered `/home/tanner/development/edwards-county-calcutta-s1`, branch `task/s1-themes-advanced`, inherited HEAD/base `f4a7e77baae943461f7bc6161a223f61ec5100d8`. Implementation remains uncommitted. [S1 scope, file list, commands and human gate](S1.md) is the compact handoff. Evidence uses synthetic local records only. Existing evidence is retained; superseded takeover iterations are under ignored `.sites-runtime/s1/takeover-iterations`.

| Check | Result and provenance |
|---|---|
| Inherited theme API/persistence, revision rejection, fallback, public projection, audit/undo | **PASS reused**, 96 checks, `.sites-runtime/s1/themes-test.txt`; affected server paths were not changed in takeover |
| Inherited acceptance/refinement | **PASS reused**, 58/58 and 72/72; no business-rule changes |
| Inherited portable integration/import | **PASS reused**, HTTP acceptance/refinement and new-database import; no runtime/storage/auth changes |
| TypeScript | **PASS new**, `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `.sites-runtime/s1/final-typecheck.txt`; final portable build also checked types |
| Both build targets | **PASS new**, `npm run build` / `npm run build:portable`; final logs `.sites-runtime/s1/nav-final-build.txt` and `nav-final-build-portable.txt` |
| TV geometry/content/scaling | **PASS new**, 216/216 layouts and 56/56 approximately 2× 1080p→4K typography comparisons; [TV evidence](s1-evidence/recovery-final/tv-scaling.json), `node tests/s1-tv.mjs` |
| Theme/Advanced/public/operator/lifecycle browser journey | Broad run **370 PASS / 2 FAIL**, no page errors; [raw checks](s1-evidence/recovery-final/browser-checks.json). The only two failures were outgoing Results-tab color interpolation on navigation to Settlement in High Contrast/Dark Event; corrected afterward with paired instantaneous nav colors and focused revalidation below. All functional, persistence, keyboard, portal, phone/tablet and TV-state checks passed. No full-run pass is fabricated. |
| Full-page accessibility | Broad run **98/100 clean axe scans**, [raw results](s1-evidence/recovery-final/axe-candidate.json). Final targeted navigation verification recorded below. Baseline [three scans](s1-evidence/axe-baseline.json) and [six extended scans](s1-evidence/axe-baseline-extended.json) include existing contrast/target-size findings; settled final scanned surfaces do not retain those findings. |
| Navigation contrast regression after final fix | **PASS new**, 48/48 checks and 24 clean immediate full-page axe scans across all four themes at 1280px and 390px; [focused evidence](s1-evidence/recovery-final/navigation-contrast.json). Results → Settlement → Results colors switch together with no interpolation. This resolves the two failures in the preserved broad run; unrelated passing checks were reused. |
| Owner/operator/outsider boundaries | **PASS new**, 13/13 actual API/UI checks on isolated portable database and synthetic sessions; [owner](s1-evidence/recovery-final/roles-owner.json), [operator](s1-evidence/recovery-final/roles-operator.json), [outsider](s1-evidence/recovery-final/roles-outsider.json). `node tests/s1-portable-roles.mjs`; no hosted identity claim |
| Source lint compared with inherited baseline | **FAIL unchanged debt**: 48 errors / 42 warnings, identical normalized diagnostic messages, no new source diagnostic. `npm run lint -- --ignore-pattern .sites-runtime`; logs `final-lint-source.txt` / `lint-baseline.txt` under `.sites-runtime/s1`. Raw `npm run lint` additionally scanned generated portable artifacts (840 errors / 12467 warnings); excluded generated artifacts only for the comparable source check. |
| Diff whitespace/scope, main preservation | **PASS new**, `git diff --check`; main remains clean at `f4a7e77`; one S1 branch/worktree retained |
| Physical TV, projector/bright-room reflection, screen reader, other browser engines | **UNVERIFIED**; Chromium viewport rendering is not hardware/accessibility certification. Actual dual-display focus/window placement is recorded for C2, not implemented. |

Visual evidence was inspected directly at 1366×768, 1920×1080 and 3840×2160, including High Contrast with long team/player/bidder names and million-dollar values with cents. Final normal statistics are 39.8/56/112px with 17.1/24/48px labels at those sizes. Long values reduce to their available cell width. Public/operator normal typography is unaffected by TV rules. See [S1’s table and screenshots](S1.md#measured-tv-typography) for the full comparable type scale and nine regression sizes.

A portable build during an early recovery browser run triggered dev-server HTML reloads; that interrupted run is not counted as completed. Final builds precede final browser checks. No production/container/route mutation occurred.


## Batch I update — `claude/cal-i-data-entry` (2026-09-15, local only)

Approved CAL-P3-003, CAL-P3-004 and CAL-P3-005 are implemented and validated locally on a branch stacked on Batch H; CAL-P3-007 is deferred under D-CAL-5; none of F/G/H/I is merged and the live container is unchanged. [BATCH-I.md](BATCH-I.md) and [batch-i-evidence/batch-i.json](batch-i-evidence/batch-i.json) record **17 PASS / 2 FAIL** browser rows against the baseline's 10 PASS / 9 FAIL ([before.json](batch-i-evidence/before.json)) — the two remaining FAIL rows are the deferred Hammer-above-the-fold checks at 1280×720 and 1024×768, whose sticky-panel variants were measured with injected CSS and shown to cover the current bid by 65–76 px ([sticky-experiment.json](batch-i-evidence/sticky-experiment.json)). A cleared or sub-$1.00 minimum bid and a cleared Percent/Fixed deduction now block *Save event & rules* with "Enter a minimum starting bid of at least $1.00" / "Enter a house deduction greater than 0, or choose None." (inline and native validity) and leave the stored values unchanged, while $1.00 and deduction type *None* save; the import preview names each blocking row's reasons and the button reads "Import 3 teams · 2 rows need attention" until fixed; Access answers the owner email with "already an owner" and a case-different duplicate with "already has access", writes no row or audit entry for either, and lists owners read-only above operators. [checks.json](batch-i-evidence/checks.json) records **43 / 43** focused server checks: omitted / null / 0 / 99-cent minimum rejected, 100 accepted; percent 0, omitted and fixed 0 rejected, > 100 % still rejected, 0.01 % / one-cent fixed / type None accepted; owner and duplicate grants rejected with no audit rows, `GET` lists the owner allowlist; Batch A replay, 409 and eight-way concurrent add/remove checks and the Batch D quoted-delimiter, 100-team and atomic-rejection fixtures rerun unchanged.

Existing acceptance **58/58** and refinement **72/72** pass on the same store (events `50b87fdf…`, `18384cbd…`, `5ecb1fba…`). TypeScript and `npm run build` pass. `npm run lint` FAILS with 48 errors / 42 warnings — pre-existing debt (48 / 43 at `5663854`; the one fewer warning is the unused `source` destructure on the import line this batch rewrote), none introduced. One existing assertion changed: `tests/batch-b.mjs` now sets `minBid: 100` instead of a one-cent minimum that D-CAL-2 forbids; a scratch copy pointed at 5173 passes. Writes went only to disposable synthetic events and to operator rows revoked again; the baseline run's reproduction (an owner row and `minBid` 0 / 99 on its own event) was reverted by the script; the E2 Live fixture was read only. Playwright again came from a scratch symlink to a sibling checkout (1.62.1, Chromium 151). Native validation bubbles were read through `validationMessage`; other engines, screen readers, real phones, hosted operation and the deployed container remain UNVERIFIED for this change.

## Batch H update — `claude/cal-h-contrast-tabs` (2026-09-15, local only)

Approved CAL-P2-007 and CAL-P3-002 are implemented and validated locally on a branch stacked on Batch G; none of F/G/H is merged and the live container is unchanged. [BATCH-H.md](BATCH-H.md) and [batch-h-evidence/batch-h.json](batch-h-evidence/batch-h.json) record **37 PASS / 0 FAIL** read-only harness rows against the baseline's 12 PASS / 25 FAIL ([before.json](batch-h-evidence/before.json)): computed contrast for the five approved texts moved from 3.27 (lot numbers), 4.01 (sale buyer line), 4.01 (payout %), 3.71 (inactive tabs; 3.60 on Settlement's muted list) and 4.27 (operator eyebrow) to 5.34, 4.88, 5.70, 5.27 (4.89) and 5.27 on public 1280/390, TV 1920×1080 / 1366×768 / 1093×614 (live and completed) and operator console / Settlement / Exports; axe reports **0** serious `color-contrast` nodes (baseline 35, 29, 6, 6, 3, 6, 33, 16, 14, 33 across the ten runs) and **0** `aria-valid-attr-value` violations (baseline 1 on `/` and 1 on Settlement) because the flight and settlement filter tabs now control real `tabpanel`s; arrow-key / Home / End selection, the filtered content and the Tab order are unchanged before and after. The Batch F checks rerun on the branch pass: 390 px header controls on `/` and `/admin` (24 × 24 px, named, focus-visible) and TV 1093×614 live / completed one-screen containment.

Existing acceptance **58/58** and refinement **72/72** pass on the same store (events `02fc469b…`, `9a5f0a0b…`, `181cd1f3…`). TypeScript and `npm run build` pass. `npm run lint` FAILS with 48 errors / 43 warnings that are message-for-message identical at `1f2b453` — pre-existing debt, none introduced. The harness itself wrote nothing; the E2 fixtures were not modified. Playwright again came from a scratch symlink to a sibling checkout (Chromium 151, axe-core 4.13). The app has one light theme, so no alternate TV theme exists to measure. Other operator screens sharing the tokens, other engines, screen readers, real phones, hosted operation and the deployed container remain UNVERIFIED for this change.

## Batch G update — `claude/cal-g-sold-dialog-escape` (2026-09-15, local only)

Approved CAL-P2-006 is implemented and validated locally on a branch stacked on Batch F; neither branch is merged and the live container is unchanged. [BATCH-G.md](BATCH-G.md) and [batch-g-evidence/batch-g.json](batch-g-evidence/batch-g.json) record **15 PASS / 0 FAIL** keyboard-first harness rows against the baseline's 10 PASS / 4 FAIL / 1 BLOCKED ([before.json](batch-g-evidence/before.json)): with the buyer suggestion list open, the first Escape now closes only the list and keeps the Sold dialog and the combobox focus (1024×768, 390×844 and the stale-dialog case), and the second Escape closes the dialog; Escape with the list closed, *Cancel*, one-click *Add buyer here* with the list open, inline buyer creation, *Confirm* by keyboard Enter and by double-click (exactly one sale each), the stale-revision notice with *Confirm* disabled, and `U`/`S`/`+` suppression while the dialog is open all pass; axe scoped to the open dialog and popup reports no violations.

Existing acceptance **58/58** and refinement **72/72** pass on the same store (events `7489a064…`, `5ac9475f…`, `1136a0d6…`). TypeScript and `npm run build` pass. `npm run lint` FAILS with 48 errors / 43 warnings that are message-for-message identical at `8230c80` — pre-existing debt, none introduced. Writes went only to two disposable synthetic `BATCH-G Escape · 2026-09-15` events (`ada04938…`, `31e9fdc4…`); the E2 fixtures were not modified. Playwright again came from a scratch symlink to a sibling checkout (1.62.1, Chromium 151). Other engines, screen readers, real phones, hosted operation and the deployed container remain UNVERIFIED for this change.

## Batch F update — `claude/cal-f-phone-header-tv` (2026-09-15, local only)

Approved CAL-P2-004/005 are implemented and validated locally; the branch is unmerged and the live container is unchanged. [BATCH-F.md](BATCH-F.md) and [batch-f-evidence/batch-f.json](batch-f-evidence/batch-f.json) record **55 PASS / 0 FAIL** harness rows against the baseline's 24 PASS / 31 FAIL ([before.json](batch-f-evidence/before.json)): header controls on `/` and `/admin` at 320/390/430/700 px are all 24 × 24 px (*Help* 29 × 24), accessibly named and `:focus-visible`, with text links intact at 701 px; the phone-width *Sign out* tap and keyboard *Auction board* journeys pass; axe reports no header violations at 390 px. TV live (two fixtures), paused and completed pass containment, statistic-cell, section-intersection, vertical-containment and one-screen checks at 960×540, 1024×768, 1093×614, 1099×618, 1100×619 and 1280×720, and the Batch C/E2 matrix at 1366×768 and 1920×1080 (live, paused, completed, large, demo, no-team event) still passes. Public board 320/390/430 containment is unchanged.

Existing acceptance **58/58** and refinement **72/72** pass on the same store (events `3477a9a7…`, `e4245e34…`, `6d5bce32…`). TypeScript and `npm run build` pass. `npm run lint` FAILS with 48 errors / 43 warnings that are message-for-message identical at `6116f44` — pre-existing debt, none introduced. The only synthetic write was a PAUSED → LIVE round trip on `AUDIT-E2 Live` (revision 38 → 42, status LIVE afterwards). Playwright came from a scratch symlink to a sibling checkout (1.62.1, Chromium 151); it is not a repository dependency. Physical scaled displays, other engines, hosted operation and the deployed container remain UNVERIFIED for this change.

## Incremental audit E2 — 2026-09-15 (`d992d1c`, audit-only)

Environment: Linux VM, Node 24.19, `npm run install:ci`, fresh `.wrangler/state` with `drizzle/0000` and `0001` applied through a scratch wrangler config carrying the plugin's placeholder D1 id (`audit-e2-evidence/scripts/wrangler-audit.json`), `.env` `ADMIN_EMAILS=seedy@sites.test`, `npm run dev` on 5173. Browser: Playwright 1.62.1 headless Chromium 151 installed in a scratch directory (not a repo dependency), axe-core 4.13. The production container on 127.0.0.1:5181 and `portable/` were not used. No application source, schema or dependency changed; only `docs/` gained files.

| Check | Result | Evidence |
|---|---|---|
| Existing acceptance rehearsal at HEAD on the fresh store | 58 / 58 PASS | events `b8adcb21-ddaf-46f4-8934-bc8b3c49f05d`, `db33befa-c690-4876-bc25-26b8cea2efd4` |
| Existing refinement rehearsal at HEAD | 72 / 72 PASS | event `07798bc1-aa0d-4aa5-80ec-b819565aef5b` |
| Public board viewports 320/390/430/768/1024/1280 + 640/960 (200 % zoom equivalents), live/completed/empty/large | PASS containment; FAIL header links ≤ 700 px | [public-tv.json](audit-e2-evidence/public-tv.json), [header-links.json](audit-e2-evidence/header-links.json) → CAL-P2-004 |
| TV 1366×768 and 1920×1080, live/completed/large/empty/demo/paused | PASS containment and one screen | same |
| TV 1024×768, 1093×614, 1099×618, 1100×619, 960×540 | FAIL statistic spill / scrolling | [followup.json](audit-e2-evidence/followup.json) → CAL-P2-005 |
| TV 1280×720, 1440×900, 1536×864, 1280×1024 | PASS | same |
| Contrast (computed) and axe on public, TV, operator console, settlement, exports, help, access | FAIL five text tokens; FAIL invalid `aria-controls` | → CAL-P2-007, CAL-P3-002 |
| Operator keyboard journey B/Enter/+/S/buyer/Confirm/U; lower-bid, empty-bid, no-bid-hammer messages | PASS | [operator.json](audit-e2-evidence/operator.json) |
| Sales corrections: price edit, reopen, undo, void, undo | PASS | same |
| Setup: cleared minimum bid | FAIL saves 0 with “Saved” | [rules-validation.json](audit-e2-evidence/rules-validation.json) → CAL-P3-003 |
| Setup: cleared increment, 250 % deduction, 130 % ladder | PASS (native validation / disabled save) | same, operator.json |
| Import preview with malformed rows | WARN import disabled, rows unmarked | → CAL-P3-004 |
| Access grant/duplicate/owner-email/revoke | WARN feedback | → CAL-P3-005 |
| Emulated-touch tablet sale and undo | PASS | operator.json |
| Sold dialog Escape with suggestions open | FAIL dialog closes | [new-event-journey-3.json](audit-e2-evidence/new-event-journey-3.json) → CAL-P2-006 |
| New event → flight → teams → start → bid → inline buyer → sale → public propagation → complete | PASS | new-event-journey*.json |
| Results: unsold team placed | FAIL contradictory empty states | → CAL-P3-006 |
| Settlement partial / above-balance / Mark paid / reversal with reason at 1280, 768, 390 | PASS | [settlement-exports.json](audit-e2-evidence/settlement-exports.json) |
| Results tablet keyboard entry with duplicate place | PASS | same |
| Seven UI downloads; print-media isolation; Letter PDFs 2 / 3 / 1 pages | PASS (Chromium PDF only) | same, `print-*.pdf` |
| Sharing: QR decode, copy, local warning, phone containment | PASS | same |
| Roles by `ADMIN_EMAILS` swap: non-operator screen + 403s; non-owner operator desk, access change denied, exports allowed | PASS (local identities only) | [roles-A.json](audit-e2-evidence/roles-A.json), [roles-B.json](audit-e2-evidence/roles-B.json) |
| Reduced-motion runtime; newest-event fallback; unknown event ID; demo reset gate; empty-event guards | PASS / INFO | public-tv.json, settlement-exports.json |

Across the evidence JSON files: **132 PASS, 32 FAIL, 5 WARN** rows. The 32 FAIL rows are repeated observations of the eleven registered findings across viewports/routes (plus one FAIL row caused by the audit script's own stale locator, recorded and not counted as a product defect). Screenshots and PDFs: 70 PNG and 3 PDF files in `audit-e2-evidence/`, alongside 12 JSON reports and the `scripts/` folder. These are manual-observation equivalents, not automated test cases; do not add them to suite counts.

Reproduce: start a local dev server with a fresh store as above, `cd` into a scratch directory with `npm i playwright axe-core pngjs jsqr`, copy `audit-e2-evidence/scripts/`, run `node fixtures.mjs` (creates new disposable events and rewrites `fixtures.json`), then `public-tv.mjs`, `operator.mjs`, `settlement-exports.mjs`, `followup.mjs`, `new-event.mjs` / `new-event-3.mjs`, and `role.mjs A|B` around an `ADMIN_EMAILS` swap. Scripts refuse non-localhost origins.

Cleanup state after E2: `.env` restored to the mock owner; `operators` table empty; fixture `minBid` restored to $100; synthetic events retained locally under the IDs above for reproduction; dev server stopped at the end of the audit.

## Batch D update — `a76e57f`

Approved CAL-P2-001/002 are resolved locally. [BATCH-D.md](BATCH-D.md) records 42 focused import/creation checks, 20 Batch A API/context assertions, 58 acceptance and 72 refinement checks, 1,000 allocation cases and all three original CSV probes passing: **1,195 scripted cases/checks**, excluding four manual browser groups and command checks. TypeScript, final production build and foreign keys pass. Exact reports are in [batch-d-evidence](batch-d-evidence/checks.json).

The final Batch A rerun passed with cleanup. Earlier attempts with cleanup transport failures and a leftover-fixture failure remain recorded; none are treated as completed passing runs. The final isolated harness copy retained all assertions and allowed one retry for failed GET transport calls. Browser cold-navigation/click interruptions were resolved by inspecting state before retry. Product source is limited to parsing and creation persistence; no schema, dependency, saved version or deployment change. Test data stayed on 5174, test triggers/access entries were removed, temporary tabs closed and scratch stopped; review 5173 remained running.

Original and earlier batch reports below remain historical; current resolution status supersedes their known failures. Hosted identities, physical hardware, long-running stability and other engines remain unverified.

## Batch C update — `4da7b9b`

Approved CAL-P1-004 and CAL-P2-003 are resolved locally. [BATCH-C.md](BATCH-C.md) and [browser evidence](batch-c-evidence/browser.json) record 10 final TV configurations with all-long queue/recent names, phone widths 320/390/430, two operator tablet sizes, phone sale notifications, hidden flags and a working narrow flight/search filter. Text bounds and section intersections pass; TV remains one screen. Caption contrast is 6.02:1 TV / 6.21:1 public.

Existing [acceptance](batch-c-evidence/acceptance.json) **58/58** and [refinement](batch-c-evidence/refinement.json) **72/72** pass. TypeScript and final production build pass. The separate 1,000-case oracle/workflow suite was not rerun for this CSS-only batch. Manual browser configurations are not scripted case equivalents. [Environment evidence](batch-c-evidence/environment.json) records the early scratch exit, missed transient-toast observations, intermediate long-queue failure and successful final checks. No interrupted or intermediate failure is counted as a pass.

No schema/dependency, saved version or deployment change. Test writes stayed on 5174; viewport reset, test tab closed, scratch stopped, original 5173 review retained. Actual TV/fullscreen/distance, other engines, runtime reduced motion and screen readers remain unverified. Original and earlier batch reports below remain historical.

## Batch B update — `3d00923`

Approved CAL-P1-003/005 are resolved locally. [BATCH-B.md](BATCH-B.md) records scope, commands and cleanup; `batch-b-evidence/` supplements unchanged original and Batch A evidence.

| Check | Pass | Fail | Evidence |
|---|---:|---:|---|
| Focused serializer / settlement / API | 33 | 0 | [checks.json](batch-b-evidence/checks.json) |
| Independent actual CSV files | 21 | 0 | [files.json](batch-b-evidence/files.json), Python CSV/Decimal, nine files |
| Existing acceptance + refinement + workflows | 58 + 72 + 11 | 0 | [acceptance](batch-b-evidence/acceptance.json), [refinement](batch-b-evidence/refinement.json), [workflows](batch-b-evidence/workflows.json) |
| Seeded allocation cases | 1,000 | 0 | [math.json](batch-b-evidence/math.json) |
| CSV probes in math harness | 2 | 1 | Numeric signed export passes; CAL-P2-001 delimiter remains open. |
| Browser observation groups | 6 | 0 | [browser.json](batch-b-evidence/browser.json) |
| TypeScript / build / foreign keys | Passed | 0 | [environment.json](batch-b-evidence/environment.json) |

Scripted total **1,197 passed, 1 known out-of-scope failure**, excluding manual browser and command checks. Do not combine reruns into independent coverage counts. First acceptance attempt interrupted after 49 checks when scratch exited; workflows then could not connect. Neither attempt is a pass. After restart and readiness, complete suites passed. Sustained dev stability remains unverified. Windows build helper resolution failed; installed npm completed the production build.

No schema/dependency or production change. Test writes stayed on 5174; browser size was reset, temporary tab/server closed and original 5173 review preserved. Print-summary content was checked; physical pagination, desktop spreadsheet UI import and hosted gates remain unverified. Python CSV/Decimal import and reconciliation passed.

## Batch A update — `4dc2900`

Approved CAL-P1-001/002 are resolved locally. [BATCH-A.md](BATCH-A.md) records the exact scope, commands, cleanup and limitations. Fresh reports live in `batch-a-evidence/`; the original `audit-evidence/` reports below are unchanged historical evidence.

| Check | Pass | Fail | Evidence |
|---|---:|---:|---|
| Focused API/context/atomicity/retry | 20 | 0 | [api.json](batch-a-evidence/api.json), including forced audit/grant/revoke failures and eight concurrent retries. |
| Local operator/owner/revoked session | 7 | 0 | [roles.json](batch-a-evidence/roles.json); mock identity only. |
| Existing acceptance + refinement | 58 + 72 | 0 | [acceptance.json](batch-a-evidence/acceptance.json), [refinement.json](batch-a-evidence/refinement.json). |
| Seeded allocation cases | 1,000 | 0 | [math.json](batch-a-evidence/math.json); 50,669 assertions. |
| Existing CSV probes | 1 | 2 | Same math report; CAL-P1-003 and CAL-P2-001 intentionally remain open. |
| Browser observation groups | 10 | 0 | [browser.json](batch-a-evidence/browser.json); includes held-old-response test. |
| TypeScript / production build / foreign keys | Passed | 0 | [environment.json](batch-a-evidence/environment.json). Windows build helper failed; installed npm entrypoint completed all build phases. |

Batch A scripted total: **1,158 passed, 2 known out-of-scope failures**, excluding command checks and manual browser groups. Do not add this rerun to original audit totals as independent coverage. The two failure expectations were not weakened. This is local acceptance, not hosted sign-off.

Scratch config was restored, temporary access records/triggers removed, and only the scratch server/proxy stopped. Port 5173 stayed running without test mutations or restoration over user edits. Bounded successful runs do not resolve the original long-running dev stability uncertainty.

## Original audit exact results

| Check | Pass | Fail | Evidence / result |
|---|---:|---:|---|
| TypeScript | 1 command | 0 | `node node_modules/typescript/bin/tsc --noEmit --incremental false`, exit 0. |
| Production build | 1 command | 0 | `node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build`, exit 0. |
| Existing domain/API acceptance | 58 | 0 | [acceptance.json](audit-evidence/acceptance.json), includes one check containing 500 earlier unseeded allocations. |
| Existing refinement acceptance | 72 | 0 | [refinement.json](audit-evidence/refinement.json). |
| Independent seeded payout/ownership cases | 1,000 | 0 | [math.json](audit-evidence/math.json), xorshift32 seed `0xec6c2026`, independent BigInt oracle. |
| CSV serializer/import probes in math harness | 1 | 2 | Quoted Unicode/comma case passes; quoted pipe detection and signed numeric export fail. |
| Expanded API/export audit | 33 | 3 | [api.json](audit-evidence/api.json): access atomicity, repeated event creation and downloaded signed CSV fail. |
| Extra correction/queue journeys | 11 | 0 | [workflows.json](audit-evidence/workflows.json). |
| Independent remaining-collection sum | 0 | 1 | [balance.json](audit-evidence/balance.json). |
| Saved-data restart comparison | 1 command | 0 | `node tests/audit-control.mjs verify`: full raw + derived event deep equality. |
| Local D1 foreign keys | 1 command | 0 | `PRAGMA foreign_key_check;` returns empty violations array. |
| Browser observation groups | 10 | 5 | [browser.json](audit-evidence/browser.json), 15 manually verified groups; three failing groups describe variants of CAL-P1-004. Not automated test-case equivalents. |

Scripted case/check total (excluding command checks and manual observations): **1,175 passed, 6 failed**. The six failed assertions are five distinct functional findings because negative CSV is detected in two suites. Browser findings and technical debt bring the register to nine findings, not six or eleven. The 50,669 successful assertion count in the math report is not 50,669 independent randomized cases.

The math and expanded API harnesses intentionally exit nonzero while findings remain. Do not remove a failing check or alter sample values to obtain green results. Later approved fixes should make those precise expectations pass.

## Execution isolation

The user's live local review process on port 5173 was left running. Source was archived from Git into `.sites-runtime/audit-checkout`; its separate `.wrangler/state` received the two existing migrations. Audit scripts reject or hardcode the separate localhost:5174 origin. The review baseline capture and final comparison use read-only GETs on 5173; no audit mutation targets that origin.

Initial scratch attempts with a shared `node_modules` junction interrupted at 28 and 4 refinement assertions with ECONNRESET. A retry before the server listened returned ECONNREFUSED. These are **interrupted harness runs, not passes or confirmed product defects**. The junction was replaced with an independent `npm ci --no-audit --no-fund` dependency install in scratch; a subsequent full 72-check run completed. Avoid sharing Vite dependency caches between concurrently active dev servers, but that change does not establish the cause of the interruptions.

The independent scratch dev process later exited before an extra final read, which returned ECONNREFUSED. Captured output did not establish its cause; long-running local dev stability is therefore UNVERIFIED, not declared fixed by dependency isolation. The earlier controlled restart/equality and automatic viewer recovery had already passed. The failed extra read is an environment/runtime interruption, not counted as a passed comparison or a demonstrated domain defect. After another restart, full event equality passed again. The original review process on 5173 remained available. At audit completion the temporary browser tabs were closed, viewport override reset and only the scratch server was stopped intentionally; its database was retained.

The user's newest review event changed independently from revision 0 to 5 during this audit. The comparison is recorded as CHANGED, not PASS. No snapshot was restored over the user's edits. All destructive/reset/undo rehearsal data is confined to the isolated store, which is retained locally for reproduction. The 4.7MB synthetic full backup and restart snapshots stay ignored under `.sites-runtime`.

## Reproduction commands and validation order

Run from `D:/Codex (Sites)` unless a command explicitly selects scratch. Verify port 5174 belongs to the isolated checkout before mutation tests. Never repoint these commands at production or the user's review to save setup work.

1. **Static:** typecheck above; validate syntax of any changed audit `.mjs` file with `node --check FILE`. A separate ESLint run was not part of this evidence, so lint is UNVERIFIED.
2. **Build:** run the existing Sites build script through npm. On this Windows host the direct npm JS entrypoint avoids the helper's npm.cmd resolution issue. No package updates are needed for this audit.
3. **Business-rule tests:** `node tests/audit-math.mjs`. After Batch D: 1,000 cases and all three original CSV probes pass, with no weakened expectations. Run with scratch cwd when preserving historical evidence.
4. **Domain/API acceptance:** in the isolated checkout, with the dev server already serving 5174, run the existing suites using the explicit environment variable shown below.
5. **Expanded API/exports:** from project root, `node tests/audit-api.mjs`, then `node tests/audit-workflows.mjs`. These create new disposable fixtures and write evidence. They are not read-only.
6. **Browser:** replay the named journeys in `browser.json` using current fixture IDs. Start with normal setup/keyboard sale, then corrections/settlement/sharing.
7. **Multi-client:** open two operator tabs plus public and TV for the same explicit fixture ID; hold B's staged sale, bid/sell/correct in A and verify authoritative convergence.
8. **Responsive/visual:** inspect actual loaded content at the matrix viewports. Combine screenshot review with child containment and overlap checks; a page-level scrollWidth/scrollHeight test alone missed the original TV failures, now corrected in Batch C.
9. **Resilience:** `node tests/audit-control.mjs snapshot`; stop **only** the scratch server; inspect viewer state and failed operator save; restart scratch; `node tests/audit-control.mjs verify`; verify Connected automatically.
10. **Scale and artifacts:** inspect 100-team fixture filtering, settlement and actual files; record timings as local observations. `node tests/audit-summarize.mjs` aggregates evidence, hashes artifact bytes and performs a read-only review comparison.
11. **Hosted gates:** only after a separately approved deployment, run the checklist below. They cannot pass from local simulation.

```powershell
# Isolated checkout only; keep the review server on 5173 running.
Set-Location -LiteralPath 'D:/Codex (Sites)/.sites-runtime/audit-checkout'
node node_modules/vinext/dist/cli.js dev --port 5174
```

In a second process whose cwd is that same isolated checkout:

```powershell
$env:CALCUTTA_TEST_URL = 'http://localhost:5174'
node tests/acceptance.mjs
node tests/refinement.mjs
```

Root command used for the isolated database check (requires the current build configuration):

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to '.sites-runtime/audit-checkout/.wrangler/state' --command 'PRAGMA foreign_key_check;'
```

`PRAGMA integrity_check;` through local D1 returned SQLITE_AUTH / not authorized. It is recorded **BLOCKED by D1 SQL authorization**, not an integrity pass and not proof of database corruption. Supported foreign-key checking succeeded separately.

For a brand-new scratch database, follow the existing README/Sites execution-profile workflow and apply the two tracked migrations to that fresh store only. Do not rerun creation migrations against either already initialized database. Existing audit checkout is retained, so no bootstrap replay is required to inspect this pass.

## Money, buyback and settlement scope

The seeded harness compares production results with an independent BigInt largest-remainder implementation. Cases cover separate, combined and custom pools; four flights/40 sale allocations; none/percent/fixed house deductions; 2–10 place ladders; zero, one-cent, odd-cent and large values; random basis-point ownership splits and exact entitlements. Seed and first-failure records make the method reproducible. This tests arithmetic within accepted values, not legal/accounting advice or every product policy.

API suites cover invalid payout totals without partial writes, sold-team flight moves, duplicate incompatible results, sale corrections, 50/50 and partial ownership, declined/deadline behavior, and turning buyback tools Off without deleting agreements. Calculation-only $1,250 at 50% equals $625 information; an odd 33.33% consideration also remains outside the pool/club receivable.

Settlement tests cover multiple purchases, partial/full receipts, retained notes, prohibited direct overpayment, later corrections, signed reversals, unique reversal rejection, compensation undo and separate receipt/payable obligations. The original mixed-balance aggregate failure is fixed by Batch B; receipt and payout fixtures now independently verify positive debts, separate overpayments and signed net totals without moving entries.

## Large event and exports

Fixture: 100 teams, four flights, three buyers, 18 completed sales, later live/paused stress block. All records fictional. User review event was never replaced.

| Observation | Result |
|---|---|
| Initial 100-team import | 48ms local HTTP observation. |
| Public full snapshot | 30,692 bytes, 21ms sample. |
| Bid-only delta | 1,435 bytes; omits full team board. |
| Unchanged polling | HTTP 204. |
| Admin reads | 75 samples across fixture setup: p50 25ms, p95 31ms, max 41ms; largest response 112,118 bytes. |
| Successful bids | 22 samples: p50 23ms, p95 29ms, max 30ms. |
| Sales | 18 samples: p50 25ms, p95/max 32ms. |
| CSV downloads | Six files, 18–20ms locally; all reopened and structurally parsed. |
| Full JSON download | 4,692,424 bytes, 242ms; parsed complete relational state and audit. |
| Browser filtering | Four-flight navigation returned 25 cards; combined search returned one. No measured animation/frame-rate claim. |
| Display stress | BC resolves CAL-P1-004 locally at both TV sizes and three phone widths, including long queue/recent names and completed metrics. Physical TV/OS scaling remains unverified. |

These are mixed-stage local dev samples, not network SLOs, hosted capacity benchmarks or timing of a human volunteer. No assertion of 500-team readiness, many concurrent users or hours-long production stability is made.

Six small synthetic CSV examples are in `audit-evidence/`. The full JSON backup was opened and moved to ignored `.sites-runtime/audit-exports/sample-backup.json`; summary includes its size and SHA-256. It intentionally contains synthetic private/audit records and is not a public-safe export. `restart-expected.json` in that directory predates later browser changes; the actual restart equality reference is `.sites-runtime/audit-restart-current.json`.

## Remaining verification gates

| Status | Gate | Reason / acceptance evidence needed |
|---|---|---|
| BLOCKED | Real hosted ChatGPT owner login | No deployed origin; verify configured owner lands in admin. |
| BLOCKED (hosted) / PASS (local emulation) | Distinct allowed/non-allowed/revoked users | E2 emulated a signed-in non-operator and a granted non-owner operator by changing `ADMIN_EMAILS` locally (roles-A/B evidence); real Google accounts on the hosted origin remain untested. |
| BLOCKED | Hosted header trust, CSRF and authorization | Confirm dispatcher strips spoofed headers, rejects unauthorized writes/private exports and enforces revocation per request. |
| BLOCKED | Anonymous internet board and QR | Sites access mode alone does not prove route audience; test a signed-out external device and exact QR URL. |
| BLOCKED | Hosted migration/persistence/restart | No deployment authorized; verify actual D1 state and application restart after future approved release. |
| BLOCKED | Physical TV/fullscreen/HDMI | Fullscreen button attempted in IAB without a demonstrated fullscreenElement; real TV not available. |
| UNVERIFIED | Screen reader speech and focus announcements | Accessible trees/focus inspected; actual NVDA/VoiceOver session absent. |
| UNVERIFIED | Physical touch and soft-keyboard overlap | Viewport emulation is not device keyboard/touch evidence. |
| PASS (emulated) / FAIL (TV) | Browser 200% zoom and reduced-motion runtime | E2: 640×360 and 960×540 CSS viewports stand in for 200 % zoom — public and operator pass, `/tv` at 960×540 fails (CAL-P2-005); runtime reduced-motion disables the sold-toast animation. Real browser zoom not exercised. |
| PASS (Chromium PDF) / UNVERIFIED (printer) | Print summary / QR handout pagination | E2 Letter PDFs: summary 2 pages (8 sales), 3 pages (30 sales), handout 1 page; print-media hides everything but the summary/handout. Toasts print (observation). Physical printer not used. |
| UNVERIFIED | Other engines, currencies and maximum load | One Chromium environment, mainly USD, 100-team fixture; larger limits/engines need separate bounded checks. |
| UNVERIFIED (policy) / FAIL (feedback) | Unclaimed places / ties / unsold winner policy | Current engine requires entered unique results; E2 observed that an UNSOLD team can be placed and the purse silently goes unclaimed (CAL-P3-006). Resolve business policy before any rule change. |

No hosted or unavailable capability above is counted as PASS. After approved fixes, rerun focused reproductions first, the protected API/math suites next, and relevant browser/device states before any separate deployment decision.
