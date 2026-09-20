#!/usr/bin/env bash
# Generic per-repository agent-session lock: read-only-safe coordination for
# concurrent AI agent sessions (Codex, Claude Code, Copilot CLI, or any other
# client) working the same repository. This is a diagnostic convention, not
# an enforced lock -- AGENTS.md's "One writer" clause already states that
# tool locks serialize only cooperating toolkit operations, not arbitrary
# agents. Nothing here signals, kills, or deletes another session's state.
#
# A project's own launcher/wrapper should call agent_lock_acquire once at
# session start and keep that shell alive for the session's duration; the
# lock releases automatically when the shell exits. Before making edits the
# framework's own JSON-mediated tooling would not otherwise serialize, run
# agent-session-check.sh and treat a COMPETING owner as a stop signal.
#
# Linux-only (reads /proc). See agent_lock_supported.

agent_lock_path() {
    local repo=${1:-.} common
    common=$(git -C "$repo" rev-parse --git-common-dir 2>/dev/null) || { printf '%s/.agent-session.lock\n' "$repo"; return; }
    [[ "$common" = /* ]] || common="$repo/$common"
    printf '%s/agent-session.lock\n' "$common"
}

agent_lock_supported() {
    [[ -d /proc ]]
}

agent_lock_pid_is_self_or_ancestor() {
    local candidate=$1 pid=${2:-$$} parent
    [[ "$candidate" =~ ^[0-9]+$ && "$pid" =~ ^[0-9]+$ ]] || return 1
    while (( pid > 1 )); do
        [[ "$pid" == "$candidate" ]] && return 0
        parent=$(sed 's/^[^(]*(.*) //' "/proc/$pid/stat" 2>/dev/null | awk '{print $2}') || return 1
        [[ "$parent" =~ ^[0-9]+$ && "$parent" != "$pid" ]] || return 1
        pid=$parent
    done
    [[ "$candidate" == 1 ]]
}

agent_lock_fd_holds_lock() {
    local descriptor=$1 expected=$2 info
    [[ "$descriptor" =~ ^/proc/[0-9]+/fd/[0-9]+$ && "$descriptor" -ef "$expected" ]] || return 1
    info=${descriptor/\/fd\//\/fdinfo\/}
    awk '
        $1 == "lock:" && $3 == "FLOCK" && ($5 == "WRITE" || $5 == "READ") && $8 == "0" && $9 == "EOF" { held = 1 }
        END { exit !held }
    ' "$info" 2>/dev/null
}

agent_lock_holders() {
    local expected=$1 descriptor owner
    local -A seen=()
    for descriptor in /proc/[0-9]*/fd/*; do
        owner=${descriptor#/proc/}; owner=${owner%%/*}
        [[ -n ${seen[$owner]:-} ]] && continue
        if agent_lock_fd_holds_lock "$descriptor" "$expected"; then
            seen[$owner]=1
            printf '%s\n' "$owner"
        fi
    done
}

# Acquire the lock for the calling shell's lifetime; prints the held file
# descriptor number on success. Caller keeps the shell open for the session.
agent_lock_acquire() {
    local path fd
    path=$(agent_lock_path "${1:-.}")
    mkdir -p "$(dirname "$path")"
    exec {fd}>"$path"
    if ! flock -n "$fd"; then
        printf 'Another agent session already holds the workflow lock: %s\n' "$path" >&2
        return 73
    fi
    printf '%s\n' "$fd"
}
