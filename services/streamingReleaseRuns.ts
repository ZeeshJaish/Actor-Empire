import type { ActiveRelease, Player, StreamingPlatformRun } from '../types';

export const buildStreamingPlatformRunsForProject = (
    player: Pick<Player, 'world'>,
    projectId: string,
    existingRuns: StreamingPlatformRun[] = [],
    legacyRelease?: Pick<ActiveRelease, 'streaming' | 'streamingContractId'>,
): StreamingPlatformRun[] => {
    const existingByContract = new Map(existingRuns.map(run => [run.contractId, run]));
    const primaryPlatformId = legacyRelease?.streaming?.platformId;
    const referencedId = legacyRelease?.streamingContractId || legacyRelease?.streaming?.contractId;
    const projectContracts = Object.values(player.world.streamingRightsContracts || {})
        .filter(contract => contract.sourceProjectId === projectId && Boolean(contract.buyer.platformId));
    const contracts = projectContracts.filter(contract => (
        contract.status === 'ACTIVE' || existingByContract.has(contract.id) || contract.id === referencedId
    ));
    const primaryContracts = contracts.filter(contract => contract.buyer.platformId === primaryPlatformId);
    // Aggregate legacy history belongs to one known placement, never every shared buyer.
    const primaryContractId = primaryContracts.find(contract => contract.id === referencedId)?.id
        || ((!referencedId || referencedId.startsWith('legacy:')) && primaryContracts.length === 1
            ? primaryContracts[0].id : undefined);
    return contracts
        .map(contract => {
            const existing = existingByContract.get(contract.id);
            if (existing) {
                const aggregate = legacyRelease?.streaming;
                const savedHistory = aggregate?.weeklyViews || [];
                // The old reset left a short canonical suffix beside a longer aggregate
                // history. Recover only a single placement with that exact suffix;
                // shared-buyer aggregate totals cannot be assigned to one buyer.
                const canRecoverReset = projectContracts.length === 1 && contract.id === primaryContractId
                    && existingRuns.length === 1 && savedHistory.length > existing.weeklyViews.length
                    && existing.weeklyViews.every((views, index) => views === savedHistory[savedHistory.length - existing.weeklyViews.length + index]);
                return {
                    ...existing,
                    ...(canRecoverReset ? {
                        weekOnPlatform: Math.max(existing.weekOnPlatform, aggregate?.weekOnPlatform || 1, savedHistory.length + 1),
                        totalViews: Math.max(existing.totalViews, aggregate?.totalViews || 0, savedHistory.reduce((sum, views) => sum + Math.max(0, views), 0)),
                    } : {}),
                    weeklyViews: [...(canRecoverReset ? savedHistory : existing.weeklyViews)],
                    isLeaving: existing.isLeaving || contract.status !== 'ACTIVE',
                };
            }
            const fallbackRuns = existingRuns.filter(run => run.platformId === contract.buyer.platformId
                && run.contractId === `legacy:${projectId}`);
            const history = contract.id === primaryContractId
                ? (fallbackRuns.length === 1 ? fallbackRuns[0] : legacyRelease?.streaming)
                : undefined;
            const weeklyViews = (history?.weeklyViews || []).map(value => Number.isFinite(value) ? Math.max(0, value) : 0);
            const savedWeek = Number.isFinite(history?.weekOnPlatform) ? Math.floor(history!.weekOnPlatform) : 1;
            const savedViews = Number.isFinite(history?.totalViews) ? Math.max(0, history!.totalViews) : 0;
            return {
                platformId: contract.buyer.platformId!,
                contractId: contract.id,
                startWeekAbsolute: contract.startsAtAbsoluteWeek,
                weekOnPlatform: Math.max(1, savedWeek, weeklyViews.length + 1),
                totalViews: Math.max(savedViews, weeklyViews.reduce((sum, views) => sum + views, 0)),
                weeklyViews,
                isLeaving: history?.isLeaving === true || contract.status !== 'ACTIVE',
            };
        })
        .sort((left, right) => left.platformId.localeCompare(right.platformId) || left.contractId.localeCompare(right.contractId));
};

export const summarizeStreamingPlatformRuns = (runs: StreamingPlatformRun[]): {
    totalViews: number;
    latestWeeklyViews: number;
    allLeaving: boolean;
} => ({
    totalViews: runs.reduce((sum, run) => sum + Math.max(0, Number(run.totalViews) || 0), 0),
    latestWeeklyViews: runs.reduce((sum, run) => sum + Math.max(0, Number(run.weeklyViews.at(-1)) || 0), 0),
    allLeaving: runs.length > 0 && runs.every(run => run.isLeaving),
});
