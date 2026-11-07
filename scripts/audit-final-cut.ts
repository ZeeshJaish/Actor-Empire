/* #314: nothing made in this game comes out perfect. Maxing everything never reaches the top, and the edit moves a film a little either way. */
import assert from 'node:assert/strict';
import type { Commitment } from '../types';
import { applyFinalCut, FINAL_CUT_SWING, FINAL_QUALITY_CEILING, FINAL_RATING_CEILING, getFinalQualityRange, rollFinalCut, settleFinalQuality, squeezeFinalQuality, squeezeFinalRating } from '../services/finalCut';
import { calculateIMDbRating } from '../services/roleLogic';

/* the squeeze */
assert.equal(squeezeFinalQuality(60), 60);
assert.equal(squeezeFinalQuality(85), 85);
assert.equal(squeezeFinalQuality(95), 90);
assert.equal(squeezeFinalQuality(100), 92.5);

/* the roll: both ways, small more often than big, and fixed for a project */
const rolls = Array.from({ length: 4000 }, (_, index) => rollFinalCut(`film-${index}`));
assert.ok(rolls.every(roll => Math.abs(roll) <= FINAL_CUT_SWING));
assert.ok(rolls.some(roll => roll >= 2.5) && rolls.some(roll => roll <= -2.5), 'it can go either way');
const small = rolls.filter(roll => Math.abs(roll) <= 1.5).length / rolls.length;
assert.ok(small > 0.5 && small < 0.8, `most moves are small (${small})`);
const mean = rolls.reduce((sum, roll) => sum + roll, 0) / rolls.length;
assert.ok(Math.abs(mean) < 0.2, `no lean up or down (${mean})`);
assert.equal(rollFinalCut('same'), rollFinalCut('same'), 'reloading cannot re-roll');

/* a maxed film never reaches the top, wherever the roll lands */
const maxed = Array.from({ length: 4000 }, (_, index) => settleFinalQuality(100, `max-${index}`).quality);
assert.ok(Math.max(...maxed) <= FINAL_QUALITY_CEILING);
assert.ok(Math.max(...maxed) < 100 && Math.min(...maxed) >= 88, `${Math.min(...maxed)} to ${Math.max(...maxed)}`);
assert.ok(new Set(maxed).size >= 5, 'even a maxed film comes out differently');

/* a bad film can still surprise, and stays a real number */
assert.ok(settleFinalQuality(1, 'tiny').quality >= 1);

/* the promise before the film is made holds what can really come out */
const range = getFinalQualityRange(70, 110);
assert.equal(range.high, FINAL_QUALITY_CEILING);
assert.equal(range.low, 66);
for (let index = 0; index < 500; index += 1) {
    const { quality } = settleFinalQuality(90, `range-${index}`);
    const shown = getFinalQualityRange(90, 90);
    assert.ok(quality >= shown.low && quality <= shown.high);
}

/* locked once */
const film = (id: string, qualityScore: number, extra: Record<string, unknown> = {}): Commitment => ({
    id, name: id, type: 'JOB', roleType: 'LEAD', productionPerformance: 100, weeklyEarnings: 0,
    projectDetails: {
        title: id, genre: 'DRAMA', budgetTier: 'HIGH', estimatedBudget: 100_000_000,
        hiddenStats: { qualityScore, scriptQuality: 100, directorQuality: 100, castingStrength: 100, distributionPower: 80, rawHype: 60, prestigeBonus: 0, castDepthScore: 90 },
        ...extra,
    },
} as unknown as Commitment);
const once = applyFinalCut(film('locked', 100));
assert.ok(once.commitment.projectDetails!.hiddenStats.finalCutRoll !== undefined);
assert.ok(once.commitment.projectDetails!.hiddenStats.qualityScore < 100);
const twice = applyFinalCut(once.commitment);
assert.equal(twice.commitment, once.commitment, 'a locked film stays as it is');
assert.equal(twice.note, '');
const notes = Array.from({ length: 300 }, (_, index) => applyFinalCut(film(`note-${index}`, 80)).note);
assert.ok(notes.some(note => note.includes('better')) && notes.some(note => note.includes('edit')) && notes.some(note => note === ''));

/* the authored classics keep their authored number */
const classic = applyFinalCut(film('classic', 98, { isFamous: true }));
assert.equal(classic.commitment.projectDetails!.hiddenStats.qualityScore, 98);
assert.equal(classic.commitment.projectDetails!.hiddenStats.finalCutRoll, undefined);

/* the rating has the same top */
assert.equal(squeezeFinalRating(8.4), 8.4);
assert.equal(squeezeFinalRating(9), 9);
assert.equal(squeezeFinalRating(9.4), 9.2);
assert.equal(squeezeFinalRating(10.3), FINAL_RATING_CEILING);
const maxedRatings = Array.from({ length: 2000 }, (_, index) => calculateIMDbRating(applyFinalCut(film(`r-${index}`, 100)).commitment));
assert.ok(Math.max(...maxedRatings) <= FINAL_RATING_CEILING, `${Math.max(...maxedRatings)}`);
assert.ok(new Set(maxedRatings).size >= 3, 'a rating is never a sure thing');

console.log(JSON.stringify({ maxedQuality: [Math.min(...maxed), Math.max(...maxed)], maxedRating: [Math.min(...maxedRatings), Math.max(...maxedRatings)], smallShare: small, mean }));
console.log('final-cut audit passed');
