import type { Commitment, Player, StreamingOriginalReleasePattern } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

/**
 * 2026-11-16 (player report): an Original on the opening slate premieres on the service, but its studio job never got a
 * release. Only the Slate's own scheduling gives an Original's job its release, so an opening-slate Original stayed
 * "awaiting release" in the week loop for ever: no IMDb page, no reviews, and its title page had no Renew or sequel.
 * From its opening week the job is released the way a Slate premiere is. An older save whose opening week is long past
 * gets the record on its next week (`late`).
 */
const SERIES_RHYTHMS: StreamingOriginalReleasePattern[] = ['FULL_SEASON', 'WEEKLY'];

export const releaseOpeningSlateOriginal = (player: Player, job: Commitment): { job: Commitment; late: boolean } => {
    const details = job.projectDetails;
    if (job.projectPhase !== 'AWAITING_RELEASE' || !details || details.releaseStrategy) return { job, late: false };
    const platform = player.ownedStreamingPlatform;
    const launchAt = platform?.launchCommit?.committedAtAbsoluteWeek;
    if (launchAt === undefined || launchAt === null) return { job, late: false };
    const entry = (platform.launchSlate?.entries || []).find(item => item.projectId === job.id && item.source === 'ORIGINAL');
    const commission = entry ? (platform.originalCommissions || []).find(item => item.canonicalProjectId === job.id) : undefined;
    if (!entry || !commission) return { job, late: false };
    const now = getAbsoluteWeek(player.age, player.currentWeek);
    const premiereAt = launchAt + Math.max(1, entry.launchWeek) - 1;
    if (premiereAt > now) return { job, late: false };
    const pattern: StreamingOriginalReleasePattern = commission.projectType !== 'SERIES' ? 'SINGLE_PREMIERE'
        : SERIES_RHYTHMS.includes(entry.releasePattern) ? entry.releasePattern : 'FULL_SEASON';
    return {
        late: premiereAt < now,
        job: {
            ...job,
            phaseWeeksLeft: 0,
            totalPhaseDuration: 0,
            projectDetails: {
                ...details,
                releaseStrategy: 'STREAMING_ONLY',
                releaseDate: player.currentWeek,
                hiddenStats: {
                    ...details.hiddenStats,
                    ownedStreamingOriginal: true,
                    ownedStreamingCommissionId: commission.id,
                    ownedStreamingReleaseScope: 'GLOBAL',
                    ownedStreamingReleasePattern: pattern,
                },
            },
        },
    };
};
