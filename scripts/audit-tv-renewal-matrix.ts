import { strict as assert } from 'node:assert';
import { ActiveRelease, Genre, LockedStreamingFunding, Player, RoleType } from '../types';
import { calculateFuturePotential, calculateSeriesRenewalChance } from '../services/roleLogic';
import {
    calculateContinuationReturnChance,
    getReturnStatusForContinuation
} from '../services/continuationReturnLogic';
import {
    applyLockedSeasonFunding,
    calculateBalancedNextSeasonFundingCap,
    PlatformFundingProfile
} from '../services/streamingFundingLogic';
import { resolveRareHollywoodChaos } from '../services/rareHollywoodChaos';

interface RenewalScenario {
    name: string;
    budget: number;
    rating: number;
    role: RoleType;
    totalViews: number;
    recentWeeklyViews: number[];
    streamingRevenue: number;
    productionPerformance: number;
    platformId: 'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE';
    genre: string;
    expectedMin: number;
    expectedMax: number;
}

const scenarios: RenewalScenario[] = [
    {
        name: 'Breakout Netflix crime hit',
        budget: 70_000_000,
        rating: 8.4,
        role: 'LEAD',
        totalViews: 92_000_000,
        recentWeeklyViews: [18_000_000, 16_000_000, 14_500_000],
        streamingRevenue: 66_000_000,
        productionPerformance: 86,
        platformId: 'NETFLIX',
        genre: 'CRIME',
        expectedMin: 82,
        expectedMax: 94
    },
    {
        name: 'Cult Apple prestige drama',
        budget: 24_000_000,
        rating: 8.8,
        role: 'ENSEMBLE',
        totalViews: 18_000_000,
        recentWeeklyViews: [4_000_000, 4_200_000, 4_500_000],
        streamingRevenue: 15_000_000,
        productionPerformance: 78,
        platformId: 'APPLE_TV',
        genre: 'DRAMA',
        expectedMin: 70,
        expectedMax: 90
    },
    {
        name: 'Profitable modest Hulu comedy',
        budget: 28_000_000,
        rating: 7.1,
        role: 'SUPPORTING',
        totalViews: 12_000_000,
        recentWeeklyViews: [3_000_000, 2_400_000, 2_250_000],
        streamingRevenue: 24_000_000,
        productionPerformance: 72,
        platformId: 'HULU',
        genre: 'COMEDY',
        expectedMin: 52,
        expectedMax: 76
    },
    {
        name: 'Good reviews but fading expensive show',
        budget: 130_000_000,
        rating: 7.8,
        role: 'LEAD',
        totalViews: 10_000_000,
        recentWeeklyViews: [5_000_000, 2_100_000, 1_100_000],
        streamingRevenue: 18_000_000,
        productionPerformance: 62,
        platformId: 'APPLE_TV',
        genre: 'ACTION',
        expectedMin: 30,
        expectedMax: 58
    },
    {
        name: 'Cheap sleeper with growing audience',
        budget: 12_000_000,
        rating: 7.5,
        role: 'MINOR',
        totalViews: 8_000_000,
        recentWeeklyViews: [1_100_000, 1_350_000, 1_800_000],
        streamingRevenue: 11_000_000,
        productionPerformance: 75,
        platformId: 'YOUTUBE',
        genre: 'DOCUMENTARY',
        expectedMin: 54,
        expectedMax: 78
    },
    {
        name: 'Expensive weak series',
        budget: 120_000_000,
        rating: 5.8,
        role: 'SUPPORTING',
        totalViews: 3_500_000,
        recentWeeklyViews: [1_200_000, 700_000, 350_000],
        streamingRevenue: 1_000_000,
        productionPerformance: 42,
        platformId: 'APPLE_TV',
        genre: 'ACTION',
        expectedMin: 8,
        expectedMax: 28
    }
];

console.log('\nTV RENEWAL MATRIX');
console.log('---------------------------------------------------------------');
for (const scenario of scenarios) {
    const chance = calculateSeriesRenewalChance(scenario);
    assert.ok(
        chance >= scenario.expectedMin && chance <= scenario.expectedMax,
        `${scenario.name}: expected ${scenario.expectedMin}-${scenario.expectedMax}, got ${chance}`
    );
    console.log(`${scenario.name.padEnd(40)} ${String(chance).padStart(3)}%`);
}

const originalRandom = Math.random;
let seed = 0x2f6e2b1;
Math.random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
};

console.log('\nSEEDED RENEWAL ROLLS (10,000 SEASONS EACH)');
console.log('---------------------------------------------------------------');
for (const scenario of scenarios) {
    let renewals = 0;
    let expectedChance = 0;
    for (let index = 0; index < 10_000; index += 1) {
        const result = calculateFuturePotential(
            'SERIES',
            'MID',
            0,
            scenario.budget,
            scenario.rating,
            scenario.genre,
            scenario.role,
            scenario
        );
        expectedChance = result.renewalChance;
        if (result.isRenewed) renewals += 1;
    }
    const observedRate = renewals / 100;
    assert.ok(
        Math.abs(observedRate - expectedChance) <= 1.5,
        `${scenario.name}: ${observedRate.toFixed(1)}% observed vs ${expectedChance}% expected`
    );
    console.log(
        `${scenario.name.padEnd(40)} ${observedRate.toFixed(1).padStart(5)}% observed / ${String(expectedChance).padStart(2)}% expected`
    );
}

const profitableFloor = calculateFuturePotential(
    'SERIES',
    'MID',
    105_000_000,
    50_000_000,
    6.3,
    'DRAMA',
    'SUPPORTING',
    {
        totalViews: 4_000_000,
        recentWeeklyViews: [1_500_000, 900_000, 500_000],
        streamingRevenue: 8_000_000,
        productionPerformance: 52,
        platformId: 'HULU'
    }
);
Math.random = originalRandom;
assert.equal(profitableFloor.renewalChance, 70);
console.log(`Profitable series above 2x ROI floor:       ${profitableFloor.renewalChance}%`);

const retentionBase = {
    budget: 50_000_000,
    rating: 7,
    role: 'LEAD' as const,
    totalViews: 15_000_000,
    streamingRevenue: 20_000_000,
    productionPerformance: 70,
    platformId: 'NETFLIX' as const,
    genre: 'CRIME'
};
const risingChance = calculateSeriesRenewalChance({
    ...retentionBase,
    recentWeeklyViews: [3_000_000, 3_300_000, 3_700_000]
});
const collapsingChance = calculateSeriesRenewalChance({
    ...retentionBase,
    recentWeeklyViews: [3_000_000, 1_500_000, 900_000]
});
assert.ok(risingChance > collapsingChance);

const fitChance = calculateSeriesRenewalChance({
    ...retentionBase,
    recentWeeklyViews: [3_000_000, 2_500_000, 2_200_000]
});
const mismatchChance = calculateSeriesRenewalChance({
    ...retentionBase,
    platformId: 'DISNEY_PLUS',
    recentWeeklyViews: [3_000_000, 2_500_000, 2_200_000]
});
assert.equal(fitChance - mismatchChance, 4);

console.log('\nSIGNAL COMPARISONS');
console.log('---------------------------------------------------------------');
console.log(`Growing audience vs collapsing audience: ${risingChance}% vs ${collapsingChance}%`);
console.log(`Platform genre fit vs mismatch:          ${fitChance}% vs ${mismatchChance}%`);

const makePlayer = (fame: number): Player => ({
    id: 'matrix_player',
    name: 'Matrix Player',
    age: 30,
    currentWeek: 20,
    stats: { fame }
} as Player);

const makeRelease = (
    roleType: RoleType,
    productionPerformance: number,
    imdbRating: number,
    genre: Genre = 'DRAMA'
): ActiveRelease => ({
    id: `return_${roleType}`,
    name: 'Return Test',
    type: 'SERIES',
    roleType,
    projectDetails: {
        title: 'Return Test',
        type: 'SERIES',
        description: 'Return test',
        studioId: 'NPC_STUDIO',
        subtype: 'STANDALONE',
        genre,
        budgetTier: 'MID',
        estimatedBudget: 40_000_000,
        visibleHype: 'MID',
        hiddenStats: {
            scriptQuality: 70,
            directorQuality: 70,
            castingStrength: 70,
            distributionPower: 70,
            rawHype: 70,
            qualityScore: 70,
            prestigeBonus: 0
        },
        directorName: 'Director',
        visibleDirectorTier: 'Established',
        visibleScriptBuzz: 'Positive',
        visibleCastStrength: 'Solid'
    },
    distributionPhase: 'STREAMING',
    weekNum: 5,
    weeklyGross: [],
    totalGross: 0,
    budget: 40_000_000,
    status: 'RUNNING',
    productionPerformance,
    imdbRating
});

const starLead = makeRelease('LEAD', 90, 8.5);
const weakMinor = makeRelease('MINOR', 35, 5.2);
const starLeadChance = calculateContinuationReturnChance(starLead, makePlayer(90));
const weakMinorChance = calculateContinuationReturnChance(weakMinor, makePlayer(10));
assert.equal(starLeadChance, 96);
assert.equal(weakMinorChance, 8);

const playerStudioReturn = getReturnStatusForContinuation(weakMinor, makePlayer(0), true, false, () => 0.99);
const universeReturn = getReturnStatusForContinuation(weakMinor, makePlayer(0), false, true, () => 0.99);
const actionWriteOut = getReturnStatusForContinuation(
    makeRelease('MINOR', 35, 5.2, 'ACTION'),
    makePlayer(0),
    false,
    false,
    (() => {
        const values = [0.99, 0.2];
        return () => values.shift() ?? 0.99;
    })()
);
const dramaWriteOut = getReturnStatusForContinuation(
    weakMinor,
    makePlayer(0),
    false,
    false,
    (() => {
        const values = [0.99, 0.8];
        return () => values.shift() ?? 0.99;
    })()
);
assert.equal(playerStudioReturn.status, 'RETURNING');
assert.equal(universeReturn.status, 'RETURNING');
assert.equal(actionWriteOut.status, 'KILLED_OFF');
assert.equal(dramaWriteOut.status, 'WRITTEN_OFF');

console.log('\nCAST RETURN AFTER A RENEWAL');
console.log('---------------------------------------------------------------');
console.log(`Famous lead, strong season:                 ${starLeadChance}% return chance`);
console.log(`Minor role, weak season:                     ${weakMinorChance}% return chance`);
console.log(`Player-owned studio continuation:            ${playerStudioReturn.status}`);
console.log(`Active universe contract continuation:       ${universeReturn.status}`);
console.log(`Failed return roll in dangerous genre:       ${actionWriteOut.status}`);
console.log(`Failed return roll in ordinary drama:        ${dramaWriteOut.status}`);

const netflix: PlatformFundingProfile = {
    id: 'NETFLIX',
    name: 'Netflix',
    baseBid: 12_000_000,
    qualityReq: 72,
    maxBudget: 420_000_000
};
const youtube: PlatformFundingProfile = {
    id: 'YOUTUBE',
    name: 'YouTube Premium',
    baseBid: 3_000_000,
    qualityReq: 38,
    maxBudget: 80_000_000
};
const netflixBreakout = calculateBalancedNextSeasonFundingCap({
    projectBudget: 180_000_000,
    packageScore: 93,
    currentOffer: 170_000_000,
    platform: netflix,
    genre: 'DRAMA',
    rating: 8.7,
    seasonOneViews: 120_000_000,
    streamingRevenue: 210_000_000,
    rawHype: 94,
    hasProvenIp: true,
    randomFactor: 0.5
});
const youtubeOrdinary = calculateBalancedNextSeasonFundingCap({
    projectBudget: 180_000_000,
    packageScore: 66,
    currentOffer: 90_000_000,
    platform: youtube,
    genre: 'ACTION',
    rating: 7,
    seasonOneViews: 12_000_000,
    streamingRevenue: 8_000_000,
    rawHype: 55,
    randomFactor: 0.5
});
assert.equal(netflixBreakout.tier, 'BREAKOUT');
assert.ok(netflixBreakout.amount > youtubeOrdinary.amount);
assert.ok(youtubeOrdinary.amount <= 85_000_000);

const lockedFund: LockedStreamingFunding = {
    id: 'matrix_fund',
    platformId: 'NETFLIX',
    platformName: 'Netflix',
    amount: 80_000_000,
    sourceProjectId: 'season_1',
    sourceTitle: 'Matrix Season 1',
    franchiseId: 'matrix',
    installmentNumber: 1,
    projectType: 'SERIES',
    createdWeek: 20,
    createdYear: 30
};
const underCap = applyLockedSeasonFunding({
    budget: 60_000_000,
    lockedFunding: lockedFund,
    lockedStreamingFunds: [lockedFund],
    projectId: 'season_2_under',
    studioBalance: 100_000_000
});
const overCap = applyLockedSeasonFunding({
    budget: 95_000_000,
    lockedFunding: lockedFund,
    lockedStreamingFunds: [lockedFund],
    projectId: 'season_2_over',
    studioBalance: 100_000_000
});
const reused = applyLockedSeasonFunding({
    budget: 40_000_000,
    lockedFunding: { ...lockedFund, usedByProjectId: 'season_2' },
    lockedStreamingFunds: [],
    projectId: 'season_3_exploit',
    studioBalance: 100_000_000
});
assert.equal(underCap.unusedFundingReturned, 20_000_000);
assert.equal(underCap.nextStudioBalance, 100_000_000);
assert.equal(overCap.studioSpend, 15_000_000);
assert.equal(overCap.nextStudioBalance, 85_000_000);
assert.equal(reused.lockedFundApplied, 0);
assert.equal(reused.studioSpend, 40_000_000);

console.log('\nPLATFORM FUNDING');
console.log('---------------------------------------------------------------');
console.log(`Netflix breakout cap:  $${(netflixBreakout.amount / 1_000_000).toFixed(1)}M (${netflixBreakout.tier})`);
console.log(`YouTube ordinary cap:   $${(youtubeOrdinary.amount / 1_000_000).toFixed(1)}M (${youtubeOrdinary.tier})`);
console.log(`$60M season / $80M cap: $${(underCap.unusedFundingReturned / 1_000_000).toFixed(1)}M returned`);
console.log(`$95M season / $80M cap: $${(overCap.studioSpend / 1_000_000).toFixed(1)}M studio spend`);
console.log(`Attempted funding reuse: $${(reused.lockedFundApplied / 1_000_000).toFixed(1)}M applied`);

const rareBase = makeRelease('LEAD', 82, 8.5);
rareBase.id = 'rare_revival';
rareBase.name = 'Cult Cancellation';
rareBase.streaming = {
    platformId: 'HULU',
    weekOnPlatform: 8,
    totalViews: 24_000_000,
    weeklyViews: [5_000_000, 4_700_000, 4_400_000, 4_200_000],
    isLeaving: false
};
rareBase.projectDetails.hiddenStats.platformId = 'HULU';
const revival = resolveRareHollywoodChaos({
    release: rareBase,
    player: makePlayer(50),
    isPlayerProduction: false,
    forcedKind: 'CANCELLED_SHOW_REVIVAL',
    random: () => 0
});
const weakFlop = makeRelease('SUPPORTING', 40, 4.8);
weakFlop.id = 'weak_flop';
weakFlop.streaming = {
    platformId: 'NETFLIX',
    weekOnPlatform: 5,
    totalViews: 1_000_000,
    weeklyViews: [600_000, 250_000, 100_000],
    isLeaving: false
};
const noRescue = resolveRareHollywoodChaos({
    release: weakFlop,
    player: makePlayer(10),
    isPlayerProduction: false,
    random: () => 0
});
assert.equal(revival?.kind, 'CANCELLED_SHOW_REVIVAL');
assert.equal(revival?.futurePotentialPatch.isRenewed, true);
assert.equal(noRescue, null);

console.log('\nRARE EXCEPTIONS AFTER NORMAL CANCELLATION');
console.log('---------------------------------------------------------------');
console.log(`Cult, acclaimed cancelled show: ${revival?.kind} by ${revival?.platformName}`);
console.log(`Very weak ordinary show:        ${noRescue === null ? 'NO RESCUE' : 'UNEXPECTED RESCUE'}`);
console.log('\nTV renewal matrix audit passed.');
