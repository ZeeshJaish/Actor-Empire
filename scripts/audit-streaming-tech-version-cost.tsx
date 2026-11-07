/** A tech version costs treasury money as well as energy, paid to complete it, #84 (codex-handoff/plans/platform-tech-plan.md
 *  §13 Phase 6, 2026-10-30; Zeesh: "version badhate ho sirf energy maangta hai to wo paisa bhi maangna chahiye", then
 *  "jab poora energy fill ho jaaye to hamein ... 'pay 126 million to complete this level' ... ensure karna ki hamare account
 *  mein paisa hai utna"). Checks:
 *  - the price: 40% of the step's unlock price for version 2, 70% for version 3; a starter (free to unlock) $1M and $2M;
 *  - energy never needs money: presses fill the bar, a full bar is `ready` and the version is NOT reached; more energy into
 *    a full bar is refused (ENERGY_FULL);
 *  - paying completes it: refused before the bar is full (ENERGY_NOT_FULL) and while the treasury is short
 *    (INSUFFICIENT_TREASURY), changing nothing; paid, the treasury is down by the price, a PAID commitment, the ledger's
 *    capitalCost, the version reached;
 *  - the Tech tab's data: each step's next price, whether the treasury covers it, and whether its bar is full;
 *  - the Tech tab (headless Chromium, scripts/tech-lab): the price beside the energy ("Fill its energy, then pay …"); a full
 *    bar shows "Pay $X to complete version N", which pays and plays the moment; short of money it reads "Needs $X in the
 *    treasury" and takes no tap; energy presses never wait for money.
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type StreamingTechId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { completeStreamingTechVersion, contributeStreamingTechEnergy } from '../services/streamingTechTree';
import { getStreamingTechDefinition, resolveStreamingTechTree, streamingTechVersionCost } from '../services/streamingTechTreeCatalogue';
import { chromium, openTechLab } from './tech-lab/lab';

/** as the Tech tab writes it */
const money = (value: number): string => {
    const trim = (n: number) => String(+n.toFixed(1));
    if (value >= 1e9) return `$${trim(value / 1e9)}B`;
    if (value >= 1e6) return `$${trim(value / 1e6)}M`;
    if (value >= 1e3) return `$${Math.round(value / 1e3)}K`;
    return `$${Math.round(value)}`;
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withEnergy = (player: Player, energy: number): Player => ({
    ...player, energy: { current: energy, max: Math.max(100, energy) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: energy, bonusEnergyBank: 0 },
});
const withTreasury = (player: Player, cash: number): Player => ({
    ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: cash } as Player['ownedStreamingPlatform'],
});
const progressOf = (player: Player, id: StreamingTechId) => resolveStreamingTechTree(platformOf(player)).techs[id];

(async () => {
    const started = performance.now();

    /* ── the price ── */
    const price = (id: StreamingTechId, version: 2 | 3) => streamingTechVersionCost(getStreamingTechDefinition(id)!, version);
    assert.deepEqual([price('PICTURE_4K', 2), price('PICTURE_4K', 3)], [10_000_000, 17_500_000], '4K ($25M): 40% and 70%');
    assert.deepEqual([price('PICTURE_720P', 2), price('PICTURE_720P', 3)], [800_000, 1_400_000], '720p ($2M)');
    assert.deepEqual([price('PICTURE_480P', 2), price('PICTURE_480P', 3)], [1_000_000, 2_000_000], 'a starter: $1M and $2M');
    assert.equal(streamingTechVersionCost(getStreamingTechDefinition('PICTURE_4K')!, 1), 0, 'version 1 is the unlock');
    console.log(`PASS price: 4K ${money(price('PICTURE_4K', 2))} / ${money(price('PICTURE_4K', 3))}, 720p ${money(price('PICTURE_720P', 2))} / ${money(price('PICTURE_720P', 3))}, a starter $1M / $2M`);

    /* ── energy, then paying, on the developer test company ── */
    const fresh = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'version-cost', name: 'Version Cost', age: 15, currentWeek: 1 });
    const company = await buildStreamingFullPlatformQa(
        { ...fresh, energy: { current: 100, max: 100 }, flags: { ...fresh.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } },
        { processWeek: processGameWeek, persistWeek: async next => next },
    );
    const desk = getStreamingTechDesk(company);
    const target = desk.groups.flatMap(group => group.steps).find(step => step.state === 'OWNED' && step.nextVersion && step.nextEnergy && step.unlockCost > 0 && !step.ready)!;
    assert.ok(target, 'the test company owns a bought step below version 3');
    const cost = streamingTechVersionCost(getStreamingTechDefinition(target.id)!, target.nextVersion!);
    assert.deepEqual([target.nextCost, target.nextAffordable, target.ready], [cost, platformOf(company).treasuryCash >= cost, false], 'the desk: its price, the treasury covers it, the bar not full');

    let player = withEnergy(company, 2_000);
    const before = platformOf(player).treasuryCash;
    const press = contributeStreamingTechEnergy(player, target.id, 5);
    assert.deepEqual([press.changed, press.ready, press.completed], [true, false, undefined], 'a press fills, and reaches nothing');
    const fill = contributeStreamingTechEnergy(press.player, target.id, 'FILL');
    assert.deepEqual([fill.changed, fill.ready, fill.completed], [true, true, undefined], 'FILL fills the bar; the version waits for its price');
    player = fill.player;
    assert.deepEqual([progressOf(player, target.id)?.version, progressOf(player, target.id)?.progress], [target.version, target.nextEnergy], 'still the old version, the bar full');
    assert.equal(platformOf(player).treasuryCash, before, 'energy costs no money');
    const fullDesk = getStreamingTechDesk(player).groups.flatMap(group => group.steps).find(step => step.id === target.id)!;
    assert.equal(fullDesk.ready, true, 'the desk shows the full bar');
    const more = contributeStreamingTechEnergy(player, target.id, 5);
    assert.deepEqual([more.changed, more.reason, more.player === player], [false, 'ENERGY_FULL', true], 'no more energy into a full bar');
    console.log(`PASS energy: ${target.name} version ${target.nextVersion}: presses fill the bar (${target.nextEnergy}⚡), no money taken, the version waits; more energy refused (ENERGY_FULL)`);

    /* ── paying: refused before full, refused short, then paid ── */
    const early = completeStreamingTechVersion(press.player, target.id);
    assert.deepEqual([early.changed, early.reason, early.player === press.player], [false, 'ENERGY_NOT_FULL', true], 'paying before the bar is full is refused');
    const short = withTreasury(player, cost - 1);
    const refused = completeStreamingTechVersion(short, target.id);
    assert.deepEqual([refused.changed, refused.reason, refused.player === short], [false, 'INSUFFICIENT_TREASURY', true], 'paying with less than the price is refused, nothing changes');
    assert.equal(getStreamingTechDesk(short).groups.flatMap(group => group.steps).find(step => step.id === target.id)!.nextAffordable, false, 'the desk says the treasury cannot cover it');
    const paid = completeStreamingTechVersion(player, target.id);
    assert.deepEqual(paid.completed, { techId: target.id, version: target.nextVersion }, 'paid: the version is reached');
    const after = platformOf(paid.player);
    assert.equal(after.treasuryCash, before - cost, `the treasury pays ${money(cost)}`);
    assert.deepEqual([progressOf(paid.player, target.id)?.version, progressOf(paid.player, target.id)?.progress], [target.nextVersion, 0], 'the next bar starts empty');
    const key = `streaming-tech-version:${target.id.toLowerCase()}:${target.nextVersion}`;
    const commitment = after.costCommitments.find(item => item.idempotencyKey === key);
    assert.ok(commitment && commitment.status === 'PAID' && commitment.paidAmount === cost && commitment.category === 'TECHNOLOGY', 'a PAID technology commitment');
    assert.equal(after.eventLedger.find(item => item.idempotencyKey === key)?.metadata?.capitalCost, cost, 'the ledger records the price');
    console.log(`PASS pay: refused before the bar is full (ENERGY_NOT_FULL) and ${money(cost - 1)} short of ${money(cost)} (INSUFFICIENT_TREASURY), nothing changed; paid: ${money(cost)} from the treasury, a PAID commitment, the ledger's capitalCost, version ${target.nextVersion}`);

    /* ── the Tech tab ── */
    const browser = await chromium.launch({ headless: true });
    try {
        const deskJson = JSON.parse(JSON.stringify(desk));
        let page = await openTechLab(browser, deskJson, 375, target.id);
        const line = await page.evaluate(() => ({
            cost: document.querySelector('#scroller [class*="versionCost"]')?.textContent ?? null,
            then: document.querySelector('#scroller [class*="paidAt"]')?.textContent ?? null,
        }));
        assert.equal(line.cost?.replace(/\s+/g, ' ').trim(), `+ ${money(cost)}`, `the price beside the energy (${line.cost})`);
        assert.ok(line.then?.includes(`then pay ${money(cost)} to complete version ${target.nextVersion}`), `fill, then pay (${line.then})`);
        const pay = page.locator(`#scroller button:has-text("Pay ${money(cost)} to complete version ${target.nextVersion}")`);
        const fillButton = page.locator('#scroller button[aria-label^="Fill "]');
        if (await fillButton.count()) await fillButton.click();
        else for (let tap = 0; tap < 40 && !(await pay.count()); tap += 1) await page.locator('#scroller button[aria-label^="Add "]').click();
        await pay.waitFor({ timeout: 2000 });
        /* the moment plays on its layer over the whole screen (#87) */
        const before = await page.evaluate(() => Boolean(document.querySelector('[class*="momentLayer"] > [class*="levelup"]')));
        assert.equal(before, false, 'a full bar plays no moment until it is paid');
        await pay.click();
        await page.locator('[class*="momentLayer"] > [class*="levelup"]').waitFor({ timeout: 2000 });
        const log = await page.evaluate(() => (window as unknown as { __TECH_LAB_LOG__: string[] }).__TECH_LAB_LOG__);
        assert.ok(log.some(row => row === `pay ${target.id}`), 'paying tells the game');
        assert.ok(log.findIndex(row => row.startsWith(`energy ${target.id}`)) < log.findIndex(row => row === `pay ${target.id}`), 'the energy goes first');
        await page.close();

        const shortDesk = JSON.parse(JSON.stringify(desk));
        shortDesk.groups.forEach((group: { steps: Array<{ id: string; nextAffordable: boolean; progress: number; nextEnergy: number; ready: boolean }> }) => group.steps.forEach(step => {
            if (step.id === target.id) { step.nextAffordable = false; step.progress = step.nextEnergy; step.ready = true; }
        }));
        page = await openTechLab(browser, shortDesk, 375, target.id);
        const blocked = await page.evaluate(() => {
            const button = [...document.querySelectorAll('#scroller button')].find(item => /in the treasury/.test(item.textContent || '')) as HTMLButtonElement | undefined;
            return { text: button?.textContent ?? null, disabled: button?.disabled ?? null };
        });
        assert.ok(blocked.text?.startsWith(`Needs ${money(cost)} in the treasury`), `short of money (${blocked.text})`);
        assert.equal(blocked.disabled, true, 'it takes no tap');
        await page.close();

        const pressDesk = JSON.parse(JSON.stringify(desk));
        pressDesk.groups.forEach((group: { steps: Array<{ id: string; nextAffordable: boolean }> }) => group.steps.forEach(step => { if (step.id === target.id) step.nextAffordable = false; }));
        page = await openTechLab(browser, pressDesk, 375, target.id);
        const plus = await page.evaluate(() => (document.querySelector('#scroller button[aria-label^="Add "]') as HTMLButtonElement | null)?.disabled ?? null);
        assert.equal(plus, false, 'energy presses never wait for money');
        await page.close();
        console.log(`PASS tab: "+ ${money(cost)}" beside the energy and "${line.then?.trim()}"; a full bar shows "Pay ${money(cost)} to complete version ${target.nextVersion}", no moment until paid, then the energy and the payment reach the game and the moment plays; short: "${blocked.text?.trim()}", off; presses never wait for money`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
