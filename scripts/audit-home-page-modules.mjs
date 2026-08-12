import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';

const home = readFileSync('views/HomePage.tsx', 'utf8');
const socialQa = readFileSync('views/home/homeSocialQaActions.ts', 'utf8');
const productionQa = readFileSync('views/home/homeProductionQaActions.ts', 'utf8');
const boxOfficeQa = readFileSync('views/home/homeBoxOfficeQaActions.ts', 'utf8');
const studioOwnershipQa = readFileSync('views/home/homeStudioOwnershipQaActions.ts', 'utf8');
const studioProductionQa = readFileSync('views/home/homeStudioProductionQaActions.ts', 'utf8');

const socialActions = [
  'triggerYoutubeBootstrap',
  'triggerYoutubeOffers',
  'triggerYoutubeRivalry',
  'triggerYoutubeCooldownReset',
  'triggerYoutubeMerchQa',
  'triggerInstagramBootstrap',
  'triggerInstagramReferralDM',
  'triggerInstagramBrandDM',
  'triggerInstagramCooldownReset',
  'triggerInstagramUnlockComposer',
  'triggerXBootstrap',
  'triggerXDramaPost',
  'triggerXSmallCreatorReset',
];

const productionActions = [
  'triggerSequelProposalSetup',
  'triggerSequelReleaseSetup',
  'triggerAwardCeremony',
  'triggerAwardsPolishQa',
  'triggerAwardInvite',
  'triggerCheatContract',
  'triggerCheatFranchiseContract',
  'triggerCheatPostProd',
  'triggerProductionCrisis',
  'triggerDirectorDecision',
];

const boxOfficeActions = [
  'triggerBoxOfficeDepthQa',
  'triggerBoxOfficeArchiveQa',
  'triggerAudiencePulseQa',
  'triggerSoundtrackRevenueQa',
];

const studioOwnershipActions = [
  'triggerStudioAcquisitionSigningCheat',
  'triggerPrivateEquityQa',
  'triggerVaultSortingQa',
  'triggerFullStudioSlateQa',
  'triggerLegacyProductionHouseMigrationQa',
];

const studioProductionActions = [
  'triggerLowConditionRestQa',
  'sanitizeProductionHouseReturnDealsQa',
  'triggerReturningTalentNegotiationQa',
  'triggerStudioScenario',
  'triggerFilmographySortQa',
  'triggerEpisodeRatingsQa',
  'triggerEpisodeRatingsProductionHouseQa',
  'triggerProductionRiskQa',
  'triggerRareHollywoodChaosQa',
];

assert(home.includes("import { createHomeSocialQaActions } from './home/homeSocialQaActions'"), 'HomePage should import the extracted social QA action factory.');
assert(home.includes('createHomeSocialQaActions({'), 'HomePage should create the social QA action contract.');
assert(home.includes("closeMenu: () => setActiveCheatMenu('NONE')"), 'Social QA actions should retain the HomePage-owned menu transition.');
assert(socialQa.includes('export interface HomeSocialQaActionsProps'), 'The social QA module should expose an explicit parent contract.');
assert(socialQa.includes('export const createHomeSocialQaActions'), 'The social QA module should export its action factory.');

for (const action of socialActions) {
  assert(!home.includes(`const ${action} =`), `${action} should not be defined inline in HomePage.`);
  assert(socialQa.includes(`const ${action} =`), `${action} should remain defined in the social QA module.`);
  assert(socialQa.includes(`    ${action},`), `${action} should remain part of the returned action contract.`);
}

assert(socialQa.includes('generateYoutubeCollabOffer(basePlayer)'), 'YouTube QA should retain canonical collaboration offer generation.');
assert(socialQa.includes('generateYoutubeBrandDeal(basePlayer)'), 'YouTube QA should retain canonical brand offer generation.');
assert(socialQa.includes("scenario: 'PROFIT' | 'LOSS' | 'COOLDOWN'"), 'YouTube merch QA should retain all three scenarios.');
assert(socialQa.includes("!transaction.id.includes('youtube_merch_')"), 'YouTube merch QA should still isolate previous QA finance entries.');
assert(socialQa.includes("NPC_DATABASE.find(npc => npc.handle === '@zendaya')"), 'Instagram QA should retain its preferred NPC fixture.');
assert(socialQa.includes("tag: 'CHEAT_IG_REFERRAL'"), 'Instagram referral QA should retain its actionable DM fixture.');
assert(socialQa.includes("tag: 'CHEAT_IG_BRAND'"), 'Instagram brand QA should retain its actionable DM fixture.');
assert(socialQa.includes("projectPhase: 'PRODUCTION'"), 'Instagram composer QA should still unlock the production moment.');
assert(socialQa.includes("postType: 'HOT_TAKE'"), 'X QA should retain its hot-take fixture.');
assert(socialQa.includes('closeMenu();'), 'Extracted actions should still close the developer menu after successful setup.');
assert(!socialQa.includes('setActiveCheatMenu'), 'Developer menu state ownership should remain in HomePage.');
assert(home.includes('const ensureCheatStudio = () => {'), 'HomePage should own the shared studio QA fixture used by local and extracted actions.');
assert(home.indexOf('const ensureCheatStudio = () => {') < home.indexOf('const triggerStudioBootstrap = () => {'), 'The shared studio QA fixture should be initialized before its first HomePage caller.');
assert(!socialQa.includes('const ensureCheatStudio = () => {'), 'The social QA module must not capture the shared studio fixture.');

assert(home.includes("import { createHomeProductionQaActions } from './home/homeProductionQaActions'"), 'HomePage should import the extracted production QA action factory.');
assert(home.includes('createHomeProductionQaActions({'), 'HomePage should create the production QA action contract.');
assert(productionQa.includes('export interface HomeProductionQaActionsProps'), 'The production QA module should expose an explicit parent contract.');
assert(productionQa.includes('export const createHomeProductionQaActions'), 'The production QA module should export its action factory.');

for (const action of productionActions) {
  assert(!home.includes(`const ${action} =`), `${action} should not be defined inline in HomePage.`);
  assert(productionQa.includes(`const ${action} =`), `${action} should remain defined in the production QA module.`);
  assert(productionQa.includes(`    ${action},`), `${action} should remain part of the returned production action contract.`);
}

assert(productionQa.includes("dummyDetails.subtype = 'SEQUEL'"), 'Sequel release QA should retain its continuation identity.');
assert(productionQa.includes("type: 'AWARD_CEREMONY'"), 'Award QA should retain ceremony event creation.');
assert(productionQa.includes("awardDef: { type: 'OSCAR'"), 'Awards polish QA should retain the multi-credit Oscar fixture.');
assert(productionQa.includes("type: 'OFFER_NEGOTIATION'"), 'Contract QA should retain negotiable offer creation.');
assert(productionQa.includes('universeContract: contract'), 'Franchise contract QA should retain the generated universe contract.');
assert(productionQa.includes("projectPhase: 'POST_PRODUCTION'"), 'Post-production QA should retain its release-ready project state.');
assert(productionQa.includes("import('../../services/crisisGenerator')"), 'Production crisis QA should retain lazy crisis generation.');
assert(productionQa.includes("import('../../services/directorGenerator')"), 'Director decision QA should retain lazy decision generation.');
assert(!productionQa.includes('setActiveCheatMenu'), 'Production QA should delegate menu state back to HomePage.');

assert(home.includes("import { createHomeBoxOfficeQaActions } from './home/homeBoxOfficeQaActions'"), 'HomePage should import the extracted Box Office QA action factory.');
assert(home.includes('createHomeBoxOfficeQaActions({'), 'HomePage should create the Box Office QA action contract.');
assert(home.includes('ensureCheatStudio,'), 'HomePage should pass its canonical studio fixture builder into Box Office QA.');
assert(home.includes('onOpenBoxOfficeCheat,'), 'HomePage should retain Box Office navigation ownership.');
assert(boxOfficeQa.includes('setPage?: (page: Page) => void;'), 'Box Office QA should receive mobile navigation through its typed contract.');
assert(boxOfficeQa.includes('setPage?.(Page.MOBILE)'), 'Audience QA should retain direct mobile navigation without relying on a free variable.');
assert(boxOfficeQa.includes('export interface HomeBoxOfficeQaActionsProps'), 'The Box Office QA module should expose an explicit parent contract.');
assert(boxOfficeQa.includes('export const createHomeBoxOfficeQaActions'), 'The Box Office QA module should export its action factory.');

for (const action of boxOfficeActions) {
  assert(!home.includes(`const ${action} =`), `${action} should not be defined inline in HomePage.`);
  assert(boxOfficeQa.includes(`const ${action} =`), `${action} should remain defined in the Box Office QA module.`);
  assert(boxOfficeQa.includes(`    ${action},`), `${action} should remain part of the returned Box Office action contract.`);
}

assert(boxOfficeQa.includes('calculateTheatricalDistributionBreakdown('), 'Box Office QA should retain canonical theatrical distribution calculations.');
assert(boxOfficeQa.includes('calculateStreamingDistributionBreakdown('), 'Box Office QA should retain canonical streaming distribution calculations.');
assert(boxOfficeQa.includes('const archiveScenarios = ['), 'Box Office archive QA should retain its scenario library.');
assert(boxOfficeQa.includes('buildAudienceReception('), 'Audience QA should retain canonical reception building.');
assert(boxOfficeQa.includes('calculateProjectMusicImpact('), 'Soundtrack QA should retain canonical music-impact calculations.');
assert(boxOfficeQa.includes('calculateWeeklySoundtrackRevenue('), 'Soundtrack QA should retain weekly revenue calculations.');
assert(boxOfficeQa.includes('onOpenBoxOfficeCheat?.()'), 'Extracted actions should retain direct Box Office navigation.');
assert(!boxOfficeQa.includes('setActiveCheatMenu'), 'Box Office QA should delegate menu state back to HomePage.');

assert(home.includes("import { createHomeStudioOwnershipQaActions } from './home/homeStudioOwnershipQaActions'"), 'HomePage should import the extracted studio-ownership QA action factory.');
assert(home.includes('createHomeStudioOwnershipQaActions({'), 'HomePage should create the studio-ownership QA action contract.');
assert(home.includes('onOpenProductionHouseCheat,'), 'HomePage should retain Production House navigation ownership.');
assert(home.includes('onOpenStudioAcquisitionCheat,'), 'HomePage should retain acquisition navigation ownership.');
assert(studioOwnershipQa.includes('export interface HomeStudioOwnershipQaActionsProps'), 'Studio ownership QA should expose an explicit parent contract.');
assert(studioOwnershipQa.includes('export const createHomeStudioOwnershipQaActions'), 'Studio ownership QA should export its action factory.');

for (const action of studioOwnershipActions) {
  assert(!home.includes(`const ${action} =`), `${action} should not be defined inline in HomePage.`);
  assert(studioOwnershipQa.includes(`const ${action} =`), `${action} should remain defined in the studio-ownership QA module.`);
  assert(studioOwnershipQa.includes(`    ${action},`), `${action} should remain part of the returned studio-ownership contract.`);
}

assert(studioOwnershipQa.includes("status: 'ACCEPTED'"), 'Acquisition signing QA should retain accepted seller terms.');
assert(studioOwnershipQa.includes('onOpenStudioAcquisitionCheat?.(studioId)'), 'Acquisition signing QA should retain its deep link.');
assert(studioOwnershipQa.includes("mode: 'MATURE_STAKE' | 'BUYER_OFFER'"), 'Private-equity QA should retain both scenarios.');
assert(studioOwnershipQa.includes("position?.studioId !== targetStudio.id"), 'Private-equity QA should preserve unrelated positions.');
assert(studioOwnershipQa.includes("status: 'READY'") && studioOwnershipQa.includes("status: 'PRODUCED'"), 'Vault QA should retain active and archived sorting fixtures.');
assert(studioOwnershipQa.includes("makeCommitment('PRODUCTION'"), 'Full studio slate QA should retain its production lane.');
assert(studioOwnershipQa.includes("business: {\n              type: 'Production House'"), 'Legacy migration QA should retain the old save shape.');
assert(!studioOwnershipQa.includes('setActiveCheatMenu'), 'Studio ownership QA should delegate menu state back to HomePage.');

assert(home.includes("import { createHomeStudioProductionQaActions } from './home/homeStudioProductionQaActions'"), 'HomePage should import the extracted studio-production QA action factory.');
assert(home.includes('createHomeStudioProductionQaActions({'), 'HomePage should create the studio-production QA action contract.');
assert(home.includes('setPage,'), 'HomePage should retain mobile navigation ownership for production QA.');
assert(studioProductionQa.includes('export interface HomeStudioProductionQaActionsProps'), 'Studio production QA should expose an explicit parent contract.');
assert(studioProductionQa.includes('export const createHomeStudioProductionQaActions'), 'Studio production QA should export its action factory.');

for (const action of studioProductionActions) {
  assert(!home.includes(`const ${action} =`), `${action} should not be defined inline in HomePage.`);
  assert(studioProductionQa.includes(`const ${action} =`), `${action} should remain defined in the studio-production QA module.`);
  assert(studioProductionQa.includes(`    ${action},`), `${action} should remain part of the returned studio-production contract.`);
}

assert(studioProductionQa.includes('lastHealthCrisisAbsoluteWeek: 0'), 'Condition QA should retain its recovery cooldown reset.');
assert(studioProductionQa.includes("duplicateMultiplier = 1"), 'Returning-talent QA should retain duplicate-volume testing.');
assert(studioProductionQa.includes("scenario: 'PLANNING' | 'PRODUCTION' | 'AWAITING_RELEASE'"), 'Studio scenario QA should retain its production phase contract.');
assert(studioProductionQa.includes('generateEpisodeRatings('), 'Episode-rating QA should retain the canonical generator.');
assert(studioProductionQa.includes("target: 'IMDB' | 'PRODUCTION_HOUSE'"), 'Episode-rating QA should retain both navigation targets.');
assert(studioProductionQa.includes("title: 'Risk Bomb'"), 'Production-risk QA should retain its downside fixture.');
assert(studioProductionQa.includes("kind: RareHollywoodChaosKind"), 'Rare-chaos QA should retain its typed scenario contract.');
assert(!studioProductionQa.includes('setActiveCheatMenu'), 'Studio production QA should delegate menu state back to HomePage.');

console.log('HomePage module audit passed: social, production, Box Office, studio-ownership, and studio-production QA actions retain their fixtures while HomePage owns menu state.');
