# Edwards County Calcutta Development Contract

## Framework rules and instruction inheritance

This repository operates under the standards and safeguards defined in the AI Project Framework:
- **Master contract**: [AI Project Framework](../ai-project-framework/AGENTS.md)
- **Engineering standards**: [Development standards](../ai-project-framework/docs/DEVELOPMENT-STANDARDS.md)
- **Safety and secret boundaries**: [Safety rules](../ai-project-framework/docs/SAFETY.md)
- **Task workflow and lifecycle**: [Workflow](../ai-project-framework/docs/WORKFLOW.md)
- **Truthful validation**: [Validation](../ai-project-framework/docs/VALIDATION.md)
- **UI and journey standards**: [UI guidance](../ai-project-framework/docs/UI.md)
- **Release governance**: [Release rules](../ai-project-framework/docs/RELEASE.md)
- **Multi-project structure**: [Multi-project guide](../ai-project-framework/docs/MULTI-PROJECT.md)

All agents (Codex, Claude, Copilot, Cursor) working in this repository must strictly adhere to the framework rules above, alongside the app-specific boundaries below.

## Start and route

- This repository already has its own documentation map — extend it, do not create a parallel one. [docs/PROJECT.md](docs/PROJECT.md) is durable product context; [docs/CURRENT-STATE.md](docs/CURRENT-STATE.md) is the current evidence snapshot; [docs/TASK-TRACKER.md](docs/TASK-TRACKER.md) is the canonical finding/approval queue; [docs/COVERAGE.md](docs/COVERAGE.md) and [docs/PRODUCT-AUDIT.md](docs/PRODUCT-AUDIT.md) separate findings from approved implementation; [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) describes the actual runtime and integrity controls; [docs/VALIDATION.md](docs/VALIDATION.md) is the validation ladder and evidence log. [REVIEW.md](REVIEW.md) retains earlier operating history.
- Use the globally installed `approved-findings-implementation` skill (or the equivalent Codex skill) for new approved batches instead of inventing another batch format; Batches A–D already establish the pattern (`docs/BATCH-A.md` through `docs/BATCH-D.md`).
- This repository has no `.agents/skills/` or shared `scripts/agent-context.sh`/lock tooling. Do not invent commands; read the actual `scripts/` and `portable/` directories before running anything.

## Runtime and ownership

- Built on the Sites Vinext/React starter with Cloudflare Workers and D1 (SQLite). It is operator-first: the operator records amounts during verbal bidding and manual settlement; the app never collects or transfers money itself. Keep it isolated from [ecgc-leaderboard](../ecgc-leaderboard/) — no shared database or deployment identity.
- **This app is live in production**: `https://calcutta.edcogolf.org` (operator: `/admin`), served from `tanner-ai-vm` via `portable/compose.yaml` — container `ecgc-calcutta-app-1`, image `ecgc-calcutta:portable`, persistent volume `ecgc-calcutta_data`, database `/data/calcutta.sqlite` inside the container. Public routing goes through the existing Cloudflare tunnel `ecgc-preview`; do not add router port forwarding or new tunnel routes without authorization.
- Local development uses a separate D1 store under `.wrangler/state` — never the container's `/data/calcutta.sqlite`. See `portable/migrate.mjs`, `portable/backup.mjs`, and `portable/runtime.mjs` for the actual portable-runtime operations.
- Owner is `tlriisoe@gmail.com`; the Access tab manages additional Google-authenticated operators independently of Google client configuration.

## Data and authorization

- Credentials live only in the ignored `.env.portable` (mode 600 on the VM). Never commit `.env.portable`, database files, session state, or exports from `portable/backup.mjs`. Migration/backup snapshots outside this repo (e.g. `ecgc-migration-20260914`) are private records containing real settlement data — never source, never Git.
- The production container, its volume, and its Cloudflare route are live services handling real Calcutta settlement records. Redeploying, restarting the container, running `portable/migrate.mjs`/`portable/backup.mjs` against the container's data, or changing the Cloudflare route requires the same explicit, release-specific authorization the framework's [Release rules](../ai-project-framework/docs/RELEASE.md) describe — never infer it from a merge or a green build.
- Never mutate the production database, real bids, sales, or settlement records to test code. Use a scratch checkout or local `.wrangler/state` for anything destructive, exactly as the existing rehearsal tests (`tests/acceptance.mjs`, `tests/refinement.mjs`) already do.

## Work and validation

- Real, existing commands: `node node_modules/typescript/bin/tsc --noEmit --incremental false`, `npm run lint`, `npm run build` (and `npm run build:portable` for the container build path), `node tests/acceptance.mjs`, `node tests/refinement.mjs`. Record results in [docs/VALIDATION.md](docs/VALIDATION.md) using its existing PASS/FAIL/BLOCKED/UNVERIFIED convention — a successful build does not convert a browser or hosted gap into PASS.
- For visible public/operator/TV UI changes, check the affected desktop, phone, and TV viewports as `docs/VALIDATION.md` already records; a page load alone is not journey validation.
- Delegate independent read-heavy exploration or review when it improves coverage; keep requirements, decisions, and final correctness with the primary implementer.
- Avoid parallel edits to overlapping files or the shared VM's other live services (Leaderboard, golf-course, Fairway Ops, Golf Management Modern). Check `git log -1`, `git status`, and the live process list before writing, per the shared multi-agent working agreement.

## Git and completion

- Work on `main` only for documentation-only baseline records after a merge, matching the existing history; use a dedicated task branch for application code, reviewed diffs, and logical commits.
- Report actual lifecycle state (`implemented -> validated -> deployed -> production-verified`); this app is already deployed and production-verified as of the 2026-09-14 VM deployment record, so a later change must state whether it has been applied to that live container, not merely committed. Update `docs/TASK-TRACKER.md` and `docs/CURRENT-STATE.md` when implemented behavior or approval status changes — do not let them drift from actual state.
