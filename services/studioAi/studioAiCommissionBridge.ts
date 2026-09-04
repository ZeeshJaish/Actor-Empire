import type {
    IndustryProductionCommitment,
    NPCStudioState,
    StudioAiSlateCommitment,
    WorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { appendStudioAiSlateKey } from './studioAiSlateState';
import { attachNormalizedStudioAiState } from './studioAiState';

interface AdoptStudioIndustryCommissionsInput {
    world: WorldState;
    studio: NPCStudioState;
    absoluteWeek: number;
}

export interface AdoptStudioIndustryCommissionsResult {
    studio: NPCStudioState;
    adoptedCount: number;
}

const TERMINAL = new Set(['DORMANT', 'SOLD_MERGED', 'CLOSED']);

const resolveCommissionFingerprintId = (world: WorldState, production: IndustryProductionCommitment): string => {
    const platform = production.commissioningPlatformId ? world.platforms?.[production.commissioningPlatformId] : undefined;
    const planId = production.platformContentPlanId;
    const migration = platform?.ai?.intelligence?.platformMigration;
    const outcome = planId ? [...(migration?.outcomes || [])].reverse().find(item => item.canonicalReferenceIds.includes(planId)) : undefined;
    const proposal = outcome ? platform?.ai?.intelligence?.proposals.find(item => item.id === outcome.proposalId) : undefined;
    return proposal?.contentFingerprintId || `canonical:${production.canonicalProjectId}`;
};

export const adoptStudioIndustryCommissions = (input: AdoptStudioIndustryCommissionsInput): AdoptStudioIndustryCommissionsResult => {
    let studio = attachNormalizedStudioAiState(input.studio, { absoluteWeek: input.absoluteWeek });
    if (studio.ai!.controller !== 'AI' || TERMINAL.has(studio.ai!.status)) return { studio: input.studio, adoptedCount: 0 };
    let adoptedCount = 0;
    const productions = Object.values(input.world.industryProductions || {})
        .filter(production => production.producerStudioId === studio.id
            && Boolean(production.commissioningPlatformId)
            && !['DELIVERED', 'CANCELLED'].includes(production.status))
        .sort((left, right) => left.createdAtAbsoluteWeek - right.createdAtAbsoluteWeek || left.id.localeCompare(right.id));
    productions.forEach(production => {
        if (studio.ai!.slate!.commitments.some(item => item.industryProductionId === production.id)) return;
        const proposalKey = `commission:${production.id}`;
        const fingerprintId = resolveCommissionFingerprintId(input.world, production);
        const commitment: StudioAiSlateCommitment = {
            id: createDeterministicId('studio_ai_commission_slate', studio.id, production.id),
            proposalId: proposalKey,
            proposalKey,
            fingerprintId,
            source: 'COMMISSION',
            industryProductionId: production.id,
            commissioningPlatformId: production.commissioningPlatformId,
            status: 'HANDED_OFF',
            createdAtAbsoluteWeek: production.createdAtAbsoluteWeek,
            updatedAtAbsoluteWeek: Math.max(production.updatedAtAbsoluteWeek, input.absoluteWeek),
            nextReviewAbsoluteWeek: null,
            developmentSpendMillions: 0,
            rewriteCount: 0,
            proposedBudgetMillions: production.budgetMillions,
            greenlightBudgetMillions: production.budgetMillions,
            greenlitAtAbsoluteWeek: production.createdAtAbsoluteWeek,
            legacyReleaseConsumedAtAbsoluteWeek: production.createdAtAbsoluteWeek,
        };
        studio = {
            ...studio,
            ai: {
                ...studio.ai!,
                slate: {
                    ...studio.ai!.slate!,
                    commitments: [...studio.ai!.slate!.commitments, commitment],
                    processedProposalKeys: appendStudioAiSlateKey(studio.ai!.slate!.processedProposalKeys, proposalKey),
                },
            },
        };
        adoptedCount += 1;
    });
    return {
        studio: adoptedCount ? attachNormalizedStudioAiState(studio, { absoluteWeek: input.absoluteWeek }) : studio,
        adoptedCount,
    };
};

export const consumeStudioGreenlightForLegacyRelease = (
    inputStudio: NPCStudioState,
    absoluteWeek: number,
): { studio: NPCStudioState; commitment: StudioAiSlateCommitment | null } => {
    const studio = attachNormalizedStudioAiState(inputStudio, { absoluteWeek });
    const commitment = studio.ai!.slate!.commitments
        .filter(item => item.source === 'INDEPENDENT' && item.status === 'GREENLIT' && item.legacyReleaseConsumedAtAbsoluteWeek === undefined)
        .sort((left, right) => (left.greenlitAtAbsoluteWeek || left.updatedAtAbsoluteWeek) - (right.greenlitAtAbsoluteWeek || right.updatedAtAbsoluteWeek) || left.id.localeCompare(right.id))[0];
    if (!commitment) return { studio, commitment: null };
    const consumed = {
        ...commitment,
        status: 'HANDED_OFF' as const,
        updatedAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)),
        legacyReleaseConsumedAtAbsoluteWeek: Math.max(0, Math.round(absoluteWeek)),
    };
    const releasedReservation = commitment.greenlightBudgetMillions || 0;
    return {
        studio: {
            ...studio,
            ai: {
                ...studio.ai!,
                finance: {
                    ...studio.ai!.finance,
                    committedSpendMillions: Math.max(0, Math.round((studio.ai!.finance.committedSpendMillions - releasedReservation) * 1000) / 1000),
                },
                slate: {
                    ...studio.ai!.slate!,
                    commitments: studio.ai!.slate!.commitments.map(item => item.id === commitment.id ? consumed : item),
                },
            },
        },
        commitment: consumed,
    };
};
