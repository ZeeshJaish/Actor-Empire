/** Phase 4 quote contract: old economics stay stable and new rights reflect value/scope. */
import assert from 'node:assert/strict';
import { getStreamingLicenseQuote, type StreamingCatalogTitle } from '../services/streamingCatalog';
import { getStreamingRightsOpportunities } from '../services/streamingRightsMarketplace';
import { getStreamingMarketCycle } from '../services/streamingMarketSupply';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { processOwnedStreamingPlatformWeek } from '../services/streamingWeeklyLoop';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getContentMarketListings } from '../services/streamingContentMarket';
import { openStreamingPrivateOffer } from '../services/streamingRightsMarketplace';
import { initializeHistoricalCatalogue } from '../services/historicalCatalogue';
import { getStreamingBuyerAuctionLots, openStreamingBuyerAuction } from '../services/streamingBuyerAuctions';

const ordinary: StreamingCatalogTitle = {
  id: 'phase4-ordinary', title: 'Ordinary Feature', projectType: 'MOVIE', genre: 'Drama',
  rating: 7, releaseYear: 2024, gross: 50_000_000, studioId: 'studio-1', studioName: 'Studio One',
  source: 'EXTERNAL_MARKET', quality: 70, reach: 50, prestige: 50,
};
const premium: StreamingCatalogTitle = {
  ...ordinary, id: 'phase4-premium', title: 'Premium Series', projectType: 'SERIES',
  rating: 9, gross: 250_000_000, quality: 94, reach: 91, prestige: 88, catalogueTier: 'MARQUEE',
};

assert.equal(getStreamingLicenseQuote(ordinary, 'MULTI_REGION', 104, 'NON_EXCLUSIVE').suggestedGuarantee,
  6_000_000, 'Legacy quote must remain byte-for-byte stable for old drafts/offers');
const standard = getStreamingLicenseQuote(ordinary, 'MULTI_REGION', 104, 'NON_EXCLUSIVE', 2);
const domestic = getStreamingLicenseQuote(ordinary, 'DOMESTIC', 104, 'NON_EXCLUSIVE', 2);
const longer = getStreamingLicenseQuote(ordinary, 'MULTI_REGION', 156, 'NON_EXCLUSIVE', 2);
const exclusive = getStreamingLicenseQuote(ordinary, 'MULTI_REGION', 104, 'EXCLUSIVE', 2);
const premiumQuote = getStreamingLicenseQuote(premium, 'GLOBAL', 156, 'EXCLUSIVE', 2);
assert.ok(standard.suggestedGuarantee >= 20_000_000 && standard.suggestedGuarantee <= 45_000_000,
  'A solid normal movie should no longer be priced like a tiny catalogue filler');
assert.ok(domestic.suggestedGuarantee < standard.suggestedGuarantee && domestic.suggestedGuarantee >= 10_000_000,
  'A narrower domestic starter licence should remain attainable');
assert.ok(longer.suggestedGuarantee > standard.suggestedGuarantee);
assert.ok(exclusive.suggestedGuarantee > standard.suggestedGuarantee);
assert.ok(premiumQuote.suggestedGuarantee > standard.suggestedGuarantee * 4,
  'A high-quality global exclusive marquee series needs a meaningful premium');
assert.ok(premiumQuote.suggestedGuarantee <= 600_000_000,
  'A premium right must not become an unbounded economy-breaking quote');
const malformed = getStreamingLicenseQuote({ ...ordinary, gross: Number.NaN, quality: Number.NaN,
  reach: Number.NaN, prestige: Number.NaN, rating: Number.NaN }, 'MULTI_REGION', 104, 'NON_EXCLUSIVE', 2);
assert.ok(Number.isFinite(malformed.suggestedGuarantee) && malformed.suggestedGuarantee > 0,
  'Legacy numeric gaps must not turn a future quote into NaN');

const legacySave = contentMarketFixture();
delete legacySave.ownedStreamingPlatform.marketQuotePolicy;
const cycle = getStreamingMarketCycle(getAbsoluteWeek(legacySave.age, legacySave.currentWeek));
const legacyOffer = getStreamingRightsOpportunities(legacySave).find(offer => offer.title.id === 'cm1-film-0')!;
assert.ok(legacyOffer, 'Fixture needs a released market title');
const scheduled = structuredClone(legacySave);
scheduled.ownedStreamingPlatform.marketQuotePolicy = { version: 2, effectiveCycle: cycle + 1 };
const sameCycleOffer = getStreamingRightsOpportunities(scheduled).find(offer => offer.id === legacyOffer.id)!;
assert.deepEqual(sameCycleOffer.quote, legacyOffer.quote,
  'Installing a future price policy must not alter the current market-cycle offer');
assert.equal(sameCycleOffer.rivalBidAmount, legacyOffer.rivalBidAmount,
  'An already visible rival benchmark must not move in the current cycle');
const nextCycle = structuredClone(scheduled);
nextCycle.currentWeek += 3;
const nextOffer = getStreamingRightsOpportunities(nextCycle).find(offer => offer.id === legacyOffer.id)!;
assert.ok(nextOffer.quote.suggestedGuarantee > legacyOffer.quote.suggestedGuarantee,
  'The new quote version must activate for future cycles');
const migratedWeek = processOwnedStreamingPlatformWeek(legacySave).player;
assert.deepEqual(migratedWeek.ownedStreamingPlatform.marketQuotePolicy,
  { version: 3, effectiveCycle: cycle + 1, previousVersion: 1 },
  'First old-save weekly process must schedule, not immediately apply, the quote change');
const persisted = compactOwnedStreamingPlatformForPersistence(migratedWeek.ownedStreamingPlatform, legacySave.id);
assert.deepEqual(normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(persisted)), legacySave.id).marketQuotePolicy,
  { version: 3, effectiveCycle: cycle + 1, previousVersion: 1 }, 'The scheduled policy must survive save serialization');
const legacyListing = getContentMarketListings(legacySave)[0];
const negotiation = openStreamingPrivateOffer(legacySave, legacyListing.id, legacyListing.terms);
assert.ok(negotiation.changed);
const pending = negotiation.negotiation!;
const afterNegotiationWeek = processOwnedStreamingPlatformWeek(negotiation.player).player;
const savedNegotiation = afterNegotiationWeek.ownedStreamingPlatform.rightsNegotiations.find(item => item.id === pending.id)!;
assert.equal(savedNegotiation.minimumGuarantee, pending.minimumGuarantee,
  'A pending negotiation keeps its stored guarantee through policy scheduling');

for (const long of [false, true]) {
  const career = contentMarketFixture();
  career.id = long ? 'phase4-long-synthetic' : 'phase4-fresh-synthetic';
  career.ownedStreamingPlatform.simulationSeed = `owned-streaming:${career.id}`;
  if (long) {
    career.age = 38;
    career.world.projects.push(...Array.from({ length: 600 }, (_, index) => ({
      id: `phase4-film-${index}`, title: `Phase 4 Feature ${index}`, studioId: `phase4-studio-${index % 12}`,
      mediaType: 'MOVIE', genre: index % 2 ? 'THRILLER' : 'DRAMA',
      rating: 5.5 + index % 30 / 10, year: 25 + index % 12,
      boxOffice: 12_000_000 + index * 125_000,
    } as any)));
  }
  const prepared = initializeHistoricalCatalogue(career);
  const listings = getContentMarketListings(prepared);
  const prices = listings.map(item => item.terms.minimumGuarantee).sort((a, b) => a - b);
  const auctions = getStreamingBuyerAuctionLots(prepared);
  const affordable = prices.filter(price => price <= prepared.ownedStreamingPlatform.treasuryCash).length;
  assert.ok(prices.length >= 6, 'Both fresh and long saves need playable direct inventory');
  assert.ok(affordable >= Math.ceil(prices.length / 2), 'At least half the direct shelf must fit founding treasury');
  assert.ok(prices[0] <= 65_000_000, 'Starter supply must include a reasonably priced film');
  assert.ok(auctions.length >= 1 && auctions.some(lot => lot.referenceValue <= prepared.ownedStreamingPlatform.treasuryCash),
    'Rivals and player must have a funded entry point into live bidding');
  const room = openStreamingBuyerAuction(prepared, auctions[0].id, 6_000_000);
  assert.ok(room.changed && room.session, 'A balanced price must still open a real live room');
  assert.ok(room.session!.rivals.length > 0 && room.session!.rivals.length < 33,
    'Eligible rivals should compete without every world platform bidding on every title');
  console.log(JSON.stringify({ save: long ? 'long' : 'fresh', listings: prices.length,
    cheapest: prices[0], median: prices[Math.floor(prices.length / 2)],
    mostExpensive: prices.at(-1), affordable, auctions: auctions.length, rivalsInOpeningRoom: room.session!.rivals.length }));
}
console.log('Phase 4 quote value and scope contract passed.');
