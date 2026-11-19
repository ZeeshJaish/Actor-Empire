import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SaveRecoveryModal } from '../components/SaveRecoveryModal';

/* Week-speed Phase 2a (2026-11-17): the modal became the recovery list (reason, restore points with the weeks each
   would lose, the last week shown). Every original check below is unchanged; only the props moved to the new shape.
   The checks after them cover what the list added. */
const backup = { kind: 'PREVIOUS' as const, age: 82, week: 41, savedAt: null, appVersion: null, weeksLost: 0 };
const noop = () => undefined;

const markup = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        reason="LOAD_FAILED"
        points={[backup]}
        lastShown={null}
        isRecovering={false}
        onRecover={noop}
        onCancel={noop}
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
        reason="LOAD_FAILED"
        points={[backup]}
        lastShown={null}
        isRecovering
        onRecover={noop}
        onCancel={noop}
    />,
);
assert.match(recovering, /Recovering/);
assert.match(recovering, /disabled/);

// Phase 2a: the loss line names the weeks a restore gives up, and what is never lost.
const losing = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        reason="LOAD_FAILED"
        points={[{ ...backup, weeksLost: 3 }]}
        lastShown={{ age: 82, week: 44 }}
        isRecovering={false}
        onRecover={noop}
        onCancel={noop}
    />,
);
assert.match(losing, /Restoring goes back to age 82, week 41\. The 3 weeks after it, up to age 82, week 44, will be lost\./);
assert.match(losing, /Anything you bought stays yours\./);
assert.doesNotMatch(markup, /will be lost/, 'With nothing to lose, the line must not claim a loss.');

// Phase 2a: a version we flagged offers the copy from before it, and keeping on playing is the other choice.
const flagged = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        reason="VERSION_FLAGGED"
        points={[{ ...backup, appVersion: '1.0.28', weeksLost: 1 }]}
        lastShown={{ age: 82, week: 42 }}
        flaggedVersion="1.0.29"
        isRecovering={false}
        onRecover={noop}
        onCancel={noop}
    />,
);
assert.match(flagged, /A safe copy is ready/);
assert.match(flagged, /Version 1\.0\.29 had a problem/);
assert.match(flagged, /Restore This Copy/);
assert.match(flagged, /Keep Playing/);
assert.match(flagged, /The 1 week after it/);
assert.doesNotMatch(flagged, /Back to Save Slots/);

// Phase 2a: two copies become a choice, newest first.
const list = renderToStaticMarkup(
    <SaveRecoveryModal
        playerName="Empire Studios"
        reason="LOAD_FAILED"
        points={[backup, { ...backup, week: 40, weeksLost: 1 }]}
        lastShown={null}
        isRecovering={false}
        onRecover={noop}
        onCancel={noop}
    />,
);
assert.match(list, /role="radiogroup"/);
assert.match(list, /Age 82 • Week 41[\s\S]*Age 82 • Week 40/);

console.log('Save recovery UI audit passed.');
