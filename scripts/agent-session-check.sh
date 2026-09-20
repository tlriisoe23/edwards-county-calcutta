#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")" && pwd)
# shellcheck source=agent-lock.sh
source "$SCRIPT_DIR/agent-lock.sh"

usage() {
    cat <<'EOF'
Usage: agent-session-check.sh [repo-path]

Report the shared agent-session lock owner and classify it relative to this
process. Read-only; never sends a signal. Run this before starting edits the
framework's own JSON-mediated tooling would not otherwise serialize (see
AGENTS.md, "One writer"). A COMPETING owner means another agent session is
active in this repository right now; treat that as a stop signal, not
something to resolve automatically.
EOF
}

case "${1:-}" in
    --help|-h) usage; exit 0 ;;
esac

repo=${1:-.}

if ! agent_lock_supported; then
    printf 'This platform has no /proc; the session lock cannot be inspected automatically here.\n'
    printf 'Check for other active sessions manually before starting parallel work.\n'
    exit 0
fi

lock=$(agent_lock_path "$repo")
resolved=$(readlink -f "$lock" 2>/dev/null || printf '%s' "$lock")
owners=()
while read -r pid; do
    [[ "$pid" =~ ^[0-9]+$ ]] || continue
    owners+=("$pid")
done < <(agent_lock_holders "$resolved")

if (( ${#owners[@]} == 0 )); then
    printf 'No visible agent-session lock owner: %s\n' "$resolved"
    printf 'This read-only inspection cannot rule out inaccessible process descriptors.\n'
    exit 0
fi

status=73
for pid in "${owners[@]}"; do
    if agent_lock_pid_is_self_or_ancestor "$pid"; then
        command=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
        printf 'PROTECTED ancestor lock owner: PID %s (%s)\n' "$pid" "${command:-unknown command}"
        printf 'This process belongs to the current workflow ancestry; do not signal it.\n'
        status=0
    fi
done
# An inherited open description can have several holders. Do not label a
# workflow's own descriptor as a competing lock when an ancestor already
# holds the same one.
if (( status != 0 )); then
    for pid in "${owners[@]}"; do
        agent_lock_pid_is_self_or_ancestor "$pid" && continue
        command=$(tr '\0' ' ' < "/proc/$pid/cmdline" 2>/dev/null || true)
        printf 'COMPETING lock owner: PID %s (%s)\n' "$pid" "${command:-unknown command}"
    done
fi
exit "$status"
