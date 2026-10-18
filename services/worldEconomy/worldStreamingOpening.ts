import type { Player } from '../../types';

/** The same opening-week offer is used by previews and the launch transaction.
 * A missing commit would hide scheduled/early titles and can inherit legacy maturity.
 */
export const stageWorldStreamingOpeningOffer = (player: Player, absoluteWeek: number): Player => {
    const platform = player.ownedStreamingPlatform;
    return {
        ...player,
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            metrics: { ...platform.metrics, subscribers: 0, netSubscriberMovement: 0 },
            launchProgram: { ...platform.launchProgram, status: 'LAUNCHED', completedAtAbsoluteWeek: absoluteWeek },
            marketOperations: platform.marketOperations.map(operation => operation.entryKind === 'OPENING' && operation.status === 'READY'
                ? { ...operation, status: 'ACTIVE' as const, activatedAtAbsoluteWeek: absoluteWeek } : operation),
            launchCommit: platform.launchCommit ?? {
                id: 'opening-offer-preview', idempotencyKey: 'opening-offer-preview', committedAtAbsoluteWeek: absoluteWeek,
                capacityPlan: 'STANDARD', capacityPlanCost: 0, readinessScore: 0,
                forecastLikelyConcurrentStreams: 0, forecastHighConcurrentStreams: 0,
                protectedPeakConcurrentStreams: 0, launchHeadroomPercent: 0, initialSubscribers: 0,
                openingDemandIndex: 0, playbackSuccessRate: 100, outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: platform.launchSlate?.entries.length || 0,
                openingOriginalTitle: '',
            },
        },
    };
};
