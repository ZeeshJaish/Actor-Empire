/** #152: rival AI platforms run campaigns through the campaign engine.
 *  - a rival that released a title in the last two weeks starts a campaign on it once the player's service is open (none
 *    before); its universe when it carries more of it; the service about twice a year; at most two running; a title
 *    once; none under spending restrictions or when it cannot spare twice the total;
 *  - its spend is the engine's week, charged as a discretionary cost, within what it can spare;
 *  - its offer's marketing index is higher where its campaigns built awareness; a title it pushed pulls harder in the
 *    weekly chart;
 *  - its big nights make the news in its own name, with two fans' posts; a famous screen is a smaller story;
 *  - a real week: the AI turn starts and runs it, charges it, and does so the same way twice. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Campaign, type CampaignBook, type PlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createDeterministicRng } from '../services/deterministicRandom';
import { emptyCampaignBook } from '../services/campaigns/campaignEngine';
import { collectStreamingCampaignNews } from '../services/campaigns/streamingCampaignNews';
import { getWorldStreamingRivalOffers } from '../services/worldEconomy/worldStreamingOffers';
import { buildStreamingWeeklyChartWeek, streamingChartAllList } from '../services/streamingWeeklyChart';
import {
    PLATFORM_AI_CAMPAIGN_COUNTRIES,
    platformAiCampaignCash,
    planPlatformAiCampaign,
    preparePlatformAiCampaignsWeek,
} from '../services/platformAi/platformAiCampaigns';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Rival Campaigns Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const money = (value: number) => (value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : `$${Math.round(value / 1e3)}K`);

/** the rival with a title of its own released this week: a world project, set on one of its plans */
const withRelease = (player: Player, rivalId: string, week: number): { player: Player; projectId: string; title: string } => {
    const rival = player.world.platforms![rivalId as keyof typeof player.world.platforms] as PlatformState;
    const project = [...player.world.projects].filter(item => !item.universeId).sort((left, right) => right.quality - left.quality || left.id.localeCompare(right.id))[0];
    const plan = rival.ai!.slate.find(item => item.status === 'RELEASED') ?? rival.ai!.slate[0];
    const countryIds = rival.ai!.capabilities.activeCountryIds.slice(0, 12);
    const entry = { id: `audit-entry-${project.id}`, sourceProjectId: project.id, canonicalProjectId: project.id, rightsContractId: null,
        premiereAtAbsoluteWeek: week, localizationReadyAtAbsoluteWeek: week, countryIds, releasePattern: plan.releasePattern || 'ALL_AT_ONCE',
        installmentAbsoluteWeeks: [week], status: 'RELEASED' as const, releasedAtAbsoluteWeek: week, streamingWindowId: null };
    /* one more title released this week on a plan it has already released; its book starts empty */
    const released = { ...plan, releaseEntries: [...plan.releaseEntries, entry as typeof plan.releaseEntries[number]] };
    const { campaignBook: _old, ...ai } = rival.ai!;
    const next: PlatformState = { ...rival, ai: { ...ai, slate: rival.ai!.slate.map(item => (item.id === plan.id ? released : item)) } };
    return { player: { ...player, world: { ...player.world, platforms: { ...player.world.platforms!, [rivalId]: next } } }, projectId: project.id, title: project.title };
};
const rivalOf = (player: Player, rivalId: string) => player.world.platforms![rivalId as keyof typeof player.world.platforms] as PlatformState;
const setRival = (player: Player, rival: PlatformState): Player => ({ ...player, world: { ...player.world, platforms: { ...player.world.platforms!, [rival.id]: rival } } });

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('rival-campaigns'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = (await processGameWeek(player)).player;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s (week ${week})`);
    const RIVAL = 'NETFLIX';

    /* ── a release starts a campaign ── */
    const { player: released, projectId, title } = withRelease(player, RIVAL, week);
    const rival = rivalOf(released, RIVAL);
    const cash = platformAiCampaignCash(rival);
    const prepared = preparePlatformAiCampaignsWeek({ player: released, platform: rival, absoluteWeek: week + 1 });
    const campaign = prepared.started!;
    assert.ok(campaign, 'A release starts a campaign');
    assert.deepEqual([campaign.subject.kind, campaign.subject.id, campaign.subject.name], ['TITLE', projectId, title], 'on the title it released');
    assert.ok(campaign.countryIds.length > 0 && campaign.countryIds.length <= PLATFORM_AI_CAMPAIGN_COUNTRIES
        && campaign.countryIds.every(id => rival.ai!.capabilities.activeCountryIds.includes(id) || rival.ai!.marketOperations.some(operation => operation.countryId === id)),
        'in its biggest open markets, eight at most');
    assert.ok(campaign.formats.includes('SOCIAL_FEED') && campaign.formats.includes('BILLBOARD'), 'with the feeds and billboards');
    assert.equal(campaign.budget.kind, 'BURST');
    assert.ok(campaign.budget.kind === 'BURST' && campaign.budget.total >= 1_000_000 && campaign.budget.total * 2 <= cash, 'a burst it can spare twice over');
    const book = prepared.platform.ai!.campaignBook!;
    const ran = book.campaigns.find(item => item.id === campaign.id)!;
    assert.ok(ran.weeks[0]?.spend > 0 && Math.abs(prepared.discretionaryCostMillions * 1e6 - ran.weeks[0].spend) < 1, 'Its first week is spent and charged as a discretionary cost');
    assert.ok(Object.keys(book.serviceAwareness).length > 0 && (book.titleAwareness[projectId] && Object.keys(book.titleAwareness[projectId]).length > 0),
        'It builds the service\'s and the title\'s awareness');
    console.log(`PASS start: ${rival.name} pushes "${title}" in ${campaign.countryIds.length} countries with ${campaign.formats.join(', ')}; ${money(campaign.budget.kind === 'BURST' ? campaign.budget.total : 0)} over ${campaign.budget.kind === 'BURST' ? campaign.budget.weeks : 0} weeks; ${money(ran.weeks[0].spend)} the first week, charged`);

    /* ── when it does not ── */
    const notOpen = { ...released, ownedStreamingPlatform: { ...released.ownedStreamingPlatform, launchCommit: null } } as unknown as Player;
    assert.equal(preparePlatformAiCampaignsWeek({ player: notOpen, platform: rival, absoluteWeek: week + 1 }).started, null, 'Not before the player\'s service is open');
    const restricted: PlatformState = { ...rival, ai: { ...rival.ai!, spendingRestrictions: { ...rival.ai!.spendingRestrictions, source: 'RESTRUCTURE' } } };
    assert.equal(planPlatformAiCampaign(released, restricted, emptyCampaignBook(), week + 1, cash), null, 'Not under spending restrictions');
    assert.equal(planPlatformAiCampaign(released, rival, emptyCampaignBook(), week + 1, 1_000_000), null, 'Not when it cannot spare twice the total');
    const two: CampaignBook = { ...emptyCampaignBook(), campaigns: [ran, { ...ran, id: 'another' }] };
    assert.equal(planPlatformAiCampaign(released, rival, two, week + 1, cash), null, 'Not with two running');
    const once: CampaignBook = { ...emptyCampaignBook(), campaigns: [{ ...ran, status: 'FINISHED', endedAtAbsoluteWeek: week }] };
    assert.equal(planPlatformAiCampaign(released, rival, once, week + 1, cash), null, 'A title is pushed once');
    const late = planPlatformAiCampaign(released, rival, emptyCampaignBook(), week + 4, cash);
    assert.ok(!late || late.subject.kind === 'SERVICE', 'A release older than two weeks is not pushed');
    const beat = Math.floor(createDeterministicRng(`platform-ai-campaign-beat:${RIVAL}`)() * 13);
    const brandWeek = Array.from({ length: 13 }, (_, index) => week + 4 + index).find(at => (at + beat) % 13 === 0)!;
    const brand = planPlatformAiCampaign(player, rivalOf(player, RIVAL), emptyCampaignBook(), brandWeek, cash);
    assert.deepEqual([brand?.subject.kind, brand?.subject.name], ['SERVICE', rival.name], 'The service itself, on its half-year beat');
    assert.ok(brand!.formats.includes('METRO_WRAP'), 'with metro wraps');
    const recently: CampaignBook = { ...emptyCampaignBook(), campaigns: [{ ...brand!, status: 'FINISHED', startedAtAbsoluteWeek: brandWeek - 10 }] };
    assert.equal(planPlatformAiCampaign(player, rivalOf(player, RIVAL), recently, brandWeek, cash), null, 'Not again within half a year');
    console.log(`PASS gates: none before the player opens, under restrictions, without cash to spare, with two running, or twice for a title; the service on week ${brandWeek} (${brand!.formats.join(', ')})`);

    /* ── its effects: the offer and the chart ── */
    const withBook = setRival(released, prepared.platform);
    const offerOf = (state: Player) => getWorldStreamingRivalOffers(state, week + 1).map(item => item.offer).find(offer => offer.name === rival.name)!;
    const before = offerOf(released);
    const after = offerOf(withBook);
    const country = campaign.countryIds[0];
    assert.equal(before.marketingIndexByCountry, undefined, 'No campaign, no index by country');
    assert.ok((after.marketingIndexByCountry?.[country] ?? 0) > after.marketingIndex, `Its index is higher in ${country}, where it ran`);
    /* the chart: ten equal films on its service (none of them at the one-title cap), one of them pushed to half
       awareness in one country */
    const offerId = offerOf(player).platformId;
    const chartWorld = (book?: CampaignBook): Player => {
        const base = rivalOf(player, RIVAL);
        const { campaignBook: _none, ...ai } = base.ai!;
        return {
            ...player,
            world: {
                ...player.world,
                projects: Array.from({ length: 10 }, (_, index) => ({
                    ...player.world.projects[0], id: `audit-chart-${index}`, title: `Audit Film ${index}`, mediaType: 'MOVIE' as const, quality: 60, universeId: undefined,
                    streamingWindows: [{ platformId: offerId, startsAtAbsoluteWeek: week - 1, expiresAtAbsoluteWeek: week + 50, performance: {} } as never],
                })),
                worldStreamingViewing: { ...player.world.worldStreamingViewing!, aiCatalogue: [],
                    platforms: { [offerId]: { ...player.world.worldStreamingViewing!.platforms![offerId], totalHoursViewed: 1_000_000 } } } as never,
                platforms: { ...player.world.platforms!, [RIVAL]: { ...base, ai: book ? { ...ai, campaignBook: book } : ai } },
            },
        };
    };
    const hoursOf = (state: Player, id: string) => streamingChartAllList(buildStreamingWeeklyChartWeek(state, week)).find(row => row.id === id)?.hours ?? 0;
    const plainHours = hoursOf(chartWorld(), 'audit-chart-3');
    const pushedHours = hoursOf(chartWorld({ ...emptyCampaignBook(), titleAwareness: { 'audit-chart-3': { [country]: 0.5 } } }), 'audit-chart-3');
    assert.ok(plainHours > 0 && pushedHours > plainHours * 1.2, 'A title it pushed pulls harder in the chart');
    console.log(`PASS effects: its marketing index ${before.marketingIndex.toFixed(1)} → ${after.marketingIndexByCountry![country].toFixed(1)} in ${country}; one of ten equal films ${plainHours.toLocaleString()} → ${pushedHours.toLocaleString()} chart hours at half awareness`);

    /* ── the news ── */
    const night = (formats: Campaign['formats'], countryIds: string[]): Player => {
        const moment: Campaign = { ...ran, id: `audit-${formats.join('-')}`, formats, countryIds, weeks: [{ absoluteWeek: week, spend: 3_000_000, reach: 1, awareness: 0.1, joins: 0, viewers: 0 }] };
        return setRival(player, { ...rivalOf(player, RIVAL), ai: { ...rivalOf(player, RIVAL).ai!, campaignBook: { ...emptyCampaignBook(), campaigns: [moment] } } });
    };
    const big = collectStreamingCampaignNews(night(['SOCIAL_FEED', 'LANDMARK_LIGHT_SHOW'], ['US', 'GB']), week, week + 1);
    const story = big.facts.find(fact => fact.companyId === RIVAL)!;
    assert.ok(story, 'A rival\'s big night is news');
    assert.deepEqual([story.importance, story.companyName, story.headline], ['HIGH', rival.name, `The Empire State Building lit up for ${title}`], 'a top story in its own name');
    assert.equal(big.buzz.filter(post => post.industryEventId === story.id).length, 2, 'with two fans\' posts');
    const screen = collectStreamingCampaignNews(night(['SOCIAL_FEED', 'CITY_SCREEN'], ['US']), week, week + 1);
    const screenStory = screen.facts.find(fact => fact.companyId === RIVAL)!;
    assert.deepEqual([screenStory.importance, screenStory.headline], ['MEDIUM', `${title} takes over Times Square`], 'A famous screen: a smaller story');
    assert.equal(screen.buzz.filter(post => post.industryEventId === screenStory.id).length, 0, 'with no fans\' posts of its own');
    assert.equal(collectStreamingCampaignNews(night(['SOCIAL_FEED', 'LANDMARK_LIGHT_SHOW'], ['US']), week + 1, week + 2).facts.filter(fact => fact.companyId === RIVAL).length, 0, 'Said once');
    console.log(`PASS news: "${story.headline}" (${story.companyName}, HIGH, two fans: "${big.buzz[0].content}"); "${screenStory.headline}" (MEDIUM)`);

    /* ── a real week ── */
    /* the test company may be holding a life event whose options carry functions, which structuredClone cannot copy:
       the player is copied by hand, its functions kept as they are */
    const clone = <T,>(value: T): T => (value === null || typeof value !== 'object' ? value
        : Array.isArray(value) ? value.map(clone) as T
            : Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, clone(item)])) as T);
    const weekStart = withRelease(player, RIVAL, week).player;
    const real = (await processGameWeek(clone(weekStart))).player;
    const realRival = rivalOf(real, RIVAL);
    const realCampaign = realRival.ai!.campaignBook?.campaigns.find(item => item.subject.id === projectId);
    assert.ok(realCampaign && realCampaign.weeks.some(item => item.spend > 0), 'The AI turn starts and runs it');
    const snapshot = realRival.ai!.financeHistory.at(-1)! as unknown as { discretionaryCostMillions?: number };
    assert.ok((snapshot.discretionaryCostMillions ?? 0) * 1e6 >= realCampaign!.weeks.find(item => item.spend > 0)!.spend - 1, 'Its spend is in the week\'s discretionary costs');
    const again = (await processGameWeek(clone(weekStart))).player;
    assert.deepEqual(rivalOf(again, RIVAL).ai!.campaignBook, realRival.ai!.campaignBook, 'The same week runs the same way twice');
    const all = Object.values(real.world.platforms || {}).filter(item => item.ai?.campaignBook?.campaigns.length);
    console.log(`PASS week: ${realRival.name} runs "${realCampaign!.name}" (${money(realCampaign!.spent)} so far), charged; the same twice; ${all.length} rival(s) campaigning`);
    console.log(`rival campaigns audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
