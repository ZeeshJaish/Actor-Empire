/* #315: a package is worth what its titles fetch alone, in the deal the seller asked for. Runs the game's own room to its close. */
import assert from 'node:assert/strict';
import type { StreamingCataloguePackage, StreamingCataloguePackageComponent, StreamingLicenseExclusivity } from '../types';
import {
    calculateStreamingCatalogueReferenceValue,
    getStreamingCatalogueDealValue,
    getStreamingRightsDealFactor,
    getStreamingRightsMarketShare,
} from '../services/streamingCataloguePackages';
import { advanceStreamingBiddingSession, createStreamingCatalogueBiddingSession, getStreamingBiddingClosingOffers } from '../services/streamingBidding';
import { STREAMING_DAY_ONE_MARKETS } from '../services/streamingDayOneMarkets';
import { withShelfValue } from '../services/boxOffice/boxOfficeRightsAdapter';

const WORLD = STREAMING_DAY_ONE_MARKETS.map(market => market.id).sort();
const FIVE = ['AR', 'BR', 'CA', 'MX', 'US'];

/* one title alone, against what the game knows */
const alone = (quality: number, gross: number) => calculateStreamingCatalogueReferenceValue({ quality, audience: 0, budget: 0, theatricalGross: gross, streamingRevenue: 0, franchiseProtected: false } as any);
assert.ok(alone(88, 360e6) > alone(88, 74e6), 'a film people went to see is worth more');
assert.ok(alone(88, 200e6) > alone(60, 200e6) * 1.3, 'a good film is worth clearly more than a weak one');
assert.ok(alone(88, 360e6) > 30e6 && alone(88, 360e6) < 70e6, `one top title: $${alone(88, 360e6) / 1e6}M`);
assert.ok(alone(30, 0) >= 1e6);
assert.ok(alone(99, 5e9) < 200e6, 'even the biggest film has a top');
assert.equal(calculateStreamingCatalogueReferenceValue({ quality: 90, audience: 0, budget: 0, theatricalGross: 0, streamingRevenue: 0, franchiseProtected: false, catalogueTier: 'MARQUEE' } as any),
    calculateStreamingCatalogueReferenceValue({ quality: 90, audience: 0, budget: 0, theatricalGross: 0, streamingRevenue: 0, franchiseProtected: false } as any) * 2, 'a marquee classic keeps its premium');

/* the deal */
assert.equal(getStreamingRightsMarketShare(WORLD), 1);
const fiveShare = getStreamingRightsMarketShare(FIVE);
assert.ok(fiveShare > 0.28 && fiveShare < 0.36, `five markets are about a third of the world's rights money (${fiveShare})`);
const base = { durationWeeks: 104, exclusivity: 'EXCLUSIVE' as StreamingLicenseExclusivity, marketShare: 1 };
assert.equal(getStreamingRightsDealFactor(base), 1, 'two years, worldwide, one service is the measure');
assert.ok(getStreamingRightsDealFactor({ ...base, durationWeeks: 52 }) < 1 && getStreamingRightsDealFactor({ ...base, durationWeeks: 156 }) > 1);
assert.ok(Math.abs(getStreamingRightsDealFactor({ ...base, exclusivity: 'NON_EXCLUSIVE' }) - 1 / 1.75) < 1e-9, 'shared pays what the direct quote says');
assert.ok(getStreamingRightsDealFactor({ ...base, marketShare: fiveShare }) < 0.6);
assert.ok(getStreamingRightsDealFactor({ ...base, otherLicences: 1 }) < 0.7, 'already on another service: worth less to the next');

/* the room */
const LOT = (id: string, countryIds: string[], weeks: number) => ({ id: `lot-${id}`, sourceProjectId: id, territory: countryIds.length === WORLD.length ? 'GLOBAL' : 'MULTI_REGION', countryIds, excludedCountryIds: [], startsAtAbsoluteWeek: 500, maximumDurationWeeks: weeks, windowType: 'FIRST_WINDOW', notice: null });
const title = (id: string, quality: number, gross: number, countryIds: string[], weeks: number, otherLicences = 0): StreamingCataloguePackageComponent => ({
    sourceProjectId: id, title: id, projectType: 'MOVIE', genre: 'DRAMA', originalLanguageId: 'english', sellerStudioId: 'studio', quality, audience: 0, budget: 0, theatricalGross: gross, streamingRevenue: 0,
    franchiseProtected: false, rightsLot: LOT(id, countryIds, weeks) as any, referenceValue: 1_000_000, referenceWeight: 0.25, otherLicences,
});
const pack = (rows: StreamingCataloguePackageComponent[], exclusivity: StreamingLicenseExclusivity, weeks: number) => ({
    schemaVersion: 1, id: `pack-${rows.map(row => row.sourceProjectId).join('-')}-${exclusivity}-${weeks}-${rows[0].rightsLot.countryIds.length}-${rows[0].otherLicences}`, idempotencyKey: 'k', source: 'PLAYER_CURATED', name: 'Test', seller: { id: 'studio', name: 'Studio' },
    createdAtAbsoluteWeek: 500, startsAtAbsoluteWeek: 500, maximumDurationWeeks: weeks, requestedWindowType: 'FIRST_WINDOW', requestedExclusivity: exclusivity, requestedCountryIds: rows[0].rightsLot.countryIds, components: rows,
} as unknown as StreamingCataloguePackage);
const BUYERS = [
    { id: 'NETFLIX', name: 'Netflix', cash: 3450e6, baseBid: 24e6, ceiling: 620e6, quality: 72 }, { id: 'APPLE_TV', name: 'Apple', cash: 6030e6, baseBid: 30e6, ceiling: 760e6, quality: 84 },
    { id: 'DISNEY_PLUS', name: 'Disney', cash: 6200e6, baseBid: 22e6, ceiling: 680e6, quality: 76 }, { id: 'HULU', name: 'Hulu', cash: 336e6, baseBid: 15e6, ceiling: 260e6, quality: 62 },
    { id: 'YOUTUBE', name: 'YouTube', cash: 7880e6, baseBid: 8e6, ceiling: 130e6, quality: 46 },
].map(b => ({ id: b.id, name: b.name, color: '#fff', cashAvailable: b.cash, baseBid: b.baseBid, acquisitionCeiling: b.ceiling, qualityPreference: b.quality, relationshipMultiplier: 1, canStartNewBids: true }));
const room = (rows: StreamingCataloguePackageComponent[], exclusivity: StreamingLicenseExclusivity, weeks: number) => {
    const session = advanceStreamingBiddingSession(createStreamingCatalogueBiddingSession({ cataloguePackage: pack(rows, exclusivity, weeks), platforms: BUYERS as any }), 45);
    const offers = getStreamingBiddingClosingOffers(session);
    offers.forEach(offer => {
        assert.equal(offer.exclusivity, exclusivity, 'every offer is on the terms the seller asked for');
        assert.equal(offer.durationWeeks, weeks, 'every offer is for the length the seller asked for');
    });
    return Math.max(...offers.map(offer => offer.minimumGuarantee));
};
const hits = (countries = WORLD, weeks = 104, other = 0) => [title('a', 86, 74e6, countries, weeks, other), title('b', 91, 195e6, countries, weeks, other), title('c', 88, 360e6, countries, weeks, other), title('d', 87, 415e6, countries, weeks, other)];
const worldwide = room(hits(), 'EXCLUSIVE', 104);
const shared = room(hits(), 'NON_EXCLUSIVE', 104);
const fiveExclusive = room(hits(FIVE), 'EXCLUSIVE', 104);
const fiveShared = room(hits(FIVE), 'NON_EXCLUSIVE', 104);
const oneYear = room(hits(WORLD, 52), 'EXCLUSIVE', 52);
const threeYears = room(hits(WORLD, 156), 'EXCLUSIVE', 156);
const resold = room(hits(WORLD, 104, 1), 'EXCLUSIVE', 104);
const flops = room([title('e', 59, 371e6, WORLD, 104), title('f', 58, 426e6, WORLD, 104), title('g', 60, 316e6, WORLD, 104), title('h', 61, 261e6, WORLD, 104)], 'EXCLUSIVE', 104);
const small = room([title('i', 88, 40e6, WORLD, 104), title('j', 85, 25e6, WORLD, 104)], 'EXCLUSIVE', 104);
const big = room([...hits(), title('k', 77, 173e6, WORLD, 104), title('l', 80, 404e6, WORLD, 104), title('m', 82, 294e6, WORLD, 104), title('n', 83, 239e6, WORLD, 104)], 'EXCLUSIVE', 104);
console.log(JSON.stringify({ worldwide, shared, fiveExclusive, fiveShared, oneYear, threeYears, resold, flops, small, big }, null, 0));

assert.ok(worldwide > 240e6 && worldwide < 460e6, `four hits, the whole deal: $${worldwide / 1e6}M, about what they fetch alone`);
assert.ok(shared < worldwide * 0.8, 'shared pays less than one service alone');
assert.ok(fiveExclusive < worldwide * 0.6, 'a third of the world pays well under the whole of it');
assert.ok(fiveShared < fiveExclusive, 'and shared there pays less again');
assert.ok(fiveShared > 25e6, 'but it is still real money');
assert.ok(oneYear < worldwide && worldwide < threeYears, 'longer pays more');
assert.ok(resold < worldwide * 0.8, 'a title already on another service brings less');
assert.ok(flops < worldwide * 0.75, 'four loud flops do not fetch what four great films do');
assert.ok(small > 60e6, 'two small good films still find money');
assert.ok(big > worldwide && big < 760e6, 'eight titles find a buyer, inside what a rival can carry');

/* the deal value is what the room opens from, so a package saved before this rule pays the same as a new one */
const stale = hits().map(row => ({ ...row, referenceValue: 500e6 }));
assert.equal(room(stale, 'EXCLUSIVE', 104), worldwide);
assert.equal(getStreamingCatalogueDealValue(hits()[0], { maximumDurationWeeks: 104, exclusivity: 'EXCLUSIVE' }), alone(86, 74e6));

/* an old film alone still has a shelf value; a new one lives on its cinema numbers */
const dead: any = { eligible: false, maximumBidCents: 0, range: { low: 0, mid: 0, high: 0 }, incrementalHouseholds: 0, drivers: [], scope: { countryIds: WORLD, startsAtAbsoluteWeek: 700, durationWeeks: 52 } };
const shelf = (over: Record<string, unknown>, quote = dead) => withShelfValue(quote, { titleId: 'old', buyerId: 'NETFLIX', now: 700, releasedAtAbsoluteWeek: 500, aloneValue: 50e6, buyerCash: 3e9, ...over } as any);
assert.ok(shelf({}).eligible && shelf({}).maximumBidCents > 2_000_000_000, 'a film four years old still sells');
assert.equal(shelf({ releasedAtAbsoluteWeek: 690 }).maximumBidCents, 0, 'a new film gets no shelf price');
assert.ok(shelf({ releasedAtAbsoluteWeek: 640 }).maximumBidCents < shelf({}).maximumBidCents, 'it comes in over time');
assert.equal(shelf({}, { ...dead, alreadySigned: true }).maximumBidCents, 0, 'a buyer who already holds it does not bid again');
assert.equal(shelf({}, { ...dead, scope: { ...dead.scope, countryIds: [] } }).maximumBidCents, 0, 'a buyer with no market there does not bid');
assert.ok(shelf({ buyerCash: 10e6 }).maximumBidCents <= 80_000_000, 'a small service cannot spend what it does not have');
const live = { ...dead, eligible: true, maximumBidCents: 50_000_000_000 };
assert.equal(shelf({}, live).maximumBidCents, 50_000_000_000, 'a film people still talk about keeps its higher price');

console.log('package fair price audit passed');
