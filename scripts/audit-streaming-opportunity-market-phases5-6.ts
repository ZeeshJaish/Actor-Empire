import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { advanceStreamingOpportunityMarket, getStreamingOpportunityCards,
    purchaseStreamingOpportunityOffer, processStreamingOpportunityPremieres,
    processRivalBrokeredOpportunityWeek } from '../services/streamingOpportunityMarket';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { isWorldProjectEligibleForAwardSeason } from '../services/awardLogic';
import { getStreamingLicenseCandidatePool } from '../services/streamingCatalog';
import { getPlatformAiRightsMarketProjectUniverse } from '../services/platformAi/platformAiContentSourcing';
import { getTalentCareerProfile } from '../services/talentCareer';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { getAiCataloguePositions, getAuthoredAiCataloguePositions, seedLegacyAiCatalogue } from '../services/worldEconomy/worldStreamingAiCatalogue';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { buildExactContentMarketLots } from '../content-market-exact/adapter';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { getContentMarketCollections } from '../services/streamingContentMarket';

const fresh = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.id = 'phase-5-6-market-fixture';
    player.age = 26;
    player.currentWeek = 9;
    player.ownedStreamingPlatform.lifecycle = 'FOUNDING';
    player.ownedStreamingPlatform.treasuryCash = 300_000_000;
    return migratePlayerSave(player);
};

const first = fresh();
assert.equal(first.world.streamingOpportunityMarket?.schemaVersion, 1,
    'old founding saves initialize the saved market without opening the UI');
const week = getAbsoluteWeek(first.age, first.currentWeek);
const generated = advanceStreamingOpportunityMarket(first, week);
const cards = getStreamingOpportunityCards(generated);
assert.equal(cards.individuals.length, 20, 'weekly generator saves twenty complete individual packages');
assert.equal(cards.collections.length, 5, 'weekly generator saves five rights-valid collections');
assert.equal(getContentMarketCollections(generated).length, 5,
    'the visible collection shelf uses the saved five-card snapshot');
assert.equal(new Set(cards.individuals.map(card => card.id)).size, 20);
assert.equal(new Set(cards.individuals.map(card => card.title)).size, 20,
    'one public cycle cannot contain duplicate market film names');
assert.ok(cards.individuals.every(card => card.writerId && card.directorId && card.leadActorId
    && card.sellerId && card.logline && card.askingPrice > 0), 'individual offers have named creative and commercial detail');
const marketLots = buildExactContentMarketLots(generated, { listings: [], collections: cards.collections,
    opportunityOffers: cards.individuals, auctionLots: [], upcomingSales: [], ownedTitles: [] });
assert.equal(marketLots.filter(lot => lot.sourceKind === 'OPPORTUNITY').length, 20,
    'saved individual offers reach the visible market UI');
assert.equal(marketLots.filter(lot => lot.sourceKind === 'UPCOMING').length, 0,
    'generated offers must never leak into genuine studio Upcoming');
assert.equal(generated.world.projects.length, first.world.projects.length,
    'dormant offers do not create released world projects');
assert.deepEqual(generated.world.talentCareer, first.world.talentCareer,
    'dormant offers do not credit NPCs');
assert.deepEqual(generated.world.industryEvents, first.world.industryEvents,
    'dormant offers do not create public industry news');
assert.deepEqual(advanceStreamingOpportunityMarket(generated, week), generated,
    'same-week replay cannot reroll saved packages');
const reopened = migratePlayerSave(JSON.parse(JSON.stringify(generated)));
assert.deepEqual(getStreamingOpportunityCards(reopened), cards,
    'save/reopen keeps the exact named offers');
const next = advanceStreamingOpportunityMarket({ ...reopened, currentWeek: reopened.currentWeek + 3 }, week + 3);
assert.notDeepEqual(getStreamingOpportunityCards(next).individuals.map(card => card.id),
    cards.individuals.map(card => card.id), 'next three-week cycle rotates saved unsold packages');
assert.equal(next.world.streamingOpportunityMarket?.offers.length, 20,
    'old unsigned packages expire rather than accumulate indefinitely');
const offer = cards.individuals[0];
const poor = structuredClone(generated);
poor.ownedStreamingPlatform.treasuryCash = 0;
const denied = purchaseStreamingOpportunityOffer(poor, offer.id);
assert.equal(denied.changed, false, 'unfunded player cannot promote a package');
assert.deepEqual(denied.player, poor, 'failed purchase does not mutate money or world');
const bought = purchaseStreamingOpportunityOffer(generated, offer.id);
assert.equal(bought.changed, true);
assert.equal(bought.player.ownedStreamingPlatform.treasuryCash,
    generated.ownedStreamingPlatform.treasuryCash - offer.askingPrice, 'buyer pays exactly one guarantee');
assert.equal(bought.player.world.projects.filter(project => project.id === offer.projectId).length, 1,
    'one canonical project is promoted');
assert.equal(Object.values(bought.player.world.streamingRightsContracts || {})
    .filter(contract => contract.sourceProjectId === offer.projectId).length, 1,
    'one canonical rights contract exists');
assert.equal(bought.player.world.streamingOpportunityMarket?.sellerReceipts[offer.sellerId], offer.askingPrice - offer.talentUpfrontPool,
    'talent upfront is paid from the seller settlement rather than minted');
assert.ok(getTalentCareerProfile(bought.player.world, offer.writerId)?.projectIds.includes(offer.projectId),
    'writer career activates only at acquisition');
assert.ok(bought.player.world.industryEvents?.events.some(event => event.type === 'RIGHTS_DEAL'
    && event.projectId === offer.projectId), 'signed market rights become a public industry fact');
assert.equal(purchaseStreamingOpportunityOffer(bought.player, offer.id).changed, false,
    'replaying a signed offer cannot charge a second time');
const savedPurchase = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(bought.player))));
assert.equal(savedPurchase.world.projects.filter(project => project.id === offer.projectId).length, 1,
    'purchase survives compaction, export shape and migration without duplication');
assert.equal(savedPurchase.ownedStreamingPlatform.treasuryCash,
    bought.player.ownedStreamingPlatform.treasuryCash, 'save migration never recharges the guarantee');
const unpremiered = bought.player.world.projects.find(project => project.id === offer.projectId)!;
assert.equal(isWorldProjectEligibleForAwardSeason(unpremiered, 'GOLDEN_GLOBE', bought.player.age + 1), false,
    'purchase alone cannot enter the awards ballot');
assert.equal(getStreamingLicenseCandidatePool(bought.player).some(title => title.id === offer.projectId), false,
    'a purchased but unpremiered film cannot be resold as a released library title');
assert.equal(getPlatformAiRightsMarketProjectUniverse(bought.player.world.projects, week + 1)
    .some(project => project.id === offer.projectId), false,
    'AI platforms cannot licence the unpremiered film as released history');
const active = structuredClone(bought.player);
active.ownedStreamingPlatform.lifecycle = 'ACTIVE';
active.ownedStreamingPlatform.launchCommit = { committedAtAbsoluteWeek: week - 2 } as any;
const premiered = processStreamingOpportunityPremieres(active, week + 1);
const released = premiered.world.projects.find(project => project.id === offer.projectId)!;
assert.equal(released.marketPremiereAtAbsoluteWeek, week + 1,
    'the player platform premiere is a separate weekly event');
assert.ok(premiered.world.industryEvents?.events.some(event => event.type === 'PROJECT_RELEASED'
    && event.projectId === offer.projectId), 'premiere activates public release news');
assert.equal(isWorldProjectEligibleForAwardSeason(released, 'OSCAR', released.year + 1),
    released.mediaType === 'MOVIE', 'released market film can enter its proper award year');
assert.deepEqual(processStreamingOpportunityPremieres(premiered, week + 1), premiered,
    'premiere replay is observationally identical');
const rivalStartingCash = Object.fromEntries(Object.values(generated.world.platforms || {})
    .map(platform => [platform.id, platform.cashReserve]));
const rivalWeek = processRivalBrokeredOpportunityWeek(generated, week);
const brokered = Object.values(rivalWeek.world.streamingRightsContracts || {})
    .filter(contract => contract.sourceOfferId?.startsWith('streaming_opportunity')
        && contract.buyer.type === 'AI_PLATFORM');
assert.ok(brokered.length > 0 && brokered.length <= 2,
    'a cycle can fund at most two brokered acquisitions across rival platforms');
assert.equal(getStreamingOpportunityCards(rivalWeek).individuals.length, 20,
    'rivals do not consume the protected player-visible public shelf');
assert.ok(brokered.every(contract => !cards.individuals.some(offer => offer.projectId === contract.sourceProjectId)),
    'brokered titles cannot duplicate any public offer identity');
assert.ok(brokered.every(contract => rivalWeek.world.platforms?.[contract.buyer.platformId!]?.cashReserve
    < rivalStartingCash[contract.buyer.platformId!]), 'each AI purchase debits its own treasury');
assert.deepEqual(processRivalBrokeredOpportunityWeek(rivalWeek, week), rivalWeek,
    'rival cycle replay cannot duplicate titles, contracts or spending');
const publicCompetition = processRivalBrokeredOpportunityWeek(rivalWeek, week + 1);
const publicRemaining = getStreamingOpportunityCards(publicCompetition).individuals;
assert.ok(publicRemaining.length >= 18 && publicRemaining.length < 20,
    'after the first-look week, funded rivals can buy at most one eligible public card per week');
assert.ok(cards.individuals.slice(0, 12).every(card => publicRemaining.some(item => item.id === card.id)),
    'the starter shelf retains a protected core for the player');
assert.deepEqual(processRivalBrokeredOpportunityWeek(publicCompetition, week + 1), publicCompetition,
    'same-week public bidding cannot repeat after save/reopen');
const brokeRivals = structuredClone(generated);
Object.values(brokeRivals.world.platforms || {}).forEach(platform => { platform.cashReserve = 0; });
const brokeResult = processRivalBrokeredOpportunityWeek(brokeRivals, week);
assert.equal(Object.values(brokeResult.world.streamingRightsContracts || {})
    .filter(contract => contract.sourceOfferId?.startsWith('streaming_opportunity')
        && contract.buyer.type === 'AI_PLATFORM').length, 0,
    'unfunded rivals cannot create brokered contracts');
const aiOffers = getWorldStreamingOffers(generated, week).offers.filter(item => !item.isPlayer);
const rightsBeforeLegacySeed = structuredClone(generated.world.streamingRightsContracts);
const legacySeed = seedLegacyAiCatalogue(generated, aiOffers, week, [], []);
const canonicalLibraryIds = new Set(getHistoricalCatalogueTitles(generated).map(title => title.id));
assert.ok(aiOffers.length >= 30, 'the world exposes the full rival field');
assert.ok(aiOffers.every(item => legacySeed.titles.filter(title => title.platformId === item.platformId).length
    + getAuthoredAiCataloguePositions(generated, item.platformId).length >= 8),
    'every abstract or core rival starts with a credible minimum catalogue');
assert.ok(legacySeed.titles.every(title => canonicalLibraryIds.has(title.titleId)),
    'baseline titles use real canonical library identities rather than imaginary placeholders');
assert.deepEqual(seedLegacyAiCatalogue(generated, aiOffers, week,
    legacySeed.titles, legacySeed.seededPlatformIds), legacySeed,
    'legacy rival baseline reprocessing cannot duplicate title positions');
const oldAbstractTitle = { ...legacySeed.titles[0], titleId: 'ai-opening-title-legacy-save',
    contractId: 'ai-opening-position-legacy-save', title: 'Legacy title' };
const legacyUpgraded = seedLegacyAiCatalogue(generated, aiOffers, week,
    [oldAbstractTitle], [oldAbstractTitle.platformId]);
assert.ok(legacyUpgraded.titles.some(title => title.titleId === oldAbstractTitle.titleId),
    'old abstract catalogue entries are not deleted by the new baseline');
assert.deepEqual(generated.world.streamingRightsContracts, rightsBeforeLegacySeed,
    'opening catalogue projection does not rewrite old rights or charge backwards');
const baseline = legacySeed.titles[0];
const blocker = Object.values(rivalWeek.world.streamingRightsContracts || {})
    .find(contract => contract.buyer.type === 'AI_PLATFORM')!;
const blockedWorld = { ...generated.world, streamingRightsContracts: {
    ...generated.world.streamingRightsContracts,
    'test-exclusive-blocker': { ...blocker, id: 'test-exclusive-blocker', sourceProjectId: baseline.titleId,
        buyerPlatformId: 'a-different-platform',
        buyer: { ...blocker.buyer, id: 'a-different-platform', platformId: 'a-different-platform' },
        territory: 'GLOBAL' as const, countryIds: [], exclusivity: 'EXCLUSIVE' as const,
        startsAtAbsoluteWeek: week, expiresAtAbsoluteWeek: week + 10 },
} };
assert.equal(getAiCataloguePositions({ ...generated, world: blockedWorld }, baseline.platformId,
    legacySeed.titles).some(position => position.titleId === baseline.titleId), false,
    'a later exclusive canonical right suppresses incompatible legacy projection');
console.log('Streaming opportunity market phases 5-6 cycle audit: PASS');
