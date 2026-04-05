
import React, { useState, useEffect } from 'react';
import { INITIAL_PLAYER, Player, Page, Commitment, PressInteraction, SocialEvent, ActorSkills, AdType, Relationship, ProjectDetails, ActiveRelease, PastProject, StreamingState } from './types';
import { BottomNav } from './components/BottomNav';
import { ProductionCrisisModal } from './components/ProductionCrisisModal';
import { LifeEventModal } from './components/LifeEventModal';
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
import { processGameWeek } from './services/gameLoop';
import { generateAuditions, generatePartTimeJobs, rewardGenreExperience } from './services/roleLogic';
import { generateWeeklyFeed, calculateInteraction } from './services/npcLogic';
import { getRandomAgents, getRandomManagers, getRandomTrainers, getRandomStylists, getRandomTherapists, getRandomPublicists } from './services/teamLogic';
import { createBusiness, normalizeStudioState } from './services/businessLogic';
import { CheckCircle, Heart, ShieldAlert, AlertTriangle, PlayCircle, Loader2, Skull, Briefcase } from 'lucide-react'; 
import { useGameActions } from './hooks/useGameActions';
import { PROPERTY_CATALOG, CAR_CATALOG, CLOTHING_CATALOG } from './services/lifestyleLogic';
import { showAd, initAds } from './services/adLogic';
import { saveGameData, loadGameData, deleteGameData } from './services/storage';
import { createBloodlineSnapshot, getAbsoluteWeek, getLegacyInheritancePreview, getRelationshipAge, inheritActorSkills, LEGACY_MIN_PLAYABLE_AGE } from './services/legacyLogic';
import { applyPremiumPurchase, hasNoAds, PremiumProductId, restoreWeeklyEnergy, spendPlayerEnergy, syncEnergyDisplay } from './services/premiumLogic';
import { purchasePremiumProduct, restorePremiumPurchases } from './services/iapService';
import { RoleType } from './types';

type GameStatus = 'START_MENU' | 'CREATION' | 'PLAYING' | 'DEATH_SCREEN';

const dedupeAwards = <T extends { type: string; year: number; category: string; projectId: string; outcome: 'WON' | 'NOMINATED' }>(awards: T[] = []): T[] => {
  const byKey = new Map<string, T>();

  awards.forEach(award => {
      const key = `${award.type}::${award.year}::${award.category}::${award.projectId}`;
      const existing = byKey.get(key);

      if (!existing || (existing.outcome !== 'WON' && award.outcome === 'WON')) {
          byKey.set(key, award);
      }
  });

  return Array.from(byKey.values());
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
        genre: details?.genre || 'DRAMA',
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
        campaignItems: Array.isArray(details?.campaignItems) ? details!.campaignItems : [],
        hiddenStats,
    });
};

const normalizeStreamingState = (streaming: Partial<StreamingState> | undefined, details: ProjectDetails): StreamingState => ({
    platformId: streaming?.platformId || (details.hiddenStats.platformId as any) || 'NETFLIX',
    weekOnPlatform: typeof streaming?.weekOnPlatform === 'number' ? streaming.weekOnPlatform : 1,
    totalViews: typeof streaming?.totalViews === 'number' ? streaming.totalViews : 0,
    weeklyViews: Array.isArray(streaming?.weeklyViews) ? streaming!.weeklyViews : [],
    isLeaving: !!streaming?.isLeaving,
    ...(typeof streaming?.startWeek === 'number' ? { startWeek: streaming.startWeek } : {}),
});

const derivePlayerRoleType = (
    roleType: string | undefined,
    details?: Partial<ProjectDetails>,
    castList?: any[]
): RoleType => {
    const playerCastEntry = (castList || details?.castList || []).find((member: any) => member?.actorId === 'PLAYER_SELF');
    if (playerCastEntry?.roleType) return playerCastEntry.roleType as RoleType;
    return (roleType as RoleType) || 'LEAD';
};

const normalizeActiveRelease = (release: Partial<ActiveRelease>): ActiveRelease => {
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
        ...(release.promotionalBuzz !== undefined ? { promotionalBuzz: release.promotionalBuzz } : {}),
        ...(release.royaltyPercentage !== undefined ? { royaltyPercentage: release.royaltyPercentage } : {}),
        ...(release.previousBestBidValue !== undefined ? { previousBestBidValue: release.previousBestBidValue } : {}),
        ...(distributionPhase === 'STREAMING' ? { streaming: normalizeStreamingState(release.streaming, projectDetails) } : {}),
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
    },
    studioId: project.studioId || 'INDEPENDENT',
    budget: typeof project.budget === 'number' ? project.budget : 0,
    gross: typeof project.gross === 'number' ? project.gross : 0,
    genre: project.genre || 'DRAMA',
    projectType: project.projectType || 'MOVIE',
    awards: dedupeAwards(project.awards || []),
    castList: Array.isArray(project.castList) ? project.castList : [],
    reviews: Array.isArray(project.reviews) ? project.reviews : [],
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
    props!: GameErrorBoundaryProps;
    state: GameErrorBoundaryState = { hasError: false };

    constructor(props: GameErrorBoundaryProps) {
        super(props);
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.error('Game render crash recovered by boundary:', error);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-screen bg-black flex flex-col items-center justify-center text-white p-6 text-center">
                    <div className="text-xl font-black uppercase tracking-widest mb-3">Recovery Mode</div>
                    <p className="text-sm text-zinc-400 max-w-xs mb-6">
                        A save or screen error was detected. You can return to the menu instead of getting stuck on a black screen.
                    </p>
                    <button
                        onClick={this.props.onRecover}
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
  const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
  const [activePage, setActivePage] = useState<Page>(Page.HOME);
  const [isProcessing, setIsProcessing] = useState(false);
  const [gameStatus, setGameStatus] = useState<GameStatus>('START_MENU');
  const [saveSlots, setSaveSlots] = useState<Record<number, Player | null>>({ 1: null, 2: null, 3: null });
  const [currentSlot, setCurrentSlot] = useState<number | null>(null);
  const [isInitializing, setIsInitializing] = useState(true); // Loading state for async storage
  
  // UI States
  const [toastMessage, setToastMessage] = useState<{title: string, subtext: string} | null>(null);
  const [activePressEvent, setActivePressEvent] = useState<{ project: Commitment, questions: PressInteraction[] } | null>(null);
  const [showProtectionPrompt, setShowProtectionPrompt] = useState<{ partnerId: string, partnerName: string } | null>(null);
  const [activeSocialEvent, setActiveSocialEvent] = useState<{ event: SocialEvent, partnerId: string } | null>(null);
  
  // DEBT / AD STATES
  const [showDebtModal, setShowDebtModal] = useState(false);
  const [isShowingAd, setIsShowingAd] = useState(false);
  const [adStep, setAdStep] = useState(0); 
  const [adTotalSteps, setAdTotalSteps] = useState(1);

  const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  const persistSlotSave = (slot: number, nextPlayer: Player) => {
      saveGameData(`actorEmpireSave_${slot}`, nextPlayer);
      try {
          localStorage.setItem(`actorEmpireSave_${slot}`, JSON.stringify(nextPlayer));
          if (slot === 1) {
              // Keep a shadow copy for migration compatibility with older builds.
              localStorage.setItem('actorEmpireSave', JSON.stringify(nextPlayer));
          }
      } catch (error) {
          console.error("Local save mirror failed", error);
      }
  };
  const syncCurrentSlotSnapshot = (nextPlayer: Player) => {
      if (!currentSlot) return;
      setSaveSlots(prev => ({ ...prev, [currentSlot]: nextPlayer }));
      persistSlotSave(currentSlot, nextPlayer);
  };

  // --- LOGIC HOOK ---
  const { 
      handleGenericUpdate, handleRehearse, handleImproveAction, 
      handlePartnerAction, handleSocialInteract, handleIntimacyChoice, 
      handlePromotionAction, handleNPCInteract
  } = useGameActions({ 
      player, setPlayer, setToastMessage, setActivePressEvent, setShowProtectionPrompt, setActiveSocialEvent 
  });

  // Check for saved game on initial mount & Init Ads
  useEffect(() => {
    const init = async () => {
        try {
            await initAds();
            
            const slots: Record<number, Player | null> = { 1: null, 2: null, 3: null };
            
            // 1. Check IndexedDB for all 3 slots
            for (let i = 1; i <= 3; i++) {
                const savedData = await loadGameData(`actorEmpireSave_${i}`);
                if (savedData) {
                    slots[i] = savedData;
                }
            }
            
            // 2. Migration fallback matrix for older Android builds:
            // old single-key IndexedDB, old per-slot localStorage, then old single-key localStorage.
            const hasAnySave = Object.values(slots).some(s => s !== null);
            if (!hasAnySave) {
                const legacyIndexedDbSave = await loadGameData('actorEmpireSave');
                if (legacyIndexedDbSave) {
                    console.log("Migrating legacy IndexedDB save to Slot 1...");
                    persistSlotSave(1, legacyIndexedDbSave);
                    slots[1] = legacyIndexedDbSave;
                } else {
                    for (let i = 1; i <= 3; i++) {
                        const legacySlotSave = localStorage.getItem(`actorEmpireSave_${i}`);
                        if (!legacySlotSave) continue;
                        try {
                            const savedData = JSON.parse(legacySlotSave);
                            console.log(`Migrating localStorage slot ${i} to IndexedDB...`);
                            persistSlotSave(i, savedData);
                            slots[i] = savedData;
                        } catch (e) {
                            console.error(`Legacy slot ${i} corrupt`, e);
                        }
                    }

                    const hasRecoveredSlot = Object.values(slots).some(s => s !== null);
                    if (!hasRecoveredSlot) {
                        const legacySave = localStorage.getItem('actorEmpireSave');
                        if (legacySave) {
                            try {
                                const savedData = JSON.parse(legacySave);
                                console.log("Migrating legacy save to Slot 1...");
                                persistSlotSave(1, savedData);
                                slots[1] = savedData;
                            } catch (e) {
                                console.error("Legacy save corrupt", e);
                            }
                        }
                    }
                }
            }

            setSaveSlots(slots);
        } catch (e) {
            console.error("Init failed", e);
        } finally {
            setIsInitializing(false);
        }
    };
    init();
  }, []);

  // Auto-save logic
  useEffect(() => {
    if (gameStatus === 'PLAYING' && currentSlot) {
        setSaveSlots(prev => ({ ...prev, [currentSlot]: player }));
        persistSlotSave(currentSlot, player);
    }
  }, [player, gameStatus, currentSlot]);

  const handleSelectSlot = (slot: number) => {
    setCurrentSlot(slot);
    const existingSave = saveSlots[slot];
    if (existingSave) {
        setPlayer(existingSave);
        setGameStatus('PLAYING');
    } else {
        setPlayer(INITIAL_PLAYER);
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
    setGameStatus('START_MENU');
  };

  // Init opportunities and feed on mount (Hydration logic)
  useEffect(() => {
    if (gameStatus === 'PLAYING') {
      setPlayer(prev => {
          const safePlayer = { ...prev } as any;
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

          if (!safePlayer.team) safePlayer.team = { ...INITIAL_PLAYER.team };
          
          // Ensure Pools
          if (!safePlayer.team.availableAgents?.length) safePlayer.team.availableAgents = getRandomAgents(3);
          if (!safePlayer.team.availableManagers?.length) safePlayer.team.availableManagers = getRandomManagers(2);
          if (!Array.isArray(safePlayer.team.availableTrainers) || safePlayer.team.availableTrainers.length === 0) safePlayer.team.availableTrainers = getRandomTrainers(2);
          if (!Array.isArray(safePlayer.team.availableStylists) || safePlayer.team.availableStylists.length === 0) safePlayer.team.availableStylists = getRandomStylists(2);
          if (!Array.isArray(safePlayer.team.availableTherapists) || safePlayer.team.availableTherapists.length === 0) safePlayer.team.availableTherapists = getRandomTherapists(2);
          if (!Array.isArray(safePlayer.team.availablePublicists) || safePlayer.team.availablePublicists.length === 0) safePlayer.team.availablePublicists = getRandomPublicists(2);

          // Ensure Arrays
          if (!Array.isArray(safePlayer.commitments)) safePlayer.commitments = [];
          safePlayer.commitments = safePlayer.commitments.map((commitment: any) => normalizeCommitment(commitment));
          if (!Array.isArray(safePlayer.activeReleases)) safePlayer.activeReleases = [];
          safePlayer.activeReleases = safePlayer.activeReleases.map((release: any) => normalizeActiveRelease(release));
          if (!Array.isArray(safePlayer.pastProjects)) safePlayer.pastProjects = [];
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => normalizePastProject(project));
          if (!Array.isArray(safePlayer.news)) safePlayer.news = [];
          if (!Array.isArray(safePlayer.inbox)) safePlayer.inbox = [];
          if (!Array.isArray(safePlayer.activeSponsorships)) safePlayer.activeSponsorships = [];
          if (!Array.isArray(safePlayer.applications)) safePlayer.applications = [];
          if (!safePlayer.studioMemory) safePlayer.studioMemory = {} as any;
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
          if (!safePlayer.youtube.bannerColor) safePlayer.youtube.bannerColor = 'bg-gradient-to-r from-red-900 to-zinc-900';
          if (typeof safePlayer.youtube.subscribers !== 'number') safePlayer.youtube.subscribers = 0;
          if (typeof safePlayer.youtube.lifetimeEarnings !== 'number') safePlayer.youtube.lifetimeEarnings = 0;
          if (typeof safePlayer.youtube.totalChannelViews !== 'number') safePlayer.youtube.totalChannelViews = 0;
          if (typeof safePlayer.youtube.isMonetized !== 'boolean') safePlayer.youtube.isMonetized = false;

          if (!safePlayer.finance || typeof safePlayer.finance !== 'object') {
              safePlayer.finance = { history: [], yearly: [] };
          } else {
              if (!Array.isArray(safePlayer.finance.history)) safePlayer.finance.history = [];
              if (!Array.isArray(safePlayer.finance.yearly)) safePlayer.finance.yearly = [];
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

          if (safePlayer.weeklyOpportunities.jobs.length === 0) {
              const usedTitles = [...safePlayer.commitments.map((c: any) => c.name), ...safePlayer.activeReleases.map((r: any) => r.name), ...safePlayer.pastProjects.map((p: any) => p.name)];
              safePlayer.weeklyOpportunities = { auditions: generateAuditions(safePlayer, usedTitles), jobs: generatePartTimeJobs() };
          }

          if (safePlayer.instagram.feed.length === 0) safePlayer.instagram.feed = generateWeeklyFeed(safePlayer);
          
          if (!Array.isArray(safePlayer.awards)) safePlayer.awards = [];
          safePlayer.awards = dedupeAwards(safePlayer.awards);
          if (!Array.isArray(safePlayer.scheduledEvents)) safePlayer.scheduledEvents = [];
          if (!safePlayer.dating) safePlayer.dating = { isTinderActive: false, isLuxeActive: false, preferences: { gender: 'ALL', minAge: 18, maxAge: 35 }, matches: [] };
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
              return {
                  ...biz,
                  studioState: normalizeStudioState(biz.studioState, safePlayer.currentWeek || 1),
              };
          });
          safePlayer.pastProjects = safePlayer.pastProjects.map((project: any) => ({
              ...project,
              awards: dedupeAwards(project.awards || [])
          }));
          if (safePlayer.business) {
              const indMap: Record<string, any> = { 'Cafe': { type: 'CAFE', subtype: 'COFFEE_SHOP', emoji: '☕' }, 'Online Brand': { type: 'FASHION', subtype: 'STREETWEAR', emoji: '👕' }, 'Production House': { type: 'MERCH', subtype: 'ONLINE_STORE', emoji: '📦' } };
              const mapped = indMap[safePlayer.business.type] || { type: 'RESTAURANT', subtype: 'CASUAL_DINING', emoji: '🍽️' };
              const newBiz = createBusiness(safePlayer.business.name, mapped.type, mapped.subtype, { quality: 'STANDARD', pricing: 'MARKET', marketing: 'LOW' }, mapped.emoji, safePlayer.currentWeek);
              newBiz.stats.valuation = safePlayer.business.totalInvestment * 1.5;
              newBiz.balance = safePlayer.business.totalInvestment * 0.2; 
              safePlayer.businesses.push(newBiz);
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
      setPlayer(updatedPlayer); 
  };

  const handleNextWeek = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
        const { player: newPlayerState, triggerAd } = await processGameWeek(player);
        handleUpdatePlayer(newPlayerState);

        if (newPlayerState.flags?.isDead) {
            setGameStatus('DEATH_SCREEN');
            return;
        }

        // Debt Check
        if (newPlayerState.money < 0) {
            setShowDebtModal(true);
        }

        // INTERSTITIAL AD TRIGGER (Every 12 Weeks)
        if (triggerAd && !hasNoAds(newPlayerState)) {
            setTimeout(async () => {
                await showAd('INTERSTITIAL');
            }, 800);
        }
    } catch (error) {
        console.error('Week processing failed:', error);
        setToastMessage({
            title: "Week Processing Failed",
            subtext: "The week could not finish. Please try again."
        });
    } finally {
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
      setToastMessage({ title: "Press Tour Complete", subtext: "News outlets are running the story." });
  };

  const handleSocialEventChoice = (option: any) => {
      if (!activeSocialEvent) return;
      handlePartnerAction(activeSocialEvent.partnerId, 'EVENT_RESOLUTION', option);
      setActiveSocialEvent(null);
  };

  // --- REWARDED AD SYSTEM (FIXED FOR MULTI-STEP) ---
  const handleTriggerRewardAd = async (type: AdType, data?: any) => {
      if (type === 'REWARDED_BAILOUT' && (player.flags?.bailoutAdsUsedThisWeek || 0) >= 2) {
          setToastMessage({ title: "Bailout Limit Reached", subtext: "You can only claim 2 bailout ads per week." });
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
          setToastMessage({ title: "Reward Cancelled", subtext: "You must watch the complete ad." });
      }
  };

  const handleAdComplete = (type: AdType, data?: any) => {
      let toastTitle = "Reward Received";
      let toastSub = "";

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          
          if (type === 'REWARDED_CASH') {
              p.money += 5000;
              toastSub = "+$5,000";
          }
          else if (type === 'REWARDED_BAILOUT') {
              const bailoutAdsUsedThisWeek = p.flags?.bailoutAdsUsedThisWeek || 0;
              const currentDebt = Math.abs(p.money < 0 ? p.money : 0);
              const bailoutAmount = bailoutAdsUsedThisWeek === 0
                  ? Math.floor(currentDebt * 0.20) + 5000
                  : Math.floor(currentDebt * 0.10) + 2500;
              
              p.money += bailoutAmount;
              p.flags.bailoutAdsUsedThisWeek = bailoutAdsUsedThisWeek + 1;
              toastSub = `+$${bailoutAmount.toLocaleString()} Bailout Fund`;
              
              // Close debt modal if we are back in green
              if (p.money >= 0) {
                  setShowDebtModal(false);
              }
          }
          else if (type === 'REWARDED_ENERGY') {
              restoreWeeklyEnergy(p, 25);
              toastSub = "+25 Energy";
          }
          else if (type === 'REWARDED_STATS') {
              p.stats.health = Math.max(90, p.stats.health);
              p.stats.happiness = Math.max(90, p.stats.happiness);
              p.stats.looks = Math.max(90, p.stats.looks);
              p.stats.body = Math.max(90, p.stats.body);
              toastSub = "Full Wellness Restoration";
          }
          else if (type === 'REWARDED_SKILL' && data) {
              const skillKey = data as keyof ActorSkills;
              p.stats.skills[skillKey] = Math.min(100, p.stats.skills[skillKey] + 10);
              toastSub = `+10 ${skillKey}`;
          }
          else if (type === 'REWARDED_GENRE' && data) {
              rewardGenreExperience(p, data, 10);
              toastSub = `+10 XP in ${data}`;
          }
          
          setToastMessage({ title: toastTitle, subtext: toastSub });
          return p;
      });
  };

  const handlePremiumPurchase = async (productId: PremiumProductId) => {
      const result = await purchasePremiumProduct(productId);
      if (!result.success) {
          setToastMessage({ title: result.cancelled ? "Purchase Cancelled" : "Purchase Failed", subtext: result.message });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          const message = applyPremiumPurchase(p, productId);
          setToastMessage({ title: "Purchase Confirmed", subtext: message });
          return p;
      });
  };

  const handleRestorePurchases = async () => {
      const result = await restorePremiumPurchases();
      if (!result.success) {
          setToastMessage({ title: "Restore Failed", subtext: result.message });
          return;
      }

      if (result.restoredProductIds.length === 0) {
          setToastMessage({ title: "Nothing to Restore", subtext: result.message });
          return;
      }

      handleGenericUpdate(prev => {
          const p = JSON.parse(JSON.stringify(prev)) as Player;
          result.restoredProductIds.forEach(productId => {
              applyPremiumPurchase(p, productId);
          });
          setToastMessage({ title: "Purchases Restored", subtext: `${result.restoredProductIds.length} item(s) restored.` });
          return p;
      });
  };

  // --- HANDLERS ---
  const handleStartGame = (name: string, age: number, gender: any, avatar: string, handle: string) => { 
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
          relationships: parentRelationships,
          // Set specific handle for all platforms
          instagram: { ...INITIAL_PLAYER.instagram, handle: handle },
          x: { ...INITIAL_PLAYER.x, handle: handle, followers: 0 },
          youtube: { ...INITIAL_PLAYER.youtube, handle: handle }
      };
      if (currentSlot) {
          setSaveSlots(prev => ({ ...prev, [currentSlot]: newPlayer }));
      }
      setPlayer(newPlayer); 
      setGameStatus('PLAYING'); 
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
          residenceId: player.residenceId,
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
                  message: `Your heir was too young to take over immediately. Time passed until ${child.name} turned ${LEGACY_MIN_PLAYABLE_AGE}.`,
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
                  message: `Inheritance tax claimed $${inheritancePreview.moneyTaxPaid.toLocaleString()} in cash and ${inheritancePreview.sharesTaxPaid.toLocaleString()} stock shares. Properties, vehicles, businesses, and other assets transferred to the heir untouched.`,
                  type: 'neutral' as const
              }
          ].slice(-50);
      }
      syncCurrentSlotSnapshot(newPlayer);
      setPlayer(newPlayer);
      setGameStatus('PLAYING');
      setActivePage(Page.HOME);
  };

  
  const handleEventComplete = (updatedPlayer: Player) => { 
      setPlayer({ ...updatedPlayer, pendingEvent: null }); 
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

  const handleQuitJob = (id: string) => handleGenericUpdate(p => ({ 
      ...p, 
      commitments: p.commitments.filter(c => c.id !== id),
      logs: [...p.logs, { week: p.currentWeek, year: p.age, message: "Quit job.", type: 'neutral' }]
  }));

  const handleTradeStock = (stockId: string, amount: number) => { 
      const msg = amount > 0 ? "Bought stock" : "Sold stock";
      handleGenericUpdate(p => {
          const stock = p.stocks.find(s => s.id === stockId);
          if (!stock) return p;
          const totalCost = stock.price * amount;
          if (amount > 0) {
              if (p.money < totalCost) return p; 
              const existing = p.portfolio.find(i => i.stockId === stockId);
              const newPort = existing ? p.portfolio.map(i => i.stockId === stockId ? { ...i, shares: i.shares + amount } : i) : [...p.portfolio, { stockId, shares: amount }];
              return { ...p, money: p.money - totalCost, portfolio: newPort, logs: [...p.logs, { week: p.currentWeek, year: p.age, message: msg, type: 'neutral' }] };
          } else {
              const sellShares = Math.abs(amount);
              const existing = p.portfolio.find(i => i.stockId === stockId);
              if (!existing || existing.shares < sellShares) return p;
              const newPort = existing.shares === sellShares ? p.portfolio.filter(i => i.stockId !== stockId) : p.portfolio.map(i => i.stockId === stockId ? { ...i, shares: i.shares - sellShares } : i);
              return { ...p, money: p.money + (stock.price * sellShares), portfolio: newPort, logs: [...p.logs, { week: p.currentWeek, year: p.age, message: msg, type: 'neutral' }] };
          }
      });
  };

  if (isInitializing) {
      return (
          <div className="h-screen bg-black flex flex-col items-center justify-center text-white">
              <Loader2 size={48} className="animate-spin text-amber-500 mb-4" />
              <div className="text-sm font-bold uppercase tracking-widest text-zinc-500">Loading Career...</div>
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
                          Ad {adTotalSteps > 1 ? `${adStep}/${adTotalSteps}` : ''} Loading...
                      </h2>
                      <p className="text-zinc-500 text-xs">Please wait for reward confirmation</p>
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
                          <h2 className="text-3xl font-black text-white mb-2 uppercase tracking-tight">Financial Ruin</h2>
                          <p className="text-red-400 text-sm mb-6 leading-relaxed font-bold">
                              You failed to recover from debt. Your assets have been seized and your reputation is destroyed.
                          </p>
                          <div className="bg-black/60 rounded-xl p-4 mb-6 border border-red-900">
                              <div className="text-xs text-zinc-500 uppercase font-bold mb-1">Final Debt</div>
                              <div className="text-2xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</div>
                          </div>
                          <button 
                              onClick={handleRestartCareer}
                              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-zinc-200 transition-colors shadow-lg"
                          >
                              Restart Career
                          </button>
                      </>
                  ) : (
                      // WARNING STATE
                      <>
                          <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Bankruptcy Warning</h2>
                          <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
                              You are in debt! You have <span className="text-white font-bold">{8 - (player.flags.weeksInDebt || 0)} weeks</span> to recover funds before your career ends.
                          </p>
                          
                          <div className="bg-black/40 rounded-xl p-4 mb-6 border border-zinc-800">
                              <div className="flex justify-between items-center text-xs text-zinc-500 uppercase font-bold mb-2">
                                  <span>Current Debt</span>
                                  <span>Runway</span>
                              </div>
                              <div className="flex justify-between items-center">
                                  <span className="text-xl font-mono font-bold text-red-500">-${Math.abs(player.money).toLocaleString()}</span>
                                  <span className="text-white font-bold">{8 - (player.flags.weeksInDebt || 0)} Weeks</span>
                              </div>
                          </div>

                          <div className="space-y-3">
                              {/* Bailout Option - Calculates ~20% of current debt + 5k */}
                              <button 
                                  onClick={() => handleTriggerRewardAd('REWARDED_BAILOUT')}
                                  disabled={(player.flags.bailoutAdsUsedThisWeek || 0) >= 2}
                                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg"
                              >
                                  <PlayCircle size={18}/> Get Bailout (+${(((player.flags.bailoutAdsUsedThisWeek || 0) === 0 ? Math.floor(Math.abs(player.money) * 0.20) + 5000 : Math.floor(Math.abs(player.money) * 0.10) + 2500)).toLocaleString()})
                              </button>
                              <div className="text-[11px] text-zinc-500">
                                  Bailout ads used this week: {player.flags.bailoutAdsUsedThisWeek || 0}/2
                              </div>
                              
                              {/* Continue Option */}
                              <button 
                                  onClick={() => setShowDebtModal(false)}
                                  className="w-full py-3 bg-zinc-800 text-zinc-300 font-bold rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2"
                              >
                                  <Briefcase size={16}/> Manage Finances
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
              player={player} 
              event={player.pendingEvents[0]} 
              onChoice={(idx) => {
                  const currentEvent = player.pendingEvents![0];
                  const { updatedPlayer, log } = applyCrisisImpact(player, currentEvent, idx);
                  
                  // Remove the event from the queue
                  const newPendingEvents = [...(updatedPlayer.pendingEvents || [])];
                  newPendingEvents.shift();
                  
                  handleUpdatePlayer({
                      ...updatedPlayer,
                      pendingEvents: newPendingEvents,
                      logs: [{ week: player.currentWeek, year: player.age, message: log, type: 'neutral' }, ...player.logs].slice(0, 50)
                  });
              }} 
          />
      )}

      {player.pendingEvents && player.pendingEvents.length > 0 && 
        (player.pendingEvents[0].type === 'LIFE_EVENT' || 
         player.pendingEvents[0].type === 'LEGAL_HEARING' || 
         player.pendingEvents[0].type === 'SCANDAL' || 
         player.pendingEvents[0].type === 'UNDERWORLD_OFFER') && (
          <LifeEventModal 
              player={player}
              event={player.pendingEvents[0]}
              onChoice={(updatedPlayer, log) => {
                  const newPendingEvents = [...(updatedPlayer.pendingEvents || [])];
                  newPendingEvents.shift();

                  handleUpdatePlayer({
                      ...updatedPlayer,
                      pendingEvents: newPendingEvents,
                      logs: [{ week: player.currentWeek, year: player.age, message: log, type: 'neutral' }, ...player.logs].slice(0, 50)
                  });
              }}
          />
      )}
      {activePressEvent && (<PressConferenceEvent player={player} projectName={activePressEvent.project.name} questions={activePressEvent.questions} onComplete={handlePressConferenceComplete} onClose={() => setActivePressEvent(null)} />)}

      {showProtectionPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-sm p-6 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4"><Heart size={24} fill="currentColor" /></div>
                  <h3 className="text-white font-bold text-lg mb-1">Intimacy with {showProtectionPrompt.partnerName}</h3>
                  <div className="grid grid-cols-1 gap-3 w-full mt-6">
                      <button onClick={() => handleIntimacyChoice('PROTECTED', showProtectionPrompt.partnerId)} className="py-4 px-4 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-white text-sm">Use Protection</div></div><CheckCircle size={18} className="text-emerald-500"/>
                      </button>
                      <button onClick={() => handleIntimacyChoice('UNPROTECTED', showProtectionPrompt.partnerId)} className="py-4 px-4 rounded-xl bg-zinc-800 border border-rose-900/30 hover:bg-rose-900/10 flex items-center justify-between group">
                          <div className="text-left"><div className="font-bold text-rose-400 text-sm">Unprotected</div></div><ShieldAlert size={18} className="text-rose-500"/>
                      </button>
                  </div>
                  <button onClick={() => setShowProtectionPrompt(null)} className="mt-4 text-xs text-zinc-500 hover:text-white underline">Cancel</button>
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

      {/* Persistent Debt Warning Banner (When modal is closed but still in debt) */}
      {player.money < 0 && !showDebtModal && (gameStatus === 'PLAYING') && (
          <div className="fixed top-0 left-0 right-0 bg-red-600 text-white text-center py-1 text-xs font-bold z-[60] flex justify-between px-4 items-center shadow-lg cursor-pointer" onClick={() => setShowDebtModal(true)}>
              <span>⚠️ DEBT: ${Math.abs(player.money).toLocaleString()}</span>
              <span>{8 - (player.flags.weeksInDebt || 0)} Weeks Left</span>
          </div>
      )}

      <div className="max-w-md mx-auto h-screen relative z-10 bg-zinc-950/80 shadow-2xl border-x border-white/5 flex flex-col pt-safe-top">
        {gameStatus === 'START_MENU' && (
            <StartMenu 
                saveSlots={saveSlots}
                onSelectSlot={handleSelectSlot}
                onDeleteSlot={handleDeleteSlot}
            />
        )}
        {gameStatus === 'CREATION' && <CreationMenu onStartGame={handleStartGame} />}
        {gameStatus === 'PLAYING' && (
            <>
                <div className={`flex-1 px-5 pt-5 pb-28 overflow-y-auto custom-scrollbar ${player.money < 0 ? 'pt-8' : ''}`}>
                    {activePage === Page.HOME && (<HomePage player={player} onNextWeek={handleNextWeek} isProcessing={isProcessing} onUpdatePlayer={handleUpdatePlayer} setPage={setActivePage} />)}
                    {activePage === Page.CAREER && (<CareerPage player={player} onQuitJob={handleQuitJob} onRehearse={handleRehearse} />)}
                    {activePage === Page.IMPROVE && (<ImprovePage player={player} onTrain={()=>{}} onEnroll={(c)=>handleGenericUpdate(p=>({ ...p, money: p.money- (c.upfrontCost||0), commitments: [...p.commitments, {...c, id: `c_${Date.now()}`, weeksCompleted:0}] }))} onCancel={(id)=>handleGenericUpdate(p=>({ ...p, commitments: p.commitments.filter(c=>c.id!==id)}))} onPerformAction={handleImproveAction} />)}
                    {activePage === Page.SOCIAL && (<SocialPage player={player} onInteract={handleSocialInteract} onContinueAsChild={handleContinueAsChild} />)}
                    {activePage === Page.LIFESTYLE && (<LifestylePage player={player} onBuyItem={(i)=>handleGenericUpdate(p=>({ ...p, money: p.money-i.price, assets: [...p.assets, i.id], customItems: i.id.includes('_cust_') ? [...p.customItems, i as any] : p.customItems }))} onSellItem={(id)=>handleGenericUpdate(p=>{ const it = [...PROPERTY_CATALOG, ...CAR_CATALOG, ...CLOTHING_CATALOG].find(x=>x.id===id); return { ...p, money: p.money + (it ? it.price*0.5 : 0), assets: p.assets.filter(a=>a!==id) }; })} onSetResidence={(id)=>handleGenericUpdate(p=>({ ...p, residenceId: id }))} onSetActiveStyle={(s)=>handleGenericUpdate(p=>({ ...p, activeClothingStyle: s }))} onStartBusiness={()=>{}} onShutdownBusiness={()=>{}} onUpdatePlayer={handleUpdatePlayer} onPremiumPurchase={handlePremiumPurchase} />)}
                    {activePage === Page.MOBILE && (
                        <MobilePage 
                            player={player} 
                            onUpdatePlayer={handleUpdatePlayer}
                            onAudition={(opp)=>handleGenericUpdate(p=>{ const next: Player = { ...p, applications: [...p.applications, { id: `app_${Date.now()}`, type: 'AUDITION' as const, name: opp.projectName, weeksRemaining: 1, data: opp }] }; spendPlayerEnergy(next, 25); return next; })}
                            onTakeJob={(job)=>handleGenericUpdate(p=>({ ...p, commitments: [...p.commitments, job] }))}
                            onQuitJob={handleQuitJob} 
                            onPost={(t,c,img)=>handleGenericUpdate(p=>{
                                // --- REVISED INSTAGRAM POST LOGIC ---
                                const fameFactor = Math.max(1, p.stats.fame);
                                const currentFollowers = Math.max(0, p.stats.followers);
                                
                                // Diminishing returns for multiple posts/week
                                const postsThisWeek = p.instagram.weeklyPostCount;
                                const decay = postsThisWeek > 2 ? 0.4 : 1.0; 

                                // Engagement Base: Followers + (Fame * Random Multiplier)
                                const baseReach = 50 + (currentFollowers * 0.1) + (fameFactor * 50);
                                
                                // Engagement Rate: 5% to 15% normally
                                const qualityRoll = 0.5 + Math.random(); // 0.5 to 1.5 multiplier
                                const engageRate = (0.05 + (Math.random() * 0.10)) * decay;
                                
                                let likes = Math.floor(baseReach * engageRate * qualityRoll);
                                // Ensure likes vary even if base params are identical
                                likes = Math.floor(likes * (0.8 + Math.random() * 0.4));
                                
                                // Viral Spike Chance (5%)
                                let viralMulti = 1;
                                if (Math.random() < 0.05) {
                                    viralMulti = 3 + Math.random() * 2; // 3x to 5x boost
                                    likes = Math.floor(likes * viralMulti);
                                }

                                // Minimum likes so it's not 0
                                if (likes <= 0) likes = Math.floor(Math.random() * 5) + 1;

                                // Follower Gain Logic
                                let conversionRate = 0.02 + (Math.random() * 0.03); // 2-5% conversion
                                if (p.stats.followers < 1000) conversionRate += 0.05; // Boost for newbies

                                let gain = Math.floor(likes * conversionRate);
                                
                                // Early game boost
                                if (p.stats.fame < 10 && gain < 5) {
                                    gain += Math.floor(Math.random() * 5) + 1;
                                }
                                
                                // Cap excessive growth
                                if (p.stats.followers > 1000 && viralMulti === 1 && gain > currentFollowers * 0.2) {
                                    gain = Math.floor(currentFollowers * 0.2);
                                }

                                const actualGain = Math.max(1, gain); 
                                
                                const avatarToSave = p.avatar.startsWith('data:') ? '' : p.avatar;

                                const newPost = { id: `p_${Date.now()}`, authorId: 'PLAYER', authorName: p.name, authorHandle: p.instagram.handle, authorAvatar: avatarToSave, type: t, caption: c, week: p.currentWeek, year: p.age, likes: likes, comments: Math.floor(likes * 0.05), isPlayer: true, contentImage: img };
                                
                                const toastMsg = viralMulti > 1 ? `Viral! +${actualGain.toLocaleString()} Followers` : `+${actualGain.toLocaleString()} Followers`;
                                setToastMessage({ title: "Posted", subtext: toastMsg });
                                
                                const nextState: Player = { 
                                    ...p, 
                                    stats: { ...p.stats, followers: p.stats.followers + actualGain },
                                    instagram: { ...p.instagram, posts: [newPost, ...p.instagram.posts], weeklyPostCount: p.instagram.weeklyPostCount + 1 } 
                                };
                                spendPlayerEnergy(nextState, 10);
                                return nextState;
                            })}
                            onFollowNPC={(npc)=>handleGenericUpdate(p=>({ ...p, instagram: { ...p.instagram, npcStates: { ...p.instagram.npcStates, [npc.id]: { ...p.instagram.npcStates[npc.id], isFollowing: !p.instagram.npcStates[npc.id]?.isFollowing } } } }))}
                            onInteractNPC={handleNPCInteract}
                            onBefriendNPC={(npc)=>{}}
                            onHireAgent={(agent) => {
                                handleGenericUpdate(p => {
                                    if (p.money < agent.annualFee) {
                                        setToastMessage({ title: "Not Enough Money", subtext: `You need $${agent.annualFee.toLocaleString()} for the annual fee.` });
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
                                    setToastMessage({ title: "Agent Hired!", subtext: `${agent.name} is now representing you.` });
                                    return { 
                                        ...p, 
                                        money: p.money - agent.annualFee,
                                        team: { ...p.team, agent: agent },
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
                                        setToastMessage({ title: "Not Enough Money", subtext: `You need $${manager.annualFee.toLocaleString()} for the annual fee.` });
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
                                    setToastMessage({ title: "Manager Hired!", subtext: `${manager.name} is now managing your career.` });
                                    return { 
                                        ...p, 
                                        money: p.money - manager.annualFee,
                                        team: { ...p.team, manager: manager },
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
                            onAcceptMessage={(msg)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==msg.id) }))} 
                            onPerformSponsorship={(id, type)=>handleGenericUpdate(p=>{ const s = p.activeSponsorships.find(x=>x.id===id); if (!s) return p; const next = { ...p }; spendPlayerEnergy(next, s.requirements.energyCost); return next; })}
                            onDeleteMessage={(id)=>handleGenericUpdate(p=>({ ...p, inbox: p.inbox.filter(m=>m.id!==id) }))} 
                            onTradeStock={handleTradeStock} 
                        />
                    )}
                    {activePage === Page.SETTINGS && (
                        <SettingsPage 
                            onBack={() => setActivePage(Page.HOME)} 
                            onMainMenu={() => {
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
                <BottomNav activePage={activePage} setPage={setActivePage} />
            </>
        )}
      </div>
    </div>
    </GameErrorBoundary>
  );
};

export default App;
