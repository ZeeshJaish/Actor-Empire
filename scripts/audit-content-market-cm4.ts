import assert from 'node:assert/strict';
import * as contentMarket from '../services/streamingContentMarket';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { advanceStreamingBuyerAuction, getStreamingBuyerAuctionLots, openStreamingBuyerAuction, placeStreamingBuyerAuctionBid } from '../services/streamingBuyerAuctions';
import { getStreamingContentAvailability } from '../services/streamingContentAvailability';
import { projectIndustryEvents } from '../services/industryWorld/industryPresentation';
import { buildIndustryMediaClaimCandidates, renderIndustryMediaClaimCopy } from '../services/industryWorld/industryMediaClaims';

assert.equal(
    typeof (contentMarket as Record<string, unknown>).processStreamingUpcomingRightsWeek,
    'function',
    'CM4 must expose a weekly upcoming-rights processor through the Content Market domain',
);

const fixture = contentMarketFixture();
const absoluteWeek = getAbsoluteWeek(fixture.age, fixture.currentWeek);
fixture.world.studios = {
    ...(fixture.world.studios || {}),
    'future-studio': { id: 'future-studio', name: 'Northstar Pictures' } as any,
};
fixture.world.industryProductions = {
    'future-production': {
        id: 'future-production',
        canonicalProjectId: 'future-project',
        title: 'The Celestial War',
        projectType: 'MOVIE',
        genre: 'SCI_FI',
        producerStudioId: 'future-studio',
        source: 'STUDIO_INDEPENDENT',
        status: 'PRODUCTION',
        productionCalendar: {},
        budgetMillions: 180,
        paidMillions: 90,
        talentBookingIds: [],
        writerSource: 'IN_HOUSE_TEAM',
        writerId: null,
        writerName: 'Northstar Story Group',
        writerSkill: 8,
        studioAiExecution: {
            plannedReleaseAbsoluteWeek: absoluteWeek + 12,
            talentSelected: true,
            talent: { leadActorId: 'star-1', leadActorName: 'Avery Stone', directorId: 'director-1', directorName: 'Mara Vale', packageScore: 84, estimatedCostMillions: 42 },
            finalQuality: { creativeQuality: 82, executionQuality: 78, commercialPotential: 91, prestigePotential: 69, downsideRisk: 24 },
            problems: [],
        },
        createdAtAbsoluteWeek: absoluteWeek - 6,
        updatedAtAbsoluteWeek: absoluteWeek,
    } as any,
    'cancelled-production': {
        id: 'cancelled-production', canonicalProjectId: 'cancelled-project', title: 'Never Released',
        projectType: 'MOVIE', genre: 'DRAMA', producerStudioId: 'future-studio', source: 'STUDIO_INDEPENDENT',
        status: 'CANCELLED', studioAiExecution: { plannedReleaseAbsoluteWeek: absoluteWeek + 8 },
        createdAtAbsoluteWeek: absoluteWeek - 4, updatedAtAbsoluteWeek: absoluteWeek,
    } as any,
};

const discovered = contentMarket.processStreamingUpcomingRightsWeek(fixture, absoluteWeek);
const discoveredSales = (discovered.player.ownedStreamingPlatform as any).upcomingRightsSales || [];
assert.equal(discoveredSales.length, 1, 'Only an eligible canonical future production receives a scheduled rights sale');
assert.equal(discoveredSales[0].sourceProductionId, 'future-production');
assert.ok(discoveredSales[0].opensAtAbsoluteWeek > absoluteWeek, 'The auction opening is saved in a future week');
assert.ok(discoveredSales[0].plannedAvailabilityAbsoluteWeek >= absoluteWeek + 12, 'Availability follows the canonical release plan');
assert.ok(discoveredSales[0].publicInterestScore >= 0 && discoveredSales[0].publicInterestScore <= 100, 'Public interest is a bounded estimate');

const savedSale = normalizeOwnedStreamingPlatformState(discovered.player.ownedStreamingPlatform, discovered.player.id).upcomingRightsSales[0];
assert.equal(savedSale.opensAtAbsoluteWeek, discoveredSales[0].opensAtAbsoluteWeek, 'Save normalization preserves the announced opening week');
assert.equal(typeof (contentMarket as any).followStreamingUpcomingRightsSale, 'function', 'CM4 must expose a follow action');
const followed = (contentMarket as any).followStreamingUpcomingRightsSale(discovered.player, savedSale.id);
assert.ok(followed.changed, 'The player can follow an announced sale');
assert.equal(followed.player.ownedStreamingPlatform.upcomingRightsSales[0].followedAtAbsoluteWeek, absoluteWeek);

const opened = contentMarket.processStreamingUpcomingRightsWeek(followed.player, savedSale.opensAtAbsoluteWeek);
const openedSale = opened.player.ownedStreamingPlatform.upcomingRightsSales.find((sale: any) => sale.id === savedSale.id)!;
assert.equal(openedSale.status, 'LIVE', 'A scheduled sale opens on its persisted week');
assert.equal(opened.openedSaleIds.length, 1);
assert.equal(opened.player.inbox.filter(message => message.data?.streamingUpcomingRightsSaleId === savedSale.id).length, 1,
    'A followed sale creates one actionable opening notification');
const replayedOpen = contentMarket.processStreamingUpcomingRightsWeek(opened.player, savedSale.opensAtAbsoluteWeek);
assert.equal(replayedOpen.player.inbox.filter(message => message.data?.streamingUpcomingRightsSaleId === savedSale.id).length, 1,
    'Reprocessing the opening week cannot duplicate its notification');
assert.ok((replayedOpen.player.world.industryEvents?.events || []).some(event => (
    event.type === ('RIGHTS_SALE_ANNOUNCED' as any) && event.projectId === savedSale.sourceProjectId
)), 'The public announcement is backed by a saved industry event');
const announcementPresentation = projectIndustryEvents(
    discovered.player,
    discovered.player.world.industryEvents,
    absoluteWeek,
    discovered.player.world.industryMedia,
);
const claimPlayer = {
    ...announcementPresentation.player,
    world: { ...announcementPresentation.player.world, industryMedia: announcementPresentation.mediaWorld },
};
const saleClaim = buildIndustryMediaClaimCandidates(claimPlayer, absoluteWeek)
    .find(candidate => candidate.event.type === 'RIGHTS_SALE_ANNOUNCED');
assert.ok(saleClaim, 'A public sale can inspire attributed platform-destination speculation');
const saleClaimCopy = renderIndustryMediaClaimCopy({
    kind: saleClaim!.kind,
    category: saleClaim!.category,
    sourceName: 'ScreenWire',
    subjectName: savedSale.title,
    targetName: saleClaim!.targetName,
    evidenceSummary: saleClaim!.event.detail,
});
assert.match(saleClaimCopy.summary, /unconfirmed/i, 'Speculation is visibly attributed and never presented as a saved fact');

const atAbsoluteWeek = (player: typeof fixture, week: number) => ({
    ...player,
    age: Math.floor(week / 52) + 1,
    currentWeek: (week % 52) + 1,
});
const livePlayer = atAbsoluteWeek(opened.player, savedSale.opensAtAbsoluteWeek);
const upcomingLot = getStreamingBuyerAuctionLots(livePlayer).find(lot => (lot as any).upcomingRightsSaleId === savedSale.id);
assert.ok(upcomingLot, 'The opened future sale enters the existing CM3 auction floor');
assert.equal(upcomingLot!.startsAtAbsoluteWeek, savedSale.plannedAvailabilityAbsoluteWeek,
    'The frozen rights window starts at planned delivery rather than auction day');
const rivalRoom = openStreamingBuyerAuction(livePlayer, upcomingLot!.id, 7_000_000);
assert.ok(rivalRoom.changed && rivalRoom.session);
const rivalClose = advanceStreamingBuyerAuction(rivalRoom.player, rivalRoom.session!.id, 45, 7_045_000);
assert.ok(['LOST', 'NO_SALE'].includes(rivalClose.session?.status || ''), 'An unattended future sale resolves instead of remaining live forever');
assert.equal(
    rivalClose.player.ownedStreamingPlatform.upcomingRightsSales.find((sale: any) => sale.id === savedSale.id)?.status,
    rivalClose.session?.status === 'LOST' ? 'LOST' : 'CLOSED',
    'The Upcoming ledger records an AI win or a no-sale outcome',
);
const room = openStreamingBuyerAuction(livePlayer, upcomingLot!.id, 8_000_000);
assert.ok(room.changed && room.session, 'A future-title lot opens through the existing saved auction room');
const bid = placeStreamingBuyerAuctionBid(room.player, room.session!.id, {
    minimumGuarantee: Math.round(upcomingLot!.referenceValue * 2.2),
    licensorRevenueShare: upcomingLot!.allowedTerms.backendMaximum,
    marketingGuarantee: upcomingLot!.allowedTerms.marketingMaximum,
    futureGreenlight: upcomingLot!.allowedTerms.futureGreenlightAllowed,
}, 8_001_000);
assert.ok(bid.changed);
const closed = advanceStreamingBuyerAuction(bid.player, room.session!.id, 45, 8_046_000);
assert.equal(closed.session?.status, 'WON', 'A qualifying player bid can win the future rights');
const futureLicense = closed.player.ownedStreamingPlatform.catalogLicenses.find(license => license.sourceProjectId === savedSale.sourceProjectId);
assert.ok(futureLicense, 'The future auction settles into the canonical licence registry');
assert.equal(futureLicense!.startsAtAbsoluteWeek, savedSale.plannedAvailabilityAbsoluteWeek);
assert.equal(closed.player.ownedStreamingPlatform.upcomingRightsSales.find((sale: any) => sale.id === savedSale.id)?.status, 'ACQUIRED');
const beforeDelivery = getStreamingContentAvailability(closed.player, savedSale.sourceProjectId);
assert.equal(beforeDelivery.available, false, 'Buying future rights cannot make an unfinished project playable');
assert.equal(beforeDelivery.status, 'IN_PRODUCTION');
const contractCount = Object.values(closed.player.world.streamingRightsContracts || {}).filter(contract => contract.sourceProjectId === savedSale.sourceProjectId).length;
const replayedClose = advanceStreamingBuyerAuction(closed.player, room.session!.id, 45, 8_100_000);
assert.equal(Object.values(replayedClose.player.world.streamingRightsContracts || {}).filter(contract => contract.sourceProjectId === savedSale.sourceProjectId).length, contractCount,
    'Replaying settlement cannot duplicate the future contract');

const delayedReleaseWeek = absoluteWeek + 17;
const delayedInput = structuredClone(closed.player);
delayedInput.world.industryProductions!['future-production'].studioAiExecution!.plannedReleaseAbsoluteWeek = delayedReleaseWeek;
delayedInput.world.industryProductions!['future-production'].updatedAtAbsoluteWeek = savedSale.opensAtAbsoluteWeek + 1;
const delayed = contentMarket.processStreamingUpcomingRightsWeek(
    atAbsoluteWeek(delayedInput, savedSale.opensAtAbsoluteWeek + 1),
    savedSale.opensAtAbsoluteWeek + 1,
);
const delayedSale = delayed.player.ownedStreamingPlatform.upcomingRightsSales.find((sale: any) => sale.id === savedSale.id)!;
const delayedAvailabilityWeek = delayedReleaseWeek + 4;
assert.equal(delayedSale.plannedAvailabilityAbsoluteWeek, delayedAvailabilityWeek,
    'A canonical production delay updates the saved future availability');
const delayedLicense = delayed.player.ownedStreamingPlatform.catalogLicenses.find(license => license.sourceProjectId === savedSale.sourceProjectId)!;
assert.equal(delayedLicense.startsAtAbsoluteWeek, delayedAvailabilityWeek, 'The player licence follows the canonical delay');
assert.equal(delayed.player.world.streamingRightsContracts?.[delayedLicense.id]?.startsAtAbsoluteWeek, delayedAvailabilityWeek,
    'The actor-neutral contract follows the same delay');
assert.ok((delayed.player.world.industryEvents?.events || []).some(event => (
    event.type === 'PROJECT_DELAYED' && event.productionId === savedSale.sourceProductionId
)), 'A public delay is backed by a saved production event');

const deliveredInput = structuredClone(delayed.player);
deliveredInput.world.industryProductions!['future-production'].status = 'DELIVERED';
const delivered = atAbsoluteWeek(deliveredInput, delayedAvailabilityWeek);
const deliveredAvailability = getStreamingContentAvailability(delivered, savedSale.sourceProjectId);
assert.equal(deliveredAvailability.available, true, 'Delivered future content becomes schedulable only when its saved rights window begins');
assert.equal(deliveredAvailability.status, 'READY');

const presentation = projectIndustryEvents(
    closed.player,
    closed.player.world.industryEvents,
    savedSale.opensAtAbsoluteWeek,
    closed.player.world.industryMedia,
);
const published = [...presentation.news, ...presentation.xPosts];
assert.ok(published.some(item => Boolean(item.industryEventId)), 'Public CM4 coverage always references a saved industry event');
assert.ok(!(closed.player.world.industryEvents?.events || []).some(event => /backend|upfront|\$\d/i.test(event.detail)),
    'Private auction terms are not exposed as public facts');

const oversized = structuredClone(delayed.player);
oversized.ownedStreamingPlatform.upcomingRightsSales = Array.from({ length: 100 }, (_, index) => ({
    ...delayedSale,
    id: `${delayedSale.id}-${index}`,
    idempotencyKey: `${delayedSale.idempotencyKey}-${index}`,
    sourceProductionId: `${delayedSale.sourceProductionId}-${index}`,
    sourceProjectId: `${delayedSale.sourceProjectId}-${index}`,
}));
assert.ok(normalizeOwnedStreamingPlatformState(oversized.ownedStreamingPlatform, oversized.id).upcomingRightsSales.length <= 80,
    'Upcoming listings stay bounded on long-running saves');
const busyStart = performance.now();
contentMarket.processStreamingUpcomingRightsWeek(oversized, savedSale.opensAtAbsoluteWeek + 2);
const busyDurationMs = performance.now() - busyStart;
assert.ok(busyDurationMs < 250, 'A representative full Upcoming queue stays within the weekly mobile budget');
console.log(`CM4 upcoming-rights lifecycle passed; bounded 100-item input processed in ${busyDurationMs.toFixed(2)}ms.`);
