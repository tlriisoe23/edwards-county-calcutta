# Edwards County Calcutta

An operator-first application for an in-person golf Calcutta, with public/TV displays, cent-exact payouts and manual settlement records. The operator records amounts during verbal bidding and selects the purchaser at Sold. It records payments already handled outside the app; it does not collect or transfer money.

Start with [docs/PROJECT.md](docs/PROJECT.md) for durable product context and [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) for the current evidence snapshot. The [product audit](docs/PRODUCT-AUDIT.md), [coverage matrix](docs/COVERAGE.md), [validation ladder](docs/VALIDATION.md) and [finding tracker](docs/TASK-TRACKER.md) separate findings from approved implementation. [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the actual runtime and integrity controls.

[REVIEW.md](REVIEW.md) retains the earlier operating guide and refinement history. Help includes an Auction Night checklist. Approved [Batch A](docs/BATCH-A.md) (`4dc2900`) fixes event context and atomic access changes; [Batch B](docs/BATCH-B.md) (`3d00923`) fixes signed CSV values and separates settlement debts from overpayments. [Batch C](docs/BATCH-C.md) (`4da7b9b`) fixes public/TV containment and caption contrast. Six findings are resolved locally; three remain open. No production deployment is authorized.

## Local development

The project uses the standard Sites Vinext/React starter, Cloudflare Workers and D1. Preserve package-lock.json.

- Install: `npm run install:ci`
- Develop: `npm run dev` (normally http://localhost:5173)
- Type-check: `node node_modules/typescript/bin/tsc --noEmit --incremental false`
- Build: `npm run build`
- Generate schema migrations: `npm run db:generate`
- Existing acceptance rehearsal: `node tests/acceptance.mjs`
- Refinement acceptance rehearsal: `node tests/refinement.mjs`

Both rehearsals run against localhost, create disposable events, and write ignored reports under `.sites-runtime`. They do not operate on the existing review event. Clean up only event IDs created by each rehearsal after inspection.

On this Windows host the Sites helper's npm.cmd resolution failed; invoking the installed npm JavaScript entrypoint directly worked:

```powershell
node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build
```

For local preview, the ignored `.env` supplies `ADMIN_EMAILS=seedy@sites.test` to match the starter's simulated sign-in. Do not use this value for hosted ownership. The hosted `ADMIN_EMAILS` secret contains the owner's actual email; `.env.example` intentionally contains no owner values.

## Database changes

`drizzle/0000_tough_anita_blake.sql` is the original schema. `drizzle/0001_normal_magdalene.sql` adds `settlement_payments` and `payout_disbursements`, foreign keys, signed-cent constraints, party constraints, event indexes and unique reversal references. It does not modify existing tables or their stored data.

After building, apply only a migration that has **not already been applied**. For an existing version-1 local database that has not received the settlement migration:

```powershell
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_normal_magdalene.sql
```

Both migrations are already applied to this checkout's review database. Do not replay them. Production migrations are applied by Sites on an approved deployment. Local records remain in `.wrangler/state`, outside source control and the deployment archive.

## Source map

- `app/auction.tsx`: public/TV presentation and polling
- `app/operator.tsx`: console, administration, access and new tabs
- `app/auction-controls.tsx`: Sold buyer selection, structured amounts and payout ladders
- `app/editors.tsx`: team, buyer, import, sale and ownership editors
- `app/rules.tsx`: event rules, optional modes, flight payouts and final results
- `app/settlement.tsx` and `lib/settlement.ts`: manual transactions and derived balances
- `app/exports.tsx`, `app/api/export/route.ts` and `lib/exports.ts`: authorized downloads and print summary
- `app/sharing.tsx` and `lib/sharing.ts`: public URLs, locally generated QR, TV setup and Help
- `app/api/admin/route.ts`: authorization, validation and transactional mutations
- `app/api/public/route.ts`: version-aware public reads
- `lib/store.ts`: D1 access, safe public projections and identities
- `lib/model.ts`: integer-cent allocation, pools, entitlements and CSV safety
- `db/schema.ts` and `drizzle/`: relational schema and generated migrations
- `tests/acceptance.mjs` and `tests/refinement.mjs`: integration and calculation rehearsals

Public links use `?event=EVENT_ID`. Without an ID the board selects the newest event once and pins that ID in the URL. Event selection, history and related operator/public/TV links retain context. Share links derive from the actual browser origin and contain only the public route and event ID. QR generation uses `qrcode`; acceptance independently decodes it with `jsQR`.

## Review and release

The user requested another saved review version and prohibited deployment until explicit approval. The local preview is the review surface. Sites deployment URLs are production; saving a version does not create a hosted staging URL.

Before the first approved public deployment, verify actual ChatGPT owner sign-in, an authenticated non-allowlisted account, operator access/revocation, anonymous public access and spoofed identity-header rejection at the platform boundary. Verify migrations, durable persistence, public audience, exports and live propagation against the hosted Worker. Local rehearsals do not establish production multi-user performance.

Local demo records and test data are excluded from the deployment archive. After deployment the owner can load demo data or create a clean event. Full Event JSON Backup preserves event records and complete audit history, but this pass does not add a backup restore/import workflow.
