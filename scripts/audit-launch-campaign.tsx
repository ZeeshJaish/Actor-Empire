/** #151 (plan §20.12): the launch campaign in the Campaign Studio's builder, launch mode.
 *  - every campaign format feeds one of the launch engine's channels; picked formats and launch doors set the channels'
 *    weights (each picked format adds one to its channel);
 *  - the opening forecast does not move: the same plan gives the same numbers, the formats alone change nothing, and a
 *    save with only formats keeps the channel mix it had;
 *  - a saved plan keeps its formats, their uploaded art and its night's picture, and drops what is not a format;
 *  - the builder has the Studio's six steps (Creative among them), offers the four pushes, saying why a flagship cannot
 *    lead when no Original is ready, and shows the catalogue's posters;
 *  - the Money stage shows the launch campaign card and its button, with the plan's channels until formats are picked;
 *  - the opening night makes the news the week after the service opens, when the plan spent and had a big moment or a
 *    famous screen in an opening country: a top story with its picture, and two fans' posts.
 * #158 (plan §20.13): the launch campaign's money is the Studio's: a week of what is picked in the opening countries (the
 * rate card, the doors too) × how hard, for its weeks before opening, and its big moments once, at their place, on the
 * last week; the plan runs only those weeks; the Money stage has no ceiling, and its card is the launch marketing. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type CampaignFormatId, type OwnedStreamingLaunchMarketingDraft, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { processOwnedStreamingLaunchMarketingWeek, reserveOwnedStreamingLaunchMarketing, saveOwnedStreamingLaunchMarketingDraft, settleOwnedStreamingLaunchMarketingAtOpening } from '../services/streamingLaunchMarketingLifecycle';
import { forecastStreamingLaunchMarketing, getStreamingLaunchMarketingWeeklySchedule, type StreamingLaunchMarketingInput } from '../services/streamingLaunchMarketing';
import { LAUNCH_DOOR_RATES, launchCampaignMoney, launchCampaignTimeline, launchRateCardOf } from '../services/campaigns/launchCampaignRates';
import { CAMPAIGN_FORMAT_ORDER } from '../services/campaigns/campaignFormats';
import { collectStreamingCampaignNews } from '../services/campaigns/streamingCampaignNews';
import { LAUNCH_CHANNEL_OF, LaunchCampaignBuilder, launchChannelWeights } from '../components/campaigns/studio/LaunchCampaignBuilder';
import { StageMoney } from '../components/studio-finance/components/build/StageMoney';

const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');

/* ── formats to channels ── */
CAMPAIGN_FORMAT_ORDER.forEach(id => assert.ok(LAUNCH_CHANNEL_OF[id], `${id} feeds a launch channel`));
assert.deepEqual(launchChannelWeights(['SOCIAL_FEED', 'SHORT_VIDEO', 'CREATORS', 'LANDMARK_LIGHT_SHOW'], ['DEVICE_STORES']),
    { SOCIAL_DIGITAL: 1, CREATORS: 0.5, PRESS_EVENTS: 0.5, DEVICE_STORES: 0.5 }, 'Each picked format adds one to its channel');
console.log('PASS channels: all 18 formats feed a launch channel; two feeds, creators, a light show and app stores weigh 1 · .5 · .5 · .5');

/* ── the forecast does not move ── */
const input: StreamingLaunchMarketingInput = {
    platformKey: 'audit', absoluteWeek: 100, buildWeeks: 6, availableTreasury: 400_000_000, protectedOperatingCash: 20_000_000,
    hasSellablePlan: true, hasFlagshipOriginal: false, pricingRevision: 1, catalogueRevision: 1, localizationRevision: 0, competitionRevision: 0,
    countries: ['US', 'GB', 'IN'].map((countryId, index) => ({
        countryId, countryName: countryId, reachableHouseholds: [90_000_000, 20_000_000, 60_000_000][index], baseConcurrentStreams: 400_000,
        conversionHeadroom: 0.5, mediaCostIndex: [1.4, 1.2, 0.4][index], purchasingPowerIndex: [1.4, 1.2, 0.5][index], consumerConfidence: 0.8,
        internetAccess: 0.9, localizationCoverage: 0.8, catalogueCoverage: 0.6, competitionPressure: 0.7, priorAwareness: 0.03,
    })),
};
const draft: OwnedStreamingLaunchMarketingDraft = {
    schemaVersion: 1, objective: 'PLATFORM_INTRODUCTION', timeline: 'BALANCED', budgetCeiling: 12_000_000, allocationMode: 'AUTO',
    countryWeights: {}, channelAllocations: { SOCIAL_DIGITAL: 0.6, CREATORS: 0.4 }, updatedAtAbsoluteWeek: 100, revision: 1,
};
const before = forecastStreamingLaunchMarketing(input, draft);
assert.deepEqual(forecastStreamingLaunchMarketing(input, { ...draft, formatIds: ['BILLBOARD', 'TV_SPOTS'] }), before, 'Formats alone change nothing');
assert.deepEqual(forecastStreamingLaunchMarketing(input, structuredClone(draft)), before, 'The same plan gives the same numbers');
const fresh = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'launch-campaign', name: 'Launch Campaign Audit', age: 15, currentWeek: 1 });
const startDraft = normalizeOwnedStreamingPlatformState(fresh.ownedStreamingPlatform, fresh.id).launchMarketingDraft!;
const saved = saveOwnedStreamingLaunchMarketingDraft(fresh, { formatIds: ['SOCIAL_FEED', 'BILLBOARD'] });
assert.ok(saved.changed, 'A pre-launch plan saves');
const savedDraft = normalizeOwnedStreamingPlatformState(saved.player.ownedStreamingPlatform, fresh.id).launchMarketingDraft!;
assert.deepEqual(savedDraft.channelAllocations, startDraft.channelAllocations, 'A save with only formats keeps the channel mix');
assert.deepEqual(savedDraft.formatIds, ['SOCIAL_FEED', 'BILLBOARD'], 'and keeps the formats');
const dirty = normalizeOwnedStreamingPlatformState({ ...saved.player.ownedStreamingPlatform, launchMarketingDraft: { ...savedDraft, formatIds: ['SOCIAL_FEED', 'NOT_A_FORMAT', 'SOCIAL_FEED'] as never } }, fresh.id);
assert.deepEqual(dirty.launchMarketingDraft!.formatIds, ['SOCIAL_FEED'], 'A saved plan drops what is not a format, and repeats');
const withArt = saveOwnedStreamingLaunchMarketingDraft(saved.player, { creativeIds: { BILLBOARD: 'campaign_creative_1', NOT_A_FORMAT: 'x' } as never, pictureMediaId: 'campaign_creative_2' });
const artDraft = normalizeOwnedStreamingPlatformState(withArt.player.ownedStreamingPlatform, fresh.id).launchMarketingDraft!;
assert.deepEqual([artDraft.creativeIds, artDraft.pictureMediaId], [{ BILLBOARD: 'campaign_creative_1' }, 'campaign_creative_2'], 'A saved plan keeps its art and its picture');
const noPicture = saveOwnedStreamingLaunchMarketingDraft(withArt.player, { pictureMediaId: undefined, creativeIds: {} });
const plainDraft = normalizeOwnedStreamingPlatformState(noPicture.player.ownedStreamingPlatform, fresh.id).launchMarketingDraft!;
assert.ok(!plainDraft.pictureMediaId && !plainDraft.creativeIds, 'and drops them when a save has none');
console.log(`PASS forecast: ${before.acquiredAccounts.likely.toLocaleString()} new homes forecast, the same with formats added; a formats-only save keeps the channel mix; art and picture kept`);

/* ── the builder ── */
const builderMarkup = renderToStaticMarkup(
    <LaunchCampaignBuilder draft={draft} channels={[{ id: 'SOCIAL_DIGITAL', label: 'Social & digital', line: 'Targetable reach.', available: true }]}
        maxWeeks={6} forecastFor={next => forecastStreamingLaunchMarketing(input, next)}
        countries={input.countries.map(country => ({ countryId: country.countryId, countryName: country.countryName }))}
        hasFlagshipOriginal={false} hasSellablePlan priceHook="the free plan with ads" flagship={null}
        catalogue={[{ id: 'a', title: 'Paper Kingdoms' }, { id: 'b', title: 'The Last Harbour' }]} serviceName="NORTHSTAR+" brandHue={212} accent="#3b82f6" spare={40_000_000}
        onCancel={() => undefined} onSave={() => undefined} />);
const builder = text(builderMarkup);
for (const words of ['LAUNCH CAMPAIGN', 'STEP 1 OF 6', '1 What 2 Where 3 How 4 Creative 5 Budget 6 Review', 'The service', 'The catalogue',
    'Paper Kingdoms, The Last Harbour', 'A flagship original', 'No Original is ready by opening day.', 'The price', 'Lead with the free plan with ads.', 'Next: Where']) {
    assert.ok(builder.includes(words), `The builder says ${words}`);
}
assert.equal(builderMarkup.split('viewBox="0 0 100 150"').length - 1, 2, 'The catalogue push shows its two titles\' posters');
console.log('PASS builder: the Studio\'s six steps, the four pushes, the catalogue\'s posters, the flagship greyed with its reason, the price push naming its hook');

/* ── the Money stage ── */
const stage = (formatIds?: OwnedStreamingLaunchMarketingDraft['formatIds'], extra: Partial<OwnedStreamingLaunchMarketingDraft> = {}, buildWeeks?: number) => text(renderToStaticMarkup(React.createElement(StageMoney, {
    data: {
        treasury: { available: 50_000_000, committedLaunch: 7_000_000 },
        pricing: { model: 'Subscriptions + ads', plans: 3, arpu: 13, reach: 1_500_000, problems: [] },
        campaigns: [],
        marketing: {
            draft: { ...draft, ...(formatIds ? { formatIds } : {}), ...extra },
            recommendations: { lean: 4_000_000, balanced: 12_000_000, heavy: 20_000_000, event: 30_000_000 },
            forecast: before,
            channels: [{ id: 'SOCIAL_DIGITAL', label: 'Social & digital', line: 'Targetable reach.', available: true }, { id: 'CREATORS', label: 'Creators', line: 'Trusted voices.', available: true }],
            forecastFor: (next: OwnedStreamingLaunchMarketingDraft) => forecastStreamingLaunchMarketing(input, next),
        },
    },
    draft: { campaignId: 'none' },
    patch: () => undefined,
    plan: { lines: [], total: 0, commissionNow: 0, deferred: 0, available: 50_000_000, headroom: 50_000_000, shortfall: 0 },
    ...(buildWeeks ? { totals: { weeks: buildWeeks } } : {}),
    handlers: { onChangeMarketing: () => undefined },
} as never)));
const plain = stage();
assert.ok(plain.includes('Launch campaign') && plain.includes('The service · Steady') && plain.includes('Social & digital · Creators') && plain.includes('Edit the launch campaign'),
    'The Money stage: the launch campaign card, its push and timing, its channels, and its button');
assert.ok(stage(['BILLBOARD', 'CREATORS']).includes('Billboards') && stage(['BILLBOARD', 'CREATORS']).includes('Creators'), 'With formats picked, the card lists them');
console.log('PASS money stage: "Launch campaign · The service · Steady", its channels, then its formats once picked; Edit the launch campaign');

/* ── #158: the launch campaign's money, the Studio's way ── */
const markets = [{ countryId: 'US', homes: 90_000_000, costIndex: 1.4 }, { countryId: 'GB', homes: 20_000_000, costIndex: 1.2 }, { countryId: 'IN', homes: 60_000_000, costIndex: 0.4 }];
const weight = 1.4 * 90 / 20 + 1.2 * 20 / 20 + 0.4 * 60 / 20;
const card = launchRateCardOf(markets);
assert.equal(card.formats.TV_SPOTS.weekly, Math.round(400_000 * weight), 'A format\'s week: its rate card in each opening country, by homes and ad prices');
assert.equal(card.doors.DEVICE_STORES, Math.round(LAUNCH_DOOR_RATES.DEVICE_STORES * weight), 'and a door\'s');
assert.deepEqual(card.formats.DRONE_SHOW.show, { countryId: 'US', site: null, price: Math.round(2_000_000 * 1.4) }, 'A big moment: one night, at the biggest ad market');
assert.equal(launchRateCardOf(markets, { DRONE_SHOW: 'GB' }).formats.DRONE_SHOW.show?.countryId, 'GB', 'or where it is put');
const picked = launchCampaignMoney(card, { formats: ['SOCIAL_FEED', 'TV_SPOTS', 'DRONE_SHOW'], doors: ['DEVICE_STORES'], weeks: 4, strength: 1.5 }, 6);
const aWeek = Math.round((card.formats.SOCIAL_FEED.weekly + card.formats.TV_SPOTS.weekly + card.doors.DEVICE_STORES) * 1.5);
assert.deepEqual(picked, { weekly: aWeek, weeks: 4, night: 2_800_000, total: aWeek * 4 + 2_800_000, places: { DRONE_SHOW: 'US' } }, 'In all = a week × how hard × weeks + the night');
assert.equal(launchCampaignMoney(card, { formats: ['SOCIAL_FEED'], doors: [], weeks: 9, strength: 1 }, 6).weeks, 6, 'At most the build\'s weeks');
assert.deepEqual(launchCampaignMoney(card, { formats: ['DRONE_SHOW'], doors: [], weeks: 4, strength: 2 }, 6), { weekly: 0, weeks: 1, night: 2_800_000, total: 2_800_000, places: { DRONE_SHOW: 'US' } },
    'Only a big moment: opening night, no weeks, not × how hard');
assert.deepEqual([launchCampaignTimeline(1), launchCampaignTimeline(4)], ['LAST_WEEK_PUSH', 'BALANCED'], 'One week is an opening-week push, more is steady');
assert.deepEqual(getStreamingLaunchMarketingWeeklySchedule(picked.total, 'BALANCED', 4, picked.night), [aWeek, aWeek, aWeek, aWeek + 2_800_000], 'A week each week, the night on the last');
assert.deepEqual(getStreamingLaunchMarketingWeeklySchedule(12_000_000, 'BALANCED', 4), [3_000_000, 3_000_000, 3_000_000, 3_000_000], 'Without a night, as before');
console.log(`PASS money: TV spots ${(card.formats.TV_SPOTS.weekly / 1e6).toFixed(2)}M a week in US+GB+IN, app stores ${(card.doors.DEVICE_STORES / 1e3).toFixed(0)}K; feed+TV+stores at Strong ${(aWeek / 1e6).toFixed(2)}M × 4 weeks + a drone show in the US $2.8M = ${(picked.total / 1e6).toFixed(2)}M`);

/* the plan runs its weeks before opening, and spends a week's money each, the night on the last */
const funded = { ...fresh, ownedStreamingPlatform: { ...fresh.ownedStreamingPlatform, treasuryCash: 500_000_000 } } as Player;
const planned = saveOwnedStreamingLaunchMarketingDraft(funded, { budgetCeiling: picked.total, timeline: 'BALANCED', weeks: 4, strength: 1.5, places: picked.places, openingNight: picked.night, formatIds: ['SOCIAL_FEED', 'TV_SPOTS', 'DRONE_SHOW'] });
const now = getAbsoluteWeek(planned.player.age, planned.player.currentWeek);
const reserved = reserveOwnedStreamingLaunchMarketing(planned.player, forecastStreamingLaunchMarketing(input, normalizeOwnedStreamingPlatformState(planned.player.ownedStreamingPlatform, fresh.id).launchMarketingDraft!), now + 6, ['GB', 'IN', 'US']);
assert.equal(reserved.reason, 'RESERVED');
const reservedPlatform = normalizeOwnedStreamingPlatformState(reserved.player.ownedStreamingPlatform, fresh.id);
assert.deepEqual([reservedPlatform.launchMarketingPlan!.startsAtAbsoluteWeek - now, reservedPlatform.launchMarketingPlan!.endsAtAbsoluteWeek - now], [3, 6], 'A 4-week plan in a 6-week build runs its last 4 weeks');
assert.equal(reservedPlatform.costCommitments.find(item => item.category === 'MARKETING')?.label, 'Launch campaign', 'The commitment is the launch campaign');
let running = reserved.player;
const spent: number[] = [];
for (let week = 1; week <= 6; week += 1) {
    running = processOwnedStreamingLaunchMarketingWeek({ ...running, currentWeek: running.currentWeek + 1 }).player;
    spent.push(normalizeOwnedStreamingPlatformState(running.ownedStreamingPlatform, fresh.id).launchMarketingPlan!.spentAmount);
}
assert.deepEqual(spent.map((amount, index) => amount - (spent[index - 1] ?? 0)), [0, 0, aWeek, aWeek, aWeek, aWeek + 2_800_000], 'Nothing before its weeks; a week each; the night on opening week');
/* #160: a plan built with its weeks is paid in full at commission: the treasury pays once, then its weeks use it */
assert.ok(reservedPlatform.launchMarketingPlan!.prepaid && reservedPlatform.treasuryCash === 500_000_000 - picked.total, 'Paid in full at commission');
assert.equal(reservedPlatform.costCommitments.find(item => item.category === 'MARKETING')?.status, 'PAID');
assert.equal(normalizeOwnedStreamingPlatformState(running.ownedStreamingPlatform, fresh.id).treasuryCash, 500_000_000 - picked.total, 'Its weeks do not touch the treasury again');
const atOpening = settleOwnedStreamingLaunchMarketingAtOpening(running);
assert.ok(atOpening.changed && normalizeOwnedStreamingPlatformState(atOpening.player.ownedStreamingPlatform, fresh.id).launchMarketingPlan!.returnedAmount === 0, 'All of it used by opening: nothing comes back');
const early = settleOwnedStreamingLaunchMarketingAtOpening(processOwnedStreamingLaunchMarketingWeek({ ...reserved.player, currentWeek: reserved.player.currentWeek + 4 }).player);
const earlyPlatform = normalizeOwnedStreamingPlatformState(early.player.ownedStreamingPlatform, fresh.id);
assert.equal(earlyPlatform.treasuryCash, 500_000_000 - picked.total + earlyPlatform.launchMarketingPlan!.returnedAmount, 'Opened early: what its weeks did not use comes back');
assert.ok(earlyPlatform.launchMarketingPlan!.returnedAmount > 0);
const legacy = reserveOwnedStreamingLaunchMarketing(saveOwnedStreamingLaunchMarketingDraft(funded, { budgetCeiling: 12_000_000 }).player, before, now + 6, ['US']);
assert.ok(!normalizeOwnedStreamingPlatformState(legacy.player.ownedStreamingPlatform, fresh.id).launchMarketingPlan!.prepaid
    && normalizeOwnedStreamingPlatformState(legacy.player.ownedStreamingPlatform, fresh.id).treasuryCash === 500_000_000, 'A plan from before #158 is reserved, as before');
const strayDraft = normalizeOwnedStreamingPlatformState({ ...planned.player.ownedStreamingPlatform, launchMarketingDraft: {
    ...normalizeOwnedStreamingPlatformState(planned.player.ownedStreamingPlatform, fresh.id).launchMarketingDraft!,
    weeks: 99, strength: 3, places: { DRONE_SHOW: 'GB', SOCIAL_FEED: 'GB', BILLBOARD: 7 } as never, openingNight: 9e12,
} }, fresh.id).launchMarketingDraft!;
assert.deepEqual([strayDraft.weeks, strayDraft.strength, strayDraft.places, strayDraft.openingNight], [15, undefined, { DRONE_SHOW: 'GB' }, picked.total], 'A save keeps sane weeks, how hard, nights\' places and a night within the budget');
console.log(`PASS plan: reserved weeks 3–6 of the build; spent ${spent.map((amount, index) => ((amount - (spent[index - 1] ?? 0)) / 1e6).toFixed(2)).join(' · ')}M by week; commitment "Launch campaign"; #160: ${(picked.total / 1e6).toFixed(2)}M paid at commission, the weeks not touching the treasury, ${(earlyPlatform.launchMarketingPlan!.returnedAmount / 1e6).toFixed(2)}M back when it opened early; a plan from before is reserved`);

/* the builder's Budget and How, priced */
const named = [{ countryId: 'US', countryName: 'United States' }, { countryId: 'GB', countryName: 'United Kingdom' }, { countryId: 'IN', countryName: 'India' }];
const launchDraft: OwnedStreamingLaunchMarketingDraft = { ...draft, formatIds: ['SOCIAL_FEED', 'TV_SPOTS', 'DRONE_SHOW'], channelAllocations: { SOCIAL_DIGITAL: 1, TV_OUTDOOR: 1, PRESS_EVENTS: 1, DEVICE_STORES: 1 } };
const open = (initialStep: 'HOW' | 'BUDGET', extra: Partial<OwnedStreamingLaunchMarketingDraft> = {}) => text(renderToStaticMarkup(
    <LaunchCampaignBuilder draft={{ ...launchDraft, ...extra }} channels={[{ id: 'SOCIAL_DIGITAL', label: 'Social & digital', line: 'Targetable reach.', available: true }]}
        maxWeeks={6} forecastFor={next => forecastStreamingLaunchMarketing(input, next)} rateCardFor={places => launchRateCardOf(markets, places)}
        countries={named} hasFlagshipOriginal={false} hasSellablePlan priceHook={null} flagship={null} catalogue={[]} serviceName="NORTHSTAR+" brandHue={212} accent="#3b82f6"
        spare={400_000_000} onCancel={() => undefined} onSave={() => undefined} initialStep={initialStep} />));
const money = (value: number) => (value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${Math.round(value / 1e3)}K`);
const normal = Math.round(card.formats.SOCIAL_FEED.weekly + card.formats.TV_SPOTS.weekly + card.doors.DEVICE_STORES);
const budgetStep = open('BUDGET');
for (const words of ['A WEEK OF WHAT YOU PICKED', money(normal), 'WEEKS BEFORE OPENING', '4 weeks', 'Commission', 'Opening night', 'Normal', 'Strong ×1.5', 'All-out ×2',
    '+ once, on opening night: Drone show in the United States · $2.8M', 'IN ALL', money(normal * 4 + 2_800_000), 'The build takes 6 weeks; it runs the last 4.', 'App stores']) {
    assert.ok(budgetStep.includes(words), `Budget says ${words}`);
}
for (const gone of ['Tease early', 'THE BUDGET', 'Balanced', 'Heavy', 'to spare keeps the service running']) assert.ok(!budgetStep.includes(gone), `Budget no longer says ${gone}`);
assert.ok(open('BUDGET', { weeks: 6, strength: 2 }).includes(money(normal * 2 * 6 + 2_800_000)), 'Six weeks, all-out');
const howStep = open('HOW');
for (const words of [`${money(card.formats.TV_SPOTS.weekly)} a week`, `${money(card.formats.SOCIAL_FEED.weekly)} a week`, 'Opening night · $2.8M', `${money(card.doors.DEVICE_STORES)} a week`,
    'Where the nights happen', 'Drone show United States Change', '4 picked']) {
    assert.ok(howStep.includes(words), `How says ${words}`);
}
console.log(`PASS builder: How prices every format and door a week (TV spots ${money(card.formats.TV_SPOTS.weekly)}), the drone show's night and place; Budget: a week ${money(normal)} × 4 weeks before opening + the night = ${money(normal * 4 + 2_800_000)}; no ceiling, no "when"`);

/* the Money stage: no ceiling; the card is the launch marketing */
const weekly = stage(['SOCIAL_FEED', 'TV_SPOTS', 'DRONE_SHOW'], { budgetCeiling: 30_000_000, weeks: 4, openingNight: 2_800_000, places: { DRONE_SHOW: 'US' }, channelAllocations: { SOCIAL_DIGITAL: 1, TV_OUTDOOR: 1, PRESS_EVENTS: 1, DEVICE_STORES: 1 } }, 6);
for (const words of ['Launch campaign The service · 4 weeks before opening', 'A week $6.8M', 'Weeks 4 before opening', 'In all $30M $2.8M of it on opening night', 'App stores', 'Edit the launch campaign', 'Open without it']) {
    assert.ok(weekly.includes(words), `The card says ${words}`);
}
assert.ok(!/marketing ceiling/i.test(weekly), 'No marketing ceiling');
assert.ok(stage(undefined, { budgetCeiling: 0 }).includes('organic opening') && stage(undefined, { budgetCeiling: 0 }).includes('No campaign: the service opens on word of mouth alone') && stage(undefined, { budgetCeiling: 0 }).includes('Build the launch campaign'),
    'No campaign: an organic opening, and the button builds one');
assert.ok(stage(['SOCIAL_FEED'], { budgetCeiling: 30_000_000, weeks: 4 }, 3).includes('The build takes 3 weeks now: its 4 weeks of money would be spent in them.'), 'A build that got shorter says so');
assert.ok(plain.includes('across the build'), 'A plan from before #158: its money, across the build');
console.log('PASS money stage (#158): no ceiling; the card: "A week $6.8M · Weeks 4 before opening · In all $30M, $2.8M of it on opening night", Edit / Open without it; organic; a shorter build warns');

/* ── the opening night in the news ── */
const W = 900;
const opened = (formatIds: CampaignFormatId[], spentAmount = 9_000_000, places?: Partial<Record<CampaignFormatId, string>>) => ({
    ...fresh,
    ownedStreamingPlatform: {
        ...fresh.ownedStreamingPlatform,
        identity: { ...fresh.ownedStreamingPlatform?.identity, slug: 'northstar', name: 'NORTHSTAR+', primaryColor: '#2563EB' },
        launchCommit: { committedAtAbsoluteWeek: W, openingOriginalTitle: '' },
        launchMarketingPlan: { id: 'plan_launch', status: 'SETTLED', objective: 'PLATFORM_INTRODUCTION', formatIds, openingCountryIds: ['GB', 'US'], spentAmount, pictureMediaId: 'pic_launch', ...(places ? { places } : {}) },
        campaignBook: undefined,
    },
}) as unknown as Player;
const night = collectStreamingCampaignNews(opened(['SOCIAL_FEED', 'LANDMARK_LIGHT_SHOW']), W, W + 1);
assert.deepEqual(night.facts.map(fact => [fact.type, fact.importance, fact.headline, fact.imageMediaId]),
    [['PLATFORM_CAMPAIGN_MOMENT', 'HIGH', 'The London Eye lit up for NORTHSTAR+\'s opening night', 'pic_launch']], 'The opening night: a top story with its picture');
assert.deepEqual(night.buzz.map(post => [post.content, post.contentMediaId ?? null, post.industryEventId]),
    [['The London Eye is wearing NORTHSTAR+ blue tonight', 'pic_launch', night.facts[0].id], [`NORTHSTAR+ just opened and the London Eye is all NORTHSTAR+. London is unreal tonight`, null, night.facts[0].id]],
    'Two fans post about it, the first with the picture');
const screen = collectStreamingCampaignNews(opened(['CITY_SCREEN', 'SOCIAL_FEED']), W, W + 1).facts;
assert.deepEqual(screen.map(fact => [fact.importance, fact.headline]), [['MEDIUM', 'NORTHSTAR+ takes over Piccadilly Circus for its opening']], 'A famous screen: MEDIUM');
assert.equal(collectStreamingCampaignNews(opened(['SOCIAL_FEED', 'BILLBOARD']), W, W + 1).facts.length, 0, 'No big moment or famous screen: no story');
assert.equal(collectStreamingCampaignNews(opened(['LANDMARK_LIGHT_SHOW'], 0), W, W + 1).facts.length, 0, 'Nothing spent: no story');
assert.equal(collectStreamingCampaignNews(opened(['LANDMARK_LIGHT_SHOW']), W + 1, W + 2).facts.length, 0, 'Said once, the week after opening');
/* #158: the night happens where the plan put it */
const droneUS = collectStreamingCampaignNews(opened(['DRONE_SHOW'], 9_000_000, { DRONE_SHOW: 'US' }), W, W + 1).facts[0]?.headline ?? '';
const droneGB = collectStreamingCampaignNews(opened(['DRONE_SHOW'], 9_000_000, { DRONE_SHOW: 'GB' }), W, W + 1).facts[0]?.headline ?? '';
console.log(`  drone show news: US "${droneUS}" · GB "${droneGB}"`);
assert.ok(droneUS && droneGB && droneUS !== droneGB, 'The opening night\'s news is where the plan put the night');
console.log(`PASS news: "${night.facts[0].headline}" (HIGH, with its picture); fans: "${night.buzz[0].content}"; a famous screen "${screen[0].headline}" (MEDIUM); none without a moment, money, or once said`);
console.log('launch campaign audit passed');
