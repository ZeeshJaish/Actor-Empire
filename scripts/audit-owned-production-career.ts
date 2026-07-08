import assert from 'node:assert/strict';
import type { Business, Commitment, Player, ProjectHiddenStats } from '../types';
import {
    OWNED_PRODUCTION_ACTIONS,
    applyOwnedProductionFocusAction,
    deriveOwnedProductionCareerItems,
    getOwnedProductionActionProgress,
} from '../services/ownedProductionCareer';

const makeHiddenStats = (qualityScore = 58): ProjectHiddenStats => ({
    scriptQuality: 60,
    directorQuality: 62,
    castingStrength: 64,
    distributionPower: 50,
    rawHype: 45,
    qualityScore,
    prestigeBonus: 0,
});

const ownedStudio: Business = {
    id: 'studio_player',
    name: 'Player Pictures',
    type: 'PRODUCTION_HOUSE',
    level: 1,
    balance: 20_000_000,
    weeklyRevenue: 0,
    weeklyExpenses: 0,
    employees: [],
    products: [],
    stats: {
        weeklyRevenue: 0,
        weeklyExpenses: 0,
        weeklyProfit: 0,
        lifetimeRevenue: 0,
        valuation: 20_000_000,
        brandHealth: 55,
        customerSatisfaction: 55,
        riskLevel: 10,
        hype: 10,
    },
    createdWeek: 1,
    createdYear: 2026,
} as unknown as Business;

const makePlayer = (commitments: Commitment[]): Player => ({
    id: 'player',
    name: 'Player Star',
    gender: 'MALE',
    age: 28,
    currentWeek: 12,
    money: 50_000_000,
    energy: { current: 100, max: 100, lastRefillWeek: 12 },
    stats: {
        fame: 70,
        reputation: 70,
        talent: 65,
        health: 80,
        happiness: 75,
        followers: 100_000,
        experience: 40,
        skills: {
            expression: 60,
            memorization: 60,
            presence: 65,
            discipline: 62,
            action: 50,
            comedy: 50,
            drama: 50,
        },
        genreXP: {},
    },
    businesses: [ownedStudio],
    commitments,
    logs: [],
    pastProjects: [],
    activeReleases: [],
} as unknown as Player);

const makeCommitment = (overrides: Partial<Commitment> = {}): Commitment => ({
    id: 'owned_project',
    name: 'Empire Within',
    type: 'JOB',
    roleType: 'LEAD',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'PRE_PRODUCTION',
    phaseWeeksLeft: 3,
    totalPhaseDuration: 3,
    auditionPerformance: 0,
    productionPerformance: 0,
    projectDetails: {
        title: 'Empire Within',
        type: 'MOVIE',
        description: 'A player-owned studio feature.',
        studioId: 'studio_player' as any,
        subtype: 'STANDALONE',
        genre: 'DRAMA',
        budgetTier: 'MID',
        estimatedBudget: 18_000_000,
        visibleHype: 'LOW',
        hiddenStats: makeHiddenStats(),
        directorName: 'Player Star',
        directorId: 'PLAYER_SELF',
        director: { id: 'PLAYER_SELF', name: 'Player Star' },
        visibleDirectorTier: 'Self',
        visibleScriptBuzz: 'High',
        visibleCastStrength: 'Solid',
        castList: [
            {
                id: 'cast_player',
                role: 'Lead',
                roleId: 'lead',
                roleName: 'Lead',
                roleType: 'LEAD',
                actorId: 'PLAYER_SELF',
                name: 'Player Star',
                isPlayer: true,
                image: '',
                type: 'ACTOR',
                status: 'CONFIRMED',
            },
        ],
        crewList: [
            {
                id: 'PLAYER_SELF',
                name: 'Player Star',
                role: 'DIRECTOR',
                stats: { technical: 65 },
                salary: 0,
                status: 'SIGNED',
                tier: 'PROFESSIONAL',
                isPlayer: true,
            },
        ],
    },
    ...overrides,
});

const attachedProject = makeCommitment();
const attachedItems = deriveOwnedProductionCareerItems(makePlayer([attachedProject]));
assert.equal(attachedItems.length, 1, 'self-attached owned project should appear in Career production section');
assert.deepEqual(
    attachedItems[0].tracks.map(track => track.type).sort(),
    ['ACTING', 'DIRECTING', 'PRODUCING'],
    'self-cast and self-directed project should expose acting, directing, and producing tracks'
);
assert.equal(
    getOwnedProductionActionProgress(makeCommitment({ auditionPerformance: 100 }), 'ACTOR_PREP'),
    100,
    'legacy audition prep progress should prevent repeat table-read spending'
);
assert.equal(
    getOwnedProductionActionProgress(makeCommitment({ projectPhase: 'PRODUCTION', productionPerformance: 100 }), 'ACTOR_SCENE'),
    100,
    'legacy production performance should prevent repeat scene-work spending'
);

const expectedOwnedActingActions = [
    ['ACTOR_PREP', 'Table Read', 'Table Read', 'PRE_PRODUCTION', 8],
    ['ACTOR_SCENE', 'Scene Rehearsal', 'Scene Rehearsal', 'PRODUCTION', 12],
    ['ACTOR_BIG_PUSH', 'Big Performance Push', 'Big Perform.', 'PRODUCTION', 15],
] as const;

for (const [id, label, shortLabel, phase, energyCost] of expectedOwnedActingActions) {
    const action = (OWNED_PRODUCTION_ACTIONS as Record<string, { label: string; shortLabel: string; phase: string; energyCost: number }>)[id];
    assert.ok(action, `${label} should exist as an owned acting action`);
    assert.equal(action.label, label, `${label} should use the locked Phase 5 label`);
    assert.equal(action.shortLabel, shortLabel, `${label} should use compact button copy`);
    assert.equal(action.phase, phase, `${label} should appear in the right production phase`);
    assert.equal(action.energyCost, energyCost, `${label} should use the locked Phase 5 energy cost`);
}

const expectedOwnedDirectingActions = [
    ['DIRECTOR_PLAN', 'Director Prep', 'Director Prep', 'PRE_PRODUCTION', 10],
    ['DIRECTOR_SHOT_DECISION', 'Shot/Set Decision', 'Shot/Set', 'PRODUCTION', 12],
    ['DIRECTOR_MAJOR_PUSH', 'Major Creative Push', 'Creative Push', 'PRODUCTION', 18],
    ['DIRECTOR_RISKY_DECISION', 'Risky High-Pressure Decision', 'Risky Decision', 'PRODUCTION', 25],
    ['DIRECTOR_CUT', 'Cut Review', 'Cut Review', 'POST_PRODUCTION', 10],
] as const;

for (const [id, label, shortLabel, phase, energyCost] of expectedOwnedDirectingActions) {
    const action = (OWNED_PRODUCTION_ACTIONS as Record<string, { label: string; shortLabel: string; phase: string; energyCost: number }>)[id];
    assert.ok(action, `${label} should exist as an owned directing action`);
    assert.equal(action.label, label, `${label} should use the locked Phase 5 label`);
    assert.equal(action.shortLabel, shortLabel, `${label} should use compact button copy`);
    assert.equal(action.phase, phase, `${label} should appear in the right production phase`);
    assert.equal(action.energyCost, energyCost, `${label} should use the locked Phase 5 energy cost`);
}

const productionAttachedProject = makeCommitment({ projectPhase: 'PRODUCTION' });
const productionAttachedItems = deriveOwnedProductionCareerItems(makePlayer([productionAttachedProject]));
const productionActingTrack = productionAttachedItems[0].tracks.find(track => track.type === 'ACTING');
const productionDirectingTrack = productionAttachedItems[0].tracks.find(track => track.type === 'DIRECTING');
assert.deepEqual(
    productionActingTrack?.actions.map(action => action.id),
    ['ACTOR_SCENE', 'ACTOR_BIG_PUSH'],
    'production acting track should expose scene rehearsal and big performance push'
);
assert.deepEqual(
    productionDirectingTrack?.actions.map(action => action.id),
    ['DIRECTOR_SHOT_DECISION', 'DIRECTOR_MAJOR_PUSH', 'DIRECTOR_RISKY_DECISION'],
    'production directing track should expose set, major, and risky decisions'
);

const postAttachedProject = makeCommitment({ projectPhase: 'POST_PRODUCTION' });
const postAttachedItems = deriveOwnedProductionCareerItems(makePlayer([postAttachedProject]));
assert.deepEqual(
    postAttachedItems[0].tracks.map(track => track.type),
    ['DIRECTING', 'PRODUCING'],
    'post-production should hide acting track when no owned acting action is available'
);
const postDirectingTrack = postAttachedItems[0].tracks.find(track => track.type === 'DIRECTING');
assert.deepEqual(
    postDirectingTrack?.actions.map(action => action.id),
    ['DIRECTOR_CUT'],
    'post-production directing track should expose cut review'
);

const expectedProducerPolishActions = [
    ['PRODUCER_SCRIPT_REVIEW', 'Script Polish Review', 'Script Polish', 'PRE_PRODUCTION', 8],
    ['PRODUCER_CAST_CREW_PREP', 'Cast/Crew Prep', 'Cast Prep', 'PRE_PRODUCTION', 10],
    ['PRODUCER_SET_QUALITY', 'Set Quality Check', 'Set Check', 'PRODUCTION', 10],
    ['PRODUCER_EDIT_NOTES', 'Edit Notes', 'Edit', 'POST_PRODUCTION', 10],
    ['PRODUCER_RELEASE_POSITIONING', 'Release Positioning', 'Release', 'POST_PRODUCTION', 12],
] as const;

for (const [id, label, shortLabel, phase, energyCost] of expectedProducerPolishActions) {
    const action = (OWNED_PRODUCTION_ACTIONS as Record<string, { label: string; shortLabel: string; phase: string; energyCost: number }>)[id];
    assert.ok(action, `${label} should exist as a producer polish action`);
    assert.equal(action.label, label, `${label} should use the locked Phase 4 label`);
    assert.equal(action.shortLabel, shortLabel, `${label} should use compact button copy`);
    assert.equal(action.phase, phase, `${label} should appear in the right production phase`);
    assert.equal(action.energyCost, energyCost, `${label} should use the locked Phase 4 energy cost`);
}

const producerOnlyProject = makeCommitment({
    id: 'producer_only',
    roleType: undefined,
    projectDetails: {
        ...attachedProject.projectDetails!,
        directorId: 'npc_director',
        director: { id: 'npc_director', name: 'Hired Director' },
        castList: [
            {
                id: 'cast_hired',
                role: 'Lead',
                roleId: 'lead',
                roleName: 'Lead',
                roleType: 'LEAD',
                actorId: 'npc_actor',
                name: 'Hired Actor',
                isPlayer: false,
                image: '',
                type: 'ACTOR',
                status: 'CONFIRMED',
            },
        ],
        crewList: [
            {
                id: 'npc_director',
                name: 'Hired Director',
                role: 'DIRECTOR',
                stats: { technical: 72 },
                salary: 1_000_000,
                status: 'SIGNED',
                tier: 'PROFESSIONAL',
            },
        ],
    },
});
const producerOnlyItems = deriveOwnedProductionCareerItems(makePlayer([producerOnlyProject]));
assert.equal(producerOnlyItems.length, 1, 'owned producer-only project should appear');
assert.deepEqual(
    producerOnlyItems[0].tracks.map(track => track.type),
    ['PRODUCING'],
    'producer-only project should not invent acting or directing tracks'
);
assert.deepEqual(
    producerOnlyItems[0].tracks[0].actions.map(action => action.id),
    ['PRODUCER_SCRIPT_REVIEW', 'PRODUCER_CAST_CREW_PREP'],
    'pre-production producer track should expose script review and cast/crew prep'
);

const productionProducerProject = makeCommitment({ ...producerOnlyProject, projectPhase: 'PRODUCTION' });
const productionProducerItems = deriveOwnedProductionCareerItems(makePlayer([productionProducerProject]));
assert.deepEqual(
    productionProducerItems[0].tracks[0].actions.map(action => action.id),
    ['PRODUCER_SET_QUALITY'],
    'production producer track should expose set quality check'
);

const postProducerProject = makeCommitment({ ...producerOnlyProject, projectPhase: 'POST_PRODUCTION' });
const postProducerItems = deriveOwnedProductionCareerItems(makePlayer([postProducerProject]));
assert.deepEqual(
    postProducerItems[0].tracks[0].actions.map(action => action.id),
    ['PRODUCER_EDIT_NOTES', 'PRODUCER_RELEASE_POSITIONING'],
    'post-production producer track should expose edit notes and release positioning'
);

let polishedProject = makeCommitment({
    id: 'polish_cap',
    projectDetails: {
        ...attachedProject.projectDetails!,
        hiddenStats: makeHiddenStats(50),
    },
});
for (let i = 0; i < 20; i += 1) {
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'PRODUCER_SCRIPT_REVIEW').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'PRODUCER_CAST_CREW_PREP').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'PRODUCER_SET_QUALITY').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'PRODUCER_EDIT_NOTES').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'PRODUCER_RELEASE_POSITIONING').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'DIRECTOR_PLAN').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'DIRECTOR_SHOT_DECISION').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'DIRECTOR_MAJOR_PUSH').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'DIRECTOR_RISKY_DECISION').commitment;
    polishedProject = applyOwnedProductionFocusAction(makePlayer([polishedProject]), polishedProject, 'DIRECTOR_CUT').commitment;
}
assert.equal(
    polishedProject.projectDetails?.playerProductionFocus?.qualityLift,
    15,
    'producer/director polish should cap quality lift at 15 points'
);
assert.equal(
    polishedProject.projectDetails?.hiddenStats.qualityScore,
    65,
    'quality score should only receive the capped 15-point lift'
);

console.log('Owned production career audit passed.');
