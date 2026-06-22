import {
    createContinuationScript,
    getContinuationEligibility,
} from '../services/sequelFlow';
import type { Player, Script } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makePlayer = (age: number, currentWeek: number): Player => ({
    age,
    currentWeek,
    activeReleases: [],
    pastProjects: [],
    businesses: [],
} as unknown as Player);

const baseProject = {
    id: 'film-1',
    name: 'First Film',
    type: 'MOVIE',
    genre: 'DRAMA',
    franchiseId: 'franchise-1',
    installmentNumber: 1,
    releasedAtAbsoluteWeek: (30 - 1) * 52 + (10 - 1),
};

const waiting = getContinuationEligibility({
    player: makePlayer(30, 13),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(!waiting.eligible, 'A continuation should remain locked after only three elapsed weeks.');
assert(waiting.weeksRemaining === 1, 'The cooldown should report one remaining week.');
assert(waiting.reason === 'WAITING_PERIOD', 'The cooldown should expose a clear waiting reason.');

const available = getContinuationEligibility({
    player: makePlayer(30, 14),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(available.eligible, 'A continuation should unlock after four elapsed weeks.');

const rolloverProject = {
    ...baseProject,
    releasedAtAbsoluteWeek: (30 - 1) * 52 + (51 - 1),
};
const rollover = getContinuationEligibility({
    player: makePlayer(31, 3),
    studioScripts: [],
    project: rolloverProject,
    mode: 'SEQUEL',
});
assert(rollover.eligible, 'The four-week cooldown should work across a year rollover.');

const activeLegacy = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: {
        ...baseProject,
        releasedAtAbsoluteWeek: undefined,
        weekNum: 3,
        phase: 'IN THEATERS',
    },
    mode: 'SEQUEL',
});
assert(!activeLegacy.eligible, 'Legacy active releases should infer elapsed weeks from weekNum.');
assert(activeLegacy.weeksRemaining === 2, 'A legacy release in theatrical week three should need two more weeks.');

const archivedLegacy = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: {
        ...baseProject,
        releasedAtAbsoluteWeek: undefined,
        phase: 'RELEASED',
        year: 30,
    },
    mode: 'SEQUEL',
});
assert(archivedLegacy.eligible, 'Legacy archived projects without a release week must not stay locked forever.');

const existingScript: Script = {
    id: 'script-2',
    title: 'First Film 2',
    genres: ['DRAMA'],
    status: 'CONCEPT',
    quality: 0,
    options: [],
    writerId: null,
    weeksInDevelopment: 0,
    totalDevelopmentWeeks: 0,
    isOriginal: false,
    projectType: 'MOVIE',
    sourceMaterial: 'SEQUEL',
    franchiseId: 'franchise-1',
    installmentNumber: 2,
};
const duplicate = getContinuationEligibility({
    player: makePlayer(30, 20),
    studioScripts: [existingScript],
    project: baseProject,
    mode: 'SEQUEL',
});
assert(!duplicate.eligible, 'A duplicate sequel should be blocked.');
assert(duplicate.reason === 'ALREADY_IN_DEVELOPMENT', 'Duplicate projects should expose the correct reason.');

const created = createContinuationScript({
    player: makePlayer(30, 20),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
    title: '  First Film: Afterlight  ',
});
assert(created.ok, 'An eligible sequel should be commissioned.');
assert(created.script?.title === 'First Film: Afterlight', 'The shared flow should normalize the working title.');
assert(created.script?.installmentNumber === 2, 'The shared flow should create the next installment.');
assert(created.script?.createdAtWeek === 20, 'The shared flow should stamp the creation week.');

const blockedCreation = createContinuationScript({
    player: makePlayer(30, 13),
    studioScripts: [],
    project: baseProject,
    mode: 'SEQUEL',
    title: 'Too Soon',
});
assert(!blockedCreation.ok, 'The mutation layer must reject cooldown bypasses.');
assert(blockedCreation.eligibility.reason === 'WAITING_PERIOD', 'Blocked creation should preserve its eligibility reason.');

console.log('Sequel flow audit passed.');
