import type {
  ActiveRelease,
  Commitment,
  Genre,
  Player,
  RareHollywoodChaosKind,
  UniverseId,
} from '../../types';
import { Page } from '../../types';
import { generateProjectDetails } from '../../services/roleLogic';
import { normalizeUniverseForSave } from '../../services/universeLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { getGenderedAvatar, NPC_DATABASE } from '../../services/npcLogic';
import { generateEpisodeRatings } from '../../services/episodeRatings';

type HomeQaStudio = Player['businesses'][number];

export interface HomeStudioProductionQaActionsProps {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  closeMenu: () => void;
  ensureCheatStudio: () => { updatedPlayer: Player; studio: HomeQaStudio };
  onOpenProductionHouseCheat?: () => void;
  setPage?: (page: Page) => void;
}

export const createHomeStudioProductionQaActions = ({
  player,
  onUpdatePlayer,
  closeMenu,
  ensureCheatStudio,
  onOpenProductionHouseCheat,
  setPage,
}: HomeStudioProductionQaActionsProps) => {
  const triggerLowConditionRestQa = () => {
      if (!onUpdatePlayer) return;

      onUpdatePlayer({
          ...player,
          money: Math.max(player.money, 100_000),
          energy: {
              ...player.energy,
              current: Math.max(player.energy.current, Math.min(player.energy.max || 100, 60))
          },
          stats: {
              ...player.stats,
              health: 4,
              happiness: Math.min(player.stats.happiness, 8),
              body: Math.min(player.stats.body, 12),
              looks: Math.min(player.stats.looks, 15)
          },
          flags: {
              ...player.flags,
              lastHealthCrisisAbsoluteWeek: 0,
              lastWellbeingAlertAbsoluteWeek: 0,
              lastConditionAlertAbsoluteWeek: 0
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: '🧪 CHEAT: Low-condition/rest QA loaded. Age up once to test hospital/rest recovery safety.',
              type: 'negative' as const
          }, ...player.logs].slice(0, 50)
      });

      closeMenu();
      alert('Low-condition QA loaded. Age Up Week once to test health crisis, hospital/rest feedback, and recovery handling.');
  };

  const sanitizeProductionHouseReturnDealsQa = () => {
      if (!onUpdatePlayer) return;

      const validRoles = new Set([
          'DIRECTOR',
          'LEAD_ACTOR',
          'SUPPORTING_ACTOR',
          'CINEMATOGRAPHER',
          'COMPOSER',
          'LINE_PRODUCER',
          'VFX_SUPERVISOR'
      ]);

      let removedDeals = 0;
      let cleanedConceptCast = 0;
      let cleanedScripts = 0;
      let cleanedConcepts = 0;
      const safeBusinesses = Array.isArray(player.businesses) ? player.businesses : [];
      const isReturnDealQaScript = (script: any) => {
          const scriptId = String(script?.id || '');
          const title = String(script?.title || script?.name || '').toLowerCase();
          const tags = Array.isArray(script?.tags) ? script.tags : [];
          return scriptId.startsWith('cheat_return_deal_script_')
              || tags.includes('RETURNING_TALENT_QA')
              || title.includes('return deal: iron monarch');
      };

      const repairedBusinesses = safeBusinesses.map((business: any) => {
          if (business.type !== 'PRODUCTION_HOUSE' || !business.studioState) {
              return business;
          }

          const rawScripts = Array.isArray(business.studioState.scripts) ? business.studioState.scripts : [];
          const seenScriptKeys = new Set<string>();
          const repairedScripts = rawScripts.filter((script: any) => {
              const scriptId = String(script?.id || '');
              const scriptKey = isReturnDealQaScript(script) ? 'RETURNING_TALENT_QA_SCRIPT' : scriptId;
              if (!scriptId || seenScriptKeys.has(scriptKey)) {
                  cleanedScripts += 1;
                  return false;
              }
              seenScriptKeys.add(scriptKey);
              return true;
          }).map((script: any) => {
              const safeGenres = Array.isArray(script.genres) && script.genres.length > 0
                  ? script.genres.filter(Boolean)
                  : [script.genre || 'DRAMA'];
              if (!Array.isArray(script.returningTalent)) {
                  return {
                      ...script,
                      title: script.title || script.name || 'Untitled Project',
                      projectType: script.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                      genres: safeGenres.length ? safeGenres : ['DRAMA'],
                      returningTalent: []
                  };
              }

              const seenDeals = new Set<string>();
              const returningTalent = script.returningTalent.filter((deal: any) => {
                  const role = String(deal?.role || '');
                  const id = String(deal?.id || '');
                  const key = `${role}:${id}:${deal?.characterId || deal?.characterName || ''}`;

                  if (!id || !validRoles.has(role)) {
                      removedDeals += 1;
                      return false;
                  }
                  if (seenDeals.has(key)) {
                      removedDeals += 1;
                      return false;
                  }

                  seenDeals.add(key);
                  return true;
              }).slice(0, 12).map((deal: any) => {
                  const id = String(deal.id || '');
                  const internalTalent = id === 'PLAYER_SELF' || id === 'STUDIO_STAFF' || id.startsWith('IN_HOUSE_');
                  return {
                      ...deal,
                      id,
                      role: String(deal.role || ''),
                      originalSalary: Math.max(0, Number.isFinite(Number(deal.originalSalary)) ? Number(deal.originalSalary) : Number(deal.newDemand || 0)),
                      newDemand: Math.max(0, Number.isFinite(Number(deal.newDemand)) ? Number(deal.newDemand) : Number(deal.originalSalary || 0)),
                      negotiated: internalTalent ? true : Boolean(deal.negotiated),
                      accepted: internalTalent ? true : Boolean(deal.accepted),
                      attemptsLeft: Math.max(0, Math.min(3, Number.isFinite(Number(deal.attemptsLeft)) ? Number(deal.attemptsLeft) : 3))
                  };
              });

              return {
                  ...script,
                  title: script.title || script.name || 'Untitled Project',
                  projectType: script.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
                  genres: safeGenres.length ? safeGenres : ['DRAMA'],
                  status: script.status || 'READY',
                  returningTalent
              };
          });

          const scriptIds = new Set(repairedScripts.map((script: any) => String(script.id)));
          const concepts = Array.isArray(business.studioState.concepts) ? business.studioState.concepts : [];
          const seenConceptKeys = new Set<string>();
          const repairedConcepts = concepts.filter((concept: any) => {
              const scriptId = String(concept?.scriptId || '');
              if (scriptId && scriptIds.size > 0 && !scriptIds.has(scriptId)) {
                  cleanedConcepts += 1;
                  return false;
              }
              const keptScript = repairedScripts.find((script: any) => String(script.id) === scriptId);
              const conceptKey = keptScript && isReturnDealQaScript(keptScript)
                  ? 'RETURNING_TALENT_QA_CONCEPT'
                  : String(concept?.id || scriptId || '');
              if (conceptKey && seenConceptKeys.has(conceptKey)) {
                  cleanedConcepts += 1;
                  return false;
              }
              if (conceptKey) {
                  seenConceptKeys.add(conceptKey);
              }
              return true;
          }).map((concept: any) => {
              if (!Array.isArray(concept.castList)) {
                  return concept;
              }

              const seenCast = new Set<string>();
              const castList = concept.castList.filter((cast: any) => {
                  const actorId = cast?.actorId || cast?.npcId || cast?.id;
                  const key = `${cast?.roleType || cast?.role || 'ROLE'}:${actorId || 'unknown'}:${cast?.characterName || ''}`;
                  if (!actorId || seenCast.has(key)) {
                      cleanedConceptCast += 1;
                      return false;
                  }
                  seenCast.add(key);
                  return true;
              });

              return { ...concept, castList };
          });

          return {
              ...business,
              studioState: {
                  ...business.studioState,
                  scripts: repairedScripts,
                  concepts: repairedConcepts
              }
          };
      });

      onUpdatePlayer({
          ...player,
          businesses: repairedBusinesses,
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `🧹 CHEAT: Production-house return deals repaired. Removed ${removedDeals} stale/duplicate deals, ${cleanedConceptCast} duplicate cast cards, ${cleanedScripts} duplicate scripts, and ${cleanedConcepts} stale drafts.`,
              type: (removedDeals || cleanedConceptCast || cleanedScripts || cleanedConcepts ? 'positive' : 'neutral') as 'positive' | 'neutral'
          }, ...player.logs].slice(0, 50)
      });

      closeMenu();
      alert(`Production-house repair complete.\nRemoved return deals: ${removedDeals}\nRemoved duplicate cast cards: ${cleanedConceptCast}\nRemoved duplicate scripts: ${cleanedScripts}\nRemoved stale drafts: ${cleanedConcepts}`);
  };

  const triggerReturningTalentNegotiationQa = (duplicateMultiplier = 1) => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const safeDuplicateMultiplier = Math.max(1, Math.min(duplicateMultiplier, 8));
      const franchiseId = `cheat_return_deal_franchise_${now}`;
      const scriptId = `cheat_return_deal_script_${now}`;
      const projectId = `cheat_return_deal_project_${now}`;
      const director = NPC_DATABASE.find(npc => npc.id === 'celeb_dir_1') || NPC_DATABASE.find(npc => npc.occupation === 'DIRECTOR');
      const lead = NPC_DATABASE.find(npc => npc.name === 'Ryan Reynolds') || NPC_DATABASE.find(npc => npc.occupation === 'ACTOR' && npc.tier === 'A_LIST');
      const support = NPC_DATABASE.find(npc => npc.name === 'Zendaya') || NPC_DATABASE.find(npc => npc.occupation === 'ACTOR' && npc.tier === 'A_LIST' && npc.id !== lead?.id);

      const returningCast = [
          {
              id: `return_role_lead_${now}`,
              name: lead?.name || 'Ryan Reynolds',
              actorName: lead?.name || 'Ryan Reynolds',
              role: 'Lead Actor',
              roleType: 'LEAD',
              actorId: lead?.id || 'celeb_act_5',
              npcId: lead?.id || 'celeb_act_5',
              image: lead?.avatar || getGenderedAvatar('MALE', 'Ryan Reynolds'),
              type: 'ACTOR',
              salary: 28_000_000,
              characterId: 'iron_monarch',
              characterName: 'Iron Monarch'
          },
          {
              id: `return_role_support_${now}`,
              name: support?.name || 'Zendaya',
              actorName: support?.name || 'Zendaya',
              role: 'Supporting Actor',
              roleType: 'SUPPORTING',
              actorId: support?.id || 'celeb_act_3',
              npcId: support?.id || 'celeb_act_3',
              image: support?.avatar || getGenderedAvatar('FEMALE', 'Zendaya'),
              type: 'ACTOR',
              salary: 18_000_000,
              characterId: 'nova_shade',
              characterName: 'Nova Shade'
          }
      ];

      const returningTalentBase = [
          {
              role: 'DIRECTOR',
              id: director?.id || 'celeb_dir_1',
              name: director?.name || 'Christopher Nolan',
              originalSalary: 85_000_000,
              newDemand: 112_000_000,
              negotiated: false,
              accepted: false,
              attemptsLeft: 3
          },
          ...returningCast.map(cast => ({
              role: cast.roleType === 'LEAD' ? 'LEAD_ACTOR' : 'SUPPORTING_ACTOR',
              id: cast.actorId,
              name: cast.actorName,
              originalSalary: cast.salary,
              newDemand: Math.floor(cast.salary * 1.35),
              negotiated: false,
              accepted: false,
              attemptsLeft: 3,
              characterId: cast.characterId,
              characterName: cast.characterName
          }))
      ];
      const returningTalent = Array.from({ length: safeDuplicateMultiplier }).flatMap(() =>
          returningTalentBase.map(deal => ({ ...deal }))
      );

      const previousProject = {
          id: projectId,
          name: 'Return Deal: Iron Monarch',
          title: 'Return Deal: Iron Monarch',
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, basePlayer.age - 1),
          earnings: 14_000_000,
          rating: 8.4,
          imdbRating: 8.4,
          reception: 'Franchise breakout',
          projectQuality: 84,
          boxOfficeResult: 'BLOCKBUSTER',
          outcomeTier: 'BLOCKBUSTER',
          studioId: studio.id,
          directorId: director?.id || 'celeb_dir_1',
          directorName: director?.name || 'Christopher Nolan',
          directorSalary: 85_000_000,
          castList: returningCast,
          crewList: [
              { id: director?.id || 'celeb_dir_1', name: director?.name || 'Christopher Nolan', role: 'DIRECTOR', salary: 85_000_000 }
          ],
          reviews: [],
          budget: 220_000_000,
          gross: 820_000_000,
          genre: 'SUPERHERO',
          description: 'Cheat QA franchise starter for returning talent negotiation blockers.',
          projectType: 'MOVIE',
          franchiseId,
          installmentNumber: 1
      } as any;

      const script = {
          id: scriptId,
          title: 'Return Deal: Iron Monarch 2',
          logline: 'The sequel is ready, but the returning director and stars still need new deals.',
          projectType: 'MOVIE',
          genres: ['SUPERHERO'],
          quality: 88,
          status: 'READY',
          writerId: 'cheat_writer_return_deal',
          author: 'Cheat Writers Room',
          weeksInDevelopment: 6,
          totalDevelopmentWeeks: 6,
          isOriginal: false,
          options: [],
          sourceMaterial: 'SEQUEL',
          franchiseId,
          installmentNumber: 2,
          returningTalent,
          connectedProjectIntent: 'SOLO',
          tags: ['RETURNING_TALENT_QA', 'SEQUEL']
      };
      const isExistingReturnDealQaScript = (existingScript: any) => {
          const existingId = String(existingScript?.id || '');
          const existingTitle = String(existingScript?.title || existingScript?.name || '').toLowerCase();
          const existingTags = Array.isArray(existingScript?.tags) ? existingScript.tags : [];
          return existingId.startsWith('cheat_return_deal_script_')
              || existingTags.includes('RETURNING_TALENT_QA')
              || existingTitle.includes('return deal: iron monarch');
      };
      const staleQaScriptIds = new Set(
          (studio.studioState?.scripts || [])
              .filter((existingScript: any) => isExistingReturnDealQaScript(existingScript))
              .map((existingScript: any) => String(existingScript.id || ''))
      );

      const updatedStudio = {
          ...studio,
          studioState: {
              ...(studio.studioState || {}),
              scripts: [
                  script,
                  ...(studio.studioState?.scripts || []).filter((existingScript: any) => !isExistingReturnDealQaScript(existingScript))
              ],
              concepts: (studio.studioState?.concepts || []).filter((concept: any) => {
                  const conceptScriptId = String(concept.scriptId || '');
                  return !staleQaScriptIds.has(conceptScriptId) && !conceptScriptId.startsWith('cheat_return_deal_script_');
              }),
              purchasedIPTitles: studio.studioState?.purchasedIPTitles || [],
              ipMarket: studio.studioState?.ipMarket || [],
              writers: studio.studioState?.writers || []
          }
      };

      onUpdatePlayer({
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b),
          pastProjects: [
              previousProject,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith('cheat_return_deal_project_'))
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: duplicateMultiplier > 1
                  ? `🧪 CHEAT: Controlled duplicate return-deal QA added (${returningTalent.length} raw entries). Greenlight should repair it to unique deals.`
                  : '🧪 CHEAT: Returning talent negotiation blocker added. Open Greenlight and inspect the missing requirements list.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      } as Player);
      closeMenu();
      onOpenProductionHouseCheat?.();
      alert(duplicateMultiplier > 1
          ? 'Duplicate Return Deal stress QA loaded. Open Greenlight to see the broken/stress case, then run Repair Return Deals QA.'
          : 'Return Deal QA loaded. Open Development Lab / Greenlight, choose "Return Deal: Iron Monarch 2", then go to Confirm to test pending negotiation names and buttons.'
      );
  };

  const triggerStudioScenario = (scenario: 'PLANNING' | 'PRODUCTION' | 'AWAITING_RELEASE' | 'FUNDED_PREMIERE' | 'THEATRICAL_TO_BIDDING' | 'STREAMING_EXIT') => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const usedTitles = [
          ...basePlayer.commitments.map(c => c.name),
          ...basePlayer.activeReleases.map(r => r.name),
          ...basePlayer.pastProjects.map(p => p.name)
      ];

      const isFundedPremiere = scenario === 'FUNDED_PREMIERE';
      const project = generateProjectDetails('HIGH', isFundedPremiere ? 'SERIES' : 'MOVIE', usedTitles, basePlayer);
      project.title =
          scenario === 'PLANNING' ? 'Cheat Studio Movie (Planning)' :
          scenario === 'PRODUCTION' ? 'Cheat Studio Movie (Production)' :
          scenario === 'AWAITING_RELEASE' ? 'Cheat Studio Movie (Release Ready)' :
          scenario === 'FUNDED_PREMIERE' ? 'Cheat Disney+ Funded Season' :
          scenario === 'THEATRICAL_TO_BIDDING' ? 'Cheat Studio Movie (Theatrical Finale)' :
          'Cheat Studio Movie (Streaming Exit)';
      project.studioId = studio.id;
      project.visibleHype = 'HIGH';
      project.hiddenStats.rawHype = 90;
      project.hiddenStats.qualityScore = 88;
      project.hiddenStats.scriptQuality = 86;
      project.hiddenStats.directorQuality = 84;
      project.hiddenStats.castingStrength = 82;
      const commitmentId = `cheat_studio_commit_${Date.now()}`;
      if (isFundedPremiere) {
          const fundedBudget = 65_800_000;
          project.estimatedBudget = fundedBudget;
          project.type = 'SERIES';
          project.hiddenStats = {
              ...project.hiddenStats,
              platformId: 'DISNEY_PLUS',
              nextSeasonFundingAmount: fundedBudget,
              nextSeasonFundingPlatformId: 'DISNEY_PLUS',
              nextSeasonFundingSourceProjectId: 'cheat_disney_plus_season_1',
              nextSeasonFundingUsedByProjectId: commitmentId,
              platformProductionFundingApplied: fundedBudget,
              studioCashAtRisk: 0,
              productionFundApplied: 0,
              investorFundingApplied: 0,
              greenlightPackageBudget: fundedBudget,
              platformFundedPremiere: true
          };
      }

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
              id: commitmentId,
              name: project.title,
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              energyCost: 0,
              income: 0,
              lumpSum: 5000000,
              payoutType: 'LUMPSUM',
              projectDetails: scenario === 'FUNDED_PREMIERE'
                  ? {
                      ...project,
                      releaseDate: player.currentWeek + 1
                  }
                  : scenario === 'AWAITING_RELEASE'
                  ? {
                      ...project,
                      releaseStrategy: 'THEATRICAL',
                      screeningStrategy: 'NATIONAL',
                      releaseDate: player.currentWeek + 1
                  }
                  : project,
              projectPhase: scenario === 'FUNDED_PREMIERE' ? 'AWAITING_RELEASE' : scenario,
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
          type: 'positive' as const
      }, ...nextPlayer.logs].slice(0, 50);

      onUpdatePlayer(nextPlayer);
      closeMenu();
      alert(
          scenario === 'FUNDED_PREMIERE'
              ? 'Funded-premiere QA is ready. Open the release-ready season in your studio to verify the Disney+ contract.'
              : `Studio QA scenario ready: ${scenario.replace(/_/g, ' ')}. Age Up once for the result.`
      );
  };

	  const triggerFilmographySortQa = () => {
	      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const currentAge = Math.max(18, basePlayer.age);
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);

      const poster = (title: string, gradient: string, icon: 'Film' | 'Tv' | 'Star' = 'Film') => ({
          type: 'CONFIG' as const,
          bgGradient: gradient,
          icon,
          textColor: 'text-white'
      });

      const baseFuturePotential = {
          sequelChance: 65,
          franchiseChance: 45,
          rebootChance: 20,
          renewalChance: 0,
          isFranchiseStarter: false,
          isSequelGreenlit: false,
          isRenewed: false,
          seriesStatus: 'N/A'
      };

      const makeLibraryProject = (data: {
          id: string;
          title: string;
          projectType: 'MOVIE' | 'SERIES';
          yearOffset: number;
          rating: number;
          budget: number;
          gross: number;
          streamingRevenue?: number;
          views?: number;
          genre: Genre;
          subtype?: string;
          franchiseId?: string;
          universeId?: UniverseId;
          posterGradient: string;
          awardsWon?: number;
      }) => ({
          id: `cheat_filmography_${data.id}_${now}`,
          name: data.title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: Math.max(16, currentAge - data.yearOffset),
          earnings: Math.round((data.gross + (data.streamingRevenue || 0)) * 0.035),
          rating: data.rating,
          reception: data.rating >= 8.4 ? 'Universal acclaim' : data.rating >= 7.2 ? 'Audience favorite' : data.rating >= 6 ? 'Mixed response' : 'Critical disappointment',
          projectQuality: Math.round(data.rating * 10),
          imdbRating: data.rating,
          boxOfficeResult: data.gross >= 450_000_000 ? 'BLOCKBUSTER' : data.gross >= 150_000_000 ? 'HIT' : data.gross < data.budget ? 'FLOP' : 'MODEST',
          outcomeTier: data.gross >= 450_000_000 ? 'BLOCKBUSTER' : data.gross >= 150_000_000 ? 'HIT' : data.gross < data.budget ? 'FLOP' : 'AVERAGE',
          subtype: data.subtype || 'STANDALONE',
          futurePotential: {
              ...baseFuturePotential,
              franchiseChance: data.franchiseId || data.universeId ? 90 : 45,
              sequelChance: data.rating >= 7 ? 82 : 42,
              renewalChance: data.projectType === 'SERIES' ? 72 : 0,
              seriesStatus: data.projectType === 'SERIES' ? 'ONGOING' : 'N/A'
          },
          studioId: studio.id,
          castList: [],
          reviews: [],
          budget: data.budget,
          gross: data.gross,
          genre: data.genre,
          description: `Cheat Filmography QA title for sorting and filtering: ${data.title}.`,
          projectType: data.projectType,
          streamingRevenue: data.streamingRevenue || 0,
          totalViews: data.views || 0,
          franchiseId: data.franchiseId,
          universeId: data.universeId,
          installmentNumber: data.franchiseId ? 1 : undefined,
          awards: Array.from({ length: data.awardsWon || 0 }).map((_, index) => ({
              id: `cheat_award_${data.id}_${index}_${now}`,
              name: 'Golden Reel',
              category: index === 0 ? 'Best Film' : 'Best Technical Achievement',
              year: Math.max(16, currentAge - data.yearOffset),
              outcome: 'WON',
              projectId: `cheat_filmography_${data.id}_${now}`,
              projectName: data.title,
              type: 'OSCAR'
          })),
          customPoster: poster(data.title, data.posterGradient, data.projectType === 'SERIES' ? 'Tv' : data.rating >= 8.4 ? 'Star' : 'Film')
      } as any);

      const universeId = `cheat_filmography_universe_${now}` as UniverseId;
      const franchiseId = `cheat_filmography_franchise_${now}`;
      const libraryProjects = [
          makeLibraryProject({ id: 'prestige', title: 'Velvet Crown', projectType: 'MOVIE', yearOffset: 1, rating: 9.1, budget: 42_000_000, gross: 188_000_000, genre: 'DRAMA', posterGradient: 'from-purple-950 via-fuchsia-900 to-black', awardsWon: 3 }),
          makeLibraryProject({ id: 'blockbuster', title: 'Skyfire Protocol', projectType: 'MOVIE', yearOffset: 2, rating: 7.8, budget: 180_000_000, gross: 1_140_000_000, genre: 'ACTION', franchiseId, subtype: 'BLOCKBUSTER', posterGradient: 'from-blue-950 via-cyan-900 to-black' }),
          makeLibraryProject({ id: 'profit', title: 'The Quiet Door', projectType: 'MOVIE', yearOffset: 3, rating: 8.0, budget: 4_000_000, gross: 96_000_000, genre: 'HORROR', posterGradient: 'from-zinc-950 via-stone-800 to-black' }),
          makeLibraryProject({ id: 'flop', title: 'Mars Ballroom', projectType: 'MOVIE', yearOffset: 4, rating: 5.4, budget: 165_000_000, gross: 38_000_000, genre: 'SCI_FI', posterGradient: 'from-red-950 via-orange-900 to-black' }),
          makeLibraryProject({ id: 'stream_series', title: 'Capital City: Season 1', projectType: 'SERIES', yearOffset: 1, rating: 8.3, budget: 72_000_000, gross: 0, streamingRevenue: 148_000_000, views: 64_000_000, genre: 'CRIME', posterGradient: 'from-slate-950 via-blue-900 to-black' }),
          makeLibraryProject({ id: 'anime', title: 'Neon Lotus', projectType: 'MOVIE', yearOffset: 2, rating: 8.6, budget: 24_000_000, gross: 210_000_000, genre: 'ANIMATION', posterGradient: 'from-pink-950 via-violet-900 to-black' }),
          makeLibraryProject({ id: 'sports', title: 'Final Whistle', projectType: 'MOVIE', yearOffset: 5, rating: 7.4, budget: 28_000_000, gross: 176_000_000, genre: 'SPORTS', posterGradient: 'from-emerald-950 via-lime-900 to-black' }),
          makeLibraryProject({ id: 'doc', title: 'The Last Take', projectType: 'MOVIE', yearOffset: 6, rating: 8.8, budget: 3_500_000, gross: 32_000_000, streamingRevenue: 16_000_000, views: 22_000_000, genre: 'DOCUMENTARY', posterGradient: 'from-neutral-950 via-zinc-700 to-black' }),
          makeLibraryProject({ id: 'universe', title: 'Celestial Order: Eclipse', projectType: 'MOVIE', yearOffset: 1, rating: 8.5, budget: 220_000_000, gross: 980_000_000, genre: 'SUPERHERO', universeId, subtype: 'UNIVERSE_EVENT', posterGradient: 'from-indigo-950 via-sky-900 to-black' })
      ];

      const activeTheatricalProject = generateProjectDetails('HIGH', 'MOVIE', [], basePlayer);
      activeTheatricalProject.title = 'Thunder Harbor';
      activeTheatricalProject.studioId = studio.id;
      activeTheatricalProject.genre = 'ADVENTURE';
      activeTheatricalProject.estimatedBudget = 130_000_000;
      activeTheatricalProject.customPoster = poster('Thunder Harbor', 'from-amber-950 via-yellow-800 to-black');
      activeTheatricalProject.hiddenStats.qualityScore = 82;
      activeTheatricalProject.hiddenStats.releaseWeek = currentWeek;

      const activeStreamingProject = generateProjectDetails('MID', 'SERIES', [], basePlayer);
      activeStreamingProject.title = 'After Midnight: Limited Series';
      activeStreamingProject.studioId = studio.id;
      activeStreamingProject.genre = 'THRILLER';
      activeStreamingProject.estimatedBudget = 58_000_000;
      activeStreamingProject.customPoster = poster('After Midnight', 'from-violet-950 via-zinc-900 to-black', 'Tv');
      activeStreamingProject.hiddenStats.qualityScore = 76;
      activeStreamingProject.hiddenStats.releaseWeek = Math.max(1, currentWeek - 2);

      const activeReleases: ActiveRelease[] = [
          {
              id: `cheat_filmography_theatrical_${now}`,
              name: 'Thunder Harbor',
              type: 'MOVIE',
              roleType: 'LEAD',
              projectDetails: activeTheatricalProject,
              distributionPhase: 'THEATRICAL',
              weekNum: 4,
              weeklyGross: [96_000_000, 68_000_000, 44_000_000, 28_000_000],
              totalGross: 236_000_000,
              budget: 130_000_000,
              status: 'RUNNING',
              imdbRating: 7.9,
              productionPerformance: 84,
              maxTheatricalWeeks: 12,
              weeksInTheaters: 4
          } as any,
          {
              id: `cheat_filmography_streaming_${now}`,
              name: 'After Midnight: Limited Series',
              type: 'SERIES',
              roleType: 'LEAD',
              projectDetails: activeStreamingProject,
              distributionPhase: 'STREAMING',
              weekNum: 8,
              weeklyGross: [],
              totalGross: 0,
              budget: 58_000_000,
              status: 'FINISHED',
              imdbRating: 7.6,
              productionPerformance: 78,
              streamingRevenue: 44_000_000,
              streaming: {
                  platformId: 'NETFLIX',
                  weekOnPlatform: 8,
                  totalViews: 31_000_000,
                  weeklyViews: [9_000_000, 7_000_000, 4_200_000, 2_100_000],
                  isLeaving: false
              }
          } as any
      ];

      const universe = normalizeUniverseForSave({
          id: universeId,
          name: 'Celestial Order',
          description: 'Cheat Filmography universe used to test franchise/universe filters.',
          studioId: studio.id,
          currentPhase: 'Phase 2',
          currentPhaseName: 'Phase 2',
          saga: 1,
          currentSagaName: 'Saga 1',
          momentum: 84,
          brandPower: 86,
          marketShare: 0,
          color: '#38bdf8',
          roster: [],
          slate: [],
          products: [],
          stats: { weeklyRevenue: 0, lifetimeRevenue: 0 },
          weeksUntilNextPhase: 42
      }, universeId);

      const nextPlayer = {
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? studio : b),
          pastProjects: [
              ...libraryProjects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith('cheat_filmography_'))
          ],
          activeReleases: [
              ...activeReleases,
              ...basePlayer.activeReleases.filter(release => !String(release.id).startsWith('cheat_filmography_'))
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
              message: '🎞️ CHEAT: Filmography sorting QA library added. Test Production Studio > Past Projects > See More.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      };

      onUpdatePlayer(nextPlayer as Player);
      closeMenu();
      onOpenProductionHouseCheat?.();
	      alert('Filmography QA loaded: 9 library titles plus theatrical and streaming active releases. Open Past Projects > See More to test sorting.');
	  };

	  const triggerEpisodeRatingsQa = (target: 'IMDB' | 'PRODUCTION_HOUSE' = 'IMDB') => {
	      if (!onUpdatePlayer) return;

	      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
	      const now = Date.now();
	      const qaPrefix = 'cheat_episode_ratings_';
	      const franchiseId = `${qaPrefix}franchise_${now}`;
	      const sourceScriptId = `${qaPrefix}script_${now}`;
	      const currentAge = Math.max(18, basePlayer.age || 18);
	      const poster = {
	          type: 'CONFIG' as const,
	          bgGradient: 'from-emerald-950 via-zinc-900 to-black',
	          icon: 'Tv' as const,
	          textColor: 'text-white'
	      };

	      const makeSeason = (season: number, rating: number, quality: number, views: number, weeklyViews: number[]) => {
	          const title = `Signal Room: Season ${season}`;
	          const projectDetails = {
	              title,
	              type: 'SERIES' as const,
	              description: 'A tense prestige crime series tracked through season-by-season audience response.',
	              studioId: studio.id,
	              subtype: 'STANDALONE' as const,
	              genre: 'CRIME' as Genre,
	              budgetTier: 'HIGH' as const,
	              estimatedBudget: 72_000_000 + (season * 6_000_000),
	              visibleHype: 'HIGH' as const,
	              hiddenStats: {
	                  scriptQuality: quality + 2,
	                  directorQuality: quality,
	                  castingStrength: Math.max(35, quality - 4),
	                  distributionPower: Math.max(35, quality - 2),
	                  rawHype: Math.max(35, quality - 5),
	                  qualityScore: quality,
	                  prestigeBonus: rating >= 8 ? 12 : 2,
	                  castDepthScore: Math.max(35, quality - 3)
	              },
	              directorName: 'Mara Voss',
	              visibleDirectorTier: 'Prestige',
	              visibleScriptBuzz: 'Hot',
	              visibleCastStrength: 'Strong',
	              episodes: season === 3 ? 6 : 8,
	              franchiseId,
	              sourceScriptId,
	              installmentNumber: season,
	              customPoster: poster,
	          };
	          const episodeRatings = generateEpisodeRatings({
	              id: `${qaPrefix}s${season}_${now}`,
	              name: title,
	              type: 'SERIES',
	              projectType: 'SERIES',
	              imdbRating: rating,
	              productionPerformance: quality,
	              totalViews: views,
	              weeklyViews,
	              projectDetails,
	          });

	          return {
	              id: `${qaPrefix}s${season}_${now}`,
	              name: title,
	              type: 'ACTING_GIG',
	              roleType: season === 3 ? 'SUPPORTING' : 'LEAD',
	              year: Math.max(16, currentAge - (4 - season)),
	              releaseYear: Math.max(16, currentAge - (4 - season)),
	              releaseWeek: Math.max(1, 8 + (season * 7)),
	              releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(Math.max(16, currentAge - (4 - season)), Math.max(1, 8 + (season * 7)))),
	              earnings: Math.round((views / 1_000_000) * 220_000),
	              rating,
	              reception: rating >= 8.2 ? 'Prestige breakout' : rating >= 7 ? 'Solid but debated' : 'Uneven season',
	              projectQuality: quality,
	              imdbRating: rating,
	              boxOfficeResult: 'STREAMING',
	              outcomeTier: rating >= 8.2 ? 'HIT' : rating >= 7 ? 'AVERAGE' : 'FLOP',
	              subtype: 'STANDALONE',
	              futurePotential: {
	                  sequelChance: 0,
	                  franchiseChance: 30,
	                  rebootChance: 10,
	                  renewalChance: season < 3 ? 86 : 48,
	                  isFranchiseStarter: false,
	                  isSequelGreenlit: false,
	                  isRenewed: season < 3,
	                  seriesStatus: season < 3 ? 'ONGOING' : 'CANCELLED'
	              },
	              studioId: studio.id,
	              streamingPlatform: 'NETFLIX',
	              totalViews: views,
	              weeklyViews,
	              streamingRevenue: views * 3,
	              castList: [],
	              reviews: [],
	              episodeRatings,
	              budget: projectDetails.estimatedBudget,
	              gross: 0,
	              genre: 'CRIME',
	              description: `Audience response shifted across season ${season}. Open this credit to see the S1-S3 heatmap.`,
	              projectType: 'SERIES',
	              franchiseId,
	              sourceScriptId,
	              installmentNumber: season,
	              customPoster: poster
	          } as any;
	      };

	      const seededSeasons = [
	          makeSeason(1, 8.4, 83, 58_000_000, [14_000_000, 12_500_000, 10_000_000, 8_000_000, 7_000_000, 6_500_000]),
	          makeSeason(2, 9.0, 90, 86_000_000, [20_000_000, 18_500_000, 16_000_000, 13_000_000, 10_500_000, 8_000_000]),
	          makeSeason(3, 6.8, 64, 24_000_000, [8_000_000, 5_800_000, 3_900_000, 2_500_000, 2_000_000, 1_800_000]),
	      ];

	      onUpdatePlayer({
	          ...basePlayer,
	          businesses: basePlayer.businesses.map(b => b.id === studio.id ? studio : b),
	          pastProjects: [
	              ...seededSeasons,
	              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(qaPrefix))
	          ],
	          logs: [{
	              week: basePlayer.currentWeek,
	              year: basePlayer.age,
	              message: target === 'PRODUCTION_HOUSE'
	                  ? '🧪 CHEAT: Episode Ratings Production House QA series added. Open Production House > Past Projects > Signal Room.'
	                  : '🧪 CHEAT: Episode Ratings IMDb QA series added. Open Phone > IMDb > Credits > Signal Room.',
	              type: 'positive' as const
	          }, ...basePlayer.logs].slice(0, 50)
	      } as Player);
	      closeMenu();
	      if (target === 'PRODUCTION_HOUSE') {
	          onOpenProductionHouseCheat?.();
	          alert('Episode Ratings Production House QA loaded. Open Production House > Past Projects, then tap Signal Room to test the scorecard.');
	      } else {
	          setPage?.(Page.MOBILE);
	          alert('Episode Ratings IMDb QA loaded. Open Phone > IMDb > Credits, then tap Signal Room to test the S1-S3 heatmap.');
	      }
	  };

	  const triggerEpisodeRatingsProductionHouseQa = () => triggerEpisodeRatingsQa('PRODUCTION_HOUSE');

	  const triggerProductionRiskQa = () => {
	      if (!onUpdatePlayer) return;

	      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
	      const now = Date.now();
	      const qaPrefix = 'cheat_production_risk_';
	      const currentAge = Math.max(18, basePlayer.age || 18);
	      const makeProjectDetails = (
	          title: string,
	          genre: Genre,
	          type: 'MOVIE' | 'SERIES',
	          budget: number,
	          quality: number,
	          budgetTier: 'MID' | 'HIGH' | 'BLOCKBUSTER',
	          episodeRatings?: any[]
	      ) => ({
	          title,
	          type,
	          description: 'Cheat QA project for Production House risk and studio net testing.',
	          studioId: studio.id,
	          subtype: 'STANDALONE' as const,
	          genre,
	          budgetTier,
	          estimatedBudget: budget,
	          visibleHype: quality >= 80 ? 'HIGH' as const : quality >= 65 ? 'MEDIUM' as const : 'LOW' as const,
	          hiddenStats: {
	              scriptQuality: quality,
	              directorQuality: Math.max(25, quality - 3),
	              castingStrength: Math.max(25, quality - 6),
	              distributionPower: Math.max(25, quality - 4),
	              rawHype: quality >= 80 ? 78 : quality >= 65 ? 62 : 86,
	              qualityScore: quality,
	              prestigeBonus: genre === 'DRAMA' ? 12 : 0,
	              castDepthScore: Math.max(25, quality - 8)
	          },
	          directorName: quality >= 80 ? 'Mara Voss' : 'Studio Hire',
	          visibleDirectorTier: quality >= 80 ? 'Prestige' : 'Working',
	          visibleScriptBuzz: quality >= 80 ? 'Hot' : quality >= 65 ? 'Solid' : 'Weak',
	          visibleCastStrength: quality >= 80 ? 'Strong' : 'Uneven',
	          episodes: type === 'SERIES' ? 8 : undefined,
	          customPoster: {
	              type: 'CONFIG' as const,
	              bgGradient: quality >= 80 ? 'from-emerald-950 via-zinc-900 to-black' : 'from-rose-950 via-zinc-900 to-black',
	              icon: type === 'SERIES' ? 'Tv' as const : 'Film' as const,
	              textColor: 'text-white'
	          },
	          episodeRatings,
	      });
	      const makeSeasonRatings = (season: number, values: number[]) => {
	          const averageRating = Math.round((values.reduce((sum, rating) => sum + rating, 0) / values.length) * 10) / 10;
	          return {
	              season,
	              averageRating,
	              verdict: averageRating >= 8.2 ? 'GREAT' : averageRating >= 7 ? 'GOOD' : averageRating >= 5.8 ? 'REGULAR' : 'BAD',
	              episodes: values.map((rating, index) => ({ episode: index + 1, rating }))
	          };
	      };
	      const buildPastProject = ({
	          key,
	          title,
	          genre,
	          type = 'MOVIE',
	          budget,
	          gross,
	          totalStudioReceipts,
	          streamingRevenue,
	          rating,
	          quality,
	          outcomeTier,
	          budgetTier,
	          episodeRatings,
	          releaseOffset,
	      }: any) => {
	          const projectDetails = makeProjectDetails(title, genre, type, budget, quality, budgetTier, episodeRatings);
	          return {
	              id: `${qaPrefix}${key}_${now}`,
	              name: title,
	              type: 'ACTING_GIG',
	              roleType: 'LEAD',
	              year: currentAge,
	              releaseYear: currentAge,
	              releaseWeek: Math.max(1, basePlayer.currentWeek - releaseOffset),
	              releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(currentAge, Math.max(1, basePlayer.currentWeek - releaseOffset))),
	              earnings: Math.floor(budget * 0.02),
	              rating,
	              reception: outcomeTier === 'FLOP' ? 'Expensive miss' : outcomeTier === 'HIT' ? 'Strong studio return' : 'Mixed studio economics',
	              projectQuality: quality,
	              imdbRating: rating,
	              boxOfficeResult: streamingRevenue > gross ? 'STREAMING' : 'THEATRICAL',
	              outcomeTier,
	              subtype: 'STANDALONE',
	              futurePotential: {
	                  sequelChance: outcomeTier === 'HIT' ? 64 : outcomeTier === 'FLOP' ? 8 : 28,
	                  franchiseChance: outcomeTier === 'HIT' ? 44 : 10,
	                  rebootChance: 8,
	                  renewalChance: type === 'SERIES' ? 86 : 0,
	                  isFranchiseStarter: false,
	                  isSequelGreenlit: false,
	                  isRenewed: type === 'SERIES',
	                  seriesStatus: type === 'SERIES' ? 'ONGOING' : undefined
	              },
	              studioId: studio.id,
	              streamingPlatform: streamingRevenue > 0 ? 'NETFLIX' : undefined,
	              totalViews: streamingRevenue > 0 ? Math.floor(streamingRevenue / 3) : undefined,
	              weeklyViews: streamingRevenue > 0 ? [Math.floor(streamingRevenue / 9), Math.floor(streamingRevenue / 12), Math.floor(streamingRevenue / 18)] : undefined,
	              streamingRevenue,
	              castList: [],
	              reviews: [],
	              episodeRatings,
	              budget,
	              gross,
	              totalStudioReceipts,
	              genre,
	              description: 'Production Risk QA project. Check Project Revenue and outcome variety.',
	              projectType: type,
	              directorName: projectDetails.directorName,
	              visibleDirectorTier: projectDetails.visibleDirectorTier,
	              visibleScriptBuzz: projectDetails.visibleScriptBuzz,
	              visibleCastStrength: projectDetails.visibleCastStrength,
	              customPoster: projectDetails.customPoster,
	              projectDetails
	          };
	      };
	      const prestigeRatings = [
	          makeSeasonRatings(1, [8.5, 8.8, 8.7, 9.0, 8.6, 8.9, 9.1, 8.8]),
	          makeSeasonRatings(2, [8.9, 9.1, 9.0, 9.2, 8.8, 9.0, 9.1, 9.3])
	      ];
	      const riskProjects = [
	          buildPastProject({
	              key: 'risk_bomb',
	              title: 'Risk Bomb',
	              genre: 'ACTION',
	              budgetTier: 'BLOCKBUSTER',
	              budget: 220_000_000,
	              gross: 142_000_000,
	              totalStudioReceipts: 68_000_000,
	              streamingRevenue: 8_000_000,
	              rating: 5.4,
	              quality: 42,
	              outcomeTier: 'FLOP',
	              releaseOffset: 3
	          }),
	          buildPastProject({
	              key: 'break_even',
	              title: 'Break Even',
	              genre: 'THRILLER',
	              budgetTier: 'HIGH',
	              budget: 80_000_000,
	              gross: 130_000_000,
	              totalStudioReceipts: 66_000_000,
	              streamingRevenue: 15_000_000,
	              rating: 6.8,
	              quality: 67,
	              outcomeTier: 'AVERAGE',
	              releaseOffset: 2
	          }),
	          buildPastProject({
	              key: 'surprise_hit',
	              title: 'Surprise Hit',
	              genre: 'MYSTERY',
	              budgetTier: 'MID',
	              budget: 32_000_000,
	              gross: 170_000_000,
	              totalStudioReceipts: 88_000_000,
	              streamingRevenue: 28_000_000,
	              rating: 8.1,
	              quality: 84,
	              outcomeTier: 'HIT',
	              releaseOffset: 1
	          }),
	          buildPastProject({
	              key: 'prestige_series',
	              title: 'Prestige Series',
	              genre: 'DRAMA',
	              type: 'SERIES',
	              budgetTier: 'HIGH',
	              budget: 70_000_000,
	              gross: 0,
	              totalStudioReceipts: 0,
	              streamingRevenue: 155_000_000,
	              rating: 8.9,
	              quality: 88,
	              outcomeTier: 'HIT',
	              episodeRatings: prestigeRatings,
	              releaseOffset: 0
	          })
	      ];

	      onUpdatePlayer({
	          ...basePlayer,
	          businesses: basePlayer.businesses.map(b => b.id === studio.id ? studio : b),
	          pastProjects: [
	              ...riskProjects,
	              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(qaPrefix))
	          ],
	          logs: [{
	              week: basePlayer.currentWeek,
	              year: basePlayer.age,
	              message: '🧪 CHEAT: Production Risk QA slate added. Open Production House > Past Projects to compare Risk Bomb, Break Even, Surprise Hit, and Prestige Series.',
	              type: 'positive' as const
	          }, ...basePlayer.logs].slice(0, 50)
	      } as Player);
	      closeMenu();
	      onOpenProductionHouseCheat?.();
	      alert('Production Risk QA loaded. Open Production House > Past Projects to inspect Risk Bomb, Break Even, Surprise Hit, and Prestige Series.');
	  };

	  const triggerRareHollywoodChaosQa = (kind: RareHollywoodChaosKind) => {
	      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const isSeries = kind === 'CANCELLED_SHOW_REVIVAL' || kind === 'PLATFORM_MOONSHOT';
      const project = generateProjectDetails('HIGH', isSeries ? 'SERIES' : 'MOVIE', [], basePlayer);
      const scenario = {
          FLOP_SEQUEL_GAMBLE: {
              title: 'Neon Reckoning',
              budget: 120_000_000,
              gross: 145_000_000,
              rating: 6.8,
              performance: 72,
              hype: 82,
              platformId: 'NETFLIX'
          },
          CANCELLED_SHOW_REVIVAL: {
              title: 'Midnight District: Season 1',
              budget: 42_000_000,
              gross: 0,
              rating: 8.5,
              performance: 84,
              hype: 68,
              platformId: 'HULU'
          },
          PLATFORM_MOONSHOT: {
              title: 'Red Frontier: Season 1',
              budget: 110_000_000,
              gross: 0,
              rating: 6.4,
              performance: 66,
              hype: 76,
              platformId: 'NETFLIX'
          },
          STUDIO_REBOOT_GAMBLE: {
              title: 'Titan Protocol II',
              budget: 120_000_000,
              gross: 75_000_000,
              rating: 5.7,
              performance: 54,
              hype: 78,
              platformId: 'NETFLIX'
          }
      }[kind];
      const releaseId = `cheat_rare_chaos_${kind.toLowerCase()}_${now}`;
      const franchiseId = `cheat_rare_chaos_franchise_${now}`;

      project.title = scenario.title;
      project.type = isSeries ? 'SERIES' : 'MOVIE';
      project.studioId = studio.id;
      project.subtype = isSeries ? 'STANDALONE' : 'SEQUEL';
      project.franchiseId = franchiseId;
      project.installmentNumber = isSeries ? 1 : 2;
      project.estimatedBudget = scenario.budget;
      project.visibleHype = 'HIGH';
      project.hiddenStats = {
          ...project.hiddenStats,
          rawHype: scenario.hype,
          platformId: scenario.platformId,
          forcedRareChaosKind: kind
      };

      const release: ActiveRelease = {
          id: releaseId,
          name: scenario.title,
          type: isSeries ? 'SERIES' : 'MOVIE',
          roleType: 'LEAD',
          projectDetails: project,
          distributionPhase: isSeries ? 'STREAMING' : 'THEATRICAL',
          weekNum: 5,
          weeklyGross: isSeries ? [] : [68_000_000, 39_000_000, 22_000_000, 16_000_000],
          totalGross: scenario.gross,
          budget: scenario.budget,
          status: 'RUNNING',
          imdbRating: scenario.rating,
          productionPerformance: scenario.performance,
          sequelDecisionWeek: 5,
          sequelDecisionMade: false,
          promotionalBuzz: scenario.hype,
          maxTheatricalWeeks: 12,
          streamingRevenue: isSeries ? Math.round(scenario.budget * 0.42) : 0,
          streaming: isSeries ? {
              platformId: scenario.platformId as any,
              weekOnPlatform: 5,
              totalViews: kind === 'CANCELLED_SHOW_REVIVAL' ? 24_000_000 : 11_000_000,
              weeklyViews: kind === 'CANCELLED_SHOW_REVIVAL'
                  ? [5_000_000, 4_700_000, 4_400_000, 4_200_000]
                  : [4_200_000, 3_100_000, 2_200_000, 1_700_000],
              isLeaving: false
          } : undefined
      };

      onUpdatePlayer({
          ...basePlayer,
          activeReleases: [
              release,
              ...basePlayer.activeReleases.filter(item => !String(item.id).startsWith('cheat_rare_chaos_'))
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: `🎲 CHEAT: ${scenario.title} loaded for ${kind.replaceAll('_', ' ').toLowerCase()} QA. Age Up once.`,
              type: 'neutral' as const
          }, ...basePlayer.logs].slice(0, 50)
      });
      closeMenu();

      const destination = kind === 'PLATFORM_MOONSHOT'
          ? 'Then check News and Production House funding.'
          : 'Then check News for the rare industry outcome.';
      alert(`${scenario.title} is ready. Age Up once. ${destination}`);
  };


  return {
    triggerLowConditionRestQa,
    sanitizeProductionHouseReturnDealsQa,
    triggerReturningTalentNegotiationQa,
    triggerStudioScenario,
    triggerFilmographySortQa,
    triggerEpisodeRatingsQa,
    triggerEpisodeRatingsProductionHouseQa,
    triggerProductionRiskQa,
    triggerRareHollywoodChaosQa,
  };
};
