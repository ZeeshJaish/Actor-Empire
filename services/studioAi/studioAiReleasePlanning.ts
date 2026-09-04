import type { IndustryContentFingerprint, IndustryProductionCommitment, NPCStudioState, StudioAiReleaseMode, WorldState } from '../../types';
import { resolveStreamingRightsCompatibility } from '../streamingRightsCompatibility';
import { appendStudioAiProductionKey } from './studioAiProductionState';

export interface PlanStudioAiProductionReleaseInput {
    world: WorldState;
    studio: NPCStudioState;
    production: IndustryProductionCommitment;
    fingerprint: IndustryContentFingerprint;
    absoluteWeek: number;
}

export interface PlanStudioAiProductionReleaseResult {
    production: IndustryProductionCommitment;
    mode: StudioAiReleaseMode;
    blockedReason: 'MISSING_STREAMING_RIGHTS' | 'NONE';
    changed: boolean;
}

const hasActiveStreamingRight = (world: WorldState, projectId: string, sellerPartyId: string, absoluteWeek: number): boolean => (
    Object.values(world.streamingRightsContracts || {}).some(contract => {
        if (contract.sourceProjectId !== projectId || contract.status !== 'ACTIVE' || contract.startsAtAbsoluteWeek > absoluteWeek
            || contract.expiresAtAbsoluteWeek < absoluteWeek || !contract.buyerPlatformId) return false;
        const compatibility = resolveStreamingRightsCompatibility({
            world, sourceProjectId: projectId, buyerPlatformId: contract.buyerPlatformId, sellerPartyId,
            territory: contract.territory, countryIds: contract.countryIds,
            startsAtAbsoluteWeek: absoluteWeek, expiresAtAbsoluteWeek: contract.expiresAtAbsoluteWeek,
            windowType: contract.windowType || 'FIRST_WINDOW', exclusivity: contract.exclusivity,
            action: 'RELEASE', excludeContractIds: [contract.id],
        });
        return compatibility.available;
    })
);

export const planStudioAiProductionRelease = (input: PlanStudioAiProductionReleaseInput): PlanStudioAiProductionReleaseResult => {
    const execution = input.production.studioAiExecution;
    if (!execution || execution.selectedReleaseMode || !execution.finalQuality || input.production.status !== 'AWAITING_RELEASE') {
        return { production: input.production, mode: execution?.selectedReleaseMode || 'HOLD', blockedReason: execution?.releaseBlockedReason === 'MISSING_STREAMING_RIGHTS' ? 'MISSING_STREAMING_RIGHTS' : 'NONE', changed: false };
    }
    const needsStreaming = input.fingerprint.releasePath === 'STREAMING_FIRST' || input.fingerprint.releasePath === 'HYBRID';
    const streamingReady = hasActiveStreamingRight(input.world, input.production.canonicalProjectId, input.production.producerStudioId, input.absoluteWeek);
    const rightsHoldStartedAtAbsoluteWeek = execution.holdStartedAtAbsoluteWeek ?? input.absoluteWeek;
    const rightsMarketPatienceWeeks = 8 + Math.round((100 - input.studio.ai!.competence.distribution) / 12);
    const useTheatricalMarketFallback = needsStreaming
        && !streamingReady
        && input.absoluteWeek - rightsHoldStartedAtAbsoluteWeek >= rightsMarketPatienceWeeks;
    let mode: StudioAiReleaseMode;
    if (needsStreaming && !streamingReady && !useTheatricalMarketFallback) mode = 'HOLD';
    else if (useTheatricalMarketFallback) mode = 'LIMITED_THEATRICAL';
    else if (input.fingerprint.releasePath === 'STREAMING_FIRST') mode = 'STREAMING_ONLY';
    else if (input.fingerprint.releasePath === 'HYBRID') mode = 'THEATRICAL_THEN_STREAMING';
    else if (input.fingerprint.releasePath === 'LIMITED_EVENT') mode = 'LIMITED_THEATRICAL';
    else if (execution.finalQuality.prestigePotential >= 80 && execution.finalQuality.commercialPotential < 90) mode = 'PRESTIGE_THEATRICAL';
    else if (execution.finalQuality.commercialPotential >= 82) mode = 'WIDE_THEATRICAL';
    else mode = 'LIMITED_THEATRICAL';
    const blocked = mode === 'HOLD';
    const publicReleaseStrategy = mode === 'STREAMING_ONLY' ? 'STREAMING_ONLY' as const : blocked ? null : 'THEATRICAL' as const;
    const waitWeeks = blocked ? 4 : Math.max(1, 5 - Math.floor(input.studio.ai!.competence.distribution / 25));
    const production: IndustryProductionCommitment = {
        ...input.production,
        status: blocked ? 'ON_HOLD' : 'AWAITING_RELEASE',
        updatedAtAbsoluteWeek: input.absoluteWeek,
        studioAiExecution: {
            ...execution, selectedReleaseMode: mode, publicReleaseStrategy,
            releasePlannedAtAbsoluteWeek: input.absoluteWeek,
            plannedReleaseAbsoluteWeek: blocked ? undefined : input.absoluteWeek + waitWeeks,
            releaseBlockedReason: blocked ? 'MISSING_STREAMING_RIGHTS' : 'NONE',
            nextReviewAbsoluteWeek: blocked ? input.absoluteWeek + waitWeeks : input.absoluteWeek + 1,
            holdStartedAtAbsoluteWeek: blocked ? rightsHoldStartedAtAbsoluteWeek : null,
            processedKeys: appendStudioAiProductionKey(execution.processedKeys, `b6-release-plan:${input.production.id}:${mode}`),
        },
    };
    return { production, mode, blockedReason: blocked ? 'MISSING_STREAMING_RIGHTS' : 'NONE', changed: true };
};
