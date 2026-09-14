# Product coverage matrix

Audit date 2026-09-14 UTC, source `dfab14906c04b5a6d99ffffbfba4249883750eae`. This matrix reports actual coverage, not a claim that every Cartesian combination of screen × state × device × input was tested.

**H** = tested and healthy; **F** = tested with findings; **P** = partially covered; **L** = not testable locally; **N/A** = not applicable. H applies only to the evidence named in the row. Detailed outcomes use PASS/FAIL/BLOCKED/UNVERIFIED in [VALIDATION.md](VALIDATION.md). A/R/X/M/W/B evidence keys are defined in [CURRENT-STATE.md](CURRENT-STATE.md).

## Operator surfaces

| Surface | Coverage | Exercised | Findings or remaining scope |
|---|---|---|---|
| Setup / event choice | F | B new event, flight, dirty draft switching, start; X retry | CAL-P1-001, CAL-P2-002. Distinct real-user settings conflicts remain hosted work. |
| Teams | F | A/X/W CRUD/group/order/status; B quick-add/import/search; 100 teams | CAL-P2-001 for valid quoted delimiter CSV. Physical touch reorder not tested. |
| Buyers | H | A/W create/edit, purchaser correction; B inline Sold creation and selection | Text-input shortcut suppression observed. Large buyer-list search performance not quantified. |
| Rules | H | A/R/M pool/deduction/mode rules; B ladder and opening-button edits | All currency formats and all visual toggle combinations not exhaustively tested. |
| Auction console | H | A/R/W/B start/choose/bid/increment/correction/sale/next/pause/undo | Same mock identity across tabs; keyboard and pointer paths passed. |
| Sales | H | A/W price/purchaser edits, void/reopen/undo; B stale Sold/double confirm/public update | All correction variants exercised through API; not every modal repeated on each device. |
| Buybacks | H | R Off/Calculation/Track independently; A/M/X 50/50, partial, deadline, declined, odd cents; W $625 example | Calculated suggestion is information; actual private payments not processed. |
| Results | P | A/R/X unique positions, awards, duplicate rejection, ownership-adjusted entitlement | Domain path healthy; full tablet keyboard result-entry journey not completed; ties external. |
| Settlement | F | R/X/W partial/multiple receipts, reversals, payouts, correction/undo; B Mark paid and note entry | CAL-P1-005 summary offset; every history dialog not exercised by touch. |
| Exports | F | X actual seven downloads opened/reparsed; R authorization; print/source inspected | CAL-P1-003; actual print/PDF pagination unverified; CAL-P3-001 parallel paths. |
| Sharing | F | R decoded QR/local URL; B copy/QR/TV instructions | Correct share links; related public navigation loses context CAL-P1-001. Internet sharing L. |
| Access | F / L | A/X owner grant/revoke record and error probe; source authorization | CAL-P1-002; distinct hosted owner/operator/revoked sessions L. |
| Help / Auction Night | H | B before/running/after guide, corrections, keyboard, TV instructions at tablet | Physical projector setup not performed. |

## Public states and interactions

| Surface/state | Coverage | Evidence |
|---|---|---|
| Live auction | F | Normal team/bid/sale/pool updates converge; context and large-money clipping findings. |
| Pre-auction / ready | H | B setup/open-block placeholders; A readiness/start validation. |
| Paused | H | B public and TV say AUCTION PAUSED and retain team/bid; A rejects bids. |
| Completed auction | P | B final-summary/purse text and X final data; TV layout failed separately. Unclaimed place business policy unresolved. |
| Reconnect | H | B safe last state + Reconnecting during stopped server; automatic Connected after restart. |
| Empty/new event | H | B zero teams/pools, no queue/first-sale placeholders, no NaN. Loading joining-state also observed. |
| Large event | F | X/B 100 teams, four flights, 18 sales, filters and payloads; long-name/bid clipping. |
| Flight filters | H | B four-flight strip intentionally scrolls; Third Flight returns 25 of 100. |
| Team search | H | B search Audit Team 024 returns one with flight filter. Empty matches explained. |
| Public settings/privacy | H (local) | A/R/X server-hidden values, private sentinels, only public team notes; all cosmetic combinations P. |
| Anonymous read-only | H / L | A/R/X local public access + denied admin/exports; hosted dispatcher/audience L. |
| Mutation tools | N/A | Read-only public board; no spectator bid/payment operation exists. |

## TV states

| Surface/state | Coverage | Evidence |
|---|---|---|
| Normal live 1920×1080 | H | Current team, amount, flight, pots, three upcoming/recent teams fit one viewport. |
| Paused | H | State wording retained; existing long-name containment finding still applies. |
| Completed | F | Seventh summary statistic wraps into recent area, CAL-P1-004. |
| Reconnect | H | Safe state and reconnect status survive server interruption; automatic recovery. |
| Long names | F | 66-character current team wraps and pushes price below block crop at 1920×1080. |
| Many flights | P | Four flights present and pool state inspected; TV does not expose full-field flight filtering. More than four untested. |
| Large amounts | F | Maximum permitted per-bid 1,000,000 units tested; full digits clipped with long name. |
| Scaled/browser scenario | F | 1366×768 normal event overlaps block/queue/stats/recent; browser OS scaling not emulated. |
| Admin launch and instructions | H | B correct event-specific Launch TV link and guide; problematic public TV link separate. |
| Fullscreen / physical room | L | In-app attempt did not prove fullscreenElement; no physical TV/projector, HDMI/overscan or distance test. |

## Device and input coverage

| Class | Exact CSS viewport | Coverage | Notes |
|---|---|---|---|
| Narrow mobile | 320×740 | F | Public long-name/large-price geometry and screenshot; number extends beyond content. |
| Typical phone | 390×844 | F | Normal public healthy; 100-team stress clips price; flight/search work. |
| Larger phone | 430×932 | P | Normal loaded board screenshot healthy; large filtered board geometry inspected, not every large-state region. |
| Tablet portrait | 768×1024 | P | Console, buyer/Mark paid dialog, Help; primary Hammer 54px high; no horizontal page overflow. Full results/configuration touch journey missing. |
| Tablet landscape | 1024×768 | P | Operator console readable, vertical scrolling; no horizontal overflow. Physical soft keyboard absent. |
| Laptop | 1280×720 | H | Main operator journeys and large public field; public vertical scroll expected. |
| Scaled laptop/TV | 1366×768 | F | TV sections overlap; fullscreen verification blocked. |
| Desktop / TV projector size | 1920×1080 | F | Normal live healthy; long names/completed fail. Physical television is not implied by viewport emulation. |
| Mouse / pointer | — | H | Complete setup and sale/correction, filters, sharing, settlement. No specialized drag gesture required in tested flow. |
| Keyboard only | — | H | After start, B/Enter/+/S/U, inline purchaser, confirm, undo; no shortcuts while text/notes/dialogs consume input. |
| Touch hardware | — | L | Tablet dimensions and target sizes observed with pointer; native tap gestures/soft keyboard not available. |
| Screen reader | — | P | Accessible tree, labels/status and focus inspected; NVDA/VoiceOver speech not tested. |
| 200% zoom / reduced motion | — | P | Source has reduced-motion CSS; runtime preference and verifiable browser zoom not exercised. |
| Other engines | — | L | One in-app Chromium environment; no Safari/Firefox/device certification. |

## End-to-end journeys and failure coverage

| Journey | Coverage | Recorded result |
|---|---|---|
| Pre-auction to first bid | H | B event→flight→quick/imported teams→ladder/openings→start→one-click bid/increment; A/R additional pool/house/mode setup. |
| Sale and purchaser creation | H | B keyboard sale with inline new purchaser, exact amount/team, next advance; recent-buyer path three activations. |
| Mistakes and queue exceptions | H | A/R/W wrong bid/buyer/price, sold/reopen/void/undo, separate skip/unsold/withdraw. |
| Finish through bookkeeping | F | A/R/X/W completion→results→entitlements→receipts/payouts→exports; signed CSV and aggregate summary findings. Not one uninterrupted all-browser journey. |
| Four independent tabs | H | A/B operator, public, TV; stale B shown conflict; sale double click produces one record; public/TV converge after correction. |
| Duplicate stale sale API | H | A/R same request replay and changed revision sale denied; B stale confirmation disabled before submission. |
| Server stop/restart | H | B last state retained; warning prevents false save; full stored/derived data deep-equal after restart; viewers recover automatically. |
| Temporary API failure | H | Isolated server unavailable affects polling and attempted save; malformed body 400, stale 409 and invalid reference failure tested. |
| Refresh on live team / after sale | H | A/R/B persisted records on fresh reads, UI reload and public updates. Event-selection refresh bug separately CAL-P1-001. |
| Failed access request | F | X 400 with grant applied: CAL-P1-002. |
| Full recovery from backup | L | Backup read/contents verified; no implemented import/restore workflow to test. Not a required new feature in this pass. |
| Sustained high load / 500 teams | L | 100-team local sample only; no hosted load or maximum-capacity claim. |

See [VALIDATION.md](VALIDATION.md) for hosted-only gates and exact limitations. Untested paths remain visible here rather than being counted as passes.
