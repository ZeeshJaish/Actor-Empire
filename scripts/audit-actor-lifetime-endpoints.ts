/** Read-only round trips of isolated, naturally earned lifetime checkpoints. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import type {Player} from '../types';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData, loadVerifiedGameData} from '../services/saveGenerations';
import {migratePlayerSave} from '../services/saveMigration';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';

const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const protectedState = (p: Player) => ({
    money: p.money, loans: p.finance.loans, credit: p.finance.credit,
    stats: p.stats, portfolio: p.portfolio, awards: p.awards,
    businesses: p.businesses,
    team: p.team,
    contracts: p.world.streamingRightsContracts,
    commitments: p.commitments.map(c => ({
        id: c.id, type: c.type, lumpSum: c.lumpSum, income: c.income,
        energyCost: c.energyCost, phase: c.projectPhase, phaseWeeksLeft: c.phaseWeeksLeft,
        auditionPerformance: c.auditionPerformance, productionPerformance: c.productionPerformance,
        careerBalanceVersion: c.careerBalanceVersion, careerPerformanceFinalized: c.careerPerformanceFinalized,
        careerPreparationScore: c.careerPreparationScore, careerLearningActions: c.careerLearningActions,
        careerRewardPacingVersion: c.careerRewardPacingVersion, careerLearningWeek: c.careerLearningWeek,
        careerLearningActionsThisWeek: c.careerLearningActionsThisWeek,
        cast: c.projectDetails?.castList?.map(m => ({actorId: m.actorId, roleType: m.roleType, salary: m.salary})),
    })),
});
const targets = [
    ...['free', 'boosted'].map(route => ({label: `primary-${route}`, path: `/tmp/ae-lifetime-repaired-${route}/${route}/career-0.json.gz`})),
    ...['focused', 'neglect', 'overbooked'].map(mode => ({label: `maxed-${mode}`, path: `/tmp/ae-lifetime-maxed-long-boosted-${mode}/boosted/career-0.json.gz`})),
    ...['free', 'boosted'].map(route => ({label: `latest-source-${route}`, path: `/tmp/ae-lifetime-current-smoke-${route}/${route}/career-0.json.gz`})),
];
const results = [];
for (const target of targets) {
    const raw = readFileSync(target.path), rawHash = createHash('sha256').update(raw).digest('hex');
    const checkpoint = JSON.parse(gunzipSync(raw).toString());
    const original: Player = checkpoint.player;
    const expected = hash(protectedState(original));
    const sourceHash = hash(original);
    const prepared = prepareVerifiedPlayerForPersistence(original, 'PROCESS_WEEK');
    assert.deepEqual(prepared.comparison, {ok: true}, target.label);
    assert.equal(hash(protectedState(prepared.player)), expected, `${target.label}: preparation`);
    const store = new CinemaMemorySaveStore();
    await saveVerifiedGameData(store, target.label, prepared.player, prepared.manifest);
    const loaded = await loadVerifiedGameData(store, target.label);
    assert.equal(loaded.status, 'CURRENT', target.label);
    assert.equal(hash(protectedState(loaded.player!)), expected, `${target.label}: persisted`);
    const migrated = migratePlayerSave(loaded.player!);
    assert.equal(hash(protectedState(migrated)), expected, `${target.label}: migrated`);
    assert.equal(hash(original), sourceHash, `${target.label}: caller untouched`);
    assert.equal(createHash('sha256').update(readFileSync(target.path)).digest('hex'), rawHash, `${target.label}: checkpoint untouched`);
    results.push({label: target.label, week: checkpoint.weeks, cash: migrated.money, preserved: true});
}
const report = {passed: true, cases: results, scope: 'Isolated real verified-store round trips; no personal save slots'};
writeFileSync('/tmp/ae-lifetime-endpoint-safety.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report));
