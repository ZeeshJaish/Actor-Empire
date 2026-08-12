import { strict as assert } from 'node:assert';
import { ActiveRelease, Player } from '../types';
import {
    generateReleaseSocialReactions,
    getCriticTradeNarrative,
    getOpeningTradeNarrative,
} from '../services/releaseMediaNarrative';
import { generateReviews } from '../services/roleLogic';

const makeRelease = (overrides: Partial<ActiveRelease> = {}): ActiveRelease => ({
    id: 'release_media_test',
    name: 'Signal Fire',
    type: 'MOVIE',
    roleType: 'LEAD',
    distributionPhase: 'THEATRICAL',
    weekNum: 1,
    weeklyGross: [8_000_000],
    totalGross: 8_000_000,
    budget: 150_000_000,
    status: 'RUNNING',
    imdbRating: 3.4,
    productionPerformance: 45,
    projectDetails: {
        title: 'Signal Fire',
        type: 'MOVIE',
        description: 'Audit project',
        studioId: 'audit_studio' as any,
        subtype: 'ORIGINAL' as any,
        genre: 'DRAMA' as any,
        budgetTier: 'BLOCKBUSTER',
        estimatedBudget: 150_000_000,
        visibleHype: 'MID',
        hiddenStats: { qualityScore: 35, scriptQuality: 35, directorQuality: 42, castingStrength: 45, distributionPower: 50, rawHype: 30, prestigeBonus: 0 },
        directorName: 'Audit Director',
        visibleDirectorTier: 'PROFESSIONAL',
        visibleScriptBuzz: 'Mixed',
        visibleCastStrength: 'Solid',
    },
    ...overrides,
});

const makePlayer = (activeReleases: ActiveRelease[]): Player => ({
    businesses: [{ id: 'audit_studio', name: 'Northlight House' }],
    activeReleases,
} as unknown as Player);

const expensiveFlop = makeRelease();
const expensivePlayer = makePlayer([expensiveFlop]);
const expensiveOpening = getOpeningTradeNarrative(expensivePlayer, expensiveFlop);
const expensiveCritic = getCriticTradeNarrative(expensivePlayer, { ...expensiveFlop, weekNum: 2 });
assert(expensiveOpening?.headline.includes('$150M'), 'Large weak opening should name the actual budget.');
assert(expensiveOpening?.subtext.includes('cover its costs'), 'Large weak opening should explain the financial pressure.');
assert(expensiveCritic?.headline.includes('Northlight House') || expensiveCritic?.headline.includes('$150M'), 'Large poor reviews should reference scale or the studio.');

const leanBreakout = makeRelease({
    id: 'lean_breakout',
    name: 'Paper Moons',
    weekNum: 2,
    weeklyGross: [7_000_000],
    budget: 8_000_000,
    imdbRating: 9.1,
    projectDetails: { ...expensiveFlop.projectDetails, title: 'Paper Moons', budgetTier: 'LOW', estimatedBudget: 8_000_000, hiddenStats: { qualityScore: 91, scriptQuality: 92, directorQuality: 89, castingStrength: 86, distributionPower: 52, rawHype: 55, prestigeBonus: 0 } }
});
const leanPlayer = makePlayer([leanBreakout]);
const leanCritic = getCriticTradeNarrative(leanPlayer, leanBreakout);
assert(leanCritic?.headline.includes('$8.0M'), 'Lean breakout coverage should name the small production budget.');
assert(leanCritic?.subtext.includes('not simply'), 'Lean breakout coverage must praise craft, not cheapness alone.');

const social = generateReleaseSocialReactions(makePlayer([expensiveFlop, leanBreakout]));
assert(social.some(post => post.content.includes('Signal Fire') || post.content.includes('Northlight House')), 'X should react to an expensive film missing its opening.');
assert(social.some(post => post.content.includes('Paper Moons') || post.content.includes('Northlight House')), 'X should react to a small quality breakout.');

const expensiveReviews = generateReviews(30, 'DRAMA', 'Audit Actor', false, 80, 'BLOCKBUSTER', 'LIVE_ACTION', undefined, 'en', 150_000_000);
const leanReviews = generateReviews(92, 'DRAMA', 'Audit Actor', false, 80, 'LOW', 'LIVE_ACTION', undefined, 'en', 8_000_000);
assert(expensiveReviews.some(review => review.text.includes('$150M') || review.text.includes('expense')), 'IMDb critics should discuss poor expensive productions differently.');
assert(leanReviews.some(review => review.text.includes('$8.0M') || review.text.includes('modest budget') || review.text.includes('lean production')), 'IMDb critics should recognize strong small productions.');

console.log('Release media narrative audit passed.');
