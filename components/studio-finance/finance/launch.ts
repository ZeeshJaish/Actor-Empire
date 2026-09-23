/* ============================================================================
   DEFINE THE LAUNCH — data contract

   One of the two wizards on the streaming dashboard. It defines what the
   service will be; Build the Platform then has to support it.

   The wizard is a VIEW. It holds the player's in-progress choices as a draft
   and hands them back on save; it never spends money on its own. That matters
   because the whole flow rests on one rule: planning is free, and nothing is
   charged until the player confirms a paid step.
   ========================================================================== */

import type { CustomPoster, StreamingPricingPlanColorId } from '../../../types';
import type { WorldStreamingLaunchPricingForecast } from '../../../services/worldEconomy/worldStreamingPricingForecast';
import { calculateWorldStreamingCommercialRevenue } from '../../../services/worldEconomy/worldStreamingCommercialEconomy';
import { compactCount, money } from './format';
/* The one pricing model. A second, cruder one used to live in this file — 30%
   of the annual discount and 25% of the intro, blended flat across every plan
   for ever — and it disagreed with the canonical economy. It only ever ran when
   the world forecast was absent, which made the disagreement quiet rather than
   harmless. Both paths read the canonical model now. */
import {
  effectiveMonthlyStreamingPlanPrice,
  STREAMING_ANNUAL_BILLING_SHARE,
  streamingBillingPathPrice,
  streamingIntroOfferAppliesTo,
} from '../../../services/streamingPricingEconomy';

export type LaunchStepId =
  | 'markets' | 'clearance' | 'ident'
  | 'storefront' | 'pricing' | 'catalogue' | 'blueprint';

export type Competition = 'OPEN' | 'BUSY' | 'FIERCE';
export type Difficulty = 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';

export interface Share { name: string; share: number }

/* --- 1 · money --------------------------------------------------------------- */

export interface LaunchTreasury {
  available: number;
  founderContributed: number;
  /** What the current plan would cost if every step were confirmed. */
  planned: number;
  /** Already charged — clearance paid, ident commissioned. */
  committed: number;
  /** Paid launch costs retained for the expandable checklist receipt. */
  paid: number;
}

export interface CapitalRoute {
  id: string;
  name: string;
  state: 'open' | 'locked';
  note: string;
}

/* --- 2 · markets --------------------------------------------------------------- */

/** 0–3. The gauges in the country report are drawn from these; the strings
    beside them are the label, not the measurement. */
export interface DossierLevels {
  tax: number;
  review: number;
  privacy: number;
  localContent: number;
}

export interface CountryDossier {
  levels: DossierLevels;
  taxLoad: string;
  taxBaseline: string;
  streamingLevy: string;
  reviewComplexity: string;
  approvalWeeks: string;
  clearances: string[];
  consumerRequirements: string[];
  privacyLevel: string;
  localContentObligation: string;
  regulatoryExpectation: string;
  regulatoryOverhead: number;
  risks: string[];
  competitorAttention: Share[];
  edgeSites: number;
  peakConcurrent: number;
  bandwidthGbps: number;
  infraCity: string;
}

export interface Country {
  id: string;
  name: string;
  code: string;
  region: string;
  /** The bloc inside that region — the step between a continent and a country.
      Six regions is the right shape for a map and the wrong shape for a list:
      Europe holds forty-six countries and Africa fifty-four. */
  subRegionId?: string;
  subRegion?: string;
  /** True when this market's entry was written by hand rather than derived from
      the world registry. It is also the test for whether there is flag art and a
      full dossier to show, so it decides which of the two cards this country
      gets in the picker. */
  authored?: boolean;
  flagSrc?: string;
  competition: Competition;
  difficulty: Difficulty;
  audience: number;
  /** Reachable streaming households, derived from this country's viewer base.
      Pricing uses this rather than treating every viewer as a separate bill. */
  addressableHouseholds: number;
  /** Compact WE2/WE3 demand evidence used by the launch pricing preview. */
  pricingCohorts?: PricingCohortSignal[];
  growth: number;
  opportunity: string;
  languages: Share[];
  rightsEstimate: number;
  rivals: Share[];
  localizationNote: string;
  /** Compliance and regulatory setup, charged at Market Clearance. */
  complianceCost: number;
  dossier: CountryDossier;
}

export interface PricingCohortSignal {
  households: number;
  monthlyStreamingBudgetPerHousehold: number;
  priceSensitivityIndex: number;
  entertainmentAppetiteIndex: number;
  piracyTendencyIndex: number;
}

/* --- 3 · clearance -------------------------------------------------------------- */

export type ClearanceStage =
  | 'FILED' | 'RIGHTS' | 'REGULATORY' | 'COMPLIANCE' | 'APPROVAL';

export const CLEARANCE_STAGES: Array<{ id: ClearanceStage; label: string }> = [
  { id: 'FILED', label: 'Application filed' },
  { id: 'RIGHTS', label: 'Market access verification' },
  { id: 'REGULATORY', label: 'Regulatory review' },
  { id: 'COMPLIANCE', label: 'Consumer & data compliance' },
  { id: 'APPROVAL', label: 'Final approval' },
];

export type ClearanceOutcome =
  | 'NOT_FILED' | 'IN_REVIEW' | 'APPROVED' | 'CONDITIONS' | 'DELAYED'
  | 'DOCUMENT_REQUIRED' | 'PAYMENT_REQUIRED' | 'REJECTED' | 'REVISABLE';

export interface ClearanceState {
  countryId: string;
  outcome: ClearanceOutcome;
  /** How far the review has walked the five stages. */
  stage: ClearanceStage;
  /** Weeks left in the current review, when one is running. */
  weeksRemaining?: number;
  note?: string;
  /** What the player has to hand over to move it along. */
  requirement?: { label: string; cost?: number };
}

/* --- 4 · ident -------------------------------------------------------------------- */

export interface IdentSound {
  id: string;
  name: string;
  description: string;
}

export interface IdentCustomAudio {
  dataUrl: string;
  originalName: string;
  durationSeconds: number;
  sampleRate: number;
  byteLength: number;
  fingerprint: string;
}

export interface IdentPackage {
  id: string;
  name: string;
  cost: number;
  description: string;
  included: boolean;
  /** What actually gets made — drawn as frames, not described in prose. */
  frames: string[];
  /** Not a thing any real service does yet. Marked so the screen can say so. */
  future?: boolean;
  /** One consequence the player will feel. */
  effect?: string;
  /** The visible benefit a household receives from this identity system. */
  viewerImpact?: string;
}

/* --- 5 · storefront and pricing ----------------------------------------------------- */

export interface Approach {
  id: string;
  name: string;
  line: string;
  /** Two or three consequences, written as effects the player will feel. */
  effects: string[];
  /** Which authored composition the storefront designer draws. */
  layout?: 'hero' | 'shelves' | 'event' | 'channel' | 'wall' | 'feed'
    | 'rooms' | 'timeline' | 'concierge' | 'lobby' | 'split' | 'vault'
    | 'map' | 'binge' | 'canvas';
  /** Runtime family used by Opening Night and the subscriber app. */
  family?: 'cinema' | 'discovery' | 'event' | 'channel' | 'wall' | 'feed'
    | 'rooms' | 'timeline' | 'concierge' | 'lobby';
  category?: 'CORE' | 'EDITORIAL' | 'DISCOVERY' | 'LIVE' | 'COMMUNITY' | 'FRONTIER';
  experimental?: boolean;
  /** Pricing postures only: who this is actually for. */
  audience?: string;
  example?: string;
}

export interface PricingTier {
  id: string;
  name: string;
  monthly: number;
  positioning: string;
  expectedShare: number;
  revenuePerSubscriber: number;
  /** What the household actually gets. Streams, quality, downloads, adverts. */
  features: string[];
  ads?: boolean;
}

/* --- what a plan can offer -------------------------------------------------
   A rules table, not content: each feature carries the weight it adds to a
   household's willingness to subscribe. Adding one to a plan makes that plan
   more attractive at the same price. */

export interface PlanFeature {
  id: string;
  name: string;
  /** Appeal added. Roughly "how much more a household wants this plan". */
  value: number;
  group: 'quality' | 'access' | 'extras';
}

export const PLAN_FEATURES: PlanFeature[] = [
  { id: 'hd', name: '1080p', value: 0.5, group: 'quality' },
  { id: 'uhd', name: '4K HDR', value: 1.4, group: 'quality' },
  { id: 'spatial', name: 'Spatial audio', value: 0.5, group: 'quality' },
  { id: 'streams2', name: '2 streams', value: 0.7, group: 'access' },
  { id: 'streams4', name: '4 streams', value: 1.3, group: 'access' },
  { id: 'downloads', name: 'Downloads', value: 0.8, group: 'access' },
  { id: 'noads', name: 'No adverts', value: 1.6, group: 'access' },
  { id: 'early', name: 'Premieres a week early', value: 1.2, group: 'extras' },
  { id: 'live', name: 'Live events', value: 0.9, group: 'extras' },
  { id: 'extraseat', name: 'Extra member outside the home', value: 0.6, group: 'extras' },
  { id: 'catalogue', name: 'Full catalogue', value: 1.0, group: 'access' },
];

export interface Plan {
  id: string;
  name: string;
  monthly: number;
  featureIds: string[];
  ads: boolean;
  colorId?: CustomPlanColorId;
}

export const CUSTOM_PLAN_COLORS = [
  'emerald', 'ocean', 'teal', 'rose', 'magenta', 'graphite',
] as const satisfies readonly StreamingPricingPlanColorId[];
export type CustomPlanColorId = StreamingPricingPlanColorId;

/* --- how the service makes money -------------------------------------------
   Subscriptions are one option, not the premise. A service can run on
   advertising alone, on rentals alone, on any combination — and on two models
   nobody has shipped, because a game should be allowed to be ahead of the
   industry it copies.

   Each stream carries the real-world figure it is modelled on, so a player can
   see the game is not inventing its economics. */

export type StreamId =
  | 'subs' | 'ads' | 'rentals' | 'premium' | 'daypass' | 'sponsor' | 'metered' | 'patron';

export interface RevenueStream {
  id: StreamId;
  name: string;
  line: string;
  /** What this is modelled on in the real market. */
  real: string;
  experimental?: boolean;
}

export const REVENUE_STREAMS: RevenueStream[] = [
  { id: 'subs', name: 'Subscriptions', line: 'Monthly plans. The spine of almost every service.', real: 'Netflix $7.99–$24.99 · Max $9.99–$20.99' },
  { id: 'ads', name: 'Advertising', line: 'Sell the breaks. Works with a cheap tier or with no tier at all.', real: 'Streaming CPMs run $15–$35 · 4–6 minutes an hour' },
  { id: 'rentals', name: 'Rentals & purchases', line: 'New films to rent or own before they reach the catalogue.', real: 'Apple/Amazon PVOD $5.99 rent · $19.99 buy' },
  { id: 'premium', name: 'Premium access', line: 'Pay once to watch a premiere the day it opens.', real: 'Disney Premier Access charged $29.99' },
  { id: 'daypass', name: 'Day passes', line: 'Twenty-four hours of everything, no subscription.', real: 'Used by sport services; rare in film and television' },
  { id: 'sponsor', name: 'Sponsored titles', line: 'A brand pays for a show and is named on it.', real: 'Presented-by deals run $2M–$12M a title' },
  { id: 'metered', name: 'Pay by the hour', line: 'No plan at all — households buy hours and spend them.', real: 'Nobody has shipped this for film and television', experimental: true },
  { id: 'patron', name: 'Fund the show', line: 'Viewers put money directly into a production and are credited on it.', real: 'Crowdfunding logic applied to a studio', experimental: true },
];

export interface PricingSettings {
  /** Which streams are switched on. */
  streams: StreamId[];
  plans: Plan[];
  /** Percent off for paying a year up front. */
  annualDiscount: number;
  /** Percent off the first three months. */
  introOffer: number;
  /** Which plan that offer is on. Undefined means all of them. */
  introOfferPlanId?: string;
  ads: { minutesPerHour: number; cpm: number };
  rentals: { rent: number; buy: number; windowWeeks: number };
  premium: { price: number };
  daypass: { price: number };
  sponsor: { perTitle: number; titles: number };
  metered: { perHour: number };
  patron: { monthly: number };
}

/**
 * Money that does not come from a monthly subscription. Rentals, early access,
 * a season pass — plus the ones no service has shipped yet, which is where a
 * game gets to be more interesting than the market it copies.
 */
export interface RevenueModel {
  id: string;
  name: string;
  line: string;
  /** Added revenue per subscriber per month when switched on. */
  perSubscriber: number;
  /** Share of households that take it up, 0–100. */
  adoption: number;
  future?: boolean;
  /** What it costs you elsewhere — every model has a price. */
  cost?: string;
}

/* --- 6 · catalogue -------------------------------------------------------------------- */

export interface AnchorTitle {
  id: string;
  name: string;
  format: string;
  posterSeed?: string;
  /** Real player-created poster when one exists; generated game art is the fallback. */
  poster?: CustomPoster;
  linked: boolean;
  note?: string;
}

export interface CatalogueState {
  established?: boolean;
  hasDraft?: boolean;
  hoursEstimated?: boolean;
  readyForLaunch?: boolean;
  /** Everything that could be on the service on night one. */
  titles: number;
  hours: number;
  /** Strategy-specific depth guide, not a legal launch requirement. */
  hoursNeeded: number;
  ownedAvailable: number;
  ownedLinked: number;
  externalLicences: number;
  activeAgreements: number;
  genreCoverage: Share[];
  gaps: string[];
  /** 0–1. Drives the readiness meter and the Opening Night verdict. */
  readiness: number;
  anchors: AnchorTitle[];
  shelfStrategy: string;
}

/* --- 7 · rights and localization --------------------------------------------------------- */

export interface RightsRow {
  titleId: string;
  title: string;
  /** countryId → cleared / missing / expiring. */
  status: Record<string, 'CLEARED' | 'MISSING' | 'EXPIRING'>;
  licenceCost?: number;
  expiryNote?: string;
}

export interface LanguageAsset {
  language: string;
  subtitles: 'READY' | 'IN_WORK' | 'MISSING';
  dubbing: 'READY' | 'IN_WORK' | 'MISSING' | 'NOT_PLANNED';
  eta?: string;
  cost?: number;
}

export interface LocalizationState {
  languagesRequired: string[];
  assets: LanguageAsset[];
  inHouse: boolean;
  totalCost: number;
  note: string;
}

/* --- the whole thing ---------------------------------------------------------------------- */

export interface LaunchBlocker {
  id: string;
  step: LaunchStepId;
  text: string;
  severity: 'block' | 'warn';
}

export interface LaunchData {
  company: {
    name: string;
    week: number;
    brandHex?: string;
    markId?: string;
    /** The logo the player uploaded when they founded the service. The ident
        preview animates this when it is there and falls back to a drawn mark
        when it is not — the screen has to work either way. */
    logoSrc?: string;
  };
  treasury: LaunchTreasury;
  energy: { current: number; max: number };
  capitalRoutes: CapitalRoute[];
  regions: string[];
  countries: Country[];
  /** Already chosen in a previous session. */
  selectedCountryIds: string[];
  clearance: ClearanceState[];
  identSounds: IdentSound[];
  identPackages: IdentPackage[];
  ident: {
    soundId?: string;
    packageId?: string;
    commissioned: boolean;
    committedCost: number;
    /** Package purchases are scoped to this launch campaign. A bought package
        can be revisited freely here, but is not permanent redesign ownership. */
    purchasedPackageIds: string[];
    customAudio?: IdentCustomAudio | null;
  };
  storefronts: Approach[];
  /** Real game-world titles used to make storefront layout previews tangible. */
  storefrontTitles: AnchorTitle[];
  pricingApproaches: Approach[];
  /** Where the player's pricing starts. They can rename, reprice, add and
      remove plans from here, and switch whole revenue streams on or off. */
  pricing: PricingSettings;
  /** What a household pays elsewhere — the yardstick the forecast compares to. */
  market: { rivalAveragePrice: number; reachRate: number };
  offer: { storefrontId?: string; saved: boolean };
  catalogue: CatalogueState;
  forecast: { audience: number; peakConcurrent: number; bandwidthGbps: number; edgeSites: number };
  blockers: LaunchBlocker[];
  blueprintSaved: boolean;
  /** key namespaces: stream:, feature:, storefront:, ident:. */
  capabilityLocks: Record<string, string>;
}

/** What the player has changed but not yet handed back to the game. */
export interface LaunchDraft {
  selectedCountryIds: string[];
  /** Player-set monthly price per tier. Absent means the tier's default. */
  tierPrices?: Record<string, number>;
  soundId?: string;
  packageId?: string;
  customAudio?: IdentCustomAudio | null;
  storefrontId?: string;
  /** The player's working pricing. Starts as a copy of data.pricing. */
  pricing?: PricingSettings;
}

const copyLaunchPricing = (pricing: PricingSettings): PricingSettings => ({
  ...pricing,
  streams: [...pricing.streams],
  plans: pricing.plans.map(plan => ({ ...plan, featureIds: [...plan.featureIds] })),
  ads: { ...pricing.ads },
  rentals: { ...pricing.rentals },
  premium: { ...pricing.premium },
  daypass: { ...pricing.daypass },
  sponsor: { ...pricing.sponsor },
  metered: { ...pricing.metered },
  patron: { ...pricing.patron },
});

/**
 * Restores the player's in-progress launch choices after visiting another HQ
 * room. Confirmed game state remains canonical; this is only the working copy
 * that would otherwise disappear when the wizard unmounts.
 */
export function resolveLaunchDraftAfterDetour(
  canonicalDraft: LaunchDraft,
  retainedDraft: LaunchDraft | null | undefined,
): LaunchDraft {
  const source = retainedDraft ?? canonicalDraft;
  return {
    ...source,
    selectedCountryIds: [...source.selectedCountryIds],
    ...(source.tierPrices ? { tierPrices: { ...source.tierPrices } } : {}),
    ...('customAudio' in source
      ? { customAudio: source.customAudio ? { ...source.customAudio } : source.customAudio }
      : {}),
    ...(source.pricing ? { pricing: copyLaunchPricing(source.pricing) } : {}),
  };
}

export interface LaunchHandlers {
  onExit?: () => void;
  /** Funding is Studio Finance's job — this wizard never duplicates it. */
  onOpenStudioFinance?: () => void;
  onSaveFootprint?: (countryIds: string[]) => void;
  /** plannedCountryIds lets filing save the visible draft before the paid
      action runs, so a player never has to discover a hidden Save step. */
  onBeginMarketEntry?: (countryIds: string[], plannedCountryIds?: string[]) => void;
  onSubmitRequirement?: (countryId: string) => void;
  onFileRevisedApplication?: (countryId: string) => void;
  onSelectIdent?: (soundId: string, packageId: string, customAudio?: IdentCustomAudio | null) => void;
  /** Reaching for a locked option abandons the current choice: the stage ends
      with nothing selected rather than silently keeping the previous pick. */
  onClearIdent?: () => void;
  onClearViewerOffer?: () => void;
  /** Research-gated identity previews lead to the canonical Technology Campus. */
  onOpenTechnology?: () => void;
  onRemoveCustomIdentAudio?: () => void;
  onSaveViewerOffer?: (storefrontId: string) => void;
  onSavePricing?: (pricing: PricingSettings) => void;
  /** Counterfactual launch offer evaluated by the live country/cohort/rival engine. */
  onForecastPricing?: (pricing: PricingSettings, countryIds: string[]) => WorldStreamingLaunchPricingForecast;
  onSetTierPrices?: () => void;
  onAssembleCatalogue?: () => void;
  onOpenContentDesk?: () => void;
  onOpenRightsDesk?: () => void;
  onSaveBlueprint?: () => void;
  onOpenBuildPlatform?: () => void;
  onOpenBuildBudget?: () => void;
  onStepChange?: (step: LaunchStepId) => void;
}

/* --- derivations -------------------------------------------------------------------------- */

/* Funding is not a step. It is a condition of every step, so it lives in the
   money rail at the top of the screen instead of as a page the player walks
   past once and never returns to. */
export const STEPS: Array<{ id: LaunchStepId; label: string; verb: string }> = [
  { id: 'markets', label: 'Markets', verb: 'Choose opening markets' },
  { id: 'clearance', label: 'Clearance', verb: 'Clear the markets' },
  { id: 'ident', label: 'Ident', verb: 'Commission the ident' },
  { id: 'storefront', label: 'Store', verb: 'Design the front page' },
  { id: 'catalogue', label: 'Catalogue', verb: 'Assemble opening night' },
  { id: 'pricing', label: 'Pricing', verb: 'Price the service' },
  { id: 'blueprint', label: 'Blueprint', verb: 'Review the launch blueprint' },
];

export function spendable(treasury: LaunchTreasury): number {
  return Math.max(0, treasury.available - treasury.committed);
}

export function shortfall(treasury: LaunchTreasury): number {
  return Math.max(0, treasury.planned - spendable(treasury));
}

export function countriesById(data: LaunchData): Map<string, Country> {
  return new Map(data.countries.map((c) => [c.id, c]));
}

export function selectedCountries(data: LaunchData, draft: LaunchDraft): Country[] {
  const map = countriesById(data);
  return draft.selectedCountryIds
    .map((id) => map.get(id))
    .filter((c): c is Country => Boolean(c));
}

export interface FootprintSummary {
  countries: number;
  regions: number;
  audience: number;
  growth: number;
  rights: number;
  compliance: number;
  languages: string[];
  competition: Competition;
  difficulty: Difficulty;
  rivals: Share[];
  verdict: string;
}

const COMPETITION_RANK: Competition[] = ['OPEN', 'BUSY', 'FIERCE'];
const DIFFICULTY_RANK: Difficulty[] = ['LOW', 'MODERATE', 'HIGH', 'SEVERE'];

/** The same arithmetic serves one region and the whole footprint. */
export function summarize(countries: Country[]): FootprintSummary {
  if (countries.length === 0) {
    return {
      countries: 0, regions: 0, audience: 0, growth: 0, rights: 0, compliance: 0,
      languages: [], competition: 'OPEN', difficulty: 'LOW', rivals: [],
      verdict: 'No markets chosen yet. Opening Day needs at least one.',
    };
  }

  const audience = countries.reduce((sum, c) => sum + c.audience, 0);
  const rights = countries.reduce((sum, c) => sum + c.rightsEstimate, 0);
  const compliance = countries.reduce((sum, c) => sum + c.complianceCost, 0);
  /* Growth is weighted by audience — a 40% growth market with two million
     viewers should not drag the average around. */
  const growth = countries.reduce((sum, c) => sum + c.growth * c.audience, 0) / Math.max(1, audience);
  const languages = [...new Set(countries.flatMap((c) => c.languages.map((l) => l.name)))];
  const regions = new Set(countries.map((c) => c.region)).size;

  const competition = COMPETITION_RANK[
    Math.round(countries.reduce((sum, c) => sum + COMPETITION_RANK.indexOf(c.competition), 0) / countries.length)
  ];
  const difficulty = DIFFICULTY_RANK[
    Math.round(countries.reduce((sum, c) => sum + DIFFICULTY_RANK.indexOf(c.difficulty), 0) / countries.length)
  ];

  const rivalTotals = new Map<string, number>();
  countries.forEach((c) => c.rivals.forEach((r) => {
    rivalTotals.set(r.name, (rivalTotals.get(r.name) ?? 0) + r.share * c.audience);
  }));
  const rivals = [...rivalTotals.entries()]
    .map(([name, weighted]) => ({ name, share: weighted / Math.max(1, audience) }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 3);

  return {
    countries: countries.length,
    regions,
    audience,
    growth,
    rights,
    compliance,
    languages,
    competition,
    difficulty,
    rivals,
    verdict: verdictFor(countries.length, regions, competition, difficulty, languages.length),
  };
}

function verdictFor(count: number, regions: number, competition: Competition, difficulty: Difficulty, languages: number): string {
  if (count === 1) return 'A single-market opening. Cheap to clear, easy to serve, and slow to grow.';
  if (regions >= 3 && difficulty !== 'LOW') return 'Three regions on day one. Ambitious — clearance, rights and edge capacity all triple at once.';
  if (competition === 'FIERCE') return 'Every rival defends these markets. Expect to buy attention rather than inherit it.';
  if (languages > 3) return `${languages} languages to service. Localization becomes the long pole, not the network.`;
  return 'A contained opening footprint. Clearance and capacity stay inside one build.';
}

/** Everything the current plan would cost if confirmed. */
export function plannedTotal(data: LaunchData, draft: LaunchDraft): number {
  const unpaid = (countryId: string) => {
    const state = data.clearance.find(clearance => clearance.countryId === countryId);
    return !state || state.outcome === 'NOT_FILED';
  };
  const countryCost = (countryId: string) => {
    const country = data.countries.find(item => item.id === countryId);
    return country && unpaid(countryId) ? country.rightsEstimate + country.complianceCost : 0;
  };
  const savedMarketPlan = data.selectedCountryIds.reduce((sum, id) => sum + countryCost(id), 0);
  const draftMarketPlan = draft.selectedCountryIds.reduce((sum, id) => sum + countryCost(id), 0);
  const identPackage = data.identPackages.find((p) => p.id === draft.packageId);
  const identOwned = Boolean(identPackage && data.ident.purchasedPackageIds.includes(identPackage.id));
  const identCost = identPackage && !identPackage.included && !identOwned ? identPackage.cost : 0;
  return Math.max(0, data.treasury.planned - savedMarketPlan + draftMarketPlan + identCost);
}

export interface LaunchStageSummary {
  id: LaunchStepId;
  label: string;
  done: boolean;
  cost: number | null;
  paidAmount: number;
  paymentState: 'included' | 'paid' | 'partial' | 'planned' | 'pending';
}

/** The compact launch bill is intentionally stage-level. It answers what is
    finished and what each part costs without exposing the accounting ledger. */
export function launchStageSummaries(data: LaunchData, draft: LaunchDraft): LaunchStageSummary[] {
  const selected = data.selectedCountryIds;
  const marketCost = selected.reduce((sum, id) => {
    const country = data.countries.find(item => item.id === id);
    return sum + (country ? country.rightsEstimate + country.complianceCost : 0);
  }, 0);
  const filedCount = selected.filter(id => {
    const state = data.clearance.find(item => item.countryId === id);
    return state && state.outcome !== 'NOT_FILED';
  }).length;
  const filedCost = selected.reduce((sum, id) => {
    const state = data.clearance.find(item => item.countryId === id);
    const country = data.countries.find(item => item.id === id);
    return sum + (state && state.outcome !== 'NOT_FILED' && country ? country.rightsEstimate + country.complianceCost : 0);
  }, 0);
  const clearanceDone = selected.length > 0 && filedCount === selected.length;
  const pack = data.identPackages.find(item => item.id === draft.packageId);
  const packageOwned = Boolean(pack && (pack.included || data.ident.purchasedPackageIds.includes(pack.id)));
  const sameCustom = (draft.soundId !== 'custom' && !data.ident.customAudio)
    || draft.customAudio?.fingerprint === data.ident.customAudio?.fingerprint;
  const identDone = Boolean(
    data.ident.commissioned
    && draft.soundId === data.ident.soundId
    && draft.packageId === data.ident.packageId
    && sameCustom,
  );
  const noBlocker = (step: LaunchStepId) => !data.blockers.some(blocker => blocker.step === step);

  return [
    { id: 'markets', label: 'Opening markets', done: selected.length > 0, cost: 0, paidAmount: 0, paymentState: 'included' },
    {
      id: 'clearance', label: 'Market clearance', done: clearanceDone, cost: marketCost, paidAmount: filedCost,
      paymentState: clearanceDone ? 'paid' : filedCost > 0 ? 'partial' : marketCost > 0 ? 'planned' : 'pending',
    },
    {
      id: 'ident', label: 'Service ident', done: identDone, cost: pack ? pack.cost : null,
      paidAmount: pack && packageOwned && !pack.included ? pack.cost : 0,
      paymentState: pack ? packageOwned ? (pack.included ? 'included' : 'paid') : 'planned' : 'pending',
    },
    { id: 'storefront', label: 'Storefront', done: data.offer.saved && draft.storefrontId === data.offer.storefrontId, cost: 0, paidAmount: 0, paymentState: 'included' },
    { id: 'catalogue', label: 'Opening catalogue', done: data.catalogue.titles > 0 && noBlocker('catalogue'), cost: null, paidAmount: 0, paymentState: 'pending' },
    { id: 'pricing', label: 'Pricing', done: noBlocker('pricing'), cost: 0, paidAmount: 0, paymentState: 'included' },
    { id: 'blueprint', label: 'Launch blueprint', done: data.blueprintSaved && noBlocker('blueprint'), cost: 0, paidAmount: 0, paymentState: 'included' },
  ];
}

/* --- the strip above the footer ------------------------------------------
   Seven steps, one running total. A money rail used to sit at the top of every
   screen saying what the studio held and what the plan would cost; it said the
   same thing on all seven and nothing about the step you were actually on.
   The strip says both — the step's own number and state, over the same money
   and the same gauge the rail carried. */

/** Structurally the kit's `StripView`; declared here so the domain module does
    not have to import a component to describe its own summary. */
export interface LaunchStripView {
  subject: string;
  value: number;
  format: (value: number) => string;
  unit?: string;
  verdict?: { label: string; tone: 'good' | 'warn' | 'bad' | 'flat' };
  gauge: { value: number; limit: number; label: string };
}

const whole = (value: number): string => String(Math.round(value));

/** What the service would earn at the prices currently set. Passed in rather
    than recomputed, because the forecast needs a handler only the wizard holds
    and two models under one label is how a number starts disagreeing with
    itself. */
export interface LaunchEarnings { households: number; monthly: number; yearly: number; position: string }

export function launchStepBar(
  data: LaunchData,
  draft: LaunchDraft,
  stepId: LaunchStepId,
  earnings?: LaunchEarnings | null,
): LaunchStripView {
  const planned = plannedTotal(data, draft);
  const free = spendable({ ...data.treasury, planned });
  const stage = launchStageSummaries(data, draft).find((row) => row.id === stepId);
  const blockers = blockersFor(stepId, data);
  const blocked = blockers.find((b) => b.severity === 'block');
  const warned = blockers.find((b) => b.severity === 'warn');

  /* The step's state in five words the Build wizard also uses, so a stage
     there and a step here read the same. #52 put the blocker's own sentence
     here instead — but that sentence is already on screen, in the blocker list
     directly above the strip, and a pill is not the place for prose: *No
     service ident has been commissioned.* wrapped the state three lines deep
     and pushed the figure down with it. */
  const verdict = blocked ? { label: 'Blocked', tone: 'bad' as const }
    : warned ? { label: 'Needs a look', tone: 'warn' as const }
      : stage?.done ? { label: 'Settled', tone: 'good' as const }
        : { label: 'Still open', tone: 'flat' as const };

  /* Money is a condition of every step, not a step of its own — the strip
     carries it structurally, the same bar on all seven. What belongs to the
     step is how far the step itself has got, which is what this reads out. */
  const base = { subject: STEPS.find((step) => step.id === stepId)?.label ?? 'Plan', verdict };

  const chosen = selectedCountries(data, draft);
  const catalogue = data.catalogue;

  if (stepId === 'markets') {
    return {
      ...base,
      value: chosen.length,
      format: whole,
      unit: chosen.length === 1 ? 'market' : 'markets',
      gauge: {
        value: chosen.length,
        limit: Math.max(1, data.countries.length),
        label: `${chosen.length} of ${data.countries.length} markets chosen`,
      },
    };
  }

  if (stepId === 'clearance') {
    const filed = chosen.filter((country) => {
      const state = data.clearance.find((row) => row.countryId === country.id);
      return state && state.outcome !== 'NOT_FILED';
    });
    const cost = (list: Country[]) => list.reduce((sum, c) => sum + c.rightsEstimate + c.complianceCost, 0);
    const outstanding = cost(chosen) - cost(filed);
    return {
      ...base,
      value: filed.length,
      format: whole,
      unit: 'filed',
      gauge: {
        value: filed.length,
        limit: Math.max(1, chosen.length),
        label: `${filed.length} of ${chosen.length} markets filed`,
      },
    };
  }

  if (stepId === 'ident') {
    const pack = data.identPackages.find((item) => item.id === draft.packageId);
    const sound = data.identSounds.find((item) => item.id === draft.soundId);
    const owned = Boolean(pack && (pack.included || data.ident.purchasedPackageIds.includes(pack.id)));
    return {
      ...base,
      value: pack ? pack.cost : 0,
      format: money,
      gauge: {
        value: data.ident.commissioned ? 1 : 0,
        limit: 1,
        label: data.ident.commissioned ? 'Ident commissioned' : 'Ident not commissioned',
      },
    };
  }

  if (stepId === 'storefront') {
    /* The front page arranges the catalogue, so the number that matters here
       is how much there is to arrange. */
    const approach = data.storefronts.find((item) => item.id === draft.storefrontId);
    return {
      ...base,
      value: catalogue.titles,
      format: whole,
      unit: catalogue.titles === 1 ? 'title to arrange' : 'titles to arrange',
      gauge: {
        value: data.offer.saved ? 1 : 0,
        limit: 1,
        label: data.offer.saved && draft.storefrontId === data.offer.storefrontId
          ? 'Front page saved'
          : 'Front page not saved yet',
      },
    };
  }

  if (stepId === 'catalogue') {
    return {
      ...base,
      value: catalogue.titles,
      format: whole,
      unit: catalogue.titles === 1 ? 'title' : 'titles',
      gauge: {
        value: Math.round(catalogue.readiness * 100),
        limit: 100,
        label: `${Math.round(catalogue.readiness * 100)}% ready for opening night`,
      },
    };
  }

  if (stepId === 'pricing') {
    const pricing = draft.pricing ?? data.pricing;
    const entry = pricing.plans.reduce<number | null>(
      (low, plan) => (low === null || plan.monthly < low ? plan.monthly : low),
      null,
    );
    /* The step's own figure is what the prices earn, not what the cheapest one
       costs — the same monthly revenue the page prints at the end of itself. */
    return {
      ...base,
      value: earnings ? earnings.monthly : entry ?? 0,
      format: money,
      /* Two characters, because the cell is the same width on every page and
         "a month" spent three of them on being clipped. */
      unit: '/mo',
      gauge: {
        value: pricing.plans.length,
        limit: Math.max(1, pricing.plans.length),
        /* The read on the prices. It was the last line of a panel at the foot
           of the step; the panel repeated what the strip and the blueprint
           already said, so it went, and this is the sentence worth keeping. */
        label: earnings
          ? `${compactCount(earnings.households)} households · ${money(earnings.yearly)} a year · ${earnings.position}`
          : `${pricing.plans.length} ${pricing.plans.length === 1 ? 'plan' : 'plans'} priced across ${pricing.streams.length} ${pricing.streams.length === 1 ? 'stream' : 'streams'}`,
      },
    };
  }

  /* The blueprint is the page that judges the whole plan, so its verdict counts
     what the whole plan still owes — the same blockers the page itself counts,
     rather than only the ones filed against this last step. A summary page and
     the strip under it saying different numbers is the worst of both. */
  const blocking = data.blockers.filter((b) => b.severity === 'block').length;
  return {
    ...base,
    verdict: blocking > 0
      ? { label: `${blocking} thing${blocking === 1 ? '' : 's'} still blocking`, tone: 'bad' as const }
      : data.blueprintSaved
        ? { label: 'Ready to open', tone: 'good' as const }
        : { label: 'Not saved yet', tone: 'warn' as const },
    value: planned,
    format: money,
    gauge: {
      value: launchStageSummaries(data, draft).filter((row) => row.done).length,
      limit: 7,
      label: `${launchStageSummaries(data, draft).filter((row) => row.done).length} of 7 steps settled`,
    },
  };
}

/** How much of a market no rival holds — the part worth opening for. */
export function unclaimed(rivals: Share[]): number {
  return Math.max(0, 100 - rivals.reduce((sum, r) => sum + r.share, 0));
}

/**
 * What the tiers look like at the prices the player has set. Demand moves
 * against price with a mild elasticity and is renormalised across the tiers,
 * so pushing the premium tier up pushes households down into the cheap one
 * rather than out of the service — which is what actually happens.
 */
export function pricedTiers(tiers: PricingTier[], prices?: Record<string, number>): Array<PricingTier & { priced: number; adRevenue: number }> {
  const rows = tiers.map((tier) => {
    const priced = prices?.[tier.id] ?? tier.monthly;
    const adRevenue = Math.max(0, tier.revenuePerSubscriber - tier.monthly);
    const pull = tier.expectedShare * (tier.monthly / Math.max(1, priced)) ** 1.1;
    return { ...tier, priced, adRevenue, pull };
  });
  const total = rows.reduce((sum, r) => sum + r.pull, 0) || 1;
  return rows.map(({ pull, ...row }) => ({
    ...row,
    expectedShare: (pull / total) * 100,
    revenuePerSubscriber: row.priced + row.adRevenue,
  }));
}

/* --- the forecast -----------------------------------------------------------
   One model, used by the pricing stage and by the blueprint, so the number the
   player tunes is the number the plan is judged on. Every constant here is
   named and anchored to something real; none of it is a magic multiplier.
   ========================================================================== */

export interface PlanForecast {
  plan: Plan;
  share: number;
  subscribers: number;
  revenuePerSubscriber: number;
  monthly: number;
  monthlyBillingSubscribers: number;
  annualBillingSubscribers: number;
}

export interface StreamForecast {
  id: StreamId;
  name: string;
  monthly: number;
  /** One line saying where the money comes from. */
  basis: string;
}

export interface PricingForecast {
  addressable: number;
  /** Households paying a subscription. */
  subscribers: number;
  /** Households reached at all, including free advert-funded ones. */
  households: number;
  plans: PlanForecast[];
  streams: StreamForecast[];
  monthlyRevenue: number;
  yearlyRevenue: number;
  conservativeMonthlyRevenue: number;
  breakoutMonthlyRevenue: number;
  perHousehold: number;
  position: string;
  entryPrice: number;
  activeRivalCount?: number;
  rivalMedianEntryPrice?: number;
}

const AD_SPOTS_PER_MINUTE = 2;      // 30-second spots
const HOURS_PER_MONTH = 32;         // what an engaged household watches
const RENT_PER_MONTH = 0.8;         // rentals per renting household
const RENTER_SHARE = 0.18;
const BUYER_SHARE = 0.03;
const PREMIUM_SHARE = 0.06;         // households buying premiere access
const PREMIUM_PER_QUARTER = 1 / 3;
const DAYPASS_SHARE = 0.12;
const DAYPASS_PER_MONTH = 1.4;
const METERED_HOURS = 9;            // hours a metered household buys
const PATRON_SHARE = 0.02;
const FREE_REACH_BONUS = 1.9;       // an advert-funded service reaches wider

export function planAppeal(plan: Plan): number {
  const value = plan.featureIds.reduce((sum, id) => sum + (PLAN_FEATURES.find((f) => f.id === id)?.value ?? 0), 0);
  return (value + 0.6) * (plan.ads ? 0.82 : 1);
}

export function forecastPricing(
  settings: PricingSettings,
  addressable: number,
  market: { rivalAveragePrice: number; reachRate: number },
  cohortSignals: PricingCohortSignal[] = [],
  worldForecast?: WorldStreamingLaunchPricingForecast | null,
): PricingForecast {
  const on = (id: StreamId) => settings.streams.includes(id);
  const plans = on('subs') ? settings.plans : [];

  /* Who subscribes. The cheapest way in, measured against what rivals charge. */
  const entryPrice = plans.length > 0 ? Math.min(...plans.map((p) => p.monthly)) : 0;
  const openingPriceByPlan = new Map(plans.map(plan => [plan.id, effectiveMonthlyStreamingPlanPrice(
    plan.monthly, settings.annualDiscount, settings.introOffer, 0,
    streamingIntroOfferAppliesTo(plan.id, settings.introOfferPlanId),
  )]));
  const openingEntryPrice = plans.length > 0 ? Math.min(...openingPriceByPlan.values()) : 0;
  const subReach = plans.length > 0
    ? market.reachRate * Math.min(1.6, Math.max(0.35, (market.rivalAveragePrice / Math.max(1, openingEntryPrice)) ** 0.55))
    : 0;
  const cohortPlanSubscribers = new Map<string, number>();
  const cohortPlanPathSubscribers = new Map<string, number>();
  const signalHouseholds = cohortSignals.reduce((total, cohort) => total + Math.max(0, cohort.households), 0);
  const signalScale = Math.min(1, addressable / Math.max(1, signalHouseholds));
  const cohortSubscribers = plans.length && cohortSignals.length
    ? cohortSignals.reduce((total, cohort) => {
      const budget = Math.max(.5, cohort.monthlyStreamingBudgetPerHousehold);
      return total + (['MONTHLY', 'ANNUAL'] as const).reduce((pathTotal, billingPath) => {
        const pathPrice = (plan: Plan) => streamingBillingPathPrice(plan.monthly,
          settings.annualDiscount, settings.introOffer, 0, billingPath,
          streamingIntroOfferAppliesTo(plan.id, settings.introOfferPlanId));
        const candidates = plans.filter(plan => pathPrice(plan) <= budget * 1.15);
        if (!candidates.length) return pathTotal;
        const planScores = candidates.map(plan => {
          const priceFit = Math.max(.08, 1 - pathPrice(plan) / Math.max(1, budget) * (.42 + cohort.priceSensitivityIndex / 260));
          return { plan, score: Math.max(.01, planAppeal(plan) * priceFit) };
        });
        const bestAppeal = Math.max(0, ...candidates.map(planAppeal));
        const demandRate = Math.min(.95, Math.max(.002,
          market.reachRate * (
            .42 + bestAppeal / 34 + cohort.entertainmentAppetiteIndex / 180
            - cohort.piracyTendencyIndex / 310
            + Math.min(.3, budget / Math.max(1, market.rivalAveragePrice) * .08)
          ),
        ));
        const pathShare = billingPath === 'ANNUAL' ? STREAMING_ANNUAL_BILLING_SHARE : 1 - STREAMING_ANNUAL_BILLING_SHARE;
        const won = Math.max(0, cohort.households * pathShare * signalScale * demandRate);
        const scoreTotal = planScores.reduce((sum, row) => sum + row.score, 0) || 1;
        planScores.forEach(row => {
          const accounts = won * row.score / scoreTotal;
          cohortPlanSubscribers.set(row.plan.id, (cohortPlanSubscribers.get(row.plan.id) || 0) + accounts);
          const key = `${billingPath}:${row.plan.id}`;
          cohortPlanPathSubscribers.set(key, (cohortPlanPathSubscribers.get(key) || 0) + accounts);
        });
        return pathTotal + won;
      }, 0);
    }, 0)
    : addressable * subReach;
  const resolvedAddressable = worldForecast?.reachableHouseholds ?? addressable;
  const subscribers = worldForecast?.subscribers ?? Math.min(addressable, cohortSubscribers);

  /* A service with advertising also reaches households that never pay. */
  const freeHouseholds = on('ads')
    ? Math.min(
      Math.max(0, resolvedAddressable - subscribers),
      resolvedAddressable * market.reachRate * (plans.length > 0 ? 0.6 : FREE_REACH_BONUS),
    )
    : 0;
  const households = subscribers + freeHouseholds;

  const pull = plans.map((plan) => ({ plan, weight: planAppeal(plan) / Math.max(1, openingPriceByPlan.get(plan.id) || 0) ** 0.9 }));
  const totalPull = pull.reduce((sum, p) => sum + p.weight, 0) || 1;
  const planRows: PlanForecast[] = pull.map(({ plan, weight }) => {
    const worldRow = worldForecast?.planAllocations.find(row => row.planId === plan.id);
    if (worldRow) return {
      plan,
      share: subscribers > 0 ? worldRow.households / subscribers * 100 : 0,
      subscribers: worldRow.households,
      revenuePerSubscriber: worldRow.households > 0 ? worldRow.monthlySubscriptionRevenue / worldRow.households : 0,
      monthly: worldRow.monthlySubscriptionRevenue,
      monthlyBillingSubscribers: worldRow.monthlyHouseholds,
      annualBillingSubscribers: worldRow.annualHouseholds,
    };
    const share = (weight / totalPull) * 100;
    const rawCohortSubscribers = cohortPlanSubscribers.get(plan.id);
    const cohortTotal = Array.from(cohortPlanSubscribers.values()).reduce((sum, value) => sum + value, 0);
    const subs = cohortSignals.length && cohortTotal > 0
      ? subscribers * (rawCohortSubscribers || 0) / cohortTotal
      : subscribers * (share / 100);
    const resolvedShare = subscribers > 0 ? subs / subscribers * 100 : 0;
    /* What a household on this plan actually pays this month: the annual cohort
       at its discount, the monthly cohort at the introductory one while the
       thirteen weeks run. The wizard previews opening night, so the offer is
       live — week nought. */
    const monthlyRaw = cohortPlanPathSubscribers.get(`MONTHLY:${plan.id}`) || 0;
    const annualRaw = cohortPlanPathSubscribers.get(`ANNUAL:${plan.id}`) || 0;
    const pathTotal = monthlyRaw + annualRaw;
    const annualBillingSubscribers = cohortSignals.length && pathTotal > 0
      ? subs * annualRaw / pathTotal : subs * STREAMING_ANNUAL_BILLING_SHARE;
    const monthlyBillingSubscribers = subs - annualBillingSubscribers;
    const introApplies = streamingIntroOfferAppliesTo(plan.id, settings.introOfferPlanId);
    const monthlyPrice = streamingBillingPathPrice(plan.monthly, settings.annualDiscount, settings.introOffer, 0, 'MONTHLY', introApplies);
    const annualPrice = streamingBillingPathPrice(plan.monthly, settings.annualDiscount, settings.introOffer, 0, 'ANNUAL', introApplies);
    const monthly = monthlyBillingSubscribers * monthlyPrice + annualBillingSubscribers * annualPrice;
    return { plan, share: resolvedShare, subscribers: subs,
      revenuePerSubscriber: subs > 0 ? Math.round(monthly / subs * 100) / 100 : 0,
      monthly, monthlyBillingSubscribers, annualBillingSubscribers };
  });

  const streams: StreamForecast[] = [];

  if (on('subs')) {
    streams.push({
      id: 'subs',
      name: 'Subscriptions',
      monthly: planRows.reduce((sum, r) => sum + r.monthly, 0),
      basis: `${plans.length} plan${plans.length === 1 ? '' : 's'} from ${entryPrice > 0 ? `$${entryPrice}` : 'free'}`,
    });
  }
  const adHouseholds = freeHouseholds
    + planRows.filter((row) => row.plan.ads).reduce((sum, row) => sum + row.subscribers, 0);
  const projectedViewingAccounts = Math.max(0, Math.round(Math.max(households, resolvedAddressable * market.reachRate * .18) * .62));
  const projectedPaidViewingAccounts = Math.max(0, Math.round(subscribers * .62));
  const projectedNonSubscriberOpportunity = Math.max(0, Math.round(resolvedAddressable - subscribers));
  const commercial = calculateWorldStreamingCommercialRevenue({
    pricing: {
      ...settings,
      sponsor: {
        ...settings.sponsor,
        perTitle: settings.sponsor.perTitle * Math.max(0, settings.sponsor.titles),
      },
    },
    paidViewingAccounts: projectedPaidViewingAccounts,
    viewingAccounts: projectedViewingAccounts,
    nonSubscriberOpportunityAccounts: projectedNonSubscriberOpportunity,
    hoursViewed: projectedViewingAccounts * HOURS_PER_MONTH / 4.33,
    adEligibleHours: adHouseholds * HOURS_PER_MONTH / 4.33,
    estimatedViewers: projectedViewingAccounts * 1.45,
    completionRate: .68,
    repeatViewingRate: .1,
    isFreshMovie: true,
    isRentalEligible: true,
    isSponsorEligible: settings.sponsor.titles > 0,
    commerceCapabilityIndex: 55,
    reputationIndex: 55,
  });
  const commercialMonth = 4.33;
  if (on('ads')) streams.push({ id: 'ads', name: 'Advertising', monthly: commercial.advertisingRevenue * commercialMonth, basis: `${settings.ads.minutesPerHour} min an hour at $${settings.ads.cpm} CPM` });
  if (on('rentals')) streams.push({ id: 'rentals', name: 'Rentals & purchases', monthly: (commercial.rentalRevenue + commercial.purchaseRevenue) * commercialMonth, basis: `$${settings.rentals.rent} to rent · $${settings.rentals.buy} to own` });
  if (on('premium')) streams.push({ id: 'premium', name: 'Premium access', monthly: commercial.premiumRevenue * commercialMonth, basis: `$${settings.premium.price} a premiere` });
  if (on('daypass')) streams.push({ id: 'daypass', name: 'Day passes', monthly: commercial.dayPassRevenue * commercialMonth, basis: `$${settings.daypass.price} for 24 hours` });
  if (on('sponsor')) streams.push({ id: 'sponsor', name: 'Sponsored titles', monthly: commercial.sponsorshipRevenue * commercialMonth, basis: `${settings.sponsor.titles} titles at ${Math.round(settings.sponsor.perTitle / 1_000_000)}M` });
  if (on('metered')) streams.push({ id: 'metered', name: 'Pay by the hour', monthly: commercial.meteredRevenue * commercialMonth, basis: `$${settings.metered.perHour} an hour` });
  if (on('patron')) streams.push({ id: 'patron', name: 'Fund the show', monthly: commercial.patronRevenue * commercialMonth, basis: `$${settings.patron.monthly} a month per patron` });

  const monthlyRevenue = streams.reduce((sum, stream) => sum + stream.monthly, 0);
  const subscriptionMonthlyRevenue = streams.find(stream => stream.id === 'subs')?.monthly || 0;
  /* A year is not twelve of this month: the introductory offer runs thirteen
     weeks and then the price snaps back. The world forecast says so when it is
     there, and the same canonical function says so when it is not. */
  const fallbackFirstYearSubscriptions = planRows.reduce((sum, row) => {
    const applies = streamingIntroOfferAppliesTo(row.plan.id, settings.introOfferPlanId);
    const intro = streamingBillingPathPrice(row.plan.monthly, settings.annualDiscount, settings.introOffer, 0, 'MONTHLY', applies);
    const mature = streamingBillingPathPrice(row.plan.monthly, settings.annualDiscount, settings.introOffer, 13, 'MONTHLY', applies);
    const annual = streamingBillingPathPrice(row.plan.monthly, settings.annualDiscount, settings.introOffer, 0, 'ANNUAL', applies);
    return sum + row.monthlyBillingSubscribers * (intro * 3 + mature * 9)
      + row.annualBillingSubscribers * annual * 12;
  }, 0);
  const yearlyRevenue = worldForecast
    ? worldForecast.firstYearSubscriptionRevenue + (monthlyRevenue - subscriptionMonthlyRevenue) * 12
    : fallbackFirstYearSubscriptions + (monthlyRevenue - subscriptionMonthlyRevenue) * 12;
  const resolvedRivalPrice = worldForecast?.rivalMedianEntryPrice || market.rivalAveragePrice;

  return {
    addressable: resolvedAddressable,
    subscribers,
    households,
    plans: planRows,
    streams,
    monthlyRevenue,
    yearlyRevenue,
    conservativeMonthlyRevenue: monthlyRevenue * 0.7,
    breakoutMonthlyRevenue: monthlyRevenue * 1.45,
    perHousehold: households > 0 ? monthlyRevenue / households : 0,
    entryPrice,
    position: positionOf(settings, entryPrice, resolvedRivalPrice),
    activeRivalCount: worldForecast?.activeRivalCount,
    rivalMedianEntryPrice: worldForecast?.rivalMedianEntryPrice,
  };
}

function positionOf(settings: PricingSettings, entry: number, rivals: number): string {
  if (!settings.streams.includes('subs')) {
    return settings.streams.includes('ads')
      ? 'Free to watch, funded by advertising. You will reach far more households than a paid service and earn far less from each one.'
      : 'No subscription at all. Every dollar has to come from what households choose to buy.';
  }
  const ratio = entry / Math.max(1, rivals);
  if (ratio <= 0.6) return `At $${entry} to get in you undercut everyone. Expect volume, and expect to earn it back slowly.`;
  if (ratio <= 0.9) return 'Slightly cheaper than the going rate. You look like the sensible second subscription.';
  if (ratio <= 1.15) return 'Priced with the pack. The price will neither win nor lose you a household — the catalogue will.';
  return 'You are the expensive one. That works only while the slate is worth cancelling something else for.';
}

export function blockersFor(step: LaunchStepId, data: LaunchData): LaunchBlocker[] {
  return data.blockers.filter((b) => b.step === step);
}
