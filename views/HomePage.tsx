
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Player, ActorSkills, Commitment, ScheduledEvent, Message, AuditionOpportunity, UniverseContract, UniverseId, Page, Genre, Relationship, LifeEvent, Script, OutsideProducerInvestmentOffer, OutsideProductionInvestment, PlayerProductionFocus } from '../types';
import { formatMoney } from '../services/formatUtils';
import { StatsBar } from '../components/StatsBar';
import { formatRoleRejectionReview, generateProjectDetails, getRoleRejectionFeedback, ROLE_DEFINITIONS } from '../services/roleLogic';
import { normalizeUniverseForSave, rebootRetiredUniverse, retireUniverseForArchive } from '../services/universeLogic';
import { generateLifeEvent } from '../services/lifeEventLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getGenderedAvatar, NPC_DATABASE } from '../services/npcLogic';
import { createBusiness } from '../services/businessLogic';
import { calculateYoutubeCreatorScore, getYoutubePublicImageLabel } from '../services/youtubeLogic';
import { ALL_GENRES, formatGenreLabel } from '../services/genreCatalog';
import { getPlayerLanguage, t } from '../services/i18n';
import { Heart, Smile, Star, Zap, DollarSign, BadgeDollarSign, Brain, Calendar, Activity, TrendingUp, Trophy, X, Sliders, Users, Film, Tv, PlayCircle, Lock, FastForward, Key, AlertTriangle, Mic2, Mail, FileText, Dumbbell, Sparkles, Settings, ShoppingCart, Clapperboard, ZapOff, Crown, Skull, Camera, UploadCloud, Check, MessageSquareQuote, Globe, BarChart3, PieChart } from 'lucide-react';
import { addBreadcrumb, recordNonFatal, setCrashContext, startPerformanceTrace, stopPerformanceTrace, trackGameEvent } from '../services/firebaseService';
import { getStockOutstandingShares } from '../services/stockLogic';
import { processShareholderVoting } from '../services/shareholderVoting';
import { processStockTakeoverEvents } from '../services/stockTakeover';
import { processWorldReactions } from '../services/worldReactions';
import { processAcquisitionDebtService, syncAcquisitionDebtLedger } from '../services/acquisitionDebt';
import { processRegulatorPressure } from '../services/regulatorPressure';
import { processTalentInstability } from '../services/talentInstability';
import { processRivalRetaliation } from '../services/rivalRetaliation';
import { processAcquisitionMarketPulse } from '../services/acquisitionMarketPulse';
import { buildOutsideProducerInvestmentMessage } from '../services/outsideProductions';
import { getWeeklyEnergySpendLog } from '../services/premiumLogic';
import { buildCanonStoryQaFixture } from '../services/canonStoryQa';
import { ProfilePictureBuilder } from './avatar/ProfilePictureBuilder';
import { getActorCareerArc } from '../services/actorCareerArc';
import { RolePerformanceReport } from '../components/RolePerformanceReport';
import {
  ProfileBuilderGender,
  ProfileBuilderSelection,
  createSeededProfileSelection,
} from '../services/profileBuilder';
import { exportProfilePortrait } from './avatar/profilePortraitRenderer';
import { createHomeSocialQaActions } from './home/homeSocialQaActions';
import { createHomeProductionQaActions } from './home/homeProductionQaActions';
import { createHomeBoxOfficeQaActions } from './home/homeBoxOfficeQaActions';
import { createHomeStudioOwnershipQaActions } from './home/homeStudioOwnershipQaActions';
import { createHomeStudioProductionQaActions } from './home/homeStudioProductionQaActions';
import {
  buildPlatformAiPhase4QaFixture,
  createPlatformAiPlayerCommissionQaFixture,
  getPlatformAiPhase4QaSnapshot,
} from '../services/platformAi';
import {
  buildStreamingRightsPhase8QaFixture,
  getStreamingRightsPhase8QaSummary,
} from '../services/streamingRightsQa';

interface HomePageProps {
  player: Player;
  onNextWeek: () => void;
  isProcessing: boolean;
  onUpdatePlayer?: (player: Player) => void;
  setPage?: (page: Page) => void;
  onOpenProductionHouseCheat?: () => void;
  onOpenPlatformCommissionCheat?: () => void;
  onOpenStudioAcquisitionCheat?: (studioId: string) => void;
  onOpenBoxOfficeCheat?: () => void;
  onQueueBabyNamingCheat?: () => void;
  onOpenDeathSummaryPreview?: () => void;
  onShowWhatsNewCheat?: () => void;
}

type HomeProductionPhase = NonNullable<Commitment['projectPhase']>;
type CheatMenuMode = 'NONE' | 'DEV' | 'EDITOR';

const CHEAT_GENRES: Genre[] = ALL_GENRES;
const DEV_TOOLS_PASSCODE = import.meta.env.VITE_DEV_TOOLS_PASSCODE || 'Kzign@420';
const EDITOR_TOOLS_PASSCODE = 'editor@123';
const LEGACY_DEV_TOOLS_PASSCODES = ['actor-dev'];
const HOME_AVATAR_PRESET_SEEDS = [
  'Opening Night',
  'Casting Call',
  'Studio Breakout',
  'Award Season',
  'Indie Darling',
  'Action Lead',
  'Press Tour',
  'Festival Face',
  'Streaming Star',
  'Teen Idol',
  'Prestige Role',
  'Red Carpet Debut',
  'Comedy Lead',
  'Mystery Star',
  'Sci-Fi Icon',
  'Method Actor',
  'Box Office Heat',
  'Talk Show Guest',
  'Magazine Cover',
  'Fan Favorite',
  'Director Pick',
  'Global Breakout',
  'Cult Classic',
  'Luxury Launch',
  'Award Winner',
  'Studio Darling',
  'Comeback Era',
  'Fresh Face',
  'Press Wall',
  'Premiere Night',
];

interface HomeAvatarPreset {
  id: string;
  label: string;
  selection: ProfileBuilderSelection;
  thumbnail: string;
}

const toHomeProfileGender = (gender: Player['gender']): ProfileBuilderGender => {
  if (gender === 'FEMALE') return 'FEMALE';
  if (gender === 'NON_BINARY') return 'NON_BINARY';
  return 'MALE';
};

const safeExportHomePortrait = (selection: ProfileBuilderSelection, exportScale = 2): string => {
  if (typeof document === 'undefined') return '';
  return exportProfilePortrait(selection, exportScale);
};

const cheatWeekFromAbsolute = (absoluteWeek: number): { year: number; week: number } => ({
  year: Math.max(18, Math.floor(Math.max(1, absoluteWeek) / 52)),
  week: Math.max(1, Math.max(1, absoluteWeek) % 52 || 52)
});

export const HomePage: React.FC<HomePageProps> = ({ player, onNextWeek, isProcessing, onUpdatePlayer, setPage, onOpenProductionHouseCheat, onOpenPlatformCommissionCheat, onOpenStudioAcquisitionCheat, onOpenBoxOfficeCheat, onQueueBabyNamingCheat, onOpenDeathSummaryPreview, onShowWhatsNewCheat }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);

  // Cheat Menu State
  const [activeCheatMenu, setActiveCheatMenu] = useState<CheatMenuMode>('NONE');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [showPortraitBuilder, setShowPortraitBuilder] = useState(false);
  const [showActorArcSheet, setShowActorArcSheet] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar);
  const [selectedProfileSelection, setSelectedProfileSelection] = useState<ProfileBuilderSelection | null>(null);
  const [isCustomUpload, setIsCustomUpload] = useState(player.avatar.startsWith('data:image'));
  const [isCompressing, setIsCompressing] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [showEnergySpendSheet, setShowEnergySpendSheet] = useState(false);

  const clickCountRef = useRef(0);
  const lastClickRef = useRef(0);
  const avatarClickTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const liveFeedLogs = useMemo(() => (player.logs || []).filter(log => {
    const message = String(log.message || '');
    if (/appointed .+ as (Investor CEO|Managing Partner|Finance CEO|Media President|Regional Chair)/i.test(message)) return false;
    if (/now leads the music charts|turns ".+" into a culture moment|beats ".+" for #1|became a music-scene rivalry|hit a .+ music scandal/i.test(message)) return false;
    return true;
  }), [player.logs]);
  const actorCareerArc = useMemo(() => getActorCareerArc(player), [player]);
  const latestRoleCredit = useMemo(() => [...(player.pastProjects || [])]
    .filter(project => !project.isQaArchive && project.playerCharacterProfile?.storyRole)
    .sort((a, b) => {
      const bWeek = Number(b.releasedAtAbsoluteWeek ?? (Number(b.releaseYear || b.year || 0) * 52 + Number(b.releaseWeek || 0)));
      const aWeek = Number(a.releasedAtAbsoluteWeek ?? (Number(a.releaseYear || a.year || 0) * 52 + Number(a.releaseWeek || 0)));
      return bWeek - aWeek;
    })[0], [player.pastProjects]);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveFeedLogs]);

  useEffect(() => {
    setSelectedAvatar(player.avatar);
    setSelectedProfileSelection(null);
    setIsCustomUpload(player.avatar.startsWith('data:image'));
  }, [player.avatar]);

  useEffect(() => () => {
      if (avatarClickTimeoutRef.current) {
          window.clearTimeout(avatarClickTimeoutRef.current);
      }
  }, []);

  const currentAvatarList = useMemo<HomeAvatarPreset[]>(() => {
      const profileGender = toHomeProfileGender(player.gender);
      return HOME_AVATAR_PRESET_SEEDS.map((seed, index) => {
          const selection = createSeededProfileSelection(profileGender, `${profileGender}:home-avatar:${seed}:${index}`);
          return {
              id: `${profileGender}-${seed}-${index}`,
              label: seed,
              selection,
              thumbnail: safeExportHomePortrait(selection, 2),
          };
      });
  }, [player.gender]);

  const applyAvatarPreset = (preset: HomeAvatarPreset) => {
      const exportedAvatar = safeExportHomePortrait(preset.selection, 3);
      if (!exportedAvatar) return;
      setSelectedAvatar(exportedAvatar);
      setSelectedProfileSelection(preset.selection);
      setIsCustomUpload(false);
      setAvatarError('');
  };

  // Handle Avatar Triple Click
  const handleAvatarClick = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 400) {
        clickCountRef.current += 1;
    } else {
        clickCountRef.current = 1;
    }
    lastClickRef.current = now;

    if (clickCountRef.current === 3) {
        if (avatarClickTimeoutRef.current) {
            window.clearTimeout(avatarClickTimeoutRef.current);
            avatarClickTimeoutRef.current = null;
        }
        setShowPasswordPrompt(true);
        setPasswordInput('');
        setPasswordError(false);
        clickCountRef.current = 0;
        return;
    }

    if (avatarClickTimeoutRef.current) {
        window.clearTimeout(avatarClickTimeoutRef.current);
    }
    avatarClickTimeoutRef.current = window.setTimeout(() => {
        if (clickCountRef.current < 3) {
            setShowAvatarEditor(true);
            setShowPortraitBuilder(false);
            setAvatarError('');
            setSelectedAvatar(player.avatar);
            setSelectedProfileSelection(null);
            setIsCustomUpload(player.avatar.startsWith('data:image'));
        }
        clickCountRef.current = 0;
        avatarClickTimeoutRef.current = null;
    }, 420);
  };

  const handleUnlockDevTools = () => {
      const normalizedInput = passwordInput.trim();
      const isEditorPasscode = normalizedInput === EDITOR_TOOLS_PASSCODE;
      const isValidPasscode =
          normalizedInput === DEV_TOOLS_PASSCODE ||
          LEGACY_DEV_TOOLS_PASSCODES.includes(normalizedInput);

      if (isEditorPasscode || isValidPasscode) {
          setShowPasswordPrompt(false);
          setPasswordInput('');
          setActiveCheatMenu(isEditorPasscode ? 'EDITOR' : 'DEV');
      } else {
          setPasswordError(true);
          setPasswordInput('');
          setTimeout(() => setPasswordError(false), 500);
      }
  };

  const compressImage = (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
          const blobUrl = URL.createObjectURL(file);
          const img = new Image();

          img.onload = () => {
              URL.revokeObjectURL(blobUrl);
              const canvas = document.createElement('canvas');
              const MAX_SIZE = 300;
              let width = img.width;
              let height = img.height;

              if (width > height) {
                  if (width > MAX_SIZE) {
                      height *= MAX_SIZE / width;
                      width = MAX_SIZE;
                  }
              } else if (height > MAX_SIZE) {
                  width *= MAX_SIZE / height;
                  height = MAX_SIZE;
              }

              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                  reject(new Error('Canvas context failed'));
                  return;
              }
              ctx.drawImage(img, 0, 0, width, height);
              resolve(canvas.toDataURL('image/jpeg', 0.7));
          };

          img.onerror = (err) => {
              URL.revokeObjectURL(blobUrl);
              reject(err);
          };

          img.src = blobUrl;
      });
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
          setAvatarError('Please upload a valid image file.');
          return;
      }
      setIsCompressing(true);
      setAvatarError('');
      try {
          const compressed = await compressImage(file);
          setSelectedAvatar(compressed);
          setSelectedProfileSelection(null);
          setIsCustomUpload(true);
      } catch (err) {
          console.error('Avatar processing failed', err);
          setAvatarError('Could not process that photo. Try a smaller image.');
      } finally {
          setIsCompressing(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const handleSaveAvatar = () => {
      if (!onUpdatePlayer || !selectedAvatar) return;
      onUpdatePlayer({ ...player, avatar: selectedAvatar });
      setShowAvatarEditor(false);
      setShowPortraitBuilder(false);
      setAvatarError('');
  };

  // Cheat Update Helper
  const updateStat = (key: keyof typeof player.stats, value: number) => {
      if (!onUpdatePlayer) return;
      const newStats = { ...player.stats, [key]: value };
      onUpdatePlayer({ ...player, stats: newStats });
  };

  const updateSkill = (key: keyof ActorSkills, value: number) => {
      if (!onUpdatePlayer) return;
      const newSkills = { ...player.stats.skills, [key]: value };
      onUpdatePlayer({ ...player, stats: { ...player.stats, skills: newSkills } });
  };

  const updateGenreXP = (genre: Genre, value: number) => {
      if (!onUpdatePlayer) return;
      const newGenreXP = { ...player.stats.genreXP, [genre]: value };
      onUpdatePlayer({ ...player, stats: { ...player.stats, genreXP: newGenreXP } });
  };

  const updateMoney = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({ ...player, money: parseInt(e.target.value) || 0 });
  };

  const prepareStreamingFounderQa = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          money: Math.max(player.money, 200_000_000),
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 80),
              reputation: Math.max(player.stats.reputation, 80),
          },
      });
      setActiveCheatMenu('NONE');
  };

  const updateEnergy = (value: number) => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({ ...player, energy: { ...player.energy, current: value } });
  };

  const runEditorAction = (action: () => void, afterAction?: () => void) => {
      const originalAlert = typeof window !== 'undefined' ? window.alert : undefined;
      if (originalAlert) {
          window.alert = () => undefined;
      }
      try {
          action();
      } finally {
          if (originalAlert) {
              window.alert = originalAlert;
          }
      }
      afterAction?.();
  };

  const sendCastingFeedbackQaMessage = (stage: 'APPLICATION' | 'AUDITION') => {
      if (!onUpdatePlayer) return;

      const usedTitles = [
          ...player.commitments.map(c => c.name),
          ...player.activeReleases.map(r => r.name),
          ...player.pastProjects.map(p => p.name)
      ];
      const project = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
      project.title = stage === 'APPLICATION' ? 'Cheat Shortlist Rejection' : 'Cheat Audition Rejection';
      project.genre = 'ACTION';
      project.visibleHype = 'HIGH';
      project.isFamous = true;

      const opportunity: AuditionOpportunity = {
          id: `cheat_casting_feedback_${stage.toLowerCase()}_${Date.now()}`,
          roleType: 'LEAD',
          projectName: project.title,
          genre: project.genre,
          config: ROLE_DEFINITIONS.LEAD,
          project,
          estimatedIncome: 12000000,
          source: 'CASTING_APP'
      };
      const rivalWinner = stage === 'AUDITION'
          ? NPC_DATABASE.find(npc => npc.occupation === 'ACTOR') || NPC_DATABASE[0]
          : undefined;
      const feedback = getRoleRejectionFeedback(player, opportunity, stage, rivalWinner, language);
      const newMessage: Message = {
          id: `msg_cheat_casting_feedback_${Date.now()}`,
          sender: tr('services.role.rejection.inbox.sender'),
          subject: tr('services.role.rejection.inbox.subject', { projectName: project.title }),
          text: formatRoleRejectionReview(project.title, stage, feedback, language),
          type: 'CASTING_FEEDBACK',
          isRead: false,
          weekSent: player.currentWeek,
          expiresIn: 8
      };

      onUpdatePlayer({
          ...player,
          inbox: [newMessage, ...player.inbox],
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `CHEAT: ${stage === 'APPLICATION' ? 'Shortlist' : 'Audition'} rejection feedback sent to inbox.`,
              type: 'neutral'
          }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      setPage?.(Page.MOBILE);
      alert('Casting feedback QA message sent. Open Phone > Messages to test the badge and copy.');
  };

  const maxAllSkills = () => {
      if (!onUpdatePlayer) return;
      const maxedSkills: ActorSkills = {
          delivery: 100, memorization: 100, expression: 100,
          improvisation: 100, discipline: 100, presence: 100, charisma: 100, writing: 100
      };
      onUpdatePlayer({ ...player, stats: { ...player.stats, skills: maxedSkills, talent: 100 } });
  };

  const injectProject = (tier: 'LOW'|'MID'|'HIGH') => {
      if (!onUpdatePlayer) return;
      const usedTitles = [
        ...player.commitments.map(c => c.name),
        ...player.activeReleases.map(r => r.name),
        ...player.pastProjects.map(p => p.name)
      ];
      const details = generateProjectDetails(tier, 'MOVIE', usedTitles, player);
      const newCommitment: Commitment = {
         id: `cheat_proj_${Date.now()}`,
         name: details.title + " (Cheat)",
         type: 'ACTING_GIG',
         roleType: 'LEAD',
         energyCost: 0,
         income: 0,
         lumpSum: 500000,
         payoutType: 'LUMPSUM',
         projectDetails: details,
         projectPhase: 'POST_PRODUCTION', // Magic State
         phaseWeeksLeft: 1, // 1 Week from release
         totalPhaseDuration: 20,
         auditionPerformance: 100,
         productionPerformance: 100 // Guaranteed good performance
      };
      onUpdatePlayer({
         ...player,
         commitments: [...player.commitments, newCommitment]
      });
      setActiveCheatMenu('NONE');
  };

  const injectPostProdProject = () => {
      if (!onUpdatePlayer) return;
      const usedTitles = [
        ...player.commitments.map(c => c.name),
        ...player.activeReleases.map(r => r.name),
        ...player.pastProjects.map(p => p.name)
      ];
      const details = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
      const newCommitment: Commitment = {
         id: `cheat_proj_pp_${Date.now()}`,
         name: details.title + " (Promo Test)",
         type: 'ACTING_GIG',
         roleType: 'LEAD',
         energyCost: 0,
         income: 0,
         lumpSum: 1000000,
         payoutType: 'LUMPSUM',
         projectDetails: details,
         projectPhase: 'POST_PRODUCTION',
         phaseWeeksLeft: 12, // Long duration to test actions
         totalPhaseDuration: 12,
         auditionPerformance: 90,
         productionPerformance: 90,
         promotionalBuzz: 0
      };
      onUpdatePlayer({
         ...player,
         commitments: [...player.commitments, newCommitment]
      });
      setActiveCheatMenu('NONE');
      alert("Added project in Post-Production (12 weeks remaining). Check Career page.");
  };

  // NEW: Triggers a Sequel Proposal Event (Simulates Week 4 of a Hit Movie)
  const {
    triggerSequelProposalSetup,
    triggerSequelReleaseSetup,
    triggerAwardCeremony,
    triggerAwardsPolishQa,
    triggerAwardInvite,
    triggerCheatContract,
    triggerCheatFranchiseContract,
    triggerCheatPostProd,
    triggerProductionCrisis,
    triggerDirectorDecision,
  } = createHomeProductionQaActions({
    player,
    onUpdatePlayer,
    closeMenu: () => setActiveCheatMenu('NONE'),
  });
  const triggerCheatLifeEvent = () => {
    if (!onUpdatePlayer) return;

    let event = generateLifeEvent(player);

    let tries = 0;
    while (!event && tries < 100) {
        event = generateLifeEvent(player);
        tries++;
    }

    if (event) {
        const scheduledEvent = {
            id: event.id,
            week: player.currentWeek,
            type: 'LIFE_EVENT' as const,
            title: event.title,
            data: { lifeEvent: event }
        };

        onUpdatePlayer({
            ...player,
            pendingEvents: [...(player.pendingEvents || []), scheduledEvent],
            logs: [{ week: player.currentWeek, year: player.age, message: `🎲 DEV TRIGGER: FORCED LIFE EVENT!`, type: 'neutral' }, ...player.logs]
        });
        setActiveCheatMenu('NONE');
    } else {
        alert("Failed to generate a valid life event for your current stats. Try increasing Fame/Heat.");
    }
  };

  const queueEventQaCase = (caseType: 'SIMPLE_FEEDBACK' | 'BROKEN_IMPACT' | 'MISSING_STORY' | 'MISSING_PROJECT') => {
      if (!onUpdatePlayer) return;

      const now = Date.now();
      let scheduledEvent: ScheduledEvent;
      let logMessage = '';

      if (caseType === 'MISSING_PROJECT') {
          scheduledEvent = {
              id: `qa_missing_project_${now}`,
              week: player.currentWeek,
              type: 'PRODUCTION_CRISIS',
              title: 'QA Missing Project Recovery',
              description: 'This QA event points to a project that does not exist.',
              data: {
                  crisisId: `qa_missing_project_crisis_${now}`,
                  projectId: `missing_project_${now}`,
                  isGenerative: true,
                  options: [{ label: 'Continue Safely', index: 0 }]
              }
          };
          logMessage = '🧯 QA: Missing project recovery event queued.';
      } else if (caseType === 'MISSING_STORY') {
          scheduledEvent = {
              id: `qa_missing_story_${now}`,
              week: player.currentWeek,
              type: 'LIFE_EVENT',
              title: 'QA Missing Story Recovery',
              data: {}
          };
          logMessage = '🧯 QA: Missing story recovery event queued.';
      } else {
          const isBrokenImpact = caseType === 'BROKEN_IMPACT';
          const lifeEvent: LifeEvent = {
              id: `qa_feedback_${now}`,
              type: isBrokenImpact ? 'SCANDAL' : 'NETWORKING',
              title: isBrokenImpact ? 'QA Broken Impact Event' : 'QA Simple Feedback Event',
              description: isBrokenImpact
                  ? 'This event intentionally throws inside its impact function so fallback handling can be tested.'
                  : 'This is a clean, simple event that should show feedback and close like a normal story result.',
              options: [
                  {
                      label: isBrokenImpact ? 'Trigger Broken Impact' : 'Handle Simply',
                      description: isBrokenImpact ? 'Should fall back instead of freezing.' : 'Should show a simple feedback result.',
                      impact: (p: Player) => {
                          if (isBrokenImpact) {
                              throw new Error('QA broken impact test');
                          }
                          return {
                              updatedPlayer: {
                                  ...p,
                                  stats: {
                                      ...p.stats,
                                      reputation: Math.min(100, p.stats.reputation + 1)
                                  }
                              },
                              log: 'QA simple event resolved cleanly: +1 reputation.'
                          };
                      }
                  }
              ]
          };

          scheduledEvent = {
              id: lifeEvent.id,
              week: player.currentWeek,
              type: isBrokenImpact ? 'SCANDAL' : 'LIFE_EVENT',
              title: lifeEvent.title,
              data: { lifeEvent }
          };
          logMessage = isBrokenImpact
              ? '🧯 QA: Broken impact event queued.'
              : '✅ QA: Simple feedback event queued.';
      }

      onUpdatePlayer({
          ...player,
          pendingEvents: [...(player.pendingEvents || []), scheduledEvent],
          logs: [{ week: player.currentWeek, year: player.age, message: logMessage, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('Event QA case queued. Close this menu and resolve the popup.');
  };

  const triggerFirebaseDiagnostics = () => {
      const traceName = 'firebase_diagnostics';
      setCrashContext(player, {
          flow: 'firebase_diagnostics',
          source: 'dev_tools',
      });
      addBreadcrumb('firebase_diagnostics:button_pressed', {
          age: player.age,
          week: player.currentWeek,
      });
      trackGameEvent('diagnostics_triggered', {
          age: player.age,
          week: player.currentWeek,
      });
      startPerformanceTrace(traceName, { source: 'dev_tools' });
      window.setTimeout(() => {
          stopPerformanceTrace(traceName, { duration_ms: 180 });
      }, 180);
      recordNonFatal(new Error('Firebase diagnostics test non-fatal'), 'firebase_diagnostics_test', {
          age: player.age,
          week: player.currentWeek,
      });

      if (onUpdatePlayer) {
          onUpdatePlayer({
              ...player,
              logs: [
                  {
                      week: player.currentWeek,
                      year: player.age,
                      message: '🧪 Firebase diagnostics sent. Check Analytics, Crashlytics, and Performance on a native build.',
                      type: 'neutral' as const
                  },
                  ...player.logs
              ].slice(0, 50)
          });
      }
      setActiveCheatMenu('NONE');
      alert('Firebase diagnostics fired. On web this is a safe no-op; on Android/iOS it should appear in Firebase.');
  };

  const {
    triggerYoutubeBootstrap,
    triggerYoutubeOffers,
    triggerYoutubeRivalry,
    triggerYoutubeCooldownReset,
    triggerYoutubeMerchQa,
    triggerInstagramBootstrap,
    triggerInstagramReferralDM,
    triggerInstagramBrandDM,
    triggerInstagramCooldownReset,
    triggerInstagramUnlockComposer,
    triggerXBootstrap,
    triggerXDramaPost,
    triggerXSmallCreatorReset,
  } = createHomeSocialQaActions({
    player,
    onUpdatePlayer,
    closeMenu: () => setActiveCheatMenu('NONE'),
  });
  const ensureCheatStudio = () => {
      const safeBusinesses = Array.isArray(player.businesses) ? player.businesses : [];
      const existingStudio = safeBusinesses.find(b => b.type === 'PRODUCTION_HOUSE');
      if (existingStudio) {
          const boostedStudio = {
              ...existingStudio,
              balance: Math.max(existingStudio.balance, 500000000),
              stats: {
                  ...existingStudio.stats,
                  valuation: Math.max(existingStudio.stats.valuation || 0, 750000000)
              }
          };

          return {
              updatedPlayer: {
                  ...player,
                  money: Math.max(player.money, 250000000),
                  businesses: safeBusinesses.map(b => b.id === existingStudio.id ? boostedStudio : b),
	                  logs: [{ week: player.currentWeek, year: player.age, message: `Studio funding prepared for ${boostedStudio.name}.`, type: 'positive' }, ...player.logs].slice(0, 50)
              },
              studio: boostedStudio
          };
      }

      const newStudio = createBusiness(
	          'Monarch Pictures',
          'PRODUCTION_HOUSE',
          'MAJOR_STUDIO',
          { quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH' },
	          'MP',
          player.currentWeek
      );

      const fundedStudio = {
          ...newStudio,
          balance: 500000000,
          stats: {
              ...newStudio.stats,
              valuation: 750000000
          }
      };

      return {
          updatedPlayer: {
              ...player,
              money: Math.max(player.money, 250000000),
              businesses: [...safeBusinesses, fundedStudio],
	              logs: [{ week: player.currentWeek, year: player.age, message: 'Monarch Pictures is ready for production.', type: 'positive' }, ...player.logs].slice(0, 50)
          },
          studio: fundedStudio
      };
  };

  const triggerStudioBootstrap = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer } = ensureCheatStudio();
      onUpdatePlayer(updatedPlayer);
      setActiveCheatMenu('NONE');
	      alert("Production house is ready.");
  };

  const triggerStudioBootstrapAndOpen = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer } = ensureCheatStudio();
      onUpdatePlayer(updatedPlayer);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
  };

  const triggerPlatformCommissionQa = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer, studio } = ensureCheatStudio();
      const fixture = createPlatformAiPlayerCommissionQaFixture({
          player: updatedPlayer,
          studioId: studio.id,
          absoluteWeek: getAbsoluteWeek(updatedPlayer.age, updatedPlayer.currentWeek),
      });
      if (!fixture.changed || !fixture.offer) {
          alert('Could not create the platform commission test offer.');
          return;
      }
      onUpdatePlayer(fixture.player);
      setActiveCheatMenu('NONE');
      onOpenPlatformCommissionCheat?.();
  };

  const triggerPlatformAiPhase4Qa = () => {
      if (!onUpdatePlayer) return;
      const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
      const updatedPlayer = buildPlatformAiPhase4QaFixture(player, absoluteWeek);
      const snapshot = getPlatformAiPhase4QaSnapshot(updatedPlayer, absoluteWeek);
      onUpdatePlayer(updatedPlayer);
      setActiveCheatMenu('NONE');
      alert([
          `Phase 4 rival: ${snapshot.platformId}`,
          `Research: ${snapshot.activeResearchPrograms}/${snapshot.researchCapacity} active; ${snapshot.affordableCandidateSlots} slot available`,
          `Markets: ${snapshot.activeCountries} active; ${snapshot.expandingCountries.join(', ') || 'expansion queued by AI when affordable'}`,
          `Languages: ${snapshot.subtitleOnlyLanguages.length} subtitle-only; ${snapshot.dubbingLanguages.length} dub-capable`,
          `Localization: ${snapshot.waitingLocalizationJobs} waiting; ${snapshot.readyLocalizationJobs} ready`,
          `Reach check: ${snapshot.comprehension.localizedReach.toFixed(2)} localized vs ${snapshot.comprehension.unlocalizedReach.toFixed(2)} unlocalized`,
      ].join('\n'));
  };

  const triggerEnergyFeatureCareerQa = (mode: 'FULL' | 'LOW') => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const qaPrefix = 'cheat_energy_';
      const energyQaProjectIdPrefixes = {
          prep: 'cheat_energy_prep_',
          production: 'cheat_energy_production_',
          post: 'cheat_energy_post_',
      } as const;
      const targetEnergy = mode === 'LOW' ? 6 : 100;
      const playerDisplayName = player.name || 'Player Star';

      const buildFocus = (overrides: Partial<PlayerProductionFocus> = {}): PlayerProductionFocus => ({
          isPlayerActor: true,
          isPlayerDirector: true,
          isPlayerProducer: true,
          actorPrep: 0,
          actorSceneRehearsal: 0,
          actorBigPerformance: 0,
          actorPerformance: 0,
          actorPromotion: 0,
          directorPrep: 0,
          directorShotDecision: 0,
          directorMajorCreativePush: 0,
          directorRiskyDecision: 0,
          directorPerformance: 0,
          directorPost: 0,
          producerScriptPolish: 0,
          producerCastCrewPrep: 0,
          producerSetQuality: 0,
          producerEditNotes: 0,
          producerReleasePositioning: 0,
          producerPrep: 0,
          producerPerformance: 0,
          producerPost: 0,
          qualityLift: 0,
          ...overrides,
      });

      const makeEnergyCommitment = (
          idSuffix: keyof typeof energyQaProjectIdPrefixes,
          phase: HomeProductionPhase,
          title: string,
          focusOverrides: Partial<PlayerProductionFocus>,
          weeksLeft: number,
          includePlayerActor = true
      ): Commitment => {
          const project = generateProjectDetails('HIGH', 'MOVIE', [], basePlayer);
          const focus = buildFocus({
              isPlayerActor: includePlayerActor,
              ...focusOverrides,
          });

          project.title = title;
          project.studioId = studio.id as any;
          project.genre = 'DRAMA';
          project.subtype = 'STANDALONE';
          project.estimatedBudget = 42_000_000;
          project.visibleHype = 'HIGH';
          project.visibleScriptBuzz = 'Hot';
          project.visibleDirectorTier = 'Self';
          project.visibleCastStrength = includePlayerActor ? 'Player Lead' : 'Hired Lead';
          project.directorName = playerDisplayName;
          project.directorId = 'PLAYER_SELF';
          project.director = { id: 'PLAYER_SELF', name: playerDisplayName };
          project.hiddenStats = {
              ...project.hiddenStats,
              scriptQuality: 72,
              directorQuality: 70,
              castingStrength: 68,
              rawHype: 66,
              qualityScore: 62,
          };
          project.playerProductionFocus = focus;
          project.castList = includePlayerActor
              ? [{
                  id: `${qaPrefix}cast_player_${idSuffix}_${now}`,
                  role: 'Lead',
                  roleId: 'lead',
                  roleName: 'Lead',
                  roleType: 'LEAD',
                  actorId: 'PLAYER_SELF',
                  name: playerDisplayName,
                  isPlayer: true,
                  image: player.avatar || '',
                  type: 'ACTOR',
                  status: 'CONFIRMED',
              }]
              : [{
                  id: `${qaPrefix}cast_hired_${idSuffix}_${now}`,
                  role: 'Lead',
                  roleId: 'lead',
                  roleName: 'Lead',
                  roleType: 'LEAD',
                  actorId: `${qaPrefix}hired_actor_${idSuffix}_${now}`,
                  name: 'Hired Lead',
                  isPlayer: false,
                  image: '',
                  type: 'ACTOR',
                  status: 'CONFIRMED',
              }];
          project.crewList = [{
              id: 'PLAYER_SELF',
              name: playerDisplayName,
              role: 'DIRECTOR',
              stats: { technical: 78, vision: 76 },
              salary: 0,
              status: 'SIGNED',
              tier: 'PROFESSIONAL',
              isPlayer: true,
          } as any];

          return {
              id: `${energyQaProjectIdPrefixes[idSuffix]}${now}`,
              name: title,
              type: 'JOB',
              roleType: includePlayerActor ? 'LEAD' : undefined,
              energyCost: 0,
              income: 0,
              lumpSum: 0,
              payoutType: 'LUMPSUM',
              projectPhase: phase,
              phaseWeeksLeft: weeksLeft,
              totalPhaseDuration: Math.max(1, weeksLeft),
              auditionPerformance: Number(focus.actorPrep || 0),
              productionPerformance: Number(focus.actorSceneRehearsal || focus.actorBigPerformance || 0),
              promotionalBuzz: 18,
              projectDetails: project,
          };
      };

      const energyCommitments = [
          makeEnergyCommitment(
              'prep',
              'PRE_PRODUCTION',
              'Energy QA: Prep Table',
              { actorPrep: 100, directorPrep: 42, producerScriptPolish: 60, producerCastCrewPrep: 20, qualityLift: 5 },
              3,
              true
          ),
          makeEnergyCommitment(
              'production',
              'PRODUCTION',
              'Energy QA: On-Set Pressure',
              { actorSceneRehearsal: 35, actorBigPerformance: 0, directorShotDecision: 100, directorMajorCreativePush: 25, directorRiskyDecision: 0, producerSetQuality: 45, qualityLift: 7 },
              2,
              true
          ),
          makeEnergyCommitment(
              'post',
              'POST_PRODUCTION',
              'Energy QA: Final Cut',
              { isPlayerActor: false, directorPost: 35, producerEditNotes: 100, producerReleasePositioning: 0, qualityLift: 9 },
              1,
              false
          ),
      ];

      const nextPlayer: Player = {
          ...basePlayer,
          energy: {
              ...basePlayer.energy,
              current: targetEnergy,
              max: Math.max(basePlayer.energy?.max || 100, targetEnergy),
          },
          flags: {
              ...(basePlayer.flags || {}),
              weeklyBaseEnergyRemaining: targetEnergy,
              bonusEnergyBank: 0,
          },
          commitments: [
              ...(basePlayer.commitments || []).filter(commitment => !String(commitment.id).startsWith(qaPrefix)),
              ...energyCommitments,
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: mode === 'LOW'
                  ? 'CHEAT: Energy Feature QA loaded. Available Energy should show 6E in Career.'
                  : 'CHEAT: Energy Feature QA loaded. Available Energy should show 100E in Career.',
              type: 'positive'
          }, ...(basePlayer.logs || [])].slice(0, 50),
      };

      onUpdatePlayer(nextPlayer);
      setActiveCheatMenu('NONE');
      setPage?.(Page.CAREER);
      alert(mode === 'LOW'
          ? 'Energy Feature QA loaded: Available Energy should show 6E in Career with Need XE disabled buttons.'
          : 'Energy Feature QA loaded: Available Energy should show 100E in Career with My Productions prep, on-set, and post actions.'
      );
  };

  const triggerOutsideProducerInvestmentQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer } = ensureCheatStudio();
      const now = Date.now();
      const currentAbsolute = getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek);
      const activeRelease = cheatWeekFromAbsolute(currentAbsolute + 4);
      const nearExitRelease = cheatWeekFromAbsolute(Math.max(1, currentAbsolute - 4));
      const scoutReport = {
          scriptQuality: 84,
          directorQuality: 78,
          castQuality: 82,
          budgetDiscipline: 74,
          marketFit: 86,
          buzz: 72,
          risk: 28,
          roiLowPct: -18,
          roiHighPct: 122
      };

      const offer: OutsideProducerInvestmentOffer = {
          id: `cheat_outside_offer_${now}`,
          projectId: `cheat_outside_offer_project_${now}`,
          projectTitle: 'Neon Harbor',
          producerName: 'Horizon Lantern',
          studioName: 'Horizon Lantern',
          producerType: 'Co-production Company',
          ownerName: 'Priya Senn',
          trackRecord: 81,
          genre: 'THRILLER',
          logline: 'A thriller package looking for outside producer money before cameras roll.',
          budget: 44_000_000,
          cashAsk: 6_600_000,
          offeredStakePercent: 18.5,
          maxStakePercent: 49,
          minCashAsk: 3_600_000,
          maxCashAsk: 11_800_000,
          flexible: true,
          finalTerms: false,
          acceptanceChance: 74,
          scoutReport,
          directorName: 'Leena Sato',
          castNames: ['Maya Stone', 'Omar Vale', 'Kai Brooks'],
          expectedReleaseWeeks: 9,
          expectedRunWeeks: 6,
          releasePath: 'THEATRICAL',
          counterAttempts: 0,
          maxCounterAttempts: 3,
          createdWeek: basePlayer.currentWeek,
          createdYear: basePlayer.age,
          expiresInWeeks: 6
      };

      const fraudOffer: OutsideProducerInvestmentOffer = {
          id: `cheat_outside_fraud_offer_${now}`,
          projectId: `cheat_outside_fraud_offer_project_${now}`,
          projectTitle: 'Paper Moon Protocol',
          producerName: 'Sable Meridian Capital',
          studioName: 'Sable Meridian',
          producerType: 'Private Finance',
          ownerName: 'Undisclosed sponsor group',
          trackRecord: 18,
          genre: 'CRIME',
          logline: 'A crime package with unusually generous economics, rushed closing, and a weak financing paper trail.',
          budget: 52_000_000,
          cashAsk: 3_900_000,
          offeredStakePercent: 31.5,
          maxStakePercent: 49,
          minCashAsk: 2_200_000,
          maxCashAsk: 8_600_000,
          flexible: true,
          finalTerms: false,
          acceptanceChance: 82,
          scoutReport: { ...scoutReport, risk: 36, roiLowPct: -60, roiHighPct: 210, budgetDiscipline: 58, buzz: 80 },
          directorName: 'Theo Vance',
          castNames: ['Jules Carter', 'Ava Quinn'],
          expectedReleaseWeeks: 10,
          expectedRunWeeks: 5,
          releasePath: 'STREAMING',
          counterAttempts: 0,
          maxCounterAttempts: 3,
          fraudRisk: 'HIGH',
          riskSignals: ['GENEROUS_TERMS', 'UNVERIFIED_FINANCING', 'SHELL_COMPANY', 'RUSHED_CLOSE'],
          financingStatus: 'UNVERIFIED_FINANCING',
          legalExposure: 84,
          createdWeek: basePlayer.currentWeek,
          createdYear: basePlayer.age,
          expiresInWeeks: 4
      };

      const activeInvestment: OutsideProductionInvestment = {
          id: `cheat_outside_active_${now}`,
          offerId: `cheat_outside_active_offer_${now}`,
          projectId: `cheat_outside_active_project_${now}`,
          projectTitle: 'Silver Signal',
          producerName: 'Blue Hour Film Fund',
          studioName: 'Blue Hour',
          producerType: 'Film Fund',
          ownerName: 'Tariq Sol',
          trackRecord: 73,
          genre: 'DRAMA',
          logline: 'A prestige drama with a strong director, clean budget discipline, and a realistic award-market lane.',
          budget: 38_000_000,
          investedAmount: 7_500_000,
          stakePercent: 24.5,
          status: 'FUNDED',
          scoutReport: { ...scoutReport, marketFit: 76, risk: 34, buzz: 62 },
          directorName: 'Nora Vale',
          castNames: ['Ava Quinn', 'Nico Reed'],
          releasePath: 'FESTIVAL',
          acceptedWeek: basePlayer.currentWeek,
          acceptedYear: basePlayer.age,
          releaseWeek: activeRelease.week,
          releaseYear: activeRelease.year,
          eventLog: ['CHEAT: Active outside production seeded for Bank and Production House QA.']
      };

      const nearExitInvestment: OutsideProductionInvestment = {
          id: `cheat_outside_exit_${now}`,
          offerId: `cheat_outside_exit_offer_${now}`,
          projectId: `cheat_outside_exit_project_${now}`,
          projectTitle: 'Glass Promise',
          producerName: 'Crownline Entertainment',
          studioName: 'Crownline',
          producerType: 'Commercial Studio',
          ownerName: 'Nadia Frost',
          trackRecord: 79,
          genre: 'ACTION',
          logline: 'A commercial action package already in release, close enough to settle next week.',
          budget: 30_000_000,
          investedAmount: 5_200_000,
          stakePercent: 22,
          status: 'RELEASED',
          scoutReport: { ...scoutReport, scriptQuality: 72, directorQuality: 76, castQuality: 80, marketFit: 88, buzz: 78, risk: 32 },
          directorName: 'Cole Mercer',
          castNames: ['Rian Fox', 'Lena Hart'],
          releasePath: 'THEATRICAL',
          acceptedWeek: Math.max(1, basePlayer.currentWeek - 2),
          acceptedYear: basePlayer.age,
          releaseWeek: nearExitRelease.week,
          releaseYear: nearExitRelease.year,
          eventLog: ['CHEAT: Near-exit outside production seeded. Age up once to test payout/result message.']
      };

      const fraudActiveInvestment: OutsideProductionInvestment = {
          id: `cheat_outside_fraud_active_${now}`,
          offerId: `cheat_outside_fraud_active_offer_${now}`,
          projectId: `cheat_outside_fraud_active_project_${now}`,
          projectTitle: 'Shell Game Weekend',
          producerName: 'Sable Meridian Capital',
          studioName: 'Sable Meridian',
          producerType: 'Private Finance',
          ownerName: 'Undisclosed sponsor group',
          trackRecord: 18,
          genre: 'CRIME',
          logline: 'A suspicious producer-finance package close to its verification fallout check.',
          budget: 48_000_000,
          investedAmount: 4_400_000,
          stakePercent: 34,
          status: 'FUNDED',
          scoutReport: { ...scoutReport, risk: 38, roiLowPct: -58, roiHighPct: 205, buzz: 76 },
          directorName: 'Arman Cross',
          castNames: ['Maya Stone', 'Nico Reed'],
          releasePath: 'STREAMING',
          acceptedWeek: basePlayer.currentWeek,
          acceptedYear: basePlayer.age,
          releaseWeek: activeRelease.week,
          releaseYear: activeRelease.year,
          fraudRisk: 'HIGH',
          riskSignals: ['GENEROUS_TERMS', 'UNVERIFIED_FINANCING', 'SHELL_COMPANY', 'RUSHED_CLOSE'],
          financingStatus: 'UNVERIFIED_FINANCING',
          legalExposure: 88,
          fraudFalloutAbsoluteWeek: currentAbsolute,
          eventLog: ['CHEAT: Fraud-risk outside production seeded. Age up once to test legal/fallout branch.']
      };

      const staleCheatIds = new Set(['cheat_outside_active', 'cheat_outside_exit', 'cheat_outside_fraud_active']);
      const nextFinanceHistory = [
          {
              id: `tx_cheat_outside_active_${now}`,
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              amount: -activeInvestment.investedAmount,
              category: 'BUSINESS' as const,
              description: `Producer investment: ${activeInvestment.projectTitle} (${activeInvestment.stakePercent}% share)`
          },
          {
              id: `tx_cheat_outside_exit_${now}`,
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              amount: -nearExitInvestment.investedAmount,
              category: 'BUSINESS' as const,
              description: `Producer investment: ${nearExitInvestment.projectTitle} (${nearExitInvestment.stakePercent}% share)`
          },
          {
              id: `tx_cheat_outside_fraud_active_${now}`,
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              amount: -fraudActiveInvestment.investedAmount,
              category: 'BUSINESS' as const,
              description: `Producer investment: ${fraudActiveInvestment.projectTitle} (${fraudActiveInvestment.stakePercent}% share)`
          },
          ...(basePlayer.finance?.history || []).filter(tx => !String(tx.id).startsWith('tx_cheat_outside_'))
      ].slice(0, 220);

      const seededPlayer: Player = {
          ...basePlayer,
          money: Math.max(basePlayer.money, 250_000_000) - activeInvestment.investedAmount - nearExitInvestment.investedAmount - fraudActiveInvestment.investedAmount,
          stats: {
              ...basePlayer.stats,
              fame: Math.max(basePlayer.stats.fame || 0, 72),
              reputation: Math.max(basePlayer.stats.reputation || 0, 68)
          },
          flags: {
              ...(basePlayer.flags || {}),
              lastOutsideProducerOfferWeek: Math.max(0, getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek) - 10)
          },
          inbox: [
              buildOutsideProducerInvestmentMessage(offer),
              buildOutsideProducerInvestmentMessage(fraudOffer),
              ...(basePlayer.inbox || []).filter(message =>
                  !String(message.id).startsWith('cheat_outside_offer_')
                  && !String(message.id).startsWith('cheat_outside_fraud_offer_')
                  && !String(message.id).startsWith('outside_result_cheat_outside_')
              )
          ].slice(0, 120),
          outsideProductions: [
              activeInvestment,
              nearExitInvestment,
              fraudActiveInvestment,
              ...(basePlayer.outsideProductions || []).filter(item => !Array.from(staleCheatIds).some(prefix => String(item.id).startsWith(prefix)))
          ].slice(0, 60),
          finance: {
              ...basePlayer.finance,
              history: nextFinanceHistory,
              yearly: basePlayer.finance?.yearly || [],
              loans: basePlayer.finance?.loans || [],
              credit: basePlayer.finance?.credit || { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 }
          },
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: 'CHEAT: Producer Investment QA seeded: clean offer, fraud-risk offer, live positions, and next-week payout/fallout tests.',
              type: 'positive'
          }, ...(basePlayer.logs || [])].slice(0, 50)
      };

      onUpdatePlayer(seededPlayer);
      setActiveCheatMenu('NONE');
      alert('Producer Investment QA ready: open Messages for clean + fraud-risk offers, Bank for ledger, Production House for positions, then Age Up once for settlement/fraud fallout.');
  };

  const {
    triggerBoxOfficeDepthQa,
    triggerBoxOfficeArchiveQa,
    triggerAudiencePulseQa,
    triggerSoundtrackRevenueQa,
  } = createHomeBoxOfficeQaActions({
    player,
    onUpdatePlayer,
    closeMenu: () => setActiveCheatMenu('NONE'),
    ensureCheatStudio,
    onOpenBoxOfficeCheat,
    setPage,
  });
  const {
    triggerStudioAcquisitionSigningCheat,
    triggerPrivateEquityQa,
    triggerVaultSortingQa,
    triggerFullStudioSlateQa,
    triggerLegacyProductionHouseMigrationQa,
  } = createHomeStudioOwnershipQaActions({
    player,
    onUpdatePlayer,
    closeMenu: () => setActiveCheatMenu('NONE'),
    ensureCheatStudio,
    onOpenProductionHouseCheat,
    onOpenStudioAcquisitionCheat,
  });
  const {
    triggerLowConditionRestQa,
    sanitizeProductionHouseReturnDealsQa,
    triggerReturningTalentNegotiationQa,
    triggerStudioScenario,
    triggerFilmographySortQa,
    triggerEpisodeRatingsQa,
    triggerEpisodeRatingsProductionHouseQa,
    triggerProductionRiskQa,
    triggerRareHollywoodChaosQa,
  } = createHomeStudioProductionQaActions({
    player,
    onUpdatePlayer,
    closeMenu: () => setActiveCheatMenu('NONE'),
    ensureCheatStudio,
    onOpenProductionHouseCheat,
    setPage,
  });
  const triggerStreamingRightsPhase8Qa = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const seededPlayer = buildStreamingRightsPhase8QaFixture(basePlayer, studio.id);
      const summary = getStreamingRightsPhase8QaSummary(seededPlayer, studio.id);
      onUpdatePlayer(seededPlayer);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert(`Rights Market A8 QA ready: ${summary.titleCount} titles, ${summary.contractCount} contracts, ${summary.renewalCount} renewal files, ${summary.protectedCount} protected decision, and ${summary.delegatedCount} delegated result.`);
  };
  const triggerFranchiseQaScenario = (scenario: 'HOT' | 'TIRED' | 'RECAST' | 'CANDIDATE') => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const franchiseId = `cheat_franchise_${scenario.toLowerCase()}_${now}`;
      const currentAge = Math.max(18, basePlayer.age);
      const primaryNpc = NPC_DATABASE.find(n => n.tier === 'A_LIST') || NPC_DATABASE[0];
      const secondNpc = NPC_DATABASE.find(n => n.id !== primaryNpc?.id && n.tier === 'A_LIST') || NPC_DATABASE[1] || primaryNpc;
      const thirdNpc = NPC_DATABASE.find(n => n.id !== primaryNpc?.id && n.id !== secondNpc?.id) || NPC_DATABASE[2] || primaryNpc;

      const buildCast = (title: string, characterName: string, actorOverride?: typeof primaryNpc) => {
          const coStar = actorOverride || primaryNpc;
          return [
              {
                  id: `cast_player_${title}`,
                  name: basePlayer.name,
                  actorName: basePlayer.name,
                  role: 'Lead',
                  roleType: 'LEAD',
                  isPlayer: true,
                  image: basePlayer.avatar,
                  type: 'ACTOR',
                  actorId: 'PLAYER_SELF',
                  characterId: `${franchiseId}_${characterName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
                  characterName
              },
              {
                  id: `cast_npc_${coStar?.id || 'a'}_${title}`,
                  name: coStar?.name || 'Zendaya',
                  actorName: coStar?.name || 'Zendaya',
                  role: 'Co-Star',
                  roleType: 'SUPPORTING',
                  isPlayer: false,
                  image: coStar?.avatar || getGenderedAvatar('FEMALE', 'Zendaya'),
                  type: 'ACTOR',
                  npcId: coStar?.id,
                  actorId: coStar?.id,
                  characterId: `${franchiseId}_rival`,
                  characterName: 'Cipher Vale'
              },
              {
                  id: `cast_npc_${thirdNpc?.id || 'b'}_${title}`,
                  name: thirdNpc?.name || 'Chris Evans',
                  actorName: thirdNpc?.name || 'Chris Evans',
                  role: 'Antagonist',
                  roleType: 'SUPPORTING',
                  isPlayer: false,
                  image: thirdNpc?.avatar || getGenderedAvatar('MALE', 'Chris Evans'),
                  type: 'ACTOR',
                  npcId: thirdNpc?.id,
                  actorId: thirdNpc?.id,
                  characterId: `${franchiseId}_villain`,
                  characterName: 'Director Knox'
              }
          ];
      };

      const makePastProject = (
          title: string,
          installmentNumber: number,
          ageOffset: number,
          gross: number,
          rating: number,
          characterName: string,
          actorOverride?: typeof primaryNpc
      ) => ({
          id: `cheat_franchise_project_${scenario}_${installmentNumber}_${now}`,
          name: title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, currentAge - ageOffset),
          earnings: Math.round(gross * 0.04),
          rating,
          reception: rating >= 8 ? 'Universal acclaim' : rating >= 6.6 ? 'Commercial hit' : 'Mixed audience reaction',
          projectQuality: Math.round(rating * 10),
          imdbRating: rating,
          boxOfficeResult: gross >= 500000000 ? 'BLOCKBUSTER' : gross >= 150000000 ? 'HIT' : 'MODEST',
          outcomeTier: gross >= 500000000 ? 'BLOCKBUSTER' : gross >= 150000000 ? 'HIT' : 'AVERAGE',
          subtype: 'BLOCKBUSTER',
          futurePotential: {
              sequelChance: rating >= 7 ? 90 : 55,
              franchiseChance: rating >= 7 ? 95 : 60,
              rebootChance: rating < 6 ? 75 : 25,
              renewalChance: 0,
              isFranchiseStarter: installmentNumber === 1,
              isSequelGreenlit: false,
              isRenewed: false,
              seriesStatus: 'N/A'
          },
          studioId: studio.id,
          castList: buildCast(title, characterName, actorOverride),
          reviews: [],
          budget: Math.round(gross * 0.32),
          gross,
          genre: 'SUPERHERO',
          description: `A major franchise chapter for ${title}.`,
          projectType: 'MOVIE',
          franchiseId: scenario === 'CANDIDATE' ? undefined : franchiseId,
          installmentNumber,
          directorId: 'cheat_director'
      } as any);

      const franchiseName =
          scenario === 'HOT' ? 'Neon Falcon' :
          scenario === 'TIRED' ? 'Shadow Circuit' :
          scenario === 'RECAST' ? 'Iron Monarch' :
          'Moon Runner';

      let qaProjects: any[] = [];
      if (scenario === 'CANDIDATE') {
          qaProjects = [
              makePastProject('Moon Runner', 1, 1, 780000000, 8.4, 'Luna Voss')
          ];
      } else if (scenario === 'TIRED') {
          qaProjects = [
              makePastProject('Shadow Circuit', 1, 5, 420000000, 8.0, 'Noah Shade'),
              makePastProject('Shadow Circuit 2', 2, 4, 510000000, 7.4, 'Noah Shade'),
              makePastProject('Shadow Circuit 3', 3, 3, 390000000, 6.6, 'Noah Shade'),
              makePastProject('Shadow Circuit 4', 4, 2, 260000000, 5.8, 'Noah Shade'),
              makePastProject('Shadow Circuit 5', 5, 1, 180000000, 5.2, 'Noah Shade')
          ];
      } else if (scenario === 'RECAST') {
          qaProjects = [
              makePastProject('Iron Monarch', 1, 4, 690000000, 8.2, 'Victor Steel', primaryNpc),
              makePastProject('Iron Monarch 2', 2, 3, 720000000, 8.0, 'Victor Steel', primaryNpc),
              makePastProject('Iron Monarch 3', 3, 1, 610000000, 7.1, 'Victor Steel', secondNpc)
          ];
      } else {
          qaProjects = [
              makePastProject('Neon Falcon', 1, 3, 640000000, 8.1, 'Kai Nova'),
              makePastProject('Neon Falcon 2', 2, 2, 890000000, 8.5, 'Kai Nova'),
              makePastProject('Neon Falcon 3', 3, 1, 940000000, 8.7, 'Kai Nova')
          ];
      }

      const nextPlayer = {
          ...basePlayer,
          pastProjects: [
              ...qaProjects,
              ...basePlayer.pastProjects.filter(p => !String(p.id).startsWith(`cheat_franchise_project_${scenario}_`))
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: `🎞️ ${franchiseName} franchise scenario prepared. Open Studio > Development Lab > Franchise.`,
              type: 'positive'
          }, ...basePlayer.logs].slice(0, 50)
      };

      onUpdatePlayer(nextPlayer);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert(`${franchiseName} is ready. Open Development Lab > Franchise for pulse, history, characters, and next-move shots.`);
  };

  const triggerUniverseQaScenario = (scenario: 'EVENT_READY' | 'FATIGUED' | 'MERCH') => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const universeId = `cheat_universe_${scenario.toLowerCase()}_${now}`;
      const universeName =
          scenario === 'EVENT_READY' ? 'Celestial Order' :
          scenario === 'FATIGUED' ? 'Dark Metroverse' :
          'Toybox Titans';
      const currentAge = Math.max(18, basePlayer.age);
      const actors = NPC_DATABASE.filter(n => n.occupation === 'ACTOR');
      const pickActor = (index: number) => actors[index % Math.max(actors.length, 1)] || NPC_DATABASE[index % NPC_DATABASE.length];
      const characterNames =
          scenario === 'FATIGUED'
              ? ['Night Judge', 'Signal Fox', 'Oracle Vane', 'Glass Saint']
              : scenario === 'MERCH'
                  ? ['Captain Plush', 'Laser Kid', 'Princess Pixel', 'Mecha Mutt']
                  : ['Nova King', 'Solar Wraith', 'Vega Storm', 'Atlas Prime'];

      const makeCast = (title: string, leadIndex: number) => characterNames.map((characterName, index) => {
          const actor = index === 0 ? null : pickActor(index + leadIndex);
          return {
              id: `cast_${universeId}_${index}_${title}`,
              name: index === 0 ? basePlayer.name : actor?.name || `NPC ${index}`,
              actorName: index === 0 ? basePlayer.name : actor?.name || `NPC ${index}`,
              role: index === 0 ? 'Lead' : index === 1 ? 'Co-Lead' : 'Supporting',
              roleType: index === 0 ? 'LEAD' : index === 1 ? 'SUPPORTING' : 'SUPPORTING',
              isPlayer: index === 0,
              image: index === 0 ? basePlayer.avatar : actor?.avatar || getGenderedAvatar(index % 2 === 0 ? 'FEMALE' : 'MALE', actor?.name || characterName),
              type: 'ACTOR',
              npcId: actor?.id,
              actorId: index === 0 ? 'PLAYER_SELF' : actor?.id,
              characterId: `${universeId}_${characterName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
              characterName
          };
      });

      const makeProject = (title: string, index: number, gross: number, rating: number, subtype: string, phase: string) => ({
          id: `cheat_universe_project_${scenario}_${index}_${now}`,
          name: title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, currentAge - (4 - index)),
          earnings: Math.round(gross * 0.035),
          rating,
          reception: rating >= 8 ? 'Fan event' : rating >= 6.8 ? 'Crowd pleaser' : 'Mixed canon reaction',
          projectQuality: Math.round(rating * 10),
          imdbRating: rating,
          boxOfficeResult: gross >= 500000000 ? 'BLOCKBUSTER' : gross >= 150000000 ? 'HIT' : 'MODEST',
          outcomeTier: gross >= 500000000 ? 'BLOCKBUSTER' : gross >= 150000000 ? 'HIT' : 'AVERAGE',
          subtype,
          futurePotential: {
              sequelChance: rating >= 7 ? 85 : 45,
              franchiseChance: rating >= 7 ? 90 : 50,
              rebootChance: rating < 6 ? 70 : 20,
              renewalChance: 0,
              isFranchiseStarter: index === 1,
              isSequelGreenlit: false,
              isRenewed: false,
              seriesStatus: 'N/A'
          },
          studioId: studio.id,
          castList: makeCast(title, index),
          reviews: [],
          budget: Math.round(gross * 0.3),
          gross,
          genre: 'SUPERHERO',
          description: `A connected universe chapter from ${universeName}.`,
          projectType: 'MOVIE',
          universeId,
          universeSagaName: 'Saga 1',
          universePhaseName: phase,
          directorId: 'cheat_universe_director'
      } as any);

      const projects = scenario === 'FATIGUED'
          ? [
              makeProject('Dark Metroverse: Dawn', 1, 480000000, 7.8, 'UNIVERSE_ENTRY', 'Phase 1'),
              makeProject('Dark Metroverse: Civil Night', 2, 520000000, 6.8, 'UNIVERSE_CROSSOVER', 'Phase 1'),
              makeProject('Dark Metroverse: Judgment', 3, 430000000, 5.9, 'UNIVERSE_EVENT', 'Phase 2'),
              makeProject('Dark Metroverse: Aftershock', 4, 290000000, 5.3, 'UNIVERSE_EVENT', 'Phase 2')
          ]
          : scenario === 'MERCH'
              ? [
                  makeProject('Toybox Titans', 1, 610000000, 8.1, 'UNIVERSE_ENTRY', 'Phase 1'),
                  makeProject('Toybox Titans: Playtime War', 2, 840000000, 8.4, 'UNIVERSE_EVENT', 'Phase 1')
              ]
              : [
                  makeProject('Celestial Order', 1, 720000000, 8.2, 'UNIVERSE_ENTRY', 'Phase 1'),
                  makeProject('Solar Wraith', 2, 540000000, 7.9, 'UNIVERSE_ENTRY', 'Phase 1'),
                  makeProject('Celestial Order: Eclipse', 3, 1050000000, 8.6, 'UNIVERSE_EVENT', 'Phase 2')
              ];

      const rosterMap = new Map<string, any>();
      projects.forEach(project => {
          project.castList.forEach((cast: any) => {
              const existing = rosterMap.get(cast.characterId);
              rosterMap.set(cast.characterId, {
                  id: cast.characterId,
                  characterId: cast.characterId,
                  name: cast.characterName,
                  actorId: cast.actorId,
                  actorName: cast.actorName,
                  status: existing && existing.actorId !== cast.actorId ? 'RECAST' : 'ACTIVE',
                  fanApproval: scenario === 'FATIGUED' ? 52 + rosterMap.size * 4 : 76 + rosterMap.size * 3,
                  appearances: (existing?.appearances || 0) + 1,
                  firstAppearanceTitle: existing?.firstAppearanceTitle || project.name,
                  latestAppearanceTitle: project.name,
                      description: `A fan-tracked character from ${universeName}.`
              });
          });
      });

      const products = scenario === 'MERCH'
          ? [
              { id: `cheat_merch_apparel_${now}`, catalogId: 'merch_apparel', name: 'Apparel & Fashion', quality: 85, productionCost: 500000, sellingPrice: 50000, appeal: 82, unitsSold: 300, inventory: 0, active: true },
              { id: `cheat_merch_toys_${now}`, catalogId: 'merch_toys', name: 'Action Figures & Toys', quality: 92, productionCost: 1000000, sellingPrice: 120000, appeal: 94, unitsSold: 900, inventory: 0, active: true },
              { id: `cheat_park_land_${now}`, catalogId: 'park_land', name: 'Themed Land (Park)', quality: 88, productionCost: 50000000, sellingPrice: 6000000, appeal: 96, unitsSold: 1200, inventory: 0, active: true }
          ]
          : [];

      const universe = {
          id: universeId,
          name: universeName,
          description: `A connected screen universe with multiple released chapters and active audience momentum.`,
          studioId: studio.id,
          currentPhase: scenario === 'FATIGUED' ? 'Phase 3' : 'Phase 2',
          currentPhaseName: scenario === 'FATIGUED' ? 'Phase 3' : 'Phase 2',
          saga: scenario === 'FATIGUED' ? 2 : 1,
          currentSagaName: scenario === 'FATIGUED' ? 'Saga 2' : 'Saga 1',
          momentum: scenario === 'FATIGUED' ? 42 : scenario === 'MERCH' ? 82 : 88,
          brandPower: scenario === 'FATIGUED' ? 58 : scenario === 'MERCH' ? 90 : 86,
          marketShare: 0,
          color: scenario === 'FATIGUED' ? '#7f1d1d' : scenario === 'MERCH' ? '#f59e0b' : '#22d3ee',
          roster: Array.from(rosterMap.values()),
          slate: [],
          products,
          stats: {
              weeklyRevenue: products.reduce((sum, product) => sum + product.sellingPrice, 0),
              lifetimeRevenue: scenario === 'MERCH' ? 248000000 : 0
          },
          weeksUntilNextPhase: scenario === 'FATIGUED' ? 18 : 64
      };

      const updatedStudio = { ...studio };
      const nextPlayer = {
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b),
          pastProjects: [
              ...projects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(`cheat_universe_project_${scenario}_`))
          ],
          world: {
              ...basePlayer.world,
              universes: {
                  ...(basePlayer.world?.universes || {}),
                  [universeId]: universe
              }
          },
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: `🌐 ${universeName} universe scenario prepared. Open Development Lab > Universe or IMDb > Universe.`,
              type: 'positive'
          }, ...basePlayer.logs].slice(0, 50)
      };

      onUpdatePlayer(nextPlayer as Player);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert(`${universeName} is ready. Open Development Lab > Universe or IMDb > Universe.`);
  };

  const triggerUniverseLifecycleQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);
      const currentAge = Math.max(18, basePlayer.age || 18);
      const qaPrefix = 'cheat_lifecycle_';
      const actors = NPC_DATABASE.filter(n => n.occupation === 'ACTOR');
      const pickActor = (index: number) => actors[index % Math.max(actors.length, 1)] || NPC_DATABASE[index % Math.max(NPC_DATABASE.length, 1)];
      const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const makeCast = (universeId: string, title: string, characters: string[]) => characters.map((characterName, index) => {
          const actor = index === 0 ? null : pickActor(index + 3);
          return {
              id: `${qaPrefix}cast_${slug(title)}_${index}_${now}`,
              name: index === 0 ? basePlayer.name : actor?.name || `QA Actor ${index}`,
              actorName: index === 0 ? basePlayer.name : actor?.name || `QA Actor ${index}`,
              role: index === 0 ? 'Lead' : index === 1 ? 'Co-Lead' : 'Supporting',
              roleType: index === 0 ? 'LEAD' : 'SUPPORTING',
              isPlayer: index === 0,
              image: index === 0 ? basePlayer.avatar : actor?.avatar || getGenderedAvatar(index % 2 === 0 ? 'FEMALE' : 'MALE', actor?.name || characterName),
              type: 'ACTOR',
              npcId: actor?.id,
              actorId: index === 0 ? 'PLAYER_SELF' : actor?.id,
              characterId: `${universeId}_${slug(characterName)}`,
              characterName
          };
      });

      const makeProject = (
          universeId: string,
          title: string,
          index: number,
          gross: number,
          rating: number,
          phase: string,
          characters: string[]
      ) => ({
          id: `${qaPrefix}project_${slug(title)}_${now}`,
          name: title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, currentAge - Math.max(0, 4 - index)),
          releaseYear: Math.max(16, currentAge - Math.max(0, 4 - index)),
          releaseWeek: Math.max(1, currentWeek - (index * 4)),
          earnings: Math.round(gross * 0.035),
          rating,
          reception: rating >= 8 ? 'Canon-defining hit' : rating >= 7 ? 'Strong franchise chapter' : 'Mixed archive chapter',
          projectQuality: Math.round(rating * 10),
          imdbRating: rating,
          boxOfficeResult: gross >= 500_000_000 ? 'BLOCKBUSTER' : gross >= 180_000_000 ? 'HIT' : 'MODEST',
          outcomeTier: gross >= 500_000_000 ? 'BLOCKBUSTER' : gross >= 180_000_000 ? 'HIT' : 'AVERAGE',
          subtype: index === 1 ? 'UNIVERSE_ENTRY' : 'UNIVERSE_EVENT',
          futurePotential: {
              sequelChance: rating >= 7 ? 80 : 35,
              franchiseChance: rating >= 7 ? 90 : 45,
              rebootChance: rating < 7 ? 72 : 18,
              renewalChance: 0,
              isFranchiseStarter: index === 1,
              isSequelGreenlit: false,
              isRenewed: false,
              seriesStatus: 'N/A'
          },
          studioId: studio.id,
          castList: makeCast(universeId, title, characters),
          reviews: [],
          budget: Math.round(gross * 0.32),
          gross,
          genre: 'SCI_FI',
          description: `A canon release from the ${title} era.`,
          projectType: 'MOVIE',
          universeId,
          universeSagaName: 'Saga 1',
          universePhaseName: phase,
          directorId: `${qaPrefix}director`
      } as any);

      const buildRoster = (projects: any[]) => {
          const rosterMap = new Map<string, any>();
          projects.forEach(project => {
              project.castList.forEach((cast: any) => {
                  const existing = rosterMap.get(cast.characterId);
                  rosterMap.set(cast.characterId, {
                      id: cast.characterId,
                      characterId: cast.characterId,
                      name: cast.characterName,
                      actorId: cast.actorId,
                      actorName: cast.actorName,
                      status: existing && existing.actorId !== cast.actorId ? 'RECAST' : 'ACTIVE',
                      fanApproval: Math.min(95, 76 + rosterMap.size * 4),
                      appearances: (existing?.appearances || 0) + 1,
                      firstAppearanceTitle: existing?.firstAppearanceTitle || project.name,
                      latestAppearanceTitle: project.name,
                      description: `A recurring universe character from ${project.name}.`
                  });
              });
          });
          return Array.from(rosterMap.values());
      };

      const makeUniverse = (
          universeId: string,
          name: string,
          description: string,
          projects: any[],
          color: string,
          momentum: number,
          brandPower: number,
          products: any[] = []
      ) => normalizeUniverseForSave({
          id: universeId,
          name,
          description,
          studioId: studio.id,
          currentPhase: 'PHASE_2_EXPANSION',
          currentPhaseName: 'Phase 2: Expansion',
          saga: 1,
          currentSagaName: 'Saga 1',
          momentum,
          brandPower,
          marketShare: 0,
          color,
          roster: buildRoster(projects),
          slate: projects.map(project => ({
              id: project.id,
              title: project.name,
              status: 'RELEASED',
              year: project.releaseYear || project.year,
              week: project.releaseWeek || 1
          })),
          products,
          stats: {
              weeklyRevenue: products.reduce((sum, product) => sum + product.sellingPrice, 0),
              lifetimeRevenue: projects.reduce((sum, project) => sum + (project.gross || 0), 0)
          },
          weeksUntilNextPhase: 28
      } as any, universeId);

      const activeUniverseId = `${qaPrefix}active_${now}`;
      const retiredUniverseId = `${qaPrefix}retired_${now}`;
      const rebootedUniverseId = `${qaPrefix}rebooted_${now}`;

      const activeProjects = [
          makeProject(activeUniverseId, 'Phoenix Circuit', 1, 640_000_000, 8.1, 'Phase 1', ['Vera Volt', 'Circuit King', 'Null Saint']),
          makeProject(activeUniverseId, 'Phoenix Circuit: Voltage War', 2, 720_000_000, 8.3, 'Phase 1', ['Vera Volt', 'Circuit King', 'Null Saint'])
      ];
      const retiredProjects = [
          makeProject(retiredUniverseId, 'Obsidian League', 1, 510_000_000, 7.6, 'Phase 1', ['Obsidian Knight', 'Glass Oracle', 'Metro Ghost']),
          makeProject(retiredUniverseId, 'Obsidian League: Last Signal', 2, 295_000_000, 6.4, 'Phase 2', ['Obsidian Knight', 'Glass Oracle', 'Metro Ghost'])
      ];
      const rebootedProjects = [
          makeProject(rebootedUniverseId, 'Silver Dominion', 1, 420_000_000, 7.2, 'Phase 1', ['Silver Queen', 'Crownbreaker', 'Mirror Duke']),
          makeProject(rebootedUniverseId, 'Silver Dominion: Fall', 2, 210_000_000, 6.1, 'Phase 2', ['Silver Queen', 'Crownbreaker', 'Mirror Duke'])
      ];

      const activeUniverse = makeUniverse(
          activeUniverseId,
          'Phoenix Circuit',
          'An active screen universe with enough history to show legacy management controls.',
          activeProjects,
          '#22d3ee',
          84,
          88
      );

      const retiredBaseUniverse = makeUniverse(
          retiredUniverseId,
          'Obsidian League',
          'A retired screen universe whose history stays visible while new phases are closed.',
          retiredProjects,
          '#a855f7',
          48,
          72,
          [
              { id: `${qaPrefix}legacy_apparel_${now}`, catalogId: 'merch_apparel', name: 'Legacy Apparel', quality: 78, productionCost: 450_000, sellingPrice: 40_000, appeal: 62, unitsSold: 160, inventory: 0, active: true },
              { id: `${qaPrefix}legacy_collectibles_${now}`, catalogId: 'merch_toys', name: 'Archive Collectibles', quality: 82, productionCost: 700_000, sellingPrice: 85_000, appeal: 66, unitsSold: 220, inventory: 0, active: true }
          ]
      );
      const retiredUniverse = retireUniverseForArchive(retiredBaseUniverse, Math.max(18, currentAge - 1), 32);

      const rebootedBaseUniverse = retireUniverseForArchive(
          makeUniverse(
              rebootedUniverseId,
              'Silver Dominion',
              'A rebooted screen universe entering a new era while its older releases remain archived.',
              rebootedProjects,
              '#f59e0b',
              36,
              65
          ),
          Math.max(18, currentAge - 2),
          14
      );
      const rebooted = rebootRetiredUniverse(rebootedBaseUniverse, 'Silver Dominion: Reborn', 'SCI_FI', currentAge, currentWeek);

      const qaScripts = [rebooted.script];
      const qaUniverses = [activeUniverse, retiredUniverse, rebooted.universe];
      const existingWorldUniverses = Object.fromEntries(
          Object.entries(basePlayer.world?.universes || {}).filter(([id]) => !id.startsWith(qaPrefix))
      ) as Record<UniverseId, any>;
      const existingStudioUniverses = ((studio.studioState as any)?.universes || []).filter((universe: any) => !String(universe.id).startsWith(qaPrefix));
      const existingScripts = (studio.studioState?.scripts || []).filter((script: Script) => !String(script.id).startsWith(`${qaPrefix}script_`) && !String(script.id).startsWith('script_universe_reboot_'));

      const updatedStudio = {
          ...studio,
          studioState: {
              ...(studio.studioState || {}),
              scripts: [...qaScripts, ...existingScripts],
              concepts: studio.studioState?.concepts || [],
              writers: studio.studioState?.writers || [],
              ipMarket: studio.studioState?.ipMarket || [],
              lastMarketRefreshWeek: studio.studioState?.lastMarketRefreshWeek || currentWeek,
              lastWriterRefreshWeek: studio.studioState?.lastWriterRefreshWeek || currentWeek,
              universes: [...qaUniverses, ...existingStudioUniverses]
          } as any
      };

      onUpdatePlayer({
          ...basePlayer,
          businesses: (basePlayer.businesses || []).map(b => b.id === studio.id ? updatedStudio : b),
          pastProjects: [
              ...activeProjects,
              ...retiredProjects,
              ...rebootedProjects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(`${qaPrefix}project_`))
          ],
          world: {
              ...basePlayer.world,
              universes: {
                  ...existingWorldUniverses,
                  [activeUniverse.id]: activeUniverse,
                  [retiredUniverse.id]: retiredUniverse,
                  [rebooted.universe.id]: rebooted.universe
              }
          },
          newsItems: [
              {
                  id: `${qaPrefix}news_retired_${now}`,
                  headline: 'Obsidian League enters the legacy archive.',
                  subtext: 'The canon history remains public, but new phases are closed until a reboot relaunches the brand.',
                  category: 'UNIVERSE',
                  week: currentWeek,
                  year: currentAge,
                  impactLevel: 'MEDIUM'
              },
              {
                  id: `${qaPrefix}news_reboot_${now}`,
                  headline: 'Silver Dominion gets a reboot era.',
                  subtext: 'A new Reboot Era script is now in development while older releases remain part of the archive.',
                  category: 'UNIVERSE',
                  week: currentWeek,
                  year: currentAge,
                  impactLevel: 'HIGH'
              },
              ...(basePlayer.newsItems || []).filter(item => !String(item.id).startsWith(`${qaPrefix}news_`))
          ],
          logs: [{
              week: currentWeek,
              year: currentAge,
              message: '🌐 Universe lifecycle showcase prepared with Active Canon, Legacy Archive, and Reboot Era.',
              type: 'positive'
          }, ...basePlayer.logs].slice(0, 50)
      } as Player);

      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert('Universe lifecycle showcase is ready. Open Development Lab > Universe: Phoenix Circuit is active, Obsidian League is archived, and Silver Dominion has a reboot script in Vault.');
  };

  const triggerCanonStoryQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const qaActors = NPC_DATABASE
          .filter(npc => npc.occupation === 'ACTOR')
          .map(npc => ({
              id: npc.id,
              name: npc.name,
              avatar: npc.avatar,
              talent: Number((npc as any).stats?.talent || (npc as any).talent || 75),
              fame: Number((npc as any).stats?.fame || (npc as any).fame || (npc.tier === 'A_LIST' ? 88 : 28)),
          }));
      const nextPlayer = buildCanonStoryQaFixture(basePlayer, studio, qaActors);

      onUpdatePlayer(nextPlayer);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert('Canon Cast + News Kit is ready. Test Development Lab > Franchise/Universe, open the Fracture Protocol script in Greenlight, then Age Up once and check News + X.');
  };

  const triggerLegacyCharacterPickerQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);
      const currentAge = Math.max(18, basePlayer.age || 18);
      const qaPrefix = 'cheat_legacy_picker_';
      const actors = NPC_DATABASE.filter(n => n.occupation === 'ACTOR');
      const pickActor = (index: number) => actors[index % Math.max(actors.length, 1)] || NPC_DATABASE[index % Math.max(NPC_DATABASE.length, 1)];
      const makeCharacter = (id: string, name: string, actorIndex: number, fanApproval = 72) => {
          const actor = pickActor(actorIndex);
          return {
              id,
              characterId: id,
              name,
              actorId: actor?.id || 'UNKNOWN',
              actorName: actor?.name || 'Unknown Actor',
              status: 'ACTIVE' as const,
              fanApproval,
              appearances: 2,
              firstAppearanceTitle: `${name}: Origins`,
              latestAppearanceTitle: `${name}: Legacy`,
              description: `Legacy picker QA character: ${name}.`
          };
      };

      const activeUniverseId = `${qaPrefix}active_${now}`;
      const retiredUniverseId = `${qaPrefix}retired_${now}`;
      const activeUniverse = normalizeUniverseForSave({
          id: activeUniverseId,
          name: 'Aurora Guard',
          description: 'Legacy picker QA active universe. This roster should appear before the Legacy toggle.',
          studioId: studio.id,
          currentPhase: 'PHASE_2_EXPANSION',
          currentPhaseName: 'Phase 2: Expansion',
          saga: 1,
          currentSagaName: 'Saga 1',
          momentum: 81,
          brandPower: 84,
          marketShare: 6,
          color: '#22d3ee',
          roster: [
              makeCharacter('aurora_guard_nova_warden', 'Nova Warden', 1, 86),
              makeCharacter('aurora_guard_solar_vex', 'Solar Vex', 2, 78),
              makeCharacter('aurora_guard_lumen_saint', 'Lumen Saint', 3, 74)
          ],
          slate: [
              { id: `${qaPrefix}active_origin_${now}`, title: 'Aurora Guard', status: 'RELEASED', year: currentAge - 1, week: 12 }
          ],
          stats: { weeklyRevenue: 1_200_000, lifetimeRevenue: 640_000_000 },
          weeksUntilNextPhase: 18
      } as any, activeUniverseId);

      const retiredBaseUniverse = normalizeUniverseForSave({
          id: retiredUniverseId,
          name: 'Obsidian League',
          description: 'Legacy picker QA retired universe. These names should stay hidden until the Legacy toggle is enabled.',
          studioId: studio.id,
          currentPhase: 'PHASE_3_WAR',
          currentPhaseName: 'Phase 3: War',
          saga: 2,
          currentSagaName: 'Saga 2',
          momentum: 31,
          brandPower: 69,
          marketShare: 4,
          color: '#a855f7',
          roster: [
              makeCharacter('obsidian_league_midnight_lion', 'Midnight Lion', 4, 91),
              makeCharacter('obsidian_league_glass_oracle', 'Glass Oracle', 5, 83),
              makeCharacter('obsidian_league_metro_ghost', 'Metro Ghost', 6, 77)
          ],
          slate: [
              { id: `${qaPrefix}retired_origin_${now}`, title: 'Obsidian League', status: 'RELEASED', year: currentAge - 4, week: 20 },
              { id: `${qaPrefix}retired_finale_${now}`, title: 'Obsidian League: Last Signal', status: 'RELEASED', year: currentAge - 2, week: 31 }
          ],
          stats: { weeklyRevenue: 220_000, lifetimeRevenue: 805_000_000 },
          weeksUntilNextPhase: 52
      } as any, retiredUniverseId);
      const retiredUniverse = retireUniverseForArchive(retiredBaseUniverse, Math.max(18, currentAge - 1), 32);

      const readyScript: Script = {
          id: `${qaPrefix}script_${now}`,
          title: 'Aurora Guard: Archive Signal',
          logline: 'The Aurora Guard investigate a signal that seems to come from a retired rival universe.',
          projectType: 'MOVIE',
          genres: ['SCI_FI'],
          quality: 87,
          status: 'READY',
          writerId: 'cheat_legacy_picker_writer',
          author: 'Cheat Writers Room',
          weeksInDevelopment: 6,
          totalDevelopmentWeeks: 6,
          isOriginal: false,
          options: [],
          sourceMaterial: 'SPINOFF',
          universeId: activeUniverseId,
          universeSagaName: 'Saga 1',
          universePhaseName: 'Phase 2',
          connectedProjectIntent: 'EVENT',
          tags: ['LEGACY_CHARACTER_PICKER_QA', 'UNIVERSE_EVENT']
      };

      const existingWorldUniverses = Object.fromEntries(
          Object.entries(basePlayer.world?.universes || {}).filter(([id]) => !id.startsWith(qaPrefix))
      ) as Record<UniverseId, any>;
      const existingStudioUniverses = ((studio.studioState as any)?.universes || []).filter((universe: any) => !String(universe.id).startsWith(qaPrefix));
      const existingScripts = (studio.studioState?.scripts || []).filter((script: Script) => !String(script.id).startsWith(`${qaPrefix}script_`));
      const updatedStudio = {
          ...studio,
          studioState: {
              ...(studio.studioState || {}),
              scripts: [readyScript, ...existingScripts],
              concepts: (studio.studioState?.concepts || []).filter((concept: any) => !String(concept.scriptId || '').startsWith(`${qaPrefix}script_`)),
              writers: studio.studioState?.writers || [],
              ipMarket: studio.studioState?.ipMarket || [],
              lastMarketRefreshWeek: studio.studioState?.lastMarketRefreshWeek || currentWeek,
              lastWriterRefreshWeek: studio.studioState?.lastWriterRefreshWeek || currentWeek,
              universes: [activeUniverse, retiredUniverse, ...existingStudioUniverses]
          } as any
      };

      onUpdatePlayer({
          ...basePlayer,
          businesses: (basePlayer.businesses || []).map(b => b.id === studio.id ? updatedStudio : b),
          world: {
              ...basePlayer.world,
              universes: {
                  ...existingWorldUniverses,
                  [activeUniverse.id]: activeUniverse,
                  [retiredUniverse.id]: retiredUniverse
              }
          },
          newsItems: [
              {
                  id: `${qaPrefix}news_${now}`,
                  headline: 'Legacy character picker QA is staged.',
                  subtext: 'Aurora Guard is active, Obsidian League is archived, and the Greenlight character selector should only show Obsidian names after tapping Legacy.',
                  category: 'UNIVERSE',
                  week: currentWeek,
                  year: currentAge,
                  impactLevel: 'MEDIUM'
              },
              ...(basePlayer.newsItems || []).filter(item => !String(item.id).startsWith(`${qaPrefix}news_`))
          ],
          logs: [{
              week: currentWeek,
              year: currentAge,
              message: '🌐 CHEAT: Legacy Character Picker QA loaded. Greenlight Aurora Guard: Archive Signal and test the Legacy toggle.',
              type: 'positive'
          }, ...basePlayer.logs].slice(0, 50)
      } as Player);

      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert('Legacy Character Picker QA loaded. Open Development Lab > Vault, greenlight "Aurora Guard: Archive Signal", then Cast: Obsidian names should appear only after tapping Legacy.');
  };

  const triggerUniverseNamingFlowCheat = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const franchiseId = `cheat_name_franchise_${now}`;
      const universeId = `cheat_name_universe_${now}`;
      const primaryNpc = NPC_DATABASE.find(n => n.tier === 'A_LIST') || NPC_DATABASE[0];
      const secondNpc = NPC_DATABASE.find(n => n.id !== primaryNpc?.id && n.tier === 'A_LIST') || NPC_DATABASE[1] || primaryNpc;
      const thirdNpc = NPC_DATABASE.find(n => n.id !== primaryNpc?.id && n.id !== secondNpc?.id) || NPC_DATABASE[2] || primaryNpc;
      const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

      const duneCast = [
          {
              id: `cast_paul_${now}`,
              name: primaryNpc?.name || 'Timothee Chalamet',
              actorName: primaryNpc?.name || 'Timothee Chalamet',
              role: 'Lead',
              roleType: 'LEAD',
              actorId: primaryNpc?.id || 'cheat_actor_paul',
              npcId: primaryNpc?.id,
              image: primaryNpc?.avatar || getGenderedAvatar('MALE', 'Paul Atreides'),
              type: 'ACTOR',
              characterId: slug('Paul Atreides'),
              characterName: 'Paul Atreides',
              sourceUniverseId: universeId,
              salary: 12_000_000
          },
          {
              id: `cast_chani_${now}`,
              name: secondNpc?.name || 'Zendaya',
              actorName: secondNpc?.name || 'Zendaya',
              role: 'Co-Lead',
              roleType: 'SUPPORTING',
              actorId: secondNpc?.id || 'cheat_actor_chani',
              npcId: secondNpc?.id,
              image: secondNpc?.avatar || getGenderedAvatar('FEMALE', 'Chani'),
              type: 'ACTOR',
              characterId: slug('Chani'),
              characterName: 'Chani',
              sourceUniverseId: universeId,
              salary: 8_500_000
          },
          {
              id: `cast_feyd_${now}`,
              name: thirdNpc?.name || 'Austin Butler',
              actorName: thirdNpc?.name || 'Austin Butler',
              role: 'Antagonist',
              roleType: 'SUPPORTING',
              actorId: thirdNpc?.id || 'cheat_actor_feyd',
              npcId: thirdNpc?.id,
              image: thirdNpc?.avatar || getGenderedAvatar('MALE', 'Feyd-Rautha'),
              type: 'ACTOR',
              characterId: slug('Feyd Rautha'),
              characterName: 'Feyd-Rautha',
              sourceUniverseId: universeId,
              salary: 6_000_000
          }
      ];

      const makePastProject = (title: string, installmentNumber: number, yearOffset: number, gross: number, rating: number) => ({
          id: `cheat_name_dune_${installmentNumber}_${now}`,
          name: title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, basePlayer.age - yearOffset),
          earnings: Math.round(gross * 0.035),
          rating,
          reception: 'Fan event',
          projectQuality: Math.round(rating * 10),
          imdbRating: rating,
          boxOfficeResult: gross >= 500000000 ? 'BLOCKBUSTER' : 'HIT',
          outcomeTier: gross >= 500000000 ? 'BLOCKBUSTER' : 'HIT',
          subtype: installmentNumber === 1 ? 'UNIVERSE_ENTRY' : 'SEQUEL',
          futurePotential: {
              sequelChance: 94,
              franchiseChance: 96,
              rebootChance: 12,
              renewalChance: 0,
              isFranchiseStarter: installmentNumber === 1,
              isSequelGreenlit: false,
              isRenewed: false,
              seriesStatus: 'N/A'
          },
          studioId: studio.id,
          castList: duneCast,
          reviews: [],
          budget: Math.round(gross * 0.28),
          gross,
          genre: 'SCI_FI',
          description: `Cheat naming-flow release for ${title}.`,
          projectType: 'MOVIE',
          franchiseId,
          universeId,
          universeSagaName: 'Saga 1',
          universePhaseName: 'Phase 1',
          installmentNumber,
          directorId: 'cheat_name_director'
      } as any);

      const pastProjects = [
          makePastProject('Dune', 1, 3, 520_000_000, 8.2),
          makePastProject('Dune: Part Two', 2, 1, 720_000_000, 8.7)
      ];

      const returningTalent = duneCast.map(cast => ({
          role: cast.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR',
          id: cast.actorId,
          originalSalary: cast.salary,
          newDemand: Math.floor(cast.salary * 1.2),
          negotiated: false,
          accepted: false,
          attemptsLeft: 3,
          characterId: cast.characterId,
          characterName: cast.characterName,
          sourceUniverseId: universeId
      }));

      const scripts = [
          {
              id: `cheat_name_script_standalone_${now}`,
              title: 'Midnight Courier',
              logline: 'A courier discovers a citywide conspiracy during one impossible night.',
              projectType: 'MOVIE',
              genres: ['THRILLER'],
              quality: 82,
              status: 'READY',
              writerId: 'cheat_writer',
              author: 'Cheat Writers Room',
              weeksInDevelopment: 4,
              totalDevelopmentWeeks: 4,
              isOriginal: true,
              options: [],
              connectedProjectIntent: 'SOLO',
              tags: ['NAMING_QA', 'STANDALONE']
          },
          {
              id: `cheat_name_script_franchise_${now}`,
              title: 'Dune: Part Three',
              logline: 'The next chapter of House Atreides tests loyalty, prophecy, and the cost of empire.',
              projectType: 'MOVIE',
              genres: ['SCI_FI'],
              quality: 86,
              status: 'READY',
              writerId: 'cheat_writer',
              author: 'Cheat Writers Room',
              weeksInDevelopment: 6,
              totalDevelopmentWeeks: 6,
              isOriginal: false,
              options: [],
              sourceMaterial: 'SEQUEL',
              franchiseId,
              universeId,
              installmentNumber: 3,
              returningTalent,
              connectedProjectIntent: 'SOLO',
              tags: ['NAMING_QA', 'FRANCHISE']
          },
          {
              id: `cheat_name_script_universe_${now}`,
              title: 'Arrakis Saga: Event 1',
              logline: 'Paul, Chani, and Feyd-Rautha collide in a high-stakes crossover for the Arrakis Saga.',
              projectType: 'MOVIE',
              genres: ['SCI_FI'],
              quality: 88,
              status: 'READY',
              writerId: 'cheat_writer',
              author: 'Cheat Writers Room',
              weeksInDevelopment: 6,
              totalDevelopmentWeeks: 6,
              isOriginal: false,
              options: [],
              sourceMaterial: 'SPINOFF',
              franchiseId,
              universeId,
              universeSagaName: 'Saga 1',
              universePhaseName: 'Phase 2',
              returningTalent,
              connectedProjectIntent: 'EVENT',
              tags: ['NAMING_QA', 'UNIVERSE_EVENT']
          }
      ];

      const universe = normalizeUniverseForSave({
          id: universeId,
          name: 'Arrakis Saga',
          description: 'Cheat naming-flow universe for testing saga, phase, roster, sequel, and event naming.',
          studioId: studio.id,
          currentPhase: 'Phase 2',
          currentPhaseName: 'Phase 2',
          saga: 1,
          currentSagaName: 'Saga 1',
          momentum: 86,
          brandPower: 88,
          marketShare: 0,
          color: '#d97706',
          roster: duneCast.map(cast => ({
              id: cast.characterId,
              characterId: cast.characterId,
              name: cast.characterName,
              actorId: cast.actorId,
              actorName: cast.actorName,
              status: 'ACTIVE',
              fanApproval: cast.roleType === 'LEAD' ? 91 : 84,
              appearances: 2,
              firstAppearanceTitle: 'Dune',
              latestAppearanceTitle: 'Dune: Part Two',
              description: `Cheat naming-flow character: ${cast.characterName}.`
          })),
          slate: [],
          products: [],
          stats: { weeklyRevenue: 0, lifetimeRevenue: 0 },
          weeksUntilNextPhase: 48
      }, universeId);

      const updatedStudio = {
          ...studio,
          studioState: {
              ...(studio.studioState || {}),
              scripts: [
                  ...scripts,
                  ...(studio.studioState?.scripts || []).filter((script: any) => !String(script.id).startsWith('cheat_name_script_'))
              ],
              concepts: (studio.studioState?.concepts || []).filter((concept: any) => !String(concept.scriptId || '').startsWith('cheat_name_script_')),
              purchasedIPTitles: studio.studioState?.purchasedIPTitles || [],
              ipMarket: studio.studioState?.ipMarket || [],
              writers: studio.studioState?.writers || []
          }
      };

      const nextPlayer = {
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b),
          pastProjects: [
              ...pastProjects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith('cheat_name_dune_'))
          ],
          world: {
              ...basePlayer.world,
              universes: {
                  ...(basePlayer.world?.universes || {}),
                  [universeId]: universe
              }
          },
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: '🧪 CHEAT: Universe naming flow kit added. Test Standalone, Dune sequel, and Arrakis event scripts in Development Lab.',
              type: 'positive'
          }, ...basePlayer.logs].slice(0, 50)
      };

      onUpdatePlayer(nextPlayer as Player);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
      alert('Naming flow QA kit loaded: Standalone, Dune sequel, and Arrakis universe event scripts are ready in Development Lab.');
  };

  const addLegacyTestChild = () => {
      if (!onUpdatePlayer) return;

      const existingChildCount = player.relationships.filter(rel => rel.relation === 'Child').length;
      const childIndex = existingChildCount + 1;
      const childName = childIndex % 2 === 0 ? `Mia ${childIndex}` : `Leo ${childIndex}`;
      const childGender = childIndex % 2 === 0 ? 'FEMALE' : 'MALE';
      const childBirthAbsolute = getAbsoluteWeek(player.age, player.currentWeek);

      const newChild: Relationship = {
          id: `cheat_child_${Date.now()}`,
          name: childName,
          relation: 'Child',
          closeness: 100,
          image: getGenderedAvatar(childGender, childName),
          lastInteractionWeek: player.currentWeek,
          lastInteractionAbsolute: childBirthAbsolute,
          age: 0,
          gender: childGender,
          birthWeekAbsolute: childBirthAbsolute
      };

      onUpdatePlayer({
          ...player,
          relationships: [...player.relationships, newChild],
          logs: [{ week: player.currentWeek, year: player.age, message: `👶 CHEAT: ${childName} was added as a test child.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      alert(`Legacy test child "${childName}" added. Open Connections > Legacy.`);
  };

  const ageOldestChildToPlayable = () => {
      if (!onUpdatePlayer) return;

      const children = player.relationships.filter(rel => rel.relation === 'Child');
      if (children.length === 0) {
          alert("You need a child first. Use 'Add Test Child'.");
          return;
      }

      const oldestChild = [...children].sort((a, b) => (a.birthWeekAbsolute || 0) - (b.birthWeekAbsolute || 0))[0];
      const updatedRelationships = player.relationships.map(rel => {
          if (rel.id !== oldestChild.id) return rel;
          return {
              ...rel,
              age: 18,
              birthWeekAbsolute: Math.max(0, getAbsoluteWeek(player.age, player.currentWeek) - (18 * 52)),
              lastInteractionWeek: player.currentWeek,
              lastInteractionAbsolute: getAbsoluteWeek(player.age, player.currentWeek)
          };
      });

      onUpdatePlayer({
          ...player,
          relationships: updatedRelationships,
          logs: [{ week: player.currentWeek, year: player.age, message: `🧬 CHEAT: ${oldestChild.name} is now 18 and ready for legacy testing.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      alert(`${oldestChild.name} is now 18. You can test Continue as Child.`);
  };

  const setupLegacyDeathScenario = () => {
      if (!onUpdatePlayer) return;

      const hasChild = player.relationships.some(rel => rel.relation === 'Child');
      const nextAbsolute = getAbsoluteWeek(72, 50);

      const updatedRelationships = hasChild
          ? player.relationships.map(rel => {
                if (rel.relation !== 'Child') return rel;
                return {
                    ...rel,
                    age: Math.max(rel.age || 0, 18),
                    birthWeekAbsolute: typeof rel.birthWeekAbsolute === 'number'
                        ? Math.min(rel.birthWeekAbsolute, nextAbsolute - (18 * 52))
                        : Math.max(0, nextAbsolute - (18 * 52)),
                };
            })
          : [
                ...player.relationships,
                {
                    id: `cheat_child_${Date.now()}`,
                    name: 'Legacy Heir',
                    relation: 'Child',
                    closeness: 100,
                    image: getGenderedAvatar('MALE', 'Legacy Heir'),
                    lastInteractionWeek: 50,
                    lastInteractionAbsolute: nextAbsolute,
                    age: 18,
                    gender: 'MALE',
                    birthWeekAbsolute: Math.max(0, nextAbsolute - (18 * 52))
                } as Relationship
            ];

      onUpdatePlayer({
          ...player,
          age: 72,
          currentWeek: 50,
          stats: {
              ...player.stats,
              health: 5,
              happiness: Math.min(player.stats.happiness, 15)
          },
          relationships: updatedRelationships,
          logs: [{ week: 50, year: 72, message: `☠️ CHEAT: Legacy death scenario prepared. Age up a few weeks to test death and heir selection.`, type: 'negative' }, ...player.logs].slice(0, 50)
      });
      alert("Legacy death test is ready. Press Age Up a few times to trigger the death flow.");
  };

  const triggerPhase9StockQa = () => {
      if (!onUpdatePlayer) return;

      const ownedStudioIds = new Set((player.businesses || []).map(business => business.id));
      const targetStock = player.stocks.find(stock => stock.sector === 'MEDIA' && stock.relatedStudioId && !ownedStudioIds.has(stock.relatedStudioId))
          || player.stocks.find(stock => stock.sector === 'MEDIA' && Boolean(stock.relatedStudioId));

      if (!targetStock) {
          alert('No entertainment stock is available in this save yet.');
          return;
      }

      const outstandingShares = getStockOutstandingShares(targetStock);
      const targetShares = Math.ceil(outstandingShares * 0.52);
      const existingHolding = player.portfolio.find(position => position.stockId === targetStock.id);
      const qaShares = Math.max(existingHolding?.shares || 0, targetShares);
      const nextHolding = {
          stockId: targetStock.id,
          shares: qaShares,
          averageCost: targetStock.price,
          totalInvested: qaShares * targetStock.price,
      };
      const nextPortfolio = existingHolding
          ? player.portfolio.map(position => position.stockId === targetStock.id ? nextHolding : position)
          : [...player.portfolio, nextHolding];
      const currentDismissals = (player.flags || {}).stockTakeoverEventDismissals || {};
      const stockTakeoverEventDismissals = { ...currentDismissals };
      delete stockTakeoverEventDismissals[targetStock.id];

      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 5_000_000_000),
          portfolio: nextPortfolio,
          shareholderVotes: (player.shareholderVotes || []).filter(vote => vote.stockId !== targetStock.id),
          inbox: (player.inbox || []).filter(message => message.data?.stockId !== targetStock.id || message.type !== 'SHAREHOLDER_VOTE'),
          pendingEvents: (player.pendingEvents || []).filter(event => (
              event.data?.stockId !== targetStock.id
              || (event.data?.stockDecisionType !== 'SHAREHOLDER_VOTE' && event.data?.stockDecisionType !== 'TAKEOVER_CONTROL')
          )),
          flags: {
              ...(player.flags || {}),
              stockTakeoverEventDismissals,
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `📈 CHEAT: Phase 9 stock QA seeded ${targetStock.symbol} at 52% ownership and queued stock decision checks.`,
              type: 'positive'
          }, ...player.logs].slice(0, 50),
      };

      const withShareholderVote = processShareholderVoting(seededPlayer);
      const withTakeoverEvent = processStockTakeoverEvents(withShareholderVote);
      const stockDecisionEvents = (withTakeoverEvent.pendingEvents || []).filter(event => (
          event.data?.stockId === targetStock.id
          && (event.data?.stockDecisionType === 'SHAREHOLDER_VOTE' || event.data?.stockDecisionType === 'TAKEOVER_CONTROL')
      ));
      const otherEvents = (withTakeoverEvent.pendingEvents || []).filter(event => !stockDecisionEvents.some(stockEvent => stockEvent.id === event.id));

      onUpdatePlayer({
          ...withTakeoverEvent,
          pendingEvents: [...stockDecisionEvents, ...otherEvents].slice(0, 12),
      });
      setActiveCheatMenu('NONE');
      alert(`Phase 9 Stock Events QA ready for ${targetStock.name}. Resolve the popup, then press the button again if you want the next stock decision immediately.`);
  };

  const makePhase10Studio = (id: string, name: string, valuation: number) => {
      const studio = createBusiness(
          name,
          'PRODUCTION_HOUSE',
          'MAJOR_STUDIO',
          { quality: 'LUXURY', pricing: 'MARKET', marketing: 'HIGH' },
          'STK',
          player.currentWeek
      );
      return {
          ...studio,
          id,
          name,
          balance: Math.max(studio.balance, 650_000_000),
          stats: {
              ...studio.stats,
              valuation,
              weeklyRevenue: Math.max(studio.stats.weeklyRevenue, Math.round(valuation * 0.018 / 52)),
              weeklyExpenses: Math.max(studio.stats.weeklyExpenses, Math.round(valuation * 0.012 / 52)),
              weeklyProfit: Math.max(studio.stats.weeklyProfit, Math.round(valuation * 0.006 / 52)),
              brandHealth: 82,
              customerSatisfaction: 78,
              riskLevel: 28,
              hype: 72,
              studioMomentum: 74,
              investorConfidence: 76,
          },
          staff: studio.staff.map((staff, index) => ({
              ...staff,
              id: `${id}_phase10_staff_${index}`,
              morale: 72,
          })),
      };
  };

  const triggerPhase10WorldReactionQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
      ];
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 2_000_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          stockTakeovers: [{
              id: `phase10_takeover_wbd_${player.age}_${player.currentWeek}`,
              stockId: 'stk_wbd',
              stockSymbol: 'WBD',
              companyName: 'Warner Bros. Discovery',
              relatedStudioId: 'WARNER_BROS',
              route: 'CONTROL_TRANSFER',
              status: 'CONTROLLED',
              ownershipPercent: 52,
              alliedSupportPercent: 0,
              effectiveControlPercent: 52,
              supportScore: 100,
              rivalDefenceRisk: 0,
              cost: 0,
              summary: 'Warner Bros. control transferred into the player studio group for Phase 10 testing.',
              createdWeek: player.currentWeek,
              createdYear: player.age,
              resolvedWeek: player.currentWeek,
              resolvedYear: player.age,
              acquiredBusinessId: 'WARNER_BROS',
          }, ...(player.stockTakeovers || []).filter(takeover => takeover.relatedStudioId !== 'WARNER_BROS')],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [{
                  studioId: 'PARAMOUNT',
                  studioName: 'Paramount Pictures',
                  acquisitionState: 'PUBLICLY_TRADED',
                  publicValuation: 22_000_000_000,
                  approachedWeek: player.currentWeek,
                  approachedYear: player.age,
                  status: 'ACQUIRED',
                  closing: {
                      finalPrice: 0,
                      acquiredBusinessId: 'PARAMOUNT',
                      signedWeek: player.currentWeek,
                      signedYear: player.age,
                      funding: { source: 'PERSONAL' },
                      verifiedDebt: 3_800_000_000,
                      hiddenLiabilities: 900_000_000,
                      expectedAnnualIncome: 1_400_000_000,
                      assetSummary: 'public-market control transfer',
                  },
              }, ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => entry?.studioId !== 'PARAMOUNT')],
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
              },
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: '🌍 CHEAT: Phase 10 world reaction empire seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      };

      onUpdatePlayer(processWorldReactions(seededPlayer));
      setActiveCheatMenu('NONE');
      alert('Phase 10 World Reactions QA ready: empire pressure, news, social reaction, and balancing state seeded.');
  };

  const triggerPhase10DebtQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
      ];
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = syncAcquisitionDebtLedger({
          ...player,
          money: Math.max(player.money, 320_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [
                  {
                      studioId: 'WARNER_BROS',
                      studioName: 'Warner Bros.',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 74_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'WARNER_BROS',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 9_500_000_000,
                          hiddenLiabilities: 2_300_000_000,
                          expectedAnnualIncome: 3_600_000_000,
                          assetSummary: 'public-market control transfer with inherited debt',
                      },
                  },
                  {
                      studioId: 'PARAMOUNT',
                      studioName: 'Paramount Pictures',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 22_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'PARAMOUNT',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 4_200_000_000,
                          hiddenLiabilities: 1_100_000_000,
                          expectedAnnualIncome: 1_500_000_000,
                          assetSummary: 'public-market control transfer with inherited debt',
                      },
                  },
                  ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => !studioIds.has(entry?.studioId)),
              ],
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
              },
              acquisitionDebtLastServicedWeekKey: undefined,
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: 'CHEAT: Phase 10 acquisition debt QA empire seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      });
      const servicedPlayer = processAcquisitionDebtService(seededPlayer).player;

      onUpdatePlayer(processWorldReactions(servicedPlayer));
      setActiveCheatMenu('NONE');
      alert('Phase 10 Debt QA ready: inherited acquisition debt, weekly interest service, pressure news, and pay-down controls are seeded.');
  };

  const triggerPhase10RegulatorQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
          makePhase10Studio('UNIVERSAL', 'Universal Pictures', 65_000_000_000),
      ];
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 5_000_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          stockTakeovers: [
              {
                  id: `phase10_reg_takeover_wbd_${player.age}_${player.currentWeek}`,
                  stockId: 'stk_wbd',
                  stockSymbol: 'WBD',
                  companyName: 'Warner Bros. Discovery',
                  relatedStudioId: 'WARNER_BROS',
                  route: 'CONTROL_TRANSFER',
                  status: 'CONTROLLED',
                  ownershipPercent: 52,
                  alliedSupportPercent: 0,
                  effectiveControlPercent: 52,
                  supportScore: 100,
                  rivalDefenceRisk: 0,
                  cost: 0,
                  summary: 'Warner Bros. control transferred into the player studio group for regulator QA.',
                  createdWeek: player.currentWeek,
                  createdYear: player.age,
                  resolvedWeek: player.currentWeek,
                  resolvedYear: player.age,
                  acquiredBusinessId: 'WARNER_BROS',
              },
              ...(player.stockTakeovers || []).filter(takeover => takeover.relatedStudioId !== 'WARNER_BROS'),
          ],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [
                  {
                      studioId: 'PARAMOUNT',
                      studioName: 'Paramount Pictures',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 22_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'PARAMOUNT',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 4_000_000_000,
                          hiddenLiabilities: 1_000_000_000,
                          expectedAnnualIncome: 1_500_000_000,
                          assetSummary: 'public-market control transfer',
                      },
                  },
                  ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => entry?.studioId !== 'PARAMOUNT'),
              ],
              regulatorPressureState: {
                  ...((player.flags || {}).regulatorPressureState || {}),
                  lastProcessedWeek: -1,
                  acquisitionMoratoriumWeeksRemaining: 0,
                  conductAgreementWeeksRemaining: 0,
              },
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
              },
          },
          pendingEvents: (player.pendingEvents || []).filter(event => !event.data?.regulatorPressureEventType),
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: 'CHEAT: Phase 10 regulator pressure QA empire seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      };
      const regulatorPlayer = processRegulatorPressure(seededPlayer);

      onUpdatePlayer(processWorldReactions(regulatorPlayer));
      setActiveCheatMenu('NONE');
      alert('Phase 10 Regulator QA ready: antitrust review, acquisition delay, pressure news, and regulator popup seeded.');
  };

  const triggerPhase10TalentQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
      ].map(studio => ({
          ...studio,
          staff: studio.staff.map((staff, index) => ({
              ...staff,
              morale: index === 0 ? 32 : 42,
              salary: Math.max(staff.salary, index === 0 ? 1_200_000 : 650_000),
          })),
      }));
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 1_250_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [
                  {
                      studioId: 'WARNER_BROS',
                      studioName: 'Warner Bros.',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 74_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'WARNER_BROS',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 4_000_000_000,
                          hiddenLiabilities: 900_000_000,
                          expectedAnnualIncome: 1_500_000_000,
                          assetSummary: 'public-market control transfer',
                      },
                  },
                  {
                      studioId: 'PARAMOUNT',
                      studioName: 'Paramount Pictures',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 22_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'PARAMOUNT',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 2_200_000_000,
                          hiddenLiabilities: 600_000_000,
                          expectedAnnualIncome: 1_000_000_000,
                          assetSummary: 'public-market control transfer',
                      },
                  },
                  ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => !studioIds.has(entry?.studioId)),
              ],
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  antiMonopolyPressure: 78,
                  rivalRetaliationRisk: 66,
                  employeeDepartureRisk: 76,
                  investorConfidence: 55,
                  acquisitionDebtPressure: 28,
                  valuationPressure: 45,
                  franchiseValuePressure: 42,
              },
              regulatorPressureState: {
                  ...((player.flags || {}).regulatorPressureState || {}),
                  lastProcessedWeek: -1,
                  pressureScore: 74,
                  status: 'REVIEW',
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  controlledTakeoverCount: 1,
                  acquisitionMoratoriumWeeksRemaining: 1,
                  conductAgreementWeeksRemaining: 0,
                  acquisitionCostMultiplier: 1.25,
                  investorConfidencePenalty: 5,
                  reviewCount: 1,
                  finesPaidToDate: 0,
              },
              talentInstabilityState: {
                  ...((player.flags || {}).talentInstabilityState || {}),
                  lastProcessedWeek: -1,
                  retentionShieldWeeksRemaining: 0,
              },
          },
          pendingEvents: (player.pendingEvents || []).filter(event => !event.data?.talentInstabilityEventType),
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: 'CHEAT: Phase 10 talent instability QA empire seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      };
      const worldPlayer = processWorldReactions(seededPlayer);
      const talentPlayer = processTalentInstability(worldPlayer);

      onUpdatePlayer(talentPlayer);
      setActiveCheatMenu('NONE');
      alert('Phase 10 Talent QA ready: retention crisis popup, talent news, social reaction, and real departure path seeded.');
  };

  const triggerPhase10RivalQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
      ];
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 4_000_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [
                  {
                      studioId: 'ARTISAN_PICTURES',
                      studioName: 'Artisan Pictures',
                      acquisitionState: 'OPEN_TO_OFFERS',
                      publicValuation: 420_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'COUNTERED',
                      offer: {
                          type: 'FAIR',
                          amount: 435_000_000,
                          funding: { source: 'PERSONAL' },
                          complianceRisk: 16,
                          complianceBand: 'ROUTINE',
                          submittedWeek: player.currentWeek,
                          submittedYear: player.age,
                          round: 1,
                      },
                      sellerResponse: {
                          decision: 'COUNTERED',
                          counterAmount: 465_000_000,
                          round: 1,
                          respondedWeek: player.currentWeek,
                          respondedYear: player.age,
                          summary: 'The board wants stronger terms.',
                      },
                  },
                  ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => entry?.studioId !== 'ARTISAN_PICTURES'),
              ],
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  antiMonopolyPressure: 76,
                  rivalRetaliationRisk: 74,
                  employeeDepartureRisk: 0,
                  investorConfidence: 56,
                  acquisitionDebtPressure: 22,
                  valuationPressure: 40,
                  franchiseValuePressure: 38,
              },
              regulatorPressureState: {
                  ...((player.flags || {}).regulatorPressureState || {}),
                  lastProcessedWeek: -1,
                  pressureScore: 68,
                  status: 'REVIEW',
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  controlledTakeoverCount: 1,
                  acquisitionMoratoriumWeeksRemaining: 0,
                  conductAgreementWeeksRemaining: 0,
                  acquisitionCostMultiplier: 1.2,
                  investorConfidencePenalty: 3,
                  reviewCount: 1,
                  finesPaidToDate: 0,
              },
              rivalRetaliationState: {
                  ...((player.flags || {}).rivalRetaliationState || {}),
                  lastProcessedWeek: -1,
                  pressureShieldWeeksRemaining: 0,
              },
          },
          pendingEvents: (player.pendingEvents || []).filter(event => !event.data?.rivalRetaliationEventType),
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: 'CHEAT: Phase 10 rival retaliation QA seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      };
      const worldPlayer = processWorldReactions(seededPlayer);
      const rivalPlayer = processRivalRetaliation(worldPlayer);

      onUpdatePlayer(rivalPlayer);
      setActiveCheatMenu('NONE');
      alert('Phase 10 Rival QA ready: rival bid, leaks, defensive alliance pressure, news, and popup decision seeded.');
  };

  const triggerPhase10MarketPulseQa = () => {
      if (!onUpdatePlayer) return;
      const phase10Studios = [
          makePhase10Studio('PLAYER_MAIN', 'Player Pictures', 1_200_000_000),
          makePhase10Studio('WARNER_BROS', 'Warner Bros.', 74_000_000_000),
          makePhase10Studio('PARAMOUNT', 'Paramount Pictures', 22_000_000_000),
      ];
      const studioIds = new Set(phase10Studios.map(studio => studio.id));
      const seededPlayer: Player = {
          ...player,
          money: Math.max(player.money, 5_000_000_000),
          businesses: [
              ...phase10Studios,
              ...(player.businesses || []).filter(business => !studioIds.has(business.id) && business.type !== 'PRODUCTION_HOUSE'),
          ],
          flags: {
              ...(player.flags || {}),
              studioAcquisitionCases: [
                  {
                      studioId: 'WARNER_BROS',
                      studioName: 'Warner Bros.',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 74_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'WARNER_BROS',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 2_500_000_000,
                          hiddenLiabilities: 400_000_000,
                          expectedAnnualIncome: 2_200_000_000,
                          assetSummary: 'public-market control transfer with franchise catalog',
                      },
                  },
                  {
                      studioId: 'PARAMOUNT',
                      studioName: 'Paramount Pictures',
                      acquisitionState: 'PUBLICLY_TRADED',
                      publicValuation: 22_000_000_000,
                      approachedWeek: player.currentWeek,
                      approachedYear: player.age,
                      status: 'ACQUIRED',
                      closing: {
                          finalPrice: 0,
                          acquiredBusinessId: 'PARAMOUNT',
                          signedWeek: player.currentWeek,
                          signedYear: player.age,
                          funding: { source: 'PERSONAL' },
                          verifiedDebt: 1_400_000_000,
                          hiddenLiabilities: 200_000_000,
                          expectedAnnualIncome: 900_000_000,
                          assetSummary: 'public-market control transfer with library rights',
                      },
                  },
                  ...((player.flags || {}).studioAcquisitionCases || []).filter((entry: any) => !studioIds.has(entry?.studioId)),
              ],
              worldReactionState: {
                  ...((player.flags || {}).worldReactionState || {}),
                  lastProcessedWeek: -1,
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  antiMonopolyPressure: 62,
                  rivalRetaliationRisk: 54,
                  employeeDepartureRisk: 0,
                  investorConfidence: 65,
                  acquisitionDebtPressure: 18,
                  valuationPressure: 30,
                  franchiseValuePressure: 34,
              },
              regulatorPressureState: {
                  ...((player.flags || {}).regulatorPressureState || {}),
                  lastProcessedWeek: -1,
                  pressureScore: 45,
                  status: 'MONITORING',
                  controlledStudioCount: 3,
                  controlledMajorStudioCount: 3,
                  controlledTakeoverCount: 1,
                  acquisitionMoratoriumWeeksRemaining: 0,
                  conductAgreementWeeksRemaining: 0,
                  acquisitionCostMultiplier: 1.15,
                  investorConfidencePenalty: 1,
                  reviewCount: 0,
                  finesPaidToDate: 0,
              },
              acquisitionMarketPulseState: {
                  ...((player.flags || {}).acquisitionMarketPulseState || {}),
                  lastProcessedWeek: -1,
                  processedCaseIds: [],
              },
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: 'CHEAT: Phase 10 acquisition market pulse QA seeded.',
              type: 'positive',
          }, ...(player.logs || [])].slice(0, 50),
      };
      const pulsePlayer = processAcquisitionMarketPulse(seededPlayer);

      onUpdatePlayer(pulsePlayer);
      setActiveCheatMenu('NONE');
      alert('Phase 10 Market Pulse QA ready: acquisition news chain, fan/social reaction, investor confidence, and franchise value movement seeded.');
  };

  // Calculate energy drain: Exclude ACTING_GIG as per new game rules
  const commitmentDrain = player.commitments.reduce((sum, c) => {
      // Movies do not drain weekly energy passively
      if (c.type === 'ACTING_GIG') return sum;
      return sum + c.energyCost;
  }, 0);
  // Removed business drain from visual calculation
  const weeklyDrain = commitmentDrain;
  const weeklyEnergySpendLog = useMemo(() => getWeeklyEnergySpendLog(player), [player]);
  const weeklyEnergySpent = weeklyEnergySpendLog.reduce((sum, entry) => sum + entry.amount, 0);
  const energyLimit = Math.max(0, 100 - weeklyDrain);


  return (
    <div className="space-y-6 pb-24 pt-4 relative">

      {/* PASSWORD PROMPT OVERLAY */}
      {showPasswordPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                      <Lock size={20} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">Developer Tools</h3>
                  <p className="text-zinc-500 text-xs mb-6">This code only opens internal QA tools. It does not lock or protect save slots.</p>

                  <div className="w-full relative mb-4">
                      <input
                        type="password"
                        value={passwordInput}
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Required"
                        maxLength={20}
                        className={`w-full bg-zinc-950 border-2 rounded-xl py-3 px-4 text-center font-mono text-lg text-white focus:outline-none transition-all ${passwordError ? 'border-rose-500 animate-pulse' : 'border-zinc-800 focus:border-amber-500'}`}
                      />
                  </div>

                  {passwordError && (
                      <div className="flex items-center gap-1 text-rose-500 text-xs font-bold mb-4 animate-in slide-in-from-top-1">
                          <AlertTriangle size={12}/> Invalid Access Code
                      </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 w-full">
                      <button onClick={() => setShowPasswordPrompt(false)} className="py-3 rounded-xl bg-zinc-800 text-zinc-400 font-bold text-sm hover:bg-zinc-700">Cancel</button>
                      <button onClick={handleUnlockDevTools} className="py-3 rounded-xl bg-white text-black font-bold text-sm hover:bg-zinc-200">Unlock</button>
                  </div>
              </div>
          </div>
      )}

      {/* CHEAT MENU OVERLAY */}
      {activeCheatMenu !== 'NONE' && (
          <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className={`border rounded-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl ${
                  activeCheatMenu === 'EDITOR'
                      ? 'max-w-lg border-amber-400/30 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.16),transparent_38%),linear-gradient(145deg,#17110b,#070707_68%)]'
                      : 'max-w-sm border-zinc-700 bg-zinc-900'
              }`}>
                  <div className={`p-4 border-b flex justify-between items-center ${
                      activeCheatMenu === 'EDITOR'
                          ? 'border-amber-400/20 bg-black/30'
                          : 'border-zinc-700 bg-zinc-800/50'
                  }`}>
                      <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-amber-500">
                          {activeCheatMenu === 'EDITOR' ? <Camera size={16} /> : <Sliders size={16} />}
                          {activeCheatMenu === 'EDITOR' ? 'Promo Control Room' : 'Dev Tools'}
                      </div>
                      <button onClick={() => setActiveCheatMenu('NONE')} className="p-1 hover:bg-white/10 rounded-full">
                          <X size={20} className="text-zinc-400" />
                      </button>
                  </div>

                  <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">

                      {activeCheatMenu === 'EDITOR' && (
                          <div className="space-y-5">
                              <div className="rounded-3xl border border-amber-300/20 bg-black/30 p-4">
                                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                                      <Camera size={14} /> Capture-ready feature launcher
                                  </div>
                                  <h3 className="mt-2 font-serif text-2xl font-black uppercase italic leading-none text-white">
                                      Build the promo reel
                                  </h3>
                                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-400">
                                      Use these to create polished gameplay moments for video capture. Each action prepares a real screen or story beat without exposing internal QA wording.
                                  </p>
                              </div>

                              <div className="space-y-2">
                                  <h4 className="flex items-center gap-2 border-b border-amber-300/15 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                                      <Mail size={12} /> Career moments
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(() => triggerCheatContract('ROYALTY'), () => setPage?.(Page.MOBILE))}
                                          className="col-span-2 min-h-14 rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 text-left text-xs font-black uppercase tracking-[0.12em] text-amber-100 transition-colors hover:bg-amber-300/15"
                                      >
                                          Premium Film Contract
                                          <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-zinc-400">Creates a high-value offer in Messages.</span>
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(() => triggerCheatFranchiseContract('MCU'), () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-red-300/25 bg-red-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-red-100 transition-colors hover:bg-red-300/15"
                                      >
                                          Franchise Deal
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerAwardInvite, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-yellow-100 transition-colors hover:bg-yellow-300/15"
                                      >
                                          Award Invite
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerAwardsPolishQa)}
                                          className="col-span-2 min-h-12 rounded-2xl border border-violet-300/25 bg-violet-300/10 px-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 transition-colors hover:bg-violet-300/15"
                                      >
                                          Award Night Ceremony
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <h4 className="flex items-center gap-2 border-b border-amber-300/15 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                                      <Clapperboard size={12} /> Studio empire
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerStudioBootstrapAndOpen)}
                                          className="col-span-2 min-h-14 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 text-left text-xs font-black uppercase tracking-[0.12em] text-emerald-100 transition-colors hover:bg-emerald-300/15"
                                      >
                                          Production House Dashboard
                                          <span className="mt-1 block text-[10px] font-semibold normal-case tracking-normal text-zinc-400">Funds a studio and opens the studio command screen.</span>
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerFullStudioSlateQa)}
                                          className="rounded-2xl border border-sky-300/25 bg-sky-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-sky-100 transition-colors hover:bg-sky-300/15"
                                      >
                                          Full Studio Slate
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerStudioAcquisitionSigningCheat)}
                                          className="rounded-2xl border border-orange-300/25 bg-orange-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-orange-100 transition-colors hover:bg-orange-300/15"
                                      >
                                          Studio Acquisition
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerBoxOfficeDepthQa)}
                                          className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition-colors hover:bg-cyan-300/15"
                                      >
                                          Box Office Results
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerAudiencePulseQa, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-yellow-300/25 bg-yellow-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-yellow-100 transition-colors hover:bg-yellow-300/15"
                                      >
                                          Audience Pulse
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerSoundtrackRevenueQa)}
                                          className="col-span-2 rounded-2xl border border-teal-300/25 bg-teal-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-teal-100 transition-colors hover:bg-teal-300/15"
                                      >
                                          Soundtrack Revenue
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <h4 className="flex items-center gap-2 border-b border-amber-300/15 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                                      <Globe size={12} /> Social buzz
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerXBootstrap, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-blue-300/25 bg-blue-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-blue-100 transition-colors hover:bg-blue-300/15"
                                      >
                                          X Spotlight Feed
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerXDramaPost, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-rose-300/25 bg-rose-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-rose-100 transition-colors hover:bg-rose-300/15"
                                      >
                                          X Viral Drama
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerInstagramBootstrap, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-pink-300/25 bg-pink-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-pink-100 transition-colors hover:bg-pink-300/15"
                                      >
                                          Instagram Profile
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerInstagramUnlockComposer, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-fuchsia-300/25 bg-fuchsia-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-fuchsia-100 transition-colors hover:bg-fuchsia-300/15"
                                      >
                                          Red Carpet Posts
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerYoutubeBootstrap, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-red-300/25 bg-red-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-red-100 transition-colors hover:bg-red-300/15"
                                      >
                                          YouTube Studio
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerYoutubeOffers, () => setPage?.(Page.MOBILE))}
                                          className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-amber-100 transition-colors hover:bg-amber-300/15"
                                      >
                                          Creator Deals
                                      </button>
                                  </div>
                              </div>

                              <div className="space-y-2">
                                  <h4 className="flex items-center gap-2 border-b border-amber-300/15 pb-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-200">
                                      <Sparkles size={12} /> Big-picture worlds
                                  </h4>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(() => triggerFranchiseQaScenario('HOT'))}
                                          className="rounded-2xl border border-emerald-300/25 bg-emerald-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-emerald-100 transition-colors hover:bg-emerald-300/15"
                                      >
                                          Hot Franchise
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(() => triggerUniverseQaScenario('EVENT_READY'))}
                                          className="rounded-2xl border border-cyan-300/25 bg-cyan-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-cyan-100 transition-colors hover:bg-cyan-300/15"
                                      >
                                          Universe Event
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(triggerUniverseLifecycleQa)}
                                          className="rounded-2xl border border-violet-300/25 bg-violet-300/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-violet-100 transition-colors hover:bg-violet-300/15"
                                      >
                                          Legacy Archive
                                      </button>
                                      <button
                                          type="button"
                                          onClick={() => runEditorAction(onShowWhatsNewCheat || (() => undefined))}
                                          className="rounded-2xl border border-white/20 bg-white/10 px-3 py-3 text-left text-[10px] font-black uppercase tracking-[0.12em] text-white transition-colors hover:bg-white/15"
                                      >
                                          Update Showcase
                                      </button>
                                  </div>
                              </div>

                              <button
                                  type="button"
                                  onClick={() => setActiveCheatMenu('NONE')}
                                  className="min-h-12 w-full rounded-2xl bg-[#d8ab3c] px-4 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[0_6px_0_#7a4a0a] transition-transform active:translate-y-1 active:shadow-[0_2px_0_#7a4a0a]"
                              >
                                  Close Promo Tools
                              </button>
                          </div>
                      )}

                      {/* DEV ONLY: Scenario Triggers */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Clapperboard size={10} /> Studio QA
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={triggerStudioBootstrap} className="col-span-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400">
                                      Create / Fund Test Studio
                                  </button>
                                  <button onClick={triggerStudioBootstrapAndOpen} className="col-span-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-400/40 text-xs font-bold py-3 rounded-lg text-yellow-300">
                                      Open Production House Now
                                  </button>
                                  <button onClick={triggerPlatformCommissionQa} className="col-span-2 bg-violet-950/50 hover:bg-violet-900/60 border border-violet-400/50 text-xs font-bold py-3 rounded-lg text-violet-200 flex items-center justify-center gap-2">
                                      <Clapperboard size={14}/> Platform Commission Full Flow
                                  </button>
                                  <button onClick={triggerPlatformAiPhase4Qa} className="col-span-2 bg-cyan-950/50 hover:bg-cyan-900/60 border border-cyan-400/50 text-xs font-bold py-3 rounded-lg text-cyan-200 flex items-center justify-center gap-2">
                                      <Globe size={14}/> Platform AI Phase 4 QA
                                  </button>
                                  <button onClick={triggerStreamingRightsPhase8Qa} className="col-span-2 bg-amber-950/50 hover:bg-amber-900/60 border border-amber-400/50 text-xs font-bold py-3 rounded-lg text-amber-200 flex items-center justify-center gap-2">
                                      <FileText size={14}/> Rights Market A8 QA
                                  </button>
                                  <button onClick={triggerFullStudioSlateQa} className="col-span-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-400/40 text-xs font-bold py-3 rounded-lg text-emerald-300">
                                      Fill Full Studio Slate
                                  </button>
                                  <button onClick={triggerStudioAcquisitionSigningCheat} className="col-span-2 bg-orange-950/40 hover:bg-orange-900/60 border border-orange-400/40 text-xs font-bold py-3 rounded-lg text-orange-200">
                                      Studio Acquisition Signing QA
                                  </button>
                                  <button onClick={() => triggerPrivateEquityQa('MATURE_STAKE')} className="bg-violet-950/50 hover:bg-violet-900/60 border border-violet-400/40 text-xs font-bold py-3 rounded-lg text-violet-200 flex items-center justify-center gap-2">
                                      <PieChart size={14}/> 15% Private Stake
                                  </button>
                                  <button onClick={() => triggerPrivateEquityQa('BUYER_OFFER')} className="bg-sky-950/50 hover:bg-sky-900/60 border border-sky-400/40 text-xs font-bold py-3 rounded-lg text-sky-200 flex items-center justify-center gap-2">
                                      <BadgeDollarSign size={14}/> Buyer Offer Ready
                                  </button>
	                                  <button onClick={triggerFilmographySortQa} className="col-span-2 bg-pink-900/30 hover:bg-pink-900/50 border border-pink-500/30 text-xs font-bold py-3 rounded-lg text-pink-300">
	                                      Add Filmography Sort QA Library
	                                  </button>
	                                  <button onClick={triggerEpisodeRatingsQa} className="col-span-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-400/40 text-xs font-bold py-3 rounded-lg text-emerald-200 flex items-center justify-center gap-2">
	                                      <Tv size={14}/> Episode Ratings IMDb QA
	                                  </button>
	                                  <button onClick={triggerEpisodeRatingsProductionHouseQa} className="col-span-2 bg-teal-950/40 hover:bg-teal-900/60 border border-teal-400/40 text-xs font-bold py-3 rounded-lg text-teal-200 flex items-center justify-center gap-2">
	                                      <Clapperboard size={14}/> Episode Ratings Production House QA
	                                  </button>
	                                  <button onClick={triggerProductionRiskQa} className="col-span-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-400/40 text-xs font-bold py-3 rounded-lg text-rose-200 flex items-center justify-center gap-2">
	                                      <BarChart3 size={14}/> Production Risk QA
	                                  </button>
	                                  <button onClick={triggerBoxOfficeDepthQa} className="col-span-2 bg-sky-900/30 hover:bg-sky-900/50 border border-sky-400/40 text-xs font-bold py-3 rounded-lg text-sky-300 flex items-center justify-center gap-2">
	                                      <BarChart3 size={14}/> Box Office Detail QA
	                                  </button>
	                                  <button onClick={triggerBoxOfficeArchiveQa} className="col-span-2 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-400/40 text-xs font-bold py-3 rounded-lg text-indigo-200 flex items-center justify-center gap-2">
	                                      <BarChart3 size={14}/> Box Office Archive QA (12 Runs)
	                                  </button>
                                  <button onClick={triggerAudiencePulseQa} className="col-span-2 bg-yellow-950/40 hover:bg-yellow-900/60 border border-yellow-400/40 text-xs font-bold py-3 rounded-lg text-yellow-200 flex items-center justify-center gap-2">
                                      <MessageSquareQuote size={14}/> Audience Pulse IMDb QA
                                  </button>
                                  <button onClick={triggerSoundtrackRevenueQa} className="col-span-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-400/40 text-xs font-bold py-3 rounded-lg text-cyan-200 flex items-center justify-center gap-2">
                                      <Mic2 size={14}/> Soundtrack Revenue QA
                                  </button>
                                  <button onClick={triggerOutsideProducerInvestmentQa} className="col-span-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-400/40 text-xs font-bold py-3 rounded-lg text-emerald-200 flex items-center justify-center gap-2">
                                      <DollarSign size={14}/> Producer Investment QA
                                  </button>
                                  <button onClick={triggerVaultSortingQa} className="col-span-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-300">
                                      Add Vault Sorting QA Kit
                                  </button>
                                  <button onClick={() => triggerReturningTalentNegotiationQa()} className="col-span-2 bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-300">
                                      Return Deal Blocker QA
                                  </button>
                                  <button onClick={() => triggerReturningTalentNegotiationQa(60)} className="col-span-2 bg-red-950/50 hover:bg-red-900/60 border border-red-500/40 text-xs font-bold py-3 rounded-lg text-red-200">
                                      Duplicate Return Deal Stress QA
                                  </button>
                                  <button onClick={sanitizeProductionHouseReturnDealsQa} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-300">
                                      Repair Return Deals
                                  </button>
                                  <button onClick={triggerLegacyProductionHouseMigrationQa} className="bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-3 rounded-lg text-cyan-300">
                                      Legacy PH Migration
                                  </button>
                                  <button onClick={() => triggerStudioScenario('PLANNING')} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold py-3 rounded-lg text-white">
                                      Planning to Pre-Prod
                                  </button>
                                  <button onClick={() => triggerStudioScenario('PRODUCTION')} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-400">
                                      Production to Post
                                  </button>
                                  <button onClick={() => triggerStudioScenario('AWAITING_RELEASE')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-400">
                                      Awaiting Release Wizard
                                  </button>
                                  <button onClick={() => triggerStudioScenario('FUNDED_PREMIERE')} className="bg-sky-900/30 hover:bg-sky-900/50 border border-sky-400/40 text-xs font-bold py-3 rounded-lg text-sky-300">
                                      Funded Season Premiere
                                  </button>
                                  <button onClick={() => triggerStudioScenario('THEATRICAL_TO_BIDDING')} className="bg-purple-900/30 hover:bg-purple-900/50 border border-purple-500/30 text-xs font-bold py-3 rounded-lg text-purple-400">
                                      Theaters to Bidding
                                  </button>
                                  <button onClick={() => triggerStudioScenario('STREAMING_EXIT')} className="col-span-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-3 rounded-lg text-cyan-400">
                                      Streaming to Library
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Zap size={10} /> Energy Feature QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Full energy, low energy, and adjacent signing gates for quick energy QA.
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => triggerEnergyFeatureCareerQa('FULL')} className="col-span-2 bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-400/40 text-xs font-bold py-3 rounded-lg text-yellow-300 flex items-center justify-center gap-2">
                                      <Zap size={14}/> Career Production Energy QA
                                  </button>
                                  <button onClick={() => triggerEnergyFeatureCareerQa('LOW')} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold py-3 rounded-lg text-zinc-200 flex items-center justify-center gap-2">
                                      <ZapOff size={14}/> Low Energy Button QA
                                  </button>
                                  <button onClick={triggerStudioBootstrapAndOpen} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-[10px] font-bold py-3 rounded-lg text-amber-300 flex items-center justify-center gap-2">
                                      <Clapperboard size={12}/> Greenlight / Studio Gate
                                  </button>
                                  <button onClick={triggerOutsideProducerInvestmentQa} className="bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-400/40 text-[10px] font-bold py-3 rounded-lg text-emerald-200 flex items-center justify-center gap-2">
                                      <DollarSign size={12}/> Producer Investment Gate
                                  </button>
                                  <button onClick={triggerYoutubeOffers} className="bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-[10px] font-bold py-3 rounded-lg text-red-200 flex items-center justify-center gap-2">
                                      <PlayCircle size={12}/> Creator Collab Gate
                                  </button>
                                  <button onClick={triggerStudioAcquisitionSigningCheat} className="bg-orange-950/40 hover:bg-orange-900/60 border border-orange-400/40 text-[10px] font-bold py-3 rounded-lg text-orange-200 flex items-center justify-center gap-2">
                                      <ShoppingCart size={12}/> Studio Acquisition Gate
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <TrendingUp size={10} /> Stocks QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Seeds 52% ownership in one entertainment stock, then queues the real shareholder and acquisition popup checks.
                              </div>
                              <button onClick={triggerPhase9StockQa} className="w-full bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-300 flex items-center justify-center gap-2">
                                  <TrendingUp size={14}/> Phase 9 Stock Events QA
                              </button>
                              <button onClick={triggerPhase10WorldReactionQa} className="w-full bg-sky-900/30 hover:bg-sky-900/50 border border-sky-500/30 text-xs font-bold py-3 rounded-lg text-sky-300 flex items-center justify-center gap-2">
                                  <Globe size={14}/> Phase 10 World Reactions QA
                              </button>
                              <button onClick={triggerPhase10DebtQa} className="w-full bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-300 flex items-center justify-center gap-2">
                                  <DollarSign size={14}/> Phase 10 Debt QA
                              </button>
                              <button onClick={triggerPhase10RegulatorQa} className="w-full bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-300 flex items-center justify-center gap-2">
                                  <AlertTriangle size={14}/> Phase 10 Regulator QA
                              </button>
                              <button onClick={triggerPhase10TalentQa} className="w-full bg-fuchsia-900/30 hover:bg-fuchsia-900/50 border border-fuchsia-500/30 text-xs font-bold py-3 rounded-lg text-fuchsia-300 flex items-center justify-center gap-2">
                                  <Users size={14}/> Phase 10 Talent QA
                              </button>
                              <button onClick={triggerPhase10RivalQa} className="w-full bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-bold py-3 rounded-lg text-red-300 flex items-center justify-center gap-2">
                                  <Crown size={14}/> Phase 10 Rival QA
                              </button>
                              <button onClick={triggerPhase10MarketPulseQa} className="w-full bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-3 rounded-lg text-cyan-300 flex items-center justify-center gap-2">
                                  <Activity size={14}/> Phase 10 Market Pulse QA
                              </button>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <MessageSquareQuote size={10} /> Casting Feedback QA
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => sendCastingFeedbackQaMessage('APPLICATION')} className="bg-sky-900/30 hover:bg-sky-900/50 border border-sky-500/30 text-[10px] font-bold py-3 rounded-lg text-sky-300 flex items-center justify-center gap-2">
                                      <Mail size={12}/> Shortlist Decline
                                  </button>
                                  <button onClick={() => sendCastingFeedbackQaMessage('AUDITION')} className="bg-fuchsia-900/30 hover:bg-fuchsia-900/50 border border-fuchsia-500/30 text-[10px] font-bold py-3 rounded-lg text-fuchsia-300 flex items-center justify-center gap-2">
                                      <AlertTriangle size={12}/> Audition Rejection
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <FastForward size={10} /> Scenario Triggers
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  <button onClick={triggerAwardInvite} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400 flex items-center justify-center gap-2">
                                      <Mail size={14}/> Receive Award Invite (Next Week)
                                  </button>
                                  <button onClick={triggerAwardCeremony} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-bold py-3 rounded-lg text-zinc-300 flex items-center justify-center gap-2">
                                      <Trophy size={14}/> Force Award Ceremony (Instant)
                                  </button>
                                  <button onClick={triggerAwardsPolishQa} className="bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/30 text-xs font-bold py-3 rounded-lg text-violet-300 flex items-center justify-center gap-2">
                                      <Trophy size={14}/> Awards Polish QA
                                  </button>
                                  <div className="grid grid-cols-2 gap-2">
                                      <button onClick={() => triggerCheatPostProd('MOVIE')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-[10px] font-bold py-3 rounded-lg text-emerald-400 flex items-center justify-center gap-2">
                                          <Film size={12}/> +Post-Prod Movie
                                      </button>
                                      <button onClick={() => triggerCheatPostProd('SERIES')} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-[10px] font-bold py-3 rounded-lg text-blue-400 flex items-center justify-center gap-2">
                                          <Tv size={12}/> +Post-Prod Series
                                      </button>
                                  </div>
                                  <button onClick={triggerSequelProposalSetup} className="bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-500/30 text-xs font-bold py-3 rounded-lg text-indigo-400 flex items-center justify-center gap-2">
                                      <Users size={14}/> Trigger Sequel Proposal (Week 5 Check)
                                  </button>
                                  <button onClick={triggerSequelReleaseSetup} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-400 flex items-center justify-center gap-2">
                                      <Film size={14}/> Trigger Sequel Release (Post-Prod End)
                                  </button>
                                  <button onClick={triggerCheatLifeEvent} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-400 flex items-center justify-center gap-2">
                                      <Zap size={14}/> Trigger Random Life Event
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <AlertTriangle size={10} /> Event Recovery QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Tests Continue, fallback feedback, and safe recovery paths for corrupted queued events.
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => { setActiveCheatMenu('NONE'); onShowWhatsNewCheat?.(); }} className="col-span-2 bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/30 text-xs font-bold py-3 rounded-lg text-violet-300 flex items-center justify-center gap-2">
                                      <Sparkles size={14}/> Show What&apos;s New Popup
                                  </button>
                                  <button onClick={triggerFirebaseDiagnostics} className="col-span-2 bg-sky-900/30 hover:bg-sky-900/50 border border-sky-500/30 text-xs font-bold py-3 rounded-lg text-sky-300 flex items-center justify-center gap-2">
                                      <Activity size={14}/> Firebase Diagnostics Test
                                  </button>
                                  <button onClick={triggerLowConditionRestQa} className="col-span-2 bg-lime-900/30 hover:bg-lime-900/50 border border-lime-500/30 text-xs font-bold py-3 rounded-lg text-lime-300 flex items-center justify-center gap-2">
                                      <Activity size={14}/> Low Condition / Rest QA
                                  </button>
                                  <button onClick={() => queueEventQaCase('SIMPLE_FEEDBACK')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-[10px] font-bold py-3 rounded-lg text-emerald-300 flex items-center justify-center gap-2">
                                      <Check size={12}/> Simple Feedback
                                  </button>
                                  <button onClick={() => queueEventQaCase('BROKEN_IMPACT')} className="bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30 text-[10px] font-bold py-3 rounded-lg text-orange-300 flex items-center justify-center gap-2">
                                      <ZapOff size={12}/> Broken Impact
                                  </button>
                                  <button onClick={() => queueEventQaCase('MISSING_STORY')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-[10px] font-bold py-3 rounded-lg text-amber-300 flex items-center justify-center gap-2">
                                      <FileText size={12}/> Missing Story
                                  </button>
                                  <button onClick={() => queueEventQaCase('MISSING_PROJECT')} className="bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-[10px] font-bold py-3 rounded-lg text-red-300 flex items-center justify-center gap-2">
                                      <Clapperboard size={12}/> Missing Project
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <PlayCircle size={10} /> YouTube QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Creator Score <span className="text-white font-black">{calculateYoutubeCreatorScore(player)}</span> • Image <span className="text-red-300 font-black">{getYoutubePublicImageLabel(player)}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={triggerYoutubeBootstrap} className="col-span-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-bold py-3 rounded-lg text-red-300 flex items-center justify-center gap-2">
                                      <PlayCircle size={14}/> Boost Creator Channel
                                  </button>
                                  <button onClick={triggerYoutubeOffers} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-[10px] font-bold py-3 rounded-lg text-amber-300">
                                      Send Collab + Brand
                                  </button>
                                  <button onClick={triggerYoutubeRivalry} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-[10px] font-bold py-3 rounded-lg text-rose-300">
                                      Force Rivalry
                                  </button>
                                  <button onClick={() => triggerYoutubeMerchQa('PROFIT')} className="col-span-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-300 flex items-center justify-center gap-2">
                                      <ShoppingCart size={14}/> Merch Profit Setup
                                  </button>
                                  <button onClick={() => triggerYoutubeMerchQa('LOSS')} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-[10px] font-bold py-3 rounded-lg text-rose-300">
                                      Merch Loss Setup
                                  </button>
                                  <button onClick={() => triggerYoutubeMerchQa('COOLDOWN')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-[10px] font-bold py-3 rounded-lg text-amber-300">
                                      Test Merch Cooldown
                                  </button>
                                  <button onClick={triggerYoutubeCooldownReset} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold py-3 rounded-lg text-white">
                                      Reset YouTube Cooldowns
                                  </button>
                                  <button onClick={() => { setActiveCheatMenu('NONE'); setPage?.(Page.MOBILE); }} className="col-span-2 bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-lg">
                                      Open Phone
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Camera size={10} /> Instagram QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Followers <span className="text-white font-black">{Math.max(player.stats.followers || 0, player.instagram.followers || 0).toLocaleString()}</span> • Aesthetic <span className="text-pink-300 font-black">{player.instagram.aesthetic ?? 50}</span> • Fashion <span className="text-amber-300 font-black">{player.instagram.fashionInfluence ?? 10}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={triggerInstagramBootstrap} className="col-span-2 bg-pink-900/30 hover:bg-pink-900/50 border border-pink-500/30 text-xs font-bold py-3 rounded-lg text-pink-300 flex items-center justify-center gap-2">
                                      <Camera size={14}/> Boost Instagram + Posts
                                  </button>
                                  <button onClick={triggerInstagramUnlockComposer} className="col-span-2 bg-fuchsia-900/30 hover:bg-fuchsia-900/50 border border-fuchsia-500/30 text-xs font-bold py-3 rounded-lg text-fuchsia-300 flex items-center justify-center gap-2">
                                      <Sparkles size={14}/> Unlock IG Composer Types
                                  </button>
                                  <button onClick={triggerInstagramReferralDM} className="bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-[10px] font-bold py-3 rounded-lg text-cyan-300">
                                      Force Referral DM
                                  </button>
                                  <button onClick={triggerInstagramBrandDM} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-[10px] font-bold py-3 rounded-lg text-emerald-300">
                                      Force Brand DM
                                  </button>
                                  <button onClick={triggerInstagramCooldownReset} className="col-span-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold py-3 rounded-lg text-white">
                                      Reset Instagram Cooldowns
                                  </button>
                                  <button onClick={() => { setActiveCheatMenu('NONE'); setPage?.(Page.MOBILE); }} className="col-span-2 bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-lg">
                                      Open Phone
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <MessageSquareQuote size={10} /> X QA
                              </h4>
                              <div className="rounded-xl bg-zinc-950 border border-zinc-800 p-3 text-[10px] text-zinc-400">
                                  Followers <span className="text-white font-black">{(player.x.followers || 0).toLocaleString()}</span> • Posts <span className="text-blue-300 font-black">{player.x.posts.length}</span> • Feed <span className="text-sky-300 font-black">{player.x.feed.length}</span>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={triggerXBootstrap} className="col-span-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-300 flex items-center justify-center gap-2">
                                      <MessageSquareQuote size={14}/> Boost X + Seed Posts
                                  </button>
                                  <button onClick={triggerXDramaPost} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-[10px] font-bold py-3 rounded-lg text-rose-300">
                                      Force Drama Post
                                  </button>
                                  <button onClick={triggerXSmallCreatorReset} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] font-bold py-3 rounded-lg text-white">
                                      Small Account Reset
                                  </button>
                                  <button onClick={() => { setActiveCheatMenu('NONE'); setPage?.(Page.MOBILE); }} className="col-span-2 bg-white text-black hover:bg-zinc-200 text-xs font-black py-3 rounded-lg">
                                      Open Phone
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Crown size={10} /> Legacy Test Tools
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  <button onClick={addLegacyTestChild} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400 flex items-center justify-center gap-2">
                                      <Users size={14}/> Add Test Child
                                  </button>
                                  <button onClick={onQueueBabyNamingCheat} className="bg-pink-900/30 hover:bg-pink-900/50 border border-pink-500/30 text-xs font-bold py-3 rounded-lg text-pink-400 flex items-center justify-center gap-2">
                                      <Heart size={14}/> Baby Naming Next Week
                                  </button>
                                  <button onClick={ageOldestChildToPlayable} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-400 flex items-center justify-center gap-2">
                                      <FastForward size={14}/> Make Oldest Child 18
                                  </button>
                                  <button onClick={setupLegacyDeathScenario} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-400 flex items-center justify-center gap-2">
                                      <Crown size={14}/> Setup Legacy Death Test
                                  </button>
                                  <button onClick={onOpenDeathSummaryPreview} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-bold py-3 rounded-lg text-white flex items-center justify-center gap-2">
                                      <Skull size={14}/> Preview Death Summary
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Contract Triggers */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <FileText size={10} /> Contract Generator
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => triggerCheatContract('FIXED')} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold py-3 rounded-lg text-white">
                                      Fixed Pay Offer
                                  </button>
                                  <button onClick={() => triggerCheatContract('ROYALTY')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400">
                                      Royalty Offer
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('MCU')} className="col-span-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-bold py-3 rounded-lg text-red-400">
                                      Trigger Marvel Contract
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('DCU')} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-400">
                                      Trigger DC Contract
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('SW')} className="bg-yellow-900/30 hover:bg-yellow-900/50 border border-yellow-500/30 text-xs font-bold py-3 rounded-lg text-yellow-400">
                                      Trigger SW Contract
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('AVATAR')} className="bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-3 rounded-lg text-cyan-300">
                                      Avatar Deal
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('MONSTERVERSE')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-300">
                                      Monsterverse
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('JURASSIC')} className="bg-lime-900/30 hover:bg-lime-900/50 border border-lime-500/30 text-xs font-bold py-3 rounded-lg text-lime-300">
                                      Jurassic
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('SPIDER_VERSE')} className="bg-orange-900/30 hover:bg-orange-900/50 border border-orange-500/30 text-xs font-bold py-3 rounded-lg text-orange-300">
                                      Spider-Verse
                                  </button>
                                  <button onClick={() => triggerCheatFranchiseContract('FAST_SAGA')} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-300">
                                      Fast Saga
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Franchise QA */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Clapperboard size={10} /> Franchise QA
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => triggerFranchiseQaScenario('HOT')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-400">
                                      Hot Franchise
                                  </button>
                                  <button onClick={() => triggerFranchiseQaScenario('TIRED')} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-400">
                                      Tired Franchise
                                  </button>
                                  <button onClick={() => triggerFranchiseQaScenario('RECAST')} className="bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/30 text-xs font-bold py-3 rounded-lg text-violet-300">
                                      Recast History
                                  </button>
                                  <button onClick={() => triggerFranchiseQaScenario('CANDIDATE')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400">
                                      Standalone Hit
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Rare Hollywood Chaos QA */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Sparkles size={10} /> Rare Hollywood Chaos QA
                              </h4>
                              <p className="rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-[10px] leading-relaxed text-zinc-400">
                                  Load one scenario, Age Up once, then check News. Platform Moonshot also creates locked studio funding.
                              </p>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => triggerRareHollywoodChaosQa('FLOP_SEQUEL_GAMBLE')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-[10px] font-bold py-3 rounded-lg text-amber-300">
                                      Flop Sequel Bet
                                  </button>
                                  <button onClick={() => triggerRareHollywoodChaosQa('CANCELLED_SHOW_REVIVAL')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-[10px] font-bold py-3 rounded-lg text-emerald-300">
                                      Cancelled Revival
                                  </button>
                                  <button onClick={() => triggerRareHollywoodChaosQa('PLATFORM_MOONSHOT')} className="bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-[10px] font-bold py-3 rounded-lg text-cyan-300">
                                      Platform Moonshot
                                  </button>
                                  <button onClick={() => triggerRareHollywoodChaosQa('STUDIO_REBOOT_GAMBLE')} className="bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/30 text-[10px] font-bold py-3 rounded-lg text-violet-300">
                                      Reboot Gamble
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Universe QA */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Globe size={10} /> Universe QA
                              </h4>
                              <button
                                  onClick={triggerCanonStoryQa}
                                  className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-cyan-400/35 bg-cyan-950/30 px-4 py-3 text-left text-cyan-100 transition-colors duration-200 hover:border-cyan-300/60 hover:bg-cyan-950/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                  aria-label="Load canon cast, franchise, universe, Greenlight, news and social testing kit"
                              >
                                  <span className="min-w-0">
                                      <span className="block text-xs font-black uppercase tracking-[0.14em]">Canon Cast + News Kit</span>
                                      <span className="mt-1 block text-[10px] font-semibold leading-snug text-cyan-200/65">Franchise · Universe · Greenlight · News/X</span>
                                  </span>
                                  <Globe size={18} className="shrink-0 transition-colors group-hover:text-white" aria-hidden="true" />
                              </button>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => triggerUniverseQaScenario('EVENT_READY')} className="bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-3 rounded-lg text-cyan-300">
                                      Event Ready
                                  </button>
                                  <button onClick={() => triggerUniverseQaScenario('FATIGUED')} className="bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-bold py-3 rounded-lg text-red-300">
                                      Fatigued Universe
                                  </button>
                                  <button onClick={() => triggerUniverseQaScenario('MERCH')} className="col-span-2 bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-300">
                                      Merch Empire
                                  </button>
                                  <button onClick={triggerUniverseLifecycleQa} className="col-span-2 bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-300">
                                      Lifecycle Archive Kit
                                  </button>
                                  <button onClick={triggerLegacyCharacterPickerQa} className="col-span-2 bg-violet-900/30 hover:bg-violet-900/50 border border-violet-500/30 text-xs font-bold py-3 rounded-lg text-violet-300">
                                      Legacy Character Picker QA
                                  </button>
                                  <button onClick={triggerUniverseNamingFlowCheat} className="col-span-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-300">
                                      Naming Flow Kit
                                  </button>
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Money & Energy */}
                      {activeCheatMenu === 'DEV' && (
                          <>
                              <button
                                onClick={prepareStreamingFounderQa}
                                className="w-full rounded-xl border border-cyan-400/40 bg-cyan-950/40 px-4 py-3 text-xs font-black uppercase tracking-[0.14em] text-cyan-200 hover:bg-cyan-900/50"
                              >
                                  Streaming Founder Ready
                              </button>
                              <div>
                                  <label className="text-xs font-bold text-zinc-500 uppercase block mb-1">Bank Balance ($)</label>
                                  <input
                                    type="number"
                                    value={player.money}
                                    onChange={updateMoney}
                                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl p-3 text-white font-mono font-bold focus:outline-none focus:border-amber-500"
                                  />
                              </div>
                              <div>
                                  <div className="flex justify-between mb-1">
                                      <label className="text-xs font-bold text-zinc-500 uppercase">Energy</label>
                                      <span className="text-xs font-mono text-amber-400">{player.energy.current}</span>
                                  </div>
                                  <input
                                    type="range" min="0" max="100"
                                    value={player.energy.current}
                                    onChange={(e) => updateEnergy(parseInt(e.target.value))}
                                    className="w-full accent-amber-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                          </>
                      )}

                      {/* DEV ONLY: Project Triggers */}
                      {activeCheatMenu === 'DEV' && (
                          <div className="space-y-2">
                              <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                                 <Film size={10} /> Instant Release (Standard)
                              </h4>
                              <div className="grid grid-cols-2 gap-2">
                                  <button onClick={() => injectProject('LOW')} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold py-2 rounded-lg text-white">
                                      Low Budget
                                  </button>
                                  <button onClick={() => injectProject('HIGH')} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-2 rounded-lg text-amber-400">
                                      Blockbuster
                                  </button>
                                  <button onClick={injectPostProdProject} className="col-span-2 bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-2 rounded-lg text-blue-400">
                                      Start Post-Production (12 Weeks)
                                  </button>
                                  <button onClick={triggerProductionCrisis} className="col-span-2 bg-red-900/30 hover:bg-red-900/50 border border-red-500/30 text-xs font-bold py-2 rounded-lg text-red-400">
                                      Trigger Production Crisis
                                  </button>
                                  <button onClick={triggerDirectorDecision} className="col-span-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-500/30 text-xs font-bold py-2 rounded-lg text-cyan-400">
                                      Trigger Director Decision
                                  </button>
                              </div>
                          </div>
                      )}

                      {activeCheatMenu === 'DEV' && (
                          <>
                      {/* ALL TIERS: Core Stats */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Vital Stats</h4>
                          {['health', 'happiness', 'looks', 'body'].map((stat) => (
                              <div key={stat}>
                                  <div className="flex justify-between mb-1">
                                      <label className="text-xs font-bold text-zinc-400 capitalize">{stat === 'happiness' ? 'Mood' : stat === 'body' ? 'Physique' : stat}</label>
                                      <span className="text-xs font-mono text-zinc-300">{Math.round((player.stats as any)[stat] || 0)}</span>
                                  </div>
                                  <input
                                    type="range" min="0" max="100"
                                    value={(player.stats as any)[stat] || 0}
                                    onChange={(e) => updateStat(stat as any, parseInt(e.target.value))}
                                    className="w-full accent-emerald-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                          ))}
                      </div>

                       {/* ALL TIERS: Career Stats */}
                       <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1">Career Status</h4>
                          {['fame', 'reputation', 'experience'].map((stat) => (
                              <div key={stat}>
                                  <div className="flex justify-between mb-1">
                                      <label className="text-xs font-bold text-zinc-400 capitalize">{stat}</label>
                                      <span className="text-xs font-mono text-zinc-300">{Math.round((player.stats as any)[stat] || 0)}</span>
                                  </div>
                                  <input
                                    type="range" min="0" max="100"
                                    value={(player.stats as any)[stat] || 0}
                                    onChange={(e) => updateStat(stat as any, parseInt(e.target.value))}
                                    className="w-full accent-blue-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                  />
                              </div>
                          ))}
                      </div>

                      {/* ALL TIERS: Skills */}
                      <div>
                          <div className="flex justify-between items-center mb-2 border-b border-zinc-800 pb-1">
                              <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Actor Skills</h4>
                              <button onClick={maxAllSkills} className="text-[10px] font-bold bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded text-white transition-colors">Max All</button>
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                              {Object.keys(player.stats.skills).map((key) => (
                                  <div key={key}>
                                      <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-1">{key}</label>
                                      <input
                                        type="number" min="0" max="100"
                                        value={Math.round((player.stats.skills as any)[key] || 0)}
                                        onChange={(e) => updateSkill(key as keyof ActorSkills, parseInt(e.target.value))}
                                        className="w-full bg-zinc-950 border border-zinc-800 rounded p-1 text-xs text-white text-center"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>

                      {/* ALL TIERS: Genre Lab */}
                      <div className="space-y-4">
                          <h4 className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest border-b border-zinc-800 pb-1 flex items-center gap-2">
                             <Clapperboard size={10} /> Genre Proficiency
                          </h4>
                          <div className="grid grid-cols-1 gap-y-2">
                              {CHEAT_GENRES.map((genre) => (
                                  <div key={genre}>
                                      <div className="flex justify-between mb-1">
                                          <label className="text-xs font-bold text-zinc-400">{formatGenreLabel(genre)}</label>
                                          <span className="text-xs font-mono text-zinc-300">{Math.round((player.stats.genreXP[genre] || 0))}</span>
                                      </div>
                                      <input
                                        type="range" min="0" max="100"
                                        value={player.stats.genreXP[genre] || 0}
                                        onChange={(e) => updateGenreXP(genre, parseInt(e.target.value))}
                                        className="w-full accent-purple-500 h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                  </div>
                              ))}
                          </div>
                      </div>
                          </>
                      )}

                  </div>
                  {activeCheatMenu === 'DEV' && (
                      <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                          <button onClick={() => setActiveCheatMenu('NONE')} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">
                              Apply & Close
                          </button>
                      </div>
                  )}
              </div>
          </div>
      )}

      {showAvatarEditor && (
          <div className="fixed inset-0 z-[500] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div className="relative w-full max-w-md h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[90vh] rounded-none sm:rounded-[2rem] sm:border border-zinc-800 bg-black overflow-hidden flex flex-col">
                  <div
                      className="flex items-start justify-between gap-4 p-5 border-b border-zinc-800 bg-zinc-950/95"
                      style={{ paddingTop: 'max(calc(env(safe-area-inset-top) + 2.5rem), 3.75rem)' }}
                  >
                          <div className="min-w-0">
                              <div className="text-[10px] uppercase tracking-[0.25em] text-amber-500 mb-1">Change Avatar</div>
                              <h3 className="text-xl font-black text-white">{player.name}</h3>
                          <div className="text-xs text-zinc-500 mt-1">Pick a studio portrait, build one, or upload your own.</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                          <button
                              onClick={handleSaveAvatar}
                              disabled={!selectedAvatar || isCompressing || !onUpdatePlayer}
                              className="px-4 py-2 rounded-full bg-amber-500 text-black font-black text-xs uppercase tracking-[0.18em] hover:bg-amber-400 transition-colors disabled:opacity-50"
                          >
                              Save
                          </button>
                          <button
                              onClick={() => {
                                  setShowAvatarEditor(false);
                                  setShowPortraitBuilder(false);
                              }}
                              className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors"
                          >
                              <X size={18} />
                          </button>
                      </div>
                  </div>

                  <div
                      className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5"
                      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 1rem), 1.5rem)' }}
                  >
                      <div className="rounded-[1.65rem] border border-zinc-800 bg-[radial-gradient(circle_at_50%_0%,rgba(245,158,11,0.14),transparent_48%),rgba(9,9,11,0.82)] p-5 flex flex-col items-center shadow-[0_18px_60px_rgba(0,0,0,0.28)]">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group">
                              <div className="w-32 h-32 rounded-[2rem] p-1 bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-700 shadow-[0_0_34px_rgba(245,158,11,0.22)]">
                                  {isCompressing ? (
                                      <div className="w-full h-full rounded-[1.7rem] bg-zinc-950 flex items-center justify-center border-4 border-black">
                                          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                  ) : (
                                      <img src={selectedAvatar} alt={player.name} className="w-full h-full rounded-[1.7rem] object-cover border-4 border-black bg-zinc-900 [image-rendering:pixelated]" />
                                  )}
                              </div>
                              <div className="absolute bottom-1 right-1 rounded-full bg-white text-black border-4 border-black p-2 group-hover:bg-amber-100 transition-colors">
                                  <Camera size={16} />
                              </div>
                          </button>

                          <input
                              ref={fileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="absolute opacity-0 w-1 h-1 -z-10 overflow-hidden"
                          />

                          <button onClick={() => fileInputRef.current?.click()} className="mt-3 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 hover:text-white transition-colors">
                              <UploadCloud size={12} /> Upload Custom Photo
                          </button>
                          <button
                              type="button"
                              onClick={() => setShowPortraitBuilder(true)}
                              className="mt-2 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400 hover:text-amber-200 transition-colors"
                          >
                              <Sparkles size={12} /> Build Pixel Portrait
                          </button>
                          {avatarError && <div className="mt-2 text-xs text-rose-300">{avatarError}</div>}
                      </div>

                      <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                              <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Preset Bench</div>
                              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-amber-400">{currentAvatarList.length} looks</div>
                          </div>
                          <div className="grid grid-cols-5 gap-3 max-h-[48dvh] overflow-y-auto custom-scrollbar pr-1">
                              {currentAvatarList.map((preset) => {
                                  const isSelected = selectedProfileSelection === preset.selection;
                                  return (
                                      <button
                                          key={preset.id}
                                          type="button"
                                          onClick={() => applyAvatarPreset(preset)}
                                          className={`relative aspect-square rounded-2xl overflow-hidden border bg-zinc-900 transition-all ${isSelected ? 'border-amber-400 shadow-[0_0_0_2px_rgba(245,158,11,0.24)] scale-105 z-10' : 'border-white/5 opacity-75 hover:opacity-100 hover:border-zinc-600 hover:scale-[1.03]'}`}
                                          title={preset.label}
                                      >
                                          <img src={preset.thumbnail} alt={preset.label} className="w-full h-full object-cover bg-zinc-900 [image-rendering:pixelated]" />
                                          {isSelected && (
                                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                  <Check size={16} className="text-white" strokeWidth={3} />
                                              </div>
                                          )}
                                      </button>
                                  );
                              })}
                          </div>
                      </div>

                      {isCustomUpload && (
                          <div className="rounded-2xl border border-emerald-500/15 bg-emerald-500/5 p-3 text-xs text-emerald-200">
                              Custom uploaded photo selected. This will become the active portrait for this playable character everywhere in the game.
                          </div>
                      )}
                  </div>

                  {showPortraitBuilder && (
                      <div className="fixed inset-0 z-[650] bg-black/90 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
                          <div className="relative w-full max-w-md max-h-[100dvh] overflow-y-auto rounded-t-[2rem] sm:rounded-[2rem] border border-zinc-800 bg-black p-5 custom-scrollbar">
                              <button
                                  type="button"
                                  onClick={() => setShowPortraitBuilder(false)}
                                  className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors"
                              >
                                  <X size={18} />
                              </button>
                              <ProfilePictureBuilder
                                  gender={player.gender}
                                  language={language}
                                  onApply={(avatarDataUrl) => {
                                      setSelectedAvatar(avatarDataUrl);
                                      setSelectedProfileSelection(null);
                                      setIsCustomUpload(true);
                                      setShowPortraitBuilder(false);
                                      setAvatarError('');
                                  }}
                              />
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}

      {showActorArcSheet && (
          <div className="fixed inset-0 z-[480] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
              <div
                  className="relative max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl custom-scrollbar sm:rounded-[2rem]"
                  style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 1.25rem), 1.75rem)' }}
              >
                  <button
                      type="button"
                      onClick={() => setShowActorArcSheet(false)}
                      className="absolute right-4 top-4 rounded-full bg-zinc-900 p-2 text-zinc-400 hover:text-white transition-colors"
                  >
                      <X size={18} />
                  </button>

                  <div className="pr-12">
                      <div className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-400">{tr('home.actorArc.sheet.eyebrow')}</div>
                      <h3 className="mt-2 text-2xl font-black text-white">{tr(actorCareerArc.labelKey)}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-zinc-300">{tr(actorCareerArc.summaryKey)}</p>
                  </div>

                  <div className={`mt-5 rounded-2xl border p-4 ${actorCareerArc.toneClass}`}>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">{tr('home.actorArc.sheet.current')}</div>
                      <div className="mt-2 text-sm font-semibold leading-relaxed">{tr(actorCareerArc.detailKey)}</div>
                  </div>

                  {latestRoleCredit && (
                      <div className="mt-5">
                          <RolePerformanceReport player={player} project={latestRoleCredit} compact />
                      </div>
                  )}

                  <div className="mt-5">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{tr('home.actorArc.sheet.signals')}</div>
                      <div className="mt-3 space-y-2">
                          {actorCareerArc.signals.map((signal, index) => (
                              <div key={`${signal.key}_${index}`} className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-black/40 px-3 py-2.5">
                                  <TrendingUp size={14} className="mt-0.5 shrink-0 text-emerald-300" />
                                  <span className="text-xs font-semibold leading-relaxed text-zinc-300">{tr(signal.key, signal.vars)}</span>
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Premium Profile Header */}
      <div className="relative glass-card p-6 rounded-3xl overflow-hidden group" data-tutorial-id="home-profile">
        <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
            <Star size={120} className="text-amber-500 rotate-12" />
        </div>

        <div className="relative z-10 flex items-center gap-4">
            <div className="relative cursor-pointer active:scale-95 transition-transform shrink-0" onClick={handleAvatarClick}>
                <div className="w-20 h-20 rounded-full p-[2px] bg-gradient-to-tr from-amber-300 via-amber-500 to-amber-700 shadow-lg shadow-amber-900/20">
                    <img
                        src={player.avatar}
                        alt="Avatar"
                        className="w-full h-full rounded-full object-cover border-2 border-zinc-900"
                    />
                </div>
                <div className="absolute -top-1 -left-1 bg-zinc-900/95 text-zinc-200 p-1.5 rounded-full border border-zinc-700 shadow-lg">
                    <Camera size={12} />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-zinc-900 text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 text-zinc-300 font-bold uppercase tracking-wider">
                    Lvl {Math.floor((player.stats?.fame || 0) / 10) + 1}
                </div>
            </div>

            <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold leading-tight text-white tracking-tight break-words sm:text-3xl">{player.name}</h1>
                <div className="mt-2 flex min-w-0 flex-col items-start gap-2">
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-widest border border-amber-900/50 bg-amber-950/30 px-2 py-1 rounded">{tr('home.actor.role')}</span>
                    <button
                        type="button"
                        onClick={() => setShowActorArcSheet(true)}
                        className={`max-w-full rounded border px-2.5 py-1.5 text-left text-[9px] font-black uppercase leading-none tracking-[0.1em] whitespace-nowrap ${actorCareerArc.toneClass}`}
                        title={tr(actorCareerArc.summaryKey)}
                    >
                        {tr(actorCareerArc.labelKey)}
                    </button>
                </div>
                <div className="flex items-center gap-1 mt-3 text-emerald-400 font-mono text-lg font-bold truncate">
                    {formatMoney(player.money)}
                </div>
            </div>

            <div className="flex flex-col items-center justify-center pl-4 border-l border-white/5 shrink-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">{tr('home.week')}</div>
                <div className="text-3xl font-light text-white">{player.currentWeek}</div>
                <div className="text-[10px] text-zinc-600">{tr('common.of')} 52</div>

                {/* SETTINGS AND STORE BUTTONS */}
                <div className="flex gap-1 mt-2">
                    {(player.bloodline && player.bloodline.length > 0) || player.relationships.some(rel => rel.relation === 'Child') ? (
                        <button
                            onClick={() => setPage && setPage(Page.SOCIAL)}
                            className="p-1.5 bg-amber-900/50 hover:bg-amber-800/50 rounded-full text-amber-400 hover:text-white transition-colors"
                            title={tr('home.viewLegacy')}
                        >
                            <Crown size={14} />
                        </button>
                    ) : null}
                    <button
                        onClick={() => setPage && setPage(Page.STORE)}
                        className="p-1.5 bg-emerald-900/50 hover:bg-emerald-800/50 rounded-full text-emerald-400 hover:text-white transition-colors"
                    >
                        <ShoppingCart size={14} />
                    </button>
                    <button
                        onClick={() => setPage && setPage(Page.SETTINGS)}
                        className="p-1.5 bg-zinc-800/50 hover:bg-zinc-700/50 rounded-full text-zinc-400 hover:text-white transition-colors"
                    >
                        <Settings size={14} />
                    </button>
                </div>
            </div>
        </div>
      </div>

      {/* Energy Bar */}
      <button
        type="button"
        onClick={() => setShowEnergySpendSheet(true)}
        aria-label="Open this week's energy expenses"
        className="glass-card w-full cursor-pointer p-5 rounded-3xl relative overflow-hidden text-left transition-colors hover:border-amber-300/25 active:scale-[0.995]"
      >
         <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="text-amber-400 fill-amber-400" size={14} /> {tr('home.energy')}
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
                <span className="text-white">{player.energy.current}</span> / {energyLimit} {tr('home.max').toUpperCase()}
            </span>
         </div>
         <div className="h-4 bg-zinc-900/50 rounded-full overflow-hidden border border-white/5 relative">
            {/* The Used/Committed Portion */}
            <div
                className="absolute right-0 top-0 h-full bg-zinc-800 pattern-diagonal-lines border-l border-zinc-700"
                style={{ width: `${weeklyDrain}%` }}
            />
            {/* The Current Active Energy */}
            <div
                className="absolute left-0 top-0 h-full bg-gradient-to-r from-amber-600 to-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] transition-all duration-700"
                style={{ width: `${Math.max(0, player.energy.current)}%` }}
            />
         </div>
      </button>

      {showEnergySpendSheet && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/70 px-4 pb-4 pt-16 backdrop-blur-sm sm:items-center sm:pb-16">
          <button
            type="button"
            aria-label="Close energy expenses"
            className="absolute inset-0 cursor-default"
            onClick={() => setShowEnergySpendSheet(false)}
          />
          <section className="relative w-full max-w-lg overflow-hidden rounded-[28px] border border-amber-300/20 bg-[#101013] shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.18),transparent_38%),rgba(255,255,255,0.03)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                    <Zap size={14} fill="currentColor" /> This Week Energy
                  </div>
                  <h3 className="mt-2 text-2xl font-black uppercase tracking-tight text-white">
                    Expense Log
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">
                    Week {player.currentWeek} energy usage from actions and commitments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowEnergySpendSheet(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 transition-colors hover:text-white"
                  aria-label="Close energy expenses"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3">
                  <div className="text-[8px] font-black uppercase tracking-widest text-amber-100/60">Spent</div>
                  <div className="mt-1 font-mono text-lg font-black text-amber-200">{weeklyEnergySpent}E</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                  <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Reserved</div>
                  <div className="mt-1 font-mono text-lg font-black text-zinc-200">{weeklyDrain}E</div>
                </div>
                <div className="rounded-2xl border border-emerald-300/20 bg-emerald-300/10 p-3">
                  <div className="text-[8px] font-black uppercase tracking-widest text-emerald-100/60">Available</div>
                  <div className="mt-1 font-mono text-lg font-black text-emerald-200">{player.energy.current}E</div>
                </div>
              </div>
            </div>

            <div className="max-h-[52vh] overflow-y-auto p-4">
              {weeklyEnergySpendLog.length > 0 ? (
                <div className="space-y-2">
                  {weeklyEnergySpendLog.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.035] px-3 py-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-black uppercase tracking-[0.08em] text-white">{entry.label}</div>
                        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-600">Week {entry.week}</div>
                      </div>
                      <div className="shrink-0 rounded-full border border-amber-300/25 bg-amber-300/10 px-3 py-1 font-mono text-sm font-black text-amber-100">
                        -{entry.amount}E
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-amber-300/20 bg-amber-300/10 text-amber-300">
                    <Zap size={20} fill="currentColor" />
                  </div>
                  <div className="mt-3 text-sm font-black uppercase tracking-[0.14em] text-white">No energy spent yet</div>
                  <p className="mt-2 text-xs font-semibold leading-relaxed text-zinc-500">
                    Actions you take this week will appear here after they spend energy.
                  </p>
                </div>
              )}

              {weeklyDrain > 0 && (
                <div className="mt-3 rounded-2xl border border-zinc-700/70 bg-zinc-900/50 p-3 text-xs font-bold leading-relaxed text-zinc-400">
                  {weeklyDrain}E is reserved by active weekly commitments before action spending.
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Stats Section Redesign */}
      <div className="space-y-4">

          {/* Personal Condition */}
          <div className="glass-card p-5 rounded-3xl space-y-3">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity size={12} /> {tr('home.personalCondition')}
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <StatsBar label={tr('home.health')} value={player.stats.health} color="bg-rose-500" icon={<Heart size={12}/>} />
                  <StatsBar label={tr('home.physique')} value={player.stats.body} color="bg-amber-500" icon={<Dumbbell size={12}/>} />
                  <StatsBar label={tr('home.mood')} value={player.stats.happiness} color="bg-teal-400" icon={<Smile size={12}/>} />
                  <StatsBar label={tr('home.looks')} value={player.stats.looks} color="bg-purple-500" icon={<Sparkles size={12}/>} />
              </div>
          </div>

          {/* Career Metrics */}
          <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5 rounded-3xl space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Brain size={12} /> {tr('home.skills')}
                  </h3>
                  <StatsBar label={tr('home.talent')} value={player.stats.talent} color="bg-indigo-500" icon={<Brain size={12}/>} />
                  <StatsBar label={tr('home.experience')} value={player.stats.experience} color="bg-violet-500" icon={<TrendingUp size={12}/>} />
              </div>
              <div className="glass-card p-5 rounded-3xl space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Star size={12} /> {tr('home.status')}
                  </h3>
                  <StatsBar label={tr('home.reputation')} value={player.stats.reputation} color="bg-blue-500" icon={<Trophy size={12}/>} />
                  <StatsBar label={tr('home.fame')} value={player.stats.fame} color="bg-gradient-to-r from-yellow-400 to-yellow-600" icon={<Star size={12}/>} />
              </div>
          </div>
      </div>

      {/* Activity Log - Terminal Style */}
      <div className="glass-card p-5 rounded-3xl h-48 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50"></div>
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> {tr('home.liveFeed')}
        </h3>
        <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mask-image-gradient">
            {liveFeedLogs.map((log, idx) => (
                <div key={idx} className={`text-sm leading-relaxed border-l-2 pl-3 ${
                    log.type === 'positive' ? 'border-emerald-500/50 text-emerald-100' :
                    log.type === 'negative' ? 'border-rose-500/50 text-rose-100' : 'border-zinc-700 text-zinc-400'
                }`}>
                    <span className="text-zinc-600 text-[10px] font-mono mr-2 block uppercase">{tr('common.year')} {log.year} • {tr('common.week')} {log.week}</span>
                    {log.message}
                </div>
            ))}
        </div>
      </div>

      {/* Main Action Button */}
      <button
        onClick={onNextWeek}
        disabled={isProcessing}
        data-tutorial-id="home-next-week"
        className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl shadow-amber-900/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10 ${
            isProcessing
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
            : 'bg-gradient-to-br from-amber-500 to-amber-700 text-white hover:brightness-110 relative overflow-hidden group'
        }`}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl"></div>
        {isProcessing ? (
            <span className="animate-pulse">{tr('home.processingWeek')}</span>
        ) : (
            <>
                <Calendar size={22} /> {tr('home.ageUpWeek')}
            </>
        )}
      </button>
    </div>
  );
};
