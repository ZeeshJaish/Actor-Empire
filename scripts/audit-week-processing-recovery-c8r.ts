import assert from 'node:assert/strict';
import { IndexedDbOperationError } from '../services/indexedDbResilience';
import { StreamingOpeningProgrammeWeekError } from '../services/streamingOpeningProgramme';
import { describeWeekProcessingFailure } from '../services/weekProcessingRecovery';

assert.deepEqual(
    describeWeekProcessingFailure(
        'indexeddb_write_start',
        new IndexedDbOperationError('TIMEOUT', 'promote verified save actorEmpireSave_1'),
    ),
    {
        failedStage: 'Saving the verified week',
        detail: 'The device storage operation took too long. Your previous verified save was not replaced.',
        failureCode: 'STORAGE_TIMEOUT',
        failures: ['Device storage timed out before the verified save completed.'],
    },
);

assert.deepEqual(
    describeWeekProcessingFailure('loop_markets_done', new Error('private implementation detail')),
    {
        failedStage: 'Updating the game world',
        detail: 'The game stopped before the new week was committed. Your previous verified save was not replaced.',
        failureCode: 'WEEK_PROCESSING_FAILED',
        failures: ['The game world update stopped unexpectedly.'],
    },
);

assert.deepEqual(
    describeWeekProcessingFailure(
        'persist_prepare_start',
        new Error('Save compaction rejected: industry intelligence state changed'),
    ),
    {
        failedStage: 'Checking career integrity',
        detail: 'The week was stopped because protected career data changed while the save was being prepared. Your previous verified save was not replaced.',
        failureCode: 'SAVE_INTEGRITY_REJECTED',
        failures: ['Industry intelligence changed during save preparation.'],
    },
);

assert.equal(
    describeWeekProcessingFailure('persist_prepare_start', new Error('failure')).failedStage,
    'Checking career integrity',
);

assert.deepEqual(
    describeWeekProcessingFailure(
        'loop_owned_streaming_start',
        new StreamingOpeningProgrammeWeekError(
            'CLEARANCES',
            'Advancing government clearances',
            new Error('private implementation detail'),
        ),
    ),
    {
        failedStage: 'Advancing the Opening Programme',
        detail: 'The government clearance workstream could not advance, so the week was stopped before anything was committed. Your previous verified save remains intact.',
        failureCode: 'STREAMING_OPENING_PROGRAMME_CLEARANCES',
        failures: ['Advancing government clearances failed before the verified week could be saved.'],
    },
);

console.log('Week processing recovery C8R audit passed.');
