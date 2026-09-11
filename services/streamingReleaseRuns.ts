import type { Player, StreamingPlatformRun } from '../types';

export const buildStreamingPlatformRunsForProject = (
    player: Pick<Player, 'world'>,
    projectId: string,
    existingRuns: StreamingPlatformRun[] = [],
): StreamingPlatformRun[] => {
    const existingByContract = new Map(existingRuns.map(run => [run.contractId, run]));
    return Object.values(player.world.streamingRightsContracts || {})
        .filter(contract => (
            contract.sourceProjectId === projectId
            && contract.status === 'ACTIVE'
            && Boolean(contract.buyer.platformId)
        ))
        .map(contract => {
            const existing = existingByContract.get(contract.id);
            return existing ? { ...existing } : {
                platformId: contract.buyer.platformId!,
                contractId: contract.id,
                startWeekAbsolute: contract.startsAtAbsoluteWeek,
                weekOnPlatform: 1,
                totalViews: 0,
                weeklyViews: [],
                isLeaving: false,
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
