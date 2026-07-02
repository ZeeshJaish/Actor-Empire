import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const i18nSource = read('services/i18n.ts');
const appSource = read('App.tsx');
const settingsSource = read('views/SettingsPage.tsx');
const bottomNavSource = read('components/BottomNav.tsx');
const guideSource = read('components/GuideView.tsx');
const boxOfficeSource = read('views/mobile/BoxOfficeApp.tsx');
const lifestyleSource = read('views/LifestylePage.tsx');
const socialSource = read('views/SocialPage.tsx');
const lifestyleActivitiesSource = read('views/lifestyle/LifestyleActivities.tsx');
const gameActionsSource = read('hooks/useGameActions.ts');
const lifeEventModalSource = read('components/LifeEventModal.tsx');
const productionCrisisModalSource = read('components/ProductionCrisisModal.tsx');
const lifeEventLogicSource = read('services/lifeEventLogic.ts');
const gameLoopSource = read('services/gameLoop.ts');
const productionServiceSource = read('services/productionService.ts');
const directorGeneratorSource = read('services/directorGenerator.ts');
const crisisGeneratorSource = read('services/crisisGenerator.ts');
const productionEventsSource = read('services/productionEvents.ts');
const acquisitionDebtSource = read('services/acquisitionDebt.ts');
const awardLogicSource = read('services/awardLogic.ts');
const newsLogicSource = read('services/newsLogic.ts');
const xLogicSource = read('services/xLogic.ts');
const redCarpetSource = read('views/RedCarpetEvent.tsx');
const businessLogicSource = read('services/businessLogic.ts');
const businessDashboardSource = read('views/lifestyle/business/BusinessDashboard.tsx');
const productionHouseSource = read('views/lifestyle/business/ProductionHouseGame.tsx');
const regulatorPressureSource = read('services/regulatorPressure.ts');
const talentInstabilitySource = read('services/talentInstability.ts');
const rivalRetaliationSource = read('services/rivalRetaliation.ts');
const worldReactionsSource = read('services/worldReactions.ts');
const shareholderVotingSource = read('services/shareholderVoting.ts');
const youtubeEventLogicSource = read('services/youtubeEventLogic.ts');

const failures = [];
const warnings = [];

const getSupportedLanguages = () => {
  const match = i18nSource.match(/SUPPORTED_LANGUAGES[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  return [...match[1].matchAll(/\bid:\s*'([^']+)'/g)].map((entry) => entry[1]);
};

const findObjectBody = (source, marker) => {
  const markerIndex = source.indexOf(marker);
  if (markerIndex === -1) return null;
  const openIndex = source.indexOf('{', markerIndex);
  if (openIndex === -1) return null;

  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let index = openIndex; index < source.length; index += 1) {
    const char = source[index];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      quote = char;
      continue;
    }

    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(openIndex + 1, index);
    }
  }

  return null;
};

const parseTranslationEntries = (language) => {
  const localeFile = `services/localization/locales/${language}.ts`;
  const localePath = path.join(root, localeFile);
  if (!fs.existsSync(localePath)) {
    failures.push(`Missing locale file for ${language}: ${localeFile}`);
    return new Map();
  }

  const localeSource = read(localeFile);
  const body = findObjectBody(localeSource, '=');
  if (!body) {
    failures.push(`Missing translation object for ${language} in ${localeFile}.`);
    return new Map();
  }

  const entries = new Map();
  const entryPattern = /^\s*'([^']+)':\s*(['"`])((?:\\.|(?!\2).)*)\2,?\s*$/gm;
  for (const match of body.matchAll(entryPattern)) {
    entries.set(match[1], match[3]);
  }
  return entries;
};

const placeholders = (value) =>
  [...String(value).matchAll(/\{([a-zA-Z0-9_]+)\}/g)]
    .map((match) => match[1])
    .sort();

const sameList = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const supportedLanguages = getSupportedLanguages();
if (supportedLanguages.length < 2) {
  failures.push('Expected at least English and one translated language in SUPPORTED_LANGUAGES.');
}

const translations = new Map(supportedLanguages.map((language) => [language, parseTranslationEntries(language)]));
const english = translations.get('en') || new Map();

for (const language of supportedLanguages) {
  const entries = translations.get(language) || new Map();
  const missing = [...english.keys()].filter((key) => !entries.has(key));
  const extra = [...entries.keys()].filter((key) => !english.has(key));

  if (missing.length > 0) {
    failures.push(`${language} is missing ${missing.length} key(s): ${missing.slice(0, 12).join(', ')}`);
  }

  if (extra.length > 0) {
    failures.push(`${language} has ${extra.length} extra key(s): ${extra.slice(0, 12).join(', ')}`);
  }

  for (const [key, englishValue] of english.entries()) {
    if (!entries.has(key)) continue;
    const sourcePlaceholders = placeholders(englishValue);
    const translatedPlaceholders = placeholders(entries.get(key));
    if (!sameList(sourcePlaceholders, translatedPlaceholders)) {
      failures.push(`${language}.${key} placeholder mismatch: expected {${sourcePlaceholders.join('},{')}} but found {${translatedPlaceholders.join('},{')}}`);
    }
  }
}

if (/export\s+const\s+getPlayerLanguage[\s\S]*?return\s+['"]en['"]\s*;/.test(i18nSource)) {
  failures.push('getPlayerLanguage is still hard-locked to English.');
}

if (/safePlayer\.settings\.language\s*=\s*['"]en['"]\s*;/.test(appSource)) {
  failures.push('App.tsx still forces safePlayer.settings.language to English during hydration.');
}

if (!settingsSource.includes('SUPPORTED_LANGUAGES')) {
  failures.push('SettingsPage does not render from SUPPORTED_LANGUAGES yet.');
}

if (settingsSource.includes('settings.languageComingSoon')) {
  failures.push('SettingsPage still shows the language-coming-soon lockout.');
}

if (!settingsSource.includes('coverageSubtext') || !settingsSource.includes('aria-pressed')) {
  failures.push('SettingsPage language selector is missing coverage/status UX metadata.');
}

const phase3SettingsHardcodedMarkers = [
  "renderSubpageHeader('Display', 'Performance')",
  "renderSubpageHeader('Help', 'Support')",
  'Report Issue',
  'Copy Debug ID',
  'What happened?',
  'Auto attached',
  'Send Report',
  'Smooth Mode',
  'Visual Mode'
].filter((marker) => settingsSource.includes(marker));

if (phase3SettingsHardcodedMarkers.length > 0) {
  failures.push(`SettingsPage Phase 3A support/performance copy is still hard-coded: ${phase3SettingsHardcodedMarkers.slice(0, 8).join(', ')}`);
}

const hardcodedBottomNavLabels = [
  "'Home'",
  "'Career'",
  "'Improve'",
  "'Social'",
  "'Lifestyle'",
  "'Mobile'"
].filter((label) => bottomNavSource.includes(`label: ${label}`));

if (hardcodedBottomNavLabels.length > 0) {
  failures.push(`BottomNav still has hard-coded player-facing labels: ${hardcodedBottomNavLabels.join(', ')}`);
}

if (!bottomNavSource.includes('getPlayerLanguage') || !bottomNavSource.includes("t(language, 'nav.")) {
  failures.push('BottomNav does not render nav labels through the i18n helper yet.');
}

const phase3GuideHardcodedMarkers = [
  'Player Guide',
  'Quick Start Tour',
  'Getting Started',
  'Why am I not getting bigger roles?',
  'Finish Tour',
  'No exact formula',
].filter((marker) => guideSource.includes(marker));

if (phase3GuideHardcodedMarkers.length > 0) {
  failures.push(`GuideView Phase 3B copy is still hard-coded: ${phase3GuideHardcodedMarkers.join(', ')}`);
}

if (!guideSource.includes('getPlayerLanguage') || !guideSource.includes("t(language, 'guide.")) {
  failures.push('GuideView does not render guide copy through the i18n helper yet.');
}

const phase3AppBabyHardcodedMarkers = [
  'Name Your Baby',
  'First Name',
  'Last Name',
  'Full Name Preview',
  'Walk Away',
  'Welcome Baby',
  'Baby Named',
  'Parenthood Rejected',
].filter((marker) => appSource.includes(marker));

if (phase3AppBabyHardcodedMarkers.length > 0) {
  failures.push(`App.tsx baby naming copy is still hard-coded: ${phase3AppBabyHardcodedMarkers.join(', ')}`);
}

if (!appSource.includes('getPlayerLanguage') || !appSource.includes("tr('app.babyNaming.")) {
  failures.push('App.tsx baby naming UI does not render through the i18n helper yet.');
}

const phase3AppPromptHardcodedMarkers = [
  'Intimacy with',
  'Use Protection',
  'Unprotected',
  'Event resolved.',
  'Event Recovery',
  'Acquisition Desk Unavailable',
  'Opening Acquisition Desk',
  'Stock Route Unavailable',
  'Opening Stocks',
].filter((marker) => appSource.includes(marker));

if (phase3AppPromptHardcodedMarkers.length > 0) {
  failures.push(`App.tsx Phase 3D prompt/toast copy is still hard-coded: ${phase3AppPromptHardcodedMarkers.join(', ')}`);
}

if (!appSource.includes("tr('app.intimacyPrompt.") || !appSource.includes("tr('app.stockControl.")) {
  failures.push('App.tsx Phase 3D prompts/toasts do not render through the i18n helper yet.');
}

const phase3AppFeedbackHardcodedMarkers = [
  'Pregnancy Already Active',
  'Pregnancy Confirmed',
  'Week Processing Failed',
  'Press Tour Complete',
  'Bailout Limit Reached',
  'Reward Cancelled',
  'Reward Received',
  'Purchase Cancelled',
  'Purchase Failed',
  'Purchase Confirmed',
  'Restore Failed',
  'Nothing to Restore',
  'Purchases Restored',
  'Too Many Posts',
  'Not Enough Energy',
  'Posted',
  'Referral Accepted',
  'Brand Deal Accepted',
  'Not Enough Money',
  'Agent Hired!',
  'Manager Hired!',
  'Counter Accepted',
  'Counter Declined',
  'Producer Share Bought',
  'Deal Blocked',
].filter((marker) => appSource.includes(marker));

if (phase3AppFeedbackHardcodedMarkers.length > 0) {
  failures.push(`App.tsx Phase 3E feedback toasts are still hard-coded: ${phase3AppFeedbackHardcodedMarkers.join(', ')}`);
}

if (!appSource.includes("tr('app.feedback.") || !appSource.includes("tr('app.rewards.") || !appSource.includes("tr('app.socialFeedback.")) {
  failures.push('App.tsx Phase 3E feedback toasts do not render through the i18n helper yet.');
}

const phase3AppModalHardcodedMarkers = [
  'Financial Ruin',
  'Bankruptcy Warning',
  'What&apos;s New',
  'Studio & Streaming',
  'Previous Notes',
  'Manage Finances',
].filter((marker) => appSource.includes(marker));

if (phase3AppModalHardcodedMarkers.length > 0) {
  failures.push(`App.tsx Phase 3F debt/ad/update modal copy is still hard-coded: ${phase3AppModalHardcodedMarkers.join(', ')}`);
}

const phase3BoxOfficeHardcodedMarkers = [
  "label: 'Live'",
  "label: 'Weekly'",
  "metricLabel: 'Top Worldwide'",
  'Current read',
  'Investor Split',
  'Market Rank Leader',
  'History Included',
].filter((marker) => boxOfficeSource.includes(marker));

if (phase3BoxOfficeHardcodedMarkers.length > 0) {
  failures.push(`BoxOfficeApp Phase 3 static chrome is still hard-coded: ${phase3BoxOfficeHardcodedMarkers.join(', ')}`);
}

if (!boxOfficeSource.includes("tr('box.") || !boxOfficeSource.includes('labelKey')) {
  failures.push('BoxOfficeApp does not render static chrome through i18n keys yet.');
}

const phase3LifestyleHardcodedMarkers = [
  'Trips, nightlife, wellness, family, and legacy memories.',
  'Pet Care',
  'Feed & Care',
  'Vet Visit',
].filter((marker) => lifestyleSource.includes(marker) || socialSource.includes(marker));

if (phase3LifestyleHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle/Social Phase 3 activity and pet-care copy is still hard-coded: ${phase3LifestyleHardcodedMarkers.join(', ')}`);
}

const phase3ActivitiesHardcodedMarkers = [
  'Spendable Cash',
  'Experience Builder',
  'Trip Activities',
  'Industry Guest List',
  'Available Children',
  'Checkout Setup',
  'Memory only',
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase3ActivitiesHardcodedMarkers.length > 0) {
  failures.push(`LifestyleActivities Phase 3 builder chrome is still hard-coded: ${phase3ActivitiesHardcodedMarkers.join(', ')}`);
}

const phase4LifeEventModalHardcodedMarkers = [
  'Golden Outcome',
  'Handled Like A Pro',
  'The World Reacted',
  'Choice Locked In',
  'Decision:',
  'What Happened',
  'Visible Impact',
  'Preparing Golden Option',
  'Life Story',
  'Select Action',
  'Retry Continue',
  'Moment Handled',
].filter((marker) => lifeEventModalSource.includes(marker));

if (phase4LifeEventModalHardcodedMarkers.length > 0) {
  failures.push(`LifeEventModal Phase 4A shell copy is still hard-coded: ${phase4LifeEventModalHardcodedMarkers.join(', ')}`);
}

if (!lifeEventModalSource.includes('getPlayerLanguage') || !lifeEventModalSource.includes("tr('life.modal.")) {
  failures.push('LifeEventModal does not render modal shell copy through the i18n helper yet.');
}

if (!lifeEventModalSource.includes('titleKey') || !lifeEventModalSource.includes('descriptionKey') || !lifeEventModalSource.includes('labelKey')) {
  failures.push('LifeEventModal does not support localized LifeEvent text refs yet.');
}

const assertLifeEventNearbyKeys = (field, keyField, windowSize = 8) => {
  const lines = lifeEventLogicSource.split('\n');
  const missing = [];
  const fieldPattern = new RegExp(`\\b${field}\\s*:`);
  const keyPattern = new RegExp(`\\b${keyField}\\s*:`);

  lines.forEach((line, index) => {
    if (!fieldPattern.test(line)) return;
    const window = lines.slice(index, index + windowSize + 1).join('\n');
    if (!keyPattern.test(window)) {
      missing.push(index + 1);
    }
  });

  if (missing.length > 0) {
    failures.push(`services/lifeEventLogic.ts ${field} entries missing nearby ${keyField}: ${missing.slice(0, 20).join(', ')}`);
  }
};

assertLifeEventNearbyKeys('title', 'titleKey');
assertLifeEventNearbyKeys('description', 'descriptionKey');
assertLifeEventNearbyKeys('label', 'labelKey');
assertLifeEventNearbyKeys('log', 'logKey', 10);

const phase4YoutubeRequiredRefs = [
  "titleKey: 'life.event.youtube.copyright.title'",
  "titleKey: 'life.event.youtube.backlash.title'",
  "titleKey: `life.event.youtube.creatorInvite.${kind}.title`",
  "titleKey: 'life.event.youtube.rivalry.title'",
  "labelKey: 'life.effect.audienceTrust'",
  "labelKey: 'life.effect.controversy'",
  "labelKey: 'life.effect.views'",
].filter((marker) => !gameLoopSource.includes(marker));

if (phase4YoutubeRequiredRefs.length > 0) {
  failures.push(`YouTube story events are missing Phase 4 localization refs: ${phase4YoutubeRequiredRefs.join(', ')}`);
}

const phase4StoryFactoryRefs = [
  [regulatorPressureSource, "titleKey: type === 'RIVAL_COMPLAINT'", "logKey = 'life.event.regulator.log.cooperate'", 'regulator pressure'],
  [talentInstabilitySource, "titleKey: type === 'KEY_STAFF_EXIT_RISK'", "logKey = 'life.event.talent.log.retention'", 'talent instability'],
  [rivalRetaliationSource, "titleKey: type === 'RIVAL_COUNTER_BID'", "logKey = 'life.event.rival.log.quiet'", 'rival retaliation'],
  [worldReactionsSource, "titleKey: 'life.event.world.antitrust.title'", "logKey = 'life.event.world.log.antitrust.safe'", 'world reactions'],
  [shareholderVotingSource, "titleKey: 'life.event.shareholder.title'", "logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.for.log'", 'shareholder voting'],
];

const missingStoryFactoryRefs = phase4StoryFactoryRefs
  .filter(([source, titleMarker, logMarker]) => !source.includes(titleMarker) || !source.includes(logMarker))
  .map(([, , , label]) => label);

if (missingStoryFactoryRefs.length > 0) {
  failures.push(`Story event factories are missing Phase 4 localization refs: ${missingStoryFactoryRefs.join(', ')}`);
}

const phase4OutcomeRefs = [
  [youtubeEventLogicSource, "logKey: 'life.event.youtube.log.copyright.accept'", 'YouTube outcome logs'],
  [youtubeEventLogicSource, "labelKey: 'life.effect.legalCase'", 'YouTube impact labels'],
  [gameLoopSource, "titleKey: 'life.event.audit.government.title'", 'government audit event'],
  [gameLoopSource, "logKey: 'life.event.audit.government.pay.log'", 'government audit outcomes'],
];

const missingOutcomeRefs = phase4OutcomeRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingOutcomeRefs.length > 0) {
  failures.push(`Phase 4 outcome refs are missing: ${missingOutcomeRefs.join(', ')}`);
}

const phase4ProductionModalHardcodedMarkers = [
  'Production Update',
  'Issue Settled',
  'Preparing Golden Option',
  'Director Decision',
  'Production Alert',
  'Creative Choice',
  'Select Action',
  'Continue Safely',
].filter((marker) => productionCrisisModalSource.includes(marker));

if (phase4ProductionModalHardcodedMarkers.length > 0) {
  failures.push(`ProductionCrisisModal Phase 4B shell copy is still hard-coded: ${phase4ProductionModalHardcodedMarkers.join(', ')}`);
}

if (!productionCrisisModalSource.includes('getPlayerLanguage') || !productionCrisisModalSource.includes("tr('production.modal.")) {
  failures.push('ProductionCrisisModal does not render modal shell copy through the i18n helper yet.');
}

if (!productionCrisisModalSource.includes('titleKey') || !productionCrisisModalSource.includes('descriptionKey') || !productionCrisisModalSource.includes('labelKey')) {
  failures.push('ProductionCrisisModal does not support localized production event text refs yet.');
}

const phase4ProductionSchedulingRefs = [
  "titleKey: crisis.titleKey",
  "descriptionKey: crisis.descriptionKey",
  "labelKey: o.labelKey",
  "logKey: result.logKey",
  "t(language, result.logKey",
].filter((marker) => !gameLoopSource.includes(marker) && !productionServiceSource.includes(marker));

if (phase4ProductionSchedulingRefs.length > 0) {
  failures.push(`Production/director events are missing queued localization refs: ${phase4ProductionSchedulingRefs.join(', ')}`);
}

const phase4ProductionFactoryRefs = [
  [directorGeneratorSource, "titleKey: 'production.director.bigStunt.title'", "logKey: 'production.director.bigStunt.practical.log'", 'director decisions'],
  [crisisGeneratorSource, "titleKey: 'production.crisis.corruptedFootage.title'", "logKey: 'production.crisis.generated.money.log'", 'generative crises'],
  [productionServiceSource, "titleKey: 'production.crisis.diva.title'", "logKey: 'production.crisis.diva.golden.log'", 'trait production crises'],
];

const missingProductionFactoryRefs = phase4ProductionFactoryRefs
  .filter(([source, titleMarker, logMarker]) => !source.includes(titleMarker) || !source.includes(logMarker))
  .map(([, , , label]) => label);

if (missingProductionFactoryRefs.length > 0) {
  failures.push(`Production/director factories are missing Phase 4 localization refs: ${missingProductionFactoryRefs.join(', ')}`);
}

const phase4ProductionEventsRequiredRefs = [
  "titleKey: 'production.event.camera.title'",
  "logKey: 'production.event.camera.reshoot.log'",
  "titleKey: 'production.event.hurricane.title'",
  "titleKey: 'production.event.scriptLeaked.title'",
  "titleKey: 'production.event.stuntCraft.title'",
  "titleKey: 'production.event.creativeDiff.title'",
  "titleKey: 'production.event.catering.title'",
  "titleKey: 'production.event.wardrobe.title'",
  "titleKey: 'production.event.drone.title'",
  "titleKey: 'production.event.trailerEnvy.title'",
  "titleKey: 'production.event.marshalStunt.title'",
  "titleKey: 'production.event.methodAdr.title'",
  "titleKey: 'production.event.scriptCafe.title'",
  "titleKey: 'production.event.musicalChoreo.title'",
  "titleKey: 'production.event.musicalSoundtrack.title'",
  "titleKey: 'production.event.biopicFamily.title'",
  "titleKey: 'production.event.biopicTransformation.title'",
  "titleKey: 'production.event.sportsTraining.title'",
  "titleKey: 'production.event.sportsConsultant.title'",
  "titleKey: 'production.event.docSubject.title'",
  "titleKey: 'production.event.docFootage.title'",
  "titleKey: 'production.event.animationDelay.title'",
  "titleKey: 'production.event.animationVoice.title'",
  "titleKey: 'production.event.animeFandom.title'",
  "titleKey: 'production.event.crimeLegal.title'",
  "titleKey: 'production.event.mysteryClues.title'",
  "titleKey: 'production.event.mysteryTheory.title'",
  "titleKey: 'production.event.fantasyLore.title'",
].filter((marker) => !productionEventsSource.includes(marker));

if (phase4ProductionEventsRequiredRefs.length > 0) {
  failures.push(`Production event templates are missing Phase 4 localization refs: ${phase4ProductionEventsRequiredRefs.join(', ')}`);
}

const phase5AppGeneratedContentMarkers = [
  'SCANDAL: ${prev.name} Welcomes Secret Love Child!',
  'Fans shocked by sudden baby announcement with partner',
  'upgrades their address with',
  'The move is already being read as a statement',
  'Celebrity real-estate brain is fully activated now.',
  'That is not transport, that is messaging.',
  'adds ${item.name} to a growing luxury fleet',
  'full jet-set fantasy',
  'Luxury-watch and style accounts are going to have a field day.',
  'Added ${item.name} to your lifestyle collection.',
  'Bought ${item.name}. Your social circle',
  'Bought ${item.name}. The garage',
  'Bought ${item.name}. Your life now',
  'Bought ${item.name}. Style buzz',
].filter((marker) => appSource.includes(marker));

if (phase5AppGeneratedContentMarkers.length > 0) {
  failures.push(`App.tsx Phase 5 generated news/social/log copy is still hard-coded: ${phase5AppGeneratedContentMarkers.slice(0, 10).join(', ')}`);
}

const phase5AppGeneratedContentRefs = [
  "tr('app.generated.babyScandal.headline'",
  "tr('app.generated.lifestyle.homeNewsHeadline'",
  "tr('app.generated.lifestyle.homeSocial'",
  "tr('app.generated.lifestyle.vehicleSocial'",
  "tr('app.generated.lifestyle.skySeaNewsHeadline'",
  "tr('app.generated.lifestyle.ultimateSocial'",
  "tr('app.generated.lifestyle.defaultLog'",
].filter((marker) => !appSource.includes(marker));

if (phase5AppGeneratedContentRefs.length > 0) {
  failures.push(`App.tsx Phase 5 generated content refs are missing: ${phase5AppGeneratedContentRefs.join(', ')}`);
}

const phase5GameActionsHardcodedMarkers = [
  "title: 'Not Enough Cash'",
  "title: 'Not Enough Energy'",
  "title: 'Pet Care'",
  'Use pet-specific care actions for companions.',
  'Breakup Finalized',
  'Divorce Settled',
  'Court Fight Resolved',
  'Child Abandoned',
  'Reconnection Started',
  'Own a premium home first to host estate dates.',
  'Own a Sky & Sea asset first to unlock that lifestyle move.',
  'Own an Ultimate Lifestyle item first to pull off that flex.',
  'ultra-private nights at a luxury estate',
  'spotted on open water',
  'jet-set escape',
  'luxury blogs guessing the price',
].filter((marker) => gameActionsSource.includes(marker));

if (phase5GameActionsHardcodedMarkers.length > 0) {
  failures.push(`useGameActions Phase 5 relationship/pet generated copy is still hard-coded: ${phase5GameActionsHardcodedMarkers.slice(0, 12).join(', ')}`);
}

const phase5GameActionsRefs = [
  "tr('actions.pet.feed.label'",
  "tr('actions.pet.notEnoughCashTitle'",
  "tr('actions.relationship.breakupTitle'",
  "tr('actions.relationship.lockedHomeSubtext'",
  "tr('actions.generated.estateDate.headline'",
  "tr('actions.generated.yachtDate.headline'",
  "tr('actions.generated.jetEscape.headline'",
  "tr('actions.generated.luxuryGift.headline'",
].filter((marker) => !gameActionsSource.includes(marker));

if (phase5GameActionsRefs.length > 0) {
  failures.push(`useGameActions Phase 5 relationship/pet refs are missing: ${phase5GameActionsRefs.join(', ')}`);
}

const phase5GameActionsSecondHardcodedMarkers = [
  'They are not in the mood tonight and want space.',
  'That kind of relationship is not romantic.',
  'Not Tonight',
  'Practiced ${genre} techniques. Skill improved.',
  'Genre Training',
  'You completed ${option.label}.',
  'Minor Setback',
  'Great Progress!',
  'In Memory',
  'Just Married!',
  'YES! You are now married.',
  'New Follower!',
  'New Connection!',
  'Relationship Improved',
].filter((marker) => gameActionsSource.includes(marker));

if (phase5GameActionsSecondHardcodedMarkers.length > 0) {
  failures.push(`useGameActions Phase 5 intimacy/improve/NPC copy is still hard-coded: ${phase5GameActionsSecondHardcodedMarkers.slice(0, 12).join(', ')}`);
}

const phase5GameActionsSecondRefs = [
  "tr('actions.intimacy.notTonightTitle'",
  "tr('actions.intimacy.decline.notRomantic'",
  "tr('actions.improve.genreLog'",
  "tr('actions.improve.activityCompleteTitle'",
  "tr('actions.relationship.inMemoryTitle'",
  "tr('actions.relationship.justMarriedTitle'",
  "tr('actions.npc.newFollowerTitle'",
  "tr('actions.npc.relationshipImprovedTitle'",
].filter((marker) => !gameActionsSource.includes(marker));

if (phase5GameActionsSecondRefs.length > 0) {
  failures.push(`useGameActions Phase 5 intimacy/improve/NPC refs are missing: ${phase5GameActionsSecondRefs.join(', ')}`);
}

const phase5AcquisitionDebtHardcodedMarkers = [
  "'s acquisition debt becomes a market concern",
  'Debt desks estimate',
  "'s studio empire has real debt service now.",
  'Acquisition Debt Interest',
  'Acquisition Debt Paydown',
  'Acquisition debt service missed:',
  'Acquisition debt interest serviced:',
  'Acquisition debt paid down:',
].filter((marker) => acquisitionDebtSource.includes(marker));

if (phase5AcquisitionDebtHardcodedMarkers.length > 0) {
  failures.push(`acquisitionDebt Phase 5 generated copy is still hard-coded: ${phase5AcquisitionDebtHardcodedMarkers.join(', ')}`);
}

const phase5AcquisitionDebtRefs = [
  "import { getPlayerLanguage, t } from './i18n'",
  "t(language, 'services.acquisitionDebt.news.headline'",
  "t(language, 'services.acquisitionDebt.post.content'",
  "t(language, 'services.acquisitionDebt.transaction.interest'",
  "t(language, 'services.acquisitionDebt.log.missed'",
  "t(language, 'services.acquisitionDebt.log.paidDown'",
].filter((marker) => !acquisitionDebtSource.includes(marker));

if (phase5AcquisitionDebtRefs.length > 0) {
  failures.push(`acquisitionDebt Phase 5 localization refs are missing: ${phase5AcquisitionDebtRefs.join(', ')}`);
}

const phase5AwardGeneratedHardcodedMarkers = [
  'Insider rumors suggest {Player} is a lock',
  "Biggest Snub? Why {Rival} wasn't nominated",
  'Who are you wearing tonight?',
  "It's vintage.",
  'Overwhelming but exciting.',
  'The rumor mill is spinning as the ceremony approaches.',
].filter((marker) => (
  awardLogicSource.includes(marker) ||
  newsLogicSource.includes(marker) ||
  xLogicSource.includes(marker)
));

if (phase5AwardGeneratedHardcodedMarkers.length > 0) {
  failures.push(`award generated gossip/press copy is still hard-coded: ${phase5AwardGeneratedHardcodedMarkers.join(', ')}`);
}

const phase5AwardGeneratedRefs = [
  [awardLogicSource, "getAwardGossipTemplate", 'award gossip helper'],
  [awardLogicSource, "t(language, 'award.press.wearing.question')", 'award press fallback questions'],
  [newsLogicSource, "getAwardGossipTemplate(language)", 'news award gossip call site'],
  [newsLogicSource, "t(language, 'award.gossip.subtext')", 'news award gossip subtext'],
  [xLogicSource, "getAwardGossipTemplate(language)", 'X award gossip call site'],
  [redCarpetSource, "generatePressInteractions(1, getPlayerLanguage(player))", 'red carpet localized fallback call'],
];

const missingAwardGeneratedRefs = phase5AwardGeneratedRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingAwardGeneratedRefs.length > 0) {
  failures.push(`award generated localization refs are missing: ${missingAwardGeneratedRefs.join(', ')}`);
}

const phase5StudioOutcomeHardcodedMarkers = [
  'faces pressure after another costly box office bomb',
  'takes a valuation hit after',
  'Industry confidence cooled as the latest release missed both audience and financial expectations.',
  'under scrutiny after back-to-back flops',
  'Analysts are watching whether the studio can steady its next slate.',
  'underperforms for',
  'The strong run lifted investor confidence around the studio slate.',
  'becomes a breakout win for',
  'valuation pressure increased after',
  'investor confidence rose after',
].filter((marker) => businessLogicSource.includes(marker));

if (phase5StudioOutcomeHardcodedMarkers.length > 0) {
  failures.push(`studio release outcome generated copy is still hard-coded: ${phase5StudioOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5StudioOutcomeRefs = [
  [businessLogicSource, "import { t } from './i18n'", 'businessLogic t import'],
  [businessLogicSource, "language: GameLanguage = 'en'", 'studio outcome language parameter'],
  [businessLogicSource, "t(language, 'services.business.releaseOutcome.news.bombStreak'", 'studio outcome headline localization'],
  [businessLogicSource, "t(language, 'services.business.releaseOutcome.subtext.miss'", 'studio outcome subtext localization'],
  [businessLogicSource, "t(language, 'services.business.releaseOutcome.log.bad'", 'studio outcome log localization'],
  [gameLoopSource, 'getPlayerLanguage(nextPlayer)', 'weekly loop passes player language to studio outcome'],
];

const missingStudioOutcomeRefs = phase5StudioOutcomeRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingStudioOutcomeRefs.length > 0) {
  failures.push(`studio release outcome localization refs are missing: ${missingStudioOutcomeRefs.join(', ')}`);
}

const phase5BusinessWeeklyAlertHardcodedMarkers = [
  'Low traffic at',
  'Boost Marketing!',
  'is understaffed. Income is reduced until you hire staff.',
  'Turning away customers hurts reviews.',
  'is Sold Out! Restock to sell.',
  'is overpriced for the current demand.',
  'margins are thin. You can raise the price a little.',
  'Script Finished:',
  'is ready for production!',
  'funds negative! Inject capital.',
].filter((marker) => businessLogicSource.includes(marker));

if (phase5BusinessWeeklyAlertHardcodedMarkers.length > 0) {
  failures.push(`business weekly alerts are still hard-coded: ${phase5BusinessWeeklyAlertHardcodedMarkers.join(', ')}`);
}

const phase5BusinessWeeklyAlertRefs = [
  [businessLogicSource, "processBusinessWeek = (", 'processBusinessWeek exists'],
  [businessLogicSource, "language: GameLanguage = 'en'", 'business weekly language parameter'],
  [businessLogicSource, "t(language, 'services.business.weekly.lowTrafficAlert'", 'low traffic alert localization'],
  [businessLogicSource, "t(language, 'services.business.weekly.productOverpricedAlert'", 'product pricing alert localization'],
  [businessLogicSource, "t(language, 'services.business.weekly.scriptFinishedAlert'", 'script finished alert localization'],
  [businessLogicSource, "t(language, 'services.business.weekly.negativeFundsAlert'", 'negative funds alert localization'],
  [gameLoopSource, 'processBusinessWeek(biz, nextPlayer.stats.fame, nextPlayer.currentWeek, getPlayerLanguage(nextPlayer))', 'weekly business loop passes player language'],
];

const missingBusinessWeeklyAlertRefs = phase5BusinessWeeklyAlertRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessWeeklyAlertRefs.length > 0) {
  failures.push(`business weekly alert localization refs are missing: ${missingBusinessWeeklyAlertRefs.join(', ')}`);
}

const phase5BusinessActionHardcodedMarkers = [
  'msg: "Deprecated"',
  'Business must be active for 2+ weeks to sell.',
  'Investors are not interested. The business is not profitable enough to sell.',
  'Sold ${business.name}',
  'Liquidated assets for',
  'Net result:',
  'Insufficient funds. Need',
  'Developed ${name}',
  'Product not found.',
  'Insufficient funds for restock.',
  'Restocked ${quantity}',
  'to expand.',
  'Opened location #',
].filter((marker) => businessLogicSource.includes(marker));

if (phase5BusinessActionHardcodedMarkers.length > 0) {
  failures.push(`business action result messages are still hard-coded: ${phase5BusinessActionHardcodedMarkers.join(', ')}`);
}

const phase5BusinessActionRefs = [
  [businessLogicSource, "sellBusiness = (business: Business, language: GameLanguage = 'en')", 'sellBusiness language parameter'],
  [businessLogicSource, "liquidateBusiness = (business: Business, language: GameLanguage = 'en')", 'liquidateBusiness language parameter'],
  [businessLogicSource, "t(language, 'services.business.action.sellSuccess'", 'sell success localization'],
  [businessLogicSource, "t(language, 'services.business.action.createProductSuccess'", 'create product localization'],
  [businessLogicSource, "t(language, 'services.business.action.restockSuccess'", 'restock localization'],
  [businessLogicSource, "t(language, 'services.business.action.expandSuccess'", 'expand localization'],
  [businessLogicSource, "t(language, 'services.business.action.promoteDeprecated'", 'promote fallback localization'],
  [businessLogicSource, "t(language, 'services.business.action.liquidateSuccess'", 'liquidate localization'],
  [businessDashboardSource, 'createProduct(business, newProdName, newProdType, newProdQty, def.baseCost, finalPrice, devOptions, language)', 'business dashboard passes language to create product'],
  [businessDashboardSource, 'sellBusiness(business, language)', 'business dashboard sell uses player language'],
  [productionHouseSource, 'sellBusiness(studio, language)', 'production house sell uses player language'],
];

const missingBusinessActionRefs = phase5BusinessActionRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessActionRefs.length > 0) {
  failures.push(`business action result localization refs are missing: ${missingBusinessActionRefs.join(', ')}`);
}

const phase5BusinessDashboardHardcodedMarkers = [
  'Everything looks stable.',
  'CRITICAL: No staff hired! We cannot serve anyone. Hire staff immediately.',
  'We are turning people away! Hire more staff or expand locations.',
  'Tables are empty. Increase Marketing to fill seats.',
  'SOLD OUT! We are making $0 revenue. Restock inventory now!',
  'Low Inventory! We will sell out soon. Restock.',
  'No one knows about our brand. Run a marketing campaign.',
  'Insufficient personal funds.',
  'Insufficient business funds.',
  'Not enough energy! (25E)',
  'Manager already hired.',
  'alert("Insufficient funds.")',
].filter((marker) => businessDashboardSource.includes(marker));

if (phase5BusinessDashboardHardcodedMarkers.length > 0) {
  failures.push(`business dashboard alerts/insights are still hard-coded: ${phase5BusinessDashboardHardcodedMarkers.join(', ')}`);
}

const phase5BusinessDashboardRefs = [
  [businessDashboardSource, "import { getPlayerLanguage, t } from '../../../services/i18n'", 'business dashboard t import'],
  [businessDashboardSource, "tr('services.business.dashboard.insight.stable')", 'stable insight localization'],
  [businessDashboardSource, "tr('services.business.dashboard.insight.noStaff')", 'no staff insight localization'],
  [businessDashboardSource, "tr('services.business.dashboard.insight.soldOut')", 'sold out insight localization'],
  [businessDashboardSource, "alert(tr('services.business.dashboard.alert.insufficientPersonalFunds'))", 'personal funds alert localization'],
  [businessDashboardSource, "alert(tr('services.business.dashboard.alert.managerAlreadyHired'))", 'manager alert localization'],
  [businessDashboardSource, "alert(tr('services.business.dashboard.alert.insufficientFunds'))", 'generic funds alert localization'],
];

const missingBusinessDashboardRefs = phase5BusinessDashboardRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessDashboardRefs.length > 0) {
  failures.push(`business dashboard alert/insight localization refs are missing: ${missingBusinessDashboardRefs.join(', ')}`);
}

const phase5BusinessDashboardStaticHardcodedMarkers = [
  '+ Inject',
  '- Withdraw',
  'Cash Balance',
  "Manager's Report",
  'Traffic Funnel',
  'Based on Hype & Location',
  'Service Capacity',
  'Limited by Staff & Space.',
  'BOTTLENECK!',
  'Weekly Net',
  'Capacity Management',
  'Physical Cap:',
  'Opening new locations increases your total capacity limit.',
  'Staffing',
  'No Staff! Business is halted.',
  'Product Lines',
  'New SKU',
  'Quality:',
  'Restock Qty',
  'Confirm -$',
  '> Restock</button>',
  '>Price</div>',
].filter((marker) => businessDashboardSource.includes(marker));

if (phase5BusinessDashboardStaticHardcodedMarkers.length > 0) {
  failures.push(`business dashboard static overview/ops UI is still hard-coded: ${phase5BusinessDashboardStaticHardcodedMarkers.join(', ')}`);
}

const phase5BusinessDashboardStaticRefs = [
  [businessDashboardSource, "tr('services.business.dashboard.header.inject')", 'inject button localization'],
  [businessDashboardSource, "labelKey: 'services.business.dashboard.tab.overview'", 'tab label localization'],
  [businessDashboardSource, "tr('services.business.dashboard.overview.managerReport')", 'manager report label localization'],
  [businessDashboardSource, "tr('services.business.dashboard.overview.trafficFunnel')", 'traffic funnel label localization'],
  [businessDashboardSource, "tr('services.business.dashboard.ops.capacityManagement')", 'capacity management label localization'],
  [businessDashboardSource, "tr('services.business.dashboard.ops.productLines')", 'product lines label localization'],
  [businessDashboardSource, "tr('services.business.dashboard.product.restockQty')", 'restock quantity label localization'],
];

const missingBusinessDashboardStaticRefs = phase5BusinessDashboardStaticRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessDashboardStaticRefs.length > 0) {
  failures.push(`business dashboard static overview/ops localization refs are missing: ${missingBusinessDashboardStaticRefs.join(', ')}`);
}

const phase5BusinessDashboardMarketMoneyHardcodedMarkers = [
  'Market Hype',
  'Gain: +',
  'Decay: -',
  '>Brand Health</span>',
  'Higher Brand Health reduces Hype Decay naturally.',
  'Weekly Budget',
  'Social Media',
  'Influencers',
  'Billboards',
  'TV Spots',
  'P&L Statement',
  'This Week',
  '>Revenue</div>',
  '>Expenses</div>',
  'Net Profit',
  'Balance Sheet',
  'Total Valuation',
  'Exit Strategy',
  'Sell Business',
  'Shut Down & Liquidate',
  'Close operations. Assets sold for scrap.',
].filter((marker) => businessDashboardSource.includes(marker));

if (phase5BusinessDashboardMarketMoneyHardcodedMarkers.length > 0) {
  failures.push(`business dashboard market/money UI is still hard-coded: ${phase5BusinessDashboardMarketMoneyHardcodedMarkers.join(', ')}`);
}

const phase5BusinessDashboardMarketMoneyRefs = [
  [businessDashboardSource, "tr('services.business.dashboard.market.hype')", 'market hype localization'],
  [businessDashboardSource, "tr('services.business.dashboard.market.gainPerWeek'", 'market gain localization'],
  [businessDashboardSource, "labelKey: 'services.business.dashboard.market.channel.social'", 'market channel localization'],
  [businessDashboardSource, "tr('services.business.dashboard.money.plStatement')", 'P&L localization'],
  [businessDashboardSource, "tr('services.business.dashboard.money.netProfit')", 'net profit localization'],
  [businessDashboardSource, "tr('services.business.dashboard.money.exitStrategy')", 'exit strategy localization'],
  [businessDashboardSource, "tr('services.business.dashboard.money.closeOperations')", 'liquidate helper localization'],
];

const missingBusinessDashboardMarketMoneyRefs = phase5BusinessDashboardMarketMoneyRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessDashboardMarketMoneyRefs.length > 0) {
  failures.push(`business dashboard market/money localization refs are missing: ${missingBusinessDashboardMarketMoneyRefs.join(', ')}`);
}

const phase5BusinessDashboardModalHardcodedMarkers = [
  'Develop Product',
  '>Category</label>',
  'Product Name',
  '% Cost',
  'Qual</div>',
  'Est. Unit Cost',
  'Ready for Production',
  'Unit Cost',
  'Selling Price ($)',
  'Net Margin',
  '/ unit',
  'Initial Batch',
  'Energy Cost',
  'Final quality involves a luck factor.',
  '>Back</button>',
  'Next Step',
  'Launch Product',
  'Inject Capital',
  'Withdraw Funds',
  'Personal Balance:',
  'Business Balance:',
  'Confirm {showCapitalModal',
  'Sell Company',
  'Shut Down',
  'Are you sure you want to sell',
  'Assets will be liquidated for scrap value.',
  'Scrap Value',
  'Net Payout',
  'Hiring Pool',
  'Hire (${c.salary})',
  'No suitable candidates available right now.',
  'Product businesses recruit managers and sales staff.',
].filter((marker) => businessDashboardSource.includes(marker));

if (phase5BusinessDashboardModalHardcodedMarkers.length > 0) {
  failures.push(`business dashboard modal UI is still hard-coded: ${phase5BusinessDashboardModalHardcodedMarkers.join(', ')}`);
}

const phase5BusinessDashboardModalRefs = [
  [businessDashboardSource, "tr('services.business.dashboard.modal.product.developProduct')", 'develop product modal localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.product.readyForProduction')", 'ready for production localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.product.finalQualityHint')", 'quality hint localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.capital.injectTitle')", 'capital modal localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.exit.sellTitle')", 'exit sell title localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.exit.sellConfirmText'", 'exit sell text localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.hiring.title')", 'hiring modal localization'],
  [businessDashboardSource, "tr('services.business.dashboard.modal.hiring.empty')", 'hiring empty localization'],
];

const missingBusinessDashboardModalRefs = phase5BusinessDashboardModalRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessDashboardModalRefs.length > 0) {
  failures.push(`business dashboard modal localization refs are missing: ${missingBusinessDashboardModalRefs.join(', ')}`);
}

const phase5BusinessDashboardCatalogDisplayMarkers = [
  '{prodDef.name}',
  '{def.name}</button>',
  '{section.label}</label>',
  '{opt.label}</div>',
  '{opt.desc}</div>',
].filter((marker) => businessDashboardSource.includes(marker));

if (phase5BusinessDashboardCatalogDisplayMarkers.length > 0) {
  failures.push(`business dashboard catalog display still renders raw catalog text: ${phase5BusinessDashboardCatalogDisplayMarkers.join(', ')}`);
}

const phase5BusinessDashboardCatalogDisplayRefs = [
  [businessDashboardSource, 'getProductCatalogName(def.id)', 'product creator catalog name localization'],
  [businessDashboardSource, 'getProductCatalogName(prodDef.id)', 'product badge catalog name localization'],
  [businessDashboardSource, 'getDevSectionLabel(key)', 'development section localization'],
  [businessDashboardSource, 'getDevOptionLabel(opt.id)', 'development option label localization'],
  [businessDashboardSource, 'getDevOptionDescription(opt.id)', 'development option description localization'],
];

const missingBusinessDashboardCatalogDisplayRefs = phase5BusinessDashboardCatalogDisplayRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessDashboardCatalogDisplayRefs.length > 0) {
  failures.push(`business dashboard catalog display localization refs are missing: ${missingBusinessDashboardCatalogDisplayRefs.join(', ')}`);
}

const playerFacingFiles = [
  'App.tsx',
  'components',
  'hooks',
  'services',
  'views',
].flatMap((target) => {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) return [];
  if (fs.statSync(absolute).isFile()) return [target];

  const stack = [absolute];
  const files = [];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
        files.push(path.relative(root, fullPath));
      }
    }
  }
  return files;
});

const hardcodedPattern = /\balert\s*\(\s*['"`][A-Z]|\b(title|description|label|headline|subtext|content|log):\s*['"`][A-Z][^'"`{]{4,}/;
const hardcodedHits = [];
for (const file of playerFacingFiles) {
  if (file === 'services/i18n.ts') continue;
  const source = read(file);
  const lines = source.split('\n');
  lines.forEach((line, index) => {
    if (
      hardcodedPattern.test(line) &&
      !line.includes('trackGameEvent') &&
      !line.includes('addBreadcrumb') &&
      !line.includes('tr(')
    ) {
      hardcodedHits.push(`${file}:${index + 1}`);
    }
  });
}

if (hardcodedHits.length > 0) {
  warnings.push(`Hard-coded player-facing text candidates remain for later phases: ${hardcodedHits.length} hit(s). Sample: ${hardcodedHits.slice(0, 20).join(', ')}`);
}

if (failures.length > 0) {
  console.error('i18n audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  if (warnings.length > 0) {
    console.error('\nWarnings:');
    warnings.forEach((warning) => console.error(`- ${warning}`));
  }
  process.exit(1);
}

console.log(`i18n audit passed for ${supportedLanguages.length} language(s) and ${english.size} key(s).`);
warnings.forEach((warning) => console.warn(`Warning: ${warning}`));
