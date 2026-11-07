/** The Audience room, plan §20.8 (#130–#136). Built on the full test company over a real week, then drawn tab by tab.
 *  Each entry adds its tab's checks:
 *  - the frame (#130): four real figures, five tabs, no REGIONS tab, no made-up ON CHART;
 *  - ANALYTICS (#131): the week's scoreboard reconciles (joined + came back − left = the week's net), the next move,
 *    three metric tabs on real weeks, the churn dial and the 12-week ring, the revenue split adding up, the real
 *    reasons homes came and left, the titles doing the work, who pays; none of the old made-up parts;
 *  - MARKETS (#132), WORLD (#133, its people #140), CAMPAIGNS (#134): see each block; Enter new markets (#139): the wizard's country card;
 *  - TOP 10 (#135, #142): your own service's Top 10 first, every service's on the switch; the #1 hero, rows, posters,
 *    moves and your share of the world's ten;
 *  - every model (#136): the company as an ad-supported service and as a store, a week settled each, five tabs clean;
 *  - before launch the page says the numbers start at launch, and every tab waits for it cleanly. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { AudienceDesk, type AudienceTab } from '../components/streaming-transplant/StreamingAudienceExperience';
import { createCanonicalAudienceState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { getStreamingWeeklyChartView } from '../services/streamingWeeklyChart';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { AudienceMarketEntry, type MarketEntryActions } from '../components/streaming-transplant/AudienceMarketEntry';
import { buildAtlasCountries } from '../components/streaming-transplant/audienceAtlasModel';
import { AudienceTopTenTab } from '../components/streaming-transplant/AudienceTopTenTab';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Audience Room Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'SIDE', serverCity: null,
};
const text = (markup: string) => markup.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, '\'').replace(/\s+/g, ' ');

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('audience-room'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = (await processGameWeek(player)).player;
    console.log(`test company built and a week settled in ${Math.round((performance.now() - started) / 1000)} s`);
    const state = createCanonicalAudienceState(player);
    const room = state.room;
    const draw = (tab: AudienceTab) => text(renderToStaticMarkup(<AudienceDesk brand={brand} state={state} initialTab={tab} onBack={() => undefined}
        onNewCampaign={() => undefined} onObjective={() => undefined} onOpenPlatformOffer={() => undefined}
        marketOperations={player.ownedStreamingPlatform.marketOperations} />));

    /* ── the frame (#130) ── */
    const analytics = draw('ANALYTICS');
    for (const tab of ['ANALYTICS', 'MARKETS', 'WORLD', 'CAMPAIGNS', 'TOP 10']) assert.ok(analytics.includes(tab), `The ${tab} tab`);
    assert.ok(!/\bREGIONS\b/.test(analytics.split('ANALYTICS')[1]?.slice(0, 80) ?? ''), 'No REGIONS tab');
    assert.ok(analytics.includes('THIS WEEK') && analytics.includes('REVENUE / MO') && !analytics.includes('ON CHART'), 'The head\'s four figures, no ON CHART');
    const latest = player.ownedStreamingPlatform.weeklyHistory.at(-1)!;
    assert.equal(room.head.audience, player.ownedStreamingPlatform.metrics.subscribers, 'Your audience is the subscribers');
    assert.equal(room.head.net, latest.netSubscriberMovement, 'This week = the week\'s net movement');
    console.log(`PASS frame: ${room.head.audience.toLocaleString()} subscribers, ${room.head.net! >= 0 ? '+' : ''}${room.head.net!.toLocaleString()} this week, $${room.head.revenueMonthly!.toLocaleString()} a month`);

    /* ── ANALYTICS (#131) ── */
    const ops = latest.operations!;
    assert.equal(room.card.joined, ops.joinedSubscribers);
    assert.equal(room.card.left, ops.cancellations);
    assert.equal(room.card.returned, ops.reactivations);
    assert.equal(room.card.net, room.card.joined + room.card.returned - room.card.left, 'The scoreboard reconciles');
    assert.equal(room.card.net, latest.netSubscriberMovement);
    assert.ok(analytics.includes(`WEEK ${latest.absoluteWeek} · SETTLED`), 'The scoreboard names the settled week');
    assert.ok(analytics.includes('JOINED') && analytics.includes('CAME BACK') && analytics.includes('LEFT'));
    assert.ok(room.nextMove && analytics.includes(room.nextMove.title.replace(/'/g, '\'')), 'The next move is on the page');
    assert.ok(['RETENTION', 'OFFER_PRICE', 'OFFER_SHARING', 'ENTER_MARKET', 'PUSH_TITLE', 'STEADY'].includes(room.nextMove!.id));
    const revenue = room.revenue!;
    assert.equal(revenue.monthly, revenue.subscriptions + revenue.ads + revenue.store + revenue.other, 'The revenue split adds up');
    assert.equal(room.head.revenueMonthly, revenue.monthly);
    assert.equal(room.series.at(-1)!.week, latest.absoluteWeek, 'The lines end on the settled week');
    assert.equal(room.series.at(-1)!.paid, latest.subscribers);
    assert.ok(room.series.length >= 2 && room.series.length <= 104);
    assert.ok(room.retention && room.retention.rate > 0 && room.retention.rate <= 100 && room.retention.weeks <= 12, 'Still here after 12 weeks');
    assert.ok(analytics.includes('CHURN THIS WEEK') && analytics.includes('STILL HERE'), 'The dial and the ring');
    for (const tab of ['REVENUE / MO', 'CHURN', '12W', '26W', '52W']) assert.ok(analytics.includes(tab), `The chart's ${tab}`);
    assert.ok(state.market?.flows.available, 'A settled week has the real reasons');
    assert.ok(analytics.includes('Why they came · why they left') && analytics.includes('◀ LEFT') && analytics.includes('CAME ▶'));
    const top = [...room.titles].sort((left, right) => right.brought - left.brought)[0];
    assert.ok(top && analytics.includes(top.title), 'The title that brought most members in');
    assert.ok(analytics.includes('Titles doing the work') && analytics.includes('Who pays and who watches') && analytics.includes('PLANS THEY PICK'));
    for (const gone of ['What moved it', 'ENGAGEMENT', '7D', '28D', '90D', 'YOUR PLATFORM', 'STREAMING MARKET', 'ALSO EARNING']) {
        assert.ok(!analytics.includes(gone), `${gone} is gone`);
    }
    console.log(`PASS analytics: week ${latest.absoluteWeek} +${room.card.joined.toLocaleString()} joined, +${room.card.returned.toLocaleString()} back, −${room.card.left.toLocaleString()} left; next move ${room.nextMove!.id}; churn ${(room.churn!.now * 100).toFixed(1)}%, ${room.retention!.rate}% still here after ${room.retention!.weeks} weeks; reasons: ${state.market!.flows.came.length} in, ${state.market!.flows.left.length} out`);

    /* ── MARKETS (#132) ── */
    const markets = draw('MARKETS');
    /* #138: the map's second view is WHO LEADS (most paying homes), and YOURS reads as a scale, not bubbles */
    for (const part of ['YOURS', 'WHO LEADS', 'most paying homes', 'Fewer → more', 'THE WORLD', 'Every market', 'HOME SHARE', 'REVENUE / MO', 'Your markets', 'Biggest', 'Growing', 'Falling', 'Room to grow', 'Live', 'On its way', 'Not streaming yet']) {
        assert.ok(markets.includes(part), `MARKETS shows ${part}`);
    }
    assert.ok(!markets.includes('EVERYONE') && !markets.includes("leader's colour"), 'EVERYONE and its bubble key are gone');
    const countries = state.market!.worldCountries;
    const entered = new Set(player.ownedStreamingPlatform.marketOperations.filter(operation => operation.scope === 'COUNTRY' && operation.status !== 'EXITED').map(operation => operation.countryId));
    const biggest = countries.filter(country => entered.has(country.id)).sort((left, right) => right.playerAudience - left.playerAudience)[0];
    assert.ok(biggest && markets.includes(biggest.name), 'Your biggest market is the first row');
    const yourRevenue = countries.reduce((sum, country) => sum + country.playerMonthlyRevenueTotal, 0);
    assert.ok(Math.abs(yourRevenue - room.head.revenueMonthly!) / Math.max(1, room.head.revenueMonthly!) < .05, 'The countries\' revenue adds up to the room\'s month (within rounding)');
    const open = countries.filter(country => !entered.has(country.id) && country.activeViewers > 0);
    if (open.length) assert.ok(markets.includes('Best next markets') && markets.includes('pay nobody'), 'The best open countries with viewers');
    for (const gone of ['Biggest open ground', 'reach in play', 'no streaming audience yet']) assert.ok(!markets.includes(gone), `${gone} is gone`);
    console.log(`PASS markets: ${entered.size} markets, the biggest ${biggest.name} (${biggest.playerAudience.toLocaleString()}); ${open.length} open countries with viewers; revenue by country $${Math.round(yourRevenue).toLocaleString()} a month`);

    /* ── Enter new markets (#139): the Define the Launch country card, one per open country ── */
    const atlas = buildAtlasCountries(countries, player.ownedStreamingPlatform.marketOperations);
    const openGround = atlas.filter(country => country.state === 'AVAILABLE').sort((left, right) => right.view.activeViewers - left.view.activeViewers);
    const entryActions: MarketEntryActions = {
        energy: 100, treasury: 1e12, absoluteWeek: latest.absoluteWeek, quoteEnergy: ids => ids.length * 5,
        coverageOf: ids => Object.fromEntries(ids.map(id => [id, 'SERVED' as const])),
        file: () => ({ ok: true, message: '' }), resolve: () => ({ ok: true, message: '' }), reapply: () => ({ ok: true, message: '' }),
    };
    const entryMarkup = renderToStaticMarkup(<AudienceMarketEntry accent="#3b82f6" accentHex="#3b82f6" countries={atlas}
        operations={player.ownedStreamingPlatform.marketOperations} actions={entryActions} picked={[openGround[0].id]}
        onPickedChange={() => undefined} onOpenCountry={() => undefined} onClose={() => undefined} />);
    const entry = text(entryMarkup);
    assert.equal((entryMarkup.match(/class="lw-country( is-on)?"/g) || []).length, Math.min(10, openGround.length), 'One wizard card per open country shown');
    assert.equal((entryMarkup.match(/class="lw-country is-on"/g) || []).length, 1, 'The picked country is lit');
    assert.ok(entryMarkup.includes('class="sf '), 'The cards sit in the finance tokens');
    for (const part of ['Watching', 'Growth', 'Entry cost', 'unclaimed', 'review', 'network ready', 'Full report', 'Pick', 'Picked']) assert.ok(entry.includes(part), `Enter new markets shows ${part}`);
    assert.ok(entry.includes(openGround[0].name) && entryMarkup.includes('aria-label="Back to Markets"'));
    for (const gone of ['+ Pick', '✓ Picked', 'led by', 'Easy launch', 'Moderate launch', 'Hard launch']) assert.ok(!entry.includes(gone), `The old card's ${gone} is gone`);
    console.log(`PASS enter new markets: ${openGround.length} open countries, ${Math.min(10, openGround.length)} wizard cards, the first ${openGround[0].name} picked`);

    /* ── WORLD (#133) ── */
    const world = draw('WORLD');
    for (const part of ['The race', 'PAYING HOMES', 'WATCH TIME', `${brand.name} · you`, 'From homes to you', 'CAN STREAM', 'PAY FOR STREAMING', 'PAY YOU',
        'HOUSEHOLD BUDGET / MO', 'HOMES OUTSIDE THE MARKET', 'HOMES WON AT TODAY', 'EFFECTIVE PRICE', 'YOUR SHARE', "Who's out there", 'Leaves when']) {
        assert.ok(world.includes(part), `WORLD shows ${part}`);
    }
    const race = state.market!.watchRace;
    const you = race.entries.find(entry => entry.player)!;
    assert.ok(race.available && you.sharePercent > 0, 'Your real watch share is in the race');
    for (const persona of state.market!.personas) assert.ok(world.includes(persona.name), `${persona.name} is out there`);
    /* #140: of every 100 people streaming as 100 figures, every group counted, then the biggest group's card until you tap */
    const worldRaw = renderToStaticMarkup(<AudienceDesk brand={brand} state={state} initialTab="WORLD" onBack={() => undefined} />);
    assert.ok(world.includes('OF EVERY 100 PEOPLE STREAMING'), 'Of every 100 people streaming');
    assert.equal((worldRaw.match(/<circle cx="5" cy="2.7" r="2.5"><\/circle>/g) || []).length, 100, 'A hundred figures');
    const counted = /aria-label="([^"]*)"[^>]*role="img"|role="img"[^>]*aria-label="([^"]*)"/.exec(worldRaw.slice(worldRaw.indexOf('OF EVERY 100')));
    const groupCounts = (counted?.[1] ?? counted?.[2] ?? '').split(', ').map(part => Number(part.split(' ').at(-1)));
    assert.equal(groupCounts.length, state.market!.personas.length, 'Every group is in the grid');
    assert.equal(groupCounts.reduce((sum, count) => sum + count, 0), 100, 'The groups add up to 100 people');
    const biggestGroup = [...state.market!.personas].sort((left, right) => right.sharePercent - left.sharePercent)[0];
    const card = world.slice(world.lastIndexOf(biggestGroup.name));
    for (const part of ['watching', 'services a home', 'Hours a week', 'Budget a month', 'Switches', 'Loves now', 'Wants', 'Leaves when', biggestGroup.need]) {
        assert.ok(card.includes(part), `The ${biggestGroup.name} card shows ${part}`);
    }
    assert.ok(worldRaw.includes('data-platform-brand=') || biggestGroup.bestFitPlatform === 'Local & regional', 'Loves now is the service\'s own logo');
    assert.ok(state.market!.history.length >= 2, 'The market line has the ledger\'s weeks');
    for (const gone of ['CINEMA REACH', 'willing to move', 'Price & bundles', 'GLOBAL RIVAL', 'SUBS / HOME', 'WATCH HOURS / WK', 'SERVICES PER PAYING HOME', 'Streaming adoption', 'Overview', 'Switching']) {
        assert.ok(!world.includes(gone), `${gone} is gone from WORLD`);
    }
    console.log(`PASS world: you hold ${you.sharePercent}% of the week's watch time; ${state.market!.history.length} ledger weeks; ${state.market!.personas.length} audience groups as 100 figures (${groupCounts.join(' · ')}), the ${biggestGroup.name} card first; no cinema bar, formula facts or fixed reasons`);

    /* ── CAMPAIGNS (#134): the test company runs none, so four are added to a copy (three finished, one locked) ── */
    const week = latest.absoluteWeek;
    const title = room.titles[0];
    const action = (id: string, status: 'LOCKED' | 'APPLIED', spend: number, joins: number, viewers: number, ago: number) => ({
        id, idempotencyKey: id, projectId: title.id, title: title.title, selectedAtAbsoluteWeek: week - ago - 1, targetAbsoluteWeek: status === 'LOCKED' ? week + 1 : week - ago,
        channels: ['TRAILER', 'SOCIAL'] as const, homepagePlacement: 'HERO' as const, recommendationObjective: 'RETENTION' as const, explorationPercent: 10,
        artworkVariants: ['FACE_FORWARD', 'MYSTERY_HOOK'] as const, cashCost: spend, status, appliedAtAbsoluteWeek: status === 'APPLIED' ? week - ago : null,
        outcome: status === 'APPLIED' ? { attributedViewingAccounts: viewers, attributedJoins: joins, costPerAttributedJoin: joins > 0 ? Math.round(spend / joins) : null,
            artworkWinner: 'FACE_FORWARD' as const, artworkWinnerLiftPercent: 12, observedDiscoveryMix: null, summary: `${title.title} test` } : null,
    });
    const campaigner: Player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, growthActions: [
        action('c1', 'APPLIED', 2_000_000, 10_000, 150_000, 6) as never,
        action('c2', 'APPLIED', 3_000_000, 6_000, 120_000, 4) as never,
        action('c3', 'APPLIED', 1_000_000, 8_000, 90_000, 2) as never,
        action('c4', 'LOCKED', 2_500_000, 0, 0, 0) as never,
    ] } };
    const campaignState = createCanonicalAudienceState(campaigner);
    const view = campaignState.room.campaigns;
    assert.equal(view.running.length, 1);
    assert.equal(view.done.length, 3);
    assert.equal(view.gradeBasis, 'JOIN', 'Joins exist, so the grades compare cost per join');
    assert.deepEqual(view.done.map(row => row.id), ['c3', 'c2', 'c1'], 'Newest first');
    assert.deepEqual(view.done.map(row => row.grade), ['A', 'C', 'B'], 'Cost per join $125 · $500 · $200 against the median $200: 0.63× A, 2.5× C, 1× B');
    assert.equal(view.best?.id, 'c1', 'The best brought the most joins');
    assert.equal(view.joins, 24_000);
    assert.equal(view.spent, 6_000_000, 'The three finished in the last 12 weeks');
    assert.equal(view.costPerJoin, 250);
    const campaigns = text(renderToStaticMarkup(<AudienceDesk brand={brand} state={campaignState} initialTab="CAMPAIGNS" onBack={() => undefined} onNewCampaign={() => undefined} />));
    for (const part of ['LAST 12 WEEKS · CAMPAIGNS', 'Locked in', 'RESULTS NEXT WEEK', 'Results', 'graded by cost per join', 'Star close-up won', '+12% lift', 'ALGORITHM', 'Retention', 'New campaign']) {
        assert.ok(campaigns.includes(part), `CAMPAIGNS shows ${part}`);
    }
    for (const gone of ['DRAFT', 'NOT STARTED', 'EST. REACH', 'Recommendation engine']) assert.ok(!campaigns.includes(gone), `${gone} is gone`);
    const quiet = text(renderToStaticMarkup(<AudienceDesk brand={brand} state={state} initialTab="CAMPAIGNS" onBack={() => undefined} onNewCampaign={() => undefined} />));
    if (state.room.campaigns.done.length === 0) assert.ok(quiet.includes('No campaign has finished yet'), 'A company with no finished campaign says so');
    else assert.ok(quiet.includes('Results') && !quiet.includes('DRAFT'), 'The test company\'s own campaigns read as results');
    /* #136: with no joins the season reads viewers and cost per 1K viewers, never 0 JOINS · — PER JOIN */
    if (state.room.campaigns.gradeBasis === 'VIEWERS' && state.room.campaigns.done.length) {
        assert.ok(quiet.includes('PER 1K') && !quiet.includes('PER JOIN') && !quiet.includes('JOINS'), 'No joins: viewers and cost per 1K');
    }
    assert.ok(campaigns.includes('PER JOIN') && !campaigns.includes('PER 1K'), 'With joins: joins and cost per join');
    /* #136: the season's best is from the same 12 weeks as the figures beside it */
    const withOld: Player = { ...campaigner, ownedStreamingPlatform: { ...campaigner.ownedStreamingPlatform, growthActions: [
        ...campaigner.ownedStreamingPlatform.growthActions, action('c0', 'APPLIED', 4_000_000, 90_000, 400_000, 20) as never,
    ] } };
    const oldView = createCanonicalAudienceState(withOld).room.campaigns;
    assert.equal(oldView.best?.id, 'c1', 'A campaign older than 12 weeks is not the season\'s best');
    assert.equal(oldView.spent, 6_000_000, 'Nor in the season\'s spend');
    assert.equal(view.viewers, 360_000);
    assert.equal(view.costPerThousand, Math.round(6_000_000 / 360_000 * 1000));
    console.log(`PASS campaigns: the test company's own ${state.room.campaigns.done.length} finished (graded by ${state.room.campaigns.gradeBasis === 'JOIN' ? 'cost per join' : 'cost per 1K viewers'}); added ones graded ${view.done.map(row => `${row.title} ${row.grade}`).join(', ')}; best c1 (an older campaign with more joins is left out of the season); 24K joins for $6M ($250 a join); one locked in; no DRAFT or made-up reach`);

    /* ── TOP 10 (#135, #142): your own service's Top 10 first, every service's on the switch ── */
    const top10 = draw('TOP 10');
    const chart = room.chart;
    assert.equal(chart.available, true, 'A settled week has a chart');
    assert.equal(chart.own.available, true, 'Your own chart too');
    assert.deepEqual(chart.lists.ALL.map(row => row.id), getStreamingWeeklyChartView(player).lists.ALL.map(row => row.id), 'The rows are the weekly chart');
    for (const part of [`On ${brand.name}`, 'All services', `WEEK ${chart.absoluteWeek} · YOUR SERVICE`, `Most watched on ${brand.name} this week`, 'All', 'Films', 'Series',
        '#1 THIS WEEK', 'AT #1', 'views', 'Views = hours watched ÷ runtime', `Counted on ${brand.name}'s own hours`]) {
        assert.ok(top10.includes(part), `TOP 10 shows ${part}`);
    }
    const ownTop = chart.own.lists.ALL;
    assert.ok(ownTop.every(row => row.mine) && ownTop.every(row => top10.includes(row.title)), 'Your own chart: your titles, every one listed');
    assert.ok(top10.indexOf(ownTop[0].title) < top10.indexOf('#1 THIS WEEK') + 200, 'Your #1 is the hero');
    for (const gone of ['Top 10 today', 'all platforms', 'TODAY', 'EVERY SERVICE · WEEK']) assert.ok(!top10.includes(gone), `${gone} is not on your chart`);
    /* every service's chart, as the switch shows it */
    const everyService = text(renderToStaticMarkup(<AudienceTopTenTab chart={chart} brand={brand} initialChart="ALL" />));
    for (const part of [`WEEK ${chart.absoluteWeek} · EVERY SERVICE`, 'Most watched on every service this week', '#1 THIS WEEK']) assert.ok(everyService.includes(part), `All services shows ${part}`);
    chart.lists.ALL.forEach(row => {
        assert.ok(everyService.includes(row.title) && everyService.includes(row.platformName), `${row.title} is listed with its service`);
        assert.ok(row.genre && Number.isFinite(row.hue), `${row.title} has its poster`);
    });
    const yours = chart.lists.ALL.filter(row => row.mine);
    assert.ok(everyService.includes(yours.length ? `${brand.name} holds ${yours.length} of 10` : `None of ${brand.name}'s titles made it this week`), 'How many of the ten are yours');
    if (yours.length) assert.ok(everyService.includes(`your best #${yours[0].rank} ${yours[0].title}`), 'Your best title');
    if (chart.hasPrevious) {
        assert.ok(chart.lists.ALL.every(row => row.move !== null), 'Every row has a move once last week is stored');
        assert.equal((everyService.match(/\bNEW\b/g) || []).length, chart.lists.ALL.filter(row => row.move === 'NEW').length, 'A NEW badge for each new entry');
    }
    const rivals = [...chart.lists.FILM, ...chart.lists.SERIES].filter(row => !row.mine);
    assert.ok(rivals.length > 0, 'Rival services are in the chart');
    console.log(`PASS top 10: week ${chart.absoluteWeek}; on ${brand.name}: ${ownTop.map(row => `${row.rank}. ${row.title}`).join(' | ')}; every service: ${yours.length} of 10 yours, ${new Set(rivals.map(row => row.platformName)).size} rival services in Films/Series; ${chart.lists.ALL.map(row => `${row.rank}. ${row.title} (${row.platformName}, ${row.move ?? '·'})`).join(' | ')}`);

    /* ── every model (#136): the same company as an ad-supported service and as a rent-or-buy store, a week settled each ── */
    const TABS = ['ANALYTICS', 'MARKETS', 'WORLD', 'CAMPAIGNS', 'TOP 10'] as const;
    for (const [coreModel, kind, header, railHead] of [
        ['ADVERTISING', 'AD_HOMES', 'AD HOMES', 'ads earned · watched'],
        ['STORE', 'BUYERS', 'BUYERS / WK', 'sold · watched'],
    ] as const) {
        const platform = player.ownedStreamingPlatform;
        const pricing = configureStreamingPricingOffer(platform.serviceConfiguration.pricing, { kind: 'CORE', coreModel, alone: true });
        const switched = (await processGameWeek({ ...player, ownedStreamingPlatform: { ...platform, serviceConfiguration: {
            ...platform.serviceConfiguration, pricing, revision: platform.serviceConfiguration.revision + 1 } } })).player;
        const modelState = createCanonicalAudienceState(switched);
        assert.equal(modelState.market!.playerModel.primary, kind, `${coreModel}: the room reads ${kind}`);
        const markups = TABS.map(tab => text(renderToStaticMarkup(<AudienceDesk brand={brand} state={modelState} initialTab={tab} onBack={() => undefined}
            onNewCampaign={() => undefined} marketOperations={switched.ownedStreamingPlatform.marketOperations} />)));
        markups.forEach((markup, index) => {
            assert.ok(markup.includes(header), `${coreModel} ${TABS[index]}: the head names the audience ${header}`);
            assert.ok(!/\bNaN\b|undefined|Infinity|\[object/.test(markup), `${coreModel} ${TABS[index]}: no broken numbers`);
        });
        assert.ok(!markups[0].includes('CHURN') && !markups[0].includes('brought in · kept'), `${coreModel}: no churn or members-brought-in for a service without subscriptions`);
        if (modelState.room.titles.some(title => title.earned > 0)) assert.ok(markups[0].includes(railHead), `${coreModel}: titles ranked by ${railHead}`);
        console.log(`PASS model ${coreModel}: head ${header} ${modelState.room.head.audience.toLocaleString()}, revenue $${(modelState.room.head.revenueMonthly ?? 0).toLocaleString()} a month; titles by ${railHead}; five tabs clean`);
    }

    /* ── before launch ── */
    const prelaunch = migratePlayerSave(structuredClone(INITIAL_PLAYER));
    const early = createCanonicalAudienceState(prelaunch);
    const earlyMarkups = TABS.map(tab => text(renderToStaticMarkup(<AudienceDesk brand={brand} state={early} initialTab={tab} onBack={() => undefined} />)));
    const earlyMarkup = earlyMarkups[0];
    assert.ok(earlyMarkup.includes('Your numbers start at launch') && earlyMarkup.includes('SEE THE WORLD'), 'Before launch: the numbers start at launch');
    assert.ok(earlyMarkups[3].includes('Campaigns start after launch'), 'Before launch: campaigns start after launch');
    assert.ok(earlyMarkups[4].includes('The chart appears when a week settles'), 'Before launch: the chart waits for a settled week');
    earlyMarkups.forEach((markup, index) => assert.ok(!/\bNaN\b|undefined|Infinity|\[object/.test(markup), `Before launch ${TABS[index]}: no broken numbers`));
    assert.equal(early.room.head.net, null);
    console.log('PASS before launch: ANALYTICS says the numbers start at launch and points to WORLD; CAMPAIGNS and TOP 10 wait for launch; five tabs clean');

    console.log(`EMPIRE+ audience room audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
