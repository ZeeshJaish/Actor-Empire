import type {
    IndustryContentFingerprint,
    IndustryProductionCommitment,
    NPCStudioState,
    Player,
    ProjectType,
    StudioAiSlateCommitment,
    WorldState,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { upsertCanonicalIndustryProduction } from '../industryProductions';
import { createProductionCalendar } from '../productionCalendar';
import { generateProjectTitle } from '../roleLogic';
import { appendStudioAiProductionKey } from './studioAiProductionState';
import { attachNormalizedStudioAiState } from './studioAiState';

const TERMINAL_STUDIOS = new Set(['DORMANT', 'SOLD_MERGED', 'CLOSED']);
const ACTIVE_PRODUCTION_STATUSES = new Set(['PLANNED', 'PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION', 'ON_HOLD', 'TURNAROUND']);

export interface StudioAiProductionHandoffInput {
    player: Player;
    world: WorldState;
    studio: NPCStudioState;
    absoluteWeek: number;
}

export interface StudioAiProductionHandoffResult {
    world: WorldState;
    studio: NPCStudioState;
    createdCount: number;
}

const getFingerprint = (studio: NPCStudioState, commitment: StudioAiSlateCommitment): IndustryContentFingerprint | undefined => (
    studio.ai?.intelligence?.content.selectedFingerprints.find(item => item.id === commitment.fingerprintId)
);

const projectTypeFor = (fingerprint: IndustryContentFingerprint): ProjectType => (
    fingerprint.format === 'MOVIE' ? 'MOVIE' : 'SERIES'
);

const buildCalendar = (
    fingerprint: IndustryContentFingerprint,
    budgetMillions: number,
    productionSkill: number,
    absoluteWeek: number,
) => {
    const isSeries = fingerprint.format !== 'MOVIE';
    const scale = budgetMillions >= 150 ? 3 : budgetMillions >= 80 ? 2 : budgetMillions >= 30 ? 1 : 0;
    const competenceReduction = Math.max(0, Math.min(3, Math.floor((productionSkill - 55) / 15)));
    return createProductionCalendar({
        preProductionWeeks: (isSeries ? 7 : 4) + Math.ceil(scale / 2),
        productionWeeks: Math.max(5, (isSeries ? 14 : 9) + scale * 2 - competenceReduction),
        postProductionWeeks: (isSeries ? 8 : 5) + scale,
        age: Math.floor(Math.max(0, absoluteWeek) / 52) + 1,
        week: Math.max(0, absoluteWeek) % 52 + 1,
    });
};

const findExistingProduction = (
    world: WorldState,
    commitmentId: string,
): IndustryProductionCommitment | undefined => Object.values(world.industryProductions || {})
    .find(production => production.studioAiSlateCommitmentId === commitmentId
        || production.studioAiExecution?.slateCommitmentId === commitmentId);

const updateCommitment = (
    studio: NPCStudioState,
    commitmentId: string,
    industryProductionId: string,
    absoluteWeek: number,
): NPCStudioState => ({
    ...studio,
    ai: {
        ...studio.ai!,
        slate: {
            ...studio.ai!.slate!,
            commitments: studio.ai!.slate!.commitments.map(item => item.id === commitmentId ? {
                ...item,
                status: 'HANDED_OFF' as const,
                industryProductionId,
                updatedAtAbsoluteWeek: absoluteWeek,
                nextReviewAbsoluteWeek: null,
            } : item),
        },
    },
});

export const handoffStudioAiGreenlights = (
    input: StudioAiProductionHandoffInput,
): StudioAiProductionHandoffResult => {
    let studio = attachNormalizedStudioAiState(input.studio, { absoluteWeek: input.absoluteWeek });
    if (studio.ai!.controller !== 'AI' || TERMINAL_STUDIOS.has(studio.ai!.status)) {
        return { world: input.world, studio: input.studio, createdCount: 0 };
    }
    let world = input.world;
    let createdCount = 0;
    const greenlights = studio.ai!.slate!.commitments
        .filter(item => item.source === 'INDEPENDENT' && item.status === 'GREENLIT')
        .sort((left, right) => (left.greenlitAtAbsoluteWeek || left.updatedAtAbsoluteWeek) - (right.greenlitAtAbsoluteWeek || right.updatedAtAbsoluteWeek)
            || left.id.localeCompare(right.id));

    for (const commitment of greenlights) {
        const existing = findExistingProduction(world, commitment.id);
        if (existing) {
            studio = updateCommitment(studio, commitment.id, existing.id, input.absoluteWeek);
            continue;
        }
        const activeCount = Object.values(world.industryProductions || {}).filter(production => (
            production.producerStudioId === studio.id && ACTIVE_PRODUCTION_STATUSES.has(production.status)
        )).length;
        if (activeCount >= studio.ai!.capacity.productionSlots) break;
        const fingerprint = getFingerprint(studio, commitment);
        const budgetMillions = commitment.greenlightBudgetMillions || 0;
        if (!fingerprint || fingerprint.ownerCompanyId !== studio.id || budgetMillions <= 0) continue;
        const productionId = createDeterministicId('studio_ai_production', studio.id, commitment.id);
        const canonicalProjectId = createDeterministicId('studio_ai_project', studio.id, commitment.id);
        const handoffKey = `b6-handoff:${commitment.id}`;
        const rng = createDeterministicRng(`${studio.ai!.seed}:${handoffKey}:title`);
        const existingTitles = [
            ...(world.projects || []).map(project => project.title),
            ...Object.values(world.industryProductions || {}).map(production => production.title),
        ];
        const title = generateProjectTitle(existingTitles, rng);
        const calendar = buildCalendar(fingerprint, budgetMillions, studio.ai!.competence.production, input.absoluteWeek);
        const production: IndustryProductionCommitment = {
            id: productionId,
            canonicalProjectId,
            title,
            projectType: projectTypeFor(fingerprint),
            genre: fingerprint.primaryGenre,
            producerStudioId: studio.id,
            source: 'STUDIO_INDEPENDENT',
            status: 'PLANNED',
            productionCalendar: calendar,
            budgetMillions,
            paidMillions: 0,
            talentBookingIds: [],
            writerSource: 'IN_HOUSE_TEAM',
            writerId: null,
            writerName: `${studio.name} Story Department`,
            writerSkill: Math.round((studio.ai!.competence.development + studio.ai!.competence.creative) / 2),
            studioAiSlateCommitmentId: commitment.id,
            industryContentFingerprintId: fingerprint.id,
            ...(fingerprint.canonicalUniverseId ? { universeId: fingerprint.canonicalUniverseId } : {}),
            studioAiExecution: {
                schemaVersion: 1,
                source: 'STUDIO_INDEPENDENT',
                slateCommitmentId: commitment.id,
                fingerprintId: fingerprint.id,
                fingerprintSnapshot: fingerprint,
                originalProducerStudioId: studio.id,
                controllerAtLastProgression: 'AI',
                selectedReleaseMode: null,
                publicReleaseStrategy: null,
                talentSelected: false,
                talent: null,
                finalQuality: null,
                result: null,
                problems: [],
                paidMilestoneIds: [],
                processedKeys: appendStudioAiProductionKey([], handoffKey),
                nextReviewAbsoluteWeek: input.absoluteWeek + 1,
                lastProgressedAbsoluteWeek: input.absoluteWeek,
            },
            createdAtAbsoluteWeek: input.absoluteWeek,
            updatedAtAbsoluteWeek: input.absoluteWeek,
        };
        world = {
            ...world,
            industryProductions: upsertCanonicalIndustryProduction(world.industryProductions, production),
        };
        studio = updateCommitment(studio, commitment.id, productionId, input.absoluteWeek);
        createdCount += 1;
    }

    return {
        world,
        studio: attachNormalizedStudioAiState(studio, { absoluteWeek: input.absoluteWeek }),
        createdCount,
    };
};
