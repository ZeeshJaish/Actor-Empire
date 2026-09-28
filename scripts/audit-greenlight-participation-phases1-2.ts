import { INITIAL_PLAYER, type Player } from '../types';
import { generateWriters } from '../src/data/generators';
import { NPC_DATABASE } from '../services/npcLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import {
    buildGreenlightTalentParticipation,
    normalizeTalentBackendDraft,
    participationKey,
    setTalentBackendPoints,
    suggestReturningBackendDemand,
    calculateGreenlightCounterChance,
} from '../services/talentParticipation';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const originalRandom = Math.random;
let freshWriters;
try {
    Math.random = () => 0;
    freshWriters = generateWriters(5);
} finally {
    Math.random = originalRandom;
}
assert(freshWriters.length === 5, 'The writer market must still generate its requested slots.');
assert(freshWriters[0].id.startsWith('writer_npc_'), 'New featured writers must have stable NPC identities.');
assert(new Set(freshWriters.map(writer => writer.id)).size === 5, 'One market batch must not list the same writer NPC twice.');
assert(NPC_DATABASE.some(npc => npc.id === freshWriters[0].id && npc.occupation === 'WRITER'), 'A featured writer must resolve to the canonical NPC roster.');
assert(!['Quentin Tarantino', 'Aaron Sorkin'].includes(freshWriters[0].name), 'New writer names must be original fiction.');

const activeLegacyCommitment = {
    id: 'old_project_in_development',
    projectPhase: 'PRE_PRODUCTION',
    projectDetails: {
        title: 'Already in Development',
        writerId: 'legacy_writer_7',
        writerName: 'Old Save Writer',
        estimatedBudget: 8_000_000,
    },
};
const oldConcept = {
    id: 'old_concept',
    scriptId: 'old_script',
    castList: [{ id: 'lead_1', actorId: 'old_actor', salary: 100_000 }],
};
const legacy = {
    ...INITIAL_PLAYER,
    id: 'writer_backend_legacy_save',
    commitments: [activeLegacyCommitment],
    businesses: [{
        id: 'studio_old',
        type: 'PRODUCTION_STUDIO',
        name: 'Old Studio',
        balance: 10_000_000,
        studioState: {
            scripts: [{ id: 'old_script', title: 'Old Draft', status: 'READY', writerId: 'legacy_writer_7', author: 'Old Save Writer',
                sourceMaterial: 'SEQUEL', returningTalent: [{ role: 'LEAD_ACTOR', id: 'old_actor', originalSalary: 100_000,
                    newDemand: 120_000, accepted: false, negotiated: false, attemptsLeft: 3 }] }],
            concepts: [oldConcept],
            writers: [{ id: 'legacy_writer_7', name: 'Old Save Writer', fee: 10_000, skill: 60 }],
            ipMarket: [],
            lastMarketRefreshWeek: 1,
            lastWriterRefreshWeek: 1,
        },
    }],
} as unknown as Player;
const migrated = migratePlayerSave(JSON.parse(JSON.stringify(legacy)) as Player);
const commitment = migrated.commitments.find(item => item.id === activeLegacyCommitment.id);
assert(commitment?.projectDetails?.writerName === 'Old Save Writer', 'An active old project must retain its saved writer credit.');
assert(!commitment?.projectDetails?.talentParticipation, 'Migration must not invent backend liabilities on an active old project.');
const savedConcept = migrated.businesses.find(business => business.id === 'studio_old')?.studioState?.concepts?.[0];
assert(savedConcept?.id === 'old_concept', 'An old Greenlight draft must remain resumable.');
assert(!savedConcept?.talentBackendDraft, 'Old drafts must not acquire invented backend choices.');
const oldReturnDeal = migrated.businesses.find(business => business.id === 'studio_old')?.studioState?.scripts?.[0]?.returningTalent?.[0];
assert(oldReturnDeal?.newDemand === 120_000, 'An old sequel salary negotiation must retain its saved demand.');
assert(oldReturnDeal?.backendDemandPoints === undefined, 'An old sequel must not gain a new backend demand on migration.');

const leadKey = participationKey('ACTOR', 'lead_1', 'actor_alpha');
const replacementKey = participationKey('ACTOR', 'lead_1', 'actor_beta');
const directorKey = participationKey('DIRECTOR', 'director', 'director_alpha');
const writerKey = participationKey('WRITER', 'script_writer', 'writer_npc_mira_sen');
assert(leadKey !== replacementKey, 'Recasting must not transfer backend points to a different actor.');
assert(Object.keys(normalizeTalentBackendDraft(undefined)).length === 0, 'Missing legacy draft choices must normalize to zero.');
assert(Object.keys(normalizeTalentBackendDraft({ [leadKey]: NaN, [directorKey]: -5 })).length === 0, 'Malformed draft points must not create liabilities.');

const selected = [
    { role: 'ACTOR' as const, roleId: 'lead_1', talentId: 'actor_alpha', talentName: 'Actor Alpha', upfrontFee: 1_000_000 },
    { role: 'DIRECTOR' as const, roleId: 'director', talentId: 'director_alpha', talentName: 'Director Alpha', upfrontFee: 2_000_000 },
    { role: 'WRITER' as const, roleId: 'script_writer', talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', upfrontFee: 500_000 },
];
assert(buildGreenlightTalentParticipation('first_film', {}, selected) === undefined, 'A zero-point Greenlight must not create a payout package.');
let draft = normalizeTalentBackendDraft({});
draft = setTalentBackendPoints(draft, leadKey, 3, selected.map(item => participationKey(item.role, item.roleId, item.talentId)));
draft = setTalentBackendPoints(draft, directorKey, 2, selected.map(item => participationKey(item.role, item.roleId, item.talentId)));
draft = setTalentBackendPoints(draft, writerKey, 1, selected.map(item => participationKey(item.role, item.roleId, item.talentId)));
const packageOne = buildGreenlightTalentParticipation('first_film', draft, selected);
assert(packageOne?.schemaVersion === 1, 'New participation must be versioned.');
assert(packageOne?.contracts.length === 3, 'A first film may carry actor, director, and writer points.');
assert(packageOne?.contracts.find(contract => contract.role === 'ACTOR')?.backendPoints === 3, 'Actor points must persist exactly.');
assert(packageOne?.contracts.find(contract => contract.role === 'WRITER')?.upfrontFee === 500_000, 'The writer contract must retain its cash fee separately.');
assert(packageOne?.contracts.every(contract => contract.receiptsBasis === 'STUDIO_COLLECTED_TITLE_RECEIPTS'), 'Participation must not attach to platform subscribers or gross box office.');
assert(JSON.parse(JSON.stringify(packageOne)).contracts[0].contractId === packageOne?.contracts[0].contractId, 'Contract IDs must survive save serialization.');
const withNewProject = {
    ...INITIAL_PLAYER,
    id: 'new_project_save_round_trip',
    commitments: [{ ...activeLegacyCommitment, id: 'new_project', projectDetails: { ...activeLegacyCommitment.projectDetails, talentParticipation: packageOne } }],
} as unknown as Player;
const compacted = compactPlayerForPersistence(withNewProject);
const reopened = migratePlayerSave(JSON.parse(JSON.stringify(compacted)) as Player);
assert(reopened.commitments[0]?.projectDetails?.talentParticipation?.contracts.length === 3, 'A new contract package must survive compact-save and migration round trip.');
const replaced = buildGreenlightTalentParticipation('first_film', draft, [{ ...selected[0], talentId: 'actor_beta' }]);
assert(replaced === undefined, 'A replacement actor must not inherit the previous actor’s deal.');
const recastDraft = setTalentBackendPoints({ ...draft, [replacementKey]: 2 }, replacementKey, 2, [replacementKey, directorKey, writerKey]);
assert(!recastDraft[leadKey] && recastDraft[replacementKey] === 2, 'Recasting must clear the old actor’s inactive points without consuming the cap.');
const overPerson = setTalentBackendPoints(draft, leadKey, 4, selected.map(item => participationKey(item.role, item.roleId, item.talentId)));
assert(overPerson[leadKey] === 3, 'More than three points for one person must be refused.');
const actorDirectorKey = participationKey('DIRECTOR', 'director', 'actor_alpha');
const samePersonDraft = setTalentBackendPoints({ [leadKey]: 3 }, actorDirectorKey, 1, [leadKey, actorDirectorKey]);
assert(!samePersonDraft[actorDirectorKey], 'One person cannot receive three actor points and another director point.');
const samePersonPackage = buildGreenlightTalentParticipation('actor_director', { [leadKey]: 3, [actorDirectorKey]: 1 },
    [selected[0], { ...selected[1], talentId: 'actor_alpha', talentName: 'Actor Alpha' }]);
assert(samePersonPackage === undefined, 'Saved drafts with over-cap dual-role talent must not compile a contract.');
const fourthKey = participationKey('ACTOR', 'support_1', 'actor_gamma');
const fifthKey = participationKey('ACTOR', 'support_2', 'actor_delta');
let nearCap = { ...draft, [fourthKey]: 3 };
nearCap = setTalentBackendPoints(nearCap, fifthKey, 2, [...selected.map(item => participationKey(item.role, item.roleId, item.talentId)), fourthKey, fifthKey]);
assert(!nearCap[fifthKey], 'Project choices must never exceed the ten-point total cap.');
assert(suggestReturningBackendDemand('LEAD_ACTOR', 35_000_000, false) === 2, 'A major returning star may request two backend points.');
assert(suggestReturningBackendDemand('DIRECTOR', 12_000_000, false) === 1, 'A returning director may request one point.');
assert(suggestReturningBackendDemand('SUPPORTING_ACTOR', 3_000_000, false) === 0, 'Routine supporting hires must not demand backend automatically.');
assert(suggestReturningBackendDemand('LEAD_ACTOR', 35_000_000, true) === 0, 'Player/self staff cannot invent a backend demand.');
assert(calculateGreenlightCounterChance(0.5, 0, 2, 'ESTABLISHED') < calculateGreenlightCounterChance(0.5, 2, 2, 'ESTABLISHED'), 'Offering requested backend must improve a returning-talent counteroffer.');

console.log('Greenlight phases 1-2 writer identity and legacy safety: PASS');
