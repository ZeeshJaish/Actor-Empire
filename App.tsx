import { isQuietPlayerUpdate, markQuietPlayerUpdate } from './services/quietPlayerUpdates';
import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { runHardwareBack } from './services/hardwareBack';
import { claimCreatorAction } from './services/creatorEconomy';
import { acknowledgeStockControlNotice } from './services/stockControlNotices';
import { isStockSaveRecoveryError } from './services/stockSaveCompatibility';
import {applyCareerAuditionApplication,acceptCareerPartTimeJob} from './services/careerApplicationActions';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { flushSync } from 'react-dom';
import { INITIAL_PLAYER, Player, Page, Commitment, PressInteraction, SocialEvent, ActorSkills, AdType, Relationship, ProjectDetails, ActiveRelease, PastProject, StreamingState, PregnancyCarrier, ScheduledEvent, SponsorshipOffer } from './types';
import './components/layout-adapters/actorEmpireShell.css';
import { isKeyboardOccludingViewport } from './components/layout-adapters/shellGeometry';
import { buildAbandonedBabyName, getBabySurnameChoices } from './services/babyNaming';
import { BottomNav } from './components/BottomNav';
import { NewPlayerTutorialOverlay } from './components/NewPlayerTutorialOverlay';
import { ProductionCrisisModal } from './components/ProductionCrisisModal';
import { LifeEventModal } from './components/LifeEventModal';
import { StreamingIncidentEventModal } from './components/StreamingIncidentEventModal';
import { OriginalIssueModal } from './components/originals/OriginalIssueModal';
import { StreamingDecisionEventModal } from './components/StreamingDecisionEventModal';
import { StockControlEventModal } from './components/StockControlEventModal';
import { SaveRecoveryModal } from './components/SaveRecoveryModal';
import { WeekProcessingRecoveryModal } from './components/WeekProcessingRecoveryModal';
import { applyCrisisImpact } from './services/productionService';
import { HomePage } from './views/HomePage';
import { CareerPage } from './views/CareerPage';
import { ImprovePage } from './views/ImprovePage';
import { SocialPage } from './views/SocialPage';
import { LifestylePage } from './views/LifestylePage';
import { MobilePage } from './views/mobile/MobilePage';
import { SettingsPage } from './views/SettingsPage';
import { StorePage } from './views/StorePage';
import { StartMenu } from './views/StartMenu';
import { CreationMenu } from './views/CreationMenu';
import { DeathScreen } from './views/DeathScreen';
import { RedCarpetEvent } from './views/RedCarpetEvent';
import { PressConferenceEvent } from './views/PressConferenceEvent';
import { ActorEmpireIntroStyle } from './components/ActorEmpireIntro';
import { StartupLoadingBar } from './components/StartupLoadingBar';
import ZedburyStudiosIntro from './components/ZedburyStudiosIntro';
import { ScreenErrorBoundary } from './components/ScreenErrorBoundary';
import type { NewCareerData } from './components/types';
import { processGameWeek } from './services/gameLoop';
import { generateAuditions, generatePartTimeJobs, rewardGenreExperience } from './services/roleLogic';
import { generateWeeklyFeed, calculateInteraction, getGenderedAvatar } from './services/npcLogic';
import { getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists, getRandomWellness, sanitizeTeamPools } from './services/teamLogic';
import { createBusiness, normalizeStudioState } from './services/businessLogic';
import { CheckCircle, Heart, ShieldAlert, AlertTriangle, PlayCircle, Skull, Briefcase, Baby, ChevronRight } from 'lucide-react';
import { useGameActions } from './hooks/useGameActions';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from './services/lifestyleLogic';
import { showAd, initAds, isAdOnScreen, askAdConsent, setInterstitialWanted } from './services/adLogic';
import { careerStartFlag, forcedAdCareerWeek, isForcedAdTrouble, msSinceLastAd, noteAdClosed, noteForcedAdWeekPassed, noteRatingAsked, noteRealPurchase, setForcedAdContext, showForcedAd } from './services/forcedAds';
import { rewardedCashAmount } from './services/rewardedCash';
import { announceStreamingPlusUnlocked, setStreamingPlusOwnedNow } from './services/streamingPlusEvents';
import { hasStreamingPlus } from './services/streamingPlusPack';
import StreamingPlusHost from './components/streamingPlus/StreamingPlusHost';
import { formatMoney } from './services/formatUtils';
import {
  beginPendingRewardAd,
  clearPendingRewardAd,
  markPendingRewardAdReady,
  readPendingRewardAd,
  recordPendingRewardAdStep,
  type PendingRewardAdReceipt,
} from './services/rewardedAdRecovery';
import { clearEventReward, eventRewardKey, readEventReward } from './services/eventRewardAd';
import { ensureTrackingPermission } from './services/trackingService';
import { addPurchaseLedgerEntries, readPurchaseLedger, type PurchaseLedgerEntry } from './services/storage';
import { NewerSaveFormatError, slotFormatKey } from './services/saveFormatGuard';
import { createDeferredSaveSlotSummary, createSaveSlotSummary, deleteVerifiedGameData, getGameSaveSummary, getVerifiedLiveSave, listGameDataKeys, loadVerifiedGameData, peekVerifiedPreviousCopy, recoverPreviousGameData, runInVerifiedSaveQueue, saveVerifiedGameData, setVerifiedLiveSave, writeGameSaveSummary, type SaveSlotSummary } from './services/storage';
import { buildLegacyStudioInheritance, createBloodlineSnapshot, getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge, inferStreamingStartWeekAbsolute, inheritActorSkills, LEGACY_MIN_PLAYABLE_AGE } from './services/legacyLogic';
import { getStreamingEstate, handoffOwnedStreamingPlatformToHeir, type StreamingHandoffChoice } from './services/streamingLegacy';
import { applyPremiumPurchase, getRequiredPremiumProductForAsset, hasNoAds, hasPremiumProduct, isNonConsumablePremiumProduct, PremiumProductId, restoreWeeklyEnergy, spendPlayerEnergy, syncEnergyDisplay, syncWeeklyEnergyForCommitments } from './services/premiumLogic';
import { finishAndroidConsumable, finishIOSTransaction, isAndroidStore, purchasePremiumProduct, rememberStoreTransactionDelivered, restorePremiumPurchases, startAndroidPurchaseUpdatesListener, startIOSPurchaseUpdatesListener, wasStoreTransactionDelivered, type IOSPurchaseUpdate } from './services/iapService';
import { sanitizeAwardRecords } from './services/awardLogic';
import { RoleType } from './types';
import { applyParenthoodAbandonment, getPregnancyFeedbackCopy } from './services/familyLogic';
import { APP_DISPLAY_VERSION } from './services/appVersion';
import { WhatsNewModal } from './views/WhatsNewModal';
import { CHANGELOG_ENTRIES, getChangelogTypeLabel, getLatestChangelogEntry } from './services/changelog';
import { calculateInstagramPostOutcome, clampInstagramStat, INSTAGRAM_POST_CONFIGS } from './services/instagramLogic';
import { normalizeUniverseMap } from './services/universeLogic';
import { hydrateGenreXP } from './services/genreCatalog';
import { createInstagramReferralOutcome } from './services/instagramOfferLogic';
import { executeStockTrade } from './services/stockLogic';
import { migratePlayerSave } from './services/saveMigration';
import { markPortraitLoadDone } from './services/npcAvatar';
import { forgetSaveWriteRecord, readSaveWriteRecord } from './services/saveWriteLimits';
import { getRecoveryFlaggedVersions, getSwitchLimit, isSwitchOn, startSessionSwitches } from './services/remoteSwitches';
import { getRamClass, rememberNativeMemoryGiB } from './services/deviceMemoryClass';
import { findFlaggedVersionOffer, isRecoveryOfferAnswered, offerForFailedLoad, pointFromCopy, rememberRecoveryOfferAnswered, weeksLostByRestoring, type RecoveryPoint, type RecoveryReason } from './services/recoveryList';
import { deliverDeveloperNotes } from './services/developerNotes';
import { prepareExternalPlayerUpdateForUi, prepareProcessedWeekForUi, prepareTrustedMarketUpdateForUi } from './services/playerUiState';
import { applyIndustryMediaCampaignParticipation } from './services/industryWorld';
import { yieldForWeekProcessingPaint } from './services/weekProcessingScheduler';
import { describeWeekProcessingFailure } from './services/weekProcessingRecovery';
import { checkpointNativeMemoryPressure } from './services/nativeMemoryCheckpoint';
import { getNativeDeviceInfo, withNativeBackgroundTask } from './services/nativeSupport';
import { notePageHiddenOrMemory, notePageSaveStarted, notePageScreen, notePageWeekAhead, notePageWeekStage, type PageSaveKind } from './services/pageStateBreadcrumb';
import { exportSaveSlotForSupport, exportSignedSaveArchive, importSignedSaveArchiveFromFile } from './services/saveTransfer';
import { markSelfReload, noteSessionClean, noteSessionDetail, noteSessionLive, noteSessionPhase, takeUncleanPreviousSession } from './services/sessionBreadcrumb';
import { createCopyOnTouch } from './services/copyOnTouch';
import { grantMigrationCarePackageIfEligible, MIGRATION_CARE_PACKAGE_CASH, MIGRATION_CARE_PACKAGE_ENERGY } from './services/migrationCarePackage';
import { externalizeCustomPostersInPlayer, hasEmbeddedCustomPosters } from './services/customPosterMedia';
import { compactPlayerForPersistence } from './services/saveCompaction';
import { prepareLocalStorageMirror } from './services/saveMirror';
import { estimateSaveJsonBytes, prepareVerifiedPlayerForPersistence } from './services/savePreparation';
import { adoptIssuedManifest, type SaveIntegrityManifest, type SaveIntegrityReason } from './services/saveIntegrity';
import { buildAvailableNewPlayerTutorialState, writeNewPlayerTutorialState, type NewPlayerTutorialState } from './services/newPlayerTutorial';
import { acceptOutsideProducerInvestmentOffer, counterOutsideProducerInvestmentOffer } from './services/outsideProductions';
import { PHASE_ONE_ENERGY_COSTS } from './services/energyCosts';
import { detectDeviceGameLanguage, getPlayerLanguage, isSupportedGameLanguage, t } from './services/i18n';
import { syncPlayerAfterWeek, type PostWeekSync } from './services/weekAhead/postWeekSync';
import { createWeekAheadBrowserWorker, createWeekAheadClient, type WeekAheadClient, type WeekAheadTake, type WeekAheadWriteOutcome } from './services/weekAhead/weekAheadClient';
import { applyNpcChanges } from './services/weekAhead/weekAheadEngine';
import { applyProjectPromotionAttribution } from './services/projectPromotionAttribution';
import { quoteRealEstateSale } from './services/realEstateLogic';
import {
  addBreadcrumb,
  isPerformanceTraceActive,
  fetchRemoteSwitchesForNextLaunch,
  markGameCheckpoint,
  markTraceAction,
  markWeekProcessingStage,
  recoverInterruptedWeekProcessingTrace,
  recordFlowFailure,
  recordNonFatal,
  setCrashContext,
  setCurrentGameScreen,
  startPerformanceTrace,
  stopPerformanceTrace,
  trackGameEvent,
} from './services/firebaseService';
import { RecoveryModeScreen } from './components/RecoveryModeScreen';
import { recoveryModeReport, saveRecoveryReport, sendRecoveryReport, weekFailureReport, type RecoveryReportHandle } from './services/recoveryReports';
import {
  findStoreReviewMoment,
  noteStoreReviewSession,
  noteStoreReviewTrouble,
  noteStoreReviewWeek,
  readStoreReviewState,
  requestStoreReview,
  storeReviewHoldReason,
  STORE_REVIEW_RULES,
  type StoreReviewMoment,
} from './services/storeReview';

type GameStatus = 'START_MENU' | 'CREATION' | 'PLAYING' | 'DEATH_SCREEN';
const LOCAL_STORAGE_SAVE_MIRROR_BUDGET_BYTES = 600_000;
const SAFE_BOOT_SESSION_KEY = 'actorEmpire.safeBootOnce';
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
  /** Week-speed Phase 2a (2026-11-17), the recovery list (services/recoveryList.ts): why it opened and what it offers. */
  reason: RecoveryReason;
  points: RecoveryPoint[];
  careerId: string;
  lastShown: { careerId: string; age: number; week: number } | null;
  flaggedVersion?: string;
};

type PendingWeekProcessingFailure = {
  age: number;
  week: number;
  failedStage: string;
  detail: string;
  failureCode: string;
  failures: string[];
};

const PREGNANCY_TERM_WEEKS = 39;
const WHATS_NEW_STORAGE_KEY = 'actorEmpireSeenWhatsNewVersion';
const PREMIUM_ENTITLEMENTS_STORAGE_KEY = 'actorEmpirePremiumEntitlements';
const PREMIUM_SAVE_SLOT_IDS = [1, 2, 3] as const;
const AUTOSAVE_DEBOUNCE_MS = 750;
/* 1.0.27 (2026-11-11, player report: "every button takes about 30 seconds"): on a big career and a slow phone one
   full save (integrity check, IndexedDB write, read-back check) holds the screen for many seconds, and a save
   started 0.75 s after every change, so a player tapping through a week met one save after another. Where this
   device's last autosave took a second or more, changes now gather while the player keeps tapping: the save
   waits for a quiet moment (3× the last save, at most 30 s) and never more than 8× the last save (10 s to 2
   minutes) after the first unsaved change. A save under a second keeps the 0.75 s. Purchases, ad rewards,
   events with rewards, every week and hiding the app still save at once, so only plain taps wait. */
const getAutosaveDelayMs = (lastAutosaveMs: number, unsavedForMs: number): number => {
    if (!(lastAutosaveMs >= 1_000)) return AUTOSAVE_DEBOUNCE_MS;
    const quiet = Math.min(30_000, lastAutosaveMs * 3);
    const longest = Math.min(120_000, Math.max(10_000, lastAutosaveMs * 8));
    return Math.max(AUTOSAVE_DEBOUNCE_MS, Math.min(quiet, longest - unsavedForMs));
};
const PLAYTIME_FLUSH_INTERVAL_MS = 60_000;
/* Week Ahead (2026-11-12): on a career whose week takes the device 0.9 s or more, a background worker prepares
   the next week while the player reads the current one (services/weekAhead). It is switched on per save slot
   by the last week this device ran itself; 'on'/'off' in actorEmpire.weekAhead.force overrides that for tests. */
const WEEK_AHEAD_MIN_WEEK_MS = 900;
const WEEK_AHEAD_TAKE_TIMEOUT_MS = 90_000;
const WEEK_AHEAD_SLOT_KEY = 'actorEmpire.weekAhead.slowWeekMs.';
const WEEK_AHEAD_FORCE_KEY = 'actorEmpire.weekAhead.force';
/* Phase 1 (2026-11-17): the system closed the game while Week Ahead ran for this slot (a kill, not a close). Week
   Ahead then stays off for that slot until the next app version; a memory warning only stops it for the session. */
const WEEK_AHEAD_KILLED_KEY = 'actorEmpire.weekAhead.offAfterKill.';
/* Memory (2026-11-12, Redmi test): the worker holds a second copy of the career (+65–220 MB on a 66 MB career).
   Week Ahead runs only where the device reports 4 GB of memory or more (navigator.deviceMemory: Android WebView,
   Chrome). The iOS WebView does not report it, so the iOS app writes the phone's RAM in GiB into
   window.__aeDeviceMemoryGB (ios/App/App/ViewController.swift). iOS closes a WebView that uses too much memory
   sooner than Android does, so iPhones need 6 GB or more (a 6 GB iPhone reports about 5.4 GiB, a 4 GB one 3.7).
   Crash fix (19 Nov 2026), FIX-PLAN decision 7: by the phone's real memory class (services/deviceMemoryClass.ts),
   because deviceMemory reads 4 on 4 GB and 6 GB Android phones alike. Week Ahead runs on 4_6 and up: 6 GB Android
   phones and up, and on iPhones exactly as before (6 GB and up; no iPhone reports between 4 and 5 GiB). 4 GB Android
   phones (3_4), which ran it in 1.0.28 and 1.0.29, stop until the kill reports show they can hold it; the weekAhead
   switch's limits (1 or 0 by RAM class) can change that from Firebase. */
const WEEK_AHEAD_BY_RAM_CLASS: Record<string, number> = { lt3: 0, '3_4': 0, '4_6': 1, '6_8': 1, '8p': 1, unknown: 0 };
const deviceAffordsWeekAhead = (): boolean => {
    const ramClass = getRamClass();
    return getSwitchLimit('weekAhead', ramClass, WEEK_AHEAD_BY_RAM_CLASS[ramClass] ?? 0) > 0;
};
/* After a memory warning from the system (iOS didReceiveMemoryWarning → 'actor-empire-memory-warning'), Week Ahead
   stays off until the app restarts: the worker's copy of the career is the first memory the game can give back. */
let weekAheadOffForSession = false;
/** Phase 1 (2026-11-17), week-speed plan Phase H item 6: Android's trim levels 20 (UI_HIDDEN, every time the game
 *  leaves the screen) and 40 (BACKGROUND) are app switches, not memory pressure on the game. Each one used to start
 *  a full-career save next to the hide save and turn Week Ahead off for the session. New native builds no longer
 *  forward them (MainActivity.java); this covers the shells already installed. iOS and every other level as before. */
/** Phase 1 (2026-11-17), telemetry v2 (plan item 8): the first cut of "the facts the world reads", to split the
 *  player's actions between two weeks: an action that replaces one of these parts of the career can change what the
 *  next week's world simulation sees; any other (a message read, a setting, a draft) cannot. The list comes from what
 *  the cinema forecast reads (17 Nov) plus money and holdings; Phase 2's S1 refines it. */
const WORLD_FACT_KEYS = ['world', 'activeReleases', 'commitments', 'pastProjects', 'outsideProductions', 'relationships',
    'businesses', 'stockTakeovers', 'ownedStreamingPlatform', 'stats', 'money', 'stocks', 'portfolio'] as const;
const isAndroidAppSwitchTrim = (event: Event): boolean => {
    if (!isSwitchOn('androidTrimFilter')) return false;
    const detail = event instanceof CustomEvent ? event.detail as { platform?: unknown; level?: unknown } | null : null;
    return !!detail && typeof detail === 'object' && detail.platform === 'android' && (detail.level === 20 || detail.level === 40);
};
/** Phase 1 (2026-11-17): the phone model for kill reports (the Week Ahead gate becomes phone model x career size).
 *  The native shells may inject it; otherwise Android's WebView names the model in its user agent. */
const getDevicePhoneModel = (): string => {
    const injected = (window as Window & { __aeDeviceModel?: unknown }).__aeDeviceModel;
    if (typeof injected === 'string' && injected.trim()) return injected.trim().slice(0, 40);
    const match = /Android [^;)]*;\s*([^;)]+?)(?:\s+Build\/|\))/.exec(typeof navigator !== 'undefined' ? navigator.userAgent || '' : '');
    return match ? match[1].trim().slice(0, 40) : 'unknown';
};
/* Phase 1 (2026-11-17), telemetry v2: the phone's memory class. Crash fix (19 Nov 2026), item 1.9: getRamClass now
   comes from services/deviceMemoryClass.ts and reads the phone's real memory (the native total on Android). */
/* Phase 1 (2026-11-17), plan item 8: this launch's switches, from what the previous launch read from Firebase. */
startSessionSwitches({ ramClass: getRamClass(), version: APP_DISPLAY_VERSION });
/** Phase 1 (2026-11-17), telemetry v2: the game's stored data (both copies of every slot) as a size class. */
const sizeBucketOf = (storageMb: number | null): string => storageMb === null ? 'unknown'
    : storageMb < 25 ? 'lt25' : storageMb < 75 ? '25_75' : storageMb < 150 ? '75_150' : '150p';
/* Phase 1 (2026-11-17), the lost-week watermark (first form): the last week shown for each slot, kept outside
   IndexedDB. Opening a career compares it with the copy that opened, and weeks shown but not in that copy are
   reported. It is written only after a week is saved and shown, so it never runs ahead of the save (on Android a
   kill can lose a late localStorage write, which makes it lag: lost weeks are under-counted, never invented). */
const LAST_WEEK_SHOWN_KEY = 'actorEmpire.lastWeekShown.';
const writeLastWeekShown = (slot: number, shown: Player) => {
    try { localStorage.setItem(LAST_WEEK_SHOWN_KEY + slot, JSON.stringify({ careerId: shown.id, age: shown.age, week: shown.currentWeek, at: Date.now() })); } catch { /* optional */ }
};
const readLastWeekShown = (slot: number): { careerId: string; age: number; week: number } | null => {
    try {
        const value = JSON.parse(localStorage.getItem(LAST_WEEK_SHOWN_KEY + slot) || 'null');
        return value && typeof value.careerId === 'string' && Number.isFinite(value.age) && Number.isFinite(value.week) ? value : null;
    } catch { return null; }
};
const clearLastWeekShown = (slot: number) => { try { localStorage.removeItem(LAST_WEEK_SHOWN_KEY + slot); } catch { /* optional */ } };
const readWeekAheadWanted = (slot: number | null): boolean => {
    if (!slot || typeof Worker !== 'function' || weekAheadOffForSession) return false;
    try {
        if (localStorage.getItem(WEEK_AHEAD_KILLED_KEY + slot) === APP_DISPLAY_VERSION) return false;
        const forced = localStorage.getItem(WEEK_AHEAD_FORCE_KEY);
        if (forced === 'on') return true;
        if (forced === 'off') return false;
        // Phase 1 (2026-11-17), plan item 8: Week Ahead can be switched off from Firebase (from the next launch).
        if (!isSwitchOn('weekAhead')) return false;
        if (!deviceAffordsWeekAhead()) return false;
        return Number(localStorage.getItem(WEEK_AHEAD_SLOT_KEY + slot)) >= WEEK_AHEAD_MIN_WEEK_MS;
    } catch {
        return false;
    }
};
const rememberSlotWeekMs = (slot: number, weekMs: number) => {
    try { localStorage.setItem(WEEK_AHEAD_SLOT_KEY + slot, String(Math.round(weekMs))); } catch { /* optional */ }
};
/* Phase 1 of the week-speed plan (2026-11-17): play time counted while nothing else changed, kept beside the save
   (see recordActivePlayTime). It belongs to the career and week it was written for, and a later full save that
   carries at least as much play time removes it. Older builds never read it; they only miss those minutes. */
const PLAY_TIME_SIDE_KEY = 'actorEmpire.playTimeSinceSave.';
type PlayTimeSideRecord = { name: string; age: number; week: number; totalPlayTimeMs: number };
const readPlayTimeSideRecord = (slot: number): PlayTimeSideRecord | null => {
    try {
        const parsed = JSON.parse(localStorage.getItem(PLAY_TIME_SIDE_KEY + slot) || 'null');
        return parsed && typeof parsed.totalPlayTimeMs === 'number' ? parsed as PlayTimeSideRecord : null;
    } catch {
        return null;
    }
};
const writePlayTimeSideRecord = (slot: number, source: Player) => {
    try {
        const record: PlayTimeSideRecord = { name: source.name, age: source.age, week: source.currentWeek, totalPlayTimeMs: Math.max(0, source.totalPlayTimeMs || 0) };
        localStorage.setItem(PLAY_TIME_SIDE_KEY + slot, JSON.stringify(record));
    } catch { /* optional: the next full save carries play time anyway */ }
};
const clearPlayTimeSideRecord = (slot: number, saved: Player) => {
    const record = readPlayTimeSideRecord(slot);
    if (record && (saved.totalPlayTimeMs || 0) >= record.totalPlayTimeMs) {
        try { localStorage.removeItem(PLAY_TIME_SIDE_KEY + slot); } catch { /* optional */ }
    }
};
/** Adds play time from the side record when it belongs to this very career and week. */
const withSidePlayTime = (slot: number | null, loaded: Player): number | null => {
    if (!slot) return null;
    const record = readPlayTimeSideRecord(slot);
    if (!record || record.name !== loaded.name || record.age !== loaded.age || record.week !== loaded.currentWeek) return null;
    return record.totalPlayTimeMs > (loaded.totalPlayTimeMs || 0) ? record.totalPlayTimeMs : null;
};
/* Zedbury Studios ident — the approved timing, kept verbatim from the design:
   the mark holds for 1150ms, then fades out over 320ms. The frame it leaves is
   black, which is already the loading screen's frame, so no transition device
   is needed between the two. */
const STARTUP_STUDIO_BUMPER_EXIT_MS = 1150;
const STARTUP_STUDIO_BUMPER_MS = STARTUP_STUDIO_BUMPER_EXIT_MS + 320;
const STARTUP_LOADING_MIN_MS = 8600;
const STARTUP_LOADING_LINE_KEYS = [
  'startup.loadingLine.actors',
  'startup.loadingLine.cinema',
  'startup.loadingLine.casting',
  'startup.loadingLine.lights',
  'startup.loadingLine.redCarpet',
  'startup.loadingLine.saves',
];
/* Perf plan (2026-11-08): the bar's fill time is unchanged. Start-up may wait up to 3 seconds past
   its usual end for the last-played career to finish reading; after that the title shows and the
   read finishes behind it. */
const STARTUP_LOADING_BAR_MS = Math.max(1400, STARTUP_LOADING_MIN_MS - STARTUP_STUDIO_BUMPER_MS - 260);
const STARTUP_CAREER_EXTRA_WAIT_MS = 3000;
/** Crash fix (19 Nov 2026), FIX-PLAN item 2.2: the ad SDK starts this long after a career is playing (then when idle). */
const ADS_AFTER_OPEN_MS = 10_000;
// Not an 'actorEmpire' key: save transfers copy those to other phones, and this belongs to this phone.
const STARTUP_SLOT_PRELOAD_GUARD_KEY = 'aeStartupSlotPreloadGuardV1';

/* Perf plan (2026-11-08): the last-played career is read and checked while the start-up bar fills,
   so tapping it opens Home at once instead of reading the save after the tap. This read only reads
   and migrates, which writes nothing: posters, a care package, purchases and any save they need still
   happen on the tap, exactly as before, and so do recovery choices and damaged saves. If a start ever
   dies during this read, the next start skips it, and a second time turns it off on this phone, so a
   career too big for the phone can never keep the game from reaching the title. */
type StartupSlotPreloadResult =
  | {
      kind: 'MIGRATED';
      migrated: Player;
      migratedFromVersion: unknown;
      needsRecoveryCheckpoint: boolean;
      // anything that makes the tap write to the disk, which needs the loading screen as before
      diskWorkOnTap: boolean;
      /** Phase 1 (2026-11-17): when the opened copy was saved, and whether the head record was not recognised. */
      savedAt: number | null;
      headFallback?: 'CURRENT' | 'PREVIOUS_NEWER';
      /** Phase 1 (2026-11-17): a load repair changed the career, so the open saves it once. */
      repaired: boolean;
      /** Phase 2a (2026-11-17): the app version that wrote the opened copy, for the recovery list. */
      appVersion: string | null;
    }
  | { kind: 'VERIFIED'; verifiedLoad: Awaited<ReturnType<typeof loadVerifiedGameData>> }
  | { kind: 'FAILED' };
type StartupSlotPreload = {
  slot: number;
  summaryKey: string;
  settled: boolean;
  result: StartupSlotPreloadResult | null;
  promise: Promise<StartupSlotPreloadResult>;
  /** Crash fix (19 Nov 2026), item 1.8: 'open' once a tap uses the read career, 'dropped' once nothing will. */
  holder?: 'open' | 'dropped';
};
/** What a dropped read leaves behind: nothing that holds a career. */
const STARTUP_PRELOAD_DROPPED: StartupSlotPreloadResult = { kind: 'FAILED' };

// The same save: any later save of that slot changes its saved time, so a stale read is never used.
const getStartupSummaryKey = (summary: SaveSlotSummary | null | undefined) => (summary
  ? [summary.storageKey || '', summary.savedAt || 0, summary.age, summary.week, summary.name].join('|')
  : '');

const pickStartupPreloadSlot = (summaries: Record<number, SaveSlotSummary | null>) => {
  let best: { slot: number; summary: SaveSlotSummary } | null = null;
  for (const slot of [1, 2, 3]) {
    const summary = summaries[slot];
    if (!summary || summary.isPendingSummary) continue;
    if ((summary.storageKind || 'indexeddb') !== 'indexeddb') continue;
    if (summary.storageKey && summary.storageKey !== `actorEmpireSave_${slot}`) continue;
    if (!best || (summary.savedAt || 0) > (best.summary.savedAt || 0)) best = { slot, summary };
  }
  return best;
};

type StartupSlotPreloadGuard = { state?: 'running' | 'idle'; slot?: number; deadStarts?: number; skipOnce?: boolean; version?: string };
const readStartupSlotPreloadGuard = (): StartupSlotPreloadGuard => {
  try {
    const raw = localStorage.getItem(STARTUP_SLOT_PRELOAD_GUARD_KEY);
    return raw ? JSON.parse(raw) as StartupSlotPreloadGuard : {};
  } catch {
    return {};
  }
};
const writeStartupSlotPreloadGuard = (guard: StartupSlotPreloadGuard) => {
  try {
    // crash fix (19 Nov 2026): the guard names the app version that wrote it (older builds ignore the field)
    localStorage.setItem(STARTUP_SLOT_PRELOAD_GUARD_KEY, JSON.stringify({ ...guard, version: APP_DISPLAY_VERSION }));
  } catch {
    // The guard is only a safety net for the next start.
  }
};
const guardDeadStarts = (guard: StartupSlotPreloadGuard) => Math.max(0, Math.round(Number(guard.deadStarts) || 0));
/* Crash fix (19 Nov 2026), qa/2026-11-19-crash-scene/FIX-PLAN.md item 1.8 (switch launchLadder). In 1.0.26-1.0.29
   the guard went back to idle as soon as the read settled, so a phone that died on the title screen or during the
   tap, with the read career held next to the start menu, never counted a dead start and the next launch read it
   again: about 3 start-menu closes per affected iPhone on 1.0.28. Now:
   - the guard stays 'running' from the claim until the read career is used (the open that took it finished or
     failed) or dropped (deleted, sent to the developer, imported over, a new career, a save of that slot, the page
     hidden);
   - hiding the page sets it idle, because a phone may close a hidden app at any time and that is not a dead start;
     showing it again sets it back while the read or the open still runs;
   - a new app version starts the count again.
   With the switch off it works as in 1.0.26-1.0.29: running only while the read runs. */
let startupGuardHeld = false;
let startupGuardSettled = false;
const startupLadderOn = () => isSwitchOn('launchLadder');
/** Once per launch, before anything reads: a guard this version left 'running' means the last launch ended while
 *  a read career was read, held on screen or opened. That is a dead start, and this launch skips the read. */
const settleStartupSlotPreloadGuard = () => {
  if (startupGuardSettled || !startupLadderOn()) return;
  startupGuardSettled = true;
  const guard = readStartupSlotPreloadGuard();
  if (guard.version !== APP_DISPLAY_VERSION) {
    if (guard.state !== undefined || guardDeadStarts(guard) > 0 || guard.skipOnce) writeStartupSlotPreloadGuard({ state: 'idle', deadStarts: 0 });
    return;
  }
  if (guard.state !== 'running') return;
  const deadStarts = guardDeadStarts(guard) + 1;
  writeStartupSlotPreloadGuard({ state: 'idle', slot: guard.slot, deadStarts, skipOnce: true });
  trackGameEvent('startup_slot_preload_skipped', { save_slot: guard.slot ?? 0, dead_starts: deadStarts });
};
// A start that ended during the read (the phone closed the game, or the player did) skips the next
// read; a second one turns the read off on this phone for good. Continue then works as before.
const claimStartupSlotPreload = (slot: number): boolean => {
  const guard = readStartupSlotPreloadGuard();
  const deadStarts = guardDeadStarts(guard);
  if (guard.state === 'running') {
    writeStartupSlotPreloadGuard({ state: 'idle', slot: guard.slot, deadStarts: deadStarts + 1, skipOnce: true });
    trackGameEvent('startup_slot_preload_skipped', { save_slot: guard.slot ?? 0, dead_starts: deadStarts + 1 });
    return false;
  }
  if (guard.skipOnce || deadStarts >= 2) return false;
  writeStartupSlotPreloadGuard({ state: 'running', slot, deadStarts });
  // no read without its safety net: a phone that could not store the mark gets no read
  startupGuardHeld = readStartupSlotPreloadGuard().state === 'running';
  return startupGuardHeld;
};

// The read career was used or dropped (with launchLadder off: the read finished). Keep the count of dead starts only.
const releaseStartupSlotPreload = () => {
  if (!startupGuardHeld) return;
  startupGuardHeld = false;
  const guard = readStartupSlotPreloadGuard();
  const deadStarts = guardDeadStarts(guard);
  if (guard.state === undefined && !deadStarts) return;
  writeStartupSlotPreloadGuard({ state: 'idle', deadStarts });
};
// Crash fix (19 Nov 2026), item 1.8: hidden, the guard is idle (a closed hidden app is not a dead start); shown, it
// counts again while the read career is still being read, held or opened.
const pauseStartupSlotPreloadGuard = () => {
  if (!startupGuardHeld || !startupLadderOn()) return;
  const guard = readStartupSlotPreloadGuard();
  if (guard.state === 'running') writeStartupSlotPreloadGuard({ ...guard, state: 'idle' });
};
const resumeStartupSlotPreloadGuard = () => {
  if (!startupGuardHeld || !startupLadderOn()) return;
  const guard = readStartupSlotPreloadGuard();
  if (guard.state !== 'running') writeStartupSlotPreloadGuard({ ...guard, state: 'running' });
};
/* Crash fix (19 Nov 2026), FIX-PLAN item 2.1 (switch launchPreload, decision 2): the start menu reads a career only
   where it fits. 1.0.26-1.0.29 read and migrated the last career under the logo on every phone; with a big career
   the start menu needed about 3x the memory of playing it (JS heap 353 MB against 84 MB with no career, Chromium at
   CPU 4x), and that is where phones closed the game. Now the read runs only when the phone's real memory class
   (services/deviceMemoryClass.ts) and the slot's last saved size (Phase 1's per-slot save record, in
   saveSizeUnits) fit the table below. Everywhere else Continue reads the career on the tap behind the loading
   screen, as in 1.0.25 and on the guard's skip path, so game results are the same either way.
   - 8 GB phones and up (6_8, 8p): any size; they stay instant even for big careers (decision 2).
   - 4 GB and 6 GB phones (3_4, 4_6, which hold every 4 GB and 6 GB iPhone): up to about 15 MB. Nine careers measured
     on 19 Nov: about 950 units at 0.1 MB, 11,600-15,600 at 7-8 MB, 116,000 at 35 MB and 245,000-320,000 at
     63-76 MB, so 32,000 units is about 15 MB.
   - under 3 GB, or memory unknown: never.
   A slot with no save record is not read: that is every slot on the first launch of 1.0.30, the heaviest launch
   after an update. The switch's limits (units by class: 0 never, a negative number no limit) change the table from
   Firebase; the switch off reads on every phone again, as before. */
const STARTUP_PRELOAD_MAX_UNITS: Record<string, number> = { lt3: 0, '3_4': 32_000, '4_6': 32_000, '6_8': -1, '8p': -1, unknown: 0 };
type StartupPreloadDecision = { read: boolean; why: 'fits' | 'switch_off' | 'hidden' | 'ram' | 'no_size' | 'size'; ramClass: string; units: number };
const decideStartupPreload = (slot: number): StartupPreloadDecision => {
  const ramClass = getRamClass();
  const units = Math.round(Number(readSaveWriteRecord(`actorEmpireSave_${slot}`)?.units) || 0);
  // a page loaded in the background (Android can recreate the game there) never reads a career
  if (document.visibilityState === 'hidden') return { read: false, why: 'hidden', ramClass, units };
  if (!isSwitchOn('launchPreload')) return { read: true, why: 'switch_off', ramClass, units };
  const limit = getSwitchLimit('launchPreload', ramClass, STARTUP_PRELOAD_MAX_UNITS[ramClass] ?? 0);
  if (limit === 0) return { read: false, why: 'ram', ramClass, units };
  if (!(units > 0)) return { read: false, why: 'no_size', ramClass, units };
  if (limit > 0 && units > limit) return { read: false, why: 'size', ramClass, units };
  return { read: true, why: 'fits', ramClass, units };
};
/* Crash fix (19 Nov 2026), item 1.8 (switch launchLadder): a launch right after the phone closed the game (the
   previous session of this version ended while open, less than 10 minutes ago, in any phase) does not read a
   career at start-up even where it would fit. The phone has just run out of memory, and an automatic restart must
   not repeat what came before. */
const LIGHT_START_WINDOW_MS = 10 * 60_000;
const isLightStartAfterDeath = (previous: { version?: string; at?: number } | null): boolean => (
  !!previous && startupLadderOn() && previous.version === APP_DISPLAY_VERSION
  && Date.now() - Number(previous.at || 0) < LIGHT_START_WINDOW_MS
);
// A career opened the normal way after a skipped read: the next start may read again.
const clearStartupSlotPreloadSkip = () => {
  const guard = readStartupSlotPreloadGuard();
  if (!guard.skipOnce) return;
  writeStartupSlotPreloadGuard({ ...guard, skipOnce: false });
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
        // Hydration must retain paid receipts, costs, signed beneficiaries and
        // settlement metadata added after this legacy defaults list was written.
        ...release,
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
    ...(commitment.careerBalanceVersion === 1 ? { careerBalanceVersion: 1 as const } : {}),
    ...(commitment.careerLearningActions !== undefined ? { careerLearningActions: commitment.careerLearningActions } : {}),
    ...(commitment.careerRewardPacingVersion === 1 ? { careerRewardPacingVersion: 1 as const } : {}),
    ...(commitment.careerLearningWeek !== undefined ? { careerLearningWeek: commitment.careerLearningWeek } : {}),
    ...(commitment.careerLearningActionsThisWeek !== undefined ? { careerLearningActionsThisWeek: commitment.careerLearningActionsThisWeek } : {}),
    ...(commitment.careerPerformanceFinalized !== undefined ? { careerPerformanceFinalized: commitment.careerPerformanceFinalized } : {}),
    ...(commitment.careerPreparationScore !== undefined ? { careerPreparationScore: commitment.careerPreparationScore } : {}),
    ...(commitment.lumpSum !== undefined ? { lumpSum: commitment.lumpSum } : {}),
    ...(commitment.weeklyCost !== undefined ? { weeklyCost: commitment.weeklyCost } : {}),
    ...(commitment.upfrontCost !== undefined ? { upfrontCost: commitment.upfrontCost } : {}),
    ...(commitment.roleType !== undefined ? { roleType: commitment.roleType } : {}),
    ...(commitment.projectPhase !== undefined ? { projectPhase: commitment.projectPhase } : {}),
    ...(commitment.phaseWeeksLeft !== undefined ? { phaseWeeksLeft: commitment.phaseWeeksLeft } : {}),
    ...(commitment.totalPhaseDuration !== undefined ? { totalPhaseDuration: commitment.totalPhaseDuration } : {}),
    /* #291: a shoot's real length, and how far it has got, survive a reload (a good crew's shorter shoot, the week a studio's issue is due) */
    ...(commitment.productionCalendar !== undefined ? { productionCalendar: commitment.productionCalendar } : {}),
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
    /* #300: both were lost on every load: a job's translated name, and who is owed an actor's royalties */
    ...(commitment.nameKey !== undefined ? { nameKey: commitment.nameKey } : {}),
    ...(commitment.actorRoyaltyPayeeId !== undefined ? { actorRoyaltyPayeeId: commitment.actorRoyaltyPayeeId } : {}),
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

type GameErrorBoundaryProps = {
    onRecover: () => void;
    /** 2026-11-17: sends a report with the caught error (RecoveryModeScreen). */
    onReport?: (error: { message: string; stack: string }) => RecoveryReportHandle | null;
    children: React.ReactNode;
};
type GameErrorBoundaryState = { hasError: boolean; errorMessage: string; errorStack: string };

export class GameErrorBoundary extends React.Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
    declare props: GameErrorBoundaryProps;
    declare setState: (state: Partial<GameErrorBoundaryState>) => void;
    state: GameErrorBoundaryState = { hasError: false, errorMessage: '', errorStack: '' };

    constructor(props: GameErrorBoundaryProps) {
        super(props);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info?: React.ErrorInfo) {
        console.error('Game render crash recovered by boundary:', error);
        /* Crash fix (19 Nov 2026), FIX-PLAN item 1.11: the error's own stack (where it was thrown) goes with the report
           too. 1.0.29's reports carried React's component stack only, which names the screen but not the line. */
        const thrownAt = String(error?.stack || '').trim();
        recordNonFatal(error, 'react_render_boundary_recovered', { error_stack: thrownAt.replace(/\s+/g, ' ').slice(0, 480) });
        noteStoreReviewTrouble('recovery_mode');
        this.setState({
            errorMessage: String(error?.message || error || 'unknown').slice(0, 300),
            errorStack: [thrownAt.slice(0, 700), String(info?.componentStack || '').trim().slice(0, 700)].filter(Boolean).join('\n--\n'),
        });
    }

    handleRecover = () => {
        this.props.onRecover();
        this.setState({ hasError: false, errorMessage: '', errorStack: '' });
    };

    render() {
        if (this.state.hasError) {
            const { onReport } = this.props;
            return <RecoveryModeScreen onRecover={this.handleRecover}
                onSendReport={onReport ? () => onReport({ message: this.state.errorMessage, stack: this.state.errorStack }) : undefined} />;
        }

        return this.props.children;
    }
}

export const App: React.FC = () => {
  const [player, setPlayerState] = useState<Player>(() => migratePlayerSave(INITIAL_PLAYER));
  /* 2026-11-12: playerRef is the newest player handed to React, set the moment it is handed over. The once-a-minute
     play-time count, leaving the app and the memory checkpoint build on it or save it. It used to be set by an
     effect after the next render, so a minute landing between a new week (or any change) and that effect wrote the
     older player back: the screen went back a week while the save held the new one (seen on a Redmi, reproduced
     every time in the browser). Updaters run here, in order, on that newest player, as React would run them. */
  const playerRef = useRef(player);
  /* Phase 1 of the week-speed plan (2026-11-17), for the ANRs: every player handed to React gets the next change
     number, except a play-time-only count. A save notes the number its player carried, per slot. Leaving the app
     with no change since that slot's last durable save then writes only play time to a tiny side record, instead
     of a full-career save while Android is stopping the window. */
  const changeCountRef = useRef(0);
  const changeCountOfPlayerRef = useRef(new WeakMap<object, number>());
  const durableChangeCountRef = useRef<Record<number, number>>({});
  /** Phase 1 (2026-11-17): per slot, the saves being written now and the highest change number they carry. While
   *  one carries every change, a hide or a memory warning needs no second save (one save at a time at a hide). */
  const savingChangeCountRef = useRef<Record<number, { saves: number; carried: number }>>({});
  /** Phase 1 (2026-11-17), the purchase ledger: when the copy each slot opened from was saved, and one token per
   *  career open, so the ledger is checked once after every open (and after every recovery). */
  const openedCopySavedAtRef = useRef<Record<number, number>>({});
  /** Phase 1 (2026-11-17), telemetry v2: when the last week appeared (null: none since this career opened), and the
   *  game's stored MB when it opened. */
  const lastWeekOnScreenAtRef = useRef<number | null>(null);
  /** Phase 1 (2026-11-17): lost weeks found by the open in progress (null: it has not opened a career). */
  const openLostWeeksRef = useRef<number | null>(null);
  const storageMbRef = useRef<number | null>(null);
  const ledgerOpenTokenRef = useRef<string | null>(null);
  const ledgerCheckedTokenRef = useRef<string | null>(null);
  /** Phase 1 (2026-11-17), plan item 2: the career a slot just opened, when it equals that slot's stored copy (nothing
   *  repaired, or the repair already saved). If the hydration on entering PLAYING then changes nothing either, the
   *  open counts as saved: no full save just for opening a career. */
  const openedCleanRef = useRef<{ slot: number; player: Player } | null>(null);
  /** Phase 1 (2026-11-17), telemetry v2: the player's actions since the last week appeared, split by WORLD_FACT_KEYS. */
  const actionsSinceWeekRef = useRef({ world: 0, other: 0 });
  const setPlayer = useCallback((next: React.SetStateAction<Player>, options?: { playTimeOnly?: boolean }) => {
      const before = playerRef.current;
      const value = typeof next === 'function' ? next(before) : next;
      if (!options?.playTimeOnly) {
          changeCountRef.current += 1;
          const touchesWorld = WORLD_FACT_KEYS.some(key => (before as any)?.[key] !== (value as any)?.[key]);
          if (touchesWorld) actionsSinceWeekRef.current.world += 1; else actionsSinceWeekRef.current.other += 1;
      }
      changeCountOfPlayerRef.current.set(value, changeCountRef.current);
      playerRef.current = value;
      setPlayerState(value);
  }, []);
  /** True when the live career has no change that this slot's last durable save did not carry. */
  const isSlotDurable = (slot: number | null): boolean => !!slot
      && changeCountRef.current <= (durableChangeCountRef.current[slot] ?? -1);
  const isSlotDurableOrSaving = (slot: number | null): boolean => !!slot && (isSlotDurable(slot)
      || changeCountRef.current <= (savingChangeCountRef.current[slot]?.carried ?? -1));
  /** Runs one slot write, noted as in flight with the change number its player carries (see savingChangeCountRef). */
  const trackSlotWrite = async <T,>(slot: number, carriedPlayer: Player, kind: PageSaveKind, write: () => Promise<T>): Promise<T> => {
      const carried = changeCountOfPlayerRef.current.get(carriedPlayer) ?? -1;
      const before = savingChangeCountRef.current[slot] || { saves: 0, carried: -1 };
      savingChangeCountRef.current[slot] = { saves: before.saves + 1, carried: Math.max(before.carried, carried) };
      const ended = notePageSaveStarted(kind);
      try {
          // Phase 1 (2026-11-17), plan item 6: on iOS the write runs inside a native background task.
          return await withNativeBackgroundTask(write);
      } finally {
          ended();
          const now = savingChangeCountRef.current[slot];
          if (now && now.saves <= 1) delete savingChangeCountRef.current[slot];
          else if (now) savingChangeCountRef.current[slot] = { saves: now.saves - 1, carried: now.carried };
      }
  };
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [lifestyleInitialView, setLifestyleInitialView] = useState<'MAIN' | 'ASSETS' | 'ACTIVITIES' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING_PLATFORM' | 'STREAMING_FINANCE' | 'STREAMING_STATUS' | 'STREAMING_TEAM' | 'STREAMING_OWNERSHIP' | 'STREAMING_SLATE' | 'STREAMING_RIGHTS' | null>(null);
  const [rightsMarketOpportunityId, setRightsMarketOpportunityId] = useState<string | null>(null);
  const [streamingContentOfferId, setStreamingContentOfferId] = useState<string | null>(null);
  const [studioContinuationTarget, setStudioContinuationTarget] = useState<{ studioId: string; scriptId: string } | null>(null);
  const [platformCommissionTarget, setPlatformCommissionTarget] = useState<{ studioId: string; offerId: string } | null>(null);
  const [initialForbesStudioId, setInitialForbesStudioId] = useState<string | null>(null);
  const [initialMobileStockId, setInitialMobileStockId] = useState<string | null>(null);
  const [initialMobileAppMode, setInitialMobileAppMode] = useState<'BOXOFFICE' | 'MESSAGES' | 'BANK' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  /* B5 (2026-11-15): Android's back button closed the game. It now closes what is open, else goes back the way the
     screen's own back arrow does, else Home, and on Home asks "Exit the game?" (services/hardwareBack.ts). */
  const [exitPromptOpen, setExitPromptOpen] = useState(false);
  const hardwareBackStateRef = useRef({ page: Page.HOME as Page, busy: false });
  hardwareBackStateRef.current = { page: activePage, busy: isProcessing };
  useEffect(() => {
    const onBack = () => runHardwareBack({
      onHome: hardwareBackStateRef.current.page === Page.HOME,
      goHome: () => setActivePage(Page.HOME),
      askExit: () => setExitPromptOpen(true),
      busy: hardwareBackStateRef.current.busy,
    });
    const testHook = window as unknown as { __aeHardwareBack?: () => string };
    testHook.__aeHardwareBack = onBack;
    if (Capacitor.getPlatform() !== 'android') return () => { delete testHook.__aeHardwareBack; };
    const listener = CapacitorApp.addListener('backButton', () => { onBack(); });
    return () => {
      delete testHook.__aeHardwareBack;
      void listener.then(handle => handle.remove()).catch(() => undefined);
    };
  }, []);
  const weekProcessingLockRef = useRef(false);
  /* Perf plan Phase 3 (2026-11-09): from the tap on Age Up Week until the processed week reaches the game,
     a tap that changes the career would be overwritten when the week lands. Those taps wait; the main
     navigation still answers, since changing tabs changes no save. Ends before any popup or ad. */
  const weekTapGuardRef = useRef(false);
  useEffect(() => {
    const holdTap = (event: Event) => {
      if (!weekTapGuardRef.current) return;
      const target = event.target as Element | null;
      if (target && typeof target.closest === 'function' && target.closest('nav[aria-label="Primary game navigation"]')) return;
      event.stopPropagation();
      event.preventDefault();
    };
    document.addEventListener('click', holdTap, true);
    return () => document.removeEventListener('click', holdTap, true);
  }, []);
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
  const [safeBootRequested] = useState(() => {
      try {
          const requested = sessionStorage.getItem(SAFE_BOOT_SESSION_KEY) === '1';
          if (requested) sessionStorage.removeItem(SAFE_BOOT_SESSION_KEY);
          return requested;
      } catch {
          return false;
      }
  });
  // Crash fix (19 Nov 2026), item 1.8: read before the mount effect marks this session live (isLightStartAfterDeath).
  const [lightStartAfterDeath] = useState(() => isLightStartAfterDeath(takeUncleanPreviousSession()));
  const [startupStudioBumperElapsed, setStartupStudioBumperElapsed] = useState(false);
  const [startupStudioBumperExiting, setStartupStudioBumperExiting] = useState(false);
  const [startupMinimumElapsed, setStartupMinimumElapsed] = useState(false);
  const [startupCareerSettled, setStartupCareerSettled] = useState(false);
  const [startupSavesListed, setStartupSavesListed] = useState(false);
  const startupSlotPreloadRef = useRef<StartupSlotPreload | null>(null);
  const slotOpenInProgressRef = useRef(false);
  const startupPreloadDecisionSentRef = useRef(false);
  /* Crash fix (19 Nov 2026), FIX-PLAN item 1.7: the start menu's phase in the "still open" marker, so a phone that
     closes the game there says when: loading (the logos and the bar), preload (reading a career), held (a read
     career kept for Continue), title (the menu, nothing held) or open:<slot> (the tap, until the career plays). */
  const gameStatusRef = useRef(gameStatus);
  gameStatusRef.current = gameStatus;
  const startupLoadingVisibleRef = useRef(true);
  const openingSlotRef = useRef<number | null>(null);
  const startPhaseRef = useRef('');
  const refreshStartPhase = () => {
      if (gameStatusRef.current !== 'START_MENU') { startPhaseRef.current = ''; return; }
      const entry = startupSlotPreloadRef.current;
      const phase = openingSlotRef.current ? `START_MENU:open:${openingSlotRef.current}`
          : entry && !entry.settled ? 'START_MENU:preload'
          : entry ? 'START_MENU:held'
          : startupLoadingVisibleRef.current ? 'START_MENU:loading' : 'START_MENU:title';
      if (phase === startPhaseRef.current) return;
      startPhaseRef.current = phase;
      noteSessionPhase(phase);
      addBreadcrumb('startup:phase', { phase });
  };
  /* Crash fix (19 Nov 2026), item 1.8: the start menu lets go of its read career (deleted, imported over, sent to
     the developer, a new career, a save of that slot, the page hidden). A read still running is let go when it
     settles. Nothing is lost: a tap reads the career again. */
  const dropStartupSlotPreload = () => {
      const entry = startupSlotPreloadRef.current;
      startupSlotPreloadRef.current = null;
      if (!entry) return;
      entry.holder = 'dropped';
      if (!entry.settled) return;
      entry.result = null;
      entry.promise = Promise.resolve(STARTUP_PRELOAD_DROPPED);
      releaseStartupSlotPreload();
      refreshStartPhase();
  };

  // UI States
  const [toastMessage, setToastMessage] = useState<{title: string, subtext: string, tone?: 'warning'} | null>(null);
  const [activePressEvent, setActivePressEvent] = useState<{ project: Commitment, questions: PressInteraction[] } | null>(null);
  const [showProtectionPrompt, setShowProtectionPrompt] = useState<{ partnerId: string, partnerName: string } | null>(null);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isFullBleedMobileSurface, setIsFullBleedMobileSurface] = useState(false);
  const [activeSocialEvent, setActiveSocialEvent] = useState<{ event: SocialEvent, partnerId: string } | null>(null);
  const [pendingBabyNaming, setPendingBabyNaming] = useState<PendingBabyNaming | null>(null);
  const [pendingMedicalPrompt, setPendingMedicalPrompt] = useState<PendingMedicalPrompt | null>(null);
  const [pendingSaveRecovery, setPendingSaveRecovery] = useState<PendingSaveRecovery | null>(null);
  const [isRecoveringSave, setIsRecoveringSave] = useState(false);
  const [pendingWeekProcessingFailure, setPendingWeekProcessingFailure] = useState<PendingWeekProcessingFailure | null>(null);
  const [isExportingWeekBackup, setIsExportingWeekBackup] = useState(false);
  const [babyFirstNameInput, setBabyFirstNameInput] = useState('');
  const [babySurnameChoice, setBabySurnameChoice] = useState('');
  const [deathScreenPreviewPlayer, setDeathScreenPreviewPlayer] = useState<Player | null>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const latestChangelogEntry = getLatestChangelogEntry();
  const previousChangelogEntries = CHANGELOG_ENTRIES.filter(entry => entry.version !== latestChangelogEntry.version);
  const isStartupLoadingVisible = isInitializing || !startupMinimumElapsed || !startupCareerSettled;
  startupLoadingVisibleRef.current = isStartupLoadingVisible;
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
  const autosaveTimerRef = useRef<number | null>(null);
  const autosaveDueRef = useRef(false);
  /* 1.0.27: how long this device's last autosave took, and since when changes have waited (getAutosaveDelayMs) */
  const lastAutosaveMsRef = useRef(0);
  const firstUnsavedChangeAtRef = useRef<number | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const purchaseUpdateHandlerRef = useRef<(update: IOSPurchaseUpdate) => void>(() => {});
  /* iOS purchases StoreKit hands over outside a purchase tap (Ask to Buy approved later, a purchase finished while the
     app was away, or one left open by a crash) arrive at start-up, often before a career is loaded. They wait here
     until a career is playing; then each is granted once, saved, and only then finished with StoreKit. */
  const pendingIOSPurchaseUpdatesRef = useRef<IOSPurchaseUpdate[]>([]);
  const [iosPurchaseUpdatesWaiting, setIosPurchaseUpdatesWaiting] = useState(0);
  /* Android: Play reported a purchase with none open in the game (a pending payment completed); collected like Restore */
  const [androidPurchaseUpdatesWaiting, setAndroidPurchaseUpdatesWaiting] = useState(0);
  const weekAheadRef = useRef<WeekAheadClient | null>(null);
  const weekAheadFocusRef = useRef(false);
  const [weekAheadOn, setWeekAheadOn] = useState(false);
  const rewardAdGrantInFlightRef = useRef<Set<string>>(new Set());
  /* 2026-11-12 (F9): a session that ended while the game was open (a memory kill) is reported once on
     the next start, with its last screen, save time and memory (services/sessionBreadcrumb.ts) */
  useEffect(() => {
    // Crash fix (19 Nov 2026), item 1.9: learn the phone's real memory (kept for the next launches' gates).
    void getNativeDeviceInfo().then(device => rememberNativeMemoryGiB(device?.totalMemGb));
    const previous = takeUncleanPreviousSession();
    // store ratings: count this start; a session that ended by itself holds the rating ask back
    noteStoreReviewSession();
    if (previous) noteStoreReviewTrouble('session_ended_unexpectedly');
    if (previous) {
      /* Phase 1 (2026-11-17): a kill while Week Ahead ran keeps it off for that slot until the next app version (its
         worker's copy of the career may be what the phone could not hold). */
      const killedSlot = Number(previous.slot) > 0 ? Number(previous.slot) : 0;
      if (previous.weekAhead === 'on' && killedSlot > 0 && previous.version === APP_DISPLAY_VERSION) {
        try { localStorage.setItem(WEEK_AHEAD_KILLED_KEY + killedSlot, APP_DISPLAY_VERSION); } catch { /* optional */ }
        addBreadcrumb('week_ahead:off_after_kill', { slot: killedSlot });
      }
      /* Crash fix (19 Nov 2026), FIX-PLAN item 1.7: the slot's size (its last save, in saveSizeUnits), whether that
         session had started light, and how this page was loaded (reload: the iOS web view restarted by itself). */
      const killedUnits = killedSlot > 0 ? Math.round(Number(readSaveWriteRecord(`actorEmpireSave_${killedSlot}`)?.units) || -1) : -1;
      const bootNav = (window as Window & { __aeNavType?: string; __aeSelfReload?: boolean });
      const navLabel = bootNav.__aeSelfReload ? 'self' : String(bootNav.__aeNavType || 'unknown').slice(0, 12);
      // Phase 1 (2026-11-17): the native shells name the phone model and its memory (services/nativeSupport.ts).
      void getNativeDeviceInfo().then(device => recordNonFatal(new Error('The previous session ended while the game was open'), 'session_ended_unexpectedly', {
        last_screen: previous.screen || 'unknown',
        last_week: previous.week || 'unknown',
        last_save_ms: previous.lastSaveMs ?? -1,
        last_heap_mb: previous.heapMb ?? -1,
        minutes_ago: Math.round((Date.now() - previous.at) / 60_000),
        last_version: previous.version || 'unknown',
        /* Phase 1 (2026-11-17), for the Week Ahead gate: Week Ahead's state, the slot, the game's stored MB (both copies
           of every slot) and the phone model, as one key because the Crashlytics key budget is nearly full. */
        ended_ctx: `wa=${previous.weekAhead || 'off'};slot=${killedSlot};store_mb=${previous.storageMb ?? -1};model=${device?.model || getDevicePhoneModel()};mem_gb=${device?.totalMemGb ?? -1};units=${killedUnits};light=${previous.light ? 1 : 0};nav=${navLabel};ram=${getRamClass()}`,
      }));
    }
    /* Crash fix (19 Nov 2026), item 1.7: a reload the game did not ask for is the web view starting again by itself
       (on iOS, after the phone closed it); counted on its own, with what the marker said before. */
    {
      const bootNav = (window as Window & { __aeNavType?: string; __aeSelfReload?: boolean });
      if (bootNav.__aeNavType === 'reload' && !bootNav.__aeSelfReload) {
        trackGameEvent('webview_reloaded', { last_screen: String(previous?.screen || 'none').slice(0, 40), unclean: previous ? 1 : 0 });
      }
    }
    noteSessionLive({ version: APP_DISPLAY_VERSION, weekAhead: 'off', light: lightStartAfterDeath });
    // Crash fix (19 Nov 2026), item 1.7: a page started in the background (Android can) is not marked open until shown.
    if (document.visibilityState === 'hidden') noteSessionClean();
    /* Phase 1 (2026-11-17), plan item 8: read the switches for the next launch. Crash fix (19 Nov 2026), item 1.7:
       2.5 s after start instead of 15 s, so a phone the game keeps closing within seconds still gets the switches
       that would help it (the read is one small document, with its own time limit). */
    const switchesTimer = window.setTimeout(() => {
      void fetchRemoteSwitchesForNextLaunch().catch(error => addBreadcrumb('switches:read_failed', { message: String((error as Error)?.message || error).slice(0, 80) }));
    }, 2_500);
    const onVisibility = () => {
      // Phase 1 (2026-11-17): the hide breadcrumb's line for this moment (services/pageStateBreadcrumb.ts).
      notePageHiddenOrMemory(document.visibilityState === 'hidden' ? 'hide' : 'show', { stage: weekProcessingLockRef.current ? activeWeekStageRef.current : undefined });
      if (document.visibilityState === 'hidden') noteSessionClean(); else noteSessionLive();
      /* Crash fix (19 Nov 2026), item 1.8: hidden, the start-up guard rests and the start menu lets go of a read
         career (a tap reads it again); a read still running is let go when it settles, if the page is still hidden. */
      if (document.visibilityState === 'hidden') {
        pauseStartupSlotPreloadGuard();
        const held = startupSlotPreloadRef.current;
        if (held?.settled && startupLadderOn()) dropStartupSlotPreload();
      } else {
        resumeStartupSlotPreloadGuard();
      }
    };
    /* Crash fix (19 Nov 2026), item 1.8: a page that is closed or reloaded on purpose (pagehide) is not a dead start
       either, even where no visibilitychange came first. A phone killing the game sends neither. */
    const onPageHide = () => { noteSessionClean(); pauseStartupSlotPreloadGuard(); };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.clearTimeout(switchesTimer);
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
  // Phase 1 (2026-11-17): the faces drawn so far are the game code's own (Week Ahead's worker gets these at start).
  useEffect(() => { markPortraitLoadDone(); }, []);
  /* Crash fix (19 Nov 2026), item 1.7: the phase follows the loading screen; and once per launch, how long start-up
     took (page start to the game's first draw, then to the menu), by RAM class. */
  const firstDrawAtRef = useRef(Date.now());
  const startupTimingSentRef = useRef(false);
  useEffect(() => {
    refreshStartPhase();
    if (isStartupLoadingVisible || startupTimingSentRef.current || gameStatus !== 'START_MENU') return;
    startupTimingSentRef.current = true;
    const bootAt = Number((window as Window & { __aeBootAt?: number }).__aeBootAt) || 0;
    trackGameEvent('startup_timing', {
      boot_to_mount_ms: bootAt ? Math.max(0, firstDrawAtRef.current - bootAt) : -1,
      mount_to_title_ms: Math.max(0, Date.now() - firstDrawAtRef.current),
      ram_class: getRamClass(),
      light: lightStartAfterDeath ? 1 : 0,
    });
  }, [isStartupLoadingVisible]);
  useEffect(() => {
    // Crash fix (19 Nov 2026), item 1.7: the start menu's phase, or the screen; a hidden page stays marked closed.
    if (gameStatus === 'START_MENU') refreshStartPhase(); else noteSessionPhase(gameStatus);
    // Crash fix (19 Nov 2026), item 1.8: leaving the start menu for a new career lets go of its read career (an open
    // takes it before PLAYING, so only a career nobody will use is dropped here).
    if (gameStatus !== 'START_MENU' && startupSlotPreloadRef.current) dropStartupSlotPreload();
  }, [gameStatus]);
  /* Store ratings (services/storeReview.ts): a week's happy moment waits here for a calm Home screen (no popup, no
     ad, no week running), then the store's own popup is asked, unless the rules hold it back by then. */
  const pendingReviewMomentRef = useRef<{ moment: StoreReviewMoment; at: number } | null>(null);
  const [reviewMomentTick, setReviewMomentTick] = useState(0);
  const reviewCalm = gameStatus === 'PLAYING' && activePage === Page.HOME && !isProcessing && !isShowingAd
    && !pendingWeekProcessingFailure && !pendingSaveRecovery && !player.pendingEvent && !(player.pendingEvents?.length);
  useEffect(() => {
    if (!pendingReviewMomentRef.current || !reviewCalm) return;
    // Only while a moment waits (at most 10 minutes): once a second, until no sheet or popup has been open for 2 s.
    let calmSince = 0;
    const timer = window.setInterval(() => {
      const pending = pendingReviewMomentRef.current;
      if (!pending || Date.now() - pending.at > 10 * 60_000) {
        pendingReviewMomentRef.current = null;
        window.clearInterval(timer);
        return;
      }
      // A sheet counts as open when it is on screen and can be touched. Closed sheets stay in the page, slid down and
      // untouchable (pointer-events: none, inherited from their wrapper), like Home's energy ledger.
      const sheetOpen = [...document.querySelectorAll('[aria-modal="true"], [role="dialog"]')].some(element => {
        const box = element.getBoundingClientRect();
        const style = window.getComputedStyle(element);
        return box.width > 0 && box.height > 0 && box.bottom > 0 && box.top < window.innerHeight - 1
          && box.right > 0 && box.left < window.innerWidth
          && style.visibility !== 'hidden' && style.pointerEvents !== 'none' && Number(style.opacity) > 0.05;
      });
      // never over an ad (week break, task break, rewarded) or this soon after one; the rating then waits its turn
      if (sheetOpen || isAdOnScreen() || msSinceLastAd() < STORE_REVIEW_RULES.quietAfterAdMs) { calmSince = 0; return; }
      if (!calmSince) { calmSince = Date.now(); return; }
      if (Date.now() - calmSince < 2000) return;
      window.clearInterval(timer);
      pendingReviewMomentRef.current = null;
      const hold = storeReviewHoldReason(readStoreReviewState(), Date.now());
      if (hold) {
        trackGameEvent('review_prompt_held', { trigger: pending.moment, reason: hold });
        return;
      }
      // no forced ad lands right after the rating popup (forcedAds: RATING)
      if (requestStoreReview(pending.moment)) noteRatingAsked();
    }, 1000);
    return () => window.clearInterval(timer);
  }, [reviewCalm, reviewMomentTick]);
  useEffect(() => {
    if (!currentSlot) return;
    noteSessionLive({ slot: currentSlot });
    /* Phase 1 (2026-11-17): the game's stored data, for the Week Ahead gate (phone model x career size). One cheap
       estimate per opened career; it counts both copies of every slot. */
    void navigator.storage?.estimate?.().then(estimate => {
      if (estimate && typeof estimate.usage === 'number') {
        const storageMb = Math.round(estimate.usage / 100_000) / 10;
        storageMbRef.current = storageMb;
        noteSessionDetail({ storageMb });
      }
    }).catch(() => { /* optional */ });
  }, [currentSlot]);
  useEffect(() => { notePageScreen(gameStatus === 'PLAYING' ? Page[activePage] || String(activePage) : gameStatus); }, [gameStatus, activePage]);
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

  const activePlayStartedAtRef = useRef<number | null>(null);

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
  /** Phase 1 (2026-11-17), the purchase ledger: paid consumables granted to this slot's career, written before the save
   *  that carries them. A failed ledger write never blocks the grant or its save (it is a safety net). */
  const recordConsumableGrants = (slot: number | null | undefined, careerId: string, grants: Array<{ transactionId?: string; productId: PremiumProductId }>): Promise<void> => {
      const at = Date.now();
      const entries: PurchaseLedgerEntry[] = grants
          .filter(grant => !!grant.transactionId && !isNonConsumablePremiumProduct(grant.productId))
          .map(grant => ({ transactionId: grant.transactionId as string, productId: grant.productId, slot: slot || 0, careerId, at }));
      if (!slot || entries.length === 0) return Promise.resolve();
      return addPurchaseLedgerEntries(entries).catch(error => recordNonFatal(error, 'purchase_ledger_write_failed', { count: entries.length }));
  };
  const markProcessedStoreTransaction = (state: Player, transactionId?: string) => {
      if (!transactionId) return;
      const processedIOSStoreTransactionIds = getProcessedStoreTransactionIds(state);
      if (!processedIOSStoreTransactionIds.includes(transactionId)) {
          state.flags.processedIOSStoreTransactionIds = [...processedIOSStoreTransactionIds, transactionId].slice(-80);
      }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setStartupMinimumElapsed(true), STARTUP_LOADING_MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const exitTimer = window.setTimeout(() => setStartupStudioBumperExiting(true), STARTUP_STUDIO_BUMPER_EXIT_MS);
    const timer = window.setTimeout(() => setStartupStudioBumperElapsed(true), STARTUP_STUDIO_BUMPER_MS);
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(timer);
    };
  }, []);

  // Perf plan (2026-11-08): the bar's clock lives in StartupLoadingBar. Start-up waits at most
  // STARTUP_CAREER_EXTRA_WAIT_MS past its usual end for the last-played career.
  useEffect(() => {
    if (!startupMinimumElapsed || startupCareerSettled) return;
    const timer = window.setTimeout(() => setStartupCareerSettled(true), STARTUP_CAREER_EXTRA_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [startupMinimumElapsed, startupCareerSettled]);

  const preparePlayerForPersistence = (nextPlayer: Player): Player => compactPlayerForPersistence(nextPlayer);
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
      return getBabySurnameChoices(player.name, partnerName).map(option => ({
          ...option,
          label: option.id === 'PLAYER'
              ? tr('app.babyNaming.yourSurname')
              : option.id === 'PARTNER'
                  ? tr('app.babyNaming.partnerSurname', { name: getGivenName(partnerName) })
                  : tr('app.babyNaming.bothSurnames'),
      }));
  };
  const persistSlotSave = async (
      slot: number,
      nextPlayer: Player,
      options: {
          rethrow?: boolean;
          weekDiagnostic?: { runId: string; screen: string; onStage?: (stage: string) => void };
          reason?: SaveIntegrityReason;
          currentIsUnverified?: boolean;
          sourceByteEstimate?: number;
          /** Internal: this is the one retry after a failed write. */
          retriedWrite?: boolean;
          /** Phase 1 (2026-11-17): what kind of save this is, for the hide breadcrumb. */
          saveKind?: PageSaveKind;
          /** Week Ahead: nextPlayer is already prepared (compacted and signed) by the worker with this manifest;
           *  alreadyWritten: the worker also wrote it as this slot's save (read back and checked there). */
          preparedWeek?: { manifest: SaveIntegrityManifest; retainPrevious: boolean; needsRecoveryCheckpoint: boolean; alreadyWritten?: boolean };
      } = {}
  ): Promise<Player> => {
      if (options.weekDiagnostic) {
          options.weekDiagnostic.onStage?.('persist_prepare_start');
          markWeekProcessingStage('persist_prepare_start', nextPlayer, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
      }
      let prepared: ReturnType<typeof prepareVerifiedPlayerForPersistence>;
      try {
          prepared = options.preparedWeek
              ? {
                  player: nextPlayer,
                  manifest: options.preparedWeek.manifest,
                  comparison: { ok: true },
                  estimatedSourceBytes: null,
                  oversizedLegacy: false,
                  retainPrevious: options.preparedWeek.retainPrevious,
                  needsRecoveryCheckpoint: options.preparedWeek.needsRecoveryCheckpoint,
              }
              : prepareVerifiedPlayerForPersistence(nextPlayer, options.reason || 'AUTOSAVE', {
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
              tone: 'warning',
          });
          return nextPlayer;
      }
      const playerToSave = prepared.player;
      if (options.weekDiagnostic) {
          options.weekDiagnostic.onStage?.('persist_prepare_done');
          markWeekProcessingStage('persist_prepare_done', playerToSave, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
          options.weekDiagnostic.onStage?.('indexeddb_write_start');
          markWeekProcessingStage('indexeddb_write_start', playerToSave, {
              run_id: options.weekDiagnostic.runId,
              screen: options.weekDiagnostic.screen,
              save_slot: slot,
          });
      }
      try {
          if (!options.preparedWeek?.alreadyWritten) {
              await trackSlotWrite(slot, nextPlayer, options.weekDiagnostic ? 'week' : options.saveKind || 'other', async () => {
                  await saveVerifiedGameData(`actorEmpireSave_${slot}`, playerToSave, prepared.manifest, {
                      retainPrevious: prepared.retainPrevious,
                      needsRecoveryCheckpoint: prepared.needsRecoveryCheckpoint,
                  });
              });
          }
      } catch (error) {
          recordNonFatal(error, 'verified_save_failed', {
              slot,
              reason: options.reason || 'AUTOSAVE',
              age: nextPlayer.age,
              week: nextPlayer.currentWeek,
              retried_write: options.retriedWrite === true,
          });
          if (options.rethrow) throw error;
          /* Beta report (2026-11-10): the career in memory is still good when a write fails. The usual
             causes pass at once: a screen changed part of the career (energy, for one) while this save
             waited to be written, so the stored copy no longer matched its check; or a slow write ran
             out of time behind other saves. Prepare and write it once more before warning the player. */
          if (!options.retriedWrite) return persistSlotSave(slot, nextPlayer, { ...options, retriedWrite: true });
          setToastMessage({
              title: 'Save Was Not Replaced',
              subtext: 'The new save failed its safety check. Your previous career remains untouched.',
              tone: 'warning',
          });
          return nextPlayer;
      }
      /* Phase 1 (2026-11-17): this slot is now durable up to the change number this player carried. */
      const carriedChangeCount = changeCountOfPlayerRef.current.get(nextPlayer);
      if (carriedChangeCount !== undefined && carriedChangeCount > (durableChangeCountRef.current[slot] ?? -1)) {
          durableChangeCountRef.current[slot] = carriedChangeCount;
      }
      clearPlayTimeSideRecord(slot, playerToSave);
      setSaveSlotSummaries(prev => ({ ...prev, [slot]: createSaveSlotSummary(playerToSave) }));
      if (startupSlotPreloadRef.current?.slot === slot) dropStartupSlotPreload();
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

      const writeLocalMirror = () => {
          writeLocalStorageMirror(slot, playerToSave);
      };

      const requestIdleCallback = (globalThis as any).requestIdleCallback as ((cb: () => void, options?: { timeout?: number }) => void) | undefined;
      if (requestIdleCallback) {
          requestIdleCallback(writeLocalMirror, { timeout: 1800 });
      } else {
          globalThis.setTimeout(writeLocalMirror, 0);
      }
      return playerToSave;
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
      preparedWeek?: { manifest: SaveIntegrityManifest; retainPrevious: boolean; needsRecoveryCheckpoint: boolean; alreadyWritten?: boolean },
  ): Promise<Player> => {
      if (!currentSlot) return preparePlayerForPersistence(nextPlayer);
      const playerToSave = await persistSlotSave(currentSlot, nextPlayer, {
          rethrow: true,
          weekDiagnostic,
          reason: 'PROCESS_WEEK',
          preparedWeek,
      });
      setSaveSlots(prev => ({ ...prev, [currentSlot]: playerToSave }));
      return playerToSave;
  };

  const prepareLoadedPlayerSave = async (
      slot: number,
      savedData: Player,
      source: 'indexeddb-slot' | 'legacy-indexeddb' | 'legacy-localstorage' | 'legacy-single-localstorage' = 'indexeddb-slot',
      premigrated?: { player: Player; migratedFromVersion: unknown; repaired: boolean },
  ): Promise<{ player: Player; shouldPersist: boolean; carePackageGranted: boolean }> => {
      /* Phase 1 (2026-11-17): a load repair (B13's commissions, B16's hold, ...) is saved at once, so the career
         that then plays counts as saved, and an open that changed nothing saves nothing (see the hydration effect). */
      let repairedNow = false;
      const migrated = premigrated ? premigrated.player : migratePlayerSave(savedData, { onRepair: () => { repairedNow = true; } });
      const migration = { repaired: premigrated ? premigrated.repaired : repairedNow };
      const migratedFromVersion = premigrated ? premigrated.migratedFromVersion : (savedData as Player)?.flags?.saveMigrationVersion;
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
          shouldPersist: (migratedFromVersion !== optimized.flags?.saveMigrationVersion) || migration.repaired || posterMediaMigrated || carePackageGranted || entitlementResult.changed,
          carePackageGranted,
      };
  };

  // Perf plan (2026-11-08): read the last-played career while the start-up bar fills.
  useEffect(() => {
      if (isInitializing) return;
      setStartupSavesListed(true);
      if (startupCareerSettled || startupSlotPreloadRef.current) return;
      settleStartupSlotPreloadGuard();
      /* Crash fix (19 Nov 2026), items 1.8 and 2.1: one line per launch says what the start menu did and why, by
         RAM class and size (the switches' tables are tuned from these and the kill reports). */
      const reportDecision = (decision: string, ramClass: string = getRamClass(), units = 0) => {
          if (startupPreloadDecisionSentRef.current) return;
          startupPreloadDecisionSentRef.current = true;
          addBreadcrumb('startup:preload_decision', { decision, ram_class: ramClass, units });
          trackGameEvent('startup_preload_decision', { decision, ram_class: ramClass, size_k: Math.round(units / 1000) });
      };
      if (safeBootRequested || lightStartAfterDeath || gameStatus !== 'START_MENU') {
          if (lightStartAfterDeath && gameStatus === 'START_MENU') reportDecision('light');
          setStartupCareerSettled(true);
          return;
      }
      const candidate = pickStartupPreloadSlot(saveSlotSummaries);
      if (!candidate) {
          setStartupCareerSettled(true);
          return;
      }
      const decision = decideStartupPreload(candidate.slot);
      if (!decision.read || !claimStartupSlotPreload(candidate.slot)) {
          reportDecision(decision.read ? 'guard' : decision.why, decision.ramClass, decision.units);
          setStartupCareerSettled(true);
          return;
      }
      reportDecision(decision.why === 'switch_off' ? 'read_switch_off' : 'read', decision.ramClass, decision.units);
      const { slot, summary } = candidate;
      const entry: StartupSlotPreload = {
          slot,
          summaryKey: getStartupSummaryKey(summary),
          settled: false,
          result: null,
          promise: Promise.resolve<StartupSlotPreloadResult>({ kind: 'FAILED' }),
      };
      entry.promise = (async (): Promise<StartupSlotPreloadResult> => {
          const verifiedLoad = await loadVerifiedGameData(`actorEmpireSave_${slot}`);
          if (verifiedLoad.status !== 'CURRENT') return { kind: 'VERIFIED', verifiedLoad };
          /* Crash fix (19 Nov 2026): take the load's small facts now, so nothing refers to the loaded career after
             the migration. Before, the record was read again after the poster check's await, which kept the loaded
             career alive next to its migrated copy through that check. */
          const { needsRecoveryCheckpoint, savedAt, headFallback, appVersion } = verifiedLoad;
          const migratedFromVersion = verifiedLoad.player.flags?.saveMigrationVersion;
          let repaired = false;
          // Crash fix (19 Nov 2026), item 2.1: one frame for the ident and the bar between the read and the migration.
          await new Promise(resolve => window.setTimeout(resolve, 0));
          const migrated = migratePlayerSave(verifiedLoad.player, { onRepair: () => { repaired = true; } });
          const diskWorkOnTap = migratedFromVersion !== migrated.flags?.saveMigrationVersion
              || repaired
              || await hasEmbeddedCustomPosters(migrated);
          return { kind: 'MIGRATED', migrated, migratedFromVersion, needsRecoveryCheckpoint, diskWorkOnTap, savedAt, headFallback, repaired, appVersion };
      })()
          .catch((error): StartupSlotPreloadResult => {
              recordNonFatal(error, 'startup_slot_preload_failed', { save_slot: slot });
              return { kind: 'FAILED' };
          })
          .then(result => {
              entry.settled = true;
              /* Crash fix (19 Nov 2026), item 1.8: the guard now stays on while the read career is held on the start
                 menu or opened. It rests here only when nothing holds a career: the read failed, the career was
                 dropped while it read, or the page is hidden (the career is let go; a tap reads it again). */
              if (startupLadderOn() && !entry.holder && result.kind !== 'FAILED' && document.visibilityState === 'hidden') {
                  if (startupSlotPreloadRef.current === entry) startupSlotPreloadRef.current = null;
                  entry.holder = 'dropped';
              }
              const dropped = entry.holder === 'dropped';
              entry.result = dropped ? null : result;
              if (!startupLadderOn() || dropped || result.kind === 'FAILED') releaseStartupSlotPreload();
              refreshStartPhase();
              setStartupCareerSettled(true);
              return dropped ? STARTUP_PRELOAD_DROPPED : result;
          });
      startupSlotPreloadRef.current = entry;
      // Crash fix (19 Nov 2026), item 1.7: a close from here on reports this slot (and its size) and the phase.
      noteSessionDetail({ slot });
      refreshStartPhase();
  }, [isInitializing, startupCareerSettled]);

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
      const queue = pendingIOSPurchaseUpdatesRef.current;
      if (!update.transactionId || !queue.some(item => item.transactionId === update.transactionId)) queue.push(update);
      setIosPurchaseUpdatesWaiting(count => count + 1);
    };
  }, []);

  /* The waiting iOS purchases, once a career is playing. Each is granted once: the save's record of transactions and
     the device's list of delivered ones stop a repeat when StoreKit hands one over again. The save comes first; only
     after it is StoreKit told to finish them, so a crash or a failed save leaves them open for the next launch. */
  useEffect(() => {
    if (gameStatus !== 'PLAYING' || !currentSlot || pendingIOSPurchaseUpdatesRef.current.length === 0) return;
    const updates = pendingIOSPurchaseUpdatesRef.current.splice(0);
    const slot = currentSlot;
    const hadStreamingPlus = hasPremiumProduct(playerRef.current, 'streaming_plus');
    handleGenericUpdate(prev => {
        const p = JSON.parse(JSON.stringify(prev)) as Player;
        const granted: Array<{ transactionId?: string; productId: PremiumProductId }> = [];
        updates.forEach(update => {
            if (hasProcessedStoreTransaction(p, update.transactionId) || wasStoreTransactionDelivered(update.transactionId)) return;
            markProcessedStoreTransaction(p, update.transactionId);
            const message = applyPremiumPurchase(p, update.premiumProductId, getPlayerLanguage(p));
            granted.push({ transactionId: update.transactionId, productId: update.premiumProductId });
            setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: message });
        });
        // Phase 1 (2026-11-17): the ledger first, then the save, then StoreKit is told.
        void recordConsumableGrants(slot, p.id, granted)
            .then(() => persistSlotSave(slot, p, { rethrow: true }))
            .then(savedPlayer => {
                setSaveSlots(previous => ({ ...previous, [slot]: savedPlayer }));
                updates.forEach(update => rememberStoreTransactionDelivered(update.transactionId));
                return Promise.all(updates.map(update => finishIOSTransaction(update.transactionId)));
            })
            .catch(error => recordNonFatal(error, 'premium_ios_update_persist_failed', { count: updates.length }));
        return p;
    });
    const permanent = updates.map(update => update.premiumProductId).filter(isNonConsumablePremiumProduct);
    if (permanent.length) void syncPermanentPremiumEntitlementsToSavedSlots(permanent);
    /* Ask to Buy approved later, or a purchase finished while the app was away */
    if (!hadStreamingPlus && updates.some(update => update.premiumProductId === 'streaming_plus')) announceStreamingPlusUnlocked();
    noteRealPurchase();
  }, [gameStatus, currentSlot, iosPurchaseUpdatesWaiting]);

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

  /* Android: a pending payment that completes while the game is open is collected at once (as Restore does: granted,
     saved, then acknowledged or consumed) instead of waiting for a Restore tap or the next launch. */
  useEffect(() => {
    let disposed = false;
    let listenerHandle: { remove: () => Promise<void> } | null = null;
    startAndroidPurchaseUpdatesListener(() => {
      if (!disposed) setAndroidPurchaseUpdatesWaiting(count => count + 1);
    }).then(handle => {
      if (disposed) {
          void handle?.remove();
          return;
      }
      listenerHandle = handle;
    }).catch(error => {
      console.warn('[IAP] Failed to start Android purchase update listener', error);
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
    setBabySurnameChoice(surnameOptions[0]?.value || '');
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

  /* 2026-11-09: this version's note from the developer reaches the open save once, new career or returning player
     (services/developerNotes.ts); it rides along with the next real save */
  useEffect(() => {
    if (isInitializing || gameStatus !== 'PLAYING') return;
    const withNotes = deliverDeveloperNotes(player);
    if (withNotes !== player) setPlayer(withNotes);
  }, [gameStatus, isInitializing, player]);

  const handleDismissWhatsNew = () => {
    try {
      localStorage.setItem(WHATS_NEW_STORAGE_KEY, APP_DISPLAY_VERSION);
    } catch (error) {
      console.error('Failed to persist What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(false);
  };

  /* Dev menu only. Zeesh (18 Nov 2026): no cheat or dev menu in a public release, so every dev-menu hook in this file is
     `import.meta.env.DEV ? … : undefined` and a production build leaves its code out (scripts/audit-release-no-dev-tools.mjs). */
  const handleShowWhatsNewCheat = import.meta.env.DEV ? () => {
    try {
      localStorage.removeItem(WHATS_NEW_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset What\'s New state', error);
    }
    setShowPreviousWhatsNewNotes(false);
    setShowWhatsNewModal(true);
  } : undefined;

  const handleConfirmBabyName = () => {
      if (!pendingBabyNaming) return;
      const trimmedFirstName = babyFirstNameInput.trim();
      const trimmedSurname = babySurnameChoice.trim();
      if (!trimmedFirstName || !trimmedSurname) return;

      const finalName = `${trimmedFirstName} ${trimmedSurname}`;
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
              childName: buildAbandonedBabyName(pendingBabyNaming.suggestedFirstName, pendingBabyNaming.partnerName, prev.name),
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

  // Check for saved game on initial mount & Init Ads
  useEffect(() => {
    const init = async () => {
        try {
            const summaries: Record<number, SaveSlotSummary | null> = { 1: null, 2: null, 3: null };

            // Startup must never hydrate or migrate a full career. Existing saves
            // receive a tiny deferred card and are opened only after player selection.
            const indexedDbKeys = new Set(await listGameDataKeys());
            for (let i = 1; i <= 3; i++) {
                const saveKey = `actorEmpireSave_${i}`;
                if (!indexedDbKeys.has(saveKey)) {
                    /* Phase 1 (2026-11-17), the format guard: a slot a newer version wrote in a format this build
                       cannot read may hold no A/B copy; its marker still lists it, so no new career lands on it. */
                    if (indexedDbKeys.has(slotFormatKey(saveKey)) && (await loadVerifiedGameData(saveKey)).status === 'NEWER_FORMAT') {
                        summaries[i] = createDeferredSaveSlotSummary(saveKey, 'indexeddb');
                    }
                    continue;
                }
                const cachedSummary = getGameSaveSummary(saveKey);
                summaries[i] = cachedSummary || createDeferredSaveSlotSummary(saveKey, 'indexeddb');
            }

            // Legacy saves are also represented without parsing them on boot. They
            // migrate into the normal per-slot IndexedDB key only after selection.
            const hasAnySave = Object.values(summaries).some(s => s !== null);
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
                    if (!Object.values(summaries).some(s => s !== null) && localStorageKeys.has('actorEmpireSave')) {
                        summaries[1] = createDeferredSaveSlotSummary('actorEmpireSave', 'localstorage');
                    }
                }
            }

            setSaveSlotSummaries(summaries);
        } catch (e) {
            console.error("Init failed", e);
            recordNonFatal(e, 'app_init_failed');
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitializing || safeBootRequested) return;
    let cancelled = false;
    const initializeNativeServices = async () => {
      try {
        await ensureTrackingPermission();
        if (cancelled) return;
        /* Crash fix (19 Nov 2026), FIX-PLAN item 2.2 (switch adsAfterOpen, decision 3): at launch only Google's
           consent; the ad SDK and its ads start once a career has opened and settled (the effect below). */
        if (isSwitchOn('adsAfterOpen')) await askAdConsent();
        else await initAds();
      } catch (error) {
        recordNonFatal(error, 'native_services_init_failed');
      }
    };
    void initializeNativeServices();
    return () => {
      cancelled = true;
    };
  }, [isInitializing, safeBootRequested]);

  /* Crash fix (19 Nov 2026), item 2.2: a No Ads owner (this career, or this phone's kept purchases) never has an
     interstitial loaded; forced breaks never show to them anyway. */
  const playerOwnsNoAds = gameStatus === 'PLAYING' && hasNoAds(player);
  useEffect(() => {
    setInterstitialWanted(!playerOwnsNoAds && !readStoredPremiumEntitlements().includes('no_ads'));
  }, [playerOwnsNoAds]);

  /* Crash fix (19 Nov 2026), item 2.2: the ad SDK starts, with its rewarded ad and (without No Ads) its interstitial,
     at the first quiet moment at least 10 s after a career is playing, after the open's own work (its save or the
     skip, the Android purchase check, Week Ahead's first send). A forced break due in those seconds is skipped once
     as NOT_LOADED, so ad frequency is unchanged; a rewarded tap in that time starts the SDK itself and waits for its
     ad, as a tap before a load always did. */
  const adsStartedRef = useRef(false);
  useEffect(() => {
    if (safeBootRequested || adsStartedRef.current || gameStatus !== 'PLAYING' || isInitializing || !isSwitchOn('adsAfterOpen')) return;
    let cancelled = false;
    let idleHandle: number | null = null;
    const start = () => {
      if (cancelled || adsStartedRef.current) return;
      adsStartedRef.current = true;
      initAds().catch(error => recordNonFatal(error, 'native_services_init_failed'));
    };
    const timer = window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') idleHandle = window.requestIdleCallback(start, { timeout: 10_000 });
      else start();
    }, ADS_AFTER_OPEN_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      if (idleHandle !== null && typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idleHandle);
    };
  }, [gameStatus, isInitializing, safeBootRequested]);

  useEffect(() => {
    markTraceAction('app_runtime_ready', { flow: 'app_lifecycle' });
    const handleVisibility = () => {
      markTraceAction(document.visibilityState === 'hidden' ? 'app_backgrounded' : 'app_foregrounded', {
        flow: 'app_lifecycle',
        last_screen: Page[activePage] || String(activePage),
        save_slot: currentSlot,
      });
    };
    const handlePageHide = () => markTraceAction('app_page_hidden', {
      flow: 'app_lifecycle',
      last_screen: Page[activePage] || String(activePage),
      save_slot: currentSlot,
    });
    const handlePageShow = () => markTraceAction('app_page_shown', {
      flow: 'app_lifecycle',
      last_screen: Page[activePage] || String(activePage),
      save_slot: currentSlot,
    });
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);
    const handleMemoryWarning = (event: Event) => {
      if (isAndroidAppSwitchTrim(event)) return;
      const detail = event instanceof CustomEvent ? event.detail : {};
      /* Phase 1 (2026-11-17): Week Ahead's worker holds a second copy of the career, the first memory the game can give
         back, so it stops before anything else here. Week Ahead then stays off for the session (the effect below). */
      const aheadClient = weekAheadRef.current;
      if (aheadClient) {
        weekAheadRef.current = null;
        aheadClient.dispose();
        noteSessionDetail({ weekAhead: 'off' });
        notePageWeekAhead('off');
      }
      notePageHiddenOrMemory('memory', { ...(detail && typeof detail === 'object' ? detail as { level?: unknown } : {}), stage: weekProcessingLockRef.current ? activeWeekStageRef.current : undefined });
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
      /* Phase 1 (2026-11-17), for the ANRs: a memory warning with nothing new since this slot's last durable save
         writes nothing. It used to start a second full-career save right after the one a hide had just made. */
      if (gameStatus === 'PLAYING' && isSwitchOn('hideSaveSkip') && !autosaveDueRef.current && isSlotDurableOrSaving(currentSlot)) {
        markTraceAction('native_memory_checkpoint_skipped', {
          flow: 'app_lifecycle',
          save_slot: currentSlot,
          checkpoint_status: 'SKIPPED',
          // Phase 1 (2026-11-17): or a save that carries every change is being written right now.
          checkpoint_reason: isSlotDurable(currentSlot) ? 'NO_CHANGE_SINCE_DURABLE_SAVE' : 'SAVE_WITH_THESE_CHANGES_RUNNING',
        });
        return;
      }
      void checkpointNativeMemoryPressure({
        isPlaying: gameStatus === 'PLAYING',
        currentSlot,
        isWeekProcessing: weekProcessingLockRef.current,
        getCommittedPlayer: () => playerRef.current,
        cancelPendingAutosave: () => {
          if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
          }
        },
        persistCommittedPlayer: async (slot, committedPlayer) => {
          const savedPlayer = await persistSlotSave(slot, committedPlayer, {
            rethrow: true,
            reason: 'AUTOSAVE',
            saveKind: 'checkpoint',
          });
          setSaveSlots(prev => ({ ...prev, [slot]: savedPlayer }));
        },
      }).then(result => {
        markTraceAction(
          result.status === 'SAVED'
            ? 'native_memory_checkpoint_saved'
            : 'native_memory_checkpoint_skipped',
          {
            flow: 'app_lifecycle',
            save_slot: currentSlot,
            checkpoint_status: result.status,
            checkpoint_reason: result.status === 'SKIPPED' ? result.reason : undefined,
          },
        );
      }).catch(error => {
        recordNonFatal(error, 'native_memory_checkpoint_failed', {
          save_slot: currentSlot,
          last_screen: Page[activePage] || String(activePage),
        });
      });
    };
    window.addEventListener('actor-empire-memory-warning', handleMemoryWarning);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('actor-empire-memory-warning', handleMemoryWarning);
    };
  }, [activePage, currentSlot, gameStatus]);

  /* Week Ahead (2026-11-12): a slot whose week takes this device 0.9 s or more gets a background worker that
     prepares the next week while the player reads (services/weekAhead). It starts once the career is open,
     never on a tap, and stops when the career closes. */
  useEffect(() => {
    setWeekAheadOn(gameStatus === 'PLAYING' && readWeekAheadWanted(currentSlot));
  }, [gameStatus, currentSlot]);
  useEffect(() => {
    const stopWeekAheadOnMemoryWarning = (event: Event) => {
      if (weekAheadOffForSession || isAndroidAppSwitchTrim(event)) return;
      weekAheadOffForSession = true;
      addBreadcrumb('week_ahead:off_memory_warning', {});
      setWeekAheadOn(false);
    };
    window.addEventListener('actor-empire-memory-warning', stopWeekAheadOnMemoryWarning);
    return () => window.removeEventListener('actor-empire-memory-warning', stopWeekAheadOnMemoryWarning);
  }, []);
  useEffect(() => {
    if (!weekAheadOn || gameStatus !== 'PLAYING' || !currentSlot) return;
    const saveKey = `actorEmpireSave_${currentSlot}`;
    const client = createWeekAheadClient(
      createWeekAheadBrowserWorker,
      (event, detail) => addBreadcrumb(event, detail || {}),
      // The prepared week is written ahead on top of the live copy this session verified (none: written on the tap).
      () => { const live = getVerifiedLiveSave(saveKey); return live ? { key: saveKey, live } : null; },
    );
    weekAheadRef.current = client;
    noteSessionDetail({ weekAhead: 'on', slot: currentSlot });
    notePageWeekAhead('idle');
    client.setOnHome(weekAheadFocusRef.current);
    client.noteCareer(playerRef.current);
    return () => {
      client.dispose();
      if (weekAheadRef.current === client) weekAheadRef.current = null;
      noteSessionDetail({ weekAhead: 'off' });
      notePageWeekAhead('off');
    };
  }, [weekAheadOn, gameStatus, currentSlot]);
  useEffect(() => {
    if (!weekProcessingLockRef.current) weekAheadRef.current?.noteCareer(player);
  }, [player]);
  /* Age Up Week can be tapped only on Home with no decision open: the next week is prepared only then (battery
     and heat; services/weekAhead). The same open-decision test as the week-break ad (setForcedAdContext). */
  const weekAheadFocus = activePage === Page.HOME && !(
      player.pendingEvents?.length || player.pendingEvent || showDebtModal || pendingMedicalPrompt
      || pendingBabyNaming || activeSocialEvent || activePressEvent || showProtectionPrompt
  );
  weekAheadFocusRef.current = weekAheadFocus;
  useEffect(() => {
    weekAheadRef.current?.setOnHome(weekAheadFocus);
  }, [weekAheadFocus, weekAheadOn, gameStatus, currentSlot]);
  useEffect(() => {
    // No background weeks while the app is in the background (battery and heat).
    const onVisibility = () => weekAheadRef.current?.setHidden(document.visibilityState === 'hidden');
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }

    if (gameStatus !== 'PLAYING' || !currentSlot) return;
    if (suppressNextAutosaveRef.current) {
        suppressNextAutosaveRef.current = false;
        return;
    }
    // Lag round (2026-11-09): no full save for a change that only remembers a visit. A real
    // change still waiting for its save (the cleanup above cleared its timer) is saved as usual.
    if (isQuietPlayerUpdate(player) && !autosaveDueRef.current) return;
    autosaveDueRef.current = true;
    const changedAt = Date.now();
    /* a mark older than the longest wait belongs to changes another save already carried (a week, the app
       hiding): this change starts a new batch */
    if (firstUnsavedChangeAtRef.current === null || changedAt - firstUnsavedChangeAtRef.current > 125_000) {
        firstUnsavedChangeAtRef.current = changedAt;
    }
    const autosaveDelay = getAutosaveDelayMs(lastAutosaveMsRef.current, changedAt - firstUnsavedChangeAtRef.current);

    autosaveTimerRef.current = window.setTimeout(() => {
        autosaveDueRef.current = false;
        firstUnsavedChangeAtRef.current = null;
        setSaveSlots(prev => ({ ...prev, [currentSlot]: player }));
        const saveStartedAt = performance.now();
        // Phase 1 (2026-11-17), telemetry v2: autosaves get their own trace.
        if (!isPerformanceTraceActive('autosave')) startPerformanceTrace('autosave');
        void persistSlotSave(currentSlot, player, { saveKind: 'autosave' }).finally(() => {
            lastAutosaveMsRef.current = performance.now() - saveStartedAt;
            stopPerformanceTrace('autosave', { duration_ms: Math.round(lastAutosaveMsRef.current) }, { size_bucket: sizeBucketOf(storageMbRef.current), ram_class: getRamClass() });
            noteSessionLive({ lastSaveMs: Math.round(lastAutosaveMsRef.current), week: `${player.age}:${player.currentWeek}` });
        });
        autosaveTimerRef.current = null;
    }, autosaveDelay);

    return () => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    };
  }, [player, gameStatus, currentSlot]);

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
      /* Phase 1 (2026-11-17), for the ANRs: leaving the app with nothing changed since this slot's last durable
         save (and no autosave waiting) writes only the play time, to a tiny side record that the next load adds
         back. Any other change still gets the full save below, at once. */
      if (persistImmediately && isSwitchOn('hideSaveSkip') && !autosaveDueRef.current && isSlotDurableOrSaving(currentSlot)) {
        writePlayTimeSideRecord(currentSlot, updatedPlayer);
        markQuietPlayerUpdate(updatedPlayer);
        setPlayer(updatedPlayer, { playTimeOnly: true });
        setSaveSlots(prev => ({ ...prev, [currentSlot]: updatedPlayer }));
        markTraceAction('hide_full_save_skipped', { flow: 'app_lifecycle', save_slot: currentSlot });
        return;
      }
      // Lag round (2026-11-09): the once-a-minute play-time count rides with the next real save
      // instead of starting a full save every minute (seconds of freeze on a late career).
      // Leaving or hiding the app still saves it at once (persistImmediately).
      if (persistImmediately) {
        /* 1.0.27: this save carries every change still waiting for the (now longer) autosave, so that
           autosave is dropped instead of running again, with a freeze, when the app comes back */
        if (autosaveTimerRef.current) {
          window.clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        autosaveDueRef.current = false;
        firstUnsavedChangeAtRef.current = null;
      }
      markQuietPlayerUpdate(updatedPlayer);
      setPlayer(updatedPlayer, { playTimeOnly: true });
      setSaveSlots(prev => ({ ...prev, [currentSlot]: updatedPlayer }));
      if (persistImmediately) void persistSlotSave(currentSlot, updatedPlayer, { saveKind: 'hide' });
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

  // Perf plan (2026-11-08): one career opens at a time; a second tap while one opens does nothing.
  const handleSelectSlot = async (slot: number) => {
    if (slotOpenInProgressRef.current) return;
    slotOpenInProgressRef.current = true;
    // Phase 1 (2026-11-17), telemetry v2: from the slot tap until the career is on screen (or did not open).
    const openTrace = 'career_open';
    const openTraceStarted = !isPerformanceTraceActive(openTrace);
    if (openTraceStarted) startPerformanceTrace(openTrace);
    openLostWeeksRef.current = null;
    // Crash fix (19 Nov 2026), item 1.7: from the tap until the career plays, the marker says open:<slot>.
    openingSlotRef.current = slot;
    refreshStartPhase();
    try {
      await openSelectedSlot(slot);
    } finally {
      openingSlotRef.current = null;
      // after React has drawn what the open left (PLAYING, or the menu again)
      window.setTimeout(refreshStartPhase, 0);
      slotOpenInProgressRef.current = false;
      if (openTraceStarted) {
        const lost = openLostWeeksRef.current;
        stopPerformanceTrace(openTrace, lost !== null ? { lost_weeks: lost } : {}, {
          result: lost !== null ? 'opened' : 'not_opened',
          size_bucket: sizeBucketOf(storageMbRef.current),
          ram_class: getRamClass(),
        });
      }
    }
  };

  const openSelectedSlot = async (slot: number) => {
    setCurrentSlot(slot);
    let existingSave = saveSlots[slot];
    const startupPreload = startupSlotPreloadRef.current;
    startupSlotPreloadRef.current = null;
    if (!existingSave && saveSlotSummaries[slot]) {
        const usablePreload = startupPreload && startupPreload.slot === slot && startupPreload.summaryKey === getStartupSummaryKey(saveSlotSummaries[slot])
            ? startupPreload
            : null;
        /* Crash fix (19 Nov 2026), item 1.8: the start-up guard stays on until this open has used the read career, or
           failed (the finally below), so a phone that dies during the tap counts a dead start. A read of another
           career is dropped: it is waited for below and then let go before this career loads. */
        if (startupPreload) startupPreload.holder = usablePreload ? 'open' : 'dropped';
        // Home opens at once only when the career is read and migrated and nothing on this tap needs
        // the disk; anything else covers the menu with the loading screen at once, as before.
        const readyResult = usablePreload?.settled ? usablePreload.result : null;
        const instantOpen = readyResult?.kind === 'MIGRATED' && !readyResult.diskWorkOnTap;
        if (!instantOpen) setIsInitializing(true);
        markTraceAction('selected_save_load_started', { flow: 'save_select', save_slot: slot });
        try {
            // a read of another career still running finishes first: two careers are never loaded at once
            if (startupPreload && startupPreload !== usablePreload) {
                if (!startupPreload.settled) await startupPreload.promise.catch(() => null);
                // Crash fix (19 Nov 2026): and nothing here keeps that career alive while this one loads.
                startupPreload.result = null;
                startupPreload.promise = Promise.resolve(STARTUP_PRELOAD_DROPPED);
            }
            const preloaded = usablePreload ? await usablePreload.promise : null;
            if (import.meta.env.DEV) console.info('[perf] slot open', { slot, preloaded: preloaded?.kind || 'none' });
            const summary = saveSlotSummaries[slot];
            const storageKey = summary?.storageKey || `actorEmpireSave_${slot}`;
            const storageKind = summary?.storageKind || 'indexeddb';
            let savedData: Player | null = null;
            let currentIsUnverified = storageKind === 'localstorage';
            let needsRecoveryCheckpoint = false;
            let sourceByteEstimate: number | undefined;
            let openedAppVersion: string | null = null;
            if (storageKind === 'localstorage') {
                const raw = localStorage.getItem(storageKey);
                savedData = raw ? JSON.parse(raw) as Player : null;
            } else if (preloaded?.kind === 'MIGRATED') {
                needsRecoveryCheckpoint = preloaded.needsRecoveryCheckpoint;
                openedAppVersion = preloaded.appVersion;
                openedCopySavedAtRef.current[slot] = preloaded.savedAt ?? 0;
                if (preloaded.headFallback) recordNonFatal(new Error('The save head record was not recognised'), 'save_head_unrecognised', { save_slot: slot, loaded: preloaded.headFallback });
            } else {
                const verifiedLoad = preloaded?.kind === 'VERIFIED' ? preloaded.verifiedLoad : await loadVerifiedGameData(storageKey);
                if (verifiedLoad.status === 'RECOVERY_AVAILABLE') {
                    noteStoreReviewTrouble('save_recovery');
                    const offer = offerForFailedLoad(pointFromCopy({ player: verifiedLoad.previous, savedAt: verifiedLoad.previousSavedAt, appVersion: verifiedLoad.previousAppVersion }));
                    trackGameEvent('save_recovery_offered', { reason: offer.reason, save_slot: slot });
                    setPendingSaveRecovery({
                        slot,
                        storageKey,
                        previous: verifiedLoad.previous,
                        violations: verifiedLoad.violations,
                        reason: offer.reason,
                        points: offer.points,
                        careerId: String(verifiedLoad.previous.id || ''),
                        lastShown: readLastWeekShown(slot),
                    });
                    setCurrentSlot(null);
                    return;
                }
                // Phase 1 (2026-11-17), the format guard: never opened (or written) by this build.
                if (verifiedLoad.status === 'NEWER_FORMAT') throw new NewerSaveFormatError(storageKey);
                if (verifiedLoad.status === 'UNRECOVERABLE') {
                    throw new Error('This career and its recovery generation could not be verified. Import a signed backup before deleting anything.');
                }
                if (verifiedLoad.status === 'MISSING') throw new Error(`Save slot ${slot} could not be loaded.`);
                savedData = verifiedLoad.player;
                currentIsUnverified = verifiedLoad.status === 'LEGACY_UNVERIFIED';
                needsRecoveryCheckpoint = verifiedLoad.status === 'CURRENT' && verifiedLoad.needsRecoveryCheckpoint;
                if (verifiedLoad.status === 'CURRENT') openedAppVersion = verifiedLoad.appVersion;
                openedCopySavedAtRef.current[slot] = verifiedLoad.status === 'CURRENT' ? verifiedLoad.savedAt ?? 0 : 0;
                if (verifiedLoad.status === 'CURRENT' && verifiedLoad.headFallback) {
                    recordNonFatal(new Error('The save head record was not recognised'), 'save_head_unrecognised', { save_slot: slot, loaded: verifiedLoad.headFallback });
                }
            }
            /* Week-speed Phase 2a (2026-11-17), the recovery list's second case (D15): a career written by a version
               we flagged as buggy is offered, once, its copy from before that version. Asked before anything here can
               save, because a save would replace that copy. */
            const flaggedVersions = storageKind === 'localstorage' ? [] : getRecoveryFlaggedVersions();
            const openedCareerId = String((preloaded?.kind === 'MIGRATED' ? preloaded.migrated.id : savedData?.id) || '');
            /* Crash fix (19 Nov 2026): the backup copy (a whole career; two are deserialized when the head is PREVIOUS)
               is read only when an offer is possible: the opened copy's version is flagged and its offer is not answered.
               findFlaggedVersionOffer offers nothing otherwise, so the outcome is the same. */
            if (openedAppVersion && openedCareerId && flaggedVersions.includes(openedAppVersion)
                && !isRecoveryOfferAnswered(slot, openedCareerId, openedAppVersion)) {
                const backupCopy = await peekVerifiedPreviousCopy(storageKey).catch(() => null);
                const offer = findFlaggedVersionOffer({
                    flagged: flaggedVersions,
                    currentAppVersion: openedAppVersion,
                    backup: backupCopy ? pointFromCopy(backupCopy) : null,
                    answered: version => isRecoveryOfferAnswered(slot, openedCareerId, version),
                });
                if (offer && backupCopy) {
                    noteStoreReviewTrouble('save_recovery');
                    trackGameEvent('save_recovery_offered', { reason: offer.reason, save_slot: slot, flagged_version: offer.flaggedVersion });
                    setPendingSaveRecovery({
                        slot,
                        storageKey,
                        previous: backupCopy.player,
                        violations: [],
                        reason: offer.reason,
                        points: offer.points,
                        careerId: openedCareerId,
                        lastShown: readLastWeekShown(slot),
                        flaggedVersion: offer.flaggedVersion,
                    });
                    setCurrentSlot(null);
                    return;
                }
            }
            const premigrated = storageKind !== 'localstorage' && preloaded?.kind === 'MIGRATED' ? preloaded : null;
            if (currentIsUnverified && savedData) sourceByteEstimate = estimateSaveJsonBytes(savedData);
            const source = storageKind === 'localstorage'
                ? (storageKey === 'actorEmpireSave' ? 'legacy-single-localstorage' : 'legacy-localstorage')
                : (storageKey === 'actorEmpireSave' ? 'legacy-indexeddb' : 'indexeddb-slot');
            const prepared = premigrated
                ? await prepareLoadedPlayerSave(slot, premigrated.migrated, source, { player: premigrated.migrated, migratedFromVersion: premigrated.migratedFromVersion, repaired: premigrated.repaired })
                : savedData ? await prepareLoadedPlayerSave(slot, savedData, source) : null;
            if (!prepared) throw new Error(`Save slot ${slot} could not be loaded.`);
            existingSave = prepared.player;
            ledgerOpenTokenRef.current = `${slot}:${Date.now()}`;
            lastWeekOnScreenAtRef.current = null;
            /* Phase 1 (2026-11-17), the lost-week watermark: weeks shown for this career that the opened copy lacks. */
            const lastShown = readLastWeekShown(slot);
            const lostWeeks = lastShown && lastShown.careerId === prepared.player.id
                ? Math.max(0, getAbsoluteWeek(lastShown.age, lastShown.week) - getAbsoluteWeek(prepared.player.age, prepared.player.currentWeek))
                : 0;
            openLostWeeksRef.current = lostWeeks;
            if (lostWeeks > 0) {
                recordNonFatal(new Error('Weeks shown before were not in the save that opened'), 'lost_weeks_on_open', { save_slot: slot, lost_weeks: lostWeeks });
            }
            setSaveSlots(prev => ({ ...prev, [slot]: prepared.player }));
            setSaveSlotSummaries(prev => ({ ...prev, [slot]: createSaveSlotSummary(prepared.player) }));
            if (currentIsUnverified || prepared.shouldPersist || source !== 'indexeddb-slot') {
                // the tap found disk work after all (a care package, a purchase): cover the menu first
                if (instantOpen) flushSync(() => setIsInitializing(true));
                await persistSlotSave(slot, prepared.player, {
                    rethrow: true,
                    reason: 'MIGRATION',
                    currentIsUnverified,
                    sourceByteEstimate,
                });
            }
            /* Phase 1 (2026-11-17): the stored copy now holds this career (it was saved just above, or loading
               changed nothing in it), so it counts as saved unless the hydration on entering PLAYING changes it. */
            openedCleanRef.current = { slot, player: prepared.player };
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
            clearStartupSlotPreloadSkip();
            // Crash fix (19 Nov 2026), item 1.7: a close from here on reports this slot and its size.
            noteSessionDetail({ slot });
        } catch (error) {
            if (isStockSaveRecoveryError(error)) {
                const storageKey = saveSlotSummaries[slot]?.storageKey || `actorEmpireSave_${slot}`;
                const previousCopy = await peekVerifiedPreviousCopy(storageKey).catch(() => null);
                const previous = previousCopy?.player || null;
                if (previousCopy && previous) {
                    try {
                        migratePlayerSave(previous);
                        noteStoreReviewTrouble('save_recovery');
                        const offer = offerForFailedLoad(pointFromCopy(previousCopy));
                        trackGameEvent('save_recovery_offered', { reason: offer.reason, save_slot: slot });
                        setPendingSaveRecovery({ slot, storageKey, previous, violations: error.issues.map(issue => issue.detail), reason: offer.reason, points: offer.points, careerId: String(previous.id || ''), lastShown: readLastWeekShown(slot) });
                        setCurrentSlot(null);
                        return;
                    } catch { /* An incompatible previous save must not replace the current original. */ }
                }
            }
            /* 2026-11-12 (player reports: "inconsistent stock register" on 1.0.27): say which holding and
               which rule, in Crashlytics and on screen, so a blocked career can be diagnosed and repaired */
            const stockIssues = isStockSaveRecoveryError(error)
                ? error.issues.slice(0, 4).map(issue => `${issue.code}:${issue.stockId || 'wallet'}`).join(',')
                : '';
            recordNonFatal(error, 'selected_save_load_failed', { save_slot: slot, ...(stockIssues ? { stock_issues: stockIssues } : {}) });
            setCurrentSlot(null);
            setToastMessage({
                title: 'Save Could Not Open',
                subtext: (error instanceof Error
                    ? error.message
                    : 'Your save was left untouched. Please try opening this slot again.')
                    + (stockIssues ? ` (${stockIssues}). Nothing was changed. Use Send to developer on this slot so we can repair it.` : ''),
            });
            return;
        } finally {
            setIsInitializing(false);
            if (startupPreload) releaseStartupSlotPreload();
        }
    } else if (startupPreload) {
        // Crash fix (19 Nov 2026), item 1.8: this slot needs no read, so the start menu's read career is let go.
        startupPreload.holder = 'dropped';
        if (startupPreload.settled) {
            startupPreload.result = null;
            startupPreload.promise = Promise.resolve(STARTUP_PRELOAD_DROPPED);
            releaseStartupSlotPreload();
        }
    }
    if (existingSave) {
        recoverInterruptedWeekProcessingTrace(existingSave, { saveSlot: slot, screen: 'START_MENU' });
        setSaveSlots(prev => ({ ...prev, [slot]: existingSave }));
        // prepareLoadedPlayerSave already ran the complete save migration. Avoid
        // another full deep clone during the PLAYING hydration pass on mobile.
        skipNextPlayingMigrationRef.current = true;
        setPlayer(existingSave);
        setSkipStartMenuIntro(false);
        setGameStatus('PLAYING');
    } else {
        setPlayer(migratePlayerSave(INITIAL_PLAYER));
        setSkipStartMenuIntro(false);
        setGameStatus('CREATION');
    }
  };

  const handleRecoverSave = async (pointIndex = 0) => {
    if (!pendingSaveRecovery || isRecoveringSave) return;
    const recovery = pendingSaveRecovery;
    const point = recovery.points[Math.max(0, Math.min(pointIndex, recovery.points.length - 1))];
    const weeksLost = point ? weeksLostByRestoring(point, recovery.lastShown, recovery.careerId) : 0;
    setIsRecoveringSave(true);
    try {
        // Phase 2a: the A/B store's one backup copy is the only point today; later points restore through their own entry.
        await recoverPreviousGameData(recovery.storageKey);
        /* Phase 2a: the player chose to give those weeks up, so the last week shown is now the restored copy's week
           (later prompts and the lost-week count then start from it). */
        writeLastWeekShown(recovery.slot, recovery.previous);
        /* Phase 2a (2026-11-17): every restore is logged. The purchase ledger is applied again when the career opens. */
        const logged = { reason: recovery.reason, point: point?.kind || 'PREVIOUS', weeks_lost: weeksLost, save_slot: recovery.slot, ...(recovery.flaggedVersion ? { flagged_version: recovery.flaggedVersion } : {}) };
        addBreadcrumb('recovery:restored', logged);
        trackGameEvent('save_recovery_restored', logged);
        recordNonFatal(new Error('A career was restored from its recovery list'), 'save_recovery_restored', logged);
        if (recovery.flaggedVersion) rememberRecoveryOfferAnswered(recovery.slot, recovery.careerId, recovery.flaggedVersion);
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
    if (isRecoveringSave || !pendingSaveRecovery) return;
    const recovery = pendingSaveRecovery;
    setPendingSaveRecovery(null);
    /* Phase 2a: an offer for a flagged version is answered by keeping the career too; it opens as it is, and the
       offer is not shown again for this career and version. A failed save goes back to the slots, as before. */
    if (recovery.reason === 'VERSION_FLAGGED' && recovery.flaggedVersion) {
        rememberRecoveryOfferAnswered(recovery.slot, recovery.careerId, recovery.flaggedVersion);
        addBreadcrumb('recovery:kept', { reason: recovery.reason, save_slot: recovery.slot, flagged_version: recovery.flaggedVersion });
        void handleSelectSlot(recovery.slot);
        return;
    }
    setCurrentSlot(null);
  };

  /* 2026-11-17 (Zeesh): the recovery popups say sorry and send a report in one tap (services/recoveryReports.ts).
     Sending never changes or saves the career. */
  const fallbackReportPlayer = () => migratePlayerSave(INITIAL_PLAYER);
  const handleSendWeekFailureReport = () => pendingWeekProcessingFailure
    ? sendRecoveryReport(playerRef.current, weekFailureReport(pendingWeekProcessingFailure, String(activePage)), fallbackReportPlayer)
    : null;
  const handleSendSaveRecoveryReport = () => pendingSaveRecovery
    ? sendRecoveryReport(pendingSaveRecovery.previous, saveRecoveryReport(pendingSaveRecovery), fallbackReportPlayer)
    : null;
  const handleSendRecoveryModeReport = (error: { message: string; stack: string }) =>
    sendRecoveryReport(playerRef.current, recoveryModeReport(error, String(activePage)), fallbackReportPlayer);

  /* 2026-11-12: a slot's save exactly as stored (it never opens it), so even a career that cannot
     open can reach the developer for repair */
  const handleSendSlotToDeveloper = async (slot: number) => {
    const storageKey = saveSlotSummaries[slot]?.storageKey || `actorEmpireSave_${slot}`;
    /* Crash fix (19 Nov 2026), FIX-PLAN item 1.10: the export is itself a whole-career peak, for exactly the players
       in trouble, so the start menu's read career is let go first (as Delete does). */
    dropStartupSlotPreload();
    try {
      return await exportSaveSlotForSupport(storageKey, slot);
    } catch (error) {
      recordNonFatal(error, 'support_save_export_failed', { save_slot: slot });
      throw error;
    }
  };

  const handleDeleteSlot = async (slot: number) => {
    dropStartupSlotPreload();
    clearLastWeekShown(slot);
    // Crash fix (19 Nov 2026): the slot's save record (its last save size) no longer describes anything in it.
    forgetSaveWriteRecord(`actorEmpireSave_${slot}`);
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
    setSaveSlots(prev => ({ ...prev, [slot]: null }));
    setSaveSlotSummaries(prev => ({ ...prev, [slot]: null }));
  };

  const handleExportGameData = async (options: { skipCurrentSnapshot?: boolean } = {}) => {
    try {
      if (!options.skipCurrentSnapshot && gameStatus === 'PLAYING' && currentSlot) {
        const playerToSave = await persistSlotSave(currentSlot, player, { rethrow: true, reason: 'MANUAL' });
        writeLocalStorageMirror(currentSlot, playerToSave);
        setSaveSlots(prev => ({ ...prev, [currentSlot]: playerToSave }));
        setSaveSlotSummaries(prev => ({ ...prev, [currentSlot]: createSaveSlotSummary(playerToSave) }));
      }

      const result = await exportSignedSaveArchive();
      setToastMessage({
        title: 'Save Export Ready',
        subtext: `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} signed for transfer.`,
      });
      return result;
    } catch (error) {
      recordNonFatal(error, 'save_transfer_export_failed', { save_slot: currentSlot });
      setToastMessage({
        title: 'Export Failed',
        subtext: error instanceof Error ? error.message : 'Could not create the save transfer file.',
      });
      throw error;
    }
  };

  const handleImportGameData = async () => {
    const confirmed = window.confirm('Importing a transfer file replaces the careers on this phone. Continue?');
    if (!confirmed) return;
    dropStartupSlotPreload();
    // Phase 1 (2026-11-17): an imported career may be older than the weeks shown before; that is not a lost week.
    [1, 2, 3].forEach(clearLastWeekShown);

    try {
      const result = await importSignedSaveArchiveFromFile({
        onProgress: progress => setToastMessage({
          title: 'Importing Save',
          subtext: progress.message,
        }),
      });
      // Crash fix (19 Nov 2026): the slots hold other careers now; their save records described the old ones.
      [1, 2, 3].forEach(importedSlot => forgetSaveWriteRecord(`actorEmpireSave_${importedSlot}`));
      setToastMessage({
        title: result.carePackageGranted ? 'Save Imported + Care Package' : 'Save Imported',
        subtext: result.carePackageGranted
          ? `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} restored with ${result.mediaRecords || 0} media file${result.mediaRecords === 1 ? '' : 's'}. Added $${MIGRATION_CARE_PACKAGE_CASH.toLocaleString()} and ${MIGRATION_CARE_PACKAGE_ENERGY} bonus energy. Restarting now.`
          : `${result.saveSlots} save slot${result.saveSlots === 1 ? '' : 's'} restored with ${result.mediaRecords || 0} media file${result.mediaRecords === 1 ? '' : 's'}. Restarting now.`,
      });
      // crash fix (19 Nov 2026), item 1.7: the game's own reload, not the web view restarting
      window.setTimeout(() => { markSelfReload(); window.location.reload(); }, 1200);
      return result;
    } catch (error) {
      recordNonFatal(error, 'save_transfer_import_failed', { save_slot: currentSlot });
      setToastMessage({
        title: 'Import Blocked',
        subtext: error instanceof Error ? error.message : 'That transfer file could not be imported.',
      });
      throw error;
    }
  };

  /* Crash fix (19 Nov 2026), FIX-PLAN item 1.11: a page that failed to draw was closed (ScreenErrorBoundary). The
     career stays open and nothing was saved or lost by the error; the player is back on Home with a note. */
  const handleScreenClosed = (_screen: string) => {
    noteStoreReviewTrouble('recovery_mode');
    setActivePage(Page.HOME);
    setToastMessage({ title: 'Screen closed', subtext: 'Something went wrong on that screen, so it was closed. Your career is safe.', tone: 'warning' });
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
      /* Phase 1 of the week-speed plan (2026-11-17), item 2: an open that makes nothing new is not saved. The career
         a slot just opened is its stored copy, migrated (openedCleanRef; a load repair was saved already). This
         hydration then rebuilds parts of it the same way at every open (the universes' status and rosters, energy,
         defaults), which a save would not need to keep, since the next open rebuilds them again. What it makes NEW
         is different: team candidates, weekly offers and a feed drawn at random, ids made from the clock, a legacy
         business turned into a company. Those are marked below (madeNew) and saved once, as before. Anything else,
         and the career counts as saved: no full save just for opening it (it used to follow every open).
         A new fill added to this hydration must set madeNew. */
      const opened = openedCleanRef.current;
      openedCleanRef.current = null;
      let cleanAfterOpen = false;
      setPlayer(prev => {
          const skipMigration = skipNextPlayingMigrationRef.current;
          skipNextPlayingMigrationRef.current = false;
          const safePlayer = (skipMigration ? { ...prev } : migratePlayerSave(prev)) as any;
          const checkOpen = isSwitchOn('openSaveSkip') && skipMigration && !!opened && opened.slot === currentSlot && opened.player === prev;
          let madeNew = false;
          /* Phase 1 (2026-11-17): play time counted after the last full save, kept beside it (see recordActivePlayTime) */
          const sidePlayTimeMs = withSidePlayTime(currentSlot, safePlayer);
          if (sidePlayTimeMs !== null) safePlayer.totalPlayTimeMs = sidePlayTimeMs;
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
          safePlayer.settings.smoothMode = safePlayer.settings.smoothMode === true;

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
          if (!safePlayer.team.availableAgents?.length) { madeNew = true; safePlayer.team.availableAgents = getRandomAgents(3, hiredTeamIds); }
          if (!safePlayer.team.availableManagers?.length) { madeNew = true; safePlayer.team.availableManagers = getRandomManagers(2, hiredTeamIds); }
          if (!Array.isArray(safePlayer.team.availableTrainers) || safePlayer.team.availableTrainers.length === 0) { madeNew = true; safePlayer.team.availableTrainers = getRandomTrainers(2, hiredTeamIds); }
          if (!Array.isArray(safePlayer.team.availableStylists) || safePlayer.team.availableStylists.length === 0) { madeNew = true; safePlayer.team.availableStylists = getRandomStylists(2, hiredTeamIds); }
          if (!Array.isArray(safePlayer.team.availableTherapists) || safePlayer.team.availableTherapists.length === 0) { madeNew = true; safePlayer.team.availableTherapists = getRandomTherapists(2, hiredTeamIds); }
          if (!Array.isArray(safePlayer.team.availablePublicists) || safePlayer.team.availablePublicists.length === 0) { madeNew = true; safePlayer.team.availablePublicists = getRandomPublicists(2, hiredTeamIds); }
          if (!Array.isArray(safePlayer.team.availableWellness) || safePlayer.team.availableWellness.length === 0) { madeNew = true; safePlayer.team.availableWellness = getRandomWellness(2, hiredTeamIds); }
          safePlayer.team = sanitizeTeamPools(safePlayer);

          // Ensure Arrays
          if (!Array.isArray(safePlayer.commitments)) safePlayer.commitments = [];
          if (safePlayer.commitments.some((commitment: any) => !commitment?.id)) madeNew = true;
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
          if (safePlayer.activeReleases.some((release: any) => !release?.id)) madeNew = true;
          safePlayer.activeReleases = safePlayer.activeReleases.map((release: any) => normalizeActiveRelease(release, safePlayer.age, safePlayer.currentWeek));
          if (!Array.isArray(safePlayer.pastProjects)) safePlayer.pastProjects = [];
          if (safePlayer.pastProjects.some((project: any) => !project?.id)) madeNew = true;
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
              madeNew = true;
              safePlayer.weeklyOpportunities = { auditions: generateAuditions(safePlayer, usedTitles), jobs: generatePartTimeJobs(safePlayer) };
          }

          if (safePlayer.instagram.feed.length === 0) { madeNew = true; safePlayer.instagram.feed = generateWeeklyFeed(safePlayer); }

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
              madeNew = true;
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
          if (checkOpen && !madeNew) {
              cleanAfterOpen = true;
              markQuietPlayerUpdate(safePlayer);
          }
          return safePlayer;
      });
      actionsSinceWeekRef.current = { world: 0, other: 0 };
      if (cleanAfterOpen && currentSlot) {
          durableChangeCountRef.current[currentSlot] = changeCountRef.current;
          // the render that showed the career already asked for an autosave; it has nothing to save
          if (autosaveTimerRef.current) {
              window.clearTimeout(autosaveTimerRef.current);
              autosaveTimerRef.current = null;
          }
          autosaveDueRef.current = false;
          firstUnsavedChangeAtRef.current = null;
          markTraceAction('open_full_save_skipped', { flow: 'save_select', save_slot: currentSlot });
          addBreadcrumb('open:full_save_skipped', { save_slot: currentSlot });
      }
    }
  }, [gameStatus]);

  useEffect(() => {
      if (toastMessage) { const t = setTimeout(() => setToastMessage(null), 2500); return () => clearTimeout(t); }
  }, [toastMessage]);

  const handleUpdatePlayer = (updatedPlayer: Player) => {
      const prepared = prepareExternalPlayerUpdateForUi(updatedPlayer);
      // Beta report (2026-11-10): a streaming room's clock tick keeps its quiet mark (no full save each second).
      if (isQuietPlayerUpdate(updatedPlayer)) markQuietPlayerUpdate(prepared);
      setPlayer(prepared);
  };

  /* B29 (2026-11-15): the phone's "message read" flag. It is made on the live save, so it needs no rebuild, and it
     waits for the next real save (the quiet mark): the message opens at once, whatever the career's size. */
  const handleQuietUiUpdate = (updatedPlayer: Player) => {
      setPlayer(markQuietPlayerUpdate(updatedPlayer));
  };

  const handleTrustedMarketUpdate = (updatedPlayer: Player) => {
      const prepared = prepareTrustedMarketUpdateForUi(updatedPlayer);
      // Lag round (2026-11-09): a UI-memory change (a room visited) keeps its quiet mark.
      if (isQuietPlayerUpdate(updatedPlayer)) markQuietPlayerUpdate(prepared);
      setPlayer(prepared);
  };

  const commitProcessedWeekPlayer = (processedPlayer: Player): Player => {
      const onScreen = prepareProcessedWeekForUi(processedPlayer);
      setPlayer(onScreen);
      actionsSinceWeekRef.current = { world: 0, other: 0 };
      if (currentSlot) writeLastWeekShown(currentSlot, onScreen);
      /* Phase 1 (2026-11-17): both callers save the week before they show it (a failed save throws first), so
         what is now on screen is durable. Without this, leaving the app after every week wrote a full save again. */
      if (currentSlot) durableChangeCountRef.current[currentSlot] = changeCountRef.current;
      return onScreen;
  };

  /* Dev menu only: left out of a production build */
  const handleQueueBabyNamingCheat = import.meta.env.DEV ? () => {
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
  } : undefined;

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

  /* Dev menu only: a production build leaves it out, with its two test-company chunks */
  const handleStreamingLaunchQa = import.meta.env.DEV ? async (
    action: 'READY' | 'COMPLETE_BUILD' | 'FULL_PLATFORM', report: (message: string) => void,
  ): Promise<{ok:boolean;message:string}> => {
    if(weekProcessingLockRef.current||isProcessing) return {ok:false,message:'Wait for current processing to finish.'};
    weekProcessingLockRef.current=true;
    setIsProcessing(true);
    if(autosaveTimerRef.current){window.clearTimeout(autosaveTimerRef.current);autosaveTimerRef.current=null;}
    let latest=player;
    try {
      await yieldForWeekProcessingPaint();
      // Preserve pending career edits as the recoverable pre-cheat generation.
      const checkpoint=await persistCurrentSlotSnapshot(player);
      latest=checkpoint;
      const publish=async(candidate:Player)=>{
        const saved=await persistCurrentSlotSnapshot(candidate);
        suppressNextAutosaveRef.current=true;
        commitProcessedWeekPlayer(saved);
        latest=saved;
        return saved;
      };
      if(action==='FULL_PLATFORM') {
        const full=await import('./services/streamingFullPlatformQa');
        await full.buildStreamingFullPlatformQa(checkpoint,{
          processWeek: candidate=>processGameWeek(candidate),persistWeek:publish,
          onProgress:report,yieldToUi:yieldForWeekProcessingPaint,
        });
      } else {
        const qa=await import('./services/streamingLaunchQa');
        if(action==='READY') await publish(qa.prepareStreamingCommissionQa(checkpoint));
        else await qa.advanceStreamingCommissionQa(checkpoint,{
          processWeek: candidate=>processGameWeek(candidate),persistWeek:publish,
          onProgress:(done,total)=>report(`Saved ${done} of ${total} weeks. Opening Night remains manual.`),
          yieldToUi:yieldForWeekProcessingPaint,
        });
      }
      if(latest.flags?.isDead){setGameStatus('DEATH_SCREEN');return {ok:false,message:'Career ended during fast-forward. Completed weeks are saved.'};}
      const company=latest.ownedStreamingPlatform;
      const message=action==='FULL_PLATFORM'
        ? `${company.identity?.name || 'The test company'} is live: ${company.catalogProjectIds.length} titles, ${company.marketOperations.filter(row=>row.status==='ACTIVE').length} markets, ${company.weeklyHistory.length} weeks of history.`
        : action==='READY'?'Both wizards prepared for 197 markets. Open Streaming and press Commission.':`Build time processed and saved through week ${latest.currentWeek}. Open Streaming to review the Opening Programme.`;
      setLifestyleInitialView('STREAMING_PLATFORM');
      setActivePage(Page.LIFESTYLE);
      return {ok:true,message};
    } catch(error) {
      if(latest.flags?.isDead) setGameStatus('DEATH_SCREEN');
      return {ok:false,message:error instanceof Error?error.message:'Streaming QA failed. Only verified saves were published.'};
    } finally {
      weekProcessingLockRef.current=false;
      lastWeekProcessSettledAtRef.current=Date.now();
      setIsProcessing(false);
    }
  } : undefined;

  // Screens far from the player read whether the pack is owned.
  useEffect(() => { setStreamingPlusOwnedNow(hasStreamingPlus(player)); }, [player]);

  // Forced ads read the live state: No Ads, a new career, an open popup, debt or a crisis, the Store.
  useEffect(() => {
      setForcedAdContext({
          noAds: gameStatus !== 'PLAYING' || hasNoAds(player),
          careerWeek: forcedAdCareerWeek(player),
          decisionOpen: Boolean(
              player.pendingEvents?.length || player.pendingEvent || showDebtModal || pendingMedicalPrompt
              || pendingBabyNaming || activeSocialEvent || activePressEvent || showProtectionPrompt,
          ),
          inTrouble: isForcedAdTrouble(player),
          storeOpen: activePage === Page.STORE,
      });
  }, [gameStatus, player, showDebtModal, pendingMedicalPrompt, pendingBabyNaming, activeSocialEvent, activePressEvent, showProtectionPrompt, activePage]);

  const handleNextWeek = async () => {
    const now = Date.now();
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
    /* Phase 1 (2026-11-17), telemetry v2: week_to_screen runs from the tap to the week on screen (the forced ad and
       decision popups come after it), beside process_game_week, which stays as it is (plus forced_ad at its stop). */
    const readingMs = lastWeekOnScreenAtRef.current !== null ? Date.now() - lastWeekOnScreenAtRef.current : null;
    // Phase 1 (2026-11-17), telemetry v2: the player's actions since the last week, at the tap.
    const actionsAtTap = { ...actionsSinceWeekRef.current };
    const weekToScreenTrace = 'week_to_screen';
    let weekToScreenOpen = false;
    let weekForcedAdShown = false;
    const activePageName = Page[activePage] || String(activePage);
    const weekRunId = `week_${player.age}_${player.currentWeek}_${Date.now().toString(36)}`;
    const previousHealthConditionIds = new Set(
      (Array.isArray(player.activeHealthConditions) ? player.activeHealthConditions : [])
        .map(condition => condition?.id)
        .filter(Boolean),
    );
    weekProcessingLockRef.current = true;
    notePageWeekStage('start');
    weekTapGuardRef.current = true;
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
        if (!isPerformanceTraceActive(weekToScreenTrace)) {
          startPerformanceTrace(weekToScreenTrace);
          weekToScreenOpen = true;
        }
        /* Week Ahead (2026-11-12): when the background worker has prepared this exact career's week (or is still
           preparing it), that week is taken. It was played, finished and prepared for saving by the same code App
           runs below, on a structured copy, and it is saved here through the same verified path (written, read
           back, checked) before it is shown, so a closed app never shows a week that was not saved. Otherwise, or
           if anything about it fails, App plays the week itself exactly as before. */
        const weekAhead = weekAheadRef.current;
        const weekSaveKey = `actorEmpireSave_${currentSlot}`;
        let aheadTaken: WeekAheadTake | null = null;
        let aheadWritten: WeekAheadWriteOutcome | null = null;
        // Phase 1 (2026-11-17), telemetry v2: was the week already prepared when the player tapped?
        const aheadPreparedAtTap = weekAhead ? weekAhead.state().prepared : false;
        if (weekAhead && currentSlot) {
            activeWeekStageRef.current = 'week_ahead_take';
            markWeekProcessingStage('week_ahead_take', player, {
                run_id: weekRunId,
                screen: activePageName,
                save_slot: currentSlot,
            });
            // The worker writes the week as this slot's save while this thread reads it. This slot's save queue
            // is held until that write is confirmed, so no other save of the slot can land before or across it.
            aheadTaken = await withNativeBackgroundTask(() => runInVerifiedSaveQueue(weekSaveKey, async () => {
                /* Phase 1 (2026-11-17): waiting longer than this device takes to play the week itself never helps, so
                   the wait is this slot's own main-path week plus 0.5 s (the 90 s cap stays for a slot never timed). */
                const slotWeekMs = Number((() => { try { return localStorage.getItem(WEEK_AHEAD_SLOT_KEY + currentSlot); } catch { return null; } })());
                const takeTimeoutMs = Number.isFinite(slotWeekMs) && slotWeekMs > 0
                    ? Math.min(WEEK_AHEAD_TAKE_TIMEOUT_MS, Math.round(slotWeekMs) + 500)
                    : WEEK_AHEAD_TAKE_TIMEOUT_MS;
                const taken = await weekAhead.take(player, takeTimeoutMs, { key: weekSaveKey, live: getVerifiedLiveSave(weekSaveKey) });
                if (taken?.written) aheadWritten = await taken.written;
                return taken;
            }));
        }
        let triggerAd = false;
        let weekSync: Omit<PostWeekSync, 'player'> = { shouldTriggerBabyQa: false, babyNamingDue: null, medicalPromptToShow: null };
        let persistedPlayerState: Player | null = null;
        if (aheadTaken) {
            const { result } = aheadTaken;
            markWeekProcessingStage('week_ahead_taken', player, {
                run_id: weekRunId,
                screen: activePageName,
                save_slot: currentSlot,
                elapsed_ms: Math.round(performance.now() - startedAt),
                waited_ms: aheadTaken.waitedMs,
                prepared_ms: result.timings.totalMs,
            });
            const preparedWeekPlayer = result.player;
            adoptIssuedManifest(preparedWeekPlayer, result.manifest);
            const written = aheadWritten as WeekAheadWriteOutcome | null;
            if (written && written.ok === true) setVerifiedLiveSave(weekSaveKey, written.committed);
            else if (written && written.ok === false) recordNonFatal(new Error(written.message), 'week_ahead_write_failed', { age: player.age, week: player.currentWeek });
            try {
                activeWeekStageRef.current = 'persist_prepare_start';
                persistedPlayerState = await persistCurrentSlotSnapshot(preparedWeekPlayer, {
                    runId: weekRunId,
                    screen: activePageName,
                    onStage: stage => { activeWeekStageRef.current = stage; },
                }, {
                    manifest: result.manifest,
                    retainPrevious: result.retainPrevious,
                    needsRecoveryCheckpoint: result.needsRecoveryCheckpoint,
                    // A write the worker could not confirm is written here instead, the usual way.
                    alreadyWritten: written?.ok === true,
                });
            } catch (error) {
                recordNonFatal(error, 'week_ahead_save_failed', { age: player.age, week: player.currentWeek });
                weekAhead?.abandon();
                persistedPlayerState = null;
            }
            if (persistedPlayerState) {
                applyNpcChanges(result.npcChanges, result.npcLength);
                result.nonFatals.forEach(report => {
                    const reported = new Error(report.message);
                    reported.name = report.name;
                    recordNonFatal(reported, report.label, report.context);
                });
                // The week's own analytics events (game_loop_completed, marketing_reality), sent for this week only.
                result.gameEvents.forEach(([name, params]) => trackGameEvent(name, params));
                triggerAd = result.triggerAd;
                weekSync = {
                    shouldTriggerBabyQa: result.shouldTriggerBabyQa,
                    babyNamingDue: result.babyNamingDue,
                    medicalPromptToShow: result.medicalPromptToShow,
                };
            } else {
                aheadTaken = null;
            }
        }
        if (!persistedPlayerState) {
            activeWeekStageRef.current = 'game_loop_start';
            markWeekProcessingStage('game_loop_start', player, {
                run_id: weekRunId,
                screen: activePageName,
                save_slot: currentSlot,
            });
            const loopStartedAt = performance.now();
            const { player: newPlayerState, triggerAd: loopTriggerAd } = await processGameWeek(player, {
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
            markWeekProcessingStage('post_week_sync_start', newPlayerState, {
                run_id: weekRunId,
                screen: activePageName,
                save_slot: currentSlot,
                elapsed_ms: Math.round(performance.now() - startedAt),
            });
            // The same post-week step the Week Ahead worker runs (services/weekAhead/postWeekSync.ts).
            const sync = syncPlayerAfterWeek(newPlayerState, previousHealthConditionIds);
            markWeekProcessingStage('post_week_sync_done', sync.player, {
                run_id: weekRunId,
                screen: activePageName,
                save_slot: currentSlot,
                elapsed_ms: Math.round(performance.now() - startedAt),
            });

            activeWeekStageRef.current = 'persist_prepare_start';
            persistedPlayerState = await persistCurrentSlotSnapshot(sync.player, {
                runId: weekRunId,
                screen: activePageName,
                onStage: stage => { activeWeekStageRef.current = stage; },
            });
            triggerAd = loopTriggerAd;
            weekSync = {
                shouldTriggerBabyQa: sync.shouldTriggerBabyQa,
                babyNamingDue: sync.babyNamingDue,
                medicalPromptToShow: sync.medicalPromptToShow,
            };
            if (currentSlot) {
                // How long this device takes for this career's week decides whether Week Ahead helps next time.
                const weekMs = performance.now() - loopStartedAt;
                rememberSlotWeekMs(currentSlot, weekMs);
                if (weekMs >= WEEK_AHEAD_MIN_WEEK_MS && !weekAheadOn && readWeekAheadWanted(currentSlot)) setWeekAheadOn(true);
            }
        }
        const syncedPlayerState: Player = persistedPlayerState;
        const { shouldTriggerBabyQa, babyNamingDue, medicalPromptToShow } = weekSync;
        activeWeekStageRef.current = 'commit_verified_week';
        suppressNextAutosaveRef.current = true;
        const weekOnScreen = commitProcessedWeekPlayer(persistedPlayerState);
        if (weekToScreenOpen) {
            weekToScreenOpen = false;
            const engine = weekAhead?.drainEngineStats() ?? { busyMs: 0, discardedMs: 0 };
            const takenWeek = aheadTaken as WeekAheadTake | null;
            stopPerformanceTrace(weekToScreenTrace, {
                ...(readingMs !== null ? { reading_ms: readingMs } : {}),
                ...(takenWeek ? { waited_ms: takenWeek.waitedMs, prepared_ms: Math.round(takenWeek.result.timings.totalMs) } : {}),
                engine_busy_ms: engine.busyMs,
                engine_discarded_ms: engine.discardedMs,
                actions_world: actionsAtTap.world,
                actions_other: actionsAtTap.other,
            }, {
                path: readingMs === null ? 'first_week' : !weekAhead ? 'main' : takenWeek ? (aheadPreparedAtTap ? 'ahead_hit' : 'ahead_wait') : 'ahead_miss',
                size_bucket: sizeBucketOf(storageMbRef.current),
                ram_class: getRamClass(),
                ad: triggerAd ? 1 : 0,
                quick_tap: readingMs !== null && readingMs >= 300 && readingMs <= 1000 ? 1 : 0,
            });
        }
        lastWeekOnScreenAtRef.current = Date.now();
        if (aheadTaken) weekAhead?.committed(weekOnScreen);
        weekTapGuardRef.current = false;
        addBreadcrumb('process_week:persisted', {
            age: syncedPlayerState.age,
            week: syncedPlayerState.currentWeek,
            saveSlot: currentSlot,
        });
        /* store ratings: every applied week counts; a happy moment (an award won, a finished hit) in a quick week
           without the break ad waits for a calm Home screen (services/storeReview.ts) */
        noteStoreReviewWeek();
        const reviewMoment = findStoreReviewMoment(player, syncedPlayerState);
        if (reviewMoment && !triggerAd && performance.now() - startedAt <= STORE_REVIEW_RULES.maxHappyWeekMs) {
            pendingReviewMomentRef.current = { moment: reviewMoment, at: Date.now() };
            setReviewMomentTick(tick => tick + 1);
        }

        if (medicalPromptToShow) {
            setPendingMedicalPrompt(medicalPromptToShow);
        }

        /* the dev menu's baby-naming test: never in a production build */
        if (import.meta.env.DEV && shouldTriggerBabyQa) {
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

        // The week's break (every 12th week): the week is saved; the ad, if loaded and allowed,
        // shows while "Processing week" is still up, so it lands before the new week's screen and popups.
        noteForcedAdWeekPassed();
        if (triggerAd && !hasNoAds(syncedPlayerState)) {
            // Phase 1 (2026-11-17): the ad is timed in its own trace (week_to_screen ended before it).
            startPerformanceTrace('week_forced_ad');
            try {
                weekForcedAdShown = await showForcedAd('WEEK', {
                    noAds: false,
                    careerWeek: forcedAdCareerWeek(syncedPlayerState),
                    inTrouble: isForcedAdTrouble(syncedPlayerState),
                });
            } finally {
                stopPerformanceTrace('week_forced_ad', {}, { shown: weekForcedAdShown ? 1 : 0 });
            }
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
        weekAheadRef.current?.abandon();
        const failurePresentation = describeWeekProcessingFailure(activeWeekStageRef.current, error);
        noteStoreReviewTrouble('week_not_applied');
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
      notePageWeekStage(null);
      weekTapGuardRef.current = false;
      setIsProcessing(false);
      try {
        // Phase 1 (2026-11-17), the plan's Phase H item 7: forced_ad (0 or 1) is set at the stop.
        /* Phase 1 (2026-11-17), plan item 8: the save limit this week's write ran with (B3 turns a failed ~12 s week
           plus a retry into one finished 20-90 s week, so the p90s are read with it). */
        const saveLimitMs = currentSlot ? readSaveWriteRecord(`actorEmpireSave_${currentSlot}`)?.limitMs : undefined;
        stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt), ...(saveLimitMs ? { save_limit_ms: saveLimitMs } : {}) }, { forced_ad: weekForcedAdShown ? 1 : 0 });
        if (weekToScreenOpen) stopPerformanceTrace(weekToScreenTrace, {}, { path: 'failed' });
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

  // --- REWARDED AD SYSTEM (FIXED FOR MULTI-STEP) ---
  const handleTriggerRewardAd = async (type: AdType, data?: any) => {
      if (type === 'REWARDED_BAILOUT' && (player.flags?.bailoutAdsUsedThisWeek || 0) >= 2) {
          setToastMessage({
              title: tr('app.rewards.bailoutLimitTitle'),
              subtext: tr('app.rewards.bailoutLimitSubtext')
          });
          return;
      }

      const steps = (type === 'REWARDED_STATS') ? 2 : 1;
      if (!currentSlot) {
          setToastMessage({
              title: tr('app.rewards.cancelledTitle'),
              subtext: tr('app.rewards.cancelledSubtext')
          });
          return;
      }
      let pendingReceipt: PendingRewardAdReceipt = beginPendingRewardAd({
          playerId: String(player.id || player.name),
          saveSlot: currentSlot,
          type,
          data,
          stepsRequired: steps,
      });
      const noAdsOwner = hasNoAds(player);
      trackGameEvent('reward_ad_requested', {
          reward_type: type,
          no_ads_owner: noAdsOwner,
          steps,
      });
      setAdTotalSteps(steps);
      setAdStep(1);
      setIsShowingAd(true);

      let successCount = 0;
      let lastFailureReason: string | undefined;

      try {
          for (let i = 1; i <= steps; i++) {
              setAdStep(i);

              // BUFFER: If this is the 2nd (or later) ad, wait 1.5s to let the ad engine reset
              // This prevents "Ad Not Ready" errors or UI hangs
              if (i > 1) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
              }

              const result = await showAd(type, {
                  // AE-005: the SDK says this step is earned. Note it at once, so a restart before the ad closes still pays it.
                  onEarned: () => { pendingReceipt = recordPendingRewardAdStep(pendingReceipt, successCount + 1); },
              });
              trackGameEvent('reward_ad_result', {
                  reward_type: type,
                  no_ads_owner: noAdsOwner,
                  success: result.success,
                  reason: result.reason || 'NONE',
                  step: i,
              });

              if (result.success) {
                  successCount++;
                  pendingReceipt = recordPendingRewardAdStep(pendingReceipt, successCount);
              } else {
                  // If user cancels or ad fails, break loop
                  lastFailureReason = result.reason;
                  break;
              }

              // Tiny buffer after closing ad before updating UI or next step
              await new Promise(resolve => setTimeout(resolve, 500));
          }
      } catch (error) {
          console.error("Ad sequence error:", error);
      } finally {
          // CRITICAL FIX: This ensures the overlay ALWAYS closes, even if code crashes or hangs
          setIsShowingAd(false);
          // a rewarded ad restarts the forced ads' minutes, so none lands right after it
          noteAdClosed();
      }

      if (successCount === steps) {
          pendingReceipt = markPendingRewardAdReady(pendingReceipt);
          handleAdComplete(type, data, pendingReceipt.id);
      } else {
          clearPendingRewardAd(pendingReceipt.id);
          // AE-005: "watch the complete ad" only when the player closed it early; no ad at all says so
          const noAdReady = lastFailureReason === 'UNAVAILABLE' || lastFailureReason === 'ERROR';
          setToastMessage({
              title: tr(noAdReady ? 'app.rewards.unavailableTitle' : 'app.rewards.cancelledTitle'),
              subtext: tr(noAdReady ? 'app.rewards.unavailableSubtext' : 'app.rewards.cancelledSubtext')
          });
      }
  };

  const handleAdComplete = (type: AdType, data?: any, receiptId?: string) => {
      let toastTitle = tr('app.rewards.receivedTitle');
      let toastSub = "";
      if (receiptId) rewardAdGrantInFlightRef.current.add(receiptId);

      handleGenericUpdate(prev => {
          /* 2026-11-12: a reward used to copy the whole career (JSON) first; on a late career that alone could
             get the game killed right after an ad. Only the parts the reward touches are copied now. */
          const copy = createCopyOnTouch(prev);
          const p = copy.draft as Player;
          if (!p.flags) p.flags = {};
          const grantedRewardAdIds = Array.isArray(p.flags.grantedRewardAdIds)
              ? p.flags.grantedRewardAdIds as string[]
              : [];
          if (receiptId && grantedRewardAdIds.includes(receiptId)) {
              clearPendingRewardAd(receiptId);
              rewardAdGrantInFlightRef.current.delete(receiptId);
              return copy.finish(p) as Player;
          }
          if (receiptId) {
              p.flags.grantedRewardAdIds = [...grantedRewardAdIds, receiptId].slice(-80);
          }

          if (type === 'REWARDED_CASH') {
              // grows with the player: 0.1% of net worth, $5,000 to $250,000, personal wallet only
              const cash = rewardedCashAmount(p);
              p.money += cash;
              toastSub = `+${formatMoney(cash)}`;
          }
          else if (type === 'REWARDED_BAILOUT') {
              const bailoutAdsUsedThisWeek = p.flags?.bailoutAdsUsedThisWeek || 0;
              const currentDebt = Math.abs(p.money < 0 ? p.money : 0);
              const bailoutAmount = bailoutAdsUsedThisWeek === 0
                  ? Math.floor(currentDebt * 0.20) + 5000
                  : Math.floor(currentDebt * 0.10) + 2500;

              p.money += bailoutAmount;
              p.flags.bailoutAdsUsedThisWeek = bailoutAdsUsedThisWeek + 1;
              toastSub = tr('app.rewards.bailoutSubtext', { amount: bailoutAmount.toLocaleString() });

              // Close debt modal if we are back in green
              if (p.money >= 0) {
                  setShowDebtModal(false);
              }
          }
          else if (type === 'REWARDED_ENERGY') {
              restoreWeeklyEnergy(p, 25);
              toastSub = tr('app.rewards.energySubtext', { amount: '25' });
          }
          else if (type === 'REWARDED_STATS') {
              p.stats.health = Math.max(90, p.stats.health);
              p.stats.happiness = Math.max(90, p.stats.happiness);
              p.stats.looks = Math.max(90, p.stats.looks);
              p.stats.body = Math.max(90, p.stats.body);
              toastSub = tr('app.rewards.wellnessSubtext');
          }
          else if (type === 'REWARDED_SKILL' && data) {
              const skillKey = data as keyof ActorSkills;
              p.stats.skills[skillKey] = Math.min(100, p.stats.skills[skillKey] + 10);
              toastSub = tr('app.rewards.skillSubtext', { amount: '10', skill: String(skillKey) });
          }
          else if (type === 'REWARDED_GENRE' && data) {
              rewardGenreExperience(p, data, 10);
              toastSub = tr('app.rewards.genreSubtext', { amount: '10', genre: String(data) });
          }

          setToastMessage({ title: toastTitle, subtext: toastSub });
          const granted = copy.finish(p) as Player;
          if (receiptId && currentSlot) {
              void persistSlotSave(currentSlot, granted, { rethrow: true })
                  .then(savedPlayer => {
                      setSaveSlots(previous => ({ ...previous, [currentSlot]: savedPlayer }));
                      clearPendingRewardAd(receiptId);
                      rewardAdGrantInFlightRef.current.delete(receiptId);
                  })
                  .catch(error => {
                      rewardAdGrantInFlightRef.current.delete(receiptId);
                      recordNonFatal(error, 'reward_ad_grant_persist_failed', {
                          reward_type: type,
                          save_slot: currentSlot,
                      });
                  });
          }
          return granted;
      });
  };

  useEffect(() => {
      if (gameStatus !== 'PLAYING' || !currentSlot || isShowingAd) return;
      const pendingReceipt = readPendingRewardAd();
      if (!pendingReceipt) return;
      if (rewardAdGrantInFlightRef.current.has(pendingReceipt.id)) return;
      if (pendingReceipt.playerId !== String(player.id || player.name) || pendingReceipt.saveSlot !== currentSlot) {
          clearPendingRewardAd(pendingReceipt.id);
          return;
      }
      // AE-005: every step the SDK reported as earned counts, even when the app closed before the ad did.
      if (pendingReceipt.completedSteps === pendingReceipt.stepsRequired) {
          trackGameEvent('reward_ad_recovered', {
              reward_type: pendingReceipt.type,
              completed_steps: pendingReceipt.completedSteps,
          });
          handleAdComplete(pendingReceipt.type, pendingReceipt.data, pendingReceipt.id);
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
              title: result.cancelled
                  ? tr('app.purchases.cancelledTitle')
                  : result.pending ? tr('app.purchases.pendingTitle') : tr('app.purchases.failedTitle'),
              subtext: result.message
          });
          return;
      }

      noteRealPurchase();
      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          const alreadyGranted = hasProcessedStoreTransaction(p, result.transactionId);
          if (!alreadyGranted) markProcessedStoreTransaction(p, result.transactionId);
          const message = alreadyGranted ? result.message : applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: message });
          // Phase 1 (2026-11-17): the ledger first, then the save, then the store is told (below).
          const ledgerWritten = alreadyGranted ? Promise.resolve() : recordConsumableGrants(currentSlot, p.id, [{ transactionId: result.transactionId, productId }]);
          /* Android consumable: saved first, then finished with Play, so an interrupted app loses nothing */
          if (result.purchaseToken) {
              const token = result.purchaseToken;
              const saving = ledgerWritten.then(() => currentSlot ? persistSlotSave(currentSlot, p, { rethrow: true }) : p);
              void saving
                  .then(savedPlayer => {
                      if (currentSlot) setSaveSlots(previous => ({ ...previous, [currentSlot]: savedPlayer }));
                      return finishAndroidConsumable(token);
                  })
                  .catch(error => recordNonFatal(error, 'premium_consumable_persist_failed', { product_id: productId }));
          }
          /* iOS, every product: StoreKit keeps the transaction open until this save is done. Only then is it finished,
             so a crash or a failed save leaves it for the next launch, where the record above stops a second grant. */
          if (result.iosTransactionId && currentSlot) {
              const transactionId = result.iosTransactionId;
              const slot = currentSlot;
              void ledgerWritten.then(() => persistSlotSave(slot, p, { rethrow: true }))
                  .then(savedPlayer => {
                      setSaveSlots(previous => ({ ...previous, [slot]: savedPlayer }));
                      rememberStoreTransactionDelivered(transactionId);
                      return finishIOSTransaction(transactionId);
                  })
                  .catch(error => recordNonFatal(error, 'premium_ios_purchase_persist_failed', { product_id: productId }));
          }
          if (productId === 'streaming_plus' && !alreadyGranted) announceStreamingPlusUnlocked();
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
      applyRestoredPurchases(result, false);
  };

  /* quiet: the Android launch check, which only speaks when it delivered something */
  const applyRestoredPurchases = (result: Awaited<ReturnType<typeof restorePremiumPurchases>>, quiet: boolean) => {
      if (!result.success) {
          if (!quiet) setToastMessage({ title: tr('app.purchases.restoreFailedTitle'), subtext: result.message });
          return;
      }

      const restoredPermanentProductIds = uniquePermanentPremiumIds(result.restoredProductIds);
      const unclaimed = result.unclaimedConsumables || [];
      if (restoredPermanentProductIds.length === 0 && unclaimed.length === 0) {
          if (!quiet) setToastMessage({ title: tr('app.purchases.nothingToRestoreTitle'), subtext: result.message });
          return;
      }
      const newPermanent = restoredPermanentProductIds.filter(productId => !hasPremiumProduct(player, productId));
      const entitlementProductIds = rememberPremiumEntitlements(restoredPermanentProductIds);
      const hadStreamingPlus = hasPremiumProduct(player, 'streaming_plus');

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          entitlementProductIds.forEach(productId => {
              applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          });
          /* paid items the game never received: delivered once (by their order id), saved, then finished with Play */
          let delivered = 0;
          const granted: Array<{ transactionId?: string; productId: PremiumProductId }> = [];
          unclaimed.forEach(item => {
              if (hasProcessedStoreTransaction(p, item.transactionId)) return;
              markProcessedStoreTransaction(p, item.transactionId);
              applyPremiumPurchase(p, item.productId, getPlayerLanguage(p));
              granted.push({ transactionId: item.transactionId, productId: item.productId });
              delivered += 1;
          });
          if (unclaimed.length) {
              // Phase 1 (2026-11-17): the ledger first, then the save, then Play is told.
              const saving = recordConsumableGrants(currentSlot, p.id, granted).then(() => currentSlot ? persistSlotSave(currentSlot, p, { rethrow: true }) : p);
              void saving
                  .then(savedPlayer => {
                      if (currentSlot) setSaveSlots(previous => ({ ...previous, [currentSlot]: savedPlayer }));
                      return Promise.all(unclaimed.map(item => finishAndroidConsumable(item.purchaseToken)));
                  })
                  .catch(error => recordNonFatal(error, 'premium_recovery_persist_failed'));
          }
          if (!quiet || delivered > 0 || newPermanent.length > 0) setToastMessage({
              title: tr('app.purchases.restoredTitle'),
              subtext: restoredPermanentProductIds.length
                  ? tr('app.purchases.restoredSubtext', { count: restoredPermanentProductIds.length.toString() })
                  : tr('app.purchases.recoveredSubtext', { count: String(delivered) }),
          });
          return p;
      });
      if (!hadStreamingPlus && entitlementProductIds.includes('streaming_plus')) announceStreamingPlusUnlocked();
      /* Crash fix (19 Nov 2026), FIX-PLAN item 2.5 (decision 6): Android's quiet checks (4 s after every open, and Play's
         purchase updates) no longer read and re-save every other career in the background: two whole careers loaded
         and copied right after an open, every launch, for everyone who owns a permanent purchase. The purchase is
         remembered on this phone (rememberPremiumEntitlements above), and every career gets it the next time it opens
         (prepareLoadedPlayerSave). A Restore the player taps still updates the other careers at once, as before. */
      if (entitlementProductIds.length && !quiet) void syncPermanentPremiumEntitlementsToSavedSlots(entitlementProductIds);
  };

  /* Phase 1 (2026-11-17), the purchase ledger: once after every career open (a recovery opens the career again), each
     ledger grant for this slot and career that the opened copy does not carry (granted after that copy was saved,
     and not in its processed list) is granted again, once, and the career is saved. */
  useEffect(() => {
      if (gameStatus !== 'PLAYING' || !currentSlot) return;
      const token = ledgerOpenTokenRef.current;
      if (!token || token === ledgerCheckedTokenRef.current) return;
      ledgerCheckedTokenRef.current = token;
      const slot = currentSlot;
      const openedSavedAt = openedCopySavedAtRef.current[slot] ?? 0;
      void readPurchaseLedger().then(entries => {
          if (ledgerOpenTokenRef.current !== token) return; // another career opened since
          const careerId = playerRef.current.id;
          const missing = entries.filter(entry => entry.slot === slot && entry.careerId === careerId && entry.at > openedSavedAt
              && !hasProcessedStoreTransaction(playerRef.current, entry.transactionId));
          if (missing.length === 0) return;
          handleGenericUpdate(prev => {
              const p = JSON.parse(JSON.stringify(prev)) as Player;
              let restored = 0;
              missing.forEach(entry => {
                  if (hasProcessedStoreTransaction(p, entry.transactionId)) return;
                  markProcessedStoreTransaction(p, entry.transactionId);
                  applyPremiumPurchase(p, entry.productId as PremiumProductId, getPlayerLanguage(p));
                  restored += 1;
              });
              if (restored > 0) {
                  addBreadcrumb('purchase_ledger:reapplied', { count: restored, save_slot: slot });
                  setToastMessage({ title: tr('app.purchases.restoredTitle'), subtext: tr('app.purchases.recoveredSubtext', { count: String(restored) }) });
                  void persistSlotSave(slot, p, { rethrow: true })
                      .then(savedPlayer => setSaveSlots(previous => ({ ...previous, [slot]: savedPlayer })))
                      .catch(error => recordNonFatal(error, 'purchase_ledger_reapply_persist_failed', { count: restored }));
              }
              return p;
          });
      }).catch(error => recordNonFatal(error, 'purchase_ledger_read_failed'));
  }, [gameStatus, currentSlot]);

  // Play: purchases are checked again at launch, so a paid item interrupted mid-purchase still arrives.
  const androidPurchaseCheckDoneRef = useRef(false);
  useEffect(() => {
      if (gameStatus !== 'PLAYING' || !currentSlot || androidPurchaseCheckDoneRef.current || !isAndroidStore()) return;
      const timer = window.setTimeout(() => {
          androidPurchaseCheckDoneRef.current = true;
          void restorePremiumPurchases()
              .then(result => applyRestoredPurchases(result, true))
              .catch(error => recordNonFatal(error, 'android_purchase_launch_check_failed'));
      }, 4000);
      return () => window.clearTimeout(timer);
  }, [gameStatus, currentSlot]);

  // Play reported a completed purchase while the game is open (purchasesUpdated): the same collection, once a career plays.
  useEffect(() => {
      if (androidPurchaseUpdatesWaiting === 0 || gameStatus !== 'PLAYING' || !currentSlot) return;
      setAndroidPurchaseUpdatesWaiting(0);
      void restorePremiumPurchases()
          .then(result => applyRestoredPurchases(result, true))
          .catch(error => recordNonFatal(error, 'android_purchase_update_check_failed'));
  }, [androidPurchaseUpdatesWaiting, gameStatus, currentSlot]);

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
          // AE-024: a new career starts in the phone's language when the game has it, else English
          settings: { ...INITIAL_PLAYER.settings, language: detectDeviceGameLanguage() },
	          flags: {
	              ...(INITIAL_PLAYER.flags || {}),
	              ...careerStartFlag(age, INITIAL_PLAYER.currentWeek || 1),
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
    dropStartupSlotPreload();
    // Crash fix (19 Nov 2026): a new career in this slot; the old career's save record no longer applies.
    forgetSaveWriteRecord(`actorEmpireSave_${slot}`);
      const name = data.stageName.trim() || 'Rising Star';
      const introGender = data.gender === 'Female' ? 'FEMALE' : data.gender === 'Non-Binary' ? 'NON_BINARY' : 'MALE';
      const rawHandle = data.handle.trim() || name.toLowerCase().replace(/\s+/g, '');
      const handle = rawHandle.startsWith('@') ? rawHandle : `@${rawHandle}`;
      const avatar = data.avatarDataUrl || getGenderedAvatar(introGender as any, `${name}-${data.presetIndex}`);
      setCurrentSlot(slot);
      handleStartGame(name, data.age, introGender, avatar, handle, slot);
  };

  /* Dev menu only: left out of a production build */
  const handleOpenDeathSummaryPreview = import.meta.env.DEV ? () => {
      setDeathScreenPreviewPlayer(clone(player));
  } : undefined;

  const handleUpdateTutorialState = (state: NewPlayerTutorialState) => {
      handleGenericUpdate(prev => writeNewPlayerTutorialState(prev, state));
  };

  const handleContinueAsChild = (child: any, streamingChoice?: StreamingHandoffChoice) => {
      const inheritancePreview = getLegacyInheritancePreview(player);
      /* #207: the estate on the streaming stake, if it is paid from the cash inherited */
      const streamingEstate = getStreamingEstate(player, streamingChoice);
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
          money: Math.max(0, inheritancePreview.inheritedMoney - (streamingEstate?.cashPaid || 0)),
          soldStreamingCompanies: player.soldStreamingCompanies,
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
              streamingChoice,
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

          const nextPlayer = {
              ...updatedPlayer,
              pendingEvents: newPendingEvents,
              logs: nextLogs
          };
          const receiptKey = eventRewardKey(currentSlot, String(sourcePlayer.id || sourcePlayer.name), resolvedEventId);
          if (currentSlot && receiptKey && readEventReward(receiptKey) !== null) {
              const prepared = prepareExternalPlayerUpdateForUi(nextPlayer);
              setPlayer(prepared);
              void persistSlotSave(currentSlot, prepared, { rethrow: true, reason: 'LIFE_EVENT_RESOLUTION' }).then(
                  () => clearEventReward(receiptKey),
                  error => console.error('Could not save the recovered event ad reward:', error)
              );
          } else {
              handleUpdatePlayer(nextPlayer);
          }
      } catch (error) {
          console.error('Queued event resolution failed:', error);
          setToastMessage({
              title: tr('app.eventRecovery.toastTitle'),
              subtext: tr('app.eventRecovery.toastSubtext')
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
          acknowledgeStockControlNotice(player, event.data?.stockId || '', 'OPEN'),
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
          acknowledgeStockControlNotice(player, stockId, 'OPEN'),
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
        clearLastWeekShown(currentSlot);
        await deleteVerifiedGameData(`actorEmpireSave_${currentSlot}`);
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
          energy: { ...p.energy },
          flags: { ...p.flags },
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

  if (isStartupLoadingVisible) {
      const showStudioBumper = !startupStudioBumperElapsed;
      return (
          <div className="relative h-screen overflow-hidden bg-[#050505] text-white">
              <ActorEmpireIntroStyle />
              {showStudioBumper ? (
                  <ZedburyStudiosIntro state={startupStudioBumperExiting ? 'on exit' : 'on'} />
              ) : (
                  <StartupLoadingBar
                      durationMs={STARTUP_LOADING_BAR_MS}
                      savesReady={startupSavesListed}
                      careerReady={startupCareerSettled}
                      lineKeys={STARTUP_LOADING_LINE_KEYS}
                      translate={tr}
                  />
              )}
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

  /* The debt banner fills the status band and one row under it. It shows with the bottom nav, so on the tabs, where the pages move
     down a row for it (actorEmpireShell.css); a full-screen room or app hides the nav, and the banner with it, so it never covers a header. */
  const showDebtBanner = gameStatus === 'PLAYING' && isBottomNavVisible && player.money < 0 && !showDebtModal;

  return (
    <GameErrorBoundary onRecover={handleRecoverToMenu} onReport={handleSendRecoveryModeReport}>
    <div ref={shellRef} className="ae-game-shell bg-black text-white font-sans selection:bg-amber-500 selection:text-black" data-shell-nav-visible={gameStatus === 'PLAYING' && isBottomNavVisible ? 'true' : 'false'} data-debt-banner={showDebtBanner ? 'true' : 'false'}>
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950 pointer-events-none" />

      {pendingSaveRecovery && (
          <SaveRecoveryModal
              playerName={pendingSaveRecovery.previous.name}
              reason={pendingSaveRecovery.reason}
              points={pendingSaveRecovery.points.map(point => ({ ...point, weeksLost: weeksLostByRestoring(point, pendingSaveRecovery.lastShown, pendingSaveRecovery.careerId) }))}
              lastShown={pendingSaveRecovery.lastShown && pendingSaveRecovery.lastShown.careerId === pendingSaveRecovery.careerId ? pendingSaveRecovery.lastShown : null}
              flaggedVersion={pendingSaveRecovery.flaggedVersion}
              isRecovering={isRecoveringSave}
              onRecover={handleRecoverSave}
              onCancel={handleCancelSaveRecovery}
              onSendReport={pendingSaveRecovery.reason === 'LOAD_FAILED' ? handleSendSaveRecoveryReport : undefined}
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
              onSendReport={handleSendWeekFailureReport}
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

      {/* DEBT / GAME OVER MODAL */}
      {showDebtModal && (
          <div className="fixed inset-0 z-[250] bg-red-950/80 backdrop-blur-md flex items-center justify-center p-6 animate-in zoom-in-95 duration-300">
              <div className="bg-zinc-900 border-2 border-red-500/50 rounded-3xl w-full max-w-sm p-6 shadow-2xl text-center relative overflow-hidden">

                  {/* Visuals */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse"></div>
                  <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
                      {(player.flags.weeksInDebt || 0) >= 8 ? <Skull size={40} className="text-red-500" /> : <AlertTriangle size={40} className="text-red-500" />}
                  </div>

                  {/* Status Check */}
                  {(player.flags.weeksInDebt || 0) >= 8 ? (
                      // GAME OVER STATE
                      <>
	                          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">{tr('app.debt.ruinTitle')}</h2>
	                          <p className="text-red-400 text-sm mb-6 leading-relaxed font-bold">
	                              {tr('app.debt.ruinSubtext')}
	                          </p>
	                          <div className="bg-black/60 rounded-xl p-4 mb-6 border border-red-900">
	                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">{tr('app.debt.finalDebt')}</div>
	                              <div className="text-2xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</div>
	                          </div>
                          <button
                              onClick={handleRestartCareer}
                              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg"
                          >
	                              {tr('app.debt.restartCareer')}
                          </button>
                      </>
                  ) : (
                      // WARNING STATE
                      <>
	                          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">{tr('app.debt.warningTitle')}</h2>
	                          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
	                              {tr('app.debt.warningPrefix')} <span className="text-white font-bold">{tr('app.debt.weeksToRecover', { weeks: 8 - (player.flags.weeksInDebt || 0) })}</span> {tr('app.debt.warningSuffix')}
	                          </p>

                          <div className="bg-black/40 rounded-xl p-4 mb-6 border border-zinc-800">
                              <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-bold mb-2">
	                                  <span>{tr('app.debt.currentDebt')}</span>
	                                  <span>{tr('app.debt.runway')}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</span>
	                                  <span className="text-white font-bold">{tr('app.debt.weeks', { weeks: 8 - (player.flags.weeksInDebt || 0) })}</span>
                              </div>
                          </div>

                          <div className="space-y-3">
                              {/* Bailout Option - Calculates ~20% of current debt + 5k */}
                              <button
                                  onClick={() => handleTriggerRewardAd('REWARDED_BAILOUT')}
                                  disabled={(player.flags.bailoutAdsUsedThisWeek || 0) >= 2}
                                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                              >
	                                  <PlayCircle size={18}/> {tr('app.debt.getBailout', { amount: (((player.flags.bailoutAdsUsedThisWeek || 0) === 0 ? Math.floor(Math.abs(player.money) * 0.20) + 5000 : Math.floor(Math.abs(player.money) * 0.10) + 2500)).toLocaleString() })}
	                              </button>
	                              <div className="text-[11px] text-zinc-500">
	                                  {tr('app.debt.bailoutAdsUsed', { count: player.flags.bailoutAdsUsedThisWeek || 0 })}
	                              </div>

                              {/* Continue Option */}
                              <button
                                  onClick={() => setShowDebtModal(false)}
                                  className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                              >
	                                  <Briefcase size={16}/> {tr('app.debt.manageFinances')}
                              </button>
                          </div>
                      </>
                  )}
              </div>
          </div>
      )}

	      {/* Streaming+ Pack: the one sheet every chip opens, and the moment after buying */}
	      <StreamingPlusHost
	          owned={hasStreamingPlus(player)}
	          onBuy={() => handlePremiumPurchase('streaming_plus')}
	          onRestore={handleRestorePurchases}
	      />
	      {exitPromptOpen && (
	          /* B5: leaving sends the game to the background like the Home button (its usual save runs then); nothing is saved on the tap */
	          <div role="dialog" aria-modal="true" aria-label="Exit the game" data-exit-prompt
	              className="fixed inset-0 z-[300] flex items-end justify-center bg-black/60 px-4 pb-[max(24px,calc(env(safe-area-inset-bottom)+16px))]"
	              onClick={() => setExitPromptOpen(false)}>
	              <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-zinc-900 p-5 text-white shadow-2xl" onClick={event => event.stopPropagation()}>
	                  <h2 className="text-lg font-black">Exit the game?</h2>
	                  <p className="mt-1 text-sm text-zinc-400">Your career is saved as you leave.</p>
	                  <div className="mt-4 grid grid-cols-2 gap-3">
	                      <button type="button" className="min-h-12 rounded-2xl bg-zinc-800 font-bold" onClick={() => setExitPromptOpen(false)}>Stay</button>
	                      <button type="button" data-exit-confirm className="min-h-12 rounded-2xl bg-amber-400 font-black text-black"
	                          onClick={() => { setExitPromptOpen(false); void CapacitorApp.minimizeApp().catch(() => CapacitorApp.exitApp()).catch(() => undefined); }}>Exit</button>
	                  </div>
	              </div>
	          </div>
	      )}
	      {toastMessage && (
	          <div className="fixed top-[max(1.5rem,calc(env(safe-area-inset-top)+8px))] left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top fade-in duration-300 min-w-[300px]">
	              {toastMessage.tone === 'warning'
	                  ? <div className="bg-amber-400 rounded-full p-1"><AlertTriangle size={20} className="text-black" strokeWidth={3}/></div>
	                  : <div className="bg-emerald-500 rounded-full p-1"><CheckCircle size={20} className="text-black" strokeWidth={3}/></div>}
	              <div><div className="font-bold text-sm">{toastMessage.title}</div><div className="text-xs text-zinc-400">{toastMessage.subtext}</div></div>
	          </div>
	      )}

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

	      {player.pendingEvent && (player.pendingEvent.type === 'AWARD_CEREMONY' || player.pendingEvent.type === 'PREMIERE') && (<RedCarpetEvent player={player} event={player.pendingEvent} onComplete={handleEventComplete} />)}
      {player.pendingEvents && player.pendingEvents.length > 0 && (player.pendingEvents[0].type === 'PRODUCTION_CRISIS' || player.pendingEvents[0].type === 'DIRECTOR_DECISION') && (
          <ProductionCrisisModal
              key={player.pendingEvents[0].id}
              saveSlot={currentSlot}
              player={player}
              event={player.pendingEvents[0]}
              onChoice={(idx) => {
                  const currentEvent = player.pendingEvents![0];
                  const { updatedPlayer, log } = applyCrisisImpact(player, currentEvent, idx);
                  resolveQueuedEventSafely(player, updatedPlayer, currentEvent.id, log);
              }}
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 && player.pendingEvents[0].type === 'STREAMING_INCIDENT' && (
          <StreamingIncidentEventModal
              key={player.pendingEvents[0].id}
              saveSlot={currentSlot}
              player={player}
              event={player.pendingEvents[0]}
              onResolve={(updatedPlayer, log) => resolveQueuedEventSafely(player, updatedPlayer, player.pendingEvents?.[0]?.id, log)}
              onOpenStatus={() => {
                  /* #75: the popup leads to STATUS; the incident stays open there */
                  resolveQueuedEventSafely(player, player, player.pendingEvents?.[0]?.id, `${player.pendingEvents?.[0]?.title || 'An incident'}: opened STATUS.`);
                  setLifestyleInitialView('STREAMING_STATUS');
                  setActivePage(Page.LIFESTYLE);
              }}
          />
      )}

      {/* #289: a studio making an Original comes back for money */}
      {player.pendingEvents && player.pendingEvents.length > 0 && player.pendingEvents[0].type === 'ORIGINAL_ISSUE' && (
          <OriginalIssueModal
              key={player.pendingEvents[0].id}
              saveSlot={currentSlot}
              player={player}
              event={player.pendingEvents[0]}
              onResolve={(updatedPlayer, log) => resolveQueuedEventSafely(player, updatedPlayer, player.pendingEvents?.[0]?.id, log)}
          />
      )}

      {/* #210: a decision that needs you: answered here, or on its page */}
      {player.pendingEvents && player.pendingEvents.length > 0 && player.pendingEvents[0].type === 'STREAMING_DECISION' && (
          <StreamingDecisionEventModal
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              onResolve={(updatedPlayer, log) => resolveQueuedEventSafely(player, updatedPlayer, player.pendingEvents?.[0]?.id, log)}
              onOpenRoom={room => {
                  /* the decision stays open on its page */
                  resolveQueuedEventSafely(player, player, player.pendingEvents?.[0]?.id, `${player.pendingEvents?.[0]?.title || 'A decision'}: opened ${room}.`);
                  setLifestyleInitialView(room === 'TEAM' ? 'STREAMING_TEAM' : room === 'SLATE' ? 'STREAMING_SLATE' : 'STREAMING_OWNERSHIP');
                  setActivePage(Page.LIFESTYLE);
              }}
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 && player.pendingEvents[0].type === 'STOCK_CONTROL' && (
          <StockControlEventModal
              key={player.pendingEvents[0].id}
              player={player}
              event={player.pendingEvents[0]}
              onOpenAcquisitionDesk={() => openStockControlAcquisitionDesk(player.pendingEvents![0])}
              onReviewStock={() => openStockControlReview(player.pendingEvents![0])}
              onDefer={() => handleUpdatePlayer(acknowledgeStockControlNotice(player, player.pendingEvents![0].data?.stockId || '', 'DEFER'))}
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 &&
        (player.pendingEvents[0].type === 'LIFE_EVENT' ||
         player.pendingEvents[0].type === 'LEGAL_HEARING' ||
         player.pendingEvents[0].type === 'SCANDAL' ||
         player.pendingEvents[0].type === 'UNDERWORLD_OFFER') && (
          <LifeEventModal
              key={player.pendingEvents[0].id}
              saveSlot={currentSlot}
              player={player}
              event={player.pendingEvents[0]}
              onChoice={(updatedPlayer, log) => {
                  const resolvedEventId = player.pendingEvents?.[0]?.id;
                  resolveQueuedEventSafely(player, updatedPlayer, resolvedEventId, log);
              }}
          />
      )}
      {activePressEvent && (<PressConferenceEvent player={player} projectName={activePressEvent.project.name} questions={activePressEvent.questions} onComplete={handlePressConferenceComplete} onClose={() => setActivePressEvent(null)} />)}

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
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm max-h-full overflow-y-auto p-6 shadow-2xl">
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
                          <label htmlFor="baby-last-name" className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-2 block">{tr('app.babyNaming.lastName')}</label>
                          <input
                              id="baby-last-name"
                              value={babySurnameChoice}
                              onChange={(e) => setBabySurnameChoice(e.target.value)}
                              placeholder={tr('app.babyNaming.lastNamePlaceholder')}
                              maxLength={40}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-3 text-white outline-none focus:border-amber-500/60"
                          />
                          <p className="text-xs text-zinc-500 mt-2 mb-3">
                              {getBabySurnameOptions(pendingBabyNaming.partnerName).length
                                  ? tr('app.babyNaming.surnameHint')
                                  : tr('app.babyNaming.noSurnameHint')}
                          </p>
                          <div className="flex flex-wrap gap-2">
                              {getBabySurnameOptions(pendingBabyNaming.partnerName).map(option => (
                                  <button
                                      type="button"
                                      key={option.id}
                                      onClick={() => setBabySurnameChoice(option.value)}
                                      className={`px-3 py-2 rounded-xl border text-left transition-colors ${
                                          babySurnameChoice === option.value
                                              ? 'bg-amber-500/10 border-amber-500/50 text-white'
                                              : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:bg-zinc-900'
                                      }`}
                                  >
                                      <span className="font-bold text-xs">{option.label}</span>
                                      <span className="text-xs text-zinc-500 ml-1">· {option.value}</span>
                                  </button>
                              ))}
                          </div>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">{tr('app.babyNaming.fullNamePreview')}</div>
                          <div className="text-lg font-bold text-white">
                              {`${babyFirstNameInput.trim() || pendingBabyNaming.suggestedFirstName} ${babySurnameChoice.trim()}`.trim()}
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
                              disabled={!babyFirstNameInput.trim() || !babySurnameChoice.trim()}
                              className={`w-full py-4 rounded-2xl font-black uppercase tracking-wider transition-all ${
                                  !babyFirstNameInput.trim() || !babySurnameChoice.trim()
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
          <WhatsNewModal
              entry={latestChangelogEntry}
              previous={previousChangelogEntries}
              version={APP_DISPLAY_VERSION}
              eyebrow={tr('app.whatsNew.eyebrow')}
              continueLabel={tr('common.continue')}
              onDismiss={handleDismissWhatsNew}
          />
      )}

      {/* Persistent Debt Warning Banner (When modal is closed but still in debt) */}
      {showDebtBanner && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1 pt-[max(0.25rem,env(safe-area-inset-top))] text-xs font-bold z-[60] flex justify-between px-4 items-center shadow-lg cursor-pointer" onClick={() => setShowDebtModal(true)}>
              <span>⚠️ DEBT: ${Math.abs(player.money).toLocaleString()}</span>
              <span>{8 - (player.flags.weeksInDebt || 0)} Weeks Left</span>
          </div>
      )}

      <div className={`${isFullBleedMobileSurface ? 'w-screen max-w-none' : isUiOverhaulSurface ? 'w-full max-w-md mx-auto' : 'max-w-md mx-auto border-x border-white/5 pt-safe-top shadow-2xl'} h-full min-h-0 relative z-10 ${isUiOverhaulSurface ? 'bg-[#070605]' : 'bg-zinc-950/80'} flex flex-col ${player?.settings?.smoothMode ? 'smooth-mode' : ''}`}>
        {gameStatus === 'START_MENU' && (
            <StartMenu
                saveSlots={saveSlotSummaries}
                onSelectSlot={handleSelectSlot}
                onDeleteSlot={handleDeleteSlot}
                onSendToDeveloper={handleSendSlotToDeveloper}
                onImportData={handleImportGameData}
                onCreateCareerFromIntro={handleStartGameFromIntro}
                skipIntro={skipStartMenuIntro}
            />
        )}
        {gameStatus === 'CREATION' && <CreationMenu onStartGame={handleStartGame} />}
        {gameStatus === 'PLAYING' && (
            <>
                <div className={`ae-game-content ${isFullBleedMobileSurface ? 'ae-game-content--immersive flex-1 overflow-hidden p-0' : isUiOverhaulSurface ? `min-h-0 flex-1 overflow-hidden${activePage === Page.HOME ? ' ae-game-content--dock-gap' : ''}` : `flex-1 px-5 pt-5 overflow-y-auto custom-scrollbar ${player.money < 0 ? 'pt-8' : ''}`}`}>
                    {/* Crash fix (19 Nov 2026), FIX-PLAN item 1.11: one page's drawing error closes that page (back to Home with
                        a note) instead of the whole game's Recovery Mode; components/ScreenErrorBoundary.tsx. */}
                    <ScreenErrorBoundary key={activePage} screen={Page[activePage] || String(activePage)} isHome={activePage === Page.HOME} onClosed={handleScreenClosed}>
                    {activePage === Page.HOME && (<HomePage player={player} onNextWeek={handleNextWeek} isProcessing={isProcessing} onUpdatePlayer={handleUpdatePlayer} setPage={setActivePage} onOpenProductionHouseCheat={import.meta.env.DEV ? () => { setLifestyleInitialView('PRODUCTION_GAME'); setActivePage(Page.LIFESTYLE); } : undefined} onOpenPlatformCommissionCheat={import.meta.env.DEV ? () => { setInitialMobileAppMode('MESSAGES'); setActivePage(Page.MOBILE); } : undefined} onOpenStudioAcquisitionCheat={import.meta.env.DEV ? (studioId) => { setInitialForbesStudioId(studioId); setActivePage(Page.MOBILE); } : undefined} onOpenBoxOfficeCheat={import.meta.env.DEV ? () => { setInitialMobileAppMode('BOXOFFICE'); setActivePage(Page.MOBILE); } : undefined} onQueueBabyNamingCheat={handleQueueBabyNamingCheat} onOpenDeathSummaryPreview={handleOpenDeathSummaryPreview} onShowWhatsNewCheat={handleShowWhatsNewCheat} onStreamingLaunchQa={handleStreamingLaunchQa} />)}
                    {activePage === Page.CAREER && (<CareerPage player={player} onQuitJob={handleQuitJob} onRehearse={handleRehearse} onOwnedProductionFocus={handleOwnedProductionFocus} />)}
                    {activePage === Page.IMPROVE && (<ImprovePage player={player} onTrain={()=>{}} onEnroll={(c)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, money: p.money- (c.upfrontCost||0), commitments: [...p.commitments, {...c, careerBalanceVersion: 1, id: `c_${Date.now()}`, weeksCompleted:0}] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onCancel={(id)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, energy: { ...p.energy }, flags: { ...p.flags }, commitments: p.commitments.filter(c=>c.id!==id)}; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onPerformAction={handleImproveAction} />)}
                    {activePage === Page.SOCIAL && (<SocialPage player={player} onInteract={handleSocialInteract} onContinueAsChild={handleContinueAsChild} />)}
                    {activePage === Page.LIFESTYLE && (<LifestylePage player={player} onBuyItem={handleBuyLifestyleItem} onSellItem={handleSellLifestyleItem} onSetResidence={(id)=>handleGenericUpdate(p=>({ ...p, residenceId: id }))} onStartBusiness={()=>{}} onShutdownBusiness={()=>{}} onUpdatePlayer={handleUpdatePlayer} onTrustedMarketUpdate={handleTrustedMarketUpdate} onPremiumPurchase={handlePremiumPurchase} onReturnHome={() => setActivePage(Page.HOME)} onNavVisibilityChange={setIsBottomNavVisible} initialView={lifestyleInitialView ?? undefined} onInitialViewConsumed={() => setLifestyleInitialView(null)} onOpenBank={() => { setInitialMobileAppMode('BANK'); setActivePage(Page.MOBILE); }} initialRightsMarketOpportunityId={rightsMarketOpportunityId ?? undefined} onRightsMarketTargetConsumed={() => setRightsMarketOpportunityId(null)} initialStreamingContentOfferId={streamingContentOfferId ?? undefined} onStreamingContentOfferConsumed={() => setStreamingContentOfferId(null)} initialStudioContinuation={studioContinuationTarget ?? undefined} onStudioContinuationConsumed={() => setStudioContinuationTarget(null)} initialPlatformCommission={platformCommissionTarget ?? undefined} onPlatformCommissionConsumed={() => setPlatformCommissionTarget(null)} />)}
                    {activePage === Page.MOBILE && (
                        <MobilePage
                            player={player}
                            onUpdatePlayer={handleUpdatePlayer}
                            onQuietUpdatePlayer={handleQuietUiUpdate}
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
                            onOpenStreamingRights={() => {
                                setLifestyleInitialView('STREAMING_RIGHTS');
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
                            onAudition={(opp)=>{ const applicationId=`app_${Date.now()}`; handleGenericUpdate(p=>applyCareerAuditionApplication(p,opp,applicationId)); }}
                            onTakeJob={(job)=>handleGenericUpdate(p=>acceptCareerPartTimeJob(p,job))}
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

                                const creatorAction = claimCreatorAction(p,'INSTAGRAM',`instagram:${newPost.id}`);
                                if (creatorAction.duplicate) return p;
                                const nextState: Player = {
                                    ...creatorAction.player,
                                    stats: { ...p.stats, followers: Math.max(p.stats.followers,p.instagram.followers || 0) + actualGain },
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
                                            lastAgentFeePaidWeek: getAbsoluteWeek(p.age, p.currentWeek),
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
                                            lastManagerFeePaidWeek: getAbsoluteWeek(p.age, p.currentWeek),
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
                            onPremiumPurchase={handlePremiumPurchase}
                            onRestorePurchases={handleRestorePurchases}
                        />
                    )}
                    </ScreenErrorBoundary>
                </div>
                {isBottomNavVisible && (
                    <BottomNav
                        player={player}
                        activePage={activePage}
                        setPage={setActivePage}
                        unreadMessages={player.inbox?.filter(message => !message.isRead).length || 0}
                    />
                )}
                <NewPlayerTutorialOverlay
                    player={player}
                    activePage={activePage}
                    setPage={setActivePage}
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
      </div>
    </div>
    </GameErrorBoundary>
  );
};

export default App;
