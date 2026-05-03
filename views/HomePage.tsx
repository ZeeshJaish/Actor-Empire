
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Player, ActorSkills, Commitment, ActiveRelease, ScheduledEvent, Message, AuditionOpportunity, NegotiationData, UniverseContract, UniverseId, Page, Genre, Relationship, LifeEvent, SponsorshipOffer, XPost } from '../types';
import { formatMoney } from '../services/formatUtils';
import { StatsBar } from '../components/StatsBar';
import { generateProjectDetails } from '../services/roleLogic';
import { generateDirectEntryOffer } from '../services/universeLogic'; 
import { generateLifeEvent } from '../services/lifeEventLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getGenderedAvatar, MALE_AVATAR_SEEDS, FEMALE_AVATAR_SEEDS, NPC_DATABASE } from '../services/npcLogic';
import { createBusiness } from '../services/businessLogic';
import { calculateYoutubeCreatorScore, generateYoutubeBrandDeal, generateYoutubeCollabOffer, getYoutubePublicImageLabel } from '../services/youtubeLogic';
import { Heart, Smile, Star, Zap, DollarSign, Brain, Calendar, Activity, TrendingUp, Trophy, X, Sliders, Users, Film, Tv, PlayCircle, Lock, FastForward, Key, AlertTriangle, Mic2, Mail, FileText, Dumbbell, Sparkles, Settings, ShoppingCart, Clapperboard, ZapOff, Crown, Skull, Camera, UploadCloud, Check, MessageSquareQuote } from 'lucide-react';

interface HomePageProps {
  player: Player;
  onNextWeek: () => void;
  isProcessing: boolean;
  onUpdatePlayer?: (player: Player) => void;
  setPage?: (page: Page) => void;
  onOpenProductionHouseCheat?: () => void;
  onQueueBabyNamingCheat?: () => void;
  onOpenDeathSummaryPreview?: () => void;
}

const CHEAT_GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'];
const DEV_TOOLS_PASSCODE = import.meta.env.VITE_DEV_TOOLS_PASSCODE || 'Kzign@420';
const LEGACY_DEV_TOOLS_PASSCODES = ['actor-dev'];

export const HomePage: React.FC<HomePageProps> = ({ player, onNextWeek, isProcessing, onUpdatePlayer, setPage, onOpenProductionHouseCheat, onQueueBabyNamingCheat, onOpenDeathSummaryPreview }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Cheat Menu State
  const [activeCheatMenu, setActiveCheatMenu] = useState<'NONE' | 'DEV'>('NONE');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  const [showAvatarEditor, setShowAvatarEditor] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(player.avatar);
  const [isCustomUpload, setIsCustomUpload] = useState(player.avatar.startsWith('data:image'));
  const [isCompressing, setIsCompressing] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  
  const clickCountRef = useRef(0);
  const lastClickRef = useRef(0);
  const avatarClickTimeoutRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [player.logs]);

  useEffect(() => {
    setSelectedAvatar(player.avatar);
    setIsCustomUpload(player.avatar.startsWith('data:image'));
  }, [player.avatar]);

  useEffect(() => () => {
      if (avatarClickTimeoutRef.current) {
          window.clearTimeout(avatarClickTimeoutRef.current);
      }
  }, []);

  const currentAvatarList = useMemo(() => {
      const seeds =
          player.gender === 'MALE'
              ? MALE_AVATAR_SEEDS
              : player.gender === 'FEMALE'
                  ? FEMALE_AVATAR_SEEDS
                  : [...MALE_AVATAR_SEEDS, ...FEMALE_AVATAR_SEEDS];
      return seeds.slice(0, 30).map(seed => `https://api.dicebear.com/8.x/pixel-art/svg?seed=${seed}`);
  }, [player.gender]);

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
            setAvatarError('');
            setSelectedAvatar(player.avatar);
            setIsCustomUpload(player.avatar.startsWith('data:image'));
        }
        clickCountRef.current = 0;
        avatarClickTimeoutRef.current = null;
    }, 420);
  };

  const handleUnlockDevTools = () => {
      const normalizedInput = passwordInput.trim();
      const isValidPasscode =
          normalizedInput === DEV_TOOLS_PASSCODE ||
          LEGACY_DEV_TOOLS_PASSCODES.includes(normalizedInput);

      if (isValidPasscode) {
          setShowPasswordPrompt(false);
          setActiveCheatMenu('DEV');
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

  const updateEnergy = (value: number) => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({ ...player, energy: { ...player.energy, current: value } });
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
  const triggerSequelProposalSetup = () => {
    if (!onUpdatePlayer) return;
    const usedTitles = [...player.activeReleases.map(r => r.name)];
    const dummyDetails = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
    
    // Force stats for greenlight
    dummyDetails.title = "Galactic Wars";
    dummyDetails.hiddenStats.qualityScore = 95;
    dummyDetails.hiddenStats.rawHype = 90;
    dummyDetails.genre = 'SCI_FI';
    
    const hitMovie: ActiveRelease = {
        id: `cheat_rel_${Date.now()}`,
        name: "Galactic Wars",
        type: 'MOVIE',
        roleType: 'LEAD',
        projectDetails: dummyDetails,
        distributionPhase: 'THEATRICAL',
        weekNum: 4, // Next week is 5 (Decision Week)
        weeklyGross: [150000000, 120000000, 100000000, 90000000],
        totalGross: 460000000,
        budget: 150000000,
        status: 'BLOCKBUSTER_TRACK',
        imdbRating: 8.5,
        productionPerformance: 95,
        maxTheatricalWeeks: 15 // Ensure cheat release has max weeks
    };

    onUpdatePlayer({
        ...player,
        activeReleases: [...player.activeReleases, hitMovie]
    });
    setActiveCheatMenu('NONE');
    alert("Cheat Active: 'Galactic Wars' added to Box Office (Week 4). Age Up to trigger Sequel Decision.");
  };

  // NEW: Triggers a Sequel Release (Simulates Post-Production ending for a Sequel)
  const triggerSequelReleaseSetup = () => {
    if (!onUpdatePlayer) return;
    const usedTitles = [...player.commitments.map(c => c.name)];
    const dummyDetails = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
    
    dummyDetails.title = "The Avenger Returns";
    dummyDetails.subtype = 'SEQUEL'; // Explicitly a sequel
    dummyDetails.visibleHype = 'HIGH';
    dummyDetails.hiddenStats.rawHype = 95;
    
    const sequelProject: Commitment = {
         id: `cheat_proj_seq_${Date.now()}`,
         name: "The Avenger Returns",
         type: 'ACTING_GIG',
         roleType: 'LEAD',
         energyCost: 0,
         income: 0,
         lumpSum: 2000000, 
         payoutType: 'LUMPSUM',
         projectDetails: dummyDetails,
         projectPhase: 'POST_PRODUCTION',
         phaseWeeksLeft: 1, // Releases next week
         totalPhaseDuration: 20,
         auditionPerformance: 100,
         productionPerformance: 100 
    };

    onUpdatePlayer({
        ...player,
        commitments: [...player.commitments, sequelProject]
    });
    setActiveCheatMenu('NONE');
    alert("Cheat Active: 'The Avenger Returns' (Sequel) added to Post-Production. Age Up to Release.");
  };

  const triggerAwardCeremony = () => {
      if (!onUpdatePlayer) return;
      
      const dummyNomination = {
          project: { id: 'cheat_proj_award', name: 'The Cheat Code', roleType: 'LEAD', year: player.age } as any,
          score: 100,
          category: 'Best Actor'
      };

      const eventData: ScheduledEvent = {
          id: `evt_cheat_${Date.now()}`,
          week: player.currentWeek,
          type: 'AWARD_CEREMONY',
          title: 'The Golden Statues',
          description: 'The biggest night in Hollywood (Debug Mode).',
          data: {
              awardDef: { type: 'ACADEMY', name: 'The Golden Statues', prestige: 3.0 },
              nominations: [dummyNomination]
          }
      };

      onUpdatePlayer({
          ...player,
          pendingEvent: eventData
      });
      setActiveCheatMenu('NONE');
  };

  const triggerAwardInvite = () => {
      if (!onUpdatePlayer) return;

      const dummyNomination = {
          project: { id: 'cheat_proj_award_inv', name: 'The Invitation', roleType: 'LEAD', year: player.age } as any,
          score: 100,
          category: 'Best Actor'
      };

      const eventWeek = player.currentWeek + 1; // Schedule for next week

      const inviteEvent: ScheduledEvent = {
          id: `evt_invite_cheat_${Date.now()}`,
          week: eventWeek,
          type: 'AWARD_CEREMONY',
          title: 'The Golden Statues',
          data: {
              awardDef: { type: 'ACADEMY', name: 'The Golden Statues', prestige: 3.0 },
              nominations: [dummyNomination]
          }
      };

      const newMessage: Message = {
          id: `msg_invite_cheat_${Date.now()}`,
          sender: 'The Academy',
          subject: 'Invitation: The Golden Statues',
          text: 'You have been nominated! The event is next week. Please accept this invitation to attend.',
          type: 'OFFER_EVENT',
          data: inviteEvent,
          isRead: false,
          weekSent: player.currentWeek,
          expiresIn: 2
      };

      onUpdatePlayer({
          ...player,
          inbox: [newMessage, ...player.inbox],
          news: [{
              id: `news_cheat_nom_${Date.now()}`,
              headline: `Nominations Announced: ${player.name} is on the list!`,
              subtext: "Critics are calling it a sure win.",
              category: 'TOP_STORY',
              week: player.currentWeek,
              year: player.age,
              impactLevel: 'HIGH'
          }, ...player.news]
      });
      setActiveCheatMenu('NONE');
      alert("✅ Invitation sent to Inbox! Check Messages to accept, then Age Up to trigger the event.");
  };

  // --- NEW: TRIGGER CONTRACT OFFERS ---
  const triggerCheatContract = (type: 'FIXED' | 'ROYALTY') => {
      if (!onUpdatePlayer) return;
      
      const usedTitles = player.commitments.map(c => c.name);
      const project = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
      project.title = type === 'ROYALTY' ? "The Backend Gamble" : "The Easy Payday";
      
      const basePay = 15000000;
      const pay = type === 'ROYALTY' ? 5000000 : basePay; 
      const royalty = type === 'ROYALTY' ? 2.5 : 0;
      
      const offer: AuditionOpportunity = {
          id: `cheat_offer_${Date.now()}`,
          roleType: 'LEAD',
          projectName: project.title,
          genre: project.genre,
          config: { label: 'Lead Role', difficulty: 50, energyCost: 40, baseIncome: 10000, expGain: 10 },
          project: project,
          estimatedIncome: pay,
          source: 'DIRECT',
          royaltyPercentage: royalty
      };

      let msg: Message;

      if (type === 'ROYALTY') {
          // Send as negotiation to allow royalty adjustment
          const negotiationData: NegotiationData = {
              opportunity: offer,
              basePay: pay,
              currentOffer: pay,
              roundsUsed: 0,
              maxRounds: 3,
              status: 'PENDING',
              studioPatience: 80,
              hasRoyaltyOption: true,
              royaltyPercentage: royalty
          };

          msg = {
              id: `msg_cheat_${Date.now()}`,
              sender: 'Dev Casting',
              subject: `Negotiation: ${project.title} (${type})`,
              text: "We are offering points on the backend. Let's discuss terms.",
              type: 'OFFER_NEGOTIATION',
              data: negotiationData,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: 10
          };
      } else {
          // Standard Fixed
          msg = {
              id: `msg_cheat_${Date.now()}`,
              sender: 'Dev Casting',
              subject: `Offer: ${project.title} (${type})`,
              text: "Here is a standard fixed-fee contract.",
              type: 'OFFER_ROLE',
              data: offer,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: 10
          };
      }

      onUpdatePlayer({
          ...player,
          inbox: [msg, ...player.inbox]
      });
      setActiveCheatMenu('NONE');
      alert(`Sent ${type} contract to inbox.`);
  };

  const triggerCheatFranchiseContract = (universeId: UniverseId) => {
      if (!onUpdatePlayer) return;

      const contract = generateDirectEntryOffer(player, universeId);
      const project = generateProjectDetails('HIGH', 'MOVIE', [], player);
      project.title = contract.films[0].title;
      project.universeId = universeId;
      project.genre = universeId === 'SW' ? 'SCI_FI' : 'SUPERHERO';
      project.visibleHype = 'HIGH';
      
      const offer: AuditionOpportunity = {
          id: `cheat_uni_offer_${Date.now()}`,
          roleType: contract.films[0].role,
          projectName: project.title,
          genre: project.genre,
          config: { label: 'Universe Lead', difficulty: 70, energyCost: 40, baseIncome: contract.salaryTotal, expGain: 15 },
          project: project,
          estimatedIncome: contract.salaryTotal,
          source: 'DIRECT',
          universeContract: contract,
          royaltyPercentage: 2.5
      };

      const negotiationData: NegotiationData = {
          opportunity: offer,
          basePay: contract.salaryTotal,
          currentOffer: contract.salaryTotal,
          roundsUsed: 0,
          maxRounds: 4,
          status: 'PENDING',
          studioPatience: 90,
          hasRoyaltyOption: true,
          royaltyPercentage: 2.5
      };

      const msg: Message = {
          id: `msg_cheat_uni_${Date.now()}`,
          sender: universeId === 'MCU' ? 'Marvel Studios' : universeId === 'DCU' ? 'DC Studios' : 'Lucasfilm',
          subject: `OFFER: ${contract.films.length}-Picture Universe Deal`,
          text: `We want you for ${contract.characterName}. This is a multi-year commitment.`,
          type: 'OFFER_NEGOTIATION',
          data: negotiationData,
          isRead: false,
          weekSent: player.currentWeek,
          expiresIn: 8
      };

      onUpdatePlayer({
          ...player,
          inbox: [msg, ...player.inbox]
      });
      setActiveCheatMenu('NONE');
      alert(`${universeId} Universe Contract Offer sent to Inbox.`);
  };

  const triggerCheatPostProd = (type: 'MOVIE' | 'SERIES') => {
      if (!onUpdatePlayer) return;
      
      const project = generateProjectDetails('HIGH', type, [], player);
      project.title = type === 'MOVIE' ? "Cheat Movie (Post-Prod)" : "Cheat Series (Post-Prod)";
      
      const newCommitment: Commitment = {
          id: `cheat_post_${Date.now()}`,
          name: project.title,
          roleType: 'LEAD',
          income: 0,
          energyCost: 0,
          type: 'ACTING_GIG',
          payoutType: 'LUMPSUM',
          projectPhase: 'POST_PRODUCTION',
          phaseWeeksLeft: 1,
          totalPhaseDuration: 1,
          projectDetails: project
      };

      onUpdatePlayer({
          ...player,
          commitments: [newCommitment, ...player.commitments],
          logs: [{ week: player.currentWeek, year: player.age, message: `🎬 CHEAT: Added ${type} in Post-Production.`, type: 'positive' }, ...player.logs]
      });
      setActiveCheatMenu('NONE');
      alert(`Added ${type} to Post-Production. Age Up once to send it to release strategy.`);
  };

  const triggerProductionCrisis = () => {
      const activeProject = player.commitments.find(c => c.projectPhase === 'PRODUCTION');
      if (!activeProject) {
          alert("You need a movie in PRODUCTION phase to trigger a crisis.");
          return;
      }
      
      import('../services/productionService').then(({ checkForProductionCrisis }) => {
          // Force a crisis check with 100% success for dev trigger
          // We can't easily force checkForProductionCrisis to return something without changing it
          // So let's just use the logic directly or import the generator
          import('../services/crisisGenerator').then(({ generateRandomCrisis }) => {
              const forcedCrisis = generateRandomCrisis(activeProject, player);
              const newPendingEvents = [...(player.pendingEvents || [])];
              newPendingEvents.push({
                  id: forcedCrisis.id,
                  week: player.currentWeek,
                  type: 'PRODUCTION_CRISIS',
                  title: forcedCrisis.title,
                  description: forcedCrisis.description,
                  data: {
                      crisisId: forcedCrisis.id,
                      projectId: activeProject.id,
                      isGenerative: true,
                      options: forcedCrisis.options.map((o, i) => ({ label: o.label, index: i }))
                  }
              });
              onUpdatePlayer({
                  ...player,
                  pendingEvents: newPendingEvents,
                  logs: [{ week: player.currentWeek, year: player.age, message: `⚠️ DEV TRIGGER: FORCED GENERATIVE CRISIS on the set of "${activeProject.name}"!`, type: 'negative' }, ...player.logs]
              });
              setActiveCheatMenu('NONE');
          });
      });
  };

  const triggerDirectorDecision = () => {
      const activeProject = player.commitments.find(c => c.projectPhase === 'PRODUCTION');
      if (!activeProject) {
          alert("You need a movie in PRODUCTION phase to trigger a decision.");
          return;
      }
      
      import('../services/directorGenerator').then(({ generateDirectorDecision }) => {
          const decision = generateDirectorDecision(activeProject, player);
          const newPendingEvents = [...(player.pendingEvents || [])];
          newPendingEvents.push({
              id: decision.id,
              week: player.currentWeek,
              type: 'DIRECTOR_DECISION',
              title: decision.title,
              description: decision.description,
              data: {
                  crisisId: decision.id,
                  projectId: activeProject.id,
                  options: decision.options.map((o, i) => ({ label: o.label, index: i }))
              }
          });
          onUpdatePlayer({
              ...player,
              pendingEvents: newPendingEvents,
              logs: [{ week: player.currentWeek, year: player.age, message: `🎬 DEV TRIGGER: FORCED DIRECTOR DECISION on "${activeProject.name}"!`, type: 'neutral' }, ...player.logs]
          });
          setActiveCheatMenu('NONE');
      });
  };

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

  const triggerYoutubeBootstrap = () => {
      if (!onUpdatePlayer) return;

      const boostedPlayer = {
          ...player,
          money: Math.max(player.money, 500000),
          energy: { ...player.energy, current: player.energy.max || 100 },
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 72),
              reputation: Math.max(player.stats.reputation, 65),
              skills: {
                  ...player.stats.skills,
                  improvisation: Math.max(player.stats.skills.improvisation || 0, 78),
                  charisma: Math.max(player.stats.skills.charisma || 0, 80)
              }
          },
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              lifetimeEarnings: Math.max(player.youtube.lifetimeEarnings || 0, 65000),
              isMonetized: true,
              audienceTrust: Math.max(player.youtube.audienceTrust ?? 55, 72),
              fanMood: Math.max(player.youtube.fanMood ?? 55, 74),
              controversy: Math.max(player.youtube.controversy ?? 0, 18),
              membershipsActive: true,
              members: Math.max(player.youtube.members || 0, 850),
              creatorIdentity: player.youtube.creatorIdentity || 'ACTOR_VLOGGER',
              lastLivestreamWeek: 0,
              lastMerchDropWeek: 0,
              lastIdentityChangeWeek: 0,
              videos: player.youtube.videos.length > 0 ? player.youtube.videos : [
                  {
                      id: `cheat_yt_vid_${Date.now()}`,
                      title: 'Cheat Channel Breakout',
                      type: 'VLOG',
                      thumbnailColor: 'bg-red-600',
                      views: 1200000,
                      likes: 84000,
                      earnings: 4200,
                      weekUploaded: player.currentWeek,
                      yearUploaded: player.age,
                      isPlayer: true,
                      authorName: player.name,
                      qualityScore: 88,
                      uploadPlan: 'BTS',
                      controversyScore: 4,
                      trustImpact: 3,
                      weeklyHistory: [1200000],
                      comments: ['Cheat setup: this channel is ready for QA.', 'The creator arc is online.']
                  }
              ]
          },
          flags: {
              ...player.flags,
              lastYoutubeEventAbsWeek: 0,
              lastYoutubeCreatorInviteAbsWeek: 0,
              lastYoutubeImageRippleAbsWeek: 0,
              lastYoutubeRivalryAbsWeek: 0,
              lastYoutubeCollabOfferWeek: 0,
              lastYoutubeBrandOfferWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `▶️ CHEAT: YouTube creator QA channel boosted.`, type: 'positive' as const }, ...player.logs].slice(0, 50)
      };

      onUpdatePlayer(boostedPlayer);
      setActiveCheatMenu('NONE');
      alert('YouTube QA channel boosted. Open Phone > Social > YouTube Studio.');
  };

  const triggerYoutubeOffers = () => {
      if (!onUpdatePlayer) return;

      const basePlayer = {
          ...player,
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              isMonetized: true,
              videos: player.youtube.videos.length > 0 ? player.youtube.videos : [
                  {
                      id: `cheat_yt_vid_offer_${Date.now()}`,
                      title: 'Cheat Offer Setup',
                      type: 'VLOG' as const,
                      thumbnailColor: 'bg-red-600',
                      views: 450000,
                      likes: 24000,
                      earnings: 1800,
                      weekUploaded: player.currentWeek,
                      yearUploaded: player.age,
                      isPlayer: true,
                      authorName: player.name,
                      qualityScore: 82,
                      weeklyHistory: [450000],
                      comments: []
                  }
              ]
          }
      };

      const collab = generateYoutubeCollabOffer(basePlayer);
      const brand = generateYoutubeBrandDeal(basePlayer);
      const messages: Message[] = [];

      if (collab) {
          messages.push({
              id: `cheat_yt_collab_${Date.now()}`,
              sender: collab.creatorName,
              subject: `YouTube Collab: ${collab.conceptTitle}`,
              text: `${collab.creatorName} wants to collaborate on your channel.`,
              type: 'OFFER_YOUTUBE_COLLAB',
              data: collab,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: collab.expiresInWeeks
          });
      }

      if (brand) {
          messages.push({
              id: `cheat_yt_brand_${Date.now()}`,
              sender: `${brand.brandName} Creator Team`,
              subject: `YouTube Deal: ${brand.brandName}`,
              text: `${brand.brandName} sent a creator integration offer for your channel.`,
              type: 'OFFER_YOUTUBE_BRAND',
              data: brand,
              isRead: false,
              weekSent: player.currentWeek,
              expiresIn: brand.expiresInWeeks
          });
      }

      onUpdatePlayer({
          ...basePlayer,
          inbox: [...messages, ...player.inbox],
          logs: [{ week: player.currentWeek, year: player.age, message: `📩 CHEAT: YouTube collab/brand offers sent to Messages.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('YouTube collab/brand test offers sent to Messages.');
  };

  const triggerYoutubeRivalry = () => {
      if (!onUpdatePlayer) return;

      const rivalName = 'Milo Vance';
      const lifeEvent: LifeEvent = {
          id: `cheat_yt_rivalry_life_${Date.now()}`,
          type: 'SCANDAL',
          title: `${rivalName} Starts Creator Drama`,
          description: `${rivalName} accused your channel of copying their creator lane. Pick a response to test the rivalry flow.`,
          options: [
              {
                  label: 'Ignore The Bait',
                  description: 'Protect trust and lower heat.',
                  impact: (p: Player) => {
                      p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 3);
                      p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 5);
                      return { updatedPlayer: p, log: `You ignored ${rivalName}'s bait. The channel stayed cleaner.` };
                  }
              },
              {
                  label: 'Clap Back Publicly',
                  description: 'Gain views and heat fast.',
                  impact: (p: Player) => {
                      const bonusViews = Math.floor(Math.max(30000, p.youtube.subscribers * 0.7));
                      p.youtube.totalChannelViews += bonusViews;
                      p.youtube.subscribers += Math.floor(bonusViews / 110);
                      p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 5);
                      p.youtube.audienceTrust = Math.max(0, (p.youtube.audienceTrust ?? 55) - 6);
                      p.youtube.controversy = Math.min(100, (p.youtube.controversy ?? 0) + 16);
                      p.stats.fame = Math.min(100, p.stats.fame + 2);
                      p.stats.reputation = Math.max(0, p.stats.reputation - 2);
                      return { updatedPlayer: p, log: `You clapped back at ${rivalName}: +${bonusViews.toLocaleString()} views, but heat rose.` };
                  }
              },
              {
                  label: 'Golden Mediated Collab (Watch Ad)',
                  isGolden: true,
                  description: 'Best path. Convert drama into a clean creator win.',
                  impact: (p: Player) => {
                      const bonusViews = Math.floor(Math.max(50000, p.youtube.subscribers * 0.9));
                      p.youtube.totalChannelViews += bonusViews;
                      p.youtube.subscribers += Math.floor(bonusViews / 90);
                      p.youtube.audienceTrust = Math.min(100, (p.youtube.audienceTrust ?? 55) + 8);
                      p.youtube.fanMood = Math.min(100, (p.youtube.fanMood ?? 55) + 8);
                      p.youtube.controversy = Math.max(0, (p.youtube.controversy ?? 0) - 12);
                      p.stats.reputation = Math.min(100, p.stats.reputation + 5);
                      return { updatedPlayer: p, log: `You turned ${rivalName}'s feud into a controlled hit collab.` };
                  }
              }
          ]
      };

      const rivalryEvent: ScheduledEvent = {
          id: `cheat_yt_rivalry_${Date.now()}`,
          week: player.currentWeek,
          type: 'SCANDAL',
          title: 'Creator Rivalry',
          data: { lifeEvent }
      };

      onUpdatePlayer({
          ...player,
          youtube: {
              ...player.youtube,
              subscribers: Math.max(player.youtube.subscribers || 0, 125000),
              totalChannelViews: Math.max(player.youtube.totalChannelViews || 0, 2400000),
              isMonetized: true
          },
          pendingEvents: [...(player.pendingEvents || []), rivalryEvent],
          logs: [{ week: player.currentWeek, year: player.age, message: `🥊 CHEAT: YouTube rivalry event queued.`, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
  };

  const triggerYoutubeCooldownReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          youtube: {
              ...player.youtube,
              lastLivestreamWeek: 0,
              lastMerchDropWeek: 0,
              lastIdentityChangeWeek: 0
          },
          flags: {
              ...player.flags,
              lastYoutubeEventAbsWeek: 0,
              lastYoutubeCreatorInviteAbsWeek: 0,
              lastYoutubeImageRippleAbsWeek: 0,
              lastYoutubeRivalryAbsWeek: 0,
              lastYoutubeCollabOfferWeek: 0,
              lastYoutubeBrandOfferWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔄 CHEAT: YouTube cooldowns reset.`, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('YouTube cooldowns reset.');
  };

  const getInstagramCheatNpc = () => {
      return NPC_DATABASE.find(npc => npc.handle === '@zendaya')
          || NPC_DATABASE.find(npc => npc.tier === 'A_LIST')
          || NPC_DATABASE[0];
  };

  const triggerInstagramBootstrap = () => {
      if (!onUpdatePlayer) return;
      const seededPosts = [
          {
              id: `cheat_ig_post_${Date.now()}_1`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.instagram.handle,
              authorAvatar: '',
              type: 'RED_CARPET' as const,
              caption: 'Cheat setup: red carpet post ready for detail view QA.',
              week: player.currentWeek,
              year: player.age,
              likes: 24800,
              comments: 1800,
              shares: 520,
              saves: 940,
              commentList: [
                  'Stylist deserves a raise.',
                  'This belongs on every best dressed page.',
                  'The tailoring is doing cinema.',
                  'A proper movie star entrance.'
              ],
              engagementScore: 82,
              isPlayer: true
          },
          {
              id: `cheat_ig_post_${Date.now()}_2`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.instagram.handle,
              authorAvatar: '',
              type: 'REEL' as const,
              caption: 'Testing reels, comments, likes and saves.',
              week: player.currentWeek,
              year: player.age,
              likes: 12600,
              comments: 780,
              shares: 410,
              saves: 350,
              commentList: [
                  'The timing on this is perfect.',
                  'Algorithm brought me here and I am staying.',
                  'Short, chaotic, effective.',
                  'Replay value is crazy.'
              ],
              engagementScore: 76,
              isPlayer: true
          }
      ];

      onUpdatePlayer({
          ...player,
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 35),
              reputation: Math.max(player.stats.reputation, 45),
              followers: Math.max(player.stats.followers, 25000)
          },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 25000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 72),
              authenticity: Math.max(player.instagram.authenticity || 55, 64),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 58),
              fanLoyalty: Math.max(player.instagram.fanLoyalty || 45, 68),
              posts: [...seededPosts, ...player.instagram.posts],
              feed: [...seededPosts, ...player.instagram.feed].slice(0, 50)
          },
          flags: {
              ...player.flags,
              lastInstagramMicroEventAbsWeek: 0,
              lastInstagramDmOfferAbsWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📸 CHEAT: Instagram QA profile boosted with test posts.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('Instagram QA profile boosted. Open Phone > Social > Instagram.');
  };

  const triggerInstagramReferralDM = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const state = player.instagram.npcStates[npc.id] || {
          npcId: npc.id,
          isFollowing: true,
          isFollowedBy: true,
          relationshipScore: 30,
          relationshipLevel: 'ACQUAINTANCE',
          lastInteractionWeek: player.currentWeek,
          hasMet: false,
          chatHistory: []
      };
      const actionId = `cheat_ig_ref_${Date.now()}`;

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 18), followers: Math.max(player.stats.followers, 1200) },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 1200),
              npcStates: {
                  ...player.instagram.npcStates,
                  [npc.id]: {
                      ...state,
                      isFollowing: true,
                      isFollowedBy: true,
                      relationshipScore: Math.max(state.relationshipScore || 0, 30),
                      chatHistory: [
                          ...(state.chatHistory || []),
                          {
                              sender: 'NPC' as const,
                              text: `Hey. I heard a casting director asking around for a solid fit on a studio project. I mentioned your name. If they reach out, take it seriously.`,
                              timestamp: Date.now(),
                              tag: 'CHEAT_IG_REFERRAL',
                              action: { id: actionId, kind: 'IG_REFERRAL' as const, status: 'PENDING' as const, payload: { weeksLeft: 2 } }
                          }
                      ]
                  }
              }
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📱 CHEAT: Instagram referral DM sent by ${npc.name}.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert(`Referral DM sent by ${npc.name}. Open Instagram > DM inbox.`);
  };

  const triggerInstagramBrandDM = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const state = player.instagram.npcStates[npc.id] || {
          npcId: npc.id,
          isFollowing: true,
          isFollowedBy: true,
          relationshipScore: 25,
          relationshipLevel: 'ACQUAINTANCE',
          lastInteractionWeek: player.currentWeek,
          hasMet: false,
          chatHistory: []
      };
      const offer: SponsorshipOffer = {
          id: `cheat_ig_brand_${Date.now()}`,
          brandName: 'FrameTheory',
          category: 'FASHION',
          weeklyPay: 750,
          durationWeeks: 4,
          requirements: { type: 'POST', energyCost: 8, totalRequired: 2, progress: 0 },
          isExclusive: false,
          penalty: 1200,
          description: 'Cheat micro Instagram campaign for QA.',
          expiresIn: 3,
          weeksCompleted: 0
      };
      const actionId = `cheat_ig_brand_action_${Date.now()}`;

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 18), followers: Math.max(player.stats.followers, 2000) },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 2000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 65),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 45),
              npcStates: {
                  ...player.instagram.npcStates,
                  [npc.id]: {
                      ...state,
                      isFollowing: true,
                      isFollowedBy: true,
                      chatHistory: [
                          ...(state.chatHistory || []),
                          {
                              sender: 'NPC' as const,
                              text: `Quick brand thing. FrameTheory likes your Instagram vibe and asked if I could connect you. Small campaign, clean brief. Interested?`,
                              timestamp: Date.now(),
                              tag: 'CHEAT_IG_BRAND',
                              action: { id: actionId, kind: 'IG_BRAND_OFFER' as const, status: 'PENDING' as const, payload: { offer } }
                          }
                      ]
                  }
              }
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `📱 CHEAT: Instagram brand DM sent by ${npc.name}.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert(`Brand DM sent by ${npc.name}. Open Instagram > DM inbox.`);
  };

  const triggerInstagramCooldownReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          flags: {
              ...player.flags,
              lastInstagramMicroEventAbsWeek: 0,
              lastInstagramDmOfferAbsWeek: 0,
              pendingInstagramReferrals: []
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔄 CHEAT: Instagram cooldowns reset.`, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('Instagram cooldowns reset. Age up to test organic IG events/DMs.');
  };

  const triggerInstagramUnlockComposer = () => {
      if (!onUpdatePlayer) return;
      const activeRelease = {
          id: `cheat_ig_release_${Date.now()}`,
          projectId: `cheat_ig_project_${Date.now()}`,
          title: 'Cheat Premiere Night',
          role: 'LEAD',
          genre: 'DRAMA',
          budget: 45000000,
          marketingBudget: 15000000,
          initialBuzz: 72,
          currentBuzz: 72,
          boxOffice: 125000000,
          reviews: 82,
          audienceScore: 88,
          weeksInRelease: 2,
          status: 'RUNNING',
          studio: 'Cheat Pictures',
          releaseStrategy: 'THEATRICAL',
          maxTheatricalWeeks: 12
      } as unknown as ActiveRelease;

      const relationship = {
          id: `cheat_ig_romance_${Date.now()}`,
          name: 'Avery Stone',
          age: player.age,
          gender: 'FEMALE',
          relation: 'Partner',
          closeness: 72,
          image: getGenderedAvatar('FEMALE', 'Avery Stone'),
          lastInteractionWeek: player.currentWeek,
          occupation: 'Actor',
          status: 'DATING',
          relationship: 72,
          happiness: 70,
          avatar: getGenderedAvatar('FEMALE', 'Avery Stone')
      } as unknown as Relationship;

      onUpdatePlayer({
          ...player,
          energy: { ...player.energy, current: Math.max(player.energy.current, 100) },
          stats: {
              ...player.stats,
              fame: Math.max(player.stats.fame, 35),
              followers: Math.max(player.stats.followers, 5000)
          },
          instagram: {
              ...player.instagram,
              followers: Math.max(player.instagram.followers || 0, 5000),
              aesthetic: Math.max(player.instagram.aesthetic || 50, 70),
              fashionInfluence: Math.max(player.instagram.fashionInfluence || 10, 55)
          },
          commitments: player.commitments.some(commitment => commitment.type === 'ACTING_GIG' && commitment.projectPhase === 'PRODUCTION')
              ? player.commitments
              : [
                  {
                      id: `cheat_ig_commit_${Date.now()}`,
                      type: 'ACTING_GIG',
                      title: 'Cheat On-Set Role',
                      role: 'Lead',
                      startWeek: player.currentWeek,
                      endWeek: player.currentWeek + 8,
                      projectPhase: 'PRODUCTION',
                      salary: 250000,
                      data: { genre: 'ACTION' }
                  } as unknown as Commitment,
                  ...player.commitments
              ],
          activeReleases: player.activeReleases.length > 0 ? player.activeReleases : [activeRelease],
          relationships: player.relationships.some(rel => rel.status === 'DATING' || rel.status === 'MARRIED')
              ? player.relationships
              : [relationship, ...player.relationships],
          logs: [{ week: player.currentWeek, year: player.age, message: `📸 CHEAT: Instagram composer unlock conditions enabled.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('Instagram composer test kit ready: BTS, Announcement, Red Carpet, Couple, Brand Fit, and Release posts should be unlocked.');
  };

  const triggerXBootstrap = () => {
      if (!onUpdatePlayer) return;
      const npc = getInstagramCheatNpc();
      const now = Date.now();
      const playerPosts: XPost[] = [
          {
              id: `cheat_x_player_${now}_1`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.x.handle,
              authorAvatar: '',
              content: 'Cheat setup: X Studio is ready for compose, post detail, replies, quotes, and timeline QA.',
              timestamp: player.currentWeek,
              likes: 18500,
              retweets: 4200,
              replies: 1300,
              isPlayer: true,
              isLiked: false,
              isRetweeted: false,
              isVerified: true,
              postType: 'CAREER',
              replyList: ['Booked and busy era?', 'This sounds bigger than people realize.', 'The resume is moving.'],
              quoteList: ['Someone in casting definitely saw this.', 'The timeline likes a clean career update.'],
              controversyScore: 0,
              sentiment: 'INDUSTRY'
          },
          {
              id: `cheat_x_player_${now}_2`,
              authorId: 'PLAYER',
              authorName: player.name,
              authorHandle: player.x.handle,
              authorAvatar: '',
              content: 'Hot take: the best movie stars are built by weird career choices, not perfect PR.',
              timestamp: player.currentWeek,
              likes: 42000,
              retweets: 9800,
              replies: 6100,
              isPlayer: true,
              isLiked: false,
              isRetweeted: false,
              isVerified: true,
              postType: 'HOT_TAKE',
              replyList: ['The quotes are about to be a war zone.', 'Honestly? Not completely wrong.', 'Delete this before brunch.'],
              quoteList: ['Film Twitter found its lunch today.', 'This is messy but the point is there.'],
              controversyScore: 9,
              sentiment: 'MESSY'
          }
      ];
      const npcPost: XPost = {
          id: `cheat_x_npc_${now}`,
          authorId: npc.id,
          authorName: npc.name,
          authorHandle: npc.handle,
          authorAvatar: npc.avatar,
          content: `${player.name} is having one of those weeks where the timeline starts paying attention.`,
          timestamp: player.currentWeek,
          likes: 65000,
          retweets: 15000,
          replies: 3200,
          isPlayer: false,
          isLiked: false,
          isRetweeted: false,
          isVerified: true,
          postType: 'CAREER',
          replyList: ['The industry group chat is awake.', 'Interesting timing.', 'Casting directors are watching.'],
          quoteList: ['This has layers.', 'The replies are doing analysis now.'],
          controversyScore: 3,
          sentiment: 'INDUSTRY'
      };

      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.max(player.stats.fame, 45), reputation: Math.max(player.stats.reputation, 55) },
          x: {
              ...player.x,
              followers: Math.max(player.x.followers || 0, 45000),
              posts: [...playerPosts, ...player.x.posts].slice(0, 80),
              feed: [npcPost, ...playerPosts, ...player.x.feed].slice(0, 80),
              lastPostWeek: player.currentWeek
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `𝕏 CHEAT: X QA profile boosted with feed/detail posts.`, type: 'positive' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('X QA profile boosted. Open Phone > X to test feed, profile, compose, and post detail.');
  };

  const triggerXDramaPost = () => {
      if (!onUpdatePlayer) return;
      const npc = NPC_DATABASE.find(entry => entry.tier === 'A_LIST') || getInstagramCheatNpc();
      const dramaPost: XPost = {
          id: `cheat_x_drama_${Date.now()}`,
          authorId: npc.id,
          authorName: npc.name,
          authorHandle: npc.handle,
          authorAvatar: npc.avatar,
          content: `Not every viral actor needs to be in every franchise. Some timelines need to breathe.`,
          timestamp: player.currentWeek,
          likes: 128000,
          retweets: 34000,
          replies: 22000,
          isPlayer: false,
          isLiked: false,
          isRetweeted: false,
          isVerified: true,
          postType: 'HOT_TAKE',
          replyList: ['The quotes are about to be a war zone.', 'This is absolutely about someone.', 'PR teams just stood up.'],
          quoteList: ['The timeline decoded this instantly.', 'This is why X is dangerous.'],
          controversyScore: 12,
          sentiment: 'MESSY'
      };

      onUpdatePlayer({
          ...player,
          energy: { ...player.energy, current: Math.max(player.energy.current, 50) },
          x: {
              ...player.x,
              followers: Math.max(player.x.followers || 0, 2500),
              feed: [dramaPost, ...player.x.feed].slice(0, 80),
              lastPostWeek: player.currentWeek
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `🔥 CHEAT: X drama post added for reply/quote testing.`, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('X drama post added. Open X, tap the post, then test reply/quote tones.');
  };

  const triggerXSmallCreatorReset = () => {
      if (!onUpdatePlayer) return;
      onUpdatePlayer({
          ...player,
          stats: { ...player.stats, fame: Math.min(player.stats.fame, 12) },
          x: {
              ...player.x,
              followers: 25,
              posts: [],
              feed: [],
              lastPostWeek: 0
          },
          logs: [{ week: player.currentWeek, year: player.age, message: `𝕏 CHEAT: X reset to small-account grind state.`, type: 'neutral' }, ...player.logs].slice(0, 50)
      });
      setActiveCheatMenu('NONE');
      alert('X reset to small-account test state.');
  };

  const ensureCheatStudio = () => {
      const existingStudio = player.businesses.find(b => b.type === 'PRODUCTION_HOUSE');
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
                  businesses: player.businesses.map(b => b.id === existingStudio.id ? boostedStudio : b),
                  logs: [{ week: player.currentWeek, year: player.age, message: `🏢 CHEAT: ${boostedStudio.name} funded for studio QA.`, type: 'positive' }, ...player.logs].slice(0, 50)
              },
              studio: boostedStudio
          };
      }

      const newStudio = createBusiness(
          'Cheat Test Studios',
          'PRODUCTION_HOUSE',
          'MAJOR_STUDIO',
          { quality: 'LUXURY', pricing: 'HIGH', marketing: 'HIGH' },
          '🎬',
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
              businesses: [...player.businesses, fundedStudio],
              logs: [{ week: player.currentWeek, year: player.age, message: `🏢 CHEAT: Cheat Test Studios created for studio QA.`, type: 'positive' }, ...player.logs].slice(0, 50)
          },
          studio: fundedStudio
      };
  };

  const triggerStudioBootstrap = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer } = ensureCheatStudio();
      onUpdatePlayer(updatedPlayer);
      setActiveCheatMenu('NONE');
      alert("Studio QA setup ready: production house created/funded.");
  };

  const triggerStudioBootstrapAndOpen = () => {
      if (!onUpdatePlayer) return;
      const { updatedPlayer } = ensureCheatStudio();
      onUpdatePlayer(updatedPlayer);
      setActiveCheatMenu('NONE');
      onOpenProductionHouseCheat?.();
  };

  const triggerStudioScenario = (scenario: 'PLANNING' | 'PRODUCTION' | 'AWAITING_RELEASE' | 'THEATRICAL_TO_BIDDING' | 'STREAMING_EXIT') => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const usedTitles = [
          ...basePlayer.commitments.map(c => c.name),
          ...basePlayer.activeReleases.map(r => r.name),
          ...basePlayer.pastProjects.map(p => p.name)
      ];

      const project = generateProjectDetails('HIGH', 'MOVIE', usedTitles, basePlayer);
      project.title =
          scenario === 'PLANNING' ? 'Cheat Studio Movie (Planning)' :
          scenario === 'PRODUCTION' ? 'Cheat Studio Movie (Production)' :
          scenario === 'AWAITING_RELEASE' ? 'Cheat Studio Movie (Release Ready)' :
          scenario === 'THEATRICAL_TO_BIDDING' ? 'Cheat Studio Movie (Theatrical Finale)' :
          'Cheat Studio Movie (Streaming Exit)';
      project.studioId = studio.id;
      project.visibleHype = 'HIGH';
      project.hiddenStats.rawHype = 90;
      project.hiddenStats.qualityScore = 88;
      project.hiddenStats.scriptQuality = 86;
      project.hiddenStats.directorQuality = 84;
      project.hiddenStats.castingStrength = 82;

      let nextPlayer = { ...basePlayer };

      if (scenario === 'THEATRICAL_TO_BIDDING') {
          nextPlayer.activeReleases = [
              {
                  id: `cheat_studio_rel_${Date.now()}`,
                  name: project.title,
                  type: 'MOVIE',
                  roleType: 'LEAD',
                  projectDetails: {
                      ...project,
                      releaseStrategy: 'THEATRICAL',
                      releaseDate: player.currentWeek - 10
                  },
                  distributionPhase: 'THEATRICAL',
                  weekNum: 12,
                  weeklyGross: [120000000, 85000000, 60000000, 42000000],
                  totalGross: 307000000,
                  budget: project.estimatedBudget || 150000000,
                  status: 'RUNNING',
                  imdbRating: 8.1,
                  productionPerformance: 91,
                  promotionalBuzz: 32,
                  maxTheatricalWeeks: 12
              } as any,
              ...nextPlayer.activeReleases
          ];
      } else if (scenario === 'STREAMING_EXIT') {
          nextPlayer.activeReleases = [
              {
                  id: `cheat_stream_exit_${Date.now()}`,
                  name: project.title,
                  type: 'MOVIE',
                  roleType: 'LEAD',
                  projectDetails: {
                      ...project,
                      releaseStrategy: 'STREAMING_ONLY',
                      releaseDate: player.currentWeek - 20,
                      hiddenStats: {
                          ...project.hiddenStats,
                          platformId: 'NETFLIX'
                      }
                  },
                  distributionPhase: 'STREAMING',
                  weekNum: 1,
                  weeklyGross: [],
                  totalGross: 220000000,
                  budget: project.estimatedBudget || 150000000,
                  status: 'FINISHED',
                  imdbRating: 7.8,
                  productionPerformance: 88,
                  streamingRevenue: 18000000,
                  streaming: {
                      platformId: 'NETFLIX',
                      weekOnPlatform: 5,
                      totalViews: 12000000,
                      weeklyViews: [5500000, 2100000, 900000, 240000],
                      isLeaving: false
                  }
              } as any,
              ...nextPlayer.activeReleases
          ];
      } else {
          const commitment: Commitment = {
              id: `cheat_studio_commit_${Date.now()}`,
              name: project.title,
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              energyCost: 0,
              income: 0,
              lumpSum: 5000000,
              payoutType: 'LUMPSUM',
              projectDetails: scenario === 'AWAITING_RELEASE'
                  ? {
                      ...project,
                      releaseStrategy: 'THEATRICAL',
                      screeningStrategy: 'NATIONAL',
                      releaseDate: player.currentWeek + 1
                  }
                  : project,
              projectPhase: scenario,
              phaseWeeksLeft: scenario === 'PLANNING' ? 1 : scenario === 'PRODUCTION' ? 1 : 1,
              totalPhaseDuration: 1,
              auditionPerformance: 100,
              productionPerformance: 90,
              promotionalBuzz: 25
          };
          nextPlayer.commitments = [commitment, ...nextPlayer.commitments];
      }

      nextPlayer.logs = [{
          week: nextPlayer.currentWeek,
          year: nextPlayer.age,
          message: `🎬 CHEAT: Added studio QA scenario (${scenario.replace('_', ' ')}).`,
          type: 'positive'
      }, ...nextPlayer.logs].slice(0, 50);

      onUpdatePlayer(nextPlayer);
      setActiveCheatMenu('NONE');
      alert(`Studio QA scenario ready: ${scenario.replace(/_/g, ' ')}. Age Up once for the result.`);
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

  // Calculate energy drain: Exclude ACTING_GIG as per new game rules
  const commitmentDrain = player.commitments.reduce((sum, c) => {
      // Movies do not drain weekly energy passively
      if (c.type === 'ACTING_GIG') return sum;
      return sum + c.energyCost;
  }, 0);
  // Removed business drain from visual calculation
  const weeklyDrain = commitmentDrain;


  return (
    <div className="space-y-6 pb-24 pt-4 relative">
      
      {/* PASSWORD PROMPT OVERLAY */}
      {showPasswordPrompt && (
          <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in duration-200">
              <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-xs p-6 shadow-2xl flex flex-col items-center text-center">
                  <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center mb-4 text-zinc-400">
                      <Lock size={20} />
                  </div>
                  <h3 className="text-white font-bold text-lg mb-1">Developer Access</h3>
                  <p className="text-zinc-500 text-xs mb-6">Enter secure access code to proceed.</p>
                  
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
              <div className="bg-zinc-900 border border-zinc-700 rounded-3xl w-full max-w-sm max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
                  <div className="p-4 border-b border-zinc-700 flex justify-between items-center bg-zinc-800/50">
                      <div className="flex items-center gap-2 font-bold uppercase tracking-widest text-sm text-amber-500">
                          <Sliders size={16} /> Dev Tools
                      </div>
                      <button onClick={() => setActiveCheatMenu('NONE')} className="p-1 hover:bg-white/10 rounded-full">
                          <X size={20} className="text-zinc-400" />
                      </button>
                  </div>
                  
                  <div className="p-5 overflow-y-auto custom-scrollbar space-y-6">
                      
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
                                  <button onClick={() => triggerStudioScenario('PLANNING')} className="bg-zinc-800 hover:bg-zinc-700 text-xs font-bold py-3 rounded-lg text-white">
                                      Planning to Pre-Prod
                                  </button>
                                  <button onClick={() => triggerStudioScenario('PRODUCTION')} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-400">
                                      Production to Post
                                  </button>
                                  <button onClick={() => triggerStudioScenario('AWAITING_RELEASE')} className="bg-emerald-900/30 hover:bg-emerald-900/50 border border-emerald-500/30 text-xs font-bold py-3 rounded-lg text-emerald-400">
                                      Release Next Week
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
                                 <FastForward size={10} /> Scenario Triggers
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  <button onClick={triggerAwardInvite} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400 flex items-center justify-center gap-2">
                                      <Mail size={14}/> Receive Award Invite (Next Week)
                                  </button>
                                  <button onClick={triggerAwardCeremony} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 text-xs font-bold py-3 rounded-lg text-zinc-300 flex items-center justify-center gap-2">
                                      <Trophy size={14}/> Force Award Ceremony (Instant)
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
                              </div>
                          </div>
                      )}

                      {/* DEV ONLY: Money & Energy */}
                      {activeCheatMenu === 'DEV' && (
                          <>
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
                                          <label className="text-xs font-bold text-zinc-400 capitalize">{genre.toLowerCase().replace('_', ' ')}</label>
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

                  </div>
                  <div className="p-4 border-t border-zinc-800 bg-zinc-900">
                      <button onClick={() => setActiveCheatMenu('NONE')} className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-zinc-200">
                          Apply & Close
                      </button>
                  </div>
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
                          <div className="text-xs text-zinc-500 mt-1">Choose a preset or upload a custom photo.</div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                          <button
                              onClick={handleSaveAvatar}
                              disabled={!selectedAvatar || isCompressing || !onUpdatePlayer}
                              className="px-4 py-2 rounded-full bg-amber-500 text-black font-black text-xs uppercase tracking-[0.18em] hover:bg-amber-400 transition-colors disabled:opacity-50"
                          >
                              Save
                          </button>
                          <button onClick={() => setShowAvatarEditor(false)} className="p-2 rounded-full bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                              <X size={18} />
                          </button>
                      </div>
                  </div>

                  <div
                      className="min-h-0 flex-1 overflow-y-auto p-5 space-y-5"
                      style={{ paddingBottom: 'max(calc(env(safe-area-inset-bottom) + 1rem), 1.5rem)' }}
                  >
                      <div className="flex flex-col items-center">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="relative group">
                              <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-tr from-amber-400 via-amber-500 to-amber-700 shadow-[0_0_30px_rgba(245,158,11,0.18)]">
                                  {isCompressing ? (
                                      <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center border-4 border-black">
                                          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                                      </div>
                                  ) : (
                                      <img src={selectedAvatar} alt={player.name} className="w-full h-full rounded-full object-cover border-4 border-black bg-zinc-900" />
                                  )}
                              </div>
                              <div className="absolute bottom-0 right-0 rounded-full bg-white text-black border-4 border-black p-2 group-hover:bg-amber-100 transition-colors">
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
                          {avatarError && <div className="mt-2 text-xs text-rose-300">{avatarError}</div>}
                      </div>

                      <div className="rounded-[1.75rem] border border-zinc-800 bg-zinc-950/80 p-4">
                          <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em] mb-3">Preset Looks</div>
                          <div className="grid grid-cols-5 gap-3 max-h-[48dvh] overflow-y-auto custom-scrollbar pr-1">
                              {currentAvatarList.map((avatarUrl, idx) => {
                                  const isSelected = selectedAvatar === avatarUrl;
                                  return (
                                      <button
                                          key={idx}
                                          type="button"
                                          onClick={() => { setSelectedAvatar(avatarUrl); setIsCustomUpload(false); }}
                                          className={`relative aspect-square rounded-2xl overflow-hidden transition-all ${isSelected ? 'ring-2 ring-amber-500 scale-105 z-10' : 'opacity-70 hover:opacity-100 hover:scale-[1.03]'}`}
                                      >
                                          <img src={avatarUrl} alt="preset avatar" className="w-full h-full object-cover bg-zinc-900" />
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
              </div>
          </div>
      )}

      {/* Premium Profile Header */}
      <div className="relative glass-card p-6 rounded-3xl overflow-hidden group">
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
                <h1 className="text-3xl font-bold text-white tracking-tight truncate">{player.name}</h1>
                <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-medium text-amber-400 uppercase tracking-widest border border-amber-900/50 bg-amber-950/30 px-2 py-1 rounded">Actor</span>
                </div>
                <div className="flex items-center gap-1 mt-3 text-emerald-400 font-mono text-lg font-bold truncate">
                    {formatMoney(player.money)}
                </div>
            </div>
            
            <div className="flex flex-col items-center justify-center pl-4 border-l border-white/5 shrink-0">
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold mb-1">Week</div>
                <div className="text-3xl font-light text-white">{player.currentWeek}</div>
                <div className="text-[10px] text-zinc-600">of 52</div>
                
                {/* SETTINGS AND STORE BUTTONS */}
                <div className="flex gap-1 mt-2">
                    {(player.bloodline && player.bloodline.length > 0) || player.relationships.some(rel => rel.relation === 'Child') ? (
                        <button
                            onClick={() => setPage && setPage(Page.SOCIAL)}
                            className="p-1.5 bg-amber-900/50 hover:bg-amber-800/50 rounded-full text-amber-400 hover:text-white transition-colors"
                            title="View Legacy"
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
      <div className="glass-card p-5 rounded-3xl relative overflow-hidden">
         <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                <Zap className="text-amber-400 fill-amber-400" size={14} /> Energy
            </h2>
            <span className="text-xs text-zinc-500 font-mono">
                <span className="text-white">{player.energy.current}</span> / {100 - weeklyDrain} MAX
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
      </div>

      {/* Stats Section Redesign */}
      <div className="space-y-4">
          
          {/* Personal Condition */}
          <div className="glass-card p-5 rounded-3xl space-y-3">
              <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Activity size={12} /> Personal Condition
              </h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  <StatsBar label="Health" value={player.stats.health} color="bg-rose-500" icon={<Heart size={12}/>} />
                  <StatsBar label="Physique" value={player.stats.body} color="bg-amber-500" icon={<Dumbbell size={12}/>} />
                  <StatsBar label="Mood" value={player.stats.happiness} color="bg-teal-400" icon={<Smile size={12}/>} />
                  <StatsBar label="Looks" value={player.stats.looks} color="bg-purple-500" icon={<Sparkles size={12}/>} />
              </div>
          </div>

          {/* Career Metrics */}
          <div className="grid grid-cols-2 gap-4">
              <div className="glass-card p-5 rounded-3xl space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Brain size={12} /> Skills
                  </h3>
                  <StatsBar label="Talent" value={player.stats.talent} color="bg-indigo-500" icon={<Brain size={12}/>} />
                  <StatsBar label="Experience" value={player.stats.experience} color="bg-violet-500" icon={<TrendingUp size={12}/>} />
              </div>
              <div className="glass-card p-5 rounded-3xl space-y-3">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                      <Star size={12} /> Status
                  </h3>
                  <StatsBar label="Reputation" value={player.stats.reputation} color="bg-blue-500" icon={<Trophy size={12}/>} />
                  <StatsBar label="Fame" value={player.stats.fame} color="bg-gradient-to-r from-yellow-400 to-yellow-600" icon={<Star size={12}/>} />
              </div>
          </div>
      </div>

      {/* Activity Log - Terminal Style */}
      <div className="glass-card p-5 rounded-3xl h-48 flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-zinc-700 to-transparent opacity-50"></div>
        <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Live Feed
        </h3>
        <div ref={logContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar mask-image-gradient">
            {player.logs.map((log, idx) => (
                <div key={idx} className={`text-sm leading-relaxed border-l-2 pl-3 ${
                    log.type === 'positive' ? 'border-emerald-500/50 text-emerald-100' : 
                    log.type === 'negative' ? 'border-rose-500/50 text-rose-100' : 'border-zinc-700 text-zinc-400'
                }`}>
                    <span className="text-zinc-600 text-[10px] font-mono mr-2 block uppercase">Year {log.year} • Week {log.week}</span>
                    {log.message}
                </div>
            ))}
        </div>
      </div>

      {/* Main Action Button */}
      <button
        onClick={onNextWeek}
        disabled={isProcessing}
        className={`w-full py-5 rounded-2xl font-bold text-lg shadow-xl shadow-amber-900/20 transform active:scale-[0.98] transition-all flex items-center justify-center gap-3 border border-white/10 ${
            isProcessing 
            ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed' 
            : 'bg-gradient-to-br from-amber-500 to-amber-700 text-white hover:brightness-110 relative overflow-hidden group'
        }`}
      >
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 blur-xl"></div>
        {isProcessing ? (
            <span className="animate-pulse">Processing Week...</span>
        ) : (
            <>
                <Calendar size={22} /> Age Up Week
            </>
        )}
      </button>
    </div>
  );
};
