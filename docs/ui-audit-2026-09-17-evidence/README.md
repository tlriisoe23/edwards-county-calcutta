# UI audit 2026-09-17 — Calcutta evidence

Evidence for [../UI-AUDIT-2026-09-17.md](../UI-AUDIT-2026-09-17.md) §4 (`UI-CA-*`).

| File | What it is |
|---|---|
| `cal-*.png` | 29 screenshots — operator setup/prepare/live console at 1440×900, 1366×768, 1280×720 and 390×844 (including compact-off fold shots), public board desk + phone, TV at 1366 and 1920. |
| `source-calcutta.md` | Full source review, 17 sections, register of 38 `SR-CAL-*` findings with file:line citations. §4 of the audit cites these IDs. |
| `research.md` | Comparable-product research across 17 tools (golf and auction/gala); §2 of the audit draws on it. Shared with the Leaderboard half. |
| `inventory.json` | DOM inventory and axe results per captured page (headings, landmarks, control sizes). `*#axe` keys are the axe violation arrays — all empty for Calcutta but one moderate heading rule. |

**Provenance.** Captured in an isolated scratch copy of this repository on `claude/ui3-flat-tabs-operator`
@ `775f1cf`, with a fresh local D1/SQLite store, the repo's own migrations, and simulated sign-in
(`seedy@sites.test`). Fixtures were the repo's own demo event plus one empty event for the Prepare state.
**Production (`ecgc-calcutta-app-1`) and its volume were not touched.**

The capture harness (`cal-shots.mjs`, `measure.mjs`, `migrate.mjs`) and the unsplit cross-product
document are kept outside the repository at `/home/tanner/audit-artifacts/ui-audit-2026-09-17/`.
