import { NPC_DATABASE } from '../services/npcLogic';
import {
    CREW_PROFESSIONALS,
    getCrewMarketCycle,
    getRotatingCrewCandidates,
    normalizeCrewSelectionId,
} from '../services/crewMarket';
import type { CrewOccupation } from '../types';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const roles: CrewOccupation[] = [
    'CINEMATOGRAPHER',
    'COMPOSER',
    'LINE_PRODUCER',
    'VFX_SUPERVISOR',
];

assert(CREW_PROFESSIONALS.length === 40, 'The crew NPC catalog should contain 40 professionals.');
assert(normalizeCrewSelectionId('mus_1') === 'crew_comp_zimmer', 'Legacy composer selections should migrate to the matching NPC.');
assert(normalizeCrewSelectionId('vfx_1') === 'crew_vfx_muren', 'Legacy VFX selections should migrate to an appropriate supervisor NPC.');

for (const role of roles) {
    const roleCatalog = CREW_PROFESSIONALS.filter(npc => npc.crewRole === role);
    assert(roleCatalog.length === 10, `${role} should have 10 NPCs in its candidate pool.`);
}

const globalIds = new Set(NPC_DATABASE.map(npc => npc.id));
for (const npc of CREW_PROFESSIONALS) {
    assert(globalIds.has(npc.id), `${npc.name} must exist in the global NPC database.`);
    assert(Boolean(npc.avatar), `${npc.name} must have a portrait.`);
    assert(npc.avatar.startsWith('data:image/svg+xml'), `${npc.name} must use the shared in-game NPC portrait source.`);
    assert(Boolean(npc.bio), `${npc.name} must have a bio.`);
    assert(Boolean(npc.forbesCategory), `${npc.name} must have a Forbes identity.`);
    assert(Number(npc.salary) > 0, `${npc.name} must have a valid salary.`);
    assert(Number(npc.stats?.talent) > 0, `${npc.name} must have a talent rating.`);
    assert(Number(npc.stats?.fame) >= 0, `${npc.name} must have a fame rating.`);
    assert((npc.specialties || []).length >= 2, `${npc.name} must have useful specialties.`);
}

const stableComposerMarket = getRotatingCrewCandidates('COMPOSER', 33, 1);
const thirdComposer = stableComposerMarket[2];
const selectedComposerMarket = getRotatingCrewCandidates('COMPOSER', 33, 1, [thirdComposer.id]);
assert(
    selectedComposerMarket.map(candidate => candidate.id).join(',') === stableComposerMarket.map(candidate => candidate.id).join(','),
    'Selecting an in-market crew candidate must not move them to the first position.',
);

for (const role of roles) {
    const first = getRotatingCrewCandidates(role, 33, 1);
    const repeat = getRotatingCrewCandidates(role, 33, 1);
    const next = getRotatingCrewCandidates(role, 33, 4);

    assert(first.length === 4, `${role} should show four market candidates.`);
    assert(JSON.stringify(first) === JSON.stringify(repeat), `${role} market must be deterministic within a cycle.`);
    assert(
        first.map(candidate => candidate.id).join(',') !== next.map(candidate => candidate.id).join(','),
        `${role} market should change after three weeks.`,
    );
}

const composerCycles = Array.from({ length: 12 }, (_, index) => (
    getRotatingCrewCandidates('COMPOSER', 33, 1 + index * 3)
));
const hansAppearances = composerCycles.filter(candidates => (
    candidates.some(candidate => candidate.id === 'crew_comp_zimmer')
)).length;
assert(hansAppearances > 0, 'Hans Zimmer should sometimes be available.');
assert(hansAppearances < composerCycles.length, 'Hans Zimmer must not be permanently available.');

const currentComposer = getRotatingCrewCandidates('COMPOSER', 33, 1)[0];
let heldWeek = 4;
while (
    heldWeek <= 52
    && getRotatingCrewCandidates('COMPOSER', 33, heldWeek).some(candidate => candidate.id === currentComposer.id)
) {
    heldWeek += 3;
}
const heldMarket = getRotatingCrewCandidates('COMPOSER', 33, Math.min(heldWeek, 52), [currentComposer.id]);
const heldCandidate = heldMarket.find(candidate => candidate.id === currentComposer.id);
assert(Boolean(heldCandidate), 'Selected crew should remain available after the market changes.');
assert(heldCandidate?.isHeldForProject === true, 'A selected off-market candidate should be marked held.');

assert(
    getCrewMarketCycle(33, 52) !== getCrewMarketCycle(34, 1),
    'Crew market rotation must continue across an age/year boundary.',
);

console.log('Crew market audit passed.');
console.log(JSON.stringify({
    totalCrewNpcs: CREW_PROFESSIONALS.length,
    perRole: 10,
    candidatesPerCycle: 4,
    composerCyclesChecked: composerCycles.length,
    hansAppearances,
    heldCandidate: heldCandidate?.name,
}, null, 2));
