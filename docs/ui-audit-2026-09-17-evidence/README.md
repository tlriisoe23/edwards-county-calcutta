# UI audit 2026-09-17 — Calcutta evidence

Evidence for [../UI-AUDIT-2026-09-17.md](../UI-AUDIT-2026-09-17.md) §4 (`UI-CA-*`).

| File | What it is |
|---|---|
| `cal-*.png` | 29 screenshots — operator setup/prepare/live console at 1440×900, 1366×768, 1280×720 and 390×844 (including compact-off fold shots), public board desk + phone, TV at 1366 and 1920. |
| `source-calcutta.md` | Full source review, 17 sections, register of 38 `SR-CAL-*` findings with file:line citations. §4 of the audit cites these IDs. |
| `research.md` | Comparable-product research across 17 tools (golf and auction/gala); §2 of the audit draws on it. Shared with the Leaderboard half. |
| `inventory.json` | DOM inventory and axe results per captured page (headings, landmarks, control sizes). `*#axe` keys are the axe violation arrays — all empty for Calcutta but one moderate heading rule. |
| `*.mjs` | The capture harness — see below. |

**Provenance.** Captured in an isolated scratch copy of this repository on `claude/ui3-flat-tabs-operator`
@ `775f1cf`, with a fresh local D1/SQLite store, the repo's own migrations, and simulated sign-in
(`seedy@sites.test`). Fixtures were the repo's own demo event plus one empty event for the Prepare state.
**Production (`ecgc-calcutta-app-1`) and its volume were not touched.**

**The capture harness is committed beside this evidence** so the run can be repeated: `shots.mjs`
(drives both products), `cal-shots.mjs` (the Calcutta follow-up pass), `measure.mjs` (DOM and fold
measurement) and `migrate.mjs` (builds the throwaway SQLite store). They expect two isolated scratch dev
servers and will not run against this checkout unmodified — they are here as a record of method, not as a
supported command.

There is no separate combined copy of the document: §4 lives here, §3 lives in
`ecgc-leaderboard/docs/UI-AUDIT-2026-09-17.md`, and §1, §2 and §5 are in both.
