# Validation ladder and evidence

2026-09-14 UTC · baseline `dfab14906c04b5a6d99ffffbfba4249883750eae`. Reports are local audit evidence, not production sign-off. PASS = observed expected result; FAIL = demonstrated mismatch; BLOCKED = a needed environment/tool is unavailable; UNVERIFIED = not exercised sufficiently. A successful build does not convert any browser or hosted gap into PASS.

## Exact results

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
3. **Business-rule tests:** `node tests/audit-math.mjs`. Expected baseline: 1,000 cases pass, two deliberate CSV findings fail.
4. **Domain/API acceptance:** in the isolated checkout, with the dev server already serving 5174, run the existing suites using the explicit environment variable shown below.
5. **Expanded API/exports:** from project root, `node tests/audit-api.mjs`, then `node tests/audit-workflows.mjs`. These create new disposable fixtures and write evidence. They are not read-only.
6. **Browser:** replay the named journeys in `browser.json` using current fixture IDs. Start with normal setup/keyboard sale, then corrections/settlement/sharing.
7. **Multi-client:** open two operator tabs plus public and TV for the same explicit fixture ID; hold B's staged sale, bid/sell/correct in A and verify authoritative convergence.
8. **Responsive/visual:** inspect actual loaded content at the matrix viewports. Combine screenshot review with child containment and overlap checks; a page-level scrollWidth/scrollHeight test misses current TV failures.
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

Settlement tests cover multiple purchases, unpaid/partial/paid states, multiple receipts, method/note persistence, prohibited direct overpayment, overpayments caused by later correction, signed reversals, unique reversal rejection, compensation undo, separate entitlements, partial/full disbursement and receipt/payout non-netting. Remaining-collection aggregation fails for mixed positive/negative party balances; do not confuse correct individual accounts with a correct summary.

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
| Display stress | Long name/large price/TV completed and scaled failures remain CAL-P1-004. |

These are mixed-stage local dev samples, not network SLOs, hosted capacity benchmarks or timing of a human volunteer. No assertion of 500-team readiness, many concurrent users or hours-long production stability is made.

Six small synthetic CSV examples are in `audit-evidence/`. The full JSON backup was opened and moved to ignored `.sites-runtime/audit-exports/sample-backup.json`; summary includes its size and SHA-256. It intentionally contains synthetic private/audit records and is not a public-safe export. `restart-expected.json` in that directory predates later browser changes; the actual restart equality reference is `.sites-runtime/audit-restart-current.json`.

## Remaining verification gates

| Status | Gate | Reason / acceptance evidence needed |
|---|---|---|
| BLOCKED | Real hosted ChatGPT owner login | No deployed origin; verify configured owner lands in admin. |
| BLOCKED | Distinct allowed/non-allowed/revoked users | Local tabs share one mock identity; use actual accounts on approved hosted origin. |
| BLOCKED | Hosted header trust, CSRF and authorization | Confirm dispatcher strips spoofed headers, rejects unauthorized writes/private exports and enforces revocation per request. |
| BLOCKED | Anonymous internet board and QR | Sites access mode alone does not prove route audience; test a signed-out external device and exact QR URL. |
| BLOCKED | Hosted migration/persistence/restart | No deployment authorized; verify actual D1 state and application restart after future approved release. |
| BLOCKED | Physical TV/fullscreen/HDMI | Fullscreen button attempted in IAB without a demonstrated fullscreenElement; real TV not available. |
| UNVERIFIED | Screen reader speech and focus announcements | Accessible trees/focus inspected; actual NVDA/VoiceOver session absent. |
| UNVERIFIED | Physical touch and soft-keyboard overlap | Viewport emulation is not device keyboard/touch evidence. |
| UNVERIFIED | Browser 200% zoom and reduced-motion runtime | No verified emulation; reduced-motion styles exist by source inspection. |
| UNVERIFIED | Print summary / QR handout pagination | Print button/CSS/data exist; actual printer/PDF rendering not completed. |
| UNVERIFIED | Other engines, currencies and maximum load | One Chromium environment, mainly USD, 100-team fixture; larger limits/engines need separate bounded checks. |
| UNVERIFIED | Unclaimed places / ties / unsold winner policy | Current engine requires entered unique results; resolve business policy before any rule change. |

No hosted or unavailable capability above is counted as PASS. After approved fixes, rerun focused reproductions first, the protected API/math suites next, and relevant browser/device states before any separate deployment decision.
