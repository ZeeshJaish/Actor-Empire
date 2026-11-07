/**
 * #114 The viewer app: a home for each of the 13 front pages (plan §18.5: "Each of the 13 front pages becomes its own
 * home in the viewer app, built from the wizard's own previews"; Zeesh, 2026-11-01: "हमारा स्टोर फ्रंट जिस टाइप का
 * डिज़ाइन होगा … वैसे ही हमारा रियल ऐप भी दिखेगा"). It drew them as four modes before (HERO, GRID, ROWS, RESUME):
 *  - each of the 13 has its own lead, as the wizard previews it; legacy ids land on their front page's home;
 *  - a headline lead keeps every row after it; a lead that lays out the catalogue keeps only the viewer's own rows
 *    (Continue Watching, Because you watched, AI channels, Leaving soon);
 *  - the app's own features stay (the plan line, the outage banner, Who's watching).
 * Renders with react-dom/server. (~1 s)
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ViewerApp, type AppState, type AppTitle } from '../components/streaming-transplant/StreamingViewerExperience';
import { STREAMING_VIEWER_HOMES, StreamingViewerHomePreview, streamingViewerHome } from '../components/streaming-transplant/StreamingViewerHomes';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { STREAMING_STOREFRONT_LAYOUTS } from '../services/streamingStorefront';

/* ── every front page, its own home (13; 25 since #122) ── */
const ids = STREAMING_STOREFRONT_LAYOUTS.map(layout => layout.id);
assert.deepEqual(Object.keys(STREAMING_VIEWER_HOMES).sort(), [...ids].sort(), 'Every front page has a home');
const leads = Object.values(STREAMING_VIEWER_HOMES).map(home => home.lead);
assert.equal(new Set(leads).size, ids.length, `A distinct lead for each (${leads.join(', ')})`);
assert.equal(ids.length, 25, 'Twenty-five front pages (#122 added twelve)');
assert.equal(streamingViewerHome('vault').lead, 'INDEX', 'A legacy id lands on its front page\'s home (vault → Editorial Index)');
assert.equal(streamingViewerHome('feed').lead, 'FEED');
assert.equal(streamingViewerHome('no-such-page').lead, 'HERO', 'An unknown one opens on Cinema');
console.log(`PASS homes: ${ids.length} front pages, ${ids.length} distinct leads; legacy ids land on theirs`);

/* ── the app, on each ── */
const title = (id: string, extra: Partial<AppTitle> = {}): AppTitle => ({
    id, title: `Title ${id}`, kind: 'LICENSED', format: 'Film', genre: 'Drama', hue: 200, logline: `Logline ${id}.`, ...extra,
});
const titles: AppTitle[] = [
    title('t1', { kind: 'ORIGINAL', rank: 1 }), title('t2', { rank: 2, progress: .4 }), title('t3', { rank: 3, newThisWeek: true }),
    title('t4', { kind: 'ORIGINAL' }), title('t5', { progress: .7 }), title('t6'), title('t7', { leavingInWeeks: 2 }),
];
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
};
const render = (layoutId: string) => renderToStaticMarkup(createElement(ViewerApp, {
    brand, onBack: () => undefined,
    state: { live: true, layoutId, watchingNow: 12000, network: { peakLoad: 40, tier: '4K', latencyMs: 30 }, titles } as AppState,
}));
const SIGNATURE: Record<string, RegExp> = {
    cinema: /class="[^"]*bighero/,
    spotlight: /Tonight&#x27;s one choice[\s\S]*Start watching[\s\S]*Hand-picked by NORTHSTAR\+/,
    'quiet-shelf': /Three for tonight[\s\S]*A quieter way in\./,
    marquee: /Now presenting[\s\S]*Watch the official trailer →[\s\S]*Also on the marquee/,
    'split-hero': /Play feature[\s\S]*Watch trailer/,
    'editorial-index': /NORTHSTAR\+ index<\/b><small>Volume I[\s\S]*<span[^>]*>01<\/span><b>Title t1<\/b>[\s\S]*<span[^>]*>07<\/span>/,
    chapters: /Chapter 01[\s\S]*The opening act[\s\S]*Chapter 02[\s\S]*After dark[\s\S]*Chapter 03[\s\S]*A different ending/,
    shelves: /Top 10 on [\s\S]*Continue Watching/,
    timeline: /<time>This week<\/time>[\s\S]*<time>Last week<\/time>[\s\S]*<time>Earlier<\/time>/,
    wall: /data-home-lead="WALL"/,
    mosaic: /data-home-lead="MOSAIC"/,
    'vertical-feed': /data-home-lead="FEED"[\s\S]*Play/,
    'freeform-canvas': /data-home-lead="CANVAS"[\s\S]*Drag across the canvas/,
    /* #122 */
    'cover-story': /data-home-lead="COVER"[\s\S]*Issue 01 · This week[\s\S]*Cover story[\s\S]*Watch the cover story/,
    'the-chart': /data-home-lead="CHART"[\s\S]*Top 7 this week[\s\S]*_chartnum[^>]*>1<[\s\S]*New/,
    coverflow: /data-home-lead="FLOW"[\s\S]*_flowmain[\s\S]*_flowdotOn/,
    'the-deck': /data-home-lead="DECK"[\s\S]*✕ Skip[\s\S]*Watch[\s\S]*♥ Keep[\s\S]*7 in the deck/,
    gallery: /data-home-lead="GALLERY"[\s\S]*The NORTHSTAR\+ collection[\s\S]*_galplaque/,
    bento: /data-home-lead="BENTO"[\s\S]*Featured[\s\S]*new this week[\s\S]*Continue/,
    'film-strip': /data-home-lead="STRIP"[\s\S]*Reel one[\s\S]*Frame 01 of 07/,
    broadsheet: /data-home-lead="PAPER"[\s\S]*The NORTHSTAR\+ Times[\s\S]*Weekly edition/,
    orbit: /data-home-lead="ORBIT"[\s\S]*At the centre[\s\S]*6 titles in its orbit/,
    library: /data-home-lead="LIBRARY"[\s\S]*Pulled from the shelf[\s\S]*_spineOut/,
    'box-office': /data-home-lead="TICKETS"[\s\S]*Tonight&#x27;s tickets[\s\S]*Admit one · Screen 1[\s\S]*Showing now/,
    scrapbook: /data-home-lead="SCRAPBOOK"[\s\S]*Pinned for you[\s\S]*Watch this one!/,
};
for (const id of ids) {
    const markup = render(id);
    const home = STREAMING_VIEWER_HOMES[id];
    assert.match(markup, new RegExp(`data-layout="${id}" data-home-lead="${home.lead}"`), `${id}: the app knows its home`);
    assert.match(markup, SIGNATURE[id], `${id}: its lead, as the wizard previews it`);
    if (home.rows === 'ALL') assert.match(markup, /Top 10 on /, `${id}: a headline lead keeps every row`);
    else {
        assert.doesNotMatch(markup, /Top 10 on |Originals<|New This Week/, `${id}: the lead lays out the catalogue, so its rows are only the viewer's own`);
        assert.match(markup, /Continue Watching[\s\S]*Leaving Soon/, `${id}: Continue Watching and Leaving soon stay`);
    }
}
const wall = render('wall');
assert.equal((wall.match(/data-home-lead="WALL"[\s\S]*?<\/section>/)?.[0].match(/aria-label="Title t\d"/g) ?? []).length, titles.length, 'Wall: the whole catalogue as one field');
assert.doesNotMatch(render('shelves'), /<(section|ol) [^>]*data-home-lead/, 'Shelves: lanes, no lead');
console.log('PASS app: each of the 13 opens on its own lead; headline leads keep every row, catalogue leads only the viewer\'s own');

/* ── #120 the brand studio's previews: each front page as the app draws it ── */
const preview = (id: string) => renderToStaticMarkup(createElement(StreamingViewerHomePreview, { layoutId: id, brand }));
for (const id of ids) {
    const home = streamingViewerHome(id);
    const markup = preview(id);
    assert.match(markup, new RegExp(`aria-hidden="true"[^>]*>[\\s\\S]*data-home-lead="${home.lead}"`), `${id}: the preview draws its lead`);
    assert.match(markup, home.rows === 'ALL' ? /Top 10 on / : /Continue Watching/, `${id}: and the row after it`);
}
assert.match(preview('cinema'), /data-home-lead="HERO"[\s\S]*Midnight Harbor[\s\S]*Play[\s\S]*\+ My List/, 'Cinema\'s hero, drawn in the preview (the app draws its own)');
assert.match(preview('shelves'), /data-home-lead="LANES"[\s\S]*Featured now[\s\S]*New releases/, 'Shelves\' lanes too');
assert.doesNotMatch(render('cinema'), /<section[^>]*data-home-lead="HERO"/, 'In the app Cinema keeps its own hero');
console.log('PASS previews: every front page drawn as the app draws it (Cinema\'s hero and Shelves\' lanes included), with the row after it');

/* ── #121 the leads redrawn; #123 each title's picture the previous poster again (Zeesh: "पहले जैसे थे premium … अब काफ़ी
   ज़्यादा gradient और flashy है, to we should change to previous ones") ── */
for (const id of ids) {
    const markup = render(id);
    assert.doesNotMatch(markup, /data-motif=|data-setting=/, `${id}: no genre key art (#121's motifs went back)`);
    assert.ok((markup.match(/class="[^"]*_ghost[ "]/g) ?? []).length >= 3, `${id}: the titles drawn as the poster always was, a ghost name on their colour`);
}
const cinemaApp = render('cinema');
assert.match(cinemaApp, /class="[^"]*_bighero[\s\S]*?class="[^"]*_hghost[ "]/, 'Cinema\'s hero: its ghost title again');
assert.match(cinemaApp, /aria-label="Title t1"[^>]*>[\s\S]*?_ghost[\s\S]*?_orig[\s\S]*?<span class="[^"]*_cap[ "][^>]*>Title t1<\/span>/, 'A row card: the ghost, the Original mark, the caption');
assert.match(render('editorial-index'), /NORTHSTAR\+ index<\/b><small>Volume I[\s\S]*The lead story/, 'The Index: a masthead and its lead story');
assert.match(render('marquee'), /class="[^"]*_mqframe[\s\S]*Now presenting/, 'Marquee: the banner in its frame of bulbs');
assert.match(render('split-hero'), /Two ways in[\s\S]*_splitmark/, 'Split Hero: two sides of one night, the mark between them');
console.log('PASS pictures: every home on the previous posters (ghost name, caption, Original mark), Cinema\'s ghost title; the Index masthead, the Marquee bulbs, the Split mark');
console.log('done');
