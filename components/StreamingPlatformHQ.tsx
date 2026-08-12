import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Archive,
  BadgeCheck,
  BarChart3,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  CircleDot,
  Clapperboard,
  Compass,
  Crown,
  Eye,
  Film,
  Gauge,
  Globe2,
  Home,
  Layers3,
  Landmark,
  LibraryBig,
  LockKeyhole,
  Play,
  Plus,
  RadioTower,
  RotateCcw,
  Rocket,
  Server,
  Siren,
  ShieldCheck,
  Sparkles,
  Swords,
  TrendingUp,
  UserRound,
  UsersRound,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { Player, StreamingHqSection, StreamingLogoKey, StreamingTechnologyBranch } from '../types';
import {
  STREAMING_HQ_SECTIONS,
  STREAMING_HQ_TOUR_STEPS,
  advanceStreamingHqTour,
  beginStreamingHqTour,
  getStreamingHqSnapshot,
  replayStreamingHqTour,
  skipStreamingHqTour,
  visitStreamingHqSection,
} from '../services/streamingHq';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import StreamingInfrastructureSetup from './StreamingInfrastructureSetup';
import StreamingCatalogSetup from './StreamingCatalogSetup';
import StreamingOriginalCommissioning from './StreamingOriginalCommissioning';
import StreamingSlatePlanner from './StreamingSlatePlanner';
import StreamingViewerMode from './StreamingViewerMode';
import StreamingLaunchAftermathPanel from './StreamingLaunchAftermathPanel';
import StreamingWeeklyCeoLoop from './StreamingWeeklyCeoLoop';
import StreamingQuarterSeasonCycle from './StreamingQuarterSeasonCycle';
import StreamingAnalyticsCenter from './StreamingAnalyticsCenter';
import StreamingTitleDossier from './StreamingTitleDossier';
import StreamingPromotionWarRoom from './StreamingPromotionWarRoom';
import StreamingOriginalsStudio from './StreamingOriginalsStudio';
import StreamingRightsExchange from './StreamingRightsExchange';
import StreamingTechnologyCampus from './StreamingTechnologyCampus';
import StreamingProductLab from './StreamingProductLab';
import StreamingLeadershipSuite from './StreamingLeadershipSuite';
import StreamingPlatformWars from './StreamingPlatformWars';
import StreamingMarketCommand from './StreamingMarketCommand';
import StreamingAcquisitionCommand from './StreamingAcquisitionCommand';
import StreamingPublicMarkets from './StreamingPublicMarkets';
import StreamingIncidentCommand from './StreamingIncidentCommand';
import StreamingLegacyOffice from './StreamingLegacyOffice';
import StreamingVisualScene from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import { getStreamingDayOneRegionIds } from '../services/streamingDayOneMarkets';
import {
  PlatformHQ as StreamingPlatformCommandDeck,
  type DivisionId as StreamingCommandDivisionId,
  type HqEvent as StreamingCommandEvent,
  type HqState as StreamingCommandDeckState,
  type ServiceTitle as StreamingCommandServiceTitle,
} from './streaming-transplant/StreamingPlatformCommandDeck';
import {
  cityById as streamingCityById,
  type Brand as StreamingTransplantBrand,
  type RegionId as StreamingRegionId,
} from './streaming-transplant/StreamingBrandVisuals';
import { ContentDesk as StreamingContentDesk } from './streaming-transplant/StreamingContentExperience';
import { NetworkDesk as StreamingNetworkDesk } from './streaming-transplant/StreamingNetworkExperience';
import { AudienceDesk as StreamingAudienceDesk } from './streaming-transplant/StreamingAudienceExperience';
import { Boardroom as StreamingBoardroom } from './streaming-transplant/StreamingBoardroomExperience';
import { ViewerApp as StreamingViewerApp } from './streaming-transplant/StreamingViewerExperience';
import {
  TheBuild as StreamingBuildExperience,
  derive as deriveStreamingBuild,
  presetPlacements as streamingPresetPlacements,
  type BuildSel as StreamingBuildSelection,
  type RunResult as StreamingBuildRunResult,
} from './streaming-transplant/StreamingBuildoutExperience';
import {
  PricingDesk as StreamingPricingExperience,
  derivePricing as deriveStreamingPricing,
  type Capabilities as StreamingPricingCapabilities,
  type PricingSel as StreamingPricingSelection,
} from './streaming-transplant/StreamingPricingExperience';
import {
  RaiseDesk as StreamingRaiseExperience,
  type Raise as StreamingRaise,
} from './streaming-transplant/StreamingRaiseExperience';
import {
  PremiereNight as StreamingPremiereExperience,
  type PremiereInputs as StreamingPremiereInputs,
} from './streaming-transplant/StreamingPremiereExperience';
import {
  TitleDossier as StreamingDossierExperience,
  type DossierTitle as StreamingDossierTitle,
} from './streaming-transplant/StreamingDossierExperience';
import {
  StockBug as StreamingStockBug,
  StockPanel as StreamingStockPanel,
  quoteOf as getStreamingStockQuote,
} from './streaming-transplant/StreamingStockExperience';
import {
  createCanonicalAudienceState,
  createCanonicalBoardroomState,
  createCanonicalContentDeskState,
  createCanonicalNetworkState,
  createCanonicalViewerState,
} from './streaming-transplant/createCanonicalStreamingPresentation';
import {
  STREAMING_LICENSE_TERRITORIES,
  STREAMING_STARTER_CATALOG_PACKAGES,
  getStreamingCatalogLicenseStatus,
  resolveStreamingCatalogTitle,
} from '../services/streamingCatalog';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import { getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite } from '../services/streamingProductSuite';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { getStreamingLeadershipSuite } from '../services/streamingLeadershipGovernance';
import { getStreamingCompetitiveWorld } from '../services/streamingCompetitiveWorld';
import { getStreamingIncidentCommand } from '../services/streamingCrisisSecurity';
import {
  commitStreamingInfrastructureSetup,
  createDefaultStreamingInfrastructureDraft,
  getStreamingInfrastructureForecast,
  runStreamingInfrastructureLoadTest,
  saveStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { commitStreamingRaise } from '../services/streamingFinancing';
import '../styles/streaming-hq.css';

const STREAMING_NETWORK_COVERAGE_REGIONS: StreamingRegionId[] = [
  'NORTH_AMERICA',
  'SOUTH_AMERICA',
  'EUROPE',
  'AFRICA',
  'ASIA',
  'OCEANIA',
];

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack: () => void;
  onReturnToGame?: () => void;
  onOpenOriginalProduction?: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
}

const SECTION_ICONS: Record<StreamingHqSection, LucideIcon> = {
  HOME: Home,
  CONTENT: Clapperboard,
  TECH: Server,
  MARKET: Globe2,
  COMPANY: Building2,
};

const TECHNOLOGY_BRANCHES: Array<{
  id: StreamingTechnologyBranch;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  { id: 'DELIVERY_CAPACITY', label: 'Delivery capacity', description: 'Concurrent streams and traffic bursts', icon: RadioTower },
  { id: 'PLAYBACK_QUALITY', label: 'Playback quality', description: 'Picture, sound and device performance', icon: Play },
  { id: 'RELIABILITY', label: 'Reliability', description: 'Uptime and recovery systems', icon: ShieldCheck },
  { id: 'DATA_RECOMMENDATIONS', label: 'Recommendations', description: 'Discovery and personalisation', icon: Compass },
  { id: 'SECURITY', label: 'Security', description: 'Accounts, rights and platform defence', icon: LockKeyhole },
  { id: 'CONTENT_OPERATIONS', label: 'Content operations', description: 'Ingest, localization and publishing', icon: Layers3 },
  { id: 'ADVERTISING_COMMERCE', label: 'Commerce', description: 'Billing, advertising and bundles', icon: WalletCards },
  { id: 'PRODUCT_EXPERIENCE', label: 'Product experience', description: 'Profiles, search and viewing journeys', icon: Sparkles },
];

const formatMoney = (value: number): string => {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(value >= 100_000_000 ? 0 : 1).replace(/\.0$/, '')}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${Math.round(value).toLocaleString()}`;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const colorTone = (hex: string): { hue: number; sat: number } => {
  const normalized = hex.replace('#', '').trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return { hue: 258, sat: 78 };
  const [r, g, b] = [0, 2, 4].map(offset => parseInt(normalized.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const lightness = (max + min) / 2;
  let hue = 0;
  if (delta > 0) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * (((b - r) / delta) + 2);
    else hue = 60 * (((r - g) / delta) + 4);
  }
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  return { hue: Math.round((hue + 360) % 360), sat: clamp(Math.round(saturation * 100), 40, 100) };
};

const stableHue = (key: string): number => (
  [...key].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) % 360, 53)
);

function LogoMark({ logoKey }: { logoKey: StreamingLogoKey }) {
  if (logoKey === 'SIGNAL_RING') return <RadioTower size={24} />;
  if (logoKey === 'SPOTLIGHT') return <Sparkles size={24} />;
  if (logoKey === 'WORDMARK') return <Crown size={24} />;
  return <Play size={24} fill="currentColor" />;
}

function FutureBadge({ phase }: { phase: number }) {
  return <span className="hq-future-badge">PHASE {phase}</span>;
}

function EmptyState({
  icon: Icon,
  eyebrow,
  title,
  copy,
  phase,
}: {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  copy: string;
  phase: number;
}) {
  return (
    <section className="hq-empty-state">
      <div className="hq-empty-signal" aria-hidden="true"><Icon size={29} /></div>
      <span className="hq-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{copy}</p>
      <FutureBadge phase={phase} />
    </section>
  );
}

export default function StreamingPlatformHQ({ player, onUpdatePlayer, onBack, onReturnToGame, onOpenOriginalProduction }: Props) {
  const platform = player.ownedStreamingPlatform;
  const identity = platform.identity!;
  const snapshot = useMemo(() => getStreamingHqSnapshot(player), [player]);
  const technologyCampus = useMemo(() => getStreamingTechnologyCampus(player), [player]);
  const productSuite = useMemo(() => getStreamingProductSuite(player), [player]);
  const leadershipSuite = useMemo(() => getStreamingLeadershipSuite(player), [player]);
  const competitiveWorld = useMemo(() => getStreamingCompetitiveWorld(player), [player]);
  const incidentCommand = useMemo(() => getStreamingIncidentCommand(player), [player]);
  const latestWeeklySnapshot = platform.weeklyHistory.at(-1) || null;
  const onboarding = platform.hqOnboarding ?? {
    status: 'NOT_STARTED' as const,
    currentStep: 0,
    visitedSections: [],
    startedAtAbsoluteWeek: null,
    completedAtAbsoluteWeek: null,
  };
  const mainRef = useRef<HTMLElement>(null);
  const pendingFoundingReveal = platform.cinematicQueue.find(event => (
    event.type === 'FOUNDING_KEYNOTE' && event.status === 'QUEUED'
  ));
  const pendingOriginalReveal = platform.cinematicQueue.find(event => (
    event.type === 'FIRST_ORIGINAL_ANNOUNCEMENT' && event.status === 'QUEUED'
  ));
  const pendingLaunchReveal = platform.cinematicQueue.find(event => (
    event.type === 'LAUNCH_NIGHT' && event.status === 'QUEUED'
  ));
  const initialSection = onboarding.status === 'IN_PROGRESS'
    ? STREAMING_HQ_TOUR_STEPS[onboarding.currentStep]?.section || 'HOME'
    : 'HOME';
  const [activeSection, setActiveSection] = useState<StreamingHqSection>(initialSection);
  const [showFoundingReveal, setShowFoundingReveal] = useState(Boolean(pendingFoundingReveal));
  const [replayingReveal, setReplayingReveal] = useState(false);
  const [showWelcome, setShowWelcome] = useState(
    onboarding.status === 'NOT_STARTED' && !pendingFoundingReveal,
  );
  const [showTourComplete, setShowTourComplete] = useState(false);
  const [showInfrastructureSetup, setShowInfrastructureSetup] = useState(false);
  const [showTechnologyCampus, setShowTechnologyCampus] = useState(false);
  const [showProductLab, setShowProductLab] = useState(false);
  const [showLeadershipSuite, setShowLeadershipSuite] = useState(false);
  const [showCatalogSetup, setShowCatalogSetup] = useState(false);
  const [showOriginalCommissioning, setShowOriginalCommissioning] = useState(false);
  const [showOriginalsStudio, setShowOriginalsStudio] = useState(false);
  const [showRightsExchange, setShowRightsExchange] = useState(false);
  const [showPlatformWars, setShowPlatformWars] = useState(false);
  const [showAcquisitionCommand, setShowAcquisitionCommand] = useState(false);
  const [showPublicMarkets, setShowPublicMarkets] = useState(false);
  const [showIncidentCommand, setShowIncidentCommand] = useState(false);
  const [showLegacyOffice, setShowLegacyOffice] = useState(false);
  const [showSlatePlanner, setShowSlatePlanner] = useState(false);
  const [showOriginalReveal, setShowOriginalReveal] = useState(Boolean(pendingOriginalReveal));
  const [showViewerMode, setShowViewerMode] = useState(false);
  const [showAnalyticsCenter, setShowAnalyticsCenter] = useState(false);
  const [showMarketCommand, setShowMarketCommand] = useState(false);
  const [showTitleDossier, setShowTitleDossier] = useState(false);
  const [titleDossierInitialProjectId, setTitleDossierInitialProjectId] = useState<string | null>(null);
  const [showPromotionWarRoom, setShowPromotionWarRoom] = useState(false);
  const [promotionInitialProjectId, setPromotionInitialProjectId] = useState<string | null>(null);
  const [showOperationsOffice, setShowOperationsOffice] = useState(false);
  const [showCinematicBuild, setShowCinematicBuild] = useState(false);
  const [showCinematicPricing, setShowCinematicPricing] = useState(false);
  const [showCinematicRaise, setShowCinematicRaise] = useState(false);
  const [showCinematicPremiere, setShowCinematicPremiere] = useState(Boolean(pendingLaunchReveal));
  const [showCinematicStock, setShowCinematicStock] = useState(false);
  const [buildRunResult, setBuildRunResult] = useState<StreamingBuildRunResult | null>(null);
  const buildCommittedPlayerRef = useRef<Player | null>(null);
  const [capitalAmount, setCapitalAmount] = useState(5_000_000);
  const [companyFeedback, setCompanyFeedback] = useState('');

  const visualRegions = useMemo<StreamingRegionId[]>(() => {
    const mapRegion = (regionId: string): StreamingRegionId[] => {
      if (regionId === 'NORTH_AMERICA' || regionId === 'HOME_MARKET') return ['NORTH_AMERICA'];
      if (regionId === 'LATIN_AMERICA') return ['SOUTH_AMERICA'];
      if (regionId === 'EUROPE') return ['EUROPE'];
      if (regionId === 'SOUTH_ASIA' || regionId === 'EAST_ASIA') return ['ASIA'];
      if (regionId === 'MIDDLE_EAST_AFRICA') return ['AFRICA'];
      return [];
    };
    const active = platform.competitiveWorld.regionalLaunches
      .filter(region => region.status === 'ACTIVE')
      .flatMap(region => mapRegion(region.regionId));
    const dayOne = getStreamingDayOneRegionIds(identity.dayOneMarketIds || []) as StreamingRegionId[];
    const foundingRegion = streamingCityById(identity.launchServerCityId)?.region || 'NORTH_AMERICA';
    return Array.from(new Set<StreamingRegionId>(dayOne.length ? dayOne : active.length ? active : [foundingRegion]));
  }, [identity.dayOneMarketIds, identity.launchServerCityId, platform.competitiveWorld.regionalLaunches]);

  const initialInfrastructureDraft = platform.infrastructureSetupDraft
    || createDefaultStreamingInfrastructureDraft(player);
  const [buildSelection, setBuildSelection] = useState<StreamingBuildSelection>(() => ({
    placements: initialInfrastructureDraft.networkPlacements?.length
      ? initialInfrastructureDraft.networkPlacements.map(placement => ({ ...placement }))
      : streamingPresetPlacements(
        initialInfrastructureDraft.capacityPackageId,
        visualRegions,
        identity.launchServerCityId,
      ),
    arch: initialInfrastructureDraft.strategy === 'CLOUD_FIRST'
      ? 'CLOUD'
      : initialInfrastructureDraft.strategy === 'OWNED_INFRASTRUCTURE'
        ? 'OWNED'
        : 'HYBRID',
    doctrine: initialInfrastructureDraft.rolloutPace,
    campaign: 'NONE',
  }));
  const [pricingSelection, setPricingSelection] = useState<StreamingPricingSelection>(() => ({
    model: 'SUBS',
    on: { FREE: false, BASIC: true, STANDARD: true, PREMIUM: true },
    price: {
      FREE: 0,
      BASIC: initialInfrastructureDraft.subscriptionPrices.BASIC,
      STANDARD: initialInfrastructureDraft.subscriptionPrices.PREMIUM,
      PREMIUM: initialInfrastructureDraft.subscriptionPrices.FAMILY,
    },
  }));

  const commandDeckBrand = useMemo<StreamingTransplantBrand>(() => {
    const primary = colorTone(identity.primaryColor);
    const secondary = colorTone(identity.secondaryColor);
    const markId = identity.logoKey === 'SIGNAL_RING'
      ? 'ORBIT'
      : identity.logoKey === 'SPOTLIGHT'
        ? 'APERTURE'
        : identity.logoKey === 'WORDMARK'
          ? 'LETTER_SOLID'
          : 'BOLT';
    const promiseId = identity.brandPromiseId === 'EVENT_HOUSE'
      ? 'EVENT'
      : identity.brandPromiseId === 'BINGE_MACHINE'
        ? 'BINGE'
        : identity.brandPromiseId === 'FANDOM_FOREVER'
          ? 'FANDOM'
          : identity.brandPromiseId === 'WORLD_STAGE'
            ? 'WORLD'
            : identity.brandPromiseId === 'EVERYONES_SCREEN'
              ? 'EVERYONE'
              : identity.brandPromiseId === 'TECHNOLOGY_FIRST'
                ? 'TECH'
                : 'BALANCED';
    return {
      name: identity.name,
      markId,
      customMark: null,
      hue: primary.hue,
      sat: primary.sat,
      identId: identity.soundIdentKey === 'ASCENT'
        ? 'RISE'
        : identity.soundIdentKey === 'PREMIERE'
          ? 'ANTHEM'
          : identity.soundIdentKey === 'SILENT'
            ? 'HUSH'
            : 'PULSE',
      customIdent: null,
      promiseId,
      layoutId: 'CINEMA',
      typeId: identity.logoKey === 'WORDMARK' ? 'GEOMETRIC' : 'GROTESK',
      accentHue: secondary.hue,
      identMode: identity.soundIdentKey === 'SILENT' ? 'none' : 'badge',
      identLen: 2,
      ratingId: 'MATURE',
      lockupId: identity.logoKey === 'WORDMARK' ? 'ICON' : 'SIDE',
      serverCity: snapshot.reachLabel,
    };
  }, [identity, snapshot.reachLabel]);

  const commandDeckState = useMemo<StreamingCommandDeckState>(() => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const latestPerformance = latestWeeklySnapshot?.operations?.titlePerformance ?? [];
    const performanceByProject = new Map(latestPerformance.map(item => [item.projectId, item]));
    const mostWatched = [...latestPerformance].sort((a, b) => b.viewingAccounts - a.viewingAccounts)[0];
    const activeRegions = platform.competitiveWorld.regionalLaunches.filter(region => region.status === 'ACTIVE').length;
    const currentCapacity = Math.max(0, platform.capacity.baselineConcurrentStreams);
    const capacityPressure = currentCapacity > 0
      ? (latestWeeklySnapshot?.operations?.peakConcurrentStreams ?? 0) / currentCapacity
      : 0;
    const originalProgress: Record<string, number> = {
      READY_FOR_GREENLIGHT: 0.1,
      GREENLIT: 0.25,
      IN_PRODUCTION: 0.58,
      DELIVERED: 0.86,
      RELEASED: 1,
    };
    const originalStage: Record<string, 'COMMISSIONED' | 'IN PRODUCTION' | 'DELIVERED' | 'SCHEDULED'> = {
      READY_FOR_GREENLIGHT: 'COMMISSIONED',
      GREENLIT: 'COMMISSIONED',
      IN_PRODUCTION: 'IN PRODUCTION',
      DELIVERED: 'DELIVERED',
      RELEASED: 'SCHEDULED',
    };
    const slate = platform.originalCommissions.slice(-5).reverse().map(commission => {
      const programmed = platform.launchSlate?.entries.find(entry => entry.projectId === commission.canonicalProjectId);
      return {
        id: commission.id,
        title: commission.title,
        kind: 'ORIGINAL' as const,
        stage: programmed ? 'SCHEDULED' as const : originalStage[commission.status],
        progress: programmed ? Math.max(originalProgress[commission.status], 0.9) : originalProgress[commission.status],
        budget: commission.productionBudgetCap,
        releaseWeek: programmed?.launchWeek,
        hue: stableHue(commission.id),
      };
    });
    const service = platform.catalogProjectIds.slice(0, 8).map(projectId => {
      const title = resolveStreamingCatalogTitle(player, projectId);
      if (!title) return null;
      const performance = performanceByProject.get(projectId);
      const license = platform.catalogLicenses.find(item => item.sourceProjectId === projectId);
      const isOriginal = platform.originalCommissions.some(item => item.canonicalProjectId === projectId);
      const completion = performance?.completionRate ?? 0;
      const status: StreamingCommandServiceTitle['status'] = !performance
        ? 'STEADY'
        : performance.viewingAccounts === mostWatched?.viewingAccounts
          ? 'TOP 10'
          : completion >= 70
            ? 'RISING'
            : completion < 38
              ? 'FADING'
              : 'STEADY';
      return {
        id: projectId,
        title: title.title,
        kind: `${isOriginal ? 'Original' : license ? 'Licensed' : 'Library'} · ${title.projectType === 'SERIES' ? 'Series' : 'Film'}`,
        status,
        rating: clamp(title.rating ?? ((performance?.satisfactionScore ?? 72) / 10), 0, 10),
        views: performance?.viewingAccounts ?? 0,
        completion: clamp(Math.round(completion), 0, 100),
        expiresIn: license ? Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek) : undefined,
        hue: stableHue(projectId),
      } satisfies StreamingCommandServiceTitle;
    }).filter(Boolean) as StreamingCommandServiceTitle[];

    const events: StreamingCommandEvent[] = [];
    if (incidentCommand.activeCrisis) {
      events.push({
        id: 'INCIDENT',
        priority: 1,
        label: incidentCommand.activeCrisis.title,
        line: `${incidentCommand.activeCrisis.severity} incident is affecting platform trust.`,
        tone: 'urgent',
        meta: 'WAR ROOM',
        hero: true,
      });
    }
    if (!platform.launchCommit) {
      events.push({
        id: 'LAUNCH',
        priority: platform.launchSlate ? 2 : 5,
        label: platform.launchSlate ? 'Launch Command is standing by' : 'Opening night is not programmed',
        line: platform.launchSlate ? 'Run the final forecast and make the go / no-go call.' : 'Complete the opening slate before committing the signal.',
        tone: platform.launchSlate ? 'brand' : 'warn',
        meta: `${snapshot.completedChecklistItems}/${snapshot.checklist.length}`,
      });
    } else {
      events.push({
        id: 'WEEKLY',
        priority: latestWeeklySnapshot && platform.lastAcknowledgedWeeklyReportAbsoluteWeek !== latestWeeklySnapshot.absoluteWeek ? 2 : 8,
        label: latestWeeklySnapshot && platform.lastAcknowledgedWeeklyReportAbsoluteWeek !== latestWeeklySnapshot.absoluteWeek
          ? 'The weekly result is ready'
          : 'CEO operating brief',
        line: latestWeeklySnapshot?.operations?.nextWeekHook || 'Set the next platform priority before advancing the game week.',
        tone: latestWeeklySnapshot && platform.lastAcknowledgedWeeklyReportAbsoluteWeek !== latestWeeklySnapshot.absoluteWeek ? 'brand' : 'calm',
        meta: `WK ${absoluteWeek.toLocaleString()}`,
      });
    }
    const openRivalMove = platform.competitiveWorld.moves.find(move => move.status === 'OPEN');
    if (openRivalMove) {
      events.push({
        id: 'RIVAL',
        priority: 3,
        label: `${openRivalMove.platformName} made a move`,
        line: openRivalMove.title,
        tone: 'warn',
        meta: `ENDS WK ${openRivalMove.expiresAtAbsoluteWeek}`,
      });
    }

    return {
      live: platform.lifecycle === 'ACTIVE',
      built: Boolean(platform.infrastructureSetup),
      tier: snapshot.reachLabel.toUpperCase(),
      territories: Math.max(1, activeRegions + 1),
      reachLevel: snapshot.reachLevel,
      subscribers: platform.metrics.subscribers,
      subsDelta: platform.metrics.netSubscriberMovement,
      treasury: platform.treasuryCash,
      readiness: { done: snapshot.completedChecklistItems, total: snapshot.checklist.length },
      nowPlaying: mostWatched ? {
        title: mostWatched.title,
        watching: Math.max(1, Math.round(mostWatched.viewingAccounts / 12)),
      } : platform.launchCommit ? {
        title: platform.launchCommit.openingOriginalTitle,
        watching: Math.max(1, Math.round(platform.launchCommit.initialSubscribers * 0.04)),
      } : undefined,
      stats: [
        { id: 'ARPU', label: 'ARPU', value: platform.launchCommit ? formatMoney(platform.metrics.averageRevenuePerUser) : 'PENDING', tone: platform.launchCommit ? 'good' : 'pending' },
        { id: 'CHURN', label: 'CHURN', value: platform.launchCommit ? `${(platform.metrics.churnRate * 100).toFixed(1)}%` : 'PENDING', tone: platform.metrics.churnRate > 0.055 ? 'bad' : platform.launchCommit ? 'good' : 'pending' },
        { id: 'ENGAGEMENT', label: 'ENGAGEMENT', value: platform.launchCommit ? `${Math.round(platform.metrics.engagementRate * 100)}%` : 'PENDING', tone: platform.launchCommit ? 'good' : 'pending' },
        { id: 'CAPACITY', label: 'STREAM CAPACITY', value: currentCapacity > 0 ? currentCapacity.toLocaleString() : 'LEVEL 0', tone: capacityPressure >= 0.9 ? 'bad' : currentCapacity ? 'good' : 'pending' },
      ],
      slate,
      service,
      divisions: [
        {
          id: 'CONTENT', label: 'CONTENT', sub: 'Rights, Originals & programming',
          statLabel: 'CATALOGUE', stat: `${(platform.catalogProjectIds || []).length} TITLES`,
          pressure: !platform.starterCatalog ? 'urgent' : (platform.originalCommissions || []).length === 0 ? 'watch' : 'calm',
          note: !platform.starterCatalog ? 'The opening shelves are empty.' : undefined,
          chips: [
            { id: 'RIGHTS', label: 'RIGHTS', alert: !platform.starterCatalog },
            { id: 'ORIGINALS', label: 'ORIGINALS', alert: (platform.originalCommissions || []).length === 0 },
            { id: 'SLATE', label: 'SLATE', alert: !platform.launchSlate },
          ],
        },
        {
          id: 'NETWORK', label: 'NETWORK', sub: 'Capacity, technology & products',
          statLabel: 'BASELINE', stat: currentCapacity > 0 ? `${currentCapacity.toLocaleString()} STREAMS` : 'LEVEL 0',
          pressure: incidentCommand.activeCrisis ? 'urgent' : !platform.infrastructureSetup || capacityPressure >= 0.82 ? 'watch' : 'calm',
          note: incidentCommand.activeCrisis ? 'A live incident needs command.' : undefined,
          chips: [
            { id: 'INFRA', label: 'INFRASTRUCTURE', alert: !platform.infrastructureSetup },
            { id: 'TECH', label: 'TECH CAMPUS' },
            { id: 'PRODUCTS', label: 'PRODUCT LAB' },
            { id: 'INCIDENTS', label: 'INCIDENTS', alert: Boolean(incidentCommand.activeCrisis) },
          ],
        },
        {
          id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Analytics, growth & competition',
          statLabel: 'SUBSCRIBERS', stat: platform.launchCommit ? platform.metrics.subscribers.toLocaleString() : 'PRE-LAUNCH',
          pressure: platform.metrics.churnRate > 0.055 ? 'watch' : 'calm',
          note: platform.metrics.churnRate > 0.055 ? 'Churn is above the comfort line.' : undefined,
          chips: [
            { id: 'ANALYTICS', label: 'ANALYTICS' },
            { id: 'GROWTH', label: 'GROWTH' },
            { id: 'WARS', label: 'PLATFORM WARS', alert: Boolean(openRivalMove) },
            { id: 'ACQUISITIONS', label: 'M&A' },
          ],
        },
        {
          id: 'BOARDROOM', label: 'BOARDROOM', sub: 'Leadership, capital & ownership',
          statLabel: 'LEADERSHIP', stat: `${(leadershipSuite.appointments || []).length} EXECUTIVES`,
          pressure: platform.publicCompany.lifecycle === 'ROADSHOW' ? 'watch' : 'calm',
          chips: [
            { id: 'LEADERSHIP', label: 'LEADERSHIP' },
            { id: 'MARKETS', label: platform.publicCompany.listing ? 'PUBLIC MARKETS' : 'IPO DESK' },
            { id: 'FINANCE', label: 'FINANCE' },
            { id: 'OPERATIONS', label: 'CEO BRIEF', alert: Boolean(latestWeeklySnapshot && platform.lastAcknowledgedWeeklyReportAbsoluteWeek !== latestWeeklySnapshot.absoluteWeek) },
            { id: 'LEGACY', label: 'LEGACY' },
          ],
        },
      ],
      events,
    };
  }, [incidentCommand.activeCrisis, latestWeeklySnapshot, leadershipSuite.appointments, platform, player, snapshot]);
  const cinematicContentState = useMemo(() => createCanonicalContentDeskState(player), [player]);
  const cinematicNetworkState = useMemo(() => createCanonicalNetworkState(player), [player]);
  const cinematicAudienceState = useMemo(() => createCanonicalAudienceState(player), [player]);
  const cinematicBoardroomState = useMemo(() => createCanonicalBoardroomState(player), [player]);
  const cinematicViewerState = useMemo(() => createCanonicalViewerState(player), [player]);
  const pricingCapabilities = useMemo<StreamingPricingCapabilities>(() => ({
    adserver: platform.technologyLevels.ADVERTISING_COMMERCE >= 1,
    profiles: platform.technologyLevels.PRODUCT_EXPERIENCE >= 1,
    uhd: platform.technologyLevels.PLAYBACK_QUALITY >= 2,
  }), [platform.technologyLevels]);
  const pricingDerived = useMemo(
    () => deriveStreamingPricing(pricingSelection, pricingCapabilities),
    [pricingCapabilities, pricingSelection],
  );
  const buildInputs = useMemo(() => ({
    treasury: platform.treasuryCash,
    catalogueSpend: (platform.catalogLicenses || []).reduce((sum, license) => sum + license.minimumGuarantee, 0),
    catalogueTitles: (platform.catalogProjectIds || []).length,
    originalsSpend: (platform.originalCommissions || []).reduce((sum, original) => sum + original.productionFundingApplied, 0),
    originalsCount: (platform.originalCommissions || []).length,
    premiereTitle: platform.launchSlate?.entries[0]?.title
      || (platform.originalCommissions || [])[0]?.title
      || 'First Original',
    regions: visualRegions,
    coverageRegions: STREAMING_NETWORK_COVERAGE_REGIONS,
    homeCityId: identity.launchServerCityId || buildSelection.placements[0]?.cityId || null,
    audienceMul: pricingDerived.reachMul,
    debtWeekly: (platform.finance.loans || [])
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + loan.outstandingPrincipal * loan.weeklyInterestRate, 0),
  }), [buildSelection.placements, identity.launchServerCityId, platform, pricingDerived.reachMul, visualRegions]);
  const buildDerived = useMemo(
    () => deriveStreamingBuild(buildSelection, buildInputs),
    [buildInputs, buildSelection],
  );
  const builtPlacements = useMemo(() => platform.infrastructureSetup
    ? platform.infrastructureSetup.networkPlacements?.length
      ? platform.infrastructureSetup.networkPlacements.map(placement => ({ ...placement }))
      : streamingPresetPlacements(
        platform.infrastructureSetup.capacityPackageId,
        visualRegions,
        identity.launchServerCityId,
      )
    : null,
  [identity.launchServerCityId, platform.infrastructureSetup, visualRegions]);
  const canonicalRaises = useMemo<StreamingRaise[]>(() => (platform.finance.capitalActions || [])
    .filter(action => ['FOUNDER_CONTRIBUTION', 'LOAN_DRAW', 'EQUITY_ISSUANCE'].includes(action.type))
    .map(action => {
      if (action.type === 'FOUNDER_CONTRIBUTION') {
        return { id: action.idempotencyKey, kind: 'FOUNDER', amount: action.amount };
      }
      if (action.type === 'LOAN_DRAW') {
        const loan = (platform.finance.loans || []).find(item => item.openedAtAbsoluteWeek === action.absoluteWeek && item.principal === action.amount);
        return {
          id: action.idempotencyKey,
          kind: 'DEBT',
          amount: action.amount,
          ratePct: loan ? loan.weeklyInterestRate * 52 * 100 : 0,
          weekly: loan ? loan.outstandingPrincipal * loan.weeklyInterestRate : 0,
        };
      }
      const holder = [...(platform.finance.equityHolders || [])].reverse()
        .find(item => item.issuedAtAbsoluteWeek === action.absoluteWeek && item.investedCapital === action.amount);
      return {
        id: action.idempotencyKey,
        kind: 'EQUITY',
        amount: action.amount,
        pct: Math.max(0, action.ownershipBefore - action.ownershipAfter),
        investor: holder?.holderName || 'Growth investor',
        agenda: 'Carries an investor vote on major platform decisions.',
      };
    }), [platform.finance]);
  const cinematicDossier = useMemo<StreamingDossierTitle | null>(() => {
    if (!titleDossierInitialProjectId) return null;
    const performance = [...(platform.weeklyHistory || [])]
      .reverse()
      .flatMap(snapshotValue => snapshotValue.operations?.titlePerformance || [])
      .find(item => item.projectId === titleDossierInitialProjectId);
    const catalogue = cinematicContentState.titles.find(item => item.id === titleDossierInitialProjectId);
    if (!performance && !catalogue) return null;
    const title = performance?.title || catalogue?.title || 'Streaming title';
    const completion = Math.round((performance?.completionRate || catalogue?.completion || 0) * (performance?.completionRate && performance.completionRate <= 1 ? 100 : 1));
    const sourceMix = performance?.discoveryMix;
    return {
      id: titleDossierInitialProjectId,
      title,
      kind: performance?.source === 'ORIGINAL' || catalogue?.kind === 'ORIGINAL' ? 'ORIGINAL' : 'LICENSED',
      format: String(performance?.projectType || catalogue?.format || 'Film'),
      genre: performance?.genre || catalogue?.genre || 'Drama',
      hue: commandDeckBrand.hue,
      logline: `The complete audience, commercial and lifecycle record for ${title}.`,
      status: catalogue?.status || 'ON THE SERVICE',
      chartRank: cinematicAudienceState.chart.find(row => row.mine && row.title === title)?.rank,
      rating: performance ? Math.max(1, Math.min(10, performance.satisfactionScore / 10)) : undefined,
      rightsWeeksLeft: catalogue?.rights?.weeksLeft,
      viewers: performance?.viewingAccounts || catalogue?.views || 0,
      completion,
      subsAcquired: Math.round((performance?.viewingAccounts || 0) * 0.03),
      churnPrevented: Math.round((performance?.viewingAccounts || 0) * 0.015),
      revenue: performance?.attributedSubscriptionRevenue || 0,
      cost: performance?.allocatedCashCost || performance?.allocatedContentAmortization || 0,
      sources: sourceMix ? [
        { label: 'Homepage', pct: sourceMix.homepagePercent },
        { label: 'Recommendations', pct: sourceMix.recommendationsPercent },
        { label: 'Search', pct: sourceMix.searchPercent },
        { label: 'Direct', pct: sourceMix.directPercent },
      ] : [{ label: 'Platform discovery', pct: 100 }],
      journey: { steps: ['Acquired', 'Prepared', 'Scheduled', 'Live', 'Peak', 'Long tail'], at: performance ? Math.min(5, 3 + Math.floor(performance.weeksAvailable / 3)) : 2 },
      dna: [
        { label: 'Reach', value: Math.min(100, Math.round((performance?.viewingAccounts || 0) / Math.max(1, platform.metrics.subscribers) * 100)) },
        { label: 'Completion', value: completion },
        { label: 'Retention', value: Math.round(platform.metrics.engagementRate * 100) },
        { label: 'Acquisition', value: Math.min(100, Math.round((performance?.viewingAccounts || 0) / 10000)) },
        { label: 'Rewatch', value: Math.round((performance?.repeatViewingRate || 0) * (performance?.repeatViewingRate && performance.repeatViewingRate <= 1 ? 100 : 1)) },
      ],
      artwork: [{ id: 'canonical', hue: commandDeckBrand.hue, ctr: 5.4, live: true }],
      press: [{ id: 'canonical-summary', tag: 'LATEST', source: identity.name, head: title, body: performance ? `${performance.viewingAccounts.toLocaleString()} accounts watched during the latest measured week.` : 'Performance reporting begins after release.' }],
      maturity: { have: performance?.weeksAvailable || 0, need: 8 },
    };
  }, [cinematicAudienceState.chart, cinematicContentState.titles, commandDeckBrand.hue, identity.name, platform.metrics, platform.weeklyHistory, titleDossierInitialProjectId]);
  const launchReadiness = useMemo(() => getStreamingLaunchReadiness(player), [player]);
  const cinematicPremiereInputs = useMemo<StreamingPremiereInputs>(() => {
    const commit = platform.launchCommit;
    const halls = (builtPlacements || streamingPresetPlacements('STARTER', visualRegions, null));
    const totalRacks = Math.max(1, halls.reduce((sum, placement) => sum + placement.racks, 0));
    const baseline = Math.max(1, commit?.protectedPeakConcurrentStreams || platform.capacity.baselineConcurrentStreams || 65_000);
    const burst = Math.max(baseline, platform.capacity.burstConcurrentStreams || baseline);
    const activeInvestor = (platform.finance.equityHolders || [])[0];
    const engineer = (platform.leadership.appointments || []).find(appointment => (
      appointment.status === 'ACTIVE' && appointment.role === 'CTO'
    ));
    return {
      title: commit?.openingOriginalTitle || launchReadiness.openingOriginalTitle,
      halls: halls.map((placement, index) => ({
        id: placement.cityId,
        label: placement.cityId.replace(/_/g, ' '),
        ceiling: Math.round(baseline * placement.racks / totalRacks),
        burstCeiling: Math.round(burst * placement.racks / totalRacks),
        share: placement.racks / totalRacks,
      })),
      ceiling: baseline,
      burstCeiling: burst,
      expected: commit?.forecastLikelyConcurrentStreams || launchReadiness.forecastLikelyConcurrentStreams,
      wobble: Math.min(1, (platform.infrastructureSetup?.technicalDebt || 0) / 100),
      arpu: platform.metrics.averageRevenuePerUser,
      treasury: platform.treasuryCash,
      checks: launchReadiness.items.map(item => ({
        id: item.id,
        label: item.label,
        ok: item.tone !== 'BLOCKED',
        note: item.detail,
      })),
      investor: activeInvestor ? {
        name: activeInvestor.holderName,
        agenda: 'Expects the platform to deliver the operating case behind the investment.',
      } : null,
      rivals: (platform.competitiveWorld.rivals || []).map(rival => ({
        name: rival.platformName,
        subs: `${Math.round(rival.subscribersMillions)}M`,
      })),
      engineer: engineer ? { name: engineer.nameAtAppointment, role: 'CTO' } : null,
      simulationSeed: platform.simulationSeed,
      launchAllowed: Boolean(commit) || launchReadiness.canLaunch,
      launchBlockerMessage: launchReadiness.canLaunch
        ? undefined
        : `${launchReadiness.blockerCount} launch requirement${launchReadiness.blockerCount === 1 ? '' : 's'} still need attention. Return to HQ and clear the highlighted rooms.`,
    };
  }, [builtPlacements, launchReadiness, platform, visualRegions]);
  const stockQuote = useMemo(() => {
    const listing = platform.publicCompany.listing;
    if (!listing) return null;
    const latestQuote = platform.publicCompany.quoteHistory.at(-1);
    const firstPostListingSnapshot = (platform.weeklyHistory || []).find(snapshotValue => snapshotValue.absoluteWeek >= listing.listedAtAbsoluteWeek);
    const weeklyNet = latestWeeklySnapshot?.operations?.netCashContribution || 0;
    return getStreamingStockQuote({
      closePrice: latestQuote?.close || listing.offerPrice,
      subsAtListing: firstPostListingSnapshot?.subscribers || platform.metrics.subscribers,
      subs: platform.metrics.subscribers,
      churnPct: platform.metrics.churnRate * 100,
      techDebt: platform.infrastructureSetup?.technicalDebt || 0,
      treasury: platform.treasuryCash,
      weeklyNet,
      marks: listing.governanceMarks?.length || 0,
    });
  }, [latestWeeklySnapshot, platform]);

  const persist = (nextPlayer: Player) => onUpdatePlayer?.(nextPlayer);

  const canonicalInfrastructureDraft = () => {
    const packageId = buildDerived.racks <= 2
      ? 'STARTER'
      : buildDerived.racks <= 4
        ? 'ESSENTIAL'
        : buildDerived.racks <= 7
          ? 'GROWTH'
          : 'PREMIERE';
    const strategy = buildSelection.arch === 'CLOUD'
      ? 'CLOUD_FIRST'
      : buildSelection.arch === 'OWNED'
        ? 'OWNED_INFRASTRUCTURE'
        : 'HYBRID';
    return {
      ...(platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player)),
      currentStep: 4,
      strategy,
      capacityPackageId: packageId,
      rolloutPace: buildSelection.doctrine,
      networkPlacements: buildSelection.placements.map(placement => ({ ...placement })),
      subscriptionPrices: {
        BASIC: pricingSelection.price.BASIC,
        PREMIUM: pricingSelection.price.STANDARD,
        FAMILY: pricingSelection.price.PREMIUM,
      },
    } as const;
  };

  const commitCinematicBuild = () => {
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available, so no money was moved.' } as const;
    const draft = canonicalInfrastructureDraft();
    const withDraft = saveStreamingInfrastructureDraft(player, draft);
    const rehearsed = runStreamingInfrastructureLoadTest(withDraft, draft);
    const testedDraft = rehearsed.player.ownedStreamingPlatform.infrastructureSetupDraft || {
      ...draft,
      lastLoadTestSignature: rehearsed.forecast.configurationSignature,
    };
    const committed = commitStreamingInfrastructureSetup(rehearsed.player, testedDraft);
    if (!committed.changed && committed.reason !== 'ALREADY_CONFIGURED') {
      setCompanyFeedback(committed.issues[0]?.message || 'The company could not commission this build.');
      return {
        ok: false,
        message: committed.issues[0]?.message || 'The company could not commission this build.',
      } as const;
    }
    const committedPlayer = committed.changed ? committed.player : rehearsed.player;
    buildCommittedPlayerRef.current = committedPlayer;
    persist(committedPlayer);
    const setup = committedPlayer.ownedStreamingPlatform.infrastructureSetup;
    const absoluteWeek = getAbsoluteWeek(committedPlayer.age, committedPlayer.currentWeek);
    const weeksRemaining = Math.max(0, (setup?.readyAtAbsoluteWeek || absoluteWeek) - absoluteWeek);
    const networkLabel = `${draft.networkPlacements.length} ${draft.networkPlacements.length === 1 ? 'city' : 'cities'} and ${buildDerived.racks} racks`;
    const message = weeksRemaining > 0
      ? `${networkLabel} commissioned. The network becomes operational in ${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'}.`
      : `${networkLabel} commissioned and operational.`;
    setCompanyFeedback(message);
    return { ok: true, message, next: 'BACK' as const };
  };

  const persistPricingBlueprint = (selection: StreamingPricingSelection) => {
    setPricingSelection(selection);
    if (!onUpdatePlayer || platform.lifecycle !== 'FOUNDING') return;
    const draft = canonicalInfrastructureDraft();
    persist(saveStreamingInfrastructureDraft(player, {
      ...draft,
      subscriptionPrices: {
        BASIC: selection.price.BASIC,
        PREMIUM: selection.price.STANDARD,
        FAMILY: selection.price.PREMIUM,
      },
    }));
  };

  const signCinematicRaise = (raise: StreamingRaise) => {
    if (!onUpdatePlayer) return;
    const result = commitStreamingRaise(player, raise);
    if (!result.changed) {
      setCompanyFeedback(
        result.reason === 'INSUFFICIENT_CASH'
          ? 'Your personal account cannot cover that contribution.'
          : result.reason === 'CONTROL_LIMIT'
            ? 'Those terms would cross the company control guardrail.'
            : 'The financing terms could not be committed.',
      );
      return;
    }
    persist(result.player);
    setCompanyFeedback(`${raise.kind === 'DEBT' ? 'Bank facility' : raise.kind === 'EQUITY' ? 'Equity round' : 'Founder contribution'} committed to the real company ledger.`);
  };

  const commitCinematicLaunch = () => {
    const launchPlayer = buildCommittedPlayerRef.current || player;
    const launchPlatform = launchPlayer.ownedStreamingPlatform;
    if (launchPlatform.launchCommit) {
      return { ok: true } as const;
    }
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available.' } as const;
    const result = commitOwnedStreamingLaunch(launchPlayer, 'STANDARD');
    if (!result.changed) {
      const message = result.reason === 'BLOCKED'
        ? 'Opening night is still blocked. Complete the highlighted readiness items.'
        : result.reason === 'INSUFFICIENT_TREASURY'
          ? 'Company treasury cannot fund opening night.'
          : 'Opening night is not ready.';
      setCompanyFeedback(message);
      return { ok: false, message } as const;
    }
    buildCommittedPlayerRef.current = null;
    persist(result.player);
    return { ok: true } as const;
  };

  const openCinematicPremiere = () => setShowCinematicPremiere(true);

  const contributeCapital = () => {
    if (!onUpdatePlayer) return;
    const result = contributeStreamingFounderCapital(
      player,
      capitalAmount,
      `hq-${(platform.finance.capitalActions || []).length + 1}-${capitalAmount}`,
    );
    if (!result.changed) {
      setCompanyFeedback(result.reason === 'INSUFFICIENT_CASH'
        ? 'Your personal cash cannot cover that contribution.'
        : result.reason === 'INVALID_AMOUNT'
          ? 'Choose a positive contribution amount.'
          : 'That capital action could not be completed.');
      return;
    }
    setCompanyFeedback(`${formatMoney(result.amount)} moved into the company treasury. Ownership and debt are unchanged.`);
    onUpdatePlayer(result.player);
  };

  const selectSection = (section: StreamingHqSection) => {
    setActiveSection(section);
    persist(visitStreamingHqSection(player, section));
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startTour = () => {
    setShowWelcome(false);
    setShowTourComplete(false);
    setActiveSection('HOME');
    persist(beginStreamingHqTour(player));
  };

  const skipTour = () => {
    setShowWelcome(false);
    persist(skipStreamingHqTour(player));
  };

  const replayTour = () => {
    setActiveSection('HOME');
    setShowTourComplete(false);
    persist(replayStreamingHqTour(player));
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const nextTourStep = () => {
    const currentStep = onboarding.currentStep;
    const nextStep = currentStep + 1;
    persist(advanceStreamingHqTour(player));
    if (nextStep >= STREAMING_HQ_TOUR_STEPS.length) {
      setShowTourComplete(true);
      return;
    }
    setActiveSection(STREAMING_HQ_TOUR_STEPS[nextStep].section);
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const closeInfrastructureSetup = () => {
    setShowInfrastructureSetup(false);
    window.requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const closeCatalogSetup = () => {
    setShowCatalogSetup(false);
    window.requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const finishFoundingReveal = (status: 'VIEWED' | 'DISMISSED') => {
    setShowFoundingReveal(false);
    setReplayingReveal(false);
    if (pendingFoundingReveal && !replayingReveal) {
      persist({
        ...player,
        ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
          platform,
          pendingFoundingReveal.id,
          status,
        ),
      });
    }
    if (onboarding.status === 'NOT_STARTED') setShowWelcome(true);
  };

  const finishOriginalReveal = (status: 'VIEWED' | 'DISMISSED') => {
    setShowOriginalReveal(false);
    if (!pendingOriginalReveal) return;
    persist({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        platform,
        pendingOriginalReveal.id,
        status,
      ),
    });
  };

  const finishPremiereNight = (status: 'VIEWED' | 'DISMISSED' = 'VIEWED') => {
    setShowCinematicPremiere(false);
    if (!pendingLaunchReveal) return;
    persist({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        platform,
        pendingLaunchReveal.id,
        status,
      ),
    });
  };

  const renderTourCoach = () => {
    if (onboarding.status !== 'IN_PROGRESS') return null;
    const tourStep = STREAMING_HQ_TOUR_STEPS[onboarding.currentStep];
    if (!tourStep || tourStep.section !== activeSection) return null;
    const isLast = onboarding.currentStep === STREAMING_HQ_TOUR_STEPS.length - 1;
    return (
      <aside className="hq-tour-coach" aria-label={`HQ orientation: ${tourStep.title}`}>
        <div className="hq-tour-track" aria-hidden="true">
          {STREAMING_HQ_TOUR_STEPS.map((step, index) => (
            <span key={step.section} className={index <= onboarding.currentStep ? 'is-filled' : ''} />
          ))}
        </div>
        <span className="hq-eyebrow">{tourStep.kicker}</span>
        <h2>{tourStep.title}</h2>
        <p>{tourStep.description}</p>
        <div className="hq-tour-focus"><CircleDot size={15} /> {tourStep.focus}</div>
        <div className="hq-tour-actions">
          <button type="button" className="hq-text-button" onClick={skipTour}>Skip tour</button>
          <button type="button" className="hq-primary-button is-compact" onClick={nextTourStep}>
            {isLast ? 'Finish tour' : 'Next area'} <ChevronRight size={17} />
          </button>
        </div>
      </aside>
    );
  };

  const renderAnalyticsLauncher = () => (
    <section className="hq-analytics-launcher">
      <span aria-hidden="true"><BarChart3 size={23} /></span>
      <div>
        <span>PHASE 12 • PLATFORM ANALYTICS</span>
        <h2>Open the intelligence floor.</h2>
        <p>Start with CEO conclusions, then trace subscribers, cohorts, churn, finance, capacity, incidents, world share and content gaps back to committed company facts.</p>
      </div>
      <button type="button" onClick={() => setShowAnalyticsCenter(true)}>
        Enter Analytics Center <ChevronRight size={17} />
      </button>
    </section>
  );

  const renderTitleDossierLauncher = () => (
    <section className="hq-analytics-launcher is-title-dossier">
      <span aria-hidden="true"><Film size={23} /></span>
      <div>
        <span>PHASE 13 • TITLE INTELLIGENCE</span>
        <h2>Open the title performance vault.</h2>
        <p>Move from the platform headline into complete dossiers for audience, engagement, discovery, financial contribution, playback quality and future signals.</p>
      </div>
      <button type="button" onClick={() => {
        setTitleDossierInitialProjectId(null);
        setShowTitleDossier(true);
      }}>
        View Title Dossiers <ChevronRight size={17} />
      </button>
    </section>
  );

  const openPromotionWarRoom = (projectId?: string | null) => {
    setPromotionInitialProjectId(projectId || null);
    setShowPromotionWarRoom(true);
  };

  const renderPromotionLauncher = () => (
    <section className="hq-analytics-launcher is-growth-war-room">
      <span aria-hidden="true"><TrendingUp size={23} /></span>
      <div>
        <span>PHASE 14 • GROWTH WAR ROOM</span>
        <h2>Shape the next week of discovery.</h2>
        <p>Control homepage placement, trailer, billboard, social and regional reach, recommendation priorities and artwork tests—then audit what actually changed.</p>
      </div>
      <button type="button" onClick={() => openPromotionWarRoom()}>
        Enter Growth War Room <ChevronRight size={17} />
      </button>
    </section>
  );

  const renderOperationsOffice = () => {
    const nextItem = snapshot.checklist.find(item => !item.complete);
    return (
      <>
        {renderTourCoach()}
        <StreamingVisualScene
          sceneId={snapshot.infrastructureConfigured ? 'commandDeck' : 'level0Hq'}
          className="hq-scene hq-command-scene"
          imageLoading="eager"
          eyebrow={snapshot.infrastructureConfigured ? 'PLATFORM COMMAND DECK' : 'LEVEL 0 • FOUNDER HQ'}
          title={snapshot.infrastructureConfigured ? 'Run the service people return to.' : 'The company exists. The signal does not.'}
          description={snapshot.infrastructureConfigured
            ? snapshot.brandPromiseDescription
            : 'This room begins empty by design. Build capacity, secure content and turn a legal company into a working platform.'}
          status={{
            label: snapshot.statusLabel,
            detail: `${snapshot.completedChecklistItems}/${snapshot.checklist.length} opening systems`,
            tone: snapshot.statusLabel === 'LIVE' ? 'success' : snapshot.statusLabel === 'SUSPENDED' ? 'critical' : 'warning',
          }}
          hotspots={[
            { id: 'CONTENT', label: 'Content Studio', status: platform.starterCatalog ? `${snapshot.catalogCount} titles` : 'Catalog empty', x: 25, y: 39, desktopX: 25, desktopY: 21, tone: platform.starterCatalog ? 'success' : 'active', icon: <Clapperboard size={16} /> },
            { id: 'TECH', label: 'Network Systems', status: snapshot.infrastructureConfigured ? snapshot.loadTestStatus || 'Configured' : 'No capacity', x: 74, y: 38, desktopX: 74, desktopY: 31, tone: snapshot.infrastructureConfigured ? 'success' : 'warning', icon: <Server size={16} /> },
            { id: 'MARKET', label: 'Market Room', status: snapshot.marketShareLabel, x: 50, y: 17, desktopX: 50, desktopY: 14, tone: 'neutral', icon: <Globe2 size={16} /> },
            { id: 'COMPANY', label: 'Company Office', status: formatMoney(snapshot.treasuryCash), x: 86, y: 23, desktopX: 87, desktopY: 22, tone: 'active', icon: <Building2 size={16} /> },
          ]}
          onHotspotSelect={hotspot => selectSection(hotspot.id as StreamingHqSection)}
        >
          <div className="hq-scene-actions">
            <div className="hq-hero-tags">
              <span>{snapshot.reachLabel}</span>
              <span>{snapshot.brandPromiseLabel}</span>
            </div>
            <button type="button" className="hq-viewer-launch" onClick={() => setShowViewerMode(true)}>
              <Eye size={17} /> Open Viewer Mode
            </button>
          </div>
        </StreamingVisualScene>

        <section className="hq-section-block">
          <div className="hq-section-heading">
            <div><span className="hq-eyebrow">LIVE COMPANY SIGNALS</span><h2>Executive pulse</h2></div>
            <span className="hq-derived-label"><BadgeCheck size={14} /> Company records</span>
          </div>
          <div className="hq-signal-grid">
            <article><Banknote size={18} /><span>Treasury</span><strong>{formatMoney(snapshot.treasuryCash)}</strong><small>Available company cash</small></article>
            <article><Crown size={18} /><span>Ownership</span><strong>{snapshot.founderOwnershipPercent}%</strong><small>Founder-controlled</small></article>
            <article><UsersRound size={18} /><span>Subscribers</span><strong className="is-textual">{snapshot.subscriberLabel}</strong><small>No invented pre-launch audience</small></article>
            <article>
              <Gauge size={18} />
              <span>Platform health</span>
              <strong className="is-textual">{Math.round(latestWeeklySnapshot?.technologyHealth ?? snapshot.technologyReadiness)}%</strong>
              <small>{latestWeeklySnapshot ? 'Latest weekly delivery health' : snapshot.technologyReadiness === 0 ? 'Level 0 foundation' : 'Across eight systems'}</small>
            </article>
          </div>
        </section>

        <section className="hq-ceo-brief">
          <div className="hq-section-heading">
            <div><span className="hq-eyebrow">CEO BRIEF</span><h2>What matters now</h2></div>
            <span className="hq-brief-number">01</span>
          </div>
          <div className="hq-priority-card">
            <div className="hq-priority-icon"><Server size={21} /></div>
            <div>
              <span>OPENING PRIORITY</span>
              <h3>{nextItem?.title || 'Maintain launch momentum'}</h3>
              <p>{nextItem?.description || 'The operating plan is ready for its next checkpoint.'}</p>
            </div>
            {nextItem ? (
              <button type="button" onClick={() => selectSection(nextItem.destination)} aria-label={`Open ${nextItem.title}`}>
                <ChevronRight size={20} />
              </button>
            ) : null}
          </div>
          <div className="hq-brief-strip">
            <div><span>Capital position</span><strong>{snapshot.capitalModelLabel}</strong></div>
            <div><span>Technical mandate</span><strong>{snapshot.infrastructureLabel}</strong></div>
          </div>
        </section>

        {!platform.launchCommit ? (
          <section className="hq-launch-command-callout">
            <div className="hq-launch-callout-signal" aria-hidden="true"><Rocket size={27} /></div>
            <div>
              <span className="hq-eyebrow">PHASE 8 • LAUNCH COMMAND</span>
              <h2>{platform.launchSlate ? 'Final Command is standing by.' : 'See what stands between you and launch.'}</h2>
              <p>{platform.launchSlate
                ? 'Run the go/no-go forecast, resolve real blockers, choose emergency capacity and commit premiere night.'
                : 'Open the live readiness board at any time. Every blocker deep-links to the room where it can be fixed.'}</p>
            </div>
            <button type="button" onClick={openCinematicPremiere}>
              {platform.launchSlate ? 'Enter Launch Command' : 'Open readiness forecast'} <ChevronRight size={18} />
            </button>
          </section>
        ) : platform.launchCommit ? (
          <section className="hq-launch-live-card">
            <span className="hq-launch-live-icon"><RadioTower size={23} /></span>
            <div>
              <span className="hq-eyebrow">PLATFORM LIVE</span>
              <h2>{platform.launchCommit.openingOriginalTitle} opened the signal.</h2>
              <p>{platform.launchCommit.initialSubscribers.toLocaleString()} committed opening subscribers • {platform.launchCommit.playbackSuccessRate.toFixed(2)}% playback success.</p>
            </div>
            <button type="button" onClick={() => setShowCinematicPremiere(true)}><Play size={16} /> Replay premiere</button>
          </section>
        ) : null}

        {platform.launchCommit ? (
          <StreamingWeeklyCeoLoop
            player={player}
            onUpdatePlayer={persist}
            onReturnToGame={onReturnToGame || onBack}
          />
        ) : null}

        {platform.launchCommit ? (
          <StreamingQuarterSeasonCycle
            player={player}
            onUpdatePlayer={persist}
          />
        ) : null}

        {platform.launchCommit ? renderAnalyticsLauncher() : null}

        {platform.launchCommit ? (
          <StreamingLaunchAftermathPanel
            player={player}
            onOpenViewer={() => setShowViewerMode(true)}
            onNavigate={selectSection}
          />
        ) : null}

        <section className="hq-section-block hq-checklist">
          <div className="hq-section-heading">
            <div><span className="hq-eyebrow">OPENING RUNWAY</span><h2>Launch checklist</h2></div>
            <strong>{snapshot.completedChecklistItems}/{snapshot.checklist.length}</strong>
          </div>
          <div className="hq-progress" aria-label={`${snapshot.completedChecklistItems} of ${snapshot.checklist.length} launch tasks complete`}>
            <span style={{ width: `${(snapshot.completedChecklistItems / snapshot.checklist.length) * 100}%` }} />
          </div>
          <div className="hq-checklist-list">
            {snapshot.checklist.map(item => (
              <button
                type="button"
                key={item.id}
                className={item.complete ? 'is-complete' : ''}
                onClick={() => item.id === 'LAUNCH_READY'
                  ? openCinematicPremiere()
                  : selectSection(item.destination)}
              >
                <span className="hq-check-icon">{item.complete ? <Check size={15} /> : <span />}</span>
                <span><strong>{item.title}</strong><small>{item.description}</small></span>
                {!item.complete ? <FutureBadge phase={item.phase} /> : <ChevronRight size={17} />}
              </button>
            ))}
          </div>
        </section>
      </>
    );
  };

  const openCommandDivision = (division: StreamingCommandDivisionId, chip?: string) => {
    if (division === 'CONTENT') {
      if (chip === 'RIGHTS') return setShowRightsExchange(true);
      if (chip === 'ORIGINALS') return setShowOriginalsStudio(true);
      if (chip === 'SLATE') return setShowSlatePlanner(true);
      return selectSection('CONTENT');
    }
    if (division === 'NETWORK') {
      if (chip === 'INFRA') return setShowCinematicBuild(true);
      if (chip === 'TECH') return setShowTechnologyCampus(true);
      if (chip === 'PRODUCTS') return setShowProductLab(true);
      if (chip === 'INCIDENTS' && incidentCommand.available) return setShowIncidentCommand(true);
      return selectSection('TECH');
    }
    if (division === 'AUDIENCE') {
      if (chip === 'ANALYTICS') return selectSection('MARKET');
      if (chip === 'GROWTH') return openPromotionWarRoom();
      if (chip === 'WARS') return setShowPlatformWars(true);
      if (chip === 'ACQUISITIONS') return setShowAcquisitionCommand(true);
      return selectSection('MARKET');
    }
    if (chip === 'LEADERSHIP') return setShowLeadershipSuite(true);
    if (chip === 'MARKETS') return setShowPublicMarkets(true);
    if (chip === 'FINANCE') return setShowCinematicRaise(true);
    if (chip === 'OPERATIONS') return setShowOperationsOffice(true);
    if (chip === 'LEGACY') return setShowLegacyOffice(true);
    return selectSection('COMPANY');
  };

  const openCommandEvent = (event: StreamingCommandEvent) => {
    if (event.id === 'INCIDENT' && incidentCommand.available) return setShowIncidentCommand(true);
    if (event.id === 'LAUNCH') return platform.infrastructureSetup
      ? openCinematicPremiere()
      : setShowCinematicBuild(true);
    if (event.id === 'RIVAL') return setShowPlatformWars(true);
    setShowOperationsOffice(true);
  };

  const renderHome = () => (
    <StreamingPlatformCommandDeck
      brand={commandDeckBrand}
      state={commandDeckState}
      onBack={onBack}
      onCommission={() => platform.starterCatalog ? setShowOriginalCommissioning(true) : setShowCatalogSetup(true)}
      onOpenDivision={openCommandDivision}
      onEvent={openCommandEvent}
      onOpenViewer={() => setShowViewerMode(true)}
      onOpenTitle={title => {
        setTitleDossierInitialProjectId(title.id);
        setShowTitleDossier(true);
      }}
      onSeeAll={() => selectSection('CONTENT')}
      onLaunch={() => platform.infrastructureSetup ? openCinematicPremiere() : setShowCinematicBuild(true)}
    />
  );

  const renderContent = () => {
    const starterCatalog = platform.starterCatalog;
    const firstOriginal = platform.originalCommissions[0];
    const originalStatus = firstOriginal ? getStreamingOriginalLiveStatus(player, firstOriginal) : null;
    const launchSlate = platform.launchSlate;
    const packageDefinition = STREAMING_STARTER_CATALOG_PACKAGES.find(item => item.id === starterCatalog?.packageId);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const catalogTitles = platform.catalogProjectIds
      .map(projectId => resolveStreamingCatalogTitle(player, projectId))
      .filter((title): title is NonNullable<typeof title> => Boolean(title));
    const activeLicenses = platform.catalogLicenses.map(license => ({
      ...license,
      liveStatus: getStreamingCatalogLicenseStatus(license, absoluteWeek),
    }));
    return (
      <>
      {renderTourCoach()}
      <StreamingVisualScene
        sceneId="contentStudio"
        className="hq-scene hq-room-scene"
        eyebrow="CONTENT STUDIO"
        title="Program what the audience sees next."
        description="Rights, Originals and release rhythm meet in one physical room."
        status={{
          label: starterCatalog ? 'Library connected' : 'Empty shelves',
          detail: starterCatalog ? `${catalogTitles.length} canonical titles` : 'Opening catalog required',
          tone: starterCatalog ? 'success' : 'warning',
        }}
        hotspots={[
          { id: 'catalog', label: 'Rights Library', status: starterCatalog ? `${catalogTitles.length} titles` : platform.infrastructureSetup ? 'Build catalog' : 'Build network first', x: 21, y: 44, tone: starterCatalog ? 'success' : 'active', disabled: !platform.infrastructureSetup, icon: <LibraryBig size={16} /> },
          { id: 'original', label: 'Originals Desk', status: firstOriginal?.title || (starterCatalog ? 'Commission Original' : 'Catalog required'), x: 52, y: 32, tone: firstOriginal ? 'success' : 'active', disabled: !starterCatalog, icon: <Sparkles size={16} /> },
          { id: 'slate', label: 'Programming Wall', status: launchSlate ? `${launchSlate.entries.length} scheduled` : firstOriginal?.canonicalProjectId ? 'Program slate' : 'Greenlight required', x: 79, y: 40, tone: launchSlate ? 'success' : 'neutral', disabled: !firstOriginal?.canonicalProjectId, icon: <Layers3 size={16} /> },
        ]}
        onHotspotSelect={hotspot => {
          if (hotspot.id === 'catalog') starterCatalog ? setShowRightsExchange(true) : setShowCatalogSetup(true);
          if (hotspot.id === 'original') setShowOriginalsStudio(true);
          if (hotspot.id === 'slate' && firstOriginal?.canonicalProjectId) setShowSlatePlanner(true);
        }}
      />
      <header className="hq-page-heading">
        <span className="hq-eyebrow">PROGRAMMING & RIGHTS</span>
        <h1>Content Room</h1>
        <p>Build the library, Originals pipeline and release rhythm viewers will recognize.</p>
      </header>
      {!starterCatalog ? (
        <section className="hq-setup-callout hq-catalog-callout">
          <div className="hq-setup-signal"><LibraryBig size={26} /></div>
          <span className="hq-eyebrow">PHASE 6 • CATALOG OPENING</span>
          <h2>Give viewers a reason to enter.</h2>
          <p>Link released titles from production houses you control, choose the opening library thesis, then negotiate one external streaming license with a real territory, term, split and expiry.</p>
          <div className="hq-setup-preview">
            <span><Film size={15} /> Owned library</span>
            <span><Globe2 size={15} /> Rights window</span>
            <span><Banknote size={15} /> Negotiated split</span>
          </div>
          <button
            type="button"
            className="hq-primary-button"
            disabled={!platform.infrastructureSetup}
            onClick={() => setShowCatalogSetup(true)}
          >
            {platform.catalogSetupDraft ? 'Resume catalog setup' : 'Build starter catalog'} <ChevronRight size={18} />
          </button>
          <small>{platform.infrastructureSetup ? 'Owned imports create no internal profit. The signed guarantee is paid from platform treasury.' : 'Configure the launch stack in Technology before opening the catalog.'}</small>
        </section>
      ) : (
        <>
          <section className="hq-catalog-hero">
            <span className="hq-eyebrow">OPENING LIBRARY • ESTABLISHED</span>
            <h2>{packageDefinition?.title || 'Starter Catalog'}</h2>
            <p>{packageDefinition?.description}</p>
            <div>
              <span><strong>{catalogTitles.length}</strong> linked titles</span>
              <span><strong>{starterCatalog.ownedProjectIds.length}</strong> owned</span>
              <span><strong>{starterCatalog.licensedProjectIds.length}</strong> licensed</span>
            </div>
          </section>
          <section className="hq-section-block">
            <div className="hq-section-heading">
              <div><span className="hq-eyebrow">NOW IN CATALOG</span><h2>Canonical title links</h2></div>
              <span className="hq-derived-label"><BadgeCheck size={14} /> Source records</span>
            </div>
            <div className="hq-catalog-grid">
              {catalogTitles.map(title => (
                <article key={title.id}>
                  <div><Film size={20} /></div>
                  <span>{title.source === 'OWNED_LIBRARY' ? 'OWNED LIBRARY' : 'LICENSED WINDOW'}</span>
                  <h3>{title.title}</h3>
                  <p>{title.projectType === 'SERIES' ? 'Series' : 'Movie'} • {title.genre}</p>
                </article>
              ))}
            </div>
          </section>
          <section className="hq-section-block">
            <div className="hq-section-heading">
              <div><span className="hq-eyebrow">RIGHTS LEDGER</span><h2>Active agreements</h2></div>
              <button type="button" className="hq-primary-button" onClick={() => setShowRightsExchange(true)}>
                Open Rights Exchange <ChevronRight size={16} />
              </button>
            </div>
            <div className="hq-license-list">
              {activeLicenses.map(license => (
                <article key={license.id}>
                  <div>
                    <span className={`hq-license-status is-${license.liveStatus.toLowerCase()}`}>{license.liveStatus}</span>
                    <h3>{license.titleAtSigning}</h3>
                    <p>{STREAMING_LICENSE_TERRITORIES.find(item => item.id === license.territory)?.title} • {license.exclusivity === 'EXCLUSIVE' ? 'Exclusive' : 'Non-exclusive'} • {license.durationWeeks} weeks</p>
                  </div>
                  <dl>
                    <div><dt>Platform split</dt><dd>{license.platformRevenueShare}%</dd></div>
                    <div><dt>Expires</dt><dd>Week {license.expiresAtAbsoluteWeek.toLocaleString()}</dd></div>
                  </dl>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      {starterCatalog && (
        <section className="hq-original-command">
          <div className="hq-original-signal"><Sparkles size={24} /></div>
          <div>
            <span className="hq-eyebrow">PLATFORM ORIGINAL</span>
            {firstOriginal ? (
              <>
                <h2>{firstOriginal.title}</h2>
                <p><strong>{firstOriginal.commissionedByPlatformName}</strong> commissions and distributes. <strong>{firstOriginal.producerStudioName}</strong> physically produces.</p>
                <div className="hq-original-meta">
                  <span>{firstOriginal.projectType === 'SERIES' ? `${firstOriginal.episodes} episode series` : 'Feature film'}</span>
                  <span>{firstOriginal.genre.replace('_', ' ')}</span>
                  <span>{originalStatus?.replaceAll('_', ' ')}</span>
                </div>
              </>
            ) : (
              <>
                <h2>Commission the opening statement.</h2>
                <p>Read the audience gap, write the mandate, select the production house and carry one canonical project into Greenlight.</p>
              </>
            )}
          </div>
          <button type="button" onClick={() => setShowOriginalsStudio(true)}>
            {firstOriginal ? 'Enter Originals Studio' : 'Open Pitch Room'} <ChevronRight size={17} />
          </button>
        </section>
      )}
      {firstOriginal?.canonicalProjectId && (
        <section className="hq-slate-command">
          <div>
            <span className="hq-eyebrow">TWELVE-WEEK PROGRAMMING</span>
            <h2>{launchSlate ? `Launch slate • Revision ${launchSlate.revision}` : 'Build the opening rhythm.'}</h2>
            <p>{launchSlate
              ? `${launchSlate.entries.length} canonical titles are programmed with release patterns and marketing beats.`
              : 'Place catalog titles and the first Original across twelve launch weeks, then resolve content-gap warnings.'}</p>
          </div>
          {launchSlate && (
            <div className="hq-mini-timeline" aria-label="Programmed launch weeks">
              {Array.from({ length: 12 }, (_, index) => index + 1).map(week => (
                <span key={week} className={launchSlate.entries.some(entry => entry.launchWeek === week) ? 'has-title' : ''}>{week}</span>
              ))}
            </div>
          )}
          <button type="button" onClick={() => setShowSlatePlanner(true)}>
            {launchSlate ? 'Review slate' : 'Program slate'} <ChevronRight size={17} />
          </button>
        </section>
      )}
      <section className="hq-readiness-stack">
        <article><div><Film size={20} /><span>Licensed catalog</span></div><strong>{starterCatalog ? 'Opening package secured' : 'Not started'}</strong>{starterCatalog ? <BadgeCheck size={16} /> : <FutureBadge phase={6} />}</article>
        <article><div><Clapperboard size={20} /><span>Platform Originals</span></div><strong>{firstOriginal ? `${firstOriginal.title} • ${originalStatus?.replaceAll('_', ' ')}` : 'Not commissioned'}</strong>{firstOriginal?.canonicalProjectId ? <BadgeCheck size={16} /> : <FutureBadge phase={7} />}</article>
        <article><div><Layers3 size={20} /><span>Twelve-week slate</span></div><strong>{launchSlate ? `${launchSlate.entries.length} titles programmed` : 'Not programmed'}</strong>{launchSlate ? <BadgeCheck size={16} /> : <FutureBadge phase={7} />}</article>
      </section>
      {platform.launchCommit && launchSlate ? renderTitleDossierLauncher() : null}
      <aside className="hq-truth-note"><BadgeCheck size={18} /><div><strong>One title, one record</strong><p>Movies and shows stay in the game’s existing project system. HQ stores references, preventing duplicate budgets, casts or results.</p></div></aside>
      </>
    );
  };

  const renderTech = () => (
    <>
      {renderTourCoach()}
      <StreamingVisualScene
        sceneId="noc"
        className="hq-scene hq-room-scene"
        eyebrow="NETWORK OPERATIONS CENTRE"
        title={snapshot.infrastructureConfigured ? 'Watch every stream breathe.' : 'Give the platform somewhere to run.'}
        description={snapshot.infrastructureConfigured
          ? `${snapshot.capacityLabel} normal capacity with ${snapshot.burstCapacityLabel} at peak.`
          : 'Choose a real architecture, capacity package and rollout pace—then prove it under load.'}
        status={{
          label: snapshot.infrastructureConfigured ? snapshot.infrastructureDeploymentLabel : 'Level 0',
          detail: snapshot.loadTestStatus ? `Load test ${snapshot.loadTestStatus}` : 'No delivery stack',
          tone: snapshot.loadTestStatus === 'PASS' ? 'success' : snapshot.loadTestStatus === 'FAIL' ? 'critical' : 'warning',
        }}
        hotspots={[
          { id: 'capacity', label: 'Capacity Floor', status: snapshot.capacityLabel, x: 22, y: 43, tone: snapshot.infrastructureConfigured ? 'success' : 'warning', icon: <RadioTower size={16} /> },
          { id: 'reliability', label: 'Reliability Wall', status: snapshot.reliabilityLabel, x: 51, y: 28, tone: snapshot.loadTestStatus === 'PASS' ? 'success' : 'active', icon: <ShieldCheck size={16} /> },
          { id: 'technology', label: 'Technology Bench', status: snapshot.technologyReadiness === 0 ? 'Level 0 foundation' : `${snapshot.technologyReadiness}% readiness`, x: 79, y: 45, tone: 'active', icon: <Sparkles size={16} /> },
          { id: 'product', label: 'Product Lab', status: productSuite.activeDevelopment ? 'Development active' : `${productSuite.activeProductIds.length} products`, x: 67, y: 68, tone: productSuite.available ? 'active' : 'neutral', icon: <Eye size={16} /> },
          { id: 'incident', label: 'Incident Command', status: incidentCommand.activeCrisis ? `${incidentCommand.activeCrisis.severity} incident` : `${incidentCommand.publicTrust.toFixed(0)} trust`, x: 35, y: 67, tone: incidentCommand.activeCrisis ? 'critical' : incidentCommand.available ? 'success' : 'neutral', icon: <Siren size={16} /> },
        ]}
        onHotspotSelect={hotspot => {
          if (hotspot.id === 'incident') {
            if (incidentCommand.available) setShowIncidentCommand(true);
            return;
          }
          if (hotspot.id === 'product') {
            setShowProductLab(true);
            return;
          }
          if (hotspot.id === 'technology' && technologyCampus.available) {
            setShowTechnologyCampus(true);
            return;
          }
          setShowInfrastructureSetup(true);
        }}
      />
      <header className="hq-page-heading">
        <span className="hq-eyebrow">PLATFORM ENGINEERING</span>
        <h1>Technology Campus</h1>
        <p>Buy real delivery capacity, improve reliability and grow the platform beyond Level 0.</p>
      </header>
      <section className="hq-tech-mandate">
        <div className="hq-tech-orbit" aria-hidden="true"><Server size={25} /></div>
        <div>
          <span>{snapshot.infrastructureConfigured ? 'APPROVED DELIVERY STACK' : 'LEVEL 0 FOUNDATION'}</span>
          <h2>{snapshot.infrastructureLabel}</h2>
          <p>{snapshot.infrastructureConfigured ? snapshot.infrastructureDeploymentLabel : 'Capacity and plans need CEO approval.'}</p>
        </div>
        {snapshot.infrastructureConfigured && snapshot.loadTestStatus ? (
          <span className={`hq-load-status is-${snapshot.loadTestStatus.toLowerCase()}`}>{snapshot.loadTestStatus}</span>
        ) : <FutureBadge phase={5} />}
      </section>
      {snapshot.infrastructureConfigured ? (
        <section className="hq-infrastructure-console">
          <div className="hq-section-heading">
            <div><span className="hq-eyebrow">OPERATING CAPACITY</span><h2>Launch stack</h2></div>
            <span className="hq-derived-label">{snapshot.infrastructureDeploymentLabel}</span>
          </div>
          <div className="hq-infrastructure-metrics">
            <article><RadioTower size={18} /><span>Normal capacity</span><strong>{snapshot.capacityLabel}</strong></article>
            <article><Gauge size={18} /><span>Burst capacity</span><strong>{snapshot.burstCapacityLabel}</strong></article>
            <article><Layers3 size={18} /><span>Storage</span><strong>{snapshot.storageLabel}</strong></article>
            <article><ShieldCheck size={18} /><span>Reliability</span><strong>{snapshot.reliabilityLabel}</strong></article>
          </div>
          <div className="hq-stack-footer">
            <span>Weekly operating cost <strong>{snapshot.infrastructureWeeklyCost === null ? 'Pending' : formatMoney(snapshot.infrastructureWeeklyCost)}</strong></span>
            <button type="button" onClick={() => setShowInfrastructureSetup(true)}>Review & revise <ChevronRight size={16} /></button>
          </div>
        </section>
      ) : (
        <section className="hq-setup-callout">
          <div className="hq-setup-signal"><RadioTower size={26} /></div>
          <span className="hq-eyebrow">PHASE 5 • LAUNCH STACK</span>
          <h2>Give the platform somewhere to run.</h2>
          <p>Compare cloud, owned and hybrid infrastructure; choose capacity and rollout risk; pressure-test launch demand; then price Basic, Premium and Family.</p>
          <div className="hq-setup-preview">
            <span><Server size={15} /> Capacity</span>
            <span><ShieldCheck size={15} /> Reliability</span>
            <span><WalletCards size={15} /> Subscription plans</span>
          </div>
          <button type="button" className="hq-primary-button" onClick={() => setShowInfrastructureSetup(true)}>
            {platform.infrastructureSetupDraft ? 'Resume launch-stack setup' : 'Configure launch stack'} <ChevronRight size={18} />
          </button>
          <small>Nothing is charged until final CEO approval.</small>
        </section>
      )}
      <section className="hq-section-block">
        <div className="hq-section-heading">
          <div><span className="hq-eyebrow">ENGINEERING CAMPUS</span><h2>Six operating facilities</h2></div>
          <span className="hq-derived-label">{technologyCampus.activeProject ? 'Construction active' : `${technologyCampus.completedProjectCount} projects installed`}</span>
        </div>
        <div className="hq-tech-grid">
          {TECHNOLOGY_BRANCHES.filter(branch => !['ADVERTISING_COMMERCE', 'PRODUCT_EXPERIENCE'].includes(branch.id)).map(branch => {
            const Icon = branch.icon;
            const level = platform.technologyLevels[branch.id];
            return (
              <article key={branch.id}>
                <div className="hq-tech-icon"><Icon size={19} /></div>
                <div><strong>{branch.label}</strong><span>{branch.description}</span></div>
                <small>{level > 0 ? `Level ${level}` : 'Level 0'}</small>
              </article>
            );
          })}
        </div>
        <button
          type="button"
          className="hq-primary-button"
          disabled={!technologyCampus.available || !onUpdatePlayer}
          onClick={() => setShowTechnologyCampus(true)}
        >
          {technologyCampus.activeProject ? 'Enter construction bay' : technologyCampus.available ? 'Enter Technology Campus' : 'Campus unlocks after platform launch'}
          <ChevronRight size={18} />
        </button>
      </section>
      <section className={`hq-incident-command-launcher ${incidentCommand.activeCrisis ? 'is-live' : ''}`}>
        <div className="hq-incident-command-visual" aria-hidden="true">
          {incidentCommand.activeCrisis ? <Siren size={27} /> : <ShieldCheck size={27} />}
          <span /><i /><i />
        </div>
        <div>
          <span>PHASE 23 • CRISES, SECURITY & SHADOW OPERATIONS</span>
          <h2>{incidentCommand.activeCrisis ? incidentCommand.activeCrisis.title : 'Trust needs its own command room.'}</h2>
          <p>{incidentCommand.activeCrisis
            ? 'Technical recovery, compensation, communications and the permanent company record are waiting for leadership.'
            : 'Run clean defensive operations, monitor public trust and delayed evidence, answer oversight—or enter optional abstract shadow strategy.'}</p>
        </div>
        <dl>
          <div><dt>Public trust</dt><dd>{incidentCommand.publicTrust.toFixed(0)}</dd></div>
          <div><dt>Evidence trail</dt><dd>{incidentCommand.evidenceTrail.toFixed(0)}</dd></div>
          <div><dt>Oversight</dt><dd>{incidentCommand.openRegulatoryCaseCount + incidentCommand.openWhistleblowerCount}</dd></div>
        </dl>
        <button type="button" disabled={!incidentCommand.available || !onUpdatePlayer} onClick={() => setShowIncidentCommand(true)}>
          {incidentCommand.activeCrisis ? 'Enter live war room' : incidentCommand.available ? 'Enter Incident Command' : 'Opens after platform launch'} <ChevronRight size={17} />
        </button>
      </section>
      <section className="hq-product-lab-launcher">
        <div className="hq-product-lab-visual" aria-hidden="true">
          <span><Eye size={25} /></span>
          <i /><i /><i />
        </div>
        <div className="hq-product-lab-copy">
          <span className="hq-eyebrow">PHASE 18 • PUBLIC PRODUCT SUITE</span>
          <h2>Design what viewers return for.</h2>
          <p>Core, Kids, Free, Live, Fan, Store and Interactive compete for the same treasury, product staff and peak capacity.</p>
          <div>
            {productSuite.lines.map(line => (
              <span key={line.definition.id} className={`is-${line.status.toLowerCase()}`}>
                {line.definition.shortTitle}
                <small>{line.status === 'CORE_ACTIVE' ? 'CORE' : line.status.replaceAll('_', ' ')}</small>
              </span>
            ))}
          </div>
        </div>
        <aside>
          <span>OPERATING</span>
          <strong>{productSuite.activeProductIds.length}/7</strong>
          <small>+{productSuite.peakLoadPercent.toFixed(1)}% peak load</small>
          <button type="button" disabled={!onUpdatePlayer} onClick={() => setShowProductLab(true)}>
            Enter Product Lab <ChevronRight size={17} />
          </button>
        </aside>
      </section>
      <aside className="hq-next-module">
        {productSuite.available ? <Eye size={20} /> : technologyCampus.available ? <Sparkles size={20} /> : snapshot.infrastructureConfigured ? <LibraryBig size={20} /> : <Server size={20} />}
        <div>
          <strong>{productSuite.available ? 'Technology now has a public consequence' : technologyCampus.available ? 'Technology now advances through construction' : snapshot.infrastructureConfigured ? 'Launch the platform to open the campus' : 'Infrastructure procurement is ready'}</strong>
          <p>{productSuite.available
            ? 'Product Lab converts content and technology into seven operating audience surfaces with real weekly cost, revenue and load.'
            : technologyCampus.available
              ? 'Choose capital, schedule, staff, delivery risk and technical debt across six permanent engineering branches.'
            : snapshot.infrastructureConfigured
              ? 'The launch stack is approved. Technology Campus opens once the platform enters live operations.'
              : 'Capacity, load testing and subscription pricing are available now.'}</p>
        </div>
        {productSuite.available ? <BadgeCheck size={18} /> : technologyCampus.available ? <BadgeCheck size={18} /> : <FutureBadge phase={snapshot.infrastructureConfigured ? 8 : 5} />}
      </aside>
    </>
  );

  const renderMarket = () => (
    <>
      {renderTourCoach()}
      <StreamingVisualScene
        sceneId="marketRoom"
        className="hq-scene hq-room-scene"
        eyebrow="AUDIENCE INTELLIGENCE"
        title="Reach is earned, not selected."
        description="Territories, demand and competition respond to the infrastructure and rights you actually control."
        status={{
          label: snapshot.reachLabel,
          detail: snapshot.statusLabel === 'LIVE' ? snapshot.marketShareLabel : 'Pre-launch research',
          tone: snapshot.statusLabel === 'LIVE' ? 'active' : 'neutral',
        }}
        hotspots={[
          { id: 'reach', label: 'Reach Table', status: snapshot.reachLabel, x: 49, y: 55, tone: 'active', icon: <Globe2 size={16} /> },
          { id: 'audience', label: 'Audience Signals', status: snapshot.subscriberLabel, x: 22, y: 32, tone: snapshot.statusLabel === 'LIVE' ? 'success' : 'neutral', icon: <UsersRound size={16} /> },
          { id: 'competition', label: 'Platform Wars', status: competitiveWorld.openMoves.length ? `${competitiveWorld.openMoves.length} response${competitiveWorld.openMoves.length === 1 ? '' : 's'}` : `${competitiveWorld.rivals.length} CEO rivals`, x: 80, y: 33, tone: competitiveWorld.openMoves.length ? 'critical' : 'active', icon: <Swords size={16} /> },
          { id: 'acquisitions', label: 'Acquisition Command', status: `${platform.corporateDevelopment.acquisitionCases.length} deal files`, x: 66, y: 66, tone: platform.corporateDevelopment.integrations.some(item => item.status === 'IN_PROGRESS') ? 'warning' : 'active', icon: <Building2 size={16} /> },
        ]}
        onHotspotSelect={hotspot => {
          if (hotspot.id === 'competition') {
            setShowPlatformWars(true);
            return;
          }
          if (hotspot.id === 'acquisitions') {
            setShowAcquisitionCommand(true);
            return;
          }
          const targetId = hotspot.id === 'reach' ? 'hq-market-reach' : 'hq-market-signals';
          document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }}
      />
      <header className="hq-page-heading">
        <span className="hq-eyebrow">AUDIENCE & POSITIONING</span>
        <h1>Market Room</h1>
        <p>Read demand, protect the promise and understand where the platform can win.</p>
      </header>
      <section id="hq-market-reach" className="hq-market-position">
        <span>YOUR OPENING POSITION</span>
        <h2>{snapshot.brandPromiseLabel}</h2>
        <p>{snapshot.brandPromiseDescription}</p>
        <div><Compass size={16} /> {snapshot.reachLabel}</div>
      </section>
      <section id="hq-market-signals" className="hq-market-grid">
        <article><TrendingUp size={20} /><span>Market share</span><strong>{snapshot.marketShareLabel}</strong><small>Measured from live outcomes</small></article>
        <article>
          <UsersRound size={20} />
          <span>Audience intelligence</span>
          <strong>{latestWeeklySnapshot
            ? `${latestWeeklySnapshot.netSubscriberMovement >= 0 ? '+' : ''}${latestWeeklySnapshot.netSubscriberMovement.toLocaleString()} net`
            : snapshot.statusLabel === 'LIVE' ? 'First cohort maturing' : 'Pre-launch research'}</strong>
          <small>{latestWeeklySnapshot
            ? `${(latestWeeklySnapshot.churnRate * 100).toFixed(1)}% weekly churn`
            : 'Real cohorts begin after launch'}</small>
        </article>
        <article onClick={() => setShowRightsExchange(true)}><Globe2 size={20} /><span>Rights marketplace</span><strong>{platform.rightsNegotiations.filter(item => ['OPEN', 'COUNTERED', 'READY_TO_SIGN'].includes(item.status)).length} live tables</strong><small>Studio windows, platform trades and sublicensing</small></article>
        <article onClick={() => setShowPlatformWars(true)}><Swords size={20} /><span>Platform Wars</span><strong>{competitiveWorld.openMoves.length ? `${competitiveWorld.openMoves.length} founder response${competitiveWorld.openMoves.length === 1 ? '' : 's'}` : `${competitiveWorld.rivals.length} CEO rivals`}</strong><small>Resource-backed moves, global launches and annual awards</small></article>
        <article onClick={() => setShowAcquisitionCommand(true)}><Building2 size={20} /><span>Acquisition Command</span><strong>{platform.corporateDevelopment.integrations.some(item => item.status === 'IN_PROGRESS') ? `${platform.corporateDevelopment.integrations.filter(item => item.status === 'IN_PROGRESS').length} integration live` : `${platform.corporateDevelopment.acquisitionCases.length} confidential files`}</strong><small>Scout, value, diligence, finance, sign and integrate rival platforms</small></article>
      </section>
      {platform.launchCommit ? renderAnalyticsLauncher() : (
        <EmptyState
          icon={TrendingUp}
          eyebrow="MARKET DATA"
          title="No fake victory graph."
          copy="Market share, subscriber growth and churn appear only after the platform launches and the weekly simulation has evidence to measure."
          phase={10}
        />
      )}
      {platform.launchCommit && platform.launchSlate ? renderPromotionLauncher() : null}
    </>
  );

  const renderCompany = () => (
    <>
      {renderTourCoach()}
      <StreamingVisualScene
        sceneId="companyFinance"
        className="hq-scene hq-room-scene"
        eyebrow="COMPANY & FINANCE"
        title="Control has a room."
        description="Treasury, ownership, leadership and permanent company records live behind these doors."
        status={{
          label: `${snapshot.founderOwnershipPercent}% founder control`,
          detail: `${formatMoney(snapshot.treasuryCash)} treasury`,
          tone: snapshot.debtPrincipal > 0 ? 'warning' : 'success',
        }}
        hotspots={[
          { id: 'founder', label: 'Founder Desk', status: 'Chief Executive Officer', x: 24, y: 58, tone: 'success', icon: <Crown size={16} /> },
          { id: 'board', label: 'Board Table', status: snapshot.executiveCount ? `${snapshot.executiveCount} executives` : 'Founder-led', x: 57, y: 42, tone: 'neutral', icon: <UsersRound size={16} /> },
          { id: 'finance', label: 'Finance Console', status: formatMoney(snapshot.treasuryCash), x: 83, y: 59, tone: snapshot.treasuryCash > 0 ? 'active' : 'critical', icon: <Banknote size={16} /> },
          { id: 'public-markets', label: 'Public Markets', status: platform.publicCompany.lifecycle === 'PUBLIC' ? `${platform.publicCompany.listing?.ticker} listed` : 'Private company', x: 70, y: 25, tone: platform.publicCompany.lifecycle === 'PUBLIC' ? 'active' : 'neutral', icon: <Landmark size={16} /> },
          { id: 'legacy', label: 'Legacy Archive', status: `Era ${platform.legacy.currentEraNumber}`, x: 42, y: 24, tone: platform.legacy.endlessMode ? 'active' : 'neutral', icon: <Archive size={16} /> },
        ]}
        onHotspotSelect={hotspot => {
          if (hotspot.id === 'legacy') {
            setShowLegacyOffice(true);
            return;
          }
          if (hotspot.id === 'public-markets') {
            setShowPublicMarkets(true);
            return;
          }
          if (hotspot.id === 'board') {
            setShowLeadershipSuite(true);
            return;
          }
          const targetId = hotspot.id === 'founder'
            ? 'hq-founder-desk'
            : 'hq-finance-console';
          document.getElementById(targetId)?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        }}
      />
      <header className="hq-page-heading">
        <span className="hq-eyebrow">OWNERSHIP & GOVERNANCE</span>
        <h1>Company Office</h1>
        <p>The permanent record behind every creative and commercial decision.</p>
      </header>
      <section id="hq-founder-desk" className="hq-founder-card">
        <div className="hq-founder-avatar"><UserRound size={25} /></div>
        <div><span>FOUNDER • CONTROLLING OWNER</span><h2>{player.name}</h2><p>{platform.legacy.founderOfficeRole.replace(/_/g, ' ')}</p></div>
        <span className="hq-control-pill">{snapshot.founderOwnershipPercent}% CONTROL</span>
      </section>
      <section className="hq-company-ledger">
        <div><span>Company treasury</span><strong>{formatMoney(snapshot.treasuryCash)}</strong></div>
        <div><span>Capital model</span><strong>{snapshot.capitalModelLabel}</strong></div>
        <div><span>Debt principal</span><strong>{snapshot.debtPrincipal > 0 ? formatMoney(snapshot.debtPrincipal) : 'None'}</strong></div>
        <div><span>Earned reach</span><strong>{snapshot.reachLabel}</strong></div>
      </section>
      <section id="hq-finance-console" className="hq-finance-control">
        <div className="hq-section-heading">
          <div><span className="hq-eyebrow">FOUNDER CAPITAL</span><h2>Finance ambition when you choose.</h2></div>
          <span className="hq-derived-label">{formatMoney(player.money)} personal cash</span>
        </div>
        <p>Transfer personal cash into the company without debt, dilution or artificial revenue. The platform begins with $15M, so finance accelerates scale instead of being a forced opening choice.</p>
        <div className="hq-capital-presets">
          {[5_000_000, 10_000_000, 25_000_000].map(amount => (
            <button
              type="button"
              key={amount}
              className={capitalAmount === amount ? 'is-selected' : ''}
              onClick={() => setCapitalAmount(amount)}
              disabled={player.money < amount}
            >
              {formatMoney(amount)}
            </button>
          ))}
        </div>
        <div className="hq-capital-action">
          <label>
            <span>Contribution amount</span>
            <input
              type="number"
              min={1_000_000}
              step={1_000_000}
              max={Math.max(1_000_000, player.money)}
              value={capitalAmount}
              onChange={event => setCapitalAmount(Math.max(0, Math.round(Number(event.target.value) || 0)))}
            />
          </label>
          <button type="button" onClick={contributeCapital} disabled={!onUpdatePlayer || capitalAmount <= 0 || capitalAmount > player.money}>
            <Plus size={17} /> Move to treasury
          </button>
        </div>
        <div className="hq-capital-receipt">
          <span><strong>{snapshot.capitalActionCount}</strong> recorded capital actions</span>
          <span><strong>{snapshot.founderOwnershipPercent}%</strong> founder ownership</span>
          <span><strong>{formatMoney(snapshot.debtPrincipal)}</strong> debt</span>
        </div>
      </section>
      <section id="hq-leadership-table" className="hq-section-block">
        <div className="hq-section-heading">
          <div><span className="hq-eyebrow">LEADERSHIP SUITE</span><h2>Build the organization behind the signal.</h2></div>
          <span className="hq-derived-label">{leadershipSuite.boardMode === 'BINDING' ? 'Binding board' : 'Founder control'}</span>
        </div>
        <div className="hq-leadership-console">
          <div className="hq-leadership-console-visual" aria-hidden="true">
            <Crown size={25} />
            <span />
            <i />
          </div>
          <div>
            <span>EXECUTIVE FLOOR • BOARD CHAMBER • INVESTOR SALON</span>
            <h3>{leadershipSuite.activeExecutives.length} of {leadershipSuite.activeExecutives.length + leadershipSuite.openRoles.length} specialist seats filled</h3>
            <p>Hire or promote executives, develop their traits, set real delegation guardrails, compose the board and review voluntary celebrity capital.</p>
          </div>
          <dl>
            <div><dt>Weekly leadership</dt><dd>{formatMoney(leadershipSuite.weeklyExecutiveCost + leadershipSuite.weeklyBoardCost)}</dd></div>
            <div><dt>Founder ownership</dt><dd>{platform.founderOwnershipPercent}%</dd></div>
            <div><dt>Board confidence</dt><dd>{leadershipSuite.boardConfidence}%</dd></div>
          </dl>
          <button type="button" onClick={() => setShowLeadershipSuite(true)}>
            Enter Leadership Suite <ChevronRight size={17} />
          </button>
        </div>
        <div className="hq-leadership-roster" aria-label="Current streaming leadership">
          <article className="is-founder"><span>{player.name.slice(0, 2).toUpperCase()}</span><div><strong>{player.name}</strong><small>{platform.legacy.founderOfficeRole.replace(/_/g, ' ')}</small></div><Crown size={16} /></article>
          {leadershipSuite.activeExecutives.slice(0, 5).map(executive => (
            <article key={executive.executiveId}><span>{executive.initials}</span><div><strong>{executive.nameAtAppointment}</strong><small>{executive.roleLabel}</small></div><b>{executive.loyalty}</b></article>
          ))}
          {leadershipSuite.openRoles.length ? (
            <button type="button" onClick={() => setShowLeadershipSuite(true)}>
              <Plus size={16} /><span><strong>{leadershipSuite.openRoles.length} open seats</strong><small>Search external and internal talent</small></span>
            </button>
          ) : null}
        </div>
        <aside className="hq-leadership-truth">
          <BadgeCheck size={17} />
          <p><strong>Power follows ownership.</strong> Your board advises while you retain 100%; it gains genuine veto power only after you voluntarily accept outside equity.</p>
        </aside>
      </section>
      <section className="hq-section-block">
        <div className="hq-section-heading">
          <div><span className="hq-eyebrow">PUBLIC MARKETS</span><h2>Capital, expectations and control.</h2></div>
          <span className="hq-derived-label">{platform.publicCompany.lifecycle === 'PUBLIC' ? `${platform.publicCompany.listing?.ticker} • LISTED` : 'PRIVATE • VALID FOREVER'}</span>
        </div>
        <button type="button" className="hq-leadership-console" onClick={() => setShowPublicMarkets(true)}>
          <div className="hq-leadership-console-visual" aria-hidden="true"><Landmark size={25} /><span /><i /></div>
          <div><span>IPO FLOOR • INVESTOR RELATIONS • SHAREHOLDER CHAMBER</span><h3>{platform.publicCompany.lifecycle === 'PUBLIC' ? 'Your company trades in public.' : 'Explore an IPO only when it serves the company.'}</h3><p>Prepare, roadshow and price a listing; publish guidance, report earnings, face real votes, activists and recoverable hostile tenders.</p></div>
          <dl>
            <div><dt>Status</dt><dd>{platform.publicCompany.lifecycle.replace(/_/g, ' ')}</dd></div>
            <div><dt>Founder vote</dt><dd>{platform.founderOwnershipPercent}%</dd></div>
            <div><dt>Share price</dt><dd>{platform.publicCompany.quoteHistory.length ? `$${platform.publicCompany.quoteHistory.at(-1)!.close.toFixed(2)}` : 'Not listed'}</dd></div>
          </dl>
          <span>Enter Public Markets <ChevronRight size={17} /></span>
        </button>
      </section>
      <section className="hq-section-block">
        <div className="hq-section-heading">
          <div><span className="hq-eyebrow">LEGACY & SUCCESSION</span><h2>Build a company that outlives its founder.</h2></div>
          <span className="hq-derived-label">ERA {platform.legacy.currentEraNumber} • {platform.legacy.closedEras.length} ARCHIVED</span>
        </div>
        <button type="button" className="hq-leadership-console" onClick={() => setShowLegacyOffice(true)}>
          <div className="hq-leadership-console-visual" aria-hidden="true"><Archive size={25} /><span /><i /></div>
          <div><span>HISTORY GALLERY • SUCCESSION STUDIO • ARCHIVE CINEMA</span><h3>{platform.legacy.endlessMode ? 'The company is already larger than one era.' : 'Your founding story is becoming a permanent record.'}</h3><p>See a fact-built timeline, discover the legacy identity your decisions created, designate a successor, change leadership eras and create a personalized archive film.</p></div>
          <dl>
            <div><dt>Current era</dt><dd>{platform.legacy.currentEraNumber}</dd></div>
            <div><dt>Founder office</dt><dd>{platform.legacy.founderOfficeRole.replace(/_/g, ' ')}</dd></div>
            <div><dt>Legacy films</dt><dd>{platform.legacy.montages.length}</dd></div>
          </dl>
          <span>Enter Legacy Office <ChevronRight size={17} /></span>
        </button>
      </section>
      {companyFeedback ? <p className="hq-company-feedback" role="status">{companyFeedback}</p> : null}
      <section className="hq-record-actions">
        <button type="button" onClick={replayTour}><RotateCcw size={17} /><span><strong>Replay HQ orientation</strong><small>Walk through all five areas again</small></span><ChevronRight size={18} /></button>
        <button type="button" onClick={() => { setReplayingReveal(true); setShowFoundingReveal(true); }}><Play size={17} /><span><strong>Replay founding reveal</strong><small>Return to the incorporation keynote</small></span><ChevronRight size={18} /></button>
      </section>
    </>
  );

  const renderSection = () => {
    if (showMarketCommand) return (
      <StreamingMarketCommand
        player={player}
        onBack={() => setShowMarketCommand(false)}
        onOpenPlatformWars={() => setShowPlatformWars(true)}
      />
    );
    if (activeSection === 'CONTENT') return (
      <StreamingContentDesk
        brand={commandDeckBrand}
        state={cinematicContentState}
        onBack={() => selectSection('HOME')}
        onOpenTitle={title => {
          setTitleDossierInitialProjectId(title.id);
          setShowTitleDossier(true);
        }}
        onCommission={() => platform.starterCatalog ? setShowOriginalCommissioning(true) : setShowCatalogSetup(true)}
        onRenew={() => setShowRightsExchange(true)}
        onLapse={() => setShowRightsExchange(true)}
      />
    );
    if (activeSection === 'TECH') return (
      <StreamingNetworkDesk
        brand={commandDeckBrand}
        state={cinematicNetworkState}
        treasury={platform.treasuryCash}
        onBack={() => selectSection('HOME')}
        onAddCity={() => setShowCinematicBuild(true)}
        onBuild={() => setShowTechnologyCampus(true)}
        onCancelBuild={() => setShowTechnologyCampus(true)}
        onToggleProduct={() => setShowProductLab(true)}
      />
    );
    if (activeSection === 'MARKET') return (
      <StreamingAudienceDesk
        brand={commandDeckBrand}
        state={cinematicAudienceState}
        onBack={() => selectSection('HOME')}
        onNewCampaign={() => openPromotionWarRoom()}
        onObjective={() => openPromotionWarRoom()}
        onOpenRegion={() => setShowMarketCommand(true)}
        onOpenMarketCommand={() => setShowMarketCommand(true)}
      />
    );
    if (activeSection === 'COMPANY') return (
      <StreamingBoardroom
        brand={commandDeckBrand}
        founderName={player.name}
        state={cinematicBoardroomState}
        onBack={() => selectSection('HOME')}
        onHire={() => setShowLeadershipSuite(true)}
        onIssueEquity={() => setShowCinematicRaise(true)}
        onFileIpo={() => setShowPublicMarkets(true)}
        onOpenLegacy={() => setShowLegacyOffice(true)}
      />
    );
    return renderHome();
  };

  if (showCinematicBuild && !showCinematicPricing && !showCinematicRaise) {
    return (
      <StreamingBuildExperience
        brand={commandDeckBrand}
        inputs={buildInputs}
        sel={buildSelection}
        result={buildRunResult}
        built={builtPlacements}
        isLive={Boolean(platform.launchCommit)}
        onResult={setBuildRunResult}
        onCommit={commitCinematicBuild}
        onOpenNight={openCinematicPremiere}
        onChange={setBuildSelection}
        onBack={() => setShowCinematicBuild(false)}
        pricing={{
          label: pricingSelection.model === 'ADS'
            ? 'Ad-supported'
            : pricingSelection.model === 'SUBS'
              ? 'Subscription'
              : 'Free tier + subscription',
          arpu: pricingDerived.sellable.length ? `$${pricingDerived.arpu.toFixed(2)}` : 'PENDING',
          reach: `×${pricingDerived.reachMul.toFixed(2)}`,
          problems: pricingDerived.problems.length,
          sellable: pricingDerived.sellable.length,
        }}
        onOpenPricing={() => setShowCinematicPricing(true)}
        funding={{
          borrowed: platform.debtPrincipal,
          soldPct: Math.max(0, 100 - platform.founderOwnershipPercent),
          own: platform.finance.capitalActions
            .filter(action => action.type === 'FOUNDER_CONTRIBUTION')
            .reduce((sum, action) => sum + action.amount, 0),
        }}
        onRaise={() => setShowCinematicRaise(true)}
      />
    );
  }

  if (showCinematicPricing) {
    return (
      <StreamingPricingExperience
        brand={commandDeckBrand}
        sel={pricingSelection}
        caps={pricingCapabilities}
        ceiling={buildDerived.ceiling}
        expectedLikely={buildDerived.demandTotal('LIKELY')}
        onChange={persistPricingBlueprint}
        onClose={() => setShowCinematicPricing(false)}
      />
    );
  }

  if (showCinematicRaise) {
    return (
      <StreamingRaiseExperience
        brand={commandDeckBrand}
        founderName={player.name}
        founderAvailable={player.money}
        raises={canonicalRaises}
        onSign={signCinematicRaise}
        onClose={() => setShowCinematicRaise(false)}
      />
    );
  }

  if (showCinematicPremiere) {
    return (
      <StreamingPremiereExperience
        brand={commandDeckBrand}
        inputs={cinematicPremiereInputs}
        onBack={() => setShowCinematicPremiere(false)}
        onLaunch={commitCinematicLaunch}
        onDone={() => pendingLaunchReveal ? finishPremiereNight() : setShowCinematicPremiere(false)}
      />
    );
  }

  if (showTitleDossier && cinematicDossier) {
    return (
      <StreamingDossierExperience
        brand={commandDeckBrand}
        t={cinematicDossier}
        onClose={() => {
          setShowTitleDossier(false);
          setTitleDossierInitialProjectId(null);
        }}
        onAction={() => openPromotionWarRoom(cinematicDossier.id)}
      />
    );
  }

  if (showViewerMode) {
    return (
      <StreamingViewerApp
        brand={commandDeckBrand}
        state={cinematicViewerState}
        onBack={() => setShowViewerMode(false)}
      />
    );
  }

  return (
    <div
      className="streaming-hq-shell"
      style={{
        '--hq-accent': identity.primaryColor,
        '--hq-secondary': identity.secondaryColor,
      } as React.CSSProperties}
    >
      <div className="streaming-zip-viewport" ref={mainRef} id="hq-main">
        {renderSection()}
      </div>

      {platform.publicCompany.listing && stockQuote ? (
        <StreamingStockBug
          ticker={platform.publicCompany.listing.ticker}
          quote={stockQuote}
          onOpen={() => setShowCinematicStock(true)}
        />
      ) : null}
      {showCinematicStock && platform.publicCompany.listing && stockQuote ? (
        <StreamingStockPanel
          ticker={platform.publicCompany.listing.ticker}
          quote={stockQuote}
          closePrice={platform.publicCompany.quoteHistory[0]?.close || platform.publicCompany.listing.offerPrice}
          onClose={() => setShowCinematicStock(false)}
        />
      ) : null}

      {showFoundingReveal ? (
        <AccessibleDialog
          className="hq-modal-backdrop hq-keynote-backdrop"
          role="dialog"
          aria-labelledby="hq-keynote-title"
          onEscape={() => finishFoundingReveal('DISMISSED')}
        >
          <div className="hq-keynote">
            <div className="hq-keynote-beams" aria-hidden="true" />
            <button type="button" className="hq-modal-close" onClick={() => finishFoundingReveal('DISMISSED')} aria-label="Skip founding reveal"><X size={20} /></button>
            <span className="hq-keynote-kicker">{replayingReveal ? 'FOUNDING REPLAY' : 'THE SIGNAL BEGINS'}</span>
            <div className="hq-keynote-mark"><LogoMark logoKey={identity.logoKey} /></div>
            <h1 id="hq-keynote-title">{identity.name}</h1>
            <p>{snapshot.brandPromiseDescription}</p>
            <div className="hq-keynote-facts">
              <div><span>OPENING TREASURY</span><strong>{formatMoney(snapshot.openingTreasuryCash)}</strong></div>
              <div><span>FOUNDER CONTROL</span><strong>{snapshot.founderOwnershipPercent}%</strong></div>
              <div><span>STARTING REACH</span><strong>Level 0 • Foundation</strong></div>
            </div>
            <button type="button" className="hq-primary-button" onClick={() => finishFoundingReveal('VIEWED')}>Enter {identity.name} Streaming Hall <ChevronRight size={18} /></button>
            <button type="button" className="hq-keynote-skip" onClick={() => finishFoundingReveal('DISMISSED')}>Skip reveal</button>
          </div>
        </AccessibleDialog>
      ) : null}

      {showOriginalReveal && platform.originalCommissions[0] ? (
        <AccessibleDialog
          className="hq-modal-backdrop hq-original-reveal-backdrop"
          role="dialog"
          aria-labelledby="hq-original-reveal-title"
          onEscape={() => finishOriginalReveal('DISMISSED')}
        >
          <div className="hq-original-reveal">
            <div className="hq-original-reveal-stage" aria-hidden="true">
              <span />
              <Clapperboard size={42} />
            </div>
            <button type="button" className="hq-modal-close" onClick={() => finishOriginalReveal('DISMISSED')} aria-label="Skip Original announcement"><X size={20} /></button>
            <span className="hq-keynote-kicker">THE FIRST ORIGINAL</span>
            <h1 id="hq-original-reveal-title">{platform.originalCommissions[0].title}</h1>
            <p>{platform.identity?.name} presents an original production by {platform.originalCommissions[0].producerStudioName}.</p>
            <div className="hq-keynote-facts">
              <div><span>FORMAT</span><strong>{platform.originalCommissions[0].projectType === 'SERIES' ? `${platform.originalCommissions[0].episodes} episodes` : 'Feature film'}</strong></div>
              <div><span>GENRE</span><strong>{platform.originalCommissions[0].genre.replace('_', ' ')}</strong></div>
              <div><span>STATUS</span><strong>GREENLIT</strong></div>
            </div>
            <button type="button" className="hq-primary-button" onClick={() => finishOriginalReveal('VIEWED')}>Enter the Content Room <ChevronRight size={18} /></button>
            <button type="button" className="hq-keynote-skip" onClick={() => finishOriginalReveal('DISMISSED')}>Skip announcement</button>
          </div>
        </AccessibleDialog>
      ) : null}

      {showWelcome ? (
        <AccessibleDialog
          className="hq-modal-backdrop"
          role="dialog"
          aria-labelledby="hq-welcome-title"
          onEscape={skipTour}
        >
          <div className="hq-welcome">
            <span className="hq-welcome-mark"><LogoMark logoKey={identity.logoKey} /></span>
            <span className="hq-eyebrow">YOUR COMPANY IS READY</span>
            <h1 id="hq-welcome-title">Welcome to {identity.name} Streaming Hall.</h1>
            <p>Five rooms. One connected business. Take a short tour now or explore freely.</p>
            <div className="hq-welcome-map" aria-label="Streaming Hall areas">
              {STREAMING_HQ_SECTIONS.map(section => {
                const Icon = SECTION_ICONS[section.id];
                return <span key={section.id}><Icon size={17} />{section.label}</span>;
              })}
            </div>
            <button type="button" className="hq-primary-button" onClick={startTour}>Take the Streaming Hall tour <ChevronRight size={18} /></button>
            <button type="button" className="hq-text-button" onClick={skipTour}>Explore on my own</button>
          </div>
        </AccessibleDialog>
      ) : null}

      {showTourComplete ? (
        <AccessibleDialog
          className="hq-modal-backdrop"
          role="dialog"
          aria-labelledby="hq-complete-title"
          onEscape={() => { setShowTourComplete(false); setActiveSection('HOME'); }}
        >
          <div className="hq-welcome hq-tour-complete">
            <span className="hq-complete-icon"><Check size={28} /></span>
            <span className="hq-eyebrow">ORIENTATION COMPLETE</span>
            <h1 id="hq-complete-title">You know the building.</h1>
            <p>Your first real operating move is infrastructure and subscription design. Until then, HQ keeps the launch plan honest and visible.</p>
            <button type="button" className="hq-primary-button" onClick={() => { setShowTourComplete(false); setActiveSection('HOME'); }}>Return to Command Centre</button>
          </div>
        </AccessibleDialog>
      ) : null}

      {showOperationsOffice ? (
        <AccessibleDialog
          className="hq-modal-backdrop hq-operations-office-backdrop"
          role="dialog"
          aria-labelledby="hq-operations-office-title"
          onEscape={() => setShowOperationsOffice(false)}
        >
          <div className="hq-operations-office">
            <header className="hq-operations-office-head">
              <div>
                <span className="hq-eyebrow">CEO OPERATING OFFICE</span>
                <h1 id="hq-operations-office-title">The week behind the signal.</h1>
                <p>Review cause and effect, set the next priority, and return to the command deck without creating a second simulation.</p>
              </div>
              <button type="button" onClick={() => setShowOperationsOffice(false)} aria-label="Close CEO operating office"><X size={20} /></button>
            </header>
            <div className="hq-operations-office-scroll">{renderOperationsOffice()}</div>
          </div>
        </AccessibleDialog>
      ) : null}

      {showInfrastructureSetup ? (
        <StreamingInfrastructureSetup
          player={player}
          onUpdatePlayer={onUpdatePlayer}
          onClose={closeInfrastructureSetup}
        />
      ) : null}
      {showTechnologyCampus ? (
        <StreamingTechnologyCampus
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowTechnologyCampus(false)}
          onOpenInfrastructure={() => {
            setShowTechnologyCampus(false);
            setShowCinematicBuild(true);
          }}
          onOpenCompany={() => {
            setShowTechnologyCampus(false);
            setActiveSection('COMPANY');
          }}
        />
      ) : null}
      {showProductLab ? (
        <StreamingProductLab
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowProductLab(false)}
          onOpenTechnology={() => {
            setShowProductLab(false);
            setShowTechnologyCampus(true);
          }}
          onOpenContent={() => {
            setShowProductLab(false);
            setActiveSection('CONTENT');
          }}
          onOpenViewerMode={() => {
            setShowProductLab(false);
            setShowViewerMode(true);
          }}
        />
      ) : null}
      {showLeadershipSuite ? (
        <StreamingLeadershipSuite
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowLeadershipSuite(false)}
          onOpenTechnology={() => {
            setShowLeadershipSuite(false);
            setShowTechnologyCampus(true);
          }}
          onOpenContent={() => {
            setShowLeadershipSuite(false);
            setActiveSection('CONTENT');
          }}
        />
      ) : null}
      {showCatalogSetup ? (
        <StreamingCatalogSetup
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={closeCatalogSetup}
        />
      ) : null}
      {showOriginalCommissioning ? (
        <StreamingOriginalCommissioning
          brand={commandDeckBrand}
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowOriginalCommissioning(false)}
          onStartProduction={target => {
            setShowOriginalCommissioning(false);
            onOpenOriginalProduction?.(target);
          }}
        />
      ) : null}
      {showOriginalsStudio && platform.starterCatalog ? (
        <StreamingOriginalsStudio
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowOriginalsStudio(false)}
          onOpenPitchRoom={() => {
            setShowOriginalsStudio(false);
            setShowOriginalCommissioning(true);
          }}
          onOpenProduction={target => {
            setShowOriginalsStudio(false);
            onOpenOriginalProduction?.(target);
          }}
          onOpenTitleDossier={projectId => {
            setShowOriginalsStudio(false);
            setTitleDossierInitialProjectId(projectId);
            setShowTitleDossier(true);
          }}
          onOpenPromotion={projectId => {
            setShowOriginalsStudio(false);
            openPromotionWarRoom(projectId);
          }}
        />
      ) : null}
      {showRightsExchange && platform.starterCatalog ? (
        <StreamingRightsExchange
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowRightsExchange(false)}
          onOpenTitleDossier={projectId => {
            setShowRightsExchange(false);
            setTitleDossierInitialProjectId(projectId);
            setShowTitleDossier(true);
          }}
          onOpenPromotion={projectId => {
            setShowRightsExchange(false);
            openPromotionWarRoom(projectId);
          }}
        />
      ) : null}
      {showPlatformWars && platform.launchCommit ? (
        <StreamingPlatformWars
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowPlatformWars(false)}
          onOpenRights={() => {
            setShowPlatformWars(false);
            setShowRightsExchange(true);
          }}
          onOpenAnalytics={() => {
            setShowPlatformWars(false);
            setShowAnalyticsCenter(true);
          }}
          onOpenLeadership={() => {
            setShowPlatformWars(false);
            setShowLeadershipSuite(true);
          }}
        />
      ) : null}
      {showAcquisitionCommand && platform.launchCommit ? (
        <StreamingAcquisitionCommand
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowAcquisitionCommand(false)}
          onOpenPlatformWars={() => {
            setShowAcquisitionCommand(false);
            setShowPlatformWars(true);
          }}
          onOpenFinance={() => {
            setShowAcquisitionCommand(false);
            setActiveSection('COMPANY');
          }}
        />
      ) : null}
      {showPublicMarkets ? (
        <StreamingPublicMarkets
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowPublicMarkets(false)}
          onOpenLeadership={() => {
            setShowPublicMarkets(false);
            setShowLeadershipSuite(true);
          }}
        />
      ) : null}
      {showIncidentCommand && incidentCommand.available ? (
        <StreamingIncidentCommand
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowIncidentCommand(false)}
          onOpenTechnology={() => {
            setShowIncidentCommand(false);
            setShowTechnologyCampus(true);
          }}
        />
      ) : null}
      {showLegacyOffice ? (
        <StreamingLegacyOffice
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowLegacyOffice(false)}
        />
      ) : null}
      {showSlatePlanner ? (
        <StreamingSlatePlanner
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowSlatePlanner(false)}
        />
      ) : null}
      {showAnalyticsCenter && platform.launchCommit ? (
        <StreamingAnalyticsCenter
          player={player}
          onClose={() => setShowAnalyticsCenter(false)}
          onOpenTitleDossier={() => {
            setShowAnalyticsCenter(false);
            setTitleDossierInitialProjectId(null);
            setShowTitleDossier(true);
          }}
        />
      ) : null}
      {showTitleDossier && platform.launchCommit ? (
        <StreamingTitleDossier
          player={player}
          initialProjectId={titleDossierInitialProjectId}
          onClose={() => {
            setShowTitleDossier(false);
            setTitleDossierInitialProjectId(null);
          }}
          onOpenPromotionWarRoom={projectId => {
            setShowTitleDossier(false);
            openPromotionWarRoom(projectId);
          }}
        />
      ) : null}
      {showPromotionWarRoom && platform.launchCommit ? (
        <StreamingPromotionWarRoom
          player={player}
          onUpdatePlayer={persist}
          initialProjectId={promotionInitialProjectId}
          onClose={() => {
            setShowPromotionWarRoom(false);
            setPromotionInitialProjectId(null);
          }}
        />
      ) : null}
    </div>
  );
}
