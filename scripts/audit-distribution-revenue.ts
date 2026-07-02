import fs from 'node:fs';
import { calculateStreamingDistributionBreakdown, calculateTheatricalDistributionBreakdown, getReleaseRegionIdsForProject } from '../services/distributionRevenue';
import type { ProjectDetails } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeProject = (overrides: Partial<ProjectDetails> = {}): ProjectDetails => ({
    title: 'Distribution Test',
    type: 'MOVIE',
    description: 'A test release.',
    studioId: 'PLAYER_STUDIO' as ProjectDetails['studioId'],
    subtype: 'STANDALONE',
    genre: 'ACTION',
    format: 'LIVE_ACTION',
    budgetTier: 'HIGH',
    estimatedBudget: 95_000_000,
    releaseStrategy: 'THEATRICAL',
    visibleHype: 'HIGH',
    hiddenStats: {
        scriptQuality: 78,
        directorQuality: 74,
        castingStrength: 82,
        distributionPower: 78,
        rawHype: 84,
        qualityScore: 76,
        prestigeBonus: 0,
        fameMultiplier: 1.18,
        castDepthScore: 72
    },
    directorName: 'Audit Director',
    visibleDirectorTier: 'A',
    visibleScriptBuzz: 'HIGH',
    visibleCastStrength: 'HIGH',
    ...overrides
});

const explicitProject = makeProject({
    releaseRegionIds: ['NORTH_AMERICA', 'ASIA'],
    releaseChainSelections: {
        NORTH_AMERICA: ['EMPIRE_CINEMAS', 'CROWNSCREEN'],
        ASIA: ['Z_CINEMAS', 'PRISM_HALLS']
    }
});

const breakdown = calculateTheatricalDistributionBreakdown(explicitProject, 100_000_000, 1);
assert(breakdown.gross > 0 && breakdown.gross <= 112_000_000, 'Gross should be positive and bounded by distribution modifier.');
assert(breakdown.studioReceipts > 0, 'Studio receipts should be calculated.');
assert(breakdown.exhibitorReceipts > 0, 'Exhibitor receipts should be calculated.');
assert(breakdown.studioReceipts + breakdown.exhibitorReceipts === breakdown.gross, 'Studio and exhibitor receipts should reconcile to gross.');
assert(breakdown.studioShare > 0.4 && breakdown.studioShare < 0.7, 'Studio share should be a weighted chain result, not an all-or-nothing value.');
assert(Math.round(breakdown.studioShare * 100) !== 50, 'Studio share should no longer be a hard-coded 50%.');
assert(breakdown.regionReceipts.length === 2, 'Explicit selected regions should drive the breakdown.');
assert(breakdown.regionReceipts.every(region => region.chainReceipts.length === 2), 'Each selected region should preserve its selected cinema partners.');
assert(breakdown.totalScreens > 0 && breakdown.expectedFootfall > 0, 'Distribution breakdown should expose screens and expected footfall.');

const weekThree = calculateTheatricalDistributionBreakdown(explicitProject, 40_000_000, 3);
assert(
    weekThree.regionReceipts.some(region => region.holdModifier !== 1),
    'Later weeks should apply regional hold and chain volatility modifiers.'
);

const fallbackProject = makeProject({ releaseRegionIds: undefined, releaseChainSelections: undefined, screeningStrategy: 'NATIONAL' });
assert(getReleaseRegionIdsForProject(fallbackProject).length > 0, 'Legacy releases should receive a safe default theatrical footprint.');
const fallbackBreakdown = calculateTheatricalDistributionBreakdown(fallbackProject, 45_000_000, 1);
assert(fallbackBreakdown.regionReceipts.length > 0, 'Legacy releases should still generate regional receipts.');

const streamingBreakdown = calculateStreamingDistributionBreakdown(explicitProject, 'NETFLIX', 12_000_000, 950_000, 2);
assert(streamingBreakdown.regionBreakdowns.length === 6, 'Streaming breakdown should distribute audience across the playable regions.');
assert(streamingBreakdown.regionBreakdowns.reduce((sum, region) => sum + region.views, 0) === streamingBreakdown.views, 'Streaming regional views should reconcile to weekly views.');
assert(streamingBreakdown.regionBreakdowns.reduce((sum, region) => sum + region.revenue, 0) === streamingBreakdown.revenue, 'Streaming regional revenue should reconcile to weekly revenue.');
assert(streamingBreakdown.globalReachScore > 0, 'Streaming breakdown should expose a global reach score for reporting.');

const gameLoopSource = fs.readFileSync('services/gameLoop.ts', 'utf8');
assert(gameLoopSource.includes('calculateTheatricalDistributionBreakdown'), 'Game loop should use the distribution revenue engine.');
assert(gameLoopSource.includes('calculateStreamingDistributionBreakdown'), 'Game loop should use the streaming regional breakdown engine.');
assert(!gameLoopSource.includes('revenue * 0.5'), 'Game loop should not pay a flat 50% theatrical studio share.');
assert(gameLoopSource.includes('weeklyDistributionBreakdowns'), 'Game loop should persist weekly distribution breakdowns.');
assert(gameLoopSource.includes('weeklyStreamingBreakdowns'), 'Game loop should persist weekly streaming regional breakdowns.');

console.log('Distribution revenue audit passed.');
