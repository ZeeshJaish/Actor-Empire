/** What Playback and Apps and devices do for viewers, and what they can break: Phase 3 #53
 *  (codex-handoff/plans/platform-tech-plan.md §4.1 rows 6 and 7: Playback "churn, Habit appeal",
 *  Apps "Reach (more homes can watch)"; §7: "app crash, a feature broken (e.g. downloads not
 *  working), slow streaming (overload)… weak Playback… Good tech… make incidents rare"). Checks:
 *  - the catalogue's numbers: Playback's churn cut and habit appeal, the best app's reach, what can break;
 *  - the player's world offer: none owned, none set (rivals never); owned, set;
 *  - one real week on the test company, A/B: Playback's steps cut cancellations; Smart TV and
 *    Consoles bring more sign-ups;
 *  - which crisis opens: a busy night without No buffering slows streams; the draw names an owned
 *    app or Playback feature, and Flagship apps crash less than Basic ones;
 *  - STATUS: the Apps row is down while an app crashes, the Playback row slow while streams are;
 *    the save keeps the new kinds and what broke; Repair now fixes them as any crisis;
 *  - the Tech tab: each move says what it does for viewers. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    normalizeStreamingTechTreeState, streamingTechDeviceReach, streamingTechHabitAppeal, streamingTechIncidentTargets, streamingTechPlaybackChurnCut,
} from '../services/streamingTechTreeCatalogue';
import { chooseStreamingCrisisType, getStreamingCrisisCopy } from '../services/streamingCrisisSecurity';
import { STREAMING_INCIDENT_HARM, getStreamingIncidentHarm } from '../services/streamingIncidentHarm';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { repairStreamingIncident } from '../services/streamingIncidentRepair';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { createDeterministicRng } from '../services/deterministicRandom';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Effects Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const PLAYBACK_ALL: Array<[string, number]> = [['PLAY_FAST_START', 1], ['PLAY_ADAPTIVE', 1], ['PLAY_LOW_LATENCY', 1], ['PLAY_SKIP_INTRO', 1], ['PLAY_CONTINUE', 1], ['PLAY_ACCESSIBILITY', 1]];

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    assert.deepEqual([streamingTechPlaybackChurnCut(bare), streamingTechHabitAppeal(bare), streamingTechDeviceReach(bare)], [0, 0, 0], 'A standard player and the phone app: nothing');
    const allPlayback = withTechs(bare, PLAYBACK_ALL);
    assert.deepEqual([streamingTechPlaybackChurnCut(allPlayback), streamingTechHabitAppeal(allPlayback)], [.0025, 13], 'All of Playback at Basic: churn −0.25 points a week, +13 with habit streamers');
    assert.equal(streamingTechHabitAppeal(withTechs(bare, [['PLAY_CONTINUE', 3]])), 5.6, 'Continue anywhere at Flagship-level version 3: 5.6');
    assert.equal(streamingTechDeviceReach(withTechs(bare, [['APPS_TV', 1]])), .03, 'Smart TV: 3% more homes');
    assert.equal(streamingTechDeviceReach(withTechs(bare, [['APPS_TV', 1], ['APPS_CONSOLE', 3]])), .06, 'Only the best app counts: Consoles v3 6%');
    assert.deepEqual(streamingTechIncidentTargets(bare, 'APP_CRASH').map(item => [item.id, item.weight]), [['APPS_PHONE', 1]], 'Every service can crash its phone app');
    assert.deepEqual(streamingTechIncidentTargets(bare, 'FEATURE_BROKEN'), [], 'No Playback features, none to break');
    assert.deepEqual(streamingTechIncidentTargets(withTechs(bare, [['PLAY_DOWNLOADS', 2]]), 'FEATURE_BROKEN').map(item => [item.id, item.weight]), [['PLAY_DOWNLOADS', .6]]);
    console.log('PASS catalogue: all of Playback at Basic cuts churn 0.25 points a week and adds 13 for habit streamers; the best app reaches 3–9% more homes; Basic breaks most (1), then 0.6, then 0.3');

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('playback-apps-effects-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const withTree = (techs: Array<[string, number]>, crises?: OwnedStreamingCrisis[]): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            techTree: withTechs(base.techTree!, techs),
            ...(crises ? { crisisSecurity: { ...base.crisisSecurity, crises, infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } } } : {}),
        } as OwnedStreamingPlatformState, qa.id),
    });
    const playerOffer = (player: Player) => getWorldStreamingOffers(player, week).offers.find(offer => offer.isPlayer)!;
    const plain = playerOffer(qa);
    assert.ok(plain.habitAppealIndex === undefined && plain.deviceReach === undefined, 'None owned: neither is set, so the offer is what it was');
    const tuned = playerOffer(withTree([...PLAYBACK_ALL, ['APPS_TV', 1]]));
    assert.deepEqual([tuned.habitAppealIndex, tuned.deviceReach], [13, .03]);
    assert.notEqual(tuned.sourceFingerprint, plain.sourceFingerprint, 'They join the fingerprint once set');
    assert.ok(getWorldStreamingOffers(qa, week).offers.filter(offer => !offer.isPlayer).every(offer => offer.habitAppealIndex === undefined && offer.deviceReach === undefined), 'Rivals: never');
    console.log('PASS offer: none owned, none set (the fingerprint unchanged); owned, habit appeal 13 and reach 3%; rivals never');

    /* ── one real week, A/B ── */
    const snapshotOf = async (player: Player) => normalizeOwnedStreamingPlatformState((await processGameWeek(player)).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
    const subscribers: number[] = [];
    const weekOf = async (player: Player) => { const snapshot = await snapshotOf(player); subscribers.push(snapshot.subscribers); return snapshot.operations!; };
    const calm = await weekOf(withTree([]));
    const playback = await weekOf(withTree(PLAYBACK_ALL));
    const devices = await weekOf(withTree([['APPS_TV', 1], ['APPS_CONSOLE', 1]]));
    assert.ok(playback.cancellations < calm.cancellations, `Cancellations: ${calm.cancellations.toLocaleString()} with a standard player, ${playback.cancellations.toLocaleString()} with all of Playback`);
    assert.ok(devices.joinedSubscribers > calm.joinedSubscribers, `Sign-ups: ${calm.joinedSubscribers.toLocaleString()} phone-only, ${devices.joinedSubscribers.toLocaleString()} with Smart TV and Consoles`);
    console.log(`PASS week: cancellations ${calm.cancellations.toLocaleString()} → ${playback.cancellations.toLocaleString()} with all of Playback; sign-ups ${calm.joinedSubscribers.toLocaleString()} → ${devices.joinedSubscribers.toLocaleString()} with Smart TV and Consoles (5% more homes); subscribers after the week ${subscribers[0].toLocaleString()} / ${subscribers[1].toLocaleString()} / ${subscribers[2].toLocaleString()} (standard / Playback / devices)`);

    /* ── which crisis opens ── */
    const platformWith = (techs: Array<[string, number]>) => normalizeOwnedStreamingPlatformState(withTree(techs).ownedStreamingPlatform, qa.id);
    const busy = { operations: { ...base.weeklyHistory.at(-1)!.operations!, capacityUtilizationPercent: 90, playbackSuccessRate: 99 } };
    assert.deepEqual(chooseStreamingCrisisType(platformWith([]), busy, () => .5), { type: 'SLOW_STREAMING' }, 'A busy night without No buffering: streams slow down');
    assert.notEqual(chooseStreamingCrisisType(platformWith([['PLAY_FAST_START', 1], ['PLAY_ADAPTIVE', 1]]), busy, () => .1).type, 'SLOW_STREAMING', 'With No buffering the busy night is a draw');
    const calmNight = { operations: { ...base.weeklyHistory.at(-1)!.operations!, capacityUtilizationPercent: 40, playbackSuccessRate: 99.5 } };
    const draw = (techs: Array<[string, number]>, runs = 3000) => {
        const platform = platformWith(techs);
        const counts: Record<string, number> = {};
        for (let index = 0; index < runs; index += 1) {
            const choice = chooseStreamingCrisisType(platform, calmNight, createDeterministicRng(`effects-audit:${index}`));
            const key = choice.techId ? `${choice.type}:${choice.techId}` : choice.type;
            counts[key] = (counts[key] || 0) + 1;
        }
        return counts;
    };
    const basic = draw([['APPS_TV', 1], ['APPS_CONSOLE', 1]]);
    const flagship = draw([['APPS_PHONE', 3], ['APPS_TV', 3], ['APPS_CONSOLE', 3]]);
    const crashes = (counts: Record<string, number>) => Object.entries(counts).filter(([key]) => key.startsWith('APP_CRASH')).reduce((sum, [, n]) => sum + n, 0);
    assert.ok(Object.keys(basic).filter(key => key.startsWith('APP_CRASH:')).every(key => ['APP_CRASH:APPS_PHONE', 'APP_CRASH:APPS_TV', 'APP_CRASH:APPS_CONSOLE'].includes(key)), 'Only owned apps crash');
    assert.ok(basic['FEATURE_BROKEN:PLAY_DOWNLOADS'] > 0, `The test company's Downloads can break: ${JSON.stringify(basic)} ${JSON.stringify(base.technologyLevels)} ${base.technologyProjects.map(p => p.definitionId + ':' + p.status).join(',')}`);
    assert.ok(crashes(flagship) < crashes(basic) * .5, `Flagship apps crash less: ${crashes(basic)} → ${crashes(flagship)} of 3,000 draws`);
    console.log(`PASS crisis kinds: a busy night without No buffering slows streams; in 3,000 calm draws app crashes ${crashes(basic)} with three Basic apps, ${crashes(flagship)} at Flagship; Downloads broke ${basic['FEATURE_BROKEN:PLAY_DOWNLOADS']} times`);

    /* ── STATUS, the save and repair ── */
    const crisis = (type: OwnedStreamingCrisis['type'], stage: OwnedStreamingCrisis['stage'], techId?: OwnedStreamingCrisis['techId']): OwnedStreamingCrisis => {
        const copy = getStreamingCrisisCopy(type, techId);
        return {
            id: `effects-${type}`, idempotencyKey: `effects-${type}`, type, severity: 'MAJOR', stage, title: copy.title, detail: copy.detail, cause: 'Audit.',
            detectedAtAbsoluteWeek: week - 1, affectedSubscribers: 400_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null, communication: null,
            responseCost: 0, weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: stage === 'RECOVERING' ? week + 3 : null, resolvedAtAbsoluteWeek: null, outcomeNote: null,
            ...(techId ? { techId } : {}),
        };
    };
    assert.deepEqual([getStreamingCrisisCopy('APP_CRASH', 'APPS_TV').title, getStreamingCrisisCopy('FEATURE_BROKEN', 'PLAY_DOWNLOADS').title, getStreamingCrisisCopy('SLOW_STREAMING', undefined).title],
        ['The Smart TV app keeps crashing', 'Downloads stopped working', 'Streams are slow to start']);
    const crashing = withTree([['APPS_TV', 1]], [crisis('APP_CRASH', 'DETECTED', 'APPS_TV')]);
    const board = getStreamingStatusBoard(crashing);
    const appsRow = board.sections.find(section => section.id === 'TECH')!.rows.find(row => row.id === 'TECH:APPS')!;
    assert.deepEqual([appsRow.status, appsRow.reason, board.open[0].kind, board.open[0].hits], ['DOWN', 'The Smart TV app keeps crashing', 'App crash', ['DELIVERY']]);
    assert.ok(board.open[0].damage.some(line => /^Viewing −/.test(line)), board.open[0].damage.join(', '));
    const fixing = getStreamingStatusBoard(withTree([['APPS_TV', 1]], [crisis('APP_CRASH', 'RECOVERING', 'APPS_TV')])).sections.find(section => section.id === 'TECH')!.rows.find(row => row.id === 'TECH:APPS')!;
    assert.deepEqual([fixing.status, fixing.reason], ['SLOW', 'Fix under way: the Smart TV app keeps crashing']);
    const slowRow = getStreamingStatusBoard(withTree([], [crisis('SLOW_STREAMING', 'DETECTED')])).sections.find(section => section.id === 'TECH')!.rows.find(row => row.id === 'TECH:PLAYBACK')!;
    assert.deepEqual([slowRow.status, slowRow.reason], ['SLOW', 'Streams are slow to start']);
    const saved = normalizeOwnedStreamingPlatformState(crashing.ownedStreamingPlatform, qa.id).crisisSecurity.crises.at(-1)!;
    assert.deepEqual([saved.type, saved.techId], ['APP_CRASH', 'APPS_TV'], 'The save keeps the kind and what broke');
    assert.equal(getStreamingIncidentHarm(normalizeOwnedStreamingPlatformState(crashing.ownedStreamingPlatform, qa.id)).rows[0].viewingLoss > 0, true, 'It hurts the viewers it reaches');
    assert.deepEqual(['APP_CRASH', 'FEATURE_BROKEN', 'SLOW_STREAMING'].map(kind => STREAMING_INCIDENT_HARM[kind as 'APP_CRASH']), [{ viewing: .6, churn: .06 }, { viewing: .1, churn: .03 }, { viewing: .25, churn: .04 }]);
    const repaired = repairStreamingIncident({ ...crashing, flags: { ...crashing.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, 'CRISIS', 'effects-APP_CRASH', 'ENERGY');
    assert.ok(repaired.changed, `${repaired.refusal}: ${repaired.message}`);
    const after = normalizeOwnedStreamingPlatformState(repaired.player.ownedStreamingPlatform, qa.id).crisisSecurity.crises.at(-1)!;
    assert.equal(after.stage, 'RESOLVED', 'Repair now fixes an app crash this week');
    console.log(`PASS status: "${appsRow.reason}" puts Apps DOWN (${board.open[0].damage.slice(0, 2).join(', ')}); under repair SLOW; slow streams put Playback SLOW; the save keeps the kind and the app; Repair now resolves it`);

    /* ── the Tech tab ── */
    const desk = getStreamingTechDesk(qa);
    const step = (group: string, id: string) => desk.groups.find(item => item.id === group)!.steps.find(item => item.id === id)!;
    assert.deepEqual(step('APPS', 'APPS_TV').more, ['3% more homes can watch']);
    assert.deepEqual(step('PLAYBACK', 'PLAY_CONTINUE').more, ['Churn −0.07% a week', '+4 appeal with habit streamers']);
    assert.deepEqual(step('PLAYBACK', 'PLAY_DOWNLOADS').more, ['It breaks 40% less often'], 'Downloads at version 2: the plan feature, and it breaks less (#85: every version shows what it adds)');
    console.log(`PASS tech tab: Smart TV "${step('APPS', 'APPS_TV').more.join(', ')}"; Continue anywhere "${step('PLAYBACK', 'PLAY_CONTINUE').more.join(', ')}"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
