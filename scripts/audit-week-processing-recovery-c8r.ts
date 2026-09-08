import assert from 'node:assert/strict';
import { IndexedDbOperationError } from '../services/indexedDbResilience';
import { describeWeekProcessingFailure } from '../services/weekProcessingRecovery';

assert.deepEqual(
    describeWeekProcessingFailure(
        'indexeddb_write_start',
        new IndexedDbOperationError('TIMEOUT', 'promote verified save actorEmpireSave_1'),
    ),
    {
        failedStage: 'Saving the verified week',
        detail: 'The device storage operation took too long. Your previous verified save was not replaced.',
    },
);

assert.deepEqual(
    describeWeekProcessingFailure('loop_markets_done', new Error('private implementation detail')),
    {
        failedStage: 'Updating the game world',
        detail: 'The game stopped before the new week was committed. Your previous verified save was not replaced.',
    },
);

assert.equal(
    describeWeekProcessingFailure('persist_prepare_start', new Error('failure')).failedStage,
    'Checking career integrity',
);

console.log('Week processing recovery C8R audit passed.');
