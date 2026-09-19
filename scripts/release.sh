#!/usr/bin/env bash
# Release this application to the VM: the steps every entry in docs/VM-DEPLOYMENT.md
# records, in the order it records them, stopping at the first failure.
#
#   scripts/release.sh <label>          snapshot, rollback tag ecgc-calcutta:pre-<label>-<date>,
#                                       build main, recreate the container, migrate, snapshot
#                                       again, verify read-only
#   scripts/release.sh --verify-only    the read-only checks alone, against whatever is live
#
# This script is the procedure, not the authorization: a release needs the owner's
# explicit, release-specific yes (RELEASE.md), and the deploy record in
# docs/VM-DEPLOYMENT.md is still written by hand from what this prints.
set -euo pipefail
cd "$(dirname "$0")/.."
compose=(docker compose --env-file .env.portable -f portable/compose.yaml)
container="ecgc-calcutta-app-1"
public="${CALCUTTA_PUBLIC_URL:-https://calcutta.edcogolf.org}"
playwright="${UI3_PLAYWRIGHT_MODULE:-$(cd .. && pwd)/ecgc-leaderboard/node_modules/playwright/index.mjs}"
log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*"; }

verify() {
  log "verify: container $(docker inspect -f '{{.State.Health.Status}}' "$container"), image $(docker inspect -f '{{.Image}}' "$container" | cut -c8-19) ($(docker images ecgc-calcutta --format '{{.ID}} {{.Tag}}' | grep "$(docker inspect -f '{{.Image}}' "$container" | cut -c8-19)" | awk '{print $2}' | grep -v -E '^(portable|pre-)' | head -1 || true)), networks $(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$container")"
  for path in / /tv /api/public; do
    log "verify: $public$path → $(curl -s -o /dev/null -w '%{http_code} in %{time_total}s' -m 15 "$public$path")"
  done
  log "verify: $public/admin → $(curl -s -o /dev/null -w '%{http_code}' -m 15 "$public/admin") (307 expected); anonymous /api/admin → $(curl -s -o /dev/null -w '%{http_code}' -m 15 "$public/api/admin") (403 expected)"
  # The private wire to the leaderboard, read from inside this container (D-CAL-17).
  log "verify: private wire — $(docker exec "$container" node -e '
    const t = Date.now();
    fetch("http://leaderboard:3000/api/board").then((r) => r.json()).then((b) => {
      const e = b.event; console.log(`leaderboard answered in ${Date.now() - t} ms — ${e ? e.name + ", " + (e.calcutta?.field?.length ?? 0) + " flighted rows, " + (e.flights?.length ?? 0) + " flights" : "no live event"}`);
    }).catch((e) => { console.log("FAILED: " + e.message); process.exit(1); });' 2>&1)"
  # The newest verified snapshot: integrity, the counts, and the local-users table's key.
  local newest scratch
  newest="$(ls -t "$HOME"/backups/ecgc-calcutta/calcutta-*.sqlite | head -1)"
  scratch="$(mktemp -d)"; cp -- "$newest" "$scratch/verify.sqlite"
  log "verify: snapshot $(basename "$newest") — $(node -e '
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(process.argv[1], { readOnly: true });
    const n = (t) => db.prepare(`SELECT count(*) n FROM "${t}"`).get().n;
    const key = db.prepare("PRAGMA table_info(portable_local_users)").all().map((c) => c.name)[0];
    console.log(`integrity ${db.prepare("PRAGMA integrity_check").get().integrity_check}; events ${n("events")} / flights ${n("flights")} / teams ${n("teams")} / sales ${n("sales")} / audit ${n("audit")}; local users ${n("portable_local_users")}, keyed by ${key}`);
    db.close();' "$scratch/verify.sqlite")"
  rm -rf -- "$scratch"
  # The public board and the TV in a real browser, as every deploy record checks them.
  if [[ -f "$playwright" ]]; then
    log "verify: browser — $(node --input-type=module -e '
      const { chromium } = await import(process.argv[1]);
      const browser = await chromium.launch({ headless: true });
      const out = [];
      for (const [path, width, height] of [["/", 1440, 1000], ["/tv", 1920, 1080]]) {
        const page = await browser.newPage({ viewport: { width, height } });
        const errors = []; page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(process.argv[2] + path, { waitUntil: "networkidle", timeout: 30000 });
        await page.waitForTimeout(1500);
        out.push(`${path} at ${width}: ${errors.length} JavaScript error${errors.length === 1 ? "" : "s"}`);
        await page.close();
      }
      await browser.close(); console.log(out.join("; "));' "$playwright" "$public" 2>&1)"
  else
    log "verify: browser check skipped — no Playwright at $playwright (set UI3_PLAYWRIGHT_MODULE)"
  fi
}

if [[ "${1:-}" == "--verify-only" ]]; then verify; exit 0; fi
label="${1:?usage: scripts/release.sh <label> | --verify-only}"
[[ "$label" =~ ^[a-z0-9-]+$ ]] || { log "ERROR: the label names the rollback tag; use letters, digits and dashes."; exit 1; }
[[ -z "$(git status --porcelain)" ]] || { log "ERROR: the working tree is not clean — release the exact committed candidate."; exit 1; }
commit="$(git rev-parse --short HEAD)"
[[ -r .env.portable ]] || { log "ERROR: no .env.portable here."; exit 1; }
mkdir -p outputs
log "releasing $(git branch --show-current) @ $commit as ecgc-calcutta:portable (label: $label)"

log "1/6 snapshot before the release"
scripts/backup-scheduled.sh

running="$(docker inspect -f '{{.Image}}' "$container")"
was="$(docker images ecgc-calcutta --format '{{.ID}} {{.Tag}}' | grep "${running:7:12}" | awk '{print $2}' | grep -v -E '^(portable|pre-)' | head -1 || true)"
tag="ecgc-calcutta:pre-${label}-$(date -u +%Y%m%d)"
docker tag "$running" "$tag"
log "2/6 rollback tag $tag on the running image ${running:7:12} (commit ${was:-unknown})"

log "3/6 build ecgc-calcutta:portable from $commit (log: outputs/release-build-$commit.log)"
"${compose[@]}" build app > "outputs/release-build-$commit.log" 2>&1 || { tail -30 "outputs/release-build-$commit.log"; log "ERROR: build failed; nothing was recreated."; exit 1; }
docker tag ecgc-calcutta:portable "ecgc-calcutta:$commit"

log "4/6 recreate the container (the leaderboard keeps its uptime)"
"${compose[@]}" up -d --no-deps app
for i in $(seq 1 90); do
  state="$(docker inspect -f '{{.State.Health.Status}}' "$container" 2>/dev/null || echo starting)"
  [[ "$state" == "healthy" ]] && { log "    healthy after ${i} s"; break; }
  if [[ "$i" -eq 90 ]]; then docker logs --tail 30 "$container"; log "ERROR: not healthy after 90 s ($state). Roll back: docker tag $tag ecgc-calcutta:portable && ${compose[*]} up -d --no-deps app"; exit 1; fi
  sleep 1
done

log "5/6 migrate in the rebuilt container"
"${compose[@]}" exec -T app node portable/migrate.mjs

log "6/6 snapshot after the migration, then verify"
scripts/backup-scheduled.sh
verify
log "released $commit. Rollback: docker tag $tag ecgc-calcutta:portable && ${compose[*]} up -d --no-deps app — take a fresh snapshot first. Now write the record in docs/VM-DEPLOYMENT.md."
