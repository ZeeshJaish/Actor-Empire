
import React, { useRef, useEffect, useState } from 'react';
import { Player, ActorSkills, Commitment, ActiveRelease, ScheduledEvent, Message, AuditionOpportunity, NegotiationData, UniverseContract, UniverseId, Page, Genre, Relationship } from '../types';
import { formatMoney } from '../services/formatUtils';
import { StatsBar } from '../components/StatsBar';
import { generateProjectDetails } from '../services/roleLogic';
import { generateDirectEntryOffer } from '../services/universeLogic'; 
import { generateLifeEvent } from '../services/lifeEventLogic';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getGenderedAvatar } from '../services/npcLogic';
import { Heart, Smile, Star, Zap, DollarSign, Brain, Calendar, Activity, TrendingUp, Trophy, X, Sliders, Users, Film, Tv, PlayCircle, Lock, FastForward, Key, AlertTriangle, Mic2, Mail, FileText, Dumbbell, Sparkles, Settings, ShoppingCart, Clapperboard, ZapOff, Crown } from 'lucide-react';

interface HomePageProps {
  player: Player;
  onNextWeek: () => void;
  isProcessing: boolean;
  onUpdatePlayer?: (player: Player) => void;
  setPage?: (page: Page) => void;
}

const CHEAT_GENRES: Genre[] = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO'];
const DEV_TOOLS_PASSCODE = import.meta.env.VITE_DEV_TOOLS_PASSCODE || 'actor-dev';

export const HomePage: React.FC<HomePageProps> = ({ player, onNextWeek, isProcessing, onUpdatePlayer, setPage }) => {
  const logContainerRef = useRef<HTMLDivElement>(null);
  
  // Cheat Menu State
  const [activeCheatMenu, setActiveCheatMenu] = useState<'NONE' | 'DEV'>('NONE');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  const clickCountRef = useRef(0);
  const lastClickRef = useRef(0);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [player.logs]);

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
        setShowPasswordPrompt(true);
        setPasswordInput('');
        setPasswordError(false);
        clickCountRef.current = 0;
    }
  };

  const handleUnlockDevTools = () => {
      if (passwordInput === DEV_TOOLS_PASSCODE) {
          setShowPasswordPrompt(false);
          setActiveCheatMenu('DEV');
      } else {
          setPasswordError(true);
          setPasswordInput('');
          setTimeout(() => setPasswordError(false), 500);
      }
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
          phaseWeeksLeft: 2,
          totalPhaseDuration: 4,
          projectDetails: project
      };

      onUpdatePlayer({
          ...player,
          commitments: [newCommitment, ...player.commitments],
          logs: [{ week: player.currentWeek, year: player.age, message: `🎬 CHEAT: Added ${type} in Post-Production.`, type: 'positive' }, ...player.logs]
      });
      setActiveCheatMenu('NONE');
      alert(`Added ${type} to Active Slate in Post-Production.`);
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
                                 <Crown size={10} /> Legacy Test Tools
                              </h4>
                              <div className="grid grid-cols-1 gap-2">
                                  <button onClick={addLegacyTestChild} className="bg-amber-900/30 hover:bg-amber-900/50 border border-amber-500/30 text-xs font-bold py-3 rounded-lg text-amber-400 flex items-center justify-center gap-2">
                                      <Users size={14}/> Add Test Child
                                  </button>
                                  <button onClick={ageOldestChildToPlayable} className="bg-blue-900/30 hover:bg-blue-900/50 border border-blue-500/30 text-xs font-bold py-3 rounded-lg text-blue-400 flex items-center justify-center gap-2">
                                      <FastForward size={14}/> Make Oldest Child 18
                                  </button>
                                  <button onClick={setupLegacyDeathScenario} className="bg-rose-900/30 hover:bg-rose-900/50 border border-rose-500/30 text-xs font-bold py-3 rounded-lg text-rose-400 flex items-center justify-center gap-2">
                                      <Crown size={14}/> Setup Legacy Death Test
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
