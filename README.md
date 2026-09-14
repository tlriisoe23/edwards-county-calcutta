# Edwards County Calcutta

A Sites application for operating an in-person golf Calcutta and displaying bids, sales, flight pools and projected payouts. Recordkeeping and calculation only: no payment collection, transfer or settlement execution.

See [REVIEW.md](REVIEW.md) for architecture, operating instructions, acceptance evidence and the publication boundary.

## Local development

The project uses the standard Sites Vinext/React starter, Cloudflare Workers and D1. Preserve package-lock.json.

- Install: npm run install:ci
- Develop: npm run dev (normally http://localhost:5173)
- Type-check: node node_modules/typescript/bin/tsc --noEmit
- Build: npm run build
- Generate schema migrations: npm run db:generate
- Acceptance rehearsal: node tests/acceptance.mjs (localhost only; creates separate disposable events)

On this Windows host the Sites helper's npm.cmd resolution failed; invoking the installed npm JavaScript entrypoint directly worked:
node "C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js" run build

For the local preview, .env supplies ADMIN_EMAILS=seedy@sites.test to match the starter's simulated sign-in. Do not use this value for hosted ownership. The hosted ADMIN_EMAILS secret is managed in Sites and contains the owner's actual email. .env.example intentionally contains no owner values.

After building, apply a NEW migration locally:
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tough_anita_blake.sql

Do not replay applied migrations. Production migrations are applied by Sites on an approved deployment. Local records remain in .wrangler/state, outside source control and the deployment archive.

## Source map

- app/auction.tsx: public/TV presentation and polling
- app/operator.tsx: console, team/buyer/sale administration and access
- app/editors.tsx: team, buyer, import, sale and buyback editors
- app/rules.tsx: event/house rules, flight payouts and final results
- app/api/admin/route.ts: authorization, validation and transactional mutations
- app/api/public/route.ts: version-aware public reads
- lib/store.ts: D1 access, safe public projections and identities
- lib/model.ts: cent allocation, pools, entitlements and CSV
- db/schema.ts and drizzle/: relational schema and generated migration
- tests/acceptance.mjs: local integration and calculation rehearsal

Public event links use ?event=EVENT_ID. Without a specified ID, the board selects the newest event.

## Review and release

The user requested a saved review version before publication. Do not deploy without their approval. There is no dedicated hosted staging URL in the available Sites workflow: deployment URLs are production. The local preview is the review surface.

Before the first approved public deployment, verify real ChatGPT owner sign-in, an authenticated non-allowlisted account, anonymous access to the public board, and rejection of spoofed identity headers at the platform boundary. Verify migrations, durable persistence, public audience and exports against the hosted Worker. Synthetic local records are not included in the archive; the owner can load demo data or create a clean event after deployment.
