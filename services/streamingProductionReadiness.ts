import type { OwnedStreamingOriginalCommission, Player, StreamingOriginalCommissionStatus } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

/**
 * Production truth shared by the Originals desk and playback/catalogue gates.
 * Old commissions can retain GREENLIT after their canonical project completes;
 * deriving readiness repairs those saves without rewriting contracts or money.
 */
export const resolveStreamingProductionReadiness = (
    player: Player,
    projectId: string,
    commission?: OwnedStreamingOriginalCommission,
): { ready: boolean; status: StreamingOriginalCommissionStatus } => {
    const production = Object.values(player.world.industryProductions || {})
        .find(item => item.canonicalProjectId === projectId);
    const productionComplete = production && ['DELIVERED', 'AWAITING_RELEASE', 'RELEASED'].includes(production.status);
    if (production && !productionComplete) {
        // Explicit unfinished, held, turnaround and cancelled canonical projects
        // must not be made playable by a stale commission or released mirror.
        return { ready: false, status: production.status === 'PLANNED' ? 'GREENLIT' : 'IN_PRODUCTION' };
    }
    const commitment = player.commitments.find(item => item.id === projectId);
    if (!productionComplete && commitment && commitment.projectPhase !== 'AWAITING_RELEASE') {
        return {
            ready: false,
            status: ['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION'].includes(commitment.projectPhase || '')
                ? 'IN_PRODUCTION' : 'GREENLIT',
        };
    }
    if (player.activeReleases.some(project => project.id === projectId)
        || player.pastProjects.some(project => project.id === projectId)
        || player.world.projects.some(project => project.id === projectId)) {
        return { ready: true, status: 'RELEASED' };
    }
    if (production?.status === 'RELEASED') return { ready: true, status: 'RELEASED' };
    if (productionComplete || commitment?.projectPhase === 'AWAITING_RELEASE') return { ready: true, status: 'DELIVERED' };
    // Legacy owned-platform premieres had no external streaming state and
    // fell out of the generic release loop. Authorization is written only
    // after canonical delivery; require its matching ledger record to recover
    // that missing mirror, while explicit unfinished production above wins.
    const release = commission?.releasePlan;
    const authorizedDelivery = release && player.ownedStreamingPlatform.eventLedger.some(event =>
        (event.type === 'ORIGINAL_RELEASE_AUTHORIZED'
            || (event.type === 'SYSTEM_REPAIR' && event.idempotencyKey === `original-release:${commission.id}`))
        && event.metadata?.commissionId === commission.id
        && event.metadata?.projectId === projectId
        && event.metadata?.premiereAtAbsoluteWeek === release.premiereAtAbsoluteWeek);
    if (authorizedDelivery && release.premiereAtAbsoluteWeek <= getAbsoluteWeek(player.age, player.currentWeek)) {
        return { ready: true, status: 'RELEASED' };
    }
    const status = commission?.status || 'RELEASED';
    return { ready: !commission || status === 'DELIVERED' || status === 'RELEASED', status };
};
