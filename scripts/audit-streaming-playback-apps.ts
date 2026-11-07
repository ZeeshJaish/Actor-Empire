/** Playback and Apps and devices in the tech tree, Phase 3 #52 (codex-handoff/plans/platform-tech-plan.md
 *  §4.1 rows 6 and 7: "Fast start, No buffering (adaptive streaming), Downloads, Skip intro and recap,
 *  Continue anywhere, Low-latency streaming, Subtitles and audio description — playback success,
 *  churn, Habit appeal; Downloads is a plan feature" and "Phone apps (start) → Smart TV apps →
 *  Consoles → Car screens✦ → VR and holo screens✦"; §4.3: Product Experience from Playback and Apps).
 *  Checks:
 *  - the catalogue: both groups, their ladders, starters, futuristic steps, prices;
 *  - old saves: a pre-tree save and a schema-2 tree are given Downloads (Product Experience 25) and
 *    the Apps steps their level reaches, once, with no upkeep; Playback's main steps never;
 *  - the bridge: Product Experience from Playback's side lines and the best Apps step, never lowered;
 *  - Downloads: the plan feature needs Playback's Downloads (it needed Product Experience 25);
 *  - Playback's boost to playback success and No buffering's share of an overload, and one real
 *    overloaded week on the test company with and without them;
 *  - the Tech tab's view: the groups, their colours, Downloads feeding the plan feature, the effects. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type OwnedStreamingProductLine, type OwnedStreamingTechTreeState, type Player } from '../types';
import { STREAMING_PRODUCT_DEFINITIONS, completeDueStreamingProductDevelopments } from '../services/streamingProductSuite';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    STREAMING_TECH_TREE_SCHEMA, applyStreamingTechBridge, convertStreamingTechTreeFromLevels, deriveStreamingTechEngineLevel,
    getStreamingTechGroupLadder, normalizeStreamingTechTreeState, resolveRivalStreamingTechTree, streamingTechDownloadsAllowed,
    streamingTechOverloadFactor, streamingTechPlaybackBoost,
} from '../services/streamingTechTreeCatalogue';
import { streamingPlanOfferLocks } from '../services/streamingPlanOffer';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { getStreamingTechDesk } from '../services/streamingTechDesk';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Playback Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const owned = (tree: OwnedStreamingTechTreeState) => Object.keys(tree.techs).sort();
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const playback = getStreamingTechGroupLadder('PLAYBACK');
    const apps = getStreamingTechGroupLadder('APPS');
    assert.deepEqual(playback.map(item => `${item.id}${item.sideLine ? '*' : ''}`), [
        'PLAY_FAST_START', 'PLAY_ADAPTIVE', 'PLAY_LOW_LATENCY', 'PLAY_DOWNLOADS*', 'PLAY_SKIP_INTRO*', 'PLAY_CONTINUE*', 'PLAY_ACCESSIBILITY*',
    ], 'Playback: Fast start → No buffering → Low-latency, then four side lines');
    assert.ok(playback.every(item => !item.starter), 'Playback has no starter: a new service has a standard player');
    assert.deepEqual(apps.map(item => [item.id, Boolean(item.starter), Boolean(item.futuristic)]), [
        ['APPS_PHONE', true, false], ['APPS_TV', false, false], ['APPS_CONSOLE', false, false], ['APPS_CAR', false, true], ['APPS_HOLO', false, true],
    ], 'Apps: phone and web from the start, Smart TV, Consoles, then Car screens ✦ and VR and holo ✦');
    assert.equal(STREAMING_TECH_TREE_SCHEMA, 8, 'Schema 8 since Ads tech (#61)');
    console.log(`PASS catalogue: Playback ${playback.map(item => item.name).join(', ')}; Apps ${apps.map(item => item.name).join(' → ')}`);

    /* ── old saves ── */
    const preTree = convertStreamingTechTreeFromLevels({ PLAYBACK_QUALITY: 58, DELIVERY_CAPACITY: 45, RELIABILITY: 42, PRODUCT_EXPERIENCE: 58 });
    assert.ok(['PLAY_DOWNLOADS', 'APPS_PHONE', 'APPS_TV', 'APPS_CONSOLE'].every(id => preTree.techs[id as never]),
        'Product Experience 58: Downloads (25), then the Apps steps that fit in the 33 left (Smart TV 15, Consoles 30)');
    assert.ok(!preTree.techs.PLAY_FAST_START && !preTree.techs.PLAY_ADAPTIVE && !preTree.techs.APPS_CAR, 'Never Playback\'s main steps, never a futuristic step');
    assert.deepEqual([preTree.techs.PLAY_DOWNLOADS!.granted, preTree.techs.APPS_TV!.granted], [true, true], 'Given: no upkeep');
    [20, 25, 30, 40, 55, 58, 90].forEach(level => {
        const given = convertStreamingTechTreeFromLevels({ PRODUCT_EXPERIENCE: level });
        assert.ok(deriveStreamingTechEngineLevel(given, 'PRODUCT_EXPERIENCE') <= level, `Product Experience ${level}: what is given never stands for more`);
    });
    assert.deepEqual(Object.keys(convertStreamingTechTreeFromLevels({ PRODUCT_EXPERIENCE: 30 }).techs).filter(id => /^(PLAY|APPS)_/.test(id)).sort(), ['APPS_PHONE', 'PLAY_DOWNLOADS'],
        'Product Experience 30 (the test company): Downloads, and no Apps step in the 5 left');
    const schemaTwo = { schemaVersion: 2, convertedFromLegacy: false, techs: Object.fromEntries(Object.entries(preTree.techs).filter(([id]) => !/^(PLAY|APPS)_/.test(id))) };
    const joined = normalizeStreamingTechTreeState(schemaTwo, { PRODUCT_EXPERIENCE: 20 });
    assert.deepEqual([joined.schemaVersion, Boolean(joined.techs.APPS_TV), Boolean(joined.techs.PLAY_DOWNLOADS), Boolean(joined.techs.APPS_PHONE)], [8, true, false, true],
        'A schema-2 tree at Product Experience 20: Smart TV (15) and the phone app, no Downloads (25)');
    const again = normalizeStreamingTechTreeState({ ...joined, techs: Object.fromEntries(Object.entries(joined.techs).filter(([id]) => id !== 'APPS_TV')) }, { PRODUCT_EXPERIENCE: 60 });
    assert.equal(Boolean(again.techs.APPS_TV), false, 'Once: a schema-3 tree is never given them again');
    assert.deepEqual(owned(normalizeStreamingTechTreeState(joined, { PRODUCT_EXPERIENCE: 20 })), owned(joined), 'Normalising is idempotent');
    const rival = resolveRivalStreamingTechTree(90, 40);
    assert.deepEqual(owned(rival).filter(id => /^(PLAY|APPS)_/.test(id)), ['APPS_PHONE'], 'Rivals: the phone app only (their plans keep downloads: rival features are not tech-gated for it)');
    console.log('PASS old saves: Product Experience 58 gives Downloads, Smart TV and Consoles as given steps (30 gives Downloads alone); what is given never stands for more than the level; a schema-2 tree joins once; rivals keep the phone app');

    /* ── the bridge ── */
    const tree = withTechs(normalizeStreamingTechTreeState(undefined, {}), [['PLAY_DOWNLOADS', 1], ['PLAY_CONTINUE', 2], ['APPS_TV', 1], ['APPS_CONSOLE', 1]]);
    assert.equal(deriveStreamingTechEngineLevel(tree, 'PRODUCT_EXPERIENCE'), 25 + 6 + 30, 'Downloads 25 + Continue anywhere v2 6 + the best Apps step (Consoles 30)');
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 0, DATA_RECOMMENDATIONS: 0, SECURITY: 0, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 0, PRODUCT_EXPERIENCE: 20 };
    assert.equal(applyStreamingTechBridge(levels, tree).PRODUCT_EXPERIENCE, 61, 'Raised to what the tree stands for');
    assert.equal(applyStreamingTechBridge({ ...levels, PRODUCT_EXPERIENCE: 80 }, tree).PRODUCT_EXPERIENCE, 80, 'Never lowered');
    assert.equal(applyStreamingTechBridge(levels, tree).RELIABILITY, 0, 'Playback carries no Reliability points: screens stay with Stabilization');
    console.log('PASS bridge: Product Experience 61 from Downloads, Continue anywhere and Consoles; never lowered; no Reliability');

    /* ── Downloads ── */
    const offer = { picture: 'PICTURE_480P' as const, hdr: null, colour: 'COLOUR_8BIT' as const, sound: 'SOUND_STEREO' as const, dialogue: false, screens: 1 as const, downloads: true };
    const bare = normalizeStreamingTechTreeState(undefined, {});
    assert.deepEqual(streamingPlanOfferLocks(offer, bare, { ...levels, PRODUCT_EXPERIENCE: 60 }).map(lock => [lock.row, lock.needs, lock.techId]),
        [['downloads', 'Unlock Downloads in Tech', 'PLAY_DOWNLOADS']], 'Downloads need the tech, whatever the level (Go to Tech opens it)');
    assert.deepEqual(streamingPlanOfferLocks(offer, withTechs(bare, [['PLAY_DOWNLOADS', 1]]), levels), [], 'With it, offered');
    assert.deepEqual([streamingTechDownloadsAllowed(bare), streamingTechDownloadsAllowed(preTree)], [false, true]);
    console.log('PASS downloads: locked without Playback\'s Downloads ("Unlock Downloads in Tech"), offered with it; old saves at level 25 keep it');

    /* ── Playback's boost and No buffering ── */
    assert.equal(streamingTechPlaybackBoost(bare), 0, 'A standard player adds nothing');
    assert.equal(streamingTechPlaybackBoost(withTechs(bare, [['PLAY_FAST_START', 1]])), .15);
    assert.equal(streamingTechPlaybackBoost(withTechs(bare, [['PLAY_FAST_START', 1], ['PLAY_ADAPTIVE', 2], ['PLAY_LOW_LATENCY', 3]])), .15 + .4 + .2);
    assert.equal(streamingTechOverloadFactor(withTechs(bare, [['PLAY_ADAPTIVE', 1]])), .8, 'No buffering leaves 80% of an overload\'s harm');
    assert.equal(+streamingTechOverloadFactor(withTechs(bare, [['PLAY_ADAPTIVE', 3], ['STAB_LOAD_TESTING', 1]])).toFixed(4), +(0.6 * .85).toFixed(4), 'with Load testing, both');

    const qa = await buildStreamingFullPlatformQa(fresh('playback-apps-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    /* a week under heavy tech debt (40), so playback runs below its 99.98% ceiling and a boost shows */
    const strained = (techs: Array<[string, number]>): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            infrastructureSetup: base.infrastructureSetup ? { ...base.infrastructureSetup, technicalDebt: 40 } : base.infrastructureSetup,
            techTree: withTechs(base.techTree!, techs),
        } as OwnedStreamingPlatformState, qa.id),
    });
    const weekOf = async (player: Player) => normalizeOwnedStreamingPlatformState((await processGameWeek(player)).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!.operations!;
    const plain = await weekOf(strained([]));
    const tuned = await weekOf(strained([['PLAY_FAST_START', 1], ['PLAY_ADAPTIVE', 1]]));
    assert.ok(plain.playbackSuccessRate < 99.5, `Below the ceiling: ${plain.playbackSuccessRate}%`);
    assert.ok(Math.abs(tuned.playbackSuccessRate - plain.playbackSuccessRate - .45) < .02,
        `Playback success: ${plain.playbackSuccessRate}% with a standard player, ${tuned.playbackSuccessRate}% with Fast start and No buffering (+0.15 + 0.30)`);
    console.log(`PASS playback: +0.15 Fast start, +0.30–0.50 No buffering, +0.10–0.20 Low-latency; No buffering leaves 80–60% of an overload's harm; a week under tech debt 40: playback ${plain.playbackSuccessRate}% → ${tuned.playbackSuccessRate}%`);

    /* ── a Product Lab launch: Product Experience 25 used to open Downloads, so a launch that lifts the
       level to 25 or more gives Playback's Downloads (only it); one under 25 gives nothing ── */
    const launchOf = (lineId: 'LIVE' | 'KIDS') => {
        const definition = STREAMING_PRODUCT_DEFINITIONS.find(item => item.id === lineId)!;
        const week = base.lastProcessedAbsoluteWeek ?? 0;
        const tree = { ...base.techTree!, techs: Object.fromEntries(Object.entries(base.techTree!.techs).filter(([id]) => !/^(PLAY|APPS)_/.test(id) || id === 'APPS_PHONE')) } as OwnedStreamingTechTreeState;
        const line: OwnedStreamingProductLine = {
            id: `audit-${lineId}`, idempotencyKey: `audit-${lineId}`, lineId, title: definition.title, status: 'UNDER_DEVELOPMENT', launchMode: 'BALANCED',
            capitalCost: 0, weeklyOperatingCost: 0, staffRequired: 0, peakLoadPercent: 0, developmentWeeks: 1, benefit: definition.benefit,
            risk: definition.risk, riskNote: definition.riskNote, strategicConsequence: '', startedAtAbsoluteWeek: week - 1, readyAtAbsoluteWeek: week,
            launchedAtAbsoluteWeek: null, lastStatusChangedAtAbsoluteWeek: week - 1,
        };
        return completeDueStreamingProductDevelopments({ ...base, technologyLevels: { ...base.technologyLevels, PRODUCT_EXPERIENCE: 10 }, techTree: tree, productLines: [line] }, week).platform;
    };
    const live = launchOf('LIVE');
    const kids = launchOf('KIDS');
    assert.deepEqual([live.technologyLevels.PRODUCT_EXPERIENCE, streamingTechDownloadsAllowed(live.techTree), live.techTree!.techs.PLAY_DOWNLOADS?.granted, Boolean(live.techTree!.techs.APPS_TV)],
        [30, true, true, false], 'EMPIRE+ Live lifts Product Experience to 30: Downloads given (no upkeep), no Apps step');
    assert.deepEqual([kids.technologyLevels.PRODUCT_EXPERIENCE, streamingTechDownloadsAllowed(kids.techTree), Boolean(kids.techTree!.techs.APPS_TV)],
        [15, false, false], 'EMPIRE+ Kids lifts it to 15: nothing given');
    console.log('PASS product lab: EMPIRE+ Live (Product Experience 30) gives Downloads, as the level used to open them; EMPIRE+ Kids (15) gives nothing');

    /* ── unlocking, and the Tech tab ── */
    const unlocked = unlockStreamingTech(qa, 'PLAY_FAST_START');
    assert.ok(unlocked.changed, String(unlocked.reason));
    const locked = unlockStreamingTech(qa, 'PLAY_ADAPTIVE');
    assert.equal(locked.reason, 'NEEDS_EARLIER_TECH', 'No buffering needs Fast start');
    const desk = getStreamingTechDesk(qa);
    const playbackGroup = desk.groups.find(group => group.id === 'PLAYBACK')!;
    const appsGroup = desk.groups.find(group => group.id === 'APPS')!;
    assert.deepEqual([playbackGroup.accent, appsGroup.accent], ['#db2777', '#65a30d']);
    const downloads = playbackGroup.steps.find(step => step.id === 'PLAY_DOWNLOADS')!;
    assert.deepEqual(downloads.feeds, ['Downloads'], 'Downloads feeds the plan feature');
    const fast = playbackGroup.steps.find(step => step.id === 'PLAY_FAST_START')!;
    assert.deepEqual(fast.effect, { kind: 'PLAYBACK', now: 0, next: .15 });
    const next = appsGroup.steps.find(step => step.state === 'OPEN');
    assert.ok(next?.effect?.kind === 'PRODUCT' && next.effect.next > next.effect.now, 'The next Apps step raises Product Experience');
    // The card starts from the level the engines read (the test company's 30), not from the 25 its
    // given Downloads stands for: the bridge never lowers a level.
    const productLevel = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id).technologyLevels.PRODUCT_EXPERIENCE;
    assert.equal(next.effect.now, Math.max(productLevel, 25), `The card's Product Experience starts at the level the engines read (${productLevel})`);
    const skip = playbackGroup.steps.find(step => step.id === 'PLAY_SKIP_INTRO')!;
    assert.ok(skip.effect?.kind === 'PRODUCT' && (productLevel >= 28 ? skip.effect.next === skip.effect.now : skip.effect.next > skip.effect.now),
        'A side line that leaves the tree under the level raises nothing, and says nothing');
    console.log(`PASS tech tab: ${desk.groups.length} groups; Playback pink, Apps lime; Downloads feeds the plan feature; ${next!.name} raises Product Experience ${next!.effect && 'now' in next!.effect ? `${next!.effect.now} → ${next!.effect.next}` : ''}`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
