import assert from 'node:assert/strict';
import { buildAbandonedBabyName, getBabySurnameChoices } from '../services/babyNaming';

assert.deepEqual(
    getBabySurnameChoices('Riya', 'Jordan Vale'),
    [{ id: 'PARTNER', value: 'Vale' }],
    'A single-word player name must not become a surname choice.',
);

assert.deepEqual(
    getBabySurnameChoices('Riya Sharma', 'Jordan Vale'),
    [
        { id: 'PLAYER', value: 'Sharma' },
        { id: 'PARTNER', value: 'Vale' },
        { id: 'BOTH', value: 'Sharma-Vale' },
    ],
    'Full parent names should keep both surname choices.',
);

assert.deepEqual(
    getBabySurnameChoices('Riya', 'Jordan'),
    [],
    'Two single-word parent names do not reveal a family surname.',
);

assert.deepEqual(
    getBabySurnameChoices('Riya', 'Your partner'),
    [],
    'A missing-partner placeholder must not become a surname.',
);

assert.deepEqual(
    getBabySurnameChoices('Rising Star', 'Jordan'),
    [],
    'The default career stage name must not become a family surname.',
);

assert.deepEqual(
    getBabySurnameChoices('Riya Sharma', 'Jordan Sharma'),
    [{ id: 'PLAYER', value: 'Sharma' }],
    'Identical surnames should appear only once.',
);

assert.equal(buildAbandonedBabyName('Mia', 'Jordan Vale', 'Riya Sharma'), 'Mia Vale');
assert.equal(buildAbandonedBabyName('Mia', 'Jordan', 'Riya Sharma'), 'Mia Sharma');
assert.equal(buildAbandonedBabyName('Mia', 'Jordan', 'Riya'), 'Mia');
assert.equal(buildAbandonedBabyName('Mia', 'Your partner', 'Riya'), 'Mia');

console.log('Baby naming surname checks passed.');
