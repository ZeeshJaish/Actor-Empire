import {
    createInitialOwnedStreamingPlatformState,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    type OwnedStreamingCinematicEvent,
    type OwnedStreamingCinematicType,
    type OwnedStreamingFoundingDraft,
    type OwnedStreamingFoundingProfile,
    type OwnedStreamingLeadershipState,
    type OwnedStreamingExecutiveAppointment,
    type OwnedStreamingExecutiveDevelopment,
    type OwnedStreamingGovernanceState,
    type OwnedStreamingBoardDirector,
    type OwnedStreamingBoardMotion,
    type OwnedStreamingCelebrityInvestor,
    type OwnedStreamingCompetitiveWorldState,
    type OwnedStreamingCorporateDevelopmentState,
    type OwnedStreamingPublicCompanyState,
    type OwnedStreamingCrisisSecurityState,
    type OwnedStreamingLegacyState,
    type OwnedStreamingSuccessionPlan,
    type OwnedStreamingCompanyEra,
    type OwnedStreamingLegacyMontage,
    type OwnedStreamingCrisis,
    type OwnedStreamingShadowOperation,
    type OwnedStreamingTrustInitiative,
    type OwnedStreamingRegulatoryCase,
    type OwnedStreamingWhistleblowerReport,
    type OwnedStreamingAcquisitionCase,
    type OwnedStreamingAcquisitionIntegration,
    type OwnedStreamingAcquisitionValuation,
    type OwnedStreamingDueDiligence,
    type OwnedStreamingAcquisitionCounterbid,
    type OwnedStreamingAcquisitionApproval,
    type OwnedStreamingRegulatoryReview,
    type OwnedStreamingAcquisitionFinancing,
    type OwnedStreamingRivalProfile,
    type OwnedStreamingRivalMove,
    type OwnedStreamingRivalWeeklySnapshot,
    type OwnedStreamingRegionalLaunch,
    type OwnedStreamingMarketShareSnapshot,
    type OwnedStreamingAwardSeason,
    type OwnedStreamingFinanceState,
    type OwnedStreamingCapitalAction,
    type OwnedStreamingCycleReview,
    type OwnedStreamingLoanPosition,
    type OwnedStreamingEquityPosition,
    type OwnedStreamingHqOnboardingState,
    type OwnedStreamingCatalogLicense,
    type OwnedStreamingRightsNegotiation,
    type OwnedStreamingSublicenseDeal,
    type OwnedStreamingRightsObligation,
    type OwnedStreamingCatalogSetupDraft,
    type OwnedStreamingInfrastructureSetup,
    type OwnedStreamingInfrastructureSetupDraft,
    type OwnedStreamingInfrastructurePhysicalSummary,
    type OwnedStreamingFacility,
    type OwnedStreamingNetworkPlacement,
    type OwnedStreamingTechnologyProject,
    type OwnedStreamingResearchProgram,
    type OwnedStreamingCampusProject,
    type OwnedStreamingCampusEvent,
    type OwnedStreamingInfrastructureIncident,
    type OwnedStreamingInfrastructurePerformancePoint,
    type OwnedStreamingInfrastructureAward,
    type OwnedStreamingProductLine,
    type OwnedStreamingLaunchCommit,
    type OwnedStreamingLaunchSlate,
    type OwnedStreamingLoadTestSnapshot,
    type OwnedStreamingLaunchRehearsalSnapshot,
    type OwnedStreamingLedgerEntry,
    type OwnedStreamingLedgerEventType,
    type OwnedStreamingPlatformLifecycle,
    type OwnedStreamingPlatformMetrics,
    type OwnedStreamingPlatformState,
    type OwnedStreamingWeeklyDecision,
    type OwnedStreamingGrowthAction,
    type OwnedStreamingGrowthAttribution,
    type OwnedStreamingWeeklyOperations,
    type OwnedStreamingTitleWeekPerformance,
    type OwnedStreamingOriginalCommission,
    type OwnedStreamingOriginalCommissionDraft,
    type OwnedStreamingStarterCatalog,
    type OwnedStreamingWeeklySnapshot,
    type PlatformId,
    type StreamingInfrastructureStrategy,
    type StreamingCatalogLicenseStatus,
    type StreamingCatalogNegotiationStatus,
    type StreamingBrandPromiseId,
    type StreamingFundingPlan,
    type StreamingLaunchScale,
    type StreamingLaunchCapacityPlan,
    type StreamingLaunchOutcomeTier,
    type StreamingLogoKey,
    type StreamingSoundIdentKey,
    type StreamingTypefaceId,
    type StreamingWordmarkStyleId,
    type StreamingHqSection,
    type StreamingHqTourStatus,
    type StreamingCapacityPackageId,
    type StreamingInfrastructureRolloutPace,
    type StreamingTechnologyCampusBranch,
    type StreamingTechnologyBuildMode,
    type StreamingTechnologyProjectStatus,
    type StreamingTechnologyRisk,
    type StreamingResearchCategory,
    type StreamingResearchLifecycleStage,
    type StreamingResearchIpStrategy,
    type StreamingResearchInstallTargetType,
    type StreamingCampusScale,
    type StreamingCampusConstructionStage,
    type StreamingCampusProjectStatus,
    type StreamingProductLineId,
    type StreamingProductLaunchMode,
    type StreamingProductLineStatus,
    type StreamingProductRisk,
    type StreamingLoadTestStatus,
    type StreamingSubscriptionTierId,
    type StreamingTechnologyBranch,
    type StreamingLicenseExclusivity,
    type StreamingLicenseTerritory,
    type StreamingRightsSellerType,
    type StreamingRightsWindowType,
    type StreamingRightsNegotiationKind,
    type StreamingRightsNegotiationStatus,
    type StreamingRightsChangeOfControl,
    type StreamingRightsObligationType,
    type StreamingRightsObligationStatus,
    type StreamingStarterCatalogPackageId,
    type StreamingOriginalGapId,
    type StreamingOriginalCommissionStatus,
    type StreamingOriginalReleasePattern,
    type StreamingOriginalStrategy,
    type StreamingOriginalLocalizationPackage,
    type StreamingOriginalReleaseScope,
    type StreamingOriginalLifecycleDecisionType,
    type StreamingSlateMarketingPlan,
    type StreamingSlateEntrySource,
    type StreamingExecutiveRole,
    type StreamingExecutiveStrategy,
    type StreamingExecutiveDevelopmentTrack,
    type StreamingBoardMotionId,
    type StreamingRivalStrategy,
    type StreamingRivalMoveType,
    type StreamingRivalResponseId,
    type StreamingWarBattlefront,
    type StreamingRegionId,
    type StreamingRegionalLaunchApproach,
    type StreamingAwardCategoryId,
    type StreamingAcquisitionStatus,
    type StreamingAcquisitionCommitmentId,
    type StreamingIntegrationMode,
    type StreamingRegulatoryStrategy,
    type StreamingAcquisitionFundingSource,
    type StreamingCapitalActionType,
    type StreamingCampaignChannelId,
    type StreamingHomepagePlacement,
    type StreamingRecommendationObjective,
    type StreamingArtworkVariant,
    type StreamingLegacyIdentity,
    type StreamingEraMandate,
    type StreamingFounderOfficeRole,
} from '../types';
import { normalizeStreamingInfrastructureManagementPolicy } from './streamingInfrastructureManagement';
import { normalizeStreamingCanonicalFoundation } from './streamingCanonicalState';
import { createDeterministicId } from './deterministicRandom';
import { STREAMING_INCORPORATION_ECONOMY } from './streamingEconomy';
import { cleanStreamingBrandMarkDataUrl } from './streamingBrandImage';
import { normalizeStreamingDayOneMarketIds } from './streamingDayOneMarkets';
import {
    aggregateStreamingFacilities,
    getStreamingFacilityContract,
    migratePlacementsToStreamingFacilities,
    normalizeStreamingFacilityLease,
    normalizeStreamingFacilityPhysical,
    normalizeStreamingFacilityRole,
    STREAMING_FACILITY_CONTRACTS,
} from './streamingFacilities';
import {
    normalizeStreamingRackGroups,
    projectFacilityNetworkRole,
} from './streamingRackGroups';

export { OWNED_STREAMING_PLATFORM_SCHEMA_VERSION };
export const OWNED_STREAMING_WEEKLY_HISTORY_LIMIT = 104;
export const OWNED_STREAMING_EVENT_LEDGER_LIMIT = 260;
export const OWNED_STREAMING_CINEMATIC_QUEUE_LIMIT = 24;
export const OWNED_STREAMING_PROCESSED_WEEK_LIMIT = 120;
export const OWNED_STREAMING_WEEKLY_DECISION_LIMIT = 104;
export const OWNED_STREAMING_GROWTH_ACTION_LIMIT = 104;
export const OWNED_STREAMING_CYCLE_REVIEW_LIMIT = 40;
export const OWNED_STREAMING_MILESTONE_LIMIT = 80;
export const OWNED_STREAMING_CATALOG_REFERENCE_LIMIT = 1_000;
export const OWNED_STREAMING_EXECUTIVE_APPOINTMENT_LIMIT = 24;
export const OWNED_STREAMING_CAPITAL_ACTION_LIMIT = 80;
export const OWNED_STREAMING_LOAN_LIMIT = 12;
export const OWNED_STREAMING_EQUITY_HOLDER_LIMIT = 20;
export const OWNED_STREAMING_PRODUCT_LINE_LIMIT = 12;
export const OWNED_STREAMING_EXECUTIVE_DEVELOPMENT_LIMIT = 60;
export const OWNED_STREAMING_BOARD_DIRECTOR_LIMIT = 8;
export const OWNED_STREAMING_BOARD_MOTION_LIMIT = 60;
export const OWNED_STREAMING_CELEBRITY_INVESTOR_LIMIT = 6;
export const OWNED_STREAMING_RIVAL_MOVE_LIMIT = 80;
export const OWNED_STREAMING_MARKET_SHARE_HISTORY_LIMIT = 104;
export const OWNED_STREAMING_AWARD_SEASON_LIMIT = 12;
export const OWNED_STREAMING_ACQUISITION_CASE_LIMIT = 20;
export const OWNED_STREAMING_INTEGRATION_LIMIT = 20;
export const OWNED_STREAMING_CRISIS_LIMIT = 24;
export const OWNED_STREAMING_INFRASTRUCTURE_INCIDENT_LIMIT = 32;
export const OWNED_STREAMING_INFRASTRUCTURE_PERFORMANCE_LIMIT = 104;
export const OWNED_STREAMING_INFRASTRUCTURE_AWARD_LIMIT = 24;
export const OWNED_STREAMING_INFRASTRUCTURE_CINEMATIC_FACT_LIMIT = 120;
export const OWNED_STREAMING_SHADOW_OPERATION_LIMIT = 24;
export const OWNED_STREAMING_TRUST_INITIATIVE_LIMIT = 24;
export const OWNED_STREAMING_OVERSIGHT_CASE_LIMIT = 16;
export const OWNED_STREAMING_CLOSED_ERA_LIMIT = 24;
export const OWNED_STREAMING_LEGACY_MONTAGE_LIMIT = 12;

const LIFECYCLES: OwnedStreamingPlatformLifecycle[] = ['LOCKED', 'ELIGIBLE', 'FOUNDING', 'ACTIVE', 'SUSPENDED'];
const INFRASTRUCTURE_STRATEGIES: StreamingInfrastructureStrategy[] = ['UNDECIDED', 'CLOUD_FIRST', 'OWNED_INFRASTRUCTURE', 'HYBRID'];
const LOGO_KEYS: StreamingLogoKey[] = ['FRAME_PLAY', 'SIGNAL_RING', 'SPOTLIGHT', 'WORDMARK'];
const SOUND_IDENT_KEYS: StreamingSoundIdentKey[] = [
    'PULSE', 'ASCENT', 'PREMIERE', 'SILENT', 'CHOIR', 'MACHINE',
    'SPARK', 'IMPACT', 'ORBIT', 'BLOOM', 'PRISM', 'EMBER', 'SIGNAL', 'HORIZON', 'ANALOG',
];
const WORDMARK_STYLE_IDS: StreamingWordmarkStyleId[] = ['WORDMARK', 'SIDE', 'STACK', 'ICON'];
const TYPEFACE_IDS: StreamingTypefaceId[] = ['GROTESK', 'GEOMETRIC', 'SERIF', 'CONDENSED', 'MONO', 'SLAB'];
const BRAND_PROMISE_IDS: StreamingBrandPromiseId[] = [
    'EVENT_HOUSE',
    'BINGE_MACHINE',
    'FANDOM_FOREVER',
    'WORLD_STAGE',
    'EVERYONES_SCREEN',
    'TECHNOLOGY_FIRST',
    'BALANCED',
];
const LAUNCH_SCALES: StreamingLaunchScale[] = ['FOCUSED', 'NATIONAL', 'GLOBAL'];
const FUNDING_PLANS: StreamingFundingPlan[] = ['FOUNDER_FUNDED', 'GROWTH_LOAN', 'MINORITY_ROUND'];
const EXECUTIVE_ROLES: StreamingExecutiveRole[] = [
    'COO',
    'CTO',
    'CFO',
    'CHIEF_CONTENT_OFFICER',
    'PRODUCT_HEAD',
    'MARKETING_HEAD',
    'ADVERTISING_HEAD',
    'INTERNATIONAL_HEAD',
    'SECURITY_TRUST_HEAD',
];
const EXECUTIVE_STRATEGIES: StreamingExecutiveStrategy[] = [
    'GROWTH_FIRST',
    'CREATIVE_FIRST',
    'TECHNOLOGY_FIRST',
    'MARGIN_FIRST',
    'TRUST_FIRST',
    'GLOBAL_FIRST',
    'BALANCED',
];
const EXECUTIVE_DEVELOPMENT_TRACKS: StreamingExecutiveDevelopmentTrack[] = [
    'ROLE_MASTERY',
    'FOUNDER_ALIGNMENT',
    'ETHICS_TRUST',
    'PERFORMANCE_COACHING',
];
const BOARD_MOTION_IDS: StreamingBoardMotionId[] = [
    'RIGHTS_AUTHORITY',
    'CAPACITY_GUARDRAIL',
    'GROWTH_AUTHORITY',
    'TRUST_CHARTER',
];
const RIVAL_STRATEGIES: StreamingRivalStrategy[] = ['SCALE_DOMINANCE', 'PRESTIGE_FIRST', 'FRANCHISE_FORTRESS', 'AGILE_CURATOR', 'ATTENTION_ECOSYSTEM'];
const RIVAL_MOVE_TYPES: StreamingRivalMoveType[] = ['COUNTER_PROGRAM', 'RIGHTS_OVERBID', 'EXECUTIVE_POACH', 'PRICE_CUT', 'BUNDLE_LAUNCH', 'RESCUE_CANCELLED_SHOW', 'ALLIANCE_SIGNAL', 'REGIONAL_ORIGINAL', 'MARKETING_BLITZ', 'TECH_COPY', 'SABOTAGE_ATTEMPT', 'OUTAGE_EXPLOITATION', 'REGION_EXPANSION', 'REGION_WITHDRAWAL'];
const WAR_BATTLEFRONTS: StreamingWarBattlefront[] = ['PRICE', 'CONTENT', 'RIGHTS', 'DISTRIBUTION', 'MARKETING', 'TECHNOLOGY', 'OPERATIONS', 'TALENT', 'TERRITORY'];
const RIVAL_RESPONSE_IDS: StreamingRivalResponseId[] = ['STAY_COURSE', 'DEFEND_POSITION', 'COUNTER_PROGRAM', 'BACKCHANNEL', 'MATCH_PACKAGE', 'EXPAND_MANDATE', 'LET_DEPART'];
const REGION_IDS: StreamingRegionId[] = ['HOME_MARKET', 'NORTH_AMERICA', 'LATIN_AMERICA', 'EUROPE', 'SOUTH_ASIA', 'EAST_ASIA', 'MIDDLE_EAST_AFRICA'];
const REGIONAL_LAUNCH_APPROACHES: StreamingRegionalLaunchApproach[] = ['LOCAL_PARTNERSHIP', 'PREMIUM_ENTRY', 'MASS_MARKET'];
const AWARD_CATEGORY_IDS: StreamingAwardCategoryId[] = ['PLATFORM_OF_THE_YEAR', 'ORIGINAL_OF_THE_YEAR', 'AUDIENCE_CHOICE', 'TECHNICAL_EXCELLENCE', 'GLOBAL_BREAKTHROUGH'];
const ACQUISITION_STATUSES: StreamingAcquisitionStatus[] = [
    'SCOUTED', 'VALUED', 'OFFER_COUNTERED', 'DILIGENCE', 'COUNTERBID', 'APPROVALS',
    'APPROVAL_BLOCKED', 'REGULATORY_REVIEW', 'REGULATORY_BLOCKED', 'FINANCING',
    'READY_TO_SIGN', 'SIGNED', 'WITHDRAWN',
];
const ACQUISITION_COMMITMENTS: StreamingAcquisitionCommitmentId[] = [
    'SERVICE_CONTINUITY', 'EMPLOYEE_PROTECTION', 'CREATOR_GUARANTEE', 'DATA_SEPARATION',
];
const INTEGRATION_MODES: StreamingIntegrationMode[] = [
    'PRESERVE_BRAND', 'SUB_PLATFORM', 'MERGE_CATALOGS', 'BUNDLE',
    'FULL_ABSORPTION', 'TECH_ONLY', 'CATALOG_ONLY', 'SUNSET_MIGRATE',
];
const REGULATORY_STRATEGIES: StreamingRegulatoryStrategy[] = ['CLEAN_COMMITMENTS', 'ASSET_CARVEOUT', 'CONTEST_REVIEW'];
const ACQUISITION_FUNDING_SOURCES: StreamingAcquisitionFundingSource[] = ['TREASURY', 'ACQUISITION_DEBT', 'HYBRID'];
const CAPITAL_ACTION_TYPES: StreamingCapitalActionType[] = [
    'INCORPORATION',
    'FOUNDER_CONTRIBUTION',
    'LOAN_DRAW',
    'LOAN_REPAYMENT',
    'EQUITY_ISSUANCE',
];
const HQ_SECTIONS: StreamingHqSection[] = ['HOME', 'CONTENT', 'TECH', 'MARKET', 'COMPANY'];
const HQ_TOUR_STATUSES: StreamingHqTourStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'];
const CAPACITY_PACKAGE_IDS: StreamingCapacityPackageId[] = ['STARTER', 'ESSENTIAL', 'GROWTH', 'PREMIERE'];
const INFRASTRUCTURE_ROLLOUT_PACES: StreamingInfrastructureRolloutPace[] = ['SAFE', 'STANDARD', 'RUSHED'];
const TECHNOLOGY_CAMPUS_BRANCHES: StreamingTechnologyCampusBranch[] = ['DELIVERY_CAPACITY', 'PLAYBACK_QUALITY', 'RELIABILITY', 'DATA_RECOMMENDATIONS', 'SECURITY', 'CONTENT_OPERATIONS'];
const TECHNOLOGY_BUILD_MODES: StreamingTechnologyBuildMode[] = ['HARDENED', 'BALANCED', 'SPRINT'];
const RESEARCH_CATEGORIES: StreamingResearchCategory[] = [
    'NETWORK_INFRASTRUCTURE',
    'SERVERS_DELIVERY',
    'COOLING_ENERGY',
    'STREAMING_EXPERIENCE',
    'PLATFORM_PRODUCTS',
    'SECURITY_RELIABILITY',
    'EXPERIMENTAL_TECHNOLOGY',
];
const RESEARCH_STAGES: StreamingResearchLifecycleStage[] = [
    'RESEARCHING',
    'PROTOTYPING',
    'TESTING',
    'AWAITING_IP',
    'READY_TO_INSTALL',
    'INSTALLING',
    'OPERATING',
];
const RESEARCH_IP_STRATEGIES: StreamingResearchIpStrategy[] = ['PATENT', 'LICENSE'];
const RESEARCH_INSTALL_TARGET_TYPES: StreamingResearchInstallTargetType[] = [
    'TECHNOLOGY_PROJECT',
    'FACILITY',
    'RACK_GROUP',
    'PRODUCT_LINE',
    'CONSTRUCTION_PROGRAM',
];
const CAMPUS_SCALES: StreamingCampusScale[] = ['OWNED_DATA_CENTRE', 'GIGA_CAMPUS'];
const CAMPUS_STAGES: StreamingCampusConstructionStage[] = ['PERMITS', 'UTILITIES', 'DESIGN', 'SYSTEMS', 'DATA_HALLS', 'RACK_INSTALLATION', 'COMMISSIONING'];
const CAMPUS_PROJECT_STATUSES: StreamingCampusProjectStatus[] = ['AWAITING_DECISION', 'IN_PROGRESS', 'DELAYED', 'READY_TO_OPEN', 'OPEN'];
const CAMPUS_EVENT_TYPES: OwnedStreamingCampusEvent['type'][] = ['PERMIT_DELAY', 'CONTRACTOR_OVERRUN', 'GRID_SHORTAGE', 'WATER_RESTRICTION', 'LOCAL_OPPOSITION', 'FIBRE_DISPUTE', 'COOLING_DEFECT', 'INDUSTRIAL_ESPIONAGE'];
const TECHNOLOGY_PROJECT_STATUSES: StreamingTechnologyProjectStatus[] = ['UNDER_CONSTRUCTION', 'COMPLETED'];
const TECHNOLOGY_RISKS: StreamingTechnologyRisk[] = ['LOW', 'MODERATE', 'HIGH'];
const PRODUCT_LINE_IDS: Exclude<StreamingProductLineId, 'CORE'>[] = ['KIDS', 'FREE', 'LIVE', 'FAN', 'STORE', 'INTERACTIVE'];
const PRODUCT_LAUNCH_MODES: StreamingProductLaunchMode[] = ['VALIDATED', 'BALANCED', 'FIRST_TO_MARKET'];
const PRODUCT_LINE_STATUSES: StreamingProductLineStatus[] = ['UNDER_DEVELOPMENT', 'ACTIVE', 'PAUSED'];
const PRODUCT_RISKS: StreamingProductRisk[] = ['LOW', 'MODERATE', 'HIGH'];
const LOAD_TEST_STATUSES: StreamingLoadTestStatus[] = ['PASS', 'CONDITIONAL', 'FAIL'];
const SUBSCRIPTION_TIER_IDS: StreamingSubscriptionTierId[] = ['BASIC', 'PREMIUM', 'FAMILY'];
const STARTER_CATALOG_PACKAGE_IDS: StreamingStarterCatalogPackageId[] = ['CURATED_PREMIERE', 'BROAD_APPEAL', 'PRESTIGE_VAULT'];
const LICENSE_TERRITORIES: StreamingLicenseTerritory[] = ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'];
const LICENSE_EXCLUSIVITY: StreamingLicenseExclusivity[] = ['NON_EXCLUSIVE', 'EXCLUSIVE'];
const CATALOG_NEGOTIATION_STATUSES: StreamingCatalogNegotiationStatus[] = ['BUILDING', 'COUNTERED', 'READY_TO_SIGN'];
const CATALOG_LICENSE_STATUSES: StreamingCatalogLicenseStatus[] = ['ACTIVE', 'EXPIRED', 'TERMINATED'];
const RIGHTS_SELLER_TYPES: StreamingRightsSellerType[] = ['STUDIO', 'PLATFORM'];
const RIGHTS_WINDOW_TYPES: StreamingRightsWindowType[] = ['FIRST_WINDOW', 'SECOND_WINDOW', 'PERMANENT'];
const RIGHTS_NEGOTIATION_KINDS: StreamingRightsNegotiationKind[] = ['ACQUIRE', 'RENEW', 'SUBLICENSE_OUT'];
const RIGHTS_NEGOTIATION_STATUSES: StreamingRightsNegotiationStatus[] = ['OPEN', 'COUNTERED', 'READY_TO_SIGN', 'SIGNED', 'LOST', 'WITHDRAWN', 'EXPIRED'];
const RIGHTS_CHANGE_OF_CONTROL: StreamingRightsChangeOfControl[] = ['NONE', 'NOTICE', 'CONSENT_REQUIRED'];
const RIGHTS_OBLIGATION_TYPES: StreamingRightsObligationType[] = ['MARKETING_SPEND', 'VIEWERSHIP_THRESHOLD'];
const RIGHTS_OBLIGATION_STATUSES: StreamingRightsObligationStatus[] = ['PENDING', 'ON_TRACK', 'SATISFIED', 'BREACHED'];
const PROJECT_TYPES = ['MOVIE', 'SERIES'] as const;
const GENRES = ['ACTION', 'DRAMA', 'COMEDY', 'ROMANCE', 'THRILLER', 'MYSTERY', 'HORROR', 'SCI_FI', 'ADVENTURE', 'SUPERHERO', 'MUSICAL', 'BIOPIC', 'SPORTS', 'ANIMATION', 'FANTASY', 'CRIME', 'DOCUMENTARY'] as const;
const TARGET_AUDIENCES = ['G', 'PG', 'PG-13', 'R', 'NC-17'] as const;
const ORIGINAL_GAP_IDS: StreamingOriginalGapId[] = ['SERIES_RETENTION', 'GENRE_WHITE_SPACE', 'PRESTIGE_ANCHOR', 'BROAD_AUDIENCE'];
const ORIGINAL_COMMISSION_STATUSES: StreamingOriginalCommissionStatus[] = ['READY_FOR_GREENLIGHT', 'GREENLIT', 'IN_PRODUCTION', 'DELIVERED', 'RELEASED'];
const ORIGINAL_RELEASE_PATTERNS: StreamingOriginalReleasePattern[] = ['SINGLE_PREMIERE', 'FULL_SEASON', 'WEEKLY', 'SPLIT_VOLUME'];
const ORIGINAL_STRATEGIES: StreamingOriginalStrategy[] = ['EVENT_BLOCKBUSTER', 'WEEKLY_RETENTION', 'PRESTIGE_LIMITED', 'REGIONAL_BREAKOUT', 'KIDS_EVERGREEN', 'REALITY_ENGAGEMENT', 'DOCUMENTARY_HALO', 'EXPERIMENTAL_CULT'];
const ORIGINAL_LOCALIZATION_PACKAGES: StreamingOriginalLocalizationPackage[] = ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'];
const ORIGINAL_RELEASE_SCOPES: StreamingOriginalReleaseScope[] = ['DOMESTIC', 'MULTI_REGION', 'GLOBAL'];
const ORIGINAL_LIFECYCLE_DECISIONS: StreamingOriginalLifecycleDecisionType[] = ['RENEW', 'CANCEL', 'LICENSE_WINDOW', 'FRANCHISE'];
const SLATE_MARKETING_PLANS: StreamingSlateMarketingPlan[] = ['LEAN', 'STANDARD', 'EVENT'];
const SLATE_ENTRY_SOURCES: StreamingSlateEntrySource[] = ['ORIGINAL', 'OWNED_LIBRARY', 'LICENSED_WINDOW'];
const LAUNCH_CAPACITY_PLANS: StreamingLaunchCapacityPlan[] = ['STANDARD', 'CLOUD_BURST', 'STAGGERED_PREMIERE'];
const LAUNCH_OUTCOME_TIERS: StreamingLaunchOutcomeTier[] = ['SMOOTH_OPENING', 'PRESSURED_OPENING', 'DEGRADED_OPENING'];
const WEEKLY_PLAN_IDS = ['AUDIENCE_PUSH', 'RELIABILITY_GUARD', 'RETENTION_SPOTLIGHT'] as const;
const CAMPAIGN_CHANNEL_IDS: StreamingCampaignChannelId[] = ['TRAILER', 'BILLBOARD', 'SOCIAL', 'REGIONAL'];
const HOMEPAGE_PLACEMENTS: StreamingHomepagePlacement[] = ['NONE', 'HERO', 'TOP_TEN', 'GENRE_SPOTLIGHT'];
const RECOMMENDATION_OBJECTIVES: StreamingRecommendationObjective[] = ['BALANCED', 'RETENTION', 'CATALOG_DISCOVERY', 'BREAKOUT'];
const ARTWORK_VARIANTS: StreamingArtworkVariant[] = ['FACE_FORWARD', 'WORLD_BUILDING', 'MYSTERY_HOOK'];
const LEGACY_IDENTITIES: StreamingLegacyIdentity[] = [
    'AUDIENCE_ARCHITECT',
    'ORIGINALS_TITAN',
    'TECHNOLOGY_PIONEER',
    'GLOBAL_BRIDGE',
    'TRUSTED_STEWARD',
    'CORPORATE_STRATEGIST',
    'COMEBACK_BUILDER',
    'BALANCED_EMPIRE',
];
const ERA_MANDATES: StreamingEraMandate[] = [
    'BALANCED',
    'AUDIENCE_GROWTH',
    'ORIGINALS_PRESTIGE',
    'TECHNOLOGY_LEADERSHIP',
    'GLOBAL_EXPANSION',
    'TRUST_AND_RESILIENCE',
    'CASH_DISCIPLINE',
];
const FOUNDER_OFFICE_ROLES: StreamingFounderOfficeRole[] = ['FOUNDER_CEO', 'EXECUTIVE_CHAIR', 'FOUNDER_EMERITUS'];
const CYCLE_REVIEW_KINDS = ['FOUR_WEEK_BEAT', 'TWELVE_WEEK_REVIEW'] as const;
const STRATEGIC_IDENTITIES = [
    'AUDIENCE_HUNTER',
    'RETENTION_HOUSE',
    'RELIABLE_OPERATOR',
    'EVENT_DESTINATION',
    'CASH_COMPOUNDER',
    'BALANCED_SERVICE',
    'FRAGILE_MOMENTUM',
] as const;
const CYCLE_PERFORMANCE_TIERS = ['BREAKOUT', 'GROWING', 'STEADY', 'UNDER_PRESSURE'] as const;
const TECHNICAL_VERDICTS = ['RESILIENT', 'HEALTHY', 'WATCH_LOAD', 'AT_RISK'] as const;
const RIVAL_PRESSURES = ['LOW', 'MEDIUM', 'HIGH'] as const;
const PLATFORM_IDS: PlatformId[] = ['NETFLIX', 'APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE'];
const TECHNOLOGY_BRANCHES: StreamingTechnologyBranch[] = [
    'DELIVERY_CAPACITY',
    'PLAYBACK_QUALITY',
    'RELIABILITY',
    'DATA_RECOMMENDATIONS',
    'SECURITY',
    'CONTENT_OPERATIONS',
    'ADVERTISING_COMMERCE',
    'PRODUCT_EXPERIENCE',
];
const LEDGER_EVENT_TYPES: OwnedStreamingLedgerEventType[] = [
    'FOUNDATION_CREATED',
    'FOUNDER_CAPITAL_CONTRIBUTED',
    'LOAN_DRAWN',
    'LOAN_REPAID',
    'EQUITY_ISSUED',
    'EXECUTIVE_APPOINTED',
    'EXECUTIVE_DEPARTED',
    'EXECUTIVE_DEVELOPMENT_STARTED',
    'EXECUTIVE_DEVELOPMENT_COMPLETED',
    'DELEGATION_MANDATE_UPDATED',
    'BOARD_DIRECTOR_APPOINTED',
    'BOARD_VOTE_RESOLVED',
    'CELEBRITY_INVESTMENT_ACCEPTED',
    'RIVAL_MOVE_COMMITTED',
    'RIVAL_MOVE_RESPONDED',
    'REGIONAL_LAUNCH_STARTED',
    'REGIONAL_LAUNCH_COMPLETED',
    'MARKET_CLEARANCE_STARTED',
    'MARKET_CLEARANCE_UPDATED',
    'MARKET_CLEARANCE_COMPLETED',
    'MARKET_REQUIREMENT_RESOLVED',
    'MARKET_POLICY_CHANGED',
    'MARKET_SHARE_COMMITTED',
    'STREAMING_AWARDS_RESOLVED',
    'ACQUISITION_SCOUTED',
    'ACQUISITION_VALUED',
    'ACQUISITION_OFFER_SUBMITTED',
    'ACQUISITION_DILIGENCE_COMPLETED',
    'ACQUISITION_COUNTERBID_RESOLVED',
    'ACQUISITION_APPROVAL_RESOLVED',
    'ACQUISITION_REGULATORY_RESOLVED',
    'ACQUISITION_FINANCING_LOCKED',
    'STREAMING_PLATFORM_ACQUIRED',
    'ACQUISITION_INTEGRATION_COMPLETED',
    'IPO_ROADSHOW_STARTED',
    'IPO_LISTED',
    'PUBLIC_GUIDANCE_ISSUED',
    'PUBLIC_EARNINGS_REPORTED',
    'SHAREHOLDER_VOTE_RESOLVED',
    'ACTIVIST_CAMPAIGN_RESOLVED',
    'HOSTILE_TAKEOVER_OPENED',
    'HOSTILE_TAKEOVER_DEFENDED',
    'CRISIS_DETECTED',
    'CRISIS_RESPONSE_LOCKED',
    'CRISIS_RECOVERED',
    'TRUST_INITIATIVE_COMPLETED',
    'SHADOW_OPERATION_COMMITTED',
    'SHADOW_EVIDENCE_RESOLVED',
    'REGULATORY_CASE_OPENED',
    'REGULATORY_CASE_RESOLVED',
    'WHISTLEBLOWER_REPORT_OPENED',
    'WHISTLEBLOWER_REPORT_RESOLVED',
    'INFRASTRUCTURE_INCIDENT_DETECTED',
    'INFRASTRUCTURE_RESPONSE_LOCKED',
    'INFRASTRUCTURE_INCIDENT_RECOVERED',
    'INFRASTRUCTURE_MAINTENANCE_COMPLETED',
    'INFRASTRUCTURE_OPERATIONS_POLICY_UPDATED',
    'SUCCESSION_PLAN_UPDATED',
    'SUCCESSOR_APPOINTED',
    'FOUNDER_ROLE_CHANGED',
    'COMPANY_ERA_CLOSED',
    'COMPANY_ERA_OPENED',
    'LEGACY_FILM_COMMITTED',
    'GENERATION_HANDOFF',
    'INFRASTRUCTURE_COMMITTED',
    'TECHNOLOGY_PROJECT_STARTED',
    'TECHNOLOGY_PROJECT_COMPLETED',
    'CAMPUS_PROJECT_STARTED',
    'CAMPUS_STAGE_COMPLETED',
    'CAMPUS_OPENED',
    'PRODUCT_DEVELOPMENT_STARTED',
    'PRODUCT_LAUNCHED',
    'PRODUCT_STATUS_CHANGED',
    'CATALOG_IMPORTED',
    'LICENSE_NEGOTIATION_UPDATED',
    'LICENSE_SIGNED',
    'ORIGINAL_COMMISSIONED',
    'ORIGINAL_GREENLIT',
    'LAUNCH_SLATE_PROGRAMMED',
    'LAUNCH_COMMITTED',
    'LIFECYCLE_CHANGED',
    'WEEKLY_PLAN_SELECTED',
    'GROWTH_ACTION_LOCKED',
    'GROWTH_ACTION_APPLIED',
    'WEEK_CHECKPOINT',
    'METRICS_COMMITTED',
    'QUARTER_BEAT_COMMITTED',
    'SEASON_REVIEW_COMMITTED',
    'CINEMATIC_QUEUED',
    'MILESTONE_REACHED',
    'SYSTEM_REPAIR',
];
const CINEMATIC_TYPES: OwnedStreamingCinematicType[] = [
    'FOUNDING_KEYNOTE',
    'LAUNCH_NIGHT',
    'BREAKOUT_HIT',
    'PLATFORM_OUTAGE',
    'BOARD_REVIEW',
    'CELEBRITY_INVESTOR_REVEAL',
    'PLATFORM_WAR_DECLARATION',
    'MARKET_SHARE_BREAKTHROUGH',
    'GLOBAL_DOMINANCE',
    'STREAMING_AWARDS_CEREMONY',
    'ACQUISITION_SIGNING',
    'IPO_LISTING',
    'HOSTILE_TAKEOVER_DEFENCE',
    'CRISIS_EXPOSURE',
    'WHISTLEBLOWER_REVEAL',
    'REGULATORY_HEARING',
    'SHADOW_OPERATION',
    'LEGACY_MONTAGE',
    'SUCCESSION_CEREMONY',
    'NEW_ERA_KEYNOTE',
    'FIRST_ORIGINAL_ANNOUNCEMENT',
    'FACILITY_OPENING',
    'SERVER_HALL_EVOLUTION',
    'GIGA_CAMPUS_CONSTRUCTION',
    'OPENING_NIGHT_CONTROL_ROOM',
    'INFRASTRUCTURE_RECOVERY',
    'PATENT_ANNOUNCEMENT',
    'RIVAL_ESPIONAGE_STORY',
    'INFRASTRUCTURE_AWARDS',
    'GLOBAL_RELIABILITY_MILESTONE',
    'MILESTONE',
];

const asRecord = (value: unknown): Record<string, any> => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {}
);
const asArray = <T,>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];
const clamp = (value: unknown, min: number, max: number, fallback = min): number => {
    const numeric = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
};
const cleanText = (value: unknown, fallback = '', maxLength = 160): string => (
    typeof value === 'string'
        ? value.replace(/\s+/g, ' ').trim().slice(0, maxLength)
        : fallback
);
const cleanCustomMarkDataUrl = cleanStreamingBrandMarkDataUrl;
const uniqueStrings = (value: unknown, limit: number): string[] => Array.from(new Set(
    asArray<unknown>(value)
        .map(item => cleanText(item, '', 180))
        .filter(Boolean),
)).slice(-limit);
const isOneOf = <T extends string>(value: unknown, choices: readonly T[], fallback: T): T => (
    choices.includes(value as T) ? value as T : fallback
);

const normalizeFoundingDraft = (
    value: unknown,
    sourceVersion: number,
): OwnedStreamingFoundingDraft | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const rawStep = Math.round(clamp(source.currentStep, 0, 7));
    const currentStep = sourceVersion >= 7
        ? Math.round(clamp(rawStep, 0, 2))
        : rawStep <= 0
            ? 0
            : rawStep === 1
                ? 1
                : 2;
    const brandPromiseId = isOneOf(source.brandPromiseId, BRAND_PROMISE_IDS, 'BALANCED');
    const legacyMarketIds = normalizeStreamingDayOneMarketIds(source.dayOneMarketIds);
    const legacyServerCityId = cleanText(source.launchServerCityId, '', 24) || null;
    const draft: OwnedStreamingFoundingDraft = {
        currentStep,
        name: cleanText(source.name, 'EMPIRE+', 32),
        logoKey: isOneOf(source.logoKey, LOGO_KEYS, 'FRAME_PLAY'),
        primaryColor: cleanText(source.primaryColor, '#6D5DFB', 20),
        secondaryColor: cleanText(source.secondaryColor, '#111225', 20),
        visualMarkId: cleanText(source.visualMarkId, 'BOLT', 40).toUpperCase(),
        customMarkDataUrl: cleanCustomMarkDataUrl(source.customMarkDataUrl),
        wordmarkStyleId: isOneOf(source.wordmarkStyleId, WORDMARK_STYLE_IDS, 'SIDE'),
        typefaceId: isOneOf(source.typefaceId, TYPEFACE_IDS, 'GROTESK'),
        brandPromiseId,
        publicManifesto: cleanText(source.publicManifesto, '', 160),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
    if (SOUND_IDENT_KEYS.includes(source.soundIdentKey as StreamingSoundIdentKey)) {
        draft.soundIdentKey = source.soundIdentKey as StreamingSoundIdentKey;
    }
    if (legacyMarketIds.length) draft.dayOneMarketIds = legacyMarketIds;
    if (legacyServerCityId) draft.launchServerCityId = legacyServerCityId;
    return draft;
};

const normalizeFoundingProfile = (
    value: unknown,
    fallbackOwnershipPercent: number,
): OwnedStreamingFoundingProfile | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const incorporationModel = isOneOf(
        source.incorporationModel,
        ['FIXED_V8_ZERO_TREASURY', 'FIXED_V7', 'LEGACY_PRE_V7'] as const,
        source.founderCashCharged !== undefined ? 'FIXED_V7' : 'LEGACY_PRE_V7',
    );
    if (incorporationModel === 'FIXED_V8_ZERO_TREASURY') {
        return {
            incorporationModel,
            founderCashCharged: STREAMING_INCORPORATION_ECONOMY.cashRequired,
            setupCostsConsumed: STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed,
            openingTreasuryCash: STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash,
            outsideCapitalRaisedAtIncorporation: 0,
            debtPrincipalAtIncorporation: 0,
            founderOwnershipPercentAtIncorporation: 100,
            founderWasCeoAtIncorporation: true,
            incorporatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.incorporatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        };
    }
    if (incorporationModel === 'FIXED_V7') {
        // Preserve the historical 85 / 70 / 15 settlement for existing saves.
        // Only newly incorporated companies adopt the V8 zero-treasury model.
        return {
            incorporationModel,
            founderCashCharged: Math.round(clamp(source.founderCashCharged ?? 85_000_000, 0, Number.MAX_SAFE_INTEGER)),
            setupCostsConsumed: Math.round(clamp(source.setupCostsConsumed ?? 70_000_000, 0, Number.MAX_SAFE_INTEGER)),
            openingTreasuryCash: Math.round(clamp(source.openingTreasuryCash ?? 15_000_000, 0, Number.MAX_SAFE_INTEGER)),
            outsideCapitalRaisedAtIncorporation: Math.round(clamp(source.outsideCapitalRaisedAtIncorporation, 0, Number.MAX_SAFE_INTEGER)),
            debtPrincipalAtIncorporation: Math.round(clamp(source.debtPrincipalAtIncorporation, 0, Number.MAX_SAFE_INTEGER)),
            founderOwnershipPercentAtIncorporation: clamp(source.founderOwnershipPercentAtIncorporation, 0, 100) || 100,
            founderWasCeoAtIncorporation: true,
            incorporatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.incorporatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        };
    }

    const isNormalizedLegacyProfile = source.incorporationModel === 'LEGACY_PRE_V7';
    const legacySource = isNormalizedLegacyProfile ? asRecord(source.legacyTerms) : source;
    const legacyLaunchScale = isOneOf(legacySource.launchScale, LAUNCH_SCALES, 'FOCUSED');
    const legacyFundingPlan = isOneOf(legacySource.fundingPlan, FUNDING_PLANS, 'FOUNDER_FUNDED');
    const legacyLaunchBudget = Math.round(clamp(
        isNormalizedLegacyProfile ? source.openingTreasuryCash : legacySource.launchBudget,
        0,
        Number.MAX_SAFE_INTEGER,
    ));
    const legacyExecutiveIds = uniqueStrings(legacySource.foundingExecutiveIds, 4);
    return {
        incorporationModel: 'LEGACY_PRE_V7',
        founderCashCharged: Math.round(clamp(
            isNormalizedLegacyProfile ? source.founderCashCharged : source.founderCapitalCommitted,
            0,
            Number.MAX_SAFE_INTEGER,
        )),
        setupCostsConsumed: 0,
        openingTreasuryCash: legacyLaunchBudget,
        outsideCapitalRaisedAtIncorporation: Math.round(clamp(
            isNormalizedLegacyProfile
                ? source.outsideCapitalRaisedAtIncorporation
                : source.outsideCapitalRaised,
            0,
            Number.MAX_SAFE_INTEGER,
        )),
        debtPrincipalAtIncorporation: Math.round(clamp(
            isNormalizedLegacyProfile
                ? source.debtPrincipalAtIncorporation
                : source.debtPrincipal,
            0,
            Number.MAX_SAFE_INTEGER,
        )),
        founderOwnershipPercentAtIncorporation: clamp(
            isNormalizedLegacyProfile
                ? source.founderOwnershipPercentAtIncorporation
                : fallbackOwnershipPercent,
            0,
            100,
            100,
        ),
        founderWasCeoAtIncorporation: true,
        incorporatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.incorporatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        legacyTerms: {
            launchScale: legacyLaunchScale,
            fundingPlan: legacyFundingPlan,
            launchBudget: legacyLaunchBudget,
            foundingExecutiveIds: legacyExecutiveIds,
        },
    };
};

const LEGACY_EXECUTIVE_DIRECTORY: Record<string, {
    name: string;
    role: StreamingExecutiveRole;
}> = {
    'ava-chen': { name: 'Ava Chen', role: 'COO' },
    'marcus-vale': { name: 'Marcus Vale', role: 'CTO' },
    'nia-okafor': { name: 'Nia Okafor', role: 'CHIEF_CONTENT_OFFICER' },
    'rafael-silva': { name: 'Rafael Silva', role: 'CFO' },
};

const normalizeExecutiveAppointment = (
    value: unknown,
): OwnedStreamingExecutiveAppointment | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const executiveId = cleanText(source.executiveId, '', 120);
    const role = isOneOf(source.role, EXECUTIVE_ROLES, 'COO');
    if (!executiveId) return null;
    const appointedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.appointedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const endedAt = source.endedAtAbsoluteWeek;
    return {
        id: cleanText(
            source.id,
            createDeterministicId('streaming_executive', executiveId, role, appointedAtAbsoluteWeek),
            120,
        ),
        executiveId,
        role,
        nameAtAppointment: cleanText(
            source.nameAtAppointment,
            LEGACY_EXECUTIVE_DIRECTORY[executiveId]?.name || 'Streaming executive',
            120,
        ),
        status: isOneOf(source.status, ['ACTIVE', 'RESIGNED', 'DISMISSED'] as const, 'ACTIVE'),
        origin: isOneOf(source.origin, ['PLAYER_HIRED', 'INTERNAL_PROMOTION', 'LEGACY_FOUNDING'] as const, 'PLAYER_HIRED'),
        appointedAtAbsoluteWeek,
        endedAtAbsoluteWeek: endedAt === null || endedAt === undefined
            ? null
            : Math.max(appointedAtAbsoluteWeek, Math.round(clamp(endedAt, 0, Number.MAX_SAFE_INTEGER))),
        weeklyCompensation: Math.round(clamp(source.weeklyCompensation, 0, Number.MAX_SAFE_INTEGER)),
        skill: Math.round(clamp(source.skill, 0, 100, 64)),
        loyalty: Math.round(clamp(source.loyalty, 0, 100, source.origin === 'INTERNAL_PROMOTION' ? 76 : 62)),
        ambition: Math.round(clamp(source.ambition, 0, 100, 58)),
        ethics: Math.round(clamp(source.ethics, 0, 100, 70)),
        preferredStrategy: isOneOf(source.preferredStrategy, EXECUTIVE_STRATEGIES, 'BALANCED'),
        founderRelationship: Math.round(clamp(source.founderRelationship, 0, 100, 60)),
        internalRelationship: Math.round(clamp(source.internalRelationship, 0, 100, 62)),
        performance: Math.round(clamp(source.performance, 0, 100, 60)),
        level: Math.round(clamp(source.level, 1, 5, source.origin === 'INTERNAL_PROMOTION' ? 1 : 2)) as 1 | 2 | 3 | 4 | 5,
        experience: Math.round(clamp(source.experience, 0, Number.MAX_SAFE_INTEGER, 0)),
    };
};

const normalizeExecutiveDevelopment = (value: unknown): OwnedStreamingExecutiveDevelopment | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    const executiveId = cleanText(source.executiveId, '', 120);
    if (!idempotencyKey || !executiveId) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const readyAtAbsoluteWeek = Math.max(
        startedAtAbsoluteWeek + 1,
        Math.round(clamp(source.readyAtAbsoluteWeek, startedAtAbsoluteWeek + 1, Number.MAX_SAFE_INTEGER)),
    );
    const status = isOneOf(source.status, ['IN_PROGRESS', 'COMPLETED'] as const, 'IN_PROGRESS');
    return {
        id: cleanText(source.id, createDeterministicId('streaming_exec_development', idempotencyKey), 120),
        idempotencyKey,
        executiveId,
        track: isOneOf(source.track, EXECUTIVE_DEVELOPMENT_TRACKS, 'ROLE_MASTERY'),
        status,
        capitalCost: Math.round(clamp(source.capitalCost, 0, Number.MAX_SAFE_INTEGER)),
        developmentWeeks: Math.max(1, Math.round(clamp(source.developmentWeeks, 1, 24, 2))),
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek,
        completedAtAbsoluteWeek: status === 'COMPLETED'
            ? Math.max(readyAtAbsoluteWeek, Math.round(clamp(source.completedAtAbsoluteWeek, readyAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, readyAtAbsoluteWeek)))
            : null,
    };
};

const normalizeLeadership = (
    value: unknown,
    foundingProfile: OwnedStreamingFoundingProfile | null,
): OwnedStreamingLeadershipState => {
    const source = asRecord(value);
    const ceoSource = asRecord(source.currentCeo);
    const explicitAppointments = dedupeByKey(
        asArray<unknown>(source.appointments)
            .map(normalizeExecutiveAppointment)
            .filter((appointment): appointment is OwnedStreamingExecutiveAppointment => Boolean(appointment)),
        appointment => appointment.id,
    );
    const legacyAppointments = foundingProfile?.incorporationModel === 'LEGACY_PRE_V7'
        ? (foundingProfile.legacyTerms?.foundingExecutiveIds || []).map<OwnedStreamingExecutiveAppointment | null>(executiveId => {
            const directoryEntry = LEGACY_EXECUTIVE_DIRECTORY[executiveId];
            if (!directoryEntry) return null;
            return {
                id: createDeterministicId('streaming_executive', 'legacy', executiveId),
                executiveId,
                role: directoryEntry.role,
                nameAtAppointment: directoryEntry.name,
                status: 'ACTIVE' as const,
                origin: 'LEGACY_FOUNDING' as const,
                appointedAtAbsoluteWeek: foundingProfile.incorporatedAtAbsoluteWeek,
                endedAtAbsoluteWeek: null,
                weeklyCompensation: 0,
                skill: 62,
                loyalty: 68,
                ambition: 55,
                ethics: 70,
                preferredStrategy: 'BALANCED',
                founderRelationship: 65,
                internalRelationship: 60,
                performance: 60,
                level: 2,
                experience: 0,
            };
        }).filter((appointment): appointment is OwnedStreamingExecutiveAppointment => appointment !== null)
        : [];
    const appointments = dedupeByKey(
        [...legacyAppointments, ...explicitAppointments],
        appointment => appointment.id,
    ).slice(-OWNED_STREAMING_EXECUTIVE_APPOINTMENT_LIMIT);
    const holderType = isOneOf(ceoSource.holderType, ['FOUNDER', 'EXECUTIVE'] as const, 'FOUNDER');
    const executiveId = cleanText(ceoSource.executiveId, '', 120) || null;
    const hasActiveExecutiveCeo = Boolean(
        executiveId
        && appointments.some(appointment => (
            appointment.executiveId === executiveId
            && appointment.status === 'ACTIVE'
        )),
    );
    const developmentPrograms = dedupeByKey(
        asArray<unknown>(source.developmentPrograms)
            .map(normalizeExecutiveDevelopment)
            .filter((program): program is OwnedStreamingExecutiveDevelopment => Boolean(program)),
        program => program.idempotencyKey,
    ).slice(-OWNED_STREAMING_EXECUTIVE_DEVELOPMENT_LIMIT);
    const delegationSource = asRecord(source.delegation);
    return {
        currentCeo: {
            holderType: holderType === 'EXECUTIVE' && hasActiveExecutiveCeo ? 'EXECUTIVE' : 'FOUNDER',
            executiveId: holderType === 'EXECUTIVE' && hasActiveExecutiveCeo ? executiveId : null,
            sinceAbsoluteWeek: Math.max(
                0,
                Math.round(clamp(
                    ceoSource.sinceAbsoluteWeek,
                    0,
                    Number.MAX_SAFE_INTEGER,
                    foundingProfile?.incorporatedAtAbsoluteWeek || 0,
                )),
            ),
        },
        appointments,
        developmentPrograms,
        delegation: {
            maximumRightsBid: Math.round(clamp(delegationSource.maximumRightsBid, 1_000_000, 1_000_000_000, 50_000_000)),
            minimumCapacityHeadroomPercent: Math.round(clamp(delegationSource.minimumCapacityHeadroomPercent, 5, 80, 20)),
            weeklyCampaignLimit: Math.round(clamp(delegationSource.weeklyCampaignLimit, 1_000_000, 250_000_000, 10_000_000)),
            renewalMinimumMarginPercent: Math.round(clamp(delegationSource.renewalMinimumMarginPercent, 0, 60, 15)),
            incidentPolicy: isOneOf(delegationSource.incidentPolicy, ['CONTAIN_FIRST', 'TRANSPARENT_FIRST', 'SERVICE_FIRST'] as const, 'SERVICE_FIRST'),
            updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(delegationSource.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        },
    };
};

const normalizeCapitalAction = (value: unknown): OwnedStreamingCapitalAction | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const type = isOneOf(source.type, CAPITAL_ACTION_TYPES, 'FOUNDER_CONTRIBUTION');
    const absoluteWeek = Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    return {
        id: cleanText(
            source.id,
            createDeterministicId('streaming_capital', idempotencyKey),
            120,
        ),
        idempotencyKey,
        type,
        absoluteWeek,
        amount: Math.round(clamp(source.amount, 0, Number.MAX_SAFE_INTEGER)),
        treasuryDelta: Math.round(clamp(source.treasuryDelta, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        personalCashDelta: Math.round(clamp(source.personalCashDelta, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        debtDelta: Math.round(clamp(source.debtDelta, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        ownershipBefore: clamp(source.ownershipBefore, 0, 100, 100),
        ownershipAfter: clamp(source.ownershipAfter, 0, 100, 100),
    };
};

const normalizeLoanPosition = (value: unknown): OwnedStreamingLoanPosition | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    if (!id) return null;
    return {
        id,
        lenderName: cleanText(source.lenderName, 'Business lender', 120),
        status: isOneOf(source.status, ['ACTIVE', 'REPAID', 'LEGACY_NO_TERMS'] as const, 'ACTIVE'),
        principal: Math.round(clamp(source.principal, 0, Number.MAX_SAFE_INTEGER)),
        outstandingPrincipal: Math.round(clamp(source.outstandingPrincipal, 0, Number.MAX_SAFE_INTEGER)),
        weeklyInterestRate: clamp(source.weeklyInterestRate, 0, 1),
        openedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeEquityPosition = (value: unknown): OwnedStreamingEquityPosition | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    if (!id) return null;
    return {
        id,
        holderName: cleanText(source.holderName, 'Outside investor', 120),
        ownershipPercent: clamp(source.ownershipPercent, 0, 100),
        investedCapital: Math.round(clamp(source.investedCapital, 0, Number.MAX_SAFE_INTEGER)),
        issuedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.issuedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeFinance = (
    value: unknown,
    foundingProfile: OwnedStreamingFoundingProfile | null,
    currentDebtPrincipal: number,
): OwnedStreamingFinanceState => {
    const source = asRecord(value);
    const normalizedCapitalActions = dedupeByKey(
        asArray<unknown>(source.capitalActions)
            .map(normalizeCapitalAction)
            .filter((action): action is OwnedStreamingCapitalAction => Boolean(action)),
        action => action.idempotencyKey,
    );
    const incorporationIdempotencyKey = foundingProfile
        ? foundingProfile.incorporationModel === 'LEGACY_PRE_V7'
            ? `legacy-incorporation:${foundingProfile.incorporatedAtAbsoluteWeek}`
            : `streaming-incorporated:${foundingProfile.incorporatedAtAbsoluteWeek}`
        : null;
    const recordedIncorporation = normalizedCapitalActions.find(action => (
        action.type === 'INCORPORATION'
        && action.idempotencyKey === incorporationIdempotencyKey
    )) || normalizedCapitalActions.find(action => action.type === 'INCORPORATION');
    const incorporationAction = recordedIncorporation || (
        foundingProfile && incorporationIdempotencyKey
            ? {
                id: createDeterministicId('streaming_capital', incorporationIdempotencyKey),
                idempotencyKey: incorporationIdempotencyKey,
                type: 'INCORPORATION',
                absoluteWeek: foundingProfile.incorporatedAtAbsoluteWeek,
                amount: foundingProfile.founderCashCharged,
                treasuryDelta: foundingProfile.openingTreasuryCash,
                personalCashDelta: -foundingProfile.founderCashCharged,
                debtDelta: foundingProfile.debtPrincipalAtIncorporation,
                ownershipBefore: 100,
                ownershipAfter: foundingProfile.founderOwnershipPercentAtIncorporation,
            } satisfies OwnedStreamingCapitalAction
            : null
    );
    const nonIncorporationActions = normalizedCapitalActions.filter(
        action => action.type !== 'INCORPORATION',
    );
    const capitalActions = incorporationAction
        ? [
            incorporationAction,
            ...nonIncorporationActions.slice(-(OWNED_STREAMING_CAPITAL_ACTION_LIMIT - 1)),
        ]
        : nonIncorporationActions.slice(-OWNED_STREAMING_CAPITAL_ACTION_LIMIT);
    const loans = dedupeByKey(
        asArray<unknown>(source.loans)
            .map(normalizeLoanPosition)
            .filter((loan): loan is OwnedStreamingLoanPosition => Boolean(loan)),
        loan => loan.id,
    );
    if (
        foundingProfile?.incorporationModel === 'LEGACY_PRE_V7'
        && currentDebtPrincipal > 0
        && loans.length === 0
    ) {
        loans.push({
            id: createDeterministicId('streaming_loan', 'legacy', foundingProfile.incorporatedAtAbsoluteWeek),
            lenderName: 'Legacy founding facility',
            status: 'LEGACY_NO_TERMS',
            principal: Math.max(currentDebtPrincipal, foundingProfile.debtPrincipalAtIncorporation),
            outstandingPrincipal: currentDebtPrincipal,
            weeklyInterestRate: 0,
            openedAtAbsoluteWeek: foundingProfile.incorporatedAtAbsoluteWeek,
        });
    }
    const equityHolders = dedupeByKey(
        asArray<unknown>(source.equityHolders)
            .map(normalizeEquityPosition)
            .filter((holder): holder is OwnedStreamingEquityPosition => Boolean(holder)),
        holder => holder.id,
    );
    const legacyOutsideOwnership = foundingProfile?.incorporationModel === 'LEGACY_PRE_V7'
        ? Math.max(0, 100 - foundingProfile.founderOwnershipPercentAtIncorporation)
        : 0;
    if (foundingProfile && legacyOutsideOwnership > 0 && equityHolders.length === 0) {
        equityHolders.push({
            id: createDeterministicId('streaming_equity', 'legacy', foundingProfile.incorporatedAtAbsoluteWeek),
            holderName: 'Legacy investor pool',
            ownershipPercent: legacyOutsideOwnership,
            investedCapital: foundingProfile.outsideCapitalRaisedAtIncorporation,
            issuedAtAbsoluteWeek: foundingProfile.incorporatedAtAbsoluteWeek,
        });
    }
    return {
        capitalActions,
        loans: loans.slice(-OWNED_STREAMING_LOAN_LIMIT),
        equityHolders: equityHolders.slice(-OWNED_STREAMING_EQUITY_HOLDER_LIMIT),
    };
};

const normalizeBoardDirector = (value: unknown): OwnedStreamingBoardDirector | null => {
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const candidateId = cleanText(source.candidateId, '', 120);
    if (!id || !candidateId) return null;
    const appointedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.appointedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const status = isOneOf(source.status, ['ACTIVE', 'DEPARTED'] as const, 'ACTIVE');
    return {
        id,
        candidateId,
        name: cleanText(source.name, 'Board director', 120),
        seatType: isOneOf(source.seatType, ['INDEPENDENT', 'INVESTOR_NOMINEE'] as const, 'INDEPENDENT'),
        status,
        preferredStrategy: isOneOf(source.preferredStrategy, EXECUTIVE_STRATEGIES, 'BALANCED'),
        independence: Math.round(clamp(source.independence, 0, 100, 70)),
        founderRelationship: Math.round(clamp(source.founderRelationship, 0, 100, 55)),
        weeklyCompensation: Math.round(clamp(source.weeklyCompensation, 0, Number.MAX_SAFE_INTEGER)),
        appointedAtAbsoluteWeek,
        endedAtAbsoluteWeek: status === 'DEPARTED'
            ? Math.max(appointedAtAbsoluteWeek, Math.round(clamp(source.endedAtAbsoluteWeek, appointedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, appointedAtAbsoluteWeek)))
            : null,
        linkedInvestorId: cleanText(source.linkedInvestorId, '', 120) || null,
    };
};

const normalizeBoardMotion = (value: unknown): OwnedStreamingBoardMotion | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const calledAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.calledAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    return {
        id: cleanText(source.id, createDeterministicId('streaming_board_motion', idempotencyKey), 120),
        idempotencyKey,
        motionId: isOneOf(source.motionId, BOARD_MOTION_IDS, 'RIGHTS_AUTHORITY'),
        title: cleanText(source.title, 'Board motion', 160),
        status: isOneOf(source.status, ['APPROVED', 'REJECTED'] as const, 'REJECTED'),
        binding: Boolean(source.binding),
        founderVote: isOneOf(source.founderVote, ['FOR', 'AGAINST'] as const, 'FOR'),
        votes: asArray<unknown>(source.votes).slice(0, 10).flatMap(value => {
            const vote = asRecord(value);
            const directorId = cleanText(vote.directorId, '', 120);
            if (!directorId) return [];
            return [{
                directorId,
                directorName: cleanText(vote.directorName, 'Director', 120),
                vote: isOneOf(vote.vote, ['FOR', 'AGAINST'] as const, 'AGAINST'),
                rationale: cleanText(vote.rationale, 'The director voted from the current governance posture.', 220),
            }];
        }),
        boardConfidenceDelta: Math.round(clamp(source.boardConfidenceDelta, -25, 25, 0)),
        calledAtAbsoluteWeek,
        resolvedAtAbsoluteWeek: Math.max(
            calledAtAbsoluteWeek,
            Math.round(clamp(source.resolvedAtAbsoluteWeek, calledAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, calledAtAbsoluteWeek)),
        ),
        consequence: cleanText(source.consequence, 'The motion was recorded in the permanent board history.', 260),
    };
};

const normalizeCelebrityInvestor = (value: unknown): OwnedStreamingCelebrityInvestor | null => {
    const source = asRecord(value);
    const candidateId = cleanText(source.candidateId, '', 120);
    if (!candidateId) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_celebrity_investor', candidateId), 120),
        candidateId,
        name: cleanText(source.name, 'Celebrity investor', 120),
        status: isOneOf(source.status, ['ACCEPTED', 'DECLINED'] as const, 'DECLINED'),
        investedCapital: Math.round(clamp(source.investedCapital, 0, Number.MAX_SAFE_INTEGER)),
        ownershipPercent: clamp(source.ownershipPercent, 0, 49),
        boardSeatGranted: Boolean(source.boardSeatGranted),
        profitParticipationPercent: clamp(source.profitParticipationPercent, 0, 25),
        influenceDemand: cleanText(source.influenceDemand, 'Visible strategic influence', 260),
        decisionAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.decisionAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeGovernance = (value: unknown): OwnedStreamingGovernanceState => {
    const source = asRecord(value);
    return {
        boardConfidence: Math.round(clamp(source.boardConfidence, 0, 100, 72)),
        directors: dedupeByKey(
            asArray<unknown>(source.directors)
                .map(normalizeBoardDirector)
                .filter((director): director is OwnedStreamingBoardDirector => Boolean(director)),
            director => director.id,
        ).slice(-OWNED_STREAMING_BOARD_DIRECTOR_LIMIT),
        motions: dedupeByKey(
            asArray<unknown>(source.motions)
                .map(normalizeBoardMotion)
                .filter((motion): motion is OwnedStreamingBoardMotion => Boolean(motion)),
            motion => motion.idempotencyKey,
        ).slice(-OWNED_STREAMING_BOARD_MOTION_LIMIT),
        celebrityInvestors: dedupeByKey(
            asArray<unknown>(source.celebrityInvestors)
                .map(normalizeCelebrityInvestor)
                .filter((investor): investor is OwnedStreamingCelebrityInvestor => Boolean(investor)),
            investor => investor.candidateId,
        ).slice(-OWNED_STREAMING_CELEBRITY_INVESTOR_LIMIT),
    };
};

const normalizeRivalProfile = (value: unknown): OwnedStreamingRivalProfile | null => {
    const source = asRecord(value);
    const platformId = isOneOf(source.platformId, PLATFORM_IDS, 'NETFLIX');
    if (!cleanText(source.platformName, '', 100)) return null;
    const memory = asRecord(source.memory);
    const preferredRegions = asArray<unknown>(source.preferredRegions)
        .filter((item): item is StreamingRegionId => REGION_IDS.includes(item as StreamingRegionId))
        .slice(0, 4);
    const persistedRegions = asArray<unknown>(source.activeRegionIds)
        .filter((item): item is StreamingRegionId => REGION_IDS.includes(item as StreamingRegionId))
        .slice(0, REGION_IDS.length);
    return {
        platformId,
        platformName: cleanText(source.platformName, 'Rival platform', 100),
        ceoName: cleanText(source.ceoName, 'Rival CEO', 100),
        ceoPersonality: cleanText(source.ceoPersonality, 'Disciplined competitor', 180),
        strategy: isOneOf(source.strategy, RIVAL_STRATEGIES, 'SCALE_DOMINANCE'),
        cashReserveMillions: clamp(source.cashReserveMillions, 0, 1_000_000),
        subscribersMillions: clamp(source.subscribersMillions, 0, 10_000),
        standaloneValuationBillions: clamp(source.standaloneValuationBillions, 0, 1_000_000),
        technology: Math.round(clamp(source.technology, 0, 100, 60)),
        catalogPower: Math.round(clamp(source.catalogPower, 0, 100, 60)),
        prestige: Math.round(clamp(source.prestige, 0, 100, 60)),
        aggression: Math.round(clamp(source.aggression, 0, 100, 60)),
        baseMonthlyPrice: clamp(source.baseMonthlyPrice, 0, 200, 12.99),
        perceivedValue: Math.round(clamp(source.perceivedValue, 0, 100, 65)),
        activeRegionIds: persistedRegions.length
            ? persistedRegions
            : Array.from(new Set<StreamingRegionId>(['HOME_MARKET', ...preferredRegions.slice(0, 2)])),
        copiedTechnologyBranches: asArray<unknown>(source.copiedTechnologyBranches)
            .filter((item): item is StreamingTechnologyBranch => TECHNOLOGY_BRANCHES.includes(item as StreamingTechnologyBranch))
            .slice(0, TECHNOLOGY_BRANCHES.length),
        preferredGenres: uniqueStrings(source.preferredGenres, 6),
        preferredRegions,
        cooldownUntilAbsoluteWeek: Math.max(0, Math.round(clamp(source.cooldownUntilAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        lastMoveAbsoluteWeek: source.lastMoveAbsoluteWeek === null || source.lastMoveAbsoluteWeek === undefined
            ? null
            : Math.max(0, Math.round(clamp(source.lastMoveAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        mistakes: Math.round(clamp(source.mistakes, 0, 10_000)),
        memory: {
            respect: Math.round(clamp(memory.respect, 0, 100, 35)),
            resentment: Math.round(clamp(memory.resentment, 0, 100, 20)),
            encounters: Math.round(clamp(memory.encounters, 0, 10_000)),
            rivalWins: Math.round(clamp(memory.rivalWins, 0, 10_000)),
            playerDefences: Math.round(clamp(memory.playerDefences, 0, 10_000)),
            lastMoveType: RIVAL_MOVE_TYPES.includes(memory.lastMoveType as StreamingRivalMoveType)
                ? memory.lastMoveType as StreamingRivalMoveType
                : null,
        },
    };
};

const normalizeRivalMove = (value: unknown): OwnedStreamingRivalMove | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const createdAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const targetExecutiveId = cleanText(source.targetExecutiveId, '', 120) || null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_rival_move', idempotencyKey), 120),
        idempotencyKey,
        platformId: isOneOf(source.platformId, PLATFORM_IDS, 'NETFLIX'),
        platformName: cleanText(source.platformName, 'Rival platform', 100),
        ceoName: cleanText(source.ceoName, 'Rival CEO', 100),
        type: isOneOf(source.type, RIVAL_MOVE_TYPES, 'COUNTER_PROGRAM'),
        battlefront: isOneOf(source.battlefront, WAR_BATTLEFRONTS, 'CONTENT'),
        targetRegionId: REGION_IDS.includes(source.targetRegionId as StreamingRegionId) ? source.targetRegionId as StreamingRegionId : null,
        targetTechnologyBranch: TECHNOLOGY_BRANCHES.includes(source.targetTechnologyBranch as StreamingTechnologyBranch) ? source.targetTechnologyBranch as StreamingTechnologyBranch : null,
        strategyReason: cleanText(source.strategyReason, 'The rival saw an opening in your current position.', 280),
        playerImpact: cleanText(source.playerImpact, 'Audience pressure remains active while the move is unresolved.', 280),
        rivalPriceBefore: source.rivalPriceBefore === null || source.rivalPriceBefore === undefined ? null : clamp(source.rivalPriceBefore, 0, 200),
        rivalPriceAfter: source.rivalPriceAfter === null || source.rivalPriceAfter === undefined ? null : clamp(source.rivalPriceAfter, 0, 200),
        title: cleanText(source.title, 'A rival entered the market window.', 160),
        detail: cleanText(source.detail, 'The move used real rival resources and created a visible market consequence.', 300),
        status: isOneOf(source.status, ['OPEN', 'MISFIRED', 'DEFENDED', 'ACCEPTED_PRESSURE', 'EXPIRED'] as const, 'OPEN'),
        cashCostMillions: clamp(source.cashCostMillions, 0, 1_000_000),
        rivalCashBeforeMillions: clamp(source.rivalCashBeforeMillions, 0, 1_000_000),
        rivalCashAfterMillions: clamp(source.rivalCashAfterMillions, 0, 1_000_000),
        createdAtAbsoluteWeek,
        pressureStartsAbsoluteWeek: Math.max(createdAtAbsoluteWeek, Math.round(clamp(source.pressureStartsAbsoluteWeek, createdAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, createdAtAbsoluteWeek + 1))),
        expiresAtAbsoluteWeek: Math.max(createdAtAbsoluteWeek + 1, Math.round(clamp(source.expiresAtAbsoluteWeek, createdAtAbsoluteWeek + 1, Number.MAX_SAFE_INTEGER, createdAtAbsoluteWeek + 4))),
        acquisitionRateDelta: clamp(source.acquisitionRateDelta, -0.2, 0.2, 0),
        churnRateDelta: clamp(source.churnRateDelta, -0.2, 0.2, 0),
        prestigeDelta: clamp(source.prestigeDelta, -100, 100, 0),
        targetExecutiveId,
        targetExecutiveName: targetExecutiveId ? cleanText(source.targetExecutiveName, 'Executive', 120) : null,
        responseId: RIVAL_RESPONSE_IDS.includes(source.responseId as StreamingRivalResponseId)
            ? source.responseId as StreamingRivalResponseId
            : null,
        responseCost: Math.round(clamp(source.responseCost, 0, Number.MAX_SAFE_INTEGER)),
        responseAtAbsoluteWeek: source.responseAtAbsoluteWeek === null || source.responseAtAbsoluteWeek === undefined
            ? null
            : Math.max(createdAtAbsoluteWeek, Math.round(clamp(source.responseAtAbsoluteWeek, createdAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
        outcomeNote: cleanText(source.outcomeNote, 'Awaiting the next market response.', 260),
    };
};

const normalizeRivalWeeklySnapshot = (value: unknown): OwnedStreamingRivalWeeklySnapshot | null => {
    const source = asRecord(value);
    const absoluteWeek = Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const platformName = cleanText(source.platformName, '', 100);
    if (!platformName) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_rival_week', source.platformId, absoluteWeek), 120),
        absoluteWeek,
        platformId: isOneOf(source.platformId, PLATFORM_IDS, 'NETFLIX'),
        platformName,
        subscribersBeforeMillions: clamp(source.subscribersBeforeMillions, 0, 10_000),
        subscribersAfterMillions: clamp(source.subscribersAfterMillions, 0, 10_000),
        netMovementMillions: clamp(source.netMovementMillions, -1_000, 1_000),
        driver: cleanText(source.driver, 'Audience movement followed the platform position.', 220),
    };
};

const normalizeRegionalLaunch = (value: unknown): OwnedStreamingRegionalLaunch | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const readyAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.readyAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, startedAtAbsoluteWeek)));
    const status = isOneOf(source.status, ['ACTIVE', 'IN_PROGRESS'] as const, 'IN_PROGRESS');
    return {
        id: cleanText(source.id, createDeterministicId('streaming_region', idempotencyKey), 120),
        idempotencyKey,
        regionId: isOneOf(source.regionId, REGION_IDS, 'HOME_MARKET'),
        regionName: cleanText(source.regionName, 'Market region', 100),
        approach: isOneOf(source.approach, REGIONAL_LAUNCH_APPROACHES, 'LOCAL_PARTNERSHIP'),
        status,
        capitalCost: Math.round(clamp(source.capitalCost, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        addressableAudienceMillions: clamp(source.addressableAudienceMillions, 0, 10_000),
        acquisitionRateDelta: clamp(source.acquisitionRateDelta, -0.2, 0.2, 0),
        peakLoadPercent: clamp(source.peakLoadPercent, 0, 1_000),
        localizationDepth: Math.round(clamp(source.localizationDepth, 0, 100)),
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek,
        launchedAtAbsoluteWeek: status === 'ACTIVE'
            ? Math.max(readyAtAbsoluteWeek, Math.round(clamp(source.launchedAtAbsoluteWeek, readyAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, readyAtAbsoluteWeek)))
            : null,
    };
};

const normalizeMarketShareSnapshot = (value: unknown): OwnedStreamingMarketShareSnapshot | null => {
    const source = asRecord(value);
    const absoluteWeek = Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const ids = [...PLATFORM_IDS, 'PLAYER'] as const;
    const entries = asArray<unknown>(source.entries).slice(0, ids.length).flatMap(value => {
        const entry = asRecord(value);
        if (!ids.includes(entry.id as typeof ids[number])) return [];
        return [{
            id: entry.id as typeof ids[number],
            name: cleanText(entry.name, 'Platform', 100),
            subscribersMillions: clamp(entry.subscribersMillions, 0, 10_000),
            sharePercent: clamp(entry.sharePercent, 0, 100),
        }];
    });
    if (!entries.length) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_market_share', absoluteWeek), 120),
        absoluteWeek,
        entries,
    };
};

const normalizeAwardSeason = (value: unknown): OwnedStreamingAwardSeason | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const ids = [...PLATFORM_IDS, 'PLAYER'] as const;
    const results = asArray<unknown>(source.results).slice(0, AWARD_CATEGORY_IDS.length).flatMap(value => {
        const result = asRecord(value);
        if (!AWARD_CATEGORY_IDS.includes(result.categoryId as StreamingAwardCategoryId)) return [];
        const nominees = asArray<unknown>(result.nominees).slice(0, 3).flatMap(value => {
            const nominee = asRecord(value);
            if (!ids.includes(nominee.id as typeof ids[number])) return [];
            return [{
                id: nominee.id as typeof ids[number],
                name: cleanText(nominee.name, 'Platform', 100),
                score: clamp(nominee.score, 0, 200),
                evidence: cleanText(nominee.evidence, 'Industry performance evidence.', 220),
            }];
        });
        const winnerId = ids.includes(result.winnerId as typeof ids[number])
            ? result.winnerId as typeof ids[number]
            : nominees[0]?.id || 'NETFLIX';
        return [{
            categoryId: result.categoryId as StreamingAwardCategoryId,
            categoryName: cleanText(result.categoryName, 'Streaming Award', 120),
            nominees,
            winnerId,
            winnerName: cleanText(result.winnerName, nominees.find(item => item.id === winnerId)?.name || 'Platform', 100),
            playerNominated: Boolean(result.playerNominated),
            playerWon: Boolean(result.playerWon),
        }];
    });
    return {
        id: cleanText(source.id, createDeterministicId('streaming_awards', idempotencyKey), 120),
        idempotencyKey,
        seasonNumber: Math.max(1, Math.round(clamp(source.seasonNumber, 1, 1_000, 1))),
        absoluteWeek: Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        results,
        playerNominations: Math.round(clamp(source.playerNominations, 0, AWARD_CATEGORY_IDS.length)),
        playerWins: Math.round(clamp(source.playerWins, 0, AWARD_CATEGORY_IDS.length)),
    };
};

const normalizeCompetitiveWorld = (
    value: unknown,
    protectedRivalMoveIds: ReadonlySet<string> = new Set(),
): OwnedStreamingCompetitiveWorldState => {
    const source = asRecord(value);
    const normalizedMoves = dedupeByKey(
        asArray<unknown>(source.moves).map(normalizeRivalMove).filter((item): item is OwnedStreamingRivalMove => Boolean(item)),
        item => item.idempotencyKey,
    );
    const retainedMoveIds = new Set([
        ...normalizedMoves.slice(-OWNED_STREAMING_RIVAL_MOVE_LIMIT).map(move => move.id),
        ...protectedRivalMoveIds,
    ]);
    return {
        initializedAtAbsoluteWeek: source.initializedAtAbsoluteWeek === null || source.initializedAtAbsoluteWeek === undefined
            ? null
            : Math.max(0, Math.round(clamp(source.initializedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        lastSimulatedAbsoluteWeek: source.lastSimulatedAbsoluteWeek === null || source.lastSimulatedAbsoluteWeek === undefined
            ? null
            : Math.max(0, Math.round(clamp(source.lastSimulatedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        rivalryHeat: Math.round(clamp(source.rivalryHeat, 0, 100)),
        globalPrestige: Math.round(clamp(source.globalPrestige, 0, 100)),
        rivals: dedupeByKey(
            asArray<unknown>(source.rivals).map(normalizeRivalProfile).filter((item): item is OwnedStreamingRivalProfile => Boolean(item)),
            item => item.platformId,
        ).slice(0, PLATFORM_IDS.length),
        moves: normalizedMoves.filter(move => retainedMoveIds.has(move.id)),
        weeklyRivalHistory: dedupeByKey(
            asArray<unknown>(source.weeklyRivalHistory).map(normalizeRivalWeeklySnapshot).filter((item): item is OwnedStreamingRivalWeeklySnapshot => Boolean(item)),
            item => item.id,
        ).sort((a, b) => a.absoluteWeek - b.absoluteWeek).slice(-OWNED_STREAMING_WEEKLY_HISTORY_LIMIT * PLATFORM_IDS.length),
        regionalLaunches: dedupeByKey(
            asArray<unknown>(source.regionalLaunches).map(normalizeRegionalLaunch).filter((item): item is OwnedStreamingRegionalLaunch => Boolean(item)),
            item => item.regionId,
        ).slice(0, REGION_IDS.length),
        marketShareHistory: dedupeByKey(
            asArray<unknown>(source.marketShareHistory).map(normalizeMarketShareSnapshot).filter((item): item is OwnedStreamingMarketShareSnapshot => Boolean(item)),
            item => String(item.absoluteWeek),
        ).sort((a, b) => a.absoluteWeek - b.absoluteWeek).slice(-OWNED_STREAMING_MARKET_SHARE_HISTORY_LIMIT),
        awardSeasons: dedupeByKey(
            asArray<unknown>(source.awardSeasons).map(normalizeAwardSeason).filter((item): item is OwnedStreamingAwardSeason => Boolean(item)),
            item => item.idempotencyKey,
        ).slice(-OWNED_STREAMING_AWARD_SEASON_LIMIT),
    };
};

const normalizeAcquisitionValuation = (value: unknown): OwnedStreamingAcquisitionValuation | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const valuedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.valuedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    return {
        standaloneValue: Math.round(clamp(source.standaloneValue, 0, Number.MAX_SAFE_INTEGER)),
        subscriberValue: Math.round(clamp(source.subscriberValue, 0, Number.MAX_SAFE_INTEGER)),
        catalogValue: Math.round(clamp(source.catalogValue, 0, Number.MAX_SAFE_INTEGER)),
        technologyValue: Math.round(clamp(source.technologyValue, 0, Number.MAX_SAFE_INTEGER)),
        brandValue: Math.round(clamp(source.brandValue, 0, Number.MAX_SAFE_INTEGER)),
        strategicPremium: Math.round(clamp(source.strategicPremium, 0, Number.MAX_SAFE_INTEGER)),
        debtAndLiabilities: Math.round(clamp(source.debtAndLiabilities, 0, Number.MAX_SAFE_INTEGER)),
        fairValue: Math.round(clamp(source.fairValue, 0, Number.MAX_SAFE_INTEGER)),
        sellerFloor: Math.round(clamp(source.sellerFloor, 0, Number.MAX_SAFE_INTEGER)),
        valuationCost: Math.round(clamp(source.valuationCost, 0, Number.MAX_SAFE_INTEGER)),
        valuedAtAbsoluteWeek,
    };
};

const normalizeDueDiligence = (value: unknown): OwnedStreamingDueDiligence | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const completedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.completedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const issues = asArray<unknown>(source.issues).slice(0, 8).flatMap(value => {
        const issue = asRecord(value);
        const id = cleanText(issue.id, '', 120);
        if (!id) return [];
        return [{
            id,
            title: cleanText(issue.title, 'Diligence finding', 140),
            detail: cleanText(issue.detail, 'The data room exposed an integration risk.', 260),
            severity: isOneOf(issue.severity, ['WATCH', 'MATERIAL', 'SEVERE'] as const, 'WATCH'),
            valueImpact: Math.round(clamp(issue.valueImpact, -Number.MAX_SAFE_INTEGER, 0, 0)),
            integrationRisk: Math.round(clamp(issue.integrationRisk, 0, 100)),
        }];
    });
    return {
        commissionedCost: Math.round(clamp(source.commissionedCost, 0, Number.MAX_SAFE_INTEGER)),
        issues,
        adjustedFairValue: Math.round(clamp(source.adjustedFairValue, 0, Number.MAX_SAFE_INTEGER)),
        verifiedDebt: Math.round(clamp(source.verifiedDebt, 0, Number.MAX_SAFE_INTEGER)),
        contentLiability: Math.round(clamp(source.contentLiability, 0, Number.MAX_SAFE_INTEGER)),
        technicalDebt: Math.round(clamp(source.technicalDebt, 0, Number.MAX_SAFE_INTEGER)),
        churnExposure: clamp(source.churnExposure, 0, 1),
        completedAtAbsoluteWeek,
    };
};

const normalizeAcquisitionCounterbid = (value: unknown): OwnedStreamingAcquisitionCounterbid | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    if (!PLATFORM_IDS.includes(source.bidderPlatformId as PlatformId)) return null;
    const createdAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const status = isOneOf(source.status, ['OPEN', 'BEATEN', 'WON_BY_RIVAL'] as const, 'OPEN');
    return {
        bidderPlatformId: source.bidderPlatformId as PlatformId,
        bidderName: cleanText(source.bidderName, 'Rival platform', 100),
        bidderCeoName: cleanText(source.bidderCeoName, 'Rival CEO', 100),
        amount: Math.round(clamp(source.amount, 0, Number.MAX_SAFE_INTEGER)),
        pursuitCostMillions: clamp(source.pursuitCostMillions, 0, Number.MAX_SAFE_INTEGER),
        playerRequiredBid: Math.round(clamp(source.playerRequiredBid, 0, Number.MAX_SAFE_INTEGER)),
        status,
        createdAtAbsoluteWeek,
        resolvedAtAbsoluteWeek: status === 'OPEN'
            ? null
            : Math.max(createdAtAbsoluteWeek, Math.round(clamp(source.resolvedAtAbsoluteWeek, createdAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, createdAtAbsoluteWeek))),
    };
};

const normalizeAcquisitionApproval = (value: unknown): OwnedStreamingAcquisitionApproval | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    return {
        binding: Boolean(source.binding),
        status: isOneOf(source.status, ['APPROVED', 'REJECTED'] as const, 'REJECTED'),
        founderVote: 'FOR',
        votes: asArray<unknown>(source.votes).slice(0, 10).flatMap(value => {
            const vote = asRecord(value);
            const directorId = cleanText(vote.directorId, '', 120);
            if (!directorId) return [];
            return [{
                directorId,
                directorName: cleanText(vote.directorName, 'Director', 120),
                vote: isOneOf(vote.vote, ['FOR', 'AGAINST'] as const, 'AGAINST'),
                rationale: cleanText(vote.rationale, 'The director voted from the disclosed deal terms.', 220),
            }];
        }),
        confidenceDelta: Math.round(clamp(source.confidenceDelta, -25, 25, 0)),
        commitments: uniqueStrings(source.commitments, ACQUISITION_COMMITMENTS.length)
            .filter((id): id is StreamingAcquisitionCommitmentId => ACQUISITION_COMMITMENTS.includes(id as StreamingAcquisitionCommitmentId)),
        resolvedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeRegulatoryReview = (value: unknown): OwnedStreamingRegulatoryReview | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    return {
        scrutinyScore: Math.round(clamp(source.scrutinyScore, 0, 100)),
        strategy: isOneOf(source.strategy, REGULATORY_STRATEGIES, 'CLEAN_COMMITMENTS'),
        status: isOneOf(source.status, ['CLEARED', 'CLEARED_WITH_REMEDIES', 'BLOCKED'] as const, 'BLOCKED'),
        remedyCost: Math.round(clamp(source.remedyCost, 0, Number.MAX_SAFE_INTEGER)),
        subscriberRetentionPercent: clamp(source.subscriberRetentionPercent, 0, 100),
        catalogRetentionPercent: clamp(source.catalogRetentionPercent, 0, 100),
        technologyRetentionPercent: clamp(source.technologyRetentionPercent, 0, 100),
        rationale: cleanText(source.rationale, 'Regulators recorded their decision.', 280),
        resolvedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeAcquisitionFinancing = (value: unknown): OwnedStreamingAcquisitionFinancing | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    return {
        source: isOneOf(source.source, ACQUISITION_FUNDING_SOURCES, 'TREASURY'),
        totalConsideration: Math.round(clamp(source.totalConsideration, 0, Number.MAX_SAFE_INTEGER)),
        treasuryContribution: Math.round(clamp(source.treasuryContribution, 0, Number.MAX_SAFE_INTEGER)),
        debtPrincipal: Math.round(clamp(source.debtPrincipal, 0, Number.MAX_SAFE_INTEGER)),
        equityConsideration: Math.round(clamp(source.equityConsideration, 0, Number.MAX_SAFE_INTEGER)),
        weeklyInterestRate: clamp(source.weeklyInterestRate, 0, 0.1),
        lenderName: cleanText(source.lenderName, '', 120) || null,
        founderOwnershipBefore: clamp(source.founderOwnershipBefore, 0, 100),
        founderOwnershipAfter: clamp(source.founderOwnershipAfter, 0, 100),
        lockedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.lockedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeAcquisitionCase = (value: unknown): OwnedStreamingAcquisitionCase | null => {
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!id || !idempotencyKey || !PLATFORM_IDS.includes(source.targetPlatformId as PlatformId)) return null;
    const offerSource = asRecord(source.offer);
    const openedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const status = isOneOf(source.status, ACQUISITION_STATUSES, 'SCOUTED');
    const offer = source.offer && typeof source.offer === 'object'
        ? {
            dealStructure: isOneOf(offerSource.dealStructure, ['FULL_ACQUISITION', 'STRATEGIC_MERGER'] as const, 'FULL_ACQUISITION'),
            offeredPrice: Math.round(clamp(offerSource.offeredPrice, 0, Number.MAX_SAFE_INTEGER)),
            commitments: uniqueStrings(offerSource.commitments, ACQUISITION_COMMITMENTS.length)
                .filter((entry): entry is StreamingAcquisitionCommitmentId => ACQUISITION_COMMITMENTS.includes(entry as StreamingAcquisitionCommitmentId)),
            sellerResponse: isOneOf(offerSource.sellerResponse, ['COUNTERED', 'ACCEPTED'] as const, 'COUNTERED'),
            sellerCounterPrice: offerSource.sellerCounterPrice === null || offerSource.sellerCounterPrice === undefined
                ? null
                : Math.round(clamp(offerSource.sellerCounterPrice, 0, Number.MAX_SAFE_INTEGER)),
            submittedAtAbsoluteWeek: Math.max(openedAtAbsoluteWeek, Math.round(clamp(offerSource.submittedAtAbsoluteWeek, openedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, openedAtAbsoluteWeek))),
            revision: Math.max(1, Math.round(clamp(offerSource.revision, 1, 100, 1))),
        }
        : null;
    return {
        id,
        idempotencyKey,
        targetPlatformId: source.targetPlatformId as PlatformId,
        targetPlatformName: cleanText(source.targetPlatformName, 'Streaming platform', 100),
        targetCeoName: cleanText(source.targetCeoName, 'CEO', 100),
        status,
        openedAtAbsoluteWeek,
        updatedAtAbsoluteWeek: Math.max(openedAtAbsoluteWeek, Math.round(clamp(source.updatedAtAbsoluteWeek, openedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, openedAtAbsoluteWeek))),
        valuation: normalizeAcquisitionValuation(source.valuation),
        offer,
        diligence: normalizeDueDiligence(source.diligence),
        counterbid: normalizeAcquisitionCounterbid(source.counterbid),
        approval: normalizeAcquisitionApproval(source.approval),
        regulatoryReview: normalizeRegulatoryReview(source.regulatoryReview),
        financing: normalizeAcquisitionFinancing(source.financing),
        integrationMode: source.integrationMode === null || source.integrationMode === undefined
            ? null
            : isOneOf(source.integrationMode, INTEGRATION_MODES, 'PRESERVE_BRAND'),
        finalPurchasePrice: source.finalPurchasePrice === null || source.finalPurchasePrice === undefined
            ? null
            : Math.round(clamp(source.finalPurchasePrice, 0, Number.MAX_SAFE_INTEGER)),
        signedAtAbsoluteWeek: status === 'SIGNED'
            ? Math.max(openedAtAbsoluteWeek, Math.round(clamp(source.signedAtAbsoluteWeek, openedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, openedAtAbsoluteWeek)))
            : null,
        acquiredSubscriberCount: Math.round(clamp(source.acquiredSubscriberCount, 0, Number.MAX_SAFE_INTEGER)),
        outcomeNote: cleanText(source.outcomeNote, '', 260) || null,
    };
};

const normalizeAcquisitionIntegration = (value: unknown): OwnedStreamingAcquisitionIntegration | null => {
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    const acquisitionCaseId = cleanText(source.acquisitionCaseId, '', 120);
    if (!id || !idempotencyKey || !acquisitionCaseId || !PLATFORM_IDS.includes(source.targetPlatformId as PlatformId)) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const readyAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek + 1, Math.round(clamp(source.readyAtAbsoluteWeek, startedAtAbsoluteWeek + 1, Number.MAX_SAFE_INTEGER, startedAtAbsoluteWeek + 1)));
    const status = isOneOf(source.status, ['IN_PROGRESS', 'INTEGRATED'] as const, 'IN_PROGRESS');
    return {
        id,
        idempotencyKey,
        acquisitionCaseId,
        targetPlatformId: source.targetPlatformId as PlatformId,
        targetPlatformName: cleanText(source.targetPlatformName, 'Streaming platform', 100),
        mode: isOneOf(source.mode, INTEGRATION_MODES, 'PRESERVE_BRAND'),
        status,
        capitalReserve: Math.round(clamp(source.capitalReserve, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        integrationWeeks: Math.max(1, Math.round(clamp(source.integrationWeeks, 1, 104, 8))),
        subscriberRetentionPercent: clamp(source.subscriberRetentionPercent, 0, 100),
        acquiredSubscriberCount: Math.round(clamp(source.acquiredSubscriberCount, 0, Number.MAX_SAFE_INTEGER)),
        catalogAssetCount: Math.round(clamp(source.catalogAssetCount, 0, 100_000)),
        technologyLevelDelta: Math.round(clamp(source.technologyLevelDelta, 0, 100)),
        acquisitionRateDelta: clamp(source.acquisitionRateDelta, -1, 1),
        churnRateDelta: clamp(source.churnRateDelta, -1, 1),
        reliabilityRisk: clamp(source.reliabilityRisk, 0, 1),
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek,
        completedAtAbsoluteWeek: status === 'INTEGRATED'
            ? Math.max(readyAtAbsoluteWeek, Math.round(clamp(source.completedAtAbsoluteWeek, readyAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, readyAtAbsoluteWeek)))
            : null,
    };
};

const normalizeCorporateDevelopment = (value: unknown): OwnedStreamingCorporateDevelopmentState => {
    const source = asRecord(value);
    const acquisitionCases = dedupeByKey(
        asArray<unknown>(source.acquisitionCases)
            .map(normalizeAcquisitionCase)
            .filter((entry): entry is OwnedStreamingAcquisitionCase => Boolean(entry)),
        entry => entry.idempotencyKey,
    ).slice(-OWNED_STREAMING_ACQUISITION_CASE_LIMIT);
    return {
        acquisitionCases,
        integrations: dedupeByKey(
            asArray<unknown>(source.integrations)
                .map(normalizeAcquisitionIntegration)
                .filter((entry): entry is OwnedStreamingAcquisitionIntegration => Boolean(entry)),
            entry => entry.idempotencyKey,
        ).slice(-OWNED_STREAMING_INTEGRATION_LIMIT),
        acquiredPlatformIds: uniqueStrings(source.acquiredPlatformIds, PLATFORM_IDS.length)
            .filter((id): id is PlatformId => PLATFORM_IDS.includes(id as PlatformId)),
    };
};

const normalizeCrisisSecurity = (value: unknown): OwnedStreamingCrisisSecurityState => {
    const source = asRecord(value);
    const crises = asArray<unknown>(source.crises).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        if (!idempotencyKey) return null;
        const detectedAtAbsoluteWeek = Math.max(0, Math.round(clamp(item.detectedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
        const stage = isOneOf(item.stage, ['DETECTED', 'RECOVERING', 'RESOLVED'] as const, 'DETECTED');
        return {
            id: cleanText(item.id, createDeterministicId('streaming_crisis', idempotencyKey), 120),
            idempotencyKey,
            type: isOneOf(item.type, ['PLATFORM_OUTAGE', 'ACCOUNT_BREACH', 'CONTENT_LEAK', 'RECOMMENDATION_BACKLASH', 'RIGHTS_COMPLIANCE', 'EMPLOYEE_ALLEGATION'] as const, 'PLATFORM_OUTAGE'),
            severity: isOneOf(item.severity, ['MINOR', 'SERIOUS', 'MAJOR', 'CRITICAL'] as const, 'SERIOUS'),
            stage,
            title: cleanText(item.title, 'Platform incident', 120),
            detail: cleanText(item.detail, 'An operating signal requires leadership attention.', 360),
            cause: cleanText(item.cause, 'Operating pressure', 180),
            detectedAtAbsoluteWeek,
            affectedSubscribers: Math.round(clamp(item.affectedSubscribers, 0, Number.MAX_SAFE_INTEGER)),
            estimatedRevenueAtRisk: Math.round(clamp(item.estimatedRevenueAtRisk, 0, Number.MAX_SAFE_INTEGER)),
            responseDoctrine: item.responseDoctrine === null
                ? null
                : isOneOf(item.responseDoctrine, ['CONTAIN_FIRST', 'TRANSPARENT_FIRST', 'SERVICE_FIRST'] as const, 'SERVICE_FIRST'),
            compensation: item.compensation === null
                ? null
                : isOneOf(item.compensation, ['NONE', 'TARGETED', 'FULL'] as const, 'TARGETED'),
            communication: item.communication === null
                ? null
                : isOneOf(item.communication, ['HOLDING_STATEMENT', 'FACTUAL_UPDATE', 'FULL_DISCLOSURE'] as const, 'FACTUAL_UPDATE'),
            responseCost: Math.round(clamp(item.responseCost, 0, Number.MAX_SAFE_INTEGER)),
            weeklyRecoveryCost: Math.round(clamp(item.weeklyRecoveryCost, 0, Number.MAX_SAFE_INTEGER)),
            recoveryReadyAtAbsoluteWeek: item.recoveryReadyAtAbsoluteWeek === null || item.recoveryReadyAtAbsoluteWeek === undefined
                ? null
                : Math.max(detectedAtAbsoluteWeek, Math.round(clamp(item.recoveryReadyAtAbsoluteWeek, detectedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
            resolvedAtAbsoluteWeek: stage === 'RESOLVED'
                ? Math.max(detectedAtAbsoluteWeek, Math.round(clamp(item.resolvedAtAbsoluteWeek, detectedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, detectedAtAbsoluteWeek)))
                : null,
            outcomeNote: item.outcomeNote === null ? null : cleanText(item.outcomeNote, '', 320),
        } satisfies OwnedStreamingCrisis;
    }).filter((item): item is OwnedStreamingCrisis => Boolean(item)).slice(-OWNED_STREAMING_CRISIS_LIMIT);

    const shadowOperations = asArray<unknown>(source.shadowOperations).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        if (!idempotencyKey) return null;
        return {
            id: cleanText(item.id, createDeterministicId('streaming_shadow', idempotencyKey), 120),
            idempotencyKey,
            type: isOneOf(item.type, ['INTELLIGENCE_PURCHASE', 'WHISPER_CAMPAIGN', 'CONTRACT_PRESSURE', 'COVERT_CONTENT_LEAK', 'CORPORATE_ESPIONAGE', 'SERVICE_DISRUPTION_ATTEMPT'] as const, 'INTELLIGENCE_PURCHASE'),
            targetPlatformId: isOneOf(item.targetPlatformId, PLATFORM_IDS, 'NETFLIX'),
            targetPlatformName: cleanText(item.targetPlatformName, 'Rival platform', 100),
            status: isOneOf(item.status, ['EVIDENCE_PENDING', 'EXPOSED', 'CLEARED'] as const, 'EVIDENCE_PENDING'),
            cashCost: Math.round(clamp(item.cashCost, 0, Number.MAX_SAFE_INTEGER)),
            successEstimatePercent: clamp(item.successEstimatePercent, 0, 100),
            exposureRiskPercent: clamp(item.exposureRiskPercent, 0, 100),
            expectedImpact: cleanText(item.expectedImpact, 'Competitive pressure', 220),
            committedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.committedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            evidenceDueAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.evidenceDueAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            succeeded: Boolean(item.succeeded),
            outcomeNote: cleanText(item.outcomeNote, 'The operation entered the market.', 300),
            exposureConsequence: item.exposureConsequence === null ? null : cleanText(item.exposureConsequence, '', 300),
        } satisfies OwnedStreamingShadowOperation;
    }).filter((item): item is OwnedStreamingShadowOperation => Boolean(item)).slice(-OWNED_STREAMING_SHADOW_OPERATION_LIMIT);

    const trustInitiatives = asArray<unknown>(source.trustInitiatives).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        if (!idempotencyKey) return null;
        return {
            id: cleanText(item.id, createDeterministicId('streaming_trust', idempotencyKey), 120),
            idempotencyKey,
            type: isOneOf(item.type, ['SECURITY_DRILL', 'WHISTLEBLOWER_CHANNEL', 'TRANSPARENCY_REPORT', 'INDEPENDENT_AUDIT'] as const, 'SECURITY_DRILL'),
            title: cleanText(item.title, 'Trust initiative', 120),
            cashCost: Math.round(clamp(item.cashCost, 0, Number.MAX_SAFE_INTEGER)),
            completedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.completedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            outcomeNote: cleanText(item.outcomeNote, 'The platform strengthened its operating posture.', 300),
        } satisfies OwnedStreamingTrustInitiative;
    }).filter((item): item is OwnedStreamingTrustInitiative => Boolean(item)).slice(-OWNED_STREAMING_TRUST_INITIATIVE_LIMIT);

    const regulatoryCases = asArray<unknown>(source.regulatoryCases).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        if (!idempotencyKey) return null;
        const status = isOneOf(item.status, ['OPEN', 'CLOSED'] as const, 'OPEN');
        return {
            id: cleanText(item.id, createDeterministicId('streaming_regulator', idempotencyKey), 120),
            idempotencyKey,
            title: cleanText(item.title, 'Regulatory inquiry', 120),
            status,
            scrutinyAtOpening: clamp(item.scrutinyAtOpening, 0, 100),
            openedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            response: item.response === null ? null : isOneOf(item.response, ['COOPERATE', 'CONTEST', 'REMEDIATE'] as const, 'COOPERATE'),
            responseCost: Math.round(clamp(item.responseCost, 0, Number.MAX_SAFE_INTEGER)),
            resolvedAtAbsoluteWeek: status === 'CLOSED'
                ? Math.max(0, Math.round(clamp(item.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)))
                : null,
            outcomeNote: item.outcomeNote === null ? null : cleanText(item.outcomeNote, '', 300),
        } satisfies OwnedStreamingRegulatoryCase;
    }).filter((item): item is OwnedStreamingRegulatoryCase => Boolean(item)).slice(-OWNED_STREAMING_OVERSIGHT_CASE_LIMIT);

    const whistleblowerReports = asArray<unknown>(source.whistleblowerReports).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        if (!idempotencyKey) return null;
        const status = isOneOf(item.status, ['OPEN', 'RESOLVED'] as const, 'OPEN');
        return {
            id: cleanText(item.id, createDeterministicId('streaming_whistleblower', idempotencyKey), 120),
            idempotencyKey,
            title: cleanText(item.title, 'Internal report', 120),
            allegation: cleanText(item.allegation, 'An employee raised an operating concern.', 300),
            status,
            sourceConfidence: clamp(item.sourceConfidence, 0, 100),
            openedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            response: item.response === null ? null : isOneOf(item.response, ['PROTECT_AND_INVESTIGATE', 'DISCREDIT', 'DISCLOSE'] as const, 'PROTECT_AND_INVESTIGATE'),
            responseCost: Math.round(clamp(item.responseCost, 0, Number.MAX_SAFE_INTEGER)),
            resolvedAtAbsoluteWeek: status === 'RESOLVED'
                ? Math.max(0, Math.round(clamp(item.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)))
                : null,
            outcomeNote: item.outcomeNote === null ? null : cleanText(item.outcomeNote, '', 300),
        } satisfies OwnedStreamingWhistleblowerReport;
    }).filter((item): item is OwnedStreamingWhistleblowerReport => Boolean(item)).slice(-OWNED_STREAMING_OVERSIGHT_CASE_LIMIT);

    const operationsSource = asRecord(source.infrastructureOperations);
    const infrastructureIncidents = asArray<unknown>(operationsSource.incidents).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        const facilityId = cleanText(item.facilityId, '', 140);
        const cityId = cleanText(item.cityId, '', 80);
        if (!idempotencyKey || !facilityId || !cityId) return null;
        const detectedAtAbsoluteWeek = Math.max(0, Math.round(clamp(item.detectedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
        const stage = isOneOf(item.stage, ['DETECTED', 'RECOVERING', 'RESOLVED'] as const, 'DETECTED');
        return {
            id: cleanText(item.id, createDeterministicId('streaming_infrastructure_incident', idempotencyKey), 120),
            idempotencyKey,
            type: isOneOf(item.type, ['POWER_FAILURE', 'COOLING_INCIDENT', 'FIBRE_CUT', 'TRAFFIC_SPIKE', 'REGIONAL_OUTAGE', 'CYBERATTACK', 'DDOS_ATTACK', 'RIVAL_SABOTAGE'] as const, 'REGIONAL_OUTAGE'),
            severity: isOneOf(item.severity, ['MINOR', 'SERIOUS', 'MAJOR', 'CRITICAL'] as const, 'SERIOUS'),
            stage,
            title: cleanText(item.title, 'Infrastructure incident', 140),
            detail: cleanText(item.detail, 'A facility operating signal requires a response.', 360),
            cause: cleanText(item.cause, 'Infrastructure pressure', 220),
            facilityId,
            cityId,
            detectedAtAbsoluteWeek,
            affectedSubscribers: Math.round(clamp(item.affectedSubscribers, 0, Number.MAX_SAFE_INTEGER)),
            capacityLossPercent: clamp(item.capacityLossPercent, 0, 100),
            conditionLossPercent: clamp(item.conditionLossPercent, 0, 100),
            responseAction: item.responseAction === null || item.responseAction === undefined
                ? null
                : isOneOf(item.responseAction, ['FAILOVER_BACKUP', 'REROUTE_TRAFFIC', 'ISOLATE_AND_REPAIR', 'EMERGENCY_CAPACITY'] as const, 'ISOLATE_AND_REPAIR'),
            rerouteFacilityId: cleanText(item.rerouteFacilityId, '', 140) || null,
            compensation: item.compensation === null || item.compensation === undefined
                ? null
                : isOneOf(item.compensation, ['NONE', 'TARGETED', 'FULL'] as const, 'TARGETED'),
            insuranceClaimed: Boolean(item.insuranceClaimed),
            responseCost: Math.round(clamp(item.responseCost, 0, Number.MAX_SAFE_INTEGER)),
            insuranceRecovery: Math.round(clamp(item.insuranceRecovery, 0, Number.MAX_SAFE_INTEGER)),
            recoveryReadyAtAbsoluteWeek: item.recoveryReadyAtAbsoluteWeek === null || item.recoveryReadyAtAbsoluteWeek === undefined
                ? null
                : Math.max(detectedAtAbsoluteWeek, Math.round(clamp(item.recoveryReadyAtAbsoluteWeek, detectedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
            resolvedAtAbsoluteWeek: stage === 'RESOLVED'
                ? Math.max(detectedAtAbsoluteWeek, Math.round(clamp(item.resolvedAtAbsoluteWeek, detectedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, detectedAtAbsoluteWeek)))
                : null,
            assistedHandled: Boolean(item.assistedHandled),
            publicReaction: cleanText(item.publicReaction, 'The public is monitoring recovery.', 240),
            subscriberReaction: cleanText(item.subscriberReaction, 'Affected subscribers expect stable service.', 240),
            outcomeNote: item.outcomeNote === null || item.outcomeNote === undefined ? null : cleanText(item.outcomeNote, '', 320),
        } satisfies OwnedStreamingInfrastructureIncident;
    }).filter((item): item is OwnedStreamingInfrastructureIncident => Boolean(item)).slice(-OWNED_STREAMING_INFRASTRUCTURE_INCIDENT_LIMIT);

    const progressionTiers = ['RENTED_CABINET', 'PRIVATE_CAGE', 'DEDICATED_HALL', 'OWNED_DATA_CENTRE', 'GLOBAL_HYPERSCALE_CAMPUS'] as const;
    const infrastructurePerformanceHistory = asArray<unknown>(operationsSource.performanceHistory).map(value => {
        const item = asRecord(value);
        const absoluteWeek = Math.max(0, Math.round(clamp(item.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
        return {
            absoluteWeek,
            tier: isOneOf(item.tier, progressionTiers, 'RENTED_CABINET'),
            facilityCount: Math.round(clamp(item.facilityCount, 0, 1_000)),
            installedRacks: Math.round(clamp(item.installedRacks, 0, 100_000)),
            averageConditionPercent: clamp(item.averageConditionPercent, 0, 100, 100),
            reliabilityPercent: clamp(item.reliabilityPercent, 0, 100, 99),
            playbackSuccessRate: clamp(item.playbackSuccessRate, 0, 100, 99),
            capacityUtilizationPercent: clamp(item.capacityUtilizationPercent, 0, 1_000),
            energyKwhWeekly: Math.round(clamp(item.energyKwhWeekly, 0, Number.MAX_SAFE_INTEGER)),
            waterLitresWeekly: Math.round(clamp(item.waterLitresWeekly, 0, Number.MAX_SAFE_INTEGER)),
            weeklyOperatingCost: Math.round(clamp(item.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
            activeIncidentCount: Math.round(clamp(item.activeIncidentCount, 0, 100)),
        } satisfies OwnedStreamingInfrastructurePerformancePoint;
    }).slice(-OWNED_STREAMING_INFRASTRUCTURE_PERFORMANCE_LIMIT);
    const infrastructureAwards = asArray<unknown>(operationsSource.awards).map(value => {
        const item = asRecord(value);
        const idempotencyKey = cleanText(item.idempotencyKey, '', 180);
        const factId = cleanText(item.factId, '', 120);
        if (!idempotencyKey || !factId) return null;
        return {
            id: cleanText(item.id, createDeterministicId('streaming_infrastructure_award', idempotencyKey), 120),
            idempotencyKey,
            category: isOneOf(item.category, ['RELIABILITY_LEADERSHIP', 'RECOVERY_EXCELLENCE', 'SUSTAINABLE_SCALE', 'GLOBAL_BACKBONE'] as const, 'RELIABILITY_LEADERSHIP'),
            title: cleanText(item.title, 'Infrastructure distinction', 120),
            evidence: cleanText(item.evidence, 'Verified operating evidence.', 300),
            score: clamp(item.score, 0, 100),
            awardedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.awardedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            factId,
        } satisfies OwnedStreamingInfrastructureAward;
    }).filter((item): item is OwnedStreamingInfrastructureAward => Boolean(item)).slice(-OWNED_STREAMING_INFRASTRUCTURE_AWARD_LIMIT);

    return {
        publicTrust: clamp(source.publicTrust, 0, 100, 72),
        regulatoryScrutiny: clamp(source.regulatoryScrutiny, 0, 100),
        employeeLoyalty: clamp(source.employeeLoyalty, 0, 100, 75),
        evidenceTrail: clamp(source.evidenceTrail, 0, 100),
        securityPressure: clamp(source.securityPressure, 0, 100, 15),
        lastEvaluatedAbsoluteWeek: source.lastEvaluatedAbsoluteWeek === null || source.lastEvaluatedAbsoluteWeek === undefined
            ? null
            : Math.max(0, Math.round(clamp(source.lastEvaluatedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        crises,
        shadowOperations,
        trustInitiatives,
        regulatoryCases,
        whistleblowerReports,
        infrastructureOperations: {
            maintenanceCadence: isOneOf(operationsSource.maintenanceCadence, ['REACTIVE', 'BALANCED', 'PREVENTIVE'] as const, 'BALANCED'),
            insuranceTier: isOneOf(operationsSource.insuranceTier, ['NONE', 'STANDARD', 'PREMIUM'] as const, 'NONE'),
            lastProcessedAbsoluteWeek: operationsSource.lastProcessedAbsoluteWeek === null || operationsSource.lastProcessedAbsoluteWeek === undefined
                ? null
                : Math.max(0, Math.round(clamp(operationsSource.lastProcessedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            incidents: infrastructureIncidents,
            totalMaintenanceSpend: Math.round(clamp(operationsSource.totalMaintenanceSpend, 0, Number.MAX_SAFE_INTEGER)),
            totalCompensationPaid: Math.round(clamp(operationsSource.totalCompensationPaid, 0, Number.MAX_SAFE_INTEGER)),
            totalInsuranceRecovered: Math.round(clamp(operationsSource.totalInsuranceRecovered, 0, Number.MAX_SAFE_INTEGER)),
            assistedResponseCount: Math.round(clamp(operationsSource.assistedResponseCount, 0, Number.MAX_SAFE_INTEGER)),
            reliabilityStreakWeeks: Math.round(clamp(operationsSource.reliabilityStreakWeeks, 0, Number.MAX_SAFE_INTEGER)),
            lastProgressionTier: isOneOf(operationsSource.lastProgressionTier, progressionTiers, 'RENTED_CABINET'),
            performanceHistory: infrastructurePerformanceHistory,
            awards: infrastructureAwards,
            orchestratedFactIds: uniqueStrings(operationsSource.orchestratedFactIds, OWNED_STREAMING_INFRASTRUCTURE_CINEMATIC_FACT_LIMIT),
        },
    };
};

const normalizeSuccessionPlan = (value: unknown): OwnedStreamingSuccessionPlan | null => {
    const source = asRecord(value);
    const candidateId = cleanText(source.candidateId, '', 140);
    const candidateName = cleanText(source.candidateName, '', 120);
    if (!candidateId || !candidateName) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_succession', candidateId), 120),
        candidateType: isOneOf(source.candidateType, ['EXECUTIVE', 'FAMILY_HEIR'] as const, 'EXECUTIVE'),
        candidateId,
        candidateName,
        readinessScore: Math.round(clamp(source.readinessScore, 0, 100, 50)),
        selectedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.selectedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        mandate: isOneOf(source.mandate, ERA_MANDATES, 'BALANCED'),
        status: isOneOf(source.status, ['DESIGNATED', 'TRANSITIONED'] as const, 'DESIGNATED'),
    };
};

const normalizeCompanyEra = (value: unknown): OwnedStreamingCompanyEra | null => {
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    if (!id) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    return {
        id,
        eraNumber: Math.max(1, Math.round(clamp(source.eraNumber, 1, 10_000, 1))),
        title: cleanText(source.title, 'Company era', 120),
        leaderName: cleanText(source.leaderName, 'Platform leadership', 120),
        leaderType: isOneOf(source.leaderType, ['FOUNDER', 'EXECUTIVE', 'FAMILY_HEIR'] as const, 'FOUNDER'),
        mandate: isOneOf(source.mandate, ERA_MANDATES, 'BALANCED'),
        legacyIdentity: isOneOf(source.legacyIdentity, LEGACY_IDENTITIES, 'BALANCED_EMPIRE'),
        startedAtAbsoluteWeek,
        endedAtAbsoluteWeek: Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.endedAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
        closingReason: isOneOf(source.closingReason, ['FOUNDER_TRANSITION', 'GENERATION_HANDOFF', 'NEW_MANDATE'] as const, 'NEW_MANDATE'),
        subscriberStart: Math.round(clamp(source.subscriberStart, 0, Number.MAX_SAFE_INTEGER)),
        subscriberEnd: Math.round(clamp(source.subscriberEnd, 0, Number.MAX_SAFE_INTEGER)),
        treasuryEnd: Math.round(clamp(source.treasuryEnd, 0, Number.MAX_SAFE_INTEGER)),
        globalPrestigeEnd: clamp(source.globalPrestigeEnd, 0, 100),
        publicTrustEnd: clamp(source.publicTrustEnd, 0, 100),
        highlightFactIds: uniqueStrings(source.highlightFactIds, 12),
    };
};

const normalizeLegacyMontage = (value: unknown): OwnedStreamingLegacyMontage | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const chapters = asArray<unknown>(source.chapters).map(value => {
        const item = asRecord(value);
        const factId = cleanText(item.factId, '', 120);
        if (!factId) return null;
        return {
            id: cleanText(item.id, createDeterministicId('streaming_legacy_chapter', factId), 120),
            title: cleanText(item.title, 'A defining moment', 120),
            caption: cleanText(item.caption, 'The company changed direction.', 280),
            absoluteWeek: Math.max(0, Math.round(clamp(item.absoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            factId,
        };
    }).filter((item): item is OwnedStreamingLegacyMontage['chapters'][number] => Boolean(item)).slice(0, 12);
    if (!chapters.length) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_legacy_montage', idempotencyKey), 120),
        idempotencyKey,
        eraNumber: Math.max(1, Math.round(clamp(source.eraNumber, 1, 10_000, 1))),
        createdAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        identity: isOneOf(source.identity, LEGACY_IDENTITIES, 'BALANCED_EMPIRE'),
        title: cleanText(source.title, 'The Signal We Built', 140),
        chapters,
    };
};

const normalizeLegacyState = (
    value: unknown,
    foundedAtAbsoluteWeek: number,
): OwnedStreamingLegacyState => {
    const source = asRecord(value);
    return {
        founderOfficeRole: isOneOf(source.founderOfficeRole, FOUNDER_OFFICE_ROLES, 'FOUNDER_CEO'),
        currentEraNumber: Math.max(1, Math.round(clamp(source.currentEraNumber, 1, 10_000, 1))),
        currentEraStartedAtAbsoluteWeek: Math.max(0, Math.round(clamp(
            source.currentEraStartedAtAbsoluteWeek,
            0,
            Number.MAX_SAFE_INTEGER,
            foundedAtAbsoluteWeek,
        ))),
        currentMandate: isOneOf(source.currentMandate, ERA_MANDATES, 'BALANCED'),
        successionPlan: normalizeSuccessionPlan(source.successionPlan),
        closedEras: dedupeByKey(
            asArray<unknown>(source.closedEras)
                .map(normalizeCompanyEra)
                .filter((item): item is OwnedStreamingCompanyEra => Boolean(item)),
            item => item.id,
        ).sort((a, b) => a.eraNumber - b.eraNumber).slice(-OWNED_STREAMING_CLOSED_ERA_LIMIT),
        montages: dedupeByKey(
            asArray<unknown>(source.montages)
                .map(normalizeLegacyMontage)
                .filter((item): item is OwnedStreamingLegacyMontage => Boolean(item)),
            item => item.idempotencyKey,
        ).slice(-OWNED_STREAMING_LEGACY_MONTAGE_LIMIT),
        endlessMode: Boolean(source.endlessMode),
        transitionCount: Math.max(0, Math.round(clamp(source.transitionCount, 0, 10_000))),
    };
};

const normalizePublicCompany = (value: unknown): OwnedStreamingPublicCompanyState => {
    const source = asRecord(value);
    const planSource = asRecord(source.ipoPlan);
    const journeySource = asRecord(source.ipoJourney);
    const listingSource = asRecord(source.listing);
    const ipoPlan = cleanText(planSource.ticker, '', 8) ? {
        ticker: cleanText(planSource.ticker, 'STRM', 8).toUpperCase(),
        venueName: cleanText(planSource.venueName, 'Empire Exchange', 80),
        narrative: isOneOf(planSource.narrative, ['AUDIENCE_SCALE', 'PROFITABLE_GROWTH', 'TECHNOLOGY_NETWORK', 'GLOBAL_ORIGINALS'] as const, 'AUDIENCE_SCALE'),
        offerPercent: clamp(planSource.offerPercent, 5, 40, 20),
        targetCapital: Math.round(clamp(planSource.targetCapital, 0, Number.MAX_SAFE_INTEGER)),
        lowPrice: clamp(planSource.lowPrice, 0.01, 1_000_000, 10),
        highPrice: clamp(planSource.highPrice, 0.01, 1_000_000, 14),
        institutionalDemandScore: clamp(planSource.institutionalDemandScore, 0, 100),
        retailDemandScore: clamp(planSource.retailDemandScore, 0, 100),
        roadshowStops: uniqueStrings(planSource.roadshowStops, 8),
        startedAtAbsoluteWeek: Math.max(0, Math.round(clamp(planSource.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    } : null;
    const listing = cleanText(listingSource.ticker, '', 8) ? {
        listedAtAbsoluteWeek: Math.max(0, Math.round(clamp(listingSource.listedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        ticker: cleanText(listingSource.ticker, 'STRM', 8).toUpperCase(),
        venueName: cleanText(listingSource.venueName, 'Empire Exchange', 80),
        offerPercent: clamp(listingSource.offerPercent, 0, 100),
        sharesOutstanding: Math.max(1, Math.round(clamp(listingSource.sharesOutstanding, 1, Number.MAX_SAFE_INTEGER, 100_000_000))),
        publicShares: Math.max(0, Math.round(clamp(listingSource.publicShares, 0, Number.MAX_SAFE_INTEGER))),
        offerPrice: clamp(listingSource.offerPrice, 0.01, 1_000_000, 10),
        capitalRaised: Math.round(clamp(listingSource.capitalRaised, 0, Number.MAX_SAFE_INTEGER)),
        founderOwnershipBefore: clamp(listingSource.founderOwnershipBefore, 0, 100),
        founderOwnershipAfter: clamp(listingSource.founderOwnershipAfter, 0, 100),
        preIpoShares: Math.max(1, Math.round(clamp(
            listingSource.preIpoShares,
            1,
            Number.MAX_SAFE_INTEGER,
            Math.max(1, Math.round(clamp(listingSource.sharesOutstanding, 1, Number.MAX_SAFE_INTEGER, 100_000_000)) - Math.round(clamp(listingSource.publicShares, 0, Number.MAX_SAFE_INTEGER))),
        ))),
        newShares: Math.max(0, Math.round(clamp(listingSource.newShares, 0, Number.MAX_SAFE_INTEGER, Math.round(clamp(listingSource.publicShares, 0, Number.MAX_SAFE_INTEGER))))),
        employeeQuotaPercent: clamp(listingSource.employeeQuotaPercent, 0, 8),
        underwriterId: cleanText(listingSource.underwriterId, 'legacy', 32),
        underwriterName: cleanText(listingSource.underwriterName, 'Legacy underwriting syndicate', 120),
        firmBook: listingSource.firmBook === undefined ? true : Boolean(listingSource.firmBook),
        bookCoverage: clamp(listingSource.bookCoverage, 0, 20, 1),
        anchorDiscountAccepted: Boolean(listingSource.anchorDiscountAccepted),
        governanceMarks: uniqueStrings(listingSource.governanceMarks, 8),
        diligenceWeeks: Math.max(0, Math.round(clamp(listingSource.diligenceWeeks, 0, 52))),
        regulatorAttempts: Math.max(1, Math.round(clamp(listingSource.regulatorAttempts, 1, 20, 1))),
    } : null;
    const journeyId = cleanText(journeySource.id, '', 160);
    const journey = journeyId ? {
        id: journeyId,
        idempotencyKey: cleanText(journeySource.idempotencyKey, journeyId, 180),
        status: isOneOf(journeySource.status, ['ACTIVE', 'COMPLETED'] as const, 'ACTIVE'),
        startedAtAbsoluteWeek: Math.max(0, Math.round(clamp(journeySource.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(journeySource.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        lastProcessedAbsoluteWeek: Math.max(0, Math.round(clamp(journeySource.lastProcessedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        scene: cleanText(journeySource.scene, 'RESOLUTION', 40),
        ask: Math.round(clamp(journeySource.ask, 1, Number.MAX_SAFE_INTEGER, 180_000_000)),
        shares: Math.round(clamp(journeySource.shares, 250_000, 40_000_000, 5_000_000)),
        revision: Math.round(clamp(journeySource.revision, 1, 100, 1)),
        bankId: cleanText(journeySource.bankId, '', 40) || null,
        marks: asArray<unknown>(journeySource.marks).map(value => {
            const mark = asRecord(value);
            return {
                id: cleanText(mark.id, '', 40),
                label: cleanText(mark.label, '', 360),
                short: cleanText(mark.short, '', 120),
                bookCost: clamp(mark.bookCost, 0, 1),
            };
        }).filter(mark => mark.id).slice(0, 8),
        omit: Object.fromEntries(Object.entries(asRecord(journeySource.omit)).map(([key, entry]) => [key, Boolean(entry)])),
        answers: Object.fromEntries(Object.entries(asRecord(journeySource.answers)).flatMap(([key, entry]) => (
            ['FULL', 'BRIEF', 'RESTATE'].includes(String(entry)) ? [[key, entry as 'FULL' | 'BRIEF' | 'RESTATE']] : []
        ))),
        attempt: Math.round(clamp(journeySource.attempt, 1, 20, 1)),
        diligenceWeeks: Math.round(clamp(journeySource.diligenceWeeks, 0, 52)),
        cut: clamp(journeySource.cut, 0, .9),
        lowPrice: clamp(journeySource.lowPrice, 0, 1_000_000),
        highPrice: clamp(journeySource.highPrice, 0, 1_000_000),
        anchorDiscountAccepted: journeySource.anchorDiscountAccepted == null ? null : Boolean(journeySource.anchorDiscountAccepted),
        employeeQuotaPercent: clamp(journeySource.employeeQuotaPercent, 0, 8, 2),
        interviewMove: clamp(journeySource.interviewMove, -1, 1),
        book: Number(asRecord(journeySource.book).price) > 0 ? {
            cover: clamp(asRecord(journeySource.book).cover, 0, 20),
            buckets: asArray<number>(asRecord(journeySource.book).buckets).map(value => clamp(value, 0, 100)).slice(0, 12),
            price: clamp(asRecord(journeySource.book).price, 0.01, 1_000_000),
            extended: Boolean(asRecord(journeySource.book).extended),
        } : null,
        closePrice: clamp(journeySource.closePrice, 0, 1_000_000),
        ticker: cleanText(journeySource.ticker, 'STRM', 8).toUpperCase(),
    } : null;
    return {
        lifecycle: isOneOf(source.lifecycle, ['PRIVATE', 'IPO_PREPARATION', 'ROADSHOW', 'PUBLIC'] as const, listing ? 'PUBLIC' : 'PRIVATE'),
        ipoPlan,
        ipoJourney: journey,
        listing,
        quoteHistory: asArray<unknown>(source.quoteHistory).map(value => {
            const item = asRecord(value);
            const close = clamp(item.close, 0.01, 1_000_000, listing?.offerPrice || 10);
            return {
                id: cleanText(item.id, `quote-${Math.round(clamp(item.absoluteWeek, 0, Number.MAX_SAFE_INTEGER))}`, 120),
                absoluteWeek: Math.max(0, Math.round(clamp(item.absoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                open: clamp(item.open, 0.01, 1_000_000, close),
                high: clamp(item.high, close, 1_000_000, close),
                low: clamp(item.low, 0.01, close, close),
                close,
                volume: Math.round(clamp(item.volume, 0, Number.MAX_SAFE_INTEGER)),
                marketCap: Math.round(clamp(item.marketCap, 0, Number.MAX_SAFE_INTEGER)),
                changePercent: clamp(item.changePercent, -40, 40),
                drivers: uniqueStrings(item.drivers, 6),
            };
        }).filter(item => item.id).sort((a, b) => a.absoluteWeek - b.absoluteWeek).slice(-104),
        guidance: asArray<unknown>(source.guidance).map(value => {
            const item = asRecord(value);
            return {
                id: cleanText(item.id, '', 120),
                cycleNumber: Math.max(1, Math.round(clamp(item.cycleNumber, 1, 10_000, 1))),
                tone: isOneOf(item.tone, ['CONSERVATIVE', 'BALANCED', 'AMBITIOUS'] as const, 'BALANCED'),
                issuedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.issuedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                subscriberTarget: Math.round(clamp(item.subscriberTarget, 0, Number.MAX_SAFE_INTEGER)),
                revenueTarget: Math.round(clamp(item.revenueTarget, 0, Number.MAX_SAFE_INTEGER)),
                cashContributionTarget: Math.round(clamp(item.cashContributionTarget, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
                playbackTarget: clamp(item.playbackTarget, 0, 100),
                status: isOneOf(item.status, ['ACTIVE', 'RESOLVED'] as const, 'ACTIVE'),
            };
        }).filter(item => item.id).slice(-24),
        earnings: asArray<unknown>(source.earnings).map(value => {
            const item = asRecord(value);
            return {
                id: cleanText(item.id, '', 120),
                cycleNumber: Math.max(1, Math.round(clamp(item.cycleNumber, 1, 10_000, 1))),
                reportedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.reportedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                guidanceId: cleanText(item.guidanceId, '', 120) || null,
                outcome: isOneOf(item.outcome, ['BEAT', 'MIXED', 'MISS'] as const, 'MIXED'),
                score: clamp(item.score, 0, 100),
                subscriberActual: Math.round(clamp(item.subscriberActual, 0, Number.MAX_SAFE_INTEGER)),
                revenueActual: Math.round(clamp(item.revenueActual, 0, Number.MAX_SAFE_INTEGER)),
                cashContributionActual: Math.round(clamp(item.cashContributionActual, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
                playbackActual: clamp(item.playbackActual, 0, 100),
                stockReactionPercent: clamp(item.stockReactionPercent, -40, 40),
                headline: cleanText(item.headline, 'Quarter reported.', 220),
            };
        }).filter(item => item.id).slice(-24),
        shareholderVotes: asArray<unknown>(source.shareholderVotes).map(value => {
            const item = asRecord(value);
            return {
                id: cleanText(item.id, '', 120),
                cycleNumber: Math.max(1, Math.round(clamp(item.cycleNumber, 1, 10_000, 1))),
                type: isOneOf(item.type, ['DIRECTOR_MANDATE', 'EXECUTIVE_PAY', 'CAPITAL_AUTHORITY', 'STRATEGIC_REVIEW'] as const, 'DIRECTOR_MANDATE'),
                title: cleanText(item.title, 'Shareholder resolution', 120),
                summary: cleanText(item.summary, '', 260),
                status: isOneOf(item.status, ['OPEN', 'APPROVED', 'REJECTED'] as const, 'OPEN'),
                createdAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                dueAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.dueAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                institutionalSupport: clamp(item.institutionalSupport, 0, 100),
                founderVote: item.founderVote === 'FOR' || item.founderVote === 'AGAINST' ? item.founderVote : null,
                finalSupport: item.finalSupport === null || item.finalSupport === undefined ? null : clamp(item.finalSupport, 0, 100),
                consequence: cleanText(item.consequence, '', 260) || null,
            };
        }).filter(item => item.id).slice(-32),
        activistCampaigns: asArray<unknown>(source.activistCampaigns).map(value => {
            const item = asRecord(value);
            return {
                id: cleanText(item.id, '', 120),
                investorName: cleanText(item.investorName, 'Northstar Capital', 120),
                ownershipPercent: clamp(item.ownershipPercent, 0, 30),
                demand: isOneOf(item.demand, ['MARGIN_DISCIPLINE', 'SLATE_REFRESH', 'BOARD_SEAT', 'ASSET_REVIEW'] as const, 'MARGIN_DISCIPLINE'),
                status: isOneOf(item.status, ['ACTIVE', 'NEGOTIATED', 'DEFEATED', 'ACCEPTED'] as const, 'ACTIVE'),
                pressure: clamp(item.pressure, 0, 100),
                openedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                resolvedAtAbsoluteWeek: item.resolvedAtAbsoluteWeek === null || item.resolvedAtAbsoluteWeek === undefined ? null : Math.max(0, Math.round(clamp(item.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                response: item.response === 'ENGAGE' || item.response === 'REFUSE' || item.response === 'ACCEPT' ? item.response : null,
                consequence: cleanText(item.consequence, '', 260) || null,
            };
        }).filter(item => item.id).slice(-16),
        hostileTakeovers: asArray<unknown>(source.hostileTakeovers).map(value => {
            const item = asRecord(value);
            return {
                id: cleanText(item.id, '', 120),
                bidderPlatformId: PLATFORM_IDS.includes(item.bidderPlatformId as PlatformId) ? item.bidderPlatformId as PlatformId : PLATFORM_IDS[0],
                bidderName: cleanText(item.bidderName, 'Rival platform', 120),
                offerPrice: clamp(item.offerPrice, 0.01, 1_000_000, listing?.offerPrice || 10),
                premiumPercent: clamp(item.premiumPercent, 0, 100),
                bidderSupportPercent: clamp(item.bidderSupportPercent, 0, 100),
                status: isOneOf(item.status, ['ACTIVE', 'DEFENDED', 'SETTLED', 'BIDDER_WITHDREW'] as const, 'ACTIVE'),
                openedAtAbsoluteWeek: Math.max(0, Math.round(clamp(item.openedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                resolvedAtAbsoluteWeek: item.resolvedAtAbsoluteWeek === null || item.resolvedAtAbsoluteWeek === undefined ? null : Math.max(0, Math.round(clamp(item.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                defence: item.defence === 'INDEPENDENCE_CAMPAIGN'
                    || item.defence === 'WHITE_KNIGHT'
                    || item.defence === 'RIGHTS_PLAN'
                    || item.defence === 'NEGOTIATE'
                    ? item.defence
                    : null,
                consequence: cleanText(item.consequence, '', 260) || null,
            };
        }).filter(item => item.id).slice(-12),
    };
};

const normalizeHqOnboarding = (value: unknown): OwnedStreamingHqOnboardingState => {
    const source = asRecord(value);
    const startedAt = source.startedAtAbsoluteWeek;
    const completedAt = source.completedAtAbsoluteWeek;
    return {
        status: isOneOf(source.status, HQ_TOUR_STATUSES, 'NOT_STARTED'),
        currentStep: Math.round(clamp(source.currentStep, 0, HQ_SECTIONS.length - 1)),
        visitedSections: Array.from(new Set(
            asArray<unknown>(source.visitedSections)
                .filter((section): section is StreamingHqSection => HQ_SECTIONS.includes(section as StreamingHqSection)),
        )),
        startedAtAbsoluteWeek: startedAt === null || startedAt === undefined
            ? null
            : Math.max(0, Math.round(clamp(startedAt, 0, Number.MAX_SAFE_INTEGER))),
        completedAtAbsoluteWeek: completedAt === null || completedAt === undefined
            ? null
            : Math.max(0, Math.round(clamp(completedAt, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeSubscriptionPrices = (
    value: unknown,
): Record<StreamingSubscriptionTierId, number> => {
    const source = asRecord(value);
    const defaults = createInitialOwnedStreamingPlatformState().subscriptionPrices;
    return Object.fromEntries(SUBSCRIPTION_TIER_IDS.map(tier => [
        tier,
        Math.round(clamp(source[tier], 0, 1_000, defaults[tier]) * 100) / 100,
    ])) as Record<StreamingSubscriptionTierId, number>;
};

const NETWORK_NODE_ROLES = ['CORE_ORIGIN', 'REGIONAL_HUB', 'EDGE_CACHE'] as const;
const normalizeNetworkPlacements = (value: unknown): OwnedStreamingNetworkPlacement[] => {
    const seenCities = new Set<string>();
    let hasCore = false;
    const placements = asArray<unknown>(value).map((item, index) => {
        const source = asRecord(item);
        const cityId = cleanText(source.cityId, '', 24).toUpperCase();
        if (!cityId || seenCities.has(cityId)) return null;
        seenCities.add(cityId);
        let role = isOneOf(source.role, NETWORK_NODE_ROLES, index === 0 ? 'CORE_ORIGIN' : 'EDGE_CACHE');
        if (role === 'CORE_ORIGIN') {
            if (hasCore) role = 'REGIONAL_HUB';
            hasCore = true;
        }
        return {
            cityId,
            racks: Math.max(1, Math.round(clamp(source.racks, 1, 96, 1))),
            role,
        } as OwnedStreamingNetworkPlacement;
    }).filter((item): item is OwnedStreamingNetworkPlacement => Boolean(item)).slice(0, 29);
    if (placements.length && !placements.some(item => item.role === 'CORE_ORIGIN')) {
        placements[0] = { ...placements[0], role: 'CORE_ORIGIN' };
    }
    return placements;
};

const STREAMING_FACILITY_TYPES = STREAMING_FACILITY_CONTRACTS.map(contract => contract.type);
const normalizeStreamingFacilities = (
    value: unknown,
    legacyPlacements: OwnedStreamingNetworkPlacement[],
): OwnedStreamingFacility[] => {
    const seen = new Set<string>();
    const facilities = asArray<unknown>(value).flatMap((item, index) => {
        const source = asRecord(item);
        const cityId = cleanText(source.cityId, '', 24).toUpperCase();
        const id = cleanText(source.id, cityId ? `FACILITY-${cityId}-${String(index + 1).padStart(2, '0')}` : '', 120);
        if (!id || !cityId || seen.has(id)) return [];
        seen.add(id);
        const type = isOneOf(source.type, STREAMING_FACILITY_TYPES, 'RENTED_CABINET');
        const contract = getStreamingFacilityContract(type);
        const lease = normalizeStreamingFacilityLease(source.lease, type);
        const installedRacks = Math.max(1, Math.round(clamp(
            source.installedRacks,
            1,
            lease?.rackPositions || contract.capacityRacks,
            1,
        )));
        const legacyRole = normalizeStreamingFacilityRole(source.role, index === 0 ? 'CORE_ORIGIN' : 'EDGE_CACHE');
        const rackGroups = normalizeStreamingRackGroups(source.rackGroups, id, installedRacks, legacyRole);
        return [{
            id,
            cityId,
            type,
            installedRacks,
            role: projectFacilityNetworkRole(rackGroups),
            rackGroups,
            lease,
            physical: normalizeStreamingFacilityPhysical(source.physical, type, installedRacks, lease),
        } satisfies OwnedStreamingFacility];
    }).slice(0, 48);
    const migrated = facilities.length ? facilities : migratePlacementsToStreamingFacilities(legacyPlacements);
    if (migrated.length && !migrated.some(facility => facility.role === 'CORE_ORIGIN')) {
        migrated[0] = { ...migrated[0], role: 'CORE_ORIGIN' };
    }
    return migrated;
};

const normalizeLaunchRehearsalSnapshot = (
    value: unknown,
): OwnedStreamingLaunchRehearsalSnapshot | undefined => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const source = asRecord(value);
    const configurationSignature = cleanText(source.configurationSignature, '', 640);
    if (!configurationSignature) return undefined;
    return {
        configurationSignature,
        scenario: isOneOf(source.scenario, ['QUIET', 'LIKELY', 'SURGE'] as const, 'LIKELY'),
        verdict: isOneOf(source.verdict, ['HELD', 'BURST', 'BROKE'] as const, 'BROKE'),
        peakConcurrentStreams: Math.round(clamp(source.peakConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        steadyCapacity: Math.round(clamp(source.steadyCapacity, 0, Number.MAX_SAFE_INTEGER)),
        burstCapacity: Math.round(clamp(source.burstCapacity, 0, Number.MAX_SAFE_INTEGER)),
        peakLoadPercent: Math.round(clamp(source.peakLoadPercent, 0, 10_000)),
        spareCapacityPercent: Math.round(clamp(source.spareCapacityPercent, -100, 10_000)),
        failedPercent: Math.round(clamp(source.failedPercent, 0, 100)),
        estimatedDowntimeMinutes: Math.round(clamp(source.estimatedDowntimeMinutes, 0, 100_000)),
        catalogueAvailabilityPercent: Math.round(clamp(source.catalogueAvailabilityPercent, 0, 100)),
        regionalSinglePointFailures: uniqueStrings(source.regionalSinglePointFailures, 12),
        warningSummary: cleanText(source.warningSummary, 'Rehearsal evidence recorded.', 360),
        countries: asArray<unknown>(source.countries).flatMap(item => {
            const country = asRecord(item);
            const marketId = cleanText(country.marketId, '', 24);
            if (!marketId) return [];
            const startupValue = Number(country.startupTimeMs);
            return [{
                marketId,
                country: cleanText(country.country, marketId, 80),
                demand: Math.round(clamp(country.demand, 0, Number.MAX_SAFE_INTEGER)),
                startupTimeMs: Number.isFinite(startupValue) ? Math.round(clamp(startupValue, 0, 100_000)) : null,
                bufferingRiskPercent: Math.round(clamp(country.bufferingRiskPercent, 0, 100)),
                catalogueAvailabilityPercent: Math.round(clamp(country.catalogueAvailabilityPercent, 0, 100)),
                outageResistance: isOneOf(country.outageResistance, ['REDUNDANT', 'EXPOSED', 'SINGLE_POINT', 'UNSERVED'] as const, 'UNSERVED'),
                verdict: isOneOf(country.verdict, ['HELD', 'BURST', 'BROKE'] as const, 'BROKE'),
                failedPercent: Math.round(clamp(country.failedPercent, 0, 100)),
                viewerConsequence: cleanText(country.viewerConsequence, 'Viewer consequence unavailable.', 300),
            }];
        }).slice(0, 40),
        facilities: asArray<unknown>(source.facilities).flatMap(item => {
            const facility = asRecord(item);
            const facilityId = cleanText(facility.facilityId, '', 120);
            const cityId = cleanText(facility.cityId, '', 24);
            if (!facilityId || !cityId) return [];
            return [{
                facilityId,
                cityId,
                demand: Math.round(clamp(facility.demand, 0, Number.MAX_SAFE_INTEGER)),
                loadPercent: Math.round(clamp(facility.loadPercent, 0, 10_000)),
                state: isOneOf(facility.state, ['CLEAR', 'STRESSED', 'BURSTING', 'FAILED'] as const, 'STRESSED'),
                verdict: isOneOf(facility.verdict, ['HELD', 'BURST', 'BROKE'] as const, 'BROKE'),
                failedPercent: Math.round(clamp(facility.failedPercent, 0, 100)),
                limitingFactor: cleanText(facility.limitingFactor, 'NONE', 40),
            }];
        }).slice(0, 48),
        completedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.completedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeInfrastructureSetupDraft = (
    value: unknown,
): OwnedStreamingInfrastructureSetupDraft | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const openingDemandSource = asRecord(source.openingDemandForecast);
    const networkPlacements = normalizeNetworkPlacements(source.networkPlacements);
    const facilities = normalizeStreamingFacilities(source.facilities, networkPlacements);
    const openingDemandForecast = Object.keys(openingDemandSource).length > 0
        ? {
            low: Math.round(clamp(openingDemandSource.low, 0, Number.MAX_SAFE_INTEGER)),
            likely: Math.round(clamp(openingDemandSource.likely, 0, Number.MAX_SAFE_INTEGER)),
            high: Math.round(clamp(openingDemandSource.high, 0, Number.MAX_SAFE_INTEGER)),
        }
        : undefined;
    return {
        currentStep: Math.round(clamp(source.currentStep, 0, 4)),
        strategy: isOneOf(
            source.strategy,
            ['CLOUD_FIRST', 'OWNED_INFRASTRUCTURE', 'HYBRID'] as const,
            'HYBRID',
        ),
        capacityPackageId: isOneOf(source.capacityPackageId, CAPACITY_PACKAGE_IDS, 'GROWTH'),
        rolloutPace: isOneOf(source.rolloutPace, INFRASTRUCTURE_ROLLOUT_PACES, 'STANDARD'),
        subscriptionPrices: normalizeSubscriptionPrices(source.subscriptionPrices),
        networkPlacements: facilities.length ? aggregateStreamingFacilities(facilities) : networkPlacements,
        facilities,
        managementPolicy: normalizeStreamingInfrastructureManagementPolicy(source.managementPolicy),
        openingDemandForecast,
        lastLoadTestSignature: source.lastLoadTestSignature === null || source.lastLoadTestSignature === undefined
            ? null
            : cleanText(source.lastLoadTestSignature, '', 640) || null,
        lastLaunchRehearsal: normalizeLaunchRehearsalSnapshot(source.lastLaunchRehearsal),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeLoadTestSnapshot = (value: unknown): OwnedStreamingLoadTestSnapshot | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const configurationSignature = cleanText(source.configurationSignature, '', 640);
    if (!configurationSignature) return null;
    return {
        configurationSignature,
        forecastLowConcurrentStreams: Math.round(clamp(source.forecastLowConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        forecastLikelyConcurrentStreams: Math.round(clamp(source.forecastLikelyConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        forecastHighConcurrentStreams: Math.round(clamp(source.forecastHighConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        testedBurstCapacity: Math.round(clamp(source.testedBurstCapacity, 0, Number.MAX_SAFE_INTEGER)),
        headroomPercent: Math.round(clamp(source.headroomPercent, -100, 10_000, 0) * 10) / 10,
        status: isOneOf(source.status, LOAD_TEST_STATUSES, 'CONDITIONAL'),
        driverKeys: uniqueStrings(source.driverKeys, 12),
        launchRehearsal: normalizeLaunchRehearsalSnapshot(source.launchRehearsal),
        completedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.completedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeInfrastructureSetup = (
    value: unknown,
): OwnedStreamingInfrastructureSetup | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const loadTest = normalizeLoadTestSnapshot(source.loadTest);
    if (!loadTest) return null;
    const networkPlacements = normalizeNetworkPlacements(source.networkPlacements);
    const facilities = normalizeStreamingFacilities(source.facilities, networkPlacements);
    const physicalSource = asRecord(source.physicalSummary);
    const physicalSummary: OwnedStreamingInfrastructurePhysicalSummary | undefined = Object.keys(physicalSource).length
        ? {
            energyKwhWeekly: Math.round(clamp(physicalSource.energyKwhWeekly, 0, Number.MAX_SAFE_INTEGER)),
            waterLitresWeekly: Math.round(clamp(physicalSource.waterLitresWeekly, 0, Number.MAX_SAFE_INTEGER)),
            physicalWeeklyOperatingCost: Math.round(clamp(physicalSource.physicalWeeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
            sustainabilityScore: Math.round(clamp(physicalSource.sustainabilityScore, 0, 100, 100)),
            publicReputation: Math.round(clamp(physicalSource.publicReputation, 0, 100, 100)),
            reliabilityPercent: Math.round(clamp(physicalSource.reliabilityPercent, 90, 99.999, 99.5) * 1_000) / 1_000,
            backupCoveragePercent: Math.round(clamp(physicalSource.backupCoveragePercent, 0, 100) * 10) / 10,
            limitingFactors: uniqueStrings(physicalSource.limitingFactors, 24),
        }
        : undefined;
    return {
        capacityPackageId: isOneOf(source.capacityPackageId, CAPACITY_PACKAGE_IDS, 'GROWTH'),
        rolloutPace: isOneOf(source.rolloutPace, INFRASTRUCTURE_ROLLOUT_PACES, 'STANDARD'),
        storageCapacityHours: Math.round(clamp(source.storageCapacityHours, 0, Number.MAX_SAFE_INTEGER)),
        reliabilityTarget: Math.round(clamp(source.reliabilityTarget, 0, 100, 99.5) * 1_000) / 1_000,
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        staffRequired: Math.round(clamp(source.staffRequired, 0, 100_000)),
        capitalInvested: Math.round(clamp(source.capitalInvested, 0, Number.MAX_SAFE_INTEGER)),
        technicalDebt: Math.round(clamp(source.technicalDebt, 0, 10_000)),
        networkPlacements: facilities.length ? aggregateStreamingFacilities(facilities) : networkPlacements,
        facilities,
        managementPolicy: normalizeStreamingInfrastructureManagementPolicy(source.managementPolicy),
        physicalSummary,
        readyAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.readyAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        revision: Math.max(1, Math.round(clamp(source.revision, 1, 10_000, 1))),
        committedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.committedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        loadTest,
    };
};

const normalizeTechnologyProject = (value: unknown): OwnedStreamingTechnologyProject | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const benefit = asRecord(source.benefit);
    const id = cleanText(source.id, '', 120);
    const definitionId = cleanText(source.definitionId, '', 120);
    if (!id || !definitionId) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const readyAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek + 1, Math.round(clamp(source.readyAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, id, 180),
        definitionId,
        branch: isOneOf(source.branch, TECHNOLOGY_CAMPUS_BRANCHES, 'DELIVERY_CAPACITY'),
        title: cleanText(source.title, 'Technology project', 140),
        targetLevel: Math.round(clamp(source.targetLevel, 1, 100, 10)),
        buildMode: isOneOf(source.buildMode, TECHNOLOGY_BUILD_MODES, 'BALANCED'),
        status: isOneOf(source.status, TECHNOLOGY_PROJECT_STATUSES, 'UNDER_CONSTRUCTION'),
        capitalCost: Math.round(clamp(source.capitalCost, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCostDelta: Math.round(clamp(source.weeklyOperatingCostDelta, 0, Number.MAX_SAFE_INTEGER)),
        staffRequired: Math.round(clamp(source.staffRequired, 1, 100_000, 1)),
        constructionWeeks: Math.round(clamp(source.constructionWeeks, 1, 52, 1)),
        benefit: {
            baselineConcurrentStreamsDelta: Math.round(clamp(benefit.baselineConcurrentStreamsDelta, 0, Number.MAX_SAFE_INTEGER)),
            burstConcurrentStreamsDelta: Math.round(clamp(benefit.burstConcurrentStreamsDelta, 0, Number.MAX_SAFE_INTEGER)),
            reliabilityDelta: clamp(benefit.reliabilityDelta, 0, 10),
            playbackQualityDelta: clamp(benefit.playbackQualityDelta, 0, 100),
            recommendationDelta: clamp(benefit.recommendationDelta, 0, 100),
            securityDelta: clamp(benefit.securityDelta, 0, 100),
            contentOperationsDelta: clamp(benefit.contentOperationsDelta, 0, 100),
        },
        risk: isOneOf(source.risk, TECHNOLOGY_RISKS, 'MODERATE'),
        riskNote: cleanText(source.riskNote, 'Managed engineering risk.', 240),
        technicalDebtDelta: Math.round(clamp(source.technicalDebtDelta, -1_000, 1_000, 0)),
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek,
        completedAtAbsoluteWeek: source.completedAtAbsoluteWeek == null
            ? null
            : Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.completedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeResearchProgram = (value: unknown): OwnedStreamingResearchProgram | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const definitionId = cleanText(source.definitionId, '', 120);
    if (!id || !definitionId) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const stageStartedAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek, Math.round(clamp(
        source.stageStartedAtAbsoluteWeek,
        startedAtAbsoluteWeek,
        Number.MAX_SAFE_INTEGER,
        startedAtAbsoluteWeek,
    )));
    const stage = isOneOf(source.stage, RESEARCH_STAGES, 'RESEARCHING');
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, id, 180),
        definitionId,
        title: cleanText(source.title, 'Research program', 140),
        category: isOneOf(source.category, RESEARCH_CATEGORIES, 'EXPERIMENTAL_TECHNOLOGY'),
        stage,
        buildMode: isOneOf(source.buildMode, TECHNOLOGY_BUILD_MODES, 'BALANCED'),
        ipStrategy: source.ipStrategy == null ? null : isOneOf(source.ipStrategy, RESEARCH_IP_STRATEGIES, 'LICENSE'),
        researchCost: Math.round(clamp(source.researchCost, 0, Number.MAX_SAFE_INTEGER)),
        patentCost: Math.round(clamp(source.patentCost, 0, Number.MAX_SAFE_INTEGER)),
        installationCost: Math.round(clamp(source.installationCost, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        licenseWeeklyCost: Math.round(clamp(source.licenseWeeklyCost, 0, Number.MAX_SAFE_INTEGER)),
        staffRequired: Math.round(clamp(source.staffRequired, 1, 100_000, 1)),
        researchWeeks: Math.round(clamp(source.researchWeeks, 1, 52, 1)),
        prototypeWeeks: Math.round(clamp(source.prototypeWeeks, 1, 52, 1)),
        testWeeks: Math.round(clamp(source.testWeeks, 1, 52, 1)),
        installationWeeks: Math.round(clamp(source.installationWeeks, 0, 52, 1)),
        startedAtAbsoluteWeek,
        stageStartedAtAbsoluteWeek,
        stageReadyAtAbsoluteWeek: Math.max(stageStartedAtAbsoluteWeek, Math.round(clamp(
            source.stageReadyAtAbsoluteWeek,
            stageStartedAtAbsoluteWeek,
            Number.MAX_SAFE_INTEGER,
            stageStartedAtAbsoluteWeek + 1,
        ))),
        installationTargetType: isOneOf(source.installationTargetType, RESEARCH_INSTALL_TARGET_TYPES, 'TECHNOLOGY_PROJECT'),
        installationTargetId: source.installationTargetId == null ? null : cleanText(source.installationTargetId, '', 160) || null,
        installationTargetLabel: source.installationTargetLabel == null ? null : cleanText(source.installationTargetLabel, '', 160) || null,
        rivalInterestPercent: Math.round(clamp(source.rivalInterestPercent, 0, 100)),
        completedAtAbsoluteWeek: stage !== 'OPERATING' || source.completedAtAbsoluteWeek == null
            ? null
            : Math.max(stageStartedAtAbsoluteWeek, Math.round(clamp(source.completedAtAbsoluteWeek, stageStartedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeCampusEvent = (value: unknown): OwnedStreamingCampusEvent | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 140);
    if (!id) return null;
    return {
        id,
        stage: isOneOf(source.stage, CAMPUS_STAGES, 'PERMITS'),
        type: isOneOf(source.type, CAMPUS_EVENT_TYPES, 'CONTRACTOR_OVERRUN'),
        title: cleanText(source.title, 'Construction issue', 140),
        detail: cleanText(source.detail, 'The construction schedule changed.', 300),
        delayWeeks: Math.round(clamp(source.delayWeeks, 0, 12)),
        cost: Math.round(clamp(source.cost, 0, Number.MAX_SAFE_INTEGER)),
        occurredAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.occurredAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeCampusProject = (value: unknown): OwnedStreamingCampusProject | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 140);
    const cityId = cleanText(source.cityId, '', 24).toUpperCase();
    if (!id || !cityId) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const stageStartedAtAbsoluteWeek = Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.stageStartedAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, startedAtAbsoluteWeek)));
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, id, 180),
        name: cleanText(source.name, 'EMPIRE+ Data Campus', 100),
        cityId,
        scale: isOneOf(source.scale, CAMPUS_SCALES, 'OWNED_DATA_CENTRE'),
        status: isOneOf(source.status, CAMPUS_PROJECT_STATUSES, 'AWAITING_DECISION'),
        stage: isOneOf(source.stage, CAMPUS_STAGES, 'PERMITS'),
        currentStageOptionId: source.currentStageOptionId == null ? null : cleanText(source.currentStageOptionId, '', 100) || null,
        campusDesignId: source.campusDesignId == null ? null : cleanText(source.campusDesignId, '', 100) || null,
        utilitiesPackageId: source.utilitiesPackageId == null ? null : cleanText(source.utilitiesPackageId, '', 100) || null,
        systemsPackageId: source.systemsPackageId == null ? null : cleanText(source.systemsPackageId, '', 100) || null,
        rackPackageId: source.rackPackageId == null ? null : cleanText(source.rackPackageId, '', 100) || null,
        hallCount: Math.round(clamp(source.hallCount, 0, 12)),
        rackCapacity: Math.round(clamp(source.rackCapacity, 0, 384)),
        installedRacks: Math.round(clamp(source.installedRacks, 0, 384)),
        landCost: Math.round(clamp(source.landCost, 0, Number.MAX_SAFE_INTEGER)),
        capitalCommitted: Math.round(clamp(source.capitalCommitted, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        staffRequired: Math.round(clamp(source.staffRequired, 0, 100_000)),
        startedAtAbsoluteWeek,
        stageStartedAtAbsoluteWeek,
        stageReadyAtAbsoluteWeek: Math.max(stageStartedAtAbsoluteWeek, Math.round(clamp(source.stageReadyAtAbsoluteWeek, stageStartedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, stageStartedAtAbsoluteWeek))),
        openedAtAbsoluteWeek: source.openedAtAbsoluteWeek == null ? null : Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.openedAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
        facilityId: source.facilityId == null ? null : cleanText(source.facilityId, '', 140) || null,
        events: dedupeByKey(
            asArray<unknown>(source.events).map(normalizeCampusEvent).filter((event): event is OwnedStreamingCampusEvent => Boolean(event)),
            event => event.id,
        ).slice(-40),
        expansionCount: Math.round(clamp(source.expansionCount, 0, 10)),
        expansionReadyAtAbsoluteWeek: source.expansionReadyAtAbsoluteWeek == null ? null : Math.max(startedAtAbsoluteWeek, Math.round(clamp(source.expansionReadyAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeProductLine = (value: unknown): OwnedStreamingProductLine | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const productBenefit = asRecord(source.benefit);
    const id = cleanText(source.id, '', 120);
    const lineId = isOneOf(source.lineId, PRODUCT_LINE_IDS, 'KIDS');
    if (!id || !PRODUCT_LINE_IDS.includes(lineId)) return null;
    const startedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.startedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const readyAtAbsoluteWeek = Math.max(
        startedAtAbsoluteWeek + 1,
        Math.round(clamp(source.readyAtAbsoluteWeek, startedAtAbsoluteWeek + 1, Number.MAX_SAFE_INTEGER)),
    );
    const status = isOneOf(source.status, PRODUCT_LINE_STATUSES, 'UNDER_DEVELOPMENT');
    const launchedAtAbsoluteWeek = status === 'UNDER_DEVELOPMENT'
        ? null
        : Math.max(readyAtAbsoluteWeek, Math.round(clamp(
            source.launchedAtAbsoluteWeek,
            readyAtAbsoluteWeek,
            Number.MAX_SAFE_INTEGER,
            readyAtAbsoluteWeek,
        )));
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, `product-line:${lineId}`, 180),
        lineId,
        title: cleanText(source.title, `EMPIRE+ ${lineId}`, 140),
        status,
        launchMode: isOneOf(source.launchMode, PRODUCT_LAUNCH_MODES, 'BALANCED'),
        capitalCost: Math.round(clamp(source.capitalCost, 0, Number.MAX_SAFE_INTEGER)),
        weeklyOperatingCost: Math.round(clamp(source.weeklyOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        staffRequired: Math.round(clamp(source.staffRequired, 1, 100_000, 1)),
        peakLoadPercent: clamp(source.peakLoadPercent, 0, 500),
        developmentWeeks: Math.round(clamp(source.developmentWeeks, 1, 52, 1)),
        benefit: {
            acquisitionRateDelta: clamp(productBenefit.acquisitionRateDelta, -1, 1),
            churnRateDelta: clamp(productBenefit.churnRateDelta, -1, 1),
            engagementRateDelta: clamp(productBenefit.engagementRateDelta, -1, 1),
            weeklyRevenuePerSubscriber: clamp(productBenefit.weeklyRevenuePerSubscriber, 0, 1_000),
            productExperienceLevel: Math.round(clamp(productBenefit.productExperienceLevel, 0, 100)),
            advertisingCommerceLevel: Math.round(clamp(productBenefit.advertisingCommerceLevel, 0, 100)),
        },
        risk: isOneOf(source.risk, PRODUCT_RISKS, 'MODERATE'),
        riskNote: cleanText(source.riskNote, 'Managed product delivery risk.', 260),
        strategicConsequence: cleanText(source.strategicConsequence, 'The product changes audience behavior and operating load.', 260),
        startedAtAbsoluteWeek,
        readyAtAbsoluteWeek,
        launchedAtAbsoluteWeek,
        lastStatusChangedAtAbsoluteWeek: Math.max(
            startedAtAbsoluteWeek,
            Math.round(clamp(source.lastStatusChangedAtAbsoluteWeek, startedAtAbsoluteWeek, Number.MAX_SAFE_INTEGER, startedAtAbsoluteWeek)),
        ),
    };
};

const normalizeCatalogSetupDraft = (value: unknown): OwnedStreamingCatalogSetupDraft | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const opportunityProjectId = cleanText(source.opportunityProjectId, '', 180);
    const counterMinimumGuarantee = source.counterMinimumGuarantee;
    const counterPlatformRevenueShare = source.counterPlatformRevenueShare;
    return {
        currentStep: Math.round(clamp(source.currentStep, 0, 4)),
        selectedOwnedProjectIds: uniqueStrings(source.selectedOwnedProjectIds, OWNED_STREAMING_CATALOG_REFERENCE_LIMIT),
        packageId: isOneOf(source.packageId, STARTER_CATALOG_PACKAGE_IDS, 'CURATED_PREMIERE'),
        opportunityProjectId: opportunityProjectId || null,
        territory: isOneOf(source.territory, LICENSE_TERRITORIES, 'MULTI_REGION'),
        durationWeeks: Math.round(clamp(source.durationWeeks, 52, 156, 104)),
        exclusivity: isOneOf(source.exclusivity, LICENSE_EXCLUSIVITY, 'NON_EXCLUSIVE'),
        minimumGuarantee: Math.round(clamp(source.minimumGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        platformRevenueShare: Math.round(clamp(source.platformRevenueShare, 50, 90, 70)),
        negotiationStatus: isOneOf(source.negotiationStatus, CATALOG_NEGOTIATION_STATUSES, 'BUILDING'),
        counterMinimumGuarantee: counterMinimumGuarantee === null || counterMinimumGuarantee === undefined
            ? null
            : Math.round(clamp(counterMinimumGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        counterPlatformRevenueShare: counterPlatformRevenueShare === null || counterPlatformRevenueShare === undefined
            ? null
            : Math.round(clamp(counterPlatformRevenueShare, 50, 90, 70)),
        negotiationRound: Math.round(clamp(source.negotiationRound, 0, 3)),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeStarterCatalog = (value: unknown): OwnedStreamingStarterCatalog | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    return {
        packageId: isOneOf(source.packageId, STARTER_CATALOG_PACKAGE_IDS, 'CURATED_PREMIERE'),
        ownedProjectIds: uniqueStrings(source.ownedProjectIds, OWNED_STREAMING_CATALOG_REFERENCE_LIMIT),
        licensedProjectIds: uniqueStrings(source.licensedProjectIds, OWNED_STREAMING_CATALOG_REFERENCE_LIMIT),
        establishedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.establishedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeCatalogLicense = (value: unknown): OwnedStreamingCatalogLicense | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const sourceProjectId = cleanText(source.sourceProjectId, '', 180);
    if (!id || !sourceProjectId) return null;
    const platformRevenueShare = Math.round(clamp(source.platformRevenueShare, 50, 90, 70));
    const signedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.signedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const startsAtAbsoluteWeek = Math.max(signedAtAbsoluteWeek, Math.round(clamp(source.startsAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const durationWeeks = Math.round(clamp(source.durationWeeks, 26, 520, 104));
    const expiresAtAbsoluteWeek = Math.max(
        startsAtAbsoluteWeek + 1,
        Math.round(clamp(source.expiresAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, startsAtAbsoluteWeek + durationWeeks)),
    );
    return {
        id,
        sourceProjectId,
        titleAtSigning: cleanText(source.titleAtSigning, 'Licensed title', 140),
        projectType: source.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: cleanText(source.genre, 'Licensed', 80),
        licensorName: cleanText(source.licensorName, 'Rights holder', 140),
        territory: isOneOf(source.territory, LICENSE_TERRITORIES, 'MULTI_REGION'),
        countryIds: uniqueStrings(source.countryIds, 80),
        durationWeeks,
        exclusivity: isOneOf(source.exclusivity, LICENSE_EXCLUSIVITY, 'NON_EXCLUSIVE'),
        minimumGuarantee: Math.round(clamp(source.minimumGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        platformRevenueShare,
        licensorRevenueShare: 100 - platformRevenueShare,
        signedAtAbsoluteWeek,
        startsAtAbsoluteWeek,
        expiresAtAbsoluteWeek,
        status: isOneOf(source.status, CATALOG_LICENSE_STATUSES, 'ACTIVE'),
        origin: isOneOf(source.origin, ['STARTER', 'STUDIO_MARKET', 'PLATFORM_TRADE', 'RENEWAL'] as const, 'STARTER'),
        sellerType: isOneOf(source.sellerType, RIGHTS_SELLER_TYPES, 'STUDIO'),
        sellerPlatformId: isOneOf(source.sellerPlatformId, PLATFORM_IDS, 'NETFLIX') === source.sellerPlatformId
            ? source.sellerPlatformId
            : null,
        windowType: isOneOf(source.windowType, RIGHTS_WINDOW_TYPES, 'SECOND_WINDOW'),
        permanentPurchase: Boolean(source.permanentPurchase),
        marketingGuarantee: Math.round(clamp(source.marketingGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        viewershipBonusThreshold: Math.round(clamp(source.viewershipBonusThreshold, 0, Number.MAX_SAFE_INTEGER)),
        viewershipBonusAmount: Math.round(clamp(source.viewershipBonusAmount, 0, Number.MAX_SAFE_INTEGER)),
        renewalOption: Boolean(source.renewalOption),
        sublicensingAllowed: Boolean(source.sublicensingAllowed),
        sequelRightsIncluded: Boolean(source.sequelRightsIncluded),
        changeOfControl: isOneOf(source.changeOfControl, RIGHTS_CHANGE_OF_CONTROL, 'NOTICE'),
        cancellationPenalty: Math.round(clamp(source.cancellationPenalty, 0, Number.MAX_SAFE_INTEGER)),
        renewedFromLicenseId: cleanText(source.renewedFromLicenseId, '', 120) || null,
    };
};

const normalizeRightsNegotiation = (value: unknown): OwnedStreamingRightsNegotiation | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const sourceProjectId = cleanText(source.sourceProjectId, '', 180);
    if (!id || !sourceProjectId) return null;
    const platformRevenueShare = Math.round(clamp(source.platformRevenueShare, 45, 90, 70));
    return {
        id,
        idempotencyKey: cleanText(source.idempotencyKey, id, 180),
        kind: isOneOf(source.kind, RIGHTS_NEGOTIATION_KINDS, 'ACQUIRE'),
        sourceProjectId,
        sourceLicenseId: cleanText(source.sourceLicenseId, '', 120) || null,
        title: cleanText(source.title, 'Untitled rights package', 140),
        projectType: source.projectType === 'SERIES' ? 'SERIES' : 'MOVIE',
        genre: cleanText(source.genre, 'Unknown', 80),
        sellerType: isOneOf(source.sellerType, RIGHTS_SELLER_TYPES, 'STUDIO'),
        sellerId: cleanText(source.sellerId, 'rights-holder', 120),
        sellerName: cleanText(source.sellerName, 'Rights holder', 140),
        buyerPlatformId: PLATFORM_IDS.includes(source.buyerPlatformId) ? source.buyerPlatformId : null,
        buyerName: cleanText(source.buyerName, '', 140) || null,
        territory: isOneOf(source.territory, LICENSE_TERRITORIES, 'MULTI_REGION'),
        countryIds: normalizeStreamingDayOneMarketIds(source.countryIds).sort(),
        durationWeeks: Math.round(clamp(source.durationWeeks, 26, 520, 104)),
        exclusivity: isOneOf(source.exclusivity, LICENSE_EXCLUSIVITY, 'NON_EXCLUSIVE'),
        windowType: isOneOf(source.windowType, RIGHTS_WINDOW_TYPES, 'SECOND_WINDOW'),
        minimumGuarantee: Math.round(clamp(source.minimumGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        platformRevenueShare,
        marketingGuarantee: Math.round(clamp(source.marketingGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        viewershipBonusThreshold: Math.round(clamp(source.viewershipBonusThreshold, 0, Number.MAX_SAFE_INTEGER)),
        viewershipBonusAmount: Math.round(clamp(source.viewershipBonusAmount, 0, Number.MAX_SAFE_INTEGER)),
        renewalOption: Boolean(source.renewalOption),
        sublicensingAllowed: Boolean(source.sublicensingAllowed),
        sequelRightsIncluded: Boolean(source.sequelRightsIncluded),
        changeOfControl: isOneOf(source.changeOfControl, RIGHTS_CHANGE_OF_CONTROL, 'NOTICE'),
        cancellationPenalty: Math.round(clamp(source.cancellationPenalty, 0, Number.MAX_SAFE_INTEGER)),
        rivalPlatformId: PLATFORM_IDS.includes(source.rivalPlatformId) ? source.rivalPlatformId : null,
        rivalPlatformName: cleanText(source.rivalPlatformName, '', 140) || null,
        rivalBidAmount: Math.round(clamp(source.rivalBidAmount, 0, Number.MAX_SAFE_INTEGER)),
        marketHeat: isOneOf(source.marketHeat, ['COOL', 'ACTIVE', 'HOT'] as const, 'ACTIVE'),
        status: isOneOf(source.status, RIGHTS_NEGOTIATION_STATUSES, 'OPEN'),
        round: Math.round(clamp(source.round, 0, 3)),
        counterMinimumGuarantee: source.counterMinimumGuarantee == null ? null : Math.round(clamp(source.counterMinimumGuarantee, 0, Number.MAX_SAFE_INTEGER)),
        counterPlatformRevenueShare: source.counterPlatformRevenueShare == null ? null : Math.round(clamp(source.counterPlatformRevenueShare, 45, 90, 70)),
        createdAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.createdAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        expiresAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.expiresAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeSublicenseDeal = (value: unknown): OwnedStreamingSublicenseDeal | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const sourceLicenseId = cleanText(source.sourceLicenseId, '', 120);
    const sourceProjectId = cleanText(source.sourceProjectId, '', 180);
    if (!id || !sourceLicenseId || !sourceProjectId || !PLATFORM_IDS.includes(source.buyerPlatformId)) return null;
    const sellerRevenueShare = Math.round(clamp(source.sellerRevenueShare, 10, 90, 60));
    return {
        id,
        sourceLicenseId,
        sourceProjectId,
        title: cleanText(source.title, 'Sublicensed title', 140),
        buyerPlatformId: source.buyerPlatformId,
        buyerName: cleanText(source.buyerName, 'Partner platform', 140),
        territory: isOneOf(source.territory, LICENSE_TERRITORIES, 'DOMESTIC'),
        countryIds: normalizeStreamingDayOneMarketIds(source.countryIds).sort(),
        windowType: isOneOf(source.windowType, RIGHTS_WINDOW_TYPES, 'SECOND_WINDOW'),
        durationWeeks: Math.round(clamp(source.durationWeeks, 26, 520, 52)),
        exclusivity: isOneOf(source.exclusivity, LICENSE_EXCLUSIVITY, 'NON_EXCLUSIVE'),
        upfrontFee: Math.round(clamp(source.upfrontFee, 0, Number.MAX_SAFE_INTEGER)),
        sellerRevenueShare,
        buyerRevenueShare: 100 - sellerRevenueShare,
        signedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.signedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        startsAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.startsAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        expiresAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.expiresAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        status: isOneOf(source.status, ['ACTIVE', 'EXPIRED', 'TERMINATED'] as const, 'ACTIVE'),
        changeOfControl: isOneOf(source.changeOfControl, RIGHTS_CHANGE_OF_CONTROL, 'NOTICE'),
        cancellationPenalty: Math.round(clamp(source.cancellationPenalty, 0, Number.MAX_SAFE_INTEGER)),
    };
};

const normalizeRightsObligation = (value: unknown): OwnedStreamingRightsObligation | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 120);
    const licenseId = cleanText(source.licenseId, '', 120);
    if (!id || !licenseId) return null;
    return {
        id,
        licenseId,
        sourceProjectId: cleanText(source.sourceProjectId, '', 180),
        title: cleanText(source.title, 'Contract obligation', 140),
        type: isOneOf(source.type, RIGHTS_OBLIGATION_TYPES, 'MARKETING_SPEND'),
        targetAmount: Math.round(clamp(source.targetAmount, 0, Number.MAX_SAFE_INTEGER)),
        observedAmount: Math.round(clamp(source.observedAmount, 0, Number.MAX_SAFE_INTEGER)),
        dueAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.dueAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        status: isOneOf(source.status, RIGHTS_OBLIGATION_STATUSES, 'PENDING'),
        breachPenalty: Math.round(clamp(source.breachPenalty, 0, Number.MAX_SAFE_INTEGER)),
        successPayment: Math.round(clamp(source.successPayment, 0, Number.MAX_SAFE_INTEGER)),
        resolvedAtAbsoluteWeek: source.resolvedAtAbsoluteWeek == null
            ? null
            : Math.max(0, Math.round(clamp(source.resolvedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeOriginalCommissionDraft = (value: unknown): OwnedStreamingOriginalCommissionDraft | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const producerStudioId = cleanText(source.producerStudioId, '', 180);
    const parentCommissionId = cleanText(source.parentCommissionId, '', 180);
    const lineageId = cleanText(source.lineageId, '', 180);
    return {
        currentStep: Math.round(clamp(source.currentStep, 0, 3)),
        gapId: isOneOf(source.gapId, ORIGINAL_GAP_IDS, 'SERIES_RETENTION'),
        title: cleanText(source.title, 'Untitled Original', 100),
        projectType: isOneOf(source.projectType, PROJECT_TYPES, 'SERIES'),
        genre: isOneOf(source.genre, GENRES, 'DRAMA'),
        episodes: Math.round(clamp(source.episodes, 1, 24, 8)),
        targetAudience: isOneOf(source.targetAudience, TARGET_AUDIENCES, 'PG-13'),
        producerStudioId: producerStudioId || null,
        productionBudgetCap: Math.round(clamp(source.productionBudgetCap, 0, Number.MAX_SAFE_INTEGER)),
        updatedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.updatedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        strategy: isOneOf(source.strategy, ORIGINAL_STRATEGIES, 'WEEKLY_RETENTION'),
        platformRightsPercent: Math.round(clamp(source.platformRightsPercent, 51, 100, 85)),
        exclusiveWindowWeeks: Math.round(clamp(source.exclusiveWindowWeeks, 4, 104, 24)),
        sequelRightsIncluded: source.sequelRightsIncluded !== false,
        parentCommissionId: parentCommissionId || null,
        lineageId: lineageId || null,
        seasonNumber: Math.round(clamp(source.seasonNumber, 1, 50, 1)),
    };
};

const normalizeOriginalCommission = (value: unknown): OwnedStreamingOriginalCommission | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const id = cleanText(source.id, '', 180);
    const scriptId = cleanText(source.scriptId, '', 180);
    const producerStudioId = cleanText(source.producerStudioId, '', 180);
    if (!id || !scriptId || !producerStudioId) return null;
    const canonicalProjectId = cleanText(source.canonicalProjectId, '', 180);
    const greenlitAt = source.greenlitAtAbsoluteWeek;
    const parentCommissionId = cleanText(source.parentCommissionId, '', 180);
    const lineageId = cleanText(source.lineageId, id, 180) || id;
    const contractSource = asRecord(source.contract);
    const localizationSource = asRecord(source.localization);
    const releaseSource = asRecord(source.releasePlan);
    const decisionSource = asRecord(source.lifecycleDecision);
    const localizationPackageId = isOneOf(localizationSource.packageId, ORIGINAL_LOCALIZATION_PACKAGES, 'DOMESTIC');
    const releaseScope = isOneOf(releaseSource.scope, ORIGINAL_RELEASE_SCOPES, localizationPackageId);
    const decisionId = cleanText(decisionSource.id, '', 180);
    return {
        id,
        scriptId,
        canonicalProjectId: canonicalProjectId || null,
        title: cleanText(source.title, 'Untitled Original', 100),
        gapId: isOneOf(source.gapId, ORIGINAL_GAP_IDS, 'SERIES_RETENTION'),
        projectType: isOneOf(source.projectType, PROJECT_TYPES, 'SERIES'),
        genre: isOneOf(source.genre, GENRES, 'DRAMA'),
        episodes: Math.round(clamp(source.episodes, 1, 24, 8)),
        producerStudioId,
        producerStudioName: cleanText(source.producerStudioName, 'Production partner', 120),
        commissionedByPlatformName: cleanText(source.commissionedByPlatformName, 'EMPIRE+', 80),
        productionBudgetCap: Math.round(clamp(source.productionBudgetCap, 0, Number.MAX_SAFE_INTEGER)),
        productionFundingApplied: Math.round(clamp(source.productionFundingApplied, 0, Number.MAX_SAFE_INTEGER)),
        status: isOneOf(source.status, ORIGINAL_COMMISSION_STATUSES, 'READY_FOR_GREENLIGHT'),
        commissionedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.commissionedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        greenlitAtAbsoluteWeek: greenlitAt === null || greenlitAt === undefined
            ? null
            : Math.max(0, Math.round(clamp(greenlitAt, 0, Number.MAX_SAFE_INTEGER))),
        strategy: isOneOf(source.strategy, ORIGINAL_STRATEGIES, 'WEEKLY_RETENTION'),
        parentCommissionId: parentCommissionId || null,
        lineageId,
        seasonNumber: Math.round(clamp(source.seasonNumber, 1, 50, 1)),
        contract: {
            platformRightsPercent: Math.round(clamp(contractSource.platformRightsPercent, 51, 100, 85)),
            producerBackendPercent: Math.round(clamp(contractSource.producerBackendPercent, 0, 49, 15)),
            exclusiveWindowWeeks: Math.round(clamp(contractSource.exclusiveWindowWeeks, 4, 104, 24)),
            sequelRightsIncluded: contractSource.sequelRightsIncluded !== false,
        },
        localization: source.localization && typeof source.localization === 'object'
            ? {
                packageId: localizationPackageId,
                subtitleLanguageCount: Math.round(clamp(localizationSource.subtitleLanguageCount, 0, 40, 2)),
                dubbedLanguageCount: Math.round(clamp(localizationSource.dubbedLanguageCount, 0, 20, 0)),
                cashCost: Math.round(clamp(localizationSource.cashCost, 0, Number.MAX_SAFE_INTEGER)),
                committedAtAbsoluteWeek: Math.max(0, Math.round(clamp(localizationSource.committedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                readyAtAbsoluteWeek: Math.max(0, Math.round(clamp(localizationSource.readyAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            }
            : null,
        releasePlan: source.releasePlan && typeof source.releasePlan === 'object'
            ? {
                scope: releaseScope,
                releasePattern: isOneOf(releaseSource.releasePattern, ORIGINAL_RELEASE_PATTERNS, 'SINGLE_PREMIERE'),
                marketingPlan: isOneOf(releaseSource.marketingPlan, SLATE_MARKETING_PLANS, 'STANDARD'),
                premiereAtAbsoluteWeek: Math.max(0, Math.round(clamp(releaseSource.premiereAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                authorizedAtAbsoluteWeek: Math.max(0, Math.round(clamp(releaseSource.authorizedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
            }
            : null,
        lifecycleDecision: decisionId
            ? {
                id: decisionId,
                type: isOneOf(decisionSource.type, ORIGINAL_LIFECYCLE_DECISIONS, 'CANCEL'),
                decidedAtAbsoluteWeek: Math.max(0, Math.round(clamp(decisionSource.decidedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
                evidenceWeeks: Math.max(0, Math.round(clamp(decisionSource.evidenceWeeks, 0, 104, 0))),
                evidenceSummary: cleanText(decisionSource.evidenceSummary, 'Decision recorded from available platform evidence.', 240),
                exclusiveWindowWeeks: decisionSource.exclusiveWindowWeeks === null || decisionSource.exclusiveWindowWeeks === undefined
                    ? null
                    : Math.round(clamp(decisionSource.exclusiveWindowWeeks, 4, 104, 24)),
            }
            : null,
    };
};

const normalizeLaunchSlate = (value: unknown): OwnedStreamingLaunchSlate | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const entries = dedupeByKey(asArray<unknown>(source.entries).flatMap(item => {
        const entry = asRecord(item);
        const id = cleanText(entry.id, '', 180);
        const projectId = cleanText(entry.projectId, '', 180);
        if (!id || !projectId) return [];
        return [{
            id,
            projectId,
            title: cleanText(entry.title, 'Untitled', 100),
            source: isOneOf(entry.source, SLATE_ENTRY_SOURCES, 'OWNED_LIBRARY'),
            projectType: isOneOf(entry.projectType, PROJECT_TYPES, 'MOVIE'),
            genre: cleanText(entry.genre, 'DRAMA', 40),
            launchWeek: Math.round(clamp(entry.launchWeek, 1, 12, 1)),
            releasePattern: isOneOf(entry.releasePattern, ORIGINAL_RELEASE_PATTERNS, 'SINGLE_PREMIERE'),
            marketingPlan: isOneOf(entry.marketingPlan, SLATE_MARKETING_PLANS, 'STANDARD'),
        }];
    }), entry => entry.id).slice(0, 36);
    return {
        entries,
        programmedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.programmedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        revision: Math.max(1, Math.round(clamp(source.revision, 1, 10_000, 1))),
    };
};

const normalizeLaunchCommit = (value: unknown): OwnedStreamingLaunchCommit | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_launch', idempotencyKey), 100),
        idempotencyKey,
        committedAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.committedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        capacityPlan: isOneOf(source.capacityPlan, LAUNCH_CAPACITY_PLANS, 'STANDARD'),
        capacityPlanCost: Math.round(clamp(source.capacityPlanCost, 0, Number.MAX_SAFE_INTEGER)),
        readinessScore: Math.round(clamp(source.readinessScore, 0, 100)),
        forecastLikelyConcurrentStreams: Math.round(clamp(source.forecastLikelyConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        forecastHighConcurrentStreams: Math.round(clamp(source.forecastHighConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        protectedPeakConcurrentStreams: Math.round(clamp(source.protectedPeakConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        launchHeadroomPercent: Math.round(clamp(source.launchHeadroomPercent, -100, 1_000)),
        initialSubscribers: Math.round(clamp(source.initialSubscribers, 0, Number.MAX_SAFE_INTEGER)),
        openingDemandIndex: Math.round(clamp(source.openingDemandIndex, 0, 100)),
        playbackSuccessRate: clamp(source.playbackSuccessRate, 0, 100),
        outcomeTier: isOneOf(source.outcomeTier, LAUNCH_OUTCOME_TIERS, 'PRESSURED_OPENING'),
        openingTitleCount: Math.round(clamp(source.openingTitleCount, 0, 10_000)),
        openingOriginalTitle: cleanText(source.openingOriginalTitle, 'First Original', 100),
    };
};

export const createOwnedStreamingPlatformState = (playerId = 'player'): OwnedStreamingPlatformState => (
    createInitialOwnedStreamingPlatformState(cleanText(playerId, 'player', 80))
);

const normalizeMetrics = (value: unknown): OwnedStreamingPlatformMetrics => {
    const source = asRecord(value);
    return {
        subscribers: Math.round(clamp(source.subscribers, 0, Number.MAX_SAFE_INTEGER)),
        netSubscriberMovement: Math.round(clamp(source.netSubscriberMovement, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        churnRate: clamp(source.churnRate, 0, 1),
        engagementRate: clamp(source.engagementRate, 0, 1),
        averageRevenuePerUser: clamp(source.averageRevenuePerUser, 0, Number.MAX_SAFE_INTEGER),
        cashRunwayWeeks: clamp(source.cashRunwayWeeks, 0, 5_200),
        technologyHealth: clamp(source.technologyHealth, 0, 100),
    };
};

const normalizeTitleWeekPerformance = (value: unknown): OwnedStreamingTitleWeekPerformance | null => {
    const source = asRecord(value);
    const projectId = cleanText(source.projectId, '', 120);
    const title = cleanText(source.title, '', 140);
    if (!projectId || !title) return null;
    const absoluteWeek = Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const discovery = asRecord(source.discoveryMix);
    return {
        id: cleanText(source.id, createDeterministicId('streaming_title_week', projectId, absoluteWeek), 120),
        projectId,
        title,
        source: isOneOf(source.source, SLATE_ENTRY_SOURCES, 'OWNED_LIBRARY'),
        projectType: isOneOf(source.projectType, PROJECT_TYPES, 'MOVIE'),
        genre: isOneOf(source.genre, GENRES, 'DRAMA'),
        absoluteWeek,
        programWeek: Math.max(1, Math.round(clamp(source.programWeek, 1, 999, 1))),
        weeksAvailable: Math.max(1, Math.round(clamp(source.weeksAvailable, 1, 999, 1))),
        viewingAccounts: Math.round(clamp(source.viewingAccounts, 0, Number.MAX_SAFE_INTEGER)),
        hoursViewed: Math.round(clamp(source.hoursViewed, 0, Number.MAX_SAFE_INTEGER)),
        completionRate: clamp(source.completionRate, 0, 1),
        repeatViewingRate: clamp(source.repeatViewingRate, 0, 1),
        satisfactionScore: clamp(source.satisfactionScore, 0, 100),
        discoveryMix: {
            homepagePercent: clamp(discovery.homepagePercent, 0, 100),
            recommendationsPercent: clamp(discovery.recommendationsPercent, 0, 100),
            searchPercent: clamp(discovery.searchPercent, 0, 100),
            directPercent: clamp(discovery.directPercent, 0, 100),
        },
        attributedSubscriptionRevenue: Math.round(clamp(source.attributedSubscriptionRevenue, 0, Number.MAX_SAFE_INTEGER)),
        allocatedCashCost: Math.round(clamp(source.allocatedCashCost, 0, Number.MAX_SAFE_INTEGER)),
        allocatedContentAmortization: Math.round(clamp(source.allocatedContentAmortization, 0, Number.MAX_SAFE_INTEGER)),
        cashContribution: Math.round(clamp(source.cashContribution, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        accountingContribution: Math.round(clamp(source.accountingContribution, -Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER, 0)),
        playbackSuccessRate: clamp(source.playbackSuccessRate, 0, 100),
    };
};

const normalizeWeeklyOperations = (value: unknown): OwnedStreamingWeeklyOperations | undefined => {
    const source = asRecord(value);
    const headline = cleanText(source.headline, '', 160);
    if (!headline) return undefined;
    return {
        programWeek: Math.max(1, Math.round(clamp(source.programWeek, 1, 999, 1))),
        releaseTitles: uniqueStrings(source.releaseTitles, 12),
        joinedSubscribers: Math.round(clamp(source.joinedSubscribers, 0, Number.MAX_SAFE_INTEGER)),
        cancellations: Math.round(clamp(source.cancellations, 0, Number.MAX_SAFE_INTEGER)),
        reactivations: Math.round(clamp(source.reactivations, 0, Number.MAX_SAFE_INTEGER)),
        subscriptionRevenue: Math.round(clamp(source.subscriptionRevenue, 0, Number.MAX_SAFE_INTEGER)),
        partnerRevenueShareCost: Math.round(clamp(source.partnerRevenueShareCost, 0, Number.MAX_SAFE_INTEGER)),
        infrastructureCost: Math.round(clamp(source.infrastructureCost, 0, Number.MAX_SAFE_INTEGER)),
        leadershipCost: Math.round(clamp(source.leadershipCost, 0, Number.MAX_SAFE_INTEGER)),
        financingCost: Math.round(clamp(source.financingCost, 0, Number.MAX_SAFE_INTEGER)),
        weeklyPlanCost: Math.round(clamp(source.weeklyPlanCost, 0, Number.MAX_SAFE_INTEGER)),
        growthPlanCost: Math.round(clamp(source.growthPlanCost, 0, Number.MAX_SAFE_INTEGER)),
        rightsComplianceCost: Math.round(clamp(source.rightsComplianceCost, 0, Number.MAX_SAFE_INTEGER)),
        marketPolicyCost: Math.round(clamp(source.marketPolicyCost, 0, Number.MAX_SAFE_INTEGER)),
        marketOperatingCost: Math.round(clamp(source.marketOperatingCost, 0, Number.MAX_SAFE_INTEGER)),
        technologyCampusCost: Math.round(clamp(source.technologyCampusCost, 0, Number.MAX_SAFE_INTEGER)),
        productSuiteCost: Math.round(clamp(source.productSuiteCost, 0, Number.MAX_SAFE_INTEGER)),
        productRevenue: Math.round(clamp(source.productRevenue, 0, Number.MAX_SAFE_INTEGER)),
        productPeakLoadPercent: clamp(source.productPeakLoadPercent, 0, 1_000),
        governanceCost: Math.round(clamp(source.governanceCost, 0, Number.MAX_SAFE_INTEGER)),
        competitiveOperationsCost: Math.round(clamp(source.competitiveOperationsCost, 0, Number.MAX_SAFE_INTEGER)),
        acquisitionIntegrationCost: Math.round(clamp(source.acquisitionIntegrationCost, 0, Number.MAX_SAFE_INTEGER)),
        crisisRecoveryCost: Math.round(clamp(source.crisisRecoveryCost, 0, Number.MAX_SAFE_INTEGER)),
        totalCashCost: Math.round(clamp(source.totalCashCost, 0, Number.MAX_SAFE_INTEGER)),
        netCashContribution: Math.round(clamp(
            source.netCashContribution,
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            0,
        )),
        contentAmortization: Math.round(clamp(source.contentAmortization, 0, Number.MAX_SAFE_INTEGER)),
        accountingContribution: Math.round(clamp(
            source.accountingContribution,
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            0,
        )),
        peakConcurrentStreams: Math.round(clamp(source.peakConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        capacityUtilizationPercent: clamp(source.capacityUtilizationPercent, 0, 10_000),
        playbackSuccessRate: clamp(source.playbackSuccessRate, 0, 100),
        appliedDecisionId: cleanText(source.appliedDecisionId, '', 100) || null,
        appliedGrowthActionId: cleanText(source.appliedGrowthActionId, '', 100) || null,
        headline,
        summary: cleanText(source.summary, 'The platform completed its weekly operating cycle.', 280),
        nextWeekHook: cleanText(source.nextWeekHook, 'The next weekly brief is ready for review.', 220),
        causalDrivers: asArray<unknown>(source.causalDrivers).slice(0, 6).flatMap(item => {
            const driver = asRecord(item);
            const id = cleanText(driver.id, '', 80);
            const label = cleanText(driver.label, '', 100);
            if (!id || !label) return [];
            return [{
                id,
                label,
                detail: cleanText(driver.detail, 'No additional detail recorded.', 220),
                impact: isOneOf(driver.impact, ['POSITIVE', 'NEGATIVE', 'NEUTRAL'] as const, 'NEUTRAL'),
            }];
        }),
        titlePerformance: asArray<unknown>(source.titlePerformance)
            .map(normalizeTitleWeekPerformance)
            .filter((item): item is OwnedStreamingTitleWeekPerformance => Boolean(item))
            .slice(0, 24),
    };
};

const normalizeWeeklyDecision = (value: unknown): OwnedStreamingWeeklyDecision | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const selectedAtAbsoluteWeek = Math.max(0, Math.round(clamp(
        source.selectedAtAbsoluteWeek,
        0,
        Number.MAX_SAFE_INTEGER,
    )));
    const targetAbsoluteWeek = Math.max(selectedAtAbsoluteWeek + 1, Math.round(clamp(
        source.targetAbsoluteWeek,
        selectedAtAbsoluteWeek + 1,
        Number.MAX_SAFE_INTEGER,
        selectedAtAbsoluteWeek + 1,
    )));
    const status = isOneOf(source.status, ['LOCKED', 'APPLIED'] as const, 'LOCKED');
    return {
        id: cleanText(source.id, createDeterministicId('streaming_decision', idempotencyKey), 100),
        idempotencyKey,
        planId: isOneOf(source.planId, WEEKLY_PLAN_IDS, 'RETENTION_SPOTLIGHT'),
        label: cleanText(source.label, 'Weekly operating plan', 100),
        selectedAtAbsoluteWeek,
        targetAbsoluteWeek,
        cashCost: Math.round(clamp(source.cashCost, 0, Number.MAX_SAFE_INTEGER)),
        status,
        appliedAtAbsoluteWeek: status === 'APPLIED'
            ? Math.max(0, Math.round(clamp(
                source.appliedAtAbsoluteWeek,
                0,
                Number.MAX_SAFE_INTEGER,
                targetAbsoluteWeek,
            )))
            : null,
        outcomeNote: cleanText(source.outcomeNote, '', 220) || null,
    };
};

const normalizeGrowthAttribution = (value: unknown): OwnedStreamingGrowthAttribution | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = asRecord(value);
    const discovery = asRecord(source.observedDiscoveryMix);
    const artworkWinner = ARTWORK_VARIANTS.includes(source.artworkWinner as StreamingArtworkVariant)
        ? source.artworkWinner as StreamingArtworkVariant
        : null;
    const observedDiscoveryMix = source.observedDiscoveryMix && typeof source.observedDiscoveryMix === 'object'
        ? {
            homepagePercent: clamp(discovery.homepagePercent, 0, 100),
            recommendationsPercent: clamp(discovery.recommendationsPercent, 0, 100),
            searchPercent: clamp(discovery.searchPercent, 0, 100),
            directPercent: clamp(discovery.directPercent, 0, 100),
        }
        : null;
    return {
        attributedViewingAccounts: Math.round(clamp(source.attributedViewingAccounts, 0, Number.MAX_SAFE_INTEGER)),
        attributedJoins: Math.round(clamp(source.attributedJoins, 0, Number.MAX_SAFE_INTEGER)),
        costPerAttributedJoin: source.costPerAttributedJoin === null || source.costPerAttributedJoin === undefined
            ? null
            : clamp(source.costPerAttributedJoin, 0, Number.MAX_SAFE_INTEGER),
        artworkWinner,
        artworkWinnerLiftPercent: artworkWinner && source.artworkWinnerLiftPercent !== null
            ? clamp(source.artworkWinnerLiftPercent, 0, 100)
            : null,
        observedDiscoveryMix,
        summary: cleanText(source.summary, 'The growth action completed with measured attribution.', 260),
    };
};

const normalizeGrowthAction = (value: unknown): OwnedStreamingGrowthAction | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    const projectId = cleanText(source.projectId, '', 140);
    const title = cleanText(source.title, '', 140);
    if (!idempotencyKey || !projectId || !title) return null;
    const selectedAtAbsoluteWeek = Math.max(0, Math.round(clamp(source.selectedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const targetAbsoluteWeek = Math.max(selectedAtAbsoluteWeek + 1, Math.round(clamp(
        source.targetAbsoluteWeek,
        selectedAtAbsoluteWeek + 1,
        Number.MAX_SAFE_INTEGER,
        selectedAtAbsoluteWeek + 1,
    )));
    const status = isOneOf(source.status, ['LOCKED', 'APPLIED'] as const, 'LOCKED');
    const artworkVariants = uniqueStrings(source.artworkVariants, 2)
        .filter((variant): variant is StreamingArtworkVariant => ARTWORK_VARIANTS.includes(variant as StreamingArtworkVariant));
    return {
        id: cleanText(source.id, createDeterministicId('streaming_growth', idempotencyKey), 120),
        idempotencyKey,
        projectId,
        title,
        selectedAtAbsoluteWeek,
        targetAbsoluteWeek,
        channels: uniqueStrings(source.channels, CAMPAIGN_CHANNEL_IDS.length)
            .filter((channel): channel is StreamingCampaignChannelId => CAMPAIGN_CHANNEL_IDS.includes(channel as StreamingCampaignChannelId)),
        homepagePlacement: isOneOf(source.homepagePlacement, HOMEPAGE_PLACEMENTS, 'NONE'),
        recommendationObjective: isOneOf(source.recommendationObjective, RECOMMENDATION_OBJECTIVES, 'BALANCED'),
        explorationPercent: Math.round(clamp(source.explorationPercent, 10, 45, 25)),
        artworkVariants: artworkVariants.length === 2 ? artworkVariants : [],
        cashCost: Math.round(clamp(source.cashCost, 0, Number.MAX_SAFE_INTEGER)),
        status,
        appliedAtAbsoluteWeek: status === 'APPLIED'
            ? Math.max(0, Math.round(clamp(source.appliedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER, targetAbsoluteWeek)))
            : null,
        outcome: status === 'APPLIED' ? normalizeGrowthAttribution(source.outcome) : null,
    };
};

const normalizeSnapshot = (value: unknown): OwnedStreamingWeeklySnapshot | null => {
    const source = asRecord(value);
    const absoluteWeek = Math.max(0, Math.round(Number(source.absoluteWeek)));
    if (!Number.isFinite(absoluteWeek)) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_snapshot', absoluteWeek), 100),
        absoluteWeek,
        ...normalizeMetrics(source),
        causeMarkers: uniqueStrings(source.causeMarkers, 8),
        operations: normalizeWeeklyOperations(source.operations),
    };
};

const normalizeCycleReview = (value: unknown): OwnedStreamingCycleReview | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    const ledgerFactId = cleanText(source.ledgerFactId, '', 100);
    if (!idempotencyKey || !ledgerFactId) return null;
    const startAbsoluteWeek = Math.max(0, Math.round(clamp(source.startAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const endAbsoluteWeek = Math.max(
        startAbsoluteWeek,
        Math.round(clamp(source.endAbsoluteWeek, startAbsoluteWeek, Number.MAX_SAFE_INTEGER)),
    );
    const rivalSource = asRecord(source.rivalMovement);
    return {
        id: cleanText(source.id, createDeterministicId('streaming_cycle', idempotencyKey), 100),
        idempotencyKey,
        ledgerFactId,
        kind: isOneOf(source.kind, CYCLE_REVIEW_KINDS, 'FOUR_WEEK_BEAT'),
        cycleNumber: Math.max(1, Math.round(clamp(source.cycleNumber, 1, Number.MAX_SAFE_INTEGER, 1))),
        startAbsoluteWeek,
        endAbsoluteWeek,
        weeksIncluded: Math.max(1, Math.round(clamp(source.weeksIncluded, 1, 12, 4))),
        strategicIdentity: isOneOf(source.strategicIdentity, STRATEGIC_IDENTITIES, 'BALANCED_SERVICE'),
        performanceTier: isOneOf(source.performanceTier, CYCLE_PERFORMANCE_TIERS, 'STEADY'),
        subscriberStart: Math.max(0, Math.round(clamp(source.subscriberStart, 0, Number.MAX_SAFE_INTEGER))),
        subscriberEnd: Math.max(0, Math.round(clamp(source.subscriberEnd, 0, Number.MAX_SAFE_INTEGER))),
        subscriberNetMovement: Math.round(clamp(
            source.subscriberNetMovement,
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            0,
        )),
        averageChurnRate: clamp(source.averageChurnRate, 0, 1),
        averageEngagementRate: clamp(source.averageEngagementRate, 0, 1),
        averagePlaybackSuccessRate: clamp(source.averagePlaybackSuccessRate, 0, 100),
        peakCapacityUtilizationPercent: clamp(source.peakCapacityUtilizationPercent, 0, 10_000),
        totalSubscriptionRevenue: Math.max(0, Math.round(clamp(source.totalSubscriptionRevenue, 0, Number.MAX_SAFE_INTEGER))),
        totalCashContribution: Math.round(clamp(
            source.totalCashContribution,
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            0,
        )),
        totalAccountingContribution: Math.round(clamp(
            source.totalAccountingContribution,
            -Number.MAX_SAFE_INTEGER,
            Number.MAX_SAFE_INTEGER,
            0,
        )),
        technicalVerdict: isOneOf(source.technicalVerdict, TECHNICAL_VERDICTS, 'HEALTHY'),
        rivalMovement: {
            platformId: isOneOf(rivalSource.platformId, PLATFORM_IDS, 'NETFLIX'),
            platformName: cleanText(rivalSource.platformName, 'Market leader', 80),
            pressure: isOneOf(rivalSource.pressure, RIVAL_PRESSURES, 'MEDIUM'),
            signal: cleanText(rivalSource.signal, 'The competitive field is holding its position.', 220),
        },
        hits: uniqueStrings(source.hits, 4),
        misses: uniqueStrings(source.misses, 4),
        headline: cleanText(source.headline, 'The operating cycle is complete.', 160),
        boardVerdict: cleanText(source.boardVerdict, 'The company remains under active review.', 240),
        nextMandate: cleanText(source.nextMandate, 'Protect audience trust through the next cycle.', 220),
        acknowledgedAtAbsoluteWeek:
            source.acknowledgedAtAbsoluteWeek === null || source.acknowledgedAtAbsoluteWeek === undefined
                ? null
                : Math.max(0, Math.round(clamp(source.acknowledgedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
    };
};

const normalizeMetadata = (value: unknown): Record<string, string | number | boolean | null> | undefined => {
    const source = asRecord(value);
    const entries = Object.entries(source)
        .slice(0, 16)
        .flatMap(([key, item]) => {
            if (item === null || typeof item === 'boolean') return [[cleanText(key, '', 60), item] as const];
            if (typeof item === 'number' && Number.isFinite(item)) return [[cleanText(key, '', 60), item] as const];
            if (typeof item === 'string') return [[cleanText(key, '', 60), cleanText(item, '', 180)] as const];
            return [];
        })
        .filter(([key]) => Boolean(key));
    return entries.length ? Object.fromEntries(entries) : undefined;
};

const normalizeLedgerEntry = (value: unknown): OwnedStreamingLedgerEntry | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    if (!idempotencyKey) return null;
    const absoluteWeek = Math.max(0, Math.round(clamp(source.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const type = isOneOf(source.type, LEDGER_EVENT_TYPES, 'SYSTEM_REPAIR');
    return {
        id: cleanText(source.id, createDeterministicId('streaming_event', idempotencyKey), 100),
        idempotencyKey,
        absoluteWeek,
        type,
        summary: cleanText(source.summary, 'Streaming platform state updated.', 220),
        source: isOneOf(source.source, ['MIGRATION', 'FOUNDING', 'WEEK_PROCESSOR', 'PLAYER_ACTION', 'SYSTEM'] as const, 'SYSTEM'),
        metadata: normalizeMetadata(source.metadata),
    };
};

const normalizeCinematicEvent = (value: unknown): OwnedStreamingCinematicEvent | null => {
    const source = asRecord(value);
    const idempotencyKey = cleanText(source.idempotencyKey, '', 180);
    const factIds = uniqueStrings(source.factIds, 12);
    if (!idempotencyKey || !factIds.length) return null;
    return {
        id: cleanText(source.id, createDeterministicId('streaming_scene', idempotencyKey), 100),
        idempotencyKey,
        type: isOneOf(source.type, CINEMATIC_TYPES, 'MILESTONE'),
        status: isOneOf(source.status, ['QUEUED', 'VIEWED', 'DISMISSED'] as const, 'QUEUED'),
        priority: isOneOf(source.priority, ['STANDARD', 'IMPORTANT', 'MAJOR'] as const, 'STANDARD'),
        availableAtAbsoluteWeek: Math.max(0, Math.round(clamp(source.availableAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        title: cleanText(source.title, 'EMPIRE+ Moment', 120),
        factIds,
    };
};

const dedupeByKey = <T,>(items: T[], getKey: (item: T) => string): T[] => {
    const byKey = new Map<string, T>();
    items.forEach(item => byKey.set(getKey(item), item));
    return Array.from(byKey.values());
};

export const normalizeOwnedStreamingPlatformState = (
    value: unknown,
    playerId = 'player',
    protectedRivalMoveIds: ReadonlySet<string> = new Set(),
): OwnedStreamingPlatformState => {
    const defaults = createOwnedStreamingPlatformState(playerId);
    const source = asRecord(value);
    const sourceVersion = Math.max(0, Math.round(clamp(
        source.schemaVersion,
        0,
        Number.MAX_SAFE_INTEGER,
        0,
    )));
    const founderOwnershipPercent = clamp(
        source.founderOwnershipPercent,
        0,
        100,
        defaults.founderOwnershipPercent,
    );
    const debtPrincipal = Math.round(clamp(source.debtPrincipal, 0, Number.MAX_SAFE_INTEGER));
    const foundingProfile = normalizeFoundingProfile(
        source.foundingProfile,
        founderOwnershipPercent,
    );
    const leadership = normalizeLeadership(source.leadership, foundingProfile);
    const finance = normalizeFinance(source.finance, foundingProfile, debtPrincipal);
    const identitySource = asRecord(source.identity);
    const identityName = cleanText(identitySource.name, '', 60);
    const technologySource = asRecord(source.technologyLevels);
    const cinematicCandidates = dedupeByKey(
        asArray<unknown>(source.cinematicQueue)
            .map(normalizeCinematicEvent)
            .filter((event): event is OwnedStreamingCinematicEvent => Boolean(event)),
        event => event.idempotencyKey,
    ).slice(-OWNED_STREAMING_CINEMATIC_QUEUE_LIMIT);
    const requestedFactIds = new Set(cinematicCandidates.flatMap(event => event.factIds));
    const ledgerCandidates = dedupeByKey(
        asArray<unknown>(source.eventLedger)
            .map(normalizeLedgerEntry)
            .filter((entry): entry is OwnedStreamingLedgerEntry => Boolean(entry)),
        entry => entry.idempotencyKey,
    );
    const eventLedger = dedupeByKey([
        ...ledgerCandidates.slice(-OWNED_STREAMING_EVENT_LEDGER_LIMIT),
        ...ledgerCandidates.filter(entry => requestedFactIds.has(entry.id)),
    ], entry => entry.idempotencyKey).slice(-OWNED_STREAMING_EVENT_LEDGER_LIMIT);
    const validFactIds = new Set(eventLedger.map(entry => entry.id));
    const canonicalFoundation = normalizeStreamingCanonicalFoundation(source);
    const normalizedIdentity: OwnedStreamingPlatformState['identity'] = identityName
        ? {
            name: identityName,
            slug: cleanText(identitySource.slug, identityName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), 70),
            primaryColor: cleanText(identitySource.primaryColor, '#7C3AED', 20),
            secondaryColor: cleanText(identitySource.secondaryColor, '#111827', 20),
            logoKey: isOneOf(identitySource.logoKey, LOGO_KEYS, 'FRAME_PLAY'),
            visualMarkId: cleanText(identitySource.visualMarkId, 'BOLT', 40).toUpperCase(),
            customMarkDataUrl: cleanCustomMarkDataUrl(identitySource.customMarkDataUrl),
            wordmarkStyleId: isOneOf(identitySource.wordmarkStyleId, WORDMARK_STYLE_IDS, 'SIDE'),
            typefaceId: isOneOf(identitySource.typefaceId, TYPEFACE_IDS, 'GROTESK'),
            brandPromiseId: isOneOf(identitySource.brandPromiseId, BRAND_PROMISE_IDS, 'BALANCED'),
            publicManifesto: cleanText(identitySource.publicManifesto, '', 160),
            foundedAtAbsoluteWeek: Math.max(0, Math.round(clamp(identitySource.foundedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        }
        : null;
    if (normalizedIdentity && SOUND_IDENT_KEYS.includes(identitySource.soundIdentKey as StreamingSoundIdentKey)) {
        normalizedIdentity.soundIdentKey = identitySource.soundIdentKey as StreamingSoundIdentKey;
    }
    const legacyDayOneMarketIds = normalizeStreamingDayOneMarketIds(identitySource.dayOneMarketIds);
    if (normalizedIdentity && legacyDayOneMarketIds.length) normalizedIdentity.dayOneMarketIds = legacyDayOneMarketIds;
    const legacyLaunchServerCityId = cleanText(identitySource.launchServerCityId, '', 24) || null;
    if (normalizedIdentity && legacyLaunchServerCityId) normalizedIdentity.launchServerCityId = legacyLaunchServerCityId;

    return {
        schemaVersion: OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
        lifecycle: isOneOf(source.lifecycle, LIFECYCLES, defaults.lifecycle),
        identity: normalizedIdentity,
        foundingDraft: normalizeFoundingDraft(source.foundingDraft, sourceVersion),
        foundingProfile,
        leadership,
        governance: normalizeGovernance(source.governance),
        competitiveWorld: normalizeCompetitiveWorld(source.competitiveWorld, protectedRivalMoveIds),
        corporateDevelopment: normalizeCorporateDevelopment(source.corporateDevelopment),
        publicCompany: normalizePublicCompany(source.publicCompany),
        crisisSecurity: normalizeCrisisSecurity(source.crisisSecurity),
        legacy: normalizeLegacyState(
            source.legacy,
            Math.max(0, Math.round(clamp(identitySource.foundedAtAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        ),
        finance,
        ...canonicalFoundation,
        hqOnboarding: normalizeHqOnboarding(source.hqOnboarding),
        infrastructureSetupDraft: normalizeInfrastructureSetupDraft(source.infrastructureSetupDraft),
        infrastructureSetup: normalizeInfrastructureSetup(source.infrastructureSetup),
        technologyProjects: dedupeByKey(
            asArray<unknown>(source.technologyProjects)
                .map(normalizeTechnologyProject)
                .filter((project): project is OwnedStreamingTechnologyProject => Boolean(project)),
            project => project.id,
        ).slice(-120),
        researchPrograms: dedupeByKey(
            asArray<unknown>(source.researchPrograms)
                .map(normalizeResearchProgram)
                .filter((program): program is OwnedStreamingResearchProgram => Boolean(program)),
            program => program.definitionId,
        ).slice(-40),
        campusProjects: dedupeByKey(
            asArray<unknown>(source.campusProjects)
                .map(normalizeCampusProject)
                .filter((project): project is OwnedStreamingCampusProject => Boolean(project)),
            project => project.id,
        ).slice(-12),
        productLines: dedupeByKey(
            asArray<unknown>(source.productLines)
                .map(normalizeProductLine)
                .filter((line): line is OwnedStreamingProductLine => Boolean(line)),
            line => line.lineId,
        ).slice(-OWNED_STREAMING_PRODUCT_LINE_LIMIT),
        catalogSetupDraft: normalizeCatalogSetupDraft(source.catalogSetupDraft),
        starterCatalog: normalizeStarterCatalog(source.starterCatalog),
        catalogLicenses: dedupeByKey(
            asArray<unknown>(source.catalogLicenses)
                .map(normalizeCatalogLicense)
                .filter((license): license is OwnedStreamingCatalogLicense => Boolean(license)),
            license => license.id,
        ).slice(-OWNED_STREAMING_CATALOG_REFERENCE_LIMIT),
        rightsNegotiations: dedupeByKey(
            asArray<unknown>(source.rightsNegotiations)
                .map(normalizeRightsNegotiation)
                .filter((negotiation): negotiation is OwnedStreamingRightsNegotiation => Boolean(negotiation)),
            negotiation => negotiation.id,
        ).slice(-80),
        sublicenseDeals: dedupeByKey(
            asArray<unknown>(source.sublicenseDeals)
                .map(normalizeSublicenseDeal)
                .filter((deal): deal is OwnedStreamingSublicenseDeal => Boolean(deal)),
            deal => deal.id,
        ).slice(-80),
        rightsObligations: dedupeByKey(
            asArray<unknown>(source.rightsObligations)
                .map(normalizeRightsObligation)
                .filter((obligation): obligation is OwnedStreamingRightsObligation => Boolean(obligation)),
            obligation => obligation.id,
        ).slice(-160),
        originalCommissionDraft: normalizeOriginalCommissionDraft(source.originalCommissionDraft),
        originalCommissions: dedupeByKey(
            asArray<unknown>(source.originalCommissions)
                .map(normalizeOriginalCommission)
                .filter((commission): commission is OwnedStreamingOriginalCommission => Boolean(commission)),
            commission => commission.id,
        ).slice(-40),
        launchSlateDraft: normalizeLaunchSlate(source.launchSlateDraft),
        launchSlate: normalizeLaunchSlate(source.launchSlate),
        launchCommit: normalizeLaunchCommit(source.launchCommit),
        subscriptionPrices: normalizeSubscriptionPrices(source.subscriptionPrices),
        founderOwnershipPercent,
        treasuryCash: Math.round(clamp(source.treasuryCash, 0, Number.MAX_SAFE_INTEGER)),
        debtPrincipal,
        infrastructureStrategy: isOneOf(source.infrastructureStrategy, INFRASTRUCTURE_STRATEGIES, defaults.infrastructureStrategy),
        capacity: {
            baselineConcurrentStreams: Math.round(clamp(asRecord(source.capacity).baselineConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
            burstConcurrentStreams: Math.round(clamp(asRecord(source.capacity).burstConcurrentStreams, 0, Number.MAX_SAFE_INTEGER)),
        },
        technologyLevels: Object.fromEntries(
            TECHNOLOGY_BRANCHES.map(branch => [branch, Math.round(clamp(technologySource[branch], 0, 100))]),
        ) as Record<StreamingTechnologyBranch, number>,
        metrics: normalizeMetrics(source.metrics),
        catalogProjectIds: uniqueStrings(source.catalogProjectIds, OWNED_STREAMING_CATALOG_REFERENCE_LIMIT),
        simulationSeed: cleanText(source.simulationSeed, defaults.simulationSeed, 120) || defaults.simulationSeed,
        lastProcessedAbsoluteWeek: source.lastProcessedAbsoluteWeek === null || source.lastProcessedAbsoluteWeek === undefined
            ? null
            : Math.max(0, Math.round(clamp(source.lastProcessedAbsoluteWeek, 0, Number.MAX_SAFE_INTEGER))),
        processedWeekKeys: uniqueStrings(source.processedWeekKeys, OWNED_STREAMING_PROCESSED_WEEK_LIMIT),
        weeklyDecisions: dedupeByKey(
            asArray<unknown>(source.weeklyDecisions)
                .map(normalizeWeeklyDecision)
                .filter((decision): decision is OwnedStreamingWeeklyDecision => Boolean(decision)),
            decision => decision.idempotencyKey,
        ).sort((a, b) => a.targetAbsoluteWeek - b.targetAbsoluteWeek)
            .slice(-OWNED_STREAMING_WEEKLY_DECISION_LIMIT),
        growthActions: dedupeByKey(
            asArray<unknown>(source.growthActions)
                .map(normalizeGrowthAction)
                .filter((action): action is OwnedStreamingGrowthAction => Boolean(action)),
            action => action.idempotencyKey,
        ).sort((a, b) => a.targetAbsoluteWeek - b.targetAbsoluteWeek)
            .slice(-OWNED_STREAMING_GROWTH_ACTION_LIMIT),
        lastAcknowledgedWeeklyReportAbsoluteWeek:
            source.lastAcknowledgedWeeklyReportAbsoluteWeek === null
            || source.lastAcknowledgedWeeklyReportAbsoluteWeek === undefined
                ? null
                : Math.max(0, Math.round(clamp(
                    source.lastAcknowledgedWeeklyReportAbsoluteWeek,
                    0,
                    Number.MAX_SAFE_INTEGER,
                ))),
        weeklyHistory: dedupeByKey(
            asArray<unknown>(source.weeklyHistory)
                .map(normalizeSnapshot)
                .filter((snapshot): snapshot is OwnedStreamingWeeklySnapshot => Boolean(snapshot)),
            snapshot => String(snapshot.absoluteWeek),
        ).sort((a, b) => a.absoluteWeek - b.absoluteWeek).slice(-OWNED_STREAMING_WEEKLY_HISTORY_LIMIT),
        cycleReviews: dedupeByKey(
            asArray<unknown>(source.cycleReviews)
                .map(normalizeCycleReview)
                .filter((review): review is OwnedStreamingCycleReview => Boolean(review)),
            review => review.idempotencyKey,
        ).sort((a, b) => a.endAbsoluteWeek - b.endAbsoluteWeek)
            .slice(-OWNED_STREAMING_CYCLE_REVIEW_LIMIT),
        eventLedger,
        cinematicQueue: cinematicCandidates.filter(event => (
            event.factIds.some(factId => validFactIds.has(factId))
        )),
        milestoneKeys: uniqueStrings(source.milestoneKeys, OWNED_STREAMING_MILESTONE_LIMIT),
    };
};

export const compactOwnedStreamingPlatformForPersistence = (
    value: unknown,
    playerId = 'player',
    protectedRivalMoveIds: ReadonlySet<string> = new Set(),
): OwnedStreamingPlatformState => {
    const normalized = normalizeOwnedStreamingPlatformState(value, playerId, protectedRivalMoveIds);
    const referencedFactIds = new Set(normalized.cinematicQueue.flatMap(event => event.factIds));
    const retainedLedger = dedupeByKey([
        ...normalized.eventLedger.slice(-OWNED_STREAMING_EVENT_LEDGER_LIMIT),
        ...normalized.eventLedger.filter(entry => referencedFactIds.has(entry.id)),
    ], entry => entry.idempotencyKey).slice(-OWNED_STREAMING_EVENT_LEDGER_LIMIT);
    return {
        ...normalized,
        leadership: {
            ...normalized.leadership,
            appointments: normalized.leadership.appointments.slice(-OWNED_STREAMING_EXECUTIVE_APPOINTMENT_LIMIT),
            developmentPrograms: normalized.leadership.developmentPrograms.slice(-OWNED_STREAMING_EXECUTIVE_DEVELOPMENT_LIMIT),
        },
        governance: {
            ...normalized.governance,
            directors: normalized.governance.directors.slice(-OWNED_STREAMING_BOARD_DIRECTOR_LIMIT),
            motions: normalized.governance.motions.slice(-OWNED_STREAMING_BOARD_MOTION_LIMIT),
            celebrityInvestors: normalized.governance.celebrityInvestors.slice(-OWNED_STREAMING_CELEBRITY_INVESTOR_LIMIT),
        },
        competitiveWorld: {
            ...normalized.competitiveWorld,
            rivals: normalized.competitiveWorld.rivals.slice(0, PLATFORM_IDS.length),
            // normalizeCompetitiveWorld already applies the regular history bound while
            // retaining any older moves referenced by authoritative Platform AI
            // commitments. Slicing again here would silently orphan those commitments
            // on the next save round trip.
            moves: normalized.competitiveWorld.moves,
            weeklyRivalHistory: normalized.competitiveWorld.weeklyRivalHistory.slice(-OWNED_STREAMING_WEEKLY_HISTORY_LIMIT * PLATFORM_IDS.length),
            regionalLaunches: normalized.competitiveWorld.regionalLaunches.slice(0, REGION_IDS.length),
            marketShareHistory: normalized.competitiveWorld.marketShareHistory.slice(-OWNED_STREAMING_MARKET_SHARE_HISTORY_LIMIT),
            awardSeasons: normalized.competitiveWorld.awardSeasons.slice(-OWNED_STREAMING_AWARD_SEASON_LIMIT),
        },
        corporateDevelopment: {
            acquisitionCases: normalized.corporateDevelopment.acquisitionCases.slice(-OWNED_STREAMING_ACQUISITION_CASE_LIMIT),
            integrations: normalized.corporateDevelopment.integrations.slice(-OWNED_STREAMING_INTEGRATION_LIMIT),
            acquiredPlatformIds: normalized.corporateDevelopment.acquiredPlatformIds.slice(0, PLATFORM_IDS.length),
        },
        publicCompany: {
            ...normalized.publicCompany,
            quoteHistory: normalized.publicCompany.quoteHistory.slice(-104),
            guidance: normalized.publicCompany.guidance.slice(-24),
            earnings: normalized.publicCompany.earnings.slice(-24),
            shareholderVotes: normalized.publicCompany.shareholderVotes.slice(-32),
            activistCampaigns: normalized.publicCompany.activistCampaigns.slice(-16),
            hostileTakeovers: normalized.publicCompany.hostileTakeovers.slice(-12),
        },
        crisisSecurity: {
            ...normalized.crisisSecurity,
            crises: normalized.crisisSecurity.crises.slice(-OWNED_STREAMING_CRISIS_LIMIT),
            shadowOperations: normalized.crisisSecurity.shadowOperations.slice(-OWNED_STREAMING_SHADOW_OPERATION_LIMIT),
            trustInitiatives: normalized.crisisSecurity.trustInitiatives.slice(-OWNED_STREAMING_TRUST_INITIATIVE_LIMIT),
            regulatoryCases: normalized.crisisSecurity.regulatoryCases.slice(-OWNED_STREAMING_OVERSIGHT_CASE_LIMIT),
            whistleblowerReports: normalized.crisisSecurity.whistleblowerReports.slice(-OWNED_STREAMING_OVERSIGHT_CASE_LIMIT),
            infrastructureOperations: {
                ...normalized.crisisSecurity.infrastructureOperations,
                incidents: normalized.crisisSecurity.infrastructureOperations.incidents.slice(-OWNED_STREAMING_INFRASTRUCTURE_INCIDENT_LIMIT),
            },
        },
        legacy: {
            ...normalized.legacy,
            closedEras: normalized.legacy.closedEras.slice(-OWNED_STREAMING_CLOSED_ERA_LIMIT),
            montages: normalized.legacy.montages.slice(-OWNED_STREAMING_LEGACY_MONTAGE_LIMIT),
        },
        finance: {
            capitalActions: normalized.finance.capitalActions.slice(-OWNED_STREAMING_CAPITAL_ACTION_LIMIT),
            loans: normalized.finance.loans.slice(-OWNED_STREAMING_LOAN_LIMIT),
            equityHolders: normalized.finance.equityHolders.slice(-OWNED_STREAMING_EQUITY_HOLDER_LIMIT),
        },
        eventLedger: retainedLedger,
        weeklyHistory: normalized.weeklyHistory.slice(-OWNED_STREAMING_WEEKLY_HISTORY_LIMIT),
        cycleReviews: normalized.cycleReviews.slice(-OWNED_STREAMING_CYCLE_REVIEW_LIMIT),
        cinematicQueue: normalized.cinematicQueue.slice(-OWNED_STREAMING_CINEMATIC_QUEUE_LIMIT),
        processedWeekKeys: normalized.processedWeekKeys.slice(-OWNED_STREAMING_PROCESSED_WEEK_LIMIT),
        weeklyDecisions: normalized.weeklyDecisions.slice(-OWNED_STREAMING_WEEKLY_DECISION_LIMIT),
        growthActions: normalized.growthActions.slice(-OWNED_STREAMING_GROWTH_ACTION_LIMIT),
        productLines: normalized.productLines.slice(-OWNED_STREAMING_PRODUCT_LINE_LIMIT),
        milestoneKeys: normalized.milestoneKeys.slice(-OWNED_STREAMING_MILESTONE_LIMIT),
    };
};

export interface OwnedStreamingFoundationWeekInput {
    absoluteWeek: number;
    causeMarkers?: string[];
}

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<OwnedStreamingPlatformLifecycle, OwnedStreamingPlatformLifecycle[]> = {
    LOCKED: ['ELIGIBLE'],
    ELIGIBLE: ['FOUNDING'],
    FOUNDING: ['ACTIVE'],
    ACTIVE: ['SUSPENDED'],
    SUSPENDED: ['ACTIVE'],
};

export const transitionOwnedStreamingLifecycle = (
    value: OwnedStreamingPlatformState,
    target: OwnedStreamingPlatformLifecycle,
    absoluteWeek: number,
    source: OwnedStreamingLedgerEntry['source'] = 'PLAYER_ACTION',
): OwnedStreamingPlatformState => {
    const current = normalizeOwnedStreamingPlatformState(value);
    if (current.lifecycle === target) return current;
    if (!ALLOWED_LIFECYCLE_TRANSITIONS[current.lifecycle].includes(target)) return current;

    const safeAbsoluteWeek = Math.max(0, Math.round(clamp(absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const idempotencyKey = `lifecycle:${current.lifecycle}:${target}:${safeAbsoluteWeek}`;
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', current.simulationSeed, idempotencyKey),
        idempotencyKey,
        absoluteWeek: safeAbsoluteWeek,
        type: 'LIFECYCLE_CHANGED',
        summary: `Streaming platform lifecycle changed from ${current.lifecycle} to ${target}.`,
        source,
        metadata: {
            from: current.lifecycle,
            to: target,
        },
    };

    return compactOwnedStreamingPlatformForPersistence({
        ...current,
        lifecycle: target,
        eventLedger: [...current.eventLedger, ledgerEntry],
        milestoneKeys: target === 'ELIGIBLE'
            ? [...current.milestoneKeys, 'streaming-launch-clearance']
            : current.milestoneKeys,
    });
};

/**
 * Records one idempotent checkpoint using already-committed metrics. Phase 10
 * can call this after its economic simulation; Phase 1 deliberately does not
 * connect it to the live game loop.
 */
export const commitOwnedStreamingFoundationWeek = (
    value: OwnedStreamingPlatformState,
    input: OwnedStreamingFoundationWeekInput,
): OwnedStreamingPlatformState => {
    const current = normalizeOwnedStreamingPlatformState(value);
    if (current.lifecycle !== 'ACTIVE') return current;

    const absoluteWeek = Math.max(0, Math.round(clamp(input.absoluteWeek, 0, Number.MAX_SAFE_INTEGER)));
    const weekKey = `owned-streaming-week:${absoluteWeek}`;
    if (current.processedWeekKeys.includes(weekKey)) return current;

    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', current.simulationSeed, weekKey),
        idempotencyKey: weekKey,
        absoluteWeek,
        type: 'WEEK_CHECKPOINT',
        summary: 'Weekly platform metrics committed.',
        source: 'WEEK_PROCESSOR',
        metadata: { schemaVersion: OWNED_STREAMING_PLATFORM_SCHEMA_VERSION },
    };
    const snapshot: OwnedStreamingWeeklySnapshot = {
        id: createDeterministicId('streaming_snapshot', current.simulationSeed, absoluteWeek),
        absoluteWeek,
        ...current.metrics,
        causeMarkers: uniqueStrings(input.causeMarkers, 8),
    };

    return compactOwnedStreamingPlatformForPersistence({
        ...current,
        lastProcessedAbsoluteWeek: absoluteWeek,
        processedWeekKeys: [...current.processedWeekKeys, weekKey],
        weeklyHistory: [...current.weeklyHistory, snapshot],
        eventLedger: [...current.eventLedger, ledgerEntry],
    });
};

export interface QueueOwnedStreamingCinematicInput {
    idempotencyKey: string;
    type: OwnedStreamingCinematicType;
    priority: OwnedStreamingCinematicEvent['priority'];
    availableAtAbsoluteWeek: number;
    title: string;
    factIds: string[];
}

export const queueOwnedStreamingCinematic = (
    value: OwnedStreamingPlatformState,
    input: QueueOwnedStreamingCinematicInput,
): OwnedStreamingPlatformState => {
    const current = normalizeOwnedStreamingPlatformState(value);
    const idempotencyKey = cleanText(input.idempotencyKey, '', 180);
    if (!idempotencyKey || current.cinematicQueue.some(event => event.idempotencyKey === idempotencyKey)) return current;

    const knownFactIds = new Set(current.eventLedger.map(entry => entry.id));
    const factIds = uniqueStrings(input.factIds, 12).filter(factId => knownFactIds.has(factId));
    if (!factIds.length) return current;

    const cinematic: OwnedStreamingCinematicEvent = {
        id: createDeterministicId('streaming_scene', current.simulationSeed, idempotencyKey),
        idempotencyKey,
        type: input.type,
        status: 'QUEUED',
        priority: input.priority,
        availableAtAbsoluteWeek: Math.max(0, Math.round(input.availableAtAbsoluteWeek)),
        title: cleanText(input.title, 'EMPIRE+ Moment', 120),
        factIds,
    };
    const ledgerEntry: OwnedStreamingLedgerEntry = {
        id: createDeterministicId('streaming_event', current.simulationSeed, `cinematic:${idempotencyKey}`),
        idempotencyKey: `cinematic:${idempotencyKey}`,
        absoluteWeek: cinematic.availableAtAbsoluteWeek,
        type: 'CINEMATIC_QUEUED',
        summary: `${cinematic.title} queued.`,
        source: 'SYSTEM',
        metadata: { cinematicId: cinematic.id },
    };

    return compactOwnedStreamingPlatformForPersistence({
        ...current,
        cinematicQueue: [...current.cinematicQueue, cinematic],
        eventLedger: [...current.eventLedger, ledgerEntry],
    });
};

export const markOwnedStreamingCinematicStatus = (
    value: OwnedStreamingPlatformState,
    cinematicId: string,
    status: 'VIEWED' | 'DISMISSED',
): OwnedStreamingPlatformState => {
    const current = normalizeOwnedStreamingPlatformState(value);
    const cleanId = cleanText(cinematicId, '', 100);
    if (!cleanId) return current;
    const target = current.cinematicQueue.find(event => event.id === cleanId);
    if (!target || target.status !== 'QUEUED') return current;
    return compactOwnedStreamingPlatformForPersistence({
        ...current,
        cinematicQueue: current.cinematicQueue.map(event => (
            event.id === cleanId ? { ...event, status } : event
        )),
    });
};
