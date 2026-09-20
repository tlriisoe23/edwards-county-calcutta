# Documentation map

Created at framework adoption, 2026-09-19; this is the single map, extended from the routing that
AGENTS.md used to carry. Read what the task needs, not the whole directory.

## Start here

- [CURRENT-STATE.md](CURRENT-STATE.md) — **generated** from `project.json` and `state/releases/`: the
  recorded production release and pointers. Do not edit by hand; run `render` from the framework
  checkout (`python3 tools/project.py --project edwards-county-calcutta render`).
- [TASKS.md](TASKS.md) — generated index of the canonical records under `tasks/active/`; closed
  records move intact to `tasks/archive/`.
- [BACKLOG.md](BACKLOG.md) — gated and owner-scoped work with its finding IDs; budgeted.
- [PROJECT.md](PROJECT.md) — durable product context: people, workflows, business rules, terminology.

## Reference

- [ARCHITECTURE.md](ARCHITECTURE.md) — the actual runtime and integrity controls; [DECISIONS.md](DECISIONS.md) — numbered decisions `D-CAL-*`.
- [VALIDATION.md](VALIDATION.md) — the validation ladder and evidence log; [VM-DEPLOYMENT.md](VM-DEPLOYMENT.md) — every deploy, rollback tag and post-deploy check; [PORTABLE-HOSTING.md](PORTABLE-HOSTING.md) and [PORTABLE-VALIDATION.md](PORTABLE-VALIDATION.md) — the container target.
- [PRODUCT-AUDIT.md](PRODUCT-AUDIT.md), [COVERAGE.md](COVERAGE.md) and [UI-AUDIT-2026-09-17.md](UI-AUDIT-2026-09-17.md) — the finding registers behind every ID; batch records (`BATCH-*.md`, `S1.md`) — the evidence behind merged work.
- [../REVIEW.md](../REVIEW.md) — earlier operating history.

## History

- [archive/TASK-TRACKER-2026-09-19-pre-readoption.md](archive/TASK-TRACKER-2026-09-19-pre-readoption.md) — the hand-written tracker, intact; [archive/CURRENT-STATE-2026-09-19-pre-readoption.md](archive/CURRENT-STATE-2026-09-19-pre-readoption.md) — the hand-written current state, intact.
