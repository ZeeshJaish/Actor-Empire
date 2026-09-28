# Streaming market phases 5–6 implementation plan

> **For agentic workers:** Execute inline with tests before production edits. Do not commit or modify unrelated dirty files.

**Goal:** Save a recurring three-week shelf of complete dormant projects and rights-valid collections, then let funded rivals source from a bounded competitive lane without emptying the player's shelf.

**Architecture:** A versioned world market state owns saved offers and their cycle anchor. A purchase transaction promotes one offer to the canonical project/rights system; an unbought offer is discarded on rotation. The existing historical library, actual studio Upcoming sales, rights checker, and AI production flows remain independent and authoritative.

**Tech Stack:** TypeScript, Vite, esbuild audit scripts.

**Spec:** `docs/superpowers/specs/2026-09-27-streaming-content-market-and-studio-talent-roadmap-design.md`

## Global constraints

- Keep the 2,000-title historical recipe, marquee records and legacy permanent rights intact.
- Never mutate NPC careers, studio money, news or award state for an unbought offer.
- Generate only at the saved weekly/migration transition; opening the market is read-only.
- Phase 7 paid scouting and price changes are outside this implementation.

### Task 1: Saved cycle and package generation

**Files:** `types.ts`, `services/streamingOpportunityMarket.ts`, `services/saveMigration.ts`, `services/streamingWeeklyLoop.ts`, `scripts/audit-streaming-opportunity-market-phases5-6.ts`.

- [x] Write an audit that loads an old save, initializes the market, checks 20 saved single-title offers plus 5 rights-valid collection references, serializes/reopens without reroll, and rotates exactly once after three absolute weeks. Run it and observe the missing API failure.
- [x] Add a versioned bounded world market state and deterministic generator using stable fictional cast/writer IDs and real studio producers; no UI read may generate. Persist at migration and week boundary.
- [x] Re-run the audit and existing historical-market/save-migration audits.

### Task 2: Player promotion and premiere boundary

**Files:** `services/streamingOpportunityMarket.ts`, `services/streamingContentMarket.ts`, `services/awardLogic.ts`, `services/streamingCatalog.ts`, `components/StreamingContentMarket.tsx`, `content-market-exact/model.ts`, `content-market-exact/adapter.ts`.

- [x] Add audit assertions: poor buyer unchanged; one funded purchase creates one project and compatible rights, charges once, credits seller/talent once; replay is unchanged; unpremiered project cannot appear in awards; premiere activates eligibility. Run red.
- [x] Implement atomic generated-package purchase, then expose its saved offers in the existing market UI as direct purchase cards. Keep studio Upcoming separate.
- [x] Re-run focused audit and rights audit; award eligibility is checked in the focused audit.

### Task 3: Bounded rival competition

**Files:** `services/streamingOpportunityMarket.ts`, `services/historicalMarketRivals.ts`, `services/worldEconomy/worldStreamingAiCatalogue.ts`, `scripts/audit-streaming-opportunity-market-phases5-6.ts`.

- [x] Add audit assertions for a 33-platform old save: starter first-look leaves buyable public stock; rival buys only with cash/runway and compatible territory; replay has no duplicate charge or project; brokered offers cannot collide with player offers. Run red.
- [x] Extend the saved cycle with a small brokered rival lane and per-cycle capacity; draw on existing historical rights first. Register purchases through the same canonical rights authority.
- [x] Run focused and regression audits, build, TypeScript check, then report exact caveats and phase status.
