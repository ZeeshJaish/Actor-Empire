/** #145 (plan §20.10 point 3): the campaign engine and its streaming adapter, on the full test company over real weeks.
 *  - subjects (the service, its titles, universes, franchises) and where (live, a region, countries);
 *  - a quote: the first week's money, a running week's, energy for a big moment, the problems that stop a draft;
 *  - starting: a big moment's energy is paid at once; money is spent week by week as an operating cost;
 *  - the three budgets: a burst ends after its weeks, a pot when it is spent, always-on waits a week the treasury
 *    cannot pay it and picks up again;
 *  - effects: against the same company without campaigns, more homes join where they ran, the title campaign's title
 *    is watched more, and awareness fades once they stop;
 *  - results: each week a campaign ran is credited with joins (and a title's with viewers); the same weeks run twice
 *    give the same numbers.
 * #154 (plan §20.13): the rate card (a week of a format in the picked countries), weeks × how hard, a big moment at one
 * place (the biggest market by default, or the one picked) with the news carrying a quarter of it to the other
 * countries, energy 5 + each big moment's once (at most 20), extending by weeks, reach capped by people, and a
 * campaign from before #154 keeping its old rules. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
    extendStreamingCampaign,
    quoteStreamingCampaign,
    streamingCampaignExtensionPrice,
    startStreamingCampaign,
    streamingCampaignRateCard,
    stopStreamingCampaign,
    streamingCampaignBook,
    streamingCampaignMarkets,
    streamingCampaignRegions,
    streamingCampaignSubjects,
    topUpStreamingCampaign,
    type StreamingCampaignDraft,
} from '../services/campaigns/streamingCampaigns';
import { CAMPAIGN_COMMISSION_ENERGY, CAMPAIGN_ENERGY_CAP, CAMPAIGN_FORMATS, LANDMARK_SITES } from '../services/campaigns/campaignFormats';
import { CAMPAIGN_MOMENT_SPREAD, CAMPAIGN_PEOPLE_PER_HOME, CAMPAIGN_RATE_HOMES, CAMPAIGN_REACH_CEILING, campaignWeekBudget } from '../services/campaigns/campaignEngine';
import type { Campaign } from '../types';
import { streamingCampaignWeekCost } from '../services/campaigns/streamingCampaignEffects';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign Engine Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const restEnergy = (player: Player): Player => ({ ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } });
const weeks = async (player: Player, count: number): Promise<Player> => {
    let next = player;
    for (let index = 0; index < count; index += 1) next = restEnergy((await processGameWeek(next)).player);
    return next;
};
const newHomes = (player: Player, countryIds: string[]) => countryIds.reduce((sum, countryId) => {
    const row = player.world.worldStreamingCustomers?.countries?.[countryId]?.platformSummaries?.find(item => item.platformId === 'PLAYER');
    return sum + (row ? row.joins + row.reactivations + row.switchIns : 0);
}, 0);
const money = (value: number) => `$${(value / 1e6).toFixed(1)}M`;

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('campaign-engine'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = await weeks(player, 1);
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);

    /* ── what and where ── */
    const subjects = streamingCampaignSubjects(player);
    const service = subjects.find(subject => subject.kind === 'SERVICE')!;
    const titles = subjects.filter(subject => subject.kind === 'TITLE');
    assert.ok(service && titles.length >= 5, 'The service and its titles can be campaigned');
    const markets = streamingCampaignMarkets(player);
    assert.ok(markets.size >= 10 && [...markets.values()].every(market => market.homes > 0 && market.costIndex >= 0.25 && market.costIndex <= 2.2), 'Every live country with its homes and ad prices');
    const regions = streamingCampaignRegions(player).sort((left, right) => right.countryIds.length - left.countryIds.length);
    const region = regions[0];
    console.log(`PASS what and where: ${subjects.length} subjects (${titles.length} titles, ${subjects.filter(item => item.kind === 'UNIVERSE').length} universes, ${subjects.filter(item => item.kind === 'FRANCHISE').length} franchises); ${markets.size} live countries; ${regions.length} regions, the biggest ${region.name} (${region.countryIds.length})`);

    /* ── quotes ── */
    const title = titles[0];
    const burst: StreamingCampaignDraft = { subject: { kind: 'TITLE', id: title.id }, where: { kind: 'REGION', regionId: region.id }, formats: ['SHORT_VIDEO', 'BILLBOARD', 'TV_SPOTS'], budget: { kind: 'BURST', total: 24_000_000, weeks: 4 } };
    const burstQuote = quoteStreamingCampaign(player, burst);
    assert.deepEqual(burstQuote.problems, [], 'A clean burst');
    assert.ok(Math.abs(burstQuote.firstWeek - 6_000_000) <= 2, 'A burst spreads its total over its weeks');
    assert.equal(burstQuote.energy, CAMPAIGN_COMMISSION_ENERGY, '#154: commissioning any campaign costs 5 energy');
    assert.ok(burstQuote.awarenessAfterMonth > 0.05 && burstQuote.marketingPoints > 0, 'It builds awareness worth marketing points');
    const always: StreamingCampaignDraft = { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SEARCH'], budget: { kind: 'ALWAYS_ON', monthly: 8_660_000 } };
    assert.ok(Math.abs(quoteStreamingCampaign(player, always).weekly - 2_000_000) <= 2, 'Always-on: the month spread weekly');
    assert.ok(quoteStreamingCampaign(player, { ...always, formats: ['BILLBOARD'] }).problems.includes('BUDGET_NOT_ALLOWED'), 'Always-on is online and app formats only');
    assert.ok(quoteStreamingCampaign(player, { ...burst, formats: [] }).problems.includes('NO_FORMATS'));
    assert.ok(quoteStreamingCampaign(player, { ...burst, where: { kind: 'COUNTRIES', countryIds: ['ZZ'] } }).problems.includes('NO_COUNTRIES'), 'Only live countries');
    const landmark = [...markets.keys()].find(countryId => countryId in LANDMARK_SITES);
    const moment: StreamingCampaignDraft | null = landmark ? { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'COUNTRIES', countryIds: [landmark] }, formats: ['LANDMARK_LIGHT_SHOW', 'SOCIAL_FEED'], budget: { kind: 'BURST', total: 9_000_000, weeks: 2 } } : null;
    if (moment) {
        const quote = quoteStreamingCampaign(player, moment);
        assert.deepEqual(quote.problems, []);
        assert.equal(quote.energy, CAMPAIGN_COMMISSION_ENERGY + CAMPAIGN_FORMATS.LANDMARK_LIGHT_SHOW.energy, 'A big moment adds its own energy once');
        assert.equal(quote.sites[0]?.site, LANDMARK_SITES[landmark!], 'At the country\'s landmark');
        assert.ok(quote.firstWeek > quote.weekly, 'The show is paid in the first week');
        assert.ok(quoteStreamingCampaign(player, { ...moment, budget: { kind: 'POT', total: 9_000_000, weekly: null } }).problems.includes('BUDGET_NOT_ALLOWED'), 'A big moment is a one-time burst');
    }
    const nowhere = [...Object.keys(LANDMARK_SITES)].find(countryId => !markets.has(countryId));
    assert.ok(quoteStreamingCampaign(player, { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'COUNTRIES', countryIds: [[...markets.keys()].find(id => !(id in LANDMARK_SITES))!] }, formats: ['LANDMARK_LIGHT_SHOW'], budget: { kind: 'BURST', total: 9_000_000, weeks: 1 } }).problems.includes('FORMAT_NOWHERE'), 'No landmark, no light show');
    console.log(`PASS quotes: burst ${money(burstQuote.firstWeek)} a week in ${burstQuote.countryIds.length} countries, a month to ${(burstQuote.awarenessAfterMonth * 100).toFixed(1)}% awareness (+${burstQuote.marketingPoints} marketing points); always-on ${money(2_000_000)} a week${moment ? `; light show at ${LANDMARK_SITES[landmark!]}, ${CAMPAIGN_COMMISSION_ENERGY + CAMPAIGN_FORMATS.LANDMARK_LIGHT_SHOW.energy}E` : ''}${nowhere ? '' : ''}`);

    /* ── #154: the rate card, weeks, how hard, one place, energy ── */
    const live = [...markets.keys()];
    const all = [...markets.values()];
    const card = streamingCampaignRateCard(player, live);
    const expectWeek = (formatId: keyof typeof CAMPAIGN_FORMATS) => all.reduce((sum, market) => sum + CAMPAIGN_FORMATS[formatId].minWeekly * market.costIndex * market.homes / CAMPAIGN_RATE_HOMES, 0);
    assert.ok(Math.abs(card.SOCIAL_FEED.weekly - expectWeek('SOCIAL_FEED')) <= 1 && card.SOCIAL_FEED.countries === live.length, 'A week of a format: its rate card × homes ÷ 20M × ad prices, summed over the countries');
    assert.ok(Math.abs(card.TV_SPOTS.weekly - expectWeek('TV_SPOTS')) <= 1);
    const biggest = all.reduce((best, market) => (market.homes * market.costIndex > best.homes * best.costIndex ? market : best));
    assert.equal(card.BUILDING_REVEAL.weekly, 0);
    assert.equal(card.BUILDING_REVEAL.show?.countryId, biggest.countryId, 'A big moment happens in the biggest ad market by default');
    assert.equal(card.BUILDING_REVEAL.show?.price, Math.round(CAMPAIGN_FORMATS.BUILDING_REVEAL.minWeekly * biggest.costIndex), 'One night\'s price');
    const other = all.filter(market => market.countryId !== biggest.countryId).sort((left, right) => right.homes - left.homes)[0];
    assert.equal(streamingCampaignRateCard(player, live, { BUILDING_REVEAL: other.countryId }).BUILDING_REVEAL.show?.countryId, other.countryId, 'Or where it is put');
    const weekly: StreamingCampaignDraft = { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'TV_SPOTS', 'BUILDING_REVEAL'], budget: { kind: 'WEEKS', weeks: 4, strength: 1 } };
    const weeklyQuote = quoteStreamingCampaign(player, weekly);
    const show = card.BUILDING_REVEAL.show!.price;
    const rate = card.SOCIAL_FEED.weekly + card.TV_SPOTS.weekly;
    assert.deepEqual(weeklyQuote.problems, [], 'A clean weeks campaign');
    assert.ok(Math.abs(weeklyQuote.weekly - rate) <= 2, `A running week is the picks' rate card (${money(weeklyQuote.weekly)} vs ${money(rate)})`);
    assert.ok(Math.abs(weeklyQuote.firstWeek - (rate + show)) <= 2 && weeklyQuote.moments === show, 'The first week adds the big moment, once');
    assert.ok(Math.abs(weeklyQuote.total - (rate * 4 + show)) <= 8, 'In all: a week × weeks + the moment');
    assert.equal(weeklyQuote.places.BUILDING_REVEAL, biggest.countryId);
    assert.equal(weeklyQuote.energy, CAMPAIGN_COMMISSION_ENERGY + CAMPAIGN_FORMATS.BUILDING_REVEAL.energy, '5 + the building reveal\'s 4');
    const harder = quoteStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 4, strength: 1.5 } });
    assert.ok(Math.abs(harder.weekly - rate * 1.5) <= 2 && harder.moments === show, 'How hard multiplies the weeks, not the show');
    assert.ok(harder.awarenessAfterMonth > weeklyQuote.awarenessAfterMonth, 'and builds more awareness');
    const everything = quoteStreamingCampaign(player, { ...weekly, formats: ['SOCIAL_FEED', 'BUILDING_REVEAL', 'LANDMARK_LIGHT_SHOW', 'DRONE_SHOW', 'FAN_FESTIVAL', 'LIVE_SHOW'] });
    assert.equal(everything.energy, CAMPAIGN_ENERGY_CAP, 'At most 20 energy, whatever is picked');
    assert.ok(everything.moments < 40_000_000, `Five big moments are five nights, not one in every country (${money(everything.moments)})`);
    const people = all.reduce((sum, market) => sum + market.homes * CAMPAIGN_PEOPLE_PER_HOME, 0);
    assert.ok(everything.reach <= people * CAMPAIGN_REACH_CEILING && quoteStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 1, strength: 2 } }).reach <= people * CAMPAIGN_REACH_CEILING, 'Reach never passes the countries\' people');
    assert.equal(quoteStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 40, strength: 7 } }).total, quoteStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 12, strength: 1 } }).total, 'The builder makes 1–12 weeks at 1, 1.5 or 2');
    /* the news carries a quarter of the night to the other countries, at no cost */
    const spreadWeek = campaignWeekBudget({ budget: weekly.budget, spent: 0, toppedUp: 0, formats: ['BUILDING_REVEAL'], places: {} }, 0, all);
    const night = spreadWeek.lines.find(line => line.spend > 0)!;
    const carried = spreadWeek.lines.filter(line => line.spend === 0).reduce((sum, line) => sum + line.impressions, 0);
    assert.ok(night.countryId === biggest.countryId && Math.abs(carried - night.impressions * CAMPAIGN_MOMENT_SPREAD) < 1 && spreadWeek.total === night.spend, 'One night, and a quarter of it seen everywhere else for free');
    /* a campaign from before #154 keeps one show in every country */
    const old: Pick<Campaign, 'budget' | 'spent' | 'toppedUp' | 'formats' | 'places'> = { budget: { kind: 'BURST', total: 900_000_000, weeks: 2 }, spent: 0, toppedUp: 0, formats: ['BUILDING_REVEAL'] };
    assert.equal(campaignWeekBudget(old, 0, all).lines.filter(line => line.spend > 0).length, all.length, 'Before #154: a show in each country');
    console.log(`PASS #154 rate card: a week of social feed ${money(card.SOCIAL_FEED.weekly)}, TV spots ${money(card.TV_SPOTS.weekly)} in ${live.length} countries; a building reveal one night in ${biggest.countryId} ${money(show)}; social + TV + reveal for 4 weeks ${money(weeklyQuote.total)} (${weeklyQuote.energy}E); ×1.5 ${money(harder.weekly)} a week; five big moments ${money(everything.moments)}, ${everything.energy}E; reach ${(everything.reach / 1e6).toFixed(0)}M of ${(people / 1e6).toFixed(0)}M people`);

    /* ── starting ── */
    const treasuryBefore = player.ownedStreamingPlatform.treasuryCash;
    const energyBefore = player.energy.current;
    let withCampaigns = player;
    const first = startStreamingCampaign(withCampaigns, burst);
    assert.ok(first.ok, 'The burst starts');
    withCampaigns = first.player;
    const pot = startStreamingCampaign(withCampaigns, { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'CTV'], budget: { kind: 'POT', total: 9_000_000, weekly: 3_000_000 } });
    assert.ok(pot.ok);
    withCampaigns = pot.player;
    let momentId: string | undefined;
    if (moment) {
        const started = startStreamingCampaign(withCampaigns, moment);
        assert.ok(started.ok);
        momentId = started.campaignId;
        withCampaigns = started.player;
        assert.equal(withCampaigns.energy.current, energyBefore - 3 * CAMPAIGN_COMMISSION_ENERGY - CAMPAIGN_FORMATS.LANDMARK_LIGHT_SHOW.energy, 'Each commission\'s energy (and the show\'s, once) is paid at the start');
    }
    assert.equal(withCampaigns.ownedStreamingPlatform.treasuryCash, treasuryBefore, 'Money is spent as the weeks run, not at the start');
    const book0 = streamingCampaignBook(withCampaigns.ownedStreamingPlatform);
    const week0 = getAbsoluteWeek(withCampaigns.age, withCampaigns.currentWeek);
    assert.ok(book0.campaigns.every(campaign => campaign.status === 'RUNNING' && campaign.startedAtAbsoluteWeek === week0 + 1), 'They run from the next week');
    console.log(`PASS starting: ${book0.campaigns.length} campaigns running from week ${week0 + 1}; treasury unchanged at the start${moment ? `; energy ${energyBefore} → ${withCampaigns.energy.current}` : ''}`);

    /* ── four weeks, against the same company without them ── */
    const control = await weeks(player, 4);
    const ran = await weeks(withCampaigns, 4);
    const book = streamingCampaignBook(ran.ownedStreamingPlatform);
    const burstCampaign = book.campaigns.find(item => item.id === first.campaignId)!;
    const potCampaign = book.campaigns.find(item => item.id === pot.campaignId)!;
    assert.equal(burstCampaign.status, 'FINISHED', 'The burst ended after its four weeks');
    assert.equal(burstCampaign.endReason, 'DONE');
    assert.ok(Math.abs(burstCampaign.spent - 24_000_000) <= 8, `The burst spent its total (${burstCampaign.spent})`);
    assert.equal(potCampaign.status, 'FINISHED', 'The pot ran out');
    assert.equal(potCampaign.endReason, 'SPENT');
    assert.ok(Math.abs(potCampaign.spent - 9_000_000) <= 8, 'The pot spent all of it');
    const spentWeeks = ran.ownedStreamingPlatform.weeklyHistory.slice(-4).map(week => week.operations?.campaignCost || 0);
    const bookSpent = book.campaigns.reduce((sum, campaign) => sum + campaign.weeks.filter(week => week.absoluteWeek > week0).reduce((total, week) => total + week.spend, 0), 0);
    assert.ok(Math.abs(spentWeeks.reduce((sum, value) => sum + value, 0) - bookSpent) <= 8, 'Every week\'s spend is in the weekly close as an operating cost');
    const burstCountries = burstCampaign.countryIds;
    const joinsWith = newHomes(ran, burstCountries);
    const joinsWithout = newHomes(control, burstCountries);
    const credited = book.campaigns.reduce((sum, campaign) => sum + campaign.weeks.reduce((total, week) => total + week.joins, 0), 0);
    assert.ok(credited > 0, 'The campaigns are credited with joins');
    assert.ok(burstCampaign.weeks.some(week => week.viewers > 0), 'The title campaign with viewers');
    const awareness = (player: Player) => burstCountries.reduce((sum, countryId) => sum + (streamingCampaignBook(player.ownedStreamingPlatform).serviceAwareness[countryId] ?? 0), 0) / burstCountries.length;
    console.log(`PASS four weeks: burst ${money(burstCampaign.spent)} (${burstCampaign.endReason}), pot ${money(potCampaign.spent)} (${potCampaign.endReason}); in ${region.name} the last week brought ${joinsWith.toLocaleString()} homes against ${joinsWithout.toLocaleString()} without; ${credited.toLocaleString()} joins credited for ${money(bookSpent)} (${credited > 0 ? `$${Math.round(bookSpent / credited)}` : '—'} a join); ${region.name} awareness ${(awareness(ran) * 100).toFixed(1)}%`);
    if (momentId) {
        const show = book.campaigns.find(item => item.id === momentId)!;
        assert.equal(show.status, 'FINISHED');
        assert.ok(show.weeks[0].spend > show.weeks[1].spend, 'The show\'s money went in its first week');
    }

    /* ── #154: a weeks campaign runs its weeks, spends what it quoted, and can be extended ── */
    {
        const started = startStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 2, strength: 1 } });
        assert.ok(started.ok);
        const saved = streamingCampaignBook(started.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        assert.deepEqual(saved.places, { BUILDING_REVEAL: biggest.countryId }, 'Its moment\'s place is kept');
        assert.equal(started.player.energy.current, player.energy.current - CAMPAIGN_COMMISSION_ENERGY - CAMPAIGN_FORMATS.BUILDING_REVEAL.energy);
        const extended = extendStreamingCampaign(started.player, started.campaignId!, 2);
        assert.ok(extended.ok && extended.player.energy.current === started.player.energy.current, 'Extending costs no energy');
        assert.equal(streamingCampaignBook(extended.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!.budget.kind === 'WEEKS'
            && (streamingCampaignBook(extended.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!.budget as { weeks: number }).weeks, 4, '+2 weeks');
        const quoted = quoteStreamingCampaign(player, { ...weekly, budget: { kind: 'WEEKS', weeks: 4, strength: 1 } });
        const after = await weeks(extended.player, 5);
        const done = streamingCampaignBook(after.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        assert.equal(done.status, 'FINISHED');
        assert.equal(done.endReason, 'DONE');
        assert.equal(done.weeks.filter(week => week.spend > 0).length, 4, 'It ran its four weeks');
        assert.ok(Math.abs(done.spent - quoted.total) / quoted.total < 0.03, `and spent what four weeks were quoted (${money(done.spent)} vs ${money(quoted.total)}; homes move a little week to week)`);
        assert.ok(done.weeks[0].spend > done.weeks[1].spend, 'The night in its first week');
        assert.ok(done.weeks.every(week => week.reach <= people * CAMPAIGN_REACH_CEILING));
        assert.ok(!extendStreamingCampaign(after, started.campaignId!, 1).ok, 'A finished campaign is run again, not extended');
        console.log(`PASS #154 weeks: 2 weeks extended to 4 ran 4 and spent ${money(done.spent)} against ${money(quoted.total)} quoted; its moment in ${biggest.countryId}`);
    }

    /* ── #160: a weeks campaign is paid in full when it starts ── */
    {
        const draft: StreamingCampaignDraft = { ...weekly, budget: { kind: 'WEEKS', weeks: 4, strength: 1 } };
        const price = quoteStreamingCampaign(player, draft).total;
        const withCash = (from: Player, cash: number): Player => ({ ...from, ownedStreamingPlatform: { ...from.ownedStreamingPlatform, treasuryCash: cash } });
        /* too little money: it cannot start */
        const poor = withCash(player, Math.round(price * 0.6));
        const poorQuote = quoteStreamingCampaign(poor, draft);
        assert.ok(poorQuote.problems.includes('TREASURY') && poorQuote.treasury === Math.round(price * 0.6), 'The quote says the treasury cannot pay it in full');
        const refused = startStreamingCampaign(poor, draft);
        assert.ok(!refused.ok && refused.problems.includes('TREASURY') && refused.player === poor, 'and it cannot be commissioned');
        /* enough: all of it leaves now */
        const rich = withCash(player, price + 50_000_000);
        const started = startStreamingCampaign(rich, draft);
        assert.ok(started.ok);
        const paid = streamingCampaignBook(started.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        assert.equal(started.player.ownedStreamingPlatform.treasuryCash, rich.ownedStreamingPlatform.treasuryCash - price, 'The whole price leaves the treasury when it starts');
        assert.equal(paid.paid, price, 'and the campaign keeps what it was paid');
        assert.ok(started.player.ownedStreamingPlatform.eventLedger.some(entry => entry.metadata?.campaignId === started.campaignId && entry.metadata?.amount === -price), 'On the record');
        /* the treasury emptied by other costs: it runs on, and the weekly close does not charge it again */
        const drained = withCash(started.player, 1_000);
        const twoWeeks = await weeks(drained, 2);
        const running = streamingCampaignBook(twoWeeks.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        const ranWeeks = running.weeks.filter(week => week.spend > 0);
        assert.equal(running.status, 'RUNNING', 'An empty treasury does not stop it');
        assert.ok(ranWeeks.length === 2 && running.weeks.every(week => !week.paused), 'It ran both weeks, never waiting');
        assert.ok(ranWeeks.every(week => streamingCampaignWeekCost({ campaignBook: { ...streamingCampaignBook(twoWeeks.ownedStreamingPlatform), campaigns: [running] } }, week.absoluteWeek) === 0), 'The weekly close does not charge it again');
        /* extending: paid now, refused without the money */
        const extension = streamingCampaignExtensionPrice(twoWeeks, running, 2);
        assert.ok(extension > 0 && Math.abs(extension - quoteStreamingCampaign(player, draft).weekly * 2) / extension < 0.03, 'Two more weeks cost two weeks of its rate card');
        const short = extendStreamingCampaign(withCash(twoWeeks, extension - 1), started.campaignId!, 2);
        assert.ok(!short.ok && short.problems.includes('TREASURY'), 'Not without the money');
        const funded = withCash(twoWeeks, extension + 1_000_000);
        const extended = extendStreamingCampaign(funded, started.campaignId!, 2);
        const longer = streamingCampaignBook(extended.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        assert.ok(extended.ok && extended.player.ownedStreamingPlatform.treasuryCash === 1_000_000 && longer.paid === price + extension
            && longer.budget.kind === 'WEEKS' && longer.budget.weeks === 6, 'With it: paid now, six weeks');
        /* stopping early: the weeks not run come back */
        const before = extended.player.ownedStreamingPlatform.treasuryCash;
        const stopped = stopStreamingCampaign(extended.player, started.campaignId!);
        const ended = streamingCampaignBook(stopped.player.ownedStreamingPlatform).campaigns.find(item => item.id === started.campaignId)!;
        const back = longer.paid! - longer.spent;
        assert.ok(stopped.ok && ended.status === 'STOPPED' && ended.refunded === Math.round(back), 'Stopped, it keeps what came back');
        assert.equal(stopped.player.ownedStreamingPlatform.treasuryCash, before + Math.round(back), 'and the treasury has it');
        console.log(`PASS #160 paid in full: ${money(price)} refused with ${money(price * 0.6)}; with enough it left at the start; 2 weeks ran on an empty treasury, not charged again; +2 weeks ${money(extension)} paid now (refused ${money(extension - 1)}); stopped after 2 of 6: ${money(back)} back`);
    }

    /* ── awareness fades once they stop ── */
    const later = await weeks(ran, 4);
    assert.ok(awareness(later) < awareness(ran) * 0.62, `Awareness fades (${(awareness(ran) * 100).toFixed(1)}% → ${(awareness(later) * 100).toFixed(1)}%)`);
    console.log(`PASS fading: ${(awareness(ran) * 100).toFixed(1)}% → ${(awareness(later) * 100).toFixed(1)}% four weeks after the campaigns ended`);

    /* ── always-on waits when the treasury cannot pay ── */
    let broke = startStreamingCampaign(later, always).player;
    broke = { ...broke, ownedStreamingPlatform: { ...broke.ownedStreamingPlatform, treasuryCash: 1_000 } };
    broke = await weeks(broke, 1);
    const waiting = streamingCampaignBook(broke.ownedStreamingPlatform).campaigns.find(item => item.budget.kind === 'ALWAYS_ON')!;
    assert.equal(waiting.status, 'PAUSED', 'Always-on waits a week the treasury cannot pay');
    assert.equal(waiting.weeks.at(-1)?.paused, 'TREASURY');
    assert.equal(waiting.spent, 0);
    const funded = await weeks({ ...broke, ownedStreamingPlatform: { ...broke.ownedStreamingPlatform, treasuryCash: 500_000_000 } }, 1);
    const resumed = streamingCampaignBook(funded.ownedStreamingPlatform).campaigns.find(item => item.id === waiting.id)!;
    assert.equal(resumed.status, 'RUNNING', 'And picks up again when it can');
    assert.ok(resumed.spent > 0);
    const stopped = stopStreamingCampaign(funded, waiting.id);
    assert.ok(stopped.ok && streamingCampaignBook(stopped.player.ownedStreamingPlatform).campaigns.find(item => item.id === waiting.id)!.status === 'STOPPED', 'Stop');
    const topped = topUpStreamingCampaign(stopped.player, pot.campaignId!, 3_000_000);
    const reopened = streamingCampaignBook(topped.player.ownedStreamingPlatform).campaigns.find(item => item.id === pot.campaignId);
    assert.ok(topped.ok && reopened?.status === 'RUNNING' && reopened.toppedUp === 3_000_000, 'A spent pot topped up runs again');
    console.log('PASS budgets: always-on waited a week with no money and picked up again; stop; a spent pot topped up runs again');

    /* ── the same weeks twice ── */
    const again = await weeks(withCampaigns, 4);
    const left = streamingCampaignBook(again.ownedStreamingPlatform).campaigns.map(item => item.weeks.map(week => [week.spend, week.reach, week.awareness, week.joins, week.viewers]));
    const right = book.campaigns.map(item => item.weeks.map(week => [week.spend, week.reach, week.awareness, week.joins, week.viewers]));
    assert.deepEqual(left, right, 'The same weeks give the same results');
    assert.equal(again.ownedStreamingPlatform.metrics.subscribers, ran.ownedStreamingPlatform.metrics.subscribers);
    console.log('PASS determinism: the same four weeks run twice give the same spend, reach, awareness, joins and subscribers');

    console.log(`campaign engine audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
