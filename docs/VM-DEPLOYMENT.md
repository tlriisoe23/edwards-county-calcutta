# VM deployment — 2026-09-14

This is the current deployment record; it supersedes the pre-deployment status in
VM-ASSESSMENT.md and PORTABLE-HOSTING.md. Use the hosted application for ongoing
operations. The preserved Windows review database is a separate snapshot and does
not synchronize with the VM.

## Calcutta

- Public URL: https://calcutta.edcogolf.org
- Operator URL: https://calcutta.edcogolf.org/admin
- VM: tanner-ai-vm, /home/tanner/development/edwards-county-calcutta
- Source revision: faac4c6f949d97cd5b8dbc15228b316a9fd451a3
- Compose project: ecgc-calcutta; image: ecgc-calcutta:portable
- Container: ecgc-calcutta-app-1; restart policy: unless-stopped
- Origin: 127.0.0.1:5181; persistent volume: ecgc-calcutta_data
- Database in container: /data/calcutta.sqlite
- Imported 2 events, 24 teams, 48 players, 10 buyers, 10 sales and all related rows.
  All 14 application tables were compared row-for-row with the source snapshot.

## Leaderboard

- Public URL: https://leaderboard.edcogolf.org
- Operator URL: https://leaderboard.edcogolf.org/admin
- VM: tanner-ai-vm, /home/tanner/development/ecgc-leaderboard
- Source revision: 4354c12502c4d447fd2c2423e0b3389e92130609
- Compose project: ecgc-leaderboard; image: ecgc-leaderboard:portable
- Container: ecgc-leaderboard-app-1; restart policy: unless-stopped
- Origin: 127.0.0.1:5182; persistent volume: ecgc-leaderboard_data
- Database in container: /data/leaderboard.sqlite
- Imported 11 tournaments, 59 snapshots and 1 settings row. All 3 application
  tables were compared row-for-row with the source snapshot.

## Routing and authentication

Both approved public hostnames route through existing Cloudflare tunnel ecgc-preview
(498cae0f-ebd6-4a29-a242-13735154a831). The preview.edcogolf.org route remains
127.0.0.1:8081. Cloudflare dashboard created proxied CNAME records automatically.
No router port forwarding was added. Local service bindings remain loopback-only.
The connected Cloudflare API was read-only (write returned Not authorized); route
updates were performed in the signed-in dashboard after explicit user confirmation.

The shared Google Web Application client uses separate exact callback URLs:
- https://calcutta.edcogolf.org/api/auth/callback
- https://leaderboard.edcogolf.org/api/auth/callback

Credentials reside in each repository's ignored .env.portable (mode 600 on VM).
Owner is tlriisoe@gmail.com. Only this owner is initially configured. Calcutta's
Access tab and Leaderboard's Manage operator access page grant/revoke additional
Google emails independently. Google client configuration and any Google testing
restrictions remain separate from application operator permissions.

Owner Google sign-in completed in the live browser for both apps and loaded the
operator desks. Both owner access-management screens rendered. Both user-entered
recovery password hashes are saved; no plaintext passwords were read or stored by
the agent. The owner confirmed both live browser recovery logins worked.

## Validation and backups

Both fresh Linux production builds passed. Both containers report healthy.
Public HTTPS reads return 200. Anonymous and forged identity requests fail closed.
Session cookies carry HttpOnly, SameSite=Lax and Secure. Google authorization
redirects use the correct domains and PKCE S256. SQLite integrity and foreign-key
checks passed after import. Existing Docker, cloudflared, Fairway Ops and Golf
Management Modern services remain active.

Migration material and consistent backups are retained at:
- VM: /home/tanner/development/ecgc-migration-20260914 (private directory)
- Windows: D:\Codex (Sites)\.sites-runtime\deployment-20260914 (ignored)

Files include each app's source snapshot, initial imported backup and
configured-deployment backup. Configured backups include recovery password hashes
and session state; protect them as private records. Copies exist off the VM on the
Windows PC. Recurring backup scheduling and retention are not configured.

The first Calcutta import encountered SQLite read-only WAL initialization on the
standalone source snapshot. Only the copied snapshots were checkpointed and set to
DELETE journal mode; the original Windows databases were not modified. Import into
a new destination succeeded. The initialized empty first destination is retained
as /data/calcutta-initial-empty.sqlite. Do not use it as a restore source.

## Redeploy — 2026-09-18 (Batch L and the night-of correctness set)

Authorized by the owner ("Yes" to deploying both apps). Deployed `1fd3718` — the Batch L merge and the
four night-of fixes. **No schema migration**; `migrate.mjs` reported "Portable schema is current".

This container holds real settlement records, and this repository has **no backup script** of its
own — unlike the sibling leaderboard's `scripts/backup-scheduled.sh`. The documented path was
followed by hand, and the same way that script does it, because a snapshot that stays on the live
volume protects against a bad write and not against losing the volume:

1. `docker exec … node portable/backup.mjs /data/pre-deploy-<stamp>.sqlite` — consistent, via
   SQLite's own backup API.
2. `docker cp` it **out** to `~/backups/ecgc-calcutta/calcutta-20260918T163324.sqlite` (2,613,248
   bytes, mode 600, directory mode 700), then removed the in-container copy.
3. Verified the host copy opens: `integrity_check` **ok**, 2 events, 129 audit rows, and **no sales,
   ownership or settlement rows at all** — so nothing financial was at risk in this deploy.
4. Rollback tag: the running image tagged `ecgc-calcutta:pre-nightof-20260918`. The new image is
   tagged `ecgc-calcutta:1fd3718`.
5. `compose build app`, `compose up -d --no-deps app`: only `ecgc-calcutta-app-1` recreated,
   **healthy within 15 s**. The leaderboard was untouched.

**That missing backup script is worth fixing**: the leaderboard's takes the snapshot, copies it off
the volume, verifies it opens and applies retention, and runs nightly from cron. This product has
the same needs and more, and nothing equivalent.

Production verification (read-only, 2026-09-18 ~16:36 UTC):

| Check | Result |
|---|---|
| HTTPS | `/` 200, `/tv` 200, `/api/public` 200, `/admin` 307, anonymous `/api/admin` 403 |
| Database | `integrity_check` **ok**, 2 events / 0 teams / 0 sales / 129 audit — unchanged across the deploy |
| Browser | `/` at **1440 and 390** and `/tv` at 1920, **zero JavaScript errors**; the live event is *Edwards County 2 Day 2 Man Calcutta* |
| Blocked | The operator console was **not exercised signed in on production** — it sits behind Google here too, and this repository has no equivalent of the leaderboard's signed-in rehearsal. Batch L and the night-of set are evidenced against a local instance only: 63/63 UI3 rendered checks and 12/12 night-of checks. |

Rollback: `docker tag ecgc-calcutta:pre-nightof-20260918 ecgc-calcutta:portable`, then
`docker compose --env-file .env.portable -f portable/compose.yaml up -d --no-deps app`. Take a fresh
snapshot first, per this document's own operations note, to preserve post-deployment writes.

## Redeploy — 2026-09-18 (the fifty-team two-day fixture)

Authorized by the owner, alongside the leaderboard's matching demo (W-2). Deployed `799cdc7` —
WC-7, decisions D-CAL-12..14. **No schema change**; `migrate.mjs` reported "Portable schema is
current".

The pre-deploy snapshot was taken by hand again, because this repository still has **no backup
script** (OC-1 in the leaderboard's tracker; the sibling's `scripts/backup-scheduled.sh` has no
counterpart here):

1. `docker exec … node portable/backup.mjs /data/pre-deploy-20260918T235332.sqlite`, `docker cp` out
   to `~/backups/ecgc-calcutta/calcutta-20260918T235332.sqlite` (2,621,440 bytes, mode 600), then
   removed the in-container copy.
2. Verified the host copy opens: `integrity_check` **ok**, 2 events, 129 audit rows, and **no teams,
   sales or ownership rows at all** — nothing financial was at risk.
3. Rollback tag: the running image (`sha256:e4bab77a9f34…`, commit `1fd3718`) tagged
   `ecgc-calcutta:pre-demo50-20260918`. The new image is also tagged `ecgc-calcutta:799cdc7`.
4. `compose build app`, `compose up -d --no-deps app`: only `ecgc-calcutta-app-1` recreated,
   **healthy within 7 s**. The leaderboard kept its uptime.

Production verification (read-only, 2026-09-18 ~23:55 UTC):

| Check | Result |
|---|---|
| Container | healthy, image `sha256:08cb8a62eecc…`, started 23:55:02 UTC |
| HTTPS | `/` 200, `/tv` 200, `/api/public` 200, `/admin` 307, anonymous `/api/admin` 403 |
| Database | `integrity_check` ok; 2 events / 0 teams / 0 sales / 129 audit — **unchanged**: the fixture is loaded from Tools by an operator and by nothing else |
| Browser | `/` at 1440 and `/tv` at 1920, **zero JavaScript errors**; the live event is *Edwards County 2 Day 2 Man Calcutta* |
| Pre-merge | 19/19 `tests/two-day-demo.mjs`, plus acceptance 58, refinement 72, UI3 63/63, reorder 20, night-of 12/12; lint unchanged at 77 problems |
| Blocked | The operator console was **not exercised signed in on production** — behind Google, and this repository still has no signed-in rehearsal harness (OC-2). The fixture's own evidence is from a local instance. |

Rollback: `docker tag ecgc-calcutta:pre-demo50-20260918 ecgc-calcutta:portable`, then
`docker compose --env-file .env.portable -f portable/compose.yaml up -d --no-deps app`. Take a fresh
snapshot first.

## Redeploy — 2026-09-19 (importing the flighted field)

Authorized by the owner, alongside the leaderboard's `f029a5d`. Deployed `9ba8c15` — WC-6,
decisions D-CAL-17..19. **No schema change**; `migrate.mjs` reported "Portable schema is current".

The network attachment landed earlier, at 00:2x UTC, because attaching a container to a network
means recreating it. The image at that moment was still the previous one, which ignores
`LEADERBOARD_URL`, so nothing was half-wired at any point.

Snapshot taken by the repository's own script this time rather than by hand (OC-1 closed earlier
today): `scripts/backup-scheduled.sh` → `~/backups/ecgc-calcutta/calcutta-20260919T011528.sqlite`,
verified, 8 retained. Rollback tag: the running image (`sha256:08cb8a62eecc…`, commit `799cdc7`)
tagged `ecgc-calcutta:pre-import-20260919`. `compose up -d --no-deps app`: recreated, **healthy
within 7 s**; the leaderboard kept its uptime.

Production verification (read-only, 2026-09-19 ~01:16 UTC):

| Check | Result |
|---|---|
| Container | healthy, on `ecgc-interconnect` and `ecgc-calcutta_default` |
| Database | `integrity_check` ok; 2 events / 0 teams / 0 sales / 129 audit — **unchanged**: an import is something an operator does, and nothing here does it by itself |
| HTTPS | `/` 200, `/tv` 200, `/admin` 307, anonymous `/api/admin` 403 |
| **The import, in production** | **PASS** — this container read `http://leaderboard:3000/api/board` in **70 ms** and assembled **32 importable rows**, the first being `Johnson / King \| Alex Johnson \| Taylor King \| Championship \| 0`. The request never left the machine. |
| Browser | `/` at 1440 and `/tv` at 1920, **zero JavaScript errors** |
| Blocked | The operator console was **not exercised signed in on production** — behind Google, and this repository still has no signed-in rehearsal harness (OC-2). The import's own evidence is 13/13 against a local pair. |

Rollback: `docker tag ecgc-calcutta:pre-import-20260919 ecgc-calcutta:portable`, then
`compose up -d --no-deps app`. Take a fresh snapshot first.

## Redeploy — 2026-09-19 (the import's missing half)

Authorized by the owner, who reported the defect from their first real use of the previous release.
Deployed `b2f583e` — D-CAL-20..22. **No schema change**.

Snapshot first via `scripts/backup-scheduled.sh` (9 retained); rollback tag
`ecgc-calcutta:pre-flightimport-20260919` on the running image (commit `9ba8c15`). Recreated,
**healthy within 6 s**; the leaderboard kept its uptime.

Production verification (read-only, 2026-09-19 ~04:12 UTC):

| Check | Result |
|---|---|
| HTTPS | `/` 200, `/tv` 200, `/api/public` 200, `/admin` 307, anonymous `/api/admin` 403 |
| Database | `integrity_check` ok; 2 events / **0 flights** / 0 teams / 0 sales / 131 audit — unchanged, and the zero flights are the state that prompted this release |
| **What the import now offers** | the live leaderboard field reads **Championship 7 · A 4 · B 8 · C 8 · D 5**, 32 rows. Before this release those five names were a message; now they are a button. |
| Blocked | The operator console was **not exercised signed in on production** (OC-2). The dialog path is evidenced by 30/30 against a local pair, which is where all three of this release's defects lived. |

Rollback: `docker tag ecgc-calcutta:pre-flightimport-20260919 ecgc-calcutta:portable`, then
`compose up -d --no-deps app`.

## Operations

Run commands from the relevant VM repository, independently for each application:

```sh
docker compose --env-file .env.portable -f portable/compose.yaml ps
docker compose --env-file .env.portable -f portable/compose.yaml logs --tail 80 app
docker compose --env-file .env.portable -f portable/compose.yaml exec app node portable/set-local-password.mjs tlriisoe@gmail.com
```

Use portable/backup.mjs with a new absolute destination for consistent backups.
Never copy a live SQLite file without its WAL or overwrite a running database.
Before rollback, take a new consistent snapshot to preserve post-deployment writes.
Stop only the affected Compose project, restore into a new volume with UID/GID1000,
and validate before routing traffic back. See PORTABLE-HOSTING.md for details.

The VM checkouts retain separate Git histories transferred by bundles; no new Git
hosting remote was invented. Application code and databases remain separate from
WordPress, Fairway Ops and Golf Management Modern.