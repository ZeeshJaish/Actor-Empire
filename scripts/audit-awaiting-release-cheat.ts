import { strict as assert } from 'node:assert';
import { INITIAL_PLAYER, type Business, type Player } from '../types';
import { createHomeStudioProductionQaActions } from '../views/home/homeStudioProductionQaActions';

const studio = {
    id: 'cheat_studio',
    name: 'Cheat Studio',
    type: 'PRODUCTION_HOUSE',
    studioState: {
        scripts: [],
        concepts: [],
        writers: [],
        ipMarket: [],
        lockedStreamingFunds: []
    }
} as Business;

const player: Player = {
    ...structuredClone(INITIAL_PLAYER),
    id: 'awaiting_release_cheat_player',
    age: 30,
    currentWeek: 18,
    businesses: [studio],
    commitments: [],
    activeReleases: [],
    pastProjects: []
};

let updatedPlayer: Player | undefined;
let productionHouseOpenCount = 0;
let menuCloseCount = 0;

globalThis.alert = () => undefined;

const actions = createHomeStudioProductionQaActions({
    player,
    onUpdatePlayer: nextPlayer => {
        updatedPlayer = nextPlayer;
    },
    closeMenu: () => {
        menuCloseCount += 1;
    },
    ensureCheatStudio: () => ({ updatedPlayer: player, studio }),
    onOpenProductionHouseCheat: () => {
        productionHouseOpenCount += 1;
    }
});

actions.triggerStudioScenario('AWAITING_RELEASE');

assert.ok(updatedPlayer, 'Awaiting Release cheat should update the player.');
assert.equal(updatedPlayer.commitments.length, 1, 'Awaiting Release cheat should add exactly one commitment.');

const commitment = updatedPlayer.commitments[0];
assert.equal(commitment.projectPhase, 'AWAITING_RELEASE', 'The seeded movie should be in the Awaiting Release phase.');
assert.equal(commitment.projectDetails?.type, 'MOVIE', 'The seeded project should be a movie.');
assert.equal(commitment.projectDetails?.releaseStrategy, undefined, 'The Release Wizard should choose the release strategy.');
assert.equal(commitment.projectDetails?.screeningStrategy, undefined, 'The Release Wizard should choose the screening strategy.');
assert.equal(commitment.projectDetails?.releaseDate, undefined, 'The Release Wizard should choose the release date.');
assert.equal(productionHouseOpenCount, 1, 'The cheat should open Production House after creating the movie.');
assert.equal(menuCloseCount, 1, 'The cheat should close its menu after creating the movie.');

console.log('Awaiting Release cheat audit passed.');
