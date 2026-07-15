import React, { useState } from 'react';
import { Player, ActiveRelease, OutsideProductionInvestment, BoxOfficeRegionId, CinemaChainId } from '../../types';
import { PLATFORMS } from '../../services/streamingLogic';
import { getBoxOfficeRegionLabel, getBoxOfficeRegionShortLabel, getCinemaChainById } from '../../services/cinemaChains';
import { getProjectIdentityLabel } from '../../services/genreCatalog';
import { getProjectReleaseLabel } from '../../services/releaseTiming';
import { getAbsoluteWeek } from '../../services/legacyLogic';
import { getPlayerLanguage, t } from '../../services/i18n';
import { ArrowLeft, BarChart3, TrendingUp, ChevronRight, Radio, Trophy, Building2, Medal } from 'lucide-react';
import { CinemaChainLogo } from '../lifestyle/business/components/CinemaChainLogo';

interface BoxOfficeAppProps {
  player: Player;
  onBack: () => void;
}

type BoxOfficeSection = 'LIVE' | 'WEEKLY' | 'ALL_TIME' | 'PARTNERS' | 'RECORDS';
type BoxOfficeDetailTab = 'OVERVIEW' | 'WEEKLY' | 'REGIONS' | 'PARTNERS';
type BoxOfficeAllTimeMode = 'WORLDWIDE' | 'STUDIO' | 'ROI' | 'OPENING' | 'STREAMING';

const BOX_OFFICE_SECTIONS: {
    id: BoxOfficeSection;
    labelKey: string;
    icon: React.ElementType;
}[] = [
    { id: 'LIVE', labelKey: 'box.section.live', icon: Radio },
    { id: 'WEEKLY', labelKey: 'box.section.weekly', icon: TrendingUp },
    { id: 'ALL_TIME', labelKey: 'box.section.allTime', icon: Trophy },
    { id: 'PARTNERS', labelKey: 'box.section.partners', icon: Building2 },
    { id: 'RECORDS', labelKey: 'box.section.records', icon: Medal }
];

const DETAIL_TABS: { id: BoxOfficeDetailTab; labelKey: string }[] = [
    { id: 'OVERVIEW', labelKey: 'box.detail.overview' },
    { id: 'WEEKLY', labelKey: 'box.detail.weekly' },
    { id: 'REGIONS', labelKey: 'box.detail.regions' },
    { id: 'PARTNERS', labelKey: 'box.detail.partners' }
];

const ALL_TIME_MODES: { id: BoxOfficeAllTimeMode; labelKey: string; metricLabelKey: string }[] = [
    { id: 'WORLDWIDE', labelKey: 'box.allTime.world', metricLabelKey: 'box.records.topWorldwide' },
    { id: 'STUDIO', labelKey: 'box.allTime.studio', metricLabelKey: 'box.metric.studioReceipts' },
    { id: 'ROI', labelKey: 'box.allTime.roi', metricLabelKey: 'box.records.bestRoi' },
    { id: 'OPENING', labelKey: 'box.allTime.opening', metricLabelKey: 'box.records.biggestOpening' },
    { id: 'STREAMING', labelKey: 'box.allTime.stream', metricLabelKey: 'box.records.streamingHits' }
];

type WeeklyChartEntry = {
    id: string;
    title: string;
    source: 'PLAYER' | 'MARKET' | 'OUTSIDE';
    rel?: ActiveRelease;
    weeklyGross: number;
    previousGross?: number;
    studioReceipts: number;
    screens: number;
    runWeek: number;
    budget: number;
    imdbRating?: number;
};

type BoxOfficeArchiveEntry = {
    id: string;
    title: string;
    type: 'Theatrical' | 'Streaming' | 'Hybrid';
    source: 'LIVE' | 'HISTORY';
    totalRevenue: number;
    worldwideGross: number;
    streamingRevenue: number;
    soundtrackRevenue: number;
    studioReceipts: number;
    budget: number;
    rating: number;
    openingWeekend: number;
    roi: number;
    weekTwoHold?: number;
};

const SIMULATED_WEEKLY_MARKET: Omit<WeeklyChartEntry, 'weeklyGross' | 'previousGross' | 'studioReceipts' | 'runWeek'>[] = [
    { id: 'market_starfall', title: 'Starfall Empire', source: 'MARKET', screens: 18400, budget: 210_000_000, imdbRating: 7.4 },
    { id: 'market_lakehouse', title: 'Lakehouse Letters', source: 'MARKET', screens: 5200, budget: 42_000_000, imdbRating: 8.1 },
    { id: 'market_hardline', title: 'Hardline Unit', source: 'MARKET', screens: 11200, budget: 96_000_000, imdbRating: 6.9 },
    { id: 'market_little_moon', title: 'Little Moon Club', source: 'MARKET', screens: 3100, budget: 14_000_000, imdbRating: 8.4 },
    { id: 'market_haunted_signal', title: 'The Haunted Signal', source: 'MARKET', screens: 7400, budget: 28_000_000, imdbRating: 6.6 },
    { id: 'market_palace_heist', title: 'Palace Heist', source: 'MARKET', screens: 9800, budget: 72_000_000, imdbRating: 7.2 },
    { id: 'market_frost_city', title: 'Frost City', source: 'MARKET', screens: 4300, budget: 38_000_000, imdbRating: 7.8 }
];

const hashString = (value: string): number => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const absoluteWeek = (year: number, week: number): number => Math.max(0, year * 52 + week);

export const BoxOfficeApp: React.FC<BoxOfficeAppProps> = ({ player, onBack }) => {
  const [tab, setTab] = useState<'THEATERS' | 'STREAMING'>('THEATERS');
  const [section, setSection] = useState<BoxOfficeSection>('LIVE');
  const [detailTab, setDetailTab] = useState<BoxOfficeDetailTab>('OVERVIEW');
  const [allTimeMode, setAllTimeMode] = useState<BoxOfficeAllTimeMode>('WORLDWIDE');
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);
  const language = getPlayerLanguage(player);
  const tr = (key: Parameters<typeof t>[1], vars?: Parameters<typeof t>[2]) => t(language, key, vars);
  
  // Safe access to arrays
  const activeReleases = player.activeReleases || [];
  const theatrical = activeReleases.filter(r => r.distributionPhase === 'THEATRICAL');
  const streaming = activeReleases.filter(r => r.distributionPhase === 'STREAMING' && r.streaming);
  const selectedRelease = selectedReleaseId ? activeReleases.find(release => release.id === selectedReleaseId) : null;
  const releaseFallback = { currentAge: player.age, currentWeek: player.currentWeek };

  const formatMoney = (amount: number) => {
      if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`;
      if (amount >= 1_000) return `$${(amount / 1_000).toFixed(0)}k`;
      return `$${amount}`;
  };

  const formatMoneyShort = (amount: number) => {
      if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
      if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k`;
      return `${amount}`;
  };

  const formatViews = (num: number) => {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      return (num / 1_000).toFixed(0) + 'k';
  };

  const formatViewsShort = (num: number) => {
      if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
      return (num / 1_000).toFixed(0) + 'k';
  };

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const getLatestDrop = (values: number[]) => {
      if (!values || values.length < 2) return null;
      const previous = Math.max(1, values[values.length - 2]);
      const latest = values[values.length - 1];
      return Math.round(((previous - latest) / previous) * 100);
  };

  const getStreamingContract = (rel: ActiveRelease) => {
      const explicitUpfrontFee = rel.streamingUpfrontFee ?? rel.projectDetails?.streamingRevenue;
      const upfrontFee = Math.max(0, Number(
          explicitUpfrontFee
          ?? (rel.studioRoyaltyPercentage ? 0 : rel.streamingRevenue || 0)
      ));
      const royaltyRevenue = Math.max(0, Number(
          rel.streamingRoyaltyRevenue
          ?? Math.max(0, Number(rel.streamingRevenue || 0) - upfrontFee)
      ));
      const platformFunding = Math.max(0, Number(
          rel.streamingFundingAmount
          ?? rel.projectDetails?.hiddenStats?.nextSeasonFundingAmount
          ?? 0
      ));

      return {
          upfrontFee,
          royaltyRevenue,
          platformFunding,
          totalReceipts: upfrontFee + royaltyRevenue,
      };
  };

  const getStreamingRolloutStatus = (rel: ActiveRelease) => {
      const streamingState = rel.streaming;
      const weeklyViews = streamingState?.weeklyViews || [];
      const hasReport = weeklyViews.length > 0 || (streamingState?.totalViews || 0) > 0;
      if (!streamingState || hasReport) {
          return { isPending: false, weeksUntilStart: 0, label: '', detail: '', meta: '' };
      }

      const platformName = PLATFORMS[streamingState.platformId]?.name || tr('box.streamingPlatform');
      const currentAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
      const startAbsoluteWeek = typeof streamingState.startWeekAbsolute === 'number'
          ? streamingState.startWeekAbsolute
          : typeof streamingState.startWeek === 'number'
              ? getAbsoluteWeek(player.age, streamingState.startWeek)
              : undefined;
      const weeksUntilStart = typeof startAbsoluteWeek === 'number'
          ? Math.max(0, startAbsoluteWeek - currentAbsoluteWeek)
          : 0;

      if (weeksUntilStart > 0) {
          return {
              isPending: true,
              weeksUntilStart,
              label: `${platformName} rollout scheduled`,
              detail: `${platformName} has the title queued. Streaming numbers will appear when the platform release window opens.`,
              meta: `First report in ${weeksUntilStart} week${weeksUntilStart === 1 ? '' : 's'}`,
          };
      }

      return {
          isPending: true,
          weeksUntilStart: 0,
          label: 'First streaming report pending',
          detail: `${platformName} has the title live or queued for rollout. The first audience report posts after the next weekly advance.`,
          meta: 'Advance one week to receive the first read',
      };
  };

  const getOpeningWeekend = (rel: ActiveRelease) => rel.weeklyGross?.[0] || 0;

  const getLatestTheatricalBreakdown = (rel: ActiveRelease) => (
      rel.weeklyDistributionBreakdowns?.[rel.weeklyDistributionBreakdowns.length - 1]
  );

  const getTheatricalRegionTotals = (rel: ActiveRelease) => {
      const totals = new Map<string, {
          id: string;
          label: string;
          shortLabel: string;
          gross: number;
          studioReceipts: number;
          exhibitorReceipts: number;
          screens: number;
          expectedFootfall: number;
      }>();

      (rel.weeklyDistributionBreakdowns || []).forEach(breakdown => {
          breakdown.regionReceipts.forEach(region => {
              const current = totals.get(region.regionId) || {
                  id: region.regionId,
                  label: getBoxOfficeRegionLabel(language, region.regionId as BoxOfficeRegionId),
                  shortLabel: getBoxOfficeRegionShortLabel(language, region.regionId as BoxOfficeRegionId),
                  gross: 0,
                  studioReceipts: 0,
                  exhibitorReceipts: 0,
                  screens: region.screens,
                  expectedFootfall: 0
              };
              current.gross += region.gross;
              current.studioReceipts += region.studioReceipts;
              current.exhibitorReceipts += region.exhibitorReceipts;
              current.screens = Math.max(current.screens, region.screens);
              current.expectedFootfall += region.expectedFootfall;
              totals.set(region.regionId, current);
          });
      });

      return Array.from(totals.values()).sort((a, b) => b.gross - a.gross);
  };

  const getTheatricalChainTotals = (rel: ActiveRelease) => {
      const totals = new Map<string, {
          id: string;
          name: string;
          gross: number;
          studioReceipts: number;
          exhibitorReceipts: number;
          screens: number;
          expectedFootfall: number;
          exhibitorCut: number;
      }>();

      (rel.weeklyDistributionBreakdowns || []).forEach(breakdown => {
          breakdown.regionReceipts.forEach(region => {
              region.chainReceipts.forEach(chain => {
                  const current = totals.get(chain.chainId) || {
                      id: chain.chainId,
                      name: getCinemaChainById(chain.chainId as CinemaChainId, language)?.name || chain.chainName,
                      gross: 0,
                      studioReceipts: 0,
                      exhibitorReceipts: 0,
                      screens: 0,
                      expectedFootfall: 0,
                      exhibitorCut: chain.exhibitorCut
                  };
                  current.gross += chain.gross;
                  current.studioReceipts += chain.studioReceipts;
                  current.exhibitorReceipts += chain.exhibitorReceipts;
                  current.screens = Math.max(current.screens, chain.screens);
                  current.expectedFootfall += chain.expectedFootfall;
                  current.exhibitorCut = chain.gross > 0
                      ? chain.exhibitorReceipts / Math.max(1, chain.gross)
                      : current.exhibitorCut;
                  totals.set(chain.chainId, current);
              });
          });
      });

      return Array.from(totals.values()).sort((a, b) => b.gross - a.gross);
  };

  const getStreamingRegionTotals = (rel: ActiveRelease) => {
      const totals = new Map<string, {
          id: string;
          label: string;
          shortLabel: string;
          views: number;
          revenue: number;
      }>();

      (rel.weeklyStreamingBreakdowns || []).forEach(breakdown => {
          breakdown.regionBreakdowns.forEach(region => {
              const current = totals.get(region.regionId) || {
                  id: region.regionId,
                  label: getBoxOfficeRegionLabel(language, region.regionId as BoxOfficeRegionId),
                  shortLabel: getBoxOfficeRegionShortLabel(language, region.regionId as BoxOfficeRegionId),
                  views: 0,
                  revenue: 0
              };
              current.views += region.views;
              current.revenue += region.revenue;
              totals.set(region.regionId, current);
          });
      });

      return Array.from(totals.values()).sort((a, b) => b.views - a.views);
  };

  const getLatestTheatricalGross = (rel: ActiveRelease) => rel.weeklyGross?.[rel.weeklyGross.length - 1] || 0;

  const getWeeklyChange = (rel: ActiveRelease) => {
      if (!rel.weeklyGross || rel.weeklyGross.length < 2) return null;
      const latest = rel.weeklyGross[rel.weeklyGross.length - 1] || 0;
      const previous = Math.max(1, rel.weeklyGross[rel.weeklyGross.length - 2] || 1);
      return Math.round(((latest - previous) / previous) * 100);
  };

  const getSimulatedMarketEntries = (): WeeklyChartEntry[] => {
      const weekSeed = Math.max(1, player.currentWeek || 1);
      return SIMULATED_WEEKLY_MARKET.map((entry, index) => {
          const releaseAge = ((weekSeed + index * 2) % 6) + 1;
          const baseOpening = Math.max(8_000_000, entry.budget * (0.32 + (index % 3) * 0.08));
          const holdCurve = Math.pow(0.63 + ((entry.imdbRating || 7) - 6.5) * 0.035, Math.max(0, releaseAge - 1));
          const marketPulse = 0.88 + (((weekSeed * (index + 3)) % 17) / 50);
          const weeklyGross = Math.round(baseOpening * holdCurve * marketPulse);
          const previousGross = releaseAge <= 1
              ? undefined
              : Math.round(baseOpening * Math.pow(0.63 + ((entry.imdbRating || 7) - 6.5) * 0.035, Math.max(0, releaseAge - 2)) * (0.92 + (((weekSeed + index) % 11) / 60)));
          const studioShare = 0.51 + (index % 4) * 0.015;

          return {
              ...entry,
              weeklyGross,
              previousGross,
              studioReceipts: Math.round(weeklyGross * studioShare),
              runWeek: releaseAge
          };
      });
  };

  const getOutsideProducerWeeklyEntries = (): WeeklyChartEntry[] => {
      const currentAbsolute = absoluteWeek(player.age, player.currentWeek);
      return (player.outsideProductions || [])
          .filter((item: OutsideProductionInvestment) => item.status === 'RELEASED')
          .filter((item: OutsideProductionInvestment) => currentAbsolute >= absoluteWeek(item.releaseYear, item.releaseWeek))
          .map((item: OutsideProductionInvestment) => {
              const releaseAbsolute = absoluteWeek(item.releaseYear, item.releaseWeek);
              const runWeek = Math.max(1, currentAbsolute - releaseAbsolute + 1);
              const seed = hashString(`${item.projectId}:${item.projectTitle}:weekly-market`);
              const quality = item.scoutReport.scriptQuality * 0.24
                  + item.scoutReport.directorQuality * 0.16
                  + item.scoutReport.castQuality * 0.2
                  + item.scoutReport.marketFit * 0.25
                  + item.scoutReport.buzz * 0.15
                  - item.scoutReport.risk * 0.18;
              const pathLift = item.releasePath === 'THEATRICAL' ? 0.32 : item.releasePath === 'FESTIVAL' ? 0.16 : 0.2;
              const baseOpening = Math.max(750_000, item.budget * (pathLift + Math.max(0, quality) / 420));
              const hold = Math.pow(0.55 + Math.max(0, item.scoutReport.marketFit - 45) / 260, Math.max(0, runWeek - 1));
              const pulse = 0.88 + ((seed + runWeek * 13) % 24) / 100;
              const weeklyGross = Math.round(baseOpening * hold * pulse);
              const previousGross = runWeek <= 1
                  ? undefined
                  : Math.round(baseOpening * Math.pow(0.55 + Math.max(0, item.scoutReport.marketFit - 45) / 260, Math.max(0, runWeek - 2)) * (0.9 + ((seed + runWeek * 7) % 18) / 100));
              const receiptsRate = item.releasePath === 'STREAMING' ? 0.72 : item.releasePath === 'FESTIVAL' ? 0.38 : 0.46;

              return {
                  id: `outside_${item.projectId}`,
                  title: item.projectTitle,
                  source: 'OUTSIDE',
                  weeklyGross,
                  previousGross,
                  studioReceipts: Math.round(weeklyGross * receiptsRate),
                  screens: Math.round(Math.max(120, Math.min(8500, item.budget / 18_000))),
                  runWeek,
                  budget: item.budget,
                  imdbRating: Math.round((5.2 + Math.max(0, quality) / 34) * 10) / 10
              };
          });
  };

  const getRankMovementLabel = (currentRank: number, previousRank?: number) => {
      if (!previousRank) return 'NEW';
      const movement = previousRank - currentRank;
      if (movement === 0) return tr('box.rankHold');
      return movement > 0 ? `+${movement}` : `${movement}`;
  };

  const getWeeklyStatusTag = (entry: WeeklyChartEntry) => {
      const change = entry.previousGross
          ? Math.round(((entry.weeklyGross - entry.previousGross) / Math.max(1, entry.previousGross)) * 100)
          : null;
      const grossToBudget = entry.weeklyGross / Math.max(1, entry.budget);

      if (entry.weeklyGross >= 100_000_000 || grossToBudget >= 0.55) return tr('box.status.blockbuster');
      if (change !== null && change <= -58) return tr('box.status.heavyDrop');
      if (entry.runWeek >= 3 && change !== null && change > -25) return tr('box.status.sleeper');
      if (entry.runWeek <= 2 && grossToBudget >= 0.25) return tr('box.status.breakout');
      if (entry.runWeek >= 2 && grossToBudget < 0.08) return tr('box.status.flopWatch');
      if (entry.source === 'PLAYER') return tr('box.yourRelease');
      if (entry.source === 'OUTSIDE') return tr('box.producerBacked');
      return tr('box.marketFilm');
  };

  const getWeeklyChartEntries = () => {
      const playerEntries: WeeklyChartEntry[] = theatrical.map(rel => {
          const latestBreakdown = getLatestTheatricalBreakdown(rel);
          const weeklyGross = getLatestTheatricalGross(rel);
          const previousGross = rel.weeklyGross && rel.weeklyGross.length >= 2
              ? rel.weeklyGross[rel.weeklyGross.length - 2]
              : undefined;
          return {
              id: rel.id,
              title: rel.name,
              source: 'PLAYER',
              rel,
              weeklyGross,
              previousGross,
              studioReceipts: rel.weeklyStudioReceipts?.[rel.weeklyStudioReceipts.length - 1] || latestBreakdown?.studioReceipts || Math.round(weeklyGross * 0.55),
              screens: latestBreakdown?.totalScreens || 0,
              runWeek: rel.weekNum,
              budget: rel.budget || rel.projectDetails?.estimatedBudget || 1,
              imdbRating: rel.imdbRating
          };
      });
      const entries = [...playerEntries, ...getOutsideProducerWeeklyEntries(), ...getSimulatedMarketEntries()].filter(entry => entry.weeklyGross > 0);
      const currentRanked = [...entries].sort((a, b) => b.weeklyGross - a.weeklyGross);
      const previousRanked = [...entries]
          .filter(entry => entry.previousGross !== undefined)
          .sort((a, b) => (b.previousGross || 0) - (a.previousGross || 0));
      const previousRanks = new Map(previousRanked.map((entry, index) => [entry.id, index + 1]));

      return currentRanked.slice(0, 10).map((entry, index) => ({
          ...entry,
          rank: index + 1,
          previousRank: previousRanks.get(entry.id),
          rankMovement: getRankMovementLabel(index + 1, previousRanks.get(entry.id)),
          change: entry.previousGross
              ? Math.round(((entry.weeklyGross - entry.previousGross) / Math.max(1, entry.previousGross)) * 100)
              : null,
          statusTag: getWeeklyStatusTag(entry)
      }));
  };

  const getBoxOfficeArchiveEntries = (): BoxOfficeArchiveEntry[] => {
      const activeEntries: BoxOfficeArchiveEntry[] = activeReleases.map(rel => {
          const worldwideGross = Math.max(0, rel.totalGross || 0);
          const streamingRevenue = Math.max(0, rel.streamingRevenue || 0);
          const soundtrackRevenue = Math.max(0, rel.soundtrackRevenue || 0);
          const totalRevenue = worldwideGross + streamingRevenue + soundtrackRevenue;
          const studioReceipts = Math.max(0, rel.totalStudioReceipts || streamingRevenue || Math.round(worldwideGross * 0.55)) + soundtrackRevenue;
          const budget = Math.max(1, rel.budget || rel.projectDetails?.estimatedBudget || 1);
          const openingWeekend = rel.distributionPhase === 'STREAMING'
              ? streamingRevenue
              : getOpeningWeekend(rel);
          const type = rel.distributionPhase === 'STREAMING'
              ? 'Streaming'
              : streamingRevenue > 0
                  ? 'Hybrid'
                  : 'Theatrical';
          const weekTwoHold = rel.weeklyGross?.length >= 2
              ? rel.weeklyGross[1] / Math.max(1, rel.weeklyGross[0])
              : undefined;

          return {
              id: rel.id,
              title: rel.name,
              type,
              source: 'LIVE',
              totalRevenue,
              worldwideGross,
              streamingRevenue,
              soundtrackRevenue,
              studioReceipts,
              budget,
              rating: rel.imdbRating || 0,
              openingWeekend,
              roi: studioReceipts / budget,
              weekTwoHold
          };
      });

      const pastEntries: BoxOfficeArchiveEntry[] = (player.pastProjects || []).map((project: any) => {
          const worldwideGross = Math.max(0, Number(project.gross || 0));
          const streamingRevenue = Math.max(0, Number(project.streamingRevenue || 0));
          const soundtrackRevenue = Math.max(0, Number(project.soundtrackRevenue || 0));
          const totalRevenue = worldwideGross + streamingRevenue + soundtrackRevenue;
          const studioReceipts = Math.max(0, Number(project.earnings || streamingRevenue || Math.round(worldwideGross * 0.5))) + soundtrackRevenue;
          const budget = Math.max(1, Number(project.budget || 1));
          const openingWeekend = Math.max(0, Number(
              project.openingWeekend ||
              project.campaignRealitySnapshot?.openingActual ||
              (worldwideGross > 0 ? worldwideGross * 0.32 : streamingRevenue * 0.45)
          ));
          const type = streamingRevenue > 0 && worldwideGross > 0
              ? 'Hybrid'
              : streamingRevenue > 0
                  ? 'Streaming'
                  : 'Theatrical';

          return {
              id: String(project.id),
              title: project.name || project.title || tr('box.untitled'),
              type,
              source: 'HISTORY',
              totalRevenue,
              worldwideGross,
              streamingRevenue,
              soundtrackRevenue,
              studioReceipts,
              budget,
              rating: Number(project.imdbRating || project.rating || 0),
              openingWeekend,
              roi: studioReceipts / budget
          };
      });

      return [...activeEntries, ...pastEntries].filter(entry => entry.totalRevenue > 0 || entry.studioReceipts > 0);
  };

  const getAllTimeMetricValue = (entry: BoxOfficeArchiveEntry, mode: BoxOfficeAllTimeMode) => {
      if (mode === 'STUDIO') return entry.studioReceipts;
      if (mode === 'ROI') return entry.roi;
      if (mode === 'OPENING') return entry.openingWeekend;
      if (mode === 'STREAMING') return entry.streamingRevenue;
      return entry.totalRevenue;
  };

  const getAllTimeEntries = (mode: BoxOfficeAllTimeMode) => (
      getBoxOfficeArchiveEntries()
          .filter(entry => mode !== 'STREAMING' || entry.streamingRevenue > 0)
          .filter(entry => getAllTimeMetricValue(entry, mode) > 0)
          .sort((a, b) => getAllTimeMetricValue(b, mode) - getAllTimeMetricValue(a, mode))
          .slice(0, 12)
  );

  const getPartnerEntries = () => {
      const partnerTotals = new Map<string, {
          id: string;
          name: string;
          gross: number;
          studioReceipts: number;
          exhibitorReceipts: number;
          screens: number;
          exhibitorCut: number;
      }>();

      theatrical.forEach(rel => {
          getTheatricalChainTotals(rel).forEach(chain => {
              const current = partnerTotals.get(chain.id) || {
                  id: chain.id,
                  name: chain.name,
                  gross: 0,
                  studioReceipts: 0,
                  exhibitorReceipts: 0,
                  screens: 0,
                  exhibitorCut: chain.exhibitorCut
              };
              current.gross += chain.gross;
              current.studioReceipts += chain.studioReceipts;
              current.exhibitorReceipts += chain.exhibitorReceipts;
              current.screens += chain.screens;
              current.exhibitorCut = current.gross > 0 ? current.exhibitorReceipts / current.gross : current.exhibitorCut;
              partnerTotals.set(chain.id, current);
          });
      });

      return Array.from(partnerTotals.values()).sort((a, b) => b.gross - a.gross);
  };

  const getRecordEntries = () => {
      const archive = getBoxOfficeArchiveEntries();
      const theatricalArchive = archive.filter(entry => entry.worldwideGross > 0);
      const biggestOpening = [...archive].sort((a, b) => b.openingWeekend - a.openingWeekend)[0];
      const bestStudioShare = [...theatrical]
          .map(rel => {
              const latest = getLatestTheatricalBreakdown(rel);
              return { rel, studioShare: latest?.studioShare || 0 };
          })
          .sort((a, b) => b.studioShare - a.studioShare)[0];
      const bestRoi = [...archive].sort((a, b) => b.roi - a.roi)[0];
      const topStreaming = [...archive].filter(entry => entry.streamingRevenue > 0).sort((a, b) => b.streamingRevenue - a.streamingRevenue)[0];
      const sleeperHit = [...archive]
          .filter(entry => entry.budget <= 50_000_000 && entry.roi >= 1.6)
          .sort((a, b) => b.roi - a.roi)[0];
      const biggestFlop = [...archive]
          .filter(entry => entry.budget >= 5_000_000 && entry.totalRevenue > 0)
          .sort((a, b) => a.roi - b.roi)[0];
      const weekTwoHold = [...archive]
          .filter(entry => entry.weekTwoHold !== undefined)
          .sort((a, b) => (b.weekTwoHold || 0) - (a.weekTwoHold || 0))[0];
      const topRegion = theatrical
          .flatMap(rel => getTheatricalRegionTotals(rel).map(region => ({ ...region, title: rel.name })))
          .sort((a, b) => b.gross - a.gross)[0];
      const bestPartner = getPartnerEntries()[0];

      return [
          biggestOpening && {
              label: tr('box.records.biggestOpening'),
              title: biggestOpening.title,
              value: formatMoney(biggestOpening.openingWeekend),
              note: biggestOpening.source === 'HISTORY' ? tr('box.records.historyIncluded') : tr('box.records.liveRun')
          },
          bestStudioShare && {
              label: tr('box.records.bestStudioShare'),
              title: bestStudioShare.rel.name,
              value: formatPercent(bestStudioShare.studioShare),
              note: tr('box.records.currentTheatricalSplit')
          },
          bestRoi && {
              label: tr('box.records.bestRoi'),
              title: bestRoi.title,
              value: `${bestRoi.roi.toFixed(1)}x`,
              note: bestRoi.source === 'HISTORY' ? tr('box.records.historyIncluded') : tr('box.records.liveRun')
          },
          topStreaming && {
              label: tr('box.records.topStreamingRun'),
              title: topStreaming.title,
              value: formatMoney(topStreaming.streamingRevenue),
              note: tr('box.records.streamingHits')
          },
          sleeperHit && {
              label: tr('box.records.sleeperHit'),
              title: sleeperHit.title,
              value: `${sleeperHit.roi.toFixed(1)}x`,
              note: tr('box.records.lowBudgetStrongReturn')
          },
          weekTwoHold && {
              label: tr('box.records.weekTwoHold'),
              title: weekTwoHold.title,
              value: `${Math.round((weekTwoHold.weekTwoHold || 0) * 100)}%`,
              note: tr('box.records.bestSecondWeekRetention')
          },
          topRegion && {
              label: tr('box.records.topRegion'),
              title: `${topRegion.label} · ${topRegion.title}`,
              value: formatMoney(topRegion.gross),
              note: tr('box.records.liveTheatricalRegion')
          },
          bestPartner && {
              label: tr('box.records.bestPartner'),
              title: bestPartner.name,
              value: formatMoney(bestPartner.gross),
              note: tr('box.records.screens', { count: bestPartner.screens.toLocaleString() })
          },
          biggestFlop && theatricalArchive.length > 0 && {
              label: tr('box.records.biggestFlop'),
              title: biggestFlop.title,
              value: `${biggestFlop.roi.toFixed(1)}x`,
              note: tr('box.records.lowestReturn')
          }
      ].filter(Boolean) as { label: string; title: string; value: string; note: string }[];
  };

  const getCompactReleaseLabel = (rel: ActiveRelease) => (
      getProjectReleaseLabel(rel, releaseFallback, { includeWeek: true, language, compact: true })
  );

  const getProjectMetaTags = (rel: ActiveRelease) => [
      ...getProjectIdentityLabel(rel.projectDetails)
          .split('•')
          .map(part => part.trim())
          .filter(Boolean)
          .slice(0, 2),
      getCompactReleaseLabel(rel)
  ].filter(Boolean);

  const renderMetaTags = (rel: ActiveRelease, tone: 'theatrical' | 'streaming' = 'theatrical') => {
      const tags = getProjectMetaTags(rel);
      const accentClass = tone === 'streaming'
          ? 'border-indigo-400/20 bg-indigo-400/10 text-indigo-200'
          : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200';

      return (
          <div className="mt-3 flex w-full flex-wrap gap-1.5">
              {tags.map((tag, idx) => (
                  <span
                      key={`${rel.id}-meta-${idx}`}
                      className={`flex min-h-7 max-w-full shrink-0 items-center justify-center rounded-lg border px-2.5 py-1 text-center text-[8px] font-black uppercase tracking-[0.08em] leading-tight ${
                          idx === tags.length - 1
                              ? 'border-white/10 bg-white/5 text-zinc-400'
                              : accentClass
                      }`}
                      title={tag}
                  >
                      {tag}
                  </span>
              ))}
          </div>
      );
  };

  const renderDetailView = (rel: ActiveRelease) => {
      const isStreamingRelease = rel.distributionPhase === 'STREAMING' && rel.streaming;
      const weeklyValues = isStreamingRelease ? (rel.streaming!.weeklyViews || []) : (rel.weeklyGross || []);
      const latestDrop = getLatestDrop(weeklyValues);
      const latestTheatricalBreakdown = getLatestTheatricalBreakdown(rel);
      const theatricalRegions = getTheatricalRegionTotals(rel);
      const theatricalChains = getTheatricalChainTotals(rel);
      const streamingRegions = getStreamingRegionTotals(rel);
      const totalStudioReceipts = rel.totalStudioReceipts || (rel.weeklyStudioReceipts || []).reduce((sum, amount) => sum + amount, 0);
      const totalExhibitorReceipts = rel.totalExhibitorReceipts || (rel.weeklyExhibitorReceipts || []).reduce((sum, amount) => sum + amount, 0);
      const soundtrackRevenue = Math.max(0, rel.soundtrackRevenue || 0);
      const soundtrackBreakdown = rel.soundtrackRevenueBreakdown;
      const investorPlan = rel.investorPlan || rel.projectDetails?.investorPlan;
      const investorOwnerNames = investorPlan?.commitments
          ?.map(item => item.ownerName)
          .filter((name): name is string => Boolean(name))
          .slice(0, 2)
          .join(', ') || '';
      const investorOwnerExtraCount = Math.max(0, (investorPlan?.commitments?.filter(item => item.ownerName).length || 0) - 2);
      const investorScopeLabel = rel.type === 'SERIES' ? tr('box.seasonOnlyCapTable') : tr('box.projectOnlyCapTable');
      const investorPayoutTotal = Math.max(0, Number(rel.investorPayouts?.lifetimeInvestorPayout || rel.projectDetails?.investorPayouts?.lifetimeInvestorPayout || 0));
      const studioNetAfterInvestors = Math.max(0, totalStudioReceipts + (rel.streamingRevenue || 0) + soundtrackRevenue - investorPayoutTotal);
      const platform = isStreamingRelease ? PLATFORMS[rel.streaming!.platformId] : null;
      const tone = isStreamingRelease ? 'streaming' : 'theatrical';
      const streamingRolloutStatus = isStreamingRelease ? getStreamingRolloutStatus(rel) : null;
      const streamingContract = isStreamingRelease ? getStreamingContract(rel) : null;

      const renderDetailTabs = () => (
          <div className="shrink-0 border-b border-white/10 bg-black/35 px-3 py-2 backdrop-blur-md">
              <div className="grid grid-cols-4 gap-1 rounded-2xl bg-black/35 p-1">
                  {DETAIL_TABS.map(item => (
                      <button
                          key={item.id}
                          onClick={() => setDetailTab(item.id)}
                          className={`h-9 rounded-xl text-[9px] font-black uppercase tracking-[0.08em] transition-all ${
                              detailTab === item.id
                                  ? `${isStreamingRelease ? 'bg-indigo-400 text-black' : 'bg-emerald-400 text-black'} shadow-lg`
                                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                          }`}
                      >
                          {tr(item.labelKey)}
                      </button>
                  ))}
              </div>
          </div>
      );

      const renderHeroCard = () => (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4 shadow-lg">
              <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                      <div className="font-bold text-xl leading-tight break-words">{rel.name}</div>
                      {renderMetaTags(rel, tone)}
                  </div>
                  <div className={`shrink-0 rounded-lg px-2 py-1 text-[10px] font-black uppercase ${isStreamingRelease ? 'bg-indigo-500/10 text-indigo-300' : 'bg-emerald-500/10 text-emerald-300'}`}>
                      {isStreamingRelease ? platform?.name || tr('box.streaming') : tr('box.runWeekCompact', { week: rel.weekNum })}
                  </div>
              </div>
          </div>
      );

      const renderMetric = (label: string, value: string, color = 'text-white') => (
          <div className="rounded-xl bg-black/25 p-3">
              <div className="text-[9px] text-zinc-500 uppercase font-bold">{label}</div>
              <div className={`mt-1 break-words font-mono text-lg font-bold ${color}`}>{value}</div>
          </div>
      );

      const renderStreamingPendingCard = () => {
          if (!isStreamingRelease || !streamingRolloutStatus?.isPending) return null;
          return (
              <div className="rounded-2xl border border-indigo-300/25 bg-indigo-400/10 p-4">
                  <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-indigo-200">Platform Queue</div>
                          <div className="mt-1 text-lg font-black leading-tight text-white">{streamingRolloutStatus.label}</div>
                          <p className="mt-2 text-sm leading-relaxed text-indigo-50/75">{streamingRolloutStatus.detail}</p>
                      </div>
                      <div className="shrink-0 rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-right">
                          <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Status</div>
                          <div className="text-xs font-black uppercase tracking-wider text-indigo-100">{streamingRolloutStatus.meta}</div>
                      </div>
                  </div>
              </div>
          );
      };

      const renderOverviewTab = () => (
          <>
              {renderHeroCard()}
              {renderStreamingPendingCard()}
              <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
	                      <div className={`text-[10px] font-black uppercase tracking-[0.18em] ${isStreamingRelease ? 'text-indigo-300' : 'text-emerald-300'}`}>
	                          {isStreamingRelease ? tr('box.streamingRun') : tr('box.theatricalRun')}
	                      </div>
	                      <div className="text-[10px] font-bold uppercase text-zinc-500">{tr('box.currentRead')}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                      {isStreamingRelease ? (
                          <>
	                              {renderMetric(tr('box.totalViews'), formatViews(rel.streaming!.totalViews))}
	                              {renderMetric(tr('box.streamingReceipts'), formatMoney(streamingContract!.totalReceipts), 'text-emerald-300')}
	                              {soundtrackRevenue > 0 && renderMetric(tr('box.soundtrackRevenue'), formatMoney(soundtrackRevenue), 'text-cyan-300')}
	                              {renderMetric(tr('box.latestWeek'), streamingRolloutStatus?.isPending ? 'Pending' : formatViews(weeklyValues.slice(-1)[0] || 0), streamingRolloutStatus?.isPending ? 'text-indigo-200' : 'text-white')}
	                              {renderMetric(tr('box.weeklyDrop'), streamingRolloutStatus?.isPending ? 'Waiting' : latestDrop === null ? '-' : `${latestDrop}%`, streamingRolloutStatus?.isPending ? 'text-indigo-200' : latestDrop !== null && latestDrop < 0 ? 'text-emerald-300' : 'text-amber-300')}
                          </>
                      ) : (
                          <>
	                              {renderMetric(tr('box.worldwideGross'), formatMoney(rel.totalGross))}
	                              {renderMetric(tr('box.metric.studioReceipts'), formatMoney(totalStudioReceipts), 'text-emerald-300')}
	                              {soundtrackRevenue > 0 && renderMetric(tr('box.soundtrackRevenue'), formatMoney(soundtrackRevenue), 'text-cyan-300')}
	                              {renderMetric(tr('box.openingWeekend'), formatMoney(getOpeningWeekend(rel)))}
	                              {renderMetric(tr('box.weeklyDrop'), latestDrop === null ? '-' : `${latestDrop}%`, latestDrop !== null && latestDrop < 0 ? 'text-emerald-300' : 'text-amber-300')}
                          </>
                      )}
                  </div>
                  {isStreamingRelease && streamingContract && (
                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
                          {renderMetric(tr('box.streamingUpfront'), formatMoney(streamingContract.upfrontFee), 'text-sky-200')}
                          {renderMetric(tr('box.streamingRoyalty'), formatMoney(streamingContract.royaltyRevenue), 'text-emerald-300')}
                          {streamingContract.platformFunding > 0 && renderMetric(tr('box.streamingFunding'), formatMoney(streamingContract.platformFunding), 'text-indigo-200')}
                          {streamingContract.royaltyRevenue === 0 && (
                              <div className="col-span-2 text-[10px] font-bold leading-relaxed text-zinc-500">
                                  {streamingContract.platformFunding > 0 ? tr('box.streamingFundedSeason') : tr('box.streamingNoBackend')}
                              </div>
                          )}
                      </div>
                  )}
              </div>

              {investorPlan && investorPlan.totalRaised > 0 && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                          <div>
	                              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">{tr('box.investorSplit')}</div>
                              {investorOwnerNames && (
                                  <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-emerald-100/55">
	                                      {tr('box.owners', { owners: investorOwnerNames, extra: investorOwnerExtraCount > 0 ? ` +${investorOwnerExtraCount}` : '' })}
                                  </div>
                              )}
                          </div>
                          <div className="text-[10px] font-bold uppercase text-zinc-400">
	                              {tr('box.investorsOwn', { percent: investorPlan.investorEquityPercent })}
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
	                          {renderMetric(tr('box.raised'), formatMoney(investorPlan.totalRaised), 'text-emerald-300')}
	                          {renderMetric(tr('box.paidInvestors'), formatMoney(investorPayoutTotal), 'text-cyan-200')}
	                          {renderMetric(tr('box.studioNet'), formatMoney(studioNetAfterInvestors), 'text-white')}
	                          {renderMetric(tr('box.studioKeeps'), `${investorPlan.studioEquityPercent}%`, 'text-emerald-200')}
                      </div>
                      <div className="mt-3 text-xs font-bold text-zinc-400">
	                          {tr('box.investorScopeNote', { scope: investorScopeLabel })}
                      </div>
                  </div>
              )}

              {!isStreamingRelease && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
	                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-200">{tr('box.distribution')}</div>
	                          <div className="text-[10px] font-bold uppercase text-zinc-400">{tr('box.latestWeeklyRead')}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
	                          {renderMetric(tr('box.studioShare'), latestTheatricalBreakdown ? formatPercent(latestTheatricalBreakdown.studioShare) : '-', 'text-emerald-200')}
	                          {renderMetric(tr('box.partnerCut'), latestTheatricalBreakdown ? formatPercent(latestTheatricalBreakdown.averageExhibitorCut) : '-', 'text-rose-300')}
	                          {renderMetric(tr('box.perScreen'), latestTheatricalBreakdown ? formatMoney(Math.floor(latestTheatricalBreakdown.gross / Math.max(1, latestTheatricalBreakdown.totalScreens))) : '-')}
	                          {renderMetric(tr('box.footfallEst'), latestTheatricalBreakdown ? formatViews(latestTheatricalBreakdown.expectedFootfall) : '-', 'text-sky-300')}
                      </div>
                      <div className="mt-3 text-sm leading-relaxed text-zinc-300">
	                          {tr('box.ticketSplitNote', { amount: latestTheatricalBreakdown ? formatMoney(100 * latestTheatricalBreakdown.studioShare) : '$0' })}
                      </div>
                  </div>
              )}

              {soundtrackRevenue > 0 && soundtrackBreakdown && (
                  <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
	                          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">{tr('box.soundtrackRevenue')}</div>
                          <div className="font-mono text-sm font-black text-cyan-100">{formatMoney(soundtrackRevenue)}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
	                          {renderMetric(tr('box.albumEp'), formatMoney(soundtrackBreakdown.albumRevenue || 0), 'text-cyan-200')}
	                          {renderMetric(tr('box.leadSingle'), formatMoney(soundtrackBreakdown.leadSingleRevenue || 0), 'text-emerald-300')}
	                          {renderMetric(tr('box.musicVideo'), formatMoney(soundtrackBreakdown.musicVideoRevenue || 0), 'text-sky-300')}
	                          {renderMetric(tr('box.streamingBuzz'), formatMoney(soundtrackBreakdown.streamingBuzzRevenue || 0), 'text-indigo-300')}
	                          {renderMetric(tr('box.viralBoost'), formatMoney(soundtrackBreakdown.viralSongRevenue || 0), 'text-fuchsia-300')}
                      </div>
                  </div>
              )}
          </>
      );

      const renderWeeklyTab = () => (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
	              <div className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400">{tr('box.weeklyTrend')}</div>
              {weeklyValues.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-indigo-300/25 bg-indigo-400/10 p-4 text-sm leading-relaxed text-indigo-50/75">
                      {streamingRolloutStatus?.isPending
                          ? `${streamingRolloutStatus.label}. ${streamingRolloutStatus.meta}.`
                          : 'Weekly data will appear after the first report is generated.'}
                  </div>
              ) : (
              <>
              <div className="flex h-28 w-full items-end gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {weeklyValues.map((value, idx) => {
                      const maxValue = Math.max(...weeklyValues, 1);
                      const heightPercent = Math.max(15, (value / maxValue) * 100);
                      const isLatest = idx === weeklyValues.length - 1;
                      return (
                          <div key={`${rel.id}-detail-week-${idx}`} className="flex min-w-[38px] flex-1 flex-col items-center justify-end h-full">
                              <span className={`mb-1 font-mono text-[9px] ${isLatest ? 'font-bold text-emerald-300' : 'text-zinc-500'}`}>
                                  {isStreamingRelease ? formatViewsShort(value) : formatMoneyShort(value)}
                              </span>
                              <div className="flex h-full w-full items-end rounded-t-md bg-zinc-700/30">
                                  <div
                                      style={{ height: `${heightPercent}%` }}
                                      className={`w-full rounded-t-md transition-all duration-500 ${isStreamingRelease ? (isLatest ? 'bg-indigo-500' : 'bg-indigo-500/40') : (isLatest ? 'bg-emerald-500' : 'bg-emerald-500/40')}`}
                                  />
                              </div>
                              <span className="mt-1 text-[9px] text-zinc-600">{tr('box.weekCompact', { week: idx + 1 })}</span>
                          </div>
                      );
                  })}
              </div>
              <div className="mt-4 space-y-2">
                  {weeklyValues.map((value, idx) => {
                      const breakdown = isStreamingRelease ? rel.weeklyStreamingBreakdowns?.[idx] : rel.weeklyDistributionBreakdowns?.[idx];
                      const studioValue = isStreamingRelease
                          ? (breakdown && 'revenue' in breakdown ? breakdown.revenue : 0)
                          : rel.weeklyStudioReceipts?.[idx] || (breakdown && 'studioReceipts' in breakdown ? breakdown.studioReceipts : 0);
                      const partnerValue = isStreamingRelease
                          ? 0
                          : rel.weeklyExhibitorReceipts?.[idx] || (breakdown && 'exhibitorReceipts' in breakdown ? breakdown.exhibitorReceipts : 0);
                      return (
                          <div key={`${rel.id}-week-row-${idx}`} className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded-xl bg-black/25 p-3">
                              <div className="font-mono text-xs font-black text-zinc-500">{tr('box.weekCompact', { week: idx + 1 })}</div>
                              <div className="min-w-0">
                                  <div className="font-mono text-sm font-black text-white">{isStreamingRelease ? formatViews(value) : formatMoney(value)}</div>
                                  <div className="mt-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-zinc-500">
                                      {isStreamingRelease
                                          ? tr('box.revenueAmount', { amount: formatMoney(studioValue) })
                                          : tr('box.studioAmount', { amount: formatMoney(studioValue) })}
                                  </div>
                              </div>
                              {!isStreamingRelease && (
                                  <div className="text-right text-[10px] font-black uppercase tracking-[0.1em] text-rose-300">
                                      {tr('box.partnerAmount', { amount: formatMoney(partnerValue) })}
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
              </>
              )}
          </div>
      );

      const renderRegionsTab = () => {
          const regions = isStreamingRelease ? streamingRegions : theatricalRegions;
          return (
              <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                  <div className={`mb-3 text-[10px] font-black uppercase tracking-[0.18em] ${isStreamingRelease ? 'text-indigo-300' : 'text-emerald-300'}`}>{isStreamingRelease ? tr('box.streamingRegions') : tr('box.detail.regions')}</div>
                  {regions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-zinc-700 bg-black/20 p-4 text-sm text-zinc-500">
                          {tr('box.regionalDataPending')}
                      </div>
                  ) : (
                      <div className="space-y-2">
                          {regions.map(region => (
                              <div key={region.id} className="rounded-xl bg-black/25 p-3">
                                  <div className="flex items-center justify-between gap-3">
                                      <div className="min-w-0">
                                          <div className="truncate font-bold text-white">{region.label}</div>
                                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                                              {isStreamingRelease ? tr('box.audienceRegion') : tr('box.records.screens', { count: 'screens' in region ? region.screens.toLocaleString() : '0' })}
                                          </div>
                                      </div>
                                      <div className="shrink-0 text-right">
                                          <div className="font-mono text-sm text-white">{isStreamingRelease && 'views' in region ? formatViews(region.views) : 'gross' in region ? formatMoney(region.gross) : '-'}</div>
                                          <div className={`text-[10px] font-bold ${isStreamingRelease ? 'text-indigo-300' : 'text-emerald-300'}`}>
                                              {isStreamingRelease && 'revenue' in region
                                                  ? formatMoney(region.revenue)
                                                  : 'studioReceipts' in region
                                                      ? tr('box.studioAmount', { amount: formatMoney(region.studioReceipts) })
                                                      : ''}
                                          </div>
                                      </div>
                                  </div>
                              </div>
                          ))}
                      </div>
                  )}
              </div>
          );
      };

      const renderPartnersTab = () => (
          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
              <div className={`mb-3 text-[10px] font-black uppercase tracking-[0.18em] ${isStreamingRelease ? 'text-indigo-300' : 'text-emerald-300'}`}>
                  {isStreamingRelease ? tr('box.platformPartner') : tr('box.cinemaPartners')}
              </div>
              {isStreamingRelease ? (
                  <div className="rounded-xl bg-black/25 p-4">
                      <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                              <div className="truncate text-lg font-black text-white">{platform?.name || tr('box.streamingPlatform')}</div>
                              <div className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">{tr('box.platformWindow')}</div>
                          </div>
                          <div className="text-right">
                              <div className="font-mono text-lg font-black text-indigo-300">{formatViews(rel.streaming!.totalViews)}</div>
                              <div className="text-[10px] font-black uppercase text-zinc-500">{tr('box.views')}</div>
                          </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                          {renderMetric(tr('box.streamingUpfront'), formatMoney(getStreamingContract(rel).upfrontFee), 'text-sky-200')}
                          {renderMetric(tr('box.streamingRoyalty'), formatMoney(getStreamingContract(rel).royaltyRevenue), 'text-emerald-300')}
                          {getStreamingContract(rel).platformFunding > 0 && renderMetric(tr('box.streamingFunding'), formatMoney(getStreamingContract(rel).platformFunding), 'text-indigo-200')}
                          {renderMetric(tr('box.revenuePerView'), `$${(getStreamingContract(rel).royaltyRevenue / Math.max(1, rel.streaming!.totalViews)).toFixed(2)}`, 'text-indigo-300')}
                      </div>
                  </div>
              ) : theatricalChains.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-zinc-700 bg-black/20 p-4 text-sm text-zinc-500">
                      {tr('box.cinemaPartnerDataPending')}
                  </div>
              ) : (
                  <div className="space-y-2">
                      {theatricalChains.map(chain => {
                          const chainProfile = getCinemaChainById(chain.id as CinemaChainId, language);
                          return (
                              <div key={chain.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/25 p-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                      {chainProfile && <CinemaChainLogo chain={chainProfile} size="sm" />}
                                      <div className="min-w-0">
                                          <div className="truncate font-bold text-white">{chain.name}</div>
                                          <div className="text-[10px] uppercase tracking-widest text-zinc-500">
                                              {tr('box.partnerScreensCut', { screens: chain.screens.toLocaleString(), cut: formatPercent(chain.exhibitorCut) })}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="shrink-0 text-right">
                                      <div className="font-mono text-sm text-white">{formatMoney(chain.gross)}</div>
                                      <div className="text-[10px] font-bold text-rose-300">{tr('box.cutAmount', { amount: formatMoney(chain.exhibitorReceipts) })}</div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
              )}
          </div>
      );

      return (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
              <div className="bg-emerald-900/50 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-emerald-500/20 backdrop-blur-md">
                  <button onClick={() => setSelectedReleaseId(null)} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
                  <div className="min-w-0 text-center">
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">{isStreamingRelease ? tr('box.streamingDetail') : tr('box.boxOfficeDetail')}</div>
                      <div className="truncate font-bold text-sm">{rel.name}</div>
                  </div>
                  <div className="w-8"></div>
              </div>
              {renderDetailTabs()}
              <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
                  {detailTab === 'OVERVIEW' && renderOverviewTab()}
                  {detailTab === 'WEEKLY' && renderWeeklyTab()}
                  {detailTab === 'REGIONS' && renderRegionsTab()}
                  {detailTab === 'PARTNERS' && renderPartnersTab()}
              </div>
          </div>
      );
  };

  const renderBottomDock = () => (
      <div className="absolute bottom-7 left-4 right-4 z-50 rounded-[2rem] border border-white/10 bg-black/55 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-xl">
          <div className="grid grid-cols-5 gap-1">
              {BOX_OFFICE_SECTIONS.map(item => {
                  const Icon = item.icon;
                  const active = section === item.id;
                  return (
                      <button
                          key={item.id}
                          onClick={() => setSection(item.id)}
                          aria-label={tr('box.openSectionAria', { section: tr(item.labelKey) })}
                          className={`flex h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-[1.45rem] transition-all ${
                              active
                                  ? 'bg-white/15 text-emerald-300 shadow-inner'
                                  : 'text-zinc-500 hover:bg-white/5 hover:text-zinc-300'
                          }`}
                      >
                          <Icon size={18} strokeWidth={active ? 2.8 : 2.2} />
                          <span className={`max-w-full truncate text-[8px] font-black uppercase tracking-[0.08em] ${active ? 'opacity-100' : 'opacity-60'}`}>
                              {tr(item.labelKey)}
                          </span>
                      </button>
                  );
              })}
          </div>
      </div>
  );

  const renderSectionHeader = (eyebrow: string, title: string, body: string) => (
      <div className="rounded-2xl border border-zinc-700 bg-zinc-800/80 p-4 shadow-lg">
          <div className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-300">{eyebrow}</div>
          <div className="mt-2 text-2xl font-black leading-none text-white">{title}</div>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
      </div>
  );

  const renderWeeklyPage = () => {
      const entries = getWeeklyChartEntries();
      const leader = entries[0];
      const totalMarketGross = entries.reduce((sum, entry) => sum + entry.weeklyGross, 0);
      return (
          <>
              {renderSectionHeader(tr('box.weekly.eyebrow'), tr('box.weekly.title'), tr('box.weekly.subtitle'))}
              {leader && (
                  <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                      <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
	                              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">{tr('box.marketRankLeader')}</div>
                              <div className="mt-1 truncate text-xl font-black text-white">{leader.title}</div>
                          </div>
                          <div className="shrink-0 text-right">
                              <div className="font-mono text-lg font-black text-emerald-200">{formatMoney(leader.weeklyGross)}</div>
	                              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{tr('box.weekGross')}</div>
                          </div>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                          <div className="rounded-xl bg-black/25 p-3">
	                              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('box.top10Gross')}</div>
                              <div className="mt-1 font-mono text-sm font-black text-white">{formatMoney(totalMarketGross)}</div>
                          </div>
                          <div className="rounded-xl bg-black/25 p-3">
	                              <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('box.playerTitles')}</div>
                              <div className="mt-1 font-mono text-sm font-black text-emerald-300">{entries.filter(entry => entry.source === 'PLAYER' || entry.source === 'OUTSIDE').length}</div>
                          </div>
                      </div>
                  </div>
              )}
              <div className="space-y-3">
                  {entries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/60 p-5 text-center text-sm text-zinc-500">
	                          {tr('box.weekly.empty')}
                      </div>
                  )}
                  {entries.map(entry => (
                      <button
                          key={entry.id}
                          onClick={() => {
                              if (!entry.rel) return;
                              setDetailTab('OVERVIEW');
                              setSelectedReleaseId(entry.rel.id);
                          }}
                          disabled={!entry.rel}
                          aria-label={`${entry.source === 'OUTSIDE' ? 'Producer Stake' : entry.source === 'PLAYER' ? tr('box.yourRelease') : tr('box.marketFilm')} ${entry.title}`}
                          className={`w-full rounded-2xl border p-3 text-left shadow-lg transition-colors ${
                              entry.source === 'PLAYER'
                                  ? 'border-emerald-400/30 bg-emerald-950/30 hover:border-emerald-300/60'
                                  : entry.source === 'OUTSIDE'
                                      ? 'border-amber-400/25 bg-amber-950/20'
                                      : 'border-zinc-700 bg-zinc-800'
                          }`}
                      >
                          <div className="flex items-center gap-3">
                              <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl font-mono font-black ${
                                  entry.rank === 1 ? 'bg-emerald-400 text-black' : 'bg-black/30 text-zinc-300'
                              }`}>
                                  <span className="text-base leading-none">#{entry.rank}</span>
                                  <span className={`mt-0.5 text-[8px] leading-none ${
                                      entry.rankMovement.startsWith('+') ? 'text-emerald-600' :
                                      entry.rankMovement.startsWith('-') ? 'text-rose-300' :
                                      entry.rank === 1 ? 'text-black/60' : 'text-zinc-500'
                                  }`}>
                                      {entry.rankMovement}
                                  </span>
                              </div>
                              <div className="min-w-0 flex-1">
                                  <div className="flex min-w-0 items-start justify-between gap-2">
                                      <div className="min-w-0">
                                          <div className="truncate font-bold text-white">{entry.title}</div>
                                          <div className="mt-1 flex flex-wrap gap-1.5 text-[9px] font-black uppercase tracking-[0.1em]">
                                              <span className={
                                                  entry.source === 'PLAYER'
                                                      ? 'rounded-md bg-emerald-500/20 px-2 py-1 text-emerald-200'
                                                      : entry.source === 'OUTSIDE'
                                                          ? 'rounded-md bg-amber-500/15 px-2 py-1 text-amber-200'
                                                          : 'rounded-md bg-white/5 px-2 py-1 text-zinc-400'
                                              }>
		                                                  {entry.source === 'PLAYER' ? tr('box.yourRelease') : entry.source === 'OUTSIDE' ? tr('box.producerStake') : tr('box.marketFilm')}
                                              </span>
                                              <span className="rounded-md bg-amber-500/10 px-2 py-1 text-amber-200">{entry.statusTag}</span>
                                          </div>
                                      </div>
                                      {entry.rel && <ChevronRight size={16} className="mt-1 shrink-0 text-emerald-300" />}
                                  </div>
                              </div>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                              <div className="rounded-xl bg-black/25 p-2">
	                                  <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('box.weeklyGross')}</div>
                                  <div className="mt-1 truncate font-mono text-xs font-black text-white">{formatMoney(entry.weeklyGross)}</div>
                              </div>
                              <div className="rounded-xl bg-black/25 p-2">
	                                  <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('box.metric.studioReceipts')}</div>
                                  <div className="mt-1 truncate font-mono text-xs font-black text-emerald-300">{formatMoney(entry.studioReceipts)}</div>
                              </div>
                              <div className="rounded-xl bg-black/25 p-2">
	                                  <div className="text-[8px] font-black uppercase tracking-widest text-zinc-500">{tr('box.runWeekShort')}</div>
                                  <div className={`mt-1 font-mono text-xs font-black ${entry.change !== null && entry.change >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
	                                      {tr('box.weekNumberShort', { week: entry.runWeek })} · {entry.change === null ? tr('box.newRank') : `${entry.change > 0 ? '+' : ''}${entry.change}%`}
                                  </div>
                              </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-[0.14em] text-zinc-500">
	                              <span>{tr('box.records.screens', { count: entry.screens.toLocaleString() })}</span>
	                              <span>{tr('box.marketRank', { rank: entry.rank })}</span>
                          </div>
                      </button>
                  ))}
              </div>
          </>
      );
  };

  const renderAllTimePage = () => {
      const entries = getAllTimeEntries(allTimeMode);
      const archive = getBoxOfficeArchiveEntries();
      const activeCount = archive.filter(entry => entry.source === 'LIVE').length;
      const historyCount = archive.filter(entry => entry.source === 'HISTORY').length;
      const activeMode = ALL_TIME_MODES.find(mode => mode.id === allTimeMode) || ALL_TIME_MODES[0];
      const formatAllTimeValue = (entry: BoxOfficeArchiveEntry) => (
          allTimeMode === 'ROI'
              ? `${entry.roi.toFixed(1)}x`
              : formatMoney(getAllTimeMetricValue(entry, allTimeMode))
      );

      return (
          <>
	              {renderSectionHeader(tr('box.allTime.eyebrow'), tr('box.allTime.title'), tr('box.allTime.subtitle'))}
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <div className="flex items-center justify-between gap-3">
                      <div>
	                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">{tr('box.records.historyIncluded')}</div>
	                          <div className="mt-1 text-lg font-black text-white">{tr('box.trackedTitles', { count: archive.length })}</div>
                      </div>
                      <div className="shrink-0 text-right">
	                          <div className="font-mono text-sm font-black text-emerald-200">{tr('box.liveCount', { count: activeCount })}</div>
	                          <div className="font-mono text-sm font-black text-zinc-400">{tr('box.archiveCount', { count: historyCount })}</div>
                      </div>
                  </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {ALL_TIME_MODES.map(mode => (
                      <button
                          key={mode.id}
                          onClick={() => setAllTimeMode(mode.id)}
                          className={`shrink-0 rounded-2xl border px-3 py-2 text-[10px] font-black uppercase tracking-[0.1em] transition-all ${
                              allTimeMode === mode.id
                                  ? 'border-emerald-300 bg-emerald-400 text-black'
                                  : 'border-zinc-700 bg-zinc-800 text-zinc-400 hover:border-zinc-500'
                          }`}
                      >
                          {tr(mode.labelKey)}
                      </button>
                  ))}
              </div>
              <div className="rounded-2xl border border-zinc-700 bg-zinc-800/70 p-3">
                  <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">{tr(activeMode.metricLabelKey)}</div>
              </div>
              <div className="space-y-2">
                  {entries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/60 p-5 text-center text-sm text-zinc-500">
	                          {tr('box.allTime.empty')}
                      </div>
                  )}
                  {entries.map((entry, index) => (
                      <div key={`${entry.id}-${index}`} className="grid grid-cols-[2.5rem_1fr_auto] items-center gap-3 rounded-2xl border border-zinc-700 bg-zinc-800 p-3">
                          <div className="font-mono text-sm font-black text-zinc-500">#{index + 1}</div>
                          <div className="min-w-0">
                              <div className="truncate font-bold text-white">{entry.title}</div>
                              <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                                  {tr(`box.releaseType.${entry.type.toLowerCase()}`)} · {entry.source === 'HISTORY' ? tr('box.archive') : tr('box.live')}{entry.rating ? ` · IMDb ${entry.rating.toFixed(1)}` : ''}
                              </div>
                          </div>
                          <div className="text-right font-mono text-sm font-black text-emerald-300">{formatAllTimeValue(entry)}</div>
                      </div>
                  ))}
              </div>
          </>
      );
  };

  const renderPartnersPage = () => {
      const entries = getPartnerEntries();
      return (
          <>
              {renderSectionHeader(tr('box.partners.eyebrow'), tr('box.cinemaPartners'), tr('box.partners.subtitle'))}
              <div className="space-y-3">
                  {entries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/60 p-5 text-center text-sm text-zinc-500">
                          {tr('box.cinemaPartnerDataPendingTheatrical')}
                      </div>
                  )}
                  {entries.map(entry => {
                      const chainProfile = getCinemaChainById(entry.id as CinemaChainId, language);
                      return (
                          <div key={entry.id} className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
                              <div className="flex items-center justify-between gap-3">
                                  <div className="flex min-w-0 items-center gap-3">
                                      {chainProfile && <CinemaChainLogo chain={chainProfile} size="sm" />}
                                      <div className="min-w-0">
                                          <div className="truncate font-bold text-white">{entry.name}</div>
                                          <div className="text-[10px] font-black uppercase tracking-[0.14em] text-zinc-500">
                                              {tr('box.records.screens', { count: entry.screens.toLocaleString() })}
                                          </div>
                                      </div>
                                  </div>
                                  <div className="text-right">
                                      <div className="font-mono text-sm font-black text-white">{formatMoney(entry.gross)}</div>
                                      <div className="text-[10px] font-black text-rose-300">{tr('box.percentCut', { percent: formatPercent(entry.exhibitorCut) })}</div>
                                  </div>
                              </div>
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div className="rounded-xl bg-black/25 p-3">
                                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('box.metric.studioReceipts')}</div>
                                      <div className="mt-1 font-mono text-sm font-black text-emerald-300">{formatMoney(entry.studioReceipts)}</div>
                                  </div>
                                  <div className="rounded-xl bg-black/25 p-3">
                                      <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500">{tr('box.partnerCut')}</div>
                                      <div className="mt-1 font-mono text-sm font-black text-rose-300">{formatMoney(entry.exhibitorReceipts)}</div>
                                  </div>
                              </div>
                          </div>
                      );
                  })}
              </div>
          </>
      );
  };

  const renderRecordsPage = () => {
      const entries = getRecordEntries();
      return (
          <>
	              {renderSectionHeader(tr('box.records.eyebrow'), tr('box.records.title'), tr('box.records.subtitle'))}
              <div className="grid grid-cols-1 gap-3">
                  {entries.length === 0 && (
                      <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-800/60 p-5 text-center text-sm text-zinc-500">
	                          {tr('box.records.empty')}
                      </div>
                  )}
                  {entries.map(entry => (
                      <div key={entry.label} className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">{entry.label}</div>
                          <div className="mt-2 truncate text-lg font-black text-white">{entry.title}</div>
                          <div className="mt-2 font-mono text-2xl font-black text-amber-200">{entry.value}</div>
                          <div className="mt-1 text-[10px] font-black uppercase tracking-[0.12em] text-zinc-500">{entry.note}</div>
                      </div>
                  ))}
              </div>
          </>
      );
  };

  const renderSectionContent = () => {
      if (section === 'WEEKLY') return renderWeeklyPage();
      if (section === 'ALL_TIME') return renderAllTimePage();
      if (section === 'PARTNERS') return renderPartnersPage();
      if (section === 'RECORDS') return renderRecordsPage();
      return null;
  };

  if (selectedRelease) {
      return renderDetailView(selectedRelease);
  }

  return (
    <div className="absolute inset-0 bg-zinc-900 flex flex-col z-40 text-white animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="bg-emerald-900/50 p-4 pt-12 pb-3 shadow-lg flex items-center justify-between shrink-0 border-b border-emerald-500/20 backdrop-blur-md">
            <button onClick={onBack} className="p-1 rounded-full hover:bg-white/10"><ArrowLeft size={20}/></button>
            <div className="flex items-center gap-2 font-bold text-emerald-400 text-lg">
                <BarChart3 size={20} /> {tr('box.title')}
            </div>
            <div className="w-8"></div>
        </div>

        {/* Tabs */}
        {section === 'LIVE' && (
            <div className="flex bg-black/40 border-b border-emerald-500/20">
                <button onClick={() => setTab('THEATERS')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'THEATERS' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>{tr('box.inTheaters')}</button>
                <button onClick={() => setTab('STREAMING')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${tab === 'STREAMING' ? 'text-emerald-400 border-b-2 border-emerald-400 bg-emerald-900/20' : 'text-zinc-500 hover:text-zinc-300'}`}>{tr('box.streaming')}</button>
            </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pb-28 space-y-4">
            
            {/* THEATRICAL LIST */}
            {section === 'LIVE' && tab === 'THEATERS' && (
                <>
                    {theatrical.length === 0 && (
                        <div className="text-center text-zinc-600 mt-10 text-sm">{tr('box.noTheatrical')}<br/>{tr('box.noTheatricalSub')}</div>
                    )}
                    {theatrical.map(rel => {
                        // Calculate max for bar graph scaling
                        const maxWeekly = Math.max(...rel.weeklyGross, 1);
                        
                        return (
                            <button
                                key={rel.id}
                                onClick={() => {
                                    setDetailTab('OVERVIEW');
                                    setSelectedReleaseId(rel.id);
                                }}
                                className="w-full text-left bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg transition-colors hover:border-emerald-400/40"
                            >
                                <div className="mb-3">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <div className="font-bold text-lg leading-tight break-words">{rel.name}</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className="text-xs bg-emerald-900 text-emerald-400 px-2 py-1 rounded font-mono font-bold">
                                                {tr('box.runWeekCompact', { week: rel.weekNum })}
                                            </div>
                                            <ChevronRight size={16} className="text-zinc-500" />
                                        </div>
                                    </div>
                                    {renderMetaTags(rel)}
                                </div>

                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 gap-4 mb-4 bg-black/20 p-3 rounded-xl">
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.totalGross')}</div>
                                        <div className="text-white font-bold font-mono text-sm break-all">{formatMoney(rel.totalGross)}</div>
                                    </div>
                                    <div className="min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.budget')}</div>
                                        <div className="text-zinc-400 font-bold font-mono text-sm break-all">{formatMoney(rel.budget)}</div>
                                    </div>
                                </div>

                                {/* Bar Graph Visualization */}
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                                        <TrendingUp size={12}/> {tr('box.weeklyRevenue')}
                                    </div>
                                    <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
                                        {rel.weeklyGross.map((gross, idx) => {
                                            const heightPercent = Math.max(15, (gross / maxWeekly) * 100);
                                            const isLatest = idx === rel.weeklyGross.length - 1;
                                            return (
                                                <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                                                    <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-emerald-300 font-bold' : 'text-zinc-500'}`}>
                                                        {formatMoneyShort(gross)}
                                                    </span>
                                                    <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                                                         <div 
                                                            style={{height: `${heightPercent}%`}} 
                                                            className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-emerald-500' : 'bg-emerald-500/40'}`}
                                                         ></div>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-600 mt-1">{tr('box.weekCompact', { week: idx + 1 })}</span>
                                                </div>
                                            )
                                        })}
                                        {/* Placeholder for future weeks to fill space visually if few weeks */}
                                        {[...Array(Math.max(0, 5 - rel.weeklyGross.length))].map((_, i) => (
                                            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
                                                <div className="w-full bg-zinc-800 rounded-t-md h-full"></div>
                                                <span className="text-[9px] text-zinc-700 mt-1">-</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </>
            )}

            {/* STREAMING LIST */}
            {section === 'LIVE' && tab === 'STREAMING' && (
                <>
                    {streaming.length === 0 && (
                        <div className="text-center text-zinc-600 mt-10 text-sm">{tr('box.noStreaming')}</div>
                    )}
                    {streaming.map(rel => {
                        const platform = PLATFORMS[rel.streaming!.platformId];
                        const weeklyViews = rel.streaming!.weeklyViews || [];
                        const rolloutStatus = getStreamingRolloutStatus(rel);
                        const maxViews = Math.max(...weeklyViews, 1);

                        return (
                            <button
                                key={rel.id}
                                onClick={() => {
                                    setDetailTab('OVERVIEW');
                                    setSelectedReleaseId(rel.id);
                                }}
                                className="w-full text-left bg-zinc-800 p-4 rounded-2xl border border-zinc-700 shadow-lg transition-colors hover:border-indigo-400/40"
                            >
                                <div className="mb-3">
                                    <div className="flex justify-between items-start gap-3">
                                        <div className="min-w-0">
                                            <div className="font-bold text-lg break-words">{rel.name}</div>
                                        </div>
                                        <div className="flex shrink-0 items-center gap-2">
                                            <div className={`text-[10px] px-2 py-1 rounded font-bold uppercase ${platform.color} bg-white/10`}>{platform.name}</div>
                                            <ChevronRight size={16} className="text-zinc-500" />
                                        </div>
                                    </div>
                                    {renderMetaTags(rel, 'streaming')}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div className="bg-black/20 p-3 rounded-xl min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.totalViews')}</div>
                                        <div className="text-white font-bold font-mono text-lg break-all">{formatViews(rel.streaming!.totalViews)}</div>
                                    </div>
                                    <div className="bg-black/20 p-3 rounded-xl flex flex-col justify-center min-w-0">
                                        <div className="text-[10px] text-zinc-500 uppercase font-bold">{tr('box.latestWeek')}</div>
                                        <div className="text-zinc-300 text-sm font-mono font-bold break-all">
                                            {rolloutStatus.isPending ? 'Pending' : weeklyViews.length > 0 ? formatViews(weeklyViews[weeklyViews.length-1]) : '0'}
                                        </div>
                                    </div>
                                </div>

                                {rolloutStatus.isPending && (
                                    <div className="mb-4 rounded-xl border border-indigo-300/20 bg-indigo-400/10 px-3 py-2 text-xs font-bold leading-relaxed text-indigo-100/80">
                                        {rolloutStatus.label}. {rolloutStatus.meta}.
                                    </div>
                                )}

                                {/* Bar Graph for Streaming */}
                                <div>
                                    <div className="text-[10px] text-zinc-500 uppercase font-bold mb-2 flex items-center gap-1">
                                        <TrendingUp size={12}/> {tr('box.weeklyViewership')}
                                    </div>
                                    <div className="flex items-end gap-2 h-24 w-full overflow-x-auto pb-1 no-scrollbar">
                                        {weeklyViews.map((views, idx) => {
                                            const heightPercent = Math.max(15, (views / maxViews) * 100);
                                            const isLatest = idx === weeklyViews.length - 1;
                                            return (
                                                <div key={idx} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1">
                                                    <span className={`text-[9px] font-mono mb-1 ${isLatest ? 'text-white font-bold' : 'text-zinc-500'}`}>
                                                        {formatViewsShort(views)}
                                                    </span>
                                                    <div className="w-full bg-zinc-700/30 rounded-t-md relative h-full flex items-end">
                                                         <div 
                                                            style={{height: `${heightPercent}%`}} 
                                                            className={`w-full rounded-t-md transition-all duration-500 ${isLatest ? 'bg-indigo-500' : 'bg-indigo-500/40'}`}
                                                         ></div>
                                                    </div>
                                                    <span className="text-[9px] text-zinc-600 mt-1">{tr('box.weekCompact', { week: idx + 1 })}</span>
                                                </div>
                                            )
                                        })}
                                         {/* Placeholder for future weeks */}
                                         {[...Array(Math.max(0, 5 - weeklyViews.length))].map((_, i) => (
                                            <div key={`placeholder-${i}`} className="flex flex-col items-center justify-end h-full min-w-[36px] flex-1 opacity-20">
                                                <div className="w-full bg-zinc-800 rounded-t-md h-full"></div>
                                                <span className="text-[9px] text-zinc-700 mt-1">-</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {rel.streaming!.isLeaving && (
                                    <div className="text-xs text-rose-500 font-bold mt-3 bg-rose-500/10 px-3 py-2 rounded-lg flex items-center justify-center border border-rose-500/20">
                                        ⚠️ {tr('box.leavingSoon')}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </>
            )}
            {section !== 'LIVE' && renderSectionContent()}
        </div>

        {renderBottomDock()}
        
        <div className="absolute bottom-1 left-0 right-0 flex justify-center pb-2 z-50 pointer-events-none">
             <div className="w-32 h-1 bg-white/20 rounded-full"></div>
        </div>
    </div>
  );
};
