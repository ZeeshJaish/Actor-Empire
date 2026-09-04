import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SaveRecoveryModal } from '../components/SaveRecoveryModal';

const markup = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        age={82}
        week={41}
        violations={['integrity digest does not match save payload']}
        isRecovering={false}
        onRecover={() => undefined}
        onCancel={() => undefined}
    />,
);

assert.match(markup, /Safe backup found/);
assert.match(markup, /Empire Studios/);
assert.match(markup, /Age 82/);
assert.match(markup, /Week 41/);
assert.match(markup, /Recover Safe Save/);
assert.match(markup, /Back to Save Slots/);
assert.doesNotMatch(markup, /integrity digest/, 'Internal integrity details must not alarm or confuse the player.');

const recovering = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        age={82}
        week={41}
        violations={[]}
        isRecovering
        onRecover={() => undefined}
        onCancel={() => undefined}
    />,
);
assert.match(recovering, /Recovering/);
assert.match(recovering, /disabled/);

console.log('Save recovery UI audit passed.');
