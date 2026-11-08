/**
 * Streaming+ Pack (2026-11-08): every door, without the pack (refused) and with it (not refused for the pack).
 * Zeesh: "wizard ya kahin se bhi ... aisa na ho ki idhar to premium hai lekin wizard ya kahin se hum log aur le sakte hain".
 * Doors: the 21 Streaming+ countries (the market plan every screen saves through, filing, the Audience room's
 * suggestion), network orders (a Titan, Meridian Edge; every city takes rooms since 2026-11-09), Build validation,
 * Tech, campaigns (start, extend), the front page, the ident (opening and rebrand), the IPO, the opening
 * commission; what a save already has stays.
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
import { getStreamingServerSite, STREAMING_SERVER_SITES } from '../services/streamingServerSites';
import { STREAMING_WORLD_MARKETS } from '../services/streamingDayOneMarkets';
import { beginStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';
import { getStreamingAudienceMarket } from '../services/streamingAudienceMarket';
import { buildAudienceRoomModel } from '../components/streaming-transplant/audienceRoomModel';
import {
    STREAMING_PLUS_COUNTRY_IDS, hasStreamingPlus, streamingPlusNetworkBlock, streamingPlusTierOrFallback, streamingPlusCountryOpen,
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

    /* ---- the 21 Streaming+ countries (2026-11-09) ---- */
    ok(STREAMING_PLUS_COUNTRY_IDS.size === 21 && STREAMING_PLUS_COUNTRY_IDS.has('CN'), 'the pack holds 21 countries, China among them');
    ok(['US', 'IN', 'GB', 'BR', 'MX', 'ID', 'FR', 'KR'].every(id => !STREAMING_PLUS_COUNTRY_IDS.has(id)), 'the free game keeps the US, India, the UK, Brazil, Mexico, Indonesia, France and Korea');
    ok([...STREAMING_PLUS_COUNTRY_IDS].every(id => STREAMING_WORLD_MARKETS.some(market => market.id === id)), 'every pack country is a real market');
    ok(!streamingPlusCountryOpen(free, 'CN') && streamingPlusCountryOpen(withPack, 'CN') && streamingPlusCountryOpen(free, 'US'), 'China needs the pack; the United States never does');
    const held = new Set(withPack.ownedStreamingPlatform.marketOperations.filter(operation => operation.countryId && operation.status !== 'EXITED').map(operation => operation.countryId!));
    const expansionIds = (player: Player) => player.ownedStreamingPlatform.marketOperations
        .filter(operation => operation.entryKind === 'EXPANSION' && operation.countryId && operation.status !== 'EXITED').map(operation => operation.countryId!);
    const packCountry = [...STREAMING_PLUS_COUNTRY_IDS].find(id => !held.has(id))!;
    const freeCountry = STREAMING_WORLD_MARKETS.find(market => !STREAMING_PLUS_COUNTRY_IDS.has(market.id) && !held.has(market.id))!.id;
    ok(packCountry && freeCountry, `a pack country (${packCountry}) and a free one (${freeCountry}) the company has not entered`);
    const already = expansionIds(withPack);
    const refusedPlan = saveStreamingMarketPlan(free, [...already, packCountry], 'EXPANSION');
    ok(!refusedPlan.changed && refusedPlan.reason === 'STREAMING_PLUS' && refusedPlan.lockedCountryIds?.includes(packCountry), `planning ${packCountry} is refused without the pack (${refusedPlan.reason})`);
    const packPlan = saveStreamingMarketPlan(withPack, [...already, packCountry], 'EXPANSION');
    ok(packPlan.changed && expansionIds(packPlan.player).includes(packCountry), 'and planned with it');
    const mixed = saveStreamingMarketPlan(free, [...already, packCountry, freeCountry], 'EXPANSION');
    ok(mixed.changed && expansionIds(mixed.player).includes(freeCountry) && !expansionIds(mixed.player).includes(packCountry)
        && Boolean(mixed.lockedCountryIds?.includes(packCountry)), `a mixed pick plans ${freeCountry} and leaves ${packCountry} out, by name`);
    const filedFree = beginStreamingMarketClearance(free, [packCountry], 'EXPANSION');
    ok(!filedFree.changed, `${packCountry} cannot be filed without the pack when it was never planned (${filedFree.reason})`);
    /* a pack country the save already holds stays the player's: planned with the pack, then the pack is gone */
    const heldPlan = withoutPack(packPlan.player);
    const kept = saveStreamingMarketPlan(heldPlan, [...already, packCountry, freeCountry], 'EXPANSION');
    ok(kept.changed && expansionIds(kept.player).includes(packCountry) && !kept.lockedCountryIds?.length, `a held ${packCountry} stays in the plan without the pack`);
    const filedHeld = beginStreamingMarketClearance(kept.player, [packCountry], 'EXPANSION');
    ok(filedHeld.reason !== 'STREAMING_PLUS', `and it can still be filed (${filedHeld.reason})`);
    const freeRoom = buildAudienceRoomModel(free, getStreamingAudienceMarket(free));
    ok(!freeRoom.streamingPlusOwned && buildAudienceRoomModel(withPack, getStreamingAudienceMarket(withPack)).streamingPlusOwned, 'the Audience room knows whether the pack is owned');
    ok(!(freeRoom.nextMove?.id === 'ENTER_MARKET' && STREAMING_PLUS_COUNTRY_IDS.has(freeRoom.nextMove.countryId || '')),
        `the Audience room never suggests a Streaming+ country without the pack (${freeRoom.nextMove?.id}${freeRoom.nextMove?.countryId ? ` ${freeRoom.nextMove.countryId}` : ''})`);

    /* ---- network orders: every city takes rooms; Titan and Meridian Edge are the pack's ---- */
    const building = facilities.find(facility => facility.type !== 'CLOUD_ALLOCATION' && facility.lease?.tenure !== 'CLOUD' && (facility.rackGroups || []).length > 0)!;
    ok(building, 'a building to copy');
    const regionId = streamingNetworkRegionOf(building.cityId)!;
    const regionRooms = facilities.filter(facility => streamingNetworkRegionOf(facility.cityId) === regionId);
    /* a city inside a pack country, so a server there must still be free */
    const packCity = STREAMING_SERVER_SITES.find(site => STREAMING_PLUS_COUNTRY_IDS.has(site.countryCode)
        && streamingNetworkRegionOf(site.id) === regionId && !regionRooms.some(room => room.cityId === site.id))?.id;
    ok(packCity, `a city in a Streaming+ country in ${regionId} the company does not use`);
    /* Workhorses only: the test company's own rooms may hold Titans, which are the pack's */
    const newRoom: OwnedStreamingFacility = {
        ...structuredClone(building), id: 'audit-pack-room', cityId: packCity!,
        rackGroups: (building.rackGroups || []).map(group => ({ ...group, serverTier: 'WORKHORSE' as const })),
    };
    const toPackCity = { regionId, facilities: [...regionRooms, newRoom] };
    const roomThere = previewStreamingNetworkOrder(free, toPackCity);
    ok(roomThere.reason !== 'STREAMING_PLUS', `a new room in ${getStreamingServerSite(packCity!)?.name || packCity} is not a pack item (${roomThere.reason})`);

    const titanRoom: OwnedStreamingFacility = { ...building, rackGroups: [...(building.rackGroups || []), { ...building.rackGroups![0], id: 'audit-titans', rackCount: 2, serverTier: 'TITAN' }] };
    const titans = { regionId, facilities: regionRooms.map(room => (room.id === building.id ? titanRoom : room)) };
    const refusedTitan = previewStreamingNetworkOrder(free, titans);
    ok(refusedTitan.reason === 'STREAMING_PLUS' && refusedTitan.streamingPlusItem?.kind === 'TIER', `2 Titans more are refused without the pack (${refusedTitan.reason})`);
    ok(previewStreamingNetworkOrder(withPack, titans).reason !== 'STREAMING_PLUS', 'and not refused for the pack with it');

    const meridian = { ...building, id: 'audit-meridian', type: 'CLOUD_ALLOCATION' as const, installedRacks: 4, rackGroups: [], lease: { ...(building.lease as any), tenure: 'CLOUD', cloudProvider: 'MERIDIAN' } } as OwnedStreamingFacility;
    ok(streamingPlusNetworkBlock(free, regionRooms, [...regionRooms, meridian])?.item.kind === 'CLOUD', 'Meridian Edge cloud is refused without the pack');
    ok(streamingPlusNetworkBlock(withPack, regionRooms, [...regionRooms, meridian]) === null, 'and allowed with it');

    /* what a save already has stays: a Titan room the save has may stay as it is */
    ok(streamingPlusNetworkBlock(free, [titanRoom], [titanRoom]) === null, 'Titans the save already has stay');
    ok(streamingPlusTierOrFallback(free, 'TITAN', 'WORKHORSE') === 'WORKHORSE' && streamingPlusTierOrFallback(withPack, 'TITAN', 'WORKHORSE') === 'TITAN', 'the CTO falls back to Workhorses without the pack');

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
    ok(!issues.some(issue => issue.code === 'STREAMING_PLUS'), `Build takes a room in a Streaming+ country without the pack (${issues.map(issue => issue.code).join(',') || 'no issues'})`);
    const titanDraft = { ...draft, facilities: facilities.map(room => (room.id === building.id ? titanRoom : room)) };
    ok(validateStreamingInfrastructureDraft(free, titanDraft).issues.some(issue => issue.code === 'STREAMING_PLUS'), 'Build refuses new Titans without the pack');
    ok(!validateStreamingInfrastructureDraft(withPack, titanDraft).issues.some(issue => issue.code === 'STREAMING_PLUS'), 'and not with it');

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
