# Copilot entrypoint

Follow `AGENTS.md` in full — this file only points Copilot at it; it does not
restate it.

This app is deployed and live at `https://calcutta.edcogolf.org` on
`tanner-ai-vm`, holding real Calcutta settlement records. Never redeploy,
restart the container, or touch its database or Cloudflare route without the
explicit authorization described in `AGENTS.md`. Never commit `.env.portable`,
database files, or backups.

Run the typecheck, lint, and build commands in `AGENTS.md`, plus
`node tests/acceptance.mjs` and `node tests/refinement.mjs`, for code changes,
and record results the way `docs/VALIDATION.md` already does. The queue is
`docs/TASKS.md` and the records under `tasks/active/`; gated work is `docs/BACKLOG.md`.
