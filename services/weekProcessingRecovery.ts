import { IndexedDbOperationError } from './indexedDbResilience';
import { StreamingOpeningProgrammeWeekError } from './streamingOpeningProgramme';
import { WorldEconomyIntegrityError } from './worldEconomy/worldEconomyIntegrity';

export interface WeekProcessingFailurePresentation {
    failedStage: string;
    detail: string;
    failureCode: string;
    failures: string[];
}

const describeStage = (stage: string): string => {
    if (stage.startsWith('indexeddb_')) return 'Saving the verified week';
    if (stage.startsWith('persist_prepare')) return 'Checking career integrity';
    if (stage.startsWith('post_week_')) return 'Preparing the new week';
    if (stage === 'paint_wait') return 'Preparing week processing';
    if (stage === 'game_loop_start' || stage.startsWith('loop_')) return 'Updating the game world';
    return 'Processing the new week';
};

const genericFailureForStage = (stage: string): string => {
    if (stage.startsWith('persist_prepare')) return 'Career integrity could not be verified before saving.';
    if (stage.startsWith('indexeddb_')) return 'The verified save could not be written to device storage.';
    if (stage.startsWith('post_week_')) return 'The new week could not be prepared.';
    if (stage === 'paint_wait') return 'Week processing could not start.';
    if (stage === 'game_loop_start' || stage.startsWith('loop_')) return 'The game world update stopped unexpectedly.';
    return 'Week processing stopped unexpectedly.';
};

const integrityFailureLabel = (value: string): string => {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'industry intelligence state changed') {
        return 'Industry intelligence changed during save preparation.';
    }
    if (normalized === 'world economy state changed') {
        return 'World economy data changed during save preparation.';
    }
    return `${value.trim().replace(/\s+state changed$/i, '').replace(/^./, character => character.toUpperCase())} changed during save preparation.`;
};

const describeSaveIntegrityRejection = (stage: string, error: unknown): WeekProcessingFailurePresentation | null => {
    const message = error instanceof Error ? error.message : '';
    const match = message.match(/^Save compaction rejected:\s*(.+)$/i);
    if (!match) return null;
    const failures = match[1]
        .split(';')
        .map(value => value.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map(integrityFailureLabel);
    return {
        failedStage: describeStage(stage),
        detail: 'The week was stopped because protected career data changed while the save was being prepared. Your previous verified save was not replaced.',
        failureCode: 'SAVE_INTEGRITY_REJECTED',
        failures: failures.length > 0 ? failures : ['Protected career data changed during save preparation.'],
    };
};

export const describeWeekProcessingFailure = (
    stage: string,
    error: unknown,
): WeekProcessingFailurePresentation => {
    const saveIntegrityRejection = describeSaveIntegrityRejection(stage, error);
    if (saveIntegrityRejection) return saveIntegrityRejection;
    if (error instanceof StreamingOpeningProgrammeWeekError) {
        const workstream = error.workstreamId === 'CLEARANCES'
            ? 'government clearance'
            : 'launch preparation';
        return {
            failedStage: 'Advancing the Opening Programme',
            detail: `The ${workstream} workstream could not advance, so the week was stopped before anything was committed. Your previous verified save remains intact.`,
            failureCode: `STREAMING_OPENING_PROGRAMME_${error.workstreamId}`,
            failures: [`${error.operation} failed before the verified week could be saved.`],
        };
    }
    if (error instanceof WorldEconomyIntegrityError) {
        return {
            failedStage: 'Checking the game world',
            detail: 'This week was not applied because its world data could not be verified. Your previous week is safe. Try again or restore the previous save.',
            failureCode: 'WORLD_ECONOMY_INTEGRITY',
            failures: error.codes.length > 0
                ? error.codes.map(code => `World check failed: ${code}.`)
                : ['The world economy integrity check failed.'],
        };
    }
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
            failureCode: `STORAGE_${error.code}`,
            failures: [error.code === 'TIMEOUT'
                ? 'Device storage timed out before the verified save completed.'
                : error.code === 'BLOCKED'
                    ? 'Another game tab or older session blocked device storage.'
                    : error.code === 'ABORTED'
                        ? 'The device stopped the verified save operation.'
                        : 'Device storage failed before the verified save completed.'],
        };
    }

    return {
        failedStage: describeStage(stage),
        detail: 'The game stopped before the new week was committed. Your previous verified save was not replaced.',
        failureCode: 'WEEK_PROCESSING_FAILED',
        failures: [genericFailureForStage(stage)],
    };
};
