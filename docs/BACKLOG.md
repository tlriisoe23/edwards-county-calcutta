# Backlog — gated and owner-scoped work

<!-- Budgeted document: project.json budgets this file. When it fills, archive resolved or abandoned
entries with their evidence rather than deleting them; do not raise the budget silently. -->

**What this is.** Every open item that is real but gated: on an owner decision, on hardware, on a
policy the owner has not confirmed, or on approval not yet given. It is the single owner of gated
work under the framework governance adopted on 2026-09-19. Live, actionable work is a record under
`tasks/active/` and appears in [the task index](TASKS.md); nothing here is selectable work until it
moves there. Finding IDs are unchanged and their canonical descriptions stay where they were:
[PRODUCT-AUDIT.md](PRODUCT-AUDIT.md), [UI-AUDIT-2026-09-17.md](UI-AUDIT-2026-09-17.md) and the
[archived tracker](archive/TASK-TRACKER-2026-09-19-pre-readoption.md), whose register still holds every row.

**Rules.** An item becomes a task record when its gate opens; copy the text, name this list as the
source, and check it off here with the record ID. Text below is reproduced from the tracker as it
stood at `main` when this file was created, so the migration's zero-loss gate can match every ID.
The two engineering gaps that needed no decision, OC-3 and OC-4, are task records T-0002 and T-0003
rather than backlog entries.

**Context on 2026-09-19.** The owner stated that neither this application nor the leaderboard will
be used for a tournament in the near future; the night-of workarounds recorded for OC-6 and OC-8 are
history (both fixed and deployed), not standing instructions.

## UI audit 2026-09-17 (`UI-CA-*`, `UI-X-*`) — proposed, not approved

Reproduced from the tracker's "Current state — 2026-09-18" section. UI-CA-07, 08, 09 and 16 were
implemented as the night-of set and are closed; the rest keep their IDs in
[UI-AUDIT-2026-09-17.md](UI-AUDIT-2026-09-17.md).

- **UI audit 2026-09-17 (`UI-CA-*`) — PROPOSED, not approved, nothing implemented.** A cleanliness /
  usability / readability pass over this product and the ECGC Leaderboard together. It was read on
  `claude/ui3-flat-tabs-operator` @ `775f1cf` (Batch L / UI3, **unmerged** — this branch and the live
  container both predate it — UI3 has since merged at `b6fb0f0` and deployed, so the `main + UI3`
  findings now describe what is live), because UI3 is the direction the console is heading. **Every finding records
  whether it is `main + UI3`, a UI3 regression, or UI3-only**, so a UI3-only finding lapses if UI3 is
  abandoned and the `main + UI3` ones apply to what is deployed today. 34 findings in
  [UI-AUDIT-2026-09-17.md](UI-AUDIT-2026-09-17.md) §4 (0 P1, 15 P2, 19 P3) plus 10 cross-product `UI-X-*`
  items in §5; evidence in [ui-audit-2026-09-17-evidence/](ui-audit-2026-09-17-evidence/).
  **IDs are a separate series and do not collide with the `CAL-*` / `D-CAL-*` register below.** Each finding
  has an acceptance test and can be approved individually; the suggested first batch is §5.1.
  The `UI-LB-*` half lives in `ecgc-leaderboard/docs/UI-AUDIT-2026-09-17.md`.
  *Audit only — no source, schema, container or route was changed to produce it.*

## C2 — dual-display acceptance, blocked on hardware

C2 itself was reworked, implemented and merged (`d4b3709`); what remains is the acceptance its own
requirements demanded and a browser viewport cannot give. Reproduced from "C2 requirements recorded
during S1 recovery":

- Primary display is the operator desk; secondary display is the TV/fullscreen board. The operator must retain normal mouse/focus use on the primary monitor while TV remains on the secondary display.
- Investigate the reported fullscreen mouse/focus “capture” on actual dual-display hardware. Source inspection during S1 found no `requestPointerLock` or pointer-lock listener in app/components/lib; this is not a runtime or physical-hardware conclusion. Pointer lock must not be required.
- Improve **Launch TV Display** using the best supported multi-monitor/window-placement behavior, with a clear manual fallback when placement APIs/permissions are unavailable. Test focus changes and fullscreen retention on relevant browsers/OS combinations.
- Provide a compact **Auction Night** operating layout for LIVE/PAUSED: core controls fit a typical 1366×768 working viewport without routine vertical scrolling. Current lot/team, bid controls, buyer/bidder, increment, Sold/advance and Pause/correction dominate.
- Collapse or de-emphasize PREPARE / AFTER AUCTION / TOOLS during active operation while keeping them accessible. Preserve C1’s accepted information architecture; adapt density rather than replacing navigation.
- Acceptance must include actual two-display operator/TV use and the reported focus issue. S1’s browser viewport checks cannot close C2.

## Portability remainder — confirm, likely superseded

Reproduced from the 2026-09-16 planned-work section. Google sign-in, local logins and the nightly
off-host backup have since shipped (see the archived current state and VM-DEPLOYMENT.md), so most of
this paragraph is superseded; it is kept until someone confirms the owner-data cutover line.

Separate approved portability work now has a [hosting implementation](PORTABLE-HOSTING.md)
and [validation record](PORTABLE-VALIDATION.md). Remaining: configure real Google
credentials and owner recovery password; verify owner-data import/cutover; configure
HTTPS/DNS and off-host backup retention. This does not approve optional Batch E.

## Owner scope 2026-09-18 — requested, not approved for implementation

- **WC-5** — **Step 5 and the auction controls** (from the owner's list, recorded as written: *"Make
  step 5 and move auction"*). The intent is not clear from the note alone and needs a sentence from
  the owner before it is worked on. It is very likely the same ground as **UI-CA-16**, which found
  the Prepare step 5 card renders identically while LIVE, PAUSED and COMPLETED, and that restarting
  a completed auction takes one unconfirmed click.
  - Source: former tracker section "Owner scope 2026-09-18 — requested, not started" ([archived tracker](archive/TASK-TRACKER-2026-09-19-pre-readoption.md)).
- **WC-8** — **An auto-scrolling public/TV board, and the Calcutta equivalent of the
  leaderboard's.** The owner wants a continuously scrolling option rather than a paging slideshow,
  and a Calcutta board that matches the leaderboard's exactly with one extra column for the pop. The
  leaderboard's side is W-8. Note this product's TV is already the best screen in either app per the
  2026-09-17 audit — **do not regress it** to gain a scroll mode.
  - Source: former tracker section "Owner scope 2026-09-18 — requested, not started" ([archived tracker](archive/TASK-TRACKER-2026-09-19-pre-readoption.md)).

## Roadmap batches still gated

### Batch E — optional, not approved

### Batch E — Explicit export contracts (optional)

- **Exact IDs:** `CAL-P3-001` only.
- **Objective:** Reduce future divergence between in-tab downloads and central exports while preserving their intentional formats.
- **Why together:** Single small debt project; no broad application refactor included.
- **Expected areas:** In-tab CSV functions in `app/operator.tsx`, `lib/exports.ts`, serializer contracts and focused format tests/documentation.
- **Risk:** Low-medium if schema differences are made explicit; higher if formats are silently unified, which is not approved scope.
- **Acceptance:** Existing download buttons keep their promised columns, roster reimport compatibility and privacy policy; financial files reconcile; shared contracts do not contain duplicate row mappings. No new dependency unless justified.
- **Regression surface:** All existing CSV variants and importer. Perform after B/D so cleanup preserves corrected behavior.
- **Order:** 5, optional after user-visible defects; do not treat it as a release blocker by itself.

### Batch J — proposed, policy-gated (D-CAL-6)

### Batch J — Unclaimed purse to the house (proposed)

- **Status:** PROPOSED, awaiting approval. Policy recorded 2026-09-15 by the owner: an unclaimed purse share (place held by an unsold team) goes to the house; the house then chooses, per event, to add it back to the winners' pot or keep it.
- **Exact IDs:** `CAL-P3-006`.
- **Objective:** Placing an unsold team is legal; Results and Settlement show the unclaimed amount and the house's choice explicitly instead of empty-state copy that says results are missing.
- **Expected areas:** `lib/model.ts` `compute()` (house-retained vs redistributed unclaimed share), a per-event house choice and Results-panel messaging in `app/rules.tsx`, settlement messaging in `app/settlement.tsx`, seeded oracle cases in `tests/audit-math.mjs`.
- **Risk:** Medium — changes money arithmetic; the independent BigInt oracle must be extended with the new rule before `compute()` changes, and redistribution must remain cent-exact under largest-remainder.
- **Acceptance:** Both house choices produce cent-exact totals that reconcile against the oracle; existing 1,000 seeded cases unchanged when no place is unclaimed; explicit messages in Results and Settlement.
- **Order:** after F–I; route through `approved-findings-implementation`.

### CAL-P3-007 — deferred under D-CAL-5

- **Status:** APPROVED 2026-09-15 (D-CAL-2…5) · `CAL-P3-003/004/005` IMPLEMENTED (local) and validated on `claude/cal-i-data-entry` (stacked on the Batch H branch), see [BATCH-I.md](BATCH-I.md); `CAL-P3-007` DEFERRED under D-CAL-5 with measurements (a sticky panel would cover the current bid at both laptop sizes) — since addressed architecturally by Batch K/C2, see the Stable register above. **`CAL-P3-003/004/005` since merged to `main` and deployed on `ecgc-calcutta-app-1`.** Harness 17/17 on the implemented IDs, focused suite 43/43 (server rules, Access, Batch A access and Batch D import reruns), acceptance 58/58, refinement 72/72.
  - Source: Batch I's status line in the [archived tracker](archive/TASK-TRACKER-2026-09-19-pre-readoption.md).

## Future ideas, not authorized

- **Offline operation for venues without internet access.** The owner raised wanting to explore a
  version of the app that can run an auction at a venue with no connectivity. Nothing has been
  designed or estimated. It would touch areas this project currently treats as settled — the
  operator/board/TV split all assume a reachable server, and the portable container still expects a
  network for its Cloudflare tunnel and Google sign-in — so it needs its own requirements pass,
  decision record and approval before any code. Not part of Batch L.
