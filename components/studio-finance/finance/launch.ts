/* ============================================================================
   DEFINE THE LAUNCH — data contract

   One of the two wizards on the streaming dashboard. It defines what the
   service will be; Build the Platform then has to support it.

   The wizard is a VIEW. It holds the player's in-progress choices as a draft
   and hands them back on save; it never spends money on its own. That matters
   because the whole flow rests on one rule: planning is free, and nothing is
   charged until the player confirms a paid step.
   ========================================================================== */

import type { CustomPoster } from '../../../types';

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
  flagSrc?: string;
  competition: Competition;
  difficulty: Difficulty;
  audience: number;
  /** Reachable streaming households, derived from this country's viewer base.
      Pricing uses this rather than treating every viewer as a separate bill. */
  addressableHouseholds: number;
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
}

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
  /** Everything that could be on the service on night one. */
  titles: number;
  hours: number;
  /** What an opening night actually needs — the bar readiness is measured
      against, so a hundred titles reads as a hundred titles rather than
      overflowing a twelve-slot shelf. */
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
  onCommissionIdent?: (soundId: string, packageId: string, customAudio?: IdentCustomAudio | null) => void;
  /** Research-gated identity previews lead to the canonical Technology Campus. */
  onOpenTechnology?: () => void;
  onRemoveCustomIdentAudio?: () => void;
  onSaveViewerOffer?: (storefrontId: string) => void;
  onSavePricing?: (pricing: PricingSettings) => void;
  onSetTierPrices?: () => void;
  onAssembleCatalogue?: () => void;
  onOpenContentDesk?: () => void;
  onOpenRightsDesk?: () => void;
  onSaveBlueprint?: () => void;
  onOpenBuildPlatform?: () => void;
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
  { id: 'blueprint', label: 'Blueprint', verb: 'Save the blueprint' },
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
): PricingForecast {
  const on = (id: StreamId) => settings.streams.includes(id);
  const plans = on('subs') ? settings.plans : [];

  /* Who subscribes. The cheapest way in, measured against what rivals charge. */
  const entryPrice = plans.length > 0 ? Math.min(...plans.map((p) => p.monthly)) : 0;
  const subReach = plans.length > 0
    ? market.reachRate * Math.min(1.6, Math.max(0.35, (market.rivalAveragePrice / Math.max(1, entryPrice)) ** 0.55))
    : 0;
  const subscribers = Math.min(addressable, addressable * subReach);

  /* A service with advertising also reaches households that never pay. */
  const freeHouseholds = on('ads')
    ? Math.min(
      Math.max(0, addressable - subscribers),
      addressable * market.reachRate * (plans.length > 0 ? 0.6 : FREE_REACH_BONUS),
    )
    : 0;
  const households = subscribers + freeHouseholds;

  const discountDrag = 1
    - (settings.annualDiscount / 100) * 0.3
    - (settings.introOffer / 100) * 0.25;

  const pull = plans.map((plan) => ({ plan, weight: planAppeal(plan) / Math.max(1, plan.monthly) ** 0.9 }));
  const totalPull = pull.reduce((sum, p) => sum + p.weight, 0) || 1;
  const planRows: PlanForecast[] = pull.map(({ plan, weight }) => {
    const share = (weight / totalPull) * 100;
    const subs = subscribers * (share / 100);
    const perSub = plan.monthly * discountDrag;
    return { plan, share, subscribers: subs, revenuePerSubscriber: perSub, monthly: subs * perSub };
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

  if (on('ads')) {
    /* Every household that sees adverts: the free ones, plus anyone on a plan
       that carries them. */
    const adHouseholds = freeHouseholds
      + planRows.filter((r) => r.plan.ads).reduce((sum, r) => sum + r.subscribers, 0);
    const spots = HOURS_PER_MONTH * settings.ads.minutesPerHour * AD_SPOTS_PER_MINUTE;
    streams.push({
      id: 'ads',
      name: 'Advertising',
      monthly: adHouseholds * spots * (settings.ads.cpm / 1000),
      basis: `${settings.ads.minutesPerHour} min an hour at $${settings.ads.cpm} CPM`,
    });
  }

  if (on('rentals')) {
    streams.push({
      id: 'rentals',
      name: 'Rentals & purchases',
      monthly: households * (RENTER_SHARE * settings.rentals.rent * RENT_PER_MONTH + BUYER_SHARE * settings.rentals.buy * 0.15),
      basis: `$${settings.rentals.rent} to rent · $${settings.rentals.buy} to own`,
    });
  }

  if (on('premium')) {
    streams.push({
      id: 'premium',
      name: 'Premium access',
      monthly: households * PREMIUM_SHARE * settings.premium.price * PREMIUM_PER_QUARTER,
      basis: `$${settings.premium.price} a premiere`,
    });
  }

  if (on('daypass')) {
    streams.push({
      id: 'daypass',
      name: 'Day passes',
      monthly: addressable * market.reachRate * DAYPASS_SHARE * settings.daypass.price * DAYPASS_PER_MONTH,
      basis: `$${settings.daypass.price} for 24 hours`,
    });
  }

  if (on('sponsor')) {
    streams.push({
      id: 'sponsor',
      name: 'Sponsored titles',
      monthly: (settings.sponsor.perTitle * settings.sponsor.titles) / 12,
      basis: `${settings.sponsor.titles} titles at ${Math.round(settings.sponsor.perTitle / 1_000_000)}M`,
    });
  }

  if (on('metered')) {
    const meteredHouseholds = addressable * market.reachRate * 0.22;
    streams.push({
      id: 'metered',
      name: 'Pay by the hour',
      monthly: meteredHouseholds * METERED_HOURS * settings.metered.perHour,
      basis: `$${settings.metered.perHour} an hour · about ${METERED_HOURS} hours a household`,
    });
  }

  if (on('patron')) {
    streams.push({
      id: 'patron',
      name: 'Fund the show',
      monthly: households * PATRON_SHARE * settings.patron.monthly,
      basis: `$${settings.patron.monthly} a month from ${Math.round(PATRON_SHARE * 100)}% of households`,
    });
  }

  const monthlyRevenue = streams.reduce((sum, stream) => sum + stream.monthly, 0);

  return {
    addressable,
    subscribers,
    households,
    plans: planRows,
    streams,
    monthlyRevenue,
    yearlyRevenue: monthlyRevenue * 12,
    conservativeMonthlyRevenue: monthlyRevenue * 0.7,
    breakoutMonthlyRevenue: monthlyRevenue * 1.45,
    perHousehold: households > 0 ? monthlyRevenue / households : 0,
    entryPrice,
    position: positionOf(settings, entryPrice, market.rivalAveragePrice),
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
