import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryProject, type Player } from '../types';
import {
    createCanonicalAwardNominationId,
    generateFullBallot,
    generateSeasonWinners,
    resolveCanonicalAwardSeason,
} from '../services/awardLogic';

const withAmbientRandom = <T>(value: number, run: () => T): T => {
    const originalRandom = Math.random;
    const originalNow = Date.now;
    Math.random = () => value;
    Date.now = () => Math.floor(value * 1_000_000);
    try {
        return run();
    } finally {
        Math.random = originalRandom;
        Date.now = originalNow;
    }
};

const project = (id: string): IndustryProject => ({
    id,
    title: `Project ${id}`,
    genre: 'DRAMA',
    mediaType: 'MOVIE',
    studioId: 'WARNER_BROS',
    budgetTier: 'HIGH',
    quality: 92,
    rating: 8.8,
    boxOffice: 400_000_000,
    year: 1,
    weekReleased: 20,
    leadActorId: `actor-${id}`,
    leadActorName: `Actor ${id}`,
    directorId: `director-${id}`,
    directorName: `Director ${id}`,
    reviews: 'Acclaimed',
    awardProfile: {
        leadPerformance: 92,
        directing: 92,
        screenplay: 92,
        cinematography: 92,
        picture: 92,
        originalScore: 92,
        originalSong: 92,
        campaign: 92,
    },
});

const playerWithProjects = (projects: IndustryProject[]): Player => {
    const player = structuredClone(INITIAL_PLAYER) as Player;
    return {
        ...player,
        age: 2,
        currentWeek: 10,
        awards: [],
        pastProjects: [],
        activeReleases: [],
        world: {
            ...player.world,
            projects,
            awardHistory: [],
        },
    };
};

const emptyPlayer = playerWithProjects([]);
const ballotAtLowAmbientRandom = withAmbientRandom(0.01, () => generateFullBallot(emptyPlayer, 'OSCAR', [], 2));
const ballotAtHighAmbientRandom = withAmbientRandom(0.99, () => generateFullBallot(emptyPlayer, 'OSCAR', [], 2));
assert.deepEqual(
    ballotAtHighAmbientRandom,
    ballotAtLowAmbientRandom,
    'Canonical fallback ballots must not depend on ambient Math.random or Date.now.',
);

const seasonAtLowAmbientRandom = withAmbientRandom(0.02, () => generateSeasonWinners(emptyPlayer, 'OSCAR', 2));
const seasonAtHighAmbientRandom = withAmbientRandom(0.98, () => generateSeasonWinners(emptyPlayer, 'OSCAR', 2));
assert.deepEqual(
    seasonAtHighAmbientRandom,
    seasonAtLowAmbientRandom,
    'Canonical season winners must replay byte-for-byte from the same inputs.',
);
const playerBeforeResolution = structuredClone(emptyPlayer);
assert.deepEqual(
    resolveCanonicalAwardSeason(emptyPlayer, 'OSCAR', 2),
    seasonAtLowAmbientRandom,
    'The shared canonical resolver must power the compatibility season API.',
);
assert.deepEqual(emptyPlayer, playerBeforeResolution, 'Canonical award resolution must not mutate player input.');

const ascending = generateSeasonWinners(playerWithProjects([project('a-project'), project('b-project')]), 'OSCAR', 2);
const descending = generateSeasonWinners(playerWithProjects([project('b-project'), project('a-project')]), 'OSCAR', 2);
assert.deepEqual(
    descending,
    ascending,
    'Equal award scores must be resolved by stable project ID rather than input order.',
);
assert.equal(
    ascending.winners.find(winner => winner.category === 'Best Picture')?.projectId,
    'a-project',
    'The lexicographically first project ID must win an exact score tie.',
);

const nominationId = createCanonicalAwardNominationId('OSCAR', 2, 'Best Picture', 'a-project');
assert.match(nominationId, /^award_nom_/, 'Nomination IDs must use the canonical award nomination namespace.');
assert.equal(
    createCanonicalAwardNominationId('OSCAR', 2, 'Best Picture', 'a-project'),
    nominationId,
    'The same nomination identity must produce the same ID.',
);
assert.notEqual(
    createCanonicalAwardNominationId('OSCAR', 2, 'Best Picture', 'b-project'),
    nominationId,
    'Different project nominations must not collide.',
);

console.log('Deterministic awards audit passed.');
