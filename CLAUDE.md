@AGENTS.md

# Claude Code

This app is deployed and live at `https://calcutta.edcogolf.org` on `tanner-ai-vm`,
holding real Calcutta settlement records. Treat its production container and
database as a real running service, not a sandbox — see "Data and
authorization" in `AGENTS.md` before touching the container, its volume, or
the Cloudflare route.

Use subagents only for substantial independent investigations that would
otherwise pollute the main context. Do not spawn subagents for routine edits
or small UI fixes.
