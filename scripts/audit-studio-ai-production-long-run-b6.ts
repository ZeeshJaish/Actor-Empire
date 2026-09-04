// @ts-nocheck - executable 400-year simulation fixture.
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { normalizeStudioAiState } from '../services/studioAi';
import { executeStudioAiProductionWeek } from '../services/studioAi/studioAiProductionExecution';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const START = 2_000;
const WEEKS = 20_800;

const run = () => {
    const studio = { id: 'B6_LONG', name: 'Long Run Pictures', valuation: 50, reputation: 78, cashReserve: 100_000, recentHits: 2, archetype: 'COMMERCIAL' };
    studio.ai = normalizeStudioAiState(studio, { absoluteWeek: START });
    let world = { ...structuredClone(INITIAL_PLAYER.world), projects: [], studios: { [studio.id]: studio }, industryProductions: {}, talentBookings: [] };
    let player = { ...structuredClone(INITIAL_PLAYER), id: 'b6_long_player', world };
    for (let offset = 0; offset < WEEKS; offset += 1) {
        const absoluteWeek = START + offset;
        if (offset % 40 === 0) {
            const index = offset / 40;
            const fingerprintId = `long_fp_${index}`;
            const commitmentId = `long_slate_${index}`;
            const productionId = `long_prod_${index}`;
            const projectId = `long_project_${index}`;
            const commercialIntent = index % 5 === 0 ? 35 : index % 3 === 0 ? 95 : 72;
            const fingerprint = { id: fingerprintId, seed: fingerprintId, ownerCompanyId: studio.id, ownerCompanyKind: 'PRODUCTION_STUDIO', format: 'MOVIE', primaryGenre: index % 2 ? 'DRAMA' : 'ACTION', subgenre: 'Industry', tone: 'Driven', theme: 'Legacy', setting: 'Mumbai', period: 'Now', targetAudience: 'MASS', originalLanguage: 'Hindi', priorityMarket: 'INDIA', commercialIntent, prestigeIntent: 45 + index % 50, creativeRisk: 20 + index % 70, starPowerTarget: 70, releasePath: 'THEATRICAL_FIRST', sourceIntent: 'ORIGINAL', relationship: 'STANDALONE', budgetSuitability: { minimumMillions: 8, idealLowMillions: 15, idealHighMillions: 25, ambitiousMaximumMillions: 40 }, noveltySignature: `long:${index}`, noveltyScore: 45 + index % 50, createdAtAbsoluteWeek: absoluteWeek, decisionCycle: index, lifecycle: 'COMMITTED' };
            const currentStudio = world.studios[studio.id];
            const commitment = { id: commitmentId, proposalId: `proposal_${index}`, proposalKey: `key_${index}`, fingerprintId, source: 'INDEPENDENT', status: 'HANDED_OFF', industryProductionId: productionId, createdAtAbsoluteWeek: absoluteWeek, updatedAtAbsoluteWeek: absoluteWeek, nextReviewAbsoluteWeek: null, developmentSpendMillions: 1, rewriteCount: 0, proposedBudgetMillions: 20, greenlightBudgetMillions: 20, greenlitAtAbsoluteWeek: absoluteWeek, scores: { creative: 45 + index % 50, commercial: commercialIntent, prestige: 45 + index % 50, execution: 76, financialRisk: 30, greenlightConfidence: 75 } };
            world.studios[studio.id] = { ...currentStudio, ai: { ...currentStudio.ai, finance: { ...currentStudio.ai.finance, committedSpendMillions: currentStudio.ai.finance.committedSpendMillions + 20 }, slate: { ...currentStudio.ai.slate, commitments: [...currentStudio.ai.slate.commitments, commitment] }, intelligence: { ...currentStudio.ai.intelligence, content: { ...currentStudio.ai.intelligence.content, selectedFingerprints: [...currentStudio.ai.intelligence.content.selectedFingerprints, fingerprint] } } } };
            world.industryProductions[productionId] = { id: productionId, canonicalProjectId: projectId, title: `Long Run Feature ${index + 1}`, projectType: 'MOVIE', genre: fingerprint.primaryGenre, producerStudioId: studio.id, source: 'STUDIO_INDEPENDENT', status: 'PLANNED', productionCalendar: { preProductionWeeks: 1, productionWeeks: 1, postProductionWeeks: 1, totalWeeks: 3, focusWindowWeeks: 2, elapsedWeeks: 0, startedAbsoluteWeek: absoluteWeek }, budgetMillions: 20, paidMillions: 0, talentBookingIds: [], writerSource: 'IN_HOUSE_TEAM', writerId: null, writerName: 'Long Run Story Department', writerSkill: 75, studioAiSlateCommitmentId: commitmentId, industryContentFingerprintId: fingerprintId, createdAtAbsoluteWeek: absoluteWeek, updatedAtAbsoluteWeek: absoluteWeek, studioAiExecution: { schemaVersion: 1, source: 'STUDIO_INDEPENDENT', slateCommitmentId: commitmentId, fingerprintId, controllerAtLastProgression: 'AI', selectedReleaseMode: null, publicReleaseStrategy: null, talentSelected: false, talent: null, finalQuality: null, result: null, problems: [], paidMilestoneIds: [], processedKeys: [], nextReviewAbsoluteWeek: absoluteWeek + 1, lastProgressedAbsoluteWeek: absoluteWeek } };
        }
        const result = executeStudioAiProductionWeek({ player: { ...player, world }, world, absoluteWeek });
        world = result.world;
        player = { ...player, world };
    }
    const releases = world.projects.filter(project => project.studioId === studio.id);
    const results = Object.values(world.industryProductions).flatMap(production => production.studioAiExecution?.result || []);
    const compacted = compactPlayerForPersistence({ ...player, world });
    return {
        digest: releases.map(project => `${project.id}:${project.rating}:${project.boxOffice}`).join('|'),
        releases: releases.length,
        hits: results.filter(result => result.outcome === 'HIT').length,
        flops: results.filter(result => result.outcome === 'FLOP').length,
        delayed: Object.values(world.industryProductions).filter(production => (production.studioAiExecution?.problems || []).some(problem => problem.delayWeeks > 0)).length,
        duplicateIds: releases.length - new Set(releases.map(project => project.id)).size,
        retainedBytes: JSON.stringify(compacted).length,
    };
};

const first = run();
const replay = run();
assert.deepEqual(replay, first);
assert.ok(first.releases >= 500);
assert.ok(first.hits > 0 && first.flops > 0);
assert.ok(first.delayed > 0);
assert.equal(first.duplicateIds, 0);
assert.ok(first.retainedBytes < 3_500_000);
console.log('Studio AI B6 400-year audit passed.', { ...first, digest: `${first.digest.length} deterministic digest characters` });
