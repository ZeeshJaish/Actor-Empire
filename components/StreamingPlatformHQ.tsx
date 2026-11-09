import { hasStreamingPlus } from '../services/streamingPlusPack';
import { runTaskAd } from '../services/forcedAds';
import { getStreamingTitleOpening } from '../services/streamingEarlyAccess';
import { getTitleRating } from '../services/titleRating';
import { payOffStreamingEstate } from '../services/streamingEstatePlan';
import { ChairSubtitleContext } from './streaming-transplant/RoomSubtitle';
import { setStreamingProposedTicker } from '../services/streamingTicker';
import { getStreamingHqViewingSpotlight } from '../services/streamingAudienceMetrics';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useStreamingView } from './streaming-transplant/useStreamingView';
import { advanceStreamingPresentationCursor } from '../services/streamingPresentationInputs';
import {Building2, ChevronRight, Clapperboard, Compass, Crown, Film, Globe2, Home, Layers3, LockKeyhole, Play, RadioTower, Server, ShieldCheck, Sparkles, WalletCards, X, type LucideIcon} from 'lucide-react';
import type {
  CampaignFormatId,
  OwnedStreamingLaunchRehearsalSnapshot,
  OwnedStreamingLaunchMarketingDraft,
  Player,
  StreamingRecommendationObjective,
  StreamingHqSection,
  StreamingDefineLaunchStepId,
  StreamingLogoKey,
  StreamingOpeningProgrammeFocus,
  StreamingTechId,
  StreamingTechnologyBranch,
  StreamingTechnologyCampusBranch,
  StreamingTeamAction,
  StreamingLaunchCapacityPlan,
} from '../types';
import {
  STREAMING_HQ_SECTIONS,
  STREAMING_HQ_TOUR_STEPS,
  advanceStreamingHqTour,
  beginStreamingHqTour,
  getStreamingHqSnapshot,
  replayStreamingHqTour,
  rewindStreamingHqTour,
  skipStreamingHqTour,
  visitStreamingHqSection,
  type StreamingHqTourMode,
} from '../services/streamingHq';
import StreamingHqTour from './StreamingHqTour';
import { markOwnedStreamingCinematicStatus } from '../services/ownedStreamingPlatform';
import StreamingCatalogSetup from './StreamingCatalogSetup';
import OriginalsDesk from './originals/OriginalsDesk';
import CommissionWizard from './originals/CommissionWizard';
import OriginalTitleDetail from './originals/OriginalTitleDetail';
import { decideStreamingOriginalFuture } from '../services/streamingOriginalsBusiness';
import AudienceReportScreen from './originals/AudienceReportScreen';
import { getActiveAudienceReport, getScriptGapFit } from '../services/originalsAudienceReport';
import { getLiveOriginalPitches } from '../services/originalsPitches';
import StreamingLaunchBlueprintReview from './StreamingLaunchBlueprintReview';
import { StreamingBuildLockNotice } from './StreamingShelfNotice';
import { getStreamingOpeningLock } from '../services/streamingOpeningLock';
import type { StreamingIdentPreviewId } from '../services/streamingIdentAudio';
import { gameWeekLabel } from '../services/gameWeek';
import { openingNightInputs, openingNightTitles } from './streaming-transplant/opening-night/nightInputs';
import { streamingPlatformBrand } from './streaming-transplant/streamingPlatformBrand';
import StreamingSlatePlanner from './StreamingSlatePlanner';
import StreamingViewerMode from './StreamingViewerMode';
import StreamingLaunchReceipt from './StreamingLaunchReceipt';
import StreamingAnalyticsCenter from './StreamingAnalyticsCenter';
import StreamingTitleDossier from './StreamingTitleDossier';
import StreamingRightsExchange, { type ExchangeTab as RightsExchangeTab } from './StreamingRightsExchange';
import { resolveStreamingRightsRenewal } from '../services/streamingRightsCalendar';
import { autoFillStreamingSlate, clearStreamingSlatePlans, getStreamingSlateFallback, scheduleStreamingSlateTitle, STREAMING_SLATE_REFUSAL_COPY, unscheduleStreamingSlateTitle } from '../services/streamingSlateProgramming';
import StreamingTechnologyCampus from './StreamingTechnologyCampus';
import StreamingCampusConstruction from './StreamingCampusConstruction';

/* #188: the listing's own host; MARKETS replaced the Public markets desk */
import StreamingListingHost, { beginStreamingListing } from './StreamingListingHost';
import StreamingApprovalTable from './streaming-transplant/StreamingApprovalTable';
import type { StreamingApprovalVote } from '../services/streamingApproval';
import { getStreamingApprovalMeeting, settleStreamingApproval, type StreamingApprovalCall, type StreamingApprovalMeeting } from '../services/streamingApprovalMeeting';
import { acceptStreamingSaleBid, getStreamingSaleView, hireStreamingSaleBankers, rejectStreamingSaleBids, voteDownStreamingSaleBid } from '../services/streamingCompanySale';
import { getStreamingStepDownView, replaceStreamingCeo, returnAsStreamingCeo, stepDownFromStreamingCompany, streamingChairMayAct } from '../services/streamingStepDown';
import { getStreamingChairRule } from '../services/streamingChair';
import { payStreamingFounderBonus, setStreamingDividend, setStreamingFounderSalary, takeStreamingMoneyOut } from '../services/streamingYourMoney';
import { acceptStreamingStakeOffer, declineStreamingStakeOffer, hireStreamingStakeBankers } from '../services/streamingControl';
import StreamingIncidentCommand from './StreamingIncidentCommand';
import StreamingVisualScene from './StreamingVisualScene';
import AccessibleDialog from './AccessibleDialog';
import {
  getStreamingDayOneMarket,
  getStreamingDayOneRegionIds,
} from '../services/streamingDayOneMarkets';
import { getStreamingBuildMarketAccess } from '../services/streamingBuildMarketAccess';
import {
  PlatformHQ as StreamingPlatformCommandDeck,
  type DivisionId as StreamingCommandDivisionId,
  type HqEvent as StreamingCommandEvent,
  type HqState as StreamingCommandDeckState,
  type ServiceTitle as StreamingCommandServiceTitle,
} from './streaming-transplant/StreamingPlatformCommandDeck';
import {
  brandColor as streamingBrandColor,
  cityById as streamingCityById,
  type Brand as StreamingTransplantBrand,
  type RegionId as StreamingRegionId,
} from './streaming-transplant/StreamingBrandVisuals';
import { ContentDesk as StreamingContentDesk } from './streaming-transplant/StreamingContentExperience';
import { PlatformDesk as StreamingPlatformDesk, type PlatformDeskOffer, type PlatformDeskTab, type PlatformProduct } from './streaming-transplant/StreamingNetworkExperience';
import { AudienceDesk as StreamingAudienceDesk, type AudienceTab } from './streaming-transplant/StreamingAudienceExperience';
import { CampaignStudio } from './campaigns/studio/CampaignStudio';
import { streamingCampaignBook } from '../services/campaigns/streamingCampaigns';
import { launchRateCard } from '../services/campaigns/launchCampaignRates';
import { AUDIENCE_ATLAS_WARMUP } from './streaming-transplant/AudienceAtlas';
import { warmNetworkMap } from './streaming-transplant/NetworkMap';
import { Boardroom as StreamingBoardroom } from './streaming-transplant/StreamingBoardroomExperience';
import { callStreamingInvestorRound, getStreamingOwnershipView } from '../services/streamingInvestorOffers';
import { appointStreamingBoardDirector, removeStreamingBoardDirector, renewStreamingBoardDirector } from '../services/streamingBoard';
import { buyOutStreamingInvestor, startStreamingBuyback } from '../services/streamingOwnShares';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { getStreamingCashSummary } from '../services/streamingStudioFinance';
import { castStreamingShareholderVote, holdStreamingEarningsCall, issueStreamingPublicGuidance } from '../services/streamingPublicMarkets';
import type { BoardroomTeamActions } from './streaming-transplant/BoardroomTeam';
import type { BoardroomTab } from './streaming-transplant/StreamingBoardroomExperience';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
  STREAMING_PERFORMANCE_TIER_LABELS,
  STREAMING_STRATEGIC_IDENTITY_LABELS,
  getStreamingQuarterSeasonCycle,
} from '../services/streamingQuarterSeason';
import {
  approveStreamingTeamCard,
  declineStreamingTeamCard,
  dismissStreamingTeamExecutive,
  getStreamingTeamView,
  getStreamingTeamWaitingCount,
  nameStreamingTeamSuccessor,
  hireStreamingTeamCandidate,
  walkAwayFromStreamingCandidate,
  setStreamingTeamJobMode,
  setStreamingTeamLimits,
  trainStreamingTeamExecutive,
} from '../services/team/streamingTeam';
import { ViewerApp as StreamingViewerApp } from './streaming-transplant/StreamingViewerExperience';
import { StreamingBrandStudio } from './streaming-transplant/StreamingBrandStudio';
import { applyStreamingBrandLook, getStreamingBrandStudioView, rebrandStreamingIdent } from '../services/streamingBrandStudio';
import { streamingLaunchUnlockLock } from '../services/streamingLaunchUnlocks';
import { resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import { getStreamingWeeklyChartView } from '../services/streamingWeeklyChart';
import {
  derive as deriveStreamingBuild,
  presetPlacements as streamingPresetPlacements,
  type BuildSel as StreamingBuildSelection,
  type RunResult as StreamingBuildRunResult,
} from './streaming-transplant/StreamingBuildoutExperience';
import StreamingBuildExperience from './streaming-transplant/StreamingBuildWizardExperience';
import { summarizeStreamingBuildPricing } from '../services/streamingCommercialOffers';
import StreamingFinanceRoom from './streaming-transplant/StreamingFinanceRoom';
import StreamingContentMarket from './StreamingContentMarket';
import { establishContentMarketCatalogue } from '../services/streamingContentMarket';
import StreamingDefineLaunchWizard from './StreamingDefineLaunchExperience';
import StreamingOpeningProgramme, { type StreamingOpeningProgrammeTab } from './streaming-transplant/StreamingOpeningProgramme';
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
  getStreamingCatalogProjectIds,
  getEligibleOwnedStreamingTitles,
  getStreamingCatalogLicenseStatus,
} from '../services/streamingCatalog';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
  orderStreamingNetworkRegion,
  previewStreamingNetworkOrder,
  speedUpStreamingNetworkOrder,
  type StreamingNetworkOrderResult,
} from '../services/streamingNetworkOrders';
import { fibreWeeklyHoldCost } from '../services/streamingFibreLadder';
import type { StreamingNetworkDeskHooks } from './streaming-transplant/NetworkDeskBoard';
import { updateWorldStreamingCustomerAccessPolicy } from '../services/worldEconomy/worldStreamingCustomers';
import { forecastWorldStreamingBuildDemand, forecastWorldStreamingLaunchPricing } from '../services/worldEconomy/worldStreamingPricingForecast';
import { getStreamingPlatformHeadline, getStreamingPlatformOfferView } from '../services/streamingPlatformOffer';
import { getStreamingNetworkMapView } from '../services/streamingNetworkMapView';
import { getStreamingContentAvailability, getStreamingPlayableCatalogProjectIds, resolveStreamingCatalogueReadTitle, createStreamingCatalogueReadContext } from '../services/streamingContentAvailability';
import { getStreamingOriginalLiveStatus } from '../services/streamingOriginals';
import { getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite, setStreamingProductLinePaused, type StreamingProductActionResult } from '../services/streamingProductSuite';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { getStreamingLocalizationDesk } from '../services/streamingLocalizationDesk';
import {
  STREAMING_LOCALIZATION_REFUSAL_COPY,
  contributeStreamingLocalizationEnergy,
  streamingLocalizationLevelName,
  streamingLocalizationRegionName,
  unlockStreamingLocalizationRegion,
  type StreamingLocalizationActionResult,
} from '../services/streamingLocalizationResearch';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { getStreamingTechDefinition, resolveStreamingPlatformTechDebt } from '../services/streamingTechTreeCatalogue';
import {
  STREAMING_TECH_REFUSAL_COPY,
  completeStreamingTechVersion,
  contributeStreamingTechEnergy,
  streamingTechVersionLabel,
  unlockStreamingTech,
  type StreamingTechActionResult,
} from '../services/streamingTechTree';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import {
  acceptStreamingCelebrityInvestment,
  declineStreamingCelebrityInvestment,
  getStreamingLeadershipSuite,
} from '../services/streamingLeadershipGovernance';
import { getStreamingCompetitiveWorld } from '../services/streamingCompetitiveWorld';
import { getStreamingIncidentCommand } from '../services/streamingCrisisSecurity';
import { getStreamingIncidentAlert, getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { repairStreamingIncident } from '../services/streamingIncidentRepair';
import {
  createDefaultStreamingInfrastructureDraft,
  getSuggestedStreamingNetworkPlacements,
  getStreamingInfrastructureForecast,
  getCanonicalStreamingInfrastructureDraftForecast,
  saveStreamingInfrastructureRehearsal,
  saveStreamingInfrastructureDraft,
  validateStreamingInfrastructureDraft,
  commitStreamingInfrastructureSetup,
} from '../services/streamingInfrastructure';
import {
  aggregateStreamingFacilities,
  migratePlacementsToStreamingFacilities,
} from '../services/streamingFacilities';
import { reconstructStreamingRegionPlans } from '../services/streamingRegionalNetworkPlan';
import { commitOwnedStreamingLaunch,
  getStreamingLaunchReadiness } from '../services/streamingLaunch';
import {
  isStreamingDefineLaunchWizardMilestone,
  getStreamingLaunchBudgetView,
  getStreamingLaunchDefinitionSignature,
  getStreamingLaunchProgramView,
  saveStreamingPricingPlan,
  saveStreamingStorefrontPlan,
  type StreamingLaunchDestination,
} from '../services/streamingLaunchProgram';
import { resolveLinkedBudgetDestination } from './studio-finance/finance/budgetLinks';
import {
  STREAMING_LAUNCH_MARKETING_CHANNELS,
  forecastStreamingLaunchMarketing,
  getStreamingLaunchMarketingRecommendations,
  type StreamingLaunchMarketingInput,
} from '../services/streamingLaunchMarketing';
import {
  saveOwnedStreamingLaunchMarketingDraft,
} from '../services/streamingLaunchMarketingLifecycle';
import {
  commissionStreamingOpeningProgramme,
  getStreamingOpeningCommissionQuote,
  getStreamingOpeningProgrammeFocus,
  getStreamingOpeningProgrammeView,
} from '../services/streamingOpeningProgramme';
import { beginStreamingMarketClearance, resolveStreamingMarketRequirement, resumeStreamingMarketClearance, saveStreamingMarketPlan } from '../services/streamingMarkets';
import { quoteStreamingMarketFilingEnergy } from '../services/streamingMarketFilingQuote';
import { deriveStreamingNetworkCoverage } from '../services/streamingNetworkCoverage';
import type { MarketEntryActions } from './streaming-transplant/AudienceMarketEntry';
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
  onTrustedMarketUpdate?: (player: Player) => void;
  onBack: () => void;
  onReturnToGame?: () => void;
  onOpenProductionHouse?: () => void;
  onOpenOriginalProduction?: (target: { studioId: string; scriptId: string; commissionId: string }) => void;
  onOpenBank?: () => void;
  /** #75: STATUS opens the Platform room on its STATUS tab (the incident popup's "Open STATUS") */
  initialDestination?: 'HOME' | 'FINANCE' | 'STATUS' | 'TEAM' | 'OWNERSHIP' | 'SLATE';
  initialContentMarketOfferId?: string;
  onContentMarketOfferConsumed?: () => void;
}

/* the welcome's room row, in the headquarters' own order: Audience, Content, Platform, Boardroom */
const WELCOME_ROOMS: StreamingHqSection[] = ['MARKET', 'CONTENT', 'TECH', 'COMPANY'];

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

const stableHue = (key: string): number => (
  [...key].reduce((sum, character) => ((sum * 31) + character.charCodeAt(0)) % 360, 53)
);

function LogoMark({ logoKey }: { logoKey: StreamingLogoKey }) {
  if (logoKey === 'SIGNAL_RING') return <RadioTower size={24} />;
  if (logoKey === 'SPOTLIGHT') return <Sparkles size={24} />;
  if (logoKey === 'WORDMARK') return <Crown size={24} />;
  return <Play size={24} fill="currentColor" />;
}

/* The roadmap phase a checklist item came from is a development label, not
   player copy; the badge says the item is still to do. */
function FutureBadge({ phase: _phase }: { phase: number }) {
  return <span className="hq-future-badge">TO DO</span>;
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

/* the Engineering tracks that have a Technology Campus lab to open */
const STREAMING_CAMPUS_BRANCHES = new Set<string>(['DELIVERY_CAPACITY', 'RELIABILITY', 'DATA_RECOMMENDATIONS', 'SECURITY', 'CONTENT_OPERATIONS']);

/** #126: why a product from the old Product Lab could not be paused or resumed, in the player's words */
const PRODUCT_PAUSE_REFUSAL: Partial<Record<NonNullable<StreamingProductActionResult['reason']>, string>> = {
  SAME_WEEK: 'It changed this week. Try again next week.',
  STAFF_REQUIRED: 'Not enough product staff to bring it back.',
  NOT_FOUND: 'That product is not running.',
  ALREADY_LAUNCHED: 'Nothing changed.',
};

/* #204: while someone else runs the company, every room still opens, a slim line says who runs it, and only what a chair
   may do reaches the save; anything else says who runs it */
const ChairAllowContext = React.createContext<(run: () => void) => void>(run => run());
/* #229: an action that needs someone else's yes opens the table; the action runs after the count, on what the count wrote */
interface TableRequest { vote: StreamingApprovalVote; run: (next: Player) => { player: Player; changed: boolean; message?: string }; no?: (next: Player) => Player }
const ApprovalTableContext = React.createContext<(request: TableRequest) => void>(() => undefined);
const CHAIR_NOTE: React.CSSProperties = {
  position: 'fixed', left: 16, right: 16, bottom: 'calc(env(safe-area-inset-bottom, 0px) + 84px)', zIndex: 10000, padding: '10px 14px', borderRadius: 12,
  font: "700 12px/1.4 'Inter',system-ui,sans-serif", textAlign: 'center', color: '#eef0f5', background: 'rgba(18,21,30,.97)', border: '1px solid rgba(246,215,143,.35)', pointerEvents: 'none',
};

/* the rooms' own buttons that change something: stopped before they run, so a room never says "Fix under way" for a fix
   that cannot happen (the save's guard below catches whatever these words miss) */
const CHAIR_STOPPED = /^(repair|fix\b|wait it out|take it down|file takedowns|let it run|order|upgrade|level|renew|license|commission|buy\b|bid|launch|start|stop|extend|set\b|pay\b|complete|add\b|remove|install|apply|save|confirm|pause|resume|change pricing|put money|take money|run |greenlight|sign\b)/i;

export default function StreamingPlatformHQ(props: React.ComponentProps<typeof StreamingPlatformHQInner>) {
  const rule = getStreamingChairRule(props.player);
  const open = useRef(false);
  const [note, setNote] = useState<string | null>(null);
  const noteTimer = useRef<number | undefined>(undefined);
  const [table, setTable] = useState<{ request: TableRequest; meeting: StreamingApprovalMeeting } | null>(null);
  const openTable = useCallback((request: TableRequest) => {
    setTable({ request, meeting: getStreamingApprovalMeeting(props.player, request.vote.ask, request.vote.context) });
  }, [props.player]);
  const tableCounted = (call: StreamingApprovalCall | null) => {
    const { request, meeting } = table!;
    const counted = settleStreamingApproval(props.player, meeting, call);
    const done = counted.carried ? request.run(counted.player) : null;
    const next = done?.changed ? done.player : !counted.carried && request.no ? request.no(counted.player) : counted.player;
    allow(() => props.onUpdatePlayer?.(next));
    return { carried: counted.carried, message: done?.message?.replace(/\.$/, '') || request.vote.context.title };
  };
  const allow = useCallback((run: () => void) => {
    open.current = true;
    try { run(); } finally { open.current = false; }
  }, []);
  const say = () => {
    if (!rule) return;
    setNote(rule.note);
    window.clearTimeout(noteTimer.current);
    noteTimer.current = window.setTimeout(() => setNote(null), 2400);
  };
  const guard = <T extends ((next: Player) => void) | undefined>(write: T): T => {
    if (!write || !rule) return write;
    return ((next: Player) => {
      if (open.current) { write(next); return; }
      say();
    }) as T;
  };
  return (
    <ChairAllowContext.Provider value={allow}>
      <ApprovalTableContext.Provider value={openTable}>
      <ChairSubtitleContext.Provider value={rule?.subtitle ?? null}>
      <div style={{ display: 'contents' }} onClickCapture={rule ? event => {
        const button = (event.target as HTMLElement).closest?.('button');
        /* #220: your own money is yours to move, in the chair too; its rules are in the service */
        if (button && !button.closest('[data-chair-ok]') && CHAIR_STOPPED.test((button.innerText || '').trim())) {
          event.preventDefault();
          event.stopPropagation();
          say();
        }
      } : undefined}>
        <StreamingPlatformHQInner {...props} onUpdatePlayer={guard(props.onUpdatePlayer)} onTrustedMarketUpdate={guard(props.onTrustedMarketUpdate)} />
      </div>
      {note && <div style={CHAIR_NOTE} role="status">{note}</div>}
      {table && <StreamingApprovalTable key={table.meeting.ask.kind} meeting={table.meeting} onCounted={tableCounted} onClose={() => setTable(null)} />}
      </ChairSubtitleContext.Provider>
      </ApprovalTableContext.Provider>
    </ChairAllowContext.Provider>
  );
}

function StreamingPlatformHQInner({ player, onUpdatePlayer, onTrustedMarketUpdate, onBack, onReturnToGame, onOpenOriginalProduction, onOpenProductionHouse, onOpenBank, initialDestination = 'HOME', initialContentMarketOfferId, onContentMarketOfferConsumed }: Props) {
  const projectionSourceRef = useRef<ReturnType<typeof advanceStreamingPresentationCursor> | undefined>(undefined);
  projectionSourceRef.current = advanceStreamingPresentationCursor(projectionSourceRef.current, player);
  const readPlayer: Player = projectionSourceRef.current.source;
  const buildForecastSourceRef = useRef<ReturnType<typeof advanceStreamingPresentationCursor> | undefined>(undefined);
  buildForecastSourceRef.current = advanceStreamingPresentationCursor(buildForecastSourceRef.current, player, 'BUILD_FORECAST');
  const buildForecastPlayer: Player = buildForecastSourceRef.current.source;
  const readPlatform = readPlayer.ownedStreamingPlatform;
  const readIdentity = readPlatform.identity!;
  const catalogueContextRef = useRef<ReturnType<typeof createStreamingCatalogueReadContext> | undefined>(undefined);
  const catalogueContext = useStreamingView(() => {
    const context = createStreamingCatalogueReadContext(readPlayer, catalogueContextRef.current);
    catalogueContextRef.current = context;
    return context;
  }, [readPlayer]);
  const platform = player.ownedStreamingPlatform;
  const constructionSetup = platform.pendingInfrastructureSetup
    || (!platform.launchCommit ? platform.infrastructureSetup : null);
  const identity = platform.identity!;
  const snapshot = useStreamingView(() => getStreamingHqSnapshot(readPlayer), [readPlayer]);
  const launchProgram = useStreamingView(() => getStreamingLaunchProgramView(readPlayer, catalogueContext()), [readPlayer]);
  const openingProgramme = useStreamingView(() => getStreamingOpeningProgrammeView(readPlayer, catalogueContext()), [readPlayer]);
  const launchBudget = useStreamingView(() => getStreamingLaunchBudgetView(readPlayer, catalogueContext()), [readPlayer]);
  const technologyCampus = useStreamingView(() => getStreamingTechnologyCampus(readPlayer), [readPlayer]);
  const productSuite = useStreamingView(() => getStreamingProductSuite(readPlayer), [readPlayer]);
  const openingCatalogue = useStreamingView(() => getStreamingOpeningCatalogueView(readPlayer, catalogueContext()), [readPlayer]);
  const eligibleOwnedStreamingTitles = useStreamingView(() => getEligibleOwnedStreamingTitles(readPlayer), [readPlayer]);
  const leadershipSuite = useStreamingView(() => getStreamingLeadershipSuite(readPlayer), [readPlayer]);
  const competitiveWorld = useStreamingView(() => getStreamingCompetitiveWorld(readPlayer), [readPlayer]);
  const incidentCommand = useStreamingView(() => getStreamingIncidentCommand(readPlayer), [readPlayer]);
  const latestWeeklySnapshot = readPlatform.weeklyHistory.at(-1) || null;
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
  /* #252: the desk reads its tab when it mounts, and it stays mounted under the market */
  const [contentDeskOpening, setContentDeskOpening] = useState(0);
  /* the map's region and open country, so the Audience room comes back to them; a ref for the same reason as the tab below */
  const audienceMapMemory = useRef<{ regionId: string | null; countryId: string | null }>({ regionId: null, countryId: null });
  const [audienceEntryRequest, setAudienceEntryRequest] = useState<{ tab: 'CHOOSE' | 'CLEARANCE' } | null>(null);
  const [campaignOperations, setCampaignOperations] = useState(false);
  const [networkOperations, setNetworkOperations] = useState(false);
  const [audienceInitialTab, setAudienceInitialTab] = useState<AudienceTab>('ANALYTICS');
  /* #137: the Audience tab last open. A title page or a campaign replaces the room; closing it remounts the room on
     this tab. A ref, so a tab change inside the room does not re-render the HQ. */
  const audienceTabMemory = useRef<AudienceTab | null>(null);
  const openAudienceTab = (tab: AudienceTab) => { audienceTabMemory.current = tab; setAudienceInitialTab(tab); };
  const [platformInitialTab, setPlatformInitialTab] = useState<PlatformDeskTab>('OFFER');
  /* bumped to reopen the Platform room on a tab even when it is already open */
  const [platformDeskKey, setPlatformDeskKey] = useState(0);
  /* the tech the Tech tab opens on, when a locked plan step sent the player there */
  const [platformTechFocus, setPlatformTechFocus] = useState<StreamingTechId | null>(null);
  const [showWelcome, setShowWelcome] = useState(onboarding.status === 'NOT_STARTED');
  const [showTechnologyCampus, setShowTechnologyCampus] = useState(false);
  /* where the Technology Campus opens: a branch's lab from Tech's Engineering list, the research
     still under way from its row; every other opener gets the Campus Map */
  const [campusInitial, setCampusInitial] = useState<{ view?: 'LAB' | 'RESEARCH'; branch?: StreamingTechnologyCampusBranch }>({});
  useEffect(() => { if (!showTechnologyCampus) setCampusInitial({}); }, [showTechnologyCampus]);
  const [showCampusConstruction, setShowCampusConstruction] = useState(false);
  const [showCatalogSetup, setShowCatalogSetup] = useState(false);
  const [showContentMarket, setShowContentMarket] = useState(Boolean(initialContentMarketOfferId));
  const [contentMarketInitialTab, setContentMarketInitialTab] = useState<'ALL' | 'OWNED' | undefined>(undefined);
  const [catalogueReturnToLaunch, setCatalogueReturnToLaunch] = useState(false);
  const [catalogSetupInitialStep, setCatalogSetupInitialStep] = useState<0 | 2 | undefined>(undefined);
  /* #281: every door to Originals lands on the Desk */
  const [showOriginalsDesk, setShowOriginalsDesk] = useState(false);
  const [showAudienceReport, setShowAudienceReport] = useState(false);
  const [showCommissionWizard, setShowCommissionWizard] = useState(false);
  const [originalDetailId, setOriginalDetailId] = useState<string | null>(null);
  const [originalDetailNotice, setOriginalDetailNotice] = useState('');
  const [commissionPitchId, setCommissionPitchId] = useState<string | null>(null);
  const [showRightsExchange, setShowRightsExchange] = useState(false);
  const [rightsExchangeInitialTab, setRightsExchangeInitialTab] = useState<RightsExchangeTab>('MARKET');
  const [showAcquisitionCommand, setShowAcquisitionCommand] = useState(false);
  /* #146: the Campaign Studio, and the subject it opens the builder on */
  const [campaignStudio, setCampaignStudio] = useState<{ subject: { kind: 'SERVICE' | 'TITLE' | 'UNIVERSE' | 'FRANCHISE'; id: string } | null; campaignId?: string } | null>(null);
  /* #173, #188: MARKETS' Ring the bell opens the listing */
  const [showListing, setShowListing] = useState(false);
  const [showIncidentCommand, setShowIncidentCommand] = useState(false);
  const [showSlatePlanner, setShowSlatePlanner] = useState(false);
  const [showOriginalReveal, setShowOriginalReveal] = useState(Boolean(pendingOriginalReveal));
  const [showViewerMode, setShowViewerMode] = useState(false);
  /* #116: the brand studio, opened from the HQ logo */
  const [showBrandStudio, setShowBrandStudio] = useState(false);
  const [showAnalyticsCenter, setShowAnalyticsCenter] = useState(false);
  const [analyticsInitialTab, setAnalyticsInitialTab] = useState<'AUDIENCE' | 'FINANCE' | 'TECH' | 'CONTENT'>('AUDIENCE');
  const [showTitleDossier, setShowTitleDossier] = useState(false);
  const [titleDossierInitialProjectId, setTitleDossierInitialProjectId] = useState<string | null>(null);
  /* #150: the Originals Studio can open on one title's original (a title page's Season 2, spin-off, licence) */
  const [showDefineLaunch, setShowDefineLaunch] = useState(false);
  const [defineLaunchMode, setDefineLaunchMode] = useState<'OPENING' | 'EXPANSION'>('OPENING');
  const [defineLaunchInitialStep, setDefineLaunchInitialStep] = useState<StreamingDefineLaunchStepId | undefined>(undefined);
  const [defineLaunchInitialSheet, setDefineLaunchInitialSheet] = useState<'money' | 'plan' | undefined>(undefined);
  const [showCinematicBuild, setShowCinematicBuild] = useState(false);
  const [openingProgrammeTab, setOpeningProgrammeTab] = useState<StreamingOpeningProgrammeTab>('BUILD');
  /* #253: a door the build has closed */
  const [buildLockNotice, setBuildLockNotice] = useState(false);
  const [showOpeningProgramme, setShowOpeningProgramme] = useState(false);
  /* true from a fresh build commission until its break (if any) has closed: the build screen stays up meanwhile, so the
     opening programme (the result) never opens under the ad */
  const [buildResultHeld, setBuildResultHeld] = useState(false);
  const [openingProgrammeFocus, setOpeningProgrammeFocus] = useState<StreamingOpeningProgrammeFocus>('OVERVIEW');
  const [buildInitialSheet, setBuildInitialSheet] = useState<'money' | 'build' | undefined>(undefined);
  const [showFinanceRoom, setShowFinanceRoom] = useState(initialDestination === 'FINANCE');
  const [financeInitialTab, setFinanceInitialTab] = useState<'SNAPSHOT' | 'CAPITAL'>('SNAPSHOT');
  const [financeInitialCapitalView, setFinanceInitialCapitalView] = useState<'DESK' | 'INJECT' | 'EQUITY' | 'YOUR_MONEY'>('DESK');
  const [showCinematicPremiere, setShowCinematicPremiere] = useState(Boolean(pendingLaunchReveal));
  /* A launch committed in this mounted session can finish its cinematic. A
     queued reveal reopened from a save must show immutable launch facts, not
     send an already-live platform through the pre-launch gate again. */
  const [premiereStartedHere, setPremiereStartedHere] = useState(false);
  const [showCinematicStock, setShowCinematicStock] = useState(false);
  const [buildRunResult, setBuildRunResult] = useState<StreamingBuildRunResult | null>(null);

  useEffect(() => {
    if (showDefineLaunch && defineLaunchInitialSheet) setDefineLaunchInitialSheet(undefined);
  }, [defineLaunchInitialSheet, showDefineLaunch]);

  useEffect(() => {
    if (showCinematicBuild && buildInitialSheet) setBuildInitialSheet(undefined);
  }, [buildInitialSheet, showCinematicBuild]);
  const buildCommittedPlayerRef = useRef<Player | null>(null);
  const [companyFeedback, setCompanyFeedback] = useState('');

  useEffect(() => {
    if (!initialContentMarketOfferId) return;
    setShowContentMarket(true);
    onContentMarketOfferConsumed?.();
  }, [initialContentMarketOfferId, onContentMarketOfferConsumed]);

  /* Build the Audience map's geometry while the HQ sits idle, one small step
     per idle slot, so the first tap into the Audience room doesn't pay for it. */
  useEffect(() => {
    const requestIdle = (globalThis as any).requestIdleCallback as ((cb: () => void, options?: { timeout?: number }) => number) | undefined;
    const cancelIdle = (globalThis as any).cancelIdleCallback as ((handle: number) => void) | undefined;
    /* then the Platform room's network map: its view and its merged shapes */
    const steps = [...AUDIENCE_ATLAS_WARMUP, () => { if (platform.launchCommit) warmNetworkMap(platformNetworkView()); }];
    let handle = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      if (requestIdle) handle = requestIdle(runStep, { timeout: 4000 });
      else timer = setTimeout(runStep, 400);
    };
    const runStep = () => {
      steps.shift()?.();
      if (steps.length) schedule();
    };
    schedule();
    return () => {
      if (handle && cancelIdle) cancelIdle(handle);
      if (timer) clearTimeout(timer);
    };
  }, []);

  /* #166: the Boardroom opens on the tab a chip names (TEAM, MONEY, OWNERSHIP, M&A) */
  const [boardroomTab, setBoardroomTab] = useState<BoardroomTab>('MONEY');
  const [boardroomVisit, setBoardroomVisit] = useState(0);
  const openBoardroom = (tab: BoardroomTab) => {
    setBoardroomTab(tab);
    setBoardroomVisit(visit => visit + 1);
    selectSection('COMPANY');
  };

  const openFinanceRoom = (
    tab: 'SNAPSHOT' | 'CAPITAL' = 'SNAPSHOT',
    capitalView: 'DESK' | 'INJECT' | 'EQUITY' | 'YOUR_MONEY' = 'DESK',
  ) => {
    setFinanceInitialTab(tab);
    setFinanceInitialCapitalView(capitalView);
    setShowFinanceRoom(true);
  };

  const visualRegions = useStreamingView<StreamingRegionId[]>(() => {
    const mapRegion = (regionId: string): StreamingRegionId[] => {
      if (regionId === 'NORTH_AMERICA' || regionId === 'HOME_MARKET') return ['NORTH_AMERICA'];
      if (regionId === 'LATIN_AMERICA') return ['SOUTH_AMERICA'];
      if (regionId === 'EUROPE') return ['EUROPE'];
      if (regionId === 'SOUTH_ASIA' || regionId === 'EAST_ASIA') return ['ASIA'];
      if (regionId === 'MIDDLE_EAST_AFRICA') return ['AFRICA'];
      return [];
    };
    const active = readPlatform.competitiveWorld.regionalLaunches
      .filter(region => region.status === 'ACTIVE')
      .flatMap(region => mapRegion(region.regionId));
    const dayOne = getStreamingDayOneRegionIds(getStreamingBuildMarketAccess(readPlayer).countryIds) as StreamingRegionId[];
    const foundingRegion = streamingCityById(readIdentity.launchServerCityId)?.region || 'NORTH_AMERICA';
    return Array.from(new Set<StreamingRegionId>(dayOne.length ? dayOne : active.length ? active : [foundingRegion]));
  }, [readIdentity.launchServerCityId, readPlatform.competitiveWorld.regionalLaunches, readPlayer]);
  const buildMarketAccess = useStreamingView(() => getStreamingBuildMarketAccess(readPlayer), [readPlayer]);
  const buildMarkets = useStreamingView(() => {
    return buildMarketAccess().countryIds.flatMap(marketId => {
      const market = getStreamingDayOneMarket(marketId);
      return market ? [market] : [];
    });
  }, [buildMarketAccess]);
  const hasExplicitBuildMarkets = buildMarketAccess().editable;

  const initialInfrastructureDraft = platform.infrastructureSetupDraft
    || createDefaultStreamingInfrastructureDraft(player);
  const [buildSelection, setBuildSelection] = useState<StreamingBuildSelection>(() => ({
    placements: initialInfrastructureDraft.facilities?.length
      ? aggregateStreamingFacilities(initialInfrastructureDraft.facilities)
      : initialInfrastructureDraft.networkPlacements?.length
      ? initialInfrastructureDraft.networkPlacements.map(placement => ({ ...placement }))
      : [],
    facilities: initialInfrastructureDraft.facilities?.length
      ? initialInfrastructureDraft.facilities.map(facility => ({
        ...facility,
        lease: facility.lease ? { ...facility.lease } : undefined,
        rackGroups: facility.rackGroups?.map(group => ({
          ...group,
          migration: group.migration ? { ...group.migration } : undefined,
        })),
      }))
      : migratePlacementsToStreamingFacilities(initialInfrastructureDraft.networkPlacements || []),
    regionPlans: (initialInfrastructureDraft.regionPlans?.length
      ? initialInfrastructureDraft.regionPlans
      : reconstructStreamingRegionPlans(initialInfrastructureDraft.facilities?.length
        ? initialInfrastructureDraft.facilities
        : migratePlacementsToStreamingFacilities(initialInfrastructureDraft.networkPlacements || [])))
      .map(plan => ({
        ...plan,
        serverCounts: { ...plan.serverCounts },
      })),
    managementPolicy: initialInfrastructureDraft.managementPolicy,
    assistedPlanApproved: initialInfrastructureDraft.assistedPlanApproved,
    assistedPlanClass: initialInfrastructureDraft.assistedPlanClass,
    arch: initialInfrastructureDraft.strategy === 'CLOUD_FIRST'
      ? 'CLOUD'
      : initialInfrastructureDraft.strategy === 'OWNED_INFRASTRUCTURE'
        ? 'OWNED'
        : 'HYBRID',
    doctrine: 'STANDARD',
    campaign: 'NONE',
  }));

  const commandDeckBrand = useStreamingView<StreamingTransplantBrand>(() => streamingPlatformBrand(readPlatform, snapshot().reachLabel), [readIdentity, readPlatform.serviceConfiguration.storefrontLayoutId, snapshot]);

  /* both incident systems, counted from the save (#49): the HQ alert, the Platform card and its STATUS chip */
  const incidentAlert = useStreamingView(() => getStreamingIncidentAlert(readPlatform), [readPlatform]);
  const commandDeckState = useStreamingView<StreamingCommandDeckState>(() => {
    const absoluteWeek = getAbsoluteWeek(readPlayer.age, readPlayer.currentWeek);
    const headline = getStreamingPlatformHeadline(readPlayer);
    const latestPerformance = latestWeeklySnapshot?.operations?.titlePerformance ?? [];
    const performanceByProject = new Map(latestPerformance.map(item => [item.projectId, item]));
    const mostWatched = [...latestPerformance].sort((a, b) => b.viewingAccounts - a.viewingAccounts)[0];
    const activeRegions = readPlatform.competitiveWorld.regionalLaunches.filter(region => region.status === 'ACTIVE').length;
    const isPreLaunch = readPlatform.lifecycle === 'FOUNDING' && !readPlatform.launchCommit;
    const countryOperations = readPlatform.marketOperations.filter(operation => operation.scope === 'COUNTRY');
    const committedCountries = new Set(countryOperations
      .filter(operation => operation.status === 'ACTIVE' || (isPreLaunch && operation.status === 'READY'))
      .map(operation => operation.countryId));
    /* #95 (Zeesh: "HQ home pe stream capacity … wahi burst wala"): the capacity the Network page and the weekly close's
       peak load count, burst included, not the steady part alone */
    const currentCapacity = Math.max(0, readPlatform.capacity.burstConcurrentStreams);
    const openingMarkets = readPlatform.marketOperations.filter(operation => (
      operation.scope === 'COUNTRY'
      && operation.entryKind === 'OPENING'
      && operation.status !== 'EXITED'
    ));
    const clearedMarkets = openingMarkets.filter(operation => (
      ['INFRASTRUCTURE_PREPARATION', 'READY', 'ACTIVE'].includes(operation.status)
    ));
    // capacity and peak are both in load units since Phase 2 (an HD stream is 1)
    const capacityPressure = currentCapacity > 0
      ? (latestWeeklySnapshot?.operations?.peakLoadUnits ?? latestWeeklySnapshot?.operations?.peakConcurrentStreams ?? 0) / currentCapacity
      : 0;
    const originalProgress: Record<string, number> = {
      READY_FOR_GREENLIGHT: 0.1,
      GREENLIT: 0.25,
      IN_PRODUCTION: 0.58,
      DELIVERED: 0.86,
      RELEASED: 1,
    };
    const originalStage: Record<string, 'COMMISSIONED' | 'IN PRODUCTION' | 'DELIVERED' | 'SCHEDULED' | 'LIVE'> = {
      READY_FOR_GREENLIGHT: 'COMMISSIONED',
      GREENLIT: 'COMMISSIONED',
      IN_PRODUCTION: 'IN PRODUCTION',
      DELIVERED: 'DELIVERED',
      RELEASED: 'LIVE',
    };
    const slate = readPlatform.originalCommissions.slice(-5).reverse().map(commission => {
      const programmed = readPlatform.launchSlate?.entries.find(entry => entry.projectId === commission.canonicalProjectId);
      const status = getStreamingOriginalLiveStatus(readPlayer, commission);
      const live = commission.canonicalProjectId && getStreamingContentAvailability(readPlayer, commission.canonicalProjectId).status === 'LIVE';
      return {
        id: commission.id,
        title: commission.title,
        kind: 'ORIGINAL' as const,
        stage: live ? 'LIVE' as const : programmed && ['DELIVERED', 'RELEASED'].includes(status) ? 'SCHEDULED' as const : originalStage[status],
        progress: originalProgress[status],
        budget: commission.productionBudgetCap,
        releaseWeek: programmed?.launchWeek,
        hue: stableHue(commission.id),
      };
    });
    const service = getStreamingPlayableCatalogProjectIds(readPlayer, catalogueContext(), 8).map(projectId => {
      const title = resolveStreamingCatalogueReadTitle(catalogueContext(), projectId);
      if (!title) return null;
      const performance = performanceByProject.get(projectId);
      const license = readPlatform.catalogLicenses.find(item => item.sourceProjectId === projectId);
      const isOriginal = readPlatform.originalCommissions.some(item => item.canonicalProjectId === projectId);
      const completionRate = performance?.completionRate ?? 0;
      const completion = completionRate <= 1 ? completionRate * 100 : completionRate;
      const status: StreamingCommandServiceTitle['status'] = !performance || performance.viewingAccounts <= 0
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
        rating: title.rating !== null ? clamp(title.rating, 0, 10) : getTitleRating(readPlayer, projectId),
        views: performance?.viewingAccounts ?? 0,
        completion: clamp(Math.round(completion), 0, 100),
        expiresIn: license && license.windowType !== 'PERMANENT'
          ? Math.max(0, license.expiresAtAbsoluteWeek - absoluteWeek) : undefined,
        perpetualLicense: license?.windowType === 'PERMANENT',
        hue: stableHue(projectId),
      } satisfies StreamingCommandServiceTitle;
    }).filter(Boolean) as StreamingCommandServiceTitle[];

    const events: StreamingCommandEvent[] = [];
    const openIncident = incidentAlert().first;
    if (openIncident) {
      /* #76 (Zeesh: "minimal look"): one slim line, what it is and where to answer it */
      events.push({
        id: 'INCIDENT',
        priority: 1,
        label: `${openIncident.major ? 'Major' : 'Minor'} incident`,
        line: `${openIncident.title}${openIncident.stage === 'REPAIRING' ? ' · being repaired' : openIncident.waiting ? ' · waiting it out' : ''}`,
        tone: openIncident.major ? 'urgent' : 'warn',
        meta: 'STATUS',
        compact: true,
      });
    }
    /* #219: while someone else runs it, the HQ says so; anything more urgent comes first */
    const chairRuleNow = getStreamingChairRule(readPlayer);
    if (chairRuleNow) {
      events.push({
        id: 'CHAIR',
        priority: 3,
        label: chairRuleNow.chair ? 'You chair the board' : 'You left the board',
        line: `${chairRuleNow.ceoName} runs ${readPlatform.identity?.name || 'the company'}`,
        tone: 'brand',
        meta: 'TEAM',
        compact: true,
      });
    }
    /* #200: someone on notice, and the chair they leave */
    const onNotice = readPlatform.leadership.appointments.find(item => item.status === 'ACTIVE' && item.notice);
    if (onNotice?.notice) {
      const weeks = Math.max(0, onNotice.notice.leavesAtAbsoluteWeek - absoluteWeek);
      events.push({
        id: 'TEAM_NOTICE',
        priority: 2,
        label: 'Notice',
        line: `${onNotice.nameAtAppointment} leaves ${weeks <= 0 ? 'this week' : `in ${weeks} week${weeks === 1 ? '' : 's'}`}`,
        tone: 'warn',
        meta: 'TEAM',
        compact: true,
      });
    }
    if (!readPlatform.launchCommit) {
      events.push({
        id: 'LAUNCH',
        priority: readPlatform.launchSlate ? 2 : 5,
        label: readPlatform.launchSlate ? 'Launch Command is standing by' : 'Opening night is not programmed',
        line: readPlatform.launchSlate ? 'Run the final forecast and make the go / no-go call.' : 'Complete the opening slate before committing the signal.',
        tone: readPlatform.launchSlate ? 'brand' : 'warn',
        meta: `${snapshot().completedChecklistItems}/${snapshot().checklist.length}`,
      });
    }
    /* #176 (Zeesh: "weekly brief hata do game se, even jo hamare dashboard me down me weekly brief dikhta wo bhi"):
       no weekly-brief bar once live; the bar shows an incident, or the launch before it */

    return {
      live: readPlatform.lifecycle === 'ACTIVE',
      built: Boolean(readPlatform.infrastructureSetup),
      tier: snapshot().reachLabel.toUpperCase(),
      territories: countryOperations.length ? committedCountries.size : Math.max(1, activeRegions + 1),
      reachLevel: snapshot().reachLevel,
      /* A service with no subscriptions is counted the way it earns: homes
         watching free, or buyers; its stats follow (see headline below). */
      subscribers: headline.value,
      subsDelta: readPlatform.metrics.netSubscriberMovement,
      audienceLabel: headline.kind === 'ACCOUNTS' ? undefined : headline.label,
      audienceNote: headline.kind === 'ACCOUNTS' ? undefined : headline.settled ? 'last settled week' : 'settles next week',
      treasury: readPlatform.treasuryCash,
      readiness: { done: launchProgram().completedCount, total: launchProgram().totalCount },
      launchProgram: readPlatform.launchCommit ? undefined : launchProgram(),
      /* #253: Zeesh (2026-11-05): both wizards done, one card that opens the waiting screen */
      openingBuild: (() => {
        const view = openingProgramme();
        if (readPlatform.launchCommit || !view.commissioned) return undefined;
        const asked = view.state === 'ACTION_REQUIRED';
        const ready = view.state === 'READY_TO_OPEN';
        return {
          tone: ready ? 'READY' as const : asked ? 'ASK' as const : 'BUILDING' as const,
          weeksLeft: view.remainingWeeks,
          percent: Math.round(view.progress * 100),
          head: ready ? 'Opening night is ready' : asked ? 'A government needs an answer' : `Opening night · ${view.earliestOpeningAbsoluteWeek === null ? 'date pending' : gameWeekLabel(view.earliestOpeningAbsoluteWeek)}`,
          line: ready ? 'Every crew is done' : `${view.citiesOnline} of ${view.cityCount} cities online`,
          citiesOnline: view.citiesOnline,
          cityCount: view.cityCount,
        };
      })(),
      nowPlaying: getStreamingHqViewingSpotlight(latestPerformance),
      stats: [
        /* ARPU, churn and engagement are subscription figures; without
           subscriptions they read $13, 100% and 100% off an empty account
           base, so those services show what they do earn and do. */
        ...(headline.kind === 'ACCOUNTS' || !readPlatform.launchCommit ? [
          { id: 'ARPU', label: 'ARPU', value: readPlatform.launchCommit ? formatMoney(readPlatform.metrics.averageRevenuePerUser) : 'PENDING', tone: readPlatform.launchCommit ? 'good' : 'pending' },
          { id: 'CHURN', label: 'CHURN', value: readPlatform.launchCommit ? `${(readPlatform.metrics.churnRate * 100).toFixed(1)}%` : 'PENDING', tone: readPlatform.metrics.churnRate > 0.055 ? 'bad' : readPlatform.launchCommit ? 'good' : 'pending' },
          { id: 'ENGAGEMENT', label: 'ENGAGEMENT', value: readPlatform.launchCommit ? `${Math.round(readPlatform.metrics.engagementRate * 100)}%` : 'PENDING', tone: readPlatform.launchCommit ? 'good' : 'pending' },
        ] as const : headline.kind === 'AD_HOMES' ? [
          { id: 'ARPU', label: 'AD REVENUE / WK', value: formatMoney(headline.revenueWeekly), tone: 'good' },
          { id: 'CHURN', label: 'HOURS WATCHED', value: headline.hoursWeekly.toLocaleString(), tone: 'good' },
          { id: 'ENGAGEMENT', label: 'AD IMPRESSIONS', value: headline.adImpressions.toLocaleString(), tone: 'good' },
        ] as const : [
          { id: 'ARPU', label: 'STORE REVENUE / WK', value: formatMoney(headline.revenueWeekly), tone: 'good' },
          { id: 'CHURN', label: 'RENTALS', value: headline.rentals.toLocaleString(), tone: 'good' },
          { id: 'ENGAGEMENT', label: 'PURCHASES', value: headline.purchases.toLocaleString(), tone: 'good' },
        ] as const),
        { id: 'CAPACITY', label: 'STREAM CAPACITY', value: currentCapacity > 0 ? currentCapacity.toLocaleString() : 'LEVEL 0', tone: capacityPressure >= 0.9 ? 'bad' : currentCapacity ? 'good' : 'pending' },
      ],
      slate,
      service,
      divisions: isPreLaunch ? [
        {
          id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Opening markets & clearance',
          statLabel: 'OPENING FOOTPRINT',
          stat: openingMarkets.length ? `${clearedMarkets.length}/${openingMarkets.length} CLEARED` : 'CHOOSE MARKETS',
          /* being built, a review in progress asks nothing of the player; only a government's question does */
          pressure: openingMarkets.length === 0 ? 'urgent' : openingProgramme().commissioned ? (openingProgramme().state === 'ACTION_REQUIRED' ? 'urgent' : 'calm') : clearedMarkets.length < openingMarkets.length ? 'watch' : 'calm',
          note: openingMarkets.length === 0 ? 'Opening markets are not defined.' : undefined,
          /* The room's own pages, as Content does it. Top 10 and Campaigns join
             after launch, when there is something in them. */
          chips: [
            { id: 'MARKETS', label: 'OPENING MARKETS', alert: openingMarkets.length === 0 || (openingProgramme().commissioned ? openingProgramme().state === 'ACTION_REQUIRED' : clearedMarkets.length < openingMarkets.length) },
            { id: 'ANALYTICS', label: 'ANALYTICS' },
            { id: 'REGIONS', label: 'REGIONS' },
          ],
        },
        {
          id: 'CONTENT', label: 'CONTENT', sub: 'Catalogue, Content Market & Originals',
          statLabel: 'OPENING CATALOGUE',
          stat: readPlatform.starterCatalog ? `${openingCatalogue().titles.length} TITLES · ${openingCatalogue().rightsReadyCountryCount}/${openingCatalogue().openingCountryCount} MARKETS` : 'NOT ASSEMBLED',
          pressure: !readPlatform.starterCatalog ? 'urgent' : openingCatalogue().rightsReady ? 'calm' : 'watch',
          note: !readPlatform.starterCatalog ? 'The opening shelves need a catalogue.' : undefined,
          chips: [
            { id: 'CATALOGUE', label: 'CATALOGUE', alert: !readPlatform.starterCatalog },
            { id: 'MARKETPLACE', label: 'CONTENT MARKET', locked: getStreamingOpeningLock(readPlayer).catalogueLocked },
            { id: 'ORIGINALS', label: 'ORIGINALS' },
            { id: 'RIGHTS', label: 'RIGHTS' },
            { id: 'LOCALIZATION', label: 'LOCALIZATION', alert: !openingCatalogue().qualityReady },
            { id: 'SLATE', label: 'SLATE' },
          ],
        },
        {
          id: 'PLATFORM', label: 'PLATFORM', sub: 'Offer, delivery, technology & product',
          statLabel: 'BUILD TRACK',
          stat: `${launchProgram().tracks.find(track => track.id === 'BUILD_PLATFORM')?.progressPercent ?? 0}% READY`,
          pressure: readPlatform.infrastructureSetup ? 'calm' : 'watch',
          note: !readPlatform.infrastructureSetup ? 'The delivery network is not commissioned.' : undefined,
          /* The Offer page reads the launch plan before launch and edits the
             live offer after it; pricing lives in this room, not Audience. */
          chips: [
            { id: 'OFFER', label: 'OFFER' },
            { id: 'INFRA', label: 'DELIVERY BUILD', alert: !readPlatform.infrastructureSetup },
            { id: 'TECH', label: 'TECHNOLOGY' },
            { id: 'PRODUCTS', label: 'PRODUCT' },
          ],
        },
        {
          id: 'BOARDROOM', label: 'BOARDROOM', sub: 'Treasury, capital & governance',
          statLabel: 'OPERATING TREASURY',
          stat: readPlatform.treasuryCash > 0 ? formatMoney(readPlatform.treasuryCash) : 'FUND REQUIRED',
          pressure: readPlatform.treasuryCash > 0 ? 'calm' : 'urgent',
          note: readPlatform.treasuryCash <= 0 ? 'The company exists, but cannot commit spending.' : undefined,
          chips: [
            { id: 'FINANCE', label: 'STUDIO FINANCE', alert: readPlatform.treasuryCash <= 0 },
            /* #166: the Leadership suite is TEAM */
            { id: 'TEAM', label: 'TEAM' },
          ],
        },
      ] : [
        /* #76 (Zeesh): the same order before and after launch: Audience, then Content, Platform, and the Boardroom last */
        {
          id: 'AUDIENCE', label: 'AUDIENCE', sub: 'Analytics, growth & competition',
          /* counted the way the service earns; churn is a subscription alarm */
          statLabel: headline.label, stat: readPlatform.launchCommit ? headline.value.toLocaleString() : 'PRE-LAUNCH',
          pressure: headline.kind === 'ACCOUNTS' && readPlatform.metrics.churnRate > 0.055 ? 'watch' : 'calm',
          note: headline.kind === 'ACCOUNTS' && readPlatform.metrics.churnRate > 0.055 ? 'Churn is above the comfort line.' : undefined,
          /* Every page inside the room, in the room's own order. Growth is the
             Campaigns page. #141: Platform Wars, the room it led to, is gone. */
          chips: [
            { id: 'ANALYTICS', label: 'ANALYTICS' },
            { id: 'MARKETS', label: 'MARKETS' },
            { id: 'WORLD', label: 'WORLD' },
            { id: 'CAMPAIGNS', label: 'CAMPAIGNS' },
            { id: 'TOP10', label: 'TOP 10' },
          ],
        },
        {
          id: 'CONTENT', label: 'CONTENT', sub: 'Catalogue, deals, Originals & performance',
          statLabel: 'CATALOGUE', stat: `${getStreamingCatalogProjectIds(readPlatform).length} TITLES`,
          pressure: !readPlatform.starterCatalog ? 'urgent' : (readPlatform.originalCommissions || []).length === 0 ? 'watch' : 'calm',
          note: !readPlatform.starterCatalog ? 'The opening shelves are empty.' : undefined,
          chips: [
            { id: 'CATALOGUE', label: 'CATALOGUE', alert: !readPlatform.starterCatalog },
            { id: 'MARKETPLACE', label: 'CONTENT MARKET' },
            { id: 'ORIGINALS', label: 'ORIGINALS' },
            { id: 'RIGHTS', label: 'RIGHTS', alert: !readPlatform.starterCatalog },
            { id: 'LOCALIZATION', label: 'LOCALIZATION', alert: readPlatform.localizationOperations.jobs.some(job => job.status !== 'READY') },
            { id: 'SLATE', label: 'SLATE', alert: !readPlatform.launchSlate },
            { id: 'ANALYTICS', label: 'ANALYTICS' },
          ],
        },
        {
          id: 'PLATFORM', label: 'PLATFORM', sub: 'Offer, network, technology & reliability',
          statLabel: 'CAPACITY', stat: currentCapacity > 0 ? `${currentCapacity.toLocaleString()} STREAMS` : 'LEVEL 0',
          pressure: incidentAlert().count > 0 ? 'urgent' : !readPlatform.infrastructureSetup || capacityPressure >= 0.82 ? 'watch' : 'calm',
          note: openIncident ? openIncident.stage === 'REPAIRING' ? 'An incident is being repaired.' : openIncident.waiting ? 'An incident is being waited out.' : 'An incident needs a response.' : undefined,
          chips: [
            { id: 'OFFER', label: 'OFFER' },
            { id: 'INFRA', label: 'NETWORK', alert: !readPlatform.infrastructureSetup },
            { id: 'TECH', label: 'TECHNOLOGY' },
            { id: 'PRODUCTS', label: 'PRODUCT' },
            { id: 'INCIDENTS', label: 'STATUS', alert: incidentAlert().count > 0 },
          ],
        },
        {
          /* #166 (plan §21.17): the Boardroom's own tabs; the team's in-tray is its alert */
          id: 'BOARDROOM', label: 'BOARDROOM', sub: 'Team, money & ownership',
          statLabel: 'TEAM', stat: `${streamingTeamSeatHolders(readPlatform.leadership.appointments).holders.size}/6 CHAIRS`,
          pressure: getStreamingTeamWaitingCount(readPlayer) > 0 || readPlatform.publicCompany.lifecycle === 'ROADSHOW' ? 'watch' : 'calm',
          note: getStreamingTeamWaitingCount(readPlayer) > 0
            ? `${getStreamingTeamWaitingCount(readPlayer)} waiting for you in the in-tray.` : undefined,
          chips: [
            { id: 'TEAM', label: 'TEAM', alert: getStreamingTeamWaitingCount(readPlayer) > 0 },
            { id: 'MONEY', label: 'MONEY' },
            { id: 'OWNERSHIP', label: 'OWNERSHIP' },
            { id: 'MARKETS', label: 'MARKETS' },
            /* buying companies is a Boardroom decision; it comes in a future update */
            { id: 'ACQUISITIONS', label: 'M&A · SOON' },
          ],
        },
      ],
      events,
    };
  }, [incidentAlert, incidentCommand, latestWeeklySnapshot, leadershipSuite, launchProgram, readPlatform, readPlayer, snapshot]);
  const cinematicContentState = useStreamingView(() => createCanonicalContentDeskState(readPlayer, catalogueContext()), [readPlayer]);
  const localizationDesk = useStreamingView(() => getStreamingLocalizationDesk(readPlayer, catalogueContext()), [readPlayer]);
  const techDesk = useStreamingView(() => getStreamingTechDesk(readPlayer), [readPlayer]);
  const cinematicNetworkState = useStreamingView(() => createCanonicalNetworkState(readPlayer), [readPlayer]);
  const statusBoard = useStreamingView(() => getStreamingStatusBoard(readPlayer), [readPlayer]);
  const cinematicAudienceState = useStreamingView(() => createCanonicalAudienceState(readPlayer), [readPlayer]);
  const cinematicBoardroomState = useStreamingView(() => createCanonicalBoardroomState(readPlayer), [readPlayer]);
  /* #165: the team's chairs, jobs, limits, in-tray and minutes */
  const teamView = useStreamingView(() => getStreamingTeamView(readPlayer), [readPlayer]);
  const cashSummary = useStreamingView(() => getStreamingCashSummary(readPlayer), [readPlayer]);
  /* #166: the latest 12-week board review, for MONEY */
  const boardReviewView = useStreamingView(() => {
    const cycle = getStreamingQuarterSeasonCycle(readPlayer);
    const latest = cycle.seasonReviews.at(-1) || null;
    return {
      weeksUntilNext: cycle.weeksUntilSeasonReview,
      latest: latest ? {
        quarter: latest.cycleNumber,
        tier: STREAMING_PERFORMANCE_TIER_LABELS[latest.performanceTier],
        tierId: latest.performanceTier,
        identity: STREAMING_STRATEGIC_IDENTITY_LABELS[latest.strategicIdentity],
        headline: latest.headline,
        verdict: latest.boardVerdict,
        hits: latest.hits,
        misses: latest.misses,
        subscribersNet: latest.subscriberNetMovement,
        revenue: latest.totalSubscriptionRevenue,
        cash: latest.totalCashContribution,
      } : null,
    };
  }, [readPlayer]);
  const cinematicViewerState = useStreamingView(() => createCanonicalViewerState(readPlayer, catalogueContext()), [readPlayer]);
  const buildPricing = useStreamingView(() => summarizeStreamingBuildPricing(readPlatform.serviceConfiguration.pricing),
    [readPlatform.serviceConfiguration.pricing]);
  const buildWorldDemand = useStreamingView(() => forecastWorldStreamingBuildDemand(
    buildForecastPlayer,
    buildForecastPlayer.ownedStreamingPlatform.serviceConfiguration.pricing,
    getStreamingBuildMarketAccess(buildForecastPlayer).countryIds.filter(id => Boolean(getStreamingDayOneMarket(id))),
    catalogueContext().player === buildForecastPlayer ? catalogueContext()
      : createStreamingCatalogueReadContext(buildForecastPlayer, catalogueContext()),
  ), [buildForecastPlayer]);
  const buildAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const buildInputs = useStreamingView(() => ({
    absoluteWeek: buildAbsoluteWeek,
    fibreState: readPlatform.fibre,
    treasury: readPlatform.treasuryCash,
    catalogueSpend: (readPlatform.catalogLicenses || []).reduce((sum, license) => sum + license.minimumGuarantee, 0),
    catalogueTitles: (readPlatform.catalogProjectIds || []).length,
    catalogueRights: {
      globalTitleCount: (readPlatform.starterCatalog?.ownedProjectIds || []).length
        + (readPlatform.originalCommissions || []).filter(original => {
          const status = getStreamingOriginalLiveStatus(readPlayer, original);
          return status === 'DELIVERED' || status === 'RELEASED';
        }).length,
      primaryMarketId: [...buildMarkets()]
        .sort((left, right) => right.streamingAudience - left.streamingAudience)[0]?.id || null,
      licensedTitles: (readPlatform.catalogLicenses || [])
        .filter(license => getStreamingCatalogLicenseStatus(license, buildAbsoluteWeek) === 'ACTIVE')
        .map(license => ({ territory: license.territory })),
    },
    originalsSpend: (readPlatform.originalCommissions || []).reduce((sum, original) => sum + original.productionFundingApplied, 0),
    originalsCount: (readPlatform.originalCommissions || []).length,
    defineLaunchPaid: readPlatform.costCommitments
      .filter(commitment => ['MARKET', 'SERVICE'].includes(commitment.category) && ['PAID', 'MIGRATED'].includes(commitment.status) && commitment.paidAmount > 0)
      .map(commitment => ({
        id: commitment.id,
        label: commitment.label,
        amount: commitment.paidAmount,
        note: commitment.category === 'MARKET' ? 'Define the Launch · market filing' : 'Define the Launch · service identity',
      })),
    defineLaunchChecks: (launchProgram().tracks.find(track => track.id === 'DEFINE_LAUNCH')?.milestones || [])
      .filter(isStreamingDefineLaunchWizardMilestone)
      .flatMap(milestone => {
        const step = DEFINE_STEP_BY_DESTINATION[milestone.destination];
        return step ? [{
          id: milestone.id,
          label: milestone.label,
          complete: milestone.complete,
          detail: milestone.complete ? 'Confirmed' : milestone.description,
          step,
        }] : [];
      }),
    premiereTitle: readPlatform.launchSlate?.entries[0]?.title
      || (readPlatform.originalCommissions || [])[0]?.title
      || 'First Original',
    regions: visualRegions(),
    coverageRegions: STREAMING_NETWORK_COVERAGE_REGIONS,
    markets: buildMarkets().map(market => ({
      id: market.id,
      country: market.country,
      region: market.regionId as StreamingRegionId,
      audience: market.streamingAudience,
      annualGrowthPercent: market.annualGrowthPercent,
      recommendedCityId: market.recommendedCityId,
      localizationNote: market.localizationNote,
    })),
    hasExplicitOpeningMarkets: hasExplicitBuildMarkets,
    marketPlanning: { editable: buildMarketAccess().editable, reason: buildMarketAccess().reason },
    recommendedPlacements: getSuggestedStreamingNetworkPlacements(
      buildMarkets().map(market => market.id),
      1,
      buildWorldDemand().likely,
    ),
    homeCityId: buildSelection.placements[0]?.cityId || null,
    audienceMul: 1,
    openingDemandForecast: {
      low: buildWorldDemand().low,
      likely: buildWorldDemand().likely,
      high: buildWorldDemand().high,
      byMarket: { ...buildWorldDemand().byMarket },
    },
    facilityMarketContextByCountryId: Object.fromEntries(Object.entries(readPlayer.world.worldPopulation?.countries || {}).map(([countryId, population]) => {
      const audience = readPlayer.world.worldAudienceEconomy?.countries?.[countryId];
      return [countryId, {
        absoluteWeek: buildAbsoluteWeek,
        purchasingPowerIndex: population.macro.purchasingPowerIndex,
        inflationPressure: population.macro.inflationPressure,
        consumerConfidence: population.macro.consumerConfidence,
        reliableInternetPercent: population.reliableInternetPercent,
        commercialHouseholds: audience?.commercialHouseholds || population.households,
      }];
    })),
    debtWeekly: (readPlatform.finance.loans || [])
      .filter(loan => loan.status === 'ACTIVE')
      .reduce((sum, loan) => sum + loan.outstandingPrincipal * loan.weeklyInterestRate, 0),
  }), [buildAbsoluteWeek, buildMarketAccess, buildMarkets, buildSelection.placements, buildWorldDemand, hasExplicitBuildMarkets, launchProgram, readPlatform, readPlayer.world.worldAudienceEconomy, readPlayer.world.worldPopulation, visualRegions]);
  const buildDerived = useStreamingView(
    () => deriveStreamingBuild(buildSelection, buildInputs()),
    [buildInputs, buildSelection],
  );
  const launchMarketingInput = useStreamingView<StreamingLaunchMarketingInput>(() => ({
    platformKey: readIdentity.slug || readPlayer.id,
    absoluteWeek: buildAbsoluteWeek,
    buildWeeks: Math.max(1, buildDerived().weeks),
    availableTreasury: readPlatform.treasuryCash,
    protectedOperatingCash: Math.max(0, buildDerived().weekly * 12),
    hasSellablePlan: buildPricing().sellable > 0,
    hasFlagshipOriginal: readPlatform.originalCommissions.some(original => (
      ['DELIVERED', 'RELEASED'].includes(getStreamingOriginalLiveStatus(readPlayer, original))
    )),
    pricingRevision: readPlatform.serviceConfiguration.revision,
    catalogueRevision: (readPlatform.launchSlate?.revision || 0) + readPlatform.catalogLicenses.length,
    localizationRevision: readPlatform.localizationOperations.jobs.length + readPlatform.localizationOperations.titleLanguageAssets.length,
    competitionRevision: readPlatform.competitiveWorld.weeklyRivalHistory.length,
    countries: buildMarkets().map(market => {
      const population = readPlayer.world.worldPopulation?.countries?.[market.id];
      const audience = readPlayer.world.worldAudienceEconomy?.countries?.[market.id];
      const competitionPressure = market.competition === 'FIERCE' ? .88 : market.competition === 'BUSY' ? .68 : .45;
      const catalogueCoverage = Math.min(1, Math.max(.08, (
        readPlatform.catalogProjectIds.length + readPlatform.catalogLicenses.length + readPlatform.originalCommissions.length
      ) / 24));
      return {
        countryId: market.id,
        countryName: market.country,
        reachableHouseholds: Math.max(1, audience?.commercialHouseholds || population?.households || Math.round(market.streamingAudience / 2.4)),
        baseConcurrentStreams: Math.max(0, buildWorldDemand().byMarket[market.id] || 0),
        conversionHeadroom: Math.max(.12, Math.min(.9, 1 - market.rivals.reduce((sum, rival) => sum + rival.watchSharePercent, 0) / 140)),
        mediaCostIndex: market.launchDifficulty === 'HARD' ? 1.35 : market.launchDifficulty === 'EASY' ? .72 : 1,
        purchasingPowerIndex: population?.macro.purchasingPowerIndex
          ? population.macro.purchasingPowerIndex / 100 : 1,
        consumerConfidence: population?.macro.consumerConfidence
          ? population.macro.consumerConfidence / 100 : .65,
        internetAccess: (population?.reliableInternetPercent || 72) / 100,
        localizationCoverage: Math.min(1, .42 + readPlatform.localizationOperations.titleLanguageAssets.length / Math.max(1, market.languages.length * 4)),
        catalogueCoverage,
        competitionPressure,
        priorAwareness: readPlatform.launchMarketingPlan?.countryAwareness[market.id] || .03,
      };
    }),
    channelAvailability: {
      /* #109 (plan §18.2, 11): every service has Phone and web apps from the start, so the device stores are always
         open (this asked for "Product Experience level 1", a research that no longer exists) */
      DEVICE_STORES: {
        available: true,
        efficiency: 1,
        reason: '',
      },
      TELCO_BUNDLES: {
        available: readPlatform.serviceConfiguration.pricing.streams.includes('sponsor')
          || readPlatform.technologyLevels.ADVERTISING_COMMERCE >= 1,
        efficiency: 1,
        reason: 'Enable commerce partnerships or research Advertising Commerce.',
      },
    },
  }), [buildAbsoluteWeek, buildDerived, buildDerived, buildMarkets, buildWorldDemand, buildPricing, readIdentity.slug, readPlatform, readPlayer]);
  const launchMarketing = useStreamingView(() => {
    const draft = readPlatform.launchMarketingDraft!;
    return {
      draft,
      recommendations: getStreamingLaunchMarketingRecommendations(launchMarketingInput()),
      forecast: forecastStreamingLaunchMarketing(launchMarketingInput(), draft),
      channels: STREAMING_LAUNCH_MARKETING_CHANNELS.map(channel => ({
        id: channel.id,
        label: channel.label,
        line: channel.line,
        available: launchMarketingInput().channelAvailability?.[channel.id]?.available !== false,
        reason: launchMarketingInput().channelAvailability?.[channel.id]?.reason,
      })),
      /* #151: the launch campaign builder works its forecast out as you go, and needs what an opening can push */
      forecastFor: (next: OwnedStreamingLaunchMarketingDraft) => forecastStreamingLaunchMarketing(launchMarketingInput(), next),
      /* #158: what each format and door costs a week in the opening countries, and a big night at its place */
      rateCardFor: (places?: Partial<Record<CampaignFormatId, string>>) => launchRateCard(readPlayer, launchMarketingInput().countries.map(country => country.countryId), places),
      hasFlagshipOriginal: launchMarketingInput().hasFlagshipOriginal,
      hasSellablePlan: launchMarketingInput().hasSellablePlan,
      priceHook: (() => {
        const pricing = buildPricing();
        if (pricing.sellable === 0) return null;
        if (/free/i.test(pricing.label)) return 'the free plan with ads';
        return pricing.priceLabel.startsWith('from ') ? `plans ${pricing.priceLabel.replace('/mo', ' a month')}` : pricing.priceLabel;
      })(),
      /* the opening title, and the opening catalogue's best-known titles, for the catalogue push's posters */
      ...openingNightTitles(readPlayer),
      serviceName: readIdentity.name || 'EMPIRE+',
      brandHue: commandDeckBrand().hue,
      accent: streamingBrandColor(commandDeckBrand()),
    };
  }, [launchMarketingInput, readPlatform.launchMarketingDraft, readPlatform.originalCommissions, readPlatform.catalogProjectIds, readPlatform.catalogLicenses, buildPricing]);
  const marketingBuildInputs = useStreamingView(() => ({
    ...buildInputs(),
    openingDemandForecast: {
      low: launchMarketing().forecast.concurrentStreams.low,
      likely: launchMarketing().forecast.concurrentStreams.likely,
      high: launchMarketing().forecast.concurrentStreams.high,
      byMarket: Object.fromEntries(launchMarketing().forecast.countryForecasts.map(country => [country.countryId, country.likelyConcurrentStreams])),
    },
  }), [buildInputs, launchMarketing]);
  const builtPlacements = useStreamingView(() => readPlatform.infrastructureSetup
    ? readPlatform.infrastructureSetup.networkPlacements?.length
      ? readPlatform.infrastructureSetup.networkPlacements.map(placement => ({ ...placement }))
      : streamingPresetPlacements(
        readPlatform.infrastructureSetup.capacityPackageId,
        visualRegions(),
        null,
      )
    : null,
  [readPlatform.infrastructureSetup, visualRegions]);
  const builtFacilities = useStreamingView(() => readPlatform.infrastructureSetup
    ? readPlatform.infrastructureSetup.facilities?.length
      ? readPlatform.infrastructureSetup.facilities.map(facility => ({ ...facility }))
      : migratePlacementsToStreamingFacilities(builtPlacements())
    : null,
  [builtPlacements, readPlatform.infrastructureSetup]);
  /* #90: the network as it stands, as Build's selection, for a live company's Network tab (the wizard's own
     selection follows the infrastructure draft) */
  const liveBuildSelection = useStreamingView<StreamingBuildSelection>(() => {
    const setup = readPlatform.infrastructureSetup;
    const facilities = builtFacilities() || [];
    return {
      placements: aggregateStreamingFacilities(facilities),
      facilities: facilities.map(facility => ({
        ...facility,
        lease: facility.lease ? { ...facility.lease } : undefined,
        rackGroups: facility.rackGroups?.map(group => ({ ...group, migration: group.migration ? { ...group.migration } : undefined })),
      })),
      regionPlans: (setup?.regionPlans?.length ? setup.regionPlans : reconstructStreamingRegionPlans(facilities))
        .map(plan => ({ ...plan, serverCounts: { ...plan.serverCounts } })),
      managementPolicy: setup?.managementPolicy,
      arch: setup?.strategy === 'CLOUD_FIRST' ? 'CLOUD' : setup?.strategy === 'OWNED_INFRASTRUCTURE' ? 'OWNED' : 'HYBRID',
      doctrine: 'STANDARD',
      campaign: 'NONE',
    };
  }, [builtFacilities, readPlatform.infrastructureSetup]);
  const cinematicDossier = useStreamingView<StreamingDossierTitle | null>(() => {
    if (!titleDossierInitialProjectId) return null;
    const performance = [...(readPlatform.weeklyHistory || [])]
      .reverse()
      .flatMap(snapshotValue => snapshotValue.operations?.titlePerformance || [])
      .find(item => item.projectId === titleDossierInitialProjectId);
    const catalogue = cinematicContentState().titles.find(item => item.id === titleDossierInitialProjectId);
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
      hue: commandDeckBrand().hue,
      logline: `The complete audience, commercial and lifecycle record for ${title}.`,
      status: catalogue?.status || 'ON THE SERVICE',
      /* #136: its place in this week's real Top 10 (#129, #135): in All, else in its own list (Films or Series) */
      chartRank: (() => {
        const lists = getStreamingWeeklyChartView(readPlayer).lists;
        const rankIn = (rows: typeof lists.ALL) => rows.find(row => row.mine && row.id === titleDossierInitialProjectId)?.rank;
        return rankIn(lists.ALL) ?? rankIn(lists.FILM) ?? rankIn(lists.SERIES);
      })(),
      rating: getTitleRating(readPlayer, titleDossierInitialProjectId) ?? undefined,
      rightsWeeksLeft: catalogue?.rights?.endsInWeeks,
      viewers: performance?.viewingAccounts || catalogue?.views || 0,
      opening: getStreamingTitleOpening(readPlayer, titleDossierInitialProjectId) ?? undefined,
      boxOffice: resolveStreamingCatalogueReadTitle(catalogueContext(), titleDossierInitialProjectId)?.gross ?? undefined,
      completion,
      /* #312: the real counts. This was viewers × 3% and × 1.5%, so the title's page said 189K new subs and this screen 288K for the same title and week */
      subsAcquired: Math.round(performance?.acquisitionAttributedAccounts ?? (performance?.viewingAccounts || 0) * 0.03),
      churnPrevented: Math.round(performance?.retentionAttributedAccounts ?? (performance?.viewingAccounts || 0) * 0.015),
      revenue: (performance?.attributedSubscriptionRevenue || 0)
        + (performance?.advertisingRevenue || 0) + (performance?.incrementalRevenue || 0),
      cost: (performance?.allocatedCashCost || 0) + (performance?.allocatedContentAmortization || 0),
      rightsInvestment: readPlatform.catalogLicenses
        .filter(license => license.sourceProjectId === titleDossierInitialProjectId)
        .reduce((total, license) => total + license.minimumGuarantee, 0),
      financialsAvailable: Boolean(performance),
      sources: sourceMix ? [
        { label: 'Homepage', pct: sourceMix.homepagePercent },
        { label: 'Recommendations', pct: sourceMix.recommendationsPercent },
        { label: 'Search', pct: sourceMix.searchPercent },
        { label: 'Direct', pct: sourceMix.directPercent },
      ] : [{ label: 'Platform discovery', pct: 100 }],
      journey: { steps: ['Acquired', 'Prepared', 'Scheduled', 'Live', 'Peak', 'Long tail'], at: performance ? Math.min(5, 3 + Math.floor(performance.weeksAvailable / 3)) : 2 },
      dna: [
        { label: 'Reach', value: Math.min(100, Math.round((performance?.viewingAccounts || 0) / Math.max(1, readPlatform.metrics.subscribers) * 100)) },
        { label: 'Completion', value: completion },
        { label: 'Retention', value: Math.round(readPlatform.metrics.engagementRate * 100) },
        { label: 'Acquisition', value: Math.min(100, Math.round((performance?.viewingAccounts || 0) / 10000)) },
        { label: 'Rewatch', value: Math.round((performance?.repeatViewingRate || 0) * (performance?.repeatViewingRate && performance.repeatViewingRate <= 1 ? 100 : 1)) },
      ],
      artwork: [{ id: 'canonical', hue: commandDeckBrand().hue, ctr: 5.4, live: true }],
      press: [{ id: 'canonical-summary', tag: 'LATEST', source: readIdentity.name, head: title, body: performance ? `${performance.viewingAccounts.toLocaleString()} accounts watched during the latest measured week.` : 'Performance reporting begins after release.' }],
      maturity: { have: performance?.weeksAvailable || 0, need: 8 },
    };
  }, [readPlayer, cinematicContentState, commandDeckBrand, readIdentity.name, readPlatform.catalogLicenses, readPlatform.metrics, readPlatform.weeklyHistory, titleDossierInitialProjectId]);
  const launchReadiness = useStreamingView(() => getStreamingLaunchReadiness(readPlayer, catalogueContext()), [readPlayer]);
  const cinematicPremiereInputs = useStreamingView<StreamingPremiereInputs>(() => openingNightInputs(readPlayer, {
    readiness: launchReadiness(),
    network: platformNetworkView(),
    flagship: launchMarketing().flagship ?? null,
    catalogue: launchMarketing().catalogue ?? [],
  }), [launchReadiness, readPlatform, readPlayer]);
  const stockQuote = useStreamingView(() => {
    const listing = readPlatform.publicCompany.listing;
    if (!listing) return null;
    const latestQuote = readPlatform.publicCompany.quoteHistory.at(-1);
    const firstPostListingSnapshot = (readPlatform.weeklyHistory || []).find(snapshotValue => snapshotValue.absoluteWeek >= listing.listedAtAbsoluteWeek);
    const weeklyNet = latestWeeklySnapshot?.operations?.netCashContribution || 0;
    return getStreamingStockQuote({
      closePrice: latestQuote?.close || listing.offerPrice,
      subsAtListing: firstPostListingSnapshot?.subscribers || readPlatform.metrics.subscribers,
      subs: readPlatform.metrics.subscribers,
      churnPct: readPlatform.metrics.churnRate * 100,
      techDebt: resolveStreamingPlatformTechDebt(readPlatform),
      treasury: readPlatform.treasuryCash,
      weeklyNet,
      marks: listing.governanceMarks?.length || 0,
    });
  }, [latestWeeklySnapshot, readPlatform]);

  /* A service's result comes from the live save, already migrated. The App's other door runs the whole save migration, which is for
     loads and imports: on a big company it cost about 200 ms on every update, and every tick of a dial. */
  const persist = (nextPlayer: Player) => {
    if (nextPlayer !== player) (onTrustedMarketUpdate || onUpdatePlayer)?.(nextPlayer);
  };
  /* #220: Your money is a page of Studio Finance › Capital */
  const openYourMoney = () => openFinanceRoom('CAPITAL', 'YOUR_MONEY');
  /* #204: what a chair may do goes through; the rest says who runs it. Selling, listing and replacing are yours at 51%, else the board's */
  const chairAllow = useContext(ChairAllowContext);
  const openTable = useContext(ApprovalTableContext);
  /* #229: the one way an approved action runs: straight through, or to the table first */
  const orTable = (
    result: { player: Player; changed: boolean; message?: string; vote?: StreamingApprovalVote },
    run: TableRequest['run'],
    no?: TableRequest['no'],
  ) => {
    if (result.vote) {
      openTable({ vote: result.vote, run, no });
      return { ok: true, message: 'That went to the table.' };
    }
    if (result.changed) chairAllow(() => persist(result.player));
    return { ok: result.changed, message: result.message || '' };
  };
  const chairRule = getStreamingChairRule(player);
  const chairOwnerCan = !chairRule || (chairRule.chair && streamingChairMayAct(platform));
  const chairActions = <T extends object>(actions: T, allowed: Array<keyof T>, ownerOnly: Array<keyof T> = []): T => {
    if (!chairRule) return actions;
    return Object.fromEntries(Object.entries(actions).map(([key, run]) => {
      if (typeof run !== 'function') return [key, run];
      const isOwner = ownerOnly.includes(key as keyof T);
      if (isOwner && !chairOwnerCan) return [key, () => ({ ok: false, message: chairRule.chair ? 'Under 51%, the board decides that: it needs 60 confidence.' : 'Off the board, you cannot do that.' })];
      if (!isOwner && !allowed.includes(key as keyof T)) return [key, () => ({ ok: false, message: chairRule.note })];
      return [key, (...args: unknown[]) => { let out: unknown; chairAllow(() => { out = (run as (...inner: unknown[]) => unknown)(...args); }); return out; }];
    })) as T;
  };
  // These callers use canonical streaming services against the migrated live
  // player. Preserve normal autosave while avoiding load/import migration on taps.
  const persistCanonical = (nextPlayer: Player) => {
    if (nextPlayer !== player) (onTrustedMarketUpdate || onUpdatePlayer)?.(nextPlayer);
  };
  /* Localization and tech actions can follow one another before the HQ re-renders
     (energy handed over, then Pause), so each reads the result of the last. */
  const localizationPlayerRef = useRef(player);
  localizationPlayerRef.current = player;
  const runLocalization = (
    action: (current: Player) => StreamingLocalizationActionResult,
    message: (result: StreamingLocalizationActionResult) => string,
  ) => {
    const result = action(localizationPlayerRef.current);
    if (!result.changed) return { ok: false, message: STREAMING_LOCALIZATION_REFUSAL_COPY[result.reason ?? 'UNKNOWN_REGION'] };
    localizationPlayerRef.current = result.player;
    persistCanonical(result.player);
    return { ok: true, message: message(result), completed: Boolean(result.completed) };
  };
  /* Platform room · Tech: unlock a tech with treasury cash, then raise its versions with energy. */
  const runTech = (
    action: (current: Player) => StreamingTechActionResult,
    message: (result: StreamingTechActionResult) => string,
  ) => {
    const result = action(localizationPlayerRef.current);
    if (!result.changed) return { ok: false, message: result.reason === 'NEEDS_EARLIER_TECH' && result.missing
      ? `Unlock ${result.missing} first.` : STREAMING_TECH_REFUSAL_COPY[result.reason ?? 'UNKNOWN_TECH'] };
    localizationPlayerRef.current = result.player;
    persistCanonical(result.player);
    return { ok: true, message: message(result), completed: Boolean(result.completed) };
  };
  /* #126: a product this save launched in the old Product Lab, paused or resumed on the PRODUCT tab, on the latest
     player like the tech actions; it changes from the next weekly close */
  const runProductPause = (product: PlatformProduct, paused: boolean) => {
    if (!product.lineId || product.lineId === 'CORE') return { ok: false, message: 'This product cannot be paused.' };
    const result = setStreamingProductLinePaused(localizationPlayerRef.current,
      product.lineId as Parameters<typeof setStreamingProductLinePaused>[1], paused);
    if (!result.changed) return { ok: false, message: PRODUCT_PAUSE_REFUSAL[result.reason ?? 'NOT_FOUND'] ?? 'Nothing changed.' };
    localizationPlayerRef.current = result.player;
    persistCanonical(result.player);
    return { ok: true, message: `${product.name} ${paused ? 'pauses' : 'is back'} from next week.` };
  };
  /* #90: a network order or speed-up on the latest player, like the tech actions */
  const runNetwork = (action: (current: Player) => StreamingNetworkOrderResult) => {
    const result = action(localizationPlayerRef.current);
    if (!result.changed) return { ok: false, message: result.message };
    localizationPlayerRef.current = result.player;
    persistCanonical(result.player);
    return { ok: true, message: result.message };
  };
  /* STATUS's repair (#50): Repair now, Fix or Wait it out, on the latest player like the tech actions */
  const runIncidentRepair = (incident: { source: 'CRISIS' | 'INFRASTRUCTURE'; id: string }, path: 'ENERGY' | 'FIX' | 'WAIT') => {
    const result = repairStreamingIncident(localizationPlayerRef.current, incident.source, incident.id, path);
    if (!result.changed) return { ok: false, message: result.message };
    localizationPlayerRef.current = result.player;
    persistCanonical(result.player);
    return { ok: true, message: result.message };
  };
  /* Opens the Platform room on a tab, even when it is already open on another;
     the Tech tab can open on one tech (a plan step's Go to Tech). */
  const openPlatformTab = (tab: PlatformDeskTab, techId: StreamingTechId | null = null) => {
    setPlatformInitialTab(tab);
    setPlatformTechFocus(techId);
    setPlatformDeskKey(key => key + 1);
    selectSection('TECH');
  };
  /* #92: a live company changes its network on the Network tab, region by region (plan §17.2); the Build wizard is for
     founding. Every way into Build (the INFRA chip, Finance, the campus, Define the Launch) lands there once it is live. */
  const openBuild = () => {
    if (platform.launchCommit && platform.infrastructureSetup) {
      setBuildInitialSheet(undefined);
      openPlatformTab('CAPACITY');
      return;
    }
    setShowCinematicBuild(true);
  };
  /* #75: the incident popup's "Open STATUS" lands on the Platform room's STATUS tab, once */
  const openedStatus = useRef(false);
  useEffect(() => {
    if (openedStatus.current || !readPlatform.launchCommit) return;
    /* #210: a decision's door opens its Boardroom room */
    if (initialDestination === 'TEAM' || initialDestination === 'OWNERSHIP') {
      openedStatus.current = true;
      openBoardroom(initialDestination === 'TEAM' ? 'TABLE' : 'OWNERSHIP');
      return;
    }
    /* #252: "Schedule it" lands on Content, on the Slate */
    if (initialDestination === 'SLATE') {
      openedStatus.current = true;
      setContentInitialTab('SLATE');
      setActiveSection('CONTENT');
      return;
    }
    if (initialDestination !== 'STATUS') return;
    openedStatus.current = true;
    openPlatformTab('STATUS');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDestination]);

  /* The Audience room's Enter New Markets page, after launch: the purse it
     shows and the canonical expansion services behind its three buttons. A
     filing adds the countries to the expansion plan (keeping every country
     already planned, filed or live) and files only the ones just picked. */
  const marketEntryActions = (): MarketEntryActions => {
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const plural = (count: number) => `${count} ${count === 1 ? 'country' : 'countries'}`;
    return {
      energy: player.energy.current,
      treasury: platform.treasuryCash,
      absoluteWeek,
      quoteEnergy: countryIds => quoteStreamingMarketFilingEnergy(countryIds),
      coverageOf: countryIds => {
        if (!countryIds.length) return {};
        const result = deriveStreamingNetworkCoverage({
          facilities: platform.infrastructureSetup?.facilities || [],
          openingCountryIds: countryIds,
          fibreState: platform.fibre,
        });
        return Object.fromEntries(result.countries.map(country => [country.countryId, country.grade]));
      },
      file: countryIds => {
        const ids = countryIds.filter(Boolean);
        if (!ids.length) return { ok: false, message: 'Pick at least one country.' };
        const already = platform.marketOperations
          .filter(operation => operation.entryKind === 'EXPANSION' && operation.countryId && operation.status !== 'EXITED')
          .map(operation => operation.countryId!);
        const planned = saveStreamingMarketPlan(player, Array.from(new Set([...already, ...ids])), 'EXPANSION');
        if (!planned.changed) {
          return { ok: false, message: planned.reason === 'NO_MARKETS' ? 'Those countries are already yours.' : 'The expansion plan could not be saved.' };
        }
        const filed = beginStreamingMarketClearance(planned.player, ids, 'EXPANSION');
        persistCanonical(filed.changed ? filed.player : planned.player);
        if (filed.reason === 'INSUFFICIENT_ENERGY') return { ok: false, message: `${filed.shortfall}E short. The pick is saved as a plan; file it when your energy is back.` };
        if (filed.reason === 'INSUFFICIENT_TREASURY') return { ok: false, message: `Treasury is short by ${formatMoney(filed.shortfall)}. The pick is saved and waiting for funds.` };
        if (!filed.changed) return { ok: false, message: 'Those markets are already in review or cleared.' };
        return { ok: true, message: `${formatMoney(filed.amount)} paid for ${plural(ids.length)}. Government review has started; it runs 4–6 weeks, all in parallel.` };
      },
      resolve: operationId => {
        const result = resolveStreamingMarketRequirement(player, operationId);
        if (result.reason === 'INSUFFICIENT_TREASURY') return { ok: false, message: `Treasury is short by ${formatMoney(result.shortfall)}.` };
        if (result.reason === 'INSUFFICIENT_ENERGY') return { ok: false, message: `${result.shortfall}E short for this follow-up.` };
        if (!result.changed) return { ok: false, message: 'This government request is no longer open.' };
        persistCanonical(result.player);
        return { ok: true, message: `${formatMoney(result.amount)} paid. The revised file is back in review.` };
      },
      reapply: operationId => {
        const result = resumeStreamingMarketClearance(player, operationId);
        if (result.reason === 'INSUFFICIENT_ENERGY') return { ok: false, message: `${result.shortfall}E short to refile.` };
        if (result.reason === 'TOO_EARLY') return { ok: false, message: 'The cooling period is still running. Come back after the next weeks.' };
        if (!result.changed) return { ok: false, message: 'This file cannot be resubmitted yet.' };
        persistCanonical(result.player);
        return { ok: true, message: 'Revised application filed. Review has resumed.' };
      },
    };
  };
  /* Built once per player, so the entry page's coverage reads are not redone on
     every unrelated HQ render. */
  const marketEntry = useStreamingView(() => (platform.launchCommit ? marketEntryActions() : undefined), [player]); // eslint-disable-line react-hooks/exhaustive-deps

  /* The Platform room's Offer page: the saved offer with what it earned at the
     last settlement, and the canonical services behind its commit buttons.
     Once live, pricing and storefront changes save through the OPERATIONS
     scope and apply at the next weekly settlement; before launch the page
     reads the plan and sends the player to Define the Launch to change it.
     The forecast runs only when the player asks for it. */
  const platformOfferView = useStreamingView(() => getStreamingPlatformOfferView(readPlayer), [readPlayer]);
  /* The Network page's map: sites, fields and market verdicts from the reach
     model the Build map and the status page read. */
  const platformNetworkView = useStreamingView(() => getStreamingNetworkMapView(readPlayer), [readPlayer]);
  const platformOffer = (): PlatformDeskOffer => {
    const view = platformOfferView();
    if (!view.live) {
      return { data: view, actions: { editBeforeLaunch: () => whenPlanOpen(() => openLaunchDestination('PRICING')), openBrandStudio: () => whenPlanOpen(() => setShowBrandStudio(true)) } };
    }
    return {
      data: view,
      actions: {
        forecast: pricing => {
          if (!view.offerCountryIds.length) return null;
          const result = forecastWorldStreamingLaunchPricing(readPlayer, pricing, view.offerCountryIds, catalogueContext());
          return {
            subscribers: result.subscribers,
            monthlySubscriptionRevenue: result.monthlySubscriptionRevenue,
            weeklyAdRevenue: result.estimatedWeeklyAdRevenueIfPlayable + result.estimatedWeeklyPassRevenueIfPlayable,
            weeklyStoreRevenue: result.estimatedWeeklyRentalRevenueIfPlayable + result.estimatedWeeklyPurchaseRevenueIfPlayable,
            freeAdHouseholds: result.freeAdHouseholds,
            storeHouseholds: result.storeHouseholds,
            rivalMedianEntryPrice: result.rivalMedianEntryPrice,
          };
        },
        applyPricing: pricing => {
          const result = saveStreamingPricingPlan(player, pricing, 'OPERATIONS');
          if (result.reason === 'SAVED' && !result.changed) return { ok: false, message: 'Nothing has changed from the pricing already in force.' };
          if (result.reason === 'INCOMPLETE') return { ok: false, message: 'Keep at least one way of earning on, and at least one plan while subscriptions are on.' };
          // Plans v2: a locked option is refused with what it needs, never dropped quietly
          if (result.reason === 'LOCKED_OPTION' && result.locked?.length) return { ok: false, message: `${result.locked[0].planName}: ${result.locked[0].needs}.` };
          if (!result.changed) return { ok: false, message: 'Pricing can be changed only while the service is live.' };
          persistCanonical(result.player);
          const dropped = result.dropped?.length ? ` Not offered yet: ${result.dropped.map(row => `${row.featureId} on ${row.planName}`).join(', ')}.` : '';
          return { ok: true, message: `New pricing saved. It takes effect at the next weekly settlement.${dropped}` };
        },
        applyStorefront: layoutId => {
          const result = saveStreamingStorefrontPlan(player, { storefrontLayoutId: layoutId }, 'OPERATIONS');
          if (result.reason === 'SAVED' && !result.changed) return { ok: false, message: 'That storefront is already in use.' };
          if (!result.changed) return { ok: false, message: 'That storefront is not available yet.' };
          persistCanonical(result.player);
          return { ok: true, message: 'Storefront changed. Viewers see the new home screen from now on.' };
        },
        openBrandStudio: () => setShowBrandStudio(true),
      },
      sharing: {
        policy: platform.audienceAccessPolicy,
        settled: view.sharing.settled,
        settledPolicy: readPlayer.world?.worldStreamingCustomers?.playerAccessPolicy,
        control: view.sharing.control,
        available: view.sharing.available,
        appliesNextWeek: platform.audienceAccessPolicy.source === 'PLAYER_ACTION'
          && platform.audienceAccessPolicy.updatedAtAbsoluteWeek >= view.absoluteWeek,
        onApply: policy => persist(updateWorldStreamingCustomerAccessPolicy(player, policy, view.absoluteWeek)),
      },
    };
  };

  const canonicalInfrastructureDraft = (
    selection: StreamingBuildSelection = buildSelection,
    preserveRehearsal = true,
  ) => {
    const selectionDerived = deriveStreamingBuild(selection, {
      ...marketingBuildInputs(),
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
      rolloutPace: 'STANDARD',
      networkPlacements: selection.placements.map(placement => ({ ...placement })),
      regionPlans: (selection.regionPlans?.length
        ? selection.regionPlans
        : reconstructStreamingRegionPlans(selection.facilities || migratePlacementsToStreamingFacilities(selection.placements)))
        .map(plan => ({
          ...plan,
          serverCounts: { ...plan.serverCounts },
        })),
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
      assistedPlanApproved: selection.assistedPlanApproved,
      assistedPlanClass: selection.assistedPlanClass,
      openingDemandForecast: {
        low: selectionDerived.demandTotal('QUIET'),
        likely: selectionDerived.demandTotal('LIKELY'),
        high: selectionDerived.demandTotal('SURGE'),
      },
      subscriptionPrices: {
        ...platform.subscriptionPrices,
      },
      lastLaunchRehearsal: preserveRehearsal
        ? platform.infrastructureSetupDraft?.lastLaunchRehearsal
        : undefined,
    } as const;
  };

  const updateBuildSelection = (nextSelection: StreamingBuildSelection) => {
    if (!buildMarketAccess().editable) return;
    setBuildSelection(nextSelection);
    if (!onUpdatePlayer) return;
    persistCanonical(saveStreamingInfrastructureDraft(player, canonicalInfrastructureDraft(nextSelection, false)));
  };

  const updateLaunchMarketing = (patch: Partial<OwnedStreamingLaunchMarketingDraft>) => {
    if (!onUpdatePlayer) return;
    const saved = saveOwnedStreamingLaunchMarketingDraft(player, patch);
    if (!saved.changed) {
      setCompanyFeedback(saved.reason === 'LOCKED' ? 'Launch marketing is locked while this build is underway.' : 'Marketing plan was unchanged.');
      return;
    }
    setBuildRunResult(null);
    persistCanonical(saved.player);
  };

  const recordBuildRehearsal = (result: StreamingBuildRunResult | null, testedSelection = buildSelection) => {
    if (!buildMarketAccess().editable) return;
    setBuildRunResult(result);
    if (!result || !onUpdatePlayer) return;
    const draft = canonicalInfrastructureDraft(testedSelection, false);
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
    setBuildSelection(testedSelection);
    persistCanonical(saveStreamingInfrastructureRehearsal(player, draft, rehearsal));
  };

  const prepareCinematicBuild = (selection: StreamingBuildSelection = buildSelection) => {
    const savedPlayer = saveStreamingInfrastructureDraft(player, canonicalInfrastructureDraft(selection));
    const draft = savedPlayer.ownedStreamingPlatform.infrastructureSetupDraft || canonicalInfrastructureDraft(selection);
    return { player: savedPlayer, draft, forecast: getStreamingInfrastructureForecast(savedPlayer, draft) };
  };

  const validateCinematicBuild = (selection: StreamingBuildSelection) => {
    if (!buildMarketAccess().editable) return { ok: false, message: buildMarketAccess().reason || 'File an opening market first.' };
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available, so no money was moved.' };
    const prepared = prepareCinematicBuild(selection);
    if (platform.launchCommit) {
      const checked = validateStreamingInfrastructureDraft(prepared.player, prepared.draft);
      return { ok: checked.valid, message: checked.issues[0]?.message || 'The tested network revision is ready to apply.' };
    }
    const quote = getStreamingOpeningCommissionQuote(prepared.player, prepared.draft, launchMarketing().forecast);
    if (!quote.ready) return { ok: false, message: quote.blockers[0] || 'The opening programme is not ready.' };
    if (prepared.player.ownedStreamingPlatform.treasuryCash < quote.totalCashRequired) {
      return { ok: false, message: 'Company treasury cannot cover the complete commission.' };
    }
    if (prepared.player.energy.current < quote.filingEnergy) {
      return { ok: false, message: 'Not enough energy remains to file every opening-market application.' };
    }
    return { ok: true, message: 'The exact tested setup is ready to commission.' };
  };

  const commitCinematicBuild = (selection: StreamingBuildSelection = buildSelection) => {
    /* #92: the opening is commissioned once; a live company orders its network changes on Platform › Network */
    if (platform.launchCommit) return { ok: false, message: 'The service is live: change the network on Platform › Network, region by region.' } as const;
    if (!buildMarketAccess().editable) return { ok: false, message: buildMarketAccess().reason || 'File an opening market first.' } as const;
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available, so no money was moved.' } as const;
    const { player: withDraft, draft: testedDraft } = prepareCinematicBuild(selection);
    const draft = testedDraft;
    if (platform.launchCommit) {
      const changed = commitStreamingInfrastructureSetup(withDraft, testedDraft);
      if (!changed.changed) return { ok: false, message: changed.issues[0]?.message || (changed.reason === 'ALREADY_CONFIGURED' ? 'This configuration is already commissioned.' : 'The revision could not be applied.') } as const;
      persist(changed.player);
      const pending = changed.player.ownedStreamingPlatform.pendingInfrastructureSetup;
      setShowCinematicBuild(false);
      return { ok: true, message: pending ? `Revision ${pending.revision} approved. The current network stays live until construction finishes.` : 'Network revision applied.', next: 'BACK' as const };
    }
    const committed = commissionStreamingOpeningProgramme(withDraft, {
      infrastructureDraft: testedDraft,
      marketingForecast: launchMarketing().forecast,
      openingCountryIds: buildMarkets().map(market => market.id),
      expectedLaunchDefinitionSignature: getStreamingLaunchDefinitionSignature(withDraft),
    });
    if (!committed.changed && committed.reason !== 'ALREADY_COMMISSIONED') {
      setCompanyFeedback(committed.message);
      return { ok: false, message: committed.message } as const;
    }
    const committedPlayer = committed.player;
    buildCommittedPlayerRef.current = committedPlayer;
    persist(committedPlayer);
    const setup = committedPlayer.ownedStreamingPlatform.infrastructureSetup;
    const absoluteWeek = getAbsoluteWeek(committedPlayer.age, committedPlayer.currentWeek);
    const weeksRemaining = Math.max(0, (setup?.readyAtAbsoluteWeek || absoluteWeek) - absoluteWeek);
    const committedView = deriveStreamingBuild(selection, {
      ...buildInputs(),
      homeCityId: selection.placements[0]?.cityId || null,
    });
    const networkLabel = `${draft.networkPlacements.length} ${draft.networkPlacements.length === 1 ? 'city' : 'cities'} and ${committedView.racks} racks`;
    const message = weeksRemaining > 0
      ? `${networkLabel} commissioned. The network becomes operational in ${weeksRemaining} week${weeksRemaining === 1 ? '' : 's'}.`
      : `${networkLabel} commissioned and operational.`;
    setCompanyFeedback(message);
    setOpeningProgrammeFocus('OVERVIEW');
    /* the opening network is commissioned (once) and saved. Its break, if loaded and allowed, comes after the short beat
       while the build screen still shows the commissioning; the result opens only once the break has closed (at once
       when no break may show), so the ad never lands on the result. */
    if (committed.changed) {
      setBuildResultHeld(true);
      const openResult = () => {
        setBuildResultHeld(false);
        setShowOpeningProgramme(true);
      };
      void runTaskAd('BUILD').then(openResult, openResult);
    } else {
      setShowOpeningProgramme(true);
    }
    return { ok: true, message, next: 'BACK' as const };
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
              : result.reason === 'ROUND_FULL'
                ? 'This round has already sold all it may.'
                : 'The equity round could not be completed.',
      };
    }
    persist(result.player);
    return { ok: true, message: 'Capital, dilution and governance were recorded together in the company books.' };
  };

  /* #165: a card's Change opens the room it is about, to do it your way */
  const openTeamRoom = (room: string, focusId?: string) => {
    if (room === 'CAMPAIGNS' && focusId) return openCampaignStudio(focusId);
    if (room === 'CAMPAIGNS') return openCommandDivision('AUDIENCE', 'CAMPAIGNS');
    if (room === 'MARKETS') return openCommandDivision('AUDIENCE', 'MARKETS');
    if (room === 'RIGHTS' || room === 'MARKETPLACE' || room === 'LOCALIZATION' || room === 'ORIGINALS') return openCommandDivision('CONTENT', room);
    if (room === 'NETWORK') return openCommandDivision('PLATFORM', 'INFRA');
    if (room === 'STATUS') return openCommandDivision('PLATFORM', 'INCIDENTS');
    if (room === 'OFFER') return openCommandDivision('PLATFORM', 'OFFER');
    if (room === 'CAPITAL') return openFinanceRoom('CAPITAL', 'EQUITY');
    /* #171: an investor's offer opens its term sheet in OWNERSHIP */
    if (room === 'OWNERSHIP') return openBoardroom('OWNERSHIP');
    if (room === 'IPO') return openBoardroom('MARKETS');
    /* #168: a pitch taken opens the commissioning desk on its brief */
    if (room === 'PITCH') return setShowOriginalsDesk(true);
    /* #204: name someone to run it */
    if (room === 'SUCCESSION') return openBoardroom('TABLE');
    return undefined;
  };
  const teamCardRoom = (action: StreamingTeamAction): { room: string; focusId?: string } | null => {
    switch (action.kind) {
      case 'CAMPAIGN_START': return { room: 'CAMPAIGNS', focusId: typeof action.draft.projectId === 'string' ? action.draft.projectId : undefined };
      case 'CAMPAIGN_STOP': case 'CAMPAIGN_EXTEND': return { room: 'CAMPAIGNS' };
      case 'RENEWAL': return { room: 'RIGHTS' };
      case 'CATALOGUE_SIGN': case 'TITLE_LICENSE': return { room: 'MARKETPLACE' };
      case 'NETWORK_ORDER': return { room: 'NETWORK' };
      case 'INCIDENT_REPAIR': return { room: 'STATUS' };
      case 'MARKET_FOLLOW_UP': return { room: 'MARKETS' };
      case 'LOCALIZATION_LEVEL': return { room: 'LOCALIZATION' };
      case 'GUIDANCE': return { room: 'IPO' };
      case 'PRICE_CHANGE': return { room: 'OFFER' };
      case 'OPEN_ROOM': return { room: action.room, focusId: action.focusId };
      case 'ORIGINAL_PITCH': return { room: 'ORIGINALS' };
      default: return null;
    }
  };
  const teamActions: BoardroomTeamActions = {
    setMode: (seatId, jobId, mode) => {
      const result = setStreamingTeamJobMode(player, seatId, jobId, mode);
      if (result.changed) persist(result.player);
    },
    setLimits: (seatId, patch) => {
      const result = setStreamingTeamLimits(player, seatId, patch);
      if (result.changed) persist(result.player);
    },
    hire: (seatId, candidateId, offer) => {
      const result = hireStreamingTeamCandidate(player, seatId, candidateId, offer);
      if (result.changed) persist(result.player);
      return { ok: result.changed && result.reason !== 'REFUSED' && result.reason !== 'COUNTERED', message: result.message, refused: result.reason === 'REFUSED', countered: result.reason === 'COUNTERED' };
    },
    walkAway: (candidateId) => {
      const result = walkAwayFromStreamingCandidate(player, candidateId);
      if (result.changed) persist(result.player);
    },
    train: (seatId) => {
      const result = trainStreamingTeamExecutive(player, seatId);
      if (result.changed) persist(result.player);
      return { ok: result.changed, message: result.message };
    },
    dismiss: (seatId) => {
      const result = dismissStreamingTeamExecutive(player, seatId);
      if (result.changed) persist(result.player);
      return { ok: result.changed, message: result.message };
    },
    approve: (cardId, answer, givenWeekly) => {
      const result = approveStreamingTeamCard(player, cardId, answer, givenWeekly);
      if (result.changed) persist(result.player);
      if (result.openRoom) openTeamRoom(result.openRoom.room, result.openRoom.focusId);
      return { ok: result.changed, message: result.message };
    },
    decline: (cardId) => {
      const result = declineStreamingTeamCard(player, cardId);
      if (result.changed) persist(result.player);
    },
    change: (card) => {
      const target = teamCardRoom(card.action);
      if (target) openTeamRoom(target.room, target.focusId);
    },
    nameSuccessor: (type, candidateId) => {
      const result = nameStreamingTeamSuccessor(player, type, candidateId);
      if (result.changed) persist(result.player);
    },
    /* #191: step down (the successor runs the company through the team), and come back as CEO */
    stepDown: role => {
      const result = stepDownFromStreamingCompany(player, role);
      if (result.changed) persist(result.player);
      return { ok: result.changed, message: result.message };
    },
    returnAsCeo: () => orTable(returnAsStreamingCeo(player), returnAsStreamingCeo),
    /* #204: as chair, replace the chief executive */
    replaceCeo: (type, candidateId) => orTable(replaceStreamingCeo(player, type, candidateId), next => replaceStreamingCeo(next, type, candidateId)),
  };

  /* #163: Decline on an investor's term sheet; the investor is not offered again */
  const declineFinanceInvestment = (offerId: string) => {
    if (!onUpdatePlayer) return;
    const result = declineStreamingCelebrityInvestment(player, offerId);
    if (result.changed) persist(result.player);
  };

  const commitCinematicLaunch = (capacityPlan: StreamingLaunchCapacityPlan = 'STANDARD') => {
    const launchPlayer = buildCommittedPlayerRef.current || player;
    const launchPlatform = launchPlayer.ownedStreamingPlatform;
    if (launchPlatform.launchCommit) {
      return { ok: true, commit: launchPlatform.launchCommit } as const;
    }
    if (!onUpdatePlayer) return { ok: false, message: 'The company save is not available.' } as const;
    const result = commitOwnedStreamingLaunch(launchPlayer, capacityPlan);
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
    setPremiereStartedHere(true);
    persist(result.player);
    return { ok: true, commit: result.launchCommit } as const;
  };

  const openCinematicPremiere = () => {
    setShowOpeningProgramme(false);
    setShowCinematicBuild(false);
    setShowDefineLaunch(false);
    setPremiereStartedHere(false);
    setShowCinematicPremiere(true);
  };

  const selectSection = (section: StreamingHqSection) => {
    setActiveSection(section);
    /* #219: walking between rooms changes nothing about the company, so the chair's note has nothing to say */
    chairAllow(() => persistCanonical(visitStreamingHqSection(player, section)));
    mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const startTour = () => {
    setShowWelcome(false);
    setActiveSection('HOME');
    chairAllow(() => persistCanonical(beginStreamingHqTour(player)));
  };

  const skipTour = () => {
    setShowWelcome(false);
    chairAllow(() => persistCanonical(skipStreamingHqTour(player)));
  };

  /* the ? at the top of the headquarters (2026-11-08): the tour starts again from its first card */
  const replayTour = () => {
    setActiveSection('HOME');
    chairAllow(() => persistCanonical(replayStreamingHqTour(player)));
  };

  /* the tour moves itself to each card; Finish on the last one completes it */
  const nextTourStep = () => {
    chairAllow(() => persistCanonical(advanceStreamingHqTour(player)));
  };

  const backTourStep = () => {
    chairAllow(() => persistCanonical(rewindStreamingHqTour(player)));
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

  /* "Bring from my studio" must land on the studio vault, while licensing and
     catalogue acquisition open the public listings. A disabled empty route
     cannot explain whether the player owns no studio or is waiting on a release. */
  /* #253: while the opening is being built: the doors to what the wizards approved */
  const whenCatalogueOpen = (open: () => void) => { if (getStreamingOpeningLock(readPlayer).catalogueLocked) setBuildLockNotice(true); else open(); };
  const whenPlanOpen = (open: () => void) => { if (getStreamingOpeningLock(readPlayer).planLocked) setBuildLockNotice(true); else open(); };
  const openOpeningBuild = (tab: StreamingOpeningProgrammeTab = 'BUILD', focus: StreamingOpeningProgrammeFocus = 'OVERVIEW') => {
    setOpeningProgrammeTab(tab);
    setOpeningProgrammeFocus(focus);
    setShowOpeningProgramme(true);
  };
  const openStarterCatalogueRoute = (_step: 0 | 2) => {
    if (getStreamingOpeningLock(readPlayer).catalogueLocked) { setBuildLockNotice(true); return; }
    setContentMarketInitialTab('OWNED');
    setShowContentMarket(true);
  };

  const finishOriginalReveal = (status: 'VIEWED' | 'DISMISSED') => {
    setShowOriginalReveal(false);
    if (!pendingOriginalReveal) return;
    /* #204: a scene watched is marked in the chair too */
    chairAllow(() => persist({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        platform,
        pendingOriginalReveal.id,
        status,
      ),
    }));
  };

  const finishPremiereNight = (status: 'VIEWED' | 'DISMISSED' = 'VIEWED') => {
    setShowCinematicPremiere(false);
    setPremiereStartedHere(false);
    if (!pendingLaunchReveal) return;
    chairAllow(() => persist({
      ...player,
      ownedStreamingPlatform: markOwnedStreamingCinematicStatus(
        platform,
        pendingLaunchReveal.id,
        status,
      ),
    }));
  };

  const renderTitleDossierLauncher = () => (
    <section className="hq-analytics-launcher is-title-dossier">
      <span aria-hidden="true"><Film size={23} /></span>
      <div>
        <span>TITLE INTELLIGENCE</span>
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

  /* #150: every door that opened the old Growth War Room opens the Campaign Studio: its builder on a title (the builder
     starts on What if the title does not stream yet), one of a title's campaigns, or its hub. Nothing before launch:
     campaigns need a live service. Kept light: a tap only sets what to open. */
  /* #290: an Original has its one page; anything else opens its dossier */
  const openTitlePage = (projectId: string) => {
    const commission = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
    if (commission) return setOriginalDetailId(commission.id);
    setTitleDossierInitialProjectId(projectId);
    setShowTitleDossier(true);
  };

  const openCampaignStudio = (projectId?: string | null, campaignId?: string | null) => {
    if (!platform.launchCommit) return;
    setCampaignStudio({ subject: projectId ? { kind: 'TITLE', id: projectId } : null, ...(campaignId ? { campaignId } : {}) });
  };

  /* a title's campaigns, for its page: how many it has had, its latest, and whether one can start (it streams now) */
  const titleCampaigns = (projectId: string) => {
    const mine = streamingCampaignBook(platform).campaigns.filter(item => item.subject.id === projectId || item.subject.projectIds.includes(projectId));
    const status = cinematicDossier()?.status;
    const live = Boolean(platform.launchCommit) && (status === 'LIVE' || status === 'ON THE SERVICE');
    return {
      count: mine.length,
      latestId: mine.at(-1)?.id ?? null,
      canStart: live,
      ...(live ? {} : { reason: platform.launchCommit ? 'Campaigns start once it streams on your service.' : 'Campaigns start after launch.' }),
    };
  };

  const openCommandDivision = (division: StreamingCommandDivisionId, chip?: string) => {
    if (division === 'CONTENT') {
      if (chip === 'CATALOGUE') {
        setContentInitialTab('LIBRARY');
        return selectSection('CONTENT');
      }
      if (chip === 'MARKETPLACE') return whenCatalogueOpen(() => setShowContentMarket(true));
      if (chip === 'ORIGINALS') return setShowOriginalsDesk(true);
      if (chip === 'RIGHTS') {
        setContentInitialTab('RIGHTS');
        return selectSection('CONTENT');
      }
      if (chip === 'LOCALIZATION') {
        setContentInitialTab('LOCALIZATION');
        return selectSection('CONTENT');
      }
      if (chip === 'SLATE') {
        setContentInitialTab('SLATE');
        return selectSection('CONTENT');
      }
      if (chip === 'ANALYTICS' && platform.launchCommit) {
        setAnalyticsInitialTab('CONTENT');
        return setShowAnalyticsCenter(true);
      }
      return selectSection('CONTENT');
    }
    if (division === 'PLATFORM') {
      if (chip === 'OFFER') { setPlatformInitialTab('OFFER'); return selectSection('TECH'); }
      /* Live, the chip opens the room's Network page (its map leads on to
         Build); before launch the Build is where the network is made. */
      if (chip === 'INFRA' && platform.launchCommit && platform.infrastructureSetup) { setPlatformInitialTab('CAPACITY'); return selectSection('TECH'); }
      if (chip === 'INFRA') return openBuild();
      if (chip === 'TECH') return openPlatformTab('TECH');
      /* #126: the PRODUCT tab is the products' one place (the old Product Lab is gone) */
      if (chip === 'PRODUCTS') return openPlatformTab('PRODUCTS');
      /* the alert leads to STATUS (#49), where both incident lists meet; Respond goes on to Incident Command */
      if (chip === 'INCIDENTS') return openPlatformTab('STATUS');
      setPlatformInitialTab('OFFER');
      return selectSection('TECH');
    }
    if (division === 'AUDIENCE') {
      setAudienceEntryRequest(null);
      if (chip === 'MARKETS') { openAudienceTab('MARKETS'); return selectSection('MARKET'); }
      if (chip === 'ANALYTICS') { openAudienceTab('ANALYTICS'); return selectSection('MARKET'); }
      /* #130: the regions are MARKETS' chips now; WORLD is the industry tab */
      if (chip === 'REGIONS') { openAudienceTab('MARKETS'); return selectSection('MARKET'); }
      if (chip === 'WORLD') { openAudienceTab('WORLD'); return selectSection('MARKET'); }
      if (chip === 'CAMPAIGNS') { openAudienceTab('CAMPAIGNS'); return selectSection('MARKET'); }
      if (chip === 'TOP10') { openAudienceTab('TOP 10'); return selectSection('MARKET'); }
      if (chip === 'GROWTH') { openAudienceTab('CAMPAIGNS'); return selectSection('MARKET'); }
      if (chip === 'ACQUISITIONS') return openBoardroom('DEALS');
      return selectSection('MARKET');
    }
    /* #166: TEAM, MONEY, OWNERSHIP and M&A are the Boardroom's own tabs */
    if (chip === 'ACQUISITIONS') return openBoardroom('DEALS');
    if (chip === 'TEAM' || chip === 'LEADERSHIP' || chip === 'LEGACY') return openBoardroom('TABLE');
    if (chip === 'MONEY') return openBoardroom('MONEY');
    if (chip === 'OWNERSHIP') return openBoardroom('OWNERSHIP');
    /* #188: MARKETS is the one home for the stock */
    if (chip === 'MARKETS') return openBoardroom('MARKETS');
    if (chip === 'FINANCE') return openFinanceRoom();
    return openBoardroom('MONEY');
  };

  const openCommandEvent = (event: StreamingCommandEvent) => {
    if (event.id === 'INCIDENT') return openPlatformTab('STATUS');
    if (event.id === 'TEAM_NOTICE' || event.id === 'CHAIR') return openBoardroom('TABLE');
    if (event.id === 'LAUNCH') {
      if (openingProgramme().commissioned && !platform.launchCommit) {
        openOpeningBuild();
        return;
      }
      return platform.infrastructureSetup ? openCinematicPremiere() : openBuild();
    }
  };

  const openLaunchDestination = (destination: StreamingLaunchDestination) => {
    if (openingProgramme().commissioned && !platform.launchCommit) {
      if (destination === 'LAUNCH_BLUEPRINT') { openOpeningBuild('PLAN'); return; }
      openOpeningBuild('BUILD', getStreamingOpeningProgrammeFocus(destination));
      return;
    }
    if (destination === 'FINANCE') return openFinanceRoom('CAPITAL', 'INJECT');
    const defineStep = DEFINE_STEP_BY_DESTINATION[destination];
    if (defineStep) {
      if (platform.launchCommit) {
        setShowCinematicBuild(false);
        setShowDefineLaunch(false);
        if (defineStep === 'MARKETS' || defineStep === 'CLEARANCE') {
          setAudienceEntryRequest({ tab: defineStep === 'CLEARANCE' ? 'CLEARANCE' : 'CHOOSE' });
          openAudienceTab('MARKETS');
          selectSection('MARKET');
        } else if (defineStep === 'CATALOGUE') {
          setContentInitialTab('LIBRARY');
          selectSection('CONTENT');
        } else {
          setPlatformInitialTab('OFFER');
          selectSection('TECH');
        }
        return;
      }
      setDefineLaunchMode('OPENING');
      setDefineLaunchInitialStep(defineStep);
      setShowDefineLaunch(true);
      return;
    }
    if (destination === 'OPENING_NIGHT') return openCinematicPremiere();
    openBuild();
  };

  const renderHome = () => (
    <StreamingPlatformCommandDeck
      brand={commandDeckBrand()}
      state={commandDeckState()}
      onBack={onBack}
      onCommission={() => platform.starterCatalog ? setShowOriginalsDesk(true) : setShowContentMarket(true)}
      onOpenDivision={openCommandDivision}
      onEvent={openCommandEvent}
      onOpenViewer={() => setShowViewerMode(true)}
      onOpenBrandStudio={() => whenPlanOpen(() => setShowBrandStudio(true))}
      onOpenFinance={() => openFinanceRoom()}
      onOpenTitle={title => openTitlePage(title.id)}
      onSeeAll={() => selectSection('CONTENT')}
      onLaunch={() => {
        if (openingProgramme().commissioned && !platform.launchCommit) {
          openOpeningBuild();
        } else if (platform.infrastructureSetup) openCinematicPremiere();
        else openBuild();
      }}
      onOpenLaunchTrack={track => {
        if (openingProgramme().commissioned && !platform.launchCommit) {
          openOpeningBuild(track === 'DEFINE_LAUNCH' ? 'PLAN' : 'BUILD');
          return;
        }
        if (track === 'DEFINE_LAUNCH') {
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep(undefined);
          setShowDefineLaunch(true);
        } else openBuild();
      }}
      onOpenLaunchDestination={openLaunchDestination}
      onOpenOpeningBuild={() => openOpeningBuild()}
      onReplayTour={replayTour}
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
        key={contentDeskOpening}
        brand={commandDeckBrand()}
        state={cinematicContentState()}
        initialTab={contentInitialTab}
        onAddContent={() => whenCatalogueOpen(() => setShowContentMarket(true))}
        onOpenSlate={() => whenCatalogueOpen(() => setShowSlatePlanner(true))}
        onBack={() => {
          if (catalogueReturnToLaunch) {
            setCatalogueReturnToLaunch(false);
            setDefineLaunchInitialStep('CATALOGUE');
            setShowDefineLaunch(true);
          } else selectSection('HOME');
        }}
        onOpenTitle={title => openTitlePage(title.id)}
        entryRoutes={[
          {
            id: 'LICENSE',
            eyebrow: 'RIGHTS MARKET',
            title: 'License released titles',
            description: 'Negotiate a temporary streaming window for a completed film or series.',
            status: 'CONTENT MARKET',
            onSelect: () => whenCatalogueOpen(() => { setContentMarketInitialTab('ALL'); setShowContentMarket(true); }),
          },
          {
            id: 'ORIGINAL',
            eyebrow: 'NEW PRODUCTION',
            title: 'Commission an Original',
            description: 'Order a new project and send it into a real production-house workflow.',
            status: 'PRODUCTION REQUIRED',
            onSelect: () => setShowOriginalsDesk(true),
          },
          {
            id: 'OWNED',
            eyebrow: 'YOUR PRODUCTION HOUSE',
            title: 'Bring from my studio',
            description: 'Link released titles you already control without inventing an internal sale.',
            status: eligibleOwnedStreamingTitles().length ? `${eligibleOwnedStreamingTitles().length} RELEASED` : 'NO RELEASED TITLES',
            onSelect: () => openStarterCatalogueRoute(0),
          },
          {
            id: 'CATALOGUE',
            eyebrow: 'LIBRARY ACQUISITION',
            title: 'Acquire a catalogue',
            description: 'Purchase a packaged library and its negotiated rights in one transaction.',
            status: 'CONTENT MARKET',
            onSelect: () => whenCatalogueOpen(() => { setContentMarketInitialTab('ALL'); setShowContentMarket(true); }),
          },
        ]}
        onRenew={() => { setRightsExchangeInitialTab('CALENDAR'); setShowRightsExchange(true); }}
        onLapse={() => { setRightsExchangeInitialTab('CALENDAR'); setShowRightsExchange(true); }}
        /* The desk's renewal cards act on the rights calendar's open case for
           that title (they opened the market tab and ignored the title). */
        onRenewalDecision={(caseId, action) => {
          const result = resolveStreamingRightsRenewal(player, { caseId, action, absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) });
          if (!result.changed) return { ok: false, message: result.detail || 'That renewal decision could not be recorded.' };
          persistCanonical(result.player);
          return {
            ok: true,
            message: action === 'ACCEPT_RENEWAL' ? 'Renewed. The new window starts when the current one ends.'
              : action === 'RETURN_TO_MARKET' ? result.detail || 'The next window goes back to the market.'
                : result.detail || 'Letting it go. It stays until the window ends.',
          };
        }}
        onOpenRightsCalendar={() => { setRightsExchangeInitialTab('CALENDAR'); setShowRightsExchange(true); }}
        /* the Slate tab plans premieres once live: a title from the shelves into a
           week, and a premiere still ahead taken off (weeks only, no campaigns) */
        onScheduleTitle={(projectId, absoluteWeek, marketingPlan, rhythm) => {
          const result = scheduleStreamingSlateTitle(player, { projectId, absoluteWeek, marketingPlan, ...(rhythm ? { releasePattern: rhythm === 'WEEKLY' ? 'WEEKLY' as const : 'FULL_SEASON' as const } : {}) });
          if (!result.changed) return { ok: false, message: STREAMING_SLATE_REFUSAL_COPY[result.reason ?? 'UNKNOWN_TITLE'] };
          persistCanonical(result.player);
          const name = result.player.ownedStreamingPlatform.launchSlate?.entries.find(entry => entry.projectId === projectId)?.title
            ?? result.player.ownedStreamingPlatform.originalCommissions.find(item => item.canonicalProjectId === projectId)?.title ?? 'It';
          return { ok: true, message: rhythm
            ? (rhythm === 'WEEKLY' ? `${name} comes out an episode a week.` : `${name} comes out all at once.`)
            : `${name} premieres in year ${Math.floor(absoluteWeek / 52) + 1}, week ${(absoluteWeek % 52) + 1}.` };
        }}
        onUnscheduleTitle={projectId => {
          const name = player.ownedStreamingPlatform.launchSlate?.entries.find(entry => entry.projectId === projectId)?.title
            ?? player.ownedStreamingPlatform.originalCommissions.find(item => item.canonicalProjectId === projectId)?.title ?? 'It';
          const result = unscheduleStreamingSlateTitle(player, projectId);
          if (!result.changed) return { ok: false, message: STREAMING_SLATE_REFUSAL_COPY[result.reason ?? 'UNKNOWN_TITLE'] };
          persistCanonical(result.player);
          return { ok: true, message: getStreamingSlateFallback(result.player, projectId) === 'LICENCE_START'
            ? `${name} is off the slate. It goes live when its licence starts.`
            : `${name} is off the slate and back on your shelves.` };
        }}
        onAutoFillSlate={fresh => {
          const result = autoFillStreamingSlate(player, { fresh });
          if (!result.changed) return { ok: false, message: 'Nothing on your shelves fits a week right now.' };
          persistCanonical(result.player);
          if (!result.scheduled.length) return { ok: true, message: 'Your planned premieres are off the slate; nothing fits a week right now.' };
          return { ok: true, message: `${fresh ? 'Planned anew. ' : ''}Scheduled ${result.scheduled.length}: ${result.scheduled.map(item => `${item.title} (W${(item.absoluteWeek % 52) + 1})`).join(', ')}.` };
        }}
        onClearSlatePlans={() => {
          const result = clearStreamingSlatePlans(player);
          if (!result.changed) return { ok: false, message: 'Nothing is planned to take off.' };
          persistCanonical(result.player);
          return { ok: true, message: `Took ${result.removed.length} planned premiere${result.removed.length === 1 ? '' : 's'} off the slate. Setup and studio titles are back on your shelves; licences bought after setup go live at their rights start.` };
        }}
        /* Localization by region: set a region up (cash, once), then raise its
           Subtitles and Dubbing levels with energy (+5 a press, hold, or Fill). */
        localizationDesk={localizationDesk()}
        localizationActions={{
          onOpenRegion: packageId => runLocalization(
            current => unlockStreamingLocalizationRegion(current, packageId),
            () => `${streamingLocalizationRegionName(packageId)} is set up. Raise Subtitles and Dubbing with energy: the library first, then new releases, then premieres.`),
          onContribute: (packageId, track, amount) => runLocalization(
            current => contributeStreamingLocalizationEnergy(current, packageId, track, amount),
            result => result.completed
              ? `${streamingLocalizationRegionName(result.completed.packageId)} · ${streamingLocalizationLevelName(result.completed.track, result.completed.level)} reached. It applies from next week.`
              : `${result.contributed ?? 0} energy added.`),
        }}
      />
    );
    if (activeSection === 'TECH') return (
      <>
        <StreamingPlatformDesk
          key={platformDeskKey}
          brand={commandDeckBrand()}
          state={cinematicNetworkState()}
          initialTab={platformInitialTab}
          techFocus={platformTechFocus}
          /* STATUS: the health board and both incident lists (#49); Respond opens Incident Command */
          statusBoard={statusBoard()}
          onRespondToIncident={incidentCommand().available ? () => setShowIncidentCommand(true) : undefined}
          onRepairIncident={runIncidentRepair}
          /* the tech tree: unlock with cash (version 1), then versions 2 and 3 with energy */
          techDesk={techDesk()}
          techActions={{
            onUnlock: techId => runTech(
              current => unlockStreamingTech(current, techId),
              () => `${getStreamingTechDefinition(techId)?.name ?? 'The tech'} is unlocked. Raise it to version 2 and 3 with energy.`),
            onContribute: (techId, amount) => runTech(
              current => contributeStreamingTechEnergy(current, techId, amount),
              result => result.completed
                ? `${streamingTechVersionLabel(result.completed.techId, result.completed.version)} reached. Viewers see it from next week.`
                : `${result.contributed ?? 0} energy added.`),
            /* #84: a full bar's price, then the version */
            onCompleteVersion: techId => runTech(
              current => completeStreamingTechVersion(current, techId),
              result => result.completed
                ? `${streamingTechVersionLabel(result.completed.techId, result.completed.version)} reached. Viewers see it from next week.`
                : 'Version complete.'),
          }}
          offer={platformOffer()}
          network={platformNetworkView()}
          networkDesk={platform.launchCommit && platform.infrastructureSetup ? (() => {
            /* #90: a live company changes its network here, region by region (plan §17) */
            const latest = readPlatform.weeklyHistory.at(-1)?.operations;
            const view = platformNetworkView();
            const hooks: StreamingNetworkDeskHooks = {
              absoluteWeek: getAbsoluteWeek(player.age, player.currentWeek),
              energy: Math.max(0, Math.floor(Number(player.energy?.current) || 0)),
              peakLoadPercent: Math.round(latest?.capacityUtilizationPercent ?? 0),
              peakStreams: view.peakStreams,
              capacityStreams: view.capacityStreams,
              peakViewers: Math.max(0, Math.round(latest?.peakConcurrentStreams ?? 0)),
              orders: readPlatform.networkOrders || [],
              /* #92: a whole-network change commissioned in Build before #89 finishes as it is; orders wait for it */
              pendingChange: readPlatform.pendingInfrastructureSetup
                ? { readyAtAbsoluteWeek: readPlatform.pendingInfrastructureSetup.readyAtAbsoluteWeek } : null,
              money: [
                { id: 'NETWORK', label: 'Servers, cloud and rooms', weekly: latest?.infrastructureCost ?? readPlatform.infrastructureSetup?.weeklyOperatingCost ?? 0 },
                { label: 'Bandwidth (Optimisation cuts it)', weekly: latest?.streamingDeliveryCost ?? 0 },
                { label: 'Fibre', weekly: fibreWeeklyHoldCost(readPlatform.fibre) },
                { label: 'Incident recovery', weekly: latest?.crisisRecoveryCost ?? 0 },
              ],
              preview: (regionId, facilities) => previewStreamingNetworkOrder(localizationPlayerRef.current, { regionId, facilities }),
              order: (regionId, facilities, regionPlan) => runNetwork(current => orderStreamingNetworkRegion(current, { regionId, facilities, regionPlan })),
              speedUp: orderId => runNetwork(current => speedUpStreamingNetworkOrder(current, orderId)),
            };
            /* the busiest hour is this week's peak, not the opening night's forecast: the forecast's markets keep
               their shares of it */
            const base = buildInputs();
            const livePeak = Math.max(0, Math.round(latest?.peakConcurrentStreams ?? 0));
            const scale = livePeak > 0 && base.openingDemandForecast?.likely ? livePeak / base.openingDemandForecast.likely : 0;
            const byMarket = scale > 0 && base.openingDemandForecast
              ? Object.fromEntries(Object.entries(base.openingDemandForecast.byMarket).map(([id, value]) => [id, Math.round(value * scale)]))
              : null;
            /* the night is the sum of its markets, so the map's gap is not a rounding */
            const likely = byMarket ? Object.values(byMarket).reduce((sum, value) => sum + value, 0) : 0;
            /* #91: the load test's big night rides the rehearsal's QUIET slot: the biggest hour of the last 12 weeks,
               at least a third over this week's */
            const bigNight = Math.max(
              Math.round(likely * 1.35),
              ...readPlatform.weeklyHistory.slice(-12).map(week => Math.round((week.operations?.peakConcurrentStreams ?? 0) * (likely / Math.max(1, livePeak)))),
            );
            const inputs = byMarket && likely > 0 ? {
              ...base,
              openingDemandForecast: { low: bigNight, likely, high: Math.round(likely * 1.9), byMarket },
              /* the load test weighs a night as the weekly close does: viewers × their load (Optimisation) */
              viewerLoad: latest?.viewerLoad && latest.viewerLoad > 0 ? latest.viewerLoad : 1,
            } : base;
            return (
              <StreamingBuildExperience
                streamingPlusOwned={hasStreamingPlus(player)}
                brand={commandDeckBrand()}
                signatoryName={player.name}
                inputs={inputs}
                sel={liveBuildSelection()}
                built={builtPlacements()}
                builtFacilities={builtFacilities()}
                isLive
                onChange={() => undefined}
                onBack={() => undefined}
                desk={hooks}
              />
            );
          })() : undefined}
          onOpenTechnology={track => {
            if (STREAMING_CAMPUS_BRANCHES.has(track.id)) setCampusInitial({ view: 'LAB', branch: track.id as StreamingTechnologyCampusBranch });
            setShowTechnologyCampus(true);
          }}
          researchUnderWay={readPlatform.researchPrograms.filter(program => program.stage !== 'OPERATING'
            && program.installationTargetType !== 'LOCALIZATION_CAPABILITY').length}
          onOpenResearch={() => { setCampusInitial({ view: 'RESEARCH' }); setShowTechnologyCampus(true); }}
          treasury={platform.treasuryCash}
          onBack={() => selectSection('HOME')}
          onAddCity={() => openBuild()}
          onBuild={() => setShowTechnologyCampus(true)}
          onCancelBuild={() => setShowTechnologyCampus(true)}
          onPauseProduct={runProductPause}
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
        brand={commandDeckBrand()}
        state={cinematicAudienceState()}
        initialTab={audienceTabMemory.current ?? audienceInitialTab}
        onTabChange={tab => { audienceTabMemory.current = tab; }}
        onBack={() => selectSection('HOME')}
        /* The War Room exists only once the service is live; before that these
           taps must not arm it to pop up later in the session. */
        onNewCampaign={() => { if (platform.launchCommit) setCampaignStudio({ subject: null }); }}
        /* #150: a retention push is a campaign on the title that kept the most members last week */
        onObjective={objective => {
          const titles = platform.weeklyHistory.at(-1)?.operations?.titlePerformance ?? [];
          const keeper = objective === 'RETENTION'
            ? [...titles].sort((left, right) => (right.retentionAttributedAccounts ?? 0) - (left.retentionAttributedAccounts ?? 0))[0]
            : undefined;
          openCampaignStudio(keeper ? String(keeper.projectId) : null);
        }}
        marketOperations={platform.marketOperations}
        initialMapSelection={audienceMapMemory.current}
        onNavigationChange={navigation => { audienceMapMemory.current = { regionId: navigation.regionId, countryId: navigation.countryId }; }}
        initialEntry={audienceEntryRequest}
        onEntryClose={() => setAudienceEntryRequest(null)}
        onManageMarkets={() => whenPlanOpen(() => {
          setDefineLaunchMode('OPENING'); setDefineLaunchInitialStep('MARKETS'); setShowDefineLaunch(true);
        })}
        marketEntry={marketEntry()}
        accessPolicy={platform.audienceAccessPolicy}
        onOpenPlatformOffer={() => { setPlatformInitialTab('OFFER'); selectSection('TECH'); }}
        /* #131: a title doing the work opens its dossier; #150: the next move "Push it" opens the Campaign Studio on it */
        onOpenTitle={projectId => openTitlePage(projectId)}
        onPushTitle={projectId => openCampaignStudio(projectId)}
      />
    );
    if (activeSection === 'COMPANY') return (
      /* #166: MONEY · TEAM · OWNERSHIP · MARKETS · M&A (coming in a future update); the Leadership suite, the Legacy
         office and the M&A room are gone; the board review sits on MONEY */
      <React.Fragment key={`boardroom:${boardroomVisit}`}><StreamingBoardroom
        brand={commandDeckBrand()}
        founderName={player.name}
        state={cinematicBoardroomState()}
        initialTab={boardroomTab}
        onBack={() => selectSection('HOME')}
        onIssueEquity={() => openFinanceRoom('CAPITAL', 'EQUITY')}
        onFileIpo={() => openBoardroom('MARKETS')}
        onOpenFinance={() => openFinanceRoom()}
        onOpenOwnership={() => openFinanceRoom('CAPITAL', 'EQUITY')}
        founderAvatar={player.avatar}
        founderGender={player.gender}
        mnaComingSoon
        mnaRivals={(platform.competitiveWorld.rivals || []).map(rival => rival.platformName)}
        boardReview={boardReviewView()}
        team={teamView()}
        teamActions={chairActions(teamActions, chairRule?.chair ? ['stepDown', 'returnAsCeo', 'replaceCeo', 'approve', 'decline', 'change'] : ['returnAsCeo', 'change'])}
        /* #172: OWNERSHIP signs and declines on the term sheet itself; your bank and founder capital beside it */
        ownership={getStreamingOwnershipView(player)}
        ownershipActions={chairActions({
          /* Back from Your money comes back to OWNERSHIP */
          openYourMoney: () => { setBoardroomTab('OWNERSHIP'); openYourMoney(); },
          sign: offerId => acceptFinanceInvestment(offerId),
          decline: offerId => declineFinanceInvestment(offerId),
          /* #186: OWNERSHIP › Raise money: the energy now, the offers in 3 weeks */
          callRound: ask => {
            const result = callStreamingInvestorRound(player, ask);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          /* #205: your own stake */
          hireStakeBankers: percent => {
            const result = hireStreamingStakeBankers(player, percent);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          acceptStakeOffer: () => {
            const result = acceptStreamingStakeOffer(player);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          declineStakeOffer: () => {
            const result = declineStreamingStakeOffer(player);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          /* #201: a director takes a seat */
          appointDirector: personId => {
            const result = appointStreamingBoardDirector(player, personId);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          /* #217: a term renewed, a director removed */
          renewDirector: directorId => {
            const result = renewStreamingBoardDirector(player, directorId);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          removeDirector: directorId => orTable(removeStreamingBoardDirector(player, directorId), next => removeStreamingBoardDirector(next, directorId)),
          /* #187: buy an investor out (private); buy back shares (listed) */
          buyOut: (holderId, offer) => {
            const result = buyOutStreamingInvestor(player, holderId, offer);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          startBuyback: percent => {
            const result = startStreamingBuyback(player, percent);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          /* #190: sell the company: the bankers (⚡10), a bid accepted, or every bid turned down */
          hireBankers: () => {
            const result = hireStreamingSaleBankers(player);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          acceptBid: bidId => orTable(acceptStreamingSaleBid(player, bidId), next => acceptStreamingSaleBid(next, bidId), next => voteDownStreamingSaleBid(next, bidId)),
          rejectBids: () => {
            const result = rejectStreamingSaleBids(player);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
        }, chairRule?.chair ? ['openYourMoney', 'appointDirector', 'renewDirector', 'removeDirector', 'hireStakeBankers', 'acceptStakeOffer', 'declineStakeOffer'] : ['openYourMoney', 'hireStakeBankers', 'acceptStakeOffer', 'declineStakeOffer'], ['hireBankers', 'acceptBid', 'rejectBids'])}
        sale={getStreamingSaleView(player)}
        stepDown={getStreamingStepDownView(player)}
        /* #175: MONEY's cash line and the one runway, from the same books as Studio Finance */
        cash={cashSummary()}
        /* #173: MARKETS: the road to the bell, then public life */
        listingDesk={getStreamingListingDesk(player)}
        listingActions={chairActions({
          ringBell: () => {
            const result = beginStreamingListing(player);
            if (!result.ok) return { ok: false, message: result.message };
            persist(result.player);
            /* the room comes back on MARKETS when the listing closes: it does not run underneath it */
            setBoardroomTab('MARKETS');
            setShowListing(true);
            return { ok: true };
          },
          holdCall: () => {
            const result = holdStreamingEarningsCall(player);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.reason };
          },
          vote: (voteId, choice) => {
            const result = castStreamingShareholderVote(player, voteId, choice);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.reason };
          },
          openRoom: room => (room === 'AUDIENCE' ? openCommandDivision('AUDIENCE')
            : room === 'STATUS' ? openTeamRoom('STATUS')
              : openBoardroom(room === 'TEAM' ? 'TABLE' : room)),
          /* #188: the promise for the next report, made on MARKETS */
          promise: tone => {
            const result = issueStreamingPublicGuidance(player, tone);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.reason };
          },
          /* #215: your name on the stock market */
          setTicker: ticker => {
            const result = setStreamingProposedTicker(player, ticker);
            if (result.changed) persist(result.player);
            return { ok: result.changed, message: result.message };
          },
          /* #209: what a share pays */
          setDividend: perShare => orTable(setStreamingDividend(player, perShare), next => setStreamingDividend(next, perShare)),
        }, ['vote', 'openRoom'], ['ringBell', 'setDividend', 'setTicker'])}
      /></React.Fragment>
    );
    return renderHome();
  };

  if (!platform.launchCommit && !buildResultHeld && (showOpeningProgramme || showCinematicBuild || showDefineLaunch)
    && openingProgramme().commissioned) {
    return (
      <StreamingOpeningProgramme
        brand={commandDeckBrand()}
        view={openingProgramme()}
        network={platformNetworkView()}
        plan={<StreamingLaunchBlueprintReview player={player} />}
        initialTab={openingProgrammeTab}
        launchReadiness={launchReadiness()}
        focus={openingProgrammeFocus}
        onBack={() => {
          setShowOpeningProgramme(false);
          setShowCinematicBuild(false);
          setShowDefineLaunch(false);
        }}
        onOpenContent={() => {
          setShowOpeningProgramme(false);
          setShowCinematicBuild(false);
          setShowDefineLaunch(false);
          setContentInitialTab('SLATE');
          setContentDeskOpening(count => count + 1);
          selectSection('CONTENT');
        }}
        onResolveClearance={(operationId) => {
          const operation = player.ownedStreamingPlatform.marketOperations.find(item => item.id === operationId);
          if (!operation?.clearance) return;
          const result = operation.clearance.outcome === 'ADDITIONAL_REQUIREMENT'
            ? resolveStreamingMarketRequirement(player, operationId)
            : resumeStreamingMarketClearance(player, operationId);
          if (result.changed) persist(result.player);
          else setCompanyFeedback(result.reason === 'TOO_EARLY'
            ? 'This revised application is still inside its cooling period.'
            : 'That government request cannot be resolved yet.');
        }}
        onOpeningNight={openCinematicPremiere}
      />
    );
  }

  if (showDefineLaunch && onUpdatePlayer) {
    return (
      <StreamingDefineLaunchWizard
        player={player}
        preparedCatalogueContext={catalogueContext()}
        onUpdatePlayer={persistCanonical}
        onClose={() => setShowDefineLaunch(false)}
        onOpenFinance={() => {
          setShowDefineLaunch(false);
          openFinanceRoom('CAPITAL', 'INJECT');
        }}
        onOpenCatalogue={() => {
          setShowDefineLaunch(false);
          setCatalogueReturnToLaunch(true);
          setContentInitialTab('LIBRARY');
          selectSection('CONTENT');
        }}
        onOpenContentDesk={() => {
          setShowDefineLaunch(false);
          setCatalogueReturnToLaunch(true);
          setContentInitialTab('LIBRARY');
          selectSection('CONTENT');
        }}
        onOpenBuild={() => {
          setShowDefineLaunch(false);
          openBuild();
        }}
        onOpenBuildBudget={() => {
          const destination = resolveLinkedBudgetDestination('LAUNCH');
          setShowDefineLaunch(false);
          setBuildInitialSheet(destination.sheet);
          openBuild();
        }}
        onOpenPricing={() => {
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep('PRICING');
        }}
        onOpenTechnology={techId => {
          setShowDefineLaunch(false);
          openPlatformTab('TECH', techId ?? null);
        }}
        mode={defineLaunchMode}
        initialStep={defineLaunchInitialStep}
        initialSheet={defineLaunchInitialSheet}
      />
    );
  }

  if (showCinematicBuild && !showFinanceRoom && !platform.launchCommit) {
    return (
      <StreamingBuildExperience
                streamingPlusOwned={hasStreamingPlus(player)}
        brand={commandDeckBrand()}
        signatoryName={player.name}
        inputs={marketingBuildInputs()}
        sel={buildSelection}
        result={buildRunResult}
        savedRehearsal={platform.infrastructureSetupDraft?.lastLaunchRehearsal}
        rehearsalConfigurationSignature={getCanonicalStreamingInfrastructureDraftForecast(player, canonicalInfrastructureDraft()).configurationSignature}
        built={builtPlacements()}
        builtFacilities={builtFacilities()}
        construction={constructionSetup ? {
          committedAtAbsoluteWeek: constructionSetup.committedAtAbsoluteWeek,
          readyAtAbsoluteWeek: constructionSetup.readyAtAbsoluteWeek,
        } : null}
        operations={networkOperations || campaignOperations}
        revisionQuote={platform.launchCommit ? selection => {
          const quote = getCanonicalStreamingInfrastructureDraftForecast(player, canonicalInfrastructureDraft(selection));
          return { dueNow: quote.transactionCost, weeklyCost: quote.weeklyOperatingCost, buildWeeks: quote.transactionCost === 0 ? 0 : quote.buildWeeks };
        } : undefined}
        campaignOnly={campaignOperations}
        isLive={Boolean(platform.launchCommit)}
        initialSheet={buildInitialSheet}
        launchBudget={launchBudget()}
        launchBlueprintSaved={Boolean(launchProgram().milestones.find(milestone => milestone.id === 'LAUNCH_BLUEPRINT')?.complete)}
        marketing={launchMarketing()}
        onChangeMarketing={updateLaunchMarketing}
        onResult={recordBuildRehearsal}
        onCommit={commitCinematicBuild}
        onValidateCommit={validateCinematicBuild}
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
          if (platform.launchCommit) {
            if (step === 'CATALOGUE') { setContentInitialTab('LIBRARY'); selectSection('CONTENT'); }
            else if (step === 'MARKETS' || step === 'CLEARANCE') { setAudienceEntryRequest({ tab: step === 'CLEARANCE' ? 'CLEARANCE' : 'CHOOSE' }); openAudienceTab('MARKETS'); selectSection('MARKET'); }
            else { setPlatformInitialTab('OFFER'); selectSection('TECH'); }
            return;
          }
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialStep(step);
          setShowDefineLaunch(true);
        }}
        onOpenLaunchBudget={() => {
          if (platform.launchCommit) { setShowCinematicBuild(false); openFinanceRoom(); return; }
          const destination = resolveLinkedBudgetDestination('BUILD');
          setShowCinematicBuild(false);
          setDefineLaunchMode('OPENING');
          setDefineLaunchInitialSheet(destination.sheet);
          setShowDefineLaunch(true);
        }}
        onChange={updateBuildSelection}
        onBack={() => { setShowCinematicBuild(false); setCampaignOperations(false); setNetworkOperations(false); }}
        pricing={{
          label: buildPricing().label,
          arpu: buildPricing().priceLabel,
          reach: buildPricing().sellable > 0 ? 'DEFINED' : 'PENDING',
          problems: buildPricing().sellable > 0 ? 0 : 1,
          sellable: buildPricing().sellable,
        }}
        onOpenPricing={() => {
          if (platform.launchCommit) { setShowCinematicBuild(false); setPlatformInitialTab('OFFER'); selectSection('TECH'); return; }
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

  if (showFinanceRoom) {
    return (
      <StreamingFinanceRoom
        brand={commandDeckBrand()}
        player={player}
        initialTab={financeInitialTab}
        initialCapitalView={financeInitialCapitalView}
        onInjectCapital={amount => {
          let result: { ok: boolean; message: string } = { ok: false, message: '' };
          chairAllow(() => { result = injectFinanceCapital(amount); });
          return result;
        }}
        yourMoneyActions={{
          setSalary: weekly => orTable(setStreamingFounderSalary(player, weekly), next => setStreamingFounderSalary(next, weekly)),
          payBonus: amount => orTable(payStreamingFounderBonus(player, amount), next => payStreamingFounderBonus(next, amount)),
          takeOut: toYou => orTable(takeStreamingMoneyOut(player, toYou), next => takeStreamingMoneyOut(next, toYou)),
          payOffEstate: () => {
            const result = payOffStreamingEstate(player);
            if (result.changed) chairAllow(() => persist(result.player));
            return { ok: result.changed, message: result.message };
          },
        }}
        onAcceptInvestment={acceptFinanceInvestment}
        onDeclineInvestment={declineFinanceInvestment}
        onOpenBuild={() => {
          setShowFinanceRoom(false);
          openBuild();
        }}
        onOpenBank={() => {
          setShowFinanceRoom(false);
          onOpenBank?.();
        }}
        onOpenLeadership={() => {
          setShowFinanceRoom(false);
          openBoardroom('TABLE');
        }}
        onOpenPublicMarkets={() => {
          setShowFinanceRoom(false);
          openBoardroom('MARKETS');
        }}
        onOpenMarket={() => {
          setShowFinanceRoom(false);
          selectSection('MARKET');
        }}
        onOpenTitle={titleId => {
          setShowFinanceRoom(false);
          openTitlePage(titleId);
        }}
        /* #175: owners, investors and the listing each have one home, in the Boardroom */
        onOpenOwnership={() => {
          setShowFinanceRoom(false);
          openBoardroom('OWNERSHIP');
        }}
        onOpenMarkets={() => {
          setShowFinanceRoom(false);
          openBoardroom('MARKETS');
        }}
        onClose={() => setShowFinanceRoom(false)}
      />
    );
  }

  if (showCinematicPremiere) {
    /* #257: saved but not yet watched (a reload during the show, the developer cheat): the night is still there to watch; after that, its record */
    if (platform.launchCommit && !premiereStartedHere && !pendingLaunchReveal) {
      return (
        <StreamingLaunchReceipt
          brand={commandDeckBrand()}
          network={platformNetworkView()}
          platformName={identity.name}
          commit={platform.launchCommit}
          onBack={() => finishPremiereNight('DISMISSED')}
          onOpen={() => finishPremiereNight()}
        />
      );
    }
    return (
      <StreamingPremiereExperience
        brand={commandDeckBrand()}
        inputs={cinematicPremiereInputs()}
        onBack={() => { setPremiereStartedHere(false); setShowCinematicPremiere(false); }}
        onLaunch={commitCinematicLaunch}
        onDone={() => pendingLaunchReveal ? finishPremiereNight() : setShowCinematicPremiere(false)}
      />
    );
  }

  if (showTitleDossier && cinematicDossier()) {
    return (
      <StreamingDossierExperience
        brand={commandDeckBrand()}
        t={cinematicDossier()}
        onClose={() => {
          setShowTitleDossier(false);
          setTitleDossierInitialProjectId(null);
        }}
        campaigns={titleCampaigns(cinematicDossier().id)}
        onAction={action => {
          /* #150: each button goes to the room that does it (the War Room is gone) */
          const projectId = cinematicDossier().id;
          const leave = () => { setShowTitleDossier(false); setTitleDossierInitialProjectId(null); };
          if (action === 'campaign') { leave(); openCampaignStudio(projectId); }
          else if (action === 'campaigns') { leave(); openCampaignStudio(null, titleCampaigns(projectId).latestId); }
          else if (action === 'renew' || action === 'spinoff') {
            /* #292: what comes next is on the title's own page */
            leave();
            openTitlePage(projectId);
          } else if (action === 'licence') {
            leave();
            const commission = platform.originalCommissions.find(item => item.canonicalProjectId === projectId);
            if (commission) {
              const result = decideStreamingOriginalFuture(player, commission.id, 'LICENSE_WINDOW');
              if (result.changed) persist(result.player);
              setOriginalDetailNotice(result.changed ? `${commission.title} is open to other services for a window.`
                : result.reason === 'REPORTS_MATURING' ? 'The first numbers are not in yet.' : 'It cannot be licensed out now.');
              setOriginalDetailId(commission.id);
            }
          } else if (action === 'renew-rights' || action === 'lapse') {
            leave();
            setRightsExchangeInitialTab('CALENDAR');
            setShowRightsExchange(true);
          }
        }}
      />
    );
  }

  if (showBrandStudio && platform.identity) {
    const tree = resolveStreamingTechTree(readPlatform);
    const identLocks = Object.fromEntries((['GENRE', 'ADAPTIVE', 'LIVING'] as const).flatMap(id => {
      const lock = streamingLaunchUnlockLock(tree, `ident:${id.toLowerCase()}`);
      return lock ? [[id, { techId: lock.techId, tech: lock.tech }]] : [];
    }));
    const offerActions = platformOffer().actions;
    return (
      <StreamingBrandStudio
        brand={commandDeckBrand()}
        view={getStreamingBrandStudioView(readPlayer)}
        ident={{ soundIdentKey: readPlatform.serviceConfiguration.soundIdentKey, packageId: readPlatform.serviceConfiguration.identPackageId }}
        identLocks={identLocks}
        identPlus={hasStreamingPlus(player) ? [] : (['CINEMATIC', 'LIVING'] as const).filter(id => id !== readPlatform.serviceConfiguration.identPackageId)}
        frontPage={platformOfferView().storefront}
        onApplyLook={look => {
          const result = applyStreamingBrandLook(player, look);
          if (result.changed) persistCanonical(result.player);
          return { ok: result.changed, message: result.message };
        }}
        onApplyIdent={input => {
          const result = rebrandStreamingIdent(player, input);
          if (result.changed) persistCanonical(result.player);
          return { ok: result.changed, message: result.message };
        }}
        onApplyFrontPage={offerActions.applyStorefront}
        onGoToTech={techId => { setShowBrandStudio(false); openPlatformTab('TECH', techId); }}
        onOpenDefineLaunch={() => { setShowBrandStudio(false); openLaunchDestination('SERVICE_IDENTITY'); }}
        onClose={() => setShowBrandStudio(false)}
      />
    );
  }

  if (showViewerMode) {
    return (
      <StreamingViewerApp
        brand={commandDeckBrand()}
        state={cinematicViewerState()}
        onBack={() => setShowViewerMode(false)}
      />
    );
  }

  /* the screen in front of the player is a desk (a section), not a room opened over it */
  const deckOnScreen = !showListing && !showContentMarket && !showCatalogSetup && !showOriginalsDesk && !showCommissionWizard && !showRightsExchange
    && !showFinanceRoom && !showTechnologyCampus
    && !showCampusConstruction && !showSlatePlanner
    && !(showIncidentCommand && incidentCommand().available)
    && !(showAnalyticsCenter && platform.launchCommit)
    && !(showTitleDossier && platform.launchCommit);
  /* the tour runs on the headquarters only; a stuck IN_PROGRESS from an older build simply resumes here */
  const tourOnScreen = onboarding.status === 'IN_PROGRESS' && !showWelcome && deckOnScreen && activeSection === 'HOME';
  const tourDeck = tourOnScreen ? commandDeckState() : null;
  const tourMode: StreamingHqTourMode = tourDeck?.live ? 'live' : tourDeck?.openingBuild ? 'building' : 'prelaunch';

  return (
    <div
      className="streaming-hq-shell"
      style={{
        '--hq-accent': identity.primaryColor,
        '--hq-secondary': identity.secondaryColor,
      } as React.CSSProperties}
    >
      <div className="streaming-zip-viewport" ref={mainRef} id="hq-main">
        {deckOnScreen ? renderSection() : null}
      </div>

      {tourOnScreen ? (
        <StreamingHqTour
          stepIndex={onboarding.currentStep}
          mode={tourMode}
          onNext={nextTourStep}
          onBack={backTourStep}
          onSkip={skipTour}
        />
      ) : null}

      {platform.publicCompany.listing && stockQuote() ? (
        <StreamingStockBug
          ticker={platform.publicCompany.listing.ticker}
          quote={stockQuote()}
          onOpen={() => setShowCinematicStock(true)}
        />
      ) : null}
      {showCinematicStock && platform.publicCompany.listing && stockQuote() ? (
        <StreamingStockPanel
          ticker={platform.publicCompany.listing.ticker}
          quote={stockQuote()}
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
            <span className="hq-eyebrow">YOUR HEADQUARTERS</span>
            <h1 id="hq-welcome-title">Welcome to {identity.name} Streaming Hall.</h1>
            <p>Your company is registered and its treasury opens at $0. Inject capital when you are ready to fund the build, or look around first. No money moves until you choose.</p>
            <div className="hq-welcome-map" aria-label="The four rooms of the headquarters">
              {WELCOME_ROOMS.map(id => {
                const section = STREAMING_HQ_SECTIONS.find(item => item.id === id);
                const Icon = SECTION_ICONS[id];
                return <span key={id}><Icon size={17} />{section?.label ?? id}</span>;
              })}
            </div>
            <button type="button" className="hq-primary-button" onClick={() => { skipTour(); openFinanceRoom('CAPITAL', 'INJECT'); }}>Inject capital <ChevronRight size={18} /></button>
            <button type="button" className="hq-text-button" onClick={startTour}>Take the Streaming Hall tour</button>
            <button type="button" className="hq-text-button" onClick={skipTour}>Explore on my own</button>
          </div>
        </AccessibleDialog>
      ) : null}



      {showTechnologyCampus ? (
        <StreamingTechnologyCampus
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          initialView={campusInitial.view}
          initialBranch={campusInitial.branch}
          onClose={() => setShowTechnologyCampus(false)}
          onOpenInfrastructure={() => {
            setShowTechnologyCampus(false);
            openBuild();
          }}
          onOpenCompany={() => {
            setShowTechnologyCampus(false);
            setActiveSection('COMPANY');
          }}
          onOpenProduct={() => {
            setShowTechnologyCampus(false);
            openPlatformTab('PRODUCTS');
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
            openBuild();
          }}
        />
      ) : null}
      {showContentMarket && !showCatalogSetup && !showRightsExchange ? (
        <StreamingContentMarket
          initialTab={contentMarketInitialTab}
          player={player} brand={commandDeckBrand()} onUpdatePlayer={onTrustedMarketUpdate || persist}
          initialOfferId={initialContentMarketOfferId}
          returnToLaunch={catalogueReturnToLaunch}
          onClose={() => {
            setShowContentMarket(false);
            setContentMarketInitialTab(undefined);
            if (catalogueReturnToLaunch) {
              setCatalogueReturnToLaunch(false);
              setDefineLaunchInitialStep('CATALOGUE');
              setShowDefineLaunch(true);
            } else { setContentInitialTab('LIBRARY'); selectSection('CONTENT'); }
          }}
          onOpenSlate={() => {
            setShowContentMarket(false);
            setContentMarketInitialTab(undefined);
            setContentInitialTab('SLATE');
            setContentDeskOpening(count => count + 1);
            selectSection('CONTENT');
          }}
          onOpenFinance={() => openFinanceRoom('CAPITAL', 'INJECT')}
          onCommission={() => setShowOriginalsDesk(true)}
          onResumeLegacy={() => { setCatalogSetupInitialStep(undefined); setShowCatalogSetup(true); }}
          onExistingNegotiations={() => setShowRightsExchange(true)}
          onReview={() => {
            if (platform.starterCatalog) {
              setShowContentMarket(false);
              setContentMarketInitialTab(undefined);
              setContentInitialTab('LIBRARY');
              selectSection('CONTENT');
            }
            else setCompanyFeedback('Add a title to establish your opening catalogue.');
          }}
        />
      ) : null}
      {showCatalogSetup ? (
        <StreamingCatalogSetup
          player={player}
          onUpdatePlayer={onUpdatePlayer!}
          onClose={closeCatalogSetup}
          initialStep={catalogSetupInitialStep}
        />
      ) : null}
      {showOriginalsDesk ? (
        <OriginalsDesk
          player={player}
          onUpdatePlayer={persist}
          onClose={() => setShowOriginalsDesk(false)}
          onCommission={pitchId => { setShowOriginalsDesk(false); setCommissionPitchId(pitchId || null); setShowCommissionWizard(true); }}
          onOpenReport={() => setShowAudienceReport(true)}
          onOpenTitle={commissionId => setOriginalDetailId(commissionId)}
        />
      ) : null}
      {originalDetailId ? (
        <OriginalTitleDetail
          key={originalDetailId}
          player={player}
          commissionId={originalDetailId}
          initialNotice={originalDetailNotice}
          onUpdatePlayer={persist}
          onClose={() => { setOriginalDetailId(null); setOriginalDetailNotice(''); setTitleDossierInitialProjectId(null); }}
          onOpenTitle={commissionId => { setOriginalDetailNotice(''); setTitleDossierInitialProjectId(null); setOriginalDetailId(commissionId); }}
          numbers={!showTitleDossier && cinematicDossier() ? { brand: commandDeckBrand(), title: cinematicDossier()! } : null}
          onAction={(action, detail) => {
            const projectId = detail.commission.canonicalProjectId;
            if (action === 'numbers' && projectId) {
              /* #317: a title has one page: its numbers open on it */
              setTitleDossierInitialProjectId(projectId);
            } else if (action === 'campaign' && projectId) {
              setOriginalDetailId(null);
              setShowOriginalsDesk(false);
              openCampaignStudio(projectId);
            } else if (action === 'slate') {
              setOriginalDetailId(null);
              setShowOriginalsDesk(false);
              /* before the service opens, the opening programme is the Slate */
              if (!platform.launchCommit) return whenCatalogueOpen(() => setShowSlatePlanner(true));
              setContentInitialTab('SLATE');
              setContentDeskOpening(value => value + 1);
              setActiveSection('CONTENT');
            } else if (action === 'studio') {
              setOriginalDetailId(null);
              setShowOriginalsDesk(false);
              if (detail.stage === 'NOT_STARTED') onOpenOriginalProduction?.({ studioId: detail.commission.producerStudioId, scriptId: detail.commission.scriptId, commissionId: detail.commission.id });
              else onOpenProductionHouse?.();
            }
          }}
        />
      ) : null}
      {showAudienceReport && getActiveAudienceReport(player) ? (
        <AudienceReportScreen
          report={getActiveAudienceReport(player)!}
          weeksLeft={getActiveAudienceReport(player)!.expiresAtAbsoluteWeek - getAbsoluteWeek(player.age, player.currentWeek)}
          fittingPitches={getLiveOriginalPitches(player).filter(pitch => getScriptGapFit(player, pitch.script.genres)).length}
          onClose={() => setShowAudienceReport(false)}
        />
      ) : null}
      {showCommissionWizard ? (
        <CommissionWizard
          player={player}
          onUpdatePlayer={persist}
          initialPitchId={commissionPitchId}
          onClose={() => { setShowCommissionWizard(false); setShowOriginalsDesk(true); }}
          onCommissioned={() => { setShowCommissionWizard(false); setShowOriginalsDesk(true); }}
          onOpenProductionHouse={onOpenProductionHouse ? () => { setShowCommissionWizard(false); onOpenProductionHouse(); } : undefined}
        />
      ) : null}
      {showRightsExchange ? (
        <StreamingRightsExchange
          player={player}
          initialTab={rightsExchangeInitialTab}
          onUpdatePlayer={next => persist(!next.ownedStreamingPlatform.starterCatalog && next.ownedStreamingPlatform.catalogProjectIds.length ? establishContentMarketCatalogue(next) : next)}
          onClose={() => { setShowRightsExchange(false); setRightsExchangeInitialTab('MARKET'); }}
          onOpenTitleDossier={projectId => {
            setShowRightsExchange(false);
            /* #317: an Original opens its one page from here too */
            openTitlePage(projectId);
          }}
          onOpenPromotion={projectId => {
            setShowRightsExchange(false);
            openCampaignStudio(projectId);
          }}
        />
      ) : null}
      {campaignStudio && platform.launchCommit ? (
        <CampaignStudio
          player={player}
          brand={commandDeckBrand()}
          onUpdatePlayer={persist}
          onClose={() => setCampaignStudio(null)}
          initialSubject={campaignStudio.subject}
          initialCampaignId={campaignStudio.campaignId ?? null}
          onOpenTitle={projectId => {
            setCampaignStudio(null);
            openTitlePage(projectId);
          }}
        />
      ) : null}
      {buildLockNotice && <StreamingBuildLockNotice service={identity.name} color={identity.primaryColor} weeksLeft={openingProgramme().remainingWeeks}
        onClose={() => setBuildLockNotice(false)} onSeeBuild={() => { setBuildLockNotice(false); openOpeningBuild(); }} />}
      {showListing ? (
        <StreamingListingHost
          player={player}
          onUpdatePlayer={next => chairAllow(() => persist(next))}
          onClose={() => setShowListing(false)}
          /* when the bell rings, public life lands on MARKETS */
          onListed={() => { setShowListing(false); openBoardroom('MARKETS'); }}
        />
      ) : null}
      {showIncidentCommand && incidentCommand().available ? (
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
            openCampaignStudio(projectId);
          }}
        />
      ) : null}
    </div>
  );
}
