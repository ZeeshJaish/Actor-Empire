import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import {
    SHARED_INDUSTRY_B8_CHECKPOINTS,
    assertSharedIndustryB8Integrity,
    finalizeSharedIndustryB8Report,
    observeSharedIndustryB8Week,
} from './helpers/sharedIndustryB8Metrics';

assert.deepEqual(SHARED_INDUSTRY_B8_CHECKPOINTS, [520, 1_300, 2_600, 5_200, 20_800]);

const observed = observeSharedIndustryB8Week(undefined, structuredClone(INITIAL_PLAYER), 1);
const report = finalizeSharedIndustryB8Report({
    regime: 'BASELINE',
    seed: 'b8-foundation',
    snapshots: [observed],
});
assert.equal(report.horizonWeeks, 1);
assert.equal(report.integrity.nonFiniteValues, 0);
assert.equal(report.integrity.duplicateProjectIds, 0);
assert.deepEqual(assertSharedIndustryB8Integrity(report), []);

const broken = structuredClone(INITIAL_PLAYER);
const duplicateProject = {
    id: 'duplicate',
    title: 'Duplicate',
    genre: 'DRAMA',
    originalLanguageId: 'english',
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId: 'TEST_STUDIO',
    budgetTier: 'MID',
    quality: 60,
    rating: 6,
    boxOffice: 20_000_000,
    year: 18,
    weekReleased: 1,
    leadActorId: 'actor',
    leadActorName: 'Actor',
    directorId: 'director',
    directorName: 'Director',
    reviews: '',
    releaseStrategy: 'THEATRICAL',
    streamingWindows: [],
} as const;
broken.world.projects = [duplicateProject, { ...duplicateProject }] as never;
const brokenReport = finalizeSharedIndustryB8Report({
    regime: 'ADVERSE',
    seed: 'broken',
    snapshots: [observeSharedIndustryB8Week(undefined, broken, 2)],
});
assert.ok(
    assertSharedIndustryB8Integrity(brokenReport).some(item => item.code === 'DUPLICATE_PROJECT_ID'),
    'duplicate canonical project IDs must fail B8 integrity certification',
);

const activeProduction = structuredClone(INITIAL_PLAYER);
activeProduction.world.projects = [];
activeProduction.world.industryProductions = {
    active: {
        id: 'active',
        canonicalProjectId: 'future_project',
        status: 'PRODUCTION',
        budgetMillions: 20,
        paidMillions: 5,
        productionCalendar: { totalWeeks: 20, elapsedWeeks: 4 },
    },
} as never;
activeProduction.world.streamingRightsContracts = {
    future_right: { id: 'future_right', sourceProjectId: 'future_project' },
} as never;
const activeReport = finalizeSharedIndustryB8Report({
    regime: 'BASELINE',
    seed: 'active-production-reference',
    snapshots: [observeSharedIndustryB8Week(undefined, activeProduction, 3)],
});
assert.equal(activeReport.integrity.danglingProjectReferences, 0,
    'an active production is the canonical source until its public project is materialized');

activeProduction.world.industryProductions.active.status = 'RELEASED';
const missingReleaseReport = finalizeSharedIndustryB8Report({
    regime: 'BASELINE',
    seed: 'missing-released-project',
    snapshots: [observeSharedIndustryB8Week(undefined, activeProduction, 4)],
});
assert.equal(missingReleaseReport.integrity.danglingProjectReferences, 1,
    'a released production must retain its public canonical project');

console.log('Shared Industry B8 foundation audit passed.');
