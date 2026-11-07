import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { advanceOriginalPitches, getLiveOriginalPitches } from '../services/originalsPitches';
import { getOriginalsStudios } from '../services/originalsStudios';
import { buildOriginalBill, getOriginalEpisodeScale, scaleOriginalBudget, studioPossessive } from '../services/originalsDeal';
import { buildOutsideStudioStandIn, createBlankOriginalConcept, finalizeOriginalCommission, getCommissionableScripts, getOriginalCommissionId, hasOwnProductionHouse, type OriginalWizardMode } from '../services/originalsCommission';
import { resolveStreamingViewingProjectFacts } from '../services/worldEconomy/worldStreamingViewing';
import {
    compactEpisodeShares, evenEpisodeShares, getEpisodeZone, getSeasonEffects, getSeasonShape, getSeasonZones, getStudioSeasonShares, moveEpisodeBar,
} from '../services/originalsEpisodeBudget';

/* #283 to #287: the three ways end here: the bill, the bars, the commission. */

const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'original-commission-audit', name: 'Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

/* --- the zones and the bars */
assert.deepEqual(getSeasonZones(8), { start: 3, middle: 3, finale: 2 });
assert.deepEqual(getSeasonZones(12), { start: 4, middle: 5, finale: 3 });
assert.deepEqual(getSeasonZones(16), { start: 6, middle: 6, finale: 4 });
for (const episodes of [1, 2, 3, 4, 6, 8, 10, 12, 16, 24]) {
    const zones = getSeasonZones(episodes);
    assert.equal(zones.start + zones.middle + zones.finale, episodes, `zones cover ${episodes}`);
    assert.ok(Math.abs(evenEpisodeShares(episodes).reduce((sum, share) => sum + share, 0) - 1) < 1e-9);
}
assert.equal(getEpisodeZone(0, 8), 'START');
assert.equal(getEpisodeZone(3, 8), 'MIDDLE');
assert.equal(getEpisodeZone(7, 8), 'FINALE');

const sum = (shares: number[]) => shares.reduce((total, share) => total + share, 0);
let bars = evenEpisodeShares(8);
bars = moveEpisodeBar(bars, 0, 0.5);
assert.ok(Math.abs(sum(bars) - 1) < 1e-9, 'the total never moves');
assert.equal(bars[0], 0.5, 'a bar can go far over an even share');
assert.ok(bars.slice(1).every(share => Math.abs(share - bars[1]) < 1e-9), 'the others share what is left');
const huge = moveEpisodeBar(evenEpisodeShares(8), 0, 10);
assert.ok(huge[0] > 0.9, 'there is no upper limit but the others\' floor');
assert.ok(huge.slice(1).every(share => share >= (1 / 8) * 0.1 - 1e-9), 'nothing under a tenth of an even share');
const tiny = moveEpisodeBar(evenEpisodeShares(8), 3, 0);
assert.ok(Math.abs(tiny[3] - (1 / 8) * 0.1) < 1e-9, 'the floor holds');
assert.ok(Math.abs(sum(tiny) - 1) < 1e-9);
assert.ok(Math.abs(sum(compactEpisodeShares(huge)) - 1) < 0.01);

/* --- the game names the season */
const shape = (start: number, middle: number, finale: number, episodes = 8) => {
    const zones = getSeasonZones(episodes);
    return getSeasonShape(Array.from({ length: episodes }, (_, i) => (i < zones.start ? start : i >= episodes - zones.finale ? finale : middle)));
};
assert.equal(shape(1, 1, 1), 'EVEN');
assert.equal(shape(1.05, 0.95, 1), 'EVEN', 'within 10% is even');
assert.equal(shape(1.6, 0.7, 0.7), 'BIG_OPENING');
assert.equal(shape(0.7, 1.5, 0.7), 'STRONG_MIDDLE');
assert.equal(shape(0.7, 0.7, 1.9), 'BIG_FINALE');
assert.equal(shape(1.3, 0.5, 1.3), 'BIG_START_BIG_END');
const oneEpisode = Array(8).fill(0.7);
oneEpisode[4] = 3;
assert.equal(getSeasonShape(oneEpisode), 'BIG_EPISODE');

/* --- what the shape does: one title, three shapes, real differences, within limits */
const even = getSeasonEffects(evenEpisodeShares(8));
assert.deepEqual(even, { pull: 0, keep: 0, hype: 0 });
const opening = getSeasonEffects(getStudioSeasonShares('BIG_OPENING', 8));
const burn = getSeasonEffects(getStudioSeasonShares('SLOW_BURN', 8));
const finale = getSeasonEffects(getStudioSeasonShares('BIG_FINALE', 8));
assert.ok(opening.pull > 0 && opening.keep < 0 && opening.hype < 0, JSON.stringify(opening));
assert.ok(burn.keep > 0 && burn.pull < 0, JSON.stringify(burn));
assert.ok(finale.hype > 0 && finale.pull < 0, JSON.stringify(finale));
const extreme = getSeasonEffects(moveEpisodeBar(evenEpisodeShares(8), 0, 0.95));
assert.ok(extreme.pull <= 0.15 && extreme.keep >= -0.15 && extreme.hype >= -0.1, JSON.stringify(extreme));
const allFinale = getSeasonEffects(moveEpisodeBar(evenEpisodeShares(8), 7, 0.95));
assert.ok(allFinale.hype <= 0.2);

/* one title, three shapes: the viewing engine reads them */
const facts = (shares?: number[]) => {
    const player = fresh();
    const row: any = { id: 'audit_title', name: 'Audit', episodes: 8, projectQuality: 70, imdbRating: 7, ...(shares ? { episodeBudgetShares: shares } : {}) };
    return resolveStreamingViewingProjectFacts({ ...player, pastProjects: [row] }, { projectId: 'audit_title', projectType: 'SERIES', source: 'OWNED_LIBRARY' } as any, 1);
};
const plain = facts();
assert.equal(plain.pacingPull, 0, 'a title with no bars stays as it was');
assert.equal(plain.pacingHold, 0);
assert.equal(facts(evenEpisodeShares(8)).pacingPull, 0, 'even bars change nothing');
const facing = facts(getStudioSeasonShares('BIG_OPENING', 8));
const burning = facts(getStudioSeasonShares('SLOW_BURN', 8));
const ending = facts(getStudioSeasonShares('BIG_FINALE', 8));
assert.equal(facing.pacingPull, opening.pull);
assert.equal(facing.pacingHold, opening.keep);
assert.ok(facing.pacingPull! > burning.pacingPull! && facing.pacingPull! > ending.pacingPull!, 'a big opening pulls most in the first weeks');
assert.ok(burning.pacingHold! > facing.pacingHold! && burning.pacingHold! > ending.pacingHold!, 'a slow burn keeps most');

/* --- the bill follows the length */
const budget = { total: 40_000_000, baseCost: 5_000_000, scriptCost: 2_000_000, cast: 10_000_000, backgroundEnsemble: 1_000_000, director: 4_000_000, crew: 8_000_000, locationCost: 6_000_000, equipmentCost: 4_000_000, effectsCost: 0 };
assert.equal(scaleOriginalBudget(budget, 1), budget);
const twice = scaleOriginalBudget(budget, getOriginalEpisodeScale('SERIES', 16));
assert.equal(twice.cast, 20_000_000);
assert.equal(twice.scriptCost, 2_000_000, 'a script is bought once');
assert.equal(studioPossessive('Warner Bros.'), "Warner Bros.'");
assert.equal(studioPossessive('Artisan Pictures'), "Artisan Pictures'");
assert.equal(studioPossessive('Monarch'), "Monarch's");

/* --- the commission itself */
const base = advanceOriginalPitches({ ...prepareStreamingFullPlatformQa(fresh()) });
const rich: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, treasuryCash: 500_000_000 } };
const pitch = getLiveOriginalPitches(rich)[0];
assert.ok(pitch, 'the company has pitches');
const studio = getOriginalsStudios(rich).find(card => card.id === pitch.studioId)!;
const billInput = { ...budget, effectsCost: 0, musicBudget: 1_000_000 };
const bill = buildOriginalBill(billInput, 8, 20);
const commitmentId = 'job_original';
const job: any = { id: commitmentId, name: pitch.script.title, type: 'JOB', projectPhase: 'PRE_PRODUCTION', projectDetails: { title: pitch.script.title, studioId: studio.id, playerProductionFocus: { isPlayerProducer: true }, hiddenStats: {} } };
const withJob: Player = { ...rich, commitments: [...rich.commitments, job] };
const mode: OriginalWizardMode = {
    way: 'PITCH', locked: true, commissionId: getOriginalCommissionId(withJob, pitch.script.id), platformName: 'Test', treasury: 500_000_000,
    studioCard: studio, feePercent: 20, feeWhy: '', episodes: 8, pitch, onStepBack: () => {},
};
const before = withJob.ownedStreamingPlatform.treasuryCash;
const cashBefore = Number((withJob.world.studios as any)[studio.id].cashReserve);
const done = finalizeOriginalCommission(withJob, { mode, commitmentId, script: pitch.script, makerStudioId: studio.id, makerStudioName: studio.name, bill, deal: 'BUY' })!;
assert.ok(done, 'it goes through');
const platform = done.player.ownedStreamingPlatform;
assert.equal(platform.treasuryCash, before - bill.total, 'paid at once, all of it');
const record = platform.originalCommissions.at(-1)!;
assert.equal(record.id, mode.commissionId);
assert.equal(record.canonicalProjectId, commitmentId);
assert.equal(record.way, 'PITCH');
assert.equal(record.deal, 'BUY');
assert.equal(record.fee, bill.fee);
assert.equal(record.producerStudioId, studio.id);
assert.equal(record.status, 'GREENLIT');
assert.ok(platform.milestoneKeys.includes('first-original-greenlit'));
assert.ok(!getLiveOriginalPitches(done.player).some(item => item.id === pitch.id), 'the pitch is used up');
const job2 = done.player.commitments.find(item => item.id === commitmentId)!;
assert.equal(job2.projectDetails!.hiddenStats.outsideOriginal, true);
assert.equal(job2.projectDetails!.hiddenStats.ownedStreamingOriginal, true);
assert.equal(job2.projectDetails!.hiddenStats.ownedStreamingCommissionId, mode.commissionId);
assert.equal(job2.projectDetails!.playerProductionFocus!.isPlayerProducer, false, 'the player does not produce it');
assert.ok(Math.abs(Number((done.player.world.studios as any)[studio.id].cashReserve) - (cashBefore + bill.fee / 1e6)) < 1e-6, 'the studio keeps its fee');
assert.match(done.moment.headline, new RegExp(studio.name.replace(/[.]/g, '\\.')));
assert.ok(done.player.news[0].headline === done.moment.headline, 'it is in the news');
assert.ok(done.player.logs.at(-1)?.message.includes(pitch.script.title), 'and in the activity log');

/* it survives a save */
const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(done.player)));
const kept = reloaded.ownedStreamingPlatform.originalCommissions.at(-1)!;
assert.equal(kept.way, 'PITCH');
assert.equal(kept.fee, bill.fee);
assert.equal(kept.making, bill.making);

/* refused cleanly */
assert.equal(finalizeOriginalCommission(done.player, { mode, commitmentId, script: pitch.script, makerStudioId: studio.id, makerStudioName: studio.name, bill, deal: 'BUY' }), null, 'once only');
const broke: Player = { ...withJob, ownedStreamingPlatform: { ...withJob.ownedStreamingPlatform, treasuryCash: 10 } };
assert.equal(finalizeOriginalCommission(broke, { mode, commitmentId, script: pitch.script, makerStudioId: studio.id, makerStudioName: studio.name, bill, deal: 'BUY' }), null, 'no money, no commission');

/* a licence: cheaper, ends in 3 years, the studio carries the difference */
const licenceBill = buildOriginalBill(billInput, 8, 20, 'LICENCE');
const licensed = finalizeOriginalCommission(withJob, { mode, commitmentId, script: pitch.script, makerStudioId: studio.id, makerStudioName: studio.name, bill: licenceBill, deal: 'LICENCE' })!;
const licenceRecord = licensed.player.ownedStreamingPlatform.originalCommissions.at(-1)!;
assert.equal(licenceRecord.deal, 'LICENCE');
assert.equal(licenceRecord.contract?.sequelRightsIncluded, false);
assert.ok(licenceRecord.licenceEndsAtAbsoluteWeek! > licenceRecord.commissionedAtAbsoluteWeek + 150);
assert.ok(Number((licensed.player.world.studios as any)[studio.id].cashReserve) < cashBefore, 'the studio carries the rest');

/* your own script with an outside studio leaves your shelf; with your own studio it stays where the wizard put it */
const script = { id: 'own_script', title: 'Own Script', genres: ['DRAMA'], status: 'READY', quality: 70, options: [], writerId: null, weeksInDevelopment: 0, totalDevelopmentWeeks: 0, isOriginal: true, projectType: 'SERIES', episodes: 8 } as any;
const houseId = 'house';
const withHouse: Player = {
    ...withJob,
    businesses: [...withJob.businesses, { id: houseId, name: 'House', type: 'PRODUCTION_HOUSE', isActive: true, balance: 0, studioState: { scripts: [script], concepts: [createBlankOriginalConcept(script, 1)] } } as any],
};
assert.ok(hasOwnProductionHouse(withHouse));
assert.ok(getCommissionableScripts(withHouse).some(item => item.script.id === 'own_script'));
assert.ok(!getCommissionableScripts({ ...withHouse, businesses: withHouse.businesses.map(b => (b.id === houseId ? { ...b, studioState: { ...b.studioState, scripts: [{ ...script, lockedStreamingFunding: { id: 'x' } }] } } : b)) as any }).some(item => item.script.id === 'own_script'), 'a script promised to a platform cannot be ordered');
const outsideMode: OriginalWizardMode = { ...mode, way: 'OUTSIDE', locked: false, pitch: undefined, sourceStudioId: houseId, commissionId: getOriginalCommissionId(withHouse, script.id) };
const outside = finalizeOriginalCommission(withHouse, { mode: outsideMode, commitmentId, script, makerStudioId: studio.id, makerStudioName: studio.name, bill, deal: 'BUY' })!;
assert.ok(!outside.player.businesses.find(b => b.id === houseId)!.studioState!.scripts.some(item => item.id === 'own_script'), 'it left the shelf');
const ownMode: OriginalWizardMode = { ...outsideMode, way: 'OWN_STUDIO', studioCard: null, feePercent: 0 };
const ownBill = buildOriginalBill(billInput, 8, 0);
const own = finalizeOriginalCommission(withHouse, { mode: ownMode, commitmentId, script, makerStudioId: houseId, makerStudioName: 'House', bill: ownBill, deal: 'BUY' })!;
assert.equal(own.player.ownedStreamingPlatform.originalCommissions.at(-1)!.fee, 0, 'your own studio takes no fee');
assert.equal(own.player.commitments.find(item => item.id === commitmentId)!.projectDetails!.hiddenStats.outsideOriginal, undefined);
assert.match(own.moment.headline, /its own studio/);
assert.ok(own.player.businesses.find(b => b.id === houseId)!.studioState!.scripts.some(item => item.id === 'own_script'), 'the wizard deals with your own studio\'s shelf');

/* the stand-in lives only for the wizard */
const standIn = buildOutsideStudioStandIn(studio, script, createBlankOriginalConcept(script, 1), [] as any, 1);
assert.equal(standIn.id, studio.id);
assert.equal(standIn.balance, 0);
assert.deepEqual(standIn.studioState!.scripts.map(item => item.id), ['own_script']);

console.log('original commission audit passed');
