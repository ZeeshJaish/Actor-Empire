import { INITIAL_PLAYER, type Player } from '../types';
import {
    buildBackgroundCastingPlan,
    createLivingEnsembleSeeds,
    normalizeLivingEnsembleState,
    processLivingEnsembleWeek,
} from '../services/livingEnsemble';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const lean = buildBackgroundCastingPlan({
    projectId: 'lean',
    title: 'Quiet Room',
    genre: 'DRAMA',
    projectType: 'MOVIE',
    castShape: 'INTIMATE',
});
const epic = buildBackgroundCastingPlan({
    projectId: 'epic',
    title: 'Last City',
    genre: 'ACTION',
    projectType: 'MOVIE',
    castShape: 'ENSEMBLE',
    budget: 180_000_000,
}, {
    scale: 'EPIC',
    source: 'SPECIALIST',
    payStandard: 'PREMIUM',
    control: 'REVIEW',
});
const community = buildBackgroundCastingPlan({
    projectId: 'community',
    title: 'Home Street',
    genre: 'DRAMA',
    projectType: 'MOVIE',
}, {
    scale: 'STORY_FIT',
    source: 'COMMUNITY',
    payStandard: 'COMMUNITY_SUPPORTED',
});

assert(epic.performerCount > lean.performerCount, 'Epic scale should create a larger ensemble than an intimate project.');
assert(epic.estimatedCost > lean.estimatedCost, 'Premium specialist casting should cost more than a lean ensemble.');
assert(community.estimatedCost > 0, 'Community-supported performers must still receive transport, meals, insurance, and a stipend.');
assert(epic.specialistRoles.includes('Stunt background'), 'Action projects should detect stunt specialists.');

const seedInput = {
    projectId: 'deterministic_project',
    projectTitle: 'Same Story',
    genre: 'CRIME' as const,
    week: 8,
    year: 26,
    plan: buildBackgroundCastingPlan({
        projectId: 'deterministic_project',
        title: 'Same Story',
        genre: 'CRIME',
        projectType: 'MOVIE',
    }, {
        scale: 'FULL_WORLD',
        source: 'OPEN_CALL',
        payStandard: 'FAIR_PAY',
        control: 'CUSTOM',
    }),
};
const firstSeeds = createLivingEnsembleSeeds(seedInput);
const secondSeeds = createLivingEnsembleSeeds(seedInput);
assert(JSON.stringify(firstSeeds) === JSON.stringify(secondSeeds), 'Career seeds must be deterministic for the same project and plan.');
assert(firstSeeds.every(seed => seed.id.startsWith('ensemble_deterministic_project_')), 'Career seed IDs should be project-stable.');

let player = clone(INITIAL_PLAYER) as Player;
player.age = 24;
player.currentWeek = 1;
player.flags = { ...player.flags, extraNPCs: [] };
player.commitments = Array.from({ length: 42 }, (_, index) => ({
    id: `ensemble_audit_project_${index}`,
    name: `World Project ${index + 1}`,
    type: index % 3 === 0 ? 'ACTING_GIG' as const : 'JOB' as const,
    roleType: 'SUPPORTING' as const,
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM' as const,
    projectPhase: 'PRODUCTION' as const,
    projectDetails: {
        title: `World Project ${index + 1}`,
        type: index % 4 === 0 ? 'SERIES' as const : 'MOVIE' as const,
        description: 'Audit fixture',
        studioId: index % 2 === 0 ? 'PARAMOUNT' : 'HBO',
        subtype: 'STANDALONE' as const,
        genre: (['ACTION', 'DRAMA', 'CRIME', 'MUSICAL', 'SCI_FI'] as const)[index % 5],
        budgetTier: index % 4 === 0 ? 'HIGH' as const : 'MID' as const,
        estimatedBudget: 12_000_000 + index * 3_000_000,
        visibleHype: 'MID' as const,
        hiddenStats: {
            scriptQuality: 70,
            directorQuality: 70,
            castingStrength: 65,
            distributionPower: 60,
            rawHype: 45,
            qualityScore: 70,
            prestigeBonus: 2,
        },
        directorName: 'Audit Director',
        visibleDirectorTier: 'Professional',
        visibleScriptBuzz: 'Mid',
        visibleCastStrength: 'Solid',
        episodes: index % 4 === 0 ? 8 : undefined,
    },
}));

player = processLivingEnsembleWeek(player);
const initialState = normalizeLivingEnsembleState(player.flags.livingEnsembleState);
assert(initialState.seeds.length <= 60, 'Dormant career seeds must stay within the mobile save cap.');
assert(initialState.registeredProjectIds.length === 42, 'Owned and outside commitments should both register with the ensemble system.');
assert(player.commitments.every(commitment => commitment.projectDetails?.backgroundCastingPlan), 'Outside projects should receive an automatic background casting plan.');

const sameQuarter = processLivingEnsembleWeek(player);
const sameQuarterState = normalizeLivingEnsembleState(sameQuarter.flags.livingEnsembleState);
assert(sameQuarterState.seeds.length === initialState.seeds.length, 'Reprocessing the same quarter must not duplicate seeds.');
assert(sameQuarterState.stories.length === initialState.stories.length, 'Reprocessing the same quarter must not duplicate stories.');

for (let quarter = 1; quarter <= 100; quarter += 1) {
    const totalWeek = 24 * 52 + quarter * 13;
    player = {
        ...player,
        age: Math.floor(totalWeek / 52),
        currentWeek: (totalWeek % 52) + 1,
    };
    player = processLivingEnsembleWeek(player);
}

const matureState = normalizeLivingEnsembleState(player.flags.livingEnsembleState);
const combinationCount = new Set(matureState.stories.map(story => story.combinationKey)).size;
assert(matureState.seeds.length <= 60, 'Long careers must keep the dormant seed cap.');
assert(matureState.stories.length <= 40, 'Alumni history must keep the story cap.');
assert((player.flags.extraNPCs || []).length <= 240, 'Promoted alumni must respect the shared NPC cap.');
assert(matureState.stories.length === 0 || combinationCount >= Math.min(3, matureState.stories.length), 'Alumni stories should vary across career routes and frames.');
assert(matureState.stories.every(story => story.headline && story.subtext && story.combinationKey), 'Every alumni story must be fully attributable and auditable.');

console.log('Living Ensemble audit passed.');
console.log(JSON.stringify({
    leanPerformers: lean.performerCount,
    epicPerformers: epic.performerCount,
    registeredProjects: initialState.registeredProjectIds.length,
    activeSeeds: matureState.seeds.length,
    alumniStories: matureState.stories.length,
    uniqueStoryCombinations: combinationCount,
    promotedNpcCount: (player.flags.extraNPCs || []).filter((npc: any) => String(npc.id).startsWith('npc_alumni_')).length,
}, null, 2));
