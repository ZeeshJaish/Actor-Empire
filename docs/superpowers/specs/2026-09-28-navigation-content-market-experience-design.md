# Navigation and Content Market Experience — Review Draft

Date: 2026-09-28  
Status: **Historical review draft; Phase 1–5 scope superseded by the revised roadmap**

**Scope update:** The user expanded Phase 1 from four eager core pages to every player-visible game screen, with Zedbury Studios as the first visible frame and all screen-readiness work completed during the Actor Empire loading sequence. Use the [revised Phase 0–5 roadmap](../plans/2026-09-28-zedbury-first-startup-navigation-market-roadmap.md) for phase scope and status; the older Phase 1 wording below is retained only as historical context.

Phase 0 measurement is complete: [baseline report](../reports/2026-09-28-navigation-market-phase0-baseline.md). It confirms that auction entry/bid handling and first Market mount are the largest measured interaction delays; Gate → Market and poster → detail are comparatively quick. Phases 1–2 should follow that priority order.

## Goal and boundaries

Make routine navigation feel immediate, make Content Desk → Market and bidding responsive, clarify what each market action purchases, modernize the Market without abandoning Actor Empire's existing visual language, and rebalance future offer prices safely. Deliver this as one coordinated release with phase gates, not isolated cosmetic changes.

The market must keep its deterministic weekly supply, player-first/scouted offers, rival activity, rights compatibility, save recovery, and signed contract semantics. This work does not introduce permanent movie-IP acquisition. Existing saves, live auctions, and signed deals must not be silently repriced or lost.

## What the current code does

### Home → Career and other page loading

**Confirmed from code:** `App.tsx` declares Home, Career, Improve, Social, Lifestyle, Mobile, Store, and other screens with `React.lazy`. The main playing area wraps them in one `Suspense` boundary whose fallback says `Loading screen…` (`App.tsx`, around lines 206–217 and 5194–5205). If a screen's module has not finished importing when navigation changes `activePage`, React renders that fallback instead of the destination.

Career is queued for idle preloading while Home is active (`App.tsx`, around lines 2060–2090). But navigation cancels queued background tasks, starts Career's import without awaiting it, and immediately changes `activePage` (`App.tsx`, around lines 4561–4575). On a fast tap, slower device, or busy main thread, Career can therefore lose the preload race and show the fallback. Lifestyle and Mobile are deliberately left on-demand, so their first opening is more exposed.

Startup is separate from page navigation. `App.tsx` deliberately holds a 1,470 ms Zedbury ident, then a 650 ms reveal delay before clearing the startup display, and also waits for real asset/storage/save-summary/Home tasks (`App.tsx`, around lines 301–304, 702–705, 1373–1387, and 1900–1990). Thus the startup loading screen contains both cosmetic waiting and genuine initialization/recovery work. The branded ident was previously documented in code as approved; this draft does not assume permission to delete that branding.

**User-confirmed product decision:** Home, Career, Phone (`MobilePage`), and Lifestyle are core pages. Load their page modules eagerly with static imports at app startup, not `React.lazy`, on-demand imports, or navigation-time preloading. A first tap between these pages must not wait for a page-module fetch or display `Loading screen…`. This removes one cause of delay; expensive rendering or save-state work may still need measured optimization. Genuine save initialization and recovery errors must remain visible rather than showing a blank screen.

### Content Desk → Market and bidding

**Confirmed from code:** The Add Content handler immediately sets `showContentMarket=true` (`components/StreamingPlatformHQ.tsx`, around lines 1805 and 2355). There is no artificial delay in that click handler. Mounting `StreamingContentMarket` then performs separate derivations for listings, 2,000-title historical catalogue, collections, generated offers, supply summary, auction lots, upcoming sales, owned titles, and the exact-screen adapter (`components/StreamingContentMarket.tsx`, around lines 175–185 and 331). Some selectors call other selectors again: supply summary recomputes listings, collections, and auction assignment (`services/streamingContentMarket.ts`, around lines 217–239); auction assignment also recomputes listings and collections (around lines 140–150). These are overlapping synchronous tasks before the Market can paint.

The exact-screen adapter repeatedly resolves a project by scanning world/past projects and then historical catalogue (`content-market-exact/adapter.ts`, around lines 88–105). Historical resolution reconstructs saved released titles for each lookup (`services/historicalCatalogue.ts`, around lines 450–472). This creates a credible scaling concern on long saves; its exact share of the user's delay is **not yet measured**.

Opening an auction room synchronously rebuilds its lot and rival session, then updates the whole `Player` (`components/StreamingContentMarket.tsx`, around lines 419–430; `services/streamingBuyerAuctions.ts`, around lines 324–360). Every component-originated `Player` update goes through `migratePlayerSave`, whose default merge copies nested data (`App.tsx`, around line 2974; `services/playerUiState.ts`, around lines 20–22; `services/saveMigration.ts`, around lines 160–193 and 1081). The auction room also advances once per second and may send another whole-player update (`components/StreamingBuyerAuctionRoom.tsx`, around lines 48–72). That explains why bid feedback can feel tied to expensive global work, but a device trace is needed to rank the costs.

The exact Market is keyed by `draft.selectedId || 'root'` (`components/StreamingContentMarket.tsx`, around line 441). Selection changes can remount the entire exact-screen subtree and reset/render its local state. This is an avoidable work trigger and must be profiled alongside the selectors and poster rendering.

**Evidence limit:** This inspection confirms the synchronous work and screen-loading mechanisms, not a measured click-to-paint time for the user's particular save or device. Phase 0 records those times before changing code.

### Wording, layout, and price

The current UI calls live auctions `IN THE ROOM`/`ROOM`; `OPEN` means an available fixed listing. `MARQUEE` is a quality tier, not a transaction status (`content-market-exact/ExactContentMarket.tsx`, around lines 228–263). The two badges are both positioned at the poster's top-left, so they can overlap (`content-market-exact/ContentMarket.module.css`, around lines 104 and 546–548). The same title can appear in multiple rails, increasing visual repetition. `Already proven` is selected by existing box-office data, not necessarily critical acclaim (around lines 362–370).

Generated completed projects currently ask roughly $2M–$16M, with premium projects roughly $20M–$55M (`services/streamingOpportunityMarket.ts`, around lines 70–82). Historical-title licence quotes use a $3M–$90M performance base, then territory, duration, exclusivity, and Marquee multipliers (`services/streamingCatalog.ts`, around lines 374–397). These numbers generally buy **streaming rights under a contract**, often a 104-week term, not permanent ownership of the film. The UI does not make that distinction prominent enough. Its compact money formatter only switches to `M` above $1M, producing unreadable large-treasury values such as millions of millions (`content-market-exact/ExactContentMarket.tsx`, around lines 102–108).

## Design approaches considered

1. **Delete every fallback while keeping core pages lazy.** An uncached page could leave a blank area and still take time to open. Not recommended.
2. **Eagerly import Home, Career, Phone, and Lifestyle; keep real recovery states.** The four core page modules are ready before the player navigates. Measure cold startup and optimize heavy dependencies if needed without restoring route-level lazy loading for these pages. **User-confirmed direction.**
3. **Eagerly import every page and deep flow.** This may inflate startup bundle, parsing, and memory on older phones. Not requested as a global policy; optional non-core screens can retain deferred loading, with truthful first-use feedback.

## Coordinated release phases

### Phase 0 — Baseline and save-safety contract

- Capture click → first visual response → destination paint for Home → Career, Home → Lifestyle/Phone/Store, Content Desk → Market, poster → detail, detail → auction, and bid → feedback. Test warm and cold navigation on a normal and slower device profile.
- Run with a new career and a synthetic long save. Do not mutate the user's original save for benchmarking. Record counts of lots, historical titles, projects, and auction sessions alongside timings.
- Record the signed-contract and active-auction fixtures that must be identical after the release. Establish a browser console/error baseline.

**Exit:** Bottlenecks ranked by measured cost, with a reproducible baseline and no save mutation.

### Phase 1 — Loading and navigation

- Replace the `React.lazy` declarations for Home, Career, Phone (`MobilePage`), and Lifestyle with static imports. Remove those four from the navigation-time/idle preload path; the page modules must already be available before their first tap.
- Make navigation among these four pages display the destination directly, without the shared `Loading screen…` page fallback. Keep a fallback only where another genuinely deferred, non-core screen requires it; it must not appear while opening any of the four core pages.
- Benchmark cold startup as well as first and repeated taps. Eager imports can increase initial JavaScript download, parsing, and memory; if that regresses, split or optimize heavy optional subflows inside the pages without making the four core page entries lazy again. Profile any remaining render or save-state delay instead of treating eager import as a complete performance fix.
- Remove the separate fixed 650 ms startup loading reveal delay. Review the 1,470 ms branded ident separately: it is not the same as the page-loading fallback and needs explicit branding approval to change.
- Preserve real startup asset/storage/save-summary tasks and recovery actions. If those fail or take materially long, show truthful status/error rather than a blank screen or fake timer.

**Exit:** First and repeated visits to Home, Career, Phone, and Lifestyle use no route-level lazy import and never show `Loading screen…`; taps respond directly; measured cold startup remains acceptable against the Phase 0 baseline; save/recovery errors still work.

### Phase 2 — Market entry, detail, and auction responsiveness

- Build one reusable, current-player market snapshot from canonical saved state, rather than independently recomputing overlapping listing/collection/auction/library selectors at every render. Index projects and historical titles by ID once per snapshot.
- Prepare likely Market data while the Content Desk is visible, within an idle/memory budget. Opening the Market reads the current snapshot; any invalidated snapshot is rebuilt safely without rerolling or changing market offers.
- Remove selection-based full-subtree remounts unless a specific scene truly needs a reset. Limit initial poster/render work and avoid duplicating the same title across several default rails.
- Separate auction-room visual countdown/feedback from unnecessary whole-player migration work, while retaining canonical persisted event/settlement rules. Reconcile on resume, exit, bid, and material room events; test app-background/restore so this cannot be used to extend or replay an auction.

**Exit:** Add Content acknowledges immediately and Market content paints within the measured target set from Phase 0; poster/detail/room/bid do not freeze input; no auction, price, or save semantics drift.

### Phase 3 — Market language and visual system

- Replace `In the room now` with **Live bidding**, `Everyone is talking about these` with **Hot now**, and `Already proven` with **Box-office proven**. Use status labels **Live bid**, **Fixed-price licence**, **Coming soon**, and **Rights unavailable** where appropriate. Keep Marquee as a separate premium-quality marker.
- Card footers must show either a clear guarantee price, `Bid for rights`, or `Your studio title`; never bare `ROOM`. Detail actions must distinguish `Enter live bid`, `Negotiate rights`, and `License at listed terms`. Explain territory, duration, exclusivity, guarantee, and backend before confirmation.
- Redesign Private Scouting and First Look as compact, aligned modules using the existing dark/amber/gold Actor Empire vocabulary. Paid scouting price, cycle count, next free rotation, and preserved existing deals stay visible without wall-of-copy cards.
- Move status, premium marker, and rating into non-overlapping poster areas; verify narrow mobile widths and minimum 44 px tap targets. Rails should have distinct purposes and not repeat the same lead titles by default.

**Exit:** No colliding poster labels; a new player can tell auction vs fixed-price vs unavailable rights without opening a detail; layout matches existing production-house quality and passes mobile checks.

### Phase 4 — Price balance and readable money

- Make contract duration and rights scope explicit before changing amounts. Rebalance **newly created** market offers and new quotes using quality/format, territories, term, exclusivity, audience potential, and market competition. Calibrate against studio budgets and platform cash by simulation, not an arbitrary across-the-board multiplier.
- Preserve the stored price/terms of signed deals, live auction lots, and existing current-cycle offers. Apply new pricing at a future cycle boundary or through a versioned offer rule so old saves do not experience a silent price jump mid-negotiation.
- Use a shared money display rule with K/M/B/T suffixes in Market summary and cards; keep exact figures where precision matters in confirmation/contract records.
- Balance-test new and long saves: ordinary players can build an initial catalogue; wealthy players face meaningful premium prices; rivals remain funded but do not empty the player-first supply.

**Exit:** Price is understandable as a licence, tiers feel consequential, large treasury values are readable, and historical contracts remain unchanged.

### Phase 5 — Full regression and release gate

- Run focused TypeScript/build, startup/navigation, Content Market, bidding/settlement, historical catalogue, pricing, migration, and save-integrity audits.
- Browser-test the reported paths on phone-sized and desktop layouts with fresh/long-save fixtures. Repeat timing measurements from Phase 0; do not claim responsiveness from a build pass alone.
- Compare pre/post serialized saves and contract fixtures; confirm no lost projects, no duplicated auction settlement, no rerolled offers on reopen, and no unexpected price changes.

**Exit:** All scoped tests pass, target interactions feel immediate in-browser, and saved careers are safe. If any target fails, hold the coordinated release and report the precise unresolved path.

## Approval decisions for review

1. This draft treats the Market as a **limited-term streaming-rights market**, not permanent movie-IP purchases. Pricing will rise only after a measured balance pass, and existing contracts/offers will be protected.
2. Home, Career, Phone, and Lifestyle are explicitly **not lazy-loaded**. The plan also removes their page-to-page full-screen loading and the extra startup reveal delay, but does **not** automatically remove the previously approved Zedbury studio ident. If you mean to remove the ident too, that should be a separate explicit design change.
3. It prioritizes real responsiveness and truthful recovery over displaying a loader for a fixed number of milliseconds.

No game behaviour is changed by this document. The implementation plan and code work follow review of these decisions.
