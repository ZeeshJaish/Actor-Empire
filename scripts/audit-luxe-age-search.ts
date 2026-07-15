import { INITIAL_PLAYER, type Player } from '../types';
import { getLuxeCandidatePool } from '../services/datingLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makePlayer = (age: number): Player => ({
    ...INITIAL_PLAYER,
    age,
    relationships: [],
    dating: {
        ...INITIAL_PLAYER.dating,
        matches: [],
        preferences: {
            ...INITIAL_PLAYER.dating.preferences,
            gender: 'ALL',
            minAge: 18,
            maxAge: 100,
        },
    },
});

const findCandidate = (player: Player, name: string) => {
    const candidate = getLuxeCandidatePool(player).find(entry => entry.name === name);
    assert(candidate, `${name} should be searchable in the eligible Luxe pool.`);
    return candidate!;
};

const firstYear = makePlayer(15);
const laterYear = makePlayer(25);
const zendayaAtStart = findCandidate(firstYear, 'Zendaya');
const zendayaAtStartAgain = findCandidate(firstYear, 'Zendaya');
const zendayaLater = findCandidate(laterYear, 'Zendaya');
const sydneyAtStart = findCandidate(firstYear, 'Sydney Sweeney');
const sydneyLater = findCandidate(laterYear, 'Sydney Sweeney');

assert(zendayaAtStart.age === 29, 'Zendaya should start at her stable profile age.');
assert(zendayaAtStartAgain.age === zendayaAtStart.age, 'Luxe ages must not change between renders.');
assert(zendayaLater.age === 39, 'Luxe celebrity ages should advance with the game calendar.');
assert(sydneyAtStart.age === 28, 'Sydney Sweeney should start at her stable profile age.');
assert(sydneyLater.age === 38, 'Sydney Sweeney should advance with the game calendar.');

console.log('Luxe age and search audit passed.');
