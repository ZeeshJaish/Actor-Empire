import type {
  ActiveRelease,
  BoxOfficeRegionId,
  CinemaChainId,
  Genre,
  MusicCreditRole,
  PlatformId,
  Player,
  Review,
} from '../../types';
import { Page } from '../../types';
import { formatMoney } from '../../services/formatUtils';
import { generateProjectDetails } from '../../services/roleLogic';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import {
  calculateStreamingDistributionBreakdown,
  calculateTheatricalDistributionBreakdown,
} from '../../services/distributionRevenue';
import {
  applyMusicImpactToHiddenStats,
  buildProjectMusicPlanFromArtists,
  calculateProjectMusicImpact,
  calculateWeeklySoundtrackRevenue,
  getMusicArtistCatalog,
  mergeSoundtrackRevenueBreakdowns,
} from '../../services/musicIndustry';
import { buildAudienceReception } from '../../services/audienceReception';

type HomeQaStudio = Player['businesses'][number] & { financeLedger?: any[] };

export interface HomeBoxOfficeQaActionsProps {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  closeMenu: () => void;
  ensureCheatStudio: () => { updatedPlayer: Player; studio: HomeQaStudio };
  onOpenBoxOfficeCheat?: () => void;
  setPage?: (page: Page) => void;
}

export const createHomeBoxOfficeQaActions = ({
  player,
  onUpdatePlayer,
  closeMenu,
  ensureCheatStudio,
  onOpenBoxOfficeCheat,
  setPage,
}: HomeBoxOfficeQaActionsProps) => {
  const triggerBoxOfficeDepthQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const qaPrefix = 'cheat_box_office_depth_';
      const releaseRegions: BoxOfficeRegionId[] = [
          'NORTH_AMERICA',
          'SOUTH_AMERICA',
          'EUROPE',
          'ASIA',
          'AFRICA',
          'OCEANIA'
      ];
      const allChains: CinemaChainId[] = [
          'EMPIRE_CINEMAS',
          'Z_CINEMAS',
          'NOVA_CIRCUIT',
          'PRISM_HALLS',
          'ARCLIGHT_GRID',
          'CROWNSCREEN'
      ];
      const releaseChainSelections = releaseRegions.reduce((selections, regionId) => {
          selections[regionId] = allChains;
          return selections;
      }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);

      const theatricalProject = generateProjectDetails('BLOCKBUSTER', 'MOVIE', [], basePlayer);
      theatricalProject.title = 'Atlas Rising';
      theatricalProject.studioId = studio.id;
      theatricalProject.genre = 'SCI_FI';
      theatricalProject.subtype = 'STANDALONE';
      theatricalProject.estimatedBudget = 185_000_000;
      theatricalProject.releaseStrategy = 'THEATRICAL';
      theatricalProject.releaseScale = 'GLOBAL';
      theatricalProject.screeningStrategy = 'INTERNATIONAL';
      theatricalProject.releaseRegionIds = releaseRegions;
      theatricalProject.releaseChainSelections = releaseChainSelections;
      theatricalProject.reservedMarketingBudget = 74_000_000;
      theatricalProject.marketingBudgetSpent = 62_000_000;
      theatricalProject.marketingBudgetRemaining = 12_000_000;
      theatricalProject.totalCampaignSpend = 62_000_000;
      theatricalProject.campaignPositioning = 'MASS_EVENT';
      theatricalProject.campaignTimeline = 'FRONT_LOADED_OPENING';
      theatricalProject.releaseDate = Math.max(1, basePlayer.currentWeek - 5);
      theatricalProject.hiddenStats = {
          ...theatricalProject.hiddenStats,
          scriptQuality: 82,
          directorQuality: 86,
          castingStrength: 88,
          distributionPower: 94,
          rawHype: 91,
          qualityScore: 84,
          releaseWeek: Math.max(1, basePlayer.currentWeek - 5),
          campaignFitScore: 81,
          campaignPromise: 'MASS_EVENT',
          campaignTimeline: 'FRONT_LOADED_OPENING',
          falseMarketingRisk: 'LOW',
          campaignOverspendRisk: 'MEDIUM'
      };

      const theatricalDemand = [242_000_000, 154_000_000, 92_000_000, 53_000_000, 31_000_000];
      const weeklyDistributionBreakdowns = theatricalDemand.map((gross, index) => (
          calculateTheatricalDistributionBreakdown(theatricalProject, gross, index + 1)
      ));
      const weeklyGross = weeklyDistributionBreakdowns.map(breakdown => breakdown.gross);
      const weeklyStudioReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.studioReceipts);
      const weeklyExhibitorReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.exhibitorReceipts);

      const streamingProject = generateProjectDetails('HIGH', 'SERIES', [], basePlayer);
      const platformId: PlatformId = 'NETFLIX';
      streamingProject.title = 'Northline: Season 1';
      streamingProject.studioId = studio.id;
      streamingProject.genre = 'CRIME';
      streamingProject.estimatedBudget = 68_000_000;
      streamingProject.releaseStrategy = 'STREAMING_ONLY';
      streamingProject.releaseScale = 'GLOBAL';
      streamingProject.releaseRegionIds = ['NORTH_AMERICA', 'EUROPE', 'ASIA', 'SOUTH_AMERICA'];
      streamingProject.reservedMarketingBudget = 26_000_000;
      streamingProject.marketingBudgetSpent = 19_000_000;
      streamingProject.marketingBudgetRemaining = 7_000_000;
      streamingProject.totalCampaignSpend = 19_000_000;
      streamingProject.campaignPositioning = 'SLEEPER_BUILD';
      streamingProject.campaignTimeline = 'BALANCED_ROLLOUT';
      streamingProject.releaseDate = Math.max(1, basePlayer.currentWeek - 6);
      streamingProject.hiddenStats = {
          ...streamingProject.hiddenStats,
          scriptQuality: 84,
          directorQuality: 78,
          castingStrength: 81,
          distributionPower: 79,
          rawHype: 73,
          qualityScore: 86,
          platformId,
          releaseWeek: Math.max(1, basePlayer.currentWeek - 6),
          campaignFitScore: 88,
          campaignPromise: 'SLEEPER_BUILD',
          campaignTimeline: 'BALANCED_ROLLOUT',
          falseMarketingRisk: 'LOW',
          campaignOverspendRisk: 'LOW'
      };

      const weeklyStreamingViews = [14_500_000, 10_800_000, 7_600_000, 5_200_000, 3_400_000, 2_100_000];
      const weeklyStreamingRevenue = [24_000_000, 18_500_000, 12_600_000, 8_400_000, 5_600_000, 3_200_000];
      const weeklyStreamingBreakdowns = weeklyStreamingViews.map((views, index) => (
          calculateStreamingDistributionBreakdown(streamingProject, platformId, views, weeklyStreamingRevenue[index], index + 1)
      ));

      const theatricalRelease: ActiveRelease = {
          id: `${qaPrefix}theatrical_${now}`,
          name: theatricalProject.title,
          type: 'MOVIE',
          roleType: 'LEAD',
          projectDetails: theatricalProject,
          distributionPhase: 'THEATRICAL',
          weekNum: weeklyGross.length,
          weeklyGross,
          totalGross: weeklyGross.reduce((sum, gross) => sum + gross, 0),
          weeklyStudioReceipts,
          totalStudioReceipts: weeklyStudioReceipts.reduce((sum, receipts) => sum + receipts, 0),
          weeklyExhibitorReceipts,
          totalExhibitorReceipts: weeklyExhibitorReceipts.reduce((sum, receipts) => sum + receipts, 0),
          weeklyDistributionBreakdowns,
          budget: theatricalProject.estimatedBudget,
          status: 'RUNNING',
          imdbRating: 8.2,
          productionPerformance: 86,
          maxTheatricalWeeks: 14,
          weeksInTheaters: weeklyGross.length,
          promotionalBuzz: 91,
          releaseWeek: Math.max(1, basePlayer.currentWeek - weeklyGross.length),
          releaseYear: basePlayer.age,
          releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek) - weeklyGross.length)
      };

      const streamingRelease: ActiveRelease = {
          id: `${qaPrefix}streaming_${now}`,
          name: streamingProject.title,
          type: 'SERIES',
          roleType: 'LEAD',
          projectDetails: streamingProject,
          distributionPhase: 'STREAMING',
          weekNum: weeklyStreamingViews.length,
          weeklyGross: [],
          totalGross: 0,
          budget: streamingProject.estimatedBudget,
          status: 'RUNNING',
          imdbRating: 8.4,
          productionPerformance: 85,
          streamingRevenue: weeklyStreamingRevenue.reduce((sum, revenue) => sum + revenue, 0),
          weeklyStreamingBreakdowns,
          studioRoyaltyPercentage: 18,
          streaming: {
              platformId,
              weekOnPlatform: weeklyStreamingViews.length,
              totalViews: weeklyStreamingViews.reduce((sum, views) => sum + views, 0),
              weeklyViews: weeklyStreamingViews,
              isLeaving: false
          },
          promotionalBuzz: 74,
          releaseWeek: Math.max(1, basePlayer.currentWeek - weeklyStreamingViews.length),
          releaseYear: basePlayer.age,
          releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek) - weeklyStreamingViews.length)
      };

      onUpdatePlayer({
          ...basePlayer,
          activeReleases: [
              theatricalRelease,
              streamingRelease,
              ...basePlayer.activeReleases.filter(release => !String(release.id).startsWith(qaPrefix))
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: 'Box office detail view prepared with regional theatrical receipts and streaming region data.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      });
      closeMenu();
      onOpenBoxOfficeCheat?.();
      alert('Box Office detail view is ready. Tap Atlas Rising or Northline in Box Office.');
  };

  const triggerBoxOfficeArchiveQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const qaPrefix = 'cheat_box_office_archive_';
      const currentYear = Math.max(18, basePlayer.age || 18);
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);
      const allRegions: BoxOfficeRegionId[] = [
          'NORTH_AMERICA',
          'SOUTH_AMERICA',
          'EUROPE',
          'ASIA',
          'AFRICA',
          'OCEANIA'
      ];
      const allChains: CinemaChainId[] = [
          'EMPIRE_CINEMAS',
          'Z_CINEMAS',
          'NOVA_CIRCUIT',
          'PRISM_HALLS',
          'ARCLIGHT_GRID',
          'CROWNSCREEN'
      ];
      const releaseChainSelections = allRegions.reduce((selections, regionId) => {
          selections[regionId] = allChains;
          return selections;
      }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);
      const futurePotential = {
          sequelChance: 34,
          franchiseChance: 22,
          rebootChance: 12,
          renewalChance: 0,
          isFranchiseStarter: false,
          isSequelGreenlit: false,
          isRenewed: false,
          seriesStatus: 'N/A' as const
      };
      const archiveScenarios = [
          { id: 'sleeper', title: 'Paper Moon Motel', genre: 'HORROR' as Genre, budget: 4_800_000, rating: 8.1, quality: 81, demand: [10, 9, 8.4, 7.5, 6.6, 5.7, 4.8, 3.9, 3.1, 2.3, 1.6, 1.1], baseWeeks: 9, extensionWeeks: 3, outcome: 'HIT' as const, gradient: 'from-slate-950 via-indigo-900 to-black' },
          { id: 'prestige', title: 'The Last Summer House', genre: 'DRAMA' as Genre, budget: 28_000_000, rating: 8.8, quality: 89, demand: [31, 25, 20, 16, 12, 9.5, 7.2, 5.1, 3.6, 2.3], baseWeeks: 10, extensionWeeks: 0, outcome: 'HIT' as const, gradient: 'from-rose-950 via-stone-800 to-black' },
          { id: 'event', title: 'Solaris Gate', genre: 'SCI_FI' as Genre, budget: 210_000_000, rating: 7.7, quality: 78, demand: [246, 158, 103, 70, 46, 31, 20, 13, 8, 5, 3, 1.8, 1.1, 0.7], baseWeeks: 14, extensionWeeks: 0, outcome: 'BLOCKBUSTER' as const, gradient: 'from-cyan-950 via-blue-900 to-black' },
          { id: 'family', title: 'Luna and the Lanterns', genre: 'ANIMATION' as Genre, budget: 72_000_000, rating: 8.4, quality: 85, demand: [64, 58, 52, 45, 38, 31, 25, 19, 14, 10, 7, 4.7, 3.1, 2], baseWeeks: 11, extensionWeeks: 3, outcome: 'HIT' as const, gradient: 'from-violet-950 via-fuchsia-800 to-black' },
          { id: 'flop', title: 'Kingdom of Ash', genre: 'FANTASY' as Genre, budget: 165_000_000, rating: 5.3, quality: 54, demand: [34, 12, 4.8, 1.7, 0.6, 0.2], baseWeeks: 11, extensionWeeks: 0, outcome: 'FLOP' as const, gradient: 'from-orange-950 via-red-900 to-black' },
          { id: 'romance', title: 'City Lights, Quiet Hearts', genre: 'ROMANCE' as Genre, budget: 18_000_000, rating: 7.5, quality: 74, demand: [18, 15, 12, 9.5, 7.5, 5.6, 4, 2.8, 1.8, 1.1], baseWeeks: 10, extensionWeeks: 0, outcome: 'HIT' as const, gradient: 'from-pink-950 via-rose-800 to-black' },
          { id: 'action', title: 'Redline Harbor', genre: 'ACTION' as Genre, budget: 96_000_000, rating: 7.2, quality: 73, demand: [92, 51, 28, 16, 8.5, 4.4, 2.1, 1], baseWeeks: 12, extensionWeeks: 0, outcome: 'AVERAGE' as const, gradient: 'from-red-950 via-amber-800 to-black' },
          { id: 'documentary', title: 'The River Remembers', genre: 'DOCUMENTARY' as Genre, budget: 3_200_000, rating: 8.9, quality: 91, demand: [2.8, 2.6, 2.5, 2.3, 2.1, 1.9, 1.6, 1.3, 1, 0.8, 0.6, 0.4], baseWeeks: 8, extensionWeeks: 4, outcome: 'HIT' as const, gradient: 'from-emerald-950 via-teal-800 to-black' },
          { id: 'comedy', title: 'Second Date, First Disaster', genre: 'COMEDY' as Genre, budget: 22_000_000, rating: 6.9, quality: 68, demand: [25, 17, 11, 7, 4.2, 2.5, 1.4, 0.8], baseWeeks: 10, extensionWeeks: 0, outcome: 'AVERAGE' as const, gradient: 'from-yellow-950 via-amber-700 to-black' },
          { id: 'mystery', title: 'The Ninth Witness', genre: 'MYSTERY' as Genre, budget: 39_000_000, rating: 8.0, quality: 82, demand: [29, 25, 21, 17, 13.5, 10.2, 7.6, 5.5, 3.8, 2.5, 1.5], baseWeeks: 9, extensionWeeks: 2, outcome: 'HIT' as const, gradient: 'from-zinc-950 via-slate-700 to-black' },
          { id: 'sports', title: 'Final Whistle', genre: 'SPORTS' as Genre, budget: 31_000_000, rating: 7.8, quality: 79, demand: [23, 19, 15, 11, 8, 5.8, 4, 2.7, 1.7, 1], baseWeeks: 10, extensionWeeks: 0, outcome: 'HIT' as const, gradient: 'from-lime-950 via-emerald-800 to-black' },
          { id: 'thriller', title: 'No Exit on 9th', genre: 'THRILLER' as Genre, budget: 14_000_000, rating: 7.3, quality: 75, demand: [15, 12.5, 10.4, 8.7, 7.1, 5.8, 4.6, 3.4, 2.4, 1.5, 0.9], baseWeeks: 8, extensionWeeks: 3, outcome: 'HIT' as const, gradient: 'from-neutral-950 via-purple-900 to-black' }
      ];

      const archivedProjects = archiveScenarios.map((scenario, index) => {
          const project = generateProjectDetails(
              scenario.budget >= 160_000_000 ? 'BLOCKBUSTER' : scenario.budget >= 70_000_000 ? 'HIGH' : scenario.budget >= 20_000_000 ? 'MID' : 'LOW',
              'MOVIE',
              [],
              basePlayer
          );
          // Keep this test library isolated from the player's actual studio, IP, awards, and valuation.
          const releaseYear = Math.max(16, currentYear - 3 - Math.floor(index / 4));
          const releaseWeek = 4 + ((index * 4) % 44);
          project.title = scenario.title;
          project.studioId = 'ARCHIVE_QA';
          project.genre = scenario.genre;
          project.subtype = 'STANDALONE';
          project.estimatedBudget = scenario.budget;
          project.releaseStrategy = 'THEATRICAL';
          project.releaseScale = 'GLOBAL';
          project.screeningStrategy = 'INTERNATIONAL';
          project.releaseRegionIds = allRegions;
          project.releaseChainSelections = releaseChainSelections;
          project.description = 'Completed theatrical run seeded for archive, region-detail, and run-history testing.';
          project.isOriginal = false;
          project.subjectName = 'Third-party archive test title';
          project.customPoster = {
              type: 'CONFIG',
              bgGradient: scenario.gradient,
              icon: 'Film',
              textColor: 'text-white'
          };
          project.hiddenStats = {
              ...project.hiddenStats,
              scriptQuality: scenario.quality,
              directorQuality: scenario.quality,
              castingStrength: Math.max(45, scenario.quality - 4),
              distributionPower: Math.max(55, scenario.quality + 2),
              rawHype: Math.max(42, scenario.quality - 2),
              qualityScore: scenario.quality,
              releaseWeek,
              campaignFitScore: scenario.quality,
              campaignPromise: 'MASS_EVENT',
              campaignTimeline: 'BALANCED_ROLLOUT',
              falseMarketingRisk: 'LOW',
              campaignOverspendRisk: 'LOW'
          };

          const weeklyDistributionBreakdowns = scenario.demand.map((millions, weekIndex) => (
              calculateTheatricalDistributionBreakdown(project, Math.round(millions * 1_000_000), weekIndex + 1)
          ));
          const weeklyGross = weeklyDistributionBreakdowns.map(breakdown => breakdown.gross);
          const weeklyStudioReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.studioReceipts);
          const weeklyExhibitorReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.exhibitorReceipts);
          const totalGross = weeklyGross.reduce((sum, gross) => sum + gross, 0);
          const totalStudioReceipts = weeklyStudioReceipts.reduce((sum, receipts) => sum + receipts, 0);
          const totalExhibitorReceipts = weeklyExhibitorReceipts.reduce((sum, receipts) => sum + receipts, 0);
          const outcomeTier = scenario.outcome === 'BLOCKBUSTER'
              ? 'MASSIVE_SUCCESS'
              : scenario.outcome === 'HIT'
                  ? 'SUCCESS'
                  : scenario.outcome === 'AVERAGE'
                      ? 'NEUTRAL'
                      : 'FAILURE';
          let extensionRemaining = scenario.extensionWeeks;
          let extensionReviewWeek = scenario.baseWeeks;
          const extensionHistory = [] as Array<{
              reviewWeek: number;
              addedWeeks: number;
              reason: 'SLEEPER_MOMENTUM' | 'STRONG_HOLD';
              weeklyGross: number;
              holdPercent: number;
              marketDemand: number;
          }>;
          while (extensionRemaining > 0) {
              const addedWeeks = Math.min(2, extensionRemaining);
              const currentGross = weeklyGross[Math.max(0, extensionReviewWeek - 1)] || 0;
              const previousGross = weeklyGross[Math.max(0, extensionReviewWeek - 2)] || 1;
              extensionHistory.push({
                  reviewWeek: extensionReviewWeek,
                  addedWeeks,
                  reason: scenario.budget <= 50_000_000 ? 'SLEEPER_MOMENTUM' : 'STRONG_HOLD',
                  weeklyGross: currentGross,
                  holdPercent: Math.round((currentGross / Math.max(1, previousGross)) * 100),
                  marketDemand: 108
              });
              extensionRemaining -= addedWeeks;
              extensionReviewWeek += addedWeeks;
          }

          return {
              id: `${qaPrefix}${scenario.id}_${now}`,
              name: scenario.title,
              type: 'ACTING_GIG',
              roleType: 'LEAD',
              year: releaseYear,
              releaseYear,
              releaseWeek,
              releasedAtAbsoluteWeek: getAbsoluteWeek(releaseYear, releaseWeek),
              earnings: 0,
              rating: scenario.rating,
              reception: scenario.outcome === 'FLOP' ? 'Audience rejection' : scenario.extensionWeeks > 0 ? 'Word-of-mouth breakout' : 'Completed theatrical run',
              projectQuality: scenario.quality,
              imdbRating: scenario.rating,
              boxOfficeResult: scenario.outcome,
              outcomeTier,
              subtype: 'STANDALONE',
              futurePotential: { ...futurePotential, sequelChance: scenario.outcome === 'BLOCKBUSTER' ? 72 : scenario.outcome === 'HIT' ? 46 : 14 },
              studioId: 'ARCHIVE_QA',
              castList: [],
              reviews: [],
              budget: scenario.budget,
              gross: totalGross,
              weeklyGross,
              weeklyStudioReceipts,
              totalStudioReceipts,
              weeklyExhibitorReceipts,
              totalExhibitorReceipts,
              weeklyDistributionBreakdowns,
              releaseRegionIds: allRegions,
              releaseChainSelections,
              boxOfficeArchiveVersion: 1,
              baseTheatricalWeeks: scenario.baseWeeks,
              theatricalExtensionWeeks: scenario.extensionWeeks,
              theatricalExtensionHistory: extensionHistory,
              genre: scenario.genre,
              subjectName: 'Third-party archive test title',
              isOriginal: false,
              description: project.description,
              projectType: 'MOVIE',
              customPoster: project.customPoster,
              isQaArchive: true,
              projectDetails: project
          } as any;
      });

      onUpdatePlayer({
          ...basePlayer,
          businesses: basePlayer.businesses.map(business => business.id === studio.id ? studio : business),
          pastProjects: [
              ...archivedProjects,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(qaPrefix))
          ],
          logs: [{
              week: currentWeek,
              year: currentYear,
              message: 'CHEAT: 12 completed theatrical runs added to the permanent Box Office archive. Includes hits, flops, sleepers, regional receipts, and extension history.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      } as Player);
      closeMenu();
      onOpenBoxOfficeCheat?.();
      alert('Box Office Archive QA is ready: 12 completed theatrical runs are in Box Office > All Time. Open any title to review permanent regional details and extended-run history.');
  };

  const triggerAudiencePulseQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const qaPrefix = 'cheat_audience_pulse_';
      const currentYear = Math.max(18, basePlayer.age || 18);
      const currentWeek = Math.max(1, basePlayer.currentWeek || 1);
      const currentAbsoluteWeek = getAbsoluteWeek(currentYear, currentWeek);
      const releaseRegions: BoxOfficeRegionId[] = ['NORTH_AMERICA', 'EUROPE', 'ASIA'];
      const releaseChainSelections = {
          NORTH_AMERICA: ['EMPIRE_CINEMAS', 'NOVA_CIRCUIT'],
          EUROPE: ['PRISM_HALLS'],
          ASIA: ['CROWNSCREEN']
      } as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>;
      const baseFuturePotential = {
          sequelChance: 42,
          franchiseChance: 20,
          rebootChance: 8,
          renewalChance: 0,
          isFranchiseStarter: false,
          isSequelGreenlit: false,
          isRenewed: false,
          seriesStatus: 'N/A' as const
      };
      const makeCriticReviews = (projectId: string, title: string, rating: number): Review[] => {
          const positive = rating >= 7.6;
          const mixed = rating < 7.6 && rating >= 6.1;
          const criticData = [
              ['Leena Cross', 'Screen Ledger'],
              ['Mira Vale', 'Cinema Wire'],
              ['Omar Reed', 'Frame Journal'],
              ['Anika Stone', 'Box Office Weekly'],
              ['Theo Mercer', 'The Backlot'],
              ['Dev Rao', 'Daily Review']
          ];
          const lines = positive
              ? [
                  `${title} has the kind of finish that makes the audience score feel earned.`,
                  `A polished release with real commercial shape and a clean emotional hook.`,
                  `The craft is confident enough to keep the conversation alive after opening weekend.`,
                  `It knows when to go big and when to let the cast carry the moment.`,
                  `A strong package that should age better than most crowd plays.`,
                  `The run feels built on genuine word of mouth, not just campaign noise.`
              ]
              : mixed
                  ? [
                      `${title} has bright sections, but the total package is a little uneven.`,
                      `The crowd hook is visible even when the middle stretch drags.`,
                      `A readable commercial swing with a few rough creative edges.`,
                      `It works in bursts, especially when the ensemble gets room.`,
                      `The movie finds its lane, but it takes time getting there.`,
                      `Good enough to stay in the conversation, not clean enough to dominate it.`
                  ]
                  : [
                      `${title} has promise, but the response may cool quickly.`,
                      `The idea is bigger than the final execution.`,
                      `A few moments connect, but the movie struggles to sustain them.`,
                      `It may find defenders, though wider turnout looks limited.`,
                      `The campaign sells a stronger movie than the one on screen.`,
                      `Too many pieces feel underpowered for a broad audience breakout.`
                  ];
          return criticData.map(([author, publication], index) => {
              const sentiment: Review['sentiment'] = positive
                  ? (index === 2 ? 'MIXED' : 'POSITIVE')
                  : mixed
                      ? (index === 5 ? 'NEGATIVE' : index % 2 === 0 ? 'MIXED' : 'POSITIVE')
                      : (index % 2 === 0 ? 'NEGATIVE' : 'MIXED');
              return {
                  id: `${projectId}_critic_${index}`,
                  author,
                  publication,
                  text: lines[index],
                  sentiment,
                  type: 'CRITIC',
                  rating: sentiment === 'POSITIVE' ? 4.4 : sentiment === 'MIXED' ? 3.1 : 1.9
              };
          });
      };

      const makeProjectDetails = (title: string, genre: Genre, budget: number, quality: number, gradient: string) => {
          const details = generateProjectDetails('HIGH', 'MOVIE', [], basePlayer);
          details.title = title;
          details.studioId = studio.id;
          details.genre = genre;
          details.subtype = 'STANDALONE';
          details.estimatedBudget = budget;
          details.releaseStrategy = 'THEATRICAL';
          details.releaseScale = 'GLOBAL';
          details.screeningStrategy = 'INTERNATIONAL';
          details.releaseRegionIds = releaseRegions;
          details.releaseChainSelections = releaseChainSelections;
          details.visibleHype = 'HIGH';
          details.description = title.includes('Live')
              ? 'A crowd-pleasing action film where the audience score is still moving during the run.'
              : 'A completed prestige thriller with a settled audience verdict after its run.';
          details.hiddenStats = {
              ...details.hiddenStats,
              scriptQuality: Math.max(45, quality - 2),
              directorQuality: quality,
              castingStrength: Math.max(45, quality - 4),
              distributionPower: Math.max(45, quality + 3),
              rawHype: Math.max(45, quality + 4),
              qualityScore: quality,
              releaseWeek: currentWeek,
              campaignFitScore: Math.max(45, quality - 1),
              campaignPromise: 'MASS_EVENT',
              campaignTimeline: 'BALANCED_ROLLOUT',
              falseMarketingRisk: 'LOW',
              campaignOverspendRisk: 'LOW'
          };
          details.directorName = quality >= 82 ? 'Mara Voss' : 'Kiran Vale';
          details.visibleDirectorTier = quality >= 82 ? 'Prestige' : 'Reliable';
          details.visibleScriptBuzz = quality >= 82 ? 'Hot' : 'Solid';
          details.visibleCastStrength = quality >= 82 ? 'Strong' : 'Balanced';
          details.customPoster = {
              type: 'CONFIG' as const,
              bgGradient: gradient,
              icon: 'Film' as const,
              textColor: 'text-white'
          };
          return details;
      };

      const liveProject = makeProjectDetails(
          'Live Audience Drift',
          'ACTION',
          118_000_000,
          79,
          'from-cyan-950 via-blue-900 to-black'
      );
      liveProject.reviews = makeCriticReviews(`${qaPrefix}live_${now}`, liveProject.title, 7.4);
      const liveWeeklyBreakdowns = [74_000_000, 46_000_000].map((gross, index) => (
          calculateTheatricalDistributionBreakdown(liveProject, gross, index + 1)
      ));
      const liveWeeklyGross = liveWeeklyBreakdowns.map(breakdown => breakdown.gross);
      const liveOpeningRelease = {
          id: `${qaPrefix}live_${now}`,
          name: liveProject.title,
          type: 'MOVIE',
          roleType: 'LEAD',
          projectDetails: liveProject,
          distributionPhase: 'THEATRICAL',
          weekNum: 1,
          weeklyGross: [liveWeeklyGross[0]],
          totalGross: liveWeeklyGross[0],
          weeklyStudioReceipts: [liveWeeklyBreakdowns[0].studioReceipts],
          totalStudioReceipts: liveWeeklyBreakdowns[0].studioReceipts,
          weeklyExhibitorReceipts: [liveWeeklyBreakdowns[0].exhibitorReceipts],
          totalExhibitorReceipts: liveWeeklyBreakdowns[0].exhibitorReceipts,
          weeklyDistributionBreakdowns: [liveWeeklyBreakdowns[0]],
          budget: liveProject.estimatedBudget,
          status: 'RUNNING',
          imdbRating: 7.4,
          productionPerformance: 79,
          maxTheatricalWeeks: 10,
          weeksInTheaters: 1,
          promotionalBuzz: 84,
          releaseWeek: Math.max(1, currentWeek - 1),
          releaseYear: currentYear,
          releasedAtAbsoluteWeek: Math.max(1, currentAbsoluteWeek - 1)
      } as ActiveRelease;
      const liveOpeningAudience = buildAudienceReception(liveOpeningRelease, undefined, Math.max(1, currentWeek - 1), currentYear);
      const liveRelease = {
          ...liveOpeningRelease,
          weekNum: 2,
          weeklyGross: liveWeeklyGross,
          totalGross: liveWeeklyGross.reduce((sum, gross) => sum + gross, 0),
          weeklyStudioReceipts: liveWeeklyBreakdowns.map(breakdown => breakdown.studioReceipts),
          totalStudioReceipts: liveWeeklyBreakdowns.reduce((sum, breakdown) => sum + breakdown.studioReceipts, 0),
          weeklyExhibitorReceipts: liveWeeklyBreakdowns.map(breakdown => breakdown.exhibitorReceipts),
          totalExhibitorReceipts: liveWeeklyBreakdowns.reduce((sum, breakdown) => sum + breakdown.exhibitorReceipts, 0),
          weeklyDistributionBreakdowns: liveWeeklyBreakdowns,
          weeksInTheaters: 2
      } as ActiveRelease;
      const liveAudience = buildAudienceReception(liveRelease, liveOpeningAudience, currentWeek, currentYear);
      liveRelease.audienceReception = liveAudience;
      liveRelease.projectDetails = {
          ...liveProject,
          audienceReception: liveAudience
      };

      const finalProject = makeProjectDetails(
          'Final Audience Verdict',
          'THRILLER',
          42_000_000,
          86,
          'from-emerald-950 via-zinc-900 to-black'
      );
      finalProject.reviews = makeCriticReviews(`${qaPrefix}final_${now}`, finalProject.title, 8.3);
      finalProject.releaseDate = Math.max(1, currentWeek - 11);
      const finalWeeklyBreakdowns = [28_000_000, 23_000_000, 19_000_000, 14_000_000, 9_000_000, 5_000_000, 2_400_000].map((gross, index) => (
          calculateTheatricalDistributionBreakdown(finalProject, gross, index + 1)
      ));
      const finalWeeklyGross = finalWeeklyBreakdowns.map(breakdown => breakdown.gross);
      const finalOpeningRelease = {
          id: `${qaPrefix}final_${now}`,
          name: finalProject.title,
          type: 'MOVIE',
          roleType: 'LEAD',
          projectDetails: finalProject,
          distributionPhase: 'THEATRICAL',
          weekNum: 1,
          weeklyGross: [finalWeeklyGross[0]],
          totalGross: finalWeeklyGross[0],
          budget: finalProject.estimatedBudget,
          status: 'RUNNING',
          imdbRating: 8.3,
          productionPerformance: 87,
          maxTheatricalWeeks: 7,
          weeksInTheaters: 1,
          promotionalBuzz: 73,
          releaseWeek: Math.max(1, currentWeek - 8),
          releaseYear: currentYear,
          releasedAtAbsoluteWeek: Math.max(1, currentAbsoluteWeek - 8)
      } as ActiveRelease;
      const finalOpeningAudience = buildAudienceReception(finalOpeningRelease, undefined, Math.max(1, currentWeek - 8), currentYear);
      const finalRelease = {
          ...finalOpeningRelease,
          weekNum: finalWeeklyGross.length,
          weeklyGross: finalWeeklyGross,
          totalGross: finalWeeklyGross.reduce((sum, gross) => sum + gross, 0),
          weeklyStudioReceipts: finalWeeklyBreakdowns.map(breakdown => breakdown.studioReceipts),
          totalStudioReceipts: finalWeeklyBreakdowns.reduce((sum, breakdown) => sum + breakdown.studioReceipts, 0),
          weeklyExhibitorReceipts: finalWeeklyBreakdowns.map(breakdown => breakdown.exhibitorReceipts),
          totalExhibitorReceipts: finalWeeklyBreakdowns.reduce((sum, breakdown) => sum + breakdown.exhibitorReceipts, 0),
          weeklyDistributionBreakdowns: finalWeeklyBreakdowns,
          status: 'FINISHED',
          weeksInTheaters: finalWeeklyGross.length
      } as ActiveRelease;
      const finalAudience = buildAudienceReception(finalRelease, finalOpeningAudience, currentWeek, currentYear, { isFinal: true });
      const finalPastProject = {
          id: `${qaPrefix}final_${now}`,
          name: finalProject.title,
          type: 'ACTING_GIG',
          roleType: 'LEAD',
          year: currentYear,
          releaseYear: currentYear,
          releaseWeek: Math.max(1, currentWeek - 1),
          releasedAtAbsoluteWeek: Math.max(1, currentAbsoluteWeek - 1),
          earnings: 3_800_000,
          rating: 8.3,
          reception: 'Audience favorite',
          projectQuality: 86,
          imdbRating: 8.3,
          boxOfficeResult: 'HIT',
          outcomeTier: 'HIT',
          subtype: 'STANDALONE',
          futurePotential: { ...baseFuturePotential, sequelChance: 58, franchiseChance: 28 },
          studioId: studio.id,
          castList: [],
          reviews: finalProject.reviews,
          audienceReception: finalAudience,
          budget: finalProject.estimatedBudget,
          gross: finalRelease.totalGross,
          weeklyGross: finalRelease.weeklyGross,
          weeklyStudioReceipts: finalRelease.weeklyStudioReceipts,
          totalStudioReceipts: finalRelease.totalStudioReceipts,
          weeklyExhibitorReceipts: finalRelease.weeklyExhibitorReceipts,
          totalExhibitorReceipts: finalRelease.totalExhibitorReceipts,
          weeklyDistributionBreakdowns: finalRelease.weeklyDistributionBreakdowns,
          genre: finalProject.genre,
          description: finalProject.description,
          projectType: 'MOVIE',
          customPoster: finalProject.customPoster,
          projectDetails: {
              ...finalProject,
              audienceReception: finalAudience
          }
      } as any;

      onUpdatePlayer({
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? studio : b),
          activeReleases: [
              liveRelease,
              ...basePlayer.activeReleases.filter(release => !String(release.id).startsWith(qaPrefix))
          ],
          pastProjects: [
              finalPastProject,
              ...basePlayer.pastProjects.filter(project => !String(project.id).startsWith(qaPrefix))
          ],
          logs: [{
              week: currentWeek,
              year: currentYear,
              message: 'Audience Pulse prepared with a live release and a completed audience verdict.',
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      } as Player);
      closeMenu();
      setPage?.(Page.MOBILE);
      alert('Audience Pulse is ready. Open Phone > IMDb: Live Audience Drift is running and Final Audience Verdict is completed.');
  };

  const triggerSoundtrackRevenueQa = () => {
      if (!onUpdatePlayer) return;

      const { updatedPlayer: basePlayer, studio } = ensureCheatStudio();
      const now = Date.now();
      const qaPrefix = 'cheat_soundtrack_revenue_';
      const releaseRegions: BoxOfficeRegionId[] = ['NORTH_AMERICA', 'EUROPE', 'ASIA'];
      const releaseChainSelections = releaseRegions.reduce((selections, regionId) => {
          selections[regionId] = ['EMPIRE_CINEMAS', 'NOVA_CIRCUIT', 'PRISM_HALLS'];
          return selections;
      }, {} as Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>);

      const project = generateProjectDetails('BLOCKBUSTER', 'MOVIE', [], basePlayer);
      project.title = 'Soundtrack Empire';
      project.studioId = studio.id;
      project.genre = 'ACTION';
      project.subtype = 'STANDALONE';
      project.estimatedBudget = 155_000_000;
      project.releaseStrategy = 'THEATRICAL';
      project.releaseScale = 'GLOBAL';
      project.screeningStrategy = 'INTERNATIONAL';
      project.releaseRegionIds = releaseRegions;
      project.releaseChainSelections = releaseChainSelections;
      project.reservedMarketingBudget = 48_000_000;
      project.marketingBudgetSpent = 41_000_000;
      project.marketingBudgetRemaining = 7_000_000;
      project.totalCampaignSpend = 41_000_000;
      project.campaignPositioning = 'MASS_EVENT';
      project.campaignTimeline = 'FRONT_LOADED_OPENING';
      project.releaseDate = Math.max(1, basePlayer.currentWeek - 3);
      project.customPoster = {
          type: 'CONFIG',
          bgGradient: 'from-cyan-950 via-fuchsia-900 to-black',
          icon: 'Film',
          textColor: 'text-white'
      } as any;

      const musicRoles: MusicCreditRole[] = [
          'LEAD_SINGLE',
          'SOUNDTRACK_EP',
          'PROMO_ALBUM',
          'MUSIC_VIDEO_TIE_IN',
          'TRAILER_ANTHEM'
      ];
      const musicCatalog = getMusicArtistCatalog(basePlayer.world);
      const musicPlan = buildProjectMusicPlanFromArtists(
          project,
          'PROMO_ALBUM',
          [],
          `${qaPrefix}${now}`,
          musicRoles.length,
          musicRoles,
          true,
          musicCatalog
      );
      const musicImpact = calculateProjectMusicImpact(project, musicPlan, musicCatalog);
      project.musicPlan = musicPlan;
      project.hiddenStats = {
          ...applyMusicImpactToHiddenStats({
              ...project.hiddenStats,
              scriptQuality: 82,
              directorQuality: 84,
              castingStrength: 87,
              distributionPower: 88,
              rawHype: 90,
              qualityScore: 83,
              releaseWeek: Math.max(1, basePlayer.currentWeek - 3),
              campaignFitScore: 86,
              campaignPromise: 'MASS_EVENT',
              campaignTimeline: 'FRONT_LOADED_OPENING',
              falseMarketingRisk: 'LOW',
              campaignOverspendRisk: 'MEDIUM'
          }, musicImpact, musicPlan)
      };

      const weeklyDemand = [132_000_000, 91_000_000, 57_000_000];
      const weeklyDistributionBreakdowns = weeklyDemand.map((gross, index) => (
          calculateTheatricalDistributionBreakdown(project, gross, index + 1)
      ));
      const weeklyGross = weeklyDistributionBreakdowns.map(breakdown => breakdown.gross);
      const weeklyStudioReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.studioReceipts);
      const weeklyExhibitorReceipts = weeklyDistributionBreakdowns.map(breakdown => breakdown.exhibitorReceipts);
      const weeklySoundtrackBreakdowns = weeklyGross.map((gross, index) => (
          calculateWeeklySoundtrackRevenue(project, {
              week: index + 1,
              theatricalGross: gross,
              catalog: musicCatalog,
              seed: `${qaPrefix}${now}_${index}`
          })
      ));
      const soundtrackRevenueBreakdown = weeklySoundtrackBreakdowns.reduce(
          (total, breakdown) => mergeSoundtrackRevenueBreakdowns(total, breakdown),
          mergeSoundtrackRevenueBreakdowns()
      );
      const weeklySoundtrackRevenue = weeklySoundtrackBreakdowns.map(breakdown => breakdown.totalRevenue);
      const totalSoundtrackRevenue = soundtrackRevenueBreakdown.totalRevenue;
      const releaseId = `${qaPrefix}${now}`;
      const release: ActiveRelease = {
          id: releaseId,
          name: project.title,
          type: 'MOVIE',
          roleType: 'LEAD',
          projectDetails: project,
          distributionPhase: 'THEATRICAL',
          weekNum: weeklyGross.length,
          weeklyGross,
          totalGross: weeklyGross.reduce((sum, gross) => sum + gross, 0),
          weeklyStudioReceipts,
          totalStudioReceipts: weeklyStudioReceipts.reduce((sum, receipts) => sum + receipts, 0),
          weeklyExhibitorReceipts,
          totalExhibitorReceipts: weeklyExhibitorReceipts.reduce((sum, receipts) => sum + receipts, 0),
          weeklyDistributionBreakdowns,
          soundtrackRevenue: totalSoundtrackRevenue,
          weeklySoundtrackRevenue,
          soundtrackRevenueBreakdown,
          weeklySoundtrackBreakdowns,
          budget: project.estimatedBudget,
          status: 'RUNNING',
          imdbRating: 8.1,
          productionPerformance: 86,
          maxTheatricalWeeks: 12,
          weeksInTheaters: weeklyGross.length,
          promotionalBuzz: 93,
          releaseWeek: Math.max(1, basePlayer.currentWeek - weeklyGross.length),
          releaseYear: basePlayer.age,
          releasedAtAbsoluteWeek: Math.max(1, getAbsoluteWeek(basePlayer.age, basePlayer.currentWeek) - weeklyGross.length)
      };
      const updatedStudio = {
          ...studio,
          balance: (studio.balance || 0) + totalSoundtrackRevenue,
          stats: {
              ...studio.stats,
              weeklyRevenue: (studio.stats.weeklyRevenue || 0) + totalSoundtrackRevenue,
              weeklyProfit: (studio.stats.weeklyProfit || 0) + totalSoundtrackRevenue,
              lifetimeRevenue: (studio.stats.lifetimeRevenue || 0) + totalSoundtrackRevenue
          },
          financeLedger: [
              {
                  id: `${qaPrefix}ledger_${now}`,
                  week: basePlayer.currentWeek,
                  year: basePlayer.age,
                  amount: totalSoundtrackRevenue,
                  type: 'SOUNDTRACK' as const,
                  label: `${project.title} soundtrack revenue`,
                  projectId: releaseId
              },
              ...(studio.financeLedger || [])
          ].slice(0, 80)
      };

      onUpdatePlayer({
          ...basePlayer,
          businesses: basePlayer.businesses.map(b => b.id === studio.id ? updatedStudio : b),
          activeReleases: [
              release,
              ...basePlayer.activeReleases.filter(item => !String(item.id).startsWith(qaPrefix))
          ],
          logs: [{
              week: basePlayer.currentWeek,
              year: basePlayer.age,
              message: `🎵 Soundtrack revenue prepared for ${project.title}. Current soundtrack take: ${formatMoney(totalSoundtrackRevenue)}.`,
              type: 'positive' as const
          }, ...basePlayer.logs].slice(0, 50)
      });
      closeMenu();
      onOpenBoxOfficeCheat?.();
      alert(`Soundtrack Revenue is ready. Open Soundtrack Empire in Box Office.`);
  };


  return {
    triggerBoxOfficeDepthQa,
    triggerBoxOfficeArchiveQa,
    triggerAudiencePulseQa,
    triggerSoundtrackRevenueQa,
  };
};
