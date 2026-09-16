import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { WeekProcessingRecoveryModal } from '../components/WeekProcessingRecoveryModal';

const markup = renderToStaticMarkup(
    <WeekProcessingRecoveryModal
        age={82}
        week={41}
        failedStage="Saving the verified week"
        detail="The device storage operation took too long."
        failureCode="STORAGE_TIMEOUT"
        failures={[
            'Device storage timed out before the verified save completed.',
            'The previous verified save remains available.',
        ]}
        isExporting={false}
        onRetry={() => undefined}
        onReturnToMenu={() => undefined}
        onExportBackup={() => undefined}
    />,
);

assert.match(markup, /Week 41 was not applied/);
assert.match(markup, /Age 82/);
assert.match(markup, /Saving the verified week/);
assert.match(markup, /Failure code/);
assert.match(markup, /STORAGE_TIMEOUT/);
assert.match(markup, /Device storage timed out before the verified save completed/);
assert.match(markup, /The previous verified save remains available/);
assert.match(markup, /Your previous verified save is still intact/);
assert.match(markup, /Retry Week/);
assert.match(markup, /Export Backup/);
assert.match(markup, /Return to Menu/);

assert.doesNotThrow(
    () => renderToStaticMarkup(
        React.createElement(WeekProcessingRecoveryModal, {
            age: 82,
            week: 41,
            failedStage: 'Checking career integrity',
            detail: 'The previous verified save was not replaced.',
            isExporting: false,
            onRetry: () => undefined,
            onReturnToMenu: () => undefined,
            onExportBackup: () => undefined,
        } as React.ComponentProps<typeof WeekProcessingRecoveryModal>),
    ),
    'An older in-memory recovery record must not crash after a UI update.',
);

console.log('Week processing recovery UI C8R audit passed.');
