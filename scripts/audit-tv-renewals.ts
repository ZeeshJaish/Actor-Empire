import { strict as assert } from 'node:assert';
import { calculateSeriesRenewalChance } from '../services/roleLogic';

const breakoutChance = calculateSeriesRenewalChance({
    budget: 70_000_000,
    rating: 8.4,
    role: 'LEAD',
    totalViews: 92_000_000,
    recentWeeklyViews: [18_000_000, 16_000_000, 14_500_000],
    streamingRevenue: 28_000_000,
    productionPerformance: 86,
    platformId: 'NETFLIX',
    genre: 'CRIME'
});

assert.ok(
    breakoutChance >= 82,
    `A heavily watched, well-rated actor-side series should be a strong renewal candidate. Got ${breakoutChance}.`
);

const weakChance = calculateSeriesRenewalChance({
    budget: 120_000_000,
    rating: 5.8,
    role: 'SUPPORTING',
    totalViews: 3_500_000,
    recentWeeklyViews: [1_200_000, 700_000, 350_000],
    streamingRevenue: 1_000_000,
    productionPerformance: 42,
    platformId: 'APPLE_TV',
    genre: 'ACTION'
});

assert.ok(
    weakChance <= 28,
    `An expensive, low-view series should not receive a generous renewal chance. Got ${weakChance}.`
);

const cultChance = calculateSeriesRenewalChance({
    budget: 24_000_000,
    rating: 8.8,
    role: 'ENSEMBLE',
    totalViews: 18_000_000,
    recentWeeklyViews: [4_000_000, 4_200_000, 4_500_000],
    streamingRevenue: 5_000_000,
    productionPerformance: 78,
    platformId: 'APPLE_TV',
    genre: 'DRAMA'
});

assert.ok(
    cultChance >= 62 && cultChance < breakoutChance,
    `A smaller prestige series with good legs should be plausible but below a breakout hit. Got ${cultChance}.`
);

console.log('TV renewal audit passed.');
