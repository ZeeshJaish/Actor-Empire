/** Nothing on the HQ is cut or collides as the service grows, #77 (codex-handoff/plans/platform-tech-plan.md §14,
 *  2026-10-30; Zeesh: "haan naam wala bhi theek kar do", and on the OPERATIONS cards: "agar numbers badhenge to fir
 *  clashes honge ui collide"). The real HQ is rendered with its real CSS in a headless browser at 320–430 px, for
 *  the test service and for a stress case (a long name, billion-sized numbers, a long title). Checks:
 *  - name: the service's name is never cut, and the level badge never sits on it (it moves under the name);
 *  - cards: each OPERATIONS stat stays inside its card and clear of the ›, wrapping at its space;
 *  - most watched: the title is never cut and never runs into the watching count;
 *  - the page: no text anywhere in the header, the most watched bar or OPERATIONS is clipped, and no sideways scroll.
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformHQ, type HqState } from '../components/streaming-transplant/StreamingPlatformCommandDeck';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const playwrightPath = process.env.PLAYWRIGHT_MODULE
    || '/Users/zeesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { chromium }: { chromium: any } = require(playwrightPath);

/* esbuild writes the CSS the HQ imports next to this bundle */
const styles = readFileSync(__filename.replace(/\.cjs$/, '.css'), 'utf8');

const brand = (name: string, lockupId = 'SIDE'): Brand => ({
    name, markId: 'FRAME_PLAY', customMark: null, hue: 250, sat: 90,
    identId: 'PULSE', customIdent: null, promiseId: 'BALANCED', publicManifesto: '',
    layoutId: 'CINEMA', typeId: 'GROTESK', accentHue: 168, identMode: 'badge',
    identLen: 2, ratingId: 'MATURE', lockupId, serverCity: null,
});
const hq = (stats: [string, string, string, string], title: string, watching: number): HqState => ({
    live: true, built: true, tier: 'LEVEL 4 • GLOBAL REACH', territories: 34, reachLevel: 4,
    subscribers: 22_995_577, subsDelta: -11_210, treasury: 2_400_000_000,
    nowPlaying: { title, watching },
    stats: [], slate: [], service: [],
    divisions: [
        { id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Viewers · plans · growth', statLabel: 'SUBSCRIBERS', stat: stats[0], pressure: 'calm', chips: [{ id: 'PLANS', label: 'Plans' }] },
        { id: 'CONTENT', label: 'CONTENT', sub: 'Library · slate · rights', statLabel: 'CATALOGUE', stat: stats[1], pressure: 'watch' },
        { id: 'PLATFORM', label: 'PLATFORM', sub: 'Servers · tech · status', statLabel: 'BASELINE', stat: stats[2], pressure: 'calm' },
        { id: 'BOARDROOM', label: 'BOARDROOM', sub: 'Leadership · money', statLabel: 'LEADERSHIP', stat: stats[3], pressure: 'urgent' },
    ],
});
const CASES = [
    { label: 'the test service', name: 'NORTHSTAR+', state: hq(['22,995,577', '63 TITLES', '27,794,000 STREAMS', '7 EXECUTIVES'], 'Midnight Atlas', 22_995_577) },
    /* #127: the two other lockups, the mark above the name and the name alone */
    { label: 'stacked lockup', name: 'NORTHSTAR+', lockup: 'STACK', state: hq(['22,995,577', '63 TITLES', '27,794,000 STREAMS', '7 EXECUTIVES'], 'Midnight Atlas', 22_995_577) },
    { label: 'wordmark', name: 'NORTHSTAR+', lockup: 'WORDMARK', state: hq(['22,995,577', '63 TITLES', '27,794,000 STREAMS', '7 EXECUTIVES'], 'Midnight Atlas', 22_995_577) },
    { label: 'stress', name: 'THE GRAND MERIDIAN STREAMING COMPANY', state: hq(['987,654,321', '2,400 TITLES', '1,234,567,890 STREAMS', '12 EXECUTIVES'], 'The Long Night of the Seven Kingdoms', 987_654_321) },
];
const WIDTHS = [320, 360, 375, 390, 430];

(async () => {
    const browser = await chromium.launch({ headless: true });
    try {
        for (const item of CASES) {
            const markup = renderToStaticMarkup(<PlatformHQ brand={brand(item.name, (item as { lockup?: string }).lockup)} state={item.state} onBack={() => undefined} onOpenViewer={() => undefined} onOpenDivision={() => undefined} />);
            const found: string[] = [];
            for (const width of WIDTHS) {
                const page = await browser.newPage({ viewport: { width, height: 900 } });
                await page.setContent(`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>*{box-sizing:border-box;margin:0}button{font:inherit;color:inherit;background:none;border:0;padding:0;text-align:inherit}body{background:#050609;color:#e8ecf3;font-family:Inter,system-ui,sans-serif}${styles}</style></head><body>${markup}</body></html>`);
                const read = await page.evaluate(() => {
                    const root = document.querySelector('[data-epx-root]')!;
                    const box = (el: Element) => el.getBoundingClientRect();
                    const hits = (a: DOMRect, b: DOMRect) => a.left < b.right - .5 && a.right > b.left + .5 && a.top < b.bottom - .5 && a.bottom > b.top + .5;
                    const textRects = (el: Element) => { const range = document.createRange(); range.selectNodeContents(el); return [...range.getClientRects()].filter(r => r.width > 0); };
                    const lines = (el: Element) => new Set(textRects(el).map(r => Math.round(r.top))).size;
                    const h1 = root.querySelector('header h1')!;
                    /* #127: the badge sits under the lockup (the logo and the name as one); all three share the page's centre */
                    const tier = root.querySelector('header [data-tier]')!;
                    const lockup = root.querySelector('header [data-lockup]')!;
                    const where = root.querySelector('header [data-where]')!;
                    const centre = (el: Element) => (box(el).left + box(el).right) / 2;
                    const cards = [...root.querySelectorAll('button')].filter(b => b.querySelector('em') && b.querySelector(':scope > i:last-child')?.textContent === '›' && b.querySelectorAll(':scope > div').length);
                    const now = [...root.querySelectorAll('button')].find(b => b.querySelector('em') && !b.querySelector(':scope > i:last-child'))!;
                    const nowTitle = now.querySelector('b')!;
                    const nowCount = now.querySelector(':scope > em')!;
                    const scope = [root.querySelector('header')!, now, ...cards];
                    const clipped = scope.flatMap(part => [part, ...part.querySelectorAll('*')]).filter(el => {
                        if (!el.textContent?.trim() || [...el.children].some(child => child.textContent?.trim())) return false;
                        const style = getComputedStyle(el);
                        return (style.textOverflow === 'ellipsis' || style.overflow === 'hidden' || style.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1;
                    }).map(el => el.textContent!.trim());
                    return {
                        name: { cut: h1.scrollWidth > h1.clientWidth + 1 || getComputedStyle(h1).textOverflow === 'ellipsis', lines: lines(h1), onBadge: hits(box(h1), box(tier)), outside: textRects(h1).some(r => r.left < -.5 || r.right > innerWidth + .5), badgeUnder: box(tier).top >= box(h1).bottom - 1 },
                        cards: cards.map(card => {
                            const stat = card.querySelector('em')!;
                            const chevron = box(card.querySelector(':scope > i:last-child')!);
                            const rects = textRects(stat);
                            return { stat: stat.textContent!, lines: lines(stat), onChevron: rects.some(r => hits(r, chevron)), outside: rects.some(r => r.right > box(card).right - 1 || r.left < box(card).left + 1) };
                        }),
                        now: { title: nowTitle.textContent!, cut: nowTitle.scrollWidth > nowTitle.clientWidth + 1, lines: lines(nowTitle), onCount: textRects(nowTitle).some(r => hits(r, box(nowCount))) },
                        clipped,
                        sideways: document.documentElement.scrollWidth > document.documentElement.clientWidth,
                        centres: { page: document.documentElement.clientWidth / 2, lockup: centre(lockup), tier: centre(tier), where: centre(where) },
                    };
                });
                const at = `${item.label} at ${width} px`;
                assert.equal(read.name.cut, false, `${at}: the name is cut`);
                assert.equal(read.name.outside, false, `${at}: the name runs off the screen`);
                assert.equal(read.name.onBadge, false, `${at}: the level badge sits on the name`);
                assert.equal(read.cards.length, 4, `${at}: four OPERATIONS cards`);
                read.cards.forEach(card => {
                    assert.equal(card.onChevron, false, `${at}: "${card.stat}" runs into the ›`);
                    assert.equal(card.outside, false, `${at}: "${card.stat}" leaves its card`);
                });
                assert.equal(read.now.cut, false, `${at}: the most watched title is cut`);
                assert.equal(read.now.onCount, false, `${at}: the most watched title runs into the count`);
                assert.deepEqual(read.clipped, [], `${at}: text is clipped`);
                assert.equal(read.sideways, false, `${at}: the page scrolls sideways`);
                /* #127 (Zeesh: "the text logo isnt in center"): the lockup, the level and the territories line on one centre */
                for (const part of ['lockup', 'tier', 'where'] as const) {
                    assert.ok(Math.abs(read.centres[part] - read.centres.page) <= 1.5, `${at}: the ${part} is off the page's centre (${read.centres[part].toFixed(1)} vs ${read.centres.page})`);
                }
                found.push(`${width}: name ${read.name.lines} line${read.name.lines === 1 ? '' : 's'}${read.name.badgeUnder ? ', badge under it' : ', badge beside it'}; ${read.cards.map(card => `"${card.stat}" ${card.lines}`).join(', ')}; title ${read.now.lines}`);
                await page.close();
            }
            console.log(`PASS ${item.label} ("${item.name}"): nothing cut, nothing on the ›\n  ${found.join('\n  ')}`);
        }
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exit(1); });
