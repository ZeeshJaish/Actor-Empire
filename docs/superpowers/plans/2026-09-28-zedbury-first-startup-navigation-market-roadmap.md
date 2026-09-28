# Zedbury-first startup, navigation, and Content Market roadmap

Date: 2026-09-28

Status: **Phases 0, 2, and 3 web-verified; Phase 1 web implementation and career-loader polish verified but native release gate open; Phases 4–5 not implemented.** Phase 1 evidence: [QA report](../reports/2026-09-28-zedbury-first-phase1-qa.md). Phase 2 root cause: [diagnostic report](../reports/2026-09-28-market-phase2-diagnostic.md). Phases 2–3 implementation and QA: [combined report](../reports/2026-09-28-market-phases2-3-qa.md).
Supersedes the phase sequence in [the earlier navigation/Market draft](../specs/2026-09-28-navigation-content-market-experience-design.md). Phase 0 evidence remains in [the baseline report](../reports/2026-09-28-navigation-market-phase0-baseline.md).

## Outcome the player should see

1. The **first visible branded frame is Zedbury Studios**, not an Actor Empire preparation message. Match the web pre-JavaScript shell and Android/iOS launch surfaces to the approved ident; the React ident then continues without a duplicate replay or visual flash.
2. After Zedbury, the **Actor Empire 0–100 loading screen** prepares the game. Its status line describes actual work (for example, loading game screens, checking game files, opening career storage, checking save slots, getting the studio ready). Percentage reflects completed startup tasks, not an invented timer or byte count.
3. The Start Career menu does not open until **all navigable game screens and their visible lazy UI widgets are code-ready**. First taps to Home, Career, Improve, Social, Lifestyle, Phone, Store, Creation, Settings, Death, and event screens must not fetch page code or show `Loading screen…`/`Preparing screen…`. The detailed market/region-map widgets are included, not left to replace themselves after opening.
4. Page readiness is distinct from **career-specific data**. Before a save slot is chosen, startup can inspect save summaries but cannot hydrate every possible career. After the player selects a slot, show a **second, career-opening loading scene** in the same Actor Empire visual family while that save is verified, migrated if necessary, and prepared for Home. It must not claim a portrait or identity from an unverified save. The later approved design uses a lightweight animated scene-card deck and a compact rotating tip card, not actor silhouettes or text-heavy copy. Advancing a week, telemetry, and other non-navigation operations may still do real work; none should reintroduce a fake page loader.
5. Content Market entry, auction participation, language, layout, and prices receive the previously scoped fixes, with no silent change to existing contracts, offers, or saves.

## Architecture decision and boundaries

Use a **small branded bootstrap** followed by one startup-gated game UI load. The bootstrap is capable of painting Zedbury before the main game code executes. The full game UI may be fetched as a startup unit so the Actor Empire loader can honestly wait for it; inside that unit, do not use `React.lazy` for navigable pages or nested UI that would fetch code after the Start Career menu opens. One startup-only code import is not gameplay lazy navigation. This keeps the progress screen useful without forcing the entire game bundle to block the first branded frame.

Do **not** turn the percentage into a claim that every save, generated world, image, or background system is precomputed. Do not eagerly execute weekly simulation (`services/gameLoop`), optional Firebase telemetry, or save-specific migrations merely to make the bar move. Do not replace storage failures with an unconditional 100% bar. Preserve the existing root/startup recovery actions and the approved Zedbury ident design; change its handoff/order, not its visual identity. The selected-career loader has its **own** progress state; it must not reuse a completed startup percentage.

An all-static single bundle with no bootstrap is rejected because its download and parsing happen before React can paint the requested 0–100 screen. Idle/predictive preloading is rejected because it leaves first-navigation races. The selected boundary is **all player-visible UI code ready before play, expensive non-UI operations on demand**.

## Phase sequence

### Phase 0 — Reproducible baseline and save-safety contract — COMPLETE

- Existing isolated browser measurements cover first Home → Career/Phone, Content Desk → Market, detail → auction room, and bid → feedback on normal and 4×-slowed CPU with small/long synthetic saves.
- Reproducible first-visit `Loading screen…` was observed for Career and Phone. Normal median delays were approximately 379–384 ms for Add Content, 570–574 ms for room entry, and 409–413 ms for bid feedback; 4× CPU figures were substantially higher. These are lab measurements, not real-device guarantees.
- Six save/rights/auction audits passed before changes. The user's personal save was not benchmarked or mutated.

**Phase 0 remains closed.** Phase 1 adds a *new* cold-boot/native baseline needed for the expanded startup scope; it does not relabel Phase 0 as unfinished.

### Phase 1 — Zedbury-first boot and all-screen readiness

**Work**

- Measure cold boot from first native/web frame through Start Career, including old phone/WebView profiles, total JavaScript bytes, parse time, memory, and first usable tap. Record both warm-cache and cold-cache cases before changing loading architecture.
- Make `index.html`'s pre-React shell Zedbury-branded instead of the current `AE / Starting Actor Empire` card. Check Android `@drawable/splash` and iOS `LaunchScreen.storyboard` assets so the first native frame does not contradict the web frame. Preserve native platform launch requirements.
- Give a single startup host ownership of the Zedbury → Actor Empire handoff. The approved 1,470 ms ident may remain; the extra fixed 650 ms loading reveal is removed. If game code is ready early, transition only after the ident; if it is late, stay on honest startup progress. No ident replay when the main `App` mounts.
- Replace every game UI `React.lazy` boundary in `App.tsx`, `StepMarkets.tsx`, and `InteractiveRegionMap.tsx` with a startup-ready UI dependency path. Include the detailed country-shape map import or ensure its identical detail is prepared before play. Remove the obsolete idle navigation preload/race and route-level Suspense fallback without removing error boundaries.
- Extend startup coordination/presentation to include game-screen readiness as a real, retryable task. Use phase-accurate copy and monotonic task-based progress; never invent smooth percentage movement while nothing completes. Keep `APP_CORE`, critical assets, storage, save summaries, and first-screen responsibilities coherent after moving the bootstrap boundary.
- On the startup Actor Empire loader, show the current task and percentage in one row above the progress bar; do not repeat the task below it. If work lasts noticeably longer, use the minimal reassurance **Taking a moment. Your careers are safe.** Do not show a slow-loading warning during a fast path. Visuals must fit phone widths, preserve text contrast, and respect reduced-motion settings.
- Keep save-slot hydration and migration after slot selection, with a distinct `opening career` presentation/state. Show immediate visual acknowledgement when an existing slot is chosen, before potentially slow verification or migration. Reuse the gold/black Actor Empire loading language, not the Zedbury ident. Use a lightweight scene-card deck and compact tips in the career loader; no actor silhouettes or heavy portrait download on either critical path.
- Give the career-opening scene stage-accurate copy such as **Opening your career**, **Verifying your save**, **Updating older career data** (only when needed), and **Gearing up your actor**. Its progress counts only actual save-opening steps; if exact fractional progress is unavailable, use milestone progress or an honest indeterminate state rather than showing startup's already-complete `100%`. Clear the scene immediately when Home is ready, without a cosmetic hold.
- Preserve safe boot, retry, recovery, and watchdog behavior if the full UI package or IndexedDB fails. A corrupt/unverified save must show the existing recovery route or return to its slot safely; do not overwrite or auto-delete it. No write to existing saves is required by UI-code loading.

**Exit gate**

- First visible frame is Zedbury on browser, Android, and iOS; Zedbury plays once, followed by Actor Empire loading and then Start Career. No Actor Empire preparation text appears before Zedbury.
- Start Career opens only after every in-scope UI module is ready. First and repeated navigation across all pages and the detailed map has no code-fetch loader or late low-detail-to-high-detail swap.
- The loading status/percentage correspond to real completed tasks; failed code/asset/storage tasks remain on screen with working recovery. Cold-start time and peak memory are measured against the new Phase 1 pre-change baseline, and regressions on the slow profile are fixed or explicitly brought back for review before proceeding.
- Choosing an existing career shows the separate actor-themed opening scene promptly, reports only save-opening work, and never starts at the global startup's `100%`. Fast saves are not held for animation. Legacy migration, missing/corrupt generation, recovery-available, and retry paths are tested without changing the original save unexpectedly.
- Existing saves and migration fixtures remain unchanged; native startup, intro-flow, and browser navigation audits pass.

### Phase 2 — Content Market responsiveness — WEB VERIFIED

**Work**

- Profile, then remove duplicate derived-market work at Content Desk → Add Content. Build a reusable current-player market snapshot/index from canonical data; invalidate it on real player/market changes without rerolling offers.
- Profile room-entry and bid-submit paths separately. Reduce unnecessary whole-player migration and selection-based remounts while preserving one canonical auction state, rival bids, countdown, settlement, and resume rules.
- Provide immediate pressed/processing feedback when an actual bid or market computation cannot finish in the next frame. The feedback clears on completion; no fixed-duration overlay or page-loading screen.

**Exit gate**

- Repeat Phase 0's exact synthetic fixtures. Add Content, room entry, and bid feedback have a visible first response promptly and materially lower click-to-paint times than the baseline on both CPU profiles. A target is at least a 50% median reduction for the three measured bottlenecks; if a target is missed, profile and report why rather than calling the phase complete.
- Opening/reopening Market does not reroll supply; auction resume does not extend time, replay bids, or duplicate settlements. Save/rights audits stay green.

### Phase 3 — Market meaning and visual cleanup — WEB VERIFIED

**Work**

- Use **Live bidding**, **Hot now**, and **Box-office proven** for the relevant rails. Explain that `Open` currently means an available fixed-price **licence**, while `Marquee` is a premium-quality marker, not a buying method.
- Distinguish `Enter live bid`, `Negotiate rights`, and fixed-price licensing in card footers and detail actions. Show term, territories, exclusivity, guarantee, and any backend before confirmation; do not imply ownership of the film IP.
- Redesign Private Scouting and First Look as compact modules in Actor Empire's dark/amber/gold system. Separate poster status, Marquee marker, and rating so none overlap. Reduce duplicate lead titles across rails; check phone widths, focus, contrast, and 44 px touch targets.

**Exit gate**

- A first-time player can tell auction from fixed-price rights without opening detail; no `ROOM` shorthand or colliding poster badges remain. Existing price, cycle, first-look, and deal semantics are unchanged by copy/layout work.

### Phase 4 — Price balance and money readability

**Work**

- Calibrate **future** offers using project quality/format, term, territory, exclusivity, audience potential, competition, and studio/platform finances. Do not apply a blanket multiplier simply because current screenshots look cheap.
- Version the new quote rules or start them at a future market cycle. Preserve signed deals, live auctions, and current-cycle offers at their stored terms in old saves.
- Use shared K/M/B/T display in Market summaries/cards and exact numbers in confirmation/contract records.

**Exit gate**

- New and long-save simulations show accessible starter supply, meaningful premium pricing, funded-but-not-all-consuming rivals, and no mid-negotiation repricing. Contract fixtures remain byte/semantically stable as appropriate.

### Phase 5 — Integrated QA and release gate

**Work**

- Run build/type checks, intro/startup/navigation audits, market/auction/rights audits, save-integrity/migration/generation audits, and the Phase 0 browser benchmark again.
- Test browser phone/desktop and real or representative Android/iOS devices: cold/warm cache, offline/failed module download, IndexedDB failure/retry, new save, legacy save, long save, background/resume during auction, and first visit to every player-visible page and detailed map.
- Compare startup time, peak memory, interaction timings, serialized saves, contracts, lot identity, settlement count, and console/runtime errors against the recorded baselines. Do not test destructively on a player's only save.

**Exit gate**

- No in-game page lazy-load screen, correct Zedbury-first order, honest startup progress, responsive Market, clarified UI/prices, and no save/auction regression. If any gate fails, hold the coordinated release and document the unresolved path.

## Implementation map and ownership

| Area | Existing code to inspect/change during its phase | Guardrail |
| --- | --- | --- |
| First browser frame | `index.html`, `index.tsx` | Keep an early watchdog and visible recovery if JavaScript never mounts. |
| Native first frame | `android/app/src/main/res/**/splash.png`, `android/app/src/main/res/values/styles.xml`, `ios/App/App/Base.lproj/LaunchScreen.storyboard`, `ios/App/App/Assets.xcassets/Splash.imageset` | Do not claim native parity from browser testing. |
| Ident and loaders | `components/ZedburyStudiosIntro.tsx`, `components/ActorEmpireIntro.tsx`, `services/startupCoordinator.ts`, `services/startupPresentation.ts`, `App.tsx` | One ident owner; separate startup and selected-career progress; retry/recovery remains. |
| Selected-career opening | `App.tsx`, `services/storage.ts`, `services/saveMigration.ts`, `components/SaveRecoveryModal.tsx` | Generic actor art before verification; never use cached identity as proof or rewrite a failed save. |
| UI readiness | `App.tsx`, `services/startupHomeScreen.ts`, `views/lifestyle/business/components/InteractiveRegionMap.tsx`, `components/studio-finance/components/launch/StepMarkets.tsx`, `components/studio-finance/components/build/CountryShape.tsx` | No first-tap code import for visible UI; non-UI simulation may remain deferred. |
| Market interaction | `components/StreamingContentMarket.tsx`, `components/StreamingBuyerAuctionRoom.tsx`, `services/streamingContentMarket.ts`, `services/streamingBuyerAuctions.ts`, `content-market-exact/adapter.ts` | Deterministic offers and canonical settlement unchanged. |
| Market presentation/balance | `content-market-exact/ExactContentMarket.tsx`, `content-market-exact/ContentMarket.module.css`, `services/streamingOpportunityMarket.ts`, `services/streamingCatalog.ts` | Signed/current offers stay at stored prices. |

Each phase gets a focused, test-first execution plan when approved. The shared working tree currently contains many unrelated edits; implementation must preserve them, avoid broad rewrites, and not commit or deploy without a separate request.
