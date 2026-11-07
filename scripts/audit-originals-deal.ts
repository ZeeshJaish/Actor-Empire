import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getOriginalsStudios } from '../services/originalsStudios';
import { buildOriginalBill, canStudioOfferLicence, getOriginalEpisodeScale, getStudioFee } from '../services/originalsDeal';
import { PHASE_ONE_ENERGY_COSTS } from '../services/energyCosts';

/* #278: the whole bill, and a fee that moves for real reasons. */

const player: Player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'originals-deal-audit', name: 'Audit', age: 30, currentWeek: 8 });
const studios = getOriginalsStudios(player);
assert.ok(studios.length >= 10);

/* --- the fee is 15 to 40, moves between deals, and differs between studios */
const allFees = studios.flatMap(studio => Array.from({ length: 200 }, (_, i) => getStudioFee(studio, `deal-${i}`).percent));
assert.ok(allFees.every(fee => fee >= 15 && fee <= 40 && Number.isInteger(fee)));
const spread = (fees: number[]) => Math.max(...fees) - Math.min(...fees);
for (const studio of studios) {
    const fees = Array.from({ length: 200 }, (_, i) => getStudioFee(studio, `deal-${i}`).percent);
    assert.ok(spread(fees) >= 3, `${studio.name}: the same studio asks differently from deal to deal`);
    assert.equal(getStudioFee(studio, 'same').percent, getStudioFee(studio, 'same').percent, 'one deal has one price');
}
const mean = (fees: number[]) => fees.reduce((sum, fee) => sum + fee, 0) / fees.length;
const feesOf = (card: any) => mean(Array.from({ length: 400 }, (_, i) => getStudioFee(card, `d${i}`).percent));

/* --- real reasons */
const base: any = { ...studios[0], name: 'Test', reputation: 70, creative: 70, negotiation: 70, budgetControl: 60, momentum: 50, hotStreak: false, runwayWeeks: 300, openSlots: 0 };
assert.ok(feesOf({ ...base, reputation: 95, creative: 90 }) > feesOf({ ...base, reputation: 40, creative: 50 }) + 4, 'quality and reputation set the level');
assert.ok(feesOf({ ...base, hotStreak: true, momentum: 80 }) > feesOf(base) + 2, 'a hot streak raises it');
assert.ok(feesOf({ ...base, runwayWeeks: 20 }) < feesOf(base) - 3, 'short of money lowers it');
assert.ok(feesOf({ ...base, openSlots: 3 }) < feesOf(base) - 2, 'short of work lowers it');
assert.ok(feesOf({ ...base, negotiation: 95 }) > feesOf({ ...base, negotiation: 40 }), 'a hard bargainer asks more');
assert.match(getStudioFee({ ...base, runwayWeeks: 10 }, 'x').why, /short of cash/);
assert.match(getStudioFee({ ...base, hotStreak: true, momentum: 95 }, 'roll-small-1').why, /hot streak|holding out|good price|asking|busy|empty/);
const fees = mean(allFees);
console.log(`average fee across real studios ${fees.toFixed(1)}% (rivals pay the player's studio 8 to 12%)`);
assert.ok(fees > 12 && fees < 26, 'an outside studio charges more than a rival pays the player, and not absurdly more');

/* --- the bill */
const input = { scriptCost: 1_500_000, director: 3_200_000, cast: 6_200_000, backgroundEnsemble: 300_000, crew: 6_400_000, locationCost: 2_800_000, equipmentCost: 3_600_000, effectsCost: 0, baseCost: 5_000_000, musicBudget: 2_000_000 };
const bill = buildOriginalBill(input, 8, 20);
assert.equal(bill.making, 31_000_000);
assert.equal(bill.fee, 6_200_000);
assert.equal(bill.total, 37_200_000);
assert.equal(bill.perEpisode, Math.round(37_200_000 / 8));
assert.deepEqual(bill.above.map(line => line.label), ['Script rights', 'Director', 'Principal cast', 'Background ensemble']);
assert.ok(bill.below.some(line => line.label === 'Soundtrack'));
assert.ok(!bill.below.some(line => line.label === 'Effects'), 'no effects line when there is no bill');
assert.ok(buildOriginalBill({ ...input, effectsCost: 500_000 }, 8, 20).below.some(line => line.label === 'Effects'));

const ownStudio = buildOriginalBill(input, 8, 0);
assert.equal(ownStudio.total, ownStudio.making, 'your own studio takes no fee');

const licence = buildOriginalBill(input, 8, 20, 'LICENCE');
assert.equal(licence.fee, 0);
assert.equal(licence.total, Math.round(31_000_000 * 0.72));
assert.ok(licence.total < bill.total * 0.65, 'a licence is clearly cheaper');
assert.ok(canStudioOfferLicence({ financiallyStrong: true }));
assert.ok(!canStudioOfferLicence({ financiallyStrong: false }));

/* --- a series costs by its length */
assert.equal(getOriginalEpisodeScale('SERIES', 8), 1);
assert.equal(getOriginalEpisodeScale('SERIES', 16), 2);
assert.equal(getOriginalEpisodeScale('SERIES', 4), 0.5);
assert.equal(getOriginalEpisodeScale('MOVIE', 16), 1);
assert.equal(getOriginalEpisodeScale('SERIES', undefined), 1);

assert.equal(PHASE_ONE_ENERGY_COSTS.ORIGINAL_COMMISSION, 15);
assert.equal(PHASE_ONE_ENERGY_COSTS.ORIGINAL_RENEWAL, 15);

console.log('originals deal audit passed');
