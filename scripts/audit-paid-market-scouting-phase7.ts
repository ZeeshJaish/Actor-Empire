import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { advanceStreamingOpportunityMarket, getStreamingOpportunityCards,
    purchaseStreamingOpportunityOffer } from '../services/streamingOpportunityMarket';
import { getContentMarketCollections } from '../services/streamingContentMarket';
import { createBusiness, processBusinessWeek } from '../services/businessLogic';
import { getNextPaidScoutPrice, getStreamingPaidScoutQuote, refreshStreamingPaidScout,
    getStudioPaidScoutQuote, refreshStudioPaidScout } from '../services/paidMarketScouting';

const fresh = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    player.id = 'paid-scout-phase7';
    player.age = 26;
    player.currentWeek = 9;
    player.ownedStreamingPlatform.lifecycle = 'FOUNDING';
    player.ownedStreamingPlatform.treasuryCash = 300_000_000;
    return migratePlayerSave(player);
};

assert.equal(getNextPaidScoutPrice(0), 450_000);
assert.equal(getNextPaidScoutPrice(1), 900_000);
assert.equal(getNextPaidScoutPrice(2), 1_350_000);
assert.equal(getNextPaidScoutPrice(99), 45_000_000);

const player = fresh();
const originalCards = getStreamingOpportunityCards(player);
const originalCollections = getContentMarketCollections(player);
const first = refreshStreamingPaidScout(player);
assert.equal(first.changed, true);
assert.equal(first.player.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash - 450_000);
assert.equal(getStreamingPaidScoutQuote(first.player).price, 900_000);
assert.equal(first.player.world.projects.length, player.world.projects.length);
assert.deepEqual(first.player.world.industryEvents, player.world.industryEvents);
assert.deepEqual(first.player.world.talentCareer, player.world.talentCareer);
assert.deepEqual(first.player.world.streamingOpportunityMarket?.offers, player.world.streamingOpportunityMarket?.offers);
const scouted = getStreamingOpportunityCards(first.player);
assert.equal(scouted.individuals.length, originalCards.individuals.length + 20);
assert.equal(new Set(scouted.individuals.map(offer => offer.title)).size, scouted.individuals.length);
assert.ok(getContentMarketCollections(first.player).length >= originalCollections.length);
const second = refreshStreamingPaidScout(first.player);
assert.equal(second.changed, true);
assert.equal(second.player.ownedStreamingPlatform.treasuryCash, first.player.ownedStreamingPlatform.treasuryCash - 900_000);
assert.equal(getStreamingOpportunityCards(second.player).individuals.length, originalCards.individuals.length + 20);
assert.ok(getStreamingOpportunityCards(second.player).individuals.slice(20)
    .every(offer => !scouted.individuals.some(old => old.id === offer.id)));
const bought = purchaseStreamingOpportunityOffer(second.player, getStreamingOpportunityCards(second.player).individuals[20].id);
assert.equal(bought.changed, true, 'paid-scout offers use the normal canonical purchase path');
const third = refreshStreamingPaidScout(bought.player);
assert.equal(third.changed, true);
assert.equal(third.player.world.projects.length, bought.player.world.projects.length,
    'refreshing cannot withdraw an acquired project');
const reopened = migratePlayerSave(JSON.parse(JSON.stringify(second.player)));
assert.deepEqual(getStreamingOpportunityCards(reopened), getStreamingOpportunityCards(second.player));
assert.equal(getStreamingPaidScoutQuote(reopened).price, 1_350_000);
const compacted = migratePlayerSave(JSON.parse(JSON.stringify(compactPlayerForPersistence(second.player))));
assert.deepEqual(getStreamingOpportunityCards(compacted), getStreamingOpportunityCards(second.player),
    'paid offers survive save compaction and migration');
const poor = structuredClone(player);
poor.ownedStreamingPlatform.treasuryCash = 0;
const denied = refreshStreamingPaidScout(poor);
assert.equal(denied.changed, false);
assert.deepEqual(denied.player, poor);
const nextWeek = { ...second.player, currentWeek: second.player.currentWeek + 3 };
assert.equal(getStreamingPaidScoutQuote(nextWeek).price, 450_000);
const freelyRotated = advanceStreamingOpportunityMarket(nextWeek);
assert.equal(getStreamingOpportunityCards(freelyRotated).individuals.length, 20,
    'scheduled free rotation withdraws only the unsigned private shelf');
assert.equal(freelyRotated.world.streamingOpportunityMarket?.paidScoutCount, 0);
const newCycleScout = refreshStreamingPaidScout(freelyRotated);
assert.equal(newCycleScout.changed, true);
assert.notDeepEqual(getStreamingOpportunityCards(newCycleScout.player).individuals.slice(20).map(item => item.title),
    scouted.individuals.slice(20).map(item => item.title),
    'paid discovery generates a fresh title batch in the next three-week cycle');
const hundredth = structuredClone(player);
hundredth.world.streamingOpportunityMarket!.paidScoutCount = 99;
assert.equal(getStreamingPaidScoutQuote(hundredth).price, 45_000_000);
const hundredthResult = refreshStreamingPaidScout(hundredth);
assert.equal(hundredthResult.changed, true, 'the 100th paid scout is allowed when funded');
assert.equal(hundredthResult.player.ownedStreamingPlatform.treasuryCash,
    hundredth.ownedStreamingPlatform.treasuryCash - 45_000_000);

const studioPlayer = fresh();
studioPlayer.businesses.push(createBusiness('Phase 7 Studio', 'PRODUCTION_HOUSE', 'INDIE_STUDIO',
    { quality: 'STANDARD', pricing: 'MARKET', marketing: 'MEDIUM' }, '', studioPlayer.currentWeek));
const studio = studioPlayer.businesses.find(business => business.type === 'PRODUCTION_HOUSE');
assert.ok(studio, 'fixture needs a production studio');
studio.balance = 5_000_000;
assert.equal(getStudioPaidScoutQuote(studioPlayer, studio.id).price, 450_000);
const studioFirst = refreshStudioPaidScout(studioPlayer, studio.id);
assert.equal(studioFirst.changed, true);
assert.deepEqual(refreshStudioPaidScout(studioPlayer, studio.id).player, studioFirst.player,
    'the same saved action seed builds the same complete studio shelf');
assert.equal(studioFirst.player.businesses.find(business => business.id === studio.id)?.balance, 4_550_000);
assert.equal(getStudioPaidScoutQuote(studioFirst.player, studio.id).price, 900_000);
assert.equal(studioFirst.player.businesses.find(business => business.id === studio.id)?.studioState?.lastMarketRefreshAbsoluteWeek,
    studio.studioState?.lastMarketRefreshAbsoluteWeek, 'paid action does not postpone free rotation');
const studioSecond = refreshStudioPaidScout(studioFirst.player, studio.id);
assert.equal(studioSecond.changed, true);
assert.equal(studioSecond.player.businesses.find(business => business.id === studio.id)?.balance, 3_650_000);
assert.equal(getStudioPaidScoutQuote(studioSecond.player, studio.id).price, 1_350_000);
const studioReopened = migratePlayerSave(JSON.parse(JSON.stringify(studioSecond.player)));
assert.equal(getStudioPaidScoutQuote(studioReopened, studio.id).price, 1_350_000);
assert.equal(getStudioPaidScoutQuote({ ...studioSecond.player,
    currentWeek: studioSecond.player.currentWeek + 3 }, studio.id).price, 450_000);
const freeStudio = processBusinessWeek(studioSecond.player.businesses.find(business => business.id === studio.id)!,
    studioSecond.player.stats.fame, studioSecond.player.currentWeek + 3, 'en', studioSecond.player.age).updated;
assert.equal(freeStudio.studioState?.lastMarketRefreshWeek, studioSecond.player.currentWeek + 3,
    'paid scouts do not postpone the scheduled studio refresh');
const noCash = structuredClone(studioPlayer);
noCash.businesses.find(business => business.id === studio.id)!.balance = 0;
assert.deepEqual(refreshStudioPaidScout(noCash, studio.id).player, noCash);
const noDistinct = structuredClone(studioPlayer);
noDistinct.businesses.find(business => business.id === studio.id)!.studioState!.ipMarket =
    studioFirst.player.businesses.find(business => business.id === studio.id)!.studioState!.ipMarket;
assert.deepEqual(refreshStudioPaidScout(noDistinct, studio.id).player, noDistinct,
    'a duplicate paid shelf is rejected without touching money or saved offers');
const legacyStudio = structuredClone(studioPlayer);
delete legacyStudio.businesses.find(business => business.id === studio.id)!.studioState;
assert.equal(refreshStudioPaidScout(legacyStudio, studio.id).changed, true,
    'legacy production studios with no saved studioState are normalized on paid action');
assert.equal(getAbsoluteWeek(nextWeek.age, nextWeek.currentWeek) - getAbsoluteWeek(player.age, player.currentWeek), 3);
console.log('Paid market scouting phase 7 audit: PASS');
