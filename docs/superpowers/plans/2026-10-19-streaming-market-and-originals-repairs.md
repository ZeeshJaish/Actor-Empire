# Streaming marketplace and Originals repairs

**Goal:** Implement the approved auction, backend, continuation funding, finite shelf, deal-flow and Originals repairs without rewriting signed contracts or replaying money.

**Approved design:** The user's 19 October request and the preceding source-traced review. Repair existing flows; preserve budgets, rights windows, pricing, talent backend and signed obligations. No economic boosts or live-save edits.

## Execution

- [x] Auction entry and offer console: regressions for zero/one rivals, genuine reserves, subscription-only backend disabled and visible rejection; guarded opening when empty; sequel/next-season new funding only with explicit parent/installments; legacy NEW_ORIGINAL obligations continue unchanged.
- [x] Finite marketplace: save cycle title IDs and auction assignments, retain legacy and active room references, no same-cycle replenishment after buy/sign/open; scout is an explicit paid addition; rollover refreshes only at the existing boundary; JSON reload is stable.
- [x] Deal flow: identical advertised terms are accepted through private negotiation after normal response delay; reduced/changed terms retain seller evaluation; signing still revalidates funds/rights and is idempotent; signed UI removes stale invitation to sign.
- [x] Originals: one canonical readiness resolver recognizes completed production in old saves, preserves uncompleted/cancelled/future-window blocks, and is used by catalogue, routes and Originals status; overlay is fixed, above HQ, scrollable and keyboard/mobile usable.
- [x] Verify failing regressions before fixes, focused existing suites, full TypeScript/build, and disposable browser purchase/signing and Originals interactions at mobile/desktop sizes. Preserve unrelated dirty source and the user's actual career.
- [x] Explain Head of Rights versus Heads of Terms clearly; report current results, remaining limitations and screenshot evidence. No whole-game balance or native certification claim.

## File ownership

- Auction/funding: services/streamingBuyerAuctions.ts, services/streamingAuctionFunding.ts, components/StreamingBuyerAuctionRoom.tsx, content-market-exact/ContentMarket.module.css; additive continuation type fields only if required.
- Finite shelf/deals: services/streamingMarketSupply.ts, services/streamingOpportunityMarket.ts, services/streamingContentMarket.ts, services/streamingCatalog.ts, services/paidMarketScouting.ts, services/streamingRightsMarketplace.ts, components/StreamingContentMarket.tsx; additive market snapshot types.
- Originals: services/streamingContentAvailability.ts, services/streamingOriginals.ts, dedicated shared readiness helper, styles/streaming-originals-studio.css; focused tests/fixtures.

Use separate regression audits for each repair domain. Existing audits which encode superseded two-rival/new-original assumptions must be updated with explicit replacement assertions, retaining settlement and safety checks.

## Completion evidence

- Fresh impacted matrix: 38/38 suites pass, including a prepared-network Original → real launch → actual game-week viewing and receipts path.
- Full TypeScript and production build pass; diff whitespace check passes. Existing bundle-size warning remains.
- Actual browser: zero-/one-rival entry, subscription backend disabled with reason, rental backend editable, sequel-only funding, $55M advertised private proposal accepted after three weeks, signature changes $500M treasury to $445M and adds title once.
- Actual exported founder career in disposable memory: completed Original resolves DELIVERED; normal HQ overlay and premiere click work, desktop Escape restores focus to ORIGINALS; measured phone width 400px without horizontal overflow.
- Review additionally repaired frozen collection persistence, 50-title support, exact package rollover settlement, spent-AI-funds/conflicting-rights rejection, other commitments, current signing dates/original expiry and terminal snapshot cleanup.
- Detailed results and stage explanation: `docs/superpowers/reports/2026-10-19-streaming-market-and-originals-repairs.md`.
- Full-cost multi-year payback replay is supplemental economic evidence, not a blanket business-profit guarantee.

- Supplemental full-cost replay complete: 5/5 scenarios, 784/784 weekly check groups pass. Ads paid refresh cash payback 208 weeks; store paid refresh 132 weeks. 104-week premium subscription/ads remain losing strategies; report preserves those negative results.
