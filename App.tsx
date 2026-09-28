
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { INITIAL_PLAYER, Player, Page, Commitment, PressInteraction, SocialEvent, ActorSkills, AdType, Relationship, ProjectDetails, ActiveRelease, PastProject, StreamingState, PregnancyCarrier, ScheduledEvent, SponsorshipOffer } from './types';
import { BottomNav } from './components/BottomNav';
import './components/layout-adapters/actorEmpireShell.css';
import { isKeyboardOccludingViewport } from './components/layout-adapters/shellGeometry';
import { NewPlayerTutorialOverlay } from './components/NewPlayerTutorialOverlay';
import { ProductionCrisisModal } from './components/ProductionCrisisModal';
import { LifeEventModal, type LifeEventChoiceCommit } from './components/LifeEventModal';
import { StockControlEventModal } from './components/StockControlEventModal';
import { SaveRecoveryModal } from './components/SaveRecoveryModal';
import { WeekProcessingRecoveryModal } from './components/WeekProcessingRecoveryModal';
import { SaveTransferProgressOverlay } from './components/SaveTransferProgressOverlay';
import { DebtRecoveryModal } from './components/DebtRecoveryModal';
import { GameToast } from './components/GameToast';
import { RewardSaveRetryDialog } from './components/RewardSaveRetryDialog';
import { applyCrisisImpact } from './services/productionService';
import { StartMenu } from './views/StartMenu';
import { ActorEmpireIntroStyle, ActorEmpireLoadingScreen, ActorEmpireCareerOpeningScreen } from './components/ActorEmpireIntro';
import ZedburyStudiosIntro from './components/ZedburyStudiosIntro';
import type { NewCareerData } from './components/types';
import { generateAuditions, generatePartTimeJobs } from './services/roleLogic';
import { generateWeeklyFeed, calculateInteraction, getGenderedAvatar } from './services/npcLogic';
import { getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists, getRandomWellness, sanitizeTeamPools } from './services/teamLogic';
import { createBusiness, normalizeStudioState } from './services/businessLogic';
import { CheckCircle, Heart, ShieldAlert, PlayCircle, Baby, ChevronRight } from 'lucide-react';
import { useGameActions } from './hooks/useGameActions';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from './services/lifestyleLogic';
import { showAd, startRewardedAdPreloading, setOptionalRewardedAdPreloadingSuspended } from './services/adLogic';
import { requestRewardedAd } from './services/rewardedAdCoordinator';
import { subscribeRewardedAdDiagnostics } from './services/rewardedAdDiagnostics';
import {
  beginWellnessAdAttempt,
  classifyRewardedAdFailure,
  createWellnessRewardAdState,
  expireWellnessRewardAdState,
  restoreWellnessRewardAdState,
  settleWellnessAdAttempt,
} from './services/rewardedAdExperience';
import {
  beginPendingRewardAd,
  clearPendingRewardAd,
  markPendingRewardAdReady,
  pausePendingRewardAdContinuation,
  readPendingRewardAd,
  recordPendingRewardAdStep,
  RewardedAdPersistenceError,
  setPendingRewardAdContinuationExpiry,
  type PendingRewardAdReceipt,
} from './services/rewardedAdRecovery';
import {
  attachRewardedAdGrantProof,
  runRewardedAdGrantTransaction,
  type RewardedAdGrantOutcome,
} from './services/rewardedAdGrantTransaction';
import { ensureTrackingPermission } from './services/trackingService';
import { createDeferredSaveSlotSummary, createSaveSlotSummary, deleteVerifiedGameData, getGameSaveSummary, listGameDataKeysStrict, loadVerifiedGameData, recoverPreviousGameData, saveVerifiedGameData, writeGameSaveSummary, type SaveSlotSummary } from './services/storage';
import { IndexedDbOperationError } from './services/indexedDbResilience';
import {
  beginStartupAttempt,
  beginStartupRetry,
  completeStartupTask,
  createStartupState,
  failStartupTask,
  recoverStartupTask,
  startStartupTask,
  timeoutStartupTask,
  type StartupState,
  type StartupTaskId,
} from './services/startupCoordinator';
import { prepareCriticalStartupAssets } from './services/startupCriticalPackage';
import {
  getReadyGameScreens,
  loadAllGameScreens,
  type GameScreens,
} from './services/startupHomeScreen';
import { getStartupPresentation } from './services/startupPresentation';
import {
  createStartupBackgroundScheduler,
  type StartupBackgroundTask,
} from './services/startupBackgroundPreparation';
import { createStartupExecutionLock } from './services/startupExecutionLock';
import { advanceStartupFailureCount } from './services/startupSafeMode';
import {
  installStartupDiagnosticSink,
  recordStartupCheckpoint,
  setStartupDiagnosticContext,
} from './services/startupDiagnostics';
import { readNativeStartupRecoveryState } from './services/nativeStartupRecovery';
import { buildLegacyStudioInheritance, createBloodlineSnapshot, getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge, inferStreamingStartWeekAbsolute, inheritActorSkills, LEGACY_MIN_PLAYABLE_AGE } from './services/legacyLogic';
import { handoffOwnedStreamingPlatformToHeir } from './services/streamingLegacy';
import { applyPremiumPurchase, getRequiredPremiumProductForAsset, hasNoAds, isNonConsumablePremiumProduct, PremiumProductId, spendPlayerEnergy, syncEnergyDisplay, syncWeeklyEnergyForCommitments } from './services/premiumLogic';
import { purchasePremiumProduct, restorePremiumPurchases, startIOSPurchaseUpdatesListener, type IOSPurchaseUpdate } from './services/iapService';
import { sanitizeAwardRecords } from './services/awardLogic';
import { RoleType } from './types';
import { applyParenthoodAbandonment, getPregnancyFeedbackCopy } from './services/familyLogic';
import { APP_DISPLAY_VERSION } from './services/appVersion';
import { CHANGELOG_ENTRIES, getChangelogTypeLabel, getLatestChangelogEntry } from './services/changelog';
import { calculateInstagramPostOutcome, clampInstagramStat, INSTAGRAM_POST_CONFIGS } from './services/instagramLogic';
import { normalizeUniverseMap } from './services/universeLogic';
import { hydrateGenreXP } from './services/genreCatalog';
import { createInstagramReferralOutcome } from './services/instagramOfferLogic';
import { executeStockTrade } from './services/stockLogic';
import { migratePlayerSave } from './services/saveMigration';
import { prepareExternalPlayerUpdateForUi, prepareProcessedWeekForUi } from './services/playerUiState';
import { applyIndustryMediaCampaignParticipation } from './services/industryWorld';
import { yieldForWeekProcessingPaint, yieldToMainThread } from './services/weekProcessingScheduler';
import { describeWeekProcessingFailure } from './services/weekProcessingRecovery';
import { checkpointNativeMemoryPressure } from './services/nativeMemoryCheckpoint';
import { autosaveDelayAfterPressure, createSaveOperationQueue } from './services/saveOperationQueue';
import { clearGeneratedAvatarCache } from './services/npcAvatar';
import {
  acknowledgeIOSLongSessionReport,
  chooseIOSRendererRecoverySlot,
  getIOSLongSessionPlayerCounts,
  isIOSRendererRecoveryLoadVerified,
  notifyIOSLongSessionCheckpoint,
  readIOSLongSessionDiagnostics,
  toIOSLongSessionTelemetry,
  tryIOSRendererRecoveryOpen,
  type IOSLongSessionNativeState,
} from './services/iosLongSessionDiagnostics';
import {
  readAndroidDeviceCapabilities,
  toDeviceCapabilityTelemetry,
} from './services/nativeDeviceCapabilities';
import { exportSignedSaveArchive, importSignedSaveArchiveFromFile } from './services/saveTransfer';
import {
  createDelayedSaveTransferProgressPresenter,
  isSaveTransferCancelledError,
  type SaveTransferProgress,
  type SaveTransferProgressPresenter,
} from './services/saveTransferExperience';
import {
  createSaveTransferOperationLock,
  type SaveTransferOperationLease,
  type SaveTransferOperationLock,
} from './services/saveTransferSafety';
import { grantMigrationCarePackageIfEligible, MIGRATION_CARE_PACKAGE_CASH, MIGRATION_CARE_PACKAGE_ENERGY } from './services/migrationCarePackage';
import { externalizeCustomPostersInPlayer } from './services/customPosterMedia';
import { prepareLocalStorageMirror } from './services/saveMirror';
import { estimateSaveJsonBytes, prepareVerifiedPlayerForPersistence } from './services/savePreparation';
import { commitLifeEventResolutionTransaction } from './services/lifeEventResolutionTransaction';
import {
  startStartupPerformanceMeasurement,
  toStartupPerformanceTelemetry,
  type StartupPerformanceMeasurement,
} from './services/startupPerformance';
import {
  createStartupCalibrationCoordinator,
  toStartupCalibrationTelemetry,
  type AndroidStartupCalibration,
  type StartupCalibrationCoordinator,
} from './services/startupCalibration';
import { resolvePerformanceCapabilities } from './services/performanceCapabilities';
import { PerformanceCapabilitiesRoot } from './components/PerformanceCapabilitiesRoot';
import { PerformanceOptimizedNotice } from './components/PerformanceOptimizedNotice';
import {
  PERFORMANCE_NOTICE_VERSION,
  normalizePerformanceSettings,
  type PerformancePreference,
} from './services/performancePreferences';
import {
  advanceAdaptivePerformance,
  createAdaptivePerformanceState,
  type AdaptivePerformanceDecision,
  type AdaptivePerformanceInput,
  type AdaptivePerformancePlatform,
} from './services/adaptivePerformanceController';
import { startRuntimePerformanceMonitor } from './services/runtimePerformanceMonitor';
import {
  collectDueDeviceValidationCheckpoints,
  createDeviceValidationSession,
  recordDeviceValidationDecision,
  recordDeviceValidationHealthWindow,
  recordDeviceValidationNativeSnapshot,
  setDeviceValidationSessionActive,
  toDeviceValidationTelemetry,
  type DeviceValidationSession,
} from './services/deviceValidation';
import type { SaveIntegrityReason } from './services/saveIntegrity';
import { buildAvailableNewPlayerTutorialState, shouldShowNewPlayerTutorial, writeNewPlayerTutorialState, type NewPlayerTutorialState } from './services/newPlayerTutorial';
import { acceptOutsideProducerInvestmentOffer, counterOutsideProducerInvestmentOffer } from './services/outsideProductions';
import { PHASE_ONE_ENERGY_COSTS } from './services/energyCosts';
import { getPlayerLanguage, isSupportedGameLanguage, t } from './services/i18n';
import { getHealthConditionLabel } from './services/healthConditions';
import { applyProjectPromotionAttribution } from './services/projectPromotionAttribution';
import { quoteRealEstateSale } from './services/realEstateLogic';
import {
  addBreadcrumb,
  markGameCheckpoint,
  markTraceAction,
  markWeekProcessingStage,
  recoverInterruptedWeekProcessingTrace,
  recordFlowFailure,
  recordNonFatal,
  setCrashContext,
  setCrashKey,
  setCurrentGameScreen,
  startPerformanceTrace,
  stopPerformanceTrace,
  trackGameEvent,
  trackGameEventConfirmed,
} from './services/firebaseService';

const CareerPage: GameScreens['CareerPage'] = props => {
  const Component = getReadyGameScreens().CareerPage;
  return <Component {...props} />;
};
const HomePage: GameScreens['HomePage'] = props => {
  const Component = getReadyGameScreens().HomePage;
  return <Component {...props} />;
};
const CreationMenu: GameScreens['CreationMenu'] = props => {
  const Component = getReadyGameScreens().CreationMenu;
  return <Component {...props} />;
};
const DeathScreen: GameScreens['DeathScreen'] = props => {
  const Component = getReadyGameScreens().DeathScreen;
  return <Component {...props} />;
};
const RedCarpetEvent: GameScreens['RedCarpetEvent'] = props => {
  const Component = getReadyGameScreens().RedCarpetEvent;
  return <Component {...props} />;
};
const PressConferenceEvent: GameScreens['PressConferenceEvent'] = props => {
  const Component = getReadyGameScreens().PressConferenceEvent;
  return <Component {...props} />;
};
const ImprovePage: GameScreens['ImprovePage'] = props => {
  const Component = getReadyGameScreens().ImprovePage;
  return <Component {...props} />;
};
const SocialPage: GameScreens['SocialPage'] = props => {
  const Component = getReadyGameScreens().SocialPage;
  return <Component {...props} />;
};
const LifestylePage: GameScreens['LifestylePage'] = props => {
  const Component = getReadyGameScreens().LifestylePage;
  return <Component {...props} />;
};
const MobilePage: GameScreens['MobilePage'] = props => {
  const Component = getReadyGameScreens().MobilePage;
  return <Component {...props} />;
};
const SettingsPage: GameScreens['SettingsPage'] = props => {
  const Component = getReadyGameScreens().SettingsPage;
  return <Component {...props} />;
};
const StorePage: GameScreens['StorePage'] = props => {
  const Component = getReadyGameScreens().StorePage;
  return <Component {...props} />;
};

type GameStatus = 'START_MENU' | 'CREATION' | 'PLAYING' | 'DEATH_SCREEN';
const LOCAL_STORAGE_SAVE_MIRROR_BUDGET_BYTES = 600_000;
const IOS_MEMORY_WARNING_AUTOSAVE_COOLDOWN_MS = 30_000;
const SAFE_BOOT_SESSION_KEY = 'actorEmpire.safeBootOnce';
const AUTOMATIC_PERFORMANCE_APPLICATION_ENABLED = import.meta.env.VITE_ADAPTIVE_PERFORMANCE_APPLY === 'true';

const getAdaptivePerformancePlatform = (): AdaptivePerformancePlatform => {
  if (!Capacitor.isNativePlatform()) return 'WEB';
  return Capacitor.getPlatform() === 'android' ? 'ANDROID' : 'IOS';
};
type PendingBabyNaming = {
  partnerId: string;
  partnerName: string;
  pregnancyCarrier?: PregnancyCarrier;
  babyGender: 'MALE' | 'FEMALE';
  suggestedFirstName: string;
  birthWeekAbsolute: number;
  eventWeek: number;
  eventYear: number;
  shouldCreateScandalNews: boolean;
};

type PendingMedicalPrompt = {
  conditionName: string;
  severity?: string;
  healthCap?: number;
};

type PendingSaveRecovery = {
  slot: number;
  storageKey: string;
  previous: Player;
  violations: string[];
};

type PendingWeekProcessingFailure = {
  age: number;
  week: number;
  failedStage: string;
  detail: string;
  failureCode: string;
  failures: string[];
};

const getMedicalPromptCooldownWeeks = (severity?: string) => {
  if (severity === 'MINOR') return 2;
  if (severity === 'MODERATE') return 4;
  return 0;
};

const getMedicalPromptSeverityRank = (severity?: string) => {
  if (severity === 'CRITICAL') return 4;
  if (severity === 'SEVERE') return 3;
  if (severity === 'MODERATE') return 2;
  if (severity === 'MINOR') return 1;
  return 0;
};

const PREGNANCY_TERM_WEEKS = 39;
const WHATS_NEW_STORAGE_KEY = 'actorEmpireSeenWhatsNewVersion';
const PREMIUM_ENTITLEMENTS_STORAGE_KEY = 'actorEmpirePremiumEntitlements';
const PREMIUM_SAVE_SLOT_IDS = [1, 2, 3] as const;
const AUTOSAVE_DEBOUNCE_MS = 750;
const PLAYTIME_FLUSH_INTERVAL_MS = 60_000;
/* Zedbury Studios ident — the approved timing, kept verbatim from the design:
   the mark holds for 1150ms, then fades out over 320ms. The frame it leaves is
   black, which is already the loading screen's frame, so no transition device
   is needed between the two. */
const STARTUP_STUDIO_BUMPER_EXIT_MS = 1150;
const STARTUP_STUDIO_BUMPER_MS = STARTUP_STUDIO_BUMPER_EXIT_MS + 320;
const STARTUP_SLOW_NOTICE_MS = 6_000;

const createMountedStartupState = (): StartupState => {
  const started = beginStartupAttempt(createStartupState());
  return completeStartupTask(started, 'APP_CORE', started.attemptId);
};

const dedupeAwards = <T extends { type: string; year: number; category: string; projectId: string; outcome: 'WON' | 'NOMINATED' }>(awards: T[] = []): T[] => {
  return sanitizeAwardRecords(awards);
};

const uniquePermanentPremiumIds = (productIds: PremiumProductId[] = []): PremiumProductId[] => {
  const seen = new Set<PremiumProductId>();
  productIds.forEach(productId => {
    if (isNonConsumablePremiumProduct(productId)) {
      seen.add(productId);
    }
  });
  return [...seen];
};

const readStoredPremiumEntitlements = (): PremiumProductId[] => {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PREMIUM_ENTITLEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return uniquePermanentPremiumIds(Array.isArray(parsed?.productIds) ? parsed.productIds : []);
  } catch (error) {
    recordNonFatal(error, 'premium_entitlements_read_failed');
    return [];
  }
};

const rememberPremiumEntitlements = (productIds: PremiumProductId[] = []): PremiumProductId[] => {
  const permanentProductIds = uniquePermanentPremiumIds(productIds);
  if (permanentProductIds.length === 0 || typeof localStorage === 'undefined') return permanentProductIds;
  try {
    const mergedProductIds = uniquePermanentPremiumIds([...readStoredPremiumEntitlements(), ...permanentProductIds]);
    localStorage.setItem(PREMIUM_ENTITLEMENTS_STORAGE_KEY, JSON.stringify({
      productIds: mergedProductIds,
      updatedAt: Date.now(),
      appVersion: APP_DISPLAY_VERSION,
    }));
    return mergedProductIds;
  } catch (error) {
    recordNonFatal(error, 'premium_entitlements_write_failed');
    return permanentProductIds;
  }
};

const applyPremiumEntitlementsToPlayer = (sourcePlayer: Player, productIds: PremiumProductId[]): { player: Player; changed: boolean } => {
  const permanentProductIds = uniquePermanentPremiumIds(productIds);
  if (permanentProductIds.length === 0) return { player: sourcePlayer, changed: false };
  const nextPlayer = JSON.parse(JSON.stringify(sourcePlayer)) as Player;
  if (!nextPlayer.flags) nextPlayer.flags = {};
  const before = JSON.stringify({
    purchases: nextPlayer.flags?.premiumPurchases || [],
    collections: nextPlayer.flags?.premiumCollections || [],
  });
  permanentProductIds.forEach(productId => {
    applyPremiumPurchase(nextPlayer, productId, getPlayerLanguage(nextPlayer));
  });
  const after = JSON.stringify({
    purchases: nextPlayer.flags?.premiumPurchases || [],
    collections: nextPlayer.flags?.premiumCollections || [],
  });
  return { player: nextPlayer, changed: before !== after };
};

const normalizeProjectDetails = (details: Partial<ProjectDetails> | undefined): ProjectDetails => {
    const hiddenStats = {
        scriptQuality: 50,
        directorQuality: 50,
        castingStrength: 50,
        distributionPower: 50,
        rawHype: 50,
        qualityScore: 50,
        prestigeBonus: 0,
        ...(details?.hiddenStats || {}),
    };

    return Object.assign({}, details, {
        title: details?.title || 'Untitled Project',
        type: details?.type || 'MOVIE',
        description: details?.description || 'No description available.',
        studioId: details?.studioId || 'INDEPENDENT',
        subtype: details?.subtype || 'STANDALONE',
        genre: details?.genre || 'ACTION',
        budgetTier: details?.budgetTier || 'LOW',
        estimatedBudget: typeof details?.estimatedBudget === 'number' ? details.estimatedBudget : 0,
        visibleHype: details?.visibleHype || 'LOW',
        directorName: details?.directorName || 'Unknown Director',
        visibleDirectorTier: details?.visibleDirectorTier || 'Professional',
        visibleScriptBuzz: details?.visibleScriptBuzz || 'Developing',
        visibleCastStrength: details?.visibleCastStrength || 'TBD',
        castList: Array.isArray(details?.castList) ? details!.castList : [],
        crewList: Array.isArray(details?.crewList) ? details!.crewList : [],
        reviews: Array.isArray(details?.reviews) ? details!.reviews : [],
        audienceReception: details?.audienceReception && typeof details.audienceReception === 'object' ? details.audienceReception : undefined,
        campaignItems: Array.isArray(details?.campaignItems) ? details!.campaignItems : [],
        hiddenStats,
    });
};

const normalizeStreamingState = (
    streaming: Partial<StreamingState> | undefined,
    details: ProjectDetails,
    playerAge: number,
    currentWeek: number
): StreamingState => {
    const normalizedStreaming: StreamingState = {
        platformId: streaming?.platformId || (details.hiddenStats.platformId as any) || 'NETFLIX',
        weekOnPlatform: typeof streaming?.weekOnPlatform === 'number' ? streaming.weekOnPlatform : 1,
        totalViews: typeof streaming?.totalViews === 'number' ? streaming.totalViews : 0,
        weeklyViews: Array.isArray(streaming?.weeklyViews) ? streaming!.weeklyViews : [],
        isLeaving: !!streaming?.isLeaving,
        ...(typeof streaming?.startWeek === 'number' ? { startWeek: streaming.startWeek } : {}),
    };

    const inferredStartWeekAbsolute = inferStreamingStartWeekAbsolute(streaming, playerAge, currentWeek);
    if (typeof inferredStartWeekAbsolute === 'number') {
        normalizedStreaming.startWeekAbsolute = inferredStartWeekAbsolute;
    }

    return normalizedStreaming;
};

const derivePlayerRoleType = (
    roleType: string | undefined,
    details?: Partial<ProjectDetails>,
    castList?: any[]
): RoleType => {
    const playerCastEntry = (castList || details?.castList || []).find((member: any) => member?.actorId === 'PLAYER_SELF');
    if (playerCastEntry?.roleType) return playerCastEntry.roleType as RoleType;
    return (roleType as RoleType) || 'LEAD';
};

const normalizeActiveRelease = (release: Partial<ActiveRelease>, playerAge: number, currentWeek: number): ActiveRelease => {
    const projectDetails = normalizeProjectDetails(release.projectDetails);
    const distributionPhase = release.distributionPhase || 'THEATRICAL';

    return {
        id: release.id || `release_${Date.now()}`,
        name: release.name || projectDetails.title,
        type: release.type || projectDetails.type,
        roleType: derivePlayerRoleType(release.roleType, projectDetails),
        projectDetails,
        distributionPhase,
        weekNum: typeof release.weekNum === 'number' ? release.weekNum : 1,
        weeklyGross: Array.isArray(release.weeklyGross) ? release.weeklyGross : [],
        totalGross: typeof release.totalGross === 'number' ? release.totalGross : 0,
        budget: typeof release.budget === 'number' ? release.budget : (projectDetails.estimatedBudget || 0),
        status: release.status || 'RUNNING',
        productionPerformance: typeof release.productionPerformance === 'number' ? release.productionPerformance : 50,
        streamingRevenue: typeof release.streamingRevenue === 'number' ? release.streamingRevenue : 0,
        bids: Array.isArray(release.bids) ? release.bids : [],
        ...(release.imdbRating !== undefined ? { imdbRating: release.imdbRating } : {}),
        ...(release.maxTheatricalWeeks !== undefined ? { maxTheatricalWeeks: release.maxTheatricalWeeks } : {}),
        ...(release.weeksInTheaters !== undefined ? { weeksInTheaters: release.weeksInTheaters } : {}),
        ...(release.studioRoyaltyPercentage !== undefined ? { studioRoyaltyPercentage: release.studioRoyaltyPercentage } : {}),
        ...(release.sequelDecisionWeek !== undefined ? { sequelDecisionWeek: release.sequelDecisionWeek } : {}),
        ...(release.sequelDecisionMade !== undefined ? { sequelDecisionMade: release.sequelDecisionMade } : {}),
        ...(release.futurePotential !== undefined ? { futurePotential: release.futurePotential } : {}),
        ...(release.promotionalBuzz !== undefined ? { promotionalBuzz: release.promotionalBuzz } : {}),
        ...(release.royaltyPercentage !== undefined ? { royaltyPercentage: release.royaltyPercentage } : {}),
        ...(release.previousBestBidValue !== undefined ? { previousBestBidValue: release.previousBestBidValue } : {}),
        ...(release.audienceReception !== undefined ? { audienceReception: release.audienceReception } : {}),
        ...(distributionPhase === 'STREAMING' ? { streaming: normalizeStreamingState(release.streaming, projectDetails, playerAge, currentWeek) } : {}),
    };
};

const normalizePastProject = (project: Partial<PastProject>): PastProject => ({
    id: project.id || `past_${Date.now()}`,
    name: project.name || 'Untitled Project',
    type: 'ACTING_GIG',
    roleType: derivePlayerRoleType(project.roleType, undefined, project.castList as any[] | undefined),
    year: typeof project.year === 'number' ? project.year : 1,
    earnings: typeof project.earnings === 'number' ? project.earnings : 0,
    rating: typeof project.rating === 'number' ? project.rating : 0,
    reception: project.reception || 'UNKNOWN',
    projectQuality: typeof project.projectQuality === 'number' ? project.projectQuality : 50,
    boxOfficeResult: project.boxOfficeResult || '$0',
    outcomeTier: project.outcomeTier || 'NEUTRAL',
    subtype: project.subtype || 'STANDALONE',
    futurePotential: project.futurePotential || {
        sequelChance: 0,
        franchiseChance: 0,
        rebootChance: 0,
        renewalChance: 0,
        isFranchiseStarter: false,
        isSequelGreenlit: false,
        isRenewed: false,
        seriesStatus: 'N/A',
        playerReturnStatus: undefined,
        returnStatusNote: undefined,
    },
    studioId: project.studioId || 'INDEPENDENT',
    budget: typeof project.budget === 'number' ? project.budget : 0,
    gross: typeof project.gross === 'number' ? project.gross : 0,
    genre: project.genre || (project as any).projectDetails?.genre || 'ACTION',
    projectType: project.projectType || 'MOVIE',
    awards: dedupeAwards(project.awards || []),
    castList: Array.isArray(project.castList) ? project.castList : [],
    reviews: Array.isArray(project.reviews) ? project.reviews : [],
    audienceReception: project.audienceReception,
    ...project,
});

const normalizeCommitment = (commitment: Partial<Commitment>): Commitment => ({
    id: commitment.id || `commitment_${Date.now()}`,
    name: commitment.name || 'Untitled Commitment',
    type: commitment.type || 'JOB',
    energyCost: typeof commitment.energyCost === 'number' ? commitment.energyCost : 0,
    income: typeof commitment.income === 'number' ? commitment.income : 0,
    payoutType: commitment.payoutType || 'WEEKLY',
    ...(commitment.lumpSum !== undefined ? { lumpSum: commitment.lumpSum } : {}),
    ...(commitment.weeklyCost !== undefined ? { weeklyCost: commitment.weeklyCost } : {}),
    ...(commitment.upfrontCost !== undefined ? { upfrontCost: commitment.upfrontCost } : {}),
    ...(commitment.roleType !== undefined ? { roleType: commitment.roleType } : {}),
    ...(commitment.projectPhase !== undefined ? { projectPhase: commitment.projectPhase } : {}),
    ...(commitment.phaseWeeksLeft !== undefined ? { phaseWeeksLeft: commitment.phaseWeeksLeft } : {}),
    ...(commitment.totalPhaseDuration !== undefined ? { totalPhaseDuration: commitment.totalPhaseDuration } : {}),
    ...(commitment.auditionPerformance !== undefined ? { auditionPerformance: commitment.auditionPerformance } : {}),
    ...(commitment.productionPerformance !== undefined ? { productionPerformance: commitment.productionPerformance } : {}),
    ...(commitment.promotionalBuzz !== undefined ? { promotionalBuzz: commitment.promotionalBuzz } : {}),
    ...(commitment.lastPressWeek !== undefined ? { lastPressWeek: commitment.lastPressWeek } : {}),
    ...(commitment.lastPressAbsolute !== undefined ? { lastPressAbsolute: commitment.lastPressAbsolute } : {}),
    ...(commitment.weeksCompleted !== undefined ? { weeksCompleted: commitment.weeksCompleted } : {}),
    ...(commitment.totalDuration !== undefined ? { totalDuration: commitment.totalDuration } : {}),
    ...(commitment.skillGains !== undefined ? { skillGains: commitment.skillGains } : {}),
    ...(commitment.statGains !== undefined ? { statGains: commitment.statGains } : {}),
    ...(commitment.writerGains !== undefined ? { writerGains: commitment.writerGains } : {}),
    ...(commitment.directorGains !== undefined ? { directorGains: commitment.directorGains } : {}),
    ...(commitment.agentCommission !== undefined ? { agentCommission: commitment.agentCommission } : {}),
    ...(commitment.royaltyPercentage !== undefined ? { royaltyPercentage: commitment.royaltyPercentage } : {}),
    ...(commitment.durationLeft !== undefined ? { durationLeft: commitment.durationLeft } : {}),
    ...(commitment.previousBestBidValue !== undefined ? { previousBestBidValue: commitment.previousBestBidValue } : {}),
    ...(commitment.projectDetails ? { projectDetails: normalizeProjectDetails(commitment.projectDetails) } : {}),
});

const normalizeSponsorshipOffer = (offer: SponsorshipOffer): SponsorshipOffer => {
    const req = (offer.requirements || {}) as SponsorshipOffer['requirements'];
    return {
        ...offer,
        id: offer.id || `spon_${Date.now()}`,
        durationWeeks: Math.max(1, Number(offer.durationWeeks || 1)),
        weeklyPay: Math.max(0, Number(offer.weeklyPay || 0)),
        penalty: Math.max(0, Number(offer.penalty || 0)),
        weeksCompleted: Math.max(0, Number(offer.weeksCompleted || 0)),
        requirements: {
            ...req,
            type: req.type || 'POST',
            energyCost: Math.max(0, Number(req.energyCost || 0)),
            totalRequired: Math.max(1, Number(req.totalRequired || 1)),
            progress: Math.max(0, Number(req.progress || 0)),
        },
    };
};

type GameErrorBoundaryProps = { onRecover: () => void; children: React.ReactNode };
type GameErrorBoundaryState = { hasError: boolean };

class GameErrorBoundary extends React.Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
    declare props: GameErrorBoundaryProps;
    declare setState: (state: Partial<GameErrorBoundaryState>) => void;
    state: GameErrorBoundaryState = { hasError: false };

    constructor(props: GameErrorBoundaryProps) {
        super(props);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Game render crash recovered by boundary:', error);
        recordNonFatal(error, 'react_render_boundary_recovered');
    }

    handleRecover = () => {
        this.props.onRecover();
        this.setState({ hasError: false });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="text-xl font-black uppercase tracking-widest mb-3">Recovery Mode</div>
                    <p className="text-sm text-zinc-400 max-w-xs mb-6">
                        A save or screen error was detected. You can return to the menu instead of getting stuck on a black screen.
                    </p>
                    <button
                        onClick={this.handleRecover}
                        className="px-6 py-3 rounded-xl bg-white text-black font-bold hover:bg-zinc-200"
                    >
                        Return To Menu
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export const App: React.FC<{ startupStudioIntroHandled?: boolean }> = ({ startupStudioIntroHandled = false }) => {
  const [player, setPlayer] = useState<Player>(() => migratePlayerSave(INITIAL_PLAYER));
  const [adaptivePerformancePlatform] = useState<AdaptivePerformancePlatform>(getAdaptivePerformancePlatform);
  const [startupCalibration, setStartupCalibration] = useState<AndroidStartupCalibration | null>(null);
  const [adaptivePerformance, setAdaptivePerformance] = useState(() => createAdaptivePerformanceState({
    preference: normalizePerformanceSettings(
      INITIAL_PLAYER.settings.performance,
      INITIAL_PLAYER.settings.smoothMode,
    ).preference,
    platform: getAdaptivePerformancePlatform(),
    startupCalibration: null,
    automaticApplicationEnabled: AUTOMATIC_PERFORMANCE_APPLICATION_ENABLED,
    nowMs: Date.now(),
  }));
  const [iosPressureConstrained, setIOSPressureConstrained] = useState(false);
  const [iosSaveCooldownEpoch, setIOSSaveCooldownEpoch] = useState(0);
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [lifestyleInitialView, setLifestyleInitialView] = useState<'MAIN' | 'ASSETS' | 'ACTIVITIES' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING_PLATFORM' | 'STREAMING_FINANCE' | null>(null);
  const [rightsMarketOpportunityId, setRightsMarketOpportunityId] = useState<string | null>(null);
  const [streamingContentOfferId, setStreamingContentOfferId] = useState<string | null>(null);
  const [studioContinuationTarget, setStudioContinuationTarget] = useState<{ studioId: string; scriptId: string } | null>(null);
  const [platformCommissionTarget, setPlatformCommissionTarget] = useState<{ studioId: string; offerId: string } | null>(null);
  const [initialForbesStudioId, setInitialForbesStudioId] = useState<string | null>(null);
  const [initialMobileStockId, setInitialMobileStockId] = useState<string | null>(null);
  const [initialMobileAppMode, setInitialMobileAppMode] = useState<'BOXOFFICE' | 'MESSAGES' | 'BANK' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const weekProcessingLockRef = useRef(false);
  const activeWeekRunIdRef = useRef<string | null>(null);
  const activeWeekStageRef = useRef('idle');
  const lastWeekProcessSettledAtRef = useRef(0);
  const suppressNextAutosaveRef = useRef(false);
  const skipNextPlayingMigrationRef = useRef(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('START_MENU');
  const [skipStartMenuIntro, setSkipStartMenuIntro] = useState(true);
  const [saveSlots, setSaveSlots] = useState<Record<number, Player | null>>({ 1: null, 2: null, 3: null });
  const [saveSlotSummaries, setSaveSlotSummaries] = useState<Record<number, SaveSlotSummary | null>>({ 1: null, 2: null, 3: null });
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Loading state for async storage
  const [safeBootRequested, setSafeBootRequested] = useState(() => {
      try {
          const requested = sessionStorage.getItem(SAFE_BOOT_SESSION_KEY) === '1';
          if (requested) sessionStorage.removeItem(SAFE_BOOT_SESSION_KEY);
          return requested;
      } catch {
          return false;
      }
  });
  const [startupStudioBumperElapsed, setStartupStudioBumperElapsed] = useState(startupStudioIntroHandled);
  const [startupStudioBumperExiting, setStartupStudioBumperExiting] = useState(false);
  const [startupState, setStartupState] = useState<StartupState>(createMountedStartupState);
  const [iosRecoveryReport, setIOSRecoveryReport] = useState<IOSLongSessionNativeState | null>(null);
  const [iosRecoveryReadComplete, setIOSRecoveryReadComplete] = useState(false);
  const [iosRecoveryRestoreComplete, setIOSRecoveryRestoreComplete] = useState(false);
  const iosRecoveryAttemptedRef = useRef(false);
  const [startupTakingLonger, setStartupTakingLonger] = useState(false);
  const [isStartupRetrying, setIsStartupRetrying] = useState(false);
  const startupAttemptIdRef = useRef(1);
  const startupExecutionLockRef = useRef<ReturnType<typeof createStartupExecutionLock> | null>(null);
  const startupRuntimeContextRef = useRef<{ indexedDbKeys: Set<string> | null }>({ indexedDbKeys: null });
  const startupFailureCountsRef = useRef<Partial<Record<StartupTaskId, number>>>({});
  if (!startupExecutionLockRef.current) {
      startupExecutionLockRef.current = createStartupExecutionLock();
  }
  const [startupBackgroundScheduler] = useState(() => createStartupBackgroundScheduler({
      onTaskError: (taskId, error) => recordNonFatal(error, 'startup_background_preparation_failed', { task: taskId }),
  }));

  // UI States
  const [toastMessage, setToastMessage] = useState<{title: string, subtext: string} | null>(null);
  const [activePressEvent, setActivePressEvent] = useState<{ project: Commitment, questions: PressInteraction[] } | null>(null);
  const [showProtectionPrompt, setShowProtectionPrompt] = useState<{ partnerId: string, partnerName: string } | null>(null);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isFullBleedMobileSurface, setIsFullBleedMobileSurface] = useState(false);
  const [activeSocialEvent, setActiveSocialEvent] = useState<{ event: SocialEvent, partnerId: string } | null>(null);
  const [pendingBabyNaming, setPendingBabyNaming] = useState<PendingBabyNaming | null>(null);
  const [pendingMedicalPrompt, setPendingMedicalPrompt] = useState<PendingMedicalPrompt | null>(null);
  const [pendingSaveRecovery, setPendingSaveRecovery] = useState<PendingSaveRecovery | null>(null);
  const [careerOpening, setCareerOpening] = useState<{ status: string; supportingMessage: string } | null>(null);
  const [isRecoveringSave, setIsRecoveringSave] = useState(false);
  const [pendingWeekProcessingFailure, setPendingWeekProcessingFailure] = useState<PendingWeekProcessingFailure | null>(null);
  const [isExportingWeekBackup, setIsExportingWeekBackup] = useState(false);
  const [isSaveTransferActive, setIsSaveTransferActive] = useState(false);
  const [saveTransferProgress, setSaveTransferProgress] = useState<SaveTransferProgress | null>(null);
  const [babyFirstNameInput, setBabyFirstNameInput] = useState('');
  const [babySurnameChoice, setBabySurnameChoice] = useState('');
  const [deathScreenPreviewPlayer, setDeathScreenPreviewPlayer] = useState<Player | null>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const latestChangelogEntry = getLatestChangelogEntry();
  const previousChangelogEntries = CHANGELOG_ENTRIES.filter(entry => entry.version !== latestChangelogEntry.version);
  const isStartupLoadingVisible = !startupStudioBumperElapsed
    || isInitializing
    || startupState.outcome !== 'READY';
  const isUiOverhaulSurface = gameStatus === 'PLAYING'
    && (
      activePage === Page.HOME
      || activePage === Page.CAREER
      || activePage === Page.IMPROVE
      || activePage === Page.SOCIAL
      || (activePage === Page.LIFESTYLE && isBottomNavVisible)
      || (activePage === Page.MOBILE && isBottomNavVisible)
      || activePage === Page.STORE
    );
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [showPreviousWhatsNewNotes, setShowPreviousWhatsNewNotes] = useState(false);

  // DEBT / AD STATES
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adStep, setAdStep] = useState(0);
  const [adTotalSteps, setAdTotalSteps] = useState(1);
  const [wellnessRewardAd, setWellnessRewardAd] = useState(createWellnessRewardAdState);
  const [wellnessAdNowMs, setWellnessAdNowMs] = useState(() => Date.now());
  const [pendingRewardSaveRetry, setPendingRewardSaveRetry] = useState<PendingRewardAdReceipt | null>(null);
  const [isRetryingRewardSave, setIsRetryingRewardSave] = useState(false);
  const playerPerformanceSettings = normalizePerformanceSettings(
    player.settings?.performance,
    player.settings?.smoothMode,
  );
  const isAdaptiveMonitoringEligible = gameStatus === 'PLAYING'
    && !isProcessing
    && !isShowingAd
    && isBottomNavVisible
    && !isFullBleedMobileSurface
    && !shouldShowNewPlayerTutorial(player)
    && !activePressEvent
    && !showProtectionPrompt
    && !activeSocialEvent
    && !pendingBabyNaming
    && !pendingMedicalPrompt
    && !pendingSaveRecovery
    && !isRecoveringSave
    && !pendingWeekProcessingFailure
    && !showDebtModal
    && !showWhatsNewModal
    && !player.pendingEvent
    && !(player.pendingEvents?.length);
  const isAdaptiveSafeBoundary = isAdaptiveMonitoringEligible
    && activePage === Page.HOME
    && isBottomNavVisible
    && !isFullBleedMobileSurface;
  const autosaveTimerRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const saveOperationQueueRef = useRef(createSaveOperationQueue());
  const verifiedCheckpointSlotsRef = useRef<Set<number>>(new Set());
  const iosPressureConstrainedRef = useRef(false);
  const iosSaveCooldownUntilRef = useRef(0);
  const iosPressureHealthyWindowsRef = useRef(0);
  const purchaseUpdateHandlerRef = useRef<(update: IOSPurchaseUpdate) => void>(() => {});
  const playerRef = useRef(player);
  const rewardAdGrantInFlightRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const shell = shellRef.current;
    const viewport = window.visualViewport;
    if (!shell || !viewport) return;
    const update = () => {
      const keyboardOpen = isKeyboardOccludingViewport(window.innerHeight, viewport.height);
      shell.dataset.keyboardOpen = String(keyboardOpen);
      if (keyboardOpen) shell.style.setProperty('--ae-visible-viewport-height', `${Math.max(1, Math.round(viewport.height))}px`);
      else shell.style.removeProperty('--ae-visible-viewport-height');
    };
    update();
    viewport.addEventListener('resize', update);
    window.addEventListener('resize', update);
    return () => {
      viewport.removeEventListener('resize', update);
      window.removeEventListener('resize', update);
    };
  }, [gameStatus, isStartupLoadingVisible]);
  const rewardAdFlowInFlightRef = useRef(false);
  const activePlayStartedAtRef = useRef<number | null>(null);
  const startupPerformanceMeasurementRef = useRef<StartupPerformanceMeasurement | null>(null);
  const startupPerformanceReportedRef = useRef(false);
  const startupFirstScreenReportedRef = useRef(false);
  const startupCalibrationCoordinatorRef = useRef<StartupCalibrationCoordinator | null>(null);
  const adaptiveSafeBoundaryRef = useRef(false);
  const adaptiveMonitorEligibleRef = useRef(false);
  const adaptivePerformanceRef = useRef(adaptivePerformance);
  const deviceValidationSessionRef = useRef<DeviceValidationSession | null>(null);
  const saveTransferOperationLockRef = useRef<SaveTransferOperationLock | null>(null);
  const saveTransferAbortRef = useRef<AbortController | null>(null);
  const saveTransferProgressPresenterRef = useRef<SaveTransferProgressPresenter | null>(null);
  if (!saveTransferOperationLockRef.current) {
    saveTransferOperationLockRef.current = createSaveTransferOperationLock();
  }
  useEffect(() => {
    const uninstallSink = installStartupDiagnosticSink(event => {
      trackGameEvent('startup_checkpoint', {
        checkpoint: event.checkpoint,
        duration_ms: event.durationMs,
        online: event.online,
        android_version: event.androidVersion || 'unavailable',
        webview_version: event.webViewVersion || 'unavailable',
        memory_class_mb: event.memoryClassMb || 0,
        failed_task: event.failedTask || '',
        failure_code: event.failureCode || '',
        renderer_restart_count: event.rendererRestartCount || 0,
      });
      addBreadcrumb(`startup:${event.checkpoint}`, {
        duration_ms: event.durationMs,
        failed_task: event.failedTask || '',
        failure_code: event.failureCode || '',
      });
    });

    let cancelled = false;
    void readNativeStartupRecoveryState().then(state => {
      if (cancelled || !state.available) return;
      setStartupDiagnosticContext({
        appVersion: state.appVersion || APP_DISPLAY_VERSION,
        androidVersion: state.androidVersion,
        webViewVersion: state.webViewVersion,
        memoryClassMb: state.memoryClassMb,
        rendererRestartCount: state.rendererRestartCount,
      });
      if (state.safeModeRecommended) setSafeBootRequested(true);
      trackGameEvent('startup_native_recovery_state', {
        safe_mode_recommended: state.safeModeRecommended,
        consecutive_failures: state.consecutiveStartupFailures,
        renderer_restart_count: state.rendererRestartCount,
        last_checkpoint: state.lastCheckpoint || 'unavailable',
        last_failed_task: state.lastFailedTask || '',
        last_failure_code: state.lastFailureCode || '',
      });
    });

    return () => {
      cancelled = true;
      uninstallSink();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    window.requestAnimationFrame(() => {
      if (!cancelled) recordStartupCheckpoint('zedbury_visible');
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => () => {
    saveTransferAbortRef.current?.abort();
    saveTransferProgressPresenterRef.current?.finish();
  }, []);
  adaptiveSafeBoundaryRef.current = isAdaptiveSafeBoundary;
  adaptiveMonitorEligibleRef.current = isAdaptiveMonitoringEligible;
  adaptivePerformanceRef.current = adaptivePerformance;

  const emitDueDeviceValidationCheckpoints = useCallback((nowMs: number) => {
    const activeSession = deviceValidationSessionRef.current;
    if (!activeSession) return;
    const result = collectDueDeviceValidationCheckpoints(activeSession, nowMs);
    deviceValidationSessionRef.current = result.state;
    result.summaries.forEach(summary => {
      trackGameEvent('device_validation_checkpoint', toDeviceValidationTelemetry(summary));
      addBreadcrumb('device_validation:checkpoint', {
        minutes: summary.checkpointMinutes,
        status: summary.status,
        current_level: summary.currentAppliedLevel,
        full_quality_maintained: summary.fullQualityMaintained,
      });
    });
  }, []);

  const recordAdaptivePerformanceDecisions = useCallback((
    decisions: AdaptivePerformanceDecision[],
  ) => {
    const nowMs = Date.now();
    decisions.forEach(decision => {
      const activeSession = deviceValidationSessionRef.current;
      if (activeSession) {
        deviceValidationSessionRef.current = recordDeviceValidationDecision(
          activeSession,
          decision,
          nowMs,
        );
      }
      trackGameEvent('adaptive_performance_decision', {
        decision: decision.type.toLowerCase(),
        from_level: decision.from.toLowerCase(),
        to_level: decision.to.toLowerCase(),
        reason: decision.reason.toLowerCase(),
        shadow_mode: decision.shadowMode,
      });
      addBreadcrumb(`adaptive_performance:${decision.type.toLowerCase()}`, {
        from: decision.from,
        to: decision.to,
        reason: decision.reason,
        shadow_mode: decision.shadowMode,
      });
    });
    emitDueDeviceValidationCheckpoints(nowMs);
  }, [emitDueDeviceValidationCheckpoints]);

  const dispatchAdaptivePerformance = useCallback((input: AdaptivePerformanceInput) => {
    const previous = adaptivePerformanceRef.current;
    const result = advanceAdaptivePerformance(previous, input);
    adaptivePerformanceRef.current = result.state;
    setAdaptivePerformance(result.state);
    recordAdaptivePerformanceDecisions(result.decisions);
    if (previous.platform === 'IOS' && iosPressureConstrainedRef.current && result.decisions.some(decision => (
      decision.type === 'APPLIED' && decision.reason === 'RUNTIME_RECOVERY' && decision.to === 'FULL'
    ))) {
      setIOSPressureConstrained(false);
      iosPressureConstrainedRef.current = false;
      setOptionalRewardedAdPreloadingSuspended(false);
      void startRewardedAdPreloading().catch(() => undefined);
    }
  }, [recordAdaptivePerformanceDecisions]);

  useEffect(() => subscribeRewardedAdDiagnostics(event => {
    const { name, requestId, type, placement, contextId, rewardSessionId, ...details } = event;
    trackGameEvent(name, {
      request_id: requestId || 'NONE',
      reward_type: type || 'UNKNOWN',
      placement: placement || 'UNKNOWN',
      context_id: contextId || 'NONE',
      reward_session_id: rewardSessionId || 'NONE',
      ...details,
    });
  }), []);

  useEffect(() => {
      playerRef.current = player;
  }, [player]);

  useEffect(() => {
    let cancelled = false;
    void readIOSLongSessionDiagnostics().then(async state => {
      if (!cancelled) {
        if (state.reportPending && state.previousTerminationKind === 'WEB_CONTENT_TERMINATED') {
          setIOSRecoveryReport(state);
        }
        setIOSRecoveryReadComplete(true);
      }
      if (cancelled || !state.available) return;
      const telemetry = toIOSLongSessionTelemetry(state);
      Object.entries(telemetry).forEach(([key, value]) => {
        setCrashKey(`ios_long_session_${key}`, value);
      });
      addBreadcrumb('ios_long_session:native_state_loaded', telemetry);
      if (!state.reportPending || !state.reportId) return;

      const delivered = await trackGameEventConfirmed('ios_previous_session_termination', telemetry);
      if (cancelled || !delivered) return;
      await acknowledgeIOSLongSessionReport(state.reportId).catch(error => {
        recordNonFatal(error, 'ios_long_session_report_ack_failed', {
          report_id: state.reportId,
        });
      });
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
      const nowMs = Date.now();
      const receipt = readPendingRewardAd(nowMs);
      const matchesCurrentPlayer = !!receipt
          && receipt.playerId === String(player.id || player.name)
          && receipt.saveSlot === currentSlot;
      let restoredState = matchesCurrentPlayer && receipt?.type === 'REWARDED_STATS'
          ? restoreWellnessRewardAdState(receipt, nowMs)
          : createWellnessRewardAdState();
      if (
          receipt
          && matchesCurrentPlayer
          && receipt.continuationRemainingMs !== undefined
          && restoredState.retryExpiresAt !== undefined
      ) {
          try {
              setPendingRewardAdContinuationExpiry(receipt, restoredState.retryExpiresAt, nowMs);
          } catch (error) {
              recordNonFatal(error, 'reward_ad_continuation_restore_failed', {
                  reward_type: receipt.type,
                  save_slot: receipt.saveSlot,
              });
          }
      }
      setWellnessRewardAd(restoredState);
      setWellnessAdNowMs(nowMs);
  }, [currentSlot, player.id]);

  useEffect(() => {
      if (wellnessRewardAd.status !== 'RETRY_AD_2' || wellnessRewardAd.retryExpiresAt === undefined) return;

      const updateClock = () => {
          const nowMs = Date.now();
          setWellnessAdNowMs(nowMs);
          if (nowMs < wellnessRewardAd.retryExpiresAt!) return;
          clearPendingRewardAd(wellnessRewardAd.sessionId);
          setWellnessRewardAd(previous => expireWellnessRewardAdState(previous, nowMs));
          setToastMessage({
              title: tr('app.ads.wellness.expiredTitle'),
              subtext: tr('app.ads.wellness.expiredSubtext'),
          });
      };

      updateClock();
      const intervalId = window.setInterval(updateClock, 1_000);
      return () => window.clearInterval(intervalId);
  }, [wellnessRewardAd.retryExpiresAt, wellnessRewardAd.status]);

  useEffect(() => {
    const previous = adaptivePerformanceRef.current;
    if (previous.preference === playerPerformanceSettings.preference) return;
    if (playerPerformanceSettings.preference === 'AUTOMATIC') {
      const next = createAdaptivePerformanceState({
        preference: 'AUTOMATIC',
        platform: adaptivePerformancePlatform,
        startupCalibration,
        automaticApplicationEnabled: AUTOMATIC_PERFORMANCE_APPLICATION_ENABLED,
        nowMs: Date.now(),
      });
      adaptivePerformanceRef.current = next;
      setAdaptivePerformance(next);
      recordAdaptivePerformanceDecisions([{
        type: 'APPLIED',
        from: previous.appliedLevel,
        to: next.appliedLevel,
        reason: 'PLAYER_OVERRIDE',
        shadowMode: next.shadowMode,
      }]);
      return;
    }
    const result = advanceAdaptivePerformance(previous, {
      kind: 'PREFERENCE_CHANGED',
      preference: playerPerformanceSettings.preference,
      nowMs: Date.now(),
    });
    adaptivePerformanceRef.current = result.state;
    setAdaptivePerformance(result.state);
    recordAdaptivePerformanceDecisions(result.decisions);
  }, [
    adaptivePerformancePlatform,
    playerPerformanceSettings.preference,
    recordAdaptivePerformanceDecisions,
    startupCalibration,
  ]);

  useEffect(() => {
    if (!isAdaptiveSafeBoundary) return;
    dispatchAdaptivePerformance({ kind: 'SAFE_BOUNDARY', nowMs: Date.now() });
  }, [dispatchAdaptivePerformance, isAdaptiveSafeBoundary]);

  useEffect(() => {
    if (adaptivePerformancePlatform === 'WEB' || gameStatus !== 'PLAYING') return;

    const nowMs = Date.now();
    deviceValidationSessionRef.current = createDeviceValidationSession({
      platform: adaptivePerformancePlatform,
      preference: normalizePerformanceSettings(
        playerRef.current.settings?.performance,
        playerRef.current.settings?.smoothMode,
      ).preference,
      initialAppliedLevel: adaptivePerformanceRef.current.appliedLevel,
      nowMs,
    });

    const updateVisibility = () => {
      const activeSession = deviceValidationSessionRef.current;
      if (!activeSession) return;
      const observedAtMs = Date.now();
      deviceValidationSessionRef.current = setDeviceValidationSessionActive(
        activeSession,
        document.visibilityState === 'visible',
        observedAtMs,
      );
      emitDueDeviceValidationCheckpoints(observedAtMs);
    };

    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    const interval = window.setInterval(
      () => emitDueDeviceValidationCheckpoints(Date.now()),
      60_000,
    );

    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
      window.clearInterval(interval);
      emitDueDeviceValidationCheckpoints(Date.now());
      deviceValidationSessionRef.current = null;
    };
  }, [adaptivePerformancePlatform, emitDueDeviceValidationCheckpoints, gameStatus]);

  useEffect(() => {
    if (
      adaptivePerformancePlatform === 'WEB'
      || (playerPerformanceSettings.preference !== 'AUTOMATIC'
        && !(adaptivePerformancePlatform === 'IOS' && iosPressureConstrained))
      || gameStatus !== 'PLAYING'
    ) return;

    const monitor = startRuntimePerformanceMonitor({
      isEligible: () => (
        adaptiveMonitorEligibleRef.current
        && typeof document !== 'undefined'
        && document.visibilityState === 'visible'
      ),
      onWindow: windowResult => {
        const observedAtMs = Date.now();
        const activeSession = deviceValidationSessionRef.current;
        if (activeSession) {
          deviceValidationSessionRef.current = recordDeviceValidationHealthWindow(
            activeSession,
            windowResult,
            observedAtMs,
          );
          emitDueDeviceValidationCheckpoints(observedAtMs);
        }
        trackGameEvent('adaptive_performance_health_window', {
          health: windowResult.health.toLowerCase(),
          reason: windowResult.reason.toLowerCase(),
          frame_samples: windowResult.frameSampleCount,
          frame_p95_ms: windowResult.frameP95Ms,
          slow_frame_ratio_pct: Math.round(windowResult.slowFrameRatio * 10_000) / 100,
          long_task_ratio_pct: Math.round(windowResult.longTaskBlockedRatio * 10_000) / 100,
        });
        if (adaptivePerformancePlatform === 'IOS' && iosPressureConstrainedRef.current
          && playerPerformanceSettings.preference !== 'AUTOMATIC') {
          iosPressureHealthyWindowsRef.current = windowResult.health === 'HEALTHY'
            ? iosPressureHealthyWindowsRef.current + 1 : 0;
          if (iosPressureHealthyWindowsRef.current >= 6) {
            iosPressureConstrainedRef.current = false;
            setIOSPressureConstrained(false);
            setOptionalRewardedAdPreloadingSuspended(false);
            void startRewardedAdPreloading().catch(() => undefined);
          }
        }
        if (playerPerformanceSettings.preference === 'AUTOMATIC'
          && adaptivePerformancePlatform !== 'WEB') {
          dispatchAdaptivePerformance({
            kind: 'HEALTH_WINDOW',
            health: windowResult.health,
            nowMs: observedAtMs,
            safeBoundary: adaptiveSafeBoundaryRef.current,
          });
        }
      },
    });
    return () => monitor.stop();
  }, [
    adaptivePerformancePlatform,
    dispatchAdaptivePerformance,
    emitDueDeviceValidationCheckpoints,
    gameStatus,
    iosPressureConstrained,
    playerPerformanceSettings.preference,
  ]);

  useEffect(() => {
    if (
      adaptivePerformancePlatform !== 'ANDROID'
      || playerPerformanceSettings.preference !== 'AUTOMATIC'
      || gameStatus !== 'PLAYING'
    ) return;

    let cancelled = false;
    let reading = false;
    const pollNativePressure = async () => {
      if (reading || cancelled || document.visibilityState !== 'visible') return;
      reading = true;
      try {
        const result = await readAndroidDeviceCapabilities();
        if (cancelled || result.status !== 'AVAILABLE') return;
        const { snapshot } = result;
        const observedAtMs = Date.now();
        const activeSession = deviceValidationSessionRef.current;
        if (activeSession) {
          deviceValidationSessionRef.current = recordDeviceValidationNativeSnapshot(
            activeSession,
            snapshot,
            observedAtMs,
          );
          emitDueDeviceValidationCheckpoints(observedAtMs);
        }
        trackGameEvent('adaptive_performance_native_pressure', {
          low_memory: snapshot.lowMemory,
          available_memory_pct: Math.round(snapshot.availableMemoryRatio * 100),
          thermal_status: snapshot.thermalStatus ?? -1,
        });
        if (snapshot.lowMemory || (snapshot.thermalStatus ?? 0) >= 4) {
          dispatchAdaptivePerformance({
            kind: 'MEMORY_PRESSURE',
            nowMs: observedAtMs,
            safeBoundary: adaptiveSafeBoundaryRef.current,
          });
        } else if ((snapshot.thermalStatus ?? 0) >= 3) {
          dispatchAdaptivePerformance({
            kind: 'HEALTH_WINDOW',
            health: 'UNHEALTHY',
            nowMs: observedAtMs,
            safeBoundary: adaptiveSafeBoundaryRef.current,
          });
        }
      } finally {
        reading = false;
      }
    };

    const interval = window.setInterval(() => void pollNativePressure(), 120_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [
    adaptivePerformancePlatform,
    dispatchAdaptivePerformance,
    emitDueDeviceValidationCheckpoints,
    gameStatus,
    playerPerformanceSettings.preference,
  ]);

  useEffect(() => {
      const persistStorage = navigator.storage?.persist;
      if (typeof persistStorage !== 'function') return;
      void persistStorage.call(navigator.storage).then(granted => {
          addBreadcrumb('save_storage:persistence_request', { granted });
      }).catch(error => {
          recordNonFatal(error, 'save_storage_persistence_request_failed');
      });
  }, []);

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const getProcessedStoreTransactionIds = (state: Player): string[] => {
      if (!state.flags) state.flags = {};
      if (!Array.isArray(state.flags.processedIOSStoreTransactionIds)) {
          state.flags.processedIOSStoreTransactionIds = [];
      }
      return state.flags.processedIOSStoreTransactionIds as string[];
  };
  const hasProcessedStoreTransaction = (state: Player, transactionId?: string) =>
      !!transactionId && getProcessedStoreTransactionIds(state).includes(transactionId);
  const markProcessedStoreTransaction = (state: Player, transactionId?: string) => {
      if (!transactionId) return;
      const processedIOSStoreTransactionIds = getProcessedStoreTransactionIds(state);
      if (!processedIOSStoreTransactionIds.includes(transactionId)) {
          state.flags.processedIOSStoreTransactionIds = [...processedIOSStoreTransactionIds, transactionId].slice(-80);
      }
  };

  useEffect(() => {
    const coordinator = createStartupCalibrationCoordinator((result) => {
      setStartupCalibration(result);
      const performanceSettings = normalizePerformanceSettings(
        playerRef.current.settings?.performance,
        playerRef.current.settings?.smoothMode,
      );
      const nextAdaptiveState = createAdaptivePerformanceState({
        preference: performanceSettings.preference,
        platform: adaptivePerformancePlatform,
        startupCalibration: result,
        automaticApplicationEnabled: AUTOMATIC_PERFORMANCE_APPLICATION_ENABLED,
        nowMs: Date.now(),
      });
      adaptivePerformanceRef.current = nextAdaptiveState;
      setAdaptivePerformance(nextAdaptiveState);
      trackGameEvent('startup_calibration_result', toStartupCalibrationTelemetry(result));
      trackGameEvent('adaptive_performance_startup_decision', {
        platform: adaptivePerformancePlatform.toLowerCase(),
        preference: performanceSettings.preference.toLowerCase(),
        recommended_level: nextAdaptiveState.recommendedLevel.toLowerCase(),
        applied_level: nextAdaptiveState.appliedLevel.toLowerCase(),
        shadow_mode: nextAdaptiveState.shadowMode,
      });
      addBreadcrumb('startup_calibration:complete', {
        recommendation: result.recommendation,
        confidence: result.confidence,
        primary_reason: result.primaryReason,
      });
      setCrashKey('startup_calibration_recommendation', result.recommendation);
      setCrashKey('startup_calibration_confidence', result.confidence);
      setCrashKey('startup_calibration_reason', result.primaryReason);
    });
    startupCalibrationCoordinatorRef.current = coordinator;

    return () => {
      coordinator.cancel();
      if (startupCalibrationCoordinatorRef.current === coordinator) {
        startupCalibrationCoordinatorRef.current = null;
      }
    };
  }, [adaptivePerformancePlatform]);

  useEffect(() => {
    let cancelled = false;
    void readAndroidDeviceCapabilities().then((result) => {
      if (cancelled) return;
      startupCalibrationCoordinatorRef.current?.submitDeviceCapabilities(result);

      if (result.status !== 'AVAILABLE') {
        if (result.reason !== 'NOT_ANDROID') {
          trackGameEvent('device_capability_unavailable', { reason: result.reason });
          addBreadcrumb('device_capabilities:unavailable', { reason: result.reason });
        }
        return;
      }

      const { snapshot } = result;
      setStartupDiagnosticContext({
        androidVersion: snapshot.androidRelease,
        webViewVersion: snapshot.webViewVersion,
        memoryClassMb: snapshot.memoryClassMb,
      });
      trackGameEvent('device_capability_baseline', toDeviceCapabilityTelemetry(snapshot));
      addBreadcrumb('device_capabilities:ready', {
        low_ram: snapshot.isLowRamDevice,
        memory_class_mb: snapshot.memoryClassMb,
        thermal_status: snapshot.thermalStatusLabel || 'UNAVAILABLE',
        webview_major: snapshot.webViewMajor || 0,
      });
      setCrashKey('device_low_ram', snapshot.isLowRamDevice);
      setCrashKey('device_memory_class_mb', snapshot.memoryClassMb);
      setCrashKey('device_thermal_status', snapshot.thermalStatusLabel || 'UNAVAILABLE');
      setCrashKey('device_webview_major', snapshot.webViewMajor || 0);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const measurement = startStartupPerformanceMeasurement();
    startupPerformanceMeasurementRef.current = measurement;
    return () => {
      measurement.cancel();
      if (startupPerformanceMeasurementRef.current === measurement) {
        startupPerformanceMeasurementRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (isStartupLoadingVisible || startupPerformanceReportedRef.current) return;
    const measurement = startupPerformanceMeasurementRef.current;
    if (!measurement) return;

    const summary = measurement.complete();
    startupPerformanceReportedRef.current = true;
    startupCalibrationCoordinatorRef.current?.submitPerformance(summary);
    const telemetry = toStartupPerformanceTelemetry(summary);
    trackGameEvent('startup_performance_baseline', {
      measurement_scope: 'react_loading_shell',
      ...telemetry,
    });
    addBreadcrumb('startup_performance:complete', {
      startup_ms: summary.startupDurationMs,
      frame_p95_ms: summary.frameP95Ms,
      long_tasks: summary.longTaskCount,
    });
  }, [isStartupLoadingVisible]);

  useEffect(() => {
    if (isStartupLoadingVisible || startupFirstScreenReportedRef.current) return;
    startupFirstScreenReportedRef.current = true;
    recordStartupCheckpoint('first_screen_ready');
  }, [isStartupLoadingVisible]);

  useEffect(() => {
    if (startupStudioIntroHandled) return;
    const exitTimer = window.setTimeout(() => setStartupStudioBumperExiting(true), STARTUP_STUDIO_BUMPER_EXIT_MS);
    const timer = window.setTimeout(() => setStartupStudioBumperElapsed(true), STARTUP_STUDIO_BUMPER_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(timer);
    };
  }, [startupStudioIntroHandled]);

  useEffect(() => {
    setStartupTakingLonger(false);
    if (startupState.outcome !== 'RUNNING') return;
    const timer = window.setTimeout(() => setStartupTakingLonger(true), STARTUP_SLOW_NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [startupState.attemptId, startupState.outcome]);

  const writeLocalStorageMirror = (slot: number, playerToSave: Player) => {
      const slotKey = `actorEmpireSave_${slot}`;
      const metadataKey = `${slotKey}_meta`;
      const writeMetadataOnly = () => {
          localStorage.removeItem(slotKey);
          if (slot === 1) localStorage.removeItem('actorEmpireSave');
          localStorage.setItem(metadataKey, JSON.stringify({
              version: APP_DISPLAY_VERSION,
              slot,
              playerName: playerToSave.name,
              age: playerToSave.age,
              week: playerToSave.currentWeek,
              savedAt: Date.now(),
              storage: 'indexeddb',
              note: 'Full save stored in IndexedDB. Local mirror skipped to avoid mobile quota pressure.',
          }));
      };
      try {
          const mirrorPlan = prepareLocalStorageMirror(playerToSave, LOCAL_STORAGE_SAVE_MIRROR_BUDGET_BYTES);
          if (mirrorPlan.kind === 'FULL') {
              try {
                  localStorage.setItem(slotKey, mirrorPlan.serialized);
                  if (slot === 1) {
                      // Keep a small shadow copy for migration compatibility with older builds.
                      localStorage.setItem('actorEmpireSave', mirrorPlan.serialized);
                  }
                  localStorage.removeItem(metadataKey);
                  writeGameSaveSummary(slotKey, playerToSave);
                  return;
              } catch {
                  // A full localStorage origin can still reject a small mirror. IndexedDB is authoritative.
              }
          }
          writeMetadataOnly();
          writeGameSaveSummary(slotKey, playerToSave);
      } catch {
          // Mirror metadata is optional and must never block or alarm the player.
      }
  };
  const getSurname = (fullName: string) => {
      const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
      if (parts.length === 0) return tr('app.babyNaming.defaultSurname');
      return parts[parts.length - 1];
  };
  const getGivenName = (fullName: string) => {
      const parts = (fullName || '').trim().split(/\s+/).filter(Boolean);
      return parts[0] || fullName || tr('app.babyNaming.defaultPartnerName');
  };
  const getBabySurnameOptions = (partnerName: string) => {
      const playerSurname = getSurname(player.name);
      const partnerSurname = getSurname(partnerName);
      const options = [
          { id: 'PLAYER', label: tr('app.babyNaming.yourSurname'), value: playerSurname },
          { id: 'PARTNER', label: tr('app.babyNaming.partnerSurname', { name: getGivenName(partnerName) }), value: partnerSurname },
          { id: 'BOTH', label: tr('app.babyNaming.bothSurnames'), value: playerSurname === partnerSurname ? playerSurname : `${playerSurname}-${partnerSurname}` }
      ];

      return options.filter((option, index, arr) => arr.findIndex(other => other.value === option.value) === index);
  };
  const persistSlotSave = (
      slot: number,
      nextPlayer: Player,
      options: {
          rethrow?: boolean;
          weekDiagnostic?: { runId: string; screen: string; onStage?: (stage: string) => void };
          reason?: SaveIntegrityReason;
          currentIsUnverified?: boolean;
          sourceByteEstimate?: number;
      } = {}
  ): Promise<Player> => {
    const saveOperation = async (): Promise<Player> => {
      if (options.reason === 'AUTOSAVE' && Date.now() < iosSaveCooldownUntilRef.current) {
          return nextPlayer;
      }
      if (options.weekDiagnostic) {
          options.weekDiagnostic.onStage?.('persist_prepare_boundary');
          await yieldToMainThread();
          options.weekDiagnostic.onStage?.('persist_prepare_start');
          markWeekProcessingStage('persist_prepare_start', nextPlayer, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
      }
      let prepared: ReturnType<typeof prepareVerifiedPlayerForPersistence>;
      try {
          prepared = prepareVerifiedPlayerForPersistence(nextPlayer, options.reason || 'AUTOSAVE', {
              currentIsUnverified: options.currentIsUnverified === true,
              sourceByteEstimate: options.sourceByteEstimate,
          });
      } catch (error) {
          recordNonFatal(error, 'save_preparation_integrity_failed', {
              slot,
              reason: options.reason || 'AUTOSAVE',
              age: nextPlayer.age,
              week: nextPlayer.currentWeek,
          });
          if (options.rethrow) throw error;
          setToastMessage({
              title: 'Save Was Not Replaced',
              subtext: 'The new save did not preserve your complete career. Your previous save remains untouched.',
          });
          return nextPlayer;
      }
      const playerToSave = prepared.persistedPlayer;
      if (options.weekDiagnostic) {
          options.weekDiagnostic.onStage?.('persist_prepare_done');
          markWeekProcessingStage('persist_prepare_done', playerToSave, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
          options.weekDiagnostic.onStage?.('indexeddb_write_boundary');
          await yieldToMainThread();
          options.weekDiagnostic.onStage?.('indexeddb_write_start');
          markWeekProcessingStage('indexeddb_write_start', playerToSave, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
      }
      try {
          await saveVerifiedGameData(`actorEmpireSave_${slot}`, playerToSave, prepared.manifest, {
              retainPrevious: prepared.retainPrevious,
              needsRecoveryCheckpoint: prepared.needsRecoveryCheckpoint,
          });
      } catch (error) {
          recordNonFatal(error, 'verified_save_failed', {
              slot,
              reason: options.reason || 'AUTOSAVE',
              age: nextPlayer.age,
              week: nextPlayer.currentWeek,
          });
          if (options.rethrow) throw error;
          setToastMessage({
              title: 'Save Was Not Replaced',
              subtext: 'The new save failed its safety check. Your previous career remains untouched.',
          });
          return nextPlayer;
      }
      verifiedCheckpointSlotsRef.current.add(slot);
      setSaveSlotSummaries(prev => ({ ...prev, [slot]: createSaveSlotSummary(playerToSave) }));
      if (prepared.needsRecoveryCheckpoint) {
          setToastMessage({
              title: 'Backup Recommended',
              subtext: 'This large legacy career is now verified. Export a backup until its next safe checkpoint is created.',
          });
      }
      if (options.weekDiagnostic) {
          options.weekDiagnostic.onStage?.('indexeddb_write_done');
          markWeekProcessingStage('indexeddb_write_done', playerToSave, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
      }

      if (adaptivePerformancePlatform === 'IOS') {
          // A deferred full mirror retains the whole persisted career in its
          // closure and later creates a second JSON string on the WebView heap.
          // IndexedDB generations are authoritative; keep only a tiny summary.
          writeGameSaveSummary(`actorEmpireSave_${slot}`, playerToSave);
      } else {
          const writeLocalMirror = () => writeLocalStorageMirror(slot, playerToSave);
          const requestIdleCallback = (globalThis as any).requestIdleCallback as ((cb: () => void, options?: { timeout?: number }) => void) | undefined;
          if (requestIdleCallback) {
              requestIdleCallback(writeLocalMirror, { timeout: 1800 });
          } else {
              globalThis.setTimeout(writeLocalMirror, 0);
          }
      }
      return prepared.runtimePlayer;
    };
    return options.reason === 'AUTOSAVE'
      ? saveOperationQueueRef.current.runLatest(`slot:${slot}`, saveOperation, () => nextPlayer)
      : saveOperationQueueRef.current.run(saveOperation);
  };
  const syncPermanentPremiumEntitlementsToSavedSlots = async (productIds: PremiumProductId[]) => {
      const entitlementProductIds = rememberPremiumEntitlements(productIds);
      if (entitlementProductIds.length === 0) return;

      const slotUpdates: Partial<Record<number, Player>> = {};
      for (const slot of PREMIUM_SAVE_SLOT_IDS) {
          if (slot === currentSlot) continue;
          const verifiedLoad = saveSlots[slot] ? null : await loadVerifiedGameData(`actorEmpireSave_${slot}`);
          const sourcePlayer = saveSlots[slot]
              || (verifiedLoad?.status === 'CURRENT' || verifiedLoad?.status === 'LEGACY_UNVERIFIED' ? verifiedLoad.player : null);
          if (!sourcePlayer) continue;
          const entitlementResult = applyPremiumEntitlementsToPlayer(migratePlayerSave(sourcePlayer), entitlementProductIds);
          if (!entitlementResult.changed) continue;
          slotUpdates[slot] = entitlementResult.player;
          await persistSlotSave(slot, entitlementResult.player);
      }

      if (Object.keys(slotUpdates).length > 0) {
          setSaveSlots(prev => ({ ...prev, ...slotUpdates }));
      }
  };
  const syncCurrentSlotSnapshot = (nextPlayer: Player) => {
      if (!currentSlot) return;
      setSaveSlots(prev => ({ ...prev, [currentSlot]: nextPlayer }));
      void persistSlotSave(currentSlot, nextPlayer);
  };

  const persistCurrentSlotSnapshot = async (
      nextPlayer: Player,
      weekDiagnostic?: { runId: string; screen: string; onStage?: (stage: string) => void },
  ): Promise<Player> => {
      if (!currentSlot) return nextPlayer;
      const runtimePlayer = await persistSlotSave(currentSlot, nextPlayer, {
          rethrow: true,
          weekDiagnostic,
          reason: 'PROCESS_WEEK',
      });
      setSaveSlots(prev => ({ ...prev, [currentSlot]: runtimePlayer }));
      return runtimePlayer;
  };

  const prepareLoadedPlayerSave = async (
      slot: number,
      savedData: Player,
      source: 'indexeddb-slot' | 'legacy-indexeddb' | 'legacy-localstorage' | 'legacy-single-localstorage' = 'indexeddb-slot',
  ): Promise<{ player: Player; shouldPersist: boolean; carePackageGranted: boolean }> => {
      const migrated = migratePlayerSave(savedData);
      let optimized = migrated;
      let posterMediaMigrated = false;
      let carePackageGranted = false;

      try {
          const posterResult = await externalizeCustomPostersInPlayer(optimized);
          optimized = posterResult.player;
          posterMediaMigrated = posterResult.migratedCount > 0 || posterResult.bytesRemoved > 0;
          if (posterMediaMigrated) {
              addBreadcrumb('custom_posters:externalized', {
                  slot,
                  migratedCount: posterResult.migratedCount,
                  bytesRemoved: posterResult.bytesRemoved,
              });
          }
      } catch (error) {
          recordNonFatal(error, 'custom_poster_externalize_failed', { slot });
      }

      const carePackage = grantMigrationCarePackageIfEligible(optimized, {
          source,
          allowLegacyVersionFallback: source === 'indexeddb-slot',
      });
      optimized = carePackage.player;
      carePackageGranted = carePackage.granted;
      const existingPermanentEntitlements = uniquePermanentPremiumIds((optimized.flags?.premiumPurchases || []) as PremiumProductId[]);
      const storedEntitlements = rememberPremiumEntitlements(existingPermanentEntitlements);
      const entitlementResult = applyPremiumEntitlementsToPlayer(optimized, storedEntitlements);
      optimized = entitlementResult.player;

      return {
          player: optimized,
          shouldPersist: ((savedData as Player)?.flags?.saveMigrationVersion !== optimized.flags?.saveMigrationVersion) || posterMediaMigrated || carePackageGranted || entitlementResult.changed,
          carePackageGranted,
      };
  };

  useEffect(() => {
    if (activePage !== Page.MOBILE) {
      setIsFullBleedMobileSurface(false);
    }
    if (activePage !== Page.LIFESTYLE && !(activePage === Page.MOBILE && isFullBleedMobileSurface)) {
      setIsBottomNavVisible(true);
    }
  }, [activePage, isFullBleedMobileSurface]);

  useEffect(() => {
    const pageName = Page[activePage] || String(activePage);
    const screenName = `${gameStatus}_${pageName}`;
    setCurrentGameScreen(screenName);
    setCrashContext(player, {
      screen: pageName,
      game_status: gameStatus,
      save_slot: currentSlot,
    });
    markGameCheckpoint('screen_changed', player, {
      screen: pageName,
      game_status: gameStatus,
      save_slot: currentSlot,
    });

    if (gameStatus === 'PLAYING') {
      if (activePage === Page.CAREER) {
        markGameCheckpoint('profile_opened', player, {
          screen: pageName,
          credits: player.filmography?.length || 0,
          awards: player.awards?.length || 0,
          commitments: player.commitments?.length || 0,
        });
      }
      if (activePage === Page.LIFESTYLE) {
        markGameCheckpoint('lifestyle_opened', player, {
          screen: pageName,
          businesses: player.businesses?.length || 0,
          production_house: !!player.productionHouse,
        });
      }
      if (activePage === Page.MOBILE) {
        markGameCheckpoint('mobile_apps_opened', player, {
          screen: pageName,
          messages: player.messages?.length || 0,
          pending_events: player.pendingEvents?.length || 0,
        });
      }
    }
  }, [activePage, gameStatus, currentSlot, player.age, player.currentWeek]);

  // --- LOGIC HOOK ---
  const {
      handleGenericUpdate, handleRehearse, handleOwnedProductionFocus, handleImproveAction,
      handlePartnerAction, handleSocialInteract, handleIntimacyChoice,
      handlePromotionAction, handleNPCInteract
  } = useGameActions({
      player, setPlayer, setToastMessage, setActivePressEvent, setShowProtectionPrompt, setActiveSocialEvent, setPendingBabyNaming
  });

  useEffect(() => {
    purchaseUpdateHandlerRef.current = update => {
      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          if (hasProcessedStoreTransaction(p, update.transactionId)) return p;
          markProcessedStoreTransaction(p, update.transactionId);
          const message = applyPremiumPurchase(p, update.premiumProductId, getPlayerLanguage(p));
          setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: message });
          return p;
      });
      if (isNonConsumablePremiumProduct(update.premiumProductId)) {
          void syncPermanentPremiumEntitlementsToSavedSlots([update.premiumProductId]);
      }
    };
  }, [handleGenericUpdate, language]);

  useEffect(() => {
    let disposed = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;

    startIOSPurchaseUpdatesListener(update => {
      if (!disposed) {
          purchaseUpdateHandlerRef.current(update);
      }
    }).then(handle => {
      if (disposed) {
          void handle?.remove();
          return;
      }
      listenerHandle = handle;
    }).catch(error => {
      console.warn('[IAP] Failed to start iOS purchase update listener', error);
    });

    return () => {
      disposed = true;
      void listenerHandle?.remove();
    };
  }, []);

  useEffect(() => {
    if (!pendingBabyNaming) return;
    setBabyFirstNameInput(pendingBabyNaming.suggestedFirstName);
    const surnameOptions = getBabySurnameOptions(pendingBabyNaming.partnerName);
    setBabySurnameChoice(surnameOptions[0]?.value || getSurname(player.name));
  }, [pendingBabyNaming]);

  useEffect(() => {
    if (isInitializing || gameStatus !== 'PLAYING') return;
    try {
      const seenVersion = localStorage.getItem(WHATS_NEW_STORAGE_KEY);
      if (seenVersion !== APP_DISPLAY_VERSION) {
        setShowWhatsNewModal(true);
      }
    } catch (error) {
      console.error('Failed to read What\'s New state', error);
      setShowWhatsNewModal(true);
    }
  }, [gameStatus, isInitializing]);

  const handleDismissWhatsNew = () => {
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_DISPLAY_VERSION);
    } catch (error) {
      console.error('Failed to persist What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(false);
  };

  const handleShowWhatsNewCheat = () => {
    try {
      localStorage.removeItem(WHATS_NEW_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(true);
  };

  const handleConfirmBabyName = () => {
      if (!pendingBabyNaming) return;
      const trimmedFirstName = babyFirstNameInput.trim();
      if (!trimmedFirstName) return;

      const finalName = `${trimmedFirstName} ${babySurnameChoice}`.trim();
      const babyBirthAbsolute = pendingBabyNaming.birthWeekAbsolute;
      const partnerName = pendingBabyNaming.partnerName;
      const babyGender = pendingBabyNaming.babyGender;
      const shouldCreateScandalNews = pendingBabyNaming.shouldCreateScandalNews;
      const eventWeek = pendingBabyNaming.eventWeek;
      const eventYear = pendingBabyNaming.eventYear;

      setPlayer(prev => {
          const newRelationships = [...prev.relationships, {
              id: `child_${Date.now()}`,
              name: finalName,
              relation: 'Child',
              closeness: 100,
              image: getGenderedAvatar(babyGender, trimmedFirstName),
              lastInteractionWeek: eventWeek,
              lastInteractionAbsolute: babyBirthAbsolute,
              age: 0,
              gender: babyGender,
              birthWeekAbsolute: babyBirthAbsolute,
          } satisfies Relationship];

          const newNews = [...prev.news];
          if (shouldCreateScandalNews) {
              newNews.unshift({
                  id: `news_scandal_baby_${Date.now()}`,
                  headline: tr('app.generated.babyScandal.headline', { name: prev.name }),
                  subtext: tr('app.generated.babyScandal.subtext', { partnerName }),
                  category: 'TOP_STORY',
                  week: eventWeek,
                  year: eventYear,
                  impactLevel: 'HIGH'
              });
          }

          return {
              ...prev,
              relationships: newRelationships,
              news: newNews,
              logs: [{ week: eventWeek, year: eventYear, message: tr('app.babyNaming.logWelcomed', { name: finalName, partnerName }), type: 'positive' }, ...prev.logs].slice(0, 50)
          };
      });

      setToastMessage({ title: tr('app.babyNaming.toastNamedTitle'), subtext: tr('app.babyNaming.toastNamedSubtext', { name: finalName }) });
      setPendingBabyNaming(null);
      setBabyFirstNameInput('');
      setBabySurnameChoice('');
  };

  const handleAbandonBaby = () => {
      if (!pendingBabyNaming) return;

      setPlayer(prev =>
          applyParenthoodAbandonment(prev, {
              partnerId: pendingBabyNaming.partnerId,
              partnerName: pendingBabyNaming.partnerName,
              babyGender: pendingBabyNaming.babyGender,
              childName: `${pendingBabyNaming.suggestedFirstName} ${getSurname(pendingBabyNaming.partnerName)}`.trim(),
              birthWeekAbsolute: pendingBabyNaming.birthWeekAbsolute,
              hideFromConnections: true,
          })
      );

      setToastMessage({
          title: tr('app.babyNaming.toastRejectedTitle'),
          subtext: tr('app.babyNaming.toastRejectedSubtext'),
      });
      setPendingBabyNaming(null);
      setBabyFirstNameInput('');
      setBabySurnameChoice('');
  };

  const runStartupInitialization = useCallback(async (retryTaskId?: StartupTaskId) => {
    const executionLock = startupExecutionLockRef.current!;
    const lease = executionLock.tryAcquire();
    if (!lease) return;

    const isRetry = retryTaskId !== undefined;
    const attemptId = isRetry ? startupAttemptIdRef.current + 1 : startupAttemptIdRef.current;
    startupAttemptIdRef.current = attemptId;
    let activeTaskId: StartupTaskId = retryTaskId || 'CRITICAL_ASSETS';

    if (isRetry) {
      setIsStartupRetrying(true);
      setStartupState(previous => beginStartupRetry(previous));
    }
    setIsInitializing(true);

    const runTask = async (taskId: StartupTaskId, operation: () => Promise<void>) => {
      activeTaskId = taskId;
      setStartupState(previous => startStartupTask(previous, taskId, attemptId));
      await operation();
      if (startupAttemptIdRef.current !== attemptId) return false;
      setStartupState(previous => taskId === retryTaskId
        ? recoverStartupTask(previous, taskId, attemptId)
        : completeStartupTask(previous, taskId, attemptId));
      startupFailureCountsRef.current[taskId] = 0;
      return true;
    };

    const taskOrder: StartupTaskId[] = [
      'CRITICAL_ASSETS',
      'STORAGE',
      'SAVE_SUMMARIES',
      'HOME_SCREEN',
      'FIRST_SCREEN',
    ];
    const firstTaskIndex = Math.max(0, taskOrder.indexOf(activeTaskId));
    const shouldRun = (taskId: StartupTaskId) => taskOrder.indexOf(taskId) >= firstTaskIndex;

    try {
      if (shouldRun('CRITICAL_ASSETS')) {
        const completed = await runTask('CRITICAL_ASSETS', prepareCriticalStartupAssets);
        if (!completed) return;
      }

      if (shouldRun('STORAGE')) {
        const completed = await runTask('STORAGE', async () => {
          recordStartupCheckpoint('storage_started');
          // Every call owns and closes its IndexedDB connection. A delayed open
          // from an earlier timeout is also closed by waitForIndexedDbOpen.
          startupRuntimeContextRef.current.indexedDbKeys = new Set(await listGameDataKeysStrict());
          recordStartupCheckpoint('storage_ready');
        });
        if (!completed) return;
      }

      if (shouldRun('SAVE_SUMMARIES')) {
        const completed = await runTask('SAVE_SUMMARIES', async () => {
          const indexedDbKeys = startupRuntimeContextRef.current.indexedDbKeys;
          if (!indexedDbKeys) throw new Error('Startup storage context is unavailable.');

          const summaries: Record<number, SaveSlotSummary | null> = { 1: null, 2: null, 3: null };
          for (let i = 1; i <= 3; i++) {
            const saveKey = `actorEmpireSave_${i}`;
            if (!indexedDbKeys.has(saveKey)) continue;
            const cachedSummary = getGameSaveSummary(saveKey);
            summaries[i] = cachedSummary || createDeferredSaveSlotSummary(saveKey, 'indexeddb');
          }

          // Legacy saves receive a lightweight card and migrate only after selection.
          const hasAnySave = Object.values(summaries).some(summary => summary !== null);
          if (!hasAnySave) {
            if (indexedDbKeys.has('actorEmpireSave')) {
              summaries[1] = createDeferredSaveSlotSummary('actorEmpireSave', 'indexeddb');
            } else {
              const localStorageKeys = new Set<string>();
              try {
                for (let index = 0; index < localStorage.length; index += 1) {
                  const key = localStorage.key(index);
                  if (key) localStorageKeys.add(key);
                }
              } catch {
                // Local storage is a legacy fallback only.
              }

              for (let i = 1; i <= 3; i++) {
                const key = `actorEmpireSave_${i}`;
                if (localStorageKeys.has(key)) {
                  summaries[i] = createDeferredSaveSlotSummary(key, 'localstorage');
                }
              }
              if (!Object.values(summaries).some(summary => summary !== null) && localStorageKeys.has('actorEmpireSave')) {
                summaries[1] = createDeferredSaveSlotSummary('actorEmpireSave', 'localstorage');
              }
            }
          }
          setSaveSlotSummaries(summaries);
          recordStartupCheckpoint('save_summaries_ready');
        });
        if (!completed) return;
      }

      if (shouldRun('HOME_SCREEN')) {
        const completed = await runTask('HOME_SCREEN', async () => {
          // All player-visible screen modules are ready before the menu opens.
          // Weekly simulation and optional telemetry remain on demand.
          await loadAllGameScreens();
        });
        if (!completed) return;
      }

      if (shouldRun('FIRST_SCREEN')) {
        const completed = await runTask('FIRST_SCREEN', async () => {
          // Give React one paint opportunity before revealing the menu.
          await yieldToMainThread();
        });
        if (!completed) return;
      }

      setIsInitializing(false);
    } catch (error) {
      if (startupAttemptIdRef.current !== attemptId) return;
      const timedOut = error instanceof IndexedDbOperationError && error.code === 'TIMEOUT';
      const storageFailure = activeTaskId === 'STORAGE' || activeTaskId === 'SAVE_SUMMARIES';
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      const failureKind = storageFailure
        ? 'STORAGE'
        : offline
          ? 'NETWORK'
          : activeTaskId === 'CRITICAL_ASSETS' || activeTaskId === 'HOME_SCREEN'
            ? 'ASSET'
            : 'APP';
      const message = storageFailure
        ? timedOut
          ? 'Device storage took too long to respond. Your careers were not changed.'
          : 'Actor Empire could not access saved careers on this device. Your careers were not changed.'
        : offline
          ? 'A network issue interrupted startup.'
          : `Startup task ${activeTaskId} could not be completed.`;
      const failureCode = timedOut
        ? `${activeTaskId.toLowerCase()}_timeout`
        : `${failureKind.toLowerCase()}_startup_failed`;
      recordStartupCheckpoint('startup_failed', {
        failedTask: activeTaskId,
        failureCode,
      });
      recordStartupCheckpoint('recovery_opened', {
        failedTask: activeTaskId,
        failureCode,
      });
      setStartupState(previous => timedOut
        ? timeoutStartupTask(previous, activeTaskId, attemptId, message, failureKind)
        : failStartupTask(previous, activeTaskId, attemptId, message, failureKind));

      const failureDecision = advanceStartupFailureCount(
        startupFailureCountsRef.current[activeTaskId] || 0,
        activeTaskId,
      );
      startupFailureCountsRef.current[activeTaskId] = failureDecision.count;
      if (failureDecision.shouldArmSafeMode) {
        setSafeBootRequested(true);
        try {
          sessionStorage.setItem(SAFE_BOOT_SESSION_KEY, '1');
        } catch {
          // Safe mode still applies to this mounted session.
        }
      }

      recordNonFatal(error, 'app_startup_task_failed', {
        task: activeTaskId,
        attempt: attemptId,
        timed_out: timedOut,
        retry: isRetry,
        failure_count: failureDecision.count,
        safe_mode_armed: failureDecision.shouldArmSafeMode,
      });
    } finally {
      executionLock.release(lease);
      if (isRetry) setIsStartupRetrying(false);
    }
  }, []);

  useEffect(() => {
    void runStartupInitialization();
  }, [runStartupInitialization]);

  useEffect(() => {
    return () => startupBackgroundScheduler.dispose();
  }, [startupBackgroundScheduler]);

  useEffect(() => {
    startupBackgroundScheduler.cancelPending();
    if (isInitializing || safeBootRequested || startupState.outcome !== 'READY' || iosPressureConstrained) return;

    const optionalOnlineServices: StartupBackgroundTask = {
      id: 'optional-online-services',
      prepare: async () => {
        await ensureTrackingPermission();
        await startRewardedAdPreloading();
      },
    };

    if (gameStatus === 'START_MENU' || (gameStatus === 'PLAYING' && activePage === Page.HOME)) {
      startupBackgroundScheduler.enqueue([optionalOnlineServices]);
    }

    return () => startupBackgroundScheduler.cancelPending();
  }, [
    activePage,
    gameStatus,
    isInitializing,
    iosPressureConstrained,
    safeBootRequested,
    startupBackgroundScheduler,
    startupState.outcome,
  ]);

  useEffect(() => {
    markTraceAction('app_runtime_ready', { flow: 'app_lifecycle' });
    const publishLifecycleCheckpoint = (
      checkpoint: 'runtime_ready' | 'backgrounded' | 'foregrounded' | 'page_hidden' | 'page_shown' | 'memory_warning',
    ) => {
      const currentPlayer = playerRef.current;
      void notifyIOSLongSessionCheckpoint({
        checkpoint,
        occurredAtMs: Date.now(),
        age: currentPlayer?.age,
        week: currentPlayer?.currentWeek,
        saveSlot: currentSlot ?? undefined,
        screen: Page[activePage] || String(activePage),
        ...getIOSLongSessionPlayerCounts(currentPlayer),
      }).catch(() => undefined);
    };
    publishLifecycleCheckpoint('runtime_ready');
    const handleVisibility = () => {
      publishLifecycleCheckpoint(document.visibilityState === 'hidden' ? 'backgrounded' : 'foregrounded');
      markTraceAction(document.visibilityState === 'hidden' ? 'app_backgrounded' : 'app_foregrounded', {
        flow: 'app_lifecycle',
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
    };
    const handlePageHide = () => {
      publishLifecycleCheckpoint('page_hidden');
      markTraceAction('app_page_hidden', {
        flow: 'app_lifecycle',
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
    };
    const handlePageShow = () => {
      publishLifecycleCheckpoint('page_shown');
      markTraceAction('app_page_shown', {
        flow: 'app_lifecycle',
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    const handleMemoryWarning = (event: Event) => {
      const detail = event instanceof CustomEvent ? event.detail : {};
      if (adaptivePerformancePlatform === 'IOS') {
        iosPressureConstrainedRef.current = true;
        iosSaveCooldownUntilRef.current = Date.now() + IOS_MEMORY_WARNING_AUTOSAVE_COOLDOWN_MS;
        setIOSSaveCooldownEpoch(previous => previous + 1);
        iosPressureHealthyWindowsRef.current = 0;
        setIOSPressureConstrained(true);
        startupBackgroundScheduler.cancelPending();
        clearGeneratedAvatarCache();
        setOptionalRewardedAdPreloadingSuspended(true);
      }
      publishLifecycleCheckpoint('memory_warning');
      dispatchAdaptivePerformance({
        kind: 'MEMORY_PRESSURE',
        nowMs: Date.now(),
        safeBoundary: adaptiveSafeBoundaryRef.current,
      });
      markTraceAction('native_memory_warning', {
        flow: 'app_lifecycle',
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
        ...(detail && typeof detail === 'object' ? detail : {}),
      });
      setCrashContext(playerRef.current, {
        native_memory_warning: true,
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
      const result = checkpointNativeMemoryPressure({
        isPlaying: gameStatus === 'PLAYING',
        currentSlot,
        isWeekProcessing: weekProcessingLockRef.current,
        isSaveTransferActive: saveTransferOperationLockRef.current?.isActive() === true,
        hasVerifiedCheckpoint: slot => verifiedCheckpointSlotsRef.current.has(slot),
        cancelPendingAutosave: () => {
          if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
          }
          if (currentSlot !== null) {
            saveOperationQueueRef.current.cancelPendingOptional(`slot:${currentSlot}`);
          }
        },
      });
      markTraceAction(
        result.status === 'READY'
          ? 'native_memory_checkpoint_ready'
          : 'native_memory_checkpoint_skipped',
        {
          flow: 'app_lifecycle',
          save_slot: currentSlot,
          checkpoint_status: result.status,
          checkpoint_reason: result.status === 'SKIPPED' ? result.reason : undefined,
        },
      );
    };
    window.addEventListener('actor-empire-memory-warning', handleMemoryWarning);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('actor-empire-memory-warning', handleMemoryWarning);
    };
  }, [activePage, adaptivePerformancePlatform, currentSlot, dispatchAdaptivePerformance, gameStatus, startupBackgroundScheduler]);

  // Auto-save logic
  useEffect(() => {
    if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }

    if (gameStatus !== 'PLAYING' || !currentSlot || isSaveTransferActive) return;
    if (suppressNextAutosaveRef.current) {
        suppressNextAutosaveRef.current = false;
        return;
    }

    const autosaveDelayMs = adaptivePerformancePlatform === 'IOS'
      ? autosaveDelayAfterPressure(AUTOSAVE_DEBOUNCE_MS, Date.now(), iosSaveCooldownUntilRef.current)
      : AUTOSAVE_DEBOUNCE_MS;
    autosaveTimerRef.current = window.setTimeout(() => {
        if (saveTransferOperationLockRef.current?.isActive()) {
          autosaveTimerRef.current = null;
          return;
        }
        setSaveSlots(prev => ({ ...prev, [currentSlot]: player }));
        void persistSlotSave(currentSlot, player, { reason: 'AUTOSAVE' });
        autosaveTimerRef.current = null;
    }, autosaveDelayMs);

    return () => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    };
  }, [player, gameStatus, currentSlot, isSaveTransferActive, adaptivePerformancePlatform, iosSaveCooldownEpoch]);

  useEffect(() => {
    if (gameStatus !== 'PLAYING' || !currentSlot) {
      activePlayStartedAtRef.current = null;
      return;
    }

    const resumeTimer = () => {
      activePlayStartedAtRef.current = Date.now();
    };

    const recordActivePlayTime = (persistImmediately = false) => {
      const startedAt = activePlayStartedAtRef.current;
      if (!startedAt) return;
      if (weekProcessingLockRef.current) return;

      const elapsedMs = Math.max(0, Date.now() - startedAt);
      if (elapsedMs === 0) return;

      activePlayStartedAtRef.current = Date.now();
      const currentPlayer = playerRef.current;
      const updatedPlayer: Player = {
        ...currentPlayer,
        totalPlayTimeMs: Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, currentPlayer.totalPlayTimeMs || 0) + elapsedMs),
      };

      playerRef.current = updatedPlayer;
      setPlayer(updatedPlayer);
      setSaveSlots(prev => ({ ...prev, [currentSlot]: updatedPlayer }));
      if (persistImmediately) void persistSlotSave(currentSlot, updatedPlayer);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordActivePlayTime(true);
        activePlayStartedAtRef.current = null;
      } else {
        resumeTimer();
      }
    };
    const handlePageHide = () => recordActivePlayTime(true);

    resumeTimer();
    const interval = window.setInterval(() => recordActivePlayTime(), PLAYTIME_FLUSH_INTERVAL_MS);
    window.addEventListener('pagehide', handlePageHide);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      recordActivePlayTime(true);
      window.clearInterval(interval);
      window.removeEventListener('pagehide', handlePageHide);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameStatus, currentSlot]);

  const handleSelectSlot = async (slot: number, options: { requireVerified?: boolean } = {}) => {
    startupBackgroundScheduler.cancelPending();
    const openingExistingCareer = Boolean(saveSlots[slot] || saveSlotSummaries[slot]);
    if (openingExistingCareer) {
        setCareerOpening({ status: 'Verifying career', supportingMessage: 'Checking your saved story before the next scene begins.' });
        await yieldToMainThread();
    }
    setCurrentSlot(slot);
    let existingSave = saveSlots[slot];
    if (!existingSave && saveSlotSummaries[slot]) {
        markTraceAction('selected_save_load_started', { flow: 'save_select', save_slot: slot });
        try {
            const summary = saveSlotSummaries[slot];
            const storageKey = summary?.storageKey || `actorEmpireSave_${slot}`;
            const storageKind = summary?.storageKind || 'indexeddb';
            let savedData: Player | null = null;
            let currentIsUnverified = storageKind === 'localstorage';
            let needsRecoveryCheckpoint = false;
            let sourceByteEstimate: number | undefined;
            if (storageKind === 'localstorage') {
                if (options.requireVerified) throw new Error('This career needs manual verification from the start menu. It was not changed.');
                const raw = localStorage.getItem(storageKey);
                savedData = raw ? JSON.parse(raw) as Player : null;
            } else {
                const verifiedLoad = await loadVerifiedGameData(storageKey);
                if (verifiedLoad.status === 'RECOVERY_AVAILABLE') {
                    setPendingSaveRecovery({
                        slot,
                        storageKey,
                        previous: verifiedLoad.previous,
                        violations: verifiedLoad.violations,
                    });
                    setCurrentSlot(null);
                    setCareerOpening(null);
                    return;
                }
                if (verifiedLoad.status === 'UNRECOVERABLE') {
                    throw new Error('This career and its recovery generation could not be verified. Import a signed backup before deleting anything.');
                }
                if (verifiedLoad.status === 'MISSING') throw new Error(`Save slot ${slot} could not be loaded.`);
                if (options.requireVerified && !isIOSRendererRecoveryLoadVerified(verifiedLoad.status)) {
                    throw new Error('Automatic recovery could not verify this career. Open it manually from the start menu.');
                }
                savedData = verifiedLoad.player;
                if (verifiedLoad.status === 'CURRENT' && storageKey === `actorEmpireSave_${slot}`) {
                    verifiedCheckpointSlotsRef.current.add(slot);
                }
                currentIsUnverified = verifiedLoad.status === 'LEGACY_UNVERIFIED';
                needsRecoveryCheckpoint = verifiedLoad.status === 'CURRENT' && verifiedLoad.needsRecoveryCheckpoint;
            }
            if (!savedData) throw new Error(`Save slot ${slot} could not be loaded.`);
            setCareerOpening({ status: 'Preparing your story', supportingMessage: 'Bringing your cast, projects and career history into the game.' });
            await yieldToMainThread();
            if (currentIsUnverified) sourceByteEstimate = estimateSaveJsonBytes(savedData);
            const source = storageKind === 'localstorage'
                ? (storageKey === 'actorEmpireSave' ? 'legacy-single-localstorage' : 'legacy-localstorage')
                : (storageKey === 'actorEmpireSave' ? 'legacy-indexeddb' : 'indexeddb-slot');
            const prepared = await prepareLoadedPlayerSave(slot, savedData, source);
            existingSave = prepared.player;
            setSaveSlots(prev => ({ ...prev, [slot]: prepared.player }));
            setSaveSlotSummaries(prev => ({ ...prev, [slot]: createSaveSlotSummary(prepared.player) }));
            if (currentIsUnverified || prepared.shouldPersist || source !== 'indexeddb-slot') {
                setCareerOpening({ status: 'Securing your career', supportingMessage: 'Safely updating this career before it opens.' });
                await yieldToMainThread();
                await persistSlotSave(slot, prepared.player, {
                    rethrow: true,
                    reason: 'MIGRATION',
                    currentIsUnverified,
                    sourceByteEstimate,
                });
            }
            if (prepared.carePackageGranted) {
                setToastMessage({
                    title: 'Migration Care Package',
                    subtext: `$${MIGRATION_CARE_PACKAGE_CASH.toLocaleString()} cash and ${MIGRATION_CARE_PACKAGE_ENERGY} bonus energy added to your migrated save.`,
                });
            } else if (needsRecoveryCheckpoint) {
                setToastMessage({
                    title: 'Backup Recommended',
                    subtext: 'Export this large career once. Its automatic previous-good checkpoint will be created on the next successful save.',
                });
            }
            markTraceAction('selected_save_load_completed', { flow: 'save_select', save_slot: slot });
        } catch (error) {
            recordNonFatal(error, 'selected_save_load_failed', { save_slot: slot });
            setCurrentSlot(null);
            setCareerOpening(null);
            setToastMessage({
                title: 'Save Could Not Open',
                subtext: error instanceof Error
                    ? error.message
                    : 'Your save was left untouched. Please try opening this slot again.',
            });
            return;
        }
    }
    if (existingSave) {
        setCareerOpening({ status: 'Setting the scene', supportingMessage: 'Your career is ready. Opening the studio now.' });
        await yieldToMainThread();
        recoverInterruptedWeekProcessingTrace(existingSave, { saveSlot: slot, screen: 'START_MENU' });
        setSaveSlots(prev => ({ ...prev, [slot]: existingSave }));
        // prepareLoadedPlayerSave already ran the complete save migration. Avoid
        // another full deep clone during the PLAYING hydration pass on mobile.
        skipNextPlayingMigrationRef.current = true;
        setPlayer(existingSave);
        setSkipStartMenuIntro(false);
        setGameStatus('PLAYING');
        setCareerOpening(null);
    } else {
        setPlayer(migratePlayerSave(INITIAL_PLAYER));
        setSkipStartMenuIntro(false);
        setGameStatus('CREATION');
    }
  };

  useEffect(() => {
    if (!iosRecoveryReadComplete || !iosRecoveryReport || startupState.outcome !== 'READY'
      || iosRecoveryAttemptedRef.current) return;
    iosRecoveryAttemptedRef.current = true;
    const slot = chooseIOSRendererRecoverySlot(iosRecoveryReport, {
      1: Boolean(saveSlots[1] || saveSlotSummaries[1]),
      2: Boolean(saveSlots[2] || saveSlotSummaries[2]),
      3: Boolean(saveSlots[3] || saveSlotSummaries[3]),
    });
    if (slot === null) {
      setIOSRecoveryRestoreComplete(true);
      return;
    }
    void tryIOSRendererRecoveryOpen(slot, selected => handleSelectSlot(selected, { requireVerified: true }))
      .then(result => {
        if (result.ok === true) return;
        recordNonFatal(result.error, 'ios_renderer_recovery_open_failed', { save_slot: slot });
        setToastMessage({
          title: 'Career Recovery Needs Attention',
          subtext: 'Your saved career was not changed. Please open it from the start menu.',
        });
      })
      .finally(() => setIOSRecoveryRestoreComplete(true));
  }, [iosRecoveryReadComplete, iosRecoveryReport, startupState.outcome, saveSlots, saveSlotSummaries]);

  useEffect(() => {
    if (adaptivePerformancePlatform !== 'IOS' || !iosRecoveryReadComplete
      || startupState.outcome !== 'READY' || isStartupLoadingVisible
      || (iosRecoveryReport && !iosRecoveryRestoreComplete)) return;
    const frame = window.requestAnimationFrame(() => {
      void notifyIOSLongSessionCheckpoint({ checkpoint: 'startup_ready', occurredAtMs: Date.now() })
        .catch(() => undefined);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [adaptivePerformancePlatform, iosRecoveryReadComplete, iosRecoveryReport,
    iosRecoveryRestoreComplete, isStartupLoadingVisible, startupState.outcome]);

  const handleRecoverSave = async () => {
    if (!pendingSaveRecovery || isRecoveringSave) return;
    const recovery = pendingSaveRecovery;
    setIsRecoveringSave(true);
    try {
        await recoverPreviousGameData(recovery.storageKey);
        setPendingSaveRecovery(null);
        setToastMessage({
            title: 'Career Recovered',
            subtext: `Restored ${recovery.previous.name} at age ${recovery.previous.age}, week ${recovery.previous.currentWeek}.`,
        });
        await handleSelectSlot(recovery.slot);
    } catch (error) {
        recordNonFatal(error, 'save_recovery_failed', { slot: recovery.slot });
        setToastMessage({
            title: 'Recovery Was Not Applied',
            subtext: 'Both stored generations were left untouched. Try importing your signed backup.',
        });
    } finally {
        setIsRecoveringSave(false);
    }
  };

  const handleCancelSaveRecovery = () => {
    if (isRecoveringSave) return;
    setPendingSaveRecovery(null);
    setCurrentSlot(null);
  };

  const handleDeleteSlot = async (slot: number) => {
    const summary = saveSlotSummaries[slot];
    const storageKey = summary?.storageKey || `actorEmpireSave_${slot}`;
    if (summary?.storageKind !== 'localstorage') {
        await deleteVerifiedGameData(storageKey);
    }
    if (storageKey !== `actorEmpireSave_${slot}`) {
        await deleteVerifiedGameData(`actorEmpireSave_${slot}`);
    }
    localStorage.removeItem(storageKey);
    localStorage.removeItem(`${storageKey}_meta`);
    localStorage.removeItem(`actorEmpireSave_${slot}`);
    localStorage.removeItem(`actorEmpireSave_${slot}_meta`);
    if (slot === 1) {
        localStorage.removeItem('actorEmpireSave');
        localStorage.removeItem('actorEmpireSave_meta');
    }
    verifiedCheckpointSlotsRef.current.delete(slot);
    setSaveSlots(prev => ({ ...prev, [slot]: null }));
    setSaveSlotSummaries(prev => ({ ...prev, [slot]: null }));
  };

  const beginSaveTransferExperience = (direction: 'EXPORT' | 'IMPORT') => {
    const controller = new AbortController();
    const presenter = createDelayedSaveTransferProgressPresenter({
      onChange: setSaveTransferProgress,
    });
    saveTransferAbortRef.current = controller;
    saveTransferProgressPresenterRef.current = presenter;
    presenter.update({
      direction,
      stage: direction === 'EXPORT' ? 'PREPARING' : 'WAITING_FOR_FILE',
      message: direction === 'EXPORT' ? 'Preparing save records...' : 'Choose the Actor Empire transfer file.',
      cancelable: true,
    });
    return { controller, presenter };
  };

  const finishSaveTransferExperience = (
    controller: AbortController,
    presenter: SaveTransferProgressPresenter,
  ) => {
    presenter.finish();
    if (saveTransferAbortRef.current === controller) saveTransferAbortRef.current = null;
    if (saveTransferProgressPresenterRef.current === presenter) saveTransferProgressPresenterRef.current = null;
  };

  const handleCancelSaveTransfer = () => {
    const controller = saveTransferAbortRef.current;
    if (!controller || controller.signal.aborted) return;
    controller.abort();
    setSaveTransferProgress(progress => progress ? {
      ...progress,
      stage: 'CANCELLING',
      message: 'Stopping at a safe boundary and removing temporary transfer data...',
      cancelable: false,
    } : progress);
  };

  const handleExportGameData = async (options: { skipCurrentSnapshot?: boolean } = {}) => {
    if (weekProcessingLockRef.current || isProcessing) {
      setToastMessage({
        title: 'Finish Processing First',
        subtext: 'Save transfer will be available as soon as the current week finishes safely.',
      });
      return;
    }
    const transferLock = saveTransferOperationLockRef.current!;
    const lease: SaveTransferOperationLease | null = transferLock.tryAcquire('EXPORT');
    if (!lease) {
      setToastMessage({
        title: 'Transfer Already Running',
        subtext: 'Please let the current save transfer finish before starting another.',
      });
      return;
    }
    setIsSaveTransferActive(true);
    const experience = beginSaveTransferExperience('EXPORT');
    try {
      if (!options.skipCurrentSnapshot && gameStatus === 'PLAYING' && currentSlot) {
        const playerToSave = await persistSlotSave(currentSlot, player, { rethrow: true, reason: 'MANUAL' });
        writeLocalStorageMirror(currentSlot, playerToSave);
        setSaveSlots(prev => ({ ...prev, [currentSlot]: playerToSave }));
        setSaveSlotSummaries(prev => ({ ...prev, [currentSlot]: createSaveSlotSummary(playerToSave) }));
      }

      const result = await exportSignedSaveArchive({
        signal: experience.controller.signal,
        onProgress: experience.presenter.update,
        onDiagnostic: telemetry => trackGameEvent('save_transfer_safety', telemetry),
      });
      setToastMessage({
        title: 'Save Export Ready',
        subtext: `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} signed for transfer.`,
      });
      return result;
    } catch (error) {
      if (!isSaveTransferCancelledError(error)) {
        recordNonFatal(error, 'save_transfer_export_failed', { save_slot: currentSlot });
      }
      setToastMessage({
        title: isSaveTransferCancelledError(error) ? 'Export Cancelled' : 'Export Failed',
        subtext: error instanceof Error ? error.message : 'Could not create the save transfer file.',
      });
      throw error;
    } finally {
      finishSaveTransferExperience(experience.controller, experience.presenter);
      transferLock.release(lease);
      setIsSaveTransferActive(false);
    }
  };

  const handleImportGameData = async () => {
    const confirmed = window.confirm('Importing a transfer file will replace the local Play Store saves on this device. Continue?');
    if (!confirmed) return;

    if (weekProcessingLockRef.current || isProcessing) {
      setToastMessage({
        title: 'Finish Processing First',
        subtext: 'Import will be available as soon as the current week finishes safely.',
      });
      return;
    }
    const transferLock = saveTransferOperationLockRef.current!;
    const lease: SaveTransferOperationLease | null = transferLock.tryAcquire('IMPORT');
    if (!lease) {
      setToastMessage({
        title: 'Transfer Already Running',
        subtext: 'Please let the current save transfer finish before starting another.',
      });
      return;
    }
    setIsSaveTransferActive(true);
    const experience = beginSaveTransferExperience('IMPORT');

    try {
      const result = await importSignedSaveArchiveFromFile({
        signal: experience.controller.signal,
        onProgress: experience.presenter.update,
        onDiagnostic: telemetry => trackGameEvent('save_transfer_safety', telemetry),
      });
      setToastMessage({
        title: result.carePackageGranted ? 'Save Imported + Care Package' : 'Save Imported',
        subtext: result.carePackageGranted
          ? `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} restored with ${result.mediaRecords || 0} media file${result.mediaRecords === 1 ? '' : 's'}. Added $${MIGRATION_CARE_PACKAGE_CASH.toLocaleString()} and ${MIGRATION_CARE_PACKAGE_ENERGY} bonus energy. Restarting now.`
          : `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} restored with ${result.mediaRecords || 0} media file${result.mediaRecords === 1 ? '' : 's'}. Restarting now.`,
      });
      window.setTimeout(() => window.location.reload(), 1200);
      return result;
    } catch (error) {
      if (!isSaveTransferCancelledError(error)) {
        recordNonFatal(error, 'save_transfer_import_failed', { save_slot: currentSlot });
      }
      setToastMessage({
        title: isSaveTransferCancelledError(error) ? 'Import Cancelled' : 'Import Blocked',
        subtext: error instanceof Error ? error.message : 'That transfer file could not be imported.',
      });
      throw error;
    } finally {
      finishSaveTransferExperience(experience.controller, experience.presenter);
      transferLock.release(lease);
      setIsSaveTransferActive(false);
    }
  };

  const handleRecoverToMenu = () => {
    setShowDebtModal(false);
    setIsShowingAd(false);
    setActivePressEvent(null);
    setShowProtectionPrompt(null);
    setActiveSocialEvent(null);
    setPendingWeekProcessingFailure(null);
    setActivePage(Page.HOME);
    setSkipStartMenuIntro(true);
    setGameStatus('START_MENU');
  };

  // Init opportunities and feed on mount (Hydration logic)
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      setPlayer(prev => {
          const skipMigration = skipNextPlayingMigrationRef.current;
          skipNextPlayingMigrationRef.current = false;
          const safePlayer = (skipMigration ? { ...prev } : migratePlayerSave(prev)) as any;
          if (!safePlayer.world || typeof safePlayer.world !== 'object') {
              safePlayer.world = clone(INITIAL_PLAYER.world);
          } else {
              safePlayer.world = {
                  ...clone(INITIAL_PLAYER.world),
                  ...safePlayer.world,
                  universes: {
                      ...clone(INITIAL_PLAYER.world.universes),
                      ...(safePlayer.world.universes || {}),
                  },
                  platforms: {
                      ...clone(INITIAL_PLAYER.world.platforms),
                      ...(safePlayer.world.platforms || {}),
                  }
              };
          }
          safePlayer.world.universes = normalizeUniverseMap(safePlayer.world.universes);

          if (!safePlayer.energy || typeof safePlayer.energy !== 'object') {
              const fallbackEnergy = typeof safePlayer.energy === 'number' ? safePlayer.energy : 100;
              safePlayer.energy = {
                  current: Math.max(0, fallbackEnergy),
                  max: Math.max(100, fallbackEnergy)
              };
          } else {
              if (typeof safePlayer.energy.current !== 'number') safePlayer.energy.current = 100;
              if (typeof safePlayer.energy.max !== 'number') safePlayer.energy.max = Math.max(100, safePlayer.energy.current);
          }

          safePlayer.settings = {
              ...clone(INITIAL_PLAYER.settings),
              ...(safePlayer.settings && typeof safePlayer.settings === 'object' ? safePlayer.settings : {})
          };
          safePlayer.settings.language = isSupportedGameLanguage(safePlayer.settings.language) ? safePlayer.settings.language : 'en';
          safePlayer.settings.performance = normalizePerformanceSettings(
              safePlayer.settings.performance,
              safePlayer.settings.smoothMode,
          );
          safePlayer.settings.smoothMode = safePlayer.settings.performance.preference === 'PERFORMANCE';

          if (!safePlayer.writerStats) {
              safePlayer.writerStats = { creativity: 0, dialogue: 0, structure: 0, pacing: 0 };
          } else {
              if (safePlayer.writerStats.creativity === undefined) safePlayer.writerStats.creativity = 0;
              if (safePlayer.writerStats.dialogue === undefined) safePlayer.writerStats.dialogue = 0;
              if (safePlayer.writerStats.structure === undefined) safePlayer.writerStats.structure = 0;
              if (safePlayer.writerStats.pacing === undefined) safePlayer.writerStats.pacing = 0;
          }

          if (!safePlayer.directorStats) {
              safePlayer.directorStats = { vision: 0, technical: 0, leadership: 0, style: 0 };
          } else {
              if (safePlayer.directorStats.vision === undefined) safePlayer.directorStats.vision = 0;
              if (safePlayer.directorStats.technical === undefined) safePlayer.directorStats.technical = 0;
              if (safePlayer.directorStats.leadership === undefined) safePlayer.directorStats.leadership = 0;
              if (safePlayer.directorStats.style === undefined) safePlayer.directorStats.style = 0;
          }

          if (!safePlayer.stats) safePlayer.stats = clone(INITIAL_PLAYER.stats);
          safePlayer.stats.genreXP = hydrateGenreXP(safePlayer.stats.genreXP);

          if (!safePlayer.team) safePlayer.team = { ...INITIAL_PLAYER.team };
          if (safePlayer.team.wellness === undefined) safePlayer.team.wellness = null;
          const hiredTeamIds = [
              safePlayer.team.agent?.id,
              safePlayer.team.manager?.id,
              safePlayer.team.personalTrainer?.id,
              safePlayer.team.stylist?.id,
              safePlayer.team.therapist?.id,
              safePlayer.team.publicist?.id,
              safePlayer.team.wellness?.id,
          ].filter((id): id is string => Boolean(id));

          // Ensure Pools
          if (!safePlayer.team.availableAgents?.length) safePlayer.team.availableAgents = getRandomAgents(3, hiredTeamIds);
          if (!safePlayer.team.availableManagers?.length) safePlayer.team.availableManagers = getRandomManagers(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableTrainers) || safePlayer.team.availableTrainers.length === 0) safePlayer.team.availableTrainers = getRandomTrainers(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableStylists) || safePlayer.team.availableStylists.length === 0) safePlayer.team.availableStylists = getRandomStylists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableTherapists) || safePlayer.team.availableTherapists.length === 0) safePlayer.team.availableTherapists = getRandomTherapists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availablePublicists) || safePlayer.team.availablePublicists.length === 0) safePlayer.team.availablePublicists = getRandomPublicists(2, hiredTeamIds);
          if (!Array.isArray(safePlayer.team.availableWellness) || safePlayer.team.availableWellness.length === 0) safePlayer.team.availableWellness = getRandomWellness(2, hiredTeamIds);
          safePlayer.team = sanitizeTeamPools(safePlayer);

          // Ensure Arrays
          if (!Array.isArray(safePlayer.commitments)) safePlayer.commitments = [];
          safePlayer.commitments = safePlayer.commitments.map((commitment: any) => normalizeCommitment(commitment));
          if (!Array.isArray(safePlayer.assetStates)) safePlayer.assetStates = [];
          safePlayer.assetStates = safePlayer.assetStates
              .filter((state: any) => typeof state?.assetId === 'string')
              .map((state: any) => ({
                  assetId: state.assetId,
                  condition: Math.max(0, Math.min(100, Math.round(Number(state.condition ?? 100)))),
                  currentValue: Math.max(0, Math.round(Number(state.currentValue || 0))),
                  valueTrend: Number.isFinite(Number(state.valueTrend)) ? Number(state.valueTrend) : 0,
                  marketCycle: typeof state.marketCycle === 'string' ? state.marketCycle : undefined,
                  neighborhoodTier: typeof state.neighborhoodTier === 'string' ? state.neighborhoodTier : undefined,
                  rentDemand: Math.max(0, Math.min(100, Math.round(Number(state.rentDemand || 0)))),
                  vacancyChance: Math.max(0, Math.min(1, Number(state.vacancyChance || 0))),
                  vacancyWeeks: Math.max(0, Math.round(Number(state.vacancyWeeks || 0))),
                  rentalListed: Boolean(state.rentalListed),
                  weeklyRent: Math.max(0, Math.round(Number(state.weeklyRent || 0))),
                  lifetimeRevenue: Math.max(0, Math.round(Number(state.lifetimeRevenue || 0))),
                  listedWeek: Math.max(0, Math.round(Number(state.listedWeek || 0))),
                  lastMaintainedWeek: Math.max(0, Math.round(Number(state.lastMaintainedWeek || 0))),
              }));
          if (typeof safePlayer.activeVehicleId !== 'string') safePlayer.activeVehicleId = null;
          if (!Array.isArray(safePlayer.activeReleases)) safePlayer.activeReleases = [];
          safePlayer.activeReleases = safePlayer.activeReleases.map((release: any) => normalizeActiveRelease(release, safePlayer.age, safePlayer.currentWeek));
          if (!Array.isArray(safePlayer.pastProjects)) safePlayer.pastProjects = [];
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => normalizePastProject(project));
          if (!Array.isArray(safePlayer.activeHealthConditions)) safePlayer.activeHealthConditions = [];
          if (!Array.isArray(safePlayer.news)) safePlayer.news = [];
          if (!Array.isArray(safePlayer.inbox)) safePlayer.inbox = [];
          if (!Array.isArray(safePlayer.activeSponsorships)) safePlayer.activeSponsorships = [];
          if (!Array.isArray(safePlayer.applications)) safePlayer.applications = [];
          if (!safePlayer.studioMemory) safePlayer.studioMemory = {} as any;
          if (!safePlayer.world) safePlayer.world = { ...INITIAL_PLAYER.world };
          if (!safePlayer.world.npcVentures || typeof safePlayer.world.npcVentures !== 'object') safePlayer.world.npcVentures = {};
          if (!safePlayer.world.studios || typeof safePlayer.world.studios !== 'object') safePlayer.world.studios = { ...INITIAL_PLAYER.world.studios };
          if (!Array.isArray(safePlayer.pendingEvents)) safePlayer.pendingEvents = [];
          if (!Array.isArray(safePlayer.logs)) safePlayer.logs = [];
          if (!safePlayer.weeklyOpportunities || !Array.isArray(safePlayer.weeklyOpportunities.auditions) || !Array.isArray(safePlayer.weeklyOpportunities.jobs)) {
              safePlayer.weeklyOpportunities = { auditions: [], jobs: [] };
          }

          if (typeof safePlayer.name !== 'string' || !safePlayer.name.trim()) {
              safePlayer.name = INITIAL_PLAYER.name;
          }
          const fallbackHandle = `@${safePlayer.name.replace(/\s+/g, '_').toLowerCase()}`;

          if (!safePlayer.instagram) safePlayer.instagram = { ...INITIAL_PLAYER.instagram, handle: fallbackHandle };
          if (!Array.isArray(safePlayer.instagram.feed)) safePlayer.instagram.feed = [];
          if (!Array.isArray(safePlayer.instagram.posts)) safePlayer.instagram.posts = [];
          if (!safePlayer.instagram.npcStates) safePlayer.instagram.npcStates = {};
          if (typeof safePlayer.instagram.weeklyPostCount !== 'number') safePlayer.instagram.weeklyPostCount = 0;
          if (typeof safePlayer.instagram.lastPostWeek !== 'number') safePlayer.instagram.lastPostWeek = 0;
          if (typeof safePlayer.instagram.followers !== 'number') safePlayer.instagram.followers = safePlayer.stats.followers || 0;
          if (typeof safePlayer.instagram.aesthetic !== 'number') safePlayer.instagram.aesthetic = 50;
          if (typeof safePlayer.instagram.authenticity !== 'number') safePlayer.instagram.authenticity = 55;
          if (typeof safePlayer.instagram.controversy !== 'number') safePlayer.instagram.controversy = 0;
          if (typeof safePlayer.instagram.fashionInfluence !== 'number') safePlayer.instagram.fashionInfluence = 10;
          if (typeof safePlayer.instagram.fanLoyalty !== 'number') safePlayer.instagram.fanLoyalty = 45;

          if (!safePlayer.x) safePlayer.x = { handle: safePlayer.instagram.handle, followers: 0, posts: [], feed: [], lastPostWeek: 0 };
          // HYDRATION FIX: If loading old save without x.followers, init it based on existing fame
          if (typeof safePlayer.x.followers !== 'number') {
              safePlayer.x.followers = Math.floor(safePlayer.stats.followers * 0.1) || 20;
          }
          if (!Array.isArray(safePlayer.x.posts)) safePlayer.x.posts = [];
          if (!Array.isArray(safePlayer.x.feed)) safePlayer.x.feed = [];
          if (typeof safePlayer.x.lastPostWeek !== 'number') safePlayer.x.lastPostWeek = 0;

          if (!safePlayer.youtube) safePlayer.youtube = { ...INITIAL_PLAYER.youtube, handle: safePlayer.instagram.handle };
          if (!Array.isArray(safePlayer.youtube.videos)) safePlayer.youtube.videos = [];
          if (!Array.isArray(safePlayer.youtube.activeCollabs)) safePlayer.youtube.activeCollabs = [];
          if (!Array.isArray(safePlayer.youtube.activeBrandDeals)) safePlayer.youtube.activeBrandDeals = [];
          if (!safePlayer.youtube.bannerColor) safePlayer.youtube.bannerColor = 'bg-gradient-to-r from-red-900 to-zinc-900';
          if (typeof safePlayer.youtube.subscribers !== 'number') safePlayer.youtube.subscribers = 0;
          if (typeof safePlayer.youtube.lifetimeEarnings !== 'number') safePlayer.youtube.lifetimeEarnings = 0;
          if (typeof safePlayer.youtube.totalChannelViews !== 'number') safePlayer.youtube.totalChannelViews = 0;
          if (typeof safePlayer.youtube.isMonetized !== 'boolean') safePlayer.youtube.isMonetized = false;
          if (typeof safePlayer.youtube.audienceTrust !== 'number') safePlayer.youtube.audienceTrust = 55;
          if (typeof safePlayer.youtube.fanMood !== 'number') safePlayer.youtube.fanMood = 55;
          if (typeof safePlayer.youtube.controversy !== 'number') safePlayer.youtube.controversy = 0;
          if (typeof safePlayer.youtube.membershipsActive !== 'boolean') safePlayer.youtube.membershipsActive = false;
          if (typeof safePlayer.youtube.members !== 'number') safePlayer.youtube.members = 0;
          if (typeof safePlayer.youtube.lastLivestreamWeek !== 'number') safePlayer.youtube.lastLivestreamWeek = 0;
          if (typeof safePlayer.youtube.lastMerchDropWeek !== 'number') safePlayer.youtube.lastMerchDropWeek = 0;
          if (!safePlayer.youtube.creatorIdentity) safePlayer.youtube.creatorIdentity = 'ACTOR_VLOGGER';
          if (typeof safePlayer.youtube.lastIdentityChangeWeek !== 'number') safePlayer.youtube.lastIdentityChangeWeek = 0;

          if (!safePlayer.finance || typeof safePlayer.finance !== 'object') {
              safePlayer.finance = {
                  history: [],
                  yearly: [],
                  loans: [],
                  credit: { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }
              };
          } else {
              if (!Array.isArray(safePlayer.finance.history)) safePlayer.finance.history = [];
              if (!Array.isArray(safePlayer.finance.yearly)) safePlayer.finance.yearly = [];
              if (!Array.isArray((safePlayer.finance as any).loans)) (safePlayer.finance as any).loans = [];
              if (!(safePlayer.finance as any).credit || typeof (safePlayer.finance as any).credit !== 'object') {
                  (safePlayer.finance as any).credit = { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 };
              }
          }

          if (!safePlayer.relationships || safePlayer.relationships.length === 0) safePlayer.relationships = [...INITIAL_PLAYER.relationships];

          // FIX: Patch broken avatars
          if (safePlayer.relationships) {
              safePlayer.relationships = safePlayer.relationships.map((rel: any) => {
                  let patchedRel = { ...rel };
                  const imageUrl = typeof patchedRel.image === 'string' ? patchedRel.image : '';

                  if (patchedRel.id === 'rel_mom' && (imageUrl.includes('seed=Mom') || imageUrl === '')) {
                      patchedRel = { ...patchedRel, image: getGenderedAvatar('FEMALE', 'Sophie') };
                  }
                  if (patchedRel.id === 'rel_dad' && (imageUrl.includes('seed=Dad') || imageUrl === '')) {
                      patchedRel = { ...patchedRel, image: getGenderedAvatar('MALE', 'Arthur') };
                  }

                  if ((patchedRel.relation === 'Parent' || patchedRel.relation === 'Deceased Parent') && typeof patchedRel.age !== 'number') {
                      const fallbackAgeGap = patchedRel.id === 'rel_mom' || /mom|mother/i.test(patchedRel.name) ? 28 : 31;
                      patchedRel.age = safePlayer.age + fallbackAgeGap;
                  }

                  if ((patchedRel.relation === 'Child' || patchedRel.relation === 'Sibling') && typeof patchedRel.birthWeekAbsolute !== 'number' && typeof patchedRel.age === 'number') {
                      patchedRel.birthWeekAbsolute = Math.max(0, getAbsoluteWeek(safePlayer.age, safePlayer.currentWeek) - (patchedRel.age * 52));
                  }

                  if ((patchedRel.relation === 'Child' || patchedRel.relation === 'Sibling') && typeof patchedRel.birthWeekAbsolute === 'number') {
                      patchedRel.age = getRelationshipAge(patchedRel, safePlayer.age, safePlayer.currentWeek);
                  }

                  if (typeof patchedRel.lastInteractionAbsolute !== 'number') {
                      patchedRel.lastInteractionAbsolute = Math.max(0, getAbsoluteWeek(safePlayer.age, safePlayer.currentWeek) - Math.max(0, safePlayer.currentWeek - (patchedRel.lastInteractionWeek || safePlayer.currentWeek)));
                  }

                  return patchedRel;
              });
          }

          if (safePlayer.weeklyOpportunities.jobs.length === 0 || safePlayer.weeklyOpportunities.auditions.length === 0) {
              const usedTitles = [...safePlayer.commitments.map((c: any) => c.name), ...safePlayer.activeReleases.map((r: any) => r.name), ...safePlayer.pastProjects.map((p: any) => p.name)];
              safePlayer.weeklyOpportunities = { auditions: generateAuditions(safePlayer, usedTitles), jobs: generatePartTimeJobs() };
          }

          if (safePlayer.instagram.feed.length === 0) safePlayer.instagram.feed = generateWeeklyFeed(safePlayer);

          if (!Array.isArray(safePlayer.awards)) safePlayer.awards = [];
          safePlayer.awards = dedupeAwards(safePlayer.awards);
          if (!Array.isArray(safePlayer.scheduledEvents)) safePlayer.scheduledEvents = [];
          if (!safePlayer.dating) safePlayer.dating = { isTinderActive: false, isLuxeActive: false, preferences: { gender: 'ALL', minAge: 18, maxAge: 35 }, matches: [], luxeRefreshOffset: 0, luxeCycleStartAbsoluteWeek: 0 };
          if (typeof safePlayer.dating.luxeRefreshOffset !== 'number') safePlayer.dating.luxeRefreshOffset = 0;
          if (typeof safePlayer.dating.luxeCycleStartAbsoluteWeek !== 'number') safePlayer.dating.luxeCycleStartAbsoluteWeek = 0;
          if (!safePlayer.flags) safePlayer.flags = {};
          if (typeof safePlayer.flags.weeklyBaseEnergyRemaining !== 'number') {
              safePlayer.flags.weeklyBaseEnergyRemaining = Math.max(0, Math.min(100, safePlayer.energy.current));
          }
          if (typeof safePlayer.flags.bonusEnergyBank !== 'number') {
              safePlayer.flags.bonusEnergyBank = Math.max(0, safePlayer.energy.current - safePlayer.flags.weeklyBaseEnergyRemaining);
          }
          if (!Array.isArray(safePlayer.flags.premiumPurchases)) safePlayer.flags.premiumPurchases = [];
          if (!Array.isArray(safePlayer.flags.premiumCollections)) safePlayer.flags.premiumCollections = [];
          if (!Array.isArray(safePlayer.flags.processedIOSStoreTransactionIds)) safePlayer.flags.processedIOSStoreTransactionIds = [];
          if (typeof safePlayer.flags.bailoutAdsUsedThisWeek !== 'number') safePlayer.flags.bailoutAdsUsedThisWeek = 0;
          syncEnergyDisplay(safePlayer);

          if (!safePlayer.businesses) safePlayer.businesses = [];
          safePlayer.businesses = safePlayer.businesses.map((biz: any) => {
              if (biz.type !== 'PRODUCTION_HOUSE') return biz;
              const normalizedStudioState = normalizeStudioState(biz.studioState, safePlayer.currentWeek || 1);
              const normalizedStudioStateWithLegacyUniverses = normalizedStudioState as any;
              return {
                  ...biz,
                  studioState: {
                      ...normalizedStudioState,
                      universes: Array.isArray(normalizedStudioStateWithLegacyUniverses.universes)
                          ? normalizedStudioStateWithLegacyUniverses.universes.map((universe: any) => {
                              const normalizedUniverse = normalizeUniverseMap({ [universe?.id || 'CUSTOM_UNIVERSE']: universe });
                              const resolved = Object.values(normalizedUniverse).find((entry: any) => entry.id === universe?.id) || universe;
                              return safePlayer.world.universes[resolved.id] || resolved;
                          })
                          : [],
                  },
              };
          });
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => ({
              ...project,
              awards: dedupeAwards(project.awards || [])
          }));
          safePlayer.awards = dedupeAwards(safePlayer.awards || []);
          if (safePlayer.business) {
              const legacyName = String(safePlayer.business.type || '');
              const alreadyHasProductionHouse = safePlayer.businesses.some((biz: any) => biz.type === 'PRODUCTION_HOUSE');
              const indMap: Record<string, any> = {
                  'Cafe': { type: 'CAFE', subtype: 'COFFEE_SHOP', emoji: '☕' },
                  'Online Brand': { type: 'FASHION', subtype: 'STREETWEAR', emoji: '👕' },
                  'Production House': { type: 'PRODUCTION_HOUSE', subtype: 'MAJOR_STUDIO', emoji: '🎬' }
              };
              const mapped = indMap[legacyName] || { type: 'RESTAURANT', subtype: 'CASUAL_DINING', emoji: '🍽️' };

              // Legacy saves used a single `business` object. Do not downgrade an old
              // production house into merch during migration, and avoid duplicates if a
              // newer `businesses` entry already exists.
              if (mapped.type !== 'PRODUCTION_HOUSE' || !alreadyHasProductionHouse) {
                  const newBiz = createBusiness(
                      safePlayer.business.name,
                      mapped.type,
                      mapped.subtype,
                      { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' },
                      mapped.emoji,
                      safePlayer.currentWeek
                  );
                  const legacyInvestment = Math.max(0, Number(safePlayer.business.totalInvestment || 0));
                  if (legacyInvestment > 0) {
                      newBiz.stats.valuation = Math.max(newBiz.stats.valuation, legacyInvestment * 1.5);
                      newBiz.balance = Math.max(newBiz.balance, legacyInvestment * 0.2);
                      if (newBiz.type === 'PRODUCTION_HOUSE' && newBiz.studioState) {
                          newBiz.studioState.productionFund = Math.max(newBiz.studioState.productionFund || 0, legacyInvestment * 0.2);
                      }
                  }
                  safePlayer.businesses.push(newBiz);
              }
              delete safePlayer.business;
          }
          return safePlayer;
      });
    }
  }, [gameStatus]);

  useEffect(() => {
      if (toastMessage) { const t = setTimeout(() => setToastMessage(null), 2500); return () => clearTimeout(t); }
  }, [toastMessage]);

  const handleUpdatePlayer = (updatedPlayer: Player) => {
      setPlayer(prepareExternalPlayerUpdateForUi(updatedPlayer));
  };

  const commitProcessedWeekPlayer = (processedPlayer: Player) => {
      setPlayer(prepareProcessedWeekForUi(processedPlayer));
  };

  const handleQueueBabyNamingCheat = () => {
      const nextPlayer = {
          ...player,
          flags: {
              ...player.flags,
              qaBabyNamingNextWeek: true,
          },
          logs: [{ week: player.currentWeek, year: player.age, message: '🍼 CHEAT: Baby naming test queued for next week.', type: 'positive' }, ...player.logs].slice(0, 50)
      };
      handleUpdatePlayer(nextPlayer);
      setToastMessage({ title: tr('app.qa.babyQueuedTitle'), subtext: tr('app.qa.babyQueuedSubtext') });
  };

  const handleSchedulePregnancy = (request: PendingBabyNaming) => {
      handleGenericUpdate(prev => {
          if (prev.activePregnancy) {
              setToastMessage({
                  title: tr('app.feedback.pregnancyActiveTitle'),
                  subtext: tr('app.feedback.pregnancyActiveSubtext')
              });
              return prev;
          }

          const currentAbsoluteWeek = getAbsoluteWeek(prev.age, prev.currentWeek);
          const birthWeekAbsolute = Math.max(request.birthWeekAbsolute || 0, currentAbsoluteWeek + PREGNANCY_TERM_WEEKS);
          const weeksLeft = Math.max(1, birthWeekAbsolute - currentAbsoluteWeek);

          return {
              ...prev,
              activePregnancy: {
                  partnerId: request.partnerId,
                  partnerName: request.partnerName,
                  pregnancyCarrier: request.pregnancyCarrier || 'PARTNER',
                  babyGender: request.babyGender,
                  suggestedFirstName: request.suggestedFirstName,
                  conceptionWeekAbsolute: currentAbsoluteWeek,
                  birthWeekAbsolute,
                  weeksLeft,
                  shouldCreateScandalNews: request.shouldCreateScandalNews,
              },
          };
      }, `🍼 ${getPregnancyFeedbackCopy(request.pregnancyCarrier || 'PARTNER', request.partnerName, language).log}`);
      const pregnancyFeedback = getPregnancyFeedbackCopy(request.pregnancyCarrier || 'PARTNER', request.partnerName, language);
      setToastMessage({ title: pregnancyFeedback.title, subtext: pregnancyFeedback.toast });
  };

  const handleNextWeek = async () => {
    const now = Date.now();
    if (saveTransferOperationLockRef.current?.isActive()) {
      setToastMessage({
        title: 'Save Transfer Running',
        subtext: 'The next week will be available when the current transfer finishes safely.',
      });
      return;
    }
    if (weekProcessingLockRef.current || isProcessing) {
      markWeekProcessingStage('input_rejected_busy', player, {
        status: 'running',
        run_id: activeWeekRunIdRef.current || undefined,
        screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
      return;
    }
    if (now - lastWeekProcessSettledAtRef.current < 500) {
      markWeekProcessingStage('input_rejected_cooldown', player, {
        status: 'success',
        screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
      return;
    }
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const traceName = 'process_game_week';
    const startedAt = performance.now();
    const activePageName = Page[activePage] || String(activePage);
    const weekRunId = `week_${player.age}_${player.currentWeek}_${Date.now().toString(36)}`;
    const previousHealthConditionIds = new Set(
      (Array.isArray(player.activeHealthConditions) ? player.activeHealthConditions : [])
        .map(condition => condition?.id)
        .filter(Boolean),
    );
    weekProcessingLockRef.current = true;
    activeWeekRunIdRef.current = weekRunId;
    activeWeekStageRef.current = 'paint_wait';
    setPendingWeekProcessingFailure(null);
    setIsProcessing(true);
    try {
        await yieldForWeekProcessingPaint();
        markTraceAction('process_week_started', {
          last_screen: activePageName,
          flow: 'process_week',
          save_slot: currentSlot,
        });
        setCrashContext(player, {
          flow: 'process_week',
          screen: activePage,
          game_status: gameStatus,
          save_slot: currentSlot,
        });
        addBreadcrumb('process_week:start', {
          age: player.age,
          week: player.currentWeek,
          pendingEvents: player.pendingEvents?.length || 0,
          commitments: player.commitments?.length || 0,
        });
        markWeekProcessingStage('start', player, {
          status: 'started',
          run_id: weekRunId,
          screen: activePageName,
          save_slot: currentSlot,
        });
        markGameCheckpoint('process_week_start', player, {
          screen: activePage,
          pending_events: player.pendingEvents?.length || 0,
          commitments: player.commitments?.length || 0,
          active_releases: player.activeReleases?.length || 0,
        });
        startPerformanceTrace(traceName, {
          age: player.age,
          week: player.currentWeek,
          screen: activePage,
        });
        activeWeekStageRef.current = 'game_loop_start';
        markWeekProcessingStage('game_loop_start', player, {
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
        });
        // The full simulation is intentionally outside the startup package.
        // It is loaded only when the player actually advances a week.
        const { processGameWeek } = await import('./services/gameLoop');
        const { player: newPlayerState, triggerAd } = await processGameWeek(player, {
            onStage: (stage, context) => {
                activeWeekStageRef.current = `loop_${stage}`;
                markWeekProcessingStage(`loop_${stage}`, player, {
                    ...context,
                    run_id: weekRunId,
                    screen: activePageName,
                    save_slot: currentSlot,
                    elapsed_ms: Math.round(performance.now() - startedAt),
                });
            },
        });
        activeWeekStageRef.current = 'post_week_sync_start';
        markWeekProcessingStage('game_loop_done', newPlayerState, {
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
            elapsed_ms: Math.round(performance.now() - startedAt),
        });
        const shouldTriggerBabyQa = !!newPlayerState.flags?.qaBabyNamingNextWeek;
        let syncedPlayerState = shouldTriggerBabyQa
            ? {
                ...newPlayerState,
                flags: {
                    ...newPlayerState.flags,
                    qaBabyNamingNextWeek: false,
                }
            }
            : newPlayerState;
        let babyNamingDue: PendingBabyNaming | null = null;
        markWeekProcessingStage('post_week_sync_start', syncedPlayerState, {
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
            elapsed_ms: Math.round(performance.now() - startedAt),
        });

        if (syncedPlayerState.activePregnancy) {
            const pregnancy = syncedPlayerState.activePregnancy;
            const currentAbsoluteWeek = getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek);
            const weeksLeft = typeof pregnancy.birthWeekAbsolute === 'number'
                ? pregnancy.birthWeekAbsolute - currentAbsoluteWeek
                : (pregnancy.weeksLeft || 1) - 1;

            if (weeksLeft <= 0) {
                const partnerName = pregnancy.partnerName
                    || syncedPlayerState.relationships.find(rel => rel.id === pregnancy.partnerId)?.name
                    || 'Your partner';
                babyNamingDue = {
                    partnerId: pregnancy.partnerId,
                    partnerName,
                    pregnancyCarrier: pregnancy.pregnancyCarrier || 'PARTNER',
                    babyGender: pregnancy.babyGender || (Math.random() > 0.5 ? 'MALE' : 'FEMALE'),
                    suggestedFirstName: pregnancy.suggestedFirstName || (Math.random() > 0.5 ? 'Leo' : 'Mia'),
                    birthWeekAbsolute: currentAbsoluteWeek,
                    eventWeek: syncedPlayerState.currentWeek,
                    eventYear: syncedPlayerState.age,
                    shouldCreateScandalNews: !!pregnancy.shouldCreateScandalNews,
                };
                syncedPlayerState = {
                    ...syncedPlayerState,
                    activePregnancy: undefined,
                    logs: [
                        { week: syncedPlayerState.currentWeek, year: syncedPlayerState.age, message: `🍼 The baby with ${partnerName} is here. Time to choose a name.`, type: 'positive' as const },
                        ...syncedPlayerState.logs,
                    ].slice(0, 50),
                };
            } else {
                syncedPlayerState = {
                    ...syncedPlayerState,
                    activePregnancy: {
                        ...pregnancy,
                        weeksLeft,
                        birthWeekAbsolute: pregnancy.birthWeekAbsolute || currentAbsoluteWeek + weeksLeft,
                    },
                };
            }
        }
        const newMedicalCondition = (Array.isArray(syncedPlayerState.activeHealthConditions) ? syncedPlayerState.activeHealthConditions : [])
            .filter(condition => condition?.id && !previousHealthConditionIds.has(condition.id))
            .sort((a, b) => getMedicalPromptSeverityRank(b.severity) - getMedicalPromptSeverityRank(a.severity))[0];
        let medicalPromptToShow: PendingMedicalPrompt | null = null;

        if (newMedicalCondition) {
            const currentMedicalPromptWeek = getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek);
            const lastMedicalPromptWeek = Number(syncedPlayerState.flags?.lastMedicalPromptAbsoluteWeek ?? -999);
            const promptCooldownWeeks = getMedicalPromptCooldownWeeks(newMedicalCondition.severity);
            const shouldShowMedicalPrompt = promptCooldownWeeks === 0 || currentMedicalPromptWeek - lastMedicalPromptWeek >= promptCooldownWeeks;

            if (shouldShowMedicalPrompt) {
                const conditionName = getHealthConditionLabel(newMedicalCondition, getPlayerLanguage(syncedPlayerState));
                syncedPlayerState = {
                    ...syncedPlayerState,
                    flags: {
                        ...(syncedPlayerState.flags || {}),
                        lastMedicalPromptAbsoluteWeek: currentMedicalPromptWeek,
                    },
                };
                medicalPromptToShow = {
                    conditionName,
                    severity: newMedicalCondition.severity,
                    healthCap: newMedicalCondition.healthCap,
                };
            }
        }
        markWeekProcessingStage('post_week_sync_done', syncedPlayerState, {
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
            elapsed_ms: Math.round(performance.now() - startedAt),
        });

        activeWeekStageRef.current = 'persist_prepare_start';
        const runtimePlayerState = await persistCurrentSlotSnapshot(syncedPlayerState, {
            runId: weekRunId,
            screen: activePageName,
            onStage: stage => { activeWeekStageRef.current = stage; },
        });
        syncedPlayerState = runtimePlayerState;
        activeWeekStageRef.current = 'commit_verified_week';
        suppressNextAutosaveRef.current = true;
        commitProcessedWeekPlayer(runtimePlayerState);
        addBreadcrumb('process_week:persisted', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            saveSlot: currentSlot,
        });

        if (medicalPromptToShow) {
            setPendingMedicalPrompt(medicalPromptToShow);
        }

        if (shouldTriggerBabyQa) {
            setPendingBabyNaming({
                partnerId: 'cheat_partner',
                partnerName: 'Jordan Vale',
                pregnancyCarrier: 'PARTNER',
                babyGender: Math.random() > 0.5 ? 'MALE' : 'FEMALE',
                suggestedFirstName: Math.random() > 0.5 ? 'Leo' : 'Mia',
                birthWeekAbsolute: getAbsoluteWeek(syncedPlayerState.age, syncedPlayerState.currentWeek),
                eventWeek: syncedPlayerState.currentWeek,
                eventYear: syncedPlayerState.age,
                shouldCreateScandalNews: false,
            });
        }
        if (babyNamingDue) {
            setPendingBabyNaming(babyNamingDue);
        }

        if (syncedPlayerState.flags?.isDead) {
            trackGameEvent('process_week_death_screen', {
                age: syncedPlayerState.age,
                week: syncedPlayerState.currentWeek,
            });
            setGameStatus('DEATH_SCREEN');
            return;
        }

        // Debt Check
        if (syncedPlayerState.money < 0) {
            setShowDebtModal(true);
        }

        // INTERSTITIAL AD TRIGGER (Every 12 Weeks)
        if (triggerAd && !hasNoAds(syncedPlayerState)) {
            setTimeout(async () => {
                await showAd('INTERSTITIAL');
            }, 800);
        }
        addBreadcrumb('process_week:success', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            triggerAd,
        });
        markWeekProcessingStage('success', syncedPlayerState, {
            status: 'success',
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
            elapsed_ms: Math.round(performance.now() - startedAt),
        });
        markTraceAction('process_week_completed', {
            last_screen: activePageName,
            flow: 'process_week',
            save_slot: currentSlot,
        });
        markGameCheckpoint('process_week_success', syncedPlayerState, {
            screen: activePage,
            trigger_ad: triggerAd,
            pending_events: syncedPlayerState.pendingEvents?.length || 0,
            active_releases: syncedPlayerState.activeReleases?.length || 0,
        });
        trackGameEvent('week_processed', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            pending_events: syncedPlayerState.pendingEvents?.length || 0,
            commitments: syncedPlayerState.commitments?.length || 0,
            active_releases: syncedPlayerState.activeReleases?.length || 0,
        });
    } catch (error) {
        console.error('Week processing failed:', error);
        const failurePresentation = describeWeekProcessingFailure(activeWeekStageRef.current, error);
        setPendingWeekProcessingFailure({
            age: player.age,
            week: player.currentWeek,
            ...failurePresentation,
        });
        markWeekProcessingStage('failed', player, {
            status: 'failed',
            run_id: weekRunId,
            screen: activePageName,
            save_slot: currentSlot,
            elapsed_ms: Math.round(performance.now() - startedAt),
            error,
        });
        markTraceAction('process_week_failed', {
            last_screen: activePageName,
            flow: 'process_week',
            save_slot: currentSlot,
        });
        recordFlowFailure(error, 'process_week', player, {
            screen: activePage,
            pending_events: player.pendingEvents?.length || 0,
            commitments: player.commitments?.length || 0,
            active_releases: player.activeReleases?.length || 0,
        });
        recordNonFatal(error, 'process_week_failed', {
            age: player.age,
            week: player.currentWeek,
            pending_events: player.pendingEvents?.length || 0,
            commitments: player.commitments?.length || 0,
            active_releases: player.activeReleases?.length || 0,
        });
        trackGameEvent('week_process_failed', {
            age: player.age,
            week: player.currentWeek,
        });
        setToastMessage({
            title: tr('app.feedback.weekProcessingFailedTitle'),
            subtext: tr('app.feedback.weekProcessingFailedSubtext')
        });
    } finally {
      lastWeekProcessSettledAtRef.current = Date.now();
      activeWeekRunIdRef.current = null;
      activeWeekStageRef.current = 'idle';
      weekProcessingLockRef.current = false;
      setIsProcessing(false);
      try {
        stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
      } catch (error) {
        recordNonFatal(error, 'process_week_trace_cleanup_failed', {
          age: player.age,
          week: player.currentWeek,
        });
      }
    }
  };

  const handleRetryFailedWeek = () => {
    setPendingWeekProcessingFailure(null);
    const cooldownLeft = Math.max(0, 510 - (Date.now() - lastWeekProcessSettledAtRef.current));
    window.setTimeout(() => void handleNextWeek(), cooldownLeft);
  };

  const handleExportFailedWeekBackup = async () => {
    if (isExportingWeekBackup) return;
    setIsExportingWeekBackup(true);
    try {
      await handleExportGameData({ skipCurrentSnapshot: true });
    } catch {
      // handleExportGameData already reports the actionable export error to the player.
    } finally {
      setIsExportingWeekBackup(false);
    }
  };

  const handlePressConferenceComplete = (statsDelta: any, buzzDelta: number, logMessage: string) => {
      if (!activePressEvent) return;
      const commitment = activePressEvent.project;
      handleGenericUpdate(prev => {
          const newStats = { ...prev.stats };
          if (statsDelta.fame) newStats.fame = Math.max(0, newStats.fame + statsDelta.fame);
          if (statsDelta.reputation) newStats.reputation = Math.max(0, Math.min(100, newStats.reputation + statsDelta.reputation));
          if (statsDelta.followers) newStats.followers = Math.max(0, newStats.followers + statsDelta.followers);
          const absoluteWeek = getAbsoluteWeek(prev.age, prev.currentWeek);
          const publicationId = `press_${commitment.id}_${absoluteWeek}`;
          const next: Player = {
              ...prev,
              stats: newStats,
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMessage, type: 'positive' }]
          };
          const promotion = applyProjectPromotionAttribution(next, {
              projectId: commitment.id,
              publicationId,
              channel: 'PRESS',
              promotionType: 'INTERVIEW',
              absoluteWeek,
              baseBuzzDelta: buzzDelta,
          });
          return {
              ...promotion.player,
              commitments: promotion.player.commitments.map(c => c.id === commitment.id ? {
                  ...c,
                  lastPressWeek: prev.currentWeek,
                  lastPressAbsolute: absoluteWeek,
              } : c),
          };
      });
      setActivePressEvent(null);
      setToastMessage({
          title: tr('app.feedback.pressTourCompleteTitle'),
          subtext: tr('app.feedback.pressTourCompleteSubtext')
      });
  };

  const handleSocialEventChoice = (option: any) => {
      if (!activeSocialEvent) return;
      handlePartnerAction(activeSocialEvent.partnerId, 'EVENT_RESOLUTION', option);
      setActiveSocialEvent(null);
  };

  const showRewardedAdFailure = (
      reason?: Parameters<typeof classifyRewardedAdFailure>[0],
      wellnessStepOneSaved = false,
  ) => {
      const kind = classifyRewardedAdFailure(reason);
      if (kind === 'BUSY') {
          setToastMessage({
              title: tr('app.ads.failure.busyTitle'),
              subtext: tr('app.ads.failure.busySubtext'),
          });
          return;
      }
      if (kind === 'DISMISSED') {
          setToastMessage({
              title: tr('app.ads.failure.dismissedTitle'),
              subtext: wellnessStepOneSaved
                  ? tr('app.ads.wellness.stepOneSavedDismissed')
                  : tr('app.ads.failure.dismissedSubtext'),
          });
          return;
      }
      if (kind === 'OFFLINE' || kind === 'NO_FILL') {
          setToastMessage({
              title: tr(kind === 'OFFLINE' ? 'app.ads.failure.offlineTitle' : 'app.ads.failure.noFillTitle'),
              subtext: wellnessStepOneSaved
                  ? tr('app.ads.wellness.stepOneSavedUnavailable')
                  : tr(kind === 'OFFLINE' ? 'app.ads.failure.offlineSubtext' : 'app.ads.failure.noFillSubtext'),
          });
          return;
      }
      setToastMessage({
          title: tr('app.ads.failure.unavailableTitle'),
          subtext: wellnessStepOneSaved
              ? tr('app.ads.wellness.stepOneSavedUnavailable')
              : tr('app.ads.failure.unavailableSubtext'),
      });
  };

  const receiptFromPersistenceError = (
      error: unknown,
  ): PendingRewardAdReceipt | null => (
      error instanceof RewardedAdPersistenceError && error.receipt
          ? error.receipt
          : null
  );

  // --- REWARDED AD SYSTEM ---
  const handleTriggerRewardAd = async (type: AdType, data?: any) => {
      if (type === 'INTERSTITIAL') return;
      if (type === 'REWARDED_BAILOUT' && (player.flags?.bailoutAdsUsedThisWeek || 0) >= 2) {
          setToastMessage({
              title: tr('app.rewards.bailoutLimitTitle'),
              subtext: tr('app.rewards.bailoutLimitSubtext')
          });
          return;
      }
      if (!currentSlot) {
          showRewardedAdFailure('UNAVAILABLE');
          return;
      }

      if (rewardAdFlowInFlightRef.current) {
          showRewardedAdFailure('BUSY');
          return;
      }

      if (type === 'REWARDED_STATS') {
          const nowMs = Date.now();
          const activeWellnessState = expireWellnessRewardAdState(wellnessRewardAd, nowMs);
          if (activeWellnessState !== wellnessRewardAd) {
              setWellnessRewardAd(activeWellnessState);
              setWellnessAdNowMs(nowMs);
              setToastMessage({
                  title: tr('app.ads.wellness.expiredTitle'),
                  subtext: tr('app.ads.wellness.expiredSubtext'),
              });
              return;
          }

          let pendingReceipt = readPendingRewardAd(nowMs);
          const receiptMatchesSession = !!pendingReceipt
              && pendingReceipt.id === activeWellnessState.sessionId
              && pendingReceipt.playerId === String(player.id || player.name)
              && pendingReceipt.saveSlot === currentSlot
              && pendingReceipt.type === 'REWARDED_STATS'
              && pendingReceipt.status === 'IN_PROGRESS';

          if (activeWellnessState.completedSteps === 1 && !receiptMatchesSession) {
              setWellnessRewardAd(createWellnessRewardAdState());
              showRewardedAdFailure('UNAVAILABLE');
              return;
          }

          if (activeWellnessState.completedSteps === 0) {
              if (pendingReceipt?.status === 'GRANTED') {
                  clearPendingRewardAd(pendingReceipt.id);
                  pendingReceipt = null;
              }
              if (pendingReceipt?.status === 'IN_PROGRESS' && pendingReceipt.completedSteps === 0) {
                  clearPendingRewardAd(pendingReceipt.id);
                  pendingReceipt = null;
              }
              if (pendingReceipt) {
                  setPendingRewardSaveRetry(pendingReceipt);
                  setToastMessage({
                      title: tr('app.ads.save.pendingTitle'),
                      subtext: tr('app.ads.save.pendingSubtext'),
                  });
                  return;
              }
              try {
                  pendingReceipt = beginPendingRewardAd({
                      playerId: String(player.id || player.name),
                      saveSlot: currentSlot,
                      type,
                      placement: 'STORE_REWARD',
                      contextId: `${currentSlot}:${type}`,
                      data,
                      stepsRequired: 2,
                      nowMs,
                  });
              } catch (error) {
                  recordNonFatal(error, 'reward_ad_session_persist_failed', {
                      reward_type: type,
                      save_slot: currentSlot,
                  });
                  setToastMessage({
                      title: tr('app.ads.save.unavailableTitle'),
                      subtext: tr('app.ads.save.unavailableSubtext'),
                  });
                  return;
              }
          }

          if (!pendingReceipt) {
              showRewardedAdFailure('UNAVAILABLE');
              return;
          }
          if (activeWellnessState.status === 'RETRY_AD_2') {
              try {
                  pendingReceipt = pausePendingRewardAdContinuation(pendingReceipt, nowMs);
              } catch (error) {
                  const pausedReceipt = receiptFromPersistenceError(error);
                  if (pausedReceipt) pendingReceipt = pausedReceipt;
                  recordNonFatal(error, 'reward_ad_continuation_pause_failed', {
                      reward_type: type,
                      save_slot: currentSlot,
                  });
              }
          }
          const attempt = beginWellnessAdAttempt({
              ...activeWellnessState,
              sessionId: pendingReceipt.id,
          }, nowMs);
          if (attempt.step === null || !attempt.state.attemptId) {
              showRewardedAdFailure('BUSY');
              return;
          }

          const step = attempt.step;
          const attemptId = attempt.state.attemptId;
          rewardAdFlowInFlightRef.current = true;
          setWellnessRewardAd(attempt.state);
          setWellnessAdNowMs(Date.now());
          setAdTotalSteps(2);
          setAdStep(step);
          setIsShowingAd(true);
          try {
              const result = await requestRewardedAd({
                  type,
                  placement: 'STORE_REWARD',
                  contextId: `${currentSlot}:${type}:${attempt.state.sessionId}:${step}`,
              });
              const settled = settleWellnessAdAttempt(attempt.state, attemptId, result, Date.now());
              setWellnessRewardAd(settled);
              setWellnessAdNowMs(Date.now());
              if (!result.success) {
                  if (step === 2 && settled.retryExpiresAt !== undefined) {
                      try {
                          pendingReceipt = setPendingRewardAdContinuationExpiry(
                              pendingReceipt,
                              settled.retryExpiresAt,
                              Date.now(),
                          );
                      } catch (error) {
                          const advancedReceipt = receiptFromPersistenceError(error);
                          if (advancedReceipt) pendingReceipt = advancedReceipt;
                          recordNonFatal(error, 'reward_ad_continuation_persist_failed', {
                              reward_type: type,
                              save_slot: currentSlot,
                          });
                      }
                  } else if (step === 1) {
                      clearPendingRewardAd(pendingReceipt.id);
                  }
                  showRewardedAdFailure(result.reason, step === 2);
                  return;
              }

              try {
                  pendingReceipt = recordPendingRewardAdStep(pendingReceipt, {
                      stepId: result.requestId,
                      stepNumber: step,
                      nowMs: Date.now(),
                  });
              } catch (error) {
                  const advancedReceipt = receiptFromPersistenceError(error);
                  if (!advancedReceipt) throw error;
                  pendingReceipt = advancedReceipt;
                  recordNonFatal(error, 'reward_ad_step_persist_failed', {
                      reward_type: type,
                      save_slot: currentSlot,
                      step,
                  });
              }

              if (step === 1) {
                  setToastMessage({
                      title: tr('app.ads.wellness.stepOneCompleteTitle'),
                      subtext: tr('app.ads.wellness.stepOneCompleteSubtext'),
                  });
                  return;
              }

              try {
                  pendingReceipt = markPendingRewardAdReady(pendingReceipt);
              } catch (error) {
                  const advancedReceipt = receiptFromPersistenceError(error);
                  if (!advancedReceipt) throw error;
                  pendingReceipt = advancedReceipt;
              }
              setIsShowingAd(false);
              await handleAdComplete(pendingReceipt);
          } catch (error) {
              console.error('Wellness rewarded-ad attempt failed:', error);
              const failedState = settleWellnessAdAttempt(
                  attempt.state,
                  attemptId,
                  { success: false, reason: 'ERROR', stage: 'COORDINATOR' },
                  Date.now(),
              );
              setWellnessRewardAd(failedState);
              setWellnessAdNowMs(Date.now());
              if (step === 1) clearPendingRewardAd(pendingReceipt.id);
              if (step === 2 && failedState.retryExpiresAt !== undefined) {
                  try {
                      setPendingRewardAdContinuationExpiry(pendingReceipt, failedState.retryExpiresAt);
                  } catch (persistenceError) {
                      recordNonFatal(persistenceError, 'reward_ad_continuation_persist_failed', {
                          reward_type: type,
                          save_slot: currentSlot,
                      });
                  }
              }
              showRewardedAdFailure('ERROR', step === 2);
          } finally {
              rewardAdFlowInFlightRef.current = false;
              setIsShowingAd(false);
          }
          return;
      }

      rewardAdFlowInFlightRef.current = true;
      let pendingReceipt: PendingRewardAdReceipt;
      try {
          pendingReceipt = beginPendingRewardAd({
              playerId: String(player.id || player.name),
              saveSlot: currentSlot,
              type,
              placement: type === 'REWARDED_BAILOUT' ? 'DEBT_BAILOUT' : 'STORE_REWARD',
              contextId: `${currentSlot}:${type}`,
              data,
              stepsRequired: 1,
          });
      } catch (error) {
          rewardAdFlowInFlightRef.current = false;
          recordNonFatal(error, 'reward_ad_session_persist_failed', {
              reward_type: type,
              save_slot: currentSlot,
          });
          setToastMessage({
              title: tr('app.ads.save.unavailableTitle'),
              subtext: tr('app.ads.save.unavailableSubtext'),
          });
          return;
      }
      setAdTotalSteps(1);
      setAdStep(1);
      setIsShowingAd(true);

      try {
          const result = await requestRewardedAd({
              type,
              placement: type === 'REWARDED_BAILOUT' ? 'DEBT_BAILOUT' : 'STORE_REWARD',
              contextId: `${currentSlot}:${type}:1`,
          });
          if (!result.success) {
              clearPendingRewardAd(pendingReceipt.id);
              showRewardedAdFailure(result.reason);
              return;
          }

          try {
              pendingReceipt = recordPendingRewardAdStep(pendingReceipt, {
                  stepId: result.requestId,
                  stepNumber: 1,
              });
              pendingReceipt = markPendingRewardAdReady(pendingReceipt);
          } catch (error) {
              const advancedReceipt = receiptFromPersistenceError(error);
              if (!advancedReceipt) throw error;
              pendingReceipt = advancedReceipt.completedSteps === advancedReceipt.stepsRequired
                  ? { ...advancedReceipt, status: 'READY_TO_GRANT', remainingStep: null }
                  : advancedReceipt;
              recordNonFatal(error, 'reward_ad_step_persist_failed', {
                  reward_type: type,
                  save_slot: currentSlot,
                  step: 1,
              });
          }
          setIsShowingAd(false);
          await handleAdComplete(pendingReceipt);
      } catch (error) {
          console.error('Rewarded-ad attempt failed:', error);
          clearPendingRewardAd(pendingReceipt.id);
          showRewardedAdFailure('ERROR');
      } finally {
          rewardAdFlowInFlightRef.current = false;
          setIsShowingAd(false);
      }
  };

  const getRewardedAdOutcomeSubtext = (outcome: RewardedAdGrantOutcome): string => {
      if (outcome.kind === 'CASH') return tr('app.rewards.cashSubtext');
      if (outcome.kind === 'BAILOUT') return tr('app.rewards.bailoutSubtext', { amount: outcome.amount.toLocaleString() });
      if (outcome.kind === 'ENERGY') return tr('app.rewards.energySubtext', { amount: String(outcome.amount) });
      if (outcome.kind === 'WELLNESS') return tr('app.rewards.wellnessSubtext');
      if (outcome.kind === 'SKILL') return tr('app.rewards.skillSubtext', { amount: String(outcome.amount), skill: outcome.skill });
      return tr('app.rewards.genreSubtext', { amount: String(outcome.amount), genre: outcome.genre });
  };

  const handleAdComplete = async (receipt: PendingRewardAdReceipt) => {
      if (rewardAdGrantInFlightRef.current.has(receipt.id)) return;
      if (receipt.playerId !== String(playerRef.current.id || playerRef.current.name)) return;

      rewardAdGrantInFlightRef.current.add(receipt.id);
      setPendingRewardSaveRetry(receipt);
      setIsRetryingRewardSave(true);
      try {
          const result = await runRewardedAdGrantTransaction({
              receipt,
              player: playerRef.current,
              persist: candidate => persistSlotSave(receipt.saveSlot, candidate, {
                  rethrow: true,
                  reason: 'AUTOSAVE',
              }),
          });

          if (result.status === 'SAVE_FAILED') {
              setPendingRewardSaveRetry(result.receipt);
              setToastMessage({
                  title: tr('app.ads.save.failedTitle'),
                  subtext: tr('app.ads.save.failedSubtext'),
              });
              recordNonFatal(result.error, 'reward_ad_grant_persist_failed', {
                  reward_type: receipt.type,
                  save_slot: receipt.saveSlot,
                  grant_attempts: result.receipt.grantAttempts,
              });
              return;
          }
          if (result.status === 'NOT_READY') return;

          playerRef.current = result.player;
          setPlayer(result.player);
          setSaveSlots(previous => ({ ...previous, [receipt.saveSlot]: result.player }));
          if (receipt.type === 'REWARDED_BAILOUT' && result.player.money >= 0) {
              setShowDebtModal(false);
          }
          if (receipt.type === 'REWARDED_STATS') {
              setWellnessRewardAd(createWellnessRewardAdState());
              setWellnessAdNowMs(Date.now());
          }
          trackGameEvent('reward_ad_persisted', {
              reward_type: receipt.type,
              reward_session_id: receipt.id,
              status: result.status,
              grant_attempts: result.receipt.grantAttempts,
          });
          clearPendingRewardAd(receipt.id);
          setPendingRewardSaveRetry(null);
          setToastMessage({
              title: result.status === 'ALREADY_GRANTED'
                  ? tr('app.ads.save.recoveredTitle')
                  : tr('app.rewards.receivedTitle'),
              subtext: result.outcome
                  ? getRewardedAdOutcomeSubtext(result.outcome)
                  : tr('app.ads.save.recoveredSubtext'),
          });
      } finally {
          rewardAdGrantInFlightRef.current.delete(receipt.id);
          setIsRetryingRewardSave(false);
      }
  };

  const handleRetryPendingRewardSave = async () => {
      const receipt = readPendingRewardAd() || pendingRewardSaveRetry;
      if (!receipt) {
          setPendingRewardSaveRetry(null);
          return;
      }
      await handleAdComplete(receipt);
  };

  useEffect(() => {
      if (gameStatus !== 'PLAYING' || !currentSlot || isShowingAd) return;
      const pendingReceipt = readPendingRewardAd();
      if (!pendingReceipt) return;
      if (rewardAdGrantInFlightRef.current.has(pendingReceipt.id)) return;
      if (pendingReceipt.playerId !== String(player.id || player.name) || pendingReceipt.saveSlot !== currentSlot) {
          return;
      }
      if (pendingReceipt.status === 'GRANTED') {
          clearPendingRewardAd(pendingReceipt.id);
          return;
      }
      if (
          pendingReceipt.placement === 'LIFE_EVENT_OPTION'
          || pendingReceipt.placement === 'PRODUCTION_CRISIS_OPTION'
      ) {
          const persistedGrantIds = player.flags?.grantedRewardAdIds;
          if (Array.isArray(persistedGrantIds) && persistedGrantIds.includes(pendingReceipt.id)) {
              clearPendingRewardAd(pendingReceipt.id);
          }
          // Storyline receipts are consumed only by their matching modal and must
          // never be interpreted as the cash bailout reward that shares their ad type.
          return;
      }
      if (
          (pendingReceipt.status === 'READY_TO_GRANT' || pendingReceipt.status === 'VERIFIED_SAVE')
          && pendingReceipt.completedSteps === pendingReceipt.stepsRequired
      ) {
          trackGameEvent('reward_ad_recovered', {
              reward_type: pendingReceipt.type,
              completed_steps: pendingReceipt.completedSteps,
          });
          void handleAdComplete(pendingReceipt);
          return;
      }
      if (pendingReceipt.type === 'REWARDED_STATS' && pendingReceipt.completedSteps === 1) {
          setWellnessRewardAd(restoreWellnessRewardAdState(pendingReceipt, Date.now()));
          setWellnessAdNowMs(Date.now());
          trackGameEvent('reward_ad_resumed', {
              reward_type: pendingReceipt.type,
              completed_steps: pendingReceipt.completedSteps,
              remaining_step: pendingReceipt.remainingStep,
              reward_session_id: pendingReceipt.id,
          });
          return;
      }

      trackGameEvent('reward_ad_interrupted', {
          reward_type: pendingReceipt.type,
          completed_steps: pendingReceipt.completedSteps,
          required_steps: pendingReceipt.stepsRequired,
      });
      clearPendingRewardAd(pendingReceipt.id);
  }, [currentSlot, gameStatus, isShowingAd, player.id, player.name]);

  const handlePremiumPurchase = async (productId: PremiumProductId) => {
      const result = await purchasePremiumProduct(productId);
      if (!result.success) {
          setToastMessage({
              title: result.cancelled ? tr('app.purchases.cancelledTitle') : tr('app.purchases.failedTitle'),
              subtext: result.message
          });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          if (hasProcessedStoreTransaction(p, result.transactionId)) {
              setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: result.message });
              return p;
          }
          markProcessedStoreTransaction(p, result.transactionId);
          const message = applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: message });
          return p;
      });

      if (isNonConsumablePremiumProduct(productId)) {
          void syncPermanentPremiumEntitlementsToSavedSlots([productId]);
      }
  };

	  const handleBuyLifestyleItem = (item: any) => {
      handleGenericUpdate(p => {
          const nextPlayer = {
              ...p,
              money: p.money - item.price,
              assets: [...p.assets, item.id],
              customItems: item.id.includes('_cust_') ? [...p.customItems, item as any] : p.customItems,
              assetStates: [
                  ...(p.assetStates || []).filter(state => state.assetId !== item.id),
                  { assetId: item.id, condition: 100, currentValue: item.price, valueTrend: 0, rentDemand: 0, vacancyChance: 0, vacancyWeeks: 0, rentalListed: false, weeklyRent: 0, lifetimeRevenue: 0, listedWeek: 0, lastMaintainedWeek: 0 },
              ],
          };

          const premiumCollection = getRequiredPremiumProductForAsset(item.id);
          let logMessage = tr('app.generated.lifestyle.defaultLog', { itemName: item.name });

          if (premiumCollection === 'bundle_luxury_homes') {
              nextPlayer.news = [{
                  id: `news_home_buy_${Date.now()}`,
                  headline: tr('app.generated.lifestyle.homeNewsHeadline', { name: nextPlayer.name, itemName: item.name }),
                  subtext: tr('app.generated.lifestyle.homeNewsSubtext'),
                  category: 'TOP_STORY' as const,
                  week: nextPlayer.currentWeek,
                  year: nextPlayer.age,
                  impactLevel: 'MEDIUM' as const,
              }, ...nextPlayer.news].slice(0, 50);
              nextPlayer.x.feed = [{
                  id: `x_home_buy_${Date.now()}`,
                  authorId: 'x_home_buy',
                  authorName: 'RealEstateWire',
                  authorHandle: '@realestatewire',
                  authorAvatar: getGenderedAvatar('NON_BINARY', 'RealEstateWire'),
                  content: tr('app.generated.lifestyle.homeSocial', { name: nextPlayer.name, itemName: item.name }),
                  timestamp: Date.now(),
                  likes: 12000,
                  retweets: 1800,
                  replies: 400,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = tr('app.generated.lifestyle.homeLog', { itemName: item.name });
          } else if (premiumCollection === 'bundle_elite_vehicles') {
              nextPlayer.x.feed = [{
                  id: `x_vehicle_buy_${Date.now()}`,
                  authorId: 'x_vehicle_buy',
                  authorName: 'GarageWatch',
                  authorHandle: '@garagewatch',
                  authorAvatar: getGenderedAvatar('NON_BINARY', 'GarageWatch'),
                  content: tr('app.generated.lifestyle.vehicleSocial', { name: nextPlayer.name, itemName: item.name }),
                  timestamp: Date.now(),
                  likes: 15000,
                  retweets: 2300,
                  replies: 520,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = tr('app.generated.lifestyle.vehicleLog', { itemName: item.name });
          } else if (premiumCollection === 'bundle_sky_sea') {
              nextPlayer.news = [{
                  id: `news_skysea_buy_${Date.now()}`,
                  headline: tr('app.generated.lifestyle.skySeaNewsHeadline', { name: nextPlayer.name, itemName: item.name }),
                  subtext: tr('app.generated.lifestyle.skySeaNewsSubtext'),
                  category: 'TOP_STORY' as const,
                  week: nextPlayer.currentWeek,
                  year: nextPlayer.age,
                  impactLevel: 'MEDIUM' as const,
              }, ...nextPlayer.news].slice(0, 50);
              logMessage = tr('app.generated.lifestyle.skySeaLog', { itemName: item.name });
          } else if (premiumCollection === 'bundle_ultimate_lifestyle') {
              nextPlayer.x.feed = [{
                  id: `x_lifestyle_buy_${Date.now()}`,
                  authorId: 'x_lifestyle_buy',
                  authorName: 'Style Radar',
                  authorHandle: '@styleradar',
                  authorAvatar: getGenderedAvatar('NON_BINARY', 'StyleRadar'),
                  content: tr('app.generated.lifestyle.ultimateSocial', { name: nextPlayer.name, itemName: item.name }),
                  timestamp: Date.now(),
                  likes: 18000,
                  retweets: 2600,
                  replies: 700,
                  isPlayer: false,
                  isLiked: false,
                  isRetweeted: false,
                  isVerified: true,
              }, ...nextPlayer.x.feed].slice(0, 50);
              logMessage = tr('app.generated.lifestyle.ultimateLog', { itemName: item.name });
          }

          nextPlayer.logs = [...nextPlayer.logs, { week: nextPlayer.currentWeek, year: nextPlayer.age, message: logMessage, type: 'positive' as const }].slice(-50);
          return nextPlayer;
	      });
	  };

	  const handleSellLifestyleItem = (id: string) => {
	      handleGenericUpdate(p => {
	          const allMarketItems = [...PROPERTY_CATALOG, ...CAR_CATALOG, ...MOTORCYCLE_CATALOG, ...BOAT_CATALOG, ...AIRCRAFT_CATALOG, ...CLOTHING_CATALOG];
	          const item = p.customItems.find(customItem => customItem.id === id) || allMarketItems.find(marketItem => marketItem.id === id);
              const state = (p.assetStates || []).find(assetState => assetState.assetId === id);
	          /* This paid half of a value that was itself floored at the purchase
	             price, so a sale could never reflect the market in either
	             direction. A property now sells for what the market says it is
	             worth less the cost of selling into that cycle — the same quote
	             the button shows, so the number offered and the number paid
	             cannot disagree. Everything else still sells at half, which is
	             what a used car is worth. */
	          const saleValue = !item
	              ? 0
	              : item.type === 'Property'
	                  ? quoteRealEstateSale(item, state, p).saleProceeds
	                  : Math.floor(item.price * 0.5);
	          return {
	              ...p,
	              money: p.money + saleValue,
	              assets: p.assets.filter(assetId => assetId !== id),
	              customItems: p.customItems.filter(customItem => customItem.id !== id),
	              assetStates: (p.assetStates || []).filter(state => state.assetId !== id),
	              residenceId: p.residenceId === id ? null : p.residenceId,
	              activeVehicleId: p.activeVehicleId === id ? null : p.activeVehicleId,
	          };
	      });
	  };

	  const handleRestorePurchases = async () => {
      const result = await restorePremiumPurchases();
      if (!result.success) {
          setToastMessage({ title: tr('app.purchases.restoreFailedTitle'), subtext: result.message });
          return;
      }

      const restoredPermanentProductIds = uniquePermanentPremiumIds(result.restoredProductIds);
      if (restoredPermanentProductIds.length === 0) {
          setToastMessage({ title: tr('app.purchases.nothingToRestoreTitle'), subtext: result.message });
          return;
      }
      const entitlementProductIds = rememberPremiumEntitlements(restoredPermanentProductIds);

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          entitlementProductIds.forEach(productId => {
              applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          });
          setToastMessage({
              title: tr('app.purchases.restoredTitle'),
              subtext: tr('app.purchases.restoredSubtext', { count: restoredPermanentProductIds.length.toString() })
          });
          return p;
      });
      void syncPermanentPremiumEntitlementsToSavedSlots(entitlementProductIds);
  };

  // --- HANDLERS ---
  const handleStartGame = (name: string, age: number, gender: any, avatar: string, handle: string, slotOverride?: number) => {
      const parentRelationships = INITIAL_PLAYER.relationships.map((rel, index) => ({
          ...rel,
          age: age + (index === 0 ? 28 : 31),
      }));
      const newPlayer = {
          ...INITIAL_PLAYER,
          name,
          age,
          gender,
          avatar,
	          flags: {
	              ...(INITIAL_PLAYER.flags || {}),
	              newPlayerTutorial: buildAvailableNewPlayerTutorialState(),
	          },
	          logs: INITIAL_PLAYER.logs.map(log => ({ ...log, year: age })),
	          relationships: parentRelationships,
          // Set specific handle for all platforms
          instagram: { ...INITIAL_PLAYER.instagram, handle: handle },
          x: { ...INITIAL_PLAYER.x, handle: handle, followers: 0 },
          youtube: { ...INITIAL_PLAYER.youtube, handle: handle }
      };
      const migratedNewPlayer = migratePlayerSave(newPlayer);
      const entitledNewPlayer = applyPremiumEntitlementsToPlayer(migratedNewPlayer, readStoredPremiumEntitlements()).player;
      const targetSlot = slotOverride ?? currentSlot;
      if (targetSlot) {
          setSaveSlots(prev => ({ ...prev, [targetSlot]: entitledNewPlayer }));
      }
      setPlayer(entitledNewPlayer);
      setActivePage(Page.HOME);
      setGameStatus('PLAYING');
  };

  const handleStartGameFromIntro = (data: NewCareerData, slot: number) => {
      startupBackgroundScheduler.cancelPending();
      const name = data.stageName.trim() || 'Rising Star';
      const introGender = data.gender === 'Female' ? 'FEMALE' : data.gender === 'Non-Binary' ? 'NON_BINARY' : 'MALE';
      const rawHandle = data.handle.trim() || name.toLowerCase().replace(/\s+/g, '');
      const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
      const avatar = data.avatarDataUrl || getGenderedAvatar(introGender as any, `${name}-${data.presetIndex}`);
      setCurrentSlot(slot);
      handleStartGame(name, data.age, introGender, avatar, handle, slot);
  };

  const handleOpenDeathSummaryPreview = () => {
      setDeathScreenPreviewPlayer(clone(player));
  };

  const handleUpdateTutorialState = (state: NewPlayerTutorialState) => {
      handleGenericUpdate(prev => writeNewPlayerTutorialState(prev, state));
  };

  const handleContinueAsChild = (child: any) => {
      const inheritancePreview = getLegacyInheritancePreview(player);
      const inheritedRelationships: Relationship[] = [];
      player.relationships.forEach(rel => {
          if (rel.id === child.id) return; // Skip self
          if (rel.relation === 'Spouse' || rel.relation === 'Partner') {
              inheritedRelationships.push({ ...rel, relation: 'Parent' });
          } else if (rel.relation === 'Child') {
              inheritedRelationships.push({ ...rel, relation: 'Sibling' });
          }
      });
      const childAge = getRelationshipAge(child, player.age, player.currentWeek);
      const yearsToSkip = Math.max(0, LEGACY_MIN_PLAYABLE_AGE - childAge);
      const playableChildAge = Math.max(childAge, LEGACY_MIN_PLAYABLE_AGE);
      const legacyInheritance = buildLegacyStudioInheritance(player, {
          isDeceased: !!player.flags?.isDead,
          heirAge: playableChildAge,
          heirWeek: player.currentWeek,
      });

      // Add the current player as a parent
      inheritedRelationships.push({
          id: legacyInheritance.parentActor.id,
          npcId: legacyInheritance.parentActor.id,
          name: legacyInheritance.parentActor.name,
          relation: player.flags.isDead ? 'Deceased Parent' as any : 'Parent',
          closeness: 100,
          age: player.age,
          gender: player.gender,
          image: player.avatar,
          lastInteractionWeek: player.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(player.age, player.currentWeek)
      });

      const advancedRelationships = inheritedRelationships.map(rel => ({
          ...rel,
          age: typeof rel.age === 'number' ? rel.age + yearsToSkip : rel.age,
      }));
      const inheritedSkills = inheritActorSkills(player.stats.skills, 0.35);
      const inheritedGenreXP = Object.fromEntries(
          Object.entries(player.stats.genreXP).map(([genre, xp]) => [genre, Math.floor((xp as number) * 0.15)])
      ) as Record<string, number>;
      const inheritedWriterStats = player.writerStats
          ? {
                creativity: Math.floor(player.writerStats.creativity * 0.2),
                dialogue: Math.floor(player.writerStats.dialogue * 0.2),
                structure: Math.floor(player.writerStats.structure * 0.2),
                pacing: Math.floor(player.writerStats.pacing * 0.2),
            }
          : INITIAL_PLAYER.writerStats;
      const inheritedDirectorStats = player.directorStats
          ? {
                vision: Math.floor(player.directorStats.vision * 0.2),
                technical: Math.floor(player.directorStats.technical * 0.2),
                leadership: Math.floor(player.directorStats.leadership * 0.2),
                style: Math.floor(player.directorStats.style * 0.2),
            }
          : INITIAL_PLAYER.directorStats;
      const childHandle = `@${child.name.replace(/\s+/g, '_').toLowerCase()}`;

      const newPlayer: Player = {
          ...INITIAL_PLAYER,
          id: `player_${Date.now()}`,
          name: child.name,
          age: playableChildAge,
          currentWeek: player.currentWeek,
          gender: child.gender || player.gender,
          avatar: child.image || INITIAL_PLAYER.avatar,
          money: inheritancePreview.inheritedMoney,
          assets: [...player.assets],
          customItems: clone(player.customItems),
          assetStates: clone(player.assetStates || []),
          residenceId: player.residenceId,
          activeVehicleId: player.activeVehicleId,
          businesses: legacyInheritance.businesses,
          studio: legacyInheritance.studio,
          commitments: legacyInheritance.commitments,
          activeReleases: legacyInheritance.activeReleases,
          stocks: clone(player.stocks),
          portfolio: clone(inheritancePreview.inheritedPortfolio),
          world: legacyInheritance.world || INITIAL_PLAYER.world,
          ownedStreamingPlatform: handoffOwnedStreamingPlatformToHeir(
              player,
              child,
              playableChildAge,
              player.currentWeek,
          ),
          relationships: advancedRelationships,
          flags: {
              ...(INITIAL_PLAYER.flags || {}),
              ...legacyInheritance.flags,
          },
          stats: {
              ...INITIAL_PLAYER.stats,
              health: Math.max(65, Math.floor(player.stats.health * 0.75)),
              happiness: Math.max(60, Math.floor(player.stats.happiness * 0.7)),
              fame: Math.floor(player.stats.fame * 0.2),
              reputation: Math.floor(player.stats.reputation * 0.3),
              talent: Math.floor(player.stats.talent * 0.45),
              looks: Math.max(35, Math.floor(player.stats.looks * 0.6)),
              body: Math.max(35, Math.floor(player.stats.body * 0.6)),
              followers: Math.floor(player.stats.followers * 0.12),
              skills: inheritedSkills,
              genreXP: inheritedGenreXP,
          },
          writerStats: inheritedWriterStats,
          directorStats: inheritedDirectorStats,
          instagram: { ...INITIAL_PLAYER.instagram, handle: childHandle },
          x: {
              ...INITIAL_PLAYER.x,
              handle: childHandle,
              followers: Math.floor(player.stats.followers * 0.04),
              feed: [
                  {
                      id: `x_legacy_handoff_${Date.now()}`,
                      authorId: 'npc_hollywoodlineage',
                      authorName: 'Hollywood Lineage',
                      authorHandle: '@HollywoodLineage',
                      authorAvatar: 'https://api.dicebear.com/8.x/avataaars/svg?seed=HollywoodLineage',
                      content: `${child.name} takes control of ${legacyInheritance.parentActor.name}'s studio legacy. The family name now has to prove it can survive another generation.`,
                      timestamp: Date.now(),
                      likes: Math.max(1200, Math.floor((player.stats.followers || 0) * 0.03)),
                      retweets: Math.max(220, Math.floor((player.stats.followers || 0) * 0.006)),
                      replies: Math.max(80, Math.floor((player.stats.followers || 0) * 0.002)),
                      isPlayer: false,
                      isLiked: false,
                      isRetweeted: false,
                      isVerified: true,
                      postType: 'CAREER',
                      sentiment: 'INDUSTRY'
                  },
                  ...(INITIAL_PLAYER.x.feed || [])
              ]
          },
          youtube: { ...INITIAL_PLAYER.youtube, handle: childHandle },
          news: [
              {
                  id: `news_legacy_handoff_${Date.now()}`,
                  headline: `${child.name} inherits ${legacyInheritance.parentActor.name}'s studio empire`,
                  subtext: legacyInheritance.legacyParent.projectCount > 0
                      ? `The production house catalog and connected franchises remain under family control, but the new heir must build a career of their own.`
                      : `The family studio passes to a new generation, setting up a fresh career under an old Hollywood name.`,
                  category: 'INDUSTRY',
                  week: player.currentWeek,
                  year: player.age,
                  impactLevel: legacyInheritance.legacyParent.projectCount > 0 ? 'HIGH' : 'MEDIUM'
              },
              ...(INITIAL_PLAYER.news || [])
          ],
          bloodline: [
              ...(player.bloodline || []),
              createBloodlineSnapshot(player)
          ]
      };

      if (yearsToSkip > 0) {
          newPlayer.logs = [
              ...newPlayer.logs,
              {
                  week: newPlayer.currentWeek,
                  year: newPlayer.age,
	                  message: tr('app.legacy.heirTooYoungLog', { name: child.name, age: LEGACY_MIN_PLAYABLE_AGE }),
                  type: 'neutral' as const
              }
          ].slice(-50);
      }
      if (inheritancePreview.moneyTaxPaid > 0 || inheritancePreview.sharesTaxPaid > 0) {
          newPlayer.logs = [
              ...newPlayer.logs,
              {
                  week: newPlayer.currentWeek,
                  year: newPlayer.age,
	                  message: tr('app.legacy.inheritanceTaxLog', {
	                      money: inheritancePreview.moneyTaxPaid.toLocaleString(),
	                      shares: inheritancePreview.sharesTaxPaid.toLocaleString()
	                  }),
                  type: 'neutral' as const
              }
          ].slice(-50);
      }
      const migratedChildPlayer = migratePlayerSave(newPlayer);
      syncCurrentSlotSnapshot(migratedChildPlayer);
      setPlayer(migratedChildPlayer);
      setGameStatus('PLAYING');
      setActivePage(Page.HOME);
  };


  const handleEventComplete = (updatedPlayer: Player) => {
      setPlayer({ ...updatedPlayer, pendingEvent: null });
  };

  const resolveQueuedEventSafely = (
      sourcePlayer: Player,
      updatedPlayer: Player,
      resolvedEventId: string | undefined,
      log: string,
      logType: 'positive' | 'negative' | 'neutral' = 'neutral'
  ) => {
      try {
          const sourceQueue = Array.isArray(sourcePlayer.pendingEvents) ? sourcePlayer.pendingEvents : [];
          const updatedQueue = Array.isArray(updatedPlayer.pendingEvents) ? updatedPlayer.pendingEvents : sourceQueue;
          const queueToFilter = sourceQueue.length > 0 ? sourceQueue : updatedQueue;
          const newPendingEvents = resolvedEventId
              ? queueToFilter.filter(event => event?.id !== resolvedEventId)
              : queueToFilter.slice(1);
          const nextLogs = [
              {
                  week: updatedPlayer.currentWeek ?? sourcePlayer.currentWeek,
                  year: updatedPlayer.age ?? sourcePlayer.age,
                  message: log || tr('app.eventRecovery.resolvedLog'),
                  type: logType
              },
              ...(updatedPlayer.logs || sourcePlayer.logs || [])
          ].slice(0, 50);

          handleUpdatePlayer({
              ...updatedPlayer,
              pendingEvents: newPendingEvents,
              logs: nextLogs
          });
      } catch (error) {
          console.error('Queued event resolution failed:', error);
          setToastMessage({
              title: tr('app.eventRecovery.toastTitle'),
              subtext: tr('app.eventRecovery.toastSubtext')
          });
          throw error;
      }
  };

  const resolveProductionCrisisTransactionally = async (
      event: ScheduledEvent,
      choiceIndex: number,
      rewardReceiptId?: string,
  ): Promise<void> => {
      if (!currentSlot) throw new Error('A save slot is required to resolve a production event.');
      const sourcePlayer = playerRef.current;
      try {
          const { updatedPlayer, log } = applyCrisisImpact(sourcePlayer, event, choiceIndex);
          const sourceQueue = Array.isArray(sourcePlayer.pendingEvents) ? sourcePlayer.pendingEvents : [];
          const updatedQueue = Array.isArray(updatedPlayer.pendingEvents) ? updatedPlayer.pendingEvents : sourceQueue;
          const queueToFilter = sourceQueue.length > 0 ? sourceQueue : updatedQueue;
          const nextLogs = [{
              week: updatedPlayer.currentWeek ?? sourcePlayer.currentWeek,
              year: updatedPlayer.age ?? sourcePlayer.age,
              message: log || tr('app.eventRecovery.resolvedLog'),
              type: 'neutral' as const,
          }, ...(updatedPlayer.logs || sourcePlayer.logs || [])].slice(0, 50);
          const unresolvedCandidate: Player = {
              ...updatedPlayer,
              pendingEvents: queueToFilter.filter(queuedEvent => queuedEvent?.id !== event.id),
              logs: nextLogs,
          };
          const candidate = rewardReceiptId
              ? attachRewardedAdGrantProof(unresolvedCandidate, rewardReceiptId)
              : unresolvedCandidate;
          const persisted = await persistSlotSave(currentSlot, candidate, {
              rethrow: true,
              reason: 'AUTOSAVE',
          });
          const committedPlayer = prepareExternalPlayerUpdateForUi(persisted);
          playerRef.current = committedPlayer;
          suppressNextAutosaveRef.current = true;
          setSaveSlots(previous => ({ ...previous, [currentSlot]: committedPlayer }));
          setPlayer(committedPlayer);
          trackGameEvent('production_crisis_resolution_committed', {
              event_id: event.id,
              choice_index: choiceIndex,
              reward_session_id: rewardReceiptId || 'NONE',
          });
          if (rewardReceiptId) {
              trackGameEvent('reward_ad_persisted', {
                  placement: 'PRODUCTION_CRISIS_OPTION',
                  reward_session_id: rewardReceiptId,
              });
          }
      } catch (error) {
          recordNonFatal(error, 'production_crisis_resolution_save_failed', {
              event_id: event.id,
              choice_index: choiceIndex,
              reward_session_id: rewardReceiptId || 'NONE',
          });
          throw error;
      }
  };

  const resolveLifeEventTransactionally = async (
      event: ScheduledEvent,
      choice: LifeEventChoiceCommit,
  ): Promise<void> => {
      if (!currentSlot) throw new Error('A save slot is required to resolve a life event.');
      const sourcePlayer = playerRef.current;
      try {
          const result = await commitLifeEventResolutionTransaction({
              sourcePlayer,
              proposedPlayer: choice.rewardReceiptId
                  ? attachRewardedAdGrantProof(choice.updatedPlayer, choice.rewardReceiptId)
                  : choice.updatedPlayer,
              event,
              optionId: choice.optionId,
              impactId: choice.impactId,
              resolutionSeed: choice.resolutionSeed,
              resolutionKind: choice.resolutionKind,
              log: choice.log,
              persist: candidate => persistSlotSave(currentSlot, candidate, {
                  rethrow: true,
                  reason: 'LIFE_EVENT_RESOLUTION',
              }),
          });
          const committedPlayer = prepareExternalPlayerUpdateForUi(result.player);
          playerRef.current = committedPlayer;
          suppressNextAutosaveRef.current = true;
          setSaveSlots(prev => ({ ...prev, [currentSlot]: committedPlayer }));
          setPlayer(committedPlayer);
          trackGameEvent('life_event_resolution_committed', {
              event_id: event.id,
              option_id: choice.optionId,
              impact_id: choice.impactId || 'NONE',
              resolution_kind: choice.resolutionKind,
              duplicate_prevented: result.status === 'ALREADY_COMMITTED',
          });
          if (choice.rewardReceiptId) {
              trackGameEvent('reward_ad_persisted', {
                  placement: 'LIFE_EVENT_OPTION',
                  reward_session_id: choice.rewardReceiptId,
                  duplicate_prevented: result.status === 'ALREADY_COMMITTED',
              });
          }
      } catch (error) {
          recordNonFatal(error, 'life_event_resolution_save_failed', {
              event_id: event.id,
              option_id: choice.optionId,
              impact_id: choice.impactId || 'NONE',
              resolution_kind: choice.resolutionKind,
          });
          throw error;
      }
  };

  const openStockControlAcquisitionDesk = (event: ScheduledEvent) => {
      const relatedStudioId = event?.data?.relatedStudioId;
      const companyName = event?.data?.companyName || tr('app.stockControl.defaultStudio');
      if (!relatedStudioId) {
          setToastMessage({
              title: tr('app.stockControl.acquisitionUnavailableTitle'),
              subtext: tr('app.stockControl.acquisitionUnavailableSubtext')
          });
          return;
      }
      resolveQueuedEventSafely(
          player,
          player,
          event.id,
          tr('app.stockControl.acquisitionMovedLog', { companyName }),
          'positive'
      );
      setInitialForbesStudioId(relatedStudioId);
      setActivePage(Page.MOBILE);
      setToastMessage({
          title: tr('app.stockControl.openingAcquisitionTitle'),
          subtext: tr('app.stockControl.openingAcquisitionSubtext', { companyName })
      });
  };

  const openStockControlReview = (event: ScheduledEvent) => {
      const stockId = event?.data?.stockId;
      const companyName = event?.data?.companyName || tr('app.stockControl.defaultStock');
      if (!stockId) {
          setToastMessage({
              title: tr('app.stockControl.stockUnavailableTitle'),
              subtext: tr('app.stockControl.stockUnavailableSubtext')
          });
          return;
      }
      resolveQueuedEventSafely(
          player,
          player,
          event.id,
          tr('app.stockControl.reviewMovedLog', { companyName }),
          'neutral'
      );
      setInitialMobileStockId(stockId);
      setActivePage(Page.MOBILE);
      setToastMessage({
          title: tr('app.stockControl.openingStocksTitle'),
          subtext: tr('app.stockControl.openingStocksSubtext', { companyName })
      });
  };

  const handleRestartCareer = async () => {
    if (currentSlot) {
        await deleteVerifiedGameData(`actorEmpireSave_${currentSlot}`);
        verifiedCheckpointSlotsRef.current.delete(currentSlot);
        setSaveSlots(prev => ({ ...prev, [currentSlot]: null }));
        setPlayer(INITIAL_PLAYER);
        setGameStatus('CREATION');
        setShowDebtModal(false);
    }
  };

  const handleQuitJob = (id: string) => handleGenericUpdate(p => {
      const previousCommitments = p.commitments;
      const next: Player = {
          ...p,
          commitments: p.commitments.filter(c => c.id !== id),
          logs: [...p.logs, { week: p.currentWeek, year: p.age, message: "Quit job.", type: 'neutral' }]
      };
      syncWeeklyEnergyForCommitments(next, previousCommitments);
      return next;
  });

  const handleTradeStock = (stockId: string, amount: number) => {
      handleGenericUpdate(p => {
          const result = executeStockTrade(p, stockId, amount);
          return result.success ? result.player : p;
      });
  };

  const handleNavigateToPage = (page: Page) => {
      setActivePage(page);
  };

  if (isStartupLoadingVisible) {
      const startupPresentation = getStartupPresentation(startupState, {
          takingLonger: startupTakingLonger,
      });
      const showStudioBumper = !startupStudioBumperElapsed;
      return (
          <div className="relative h-screen overflow-hidden bg-[#050505] text-white">
              <ActorEmpireIntroStyle />
              {showStudioBumper ? (
                  <ZedburyStudiosIntro state={startupStudioBumperExiting ? 'on exit' : 'on'} />
              ) : (
                  <ActorEmpireLoadingScreen
                      progress={startupState.outcome === 'READY' ? 100 : startupState.progress}
                      status={startupPresentation.status}
                      supportingMessage={startupPresentation.supportingMessage}
                      errorTitle={startupPresentation.failure?.title}
                      error={startupPresentation.failure?.message}
                      primaryActionLabel={startupPresentation.failure?.primaryActionLabel}
                      secondaryActionLabel={startupPresentation.failure?.secondaryActionLabel}
                      onPrimaryAction={startupState.failure ? () => {
                          if (startupState.failure?.taskId === 'HOME_SCREEN') {
                              // Browsers cache failed module imports for this document. A fresh
                              // document is required to retry screen code without touching saves.
                              window.location.reload();
                          } else {
                              void runStartupInitialization(startupState.failure.taskId);
                          }
                      } : undefined}
                      onSecondaryAction={startupPresentation.failure ? () => window.location.reload() : undefined}
                      isPrimaryActionBusy={isStartupRetrying}
                  />
              )}
          </div>
      );
  }

  if (careerOpening) {
      return (
          <div className="h-screen overflow-hidden bg-[#040404] text-white">
              <ActorEmpireIntroStyle />
              <ActorEmpireCareerOpeningScreen {...careerOpening} />
          </div>
      );
  }

  if (gameStatus === 'DEATH_SCREEN') {
      return (
              <DeathScreen
                  player={player}
                  onContinueAsChild={handleContinueAsChild}
                  onStartNewGame={handleRestartCareer}
              />
      );
  }

  if (deathScreenPreviewPlayer) {
      return (
              <DeathScreen
                  player={deathScreenPreviewPlayer}
                  onContinueAsChild={() => setDeathScreenPreviewPlayer(null)}
                  onStartNewGame={() => setDeathScreenPreviewPlayer(null)}
                  isPreview
                  onClosePreview={() => setDeathScreenPreviewPlayer(null)}
              />
      );
  }

  const performanceCapabilities = resolvePerformanceCapabilities({
      profile: adaptivePerformance.appliedLevel,
      preserveImageQuality: adaptivePerformancePlatform === 'IOS'
        && playerPerformanceSettings.preference === 'AUTOMATIC',
  });
  const shouldShowPerformanceOptimizedNotice = gameStatus === 'PLAYING'
      && playerPerformanceSettings.preference === 'AUTOMATIC'
      && adaptivePerformance.appliedLevel !== 'FULL'
      && playerPerformanceSettings.noticeVersion < PERFORMANCE_NOTICE_VERSION
      && isAdaptiveSafeBoundary;

  const updatePerformancePreferenceFromNotice = (preference: PerformancePreference) => {
      setPlayer(previous => ({
          ...previous,
          settings: {
              ...previous.settings,
              performance: {
                  ...normalizePerformanceSettings(
                      previous.settings?.performance,
                      previous.settings?.smoothMode,
                  ),
                  preference,
                  noticeVersion: PERFORMANCE_NOTICE_VERSION,
              },
              smoothMode: preference === 'PERFORMANCE',
          },
      }));
      trackGameEvent('performance_notice_action', {
          preference: preference.toLowerCase(),
          applied_level: adaptivePerformance.appliedLevel.toLowerCase(),
      });
  };

  return (
    <GameErrorBoundary onRecover={handleRecoverToMenu}>
    <div ref={shellRef} className="ae-game-shell bg-black text-white font-sans selection:bg-amber-500 selection:text-black" data-shell-nav-visible={gameStatus === 'PLAYING' && isBottomNavVisible ? 'true' : 'false'}>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950 pointer-events-none" />

      {pendingSaveRecovery && (
          <SaveRecoveryModal
              playerName={pendingSaveRecovery.previous.name}
              age={pendingSaveRecovery.previous.age}
              week={pendingSaveRecovery.previous.currentWeek}
              violations={pendingSaveRecovery.violations}
              isRecovering={isRecoveringSave}
              onRecover={handleRecoverSave}
              onCancel={handleCancelSaveRecovery}
          />
      )}

      {pendingWeekProcessingFailure && !pendingSaveRecovery ? (
          <WeekProcessingRecoveryModal
              age={pendingWeekProcessingFailure.age}
              week={pendingWeekProcessingFailure.week}
              failedStage={pendingWeekProcessingFailure.failedStage}
              detail={pendingWeekProcessingFailure.detail}
              failureCode={pendingWeekProcessingFailure.failureCode}
              failures={pendingWeekProcessingFailure.failures}
              isExporting={isExportingWeekBackup}
              onRetry={handleRetryFailedWeek}
              onExportBackup={() => void handleExportFailedWeekBackup()}
              onReturnToMenu={handleRecoverToMenu}
          />
      ) : null}

      {/* SIMULATED AD OVERLAY */}
      {isShowingAd && (
          <div className="fixed inset-0 z-[300] bg-black flex flex-col items-center justify-center animate-in fade-in duration-300">
              <div className="text-center space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                      <div className="absolute inset-0 border-4 border-zinc-800 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin"></div>
                      <PlayCircle className="absolute inset-0 m-auto text-white" size={32} />
                  </div>
                  <div>
                      <h2 className="text-xl font-bold text-white uppercase tracking-widest">
	                          {tr('app.ads.loadingTitle', { step: adTotalSteps > 1 ? `${adStep}/${adTotalSteps}` : '' })}
	                      </h2>
	                      <p className="text-zinc-500 text-xs">{tr('app.ads.loadingSubtext')}</p>
                  </div>
              </div>
          </div>
      )}

      {pendingRewardSaveRetry && !isRetryingRewardSave && !isShowingAd && (
          <RewardSaveRetryDialog
              title={tr('app.ads.save.failedTitle')}
              explanation={tr('app.ads.save.retryExplanation')}
              retryLabel={tr('app.ads.save.retryButton')}
              noMoreAdsLabel={tr('app.ads.save.noMoreAds')}
              onRetry={() => void handleRetryPendingRewardSave()}
          />
      )}

      {/* DEBT / GAME OVER MODAL */}
      {showDebtModal && (
          <DebtRecoveryModal
              player={player}
              tr={tr}
              onRestartCareer={handleRestartCareer}
              onBailout={() => handleTriggerRewardAd('REWARDED_BAILOUT')}
              onManageFinances={() => setShowDebtModal(false)}
          />
      )}

	      {toastMessage && <GameToast title={toastMessage.title} subtext={toastMessage.subtext} />}

	      {pendingMedicalPrompt && gameStatus === 'PLAYING' && (
	          <div className="fixed inset-0 z-[155] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm animate-in fade-in duration-200">
	              <div
	                  role="dialog"
	                  aria-modal="true"
	                  aria-labelledby="medical-attention-title"
	                  className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-rose-400/25 bg-[linear-gradient(180deg,#171013_0%,#09090b_100%)] p-5 text-left shadow-[0_28px_80px_rgba(0,0,0,0.55)]"
	              >
	                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500" />
	                  <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-rose-500/15 blur-3xl" />
	                  <div className="relative">
	                      <div className="mb-4 flex items-start gap-3">
	                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-rose-300/25 bg-rose-500/15 text-rose-200">
	                              <ShieldAlert size={24} />
	                          </div>
	                          <div className="min-w-0">
	                              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-rose-300">Medical Alert</div>
	                              <h3 id="medical-attention-title" className="mt-1 text-xl font-black leading-tight text-white">
	                                  Treatment Needed
	                              </h3>
	                          </div>
	                      </div>

	                      <div className="rounded-2xl border border-white/8 bg-black/35 p-4">
	                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-zinc-500">Condition</div>
	                          <div className="mt-1 text-lg font-black text-white">{pendingMedicalPrompt.conditionName}</div>
	                          <p className="mt-3 text-sm leading-relaxed text-zinc-300">
	                              Your health needs attention now. Care Team can prevent some small issues, but active conditions still need the Health Clinic before they hurt work, energy, or career momentum.
	                          </p>
	                          <div className="mt-4 grid grid-cols-2 gap-2">
	                              {pendingMedicalPrompt.severity && (
	                                  <div className="rounded-xl border border-rose-300/15 bg-rose-500/10 px-3 py-2">
	                                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-rose-200/70">Severity</div>
	                                      <div className="mt-1 text-sm font-black uppercase text-rose-100">{pendingMedicalPrompt.severity}</div>
	                                  </div>
	                              )}
	                              {typeof pendingMedicalPrompt.healthCap === 'number' && (
	                                  <div className="rounded-xl border border-amber-300/15 bg-amber-500/10 px-3 py-2">
	                                      <div className="text-[9px] font-black uppercase tracking-[0.16em] text-amber-200/70">Health Cap</div>
	                                      <div className="mt-1 text-sm font-black text-amber-100">{pendingMedicalPrompt.healthCap}%</div>
	                                  </div>
	                              )}
	                          </div>
	                      </div>

	                      <div className="mt-4 grid grid-cols-1 gap-2">
	                          <button
	                              type="button"
	                              onClick={() => {
	                                  setPendingMedicalPrompt(null);
	                                  setLifestyleInitialView('ACTIVITIES');
	                                  setActivePage(Page.LIFESTYLE);
	                              }}
	                              className="flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-rose-400 px-4 text-sm font-black uppercase tracking-[0.12em] text-black transition-colors hover:bg-rose-300"
	                          >
	                              Open Health Clinic <ChevronRight size={16} />
	                          </button>
	                          <button
	                              type="button"
	                              onClick={() => setPendingMedicalPrompt(null)}
	                              className="min-h-11 w-full cursor-pointer rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-zinc-300 transition-colors hover:bg-white/[0.08]"
	                          >
	                              Later
	                          </button>
	                      </div>
	                  </div>
	              </div>
	          </div>
	      )}

	      {player.pendingEvent && (player.pendingEvent.type === 'AWARD_CEREMONY' || player.pendingEvent.type === 'PREMIERE') && (
              <RedCarpetEvent player={player} event={player.pendingEvent} onComplete={handleEventComplete} />
      )}
      {player.pendingEvents && player.pendingEvents.length > 0 && (player.pendingEvents[0].type === 'PRODUCTION_CRISIS' || player.pendingEvents[0].type === 'DIRECTOR_DECISION') && (
          <ProductionCrisisModal
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              saveSlot={currentSlot!}
              onChoice={(idx, rewardReceiptId) => resolveProductionCrisisTransactionally(
                  player.pendingEvents![0],
                  idx,
                  rewardReceiptId,
              )}
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 && player.pendingEvents[0].type === 'STOCK_CONTROL' && (
          <StockControlEventModal
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              onOpenAcquisitionDesk={() => openStockControlAcquisitionDesk(player.pendingEvents![0])}
              onReviewStock={() => openStockControlReview(player.pendingEvents![0])}
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 &&
        (player.pendingEvents[0].type === 'LIFE_EVENT' ||
         player.pendingEvents[0].type === 'LEGAL_HEARING' ||
         player.pendingEvents[0].type === 'SCANDAL' ||
         player.pendingEvents[0].type === 'UNDERWORLD_OFFER') && (
          <LifeEventModal
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              saveSlot={currentSlot!}
              onChoice={choice => resolveLifeEventTransactionally(player.pendingEvents![0], choice)}
          />
      )}
      {activePressEvent && (
              <PressConferenceEvent player={player} projectName={activePressEvent.project.name} questions={activePressEvent.questions} onComplete={handlePressConferenceComplete} onClose={() => setActivePressEvent(null)} />
      )}

      {showProtectionPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4"><Heart size={24} fill="currentColor" /></div>
                  <h3 className="text-white font-bold text-lg mb-1">
                      {tr('app.intimacyPrompt.title', { partnerName: showProtectionPrompt.partnerName })}
                  </h3>
                  <div className="grid grid-cols-1 gap-3 w-full mt-6">
                      <button onClick={() => { setShowProtectionPrompt(null); handleIntimacyChoice('PROTECTED', showProtectionPrompt.partnerId); }} className="py-4 px-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-white text-sm">{tr('app.intimacyPrompt.useProtection')}</div></div><CheckCircle size={18} className="text-emerald-500"/>
                      </button>
                      <button onClick={() => { setShowProtectionPrompt(null); handleIntimacyChoice('UNPROTECTED', showProtectionPrompt.partnerId); }} className="py-4 px-4 rounded-xl bg-zinc-800 border border-rose-900/30 hover:bg-rose-900/10 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-rose-400 text-sm">{tr('app.intimacyPrompt.unprotected')}</div></div><ShieldAlert size={18} className="text-rose-500"/>
                      </button>
                  </div>
                  <button onClick={() => setShowProtectionPrompt(null)} className="mt-4 text-xs text-zinc-500 hover:text-white underline">{tr('app.intimacyPrompt.cancel')}</button>
              </div>
          </div>
      )}

      {pendingBabyNaming && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl">
                  <div className="flex flex-col items-center text-center mb-6">
                      <div className="w-14 h-14 bg-amber-500/15 text-amber-400 rounded-full flex items-center justify-center mb-4">
                          <Baby size={28} />
                      </div>
                      <h3 className="text-white font-bold text-xl mb-1">{tr('app.babyNaming.title')}</h3>
                      <p className="text-sm text-zinc-400">{tr('app.babyNaming.subtitle')}</p>
                  </div>

                  <div className="space-y-5">
                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">{tr('app.babyNaming.firstName')}</label>
                          <input
                              value={babyFirstNameInput}
                              onChange={(e) => setBabyFirstNameInput(e.target.value)}
                              placeholder={pendingBabyNaming.suggestedFirstName}
                              maxLength={18}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-amber-500/60"
                          />
                      </div>

                      <div>
                          <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">{tr('app.babyNaming.lastName')}</label>
                          <div className="grid grid-cols-1 gap-2">
                              {getBabySurnameOptions(pendingBabyNaming.partnerName).map(option => (
                                  <button
                                      key={option.id}
                                      onClick={() => setBabySurnameChoice(option.value)}
                                      className={`p-3 rounded-2xl border text-left transition-colors ${
                                          babySurnameChoice === option.value
                                              ? 'bg-amber-500/10 border-amber-500/50 text-white'
                                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                                      }`}
                                  >
                                      <div className="font-bold text-sm">{option.label}</div>
                                      <div className="text-xs text-zinc-500 mt-0.5">{option.value}</div>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{tr('app.babyNaming.fullNamePreview')}</div>
                          <div className="text-lg font-bold text-white">
                              {`${babyFirstNameInput.trim() || pendingBabyNaming.suggestedFirstName} ${babySurnameChoice}`.trim()}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                          <button
                              onClick={handleAbandonBaby}
                              className="w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all bg-rose-500/10 hover:bg-rose-500/20 text-rose-200 border border-rose-500/30"
                          >
                              {tr('app.babyNaming.walkAway')}
                          </button>
                          <button
                              onClick={handleConfirmBabyName}
                              disabled={!babyFirstNameInput.trim() || !babySurnameChoice}
                              className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all ${
                                  !babyFirstNameInput.trim() || !babySurnameChoice
                                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                                      : 'bg-amber-500 hover:bg-amber-400 text-black shadow-[0_0_25px_rgba(245,158,11,0.35)]'
                              }`}
                          >
                              {tr('app.babyNaming.welcomeBaby')}
                          </button>
                      </div>
                      <p className="text-center text-[11px] text-zinc-500">
                          {tr('app.babyNaming.walkAwayWarning')}
                      </p>
                  </div>
              </div>
          </div>
      )}

      {activeSocialEvent && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                  <div className="text-center mb-6">
                      <h3 className="text-2xl font-bold text-white mb-2">{activeSocialEvent.event.title}</h3>
                      <p className="text-sm text-zinc-400 leading-relaxed">{activeSocialEvent.event.description}</p>
                  </div>
                  <div className="space-y-3">
                      {activeSocialEvent.event.options.map((opt, idx) => (
                          <button key={idx} onClick={() => handleSocialEventChoice(opt)} className="w-full p-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-left transition-colors group">
                              <div className="font-bold text-white text-sm group-hover:text-purple-400 transition-colors">{opt.label}</div>
                          </button>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {showWhatsNewModal && gameStatus === 'PLAYING' && (
          <div className="fixed inset-0 z-[140] bg-black/85 backdrop-blur-md overflow-y-auto custom-scrollbar px-3 py-5 sm:p-6 animate-in fade-in duration-200">
              <div className="ae-shell-dialog bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-xl mx-auto shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500"></div>
                  <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 pb-4 sm:p-7">
                      <div className="mb-5">
                          <div className="flex items-center justify-between gap-3 mb-4">
                              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400">{tr('app.whatsNew.eyebrow')}</div>
                              <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-200">{getChangelogTypeLabel(latestChangelogEntry.type)}</div>
                          </div>
                          <h3 className="text-3xl sm:text-4xl font-black text-white mb-3 leading-none">{tr('app.whatsNew.version', { version: APP_DISPLAY_VERSION })}</h3>
                          <div className="mb-2 text-sm font-black uppercase tracking-[0.2em] text-zinc-500">{latestChangelogEntry.title}</div>
                          <p className="text-sm sm:text-base text-zinc-300 leading-relaxed">
                              {latestChangelogEntry.summary}
                          </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm text-zinc-200">
                          {latestChangelogEntry.sections.map(section => (
                              <div key={section.heading} className="rounded-2xl border border-white/10 bg-zinc-950/70 px-4 py-4 shadow-inner shadow-black/20">
                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-3">{section.heading}</div>
                                  <ul className="space-y-2 leading-relaxed text-zinc-200">
                                      {section.items.map(item => (
                                          <li key={item} className="flex gap-2">
                                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300/80" aria-hidden="true" />
                                              <span>{item}</span>
                                          </li>
                                      ))}
                                  </ul>
                              </div>
                          ))}

                          <button
                              type="button"
                              onClick={() => setShowPreviousWhatsNewNotes(prev => !prev)}
                              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900"
                          >
                              <div className="flex items-center justify-between gap-3">
                                  <div>
                                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">Previous Updates</div>
                                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">Open the earlier major and patch notes.</p>
                                  </div>
                                  <span className="text-lg font-black text-zinc-400">{showPreviousWhatsNewNotes ? '-' : '+'}</span>
                              </div>
                          </button>

                          {showPreviousWhatsNewNotes && (
                              <div className="space-y-3">
                                  {previousChangelogEntries.map(entry => (
                                      <div key={entry.version} className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-4">
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                              <div>
                                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">v{entry.version}</div>
                                                  <div className="mt-1 font-black text-white">{entry.title}</div>
                                              </div>
                                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-zinc-300">
                                                  {getChangelogTypeLabel(entry.type)}
                                              </span>
                                          </div>
                                          <p className="mt-2 text-xs leading-relaxed text-zinc-400">{entry.summary}</p>
                                          <div className="mt-3 space-y-3">
                                              {entry.sections.map(section => (
                                                  <div key={section.heading}>
                                                      <div className="text-[9px] font-black uppercase tracking-[0.18em] text-zinc-500">{section.heading}</div>
                                                      <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-zinc-400">
                                                          {section.items.map(item => (
                                                              <li key={item} className="flex gap-2">
                                                                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-zinc-500" aria-hidden="true" />
                                                                  <span>{item}</span>
                                                              </li>
                                                          ))}
                                                      </ul>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="shrink-0 bg-zinc-900/95 backdrop-blur px-5 pb-5 pt-3 sm:px-6 sm:pb-6 border-t border-white/5">
                      <button
                          onClick={handleDismissWhatsNew}
                          className="w-full py-4 bg-white text-black font-bold rounded-2xl hover:bg-zinc-200 transition-colors"
                      >
	                          {tr('common.continue')}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Persistent Debt Warning Banner (When modal is closed but still in debt) */}
      {player.money < 0 && !showDebtModal && (gameStatus === 'PLAYING') && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-xs font-bold z-[60] flex justify-between px-4 items-center shadow-lg cursor-pointer" onClick={() => setShowDebtModal(true)}>
              <span>⚠️ DEBT: ${Math.abs(player.money).toLocaleString()}</span>
              <span>{8 - (player.flags.weeksInDebt || 0)} Weeks Left</span>
          </div>
      )}

      {saveTransferProgress && (
          <SaveTransferProgressOverlay
              progress={saveTransferProgress}
              onCancel={handleCancelSaveTransfer}
          />
      )}

      <PerformanceCapabilitiesRoot
        capabilities={performanceCapabilities}
        className={`${isFullBleedMobileSurface ? 'w-screen max-w-none' : isUiOverhaulSurface ? 'w-full max-w-md mx-auto' : 'max-w-md mx-auto border-x border-white/5 pt-safe-top shadow-2xl'} h-full min-h-0 relative z-10 ${isUiOverhaulSurface ? 'bg-[#070605]' : 'bg-zinc-950/80'} flex flex-col`}
      >
        {shouldShowPerformanceOptimizedNotice && (
            <PerformanceOptimizedNotice
                title={tr('settings.performanceNotice.title')}
                message={tr('settings.performanceNotice.message')}
                automaticLabel={tr('settings.performanceNotice.keepAutomatic')}
                cinematicLabel={tr('settings.performanceNotice.useCinematic')}
                performanceLabel={tr('settings.performanceNotice.usePerformance')}
                onKeepAutomatic={() => updatePerformancePreferenceFromNotice('AUTOMATIC')}
                onUseCinematic={() => updatePerformancePreferenceFromNotice('CINEMATIC')}
                onUsePerformance={() => updatePerformancePreferenceFromNotice('PERFORMANCE')}
            />
        )}
        {gameStatus === 'START_MENU' && (
            <StartMenu
                saveSlots={saveSlotSummaries}
                onSelectSlot={handleSelectSlot}
                onDeleteSlot={handleDeleteSlot}
                onImportData={handleImportGameData}
                onCreateCareerFromIntro={handleStartGameFromIntro}
                skipIntro={skipStartMenuIntro}
            />
        )}
        {gameStatus === 'CREATION' && (
                <CreationMenu onStartGame={handleStartGame} />
        )}
        {gameStatus === 'PLAYING' && (
            <>
                <div className={`ae-game-content ${isFullBleedMobileSurface ? 'ae-game-content--immersive flex-1 overflow-hidden p-0' : isUiOverhaulSurface ? 'min-h-0 flex-1 overflow-hidden' : `flex-1 px-5 pt-5 overflow-y-auto custom-scrollbar ${player.money < 0 ? 'pt-8' : ''}`}`}>
                    {activePage === Page.HOME && (<HomePage player={player} onNextWeek={handleNextWeek} isProcessing={isProcessing} onUpdatePlayer={handleUpdatePlayer} setPage={handleNavigateToPage} onOpenProductionHouseCheat={() => { setLifestyleInitialView('PRODUCTION_GAME'); handleNavigateToPage(Page.LIFESTYLE); }} onOpenPlatformCommissionCheat={() => { setInitialMobileAppMode('MESSAGES'); handleNavigateToPage(Page.MOBILE); }} onOpenStudioAcquisitionCheat={(studioId) => { setInitialForbesStudioId(studioId); handleNavigateToPage(Page.MOBILE); }} onOpenBoxOfficeCheat={() => { setInitialMobileAppMode('BOXOFFICE'); handleNavigateToPage(Page.MOBILE); }} onQueueBabyNamingCheat={handleQueueBabyNamingCheat} onOpenDeathSummaryPreview={handleOpenDeathSummaryPreview} onShowWhatsNewCheat={handleShowWhatsNewCheat} />)}
                    {activePage === Page.CAREER && (<CareerPage player={player} onQuitJob={handleQuitJob} onRehearse={handleRehearse} onOwnedProductionFocus={handleOwnedProductionFocus} />)}
                    {activePage === Page.IMPROVE && (<ImprovePage player={player} onTrain={()=>{}} onEnroll={(c)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, money: p.money- (c.upfrontCost||0), commitments: [...p.commitments, {...c, id: `c_${Date.now()}`, weeksCompleted:0}] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onCancel={(id)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, commitments: p.commitments.filter(c=>c.id!==id)}; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onPerformAction={handleImproveAction} />)}
                    {activePage === Page.SOCIAL && (<SocialPage player={player} onInteract={handleSocialInteract} onContinueAsChild={handleContinueAsChild} />)}
                    {activePage === Page.LIFESTYLE && (<LifestylePage player={player} onBuyItem={handleBuyLifestyleItem} onSellItem={handleSellLifestyleItem} onSetResidence={(id)=>handleGenericUpdate(p=>({ ...p, residenceId: id }))} onStartBusiness={()=>{}} onShutdownBusiness={()=>{}} onUpdatePlayer={handleUpdatePlayer} onPremiumPurchase={handlePremiumPurchase} onReturnHome={() => setActivePage(Page.HOME)} onNavVisibilityChange={setIsBottomNavVisible} initialView={lifestyleInitialView ?? undefined} onInitialViewConsumed={() => setLifestyleInitialView(null)} onOpenBank={() => { setInitialMobileAppMode('BANK'); setActivePage(Page.MOBILE); }} initialRightsMarketOpportunityId={rightsMarketOpportunityId ?? undefined} onRightsMarketTargetConsumed={() => setRightsMarketOpportunityId(null)} initialStreamingContentOfferId={streamingContentOfferId ?? undefined} onStreamingContentOfferConsumed={() => setStreamingContentOfferId(null)} initialStudioContinuation={studioContinuationTarget ?? undefined} onStudioContinuationConsumed={() => setStudioContinuationTarget(null)} initialPlatformCommission={platformCommissionTarget ?? undefined} onPlatformCommissionConsumed={() => setPlatformCommissionTarget(null)} />)}
                    {activePage === Page.MOBILE && (
                        <MobilePage
                            player={player}
                            onUpdatePlayer={handleUpdatePlayer}
                            onNavVisibilityChange={setIsBottomNavVisible}
                            onFullBleedChange={setIsFullBleedMobileSurface}
                            initialForbesStudioId={initialForbesStudioId ?? undefined}
                            onInitialForbesStudioConsumed={() => setInitialForbesStudioId(null)}
                            initialStockId={initialMobileStockId ?? undefined}
                            onInitialStockConsumed={() => setInitialMobileStockId(null)}
                            initialAppMode={initialMobileAppMode ?? undefined}
                            onInitialAppModeConsumed={() => setInitialMobileAppMode(null)}
                            onTriggerBabyNaming={handleSchedulePregnancy}
                            onOpenRightsMarket={(opportunityId) => {
                                setRightsMarketOpportunityId(opportunityId || null);
                                setLifestyleInitialView('PRODUCTION_GAME');
                                setActivePage(Page.LIFESTYLE);
                            }}
                            onOpenStreamingContentOffer={(offerId) => {
                                setStreamingContentOfferId(offerId);
                                setLifestyleInitialView('STREAMING_PLATFORM');
                                setActivePage(Page.LIFESTYLE);
                            }}
                            onOpenStudioContinuation={(studioId, scriptId) => {
                                if (!studioId || !scriptId) return;
                                setStudioContinuationTarget({ studioId, scriptId });
                                setLifestyleInitialView('PRODUCTION_GAME');
                                setActivePage(Page.LIFESTYLE);
                            }}
                            onOpenPlatformCommission={(studioId, offerId) => {
                                setPlatformCommissionTarget({ studioId, offerId });
                                setLifestyleInitialView('PRODUCTION_GAME');
                                setActivePage(Page.LIFESTYLE);
                            }}
                            onAudition={(opp)=>handleGenericUpdate(p=>{ const next: Player = { ...p, applications: [...p.applications, { id: `app_${Date.now()}`, type: 'AUDITION' as const, name: opp.projectName, weeksRemaining: 1, data: opp }] }; spendPlayerEnergy(next, 25, `Audition: ${opp.projectName}`); return next; })}
                            onTakeJob={(job)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, commitments: [...p.commitments, job] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })}
                            onQuitJob={handleQuitJob}
                            onPost={(t,c,img,campaignParticipation,promotedProjectId)=>handleGenericUpdate(p=>{
                                if (p.instagram.lastPostWeek !== p.currentWeek) {
                                    p.instagram.weeklyPostCount = 0;
                                    p.instagram.lastPostWeek = p.currentWeek;
                                }

                                if (p.instagram.weeklyPostCount >= 3) {
                                    setToastMessage({
                                        title: tr('app.socialFeedback.tooManyPostsTitle'),
                                        subtext: tr('app.socialFeedback.tooManyPostsSubtext')
                                    });
                                    return p;
                                }

                                const config = INSTAGRAM_POST_CONFIGS[t];
                                if (p.energy.current < config.energy) {
                                    setToastMessage({
                                        title: tr('app.feedback.notEnoughEnergyTitle'),
                                        subtext: tr('app.socialFeedback.needEnergyToPostSubtext', { energy: config.energy.toString() })
                                    });
                                    return p;
                                }

                                const outcome = calculateInstagramPostOutcome(p, t, p.instagram.weeklyPostCount);
                                const actualGain = outcome.followerGain;
                                const avatarToSave = p.avatar.startsWith('data:') ? '' : p.avatar;

                                const linkedCampaign = campaignParticipation
                                    ? p.world.industryMedia?.campaigns?.find(item => item.id === campaignParticipation.campaignId)
                                    : undefined;
                                const newPost = {
                                    id: `p_${Date.now()}`,
                                    authorId: 'PLAYER',
                                    authorName: p.name,
                                    authorHandle: p.instagram.handle,
                                    authorAvatar: avatarToSave,
                                    type: t,
                                    caption: c,
                                    week: p.currentWeek,
                                    year: p.age,
                                    likes: outcome.likes,
                                    comments: outcome.comments,
                                    shares: outcome.shares,
                                    saves: outcome.saves,
                                    commentList: outcome.commentList,
                                    engagementScore: outcome.engagementScore,
                                    isPlayer: true,
                                    contentMediaId: img,
                                    ...(promotedProjectId ? { promotedProjectId } : {}),
                                    ...(linkedCampaign ? {
                                        campaignId: linkedCampaign.id,
                                        fandomId: linkedCampaign.fandomId,
                                        industryEventId: linkedCampaign.industryEventId,
                                        mediaStoryId: linkedCampaign.mediaStoryId,
                                    } : {}),
                                };

                                const toastMsg = outcome.likes > 10000
                                    ? tr('app.socialFeedback.viralFollowersSubtext', { followers: actualGain.toLocaleString() })
                                    : tr('app.socialFeedback.followersSubtext', { followers: actualGain.toLocaleString() });
                                setToastMessage({ title: tr('app.socialFeedback.postedTitle'), subtext: toastMsg });

                                const nextState: Player = {
                                    ...p,
                                    stats: { ...p.stats, followers: p.stats.followers + actualGain },
                                    instagram: {
                                        ...p.instagram,
                                        followers: Math.max(p.instagram.followers || 0, p.stats.followers) + actualGain,
                                        posts: [newPost, ...p.instagram.posts],
                                        weeklyPostCount: p.instagram.weeklyPostCount + 1,
                                        aesthetic: clampInstagramStat((p.instagram.aesthetic ?? 50) + outcome.statDeltas.aesthetic),
                                        authenticity: clampInstagramStat((p.instagram.authenticity ?? 55) + outcome.statDeltas.authenticity),
                                        controversy: clampInstagramStat((p.instagram.controversy ?? 0) + outcome.statDeltas.controversy),
                                        fashionInfluence: clampInstagramStat((p.instagram.fashionInfluence ?? 10) + outcome.statDeltas.fashionInfluence),
                                        fanLoyalty: clampInstagramStat((p.instagram.fanLoyalty ?? 45) + outcome.statDeltas.fanLoyalty)
                                    }
                                };
                                spendPlayerEnergy(nextState, config.energy, `Instagram: ${config.label}`);
                                const campaignState = campaignParticipation
                                    ? applyIndustryMediaCampaignParticipation(
                                        nextState,
                                        campaignParticipation.campaignId,
                                        campaignParticipation.mode,
                                        getAbsoluteWeek(nextState.age, nextState.currentWeek),
                                    )
                                    : nextState;
                                if (!promotedProjectId) return campaignState;
                                const promotion = applyProjectPromotionAttribution(campaignState, {
                                    projectId: promotedProjectId,
                                    publicationId: newPost.id,
                                    channel: 'INSTAGRAM',
                                    promotionType: t === 'BTS' ? 'BTS' : t === 'REEL' ? 'REEL' : t === 'CELEBRATION' ? 'CELEBRATION' : 'ANNOUNCEMENT',
                                    absoluteWeek: getAbsoluteWeek(campaignState.age, campaignState.currentWeek),
                                    reach: outcome.likes + outcome.comments * 3 + outcome.shares * 2,
                                    engagement: outcome.likes + outcome.comments + outcome.shares + outcome.saves,
                                });
                                if (!promotion.attribution) return promotion.player;
                                return {
                                    ...promotion.player,
                                    instagram: {
                                        ...promotion.player.instagram,
                                        posts: promotion.player.instagram.posts.map(post => post.id === newPost.id ? {
                                            ...post,
                                            promotionAttributionId: promotion.attribution!.id,
                                        } : post),
                                    },
                                };
                            })}
                            onReactInstagramPost={(postId, action)=>handleGenericUpdate(p=>{
                                const applyReaction = (post: any) => {
                                    if (post.id !== postId) return post;
                                    if (action === 'LIKE') {
                                        const wasLiked = !!post.hasLiked;
                                        return { ...post, hasLiked: !wasLiked, likes: Math.max(0, (post.likes || 0) + (wasLiked ? -1 : 1)) };
                                    }
                                    const wasSaved = !!post.hasSaved;
                                    return { ...post, hasSaved: !wasSaved, saves: Math.max(0, (post.saves || 0) + (wasSaved ? -1 : 1)) };
                                };
                                return {
                                    ...p,
                                    instagram: {
                                        ...p.instagram,
                                        posts: p.instagram.posts.map(applyReaction),
                                        feed: p.instagram.feed.map(applyReaction)
                                    }
                                };
                            })}
                            onRespondInstagramDM={(npc, actionId, accepted)=>handleGenericUpdate(p=>{
                                const state = p.instagram.npcStates[npc.id] || {
                                    npcId: npc.id,
                                    isFollowing: false,
                                    isFollowedBy: false,
                                    relationshipScore: 0,
                                    relationshipLevel: 'STRANGER',
                                    lastInteractionWeek: p.currentWeek,
                                    hasMet: false,
                                    chatHistory: []
                                };
                                let selectedAction: any = null;
                                const updatedChat = (state.chatHistory || []).map(message => {
                                    if (message.action?.id !== actionId || message.action.status !== 'PENDING') return message;
                                    selectedAction = message.action;
                                    return {
                                        ...message,
                                        action: { ...message.action, status: accepted ? 'ACCEPTED' as const : 'DECLINED' as const }
                                    };
                                });

                                if (!selectedAction) return p;

                                const replyText = accepted
                                    ? (selectedAction?.kind === 'IG_REFERRAL'
                                        ? "That means a lot. Keep the door open and I will take it seriously."
                                        : selectedAction?.kind === 'IG_BRAND_OFFER'
                                            ? "Sounds good. I will check the brief and handle it through my team."
                                            : "I hear you. Let's not make this messier than it needs to be.")
                                    : (selectedAction?.kind === 'IG_REFERRAL'
                                        ? "I appreciate you thinking of me, but I can't chase this one right now."
                                        : selectedAction?.kind === 'IG_BRAND_OFFER'
                                            ? "Thanks for reaching out, but I'll pass on this campaign."
                                            : "I'm not engaging with that. Wishing you well.");

                                const npcReplyText = accepted
                                    ? (selectedAction?.kind === 'IG_BRAND_OFFER'
                                        ? "Perfect. Check your Team app, the contract is active there."
                                        : selectedAction?.kind === 'IG_REFERRAL'
                                            ? "Good. I will keep the door warm and let the right people know."
                                            : "Got it. I'll keep you posted.")
                                    : "Understood. No hard feelings.";

                                const finalChat = [
                                    ...updatedChat,
                                    { sender: 'PLAYER' as const, text: replyText, timestamp: Date.now() },
                                    { sender: 'NPC' as const, text: npcReplyText, timestamp: Date.now() + 1 }
                                ];

                                const nextPlayer: Player = {
                                    ...p,
                                    instagram: {
                                        ...p.instagram,
                                        npcStates: {
                                            ...p.instagram.npcStates,
                                            [npc.id]: {
                                                ...state,
                                                chatHistory: finalChat,
                                                relationshipScore: Math.max(0, Math.min(100, state.relationshipScore + (accepted ? 3 : -1)))
                                            }
                                        }
                                    }
                                };

                                if (accepted && selectedAction?.kind === 'IG_REFERRAL') {
                                    const referrals = Array.isArray(nextPlayer.flags.pendingInstagramReferrals) ? nextPlayer.flags.pendingInstagramReferrals : [];
                                    const weeksLeft = Math.max(1, Math.round(selectedAction.payload?.weeksLeft || 2 + Math.floor(Math.random() * 2)));
                                    const referralId = selectedAction.id;
                                    const outcome = createInstagramReferralOutcome(nextPlayer);
                                    nextPlayer.flags.pendingInstagramReferrals = [
                                        ...referrals.filter((referral: any) => referral.id !== referralId && referral.actionId !== referralId),
                                        {
                                            id: referralId,
                                            actionId: referralId,
                                            npcId: npc.id,
                                            npcName: npc.name,
                                            weeksLeft,
                                            status: 'PENDING',
                                            deliveryType: outcome.deliveryType,
                                            opportunity: outcome.opportunity
                                        }
                                    ];
                                    const promisedResult = outcome.deliveryType === 'DIRECT_ROLE' ? 'direct role offer' : 'casting audition';
                                    nextPlayer.logs = [{
                                        week: p.currentWeek,
                                        year: p.age,
                                        message: tr('app.socialFeedback.referralAcceptedLog', { name: npc.name, result: promisedResult, weeks: weeksLeft.toString() }),
                                        type: 'positive' as const
                                    }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({
                                        title: tr('app.socialFeedback.referralAcceptedTitle'),
                                        subtext: tr('app.socialFeedback.referralAcceptedSubtext', { result: promisedResult, weeks: weeksLeft.toString() })
                                    });
	                                } else if (accepted && selectedAction?.kind === 'IG_BRAND_OFFER' && selectedAction.payload?.offer) {
	                                    const normalizedOffer = normalizeSponsorshipOffer(selectedAction.payload.offer);
	                                    nextPlayer.activeSponsorships = [...nextPlayer.activeSponsorships, normalizedOffer];
	                                    nextPlayer.logs = [{
	                                        week: p.currentWeek,
	                                        year: p.age,
	                                        message: tr('app.socialFeedback.brandDealAcceptedLog', { brandName: normalizedOffer.brandName }),
	                                        type: 'positive' as const
	                                    }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({
                                        title: tr('app.socialFeedback.brandDealAcceptedTitle'),
                                        subtext: tr('app.socialFeedback.brandDealAcceptedSubtext')
                                    });
                                } else {
                                    nextPlayer.logs = [{
                                        week: p.currentWeek,
                                        year: p.age,
                                        message: accepted
                                            ? tr('app.socialFeedback.dmAcceptedLog', { name: npc.name })
                                            : tr('app.socialFeedback.dmDeclinedLog', { name: npc.name }),
                                        type: (accepted ? 'positive' : 'neutral') as 'positive' | 'neutral'
                                    }, ...nextPlayer.logs].slice(0, 50);
                                    setToastMessage({
                                        title: accepted ? tr('app.socialFeedback.dmAcceptedTitle') : tr('app.socialFeedback.dmDeclinedTitle'),
                                        subtext: tr('app.socialFeedback.dmReplySeenSubtext', { name: npc.name })
                                    });
                                }

                                return nextPlayer;
                            })}
                            onFollowNPC={(npc)=>handleGenericUpdate(p=>({ ...p, instagram: { ...p.instagram, npcStates: { ...p.instagram.npcStates, [npc.id]: { ...p.instagram.npcStates[npc.id], isFollowing: !p.instagram.npcStates[npc.id]?.isFollowing } } } }))}
                            onInteractNPC={handleNPCInteract}
                            onBefriendNPC={(npc)=>{}}
                            onHireAgent={(agent) => {
                                handleGenericUpdate(p => {
                                    if (p.money < agent.annualFee) {
                                        setToastMessage({
                                            title: tr('app.feedback.notEnoughMoneyTitle'),
                                            subtext: tr('app.team.needAnnualFeeSubtext', { amount: agent.annualFee.toLocaleString() })
                                        });
                                        return p;
                                    }
                                    const newRels = [...p.relationships];
                                    if (!newRels.some(r => r.npcId === agent.id)) {
                                        newRels.push({
                                            id: `rel_${agent.id}_${Date.now()}`,
                                            name: agent.name,
                                            relation: 'Agent',
                                            closeness: 50,
                                            image: `https://api.dicebear.com/8.x/avataaars/svg?seed=${agent.name}`,
                                            lastInteractionWeek: p.currentWeek,
                                            npcId: agent.id
                                        });
                                    }
                                    setToastMessage({
                                        title: tr('app.team.agentHiredTitle'),
                                        subtext: tr('app.team.agentHiredSubtext', { name: agent.name })
                                    });
                                    return {
                                        ...p,
                                        money: p.money - agent.annualFee,
                                        team: {
                                            ...p.team,
                                            agent: agent,
                                            availableAgents: (p.team.availableAgents || []).filter(a => a.id !== agent.id)
                                        },
                                        relationships: newRels
                                    };
                                });
                            }}
                            onFireAgent={() => {
                                handleGenericUpdate(p => {
                                    const agentId = p.team.agent?.id;
                                    return {
                                        ...p,
                                        team: { ...p.team, agent: null },
                                        relationships: p.relationships.filter(r => r.npcId !== agentId)
                                    };
                                });
                            }}
                            onHireManager={(manager) => {
                                handleGenericUpdate(p => {
                                    if (p.money < manager.annualFee) {
                                        setToastMessage({
                                            title: tr('app.feedback.notEnoughMoneyTitle'),
                                            subtext: tr('app.team.needAnnualFeeSubtext', { amount: manager.annualFee.toLocaleString() })
                                        });
                                        return p;
                                    }
                                    const newRels = [...p.relationships];
                                    if (!newRels.some(r => r.npcId === manager.id)) {
                                        newRels.push({
                                            id: `rel_${manager.id}_${Date.now()}`,
                                            name: manager.name,
                                            relation: 'Manager',
                                            closeness: 50,
                                            image: `https://api.dicebear.com/8.x/avataaars/svg?seed=${manager.name}`,
                                            lastInteractionWeek: p.currentWeek,
                                            npcId: manager.id
                                        });
                                    }
                                    setToastMessage({
                                        title: tr('app.team.managerHiredTitle'),
                                        subtext: tr('app.team.managerHiredSubtext', { name: manager.name })
                                    });
                                    return {
                                        ...p,
                                        money: p.money - manager.annualFee,
                                        team: {
                                            ...p.team,
                                            manager: manager,
                                            availableManagers: (p.team.availableManagers || []).filter(m => m.id !== manager.id)
                                        },
                                        relationships: newRels
                                    };
                                });
                            }}
                            onFireManager={() => {
                                handleGenericUpdate(p => {
                                    const managerId = p.team.manager?.id;
                                    return {
                                        ...p,
                                        team: { ...p.team, manager: null },
                                        relationships: p.relationships.filter(r => r.npcId !== managerId)
                                    };
                                });
                            }}
                            onAcceptMessage={(msg)=>handleGenericUpdate(p=>{
                                if (msg.type !== 'OFFER_OUTSIDE_PRODUCER_INVESTMENT') {
                                    return { ...p, inbox: p.inbox.filter(m=>m.id!==msg.id) };
                                }
                                const action = msg.data?.action || 'ACCEPT';
                                if (action === 'PASS') {
                                    setToastMessage({
                                        title: tr('app.producerInvestment.passedTitle'),
                                        subtext: tr('app.producerInvestment.passedSubtext')
                                    });
                                    return { ...p, inbox: p.inbox.filter(m=>m.id!==msg.id) };
                                }
                                const investmentEnergyCost = PHASE_ONE_ENERGY_COSTS.OUTSIDE_PRODUCER_INVESTMENT_ACCEPT;
                                if (p.energy.current < investmentEnergyCost) {
                                    setToastMessage({
                                        title: tr('app.producerInvestment.dealBlockedTitle'),
                                        subtext: `Need ${investmentEnergyCost}E to commit investor money.`
                                    });
                                    return p;
                                }
                                if (action === 'COUNTER') {
                                    const counterOffer = msg.data;
                                    const counterResult = counterOutsideProducerInvestmentOffer(
                                        p,
                                        counterOffer,
                                        Number(msg.data?.counterCash || 0),
                                        Number(msg.data?.counterStake || 0)
                                    );
                                    if (counterResult.accepted) {
                                        spendPlayerEnergy(counterResult.player, investmentEnergyCost, `Producer investment: ${msg.data?.projectTitle || 'Counter accepted'}`);
                                    }
                                    const updatedCounterOffer = (counterResult.player.inbox || []).find(message => (
                                        message.id === msg.id
                                        || message.data?.id === counterOffer?.id
                                        || message.data?.projectId === counterOffer?.projectId
                                    ))?.data;
                                    const counterClosed = Boolean(updatedCounterOffer?.counterClosed);
                                    setToastMessage({
                                        title: counterResult.accepted ? tr('app.producerInvestment.counterAcceptedTitle') : tr('app.producerInvestment.counterDeclinedTitle'),
                                        subtext: counterResult.accepted
                                            ? tr('app.producerInvestment.counterAcceptedSubtext')
                                            : tr(counterClosed ? 'app.producerInvestment.counterClosedSubtext' : 'app.producerInvestment.counterDeclinedSubtext')
                                    });
                                    return counterResult.player;
                                }
                                const result = acceptOutsideProducerInvestmentOffer(p, msg.data);
                                if (result.accepted) {
                                    spendPlayerEnergy(result.player, investmentEnergyCost, `Producer investment: ${msg.data?.projectTitle || 'Accept terms'}`);
                                }
                                setToastMessage({
                                    title: result.accepted ? tr('app.producerInvestment.shareBoughtTitle') : tr('app.producerInvestment.dealBlockedTitle'),
                                    subtext: result.accepted
                                        ? tr('app.producerInvestment.shareBoughtSubtext', {
                                            stake: String(result.investment?.stakePercent ?? 0),
                                            projectTitle: result.investment?.projectTitle || ''
                                        })
                                        : (result.reason || tr('app.producerInvestment.dealBlockedSubtext'))
                                });
                                return result.player;
                            })}
                            onPerformSponsorship={(id, type)=>handleGenericUpdate(p=>{
                                const sponIndex = p.activeSponsorships.findIndex(x=>x.id===id);
                                if (sponIndex < 0) return p;
                                const s = p.activeSponsorships[sponIndex];
                                const req = s.requirements || { type, energyCost: 0, totalRequired: 1, progress: 0 };
                                const nextProgress = Math.min(Math.max(1, Number(req.totalRequired || 1)), Math.max(0, Number(req.progress || 0)) + 1);
                                const updatedSponsorships = [...p.activeSponsorships];
                                updatedSponsorships[sponIndex] = {
                                    ...s,
                                    requirements: {
                                        ...req,
                                        progress: nextProgress,
                                    }
                                };
                                const next = {
                                    ...p,
                                    activeSponsorships: updatedSponsorships,
                                    logs: nextProgress >= Math.max(1, Number(req.totalRequired || 1))
                                        ? [{
                                            week: p.currentWeek,
                                            year: p.age,
                                            message: `✅ Completed all deliverables for ${s.brandName || type}. Contract will close cleanly next week.`,
                                            type: 'positive' as const,
                                        }, ...(p.logs || [])].slice(0, 80)
                                        : p.logs
                                };
                                spendPlayerEnergy(next, Number(req.energyCost || 0), `Sponsorship: ${s.brandName || type}`);
                                return next;
                            })}
                            onDeleteMessage={(id)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==id) }))}
                            onTradeStock={handleTradeStock}
                        />
                    )}
                    {activePage === Page.SETTINGS && (
                        <SettingsPage
                            player={player}
                            onUpdatePlayer={handleGenericUpdate}
                            onExportData={handleExportGameData}
                            onImportData={handleImportGameData}
                            onBack={() => setActivePage(Page.HOME)}
                            onMainMenu={() => {
                                setSkipStartMenuIntro(true);
                                setGameStatus('START_MENU');
                                setActivePage(Page.HOME);
                            }}
                        />
                    )}
                    {activePage === Page.STORE && (
                        <StorePage
                            player={player}
                            onBack={() => setActivePage(Page.HOME)}
                            onWatchAd={handleTriggerRewardAd}
                            wellnessRewardAd={wellnessRewardAd}
                            wellnessAdNowMs={wellnessAdNowMs}
                            onPremiumPurchase={handlePremiumPurchase}
                            onRestorePurchases={handleRestorePurchases}
                        />
                    )}
                </div>
                {isBottomNavVisible && (
                    <BottomNav
                        player={player}
                        activePage={activePage}
                        setPage={handleNavigateToPage}
                        unreadMessages={player.inbox?.filter(message => !message.isRead).length || 0}
                    />
                )}
                <NewPlayerTutorialOverlay
                    player={player}
                    activePage={activePage}
                    setPage={handleNavigateToPage}
                    onOpenMobileAppMode={(mode) => {
                        if (mode === 'MESSAGES') {
                            setInitialMobileAppMode('MESSAGES');
                            setActivePage(Page.MOBILE);
                        }
                    }}
                    onUpdateTutorialState={handleUpdateTutorialState}
                />
            </>
        )}
      </PerformanceCapabilitiesRoot>
    </div>
    </GameErrorBoundary>
  );
};

export default App;
