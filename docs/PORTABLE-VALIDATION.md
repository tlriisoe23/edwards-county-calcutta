# Portable target validation — 2026-09-14 (America/Chicago)

This is implementation and isolated rehearsal evidence, not a public deployment.
No owner review database was imported, no Google client secret was supplied, and
no DNS, public tunnel, or existing VM service configuration was changed.

## Implemented

- Separate Next.js standalone/Node/SQLite target alongside the existing Sites build.
- Docker/Compose deployment with a digest-pinned Node image, an unprivileged user,
  loopback binding and a persistent data volume.
- Google OpenID Connect integration using PKCE/state/nonce and verified email.
- Independent, database-backed opaque sessions and owner-only local recovery login.
- Explicit schema migrations with checksums normalized across Windows/Linux line endings.
- Exclusive-destination consistent backups and an initial Sites-to-new-SQLite importer.

## Verification

| Check | Result |
|---|---|
| Calcutta standalone production build and TypeScript | Passed |
| Calcutta existing Sites five-phase build | Passed |
| Calcutta HTTP acceptance | 58 checks passed |
| Calcutta settlement/refinement HTTP suite | 72 checks passed |
| Calcutta SQLite adapter | Schema, rollback, revision race, foreign keys, backup/restore and restart passed |
| Leaderboard standalone production build and TypeScript | Passed |
| Leaderboard existing Sites five-phase build | Passed |
| Leaderboard HTTP acceptance and lifecycle | 33 + 3 checks passed |
| Leaderboard domain suite | 25 checks passed |
| Leaderboard operator access | Owner grant/revoke, non-owner rejection, immediate revocation and access audit passed |
| Both authentication suites | Hash verification, throttling, CSRF, replay, expiry, logout and malformed Google callback rejection passed |
| Both migration suites | Repeated migrations and changed SQL line endings passed |
| Both initial Sites import tests | Application rows preserved; session tables omitted; source opened read-only |
| Browser recovery sign-in | Passed for both apps using synthetic credentials |
| Browser owner access UI | Both rendered; Calcutta sign-out returned to the event public board |
| Production dependency audit | Zero known vulnerabilities reported for both dependency graphs after baseline-browser-mapping update |

VM Docker rehearsals use synthetic databases under /tmp, independently of existing
applications. Each app passed anonymous/forged-header rejection, local recovery
sign-in, demo creation, all-table snapshot comparison, integrity checking,
container replacement persistence, restored board equality and restored owner
login. Calcutta compared 18 tables, Leaderboard 9. The containerized initial importer
also reproduced the public board while leaving operator access locked until
credentials are configured separately.

VM rehearsal source directories:
- /tmp/ecgc-calcutta-portable.gF98MpiT
- /tmp/ecgc-leaderboard-portable.anbN0Ygl

Rehearsal containers are stopped and removed by the runner. Images, build caches
and printed synthetic /tmp data directories remain for inspection. No source was
pushed or published to Sites. Local implementation belongs to each independent
repository; the Leaderboard-ui-review worktree was not merged or modified.

## Issues found and corrected during this work

- Portable staging initially omitted vendored CSS and QR type declarations; added
  the required source directories and rebuilt successfully.
- A test initially used a fixed port already occupied by a separate review app;
  switched test servers to allocated IPv4 loopback ports and standalone startup.
  No mutation suite ran against that unrelated review server.
- Next's internal request origin differed from the browser URL; portable mutations
  now check the configured public origin.
- Browser form submission exposed a referrer-policy/Origin mismatch missed by
  synthetic HTTP requests. Changed the auth page policy to same-origin and verified
  actual recovery sign-in in the browser.
- A long-running test reused an expired HTTP socket after a child suite completed;
  the parent test now closes those connections.
- Windows prevented rebuilding a running synthetic standalone directory; stopped
  that test process before rebuilding.
- Build dependency audits still report advisories in the retained Sites development
  toolchain. Production-only audits pass; no blanket breaking dependency upgrade
  was applied.

## Remaining before owner cutover/public use

1. Configure Google OAuth clients for the planned HTTPS callback URLs and verify a
   real Google sign-in. Missing credentials fail closed and were not fabricated.
2. Have the owner set recovery passwords privately through the supplied terminal
   command. Synthetic test passwords are not production credentials.
3. Identify and import the actual owner databases into new volumes, verify complete
   records and financial/ranking parity, and perform a bounded final-write cutover.
4. Configure DNS, HTTPS routing and off-host backup destination/retention; verify
   public/TV access and sustained operational load.

See [PORTABLE-HOSTING.md](PORTABLE-HOSTING.md) for setup commands and limitations.
