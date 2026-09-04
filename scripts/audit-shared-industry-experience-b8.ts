import assert from 'node:assert/strict';
import {
    createSharedIndustryB8ExperienceAccumulator,
    evaluateSharedIndustryB8Experience,
    finalizeSharedIndustryB8Experience,
    observeSharedIndustryB8Experience,
    type SharedIndustryB8ExperienceMetrics,
} from './helpers/sharedIndustryB8Experience';
import { INITIAL_PLAYER, type IndustryProject, type Player } from '../types';

const healthy = (overrides: Partial<SharedIndustryB8ExperienceMetrics> = {}): SharedIndustryB8ExperienceMetrics => ({
    regime: 'BASELINE',
    seed: 'controlled',
    measuredYears: 100,
    commercialYearWins: { NETFLIX: 40, OTHERS: 60 },
    majorExpensiveFailures: 2,
    smallRegionalBreakouts: 2,
    genuineCompanyFailures: 1,
    unexplainedRescueCashEvents: 0,
    exactNonLineageFingerprintRepeats: 0,
    materialPublicEvents: 6_000,
    routineAccountingEvents: 0,
    silentYears: 0,
    activeCompaniesAtEnd: 8,
    ...overrides,
});

const code = (metrics: SharedIndustryB8ExperienceMetrics | SharedIndustryB8ExperienceMetrics[], expected: string) => {
    const evaluation = evaluateSharedIndustryB8Experience(Array.isArray(metrics) ? metrics : [metrics]);
    assert.ok(evaluation.violations.some(item => item.code === expected), `expected ${expected}`);
};

code(healthy({ commercialYearWins: { NETFLIX: 70, OTHERS: 30 } }), 'EXCESSIVE_DOMINANCE');
assert.equal(
    evaluateSharedIndustryB8Experience([
        healthy({ regime: 'LEAN', commercialYearWins: { NETFLIX: 70, OTHERS: 30 } }),
    ]).violations.some(item => item.code === 'EXCESSIVE_DOMINANCE'),
    false,
    'the approved 65% dominance ceiling applies to the baseline aggregate, not a pressure regime',
);
code(healthy({ majorExpensiveFailures: 0 }), 'NO_MAJOR_FAILURE');
code(healthy({ smallRegionalBreakouts: 0 }), 'NO_SMALL_BREAKOUT');
code(healthy({ unexplainedRescueCashEvents: 1 }), 'UNEXPLAINED_RESCUE');
code(healthy({ exactNonLineageFingerprintRepeats: 1 }), 'FINGERPRINT_REPEAT');
code(healthy({ materialPublicEvents: 0, silentYears: 100 }), 'PUBLIC_SILENCE');
code(healthy({ materialPublicEvents: 100, routineAccountingEvents: 100 }), 'ROUTINE_EVENT_SPAM');
code(healthy({ materialPublicEvents: 1_000 }), 'PUBLIC_EVENT_DROUGHT');
code(healthy({ materialPublicEvents: 13_000 }), 'PUBLIC_EVENT_OVERLOAD');

assert.deepEqual(evaluateSharedIndustryB8Experience([healthy()]).violations, []);

const makeProject = (id: string, year: number): IndustryProject => ({
    id,
    title: `Archive order ${id}`,
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    targetAudience: 'PG-13',
    studioId: 'UNIVERSAL',
    budgetTier: 'MID',
    quality: 72,
    rating: 7.2,
    boxOffice: 80_000_000,
    year,
    weekReleased: 1,
    leadActorId: `actor-${id}`,
    leadActorName: `Actor ${id}`,
    directorName: `Director ${id}`,
    reviews: 'A solid release.',
});

const reorderedArchivePlayer = structuredClone(INITIAL_PLAYER) as Player;
const archiveAccumulator = createSharedIndustryB8ExperienceAccumulator('BASELINE', 'archive-order');
const firstArchiveProject = makeProject('first-seen-tail', 1);
reorderedArchivePlayer.world.projects = [firstArchiveProject];
observeSharedIndustryB8Experience(archiveAccumulator, reorderedArchivePlayer, 1);

// Ownership materialization and save compaction can place a new project before
// an already-observed tail item. The observer must not assume append-only order.
reorderedArchivePlayer.world.projects = [makeProject('inserted-before-seen-tail', 2), firstArchiveProject];
observeSharedIndustryB8Experience(archiveAccumulator, reorderedArchivePlayer, 53);
const reorderedArchiveMetrics = finalizeSharedIndustryB8Experience(
    archiveAccumulator,
    reorderedArchivePlayer,
    104,
);
assert.equal(
    Object.values(reorderedArchiveMetrics.commercialYearWins).reduce((sum, wins) => sum + wins, 0),
    2,
    'the observer must count new projects even when they appear before a previously seen archive tail',
);

console.log('Shared Industry B8 experience evaluator audit passed.');
