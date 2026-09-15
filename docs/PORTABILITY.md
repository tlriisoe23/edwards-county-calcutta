# Portable deployment requirement

Implementation update: the separate portable target and synthetic validation are
described in [PORTABLE-HOSTING.md](PORTABLE-HOSTING.md) and
[PORTABLE-VALIDATION.md](PORTABLE-VALIDATION.md). Requirements below remain the
acceptance contract; live credentials and owner-data cutover are still pending.

Accepted direction, 2026-09-14: the owner wants the sites to run on
`tanner-ai-vm` and remain movable to another hosting provider.

This is a requirement, not a completed migration. This assessment covers
Calcutta; assess other sites separately before adapting them.

## Required outcome

- Each application has its own repository, service, database, backups and release
  lifecycle, separate from WordPress and Fairway Ops.
- A clean checkout builds reproducibly using the lockfile and a pinned supported
  runtime. A production container runs on the VM or another compatible host.
- Persistent data lives outside the image and checkout and survives replacement
  of the application container. An embedded database target initially assumes a
  single application instance and a persistent local volume.
- Domain, database location, authentication configuration and owner emails are
  environment configuration. Commit only placeholder examples, never secrets.
- Standalone sign-in verifies identity and retains server-side authorization:
  initial owner `tlriisoe@gmail.com` and owner-managed additional operator emails.
  The provider remains to be selected; Sites sign-in cannot be assumed portable.
- Document schema upgrades, consistent backups, restore and rollback. Backups
  include complete private records and audit history, not just public data or CSVs.
- Domain and authentication callback changes require configuration, not product
  code changes. Document TLS, proxy trust, health checks and automatic restart.

## Current dependencies and pending work

`vite.config.ts` builds a Cloudflare Worker. `lib/store.ts` uses the Workers DB
binding and D1 batches. A standalone storage adapter must preserve atomic
rollback, snapshot consistency, foreign keys, revision guards and request UUID
replay behavior, including concurrent requests.

`app/chatgpt-auth.ts` trusts Sites dispatcher identity headers and uses its
sign-in routes. Standalone authentication must verify identity rather than trust
incoming headers. Preserve origin checks and owner/operator access controls.

The current `npm start` runs local Wrangler emulation. The tooling profile called
"portable" does not mean production-host portability. Containerizing this local
development setup alone does not satisfy the requirement.

## Implementation and acceptance sequence

1. Assess the VM read-only, verify standalone framework compatibility and select
   runtime, database adapter and authentication integration.
2. Implement the standalone target with synthetic data, preserving the working
   Sites target during adaptation. Verify transactions, concurrency, retries,
   exports, settlement totals, public privacy and operator access.
3. Build from a clean checkout, start with documented configuration, then restart
   and replace the container to prove persistent data survives.
4. Restore a consistent backup into a second isolated deployment. Verify all
   table counts, IDs, foreign keys, full audit history and exact settlement totals.
   Repeat authenticated and anonymous access checks there.
5. Prepare cutover with a final backup, bounded write freeze, restore validation,
   domain/callback updates and rollback. Avoid writes on both databases. Rollback
   after new writes requires preserving those writes, not restoring stale data.

Verify the actual review database under `.wrangler/state` before exporting it.
Exclude the synthetic `.sites-runtime/audit-checkout/.wrangler/state` database.
Do not blindly replay initial migrations against an existing database.

Completion requires a successful second-host restore rehearsal. Recording this
requirement does not deploy the application or change public access.
