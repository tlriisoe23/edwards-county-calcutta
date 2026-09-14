# Batch B — settlement summaries and signed CSV amounts

2026-09-14 UTC. The user approved the recommended Batch B with “Proceed.” **CAL-P1-003 and CAL-P1-005 are resolved and verified locally in `3d00923`**, based on `aa822bd`. No migration, dependency change, production access change or deployment occurred.

## What changed

The shared CSV serializer preserves numeric values and decimal amount strings, including negative balances and reversal entries. It continues to prefix formula-like text such as `=1+1`, `-1+2`, `+SUM(...)`, `@SUM(...)`, and leading tab/carriage-return inputs. Numeric amounts keep the existing decimal precision and column formats; no export schemas were merged or renamed. The correction applies to central exports and existing in-tab downloads through their shared serializer.

Settlement totals now sum positive balances for **Remaining to collect** and **Remaining to pay**. Negative balances are reported separately as positive **overpayments to review**. One party's credit cannot reduce another party's outstanding amount. Signed party balances, receipts, payout entries, ownership and purse calculations are unchanged. Net totals remain available under explicitly named derived fields.

| Derived field | Meaning |
|---|---|
| `receivable` / `payable` | Sum of positive party balances only. |
| `receiptOverpayments` / `payoutOverpayments` | Absolute sum of negative party balances. |
| `netReceivable` / `netPayable` | Signed sum, equal to outstanding minus overpayments. |

The analogous payout issue was reproduced **before** extending the correction: a paid party's 2,000-cent overpayment reduced another party's 9,000-cent debt to a displayed 7,000 cents, on both sides of settlement. See [before.json](batch-b-evidence/before.json). A real API journey then reduced an already-paid award and verified separate payout debt/credit totals. No automatic refund, transfer or purchase/winnings netting was added.

The two summary panels and printable event summary show separate outstanding amounts and overpayments. Print tables and financial CSVs retain signed per-party balances; independently summing positive and negative CSV values reproduces the summaries. Account-level Mark paid still uses that account's positive balance and is disabled for overpaid accounts.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Focused serializer and live local API journeys | 33 passed | [checks.json](batch-b-evidence/checks.json) |
| Independent actual-file validation | 21 passed across 9 CSV files | [files.json](batch-b-evidence/files.json), Python `csv.DictReader` and `decimal.Decimal` |
| Existing domain/API acceptance | 58 passed | [acceptance.json](batch-b-evidence/acceptance.json) |
| Existing refinement acceptance | 72 passed | [refinement.json](batch-b-evidence/refinement.json) |
| Correction / queue / undo workflows | 11 passed | [workflows.json](batch-b-evidence/workflows.json) |
| Seeded allocation cases | 1,000 passed; 50,670 successful assertions in whole harness | [math.json](batch-b-evidence/math.json) |
| Additional CSV probes in math harness | 2 passed, 1 known failure | Negative numeric export now passes; quoted pipe delimiter detection remains CAL-P2-001. |
| Browser observation groups | 6 passed | [browser.json](batch-b-evidence/browser.json); manual observations, not automated case equivalents. |
| TypeScript, production build, foreign keys | Passed, no FK violations | [environment.json](batch-b-evidence/environment.json) |

Scripted total: **1,197 passed, 1 known out-of-scope failure**, excluding manual browser groups and command checks. The prior delimiter expectation remains unchanged and intentionally returns nonzero in the math harness. Original audit and Batch A evidence were not overwritten.

The focused fixture covers multiple purchases, partial/full receipts, price and purchaser corrections, receipt and payout reversals, undo with compensating entries, mixed debt/credit parties, credit-only/empty totals, revised payout ladders and signed exports. API/private projection checks passed. The seven central download variants include six actual CSV files plus a parsed JSON backup; three actual in-tab CSV downloads were separately reopened and reconciled.

Browser fixture `b4c943b2-d146-4bd4-b56b-109b87c723a8` showed $300.03 remaining to collect with $50 overpayments, and $412.54 remaining to pay with $137.51 payout overpayments. Mark paid opened for $300.03 and was canceled. Desktop/tablet screenshots were legible; phone summary bounds showed no internal horizontal overflow. The print-summary DOM contains matching totals and signed rows. Physical print pagination, actual phones and hosted operation remain unverified.

## Isolation, interruptions and reproduction

All test writes used `http://localhost:5174` and `.sites-runtime/audit-checkout/.wrangler/state`. Four changed source files matched the review checkout by hash. No test mutation or snapshot restoration targeted port 5173. Temporary download files were moved into ignored `.sites-runtime/batch-b-downloads` after copying evidence; prior user downloads were retained. Temporary viewport changes were reset, the test tab closed and the scratch server stopped. The original review remains running.

The first acceptance attempt was interrupted after 49 checks when scratch exited; a subsequent workflow attempt could not connect. Neither is counted as a pass. After restarting scratch in a retained PTY and confirming readiness, the complete suites passed. The prior long-running development-server stability uncertainty remains unresolved. The Sites build helper's Windows npm-resolution problem also recurred; the installed npm entrypoint completed all five build phases.

Use [VALIDATION.md](VALIDATION.md) to start the existing isolated checkout; do not replay its migrations. From the root, run `node tests/batch-b.mjs`. Reopen the generated and browser-downloaded CSV files with `python tests/batch-b-files.py`. The latter expects the three `in-tab-*.csv` files from the fixture's Teams, Sales and Activity buttons. Existing committed evidence can be revalidated without starting a server.

Run the 58/72 suites from scratch with `CALCUTTA_TEST_URL=http://localhost:5174`. To preserve historical evidence, run the root `tests/audit-math.mjs` and `tests/audit-workflows.mjs` with scratch as cwd, then copy their reports to a new evidence folder. The math harness still exits 1 for CAL-P2-001.

## Next scope

Five findings remain: one P1, three P2 and one P3. **Recommended next: Batch C, CAL-P1-004 and CAL-P2-003**, for public/TV containment and caption contrast. C–E require further approval; this implementation does not authorize those batches or deployment. Sites remains at saved version 2 with no reported live/hosted-preview URL. Hosted identities, persistence, audience and hardware gates remain in [VALIDATION.md](VALIDATION.md).
