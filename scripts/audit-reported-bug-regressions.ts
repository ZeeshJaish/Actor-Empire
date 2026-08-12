import fs from 'node:fs';
import { INITIAL_PLAYER, Player, StudioContract } from '../types';
import { createBusiness, processBusinessWeek } from '../services/businessLogic';
import { migratePlayerSave } from '../services/saveMigration';
import { getActorTalent } from '../services/roleLogic';
import { mergeParentStudioTalentRosters } from '../services/talentRoster';
import {
    beginPendingRewardAd,
    clearPendingRewardAd,
    markPendingRewardAdReady,
    readPendingRewardAd,
    recordPendingRewardAdStep,
} from '../services/rewardedAdRecovery';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const activeContract = (id: string, npcId: string, moviesRemaining = 2): StudioContract => ({
    id,
    studioId: 'qa_parent',
    npcId,
    type: 'MOVIE_DEAL',
    paymentMode: 'UPFRONT',
    totalAmount: 1_000_000,
    maintenanceFee: 0,
    installmentsPaid: 0,
    totalInstallments: 1,
    moviesRemaining,
    totalMovies: 3,
    startWeek: 1,
    status: 'ACTIVE',
});

const reconciled = mergeParentStudioTalentRosters(
    'qa_parent',
    [activeContract('contract_a', 'actor_a')],
    [
        { ...activeContract('contract_a_old', 'actor_a'), moviesRemaining: 1 },
        { actorId: 'actor_b', id: 'legacy_actor_b', totalMovies: 2 } as any,
    ],
);
assert(reconciled.length === 2, 'Parent roster reconciliation should union legacy and business rosters.');
assert(reconciled.every(contract => contract.status === 'ACTIVE'), 'Missing legacy contract status should migrate to active.');

const studio = createBusiness('QA Parent', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 51);
studio.id = 'qa_parent';
studio.studioState!.lastMarketRefreshWeek = 51;
studio.studioState!.lastWriterRefreshWeek = 51;
studio.studioState!.lastMarketRefreshAbsoluteWeek = undefined;
studio.studioState!.lastWriterRefreshAbsoluteWeek = undefined;
const oldWriterIds = studio.studioState!.writers.map(writer => writer.id).join(',');
const yearRolloverResult = processBusinessWeek(studio, 50, 2, 'en', 31).updated;
assert(
    yearRolloverResult.studioState!.lastWriterRefreshAbsoluteWeek !== undefined,
    'Writer refresh should migrate from week-of-year timing to absolute timing.',
);
assert(
    yearRolloverResult.studioState!.writers.map(writer => writer.id).join(',') !== oldWriterIds,
    'Writer pool should refresh across a year rollover after three elapsed weeks.',
);

const migrationInput = clone(INITIAL_PLAYER) as Player;
migrationInput.businesses = [studio];
migrationInput.studio.talentRoster = [activeContract('global_a', 'actor_a')];
migrationInput.businesses[0].studioState!.talentRoster = [activeContract('business_b', 'actor_b')];
const migrated = migratePlayerSave(migrationInput);
assert(migrated.studio.talentRoster.length === 2, 'Save migration should restore every parent-studio contract.');
assert(
    migrated.businesses[0].studioState!.talentRoster?.length === 2,
    'Save migration should synchronize both parent roster storage locations.',
);

const maxActingSkills = Object.fromEntries(
    Object.keys(INITIAL_PLAYER.stats.skills).map(key => [key, 100]),
) as unknown as typeof INITIAL_PLAYER.stats.skills;
assert(getActorTalent(maxActingSkills) === 100, 'Acting talent should reflect the seven acting skills.');

const memory = new Map<string, string>();
(globalThis as any).localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
};
let rewardReceipt = beginPendingRewardAd({
    playerId: 'qa_player',
    saveSlot: 1,
    type: 'REWARDED_ENERGY',
    stepsRequired: 1,
});
rewardReceipt = recordPendingRewardAdStep(rewardReceipt, 1);
rewardReceipt = markPendingRewardAdReady(rewardReceipt);
assert(readPendingRewardAd()?.status === 'READY_TO_GRANT', 'Completed ad receipt should survive interruption until its grant is persisted.');
clearPendingRewardAd(rewardReceipt.id);
assert(readPendingRewardAd() === null, 'Persisted ad grant should clear only its matching receipt.');

const read = (path: string) => fs.readFileSync(path, 'utf8');
const dashboard = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const greenlight = read('views/lifestyle/business/GreenlightWizard.tsx');
const greenlightProjectBuilder = read('views/lifestyle/business/greenlightProjectBuilder.ts');
const releaseWizard = read('views/lifestyle/business/ReleaseWizard.tsx');
const mobilePage = read('views/mobile/MobilePage.tsx');
const gameLoop = read('services/gameLoop.ts');

assert(dashboard.includes('resolvedProjectType') && dashboard.includes('resolvedProjectGenre'), 'Project dashboard should display canonical format and genre.');
assert(dashboard.includes('hiddenStats?.rawHype') && !dashboard.includes('promotionalBuzz || project.projectDetails?.hiddenStats?.qualityScore'), 'Buzz UI must not substitute quality for a real zero buzz value.');
assert(greenlightProjectBuilder.includes('promotionalBuzz: currentEstimatedBuzz'), 'Greenlight should persist estimated buzz on the commitment.');
assert(gameLoop.includes('Number.isFinite(Number(updatedC.promotionalBuzz))'), 'Production wrap should preserve project buzz.');
assert(releaseWizard.includes('releasePlanningDraft') && releaseWizard.includes('lastPersistedDraftRef'), 'Release choices should persist while the wizard is interrupted.');
assert(mobilePage.includes('MOBILE_${appMode}') && mobilePage.includes("addBreadcrumb('mobile_app:open'"), 'Crash diagnostics should capture the exact phone app.');

console.log('Reported bug regression audit passed.');
