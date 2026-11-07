/** The pictures of seven Tech groups as worlds, #79 (codex-handoff/plans/platform-tech-plan.md §14, 2026-10-30;
 *  Zeesh: "need better visualizer for optimisiation, playback, apps and devices, trust and safety, smart ai, profile
 *  and family and also ad tech"). The real Tech tab with the test company's desk, in headless Chromium
 *  (scripts/tech-lab). For each of the seven groups, opened on its next move:
 *  - worlds: now and next are drawn as the group's world (TechScenes.tsx), never the old diagrams;
 *  - next is better: more homes on one line (Optimisation, exactly as the move's load says), a sooner start
 *    (Playback), more screens (Apps), fewer copies slipping out (Trust, as the leak risk says) and, for Sharing
 *    control, fewer homes on one password, more personal rows (Smart AI), more rooms or the Kids room (Family), a
 *    closer ad and a fuller jar (Ads);
 *  - words: each side's caption fits its own half at 320–430 px;
 *  - motion: Playback's start and Smart AI's search run on their own timing; with reduced motion nothing moves.
 *  #82 (Zeesh: "need better visual for smart ai, profile and family") redrew two of them: Smart AI is a viewer whose TV
 *  hunts for tonight's film (the better the AI, the fewer titles it passes and the closer the match), Profiles and family
 *  a family of six sharing one TV until each has a screen of their own (fewer share it as screens grow).
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). TECH_LAB_DESK=<file> caches the desk. */
import assert from 'node:assert/strict';
import { chromium, openTechLab, techLabDesk } from './tech-lab/lab';
import { optimisationHomes } from '../components/streaming-transplant/TechScenes';

const GROUPS = ['OPTIMISATION', 'PLAYBACK', 'APPS', 'TRUST', 'SMART_AI', 'FAMILY', 'ADS'] as const;
const WIDTHS = [320, 360, 375, 390, 430];
const OLD_WORDS = ['BUFFERS UNDER LOAD', 'SECURITY ', 'COMMERCE ', 'KINDS OF SCREEN', "WHO'S WATCHING?", 'OUTSIDE HOMES',
    /* #79's Smart AI rows and Family caption, redrawn in #82 */ 'TRENDING NOW', 'PICKED FOR YOU', 'AT A TIME'];

type Side = { world: string | null; data: Record<string, string>; caption: { text: string; left: number; right: number } | null; animations: number };

(async () => {
    const started = performance.now();
    const desk = await techLabDesk(process.env.TECH_LAB_DESK);
    const browser = await chromium.launch({ headless: true });
    const read = (page: any) => page.evaluate(() => {
        const frame = document.querySelector('#scroller [class*="frame"]')!;
        const box = frame.getBoundingClientRect();
        const svg = frame.querySelector('svg')!;
        const sides = [...svg.querySelectorAll(':scope > g[clip-path]')].map(clip => {
            const world = clip.querySelector('[data-world]');
            const caption = clip.querySelector('[data-caption]');
            const captionBox = caption?.getBoundingClientRect();
            return {
                world: world?.getAttribute('data-world') ?? null,
                data: Object.fromEntries([...(world?.attributes ?? [])].filter(a => a.name.startsWith('data-')).map(a => [a.name.slice(5), a.value])),
                caption: caption && captionBox ? { text: caption.getAttribute('data-caption')!, left: (captionBox.left - box.left) / box.width, right: (captionBox.right - box.left) / box.width } : null,
                animations: clip.querySelectorAll('animate, animateTransform').length,
            };
        });
        return { sides, words: svg.textContent || '', veil: svg.querySelector('[data-world="PLAYBACK"] > rect > animate')?.getAttribute('keyTimes') ?? null };
    });
    try {
        const found: string[] = [];
        for (const id of GROUPS) {
            const group = desk.groups.find(item => item.id === id)!;
            const step = group.steps.find(item => item.id === group.focus)!;
            const page = await openTechLab(browser, desk, 375);
            await page.locator(`#scroller button[aria-label^="${group.name}:"]`).click();
            await page.locator('#scroller [class*="frame"] svg').waitFor();
            const view = await read(page);
            const [now, next] = view.sides as Side[];
            assert.ok(now && next, `${group.name}: now and next are both drawn (focus ${step.name})`);
            assert.equal(now.world, id, `${group.name}: now is its world`);
            assert.equal(next.world, id, `${group.name}: next is its world`);
            OLD_WORDS.forEach(word => assert.ok(!view.words.includes(word), `${group.name}: the old picture's "${word.trim()}"`));
            const n = (side: Side, key: string) => Number(side.data[key]);
            let line = '';
            if (id === 'OPTIMISATION') {
                const effect = step.effect?.kind === 'LOAD' ? step.effect : null;
                assert.ok(effect, 'Optimisation opens on a load move');
                assert.equal(n(now, 'homes'), optimisationHomes(effect!.now), 'now: the homes its load leaves room for');
                assert.equal(n(next, 'homes'), optimisationHomes(effect!.next), 'next: the homes its load leaves room for');
                assert.ok(n(next, 'homes') > n(now, 'homes'), 'more homes on one line');
                line = `${n(now, 'homes')} → ${n(next, 'homes')} homes on one line (load ${effect!.now.toFixed(2)} → ${effect!.next.toFixed(2)})`;
            } else if (id === 'PLAYBACK') {
                assert.ok(n(next, 'start') < n(now, 'start'), 'it starts sooner');
                assert.ok(n(next, 'delay') < n(now, 'delay'), 'and the film shows sooner');
                assert.ok(now.animations > 0 && next.animations > 0, 'both play');
                const second = Number(view.veil!.split(';')[1]);
                assert.ok(Math.abs(second - n(now, 'delay') / 8) < .002, `the veil lifts at the start time (${second})`);
                line = `starts in ${n(now, 'start')} s → ${n(next, 'start')} s (the film shows at ${now.data.delay} s → ${next.data.delay} s of 8)${n(next, 'stall') ? ', still stalls once' : ''}`;
            } else if (id === 'APPS') {
                assert.ok(n(next, 'lit') > n(now, 'lit'), 'more screens');
                line = `${n(now, 'lit')} → ${n(next, 'lit')} of 5 screens lit`;
            } else if (id === 'TRUST') {
                const effect = step.effect?.kind === 'SECURITY' ? step.effect : null;
                assert.ok(effect, 'Trust opens on a security move');
                assert.equal(n(now, 'slips'), Math.round(effect!.leakNow * 4), 'now: copies slip out as its leak risk says');
                assert.equal(n(next, 'slips'), Math.round(effect!.leakNext * 4), 'next: as its leak risk says');
                assert.ok(n(next, 'layers') > n(now, 'layers') && n(next, 'slips') <= n(now, 'slips'), 'a ring more, and no more copies out');
                line = `rings ${n(now, 'layers')} → ${n(next, 'layers')}, copies slipping out ${n(now, 'slips')} → ${n(next, 'slips')} a side (leak ${Math.round(effect!.leakNow * 100)}% → ${Math.round(effect!.leakNext * 100)}%)`;
            } else if (id === 'SMART_AI') {
                assert.ok(n(next, 'personal') > n(now, 'personal'), 'a better read of the viewer');
                assert.ok(n(next, 'passes') <= n(now, 'passes') && n(next, 'match') > n(now, 'match'), 'it finds the film sooner, and a closer match');
                assert.ok(now.animations > 0 && next.animations > 0, 'both TVs hunt');
                line = `the AI ${n(now, 'personal')} → ${n(next, 'personal')}: passes ${n(now, 'passes')} → ${n(next, 'passes')} titles, match ${n(now, 'match')}% → ${n(next, 'match')}%`;
            } else if (id === 'FAMILY') {
                assert.ok(n(next, 'screens') > n(now, 'screens') || n(next, 'kids') > n(now, 'kids') || n(next, 'party') > n(now, 'party'), 'more for the home');
                if (n(next, 'screens') > n(now, 'screens')) assert.ok(n(next, 'sofa') < n(now, 'sofa'), 'fewer share the one TV');
                line = `screens ${n(now, 'screens')} → ${n(next, 'screens')} (sharing the TV ${n(now, 'sofa')} → ${n(next, 'sofa')}), kids ${n(now, 'kids') ? 'safe' : '16+'} → ${n(next, 'kids') ? 'safe' : '16+'}`;
            } else {
                assert.ok(n(next, 'rank') > n(now, 'rank'), 'a closer ad');
                assert.ok(n(next, 'jar') > n(now, 'jar') && n(next, 'coin-every') < n(now, 'coin-every'), 'a fuller jar, coins more often');
                line = `ad "${now.caption?.text}" → "${next.caption?.text}", jar ${now.data.jar} → ${next.data.jar}, a coin every ${now.data['coin-every']} → ${next.data['coin-every']} s`;
            }

            /* ── words: each caption in its own half, at every width ── */
            for (const width of WIDTHS) {
                await page.setViewportSize({ width, height: 812 });
                await page.waitForTimeout(60);
                const sized = await read(page);
                const [left, right] = sized.sides as Side[];
                if (left.caption) assert.ok(left.caption.left >= 0 && left.caption.right <= .5, `${group.name} at ${width}: "${left.caption.text}" leaves the left half (${left.caption.right.toFixed(3)})`);
                if (right.caption) assert.ok(right.caption.left >= .5 && right.caption.right <= 1, `${group.name} at ${width}: "${right.caption.text}" leaves the right half (${right.caption.left.toFixed(3)})`);
            }
            found.push(`${group.name}: ${line}`);
            await page.close();
        }
        /* ── Sharing control, Trust and safety's other picture ── */
        {
            const trust = desk.groups.find(item => item.id === 'TRUST')!;
            const check = trust.steps.find(item => item.id === 'TRUST_DEVICE_CHECK')!;
            const page = await openTechLab(browser, desk, 375, check.id);
            const [now, next] = (await read(page)).sides as Side[];
            assert.equal(now.world, 'SHARING', 'Device check: now is the homes on one password');
            assert.equal(next.world, 'SHARING', 'and so is next');
            const effect = check.effect?.kind === 'SHARING' ? check.effect : null;
            assert.ok(effect, 'Device check is a sharing move');
            assert.equal(Number(now.data.sharing), Math.round(6 * effect!.now.check), 'now: the homes still sharing');
            assert.equal(Number(next.data.sharing), Math.round(6 * effect!.next.check), 'next: as its check says');
            assert.ok(Number(next.data.sharing) < Number(now.data.sharing), 'fewer homes on one password');
            found.push(`Trust and safety, ${check.name}: ${now.data.sharing} → ${next.data.sharing} homes on one password`);
            await page.close();
        }
        /* ── Profiles and family's screens (#82): each screen more sends someone off the shared sofa ── */
        {
            const family = desk.groups.find(item => item.id === 'FAMILY')!;
            const screens = family.steps.find(item => item.id === 'FAM_SCREENS')!;
            const page = await openTechLab(browser, desk, 375, screens.id);
            const [now, next] = (await read(page)).sides as Side[];
            assert.ok(next, `${screens.name} has a next version in the test company`);
            assert.ok(Number(next.data.screens) > Number(now.data.screens), 'more screens at once');
            assert.ok(Number(next.data.sofa) < Number(now.data.sofa), 'fewer share the one TV');
            found.push(`Profiles and family, ${screens.name}: ${now.data.screens} → ${next.data.screens} screens, sharing the TV ${now.data.sofa} → ${next.data.sofa}`);
            await page.close();
        }
        console.log(`PASS worlds, next better than now, captions in their halves at ${WIDTHS.join('/')} px:\n  ${found.join('\n  ')}`);

        /* ── reduced motion: nothing moves ── */
        const still: string[] = [];
        for (const id of ['PLAYBACK', 'SMART_AI', 'OPTIMISATION', 'FAMILY'] as const) {
            const group = desk.groups.find(item => item.id === id)!;
            const page = await openTechLab(browser, desk, 375, null, 812, 'reduce');
            await page.locator(`#scroller button[aria-label^="${group.name}:"]`).click();
            await page.locator('#scroller [class*="frame"] svg').waitFor();
            const moving = await page.evaluate(() => ({
                smil: document.querySelectorAll('#scroller svg animate, #scroller svg animateTransform').length,
                css: [...document.querySelectorAll('#scroller svg *')].filter(el => getComputedStyle(el).animationName !== 'none').length,
            }));
            assert.deepEqual(moving, { smil: 0, css: 0 }, `${group.name} with reduced motion still moves`);
            still.push(group.name);
            await page.close();
        }
        console.log(`PASS reduced motion: ${still.join(', ')} hold still`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
