/** Tech debt's ⓘ, #88 (codex-handoff/plans/platform-tech-plan.md §14, 2026-10-30; Zeesh: "tech debt wale mein … i button
 *  ke jaise click kare to bata de ki tech debt kya hai, kyon hai aur kaise kya hatta hai"). The real Tech tab with the test
 *  company's desk, in headless Chromium (scripts/tech-lab). Checks:
 *  - the ⓘ states the engine's own costs: the bandwidth bill × (1 + debt / 200), playback success − 0.035 a point and the
 *    week's incident risk + debt / 150 (read from the services' source), the same three as TechDesk's TECH_DEBT_COSTS;
 *  - at 320–430 px the ⓘ sits beside the bar, opens and closes its panel (aria-expanded), and the panel's four parts (what
 *    it is, where it comes from, what it costs now, how it goes down) fit, nothing cut;
 *  - with debt 34, paying 3 a week, on a $1.07M bandwidth bill: +17% (about $156K more a week), −1.2 playback, +23 risk, in
 *    the bar's colour; gone in about 12 weeks. With none: "Nothing: the service runs clean". With nothing paying it down:
 *    "Nothing pays it down yet";
 *  - Open Stabilization opens the Stabilization group.
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). TECH_LAB_DESK=<file> caches the desk. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, openTechLab, techLabDesk } from './tech-lab/lab';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const INFO = 'button[aria-label="What is tech debt?"]';

const read = (page: any) => page.evaluate(() => {
    const panel = document.querySelector('[class*="debtPanel"]') as HTMLElement | null;
    const info = document.querySelector('button[aria-label="What is tech debt?"]') as HTMLElement;
    const bar = document.querySelector('button[aria-label^="Tech debt "]') as HTMLElement;
    const infoBox = info.getBoundingClientRect();
    const barBox = bar.getBoundingClientRect();
    const text = (node: Element | null | undefined) => (node as HTMLElement | null)?.innerText.replace(/\s+/g, ' ').trim() ?? null;
    const sections = panel ? [...panel.querySelectorAll('section')] : [];
    const cut = panel ? [...panel.querySelectorAll('p, span, b, small, button')].filter(node => {
        const element = node as HTMLElement;
        const box = element.getBoundingClientRect();
        return element.scrollWidth > element.clientWidth + 1 || box.right > document.documentElement.clientWidth + .5 || box.left < -.5;
    }).map(node => text(node)) : [];
    const firstCost = panel?.querySelector('[class*="debtCosts"] b') as HTMLElement | null;
    return {
        expanded: info.getAttribute('aria-expanded'),
        panel: Boolean(panel),
        beside: Math.abs(infoBox.top - barBox.top) <= 1 && Math.abs(infoBox.height - barBox.height) <= 1 && infoBox.left >= barBox.right,
        infoSize: [Math.round(infoBox.width), Math.round(infoBox.height)],
        eyebrows: sections.map(section => text(section.querySelector('[class*="eyebrow"]'))),
        costs: panel ? [...panel.querySelectorAll('[class*="debtCosts"] li')].map(text) : [],
        costsText: text(sections[2]),
        down: text(sections[3]?.querySelector('p')),
        costColour: firstCost ? getComputedStyle(firstCost).color : null,
        cut,
    };
});

(async () => {
    const started = performance.now();
    /* the engine's three costs, as the ⓘ states them */
    assert.ok(source('services/streamingDeliveryLoad.ts').includes('* (1 + debt / 200) *'), 'the bandwidth bill × (1 + debt / 200)');
    assert.ok(source('services/streamingWeeklyLoop.ts').includes('- technicalDebt * 0.035'), 'playback success − 0.035 a point of debt');
    assert.ok(source('services/streamingCrisisSecurity.ts').includes('+ resolveStreamingPlatformTechDebt(platform) / 150'), "the week's incident risk + debt / 150");
    assert.ok(source('components/streaming-transplant/TechDesk.tsx')
        .includes('const TECH_DEBT_COSTS = { billPerPoint: 1 / 200, playbackPerPoint: .035, riskPerPoint: 1 / 150 } as const;'), 'the ⓘ uses the same three');
    console.log("PASS costs: the ⓘ states the engine's own (the bill × (1 + debt / 200), playback − 0.035 a point, incident risk + debt / 150)");

    const base = await techLabDesk(process.env.TECH_LAB_DESK);
    const deskWith = (debt: number, paydown: number, bill: number) => ({ ...JSON.parse(JSON.stringify(base)), debt, debtPaydown: paydown, deliveryCost: bill });
    const browser = await chromium.launch({ headless: true });
    try {
        /* debt 34, paying 3 a week, on a $1,073,745 bill: +17%, $1,073,745 × .17 / 1.17 = $156K, 34 × .035 = 1.19, 34 / 150 = 23% */
        const fits: string[] = [];
        for (const width of [320, 360, 375, 390, 430]) {
            const page = await openTechLab(browser, deskWith(34, 3, 1_073_745), width);
            const closed = await read(page);
            assert.equal(closed.panel, false, 'closed until asked');
            assert.equal(closed.expanded, 'false');
            assert.ok(closed.beside, `the ⓘ beside the bar, as tall (${width} px)`);
            assert.ok(closed.infoSize[0] >= 44 && closed.infoSize[1] >= 34, `a thumb-sized ⓘ (${closed.infoSize.join('×')})`);
            await page.locator(INFO).click();
            const open = await read(page);
            assert.equal(open.panel, true, 'the ⓘ opens its panel');
            assert.equal(open.expanded, 'true');
            assert.deepEqual(open.eyebrows, ['WHAT IT IS', 'WHERE IT COMES FROM', 'WHAT IT COSTS YOU NOW · 34', 'HOW IT GOES DOWN']);
            assert.deepEqual(open.costs, [
                '+17% Bandwidth bill about $156K more a week',
                '−1.2 Playback success more plays stall or fail, and more viewers leave',
                '+23 Incident risk incidents come sooner and hit harder',
            ]);
            assert.equal(open.costColour, 'rgb(255, 176, 32)', 'the costs in the bar\'s colour (debt 20 and up: amber)');
            assert.equal(open.down, 'Stabilization pays 3 a week, so it is gone in about 12 weeks if you add no more. Raise Stabilization to pay faster.');
            assert.deepEqual(open.cut, [], `nothing cut at ${width} px`);
            await page.locator(INFO).click();
            const again = await read(page);
            assert.deepEqual([again.panel, again.expanded], [false, 'false'], 'a second tap closes it');
            fits.push(`${width}`);
            await page.close();
        }
        console.log(`PASS panel: the ⓘ (44 px) beside the bar opens and closes it; "+17% Bandwidth bill, about $156K more a week · −1.2 Playback success · +23 Incident risk", gone in about 12 weeks; four parts, nothing cut at ${fits.join('/')} px`);

        /* none, and nothing paying it down */
        let page = await openTechLab(browser, deskWith(0, 3, 1_073_745), 375);
        await page.locator(INFO).click();
        const clean = await read(page);
        assert.equal(clean.costsText, 'WHAT IT COSTS YOU NOW · 0 Nothing: the service runs clean.');
        assert.equal(clean.down, 'Stabilization pays up to 3 a week, so new debt is paid off as it comes. Raise Stabilization to pay more.');
        assert.equal(clean.costColour, null, 'no costs listed');
        await page.close();
        page = await openTechLab(browser, deskWith(12, 0, 1_073_745), 375);
        await page.locator(INFO).click();
        const unpaid = await read(page);
        assert.equal(unpaid.down, 'Nothing pays it down yet. Unlock Stabilization to pay some off every week.');
        assert.equal(unpaid.costs[0], '+6% Bandwidth bill about $61K more a week');
        assert.equal(unpaid.costColour, 'rgb(74, 222, 128)', 'under 20 the bar and its costs are green');

        /* Open Stabilization */
        await page.locator('button:has-text("Open Stabilization")').click();
        await page.locator('button[aria-label="Back to all tech"]').waitFor({ timeout: 2000 });
        const eyebrow = await page.evaluate(() => (document.querySelector('[class*="stageHead"] [class*="eyebrow"]') as HTMLElement | null)?.innerText ?? '');
        assert.ok(/^STABILIZATION/.test(eyebrow), `Open Stabilization opens its group (${eyebrow})`);
        await page.close();
        console.log(`PASS states: debt 0 "Nothing: the service runs clean" and "pays up to 3 a week"; nothing paying it down "Nothing pays it down yet"; Open Stabilization opens "${eyebrow}"`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
