/** No dead upgrades, #85 (codex-handoff/plans/platform-tech-plan.md §13 Phase 6, 2026-10-30; Zeesh: "koi upgrade bekaar na
 *  ho to saara jo version up hai wo kuch asar daale, theek hai, jo dikhe"). Checks:
 *  - an older step keeps a job: in each group whose best main step counts, a version past 1 of a main step below the best
 *    still adds STREAMING_TECH_OLDER_VERSION: Picture, HDR, Colour and Sound +1 Playback Quality; Optimisation −1.5% load
 *    and bandwidth bill, +1 Delivery; Stabilization +0.5 debt paid a week, +1 Reliability; Apps +1 Product Experience;
 *    Trust and safety −2% leak risk, +1 Security; Smart AI +0.5% finding something, +1 Recommendations; Ads +1 Commerce;
 *    an older step at version 1 adds nothing (a tree that never raised one works as before);
 *  - every version shows what it adds: on the test company, and on a tree with all 76 techs at version 1, every owned step
 *    below version 3 has at least one line saying what its next version does (none adds nothing);
 *  - the Tech tab (headless Chromium, scripts/tech-lab): every owned step in every group opens with its facts and a way
 *    to raise it (energy, the pay button, or version 3 reached), and no step says "Raise … instead".
 *  Needs Playwright (PLAYWRIGHT_MODULE, or the Codex runtime's copy). TECH_LAB_DESK=<file> caches the desk. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingTechTreeState, type Player, type StreamingTechGroupId, type StreamingTechId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingTechDesk, type StreamingTechDeskStep } from '../services/streamingTechDesk';
import {
    STREAMING_TECH_DEFINITIONS, STREAMING_TECH_OLDER_VERSION, deriveStreamingTechEngineLevel, deriveStreamingTechPlaybackLevel,
    getStreamingTechGroupLadder, resolveStreamingTechTree, streamingTechCostFactor, streamingTechDebtPaydown, streamingTechLeakFactor,
    streamingTechLoadFactor, streamingTechOlderVersions, streamingTechSmartAiEffects,
} from '../services/streamingTechTreeCatalogue';
import { chromium, openTechLab, techLabDesk } from './tech-lab/lab';

const close = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withTree = (player: Player, techTree: OwnedStreamingTechTreeState): Player => ({
    ...player, ownedStreamingPlatform: { ...platformOf(player), techTree } as Player['ownedStreamingPlatform'],
});
const at = (tree: OwnedStreamingTechTreeState, id: StreamingTechId, version: 1 | 2 | 3): OwnedStreamingTechTreeState => ({
    ...tree, techs: { ...tree.techs, [id]: { ...(tree.techs[id] || { unlockedAtAbsoluteWeek: 1, versionReachedAtAbsoluteWeek: 1 }), version, progress: 0 } },
});
/** a tree owning the first two main steps of a group at version 1 (the first is then the older one) */
const twoSteps = (base: OwnedStreamingTechTreeState, group: StreamingTechGroupId) => {
    const ladder = getStreamingTechGroupLadder(group).filter(item => !item.sideLine);
    let tree: OwnedStreamingTechTreeState = { ...base, techs: { ...base.techs } };
    ladder.forEach(item => { delete tree.techs[item.id as StreamingTechId]; });
    tree = at(at(tree, ladder[0].id as StreamingTechId, 1), ladder[1].id as StreamingTechId, 1);
    return { tree, older: ladder[0].id as StreamingTechId, best: ladder[1].id as StreamingTechId };
};
/** what a step shows its next version adds */
const says = (step: StreamingTechDeskStep): string[] => {
    const lines = [...step.more];
    const effect = step.effect;
    if (effect && JSON.stringify(effect.now) !== JSON.stringify(effect.next)) lines.push(`${effect.kind} ${JSON.stringify(effect.now)} → ${JSON.stringify(effect.next)}`);
    return lines;
};

(async () => {
    const started = performance.now();
    const fresh = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'no-dead-versions', name: 'No Dead Versions', age: 15, currentWeek: 1 });
    const company = await buildStreamingFullPlatformQa(
        { ...fresh, energy: { current: 100, max: 100 }, flags: { ...fresh.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } },
        { processWeek: processGameWeek, persistWeek: async next => next },
    );
    const base = resolveStreamingTechTree(platformOf(company));

    /* ── an older step keeps a job ── */
    const jobs: string[] = [];
    for (const group of ['PICTURE', 'HDR', 'COLOUR', 'SOUND'] as StreamingTechGroupId[]) {
        const { tree, older } = twoSteps(base, group);
        assert.equal(streamingTechOlderVersions(tree, group), 0, `${group}: an older step at version 1 adds nothing`);
        const raised = at(tree, older, 3);
        assert.equal(streamingTechOlderVersions(raised, group), 2, `${group}: an older step at version 3 has two versions past 1`);
        const now = deriveStreamingTechPlaybackLevel(tree);
        const next = deriveStreamingTechPlaybackLevel(raised);
        assert.equal(next - now, Math.min(2 * STREAMING_TECH_OLDER_VERSION.playbackPoints, 100 - now), `${group}: +1 Playback Quality a version (${now} → ${next})`);
        jobs.push(`${group} ${now} → ${next} Playback`);
    }
    {
        const { tree, older } = twoSteps(base, 'OPTIMISATION');
        const raised = at(tree, older, 2);
        assert.ok(close(streamingTechLoadFactor(raised), streamingTechLoadFactor(tree) * (1 - STREAMING_TECH_OLDER_VERSION.loadCut)), 'Optimisation: −1.5% load');
        assert.ok(close(streamingTechCostFactor(raised), streamingTechCostFactor(tree) * (1 - STREAMING_TECH_OLDER_VERSION.loadCut)), 'and −1.5% bandwidth bill');
        assert.equal(deriveStreamingTechEngineLevel(raised, 'DELIVERY_CAPACITY') - deriveStreamingTechEngineLevel(tree, 'DELIVERY_CAPACITY'), 1, 'and +1 Delivery');
        jobs.push(`OPTIMISATION load ×${(streamingTechLoadFactor(raised) / streamingTechLoadFactor(tree)).toFixed(3)}, Delivery +1`);
    }
    {
        const { tree, older } = twoSteps(base, 'STABILIZATION');
        const raised = at(tree, older, 2);
        assert.ok(close(streamingTechDebtPaydown(raised) - streamingTechDebtPaydown(tree), STREAMING_TECH_OLDER_VERSION.paydown), 'Stabilization: +0.5 debt paid a week');
        assert.equal(deriveStreamingTechEngineLevel(raised, 'RELIABILITY') - deriveStreamingTechEngineLevel(tree, 'RELIABILITY'), 1, 'and +1 Reliability');
        jobs.push(`STABILIZATION paydown +${streamingTechDebtPaydown(raised) - streamingTechDebtPaydown(tree)}, Reliability +1`);
    }
    for (const [group, branch] of [['APPS', 'PRODUCT_EXPERIENCE'], ['TRUST', 'SECURITY'], ['SMART_AI', 'DATA_RECOMMENDATIONS'], ['ADS', 'ADVERTISING_COMMERCE']] as const) {
        const { tree, older } = twoSteps(base, group);
        const raised = at(tree, older, 2);
        assert.equal(deriveStreamingTechEngineLevel(raised, branch) - deriveStreamingTechEngineLevel(tree, branch), 1, `${group}: +1 ${branch}`);
        if (group === 'TRUST') assert.ok(close(streamingTechLeakFactor(raised), streamingTechLeakFactor(tree) * (1 - STREAMING_TECH_OLDER_VERSION.leakCut)), 'Trust: −2% leak risk');
        if (group === 'SMART_AI') assert.ok(close(streamingTechSmartAiEffects(raised).engagementLift - streamingTechSmartAiEffects(tree).engagementLift, STREAMING_TECH_OLDER_VERSION.aiLift, 1e-6), 'Smart AI: +0.5% finding something');
        jobs.push(`${group} ${branch} +1${group === 'TRUST' ? ', leak −2%' : group === 'SMART_AI' ? ', +0.5% find something' : ''}`);
    }
    console.log(`PASS jobs: an older step's version past 1 still adds: ${jobs.join('; ')}; at version 1 it adds nothing`);

    /* ── every version shows what it adds ── */
    const allAtOne: OwnedStreamingTechTreeState = {
        ...base,
        techs: Object.fromEntries(STREAMING_TECH_DEFINITIONS.map(item => [item.id, { version: 1, progress: 0, unlockedAtAbsoluteWeek: 1, versionReachedAtAbsoluteWeek: 1 }])),
    };
    const allAtTwo: OwnedStreamingTechTreeState = {
        ...allAtOne,
        techs: Object.fromEntries(Object.entries(allAtOne.techs).map(([id, item]) => [id, { ...item!, version: 2 }])),
    };
    const counted: string[] = [];
    const deadAll: string[] = [];
    /* a new service: the starters alone, each the best of its group */
    const starters: OwnedStreamingTechTreeState = {
        ...base,
        techs: Object.fromEntries(STREAMING_TECH_DEFINITIONS.filter(item => item.starter).map(item => [item.id, { version: 1, progress: 0, unlockedAtAbsoluteWeek: 1, versionReachedAtAbsoluteWeek: 1 }])),
    };
    const startersAtTwo: OwnedStreamingTechTreeState = {
        ...starters,
        techs: Object.fromEntries(Object.entries(starters.techs).map(([id, item]) => [id, { ...item!, version: 2 }])),
    };
    for (const [name, player] of [['the test company', company], ['every tech at version 1', withTree(company, allAtOne)], ['every tech at version 2', withTree(company, allAtTwo)],
        ['the starters at version 1', withTree(company, starters)], ['the starters at version 2', withTree(company, startersAtTwo)]] as const) {
        const desk = getStreamingTechDesk(player);
        const raisable = desk.groups.flatMap(group => group.steps).filter(step => step.state === 'OWNED' && step.nextVersion);
        const dead = raisable.filter(step => says(step).length === 0).map(step => `${step.group}:${step.name} v${step.nextVersion}`);
        deadAll.push(...dead.map(item => `${name} → ${item}`));
        counted.push(`${name}: ${raisable.length} raisable steps, every next version says what it adds`);
    }
    assert.deepEqual(deadAll, [], 'versions that show no effect');
    const older = getStreamingTechDesk(withTree(company, at(at(allAtOne, 'OPT_AV1' as StreamingTechId, 1), 'OPT_HEVC' as StreamingTechId, 1))).groups
        .flatMap(group => group.steps).find(step => step.id === 'OPT_HEVC');
    console.log(`PASS shown: ${counted.join('; ')}${older ? ` (e.g. ${older.name}: "${older.more.join('" · "')}")` : ''}`);

    /* ── the Tech tab ── */
    const desk = await techLabDesk(process.env.TECH_LAB_DESK);
    const browser = await chromium.launch({ headless: true });
    try {
        const page = await openTechLab(browser, desk, 375);
        let opened = 0;
        for (const group of desk.groups) {
            await page.locator(`#scroller button[aria-label^="${group.name}:"]`).click();
            await page.locator('button[aria-label="Back to all tech"]').waitFor();
            for (const step of group.steps.filter(item => item.state === 'OWNED')) {
                await page.locator(`#scroller [class*="rungs"] button[aria-label^="${step.name}:"]`).first().click();
                const action = await page.evaluate(() => {
                    const box = document.querySelector('#scroller [class*="action"]');
                    return {
                        text: box?.textContent || '',
                        raise: Boolean(box?.querySelector('[class*="energyRow"]') || [...(box?.querySelectorAll('button') || [])].some(button => /to complete version|in the treasury/.test(button.textContent || ''))
                            || /Version 3 reached|as good as it gets/.test(box?.textContent || '')),
                        facts: box?.querySelectorAll('[class*="facts"] li[class*="feeds"]').length ?? 0,
                    };
                });
                assert.ok(!/ instead/.test(action.text), `${group.name} · ${step.name} still says "… instead": ${action.text.slice(0, 120)}`);
                assert.ok(action.raise, `${group.name} · ${step.name} has no way to raise it`);
                if (step.nextVersion) assert.ok(action.facts > 0, `${group.name} · ${step.name}: its next version shows no effect`);
                opened += 1;
            }
            await page.locator('button[aria-label="Back to all tech"]').click();
        }
        await page.close();
        console.log(`PASS tab: ${opened} owned steps in ${desk.groups.length} groups open with their facts and a way to raise them; none says "Raise … instead"`);
    } finally {
        await browser.close();
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
})().catch(error => { console.error(error); process.exit(1); });
