import { createBusiness } from '../services/businessLogic';
import { calculateNPCAsk } from '../services/talentService';
import { generateNewUnknowns } from '../services/npcLogic';
import assert from 'node:assert/strict';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingBiddingRightsLot, resolveStreamingRightsCompatibility } from '../services/streamingRightsCompatibility';
import { registerProductionStreamingRightsContract } from '../services/streamingRightsCore';
import { quoteSeriesStreamingRights, buildSeriesStreamingSessionInput, createSeriesStreamingBids, getSeriesPerformanceEvidence } from '../services/seriesStreamingValue';
import { createStreamingBiddingSession, advanceStreamingBiddingSession, getStreamingBiddingClosingOffers } from '../services/streamingBidding';
import { signThroughReleaseHandler } from './fixtures/seriesReleaseHandler';
const f = makeCinemaFixture(); f.project.type = 'SERIES'; f.project.episodes = 4;
const now = getAbsoluteWeek(f.player.age, f.player.currentWeek), start = now + 1;
const lot = buildStreamingBiddingRightsLot({ world: f.player.world, sourceProjectId: 'series-audit', sellerPartyId: f.project.studioId,
    startsAtAbsoluteWeek: start, maximumDurationWeeks: 52, windowType: 'FIRST_WINDOW' }).lot!;
const scope = { countryIds: lot.countryIds, exclusivity: 'NON_EXCLUSIVE' as const, windowType: 'FIRST_WINDOW' as const };
const fractionalCash = 2_060_000;
const opening = createStreamingBiddingSession({ projectId: 'fractional-cash', title: 'Fractional Cash', sellerStudioId: 'studio', sellerStudioName: 'Studio',
    absoluteWeek: now, projectType: 'SERIES', projectBudget: 1e12, packageScore: 90,
    platforms: [{ id: 'NETFLIX', name: 'Netflix', color: '#f00', cashAvailable: fractionalCash, baseBid: 1e6,
        acquisitionCeiling: 2_100_000, qualityPreference: 50, relationshipMultiplier: 1 }] });
assert(opening.offers.every(o => o.fixedExposure <= fractionalCash), 'Opening series offers cannot round above actual buyer cash');
assert(opening.platformStates.every(p => p.fixedExposureCeiling <= fractionalCash));
console.log('PASS fractional cash is a strict cap even for an immediately selectable opening offer');
const blocked = structuredClone(f.player);
blocked.world.platforms.NETFLIX.ai = { ...blocked.world.platforms.NETFLIX.ai, status: 'DISTRESSED',
    spendingRestrictions: { source: 'RESTRUCTURE', blocksNewBids: true, blocksNewGreenlights: true, blocksNewResearch: false,
        blocksExpansion: true, expiresAtAbsoluteWeek: now + 10 } } as any;
const restrictedInput = buildSeriesStreamingSessionInput(blocked, f.project, 'series-audit', lot, [{ id: 'NETFLIX', name: 'Netflix',
    color: '#f00', cashAvailable: 1e9, baseBid: 1e7, acquisitionCeiling: 1e9, qualityPreference: 50, relationshipMultiplier: 1 }]);
assert.equal(restrictedInput.platforms[0].canStartNewBids, false, 'Current buyer restrictions apply even to a previously open room');
console.log('PASS current buyer spending restrictions');
const buyers = buildSeriesStreamingSessionInput(f.player, f.project, 'series-audit', lot).platforms;
assert(buyers.length >= 2);
const firstBuyer = buyers[0].id, secondBuyer = buyers[1].id;
assert(quoteSeriesStreamingRights(f.player, f.project, 'series-audit', secondBuyer, start, 52, scope).maximumBid > 0);
const shared = registerProductionStreamingRightsContract(f.player, { sourceProjectId: 'series-audit', title: f.project.title,
    projectType: 'SERIES', genre: f.project.genre, sellerStudioId: f.project.studioId, sellerStudioName: 'Universal', sellerPartyType: 'NPC_STUDIO',
    buyerPlatformId: firstBuyer as any, minimumGuarantee: 1000, platformRevenueShare: 100, signedAtAbsoluteWeek: now,
    startsAtAbsoluteWeek: start, durationWeeks: 52, territory: 'MULTI_REGION', ...scope });
assert(shared.contract);
assert(resolveStreamingRightsCompatibility({ world: shared.player.world, sourceProjectId: 'series-audit', sellerPartyId: f.project.studioId,
    buyerPlatformId: secondBuyer as any, territory: 'MULTI_REGION', ...scope, startsAtAbsoluteWeek: start, expiresAtAbsoluteWeek: start + 52 }).available);
assert(quoteSeriesStreamingRights(shared.player, f.project, 'series-audit', secondBuyer, start, 52, scope).maximumBid > 0,
    'A compatible shared series licence must remain quotable after the first shared licence');
const secondShared = registerProductionStreamingRightsContract(shared.player, { sourceProjectId: 'series-audit', title: f.project.title,
    projectType: 'SERIES', genre: f.project.genre, sellerStudioId: f.project.studioId, sellerStudioName: 'Universal', sellerPartyType: 'NPC_STUDIO',
    buyerPlatformId: secondBuyer as any, minimumGuarantee: 1000, platformRevenueShare: 100, signedAtAbsoluteWeek: now,
    startsAtAbsoluteWeek: start, durationWeeks: 52, territory: 'MULTI_REGION', ...scope });
assert(secondShared.contract && secondShared.changed);
assert.equal(Object.values(secondShared.player.world.streamingRightsContracts || {}).filter(c => c.sourceProjectId === 'series-audit').length, 2);
console.log('PASS compatible non-exclusive series rights retain and register a second buyer');
const baselineInput = buildSeriesStreamingSessionInput(f.player, f.project, 'unproven-series', { ...lot, sourceProjectId: 'unproven-series' });
const unproven = createStreamingBiddingSession(baselineInput);
const weak = createStreamingBiddingSession({ ...baselineInput, seriesPerformance: { viewingAccounts: 1000, rating: 3 } });
const successful = createStreamingBiddingSession({ ...baselineInput, seriesPerformance: { viewingAccounts: 30_000_000, rating: 9 } });
assert(weak.platformStates[0].expectedTitleGross < unproven.platformStates[0].expectedTitleGross);
assert(successful.platformStates[0].expectedTitleGross > weak.platformStates[0].expectedTitleGross);
const observedPlayer = structuredClone(f.player);
observedPlayer.pastProjects = [{ id: 'prior-season', projectType: 'SERIES', franchiseId: 'series-family', installmentNumber: 1,
    totalViews: 5_000_000, imdbRating: 8.5 }, { id: 'unrelated', projectType: 'SERIES', franchiseId: 'other', installmentNumber: 20,
    totalViews: 1e12, imdbRating: 10 }] as any;
assert.deepEqual(getSeriesPerformanceEvidence(observedPlayer, { ...f.project, franchiseId: 'series-family', installmentNumber: 2 }, 'season-two'),
    { viewingAccounts: 5_000_000, rating: 8.5 });
console.log('PASS observed series results affect value; unrelated franchises and production cost do not');
const auto = createSeriesStreamingBids(f.player, f.project, 'auto-buyers');
assert(auto.length > 0);
assert(auto.every(b => Boolean(f.player.world.platforms[b.platformId])), 'Automatic bids must have a supported cash authority');
assert(createSeriesStreamingBids({ ...f.player, world: { ...f.player.world, platforms: {} as typeof f.player.world.platforms } }, f.project, 'auto-buyers').length === 0);
console.log('PASS automatic buyers have a supported cash authority');
const pending = structuredClone(f.player);
pending.world.streamingRightsContracts = { obligation: { buyer: { platformId: 'NETFLIX' }, settlement: { guarantee: 'PENDING' },
    minimumGuarantee: 950_000_000, productionFunding: 0, futureSeasonFunding: 0 } } as any;
const limited = buildSeriesStreamingSessionInput(pending, f.project, 'pending', { ...lot, sourceProjectId: 'pending' }, restrictedInput.platforms.map(p => ({ ...p, canStartNewBids: true })));
assert.equal(limited.platforms[0].cashAvailable, 50_000_000);
console.log('PASS pending signed obligations reduce available bidding cash');
const room = advanceStreamingBiddingSession(createStreamingBiddingSession(buildSeriesStreamingSessionInput(f.player, f.project, 'sign-series', { ...lot, sourceProjectId: 'sign-series' })), 45);
const offer = getStreamingBiddingClosingOffers(room).find(o => o.minimumGuarantee > 0)!;
assert(offer);
const project = { id: 'sign-series', name: f.project.title, budget: f.project.estimatedBudget, projectDetails: f.project };
const inflated = structuredClone(room);
const oldOffer = inflated.offers.find(o => o.id === offer.id)!;
oldOffer.minimumGuarantee = 1e12; oldOffer.fixedExposure = 1e12 + oldOffer.productionFunding + oldOffer.futureSeasonFunding;
const blockedSigning = signThroughReleaseHandler(structuredClone(f.player), project, inflated, oldOffer);
assert(!blockedSigning.player && blockedSigning.message, 'Old oversized unsigned offer must be rejected before a cash mutation');
const signing = signThroughReleaseHandler(structuredClone(f.player), project, room, offer);
assert(signing.player, signing.message);
assert.equal(signing.player!.money, f.player.money + offer.minimumGuarantee);
const oldCash = signing.player!.money;
const registered = Object.values(signing.player!.world.streamingRightsContracts || {}).find(c => c.sourceOfferId === offer.id)!;
assert(registered);
const replay = signThroughReleaseHandler(signing.player!, { ...project, projectDetails: { ...f.project, estimatedBudget: 1e12 } }, room, offer);
assert(!replay.player, 'A repeated signing must not pay twice');
assert.equal(signing.player!.money, oldCash);
assert.equal(registered.minimumGuarantee, offer.minimumGuarantee);
console.log('PASS exact release UI handler rejects oversized old offers, signs real current offer and pays once');

const actor = generateNewUnknowns(1)[0]; actor.tier = 'RISING'; actor.stats.fame = 10;
const initialAsk = calculateNPCAsk(actor, 1).totalAmount;
const starAsk = calculateNPCAsk({ ...actor, tier: 'A_LIST', stats: { ...actor.stats, fame: 95 } }, 1).totalAmount;
assert(starAsk > initialAsk, 'A legitimate breakout raises asking price for the same one-film commitment');
console.log('PASS actor demand can rise independently of the buyer valuation');
const fundedPlayer = structuredClone(f.player);
const fundedStudio = createBusiness('Funding Safety Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO',
    { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, '🎬', fundedPlayer.currentWeek);
fundedPlayer.businesses = [fundedStudio];
const fundedDetails = { ...f.project, studioId: fundedStudio.id };
let fundedRoom: ReturnType<typeof createStreamingBiddingSession> | undefined, fundedOffer: typeof offer | undefined;
for (let i = 0; i < 20 && !fundedOffer; i++) {
    const id = `funded-series-${i}`, candidateLot = { ...lot, sourceProjectId: id };
    const candidate = advanceStreamingBiddingSession(createStreamingBiddingSession(buildSeriesStreamingSessionInput(fundedPlayer, fundedDetails, id, candidateLot)), 45);
    const promising = getStreamingBiddingClosingOffers(candidate).find(o => o.productionFunding > 0 && o.futureSeasonFunding > 0);
    if (promising) { fundedRoom = candidate; fundedOffer = promising; }
}
assert(fundedRoom && fundedOffer, 'A genuine funded-series offer must be exercised');
const fundedBalance = fundedStudio.balance;
const fundedSigning = signThroughReleaseHandler(fundedPlayer, { id: fundedRoom!.projectId, name: fundedDetails.title, projectDetails: fundedDetails }, fundedRoom!, fundedOffer!);
assert(fundedSigning.player, fundedSigning.message);
const settledStudio = fundedSigning.player!.businesses.find(b => b.id === fundedStudio.id)!;
assert.equal(settledStudio.balance, fundedBalance + fundedOffer!.minimumGuarantee);
assert.equal(settledStudio.studioState!.productionFund, fundedOffer!.productionFunding);
assert.equal(settledStudio.studioState!.lockedStreamingFunds![0].amount, fundedOffer!.futureSeasonFunding);
console.log('PASS real funded-series UI signing keeps current production and future-season funding separate from spendable guarantee');
