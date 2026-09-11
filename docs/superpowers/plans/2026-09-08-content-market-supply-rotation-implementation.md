# Content Market Supply and Rotation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate the player Content Market from canonical saved projects, provide immediate founding-stage depth through real single-seller collections, and rotate the discovery inventory deterministically every three weeks.

**Architecture:** Add a small, pure supply-policy service for cycle/profile/selection rules; keep canonical project indexing in `streamingCatalog.ts`; and continue building contracts, packages, and auction lots through the existing rights services. Market discovery remains derived, while negotiations, auction sessions, signed packages, and contracts remain the only durable records.

**Tech Stack:** React, TypeScript, Vite, existing deterministic RNG, existing streaming rights compatibility/contracts/packages/buyer auctions, script-based audits.

**Spec:** `docs/superpowers/specs/2026-09-08-content-market-supply-rotation-design.md`

**Status (September 8, 2026):** Implemented and verified with the focused Content Market/streaming-rights audits, TypeScript, production build, and an in-app browser walkthrough of the populated fixture gate, market floor, and collection auction detail. The optional Node Playwright audit remains unavailable in this checkout because `playwright` is not installed; no dependency was added solely for this feature. A save-backed real-game week-by-week walkthrough remains a separate manual QA pass.

## Global Constraints

- Never generate a project to satisfy a market count; every surfaced title resolves to `player.world.projects`, eligible `player.pastProjects`, a canonical platform-trade contract, or an existing canonical upcoming-rights record.
- Keep collections single-seller in this phase.
- Use a three-week cycle: `Math.floor(absoluteWeek / 3)`.
- Same save, seed, and cycle must produce identical discovery inventory after reload.
- Keep direct listings at 12 or fewer, founding collections at 6 or fewer, regular collections at 4 or fewer, and current direct/package auctions at 3 or fewer in total.
- The founding supply boost is active only while the owned platform is `FOUNDING` and fewer than 12 absolute weeks have elapsed since incorporation.
- Preserve all active private offers, buyer auction sessions, signed rights, catalogue links, upcoming follows, and acquired-platform catalogue state.
- Recheck rights compatibility at settlement and never charge treasury for an invalidated transaction.
- Add no persisted market snapshot and no save migration field.
- Preserve unrelated worktree changes and do not commit or push without explicit user authorization.

---

### Task 1: Canonical Candidate Pool and Three-Week Selection

**Files:**
- Create: `services/streamingMarketSupply.ts`
- Modify: `services/streamingCatalog.ts`
- Create: `scripts/audit-content-market-supply-rotation.ts`
- Modify: `package.json`

**Interfaces:**
- Produces: `getStreamingMarketCycle(absoluteWeek: number): number`
- Produces: `getStreamingMarketSupplyProfile(player: Player): StreamingMarketSupplyProfile`
- Produces: `selectStreamingMarketTitles(player: Player, candidates: StreamingCatalogTitle[], limit?: number): StreamingCatalogTitle[]`
- Produces: `getStreamingLicenseCandidatePool(player: Player): StreamingCatalogTitle[]`
- Preserves: `getStreamingLicenseOpportunities(player: Player): StreamingCatalogTitle[]`, now as the bounded rotating projection.

- [x] **Step 1: Write the failing canonical-pool tests**

Add a fixture builder that creates several NPC studios and at least 80 distinct `world.projects`. Assert that the full pool contains every valid, non-player-owned, non-catalogued canonical ID; excludes malformed, player-owned, duplicate, and already-catalogued IDs; and does not contain any ID absent from both canonical source arrays.

```ts
const player = buildSupplyFixture({ projectCount: 84, studios: 4 });
const pool = getStreamingLicenseCandidatePool(player);
const canonicalIds = new Set([
  ...player.world.projects.map(project => project.id),
  ...player.pastProjects.map(project => project.id),
]);
assert.ok(pool.length > 12, 'The underlying pool is not limited to the mobile storefront.');
assert.ok(pool.every(title => canonicalIds.has(title.id)), 'Market supply never invents a title.');
assert.equal(new Set(pool.map(title => title.id)).size, pool.length, 'Canonical IDs are deduplicated.');
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:content-market-supply-rotation`

Expected: compilation fails because `getStreamingLicenseCandidatePool` and the new audit script entry do not exist.

- [x] **Step 3: Implement the complete canonical pool**

Extract the existing candidate construction from `getStreamingLicenseOpportunities` into an exported full-pool function. Validate non-empty `id`, `title`, and `studioId`, deduplicate by canonical ID, exclude player-owned and already-catalogued titles, and retain the current deterministic baseline sort.

```ts
export const getStreamingLicenseCandidatePool = (player: Player): StreamingCatalogTitle[] => {
  // Build only from saved canonical world/career records.
  // Validate, deduplicate, filter owned/catalogued IDs, then baseline-sort.
};
```

- [x] **Step 4: Write the failing three-week determinism tests**

Assert identical IDs in weeks 0, 1, and 2 of one cycle; a changed rotating portion in the next cycle; at most 12 results; up to three top-ranked headliners preserved; and identical JSON after structured-clone reload.

```ts
const week1200 = withAbsoluteWeek(player, 1200);
const week1202 = withAbsoluteWeek(player, 1202);
const week1203 = withAbsoluteWeek(player, 1203);
assert.deepEqual(ids(getStreamingLicenseOpportunities(week1200)), ids(getStreamingLicenseOpportunities(week1202)));
assert.notDeepEqual(ids(getStreamingLicenseOpportunities(week1200)), ids(getStreamingLicenseOpportunities(week1203)));
assert.deepEqual(
  getStreamingLicenseOpportunities(week1200),
  getStreamingLicenseOpportunities(structuredClone(week1200)),
);
```

- [x] **Step 5: Run the audit and verify the new assertions fail**

Run: `npm run audit:content-market-supply-rotation`

Expected: the old top-12 projection remains unchanged across cycle boundaries.

- [x] **Step 6: Implement the pure supply policy**

Create the profile and selector without writing state:

```ts
export interface StreamingMarketSupplyProfile {
  absoluteWeek: number;
  cycle: number;
  cycleStartAbsoluteWeek: number;
  foundingBoost: boolean;
  directLimit: 12;
  collectionLimit: 4 | 6;
  collectionMaximumSize: 24 | 50;
  auctionLimit: 2 | 3;
}

export const getStreamingMarketCycle = (absoluteWeek: number) =>
  Math.max(0, Math.floor(absoluteWeek / 3));
```

Rank three headliners by rating, gross, release year, and ID. Rank the remaining candidates by a deterministic hash/RNG key built from `simulationSeed`, cycle, project ID, format, genre, and seller. Fill the remaining slots round-robin across format/genre/seller buckets before falling back to the ranked remainder. Update `getStreamingLicenseOpportunities` to call the full pool and selector.

- [x] **Step 7: Run Task 1 checks and verify GREEN**

Run: `npm run audit:content-market-supply-rotation`

Expected: canonical provenance, bounded selection, cycle rotation, headliner continuity, and reload determinism pass.

---

### Task 2: Founding Supply and Real Single-Seller Collections

**Files:**
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `scripts/audit-content-market-supply-rotation.ts`
- Modify: `scripts/helpers/contentMarketFixture.ts`

**Interfaces:**
- Consumes: `getStreamingLicenseCandidatePool`, `getStreamingMarketSupplyProfile`, `getStreamingMarketCycle`, and `selectStreamingMarketTitles`.
- Preserves: `getStreamingCataloguePackageOpportunities(player): StreamingCataloguePackageOpportunity[]`.
- Produces only existing `StreamingCataloguePackage` and `StreamingCataloguePackageOfferRow` records; no new saved type.

- [x] **Step 1: Write failing founding-profile and collection-depth tests**

Build a world with six NPC studios and at least 30 eligible projects per studio. Assert that a newly incorporated `FOUNDING` platform gets no more than six collections; each eligible deep collection contains 15–50 real projects from exactly its declared seller; the total unique package components provide substantial launch supply; and an `ACTIVE` or 12-week-old platform gets no more than four collections with no more than 24 components each.

```ts
const foundingCollections = getStreamingCataloguePackageOpportunities(foundingPlayer);
assert.ok(foundingCollections.length >= 4 && foundingCollections.length <= 6);
for (const offer of foundingCollections) {
  assert.ok(offer.rows.length >= 15 && offer.rows.length <= 50);
  assert.ok(offer.package.components.every(component =>
    component.sellerStudioId === offer.package.seller.id
    && worldProjectIds.has(component.sourceProjectId)));
}
assert.ok(new Set(foundingCollections.flatMap(offer => offer.rows.map(row => row.componentProjectId))).size >= 100);
assert.ok(getStreamingCataloguePackageOpportunities(regularPlayer).every(offer => offer.rows.length <= 24));
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:content-market-supply-rotation`

Expected: current collections contain at most five titles and only inspect the 12-title storefront pool.

- [x] **Step 3: Build collections from the full canonical pool**

Change package grouping to consume `getStreamingLicenseCandidatePool(player)`, group strictly by `studioId`, and deterministically select components per seller using the current market cycle. Build the rights lot for every selected component and discard invalid components before deciding whether the seller has at least three legitimate titles.

Use `collectionMaximumSize` and `collectionLimit` from the profile. Keep the existing valuation/allocation system, package type, single seller, canonical component IDs, and atomic settlement boundary. Replace the local four-week `marketCycle` helper with the shared three-week cycle.

- [x] **Step 4: Write failing package accounting and sparse-world tests**

Assert that every offer-row project exists in its package, allocated guarantees sum exactly to `totalGuarantee`, signing creates one canonical contract per component, and a seller with only seven eligible projects produces a seven-title collection without filler.

```ts
assert.equal(collection.rows.reduce((sum, row) => sum + row.minimumGuarantee, 0), collection.totalGuarantee);
const signed = signOwnedStreamingCataloguePackage(player, collection.id);
assert.equal(signed.contracts.length, collection.package.components.length);
assert.ok(signed.contracts.every(contract => worldProjectIds.has(contract.sourceProjectId)));
assert.equal(sparseCollection.rows.length, 7);
```

- [x] **Step 5: Run the audit and verify RED, then retain existing settlement logic**

Run: `npm run audit:content-market-supply-rotation`

Expected: sparse/deep sizing or settlement assertions fail until package composition is updated. Do not change settlement calculations merely to satisfy the supply tests.

- [x] **Step 6: Complete collection compatibility filtering and verify GREEN**

Use `buildStreamingBiddingRightsLot` as the discovery gate. If a component has no valid remaining rights lot, exclude it; if fewer than three valid components remain, omit that seller collection. Keep final `resolveStreamingRightsCompatibility` checks in `signOwnedStreamingCataloguePackage` unchanged.

Run: `npm run audit:content-market-supply-rotation`

Expected: deep and sparse worlds, canonical provenance, per-title allocation, and signing pass.

---

### Task 3: One Bounded Auction Allocation per Market Cycle

**Files:**
- Modify: `services/streamingContentMarket.ts`
- Modify: `services/streamingBuyerAuctions.ts`
- Modify: `services/streamingRightsMarketplace.ts`
- Modify: `scripts/audit-content-market-supply-rotation.ts`

**Interfaces:**
- Produces: `getContentMarketAuctionAssignments(player: Player): { listingIds: Set<string>; collectionIds: Set<string> }`.
- Preserves: `getContentMarketAuctionListings`, `getContentMarketAuctionCollections`, and `getStreamingBuyerAuctionLots`.

- [x] **Step 1: Write failing auction-count and cycle-identity tests**

Assert no more than three current direct/package auction lots during the founding boost, no more than two afterward, stable IDs during all three weeks of a cycle, and changed discovery assignments after the cycle rolls.

```ts
const lots1200 = currentMarketLots(getStreamingBuyerAuctionLots(withAbsoluteWeek(player, 1200)));
const lots1202 = currentMarketLots(getStreamingBuyerAuctionLots(withAbsoluteWeek(player, 1202)));
assert.ok(lots1200.length <= 3);
assert.deepEqual(ids(lots1200), ids(lots1202));
```

- [x] **Step 2: Run the audit and verify RED**

Run: `npm run audit:content-market-supply-rotation`

Expected: the separate `index % 3` rules exceed the combined cap and auction IDs vary by absolute week.

- [x] **Step 3: Implement a shared deterministic assignment**

Build one combined list of eligible direct listings and collections, score it from platform seed + shared cycle + opportunity ID, preserve at least one title lot when one exists, and select only `profile.auctionLimit` IDs. Derive both existing auction getter functions from this one assignment so one opportunity cannot be both direct-buy and auction inventory.

Replace auction-lot ID input `absoluteWeek` with the shared cycle number:

```ts
const cycle = getStreamingMarketCycle(absoluteWeek);
const id = createDeterministicId('streaming_buyer_auction_lot', listing.id, cycle);
```

Use the cycle start only for random market/rival identity. Continue using the real absolute week for contract start dates and remaining-duration validation.

- [x] **Step 4: Write failing active-session continuity test**

Open an auction in one cycle, progress to the next cycle, and assert the stored session and frozen lot remain accessible even when the source opportunity is no longer assigned to the discovery floor. Assert no fresh current lot duplicates the stored session's rights.

- [x] **Step 5: Run the audit and verify RED, then preserve frozen sessions**

Run: `npm run audit:content-market-supply-rotation`

Expected: the live stored session either disappears from the test projection or a duplicate current lot is exposed.

Ensure discovery getters only produce new current lots. Continue resolving active/closed sessions from `ownedStreamingPlatform.buyerAuctionSessions`, as the component already does, and exclude rights represented by a live stored session from new current assignments.

- [x] **Step 6: Run Task 3 checks and verify GREEN**

Run: `npm run audit:content-market-supply-rotation`

Expected: total cap, three-week identity, assignment rotation, and active-session continuity pass.

---

### Task 4: Market Presentation Counts and Large-Collection Readability

**Files:**
- Modify: `services/streamingContentMarket.ts`
- Modify: `components/StreamingContentMarket.tsx`
- Modify: `content-market-exact/adapter.ts`
- Modify: `content-market-exact/ExactContentMarket.tsx`
- Modify: `scripts/audit-content-market-ui-transplant.tsx`
- Modify: `scripts/audit-content-market-browser.cjs`

**Interfaces:**
- Produces: `getContentMarketSupplySummary(player: Player): { directListings: number; collections: number; collectionTitles: number; liveAuctions: number; totalCanonicalTitles: number; foundingBoost: boolean; nextRotationAbsoluteWeek: number }`.
- Consumes only existing listing, collection, and auction projections; it does not persist counters.

- [x] **Step 1: Write failing summary and rendering tests**

Assert the summary counts unique canonical project IDs rather than counting a 40-title collection as one title. Assert the Add Content market entrance reports title access and live rooms accurately, and collection cards remain summaries rather than expanding all component rows on the market grid.

```ts
const summary = getContentMarketSupplySummary(player);
assert.equal(summary.collectionTitles, uniqueCollectionComponentIds.size);
assert.equal(summary.totalCanonicalTitles, uniqueDirectAndCollectionIds.size);
assert.match(markup, new RegExp(`${summary.totalCanonicalTitles} TITLES`));
```

- [x] **Step 2: Run focused UI audit and verify RED**

Run: `npm run audit:content-market-ui-transplant`

Expected: the gate still reports only the number of direct listing cards.

- [x] **Step 3: Connect honest market counts without redesigning the transplanted UI**

Use the summary for the existing gate metadata. Keep the exact transplanted visual language and card structure. Show collection size on package cards and a concise Founding Market/next-refresh line where metadata already exists; do not add a new dashboard or expose backend scores.

In collection detail, initially render the first 12 rows and reveal further rows in 12-item chunks using local component state. This keeps all real terms inspectable without rendering up to 50 allocation rows at once.

- [x] **Step 4: Browser-check mobile behavior and verify GREEN**

Run: `npm run audit:content-market-ui-transplant`

Run: `npm run audit:content-market-browser`

Expected: gate counts reflect unique canonical title access; large collections open, expand, and retain their actions at mobile width; no horizontal overflow or misleading card counts.

---

### Task 5: Regression, Save Safety, and Final Verification

**Files:**
- Modify only files implicated by a failing regression in Tasks 1–4.
- Update: `docs/superpowers/plans/2026-09-08-content-market-supply-rotation-implementation.md` checkboxes after fresh verification.

**Interfaces:**
- No new interfaces.
- Confirms the feature remains derived and backward compatible.

- [x] **Step 1: Add final regression assertions**

Extend the focused supply audit to prove an acquired/active platform keeps existing catalogue IDs and contracts unchanged, active private negotiations remain in `Your Offers` after a cycle roll, and cloning/reloading adds no market snapshot field to the platform state.

- [x] **Step 2: Run focused domain audits**

Run:

```bash
npm run audit:content-market-supply-rotation
npm run audit:content-market-cm1
npm run audit:content-market-cm2
npm run audit:content-market-cm3
npm run audit:content-market-cm4
npm run audit:streaming-catalog-phase6
npm run audit:streaming-rights-compatibility-phase3
npm run audit:streaming-catalogue-packages-phase5
npm run audit:streaming-rights-marketplace-phase16
npm run audit:streaming-launch-draft-continuity
```

Expected: all focused audits pass with no duplicate transaction, rights, or notification failures.

- [x] **Step 3: Run static and production checks**

Run:

```bash
npm run lint
npm run build
git diff --check
```

Expected: TypeScript, Vite production build, and whitespace checks pass.

- [ ] **Step 4: Complete one mobile-width game walkthrough**

Verify in the real game route, not only the fixture: first Content Market visit is immediately populated; advancing one and two weeks keeps discovery stable; the third-week boundary rotates the non-headliner inventory; direct purchase and collection signing create catalogue entries; an open private offer and auction session remain reachable after rotation; a sparse fixture shows fewer real offers and no filler.

- [x] **Step 5: Record the final report**

Report canonical source counts, visible direct/package/auction counts for founding and regular profiles, fresh audit/build evidence, and any intentionally sparse-world behavior. Do not claim a fixed 100–220 supply unless the tested save actually contains enough eligible canonical titles.
