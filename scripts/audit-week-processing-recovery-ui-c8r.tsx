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
        isExporting={false}
        onRetry={() => undefined}
        onReturnToMenu={() => undefined}
        onExportBackup={() => undefined}
    />,
);

assert.match(markup, /Week 41 was not applied/);
assert.match(markup, /Age 82/);
assert.match(markup, /Saving the verified week/);
assert.match(markup, /Your previous verified save is still intact/);
assert.match(markup, /Retry Week/);
assert.match(markup, /Export Backup/);
assert.match(markup, /Return to Menu/);

console.log('Week processing recovery UI C8R audit passed.');
