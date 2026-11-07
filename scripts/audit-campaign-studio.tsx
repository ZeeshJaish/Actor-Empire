/** #146 (plan §20.9 G, §20.10 point 3): the Campaign Studio on the full test company over real weeks.
 *  - the hub with nothing running: its four figures, the empty state, New campaign pinned;
 *  - a title's "Promote" opens the builder on Where with the title named: everywhere live, the regions, every live country;
 *  - three campaigns launched (a burst on the most-watched title in the biggest region, a pot on the service everywhere,
 *    always-on in one country): the hub lists each, "Starts next week", and nothing is spent yet;
 *  - a week later: week 1 of 4, the pot's money spent of its total, always-on's weekly amount; the head shows the week's
 *    spend and the joins credited;
 *  - once the burst's weeks are done it is a past campaign, graded by cost per join, and the head counts two running.
 * #155 (plan §20.13): How prices each format for a week in the picked countries (a big moment: one night at its place)
 * and the pinned bar adds the picks up; Budget is a week of what you picked × weeks and how hard, with no one-time, pot
 * or always-on; Review repeats the totals; a weeks campaign's page offers +1 week and +4 weeks; Run again of a pot
 * comes back on weeks. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { CampaignBuilder, CampaignStudio, draftOf } from '../components/campaigns/studio/CampaignStudio';
import { CampaignPage } from '../components/campaigns/studio/CampaignPage';
import { CAMPAIGN_FORMATS } from '../services/campaigns/campaignFormats';
import {
    quoteStreamingCampaign,
    startStreamingCampaign,
    streamingCampaignBook,
    streamingCampaignRateCard,
    streamingCampaignMarkets,
    streamingCampaignRegions,
    streamingCampaignSubjects,
    type StreamingCampaignDraft,
} from '../services/campaigns/streamingCampaigns';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Campaign Studio Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const restEnergy = (player: Player): Player => ({ ...player, energy: { ...player.energy, current: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } });
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'SIDE', serverCity: null,
};
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');
/* the Studio's own money and count words */
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `$${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `$${Math.round(value / 1e3)}K` : `$${Math.round(value)}`);
const count = (value: number) => (value >= 1e9 ? `${(value / 1e9).toFixed(1)}B` : value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e3 ? `${Math.round(value / 1e3)}K` : String(Math.round(value)));
const times = (haystack: string, needle: string) => haystack.split(needle).length - 1;

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('campaign-studio'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = restEnergy((await processGameWeek(player)).player);
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);
    const draw = (next: Player, initialSubject: { kind: 'SERVICE' | 'TITLE' | 'UNIVERSE' | 'FRANCHISE'; id: string } | null = null) => text(renderToStaticMarkup(
        <CampaignStudio player={next} brand={brand} onUpdatePlayer={() => undefined} onClose={() => undefined} initialSubject={initialSubject} />));

    /* ── the hub with nothing running ── */
    assert.equal(streamingCampaignBook(player.ownedStreamingPlatform).campaigns.length, 0, 'The test company starts with no campaign');
    const emptyMarkup = renderToStaticMarkup(<CampaignStudio player={player} brand={brand} onUpdatePlayer={() => undefined} onClose={() => undefined} />);
    const empty = text(emptyMarkup);
    for (const part of ['CAMPAIGN STUDIO', 'RUNNING 0', 'THIS WEEK $0', 'JOINS · 4 WK —', 'PER JOIN —', 'none yet', 'No campaign is running', 'New campaign']) {
        assert.ok(empty.includes(part), `The empty hub shows ${part}`);
    }
    /* #151: the test company's launch campaign is its only past campaign, ungraded */
    assert.match(empty, /Past campaigns graded by cost per join .{0,80}?Launch campaign (The service|The catalogue|A flagship original|The price) · \$[\d.]+[KMB]? · \d+ opening countr(y|ies) · [\d.]+[KM]? members at opening —/,
        'The launch campaign is the only past campaign');
    assert.equal(times(empty, 'Launch campaign'), 1, 'and shows once');
    assert.ok(emptyMarkup.includes('background-image:url(&#x27;/assets/campaigns/scenes/dubai-night.jpg&#x27;)'), 'The empty state shows the Dubai backdrop (set inline, not in the stylesheet)');
    console.log('PASS hub: nothing running, four figures at zero, the Dubai backdrop, the launch campaign as the only past one, New campaign pinned');

    /* ── a title's Promote opens the builder on Where ── */
    const subjects = streamingCampaignSubjects(player);
    const watched = new Map((player.world.worldStreamingViewing?.platforms?.PLAYER?.titlePerformance || []).map(row => [String(row.projectId), row.viewingAccounts] as const));
    const titles = subjects.filter(item => item.kind === 'TITLE').sort((left, right) => (watched.get(right.id) || 0) - (watched.get(left.id) || 0));
    const top = titles[0];
    assert.ok(top && (watched.get(top.id) || 0) > 0, 'The most-watched title leads');
    const service = subjects.find(item => item.kind === 'SERVICE')!;
    const markets = streamingCampaignMarkets(player);
    const regions = streamingCampaignRegions(player).sort((left, right) => right.countryIds.length - left.countryIds.length);
    const builder = draw(player, { kind: 'TITLE', id: top.id });
    assert.ok(builder.includes('NEW CAMPAIGN') && builder.includes(top.name.toUpperCase()), 'The builder names the title');
    assert.ok(builder.includes(`Everywhere you are live ${markets.size} countries, each by its homes`), 'Everywhere live, with its countries');
    regions.forEach(region => assert.ok(builder.includes(`${region.name} ${region.countryIds.length}`), `The region ${region.name}`));
    assert.equal(times(builder, 'homes · ads ×'), markets.size, 'Every live country to pick, with its homes and ad prices');
    assert.ok(builder.includes(`Next: How ${markets.size} countries`), 'Next: How, for every live country');
    assert.ok(!builder.includes('No campaign is running'), 'The hub waits behind the builder');
    console.log(`PASS builder: "${top.name}" (the most-watched) opens on Where: ${markets.size} live countries, ${regions.length} regions`);

    /* ── three campaigns launched ── */
    const region = regions[0];
    const biggest = [...markets.values()].sort((left, right) => right.homes - left.homes)[0].countryId;
    let next = player;
    const launch = (draft: StreamingCampaignDraft & { name: string }) => {
        const result = startStreamingCampaign(next, draft);
        assert.ok(result.ok && result.campaignId, `${draft.name} launches: ${result.problems.join(', ')}`);
        next = result.player;
        return result.campaignId!;
    };
    const burstId = launch({ subject: { kind: 'TITLE', id: top.id }, where: { kind: 'REGION', regionId: region.id }, formats: ['SHORT_VIDEO', 'BILLBOARD', 'TV_SPOTS'], budget: { kind: 'BURST', total: 15_000_000, weeks: 4 }, name: top.name });
    launch({ subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'LIVE' }, formats: ['SOCIAL_FEED', 'SEARCH'], budget: { kind: 'POT', total: 25_000_000, weekly: null }, name: `${service.name} everywhere` });
    launch({ subject: { kind: 'SERVICE', id: service.id }, where: { kind: 'COUNTRIES', countryIds: [biggest] }, formats: ['CREATORS'], budget: { kind: 'ALWAYS_ON', monthly: 5_000_000 }, name: `${service.name} creators` });
    assert.equal(next.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash, 'Launching spends nothing yet');
    const launched = draw(next);
    assert.ok(launched.includes('RUNNING 3') && launched.includes('3 now') && launched.includes('THIS WEEK $0'), 'Three running, nothing spent yet');
    assert.equal(times(launched, 'Starts next week'), 3, 'Each starts next week');
    assert.ok(launched.includes(`TITLE · ${region.id.replaceAll('_', ' ')} · ${region.countryIds.length} ${top.name}`), 'The burst: a title, its region and countries');
    assert.ok(launched.includes(`THE SERVICE · EVERYWHERE LIVE · ${markets.size} ${service.name} everywhere`), 'The pot: the service everywhere');
    console.log(`PASS launched: three running from week ${getAbsoluteWeek(next.age, next.currentWeek) + 1}, each "Starts next week", treasury untouched`);

    /* ── a week later ── */
    next = restEnergy((await processGameWeek(next)).player);
    const week = getAbsoluteWeek(next.age, next.currentWeek);
    const book = streamingCampaignBook(next.ownedStreamingPlatform);
    const spend = book.campaigns.reduce((sum, campaign) => sum + (campaign.weeks.find(item => item.absoluteWeek === week)?.spend || 0), 0);
    const joins = book.campaigns.flatMap(campaign => campaign.weeks).reduce((sum, item) => sum + item.joins, 0);
    const pot = book.campaigns.find(campaign => campaign.budget.kind === 'POT')!;
    assert.ok(spend > 0 && joins > 0, 'The first week spent money and was credited with joins');
    const running = draw(next);
    assert.ok(running.includes(`THIS WEEK ${money(spend)}`), `The head: this week's ${money(spend)}`);
    assert.ok(running.includes(`JOINS · 4 WK +${count(joins)}`) && running.includes(`PER JOIN $${Math.round(spend / joins)}`), 'The head: joins and what a join cost');
    assert.ok(running.includes('Week 1 of 4'), 'The burst: week 1 of 4');
    assert.ok(running.includes(`${money(pot.spent)} of ${money(25_000_000)}`), 'The pot: its money spent of its total');
    assert.ok(running.includes(`${money(5_000_000 / 4.33)} a week · always on`), 'Always-on: its weekly amount');
    assert.ok(!running.includes('Starts next week'), 'All three have started');
    console.log(`PASS a week later: ${money(spend)} spent, +${count(joins)} joins at $${Math.round(spend / joins)} each; week 1 of 4; the pot ${money(pot.spent)} of $25.0M; always-on ${money(5_000_000 / 4.33)} a week`);

    /* ── the burst finishes and is graded ── */
    for (let index = 0; index < 3; index += 1) next = restEnergy((await processGameWeek(next)).player);
    const burst = streamingCampaignBook(next.ownedStreamingPlatform).campaigns.find(campaign => campaign.id === burstId)!;
    assert.equal(burst.status, 'FINISHED', 'The burst is done after its four weeks');
    const after = draw(next);
    assert.ok(after.includes('Past campaigns graded by cost per join'), 'Past campaigns, graded by cost per join');
    const burstJoins = burst.weeks.reduce((sum, item) => sum + item.joins, 0);
    assert.ok(after.includes(`${top.name} Done · ${money(burst.spent)} · +${count(burstJoins)} joins S`), 'The burst: done, its money, its joins, graded S (the only one)');
    assert.ok(after.includes('RUNNING 2') && after.includes('2 now'), 'Two still running');
    console.log(`PASS finished: "${top.name}" done, ${money(burst.spent)} for +${count(burstJoins)} joins ($${Math.round(burst.spent / burstJoins)} a join), graded S; two still running`);

    /* ── #155: How's prices, Budget on weeks, Review, a weeks campaign's page, Run again ── */
    {
        const live = [...markets.keys()];
        const rates = streamingCampaignRateCard(player, live);
        const draft = { subject: { kind: 'SERVICE' as const, id: service.id }, where: { kind: 'LIVE' as const }, formats: ['SOCIAL_FEED', 'TV_SPOTS', 'BUILDING_REVEAL'] as Array<'SOCIAL_FEED' | 'TV_SPOTS' | 'BUILDING_REVEAL'>, budget: { kind: 'WEEKS' as const, weeks: 4, strength: 1 } };
        const quote = quoteStreamingCampaign(player, draft);
        const at = (step: 'HOW' | 'BUDGET' | 'REVIEW') => text(renderToStaticMarkup(
            <CampaignBuilder player={player} brand={brand} accent="#3b82f6" initialSubject={null} initialDraft={draft} initialStep={step} onCancel={() => undefined} onLaunch={() => undefined} />));
        const show = rates.BUILDING_REVEAL.show!;
        const country = (id: string) => (id === 'US' ? 'United States' : id);
        const how = at('HOW');
        assert.ok(how.includes(`Social feed Posts and ads in every feed ${money(rates.SOCIAL_FEED.weekly)} a week`), 'How: a format\'s week in the picked countries');
        assert.ok(how.includes(`TV spots Prime-time breaks ${money(rates.TV_SPOTS.weekly)} a week`));
        assert.ok(how.includes(`Building reveal ${country(show.countryId)} One night · ${money(show.price)} ⚡${CAMPAIGN_FORMATS.BUILDING_REVEAL.energy}`), 'A big moment: one night at its place');
        assert.ok(!how.includes('from $') && !how.includes('a show'), 'No per-country "from" price any more');
        assert.ok(how.includes(`Where the nights happen one place each Building reveal ${country(show.countryId)} Change`), 'Its place, changeable');
        const weekly = rates.SOCIAL_FEED.weekly + rates.TV_SPOTS.weekly;
        assert.ok(how.includes(`Next: Creative 3 picked · ${money(weekly)} a week · +${money(show.price)} once`), 'The pinned bar adds the picks up');
        const budget = at('BUDGET');
        for (const gone of ['One-time', 'A pot', 'Always-on', 'THE POT', 'A MONTH']) assert.ok(!budget.includes(gone), `Budget has no ${gone}`);
        assert.ok(budget.includes(`A WEEK OF WHAT YOU PICKED ${money(quote.weekly)}`) && Math.abs(quote.weekly - weekly) <= 2, 'Budget: a week of what you picked, the same as How\'s');
        assert.ok(budget.includes(`+ once, in the first week: Building reveal in the United States · ${money(show.price)}`) || show.countryId !== 'US', 'The night, once');
        assert.ok(budget.includes('HOW LONG − 4 weeks +') && budget.includes('Normal Strong ×1.5 All-out ×2'), 'How long and how hard');
        /* #160: paid in full when it starts: what the treasury keeps */
        assert.ok(budget.includes(`IN ALL ${money(quote.total)} 4 weeks, paid now LEFT AFTER ${money(quote.treasury - quote.total)} of ${money(quote.treasury)} in the treasury ENERGY ⚡${quote.energy} to commission`), 'The totals');
        assert.ok(budget.includes('Paid in full when it starts; it runs all its weeks.'), 'Paid in full, said');
        assert.equal(quote.energy, 9, '5 + the building reveal\'s 4');
        assert.ok(budget.includes(`Next: Review ${money(quote.total)} in all`));
        const review = at('REVIEW');
        assert.ok(review.includes(`${money(quote.weekly)} a week for 4 weeks · Normal`) && review.includes(`IN ALL ${money(quote.total)}`), 'Review repeats them');
        assert.ok(review.includes(`Launch campaign ${money(quote.total)} paid now · ⚡9`));
        /* a weeks campaign, a week in */
        const begun = startStreamingCampaign(player, { ...draft, name: 'Weeks audit' });
        assert.ok(begun.ok && begun.player.ownedStreamingPlatform.treasuryCash === player.ownedStreamingPlatform.treasuryCash - quote.total, '#160: paid in full when it starts');
        const ran = restEnergy((await processGameWeek(begun.player)).player);
        const campaign = streamingCampaignBook(ran.ownedStreamingPlatform).campaigns.find(item => item.id === begun.campaignId)!;
        assert.ok(draw(ran).includes('Week 1 of 4'), 'The hub: week 1 of 4');
        const page = text(renderToStaticMarkup(<CampaignPage campaign={campaign} week={getAbsoluteWeek(ran.age, ran.currentWeek)} accent="#3b82f6" grade={null} awareness={{}} news={[]}
            creative={{ title: 'NORTHSTAR+', service: 'NORTHSTAR+', hue: 212, brandHue: 212, kind: 'SERVICE', art: null }} moneyLeft={campaign.paid! - campaign.spent}
            onClose={() => undefined} onStop={() => undefined} onTopUp={() => undefined} onRunAgain={() => undefined} onLive={() => undefined} onExtend={() => undefined}
            extendPrice={added => added * quote.weekly} treasury={3 * quote.weekly} />));
        /* #160: paid in full: what it paid and has run, new weeks priced now (four more than the treasury holds), Stop gives back */
        assert.ok(page.includes('RUNNING · WEEK 1 OF 4') && page.includes(`PAID ${money(campaign.paid!)} ${money(campaign.spent)} run so far`), 'Its page: what it paid, what it has run');
        assert.ok(page.includes(`+1 week ${money(quote.weekly)}`) && page.includes('+4 weeks not enough') && page.includes(`Stop ${money(campaign.paid! - campaign.spent)} back`), 'Its page: +1 week priced, +4 weeks more than the treasury holds, Stop with what comes back');
        /* Run again of a pot comes back on weeks */
        const potDraft = draftOf(pot);
        assert.deepEqual(potDraft.budget, { kind: 'WEEKS', weeks: 4, strength: 1 }, 'Run again: a pot comes back as four weeks');
        console.log(`PASS #155: How ${money(weekly)} a week + ${money(show.price)} once; Budget ${money(quote.total)} for 4 weeks, ⚡${quote.energy}, paid now (#160); Review the same; its page: paid, +1 / +4 weeks priced, Stop gives back; Run again on weeks`);
    }

    console.log(`campaign studio audit passed in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
