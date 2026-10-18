import type { ActiveRelease, StreamingState, StreamingPlatformRun } from '../types';

export type ReleaseDisplayPhase = 'IN THEATERS' | 'BIDDING' | 'STREAMING';

export const getReleaseDisplayPhase = (
    release: Pick<ActiveRelease, 'distributionPhase'>
): ReleaseDisplayPhase => {
    if (release.distributionPhase === 'STREAMING') return 'STREAMING';
    if (release.distributionPhase === 'STREAMING_BIDDING') return 'BIDDING';
    return 'IN THEATERS';
};

/** Keep streaming progress separate from the theatrical counter stored on a release. */
export const getReleaseProgressWeek = (project: {
    distributionPhase?: string;
    phase?: string;
    weekNum?: number;
    projectDetails?: { weekNum?: number };
    streaming?: Partial<StreamingState>;
    streamingRuns?: StreamingPlatformRun[];
}): number => {
    const week = (value: number | undefined) => Number.isFinite(value) ? Math.max(0, Math.floor(value!)) : 0;
    if (project.distributionPhase === 'STREAMING' || project.phase === 'STREAMING') {
        const runs = project.streamingRuns || [];
        const progress = Math.max(week(project.streaming?.weekOnPlatform),
            project.streaming?.weeklyViews?.length ? project.streaming.weeklyViews.length + 1 : 0,
            ...runs.map(run => Math.max(week(run.weekOnPlatform), run.weeklyViews?.length ? run.weeklyViews.length + 1 : 0)));
        return progress || 1;
    }
    return week(project.weekNum) || week(project.projectDetails?.weekNum);
};
