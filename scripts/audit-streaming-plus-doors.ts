/**
 * Streaming+ Pack (2026-11-08): every door, without the pack (refused) and with it (not refused for the pack).
 * Zeesh: "wizard ya kahin se bhi ... aisa na ho ki idhar to premium hai lekin wizard ya kahin se hum log aur le sakte hain".
 * Doors: network orders (a pack city, a Titan, Meridian Edge), Build validation, Tech, campaigns (start, extend), the
 * front page, the ident (opening and rebrand), the IPO, the opening commission; what a save already has stays.
 * Plus the forced-ad rules and the rewarded cash. (~60 s: it builds the test company first)
 */
import assert from 'node:assert/strict';

/* the ad rules read window and localStorage: a small stand-in */
const store = new Map<string, string>();
(globalThis as any).window = globalThis;
(globalThis as any).localStorage = { getItem: (key: string) => store.get(key) ?? null, setItem: (key: string, value: string) => { store.set(key, value); } };

import { INITIAL_PLAYER, type OwnedStreamingFacility, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { previewStreamingNetworkOrder, streamingNetworkRegionOf } from '../services/streamingNetworkOrders';
import { createDefaultStreamingInfrastructureDraft, validateStreamingInfrastructureDraft } from '../services/streamingInfrastructure';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { quoteStreamingCampaign, streamingCampaignSubjects, extendStreamingCampaign } from '../services/campaigns/streamingCampaigns';
import { saveStreamingStorefrontPlan } from '../services/streamingLaunchProgram';
import { rebrandStreamingIdent } from '../services/streamingBrandStudio';
import { startStreamingCinematicIpoJourney } from '../services/streamingPublicMarkets';
import { getStreamingServerSite } from '../services/streamingServerSites';
import {
    STREAMING_PLUS_CITY_IDS, hasStreamingPlus, streamingPlusNetworkBlock, streamingPlusTierOrFallback, streamingPlusCityOpen,
} from '../services/streamingPlusPack';
import { FORCED_AD_RULES, forcedAdBlocker, setForcedAdContext, showForcedAd, noteForcedAdWeekPassed, noteRealPurchase } from '../services/forcedAds';
import { rewardedCashAmount } from '../services/rewardedCash';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Streaming+ Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withoutPack = (player: Player): Player => ({
    ...player, flags: { ...player.flags, premiumPurchases: (player.flags.premiumPurchases || []).filter((id: string) => id !== 'streaming_plus') },
});
const withEnergy = (player: Player): Player => ({ ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } });
let checks = 0;
const ok = (value: unknown, message: string) => { assert.ok(value, message); checks += 1; };

(async () => {
    const started = performance.now();
    const built = withEnergy(await buildStreamingFullPlatformQa(fresh('streaming-plus-doors'), { processWeek: processGameWeek, persistWeek: async next => next }));
    ok(hasStreamingPlus(built), 'the test company carries the pack (it tests everything)');
    const withPack = { ...built, ownedStreamingPlatform: { ...built.ownedStreamingPlatform, treasuryCash: Math.max(built.ownedStreamingPlatform.treasuryCash, 5_000_000_000) } };
    const free = withoutPack(withPack);
    ok(!hasStreamingPlus(free), 'the same company without the pack');
    const setup = withPack.ownedStreamingPlatform.infrastructureSetup!;
    const facilities = setup.facilities || [];

    /* ---- network orders ---- */
    const building = facilities.find(facility => !STREAMING_PLUS_CITY_IDS.has(facility.cityId) && facility.type !== 'CLOUD_ALLOCATION' && facility.lease?.tenure !== 'CLOUD' && (facility.rackGroups || []).length > 0)!;
    ok(building, 'a building outside the pack cities');
    const regionId = streamingNetworkRegionOf(building.cityId)!;
    const regionRooms = facilities.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
    const packCity = [...STREAMING_PLUS_CITY_IDS].find(cityId => streamingNetworkRegionOf(cityId) === regionId && !regionRooms.some(room => room.cityId === cityId))!;
    ok(packCity, `a pack city in ${regionId} the company does not use`);
    const newRoom: OwnedStreamingFacility = { ...structuredClone(building), id: 'audit-pack-room', cityId: packCity };
    const toPackCity = { regionId, facilities: [...regionRooms, newRoom] };
    const refusedCity = previewStreamingNetworkOrder(free, toPackCity);
    ok(refusedCity.reason === 'STREAMING_PLUS' && refusedCity.streamingPlusItem?.kind === 'CITY', `a new room in ${getStreamingServerSite(packCity)?.name || packCity} is refused without the pack (${refusedCity.reason})`);
    ok(previewStreamingNetworkOrder(withPack, toPackCity).reason !== 'STREAMING_PLUS', 'and not refused for the pack with it');

    const titanRoom: OwnedStreamingFacility = { ...building, rackGroups: [...(building.rackGroups || []), { ...building.rackGroups![0], id: 'audit-titans', rackCount: 2, serverTier: 'TITAN' }] };
    const titans = { regionId, facilities: regionRooms.map(room => (room.id === building.id ? titanRoom : room)) };
    const refusedTitan = previewStreamingNetworkOrder(free, titans);
    ok(refusedTitan.reason === 'STREAMING_PLUS' && refusedTitan.streamingPlusItem?.kind === 'TIER', `2 Titans more are refused without the pack (${refusedTitan.reason})`);
    ok(previewStreamingNetworkOrder(withPack, titans).reason !== 'STREAMING_PLUS', 'and not refused for the pack with it');

    const meridian = { ...building, id: 'audit-meridian', type: 'CLOUD_ALLOCATION' as const, installedRacks: 4, rackGroups: [], lease: { ...(building.lease as any), tenure: 'CLOUD', cloudProvider: 'MERIDIAN' } } as OwnedStreamingFacility;
    ok(streamingPlusNetworkBlock(free, regionRooms, [...regionRooms, meridian])?.item.kind === 'CLOUD', 'Meridian Edge cloud is refused without the pack');
    ok(streamingPlusNetworkBlock(withPack, regionRooms, [...regionRooms, meridian]) === null, 'and allowed with it');

    /* what a save already has stays: a room already in a pack city may shrink or stay, never grow */
    const heldInPack: OwnedStreamingFacility = { ...building, id: 'held', cityId: packCity };
    ok(streamingPlusNetworkBlock(free, [heldInPack], [heldInPack]) === null, 'a pack-city room the save already has stays');
    const smaller = { ...heldInPack, rackGroups: (heldInPack.rackGroups || []).map(group => ({ ...group, rackCount: Math.max(1, group.rackCount - 1) })), installedRacks: Math.max(1, (heldInPack.installedRacks || 1) - 1) };
    ok(streamingPlusNetworkBlock(free, [heldInPack], [smaller]) === null, 'and it can be made smaller');
    ok(streamingPlusTierOrFallback(free, 'TITAN', 'WORKHORSE') === 'WORKHORSE' && streamingPlusTierOrFallback(withPack, 'TITAN', 'WORKHORSE') === 'TITAN', 'the CTO falls back to Workhorses without the pack');
    ok(!streamingPlusCityOpen(free, 'NYC') && streamingPlusCityOpen(withPack, 'NYC') && streamingPlusCityOpen(free, 'LA'), 'New York needs the pack; Los Angeles never does');

    /* ---- Build: the validation every commission and revision passes ---- */
    const draft = {
        ...createDefaultStreamingInfrastructureDraft(withPack),
        strategy: setup.strategy,
        capacityPackageId: setup.capacityPackageId,
        networkPlacements: setup.networkPlacements,
        facilities: [...facilities, newRoom],
        subscriptionPrices: { ...withPack.ownedStreamingPlatform.subscriptionPrices },
    } as any;
    const issues = validateStreamingInfrastructureDraft(free, draft).issues;
    ok(issues.some(issue => issue.code === 'STREAMING_PLUS'), `Build refuses a pack city without the pack (${issues.map(issue => issue.code).join(',')})`);
    ok(!validateStreamingInfrastructureDraft(withPack, draft).issues.some(issue => issue.code === 'STREAMING_PLUS'), 'and not with it');

    /* ---- Tech ---- */
    const tech = unlockStreamingTech(free, 'PICTURE_12K');
    ok(!tech.changed && tech.reason === 'STREAMING_PLUS', `12K is refused without the pack (${tech.reason})`);
    ok(unlockStreamingTech(withPack, 'PICTURE_12K').reason !== 'STREAMING_PLUS', 'and not refused for the pack with it');
    ok(unlockStreamingTech(free, 'PICTURE_8K').reason !== 'STREAMING_PLUS', '8K is free');

    /* ---- campaigns ---- */
    const subject = streamingCampaignSubjects(withPack).find(item => item.kind === 'SERVICE')!;
    ok(subject, 'the service can be campaigned');
    const drone = { subject: { kind: subject.kind, id: subject.id }, where: { kind: 'LIVE' as const }, formats: ['DRONE_SHOW'] as any, budget: { kind: 'ONE_NIGHT', weeks: 1, strength: 1 } as any };
    ok(quoteStreamingCampaign(free, drone).problems.includes('STREAMING_PLUS'), 'a drone show is refused without the pack');
    ok(!quoteStreamingCampaign(withPack, drone).problems.includes('STREAMING_PLUS'), 'and not with it');
    const social = { ...drone, formats: ['SOCIAL_FEED'] as any, budget: { kind: 'WEEKS', weeks: 4, strength: 1 } as any };
    ok(!quoteStreamingCampaign(free, social).problems.includes('STREAMING_PLUS'), 'a social campaign is free');
    const book = (withPack.ownedStreamingPlatform as any).campaignBook?.campaigns || [];
    const packCampaign = book.find((campaign: any) => campaign.formats?.some((id: string) => ['BUILDING_REVEAL', 'LANDMARK_LIGHT_SHOW', 'DRONE_SHOW', 'FAN_FESTIVAL', 'LIVE_SHOW', 'CITY_SCREEN', 'METRO_WRAP'].includes(id)));
    if (packCampaign) ok(extendStreamingCampaign(free, packCampaign.id, 2).problems.includes('STREAMING_PLUS'), 'more weeks of a pack campaign need the pack');

    /* ---- front page and ident ---- */
    const coverStory = saveStreamingStorefrontPlan(free, { storefrontLayoutId: 'cover-story' }, 'OPERATIONS');
    ok(!coverStory.changed && coverStory.reason === 'LOCKED_OPTION', `Cover Story is refused without the pack (${coverStory.reason})`);
    ok(saveStreamingStorefrontPlan(withPack, { storefrontLayoutId: 'cover-story' }, 'OPERATIONS').reason !== 'LOCKED_OPTION', 'and not with it');
    const sound = withPack.ownedStreamingPlatform.serviceConfiguration.soundIdentKey || 'PULSE';
    const cinematic = rebrandStreamingIdent(free, { soundIdentKey: sound as any, identPackageId: 'CINEMATIC' });
    ok(!cinematic.changed && /Streaming\+/.test(cinematic.message || ''), `the Cinematic ident is refused without the pack (${cinematic.message})`);
    ok(!/Streaming\+/.test(rebrandStreamingIdent(withPack, { soundIdentKey: sound as any, identPackageId: 'CINEMATIC' }).message || ''), 'and not for the pack with it');

    /* ---- the IPO ---- */
    const listing = startStreamingCinematicIpoJourney(free, { ticker: 'AUDT', ask: 1_000_000_000, shares: 1_000_000 });
    ok(!listing.changed && /Streaming\+/.test(listing.reason || ''), `the IPO is refused without the pack (${listing.reason})`);
    ok(!/Streaming\+/.test(startStreamingCinematicIpoJourney(withPack, { ticker: 'AUDT', ask: 1_000_000_000, shares: 1_000_000 }).reason || ''), 'and not for the pack with it');

    /* ---- forced ads: the rules ---- */
    setForcedAdContext({ noAds: false, careerWeek: 40, decisionOpen: false, inTrouble: false, storeOpen: false });
    ok(forcedAdBlocker('WEEK') === null, 'a week break may show when nothing stops it');
    ok(forcedAdBlocker('WEEK', { noAds: true }) === 'NO_ADS', 'No Ads removes it');
    ok(forcedAdBlocker('WEEK', { careerWeek: 10 }) === 'NEW_CAREER', `a new career sees none before week ${FORCED_AD_RULES.firstCareerWeek}`);
    ok(forcedAdBlocker('GREENLIGHT', { decisionOpen: true }) === 'DECISION' && forcedAdBlocker('WEEK', { decisionOpen: true }) === null, 'a task break never lands on a decision popup');
    ok(forcedAdBlocker('RELEASE', { storeOpen: true }) === 'STORE' && forcedAdBlocker('RELEASE', { inTrouble: true }) === 'TROUBLE', 'none in the Store or in trouble');
    ok(await showForcedAd('GREENLIGHT') === true, 'a break shows');
    const now = Date.now();
    ok(forcedAdBlocker('RELEASE', {}, now) === 'COOLDOWN_TIME', 'the next waits out 4 real minutes');
    const later = now + FORCED_AD_RULES.cooldownMs + 1000;
    ok(forcedAdBlocker('RELEASE', {}, later) === 'COOLDOWN_WEEKS', 'and 8 game weeks');
    for (let week = 0; week < FORCED_AD_RULES.cooldownWeeks; week += 1) noteForcedAdWeekPassed();
    ok(forcedAdBlocker('RELEASE', {}, later) === null, 'then one may show again');
    noteRealPurchase();
    ok(forcedAdBlocker('RELEASE', {}, Date.now() + FORCED_AD_RULES.cooldownMs + 1000) === 'PURCHASE', 'none for a while after a real purchase');

    /* ---- rewarded cash ---- */
    ok(rewardedCashAmount({ ...fresh('cash-a'), money: 0 }) === 5_000, 'the cash ad pays at least $5,000');
    ok(rewardedCashAmount({ ...fresh('cash-b'), money: 20_000_000 }) === 20_000, '0.1% of net worth in between');
    ok(rewardedCashAmount({ ...fresh('cash-c'), money: 900_000_000 }) === 250_000, 'and at most $250,000');

    console.log(`streaming+ doors: ${checks} checks passed in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => {
    console.error(error);
    process.exit(1);
});
