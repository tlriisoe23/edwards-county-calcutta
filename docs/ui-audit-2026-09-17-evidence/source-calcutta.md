# Source review — Edwards County Calcutta UI (SR-CAL)

**Scope.** Read-only source review of `/home/tanner/development/edwards-county-calcutta`, working tree on `claude/ui3-flat-tabs-operator` @ `775f1cf` (UI3, unmerged) stacked on `main` @ `8405a8a` (production). Every finding says whether it is **UI3-only** or **also on `main`** (checked with `git show main:<file> | grep`). Files read in full: `app/operator.tsx`, `app/auction.tsx`, `app/auction-controls.tsx`, `app/editors.tsx`, `app/rules.tsx`, `app/settlement.tsx`, `app/sharing.tsx`, `app/exports.tsx`, `app/theme-settings.tsx`, `app/help-tooltip.tsx`, `app/prepare-steps.tsx`, `app/tv/page.tsx`, `app/page.tsx`, `app/admin/page.tsx`, `app/layout.tsx`, `app/globals.css`, `app/refinements.css`, `app/themes.css`, `lib/model.ts`, `lib/audit.ts`, `lib/sharing.ts`, relevant parts of `app/api/admin/route.ts`, `scripts/stage-portable.mjs`, `tests/ui3-reorder.mjs`; docs `PROJECT.md`, `BATCH-L.md`, `BATCH-CAL-UI2.md`, `BATCH-K.md`, `S1.md`, `DECISIONS.md`, `TASK-TRACKER.md`, `PRODUCT-AUDIT.md` (KEEP/PROTECT and open P3s).

**Not repeated here.** CAL-P3-001 (export contracts), CAL-P3-006 (unsold-team place, D-CAL-6), CAL-P3-007 (Hammer fold, D-CAL-5; UI3 measured 707 px at 1366×768). Settled decisions D-CAL-1…7 are respected; where UI3 owner requests (UI3-1…8) are questioned, that is flagged as *for the owner to weigh*, not as a defect.

**Line citations.** `app/operator.tsx` has lines of 1–6 KB; citations give the line and a short quoted fragment so `grep -n` finds them.

**Evidence classes.** *Source-supported* = read in the cited file. *Hypothesis* = a plausible experience that needs the named check.

---

## 0. Findings register (all surfaces)

| ID | Surface | Sev | Where | One line |
|---|---|---|---|---|
| SR-CAL-01 | Console (compact) | P2 | main + UI3 | Connection state, operator identity, event name and *Demo* tag all hide when compact — exactly while LIVE |
| SR-CAL-02 | Console | P2 | UI3 regression | Console *Full screen* hides the masthead, so Undo / Compact / Theme vanish under `:fullscreen` |
| SR-CAL-03 | Console / Undo | P2 | UI3-only | Undo confirmation names a sale as "sell" — the one action that most needs naming; several other action names never match |
| SR-CAL-04 | Console / Undo | P2 | UI3 (button) + main (U key) | Undo button enabled with nothing to undo; two different follow-on sentences for the same confirmation |
| SR-CAL-05 | All operator dialogs | P2 | main + UI3 | Every destructive confirmation's action button reads "Confirm" |
| SR-CAL-06 | Console / Prepare 5 | P2 | main (Restart) + UI3 (step 5) | Restarting a COMPLETED auction has no confirmation; step 5 card ignores auction state |
| SR-CAL-07 | Console | P2 | main + UI3 | Bid field never selects its contents; `B` then typing appends to the current bid |
| SR-CAL-08 | Sold dialog | P2 | main + UI3 | Sale confirmation needs the mouse; focus is lost after Sold/Undo when opened by shortcut |
| SR-CAL-09 | Console | P2 | main + UI3 | LIVE with no team on the block: Hammer is disabled and the only way forward is a small "On block" in the queue |
| SR-CAL-10 | Rules / Results | P2 | main + UI3 | Unsaved rule and results drafts are silently lost on tab switch |
| SR-CAL-11 | Rules | P2 | main + UI3 | A payout ladder is shown for every flight *and* the combined pool regardless of pool mode |
| SR-CAL-12 | Teams | P2 | main + UI3 | "CSV" vs "Bulk paste / CSV", "Full team editor", "Add another", raw `name flight handicap` sort buttons that rewrite the auction order with one click |
| SR-CAL-13 | Operator (all non-strip tabs) | P2 | main + UI3 (compact makes it worse) | Seven sections have no tab; the strip shows nothing selected and headings are slogans, not names |
| SR-CAL-14 | Prepare | P3 | main + UI3 | Five prepare cards head every tab in every phase unless compact |
| SR-CAL-15 | Prepare | P3 | main + UI3 (step 5) | "Not started" on an optional step; steps 1, 4, 5 carry no readiness or state |
| SR-CAL-16 | Masthead | P3 | UI3 placement; duplication on main | Eight equal-weight header controls; theme select shows only "Classic ECGC"; theme control duplicated with different save semantics |
| SR-CAL-17 | Console queue | P3 | main + UI3 | 32 equal-weight buttons in *Next up*; empty-queue message points at a tab hidden in compact |
| SR-CAL-18 | Console | P3 | main + UI3 | "Correct bid" is a second bid button with one flag; enabled when "Record bid" is not |
| SR-CAL-19 | Operator copy | P3 | main + UI3 | "No money is processed" is said six-plus times; explanatory sub-captions under quick-bid heading |
| SR-CAL-20 | Operator + public copy | P3 | main + UI3 | Entitlement / receivables / payables / projection / consideration / version check leak to volunteers and spectators |
| SR-CAL-21 | Cross-surface naming | P3 | main + UI3 (adds "Start Auction", "TV / Display Settings", "View and Edit Sales") | One thing, many names: buyer, TV, board, sold, index, status casing |
| SR-CAL-22 | Money inputs | P3 | main + UI3 | Hard-coded "$" in bid entry; "USD" prefix elsewhere; "(currency units)" in rules |
| SR-CAL-23 | Sales / Results / Public | P3 | main + UI3 | "Purchaser 100%" on every sale when buybacks are Off; raw `ACTIVE` / `ON_BLOCK` constants in three places |
| SR-CAL-24 | Teams | P3 | main + UI3 | Row menu shows all seven actions regardless of team state |
| SR-CAL-25 | Operator empty state | P3 | main + UI3 (UI3 hid Load demo in Tools) | Empty desk has no button; copy tells you to "load the demonstration event" that is now inside Tools ▾ |
| SR-CAL-26 | Masthead | P3 | main + UI3 | Brand link in the operator navigates the console to the public board in the same tab |
| SR-CAL-27 | Prepare 5 / Help | P3 | UI3-only | Start dialog hard-codes `calcutta.edcogolf.org/admin`; Help checklist still describes the pre-step-5 start sequence |
| SR-CAL-28 | Public board | P3 | main + UI3 | "Live from the clubhouse" during SETUP/COMPLETED; "ON THE BLOCK" with no team; empty "House rules" section; TV mode link on phones |
| SR-CAL-29 | TV | P3 | main + UI3 | Operator chrome ("← Auction board", "Full screen") stays on the TV in fullscreen |
| SR-CAL-30 | A11y (targets) | P2 | main + UI3 | Several controls under 24 px: prepare help icon (~19 px), Tools trigger (`padding:0`), roster arrows 25 px, ladder icons 34×36 |
| SR-CAL-31 | A11y (names/ARIA) | P2 | main + UI3 | Buyer picker accessible name ≠ visible label; `aria-label` on a plain `div`; non-nav controls inside `<nav>`; `h2.eyebrow` "PREPARE"; no `h1` in compact console |
| SR-CAL-32 | A11y (live/focus) | P3 | main + UI3 | No console announcement for "sold / next team"; operator offline state has no `role=status`; bid live region echoes the clerk's own typing |
| SR-CAL-33 | CSS hygiene | P3 | main + UI3 (UI3 orphaned `.demo-reset`) | Dead selectors and a dead `num` prop |
| SR-CAL-34 | Settlement | P3 | main + UI3 | Jargon is the headline, plain words are the footnote; "Mark paid" hides the amount it will record |
| SR-CAL-35 | Results | P3 | main + UI3 | Inputs enabled while Save is disabled until COMPLETED |
| SR-CAL-36 | Rules / Event status | P3 | main + UI3 | "Mark ready" / "Return to setup" live at the bottom of the rules aside, disconnected from step 5 and the console |
| SR-CAL-37 | Console vs room | P3 | Hypothesis | Clerk cannot see which public flags are on (what the room actually sees) |
| SR-CAL-38 | Console | P3 | main + UI3 | Offline disables some console buttons but not others |

---

## 1. Public auction board (`app/auction.tsx`, route `/`)

### Purpose statement
The public board is the spectator's phone-and-laptop view of the same auction the clerk is running: what is on the block right now, the bid, who bought what, how big the pools are, and the full field. It is read-only, polls every 2 s, respects the event's public-visibility flags, and must survive a dropped connection without alarming the room. Its users are bidders and guests who glance at it between lots; nothing here should require reading.

### Inventory (order of appearance) — `auction.tsx:167`
| # | Control / section | Verdict |
|---|---|---|
| 1 | Masthead: Brand link (home), `Auction board` anchor (self-hiding, UI3-8), `TV mode` link, `Operator` link | Brand + anchor earn their place. `TV mode` is a clerk affordance, not a guest one — **disclose** (hide ≤700 px). `Operator` earns a footer slot, not a masthead slot. |
| 2 | Page head: course · dates eyebrow, `h1` calcutta name, `Demonstration event` pill, connection `role=status` | Primary. Good state handling (`offline`, `LIVE` → "Live updates"). |
| 3 | `Block`: status strip ("LIVE · ON THE BLOCK" / "AUCTION PAUSED" / …), `LOT 07 / 12`, flight eyebrow, team `h2`, players, CURRENT BID (`aria-live=polite`), CURRENT BIDDER (flag-gated), foot ("Team index" · "Live from the clubhouse") | Primary. Foot copy is state-blind (SR-CAL-28). |
| 4 | `Coming to the block` aside (4 rows, flag-gated), "Auction order may change." | Primary. |
| 5 | `Stats` (4–7 tiles; Net pool emphasised; remaining tone) | Primary. |
| 6 | `PoolCards` (per pool: net, gross, deduction, PROJECTED PAYOUTS / FINAL PURSES) | Primary for bidders; "PROJECTED" is jargon (SR-CAL-20). |
| 7 | `Fresh off the block` / RECENT SALES strip (4) | Primary. |
| 8 | `THE COMPLETE FIELD` board: flight `TabsList`, search, status `Choice` (raw constants), team cards | Primary; status labels raw (SR-CAL-23). |
| 9 | `House rules` (rules, description, buyback line) | Earns its place when populated; renders empty otherwise (SR-CAL-28). |
| 10 | Page footer: Brand + "Recordkeeping & calculations only…" | Fine. |
| 11 | `sold-toast` (`role=status`, 4.5 s) | Primary — good. |

### Findings
**SR-CAL-28 · P3 · Public board · Source-supported · main + UI3.**
- `auction.tsx:21` foot: `e.status === "PAUSED" ? "We will resume shortly." : "Live from the clubhouse"` — during SETUP, READY and COMPLETED the block foot says "Live from the clubhouse" while the strip above says "AUCTION SETUP" / "AUCTION COMPLETE".
- `auction.tsx:21` strip: `e.status === "LIVE" ? "LIVE · ON THE BLOCK"` regardless of `t` — with no team on the block the board says "ON THE BLOCK" above "The block is open."
- `auction.tsx:167` `<section className="rules-footer"><h2>House rules</h2><p>{e.rules}</p>` — unconditional; a new event shows a "House rules" heading over nothing.
- `auction.tsx:167` `<a href={eventPath('/tv', e.id)} title="TV mode">` — a guest on a phone gets a "TV mode" icon (`globals.css:12` collapses masthead links to icons ≤700 px with `font-size:0`, so it is an unexplained monitor icon).
*Experience:* copy contradicts state; empty heading; a mystery icon on phones.
*Recommendation:* make foot copy state-aware ("Bidding opens soon" / "Final results" / "Live from the clubhouse" only while LIVE); drop " · ON THE BLOCK" when `!t`; render `rules-footer` only when `e.rules || e.description || buyback line`; hide `TV mode` ≤700 px.
*Acceptance:* at SETUP/READY/COMPLETED no "Live" wording appears anywhere on the board; an event with blank rules has no "House rules" heading; at 390 px the masthead shows Brand + board anchor + Operator only.

**SR-CAL-23 (public part) · P3 · Source-supported.** `auction.tsx:167` status `Choice` items `["UPCOMING","ON_BLOCK","SOLD","UNSOLD","WITHDRAWN"].map(v => ({ label: v.replace("_", " ") }))` → "ON BLOCK", "UPCOMING" in caps, while the operator's own `statusNames` (`operator.tsx:33`) already has "On the block", "Upcoming". Share `statusNames` from `lib/model.ts`.

**SR-CAL-20 (public part) · P3.** `auction.tsx:34` `"PROJECTED PAYOUTS"` and the CSS class `projection-label`; bidders read "projected" as a forecast. "IF THE AUCTION ENDED NOW" or "PAYOUTS AT CURRENT POOL" says the same thing in a bidder's words. (D-CAL-6's "Place N — unsold team…" wording is unaffected.)

### Accessibility (public)
- Heading order: `h1` calcutta name → `h2` team → `h2` Coming to the block → `h2` pool names → `h2` Fresh off the block → `h2` board → `h3` team cards → `h2` House rules. **OK.** Empty/offline state has its own `h1`. OK.
- Landmarks: `main`, `header`, `nav`, `aside`, `section`, `footer`. **OK.**
- Form labels: search has `aria-label`; status select has `aria-label` via `Choice`; flight tabs `aria-label="Filter by flight"`. **OK.**
- Live regions: `big-bid` `aria-live="polite"` (`auction.tsx:21`), `sold-toast role="status"`, connection `role="status"`. **OK.** Note: every bid change is announced politely — acceptable for spectators.
- Colour-only meaning: none found; `remainingTone` pairs icon + word (`auction.tsx:23-28,32`); badges carry text; `.team-card.on-block` border + badge. **OK.**
- Touch targets: masthead links ≥24 px only ≤700 px (`globals.css:12`); at desktop widths they are 14 px text links with no min-height (see SR-CAL-30).
- Reduced motion: `globals.css:15` `@media(prefers-reduced-motion:reduce){*{animation:none!important;scroll-behavior:auto!important}}` — covers `sold-in`, `sold-settle`, `bid-pulse`. **OK.**

### Remove or merge (public)
- Merge `TV mode` and `Operator` into the page footer (the masthead keeps Brand + board anchor).
- Remove the "House rules" section when empty.
- Replace "PROJECTED PAYOUTS" wording; keep the data.

---

## 2. TV display (`app/tv/page.tsx` → `Auction tv`, route `/tv`)

### Purpose statement
The TV is the public board with the field, pools and filters stripped off, sized to be read from across a clubhouse: current team, bid, bidder, three upcoming, statistics, three recent sales. One screen, no scrolling (D-CAL-1), typography scaled by `--tv-unit` (S1). Its only "user" is the room; the clerk touches it twice (open, Full screen).

### Inventory — `auction.tsx:167` with `tv=true`
| # | Item | Verdict |
|---|---|---|
| 1 | Masthead: Brand, `← Auction board` link, `Full screen` button | Needed *before* fullscreen. Redundant *inside* fullscreen (SR-CAL-29). |
| 2 | Page head (course · dates, `h1`, Demo pill, connection) | Primary. |
| 3 | `Block` (foot hidden by `.tv .block-foot{display:none}` `globals.css:86`) | Primary. |
| 4 | `Coming to the block` (3) | Primary. |
| 5 | `Stats` | Primary. |
| 6 | `Fresh off the block` (3) | Primary. |
| 7 | `sold-toast` | Primary. |

### Findings
**SR-CAL-29 · P3 · TV · Source-supported · main + UI3.** The only `:fullscreen` rule in the codebase targets the operator console (`globals.css:21` `:fullscreen .console-active>.mast…{display:none}`); nothing hides `.tv .mast nav` once the TV window is fullscreen. The room sees "← Auction board" and a "Full screen" button for the whole evening. *Recommendation:* `:fullscreen .tv .mast nav{display:none}` (keep Brand); also hide the `connection` pill's "Connected" text on TV and show only the offline variant. *Acceptance:* at 1920×1080 fullscreen the TV shows no interactive chrome; on connection loss "Reconnecting…" appears at ≥ `--tv-label` size.

**Cross-ref SR-CAL-21.** The TV's back link says "Auction board", the operator header says "Public board", the public page's own anchor says "Auction board" and jumps to "THE COMPLETE FIELD / Auction board". Three uses of the phrase for two destinations.

### Accessibility (TV)
- Text scale: `globals.css:46-114` — labels `max(14px, 22·unit)`, body `max(17px, 30·unit)`, team `min(7.2cqw,16cqh,90·unit)`, bid `min(17cqw,32cqh,180·unit)`; at 1366×768 mirrored `unit≈0.71px` → labels ≈15.6 px. Accepted by S1; not re-litigated. Sub-700-px-high band `globals.css:116-150` retains one screen. **OK by decision.**
- Reduced motion: `bid-pulse` and `sold-settle` are cancelled by the global rule. **OK.**
- Live regions and headings: as the public board. **OK.**

### Remove or merge (TV)
- Hide masthead nav under `:fullscreen`; the Brand alone is enough chrome.

---

## 3. Operator console — shell (masthead, heading, event toolbar, prepare block, tab strip) (`app/operator.tsx:238-274`)

### Purpose statement
The shell exists to (a) tell the clerk which event they are operating and whether the app is connected, (b) get them to the one section they need next, and (c) keep three always-needed controls (Undo, compact, TV launch) within reach. It is used by a volunteer clerk who may have opened it for the first time an hour ago. Everything else — theme, demo, access, exports — is occasional.

### Inventory (non-compact, order of appearance)
| # | Control | Verdict |
|---|---|---|
| 1 | `header.mast` › `Brand` link → `/` (`:262` `<Brand eventId…/>`) | Redundant as a link in the operator; mis-click risk (SR-CAL-26). |
| 2 | `nav` › `Public board` (new tab) | Primary. |
| 3 | `Launch TV Display` (popup) | Primary before start; redundant after (step 5 already asked). |
| 4 | `Tools ▾` — Display & sharing, Help, Activity, Access*, Local Users*, Advanced settings, Load demo, Reset demo data* | Correct home for occasional items. `Display & sharing` also = step 4; `Advanced settings` also = disclosure inside Rules — 3 entry points each (**merge**, keep one plus the tooltip). |
| 5 | `Sign out` | Fine. |
| 6 | `mast-controls` › `Undo` (UI3) | Primary — correct to pin. |
| 7 | `Event theme` `Choice` (UI3 placement; UI2 had it in the toolbar) | **Disclose** — occasional setting shown as a nameless dropdown (SR-CAL-16). |
| 8 | `Compact view` switch + `Auto` button | Pinned by owner request (UI3-3). Two controls for one preference; see remove/merge. |
| 9 | `admin-heading`: "AUCTION OPERATIONS / The operator's desk", email, `Connected` / `Reconnecting…` | Hidden in compact (SR-CAL-01). The heading itself is decorative; the identity + connection are not. |
| 10 | `event-toolbar`: `Current event` picker (with " · Demo" suffix), `New event` | Hidden in compact (SR-CAL-01). |
| 11 | `prepare-block`: `h2.eyebrow PREPARE`, `Current phase` tag, "The five things to do…", five step cards (Step 2/3 status pills, help icons) | Primary in *prepare* phase; **disclose** afterwards (SR-CAL-14). |
| 12 | `op-nav-bar` › five tabs `Auction console · View and Edit Sales · Results · Settlement · Exports` (UI3-1) | Primary. |
| 13 | Compact variant: phase tag + tabs + `Setup steps` collapsible (`:274`) | Primary. |

### Findings
**SR-CAL-01 · P2 · Console (compact) · Source-supported · main (Batch K) + UI3.**
`refinements.css:57` `.compact.console-active .admin-heading,.compact.console-active .event-toolbar{display:none}`. The `admin-heading` holds the only operator connection indicator (`operator.tsx:273` `<span className={'connection ' + (offline ? 'offline' : '')}>{offline ? 'Reconnecting…' : 'Connected'}`) and the identity; the `event-toolbar` holds the only place the event name and its " · Demo" suffix are shown (`:273` `label: x.name + (x.demo ? ' · Demo' : '')`). Compact is automatic while LIVE/PAUSED (`:228`). The console toolbar shows `e.calcuttaName` **only when no team is on the block** (`:275` `current ? (() => {…"Current pool "…})() : e.calcuttaName`).
*Experience:* during the live auction the clerk cannot see "Reconnecting…" (only the toast on a failed save, `:128`), cannot see which event they are in, and cannot see that they are on the demo event. The masthead brand reads "THE CALCUTTA / EDWARDS COUNTY" for every event.
*Recommendation:* move the connection pill and a compact event line ("Spring Calcutta 2026 · Demo") into `console-toolbar` next to the status badge; keep the pool line. Make the Demo tag a warning-toned pill that never hides.
*Acceptance:* with compact on and a team on the block, the viewport shows event name, Demo tag (if demo) and connection state without scrolling; killing the server flips the pill to "Reconnecting…" within one poll.

**SR-CAL-02 · P2 · Console · Source-supported · UI3 regression (rule exists on main, controls moved in UI3).**
`globals.css:21` `:fullscreen .console-active>.mast,… {display:none}` predates UI3. UI3-3 moved Undo, Compact view and the theme picker into `.mast` (`operator.tsx:255-260, 273`). The console toolbar still offers `Full screen` (`:275` `<Button variant="outline" onClick={fullscreen}><Monitor /> Full screen`). Pressing it hides the masthead — and with it Undo — reintroducing the very gap Batch L §3 fixed ("Undo last action was unreachable during a LIVE auction"). Only the `U` key remains.
*Recommendation:* delete the `:fullscreen … >.mast` rule (the compact masthead is already 54 px), or remove `Full screen` from the console entirely: since Batch K the TV is a separate popup and the console has no reason to be fullscreen. Its tooltip already has to explain that it "does not open the TV display" — a sign the button is a trap.
*Acceptance:* in fullscreen console the Undo button is visible and clickable; no tooltip is needed to disambiguate Full screen from Launch TV Display because only one exists.

**SR-CAL-16 · P3 · Masthead · Source-supported · UI3 placement (owner-requested in UI3-3); duplication on main.**
`operator.tsx:262-273` renders, in one `<nav>`: Public board, Launch TV Display, Tools ▾, Sign out, then `headerControls` (`:255-260`): Undo, `<Choice label="Event theme"…>` (visible text is just the current preset name, e.g. "Classic ECGC" — no visible label, `aria-label` only), Compact view switch, and conditionally `Auto`. Eight controls of the same 14-px weight in a 54-px bar. The theme is also editable in Display & sharing (`sharing.tsx:17` `<ThemeSettings …/>`) where it needs an explicit `Save theme` (`theme-settings.tsx:28`), whereas the masthead `Choice` saves on change (`:257` `onChange={… act('theme_update'…)}`). Same setting, two interaction models.
*For the owner to weigh:* the pin was requested. If kept, give the select a visible "Theme" prefix or icon; otherwise move it into Tools ▾ ("Event theme › Classic ECGC") and let Display & sharing be the one place with the descriptions. Keep Undo and Compact pinned — they are the ones that matter at 9 pm.
*Acceptance:* masthead holds ≤5 controls at 1366 px; the theme is changeable from exactly one place plus one shortcut, both with the same save behaviour.

**SR-CAL-26 · P3 · Masthead · Source-supported · main + UI3.** `auction.tsx:15` `Brand` is `<a className="brand" href={eventPath('/', eventId)}>`; the operator uses it at `operator.tsx:262`. Clicking the logo mid-auction navigates the console tab to the public board. *Recommendation:* in the operator render `Brand` as a non-link (or link to `/admin`); the "Public board" link already opens the board in a new tab. *Acceptance:* no same-tab navigation away from `/admin` from the masthead.

**SR-CAL-14 · P3 · Prepare block · Source-supported · main + UI3.** `operator.tsx:274` non-compact branch always renders `{prepareBlock}` above the tab bar; `phase` (`:225`) is computed but only changes the tag text (`:238` `phase === 'prepare' && <span className="nav-current-tag">Current phase</span>`). After the auction (`COMPLETED` → `autoCompact` false, `:228`) the five 100-px cards return to the top of Results, Settlement and Exports. Batch K's requirement was to "collapse or de-emphasize PREPARE during active operation"; after the auction it is still dead weight. *Recommendation:* render the prepare block through the same `Collapsible` in every mode, open by default only while `phase === 'prepare'`. *Acceptance:* on Settlement after COMPLETED the tab strip is the first thing under the masthead; "Setup steps" expands the cards.

**SR-CAL-15 · P3 · Prepare cards · Source-supported · main + UI3 (step 5).** `operator.tsx:224` `buyersStatus = buyers.length ? 'complete' : 'not-started'` renders "Not started" on a step whose help says "Optional" (`:241`). Steps 1, 4 and 5 have no `status`; step 5 has `current: false` always (`:243`) and no LIVE/COMPLETED state, so it stays a plain "Start Auction" card while the auction is live (see SR-CAL-06). *Recommendation:* step 3 → "Optional" pill (grey) until a buyer exists; step 1 → complete when `minBid ≥ 100` and every existing pool ladder totals 100 %; step 5 → "Auction is live" / "Completed" and disabled. *Acceptance:* a fresh event shows 1 "Needs attention"/"Not started", 2 "Not started", 3 "Optional", 5 "Ready when 1–2 are done"; while LIVE step 5 is not clickable.

**SR-CAL-13 · P2 · Orientation · Source-supported · main + UI3 (compact makes it worse).** `TabsContent` values `teams`, `buyers`, `rules`, `sharing`, `help`, `activity`, `access` (`operator.tsx:276, 284, 286, 288, 289, 290`) have no `TabsTrigger` in `mainTabs` (`:245-251`). On any of them the strip shows no `aria-selected` tab. The section headings are slogans: "Your field, ready to go." (`:276`), "Every hammer, on record." (`:285`), "Settle up, with confidence." (`settlement.tsx:20`), "One link for your spectators." / "The clubhouse big screen." (`sharing.tsx:17`), "The audit trail" (`:289`). In compact mode with `Setup steps` collapsed there is no word "Teams" anywhere on the Teams tab.
*Experience:* a clerk who followed Tools ▾ › Activity sees a tab bar with nothing lit and a heading that does not say "Activity".
*Recommendation:* (1) headings name the section in the same words as the entry point ("Teams & flights", "Sales", "Settlement", "Display & sharing"); the slogans can become the eyebrow if wanted. (2) When `tab` is not one of the five strip values, render a small crumb at the left of `op-nav-bar` ("Setup › Teams & flights" / "Tools › Activity") so the strip is never blank. *Acceptance:* every operator section has an on-screen `h2` equal to its entry label; the tab bar always shows either a selected tab or a crumb.

**SR-CAL-25 · P3 · Empty desk · Source-supported · main + UI3.** `operator.tsx:274` `<div className="empty-state">…<p>Create an event to start with a clean field, or load the demonstration event.</p></div>` has no buttons; `New event` sits in the toolbar above and `Load demo` is inside Tools ▾ since UI3-3 (`:271`). *Recommendation:* add `New event` and `Load demo` buttons inside the empty state. *Acceptance:* a first-time owner can reach both from the empty state without opening a menu.

**SR-CAL-27 · P3 · Prepare 5 / Help · Source-supported · UI3-only.** `operator.tsx:101` `"You will need to sign in to calcutta.edcogolf.org/admin from a different device"` hard-codes the production host inside a component that also runs on localhost and any future host; `lib/sharing.ts:14` `shareLinks(origin…)` already derives the right origin. Also `sharing.tsx:19` Help › Before guests arrive still reads "Open the TV display and choose Full screen. … Verify the correct first team is on the block, then start the auction." — the step 5 dialog now does the first and asks the question; Help should say "Step 5 asks where the TV display opens". *Acceptance:* the dialog shows `new URL('/admin', window.location.origin)` (host only); the checklist mentions step 5.

**SR-CAL-33 · P3 · CSS hygiene · Source-supported.** Dead: `.demo-reset` (`globals.css:14, 19`; panel removed in UI3-3, no JSX), `.nav-help summary` (`globals.css:179`), `.nav-shortcut` and `.nav-group-list` (`refinements.css:8`), `.payout-editor` (`globals.css:14`), `.nav-num` rules (`globals.css:162`, `refinements.css:13-14`) — `NavItem` accepts `num` (`operator.tsx:40-41`) but no caller passes it (`:246-250`); `[data-slot=tabs-trigger][data-state=active]` selectors that Batch L §1 documents as never matching the wrapped tabs. Delete them; the file is already hard to read at 1–6 KB per line.

### Accessibility (shell)
- **SR-CAL-31 (part)**: `operator.tsx:274` compact branch `<div className="op-nav op-nav-compact" aria-label="Operator sections">` — `aria-label` on a generic `div` is prohibited (ARIA 1.2) and duplicates `TabsList aria-label="Operator sections"` (`:245`). Use `<nav>` in both branches and drop the TabsList label or make it "Sections". The masthead `<nav>` (`:262-273`) contains Undo, a select and a switch — not navigation; wrap `headerControls` in a `div role="group" aria-label="Console controls"` outside `nav`. `:238` `<h2 className="eyebrow">PREPARE</h2>` is a label styled as a heading; in compact console the `h1` is `display:none` so the page's first heading is this `h2` or the Block's team `h2`. Give the operator page a visually-hidden `h1` ("Operator console — Spring Calcutta") that survives compact.
- ControlTip (`help-tooltip.tsx:39-44`, Radix Tooltip) exposes content via `aria-describedby` and never takes focus. **OK.** HelpTip focus fix (UI3-7) **OK.**
- Tab strip focus/selection: Radix Tabs roving tabindex. **OK.**

### Remove or merge (shell)
- Merge `Full screen` (console) away — the TV popup made it a decoy (SR-CAL-02).
- Move the theme select out of the masthead (owner's call, SR-CAL-16).
- Collapse the prepare block outside the prepare phase (SR-CAL-14).
- `Compact view` switch + `Auto` → one three-position control ("Auto · On · Off") if the owner still wants manual override; otherwise a single switch whose label reads "Compact (auto)" when following status.
- Brand as non-link in the operator (SR-CAL-26).
- One entry point each for Display & sharing (step 4) and Advanced settings (the disclosure); keep the Tools item only if the owner wants a shortcut, but then not also a prepare card.

---

## 4. Operator — Prepare step 1: Event & rules (`app/rules.tsx:13-39`, `app/auction-controls.tsx:24-37`)

### Purpose statement
Step 1 is where the treasurer/owner sets the money rules once before the night: names, currency, minimum bid and increment, pool structure and house share, payout ladders, and (rarely) bidder tracking, quick-bid buttons, buybacks and public visibility. It is a "set and forget" form; on auction night it should be closed.

### Inventory (order) — `rules.tsx:38`
| # | Item | Verdict |
|---|---|---|
| 1 | `h2 Event & house rules`; 4 text fields; Auction date/time; Currency | Primary. |
| 2 | Public description; Public rules | Primary (feeds the public board). |
| 3 | `h3 Running the auction`: Minimum starting bid (D-CAL-2 validation), Minimum bid increment | Primary. |
| 4 | `h3 Pool & house share`: LIVE notice; Pool configuration; Deduction type + amount; two `fine` paragraphs | Primary; the two `fine` paragraphs say the same thing twice ("recalculates existing sales and entitlements"). |
| 5 | `details Advanced settings` (summary shows buyback mode): notice; `h3 Bidding preferences` (summary line, Track bidder switch, Opening bid buttons `AmountEditor`, Bid increment buttons `AmountEditor`, fine, Auto-advance switch); `h3 Buyback tools` (mode, notice, up to 5 fields); `h3 Public visibility` (10 switches) | Correctly disclosed (S1). |
| 6 | `Save event & rules` | Primary — single save for a ~30-field form. |
| 7 | Aside › `Flights` card (+ Flight, rows with edit) | Primary. |
| 8 | Aside › `Payout structures`: one `PayoutLadder` per flight **plus** `Combined / shared pool`, each with preset `Choice`, rows (percent input, projected, 3 icon buttons), total, `Add place`, `Save X payouts`, fine | See SR-CAL-11. |
| 9 | Aside › `Event status` card: "Current: SETUP", `Mark ready`, `Return to setup` | Misplaced (SR-CAL-36). |

### Findings
**SR-CAL-11 · P2 · Rules › Payout structures · Source-supported · main + UI3.** `rules.tsx:38` `[...data.flights.map(f => ({ id: f.id, name: f.name })), { id: 'combined', name: 'Combined / shared pool' }].map(p => <PayoutLadder …/>)` renders a full ladder editor for every flight *and* the combined pool, whatever `s.poolMode` is. `lib/model.ts:15-23` `compute()` already knows the real pools (`data.totals.pools`). With three flights in "One combined pool" mode the clerk sees four ladders, three of which do nothing; in "Separate" mode the "Combined / shared pool" ladder is a phantom whose own fine print admits "This ladder is saved for when this pool is used." (`auction-controls.tsx:36`).
*Recommendation:* render ladders for `data.totals.pools` only; put the inactive ones under a `details` "Ladders for pools not in use". *Acceptance:* in separate mode with 2 flights exactly 2 ladders are visible; switching to combined shows exactly 1.

**SR-CAL-10 · P2 · Rules + Results · Source-supported · main + UI3.** `rules.tsx:14` `draft` and `:16` `text` are component state; `Results` positions likewise (`rules.tsx:40` `useState`). `operator.tsx:286-287` mounts them inside `TabsContent` without `forceMount`; Radix Tabs unmounts inactive panels, so clicking any tab, prepare card or Tools item discards an unsaved draft with no prompt. There is no dirty indicator on `Save event & rules` and no `beforeunload`.
*Experience:* an owner edits the house share, opens Tools › Display & sharing to check the QR, comes back — the edit is gone, the button said nothing.
*Recommendation:* a visible "Unsaved changes" state on the Save button + an `AlertDialog` ("Leave without saving?") on tab change when `dirty.current`; or lift the draft to `AdminPanel` keyed by event. *Acceptance:* changing a field then clicking another tab prompts; Cancel keeps the draft.

**SR-CAL-36 · P3 · Event status · Source-supported · main + UI3.** `rules.tsx:38` aside › "Event status · Current: SETUP · Mark ready · Return to setup" is the only place READY exists; no prepare step mentions it, the public board shows "READY TO BEGIN" for it, and step 5 goes straight SETUP→LIVE. `Return to setup` is the only way to un-LIVE without completing, and it lives three sections deep in the rules aside. *Recommendation:* either drop READY (let "prepare complete" be READY implicitly) or make it step 5's first press ("Mark ready — the board says Ready to begin", then "Start"). Move `Return to setup` next to Pause in the console toolbar under a confirm. *Acceptance:* status changes are all reachable from the console toolbar / step 5; the rules aside has no status card.

**SR-CAL-22 · P3 · Money inputs · Source-supported · main + UI3.** `operator.tsx:275` `<div className="money-input"><span>$</span><Input …aria-label="Bid amount"/>` hard-codes `$` while `Currency` offers USD/CAD/GBP/EUR/AUD (`rules.tsx:38`). `auction-controls.tsx:25` `AmountEditor` prefixes the ISO code (`<span>{currency}</span>` → "USD"); `settlement.tsx:20` labels "Amount (USD)"; `rules.tsx:38` says "Fixed deduction (currency units)". *Recommendation:* one `currencySymbol(currency)` helper used by all four. *Acceptance:* a GBP event shows £ in bid entry, amount editors and settlement.

**SR-CAL-20 (rules part).** `rules.tsx:38` fine print: "recalculates existing sales and entitlements" ×2; `Results` `h2 "Results & calculated entitlements"`, button `Export entitlements` (`rules.tsx:40`). "Entitlement" is the ledger's word; the volunteer's word is "payout". Keep "entitlement" in CSV headers and code; say "Payouts owed" on screen.

### Accessibility (rules)
- Form labels: every input is wrapped by `Field` (`operator.tsx:31` `<label className="field">`) or has `aria-label`. Min-bid / deduction errors use `role="alert"` + `aria-describedby` (`rules.tsx:38`). **OK.**
- Heading order: `h2` → `h3` ×3 → (details) `h3` ×3; aside `h2` Flights / Payout structures (`h3` per pool) / Event status. **OK.**
- `details.advanced-settings` focus on request (`rules.tsx:22-29` `summary?.focus()`), `onInvalidCapture` opens it. **OK.**
- Touch targets: `.amount-editor-row button,.row-tools button{width:34px;min-height:36px}` (`refinements.css:5`) — above 24, below 44; acceptable for a setup screen.
- Colour-only: ladder total `valid`/`invalid` colour + "✓" / "· must equal 100%" text (`auction-controls.tsx:36`). **OK.**

### Remove or merge (rules)
- Show only real pools' ladders (SR-CAL-11).
- Merge the two "recalculates existing sales…" fine paragraphs into one sentence next to the pool selector.
- Move status controls out (SR-CAL-36).
- Currency-aware prefix instead of "$"/"USD"/"(currency units)" (SR-CAL-22).

---

## 5. Operator — Prepare step 2: Teams & flights (`app/operator.tsx:276-283`, `app/editors.tsx`)

### Purpose statement
Step 2 is data entry for the field: add or import teams, put them in flights, set the auction order. Before the night it is a spreadsheet job (import); during the night it is the place to return an unsold team or fix a name. It is used by the owner/treasurer beforehand and occasionally by the clerk mid-auction.

### Inventory (order) — `operator.tsx:276-283`
| # | Item | Verdict |
|---|---|---|
| 1 | `h2 Your field, ready to go.` · "12 teams · Drag rows or use arrows to set auction order." | Heading should say "Teams & flights" (SR-CAL-13). |
| 2 | Actions: `CSV` (export), `Bulk paste / CSV` (import), `Full team editor` (add) | All three mislabelled (SR-CAL-12). |
| 3 | `quick-add` form: Team name, Player 1, Player 2, Flight, `Add another` | Primary; label wrong on first use (SR-CAL-12). |
| 4 | Notice "Add a flight in Event & rules before adding teams." (link) | Good pattern — reuse elsewhere. |
| 5 | `board-tools`: search, flight filter, status filter, "Sort order:" + `name` `flight` `handicap` ghost buttons | Sort buttons are raw keys and act immediately (SR-CAL-12). |
| 6 | `bulk-bar` (N selected, move to flight, clear) | Correctly conditional. |
| 7 | Roster table: select, Order (grip icon + arrows), Team / players (edit button), Flight (`Choice` per row), Index, Status badge, `…` menu (7 items) | Menu state-blind (SR-CAL-24); grip icon decorative + native DnD only. |

### Findings
**SR-CAL-12 · P2 · Teams · Source-supported · main + UI3.**
- `operator.tsx:276` `<Button variant="outline" onClick={exportTeams}><Download /> CSV</Button><Button variant="outline" onClick={() => setModal({ type: 'import' })}>Bulk paste / CSV</Button>` — two adjacent buttons both say "CSV"; one downloads, one uploads.
- `:276` `<Button onClick={() => openTeam()} …><Plus /> Full team editor</Button>` — the primary button for adding a team does not say "Add".
- `:279` quick-add submit `<Plus /> Add another` — shown before any team exists.
- `:279` `['name','flight','handicap'].map(sort => <Button variant="ghost" …>{sort}</Button>)` — lower-case raw keys as labels; one click calls `act('team_reorder', …)` which **rewrites the auction order of the whole field** with no confirmation and a `quiet` toast; the column it sorts by is titled "Index" while the button says "handicap".
*Recommendation:* "Export CSV" / "Import teams…" / "Add team" (dialog) / quick-add "Add team"; replace the three sort buttons with one `Choice` "Reorder by… Name / Flight / Index" that runs through `ask()` ("Reorder the auction by name? Lots will be renumbered.") and a non-quiet toast. *Acceptance:* no two buttons on the tab share the word "CSV"; a reorder always confirms and names the effect.

**SR-CAL-24 · P3 · Teams row menu · Source-supported · main + UI3.** `operator.tsx:283` renders Edit, Duplicate, [Put on block — only conditional item], Return to queue, Mark unsold, Withdraw, Delete for every row. "Return to queue" on an UPCOMING team is a no-op; "Mark unsold" on a SOLD team is refused server-side after a confirm. *Recommendation:* show items by `t.status` (UPCOMING: Put on block · Mark unsold · Withdraw; UNSOLD: Return to queue · Put on block · Withdraw; SOLD: Edit · Duplicate only; WITHDRAWN: Return to queue); Delete last, destructive style. *Acceptance:* an UPCOMING row's menu has no "Return to queue".

**SR-CAL-21 (index).** "Index" (column, public), "Handicap / index" (editor `editors.tsx:29`), "handicap" (sort button), "Handicap" (CSV header `operator.tsx:217`), "Team index" (Block foot `auction.tsx:21`). Pick "Index" on screen; keep the CSV header.

### Accessibility (teams)
- Table: header row has `TableHead`s; icon buttons have `aria-label` ("Move X earlier/later", "Actions for X"). **OK.**
- Drag-and-drop (`:279` `draggable onDragStart…`) has the arrow alternative. **OK.** Grip icon has no meaning for touch — fine as decoration.
- Touch: `.order-cell button{width:25px;height:25px}` (`globals.css:14`) — passes 24 px minimum, fails 44 px comfort; on a tablet at the desk these are the reorder controls (SR-CAL-30).
- Import dialog: rows flag `aria-invalid` + `aria-describedby` issues (`editors.tsx:46`); button counts rows (D-CAL-3). **OK.**

### Remove or merge (teams)
- Merge "Full team editor" into "Add team"; keep quick-add as the fast path with the same verb.
- Sort buttons → one confirmed reorder control.
- State-aware row menu.

---

## 6. Operator — Prepare step 3: Buyers (`app/operator.tsx:284`)

### Purpose statement
Optional pre-registration of likely buyers so the Sold dialog offers them as chips. Most operators skip it (help text says so); buyers are created inside the Sold dialog.

### Inventory
`h2 Buyers & syndicates` · "Individuals, families, tables and groups. Contact details remain private." · `Add buyer` · card grid (icon, edit, `h2` name, group, contact, private notes, "N teams bought · $X") · empty state. All earn their place; `h2` per buyer card is a heading-level misuse (should be `h3`) but harmless.

### Findings
- Step card says "Not started" for this optional step (SR-CAL-15).
- Buyer card `<h2>{b.name}</h2>` (`:284`) inside `article` under the tab `h2`: **a11y** — use `h3` so the tab heading is the only `h2`.
- Cross-ref SR-CAL-21: "Buyers & syndicates" here, "Buyer / syndicate" in the Sold dialog, "Winning buyer" in Correct sale, "Purchaser" in ownership text, "Party"/"payee" in Results/Settlement.

### Remove or merge
Nothing to remove; rename to one term ("Buyer") everywhere on screen.

---

## 7. Operator — Prepare step 4: TV / Display Settings = Display & sharing (`app/sharing.tsx:12-18`, `app/theme-settings.tsx`)

### Purpose statement
Once per event: pick the theme the room will see, get the public link/QR onto tables, and get the TV window onto the screen. Used the afternoon before.

### Inventory
| # | Item | Verdict |
|---|---|---|
| 1 | `h2 Display & sharing` + slogan eyebrow "BRING THE ROOM ALONG" | OK (heading names the section — the one that does). |
| 2 | Local-link warning (conditional) | Required by KEEP list. |
| 3 | `ThemeSettings` radio cards + `Save theme` | Duplicated in masthead with instant save (SR-CAL-16). |
| 4 | PUBLIC BOARD card: link field, Open, Copy, QR card, Save QR, Print handout | Primary. |
| 5 | TV DISPLAY card: link field, Open TV View, Copy TV link, `TVInstructions`, fine | Primary before UI3; after step 5 the "Open TV View" is the third TV launcher (masthead, step 5 dialog, here, plus Help › Put the display on a TV). |

### Findings
- **SR-CAL-21 (TV names).** "Launch TV Display" (`operator.tsx:262`), "Open TV View" (`sharing.tsx:17`), "Launch TV Display" again in Help (`sharing.tsx:19`), "TV mode" (public nav), "TV / Display Settings" (step 4 label, `operator.tsx:242`), "Open TV/Display on this screen" and "Open on an external TV/Monitor" (`operator.tsx:100-104`). Choose "TV display" as the noun and "Open TV display" as the verb everywhere.
- Step 4's card label "TV / Display Settings" (Title Case) is the only prepare label in Title Case besides UI3's "Start Auction"; the destination heading is "Display & sharing". Use the destination's name on the card.

### Accessibility
QR `img` has alt; link inputs are `readOnly` with `aria-label`; radio group has `aria-describedby`. **OK.** Print stylesheet isolates `.print-share` (`refinements.css:9`). **OK.**

### Remove or merge
- One theme editor (SR-CAL-16).
- Keep "Open TV display" here and in step 5; drop the Help accordion's duplicate button (link to step 5 instead).

---

## 8. Operator — Prepare step 5: Start Auction (`app/operator.tsx:91-110, 179-192, 243`) — UI3-only

### Purpose statement
Ask once where the TV goes, then go LIVE and land the clerk on the console with the tab bar at the top. The right question at the right moment; the card must also *stop* being a start button once the auction has started.

### Findings
**SR-CAL-06 · P2 · Start / Restart · Source-supported · main (Restart) + UI3 (step 5).**
- `operator.tsx:275` `<Button disabled={busy} onClick={() => void startAuction()}>…{e.status === 'PAUSED' ? 'Resume auction' : e.status === 'COMPLETED' ? 'Restart auction' : 'Start auction'}` — from COMPLETED, one click with no `ask()` flips the public board from "Final auction summary" back to live and re-enables bidding; by contrast `Complete` (`:275`) confirms. Only the ControlTip explains.
- `:243` step 5 `{ num: 5, label: 'Start Auction', current: false, … onClick: () => setStartOpen(true) }` — rendered identically while LIVE/PAUSED/COMPLETED; choosing an option then calls `act('status', { status: 'LIVE' })` (`:183`) again, re-opening the TV popup or (the "here" path, `:187-188`) navigating the console window to `/tv` mid-auction.
*Recommendation:* `Restart` goes through `ask('Reopen the completed auction?', 'The public board returns to live bidding. Recorded sales are kept.')`; step 5 renders "Auction is live" (disabled) / "Auction completed — Restart from the console" and never calls `startAuction` when status ≠ SETUP/READY. *Acceptance:* from COMPLETED, restarting always shows a confirmation; while LIVE the step 5 card is inert.

**SR-CAL-27** (hard-coded host, stale Help) — see §3.

**Casing (SR-CAL-21).** "Start Auction" (`:243`) vs "Start auction" (`:275`) three lines apart.

### Accessibility
Dialog has title + description; the two choices are `button`s with `strong` + `span`; the "Most operators" tag is text. **OK.** After the "external" path `scrollToTabs()` (`:166-174`) respects reduced motion. **OK.**

---

## 9. Operator — Auction console tab (`app/operator.tsx:275`, `app/auction-controls.tsx:12-22`)

### Purpose statement
The one screen the clerk lives on for two hours: see the team on the block and the current bid, record bids in one keystroke or click, hammer it, name the buyer, move on — and recover from a mistake in under ten seconds. Everything on it competes with the Hammer for attention and must lose.

### Inventory (order) — all `operator.tsx:275`
| # | Item | Verdict |
|---|---|---|
| 1 | `console-toolbar`: status badge (`LIVE`), muted "Current pool $X · N sold" **or** event name, spacer, `Pause` / `Start·Resume·Restart`, `Full screen`, `Complete` | Status + pool + Pause/Resume: primary. `Full screen`: remove (SR-CAL-02). `Complete`: disclose (it is a once-per-night action sitting beside Pause; move to the `…` end of the toolbar or a Tools item with confirm). Missing here: event name, Demo tag, connection (SR-CAL-01). |
| 2 | `Block` (admin): strip, LOT, flight, team, players, CURRENT BID, CURRENT BIDDER (if tracking), foot hidden in console-active | Primary. |
| 3 | `bid-controls`: form (Bid amount `$` input, [Current bidder combobox], `Record bid`) | Primary; needs select-on-focus (SR-CAL-07). |
| 4 | `quick-bid-heading`: "Start bid" / "Increase bid" + explanatory span | Heading OK; span is explanation (SR-CAL-19). |
| 5 | `increments`: 4 quick amounts + `Correct bid` (ghost) | Amounts primary; Correct bid merge (SR-CAL-18). |
| 6 | `hammer-row`: `Hammer / sold` (gold, 54–64 px), `Mark unsold` (outline), `Skip for now` (ghost) | Primary trio; well weighted. Missing: next-team CTA when `!current` (SR-CAL-09). |
| 7 | Keyboard hint line | Primary (one line). |
| 8 | `Next up` aside: `h2`, "N in view", 8 rows × (lot, name, flight, ↑, ↓, `On block`, `Skip for now`), empty message | Reduce (SR-CAL-17). |
| 9 | `Stats` (admin: 7 tiles) · `PoolCards` (admin) | Below the fold on the console; fine as reference, but duplicates the toolbar's pool line. |
| 10 | `SoldDialog`: title, summary (TEAM / FINAL PRICE), Buyer / syndicate combobox, RECENT BUYERS chips (5), `Add buyer here`, stale notice, Cancel / `Confirm sale` | Primary; keyboard path incomplete (SR-CAL-08). |

### Auction-night speed (source walk-through)
- **Opening bid:** 1 click on a quick amount (`:275` `submitBid(false, amount)`), or `B` → type → Enter. Good.
- **Raise:** 1 click (`increase(amount)`), or `+` (minimum increment only; other increments have no key). Adequate.
- **Sale:** `S` or click Hammer → dialog opens with focus on the combobox (Radix default) → click a recent-buyer chip **or** type + pick → **click** `Confirm sale`. Minimum is 3 actions and the last must be a mouse click because `Confirm sale` is `<Button … onClick>` outside any `<form>` (`auction-controls.tsx:21`); Enter in the combobox selects an item, never confirms. With a new buyer: `Add buyer here` → type → `Add & select` → `Confirm sale` = 4 clicks + typing.
- **Undo:** `U` → AlertDialog (Cancel focused by Radix) → Tab/Enter, or click Undo → Confirm. Two actions, informative copy (UI3-5) — good in principle; see SR-CAL-03/04.
- **Compact fold at 1366×768:** Hammer row at 707 px (Batch L measurement, not re-measured here); `Stats`/`PoolCards` below the fold; queue scrolls inside 650 px (`globals.css:21`).

### Findings
**SR-CAL-03 · P2 · Undo naming · Source-supported · UI3-only.** `lib/audit.ts:12-22` maps `sale: 'Sale recorded'`, `finish: 'Finishing positions saved'`, `settlement_payment`, `settlement_disbursement`, but the server writes the *request action name* into `audit.action` (`route.ts:507` `insert("audit", { …, action, recordId, before… })`) and the client sends `act('sell', …)` (`auction-controls.tsx:21`), `act('results', …)` (`rules.tsx:40`), `act('settlement_record' | 'settlement_reverse', …)` (`settlement.tsx:20`), `act('sale_edit', …)` (`editors.tsx:51`), `act('team_import', …)` (`editors.tsx:46`), `act('payout_save', …)` (`auction-controls.tsx:36`), `local_user_*`. None of those keys exist in `actionNames`, so `describeUndo` falls back to `entry.action.replaceAll('_', ' ')` (`lib/audit.ts:46`): the confirmation after a mistaken hammer reads **"This will undo: sell — Reed / Foster · $450, recorded 8:12 PM by op@test."** `tests/ui3-reorder.mjs:66` asserts against a synthetic `action: 'sale'` row, so the test passes while production never emits `sale`. The Undo button's hover tip (`operator.tsx:256` `text={describeUndo(meta.audit, data)}`) shows the same raw word all evening.
*Recommendation:* key `actionNames` by the real action names (`sell`, `sale_edit`, `results`, `settlement_record`, `settlement_reverse`, `team_import`, `payout_save`, `local_user_create/…`); add a test that iterates `case "…"` labels in `route.ts` and fails on any missing key. *Acceptance:* after a sale the Undo tip reads "This will undo: Sale recorded — Reed / Foster · $450 …"; the new test enumerates every server action.

**SR-CAL-04 · P2 · Undo affordance · Source-supported · UI3 (button) + main (`U` key).** `operator.tsx:256` `disabled={busy || offline}` — not disabled when `lastUndoable(meta.audit)` is null; clicking opens a dialog whose description is "There is no recorded action to undo yet." with a live `Confirm` button that posts `undo` and gets a server error toast ("There is no action to undo.", `route.ts:464`). The two callers pass different follow-on sentences for the same action: `:206` (`U`) `'The correction remains in the audit trail.'` vs `:256` (button) `'Other operator changes are protected by a version check.'` — the latter is jargon (SR-CAL-20).
*Recommendation:* `disabled={busy || offline || !lastUndoable(meta.audit)}` with the tip explaining why; one sentence for both paths ("This stays in the audit trail."); confirm label "Undo" not "Confirm". *Acceptance:* on a fresh event the Undo button is disabled with a tip; `U` and the button open identical dialogs.

**SR-CAL-05 · P2 · Confirmations · Source-supported · main + UI3.** `operator.tsx:304` `{busy ? 'Saving…' : confirm?.label || 'Confirm'}` — only `skip` passes `label` (`:161` `{ label: 'Skip for now' }`). "Void this sale?", "Delete team?", "Withdraw team?", "Complete this auction?", "Revoke operator access?", "Reset demo data?", "Change the team on the block?" all end in `[Cancel] [Confirm]` in the default (primary) style. *Recommendation:* every `ask()` passes a verb label ("Void sale", "Delete team", "Complete auction", "Undo") and a `destructive` flag that switches `AlertDialogAction` to `variant="destructive"` (`globals.css:186` already themes it). *Acceptance:* no confirmation dialog's action button reads "Confirm".

**SR-CAL-07 · P2 · Bid field · Source-supported · main + UI3.** `operator.tsx:121` keeps the input equal to the server bid (`setBid(String(data.state.bid / 100))`); `:197` `bidInput.current?.focus()` on `B`; the `Input` at `:275` has no `onFocus` select. A clerk who presses `B` and types "1300" over a "1250" field records "12501300" → server rejects ("Bid must meet the minimum increment" or accepts a huge bid if it does meet it). *Recommendation:* `onFocus={ev => ev.target.select()}` and `select()` after `focus()` in the `B` handler; also `min={s.minBid/100}` instead of `min="0"`. *Acceptance:* `B`, type `1300`, Enter records $1,300.

**SR-CAL-08 · P2 · Sold dialog keyboard path + focus · Source-supported · main + UI3.** `auction-controls.tsx:21` `<Button className="hammer" disabled={…} onClick={async () => { if (await act('sell', …)) setSale(null); }}>` is not a submit; nothing handles Enter at dialog level. When the dialog was opened by the `S` key (`operator.tsx:198-200`), `document.activeElement` is `body`, so on close Radix returns focus to `body`; nothing refocuses the bid field or the quick-start buttons. Same for the Undo `AlertDialog` via `U`. *Recommendation:* wrap the dialog body in a `<form onSubmit>` so Enter confirms once a buyer is selected (guard while the combobox list is open, reusing `escapeClosesListFirst`'s pattern); `onCloseAutoFocus={() => bidInput.current?.focus()}` on both dialogs. *Acceptance:* `S` → `↓` `Enter` (pick recent buyer) → `Enter` confirms; after close, focus is in the bid field with the next team on the block.

**SR-CAL-09 · P2 · No next-team CTA · Source-supported · main + UI3.** With `autoAdvance` off, or after `Mark unsold`/`Skip for now` on the last-but-one team, or after Undo of a `block` action (`route.ts:462+` resets `teamId: null`), `current` is undefined: the Block shows "The block is open." (`auction.tsx:21`), every bid control and the Hammer are `disabled` (`:275` `!current`), and the only affordance is the 32-px `On block` button in each queue row. *Recommendation:* when `e.status === 'LIVE' && !current && next.length`, replace the disabled Hammer with a primary "Put Reed / Foster on the block" button (`act('block', { id: next[0].id })`) and give it the `S` key. *Acceptance:* with auto-advance off, a sale → one click/keystroke → next team is on the block.

**SR-CAL-17 · P3 · Next up · Source-supported · main + UI3.** `:275` each of up to 8 rows renders ↑, ↓, `On block`, `Skip for now` (`.queue-actions`), i.e. up to 32 buttons in the aside — equal weight, `On block` no more prominent than a reorder arrow. The empty state says "Return unsold teams from the Teams tab." (`:275`) while in compact mode "Teams" is hidden behind `Setup steps`. *Recommendation:* `On block` as the row's only visible button; ↑/↓/Skip in a `…` menu (the roster already has this pattern) or shown on row hover/focus-within; make the empty-state sentence a `notice-link` (`:279` pattern) that opens the Teams tab. *Acceptance:* ≤ 2 visible controls per queue row; empty-queue message is a link.

**SR-CAL-18 · P3 · Correct bid · Source-supported · main + UI3.** `:275` `<Button variant="ghost" disabled={busy || !current} onClick={() => ask('Correct the current bid?', …, 'bid', {…correction:true})}>Correct bid</Button>` sits in the increments row and differs from `Record bid` only by `correction:true` (server: `route.ts:366-367` allows lowering). `Record bid` is disabled when not LIVE; `Correct bid` is not. *Recommendation:* one `Record bid`; when `amount < data.state.bid` (or below increment) the client routes through `ask('Lower the bid to $X?', …, correction:true)`. Same disabled conditions. *Acceptance:* the increments row contains only amounts; entering a lower amount asks to confirm the correction.

**SR-CAL-19 · P3 · Repeated disclaimers / explanatory captions · Source-supported.** "No money is processed/moved" appears at `operator.tsx:305` (footer), `:285` (sales notice), `rules.tsx:40` (results notice), `settlement.tsx:20` (page subtitle, overview notice, dialog description), `exports.tsx:11` (print summary). `:275` `quick-bid-heading` span "One click adds to the current bid" / "One click records the opening amount". *Recommendation:* the footer says it once; section notices keep only the *specific* rule (e.g. "Buyback consideration is private and never enters the pool"); drop the quick-bid sub-captions (the buttons say "+$25"). *Acceptance:* grep for "money is" returns one on-screen string.

**SR-CAL-38 · P3 · Offline consistency · Source-supported.** `:275` `Record bid`, quick amounts, `Hammer / sold` and (`:256`) `Undo` carry `disabled={… offline …}`; `Pause`, `Complete`, `Mark unsold`, `Skip for now`, `On block`, `Correct bid` and every table action do not; `act()` (`:127-129`) toasts instead. *Recommendation:* one `disabledWhileOffline = busy || offline` applied uniformly, plus the connection pill from SR-CAL-01. *Acceptance:* with the server down, every mutating control on the console is disabled and the pill says why.

**SR-CAL-37 · P3 · Console vs room · Hypothesis.** The clerk's Block always shows bid and bidder (`auction.tsx:21` `(admin || s.showBid)`), the public respects `showBid`/`showBuyer`/`showSalePrice` (`lib/model.ts:12` flags). Nothing on the console says which of those the room can see. *Check:* set `showBid` off in Advanced › Public visibility, run the console, and watch whether a clerk narrating "as you can see on the board…" is wrong. *Recommendation:* a muted "Room sees: bid · buyer · pools" line in the toolbar (or "Room sees: no prices"). *Acceptance:* toggling a public flag changes that line within one poll.

### Accessibility (console)
- Heading order in compact console: `h1` hidden (`refinements.css:57`) → first heading is `h2.eyebrow` "PREPARE" (collapsed) or Block `h2` (team name) → `h2` Next up → `h3` per queue row. Add a visually-hidden `h1` (SR-CAL-31).
- Landmarks: `main`, `header`, `nav`(masthead), `nav`/`div`(tabs), `section.bid-controls`, `aside.console-queue`. **Mostly OK**; the compact `div aria-label` is the defect (SR-CAL-31).
- Form labels: Bid amount (`Field` + `aria-label`), Current bidder (`Field` + combobox `aria-label`), all icon buttons labelled. **OK.**
- **SR-CAL-31 (Sold dialog):** `auction-controls.tsx:12` `BuyerPicker({… label = 'Final purchaser' })` → `ComboboxInput aria-label={label}`; the dialog renders it inside `<Field label="Buyer / syndicate">` (`:21`) without passing `label`, so the accessible name is "Final purchaser" while the visible label is "Buyer / syndicate" (WCAG 2.5.3 label-in-name). Pass `label="Buyer / syndicate"` or drop the default.
- Focus after Sold/Undo: not managed (SR-CAL-08). Focus is trapped correctly inside both Radix dialogs; Escape order handled (`auction-controls.tsx:19-20`, Batch G). **OK.**
- **SR-CAL-32 · P3 · Live regions.** `auction.tsx:21` `big-bid aria-live="polite"` in admin mode announces every bid the clerk just typed. There is no announcement for "Sold to X" or "Now on the block: Y" beyond the sonner toast (`operator.tsx:143` `toast.success(options.message || 'Saved')`; sonner renders an `aria-live` region — polite). The operator connection span (`:273`) lacks `role="status"` (the public one has it, `auction.tsx:167`). *Recommendation:* one `aria-live="polite"` region in the console that receives "Sold — Reed / Foster to J. Smith, $450. Now on the block: Lot 08 Diaz / Lee." and "Reconnecting…"; remove `aria-live` from the admin `big-bid`.
- Colour-only: status badge `LIVE`/`PAUSED` text + colour; Hammer gold + text; `.badge.sold/unsold/withdrawn` all carry text. **OK.**
- Touch targets (`SR-CAL-30`): queue icon buttons `min-height:35px` (`globals.css:14`), hammer 54 px, quick amounts 46 px (`refinements.css:5`). **OK** at the desk; see §13 for the failures.
- Reduced motion: `scrollToTabs` checks `prefers-reduced-motion` (`:170`); global animation kill. **OK.**

### Remove or merge (console)
- Remove `Full screen` (SR-CAL-02) and move `Complete` to the toolbar's end under a `…` (once-per-night).
- Merge `Correct bid` into `Record bid` (SR-CAL-18).
- Collapse queue row controls to `On block` + menu (SR-CAL-17).
- Replace the disabled Hammer with a next-team CTA when nothing is on the block (SR-CAL-09).
- Drop the two quick-bid sub-captions (SR-CAL-19).

---

## 10. Operator — View and Edit Sales (`app/operator.tsx:285`, `app/editors.tsx:51-54`)

### Purpose statement
The ledger of hammers: find a sale, fix a wrong price or buyer, reopen (team back to queue) or void (team unsold). Used by the clerk within minutes of a mistake and by the treasurer afterwards. It must make the money consequence of each correction obvious.

### Inventory
| # | Item | Verdict |
|---|---|---|
| 1 | `h2 Every hammer, on record.` · "Corrections recalculate the pool. Buybacks only change ownership." · `Export auction records` | Heading → "Sales" (SR-CAL-13). Export duplicates Exports › Auction Results CSV (CAL-P3-001 territory; not repeated). |
| 2 | Table: Team (+ timestamp), Buyer, Sale price, Ownership / Suggested calculation, Status, Actions (`Correct`, [`Buyback`], `…` Reopen / Void) | Ownership column noise when buybacks Off (SR-CAL-23); Status raw. |
| 3 | Notice: "The pool uses original active sale prices only. No buyback consideration is added. This application does not process payments." | Disclaimer #3 (SR-CAL-19). |
| 4 | Correct sale dialog (`editors.tsx:51`): Sale price, Winning buyer (`Choice`), Correction notes, notice, `Save correction` | Buyer picker differs from the Sold dialog's combobox. |

### Findings
**SR-CAL-23 · P3 · Source-supported · main + UI3.**
- `operator.tsx:285` `<TableHead>{s.buybackMode === "calculate" ? "Suggested calculation" : "Ownership"}</TableHead>` and cell `<p>{o?.status || 'Purchaser 100%'}…</p>` render "Purchaser 100%" on every row when `buybackMode === 'off'` (the new-event default, `lib/model.ts:5`). A column that always says the same thing is clutter, and "Purchaser" is a third word for buyer.
- `:285` `<span className="badge">{x.status}</span>` → raw `ACTIVE` / `VOID` / `REOPENED` with no tone class (`globals.css:13` tones exist only for team statuses).
- `rules.tsx:40` Results rows `<small>{t.status}</small>` → raw `ON_BLOCK` with underscore.
- Public status filter (SR-CAL-23 public part above).
*Recommendation:* hide the ownership column when buybacks are Off; a shared `statusLabel()` in `lib/model.ts` ("Active", "Void", "Reopened", "On the block"…) with tone classes; use it in the three places.
*Acceptance:* a default event's Sales table has five columns; no on-screen string contains an underscore or is an all-caps enum other than the LIVE/PAUSED badge.

**Sold vs Correct picker (cross-ref SR-CAL-21).** Sold uses a searchable combobox with recent chips (`auction-controls.tsx:13-21`); Correct sale uses a plain `Choice` select of all buyers (`editors.tsx:52`). With 40 buyers the correction path is the slow one. Reuse `BuyerPicker`.

**Help wording drift.** Help › Corrections lists "Edit sale" (`sharing.tsx:19`) — the button says `Correct` and the tab says "View and Edit Sales". One verb.

### Accessibility
Table headers present; `…` trigger `aria-label="More sale actions for X"`. **OK.** Correction dialog fields wrapped in `Field`. **OK.**

### Remove or merge
- Ownership column when Off; the bottom notice (keep the buyback-specific sentence in the Buyback dialog only).
- `Export auction records` here vs Exports tab (leave to CAL-P3-001).

---

## 11. Operator — Results (`app/rules.tsx:40`)

### Purpose statement
After the tournament: type each team's finishing place per flight, save, see who is owed what. Used once, by the treasurer, possibly days later. It must refuse to let a tie or an incomplete auction produce numbers that look final.

### Inventory
`h2 Results & calculated entitlements` · subtitle · `Export entitlements` · notice (if not COMPLETED) · per-flight sections (`h2` flight name, rows: team name + raw status, place input) · `Save final positions` (disabled unless COMPLETED) · `Clear finishing positions` · `Calculated entitlements` card with notice + rows.

### Findings
**SR-CAL-35 · P3 · Source-supported · main + UI3.** `rules.tsx:40` inputs are enabled at any status; `<Button disabled={busy || data.event.status !== 'COMPLETED'}>Save final positions</Button>`. The notice above explains rather than prevents: a treasurer can type 12 places and only then find Save dead. *Recommendation:* either disable the inputs until COMPLETED with the notice carrying a "Complete the auction" link to the console, or (business decision — do not assume) allow saving positions before completion. *Acceptance:* the inputs and Save are enabled/disabled together.

**SR-CAL-20 (results).** "Results & calculated entitlements", "Export entitlements", "Calculated entitlements", and `r.party` rows — on screen say "Payouts owed"; keep "entitlement" in CSV headers.

**SR-CAL-23 (results).** raw `t.status` under each team name.

### Accessibility
`label htmlFor={'place-' + t.id}` + `aria-label` per input (`rules.tsx:40`). **OK.** Per-flight `h2` under the tab `h2` — should be `h3`. Withdrawn inputs disabled — text "WITHDRAWN" shown raw beside them.

### Remove or merge
- Drop the "Calculation / reporting only. No payments are made…" notice (disclaimer #4).
- Rename headings; nothing else to remove.

---

## 12. Operator — Settlement (`app/settlement.tsx`)

### Purpose statement
Bookkeeping after the night: who still owes for their purchases, who is still owed a payout, record each cash/check received or paid outside the app, reverse a wrong entry. Treasurer only. Its power is the separation of receipts from payouts and signed history; its readability problem is that it speaks accountant.

### Inventory
| # | Item | Verdict |
|---|---|---|
| 1 | Eyebrow "THE MONEY TRAIL" · `h2 Settle up, with confidence.` · subtitle (disclaimer #5) | Heading → "Settlement" (SR-CAL-13). |
| 2 | Overview: `AUCTION RECEIVABLES` big number "Remaining to collect", overpayments, "recorded / purchases"; `TOURNAMENT PAYABLES` likewise | Primary; label hierarchy inverted (SR-CAL-34). |
| 3 | Notice (buyback consideration; disclaimer #6) | Keep the buyback sentence only. |
| 4 | Tabs `Auction payments` / `Tournament payouts`, search, status `Choice` | Primary. |
| 5 | Per-account card: `h3` name, status badge, `dl` (due / recorded / balance), overpayment notice, `Mark paid` + `Record partial payment`, Accordion (statement rows, `h4` history, entries with `Reverse entry`) | Primary; button copy (SR-CAL-34). |
| 6 | Empty states (two variants) | Good. |
| 7 | Record/Reverse dialog: name, amount (max = balance), date/time, method, note, fine ("Do not enter card, banking…"), stale notice, Cancel / Confirm | Primary. |

### Findings
**SR-CAL-34 · P3 · Source-supported · main + UI3.** `settlement.tsx:20` the eyebrow `AUCTION RECEIVABLES` / `TOURNAMENT PAYABLES` is the 12-px letter-spaced headline and "Remaining to collect" / "Remaining to pay" is the subordinate line; the treasurer's words are the small ones. `Mark paid` records `account.balance` (`:17` `amount: paid ? String(account.balance / 100)`) but the button does not say how much. *Recommendation:* swap the roles ("Still to collect" as label, "receivables" nowhere on screen); `Mark paid · $1,250`; `Record partial payment` → `Record a payment…`. *Acceptance:* no on-screen "receivable/payable/disbursement"; the full-balance button shows the amount.

**SR-CAL-20 (settlement).** "Disbursements" (`h4`), "calculated entitlement", "Purchases owed" are fine; "Overpayment to review" fine.

### Accessibility
`dl/dt/dd` for totals; Accordion labelled; dialog title/description; amount `autoFocus`; stale notice `role="alert"`. **OK.** Badges `Paid`/`Overpaid` text + colour. **OK.**

### Remove or merge
- Subtitle and overview notice disclaimers (keep one buyback sentence).
- Merge the two per-card buttons into one `Record payment…` whose dialog defaults the amount to the balance (the dialog already has `max={balance}`); saves a button per card without losing "mark paid".

---

## 13. Operator — Exports, Tools › Activity / Access / Local Users / Help, Theme (`app/exports.tsx`, `operator.tsx:289-294`, `sharing.tsx:19`)

### Purpose statements
- **Exports:** take the records away (CSV, backup, print). Treasurer, once.
- **Activity:** who did what, when; the undo ledger. Owner, when something looks wrong.
- **Access / Local Users:** owner grants operator access (Google) or creates a local login. Owner, before the event.
- **Help:** the volunteer's checklist. Clerk, the afternoon before.

### Inventory
- Exports: `h2 Event exports`, `Print event summary`, 6–7 cards (icon, `h3`, description, `Download`), fine print (3 sentences), hidden `print-summary`. **All earn their place**; the fine print's "this pass does not add a restore/import workflow" (`exports.tsx:11`) is an implementation note leaking to the UI — delete.
- Activity: `h2 The audit trail`, `Export recent audit`, table (Time, Operator, Action `replaceAll('_',' ')`, Correction), "Showing the latest 100 actions." — raw action keys ("team skip", "sell") appear here too; reuse `actionNames` from `lib/audit.ts` once SR-CAL-03 fixes it.
- Access: card, form, Owners (read-only, D-CAL-4), Operators + Revoke. "ChatGPT"/"Sites settings" strings are rewritten to Google wording at portable staging (`scripts/stage-portable.mjs:24-29`) — **not a production defect**; noted so it is not re-flagged.
- Local Users dialog: form (4 fields, rule "14–1024 characters…"), list, reset dialog. Fine.
- Help: 6 accordions; "Put the display on a TV" duplicates the TV launcher (§7); "Before guests arrive" stale vs step 5 (SR-CAL-27).

### Findings
- **SR-CAL-33** dead CSS; **SR-CAL-27** stale Help; Exports implementation-note sentence (fold into SR-CAL-19).

### Accessibility
Export cards: `h3` under `h2`. Activity table headers. Access form `Field`. Dialogs titled. **OK.**

### Remove or merge
- Help › "Put the display on a TV" button → link to step 5 / Display & sharing.
- Exports fine print → one sentence.

---

## 14. Cross-surface consistency (SR-CAL-21) — glossary of drift

| Concept | Names found (file:line) | Recommended single term |
|---|---|---|
| The buyer | "Buyers & syndicates" (`operator.tsx:284`), "Buyer / syndicate" + `aria-label` "Final purchaser" (`auction-controls.tsx:12,21`), "Winning buyer" (`editors.tsx:52`), "Current bidder" (`operator.tsx:275`), "Purchaser 100%" (`:285`), "Party"/"payee" (`rules.tsx:40`, `settlement.tsx:20`), public `sale.buyer` | **Buyer** (bidder only while tracking bids; "Payee" only in Settlement payouts) |
| The sale action | "Hammer / sold" (`:275`), "Bring down the hammer" + "Confirm sale" (`auction-controls.tsx:21`), "S opens Sold" (`sharing.tsx:19`), toast "Sold — purchaser recorded" | **Sold** (button "Sold", dialog "Confirm sale", key "S = Sold") |
| Putting a team up | "On block" (`:275`), "Put on block" (`:283`), "Change the team on the block?" | **Put on the block** |
| Fixing a sale | "View and Edit Sales" (tab, UI3-1), "Correct" (`:285`), "Edit sale" (Help), "Correct sale" (dialog title `editors.tsx:27`) | **Correct** (tab "Sales" — owner-named in UI3-1; if kept, at least Help and dialog should say "Edit") |
| TV | see §7 | **TV display** / "Open TV display" |
| Public page | "Public board" (`:262`), "Auction board" anchor + TV back link + board `h2` (`auction.tsx:167`) | **Public board** for the page; "Full field" for the section |
| Index | see §5 | **Index** |
| Team status | `statusNames` labels (`:33`), badge `replace('_',' ')` (`:283`, `auction.tsx:167`), raw (`rules.tsx:40`), strip "LIVE · ON THE BLOCK" | one `statusLabel()` |
| Event status | badge `LIVE/PAUSED/COMPLETED/READY/SETUP` (`:275`), Rules "Current: SETUP", public strip "READY TO BEGIN / AUCTION SETUP / AUCTION COMPLETE" | keep uppercase words on the badge; friendly words elsewhere |
| Casing | "Start Auction", "TV / Display Settings", "View and Edit Sales" (UI3) vs "Event & rules", "Auction console", "Start auction" | sentence case everywhere |
| Money | `money()` everywhere on screen (drops cents when whole) — **consistent**; CSV uses `toFixed(2)` — correct for exports | — |
| Lot numbers | "LOT 07 / 12" (block), "07" (queue), "7" (roster Order), "Auction order (first team is 1)" (editor) | fine; keep |

---

## 15. Accessibility checks — consolidated (SR-CAL-30/31/32)

| Check | Public | TV | Operator shell | Console | Rules/Teams/Sales/Results/Settlement/Exports |
|---|---|---|---|---|---|
| Heading order | OK | OK | `h2.eyebrow` "PREPARE" as label; no `h1` in compact (`refinements.css:57`) — **SR-CAL-31** | Block `h2` first in compact | Buyer cards `h2` (`:284`), Results flight `h2` (`rules.tsx:40`) should be `h3` |
| Landmarks | OK | OK | `aria-label` on `div` (`:274`); non-nav controls in `<nav>` (`:262-273`) — **SR-CAL-31** | `section`/`aside` OK | OK |
| Form labels | OK | — | `Choice` theme `aria-label` only (visible name missing) | Buyer picker name ≠ label (`auction-controls.tsx:12,21`) — **SR-CAL-31** | OK (`Field`, `htmlFor`, `role=alert`) |
| Focus after Sold / Undo | — | — | — | Not managed when opened by key; Enter cannot confirm — **SR-CAL-08** | Dialog focus return OK |
| Live regions | `big-bid`, `sold-toast`, `connection` OK | OK | Operator `connection` lacks `role=status` (`:273`) — **SR-CAL-32** | No "sold / next team" region; admin `big-bid` echoes typing — **SR-CAL-32** | Stale notices `role=alert` OK |
| Colour-only | none (tone = icon+word) | none | readiness pills icon+word | badges text | ladder total text; import rows text |
| Touch targets | masthead links no min-height >700 px | mast button OK | Tools trigger `padding:0` (`refinements.css:1`); prepare help icon 13 px + 3 px pad (`refinements.css:20-21`); `.compact-auto` 30 px (`:101`) — **SR-CAL-30** | queue icons 35 px OK | roster arrows 25 px (`globals.css:14`); ladder/amount icons 34×36 — **SR-CAL-30** |
| Reduced motion | global kill (`globals.css:15`) OK | OK | `scrollToTabs` OK (`:170`) | OK | `.prepare-step-action`/`.start-choice` `transition` not covered (minor) |
| TV text scale | — | S1 tokens (`globals.css:46-150`) accepted | — | — | — |

**SR-CAL-30 · P2 · Touch targets · Source-supported · main + UI3.** Named above; *Acceptance:* every interactive element ≥24×24 CSS px (WCAG 2.5.8) and console-night controls ≥44 px; measured via `getBoundingClientRect` in `tests/ui3-browser.mjs`.

**SR-CAL-31 · P2 · Names/ARIA · Source-supported.** Items above; *Acceptance:* axe `aria-allowed-attr`/`landmark-*`/`label-content-name-mismatch` clean on `/admin` in both compact states.

---

## 16. What to remove or merge — per surface, one screen each

- **Public:** masthead `TV mode` + `Operator` → footer; empty `House rules` → hidden; "PROJECTED" → plain wording.
- **TV:** hide `.mast nav` in fullscreen.
- **Shell:** drop console `Full screen`; theme select out of the masthead (owner's call); prepare block collapsible in every phase; Brand not a link; one entry point each for Display & sharing and Advanced settings; `Compact` + `Auto` → one control.
- **Console:** `Correct bid` → into `Record bid`; queue rows → `On block` + menu; `Complete` → end of toolbar; two quick-bid captions gone; next-team CTA replaces the disabled Hammer.
- **Rules:** ladders for real pools only; one "recalculates…" sentence; status card out.
- **Teams:** "CSV"/"Bulk paste / CSV"/"Full team editor"/"Add another" renamed; sort buttons → one confirmed reorder; state-aware row menu.
- **Sales:** ownership column when Off; bottom disclaimer; `Choice` → `BuyerPicker`.
- **Results/Settlement/Exports:** disclaimers ×4 → footer only; jargon labels demoted; `Mark paid $X` + `Record a payment…`; Exports implementation note.
- **Help:** duplicate TV launcher → link; checklist updated for step 5.
- **CSS:** dead selectors (SR-CAL-33).

---

## 17. Top 8, in order of night-of impact

1. **SR-CAL-03** Undo names a sale as "sell" (UI3-only; the test asserts a name the server never writes).
2. **SR-CAL-01** Compact console hides the connection state, event name and Demo tag exactly while LIVE (main + UI3).
3. **SR-CAL-02** Console *Full screen* hides the masthead — Undo gone again (UI3 regression of its own fix).
4. **SR-CAL-08 + 07** Sale confirmation needs a mouse; bid field appends instead of replacing.
5. **SR-CAL-06** Restarting a completed auction (and step 5 while LIVE) has no confirmation.
6. **SR-CAL-05** Every destructive confirmation says "Confirm".
7. **SR-CAL-13** Seven sections have no tab and slogan headings; compact mode leaves the clerk unlabelled.
8. **SR-CAL-11 + 10** Phantom payout ladders; unsaved rules/results drafts vanish on tab switch.
