
import React, { useState, useEffect, useRef } from 'react';
import { INITIAL_PLAYER, Player, Page, Commitment, PressInteraction, SocialEvent, ActorSkills, AdType, Relationship, ProjectDetails, ActiveRelease, PastProject, StreamingState, PregnancyCarrier, ScheduledEvent } from './types';
import { BottomNav } from './components/BottomNav';
import { NewPlayerTutorialOverlay } from './components/NewPlayerTutorialOverlay';
import { ProductionCrisisModal } from './components/ProductionCrisisModal';
import { LifeEventModal } from './components/LifeEventModal';
import { StockControlEventModal } from './components/StockControlEventModal';
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
import { ActorEmpireIntroStyle, ActorEmpireLoadingScreen, EmpireStudioBumper } from './components/ActorEmpireIntro';
import type { NewCareerData } from './components/types';
import { processGameWeek } from './services/gameLoop';
import { generateAuditions, generatePartTimeJobs, rewardGenreExperience } from './services/roleLogic';
import { generateWeeklyFeed, calculateInteraction, getGenderedAvatar } from './services/npcLogic';
import { getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists, getRandomWellness, sanitizeTeamPools } from './services/teamLogic';
import { createBusiness, normalizeStudioState } from './services/businessLogic';
import { CheckCircle, Heart, ShieldAlert, AlertTriangle, PlayCircle, Skull, Briefcase, Baby } from 'lucide-react'; 
import { useGameActions } from './hooks/useGameActions';
import { PROPERTY_CATALOG, CAR_CATALOG, MOTORCYCLE_CATALOG, BOAT_CATALOG, AIRCRAFT_CATALOG, CLOTHING_CATALOG } from './services/lifestyleLogic';
import { showAd, initAds } from './services/adLogic';
import { ensureTrackingPermission } from './services/trackingService';
import { saveGameData, loadGameData, deleteGameData } from './services/storage';
import { createBloodlineSnapshot, getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge, inferStreamingStartWeekAbsolute, inheritActorSkills, LEGACY_MIN_PLAYABLE_AGE } from './services/legacyLogic';
import { applyPremiumPurchase, getRequiredPremiumProductForAsset, hasNoAds, PremiumProductId, restoreWeeklyEnergy, spendPlayerEnergy, syncEnergyDisplay, syncWeeklyEnergyForCommitments } from './services/premiumLogic';
import { purchasePremiumProduct, restorePremiumPurchases } from './services/iapService';
import { sanitizeAwardRecords } from './services/awardLogic';
import { RoleType } from './types';
import { applyParenthoodAbandonment, getPregnancyFeedbackCopy } from './services/familyLogic';
import { APP_DISPLAY_VERSION } from './services/appVersion';
import { calculateInstagramPostOutcome, clampInstagramStat, INSTAGRAM_POST_CONFIGS } from './services/instagramLogic';
import { normalizeUniverseMap } from './services/universeLogic';
import { hydrateGenreXP } from './services/genreCatalog';
import { createInstagramReferralOutcome } from './services/instagramOfferLogic';
import { executeStockTrade } from './services/stockLogic';
import { migratePlayerSave } from './services/saveMigration';
import { externalizeCustomPostersInPlayer, stripEmbeddedPosterImageDataForPersistence } from './services/customPosterMedia';
import { buildAvailableNewPlayerTutorialState, writeNewPlayerTutorialState, type NewPlayerTutorialState } from './services/newPlayerTutorial';
import { acceptOutsideProducerInvestmentOffer, counterOutsideProducerInvestmentOffer } from './services/outsideProductions';
import { PHASE_ONE_ENERGY_COSTS } from './services/energyCosts';
import { getPlayerLanguage, isSupportedGameLanguage, t } from './services/i18n';
import {
  addBreadcrumb,
  markGameCheckpoint,
  markTraceAction,
  recordFlowFailure,
  recordNonFatal,
  setCrashContext,
  setCurrentGameScreen,
  startPerformanceTrace,
  stopPerformanceTrace,
  trackGameEvent,
} from './services/firebaseService';

type GameStatus = 'START_MENU' | 'CREATION' | 'PLAYING' | 'DEATH_SCREEN';
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

const PREGNANCY_TERM_WEEKS = 39;
const WHATS_NEW_STORAGE_KEY = 'actorEmpireSeenWhatsNewVersion';
const AUTOSAVE_DEBOUNCE_MS = 750;
const RECENT_TIMELINE_WEEKS = 104;
const RECENT_TIMELINE_MAX_ITEMS = 180;
const LEGACY_HIGHLIGHT_MAX_ITEMS = 80;
const FULL_LOCAL_MIRROR_BUDGET_BYTES = 3_500_000;
const STARTUP_STUDIO_BUMPER_MS = 2400;
const STARTUP_LOADING_MIN_MS = 8600;
const STARTUP_LOADING_LINE_KEYS = [
  'startup.loadingLine.actors',
  'startup.loadingLine.cinema',
  'startup.loadingLine.casting',
  'startup.loadingLine.lights',
  'startup.loadingLine.redCarpet',
  'startup.loadingLine.saves',
];

type CompactTimelineEntry = {
  id: string;
  week: number;
  year: number;
  absoluteWeek: number;
  title: string;
  kind: 'LOG' | 'NEWS' | 'MESSAGE';
  tone: 'positive' | 'negative' | 'neutral';
  impact?: 'HIGH' | 'MEDIUM' | 'LOW';
};

const getApproxAbsoluteWeek = (year: number, week: number) => {
  const safeYear = Number.isFinite(year) ? year : 18;
  const safeWeek = Math.min(52, Math.max(1, Number.isFinite(week) ? week : 1));
  return getAbsoluteWeek(safeYear, safeWeek);
};

const makeTimelineEntry = (
  sourceId: string,
  year: number,
  week: number,
  title: string,
  kind: CompactTimelineEntry['kind'],
  tone: CompactTimelineEntry['tone'],
  impact?: CompactTimelineEntry['impact']
): CompactTimelineEntry => ({
  id: `${kind}_${sourceId}_${year}_${week}`,
  year,
  week,
  absoluteWeek: getApproxAbsoluteWeek(year, week),
  title: title.replace(/\s+/g, ' ').trim().slice(0, 180),
  kind,
  tone,
  impact,
});

const isLegacyWorthyText = (text: string) => {
  const normalized = text.toLowerCase();
  return [
    'award', 'won', 'nominated', 'billion', 'festival', 'married', 'divorce',
    'child', 'baby', 'scandal', 'lawsuit', 'death', 'passed away', 'founded',
    'studio', 'franchise', 'universe', 'forbes', 'record', 'hit', 'flop'
  ].some(keyword => normalized.includes(keyword));
};

const dedupeAwards = <T extends { type: string; year: number; category: string; projectId: string; outcome: 'WON' | 'NOMINATED' }>(awards: T[] = []): T[] => {
  return sanitizeAwardRecords(awards);
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

export const App: React.FC = () => {
  const [player, setPlayer] = useState<Player>(() => migratePlayerSave(INITIAL_PLAYER));
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [lifestyleInitialView, setLifestyleInitialView] = useState<'MAIN' | 'ASSETS' | 'ACTIVITIES' | 'BUSINESS' | 'PRODUCTION_WIZARD' | 'PRODUCTION_GAME' | 'STREAMING_PLATFORM' | null>(null);
  const [rightsMarketOpportunityId, setRightsMarketOpportunityId] = useState<string | null>(null);
  const [initialForbesStudioId, setInitialForbesStudioId] = useState<string | null>(null);
  const [initialMobileStockId, setInitialMobileStockId] = useState<string | null>(null);
  const [initialMobileAppMode, setInitialMobileAppMode] = useState<'BOXOFFICE' | 'MESSAGES' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('START_MENU');
  const [skipStartMenuIntro, setSkipStartMenuIntro] = useState(true);
  const [saveSlots, setSaveSlots] = useState<Record<number, Player | null>>({ 1: null, 2: null, 3: null });
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Loading state for async storage
  const [startupStudioBumperElapsed, setStartupStudioBumperElapsed] = useState(false);
  const [startupMinimumElapsed, setStartupMinimumElapsed] = useState(false);
  const [startupLoadingLineIndex, setStartupLoadingLineIndex] = useState(0);
  const [startupLoadingProgress, setStartupLoadingProgress] = useState(0);
  
  // UI States
  const [toastMessage, setToastMessage] = useState<{title: string, subtext: string} | null>(null);
  const [activePressEvent, setActivePressEvent] = useState<{ project: Commitment, questions: PressInteraction[] } | null>(null);
  const [showProtectionPrompt, setShowProtectionPrompt] = useState<{ partnerId: string, partnerName: string } | null>(null);
  const [isBottomNavVisible, setIsBottomNavVisible] = useState(true);
  const [isFullBleedMobileSurface, setIsFullBleedMobileSurface] = useState(false);
  const [activeSocialEvent, setActiveSocialEvent] = useState<{ event: SocialEvent, partnerId: string } | null>(null);
  const [pendingBabyNaming, setPendingBabyNaming] = useState<PendingBabyNaming | null>(null);
  const [babyFirstNameInput, setBabyFirstNameInput] = useState('');
  const [babySurnameChoice, setBabySurnameChoice] = useState('');
  const [deathScreenPreviewPlayer, setDeathScreenPreviewPlayer] = useState<Player | null>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  const isStartupLoadingVisible = isInitializing || !startupMinimumElapsed;
  const [showWhatsNewModal, setShowWhatsNewModal] = useState(false);
  const [showPreviousWhatsNewNotes, setShowPreviousWhatsNewNotes] = useState(false);
  
  // DEBT / AD STATES
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adStep, setAdStep] = useState(0); 
  const [adTotalSteps, setAdTotalSteps] = useState(1);
  const autosaveTimerRef = useRef<number | null>(null);

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

  useEffect(() => {
    const timer = window.setTimeout(() => setStartupMinimumElapsed(true), STARTUP_LOADING_MIN_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setStartupStudioBumperElapsed(true), STARTUP_STUDIO_BUMPER_MS);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isStartupLoadingVisible) return;
    const interval = window.setInterval(() => {
      setStartupLoadingLineIndex(prev => (prev + 1) % STARTUP_LOADING_LINE_KEYS.length);
    }, 420);
    return () => window.clearInterval(interval);
  }, [isStartupLoadingVisible]);

  useEffect(() => {
    if (!isStartupLoadingVisible) {
      setStartupLoadingProgress(100);
      return;
    }

    if (!startupStudioBumperElapsed) {
      setStartupLoadingProgress(0);
      return;
    }

    const startedAt = performance.now();
    const duration = Math.max(1400, STARTUP_LOADING_MIN_MS - STARTUP_STUDIO_BUMPER_MS - 260);
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const ratio = Math.min(0.985, elapsed / duration);
      const eased = 1 - Math.pow(1 - ratio, 1.45);
      setStartupLoadingProgress(Math.min(99, Math.round(eased * 100)));
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isStartupLoadingVisible, startupStudioBumperElapsed]);

  const preparePlayerForPersistence = (nextPlayer: Player): Player => {
      const currentAbsoluteWeek = getApproxAbsoluteWeek(nextPlayer.age, nextPlayer.currentWeek);
      const recentCutoff = currentAbsoluteWeek - RECENT_TIMELINE_WEEKS;
      const existingTimeline = Array.isArray(nextPlayer.flags?.recentTimeline)
          ? nextPlayer.flags.recentTimeline
          : [];
      const existingHighlights = Array.isArray(nextPlayer.flags?.legacyHighlights)
          ? nextPlayer.flags.legacyHighlights
          : [];
      const logTimeline = Array.isArray(nextPlayer.logs)
          ? nextPlayer.logs.map((log, index) => makeTimelineEntry(
              `log_${index}_${log.message}`,
              log.year,
              log.week,
              log.message,
              'LOG',
              log.type
          ))
          : [];
      const newsTimeline = Array.isArray(nextPlayer.news)
          ? nextPlayer.news.map((item: any, index: number) => makeTimelineEntry(
              item.id || `news_${index}`,
              item.year || nextPlayer.age,
              item.week || nextPlayer.currentWeek,
              item.headline || item.subtext || 'Industry news',
              'NEWS',
              item.impactLevel === 'HIGH' ? 'positive' : 'neutral',
              item.impactLevel
          ))
          : [];
      const timelineById = new Map<string, CompactTimelineEntry>();
      [...existingTimeline, ...logTimeline, ...newsTimeline]
          .filter((entry: CompactTimelineEntry) => entry?.title && entry.absoluteWeek >= recentCutoff)
          .forEach((entry: CompactTimelineEntry) => timelineById.set(entry.id, entry));
      const recentTimeline = Array.from(timelineById.values())
          .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
          .slice(0, RECENT_TIMELINE_MAX_ITEMS);
      const highlightById = new Map<string, CompactTimelineEntry>();
      [...existingHighlights, ...recentTimeline.filter(entry => entry.impact === 'HIGH' || isLegacyWorthyText(entry.title))]
          .filter((entry: CompactTimelineEntry) => entry?.title)
          .forEach((entry: CompactTimelineEntry) => highlightById.set(entry.id, entry));
      const legacyHighlights = Array.from(highlightById.values())
          .sort((a, b) => b.absoluteWeek - a.absoluteWeek)
          .slice(0, LEGACY_HIGHLIGHT_MAX_ITEMS);
      const safePlayer: any = stripEmbeddedPosterImageDataForPersistence({
          ...nextPlayer,
          logs: Array.isArray(nextPlayer.logs) ? nextPlayer.logs.slice(-50) : [],
          news: Array.isArray(nextPlayer.news) ? nextPlayer.news.slice(0, 80) : [],
          inbox: Array.isArray(nextPlayer.inbox) ? nextPlayer.inbox.slice(0, 120) : [],
          shareholderVotes: Array.isArray(nextPlayer.shareholderVotes) ? nextPlayer.shareholderVotes.slice(0, 24) : [],
          stockTakeovers: Array.isArray(nextPlayer.stockTakeovers) ? nextPlayer.stockTakeovers.slice(0, 20) : [],
          flags: {
              ...(nextPlayer.flags || {}),
              recentTimeline,
              legacyHighlights,
              persistenceOptimizedAtWeek: currentAbsoluteWeek,
          },
      } as Player);

      if (safePlayer.instagram) {
          safePlayer.instagram = {
              ...safePlayer.instagram,
              posts: Array.isArray(safePlayer.instagram.posts) ? safePlayer.instagram.posts.slice(0, 200) : [],
              feed: Array.isArray(safePlayer.instagram.feed) ? safePlayer.instagram.feed.slice(0, 80) : [],
          };
      }

      if (safePlayer.x) {
          safePlayer.x = {
              ...safePlayer.x,
              posts: Array.isArray(safePlayer.x.posts) ? safePlayer.x.posts.slice(0, 200) : [],
              feed: Array.isArray(safePlayer.x.feed) ? safePlayer.x.feed.slice(0, 80) : [],
          };
      }

      if (safePlayer.youtube) {
          safePlayer.youtube = {
              ...safePlayer.youtube,
              videos: Array.isArray(safePlayer.youtube.videos)
                  ? safePlayer.youtube.videos.slice(0, 120).map((video: any) => ({
                      ...video,
                      comments: Array.isArray(video.comments) ? video.comments.slice(0, 12) : [],
                      weeklyHistory: Array.isArray(video.weeklyHistory) ? video.weeklyHistory.slice(-24) : [],
                  }))
                  : [],
          };
      }

      return safePlayer as Player;
  };
  const writeLocalStorageMirror = (slot: number, playerToSave: Player) => {
      try {
          const serialized = JSON.stringify(playerToSave);
          if (serialized.length <= FULL_LOCAL_MIRROR_BUDGET_BYTES) {
              localStorage.setItem(`actorEmpireSave_${slot}`, serialized);
              if (slot === 1) {
                  // Keep a shadow copy for migration compatibility with older builds.
                  localStorage.setItem('actorEmpireSave', serialized);
              }
          } else {
              localStorage.setItem(`actorEmpireSave_${slot}_meta`, JSON.stringify({
                  version: APP_DISPLAY_VERSION,
                  slot,
                  playerName: playerToSave.name,
                  age: playerToSave.age,
                  week: playerToSave.currentWeek,
                  savedAt: Date.now(),
                  storage: 'indexeddb',
                  note: 'Full save stored in IndexedDB. Local mirror skipped to avoid mobile quota pressure.',
              }));
              localStorage.removeItem(`actorEmpireSave_${slot}`);
              if (slot === 1) localStorage.removeItem('actorEmpireSave');
          }
      } catch (error) {
          console.error("Local save mirror failed", error);
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
  const persistSlotSave = (slot: number, nextPlayer: Player) => {
      const playerToSave = preparePlayerForPersistence(nextPlayer);
      saveGameData(`actorEmpireSave_${slot}`, playerToSave);

      const writeLocalMirror = () => {
          writeLocalStorageMirror(slot, playerToSave);
      };

      const requestIdleCallback = (globalThis as any).requestIdleCallback as ((cb: () => void, options?: { timeout?: number }) => void) | undefined;
      if (requestIdleCallback) {
          requestIdleCallback(writeLocalMirror, { timeout: 1800 });
      } else {
          globalThis.setTimeout(writeLocalMirror, 0);
      }
  };
  const syncCurrentSlotSnapshot = (nextPlayer: Player) => {
      if (!currentSlot) return;
      setSaveSlots(prev => ({ ...prev, [currentSlot]: nextPlayer }));
      persistSlotSave(currentSlot, nextPlayer);
  };

  const prepareLoadedPlayerSave = async (slot: number, savedData: Player): Promise<{ player: Player; shouldPersist: boolean }> => {
      const migrated = migratePlayerSave(savedData);
      let optimized = migrated;
      let posterMediaMigrated = false;

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

      return {
          player: optimized,
          shouldPersist: ((savedData as Player)?.flags?.saveMigrationVersion !== optimized.flags?.saveMigrationVersion) || posterMediaMigrated,
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

  // Check for saved game on initial mount & Init Ads
  useEffect(() => {
    const init = async () => {
        try {
            await ensureTrackingPermission();
            await initAds();
            
            const slots: Record<number, Player | null> = { 1: null, 2: null, 3: null };
            
            // 1. Check IndexedDB for all 3 slots
            for (let i = 1; i <= 3; i++) {
                const savedData = await loadGameData(`actorEmpireSave_${i}`);
                if (savedData) {
                    const prepared = await prepareLoadedPlayerSave(i, savedData);
                    slots[i] = prepared.player;
                    if (prepared.shouldPersist) {
                        persistSlotSave(i, prepared.player);
                    }
                }
            }
            
            // 2. Migration fallback matrix for older Android builds:
            // old single-key IndexedDB, old per-slot localStorage, then old single-key localStorage.
            const hasAnySave = Object.values(slots).some(s => s !== null);
            if (!hasAnySave) {
                const legacyIndexedDbSave = await loadGameData('actorEmpireSave');
                if (legacyIndexedDbSave) {
                    console.log("Migrating legacy IndexedDB save to Slot 1...");
                    const prepared = await prepareLoadedPlayerSave(1, legacyIndexedDbSave);
                    persistSlotSave(1, prepared.player);
                    slots[1] = prepared.player;
                } else {
                    for (let i = 1; i <= 3; i++) {
                        const legacySlotSave = localStorage.getItem(`actorEmpireSave_${i}`);
                        if (!legacySlotSave) continue;
                        try {
                            const savedData = JSON.parse(legacySlotSave);
                            const prepared = await prepareLoadedPlayerSave(i, savedData);
                            console.log(`Migrating localStorage slot ${i} to IndexedDB...`);
                            persistSlotSave(i, prepared.player);
                            slots[i] = prepared.player;
                        } catch (e) {
                            console.error(`Legacy slot ${i} corrupt`, e);
                            recordNonFatal(e, 'legacy_slot_migration_failed', { slot: i });
                        }
                    }

                    const hasRecoveredSlot = Object.values(slots).some(s => s !== null);
                    if (!hasRecoveredSlot) {
                        const legacySave = localStorage.getItem('actorEmpireSave');
                        if (legacySave) {
                            try {
                                const savedData = JSON.parse(legacySave);
                                const prepared = await prepareLoadedPlayerSave(1, savedData);
                                console.log("Migrating legacy save to Slot 1...");
                                persistSlotSave(1, prepared.player);
                                slots[1] = prepared.player;
                            } catch (e) {
                                console.error("Legacy save corrupt", e);
                                recordNonFatal(e, 'legacy_save_migration_failed');
                            }
                        }
                    }
                }
            }

            setSaveSlots(slots);
        } catch (e) {
            console.error("Init failed", e);
            recordNonFatal(e, 'app_init_failed');
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (autosaveTimerRef.current) {
        window.clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
    }

    if (gameStatus !== 'PLAYING' || !currentSlot) return;

    autosaveTimerRef.current = window.setTimeout(() => {
        setSaveSlots(prev => ({ ...prev, [currentSlot]: player }));
        persistSlotSave(currentSlot, player);
        autosaveTimerRef.current = null;
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
        if (autosaveTimerRef.current) {
            window.clearTimeout(autosaveTimerRef.current);
            autosaveTimerRef.current = null;
        }
    };
  }, [player, gameStatus, currentSlot]);

  const handleSelectSlot = (slot: number) => {
    setCurrentSlot(slot);
    const existingSave = saveSlots[slot];
    if (existingSave) {
        const migrated = migratePlayerSave(existingSave);
        setSaveSlots(prev => ({ ...prev, [slot]: migrated }));
        setPlayer(migrated);
        setSkipStartMenuIntro(false);
        setGameStatus('PLAYING');
    } else {
        setPlayer(migratePlayerSave(INITIAL_PLAYER));
        setSkipStartMenuIntro(false);
        setGameStatus('CREATION');
    }
  };

  const handleDeleteSlot = async (slot: number) => {
    await deleteGameData(`actorEmpireSave_${slot}`);
    localStorage.removeItem(`actorEmpireSave_${slot}`);
    if (slot === 1) localStorage.removeItem('actorEmpireSave');
    setSaveSlots(prev => ({ ...prev, [slot]: null }));
  };

  const handleRecoverToMenu = () => {
    setShowDebtModal(false);
    setIsShowingAd(false);
    setActivePressEvent(null);
    setShowProtectionPrompt(null);
    setActiveSocialEvent(null);
    setActivePage(Page.HOME);
    setSkipStartMenuIntro(true);
    setGameStatus('START_MENU');
  };

  // Init opportunities and feed on mount (Hydration logic)
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      setPlayer(prev => {
          const safePlayer = migratePlayerSave(prev) as any;
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

                  if (patchedRel.id === 'rel_mom' && (patchedRel.image.includes('seed=Mom') || patchedRel.image === '')) {
                      patchedRel = { ...patchedRel, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Sophie' };
                  }
                  if (patchedRel.id === 'rel_dad' && (patchedRel.image.includes('seed=Dad') || patchedRel.image === '')) {
                      patchedRel = { ...patchedRel, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Arthur' };
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
      const migratedPlayer = migratePlayerSave(updatedPlayer);
      const normalizedWorld = {
          ...clone(INITIAL_PLAYER.world),
          ...(migratedPlayer.world || {}),
          universes: normalizeUniverseMap(migratedPlayer.world?.universes)
      };
      setPlayer({
          ...migratedPlayer,
          world: normalizedWorld,
          awards: dedupeAwards(migratedPlayer.awards || []),
          pastProjects: (migratedPlayer.pastProjects || []).map((project: any) => ({
              ...project,
              awards: dedupeAwards(project.awards || [])
          }))
      }); 
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
    if (isProcessing) return;
    setIsProcessing(true);
    const traceName = 'process_game_week';
    const startedAt = performance.now();
    markTraceAction('process_week_started', {
      last_screen: Page[activePage] || String(activePage),
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
    try {
        const { player: newPlayerState, triggerAd } = await processGameWeek(player);
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
        handleUpdatePlayer(syncedPlayerState);

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
        markTraceAction('process_week_completed', {
            last_screen: Page[activePage] || String(activePage),
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
        markTraceAction('process_week_failed', {
            last_screen: Page[activePage] || String(activePage),
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
        stopPerformanceTrace(traceName, { duration_ms: Math.round(performance.now() - startedAt) });
        setIsProcessing(false);
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
          const newBuzz = Math.max(-50, Math.min(50, (commitment.promotionalBuzz || 0) + buzzDelta));
          const updatedC = { ...commitment, promotionalBuzz: newBuzz, lastPressWeek: prev.currentWeek, lastPressAbsolute: getAbsoluteWeek(prev.age, prev.currentWeek) };
          return { 
              ...prev, 
              stats: newStats, 
              commitments: prev.commitments.map(c => c.id === commitment.id ? updatedC : c),
              logs: [...prev.logs, { week: prev.currentWeek, year: prev.age, message: logMessage, type: 'positive' }]
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
      setAdTotalSteps(steps);
      setAdStep(1);
      setIsShowingAd(true);

      let successCount = 0;
      
      try {
          for (let i = 1; i <= steps; i++) {
              setAdStep(i);
              
              // BUFFER: If this is the 2nd (or later) ad, wait 1.5s to let the ad engine reset
              // This prevents "Ad Not Ready" errors or UI hangs
              if (i > 1) {
                  await new Promise(resolve => setTimeout(resolve, 1500));
              }

              const result = await showAd(type); 
              
              if (result.success) {
                  successCount++;
              } else {
                  // If user cancels or ad fails, break loop
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
      }
      
      if (successCount === steps) {
          handleAdComplete(type, data);
      } else {
          setToastMessage({
              title: tr('app.rewards.cancelledTitle'),
              subtext: tr('app.rewards.cancelledSubtext')
          });
      }
  };

  const handleAdComplete = (type: AdType, data?: any) => {
      let toastTitle = tr('app.rewards.receivedTitle');
      let toastSub = "";

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          
          if (type === 'REWARDED_CASH') {
              p.money += 5000;
              toastSub = tr('app.rewards.cashSubtext');
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
          return p;
      });
  };

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
          const message = applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          setToastMessage({ title: tr('app.purchases.confirmedTitle'), subtext: message });
          return p;
      });
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
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=RealEstateWire',
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
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=GarageWatch',
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
                  authorAvatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=StyleRadar',
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
	          const saleValue = item ? Math.floor(Math.max(item.price, Number(state?.currentValue || 0)) * 0.5) : 0;
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

      if (result.restoredProductIds.length === 0) {
          setToastMessage({ title: tr('app.purchases.nothingToRestoreTitle'), subtext: result.message });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          result.restoredProductIds.forEach(productId => {
              applyPremiumPurchase(p, productId, getPlayerLanguage(p));
          });
          setToastMessage({
              title: tr('app.purchases.restoredTitle'),
              subtext: tr('app.purchases.restoredSubtext', { count: result.restoredProductIds.length.toString() })
          });
          return p;
      });
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
          relationships: parentRelationships,
          // Set specific handle for all platforms
          instagram: { ...INITIAL_PLAYER.instagram, handle: handle },
          x: { ...INITIAL_PLAYER.x, handle: handle, followers: 0 },
          youtube: { ...INITIAL_PLAYER.youtube, handle: handle }
      };
      const migratedNewPlayer = migratePlayerSave(newPlayer);
      const targetSlot = slotOverride ?? currentSlot;
      if (targetSlot) {
          setSaveSlots(prev => ({ ...prev, [targetSlot]: migratedNewPlayer }));
      }
      setPlayer(migratedNewPlayer); 
      setActivePage(Page.HOME);
      setGameStatus('PLAYING'); 
  };

  const handleStartGameFromIntro = (data: NewCareerData, slot: number) => {
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
      
      // Add the current player as a parent
      inheritedRelationships.push({
          id: player.id,
          name: player.name,
          relation: player.flags.isDead ? 'Deceased Parent' as any : 'Parent',
          closeness: 100,
          age: player.age,
          gender: player.gender,
          image: player.avatar,
          lastInteractionWeek: player.currentWeek,
          lastInteractionAbsolute: getAbsoluteWeek(player.age, player.currentWeek)
      });

      const childAge = getRelationshipAge(child, player.age, player.currentWeek);
      const yearsToSkip = Math.max(0, LEGACY_MIN_PLAYABLE_AGE - childAge);
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
          age: Math.max(childAge, LEGACY_MIN_PLAYABLE_AGE),
          currentWeek: player.currentWeek,
          gender: child.gender || player.gender,
          avatar: child.image || INITIAL_PLAYER.avatar,
          money: inheritancePreview.inheritedMoney,
          assets: [...player.assets],
          customItems: clone(player.customItems),
          assetStates: clone(player.assetStates || []),
          residenceId: player.residenceId,
          activeVehicleId: player.activeVehicleId,
          businesses: clone(player.businesses || []),
          studio: player.studio ? clone(player.studio) : undefined,
          stocks: clone(player.stocks),
          portfolio: clone(inheritancePreview.inheritedPortfolio),
          world: player.world ? clone(player.world) : INITIAL_PLAYER.world,
          relationships: advancedRelationships,
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
          x: { ...INITIAL_PLAYER.x, handle: childHandle, followers: Math.floor(player.stats.followers * 0.04) },
          youtube: { ...INITIAL_PLAYER.youtube, handle: childHandle },
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
        await deleteGameData(`actorEmpireSave_${currentSlot}`);
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

  if (isStartupLoadingVisible) {
      const loadingLineKey = STARTUP_LOADING_LINE_KEYS[startupLoadingLineIndex % STARTUP_LOADING_LINE_KEYS.length];
      const showStudioBumper = !startupStudioBumperElapsed;
      return (
          <div className="relative h-screen overflow-hidden bg-[#050505] text-white">
              <ActorEmpireIntroStyle />
              {showStudioBumper ? (
                  <EmpireStudioBumper />
              ) : (
                  <ActorEmpireLoadingScreen
                      progress={startupLoadingProgress}
                      status={tr(loadingLineKey)}
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

  return (
    <GameErrorBoundary onRecover={handleRecoverToMenu}>
    <div className="h-screen bg-black text-white font-sans selection:bg-amber-500 selection:text-black">
      <div className="fixed inset-0 z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/30 via-zinc-950 to-zinc-950 pointer-events-none" />
      
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

      {toastMessage && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[60] bg-zinc-900 border border-zinc-700 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top fade-in duration-300 min-w-[300px]">
              <div className="bg-emerald-500 rounded-full p-1"><CheckCircle size={20} className="text-black" strokeWidth={3}/></div>
              <div><div className="font-bold text-sm">{toastMessage.title}</div><div className="text-xs text-zinc-400">{toastMessage.subtext}</div></div>
          </div>
      )}

      {player.pendingEvent && (player.pendingEvent.type === 'AWARD_CEREMONY' || player.pendingEvent.type === 'PREMIERE') && (<RedCarpetEvent player={player} event={player.pendingEvent} onComplete={handleEventComplete} />)}
      {player.pendingEvents && player.pendingEvents.length > 0 && (player.pendingEvents[0].type === 'PRODUCTION_CRISIS' || player.pendingEvents[0].type === 'DIRECTOR_DECISION') && (
          <ProductionCrisisModal 
              key={player.pendingEvents[0].id}
              player={player} 
              event={player.pendingEvents[0]} 
              onChoice={(idx) => {
                  const currentEvent = player.pendingEvents![0];
                  const { updatedPlayer, log } = applyCrisisImpact(player, currentEvent, idx);
                  resolveQueuedEventSafely(player, updatedPlayer, currentEvent.id, log);
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
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-lg mx-auto max-h-[calc(100dvh-2.5rem)] sm:max-h-[calc(100dvh-3rem)] shadow-2xl flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-pink-500"></div>
                  <div className="min-h-0 flex-1 overflow-y-auto custom-scrollbar p-5 pb-4 sm:p-6">
                      <div className="mb-6">
	                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-400 mb-3">{tr('app.whatsNew.eyebrow')}</div>
	                          <h3 className="text-2xl font-black text-white mb-2">{tr('app.whatsNew.version', { version: APP_DISPLAY_VERSION })}</h3>
	                          <p className="text-sm text-zinc-400 leading-relaxed">
	                              {tr('app.whatsNew.intro')}
	                          </p>
                      </div>

                      <div className="space-y-4 text-sm text-zinc-300">
                          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/10 px-4 py-3">
	                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300 mb-2">{tr('app.whatsNew.studioStreaming')}</div>
	                              <ul className="space-y-2 leading-relaxed">
	                                  <li>{tr('app.whatsNew.studioStreaming.1')}</li>
	                                  <li>{tr('app.whatsNew.studioStreaming.2')}</li>
	                                  <li>{tr('app.whatsNew.studioStreaming.3')}</li>
	                              </ul>
                          </div>

                          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/10 px-4 py-3">
	                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300 mb-2">{tr('app.whatsNew.careerFamily')}</div>
	                              <ul className="space-y-2 leading-relaxed">
	                                  <li>{tr('app.whatsNew.careerFamily.1')}</li>
	                                  <li>{tr('app.whatsNew.careerFamily.2')}</li>
	                                  <li>{tr('app.whatsNew.careerFamily.3')}</li>
	                              </ul>
                          </div>

                          <div className="rounded-2xl border border-sky-500/15 bg-sky-500/10 px-4 py-3">
	                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300 mb-2">{tr('app.whatsNew.mobileStability')}</div>
	                              <ul className="space-y-2 leading-relaxed">
	                                  <li>{tr('app.whatsNew.mobileStability.1')}</li>
	                                  <li>{tr('app.whatsNew.mobileStability.2')}</li>
	                                  <li>{tr('app.whatsNew.mobileStability.3')}</li>
	                              </ul>
                          </div>

                          <div className="rounded-2xl border border-violet-500/15 bg-violet-500/10 px-4 py-3">
	                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-300 mb-2">{tr('app.whatsNew.uiSaveFixes')}</div>
	                              <ul className="space-y-2 leading-relaxed">
	                                  <li>{tr('app.whatsNew.uiSaveFixes.1')}</li>
	                                  <li>{tr('app.whatsNew.uiSaveFixes.2')}</li>
	                                  <li>{tr('app.whatsNew.uiSaveFixes.3')}</li>
	                              </ul>
                          </div>

                          <button
                              type="button"
                              onClick={() => setShowPreviousWhatsNewNotes(prev => !prev)}
                              className="w-full rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-left transition-colors hover:bg-zinc-900"
                          >
                              <div className="flex items-center justify-between gap-3">
                                  <div>
	                                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">{tr('app.whatsNew.previousNotes')}</div>
	                                      <p className="mt-1 text-xs leading-relaxed text-zinc-500">{tr('app.whatsNew.previousNotesSubtext')}</p>
                                  </div>
                                  <span className="text-lg font-black text-zinc-400">{showPreviousWhatsNewNotes ? '-' : '+'}</span>
                              </div>
                          </button>

                          {showPreviousWhatsNewNotes && (
                              <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3">
	                                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300 mb-2">{tr('app.whatsNew.previousHighlights')}</div>
	                                  <ul className="space-y-2 leading-relaxed text-zinc-400">
	                                      <li>{tr('app.whatsNew.previousHighlights.1')}</li>
	                                      <li>{tr('app.whatsNew.previousHighlights.2')}</li>
	                                      <li>{tr('app.whatsNew.previousHighlights.3')}</li>
	                                  </ul>
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

      <div className={`${isFullBleedMobileSurface ? 'w-screen max-w-none' : 'max-w-md mx-auto border-x border-white/5 pt-safe-top shadow-2xl'} h-screen relative z-10 bg-zinc-950/80 flex flex-col ${player?.settings?.smoothMode ? 'smooth-mode' : ''}`}>
        {gameStatus === 'START_MENU' && (
            <StartMenu 
                saveSlots={saveSlots}
                onSelectSlot={handleSelectSlot}
                onDeleteSlot={handleDeleteSlot}
                onCreateCareerFromIntro={handleStartGameFromIntro}
                skipIntro={skipStartMenuIntro}
            />
        )}
        {gameStatus === 'CREATION' && <CreationMenu onStartGame={handleStartGame} />}
        {gameStatus === 'PLAYING' && (
            <>
                <div className={`${isFullBleedMobileSurface ? 'flex-1 overflow-hidden p-0' : `flex-1 px-5 pt-5 pb-nav-safe overflow-y-auto custom-scrollbar ${player.money < 0 ? 'pt-8' : ''}`}`}>
                    {activePage === Page.HOME && (<HomePage player={player} onNextWeek={handleNextWeek} isProcessing={isProcessing} onUpdatePlayer={handleUpdatePlayer} setPage={setActivePage} onOpenProductionHouseCheat={() => { setLifestyleInitialView('PRODUCTION_GAME'); setActivePage(Page.LIFESTYLE); }} onOpenStudioAcquisitionCheat={(studioId) => { setInitialForbesStudioId(studioId); setActivePage(Page.MOBILE); }} onOpenBoxOfficeCheat={() => { setInitialMobileAppMode('BOXOFFICE'); setActivePage(Page.MOBILE); }} onQueueBabyNamingCheat={handleQueueBabyNamingCheat} onOpenDeathSummaryPreview={handleOpenDeathSummaryPreview} onShowWhatsNewCheat={handleShowWhatsNewCheat} />)}
                    {activePage === Page.CAREER && (<CareerPage player={player} onQuitJob={handleQuitJob} onRehearse={handleRehearse} onOwnedProductionFocus={handleOwnedProductionFocus} />)}
                    {activePage === Page.IMPROVE && (<ImprovePage player={player} onTrain={()=>{}} onEnroll={(c)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, money: p.money- (c.upfrontCost||0), commitments: [...p.commitments, {...c, id: `c_${Date.now()}`, weeksCompleted:0}] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onCancel={(id)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, commitments: p.commitments.filter(c=>c.id!==id)}; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })} onPerformAction={handleImproveAction} />)}
                    {activePage === Page.SOCIAL && (<SocialPage player={player} onInteract={handleSocialInteract} onContinueAsChild={handleContinueAsChild} />)}
                    {activePage === Page.LIFESTYLE && (<LifestylePage player={player} onBuyItem={handleBuyLifestyleItem} onSellItem={handleSellLifestyleItem} onSetResidence={(id)=>handleGenericUpdate(p=>({ ...p, residenceId: id }))} onStartBusiness={()=>{}} onShutdownBusiness={()=>{}} onUpdatePlayer={handleUpdatePlayer} onPremiumPurchase={handlePremiumPurchase} onNavVisibilityChange={setIsBottomNavVisible} initialView={lifestyleInitialView ?? undefined} onInitialViewConsumed={() => setLifestyleInitialView(null)} initialRightsMarketOpportunityId={rightsMarketOpportunityId ?? undefined} onRightsMarketTargetConsumed={() => setRightsMarketOpportunityId(null)} />)}
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
                            onAudition={(opp)=>handleGenericUpdate(p=>{ const next: Player = { ...p, applications: [...p.applications, { id: `app_${Date.now()}`, type: 'AUDITION' as const, name: opp.projectName, weeksRemaining: 1, data: opp }] }; spendPlayerEnergy(next, 25, `Audition: ${opp.projectName}`); return next; })}
                            onTakeJob={(job)=>handleGenericUpdate(p=>{ const previousCommitments = p.commitments; const next: Player = { ...p, commitments: [...p.commitments, job] }; syncWeeklyEnergyForCommitments(next, previousCommitments); return next; })}
                            onQuitJob={handleQuitJob} 
                            onPost={(t,c,img)=>handleGenericUpdate(p=>{
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
                                    contentMediaId: img
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
                                return nextState;
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
                                    nextPlayer.activeSponsorships = [...nextPlayer.activeSponsorships, selectedAction.payload.offer];
                                    nextPlayer.logs = [{
                                        week: p.currentWeek,
                                        year: p.age,
                                        message: tr('app.socialFeedback.brandDealAcceptedLog', { brandName: selectedAction.payload.offer.brandName }),
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
                            onPerformSponsorship={(id, type)=>handleGenericUpdate(p=>{ const s = p.activeSponsorships.find(x=>x.id===id); if (!s) return p; const next = { ...p }; spendPlayerEnergy(next, s.requirements.energyCost, `Sponsorship: ${s.brandName || type}`); return next; })}
                            onDeleteMessage={(id)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==id) }))} 
                            onTradeStock={handleTradeStock} 
                        />
                    )}
                    {activePage === Page.SETTINGS && (
                        <SettingsPage 
                            player={player}
                            onUpdatePlayer={handleGenericUpdate}
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
