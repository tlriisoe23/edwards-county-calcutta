# Project startup brief

**Reconstructed at framework adoption, 2026-09-19.** This project predates adoption, so no original
startup prompt exists. Each section is marked **(sourced)** with the file it comes from or
**(inferred)** as a reading taken at adoption. The framework checks this file's structure, not its
content; correct any inferred line.

## Raw startup prompt

None. The repository existed and was live in production before it adopted the AI Project Framework;
this file is the adoption-time substitute.

## Project identity

**(sourced — docs/PROJECT.md)** Edwards County Calcutta: an operator-run recordkeeping application
for a verbal, in-person golf Calcutta auction, with a public board and clubhouse TV.

## Problem and desired outcome

**(sourced — docs/PROJECT.md)** A club volunteer records bids and final purchasers during verbal
bidding, spectators follow an anonymous board, and after the auction the same records drive results,
settlement, receipts and payouts. The outcome is money recorded exactly, once, with an audit trail
and undo, by a non-technical operator under time pressure.

## Users and operating context

**(sourced — docs/PROJECT.md)** Owner, operator, spectator and treasurer, each with a named
workflow; the operator desk, a phone-sized public board and a TV all matter.

## First-release outcomes

**(sourced — docs/VM-DEPLOYMENT.md)** Already achieved: first deployed to production on 2026-09-14
and redeployed since; the current release is recorded under `state/releases/`.

## Existing systems and assets

**(sourced — AGENTS.md, README.md)** The Sites Vinext/React source, D1 schema and migrations under
`db/` and `drizzle/`, the portable Node/SQLite build under `portable/`, the nightly backup script and
off-host mirror, and the one-way import of the flighted field from the leaderboard.

## Stack, platform, and hosting

**(sourced — AGENTS.md)** Vinext/React on Cloudflare Workers and D1 for development; a portable
Node/SQLite container in production on `tanner-ai-vm` behind a Cloudflare route.

## Integrations, data, and security

**(sourced — AGENTS.md, docs/PROJECT.md)** Google sign-in and local operator logins; credentials only
in the ignored `.env.portable`; real settlement records that are never mutated to test code; money
as integer cents, server-side authority, request IDs and transactional writes.

## Examples and references

**(sourced)** `docs/BATCH-A.md` through `docs/BATCH-L.md` and `docs/S1.md` show how work here is
scoped, validated and recorded; `docs/DECISIONS.md` holds the numbered decisions.

## Constraints, preservation, and non-goals

**(sourced — docs/PROJECT.md "Protected constraints and non-goals")** The KEEP / PROTECT list in the
product audit; participant accounts, remote bidding, payment processing and full tournament scoring
are not goals; isolation from the sibling applications.

## Acceptance and verification

**(sourced — AGENTS.md)** `node node_modules/typescript/bin/tsc --noEmit --incremental false`,
`npm run lint`, `npm run build`, `node tests/acceptance.mjs`, `node tests/refinement.mjs`,
`npm run test:portable`; the signed-in console rehearsal (`npm run test:console`) on a copy before a
deploy. Results recorded in `docs/VALIDATION.md` with its PASS/FAIL/BLOCKED/UNVERIFIED convention
and, under the framework, as local evidence from `validate`.

## Authority and release boundaries

**(sourced — AGENTS.md)** Deploying, restarting the container, or running migrations or backups
against it needs explicit permission; a release is recorded as a `state/releases/` record with its
rollback tag. Merging never implies deployment.

## Unknowns and decisions

**(sourced — docs/BACKLOG.md)** The unapproved 2026-09-17 UI audit, the C2 dual-display acceptance,
Batch J's policy, and the owner-scoped items of 2026-09-18 are recorded in the backlog with their
gates named.

## First implementation task

**(this adoption)** T-0001 adopts framework governance; T-0002 and T-0003 are the two engineering
gaps (OC-3, OC-4) that need no decision. Later work is selected from the backlog by the owner.
