# Portable hosting implementation

The portable target uses Next.js standalone output and Node 24's SQLite driver.
The existing Vinext/Sites target remains available. `scripts/stage-portable.mjs`
copies an explicit source allowlist into ignored `.sites-runtime/portable-build`,
substitutes the storage/authentication boundary and builds there. Edit source,
not the generated directory. Stop synthetic preview processes before rebuilding.

## Configuration and first startup

Planned public origin: `https://calcutta.edcogolf.org`.
Google callback: `https://calcutta.edcogolf.org/api/auth/callback`.
The owner selected edcogolf.org subdomains; this application name is the working
default. DNS and public routing have not been changed.

Copy `portable/config.example` to ignored `.env.portable` in the repository root.
Set PUBLIC_ORIGIN to the exact browser origin. HTTPS is required except on
loopback. ADMIN_EMAILS determines owners; additional operators remain managed in
the application's Access screen. Preserve the initial owner tlriisoe@gmail.com.

Google configuration requires a Web application OAuth client. Register the exact
PUBLIC_ORIGIN plus `/api/auth/callback` as its redirect URI, and put its ID/secret
in `.env.portable`. Do not paste the secret into chat. Request only openid, email
and profile. Google sign-in remains unavailable until these values are configured;
this does not disable configured local recovery sign-in.

From the repository root, on a host with Docker Compose:

```sh
docker compose --env-file .env.portable -f portable/compose.yaml build
docker compose --env-file .env.portable -f portable/compose.yaml run --rm app node portable/migrate.mjs
docker compose --env-file .env.portable -f portable/compose.yaml run --rm app node portable/set-local-password.mjs tlriisoe@gmail.com
docker compose --env-file .env.portable -f portable/compose.yaml up -d
```

The password command needs an interactive terminal. It hides both entries,
requires 14 or more characters and stores a salted scrypt hash. Resetting it
revokes existing sessions for that owner. Recovery is owner-only; other operators
use Google. Five failed attempts block local login for 15 minutes in a persistent
global bucket. This limits guessing but means an attacker can temporarily block
recovery login; Google remains independent. No default production password exists.

The server binds to VM loopback port 5181 through Compose. Use an SSH forward for
private review, or configure an HTTPS proxy later. PUBLIC_ORIGIN must match the
browser URL, including any forwarded port. No public tunnel or proxy is installed
by these commands. The image uses an unprivileged user and a separate data volume.

## Data, backup and moving hosts

`DATABASE_PATH` is absolute and must already be initialized. Migrations run
explicitly, in one transaction, with stored checksums and foreign-key checking.
Do not apply the initializer directly to an existing Sites database: it deliberately
does not guess which old migrations have already run. Instead, identify the actual
Sites SQLite source and use the dedicated importer with a NEW destination:

```sh
DATABASE_PATH=/absolute/new.sqlite node portable/import-sites.mjs /absolute/verified-source.sqlite
```

The importer reads a consistent source transaction, initializes the target from
migrations, checks columns, copies application rows with deferred foreign keys,
and verifies counts/integrity before commit. It refuses existing destinations and
does not copy Sites internals or portable authentication/session tables. This is
for the initial Sites migration; later portable-to-portable moves use full backups
to retain operator access and recovery credentials. Actual owner data has not yet
been imported. Inspect any failed destination before choosing a new path.

Create a consistent snapshot with SQLite's backup API:

```sh
docker compose --env-file .env.portable -f portable/compose.yaml exec app node portable/backup.mjs /data/backup.sqlite
```

Choose a new filename each time; existing backup files are rejected. Copy the
snapshot to a protected location outside this volume/host. Backups contain private
records, password hashes and session data. Automated off-host backups and retention
are not configured yet.

For a later move, freeze writes, take the final snapshot, stop the old service and
restore into a new persistent volume with UID/GID 1000 ownership. Restore into an
empty location rather than overwrite a running SQLite file/WAL. Keep the previous
image/configuration and snapshot until verification passes. Invalidate sessions
when changing domains or trust boundaries. Verify all tables, foreign keys,
balances and access before accepting new writes; rollback must preserve any new
writes already accepted at the destination.

## Verification and limits

`npm run build:portable` builds locally; `npm run test:portable` uses generated,
isolated SQLite databases and a temporary loopback port. The integration harness
requires the build first. `portable/vm-rehearsal.mjs` exercises an already-built
Docker image with synthetic data and stops its containers afterward. It retains
its printed synthetic data directory for inspection.

The implementation uses prepared statements and synchronous atomic SQLite batches.
One application instance with a local persistent volume is the supported target.
Google uses Authorization Code with PKCE, state, nonce and verified email checks.
Sessions are random opaque tokens stored hashed in SQLite, expire after eight
hours, and use HttpOnly/SameSite cookies with Secure on HTTPS. Incoming Sites
identity headers are ignored by the standalone target.

Live Google login, public HTTPS routing, actual owner-data migration, automated
backups and sustained load testing remain separate validation steps. Node 24's
built-in SQLite API has an experimental stability designation; the image pins its
runtime and the adapter tests protect the API subset in use.

References: [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output),
[Node SQLite](https://nodejs.org/api/sqlite.html),
[openid-client](https://github.com/panva/openid-client).
