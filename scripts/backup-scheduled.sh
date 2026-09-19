#!/usr/bin/env bash
# Scheduled off-container backup of the live Calcutta database.
#
# This product holds real settlement records — who bought which team, for how
# much, who is owed what — and until 2026-09-18 it had no backup script at all,
# while its sibling leaderboard had one running nightly. Every pre-deploy
# snapshot here was taken by hand. This is the port of that script, and it
# matters more here, not less.
#
# portable/backup.mjs takes a consistent snapshot through SQLite's own backup
# API, but it writes inside the container, onto the same volume as the database
# it is copying. A snapshot sharing a volume with its original protects against
# a bad write, not against losing the volume — so this takes the snapshot,
# copies it OUT to the host, removes the in-container copy, verifies the host
# copy opens and passes integrity_check, and then applies retention.
#
# Getting the file off this host again is a separate job: see
# `scripts/replicate-offhost.sh` in the sibling leaderboard repository, which
# mirrors every project's backup directory to the Windows desktop. A backup that
# never leaves the machine it was taken on is one power supply from gone.
#
# Backups are private data (see AGENTS.md): they land outside the repository,
# mode 600, and are never committed.
set -euo pipefail

container="${CALCUTTA_CONTAINER:-ecgc-calcutta-app-1}"
backup_dir="${CALCUTTA_BACKUP_DIR:-$HOME/backups/ecgc-calcutta}"
retain_days="${CALCUTTA_BACKUP_RETAIN_DAYS:-14}"
retain_min="${CALCUTTA_BACKUP_RETAIN_MIN:-30}"
stamp="$(date -u +%Y%m%dT%H%M%S)"
in_container="/data/scheduled-${stamp}.sqlite"
destination="${backup_dir}/calcutta-${stamp}.sqlite"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

# cron runs with a bare PATH (/usr/bin:/bin) and node here lives under nvm, so
# `node` resolves interactively and not from cron. Resolve it explicitly and
# fail loudly rather than skipping verification, which is the whole point of the
# run. Override with CALCUTTA_NODE if node moves.
node_bin="${CALCUTTA_NODE:-$(command -v node 2>/dev/null || true)}"
if [[ -z "$node_bin" ]]; then
  node_bin="$(find "$HOME/.nvm/versions/node" -maxdepth 3 -name node -type f -perm -u+x 2>/dev/null | sort -V | tail -1)"
fi
if [[ -z "$node_bin" || ! -x "$node_bin" ]]; then
  log "ERROR: node not found (looked on PATH and under \$HOME/.nvm); set CALCUTTA_NODE."
  exit 1
fi

if ! docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null | grep -q true; then
  log "ERROR: container $container is not running; no backup taken."
  exit 1
fi

mkdir -p "$backup_dir"
chmod 700 "$backup_dir"

# Always clear the in-container copy, including on failure: /data is the live
# volume and this script must not be what fills it up.
cleanup() { docker exec "$container" rm -f "$in_container" >/dev/null 2>&1 || true; }
trap cleanup EXIT

docker exec "$container" node portable/backup.mjs "$in_container" >/dev/null
docker cp "$container:$in_container" "$destination"
chmod 600 "$destination"

# A backup that has not been opened is a guess. Verify the host copy, because
# the host copy is the artifact being kept. The money tables are counted and
# reported rather than merely present: a settlement backup whose sales table is
# empty when last night's was not is the one thing worth noticing in a log.
# Verify a scratch copy, never the artifact. Opening a database creates `-wal`
# and `-shm` sidecars beside it — `readOnly: true` does not prevent that — and a
# stray `-wal` next to a backup is worse than clutter: SQLite replays it on the
# next open, so the check would be editing the thing it is checking. The copy
# also exercises one more read of the file that was just written.
scratch="$(mktemp -d)"
trap 'docker exec "$container" rm -f "$in_container" >/dev/null 2>&1 || true; rm -rf -- "$scratch"' EXIT
cp -- "$destination" "${scratch}/verify.sqlite"

if ! "$node_bin" -e '
const { DatabaseSync } = require("node:sqlite");
// Read-only: a verification that can write to the artifact is a
// verification that can damage it, and an unclean exit leaves -wal and -shm
// sidecars beside a backup that SQLite will replay on the next open.
const db = new DatabaseSync(process.argv[1], { readOnly: true });
try {
  const integrity = db.prepare("PRAGMA integrity_check").get().integrity_check;
  if (integrity !== "ok") throw new Error("integrity_check: " + integrity);
  const count = (t) => db.prepare("SELECT count(*) n FROM " + t).get().n;
  if (count("events") === 0) throw new Error("no events in the backup");
  // Every sale must still point at a team and a buyer that exist, and every
  // ownership row at a sale. A file that opens but has lost its references is
  // not a backup of anything you could settle from.
  const orphanSales = db.prepare(
    "SELECT count(*) n FROM sales s LEFT JOIN teams t ON s.teamId=t.id WHERE t.id IS NULL").get().n;
  const orphanOwnership = db.prepare(
    "SELECT count(*) n FROM ownership o LEFT JOIN sales s ON o.saleId=s.id WHERE s.id IS NULL").get().n;
  if (orphanSales || orphanOwnership)
    throw new Error(`orphaned rows: sales=${orphanSales} ownership=${orphanOwnership}`);
  console.log(["events", "teams", "sales", "ownership", "audit"]
    .map((t) => t + "=" + count(t)).join(" "));
} finally { db.close(); }
' "${scratch}/verify.sqlite"; then
  log "ERROR: $destination failed verification and was removed."
  rm -f -- "$destination"
  exit 1
fi

log "backed up to $destination ($(stat -c %s "$destination") bytes)"

# Never prune what cannot be enumerated.
mapfile -t all < <(find "$backup_dir" -maxdepth 1 -type f -name 'calcutta-*.sqlite' -printf '%T@ %p\n' 2>/dev/null | sort -rn | cut -d' ' -f2-)
total="${#all[@]}"
[[ "$total" -gt "$retain_min" ]] || { log "retained $total backups (minimum $retain_min); nothing pruned"; exit 0; }

pruned=0
for backup in "${all[@]:$retain_min}"; do
  if [[ -n "$(find "$backup" -maxdepth 0 -mtime "+$retain_days" 2>/dev/null)" ]]; then
    rm -f -- "$backup" && pruned=$((pruned + 1))
  fi
done
log "retained $((total - pruned)) backups; pruned $pruned older than ${retain_days} days"
