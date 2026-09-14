# Batch D — quoted roster imports and durable creation retries

2026-09-14 UTC. The user approved Batch D with “proceed.” **CAL-P2-001 and CAL-P2-002 are resolved locally in `a76e57f`**, based on `ef894ba`. No migration, dependency, saved Sites version, production access change or deployment occurred.

## Result

Roster format detection now counts separators outside quoted fields in the first nonempty logical record. Quoted pipes, tabs, commas, doubled quotes and embedded newlines remain field content. Existing pipe quick-paste, tab spreadsheets, comma CSV, header removal and whitespace trimming remain supported. A headerless row with inherently ambiguous unquoted delimiter characters should quote the literal characters.

Event and demo creation now persist the supplied request UUID, actor, action, normalized creation input and resulting event ID in the existing audit record. That record commits in the same D1 batch as the event and all initial/demo records. A matching sequential or concurrent retry returns the original event ID. An action, actor or creation-input mismatch conflicts; a distinct UUID intentionally creates another event. Retrying creation after edits does not reset the existing event.

The unique audit key arbitrates simultaneous requests. If a losing batch encounters that key, the whole batch rolls back, and the handler returns the matching committed result. A forced failure later in demo creation also rolls back the event and audit result, allowing the same request to succeed after recovery. No new table or migration is needed.

Only `lib/model.ts`, `lib/store.ts` and `app/api/admin/route.ts` changed in product source. Existing money, ownership, settlement, public projection and UI behavior are preserved.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Focused import/creation checks | 42 passed | [checks.json](batch-d-evidence/checks.json) |
| Existing acceptance | 58 passed | [acceptance.json](batch-d-evidence/acceptance.json) |
| Existing refinements | 72 passed | [refinement.json](batch-d-evidence/refinement.json) |
| Batch A API/access/context assertions | 20 passed, final cleanup passed | [context/api.json](batch-d-evidence/context/api.json) |
| Independent allocation oracle | 1,000 cases passed | [math.json](batch-d-evidence/math.json) |
| Original CSV probes | All 3 passed, including the previously failing delimiter probe | Same math report |
| Browser groups | 4 passed | [browser.json](batch-d-evidence/browser.json) |
| TypeScript, final production build, foreign keys | Passed | [environment.json](batch-d-evidence/environment.json) |

**1,195 scripted checks/cases passed**, excluding manual browser groups and command checks. Reruns are not counted as independent coverage. The math harness now exits zero without weakening its original expectations.

Focused checks include all three supported delimiters with headers and without; Unicode, quotes, tabs and newlines; roster round-trip; 100-team mapping; malformed/unknown-flight atomic rejection; eight concurrent retries each for event and demo creation; conflicting-input races; distinct requests; edits followed by replay; unauthorized/different-actor replay; late demo failure and recovery; defaults and newest-event fallback.

Browser review verified two correctly mapped quoted rows in the editable preview, saved them into the isolated roster, and searched the stored result. New-event creation selected the new event; back/forward/reload retained context. Confirmed demo creation opened the correct public board and TV URL. Quoted newlines were covered in parser tests; the browser sample covered pipe/tab/comma/escaped-quote/Unicode content. Prior delayed-response/draft-isolation and separate mock-role browser journeys were not repeated.

## Isolation and interruptions

Tests wrote only to port 5174 and the independent scratch database. All three product files matched scratch by hash. No mutation or restoration targeted the user's 5173 review. Temporary tabs closed; no viewport override was used; scratch stopped; original review retained. Test triggers and named access fixtures were removed and absence of test access entries was verified.

Two Batch A harness attempts completed all 20 assertions but hit a cleanup GET transport failure. A subsequent attempt exposed a leftover fixture rather than a product failure. These reports remain under `batch-d-evidence/context/`. After explicit removal of the named test entries, an isolated copy with identical assertions and a single bounded retry for failed GET transport calls passed completely. No retry message occurred in that final run. The original harness is unchanged.

Cold browser navigation and one click timed out; the current page/dialog state was inspected before retrying. No uncertain submission was blindly repeated. The known Windows Sites build helper resolution failure recurred; the installed npm entrypoint completed all five build phases. These local tooling results do not resolve sustained development-server stability.

## Reproduction and limits

Start the existing isolated checkout using [VALIDATION.md](VALIDATION.md); do not replay migrations. Copy the three changed source files into scratch. From the root run `node tests/batch-d.mjs`; set `BATCH_D_OUT` to a new evidence directory to preserve committed reports. The helper is hard-coded to port 5174 and directs SQL fault probes to the scratch store.

Run the original acceptance/refinement suites with `CALCUTTA_TEST_URL=http://localhost:5174`. Run root `tests/audit-math.mjs` with scratch cwd, then copy its generated report into the new evidence directory. The Batch A rerun used a scratch copy of `tests/batch-a-api.mjs` with its output folder redirected and a bounded GET transport retry; all assertion logic stayed unchanged.

Idempotency requires reuse of the same request UUID. A new UUID is an intentional new creation, even with identical names. Historical creation requests made before this fix cannot be retroactively matched because their request UUIDs were not stored. Hosted identity/persistence, physical TV, real devices, print pagination and other engines remain separate gates.

## Remaining work

All eight audited P1/P2 findings are resolved locally. **Only optional Batch E, CAL-P3-001 (distributed export contracts), remains open.** It requires its own approval; it is not a release blocker by itself. Hosted deployment and acceptance have not been performed. Sites remains at saved version 2 with no reported live/hosted-preview URL.
