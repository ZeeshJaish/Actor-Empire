import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Commitment, type Player } from '../types';
import { generateAudition } from '../services/roleLogic';
import { getActorCareerArc } from '../services/actorCareerArc';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { applyCrisisImpact } from '../services/productionService';
import { resolveLifeEventFallback } from '../services/lifeEventFallback';
import { initializeStocks } from '../services/stockLogic';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { careerActionHarness, normalizeCareerCommitmentsThroughApp } from './fixtures/actorCareerActions';

const out = '/tmp/ae-career-compatibility';
mkdirSync(out, { recursive: true });
let state = 78123, tick = 0;
Math.random = () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
Date.now = () => 1810000000000 + tick++;
let player = structuredClone(INITIAL_PLAYER);
player.money = 9000000.75;
player.stats.fame = 96; player.stats.reputation = 95; player.stats.experience = 95;
for (const key of Object.keys(player.stats.skills)) (player.stats.skills as any)[key] = 91;
player.stats.genreXP.DRAMA = 92;
player.awards = [1,2].map(n => ({ id: 'old-win-'+n, name: 'Oscar', type: 'OSCAR', category: 'Best Actor', year: 15+n, projectId: 'old-credit-'+n, projectName: 'Old Credit '+n, outcome: 'WON' })) as any;
player.stocks = initializeStocks();
player.portfolio = [{ stockId: 'stk_nke', shares: 57, averageCost: 23.5, totalInvested: 1339.5 }];
const offer = generateAudition('SUPPORTING', 'LOW', [], player, 'DIRECT', 'MOVIE');
const film: Commitment = { id: 'legacy-signed-film', name: 'Legacy Signed Film', type: 'ACTING_GIG',
    roleType: 'SUPPORTING', energyCost: 0, income: 0, payoutType: 'LUMPSUM', lumpSum: 123456, agentCommission: .1,
    projectPhase: 'PRODUCTION', phaseWeeksLeft: 1, totalPhaseDuration: 8, productionPerformance: 35,
    projectDetails: { ...offer.project, releaseStrategy: 'THEATRICAL', releaseRegionIds: ['NORTH_AMERICA'],
        releaseChainSelections: { NORTH_AMERICA: ['NOVA_CIRCUIT'] } } };
player.commitments = [film, { id: 'old-class', name: 'Signed Class', type: 'COURSE', energyCost: 15,
    income: 0, payoutType: 'WEEKLY', weeksCompleted: 0, totalDuration: 2, skillGains: { expression: .2 } }];
player.activeSponsorships = [{ id: 'signed-commercial', brandName: 'Legacy Commercial', category: 'FASHION',
    weeklyPay: 8765, durationWeeks: 2, requirements: { type: 'POST', energyCost: 10, totalRequired: 1, progress: 1 },
    isExclusive: false, penalty: 876, description: 'Already signed' }];
const beforeMigration = structuredClone(player);
player = migratePlayerSave(player);
assert.equal(player.money, beforeMigration.money);
assert.deepEqual(player.stats.skills, beforeMigration.stats.skills);
assert.deepEqual(player.stats.genreXP, beforeMigration.stats.genreXP);
assert.deepEqual(player.portfolio, beforeMigration.portfolio);
assert.deepEqual(player.activeSponsorships, beforeMigration.activeSponsorships);
assert(player.flags.careerLegendRecognized);
assert.equal(getActorCareerArc(player).id, 'INDUSTRY_LEGEND');
assert.equal(player.commitments[0].careerBalanceVersion, undefined);
assert.equal(player.commitments[1].careerBalanceVersion, undefined);

const store = new CinemaMemorySaveStore();
let reloads = 0;
const protectedState = (p: Player) => JSON.parse(JSON.stringify({ money: p.money, skills: p.stats.skills,
    xp: p.stats.genreXP, shares: p.portfolio, sponsorships: p.activeSponsorships, awards: p.awards,
    commitments: p.commitments.map(c => [c.id, c.lumpSum, c.projectPhase, c.phaseWeeksLeft, c.productionPerformance,
        c.careerBalanceVersion, c.careerPreparationScore, c.careerPerformanceFinalized]),
    contracts: p.world.streamingRightsContracts }));
async function reload() {
    const before = protectedState(player), prepared = prepareVerifiedPlayerForPersistence(player, 'MANUAL');
    assert.deepEqual(prepared.comparison, { ok: true });
    await saveVerifiedGameData(store, 'compatibility', prepared.player, prepared.manifest);
    const loaded = await loadVerifiedGameData(store, 'compatibility'); assert.equal(loaded.status, 'CURRENT');
    player = migratePlayerSave(loaded.player!);
    player.commitments = normalizeCareerCommitmentsThroughApp(player.commitments);
    assert.deepEqual(protectedState(player), before); assert(player.flags.careerLegendRecognized); reloads++;
}
function resolveChoices() {
    let n = 0;
    while (player.pendingEvents.length) {
        assert(n++ < 100); const e = player.pendingEvents[0], queue = player.pendingEvents;
        if (e.data?.lifeEvent) {
            const l = e.data.lifeEvent, i = l.options.findIndex((o: any) => !o.isGolden), o = l.options[i];
            player = (typeof o.impact === 'function' ? o.impact(player) : resolveLifeEventFallback(player, l, i, o)).updatedPlayer;
        } else if (['PRODUCTION_CRISIS', 'DIRECTOR_DECISION'].includes(e.type)) {
            const i = e.data.options.findIndex((o: any) => !o.isGolden && !/\$|pr\.label|cgi\.label|\.money\.label/.test([o.label, o.labelKey].join(' ')));
            player = applyCrisisImpact(player, e, i).updatedPlayer;
        } else throw Error('Unhandled actual event: ' + e.type);
        player.pendingEvents = queue.filter(x => x.id !== e.id);
    }
}
await reload();
const oldRehearsal = careerActionHarness(player).rehearse(film.id);
assert.equal(oldRehearsal.commitments[0].careerBalanceVersion, undefined);
// Keep the original legacy progress fixture for the exact passive-gain assertion below.
for (let week = 1; week <= 14; week++) {
    resolveChoices(); player = (await processGameWeek(player)).player;
    if (week === 1) {
        const wrapped = player.commitments.find(c => c.id === film.id)!;
        assert.equal(wrapped.projectPhase, 'POST_PRODUCTION');
        assert.equal(wrapped.productionPerformance, 35 + Math.floor(player.stats.talent * .05));
        assert.equal(wrapped.careerPerformanceFinalized, undefined);
        assert(Math.abs(player.stats.skills.expression - (91 + .2 * (1 - 91 / 120))) < 1e-8);
        assert.equal(player.activeSponsorships[0].weeklyPay, 8765);
    }
    await reload();
}
const salaries = player.finance.history.filter(t => t.category === 'SALARY' && t.description === 'Salary: Legacy Signed Film');
assert.equal(salaries.length, 1);
const commissions=player.finance.history.filter(t => t.description === 'Agent Commission (Legacy Signed Film)');
assert.equal(commissions.length,1);assert.equal(commissions[0].amount,-12345);
assert.equal(salaries[0].amount+commissions[0].amount,111111,'Signed 10% commission must be charged exactly once');
assert.equal(salaries[0].amount,123456,'Salary ledger records the gross signed fee');
const sponsors = player.finance.history.filter(t => t.category === 'SPONSORSHIP' && t.description.includes('Legacy Commercial'));
assert.equal(sponsors.length, 2); assert.equal(sponsors.reduce((n, t) => n + t.amount, 0), 17530);
assert.deepEqual(player.portfolio, beforeMigration.portfolio);
writeFileSync(out + '/results.json', JSON.stringify({ status: 'PASS', weeks: 14, reloads,
    grandfatheredLegend: player.flags.careerLegendRecognized, salaries, commissions, sponsors, shares: player.portfolio }, null, 2));
console.log(`PASS legacy production, legacy paid class, signed salary paid once, signed commercial paid twice, earned skills/XP, shares and grandfathered Legend; 14 actual weeks, ${reloads} verified save/reloads.`);
