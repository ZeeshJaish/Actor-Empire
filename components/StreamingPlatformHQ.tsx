import React, { useEffect, useMemo, useRef, useState } from 'react';
import {BadgeCheck, BarChart3, Banknote, Building2, Check, ChevronRight, CircleDot, Clapperboard, Compass, Crown, Eye, Film, Gauge, Globe2, Home, Layers3, LockKeyhole, Play, RadioTower, Rocket, Server, ShieldCheck, Sparkles, TrendingUp, UsersRound, WalletCards, X, type LucideIcon} from 'lucide-react';
import type {
  OwnedStreamingLaunchRehearsalSnapshot,
  Player,
  StreamingHqSection,
  StreamingDefineLaunchStepId,
  StreamingLogoKey,
  StreamingTechnologyBranch,
} from '../types';
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
import StreamingCatalogSetup from './StreamingCatalogSetup';
import StreamingOpeningCatalogueDesk from './StreamingOpeningCatalogueDesk';
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
import StreamingCampusConstruction from './StreamingCampusConstruction';
import StreamingProductLab from './StreamingProductLab';
import StreamingLeadershipSuite from './StreamingLeadershipSuite';
import StreamingPlatformWars from './StreamingPlatformWars';
import StreamingAcquisitionCommand from './StreamingAcquisitionCommand';
import StreamingPublicMarkets from './StreamingPublicMarkets';
import StreamingIncidentCommand from './StreamingIncidentCommand';
import StreamingInfrastructureChronicle from './StreamingInfrastructureChronicle';
import StreamingLegacyOffice from './StreamingLegacyOffice';
import StreamingVisualScene from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import {
  getStreamingDayOneMarket,
  getStreamingDayOneMarketsForRegion,
  getStreamingDayOneRegionIds,
} from '../services/streamingDayOneMarkets';
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
import { PlatformDesk as StreamingPlatformDesk } from './streaming-transplant/StreamingNetworkExperience';
import { AudienceDesk as StreamingAudienceDesk } from './streaming-transplant/StreamingAudienceExperience';
import { Boardroom as StreamingBoardroom } from './streaming-transplant/StreamingBoardroomExperience';
import { ViewerApp as StreamingViewerApp } from './streaming-transplant/StreamingViewerExperience';
import {
  derive as deriveStreamingBuild,
  presetPlacements as streamingPresetPlacements,
  type BuildSel as StreamingBuildSelection,
  type RunResult as StreamingBuildRunResult,
} from './streaming-transplant/StreamingBuildoutExperience';
import StreamingBuildExperience from './streaming-transplant/StreamingBuildWizardExperience';
import {
  PricingDesk as StreamingPricingExperience,
  derivePricing as deriveStreamingPricing,
  type Capabilities as StreamingPricingCapabilities,
  type PricingSel as StreamingPricingSelection,
} from './streaming-transplant/StreamingPricingExperience';
import StreamingFinanceRoom from './streaming-transplant/StreamingFinanceRoom';
import StreamingContentMarket from './StreamingContentMarket';
import { establishContentMarketCatalogue } from '../services/streamingContentMarket';
import StreamingDefineLaunchWizard from './StreamingDefineLaunchExperience';
import type { LaunchDraft } from './studio-finance/finance/launch';
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
  getEligibleOwnedStreamingTitles,
  getStreamingCatalogLicenseStatus,
  resolveStreamingCatalogTitle,
} from '../services/streamingCatalog';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import { getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite } from '../services/streamingProductSuite';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import {
  acceptStreamingCelebrityInvestment,
  getStreamingLeadershipSuite,
} from '../services/streamingLeadershipGovernance';
import { getStreamingCompetitiveWorld } from '../services/streamingCompetitiveWorld';
import { getStreamingIncidentCommand } from '../services/streamingCrisisSecurity';
import { getStreamingInfrastructureChronicle } from '../services/streamingInfrastructureProgression';
import {
  commitStreamingInfrastructureSetup,
  createDefaultStreamingInfrastructureDraft,
  getSuggestedStreamingNetworkPlacements,
  getStreamingInfrastructureForecast,
  runStreamingInfrastructureLoadTest,
  saveStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import {
  aggregateStreamingFacilities,
  migratePlacementsToStreamingFacilities,
} from '../services/streamingFacilities';
import { commitOwnedStreamingLaunch, getStreamingLaunchReadiness } from '../services/streamingLaunch';
import {
  getStreamingLaunchProgramView,
  saveStreamingStorefrontPlan,
  type StreamingLaunchDestination,
} from '../services/streamingLaunchProgram';
import '../styles/streaming-hq.css';

const STREAMING_NETWORK_COVERAGE_REGIONS: StreamingRegionId[] = [
  'NORTH_AMERICA',
  'SOUTH_AMERICA',
  'EUROPE',
  'AFRICA',
  'ASIA',
  'OCEANIA',
];

const DEFINE_STEP_BY_DESTINATION: Partial<Record<StreamingLaunchDestination, StreamingDefineLaunchStepId>> = {
  FINANCE: 'FUND',
  OPENING_MARKETS: 'MARKETS',
  MARKET_CLEARANCE: 'CLEARANCE',
  SERVICE_IDENTITY: 'IDENTITY',
  STOREFRONT: 'STOREFRONT',
  CATALOGUE: 'CATALOGUE',
  PRICING: 'PRICING',
  LAUNCH_BLUEPRINT: 'BLUEPRINT',
};

interface Props {
  player: Player;
  onUpdatePlayer?: (player: Player) => void;
  onBack: () => void;
  onReturnToGame?: () => void;
  onOpenOriginalProduction?: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
  onOpenBank?: () => void;
  initialDestination?: 'HOME' | 'FINANCE';
  initialContentMarketOfferId?: string;
  onContentMarketOfferConsumed?: () => void;
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

export default function StreamingPlatformHQ({ player, onUpdatePlayer, onBack, onReturnToGame, onOpenOriginalProduction, onOpenBank, initialDestination = 'HOME', initialContentMarketOfferId, onContentMarketOfferConsumed }: Props) {
  const platform = player.ownedStreamingPlatform;
  const identity = platform.identity!;
  const snapshot = useMemo(() => getStreamingHqSnapshot(player), [player]);
  const launchProgram = useMemo(() => getStreamingLaunchProgramView(player), [player]);
  const technologyCampus = useMemo(() => getStreamingTechnologyCampus(player), [player]);
  const productSuite = useMemo(() => getStreamingProductSuite(player), [player]);
  const openingCatalogue = useMemo(() => getStreamingOpeningCatalogueView(player), [player]);
  const eligibleOwnedStreamingTitles = useMemo(() => getEligibleOwnedStreamingTitles(player), [player]);
  const leadershipSuite = useMemo(() => getStreamingLeadershipSuite(player), [player]);
  const competitiveWorld = useMemo(() => getStreamingCompetitiveWorld(player), [player]);
  const incidentCommand = useMemo(() => getStreamingIncidentCommand(player), [player]);
  const infrastructureChronicle = useMemo(() => getStreamingInfrastructureChronicle(player), [player]);
  const latestWeeklySnapshot = platform.weeklyHistory.at(-1) || null;
  const onboarding = platform.hqOnboarding ?? {
    status: 'NOT_STARTED' as const,
    currentStep: 0,
    visitedSections: [],
    startedAtAbsoluteWeek: null,
    completedAtAbsoluteWeek: null,
  };
  const mainRef = useRef<HTMLElement>(null);
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
  const [contentInitialTab, setContentInitialTab] = useState<'LIBRARY' | 'RIGHTS' | 'SLATE' | 'LOCALIZATION'>('LIBRARY');
  const [audienceInitialTab, setAudienceInitialTab] = useState<'ANALYTICS' | 'TOP 10' | 'CAMPAIGNS' | 'REGIONS' | 'MARKETS'>('ANALYTICS');
  const [showWelcome, setShowWelcome] = useState(onboarding.status === 'NOT_STARTED');
  const [showTourComplete, setShowTourComplete] = useState(false);
  const [showTechnologyCampus, setShowTechnologyCampus] = useState(false);
  const [showCampusConstruction, setShowCampusConstruction] = useState(false);
  const [showProductLab, setShowProductLab] = useState(false);
  const [showLeadershipSuite, setShowLeadershipSuite] = useState(false);
  const [showCatalogSetup, setShowCatalogSetup] = useState(false);
  const [showContentMarket, setShowContentMarket] = useState(Boolean(initialContentMarketOfferId));
  const [catalogueReturnToLaunch, setCatalogueReturnToLaunch] = useState(false);
  const [catalogSetupInitialStep, setCatalogSetupInitialStep] = useState<0 | 2 | undefined>(undefined);
  const [catalogDeskInitialTab, setCatalogDeskInitialTab] = useState<'PROGRAM' | 'COVERAGE' | 'LANGUAGES'>('PROGRAM');
  const [catalogSurface, setCatalogSurface] = useState<'SETUP' | 'DESK'>('SETUP');
  const [showOriginalCommissioning, setShowOriginalCommissioning] = useState(false);
  const [showOriginalsStudio, setShowOriginalsStudio] = useState(false);
  const [showRightsExchange, setShowRightsExchange] = useState(false);
  const [showPlatformWars, setShowPlatformWars] = useState(false);
  const [showAcquisitionCommand, setShowAcquisitionCommand] = useState(false);
  const [showPublicMarkets, setShowPublicMarkets] = useState(false);
  const [showIncidentCommand, setShowIncidentCommand] = useState(false);
  const [showInfrastructureChronicle, setShowInfrastructureChronicle] = useState(false);
  const [showLegacyOffice, setShowLegacyOffice] = useState(false);
  const [showSlatePlanner, setShowSlatePlanner] = useState(false);
  const [showOriginalReveal, setShowOriginalReveal] = useState(Boolean(pendingOriginalReveal));
  const [showViewerMode, setShowViewerMode] = useState(false);
  const [showAnalyticsCenter, setShowAnalyticsCenter] = useState(false);
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState<'AUDIENCE' | 'FINANCE' | 'TECH' | 'CONTENT'>('AUDIENCE');
  const [showTitleDossier, setShowTitleDossier] = useState(false);
  const [titleDossierInitialProjectId, setTitleDossierInitialProjectId] = useState<string | null>(null);
  const [showPromotionWarRoom, setShowPromotionWarRoom] = useState(false);
  const [promotionInitialProjectId, setPromotionInitialProjectId] = useState<string | null>(null);
  const [showOperationsOffice, setShowOperationsOffice] = useState(false);
  const [showDefineLaunch, setShowDefineLaunch] = useState(false);
  const [defineLaunchMode, setDefineLaunchMode] = useState<'OPENING' | 'EXPANSION'>('OPENING');
  const [defineLaunchInitialStep, setDefineLaunchInitialStep] = useState<StreamingDefineLaunchStepId | undefined>(undefined);
  const launchDraftRef = useRef<LaunchDraft | null>(null);
  const [showCinematicBuild, setShowCinematicBuild] = useState(false);
  const [showCinematicPricing, setShowCinematicPricing] = useState(false);
  const [showFinanceRoom, setShowFinanceRoom] = useState(initialDestination === 'FINANCE');
  const [financeInitialTab, setFinanceInitialTab] = useState<'SNAPSHOT' | 'CAPITAL'>('SNAPSHOT');
  const [financeInitialCapitalView, setFinanceInitialCapitalView] = useState<'DESK' | 'INJECT' | 'EQUITY'>('DESK');
  const [showCinematicPremiere, setShowCinematicPremiere] = useState(Boolean(pendingLaunchReveal));
  const [showCinematicStock, setShowCinematicStock] = useState(false);
  const [buildRunResult, setBuildRunResult] = useState<StreamingBuildRunResult | null>(null);
  const buildCommittedPlayerRef = useRef<Player | null>(null);
  const [companyFeedback, setCompanyFeedback] = useState('');

  useEffect(() => {
    if (!initialContentMarketOfferId) return;
    setShowContentMarket(true);
    onContentMarketOfferConsumed?.();
  }, [initialContentMarketOfferId, onContentMarketOfferConsumed]);

  const openFinanceRoom = (
    tab: 'SNAPSHOT' | 'CAPITAL' = 'SNAPSHOT',
    capitalView: 'DESK' | 'INJECT' | 'EQUITY' = 'DESK',
  ) => {
    setFinanceInitialTab(tab);
    setFinanceInitialCapitalView(capitalView);
    setShowFinanceRoom(true);
  };

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
    const canonicalOpeningMarketIds = platform.marketOperations
      .filter(operation => operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED')
      .map(operation => operation.countryId!);
    const dayOne = getStreamingDayOneRegionIds(canonicalOpeningMarketIds.length
      ? canonicalOpeningMarketIds
      : identity.dayOneMarketIds || []) as StreamingRegionId[];
    const foundingRegion = streamingCityById(identity.launchServerCityId)?.region || 'NORTH_AMERICA';
    return Array.from(new Set<StreamingRegionId>(dayOne.length ? dayOne : active.length ? active : [foundingRegion]));
  }, [identity.dayOneMarketIds, identity.launchServerCityId, platform.competitiveWorld.regionalLaunches, platform.marketOperations]);
  const buildMarkets = useMemo(() => {
    const canonicalOpeningMarketIds = platform.marketOperations
      .filter(operation => operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED')
      .map(operation => operation.countryId!);
    const selected = (canonicalOpeningMarketIds.length ? canonicalOpeningMarketIds : identity.dayOneMarketIds || []).flatMap(marketId => {
      const market = getStreamingDayOneMarket(marketId);
      return market ? [market] : [];
    });
    if (selected.length) return selected;
    // LEGACY MARKET FALLBACK: pre-Day-One-Market saves retain their launch
    // regions. Give each one a stable lead country so Phase 6 never collapses
    // into a global percentage with no viewer-level evidence.
    return visualRegions.flatMap(region => (
      [...getStreamingDayOneMarketsForRegion(region)]
        .sort((left, right) => right.streamingAudience - left.streamingAudience)
        .slice(0, 1)
    ));
  }, [identity.dayOneMarketIds, platform.marketOperations, visualRegions]);

  const initialInfrastructureDraft = platform.infrastructureSetupDraft
    || createDefaultStreamingInfrastructureDraft(player);
  const [buildSelection, setBuildSelection] = useState<StreamingBuildSelection>(() => ({
    placements: initialInfrastructureDraft.facilities?.length
      ? aggregateStreamingFacilities(initialInfrastructureDraft.facilities)
      : initialInfrastructureDraft.networkPlacements?.length
      ? initialInfrastructureDraft.networkPlacements.map(placement => ({ ...placement }))
      : streamingPresetPlacements(
        initialInfrastructureDraft.capacityPackageId,
        visualRegions,
        null,
      ),
    facilities: initialInfrastructureDraft.facilities?.length
      ? initialInfrastructureDraft.facilities.map(facility => ({
        ...facility,
        lease: facility.lease ? { ...facility.lease } : undefined,
        rackGroups: facility.rackGroups?.map(group => ({
          ...group,
          migration: group.migration ? { ...group.migration } : undefined,
        })),
      }))
      : migratePlacementsToStreamingFacilities(
        initialInfrastructureDraft.networkPlacements?.length
          ? initialInfrastructureDraft.networkPlacements
          : streamingPresetPlacements(initialInfrastructureDraft.capacityPackageId, visualRegions, null),
      ),
    managementPolicy: initialInfrastructureDraft.managementPolicy,
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
      layoutId: platform.serviceConfiguration.storefrontLayoutId || 'cinema',
      typeId: identity.logoKey === 'WORDMARK' ? 'GEOMETRIC' : 'GROTESK',
      accentHue: secondary.hue,
      identMode: identity.soundIdentKey === 'SILENT' ? 'none' : 'badge',
      identLen: 2,
      ratingId: 'MATURE',
      lockupId: identity.logoKey === 'WORDMARK' ? 'ICON' : 'SIDE',
      serverCity: snapshot.reachLabel,
    };
  }, [identity, platform.serviceConfiguration.storefrontLayoutId, snapshot.reachLabel]);

  const commandDeckState = useMemo<StreamingCommandDeckState>(() => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const latestPerformance = latestWeeklySnapshot?.operations?.titlePerformance ?? [];
    const performanceByProject = new Map(latestPerformance.map(item => [item.projectId, item]));
    const mostWatched = [...latestPerformance].sort((a, b) => b.viewingAccounts - a.viewingAccounts)[0];
    const activeRegions = platform.competitiveWorld.regionalLaunches.filter(region => region.status === 'ACTIVE').length;
    const currentCapacity = Math.max(0, platform.capacity.baselineConcurrentStreams);
    const isPreLaunch = platform.lifecycle === 'FOUNDING' && !platform.launchCommit;
    const openingMarkets = platform.marketOperations.filter(operation => (
      operation.scope === 'COUNTRY'
      && operation.entryKind === 'OPENING'
      && operation.status !== 'EXITED'
    ));
    const clearedMarkets = openingMarkets.filter(operation => (
      ['INFRASTRUCTURE_PREPARATION', 'READY', 'ACTIVE'].includes(operation.status)
    ));
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
      readiness: { done: launchProgram.completedCount, total: launchProgram.totalCount },
      launchProgram: platform.launchCommit ? undefined : launchProgram,
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
      divisions: isPreLaunch ? [
        {
          id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Opening markets & clearance',
          statLabel: 'OPENING FOOTPRINT',
          stat: openingMarkets.length ? `${clearedMarkets.length}/${openingMarkets.length} CLEARED` : 'CHOOSE MARKETS',
          pressure: openingMarkets.length === 0 ? 'urgent' : clearedMarkets.length < openingMarkets.length ? 'watch' : 'calm',
          note: openingMarkets.length === 0 ? 'Opening markets are not defined.' : undefined,
          chips: [
            { id: 'MARKETS', label: 'OPENING MARKETS', alert: openingMarkets.length === 0 || clearedMarkets.length < openingMarkets.length },
          ],
        },
        {
          id: 'CONTENT', label: 'CONTENT', sub: 'Catalogue, Content Market & Originals',
          statLabel: 'OPENING CATALOGUE',
          stat: platform.starterCatalog ? `${openingCatalogue.titles.length} TITLES · ${openingCatalogue.rightsReadyCountryCount}/${openingCatalogue.openingCountryCount} MARKETS` : 'NOT ASSEMBLED',
          pressure: !platform.starterCatalog ? 'urgent' : openingCatalogue.rightsReady ? 'calm' : 'watch',
          note: !platform.starterCatalog ? 'The opening shelves need a catalogue.' : undefined,
          chips: [
            { id: 'CATALOGUE', label: 'CATALOGUE', alert: !platform.starterCatalog },
            { id: 'MARKETPLACE', label: 'CONTENT MARKET' },
            { id: 'ORIGINALS', label: 'ORIGINALS' },
            { id: 'RIGHTS', label: 'RIGHTS' },
            { id: 'LOCALIZATION', label: 'LOCALIZATION', alert: !openingCatalogue.qualityReady },
            { id: 'SLATE', label: 'SLATE' },
          ],
        },
        {
          id: 'PLATFORM', label: 'PLATFORM', sub: 'Product, technology & delivery',
          statLabel: 'BUILD TRACK',
          stat: `${launchProgram.tracks.find(track => track.id === 'BUILD_PLATFORM')?.progressPercent ?? 0}% READY`,
          pressure: platform.infrastructureSetup ? 'calm' : 'watch',
          note: !platform.infrastructureSetup ? 'The delivery network is not commissioned.' : undefined,
          chips: [
            { id: 'INFRA', label: 'DELIVERY BUILD', alert: !platform.infrastructureSetup },
            { id: 'TECH', label: 'TECHNOLOGY' },
            { id: 'PRODUCTS', label: 'PRODUCT' },
          ],
        },
        {
          id: 'BOARDROOM', label: 'BOARDROOM', sub: 'Treasury, capital & governance',
          statLabel: 'OPERATING TREASURY',
          stat: platform.treasuryCash > 0 ? formatMoney(platform.treasuryCash) : 'FUND REQUIRED',
          pressure: platform.treasuryCash > 0 ? 'calm' : 'urgent',
          note: platform.treasuryCash <= 0 ? 'The company exists, but cannot commit spending.' : undefined,
          chips: [
            { id: 'FINANCE', label: 'STUDIO FINANCE', alert: platform.treasuryCash <= 0 },
            { id: 'LEADERSHIP', label: 'LEADERSHIP' },
          ],
        },
      ] : [
        {
          id: 'CONTENT', label: 'CONTENT', sub: 'Catalogue, deals, Originals & performance',
          statLabel: 'CATALOGUE', stat: `${(platform.catalogProjectIds || []).length} TITLES`,
          pressure: !platform.starterCatalog ? 'urgent' : (platform.originalCommissions || []).length === 0 ? 'watch' : 'calm',
          note: !platform.starterCatalog ? 'The opening shelves are empty.' : undefined,
          chips: [
            { id: 'CATALOGUE', label: 'CATALOGUE', alert: !platform.starterCatalog },
            { id: 'MARKETPLACE', label: 'CONTENT MARKET' },
            { id: 'ORIGINALS', label: 'ORIGINALS', alert: (platform.originalCommissions || []).length === 0 },
            { id: 'RIGHTS', label: 'RIGHTS', alert: !platform.starterCatalog },
            { id: 'LOCALIZATION', label: 'LOCALIZATION', alert: platform.localizationOperations.jobs.some(job => job.status !== 'READY') },
            { id: 'SLATE', label: 'SLATE', alert: !platform.launchSlate },
            { id: 'ANALYTICS', label: 'ANALYTICS' },
          ],
        },
        {
          id: 'PLATFORM', label: 'PLATFORM', sub: 'Product, technology, delivery & reliability',
          statLabel: 'BASELINE', stat: currentCapacity > 0 ? `${currentCapacity.toLocaleString()} STREAMS` : 'LEVEL 0',
          pressure: incidentCommand.activeCrisis ? 'urgent' : !platform.infrastructureSetup || capacityPressure >= 0.82 ? 'watch' : 'calm',
          note: incidentCommand.activeCrisis ? 'A live incident needs command.' : undefined,
          chips: [
            { id: 'INFRA', label: 'DELIVERY', alert: !platform.infrastructureSetup },
            { id: 'TECH', label: 'TECHNOLOGY' },
            { id: 'PRODUCTS', label: 'PRODUCT' },
            { id: 'INCIDENTS', label: 'INCIDENTS', alert: Boolean(incidentCommand.activeCrisis) },
          ],
        },
        {
          id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Analytics, growth & competition',
          statLabel: 'SUBSCRIBERS', stat: platform.launchCommit ? platform.metrics.subscribers.toLocaleString() : 'PRE-LAUNCH',
          pressure: platform.metrics.churnRate > 0.055 ? 'watch' : 'calm',
          note: platform.metrics.churnRate > 0.055 ? 'Churn is above the comfort line.' : undefined,
          chips: [
            { id: 'MARKETS', label: 'MARKETS' },
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
  }, [incidentCommand.activeCrisis, latestWeeklySnapshot, leadershipSuite.appointments, launchProgram, platform, player, snapshot]);
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
  const buildAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const buildInputs = useMemo(() => ({
    absoluteWeek: buildAbsoluteWeek,
    treasury: platform.treasuryCash,
    catalogueSpend: (platform.catalogLicenses || []).reduce((sum, license) => sum + license.minimumGuarantee, 0),
    catalogueTitles: (platform.catalogProjectIds || []).length,
    catalogueRights: {
      globalTitleCount: (platform.starterCatalog?.ownedProjectIds || []).length
        + (platform.originalCommissions || []).filter(original => {
          const status = getStreamingOriginalLiveStatus(player, original);
          return status === 'DELIVERED' || status === 'RELEASED';
        }).length,
      primaryMarketId: [...buildMarkets]
        .sort((left, right) => right.streamingAudience - left.streamingAudience)[0]?.id || null,
      licensedTitles: (platform.catalogLicenses || [])
        .filter(license => getStreamingCatalogLicenseStatus(license, buildAbsoluteWeek) === 'ACTIVE')
        .map(license => ({ territory: license.territory })),
    },
    originalsSpend: (platform.originalCommissions || []).reduce((sum, original) => sum + original.productionFundingApplied, 0),
    originalsCount: (platform.originalCommissions || []).length,
    defineLaunchPaid: platform.costCommitments
      .filter(commitment => ['MARKET', 'SERVICE'].includes(commitment.category) && ['PAID', 'MIGRATED'].includes(commitment.status) && commitment.paidAmount > 0)
      .map(commitment => ({
        id: commitment.id,
        label: commitment.label,
        amount: commitment.paidAmount,
        note: commitment.category === 'MARKET' ? 'Define the Launch · market filing' : 'Define the Launch · service identity',
      })),
    defineLaunchChecks: (launchProgram.tracks.find(track => track.id === 'DEFINE_LAUNCH')?.milestones || []).flatMap(milestone => {
      const step = DEFINE_STEP_BY_DESTINATION[milestone.destination];
      return step ? [{
        id: milestone.id,
        label: milestone.label,
        complete: milestone.complete,
        detail: milestone.complete ? 'Confirmed' : milestone.description,
        step,
      }] : [];
    }),
    premiereTitle: platform.launchSlate?.entries[0]?.title
      || (platform.originalCommissions || [])[0]?.title
      || 'First Original',
    regions: visualRegions,
    coverageRegions: STREAMING_NETWORK_COVERAGE_REGIONS,
    markets: buildMarkets.map(market => ({
      id: market.id,
      country: market.country,
      region: market.regionId as StreamingRegionId,
      audience: market.streamingAudience,
      annualGrowthPercent: market.annualGrowthPercent,
      recommendedCityId: market.recommendedCityId,
      localizationNote: market.localizationNote,
    })),
    recommendedPlacements: getSuggestedStreamingNetworkPlacements(
      buildMarkets.map(market => market.id),
      pricingDerived.reachMul,
    ),
    homeCityId: buildSelection.placements[0]?.cityId || null,
    audienceMul: pricingDerived.reachMul,
    debtWeekly: (platform.finance.loans || [])
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + loan.outstandingPrincipal * loan.weeklyInterestRate, 0),
  }), [buildAbsoluteWeek, buildMarkets, buildSelection.placements, launchProgram, platform, pricingDerived.reachMul, visualRegions]);
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
        null,
      )
    : null,
  [platform.infrastructureSetup, visualRegions]);
  const builtFacilities = useMemo(() => platform.infrastructureSetup
    ? platform.infrastructureSetup.facilities?.length
      ? platform.infrastructureSetup.facilities.map(facility => ({ ...facility }))
      : migratePlacementsToStreamingFacilities(builtPlacements)
    : null,
  [builtPlacements, platform.infrastructureSetup]);
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
      kind: catalogue?.kind || (performance?.source === 'ORIGINAL' ? 'ORIGINAL' : performance?.source === 'OWNED_LIBRARY' ? 'OWNED' : 'LICENSED'),
      format: String(performance?.projectType || catalogue?.format || 'Film'),
      genre: performance?.genre || catalogue?.genre || 'Drama',
      hue: commandDeckBrand.hue,
      logline: `The complete audience, commercial and lifecycle record for ${title}.`,
      status: catalogue?.status || 'ON THE SERVICE',
      chartRank: cinematicAudienceState.chart.find(row => row.mine && row.title === title)?.rank,
      rating: performance ? Math.max(1, Math.min(10, performance.satisfactionScore / 10)) : undefined,
      rightsWeeksLeft: catalogue?.rights?.endsInWeeks,
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

  const canonicalInfrastructureDraft = (
    selection: StreamingBuildSelection = buildSelection,
    preserveRehearsal = true,
  ) => {
    const selectionDerived = deriveStreamingBuild(selection, {
      ...buildInputs,
      homeCityId: selection.placements[0]?.cityId || null,
    });
    const packageId = selectionDerived.racks <= 2
      ? 'STARTER'
      : selectionDerived.racks <= 4
        ? 'ESSENTIAL'
        : selectionDerived.racks <= 7
          ? 'GROWTH'
          : 'PREMIERE';
    const strategy = selection.arch === 'CLOUD'
      ? 'CLOUD_FIRST'
      : selection.arch === 'OWNED'
        ? 'OWNED_INFRASTRUCTURE'
        : 'HYBRID';
    return {
      ...(platform.infrastructureSetupDraft || createDefaultStreamingInfrastructureDraft(player)),
      currentStep: 4,
      strategy,
      capacityPackageId: packageId,
      rolloutPace: selection.doctrine,
      networkPlacements: selection.placements.map(placement => ({ ...placement })),
      facilities: (selection.facilities || migratePlacementsToStreamingFacilities(selection.placements))
        .map(facility => ({
          ...facility,
          lease: facility.lease ? { ...facility.lease } : undefined,
          rackGroups: facility.rackGroups?.map(group => ({
            ...group,
            migration: group.migration ? { ...group.migration } : undefined,
          })),
        })),
      managementPolicy: selection.managementPolicy,
      openingDemandForecast: {
        low: selectionDerived.demandTotal('QUIET'),
        likely: selectionDerived.demandTotal('LIKELY'),
        high: selectionDerived.demandTotal('SURGE'),
      },
      subscriptionPrices: {
        BASIC: pricingSelection.price.BASIC,
        PREMIUM: pricingSelection.price.STANDARD,
        FAMILY: pricingSelection.price.PREMIUM,
      },
      lastLaunchRehearsal: preserveRehearsal
        ? platform.infrastructureSetupDraft?.lastLaunchRehearsal
        : undefined,
    } as const;
  };

  const updateBuildSelection = (nextSelection: StreamingBuildSelection) => {
    setBuildSelection(nextSelection);
    if (!onUpdatePlayer) return;
    persist(saveStreamingInfrastructureDraft(player, canonicalInfrastructureDraft(nextSelection, false)));
  };

  const recordBuildRehearsal = (result: StreamingBuildRunResult | null) => {
    setBuildRunResult(result);
    if (!result || !onUpdatePlayer) return;
    const draft = canonicalInfrastructureDraft(buildSelection, false);
    const forecast = getStreamingInfrastructureForecast(player, draft);
    const rehearsal: OwnedStreamingLaunchRehearsalSnapshot = {
      configurationSignature: forecast.configurationSignature,
      scenario: result.scenario,
      verdict: result.verdict,
      peakConcurrentStreams: result.peakConcurrentStreams,
      steadyCapacity: result.steadyCapacity,
      burstCapacity: result.burstCapacity,
      peakLoadPercent: result.peakLoadPercent,
      spareCapacityPercent: result.spareCapacityPercent,
      failedPercent: result.failedPercent,
      estimatedDowntimeMinutes: result.estimatedDowntimeMinutes,
      catalogueAvailabilityPercent: result.catalogueAvailabilityPercent,
      regionalSinglePointFailures: [...result.regionalSinglePointFailures],
      warningSummary: result.warningSummary,
      countries: result.countries.map(country => ({
        marketId: country.marketId,
        country: country.country,
        demand: country.demand,
        startupTimeMs: country.startupTimeMs,
        bufferingRiskPercent: country.bufferingRiskPercent,
        catalogueAvailabilityPercent: country.catalogueAvailabilityPercent,
        outageResistance: country.outageResistance,
        verdict: country.verdict,
        failedPercent: country.failedPercent,
        viewerConsequence: country.viewerConsequence,
      })),
      facilities: result.facilities.map(facility => ({
        facilityId: facility.facilityId,
        cityId: facility.cityId,
        demand: facility.demand,
        loadPercent: facility.loadPercent,
        state: facility.state,
        verdict: facility.verdict,
        failedPercent: facility.failedPercent,
        limitingFactor: facility.limitingFactor,
      })),
      completedAtAbsoluteWeek: buildAbsoluteWeek,
    };
    const saved = saveStreamingInfrastructureDraft(player, { ...draft, lastLaunchRehearsal: rehearsal });
    persist(runStreamingInfrastructureLoadTest(saved).player);
  };

  const quoteCinematicBuild = (selection: StreamingBuildSelection) => {
    const forecast = getStreamingInfrastructureForecast(player, canonicalInfrastructureDraft(selection));
    return {
      transactionCost: forecast.transactionCost,
      weeklyOperatingCost: forecast.weeklyOperatingCost,
      buildWeeks: forecast.buildWeeks,
      baselineConcurrentStreams: forecast.baselineConcurrentStreams,
      burstConcurrentStreams: forecast.burstConcurrentStreams,
      energyKwhWeekly: forecast.energyKwhWeekly,
      waterLitresWeekly: forecast.waterLitresWeekly,
      sustainabilityScore: forecast.sustainabilityScore,
      publicReputation: forecast.publicReputation,
    };
  };

  const commitCinematicBuild = (selection: StreamingBuildSelection = buildSelection) => {
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available, so no money was moved.' } as const;
    const draft = canonicalInfrastructureDraft(selection);
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
    const committedView = deriveStreamingBuild(selection, {
      ...buildInputs,
      homeCityId: selection.placements[0]?.cityId || null,
    });
    const networkLabel = `${draft.networkPlacements.length} ${draft.networkPlacements.length === 1 ? 'city' : 'cities'} and ${committedView.racks} racks`;
    const message = weeksRemaining > 0
      ? `${networkLabel} commissioned. The network becomes operational in ${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'}.`
      : `${networkLabel} commissioned and operational.`;
    setCompanyFeedback(message);
    return { ok: true, message, next: 'BACK' as const };
  };

  const persistPricingBlueprint = (selection: StreamingPricingSelection) => {
    setPricingSelection(selection);
    if (!onUpdatePlayer || platform.lifecycle !== 'FOUNDING') return;
    const withStorefront = saveStreamingStorefrontPlan(player, {
      storefrontLayoutId: platform.serviceConfiguration.storefrontLayoutId || 'CINEMA',
      pricingApproach: selection.model,
    }).player;
    const draft = canonicalInfrastructureDraft();
    persist(saveStreamingInfrastructureDraft(withStorefront, {
      ...draft,
      subscriptionPrices: {
        BASIC: selection.price.BASIC,
        PREMIUM: selection.price.STANDARD,
        FAMILY: selection.price.PREMIUM,
      },
    }));
  };

  const injectFinanceCapital = (amount: number) => {
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available.' };
    const result = contributeStreamingFounderCapital(
      player,
      amount,
      `finance-room:${getAbsoluteWeek(player.age, player.currentWeek)}:${platform.finance.capitalActions.length}:${amount}`,
    );
    if (!result.changed) {
      return {
        ok: false,
        message: result.reason === 'INSUFFICIENT_CASH'
          ? 'Your personal account cannot cover that contribution.'
          : result.reason === 'INVALID_AMOUNT'
            ? 'Choose a founder contribution above $0.'
            : 'That capital transfer is already recorded.',
      };
    }
    persist(result.player);
    return {
      ok: true,
      message: `${formatMoney(result.amount)} entered company treasury. Ownership and debt did not change.`,
    };
  };

  const acceptFinanceInvestment = (offerId: string) => {
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available.' };
    const result = acceptStreamingCelebrityInvestment(player, offerId);
    if (!result.changed) {
      return {
        ok: false,
        message: result.reason === 'CFO_REQUIRED'
          ? 'Appoint an active CFO before issuing equity.'
          : result.reason === 'CONTROL_LIMIT'
            ? 'Those terms would reduce founder control below the company guardrail.'
            : result.reason === 'ALREADY_DECIDED'
              ? 'That investor is already on the cap table.'
              : 'The equity round could not be completed.',
      };
    }
    persist(result.player);
    return { ok: true, message: 'Capital, dilution and governance were recorded together in the company books.' };
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

  /* NO ENTRY POINT. Its only caller was the "Replay HQ orientation" button in
     renderCompany, which stopped being mounted when the cinematic desks
     replaced the five HQ rooms — so this has been unreachable since that
     transplant, not since the dead code above was removed. Kept, with
     replayStreamingHqTour behind it, because the feature is worth restoring:
     it wants a home on the Boardroom or in the deck's LEGACY chip. */
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

  const closeCatalogSetup = () => {
    setShowCatalogSetup(false);
    setCatalogSetupInitialStep(undefined);
    if (catalogueReturnToLaunch) {
      setCatalogueReturnToLaunch(false);
      setDefineLaunchInitialStep('CATALOGUE');
      setShowDefineLaunch(true);
    }
    window.requestAnimationFrame(() => mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
  };

  const openStarterCatalogueRoute = (step: 0 | 2) => {
    setShowContentMarket(true);
  };

  const openCatalogueSurface = (tab: 'PROGRAM' | 'COVERAGE' | 'LANGUAGES' = 'PROGRAM') => {
    if (!platform.starterCatalog) { setShowContentMarket(true); return; }
    setCatalogDeskInitialTab(tab);
    setCatalogSetupInitialStep(undefined);
    setCatalogSurface(platform.starterCatalog ? 'DESK' : 'SETUP');
    setShowCatalogSetup(true);
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
      <button type="button" onClick={() => {
        setAnalyticsInitialTab('AUDIENCE');
        setShowAnalyticsCenter(true);
      }}>
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
            { id: 'CONTENT', label: 'Content Desk', status: platform.starterCatalog ? `${snapshot.catalogCount} titles` : 'Catalog empty', x: 25, y: 39, desktopX: 25, desktopY: 21, tone: platform.starterCatalog ? 'success' : 'active', icon: <Clapperboard size={16} /> },
            { id: 'TECH', label: 'Platform Operations', status: snapshot.infrastructureConfigured ? snapshot.loadTestStatus || 'Configured' : 'No capacity', x: 74, y: 38, desktopX: 74, desktopY: 31, tone: snapshot.infrastructureConfigured ? 'success' : 'warning', icon: <Server size={16} /> },
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
      if (chip === 'CATALOGUE') {
        return openCatalogueSurface('PROGRAM');
      }
      if (chip === 'MARKETPLACE') return setShowContentMarket(true);
      if (chip === 'ORIGINALS') {
        return platform.originalCommissions.length
          ? setShowOriginalsStudio(true)
          : setShowOriginalCommissioning(true);
      }
      if (chip === 'RIGHTS') return platform.launchCommit
        ? setShowRightsExchange(true)
        : openCatalogueSurface('COVERAGE');
      if (chip === 'LOCALIZATION') return openCatalogueSurface('LANGUAGES');
      if (chip === 'SLATE') return setShowSlatePlanner(true);
      if (chip === 'ANALYTICS' && platform.launchCommit) {
        setAnalyticsInitialTab('CONTENT');
        return setShowAnalyticsCenter(true);
      }
      return selectSection('CONTENT');
    }
    if (division === 'PLATFORM') {
      if (chip === 'INFRA') return setShowCinematicBuild(true);
      if (chip === 'TECH') return setShowTechnologyCampus(true);
      if (chip === 'PRODUCTS') return setShowProductLab(true);
      if (chip === 'INCIDENTS' && incidentCommand.available) return setShowIncidentCommand(true);
      return selectSection('TECH');
    }
    if (division === 'AUDIENCE') {
      if (chip === 'MARKETS') { setAudienceInitialTab('MARKETS'); return selectSection('MARKET'); }
      if (chip === 'ANALYTICS') { setAudienceInitialTab('ANALYTICS'); return selectSection('MARKET'); }
      if (chip === 'GROWTH') return openPromotionWarRoom();
      if (chip === 'WARS') return setShowPlatformWars(true);
      if (chip === 'ACQUISITIONS') return setShowAcquisitionCommand(true);
      return selectSection('MARKET');
    }
    if (chip === 'LEADERSHIP') return setShowLeadershipSuite(true);
    if (chip === 'MARKETS') return setShowPublicMarkets(true);
    if (chip === 'FINANCE') return openFinanceRoom();
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

  const openLaunchDestination = (destination: StreamingLaunchDestination) => {
    if (destination === 'FINANCE') return openFinanceRoom('CAPITAL', 'INJECT');
    const defineStep = DEFINE_STEP_BY_DESTINATION[destination];
    if (defineStep) {
      setDefineLaunchMode('OPENING');
      setDefineLaunchInitialStep(defineStep);
      setShowDefineLaunch(true);
      return;
    }
    if (destination === 'OPENING_NIGHT') return openCinematicPremiere();
    setShowCinematicBuild(true);
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
      onOpenFinance={() => openFinanceRoom()}
      onOpenTitle={title => {
        setTitleDossierInitialProjectId(title.id);
        setShowTitleDossier(true);
      }}
      onSeeAll={() => selectSection('CONTENT')}
      onLaunch={() => platform.infrastructureSetup ? openCinematicPremiere() : setShowCinematicBuild(true)}
      onOpenLaunchTrack={track => {
        if (track === 'DEFINE_LAUNCH') {
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep(undefined);
          setShowDefineLaunch(true);
        } else setShowCinematicBuild(true);
      }}
      onOpenLaunchDestination={openLaunchDestination}
    />
  );

  /* renderContent / renderTech / renderMarket / renderCompany lived here and
     were never called: renderSection below replaced all four with the
     cinematic desks. ~625 lines of unreachable UI, including a second
     founder-capital console that duplicated the Raise term sheet's FOUNDER
     door — which is why capital injection appeared to have no home at all.
     The canonical path is every treasury affordance -> Studio Finance. */

  const renderSection = () => {
    if (activeSection === 'CONTENT') return (
      <StreamingContentDesk
        brand={commandDeckBrand}
        state={cinematicContentState}
        initialTab={contentInitialTab}
        onAddContent={() => setShowContentMarket(true)}
        onReviewCatalogue={() => openCatalogueSurface('COVERAGE')}
        onOpenSlate={() => setShowSlatePlanner(true)}
        onBack={() => {
          if (catalogueReturnToLaunch) {
            setCatalogueReturnToLaunch(false);
            setDefineLaunchInitialStep('CATALOGUE');
            setShowDefineLaunch(true);
          } else selectSection('HOME');
        }}
        onOpenTitle={title => {
          setTitleDossierInitialProjectId(title.id);
          setShowTitleDossier(true);
        }}
        entryRoutes={[
          {
            id: 'LICENSE',
            eyebrow: 'RIGHTS MARKET',
            title: 'License released titles',
            description: 'Negotiate a temporary streaming window for a completed film or series.',
            status: 'CONTENT MARKET',
            onSelect: () => setShowContentMarket(true),
          },
          {
            id: 'ORIGINAL',
            eyebrow: 'NEW PRODUCTION',
            title: 'Commission an Original',
            description: 'Order a new project and send it into a real production-house workflow.',
            status: 'PRODUCTION REQUIRED',
            onSelect: () => setShowOriginalCommissioning(true),
          },
          {
            id: 'OWNED',
            eyebrow: 'YOUR PRODUCTION HOUSE',
            title: 'Bring from my studio',
            description: 'Link released titles you already control without inventing an internal sale.',
            status: eligibleOwnedStreamingTitles.length ? `${eligibleOwnedStreamingTitles.length} RELEASED` : 'NO RELEASED TITLES',
            disabled: eligibleOwnedStreamingTitles.length === 0,
            onSelect: () => openStarterCatalogueRoute(0),
          },
          {
            id: 'CATALOGUE',
            eyebrow: 'LIBRARY ACQUISITION',
            title: 'Acquire a catalogue',
            description: 'Purchase a packaged library and its negotiated rights in one transaction.',
            status: 'CONTENT MARKET',
            onSelect: () => setShowContentMarket(true),
          },
        ]}
        onRenew={() => setShowRightsExchange(true)}
        onLapse={() => setShowRightsExchange(true)}
        localization={{
          providers: platform.localizationOperations.providers.filter(item => item.status === 'CONTRACTED').length,
          facilities: platform.localizationOperations.facilities.filter(item => item.status === 'ACTIVE').length,
          planned: platform.localizationOperations.jobs.filter(item => item.status === 'PLANNED').length,
          inProgress: platform.localizationOperations.jobs.filter(item => item.status === 'IN_PROGRESS').length,
          ready: platform.localizationOperations.jobs.filter(item => item.status === 'READY').length,
          assets: platform.localizationOperations.titleLanguageAssets.length,
        }}
        onOpenLocalization={() => openCatalogueSurface('LANGUAGES')}
      />
    );
    if (activeSection === 'TECH') return (
      <>
        <StreamingPlatformDesk
          brand={commandDeckBrand}
          state={cinematicNetworkState}
          treasury={platform.treasuryCash}
          onBack={() => selectSection('HOME')}
          onAddCity={() => setShowCinematicBuild(true)}
          onBuild={() => setShowTechnologyCampus(true)}
          onCancelBuild={() => setShowTechnologyCampus(true)}
          onToggleProduct={() => setShowProductLab(true)}
          onOpenChronicle={infrastructureChronicle.available && onUpdatePlayer
            ? () => setShowInfrastructureChronicle(true)
            : undefined}
        />
        {platform.milestoneKeys.includes('research-unlock:giga-campus') ? (
          <button type="button" className="hq-giga-campus-launcher" onClick={() => setShowCampusConstruction(true)}>
            <Building2 size={19} /><span><small>OWNED INFRASTRUCTURE</small><strong>Giga Campus</strong></span><ChevronRight size={18} />
          </button>
        ) : null}
      </>
    );
    if (activeSection === 'MARKET') return (
      <StreamingAudienceDesk
        brand={commandDeckBrand}
        state={cinematicAudienceState}
        initialTab={audienceInitialTab}
        onBack={() => selectSection('HOME')}
        onNewCampaign={() => openPromotionWarRoom()}
        onObjective={() => openPromotionWarRoom()}
        marketOperations={platform.marketOperations}
        onManageMarkets={() => {
          setDefineLaunchMode(platform.launchCommit ? 'EXPANSION' : 'OPENING');
          setDefineLaunchInitialStep('MARKETS');
          setShowDefineLaunch(true);
        }}
      />
    );
    if (activeSection === 'COMPANY') return (
      <StreamingBoardroom
        brand={commandDeckBrand}
        founderName={player.name}
        state={cinematicBoardroomState}
        onBack={() => selectSection('HOME')}
        onHire={() => setShowLeadershipSuite(true)}
        onIssueEquity={() => openFinanceRoom('CAPITAL', 'EQUITY')}
        onFileIpo={() => setShowPublicMarkets(true)}
        onOpenLegacy={() => setShowLegacyOffice(true)}
        onOpenFinance={() => openFinanceRoom()}
        onOpenTable={() => setShowLeadershipSuite(true)}
        onOpenOwnership={() => openFinanceRoom('CAPITAL', 'EQUITY')}
        onOpenBrief={() => setShowOperationsOffice(true)}
      />
    );
    return renderHome();
  };

  if (showDefineLaunch && onUpdatePlayer) {
    return (
      <StreamingDefineLaunchWizard
        player={player}
        onUpdatePlayer={persist}
        onClose={() => setShowDefineLaunch(false)}
        onOpenFinance={() => {
          setShowDefineLaunch(false);
          openFinanceRoom('CAPITAL', 'INJECT');
        }}
        onOpenCatalogue={() => {
          setShowDefineLaunch(false);
          setCatalogueReturnToLaunch(true);
          if (platform.starterCatalog) openCatalogueSurface('PROGRAM');
          else setShowContentMarket(true);
        }}
        onOpenContentDesk={() => {
          setShowDefineLaunch(false);
          setCatalogueReturnToLaunch(true);
          setContentInitialTab('LIBRARY');
          selectSection('CONTENT');
        }}
        onOpenBuild={() => {
          setShowDefineLaunch(false);
          setShowCinematicBuild(true);
        }}
        onOpenPricing={() => {
          setShowDefineLaunch(false);
          setShowCinematicPricing(true);
        }}
        onOpenTechnology={() => {
          setShowDefineLaunch(false);
          setShowTechnologyCampus(true);
        }}
        mode={defineLaunchMode}
        initialStep={defineLaunchInitialStep}
        initialDraft={launchDraftRef.current}
        onDraftChange={(draft) => { launchDraftRef.current = draft; }}
      />
    );
  }

  if (showCinematicBuild && !showCinematicPricing && !showFinanceRoom) {
    return (
      <StreamingBuildExperience
        brand={commandDeckBrand}
        inputs={buildInputs}
        sel={buildSelection}
        result={buildRunResult}
        built={builtPlacements}
        builtFacilities={builtFacilities}
        isLive={Boolean(platform.launchCommit)}
        onResult={recordBuildRehearsal}
        onCommit={commitCinematicBuild}
        quoteSelection={quoteCinematicBuild}
        onOpenNight={openCinematicPremiere}
        onOpenContent={() => {
          setShowCinematicBuild(false);
          setActiveSection('CONTENT');
        }}
        onOpenDefine={(step) => {
          setShowCinematicBuild(false);
          if (step === 'FUND') {
            openFinanceRoom('CAPITAL', 'INJECT');
            return;
          }
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep(step);
          setShowDefineLaunch(true);
        }}
        onChange={updateBuildSelection}
        onBack={() => setShowCinematicBuild(false)}
        pricing={{
          label: platform.serviceConfiguration.pricing.streams.includes('ads')
            ? platform.serviceConfiguration.pricing.streams.includes('subs') ? 'Subscription + adverts' : 'Ad-supported'
            : 'Subscription',
          arpu: platform.serviceConfiguration.pricing.plans.length
            ? `$${(platform.serviceConfiguration.pricing.plans.reduce((sum, plan) => sum + plan.monthly, 0) / platform.serviceConfiguration.pricing.plans.length).toFixed(2)}`
            : 'PENDING',
          reach: platform.serviceConfiguration.pricingApproach ? 'DEFINED' : 'PENDING',
          problems: platform.serviceConfiguration.pricingApproach ? 0 : 1,
          sellable: platform.serviceConfiguration.pricing.streams.includes('subs')
            ? platform.serviceConfiguration.pricing.plans.length
            : platform.serviceConfiguration.pricing.streams.length,
        }}
        onOpenPricing={() => {
          setShowCinematicBuild(false);
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep('PRICING');
          setShowDefineLaunch(true);
        }}
        funding={{
          borrowed: platform.debtPrincipal,
          soldPct: Math.max(0, 100 - platform.founderOwnershipPercent),
          own: platform.finance.capitalActions
            .filter(action => action.type === 'FOUNDER_CONTRIBUTION')
            .reduce((sum, action) => sum + action.amount, 0),
        }}
        onRaise={() => openFinanceRoom('CAPITAL', 'INJECT')}
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

  if (showFinanceRoom) {
    return (
      <StreamingFinanceRoom
        brand={commandDeckBrand}
        player={player}
        initialTab={financeInitialTab}
        initialCapitalView={financeInitialCapitalView}
        onInjectCapital={injectFinanceCapital}
        onAcceptInvestment={acceptFinanceInvestment}
        onOpenBuild={() => {
          setShowFinanceRoom(false);
          setShowCinematicBuild(true);
        }}
        onOpenBank={() => {
          setShowFinanceRoom(false);
          onOpenBank?.();
        }}
        onOpenLeadership={() => {
          setShowFinanceRoom(false);
          setShowLeadershipSuite(true);
        }}
        onOpenPublicMarkets={() => {
          setShowFinanceRoom(false);
          setShowPublicMarkets(true);
        }}
        onOpenMarket={() => {
          setShowFinanceRoom(false);
          selectSection('MARKET');
        }}
        onOpenTitle={titleId => {
          setShowFinanceRoom(false);
          setTitleDossierInitialProjectId(titleId);
          setShowTitleDossier(true);
        }}
        onClose={() => setShowFinanceRoom(false)}
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
          onOpenProduct={() => {
            setShowTechnologyCampus(false);
            setShowProductLab(true);
          }}
          onOpenCampusConstruction={() => {
            setShowTechnologyCampus(false);
            setShowCampusConstruction(true);
          }}
        />
      ) : null}
      {showCampusConstruction ? (
        <StreamingCampusConstruction
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={() => setShowCampusConstruction(false)}
          onOpenResearch={() => {
            setShowCampusConstruction(false);
            setShowTechnologyCampus(true);
          }}
          onOpenInfrastructure={() => {
            setShowCampusConstruction(false);
            setShowCinematicBuild(true);
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
          onOpenFinance={() => {
            setShowLeadershipSuite(false);
            openFinanceRoom('CAPITAL', 'EQUITY');
          }}
        />
      ) : null}
      {showContentMarket && !showOriginalCommissioning && !showCatalogSetup && !showRightsExchange ? (
        <StreamingContentMarket
          player={player} brand={commandDeckBrand} onUpdatePlayer={persist}
          initialOfferId={initialContentMarketOfferId}
          returnToLaunch={catalogueReturnToLaunch}
          onClose={() => {
            setShowContentMarket(false);
            if (catalogueReturnToLaunch) {
              setCatalogueReturnToLaunch(false);
              setDefineLaunchInitialStep('CATALOGUE');
              setShowDefineLaunch(true);
            } else { setContentInitialTab('LIBRARY'); selectSection('CONTENT'); }
          }}
          onOpenFinance={() => openFinanceRoom('CAPITAL', 'INJECT')}
          onCommission={() => setShowOriginalCommissioning(true)}
          onResumeLegacy={() => { setCatalogSurface('SETUP'); setCatalogSetupInitialStep(undefined); setShowCatalogSetup(true); }}
          onExistingNegotiations={() => setShowRightsExchange(true)}
          onReview={() => {
            if (platform.starterCatalog) { setShowContentMarket(false); openCatalogueSurface('PROGRAM'); }
            else setCompanyFeedback('Add a title to establish your opening catalogue.');
          }}
        />
      ) : null}
      {showCatalogSetup ? catalogSurface === 'DESK' && platform.starterCatalog ? (
        <StreamingOpeningCatalogueDesk
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={closeCatalogSetup}
          initialTab={catalogDeskInitialTab}
          onOpenRightsMarket={() => { setShowCatalogSetup(false); setShowContentMarket(true); }}
          onOpenSlate={() => { setShowCatalogSetup(false); setShowSlatePlanner(true); }}
          onOpenFinance={() => { openFinanceRoom('CAPITAL', 'INJECT'); }}
          onOpenTechnology={() => { setShowCatalogSetup(false); setShowTechnologyCampus(true); }}
        />
      ) : (
        <StreamingCatalogSetup
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={closeCatalogSetup}
          initialStep={catalogSetupInitialStep}
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
      {showOriginalsStudio ? (
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
      {showRightsExchange ? (
        <StreamingRightsExchange
          player={player}
          onUpdatePlayer={next => persist(!next.ownedStreamingPlatform.starterCatalog && next.ownedStreamingPlatform.catalogProjectIds.length ? establishContentMarketCatalogue(next) : next)}
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
            setAnalyticsInitialTab('AUDIENCE');
            setShowAnalyticsCenter(true);
          }}
          onOpenLeadership={() => {
            setShowPlatformWars(false);
            setShowLeadershipSuite(true);
          }}
          onOpenTechnology={() => {
            setShowPlatformWars(false);
            setShowTechnologyCampus(true);
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
            openFinanceRoom();
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
      {showInfrastructureChronicle && infrastructureChronicle.available ? (
        <StreamingInfrastructureChronicle
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowInfrastructureChronicle(false)}
          onOpenIncidentCommand={() => {
            setShowInfrastructureChronicle(false);
            setShowIncidentCommand(true);
          }}
          onOpenAnalytics={() => {
            setShowInfrastructureChronicle(false);
            setAnalyticsInitialTab('TECH');
            setShowAnalyticsCenter(true);
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
          initialMode={analyticsInitialTab === 'CONTENT' ? 'ANALYST' : 'CEO'}
          initialAnalystTab={analyticsInitialTab}
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
