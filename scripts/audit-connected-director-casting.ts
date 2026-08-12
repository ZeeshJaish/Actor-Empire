import assert from 'node:assert/strict';
import { NPCActor, Relationship } from '../types';
import {
    getConnectedDirectorCandidates,
    getDirectorConnectionDiscount
} from '../services/directorConnectionLogic';

const director: NPCActor = {
    id: 'director_outside_rotation',
    name: 'Mara Vale',
    handle: '@maravale',
    gender: 'FEMALE',
    avatar: 'director.png',
    tier: 'ESTABLISHED',
    prestigeBias: 'PRESTIGE',
    openness: 72,
    followers: 2_000_000,
    netWorth: 18_000_000,
    occupation: 'DIRECTOR',
    bio: 'Director',
    stats: { talent: 88, fame: 70 }
};

const actor: NPCActor = {
    ...director,
    id: 'actor_connection',
    name: 'Actor Connection',
    occupation: 'ACTOR'
};

const relationships: Relationship[] = [
    {
        id: 'director_relationship',
        npcId: director.id,
        name: director.name,
        relation: 'Connection',
        closeness: 80,
        image: director.avatar,
        lastInteractionWeek: 12
    },
    {
        id: 'duplicate_director_relationship',
        npcId: director.id,
        name: director.name,
        relation: 'Director',
        closeness: 90,
        image: director.avatar,
        lastInteractionWeek: 13
    },
    {
        id: 'legacy_director',
        name: 'Legacy Save Director',
        relation: 'Director',
        closeness: 75,
        image: 'legacy.png',
        lastInteractionWeek: 4
    },
    {
        id: 'actor_relationship',
        npcId: actor.id,
        name: actor.name,
        relation: 'Connection',
        closeness: 95,
        image: actor.avatar,
        lastInteractionWeek: 10
    },
    {
        id: 'unknown_generic_connection',
        name: 'Unknown Connection',
        relation: 'Connection',
        closeness: 100,
        image: 'unknown.png',
        lastInteractionWeek: 10
    }
];

const connectedDirectors = getConnectedDirectorCandidates(relationships, [director, actor]);

assert.deepEqual(
    connectedDirectors.map(candidate => candidate.id),
    [director.id, 'legacy_director'],
    'Known and legacy director relationships should resolve once without leaking actor or unknown generic connections'
);
assert.equal(connectedDirectors[0], director, 'Known directors should retain their canonical NPC record');
assert.equal(connectedDirectors[1].occupation, 'DIRECTOR', 'Old-save Director relationships should receive a usable director candidate');
assert.equal(connectedDirectors[1].name, 'Legacy Save Director', 'Legacy fallback should preserve the saved relationship name');
assert.equal(getDirectorConnectionDiscount(50), 0, 'Ordinary connections should not receive a hidden discount');
assert.equal(getDirectorConnectionDiscount(80), 0.4, 'Close connections should receive the intended offer discount');
assert.equal(getDirectorConnectionDiscount(200), 0.6, 'Connection discount must remain capped at 60%');

console.log('Connected director casting audit passed (7 checks).');
