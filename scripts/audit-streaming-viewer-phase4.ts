/** Phase 4's viewer rows, #63 (codex-handoff/plans/platform-tech-plan.md §8: "Phase 4: "Because you
 *  watched" rows; AI channels; an autoplay next-episode card; "Who's watching" with a Kids profile").
 *  Checks:
 *  - the tree: Because you watched (or a step above it) runs the rows, Profiles and screens runs
 *    "Who's watching?"; neither, and the game's viewer state is as before;
 *  - the rows: without them exactly as before; Because you watched after Continue Watching, built from
 *    what each profile watched, titles like it first; AI channels on plans with them, from the
 *    viewer's taste; the Kids profile sees only titles made for children and families;
 *  - the app: "Who's watching?" first where profiles run, with Kids where the plan includes it; the
 *    rows and LIVE channels on the home screen; nothing new without them. The Autoplay card and
 *    switching profiles are checked in the browser (the fixture, then the game). */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizeStreamingTechTreeState } from '../services/streamingTechTreeCatalogue';
import { getStreamingViewerPersonal, type StreamingViewerPlan } from '../services/streamingViewerQuality';
import { createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { ViewerApp, streamingViewerKidsTitles, streamingViewerRows, type AppState, type AppTitle } from '../components/streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const withTechs = (state: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...state,
    techs: { ...state.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const title = (id: string, genre: string, extra: Partial<AppTitle> = {}): AppTitle => ({
    id, title: `Title ${id}`, kind: 'LICENSED', format: 'Film', genre, hue: Number(id.slice(1)) * 37, logline: '', ...extra,
});
const ids = (items: AppTitle[]) => items.map(item => item.id);

function main() {
    const started = performance.now();

    /* ── the tree ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const personalOf = (entries: Array<[string, number]>) => getStreamingViewerPersonal({ techTree: withTechs(bare, entries) });
    assert.equal(getStreamingViewerPersonal({ techTree: bare }), null, 'Trending rows only, no profiles: nothing');
    assert.equal(personalOf([['AI_AUTOPLAY', 1], ['AI_VOICE', 1]]), null, 'The side lines alone change no rows');
    assert.deepEqual(personalOf([['AI_BECAUSE', 1]]), { because: true, profiles: false });
    assert.deepEqual(personalOf([['AI_TASTE', 1]]), { because: true, profiles: false }, 'A step above it runs them too');
    assert.deepEqual(personalOf([['FAM_SCREENS', 1]]), { because: false, profiles: true });
    assert.deepEqual(getStreamingViewerPersonal({ techTree: { ...bare, schemaVersion: 5 }, technologyLevels: { DATA_RECOMMENDATIONS: 10, RELIABILITY: 10 } }),
        { because: true, profiles: true }, 'A tree from before Smart AI given Because you watched (Recommendations 10) and Profiles and screens (Reliability 10)');
    console.log('PASS tree: Because you watched (or above) runs the rows, Profiles and screens runs "Who\'s watching?"; the side lines alone change nothing; old saves read their given steps');

    /* ── the game's viewer state ── */
    const base = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'viewer-phase4', name: 'Viewer Phase 4 Audit', age: 15, currentWeek: 1 });
    const playerWith = (entries: Array<[string, number]>): Player => ({
        ...base,
        ownedStreamingPlatform: { ...base.ownedStreamingPlatform, techTree: withTechs(normalizeStreamingTechTreeState(base.ownedStreamingPlatform.techTree, base.ownedStreamingPlatform.technologyLevels), entries) },
    });
    assert.equal('personal' in createCanonicalViewerState(base), false, 'Neither: the state is as before');
    assert.deepEqual(createCanonicalViewerState(playerWith([['AI_BECAUSE', 1], ['FAM_SCREENS', 1]])).personal, { because: true, profiles: true });
    console.log('PASS state: the game\'s viewer state carries them only where the tree has them');

    /* ── the rows ── */
    const titles = [
        title('t1', 'THRILLER', { rank: 1, kind: 'ORIGINAL' }),
        title('t2', 'DRAMA', { rank: 2, progress: .4 }),
        title('t3', 'COMEDY', { rank: 3, progress: .2, newThisWeek: true }),
        title('t4', 'DRAMA'),
        title('t5', 'ANIMATION', { kind: 'ORIGINAL', leavingInWeeks: 2 }),
        title('t6', 'ADVENTURE'),
        title('t7', 'HORROR'),
    ];
    const plain = { layoutMode: 'HERO' as const, brandName: 'NORTHSTAR+', because: false, channels: false, profile: null };
    const before = streamingViewerRows(titles, plain);
    assert.deepEqual(before.map(row => [row.id, row.label, ids(row.items)]), [
        ['t', 'Top 10 on NORTHSTAR+', ['t1', 't2', 't3']],
        ['r', 'Continue Watching', ['t2', 't3']],
        ['o', 'NORTHSTAR+ Originals', ['t1', 't5']],
        ['n', 'New This Week', ['t3']],
        ['l', 'Leaving Soon', ['t5']],
    ], 'Without them: the rows as before');
    assert.equal(before.some(row => row.lead || row.channels), false);

    const because = streamingViewerRows(titles, { ...plain, because: true });
    assert.deepEqual(because.map(row => row.id), ['t', 'r', 'b', 'o', 'n', 'l'], 'Because you watched after Continue Watching');
    const row = because.find(item => item.id === 'b')!;
    assert.deepEqual([row.lead, row.label, ids(row.items)], ['Because you watched', 'Title t2', ['t4', 't1', 't3', 't5', 't6', 't7']],
        'Built from what the viewer is watching (t2, a drama): the other drama first, never the title itself');
    const alex = streamingViewerRows(titles, { ...plain, because: true, profile: 'ALEX' }).find(item => item.id === 'b')!;
    assert.deepEqual([alex.label, ids(alex.items).slice(0, 1)], ['Title t3', ['t1']], 'Another profile builds from its own title (t3)');
    const resumeFirst = streamingViewerRows(titles, { ...plain, layoutMode: 'RESUME', because: true });
    assert.deepEqual(resumeFirst.map(item => item.id), ['r', 't', 'b', 'o', 'n', 'l'], 'A resume-first storefront keeps its order');
    const noneWatched = streamingViewerRows(titles.map(item => ({ ...item, progress: undefined })), { ...plain, because: true }).find(item => item.id === 'b')!;
    assert.equal(noneWatched.label, 'Title t1', 'Nothing in progress: built from the top title');
    assert.equal(streamingViewerRows([title('t1', 'DRAMA', { rank: 1 })], { ...plain, because: true }).some(item => item.id === 'b'), false, 'One title: nothing to recommend');
    console.log('PASS because: "Because you watched Title t2" after Continue Watching, titles like it first (t4), never itself; Alex builds from t3; nothing in progress → the top title; one title → no row');

    const channels = streamingViewerRows(titles, { ...plain, because: true, channels: true });
    assert.deepEqual(channels.map(item => item.id), ['t', 'r', 'c', 'b', 'o', 'n', 'l'], 'AI channels before Because you watched');
    const live = channels.find(item => item.id === 'c')!;
    assert.deepEqual([live.label, live.channels!.map(item => [item.name, item.title.id])],
        ['Your AI channels', [['Drama 24/7', 't2'], ['Thriller 24/7', 't1'], ['Comedy 24/7', 't3']]], 'Three channels, the genre the viewer watches first');
    assert.ok(live.channels!.every(item => item.at >= 12 && item.at < 88), 'Each partway through what it plays');
    assert.equal(streamingViewerRows(titles, { ...plain, channels: true }).some(item => item.id === 'c'), true, 'AI channels need only the plan row');
    console.log(`PASS channels: "Your AI channels": ${live.channels!.map(item => `${item.name} (now ${item.title.title})`).join(', ')}`);

    const kids = streamingViewerKidsTitles([...titles, title('t8', 'Musical'), title('t9', 'FANTASY'), title('t10', 'SPORTS'), title('t11', 'CRIME')]);
    assert.deepEqual(ids(kids), ['t3', 't5', 't6', 't8', 't9', 't10'], 'Comedy, animation, adventure, musical, fantasy, sports; never thriller, drama, horror or crime');
    assert.deepEqual(streamingViewerKidsTitles([title('t1', 'THRILLER', { rank: 1 }), title('t2', 'ANIMATION', { rank: 4 }), title('t3', 'COMEDY', { rank: 2 }), title('t4', 'SPORTS')])
        .map(item => [item.id, item.rank]), [['t2', 2], ['t3', 1], ['t4', undefined]], 'A Top 10 of its own: 2nd and 4th overall are its 1 and 2');
    const kidsRows = streamingViewerRows(kids, { ...plain, because: true, channels: true });
    assert.ok(kidsRows.every(item => item.items.every(entry => ids(kids).includes(entry.id)) && (item.channels ?? []).every(entry => ids(kids).includes(entry.title.id))),
        'The Kids profile\'s rows and channels hold only its titles');
    console.log(`PASS kids: the Kids profile sees ${ids(kids).join(', ')} only, in every row and channel, with a Top 10 of its own`);

    /* ── the app ── */
    const brand: Brand = {
        name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
        publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
        lockupId: 'WORDMARK', serverCity: null,
    };
    const plan = (features: string[]): StreamingViewerPlan => ({
        id: 'BASIC', name: 'Basic', monthly: 7.99, price: '$7.99 a month', adLevel: 'NONE', adSpotsPerHour: 0, picture: '1080p Full HD', features,
        ads: 'No ads', colorId: 'ocean',
        quality: { planName: 'Basic', planMax: '1080p', nowIn: null, badges: [], menu: [{ label: '1080p', state: 'AVAILABLE' }] },
    });
    const state: AppState = {
        live: true, layoutId: 'cinema', watchingNow: 12000, network: { peakLoad: 40, tier: '4K', latencyMs: 30 }, titles,
        plans: [plan(['2 screens at once'])], currentPlanId: 'BASIC',
    };
    const render = (next: AppState) => renderToStaticMarkup(createElement(ViewerApp, { brand, state: next, onBack: () => undefined }));
    const quiet = render(state);
    assert.equal(render({ ...state, personal: null }), quiet, 'No Phase 4 tech: the app is as before');
    assert.doesNotMatch(quiet, /Who’s watching|Because you watched|Your AI channels|LIVE/, 'Nothing new without them');

    const who = render({ ...state, personal: { because: false, profiles: true } });
    assert.match(who, /<h1[^>]*>Who’s watching\?<\/h1>/, 'Profiles: "Who\'s watching?" first');
    // #115: one profile a screen the plan has (this plan: 2 screens at once)
    assert.deepEqual([...who.matchAll(/aria-pressed="false"[^>]*><span[^>]*><svg[\s\S]*?<\/svg><\/span><b>([^<]+)<\/b>/g)].map(match => match[1]), ['You', 'Alex'],
        'The household\'s profiles; no Kids on a plan without it');
    assert.doesNotMatch(who, /Top 10 on /, 'The home screen waits for a profile');
    const whoKids = render({ ...state, plans: [plan(['2 screens at once', 'Kids profiles'])], personal: { because: false, profiles: true } });
    assert.deepEqual([...whoKids.matchAll(/aria-pressed="false"[^>]*><span[^>]*><svg[\s\S]*?<\/svg><\/span><b>([^<]+)<\/b>/g)].map(match => match[1]), ['You', 'Alex', 'Kids']);
    assert.match(whoKids, /Kids sees only shows and films made for children and families\./);
    console.log('PASS who: "Who\'s watching?" first where profiles run (You, Alex, Mia), Kids where the plan includes Kids profiles; the home screen waits');

    const home = render({ ...state, plans: [plan(['2 screens at once', 'AI channels'])], personal: { because: true, profiles: false } });
    assert.match(home, /<span class="[^"]*">Because you watched <\/span>Title t2<\/div>/, 'The row on the home screen');
    assert.match(home, /aria-label="Drama 24\/7, live: Title t2"[\s\S]*?LIVE<\/span><b[^>]*>Drama 24\/7<\/b><span[^>]*>Now: <b>Title t2<\/b>/, 'A LIVE channel tile');
    assert.match(home, /Your AI channels/);
    assert.doesNotMatch(render({ ...state, personal: { because: true, profiles: false } }), /Your AI channels/, 'No AI channels on a plan without them');
    console.log('PASS app: "Because you watched Title t2" and LIVE AI channel tiles on the home screen; no channels on a plan without them; nothing new without the tech');
    console.log(`done in ${Math.round(performance.now() - started)} ms`);
}

main();
