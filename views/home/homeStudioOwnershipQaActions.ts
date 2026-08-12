import type {
  ActiveRelease,
  Commitment,
  Genre,
  Player,
  Script,
} from '../../types';
import { generateProjectDetails } from '../../services/roleLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { STUDIO_CATALOG } from '../../services/studioLogic';

type HomeQaStudio = Player['businesses'][number];

export interface HomeStudioOwnershipQaActionsProps {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  closeMenu: () => void;
  ensureCheatStudio: () => { updatedPlayer: Player; studio: HomeQaStudio };
  onOpenProductionHouseCheat?: () => void;
  onOpenStudioAcquisitionCheat?: (studioId: string) => void;
}

export const createHomeStudioOwnershipQaActions = ({
  player,
  onUpdatePlayer,
  closeMenu,
  ensureCheatStudio,
  onOpenProductionHouseCheat,
  onOpenStudioAcquisitionCheat,
}: HomeStudioOwnershipQaActionsProps) => {
  const triggerStudioAcquisitionSigningCheat = () => {
      if (!onUpdatePlayer) return;

      const studioId = 'ARTISAN_PICTURES';
      const studioName = 'Artisan Pictures';
      const alreadyOwned = player.businesses.some(business => business.id === studioId);

      if (alreadyOwned) {
          closeMenu();
          alert(`${studioName} is already in your owned studio group. This signing QA setup only works with an unowned studio.`);
          return;
      }

      const now = Date.now();
      const offerAmount = 3_200_000_000;
      const agreedAmount = 3_300_000_000;
      const acceptedCase = {
          studioId,
          studioName,
          acquisitionState: 'OPEN_TO_OFFERS',
          publicValuation: 3_050_000_000,
          approachedWeek: player.currentWeek,
          approachedYear: player.age,
          status: 'ACCEPTED',
          offer: {
              type: 'FAIR',
              amount: offerAmount,
              funding: { source: 'PERSONAL' },
              complianceRisk: 8,
              complianceBand: 'ROUTINE',
              commitments: ['PRESERVE_STUDIO_NAME', 'PROTECT_EMPLOYEES', 'GUARANTEE_PRODUCTIONS'],
              submittedWeek: player.currentWeek,
              submittedYear: player.age,
              round: 1,
          },
          sellerResponse: {
              decision: 'ACCEPTED',
              agreedAmount,
              round: 1,
              respondedWeek: player.currentWeek,
              respondedYear: player.age,
              summary: `${studioName} accepted your acquisition terms. The closing packet is ready for signature.`,
          },
      };
      const messageId = `cheat_studio_acquisition_signing_${studioId}_${now}`;
      const updatedPlayer = {
          ...player,
          money: Math.max(player.money, 5_000_000_000),
          flags: {
              ...player.flags,
              studioAcquisitionCases: [
                  ...((player.flags?.studioAcquisitionCases || []).filter((entry: any) => entry?.studioId !== studioId)),
                  acceptedCase,
              ],
          },
          inbox: [
              {
                  id: messageId,
                  sender: 'Business Affairs',
                  subject: `Terms Agreed: ${studioName}`,
                  text: acceptedCase.sellerResponse.summary,
                  type: 'STUDIO_ACQUISITION' as const,
                  data: {
                      studioId,
                      studioName,
                      decision: 'ACCEPTED',
                      agreedAmount,
                  },
                  isRead: false,
                  weekSent: player.currentWeek,
              },
              ...(player.inbox || []).filter(message => !(message.type === 'STUDIO_ACQUISITION' && message.data?.studioId === studioId)),
          ],
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `🧾 Studio Acquisition signing prepared for ${studioName}.`,
              type: 'positive' as const,
          }, ...player.logs].slice(0, 50),
      };

      onUpdatePlayer(updatedPlayer);
      closeMenu();
      onOpenStudioAcquisitionCheat?.(studioId);
  };

  const triggerPrivateEquityQa = (mode: 'MATURE_STAKE' | 'BUYER_OFFER') => {
      if (!onUpdatePlayer) return;

      const existingQaStudioId = String(player.flags?.privateEquityQaStudioId || '');
      const currentPositions = Array.isArray(player.flags?.companyEquityPositions)
          ? player.flags.companyEquityPositions
          : [];
      const currentCases = Array.isArray(player.flags?.studioAcquisitionCases)
          ? player.flags.studioAcquisitionCases
          : [];
      const ownedStudioIds = new Set(
          (player.businesses || [])
              .filter(business => business.type === 'PRODUCTION_HOUSE')
              .map(business => business.id),
      );
      const worldStudios = Object.values(
          player.world?.studios && Object.keys(player.world.studios).length > 0
              ? player.world.studios
              : STUDIO_CATALOG,
      ) as Array<{ id: string; name: string; valuation?: number; archetype?: string }>;
      const preferredIds = ['SEARCHLIGHT', 'ARTISAN_PICTURES', 'LIONSGATE', 'MGM'];
      const orderedStudios = [
          ...preferredIds
              .map(id => worldStudios.find(studio => studio.id === id))
              .filter((studio): studio is { id: string; name: string; valuation?: number; archetype?: string } => Boolean(studio)),
          ...worldStudios.filter(studio => !preferredIds.includes(studio.id)),
      ];
      const existingQaStudio = existingQaStudioId
          ? orderedStudios.find(studio => studio.id === existingQaStudioId && !ownedStudioIds.has(studio.id))
          : undefined;
      const targetStudio = existingQaStudio || orderedStudios.find(studio => (
          !ownedStudioIds.has(studio.id)
          && !currentPositions.some((position: any) => position?.studioId === studio.id)
          && !currentCases.some((entry: any) => entry?.studioId === studio.id)
          && !/PLATFORM|UNIVERSE|FRANCHISE/i.test(String(studio.archetype || ''))
      ));

      if (!targetStudio) {
          closeMenu();
          alert('No untouched studio is available for this QA setup. Sell or remove one test holding, then try again.');
          return;
      }

      const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
      const acquiredYear = Math.max(1, player.age - 1);
      const entryCompanyValuation = Math.max(
          600_000_000,
          Math.round(Number(targetStudio.valuation || 1) * 1_000_000_000),
      );
      const currentCompanyValuation = Math.round(entryCompanyValuation * 1.18);
      const investedAmount = Math.round(entryCompanyValuation * 0.15);
      const referenceValue = Math.round(currentCompanyValuation * 0.075);
      const grossOffer = Math.round(referenceValue * 0.86);
      const advisoryFee = Math.round(grossOffer * 0.02);
      const exit = mode === 'BUYER_OFFER'
          ? {
              status: 'OFFER_READY' as const,
              percentForSale: 7.5,
              requestedAbsoluteWeek: Math.max(0, currentAbsoluteWeek - 3),
              offerReadyAbsoluteWeek: currentAbsoluteWeek,
              offerExpiresAbsoluteWeek: currentAbsoluteWeek + 6,
              referenceValue,
              liquidityDiscountRate: 0.14,
              advisoryFee,
              netProceeds: grossOffer - advisoryFee,
          }
          : undefined;
      const qaPosition = {
          studioId: targetStudio.id,
          studioName: targetStudio.name,
          percent: 15,
          investedAmount,
          acquiredWeek: player.currentWeek,
          acquiredYear,
          entryCompanyValuation,
          currentCompanyValuation,
          annualProfitEstimate: Math.round(currentCompanyValuation * 0.07),
          lastReviewAbsoluteWeek: Math.max(0, currentAbsoluteWeek - 12),
          lastQuarterChangePercent: 6.4,
          lastQuarterOutcome: 'RETAINED' as const,
          lastQuarterSummary: mode === 'BUYER_OFFER'
              ? 'A private buyer has submitted an offer for half of your stake.'
              : 'The studio retained its latest profit to fund the next slate. Advance one week for a new quarterly review.',
          lifetimeDistributions: Math.round(investedAmount * 0.03),
          lastDistributionAbsoluteWeek: Math.max(0, currentAbsoluteWeek - 26),
          nextExitEligibleAbsoluteWeek: Math.max(0, currentAbsoluteWeek - 1),
          exit,
      };
      const qaCase = {
          studioId: targetStudio.id,
          studioName: targetStudio.name,
          acquisitionState: 'OPEN_TO_OFFERS',
          publicValuation: entryCompanyValuation,
          approachedWeek: player.currentWeek,
          approachedYear: acquiredYear,
          status: 'ACQUIRED',
          closing: {
              finalPrice: investedAmount,
              signedWeek: player.currentWeek,
              signedYear: acquiredYear,
              funding: { source: 'PERSONAL' },
              verifiedDebt: 0,
              hiddenLiabilities: 0,
              expectedAnnualIncome: Math.round(qaPosition.annualProfitEstimate * 0.15),
              assetSummary: '15% private equity position',
              outcome: 'MINORITY_STAKE',
          },
      };

      onUpdatePlayer({
          ...player,
          flags: {
              ...player.flags,
              privateEquityQaStudioId: targetStudio.id,
              companyEquityPositions: [
                  ...currentPositions.filter((position: any) => position?.studioId !== targetStudio.id),
                  qaPosition,
              ],
              studioAcquisitionCases: [
                  ...currentCases.filter((entry: any) => entry?.studioId !== targetStudio.id),
                  qaCase,
              ],
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: mode === 'BUYER_OFFER'
                  ? `🧪 CHEAT: A buyer offer is ready for 7.5% of ${targetStudio.name}.`
                  : `🧪 CHEAT: A mature 15% private stake in ${targetStudio.name} is ready to test.`,
              type: 'positive' as const,
          }, ...(player.logs || [])].slice(0, 50),
      });
      closeMenu();
      onOpenStudioAcquisitionCheat?.(targetStudio.id);
      alert(mode === 'BUYER_OFFER'
          ? `Buyer offer ready. Open Your Position, then Review Offer to accept or reject the half-stake sale.`
          : `Private stake ready. Open Your Position to test Sell Half / Sell All, or advance one week for a quarterly review.`);
  };

  const triggerVaultSortingQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const currentWeek = basePlayer.currentWeek;
      const qaPrefix = 'cheat_vault_sort_';
      const existingScripts = (studio.studioState?.scripts || []).filter((script: Script) => !script.id.startsWith(qaPrefix));

      const qaScripts: Script[] = [
          {
              id: `${qaPrefix}produced_${now}`,
              title: 'Vault QA Produced Archive',
              genres: ['ACTION'],
              status: 'PRODUCED',
              quality: 78,
              options: [],
              writerId: 'cheat_writer_archive',
              weeksInDevelopment: 8,
              totalDevelopmentWeeks: 8,
              isOriginal: true,
              projectType: 'MOVIE',
              format: 'LIVE_ACTION',
              logline: 'A finished studio title that should live below active work.',
              createdAtWeek: Math.max(1, currentWeek - 20),
              producedAtWeek: Math.max(1, currentWeek - 4)
          },
          {
              id: `${qaPrefix}development_${now}`,
              title: 'Vault QA In Development',
              genres: ['THRILLER'],
              status: 'IN_DEVELOPMENT',
              quality: 52,
              options: [],
              writerId: 'cheat_writer_room',
              weeksInDevelopment: 3,
              totalDevelopmentWeeks: 9,
              isOriginal: true,
              projectType: 'MOVIE',
              format: 'LIVE_ACTION',
              logline: 'A draft still being written, useful for progress bar QA.',
              createdAtWeek: Math.max(1, currentWeek - 3)
          },
          {
              id: `${qaPrefix}concept_${now}`,
              title: 'Vault QA Raw Concept',
              genres: ['COMEDY'],
              status: 'CONCEPT',
              quality: 35,
              options: [],
              writerId: null,
              weeksInDevelopment: 0,
              totalDevelopmentWeeks: 8,
              isOriginal: true,
              projectType: 'MOVIE',
              format: 'LIVE_ACTION',
              logline: 'A raw idea that should sit above in-development work after ready scripts.',
              createdAtWeek: Math.max(1, currentWeek - 1)
          },
          {
              id: `${qaPrefix}ready_${now}`,
              title: 'Vault QA Ready To Greenlight',
              genres: ['DRAMA'],
              status: 'READY',
              quality: 86,
              options: [],
              writerId: 'cheat_writer_final',
              weeksInDevelopment: 7,
              totalDevelopmentWeeks: 7,
              isOriginal: true,
              projectType: 'MOVIE',
              format: 'LIVE_ACTION',
              logline: 'A polished script that should appear first in Active Scripts.',
              createdAtWeek: currentWeek
          }
      ];

      const updatedStudio = {
          ...studio,
          studioState: {
              ...(studio.studioState || {}),
              scripts: [...qaScripts, ...existingScripts],
              concepts: studio.studioState?.concepts || [],
              writers: studio.studioState?.writers || [],
              ipMarket: studio.studioState?.ipMarket || [],
              lastMarketRefreshWeek: studio.studioState?.lastMarketRefreshWeek || currentWeek,
              lastWriterRefreshWeek: studio.studioState?.lastWriterRefreshWeek || currentWeek
          }
      };

      onUpdatePlayer({
          ...basePlayer,
          businesses: (basePlayer.businesses || []).map(b => b.id === updatedStudio.id ? updatedStudio : b),
          logs: [{
              week: currentWeek,
              year: basePlayer.age,
              message: '🧪 CHEAT: Vault sorting QA kit added. Open Production House > Development Lab > Vault.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      });
      closeMenu();
      onOpenProductionHouseCheat?.();
      alert('Vault sorting QA kit loaded. Open Development Lab > Vault to confirm Active Scripts appear above Produced Archive.');
  };

  const triggerFullStudioSlateQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);
      const currentAge = Math.max(18, basePlayer.age || 18);
      const qaPrefix = 'cheat_full_slate_';

      const scriptIds = {
          readyFeature: `${qaPrefix}script_ready_feature_${now}`,
          readySeries: `${qaPrefix}script_ready_series_${now}`,
          development: `${qaPrefix}script_development_${now}`,
          concept: `${qaPrefix}script_concept_${now}`,
          produced: `${qaPrefix}script_produced_${now}`
      };

      const makeScript = (
          id: string,
          title: string,
          projectType: 'MOVIE' | 'SERIES',
          genres: Genre[],
          status: Script['status'],
          quality: number,
          weeksInDevelopment: number,
          totalDevelopmentWeeks: number,
          logline: string
      ): Script => ({
          id,
          title,
          genres,
          status,
          quality,
          options: [],
          writerId: status === 'CONCEPT' ? null : 'cheat_full_slate_writer',
          weeksInDevelopment,
          totalDevelopmentWeeks,
          isOriginal: true,
          projectType,
          format: 'LIVE_ACTION',
          logline,
          createdAtWeek: Math.max(1, currentWeek - Math.max(1, weeksInDevelopment)),
          producedAtWeek: status === 'PRODUCED' ? Math.max(1, currentWeek - 6) : undefined,
          tags: ['FULL_STUDIO_SLATE_QA']
      });

      const qaScripts: Script[] = [
          makeScript(
              scriptIds.readyFeature,
              'Neon Justice',
              'MOVIE',
              ['ACTION'],
              'READY',
              88,
              8,
              8,
              'A completed feature script ready to greenlight immediately.'
          ),
          makeScript(
              scriptIds.readySeries,
              'Velvet Empire',
              'SERIES',
              ['CRIME'],
              'READY',
              84,
              7,
              7,
              'A premium series package ready for platform bidding tests.'
          ),
          makeScript(
              scriptIds.development,
              'After Midnight',
              'MOVIE',
              ['THRILLER'],
              'IN_DEVELOPMENT',
              57,
              4,
              9,
              'A script still being written while the studio builds momentum.'
          ),
          makeScript(
              scriptIds.concept,
              'Laugh Track',
              'MOVIE',
              ['COMEDY'],
              'CONCEPT',
              34,
              0,
              8,
              'A raw idea that should remain visible as early development work.'
          ),
          makeScript(
              scriptIds.produced,
              'Crown Archive',
              'MOVIE',
              ['DRAMA'],
              'PRODUCED',
              79,
              8,
              8,
              'A finished script used to verify produced archive behavior.'
          )
      ];

      const qaConcepts = [
          {
              id: `${qaPrefix}concept_feature_${now}`,
              scriptId: scriptIds.readyFeature,
              lastUpdated: currentWeek,
              crewModes: {},
              selectedCrew: {},
              castList: [],
              selectedLocations: ['Los Angeles'],
              tone: 72,
              lastStep: 'CONFIRM',
              format: 'LIVE_ACTION',
              connectedProjectIntent: 'SOLO'
          },
          {
              id: `${qaPrefix}concept_series_${now}`,
              scriptId: scriptIds.readySeries,
              lastUpdated: currentWeek,
              crewModes: {},
              selectedCrew: {},
              castList: [],
              selectedLocations: ['New York'],
              tone: 64,
              lastStep: 'CAST',
              format: 'LIVE_ACTION',
              connectedProjectIntent: 'SOLO'
          }
      ];

      const makeCommitment = (
          phase: NonNullable<Commitment['projectPhase']>,
          title: string,
          projectType: 'MOVIE' | 'SERIES',
          genre: Genre,
          phaseWeeksLeft: number,
          budget: number,
          quality: number
      ): Commitment => {
          const project = generateProjectDetails('HIGH', projectType, [], basePlayer);
          project.title = title;
          project.studioId = studio.id;
          project.genre = genre;
          project.estimatedBudget = budget;
          project.visibleHype = 'HIGH';
          project.hiddenStats.rawHype = 84;
          project.hiddenStats.qualityScore = quality;
          project.hiddenStats.scriptQuality = Math.max(60, quality - 4);
          project.hiddenStats.directorQuality = Math.max(60, quality - 6);
          project.hiddenStats.castingStrength = Math.max(60, quality - 8);

          return {
              id: `${qaPrefix}commit_${phase.toLowerCase()}_${now}`,
              name: title,
              type: 'JOB',
              roleType: 'LEAD',
              energyCost: 0,
              income: 0,
              lumpSum: 0,
              payoutType: 'LUMPSUM',
              projectPhase: phase,
              phaseWeeksLeft,
              totalPhaseDuration: Math.max(1, phaseWeeksLeft),
              projectDetails: phase === 'AWAITING_RELEASE'
                  ? {
                      ...project,
                      releaseStrategy: 'THEATRICAL',
                      screeningStrategy: 'NATIONAL',
                      releaseDate: currentWeek + 1
                  }
                  : project,
              productionPerformance: quality,
              promotionalBuzz: phase === 'AWAITING_RELEASE' ? 36 : 20
          };
      };

      const qaCommitments: Commitment[] = [
          makeCommitment('PLANNING', 'Shadow Ledger', 'MOVIE', 'CRIME', 3, 36_000_000, 74),
          makeCommitment('PRE_PRODUCTION', 'Velvet Empire: Season One', 'SERIES', 'DRAMA', 5, 64_000_000, 81),
          makeCommitment('PRODUCTION', 'Atlas Rising', 'MOVIE', 'ACTION', 6, 118_000_000, 86),
          makeCommitment('POST_PRODUCTION', 'Orbit House', 'MOVIE', 'SCI_FI', 2, 92_000_000, 83),
          makeCommitment('AWAITING_RELEASE', 'The Last Horizon', 'SERIES', 'THRILLER', 1, 52_000_000, 80)
      ];

      const makeReleaseProject = (title: string, projectType: 'MOVIE' | 'SERIES', genre: Genre, budget: number, quality: number) => {
          const project = generateProjectDetails('HIGH', projectType, [], basePlayer);
          project.title = title;
          project.studioId = studio.id;
          project.genre = genre;
          project.estimatedBudget = budget;
          project.hiddenStats.qualityScore = quality;
          project.hiddenStats.releaseWeek = Math.max(1, currentWeek - 2);
          return project;
      };

      const activeMovie = makeReleaseProject('Atlas Rising: Global Run', 'MOVIE', 'ADVENTURE', 145_000_000, 82);
      const activeSeries = makeReleaseProject('Night Ledger', 'SERIES', 'CRIME', 66_000_000, 79);

      const qaActiveReleases: ActiveRelease[] = [
          {
              id: `${qaPrefix}active_theatrical_${now}`,
              name: activeMovie.title,
              type: 'MOVIE',
              roleType: 'LEAD',
              projectDetails: {
                  ...activeMovie,
                  releaseStrategy: 'THEATRICAL',
                  releaseDate: Math.max(1, currentWeek - 4)
              },
              distributionPhase: 'THEATRICAL',
              weekNum: 4,
              weeklyGross: [82_000_000, 54_000_000, 33_000_000, 20_000_000],
              totalGross: 189_000_000,
              budget: 145_000_000,
              status: 'RUNNING',
              imdbRating: 7.7,
              productionPerformance: 82,
              maxTheatricalWeeks: 12,
              weeksInTheaters: 4
          } as any,
          {
              id: `${qaPrefix}active_streaming_${now}`,
              name: activeSeries.title,
              type: 'SERIES',
              roleType: 'LEAD',
              projectDetails: {
                  ...activeSeries,
                  releaseStrategy: 'STREAMING_ONLY',
                  releaseDate: Math.max(1, currentWeek - 3),
                  hiddenStats: {
                      ...activeSeries.hiddenStats,
                      platformId: 'NETFLIX'
                  }
              },
              distributionPhase: 'STREAMING',
              weekNum: 6,
              weeklyGross: [],
              totalGross: 0,
              budget: 66_000_000,
              status: 'FINISHED',
              imdbRating: 8.0,
              productionPerformance: 81,
              streamingRevenue: 78_000_000,
              streaming: {
                  platformId: 'NETFLIX',
                  weekOnPlatform: 6,
                  totalViews: 42_000_000,
                  weeklyViews: [11_000_000, 8_500_000, 6_000_000, 3_800_000],
                  isLeaving: false
              }
          } as any
      ];

      const qaPastProjects = [
          {
              id: `${qaPrefix}past_hit_${now}`,
              name: 'Crown City',
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              year: currentAge,
              releaseYear: currentAge,
              releaseWeek: Math.max(1, currentWeek - 18),
              releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(currentAge, currentWeek) - 18),
              earnings: 12_600_000,
              rating: 8.4,
              reception: 'Audience favorite',
              projectQuality: 84,
              imdbRating: 8.4,
              boxOfficeResult: 'HIT',
              outcomeTier: 'HIT',
              subtype: 'STANDALONE',
              futurePotential: {
                  sequelChance: 82,
                  franchiseChance: 55,
                  rebootChance: 12,
                  renewalChance: 0,
                  isFranchiseStarter: true,
                  isSequelGreenlit: false,
                  isRenewed: false,
                  seriesStatus: 'N/A'
              },
              studioId: studio.id,
              castList: [],
              reviews: [],
              budget: 48_000_000,
              gross: 240_000_000,
              genre: 'DRAMA',
              description: 'A prestige archive hit that still carries the studio brand.',
              projectType: 'MOVIE'
          },
          {
              id: `${qaPrefix}past_series_${now}`,
              name: 'Velvet Empire: Season One',
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              year: Math.max(16, currentAge - 1),
              releaseYear: Math.max(16, currentAge - 1),
              releaseWeek: 34,
              earnings: 8_200_000,
              rating: 8.1,
              reception: 'Streaming breakout',
              projectQuality: 81,
              imdbRating: 8.1,
              boxOfficeResult: 'HIT',
              outcomeTier: 'HIT',
              subtype: 'STANDALONE',
              futurePotential: {
                  sequelChance: 0,
                  franchiseChance: 28,
                  rebootChance: 10,
                  renewalChance: 84,
                  isFranchiseStarter: false,
                  isSequelGreenlit: false,
                  isRenewed: true,
                  seriesStatus: 'ONGOING'
              },
              studioId: studio.id,
              castList: [],
              reviews: [],
              budget: 58_000_000,
              gross: 0,
              streamingRevenue: 132_000_000,
              totalViews: 52_000_000,
              genre: 'CRIME',
              description: 'A successful streaming season with renewal heat.',
              projectType: 'SERIES'
          },
          {
              id: `${qaPrefix}past_flop_${now}`,
              name: 'Midnight Gold',
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              year: Math.max(16, currentAge - 2),
              releaseYear: Math.max(16, currentAge - 2),
              releaseWeek: 12,
              earnings: 1_400_000,
              rating: 5.6,
              reception: 'Expensive disappointment',
              projectQuality: 56,
              imdbRating: 5.6,
              boxOfficeResult: 'FLOP',
              outcomeTier: 'FLOP',
              subtype: 'STANDALONE',
              futurePotential: {
                  sequelChance: 12,
                  franchiseChance: 5,
                  rebootChance: 24,
                  renewalChance: 0,
                  isFranchiseStarter: false,
                  isSequelGreenlit: false,
                  isRenewed: false,
                  seriesStatus: 'N/A'
              },
              studioId: studio.id,
              castList: [],
              reviews: [],
              budget: 155_000_000,
              gross: 42_000_000,
              genre: 'SCI_FI',
              description: 'A costly miss that makes the studio dashboard feel lived in.',
              projectType: 'MOVIE'
          }
      ];

      const existingScripts = (studio.studioState?.scripts || []).filter((script: Script) => !script.id.startsWith(qaPrefix));
      const existingConcepts = (studio.studioState?.concepts || []).filter((concept: any) => !String(concept.id || '').startsWith(qaPrefix) && !String(concept.scriptId || '').startsWith(qaPrefix));
      const updatedStudio = {
          ...studio,
          balance: Math.max(studio.balance || 0, 500_000_000),
          stats: {
              ...studio.stats,
              valuation: Math.max(studio.stats?.valuation || 0, 750_000_000)
          },
          studioState: {
              ...(studio.studioState || {}),
              scripts: [...qaScripts, ...existingScripts],
              concepts: [...qaConcepts, ...existingConcepts],
              writers: studio.studioState?.writers || [],
              ipMarket: studio.studioState?.ipMarket || [],
              purchasedIPTitles: studio.studioState?.purchasedIPTitles || [],
              lastMarketRefreshWeek: studio.studioState?.lastMarketRefreshWeek || currentWeek,
              lastWriterRefreshWeek: studio.studioState?.lastWriterRefreshWeek || currentWeek
          }
      };

      const nextPlayer = {
          ...basePlayer,
          businesses: (basePlayer.businesses || []).map(b => b.id === updatedStudio.id ? updatedStudio : b),
          commitments: [
              ...qaCommitments,
              ...basePlayer.commitments.filter(commitment => !String(commitment.id).startsWith(qaPrefix))
          ],
          activeReleases: [
              ...qaActiveReleases,
              ...basePlayer.activeReleases.filter(release => !String(release.id).startsWith(qaPrefix))
          ],
          pastProjects: [
              ...qaPastProjects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(qaPrefix))
          ],
          logs: [{
              week: currentWeek,
              year: basePlayer.age,
              message: 'Full studio slate prepared across scripts, development, production, releases, and archive.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      };

      onUpdatePlayer(nextPlayer as Player);
      closeMenu();
      onOpenProductionHouseCheat?.();
      alert('Full Studio Slate is ready. Check Dashboard lanes, Development Lab, active releases, and Past Projects.');
  };

  const triggerLegacyProductionHouseMigrationQa = () => {
      if (!onUpdatePlayer) return;

      const legacyInvestment = 180_000_000;
      const safeBusinesses = Array.isArray(player.businesses) ? player.businesses : [];
      const businessesWithoutProductionHouse = safeBusinesses.filter(b => b.type !== 'PRODUCTION_HOUSE');
      const studioName = `${(player.name || 'Legacy').split(' ')[0]} Legacy Studios`;

      onUpdatePlayer({
          ...player,
          money: Math.max(player.money, 50_000_000),
          businesses: businessesWithoutProductionHouse,
          business: {
              type: 'Production House',
              name: studioName,
              totalInvestment: legacyInvestment
          },
          logs: [{
              week: player.currentWeek,
              year: player.age,
              message: `🧪 CHEAT: Legacy production house save shape injected. Reload/Continue to verify it migrates into a real Production House.`,
              type: 'neutral' as const
          }, ...player.logs].slice(0, 50)
      } as Player & { business: { type: string; name: string; totalInvestment: number } });

      closeMenu();
      alert('Legacy production house QA injected. Refresh/reopen the save, then confirm it becomes a Production House instead of being removed or converted to merch.');
  };


  return {
    triggerStudioAcquisitionSigningCheat,
    triggerPrivateEquityQa,
    triggerVaultSortingQa,
    triggerFullStudioSlateQa,
    triggerLegacyProductionHouseMigrationQa,
  };
};
