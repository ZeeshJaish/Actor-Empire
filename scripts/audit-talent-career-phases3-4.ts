import { strict as assert } from 'node:assert';
import { INITIAL_PLAYER, type Business, type IndustryProject, type TalentParticipationPackage } from '../types';
import { creditTalentProject, creditTalentUpfront, settleTalentReceipt, getTalentCareerProfile } from '../services/talentCareer';
import { generateFullBallot, resolveCanonicalAwardSeason } from '../services/awardLogic';
import { applyPlayerTalentReceipt } from '../services/playerTalentFinance';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { migratePlayerSave } from '../services/saveMigration';

const baseWorld = structuredClone(INITIAL_PLAYER.world);
const participation: TalentParticipationPackage = {
    schemaVersion: 1,
    processedReceiptKeys: [],
    contracts: [
        { contractId: 'film:actor', role: 'ACTOR', roleId: 'lead', talentId: 'actor_a', talentName: 'Actor A', upfrontFee: 200, backendPoints: 2, receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' },
        { contractId: 'film:writer', role: 'WRITER', roleId: 'writer', talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', upfrontFee: 100, backendPoints: 1, receiptsBasis: 'STUDIO_COLLECTED_TITLE_RECEIPTS' },
    ],
};

const zero = settleTalentReceipt(baseWorld, 'film', participation, 'theatrical:week:1', 0, 8);
assert.equal(zero.totalPaid, 0, 'A zero receipt cannot create talent income.');
assert.equal(zero.world, baseWorld, 'A zero receipt must leave the world untouched.');
const first = settleTalentReceipt(baseWorld, 'film', participation, 'theatrical:week:1', 1_000, 8);
assert.equal(first.totalPaid, 30, 'A $1,000 studio receipt pays 2% and 1%, not a percentage of gross box office.');
assert.equal(first.participation?.processedReceiptKeys.length, 1, 'The paid receipt key must persist on the contract package.');
assert.equal(getTalentCareerProfile(first.world, 'actor_a')?.income, 20, 'Actor backend income must be saved per NPC.');
assert.equal(getTalentCareerProfile(first.world, 'writer_npc_mira_sen')?.income, 10, 'Writer backend income must be saved per NPC.');
const persistedCareer = migratePlayerSave(compactPlayerForPersistence({ ...structuredClone(INITIAL_PLAYER), world: first.world }));
assert.equal(getTalentCareerProfile(persistedCareer.world, 'writer_npc_mira_sen')?.income, 10,
    'Compaction and migration must preserve named NPC earnings.');
assert.equal(settleTalentReceipt(persistedCareer.world, 'film', first.participation, 'theatrical:week:1', 1_000, 8).totalPaid, 0,
    'A reloaded save must not pay a receipt a second time.');
const replay = settleTalentReceipt(first.world, 'film', first.participation, 'theatrical:week:1', 1_000, 8);
assert.equal(replay.totalPaid, 0, 'A replayed receipt must never pay again.');
assert.deepEqual(replay.world, first.world, 'A replayed receipt cannot change NPC wealth.');
assert.equal(settleTalentReceipt(baseWorld, 'old_film', undefined, 'theatrical:week:1', 1_000, 8).totalPaid, 0, 'Old projects without contracts cannot get retroactive backend.');

const credit = creditTalentProject(baseWorld, 'film', [
    { talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', role: 'WRITER' },
], 'greenlight:film', 5);
assert.equal(getTalentCareerProfile(credit, 'writer_npc_mira_sen')?.projectIds[0], 'film', 'A hired writer gains a real project credit.');
assert.deepEqual(creditTalentProject(credit, 'film', [{ talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', role: 'WRITER' }], 'greenlight:film', 5), credit, 'Career credit must be idempotent.');
const upfront = creditTalentUpfront(credit, 'film', [
    { talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', role: 'WRITER', amount: 100 },
], 'greenlight-fee:film', 5);
assert.equal(upfront.totalCredited, 100, 'Already-budgeted writer fee becomes NPC income exactly once.');
assert.equal(creditTalentUpfront(upfront.world, 'film', [{ talentId: 'writer_npc_mira_sen', talentName: 'Mira Sen', role: 'WRITER', amount: 100 }], 'greenlight-fee:film', 5).totalCredited, 0, 'Upfront replay cannot mint wealth.');
assert.equal(getTalentCareerProfile(baseWorld, 'writer_npc_mira_sen'), undefined, 'The source save cannot inherit another save’s career changes.');
const studio = { id: 'studio_1', balance: 1_000, stats: { weeklyProfit: 500, weeklyRevenue: 1_000, lifetimeRevenue: 2_000 },
    studioState: { financeLedger: [] } } as unknown as Business;
const playerReceipt = applyPlayerTalentReceipt({ world: baseWorld, studio, projectId: 'film', projectTitle: 'Film',
    participation, receiptKey: 'theatrical:week:1', studioReceipts: 1_000, absoluteWeek: 8, year: 18, week: 9 });
assert.equal(playerReceipt.studio.balance, 970, 'A real title receipt must fund backend from the studio’s credited balance.');
assert.equal(playerReceipt.studio.stats.weeklyProfit, 470, 'Backend is a studio expense, not a revenue reversal.');
assert.equal(playerReceipt.studio.stats.lifetimeRevenue, 2_000, 'Backend cannot alter gross studio-revenue history.');
assert.equal(playerReceipt.studio.studioState?.financeLedger?.[0]?.type, 'TALENT_BACKEND', 'Studio finance must show the talent expense.');
const playerReplay = applyPlayerTalentReceipt({ world: playerReceipt.world, studio: playerReceipt.studio, projectId: 'film', projectTitle: 'Film',
    participation: playerReceipt.participation, receiptKey: 'theatrical:week:1', studioReceipts: 1_000, absoluteWeek: 8, year: 18, week: 9 });
assert.equal(playerReplay.studio.balance, 970, 'Replaying a receipt cannot debit the studio again.');

const awardProject = {
    id: 'new_award_film', title: 'Written Light', genre: 'DRAMA', studioId: 'studio_1', budgetTier: 'MID',
    quality: 100, rating: 9.8, boxOffice: 100_000_000, year: 18, weekReleased: 20,
    leadActorId: 'actor_a', leadActorName: 'Actor A', directorName: 'Director D',
    writerId: 'writer_npc_mira_sen', writerName: 'Mira Sen', reviews: 'Acclaimed',
    awardProfile: { leadPerformance: 90, directing: 90, screenplay: 100, cinematography: 90, picture: 90,
        originalScore: 90, originalSong: 90, campaign: 100 },
} as IndustryProject;
const awardPlayer = { ...INITIAL_PLAYER, world: { ...baseWorld, projects: [awardProject] } };
const ballot = generateFullBallot(awardPlayer, 'OSCAR', [], 19);
const screenplayNominee = ballot['Best Original Screenplay']?.find(nomination => nomination.project.id === awardProject.id);
assert.equal(screenplayNominee?.nomineeName, 'Mira Sen', 'Screenplay nomination must name the credited writer, not the lead actor.');
const winner = resolveCanonicalAwardSeason(awardPlayer, 'OSCAR', 19, undefined, {
    'Best Original Screenplay': [screenplayNominee!],
});
assert.equal(winner.winners.find(entry => entry.category === 'Best Original Screenplay')?.winnerName, 'Mira Sen', 'A new ceremony must preserve the writer on its canonical winner record.');
const legacyAwardPlayer = { ...awardPlayer, world: { ...baseWorld, projects: [{ ...awardProject, id: 'legacy_award_film', writerId: undefined, writerName: undefined }] } };
const legacyNominee = generateFullBallot(legacyAwardPlayer, 'OSCAR', [], 19)['Best Original Screenplay']?.find(nomination => nomination.project.id === 'legacy_award_film');
assert(legacyNominee?.nomineeName !== 'Actor A', 'A legacy missing writer must not be falsely credited to its lead actor.');
const playerWriterFilm = { id: 'player_hired_writer_film', name: 'The Written Horizon', type: 'ACTING_GIG', projectType: 'MOVIE',
    writerId: 'writer_npc_mira_sen', writerName: 'Mira Sen', projectQuality: 96, rating: 9.5,
    year: 18, releaseYear: 18, releaseWeek: 20, genre: 'DRAMA' } as unknown as typeof INITIAL_PLAYER.pastProjects[number];
const playerHiredWriterBallot = generateFullBallot({ ...INITIAL_PLAYER, pastProjects: [playerWriterFilm],
    world: { ...baseWorld, projects: [] } }, 'OSCAR', [], 19);
assert.equal(playerHiredWriterBallot['Best Original Screenplay']?.find(nomination => nomination.project.id === playerWriterFilm.id)?.nomineeName,
    'Mira Sen', 'A player studio film with a hired writer should credit that NPC on the ballot.');

console.log('Talent career phases 3-4 shared ledger audit: PASS');
