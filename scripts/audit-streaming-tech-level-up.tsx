/** The Tech tab's level-up moments as tech upgrades, #81 (codex-handoff/plans/platform-tech-plan.md §14, 2026-10-30;
 *  Zeesh: "need better level up animation like you know there are tech upgrade not language one"; #80 climbed words
 *  as Localization's hello does). The real Tech tab with the test company's desk, in headless Chromium (scripts/tech-lab).
 *  Checks:
 *  - unlock (the big one): over the whole screen (#87: a layer on the page's body), the group's chip on a circuit board (a bus of traces to its pins, data
 *    running in); it installs (ten bars, 0–100% on time), then powers on at 2 s: the V1 badge pops, its first version
 *    pip lights, two rings and two waves of bits, then "Unlocked" and its name; no words climb; gone after 4.2 s;
 *  - version (#84: played when a full bar is paid to complete): the chip is on already, its next pip charges with energy,
 *    the badge rolls V1 → V2 at 1.25 s, one ring
 *    and one wave of bits, then "Version 2 reached"; the chip holds its place as the card under it changes height
 *    (the energy reaches the game 0.2 s in); gone after 3.2 s;
 *  - words: a long name wraps inside the card, never cut, at 320–430 px;
 *  - reduced motion: the chip on and the final at once; nothing installs, runs, flies or sweeps;
 *  - #87 (Zeesh: "aadha dikh raha hai … wo animation hamare screen mein show ho jaaye … phir wapas back to the screen"):
 *    with the card scrolled half off, the moment still covers the screen with its chip on it, and the page under it has
 *    not moved during it or after; a tap skips it at once. */
/*  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). TECH_LAB_DESK=<file> caches the desk. */
import assert from 'node:assert/strict';
import { chromium, openTechLab, techLabDesk } from './tech-lab/lab';

/** the moment, on its layer over the whole screen (#87) */
const LEVEL = '[class*="momentLayer"] > [class*="levelup"]';
const read = (page: any) => page.evaluate((level: string) => {
    const over = document.querySelector(level) as HTMLElement | null;
    if (!over) return null;
    const one = (selector: string) => over.querySelector(selector) as HTMLElement | null;
    const count = (selector: string) => over.querySelectorAll(selector).length;
    const shown = (selector: string) => {
        const node = one(selector);
        return Boolean(node) && getComputedStyle(node!).display !== 'none';
    };
    const box = over.getBoundingClientRect();
    const final = one('[class*="levelFinal"]')!;
    const title = final.querySelector('b')!;
    const titleBox = title.getBoundingClientRect();
    /* the badge's line inside its window (a version's roll shows V1, then V2) */
    const badge = one('[class*="levelBadge"]')!;
    const badgeBox = badge.getBoundingClientRect();
    const badgeLine = [...badge.querySelectorAll('b')].find(line => {
        const lineBox = line.getBoundingClientRect();
        return lineBox.top >= badgeBox.top - 1.5 && lineBox.bottom <= badgeBox.bottom + 1.5;
    })?.textContent ?? null;
    const pips = [...over.querySelectorAll('[class*="levelPips"] > i')] as HTMLElement[];
    const dim = 'rgba(255, 255, 255, 0.1)';
    return {
        elapsed: Number(over.getAnimations()[0]?.currentTime ?? 0),
        chipTop: Math.round(one('[class*="levelChip"]')!.getBoundingClientRect().top - box.top),
        big: /levelBig/.test(over.className),
        coversScreen: over.parentElement!.parentElement === document.body && getComputedStyle(over.parentElement!).position === 'fixed'
            && box.left === 0 && box.top === 0
            && Math.round(box.width) === document.documentElement.clientWidth && Math.round(box.height) === document.documentElement.clientHeight,
        chipMiddle: Math.round(one('[class*="levelChip"]')!.getBoundingClientRect().top + 42),
        screenHeight: document.documentElement.clientHeight,
        icon: Boolean(one('[class*="levelIcon"] svg')),
        traces: count('[class*="levelBoard"] [class*="levelTrace"]'),
        pulses: count('[class*="levelBoard"] [class*="levelPulse"]'),
        segments: count('[class*="levelSegs"] i'),
        percent: one('[class*="levelInstall"] small b')?.textContent ?? null,
        installOpacity: shown('[class*="levelInstall"]') ? Number(getComputedStyle(one('[class*="levelInstall"]')!).opacity) : 0,
        badgeLine,
        badgeScale: new DOMMatrix(getComputedStyle(badge).transform === 'none' ? undefined : getComputedStyle(badge).transform).a,
        pips: pips.length,
        pipsLit: pips.filter(pip => getComputedStyle(pip).backgroundColor !== dim).length,
        rings: count('[class*="levelRing"]'),
        bits: count('[class*="levelBits"] i'),
        ringsShown: shown('[class*="levelRing"]'),
        bitsShown: shown('[class*="levelBits"]'),
        pulsesShown: shown('[class*="levelPulse"]'),
        words: count('[class*="levelWords"]'),
        label: final.querySelector('small')!.textContent,
        title: title.textContent,
        finalOpacity: Number(getComputedStyle(final).opacity),
        cut: title.scrollWidth > title.clientWidth + 1 || titleBox.left < box.left - .5 || titleBox.right > box.right + .5,
        titleLines: Math.round(titleBox.height / parseFloat(getComputedStyle(title).lineHeight)),
        scrollTop: (document.querySelector('#scroller') as HTMLElement).scrollTop,
    };
}, LEVEL);
const gone = (page: any) => page.evaluate((level: string) => !document.querySelector(level), LEVEL);
/** waits until the moment has run this long (by its own clock), then reads it */
const at = async (page: any, ms: number) => {
    const now = (await read(page))!.elapsed;
    if (ms > now) await page.waitForTimeout(ms - now);
    return (await read(page))!;
};
const pct = (text: string | null) => Number((text || '').replace('%', ''));

(async () => {
    const started = performance.now();
    const desk = await techLabDesk(process.env.TECH_LAB_DESK);
    const browser = await chromium.launch({ headless: true });
    try {
        /* ── unlock: the big moment ── */
        const optimisation = desk.groups.find(group => group.id === 'OPTIMISATION')!;
        const codec = optimisation.steps.find(step => step.state === 'OPEN')!;
        let page = await openTechLab(browser, desk, 375, codec.id);
        await page.locator(`#scroller button:has-text("Unlock ${codec.name}")`).last().click();
        await page.locator(LEVEL).waitFor({ timeout: 2000 });
        const early = await at(page, 300);
        assert.equal(early.big, true, 'An unlock is the big moment');
        assert.ok(early.coversScreen, 'over the whole screen');
        assert.equal(early.icon, true, "the chip carries the group's icon");
        assert.ok(early.traces >= 12, `a circuit board: ${early.traces} traces`);
        assert.equal(early.pulses, 24, 'data runs in along the twelve bus traces, twice');
        assert.equal(early.segments, 10, 'it installs: ten bars');
        assert.equal(early.words, 0, 'no words climb (#80)');
        assert.equal(early.finalOpacity, 0, 'the final waits for the power-on');
        assert.equal(early.badgeScale, 0, 'the V1 badge waits for the power-on');
        const mid = await at(page, 1200);
        const expected = Math.round(((mid.elapsed - 400) / 1480) * 100);
        assert.ok(Math.abs(pct(mid.percent) - expected) <= 8, `the install counts on time (${mid.percent} at ${Math.round(mid.elapsed)} ms, ~${expected}%)`);
        const installed = await at(page, 1960);
        assert.equal(installed.percent, '100%', `installed before it powers on (${installed.percent} at ${Math.round(installed.elapsed)} ms)`);
        const on = await at(page, 2700);
        assert.equal(on.finalOpacity, 1, 'the final shows after the power-on');
        assert.equal(on.installOpacity, 0, 'the install gives way to it');
        assert.equal(on.badgeLine, 'V1', 'the V1 badge');
        assert.equal(on.badgeScale, 1, 'popped on');
        assert.deepEqual([on.pips, on.pipsLit], [3, 1], 'its first of three version pips lit');
        assert.equal(on.label, 'Unlocked');
        assert.equal(on.title, codec.name);
        assert.deepEqual([on.rings, on.bits], [2, 22], 'two rings and two waves of bits');
        await at(page, 3600);
        assert.equal(await gone(page), false, 'still there at 3.6 s');
        await page.waitForTimeout(800);
        assert.equal(await gone(page), true, 'gone after 4.2 s');
        await page.close();
        console.log(`PASS unlock: the chip on a board of ${early.traces} traces, installs (10 bars, ${mid.percent} at ${Math.round(mid.elapsed)} ms, 100% by 1.96 s), powers on: V1, 1 of 3 pips, 2 rings, 22 bits, "${on.label} · ${on.title}"; gone after 4.2 s`);

        /* ── a version: the smaller one ── */
        const picture = desk.groups.find(group => group.id === 'PICTURE')!;
        /* the best step owned (a lower one is superseded and takes no energy) */
        const owned = picture.steps.find(step => step.id === picture.best?.id && step.nextVersion)!;
        page = await openTechLab(browser, desk, 375, owned.id);
        await page.locator('#scroller button:has-text("Fill")').first().click();
        await page.locator('#scroller button:has-text("to complete version")').click(); // #84: a full bar is paid to complete
        await page.locator(LEVEL).waitFor({ timeout: 2000 });
        const charging = await at(page, 500);
        assert.equal(charging.big, false, 'A version is the smaller moment');
        assert.ok(charging.coversScreen, 'over the whole screen too');
        assert.equal(charging.segments, 0, 'no install bars: it charges its pip');
        assert.equal(charging.badgeLine, `V${owned.nextVersion! - 1}`, 'the badge shows the version it has');
        assert.equal(charging.pipsLit, owned.nextVersion! - 1, 'the versions it has, lit');
        const reached = await at(page, 1900);
        assert.ok(Math.abs(reached.chipTop - charging.chipTop) <= 1, `the chip holds its place while the card under it changes (${charging.chipTop} → ${reached.chipTop} px)`);
        assert.equal(reached.badgeLine, `V${owned.nextVersion}`, 'the badge rolls to the new version');
        assert.deepEqual([reached.pips, reached.pipsLit], [3, owned.nextVersion], 'the new pip lit');
        assert.equal(reached.finalOpacity, 1, 'the final shows');
        assert.equal(reached.label, `Version ${owned.nextVersion} reached`);
        assert.equal(reached.title, `${owned.name} · ${owned.nextVersionName}`);
        assert.deepEqual([reached.rings, reached.bits], [1, 11], 'one ring, one wave of bits');
        await at(page, 2700);
        assert.equal(await gone(page), false, 'still there at 2.7 s');
        await page.waitForTimeout(700);
        assert.equal(await gone(page), true, 'gone after 3.2 s');
        await page.close();
        console.log(`PASS version: the chip on, its pip charges, the badge rolls ${charging.badgeLine} → ${reached.badgeLine}, ${reached.pipsLit} of 3 pips, 1 ring, 11 bits, "${reached.label} · ${reached.title}"; the chip held at ${reached.chipTop} px; gone after 3.2 s`);

        /* ── a long name never cut ── */
        const family = desk.groups.find(group => group.id === 'FAMILY')!;
        const kids = family.steps.find(step => step.id === 'FAM_KIDS' && step.state === 'OPEN') ?? family.steps.find(step => step.state === 'OPEN')!;
        const fits: string[] = [];
        for (const width of [320, 360, 375, 390, 430]) {
            page = await openTechLab(browser, desk, width, kids.id);
            await page.locator(`#scroller button:has-text("Unlock ${kids.name}")`).last().click();
            await page.locator(LEVEL).waitFor({ timeout: 2000 });
            const long = await at(page, 2800);
            assert.equal(long.cut, false, `"${long.title}" is cut at ${width} px`);
            assert.ok(long.titleLines <= 2, `"${long.title}" takes ${long.titleLines} lines at ${width} px`);
            fits.push(`${width}: ${long.titleLines} line${long.titleLines === 1 ? '' : 's'}`);
            await page.close();
        }
        console.log(`PASS words: "${kids.name}" wraps inside the screen, never cut (${fits.join(', ')})`);

        /* ── reduced motion ── */
        page = await openTechLab(browser, desk, 375, owned.id, 812, 'reduce');
        await page.locator('#scroller button:has-text("Fill")').first().click();
        await page.locator('#scroller button:has-text("to complete version")').click(); // #84: a full bar is paid to complete
        await page.locator(LEVEL).waitFor({ timeout: 2000 });
        const calm = (await read(page))!;
        assert.equal(calm.finalOpacity, 1, 'the final shows at once');
        assert.equal(calm.badgeLine, `V${owned.nextVersion}`, 'the new version at once');
        assert.equal(calm.installOpacity, 0, 'nothing installs');
        assert.deepEqual([calm.pulsesShown, calm.ringsShown, calm.bitsShown], [false, false, false], 'nothing runs or flies');
        await page.close();
        console.log('PASS reduced motion: the chip on and the final at once; nothing installs, runs, flies or sweeps');

        /* ── #87: the card scrolled half off; then a tap skips ── */
        page = await openTechLab(browser, desk, 375, codec.id);
        /* scroll until the Unlock button sits near the screen's top, so the card's picture is cut by the screen's top */
        const unlockButton = page.locator(`#scroller button:has-text("Unlock ${codec.name}")`).last();
        const before = await page.evaluate((top: number) => {
            const scroller = document.querySelector('#scroller') as HTMLElement;
            scroller.scrollTop += top - 70;
            const preview = scroller.querySelector('[class*="previewWrap"]')!.getBoundingClientRect();
            return { scrollTop: scroller.scrollTop, previewTop: Math.round(preview.top) };
        }, (await unlockButton.boundingBox())!.y);
        assert.ok(before.scrollTop > 0 && before.previewTop < -40, `the card's picture is cut by the screen's top (it starts at ${before.previewTop} px)`);
        await unlockButton.click();
        await page.locator(LEVEL).waitFor({ timeout: 2000 });
        const off = await at(page, 2700);
        assert.ok(off.coversScreen, 'the moment covers the screen though its card is half off');
        assert.ok(off.chipMiddle > off.screenHeight * .2 && off.chipMiddle < off.screenHeight * .6, `its chip is on the screen (${off.chipMiddle} of ${off.screenHeight} px)`);
        assert.equal(off.finalOpacity, 1, 'and its words show');
        assert.equal(off.scrollTop, before.scrollTop, 'the page under it has not moved');
        await page.waitForTimeout(1700);
        assert.equal(await gone(page), true, 'gone after 4.2 s');
        const after = await page.evaluate(() => (document.querySelector('#scroller') as HTMLElement).scrollTop);
        assert.equal(after, before.scrollTop, 'back where he was: the page did not move');
        await page.close();
        page = await openTechLab(browser, desk, 375, kids.id);
        await page.locator(`#scroller button:has-text("Unlock ${kids.name}")`).last().click();
        await page.locator(LEVEL).waitFor({ timeout: 2000 });
        await at(page, 600);
        await page.mouse.click(187, 120);
        await page.waitForTimeout(120);
        assert.equal(await gone(page), true, 'a tap skips it');
        await page.close();
        console.log(`PASS on screen (#87): the card's picture cut by the screen's top (it starts at ${before.previewTop} px, scrolled ${before.scrollTop} px), the moment covers the screen, its chip at ${off.chipMiddle} of ${off.screenHeight} px, the page still at ${after} px after; a tap skips it`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
