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