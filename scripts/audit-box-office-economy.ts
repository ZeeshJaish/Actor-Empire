import type { ProjectHiddenStats } from '../types';
import { calculateDynamicBoxOfficeTotalCap } from '../services/roleLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const strongPackage = {
    scriptQuality: 96,
    directorQuality: 94,
    castingStrength: 95,
    distributionPower: 96,
    qualityScore: 95,
    rawHype: 97,
    fameMultiplier: 1.5,
} as unknown as ProjectHiddenStats;

const weakPackage = {
    scriptQuality: 48,
    directorQuality: 50,
    castingStrength: 52,
    distributionPower: 50,
    qualityScore: 49,
    rawHype: 48,
    fameMultiplier: 1,
} as unknown as ProjectHiddenStats;

const highStrong = calculateDynamicBoxOfficeTotalCap({
    budgetTier: 'HIGH',
    genre: 'SUPERHERO',
    hiddenStats: strongPackage,
    marketDemand: 1.15,
    studioGenreReputation: 80,
    capRoll: 0.98,
});
const highWeak = calculateDynamicBoxOfficeTotalCap({
    budgetTier: 'HIGH',
    genre: 'SUPERHERO',
    hiddenStats: weakPackage,
    capRoll: 0.2,
});
const blockbusterStrong = calculateDynamicBoxOfficeTotalCap({
    budgetTier: 'BLOCKBUSTER',
    genre: 'SCI_FI',
    hiddenStats: strongPackage,
    marketDemand: 1.15,
    studioGenreReputation: 80,
    capRoll: 0.98,
});

assert(highStrong.totalCap > 1_400_000_000, 'An exceptional high-budget event should not be capped near $1.4B.');
assert(highWeak.totalCap < highStrong.totalCap, 'A weak high-budget package must not earn the same ceiling as an excellent one.');
assert(blockbusterStrong.totalCap > highStrong.totalCap, 'Blockbusters should retain more upside than high-budget films.');
assert(blockbusterStrong.totalCap > 3_000_000_000, 'An exceptional blockbuster should retain credible upside above $3B.');
assert(blockbusterStrong.totalCap !== 3_000_000_000, 'Blockbuster outcomes must not land on a fixed $3B ceiling.');
assert(highStrong.label === 'BREAKOUT', 'An exceptional event should receive a breakout label.');

console.log('Box office economy audit passed.');
