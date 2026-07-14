import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const i18nSource = read('services/i18n.ts');
const typesSource = read('types.ts');
const appSource = read('App.tsx');
const homeSource = read('views/HomePage.tsx');
const careerPageSource = read('views/CareerPage.tsx');
const settingsSource = read('views/SettingsPage.tsx');
const bottomNavSource = read('components/BottomNav.tsx');
const guideSource = read('components/GuideView.tsx');
const profileBuilderSource = read('services/profileBuilder.ts');
const profilePictureBuilderSource = read('views/avatar/ProfilePictureBuilder.tsx');
const boxOfficeSource = read('views/mobile/BoxOfficeApp.tsx');
const lifestyleSource = read('views/LifestylePage.tsx');
const improvePageSource = read('views/ImprovePage.tsx');
const socialSource = read('views/SocialPage.tsx');
const lifestyleActivitiesSource = read('views/lifestyle/LifestyleActivities.tsx');
const lifestyleActivitiesServiceSource = read('services/lifestyleActivities.ts');
const lifestyleAssetsSource = read('views/lifestyle/LifestyleAssets.tsx');
const lifestyleLogicSource = read('services/lifestyleLogic.ts');
const storePageSource = read('views/StorePage.tsx');
const gameActionsSource = read('hooks/useGameActions.ts');
const lifeEventModalSource = read('components/LifeEventModal.tsx');
const productionCrisisModalSource = read('components/ProductionCrisisModal.tsx');
const lifeEventLogicSource = read('services/lifeEventLogic.ts');
const gameLoopSource = read('services/gameLoop.ts');
const worldLogicSource = read('services/worldLogic.ts');
const roleLogicSource = read('services/roleLogic.ts');
const talentServiceSource = read('services/talentService.ts');
const teamLogicSource = read('services/teamLogic.ts');
const universeLogicSource = read('services/universeLogic.ts');
const marketTrendsSource = read('services/marketTrends.ts');
const premiumLogicSource = read('services/premiumLogic.ts');
const productionServiceSource = read('services/productionService.ts');
const directorGeneratorSource = read('services/directorGenerator.ts');
const crisisGeneratorSource = read('services/crisisGenerator.ts');
const productionEventsSource = read('services/productionEvents.ts');
const acquisitionDebtSource = read('services/acquisitionDebt.ts');
const stockTakeoverSource = read('services/stockTakeover.ts');
const studioAcquisitionSource = read('services/studioAcquisition.ts');
const studioGroupSource = read('services/studioGroup.ts');
const awardLogicSource = read('services/awardLogic.ts');
const newsLogicSource = read('services/newsLogic.ts');
const xLogicSource = read('services/xLogic.ts');
const npcLogicSource = read('services/npcLogic.ts');
const redCarpetSource = read('views/RedCarpetEvent.tsx');
const imdbAppSource = read('views/mobile/ImdbApp.tsx');
const businessLogicSource = read('services/businessLogic.ts');
const businessDashboardSource = read('views/lifestyle/business/BusinessDashboard.tsx');
const businessWizardSource = read('views/lifestyle/business/BusinessWizard.tsx');
const productionWizardSource = read('views/lifestyle/business/ProductionWizard.tsx');
const greenlightWizardSource = read('views/lifestyle/business/GreenlightWizard.tsx');
const developmentLabSource = read('views/lifestyle/business/DevelopmentLab.tsx');
const ownedStudioCommandSource = read('views/lifestyle/business/OwnedStudioCommandCenter.tsx');
const productionHouseSource = read('views/lifestyle/business/ProductionHouseGame.tsx');
const releaseWizardSource = read('views/lifestyle/business/ReleaseWizard.tsx');
const ownedIpDossierSource = read('views/lifestyle/business/components/OwnedIpDossier.tsx');
const projectDashboardModalSource = read('views/lifestyle/business/components/ProjectDashboardModal.tsx');
const releaseTimingSource = read('services/releaseTiming.ts');
const rightsMarketSource = read('views/lifestyle/business/components/RightsMarket.tsx');
const rightsNegotiationSource = read('services/rightsNegotiation.ts');
const regulatorPressureSource = read('services/regulatorPressure.ts');
const talentInstabilitySource = read('services/talentInstability.ts');
const rivalRetaliationSource = read('services/rivalRetaliation.ts');
const worldReactionsSource = read('services/worldReactions.ts');
const shareholderVotingSource = read('services/shareholderVoting.ts');
const outsideProductionsSource = read('services/outsideProductions.ts');
const forbesOwnershipSource = read('services/forbesOwnershipDiscovery.ts');
const forbesAppSource = read('views/mobile/ForbesApp.tsx');
const forbesStudioProfileSource = read('views/mobile/components/ForbesStudioProfile.tsx');
const studioAcquisitionDeskSource = read('views/mobile/components/StudioAcquisitionDesk.tsx');
const instagramAppSource = read('views/mobile/InstagramApp.tsx');
const mobilePageSource = read('views/mobile/MobilePage.tsx');
const newsAppSource = read('views/mobile/NewsApp.tsx');
const xAppSource = read('views/mobile/XApp.tsx');
const youtubeAppSource = read('views/mobile/YoutubeApp.tsx');
const stocksAppSource = read('views/mobile/StocksApp.tsx');
const datingLogicSource = read('services/datingLogic.ts');
const familyLogicSource = read('services/familyLogic.ts');
const tinderAppSource = read('views/mobile/TinderApp.tsx');
const datingPreferencesSheetSource = read('views/mobile/DatingPreferencesSheet.tsx');
const luxeAppSource = read('views/mobile/LuxeApp.tsx');
const famousMovieSource = read('services/famousMovieLogic.ts');
const youtubeLogicSource = read('services/youtubeLogic.ts');
const youtubeEventLogicSource = read('services/youtubeEventLogic.ts');
const instagramLogicSource = read('services/instagramLogic.ts');
const npcVentureSource = read('services/npcVentureLogic.ts');
const cinemaChainsSource = read('services/cinemaChains.ts');
const healthConditionsSource = read('services/healthConditions.ts');
const musicIndustrySource = read('services/musicIndustry.ts');
const projectInvestorsSource = read('services/projectInvestors.ts');
const socialEventsSource = read('services/socialEvents.ts');
const subsidiaryDecisionsSource = read('services/subsidiaryDecisions.ts');

const failures = [];
const warnings = [];

const getSupportedLanguages = () => {
  const match = i18nSource.match(/SUPPORTED_LANGUAGES[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (!match) return [];
  return [...match[1].matchAll(/\bid:\s*'([^']+)'/g)].map((entry) => entry[1]);
};

const getSupportedLanguageBlocks = () => {
  const match = i18nSource.match(/SUPPORTED_LANGUAGES[\s\S]*?=\s*\[([\s\S]*?)\];/);
  if (!match) return new Map();
  return new Map(
    [...match[1].matchAll(/\{([\s\S]*?\bid:\s*'([^']+)'[\s\S]*?)\n\s*\}/g)].map((entry) => [entry[2], entry[1]])
  );
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
const supportedLanguageBlocks = getSupportedLanguageBlocks();
if (supportedLanguages.length < 2) {
  failures.push('Expected at least English and one translated language in SUPPORTED_LANGUAGES.');
}

const requiredLanguages = ['en', 'pt-BR', 'fr', 'es', 'tr', 'de'];
const missingRequiredLanguages = requiredLanguages.filter((language) => !supportedLanguages.includes(language));
if (missingRequiredLanguages.length > 0) {
  failures.push(`SUPPORTED_LANGUAGES missing required language(s): ${missingRequiredLanguages.join(', ')}`);
}

const missingFlagMetadataLanguages = supportedLanguages.filter((language) => !/flagEmoji:\s*'[^']+'/.test(supportedLanguageBlocks.get(language) || ''));
if (missingFlagMetadataLanguages.length > 0) {
  failures.push(`SUPPORTED_LANGUAGES missing flagEmoji metadata for: ${missingFlagMetadataLanguages.join(', ')}`);
}

const translations = new Map(supportedLanguages.map((language) => [language, parseTranslationEntries(language)]));
const english = translations.get('en') || new Map();
const french = translations.get('fr') || new Map();
const spanish = translations.get('es') || new Map();

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

const frenchCoreUiKeys = [
  'common.back',
  'common.close',
  'common.watchAd',
  'nav.home',
  'nav.career',
  'nav.improve',
  'nav.lifestyle',
  'home.energy',
  'home.personalCondition',
  'home.liveFeed',
  'home.nextWeek',
  'news.topStories',
  'news.noNews',
  'news.breaking',
  'news.whyItMatters',
  'startup.loadingTitle',
  'startup.loadingLine.actors',
  'settings.title',
  'settings.controlCenter',
  'settings.language',
  'settings.languageChooseTitle',
  'settings.languagePhaseNote',
  'settings.defaultLanguage',
  'settings.support',
  'settings.mainMenu',
  'settings.visualMode',
  'settings.issue.crashRestart',
  'settings.support.reportIssue',
  'settings.support.whatHappened',
];

const untranslatedFrenchCoreUiKeys = frenchCoreUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchCoreUiKeys.length > 0) {
  failures.push(`French core UI polish keys still mirror English: ${untranslatedFrenchCoreUiKeys.join(', ')}`);
}

const frenchCareerLifestyleUiKeys = [
  'career.title',
  'career.credits',
  'career.auditionRoom',
  'career.preparationLevel',
  'career.readyForAudition',
  'career.noActiveProjects',
  'lifestyle.title',
  'lifestyle.customize',
  'lifestyle.purchase',
  'lifestyle.liquidCash',
  'lifestyle.productionHouse',
  'lifestyle.activitiesTitle',
  'lifestyle.businessEmpire',
  'activities.category.TRAVEL',
  'activities.category.NIGHTLIFE',
  'activities.stat.mood',
  'activities.customDonation',
  'activities.viewChildren',
  'activities.proceedCheckout',
  'activities.tripPreview.title',
  'activities.wellnessPreview.carePlan',
  'activities.nightlifePreview.title',
  'activities.industryPreview.title',
  'activities.charityPreview.title',
];

const untranslatedFrenchCareerLifestyleUiKeys = frenchCareerLifestyleUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchCareerLifestyleUiKeys.length > 0) {
  failures.push(`French career/lifestyle UI polish keys still mirror English: ${untranslatedFrenchCareerLifestyleUiKeys.join(', ')}`);
}

const frenchPhoneAppUiKeys = [
  'mobile.messages',
  'mobile.bank',
  'mobile.team',
  'mobile.stocks',
  'mobile.finance.friendFavor',
  'mobile.toast.offerAccepted',
  'messages.noMessages',
  'messages.castOffer',
  'messages.reviewContract',
  'messages.acceptCurrentOffer',
  'messages.signContract',
  'forbes.richest',
  'forbes.myRank',
  'forbes.netWorth',
  'forbes.shareRanking',
  'box.inTheaters',
  'box.noTheatrical',
  'box.allTime.title',
  'box.records.title',
  'box.weekly.title',
  'stocks.portfolio',
  'stocks.totalPortfolio',
  'stocks.buy',
  'stocks.sell',
  'stocks.influence.ladder',
  'team.title',
  'team.availablePros',
  'team.changeLocked',
  'bank.totalLiquidAssets',
  'bank.personalLoanRequest',
  'bank.applyFor',
  'imdb.franchise.title',
  'imdb.project.defaultDescription',
  'imdb.profile.knownFor',
  'imdb.awards.currentNominations',
];

const untranslatedFrenchPhoneAppUiKeys = frenchPhoneAppUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchPhoneAppUiKeys.length > 0) {
  failures.push(`French phone app UI polish keys still mirror English: ${untranslatedFrenchPhoneAppUiKeys.join(', ')}`);
}

const frenchSocialPhoneAppUiKeys = [
  'dating.preferences.title',
  'dating.preferences.subtitle',
  'dating.preferences.save',
  'dating.tinder.welcome',
  'dating.tinder.startSwiping',
  'dating.tinder.action.chat',
  'dating.tinder.option.smallTalk.label',
  'dating.tinder.option.askDate.description',
  'luxe.chat.smallTalk.label',
  'luxe.chat.careerTalk.label',
  'luxe.invite.privateDinner.label',
  'luxe.invite.redCarpet.description',
  'instagram.relationship.closeFriend',
  'instagram.imageFit.title',
  'instagram.imageFit.contain',
  'x.forYou',
  'x.welcome',
  'x.createPost',
  'x.postType.HOT_TAKE.label',
  'x.replyTone.CLAP_BACK.label',
  'x.timelineForecastSub',
  'youtube.videoType.VLOG.label',
  'youtube.plan.SAFE.label',
  'youtube.creatorStudio',
  'youtube.uploadVideo',
  'youtube.videoTitle',
  'youtube.uploadForecast',
  'youtube.category.acting',
  'youtube.alert.notEnoughEnergy',
];

const untranslatedFrenchSocialPhoneAppUiKeys = frenchSocialPhoneAppUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchSocialPhoneAppUiKeys.length > 0) {
  failures.push(`French social phone app UI polish keys still mirror English: ${untranslatedFrenchSocialPhoneAppUiKeys.join(', ')}`);
}

const frenchSocialGeneratedUiKeys = [
  'dating.tinder.chat.smallTalk.0',
  'dating.tinder.chat.deepTalk.0',
  'dating.tinder.chat.flirtCompliment.0',
  'dating.tinder.chat.date.0',
  'dating.tinder.response.match.0',
  'dating.tinder.response.reject.0',
  'dating.tinder.modal.dateLocked.title',
  'dating.tinder.modal.killedMood.body',
  'luxe.chat.smallTalk.line.0',
  'luxe.chat.deepTalk.line.0',
  'luxe.flirt.tease.line.0',
  'luxe.response.warm.0',
  'luxe.signal.news.headline',
  'luxe.outcome.news.publicDifferentGender.subtext',
  'x.replyBank.CAREER.0',
  'x.replyBank.HOT_TAKE.0',
  'x.quote.profile.0',
  'x.quote.player.0',
  'x.quote.fallback',
  'services.x.generalPost',
  'youtube.comment.video.VLOG.0',
  'youtube.comment.video.SKIT.0',
  'youtube.comment.video.TRAILER.0',
  'youtube.comment.quality.high.0',
  'youtube.comment.brand.loud',
  'youtube.outcome.collab.breakout.label',
  'youtube.outcome.collab.breakout.log',
  'youtube.outcome.brand.clean.label',
  'youtube.outcome.brand.clean.log',
  'youtube.log.uploaded',
  'youtube.log.brandOutcome',
];

const untranslatedFrenchSocialGeneratedUiKeys = frenchSocialGeneratedUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchSocialGeneratedUiKeys.length > 0) {
  failures.push(`French social generated/narrative keys still mirror English: ${untranslatedFrenchSocialGeneratedUiKeys.join(', ')}`);
}

const frenchLongTailUiKeys = [
  'services.x.reply',
  'services.x.quote',
  'services.x.trends.entertainment',
  'services.x.trends.trendingInMovies',
  'profileBuilder.title',
  'profileBuilder.usePortrait',
  'profileBuilder.category.hairColor',
  'profileBuilder.part.side-part',
  'profileBuilder.part.hair-dark-brown',
  'profileBuilder.part.mouth-full-lips',
  'premium.product.no_ads.title',
  'premium.product.cash_25000.description',
  'premium.product.bundle_luxury_homes.description',
  'premium.gate.bundle_luxury_homes.teaser',
  'premium.purchase.alreadyUnlocked',
  'premium.purchase.allCollectionsUnlocked',
  'store.premium.section.energy',
  'store.premium.restorePurchases',
  'store.premium.confirmPurchase',
  'store.premium.appleChargeSuffix',
];

const untranslatedFrenchLongTailUiKeys = frenchLongTailUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchLongTailUiKeys.length > 0) {
  failures.push(`French long-tail UI/premium/profile keys still mirror English: ${untranslatedFrenchLongTailUiKeys.join(', ')}`);
}

const frenchWideScanUiKeys = [
  'profileBuilder.state.live',
  'profileBuilder.part.face-oval',
  'profileBuilder.part.eyes-lashes',
  'profileBuilder.part.brown-hoodie',
  'x.forecast.heat',
  'x.forecast.rep',
  'x.heatValue',
  'x.heatPlus',
  'x.reposts',
  'services.x.trends.fashion',
  'life.event.shareholder.advisor.label',
  'services.shareholder.vote.dividend.title',
  'services.shareholder.vote.dividend.summary',
  'services.shareholder.vote.slate.title',
  'services.shareholder.vote.ceo.title',
  'services.shareholder.vote.capital.title',
  'services.shareholder.message.subject',
  'services.shareholder.event.category',
  'services.shareholder.value.visibleReaction',
  'services.shareholder.result.passed',
  'services.shareholder.news.headline',
  'services.shareholder.influence.CONTROLLING_OWNER.label',
  'services.shareholder.influence.BOARD_SEAT.label',
  'services.shareholder.influence.STRATEGIC_INFLUENCE.label',
  'services.shareholder.influence.SHAREHOLDER_VOTER.label',
  'services.shareholder.influence.PASSIVE_INVESTOR.label',
  'youtube.now',
  'youtube.category.gaming',
  'youtube.studio.section.content.hint',
  'youtube.forecast.heat',
  'services.weeklyOffer.breakthrough.blockbuster.label.supporting',
  'services.weeklyOffer.breakthrough.freshFace.text',
  'services.weeklyOffer.direct.text',
  'services.weeklyOffer.direct.log',
  'services.musicIndustry.role.LEAD_SINGLE',
  'services.musicIndustry.strategy.COMPOSER_ONLY',
  'services.musicIndustry.impact.empty.headline',
  'services.musicIndustry.impact.strength.openingWeekendLift',
  'services.musicIndustry.impact.label.cultureMoment',
  'services.musicIndustry.weekly.debut.headline',
  'services.musicIndustry.weekly.chart.subtext',
];

const untranslatedFrenchWideScanUiKeys = frenchWideScanUiKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchWideScanUiKeys.length > 0) {
  failures.push(`French wide-scan UI/generated keys still mirror English: ${untranslatedFrenchWideScanUiKeys.join(', ')}`);
}

const spanishInitialPolishKeys = [
  ...frenchCoreUiKeys,
  ...frenchCareerLifestyleUiKeys,
  ...frenchPhoneAppUiKeys,
  ...frenchSocialPhoneAppUiKeys,
  ...frenchSocialGeneratedUiKeys,
  ...frenchLongTailUiKeys,
  ...frenchWideScanUiKeys,
  'settings.globalActorPack.enabledLog',
  'services.npc.globalActorPack.label',
  'services.npc.globalActorPack.description',
];

const untranslatedSpanishInitialPolishKeys = spanishInitialPolishKeys.filter((key) => {
  if (!spanish.has(key) || !english.has(key)) return true;
  return spanish.get(key) === english.get(key);
});

if (untranslatedSpanishInitialPolishKeys.length > 0) {
  failures.push(`Spanish initial UI/generated keys still mirror English: ${untranslatedSpanishInitialPolishKeys.join(', ')}`);
}

const spanishStaticUiPolishKeys = [
  'settings.performance',
  'settings.supportSub',
  'settings.supportDev',
  'settings.buyCoffee',
  'settings.rateUs',
  'settings.modPacks',
  'settings.modPacksSub',
  'settings.activePacks',
  'settings.community',
  'settings.communitySub',
  'settings.followX',
  'settings.joinTelegram',
  'settings.gameActions',
  'settings.general',
  'settings.languageSub',
  'settings.languageMenu',
  'settings.languageSource',
  'settings.languageSourceSub',
  'settings.languageInterface',
  'settings.languageInterfaceSub',
  'settings.optionalContent',
  'settings.externalTalent',
  'settings.externalTalentSub',
  'settings.creatorPacks',
  'settings.gameplayRules',
  'settings.saveLockedPacks',
  'settings.saveLockedPacksSub',
  'settings.availableCountryPacks',
  'settings.countryPackSub',
  'settings.enabledForSave',
  'settings.enablePack',
  'settings.support.copyDebugId',
  'settings.support.bugHunter',
  'settings.support.reportSent',
  'settings.support.emailScreenshot',
  'guide.menu.title',
  'guide.menu.heading',
  'guide.menu.subtitle',
  'guide.menu.quickStart.title',
  'guide.menu.handbook.title',
  'guide.menu.playbooks.title',
  'guide.menu.faq.title',
  'guide.wizard.next',
  'guide.wizard.finish',
  'guide.wizard.welcome.title',
  'guide.wizard.weeklyLoop.title',
  'guide.wizard.career.title',
  'guide.wizard.stats.title',
  'guide.wizard.business.title',
  'guide.wizard.studio.title',
  'guide.wizard.stories.title',
  'guide.handbook.title',
  'guide.handbook.gettingStarted.title',
  'guide.handbook.stats.title',
  'guide.handbook.career.title',
  'guide.handbook.weeklyLoop.title',
  'guide.handbook.social.title',
  'guide.handbook.relationships.title',
  'guide.handbook.businesses.title',
  'guide.handbook.productionHouse.title',
  'guide.handbook.developmentLab.title',
  'developmentLab.title',
  'developmentLab.subtitle',
  'developmentLab.tab.vault',
  'developmentLab.tab.concept',
  'developmentLab.tab.market',
  'developmentLab.tab.franchise',
  'developmentLab.tab.universe',
  'developmentLab.vault.scripts',
  'developmentLab.vault.ownedIp',
  'developmentLab.market.ipRights',
  'developmentLab.market.sourceTitle',
  'developmentLab.market.refreshNow',
  'developmentLab.market.filter.trending',
  'developmentLab.market.filter.movie',
  'developmentLab.market.filter.series',
];

const untranslatedSpanishStaticUiPolishKeys = spanishStaticUiPolishKeys.filter((key) => {
  if (!spanish.has(key) || !english.has(key)) return true;
  return spanish.get(key) === english.get(key);
});

if (untranslatedSpanishStaticUiPolishKeys.length > 0) {
  failures.push(`Spanish static UI polish keys still mirror English: ${untranslatedSpanishStaticUiPolishKeys.join(', ')}`);
}

const untranslatedFrenchStaticUiPolishKeys = spanishStaticUiPolishKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchStaticUiPolishKeys.length > 0) {
  failures.push(`French static UI polish keys still mirror English: ${untranslatedFrenchStaticUiPolishKeys.join(', ')}`);
}

const screenshotVisibleLanguageKeys = [
  'improve.overallTalent',
  'improve.wellbeing',
  'improve.workshops',
  'improve.genreLab',
  'improve.professionalTraining',
  'improve.availableEnergy',
  'improve.all',
  'improve.acting',
  'improve.writing',
  'improve.directing',
  'improve.enroll',
  'improve.weeks',
  'improve.discipline',
  'improve.memorization',
  'improve.delivery',
  'improve.presence',
  'improve.workshop.ws_intro_acting',
  'improve.workshop.ws_vocal',
  'connections.title',
  'connections.legacy',
  'connections.subtitle',
  'connections.dynastyScore',
  'connections.innerCircle',
  'connections.relation.Parent',
  'connections.family.mom',
  'connections.family.dad',
  'castLink.subtitle',
  'castLink.findWork',
  'castLink.browseRoles',
  'castLink.auditionsCount',
  'castLink.jobsCount',
  'castLink.auditions',
  'castLink.filmTvRoles',
  'castLink.partTimeJobs',
  'castLink.steadyIncome',
  'castLink.availableRoles',
  'castLink.currentJob',
  'castLink.availableShifts',
  'castLink.start',
  'castLink.locked',
];

for (const language of supportedLanguages.filter((language) => language !== 'en')) {
  const entries = translations.get(language) || new Map();
  const untranslatedScreenshotKeys = screenshotVisibleLanguageKeys.filter((key) => {
    if (!entries.has(key) || !english.has(key)) return true;
    return entries.get(key) === english.get(key);
  });
  if (untranslatedScreenshotKeys.length > 0) {
    failures.push(`${language} screenshot-visible UI keys still mirror English: ${untranslatedScreenshotKeys.join(', ')}`);
  }
}

const deepStaticNarrativePolishKeys = [
  'guide.wizard.welcome.body',
  'guide.wizard.weeklyLoop.body',
  'guide.wizard.career.body',
  'guide.wizard.stats.body',
  'guide.wizard.business.body',
  'guide.wizard.studio.body',
  'guide.wizard.stories.body',
  'guide.handbook.subtitle',
  'guide.handbook.gettingStarted.p1',
  'guide.handbook.gettingStarted.p2',
  'guide.handbook.gettingStarted.p3',
  'guide.handbook.stats.p1',
  'guide.handbook.stats.p2',
  'guide.handbook.stats.p3',
  'guide.handbook.stats.p4',
  'guide.handbook.career.p1',
  'guide.handbook.career.p2',
  'guide.handbook.career.p3',
  'guide.handbook.weeklyLoop.p1',
  'guide.handbook.weeklyLoop.p2',
  'guide.handbook.weeklyLoop.p3',
  'guide.handbook.social.p1',
  'guide.handbook.social.p2',
  'guide.handbook.social.p3',
  'guide.handbook.relationships.p1',
  'guide.handbook.relationships.p2',
  'guide.handbook.relationships.p3',
  'guide.handbook.businesses.p1',
  'guide.handbook.businesses.p2',
  'guide.handbook.businesses.p3',
  'guide.handbook.productionHouse.p1',
  'guide.handbook.productionHouse.p2',
  'guide.handbook.productionHouse.p3',
  'guide.handbook.developmentLab.p1',
  'guide.handbook.developmentLab.p2',
  'guide.handbook.developmentLab.p3',
  'guide.handbook.developmentLab.noteTitle',
  'guide.handbook.developmentLab.noteBody',
  'developmentLab.vault.noOwnedIp',
  'developmentLab.vault.noOwnedIpBody',
  'developmentLab.vault.ipLibrary',
  'developmentLab.vault.ipLibraryBody',
  'developmentLab.market.sourceSubtitle',
  'developmentLab.market.refreshesInWeek',
  'developmentLab.market.refreshesInWeeks',
  'developmentLab.market.byAuthor',
  'developmentLab.market.rightsCost',
  'developmentLab.market.acquireRights',
  'developmentLab.market.insufficientFunds',
  'developmentLab.franchise.title',
  'developmentLab.franchise.subtitle',
  'developmentLab.franchise.candidate',
  'developmentLab.franchise.candidatesTitle',
  'developmentLab.franchise.empty.title',
  'developmentLab.franchise.empty.subtitle',
  'developmentLab.franchise.lifecycle.title',
  'developmentLab.franchise.lifecycle.rebootPending.label',
  'developmentLab.franchise.lifecycle.rebooted.label',
  'developmentLab.franchise.lifecycle.finalePending.label',
  'developmentLab.franchise.lifecycle.concluded.label',
  'developmentLab.franchise.lifecycle.resting.label',
  'developmentLab.franchise.lifecycle.active.label',
];

const untranslatedSpanishDeepStaticNarrativeKeys = deepStaticNarrativePolishKeys.filter((key) => {
  if (!spanish.has(key) || !english.has(key)) return true;
  return spanish.get(key) === english.get(key);
});

if (untranslatedSpanishDeepStaticNarrativeKeys.length > 0) {
  failures.push(`Spanish deep static narrative keys still mirror English: ${untranslatedSpanishDeepStaticNarrativeKeys.join(', ')}`);
}

const untranslatedFrenchDeepStaticNarrativeKeys = deepStaticNarrativePolishKeys.filter((key) => {
  if (!french.has(key) || !english.has(key)) return true;
  return french.get(key) === english.get(key);
});

if (untranslatedFrenchDeepStaticNarrativeKeys.length > 0) {
  failures.push(`French deep static narrative keys still mirror English: ${untranslatedFrenchDeepStaticNarrativeKeys.join(', ')}`);
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

if (!settingsSource.includes('getLanguageCoverageSubtext') || !settingsSource.includes("mode === 'LANGUAGE'") || !settingsSource.includes('aria-pressed')) {
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

const phase5LifestyleSharedChoiceHardcodedMarkers = [
  "createChoice({ id: 'lean', label: 'Lean'",
  "createChoice({ id: 'private', label: 'Private'",
  "createChoice({ id: 'solo', label: 'Solo'",
  "createChoice({ id: 'one_day', label: 'One Day'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleSharedChoiceHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle shared choice labels/descriptions are still hard-coded: ${phase5LifestyleSharedChoiceHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleSharedChoiceRefs = [
  [typesSource, 'labelKey?: string;', 'Lifestyle choice label key type'],
  [typesSource, 'descriptionKey?: string;', 'Lifestyle choice description key type'],
  [lifestyleActivitiesServiceSource, 'const createSharedChoice = (choice: LifestyleActivityChoice)', 'shared choice key helper'],
  [lifestyleActivitiesServiceSource, 'labelKey: `services.lifestyle.choice.${choice.kind}.${choice.id}.label`', 'shared choice label key generation'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'lean'", 'scale shared choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'private'", 'privacy shared choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'solo'", 'invite shared choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'one_day'", 'duration shared choice keys'],
  [lifestyleActivitiesSource, 'getChoiceLabel = (choice: LifestyleActivityChoice, language: GameLanguage)', 'choice label localization helper'],
  [lifestyleActivitiesSource, 'getChoiceDescription = (choice: LifestyleActivityChoice, language: GameLanguage)', 'choice description localization helper'],
  [lifestyleActivitiesSource, 'React.useContext(ActivityLanguageContext)', 'option rails consume language context'],
  [english, 'services.lifestyle.choice.SCALE.lean.label', 'Lifestyle shared choice EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.SCALE.lean.label', 'Lifestyle shared choice PT keys'],
];

const missingLifestyleSharedChoiceRefs = phase5LifestyleSharedChoiceRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleSharedChoiceRefs.length > 0) {
  failures.push(`Lifestyle shared choice localization refs are missing: ${missingLifestyleSharedChoiceRefs.join(', ')}`);
}

const phase5LifestyleDestinationHardcodedMarkers = [
  "createChoice({ id: 'usa', label: 'United States'",
  "createChoice({ id: 'uk', label: 'United Kingdom'",
  "createChoice({ id: 'uae', label: 'UAE'",
  "createChoice({ id: 'maldives', label: 'Maldives'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleDestinationHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip destination labels/descriptions are still hard-coded: ${phase5LifestyleDestinationHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleDestinationRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'usa'", 'USA destination choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'uk'", 'UK destination choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'uae'", 'UAE destination choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'maldives'", 'Maldives destination choice keys'],
  [lifestyleActivitiesSource, '{getChoiceLabel(country, language)}', 'country picker localized country labels'],
  [lifestyleActivitiesSource, "t(language, 'activities.tripPreview.destination')", 'trip preview localized destination label'],
  [english, 'services.lifestyle.choice.DESTINATION.usa.label', 'Lifestyle destination EN keys'],
  [english, 'services.lifestyle.choice.DESTINATION.usa.description', 'Lifestyle destination EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.DESTINATION.usa.label', 'Lifestyle destination PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.DESTINATION.usa.description', 'Lifestyle destination PT descriptions'],
];

const missingLifestyleDestinationRefs = phase5LifestyleDestinationRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleDestinationRefs.length > 0) {
  failures.push(`Lifestyle trip destination localization refs are missing: ${missingLifestyleDestinationRefs.join(', ')}`);
}

const phase5LifestyleCityAmericasHardcodedMarkers = [
  "createChoice({ id: 'los_angeles', label: 'Los Angeles'",
  "createChoice({ id: 'toronto', label: 'Toronto'",
  "createChoice({ id: 'mexico_city', label: 'Mexico City'",
  "createChoice({ id: 'rio', label: 'Rio de Janeiro'",
  "createChoice({ id: 'buenos_aires', label: 'Buenos Aires'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCityAmericasHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip Americas city labels/descriptions are still hard-coded: ${phase5LifestyleCityAmericasHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCityAmericasRefs = [
  [lifestyleActivitiesServiceSource, 'const createTripCityChoice = (countryId: string, choice: LifestyleActivityChoice)', 'trip city key helper'],
  [lifestyleActivitiesServiceSource, 'labelKey: `services.lifestyle.choice.CITY.${countryId}.${choice.id}.label`', 'trip city label key generation'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('usa', { id: 'los_angeles'", 'USA city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('canada', { id: 'toronto'", 'Canada city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('mexico', { id: 'mexico_city'", 'Mexico city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('brazil', { id: 'rio'", 'Brazil city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('argentina', { id: 'buenos_aires'", 'Argentina city choice keys'],
  [lifestyleActivitiesSource, 'const cityLabel = getChoiceLabel(city, language);', 'city postcard localized city label'],
  [lifestyleActivitiesSource, 'const countryLabel = country ? getChoiceLabel(country, language) : undefined;', 'city postcard localized country label'],
  [lifestyleActivitiesSource, "t(language, 'activities.tripPreview.pickCity')", 'trip preview localized city label'],
  [english, 'services.lifestyle.choice.CITY.usa.los_angeles.label', 'Lifestyle Americas city EN keys'],
  [english, 'services.lifestyle.choice.CITY.usa.los_angeles.description', 'Lifestyle Americas city EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.usa.los_angeles.label', 'Lifestyle Americas city PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.usa.los_angeles.description', 'Lifestyle Americas city PT descriptions'],
];

const missingLifestyleCityAmericasRefs = phase5LifestyleCityAmericasRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCityAmericasRefs.length > 0) {
  failures.push(`Lifestyle trip Americas city localization refs are missing: ${missingLifestyleCityAmericasRefs.join(', ')}`);
}

const phase5LifestyleCityEuropeHardcodedMarkers = [
  "createChoice({ id: 'london', label: 'London'",
  "createChoice({ id: 'paris', label: 'Paris'",
  "createChoice({ id: 'rome', label: 'Rome'",
  "createChoice({ id: 'barcelona', label: 'Barcelona'",
  "createChoice({ id: 'berlin', label: 'Berlin'",
  "createChoice({ id: 'athens', label: 'Athens'",
  "createChoice({ id: 'istanbul', label: 'Istanbul'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCityEuropeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip Europe city labels/descriptions are still hard-coded: ${phase5LifestyleCityEuropeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCityEuropeRefs = [
  [lifestyleActivitiesServiceSource, "createTripCityChoice('uk', { id: 'london'", 'UK city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('france', { id: 'paris'", 'France city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('italy', { id: 'rome'", 'Italy city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('spain', { id: 'barcelona'", 'Spain city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('germany', { id: 'berlin'", 'Germany city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('greece', { id: 'athens'", 'Greece city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('turkey', { id: 'istanbul'", 'Turkey city choice keys'],
  [english, 'services.lifestyle.choice.CITY.uk.london.label', 'Lifestyle Europe city EN keys'],
  [english, 'services.lifestyle.choice.CITY.uk.london.description', 'Lifestyle Europe city EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.uk.london.label', 'Lifestyle Europe city PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.uk.london.description', 'Lifestyle Europe city PT descriptions'],
];

const missingLifestyleCityEuropeRefs = phase5LifestyleCityEuropeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCityEuropeRefs.length > 0) {
  failures.push(`Lifestyle trip Europe city localization refs are missing: ${missingLifestyleCityEuropeRefs.join(', ')}`);
}

const phase5LifestyleCityAsiaHardcodedMarkers = [
  "createChoice({ id: 'dubai', label: 'Dubai'",
  "createChoice({ id: 'mumbai', label: 'Mumbai'",
  "createChoice({ id: 'tokyo', label: 'Tokyo'",
  "createChoice({ id: 'seoul', label: 'Seoul'",
  "createChoice({ id: 'shanghai', label: 'Shanghai'",
  "createChoice({ id: 'bangkok', label: 'Bangkok'",
  "createChoice({ id: 'singapore_city', label: 'Singapore'",
  "createChoice({ id: 'bali', label: 'Bali'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCityAsiaHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip UAE/Asia city labels/descriptions are still hard-coded: ${phase5LifestyleCityAsiaHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCityAsiaRefs = [
  [lifestyleActivitiesServiceSource, "createTripCityChoice('uae', { id: 'dubai'", 'UAE city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('india', { id: 'mumbai'", 'India city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('japan', { id: 'tokyo'", 'Japan city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('south_korea', { id: 'seoul'", 'South Korea city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('china', { id: 'shanghai'", 'China city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('thailand', { id: 'bangkok'", 'Thailand city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('singapore', { id: 'singapore_city'", 'Singapore city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('indonesia', { id: 'bali'", 'Indonesia city choice keys'],
  [english, 'services.lifestyle.choice.CITY.uae.dubai.label', 'Lifestyle UAE/Asia city EN keys'],
  [english, 'services.lifestyle.choice.CITY.uae.dubai.description', 'Lifestyle UAE/Asia city EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.uae.dubai.label', 'Lifestyle UAE/Asia city PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.uae.dubai.description', 'Lifestyle UAE/Asia city PT descriptions'],
];

const missingLifestyleCityAsiaRefs = phase5LifestyleCityAsiaRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCityAsiaRefs.length > 0) {
  failures.push(`Lifestyle trip UAE/Asia city localization refs are missing: ${missingLifestyleCityAsiaRefs.join(', ')}`);
}

const phase5LifestyleCityOceaniaAfricaHardcodedMarkers = [
  "createChoice({ id: 'sydney', label: 'Sydney'",
  "createChoice({ id: 'queenstown', label: 'Queenstown'",
  "createChoice({ id: 'cape_town', label: 'Cape Town'",
  "createChoice({ id: 'cairo', label: 'Cairo'",
  "createChoice({ id: 'marrakech', label: 'Marrakech'",
  "createChoice({ id: 'nairobi', label: 'Nairobi'",
  "createChoice({ id: 'male', label: 'Male'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCityOceaniaAfricaHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip Oceania/Africa/Maldives city labels/descriptions are still hard-coded: ${phase5LifestyleCityOceaniaAfricaHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCityOceaniaAfricaRefs = [
  [lifestyleActivitiesServiceSource, "createTripCityChoice('australia', { id: 'sydney'", 'Australia city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('new_zealand', { id: 'queenstown'", 'New Zealand city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('south_africa', { id: 'cape_town'", 'South Africa city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('egypt', { id: 'cairo'", 'Egypt city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('morocco', { id: 'marrakech'", 'Morocco city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('kenya', { id: 'nairobi'", 'Kenya city choice keys'],
  [lifestyleActivitiesServiceSource, "createTripCityChoice('maldives', { id: 'male'", 'Maldives city choice keys'],
  [english, 'services.lifestyle.choice.CITY.australia.sydney.label', 'Lifestyle Oceania/Africa city EN keys'],
  [english, 'services.lifestyle.choice.CITY.australia.sydney.description', 'Lifestyle Oceania/Africa city EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.australia.sydney.label', 'Lifestyle Oceania/Africa city PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CITY.australia.sydney.description', 'Lifestyle Oceania/Africa city PT descriptions'],
];

const missingLifestyleCityOceaniaAfricaRefs = phase5LifestyleCityOceaniaAfricaRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCityOceaniaAfricaRefs.length > 0) {
  failures.push(`Lifestyle trip Oceania/Africa/Maldives city localization refs are missing: ${missingLifestyleCityOceaniaAfricaRefs.join(', ')}`);
}

const phase5LifestyleTripActivityHardcodedMarkers = [
  "createChoice({ id: 'food_tour', label: 'Food Tour'",
  "createChoice({ id: 'studio_tour', label: 'Studio Tour'",
  "createChoice({ id: 'festival_pass', label: 'Festival Pass'",
  "createChoice({ id: 'skyline_lounge', label: 'Skyline Lounge'",
  "createChoice({ id: 'harbour_day', label: 'Harbour Day'",
  "createChoice({ id: 'reef_villa_day', label: 'Reef Villa Day'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleTripActivityHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip activity labels/descriptions are still hard-coded: ${phase5LifestyleTripActivityHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleTripActivityRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'food_tour'", 'base trip activity keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'studio_tour'", 'Los Angeles trip activity keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'festival_pass'", 'Cannes trip activity keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'skyline_lounge'", 'Dubai trip activity keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'harbour_day'", 'Sydney trip activity keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'reef_villa_day'", 'Maldives trip activity keys'],
  [english, 'services.lifestyle.choice.TRIP_ACTIVITY.food_tour.label', 'Lifestyle trip activity EN keys'],
  [english, 'services.lifestyle.choice.TRIP_ACTIVITY.food_tour.description', 'Lifestyle trip activity EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.TRIP_ACTIVITY.food_tour.label', 'Lifestyle trip activity PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.TRIP_ACTIVITY.food_tour.description', 'Lifestyle trip activity PT descriptions'],
];

const missingLifestyleTripActivityRefs = phase5LifestyleTripActivityRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleTripActivityRefs.length > 0) {
  failures.push(`Lifestyle trip activity localization refs are missing: ${missingLifestyleTripActivityRefs.join(', ')}`);
}

const phase5LifestyleTripStayTravelHardcodedMarkers = [
  "createChoice({ id: 'simple_stay', label: 'Simple Stay'",
  "createChoice({ id: 'private_villa', label: 'Private Villa'",
  "createChoice({ id: 'train_or_economy', label: 'Economy / Rail'",
  "createChoice({ id: 'chartered_flight', label: 'Charter Flight'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleTripStayTravelHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle trip stay/travel labels/descriptions are still hard-coded: ${phase5LifestyleTripStayTravelHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleTripStayTravelRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'simple_stay'", 'trip stay choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'private_villa'", 'private villa stay choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'train_or_economy'", 'trip travel choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'chartered_flight'", 'charter travel choice keys'],
  [lifestyleActivitiesSource, 'const travelChips = [stay, travel]', 'trip preview stay/travel chip source'],
  [lifestyleActivitiesSource, 'getChoiceLabel(choice, language)', 'trip preview localized stay/travel chips'],
  [english, 'services.lifestyle.choice.STAY.simple_stay.label', 'Lifestyle trip stay EN keys'],
  [english, 'services.lifestyle.choice.STAY.simple_stay.description', 'Lifestyle trip stay EN descriptions'],
  [english, 'services.lifestyle.choice.TRAVEL_MODE.train_or_economy.label', 'Lifestyle trip travel EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.STAY.simple_stay.label', 'Lifestyle trip stay PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.STAY.simple_stay.description', 'Lifestyle trip stay PT descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.TRAVEL_MODE.train_or_economy.label', 'Lifestyle trip travel PT keys'],
];

const missingLifestyleTripStayTravelRefs = phase5LifestyleTripStayTravelRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleTripStayTravelRefs.length > 0) {
  failures.push(`Lifestyle trip stay/travel localization refs are missing: ${missingLifestyleTripStayTravelRefs.join(', ')}`);
}

const phase5LifestyleNightlifeHardcodedMarkers = [
  "createChoice({ id: 'club_takeover', label: 'Club Takeover'",
  "createChoice({ id: 'rooftop_social', label: 'Rooftop Social'",
  "createChoice({ id: 'backroom_bar', label: 'Backroom Bar'",
  "createChoice({ id: 'rented_party_house',",
  "createChoice({ id: 'no_guest', label: 'No Headliner'",
  "createChoice({ id: 'global_heartthrob', label: 'Global Heartthrob'",
  "createChoice({ id: 'inner_circle', label: 'Inner Circle'",
  "createChoice({ id: 'celebrity_stack', label: 'Celebrity Stack'",
  "createChoice({ id: 'no_controls', label: 'Let It Ride'",
  "createChoice({ id: 'documented_drop', label: 'Social Drop'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleNightlifeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle nightlife option labels/descriptions are still hard-coded: ${phase5LifestyleNightlifeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleNightlifeRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'club_takeover'", 'nightlife type choice keys'],
  [lifestyleActivitiesServiceSource, 'const RENTED_PARTY_HOUSE_VENUE = createSharedChoice', 'rented party house venue choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'no_guest'", 'nightlife guest choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'inner_circle'", 'nightlife crowd choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'no_controls'", 'nightlife control choice keys'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_TYPE.club_takeover.label', 'Lifestyle nightlife type EN keys'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_TYPE.club_takeover.description', 'Lifestyle nightlife type EN descriptions'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_VENUE.rented_party_house.label', 'Lifestyle nightlife venue EN keys'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_GUEST.no_guest.label', 'Lifestyle nightlife guest EN keys'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_CROWD.inner_circle.label', 'Lifestyle nightlife crowd EN keys'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_CONTROL.no_controls.label', 'Lifestyle nightlife control EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_TYPE.club_takeover.label', 'Lifestyle nightlife type PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_VENUE.rented_party_house.label', 'Lifestyle nightlife venue PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_GUEST.no_guest.label', 'Lifestyle nightlife guest PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_CROWD.inner_circle.label', 'Lifestyle nightlife crowd PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_CONTROL.no_controls.label', 'Lifestyle nightlife control PT keys'],
];

const missingLifestyleNightlifeRefs = phase5LifestyleNightlifeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleNightlifeRefs.length > 0) {
  failures.push(`Lifestyle nightlife localization refs are missing: ${missingLifestyleNightlifeRefs.join(', ')}`);
}

const phase5LifestyleNightlifeOutcomeHardcodedMarkers = [
  "effectSummary: 'No-show became social chatter'",
  "memoryTitle: `${eventType.label}: Guest No-Show`",
  "memorySummary: `${guest.label} was expected at ${venue.label}",
  "socialMoment: `${guest.label} did not show after saying yes.`",
  "subtext: `${guest.label} was on the guest list",
  "effectSummary: 'Nightlife buzz carried image risk'",
  "headline: `${player.name || 'Actor'} night out turns messy`",
  "socialMoment: `${guest.label} showed up, but the room got messy.`",
  "effectSummary: `${guest.label} lifted the room`",
  "headline: `${player.name || 'Actor'} pulls a headline guest`",
  "sourceLabel: 'Nightlife Run'",
  "created a medical follow-up risk.",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleNightlifeOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle nightlife generated outcome text is still hard-coded: ${phase5LifestyleNightlifeOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleNightlifeOutcomeRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.nightlife.outcome.noShow.effectSummary')", 'nightlife no-show effect localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.nightlife.outcome.messy.news.headline'", 'nightlife messy news localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.nightlife.outcome.success.memory.summary'", 'nightlife success memory localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.nightlife.outcome.health.detail'", 'nightlife health detail localized'],
  [english, 'services.lifestyle.nightlife.outcome.noShow.effectSummary', 'Lifestyle nightlife outcome EN no-show effect'],
  [english, 'services.lifestyle.nightlife.outcome.messy.news.headline', 'Lifestyle nightlife outcome EN messy news'],
  [english, 'services.lifestyle.nightlife.outcome.success.memory.summary', 'Lifestyle nightlife outcome EN success memory'],
  [english, 'services.lifestyle.nightlife.outcome.health.detail', 'Lifestyle nightlife outcome EN health detail'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.nightlife.outcome.noShow.effectSummary', 'Lifestyle nightlife outcome PT no-show effect'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.nightlife.outcome.messy.news.headline', 'Lifestyle nightlife outcome PT messy news'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.nightlife.outcome.success.memory.summary', 'Lifestyle nightlife outcome PT success memory'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.nightlife.outcome.health.detail', 'Lifestyle nightlife outcome PT health detail'],
];

const missingLifestyleNightlifeOutcomeRefs = phase5LifestyleNightlifeOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleNightlifeOutcomeRefs.length > 0) {
  failures.push(`Lifestyle nightlife generated outcome localization refs are missing: ${missingLifestyleNightlifeOutcomeRefs.join(', ')}`);
}

const phase5LifestyleIndustryHardcodedMarkers = [
  "createChoice({ id: 'industry_dinner', label: 'Industry Dinner'",
  "createChoice({ id: 'awards_afterparty', label: 'Awards Afterparty'",
  "createChoice({ id: 'private_room', label: 'Private Room'",
  "createChoice({ id: 'screening_house', label: 'Screening House'",
  "createChoice({ id: 'directors', label: 'Directors'",
  "createChoice({ id: 'current_connections', label: 'Current Connections'",
  "createChoice({ id: 'tasteful_professional', label: 'Tasteful Professional'",
  "createChoice({ id: 'quiet_no_phones', label: 'Quiet No-Phones'",
  "createChoice({ id: 'premium_service', label: 'Premium Service'",
  "createChoice({ id: 'legendary_hosting', label: 'Legendary Hosting'",
  "createChoice({ id: 'private_screening_addon', label: 'Private Screening'",
  "createChoice({ id: 'pr_photographer', label: 'PR Photographer'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleIndustryHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle industry option labels/descriptions are still hard-coded: ${phase5LifestyleIndustryHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleIndustryRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'industry_dinner'", 'industry event choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'private_room'", 'industry venue choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'directors'", 'industry invite group choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'tasteful_professional'", 'industry hosting style choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'premium_service'", 'industry service choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'private_screening_addon'", 'industry addon choice keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_EVENT.industry_dinner.label', 'Lifestyle industry event EN keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_EVENT.industry_dinner.description', 'Lifestyle industry event EN descriptions'],
  [english, 'services.lifestyle.choice.INDUSTRY_VENUE.private_room.label', 'Lifestyle industry venue EN keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_INVITE_GROUP.directors.label', 'Lifestyle industry invite EN keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_HOSTING_STYLE.tasteful_professional.label', 'Lifestyle industry hosting EN keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_SERVICE.premium_service.label', 'Lifestyle industry service EN keys'],
  [english, 'services.lifestyle.choice.INDUSTRY_ADDON.private_screening_addon.label', 'Lifestyle industry addon EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_EVENT.industry_dinner.label', 'Lifestyle industry event PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_VENUE.private_room.label', 'Lifestyle industry venue PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_INVITE_GROUP.directors.label', 'Lifestyle industry invite PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_HOSTING_STYLE.tasteful_professional.label', 'Lifestyle industry hosting PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_SERVICE.premium_service.label', 'Lifestyle industry service PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.INDUSTRY_ADDON.private_screening_addon.label', 'Lifestyle industry addon PT keys'],
];

const missingLifestyleIndustryRefs = phase5LifestyleIndustryRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleIndustryRefs.length > 0) {
  failures.push(`Lifestyle industry localization refs are missing: ${missingLifestyleIndustryRefs.join(', ')}`);
}

const phase5LifestyleIndustryOutcomeHardcodedMarkers = [
  "label: group.id === 'directors' ? 'Indie Director'",
  "sender: 'Industry Social'",
  "subject: `${mockedGuest.label} joked about your invite`",
  "sender: 'Industry RSVP'",
  "subject: `${declinedGuests[0].label} did not attend`",
  "sender: direct ? 'Director Connection' : 'Casting Office'",
  "subject: direct ? 'A director remembered the room' : 'Audition conversation from last night'",
  "subject: 'Casual project talk'",
  "sender: 'Industry Room'",
  "subject: `${guests[0].label} is now in Connections`",
  "effectSummary: `${directRsvpSummary};",
  "memorySummary: `${event.label}, ${venue.label}, ${style.label}",
  "socialMoment: publicRoom ? `${player.name || 'You'} hosted",
  "headline: mockeryNews ? `${mockedGuest?.label} jokes about invite`",
  "logMessage: `Industry Connections got ${directRsvpSummary}",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleIndustryOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle industry generated outcome text is still hard-coded: ${phase5LifestyleIndustryOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleIndustryOutcomeRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.industry.outcome.mocked.inbox.sender')", 'industry mocked inbox sender localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.industry.outcome.casting.direct.text'", 'industry casting text localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.industry.outcome.memory.summary'", 'industry memory summary localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.industry.outcome.news.public.subtext'", 'industry news subtext localized'],
  [english, 'services.lifestyle.industry.outcome.fallbackGuest.directors.label', 'Lifestyle industry outcome EN fallback guest'],
  [english, 'services.lifestyle.industry.outcome.mocked.inbox.sender', 'Lifestyle industry outcome EN mocked inbox'],
  [english, 'services.lifestyle.industry.outcome.memory.summary', 'Lifestyle industry outcome EN memory'],
  [english, 'services.lifestyle.industry.outcome.log', 'Lifestyle industry outcome EN log'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.industry.outcome.fallbackGuest.directors.label', 'Lifestyle industry outcome PT fallback guest'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.industry.outcome.mocked.inbox.sender', 'Lifestyle industry outcome PT mocked inbox'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.industry.outcome.memory.summary', 'Lifestyle industry outcome PT memory'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.industry.outcome.log', 'Lifestyle industry outcome PT log'],
];

const missingLifestyleIndustryOutcomeRefs = phase5LifestyleIndustryOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleIndustryOutcomeRefs.length > 0) {
  failures.push(`Lifestyle industry generated outcome localization refs are missing: ${missingLifestyleIndustryOutcomeRefs.join(', ')}`);
}

const phase5LifestyleCharityHardcodedMarkers = [
  "createChoice({ id: 'children_education', label: 'Children Education'",
  "createChoice({ id: 'climate_arts', label: 'Climate & Arts'",
  "createChoice({ id: 'hotel_ballroom', label: 'Hotel Ballroom'",
  "createChoice({ id: 'stadium_benefit', label: 'Stadium Benefit'",
  "createChoice({ id: 'six_figure_pledge', label: 'Six-Figure Pledge'",
  "createChoice({ id: 'legacy_endowment', label: 'Legacy Endowment'",
  "createChoice({ id: 'private_donors', label: 'Private Donors'",
  "createChoice({ id: 'family_foundation', label: 'Family Foundation'",
  "createChoice({ id: 'quiet_receipts', label: 'Quiet Receipts'",
  "createChoice({ id: 'viral_challenge', label: 'Viral Challenge'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCharityHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle charity option labels/descriptions are still hard-coded: ${phase5LifestyleCharityHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCharityRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'children_education'", 'charity cause choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'hotel_ballroom'", 'charity format choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'six_figure_pledge'", 'charity donation choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'private_donors'", 'charity guest circle choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'quiet_receipts'", 'charity press choice keys'],
  [english, 'services.lifestyle.choice.CHARITY_CAUSE.children_education.label', 'Lifestyle charity cause EN keys'],
  [english, 'services.lifestyle.choice.CHARITY_CAUSE.children_education.description', 'Lifestyle charity cause EN descriptions'],
  [english, 'services.lifestyle.choice.CHARITY_FORMAT.hotel_ballroom.label', 'Lifestyle charity format EN keys'],
  [english, 'services.lifestyle.choice.CHARITY_DONATION.six_figure_pledge.label', 'Lifestyle charity donation EN keys'],
  [english, 'services.lifestyle.choice.CHARITY_GUEST_CIRCLE.private_donors.label', 'Lifestyle charity guest EN keys'],
  [english, 'services.lifestyle.choice.CHARITY_PRESS.quiet_receipts.label', 'Lifestyle charity press EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CHARITY_CAUSE.children_education.label', 'Lifestyle charity cause PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CHARITY_FORMAT.hotel_ballroom.label', 'Lifestyle charity format PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CHARITY_DONATION.six_figure_pledge.label', 'Lifestyle charity donation PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CHARITY_GUEST_CIRCLE.private_donors.label', 'Lifestyle charity guest PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.CHARITY_PRESS.quiet_receipts.label', 'Lifestyle charity press PT keys'],
];

const missingLifestyleCharityRefs = phase5LifestyleCharityRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCharityRefs.length > 0) {
  failures.push(`Lifestyle charity localization refs are missing: ${missingLifestyleCharityRefs.join(', ')}`);
}

const phase5LifestyleCharityOutcomeHardcodedMarkers = [
  "label: 'Custom Donation'",
  "description: `Direct donation chosen by you:",
  "raised money, but the optics looked performative",
  "memoryTitle: namedBuilding ? `${player.name || 'Actor'} College Building Gift`",
  "memorySummary: `${format.label}, ${donation.label}, ${guests.label}, and ${press.label}",
  "faced questions over a glossy",
  "headline: taxInvestigation ? `${player.name || 'Actor'} donation faces questions`",
  "The donation may be legal, but the size and tax structure drew financial scrutiny.",
  "sender: 'Financial Review Desk'",
  "subject: 'Large donation under review'",
  "Charity Gala raised funds for ${cause.label}",
  "namedCollegeBuilding: namedBuilding ? `${player.name || 'Actor'} ${cause.label} Building`",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleCharityOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle charity generated outcome text is still hard-coded: ${phase5LifestyleCharityOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCharityOutcomeRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.charity.outcome.effect.backlash'", 'charity backlash effect localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.charity.outcome.memory.summary'", 'charity memory summary localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.charity.outcome.news.tax.subtext')", 'charity tax news localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.charity.outcome.inbox.tax.sender')", 'charity tax inbox localized'],
  [english, 'services.lifestyle.charity.outcome.effect.backlash', 'Lifestyle charity outcome EN backlash effect'],
  [english, 'services.lifestyle.charity.outcome.memory.summary', 'Lifestyle charity outcome EN memory'],
  [english, 'services.lifestyle.charity.outcome.news.tax.subtext', 'Lifestyle charity outcome EN tax news'],
  [english, 'services.lifestyle.charity.outcome.log.namedBuilding', 'Lifestyle charity outcome EN log'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.charity.outcome.effect.backlash', 'Lifestyle charity outcome PT backlash effect'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.charity.outcome.memory.summary', 'Lifestyle charity outcome PT memory'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.charity.outcome.news.tax.subtext', 'Lifestyle charity outcome PT tax news'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.charity.outcome.log.namedBuilding', 'Lifestyle charity outcome PT log'],
];

const missingLifestyleCharityOutcomeRefs = phase5LifestyleCharityOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCharityOutcomeRefs.length > 0) {
  failures.push(`Lifestyle charity generated outcome localization refs are missing: ${missingLifestyleCharityOutcomeRefs.join(', ')}`);
}

const phase5LifestyleGenericOutcomeHardcodedMarkers = [
  "friendBackgrounds = ['assistant director'",
  "headline: `You met ${name}`",
  "had a great conversation with you during",
  "Not enough cash for this experience.",
  "You already took a trip this week. Try again next week.",
  "was done recently. Try again later.",
  "created a ${activity.shortDescription.toLowerCase()}",
  "description: `Lifestyle: ${activity.name}`",
  "Spent $${quote.totalCost.toLocaleString()} on ${activity.name}.",
  "message: `${activity.name} completed.`",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleGenericOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle generic generated outcome text is still hard-coded: ${phase5LifestyleGenericOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleGenericOutcomeRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.generic.friend.headline'", 'generic friend headline localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.generic.message.notEnoughCash')", 'generic not-enough-cash localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.generic.memory.fallbackSummary'", 'generic fallback memory localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.generic.log.spent'", 'generic spend log localized'],
  [english, 'services.lifestyle.generic.friend.headline', 'Lifestyle generic EN friend headline'],
  [english, 'services.lifestyle.generic.message.notEnoughCash', 'Lifestyle generic EN funds message'],
  [english, 'services.lifestyle.generic.memory.fallbackSummary', 'Lifestyle generic EN memory fallback'],
  [english, 'services.lifestyle.activity.vacation_escape.name', 'Lifestyle activity EN name'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.generic.friend.headline', 'Lifestyle generic PT friend headline'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.generic.message.notEnoughCash', 'Lifestyle generic PT funds message'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.generic.memory.fallbackSummary', 'Lifestyle generic PT memory fallback'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.activity.vacation_escape.name', 'Lifestyle activity PT name'],
];

const missingLifestyleGenericOutcomeRefs = phase5LifestyleGenericOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleGenericOutcomeRefs.length > 0) {
  failures.push(`Lifestyle generic generated outcome localization refs are missing: ${missingLifestyleGenericOutcomeRefs.join(', ')}`);
}

const phase5LifestyleActivityCardHardcodedMarkers = [
  '<div className="truncate text-lg font-black text-white">{activity.name}</div>',
  '{selectedActivity.longDescription}',
  "createChoice({ id: 'local_guides', label: 'Local Guides'",
  "createChoice({ id: 'vip_room', label: 'VIP Room'",
  "createChoice({ id: 'nutritionist', label: 'Nutritionist'",
  'selectedLabels: choices.map(choice => choice.label)',
].filter((marker) => lifestyleActivitiesSource.includes(marker) || lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleActivityCardHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle activity card/extras copy is still hard-coded: ${phase5LifestyleActivityCardHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleActivityCardRefs = [
  [lifestyleActivitiesSource, 'getActivityShortDescription(activity, language)', 'activity card localized short description'],
  [lifestyleActivitiesSource, 'getActivityLongDescription(selectedActivity, language)', 'activity detail localized long description'],
  [lifestyleActivitiesServiceSource, 'const createExtraChoice = (choice: LifestyleActivityChoice)', 'activity extra choice key helper'],
  [lifestyleActivitiesServiceSource, "createExtraChoice({ id: 'local_guides'", 'travel extras use generated keys'],
  [lifestyleActivitiesServiceSource, "labelKey: 'services.lifestyle.choice.EXTRA.wardrobe_polish.label'", 'passive wardrobe label key'],
  [lifestyleActivitiesServiceSource, 'selectedLabels: choices.map(choice => getServiceChoiceLabel(choice, language))', 'quote selected labels localized'],
  [english, 'services.lifestyle.activity.vacation_escape.shortDescription', 'Lifestyle activity EN short descriptions'],
  [english, 'services.lifestyle.activity.vacation_escape.longDescription', 'Lifestyle activity EN long descriptions'],
  [english, 'services.lifestyle.choice.EXTRA.local_guides.label', 'Lifestyle extra EN labels'],
  [english, 'services.lifestyle.choice.EXTRA.wardrobe_polish.description', 'Lifestyle passive wardrobe EN description'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.activity.vacation_escape.shortDescription', 'Lifestyle activity PT short descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.activity.vacation_escape.longDescription', 'Lifestyle activity PT long descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.EXTRA.local_guides.label', 'Lifestyle extra PT labels'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.EXTRA.wardrobe_polish.description', 'Lifestyle passive wardrobe PT description'],
];

const missingLifestyleActivityCardRefs = phase5LifestyleActivityCardRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleActivityCardRefs.length > 0) {
  failures.push(`Lifestyle activity card/extras localization refs are missing: ${missingLifestyleActivityCardRefs.join(', ')}`);
}

const phase5LifestyleDynamicPreviewHardcodedMarkers = [
  "const iconLabel = property.location ? `${property.location} address` : 'Private address';",
  "description: `${iconLabel}. Pay staff, security, cleanup, and guest handling only.`",
  "const cityLabel = city ? getChoiceLabel(city, language) : 'Pick a city';",
  '>Trip Preview<',
  ": 'Destination'} • {days} days",
  '>Trip Cost<',
  "'Choose a pet to see care needs.'",
  "'Care plan'} and {permit ? getChoiceLabel(permit, language) : 'papers'}",
].filter((marker) => lifestyleActivitiesSource.includes(marker) || lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleDynamicPreviewHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle dynamic trip/property/pet preview copy is still hard-coded: ${phase5LifestyleDynamicPreviewHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleDynamicPreviewRefs = [
  [lifestyleActivitiesServiceSource, 'labelKey: `services.lifestyle.choice.DURATION.${durationId}.label`', 'custom trip duration label key'],
  [lifestyleActivitiesServiceSource, "'services.lifestyle.choice.TRAVEL_MODE.owned_aircraft.ultra.description'", 'owned aircraft description key'],
  [lifestyleActivitiesServiceSource, "descriptionKey: 'services.lifestyle.choice.NIGHTLIFE_VENUE.owned_property.description'", 'owned property venue description key'],
  [lifestyleActivitiesSource, "t(language, 'activities.tripPreview.pickCity')", 'trip preview pick-city placeholder localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.tripPreview.title')", 'trip preview title localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.petPreview.careSummary'", 'pet preview care summary localized'],
  [english, 'services.lifestyle.choice.DURATION.trip_3_days.label', 'Lifestyle custom duration EN label'],
  [english, 'services.lifestyle.choice.TRAVEL_MODE.owned_aircraft.ultra.description', 'Lifestyle owned aircraft EN description'],
  [english, 'services.lifestyle.choice.NIGHTLIFE_VENUE.owned_property.description', 'Lifestyle owned property EN description'],
  [english, 'activities.tripPreview.pickCity', 'Lifestyle trip preview EN placeholder'],
  [english, 'activities.petPreview.careSummary', 'Lifestyle pet preview EN care summary'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.DURATION.trip_3_days.label', 'Lifestyle custom duration PT label'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.TRAVEL_MODE.owned_aircraft.ultra.description', 'Lifestyle owned aircraft PT description'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.NIGHTLIFE_VENUE.owned_property.description', 'Lifestyle owned property PT description'],
  [translations.get('pt-BR') || new Map(), 'activities.tripPreview.pickCity', 'Lifestyle trip preview PT placeholder'],
  [translations.get('pt-BR') || new Map(), 'activities.petPreview.careSummary', 'Lifestyle pet preview PT care summary'],
];

const missingLifestyleDynamicPreviewRefs = phase5LifestyleDynamicPreviewRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleDynamicPreviewRefs.length > 0) {
  failures.push(`Lifestyle dynamic trip/property/pet preview localization refs are missing: ${missingLifestyleDynamicPreviewRefs.join(', ')}`);
}

const phase5LifestyleNightlifeIndustryPreviewHardcodedMarkers = [
  "guest?.id === 'no_guest' ? 'No headline guest'",
  "'Volatile RSVP'",
  "'Likely arrival'",
  ">Night Preview<",
  ">Guest Read<",
  ">Image Risk<",
  "const signal = totalCost >= 500_000 ? 'Power room'",
  "Industry Room",
  "'Industry Connections'",
  ">Invite Signal<",
  ">Room Read<",
  ">Social Risk<",
  "Named people receive real invites",
  "{guest.label}",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleNightlifeIndustryPreviewHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle nightlife/industry preview copy is still hard-coded: ${phase5LifestyleNightlifeIndustryPreviewHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleNightlifeIndustryPreviewRefs = [
  [lifestyleActivitiesSource, "t(language, 'activities.nightlifePreview.title')", 'nightlife preview title localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.nightlifePreview.guestInvited'", 'nightlife guest invited text localized'],
  [lifestyleActivitiesSource, "getChoiceLabel(choice, language)", 'nightlife crowd chip localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.industryPreview.title')", 'industry preview title localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.industryPreview.signal.power')", 'industry signal localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.industryPreview.inviteNote')", 'industry invite note localized'],
  [lifestyleActivitiesSource, "getChoiceLabel(guest, language)", 'selected industry guest chips localized'],
  [english, 'activities.nightlifePreview.title', 'Lifestyle nightlife preview EN title'],
  [english, 'activities.nightlifePreview.reliability.likelyArrival', 'Lifestyle nightlife preview EN reliability'],
  [english, 'activities.industryPreview.title', 'Lifestyle industry preview EN title'],
  [english, 'activities.industryPreview.inviteNote', 'Lifestyle industry preview EN note'],
  [translations.get('pt-BR') || new Map(), 'activities.nightlifePreview.title', 'Lifestyle nightlife preview PT title'],
  [translations.get('pt-BR') || new Map(), 'activities.nightlifePreview.reliability.likelyArrival', 'Lifestyle nightlife preview PT reliability'],
  [translations.get('pt-BR') || new Map(), 'activities.industryPreview.title', 'Lifestyle industry preview PT title'],
  [translations.get('pt-BR') || new Map(), 'activities.industryPreview.inviteNote', 'Lifestyle industry preview PT note'],
];

const missingLifestyleNightlifeIndustryPreviewRefs = phase5LifestyleNightlifeIndustryPreviewRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleNightlifeIndustryPreviewRefs.length > 0) {
  failures.push(`Lifestyle nightlife/industry preview localization refs are missing: ${missingLifestyleNightlifeIndustryPreviewRefs.join(', ')}`);
}

const phase5LifestyleCharityModalHardcodedMarkers = [
  ">Charity Gala<",
  "'Choose Cause'",
  "'Format'} • {donation?.label || 'Donation'",
  ">Public Read<",
  ">Proof<",
  "'Credible' : 'Needs proof'",
  ">Guest Circle<",
  ">Tax Shield<",
  ">Image Cleanup<",
  "'Strong' : 'Medium'",
  ">Optics Risk<",
  "The public judges whether the donation feels real.",
  ">Activity Result<",
  ">New Encounter<",
  ">Add Friend<",
  ">Just Memory<",
  ">Companion Added<",
  "Welcome {pending.pet.name}",
  ">Keep Name<",
  ">Save Pet<",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleCharityModalHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle charity/result/pet modal copy is still hard-coded: ${phase5LifestyleCharityModalHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCharityModalRefs = [
  [lifestyleActivitiesSource, "t(language, 'activities.charityPreview.title')", 'charity preview title localized'],
  [lifestyleActivitiesSource, "getChoiceLabel(cause, language)", 'charity cause label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.charityPreview.publicRead')", 'charity public-read label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.charityPreview.summary.namedBuilding')", 'charity named-building summary localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.charityPreview.summary.generic')", 'charity generic summary localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.resultModal.title')", 'activity result modal title localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.petNameModal.title')", 'pet name modal title localized'],
  [english, 'activities.charityPreview.title', 'Lifestyle charity preview EN title'],
  [english, 'activities.charityPreview.summary.namedBuilding', 'Lifestyle charity preview EN summary'],
  [english, 'activities.resultModal.title', 'Lifestyle result modal EN title'],
  [english, 'activities.petNameModal.title', 'Lifestyle pet modal EN title'],
  [translations.get('pt-BR') || new Map(), 'activities.charityPreview.title', 'Lifestyle charity preview PT title'],
  [translations.get('pt-BR') || new Map(), 'activities.charityPreview.summary.namedBuilding', 'Lifestyle charity preview PT summary'],
  [translations.get('pt-BR') || new Map(), 'activities.resultModal.title', 'Lifestyle result modal PT title'],
  [translations.get('pt-BR') || new Map(), 'activities.petNameModal.title', 'Lifestyle pet modal PT title'],
];

const missingLifestyleCharityModalRefs = phase5LifestyleCharityModalRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCharityModalRefs.length > 0) {
  failures.push(`Lifestyle charity/result/pet modal localization refs are missing: ${missingLifestyleCharityModalRefs.join(', ')}`);
}

const phase5LifestylePetBriefListingHardcodedMarkers = [
  "? 'Sanctuary' : profile.rarity",
  ">Base<",
  ">Bond<",
  ">Pet Companion Center<",
  ">Choose a companion properly<",
  "Visit a store, pick the category they sell",
  "['Stores', 'Categories', 'Checkout']",
  "? 'Pick seller'",
  "? 'Dogs, cats, birds...'",
  ": 'Home + style'",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestylePetBriefListingHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle pet brief/listing UI copy is still hard-coded: ${phase5LifestylePetBriefListingHardcodedMarkers.join(', ')}`);
}

const phase5LifestylePetBriefListingRefs = [
  [lifestyleActivitiesSource, "t(language, 'activities.petListing.base')", 'pet listing base label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.petListing.bond')", 'pet listing bond label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.petBrief.description')", 'pet brief description localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.petBrief.step.stores.label')", 'pet brief stores step localized'],
  [english, 'activities.petListing.base', 'Lifestyle pet listing EN base'],
  [english, 'activities.petBrief.description', 'Lifestyle pet brief EN description'],
  [english, 'activities.petBrief.step.checkout.description', 'Lifestyle pet brief EN checkout'],
  [translations.get('pt-BR') || new Map(), 'activities.petListing.base', 'Lifestyle pet listing PT base'],
  [translations.get('pt-BR') || new Map(), 'activities.petBrief.description', 'Lifestyle pet brief PT description'],
  [translations.get('pt-BR') || new Map(), 'activities.petBrief.step.checkout.description', 'Lifestyle pet brief PT checkout'],
];

const missingLifestylePetBriefListingRefs = phase5LifestylePetBriefListingRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestylePetBriefListingRefs.length > 0) {
  failures.push(`Lifestyle pet brief/listing localization refs are missing: ${missingLifestylePetBriefListingRefs.join(', ')}`);
}

const phase5LifestyleWellnessPreviewHardcodedMarkers = [
  "const careLabel = program?.id === 'camera_ready_care' ? 'Looks Care' : program?.id === 'regular_checkup' ? 'Preventive' : 'Medical Care';",
  "program?.label || 'Care Plan'",
  "provider?.label || 'Provider'",
  "focus?.label || 'Treatment'",
  ">Cost<",
  "? 'Active Medical Issue' : 'Care Path'",
  ">Health cap<",
  ">Treatment match<",
  ">Aftercare<",
  "support?.label || 'Follow-up'",
  ">Health<",
  ">Mood<",
  ">Risk<",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleWellnessPreviewHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle wellness preview UI copy is still hard-coded: ${phase5LifestyleWellnessPreviewHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleWellnessPreviewRefs = [
  [lifestyleActivitiesSource, "t(language, 'activities.wellnessPreview.care.looks')", 'wellness preview care label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.wellnessPreview.activeIssue')", 'wellness preview active issue label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.wellnessPreview.treatmentMatch')", 'wellness preview treatment-match label localized'],
  [lifestyleActivitiesSource, "support ? getChoiceLabel(support, language) : t(language, 'activities.wellnessPreview.followUp')", 'wellness preview support fallback localized'],
  [english, 'activities.wellnessPreview.care.looks', 'Lifestyle wellness preview EN care'],
  [english, 'activities.wellnessPreview.treatmentMatch', 'Lifestyle wellness preview EN treatment match'],
  [english, 'activities.wellnessPreview.followUp', 'Lifestyle wellness preview EN follow-up'],
  [translations.get('pt-BR') || new Map(), 'activities.wellnessPreview.care.looks', 'Lifestyle wellness preview PT care'],
  [translations.get('pt-BR') || new Map(), 'activities.wellnessPreview.treatmentMatch', 'Lifestyle wellness preview PT treatment match'],
  [translations.get('pt-BR') || new Map(), 'activities.wellnessPreview.followUp', 'Lifestyle wellness preview PT follow-up'],
];

const missingLifestyleWellnessPreviewRefs = phase5LifestyleWellnessPreviewRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleWellnessPreviewRefs.length > 0) {
  failures.push(`Lifestyle wellness preview localization refs are missing: ${missingLifestyleWellnessPreviewRefs.join(', ')}`);
}

const phase5LifestyleCategoryShellHardcodedMarkers = [
  "TRAVEL: { label: 'Travel'",
  "{ id: 'ALL', label: 'All' }",
  "treatmentMatchCount >= 2 ? 'Strong'",
  "{ label: 'Mood', value: formatStat(player.stats.happiness)",
  "{ label: 'Spent', value: formatMoney(state.totalSpent)",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleCategoryShellHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle category/stat shell copy is still hard-coded: ${phase5LifestyleCategoryShellHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCategoryShellRefs = [
  [lifestyleActivitiesSource, "labelKey: 'activities.category.TRAVEL'", 'Lifestyle activity category label keys'],
  [lifestyleActivitiesSource, "t(language, filter.labelKey)", 'Lifestyle activity filter labels localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.treatmentMatch.strong')", 'Lifestyle treatment match values localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.stat.spent')", 'Lifestyle activity stat labels localized'],
  [english, 'activities.category.TRAVEL', 'Lifestyle category EN keys'],
  [translations.get('pt-BR') || new Map(), 'activities.category.TRAVEL', 'Lifestyle category PT keys'],
  [english, 'activities.treatmentMatch.strong', 'Lifestyle treatment match EN keys'],
  [translations.get('pt-BR') || new Map(), 'activities.treatmentMatch.strong', 'Lifestyle treatment match PT keys'],
];

const missingLifestyleCategoryShellRefs = phase5LifestyleCategoryShellRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCategoryShellRefs.length > 0) {
  failures.push(`Lifestyle category/stat shell localization refs are missing: ${missingLifestyleCategoryShellRefs.join(', ')}`);
}

const ptBrazilTranslations = translations.get('pt-BR') || new Map();
const phase5LifestylePtCharityPolishMarkers = [
  ['services.lifestyle.activity.charity_gala.name', 'Charity Gala'],
  ['services.lifestyle.charity.outcome.log.backlash', 'Charity Gala'],
  ['services.lifestyle.charity.outcome.log.tax', 'Charity Gala'],
  ['services.lifestyle.charity.outcome.log.namedBuilding', 'Charity Gala'],
  ['services.lifestyle.charity.outcome.log.credible', 'Charity Gala'],
].filter(([key, marker]) => (ptBrazilTranslations.get(key) || '').includes(marker));

if (phase5LifestylePtCharityPolishMarkers.length > 0) {
  failures.push(`PT-BR charity activity/outcome copy still uses English naming: ${phase5LifestylePtCharityPolishMarkers.map(([key]) => key).join(', ')}`);
}

const phase5LifestylePtNightlifePolishMarkers = [
  ['services.lifestyle.choice.NIGHTLIFE_TYPE.after_party.label', 'After-Party'],
  ['services.lifestyle.choice.NIGHTLIFE_GUEST.no_guest.label', 'Headliner'],
].filter(([key, marker]) => (ptBrazilTranslations.get(key) || '').includes(marker));

if (phase5LifestylePtNightlifePolishMarkers.length > 0) {
  failures.push(`PT-BR nightlife option copy still uses English naming: ${phase5LifestylePtNightlifePolishMarkers.map(([key]) => key).join(', ')}`);
}

const phase5LifestyleAssetUiHardcodedMarkers = [
  '? item.style',
  ': item.vehicleType',
  '? item.vehicleType',
  ': item.subCategory || item.category',
  ': `${item.style} • +${item.auditionBonus} audition`',
  ': `${item.vehicleType} • +${item.reputationBonus}',
  'secondaryMeta = isVehicle ? item.type',
].filter((marker) => lifestyleAssetsSource.includes(marker));

if (phase5LifestyleAssetUiHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle asset marketplace UI labels are still hard-coded: ${phase5LifestyleAssetUiHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAssetUiRefs = [
  [lifestyleAssetsSource, 'getAssetDisplayName(item)', 'asset display name helper used'],
  [lifestyleAssetsSource, 'getAssetTypeLabel(item)', 'asset type label helper used'],
  [lifestyleAssetsSource, 'getClothingStyleLabel(item.style)', 'clothing style helper used'],
  [lifestyleAssetsSource, "tr('lifestyle.audition')", 'audition stat label localized'],
  [english, 'lifestyle.assetType.Property', 'Lifestyle asset type EN property'],
  [english, 'lifestyle.assetType.Vehicle', 'Lifestyle asset type EN vehicle'],
  [english, 'lifestyle.clothingStyle.Luxury', 'Lifestyle clothing style EN luxury'],
  [english, 'lifestyle.audition', 'Lifestyle audition EN label'],
  [translations.get('pt-BR') || new Map(), 'lifestyle.assetType.Property', 'Lifestyle asset type PT property'],
  [translations.get('pt-BR') || new Map(), 'lifestyle.assetType.Vehicle', 'Lifestyle asset type PT vehicle'],
  [translations.get('pt-BR') || new Map(), 'lifestyle.clothingStyle.Luxury', 'Lifestyle clothing style PT luxury'],
  [translations.get('pt-BR') || new Map(), 'lifestyle.audition', 'Lifestyle audition PT label'],
];

const missingLifestyleAssetUiRefs = phase5LifestyleAssetUiRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleAssetUiRefs.length > 0) {
  failures.push(`Lifestyle asset marketplace UI localization refs are missing: ${missingLifestyleAssetUiRefs.join(', ')}`);
}

const phase5LifestyleCustomizationUiHardcodedMarkers = [
  'customLabels.push(opt.label)',
  "name: `${customizationItem.name} ${customLabels.length > 0 ? '(Custom)' : ''}`",
  '`${customizationItem.vehicleType} • +${customizationItem.reputationBonus}',
  '{customizationItem.name}</h1>',
].filter((marker) => lifestyleSource.includes(marker));

if (phase5LifestyleCustomizationUiHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle customization modal/generated asset text is still hard-coded: ${phase5LifestyleCustomizationUiHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleCustomizationUiRefs = [
  [lifestyleSource, 'getAssetDisplayName(customizationItem)', 'customization asset display helper used'],
  [lifestyleSource, 'getVehicleTypeLabel(customizationItem)', 'customization vehicle type helper used'],
  [lifestyleSource, 'getCustomizationLabel(opt)', 'customization option label helper used'],
  [lifestyleSource, "tr('lifestyle.customSuffix')", 'custom suffix localized'],
  [english, 'lifestyle.customSuffix', 'Lifestyle EN custom suffix'],
  [translations.get('pt-BR') || new Map(), 'lifestyle.customSuffix', 'Lifestyle PT custom suffix'],
];

const missingLifestyleCustomizationUiRefs = phase5LifestyleCustomizationUiRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleCustomizationUiRefs.length > 0) {
  failures.push(`Lifestyle customization modal localization refs are missing: ${missingLifestyleCustomizationUiRefs.join(', ')}`);
}

const phase5ImproveCatalogKeyRefs = [
  [typesSource, 'nameKey?: string;', 'Improvement activity/option nameKey type'],
  [typesSource, 'descriptionKey?: string;', 'Improvement activity/option descriptionKey type'],
  [lifestyleLogicSource, "nameKey: 'improve.activity.act_gym_local.name'", 'improve activity name keys'],
  [lifestyleLogicSource, "descriptionKey: 'improve.activity.act_gym_local.desc'", 'improve activity description keys'],
  [lifestyleLogicSource, "nameKey: 'improve.option.opt_cardio.name'", 'improve option name keys'],
  [lifestyleLogicSource, "descriptionKey: 'improve.option.opt_cardio.desc'", 'improve option description keys'],
  [improvePageSource, 'getActivityName(selectedActivity)', 'ImprovePage activity key usage'],
  [improvePageSource, 'getOptionName(opt)', 'ImprovePage option key usage'],
  [english, 'improve.activity.act_therapy.name', 'Improve activity EN therapy key'],
  [english, 'improve.option.opt_counseling.desc', 'Improve option EN counseling key'],
  [translations.get('pt-BR') || new Map(), 'improve.activity.act_therapy.name', 'Improve activity PT therapy key'],
  [translations.get('pt-BR') || new Map(), 'improve.option.opt_counseling.desc', 'Improve option PT counseling key'],
];

const missingPhase5ImproveCatalogKeyRefs = phase5ImproveCatalogKeyRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingPhase5ImproveCatalogKeyRefs.length > 0) {
  failures.push(`Improve self-care catalog explicit localization keys are missing: ${missingPhase5ImproveCatalogKeyRefs.join(', ')}`);
}

const phase5GenreTrainingCatalogRefs = [
  [lifestyleLogicSource, 'export interface GenreTrainingOption', 'genre training explicit type'],
  [lifestyleLogicSource, "labelKey: 'improve.genreTraining.ACTION.name'", 'genre training label keys'],
  [lifestyleLogicSource, "descriptionKey: 'improve.genreTraining.ACTION.desc'", 'genre training description keys'],
  [improvePageSource, 'getGenreTrainingName(training)', 'Genre Lab training label helper usage'],
  [improvePageSource, 'getGenreTrainingDescription(training)', 'Genre Lab training description helper usage'],
  [english, 'improve.genreTraining.ACTION.name', 'Genre training EN action name'],
  [english, 'improve.genreTraining.DOCUMENTARY.desc', 'Genre training EN documentary desc'],
  [translations.get('pt-BR') || new Map(), 'improve.genreTraining.ACTION.name', 'Genre training PT action name'],
  [translations.get('pt-BR') || new Map(), 'improve.genreTraining.DOCUMENTARY.desc', 'Genre training PT documentary desc'],
];

const missingPhase5GenreTrainingCatalogRefs = phase5GenreTrainingCatalogRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingPhase5GenreTrainingCatalogRefs.length > 0) {
  failures.push(`Genre training catalog localization refs are missing: ${missingPhase5GenreTrainingCatalogRefs.join(', ')}`);
}

const phase5WorkshopCatalogRefs = [
  [lifestyleLogicSource, "nameKey: 'improve.workshop.ws_intro_acting'", 'workshop course name keys'],
  [lifestyleLogicSource, "nameKey: 'improve.workshop.ws_auteur_masterclass'", 'workshop director course name keys'],
  [improvePageSource, 'getWorkshopName(course)', 'ImprovePage workshop helper usage'],
  [improvePageSource, 'c.nameKey === course.nameKey', 'ImprovePage workshop enrollment key matching'],
  [gameLoopSource, 'getCommitmentDisplayName(c, language)', 'game loop commitment display helper usage'],
  [gameLoopSource, "t(language, 'services.gameLoop.commitment.courseCompleted'", 'course completion log localization'],
  [english, 'services.gameLoop.commitment.courseCompleted', 'course completion EN log key'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.commitment.courseCompleted', 'course completion PT log key'],
];

const missingPhase5WorkshopCatalogRefs = phase5WorkshopCatalogRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingPhase5WorkshopCatalogRefs.length > 0) {
  failures.push(`Workshop course catalog localization refs are missing: ${missingPhase5WorkshopCatalogRefs.join(', ')}`);
}

const phase5LifestyleWellnessHardcodedMarkers = [
  "createChoice({ id: 'regular_checkup', label: 'Regular Checkup'",
  "createChoice({ id: 'camera_ready_care', label: 'Looks & Skin Care'",
  "createChoice({ id: 'public_clinic', label: 'Public Clinic'",
  "createChoice({ id: 'medical_concierge', label: 'Medical Concierge'",
  "createChoice({ id: 'basic_treatment', label: 'Basic Treatment'",
  "createChoice({ id: 'camera_polish', label: 'Camera Polish'",
  "createChoice({ id: 'no_followup', label: 'No Follow-up'",
  "createChoice({ id: 'recovery_retreat', label: 'Recovery Retreat'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleWellnessHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle wellness option labels/descriptions are still hard-coded: ${phase5LifestyleWellnessHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleWellnessRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'regular_checkup'", 'wellness program choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'public_clinic'", 'wellness provider choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'basic_treatment'", 'wellness focus choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'no_followup'", 'wellness support choice keys'],
  [english, 'services.lifestyle.choice.WELLNESS_PROGRAM.regular_checkup.label', 'Lifestyle wellness program EN keys'],
  [english, 'services.lifestyle.choice.WELLNESS_PROGRAM.regular_checkup.description', 'Lifestyle wellness program EN descriptions'],
  [english, 'services.lifestyle.choice.WELLNESS_PROVIDER.public_clinic.label', 'Lifestyle wellness provider EN keys'],
  [english, 'services.lifestyle.choice.WELLNESS_FOCUS.basic_treatment.label', 'Lifestyle wellness focus EN keys'],
  [english, 'services.lifestyle.choice.WELLNESS_SUPPORT.no_followup.label', 'Lifestyle wellness support EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.WELLNESS_PROGRAM.regular_checkup.label', 'Lifestyle wellness program PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.WELLNESS_PROVIDER.public_clinic.label', 'Lifestyle wellness provider PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.WELLNESS_FOCUS.basic_treatment.label', 'Lifestyle wellness focus PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.WELLNESS_SUPPORT.no_followup.label', 'Lifestyle wellness support PT keys'],
];

const missingLifestyleWellnessRefs = phase5LifestyleWellnessRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleWellnessRefs.length > 0) {
  failures.push(`Lifestyle wellness localization refs are missing: ${missingLifestyleWellnessRefs.join(', ')}`);
}

const phase5LifestyleGuestGeneratedHardcodedMarkers = [
  "description: `${choice.description} • invite only, RSVP not guaranteed`",
  'name: headlineNpc?.name || guest.label',
  'name: npc?.name || guest.label',
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleGuestGeneratedHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle guest generated text/names are still hard-coded: ${phase5LifestyleGuestGeneratedHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleGuestGeneratedRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.industry.guest.inviteOnlyDescription'", 'industry guest invite-only description localized'],
  [lifestyleActivitiesServiceSource, 'const guestLabel = getServiceChoiceLabel(guest, language);', 'guest relationship label localization'],
  [english, 'services.lifestyle.industry.guest.inviteOnlyDescription', 'Lifestyle industry guest EN invite-only description'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.industry.guest.inviteOnlyDescription', 'Lifestyle industry guest PT invite-only description'],
];

const missingLifestyleGuestGeneratedRefs = phase5LifestyleGuestGeneratedRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleGuestGeneratedRefs.length > 0) {
  failures.push(`Lifestyle guest generated localization refs are missing: ${missingLifestyleGuestGeneratedRefs.join(', ')}`);
}

const phase5LifestyleWellnessOutcomeHardcodedMarkers = [
  "let effectSummary = 'Care plan completed'",
  "effectSummary = 'Addiction and burnout pressure reset'",
  "effectSummary = 'Looks and camera confidence improved'",
  "headline: `${player.name || 'Actor'} gets camera-ready care`",
  "sender: 'Medical Team'",
  "subject: `${treatedConditions[0].label} treatment update`",
  "memoryTitle: treatedConditions.length ? `Treated ${treatedConditions[0].label}`",
  "socialMoment: program.id === 'camera_ready_care' ? `${program.label} improved your public-facing look.`",
  "`${program.label} lowered recovery pressure through ${provider.label}.`",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleWellnessOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle wellness generated outcome text is still hard-coded: ${phase5LifestyleWellnessOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleWellnessOutcomeRefs = [
  [lifestyleActivitiesServiceSource, 'const conditionLabels = treatedConditions.map(condition => getHealthConditionLabel(condition, language));', 'wellness condition labels localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.wellness.outcome.effect.addiction_rehab')", 'wellness program effect localization'],
  [lifestyleActivitiesServiceSource, "sender: t(language, 'services.lifestyle.wellness.outcome.inbox.sender')", 'wellness inbox sender localization'],
  [lifestyleActivitiesServiceSource, "memorySummary: t(language, 'services.lifestyle.wellness.outcome.memory.summary'", 'wellness memory summary localization'],
  [lifestyleActivitiesServiceSource, "logMessage: treatedConditions.length", 'wellness log keeps conditional branch'],
  [english, 'services.lifestyle.wellness.outcome.effect.default', 'Lifestyle wellness outcome EN default effect'],
  [english, 'services.lifestyle.wellness.outcome.inbox.sender', 'Lifestyle wellness outcome EN inbox sender'],
  [english, 'services.lifestyle.wellness.outcome.memory.summary', 'Lifestyle wellness outcome EN memory summary'],
  [english, 'services.lifestyle.wellness.outcome.log.pressure', 'Lifestyle wellness outcome EN pressure log'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.wellness.outcome.effect.default', 'Lifestyle wellness outcome PT default effect'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.wellness.outcome.inbox.sender', 'Lifestyle wellness outcome PT inbox sender'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.wellness.outcome.memory.summary', 'Lifestyle wellness outcome PT memory summary'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.wellness.outcome.log.pressure', 'Lifestyle wellness outcome PT pressure log'],
];

const missingLifestyleWellnessOutcomeRefs = phase5LifestyleWellnessOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleWellnessOutcomeRefs.length > 0) {
  failures.push(`Lifestyle wellness generated outcome localization refs are missing: ${missingLifestyleWellnessOutcomeRefs.join(', ')}`);
}

const phase5LifestyleAdoptionHardcodedMarkers = [
  "createChoice({ id: 'local_agency', label: 'Local Agency'",
  "createChoice({ id: 'private_agency', label: 'Private Agency'",
  "createChoice({ id: 'basic_home', label: 'Basic Home Prep'",
  "createChoice({ id: 'legacy_nursery', label: 'Legacy Room'",
  "createChoice({ id: 'legal_only', label: 'Legal Only'",
  "createChoice({ id: 'full_transition_team', label: 'Transition Team'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleAdoptionHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle adoption option labels/descriptions are still hard-coded: ${phase5LifestyleAdoptionHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAdoptionRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'local_agency'", 'adoption route choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'basic_home'", 'adoption home prep choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'legal_only'", 'adoption support choice keys'],
  [english, 'services.lifestyle.choice.ADOPTION_ROUTE.local_agency.label', 'Lifestyle adoption route EN keys'],
  [english, 'services.lifestyle.choice.ADOPTION_ROUTE.local_agency.description', 'Lifestyle adoption route EN descriptions'],
  [english, 'services.lifestyle.choice.ADOPTION_HOME_PREP.basic_home.label', 'Lifestyle adoption home prep EN keys'],
  [english, 'services.lifestyle.choice.ADOPTION_SUPPORT.legal_only.label', 'Lifestyle adoption support EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.ADOPTION_ROUTE.local_agency.label', 'Lifestyle adoption route PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.ADOPTION_HOME_PREP.basic_home.label', 'Lifestyle adoption home prep PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.ADOPTION_SUPPORT.legal_only.label', 'Lifestyle adoption support PT keys'],
];

const missingLifestyleAdoptionRefs = phase5LifestyleAdoptionRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleAdoptionRefs.length > 0) {
  failures.push(`Lifestyle adoption localization refs are missing: ${missingLifestyleAdoptionRefs.join(', ')}`);
}

const phase5LifestyleAdoptionProfileHardcodedMarkers = [
  "personality: 'Gentle, observant, settles with routine.'",
  "background: 'Newborn match through a local family placement.'",
  "needs: 'High care, steady nights, and long-term childcare.'",
  "dream: 'A stable home from the very beginning.'",
  "personality: 'Independent, sharp, loyal once trust is earned.'",
  "description: `${profile.age === 0 ? 'Infant' : `${profile.age} years old`} - ${profile.personality}`",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleAdoptionProfileHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle adoption child profile text is still hard-coded: ${phase5LifestyleAdoptionProfileHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAdoptionOutcomeHardcodedMarkers = [
  "sender: 'Adoption Center'",
  "subject: approved ? 'Adoption approved' : 'Application needs more preparation'",
  "effectSummary: approved ? `${profile.name} added to Connections` : 'Application delayed'",
  "memoryTitle: approved ? `Adopted ${profile.name}` : 'Adoption Application Delayed'",
  "headline: `${player.name || 'Actor'} welcomes a child`",
  "? `${profile.name} joined your family through adoption. Open Connections for child actions.`",
  ": 'Adoption application was delayed by the agency.'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestyleAdoptionOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle adoption generated outcome text is still hard-coded: ${phase5LifestyleAdoptionOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAdoptionProfileOutcomeRefs = [
  [lifestyleActivitiesServiceSource, 'const createAdoptionProfile = (profile: AdoptionChildProfileSeed): AdoptionChildProfile', 'adoption profile key helper'],
  [lifestyleActivitiesServiceSource, 'personalityKey: `services.lifestyle.adoption.profile.${profile.id}.personality`', 'adoption profile key generation'],
  [lifestyleActivitiesServiceSource, 'const createAdoptionTemplate = (template: AdoptionPersonalityTemplateSeed): AdoptionPersonalityTemplate', 'adoption template key helper'],
  [lifestyleActivitiesServiceSource, 'personalityKey: `services.lifestyle.adoption.template.${template.id}.personality`', 'adoption template key generation'],
  [lifestyleActivitiesSource, 'getAdoptionProfilePersonality(profile, language)', 'adoption card localized personality'],
  [lifestyleActivitiesSource, 'getAdoptionProfileNeeds(profile, language)', 'adoption card localized needs'],
  [lifestyleActivitiesSource, 'getAdoptionAgeLabel(profile, language)', 'adoption card localized age'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.adoption.outcome.inbox.sender')", 'adoption inbox sender localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.adoption.outcome.memory.approvedSummary'", 'adoption memory summary localized'],
  [english, 'services.lifestyle.adoption.profile.maya_reed.personality', 'Lifestyle adoption profile EN personality'],
  [english, 'services.lifestyle.adoption.profile.maya_reed.needs', 'Lifestyle adoption profile EN needs'],
  [english, 'services.lifestyle.adoption.template.infant_steady.personality', 'Lifestyle adoption template EN personality'],
  [english, 'services.lifestyle.adoption.outcome.inbox.sender', 'Lifestyle adoption outcome EN inbox sender'],
  [english, 'services.lifestyle.adoption.outcome.memory.approvedSummary', 'Lifestyle adoption outcome EN memory summary'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.profile.maya_reed.personality', 'Lifestyle adoption profile PT personality'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.profile.maya_reed.needs', 'Lifestyle adoption profile PT needs'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.template.infant_steady.personality', 'Lifestyle adoption template PT personality'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.outcome.inbox.sender', 'Lifestyle adoption outcome PT inbox sender'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.outcome.memory.approvedSummary', 'Lifestyle adoption outcome PT memory summary'],
];

const missingLifestyleAdoptionProfileOutcomeRefs = phase5LifestyleAdoptionProfileOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleAdoptionProfileOutcomeRefs.length > 0) {
  failures.push(`Lifestyle adoption profile/outcome localization refs are missing: ${missingLifestyleAdoptionProfileOutcomeRefs.join(', ')}`);
}

const phase5LifestyleAdoptionEligibilityHardcodedMarkers = [
  "label: 'Adult Applicant'",
  "detail: (player.age || 0) >= 21 ? `${player.age} years old` : 'Must be at least 21'",
  "label: 'Cash Reserve'",
  "label: 'Stable Home'",
  "statusLabel: blockers.length === 0 ? 'Qualified' : 'Not Ready'",
  "message: `Adoption application is not ready: ${eligibility.blockers.join(', ')}.`",
  "label: 'Criteria'",
  "Adoption Criteria",
  "Readiness",
  "Fix {eligibility.blockers.join(', ')} before submitting an application.",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker) || lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleAdoptionEligibilityHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle adoption eligibility/check UI text is still hard-coded: ${phase5LifestyleAdoptionEligibilityHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAdoptionEligibilityRefs = [
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.adoption.eligibility.check.age.label')", 'adoption eligibility service check label localization'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.adoption.eligibility.status.qualified')", 'adoption eligibility service status localization'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.adoption.eligibility.notReadyMessage'", 'adoption eligibility not-ready message localization'],
  [lifestyleActivitiesSource, "t(language, 'activities.adoption.stage.criteria')", 'adoption stage pill localization'],
  [lifestyleActivitiesSource, "t(language, 'activities.adoption.eligibility.title')", 'adoption eligibility title localization'],
  [lifestyleActivitiesSource, "t(language, 'activities.adoption.eligibility.fixBlockers'", 'adoption blocker guidance localization'],
  [english, 'services.lifestyle.adoption.eligibility.check.age.label', 'Lifestyle adoption eligibility EN check label'],
  [english, 'services.lifestyle.adoption.eligibility.check.age.passed', 'Lifestyle adoption eligibility EN age passed'],
  [english, 'services.lifestyle.adoption.eligibility.status.qualified', 'Lifestyle adoption eligibility EN status'],
  [english, 'services.lifestyle.adoption.eligibility.notReadyMessage', 'Lifestyle adoption eligibility EN not-ready message'],
  [english, 'activities.adoption.eligibility.title', 'Lifestyle adoption eligibility EN UI title'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.eligibility.check.age.label', 'Lifestyle adoption eligibility PT check label'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.eligibility.check.age.passed', 'Lifestyle adoption eligibility PT age passed'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.eligibility.status.qualified', 'Lifestyle adoption eligibility PT status'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.adoption.eligibility.notReadyMessage', 'Lifestyle adoption eligibility PT not-ready message'],
  [translations.get('pt-BR') || new Map(), 'activities.adoption.eligibility.title', 'Lifestyle adoption eligibility PT UI title'],
];

const missingLifestyleAdoptionEligibilityRefs = phase5LifestyleAdoptionEligibilityRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleAdoptionEligibilityRefs.length > 0) {
  failures.push(`Lifestyle adoption eligibility localization refs are missing: ${missingLifestyleAdoptionEligibilityRefs.join(', ')}`);
}

const phase5LifestyleAdoptionUiHardcodedMarkers = [
  "['Trust', profile.stats.trust]",
  "['Health', profile.stats.health]",
  "['School', profile.stats.school]",
  "['Settle', profile.stats.adjustment]",
  ">Documentation<",
  "profile?.name || 'Selected Child'",
  "route?.label || 'Agency'",
  "homePrep?.label || 'Home prep'",
  "support?.label || 'Support'",
  ">Fees<",
  ">Result<",
  ">Connections<",
  "Submit the home study, agency documents, and transition support plan.",
  ">Adoption Complete<",
  "Welcome {pending.child.name}",
  "Choose how this child appears in your family.",
  ">Name<",
  "['Child', 'Son', 'Daughter', 'Heir']",
  ">Keep As Is<",
  ">Save Family<",
].filter((marker) => lifestyleActivitiesSource.includes(marker));

if (phase5LifestyleAdoptionUiHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle adoption card/paperwork/modal UI copy is still hard-coded: ${phase5LifestyleAdoptionUiHardcodedMarkers.join(', ')}`);
}

const phase5LifestyleAdoptionUiRefs = [
  [lifestyleActivitiesSource, "t(language, 'activities.adoptionProfile.stat.trust')", 'adoption profile trust label localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.adoptionPaperwork.title')", 'adoption paperwork title localized'],
  [lifestyleActivitiesSource, "t(language, 'activities.adoptionNameModal.title')", 'adoption name modal title localized'],
  [lifestyleActivitiesSource, 't(language, option.labelKey)', 'adoption family title options localized'],
  [english, 'activities.adoptionProfile.stat.trust', 'Lifestyle adoption profile EN stat'],
  [english, 'activities.adoptionPaperwork.description', 'Lifestyle adoption paperwork EN description'],
  [english, 'activities.adoptionNameModal.title', 'Lifestyle adoption modal EN title'],
  [english, 'activities.adoptionNameModal.familyTitle.Child', 'Lifestyle adoption modal EN family title'],
  [translations.get('pt-BR') || new Map(), 'activities.adoptionProfile.stat.trust', 'Lifestyle adoption profile PT stat'],
  [translations.get('pt-BR') || new Map(), 'activities.adoptionPaperwork.description', 'Lifestyle adoption paperwork PT description'],
  [translations.get('pt-BR') || new Map(), 'activities.adoptionNameModal.title', 'Lifestyle adoption modal PT title'],
  [translations.get('pt-BR') || new Map(), 'activities.adoptionNameModal.familyTitle.Child', 'Lifestyle adoption modal PT family title'],
];

const missingLifestyleAdoptionUiRefs = phase5LifestyleAdoptionUiRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleAdoptionUiRefs.length > 0) {
  failures.push(`Lifestyle adoption card/paperwork/modal localization refs are missing: ${missingLifestyleAdoptionUiRefs.join(', ')}`);
}

const phase5LifestylePetStoreCategoryHardcodedMarkers = [
  "name: 'Shelter & Rescue'",
  "description: 'Warm rescues, simple paperwork, lower cost, strongest emotional bond.'",
  "priceTone: 'Affordable'",
  "name: 'Sanctuary Circle'",
  "priceTone: 'Legacy'",
  "createChoice({ id: 'dogs', label: 'Dogs'",
  "createChoice({ id: 'sanctuary', label: 'Sanctuary'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestylePetStoreCategoryHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle pet store/category labels/descriptions are still hard-coded: ${phase5LifestylePetStoreCategoryHardcodedMarkers.join(', ')}`);
}

const phase5LifestylePetStoreCategoryRefs = [
  [lifestyleActivitiesServiceSource, 'const createPetStore = (store: PetCompanionStore): PetCompanionStore', 'pet store name keys'],
  [lifestyleActivitiesServiceSource, 'priceToneKey: `services.lifestyle.pet.store.${store.id}.priceTone`', 'pet store price tone keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'dogs'", 'pet category choice keys'],
  [lifestyleActivitiesSource, 'getPetStoreName(store, language)', 'pet store card localized name'],
  [lifestyleActivitiesSource, 'getChoiceLabel(selectedPetCategory, language)', 'pet selected category localized label'],
  [english, 'services.lifestyle.pet.store.shelter_rescue.name', 'Lifestyle pet store EN names'],
  [english, 'services.lifestyle.pet.store.shelter_rescue.description', 'Lifestyle pet store EN descriptions'],
  [english, 'services.lifestyle.pet.store.shelter_rescue.priceTone', 'Lifestyle pet store EN price tones'],
  [english, 'services.lifestyle.choice.COMPANION_CATEGORY.dogs.label', 'Lifestyle pet category EN keys'],
  [english, 'services.lifestyle.choice.COMPANION_CATEGORY.dogs.description', 'Lifestyle pet category EN descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.store.shelter_rescue.name', 'Lifestyle pet store PT names'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.store.shelter_rescue.description', 'Lifestyle pet store PT descriptions'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_CATEGORY.dogs.label', 'Lifestyle pet category PT keys'],
];

const missingLifestylePetStoreCategoryRefs = phase5LifestylePetStoreCategoryRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestylePetStoreCategoryRefs.length > 0) {
  failures.push(`Lifestyle pet store/category localization refs are missing: ${missingLifestylePetStoreCategoryRefs.join(', ')}`);
}

const phase5LifestylePetCheckoutHardcodedMarkers = [
  "createChoice({ id: 'basic_care', label: 'Basic Care'",
  "createChoice({ id: 'sanctuary_team', label: 'Sanctuary Team'",
  "createChoice({ id: 'standard_papers', label: 'Standard Papers'",
  "createChoice({ id: 'starter_home', label: 'Starter Home Kit'",
  "createChoice({ id: 'estate_wing', label: 'Estate Pet Wing'",
  "createChoice({ id: 'simple_accessories', label: 'Simple Accessories'",
  "createChoice({ id: 'gold_collar', label: 'Gold-Made Collar'",
  "createChoice({ id: 'no_custom', label: 'Clean Setup'",
  "createChoice({ id: 'bespoke_luxury', label: 'Bespoke Luxury'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestylePetCheckoutHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle pet checkout option labels/descriptions are still hard-coded: ${phase5LifestylePetCheckoutHardcodedMarkers.join(', ')}`);
}

const phase5LifestylePetCheckoutRefs = [
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'basic_care'", 'pet care choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'standard_papers'", 'pet permit choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'starter_home'", 'pet home choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'simple_accessories'", 'pet accessory choice keys'],
  [lifestyleActivitiesServiceSource, "createSharedChoice({ id: 'no_custom'", 'pet customization choice keys'],
  [lifestyleActivitiesSource, 'getChoiceLabel(home, language)', 'pet preview localized home label'],
  [lifestyleActivitiesSource, 'getChoiceLabel(accessory, language)', 'pet preview localized accessory label'],
  [lifestyleActivitiesSource, 'getChoiceLabel(care, language)', 'pet preview localized care label'],
  [english, 'services.lifestyle.choice.COMPANION_CARE.basic_care.label', 'Lifestyle pet care EN keys'],
  [english, 'services.lifestyle.choice.COMPANION_CARE.basic_care.description', 'Lifestyle pet care EN descriptions'],
  [english, 'services.lifestyle.choice.COMPANION_PERMIT.standard_papers.label', 'Lifestyle pet permit EN keys'],
  [english, 'services.lifestyle.choice.COMPANION_HOME.starter_home.label', 'Lifestyle pet home EN keys'],
  [english, 'services.lifestyle.choice.COMPANION_ACCESSORY.simple_accessories.label', 'Lifestyle pet accessory EN keys'],
  [english, 'services.lifestyle.choice.COMPANION_CUSTOMIZATION.no_custom.label', 'Lifestyle pet customization EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_CARE.basic_care.label', 'Lifestyle pet care PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_PERMIT.standard_papers.label', 'Lifestyle pet permit PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_HOME.starter_home.label', 'Lifestyle pet home PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_ACCESSORY.simple_accessories.label', 'Lifestyle pet accessory PT keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.choice.COMPANION_CUSTOMIZATION.no_custom.label', 'Lifestyle pet customization PT keys'],
];

const missingLifestylePetCheckoutRefs = phase5LifestylePetCheckoutRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestylePetCheckoutRefs.length > 0) {
  failures.push(`Lifestyle pet checkout localization refs are missing: ${missingLifestylePetCheckoutRefs.join(', ')}`);
}

const phase5LifestylePetProfileHardcodedMarkers = [
  "listingTitle: '2-Year Rescue Mix Dog'",
  "personality: 'Warm, goofy, loyal, and easy to bond with.'",
  "careNeeds: 'Daily walks, vaccines, simple grooming.'",
  "legalNote: 'Shelter adoption with standard paperwork.'",
  "listingTitle: 'Giant Panda Sanctuary Sponsorship'",
  "personality: 'Beautiful, calming, and expensive to maintain.'",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestylePetProfileHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle pet profile listing/personality/care/legal text is still hard-coded: ${phase5LifestylePetProfileHardcodedMarkers.join(', ')}`);
}

const phase5LifestylePetProfileRefs = [
  [lifestyleActivitiesServiceSource, 'const createPetProfile = (profile: PetCompanionProfileSeed): PetCompanionProfile', 'pet profile key helper'],
  [lifestyleActivitiesServiceSource, 'listingTitleKey: `services.lifestyle.pet.profile.${profile.id}.listingTitle`', 'pet profile listing key generation'],
  [lifestyleActivitiesServiceSource, "createPetProfile({\n        id: 'shelter_dog_mochi'", 'pet templates use profile key helper'],
  [lifestyleActivitiesSource, 'getPetProfileListingTitle(profile, language)', 'pet card localized listing title'],
  [lifestyleActivitiesSource, 'getPetProfilePersonality(profile, language)', 'pet card localized personality'],
  [lifestyleActivitiesSource, 'getPetProfileCareNeeds(profile, language)', 'pet preview localized care needs'],
  [lifestyleActivitiesSource, 'getPetProfileLegalNote(profile, language)', 'pet card localized legal note'],
  [english, 'services.lifestyle.pet.profile.shelter_dog_mochi.listingTitle', 'Lifestyle pet profile EN listing keys'],
  [english, 'services.lifestyle.pet.profile.shelter_dog_mochi.personality', 'Lifestyle pet profile EN personality keys'],
  [english, 'services.lifestyle.pet.profile.shelter_dog_mochi.careNeeds', 'Lifestyle pet profile EN care keys'],
  [english, 'services.lifestyle.pet.profile.shelter_dog_mochi.legalNote', 'Lifestyle pet profile EN legal keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.profile.shelter_dog_mochi.listingTitle', 'Lifestyle pet profile PT listing keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.profile.shelter_dog_mochi.personality', 'Lifestyle pet profile PT personality keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.profile.shelter_dog_mochi.careNeeds', 'Lifestyle pet profile PT care keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.profile.shelter_dog_mochi.legalNote', 'Lifestyle pet profile PT legal keys'],
];

const missingLifestylePetProfileRefs = phase5LifestylePetProfileRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestylePetProfileRefs.length > 0) {
  failures.push(`Lifestyle pet profile localization refs are missing: ${missingLifestylePetProfileRefs.join(', ')}`);
}

const phase5LifestylePetOutcomeHardcodedMarkers = [
  "sender: 'Companion Center'",
  "subject: `${profile.name} is now in Connections`",
  "text: `${profile.emoji} ${profile.name} came from ${store.name}",
  "effectSummary: `${profile.emoji} ${profile.name} added to Connections`",
  "memoryTitle: `Welcomed ${profile.name}`",
  "logMessage: `${profile.emoji} ${profile.name} joined Connections as your pet companion.`",
].filter((marker) => lifestyleActivitiesServiceSource.includes(marker));

if (phase5LifestylePetOutcomeHardcodedMarkers.length > 0) {
  failures.push(`Lifestyle pet generated outcome text is still hard-coded: ${phase5LifestylePetOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LifestylePetOutcomeRefs = [
  [lifestyleActivitiesServiceSource, 'const language = getPlayerLanguage(player);', 'pet outcome reads player language'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.pet.outcome.inbox.sender')", 'pet inbox sender localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.pet.outcome.memory.summary'", 'pet memory summary localized'],
  [lifestyleActivitiesServiceSource, "t(language, 'services.lifestyle.pet.outcome.news.endangered.headline'", 'pet news headline localized'],
  [english, 'services.lifestyle.pet.outcome.inbox.sender', 'Lifestyle pet outcome EN inbox sender'],
  [english, 'services.lifestyle.pet.outcome.inbox.subject', 'Lifestyle pet outcome EN inbox subject'],
  [english, 'services.lifestyle.pet.outcome.memory.summary', 'Lifestyle pet outcome EN memory summary'],
  [english, 'services.lifestyle.pet.outcome.news.endangered.headline', 'Lifestyle pet outcome EN news headline'],
  [english, 'services.lifestyle.pet.outcome.log', 'Lifestyle pet outcome EN log'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.outcome.inbox.sender', 'Lifestyle pet outcome PT inbox sender'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.outcome.inbox.subject', 'Lifestyle pet outcome PT inbox subject'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.outcome.memory.summary', 'Lifestyle pet outcome PT memory summary'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.outcome.news.endangered.headline', 'Lifestyle pet outcome PT news headline'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.pet.outcome.log', 'Lifestyle pet outcome PT log'],
];

const missingLifestylePetOutcomeRefs = phase5LifestylePetOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestylePetOutcomeRefs.length > 0) {
  failures.push(`Lifestyle pet generated outcome localization refs are missing: ${missingLifestylePetOutcomeRefs.join(', ')}`);
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
  [regulatorPressureSource, "const titleKey = type === 'RIVAL_COMPLAINT'", "logKey = 'life.event.regulator.log.cooperate'", 'regulator pressure'],
  [talentInstabilitySource, "const titleKey = type === 'KEY_STAFF_EXIT_RISK'", "logKey = 'life.event.talent.log.retention'", 'talent instability'],
  [rivalRetaliationSource, "const titleKey = type === 'RIVAL_COUNTER_BID'", "logKey = 'life.event.rival.log.quiet'", 'rival retaliation'],
  [worldReactionsSource, "titleKey: 'life.event.world.antitrust.title'", "logKey = 'life.event.world.log.antitrust.safe'", 'world reactions'],
  [shareholderVotingSource, "titleKey: 'life.event.shareholder.title'", "logKey: result.vote?.outcomeSummary ? undefined : 'life.event.shareholder.for.log'", 'shareholder voting'],
];

const missingStoryFactoryRefs = phase4StoryFactoryRefs
  .filter(([source, titleMarker, logMarker]) => !source.includes(titleMarker) || !source.includes(logMarker))
  .map(([, , , label]) => label);

if (missingStoryFactoryRefs.length > 0) {
  failures.push(`Story event factories are missing Phase 4 localization refs: ${missingStoryFactoryRefs.join(', ')}`);
}

const phase5RegulatorPressureRefs = [
  [regulatorPressureSource, 'title: t(language, titleKey)', 'regulator life event title localized at creation'],
  [regulatorPressureSource, "t(language, 'life.event.regulator.cooperate.label')", 'regulator option labels localized at creation'],
  [regulatorPressureSource, "t(language, 'services.regulatorPressure.news.review.headline'", 'regulator review news headline localization'],
  [regulatorPressureSource, "t(language, 'services.regulatorPressure.social.content'", 'regulator social post localization'],
  [regulatorPressureSource, "t(language, 'services.regulatorPressure.log.weekly'", 'regulator weekly log localization'],
  [regulatorPressureSource, 'services.regulatorPressure.status.${state.status}', 'regulator status localization'],
  [english, 'services.regulatorPressure.news.review.headline', 'regulator pressure EN review headline'],
  [english, 'services.regulatorPressure.social.content', 'regulator pressure EN social content'],
  [translations.get('pt-BR') || new Map(), 'services.regulatorPressure.news.review.headline', 'regulator pressure PT review headline'],
  [translations.get('pt-BR') || new Map(), 'services.regulatorPressure.social.content', 'regulator pressure PT social content'],
];

const phase5TalentInstabilityHardcodedMarkers = [
  "'s studio group faces talent retention pressure",
  "'s acquisitions put staff stability in focus",
  'average morale are becoming an industry story',
  'Staff inside',
  'talent stability is its own storyline',
  "category: 'Talent Instability'",
  'Talent Instability: ${state.departureRisk}% departure risk',
].filter((marker) => talentInstabilitySource.includes(marker));

if (phase5TalentInstabilityHardcodedMarkers.length > 0) {
  failures.push(`talent instability generated news/social/log copy is still hard-coded: ${phase5TalentInstabilityHardcodedMarkers.join(', ')}`);
}

const phase5TalentInstabilityRefs = [
  [talentInstabilitySource, "import { getPlayerLanguage, t } from './i18n'", 'talent instability i18n import'],
  [talentInstabilitySource, "const language = getPlayerLanguage(player)", 'talent instability player language helper'],
  [talentInstabilitySource, "headline: t(language, state.departureRisk >= 65", 'talent instability news headline localization'],
  [talentInstabilitySource, "subtext: t(language, 'services.talentInstability.news.subtext'", 'talent instability news subtext localization'],
  [talentInstabilitySource, "content: t(language, state.departureRisk >= 65", 'talent instability social content localization'],
  [talentInstabilitySource, 'title: t(language, titleKey)', 'talent instability scheduled event title localization'],
  [talentInstabilitySource, "description: t(language, 'life.event.talent.description'", 'talent instability scheduled event description localization'],
  [talentInstabilitySource, "category: t(language, 'life.event.talent.category')", 'talent instability category localization'],
  [talentInstabilitySource, "message: t(language, 'services.talentInstability.log.weekly'", 'talent instability weekly log localization'],
  [english, 'services.talentInstability.news.highHeadline', 'talent instability EN generated keys'],
  [translations.get('pt-BR') || new Map(), 'services.talentInstability.news.highHeadline', 'talent instability PT generated keys'],
];

const missingTalentInstabilityRefs = phase5TalentInstabilityRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingTalentInstabilityRefs.length > 0) {
  failures.push(`talent instability generated copy localization refs are missing: ${missingTalentInstabilityRefs.join(', ')}`);
}

const phase5SubsidiaryDecisionHardcodedMarkers = [
  'Emergency Capital Request',
  'wants permission to take a bigger creative swing',
  'Slate pressure',
  'Authorize Swing',
  'Board Decision:',
  'Studio Board Watch',
  'Storyline:',
  'storyline advanced',
  'Strategic slate partnership advance',
  'Emergency support was declined',
].filter((marker) => subsidiaryDecisionsSource.includes(marker));

if (phase5SubsidiaryDecisionHardcodedMarkers.length > 0) {
  failures.push(`subsidiary decision generated copy is still hard-coded: ${phase5SubsidiaryDecisionHardcodedMarkers.join(', ')}`);
}

const phase5SubsidiaryDecisionRefs = [
  [subsidiaryDecisionsSource, "import { getPlayerLanguage, t } from './i18n'", 'subsidiary decisions i18n import'],
  [subsidiaryDecisionsSource, 'getDecisionTitle = (type: SubsidiaryDecisionType, language: GameLanguage)', 'subsidiary decision title helper accepts language'],
  [subsidiaryDecisionsSource, "t(language, `services.subsidiaryDecisions.title.${type}`)", 'subsidiary decision title localization'],
  [subsidiaryDecisionsSource, "t(language, `services.subsidiaryDecisions.${type}.summary`", 'subsidiary decision summary localization'],
  [subsidiaryDecisionsSource, "createDecisionOption(language, type, 'APPROVE'", 'subsidiary approve option localization'],
  [subsidiaryDecisionsSource, "createDecisionMedia(language, {", 'subsidiary decision media language pass'],
  [subsidiaryDecisionsSource, "t(language, 'services.subsidiaryDecisions.media.news.headline'", 'subsidiary decision news localization'],
  [subsidiaryDecisionsSource, "getArcTitle(decision, optionId, language)", 'subsidiary arc title language pass'],
  [subsidiaryDecisionsSource, "t(language, 'services.subsidiaryDecisions.arc.news.headline'", 'subsidiary arc news localization'],
  [subsidiaryDecisionsSource, "t(language, 'services.subsidiaryDecisions.inbox.subject'", 'subsidiary inbox subject localization'],
  [subsidiaryDecisionsSource, "t(language, 'services.subsidiaryDecisions.log.submitted'", 'subsidiary submitted log localization'],
  [subsidiaryDecisionsSource, "t(language, 'services.subsidiaryDecisions.resolve.log.approved'", 'subsidiary resolution log localization'],
  [english, 'services.subsidiaryDecisions.title.RISKY_PRODUCTION', 'subsidiary decisions EN title key'],
  [translations.get('pt-BR') || new Map(), 'services.subsidiaryDecisions.title.RISKY_PRODUCTION', 'subsidiary decisions PT title key'],
];

const missingSubsidiaryDecisionRefs = phase5SubsidiaryDecisionRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingSubsidiaryDecisionRefs.length > 0) {
  failures.push(`subsidiary decision generated copy localization refs are missing: ${missingSubsidiaryDecisionRefs.join(', ')}`);
}

const phase5TalentTeamHardcodedMarkers = [
  'Ego Driven',
  'Needs a premium or a very convincing studio pitch.',
  'That number changes things. I accept',
  'I need at least a one-movie commitment.',
  'Works out of his garage. Eager but inexperienced.',
  'Stops 50% Body decay',
  'They turn actors into global brands.',
  'Strong Health recovery + crisis shield',
].filter((marker) => talentServiceSource.includes(marker) || teamLogicSource.includes(marker));

if (phase5TalentTeamHardcodedMarkers.length > 0) {
  failures.push(`talent/team generated and catalog copy is still hard-coded: ${phase5TalentTeamHardcodedMarkers.join(', ')}`);
}

const phase5TalentTeamRefs = [
  [talentServiceSource, "import { GameLanguage, NPCActor", 'talent service language type import'],
  [talentServiceSource, "import { t } from './i18n'", 'talent service i18n import'],
  [talentServiceSource, "getTalentNegotiationProfile = (npc: NPCActor, language: GameLanguage = 'en')", 'talent profile helper accepts language'],
  [talentServiceSource, "label: t(language, 'services.talentService.profile.EGO.label')", 'talent profile label localization'],
  [talentServiceSource, "t(language, `services.talentService.negotiation.${messageKey}`", 'talent negotiation message localization'],
  [talentServiceSource, "message: t(language, 'services.talentService.validation.tooManyMovies')", 'talent validation localization'],
  [teamLogicSource, "descriptionKey: 'services.teamLogic.agent.agent_rookie_1.description'", 'agent catalog description key'],
  [teamLogicSource, "perksKey: 'services.teamLogic.member.train_rookie.perks'", 'team member perk key'],
  [teamLogicSource, "descriptionKey: 'services.teamLogic.manager.mgr_rookie_1.description'", 'manager catalog description key'],
  [typesSource, 'descriptionKey?: string;', 'team/talent description key type'],
  [typesSource, 'perksKey?: string;', 'team member perk key type'],
  [english, 'services.talentService.profile.EGO.label', 'talent service EN profile keys'],
  [english, 'services.teamLogic.agent.agent_rookie_1.description', 'team logic EN catalog keys'],
  [translations.get('pt-BR') || new Map(), 'services.talentService.profile.EGO.label', 'talent service PT profile keys'],
  [translations.get('pt-BR') || new Map(), 'services.teamLogic.agent.agent_rookie_1.description', 'team logic PT catalog keys'],
];

const missingTalentTeamRefs = phase5TalentTeamRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingTalentTeamRefs.length > 0) {
  failures.push(`talent/team localization refs are missing: ${missingTalentTeamRefs.join(', ')}`);
}

const missingRegulatorPressureRefs = phase5RegulatorPressureRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingRegulatorPressureRefs.length > 0) {
  failures.push(`regulator pressure generated copy localization refs are missing: ${missingRegulatorPressureRefs.join(', ')}`);
}

const phase4OutcomeRefs = [
  [youtubeEventLogicSource, "logKey: 'life.event.youtube.log.copyright.accept'", 'YouTube outcome logs'],
  [youtubeEventLogicSource, "labelKey: 'life.effect.legalCase'", 'YouTube impact labels'],
  [gameLoopSource, "titleKey: 'life.event.audit.government.title'", 'government audit event'],
  [gameLoopSource, "logKey: 'life.event.audit.government.pay.log'", 'government audit outcomes'],
  [gameLoopSource, "title: t(language, 'life.event.audit.government.title')", 'government audit title localized at creation'],
  [gameLoopSource, "description: t(language, 'life.event.audit.government.description')", 'government audit description localized at creation'],
  [gameLoopSource, "label: t(language, 'life.event.audit.government.pay.label'", 'government audit pay label localized at creation'],
  [gameLoopSource, "log: t(getPlayerLanguage(p), 'life.event.audit.government.pay.log')", 'government audit pay log localized at resolution'],
  [gameLoopSource, "t(language, 'services.gameLoop.audit.government.urgentLog')", 'government audit urgent log localized'],
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

const phase4ProductionEventsGeneratedHardcodedMarkers = [
  'content: `LMAO did anyone else see the camera guy in the new ${project.name} trailer?',
].filter((marker) => productionEventsSource.includes(marker));

if (phase4ProductionEventsGeneratedHardcodedMarkers.length > 0) {
  failures.push(`Production event generated social copy is still hard-coded: ${phase4ProductionEventsGeneratedHardcodedMarkers.join(', ')}`);
}

const phase4ProductionEventsGeneratedRefs = [
  [productionEventsSource, "t(getPlayerLanguage(p), 'production.event.camera.leave.socialPost'", 'camera event social post localized'],
  [english, 'production.event.camera.leave.socialPost', 'Production event EN camera social post'],
  [translations.get('pt-BR') || new Map(), 'production.event.camera.leave.socialPost', 'Production event PT camera social post'],
];

const missingProductionEventsGeneratedRefs = phase4ProductionEventsGeneratedRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingProductionEventsGeneratedRefs.length > 0) {
  failures.push(`Production event generated localization refs are missing: ${missingProductionEventsGeneratedRefs.join(', ')}`);
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

const phase5StudioAcquisitionMediaHardcodedMarkers = [
  "'s advisors begin diligence on",
  'Bankers and entertainment lawyers are reviewing',
  'Deal desks are hearing',
  'makes an opening approach for',
  'is now on the table',
  'Forbes watchers are refreshing',
  "'s board accepts",
  'now moves to closing documents',
  'did not slam the door',
  'enters the fight for',
  'limited bidding war',
  'accepts ${studioName}',
  'revises the bid for',
  'raises the bid to stay',
  'walks away from',
  'completes the acquisition of',
  'transfers catalog, facilities, staff',
].filter((marker) => studioAcquisitionSource.includes(marker));

if (phase5StudioAcquisitionMediaHardcodedMarkers.length > 0) {
  failures.push(`studio acquisition media pulse copy is still hard-coded: ${phase5StudioAcquisitionMediaHardcodedMarkers.join(', ')}`);
}

const phase5StudioAcquisitionMediaRefs = [
  [studioAcquisitionSource, "getPlayerLanguage(player)", 'studio acquisition player language helper'],
  [studioAcquisitionSource, "t(language, `services.studioAcquisition.media.${moment}.headline`", 'studio acquisition media headline localization'],
  [studioAcquisitionSource, "t(language, `services.studioAcquisition.media.${moment}.subtext`", 'studio acquisition media subtext localization'],
  [studioAcquisitionSource, "t(language, `services.studioAcquisition.media.${moment}.social`", 'studio acquisition media social localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.media.playerFallback')", 'studio acquisition player fallback localization'],
  [studioAcquisitionSource, "getAcquisitionMediaPrice(language, moment, amount)", 'studio acquisition media price fallback localization'],
];

const missingStudioAcquisitionMediaRefs = phase5StudioAcquisitionMediaRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingStudioAcquisitionMediaRefs.length > 0) {
  failures.push(`studio acquisition media pulse localization refs are missing: ${missingStudioAcquisitionMediaRefs.join(', ')}`);
}

const phase5StudioAcquisitionInboxHardcodedMarkers = [
  'accepted your ${round === 1',
  'entered the room at $',
  'ended the bidding round after rival pressure',
  'is willing to continue, but the board wants stronger terms',
  'rejected the proposal as too far below',
  'Offer Accepted:',
  'Counteroffer:',
  'Bidding War:',
  'Offer Rejected:',
  "sender: 'Business Affairs'",
  'Studio acquisition response:',
  "You accepted ${acquisitionCase.studioName}'s counteroffer",
  'Terms Agreed:',
  'Deal Signed:',
  'is now part of your owned studio group',
  'Deal signed:',
  'Control Transfer Complete:',
  'moved into your owned studio group',
  'Control transfer completed:',
].filter((marker) => studioAcquisitionSource.includes(marker));

if (phase5StudioAcquisitionInboxHardcodedMarkers.length > 0) {
  failures.push(`studio acquisition inbox/log copy is still hard-coded: ${phase5StudioAcquisitionInboxHardcodedMarkers.join(', ')}`);
}

const phase5StudioAcquisitionInboxRefs = [
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.sender')", 'studio acquisition inbox sender localization'],
  [studioAcquisitionSource, "t(language, `services.studioAcquisition.inbox.subject.${sellerResponse.decision}`", 'studio acquisition seller response subject localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.seller.summary.accepted'", 'studio acquisition accepted summary localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.seller.summary.rivalBid'", 'studio acquisition rival bid summary localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.seller.summary.countered'", 'studio acquisition counter summary localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.seller.summary.rejectedLow'", 'studio acquisition rejected summary localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.log.response'", 'studio acquisition response log localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.seller.summary.counterAccepted'", 'studio acquisition counter accepted summary localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.subject.COUNTER_ACCEPTED'", 'studio acquisition counter accepted subject localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.subject.ACQUIRED'", 'studio acquisition deal signed subject localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.text.acquired'", 'studio acquisition deal signed text localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.log.acquired'", 'studio acquisition deal signed log localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.subject.STOCK_CONTROL_ACQUIRED'", 'studio acquisition stock control subject localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.inbox.text.stockControlAcquired'", 'studio acquisition stock control text localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.log.stockControlAcquired'", 'studio acquisition stock control log localization'],
];

const missingStudioAcquisitionInboxRefs = phase5StudioAcquisitionInboxRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingStudioAcquisitionInboxRefs.length > 0) {
  failures.push(`studio acquisition inbox/log localization refs are missing: ${missingStudioAcquisitionInboxRefs.join(', ')}`);
}

const phase5StudioAcquisitionFundingHardcodedMarkers = [
  'Personal Wealth',
  'Personally funded · no business compliance exposure',
  'Insufficient personal wealth',
  'Business investment · may receive favorable tax treatment',
  'Insufficient production studio capital',
].filter((marker) => studioAcquisitionSource.includes(marker));

if (phase5StudioAcquisitionFundingHardcodedMarkers.length > 0) {
  failures.push(`studio acquisition funding option copy is still hard-coded: ${phase5StudioAcquisitionFundingHardcodedMarkers.join(', ')}`);
}

const phase5StudioAcquisitionFundingRefs = [
  [studioAcquisitionSource, "language = 'en'", 'studio acquisition funding language argument'],
  [studioAcquisitionSource, "label: t(language, 'services.studioAcquisition.funding.personal.label')", 'personal funding label localization'],
  [studioAcquisitionSource, "taxTreatment: t(language, 'services.studioAcquisition.funding.personal.taxTreatment')", 'personal funding tax localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.funding.personal.unavailable')", 'personal funding unavailable localization'],
  [studioAcquisitionSource, "label: t(language, 'services.studioAcquisition.funding.studio.label', { studio: business.name })", 'studio funding label localization'],
  [studioAcquisitionSource, "taxTreatment: t(language, 'services.studioAcquisition.funding.studio.taxTreatment')", 'studio funding tax localization'],
  [studioAcquisitionSource, "t(language, 'services.studioAcquisition.funding.studio.unavailable')", 'studio funding unavailable localization'],
  [english, 'services.studioAcquisition.funding.personal.label', 'studio acquisition funding EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.studioAcquisition.funding.personal.label', 'studio acquisition funding PT keys'],
];

const missingStudioAcquisitionFundingRefs = phase5StudioAcquisitionFundingRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingStudioAcquisitionFundingRefs.length > 0) {
  failures.push(`studio acquisition funding localization refs are missing: ${missingStudioAcquisitionFundingRefs.join(', ')}`);
}

const phase5StockStudioControlHardcodedMarkers = [
  [stockTakeoverSource, 'Majority Control:', 'stock control event title'],
  [stockTakeoverSource, 'Open Acquisition Desk', 'stock control primary action'],
  [stockTakeoverSource, 'Public-market control transfer', 'stock control route label'],
  [stockTakeoverSource, 'Control Transfer ready', 'stock control next unlock label'],
  [studioAcquisitionSource, 'Preserve Studio Name', 'acquisition commitment label'],
  [studioAcquisitionSource, 'Name Protected', 'acquisition commitment short label'],
  [studioAcquisitionSource, 'Protect Employees', 'acquisition employee commitment'],
  [studioGroupSource, 'Independent Label', 'operating model label'],
  [studioGroupSource, 'Board oversight', 'operating model control copy'],
  [studioGroupSource, 'Movie First', 'studio mandate focus label'],
  [studioGroupSource, 'Careful Pace', 'studio mandate release pace label'],
].filter(([source, marker]) => source.includes(marker));

if (phase5StockStudioControlHardcodedMarkers.length > 0) {
  failures.push(`stock/studio control option copy is still hard-coded: ${phase5StockStudioControlHardcodedMarkers.map(([, marker, label]) => `${label}: ${marker}`).join(', ')}`);
}

const phase5StockStudioControlRefs = [
  [stockTakeoverSource, "t(language, 'services.stockTakeover.controlEvent.title'", 'stock control event title localization'],
  [stockTakeoverSource, "t(language, 'services.stockTakeover.controlEvent.primaryAction')", 'stock control primary action localization'],
  [stocksAppSource, "getStockTakeoverSnapshot(player, selectedStock, language)", 'Stocks app passes language to stock takeover snapshot'],
  [studioAcquisitionSource, 'getAcquisitionCommitments = (language', 'acquisition commitment localized getter'],
  [studioAcquisitionSource, "t(language, `services.studioAcquisition.commitment.${template.id}.label`)", 'acquisition commitment label localization'],
  [studioGroupSource, 'getOperatingModels = (language', 'operating model localized getter'],
  [studioGroupSource, "t(language, `services.studioGroup.operatingModel.${template.id}.label`)", 'operating model label localization'],
  [studioGroupSource, 'getMandateFocusOptions = (language', 'mandate focus localized getter'],
  [studioGroupSource, 'getMandateReleasePaceOptions = (language', 'mandate release pace localized getter'],
  [studioGroupSource, 'getMandateIpOptions = (language', 'mandate IP localized getter'],
  [studioGroupSource, 'getMandateTalentOptions = (language', 'mandate talent localized getter'],
  [studioGroupSource, 'getMandateObjectiveOptions = (language', 'mandate objective localized getter'],
  [studioGroupSource, 'getMandateCreativeAppetiteOptions = (language', 'mandate creative appetite localized getter'],
  [studioGroupSource, 'getMandateAutoProductionOptions = (language', 'mandate auto production localized getter'],
  [studioGroupSource, 'getStudioMandateGroups = (language', 'studio mandate groups localized getter'],
  [studioGroupSource, "t(language, `services.studioGroup.mandateGroup.${key}.label`)", 'studio mandate group label localization'],
  [studioGroupSource, "t(language, `services.studioGroup.controlProfile.${copyKey}.controlCopy`)", 'studio control profile copy localization'],
  [studioGroupSource, 'getMandateOptionLabel = (', 'mandate option label helper keeps language argument'],
  [english, 'services.stockTakeover.controlEvent.title', 'stock control event EN title'],
  [english, 'services.studioAcquisition.commitment.PRESERVE_STUDIO_NAME.label', 'acquisition commitment EN label'],
  [english, 'services.studioGroup.operatingModel.INDEPENDENT_LABEL.label', 'operating model EN label'],
  [english, 'services.studioGroup.mandate.focus.MOVIES_FIRST.label', 'studio mandate focus EN label'],
  [english, 'services.studioGroup.mandate.ipStrategy.ORIGINALS.label', 'studio mandate IP EN label'],
  [english, 'services.studioGroup.mandateGroup.focus.label', 'studio mandate group EN label'],
  [english, 'services.studioGroup.controlProfile.INDEPENDENT_LABEL.controlCopy', 'studio control profile EN label'],
  [translations.get('pt-BR') || new Map(), 'services.stockTakeover.controlEvent.title', 'stock control event PT title'],
  [translations.get('pt-BR') || new Map(), 'services.studioAcquisition.commitment.PRESERVE_STUDIO_NAME.label', 'acquisition commitment PT label'],
  [translations.get('pt-BR') || new Map(), 'services.studioGroup.operatingModel.INDEPENDENT_LABEL.label', 'operating model PT label'],
  [translations.get('pt-BR') || new Map(), 'services.studioGroup.mandate.focus.MOVIES_FIRST.label', 'studio mandate focus PT label'],
  [translations.get('pt-BR') || new Map(), 'services.studioGroup.mandate.ipStrategy.ORIGINALS.label', 'studio mandate IP PT label'],
  [translations.get('pt-BR') || new Map(), 'services.studioGroup.mandateGroup.focus.label', 'studio mandate group PT label'],
  [translations.get('pt-BR') || new Map(), 'services.studioGroup.controlProfile.INDEPENDENT_LABEL.controlCopy', 'studio control profile PT label'],
];

const missingStockStudioControlRefs = phase5StockStudioControlRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingStockStudioControlRefs.length > 0) {
  failures.push(`stock/studio control localization refs are missing: ${missingStockStudioControlRefs.join(', ')}`);
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

const phase5AwardLoreHardcodedMarkers = [
  'The British Academy Film Awards. Often seen as a key predictor',
  'Accolades bestowed by the Hollywood Foreign Press Association',
  'The premier award for the television industry',
  'A win here immortalizes you in film history',
  "shortName: 'The BAFTAs'",
  "shortName: 'Golden Globes'",
  "shortName: 'The Emmys'",
  "shortName: 'Academy Awards'",
].filter((marker) => awardLogicSource.includes(marker));

if (phase5AwardLoreHardcodedMarkers.length > 0) {
  failures.push(`award show lore copy is still hard-coded: ${phase5AwardLoreHardcodedMarkers.join(', ')}`);
}

const phase5AwardLoreRefs = [
  [awardLogicSource, 'getAwardShowLore = (language: GameLanguage, awardType: AwardType)', 'localized award show lore helper'],
  [awardLogicSource, "t(language, `imdb.awards.show.${awardType}.description`)", 'award show description localization'],
  [awardLogicSource, "t(language, `imdb.awards.show.${awardType}.shortName`)", 'award show short name localization'],
  [imdbAppSource, 'getAwardShowLore(language, selectedShow.type as AwardType)', 'IMDb award detail localized lore'],
];

const missingAwardLoreRefs = phase5AwardLoreRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingAwardLoreRefs.length > 0) {
  failures.push(`award show lore localization refs are missing: ${missingAwardLoreRefs.join(', ')}`);
}

const phase5ImdbAwardsHardcodedMarkers = [
  'Back to Awards',
  'Current Season',
  'Nominations Announced',
  'Ceremony Pending',
  'Upcoming (Wk',
  'My Awards',
  'View All',
  'Career Achievements',
  'No awards yet. Keep working!',
  'Winners archived.',
  'Nominations pending...',
  'You were nominated',
  'Music Wins',
  'Music Legacy',
  'Edition',
].filter((marker) => imdbAppSource.includes(marker));

if (phase5ImdbAwardsHardcodedMarkers.length > 0) {
  failures.push(`IMDb awards UI copy is still hard-coded: ${phase5ImdbAwardsHardcodedMarkers.join(', ')}`);
}

const phase5ImdbAwardsRefs = [
  [imdbAppSource, "import { getPlayerLanguage, t } from '../../services/i18n'", 'IMDb app i18n import'],
  [imdbAppSource, 'getAwardShowName(selectedShow.type)', 'IMDb award show name localization'],
  [imdbAppSource, 'getAwardCategoryLabel(cat)', 'IMDb award category localization'],
  [imdbAppSource, "tr('imdb.awards.currentSeason')", 'IMDb current season localization'],
  [imdbAppSource, "tr('imdb.awards.status.pending')", 'IMDb ceremony pending localization'],
  [imdbAppSource, "tr('imdb.awards.myAwards')", 'IMDb my awards localization'],
  [imdbAppSource, "tr('imdb.awards.empty')", 'IMDb empty awards localization'],
  [imdbAppSource, "tr('imdb.awards.result.winner')", 'IMDb winner localization'],
  [imdbAppSource, 'getAwardShowName(showType as AwardType)', 'IMDb award history show localization'],
  [imdbAppSource, 'getAwardCategoryLabel(award.category)', 'IMDb award history category localization'],
];

const missingImdbAwardsRefs = phase5ImdbAwardsRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingImdbAwardsRefs.length > 0) {
  failures.push(`IMDb awards localization refs are missing: ${missingImdbAwardsRefs.join(', ')}`);
}

const phase5ImdbFranchiseHardcodedMarkers = [
  'Cinematic Universes',
  'Active Heroes',
  'View Dossier',
  'All Franchises',
  'Avg IMDb',
  'Fan Score',
  'Fan Favorite',
  'Canon Timeline',
  'No canon timeline recorded.',
  'Character Dossiers',
  'Played by',
  'Not introduced yet',
  'No release yet',
  'Recent Releases',
  'No recent releases recorded.',
  'No License',
  'Filming',
].filter((marker) => imdbAppSource.includes(marker));

if (phase5ImdbFranchiseHardcodedMarkers.length > 0) {
  failures.push(`IMDb franchise UI copy is still hard-coded: ${phase5ImdbFranchiseHardcodedMarkers.join(', ')}`);
}

const phase5ImdbFranchiseRefs = [
  [imdbAppSource, "tr('imdb.franchise.title')", 'IMDb franchise title localization'],
  [imdbAppSource, "tr('imdb.franchise.activeHeroes'", 'IMDb active heroes localization'],
  [imdbAppSource, "tr('imdb.franchise.viewDossier')", 'IMDb dossier CTA localization'],
  [imdbAppSource, "tr('imdb.franchise.allFranchises')", 'IMDb back to franchises localization'],
  [imdbAppSource, "tr('imdb.franchise.metric.totalGross')", 'IMDb franchise metrics localization'],
  [imdbAppSource, "tr('imdb.franchise.fanScore')", 'IMDb fan score localization'],
  [imdbAppSource, "tr('imdb.franchise.canonTimeline')", 'IMDb canon timeline localization'],
  [imdbAppSource, "tr('imdb.franchise.characterDossiers')", 'IMDb character dossiers localization'],
  [imdbAppSource, "tr('imdb.franchise.playedBy'", 'IMDb played by localization'],
  [imdbAppSource, "tr('imdb.franchise.recentReleases')", 'IMDb recent releases localization'],
];

const missingImdbFranchiseRefs = phase5ImdbFranchiseRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingImdbFranchiseRefs.length > 0) {
  failures.push(`IMDb franchise localization refs are missing: ${missingImdbFranchiseRefs.join(', ')}`);
}

const phase5ImdbProjectHardcodedMarkers = [
  'TV Series',
  'Soundtrack Desk',
  'Investor Funding',
  'Owners:',
  'Studio Keeps',
  'Investor Cut',
  'Franchise Status',
  'Season Outcome',
  'Sequel Outcome',
  'Top Cast',
  'Box Office & Tech Specs',
  'Gross Worldwide',
  'Streaming Views',
  'Campaign Reality',
  'Audience Read',
  'Forecast Shift',
  'Critic Reviews',
  'Actor | Producer',
  'Known for',
  'Critic Score',
  'No credits found.',
  'Profile',
].filter((marker) => imdbAppSource.includes(marker));

if (phase5ImdbProjectHardcodedMarkers.length > 0) {
  failures.push(`IMDb project/profile UI copy is still hard-coded: ${phase5ImdbProjectHardcodedMarkers.join(', ')}`);
}

const phase5ImdbProjectRefs = [
  [imdbAppSource, 'imdb.project.mediaType.series', 'IMDb project media type localization'],
  [imdbAppSource, "tr('imdb.project.ratingTbd')", 'IMDb project TBD rating localization'],
  [imdbAppSource, "tr('imdb.project.soundtrackDesk')", 'IMDb soundtrack desk localization'],
  [imdbAppSource, "tr('imdb.project.investorFunding')", 'IMDb investor funding localization'],
  [imdbAppSource, "tr('imdb.project.franchiseStatus')", 'IMDb franchise status localization'],
  [imdbAppSource, "tr('imdb.project.topCast')", 'IMDb top cast localization'],
  [imdbAppSource, "tr('imdb.project.techSpecs')", 'IMDb tech specs localization'],
  [imdbAppSource, "tr('imdb.project.campaignReality')", 'IMDb campaign reality localization'],
  [imdbAppSource, "tr('imdb.project.criticReviews')", 'IMDb critic reviews localization'],
  [imdbAppSource, "tr('imdb.profile.actorProducer')", 'IMDb profile role localization'],
  [imdbAppSource, "tr('imdb.profile.filmography')", 'IMDb filmography localization'],
  [imdbAppSource, "tr('imdb.tabs.profile')", 'IMDb tab localization'],
];

const missingImdbProjectRefs = phase5ImdbProjectRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingImdbProjectRefs.length > 0) {
  failures.push(`IMDb project/profile localization refs are missing: ${missingImdbProjectRefs.join(', ')}`);
}

const phase5PremiumHardcodedMarkers = [
  'No Ads',
  'Starter Funding Pack',
  'Luxury Homes Collection',
  'Removes forced ads, including the periodic ad and the post-greenlight ad.',
  'Unlock a fuller celebrity property empire',
  'Unknown purchase.',
  'is already unlocked.',
  'Ads removed permanently.',
  'bonus energy added.',
  'cash added.',
  'unlocked permanently.',
  'All premium collections unlocked permanently.',
].filter((marker) => premiumLogicSource.includes(marker));

if (phase5PremiumHardcodedMarkers.length > 0) {
  failures.push(`premium product/gate/result copy is still hard-coded: ${phase5PremiumHardcodedMarkers.join(', ')}`);
}

const phase5StorePremiumHardcodedMarkers = [
  'Ad-Free',
  'Energy Boosts',
  'Cash Boosts',
  'Developer preview of the iOS purchase catalog.',
  'Restore Purchases',
  'Confirm Purchase',
  'Your reward will only be granted after iOS confirms the purchase.',
].filter((marker) => storePageSource.includes(marker));

if (phase5StorePremiumHardcodedMarkers.length > 0) {
  failures.push(`premium store UI copy is still hard-coded: ${phase5StorePremiumHardcodedMarkers.join(', ')}`);
}

const phase5PremiumRefs = [
  [premiumLogicSource, "import { GameLanguage, Player } from '../types'", 'premium logic language import'],
  [premiumLogicSource, "import { t } from './i18n'", 'premium logic t import'],
  [premiumLogicSource, "getLocalizedPremiumProduct = (productId: PremiumProductId, language: GameLanguage = 'en')", 'localized premium product helper'],
  [premiumLogicSource, "getLocalizedPremiumProducts = (language: GameLanguage = 'en')", 'localized premium product list helper'],
  [premiumLogicSource, "getPremiumCollectionGateForAsset = (assetId: string, language: GameLanguage = 'en')", 'localized premium gate helper'],
  [premiumLogicSource, "applyPremiumPurchase = (player: Player, productId: PremiumProductId, language: GameLanguage = 'en')", 'localized premium purchase result helper'],
  [storePageSource, "getLocalizedPremiumProducts(language)", 'store uses localized premium products'],
  [storePageSource, "tr('store.premium.section.adFree')", 'store premium sections localized'],
  [lifestyleAssetsSource, "getPremiumCollectionGateForAsset(pendingPremiumAssetId, language)", 'lifestyle premium gate localized'],
  [appSource, "applyPremiumPurchase(p, productId, getPlayerLanguage(p))", 'purchase handler passes player language'],
];

const missingPremiumRefs = phase5PremiumRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingPremiumRefs.length > 0) {
  failures.push(`premium localization refs are missing: ${missingPremiumRefs.join(', ')}`);
}

const phase5YoutubeOfferHardcodedMarkers = [
  'wants a ${requiredType.replace',
  'because your creator image reads as',
  'wants you featured in the',
  'It is more career visibility than a normal ad',
].filter((marker) => youtubeLogicSource.includes(marker));

if (phase5YoutubeOfferHardcodedMarkers.length > 0) {
  failures.push(`YouTube offer descriptions are still hard-coded: ${phase5YoutubeOfferHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeAppOutcomeHardcodedMarkers = [
  'Breakout Collab',
  'Awkward Collab',
  'Clean Integration',
  'Sponsor Backlash',
  'Creator identity can change again in',
  'Memberships unlock at 10K subscribers after monetization.',
  'Livestream donations unlock after YouTube monetization and 1K subscribers.',
  'Merch drops need a 6 week cooldown.',
  'Audience trust must be',
  'Could not save that thumbnail. Try another image.',
  'Payout: $',
].filter((marker) => youtubeAppSource.includes(marker));

if (phase5YoutubeAppOutcomeHardcodedMarkers.length > 0) {
  failures.push(`YouTube app outcome/alert copy is still hard-coded: ${phase5YoutubeAppOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeInboxHardcodedMarkers = [
  'YouTube Collab:',
  'wants to collaborate on your channel.',
  'wants to shoot with you.',
  'Creator Team',
  'YouTube Deal:',
  'sent a creator integration offer for your channel.',
  'sent a creator integration offer.',
  'Music Video Feature:',
  'wants you featured in their new music video.',
  'Music Video:',
  'Missed Collab:',
  'moved on from',
  'Missed YouTube Deal',
  'You missed the',
  'YouTube integration window.',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeInboxHardcodedMarkers.length > 0) {
  failures.push(`YouTube generated inbox/log copy is still hard-coded: ${phase5YoutubeInboxHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeAppOutcomeRefs = [
  [youtubeAppSource, "tr('youtube.outcome.collab.breakout.label')", 'YouTube collab breakout label localization'],
  [youtubeAppSource, "tr('youtube.outcome.brand.clean.label')", 'YouTube brand clean label localization'],
  [youtubeAppSource, "tr('youtube.alert.membershipsLocked')", 'YouTube memberships alert localization'],
  [youtubeAppSource, "tr('youtube.log.collabOutcome'", 'YouTube collab outcome log localization'],
  [youtubeAppSource, "tr('youtube.log.brandOutcome'", 'YouTube brand outcome log localization'],
  [english, 'youtube.outcome.collab.breakout.label', 'YouTube outcome EN keys'],
  [translations.get('pt-BR') || new Map(), 'youtube.outcome.collab.breakout.label', 'YouTube outcome PT keys'],
  [english, 'youtube.alert.membershipsLocked', 'YouTube alert EN keys'],
  [translations.get('pt-BR') || new Map(), 'youtube.alert.membershipsLocked', 'YouTube alert PT keys'],
];

const missingYoutubeAppOutcomeRefs = phase5YoutubeAppOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeAppOutcomeRefs.length > 0) {
  failures.push(`YouTube app outcome/alert localization refs are missing: ${missingYoutubeAppOutcomeRefs.join(', ')}`);
}

const phase5YoutubeOfferRefs = [
  [youtubeLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'YouTube logic i18n import'],
  [youtubeLogicSource, "generateYoutubeCollabOffer = (player: Player, language = getPlayerLanguage(player))", 'localized YouTube collab offer signature'],
  [youtubeLogicSource, "t(language, 'services.youtube.offer.collab.description'", 'YouTube collab description localization'],
  [youtubeLogicSource, "t(language, 'services.youtube.offer.brand.description'", 'YouTube brand description localization'],
  [youtubeLogicSource, "t(language, 'services.youtube.offer.musicFeature.description'", 'YouTube music feature description localization'],
  [gameLoopSource, "generateYoutubeCollabOffer(nextPlayer, language)", 'weekly collab offer passes language'],
  [gameLoopSource, "t(language, 'services.youtube.inbox.collab.subject'", 'YouTube collab subject localization'],
  [gameLoopSource, "t(language, 'services.youtube.inbox.brand.sender'", 'YouTube brand sender localization'],
  [gameLoopSource, "t(language, 'services.youtube.log.musicFeatureOffer'", 'YouTube music feature log localization'],
  [gameLoopSource, "t(language, 'services.youtube.log.missedBrand'", 'YouTube missed brand log localization'],
];

const missingYoutubeOfferRefs = phase5YoutubeOfferRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeOfferRefs.length > 0) {
  failures.push(`YouTube offer localization refs are missing: ${missingYoutubeOfferRefs.join(', ')}`);
}

const phase5NpcVentureHardcodedMarkers = [
  'launches {Venture}, a new {Archetype}',
  'begins with roughly $',
  'is packaging {Title}',
  'scores a breakout hit with {Title}',
  'takes a costly hit after {Title}',
  'shuts down after a difficult run of projects',
  'We are putting together a focused package',
  'Project: ${opportunity.projectName}',
  'Starring ${project.leadActorName}',
  'cash reserves.',
  'is still building its slate.',
  'closed after ${venture.projectsReleased} releases.',
  'sent you a role offer.',
].filter((marker) => npcVentureSource.includes(marker) || gameLoopSource.includes(marker));

if (phase5NpcVentureHardcodedMarkers.length > 0) {
  failures.push(`NPC venture generated news/offer copy is still hard-coded: ${phase5NpcVentureHardcodedMarkers.join(', ')}`);
}

const phase5NpcVentureRefs = [
  [npcVentureSource, "import { getPlayerLanguage, t } from './i18n'", 'NPC venture i18n import'],
  [npcVentureSource, "pickVentureVariant(language, 'services.npcVenture.launch.headline'", 'NPC venture launch headline localization'],
  [npcVentureSource, "t(language, 'services.npcVenture.launch.subtext'", 'NPC venture launch subtext localization'],
  [npcVentureSource, "pickVentureVariant(language, 'services.npcVenture.hit.headline'", 'NPC venture hit headline localization'],
  [npcVentureSource, "t(language, 'services.npcVenture.hit.subtext'", 'NPC venture hit subtext localization'],
  [npcVentureSource, "t(language, 'services.npcVenture.offer.text'", 'NPC venture offer text localization'],
  [gameLoopSource, "getNpcVentureOfferText(ventureOffer.venture, ventureOffer.opportunity, language)", 'weekly NPC venture offer passes language'],
  [gameLoopSource, "t(language, 'services.npcVenture.inbox.sender'", 'NPC venture inbox sender localization'],
  [gameLoopSource, "t(language, 'services.npcVenture.log.offer'", 'NPC venture offer log localization'],
];

const missingNpcVentureRefs = phase5NpcVentureRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingNpcVentureRefs.length > 0) {
  failures.push(`NPC venture localization refs are missing: ${missingNpcVentureRefs.join(', ')}`);
}

const phase5WorldRuntimeHardcodedMarkers = [
  'Sundance Film Festival',
  'New Year Weekend',
  'releases this week.',
  'Global Smash:',
  'Box Office Disaster:',
  'Masterpiece: Critics hail',
  'Visionary Nyanika Mishra delivers another hit',
  'Starring ${project.leadActorName}. Directed by ${project.directorName}.',
  'Universe Release:',
  'lands in theaters.',
  "empire draws industry scrutiny",
  "studio consolidation becomes a market story",
  'Audience Pulse',
  'has too much power in Hollywood now',
  'studio empire is becoming impossible to ignore',
  'World Reaction:',
  'scrutiny,',
  'rival risk,',
  'employee risk.',
].filter((marker) => worldLogicSource.includes(marker) || worldReactionsSource.includes(marker));

if (phase5WorldRuntimeHardcodedMarkers.length > 0) {
  failures.push(`world runtime/generated copy is still hard-coded: ${phase5WorldRuntimeHardcodedMarkers.join(', ')}`);
}

const phase5WorldRuntimeRefs = [
  [worldLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'world logic i18n import'],
  [worldLogicSource, "getIndustryReleaseNews(project, player, language)", 'industry release news helper'],
  [worldLogicSource, "t(language, 'services.worldLogic.news.industryRelease.default.headline'", 'industry release headline localization'],
  [worldLogicSource, "t(language, 'services.worldLogic.news.universeRelease.headline'", 'universe release headline localization'],
  [worldReactionsSource, "import { getPlayerLanguage, t } from './i18n'", 'world reactions i18n import'],
  [worldReactionsSource, "t(language, 'services.worldReactions.news.scrutiny.headline'", 'world reaction news headline localization'],
  [worldReactionsSource, "t(language, 'services.worldReactions.social.audiencePulse.name')", 'world reaction social author localization'],
  [worldReactionsSource, "t(language, 'services.worldReactions.log.weekly'", 'world reaction weekly log localization'],
  [worldReactionsSource, "title: t(language, 'life.event.world.antitrust.title')", 'world reaction life event title localized at creation'],
  [english, 'services.worldLogic.news.industryRelease.default.headline', 'world logic EN release headline'],
  [translations.get('pt-BR') || new Map(), 'services.worldLogic.news.industryRelease.default.headline', 'world logic PT release headline'],
  [english, 'services.worldReactions.news.scrutiny.headline', 'world reactions EN scrutiny headline'],
  [translations.get('pt-BR') || new Map(), 'services.worldReactions.news.scrutiny.headline', 'world reactions PT scrutiny headline'],
];

const missingWorldRuntimeRefs = phase5WorldRuntimeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingWorldRuntimeRefs.length > 0) {
  failures.push(`world runtime/generated localization refs are missing: ${missingWorldRuntimeRefs.join(', ')}`);
}

const phase5WeeklyOfferHardcodedMarkers = [
  'Fresh Face Audition: ${',
  'The casting team is opening an additional',
  'A casting director noticed your craft',
  'Breakout Supporting Audition',
  'Breakout Ensemble Audition',
  "sender: 'Studio Casting'",
  'Breakthrough Audition: ${breakthroughInvite.opportunity.projectName}',
  'invited you to read for a ${breakthroughInvite.opportunity.roleType.toLowerCase()} role.',
  'sender: "Studio Casting"',
  'Direct Offer: ${directOffer.projectName}',
  'We want you for the lead.',
  'You received a direct offer for "${directOffer.projectName}"',
].filter((marker) => roleLogicSource.includes(marker) || gameLoopSource.includes(marker) || teamLogicSource.includes(marker));

if (phase5WeeklyOfferHardcodedMarkers.length > 0) {
  failures.push(`Weekly generated offer copy is still hard-coded: ${phase5WeeklyOfferHardcodedMarkers.join(', ')}`);
}

const phase5WeeklyOfferRefs = [
  [roleLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'role logic i18n import'],
  [roleLogicSource, "language: GameLanguage = 'en'", 'breakthrough invite accepts language'],
  [roleLogicSource, "t(language, 'services.weeklyOffer.breakthrough.blockbuster.subject'", 'breakthrough blockbuster subject localization'],
  [roleLogicSource, "t(language, 'services.weeklyOffer.breakthrough.freshFace.text'", 'breakthrough fresh face text localization'],
  [gameLoopSource, "generateBreakthroughAuditionInvite(nextPlayer, usedTitles, language)", 'weekly breakthrough invite passes language'],
  [gameLoopSource, "t(language, 'services.weeklyOffer.breakthrough.log'", 'breakthrough log localization'],
  [gameLoopSource, "t(language, 'services.weeklyOffer.direct.sender')", 'direct offer sender localization'],
  [gameLoopSource, "t(language, 'services.weeklyOffer.direct.subject'", 'direct offer subject localization'],
  [gameLoopSource, "t(language, 'services.weeklyOffer.direct.text')", 'direct offer text localization'],
  [gameLoopSource, "t(language, 'services.weeklyOffer.direct.log'", 'direct offer log localization'],
];

const missingWeeklyOfferRefs = phase5WeeklyOfferRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingWeeklyOfferRefs.length > 0) {
  failures.push(`Weekly generated offer localization refs are missing: ${missingWeeklyOfferRefs.join(', ')}`);
}

const phase5XGeneratedHardcodedMarkers = [
  'const GENERAL_TWEETS',
  'const GENERAL_TWEETS_PT',
  'const NEWS_TWEETS',
  'const NEWS_TWEETS_PT',
  'const UNIVERSE_TWEETS',
  'const UNIVERSE_TWEETS_PT',
  'const REPLIES_PT',
  'const QUOTES_PT',
  'The timeline needed this context.',
  'This explains a lot.',
  'Trending in Movies',
  'Entertainment',
  'Fashion',
].filter((marker) => xLogicSource.includes(marker));

if (phase5XGeneratedHardcodedMarkers.length > 0) {
  failures.push(`X/social generated copy is still hard-coded: ${phase5XGeneratedHardcodedMarkers.join(', ')}`);
}

const phase5XGeneratedRefs = [
  [xLogicSource, "pickXVariant(language, 'services.x.generalPost'", 'X general post variants'],
  [xLogicSource, "pickXVariant(language, 'services.x.newsPost'", 'X news post variants'],
  [xLogicSource, "pickXVariant(language, 'services.x.universePost'", 'X universe post variants'],
  [xLogicSource, "getXVariants(language, 'services.x.reply'", 'X reply variants'],
  [xLogicSource, "getXVariants(language, 'services.x.quote'", 'X quote variants'],
  [xLogicSource, "t(language, 'services.x.trends.entertainment')", 'X entertainment trend localization'],
  [xLogicSource, "t(language, 'services.x.trends.movies')", 'X movies trend localization'],
  [xLogicSource, "t(language, 'services.x.trends.trendingInMovies')", 'X release trend localization'],
];

const missingXGeneratedRefs = phase5XGeneratedRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingXGeneratedRefs.length > 0) {
  failures.push(`X/social generated localization refs are missing: ${missingXGeneratedRefs.join(', ')}`);
}

const phase5ShareholderMessageHardcodedMarkers = [
  'Shareholder Ballot:',
  'has opened a shareholder decision',
  'dividend policy',
  'Shareholders are voting on whether management',
  'FOR can lift income',
  'slate approval',
  'leadership confidence',
  'capital raise',
  'Your ${vote.playerVotingPower.toFixed(2)}% stake gives you a direct voice',
  'Visible reaction',
  'Board challenge',
  'Safer route',
  'after advisor-led outreach',
  'shareholders backed the proposal',
  'shareholders rejected the proposal',
  'board proposal',
  'Shareholder Vote:',
].filter((marker) => shareholderVotingSource.includes(marker));

if (phase5ShareholderMessageHardcodedMarkers.length > 0) {
  failures.push(`shareholder inbox/news/log generated copy is still hard-coded: ${phase5ShareholderMessageHardcodedMarkers.join(', ')}`);
}

const phase5ShareholderMessageRefs = [
  [shareholderVotingSource, "t(language, 'services.shareholder.message.subject'", 'shareholder inbox subject localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.message.text'", 'shareholder inbox body localization'],
  [shareholderVotingSource, "getVoteTemplate(language, type, stock)", 'shareholder vote template localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.event.titleFallback'", 'shareholder event title fallback localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.result.passed'", 'shareholder result passed localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.result.rejected'", 'shareholder result rejected localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.news.headline'", 'shareholder result news localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.log.resolved'", 'shareholder log localization'],
];

const missingShareholderMessageRefs = phase5ShareholderMessageRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingShareholderMessageRefs.length > 0) {
  failures.push(`shareholder inbox/news/log localization refs are missing: ${missingShareholderMessageRefs.join(', ')}`);
}

const phase5ShareholderInfluenceHardcodedMarkers = [
  'Controlling Owner',
  'Board Seat',
  'Strategic Influence',
  'Shareholder Voter',
  'Passive Investor',
  'Control votes',
  'Financial exposure',
].filter((marker) => shareholderVotingSource.includes(marker));

if (phase5ShareholderInfluenceHardcodedMarkers.length > 0) {
  failures.push(`shareholder influence ladder copy is still hard-coded: ${phase5ShareholderInfluenceHardcodedMarkers.join(', ')}`);
}

const phase5ShareholderInfluenceRefs = [
  [stocksAppSource, "getShareholderInfluence(snapshot.ownershipPercent, language)", 'Stocks influence ladder passes player language'],
  [shareholderVotingSource, "t(language, 'services.shareholder.influence.CONTROLLING_OWNER.label')", 'controlling owner label localization'],
  [shareholderVotingSource, "t(language, 'services.shareholder.influence.PASSIVE_INVESTOR.rights.dividends')", 'passive investor rights localization'],
  [english, 'services.shareholder.influence.CONTROLLING_OWNER.label', 'shareholder influence EN controlling owner label'],
  [english, 'services.shareholder.influence.PASSIVE_INVESTOR.rights.dividends', 'shareholder influence EN passive dividend rights'],
  [translations.get('pt-BR') || new Map(), 'services.shareholder.influence.CONTROLLING_OWNER.label', 'shareholder influence PT controlling owner label'],
  [translations.get('pt-BR') || new Map(), 'services.shareholder.influence.PASSIVE_INVESTOR.rights.dividends', 'shareholder influence PT passive dividend rights'],
];

const missingShareholderInfluenceRefs = phase5ShareholderInfluenceRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingShareholderInfluenceRefs.length > 0) {
  failures.push(`shareholder influence ladder localization refs are missing: ${missingShareholderInfluenceRefs.join(', ')}`);
}

const phase5SocialEventHardcodedMarkers = [
  'Movie Night',
  'You arrive at the cinema',
  'The RomCom',
  'Dinner Check',
  'Round of Shots',
  'Hell Yeah!',
  'Coffee Talk',
  'Shared a bucket of popcorn.',
  'Danced until your feet hurt.',
  'Grabbed a quick coffee.',
].filter((marker) => socialEventsSource.includes(marker));

if (phase5SocialEventHardcodedMarkers.length > 0) {
  failures.push(`social event generated copy is still hard-coded: ${phase5SocialEventHardcodedMarkers.join(', ')}`);
}

const phase5SocialEventRefs = [
  [socialEventsSource, 'getSocialEvents = (language', 'social event localized getter'],
  [socialEventsSource, 'getFlavorTexts = (language', 'social flavor localized getter'],
  [socialEventsSource, "t(language, `services.socialEvents.${category}.${event.id}.title`)", 'social event title localization'],
  [socialEventsSource, "t(language, `services.socialEvents.flavor.${category}.${id}`)", 'social event flavor localization'],
  [gameActionsSource, 'getSocialEvents(language, type)', 'partner action social event localization'],
  [gameActionsSource, 'getFlavorTexts(language, action)', 'partner action social flavor localization'],
  [english, 'services.socialEvents.DATE.movieNight.title', 'social event EN movie night title'],
  [english, 'services.socialEvents.DATE.movieNight.option.romcom.log', 'social event EN option log'],
  [english, 'services.socialEvents.flavor.DATE.popcorn', 'social event EN flavor'],
  [translations.get('pt-BR') || new Map(), 'services.socialEvents.DATE.movieNight.title', 'social event PT movie night title'],
  [translations.get('pt-BR') || new Map(), 'services.socialEvents.DATE.movieNight.option.romcom.log', 'social event PT option log'],
  [translations.get('pt-BR') || new Map(), 'services.socialEvents.flavor.DATE.popcorn', 'social event PT flavor'],
];

const missingSocialEventRefs = phase5SocialEventRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingSocialEventRefs.length > 0) {
  failures.push(`social event generated copy localization refs are missing: ${missingSocialEventRefs.join(', ')}`);
}

const phase5OutsideProducerHardcodedMarkers = [
  'Producer Investment:',
  'Producer Result:',
  'is raising ${formatMoneyShort(offer.cashAsk)}',
  'Final terms; they are not looking to bargain.',
  'They may consider one counter',
  'You backed ${offer.projectTitle}',
  'declined your ${stakePercent}% counter',
  'closed as ${label}',
  'reported ${formatMoneyShort(item.producerReceipts',
  'Fraud Investigation:',
  'Financing Trouble:',
  'Risk Paid Off:',
  'Verification Cleared:',
  'Shell company producer disappeared',
  'unverified financing delayed release',
  'generous financing checked out',
  'suspicious financing cleared',
  'Producer payout:',
  'Producer legal fees:',
].filter((marker) => outsideProductionsSource.includes(marker));

if (phase5OutsideProducerHardcodedMarkers.length > 0) {
  failures.push(`outside producer generated inbox/log copy is still hard-coded: ${phase5OutsideProducerHardcodedMarkers.join(', ')}`);
}

const phase5OutsideProducerRefs = [
  [outsideProductionsSource, "getPlayerLanguage(player)", 'outside producer player language helper'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.offer.subject'", 'outside producer offer subject localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.offer.text'", 'outside producer offer body localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.accept.log'", 'outside producer accept log localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.counter.declinedLog'", 'outside producer counter declined log localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.result.subject'", 'outside producer result subject localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.result.text'", 'outside producer result body localization'],
  [outsideProductionsSource, 'services.outsideProducer.fraud.subject.', 'outside producer fraud subject localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.weekly.logPrefix'", 'outside producer weekly log localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.finance.investment'", 'outside producer finance debit localization'],
  [outsideProductionsSource, "t(language, 'services.outsideProducer.finance.payout'", 'outside producer finance payout localization'],
];

const missingOutsideProducerRefs = phase5OutsideProducerRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingOutsideProducerRefs.length > 0) {
  failures.push(`outside producer generated localization refs are missing: ${missingOutsideProducerRefs.join(', ')}`);
}

const phase5ForbesOwnershipHardcodedMarkers = [
  "label: 'Monitor Studio'",
  "completedLabel: 'Studio Monitored'",
  'Track ownership pressure and receive future company alerts.',
  "label: 'Express Interest'",
  "completedLabel: 'Interest Registered'",
  'Quietly tell the ownership group that your studio wants a conversation.',
  "label: 'View Investment Opportunity'",
  "completedLabel: 'Opportunity Requested'",
  "label: 'Prepare Acquisition'",
  "completedLabel: 'Acquisition Prepared'",
  'added to company watch',
  'Forbes Business Desk is now monitoring',
  'Interest registered with',
  'Your confidential interest in',
  'investment brief requested',
  'recorded your request',
  'Acquisition watch opened',
  'preliminary acquisition monitoring',
  "sender: 'Forbes Business Desk'",
  'Forbes ownership command:',
].filter((marker) => forbesOwnershipSource.includes(marker));

if (phase5ForbesOwnershipHardcodedMarkers.length > 0) {
  failures.push(`Forbes ownership generated inbox/log copy is still hard-coded: ${phase5ForbesOwnershipHardcodedMarkers.join(', ')}`);
}

const phase5ForbesOwnershipRefs = [
  [forbesOwnershipSource, 'buildForbesOwnershipCommand = (action: ForbesOwnershipAction, language: GameLanguage)', 'Forbes ownership command builder localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.command.${action}.label`)", 'Forbes ownership UI label localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.command.${action}.completedLabel`)", 'Forbes ownership UI completed label localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.command.${action}.description`)", 'Forbes ownership UI description localization'],
  [forbesOwnershipSource, "language: GameLanguage = 'en'", 'Forbes ownership command language parameter'],
  [forbesOwnershipSource, "getForbesOwnershipCommand(profile.acquisitionState, Boolean(profile.isPlayerOwned), language)", 'Forbes ownership applied command language'],
  [forbesStudioProfileSource, 'language: GameLanguage;', 'Forbes studio profile language prop'],
  [forbesStudioProfileSource, 'getForbesOwnershipCommand(profile.acquisitionState, profile.isPlayerOwned, language)', 'Forbes studio profile localized command call'],
  [forbesAppSource, 'language={language}', 'Forbes app passes player language to studio profile'],
  [forbesOwnershipSource, "getPlayerLanguage(player)", 'Forbes ownership player language helper'],
  [forbesOwnershipSource, "t(language, 'services.forbesOwnership.sender')", 'Forbes ownership sender localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.message.${command.action}.subject`", 'Forbes ownership subject localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.message.${command.action}.text`", 'Forbes ownership body localization'],
  [forbesOwnershipSource, "t(language, 'services.forbesOwnership.commandLog'", 'Forbes ownership log localization'],
  [forbesOwnershipSource, "t(language, `services.forbesOwnership.command.${command.action}.label`", 'Forbes ownership command label localization'],
];

const missingForbesOwnershipRefs = phase5ForbesOwnershipRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingForbesOwnershipRefs.length > 0) {
  failures.push(`Forbes ownership generated localization refs are missing: ${missingForbesOwnershipRefs.join(', ')}`);
}

const phase5ForbesStudioProfileHardcodedMarkers = [
  'Not for sale',
  'Open to offers',
  'Seller Counter Received',
  'Acquisition Route Available',
  'Player Controlled',
  'Financial Command',
  'Performance Record',
  'Strategic Assets',
  'Portfolio under review',
  'Expandable screen lineages',
  'No shared canon tracked',
  'No tracked releases',
].filter((marker) => forbesStudioProfileSource.includes(marker));

if (phase5ForbesStudioProfileHardcodedMarkers.length > 0) {
  failures.push(`Forbes studio profile modal copy is still hard-coded: ${phase5ForbesStudioProfileHardcodedMarkers.join(', ')}`);
}

const phase5ForbesStudioProfileRefs = [
  [forbesStudioProfileSource, "'forbes.studioProfile.acquisitionState.NOT_FOR_SALE.label'", 'Forbes profile acquisition state localization'],
  [forbesStudioProfileSource, "tr('forbes.studioProfile.status.countered.title')", 'Forbes profile status localization'],
  [forbesStudioProfileSource, "tr('forbes.studioProfile.assetSource.saveData')", 'Forbes profile asset source localization'],
  [forbesStudioProfileSource, "tr('forbes.studioProfile.noTrackedReleases.title')", 'Forbes profile empty release localization'],
  [english, 'forbes.studioProfile.acquisitionState.NOT_FOR_SALE.label', 'Forbes profile EN keys'],
  [translations.get('pt-BR') || new Map(), 'forbes.studioProfile.acquisitionState.NOT_FOR_SALE.label', 'Forbes profile PT keys'],
];

const missingForbesStudioProfileRefs = phase5ForbesStudioProfileRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingForbesStudioProfileRefs.length > 0) {
  failures.push(`Forbes studio profile localization refs are missing: ${missingForbesStudioProfileRefs.join(', ')}`);
}

const phase5StudioAcquisitionDeskShellHardcodedMarkers = [
  'Full Acquisition',
  'Minority Stake',
  'Dismissive',
  'High Scrutiny',
  'Public View',
  'Due diligence complete. The verified report is now locked to this company.',
  'Opening offer submitted. No purchase funds have been deducted while the seller considers it.',
  'Purchase Agreement',
  'Seller terms and purchase price locked.',
  'Deal Summary',
  'Signature pressure',
  'Control Transfer',
  'Tap To Sign Transfer',
].filter((marker) => studioAcquisitionDeskSource.includes(marker));

if (phase5StudioAcquisitionDeskShellHardcodedMarkers.length > 0) {
  failures.push(`Studio acquisition desk shell copy is still hard-coded: ${phase5StudioAcquisitionDeskShellHardcodedMarkers.join(', ')}`);
}

const phase5StudioAcquisitionDeskShellRefs = [
  [studioAcquisitionDeskSource, "tr('studioAcquisitionDesk.structure.full')", 'Studio acquisition desk structure localization'],
  [studioAcquisitionDeskSource, "tr(POSTURE_COPY[customOfferAnalysis.posture].labelKey)", 'Studio acquisition desk posture localization'],
  [studioAcquisitionDeskSource, "tr(COMPLIANCE_COPY[option.complianceBand].labelKey)", 'Studio acquisition desk compliance localization'],
  [studioAcquisitionDeskSource, "tr('studioAcquisitionDesk.feedback.diligenceComplete')", 'Studio acquisition desk feedback localization'],
  [studioAcquisitionDeskSource, "tr('studioAcquisitionDesk.closing.purchaseAgreement.label')", 'Studio acquisition desk closing document localization'],
  [studioAcquisitionDeskSource, "tr('studioAcquisitionDesk.contract.page1.title')", 'Studio acquisition desk contract page localization'],
  [english, 'studioAcquisitionDesk.structure.full', 'Studio acquisition desk EN keys'],
  [translations.get('pt-BR') || new Map(), 'studioAcquisitionDesk.structure.full', 'Studio acquisition desk PT keys'],
];

const missingStudioAcquisitionDeskShellRefs = phase5StudioAcquisitionDeskShellRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingStudioAcquisitionDeskShellRefs.length > 0) {
  failures.push(`Studio acquisition desk shell localization refs are missing: ${missingStudioAcquisitionDeskShellRefs.join(', ')}`);
}

const phase5RightsNewsHardcodedMarkers = [
  "? 'screen option'",
  "? 'limited screen license'",
  "? 'catalog acquisition'",
  ": 'permanent rights buyout'",
  'headline: `${studioName} secures ${title} in a ${dealLabel}.`',
  "subtext: 'Industry rivals are already watching what the studio develops from its newest IP.'",
  'generateRightsAcquisitionNews(studio.name, opportunity.title, transition.ownedRight.dealType, player.currentWeek, player.age)',
].filter((marker) => newsLogicSource.includes(marker) || rightsMarketSource.includes(marker));

if (phase5RightsNewsHardcodedMarkers.length > 0) {
  failures.push(`rights acquisition generated news is still hard-coded: ${phase5RightsNewsHardcodedMarkers.join(', ')}`);
}

const phase5RightsNewsRefs = [
  [newsLogicSource, "language: GameLanguage = 'en'", 'rights acquisition language parameter'],
  [newsLogicSource, "t(language, 'services.news.rightsAcquisition.deal.option')", 'rights option deal localization'],
  [newsLogicSource, "t(language, 'services.news.rightsAcquisition.headline'", 'rights acquisition headline localization'],
  [newsLogicSource, "t(language, 'services.news.rightsAcquisition.subtext')", 'rights acquisition subtext localization'],
  [rightsMarketSource, "getPlayerLanguage(player)", 'rights market player language helper'],
  [rightsMarketSource, "generateRightsAcquisitionNews(studio.name, opportunity.title, transition.ownedRight.dealType, player.currentWeek, player.age, language)", 'rights acquisition call passes language'],
];

const missingRightsNewsRefs = phase5RightsNewsRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingRightsNewsRefs.length > 0) {
  failures.push(`rights acquisition generated news localization refs are missing: ${missingRightsNewsRefs.join(', ')}`);
}

const phase5SequelTvNewsHardcodedMarkers = [
  'Studio insiders confirm a deal is in the works.',
  "Estúdio confirma que '{Title}' seguirá como filme independente.",
  "Negociações travam para retorno em sequência de '{Title}'.",
  "Fãs criticam rumores de elenco em '{Title}'.",
  'The internet is not happy about the recasting news.',
  "'{Title}' foi renovada para mais uma temporada!",
  "'{Title}' foi cancelada após {Season} temporada(s).",
].filter((marker) => newsLogicSource.includes(marker));

if (phase5SequelTvNewsHardcodedMarkers.length > 0) {
  failures.push(`sequel/TV generated news is still hard-coded: ${phase5SequelTvNewsHardcodedMarkers.join(', ')}`);
}

const phase5SequelTvNewsRefs = [
  [newsLogicSource, "t(language, 'services.news.sequel.confirmed.subtext')", 'sequel confirmed subtext localization'],
  [newsLogicSource, "t(language, 'services.news.sequel.cancelled.headline'", 'sequel cancelled headline localization'],
  [newsLogicSource, "t(language, 'services.news.sequel.negotiationFail.headline'", 'sequel negotiation fail headline localization'],
  [newsLogicSource, "t(language, 'services.news.sequel.fanBacklash.headline'", 'sequel fan backlash headline localization'],
  [newsLogicSource, "t(language, 'services.news.sequel.fanBacklash.subtext')", 'sequel fan backlash subtext localization'],
  [newsLogicSource, "t(language, 'services.news.tv.renewal.headline'", 'TV renewal headline localization'],
  [newsLogicSource, "t(language, 'services.news.tv.cancellation.headline'", 'TV cancellation headline localization'],
];

const missingSequelTvNewsRefs = phase5SequelTvNewsRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingSequelTvNewsRefs.length > 0) {
  failures.push(`sequel/TV generated news localization refs are missing: ${missingSequelTvNewsRefs.join(', ')}`);
}

const phase5ReleaseTopStoryHardcodedMarkers = [
  'Casting Alert: You join the cast of',
  "Sources say it's a career-defining role.",
  'Production begins immediately.',
  'opening weekend stuns Hollywood.',
  'Disastrous $',
  'opening raises questions.',
  "' opens at #1.",
  'Solid performance for the',
  'With an ${rel.imdbRating} rating, word of mouth is electric.',
  'Audience scores are equally punishing.',
].filter((marker) => newsLogicSource.includes(marker));

if (phase5ReleaseTopStoryHardcodedMarkers.length > 0) {
  failures.push(`release top-story generated news is still hard-coded: ${phase5ReleaseTopStoryHardcodedMarkers.join(', ')}`);
}

const phase5ReleaseTopStoryRefs = [
  [newsLogicSource, "t(language, 'services.news.personal.signing.headline'", 'personal signing headline localization'],
  [newsLogicSource, "t(language, 'services.news.personal.signing.subtext.lead')", 'personal signing lead subtext localization'],
  [newsLogicSource, "t(language, 'services.news.release.hit.subtext'", 'release hit subtext localization'],
  [newsLogicSource, "t(language, 'services.news.release.flop.subtext'", 'release flop subtext localization'],
  [newsLogicSource, "t(language, 'services.news.release.open.headline'", 'release opening headline localization'],
  [newsLogicSource, "t(language, 'services.news.release.open.subtext'", 'release opening subtext localization'],
  [newsLogicSource, "t(language, 'services.news.release.criticLoved.subtext'", 'critic loved subtext localization'],
  [newsLogicSource, "t(language, 'services.news.release.criticHated.subtext')", 'critic hated subtext localization'],
];

const missingReleaseTopStoryRefs = phase5ReleaseTopStoryRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingReleaseTopStoryRefs.length > 0) {
  failures.push(`release top-story generated news localization refs are missing: ${missingReleaseTopStoryRefs.join(', ')}`);
}

const phase5IndustryForbesNewsHardcodedMarkers = [
  'reshuffles executive leadership.',
  'reorganiza sua liderança executiva.',
  'A sign of rising power in the industry.',
  'Um sinal de poder crescente na indústria.',
].filter((marker) => newsLogicSource.includes(marker));

if (phase5IndustryForbesNewsHardcodedMarkers.length > 0) {
  failures.push(`industry/Forbes generated news is still hard-coded: ${phase5IndustryForbesNewsHardcodedMarkers.join(', ')}`);
}

const phase5IndustryForbesNewsRefs = [
  [newsLogicSource, "t(language, 'services.news.industry.studioReshuffle.headline'", 'studio reshuffle headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.entry.subtext')", 'Forbes entry subtext localization'],
];

const missingIndustryForbesNewsRefs = phase5IndustryForbesNewsRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingIndustryForbesNewsRefs.length > 0) {
  failures.push(`industry/Forbes generated news localization refs are missing: ${missingIndustryForbesNewsRefs.join(', ')}`);
}

const phase5ForbesHeadlineArrayMarkers = [
  'const FORBES_RISE_HEADLINES',
  'const FORBES_DROP_HEADLINES',
  'const FORBES_ENTRY_HEADLINES',
  'const FORBES_TOP_10_HEADLINES',
  'const FORBES_NUMBER_ONE_HEADLINES',
  'const FORBES_INDUSTRY_HEADLINES',
  'const FORBES_ENTRY_HEADLINES_PT',
  'pickLocalized(language, FORBES_ENTRY_HEADLINES',
].filter((marker) => newsLogicSource.includes(marker));

if (phase5ForbesHeadlineArrayMarkers.length > 0) {
  failures.push(`Forbes generated headline templates still live in newsLogic.ts: ${phase5ForbesHeadlineArrayMarkers.join(', ')}`);
}

const phase5ForbesHeadlineRefs = [
  [newsLogicSource, "t(language, 'services.news.forbes.entry.headline'", 'Forbes entry headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.numberOne.headline'", 'Forbes number-one headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.top10.headline'", 'Forbes top-10 headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.rise.headline'", 'Forbes rise headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.drop.headline'", 'Forbes drop headline localization'],
  [newsLogicSource, "t(language, 'services.news.forbes.industry.headline')", 'Forbes industry headline localization'],
];

const missingForbesHeadlineRefs = phase5ForbesHeadlineRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingForbesHeadlineRefs.length > 0) {
  failures.push(`Forbes generated headline localization refs are missing: ${missingForbesHeadlineRefs.join(', ')}`);
}

const phase5UniverseNewsTemplateMarkers = [
  'const UNIVERSE_NEWS_TEMPLATES',
  'const UNIVERSE_NEWS_TEMPLATES_PT',
  'pickLocalized(language, UNIVERSE_NEWS_TEMPLATES',
  'Fans are speculating wildly about the next phase of the {Universe} universe.',
  'Fãs especulam intensamente sobre a próxima fase do universo {Universe}.',
].filter((marker) => newsLogicSource.includes(marker));

if (phase5UniverseNewsTemplateMarkers.length > 0) {
  failures.push(`universe generated news templates still live in newsLogic.ts: ${phase5UniverseNewsTemplateMarkers.join(', ')}`);
}

const phase5UniverseNewsRefs = [
  [newsLogicSource, "t(language, 'services.news.universe.background.headline'", 'universe background headline localization'],
];

const missingUniverseNewsRefs = phase5UniverseNewsRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseNewsRefs.length > 0) {
  failures.push(`universe generated news localization refs are missing: ${missingUniverseNewsRefs.join(', ')}`);
}

const phase5RemainingNewsTemplateMarkers = [
  'const INDUSTRY_TEMPLATES',
  'const NPC_HEADLINES',
  'const HIT_HEADLINES',
  'const UNIVERSE_HIT_HEADLINES',
  'const FLOP_HEADLINES',
  'const UNIVERSE_FLOP_HEADLINES',
  'const CRITIC_LOVED_HEADLINES',
  'const UNIVERSE_CRITIC_LOVED_HEADLINES',
  'const CRITIC_HATED_HEADLINES',
  'const UNIVERSE_CRITIC_HATED_HEADLINES',
  'const SEQUEL_HYPE_HEADLINES',
  'const SEQUEL_CONFIRMED_HEADLINES',
  'const SCANDAL_HEADLINES',
  'const LEGAL_HEADLINES',
  'const SEQUEL_CANCELLED_HEADLINES',
  'const NEGOTIATION_FAIL_HEADLINES',
  'const FAN_BACKLASH_HEADLINES',
  'const TV_RENEWAL_HEADLINES',
  'const TV_CANCELLATION_HEADLINES',
  'const INDUSTRY_TEMPLATES_PT',
  'const NPC_HEADLINES_PT',
  'const SCANDAL_HEADLINES_PT',
  'const LEGAL_HEADLINES_PT',
  'pickLocalized(',
].filter((marker) => newsLogicSource.includes(marker));

if (phase5RemainingNewsTemplateMarkers.length > 0) {
  failures.push(`remaining newsLogic generated headline templates are still hard-coded: ${phase5RemainingNewsTemplateMarkers.join(', ')}`);
}

const phase5RemainingNewsTemplateRefs = [
  [newsLogicSource, "pickNewsVariant(language, 'services.news.industry.trend'", 'industry trend headline variants'],
  [newsLogicSource, "pickNewsVariant(language, 'services.news.industry.npc'", 'NPC headline variants'],
  [newsLogicSource, "'services.news.release.hit.headline'", 'release hit headline variants'],
  [newsLogicSource, "'services.news.release.hit.universeHeadline'", 'release universe hit headline variants'],
  [newsLogicSource, "'services.news.release.flop.headline'", 'release flop headline variants'],
  [newsLogicSource, "'services.news.release.flop.universeHeadline'", 'release universe flop headline variants'],
  [newsLogicSource, "'services.news.release.criticLoved.headline'", 'critic loved headline variants'],
  [newsLogicSource, "'services.news.release.criticLoved.universeHeadline'", 'critic loved universe headline variants'],
  [newsLogicSource, "'services.news.release.criticHated.headline'", 'critic hated headline variants'],
  [newsLogicSource, "'services.news.release.criticHated.universeHeadline'", 'critic hated universe headline variants'],
  [newsLogicSource, "pickNewsVariant(language, 'services.news.sequel.hype.headline'", 'sequel hype headline variants'],
  [newsLogicSource, "pickNewsVariant(language, 'services.news.sequel.confirmed.headline'", 'sequel confirmed headline variants'],
  [newsLogicSource, "pickNewsVariant(language, 'services.news.scandal.headline'", 'scandal headline variants'],
  [newsLogicSource, "pickNewsVariant(language, 'services.news.legal.headline'", 'legal headline variants'],
];

const missingRemainingNewsTemplateRefs = phase5RemainingNewsTemplateRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingRemainingNewsTemplateRefs.length > 0) {
  failures.push(`remaining newsLogic generated headline localization refs are missing: ${missingRemainingNewsTemplateRefs.join(', ')}`);
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

const phase5SoundtrackCultureHardcodedMarkers = [
  'soundtrack starts a ${lead.artist.genre} trend.',
  "movie track is turning into edits",
  'is getting bigger than ${rel.name}.',
  'Fans are sharing the soundtrack more than the movie discussion',
  'controversy clips hit ${rel.name}.',
  'The soundtrack choice gets dragged into the movie campaign',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5SoundtrackCultureHardcodedMarkers.length > 0) {
  failures.push(`soundtrack culture generated copy is still hard-coded: ${phase5SoundtrackCultureHardcodedMarkers.join(', ')}`);
}

const phase5SoundtrackCultureRefs = [
  [gameLoopSource, 'const language = getPlayerLanguage(player);', 'soundtrack culture player language'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.headline'", 'soundtrack trend headline localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.description'", 'soundtrack trend description localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.SONG_BIGGER_THAN_MOVIE.headline'", 'song bigger headline localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.SONG_BIGGER_THAN_MOVIE.description'", 'song bigger description localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.CONTROVERSIAL_CAMPAIGN.headline'", 'controversial campaign headline localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.soundtrackCulture.CONTROVERSIAL_CAMPAIGN.description'", 'controversial campaign description localization'],
  [english, 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.headline', 'soundtrack culture EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.soundtrackCulture.SOUNDTRACK_TREND.headline', 'soundtrack culture PT keys'],
];

const missingSoundtrackCultureRefs = phase5SoundtrackCultureRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingSoundtrackCultureRefs.length > 0) {
  failures.push(`soundtrack culture localization refs are missing: ${missingSoundtrackCultureRefs.join(', ')}`);
}

const phase5FundingBreachHardcodedMarkers = [
  'Files a Funding Claim',
  'did not commence the funded follow-up',
  'Settle Quietly',
  'Pay a controlled settlement',
  "settled ${platformName}'s funding claim",
  'Fight in Arbitration',
  'won arbitration against',
  'lost arbitration and paid',
  "sender: `${platformName} Business Affairs`",
  'Final Funding Notice:',
  'Funding Deadline:',
  'next-season commitment expires',
  "sender: `${platformName} Legal`",
  'Funding Commitment Cancelled:',
  'cancels ${sourceTitle} funding',
  'missed the two-year commencement deadline',
  "cancelled ${sourceTitle}'s unused funding",
].filter((marker) => gameLoopSource.includes(marker));

if (phase5FundingBreachHardcodedMarkers.length > 0) {
  failures.push(`funding breach generated copy is still hard-coded: ${phase5FundingBreachHardcodedMarkers.join(', ')}`);
}

const phase5FundingBreachRefs = [
  [gameLoopSource, "language: GameLanguage = 'en'", 'funding breach language parameter'],
  [gameLoopSource, "titleKey: 'life.event.fundingBreach.title'", 'funding breach life title key'],
  [gameLoopSource, "descriptionKey: 'life.event.fundingBreach.description'", 'funding breach life description key'],
  [gameLoopSource, "labelKey: 'life.event.fundingBreach.settle.label'", 'funding breach settle label key'],
  [gameLoopSource, "logKey: 'life.event.fundingBreach.settle.log'", 'funding breach settle log key'],
  [gameLoopSource, "logKey: 'life.event.fundingBreach.arbitration.winLog'", 'funding breach arbitration win log key'],
  [gameLoopSource, "logKey: 'life.event.fundingBreach.arbitration.lossLog'", 'funding breach arbitration loss log key'],
  [gameLoopSource, "t(language, 'services.gameLoop.fundingDeadline.sender'", 'funding deadline sender localization'],
  [gameLoopSource, "t(language, isFinal ? 'services.gameLoop.fundingDeadline.finalSubject' : 'services.gameLoop.fundingDeadline.subject'", 'funding deadline subject localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.fundingDefault.news.headline'", 'funding default news localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.fundingDefault.log'", 'funding default log localization'],
  [english, 'life.event.fundingBreach.title', 'funding breach EN life event keys'],
  [translations.get('pt-BR') || new Map(), 'life.event.fundingBreach.title', 'funding breach PT life event keys'],
];

const missingFundingBreachRefs = phase5FundingBreachRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingFundingBreachRefs.length > 0) {
  failures.push(`funding breach localization refs are missing: ${missingFundingBreachRefs.join(', ')}`);
}

const phase5YoutubeEventFallbackHardcodedMarkers = [
  "title: 'YouTube Copyright Claim'",
  "title: 'Copyright Claim'",
  'has been hit with a copyright claim',
  "label: 'Accept Claim'",
  "value: 'None'",
  "value: 'Trust +4'",
  "value: 'Legal case'",
  "value: 'Recovered'",
  "title: 'YouTube Backlash'",
  "title: 'Creator Backlash'",
  'comments around',
  "label: 'Post Apology Video'",
  "value: 'Spike'",
  "value: 'High'",
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeEventFallbackHardcodedMarkers.length > 0) {
  failures.push(`YouTube copyright/backlash event fallback copy is still hard-coded: ${phase5YoutubeEventFallbackHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeEventFallbackRefs = [
  [typesSource, 'valueKey?: string;', 'preview effect value key type'],
  [lifeEventModalSource, 'getSignalValue(effect)', 'life event modal localized effect value'],
  [gameLoopSource, 'createYoutubeCopyrightEvent = (', 'YouTube copyright event generator exists'],
  [gameLoopSource, 'language: GameLanguage = \'en\'', 'YouTube event language parameter'],
  [gameLoopSource, "title: t(language, 'life.event.youtube.copyright.title')", 'YouTube copyright title fallback localization'],
  [gameLoopSource, "valueKey: 'life.effect.value.none'", 'YouTube copyright none value key'],
  [gameLoopSource, "valueKey: 'life.effect.value.legalCase'", 'YouTube copyright legal case value key'],
  [gameLoopSource, "valueKey: 'life.effect.value.recovered'", 'YouTube recovered value key'],
  [gameLoopSource, "title: t(language, 'life.event.youtube.backlash.title')", 'YouTube backlash title fallback localization'],
  [gameLoopSource, "valueKey: 'life.effect.value.spike'", 'YouTube spike value key'],
  [gameLoopSource, "valueKey: 'life.effect.value.high'", 'YouTube high value key'],
  [gameLoopSource, 'createYoutubeBacklashEvent(title, controversy + ensureFiniteNumber(pickedVideo.controversyScore, 0), language)', 'YouTube backlash call passes language'],
  [gameLoopSource, 'createYoutubeCopyrightEvent(title, claim, 45 + Math.floor(Math.random() * 35), language)', 'YouTube copyright call passes language'],
  [english, 'life.effect.value.none', 'YouTube event value EN keys'],
  [translations.get('pt-BR') || new Map(), 'life.effect.value.none', 'YouTube event value PT keys'],
];

const missingYoutubeEventFallbackRefs = phase5YoutubeEventFallbackRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeEventFallbackRefs.length > 0) {
  failures.push(`YouTube copyright/backlash localization refs are missing: ${missingYoutubeEventFallbackRefs.join(', ')}`);
}

const phase5YoutubeRuntimeHardcodedMarkers = [
  "value: 'Opened'",
  'YouTube Copyright Dispute',
  'A copyright holder escalated the claim around',
  'faces a copyright dispute over a YouTube upload.',
  'The creator side of fame just got legally messy.',
  'The claim was handled professionally.',
  'This response actually felt mature.',
  'This response made everything louder.',
  'Creator Backlash Defamation Case',
  'triggered a legal complaint.',
  'refusing to feed the',
  'Creator Watch',
  'timeline is on fire.',
  'turned beef into a polished collab.',
].filter((marker) => youtubeEventLogicSource.includes(marker));

if (phase5YoutubeRuntimeHardcodedMarkers.length > 0) {
  failures.push(`YouTube runtime generated copy is still hard-coded: ${phase5YoutubeRuntimeHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeRuntimeRefs = [
  [youtubeEventLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'YouTube event i18n import'],
  [youtubeEventLogicSource, "buildImpactSignals(before, snapshotYoutubeImpact(player), language)", 'YouTube effect labels localized'],
  [youtubeEventLogicSource, "t(language, 'services.youtubeEvent.legalCase.copyright.title')", 'YouTube copyright legal case localization'],
  [youtubeEventLogicSource, "t(language, 'services.youtubeEvent.news.copyrightCase.headline'", 'YouTube copyright news localization'],
  [youtubeEventLogicSource, "t(language, 'services.youtubeEvent.videoComment.claimHandled')", 'YouTube video comments localization'],
  [youtubeEventLogicSource, "t(language, 'services.youtubeEvent.social.creatorWatch.name')", 'YouTube social author localization'],
  [youtubeEventLogicSource, "t(language, 'services.youtubeEvent.social.rival.clapBack'", 'YouTube rival social localization'],
  [english, 'services.youtubeEvent.news.copyrightCase.headline', 'YouTube runtime EN news key'],
  [translations.get('pt-BR') || new Map(), 'services.youtubeEvent.news.copyrightCase.headline', 'YouTube runtime PT news key'],
  [english, 'life.effect.value.opened', 'YouTube opened effect EN value'],
  [translations.get('pt-BR') || new Map(), 'life.effect.value.opened', 'YouTube opened effect PT value'],
];

const missingYoutubeRuntimeRefs = phase5YoutubeRuntimeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeRuntimeRefs.length > 0) {
  failures.push(`YouTube runtime localization refs are missing: ${missingYoutubeRuntimeRefs.join(', ')}`);
}

const phase5YoutubeCreatorRivalHardcodedMarkers = [
  "title: 'Podcast Invite'",
  "title: 'Creator Gala'",
  "title: 'Platform Summit'",
  'major creator podcast',
  'private creator gala',
  'closed-door creator summit',
  "label: kind === 'PODCAST' ? 'Give A Real Interview' : 'Work The Room'",
  'Build trust, reputation, and professional reach',
  "label: kind === 'PODCAST' ? 'Chase The Viral Clip' : 'Make A Loud Entrance'",
  'Chase views, subscribers, and fame',
  "label: 'Golden Handler (Watch Ad)'",
  'Best route. Your team scripts the moment',
  "title: 'Creator Rivalry'",
  'called your channel manufactured chaos',
  'said your creator era is too polished to be real',
  'accused you of copying their creator lane',
  "label: 'Ignore The Bait'",
  'Avoid drama, protect trust',
  "label: 'Clap Back Publicly'",
  'Fast views and fame',
  "label: 'Golden Mediated Collab (Watch Ad)'",
  'A mediator turns the feud',
  'A creator rival takes aim',
  'not everyone is clapping',
  'Creator Rivalry: A rival creator',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeCreatorRivalHardcodedMarkers.length > 0) {
  failures.push(`YouTube creator invite/rival event fallback copy is still hard-coded: ${phase5YoutubeCreatorRivalHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeCreatorRivalRefs = [
  [gameLoopSource, 'const language = getPlayerLanguage(player);', 'YouTube creator invite player language'],
  [gameLoopSource, "title: t(language, copy.titleKey)", 'YouTube creator invite scheduled title localization'],
  [gameLoopSource, "description: t(language, copy.descriptionKey, { playerName: player.name })", 'YouTube creator invite description localization'],
  [gameLoopSource, "label: t(language, kind === 'PODCAST' ? 'life.event.youtube.creatorInvite.steady.podcast.label' : 'life.event.youtube.creatorInvite.steady.room.label')", 'YouTube creator steady label localization'],
  [gameLoopSource, "label: t(language, 'life.event.youtube.creatorInvite.golden.label')", 'YouTube creator golden label localization'],
  [gameLoopSource, 'language: GameLanguage = getPlayerLanguage(player)', 'YouTube rivalry language parameter'],
  [gameLoopSource, "title: t(language, 'life.event.youtube.rivalry.eventTitle')", 'YouTube rivalry scheduled title localization'],
  [gameLoopSource, "title: t(language, 'life.event.youtube.rivalry.title', { rivalName })", 'YouTube rivalry title localization'],
  [gameLoopSource, "description: t(language, `life.event.youtube.rivalry.description.${topicKey}`, { rivalName })", 'YouTube rivalry description localization'],
  [gameLoopSource, "label: t(language, 'life.event.youtube.rivalry.ignore.label')", 'YouTube rivalry ignore label localization'],
  [gameLoopSource, "label: t(language, 'life.event.youtube.rivalry.golden.label')", 'YouTube rivalry golden label localization'],
  [gameLoopSource, 'createYoutubeRivalryEvent(nextPlayer, Math.random, language)', 'YouTube rivalry call passes language'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeRivalry.news.headline'", 'YouTube rivalry teaser headline localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeRivalry.log')", 'YouTube rivalry teaser log localization'],
  [english, 'life.event.youtube.rivalry.eventTitle', 'YouTube rivalry event EN key'],
  [translations.get('pt-BR') || new Map(), 'life.event.youtube.rivalry.eventTitle', 'YouTube rivalry event PT key'],
];

const missingYoutubeCreatorRivalRefs = phase5YoutubeCreatorRivalRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeCreatorRivalRefs.length > 0) {
  failures.push(`YouTube creator invite/rival localization refs are missing: ${missingYoutubeCreatorRivalRefs.join(', ')}`);
}

const phase5YoutubePreviewEffectHardcodedMarkers = [
  "{ label: 'Cash', labelKey: 'life.effect.cash'",
  "{ label: 'Audience Trust', labelKey: 'life.effect.audienceTrust'",
  "{ label: 'Risk', labelKey: 'life.effect.risk'",
  "{ label: 'Editing Cost', labelKey: 'life.effect.editingCost'",
  "{ label: 'Controversy', labelKey: 'life.effect.controversy'",
  "{ label: 'Fan Mood', labelKey: 'life.effect.fanMood'",
  "{ label: 'Upside', labelKey: 'life.effect.upside'",
  "{ label: 'Views', labelKey: 'life.effect.views'",
  "{ label: 'Legal Risk', labelKey: 'life.effect.legalRisk'",
  "{ label: 'Reputation', labelKey: 'life.effect.reputation'",
  "{ label: 'X Followers', labelKey: 'life.effect.xFollowers'",
  "{ label: 'Growth', labelKey: 'life.effect.growth'",
  "{ label: 'Views & Subs', labelKey: 'life.effect.viewsSubs'",
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubePreviewEffectHardcodedMarkers.length > 0) {
  failures.push(`YouTube preview effect labels still use hard-coded fallback copy: ${phase5YoutubePreviewEffectHardcodedMarkers.join(', ')}`);
}

const phase5YoutubePreviewEffectRefs = [
  [gameLoopSource, "label: t(language, 'life.effect.cash')", 'YouTube cash effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.audienceTrust')", 'YouTube audience trust effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.risk')", 'YouTube risk effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.editingCost')", 'YouTube editing cost effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.controversy')", 'YouTube controversy effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.fanMood')", 'YouTube fan mood effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.upside')", 'YouTube upside effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.views')", 'YouTube views effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.legalRisk')", 'YouTube legal risk effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.reputation')", 'YouTube reputation effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.xFollowers')", 'YouTube X followers effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.growth')", 'YouTube growth effect label localization'],
  [gameLoopSource, "label: t(language, 'life.effect.viewsSubs')", 'YouTube views/subs effect label localization'],
];

const missingYoutubePreviewEffectRefs = phase5YoutubePreviewEffectRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubePreviewEffectRefs.length > 0) {
  failures.push(`YouTube preview effect localization refs are missing: ${missingYoutubePreviewEffectRefs.join(', ')}`);
}

const phase5YoutubeWeeklyRewardsHardcodedMarkers = [
  "'YouTube Ad Revenue'",
  'YouTube Earnings:',
  "'YouTube Memberships'",
  'YouTube Members paid',
  "title: '10K Creator Breakout'",
  'crosses 10K YouTube subscribers',
  "title: 'Million View Channel'",
  'passes 1M total views',
  "title: 'Silver Play Button'",
  'earns a Silver Play Button',
  "title: 'Gold Play Button'",
  'million-subscriber creator',
  "sender: 'YouTube Creator Awards'",
  'The channel is no longer just a side hustle',
  'The creator career is becoming part of the public image.',
  'YouTube Milestone:',
  'YouTube Invite: A creator-world event',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeWeeklyRewardsHardcodedMarkers.length > 0) {
  failures.push(`YouTube weekly rewards/milestones copy is still hard-coded: ${phase5YoutubeWeeklyRewardsHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeWeeklyRewardsRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.finance.adRevenue')", 'YouTube ad revenue transaction localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.log.earnings'", 'YouTube earnings log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.finance.memberships')", 'YouTube memberships transaction localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.log.memberships'", 'YouTube memberships log localization'],
  [gameLoopSource, "titleKey: 'services.gameLoop.youtubeWeekly.milestone.subs10000.title'", 'YouTube 10K milestone title key'],
  [gameLoopSource, "headlineKey: 'services.gameLoop.youtubeWeekly.milestone.subs10000.headline'", 'YouTube 10K milestone headline key'],
  [gameLoopSource, "sender: t(language, 'services.gameLoop.youtubeWeekly.milestone.sender')", 'YouTube milestone sender localization'],
  [gameLoopSource, "const milestoneTitle = t(language, milestone.titleKey)", 'YouTube milestone title localization'],
  [gameLoopSource, "text: t(language, 'services.gameLoop.youtubeWeekly.milestone.text'", 'YouTube milestone inbox text localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.youtubeWeekly.milestone.newsSubtext')", 'YouTube milestone news subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.log.milestone'", 'YouTube milestone log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeWeekly.log.creatorInvite')", 'YouTube creator invite weekly log localization'],
  [english, 'services.gameLoop.youtubeWeekly.milestone.subs10000.title', 'YouTube weekly rewards EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.youtubeWeekly.milestone.subs10000.title', 'YouTube weekly rewards PT keys'],
];

const missingYoutubeWeeklyRewardsRefs = phase5YoutubeWeeklyRewardsRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeWeeklyRewardsRefs.length > 0) {
  failures.push(`YouTube weekly rewards localization refs are missing: ${missingYoutubeWeeklyRewardsRefs.join(', ')}`);
}

const phase5YoutubeEarlyMicroHardcodedMarkers = [
  "'your latest upload'",
  'Small channel gang found this one.',
  'This deserves more views.',
  'Small Channel Moment:',
  'A tiny creator reposted this to friends.',
  'Tiny channel find:',
  'Low views, but the idea is solid.',
  'Tiny Share:',
  'Someone clipped the best part.',
  'The short version sold me on the full video.',
  'Clip Lift:',
  'The thumbnail actually made me click.',
  'Title and thumbnail are getting better.',
  'Better Packaging:',
  'I saw you upload consistently. Subscribed.',
  'Consistency Noticed:',
  'The pacing feels a little rough, but keep going.',
  'Early Feedback:',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeEarlyMicroHardcodedMarkers.length > 0) {
  failures.push(`YouTube early-channel micro-event copy is still hard-coded: ${phase5YoutubeEarlyMicroHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeEarlyMicroRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.fallbackTitle')", 'YouTube early fallback title localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.smallFound')", 'YouTube early small found comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.smallMoment'", 'YouTube early small moment log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.tinyRepost')", 'YouTube early tiny repost comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.social.tinyShare'", 'YouTube early tiny share social localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.tinyShare'", 'YouTube early tiny share log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.clipBestPart')", 'YouTube early clip comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.clipLift'", 'YouTube early clip lift log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.thumbnailClick')", 'YouTube early thumbnail comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.betterPackaging'", 'YouTube early packaging log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.consistentUpload')", 'YouTube early consistent upload comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.consistency'", 'YouTube early consistency log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.comment.roughPacing')", 'YouTube early feedback comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeEarly.log.feedback'", 'YouTube early feedback log localization'],
  [english, 'services.gameLoop.youtubeEarly.fallbackTitle', 'YouTube early micro EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.youtubeEarly.fallbackTitle', 'YouTube early micro PT keys'],
];

const missingYoutubeEarlyMicroRefs = phase5YoutubeEarlyMicroRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeEarlyMicroRefs.length > 0) {
  failures.push(`YouTube early-channel micro-event localization refs are missing: ${missingYoutubeEarlyMicroRefs.join(', ')}`);
}

const phase5YoutubeAudienceEventHardcodedMarkers = [
  'This clip is suddenly everywhere.',
  'The algorithm finally found this one.',
  'This is the kind of creator moment brands chase.',
  'Viral Clip:',
  "'YouTube Creator Bonus'",
  "sender: 'YouTube Creator Support'",
  "subject: 'Creator Bonus Released'",
  'Keep the upload rhythm strong.',
  'YouTube Creator Bonus:',
  'This feels different from the old channel.',
  'The comments are fighting today.',
  'splits the internet.',
  'Some viewers call it bold. Others say the channel is trying too hard.',
  'YouTube Backlash:',
  'Wait, did this get claimed?',
  'Copyright Claim:',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeAudienceEventHardcodedMarkers.length > 0) {
  failures.push(`YouTube audience event copy is still hard-coded: ${phase5YoutubeAudienceEventHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeAudienceEventRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.comment.viralEverywhere')", 'YouTube viral comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.social.viralClip'", 'YouTube viral social copy localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.log.viralClip'", 'YouTube viral log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.finance.creatorBonus')", 'YouTube creator bonus transaction localization'],
  [gameLoopSource, "sender: t(language, 'services.gameLoop.youtubeAudience.bonus.sender')", 'YouTube creator bonus sender localization'],
  [gameLoopSource, "subject: t(language, 'services.gameLoop.youtubeAudience.bonus.subject')", 'YouTube creator bonus subject localization'],
  [gameLoopSource, "text: t(language, 'services.gameLoop.youtubeAudience.bonus.text'", 'YouTube creator bonus text localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.log.creatorBonus'", 'YouTube creator bonus log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.comment.backlashOldChannel')", 'YouTube backlash comment localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.youtubeAudience.news.backlashHeadline'", 'YouTube backlash news headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.youtubeAudience.news.backlashSubtext')", 'YouTube backlash news subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.log.backlash'", 'YouTube backlash log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.comment.claimed')", 'YouTube copyright claim comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeAudience.log.copyrightClaim'", 'YouTube copyright claim log localization'],
  [english, 'services.gameLoop.youtubeAudience.comment.viralEverywhere', 'YouTube audience event EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.youtubeAudience.comment.viralEverywhere', 'YouTube audience event PT keys'],
];

const missingYoutubeAudienceEventRefs = phase5YoutubeAudienceEventRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeAudienceEventRefs.length > 0) {
  failures.push(`YouTube audience event localization refs are missing: ${missingYoutubeAudienceEventRefs.join(', ')}`);
}

const phase5InstagramMicroHardcodedMarkers = [
  'This is clean.',
  'The tiny notification that starts a whole fan theory.',
  'noticed ${nextPlayer.name} on Instagram.',
  'A small social signal is getting screenshots in fan circles and casting group chats.',
  'Instagram Notice:',
  'A small fan page reposted this.',
  'Instagram Fan Page:',
  'This belongs on a mood board.',
  'Instagram Aesthetic Lift:',
  'This feels more real than the usual celebrity feed.',
  'Relatable Moment:',
  'This is getting messy in the comments.',
  'Instagram Comment Fire:',
  'A few people noticed the consistency.',
  'Instagram Pulse:',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5InstagramMicroHardcodedMarkers.length > 0) {
  failures.push(`Instagram micro-event copy is still hard-coded: ${phase5InstagramMicroHardcodedMarkers.join(', ')}`);
}

const phase5InstagramMicroRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.celebrityClean'", 'Instagram celebrity comment localization'],
  [gameLoopSource, "caption: t(language, 'services.gameLoop.instagramMicro.social.celebrityLike'", 'Instagram celebrity social caption localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.instagramMicro.news.celebrityNotice'", 'Instagram celebrity news headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.instagramMicro.news.celebrityNoticeSubtext')", 'Instagram celebrity news subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.notice'", 'Instagram notice log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.fanRepost')", 'Instagram fan repost comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.fanPage'", 'Instagram fan page log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.moodBoard')", 'Instagram mood board comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.aestheticLift'", 'Instagram aesthetic lift log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.relatable')", 'Instagram relatable comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.relatable'", 'Instagram relatable log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.messy')", 'Instagram messy comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.commentFire'", 'Instagram comment fire log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.comment.consistency')", 'Instagram consistency comment localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramMicro.log.pulse')", 'Instagram pulse log localization'],
  [english, 'services.gameLoop.instagramMicro.comment.celebrityClean', 'Instagram micro-event EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.instagramMicro.comment.celebrityClean', 'Instagram micro-event PT keys'],
];

const missingInstagramMicroRefs = phase5InstagramMicroRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingInstagramMicroRefs.length > 0) {
  failures.push(`Instagram micro-event localization refs are missing: ${missingInstagramMicroRefs.join(', ')}`);
}

const phase5InstagramDmHardcodedMarkers = [
  "sender: 'Casting Director'",
  'Referral Role Offer',
  'Referral Audition',
  'A celebrity connection',
  'recommended you. Casting is offering you the role directly.',
  'recommended you. Casting would like you to audition for this role.',
  'Instagram Referral:',
  'a direct role offer',
  'an audition',
  "|| 'someone'",
  'Instagram Seen:',
  'referral DM unanswered.',
  'campaign DM from',
  'reportedly left',
  'movie DM on seen.',
  'tiny industry mystery.',
  "No worries, timing matters. I'll move this one along.",
  'brand scouting creators on Instagram.',
  'A micro Instagram campaign from',
  'we like your feed.',
  'Reply within 3 weeks. If you accept',
  '/week campaign offer.',
  "nextPlayer.stats.fame >= 35 ? 'a studio project' : 'an indie project'",
  'I heard a casting director asking around',
  'Sometimes one DM changes a call sheet.',
  'hinted at a possible casting referral.',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5InstagramDmHardcodedMarkers.length > 0) {
  failures.push(`Instagram referral/DM offer copy is still hard-coded: ${phase5InstagramDmHardcodedMarkers.join(', ')}`);
}

const phase5InstagramDmRefs = [
  [gameLoopSource, "sender: t(language, 'services.gameLoop.instagramDm.referral.sender')", 'Instagram referral sender localization'],
  [gameLoopSource, "subject: t(language, isDirectRole ? 'services.gameLoop.instagramDm.referral.directSubject' : 'services.gameLoop.instagramDm.referral.auditionSubject'", 'Instagram referral subject localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.referral.directText'", 'Instagram referral direct text localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.referral.auditionText'", 'Instagram referral audition text localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.log.referral'", 'Instagram referral log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.fallback.someone')", 'Instagram DM someone fallback localization'],
  [gameLoopSource, "t(language, isReferral ? 'services.gameLoop.instagramDm.log.seenReferral' : 'services.gameLoop.instagramDm.log.seenCampaign'", 'Instagram seen log localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.instagramDm.news.seenHeadline'", 'Instagram seen news headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.instagramDm.news.seenSubtext')", 'Instagram seen news subtext localization'],
  [gameLoopSource, "const followUpText = t(language, 'services.gameLoop.instagramDm.followUp.expired')", 'Instagram expired follow-up localization'],
  [gameLoopSource, "bio: t(language, 'services.gameLoop.instagramDm.brand.bio'", 'Instagram brand bio localization'],
  [gameLoopSource, "description: t(language, 'services.gameLoop.instagramDm.brand.offerDescription'", 'Instagram brand offer description localization'],
  [gameLoopSource, "text: t(language, 'services.gameLoop.instagramDm.brand.offerText'", 'Instagram brand offer text localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.log.brandOffer'", 'Instagram brand offer log localization'],
  [gameLoopSource, "t(language, nextPlayer.stats.fame >= 35 ? 'services.gameLoop.instagramDm.referral.projectHint.studio' : 'services.gameLoop.instagramDm.referral.projectHint.indie')", 'Instagram referral project hint localization'],
  [gameLoopSource, "text: t(language, 'services.gameLoop.instagramDm.referral.dmText'", 'Instagram referral DM text localization'],
  [gameLoopSource, "caption: t(language, 'services.gameLoop.instagramDm.social.referralBuzz')", 'Instagram referral buzz caption localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.instagramDm.log.referralHint'", 'Instagram referral hint log localization'],
  [english, 'services.gameLoop.instagramDm.referral.sender', 'Instagram referral/DM EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.instagramDm.referral.sender', 'Instagram referral/DM PT keys'],
];

const missingInstagramDmRefs = phase5InstagramDmRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingInstagramDmRefs.length > 0) {
  failures.push(`Instagram referral/DM offer localization refs are missing: ${missingInstagramDmRefs.join(', ')}`);
}

const phase5YoutubeImageRippleHardcodedMarkers = [
  'creator image is opening industry doors.',
  'Casting teams and brands are starting to treat the channel as career leverage.',
  'Creator Image:',
  'boosted industry trust.',
  'Brands hesitate as',
  'creator image gets messy.',
  'some industry rooms are getting cautious.',
  'volatile channel made some brands and casting rooms cautious.',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5YoutubeImageRippleHardcodedMarkers.length > 0) {
  failures.push(`YouTube creator image ripple copy is still hard-coded: ${phase5YoutubeImageRippleHardcodedMarkers.join(', ')}`);
}

const phase5YoutubeImageRippleRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeImage.publicImageKey.' + publicImage)", 'YouTube image ripple public image key mapping'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.youtubeImage.news.goodHeadline'", 'YouTube image good headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.youtubeImage.news.goodSubtext')", 'YouTube image good subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeImage.log.good'", 'YouTube image good log localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.youtubeImage.news.badHeadline'", 'YouTube image bad headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.youtubeImage.news.badSubtext')", 'YouTube image bad subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.youtubeImage.log.bad')", 'YouTube image bad log localization'],
  [english, 'services.gameLoop.youtubeImage.news.goodHeadline', 'YouTube image ripple EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.youtubeImage.news.goodHeadline', 'YouTube image ripple PT keys'],
];

const missingYoutubeImageRippleRefs = phase5YoutubeImageRippleRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingYoutubeImageRippleRefs.length > 0) {
  failures.push(`YouTube creator image ripple localization refs are missing: ${missingYoutubeImageRippleRefs.join(', ')}`);
}

const phase5WellbeingAlertHardcodedMarkers = [
  "'Emergency hospital visit'",
  'Health crisis:',
  'Your team softened the damage.',
  'Without a trainer or therapist, recovery was rough.',
  'Repeated health scares are hurting your reliability.',
  'hospitalized after exhaustion scare',
  'Insiders say the schedule caught up with them',
  'Your health collapsed after repeated medical emergencies.',
  "'Urgent care recovery'",
  'Urgent care stepped in before things got worse.',
  'Team support improved the recovery.',
  'Your health is dangerously low.',
  "'Therapy crisis session'",
  "'Mental health support'",
  'Burnout hit hard.',
  'Your condition is slipping.',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5WellbeingAlertHardcodedMarkers.length > 0) {
  failures.push(`wellbeing weekly alert copy is still hard-coded: ${phase5WellbeingAlertHardcodedMarkers.join(', ')}`);
}

const phase5WellbeingAlertRefs = [
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.finance.emergencyHospital')", 'emergency hospital transaction localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.healthCrisis'", 'health crisis log localization'],
  [gameLoopSource, "t(language, totalCareSupport > 0 ? 'services.gameLoop.wellbeing.log.healthCrisis.teamSupport' : 'services.gameLoop.wellbeing.log.healthCrisis.roughRecovery')", 'health crisis support suffix localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.repeatedHealthScare')", 'repeated health scare log localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.wellbeing.news.healthScareHeadline'", 'health scare news headline localization'],
  [gameLoopSource, "subtext: t(language, 'services.gameLoop.wellbeing.news.healthScareSubtext')", 'health scare news subtext localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.healthCollapsed')", 'health collapsed log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.finance.urgentCare')", 'urgent care transaction localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.urgentCare'", 'urgent care log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.lowHealthWarning')", 'low health warning localization'],
  [gameLoopSource, "t(language, therapist ? 'services.gameLoop.wellbeing.finance.therapyCrisis' : 'services.gameLoop.wellbeing.finance.mentalHealthSupport')", 'burnout transaction localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.burnout')", 'burnout log localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.wellbeing.log.conditionWarning')", 'condition warning localization'],
  [english, 'services.gameLoop.wellbeing.finance.emergencyHospital', 'wellbeing alert EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.wellbeing.finance.emergencyHospital', 'wellbeing alert PT keys'],
];

const missingWellbeingAlertRefs = phase5WellbeingAlertRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingWellbeingAlertRefs.length > 0) {
  failures.push(`wellbeing weekly alert localization refs are missing: ${missingWellbeingAlertRefs.join(', ')}`);
}

const phase5InstagramPostConfigHardcodedMarkers = [
  "label: 'Lifestyle'",
  "shortLabel: 'Life'",
  "iconLabel: 'Life'",
  'Safe daily-life content. Slow but steady fan loyalty.',
  "label: 'Selfie'",
  'Easy personal post. Good for keeping the account warm.',
  "label: 'Photo Dump'",
  'A softer multi-photo post that builds authenticity.',
  "label: 'On Set BTS'",
  'Behind-the-scenes content. Best while filming.',
  "label: 'Celebrate Release'",
  'Turns releases and wins into fan momentum.',
  "label: 'Hot Take'",
  'Big reach, real backlash risk. Not a free growth button.',
  "label: 'Industry News'",
  'Commentary-style industry chatter.',
].filter((marker) => instagramLogicSource.includes(marker));

if (phase5InstagramPostConfigHardcodedMarkers.length > 0) {
  failures.push(`Instagram post config labels/descriptions are still hard-coded: ${phase5InstagramPostConfigHardcodedMarkers.join(', ')}`);
}

const phase5InstagramPostConfigRefs = [
  [instagramLogicSource, 'labelKey: `services.instagram.postType.${type}.label`', 'Instagram config label key generation'],
  [instagramLogicSource, 'getLocalizedInstagramPostConfig = (type: InstaPostType, language: GameLanguage)', 'localized Instagram config helper'],
  [instagramLogicSource, "label: t(language, config.labelKey)", 'localized Instagram config label'],
  [instagramLogicSource, "description: t(language, config.descriptionKey)", 'localized Instagram config description'],
  [instagramLogicSource, "INSTAGRAM_POST_TYPE_CONFIGS", 'keyed Instagram config source'],
  [instagramLogicSource, "LIFESTYLE: createInstagramPostConfig('LIFESTYLE'", 'Lifestyle keyed config'],
  [instagramLogicSource, "INDUSTRY_NEWS: createInstagramPostConfig('INDUSTRY_NEWS'", 'Industry news keyed config'],
  [instagramAppSource, "getLocalizedInstagramPostConfig(selectedPresetType, language)", 'Instagram app selected config localization'],
  [instagramAppSource, "getLocalizedInstagramPostConfig(selectedPost.type, language)", 'Instagram app post detail localization'],
  [instagramAppSource, "getLocalizedInstagramPostConfig(type, language)", 'Instagram app option localization'],
  [english, 'services.instagram.postType.LIFESTYLE.label', 'Instagram post config EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.instagram.postType.LIFESTYLE.label', 'Instagram post config PT keys'],
];

const missingInstagramPostConfigRefs = phase5InstagramPostConfigRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingInstagramPostConfigRefs.length > 0) {
  failures.push(`Instagram post config localization refs are missing: ${missingInstagramPostConfigRefs.join(', ')}`);
}

const phase5InstagramGeneratedBankHardcodedMarkers = [
  'This feels peaceful.',
  'Face card did not decline.',
  'Algorithm brought me here and I am staying.',
  'Slide three is everything.',
  'Set content finally.',
  'About time!',
  'You earned this.',
  'Stylist deserves a raise.',
  'Hard launch?',
  'This ad is too clean.',
  'Delete this before the quotes find it.',
  'The trades are going to run with this.',
  'Excited to share this!',
  'Set life. 🎬',
  'Current mood.',
  'Probably should not post this.',
].filter((marker) => instagramLogicSource.includes(marker));

if (phase5InstagramGeneratedBankHardcodedMarkers.length > 0) {
  failures.push(`Instagram generated caption/comment banks are still hard-coded: ${phase5InstagramGeneratedBankHardcodedMarkers.join(', ')}`);
}

const phase5InstagramGeneratedBankRefs = [
  [instagramLogicSource, 'const buildInstagramTextBank = (prefix: string, count: number)', 'Instagram text bank key builder'],
  [instagramLogicSource, 'COMMENT_BANK_KEYS', 'Instagram comment key bank'],
  [instagramLogicSource, 'INSTAGRAM_CAPTION_KEYS', 'Instagram caption key bank'],
  [instagramLogicSource, "t(language, key)", 'Instagram generated text localization'],
  [instagramLogicSource, 'getInstagramPresetCaption = (type: InstaPostType, language: GameLanguage = \'en\')', 'Instagram caption language parameter'],
  [instagramLogicSource, 'getInstagramPostComments = (type: InstaPostType, count = 5, language: GameLanguage = \'en\')', 'Instagram comment language parameter'],
  [instagramLogicSource, 'calculateInstagramPostOutcome = (player: Player, type: InstaPostType, postsThisWeek: number, language: GameLanguage = getPlayerLanguage(player))', 'Instagram outcome language parameter'],
  [instagramAppSource, 'getInstagramPresetCaption(selectedPresetType, language)', 'Instagram app caption language'],
  [instagramAppSource, 'getInstagramPostComments(type, 5, language)', 'Instagram app comments language'],
  [gameLoopSource, "getInstagramPostComments('INDUSTRY_NEWS', 5, language)", 'Instagram game loop industry comments language'],
  [npcLogicSource, 'const language = getPlayerLanguage(player);', 'NPC Instagram feed player language'],
  [npcLogicSource, 'getInstagramPresetCaption(type, language)', 'NPC Instagram caption language'],
  [english, 'services.instagram.caption.ANNOUNCEMENT.0', 'Instagram generated bank EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.instagram.caption.ANNOUNCEMENT.0', 'Instagram generated bank PT keys'],
];

const missingInstagramGeneratedBankRefs = phase5InstagramGeneratedBankRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingInstagramGeneratedBankRefs.length > 0) {
  failures.push(`Instagram generated caption/comment bank localization refs are missing: ${missingInstagramGeneratedBankRefs.join(', ')}`);
}

const phase5AwardSeasonHardcodedMarkers = [
  "sender: 'The Academy'",
  'subject: `NOMINATION: ${def.name}`',
  'text: `Congratulations! You have been nominated for ${awardEntries.length} awards.`',
  '`🏆 You have been nominated for the ${def.name}!`',
  'description: "Award Ceremony"',
  'headline: `${def.name} Nominations Announced!`',
  'headline: `${bestPic.projectName} wins big at ${awardShow.name}!`',
].filter((marker) => gameLoopSource.includes(marker));

if (phase5AwardSeasonHardcodedMarkers.length > 0) {
  failures.push(`award season generated copy is still hard-coded: ${phase5AwardSeasonHardcodedMarkers.join(', ')}`);
}

const phase5AwardSeasonRefs = [
  [gameLoopSource, "sender: t(language, 'services.gameLoop.awards.inbox.sender')", 'award nomination sender localization'],
  [gameLoopSource, "subject: t(language, 'services.gameLoop.awards.inbox.subject'", 'award nomination subject localization'],
  [gameLoopSource, "text: t(language, 'services.gameLoop.awards.inbox.text'", 'award nomination inbox text localization'],
  [gameLoopSource, "t(language, 'services.gameLoop.awards.log.nominated'", 'award nomination log localization'],
  [gameLoopSource, "description: t(language, 'services.gameLoop.awards.ceremony.description')", 'award ceremony description localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.awards.news.nominations'", 'award nominations news localization'],
  [gameLoopSource, "headline: t(language, 'services.gameLoop.awards.news.winner'", 'award winner news localization'],
  [english, 'services.gameLoop.awards.inbox.sender', 'award season EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.gameLoop.awards.inbox.sender', 'award season PT keys'],
];

const missingAwardSeasonRefs = phase5AwardSeasonRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingAwardSeasonRefs.length > 0) {
  failures.push(`award season generated copy localization refs are missing: ${missingAwardSeasonRefs.join(', ')}`);
}

const phase5HealthConditionHardcodedMarkers = [
  "label: 'Workload Headache'",
  "summary: 'Too many stressful weeks are causing headaches and poor focus.'",
  "label: 'Flu / Minor Illness'",
  "label: 'Burnout Spiral'",
  "label: 'Nightlife Accident'",
  "label: 'Fracture / Stunt Injury'",
  "label: 'Respiratory Complication'",
  "label: 'Cancer Scare'",
  "label: 'Chronic Pain'",
  "label: 'Exhaustion Collapse'",
  "label: 'Old Age Complication'",
  "sender: 'Medical Team'",
  'needs attention',
  'Wellness now has treatment routes',
  'dealing with ${condition.label.toLowerCase()}',
  'The story is spreading because the health issue',
  'Medical attention may be needed.',
  'cleared after recovery time.',
  'worsened into',
  'A severe untreated health condition became fatal.',
].filter((marker) => healthConditionsSource.includes(marker));

if (phase5HealthConditionHardcodedMarkers.length > 0) {
  failures.push(`health condition generated copy is still hard-coded: ${phase5HealthConditionHardcodedMarkers.join(', ')}`);
}

const phase5HealthConditionRefs = [
  [healthConditionsSource, "labelKey: 'services.health.condition.workload_headache.label'", 'health condition label keys'],
  [healthConditionsSource, "summaryKey: 'services.health.condition.workload_headache.summary'", 'health condition summary keys'],
  [healthConditionsSource, 'getHealthConditionLabel = (conditionOrId:', 'health condition label helper'],
  [healthConditionsSource, 'getHealthConditionSummary = (conditionOrId:', 'health condition summary helper'],
  [healthConditionsSource, 'labelKey: definition.labelKey', 'health condition state label key'],
  [healthConditionsSource, "t(language, 'services.health.incident.log.added'", 'health incident log localization'],
  [healthConditionsSource, "sender: t(language, 'services.health.inbox.sender')", 'health inbox sender localization'],
  [healthConditionsSource, "subject: t(language, 'services.health.inbox.subject'", 'health inbox subject localization'],
  [healthConditionsSource, "headline: t(language, 'services.health.news.incidentHeadline'", 'health incident news headline localization'],
  [healthConditionsSource, "message: t(language, 'services.health.weekly.newCondition'", 'health weekly new condition log localization'],
  [healthConditionsSource, "message: t(language, 'services.health.weekly.recovered'", 'health recovery log localization'],
  [healthConditionsSource, "message: t(language, 'services.health.weekly.worsened'", 'health worsened log localization'],
  [healthConditionsSource, "message: t(language, 'services.health.weekly.fatal')", 'health fatal log localization'],
  [english, 'services.health.condition.workload_headache.label', 'health condition EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.health.condition.workload_headache.label', 'health condition PT keys'],
];

const missingHealthConditionRefs = phase5HealthConditionRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingHealthConditionRefs.length > 0) {
  failures.push(`health condition localization refs are missing: ${missingHealthConditionRefs.join(', ')}`);
}

const phase5RomanceCoverageHardcodedMarkers = [
  "'s relationship update just turned painfully public.",
  "'s romantic life is turning into scandal bait again.",
  "'s love life is suddenly the timeline's favorite mess.",
  "'s love life turns into a two-name problem",
  'is accused of keeping multiple romances alive at once',
  'turns a private split into public theater',
  'is seen reconnecting with ex',
  'leans into dating rumors instead of denying them',
  'denial only fuels the dating leak harder',
].filter((marker) => lifeEventLogicSource.includes(marker));

if (phase5RomanceCoverageHardcodedMarkers.length > 0) {
  failures.push(`romance coverage generated copy is still hard-coded: ${phase5RomanceCoverageHardcodedMarkers.join(', ')}`);
}

const phase5RomanceCoverageRefs = [
  [lifeEventLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'life event logic i18n import'],
  [lifeEventLogicSource, 'headlineKey: string', 'romance coverage headline key parameter'],
  [lifeEventLogicSource, "headline: t(language, headlineKey, textVars)", 'romance coverage headline localization'],
  [lifeEventLogicSource, "subtext: t(language, subtextKey, textVars)", 'romance coverage subtext localization'],
  [lifeEventLogicSource, "t(language, `services.lifeEvent.relationship.coverage.x.${tone}`", 'romance X post localization'],
  [lifeEventLogicSource, "'services.lifeEvent.relationship.coverage.jealousyAdmit.headline'", 'jealousy admit coverage localization'],
  [lifeEventLogicSource, "'services.lifeEvent.relationship.coverage.screenshotBlame.headline'", 'screenshot blame coverage localization'],
  [english, 'services.lifeEvent.relationship.coverage.x.MESS', 'romance coverage EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifeEvent.relationship.coverage.x.MESS', 'romance coverage PT keys'],
];

const missingRomanceCoverageRefs = phase5RomanceCoverageRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingRomanceCoverageRefs.length > 0) {
  failures.push(`romance coverage localization refs are missing: ${missingRomanceCoverageRefs.join(', ')}`);
}

const phase5LegalCaseNewsHardcodedMarkers = [
  'wins ${c.title}',
  'loses ${c.title}',
  'The courtroom drama ends in their favor.',
  'The judgment costs',
].filter((marker) => lifeEventLogicSource.includes(marker));

if (phase5LegalCaseNewsHardcodedMarkers.length > 0) {
  failures.push(`legal case result news copy is still hard-coded: ${phase5LegalCaseNewsHardcodedMarkers.join(', ')}`);
}

const phase5LegalCaseNewsRefs = [
  [lifeEventLogicSource, "headline: t(language, 'services.lifeEvent.legal.news.wonHeadline'", 'legal case won headline localization'],
  [lifeEventLogicSource, "subtext: t(language, 'services.lifeEvent.legal.news.wonSubtext')", 'legal case won subtext localization'],
  [lifeEventLogicSource, "headline: t(language, 'services.lifeEvent.legal.news.lostHeadline'", 'legal case lost headline localization'],
  [lifeEventLogicSource, "subtext: t(language, 'services.lifeEvent.legal.news.lostSubtext'", 'legal case lost subtext localization'],
  [english, 'services.lifeEvent.legal.news.wonHeadline', 'legal case news EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.lifeEvent.legal.news.wonHeadline', 'legal case news PT keys'],
];

const missingLegalCaseNewsRefs = phase5LegalCaseNewsRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLegalCaseNewsRefs.length > 0) {
  failures.push(`legal case result news localization refs are missing: ${missingLegalCaseNewsRefs.join(', ')}`);
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

const phase5BusinessWizardHardcodedMarkers = [
  'Insufficient funds!',
  'Founded ${newBiz.name}',
  'Total Capital',
  'New Venture',
  'Select Industry',
  'Business Model',
  'Next Step',
  'Interior Vibe',
  'Included',
  'Facilities',
  'Setup</div>',
  'Production Quality',
  'Brand Name',
  'e.g. Luxe & Co.',
  'Summary includes',
  'custom interior',
  'standard setup',
  'Launch Venture',
  '{bp.name}',
  '{bp.description}',
  '{theme.label}',
  '{amen.label}',
  '{prod.label}',
  '{prod.description}',
].filter((marker) => businessWizardSource.includes(marker));

if (phase5BusinessWizardHardcodedMarkers.length > 0) {
  failures.push(`business wizard setup/catalog UI is still hard-coded: ${phase5BusinessWizardHardcodedMarkers.join(', ')}`);
}

const phase5BusinessWizardRefs = [
  [businessWizardSource, "import { getPlayerLanguage, t } from '../../../services/i18n'", 'business wizard t import'],
  [businessWizardSource, "tr('services.business.wizard.newVenture')", 'wizard title localization'],
  [businessWizardSource, "tr('services.business.wizard.summary'", 'summary localization'],
  [businessWizardSource, "getBusinessBlueprintName(bp.type)", 'blueprint name localization'],
  [businessWizardSource, "getBusinessBlueprintDescription(bp.type)", 'blueprint description localization'],
  [businessWizardSource, "getBusinessSubtypeLabel(sub)", 'business subtype localization'],
  [businessWizardSource, "getBusinessThemeLabel(theme.id)", 'theme label localization'],
  [businessWizardSource, "getBusinessAmenityLabel(amen.id)", 'amenity label localization'],
  [businessWizardSource, "getBusinessProductionTypeLabel(prod.id)", 'production type label localization'],
  [businessWizardSource, "getBusinessProductionTypeDescription(prod.id)", 'production type description localization'],
];

const missingBusinessWizardRefs = phase5BusinessWizardRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessWizardRefs.length > 0) {
  failures.push(`business wizard localization refs are missing: ${missingBusinessWizardRefs.join(', ')}`);
}

const phase5ProductionWizardHardcodedMarkers = [
  '"The Next Cinematic Universe"',
  '"The Next Avatar"',
  '"They said you were too young to understand the business."',
  '"The tabloids call you a liability."',
  '"Decades of reading other people',
  '"The critics don',
  '>Grand Opening</div>',
  '>Major Investment</h3>',
  'This action requires a capital injection of',
  'This transfer is irreversible. Are you ready to become a Mogul?',
  '>Sign The Check</button>',
  '>Not Yet</button>',
  '> Elite Tier',
  '>READY</div>',
  'Production<br/>House',
  'Create <span',
  '>Target Capital</div>',
  "? 'Fully Funded' : 'Remaining'",
  '<span>LIQUID:',
  '>100% Profits</span>',
  '>Own IP</span>',
  '>Cast Stars</span>',
  'Initialize Setup <ArrowRight',
  '<Lock size={16}/> Insufficient Funds',
  '>Premium Setup</div>',
  'Articles of<br/>Incorporation',
  '>Article I: Identity</div>',
  'I, the undersigned, hereby establish a new media entity for the purpose of global entertainment domination.',
  '>Corporate Entity Name</label>',
  'placeholder="ENTER NAME HERE"',
  'Proceed to Schedule A <ArrowRight',
  '>Schedule A: Executive Appointment</div>',
  'GRAND OPENING: ${name} Production House established! ${hopName} hired as Head of Production.',
  '${player.name} launches ${name} Studios with $50M investment.',
  'Industry experts call it a bold move.',
  'Select an initial Head of Production to oversee studio operations.',
  '{cand.name}',
  '{cand.bonus}',
  '{cand.description}',
  '>Founder Signature</span>',
  '>Capital Commitment</div>',
  'Click to<br/>Sign & Ratify',
  '>APPROVED</div>',
  "step === 1 ? 'Waiting for entity name...'",
  "? 'Signing document...'",
  "? 'Finalizing...'",
  ": 'Waiting for executive appointment...'",
].filter((marker) => productionWizardSource.includes(marker));

if (phase5ProductionWizardHardcodedMarkers.length > 0) {
  failures.push(`production wizard head-of-production localization is still hard-coded: ${phase5ProductionWizardHardcodedMarkers.join(', ')}`);
}

const phase5ProductionWizardRefs = [
  [productionWizardSource, "import { getPlayerLanguage, t } from '../../../services/i18n'", 'production wizard t import'],
  [productionWizardSource, "getProductionDream(index)", 'dream carousel localization'],
  [productionWizardSource, "tr('services.business.productionWizard.origin.young.1')", 'young origin localization'],
  [productionWizardSource, "tr('services.business.productionWizard.origin.lowRep.1')", 'low reputation origin localization'],
  [productionWizardSource, "tr('services.business.productionWizard.origin.veteran.1')", 'veteran origin localization'],
  [productionWizardSource, "tr('services.business.productionWizard.origin.default.1')", 'default origin localization'],
  [productionWizardSource, "tr('services.business.productionWizard.launchAnimation.grandOpening')", 'launch animation localization'],
  [productionWizardSource, "tr('services.business.productionWizard.modal.majorInvestment')", 'investment modal title localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.eliteTier')", 'elite tier localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.ready')", 'ready badge localization'],
  [productionWizardSource, "tr('lifestyle.productionHouse')", 'production house title localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.create')", 'create label localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.targetCapital')", 'target capital localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.fullyFunded')", 'fully funded localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.remaining')", 'remaining localization'],
  [productionWizardSource, "tr('services.business.productionWizard.feature.profits')", 'profits feature localization'],
  [productionWizardSource, "tr('services.business.productionWizard.feature.ownIp')", 'own IP feature localization'],
  [productionWizardSource, "tr('services.business.productionWizard.feature.castStars')", 'cast stars feature localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.initializeSetup')", 'initialize setup localization'],
  [productionWizardSource, "tr('services.business.productionWizard.gate.insufficientFunds')", 'insufficient funds localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.premiumSetup')", 'premium setup localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.articlesTitle')", 'articles title localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.articleIdentity')", 'article identity localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.identityBody')", 'identity body localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.entityName')", 'entity name localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.entityPlaceholder')", 'entity placeholder localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.proceedScheduleA')", 'proceed schedule localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.scheduleA')", 'schedule A localization'],
  [productionWizardSource, "tr('services.business.productionWizard.launchLog'", 'production launch log localization'],
  [productionWizardSource, "tr('services.business.productionWizard.launchHeadline'", 'production launch headline localization'],
  [productionWizardSource, "tr('services.business.productionWizard.launchSubtext')", 'production launch subtext localization'],
  [productionWizardSource, "tr('services.business.productionWizard.selectHeadOfProduction')", 'production head helper text localization'],
  [productionWizardSource, "getHeadOfProductionName(cand.id)", 'head of production name localization'],
  [productionWizardSource, "getHeadOfProductionBonus(cand.id)", 'head of production bonus localization'],
  [productionWizardSource, "getHeadOfProductionDescription(cand.id)", 'head of production description localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.founderSignature')", 'founder signature localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.capitalCommitment')", 'capital commitment localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.signAndRatify')", 'sign and ratify localization'],
  [productionWizardSource, "tr('services.business.productionWizard.document.approved')", 'approved stamp localization'],
  [productionWizardSource, "getDocumentStatusText()", 'document status localization'],
];

const missingProductionWizardRefs = phase5ProductionWizardRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingProductionWizardRefs.length > 0) {
  failures.push(`production wizard localization refs are missing: ${missingProductionWizardRefs.join(', ')}`);
}

const phase5ProductionFinanceHardcodedMarkers = [
  'Enter a valid amount to inject.',
  'Not enough personal cash to inject that amount.',
  'Owner capital injection',
  'Enter a valid amount to withdraw.',
  'Studio capital is lower than that withdrawal amount.',
  'Owner withdrawal',
  '>Manage Studio Funds</h3>',
  '>Personal Cash</div>',
  '>Studio Capital</div>',
  'Prod. Fund',
  '>Amount</label>',
  'Available: {formatMoney(player.money)} personal',
  'Parsed: {formatMoney(amount)}',
  '>Withdraw</button>',
  'Inject <ArrowLeft',
  'studio receipts',
  "case 'THEATRICAL': return 'Theatrical'",
  "case 'STREAMING_DEAL': return 'Platform Deal'",
  "case 'CAPITAL_INJECTION': return 'Injection'",
  "case 'CAPITAL_WITHDRAWAL': return 'Withdrawal'",
  "case 'FUNDING_SURPLUS': return 'Surplus'",
  '`Y${year} • W${week}`',
  '`Y${year} • Archive`',
  '>Manage Funds</button>',
  '>Finance Dept</h1>',
  '>Corporate Accounting</div>',
  '>P&L Statement</h3>',
  '>This Week</div>',
  '>Studio Receipts</div>',
  '>Operating Costs</div>',
  '>Net Profit</div>',
  'Project tiles show',
  '>Revenue Breakdown</h3>',
  '>Project Gross</div>',
  '>Estimated Studio Receipts</div>',
  '>Library ROI</div>',
  '>Balance Sheet</h3>',
  '>Cash</div>',
  '>Total Valuation</div>',
  '>Lifetime Revenue</div>',
  '>Studio Passbook</h3>',
  'Cash movement by period.',
  "label: '3 Mo'",
  "label: '1 Yr'",
  "label: 'All'",
  '>Money In</div>',
  '>Money Out</div>',
  '>Net Flow</div>',
  'Project Ref •',
  'Studio cash entry',
  "? 'Credit' : 'Debit'",
  'No ledger entries in this period',
  'Try switching to a wider range',
  '>Load Older Entries</button>',
  '>Exit Strategy</h3>',
  '>Sell Studio</div>',
  '>Shut Down & Liquidate</div>',
  'Close operations. Assets sold for scrap.',
  "? 'Sell Studio' : 'Shut Down'",
  'Studio cash is already included in valuation',
  'Assets will be liquidated for scrap value. This cannot be undone.',
  '>Cash Balance</span>',
  "? 'Valuation' : 'Scrap Value'",
  '>Net Payout</span>',
  '>Cancel</button>',
  '>Confirm</button>',
].filter((marker) => productionHouseSource.includes(marker));

if (phase5ProductionFinanceHardcodedMarkers.length > 0) {
  failures.push(`production house finance/passbook UI is still hard-coded: ${phase5ProductionFinanceHardcodedMarkers.join(', ')}`);
}

const phase5ProductionFinanceRefs = [
  [productionHouseSource, "tr('services.business.productionFinance.modal.title')", 'funds modal title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.error.invalidInject')", 'inject error localization'],
  [productionHouseSource, "tr('services.business.productionFinance.ledger.ownerInjection')", 'owner injection ledger localization'],
  [productionHouseSource, "tr('services.business.productionFinance.modal.personalCash')", 'personal cash localization'],
  [productionHouseSource, "tr('services.business.productionFinance.modal.available'", 'available funds localization'],
  [productionHouseSource, "tr('services.business.productionFinance.modal.withdraw')", 'withdraw localization'],
  [productionHouseSource, "tr('services.business.productionFinance.modal.inject')", 'inject localization'],
  [productionHouseSource, "tr('services.business.productionFinance.ledger.type.theatrical')", 'ledger type localization'],
  [productionHouseSource, "tr('services.business.productionFinance.ledger.date.week'", 'ledger week localization'],
  [productionHouseSource, "getLedgerEntryLabel(entry)", 'ledger entry label localization'],
  [productionHouseSource, "tr('services.business.productionFinance.header.manageFunds')", 'manage funds localization'],
  [productionHouseSource, "tr('services.business.productionFinance.header.title')", 'finance title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.pnl.title')", 'pnl title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.breakdown.title')", 'breakdown title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.balance.title')", 'balance title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.passbook.title')", 'passbook title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.passbook.range.threeMonths')", 'range localization'],
  [productionHouseSource, "tr('services.business.productionFinance.passbook.credit')", 'credit localization'],
  [productionHouseSource, "tr('services.business.productionFinance.exit.title')", 'exit title localization'],
  [productionHouseSource, "tr('services.business.productionFinance.exit.sellStudio')", 'sell studio localization'],
  [productionHouseSource, "tr('services.business.productionFinance.exit.confirmSell'", 'confirm sell localization'],
  [productionHouseSource, "tr('services.business.productionFinance.exit.netPayout')", 'net payout localization'],
];

const missingProductionFinanceRefs = phase5ProductionFinanceRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingProductionFinanceRefs.length > 0) {
  failures.push(`production house finance localization refs are missing: ${missingProductionFinanceRefs.join(', ')}`);
}

const phase5ProductionDashboardHardcodedMarkers = [
  "? 'Major' : 'Indie'",
  "? 'Hollywood, CA' : 'Burbank, CA'",
  '>Studio Valuation</div>',
  '>Avg Rating</span>',
  '>Awards Won</span>',
  '>Total Films</span>',
  '>Lifetime B.O.</span>',
  '>Prestige</span>',
  '>Outside Productions</h2>',
  "Producer shares you bought in other companies' films.",
  'Net {formatMoney(outsideProducerProfit)}',
  '% share • {item.status}',
  '>Invested</div>',
  '>Payout</div>',
  '>Owner</div>',
  '>Reputation</div>',
  'Profit {formatMoney(item.profit || 0)} from producer receipts.',
  'Expected release: Y{item.releaseYear} W{item.releaseWeek}.',
  'Studio Control Console',
  'subtitle="Scripts & IP"',
  'subtitle="Upgrades"',
  'subtitle="Farm System"',
  'subtitle="P&L & Capital"',
  'label: "Scripts"',
  'label: "Tier"',
  'label: "Stars"',
  'label: "Capital"',
  'eyebrow="Group Command"',
  'title="Studio Group"',
  'subtitle="Manage Subsidiaries"',
  'label: "Owned Studios"',
  'label: "Group Value"',
].filter((marker) => productionHouseSource.includes(marker));

if (phase5ProductionDashboardHardcodedMarkers.length > 0) {
  failures.push(`production house dashboard overview UI is still hard-coded: ${phase5ProductionDashboardHardcodedMarkers.join(', ')}`);
}

const phase5ProductionDashboardRefs = [
  [productionHouseSource, "getStudioSubtypeLabel(studio.subtype)", 'studio subtype localization'],
  [productionHouseSource, "getStudioLocationLabel(studio.subtype)", 'studio location localization'],
  [productionHouseSource, "tr('services.business.productionDashboard.studioValuation')", 'studio valuation localization'],
  [productionHouseSource, "tr('services.business.productionDashboard.metric.avgRating')", 'avg rating localization'],
  [productionHouseSource, "tr('services.business.productionDashboard.console.eyebrow')", 'console eyebrow localization'],
  [productionHouseSource, "tr('services.business.productionDashboard.division.devSubtitle')", 'dev division subtitle localization'],
  [productionHouseSource, "tr('services.business.productionDashboard.division.groupTitle')", 'group title localization'],
];

const missingProductionDashboardRefs = phase5ProductionDashboardRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingProductionDashboardRefs.length > 0) {
  failures.push(`production house dashboard localization refs are missing: ${missingProductionDashboardRefs.join(', ')}`);
}

const phase5DevelopmentLabShellHardcodedMarkers = [
  'Character IP',
  'Story World IP',
  'Development Lab',
  'Where ideas become scripts',
  "{ id: 'VAULT', label: 'Vault'",
  "{ id: 'SCRIPTS', label: 'Scripts'",
  'No owned IP yet',
  'IP Library',
  'Concept Basics',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5DevelopmentLabShellHardcodedMarkers.length > 0) {
  failures.push(`development lab shell copy is still hard-coded: ${phase5DevelopmentLabShellHardcodedMarkers.join(', ')}`);
}

const phase5DevelopmentLabShellRefs = [
  [developmentLabSource, "tr('developmentLab.title')", 'development lab title localization'],
  [developmentLabSource, "labelKey: 'developmentLab.tab.vault'", 'development lab tab labels localized'],
  [developmentLabSource, "t(language, 'developmentLab.ipType.CHARACTER')", 'development lab IP type localization'],
  [developmentLabSource, "tr('developmentLab.vault.noOwnedIp')", 'development lab vault empty state localization'],
  [developmentLabSource, "tr('developmentLab.builder.step.idea.label')", 'development lab builder step localization'],
  [english, 'developmentLab.title', 'Development Lab EN keys'],
  [translations.get('pt-BR') || new Map(), 'developmentLab.title', 'Development Lab PT keys'],
];

const missingDevelopmentLabShellRefs = phase5DevelopmentLabShellRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDevelopmentLabShellRefs.length > 0) {
  failures.push(`development lab shell localization refs are missing: ${missingDevelopmentLabShellRefs.join(', ')}`);
}

const phase5DevelopmentLabMarketHardcodedMarkers = [
  'Scripts & Story Rights',
  'Buy finished screenplays or secure books',
  'Market refreshes in',
  'Refresh Now ($250,000)',
  "{ id: 'TRENDING', label: 'Trending'",
  'Novel',
  'By {script.author}',
  'Rights Cost',
  'Potential',
  "canAfford ? 'Acquire Rights' : 'Insufficient Funds'",
  'No items found in this category',
  'Force Refresh Market ($250,000)',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5DevelopmentLabMarketHardcodedMarkers.length > 0) {
  failures.push(`development lab source market copy is still hard-coded: ${phase5DevelopmentLabMarketHardcodedMarkers.join(', ')}`);
}

const phase5DevelopmentLabMarketRefs = [
  [developmentLabSource, "tr('developmentLab.market.sourceTitle')", 'source market title localization'],
  [developmentLabSource, "labelKey: 'developmentLab.market.filter.trending'", 'source market filter localization'],
  [developmentLabSource, "tr('developmentLab.market.refreshNow'", 'source market refresh localization'],
  [developmentLabSource, "tr('developmentLab.market.acquireRights')", 'source market buy action localization'],
  [english, 'developmentLab.market.sourceTitle', 'source market EN keys'],
  [translations.get('pt-BR') || new Map(), 'developmentLab.market.sourceTitle', 'source market PT keys'],
];

const missingDevelopmentLabMarketRefs = phase5DevelopmentLabMarketRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDevelopmentLabMarketRefs.length > 0) {
  failures.push(`development lab source market localization refs are missing: ${missingDevelopmentLabMarketRefs.join(', ')}`);
}

const phase5DevelopmentLabFranchiseHardcodedMarkers = [
  'Reboot In Development',
  'A new era is already being written',
  'Audience is hungry',
  'Franchise Candidate',
  'installments •',
  'Avg Rating',
  'Audience Pulse',
  'Returning Cast Preview',
  'Played by',
  'Next Move',
  'Start Franchise (Sequel)',
  'Choose the working title for the next',
  'Studio Franchises',
  'Franchise Candidates',
  'No Franchises Established',
  'Apparel & Fashion',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5DevelopmentLabFranchiseHardcodedMarkers.length > 0) {
  failures.push(`development lab franchise copy is still hard-coded: ${phase5DevelopmentLabFranchiseHardcodedMarkers.join(', ')}`);
}

const phase5DevelopmentLabFranchiseRefs = [
  [developmentLabSource, "tr('developmentLab.franchise.lifecycle.rebootPending.label')", 'franchise lifecycle localization'],
  [developmentLabSource, "tr('developmentLab.franchise.pulse.hot.verdict')", 'franchise pulse localization'],
  [developmentLabSource, "tr('developmentLab.franchise.metric.health')", 'franchise metrics localization'],
  [developmentLabSource, "tr('developmentLab.franchise.action.nextMove')", 'franchise action heading localization'],
  [developmentLabSource, "tr('developmentLab.franchise.dialog.title'", 'franchise dialog localization'],
  [developmentLabSource, "tr('developmentLab.franchise.empty.title')", 'franchise empty state localization'],
  [developmentLabSource, 'getUniverseProductName(bp.id)', 'universe product blueprint names localized'],
  [english, 'developmentLab.franchise.lifecycle.rebootPending.label', 'franchise EN lifecycle keys'],
  [english, 'developmentLab.franchise.pulse.hot.verdict', 'franchise EN pulse keys'],
  [english, 'developmentLab.franchise.empty.title', 'franchise EN empty keys'],
  [translations.get('pt-BR') || new Map(), 'developmentLab.franchise.lifecycle.rebootPending.label', 'franchise PT lifecycle keys'],
  [translations.get('pt-BR') || new Map(), 'developmentLab.franchise.pulse.hot.verdict', 'franchise PT pulse keys'],
  [translations.get('pt-BR') || new Map(), 'developmentLab.franchise.empty.title', 'franchise PT empty keys'],
];

const missingDevelopmentLabFranchiseRefs = phase5DevelopmentLabFranchiseRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDevelopmentLabFranchiseRefs.length > 0) {
  failures.push(`development lab franchise localization refs are missing: ${missingDevelopmentLabFranchiseRefs.join(', ')}`);
}

const phase5GreenlightChoiceHardcodedMarkers = [
  'Trailer and digital essentials.',
  'Best Fit',
  'Reserved Campaign Budget',
  'Set aside marketing money now.',
  "['Auto', 'Game picks the best plan",
  "{ id: 'AUTO', label: 'Auto', hint: 'Best fit' }",
  "label: 'Lead Deal'",
  'Lead Investor Offers',
  'Syndicate Offers',
  "{selectedInvestorPlan?.commitments.length || 0} selected",
  'No artists match this search.',
].filter((marker) => greenlightWizardSource.includes(marker));

if (phase5GreenlightChoiceHardcodedMarkers.length > 0) {
  failures.push(`greenlight choice control copy is still hard-coded: ${phase5GreenlightChoiceHardcodedMarkers.join(', ')}`);
}

const phase5GreenlightChoiceRefs = [
  [greenlightWizardSource, "tr('greenlight.marketing.reservedCampaignBudget')", 'greenlight marketing heading localization'],
  [greenlightWizardSource, "tr(`greenlight.marketing.preset.${option.id}.label`)", 'greenlight marketing preset localization'],
  [greenlightWizardSource, "tr(`greenlight.music.sort.${option.id}`)", 'greenlight music sort localization'],
  [greenlightWizardSource, "tr(`greenlight.connectedIntent.${option.id}.label`)", 'greenlight connected intent localization'],
  [greenlightWizardSource, "tr('greenlight.investors.mode.lead.label')", 'greenlight investor mode localization'],
  [greenlightWizardSource, "tr('greenlight.investors.offers.selected'", 'greenlight investor selection localization'],
  [english, 'greenlight.marketing.reservedCampaignBudget', 'greenlight EN marketing keys'],
  [english, 'greenlight.connectedIntent.AUTO.label', 'greenlight EN connected intent keys'],
  [english, 'greenlight.investors.mode.lead.label', 'greenlight EN investor keys'],
  [translations.get('pt-BR') || new Map(), 'greenlight.marketing.reservedCampaignBudget', 'greenlight PT marketing keys'],
  [translations.get('pt-BR') || new Map(), 'greenlight.connectedIntent.AUTO.label', 'greenlight PT connected intent keys'],
  [translations.get('pt-BR') || new Map(), 'greenlight.investors.mode.lead.label', 'greenlight PT investor keys'],
];

const missingGreenlightChoiceRefs = phase5GreenlightChoiceRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingGreenlightChoiceRefs.length > 0) {
  failures.push(`greenlight choice control localization refs are missing: ${missingGreenlightChoiceRefs.join(', ')}`);
}

const phase5OwnedStudioCommandHardcodedMarkers = [
  "PENDING: { label: 'Board Review'",
  "PENDING: { label: 'Action Needed'",
  'Studio Command Center',
  'Owned Studio',
  'Decision Required',
  "['COMMAND', 'Command Deck']",
  'Live Consequences',
  'Active Storylines',
  'People Risk',
  'Talent Stability',
  'Change Operating Model',
  'Model-Aware Command',
  'Greenlight Project',
  'Open Development Lab',
  'Browse Catalog/IP',
  'Rights Vault',
  'Catalog & IP',
  'No catalog records yet.',
].filter((marker) => ownedStudioCommandSource.includes(marker));

if (phase5OwnedStudioCommandHardcodedMarkers.length > 0) {
  failures.push(`owned studio command center copy is still hard-coded: ${phase5OwnedStudioCommandHardcodedMarkers.join(', ')}`);
}

const phase5OwnedStudioCommandRefs = [
  [ownedStudioCommandSource, "tr('ownedStudio.header.title')", 'owned studio header localization'],
  [ownedStudioCommandSource, "tr(`ownedStudio.status.proposal.${proposal.status}`)", 'owned studio proposal status localization'],
  [ownedStudioCommandSource, "tr(`ownedStudio.deck.${id}`)", 'owned studio deck localization'],
  [ownedStudioCommandSource, "tr('ownedStudio.command.greenlightProject')", 'owned studio greenlight CTA localization'],
  [ownedStudioCommandSource, "tr(`ownedStudio.workbench.${tab}`)", 'owned studio workbench localization'],
  [ownedStudioCommandSource, "tr('ownedStudio.ip.noCatalog')", 'owned studio IP empty localization'],
  [english, 'ownedStudio.header.title', 'owned studio EN header keys'],
  [english, 'ownedStudio.status.proposal.PENDING', 'owned studio EN status keys'],
  [english, 'ownedStudio.workbench.VAULT', 'owned studio EN workbench keys'],
  [translations.get('pt-BR') || new Map(), 'ownedStudio.header.title', 'owned studio PT header keys'],
  [translations.get('pt-BR') || new Map(), 'ownedStudio.status.proposal.PENDING', 'owned studio PT status keys'],
  [translations.get('pt-BR') || new Map(), 'ownedStudio.workbench.VAULT', 'owned studio PT workbench keys'],
];

const missingOwnedStudioCommandRefs = phase5OwnedStudioCommandRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingOwnedStudioCommandRefs.length > 0) {
  failures.push(`owned studio command center localization refs are missing: ${missingOwnedStudioCommandRefs.join(', ')}`);
}

const phase5UniverseMerchHardcodedMarkers = [
  'name: blueprint.name',
  'message: `🌐 Launched ${blueprint.name}',
  'Studio Capital Payout',
  'Merch and licensing pays into your production house',
  'Catalog Heat',
  'Payout Rate',
  'Last Paid',
  'Next Week',
  'Lifetime Revenue',
  'Active Licenses',
  'Active Products & Lands',
  'No active merchandising or theme park licenses.',
  'Base: {formatCurrency(prod.sellingPrice)}',
  'Projected: {formatCurrency(projectedRevenue)}',
  'Launch New Venture',
  'bp.name',
  'bp.description',
  "archiveLocked ? 'Archive Locked'",
  "isOwned ? 'Already Launched'",
  "canAfford ? 'Launch Venture'",
  "canAfford ? 'Launch Venture' : 'Insufficient Funds'",
].filter((marker) => developmentLabSource.includes(marker));

if (phase5UniverseMerchHardcodedMarkers.length > 0) {
  failures.push(`universe merch/licensing UI is still hard-coded: ${phase5UniverseMerchHardcodedMarkers.join(', ')}`);
}

const phase5UniverseMerchRefs = [
  [developmentLabSource, "import { getPlayerLanguage, t } from '../../../services/i18n'", 'development lab t import'],
  [developmentLabSource, "tr('services.business.universeMerch.studioCapitalPayout')", 'studio capital payout localization'],
  [developmentLabSource, "tr('services.business.universeMerch.activity.legacy')", 'activity note localization'],
  [developmentLabSource, "getUniverseProductName(blueprint.id)", 'launch log product localization'],
  [developmentLabSource, "getUniverseProductName(prod.catalogId)", 'active product name localization'],
  [developmentLabSource, "getUniverseProductDescription(bp.id)", 'blueprint description localization'],
  [developmentLabSource, "tr('services.business.universeMerch.log.launched'", 'launch log localization'],
  [developmentLabSource, "tr('services.business.universeMerch.status.archiveLocked')", 'archive locked status localization'],
];

const missingUniverseMerchRefs = phase5UniverseMerchRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseMerchRefs.length > 0) {
  failures.push(`universe merch/licensing localization refs are missing: ${missingUniverseMerchRefs.join(', ')}`);
}

const phase5UniverseLifecycleHardcodedMarkers = [
  'announces Phase ${nextPhaseNum}',
  'The studio reveals the next chapter of their cinematic universe.',
  'concludes, announces Saga ${nextSagaNum}',
  'An era ends, and a new one begins for the massive franchise.',
  'enters the legacy archive.',
  'The studio is preserving the full canon while closing new phases and event films for now.',
  'entered the legacy archive. History stays visible and reboot rights remain open.',
  'gets a reboot era.',
  'reopens the canon while keeping the original timeline in the archive.',
  'launched as a reboot script for',
  "setSagaName('Reboot Era')",
  "setPhaseName('Phase 1: Reintroduction')",
].filter((marker) => developmentLabSource.includes(marker));

if (phase5UniverseLifecycleHardcodedMarkers.length > 0) {
  failures.push(`universe lifecycle generated news/logs are still hard-coded: ${phase5UniverseLifecycleHardcodedMarkers.join(', ')}`);
}

const phase5UniverseLifecycleRefs = [
  [developmentLabSource, "tr('services.business.universeLifecycle.news.phaseHeadline'", 'phase news headline localization'],
  [developmentLabSource, "tr('services.business.universeLifecycle.news.sagaHeadline'", 'saga news headline localization'],
  [developmentLabSource, "tr('services.business.universeLifecycle.news.archiveHeadline'", 'archive news headline localization'],
  [developmentLabSource, "tr('services.business.universeLifecycle.log.archive'", 'archive log localization'],
  [developmentLabSource, "tr('services.business.universeLifecycle.news.rebootHeadline'", 'reboot news headline localization'],
  [developmentLabSource, "tr('services.business.universeLifecycle.log.reboot'", 'reboot log localization'],
  [developmentLabSource, "getSagaLabel(nextSagaNum)", 'saga label helper'],
  [developmentLabSource, "getPhaseLabel(nextPhaseNum)", 'phase label helper'],
];

const missingUniverseLifecycleRefs = phase5UniverseLifecycleRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseLifecycleRefs.length > 0) {
  failures.push(`universe lifecycle localization refs are missing: ${missingUniverseLifecycleRefs.join(', ')}`);
}

const phase5UniverseLogicHardcodedMarkers = [
  'canon is active in the global industry',
  'is part of the ${template.name} canon',
  'Unknown Actor',
  'Untitled Universe',
  'A player-created cinematic universe',
  'Universe retired',
  'Universe rebooted',
  'entered the legacy archive',
  'relaunched with',
  'A new creative era reintroduces',
  'Universe Cameo',
  'Franchise Lead',
  'No release history',
  'Fresh releases',
  'Cooling down',
  'Dormant catalog',
  'No recent releases',
  'Fans Demand',
  'Unveils',
  'Lead Character',
  'Played by',
].filter((marker) => universeLogicSource.includes(marker));

if (phase5UniverseLogicHardcodedMarkers.length > 0) {
  failures.push(`universe runtime/generated copy is still hard-coded: ${phase5UniverseLogicHardcodedMarkers.join(', ')}`);
}

const phase5UniverseLogicRefs = [
  [universeLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'universe logic i18n import'],
  [universeLogicSource, "universeText(language, 'character.canonDescription'", 'canon character description localization'],
  [universeLogicSource, "universeText(language, 'universe.templateDescription'", 'template universe description localization'],
  [universeLogicSource, "universeText(language, 'lifecycle.archiveLabel'", 'archive lifecycle label localization'],
  [universeLogicSource, "universeText(language, 'script.rebootLogline'", 'reboot script logline localization'],
  [universeLogicSource, "universeText(language, 'opportunity.universeCameo')", 'universe cameo label localization'],
  [universeLogicSource, "universeText(language, 'releaseActivity.fresh')", 'release activity localization'],
  [universeLogicSource, "universeText(language, 'news.phaseHeadline'", 'phase news localization'],
  [universeLogicSource, "universeText(language, 'news.fanHeadline'", 'fan demand news localization'],
  [universeLogicSource, "getDefaultProductName(language, 'merch_apparel')", 'default universe product localization'],
  [english, 'services.universeLogic.news.phaseHeadline', 'English universe logic keys'],
  [translations.get('pt-BR') || new Map(), 'services.universeLogic.news.phaseHeadline', 'Portuguese universe logic keys'],
];

const missingUniverseLogicRefs = phase5UniverseLogicRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseLogicRefs.length > 0) {
  failures.push(`universe runtime/generated localization refs are missing: ${missingUniverseLogicRefs.join(', ')}`);
}

const phase5UniverseDashboardHardcodedMarkers = [
  'Universe Dashboard',
  '>Timeline',
  'Merch & Licensing',
  'canon projects •',
  'Commission Event Film',
  "label: 'Fan Trust'",
  "label: 'Continuity'",
  "label: 'Event Ready'",
  'Canon Projects',
  'Avg IMDb',
  'Total Gross',
  'Continuity Risk',
  "continuityRisk >= 70 ? 'High Risk'",
  "continuityRisk >= 38 ? 'Watch Closely'",
  "? 'Legacy Archive'",
  "? 'Overheated'",
  "? 'Stable Canon'",
  ": 'Needs Build-Up'",
  'is archived as legacy IP',
  'is primed for a major crossover',
  'is running hot',
  'needs stronger character attachment',
  'Universe Lifecycle',
  "retired ? 'Legacy Archive' : 'Active Canon'",
  'Retired in Age',
  'Retire only when the current canon has released history',
  'Release at least one canon project first.',
  'active canon project',
  'attached script',
  'attached production commitment',
  'Launch Reboot',
  'Retire Universe',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5UniverseDashboardHardcodedMarkers.length > 0) {
  failures.push(`universe dashboard overview UI/status copy is still hard-coded: ${phase5UniverseDashboardHardcodedMarkers.join(', ')}`);
}

const phase5UniverseDashboardRefs = [
  [developmentLabSource, "tr('services.business.universeDashboard.subtitle')", 'universe dashboard subtitle localization'],
  [developmentLabSource, "labelKey: 'services.business.universeDashboard.metric.fanTrust'", 'hero metric labels localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.heroSummary'", 'hero summary localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.audiencePulse.retired'", 'audience pulse localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.lifecycle.title')", 'lifecycle title localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.lifecycle.retiredBody'", 'retired lifecycle body localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.blocker.releaseCanon')", 'retirement blocker localization'],
  [developmentLabSource, "tr('services.business.universeDashboard.action.retireUniverse')", 'retire universe action localization'],
];

const missingUniverseDashboardRefs = phase5UniverseDashboardRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseDashboardRefs.length > 0) {
  failures.push(`universe dashboard overview localization refs are missing: ${missingUniverseDashboardRefs.join(', ')}`);
}

const phase5UniverseTimelineRosterHardcodedMarkers = [
  'Current Saga',
  "'Conclude Saga'",
  'Current Phase',
  "'Conclude Phase'",
  '>Save</button>',
  'Universe Timeline',
  'No projects released in this universe yet.',
  'Greenlight a project and attach it to this universe to begin.',
  'Character Roster',
  'No characters in this universe yet.',
  "Played by <span className=\"text-zinc-300\">{char.actorId === 'PLAYER_SELF' ? 'You' : char.actorName}</span>",
  '>First</span>',
  'Not introduced yet',
  '>Latest</span>',
  'No release yet',
  '>Approval</span>',
  '>Appearances</span>',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5UniverseTimelineRosterHardcodedMarkers.length > 0) {
  failures.push(`universe timeline/roster UI copy is still hard-coded: ${phase5UniverseTimelineRosterHardcodedMarkers.join(', ')}`);
}

const phase5UniverseTimelineRosterRefs = [
  [developmentLabSource, "tr('services.business.universeTimeline.currentSaga')", 'current saga localization'],
  [developmentLabSource, "tr('services.business.universeTimeline.concludeSaga')", 'conclude saga localization'],
  [developmentLabSource, "tr('services.business.universeTimeline.emptyTitle')", 'timeline empty state localization'],
  [developmentLabSource, "tr('services.business.universeRoster.title')", 'roster title localization'],
  [developmentLabSource, "tr('services.business.universeRoster.playedBy'", 'played by localization'],
  [developmentLabSource, "getCharacterStatusLabel(char)", 'character status localization'],
  [developmentLabSource, "tr('services.business.universeRoster.notIntroduced')", 'not introduced localization'],
  [developmentLabSource, "tr('services.business.universeRoster.approval')", 'approval localization'],
];

const missingUniverseTimelineRosterRefs = phase5UniverseTimelineRosterRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseTimelineRosterRefs.length > 0) {
  failures.push(`universe timeline/roster localization refs are missing: ${missingUniverseTimelineRosterRefs.join(', ')}`);
}

const phase5UniverseManagerHardcodedMarkers = [
  'Cinematic Universes',
  'Build interconnected worlds. Universes compete for market share and audience attention.',
  'Start New Universe',
  'Universe Name',
  'e.g. The MonsterVerse',
  '>Description</label>',
  'What is this world about?',
  'Register Universe ($5M)',
  '>Cancel</button>',
  'Market Share Battle',
  'Brand Power:',
  'Your Universes',
  'No Active Studio Universes',
  '>Momentum</span>',
  '>Saga</p>',
  '>Roster</p>',
  'Heroes</p>',
  'Legacy Archive',
  'Retired {retiredLabel}',
  '>Legacy</span>',
  'History preserved. New phases are closed until a reboot relaunches this canon.',
  '>Canon</p>',
  'Projects</p>',
  '35% Legacy',
].filter((marker) => developmentLabSource.includes(marker));

if (phase5UniverseManagerHardcodedMarkers.length > 0) {
  failures.push(`universe manager list/create UI copy is still hard-coded: ${phase5UniverseManagerHardcodedMarkers.join(', ')}`);
}

const phase5UniverseManagerRefs = [
  [developmentLabSource, "tr('services.business.universeManager.title')", 'manager title localization'],
  [developmentLabSource, "tr('services.business.universeManager.createName')", 'create name localization'],
  [developmentLabSource, "tr('services.business.universeManager.registerUniverse'", 'register universe localization'],
  [developmentLabSource, "tr('services.business.universeManager.marketShareBattle')", 'market share localization'],
  [developmentLabSource, "tr('services.business.universeManager.noActiveUniverses')", 'empty active universes localization'],
  [developmentLabSource, "tr('services.business.universeManager.rosterCount'", 'roster count localization'],
  [developmentLabSource, "tr('services.business.universeManager.retiredLabel'", 'retired label localization'],
  [developmentLabSource, "tr('services.business.universeManager.legacyBody')", 'legacy body localization'],
];

const missingUniverseManagerRefs = phase5UniverseManagerRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingUniverseManagerRefs.length > 0) {
  failures.push(`universe manager list/create localization refs are missing: ${missingUniverseManagerRefs.join(', ')}`);
}

const phase5BusinessCatalogStaticRefs = [
  [businessWizardSource, "tr(`services.business.catalog.blueprint.${type}.name`)", 'business blueprint name UI localization'],
  [businessWizardSource, "tr(`services.business.catalog.blueprint.${type}.description`)", 'business blueprint description UI localization'],
  [businessWizardSource, "tr(`services.business.catalog.subtype.${subtype}.label`)", 'business subtype UI localization'],
  [businessWizardSource, "tr(`services.business.catalog.theme.${id}.label`)", 'business theme UI localization'],
  [businessWizardSource, "tr(`services.business.catalog.amenity.${id}.label`)", 'business amenity UI localization'],
  [businessWizardSource, "tr(`services.business.catalog.productionType.${id}.label`)", 'business production type UI localization'],
  [businessDashboardSource, "tr(`services.business.catalog.product.${id}.name`)", 'business product catalog UI localization'],
  [businessDashboardSource, "tr(`services.business.catalog.devOption.${optionId}.description`)", 'business product development UI localization'],
  [productionWizardSource, "tr(`services.business.productionWizard.headOfProduction.${id}.description`)", 'head of production UI localization'],
  [english, 'services.business.catalog.marketing.social_blast.label', 'marketing campaign locale keys'],
  [translations.get('pt-BR') || new Map(), 'services.business.catalog.marketing.social_blast.label', 'PT marketing campaign locale keys'],
];

const missingBusinessCatalogStaticRefs = phase5BusinessCatalogStaticRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingBusinessCatalogStaticRefs.length > 0) {
  failures.push(`business catalog static localization coverage is missing: ${missingBusinessCatalogStaticRefs.join(', ')}`);
}

const phase5LifestyleBusinessStartupRefs = [
  [lifestyleLogicSource, "id: 'startup_local_cafe'", 'legacy business startup id'],
  [lifestyleLogicSource, "nameKey: 'services.lifestyle.businessStartup.startup_local_cafe.name'", 'legacy business startup name key'],
  [lifestyleLogicSource, "descriptionKey: 'services.lifestyle.businessStartup.startup_local_cafe.description'", 'legacy business startup description key'],
  [lifestyleLogicSource, "riskLevelKey: 'services.lifestyle.businessStartup.risk.low'", 'legacy business startup risk key'],
  [english, 'services.lifestyle.businessStartup.startup_local_cafe.name', 'legacy business startup EN cafe name'],
  [english, 'services.lifestyle.businessStartup.startup_online_brand.description', 'legacy business startup EN online brand description'],
  [english, 'services.lifestyle.businessStartup.risk.high', 'legacy business startup EN risk key'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.businessStartup.startup_local_cafe.name', 'legacy business startup PT cafe name'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.businessStartup.startup_online_brand.description', 'legacy business startup PT online brand description'],
  [translations.get('pt-BR') || new Map(), 'services.lifestyle.businessStartup.risk.high', 'legacy business startup PT risk key'],
];

const missingLifestyleBusinessStartupRefs = phase5LifestyleBusinessStartupRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLifestyleBusinessStartupRefs.length > 0) {
  failures.push(`legacy lifestyle business startup catalog localization refs are missing: ${missingLifestyleBusinessStartupRefs.join(', ')}`);
}

const phase5CinemaChainHardcodedMarkers = [
  'North America',
  'South America',
  'Premium flagship circuit with polished lobbies',
  'Fast, loud, mass-market chain',
  'Balanced global circuit built for reliable commercial coverage',
  'Family-forward and star-driven circuit',
  'Prestige-leaning urban network',
  'Event-friendly circuit with strong premium',
  'Premium access, high trust, higher exhibitor share.',
  'Huge mass reach with more volatile holds.',
  'Balanced reach and predictable terms.',
  'Efficient family and star-driven footprint.',
  'Lower screen count, cleaner prestige signal.',
  'Event-friendly premium rooms and strong franchise traffic.',
].filter((marker) => cinemaChainsSource.includes(marker));

if (phase5CinemaChainHardcodedMarkers.length > 0) {
  failures.push(`cinema chain region/profile copy is still hard-coded: ${phase5CinemaChainHardcodedMarkers.join(', ')}`);
}

const phase5CinemaChainRefs = [
  [cinemaChainsSource, "import { t } from './i18n'", 'cinema chain i18n import'],
  [cinemaChainsSource, "getBoxOfficeRegionLabel = (language: GameLanguage, regionId: BoxOfficeRegionId)", 'box office region label localization'],
  [cinemaChainsSource, "getCinemaChainPersonality = (language: GameLanguage, chainId: CinemaChainId)", 'cinema chain personality localization'],
  [cinemaChainsSource, "getCinemaChainTermsNote = (language: GameLanguage, chainId: CinemaChainId)", 'cinema chain terms note localization'],
  [releaseWizardSource, 'getBoxOfficeRegionLabel(language, region.id)', 'release wizard region label localization'],
  [releaseWizardSource, 'getCinemaChainById(chainId, language)', 'release wizard cinema chain localization'],
  [boxOfficeSource, 'getBoxOfficeRegionLabel(language, region.regionId as BoxOfficeRegionId)', 'box office region label localization'],
  [boxOfficeSource, 'getCinemaChainById(chain.chainId as CinemaChainId, language)', 'box office cinema chain name localization'],
];

const missingCinemaChainRefs = phase5CinemaChainRefs
  .filter(([source, marker]) => !source.includes(marker))
  .map(([, , label]) => label);

if (missingCinemaChainRefs.length > 0) {
  failures.push(`cinema chain localization refs are missing: ${missingCinemaChainRefs.join(', ')}`);
}

const phase5CrisisGeneratorHardcodedMarkers = [
  'Corrupted Footage',
  'A digital error has corrupted several key scenes',
  'Reshoot ($50k)',
  'You paid for a quick reshoot',
  'Equipment Failure',
  'Director vs Star',
  'Sudden Storm',
  'Budget Overrun',
  'Script Leak',
  'Copyright Claim',
  'Unexpected',
  'Catastrophic',
  'Bizarre',
  'Fix with Money ($25k)',
  'You threw money at the',
  'Push Through (Quality -4)',
  'Production continued, but quality took a hit.',
].filter((marker) => crisisGeneratorSource.includes(marker));

if (phase5CrisisGeneratorHardcodedMarkers.length > 0) {
  failures.push(`random production crisis generator copy is still hard-coded: ${phase5CrisisGeneratorHardcodedMarkers.join(', ')}`);
}

const phase5CrisisGeneratorRefs = [
  [crisisGeneratorSource, "import { getPlayerLanguage, t } from './i18n'", 'crisis generator i18n import'],
  [crisisGeneratorSource, 'const language = getPlayerLanguage(player)', 'crisis generator player language'],
  [crisisGeneratorSource, "getGeneratedCrisisText(language, 'adjective'", 'localized generated adjective token'],
  [crisisGeneratorSource, "getGeneratedCrisisText(language, 'noun'", 'localized generated noun token'],
  [crisisGeneratorSource, "getGeneratedCrisisText(language, 'subject'", 'localized generated subject token'],
  [crisisGeneratorSource, "titleKey: 'production.crisis.generated.title'", 'generated crisis title key'],
  [crisisGeneratorSource, "descriptionKey: 'production.crisis.generated.description'", 'generated crisis description key'],
  [english, 'production.crisis.generated.adjective.UNEXPECTED.label', 'generated adjective locale keys'],
  [english, 'production.crisis.generated.noun.FAILURE.label', 'generated noun locale keys'],
  [english, 'production.crisis.generated.subject.CATERING.label', 'generated subject locale keys'],
  [translations.get('pt-BR') || new Map(), 'production.crisis.generated.adjective.UNEXPECTED.label', 'PT generated adjective locale keys'],
  [translations.get('pt-BR') || new Map(), 'production.crisis.generated.noun.FAILURE.label', 'PT generated noun locale keys'],
  [translations.get('pt-BR') || new Map(), 'production.crisis.generated.subject.CATERING.label', 'PT generated subject locale keys'],
];

const missingCrisisGeneratorRefs = phase5CrisisGeneratorRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingCrisisGeneratorRefs.length > 0) {
  failures.push(`random production crisis generator localization refs are missing: ${missingCrisisGeneratorRefs.join(', ')}`);
}

const phase5DirectorGeneratorHardcodedMarkers = [
  'Visual Style: The Big Stunt',
  'A major action sequence is coming up',
  'Practical Effects (Prestige +10, Risk)',
  'You chose practical effects. The set was dangerous',
  'Creative Freedom: Dialogue',
  'The lead actor wants to improvise',
  'Allow Improv (Talent +2)',
  'The improv was a hit! The scene feels raw',
  'Cinematography: Lighting',
  'The DP suggests a very dark',
  'Moody & Dark (Prestige +5)',
  'Pacing: The Long Take',
  'Traditional Coverage',
  'You used standard angles. Efficient and safe.',
].filter((marker) => directorGeneratorSource.includes(marker));

if (phase5DirectorGeneratorHardcodedMarkers.length > 0) {
  failures.push(`director decision generator copy is still hard-coded: ${phase5DirectorGeneratorHardcodedMarkers.join(', ')}`);
}

const phase5DirectorGeneratorRefs = [
  [directorGeneratorSource, "titleKey: 'production.director.bigStunt.title'", 'director big stunt title key'],
  [directorGeneratorSource, "descriptionKey: 'production.director.bigStunt.description'", 'director big stunt description key'],
  [directorGeneratorSource, "labelKey: 'production.director.bigStunt.practical.label'", 'director practical label key'],
  [directorGeneratorSource, "logKey: 'production.director.bigStunt.practical.log'", 'director practical log key'],
  [directorGeneratorSource, "titleKey: 'production.director.dialogue.title'", 'director dialogue title key'],
  [directorGeneratorSource, "titleKey: 'production.director.lighting.title'", 'director lighting title key'],
  [directorGeneratorSource, "titleKey: 'production.director.longTake.title'", 'director long take title key'],
  [english, 'production.director.bigStunt.title', 'director decision EN keys'],
  [translations.get('pt-BR') || new Map(), 'production.director.bigStunt.title', 'director decision PT keys'],
];

const missingDirectorGeneratorRefs = phase5DirectorGeneratorRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDirectorGeneratorRefs.length > 0) {
  failures.push(`director decision generator localization refs are missing: ${missingDirectorGeneratorRefs.join(', ')}`);
}

const phase5DatingLuxePulseHardcodedMarkers = [
  'has gone a little cold. Luxe chemistry is cooling off.',
  'has gone ghost for now. You may need something bigger to revive this.',
  'dropped back into your orbit this week.',
  'spark fresh Luxe whispers',
  'The gossip cycle is picking up on the chemistry',
  'are back in rumor circulation. Luxe watchers think something is definitely happening.',
].filter((marker) => datingLogicSource.includes(marker));

if (phase5DatingLuxePulseHardcodedMarkers.length > 0) {
  failures.push(`Luxe dating weekly pulse copy is still hard-coded: ${phase5DatingLuxePulseHardcodedMarkers.join(', ')}`);
}

const phase5DatingLuxePulseRefs = [
  [datingLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'dating logic i18n import'],
  [datingLogicSource, 'const language = getPlayerLanguage(player)', 'dating logic player language'],
  [datingLogicSource, "t(language, 'services.dating.luxe.cooldown.log'", 'Luxe cooldown log localization'],
  [datingLogicSource, "t(language, 'services.dating.luxe.ghosted.log'", 'Luxe ghosted log localization'],
  [datingLogicSource, "t(language, 'services.dating.luxe.orbit.log'", 'Luxe orbit log localization'],
  [datingLogicSource, "t(language, 'services.dating.luxe.heat.news.headline'", 'Luxe heat news headline localization'],
  [datingLogicSource, "t(language, 'services.dating.luxe.heat.x.content'", 'Luxe heat social localization'],
  [english, 'services.dating.luxe.cooldown.log', 'Luxe dating EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.dating.luxe.cooldown.log', 'Luxe dating PT keys'],
];

const missingDatingLuxePulseRefs = phase5DatingLuxePulseRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDatingLuxePulseRefs.length > 0) {
  failures.push(`Luxe dating weekly pulse localization refs are missing: ${missingDatingLuxePulseRefs.join(', ')}`);
}

const phase5FamilyPregnancyHardcodedMarkers = [
  'Pregnancy Confirmed',
  "You're pregnant. The baby is due",
  'You are pregnant. Due in about 9 months.',
  "You're pregnant. Naming comes when the baby is born.",
  'is pregnant. The baby is due',
  'is pregnant. Due in about 9 months.',
  'Intimacy Locked',
  'pregnancy is not possible from this intimacy.',
  'Pregnancy is not biologically possible here.',
].filter((marker) => familyLogicSource.includes(marker));

if (phase5FamilyPregnancyHardcodedMarkers.length > 0) {
  failures.push(`family pregnancy feedback copy is still hard-coded: ${phase5FamilyPregnancyHardcodedMarkers.join(', ')}`);
}

const phase5FamilyPregnancyRefs = [
  [familyLogicSource, "import { getPlayerLanguage, t } from './i18n'", 'family logic i18n import'],
  [familyLogicSource, "languageOrPlayer: GameLanguage | Player = 'en'", 'family pregnancy language argument'],
  [familyLogicSource, "t(language, 'services.family.pregnancy.player.body')", 'player pregnancy body localization'],
  [familyLogicSource, "t(language, 'services.family.pregnancy.partner.body'", 'partner pregnancy body localization'],
  [familyLogicSource, "t(language, 'services.family.pregnancy.none.toast'", 'non-pregnancy toast localization'],
  [gameActionsSource, "getPregnancyFeedbackCopy('NONE', partner.name, prev)", 'game actions non-pregnancy language pass'],
  [gameActionsSource, "getPregnancyFeedbackCopy(scheduledActivePregnancy?.pregnancyCarrier || 'PARTNER', partner.name, prev)", 'game actions pregnancy language pass'],
  [tinderAppSource, "getPregnancyFeedbackCopy(pregnancyTriggered ? pregnancyCarrier : 'NONE', activeChatMatch.name, player)", 'Tinder pregnancy language pass'],
  [english, 'services.family.pregnancy.player.body', 'family pregnancy EN keys'],
  [translations.get('pt-BR') || new Map(), 'services.family.pregnancy.player.body', 'family pregnancy PT keys'],
];

const missingFamilyPregnancyRefs = phase5FamilyPregnancyRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingFamilyPregnancyRefs.length > 0) {
  failures.push(`family pregnancy feedback localization refs are missing: ${missingFamilyPregnancyRefs.join(', ')}`);
}

const phase5FamousProjectHardcodedMarkers = [
  'A mafia family saga that redefines cinema.',
  'Life is like a box of chocolates.',
  'A tragic romance on the unsinkable ship.',
  'Dreams within dreams.',
  'Smart is the new sexy.',
  'A chemistry teacher turns to a life of crime.',
  "label: `Famous ${roleType === 'LEAD' ? 'Lead' : 'Role'}`",
  "label: 'Iconic Cameo'",
  'Director/Showrunner ${project.director} saw your recent work.',
  'Pay is standard scale, but the exposure is massive.',
].filter((marker) => famousMovieSource.includes(marker));

if (phase5FamousProjectHardcodedMarkers.length > 0) {
  failures.push(`famous project catalog visible copy is still hard-coded: ${phase5FamousProjectHardcodedMarkers.join(', ')}`);
}

const phase5FamousProjectRefs = [
  [famousMovieSource, "import { GameLanguage, Genre, Player", 'famous project language type import'],
  [famousMovieSource, "import { getPlayerLanguage, t } from './i18n'", 'famous project i18n import'],
  [famousMovieSource, 'getFamousProjectDescription = (language: GameLanguage, def: FamousProjectDef)', 'famous project description helper'],
  [famousMovieSource, "t(language, `services.famousProject.description.${getFamousProjectLocaleId(def)}`)", 'famous project description localization'],
  [famousMovieSource, "t(language, roleType === 'LEAD' ? 'services.famousProject.role.lead' : 'services.famousProject.role.role')", 'famous role label localization'],
  [famousMovieSource, "t(language, 'services.famousProject.role.cameo')", 'famous cameo label localization'],
  [famousMovieSource, "t(language, 'services.famousProject.cameo.message'", 'famous cameo message localization'],
  [famousMovieSource, "visibleDirectorTier: t(language, 'services.famousProject.visible.director.legend')", 'famous director tier localization'],
  [famousMovieSource, "visibleScriptBuzz: t(language, 'services.famousProject.visible.script.masterpiece')", 'famous script buzz localization'],
  [famousMovieSource, "visibleCastStrength: t(language, 'services.famousProject.visible.cast.iconic')", 'famous cast strength localization'],
  [famousMovieSource, "createFamousOpportunity = (def: FamousProjectDef, roleType: RoleType, source: 'CASTING_APP' | 'AGENT' | 'DIRECT', language: GameLanguage = 'en')", 'famous opportunity language argument'],
  [famousMovieSource, "createFamousOpportunity(movie, roleType, 'CASTING_APP', getPlayerLanguage(player))", 'famous movie generator language pass'],
  [famousMovieSource, "createFamousOpportunity(series, roleType, 'CASTING_APP', getPlayerLanguage(player))", 'famous series generator language pass'],
  [teamLogicSource, "createFamousOpportunity(famousMovie, 'SUPPORTING', 'AGENT', getPlayerLanguage(player))", 'agent famous offer language pass'],
  [roleLogicSource, "createFamousOpportunity(famousProject, roleType, 'DIRECT', language)", 'weekly famous offer language pass'],
  [english, 'services.famousProject.description.the_godfather', 'famous project EN description keys'],
  [translations.get('pt-BR') || new Map(), 'services.famousProject.description.the_godfather', 'famous project PT description keys'],
  [english, 'services.famousProject.visible.script.masterpiece', 'famous project EN visible metadata keys'],
  [translations.get('pt-BR') || new Map(), 'services.famousProject.visible.script.masterpiece', 'famous project PT visible metadata keys'],
];

const missingFamousProjectRefs = phase5FamousProjectRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingFamousProjectRefs.length > 0) {
  failures.push(`famous project catalog localization refs are missing: ${missingFamousProjectRefs.join(', ')}`);
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

const phase5ReleaseMarketingCampaignRefs = [
  [releaseWizardSource, 'getCampaignPositionLabel(selectedCampaignPosition)', 'release campaign position label helper usage'],
  [releaseWizardSource, 'getCampaignTimelineDescription(selectedCampaignTimeline)', 'release campaign timeline description helper usage'],
  [releaseWizardSource, 'getMarketingChannelLabel(channel)', 'release campaign channel label helper usage'],
  [releaseWizardSource, "tr('release.campaign.channel.customSpendAria'", 'release campaign channel custom aria localization'],
  [english, 'release.campaign.position.MASS_EVENT.label', 'Release campaign EN position label'],
  [english, 'release.campaign.position.SLEEPER_BUILD.promise', 'Release campaign EN position promise'],
  [english, 'release.campaign.timeline.BALANCED_ROLLOUT.description', 'Release campaign EN timeline description'],
  [english, 'release.campaign.channel.TRAILER_LAUNCH.label', 'Release campaign EN channel label'],
  [english, 'release.campaign.channel.quickAllocationAria', 'Release campaign EN channel aria'],
  [translations.get('pt-BR') || new Map(), 'release.campaign.position.MASS_EVENT.label', 'Release campaign PT position label'],
  [translations.get('pt-BR') || new Map(), 'release.campaign.position.SLEEPER_BUILD.promise', 'Release campaign PT position promise'],
  [translations.get('pt-BR') || new Map(), 'release.campaign.timeline.BALANCED_ROLLOUT.description', 'Release campaign PT timeline description'],
  [translations.get('pt-BR') || new Map(), 'release.campaign.channel.TRAILER_LAUNCH.label', 'Release campaign PT channel label'],
  [translations.get('pt-BR') || new Map(), 'release.campaign.channel.quickAllocationAria', 'Release campaign PT channel aria'],
];

const missingReleaseMarketingCampaignRefs = phase5ReleaseMarketingCampaignRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingReleaseMarketingCampaignRefs.length > 0) {
  failures.push(`Release Wizard campaign marketing localization refs are missing: ${missingReleaseMarketingCampaignRefs.join(', ')}`);
}

const phase5ReleaseGeneratedHardcodedMarkers = [
  'Streaming Rights: ${project.name}',
  'Release Campaign: ${project.name}',
  'Festival Premiere: ${project.name}',
  'unused campaign reserve returned',
  '${project.name} Premiere',
  'The grand red carpet premiere for your latest film',
].filter((marker) => releaseWizardSource.includes(marker));

if (phase5ReleaseGeneratedHardcodedMarkers.length > 0) {
  failures.push(`Release Wizard generated text is still hard-coded: ${phase5ReleaseGeneratedHardcodedMarkers.join(', ')}`);
}

const phase5ReleaseGeneratedRefs = [
  [releaseWizardSource, "tr('release.generated.streamingRights'", 'release streaming rights log localization'],
  [releaseWizardSource, "tr('release.generated.releaseCampaign'", 'release campaign log localization'],
  [releaseWizardSource, "tr('release.generated.festivalPremiere'", 'festival premiere finance localization'],
  [releaseWizardSource, "tr('release.generated.premiereDescription'", 'premiere event localization'],
  [english, 'release.generated.streamingRights', 'release generated EN streaming key'],
  [english, 'release.generated.premiereDescription', 'release generated EN premiere key'],
  [translations.get('pt-BR') || new Map(), 'release.generated.streamingRights', 'release generated PT streaming key'],
  [translations.get('pt-BR') || new Map(), 'release.generated.premiereDescription', 'release generated PT premiere key'],
];

const missingReleaseGeneratedRefs = phase5ReleaseGeneratedRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingReleaseGeneratedRefs.length > 0) {
  failures.push(`Release Wizard generated text localization refs are missing: ${missingReleaseGeneratedRefs.join(', ')}`);
}

const phase5OwnedIpDossierHardcodedMarkers = [
  'Character IP',
  'Story World IP',
  'IP Performance Dossier',
  'Studio Original',
  'Ownership Command',
  'Expansion Command',
  'Franchise Command',
  'Universe Command',
  'Hold IP',
  'Renew Licence',
  'Performance Pulse',
  'Lifetime Gross',
  'Development Pipeline',
  'Back to IP Library',
  'Develop IP',
].filter((marker) => ownedIpDossierSource.includes(marker));

if (phase5OwnedIpDossierHardcodedMarkers.length > 0) {
  failures.push(`Owned IP dossier copy is still hard-coded: ${phase5OwnedIpDossierHardcodedMarkers.join(', ')}`);
}

const phase5OwnedIpDossierRefs = [
  [ownedIpDossierSource, "tr('ownedIp.dossier.title')", 'Owned IP dossier title localization'],
  [ownedIpDossierSource, "tr(`ownedIp.type.${ownedRight.propertyType}`)", 'Owned IP type label localization'],
  [ownedIpDossierSource, "tr('ownedIp.section.ownership')", 'Owned IP ownership section localization'],
  [ownedIpDossierSource, "tr('ownedIp.action.franchiseCommand')", 'Owned IP action localization'],
  [ownedIpDossierSource, "tr('ownedIp.performance.lifetimeGross')", 'Owned IP performance localization'],
  [english, 'ownedIp.dossier.title', 'Owned IP dossier EN title'],
  [english, 'ownedIp.type.CHARACTER', 'Owned IP dossier EN type'],
  [english, 'ownedIp.action.developIp', 'Owned IP dossier EN action'],
  [translations.get('pt-BR') || new Map(), 'ownedIp.dossier.title', 'Owned IP dossier PT title'],
  [translations.get('pt-BR') || new Map(), 'ownedIp.type.CHARACTER', 'Owned IP dossier PT type'],
  [translations.get('pt-BR') || new Map(), 'ownedIp.action.developIp', 'Owned IP dossier PT action'],
];

const missingOwnedIpDossierRefs = phase5OwnedIpDossierRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingOwnedIpDossierRefs.length > 0) {
  failures.push(`Owned IP dossier localization refs are missing: ${missingOwnedIpDossierRefs.join(', ')}`);
}

const phase5ProjectDashboardHardcodedMarkers = [
  "{ id: 'CONCEPT', label: 'Concept'",
  "{ id: 'STREAMING', label: 'Streaming'",
  'Executive Summary',
  'Production Cost',
  'Buzz Level',
  '>Release</div>',
  '>Timeline</div>',
  'Project Revenue',
  'Studio Receipts',
  'Investor Split',
  '>Sources</div>',
  '>Theaters</span>',
  'Release Strategy',
  'Theatrical Release',
  'Streaming Premiere',
  "{ subject: 'Script'",
  "{ subject: 'Direction'",
  'Key Talent',
  'Continue Bidding War',
].filter((marker) => projectDashboardModalSource.includes(marker));

if (phase5ProjectDashboardHardcodedMarkers.length > 0) {
  failures.push(`Project dashboard modal copy is still hard-coded: ${phase5ProjectDashboardHardcodedMarkers.join(', ')}`);
}

const phase5ProjectDashboardRefs = [
  [projectDashboardModalSource, "tr(`projectDashboard.phase.${p.id}`)", 'project dashboard phase localization'],
  [projectDashboardModalSource, "tr('projectDashboard.summary.title')", 'project dashboard summary localization'],
  [projectDashboardModalSource, "tr('projectDashboard.metric.productionCost')", 'project dashboard metric localization'],
  [projectDashboardModalSource, "tr('projectDashboard.revenue.projectRevenue')", 'project dashboard revenue localization'],
  [projectDashboardModalSource, "tr('projectDashboard.releaseStrategy.title')", 'project dashboard release strategy localization'],
  [projectDashboardModalSource, "tr('projectDashboard.radar.script')", 'project dashboard radar localization'],
  [projectDashboardModalSource, "tr('projectDashboard.talent.keyTalent')", 'project dashboard talent localization'],
  [english, 'projectDashboard.phase.CONCEPT', 'Project dashboard EN phase keys'],
  [english, 'projectDashboard.summary.title', 'Project dashboard EN summary key'],
  [english, 'projectDashboard.metric.productionCost', 'Project dashboard EN metric key'],
  [translations.get('pt-BR') || new Map(), 'projectDashboard.phase.CONCEPT', 'Project dashboard PT phase keys'],
  [translations.get('pt-BR') || new Map(), 'projectDashboard.summary.title', 'Project dashboard PT summary key'],
  [translations.get('pt-BR') || new Map(), 'projectDashboard.metric.productionCost', 'Project dashboard PT metric key'],
];

const missingProjectDashboardRefs = phase5ProjectDashboardRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingProjectDashboardRefs.length > 0) {
  failures.push(`Project dashboard modal localization refs are missing: ${missingProjectDashboardRefs.join(', ')}`);
}

const phase5MarketTrendReasonRefs = [
  [marketTrendsSource, "buildMarketTrendReason(genre, label, week, language)", 'market trend reason builder usage'],
  [marketTrendsSource, "t(language, `services.marketTrends.reason.${label}.${reasonIndex}`", 'market trend reason key usage'],
  [developmentLabSource, 'createMarketTrends(player.currentWeek, language)', 'Development Lab market trend language generation'],
  [developmentLabSource, "getGenreMarketTrend(script.genres[0] || 'DRAMA', currentWeek, marketTrends, language)", 'Development Lab market trend reason localization'],
  [english, 'services.marketTrends.genre.ACTION', 'Market trends EN genre label'],
  [english, 'services.marketTrends.reason.Hot.0', 'Market trends EN hot reason'],
  [english, 'services.marketTrends.reason.Stable.2', 'Market trends EN stable reason'],
  [translations.get('pt-BR') || new Map(), 'services.marketTrends.genre.ACTION', 'Market trends PT genre label'],
  [translations.get('pt-BR') || new Map(), 'services.marketTrends.reason.Hot.0', 'Market trends PT hot reason'],
  [translations.get('pt-BR') || new Map(), 'services.marketTrends.reason.Stable.2', 'Market trends PT stable reason'],
];

const missingMarketTrendReasonRefs = phase5MarketTrendReasonRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingMarketTrendReasonRefs.length > 0) {
  failures.push(`Market trend reason localization refs are missing: ${missingMarketTrendReasonRefs.join(', ')}`);
}

const phase5ProfileBuilderRefs = [
  [profilePictureBuilderSource, "getCategoryLabel(activeCategoryConfig)", 'profile builder active category helper usage'],
  [profilePictureBuilderSource, "getPartLabel(option)", 'profile builder option label helper usage'],
  [profilePictureBuilderSource, "tr('profileBuilder.usePortrait')", 'profile builder shell button localization'],
  [homeSource, 'language={language}', 'HomePage passes player language to profile builder'],
  [english, 'profileBuilder.category.hair', 'Profile builder EN category key'],
  [english, 'profileBuilder.part.side-part', 'Profile builder EN hair part key'],
  [english, 'profileBuilder.part.frame-award-night', 'Profile builder EN frame part key'],
  [translations.get('pt-BR') || new Map(), 'profileBuilder.category.hair', 'Profile builder PT category key'],
  [translations.get('pt-BR') || new Map(), 'profileBuilder.part.side-part', 'Profile builder PT hair part key'],
  [translations.get('pt-BR') || new Map(), 'profileBuilder.part.frame-award-night', 'Profile builder PT frame part key'],
];

const missingProfileBuilderRefs = phase5ProfileBuilderRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingProfileBuilderRefs.length > 0) {
  failures.push(`Profile builder localization refs are missing: ${missingProfileBuilderRefs.join(', ')}`);
}

const phase5MusicIndustryRefs = [
  [musicIndustrySource, "t(language, 'services.musicIndustry.impact.empty.label')", 'music impact empty label localization'],
  [musicIndustrySource, "t(language, 'services.musicIndustry.weekly.debut.headline'", 'music debut headline localization'],
  [musicIndustrySource, "t(language, 'services.musicIndustry.weekly.release.subtext'", 'music release subtext localization'],
  [musicIndustrySource, "t(language, 'services.musicIndustry.culture.songBeats.description'", 'music culture rivalry description localization'],
  [musicIndustrySource, "t(language, 'services.musicIndustry.weekly.rivalry.log'", 'music rivalry log localization'],
  [english, 'services.musicIndustry.weekly.chart.headline', 'music industry chart headline EN key'],
  [english, 'services.musicIndustry.culture.fanbaseWar.description', 'music fanbase war EN key'],
  [translations.get('pt-BR') || new Map(), 'services.musicIndustry.weekly.chart.headline', 'music industry chart headline PT key'],
  [translations.get('pt-BR') || new Map(), 'services.musicIndustry.culture.fanbaseWar.description', 'music fanbase war PT key'],
];

const missingMusicIndustryRefs = phase5MusicIndustryRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingMusicIndustryRefs.length > 0) {
  failures.push(`music industry generated copy localization refs are missing: ${missingMusicIndustryRefs.join(', ')}`);
}

const phase5ProjectInvestorRefs = [
  [projectInvestorsSource, "t(language, 'services.projectInvestors.fit.leadInvestor')", 'project investor fit label localization'],
  [projectInvestorsSource, "t(language, 'services.projectInvestors.offer.strongFit')", 'project investor offer note localization'],
  [projectInvestorsSource, 'export const getProjectInvestorDescription', 'project investor catalog description helper'],
  [projectInvestorsSource, 'services.projectInvestors.kind.${kind}', 'project investor kind localization helper'],
  [english, 'services.projectInvestors.investor.investor_marlowe_pictures.description', 'project investor Marlowe EN key'],
  [english, 'services.projectInvestors.kind.FILM_FUND', 'project investor kind EN key'],
  [translations.get('pt-BR') || new Map(), 'services.projectInvestors.investor.investor_marlowe_pictures.description', 'project investor Marlowe PT key'],
  [translations.get('pt-BR') || new Map(), 'services.projectInvestors.kind.FILM_FUND', 'project investor kind PT key'],
];

const missingProjectInvestorRefs = phase5ProjectInvestorRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingProjectInvestorRefs.length > 0) {
  failures.push(`project investor generated/catalog copy localization refs are missing: ${missingProjectInvestorRefs.join(', ')}`);
}

const phase5GlobalActorPackRefs = [
  [npcLogicSource, 'getGlobalActorPackLabel', 'global actor pack label helper'],
  [npcLogicSource, 'getGlobalActorPackDescription', 'global actor pack description helper'],
  [settingsSource, 'getGlobalActorPackLabel(pack, language)', 'settings global actor pack label render'],
  [settingsSource, 'getGlobalActorPackDescription(pack, language)', 'settings global actor pack description render'],
  [english, 'services.npc.globalActorPack.label', 'global actor pack EN label key'],
  [english, 'services.npc.globalActorPack.description', 'global actor pack EN description key'],
  [translations.get('pt-BR') || new Map(), 'services.npc.globalActorPack.label', 'global actor pack PT label key'],
  [translations.get('pt-BR') || new Map(), 'services.npc.globalActorPack.description', 'global actor pack PT description key'],
];

const missingGlobalActorPackRefs = phase5GlobalActorPackRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingGlobalActorPackRefs.length > 0) {
  failures.push(`global actor pack localization refs are missing: ${missingGlobalActorPackRefs.join(', ')}`);
}

const hardCodedGlobalActorPackFields = [
  [npcLogicSource, "label: `${country} Talent`", 'global actor pack raw label field'],
  [npcLogicSource, "description: `Adds ${talent.length} ${country} actors/directors to casting, Forbes, and social discovery.`", 'global actor pack raw description field'],
];

const presentHardCodedGlobalActorPackFields = hardCodedGlobalActorPackFields
  .filter(([source, marker]) => source.includes(marker))
  .map(([, , label]) => label);

if (presentHardCodedGlobalActorPackFields.length > 0) {
  failures.push(`global actor pack text must use localization helpers only: ${presentHardCodedGlobalActorPackFields.join(', ')}`);
}

const phase5RightsNegotiationRefs = [
  [rightsNegotiationSource, "t(language, 'services.rightsNegotiation.action.acquire')", 'rights action labels localization'],
  [rightsNegotiationSource, "t(language, 'services.rightsNegotiation.quote.OPTION.label')", 'rights quote label localization'],
  [rightsNegotiationSource, "t(language, 'services.rightsNegotiation.creativeGuarantee.estate_approval.title')", 'rights creative guarantee localization'],
  [rightsNegotiationSource, "t(language, 'services.rightsNegotiation.response.acceptedPremium'", 'rights accepted response localization'],
  [rightsNegotiationSource, "t(language, 'services.rightsNegotiation.response.withdrawn')", 'rights withdrawn response localization'],
  [businessLogicSource, 'language,', 'weekly rights negotiation advance receives language'],
  [gameLoopSource, "t(language, 'services.rightsNegotiation.inbox.text'", 'rights negotiation inbox text localization'],
  [english, 'services.rightsNegotiation.quote.OPTION.label', 'rights option EN key'],
  [english, 'services.rightsNegotiation.response.rivalOffer', 'rights rival offer EN key'],
  [translations.get('pt-BR') || new Map(), 'services.rightsNegotiation.quote.OPTION.label', 'rights option PT key'],
  [translations.get('pt-BR') || new Map(), 'services.rightsNegotiation.response.rivalOffer', 'rights rival offer PT key'],
];

const missingRightsNegotiationRefs = phase5RightsNegotiationRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingRightsNegotiationRefs.length > 0) {
  failures.push(`rights negotiation generated copy localization refs are missing: ${missingRightsNegotiationRefs.join(', ')}`);
}

const phase5RivalRetaliationRefs = [
  [rivalRetaliationSource, "t(language, 'services.rivalRetaliation.counterBid.summary'", 'rival counter-bid summary localization'],
  [rivalRetaliationSource, "t(language, 'services.rivalRetaliation.inbox.sender')", 'rival inbox sender localization'],
  [rivalRetaliationSource, "t(language, 'life.event.rival.category')", 'rival life-event category localization'],
  [rivalRetaliationSource, "t(language, 'services.rivalRetaliation.news.counterBid.headline'", 'rival news headline localization'],
  [rivalRetaliationSource, "t(language, 'services.rivalRetaliation.social.default.content'", 'rival social post localization'],
  [rivalRetaliationSource, 'services.rivalRetaliation.log.weekly', 'rival weekly log localization'],
  [english, 'services.rivalRetaliation.counterBid.summary', 'rival counter-bid EN key'],
  [english, 'services.rivalRetaliation.news.default.subtext', 'rival news subtext EN key'],
  [translations.get('pt-BR') || new Map(), 'services.rivalRetaliation.counterBid.summary', 'rival counter-bid PT key'],
  [translations.get('pt-BR') || new Map(), 'services.rivalRetaliation.news.default.subtext', 'rival news subtext PT key'],
];

const missingRivalRetaliationRefs = phase5RivalRetaliationRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingRivalRetaliationRefs.length > 0) {
  failures.push(`rival retaliation generated copy localization refs are missing: ${missingRivalRetaliationRefs.join(', ')}`);
}

const phase5RoleLogicRefs = [
  [roleLogicSource, "t(language, `services.role.definition.${roleType}`)", 'role definition label localization helper'],
  [roleLogicSource, "t(language, `services.role.buzz.${level}`)", 'role buzz label localization'],
  [roleLogicSource, "t(language, 'services.role.rejection.reason.rival'", 'casting rejection reason localization'],
  [roleLogicSource, "t(language, 'services.role.rejection.review.directorNote'", 'casting rejection review localization'],
  [roleLogicSource, "splitLocalizedList(language, 'services.role.review.positive.general'", 'critic review general bank localization'],
  [roleLogicSource, "splitLocalizedList(language, `services.role.review.positive.${genreKey}`", 'critic review genre bank localization'],
  [gameLoopSource, 'formatRoleRejectionReview(projectName, stage, feedback, language)', 'weekly casting rejection review passes language'],
  [gameLoopSource, 'generateReviews(', 'weekly release review generator call exists'],
  [gameLoopSource, 'updatedC.projectDetails.subjectName,', 'weekly release reviews pass language'],
  [careerPageSource, 'getBuzzLabel(buzz, language)', 'career buzz label passes language'],
  [english, 'services.role.definition.LEAD', 'role definition EN key'],
  [english, 'services.role.review.positive.general', 'role review EN bank key'],
  [translations.get('pt-BR') || new Map(), 'services.role.definition.LEAD', 'role definition PT key'],
  [translations.get('pt-BR') || new Map(), 'services.role.review.positive.general', 'role review PT bank key'],
];

const missingRoleLogicRefs = phase5RoleLogicRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingRoleLogicRefs.length > 0) {
  failures.push(`role logic generated copy localization refs are missing: ${missingRoleLogicRefs.join(', ')}`);
}

const phase5BoxOfficeStaticHardcodedMarkers = [
  'Producer-backed',
  'Producer Stake',
  'Revenue / View',
  'Regional data appears after the next weekly tick for this title.',
  'Cinema partner data appears once the release reports a regional split.',
  'Cinema partner data appears once theatrical releases report a regional split.',
  '} screens · {formatPercent(chain.exhibitorCut)} cut',
  'Cut {formatMoney(chain.exhibitorReceipts)}',
  '{formatPercent(entry.exhibitorCut)} cut',
  'Run W{rel.weekNum}',
  '>W{idx + 1}<',
  '>W{idx+1}<',
].filter((marker) => boxOfficeSource.includes(marker));

if (phase5BoxOfficeStaticHardcodedMarkers.length > 0) {
  failures.push(`BoxOfficeApp static/generated labels are still hard-coded: ${phase5BoxOfficeStaticHardcodedMarkers.join(', ')}`);
}

const phase5BoxOfficeStaticRefs = [
  [boxOfficeSource, "tr('box.producerBacked')", 'BoxOffice producer-backed status localization'],
  [boxOfficeSource, "tr('box.producerStake')", 'BoxOffice producer stake chip localization'],
  [boxOfficeSource, "tr('box.revenuePerView')", 'BoxOffice revenue per view localization'],
  [boxOfficeSource, "tr('box.regionalDataPending')", 'BoxOffice regional empty state localization'],
  [boxOfficeSource, "tr('box.cinemaPartnerDataPending')", 'BoxOffice partner empty state localization'],
  [boxOfficeSource, "tr('box.partnerScreensCut'", 'BoxOffice screens/cut line localization'],
  [boxOfficeSource, "tr('box.weekCompact'", 'BoxOffice chart week label localization'],
  [boxOfficeSource, 'getProjectReleaseLabel(rel, releaseFallback, { includeWeek: true, language, compact: true })', 'BoxOffice release timing language pass-through'],
  [releaseTimingSource, "t(language, 'release.timing.ageWeekCompact'", 'release timing compact localization'],
  [english, 'box.producerBacked', 'BoxOffice EN producer-backed key'],
  [english, 'box.regionalDataPending', 'BoxOffice EN regional pending key'],
  [english, 'release.timing.ageWeekCompact', 'release timing EN compact key'],
  [translations.get('pt-BR') || new Map(), 'box.producerBacked', 'BoxOffice PT producer-backed key'],
  [translations.get('pt-BR') || new Map(), 'box.regionalDataPending', 'BoxOffice PT regional pending key'],
  [translations.get('pt-BR') || new Map(), 'release.timing.ageWeekCompact', 'release timing PT compact key'],
];

const missingBoxOfficeStaticRefs = phase5BoxOfficeStaticRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingBoxOfficeStaticRefs.length > 0) {
  failures.push(`BoxOfficeApp static/generated localization refs are missing: ${missingBoxOfficeStaticRefs.join(', ')}`);
}

const phase5DatingPreferencesHardcodedMarkers = [
  "label: 'Men'",
  "label: 'Women'",
  'Dating Filters',
  'Change who appears in Tinder and Luxe.',
  'Close dating preferences',
  'Interested In',
  'Age Range',
  'Min Age',
  'Max Age',
  'Save Filters',
  'Showing ${preferenceLabel(preferences)}.',
  'Luxe filters updated: ${preferenceLabel(preferences)}.',
].filter((marker) => (
  datingPreferencesSheetSource.includes(marker) ||
  tinderAppSource.includes(marker) ||
  luxeAppSource.includes(marker)
));

if (phase5DatingPreferencesHardcodedMarkers.length > 0) {
  failures.push(`DatingPreferencesSheet labels are still hard-coded: ${phase5DatingPreferencesHardcodedMarkers.join(', ')}`);
}

const phase5DatingPreferencesRefs = [
  [datingPreferencesSheetSource, "labelKey: 'dating.preferences.gender.men'", 'dating gender option key'],
  [datingPreferencesSheetSource, "t(language, 'dating.preferences.title')", 'dating preferences title localization'],
  [datingPreferencesSheetSource, "t(language, 'dating.preferences.save')", 'dating preferences save localization'],
  [datingPreferencesSheetSource, "t(language, 'dating.preferences.summary'", 'dating preferences summary localization'],
  [tinderAppSource, "preferenceLabel(preferences, language)", 'Tinder preference summary passes language'],
  [tinderAppSource, "tr('dating.preferences.tinderSaved'", 'Tinder preference save feedback localization'],
  [tinderAppSource, 'language={language}', 'Tinder preferences sheet receives language'],
  [luxeAppSource, "preferenceLabel(preferences, language)", 'Luxe preference summary passes language'],
  [luxeAppSource, "tr('dating.preferences.luxeSaved'", 'Luxe preference save feedback localization'],
  [luxeAppSource, 'language={language}', 'Luxe preferences sheet receives language'],
  [english, 'dating.preferences.title', 'dating preferences EN title key'],
  [english, 'dating.preferences.summary', 'dating preferences EN summary key'],
  [translations.get('pt-BR') || new Map(), 'dating.preferences.title', 'dating preferences PT title key'],
  [translations.get('pt-BR') || new Map(), 'dating.preferences.summary', 'dating preferences PT summary key'],
];

const missingDatingPreferencesRefs = phase5DatingPreferencesRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingDatingPreferencesRefs.length > 0) {
  failures.push(`DatingPreferencesSheet localization refs are missing: ${missingDatingPreferencesRefs.join(', ')}`);
}

const phase5InstagramStaticHardcodedMarkers = [
  "label: 'Inner Circle'",
  "label: 'Close Friend'",
  "label: 'Friendly'",
  "label: 'Acquaintance'",
  "label: 'Stranger'",
  'Image Fit',
  'Crop, fit, and position before posting.',
  'Remove',
  'Cover',
  'Fill square.',
  'Fit Full',
  'Show all.',
  "label: 'Zoom'",
  "label: 'Move Left / Right'",
  "label: 'Move Up / Down'",
].filter((marker) => instagramAppSource.includes(marker));

if (phase5InstagramStaticHardcodedMarkers.length > 0) {
  failures.push(`InstagramApp relationship/image-editor labels are still hard-coded: ${phase5InstagramStaticHardcodedMarkers.join(', ')}`);
}

const phase5InstagramStaticRefs = [
  [instagramAppSource, "tr('instagram.relationship.innerCircle')", 'Instagram inner circle localization'],
  [instagramAppSource, "tr('instagram.imageFit.title')", 'Instagram image fit title localization'],
  [instagramAppSource, "label: tr('instagram.imageFit.zoom')", 'Instagram image editor range localization'],
  [english, 'instagram.relationship.innerCircle', 'Instagram EN relationship key'],
  [english, 'instagram.imageFit.title', 'Instagram EN image fit title key'],
  [english, 'instagram.imageFit.moveHorizontal', 'Instagram EN move horizontal key'],
  [translations.get('pt-BR') || new Map(), 'instagram.relationship.innerCircle', 'Instagram PT relationship key'],
  [translations.get('pt-BR') || new Map(), 'instagram.imageFit.title', 'Instagram PT image fit title key'],
  [translations.get('pt-BR') || new Map(), 'instagram.imageFit.moveHorizontal', 'Instagram PT move horizontal key'],
];

const missingInstagramStaticRefs = phase5InstagramStaticRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingInstagramStaticRefs.length > 0) {
  failures.push(`InstagramApp static localization refs are missing: ${missingInstagramStaticRefs.join(', ')}`);
}

const phase5LuxeOptionBankHardcodedMarkers = [
  "label: 'Small Talk'",
  "label: 'Deep Talk'",
  "label: 'Career Talk'",
  "label: 'Tease'",
  "label: 'Compliment'",
  "label: 'Turn Up Heat'",
  'You have expensive taste. I respect that.',
  'That was smoother than I expected.',
  "label: 'Private Dinner'",
  "description: 'A discreet chemistry test with no cameras.'",
  "bestFor: 'Private romance'",
].filter((marker) => luxeAppSource.includes(marker));

if (phase5LuxeOptionBankHardcodedMarkers.length > 0) {
  failures.push(`LuxeApp chat/invite option banks are still hard-coded: ${phase5LuxeOptionBankHardcodedMarkers.join(', ')}`);
}

const phase5LuxeOptionBankRefs = [
  [luxeAppSource, "labelKey: 'luxe.chat.smallTalk.label'", 'Luxe chat label keys'],
  [luxeAppSource, "lineKeys: [", 'Luxe chat line key arrays'],
  [luxeAppSource, "const localizedChatOptions = CHAT_OPTIONS.map", 'Luxe localized chat options'],
  [luxeAppSource, "const warmResponses = getLuxeResponseBank('warm')", 'Luxe warm response localization'],
  [luxeAppSource, "labelKey: 'luxe.invite.privateDinner.label'", 'Luxe invite label keys'],
  [luxeAppSource, "const localizedInviteOptions = INVITE_OPTIONS.map", 'Luxe localized invite options'],
  [english, 'luxe.chat.smallTalk.label', 'Luxe EN small talk label'],
  [english, 'luxe.chat.smallTalk.line.0', 'Luxe EN small talk line'],
  [english, 'luxe.response.warm.0', 'Luxe EN warm response'],
  [english, 'luxe.invite.privateDinner.label', 'Luxe EN private dinner label'],
  [translations.get('pt-BR') || new Map(), 'luxe.chat.smallTalk.label', 'Luxe PT small talk label'],
  [translations.get('pt-BR') || new Map(), 'luxe.chat.smallTalk.line.0', 'Luxe PT small talk line'],
  [translations.get('pt-BR') || new Map(), 'luxe.response.warm.0', 'Luxe PT warm response'],
  [translations.get('pt-BR') || new Map(), 'luxe.invite.privateDinner.label', 'Luxe PT private dinner label'],
];

const missingLuxeOptionBankRefs = phase5LuxeOptionBankRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLuxeOptionBankRefs.length > 0) {
  failures.push(`LuxeApp chat/invite option-bank localization refs are missing: ${missingLuxeOptionBankRefs.join(', ')}`);
}

const phase5LuxeOutcomeHardcodedMarkers = [
  'sliding into elite DMs',
  'Insiders are whispering that',
  'Your Luxe signal to',
  'new public romance sparks intense speculation online',
  'steps out publicly with',
  'Fans, tabloids, and insiders are all trying to decode',
  'The pairing is already generating buzz',
  'just went public with',
  'chemistry looked very real',
  'faces affair whispers after luxe outing',
  'Observers are connecting dots',
].filter((marker) => luxeAppSource.includes(marker));

if (phase5LuxeOutcomeHardcodedMarkers.length > 0) {
  failures.push(`LuxeApp generated outcome copy is still hard-coded: ${phase5LuxeOutcomeHardcodedMarkers.join(', ')}`);
}

const phase5LuxeOutcomeRefs = [
  [luxeAppSource, "tr('luxe.signal.news.headline'", 'Luxe failed signal news localization'],
  [luxeAppSource, "tr('luxe.signal.log'", 'Luxe failed signal log localization'],
  [luxeAppSource, 'buildPostInvitePlayer(player, activeChatMatch, finalHistory, option.label, inviteMode, cost, outcome, language)', 'Luxe invite outcome passes language'],
  [luxeAppSource, "t(language, 'luxe.outcome.news.publicSameGender.headline'", 'Luxe public news localization'],
  [luxeAppSource, "t(language, 'luxe.outcome.x.publicSameGender'", 'Luxe public X post localization'],
  [luxeAppSource, "t(language, 'luxe.outcome.news.affair.subtext'", 'Luxe affair news localization'],
  [english, 'luxe.signal.news.headline', 'Luxe EN signal news key'],
  [english, 'luxe.outcome.news.publicSameGender.headline', 'Luxe EN public same-gender headline key'],
  [english, 'luxe.outcome.x.publicDifferentGender', 'Luxe EN public X post key'],
  [translations.get('pt-BR') || new Map(), 'luxe.signal.news.headline', 'Luxe PT signal news key'],
  [translations.get('pt-BR') || new Map(), 'luxe.outcome.news.publicSameGender.headline', 'Luxe PT public same-gender headline key'],
  [translations.get('pt-BR') || new Map(), 'luxe.outcome.x.publicDifferentGender', 'Luxe PT public X post key'],
];

const missingLuxeOutcomeRefs = phase5LuxeOutcomeRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingLuxeOutcomeRefs.length > 0) {
  failures.push(`LuxeApp generated outcome localization refs are missing: ${missingLuxeOutcomeRefs.join(', ')}`);
}

const phase5MobileNewsXHardcodedMarkers = [
  'Friend favor: ${friendName}',
  "return 'Music Desk'",
  "tags.push('Music')",
  "label: 'Music', value: 'Live'",
  "label: 'Career', prompt: 'Career Update'",
  "label: 'Hot Take', prompt: 'Hot Take'",
  "label: 'Drama', prompt: 'Drama Reply'",
  "SUPPORT: { label: 'Support'",
  "CLAP_BACK: { label: 'Clap Back'",
  "CAREER: ['Booked and busy era?'",
  "quoteList: ['Interesting timing.'",
  "This is spreading outside the fandom.",
].filter((marker) => (
  mobilePageSource.includes(marker) ||
  newsAppSource.includes(marker) ||
  xAppSource.includes(marker)
));

if (phase5MobileNewsXHardcodedMarkers.length > 0) {
  failures.push(`Mobile/News/X generated labels are still hard-coded: ${phase5MobileNewsXHardcodedMarkers.join(', ')}`);
}

const phase5MobileNewsXRefs = [
  [mobilePageSource, "tr('mobile.finance.friendFavor'", 'Mobile friend favor finance description localization'],
  [newsAppSource, "t(language, 'news.source.music')", 'News music source localization'],
  [newsAppSource, "t(language, 'news.tag.music')", 'News music tag localization'],
  [xAppSource, "labelKey: 'x.postType.CAREER.label'", 'X post type label keys'],
  [xAppSource, "const getXPostTypeConfig = (type: XPostType)", 'X post type localization helper'],
  [xAppSource, "labelKey: 'x.replyTone.SUPPORT.label'", 'X reply tone label keys'],
  [xAppSource, "const getXReplyToneConfig = (tone: XReplyTone)", 'X reply tone localization helper'],
  [xAppSource, "const getXReplyBank = (type: XPostType)", 'X reply bank localization helper'],
  [xAppSource, "const getXQuoteBank = (kind: 'profile' | 'player' | 'reply')", 'X quote bank localization helper'],
  [english, 'mobile.finance.friendFavor', 'Mobile EN friend favor key'],
  [english, 'news.source.music', 'News EN music source key'],
  [english, 'x.postType.CAREER.label', 'X EN career label key'],
  [english, 'x.replyBank.CAREER.0', 'X EN career reply bank key'],
  [translations.get('pt-BR') || new Map(), 'mobile.finance.friendFavor', 'Mobile PT friend favor key'],
  [translations.get('pt-BR') || new Map(), 'news.source.music', 'News PT music source key'],
  [translations.get('pt-BR') || new Map(), 'x.postType.CAREER.label', 'X PT career label key'],
  [translations.get('pt-BR') || new Map(), 'x.replyBank.CAREER.0', 'X PT career reply bank key'],
];

const missingMobileNewsXRefs = phase5MobileNewsXRefs
  .filter(([source, marker]) => source instanceof Map ? !source.has(marker) : !source.includes(marker))
  .map(([, , label]) => label);

if (missingMobileNewsXRefs.length > 0) {
  failures.push(`Mobile/News/X localization refs are missing: ${missingMobileNewsXRefs.join(', ')}`);
}

const hardcodedPattern = /\balert\s*\(\s*['"`][A-Z]|\b(title|description|label|headline|subtext|content|log):\s*['"`][A-Z][^'"`{]{4,}/;
const businessCatalogStaticCoverageReady = missingBusinessCatalogStaticRefs.length === 0;
const famousProjectCoverageReady = missingFamousProjectRefs.length === 0;
const releaseMarketingCampaignCoverageReady = missingReleaseMarketingCampaignRefs.length === 0;
const isCoveredBusinessCatalogStaticLine = (file, lineNumber) => (
  businessCatalogStaticCoverageReady &&
  file === 'services/businessLogic.ts' &&
  lineNumber >= 20 &&
  lineNumber <= 175
);
const isCoveredFamousProjectCatalogLine = (file, lineNumber) => (
  famousProjectCoverageReady &&
  file === 'services/famousMovieLogic.ts' &&
  lineNumber >= 17 &&
  lineNumber <= 155
);
const isCoveredKeyedLifeEventLine = (file, lines, index) => {
  if (file !== 'services/lifeEventLogic.ts') return false;
  const line = lines[index];
  const keyedFields = [
    ['title', 'titleKey', 8],
    ['description', 'descriptionKey', 8],
    ['label', 'labelKey', 8],
    ['log', 'logKey', 10],
  ];
  return keyedFields.some(([field, keyField, windowSize]) => {
    if (!new RegExp(`\\b${field}\\s*:`).test(line)) return false;
    return new RegExp(`\\b${keyField}\\s*:`).test(lines.slice(index, index + Number(windowSize) + 1).join('\n'));
  });
};
const isCoveredKeyedProductionEventLine = (file, lines, index) => {
  if (file !== 'services/productionEvents.ts') return false;
  const line = lines[index];
  const keyedFields = [
    ['title', 'titleKey', 6],
    ['description', 'descriptionKey', 6],
    ['label', 'labelKey', 6],
    ['log', 'logKey', 8],
  ];
  return keyedFields.some(([field, keyField, windowSize]) => {
    if (!new RegExp(`\\b${field}\\s*:`).test(line)) return false;
    return new RegExp(`\\b${keyField}\\s*:`).test(lines.slice(index, index + Number(windowSize) + 1).join('\n'));
  });
};
const isCoveredKeyedProductionServiceLine = (file, lines, index) => {
  if (file !== 'services/productionService.ts') return false;
  const line = lines[index];
  const keyedFields = [
    ['title', 'titleKey', 6],
    ['description', 'descriptionKey', 6],
    ['label', 'labelKey', 6],
    ['log', 'logKey', 8],
  ];
  return keyedFields.some(([field, keyField, windowSize]) => {
    if (!new RegExp(`\\b${field}\\s*:`).test(line)) return false;
    return new RegExp(`\\b${keyField}\\s*:`).test(lines.slice(index, index + Number(windowSize) + 1).join('\n'));
  });
};
const isCoveredKeyedLifestyleChoiceLine = (file, lines, index) => {
  if (file !== 'services/lifestyleActivities.ts') return false;
  const line = lines[index];
  if (!/\b(label|description)\s*:/.test(line)) return false;
  const nearbyChoiceFactory = lines.slice(Math.max(0, index - 5), index + 6).join('\n');
  return /create(?:Shared|TripCity|Extra)Choice\s*\(/.test(nearbyChoiceFactory)
    || /createPetStore\s*\(/.test(nearbyChoiceFactory)
    || /\b(labelKey|descriptionKey)\s*:/.test(lines.slice(index, index + 5).join('\n'));
};
const isCoveredKeyedLifestyleLogicLine = (file, lines, index) => {
  if (file !== 'services/lifestyleLogic.ts') return false;
  const line = lines[index];
  if (!/\b(label|description|desc)\s*:/.test(line)) return false;
  const nearby = lines.slice(Math.max(0, index - 2), index + 3).join('\n');
  if (/\b(labelKey|nameKey|descriptionKey)\s*:/.test(nearby)) return true;
  const idMatch = nearby.match(/\bid:\s*'([^']+)'/);
  if (!idMatch) return false;
  const [, id] = idMatch;
  return english.has(`lifestyle.custom.${id}.name`)
    && english.has(`lifestyle.custom.${id}.desc`)
    && (translations.get('pt-BR') || new Map()).has(`lifestyle.custom.${id}.name`)
    && (translations.get('pt-BR') || new Map()).has(`lifestyle.custom.${id}.desc`);
};
const PROFILE_BUILDER_CATEGORY_IDS = new Set([
  'skinTone',
  'faceShape',
  'hair',
  'hairColor',
  'eyebrows',
  'eyes',
  'eyeColor',
  'nose',
  'mouth',
  'facialHair',
  'outfit',
  'frame',
]);
const isCoveredProfileBuilderCatalogLine = (file, lines, index) => {
  if (file !== 'services/profileBuilder.ts') return false;
  const line = lines[index];
  if (!/\blabel\s*:/.test(line)) return false;
  const nearby = lines.slice(Math.max(0, index - 1), index + 2).join('\n');
  const categoryMatch = nearby.match(/\bid:\s*'([^']+)'/);
  if (!categoryMatch) return false;
  const [, id] = categoryMatch;
  const profileKey = line.includes('PROFILE_BUILDER_CATEGORIES') || PROFILE_BUILDER_CATEGORY_IDS.has(id)
    ? `profileBuilder.category.${id}`
    : `profileBuilder.part.${id}`;
  return english.has(profileKey) && (translations.get('pt-BR') || new Map()).has(profileKey);
};
const isCoveredProjectInvestorCatalogLine = (file, lines, index) => {
  if (file !== 'services/projectInvestors.ts') return false;
  const line = lines[index];
  if (!/\b(personality|profile|description)\s*:/.test(line)) return false;
  const nearby = lines.slice(Math.max(0, index - 20), index + 2).join('\n');
  const idMatch = nearby.match(/\bid:\s*'([^']+)'/);
  const fieldMatch = line.match(/\b(personality|profile|description)\s*:/);
  if (!idMatch || !fieldMatch) return false;
  const key = `services.projectInvestors.investor.${idMatch[1]}.${fieldMatch[1]}`;
  return english.has(key) && (translations.get('pt-BR') || new Map()).has(key);
};
const isCoveredGlobalActorPackLine = (file, lines, index) => (
  file === 'services/npcLogic.ts' &&
  index + 1 >= 744 &&
  index + 1 <= 758 &&
  /\b(label|description)\s*:/.test(lines[index]) &&
  english.has('services.npc.globalActorPack.label') &&
  english.has('services.npc.globalActorPack.description') &&
  (translations.get('pt-BR') || new Map()).has('services.npc.globalActorPack.label') &&
  (translations.get('pt-BR') || new Map()).has('services.npc.globalActorPack.description')
);
const isCoveredMarketingStrategyCatalogLine = (file, lines, index) => (
  releaseMarketingCampaignCoverageReady &&
  file === 'services/marketingStrategy.ts' &&
  index + 1 >= 20 &&
  index + 1 <= 106 &&
  /\b(label|shortLabel|description|promise)\s*:/.test(lines[index])
);
const isCoveredKeyedTalentInstabilityEventLine = (file, lines, index) => {
  if (file !== 'services/talentInstability.ts') return false;
  const line = lines[index];
  const keyedFields = [
    ['label', 'labelKey', 5],
    ['description', 'descriptionKey', 5],
  ];
  if (/\blabel\s*:/.test(line)) {
    const nearby = lines.slice(index, index + 5).join('\n');
    if (/\blabelKey\s*:/.test(nearby)) return true;
    if (/\blabelKey\s*:/.test(lines.slice(Math.max(0, index - 2), index + 3).join('\n'))) return true;
  }
  if (/\bvalue\s*:/.test(line)) {
    return /\blabelKey\s*:/.test(lines.slice(Math.max(0, index - 2), index + 3).join('\n'));
  }
  return keyedFields.some(([field, keyField, windowSize]) => {
    if (!new RegExp(`\\b${field}\\s*:`).test(line)) return false;
    return new RegExp(`\\b${keyField}\\s*:`).test(lines.slice(index, index + Number(windowSize) + 1).join('\n'));
  });
};
const isCoveredUniverseLogicCatalogLine = (file, lines, index) => {
  if (file !== 'services/universeLogic.ts') return false;
  const line = lines[index];
  const pickIndex = lines.findIndex((entry) => entry.includes('const pick ='));
  if (pickIndex !== -1 && index < pickIndex) return true;
  if (/\b(leadActorId|directorName|reviews|sourceMaterial|connectedProjectIntent|tags|status|projectType|visibleHype|budgetTier|catalogId|actorId)\s*:/.test(line)) return true;
  if (/\b(type|role|roleType|genre|studioId|currentPhase|id|source)\s*:/.test(line) && /['"][A-Z0-9_ -]+['"]/.test(line)) return true;
  if (line.includes('(Reboot)')) return true;
  return false;
};
const isCoveredHomeDevToolLine = (file, lines, index) => {
  if (file !== 'views/HomePage.tsx') return false;
  const lineNo = index + 1;
  const line = lines[index];
  const inDevToolBuilderBlock = lineNo >= 280 && lineNo <= 5968;
  const inDevToolOverlay = lineNo >= 5990 && lineNo <= 6572;
  if (!inDevToolBuilderBlock && !inDevToolOverlay) return false;
  return /CHEAT|QA|DEV|Debug|Dev|Firebase|diagnostics|test|Testing|trigger|Dev Tools|Developer Access|activeCheatMenu|setActiveCheatMenu|cheat_|qa_|qaPrefix|returningTalent|weeksInDevelopment|totalDevelopmentWeeks|alert\(|title:|description:|label:|message:|subject:|text:|caption:|comments:|content:|eventLog:|logline:|sender:|name:|headline:|subtext:|log:/.test(line);
};
const isCoveredBoxOfficeIntentionalTitleLine = (file, lines, index) => (
  file === 'views/mobile/BoxOfficeApp.tsx' &&
  index + 1 >= 78 &&
  index + 1 <= 86 &&
  /\btitle:\s*['"`]/.test(lines[index])
);
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
      !line.includes('tr(') &&
      !isCoveredBusinessCatalogStaticLine(file, index + 1) &&
      !isCoveredFamousProjectCatalogLine(file, index + 1) &&
      !isCoveredKeyedLifeEventLine(file, lines, index) &&
      !isCoveredKeyedProductionEventLine(file, lines, index) &&
      !isCoveredKeyedProductionServiceLine(file, lines, index) &&
      !isCoveredKeyedLifestyleChoiceLine(file, lines, index)
      && !isCoveredKeyedLifestyleLogicLine(file, lines, index)
      && !isCoveredProfileBuilderCatalogLine(file, lines, index)
      && !isCoveredProjectInvestorCatalogLine(file, lines, index)
      && !isCoveredGlobalActorPackLine(file, lines, index)
      && !isCoveredMarketingStrategyCatalogLine(file, lines, index)
      && !isCoveredKeyedTalentInstabilityEventLine(file, lines, index)
      && !isCoveredUniverseLogicCatalogLine(file, lines, index)
      && !isCoveredHomeDevToolLine(file, lines, index)
      && !isCoveredBoxOfficeIntentionalTitleLine(file, lines, index)
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
