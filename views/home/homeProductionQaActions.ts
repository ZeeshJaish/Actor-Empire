import type {
  ActiveRelease,
  AuditionOpportunity,
  Commitment,
  Message,
  NegotiationData,
  Player,
  ScheduledEvent,
  UniverseId,
} from '../../types';
import { generateProjectDetails } from '../../services/roleLogic';
import {
  generateDirectEntryOffer,
  getUniverseTemplateGenre,
  getUniverseTemplateStudioName,
} from '../../services/universeLogic';

export interface HomeProductionQaActionsProps {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  closeMenu: () => void;
}

export const createHomeProductionQaActions = ({
  player,
  onUpdatePlayer,
  closeMenu,
}: HomeProductionQaActionsProps) => {
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
    closeMenu();
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
    closeMenu();
    alert("Cheat Active: 'The Avenger Returns' (Sequel) added to Post-Production. Age Up to Release.");
  };

  const triggerAwardCeremony = () => {
      if (!onUpdatePlayer) return;
      
      const dummyNomination = {
          project: { id: 'cheat_proj_award', name: 'The Last Horizon', roleType: 'LEAD', year: player.age } as any,
          score: 100,
          category: 'Best Actor'
      };

      const eventData: ScheduledEvent = {
          id: `evt_cheat_${Date.now()}`,
          week: player.currentWeek,
          type: 'AWARD_CEREMONY',
          title: 'The Golden Statues',
          description: 'The biggest night in Hollywood.',
          data: {
              awardDef: { type: 'ACADEMY', name: 'The Golden Statues', prestige: 3.0 },
              nominations: [dummyNomination]
          }
      };

      onUpdatePlayer({
          ...player,
          pendingEvent: eventData
      });
      closeMenu();
  };

  const triggerAwardsPolishQa = () => {
      if (!onUpdatePlayer) return;

      const project = { id: `cheat_awards_polish_${Date.now()}`, name: 'Crown of Stars' };
      const makePlayerNomination = (category: string, playerCreditRole: 'ACTOR' | 'WRITER' | 'DIRECTOR' | 'PRODUCER') => ({
          project,
          score: 118,
          category,
          isPlayer: true,
          nomineeName: player.name,
          playerCreditRole
      });
      const makeNpcNomination = (category: string, index: number, score: number) => ({
          project: { id: `npc_awards_polish_${category.replace(/\W+/g, '_')}_${index}`, name: ['Silver Meridian', 'Glass Orchard', 'Velvet Hour', 'Neon Witness'][index] || `Rival Project ${index + 1}` },
          score,
          category,
          isPlayer: false,
          nomineeName: ['Mara Voss', 'Julian Cross', 'Nadia Frost', 'Cole Mercer'][index] || `Rival ${index + 1}`
      });
      const playerNominations = [
          makePlayerNomination('Best Actor', 'ACTOR'),
          makePlayerNomination('Best Original Screenplay', 'WRITER'),
          makePlayerNomination('Best Director', 'DIRECTOR'),
          makePlayerNomination('Best Picture', 'PRODUCER')
      ];
      const fullBallot = playerNominations.reduce<Record<string, any[]>>((ballot, nomination) => {
          ballot[nomination.category] = [
              nomination,
              makeNpcNomination(nomination.category, 0, 91),
              makeNpcNomination(nomination.category, 1, 88),
              makeNpcNomination(nomination.category, 2, 84),
              makeNpcNomination(nomination.category, 3, 80)
          ];
          return ballot;
      }, {});

      const eventData: ScheduledEvent = {
          id: `evt_awards_polish_qa_${Date.now()}`,
          week: player.currentWeek,
          type: 'AWARD_CEREMONY',
          title: 'Golden Statues Night',
          description: 'A prestige ceremony spotlighting actor, writer, director, and producer recognition.',
          data: {
              awardDef: { type: 'OSCAR', name: 'The Golden Statues', prestige: 3.0 },
              awardYear: player.age,
              nominations: playerNominations,
              fullBallot
          }
      };

      const qaPastProject = {
          id: project.id,
          name: project.name,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: player.age,
          earnings: 0,
          rating: 9.4,
          reception: 'AWARDS_QA',
          projectQuality: 96,
          imdbRating: 9.4,
          boxOfficeResult: '$180.0M',
          outcomeTier: 'BLOCKBUSTER',
          subtype: 'STANDALONE',
          futurePotential: {
              sequelChance: 0,
              franchiseChance: 0,
              rebootChance: 0,
              renewalChance: 0,
              isFranchiseStarter: false,
              isSequelGreenlit: false,
              isRenewed: false,
              seriesStatus: 'N/A'
          },
          studioId: 'ARTISAN_PICTURES',
          budget: 40_000_000,
          gross: 180_000_000,
          genre: 'DRAMA',
          projectType: 'MOVIE',
          sourceScriptId: 'cheat_awards_polish_script',
          isOriginal: true,
          directorId: 'player',
          awards: []
      } as any;

      onUpdatePlayer({
          ...player,
          pastProjects: [qaPastProject, ...player.pastProjects.filter(item => item.id !== project.id)],
          pendingEvent: eventData
      });
      closeMenu();
      alert('Award night is ready: actor, writer, director, and producer categories are queued in one ceremony.');
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
      closeMenu();
      alert("✅ Invitation sent to Inbox! Check Messages to accept, then Age Up to trigger the event.");
  };

  // --- NEW: TRIGGER CONTRACT OFFERS ---
  const triggerCheatContract = (type: 'FIXED' | 'ROYALTY') => {
      if (!onUpdatePlayer) return;
      
      const usedTitles = player.commitments.map(c => c.name);
      const project = generateProjectDetails('HIGH', 'MOVIE', usedTitles, player);
      project.title = type === 'ROYALTY' ? "The Last Horizon" : "Silver Meridian";
      
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
              sender: 'Atlas Casting',
              subject: `Negotiation: ${project.title}`,
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
              sender: 'Atlas Casting',
              subject: `Offer: ${project.title}`,
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
      closeMenu();
      alert('Film contract sent to inbox.');
  };

  const triggerCheatFranchiseContract = (universeId: UniverseId) => {
      if (!onUpdatePlayer) return;

      const contract = generateDirectEntryOffer(player, universeId);
      const project = generateProjectDetails('HIGH', 'MOVIE', [], player);
      project.title = contract.films[0].title;
      project.universeId = universeId;
      project.genre = getUniverseTemplateGenre(universeId);
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
          sender: getUniverseTemplateStudioName(universeId),
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
      closeMenu();
      alert(`${getUniverseTemplateStudioName(universeId)} Universe Contract Offer sent to Inbox.`);
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
      closeMenu();
      alert(`Added ${type} to Post-Production. Age Up once to send it to release strategy.`);
  };

  const triggerProductionCrisis = () => {
      const activeProject = player.commitments.find(c => c.projectPhase === 'PRODUCTION');
      if (!activeProject) {
          alert("You need a movie in PRODUCTION phase to trigger a crisis.");
          return;
      }
      
      import('../../services/productionService').then(({ checkForProductionCrisis }) => {
          // Force a crisis check with 100% success for dev trigger
          // We can't easily force checkForProductionCrisis to return something without changing it
          // So let's just use the logic directly or import the generator
          import('../../services/crisisGenerator').then(({ generateRandomCrisis }) => {
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
              closeMenu();
          });
      });
  };

  const triggerDirectorDecision = () => {
      const activeProject = player.commitments.find(c => c.projectPhase === 'PRODUCTION');
      if (!activeProject) {
          alert("You need a movie in PRODUCTION phase to trigger a decision.");
          return;
      }
      
      import('../../services/directorGenerator').then(({ generateDirectorDecision }) => {
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
          closeMenu();
      });
  };


  return {
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
  };
};

