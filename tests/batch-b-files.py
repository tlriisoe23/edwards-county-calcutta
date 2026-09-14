"""Reopen real Batch B downloads using Python csv and exact Decimal arithmetic."""
import csv
import hashlib
import json
from decimal import Decimal
from pathlib import Path

root = Path('docs/batch-b-evidence')
reports = {}
checks = []
files = {}
for path in sorted(root.glob('*.csv')):
    with path.open(encoding='utf-8', newline='') as stream:
        reader = csv.DictReader(stream)
        rows = list(reader)
        assert rows and all(None not in row and None not in row.values() for row in rows)
        files[path.stem] = rows
        reports[path.name] = dict(rows=len(rows), columns=reader.fieldnames,
                                 sha256=hashlib.sha256(path.read_bytes()).hexdigest())
    checks.append(f'{path.name}: parsed with standard csv reader')

def check(name, condition):
    assert condition, name
    checks.append(name)

def total(rows, key):
    return sum((Decimal(row[key]) for row in rows), Decimal(0))

balances = [Decimal(row['Remaining Balance']) for row in files['settlement']]
check('Positive collections reconcile independently', sum(x for x in balances if x > 0) == Decimal('300.03'))
check('Buyer overpayments remain separate numeric amounts', -sum(x for x in balances if x < 0) == Decimal('50.00'))
check('Signed settlement net remains reconcilable', sum(balances) == Decimal('250.03'))
check('Actual receipt reversal stays numeric', any(row['Direction'] == 'Receipt' and Decimal(row['Amount']) == Decimal('-100.01') for row in files['payments']))
check('Actual payout reversal stays numeric', any(row['Direction'] == 'Payout' and Decimal(row['Amount']) == Decimal('-275.03') for row in files['payments']))
check('Payment direction totals reconcile separately', total([r for r in files['payments'] if r['Direction'] == 'Receipt'], 'Amount') == Decimal('300.03') and total([r for r in files['payments'] if r['Direction'] == 'Payout'], 'Amount') == Decimal('275.03'))
check('Payout export retains negative due', any(Decimal(r['Party Remaining Due']) == Decimal('-137.51') for r in files['payouts']))
check('Entitlement rows conserve awards', total(files['payouts'], 'Entitled Amount') == Decimal('550.06'))
check('In-tab sales retain their distinct schema and exact total', total(files['in-tab-sales'], 'Sale Amount') == Decimal('550.06') and 'Team Ownership Percent' in files['in-tab-sales'][0])
check('In-tab roster keeps import columns and three teams', len(files['in-tab-teams']) == 3 and 'Player 4' in files['in-tab-teams'][0])
check('In-tab audit retains its existing columns', list(files['in-tab-audit'][0]) == ['Time', 'Operator', 'Action', 'Record', 'Undone'])
check('In-tab sales still neutralize formula-like buyer text', any(r['Buyer'] == "'=1+1" for r in files['in-tab-sales']))
result = dict(passed=len(checks), failed=0, method='Python csv.DictReader and decimal.Decimal', checks=checks, files=reports)
(root / 'files.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
print(json.dumps(dict(passed=len(checks), failed=0, files=len(files))))
