# Batch A — event context and access guarantees

Subsequent update: [Batch B](BATCH-B.md) is complete locally. This report retains Batch A's historical scope; see [TASK-TRACKER.md](TASK-TRACKER.md) for the current next action.

2026-09-14 UTC. Approved by the user's “Proceed with recommended next action,” following the exact-ID Batch A recommendation. Implemented in **`4dc2900`**, based on audit baseline `782eb3b`. **CAL-P1-001 and CAL-P1-002 are resolved and verified locally.** Hosted verification remains pending; no deployment or migration occurred.

## Resulting behavior

Selecting an event updates its URL. Reload, Back/Forward, the brand, public board, TV and operator links retain that event. New-event creation selects the returned ID. An unqualified entry still chooses the newest event, then replaces its URL with that ID so later reloads remain stable. Sign-in and sign-out return links also retain context.

Changing the event immediately invalidates old polling responses, clears the prior snapshot and resets event-specific drafts/filters. Writes wait until the new snapshot has loaded. A browser test held an Alpha response, loaded Beta, then delivered Alpha: Beta remained selected and displayed.

Owner access changes validate the audit event and commit the audit entry and allowlist insert/delete in one D1 batch. The audit UUID is the durable request identifier: identical sequential or concurrent retries return duplicate success; reusing it for different action/email/event is rejected. Replaying an old grant after a later revoke cannot regrant access. Omitted event context uses an existing event; if no event exists, create one before managing access. The Access screen is already inside an event.

The server still checks owner status before access changes, and operator membership on every private request. A local allowed non-owner could read admin but could not grant or revoke. Removing its allowlist row blocked the same session's next admin read, event write and private export. This uses the local mock identity, not real hosted accounts.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Focused access, retry, context and privacy API checks | 20 passed, 0 failed | [api.json](batch-a-evidence/api.json) |
| Local non-owner and revoked-session checks | 7 passed, 0 failed | [roles.json](batch-a-evidence/roles.json) |
| Existing domain/API acceptance | 58 passed, 0 failed | [acceptance.json](batch-a-evidence/acceptance.json) |
| Existing refinement acceptance | 72 passed, 0 failed | [refinement.json](batch-a-evidence/refinement.json) |
| Independent seeded allocation cases | 1,000 passed, 0 failed; 50,669 assertions | [math.json](batch-a-evidence/math.json) |
| CSV probes in the same math harness | 1 passed, 2 known failures | CAL-P1-003 and CAL-P2-001 remain outside Batch A; unchanged expectations. |
| Browser journeys | 10 observation groups passed | [browser.json](batch-a-evidence/browser.json); manual CUA observations, not automated case equivalents. |
| TypeScript and production build | Passed | [environment.json](batch-a-evidence/environment.json) |
| Foreign keys and fault-fixture cleanup | No violations, test triggers or test grants remain | [environment.json](batch-a-evidence/environment.json) |

The focused API harness injected audit, allowlist insert and allowlist delete failures in the isolated D1 database. Failed batches rolled back in both directions. Eight simultaneous identical grants and eight identical revokes each produced one logical change and one audit row. The original suites cover protected auction, payout, settlement, correction/undo and privacy behavior. No financial calculations or schema changed.

The Sites build helper again failed to resolve Windows npm modules. Running the installed npm JavaScript entrypoint completed all production build phases. No dependency update was needed. This is not a claim that the helper itself was repaired.

## Reproduction and isolation

All product mutations targeted **localhost:5174**, backed by `.sites-runtime/audit-checkout/.wrangler/state`. Five changed product files matched the root checkout by SHA-256. The review on port 5173 received no test mutation or snapshot restore and remains running. The scratch server and read-only proxy on 5175 were stopped after testing; test browser tabs were closed. The isolated mock owner configuration and original mock operator row were restored.

Use the isolated startup and regression commands in [VALIDATION.md](VALIDATION.md). With its server serving 5174, run `node tests/batch-a-api.mjs` from the project root. This creates disposable fixtures and automatically removes injected triggers and temporary grants. It requires the built `dist/server/wrangler.json` configuration and existing scratch migrations; do not replay migrations.

For the role probe, run `node tests/batch-a-roles.mjs prepare`, restart **only** the scratch server, then run `node tests/batch-a-roles.mjs verify`. Stop scratch and always run `node tests/batch-a-roles.mjs restore`, including after failure. Preparation temporarily changes only scratch's mock owner configuration and snapshots its previous value under ignored `.sites-runtime`.

For the browser race, run `node tests/batch-a-proxy.mjs`, open its `/admin?event=ALPHA_ID`, and arm a hold using POST `/__batch_a/hold` with `{"eventId":"ALPHA_ID"}`. Wait for `/__batch_a/status` to show a pending response, select Beta in the browser, then POST `/__batch_a/release`. Verify URL, selector and displayed team remain Beta. The proxy forwards only GET requests to scratch and automatically releases held responses after 30 seconds. Stop it after the journey.

To rerun math without overwriting historical audit evidence, run the root `tests/audit-math.mjs` using the scratch checkout as cwd, then copy its report into a new evidence folder. Its two existing CSV failures intentionally produce exit 1.

Original `docs/audit-evidence/` files remain unchanged. Batch A reports supplement their historical failures rather than replacing them with passing claims.

## Remaining work

Seven findings remain open: three P1, three P2 and one P3. **Recommended next: Batch B, CAL-P1-003 and CAL-P1-005**, to correct signed CSV amounts and separate collections from unrelated overpayments. That batch requires its own scope approval. Display/contrast, roster delimiter parsing, creation retries and export-contract cleanup remain later batches.

Sites still reports saved version 2 and no live/hosted-preview URL. This pass made local commits only. Real owner/allowed/non-allowed/revoked accounts, hosted dispatcher trust, anonymous internet access, persistence and hardware acceptance remain the release gates in [VALIDATION.md](VALIDATION.md).
