import type { ActiveRelease } from '../types';

export type ReleaseDisplayPhase = 'IN THEATERS' | 'BIDDING' | 'STREAMING';

export const getReleaseDisplayPhase = (
    release: Pick<ActiveRelease, 'distributionPhase'>
): ReleaseDisplayPhase => {
    if (release.distributionPhase === 'STREAMING') return 'STREAMING';
    if (release.distributionPhase === 'STREAMING_BIDDING') return 'BIDDING';
    return 'IN THEATERS';
};
