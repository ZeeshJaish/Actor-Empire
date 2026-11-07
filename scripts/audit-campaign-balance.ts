/** #153 (plan §20.10 #153): campaigns' balance over a long career, on the full test company.
 *  - Cost per join: five standard campaigns, each run alone for six weeks from the same start. Each is measured two
 *    ways: the joins credited to it, and the homes it really added against the same company without it. A join costs
 *    $40–$400 each, $60–$250 on average, and doubling a burst costs more per join (diminishing returns).
 *  - A long career (60 weeks): an always-on campaign, a title burst every quarter and one big moment.
 *    - The treasury stays positive.
 *    - The weekly close charges what the campaigns spent.
 *    - Campaigns cost a share of revenue a streamer would spend on marketing.
 *    - Big moments take a few percent of the energy.
 *    - The hidden Streaming Awards still move prestige with nothing shown, and never lower the service's reputation in
 *      the world's choice.
 *  - The rivals over the same weeks: what their campaigns spent against their revenue (under 8% each), cash left.
 *  - Speed: a rival's campaign week takes well under a millisecond or two.
 * #154 (plan §20.13): the campaigns are the builder's own now, on weeks (the picks' rate card × how hard), a big moment
 * one night at one place, and every commission paying 5 energy plus each big moment's once. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type PlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { LANDMARK_SITES } from '../services/campaigns/campaignFormats';
import {
    extendStreamingCampaign,
    startStreamingCampaign,
    streamingCampaignBook,
    streamingCampaignMarkets,
    streamingCampaignSubjects,
    type StreamingCampaignDraft,
} from '../services/campaigns/streamingCampaigns';
import { preparePlatformAiCampaignsWeek } from '../services/platformAi/platformAiCampaigns';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign Balance Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const restEnergy = (player: Player): Player => ({ ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } });
const week = async (player: Player): Promise<Player> => restEnergy((await processGameWeek(player)).player);
const money = (value: number) => (Math.abs(value) >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${(value / 1e6).toFixed(1)}M`);
const homesIn = (player: Player, countryIds: string[]) => countryIds.reduce((sum, countryId) => {
    const row = player.world.worldStreamingCustomers?.countries?.[countryId]?.platformSummaries?.find(item => item.platformId === 'PLAYER');
    return sum + (row ? row.joins + row.reactivations + row.switchIns : 0);
}, 0);
const RUN_WEEKS = 6;

async function main() {
    const started = performance.now();
    let start = await buildStreamingFullPlatformQa(fresh('campaign-balance'), { processWeek: processGameWeek, persistWeek: async next => next });
    start = await week(start);
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);
    const subjects = streamingCampaignSubjects(start);
    const service = subjects.find(subject => subject.kind === 'SERVICE')!;
    const watched = new Map((start.world.worldStreamingViewing?.platforms?.PLAYER?.titlePerformance || []).map(row => [String(row.projectId), row.viewingAccounts] as const));
    const title = subjects.filter(subject => subject.kind === 'TITLE').sort((left, right) => (watched.get(right.id) || 0) - (watched.get(left.id) || 0))[0];
    const live = [...streamingCampaignMarkets(start).keys()];
    const landmark = live.find(countryId => countryId in LANDMARK_SITES);

    /* ── the same company without campaigns ── */
    const baseline: number[] = [];
    let plain = start;
    for (let index = 0; index < RUN_WEEKS; index += 1) { plain = await week(plain); baseline.push(homesIn(plain, live)); }

    /* ── standard campaigns, each alone (#154: the builder's weeks, at Normal unless said) ── */
    const weeksOf = (weeks: number, strength = 1) => ({ kind: 'WEEKS' as const, weeks, strength });
    const standards: Array<{ name: string; draft: StreamingCampaignDraft }> = [
        { name: 'Service online, 4 weeks', draft: { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SHORT_VIDEO', 'CTV'], budget: weeksOf(4) } },
        { name: 'Title online and outdoor, 4 weeks', draft: { subject: { kind: 'TITLE', id: title.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'BILLBOARD', 'TV_SPOTS'], budget: weeksOf(4) } },
        { name: 'Service out of home, 6 weeks', draft: { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'METRO_WRAP', 'BILLBOARD'], budget: weeksOf(6) } },
        { name: 'Service search and social, 6 weeks', draft: { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SEARCH'], budget: weeksOf(6) } },
        ...(landmark ? [{ name: `Light show at the ${LANDMARK_SITES[landmark]} and social, 2 weeks`, draft: { subject: { kind: 'SERVICE' as const, id: service.id }, where: { kind: 'COUNTRIES' as const, countryIds: [landmark] }, formats: ['LANDMARK_LIGHT_SHOW' as const, 'SOCIAL_FEED' as const], budget: weeksOf(2) } }] : []),
        { name: 'Service online, 4 weeks, all-out ×2', draft: { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SHORT_VIDEO', 'CTV'], budget: weeksOf(4, 2) } },
    ];
    const results: Array<{ name: string; spent: number; credited: number; added: number }> = [];
    for (const standard of standards) {
        const begun = startStreamingCampaign(start, standard.draft);
        assert.ok(begun.ok && begun.campaignId, `${standard.name} starts (${begun.problems.join(', ')})`);
        let run = begun.player;
        let added = 0;
        for (let index = 0; index < RUN_WEEKS; index += 1) { run = await week(run); added += homesIn(run, live) - baseline[index]; }
        const campaign = streamingCampaignBook(run.ownedStreamingPlatform).campaigns.find(item => item.id === begun.campaignId)!;
        const credited = campaign.weeks.reduce((sum, item) => sum + item.joins, 0);
        results.push({ name: standard.name, spent: campaign.spent, credited, added });
        console.log(`  ${standard.name}: ${money(campaign.spent)} · ${credited.toLocaleString()} joins credited ($${Math.round(campaign.spent / Math.max(1, credited))} a join) · ${added.toLocaleString()} homes added against no campaign ($${added > 0 ? Math.round(campaign.spent / added) : '—'} a home)`);
    }
    const perJoin = results.map(result => result.spent / Math.max(1, result.credited));
    perJoin.forEach((value, index) => assert.ok(value >= 40 && value <= 400, `${results[index].name}: $${Math.round(value)} a join is within $40–$400`));
    const average = perJoin.reduce((sum, value) => sum + value, 0) / perJoin.length;
    assert.ok(average >= 60 && average <= 250, `$${Math.round(average)} a join on average is within $60–$250`);
    const single = perJoin[0];
    const doubled = perJoin[perJoin.length - 1];
    assert.ok(doubled > single, 'All-out costs more per join than Normal (diminishing returns)');
    const perHome = results.map(result => result.spent / Math.max(1, result.added));
    console.log(`PASS cost per join: $${Math.round(Math.min(...perJoin))}–$${Math.round(Math.max(...perJoin))}, $${Math.round(average)} on average; per home really added $${Math.round(Math.min(...perHome))}–$${Math.round(Math.max(...perHome))}; the online campaign Normal → all-out: $${Math.round(single)} → $${Math.round(doubled)} a join`);

    /* ── a long career ── */
    let career = start;
    const prestigeBefore = career.ownedStreamingPlatform.competitiveWorld.globalPrestige;
    const seasonsBefore = career.ownedStreamingPlatform.competitiveWorld.awardSeasons.length;
    const ceremonies = (player: Player) => player.ownedStreamingPlatform.cinematicQueue.filter(item => item.type === 'STREAMING_AWARDS_CEREMONY').length;
    const queuedBefore = ceremonies(career);
    /* #154: no always-on any more; a long search-and-social campaign, extended as it runs */
    const always = startStreamingCampaign(career, { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SEARCH'], budget: { kind: 'WEEKS', weeks: 12, strength: 1 } });
    assert.ok(always.ok);
    career = always.player;
    let energyPaid = streamingCampaignBook(career.ownedStreamingPlatform).campaigns.find(item => item.id === always.campaignId)!.energy;
    let lowestTreasury = Infinity;
    let charged = 0;
    let revenue = 0;
    const firstWeek = getAbsoluteWeek(career.age, career.currentWeek);
    const rivalsAt = (player: Player) => Object.values(player.world.platforms || {}).filter(platform => platform.ai) as PlatformState[];
    for (let index = 0; index < 60; index += 1) {
        if (index % 10 === 8 && index < 50) {
            const extended = extendStreamingCampaign(career, always.campaignId!, 4);
            if (extended.ok) career = extended.player;
        }
        if (index % 13 === 2) {
            const now = streamingCampaignSubjects(career).filter(subject => subject.kind === 'TITLE');
            const pick = now[index % Math.max(1, now.length)];
            const burst = startStreamingCampaign(career, { subject: { kind: 'TITLE', id: pick.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SHORT_VIDEO', 'BILLBOARD'], budget: { kind: 'WEEKS', weeks: 4, strength: 1 } });
            if (burst.ok) { career = burst.player; energyPaid += streamingCampaignBook(career.ownedStreamingPlatform).campaigns.find(item => item.id === burst.campaignId)!.energy; }
        }
        if (index === 20 && landmark) {
            const show = startStreamingCampaign(career, { subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'COUNTRIES', countryIds: [landmark] }, formats: ['LANDMARK_LIGHT_SHOW', 'SOCIAL_FEED'], budget: { kind: 'WEEKS', weeks: 2, strength: 1 } });
            if (show.ok) { career = show.player; energyPaid += streamingCampaignBook(career.ownedStreamingPlatform).campaigns.find(item => item.id === show.campaignId)!.energy; }
        }
        career = await week(career);
        lowestTreasury = Math.min(lowestTreasury, career.ownedStreamingPlatform.treasuryCash);
        const operations = career.ownedStreamingPlatform.weeklyHistory.at(-1)?.operations;
        charged += operations?.campaignCost || 0;
        revenue += (operations?.subscriptionRevenue || 0) + (operations?.worldViewingAdvertisingRevenue || 0)
            + (operations?.worldViewingTransactionRevenue || 0) + (operations?.worldViewingSponsorshipRevenue || 0);
    }
    const book = streamingCampaignBook(career.ownedStreamingPlatform);
    /* every campaign here started in this career; a campaign keeps its last 26 weeks, so its total is `spent` */
    const spent = book.campaigns.reduce((sum, campaign) => sum + campaign.spent, 0);
    assert.ok(lowestTreasury > 0, 'The treasury stays positive');
    /* #160: each campaign was paid in full when it started (and for each extension); what came back is its weeks not
       run or what was left at its end, so paid less returned is what they ran; the weekly close charges none of it */
    const paidIn = book.campaigns.reduce((sum, campaign) => sum + (campaign.paid ?? 0) - (campaign.refunded ?? 0), 0);
    const running = book.campaigns.filter(campaign => campaign.status === 'RUNNING').reduce((sum, campaign) => sum + (campaign.paid ?? 0) - campaign.spent, 0);
    assert.equal(charged, 0, 'The weekly close charges nothing for a campaign paid in full');
    assert.ok(Math.abs(paidIn - running - spent) <= Math.max(1, spent * 0.001), `Paid in full: what was paid, less what came back and what is still to run, is what they ran (${money(paidIn - running)} against ${money(spent)})`);
    const share = spent / Math.max(1, revenue);
    assert.ok(share > 0.002 && share < 0.25, `Campaigns cost ${(share * 100).toFixed(1)}% of revenue`);
    const energyShare = energyPaid / (60 * 100);
    assert.ok(energyShare < 0.05, 'Commissioning campaigns takes a few percent of the energy');
    const prestigeAfter = career.ownedStreamingPlatform.competitiveWorld.globalPrestige;
    const seasons = career.ownedStreamingPlatform.competitiveWorld.awardSeasons.slice(seasonsBefore);
    const queuedAfter = ceremonies(career);
    assert.equal(queuedAfter, queuedBefore, 'No awards ceremony is queued');
    /* the awards' prestige never lowers the service's reputation in the world's choice (it was taken as 45 at 0) */
    const reputation = (player: Player) => getWorldStreamingOffers(player, getAbsoluteWeek(player.age, player.currentWeek)).offers.find(offer => offer.isPlayer)!.reputationIndex;
    assert.ok(reputation(career) >= reputation(start) && reputation(career) >= Math.min(100, Math.max(45, prestigeAfter)), `Reputation ${reputation(start)} → ${reputation(career)} with prestige ${prestigeAfter}`);
    console.log(`PASS long career (60 weeks): campaigns ${money(spent)} = ${(share * 100).toFixed(1)}% of revenue (${money(revenue)}), paid in full as each started (#160); the treasury's low ${money(lowestTreasury)}; commissions ${energyPaid}E (${(energyShare * 100).toFixed(1)}% of 60 weeks' 100E); prestige ${prestigeBefore.toFixed(1)} → ${prestigeAfter.toFixed(1)} with ${seasons.length} hidden award season(s), no ceremony; reputation in the world's choice ${reputation(start)} → ${reputation(career)}`);

    /* ── the rivals over the same weeks ── */
    rivalsAt(career).forEach(rival => {
        const window = rival.ai!.financeHistory.filter(snapshot => snapshot.absoluteWeek >= firstWeek);
        const rivalRevenue = window.reduce((sum, snapshot) => sum + snapshot.revenueMillions, 0);
        const discretionary = window.reduce((sum, snapshot) => sum + ((snapshot as unknown as { discretionaryCostMillions?: number }).discretionaryCostMillions || 0), 0);
        const ran = rival.ai!.campaignBook?.campaigns ?? [];
        const rivalShare = discretionary / Math.max(1e-9, rivalRevenue);
        assert.ok(rivalShare < 0.08, `${rival.name}: campaigns and launch marketing ${(rivalShare * 100).toFixed(1)}% of revenue`);
        assert.ok(rival.cashReserve > 0, `${rival.name} keeps cash`);
        console.log(`  ${rival.name}: discretionary ${money(discretionary * 1e6)} = ${(rivalShare * 100).toFixed(2)}% of ${money(rivalRevenue * 1e6)} revenue; ${ran.length} campaign(s) kept now; cash ${money(rival.cashReserve * 1e6)}; ${rival.ai!.status}`);
    });
    console.log('PASS rivals: each spends under 8% of revenue on campaigns and launch marketing, and keeps cash');

    /* ── speed ── */
    const rival = rivalsAt(career)[0];
    const at = getAbsoluteWeek(career.age, career.currentWeek);
    const timed = performance.now();
    let platform = rival;
    for (let index = 1; index <= 200; index += 1) platform = preparePlatformAiCampaignsWeek({ player: career, platform, absoluteWeek: at + index }).platform;
    const perWeek = (performance.now() - timed) / 200;
    assert.ok(perWeek < 2, `A rival's campaign week takes ${perWeek.toFixed(3)} ms`);
    console.log(`PASS speed: a rival's campaign week ${perWeek.toFixed(3)} ms (200 weeks of ${rival.name})`);
    console.log(`campaign balance audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
