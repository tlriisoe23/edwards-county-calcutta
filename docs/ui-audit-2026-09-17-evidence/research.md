# UI Pattern Research: Golf Leaderboards & Calcutta/Live-Auction Operator Tools

Research for ECGC Leaderboard and Edwards County Calcutta UI audit. All claims are sourced from fetched pages or search-result summaries of those pages; anything not directly verifiable from source content is marked **unverified**.

---

## Part 1: Golf Leaderboards

### 1. Golf Genius (TV Display Leaderboard)
- URL: https://docs.golfgenius.com/en/articles/10778769-tv-display-leaderboard , https://golfgenius.com/resources/live , https://docs.golfgenius.com/en/articles/10777421-live-scoring-mobile-scoring
- Surfaces: TV/clubhouse display (accessed via a `.GolfGenius.com/tv` link), manager-site score entry, mobile/iPad scoring-station entry, public live leaderboard.
- Patterns worth borrowing:
  1. **Page rotation with drag-and-drop ordering** — the TV leaderboard cycles through multiple "pages" (tournament leaderboard, round summary/points, season standings, tee sheet, custom image/text slides), and operators can reorder/hide pages. Directly analogous to ECGC's TV `/tv` flight-paging + info slide.
  2. **"Top X only" truncation** — operators can cap the leaderboard to show only the top N players/teams "to avoid cluttering the display with bad scores." Useful default for a small-field club tournament TV display.
  3. **Adjustable font size / scroll rate / display width via sliders** — lets an operator tune the display per-TV without touching code, rather than a single fixed layout.
  4. **Dark mode for outdoor glare** — a toggle for outdoor/bright conditions, not just aesthetic dark mode.
  5. **Score entry has a "mark scorecard as checked" timestamped action** — an explicit human-verification checkpoint before scores are considered final, separate from raw entry.
  6. Leaderboard refresh cadence is time-boxed ("updates every 10 seconds") rather than instant-push — a deliberate throttle, not a defect.
- Do NOT copy: marketing pages don't show the manager-site score-entry grid in detail, so no evidence either way on its usability; the multiple rotating "custom pages" concept, if abused, risks becoming clutter — Golf Genius itself frames "Top X" truncation as a *fix* for clutter, implying the base leaderboard can get busy with a big field.

### 2. BlueGolf TM
- URL: https://www.bluegolf.com/info/tdapp.html , https://tm.bluegolf.com/livescoring , https://bluegolf.supporthero.io/article/show/143417
- Surfaces: TD (tournament director) mobile app for on-course scoring, BlueGolf TV castable display, public live leaderboard.
- Patterns worth borrowing:
  1. **Leaderboard works even without full digital scoring** — a tournament admin can manually key in scores from paper cards and the public/TV leaderboard still updates automatically. This validates ECGC's own manual-entry operator model as a legitimate, established pattern rather than a limitation to apologize for.
  2. **"Castable" TV leaderboard** framed explicitly as a clubhouse-display product, separate from the operator tool — reinforces treating TV display as its own presentation layer, not a mirror of the operator UI.
  3. Near-real-time update promise ("within seconds") sets a reasonable performance bar for score-entry-to-display latency.
- Do NOT copy: no public detail on the TD app's actual entry-screen layout (unverified either way).

### 3. GolfStatus
- URL: https://golfstatus.com/app
- Patterns worth borrowing:
  1. Positions live leaderboard as a first-class player-facing feature during casual/charity events ("see where every team stands"), and explicitly ties fast results turnaround to charity-event practicality ("finalizing tournament's results takes minutes") — relevant since ECGC's context is a small club tournament, not a tour.
- Do NOT copy: nothing specific found about console UI; mostly consumer round-tracking features (GPS, stats) that are out of scope for a leaderboard/TV product and would be feature bloat if copied.

### 4. Golf Pad Events / Live Leaderboard
- URL: https://golfpadgps.com/events , https://support.golfpadgps.com/support/solutions/articles/6000253103-what-is-live-leaderboard-in-golf-pad-
- Pattern worth borrowing: **separates "Events" (pre-tournament setup/info) from "Live Leaderboard" (ad hoc, can be started right on the first tee)** — a useful reminder to keep event-setup and live-standings as distinct, purpose-built views rather than one dense screen.

### 5. 18Birdies
- URL: https://help.18birdies.com/article/624-leaderboards , https://18birdies.com/tournaments/
- Pattern worth borrowing: leaderboard updates are tied to discrete "post a round" events rather than continuous hole-by-hole streaming, which keeps the public standings page calmer and less flickery for spectators — a reasonable model if ECGC's manual entry is also batch/round-oriented.

### 6. PGA Tour / ESPN Golf Leaderboard conventions (verified via ESPN fetch)
- URL: https://www.espn.com/golf/leaderboard (fetched directly), https://www.pgatour.com/news/2010/01/07/leaderboardfaqs.html (search-summary only, direct fetch 404'd)
- Verified column structure from ESPN's live leaderboard:
  - **POS** — position, with a **"T" prefix for ties** (e.g., "T1")
  - **PLAYER** — name + country flag icon
  - **SCORE** — total relative to par (e.g., "-7")
  - **TODAY** — current round relative to par, with a timestamp once the round is finished
  - **THRU** — holes completed this round; shows "--" once the round is over (PGA Tour FAQ text found elsewhere confirms "F" = finished is also a common convention, and a plain number like "15" means 15 holes played, 3 to go — this specific "F" detail is from a secondary/summarized source, treat as **unverified** at the ESPN level but consistent with common golf leaderboard convention)
  - **R1–R4** — individual round scores, dash for unplayed rounds
  - **TOT** — total strokes across completed rounds
  - Special-case notations: **asterisk** for players starting on hole 10, **"(a)"** for amateur status, **"WD"** for withdrawn, **"CUT"** in the POS column for players eliminated by the cut line
  - Movement arrows (▲/▼) showing live position change during a round were described in a secondary/summarized source (PGA Tour FAQ) — **unverified** by direct fetch, but a widely recognized convention worth calling out as unconfirmed-but-plausible.
  - Cut-line pill shown at the top of the leaderboard on cut days, clickable for a projected-cut modal — also from the secondary source, **unverified** by direct fetch.
  - Hole-by-hole scorecard on row expand (18-hole grid with OUT/IN/TOT) — mentioned only in a search-engine-generated summary, not confirmed by a direct fetch of masters.com (direct fetch timed out) or espn.com (ESPN's fetched HTML did not show expand/drill-down markup). **Mark as unverified.**
- Patterns worth borrowing (verified/standard convention level):
  1. Compact "T" tie prefix instead of repeating rank numbers or leaving gaps — clear and space-efficient.
  2. Consistent to-par notation (signed number, dash for even) across SCORE/TODAY/R1–R4 columns.
  3. A single letter-code vocabulary for exceptional status (WD, CUT, (a)) kept in-column rather than as separate UI chrome.
  4. THRU column doubles as both "how far into the round" and (via dash/blank when finished) an implicit "done" state — one column carries two meanings without extra UI.

---

## Part 2: Calcutta / Live-Auction Operator Tools

### 7. Calcuttapp (golf-specific Calcutta manager)
- URL: https://www.calcuttapp.com/
- Patterns worth borrowing:
  1. **Current-lot card shows context, not just the name** — example shown: "M. Richardson HDCP 4.2 — Last 3: 72, 74, 71" alongside current bid and high bidder. Surfacing a bit of relevant context (handicap, recent form) next to the lot mirrors what a Calcutta buyer needs to bid intelligently, analogous to showing team/player context on Edwards County Calcutta's current-lot screen.
  2. **Automatic syndicate/ownership-percentage math** — multiple buyers can co-own a lot, and the app "automatically tracks ownership percentages and apportions winnings," removing manual split math from the operator.
  3. **Settlement ledger generated instantly from finishing positions** — operator enters final standings once; payouts and a "settle-up ledger" for who owes what are computed automatically rather than assembled by hand afterward.
- Do NOT copy / not found: no visible detail on an actual auctioneer console screen, undo, or TV display — cannot verify those exist or how they look.

### 8. BidParTee
- URL: https://www.bidpartee.com/
- Pattern worth borrowing: separates **admin dashboard** (uploads, starting the auction, tracking payments) from a **live action display** (shows ongoing auctions/current bids for the room) and a **mobile bidding portal** for participants — a clean three-surface split (admin / public display / bidder) matching ECGC's own operator-console vs. TV vs. public-board split.
- Do NOT copy: marketing-only copy, no confirmed detail on sold-flow or error correction (unverified).

### 9. Settle Up Golf
- URL: https://settleup-golf.com/how-to/calcutta
- Patterns worth borrowing:
  1. **"Call the bids live, then tap a line and enter its sale price and owners"** — a deliberately two-step, low-friction record-after-the-fact flow: the human calls the auction verbally, the operator just taps the already-listed line and fills two fields. This is a strong candidate pattern for ECGC Calcutta's Sold dialog — minimize typing to line-select + price + owner(s).
  2. **Automatic prize-pool aggregation** — "the pot builds itself: total sale prices become the prize pool" — no manual totaling step for the operator.
  3. **"Half-back" partial-ownership buy-back** is a named, explicit feature rather than an ad hoc workaround — worth having explicit product language for common real-world Calcutta variations, if ECGC supports them.
  4. Live standings ("Board" tab) recompute projected payouts "after every score entry, so everyone knows the stakes at all times" — ties auction results directly into a live payout view rather than a static one calculated only at the end.

### 10. Victory's Auction Pro
- URL: https://www.auctionpro.co/
- Patterns worth borrowing:
  1. **Minimum-bid one-click button** alongside free-text bid entry — "enter the amount you wish to bid or click the minimum bid button" — reduces bidder friction and typos; the operator/bid-entry equivalent (a "next increment" button next to manual entry) is a strong pattern for ECGC's bid-entry UI.
  2. **Results panel kept directly below the bidding section** so a bidder's own winning bids and running budget are always visible without navigating away — same idea applies to keeping a live running total visible to the operator during the auction console flow.
  3. **Anti-snipe time extension** on bids close to lot-close in "simultaneous" (silent-style) mode — a defensive UX pattern against last-second gaming, relevant if ECGC ever supports concurrent/silent lots.
- Do NOT copy: unverified on TV display or admin console visuals — not shown on the page.

### 11. TournaKit Pro
- URL: https://www.tournakit.com/calcutta-auctions.html
- Pattern worth borrowing: ships literal **paper bid-sheet templates** ("Calcutta Auctioneer's Bid Sheet") alongside the software — a reminder that the auctioneer/clerk workflow in real Calcuttas is often hybrid (paper + software), so the operator console should be designed assuming a caller/scribe split (one person calls, one enters), not solo operation.
- Do NOT copy: no live console or TV display evidence found — this product appears to be settlement/reporting-focused rather than live-auction UI (payout calculation from final position, results/summary reports), which is a narrower scope than ECGC needs.

### 12. Calcutta League
- URL: https://calcuttaleague.com/
- Patterns worth borrowing:
  1. **Countdown timer directly on the current-lot card** alongside current bid and bidder — gives a visible forcing function for lot close, useful on a TV display.
  2. **Portfolio view for buyers** — "league status, your teams, who they play next, whether they're still alive," with owned slots highlighted — a "my holdings at a glance" pattern that could inform a buyer-facing view on ECGC's public board (e.g., highlighting a searched-for buyer's owned teams).
- Do NOT copy: unverified on operator console specifics (admits it doesn't show undo/error correction).

### 13. Auctria (general charity auction, live-auction clerking) — verified via direct fetch
- URL: https://academy.auctria.com/actions_bidding/live_auction/
- Patterns worth borrowing:
  1. **"Quick Entry" tab**: a dedicated fast-path screen distinct from the main item-management UI, where the clerk types paddle number + bid amount and clicks "Record Bid" — built specifically for entering a **batch of already-decided winning bids quickly**, e.g., from a paper list. Directly relevant: ECGC Calcutta's operator console should have a comparably minimal "type two things, hit one button" fast path for Sold entry, separate from any more elaborate per-lot dialog.
  2. **Standard flow uses a "Record Winner" action per item** that opens a small dialog (select participant, enter winning bid, confirm) — i.e., two tiers of entry UI (quick-entry grid vs. per-item dialog) coexist for different operator needs.
  3. **"Record Another Winner"** appears inline under an item once one winner is recorded — supports items with multiple winners/split lots without leaving the screen.
- Explicitly NOT found (i.e., unverified, and worth noting as a gap in even a mature product): no documented keyboard shortcuts, no documented undo function, no documented automatic lot-advancement. This suggests even established auction software may lack robust undo — a place ECGC could differentiate by explicitly designing for it.

### 14. ClickBid — verified via direct fetch
- URL: https://support.cbo.io/-how-to-run-a-live-auction-in-clickbid
- Patterns worth borrowing:
  1. **Named "Butler" quick-add tool**: item name/number + paddle number + final bid amount + "Add Bid" — same minimal 3-field fast-entry shape as Auctria's Quick Entry and Settle Up Golf's tap-line-enter-price-owner flow. Three independent products converging on the same "3 fields, 1 button" shape for sold-entry strongly validates this as *the* pattern to copy for ECGC Calcutta's Sold dialog.
  2. **Recommended dual-entry workflow**: "a scribe enter[s] winning bids in real time, and a second person writing them down on paper for cross-referencing at the end of the event" — an explicit, vendor-recommended process control for catching entry errors, worth reflecting in ECGC's operator guidance/UI (e.g., a printable running log or an easy post-hoc reconciliation view) even if not a literal feature.
  3. Recorded winning bid **automatically appears in the winning bidder's checkout cart** — ties the live-auction console directly into downstream settlement without a separate manual transcription step.

### 15. StreamBid Clerk Console
- URL: https://stream.bid/clerk-console/
- Patterns worth borrowing:
  1. **Explicit void / pass / sell action buttons** as first-class controls, not just a single "confirm" — separating "this lot didn't sell" (pass) from "undo/void this bid" from "sell" gives the operator distinct, low-ambiguity actions for the three real outcomes of an auction lot. This is a strong, concrete pattern for ECGC Calcutta's current-lot/Sold UI: Sold / Pass(no bid) / Void-last-bid as three separate buttons rather than overloading one.
  2. **Bid-source tagging** (floor vs. phone vs. online) with timestamps in a running bid-history panel — even though ECGC likely only has one bid source (room), a timestamped bid history log is a transferable idea for auditability/undo.
  3. **Live increment adjustment** ("change the asking price quickly and set increments") from the clerk console itself, mid-lot — useful if ECGC ever needs to deviate from a fixed bid-increment table live.

### 16. Handbid
- URL: https://www.handbid.com/product-features/mobile-auction-management
- Patterns worth borrowing:
  1. **Mobile-first staff console** explicitly designed so staff can "move around the room and make adjustments on the fly" rather than being tied to a single fixed terminal — worth considering if ECGC's operator console should be usable from a tablet in addition to a laptop at a table.
  2. Real-time bidding controls bundle **bid, increment, and item-visibility management in one place** rather than splitting them across screens.
- Do NOT copy: no confirmed detail on the actual screen layout (unverified).

### 17. General charity-auction landscape notes (GiveSmart, OneCause, Greater Giving)
- URLs: https://www.givesmart.com/features/mobile-bidding-auctions/ , https://www.onecause.com/solutions/auction-events/ , https://www.greatergiving.com/en/solutions/online-bidding/mobile-bidding
- These are large, feature-rich nonprofit-gala platforms (ticketing, donor CRM, Text2Give, peer-to-peer fundraising, express checkout/QR check-in). Public marketing pages did not surface enough operator-console screen detail to extract concrete UI patterns beyond what's already captured above (QR-code express check-in to cut wait time; self-checkout to reduce staffing need).
- **Explicitly what NOT to copy**: this class of product bundles ticketing, CRM, donor communications, peer-to-peer campaigns, and multi-channel giving into a single suite. For a small rural golf course running one Calcutta a year, replicating that breadth would be feature bloat — the useful borrowings are narrow (fast bid-entry shape, express checkout), not the surrounding donor-management ecosystem.

---

## Part 3: General Readability & Console UX Research

### Scoreboard / arena display readability (Daktronics — verified via direct fetch)
- URL: https://www.daktronics.com/en-us/support/kb/000030569
- Verified rules:
  - **Pixel-pitch-to-distance rule**: optimal viewing distance (feet) ≈ 3 × pixel pitch (mm) — e.g. a 10mm-pitch display reads best from ~30 ft.
  - **Text-height rule**: at least 1 inch of character height per 25 feet of viewing distance (a 4" character is legible to ~100 ft).
  - Distinguishes **moving audiences** (need larger text, higher contrast, simpler content) from **stationary audiences** (arenas/auditoriums — can use smaller pitch/more detail) from **close-range** (retail/lobby — fine detail is fine).
  - Recommendation: for long-distance viewing, favor **simpler layouts with bold text and minimal detail** over dense, small-pitch content that reads as pixelated clutter from afar.
- Additional widely-repeated rule of thumb from secondary sources (search-summarized, treat as **generally accepted but not independently re-verified in this session**): ~1 inch of letter height per 10 feet of viewing distance is a commonly cited alternative/simplified version of the same idea; contrast ratio of at least 7:1 recommended; sans-serif, high-contrast color pairs (white-on-black, yellow-on-blue) for legibility.

### Digital signage dwell time (search-summarized, multiple industry blog sources; not independently fetched/verified in full)
- Industry-standard dwell time: **7–10 seconds per slide**, shorter (~5s) for high-traffic/glance contexts, slightly longer for waiting areas.
- **"3×5 rule"**: 3 lines × 5 words, or 5 lines × 3 words, as an upper bound for how much text a slide should carry.
- A slide should be comprehensible in a 3-second glance; more than ~30 words won't be read.
- Directly relevant to ECGC TV's "information slide": keep it to a handful of short lines, and don't let it linger dramatically longer than the standings pages or it will feel like dead air.

### Kiosk / operator "live console" patterns (search-summarized, multiple UX sources; not independently fetched/verified in full)
- Simplicity: limit visible choices, use large touch targets, give immediate visual feedback per action, minimize taps.
- Linear, predictable workflows with progress indication and an easy review/edit step before final submission.
- Physical/environment considerations (glare, ambient noise, varying skill levels) apply directly to a clubhouse laptop/tablet operator station.
- Keyboard-first data entry: design entry screens so an operator's hands never need to leave the keyboard; avoid forced scrolling mid-entry (breaks the tab/keyboard flow); validate inline as data is typed rather than only on submit, since forward-only correction (never "going back") reduces perceived friction; input masks constrain format (dates, money) at entry time rather than after.

---

## Part 4: Synthesized Pattern Library (10–15 Recommendations)

### (a) Public board readability / hierarchy
1. **Adopt the standard golf leaderboard column vocabulary** — POS with "T" tie-prefix, signed to-par scores (dash for even), and single letter-codes for exceptional states (WD, CUT-equivalent) — verified as ESPN's actual live convention. Borrow the *shape*, not the exact glyphs.
2. **Let one column carry two meanings** the way THRU does (progress + implicit "done" state via blank/dash) — avoid adding a separate "status" column when an existing one can imply it.
3. **Cap/paginate the visible list** rather than showing every entrant at once on a small-course, small-field event (Golf Genius's "Top X" pattern) — especially relevant for both the public standings page on mobile and the TV display.
4. **Surface brief context next to the "current" item**, not just its name — Calcuttapp's handicap/recent-scores strip next to the current lot, and Calcutta League's countdown-on-lot-card — apply the same idea to a leaderboard's current-leader callout or a Calcutta's current-lot header.

### (b) Operator console speed and error-proofing
5. **Give the operator a 2–3-field "fast path" for the most common action**, separate from any richer dialog: three independent products (Auctria's Quick Entry, ClickBid's Butler, Settle Up Golf's tap-line-enter-price-owner) converge on "identify the line + amount + one button" for recording a sale — the single strongest, most cross-validated pattern found in this research. Apply directly to ECGC Calcutta's Sold flow and to ECGC Leaderboard's score-grid row entry.
6. **Separate Sold / Pass / Void into distinct buttons** (StreamBid) rather than one overloaded "confirm" — removes ambiguity about what state a lot is in and gives a designated "undo the last bid" affordance, which several competitors (Auctria included) explicitly lack.
7. **Recommend/support a two-person call-and-record workflow** (ClickBid's scribe + paper cross-check, TournaKit's printed bid sheets) — even if ECGC's console is built for one operator, keep the UI legible enough at a glance that a second person can visually audit it in real time (e.g., large current-lot/current-bid display visible to more than just the typist).
8. **Auto-compute totals/splits/pool the operator would otherwise do by hand** — syndicate ownership percentages (Calcuttapp), prize-pool aggregation from sale prices (Settle Up Golf), payout-from-final-position (TournaKit) — remove manual arithmetic from the live-operator's critical path entirely; do it computed, not just checked.
9. **Inline, as-you-type validation instead of only submit-time errors**, and avoid forced scrolling mid-entry so an operator's hands stay on the keyboard — general data-entry UX research, directly applicable to the spreadsheet-style score grid.
10. **One-click "next increment" bid buttons alongside free-text entry** (Auction Pro's minimum-bid button) — reduces both typing and typo risk during fast-moving bidding.

### (c) TV / projector display
11. **Treat the TV display as a fully separate presentation surface from the operator console**, with its own settings (font size, scroll speed, page order, dark/glare mode) rather than a scaled mirror of the operator's screen — the universal pattern across Golf Genius, BidParTee, and BlueGolf TV.
12. **Apply distance-appropriate type sizing**: Daktronics' verified rule of ~1 inch of character height per 25 feet of viewing distance (or the commonly cited simpler 1"/10ft rule) as a concrete sizing check for ECGC's actual clubhouse TV placement and expected viewing distance, rather than an arbitrary font-size choice.
13. **Keep the info slide brief and time-boxed** — informed by the 7–10 second dwell-time norm and the "3×5" line/word guideline — so it doesn't feel like a dead-air interruption between standings pages, and rotate back to live standings promptly (echoing Golf Genius's operator-controlled page order/scroll rate rather than a fixed hard-coded cycle).
14. **Put a visible countdown/urgency cue on the "current" item** on the TV during live bidding (Calcutta League's countdown-on-lot-card), which both paces the room and gives spectators a reason to keep watching the screen.

### (d) Simplicity — what to remove or hide
15. **Do not bundle unrelated fundraising/CRM features** the way large nonprofit-gala platforms (GiveSmart, OneCause, Greater Giving) do — ticketing, donor CRM, peer-to-peer campaigns, Text2Give, etc. For a once-a-year rural club Calcutta or leaderboard, that breadth is bloat, not a feature; keep ECGC's operator console scoped to setup → auction/scoring → sold/entry → settlement/results, matching the narrower shape of the golf-specific tools (Calcuttapp, Settle Up Golf, BidParTee) rather than the general charity-auction suites.
16. **Hide/collapse anything not needed live**: Golf Genius's explicit "Top X" truncation and page-visibility toggles, and Golf Pad's split between static "Events" info and the separate live-leaderboard view, both model the same instinct — the live/public-facing surface should show only what's relevant *right now*, with setup/config detail pushed off-screen into an operator-only area (which both apps already have, in ECGC's case: Event setup, Prepare steps).

---

## Sources
- https://docs.golfgenius.com/en/articles/10778769-tv-display-leaderboard
- https://golfgenius.com/resources/live
- https://docs.golfgenius.com/en/articles/10777421-live-scoring-mobile-scoring
- https://www.bluegolf.com/info/tdapp.html
- https://tm.bluegolf.com/livescoring
- https://bluegolf.supporthero.io/article/show/143417-can-you-use-the-live-leaderboard-without-digital-scoring-a-person-running-a-tournament-enters-scores-as-they-come-in
- https://golfstatus.com/app
- https://golfpadgps.com/events
- https://support.golfpadgps.com/support/solutions/articles/6000253103-what-is-live-leaderboard-in-golf-pad-
- https://help.18birdies.com/article/624-leaderboards
- https://18birdies.com/tournaments/
- https://www.espn.com/golf/leaderboard (fetched directly — column structure verified)
- https://www.pgatour.com/news/2010/01/07/leaderboardfaqs.html (search-summary only; direct fetch returned 404)
- https://www.calcuttapp.com/
- https://www.bidpartee.com/
- https://settleup-golf.com/how-to/calcutta
- https://www.auctionpro.co/
- https://www.tournakit.com/calcutta-auctions.html
- https://calcuttaleague.com/
- https://academy.auctria.com/actions_bidding/live_auction/ (fetched directly)
- https://support.cbo.io/-how-to-run-a-live-auction-in-clickbid (fetched directly)
- https://stream.bid/clerk-console/
- https://www.handbid.com/product-features/mobile-auction-management
- https://www.givesmart.com/features/mobile-bidding-auctions/
- https://www.onecause.com/solutions/auction-events/
- https://www.greatergiving.com/en/solutions/online-bidding/mobile-bidding
- https://www.daktronics.com/en-us/support/kb/000030569 (fetched directly — viewing distance rules verified)
- https://www.extron.com/article/videowallfontsize (fetch blocked by bot defense; not used as a source of claims)
- Digital signage dwell-time guidance: aggregated from Visix, Yodeck, Doohly, CrownTV blog posts returned by search (not independently fetched in full; treat specific numbers as industry-common but not primary-sourced in this session)
- Kiosk/keyboard-first UX guidance: aggregated from AVIXA Xchange, KIOSK.com, Frank Mayer & Associates, SPK and Associates, Justinmind blog posts returned by search (not independently fetched in full)
