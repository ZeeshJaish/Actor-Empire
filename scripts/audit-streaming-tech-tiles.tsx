/** The Tech tab's tiles and opened groups, #78 (codex-handoff/plans/platform-tech-plan.md §14, 2026-10-30; Zeesh:
 *  "all the boxes are of not same size and also the text over them is so big tht they look bad / also there is a ux
 *  issue like if i click picutre then i have to scroll down to see detailed realted to it"). The real Tech tab with
 *  the test company's desk, in headless Chromium at 320–430 px (scripts/tech-lab). Checks:
 *  - tiles: one per group, all one size, the tech's name 16 px at most and two lines at most, nothing cut;
 *  - open: every tile opens its group in place of the tiles with "‹ All tech", its picture whole on screen with no
 *    scrolling, from wherever the tile was; nothing cut;
 *  - back: "‹ All tech" brings the tiles back with the tile just left in view;
 *  - doors: Go to Tech opens straight on its group, and the tech debt bar opens Stabilization;
 *  - sections (#83; Zeesh: "categorize … bas single ek line"): a line over each section, in order, Picture & sound
 *    (Picture, HDR, Colour, Sound), Streaming (Optimisation, Stabilization, Playback, Apps and devices), Viewers & money
 *    (Trust and safety, Smart AI, Profiles and family, Ads tech); each line on one row, across both columns, uncut.
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). TECH_LAB_DESK=<file> caches the desk. */
import assert from 'node:assert/strict';
import { chromium, openTechLab, techLabDesk } from './tech-lab/lab';

const WIDTHS = [320, 360, 375, 390, 430];

/* every leaf with text that its box cuts */
const CLIPPED = () => [...document.querySelectorAll('#scroller section *')].filter(el => {
    if (!el.textContent?.trim() || [...el.children].some(child => child.textContent?.trim())) return false;
    const style = getComputedStyle(el);
    return (style.textOverflow === 'ellipsis' || style.overflow === 'hidden' || style.overflowX === 'hidden') && el.scrollWidth > el.clientWidth + 1;
}).map(el => el.textContent!.trim().slice(0, 40));

(async () => {
    const started = performance.now();
    const desk = await techLabDesk(process.env.TECH_LAB_DESK);
    console.log(`test company desk ready in ${Math.round((performance.now() - started) / 1000)} s: ${desk.groups.length} groups, ${desk.owned} of ${desk.total} unlocked`);
    const browser = await chromium.launch({ headless: true });
    try {
        for (const width of WIDTHS) {
            const page = await openTechLab(browser, desk, width);
            const at = `${width} px`;

            /* ── tiles ── */
            const tiles = await page.evaluate(() => [...document.querySelectorAll('#scroller button')].filter(b => /\. Open$/.test(b.getAttribute('aria-label') || '')).map(tile => {
                const box = tile.getBoundingClientRect();
                const best = tile.querySelector('b')!;
                const range = document.createRange();
                range.selectNodeContents(best);
                const lines = new Set([...range.getClientRects()].map(rect => Math.round(rect.top))).size;
                const outside = [...tile.querySelectorAll('*')].some(el => { const r = el.getBoundingClientRect(); return r.width > 0 && (r.left < box.left - .5 || r.right > box.right + .5 || r.bottom > box.bottom + .5); });
                return { label: tile.getAttribute('aria-label')!, w: Math.round(box.width), h: Math.round(box.height), size: parseFloat(getComputedStyle(best).fontSize), lines, outside };
            }));
            assert.equal(tiles.length, desk.groups.length, `${at}: one tile a group`);
            assert.equal(new Set(tiles.map(tile => `${tile.w}x${tile.h}`)).size, 1, `${at}: tiles differ in size: ${[...new Set(tiles.map(tile => `${tile.w}x${tile.h}`))].join(', ')}`);
            tiles.forEach(tile => {
                assert.ok(tile.size <= 16, `${at}: "${tile.label}" is ${tile.size} px`);
                assert.ok(tile.lines <= 2, `${at}: "${tile.label}" takes ${tile.lines} lines`);
                assert.equal(tile.outside, false, `${at}: "${tile.label}" runs out of its tile`);
            });
            assert.deepEqual(await page.evaluate(CLIPPED), [], `${at}: text is cut on the tiles`);
            const longest = tiles.reduce((a, b) => (b.lines > a.lines ? b : a));

            /* ── sections: each line, then its tiles ── */
            const sections = await page.evaluate(() => {
                const grid = document.querySelector('#scroller [role="group"][aria-label="Tech groups"]')!;
                const gridBox = grid.getBoundingClientRect();
                const out: Array<{ name: string; tiles: string[]; wide: boolean; lines: number; cut: boolean }> = [];
                [...grid.children].forEach(child => {
                    if (child.tagName === 'H3') {
                        const box = child.getBoundingClientRect();
                        out.push({ name: child.textContent!.trim(), tiles: [], wide: Math.abs(box.width - gridBox.width) < 1,
                            lines: Math.round(box.height / parseFloat(getComputedStyle(child).lineHeight)), cut: child.scrollWidth > child.clientWidth + 1 });
                    } else out[out.length - 1]?.tiles.push(child.getAttribute('aria-label')!.split(':')[0]);
                });
                return out;
            });
            assert.deepEqual(sections.map(section => [section.name, section.tiles]), [
                ['Picture & sound', ['Picture', 'HDR', 'Colour', 'Sound']],
                ['Streaming', ['Optimisation', 'Stabilization', 'Playback', 'Apps and devices']],
                ['Viewers & money', ['Trust and safety', 'Smart AI', 'Profiles and family', 'Ads tech']],
            ], `${at}: the sections and their tiles`);
            sections.forEach(section => {
                assert.ok(section.wide, `${at}: "${section.name}" spans both columns`);
                assert.equal(section.lines, 1, `${at}: "${section.name}" takes ${section.lines} lines`);
                assert.equal(section.cut, false, `${at}: "${section.name}" is cut`);
            });

            /* ── open every group, then back ── */
            const opened: string[] = [];
            for (const group of desk.groups) {
                const tile = page.locator(`#scroller button[aria-label^="${group.name}:"]`);
                await tile.scrollIntoViewIfNeeded();
                const from = await page.evaluate(() => Math.round(document.getElementById('scroller')!.scrollTop));
                await tile.click();
                const back = page.locator('button[aria-label="Back to all tech"]');
                await back.waitFor();
                const view = await page.evaluate(() => {
                    const scroller = document.getElementById('scroller')!.getBoundingClientRect();
                    const section = document.querySelector('#scroller section')!;
                    const backBox = section.querySelector('button[aria-label="Back to all tech"]')!.getBoundingClientRect();
                    const frame = section.querySelector('[class*="frame"]')!.getBoundingClientRect();
                    return {
                        backIn: backBox.top >= scroller.top - .5,
                        frameIn: frame.top >= scroller.top - .5 && frame.bottom <= scroller.bottom + .5,
                        eyebrow: section.querySelector('[class*="stageHead"]')!.textContent!.trim(),
                        tiles: section.querySelectorAll('button[aria-label$=". Open"]').length,
                    };
                });
                assert.ok(view.eyebrow.startsWith(`${group.name.toUpperCase()} ·`), `${at}: ${group.name} opens ${view.eyebrow}`);
                assert.equal(view.tiles, 0, `${at}: ${group.name} opens in place of the tiles`);
                assert.ok(view.backIn && view.frameIn, `${at}: ${group.name} (tile scrolled ${from} px down) opens with its top or picture off screen`);
                assert.deepEqual(await page.evaluate(CLIPPED), [], `${at}: text is cut in ${group.name}`);
                await back.click();
                await tile.waitFor();
                const left = await page.evaluate(name => {
                    const scroller = document.getElementById('scroller')!.getBoundingClientRect();
                    const box = document.querySelector(`#scroller button[aria-label^="${name}:"]`)!.getBoundingClientRect();
                    return box.top >= scroller.top - .5 && box.bottom <= scroller.bottom + .5;
                }, group.name);
                assert.ok(left, `${at}: back from ${group.name}, its tile is off screen`);
                opened.push(`${group.name}${from ? ` (from ${from} px down)` : ''}`);
            }

            /* ── the debt bar opens Stabilization ── */
            await page.locator('#scroller button[aria-label^="Tech debt"]').click();
            await page.locator('button[aria-label="Back to all tech"]').waitFor();
            const debtOpens = await page.evaluate(() => document.querySelector('#scroller [class*="stageHead"]')!.textContent!.trim());
            assert.ok(debtOpens.startsWith('STABILIZATION ·'), `${at}: the debt bar opens ${debtOpens}`);
            await page.close();
            console.log(`PASS ${at}: ${tiles.length} tiles in ${sections.length} sections (${sections.map(section => section.name).join(' · ')}), all ${tiles[0].w}×${tiles[0].h}, names ${tiles[0].size} px (longest "${longest.label.split(':')[1].split(',')[0].trim()}" in ${longest.lines} lines); each opens on screen with ‹ All tech and goes back to its tile: ${opened.join(', ')}; the debt bar opens Stabilization`);
        }

        /* ── Go to Tech opens straight on its group ── */
        const target = desk.groups.find(group => group.id === 'SMART_AI') || desk.groups.at(-1)!;
        const page = await openTechLab(browser, desk, 375, target.steps.at(-1)!.id);
        const straight = await page.evaluate(() => ({
            back: Boolean(document.querySelector('button[aria-label="Back to all tech"]')),
            eyebrow: document.querySelector('#scroller [class*="stageHead"]')?.textContent?.trim() || '',
        }));
        assert.ok(straight.back && straight.eyebrow.startsWith(`${target.name.toUpperCase()} ·`), `Go to Tech opens ${straight.eyebrow}`);
        await page.close();
        console.log(`PASS Go to Tech: ${target.steps.at(-1)!.name} opens ${target.name} straight away, with ‹ All tech`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
