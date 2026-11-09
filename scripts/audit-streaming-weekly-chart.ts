/** #129 (plan §20.8, L2): the weekly Top 10 of every streaming service, films and series.
 *  Checks, on the full test company over real weeks:
 *  - each settled week stores the top 10 films and top 10 series (`world.streamingWeeklyChart`), 12 weeks kept,
 *    never redone for a week already stored;
 *  - views = hours ÷ runtime; the player's rows carry their real settled hours; a rival service's titles share
 *    its real hours (a featured share, a cap per title), so no rival row exceeds the cap of its service;
 *  - a rival title is shown on the service it really streams on (`streamingWindows`), never a random one;
 *  - the view: ranks, real moves from last week (UP / DOWN / SAME / NEW), weeks in the Top 10, All as the top 10
 *    of films and series together, your rows marked;
 *  - an old save (no stored chart) still shows this week, with no moves until the next week;
 *  - schema 3 (#142): each week also keeps the player's own Top 10 on its own hours; a schema-2 chart is kept and
 *    the own chart is worked out for the settled week, its moves starting the next week;
 *  - the chart changes no money, accounts or viewing;
 *  - #143: the news on notable weeks only: your title the world's #1, a fourth week at #1, your titles entering the
 *    world's ten, a rival holding six of them; a quiet week makes no story. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getHistoricalCatalogueTitles } from '../services/historicalCatalogue';
import { getAiCataloguePositions } from '../services/worldEconomy/worldStreamingAiCatalogue';
import {
    STREAMING_CHART_RIVAL_TITLE_CAP,
    STREAMING_WEEKLY_CHART_WEEKS,
    advanceStreamingWeeklyChart,
    getStreamingWeeklyChartView,
    normalizeStreamingWeeklyChartState,
    streamingChartDisplayTitle,
    streamingChartRuntimeHours,
} from '../services/streamingWeeklyChart';
import { collectStreamingChartFacts } from '../services/streamingChartNews';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Weekly Chart Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('weekly-chart'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);

    /* ── an old save: no chart stored, the view still reads this week ── */
    /* shallow copies: the test company's pending life events hold functions, so it cannot be structuredClone'd */
    const legacy: Player = { ...player, world: { ...player.world, streamingWeeklyChart: undefined } };
    const legacyView = getStreamingWeeklyChartView(legacy);
    assert.equal(legacyView.available, true, 'A save from before #129 still shows this week');
    assert.equal(legacyView.hasPrevious, false);
    assert.ok(legacyView.lists.ALL.every(row => row.move === null), 'No moves until a second week is stored');
    console.log(`PASS old save: week ${legacyView.absoluteWeek} worked out from its viewing, ${legacyView.lists.ALL.length} rows, no moves`);

    /* ── three real weeks ── */
    for (let index = 0; index < 3; index += 1) player = (await processGameWeek(player)).player;
    const week = getAbsoluteWeek(player.age, player.currentWeek);
    const chart = normalizeStreamingWeeklyChartState(player.world.streamingWeeklyChart)!;
    assert.ok(chart && chart.weeks.length >= 3, 'Each settled week is stored');
    assert.equal(chart.weeks.at(-1)!.absoluteWeek, week);
    assert.ok(chart.weeks.every((item, index) => !index || item.absoluteWeek > chart.weeks[index - 1].absoluteWeek), 'One chart a week, in order');
    const latest = chart.weeks.at(-1)!;
    assert.ok(latest.films.length > 0 && latest.films.length <= 10 && latest.series.length <= 10);
    assert.ok(latest.films.every(row => row.kind === 'FILM') && latest.series.every(row => row.kind === 'SERIES'));
    for (const list of [latest.films, latest.series]) {
        assert.ok(list.every((row, index) => !index || list[index - 1].views >= row.views), 'Ranked by views');
    }
    console.log(`PASS weeks: ${chart.weeks.length} stored (weeks ${chart.weeks.map(item => item.absoluteWeek).join(', ')}), ${latest.films.length} films and ${latest.series.length} series this week`);

    /* the same week is never redone */
    assert.deepEqual(advanceStreamingWeeklyChart(player, week)!.weeks, chart.weeks, 'A stored week stays as it was');

    /* ── views, hours and services ── */
    const viewing = player.world.worldStreamingViewing!;
    const playerTitles = new Map((viewing.platforms.PLAYER?.titlePerformance || []).map(row => [String(row.projectId), row]));
    const rows = [...latest.films, ...latest.series];
    /* where a rival title really streams: the positions the viewing settlement plays for the service, or a project window */
    const rivalIds = Object.keys(viewing.platforms).filter(id => id !== 'PLAYER');
    const positions = new Map(rivalIds.map(id => [id, getAiCataloguePositions(player, id, viewing.aiCatalogue || [])
        .filter(position => position.status === 'ACTIVE' && position.startsAtAbsoluteWeek <= week && position.expiresAtAbsoluteWeek > week)]));
    const streamsOn = (titleId: string, platformId: string) => Boolean(positions.get(platformId)?.some(position => String(position.titleId) === titleId)
        || player.world.projects.some(item => String(item.id) === titleId && (item.streamingWindows || []).some(window => window.platformId === platformId
            && window.startsAtAbsoluteWeek <= week && window.expiresAtAbsoluteWeek > week)));
    const historical = new Map(getHistoricalCatalogueTitles(player).map(title => [title.id, title]));
    const genreOf = (titleId: string) => playerTitles.get(titleId)?.genre ?? player.world.projects.find(item => String(item.id) === titleId)?.genre ?? historical.get(titleId)?.genre;
    for (const row of rows) {
        assert.equal(row.views, Math.round(row.hours / streamingChartRuntimeHours(player, row.id, row.kind)), `${row.title}: views = hours ÷ runtime`);
        if (row.platformId === 'PLAYER') {
            assert.ok(playerTitles.has(row.id), `${row.title}: the player's row is one of its settled titles`);
            assert.ok(row.hours >= Math.round(playerTitles.get(row.id)!.hoursViewed), `${row.title}: at least its real settled hours`);
        } else {
            assert.ok(streamsOn(row.id, row.platformId), `${row.title}: streams on ${row.platformId} this week`);
            assert.ok(!/ Archive \d+$/.test(row.title), `${row.title}: a starting-library placeholder stays in the long tail`);
            /* a title on several services may sum their capped shares, never more */
            const services = rivalIds.filter(id => streamsOn(row.id, id));
            const ceiling = services.reduce((sum, id) => sum + Math.round((viewing.platforms[id]?.totalHoursViewed || 0) * STREAMING_CHART_RIVAL_TITLE_CAP) + 1, 0);
            if (!playerTitles.has(row.id)) assert.ok(row.hours <= ceiling, `${row.title}: within its services' cap`);
        }
        assert.ok(row.genre && row.genre === String(genreOf(row.id) ?? row.genre), `${row.title}: the title's own genre`);
    }
    const mine = rows.filter(row => row.platformId === 'PLAYER').length;
    const rivalServices = new Set(rows.filter(row => row.platformId !== 'PLAYER').map(row => row.platformId));
    const fromCatalogue = rows.filter(row => row.platformId !== 'PLAYER' && !player.world.projects.some(item => String(item.id) === row.id)).length;
    assert.ok(rivalServices.size >= 2, 'Rival titles come from more than one service');
    assert.ok(fromCatalogue > 0, "A rival's catalogue titles (not only the world's projects) reach the chart");
    console.log(`PASS rows: views = hours ÷ runtime; ${mine} of the player's titles on real hours, ${rows.length - mine} rival titles on the service they stream on (${rivalServices.size} services, ${fromCatalogue} from their catalogues), each with its genre`);

    /* a schema-1 chart (#129: rivals from project windows only) is dropped; the week is worked out again */
    const schemaOne = { ...player, world: { ...player.world, streamingWeeklyChart: { schemaVersion: 1, weeks: chart.weeks } as unknown as Player['world']['streamingWeeklyChart'] } } as Player;
    assert.equal(normalizeStreamingWeeklyChartState(schemaOne.world.streamingWeeklyChart), undefined, 'A schema-1 chart is dropped');
    assert.equal(getStreamingWeeklyChartView(schemaOne).hasPrevious, false, 'Moves start again after a schema-1 chart');
    console.log('PASS schema 2: a schema-1 chart is dropped and this week is worked out from the catalogues');

    /* ── schema 3 (#142): your own Top 10, counted on your own hours ── */
    assert.equal(chart.schemaVersion, 3, 'The chart is schema 3');
    assert.ok(chart.weeks.every(item => item.own), 'Every week stored since #142 keeps your own Top 10');
    const ownHours = new Map<string, number>();
    (viewing.platforms.PLAYER?.titlePerformance || []).forEach(row => ownHours.set(String(row.projectId), (ownHours.get(String(row.projectId)) || 0) + row.hoursViewed));
    for (const list of [latest.own!.films, latest.own!.series]) {
        assert.ok(list.length <= 10 && list.every((row, index) => !index || list[index - 1].views >= row.views), 'Your own list is ranked by views');
        for (const row of list) {
            assert.equal(row.platformId, 'PLAYER');
            assert.equal(row.hours, Math.round(ownHours.get(row.id) || 0), `${row.title}: its hours on your service only`);
            assert.equal(row.views, Math.round(row.hours / streamingChartRuntimeHours(player, row.id, row.kind)));
        }
    }
    const ownTop = [...ownHours.entries()].filter(([id]) => latest.own!.films.some(row => row.id === id) || latest.own!.series.some(row => row.id === id));
    assert.ok(latest.own!.films.length + latest.own!.series.length > 0 && ownTop.length > 0, 'Your own chart has titles');
    /* a schema-2 chart is kept, without its own lists; your chart is worked out for the settled week */
    const schemaTwo = { ...player, world: { ...player.world, streamingWeeklyChart: { schemaVersion: 2, weeks: chart.weeks.map(({ own, ...rest }) => rest) } as unknown as Player['world']['streamingWeeklyChart'] } } as Player;
    const keptTwo = normalizeStreamingWeeklyChartState(schemaTwo.world.streamingWeeklyChart)!;
    assert.equal(keptTwo.schemaVersion, 3, 'A schema-2 chart is read as schema 3');
    assert.equal(keptTwo.weeks.length, chart.weeks.length, 'Its weeks are kept');
    assert.ok(keptTwo.weeks.every(item => !item.own), 'Its weeks have no own Top 10');
    const twoView = getStreamingWeeklyChartView(schemaTwo);
    assert.equal(twoView.hasPrevious, true, 'Every service\'s moves stay real');
    assert.equal(twoView.own.available, true, 'Your chart shows at once, worked out from the settled week');
    assert.equal(twoView.own.hasPrevious, false, 'Your moves start the next week');
    assert.deepEqual(twoView.own.lists.ALL.map(row => row.id), getStreamingWeeklyChartView(player).own.lists.ALL.map(row => row.id), 'The same week, the same own chart');
    console.log(`PASS schema 3: your own Top 10 stored each week (${latest.own!.films.length} films, ${latest.own!.series.length} series this week) on your own hours; a schema-2 chart kept, your chart worked out at once`);

    /* ── the view ── */
    const view = getStreamingWeeklyChartView(player);
    assert.equal(view.available, true);
    assert.equal(view.absoluteWeek, week);
    assert.equal(view.hasPrevious, true, 'Last week is stored, so moves are real');
    const previous = chart.weeks.find(item => item.absoluteWeek === week - 1)!;
    for (const [list, before] of [['FILM', previous.films], ['SERIES', previous.series]] as const) {
        view.lists[list].forEach((row, index) => {
            assert.equal(row.rank, index + 1);
            const was = before.findIndex(item => item.id === row.id);
            assert.equal(row.previousRank, was >= 0 ? was + 1 : null);
            assert.equal(row.move, was < 0 ? 'NEW' : was + 1 > row.rank ? 'UP' : was + 1 < row.rank ? 'DOWN' : 'SAME');
            assert.ok(row.weeksInChart >= 1 && row.weeksInChart <= STREAMING_WEEKLY_CHART_WEEKS && row.bestRank <= row.rank);
            assert.equal(row.mine, row.platformId === 'PLAYER');
            assert.ok(row.platformName && /^#[0-9a-f]{6}$/i.test(row.platformColor));
        });
    }
    /* your own chart's moves, from last week's own lists */
    assert.equal(view.own.available, true);
    assert.equal(view.own.hasPrevious, true, 'Last week kept your own Top 10, so your moves are real');
    for (const [list, before] of [['FILM', previous.own!.films], ['SERIES', previous.own!.series]] as const) {
        view.own.lists[list].forEach((row, index) => {
            const was = before.findIndex(item => item.id === row.id);
            assert.equal(row.rank, index + 1);
            assert.equal(row.move, was < 0 ? 'NEW' : was + 1 > row.rank ? 'UP' : was + 1 < row.rank ? 'DOWN' : 'SAME');
            assert.ok(row.mine && row.weeksAtTop <= row.weeksInChart && (row.rank === 1 ? row.weeksAtTop >= 1 : true));
        });
    }
    assert.ok(view.lists.ALL.every(row => row.weeksAtTop <= row.weeksInChart && (row.rank === 1) === (row.weeksAtTop >= 1 && row.rank === 1)));
    const all = view.lists.ALL;
    const together = [...latest.films, ...latest.series].sort((left, right) => right.views - left.views || right.hours - left.hours || left.id.localeCompare(right.id)).slice(0, 10);
    assert.deepEqual(all.map(row => row.id), together.map(row => row.id), 'All is the top 10 of films and series together');
    assert.ok(rows.every(row => !/\b[A-Z]{3,}(?: [A-Z]{3,})* Original$/.test(row.title)), 'A working name\'s genre is not shouted');
    assert.equal(streamingChartDisplayTitle('YouTube HORROR Original'), 'YouTube Horror Original');
    assert.equal(streamingChartDisplayTitle('Sol View SCIENCE_FICTION Original'), 'Sol View Science Fiction Original');
    assert.equal(streamingChartDisplayTitle('The Last Original'), 'The Last Original', 'A real title is left alone');
    console.log(`PASS view: ${all.map(row => `${row.rank}. ${row.title} (${row.platformName}, ${row.move ?? '·'}, ${row.weeksInChart}w)`).join(' | ')}`);
    console.log(`  mix: All ${all.filter(row => row.mine).length} yours / ${all.filter(row => !row.mine).length} rivals; Films ${view.lists.FILM.filter(row => !row.mine).length} rivals; Series ${view.lists.SERIES.filter(row => !row.mine).length} rivals`);

    /* ── #143: the news on notable weeks only ── */
    const chartRow = (id: string, platformId: string, views: number) => ({ id, title: `Title ${id}`, platformId, kind: 'FILM' as const, genre: 'DRAMA', hours: views * 2, views });
    const rivals = (prefix: string, platformId: string, count: number, top: number) => Array.from({ length: count }, (_, index) => chartRow(`${prefix}${index}`, platformId, top - index * 10));
    const weekOf = (absolute: number, films: ReturnType<typeof chartRow>[]) => ({ absoluteWeek: absolute, films: films.sort((left, right) => right.views - left.views).slice(0, 10), series: [] });
    const quietTen = [...rivals('n', 'NETFLIX', 5, 500), ...rivals('d', 'DISNEY_PLUS', 4, 400)];
    const crafted = [
        weekOf(900, [chartRow('y1', 'YOUTUBE', 900), ...quietTen]),
        weekOf(901, [chartRow('p1', 'PLAYER', 950), chartRow('p2', 'PLAYER', 450), ...quietTen]),
        weekOf(902, [chartRow('p1', 'PLAYER', 940), chartRow('p2', 'PLAYER', 450), ...quietTen]),
        weekOf(903, [chartRow('p1', 'PLAYER', 930), chartRow('p2', 'PLAYER', 450), ...quietTen]),
        weekOf(904, [chartRow('p1', 'PLAYER', 920), ...rivals('n', 'NETFLIX', 6, 500), ...rivals('d', 'DISNEY_PLUS', 3, 400)]),
        weekOf(905, [chartRow('p1', 'PLAYER', 910), chartRow('p2', 'PLAYER', 450), ...quietTen]),
    ];
    const withNews = { ...player, world: { ...player.world, streamingWeeklyChart: { schemaVersion: 3 as const, weeks: crafted } } } as Player;
    const pass = (since: number, at: number) => collectStreamingChartFacts(withNews, since, at);
    const slug = player.ownedStreamingPlatform.identity!.slug;
    const brandName = player.ownedStreamingPlatform.identity!.name;
    const first = pass(901, 902);
    assert.deepEqual(first.map(fact => [fact.idempotencyKey, fact.importance]), [
        [`streaming-chart:${slug}:top:901`, 'HIGH'],
        [`streaming-chart:${slug}:enter:901`, 'MEDIUM'],
    ], 'Week 901: your title takes the world\'s #1, and another of yours enters the ten');
    assert.ok(first.every(fact => fact.type === 'PLATFORM_CHART_MOMENT' && fact.companyId === slug && fact.companyName === brandName));
    /* 2026-11-09: chart news is written several ways; each headline names its own title, and the #1 is not an entry */
    assert.ok(first[0].headline.includes('Title p1') && !first[0].headline.includes('Title p2'), first[0].headline);
    assert.ok(first[1].headline.includes('Title p2') && !first[1].headline.includes('Title p1'), 'The #1 is not counted again as an entry');
    assert.ok(/Top 10|most-watched|debut|chart/i.test(first[1].headline), first[1].headline);
    assert.deepEqual(pass(902, 903), [], 'A quiet week (the same #1, the same ten) makes no story');
    const fourth = pass(904, 905);
    assert.deepEqual(fourth.map(fact => [fact.idempotencyKey, fact.importance, fact.companyId]), [
        [`streaming-chart:${slug}:hold:p1:904`, 'HIGH', slug],
        [`streaming-chart:${slug}:dominance:NETFLIX:904`, 'MEDIUM', 'NETFLIX'],
    ], 'Week 904: a fourth week at #1 (yours, so big news), and Netflix reaching six of the ten');
    assert.ok(fourth[0].headline.includes('Title p1') && /#1|top/i.test(fourth[0].headline), fourth[0].headline);
    assert.ok(fourth[1].headline.includes('Netflix') && fourth[1].headline.includes('6'), fourth[1].headline);
    assert.ok(fourth[0].detail.includes('4 weeks') || fourth[0].detail.includes('4 straight weeks'), fourth[0].detail);
    assert.equal(pass(-1, 905).length, 2, 'A pass looks back two weeks at most, so an old save makes no stories of its history');
    assert.deepEqual(pass(905, 906), [], 'A title slipping out and back into the ten is not news again');
    console.log(`PASS news: ${[...first, ...fourth].map(fact => `"${fact.headline}" (${fact.importance})`).join(' · ')}; a quiet week makes none`);

    /* ── the chart changes nothing else ── */
    const withoutChart: Player = { ...player, world: { ...player.world, streamingWeeklyChart: undefined } };
    const a = (await processGameWeek(player)).player;
    const b = (await processGameWeek(withoutChart)).player;
    assert.equal(a.money, b.money, 'Money is the same with or without the chart');
    assert.equal(a.ownedStreamingPlatform.metrics.subscribers, b.ownedStreamingPlatform.metrics.subscribers);
    assert.equal(a.world.worldStreamingViewing!.global.totalHoursViewed, b.world.worldStreamingViewing!.global.totalHoursViewed);
    assert.deepEqual(a.world.streamingWeeklyChart!.weeks.at(-1), b.world.streamingWeeklyChart!.weeks.at(-1), 'The same week charts the same');
    console.log('PASS record-only: money, accounts and viewing are the same with or without the chart');

    console.log(`EMPIRE+ weekly chart audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
