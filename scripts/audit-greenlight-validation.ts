import { strict as assert } from 'node:assert';
import {
    resolveGreenlightConnectedIntent,
    validateGreenlightProject,
    type GreenlightValidationInput,
} from '../views/lifestyle/business/greenlightValidation';

const resolveIntent = (overrides: Partial<Parameters<typeof resolveGreenlightConnectedIntent>[0]> = {}) => (
    resolveGreenlightConnectedIntent({
        requestedIntent: 'AUTO',
        linkedKnownCastCount: 0,
        hasSelectedFranchise: false,
        ...overrides,
    })
);

assert.equal(resolveIntent({ requestedIntent: 'EVENT', scriptIntent: 'REBOOT' }), 'EVENT');
assert.equal(resolveIntent({ scriptIntent: 'CROSSOVER' }), 'CROSSOVER');
assert.equal(resolveIntent({ scriptTags: ['UNIVERSE_EVENT', 'REBOOT'] }), 'EVENT');
assert.equal(resolveIntent({ scriptTags: ['REBOOT'] }), 'REBOOT');
assert.equal(resolveIntent({ linkedKnownCastCount: 3 }), 'EVENT');
assert.equal(resolveIntent({ linkedKnownCastCount: 1 }), 'CROSSOVER');
assert.equal(resolveIntent({ sourceMaterial: 'SEQUEL' }), 'SOLO');
assert.equal(resolveIntent({ hasSelectedFranchise: true }), 'SOLO');
assert.equal(resolveIntent(), 'SOLO');

const validInput: GreenlightValidationInput = {
    hasSelectedScript: true,
    scriptStatus: 'READY',
    selectedLocationCount: 1,
    playerEnergy: 10,
    energyCost: 5,
    crewModes: {
        director: 'SELF',
        cinematographer: 'IN_HOUSE',
        composer: 'IN_HOUSE',
        lineProducer: 'IN_HOUSE',
        vfx: 'IN_HOUSE',
    },
    selectedCrew: {
        director: null,
        cinematographer: null,
        composer: null,
        lineProducer: null,
        vfx: null,
    },
    castRoles: [{ roleType: 'LEAD', actorId: 'PLAYER_SELF' }],
    effectiveConnectedIntent: 'SOLO',
    linkedKnownCastCount: 0,
    hasUniverseConnection: false,
    hasFranchiseConnection: false,
    unresolvedReturningTalentNames: [],
    unresolvedReturningTalentCount: 0,
    effectiveStudioFundingPool: 20_000_000,
    netGreenlightCashRequirement: 15_000_000,
};

assert.deepEqual(validateGreenlightProject(validInput), { can: true, errors: [] });
assert.deepEqual(
    validateGreenlightProject({
        ...validInput,
        hasSelectedScript: false,
        selectedLocationCount: 0,
        playerEnergy: 0,
    }),
    { can: false, errors: ['No script selected'] },
);

const allCrewMissing = validateGreenlightProject({
    ...validInput,
    scriptStatus: 'IN_DEVELOPMENT',
    selectedLocationCount: 0,
    playerEnergy: 2,
    crewModes: {
        director: 'HIRE',
        cinematographer: 'HIRE',
        composer: 'HIRE',
        lineProducer: 'HIRE',
        vfx: 'HIRE',
    },
    castRoles: [],
    effectiveConnectedIntent: 'EVENT',
    unresolvedReturningTalentNames: ['A', 'B', 'C', 'D'],
    unresolvedReturningTalentCount: 4,
    effectiveStudioFundingPool: 10,
    netGreenlightCashRequirement: 20,
});

assert.deepEqual(allCrewMissing.errors, [
    'Scripting is still in progress',
    'No filming locations selected',
    'Greenlight needs 5 energy',
    'Director is required',
    'Cinematographer is required',
    'Composer is required',
    'Line Producer is required',
    'VFX Supervisor is required',
    'At least one lead actor is required',
    'Event film needs at least three known characters',
    'Returning talent negotiations pending: A, B, C +1 more',
    'Insufficient studio funds for this project plan',
]);
assert.equal(allCrewMissing.can, false);

assert.deepEqual(
    validateGreenlightProject({
        ...validInput,
        effectiveConnectedIntent: 'CROSSOVER',
    }).errors,
    ['Crossover needs at least one known character'],
);
assert.deepEqual(
    validateGreenlightProject({
        ...validInput,
        effectiveConnectedIntent: 'REBOOT',
    }).errors,
    ['Reboot needs a universe or franchise connection'],
);
assert.equal(validateGreenlightProject({
    ...validInput,
    effectiveConnectedIntent: 'REBOOT',
    hasFranchiseConnection: true,
}).can, true);

assert.deepEqual(
    validateGreenlightProject({
        ...validInput,
        talentConflictNames: ['Booked Actor', 'Booked Director'],
    }).errors,
    ['Talent already booked: Booked Actor, Booked Director'],
    'Greenlight must block booked talent before charging or appending the project.',
);

console.log('Greenlight validation audit passed: connected intent and final eligibility retain their rules and player-facing errors.');
