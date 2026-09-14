# Product coverage matrix

Original audit 2026-09-14 UTC, `dfab14906c04b5a6d99ffffbfba4249883750eae`; updated for A `4dc2900`, B `3d00923` and C `4da7b9b`. **BA** means [Batch A](BATCH-A.md); **BB** means [Batch B](BATCH-B.md); **BC** means [Batch C](BATCH-C.md). This reports actual coverage, not every screen/state/device/input combination.

**H** = tested and healthy; **F** = tested with findings; **P** = partially covered; **L** = not testable locally; **N/A** = not applicable. H applies only to the evidence named in the row. Detailed outcomes use PASS/FAIL/BLOCKED/UNVERIFIED in [VALIDATION.md](VALIDATION.md). A/R/X/M/W/B evidence keys are defined in [CURRENT-STATE.md](CURRENT-STATE.md).

## Operator surfaces

| Surface | Coverage | Exercised | Findings or remaining scope |
|---|---|---|---|
| Setup / event choice | F | B new event/flight/start; BA draft isolation, URL/history/reload/newest fallback and delayed responses; X retry | CAL-P1-001 fixed locally; CAL-P2-002 creation retries remain. Distinct real-user settings conflicts remain hosted work. |
| Teams | F | A/X/W CRUD/group/order/status; B quick-add/import/search; 100 teams | CAL-P2-001 for valid quoted delimiter CSV. Physical touch reorder not tested. |
| Buyers | H | A/W create/edit, purchaser correction; B inline Sold creation and selection | Text-input shortcut suppression observed. Large buyer-list search performance not quantified. |
| Rules | H | A/R/M pool/deduction/mode rules; B ladder and opening-button edits | All currency formats and all visual toggle combinations not exhaustively tested. |
| Auction console | H | A/R/W/B start/choose/bid/increment/correction/sale/next/pause/undo | Same mock identity across tabs; keyboard and pointer paths passed. |
| Sales | H | A/W price/purchaser edits, void/reopen/undo; B stale Sold/double confirm/public update | All correction variants exercised through API; not every modal repeated on each device. |
| Buybacks | H | R Off/Calculation/Track independently; A/M/X 50/50, partial, deadline, declined, odd cents; W $625 example | Calculated suggestion is information; actual private payments not processed. |
| Results | P | A/R/X unique positions, awards, duplicate rejection, ownership-adjusted entitlement | Domain path healthy; full tablet keyboard result-entry journey not completed; ties external. |
| Settlement | H (local) | R/X/W/BB partial/full receipts, signed reversals, payouts, correction/undo; BB mixed debt/credit summaries and Mark paid draft | CAL-P1-005 fixed locally for receipts and payouts. Every history dialog not exercised by touch. |
| Exports | H (CSV/JSON) / P (print) | BB nine actual CSV files independently parsed/reconciled, backup parsed and print-summary content inspected | CAL-P1-003 fixed locally; physical print pagination and spreadsheet UI import unverified; CAL-P3-001 parallel contracts remain optional debt. |
| Sharing | H / L | R decoded QR/local URL; B copy/QR/TV instructions; BA related public/TV/operator navigation | CAL-P1-001 fixed locally. Internet sharing L. |
| Access | H / L | BA forced audit/grant/revoke failures, concurrent retry, local non-owner and revoked-session checks | CAL-P1-002 fixed locally; distinct hosted owner/operator/revoked sessions L. |
| Help / Auction Night | H | B before/running/after guide, corrections, keyboard, TV instructions at tablet | Physical projector setup not performed. |

## Public states and interactions

| Surface/state | Coverage | Evidence |
|---|---|---|
| Live auction | H | Normal team/bid/sale/pool updates converge; BA context and BC full-price containment/contrast fixed locally. |
| Pre-auction / ready | H | B setup/open-block placeholders; A readiness/start validation. |
| Paused | H | B public and TV say AUCTION PAUSED and retain team/bid; A rejects bids. |
| Completed auction | P | B final-summary/purse text and X final data; BC seven-metric TV layout now passes. Unclaimed place business policy unresolved. |
| Reconnect | H | B safe last state + Reconnecting during stopped server; automatic Connected after restart. |
| Empty/new event | H | B zero teams/pools, no queue/first-sale placeholders, no NaN. Loading joining-state also observed. |
| Large event | P | X/B 100 teams, four flights, 18 sales, filters and payloads. BC corrects long-name/max-bid containment with a separate 12-team/four-flight fixture; no full 100-team browser rerun. |
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
| Many flights | P | Four flights present and pool state inspected; TV does not expose full-field flight filtering. More than four untested. |
| Large amounts | H | BC full $1,000,000 bid with long name; final stress pool $8,000,000, with all values contained. |
| Scaled/browser scenario | H | BC 1366×768 live/paused/completed fits one screen without internal overlap; actual OS scaling not emulated. |
| Admin launch and instructions | H | B event-specific Launch TV link and guide; BA public/TV/operator round trip also preserves event. |
| Fullscreen / physical room | L | In-app attempt did not prove fullscreenElement; no physical TV/projector, HDMI/overscan or distance test. |

## Device and input coverage

| Class | Exact CSS viewport | Coverage | Notes |
|---|---|---|---|
| Narrow mobile | 320×850 (BC) | H (display) | BC full long-name/price, statistics, search/filter and notification containment. Actual phone input unverified. |
| Typical phone | 390×850 (BC) | H (display) | BC full price/statistics and sale notification fit; original normal/filter observations retained. |
| Larger phone | 430×850 (BC) | H (display) | BC full price/statistics and sale notification containment; not every state/device journey. |
| Tablet portrait | 768×1024 | P | BC long-name/max-bid shared block fits. Prior console/dialog/Help checks retained; full results/configuration touch journey missing. |
| Tablet landscape | 1024×768 | P | BC shared block full price/long-name containment; operator vertical scrolling expected. Physical soft keyboard absent. |
| Laptop | 1280×720 | H | Main operator journeys and large public field; public vertical scroll expected. |
| Scaled laptop/TV | 1366×768 | H (viewport) | BC long/short live/paused and completed containment pass; physical fullscreen verification blocked. |
| Desktop / TV projector size | 1920×1080 | H (viewport) | BC long/short live/paused and completed pass. Physical television is not implied by viewport emulation. |
| Mouse / pointer | — | H | Complete setup and sale/correction, filters, sharing, settlement. No specialized drag gesture required in tested flow. |
| Keyboard only | — | H | After start, B/Enter/+/S/U, inline purchaser, confirm, undo; no shortcuts while text/notes/dialogs consume input. |
| Touch hardware | — | L | Tablet dimensions and target sizes observed with pointer; native tap gestures/soft keyboard not available. |
| Screen reader | — | P | Accessible tree, labels/status and focus inspected; NVDA/VoiceOver speech not tested. |
| 200% zoom / reduced motion | — | P | BC confirms original reduced-motion CSS preserved; runtime preference and verifiable browser zoom not exercised. |
| Other engines | — | L | One in-app Chromium environment; no Safari/Firefox/device certification. |

## End-to-end journeys and failure coverage

| Journey | Coverage | Recorded result |
|---|---|---|
| Pre-auction to first bid | H | B event→flight→quick/imported teams→ladder/openings→start→one-click bid/increment; A/R additional pool/house/mode setup. |
| Sale and purchaser creation | H | B keyboard sale with inline new purchaser, exact amount/team, next advance; recent-buyer path three activations. |
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
