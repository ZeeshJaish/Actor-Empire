import { strict as assert } from 'node:assert';
import { INITIAL_PLAYER, type IndustryProductionCommitment, type Player } from '../types';
import {
    cancelProjectTalentBookings,
    extendProjectTalentBookings,
    getAvailableTalentForWindow,
    getTalentConflicts,
    markTalentBookingAvailability,
    normalizeTalentBookings,
    releaseProjectTalentBookings,
    reserveProjectTalentBookings,
} from '../services/talentBookings';
import {
    getIndustryProduction,
    normalizeIndustryProductions,
    removeIndustryProduction,
    upsertIndustryProduction,
} from '../services/industryProductions';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';

const calendar = {
    preProductionWeeks: 2,
    productionWeeks: 4,
    postProductionWeeks: 3,
    totalWeeks: 9,
    focusWindowWeeks: 7,
    elapsedWeeks: 0,
    startedAbsoluteWeek: 100,
};

const emptyBefore = JSON.stringify([]);
const firstReservation = reserveProjectTalentBookings({
    bookings: [],
    projectId: 'project_alpha',
    projectOwner: 'PLAYER_COMMITMENT',
    producerStudioId: 'PLAYER_STUDIO',
    productionCalendar: calendar,
    actorIds: ['actor_one', 'PLAYER_SELF', 'STUDIO_STAFF', 'UNKNOWN'],
    directorIds: ['director_one'],
});

assert.equal(JSON.stringify([]), emptyBefore, 'Reservation must not mutate its input array.');
assert.deepEqual(firstReservation.conflicts, [], 'A clean project should reserve all real talent atomically.');
assert.equal(firstReservation.bookings.length, 2, 'Virtual player and studio talent IDs must not create bookings.');
assert.deepEqual(firstReservation.bookingIds, [
    'talent:project_alpha:ACTOR:actor_one',
    'talent:project_alpha:DIRECTOR:director_one',
]);

const actorBooking = firstReservation.bookings.find(booking => booking.role === 'ACTOR')!;
const directorBooking = firstReservation.bookings.find(booking => booking.role === 'DIRECTOR')!;
assert.deepEqual(
    [actorBooking.startAbsoluteWeek, actorBooking.endAbsoluteWeek],
    [102, 105],
    'Actors should be booked only for the production window.',
);
assert.deepEqual(
    [directorBooking.startAbsoluteWeek, directorBooking.endAbsoluteWeek],
    [100, 108],
    'Directors should be booked from pre-production through post-production.',
);

const repeatedReservation = reserveProjectTalentBookings({
    bookings: firstReservation.bookings,
    projectId: 'project_alpha',
    projectOwner: 'PLAYER_COMMITMENT',
    producerStudioId: 'PLAYER_STUDIO',
    productionCalendar: calendar,
    actorIds: ['actor_one'],
    directorIds: ['director_one'],
});
assert.deepEqual(repeatedReservation, firstReservation, 'Repeating the same reservation must be idempotent.');

const overlappingNpcReservation = reserveProjectTalentBookings({
    bookings: firstReservation.bookings,
    projectId: 'project_beta',
    projectOwner: 'INDUSTRY_PRODUCTION',
    producerStudioId: 'PARAMOUNT',
    productionCalendar: calendar,
    actorIds: ['actor_one'],
    directorIds: ['director_one'],
    allowOverlaps: true,
});
assert.deepEqual(overlappingNpcReservation.conflicts, [], 'Phase 3 permits canonical NPCs to work on overlapping productions.');
assert.equal(overlappingNpcReservation.bookingIds.length, 2, 'Overlapping NPC work remains recorded as canonical history.');
assert.equal(overlappingNpcReservation.bookings.length, 4, 'Allowed overlaps add a second project booking instead of erasing the first.');

assert.equal(getTalentConflicts(firstReservation.bookings, {
    npcId: 'actor_one',
    startAbsoluteWeek: 105,
    endAbsoluteWeek: 109,
}).length, 1, 'Inclusive overlapping windows must conflict.');
assert.equal(getTalentConflicts(firstReservation.bookings, {
    npcId: 'actor_one',
    startAbsoluteWeek: 106,
    endAbsoluteWeek: 109,
}).length, 0, 'A window beginning after the existing booking must remain available.');

const candidates = [{ id: 'actor_one' }, { id: 'actor_two' }, { id: 'PLAYER_SELF' }];
assert.deepEqual(
    getAvailableTalentForWindow(candidates, firstReservation.bookings, {
        startAbsoluteWeek: 105,
        endAbsoluteWeek: 107,
    }).map(candidate => candidate.id),
    ['actor_two', 'PLAYER_SELF'],
    'Availability filtering should block only real conflicting talent.',
);
const markedCandidates = markTalentBookingAvailability(candidates, firstReservation.bookings, {
    startAbsoluteWeek: 105,
    endAbsoluteWeek: 107,
});
assert.equal(markedCandidates[0].isBookingUnavailable, true, 'Conflicting candidates should remain visible but be marked unavailable.');
assert.equal(markedCandidates[0].bookingConflictLabel, 'Booked on Project Alpha', 'Availability marks should explain the blocking project.');
assert.equal(markedCandidates[1].isBookingUnavailable, false, 'Non-conflicting candidates should remain selectable.');

const cancelled = cancelProjectTalentBookings(firstReservation.bookings, 'project_alpha', 104);
assert.equal(firstReservation.bookings.every(booking => booking.status === 'BOOKED'), true, 'Cancellation must not mutate source bookings.');
assert.equal(cancelled.every(booking => booking.status === 'CANCELLED'), true, 'Cancellation should release the full project atomically.');
assert.equal(getTalentConflicts(cancelled, {
    npcId: 'actor_one',
    startAbsoluteWeek: 105,
    endAbsoluteWeek: 109,
}).length, 0, 'Cancelled bookings must not block future projects.');

const released = releaseProjectTalentBookings(firstReservation.bookings, 'project_alpha', 109);
assert.equal(released.every(booking => booking.status === 'RELEASED'), true, 'Delivered projects should release all bookings.');
const extended = extendProjectTalentBookings(firstReservation.bookings, 'project_alpha', 112);
assert.equal(extended.find(booking => booking.role === 'DIRECTOR')?.endAbsoluteWeek, 112, 'Extensions should move active booking end dates forward.');
assert.equal(firstReservation.bookings.find(booking => booking.role === 'DIRECTOR')?.endAbsoluteWeek, 108, 'Extensions must be pure.');

const normalized = normalizeTalentBookings([
    actorBooking,
    { ...actorBooking },
    { ...directorBooking, startAbsoluteWeek: 110, endAbsoluteWeek: 109 },
    { id: '', npcId: '', role: 'ACTOR' },
]);
assert.equal(normalized.length, 2, 'Normalization should dedupe stable IDs and discard malformed records.');
assert.equal(normalized.find(booking => booking.role === 'DIRECTOR')?.endAbsoluteWeek, 110, 'Normalization should repair reversed windows without replaying time.');

const production: IndustryProductionCommitment = {
    id: 'industry_production_alpha',
    canonicalProjectId: 'project_alpha',
    title: 'Alpha',
    projectType: 'MOVIE',
    genre: 'DRAMA',
    producerStudioId: 'PLAYER_STUDIO',
    commissioningPlatformId: 'NETFLIX',
    platformContentPlanId: 'plan_alpha',
    status: 'PRE_PRODUCTION',
    productionCalendar: calendar,
    budgetMillions: 20,
    paidMillions: 4,
    talentBookingIds: firstReservation.bookingIds,
    writerSource: 'IN_HOUSE_TEAM',
    writerId: null,
    writerName: 'Player Studio Story Department',
    writerSkill: 72,
    createdAtAbsoluteWeek: 100,
    updatedAtAbsoluteWeek: 100,
};
const sourceRegistry = {};
const withProduction = upsertIndustryProduction(sourceRegistry, production);
assert.deepEqual(sourceRegistry, {}, 'Production upsert must not mutate the source registry.');
assert.equal(getIndustryProduction(withProduction, production.id)?.writerId, null, 'Industry productions must use the in-house writer representation without fake NPCs.');
assert.deepEqual(normalizeIndustryProductions(withProduction), withProduction, 'Normalized production registries should be idempotent.');
assert.deepEqual(removeIndustryProduction(withProduction, production.id), {}, 'Registry removal should be pure and deterministic.');

const migrationInput = structuredClone(INITIAL_PLAYER) as Player;
migrationInput.id = 'talent_migration_fixture';
migrationInput.world = {
    ...migrationInput.world,
    talentBookings: undefined,
    industryProductions: undefined,
};
migrationInput.commitments = [{
    id: 'legacy_active_project',
    name: 'Legacy Active Project',
    type: 'JOB',
    energyCost: 0,
    income: 0,
    payoutType: 'LUMPSUM',
    projectPhase: 'PRODUCTION',
    phaseWeeksLeft: 3,
    totalPhaseDuration: 4,
    productionCalendar: {
        ...calendar,
        elapsedWeeks: 3,
    },
    projectDetails: {
        title: 'Legacy Active Project',
        studioId: 'PLAYER_STUDIO',
        directorId: 'director_legacy',
        castList: [{ id: 'cast_legacy', actorId: 'actor_legacy', name: 'Legacy Actor', role: 'Lead', isPlayer: false, image: '', type: 'ACTOR' }],
    },
} as any];
const migrationBefore = structuredClone(migrationInput);
const migratedOnce = migratePlayerSave(migrationInput);
const migratedTwice = migratePlayerSave(migratedOnce);
assert.deepEqual(migrationInput, migrationBefore, 'Save migration must not mutate the incoming save.');
assert.deepEqual(migratedTwice.world.talentBookings, migratedOnce.world.talentBookings, 'Talent migration must be idempotent.');
assert.deepEqual(migratedTwice.world.industryProductions, migratedOnce.world.industryProductions, 'Production registry migration must be idempotent.');
assert.equal(migratedOnce.world.talentBookings?.length, 2, 'Safely derivable active commitments should backfill actor and director bookings.');
assert.equal(migratedOnce.world.talentBookings?.some(booking => booking.npcId === 'actor_legacy'), true, 'Legacy cast actorId values should backfill the real NPC rather than the cast-row ID.');
assert.deepEqual(migratedOnce.world.industryProductions, {}, 'Player commitments remain player commitments and must not be cloned into the industry registry.');

const generatedExtras = Array.from({ length: 370 }, (_, index) => ({
    id: `generated_booked_${index}`,
    name: `Generated ${index}`,
    occupation: 'ACTOR',
    tier: 'RISING',
    avatar: '',
    salary: 1,
    stats: { talent: 50, fame: 10 },
}));
const compactionInput = structuredClone(INITIAL_PLAYER) as Player;
compactionInput.flags.extraNPCs = generatedExtras as any;
compactionInput.world = {
    ...compactionInput.world,
    talentBookings: [{
        id: 'talent:compaction_project:ACTOR:generated_booked_0',
        npcId: 'generated_booked_0',
        role: 'ACTOR',
        projectId: 'compaction_project',
        projectOwner: 'INDUSTRY_PRODUCTION',
        producerStudioId: 'PARAMOUNT',
        startAbsoluteWeek: 200,
        endAbsoluteWeek: 204,
        status: 'BOOKED',
    }],
};
const compacted = compactPlayerForPersistence(compactionInput);
assert.equal(
    compacted.flags.extraNPCs?.some(npc => npc.id === 'generated_booked_0'),
    true,
    'Compaction must retain generated NPCs referenced only by talent bookings.',
);

console.log('Industry talent booking audit passed: registries are pure, deterministic, conflict-safe, migration-safe, and compaction-safe.');
