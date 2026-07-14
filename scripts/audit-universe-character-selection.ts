import assert from 'node:assert/strict';
import {
    getUniverseCharacterSelectionOptions,
    normalizeUniverseForSave,
    retireUniverseForArchive
} from '../services/universeLogic';
import { Player, Universe } from '../types';

const player = {
    name: 'QA Player',
    age: 31,
    currentWeek: 420,
    pastProjects: [],
    activeReleases: [],
    world: { universes: {} }
} as unknown as Player;

const activeUniverse = normalizeUniverseForSave({
    id: 'ACTIVE_CANON',
    name: 'Active Canon',
    studioId: 'PLAYER_STUDIO',
    currentPhase: 'PHASE_1_ORIGINS',
    saga: 1,
    momentum: 72,
    brandPower: 78,
    marketShare: 11,
    color: '#22c55e',
    roster: [
        { id: 'active_hero', characterId: 'active_hero', name: 'Active Hero', actorId: 'actor_active', actorName: 'Active Actor', status: 'ACTIVE', fanApproval: 74 },
        { id: 'retired_sidekick', characterId: 'retired_sidekick', name: 'Retired Sidekick', actorId: 'actor_sidekick', actorName: 'Sidekick Actor', status: 'RETIRED', fanApproval: 45 }
    ],
    slate: [],
    weeksUntilNextPhase: 52
} as unknown as Universe, 'ACTIVE_CANON');

const retiredUniverse = retireUniverseForArchive(normalizeUniverseForSave({
    id: 'RETIRED_CANON',
    name: 'Retired Canon',
    studioId: 'PLAYER_STUDIO',
    currentPhase: 'PHASE_3_WAR',
    saga: 3,
    momentum: 20,
    brandPower: 88,
    marketShare: 9,
    color: '#f59e0b',
    roster: [
        { id: 'old_legend', characterId: 'old_legend', name: 'Old Legend', actorId: 'actor_legacy', actorName: 'Legacy Actor', status: 'ACTIVE', fanApproval: 91 },
        { id: 'archived_ghost', characterId: 'archived_ghost', name: 'Archived Ghost', actorId: 'actor_ghost', actorName: 'Ghost Actor', status: 'RETIRED', fanApproval: 67 }
    ],
    slate: [],
    weeksUntilNextPhase: 52
} as unknown as Universe, 'RETIRED_CANON'), 38, 12);

const universes = {
    [activeUniverse.id]: activeUniverse,
    [retiredUniverse.id]: retiredUniverse
};

const activeTargetOptions = getUniverseCharacterSelectionOptions(player, universes, {
    targetUniverseId: activeUniverse.id,
    studioId: 'PLAYER_STUDIO'
});

assert.deepEqual(
    activeTargetOptions.map(option => option.name),
    ['Active Hero'],
    'active target selection should show only active characters from the active universe'
);

const standaloneOptions = getUniverseCharacterSelectionOptions(player, universes, {
    studioId: 'PLAYER_STUDIO'
});

assert.ok(standaloneOptions.some(option => option.name === 'Active Hero'), 'standalone connected picker can see active owned canon');
assert.ok(!standaloneOptions.some(option => option.name === 'Old Legend'), 'retired-universe characters must not leak into normal new-character selection');
assert.ok(!standaloneOptions.some(option => option.name === 'Archived Ghost'), 'retired characters inside retired universes must stay hidden by default');

const retiredTargetOptions = getUniverseCharacterSelectionOptions(player, universes, {
    targetUniverseId: retiredUniverse.id,
    studioId: 'PLAYER_STUDIO'
});

assert.equal(retiredTargetOptions.length, 0, 'targeting an archived universe should not expose names without legacy opt-in');

const withLegacyArchive = getUniverseCharacterSelectionOptions(player, universes, {
    targetUniverseId: activeUniverse.id,
    includeLegacyArchive: true,
    studioId: 'PLAYER_STUDIO'
});

const legacyOptions = withLegacyArchive.filter(option => option.legacyArchive);
assert.deepEqual(
    legacyOptions.map(option => option.name).sort(),
    ['Archived Ghost', 'Old Legend'],
    'legacy opt-in should expose retired-universe names only in the legacy bucket'
);
assert.ok(legacyOptions.every(option => option.retiredUniverse), 'legacy options must be marked as retired-universe options');
assert.ok(legacyOptions.every(option => option.sourceUniverseId === retiredUniverse.id), 'legacy options must preserve their source universe');
assert.ok(legacyOptions.every(option => /Legacy Archive/.test(option.sourceName)), 'legacy options should label the archive source clearly');

console.log('Universe character selection audit passed.');
