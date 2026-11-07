/** Smart AI, Phase 4 #59 (codex-handoff/plans/platform-tech-plan.md §4.1 row 9: "Recommendations, AI
 *  channels, Voice search, Personal artwork and trailers, Autoplay and previews | Viewing hours and less
 *  churn"; §4.3: DATA_RECOMMENDATIONS from Smart AI; §13 Phase 4: "AI raises viewing hours and lowers
 *  churn measurably"). Checks:
 *  - the catalogue: the recommendations ladder, its starter and side lines, prices;
 *  - the bridge: Recommendations from the best recommendations step, never lowered;
 *  - old saves: Recommendations 10 → Because you watched, 24 → + Personal artwork (never the Taste
 *    engine); a schema-5 tree joins once;
 *  - what it does: more accounts find something to watch, more of each title finished and rewatched,
 *    less churn; the starter alone changes nothing;
 *  - the campus: the Audience Intelligence line points to Tech, and a node under way grants its steps;
 *  - one real week on the test company, A/B: more viewing hours and fewer cancellations;
 *  - STATUS: a recommendation backlash slows the Smart AI row; the Tech tab warns before
 *    Recommendations run 20 ahead of Security. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type OwnedStreamingTechnologyProject, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    STREAMING_TECH_TREE_SCHEMA, applyStreamingTechBridge, convertStreamingTechTreeFromLevels, deriveStreamingTechEngineLevel, getStreamingTechGroupLadder,
    normalizeStreamingTechTreeState, streamingTechChurnCut, streamingTechSmartAiEffects,
} from '../services/streamingTechTreeCatalogue';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { STREAMING_RECOMMENDATIONS_MOVED_BLOCKER, STREAMING_TECHNOLOGY_DEFINITIONS, completeDueStreamingTechnologyProjects, getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Smart AI Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const owned = (tree: OwnedStreamingTechTreeState) => Object.keys(tree.techs).filter(id => id.startsWith('AI_')).sort();
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const onlyTrending = (tree: OwnedStreamingTechTreeState): OwnedStreamingTechTreeState => ({
    ...tree, techs: Object.fromEntries(Object.entries(tree.techs).filter(([id]) => !id.startsWith('AI_') || id === 'AI_TRENDING')) as OwnedStreamingTechTreeState['techs'],
});

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const ladder = getStreamingTechGroupLadder('SMART_AI');
    assert.deepEqual(ladder.map(item => `${item.name}${item.sideLine ? '*' : ''}${item.starter ? '(start)' : ''}${item.futuristic ? '✦' : ''}`), [
        'Trending rows(start)', 'Because you watched', 'Personal artwork and trailers', 'Taste engine✦', 'Autoplay and previews*', 'AI channels*', 'Voice search*',
    ]);
    assert.deepEqual(ladder.filter(item => !item.starter).map(item => item.unlockCost / 1e6), [8, 25, 150, 6, 20, 5], 'Prices in $M');
    assert.deepEqual(ladder.find(item => item.id === 'AI_VOICE')!.requires, ['AI_TRENDING', 'APPS_TV'], 'Voice search needs Smart TV apps (the remote)');
    assert.equal(STREAMING_TECH_TREE_SCHEMA, 8, 'Schema 8 since Ads tech (#61)');
    console.log(`PASS catalogue: ${ladder.map(item => item.name).join(', ')}`);

    /* ── the bridge ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const recommending = withTechs(bare, [['AI_BECAUSE', 2]]);
    assert.equal(deriveStreamingTechEngineLevel(recommending, 'DATA_RECOMMENDATIONS'), 12, 'Recommendations = the best recommendations step (Because you watched v2 12)');
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 0, DATA_RECOMMENDATIONS: 5, SECURITY: 0, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 0, PRODUCT_EXPERIENCE: 0 };
    assert.deepEqual([applyStreamingTechBridge(levels, recommending).DATA_RECOMMENDATIONS, applyStreamingTechBridge({ ...levels, DATA_RECOMMENDATIONS: 40 }, recommending).DATA_RECOMMENDATIONS], [12, 40],
        'Raised to what the tree stands for, never lowered');
    console.log('PASS bridge: Recommendations 12 from Because you watched v2; never lowered');

    /* ── old saves ── */
    const aiOf = (recommendations: number) => owned(convertStreamingTechTreeFromLevels({ DATA_RECOMMENDATIONS: recommendations }));
    assert.deepEqual([aiOf(5), aiOf(10), aiOf(24), aiOf(70)], [['AI_TRENDING'], ['AI_BECAUSE', 'AI_TRENDING'], ['AI_ARTWORK', 'AI_BECAUSE', 'AI_TRENDING'], ['AI_ARTWORK', 'AI_BECAUSE', 'AI_TRENDING']],
        'Recommendations 10 → Because you watched, 24 → Personal artwork; never the Taste engine or a side line');
    const schemaFive = { schemaVersion: 5, convertedFromLegacy: false, techs: { PICTURE_1080P: { version: 1 } } };
    const joined = normalizeStreamingTechTreeState(schemaFive, { DATA_RECOMMENDATIONS: 30 });
    assert.deepEqual([joined.schemaVersion, owned(joined), joined.techs.AI_ARTWORK?.granted], [8, ['AI_ARTWORK', 'AI_BECAUSE', 'AI_TRENDING'], true], 'A schema-5 tree joins once, as given steps');
    assert.deepEqual(owned(normalizeStreamingTechTreeState({ ...joined, techs: { ...joined.techs, AI_ARTWORK: undefined } }, { DATA_RECOMMENDATIONS: 30 })), ['AI_BECAUSE', 'AI_TRENDING'], 'Never again');
    console.log('PASS old saves: Recommendations 10 → Because you watched, 24 → + Personal artwork; a schema-5 tree joins once');

    /* ── what it does ── */
    assert.deepEqual(streamingTechSmartAiEffects(bare), { engagementLift: 0, completionLift: 0, repeatLift: 0 }, 'The starter alone: nothing');
    assert.deepEqual(streamingTechSmartAiEffects(withTechs(bare, [['AI_BECAUSE', 1]])), { engagementLift: .04, completionLift: 0, repeatLift: 0 });
    const full = withTechs(bare, [['AI_BECAUSE', 1], ['AI_ARTWORK', 2], ['AI_CHANNELS', 1], ['AI_VOICE', 1], ['AI_AUTOPLAY', 3]]);
    assert.deepEqual(streamingTechSmartAiEffects(full), { engagementLift: .11, completionLift: .06, repeatLift: .02 }, 'Only the best recommendations step counts, plus the side lines');
    assert.deepEqual([streamingTechChurnCut(bare), streamingTechChurnCut(withTechs(bare, [['AI_BECAUSE', 1], ['AI_ARTWORK', 1]]))], [0, .0006], 'Churn: the best recommendations step');
    console.log('PASS effects: Because you watched +4% find something to watch; Personal artwork v2 + AI channels + Voice search +11%; Autoplay v3 +6 points finished, +2 rewatched; churn −0.06 points with Personal artwork');

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('smart-ai-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.deepEqual([base.technologyLevels.DATA_RECOMMENDATIONS, owned(base.techTree!)], [24, ['AI_ARTWORK', 'AI_BECAUSE', 'AI_TRENDING']],
        'The test company: Recommendations 24, Smart AI to Personal artwork (the campus no longer builds Audience Intelligence)');
    const playerWith = (tree: OwnedStreamingTechTreeState, extra: Partial<OwnedStreamingPlatformState> = {}): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...base, ...extra, techTree: tree } as OwnedStreamingPlatformState, qa.id),
    });

    /* ── the campus ── */
    const campus = getStreamingTechnologyCampus(qa);
    const lab = campus.facilities.find(facility => facility.definition.id === 'DATA_RECOMMENDATIONS')!.nodes.filter(node => node.status !== 'INSTALLED' && node.status !== 'BUILDING');
    assert.ok(lab.length > 0 && lab.every(node => node.blockers.includes(STREAMING_RECOMMENDATIONS_MOVED_BLOCKER)), 'Every open Audience Intelligence node points to Tech');
    const node = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.branch === 'DATA_RECOMMENDATIONS' && item.targetLevel >= 24 && item.targetLevel < 45)!;
    const project: OwnedStreamingTechnologyProject = {
        id: 'smart-ai-audit-node', idempotencyKey: 'smart-ai-audit-node', definitionId: node.id, branch: 'DATA_RECOMMENDATIONS', title: node.title, targetLevel: node.targetLevel,
        buildMode: 'BALANCED', status: 'UNDER_CONSTRUCTION', capitalCost: 0, weeklyOperatingCostDelta: 0, staffRequired: 0, constructionWeeks: 1, benefit: node.benefit,
        risk: node.risk, riskNote: node.riskNote, technicalDebtDelta: 0, startedAtAbsoluteWeek: week - 1, readyAtAbsoluteWeek: week, completedAtAbsoluteWeek: null,
    };
    const lowered = { ...base, technologyLevels: { ...base.technologyLevels, DATA_RECOMMENDATIONS: 5 }, techTree: onlyTrending(base.techTree!), technologyProjects: [project] };
    const built = completeDueStreamingTechnologyProjects(lowered as OwnedStreamingPlatformState, week).platform;
    assert.deepEqual([built.technologyLevels.DATA_RECOMMENDATIONS, owned(built.techTree!)], [node.targetLevel, ['AI_ARTWORK', 'AI_BECAUSE', 'AI_TRENDING']],
        'A node under way finishes, and its level grants the steps it stands for');
    console.log(`PASS campus: ${lab.length} open Audience Intelligence nodes read "${STREAMING_RECOMMENDATIONS_MOVED_BLOCKER}"; ${node.title} (${node.targetLevel}) under way finishes and grants Because you watched and Personal artwork`);

    /* ── one real week, A/B ── */
    const weekOf = async (tree: OwnedStreamingTechTreeState) => {
        const snapshot = normalizeOwnedStreamingPlatformState((await processGameWeek(playerWith(tree))).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
        return { hours: snapshot.operations?.worldViewingHours || 0, viewers: snapshot.operations?.worldViewingAccounts || 0, cancellations: snapshot.operations?.cancellations || 0 };
    };
    const plain = await weekOf(onlyTrending(base.techTree!));
    const qaWeek = await weekOf(base.techTree!);
    const smart = await weekOf(withTechs(base.techTree!, [['AI_ARTWORK', 3], ['AI_AUTOPLAY', 3], ['AI_CHANNELS', 3]]));
    assert.ok(qaWeek.hours > plain.hours && smart.hours > qaWeek.hours, `Viewing hours ${plain.hours.toLocaleString()} → ${qaWeek.hours.toLocaleString()} → ${smart.hours.toLocaleString()}`);
    assert.ok(qaWeek.cancellations < plain.cancellations && smart.cancellations < qaWeek.cancellations,
        `Cancellations ${plain.cancellations.toLocaleString()} → ${qaWeek.cancellations.toLocaleString()} → ${smart.cancellations.toLocaleString()}`);
    console.log(`PASS week: Trending rows alone → the test company's Because you watched + Personal artwork → Personal artwork v3 + Autoplay v3 + AI channels v3: viewing hours ${plain.hours.toLocaleString()} → ${qaWeek.hours.toLocaleString()} → ${smart.hours.toLocaleString()}, accounts watching ${plain.viewers.toLocaleString()} → ${qaWeek.viewers.toLocaleString()} → ${smart.viewers.toLocaleString()}, cancellations ${plain.cancellations.toLocaleString()} → ${qaWeek.cancellations.toLocaleString()} → ${smart.cancellations.toLocaleString()}`);

    /* ── STATUS and the Tech tab ── */
    const backlash: OwnedStreamingCrisis = {
        id: 'ai-backlash', idempotencyKey: 'ai-backlash', type: 'RECOMMENDATION_BACKLASH', severity: 'SERIOUS', stage: 'DETECTED', title: 'The recommendation system triggered backlash',
        detail: '', cause: '', detectedAtAbsoluteWeek: week - 1, affectedSubscribers: 200_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null,
        communication: null, responseCost: 0, weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, outcomeNote: null,
    };
    const row = getStreamingStatusBoard(playerWith(base.techTree!, { crisisSecurity: { ...base.crisisSecurity, crises: [backlash], infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } } }))
        .sections.find(section => section.id === 'TECH')!.rows.find(item => item.id === 'TECH:SMART_AI')!;
    assert.deepEqual([row.status, row.reason, row.detail], ['SLOW', 'The recommendation system triggered backlash', 'Personal artwork and trailers · Basic']);
    const desk = getStreamingTechDesk(playerWith(onlyTrending(base.techTree!), { technologyLevels: { ...base.technologyLevels, DATA_RECOMMENDATIONS: 5, SECURITY: 20 } }));
    const group = desk.groups.find(item => item.id === 'SMART_AI')!;
    const step = (id: string) => group.steps.find(item => item.id === id)!;
    assert.deepEqual([group.accent, group.name], ['#6366f1', 'Smart AI']);
    assert.deepEqual(step('AI_BECAUSE').more, ['4% more viewers find something to watch', 'Churn −0.04% a week']);
    assert.deepEqual(step('AI_AUTOPLAY').more, ['Viewers finish 4 points more of each title', 'Rewatching +1 point']);
    const ahead = getStreamingTechDesk(playerWith(withTechs(onlyTrending(base.techTree!), [['AI_BECAUSE', 1], ['AI_ARTWORK', 1]]),
        { technologyLevels: { ...base.technologyLevels, DATA_RECOMMENDATIONS: 24, SECURITY: 20 } })).groups.find(item => item.id === 'SMART_AI')!;
    assert.deepEqual(ahead.steps.find(item => item.id === 'AI_TASTE')!.risks, [], 'Security 45 from the test company\'s Trust steps keeps 45 safe');
    const exposed = getStreamingTechDesk(playerWith(withTechs({ ...onlyTrending(base.techTree!), techs: Object.fromEntries(Object.entries(onlyTrending(base.techTree!).techs).filter(([id]) => !id.startsWith('TRUST_') || id === 'TRUST_DRM')) as OwnedStreamingTechTreeState['techs'] },
        [['AI_BECAUSE', 1], ['AI_ARTWORK', 1]]), { technologyLevels: { ...base.technologyLevels, DATA_RECOMMENDATIONS: 24, SECURITY: 20 } })).groups.find(item => item.id === 'SMART_AI')!;
    assert.deepEqual(exposed.steps.find(item => item.id === 'AI_TASTE')!.risks, ['Recommendations 45 would run more than 20 ahead of Security 20: backlash risk'],
        'The Taste engine warns when Security trails, apart from what it does for viewers');
    assert.deepEqual(exposed.steps.find(item => item.id === 'AI_TASTE')!.more, ['4% more viewers find something to watch', 'Churn −0.04% a week']);
    console.log(`PASS status and tech tab: a backlash slows Smart AI ("${row.reason}"); indigo; Because you watched "${step('AI_BECAUSE').more.join('", "')}"; Autoplay "${step('AI_AUTOPLAY').more.join('", "')}"; the Taste engine warns at Security 20`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
