import { IndexedDbOperationError } from './indexedDbResilience';

export interface WeekProcessingFailurePresentation {
    failedStage: string;
    detail: string;
}

const describeStage = (stage: string): string => {
    if (stage.startsWith('indexeddb_')) return 'Saving the verified week';
    if (stage.startsWith('persist_prepare')) return 'Checking career integrity';
    if (stage.startsWith('post_week_')) return 'Preparing the new week';
    if (stage === 'paint_wait') return 'Preparing week processing';
    if (stage === 'game_loop_start' || stage.startsWith('loop_')) return 'Updating the game world';
    return 'Processing the new week';
};

export const describeWeekProcessingFailure = (
    stage: string,
    error: unknown,
): WeekProcessingFailurePresentation => {
    if (error instanceof IndexedDbOperationError) {
        const storageDetail = error.code === 'BLOCKED'
            ? 'Another game tab or older session is blocking save storage.'
            : error.code === 'TIMEOUT'
                ? 'The device storage operation took too long.'
                : error.code === 'ABORTED'
                    ? 'The device stopped the save operation before it completed.'
                    : 'The device could not complete the save operation.';
        return {
            failedStage: 'Saving the verified week',
            detail: `${storageDetail} Your previous verified save was not replaced.`,
        };
    }

    return {
        failedStage: describeStage(stage),
        detail: 'The game stopped before the new week was committed. Your previous verified save was not replaced.',
    };
};
