# Product coverage matrix

Original audit 2026-09-14 UTC, `dfab14906c04b5a6d99ffffbfba4249883750eae`; updated for A `4dc2900`, B `3d00923`, C `4da7b9b` and D `a76e57f`. **BA** means [Batch A](BATCH-A.md); **BB** means [Batch B](BATCH-B.md); **BC** means [Batch C](BATCH-C.md); **BD** means [Batch D](BATCH-D.md). This reports actual coverage, not every screen/state/device/input combination.

**E2** means the incremental audit of 2026-09-15 at `d992d1c` ([PRODUCT-AUDIT.md § Incremental audit E2](PRODUCT-AUDIT.md#incremental-audit-e2--2026-09-15), evidence in `audit-e2-evidence/`): headless Chromium + axe on a fresh local store, emulated touch/zoom/reduced-motion, and local role emulation by swapping `ADMIN_EMAILS`. E2 rows below say what moved from P/L to H or F; hosted and physical gates are unchanged.

**H** = tested and healthy; **F** = tested with findings; **P** = partially covered; **L** = not testable locally; **N/A** = not applicable. H applies only to the evidence named in the row. Detailed outcomes use PASS/FAIL/BLOCKED/UNVERIFIED in [VALIDATION.md](VALIDATION.md). A/R/X/M/W/B evidence keys are defined in [CURRENT-STATE.md](archive/CURRENT-STATE-2026-09-19-pre-readoption.md).

## Operator surfaces

| Surface | Coverage | Exercised | Findings or remaining scope |
|---|---|---|---|
| Setup / event choice | H (local) | BA context; BD creation/demo sequential/concurrent retries, rollback, browser create/history/reload and newest fallback | CAL-P1-001 and CAL-P2-002 fixed locally. Distinct real-user settings conflicts remain hosted work. |
| Teams | H (local) | A/X/W CRUD/group/order/status; BD quoted import formats, 100-team mapping, malformed atomic rejection and preview/save | CAL-P2-001 fixed locally. Physical touch reorder not tested. |
| Buyers | H | A/W create/edit, purchaser correction; B inline Sold creation and selection | Text-input shortcut suppression observed. Large buyer-list search performance not quantified. |
| Rules | H | A/R/M pool/deduction/mode rules; B ladder and opening-button edits | All currency formats and all visual toggle combinations not exhaustively tested. |
| Auction console | H | A/R/W/B start/choose/bid/increment/correction/sale/next/pause/undo | Same mock identity across tabs; keyboard and pointer paths passed. |
| Sales | H | A/W price/purchaser edits, void/reopen/undo; B stale Sold/double confirm/public update | All correction variants exercised through API; not every modal repeated on each device. |
| Buybacks | H | R Off/Calculation/Track independently; A/M/X 50/50, partial, deadline, declined, odd cents; W $625 example | Calculated suggestion is information; actual private payments not processed. |
| Results | H (local) / F | A/R/X unique positions, awards, duplicate rejection, ownership-adjusted entitlement; E2 768×1024 keyboard entry with duplicate-place rejection and save | Tablet keyboard journey now completed. E2 CAL-P3-006: an UNSOLD team can be given a place and the empty states then contradict; policy pending. Ties external. |
| Settlement | H (local) | R/X/W/BB partial/full receipts, signed reversals, payouts, correction/undo; BB mixed debt/credit summaries and Mark paid draft | CAL-P1-005 fixed locally for receipts and payouts. Every history dialog not exercised by touch. |
| Exports | H (CSV/JSON) / H (Chromium print) / L (physical) | BB nine actual CSV files independently parsed/reconciled, backup parsed; E2 all seven downloads via the UI, print-media isolation verified, Letter PDFs: summary 2 pages (8 sales) and 3 pages (30 sales), QR handout 1 page | CAL-P1-003 fixed locally; physical printer and spreadsheet UI import unverified; toasts are not excluded from print (E2 observation); CAL-P3-001 remains optional debt. |
| Sharing | H / L | R decoded QR/local URL; B copy/QR/TV instructions; BA related public/TV/operator navigation | CAL-P1-001 fixed locally. Internet sharing L. |
| Access | H / F / L | BA forced audit/grant/revoke failures, concurrent retry, local non-owner and revoked-session checks; E2 UI grant/revoke, plus local role emulation (signed-in non-operator → access screen and 403s; granted non-owner operator → desk without Access tab, `operator_add/remove` rejected, exports allowed) | CAL-P1-002 fixed locally; E2 CAL-P3-005 owner-email and duplicate-grant feedback. Distinct hosted Google sessions remain L. |
| Help / Auction Night | H | B before/running/after guide, corrections, keyboard, TV instructions at tablet | Physical projector setup not performed. |

## Public states and interactions

| Surface/state | Coverage | Evidence |
|---|---|---|
| Live auction | H | Normal team/bid/sale/pool updates converge; BA context and BC full-price containment/contrast fixed locally. |
| Pre-auction / ready | H | B setup/open-block placeholders; A readiness/start validation. |
| Paused | H | B public and TV say AUCTION PAUSED and retain team/bid; A rejects bids. |
| Completed auction | H / F | B final-summary/purse text and X final data; BC seven-metric TV layout; E2 completed public/TV at 320/390/1280/1366/1920 pass. Unclaimed place policy still unresolved and now has an observed consequence (CAL-P3-006). |
| Reconnect | H | B safe last state + Reconnecting during stopped server; automatic Connected after restart. |
| Empty/new event | H | B zero teams/pools, no queue/first-sale placeholders, no NaN. Loading joining-state also observed. |
| Large event | H (local) | X/B 100 teams, four flights, 18 sales, filters and payloads; BC 12-team stress fixture; E2 100-team/six-flight/30-sale fixture rerun on public 320/390/1280 and TV 1366/1920 with containment, sixth-flight filter (17 cards) and search-to-one pass. |
| Flight filters | H | B four-flight strip intentionally scrolls; Third Flight returns 25 of 100. BC at 320px retains flight/search interaction and a single matching card. |
| Team search | H | B search Audit Team 024 returns one with flight filter. Empty matches explained. |
| Public settings/privacy | H (local) | A/R/X server-hidden values, private sentinels, only public team notes; all cosmetic combinations P. |
| Anonymous read-only | H / L | A/R/X local public access + denied admin/exports; hosted dispatcher/audience L. |
| Mutation tools | N/A | Read-only public board; no spectator bid/payment operation exists. |

## TV states

| Surface/state | Coverage | Evidence |
|---|---|---|
| Normal live 1920×1080 | H | Current team, amount, flight, pots, three upcoming/recent teams fit one viewport. |
| Paused | H | BC short/long current names plus all-long queue/recent fit both TV viewports; paused wording and full bid retained. |
| Completed | H | BC all seven metrics fit in one row without overlap at both TV viewports. |
| Reconnect | H | Safe state and reconnect status survive server interruption; automatic recovery. |
| Long names | H | BC 66-character active, all three queue and recent names fit both TV viewports with no text-container spill. |
| Many flights | H | Four flights inspected originally; E2 six flights: public strip shows seven tabs and scrolls (755 px in 351 px at phone), TV/public pools render. TV does not expose flight filtering by design. |
| Large amounts | H | BC full $1,000,000 bid with long name; final stress pool $8,000,000, with all values contained. |
| Scaled/browser scenario | H / F | BC 1366×768 and E2 1280×720, 1440×900, 1536×864, 1280×1024 pass. E2 CAL-P2-005: 1024×768, 1093×614 (1366 at 125 % OS scale), 1099×618 and 1100×619 spill statistics and lose one-screen layout. |
| Admin launch and instructions | H | B event-specific Launch TV link and guide; BA public/TV/operator round trip also preserves event. |
| Fullscreen / physical room | L | In-app attempt did not prove fullscreenElement; no physical TV/projector, HDMI/overscan or distance test. |

## Device and input coverage

| Class | Exact CSS viewport | Coverage | Notes |
|---|---|---|---|
| Narrow mobile | 320×850 (BC), 320×850 (E2) | H (display) / F (header) | BC full long-name/price, statistics, search/filter and notification containment; E2 live/completed/empty/large containment pass. E2 CAL-P2-004 icon-less header links vanish ≤ 700 px. Actual phone input unverified. |
| Typical phone | 390×850 (BC), 390×844 (E2) | H (display) / F (header) | BC full price/statistics and sale notification fit; E2 public, operator console/teams/settlement/sharing containment pass, access-required screen renders. CAL-P2-004 applies. |
| Larger phone | 430×850 (BC), 430×932 (E2) | H (display) / F (header) | BC containment; E2 public containment pass. CAL-P2-004 applies. |
| Tablet portrait | 768×1024 | H (emulated touch) | BC shared block fits; E2 emulated-touch sale (increment, hammer, recent-buyer chip, confirm, undo), results keyboard entry, settlement, help/activity/buyers render. Physical touch/soft keyboard still unverified. |
| Tablet landscape | 1024×768 | H (operator) / F (TV) | BC shared block containment; E2 operator console and sales corrections pass; CAL-P2-005 applies to `/tv` at this size. Physical soft keyboard absent. |
| Laptop | 1280×720 | H | Main operator journeys and large public field; public vertical scroll expected. |
| Scaled laptop/TV | 1366×768 | H (viewport) | BC long/short live/paused and completed containment pass; physical fullscreen verification blocked. |
| Desktop / TV projector size | 1920×1080 | H (viewport) | BC long/short live/paused and completed pass. Physical television is not implied by viewport emulation. |
| Mouse / pointer | — | H | Complete setup and sale/correction, filters, sharing, settlement. No specialized drag gesture required in tested flow. |
| Keyboard only | — | H | After start, B/Enter/+/S/U, inline purchaser, confirm, undo; no shortcuts while text/notes/dialogs consume input. |
| Touch hardware | — | L | Tablet dimensions and target sizes observed with pointer; native tap gestures/soft keyboard not available. |
| Screen reader | — | P / F | Accessible tree, labels/status and focus inspected; E2 axe-core on public/TV/operator/settlement/exports/help: CAL-P2-007 contrast and CAL-P3-002 invalid `aria-controls`. NVDA/VoiceOver speech not tested. |
| 200% zoom / reduced motion | — | H (emulated) / F (TV) | E2 200 % zoom emulated as 640×360 and 960×540 CSS viewports: public and operator console pass, `/tv` at 960×540 fails (CAL-P2-005). Runtime `prefers-reduced-motion: reduce` disables the sold-toast animation. Real browser zoom not exercised. |
| Other engines | — | L | One in-app Chromium environment; no Safari/Firefox/device certification. |

## End-to-end journeys and failure coverage

| Journey | Coverage | Recorded result |
|---|---|---|
| Pre-auction to first bid | H | B event→flight→quick/imported teams→ladder/openings→start→one-click bid/increment; A/R additional pool/house/mode setup; E2 browser: New event dialog → flight → two quick-adds → Start → $100 opening bid at 1024×768. |
| Sale and purchaser creation | H / F | B keyboard sale with inline new purchaser, exact amount/team, next advance; E2 inline buyer from an empty buyer list, public board shows the sale. E2 CAL-P2-006: Escape with suggestions open discards the dialog. |
| Mistakes and queue exceptions | H | A/R/W wrong bid/buyer/price, sold/reopen/void/undo, separate skip/unsold/withdraw. |
| Finish through bookkeeping | H (local API) / P (devices) | A/R/W/BB completion, results, awards, receipts/payouts, corrections/undo and signed exports pass. BB summaries reconcile; not one uninterrupted all-browser or physical-print journey. |
| Four independent tabs | H | A/B operator, public, TV; stale B shown conflict; sale double click produces one record; public/TV converge after correction. |
| Duplicate stale sale API | H | A/R same request replay and changed revision sale denied; B stale confirmation disabled before submission. |
| Server stop/restart | H | B last state retained; warning prevents false save; full stored/derived data deep-equal after restart; viewers recover automatically. |
| Temporary API failure | H | Isolated server unavailable affects polling and attempted save; malformed body 400, stale 409 and invalid reference failure tested. |
| Refresh on live team / after sale | H | A/R/B persisted records on fresh reads, UI reload and public updates; BA event-selection reload and back/forward now retain context. |
| Failed access request | H | BA fault-injected grant/revoke/audit failures leave access unchanged; concurrent replay applies once. Original X failure retained as historical evidence. |
| Full recovery from backup | L | Backup read/contents verified; no implemented import/restore workflow to test. Not a required new feature in this pass. |
| Sustained high load / 500 teams | L | 100-team local sample only; no hosted load or maximum-capacity claim. |

See [VALIDATION.md](VALIDATION.md) for hosted-only gates and exact limitations. Untested paths remain visible here rather than being counted as passes.
