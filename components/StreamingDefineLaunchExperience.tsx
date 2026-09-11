import React, { useMemo } from 'react';
import type {
  OwnedStreamingPricingConfiguration,
  Player,
  StreamingDefineLaunchStepId,
  StreamingIdentPackageId,
  StreamingSoundIdentKey,
} from '../types';
import { getAbsoluteWeek } from '../services/legacyLogic';
import {
  STREAMING_DAY_ONE_MARKETS,
  STREAMING_DAY_ONE_REGION_LABELS,
  STREAMING_DAY_ONE_REGION_ORDER,
  getStreamingCountryMarketProfile,
  getStreamingMarketEntryProfile,
} from '../services/streamingDayOneMarkets';
import {
  beginStreamingMarketClearance,
  getStreamingMarketClearanceView,
  resolveStreamingMarketRequirement,
  resumeStreamingMarketClearance,
  saveStreamingMarketPlan,
} from '../services/streamingMarkets';
import {
  getStreamingLaunchBudgetView,
  getStreamingIdentPurchaseView,
  getStreamingLaunchProgramView,
  removeStreamingCustomIdentAudio,
  saveStreamingLaunchBlueprint,
  saveStreamingPricingPlan,
  saveStreamingServiceIdent,
  saveStreamingStorefrontPlan,
  setStreamingDefineLaunchStep,
} from '../services/streamingLaunchProgram';
import { getStreamingOpeningCatalogueView } from '../services/streamingOpeningCatalogue';
import { rankStreamingLaunchAnchors } from '../services/streamingCatalogueAnchors';
import { getEligibleOwnedStreamingTitles, getStreamingLicenseOpportunities } from '../services/streamingCatalog';
import {
  STREAMING_STOREFRONT_LAYOUTS,
  getStreamingStorefrontLockReason,
} from '../services/streamingStorefront';
import { LaunchWizard } from './studio-finance/components/launch/LaunchWizard';
import type {
  Approach,
  AnchorTitle,
  CatalogueState,
  ClearanceOutcome,
  ClearanceStage,
  Country,
  LaunchBlocker,
  LaunchData,
  LaunchDraft,
  LaunchStepId,
  PricingSettings,
} from './studio-finance/finance/launch';
import StreamingMarketExpansionWizard from './StreamingMarketExpansionWizard';
import { normalizeWorldAudienceEconomyState } from '../services/worldEconomy/worldAudienceCohorts';
import { normalizeWorldAudienceParticipationState } from '../services/worldEconomy/worldAudienceParticipation';
import { normalizeWorldPopulationState } from '../services/worldEconomy/worldPopulation';

interface Props {
  player: Player;
  onUpdatePlayer: (player: Player) => void;
  onClose: () => void;
  onOpenFinance: () => void;
  onOpenCatalogue: () => void;
  onOpenContentDesk?: () => void;
  onOpenBuild: () => void;
  onOpenPricing: () => void;
  onOpenTechnology: () => void;
  mode?: 'OPENING' | 'EXPANSION';
  initialStep?: StreamingDefineLaunchStepId;
  initialDraft?: LaunchDraft | null;
  onDraftChange?: (draft: LaunchDraft) => void;
}

const STEP_FROM_CANONICAL: Record<StreamingDefineLaunchStepId, LaunchStepId> = {
  FUND: 'markets',
  MARKETS: 'markets',
  CLEARANCE: 'clearance',
  IDENTITY: 'ident',
  STOREFRONT: 'storefront',
  CATALOGUE: 'catalogue',
  PRICING: 'pricing',
  BLUEPRINT: 'blueprint',
};

const STEP_TO_CANONICAL: Record<LaunchStepId, StreamingDefineLaunchStepId> = {
  markets: 'MARKETS',
  clearance: 'CLEARANCE',
  ident: 'IDENTITY',
  storefront: 'STOREFRONT',
  catalogue: 'CATALOGUE',
  pricing: 'PRICING',
  blueprint: 'BLUEPRINT',
};

const SOUND_FROM_CANONICAL: Record<StreamingSoundIdentKey, string> = {
  PULSE: 'pulse', ASCENT: 'ascent', PREMIERE: 'premiere', SILENT: 'silent', CHOIR: 'choir', MACHINE: 'machine',
  SPARK: 'spark', IMPACT: 'impact', ORBIT: 'orbit', BLOOM: 'bloom', PRISM: 'prism', EMBER: 'ember',
  SIGNAL: 'signal', HORIZON: 'horizon', ANALOG: 'analog',
};
const PACKAGE_FROM_CANONICAL: Record<StreamingIdentPackageId, string> = {
  STANDARD: 'sting', FULL: 'full', CINEMATIC: 'cinematic', GENRE: 'genre', ADAPTIVE: 'adaptive', LIVING: 'living',
};
const PACKAGE_TO_CANONICAL: Record<string, StreamingIdentPackageId> = {
  sting: 'STANDARD', full: 'FULL', cinematic: 'CINEMATIC', genre: 'GENRE', adaptive: 'ADAPTIVE', living: 'LIVING',
};
const MARK_FROM_LOGO = {
  FRAME_PLAY: 'BOLT', SIGNAL_RING: 'ORBIT', SPOTLIGHT: 'APERTURE', WORDMARK: 'MONOLITH',
} as const;

const storefronts: Approach[] = STREAMING_STOREFRONT_LAYOUTS.map(layout => ({
  id: layout.id,
  name: layout.name,
  line: layout.line,
  effects: [...layout.effects],
  layout: layout.composition,
  family: layout.family,
  category: layout.category,
  experimental: layout.experimental,
}));

const FALLBACK_STOREFRONT_TITLES = [
  ['v1', 'Atlas Rising', 'Series'],
  ['v2', 'Night Ledger', 'Film'],
  ['v3', 'Crown City', 'Film'],
  ['v4', 'Paper Cities', 'Series'],
  ['v5', 'Vault Classics', 'Collection'],
  ['v6', 'Cold Open', 'Film'],
  ['v7', 'Harbour Lights', 'Series'],
  ['v8', 'The Long Quiet', 'Film'],
] as const;

const mapClearanceStage = (stage?: string | null): ClearanceStage => {
  if (stage === 'RIGHTS_VERIFICATION') return 'RIGHTS';
  if (stage === 'REGULATORY_REVIEW') return 'REGULATORY';
  if (stage === 'CONSUMER_DATA_COMPLIANCE') return 'COMPLIANCE';
  if (stage === 'FINAL_APPROVAL') return 'APPROVAL';
  return 'FILED';
};

const mapClearanceOutcome = (outcome?: string | null, additionalPayment = 0): ClearanceOutcome => {
  if (outcome === 'APPROVED') return 'APPROVED';
  if (outcome === 'APPROVED_WITH_CONDITIONS') return 'CONDITIONS';
  if (outcome === 'DELAYED') return 'DELAYED';
  if (outcome === 'ADDITIONAL_REQUIREMENT') return additionalPayment > 0 ? 'PAYMENT_REQUIRED' : 'DOCUMENT_REQUIRED';
  if (outcome === 'TEMPORARILY_REJECTED') return 'REVISABLE';
  return outcome === 'PENDING' ? 'IN_REVIEW' : 'NOT_FILED';
};

/* The market dataset stores people who stream, while pricing is charged per
   household. This gameplay conversion prevents a 225M-viewer country from
   being forecast as 225M separate subscriptions. Faster-growth, mobile-first
   markets skew toward more viewers sharing each paying household. */
const viewersPerStreamingHousehold = (growth: typeof STREAMING_DAY_ONE_MARKETS[number]['growth']) =>
  growth === 'FAST' ? 2.2 : growth === 'STEADY' ? 2.05 : 1.95;

const buildCountry = (market: typeof STREAMING_DAY_ONE_MARKETS[number]): Country => {
  const profile = getStreamingCountryMarketProfile(market.id);
  const entry = getStreamingMarketEntryProfile(market.id);
  const languages = profile?.languageDistribution.length
    ? profile.languageDistribution.map(language => ({ name: language.language, share: language.audiencePercent }))
    : market.languages.map(language => ({ name: language, share: Math.round(100 / market.languages.length) }));
  const tax = profile?.taxBaselinePercent || 0;
  const levy = profile?.streamingLevyBaselinePercent || 0;
  const localContent = profile?.localContentObligationPercent || 0;
  const privacy = profile?.privacyComplianceLevel || 'STANDARD';
  return {
    id: market.id,
    name: market.country,
    code: market.id,
    region: STREAMING_DAY_ONE_REGION_LABELS[market.regionId],
    competition: market.competition,
    difficulty: market.launchDifficulty === 'EASY' ? 'LOW' : market.launchDifficulty === 'MODERATE' ? 'MODERATE' : 'HIGH',
    audience: market.streamingAudience,
    addressableHouseholds: Math.round(market.streamingAudience / viewersPerStreamingHousehold(market.growth)),
    growth: market.annualGrowthPercent,
    opportunity: market.marketNote,
    languages,
    rightsEstimate: profile?.entryCosts.rights ?? market.openingRightsEstimate,
    rivals: market.rivals.map(rival => ({ name: rival.name, share: rival.watchSharePercent })),
    localizationNote: `Audience preference: ${market.localizationNote} Language capability is developed separately through Technology and Content.`,
    complianceCost: profile?.entryCosts.compliance ?? entry.plannedOverheadEstimate,
    dossier: {
      levels: {
        tax: tax + levy >= 30 ? 3 : tax + levy >= 20 ? 2 : 1,
        review: entry.approvalLoad === 'STRICT' ? 3 : entry.approvalLoad === 'STANDARD' ? 2 : 1,
        privacy: privacy === 'STRICT' ? 3 : privacy === 'ENHANCED' ? 2 : 1,
        localContent: localContent >= 25 ? 3 : localContent >= 10 ? 2 : localContent > 0 ? 1 : 0,
      },
      taxLoad: entry.taxLoad === 'HIGH' ? 'Heavy' : entry.taxLoad === 'LOW' ? 'Light' : 'Moderate',
      taxBaseline: `${tax}% baseline tax`,
      streamingLevy: `${levy}% streaming levy`,
      reviewComplexity: `${entry.approvalLoad.toLowerCase()} review`,
      approvalWeeks: `${profile?.approvalPeriodWeeks.minimum ?? 4}–${profile?.approvalPeriodWeeks.maximum ?? 6} weeks`,
      clearances: entry.clearances.map(item => item.replace(/rights/gi, 'market access')),
      consumerRequirements: profile?.complianceRequirements || entry.clearances,
      privacyLevel: `${privacy.toLowerCase()} privacy review`,
      localContentObligation: `${localContent}% local-content obligation`,
      regulatoryExpectation: entry.localRule,
      regulatoryOverhead: profile?.entryCosts.other || 0,
      risks: [entry.consequence, market.competition === 'FIERCE' ? 'Established rivals will defend attention aggressively.' : 'Audience acquisition still requires launch spending.'],
      competitorAttention: market.rivals.map(rival => ({ name: rival.name, share: rival.watchSharePercent })),
      edgeSites: profile?.recommendedNetworkFootprint.edgeSites || 1,
      peakConcurrent: profile?.recommendedNetworkFootprint.peakConcurrentStreams || Math.round(market.streamingAudience * 0.006),
      bandwidthGbps: profile?.recommendedNetworkFootprint.bandwidthGbps || 1,
      infraCity: profile?.recommendedNetworkFootprint.recommendedCityId || market.recommendedCityId,
    },
  };
};

const buildCatalogue = (player: Player): CatalogueState => {
  const view = getStreamingOpeningCatalogueView(player);
  const platform = player.ownedStreamingPlatform;
  const available = view.titles.filter(title => title.available);
  const anchors = rankStreamingLaunchAnchors(player, available, 4);
  const titles = available.length;
  const hours = available.reduce((total, title) => total + title.hours, 0);
  const depthGuide = platform.starterCatalog?.packageId === 'BROAD_APPEAL' ? 80 : platform.starterCatalog?.packageId === 'PRESTIGE_VAULT' ? 30 : 40;
  const genreCounts = new Map<string, number>();
  available.forEach(title => {
    const genre = title.genre.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase());
    genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  });
  const genreCoverage = Array.from(genreCounts.entries()).map(([name, count]) => ({ name, share: titles ? (count / titles) * 100 : 0 }));
  const expectedGenres = ['Drama', 'Comedy', 'Thriller', 'Documentary', 'Family'];
  return {
    titles,
    hours,
    established: Boolean(platform.starterCatalog),
    hasDraft: Boolean(platform.contentMarketDraft || platform.catalogSetupDraft),
    hoursEstimated: available.some(title => title.hoursEstimated),
    readyForLaunch: view.rightsReady,
    hoursNeeded: depthGuide,
    ownedAvailable: getEligibleOwnedStreamingTitles(player).length,
    ownedLinked: view.titles.filter(title => title.source !== 'LICENSED').length,
    externalLicences: available.filter(title => title.source === 'LICENSED').length,
    activeAgreements: platform.catalogLicenses.filter(license => license.status === 'ACTIVE' && license.startsAtAbsoluteWeek <= getAbsoluteWeek(player.age, player.currentWeek) && license.expiresAtAbsoluteWeek > getAbsoluteWeek(player.age, player.currentWeek)).length,
    genreCoverage,
    gaps: expectedGenres.filter(genre => !genreCounts.has(genre)),
    readiness: Math.min(1, hours / depthGuide),
    anchors: anchors.map(title => ({
      id: title.projectId,
      name: title.title,
      format: title.projectType === 'SERIES' ? 'Series' : 'Film',
      linked: true,
      note: title.source === 'ORIGINAL' ? 'Opening original' : title.source === 'OWNED' ? 'Owned library' : 'Licensed title',
    })),
    shelfStrategy: platform.starterCatalog
      ? `${view.strategyLabel}. ${view.rightsReadyCountryCount}/${view.openingCountryCount} opening markets have available titles. ${view.titles.length - titles} titles await production or available rights. Depth is guidance, not a legal launch requirement.`
      : 'Build your opening catalogue in Content Market. Purchased rights and studio imports return here automatically.',
  };
};

const buildCapabilityLocks = (player: Player): Record<string, string> => {
  const platform = player.ownedStreamingPlatform;
  const tech = platform.technologyLevels;
  const active = new Set(platform.productLines.filter(line => line.status === 'ACTIVE').map(line => line.lineId));
  const locks: Record<string, string> = {};
  const lock = (key: string, blocked: boolean, reason: string) => { if (blocked) locks[key] = reason; };
  lock('ident:adaptive', tech.PRODUCT_EXPERIENCE < 35, 'Product Experience level 35');
  lock('ident:genre', tech.PRODUCT_EXPERIENCE < 20, 'Product Experience level 20');
  lock('ident:living', tech.PRODUCT_EXPERIENCE < 60 || tech.DATA_RECOMMENDATIONS < 40, 'Product Experience 60 and Recommendations 40');
  STREAMING_STOREFRONT_LAYOUTS.forEach(layout => {
    const reason = getStreamingStorefrontLockReason(platform, layout.id);
    if (reason) locks[`storefront:${layout.id}`] = reason;
  });
  lock('stream:ads', tech.ADVERTISING_COMMERCE < 20 && !active.has('FREE'), 'Commerce level 20 or EMPIRE+ Free');
  lock('stream:sponsor', tech.ADVERTISING_COMMERCE < 20 && !active.has('FREE'), 'Commerce level 20 or EMPIRE+ Free');
  lock('stream:rentals', !active.has('STORE'), 'EMPIRE+ Store');
  lock('stream:premium', !active.has('STORE'), 'EMPIRE+ Store');
  lock('stream:daypass', !active.has('LIVE'), 'EMPIRE+ Live');
  lock('stream:metered', tech.ADVERTISING_COMMERCE < 60 || tech.PRODUCT_EXPERIENCE < 50, 'Commerce 60 and Product Experience 50');
  lock('stream:patron', !active.has('FAN') || tech.ADVERTISING_COMMERCE < 40, 'EMPIRE+ Fan and Commerce 40');
  lock('feature:hd', tech.PLAYBACK_QUALITY < 20, 'Playback Quality level 20');
  lock('feature:uhd', tech.PLAYBACK_QUALITY < 55, 'Playback Quality level 55');
  lock('feature:spatial', tech.PLAYBACK_QUALITY < 45, 'Playback Quality level 45');
  lock('feature:streams2', tech.RELIABILITY < 10, 'Reliability level 10');
  lock('feature:streams4', tech.RELIABILITY < 35, 'Reliability level 35');
  lock('feature:downloads', tech.PRODUCT_EXPERIENCE < 25, 'Product Experience level 25');
  lock('feature:early', tech.CONTENT_OPERATIONS < 20, 'Content Operations level 20');
  lock('feature:live', !active.has('LIVE'), 'EMPIRE+ Live');
  lock('feature:extraseat', tech.ADVERTISING_COMMERCE < 30, 'Commerce level 30');
  return locks;
};

const buildLaunchData = (player: Player): LaunchData => {
  const platform = player.ownedStreamingPlatform;
  const budget = getStreamingLaunchBudgetView(player);
  const launchView = getStreamingLaunchProgramView(player);
  const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
  const worldPopulation = normalizeWorldPopulationState(player.world.worldPopulation, absoluteWeek);
  const worldAudienceEconomy = normalizeWorldAudienceEconomyState(
    player.world.worldAudienceEconomy,
    worldPopulation,
    absoluteWeek,
  );
  const worldAudienceParticipation = normalizeWorldAudienceParticipationState(
    player.world.worldAudienceParticipation,
    worldPopulation,
    worldAudienceEconomy,
    absoluteWeek,
  );
  const countries = STREAMING_DAY_ONE_MARKETS.map(market => {
    const country = buildCountry(market);
    const audience = worldAudienceEconomy.countries[market.id];
    const participation = worldAudienceParticipation.countries[market.id];
    return {
      ...country,
      pricingCohorts: audience && participation ? audience.cohorts.flatMap(cohort => {
        const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay) return [];
        const households = overlay.streamingOnlyHouseholds + overlay.dualParticipantHouseholds;
        if (!households) return [];
        return [{
          households,
          monthlyStreamingBudgetPerHousehold: overlay.totalMonthlyStreamingBudget / households,
          priceSensitivityIndex: cohort.priceSensitivityIndex,
          entertainmentAppetiteIndex: cohort.entertainmentAppetiteIndex,
          piracyTendencyIndex: cohort.piracyTendencyIndex,
        }];
      }) : [],
    };
  });
  const opening = platform.marketOperations.filter(operation => operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED');
  const clearance = opening.map(operation => {
    const view = getStreamingMarketClearanceView(operation, absoluteWeek);
    return {
      countryId: operation.countryId!,
      outcome: mapClearanceOutcome(view.outcome, view.additionalPayment),
      stage: mapClearanceStage(view.stage),
      weeksRemaining: view.remainingWeeks ?? undefined,
      note: view.condition || (view.stage ? `${view.stageLabel}${view.remainingWeeks === null ? '' : ` · ${view.remainingWeeks} weeks remaining`}` : 'Not filed'),
      requirement: view.actionRequired === 'PAY_REQUIREMENT'
        ? { label: view.condition || 'Additional government filing', cost: view.additionalPayment }
        : view.actionRequired === 'REAPPLY' ? { label: 'File revised application' } : undefined,
    };
  });
  const catalogue = buildCatalogue(player);
  const linkedTitleIds = new Set(catalogue.anchors.map(title => title.id));
  const posterSources = [
    ...(player.pastProjects || []),
    ...player.businesses.flatMap(business => business.studioState?.scripts || []),
  ];
  const posterById = new Map(
    posterSources.flatMap(source => source.customPoster
      ? [[String(source.id), source.customPoster] as const]
      : []),
  );
  const previewTitlePool = [
    ...catalogue.anchors.map(title => ({
      id: title.id,
      title: title.name,
      projectType: title.format.toUpperCase() === 'SERIES' ? 'SERIES' as const : 'MOVIE' as const,
      source: 'OPENING' as const,
    })),
    ...getEligibleOwnedStreamingTitles(player).map(title => ({
      id: title.id,
      title: title.title,
      projectType: title.projectType,
      source: 'OWNED' as const,
    })),
    ...getStreamingLicenseOpportunities(player).map(title => ({
      id: title.id,
      title: title.title,
      projectType: title.projectType,
      source: 'WORLD' as const,
    })),
  ];
  const storefrontTitleMap = new Map(previewTitlePool.map(title => [title.id, title]));
  const storefrontTitles: AnchorTitle[] = Array.from(storefrontTitleMap.values()).slice(0, 10).map(title => ({
    id: title.id,
    name: title.title,
    format: title.projectType === 'SERIES' ? 'Series' : 'Film',
    posterSeed: title.id,
    poster: posterById.get(title.id),
    linked: linkedTitleIds.has(title.id),
    note: title.source === 'OPENING'
      ? 'Opening catalogue'
      : title.source === 'OWNED'
        ? 'Studio library preview'
        : 'Game-world preview title',
  }));
  if (!storefrontTitles.length) {
    storefrontTitles.push(...FALLBACK_STOREFRONT_TITLES.map(([id, name, format]) => ({
      id,
      name,
      format,
      posterSeed: id,
      linked: false,
      note: 'Streaming preview title',
    })));
  }
  const activeCfo = platform.leadership.appointments.some(appointment => appointment.status === 'ACTIVE' && appointment.role === 'CFO');
  const founderContributed = platform.finance.capitalActions.filter(action => action.type === 'FOUNDER_CONTRIBUTION').reduce((sum, action) => sum + action.amount, 0);
  const selectedCountries = countries.filter(country => opening.some(operation => operation.countryId === country.id));
  const forecastAudience = selectedCountries.reduce((sum, country) => sum + country.audience, 0);
  const identPurchases = getStreamingIdentPurchaseView(player);
  const identPaidCost = identPurchases.totalPaid;
  const isFreeIdentConfirmed = platform.serviceConfiguration.source === 'PLAYER_ACTION'
    && platform.serviceConfiguration.identPackageId === 'STANDARD'
    && platform.serviceConfiguration.committedAtAbsoluteWeek !== null;
  const isPaidIdentConfirmed = Boolean(platform.serviceConfiguration.identPackageId)
    && identPurchases.purchasedPackageIds.includes(platform.serviceConfiguration.identPackageId!)
    && platform.serviceConfiguration.committedAtAbsoluteWeek !== null;
  const identCommissioned = Boolean(
    platform.serviceConfiguration.identPackageId
    && platform.serviceConfiguration.soundIdentKey
    && (isFreeIdentConfirmed || isPaidIdentConfirmed),
  );
  const blockers: LaunchBlocker[] = [];
  if (!opening.length) blockers.push({ id: 'markets', step: 'markets', text: 'Choose at least one Opening Market.', severity: 'block' });
  if (!identCommissioned) blockers.push({ id: 'ident', step: 'ident', text: 'No service ident has been commissioned.', severity: 'warn' });
  if (!platform.serviceConfiguration.storefrontLayoutId) blockers.push({ id: 'storefront', step: 'storefront', text: 'The storefront has not been selected.', severity: 'warn' });
  if (!platform.starterCatalog || !catalogue.titles) blockers.push({ id: 'catalogue', step: 'catalogue', text: 'Opening night still needs a real catalogue.', severity: 'block' });
  if (!platform.serviceConfiguration.pricingApproach) blockers.push({ id: 'pricing', step: 'pricing', text: 'No commercial offer has been saved.', severity: 'warn' });
  return {
    company: {
      name: platform.identity?.name || 'EMPIRE+',
      week: absoluteWeek,
      brandHex: platform.identity?.primaryColor,
      markId: platform.identity?.visualMarkId || MARK_FROM_LOGO[platform.identity?.logoKey || 'FRAME_PLAY'],
      logoSrc: platform.identity?.customMarkDataUrl || undefined,
    },
    treasury: {
      available: budget.availableTreasury,
      founderContributed,
      planned: budget.plannedSpend,
      committed: budget.committedSpend,
      paid: budget.paidSpend,
    },
    energy: { ...player.energy },
    capitalRoutes: [
      { id: 'founder', name: 'Founder capital', state: 'open', note: 'Move personal cash into the company immediately.' },
      { id: 'equity', name: 'Private equity', state: activeCfo ? 'open' : 'locked', note: activeCfo ? 'CFO appointed · investor preparation available.' : 'Hire a CFO before approaching private investors.' },
      { id: 'public', name: 'Public markets', state: platform.publicCompany.lifecycle === 'PUBLIC' ? 'open' : 'locked', note: platform.publicCompany.lifecycle === 'PUBLIC' ? 'The company is publicly listed.' : 'Complete the listing milestones before an IPO.' },
    ],
    regions: STREAMING_DAY_ONE_REGION_ORDER.map(region => STREAMING_DAY_ONE_REGION_LABELS[region]),
    countries,
    selectedCountryIds: opening.map(operation => operation.countryId!),
    clearance,
    identSounds: [
      { id: 'pulse', name: 'Pulse', description: 'Two low beats' },
      { id: 'ascent', name: 'Ascent', description: 'A rising figure' },
      { id: 'premiere', name: 'Premiere', description: 'Orchestral swell' },
      { id: 'silent', name: 'Silent', description: 'Motion only' },
      { id: 'choir', name: 'Choir', description: 'One held voice' },
      { id: 'machine', name: 'Machine', description: 'Metal and air' },
      { id: 'spark', name: 'Spark', description: 'Bright glass notes' },
      { id: 'impact', name: 'Impact', description: 'A cinematic low hit' },
      { id: 'orbit', name: 'Orbit', description: 'A circling synth figure' },
      { id: 'bloom', name: 'Bloom', description: 'A warm expanding chord' },
      { id: 'prism', name: 'Prism', description: 'Crystalline fragments' },
      { id: 'ember', name: 'Ember', description: 'Warm bass and glow' },
      { id: 'signal', name: 'Signal', description: 'A digital beacon' },
      { id: 'horizon', name: 'Horizon', description: 'A wide ambient rise' },
      { id: 'analog', name: 'Analog', description: 'Tuned vintage texture' },
    ],
    identPackages: [
      { id: 'sting', name: 'Just the ident', cost: 0, included: true, frames: ['Ident'], description: 'A three-second logo and sound signature.', effect: 'One reusable sequence keeps production simple and economical.', viewerImpact: 'Viewers learn one clear signal before every title and begin recognising the service.' },
      { id: 'full', name: 'The whole kit', cost: 4_500_000, included: false, frames: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'], description: 'One motion system built for six places viewers meet your brand.', effect: 'One coordinated system prevents the platform from feeling pieced together.', viewerImpact: 'Playback, trailers, kids viewing, live events and premieres all feel like the same service.' },
      { id: 'cinematic', name: 'Cinematic ident', cost: 6_500_000, included: false, frames: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'], description: 'A director-grade theatrical treatment built around light, depth and dramatic reveals.', effect: 'A handcrafted premium package gives originals and premieres greater ceremony.', viewerImpact: 'Every major title arrives with the scale and anticipation of a cinema presentation.' },
      { id: 'genre', name: 'Genre worlds', cost: 7_500_000, included: false, frames: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'], description: 'Six authored visual worlds shift the service between drama, action, comedy, family and events.', effect: 'Product Experience research lets the studio maintain distinct genre editions by hand.', viewerImpact: 'Viewers sense the mood of what comes next before playback begins.' },
      { id: 'adaptive', name: 'Adaptive ident', cost: 9_000_000, included: false, frames: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'], description: 'Six branded surfaces whose colour and tempo adapt to the title about to play.', effect: 'Product Experience research turns one identity into controlled contextual variants.', viewerImpact: 'Each title arrives with the right mood while the platform remains instantly recognisable.' },
      { id: 'living', name: 'Living ident', cost: 14_000_000, included: false, frames: ['Ident', 'End', 'Trailer', 'Kids', 'Live', 'Premiere'], description: 'Six living surfaces that respond to title, hour and household.', effect: 'Product and audience-intelligence research drive a continuously changing system.', viewerImpact: 'Returning households see an identity that feels current, personal and responsive to the moment.' },
    ],
    ident: {
      soundId: platform.serviceConfiguration.customIdentAudio
        ? 'custom'
        : platform.serviceConfiguration.soundIdentKey ? SOUND_FROM_CANONICAL[platform.serviceConfiguration.soundIdentKey] : undefined,
      packageId: platform.serviceConfiguration.identPackageId ? PACKAGE_FROM_CANONICAL[platform.serviceConfiguration.identPackageId] : undefined,
      commissioned: identCommissioned,
      committedCost: identPaidCost,
      purchasedPackageIds: identPurchases.purchasedPackageIds.map(packageId => PACKAGE_FROM_CANONICAL[packageId]),
      customAudio: platform.serviceConfiguration.customIdentAudio,
    },
    storefronts,
    pricingApproaches: [],
    pricing: platform.serviceConfiguration.pricing as PricingSettings,
    market: {
      rivalAveragePrice: 12,
      reachRate: catalogue.titles
        ? Math.max(0.012, Math.min(0.075, 0.018 + catalogue.readiness * 0.045))
        : 0,
    },
    offer: {
      storefrontId: platform.serviceConfiguration.storefrontLayoutId?.toLowerCase() || undefined,
      saved: Boolean(platform.serviceConfiguration.storefrontLayoutId),
    },
    storefrontTitles,
    catalogue,
    forecast: {
      audience: forecastAudience,
      peakConcurrent: selectedCountries.reduce((sum, country) => sum + country.dossier.peakConcurrent, 0),
      bandwidthGbps: selectedCountries.reduce((sum, country) => sum + country.dossier.bandwidthGbps, 0),
      edgeSites: selectedCountries.reduce((sum, country) => sum + country.dossier.edgeSites, 0),
    },
    blockers,
    blueprintSaved: Boolean(launchView.tracks[0].milestones.find(milestone => milestone.id === 'LAUNCH_BLUEPRINT')?.complete),
    capabilityLocks: buildCapabilityLocks(player),
  };
};

function OpeningLaunchExperience(props: Props) {
  const data = useMemo(() => buildLaunchData(props.player), [props.player]);
  const platform = props.player.ownedStreamingPlatform;
  const currentStep = props.initialStep || platform.launchProgram.defineCurrentStep;

  const update = (next: Player) => props.onUpdatePlayer(next);
  const findOperation = (countryId: string) => props.player.ownedStreamingPlatform.marketOperations.find(operation => operation.countryId === countryId && operation.entryKind === 'OPENING' && operation.status !== 'EXITED');

  return (
    <LaunchWizard
      data={data}
      initialStep={STEP_FROM_CANONICAL[currentStep] || 'markets'}
      initialDraft={props.initialDraft}
      onDraftChange={props.onDraftChange}
      onExit={props.onClose}
      onOpenStudioFinance={props.onOpenFinance}
      onStepChange={(step) => update(setStreamingDefineLaunchStep(props.player, STEP_TO_CANONICAL[step]))}
      onSaveFootprint={(countryIds) => {
        const result = saveStreamingMarketPlan(props.player, countryIds, 'OPENING');
        if (result.changed) update(result.player);
      }}
      onBeginMarketEntry={(countryIds, plannedCountryIds) => {
        /* The visible wizard draft is the player's intent. Persist it first,
           then file against that exact canonical state in the same action. */
        const planResult = saveStreamingMarketPlan(props.player, plannedCountryIds || countryIds, 'OPENING');
        const filingBase = planResult.changed ? planResult.player : props.player;
        const result = beginStreamingMarketClearance(filingBase, countryIds, 'OPENING');
        if (result.changed || planResult.changed) update(result.player);
        if (result.reason === 'INSUFFICIENT_TREASURY') props.onOpenFinance();
      }}
      onSubmitRequirement={(countryId) => {
        const operation = findOperation(countryId);
        if (!operation) return;
        const result = resolveStreamingMarketRequirement(props.player, operation.id);
        if (result.changed) update(result.player);
        if (result.reason === 'INSUFFICIENT_TREASURY') props.onOpenFinance();
      }}
      onFileRevisedApplication={(countryId) => {
        const operation = findOperation(countryId);
        if (!operation) return;
        const result = resumeStreamingMarketClearance(props.player, operation.id);
        if (result.changed) update(result.player);
      }}
      onCommissionIdent={(soundId, packageId, customAudio) => {
        const usesCustomAudio = soundId === 'custom' && Boolean(customAudio);
        const result = saveStreamingServiceIdent(props.player, {
          soundIdentKey: usesCustomAudio ? 'PULSE' : soundId.toUpperCase() as StreamingSoundIdentKey,
          identPackageId: PACKAGE_TO_CANONICAL[packageId] || 'STANDARD',
          customIdentAudio: usesCustomAudio ? customAudio : null,
        });
        if (result.changed) update(result.player);
        else if (result.reason === 'INSUFFICIENT_TREASURY') props.onOpenFinance();
      }}
      onOpenTechnology={props.onOpenTechnology}
      onRemoveCustomIdentAudio={() => {
        const result = removeStreamingCustomIdentAudio(props.player);
        if (result.changed) update(result.player);
      }}
      onSaveViewerOffer={(storefrontId) => {
        const result = saveStreamingStorefrontPlan(props.player, { storefrontLayoutId: storefrontId });
        if (result.changed) update(result.player);
      }}
      onSavePricing={(pricing: PricingSettings) => {
        const result = saveStreamingPricingPlan(props.player, pricing as OwnedStreamingPricingConfiguration);
        if (result.changed) update(result.player);
      }}
      onAssembleCatalogue={props.onOpenCatalogue}
      onOpenContentDesk={props.onOpenContentDesk || props.onOpenCatalogue}
      onSaveBlueprint={() => {
        const result = saveStreamingLaunchBlueprint(props.player);
        if (result.changed) update(result.player);
      }}
      onOpenBuildPlatform={props.onOpenBuild}
    />
  );
}

export default function StreamingDefineLaunchExperience(props: Props) {
  return props.mode === 'EXPANSION'
    ? <StreamingMarketExpansionWizard {...props} />
    : <OpeningLaunchExperience {...props} />;
}
