
// Enums & Basic Types
export enum Page {
  HOME = 'HOME',
  CAREER = 'CAREER',
  IMPROVE = 'IMPROVE',
  SOCIAL = 'SOCIAL',
  LIFESTYLE = 'LIFESTYLE',
  MOBILE = 'MOBILE',
  SETTINGS = 'SETTINGS',
  STORE = 'STORE'
}

export type Gender = 'MALE' | 'FEMALE' | 'NON_BINARY' | 'ALL';
export type PregnancyCarrier = 'PLAYER' | 'PARTNER' | 'NONE';
export type Genre = 'ACTION' | 'DRAMA' | 'COMEDY' | 'ROMANCE' | 'THRILLER' | 'MYSTERY' | 'HORROR' | 'SCI_FI' | 'ADVENTURE' | 'SUPERHERO' | 'MUSICAL' | 'BIOPIC' | 'SPORTS' | 'ANIMATION' | 'FANTASY' | 'CRIME' | 'DOCUMENTARY';
export type RoleType = 'MINOR' | 'CAMEO' | 'SUPPORTING' | 'ENSEMBLE' | 'LEAD';
export type CharacterStoryRole = 'HERO' | 'ANTI_HERO' | 'VILLAIN' | 'ALLY' | 'CIVILIAN' | 'OTHER';
export type CharacterAbilityType = 'NONE' | 'TRAINED' | 'TECH' | 'MAGIC' | 'SUPERNATURAL' | 'SUPERPOWERED';
export type CharacterStoryFunction = 'PROTAGONIST' | 'ANTAGONIST' | 'DEUTERAGONIST' | 'RIVAL' | 'MENTOR' | 'ALLY' | 'COMIC_RELIEF' | 'CIVILIAN' | 'OTHER';
export type CharacterNature = 'HUMAN' | 'ROBOT' | 'ALIEN' | 'CREATURE' | 'SPIRIT' | 'OTHER';
export type CharacterIdentitySource = 'AUTO' | 'PLAYER' | 'CANON' | 'AUTHOR_INTENT';
export type StoryPerspective = 'PROTAGONIST_LED' | 'VILLAIN_LED' | 'DUAL' | 'ENSEMBLE';
export type StoryConflictSource = 'ANTAGONIST' | 'RIVAL' | 'INTERNAL' | 'SOCIETY' | 'NATURE' | 'MYSTERY';
export type StoryWorldRule = 'GROUNDED' | 'TECHNOLOGY' | 'MAGIC' | 'SUPERNATURAL' | 'SUPERPOWERED' | 'MIXED';
export type StoryTone = 'HEROIC' | 'MORALLY_GREY' | 'DARK' | 'TRAGIC' | 'COMEDIC';
export type StoryCastShape = 'INTIMATE' | 'BALANCED' | 'ENSEMBLE';

export interface StoryCompass {
    perspective: StoryPerspective;
    conflictSource: StoryConflictSource;
    worldRule: StoryWorldRule;
    tone: StoryTone;
    castShape: StoryCastShape;
    flexibility: 'OPEN' | 'ADAPTABLE' | 'PROTECTED';
    source: 'SCRIPT_DNA' | 'AUTHOR_INTENT' | 'MARKET_INFERENCE' | 'CANON';
    confidence: number;
}

export interface CharacterIdentityProfile {
    storyFunction: CharacterStoryFunction;
    storyRole: CharacterStoryRole;
    abilityType: CharacterAbilityType;
    nature: CharacterNature;
    identitySource: CharacterIdentitySource;
}

export type CharacterStoryFitLabel = 'NATURAL_FIT' | 'BOLD_INTERPRETATION' | 'STORY_CONFLICT';

export interface CharacterStoryFit {
    score: number;
    label: CharacterStoryFitLabel;
    qualityAdjustment: number;
    summary: string;
    strengths: string[];
    warnings: string[];
}

export type CastStoryArchetype =
    | 'HERO_TEAM_VS_VILLAIN'
    | 'HERO_VS_VILLAIN'
    | 'VILLAIN_LED'
    | 'RIVALS'
    | 'DUAL_LEADS'
    | 'ENSEMBLE'
    | 'CHARACTER_DRIVEN'
    | 'OPEN_CONFLICT';

export interface CastStoryRead {
    archetype: CastStoryArchetype;
    headline: string;
    summary: string;
    balanceScore: number;
    protagonistCount: number;
    antagonistCount: number;
    heroCount: number;
    villainCount: number;
    allyCount: number;
    warnings: string[];
    strengths: string[];
}

export type BackgroundEnsembleScale = 'LEAN' | 'STORY_FIT' | 'FULL_WORLD' | 'EPIC';
export type BackgroundCastingSource = 'AGENCY' | 'LOCAL' | 'OPEN_CALL' | 'COMMUNITY' | 'SPECIALIST';
export type BackgroundPayStandard = 'COMPLIANT' | 'FAIR_PAY' | 'PREMIUM' | 'COMMUNITY_SUPPORTED';
export type BackgroundCastingControl = 'DEPARTMENT' | 'REVIEW' | 'CUSTOM';

export interface BackgroundCastingPlan {
    version: 1;
    scale: BackgroundEnsembleScale;
    source: BackgroundCastingSource;
    payStandard: BackgroundPayStandard;
    control: BackgroundCastingControl;
    performerCount: number;
    recurringDayPlayers: number;
    specialistRoles: string[];
    estimatedCost: number;
    authenticity: number;
    reliability: number;
    setCare: number;
    localGoodwill: number;
    discoveryPotential: number;
}

export type EnsembleCareerStage =
    | 'UNCREDITED_EXTRA'
    | 'FEATURED_EXTRA'
    | 'DAY_PLAYER'
    | 'MINOR_SPEAKING'
    | 'SUPPORTING'
    | 'ESTABLISHED';

export type EnsembleOriginRole =
    | 'CROWD_PERFORMER'
    | 'TAXI_DRIVER'
    | 'DANCER'
    | 'STUNT_PERFORMER'
    | 'SOLDIER'
    | 'MEDICAL_WORKER'
    | 'REPORTER'
    | 'CREW_ASSISTANT'
    | 'LOCAL_PERFORMER';

export type EnsembleCareerRoute =
    | 'WORKHORSE'
    | 'BREAKOUT'
    | 'PRESTIGE'
    | 'ACTION'
    | 'MUSIC_CROSSOVER'
    | 'CREATOR'
    | 'ADVOCATE';

export interface LivingEnsembleCareerSeed {
    id: string;
    projectId: string;
    projectTitle: string;
    projectGenre: Genre;
    originRole: EnsembleOriginRole;
    originRoleLabel: string;
    originWeek: number;
    originYear: number;
    originAbsoluteWeek: number;
    name: string;
    gender: Gender;
    talent: number;
    ambition: number;
    professionalism: number;
    potential: number;
    treatmentScore: number;
    relationshipWarmth: number;
    route: EnsembleCareerRoute;
    currentStage: EnsembleCareerStage;
    progress: number;
    nextReviewAbsoluteWeek: number;
    breakoutEligible: boolean;
    promotedNpcId?: string;
    storyBeatCount: number;
    lastStoryAbsoluteWeek?: number;
    retired?: boolean;
}

export interface LivingEnsembleStoryRecord {
    id: string;
    seedId: string;
    projectId: string;
    npcId?: string;
    combinationKey: string;
    headline: string;
    subtext: string;
    absoluteWeek: number;
    year: number;
    week: number;
}

export interface LivingEnsembleState {
    version: 1;
    seeds: LivingEnsembleCareerSeed[];
    stories: LivingEnsembleStoryRecord[];
    registeredProjectIds: string[];
    recentCombinationKeys: string[];
    lastProcessedQuarter: number;
}
export type BudgetTier = 'LOW' | 'MID' | 'HIGH' | 'BLOCKBUSTER';
export type TargetAudience = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
export type ProjectType = 'MOVIE' | 'SERIES';
export type ProjectFormat = 'LIVE_ACTION' | 'ANIMATED' | 'ANIME';
export type ScriptSubjectType = 'REAL_PERSON' | 'PUBLIC_FIGURE' | 'ATHLETE' | 'MUSICIAN' | 'CRIMINAL_CASE' | 'HISTORICAL_EVENT' | 'COMPANY' | 'TEAM' | 'FANDOM' | 'UNKNOWN';
export type StudioId = 'PARAMOUNT' | 'HBO' | 'WARNER_BROS' | 'UNIVERSAL' | 'ARTISAN_PICTURES' | 'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE' | 'MARVEL_STUDIOS' | 'DC_STUDIOS' | 'LUCASFILM' | string;
export type UniverseId = 'MCU' | 'DCU' | 'SW' | string;
export type AwardType = 'OSCAR' | 'GOLDEN_GLOBE' | 'EMMY' | 'BAFTA';
export type ClothingCategory = 'OUTFIT' | 'TOP' | 'BOTTOM' | 'SHOES' | 'ACCESSORY';
export type SettableClothingStyle = 'Casual' | 'Premium' | 'Luxury';
export type TransactionCategory = 'SALARY' | 'EXPENSE' | 'ASSET' | 'BUSINESS' | 'DIVIDEND' | 'ROYALTY' | 'SPONSORSHIP' | 'OTHER' | 'AD_REVENUE' | 'LOAN';
export type NewsCategory = 'TOP_STORY' | 'INDUSTRY' | 'YOU' | 'UNIVERSE';
export type SponsorshipCategory = 'FASHION' | 'FITNESS' | 'TECH' | 'BEVERAGE' | 'LUXURY' | 'AUTOMOTIVE';
export type SponsorshipActionType = 'POST' | 'SHOOT';
export type SponsorshipFrequency = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type InstaPostType = 'ANNOUNCEMENT' | 'BTS' | 'CELEBRATION' | 'LIFESTYLE' | 'SELFIE' | 'INDUSTRY_NEWS' | 'REEL' | 'CAROUSEL' | 'RED_CARPET' | 'COUPLE_POST' | 'BRAND_FIT' | 'CONTROVERSIAL';
export type InteractionType = 'GREET' | 'COMPLIMENT' | 'COFFEE' | 'COLLAB' | 'BEFRIEND';
export type YoutubeVideoType = 'VLOG' | 'SKIT' | 'Q_AND_A' | 'TRAILER' | 'COVER' | 'STORYTIME' | 'MUSIC_VIDEO';
export type YoutubeMessageType = 'OFFER_YOUTUBE_COLLAB' | 'OFFER_YOUTUBE_BRAND' | 'OFFER_MUSIC_VIDEO_FEATURE';
export type YoutubeUploadPlan = 'SAFE' | 'VIRAL_BAIT' | 'BTS' | 'PROJECT_PROMO' | 'SPONSOR_HEAVY';
export type YoutubeMerchTier = 'BASIC' | 'PREMIUM' | 'LUXURY';
export type YoutubeMerchResult = 'SOLD_OUT' | 'PROFIT' | 'UNDERPERFORMED';
export type YoutubeCreatorIdentity = 'ACTOR_VLOGGER' | 'CHAOS_CREATOR' | 'PRESTIGE_FILMMAKER' | 'LIFESTYLE_ICON' | 'CONTROVERSY_MAGNET';
export type BusinessType = 'RESTAURANT' | 'CAFE' | 'FASHION' | 'FITNESS' | 'MERCH' | 'PRODUCTION_HOUSE';
export type BusinessSubtype = 'FAST_FOOD' | 'CASUAL_DINING' | 'FINE_DINING' | 'COFFEE_SHOP' | 'ARTISAN_BAKERY' | 'STREETWEAR' | 'LUXURY_BRAND' | 'LOCAL_GYM' | 'WELLNESS_STUDIO' | 'ONLINE_STORE' | 'INDIE_STUDIO' | 'MAJOR_STUDIO';
export type StudioArchetype = 'LEGACY' | 'PRESTIGE' | 'PLATFORM' | 'UNIVERSE_ARCHITECT';
export type ScriptStatus = 'CONCEPT' | 'IN_DEVELOPMENT' | 'READY' | 'PRODUCED';
export type PlatformId = 'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE';
export type StreamingEcosystemOperatorKind = 'CORE_GLOBAL' | 'GLOBAL_REAL' | 'REGIONAL_REAL' | 'DYNAMIC_FICTIONAL';
export type StreamingEcosystemOrigin = 'BOOTSTRAPPED' | 'VENTURE_BACKED' | 'TELECOM_BACKED' | 'BROADCASTER_BACKED' | 'STUDIO_SPINOFF' | 'TECH_BACKED' | 'CONGLOMERATE_BACKED' | 'CELEBRITY_FOUNDED';
export type StreamingEcosystemLifecycle = 'ACTIVE' | 'DISTRESSED' | 'ACQUIRED' | 'CLOSED';
export type StreamingEcosystemStartingClass = 'LOCAL_STARTUP' | 'REGIONAL_CHALLENGER' | 'CORPORATE_ENTRANT' | 'GLOBAL_ENTRANT';

export type StreamingPlatformBrandMarkKind = 'LOCAL_ASSET' | 'VECTOR_MARK' | 'WORDMARK' | 'MONOGRAM';

export interface StreamingGeneratedBrandIdentity {
    schemaVersion: 1;
    primaryColor: string;
    secondaryColor: string;
    surfaceColor: string;
    onPrimaryColor: string;
    markId: string;
    typefaceId: StreamingTypefaceId;
    lockupId: StreamingWordmarkStyleId;
}

export type StreamingOperatorBrand =
    | { source: 'REAL_REGISTRY'; registryKey: string }
    | { source: 'GENERATED'; identity: StreamingGeneratedBrandIdentity };

export interface StreamingPlatformBrandPresentation {
    platformId: string;
    displayName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColors: string[];
    surfaceColor: string;
    onPrimaryColor: string;
    onSurfaceColor: string;
    markKind: StreamingPlatformBrandMarkKind;
    markKey: string;
    typefaceId: StreamingTypefaceId;
    lockupId: StreamingWordmarkStyleId;
}

export interface StreamingEcosystemLanguageCapability {
    languageId: string;
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
}

export interface StreamingEcosystemOperator {
    id: string;
    name: string;
    kind: StreamingEcosystemOperatorKind;
    corePlatformId: PlatformId | null;
    brand: StreamingOperatorBrand;
    origin: StreamingEcosystemOrigin;
    startingClass: StreamingEcosystemStartingClass;
    homeCountryId: string;
    lifecycle: StreamingEcosystemLifecycle;
    foundedAtAbsoluteWeek: number;
    cashMillions: number;
    valuationBillions: number;
    subscriberMillions: number;
    technology: number;
    cataloguePower: number;
    localization: number;
    brandPower: number;
    prestige: number;
    efficiency: number;
    risk: number;
    preferredGenres: Genre[];
    languageCapabilities: StreamingEcosystemLanguageCapability[];
    activeCountryIds: string[];
    marketMomentum: Record<string, number>;
    visibilityQualifyingWeeks: Record<string, number>;
    belowVisibilityWeeks: Record<string, number>;
    consecutiveStressWeeks: number;
    lastMaterialChangeAtAbsoluteWeek: number;
    /** Optional only at legacy-save and fixture boundaries; normalization materializes it. */
    lastProcessedAbsoluteWeek?: number;
    /** Private B2/B3 decision memory; never a canonical rights registry. */
    intelligence?: IndustryIntelligenceState;
}

export interface StreamingEcosystemMarketShare {
    operatorId: string;
    sharePercent: number;
}

export interface StreamingEcosystemMarket {
    countryId: string;
    shares: StreamingEcosystemMarketShare[];
    othersSharePercent: number;
    visibleOperatorIds: string[];
    lastRebalancedAtAbsoluteWeek: number;
}

export interface StreamingEcosystemEvent {
    id: string;
    absoluteWeek: number;
    operatorId: string;
    type: 'LAUNCH' | 'PROMOTED' | 'EXPANSION' | 'DISTRESS' | 'RECOVERY' | 'ACQUIRED' | 'CLOSED';
    headline: string;
    detail: string;
    countryId: string | null;
}

export type IndustryEventImportance = 'LOW' | 'MEDIUM' | 'HIGH';

export type IndustryEventType =
    | 'COMPANY_LAUNCHED'
    | 'COMPANY_PROMOTED'
    | 'COMPANY_EXPANDED'
    | 'COMPANY_DISTRESS'
    | 'COMPANY_RECOVERED'
    | 'COMPANY_FUNDED'
    | 'COMPANY_RESTRUCTURED'
    | 'COMPANY_ACQUIRED'
    | 'COMPANY_CLOSED'
    | 'PROJECT_GREENLIT'
    | 'PROJECT_CAST'
    | 'PROJECT_DELAYED'
    | 'PROJECT_OVERRUN'
    | 'PROJECT_HELD'
    | 'PROJECT_SOLD'
    | 'PROJECT_CANCELLED'
    | 'PROJECT_RELEASE_PLANNED'
    | 'PROJECT_RELEASED'
    | 'PROJECT_HIT'
    | 'PROJECT_FLOP'
    | 'PROJECT_SLEEPER'
    | 'RIGHTS_DEAL'
    | 'RIGHTS_TRANSFER'
    | 'RIGHTS_SALE_ANNOUNCED'
    | 'FRANCHISE_DECISION'
    | 'AWARD_NOMINATED'
    | 'AWARD_WON'
    | 'PARTNERSHIP_REPEATED';

export type IndustryEventEvidenceKind =
    | 'COMPANY'
    | 'PROJECT'
    | 'PRODUCTION'
    | 'PLATFORM'
    | 'RIGHTS_CONTRACT'
    | 'TRANSACTION'
    | 'AWARD'
    | 'TALENT'
    | 'UNIVERSE'
    | 'COUNTRY';

export interface IndustryEventEvidence {
    kind: IndustryEventEvidenceKind;
    id: string;
    metric?: string;
    value?: number | string;
}

export interface IndustryEventFact {
    schemaVersion: 1;
    id: string;
    idempotencyKey: string;
    absoluteWeek: number;
    type: IndustryEventType;
    importance: IndustryEventImportance;
    companyId?: string;
    companyName?: string;
    projectId?: string;
    productionId?: string;
    platformId?: string;
    rightsContractId?: string;
    transactionId?: string;
    awardEventId?: string;
    headline: string;
    detail: string;
    evidence: IndustryEventEvidence[];
}

export interface IndustryEventLedgerState {
    schemaVersion: 1;
    lastProcessedAbsoluteWeek: number;
    lastProjectedAbsoluteWeek: number;
    events: IndustryEventFact[];
    publishedEventKeys: string[];
}

export type IndustryMediaStoryStage =
    | 'EMERGING'
    | 'DEVELOPING'
    | 'CONFIRMED'
    | 'RESOLVED'
    | 'FADED'
    | 'SUPERSEDED';

export type IndustryMediaStoryCategory =
    | 'COMPANY'
    | 'PROJECT_DEVELOPMENT'
    | 'PROJECT_PRODUCTION'
    | 'PROJECT_RELEASE'
    | 'PROJECT_OUTCOME'
    | 'RIGHTS'
    | 'FRANCHISE'
    | 'AWARDS'
    | 'PARTNERSHIP';

export type IndustryMediaChannel = 'NEWS' | 'X' | 'INSTAGRAM' | 'YOUTUBE';

export type IndustryMediaInstitutionKind =
    | 'TRADE'
    | 'BUSINESS'
    | 'PRESTIGE'
    | 'TABLOID'
    | 'STREAMING'
    | 'REGIONAL'
    | 'FANDOM';

export type IndustryMediaPersonalityRole =
    | 'REPORTER'
    | 'INVESTIGATOR'
    | 'BUSINESS_ANALYST'
    | 'CRITIC'
    | 'COLUMNIST'
    | 'COMMENTATOR'
    | 'THEORY_CREATOR';

export type IndustryMediaSignatureRole = 'ANTAGONIST' | 'SUPPORTER';

export type IndustryMediaVoiceArchetype =
    | 'MEASURED'
    | 'INSIDER'
    | 'NUMBERS_FIRST'
    | 'AUTEUR'
    | 'PROVOCATEUR'
    | 'POPULIST'
    | 'FAN_SCHOLAR';

export type IndustryMediaClaimMode = 'FACT' | 'ANALYSIS' | 'OPINION' | 'SPECULATION';

export interface IndustryMediaInstitution {
    schemaVersion: 1;
    id: string;
    name: string;
    shortName: string;
    kind: IndustryMediaInstitutionKind;
    handles: Partial<Record<IndustryMediaChannel, string>>;
    channels: IndustryMediaChannel[];
    homeRegionId: string;
    coveredRegionIds: string[];
    languageIds: string[];
    focusCategories: IndustryMediaStoryCategory[];
    primaryColor: string;
    secondaryColor: string;
    avatar: string;
    credibility: number;
    reach: number;
    access: number;
    sensationalism: number;
    prestige: number;
    isAnchor: boolean;
    isActive: boolean;
}

export interface IndustryMediaPersonality {
    schemaVersion: 1;
    id: string;
    name: string;
    handle: string;
    avatar: string;
    gender: Gender;
    institutionId?: string;
    role: IndustryMediaPersonalityRole;
    voiceArchetype: IndustryMediaVoiceArchetype;
    channels: IndustryMediaChannel[];
    homeRegionId: string;
    languageIds: string[];
    focusCategories: IndustryMediaStoryCategory[];
    preferredGenreIds: string[];
    credibility: number;
    reach: number;
    aggression: number;
    optimism: number;
    humour: number;
    sensationalism: number;
    independence: number;
    baselinePlayerAffinity: number;
    stanceFloor: number;
    stanceCeiling: number;
    signatureRole?: IndustryMediaSignatureRole;
    isAnchor: boolean;
    isActive: boolean;
    verified: boolean;
    lastAppearanceAbsoluteWeek: number;
    recentStoryIds: string[];
}

export interface IndustryMediaSubjectStance {
    id: string;
    personalityId: string;
    subjectKey: string;
    affinity: number;
    lastUpdatedAbsoluteWeek: number;
    lastIndustryEventId?: string;
}

export interface IndustryMediaStoryAssignment {
    id: string;
    storyId: string;
    industryEventId: string;
    channel: IndustryMediaChannel;
    institutionId: string;
    personalityId?: string;
    angle: IndustryMediaClaimMode;
    assignedAbsoluteWeek: number;
    lastUsedAbsoluteWeek: number;
}

export type IndustryMediaDiscussionStatus = 'OPEN' | 'RESPONDED' | 'RESOLVED' | 'CLOSED';
export type IndustryMediaDiscussionTurnKind = 'SOURCE' | 'MEDIA' | 'PLAYER' | 'REACTION';
export type IndustryMediaResponseTone =
    | 'CLARIFY'
    | 'ACKNOWLEDGE'
    | 'DEFEND'
    | 'CHALLENGE'
    | 'HUMOUR'
    | 'APPRECIATION';
export type IndustryMediaResponseFormat = 'REPLY' | 'QUOTE' | 'STATEMENT';
export type IndustryMediaResponseSpeaker = 'PERSONAL' | 'STUDIO';
export type IndustryMediaResponseStatus = 'PENDING' | 'RESOLVED';
export type IndustryMediaResponseOutcome = 'LANDED' | 'MIXED' | 'BACKFIRED' | 'IGNORED';

export interface IndustryMediaDiscussionTurn {
    schemaVersion: 1;
    id: string;
    discussionId: string;
    kind: IndustryMediaDiscussionTurnKind;
    industryEventId: string;
    mediaStoryId: string;
    absoluteWeek: number;
    content: string;
    claimMode: IndustryMediaClaimMode;
    mediaInstitutionId?: string;
    mediaPersonalityId?: string;
    responseId?: string;
    parentTurnId?: string;
}

export interface IndustryMediaDiscussion {
    schemaVersion: 1;
    id: string;
    industryEventId: string;
    mediaStoryId: string;
    sourcePostId: string;
    openedAbsoluteWeek: number;
    lastActivityAbsoluteWeek: number;
    responseClosesAbsoluteWeek: number;
    status: IndustryMediaDiscussionStatus;
    isPlayerRelated: boolean;
    heat: number;
    turns: IndustryMediaDiscussionTurn[];
    playerResponseId?: string;
    /** C6 rumour/leak/prediction discussed by this thread. */
    mediaClaimId?: string;
}

export interface IndustryMediaResponseEffects {
    reputation: number;
    controversy: number;
    followers: number;
    mediaStance: number;
    discussionHeat: number;
}

export interface IndustryMediaPlayerResponse {
    schemaVersion: 1;
    id: string;
    discussionId: string;
    industryEventId: string;
    mediaStoryId: string;
    sourcePostId: string;
    publishedPostId: string;
    tone: IndustryMediaResponseTone;
    format: IndustryMediaResponseFormat;
    speaker: IndustryMediaResponseSpeaker;
    content: string;
    submittedAbsoluteWeek: number;
    resolvesAbsoluteWeek: number;
    status: IndustryMediaResponseStatus;
    outcome?: IndustryMediaResponseOutcome;
    effects?: IndustryMediaResponseEffects;
    resolvedAbsoluteWeek?: number;
    /** C6 claim that prompted the optional response. */
    mediaClaimId?: string;
}

export type IndustryMediaYoutubeFormat =
    | 'THEORY'
    | 'EXPLAINED'
    | 'BUSINESS_BREAKDOWN'
    | 'REVIEW_AFTERMATH'
    | 'RESPONSE_ANALYSIS'
    | 'CREATOR_REACTION';

export type IndustryMediaYoutubeOutcome = 'BREAKOUT' | 'HIT' | 'NORMAL' | 'FLOP';

export interface IndustryMediaYoutubeThumbnail {
    primaryColor: string;
    secondaryColor: string;
    label: string;
    motif: string;
}

export interface IndustryMediaCreatorChannel {
    schemaVersion: 1;
    id: string;
    personalityId: string;
    subscribers: number;
    totalViews: number;
    credibility: number;
    momentum: number;
    sponsorAppeal: number;
    estimatedLifetimeRevenue: number;
    uploadCount: number;
    hitCount: number;
    flopCount: number;
    lastUploadAbsoluteWeek: number;
    recentVideoIds: string[];
}

export interface IndustryMediaYoutubeVideo {
    schemaVersion: 1;
    id: string;
    publicationKey: string;
    industryEventId: string;
    mediaStoryId: string;
    evidenceEventIds: string[];
    personalityId: string;
    institutionId?: string;
    format: IndustryMediaYoutubeFormat;
    claimMode: IndustryMediaClaimMode;
    title: string;
    summary: string;
    confirmedFacts: string;
    interpretation?: string;
    thumbnail: IndustryMediaYoutubeThumbnail;
    subjectKey: string;
    companyId?: string;
    projectId?: string;
    importance: IndustryEventImportance;
    publishedAbsoluteWeek: number;
    lastPerformanceAbsoluteWeek: number;
    views: number;
    likes: number;
    comments: string[];
    outcome: IndustryMediaYoutubeOutcome;
    subscriberDelta: number;
    estimatedRevenue: number;
    responseId?: string;
    responseOutcome?: IndustryMediaResponseOutcome;
    /** C6 rumour/leak/prediction examined by this video. */
    mediaClaimId?: string;
}

export type IndustryMediaFandomArchetype =
    | 'DEVOTED'
    | 'CREATIVE'
    | 'EVENT'
    | 'PROTECTIVE'
    | 'ANALYTICAL'
    | 'VOLATILE';

export type IndustryMediaCampaignType =
    | 'COUNTDOWN'
    | 'WATCH_PARTY'
    | 'FAN_EDIT'
    | 'AWARD_DRIVE'
    | 'SAVE_THE_PROJECT'
    | 'CONTINUE_THE_UNIVERSE'
    | 'DEFEND_SUBJECT'
    | 'CELEBRATE'
    | 'CASTING_WISH'
    | 'HASHTAG_CLASH';

export type IndustryMediaCampaignStage = 'SPARK' | 'RALLY' | 'PEAK' | 'AFTERMATH' | 'CLOSED';
export type IndustryMediaCampaignOutcome = 'BREAKOUT' | 'STRONG' | 'MODEST' | 'FIZZLED' | 'MESSY';
export type IndustryMediaCampaignParticipationMode = 'JOIN' | 'THANK';

export interface IndustryMediaCampaignMoment {
    schemaVersion: 1;
    id: string;
    campaignId: string;
    absoluteWeek: number;
    stage: IndustryMediaCampaignStage;
    caption: string;
    reach: number;
    participation: number;
    sentiment: number;
    heat: number;
    instagramPostId?: string;
    xPostId?: string;
}

export interface IndustryMediaCampaignParticipation {
    mode: IndustryMediaCampaignParticipationMode;
    absoluteWeek: number;
    playerPostId?: string;
    followerDelta: number;
    fanLoyaltyDelta: number;
    controversyDelta: number;
}

export interface IndustryMediaFandom {
    schemaVersion: 1;
    id: string;
    name: string;
    handle: string;
    bio: string;
    primaryColor: string;
    secondaryColor: string;
    avatar: string;
    motif: string;
    subjectKey: string;
    subjectName: string;
    companyId?: string;
    projectId?: string;
    universeId?: string;
    platformId?: string;
    talentId?: string;
    archetype: IndustryMediaFandomArchetype;
    homeRegionId: string;
    languageId: string;
    size: number;
    loyalty: number;
    activity: number;
    coordination: number;
    optimism: number;
    volatility: number;
    formedAbsoluteWeek: number;
    lastActiveAbsoluteWeek: number;
    friendlySubjectKeys: string[];
    rivalSubjectKeys: string[];
    recentCampaignIds: string[];
}

export interface IndustryMediaCampaign {
    schemaVersion: 1;
    id: string;
    campaignKey: string;
    fandomId: string;
    industryEventId: string;
    mediaStoryId: string;
    evidenceEventIds: string[];
    youtubeVideoId?: string;
    responseId?: string;
    subjectKey: string;
    type: IndustryMediaCampaignType;
    hashtag: string;
    headline: string;
    purpose: string;
    context: string;
    stage: IndustryMediaCampaignStage;
    startedAbsoluteWeek: number;
    lastAdvancedAbsoluteWeek: number;
    nextEligibleAbsoluteWeek: number;
    terminalAbsoluteWeek?: number;
    reach: number;
    participation: number;
    coordination: number;
    sentiment: number;
    heat: number;
    performanceRoll: number;
    outcome?: IndustryMediaCampaignOutcome;
    playerRelated: boolean;
    moments: IndustryMediaCampaignMoment[];
    playerParticipation?: IndustryMediaCampaignParticipation;
    /** C6 rumour/leak/prediction lineage when a campaign reacts to a claim. */
    mediaClaimId?: string;
}

export type IndustryMediaClaimKind = 'RUMOUR' | 'LEAK' | 'PREDICTION';
export type IndustryMediaClaimStatus =
    | 'OPEN'
    | 'CONFIRMED'
    | 'PARTLY_CONFIRMED'
    | 'REFUTED'
    | 'EXPIRED_UNVERIFIED'
    | 'SUPERSEDED';
export type IndustryMediaClaimCategory =
    | 'CASTING'
    | 'PROJECT_STATUS'
    | 'PLATFORM_DESTINATION'
    | 'RELEASE_WINDOW'
    | 'FRANCHISE_DIRECTION'
    | 'AWARDS'
    | 'COMPANY_MOVE'
    | 'PROJECT_OUTCOME';
export type IndustryMediaClaimConfidence = 'TENTATIVE' | 'CREDIBLE_CHATTER' | 'STRONG_SOURCING';

export interface IndustryMediaClaimTarget {
    expectedEventTypes: IndustryEventType[];
    companyId?: string;
    projectId?: string;
    platformId?: string;
    rightsContractId?: string;
    universeId?: string;
    talentId?: string;
    awardEventId?: string;
    expectedCountryIds?: string[];
    expectedAbsoluteWeek?: number;
    toleranceWeeks?: number;
    expectedOutcome?: string;
}

export interface IndustryMediaLeakIntentSnapshot {
    sourceSystem: 'PLATFORM_AI' | 'STUDIO_AI' | 'INDUSTRY_INTELLIGENCE';
    intentionId: string;
    intentionType: 'COMMISSION' | 'FRANCHISE' | 'RELEASE_WINDOW' | 'RIGHTS_TARGET' | 'CASTING_DIRECTION';
    companyId: string;
    subjectId: string;
    targetId?: string;
    targetAbsoluteWeek?: number;
    capturedAbsoluteWeek: number;
}

export interface IndustryMediaClaimResolution {
    status: Exclude<IndustryMediaClaimStatus, 'OPEN'>;
    absoluteWeek: number;
    eventIds: string[];
    explanation: string;
    sourceReliabilityDelta: number;
    playerCredibilityApplied?: boolean;
}

export interface IndustryMediaClaim {
    schemaVersion: 1;
    id: string;
    claimKey: string;
    kind: IndustryMediaClaimKind;
    status: IndustryMediaClaimStatus;
    category: IndustryMediaClaimCategory;
    confidence: IndustryMediaClaimConfidence;
    subjectKey: string;
    subjectName: string;
    anchorIndustryEventId: string;
    anchorStoryId: string;
    evidenceEventIds: string[];
    institutionId: string;
    personalityId?: string;
    publicationChannel: IndustryMediaChannel;
    importance: IndustryEventImportance;
    headline: string;
    summary: string;
    knownEvidence: string;
    interpretation?: string;
    target: IndustryMediaClaimTarget;
    createdAbsoluteWeek: number;
    earliestResolutionAbsoluteWeek: number;
    expiryAbsoluteWeek: number;
    lastEvaluatedAbsoluteWeek: number;
    playerRelated: boolean;
    leakIntentSnapshot?: IndustryMediaLeakIntentSnapshot;
    resolution?: IndustryMediaClaimResolution;
    discussionId?: string;
    responseId?: string;
    youtubeVideoId?: string;
    fandomId?: string;
    campaignId?: string;
}

export interface IndustryMediaSourceRecord {
    schemaVersion: 1;
    id: string;
    sourceId: string;
    institutionId: string;
    personalityId?: string;
    category: IndustryMediaClaimCategory;
    calls: number;
    confirmed: number;
    partlyConfirmed: number;
    refuted: number;
    expired: number;
    reliability: number;
    currentStreak: number;
    lastResolvedAbsoluteWeek: number;
    recentClaimIds: string[];
}

export type IndustryMediaNarrativeTheme =
    | 'AMBITIOUS_RISK_TAKER'
    | 'RECKLESS_SPENDER'
    | 'AWARDS_POWERHOUSE'
    | 'FRANCHISE_ARCHITECT'
    | 'OVERHYPED_STAR'
    | 'RELIABLE_HITMAKER'
    | 'COMEBACK'
    | 'DECLINE'
    | 'GLOBAL_EXPANSION'
    | 'FADING_DOMINANCE'
    | 'DIFFICULT_COLLABORATOR'
    | 'UNDERDOG';
export type IndustryMediaNarrativePolarity = 'POSITIVE' | 'NEGATIVE' | 'MIXED';
export type IndustryMediaNarrativeStage = 'EMERGING' | 'ESTABLISHED' | 'DEFINING' | 'FADING' | 'RESOLVED';
export type IndustryMediaNarrativeLandmarkKind =
    | 'ORIGIN'
    | 'SUPPORT'
    | 'CONTRADICTION'
    | 'PLAYER_CONFRONTATION'
    | 'CLAIM_RESOLUTION'
    | 'TURNING_POINT'
    | 'LATEST';

export interface IndustryMediaNarrativeLandmark {
    id: string;
    kind: IndustryMediaNarrativeLandmarkKind;
    industryEventIds: string[];
    absoluteWeek: number;
    summary: string;
    impact: number;
    mediaClaimId?: string;
    mediaResponseId?: string;
}

export interface IndustryMediaNarrative {
    schemaVersion: 1;
    id: string;
    narrativeKey: string;
    subjectKey: string;
    subjectName: string;
    theme: IndustryMediaNarrativeTheme;
    polarity: IndustryMediaNarrativePolarity;
    stage: IndustryMediaNarrativeStage;
    strength: number;
    confidence: number;
    supportingEvidence: number;
    contradictingEvidence: number;
    primaryStoryId: string;
    primaryIndustryEventId: string;
    firstAbsoluteWeek: number;
    lastAdvancedAbsoluteWeek: number;
    nextEligiblePublicationAbsoluteWeek: number;
    lastPublishedAbsoluteWeek?: number;
    resolvedAbsoluteWeek?: number;
    landmarks: IndustryMediaNarrativeLandmark[];
    playerRelated: boolean;
}

export type IndustryMediaRelationshipDirection = 'IMPROVING' | 'WORSENING' | 'STABLE';
export type IndustryMediaFeudState = 'NONE' | 'BUILDING' | 'ACTIVE' | 'COOLING' | 'RESOLVED';

export interface IndustryMediaRelationship {
    schemaVersion: 1;
    id: string;
    relationshipKey: string;
    personalityId: string;
    subjectKey: string;
    subjectName: string;
    counterpartPersonalityId?: string;
    affinity: number;
    respect: number;
    trust: number;
    tension: number;
    familiarity: number;
    direction: IndustryMediaRelationshipDirection;
    feudState: IndustryMediaFeudState;
    conflictEventIds: string[];
    /** Distinct entered weeks carrying feud-qualifying evidence. */
    conflictAbsoluteWeeks: number[];
    landmarkInteractionIds: string[];
    firstInteractionAbsoluteWeek: number;
    lastMeaningfulInteractionAbsoluteWeek: number;
    lastIndustryEventId?: string;
    playerRelated: boolean;
}

export interface IndustryMediaPrEffectVector {
    reputation: number;
    controversy: number;
    followers: number;
    projectBuzz: number;
    mediaStance: number;
    discussionHeat: number;
    relationshipTension: number;
    narrativeMomentum: number;
}

export interface IndustryMediaPrIntervention {
    schemaVersion: 1;
    id: string;
    interventionKey: string;
    absoluteWeek: number;
    tier: TeamMember['tier'];
    importance: IndustryEventImportance;
    rawEffects: IndustryMediaPrEffectVector;
    appliedEffects: IndustryMediaPrEffectVector;
    outcomeLabel?: string;
    summary: string;
    sourceId?: string;
    projectId?: string;
}

export type ProjectPromotionChannel = 'X' | 'INSTAGRAM' | 'YOUTUBE' | 'PRESS' | 'RED_CARPET';
export type ProjectPromotionType = 'PROJECT_PROMO' | 'ANNOUNCEMENT' | 'BTS' | 'REEL' | 'CELEBRATION' | 'INTERVIEW' | 'PREMIERE';

export interface ProjectPromotionAttribution {
    schemaVersion: 1;
    id: string;
    attributionKey: string;
    publicationId: string;
    projectId: string;
    projectName: string;
    channel: ProjectPromotionChannel;
    promotionType: ProjectPromotionType;
    absoluteWeek: number;
    baseBuzzDelta: number;
    fatigueMultiplier: number;
    prMultiplier: number;
    appliedBuzzDelta: number;
    prInterventionId?: string;
}

export interface IndustryMediaStory {
    schemaVersion: 1;
    id: string;
    subjectKey: string;
    category: IndustryMediaStoryCategory;
    stage: IndustryMediaStoryStage;
    importance: IndustryEventImportance;
    primaryIndustryEventId: string;
    industryEventIds: string[];
    firstAbsoluteWeek: number;
    lastAdvancedAbsoluteWeek: number;
    nextEligiblePublicationWeek?: number;
    headline: string;
    detail: string;
    channelEligibility: IndustryMediaChannel[];
    publishedChannels: IndustryMediaChannel[];
    companyId?: string;
    companyName?: string;
    platformId?: string;
    projectId?: string;
    productionId?: string;
    rightsContractId?: string;
    transactionId?: string;
    awardEventId?: string;
    resolutionIndustryEventId?: string;
    resolutionAbsoluteWeek?: number;
}

export interface IndustryMediaWorldState {
    schemaVersion: 7;
    lastProcessedAbsoluteWeek: number;
    stories: IndustryMediaStory[];
    eventStoryIndex: Record<string, string>;
    publishedBeatKeys: string[];
    institutions: IndustryMediaInstitution[];
    personalities: IndustryMediaPersonality[];
    subjectStances: IndustryMediaSubjectStance[];
    storyAssignments: IndustryMediaStoryAssignment[];
    discussions: IndustryMediaDiscussion[];
    playerResponses: IndustryMediaPlayerResponse[];
    processedDiscussionKeys: string[];
    processedResponseKeys: string[];
    creatorChannels: IndustryMediaCreatorChannel[];
    youtubeVideos: IndustryMediaYoutubeVideo[];
    processedYoutubeKeys: string[];
    fandoms: IndustryMediaFandom[];
    campaigns: IndustryMediaCampaign[];
    processedFandomKeys: string[];
    claims: IndustryMediaClaim[];
    sourceRecords: IndustryMediaSourceRecord[];
    processedClaimKeys: string[];
    narratives: IndustryMediaNarrative[];
    mediaRelationships: IndustryMediaRelationship[];
    prInterventions: IndustryMediaPrIntervention[];
    promotionAttributions: ProjectPromotionAttribution[];
    processedC7Keys: string[];
}

export interface StreamingPlatformEcosystemState {
    schemaVersion: number;
    lastProcessedAbsoluteWeek: number;
    launchSequence: number;
    operators: Record<string, StreamingEcosystemOperator>;
    markets: Record<string, StreamingEcosystemMarket>;
    eventHistory: StreamingEcosystemEvent[];
}

export interface StreamingCompanySummary {
    id: string;
    name: string;
    kind: 'CORE' | 'GLOBAL' | 'REGIONAL' | 'DYNAMIC' | 'OTHERS' | 'PLAYER';
    brand: StreamingPlatformBrandPresentation;
    homeCountryId?: string;
    countryId?: string;
    sharePercent?: number;
    subscribersMillions?: number;
    valuationBillions?: number;
    momentum?: number;
    lifecycle?: StreamingEcosystemLifecycle;
    corePlatformId?: PlatformId;
    cashMillions?: number;
    technology?: number;
    cataloguePower?: number;
    localization?: number;
    prestige?: number;
    activeCountryIds?: string[];
    activeProjectCount?: number;
    activeResearchProgramCount?: number;
    lastProcessedAbsoluteWeek?: number;
}
export type ReleaseScale = 'GLOBAL' | 'MASS' | 'LIMITED';
export type ReleaseStrategy = 'THEATRICAL' | 'STREAMING_ONLY';
export type ScreeningStrategy = 'REGIONAL' | 'NATIONAL' | 'INTERNATIONAL';
export type BoxOfficeRegionId =
    | 'NORTH_AMERICA'
    | 'SOUTH_AMERICA'
    | 'EUROPE'
    | 'ASIA'
    | 'AFRICA'
    | 'OCEANIA';
export type CinemaChainId =
    | 'EMPIRE_CINEMAS'
    | 'Z_CINEMAS'
    | 'NOVA_CIRCUIT'
    | 'PRISM_HALLS'
    | 'ARCLIGHT_GRID'
    | 'CROWNSCREEN';
export type CinemaChainAudienceStrength = 'MASS' | 'PREMIUM' | 'FAMILY' | 'STAR_DRIVEN' | 'PRESTIGE' | 'FRANCHISE' | 'YOUTH' | 'URBAN';
export type MusicArtistFameTier = 'EMERGING' | 'KNOWN' | 'STAR' | 'SUPERSTAR' | 'LEGEND';
export type MusicArtistAvailability = 'COMMON' | 'SELECTIVE' | 'RARE';
export type MusicArtistScandalRisk = 'LOW' | 'MEDIUM' | 'HIGH';
export type MusicArtistGender = 'MALE' | 'FEMALE' | 'GROUP' | 'UNKNOWN';
export type MusicCreditRole = 'LEAD_SINGLE' | 'END_CREDIT_SONG' | 'SOUNDTRACK_EP' | 'PROMO_ALBUM' | 'TRAILER_ANTHEM' | 'MUSIC_VIDEO_TIE_IN';
export type ProjectMusicStrategy = 'COMPOSER_ONLY' | 'LEAD_SINGLE' | 'SOUNDTRACK_EP' | 'PROMO_ALBUM' | 'MUSIC_VIDEO_TIE_IN';
export type CampaignPositioning = 'MASS_EVENT' | 'PRESTIGE_PUSH' | 'FANBASE_MOBILIZATION' | 'VIRAL_HEAT' | 'SLEEPER_BUILD';
export type CampaignTimeline = 'FRONT_LOADED_OPENING' | 'BALANCED_ROLLOUT' | 'SLOW_BURN_WOM' | 'LAST_WEEK_BLITZ';
export type CampaignRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'SEVERE';
export type CampaignRealityOutcome =
    | 'CAMPAIGN_DELIVERED'
    | 'OVERHYPED'
    | 'HIDDEN_GEM'
    | 'MISPOSITIONED'
    | 'PRESTIGE_REJECTED'
    | 'VIRAL_BACKLASH'
    | 'WORD_OF_MOUTH_BREAKOUT'
    | 'EVENT_DROP_OFF';
export type MarketingChannelId =
    | 'TRAILER_LAUNCH'
    | 'SOCIAL_DIGITAL'
    | 'TV_OUTDOOR'
    | 'RED_CARPET'
    | 'CRITIC_SCREENINGS'
    | 'INFLUENCER_PUSH'
    | 'INTERNATIONAL'
    | 'FAN_EVENTS';
export type MarketingChannelAllocations = Partial<Record<MarketingChannelId, number>>;

export interface BoxOfficeRegion {
    id: BoxOfficeRegionId;
    label: string;
    shortLabel: string;
    marketWeight: number;
}

export interface CinemaChainRegionalTerms {
    screens: number;
    exhibitorCut: number;
    bookingCost: number;
    footfallPower: number;
    prestigeSupport: number;
    volatility: number;
    note: string;
}

export interface CinemaChain {
    id: CinemaChainId;
    name: string;
    logoMark: string;
    brandColor: string;
    personality: string;
    globalReputation: number;
    audienceStrengths: CinemaChainAudienceStrength[];
    regionalTerms: Record<BoxOfficeRegionId, CinemaChainRegionalTerms>;
}

export interface TheatricalChainReceipt {
    chainId: CinemaChainId;
    chainName: string;
    gross: number;
    studioReceipts: number;
    exhibitorReceipts: number;
    screens: number;
    expectedFootfall: number;
    exhibitorCut: number;
}

export interface TheatricalRegionReceipt {
    regionId: BoxOfficeRegionId;
    regionLabel: string;
    regionShortLabel: string;
    gross: number;
    studioReceipts: number;
    exhibitorReceipts: number;
    screens: number;
    expectedFootfall: number;
    averageExhibitorCut: number;
    holdModifier: number;
    chainReceipts: TheatricalChainReceipt[];
}

export interface TheatricalDistributionBreakdown {
    week: number;
    gross: number;
    studioReceipts: number;
    exhibitorReceipts: number;
    totalScreens: number;
    expectedFootfall: number;
    averageExhibitorCut: number;
    studioShare: number;
    distributionModifier: number;
    overscreeningPenalty: number;
    underReleasePenalty: number;
    regionReceipts: TheatricalRegionReceipt[];
}

export interface StreamingRegionBreakdown {
    regionId: BoxOfficeRegionId;
    regionLabel: string;
    regionShortLabel: string;
    views: number;
    revenue: number;
    audienceShare: number;
    retentionModifier: number;
}

export interface StreamingDistributionBreakdown {
    week: number;
    platformId: PlatformId;
    views: number;
    revenue: number;
    primaryRegionId: BoxOfficeRegionId;
    globalReachScore: number;
    regionBreakdowns: StreamingRegionBreakdown[];
}

export interface CampaignFitSnapshot {
    positioning: CampaignPositioning;
    fitScore: number;
    falseMarketingRisk: CampaignRiskLevel;
    overspendRisk: CampaignRiskLevel;
    audienceMatch: number;
    criticMatch: number;
    recommendedSpendCap: number;
    warning: string;
    strengths: string[];
    risks: string[];
}

export interface CampaignForecastSnapshot {
    timeline: CampaignTimeline;
    openingWeekendLow: number;
    openingWeekendHigh: number;
    totalRevenueLow: number;
    totalRevenueHigh: number;
    breakEvenChance: number;
    weekTwoDropRisk: number;
    streamingBidBoost: number;
    awardsVisibility: number;
    franchiseValueImpact: number;
    confidenceLabel: 'Early Estimate' | 'Volatile Estimate' | 'Market Read';
}

export interface CampaignRealitySnapshot {
    outcome: CampaignRealityOutcome;
    label: string;
    tone: 'POSITIVE' | 'MIXED' | 'NEGATIVE';
    promised: string;
    audienceRead: string;
    criticRead: string;
    summary: string;
    forecastShift: string;
    audienceScore: number;
    criticScore: number;
    buzzDelta: number;
    reputationDelta: number;
    franchiseValueDelta: number;
    newsworthy: boolean;
    checkedWeek: number;
    checkedYear: number;
}

export interface CampaignItem {
    id: string;
    name: string;
    cost: number;
    buzzImpact: number;
    description: string;
    type: 'SOCIAL' | 'TV' | 'EVENT' | 'PREMIERE' | 'OTHER';
}
export type OutcomeTier = 'MASSIVE_SUCCESS' | 'SUCCESS' | 'NEUTRAL' | 'FAILURE' | 'MAJOR_FAILURE';
export type ProjectSubtype = 'STANDALONE' | 'SEQUEL' | 'SPINOFF' | 'REBOOT' | 'UNIVERSE_ENTRY' | 'UNIVERSE_EVENT' | 'UNIVERSE_CROSSOVER';
export type UniversePhase = 'PHASE_1_ORIGINS' | 'PHASE_2_EXPANSION' | 'PHASE_3_WAR' | 'PHASE_4_MULTIVERSE';
export type SeriesStatus = 'N/A' | 'RUNNING' | 'CANCELLED' | 'ENDED';
export type PlayerReturnStatus = 'RETURNING' | 'WRITTEN_OFF' | 'KILLED_OFF';
export type NPCTier = 'A_LIST' | 'ESTABLISHED' | 'RISING' | 'INDIE' | 'ICON' | 'UNKNOWN';
export type NPCPrestige = 'COMMERCIAL' | 'PRESTIGE' | 'MIXED';
export type CrewOccupation = 'CINEMATOGRAPHER' | 'COMPOSER' | 'LINE_PRODUCER' | 'VFX_SUPERVISOR';
export type CrewMarketTier = 'LEGEND' | 'PROFESSIONAL' | 'INDIE';
export type ActorTrait = 'DIVA' | 'METHOD' | 'WORKAHOLIC' | 'UNRELIABLE' | 'EASY_GOING' | 'BOX_OFFICE_POISON' | 'PROFESSIONAL' | 'AMBITIOUS';
export type ContractType = 'MOVIE_DEAL';
export type PaymentMode = 'UPFRONT' | 'WEEKLY_INSTALLMENTS';
export type ProjectMemoryTag = string;
export type AdType = 'INTERSTITIAL' | 'REWARDED_CASH' | 'REWARDED_ENERGY' | 'REWARDED_STATS' | 'REWARDED_SKILL' | 'REWARDED_GENRE' | 'REWARDED_BAILOUT';

// Interfaces

export interface ActorSkills {
    delivery: number;
    memorization: number;
    expression: number;
    improvisation: number;
    discipline: number;
    presence: number;
    charisma: number;
    writing: number;
}

export interface Stats {
    health: number;
    happiness: number;
    looks: number;
    body: number;
    fame: number;
    reputation: number;
    experience: number;
    talent: number;
    followers: number;
    skills: ActorSkills;
    directorSkills?: DirectorStats;
    genreXP: Record<string, number>;
}

export interface BusinessConfig {
    quality: 'BUDGET' | 'STANDARD' | 'PREMIUM' | 'LUXURY';
    pricing: 'LOW' | 'MARKET' | 'HIGH' | 'EXORBITANT';
    marketing: 'LOW' | 'MEDIUM' | 'HIGH'; // Legacy setting, can be ignored or used for auto-preset
    marketingBudget?: {
        social: number;
        influencer: number;
        billboard: number;
        tv: number;
    };
    theme?: string;
    productionType?: string;
    amenities?: string[];
    headOfProductionId?: string; // New: For Production House
}

export interface BusinessStats {
    weeklyRevenue: number;
    weeklyExpenses: number;
    weeklyProfit: number;
    lifetimeRevenue: number;
    valuation: number;
    brandHealth: number;
    customerSatisfaction: number;
    riskLevel: number;
    hype: number;
    studioMomentum?: number;
    investorConfidence?: number;
    recentHitStreak?: number;
    recentFlopStreak?: number;
    recentReleaseOutcomes?: string[];
    processedReleaseOutcomeIds?: string[];
    capacity?: number;
    inventory?: number;
    locations?: number;
}

export interface BusinessStaff {
    id: string;
    name: string;
    role: string;
    skill: number;
    salary: number;
    morale: number;
}

export interface BusinessProduct {
    id: string;
    name: string;
    catalogId: string;
    quality: number;
    productionCost: number;
    sellingPrice: number;
    appeal: number;
    unitsSold: number;
    active: boolean;
    inventory: number;
}

export interface EmployeeCandidate {
    id: string;
    name: string;
    role: 'MANAGER' | 'STAFF' | 'SALESPERSON';
    skill: number;
    salary: number;
}

export interface WriterStats {
    creativity: number;
    dialogue: number;
    structure: number;
    pacing: number;
}

export interface DirectorStats {
    vision: number;
    technical: number;
    leadership: number;
    style: number;
}

export interface ScriptOption {
    questionId: string;
    choiceId: string;
}

export interface ScriptAttributes {
    plot: number;
    characters: number;
    pacing: number;
    dialogue: number;
    action?: number;
    originality?: number;
}

export interface Script {
    id: string;
    title: string;
    genres: Genre[];
    status: ScriptStatus;
    quality: number;
    options: ScriptOption[];
    writerId: string | null;
    assignedSkill?: number;
    assignedSpeed?: number;
    weeksInDevelopment: number;
    totalDevelopmentWeeks: number;
    isOriginal: boolean;
    projectType: ProjectType;
    format?: ProjectFormat;
    targetAudience?: TargetAudience;
    episodes?: number;
    baseQuality?: number;
    logline?: string;
    attributes?: ScriptAttributes;
    /** Flexible creative intent. It guides casting without fixing cast size. */
    storyCompass?: StoryCompass;
    sourceMaterial?: 'ORIGINAL' | 'ADAPTATION' | 'SEQUEL' | 'SPINOFF';
    sourceMaterialType?: 'BOOK' | 'ARTICLE' | 'SCREENPLAY' | 'GAME' | 'GRAPHIC_NOVEL' | 'SPEC_SCRIPT' | 'LIFE_RIGHTS' | 'DOCUMENTARY_SUBJECT';
    subjectName?: string;
    subjectType?: ScriptSubjectType;
    connectedProjectIntent?: 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';
    author?: string;
    hype?: number;
    tags?: string[];
    franchiseId?: string;
    universeId?: UniverseId;
    universeSagaName?: string;
    universePhaseName?: string;
    installmentNumber?: number;
    customPoster?: CustomPoster;
    lockedStreamingFunding?: LockedStreamingFunding;
    developmentCost?: number;
    purchaseCost?: number;
    createdAtWeek?: number;
    producedAtWeek?: number;
    returningTalent?: {
        role: 'DIRECTOR' | 'LEAD_ACTOR' | 'SUPPORTING_ACTOR' | 'CINEMATOGRAPHER' | 'COMPOSER' | 'LINE_PRODUCER' | 'VFX_SUPERVISOR';
        id: string;
        originalSalary: number;
        newDemand: number;
        negotiated: boolean;
        accepted: boolean;
        attemptsLeft?: number;
    }[];
}

export type WriterTier = 'ASPIRING' | 'COMMON' | 'A_LIST';

export interface Writer {
    id: string;
    name: string;
    skill: number;
    fee: number;
    speed: number;
    tier: WriterTier;
    stats: WriterStats;
}

export interface ProjectConcept {
    id: string;
    scriptId: string;
    lastUpdated: number;
    crewModes: Record<string, 'HIRE' | 'SELF' | 'IN_HOUSE'>;
    selectedCrew: Record<string, string | null>;
    castList: {
        id: string,
        role: string,
        actorId: string | null,
        actorName?: string,
        roleType?: RoleType,
        salary?: number,
        characterId?: string,
        characterName?: string,
        sourceUniverseId?: UniverseId,
        storyFunction?: CharacterStoryFunction,
        storyRole?: CharacterStoryRole,
        abilityType?: CharacterAbilityType,
        nature?: CharacterNature,
        identitySource?: CharacterIdentitySource
    }[];
    backgroundCastingPlan?: BackgroundCastingPlan;
    selectedLocations: string[]; // Changed from selectedLocation: string | null
    tone: number;
    reservedMarketingBudget?: number;
    marketingBudgetSpent?: number;
    marketingBudgetRemaining?: number;
    equipmentChoices?: Record<string, string>;
    musicStrategy?: ProjectMusicStrategy;
    selectedMusicArtistTargetCount?: number;
    selectedMusicCreditRoles?: MusicCreditRole[];
    selectedMusicArtistIds?: string[];
    musicPlan?: ProjectMusicPlan;
    investorRaiseAmount?: number;
    investorFundingMode?: ProjectInvestorFundingMode;
    selectedInvestorIds?: string[];
    investorPlan?: ProjectInvestorPlan;
    lastStep?: 'SELECT_SCRIPT' | 'DIRECTOR' | 'CAST' | 'CREW' | 'EQUIPMENT' | 'LOCATION' | 'SETUP' | 'TONE' | 'CONFIRM';
    customPoster?: CustomPoster;
    lockedStreamingFunding?: LockedStreamingFunding;
    format?: ProjectFormat;
    subjectName?: string;
    subjectType?: ScriptSubjectType;
    /** Shared story intent used by scripts, Greenlight, offers, and reactions. */
    storyCompass?: StoryCompass;
    connectedProjectIntent?: 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';
    universeId?: UniverseId;
    franchiseId?: string;
    installmentNumber?: number;
}

export interface StudioDepartments {
    writing: number;
    directing: number;
    casting: number;
    production: number;
    postProduction: number;
}

export interface StudioEquipment {
    cameras: number;
    lighting: number;
    sound: number;
    practicalEffects: number;
}

export interface StudioLegacyCatalogItem {
    id: string;
    title: string;
    year: number;
    week: number;
    revenue: number;
    quality: number;
    outcome: string;
    genre: Genre;
    projectType: ProjectType;
    source: 'WORLD_CATALOG' | 'VENTURE_HISTORY' | 'ACQUISITION_SUMMARY';
    universeId?: UniverseId;
    franchiseId?: string;
}

export interface StudioLegacyFranchise {
    id: string;
    name: string;
    catalogItemIds: string[];
    universeId?: UniverseId;
    estimated: boolean;
}

export interface StudioAcquisitionPortfolio {
    version: 1;
    sourceStudioId: StudioId;
    importedWeek: number;
    importedYear: number;
    assetDataSource: 'SAVE_DATA' | 'MIXED' | 'FORBES_ESTIMATE';
    catalog: StudioLegacyCatalogItem[];
    franchises: StudioLegacyFranchise[];
    declaredFranchiseCount: number;
    universeIds: UniverseId[];
    universeNames: string[];
    facilityLabels: string[];
    facilitiesEstimated: boolean;
}

export type RightsPropertyType = 'CHARACTER' | 'FRANCHISE' | 'CATALOG' | 'STORY_WORLD';

export type RightsArchetype =
    | 'DORMANT_HERO'
    | 'CULT_HORROR'
    | 'FAILED_BLOCKBUSTER'
    | 'VIRAL_STORY'
    | 'STREAMING_CATALOG'
    | 'PRESTIGE_PROPERTY';

export type RightsRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'LEGENDARY';
export type RightsSignal = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
export type RightsMarketStatus = 'AVAILABLE' | 'EXPIRED';
export type RightsInvestigationStatus =
    | 'NONE'
    | 'INVESTIGATING'
    | 'REPORT_READY'
    | 'PURSUIT_READY'
    | 'DISMISSED';
export type RightsRecommendedFormat =
    | 'FEATURE_FILM'
    | 'LIMITED_SERIES'
    | 'ONGOING_SERIES'
    | 'ANIMATED_FILM'
    | 'FRANCHISE_REBOOT';

export interface RightsInsideReport {
    estimatedValueLow: number;
    estimatedValueHigh: number;
    audienceLoyalty: RightsSignal;
    commercialPotential: RightsSignal;
    ownershipRisk: RightsSignal;
    rivalActivity: RightsSignal;
    recommendedFormat: RightsRecommendedFormat;
    hiddenAdvantage: string;
    hiddenDanger: string;
}

export interface RightsOpportunity {
    id: string;
    title: string;
    archetype: RightsArchetype;
    propertyType: RightsPropertyType;
    primaryGenre: Genre;
    shortPitch: string;
    availabilityReason: string;
    sellerName: string;
    askingPrice: number;
    rarity: RightsRarity;
    fanbase: RightsSignal;
    publicRisk: RightsSignal;
    visibleUpside: string;
    publicConcern: string;
    rivalInterest: RightsSignal;
    listedAtWeek: number;
    expiresAtWeek: number;
    marketStatus: RightsMarketStatus;
    isTracked: boolean;
    accent: string;
    emblemKey: 'SHIELD' | 'SKULL' | 'FLAME' | 'BOOK' | 'LIBRARY' | 'AWARD';
    intelligenceSeed: number;
    investigationStatus?: RightsInvestigationStatus;
    investigationStartedWeek?: number;
    investigationCompletesWeek?: number;
    investigationCost?: number;
    insideReport?: RightsInsideReport;
    reportNotifiedAtWeek?: number;
    dismissedCycle?: number;
}

export interface RightsMarketNotice {
    id: string;
    opportunityTitle: string;
    kind: 'FINAL_WEEK' | 'EXPIRED';
    week: number;
}

export type RightsDealType = 'OPTION' | 'LICENSE' | 'BUYOUT' | 'CATALOG_PURCHASE';
export type RightsNegotiationStatus =
    | 'AWAITING_RESPONSE'
    | 'ACCEPTED'
    | 'REJECTED'
    | 'COUNTEROFFER'
    | 'CREATIVE_GUARANTEE'
    | 'RIVAL_OFFER'
    | 'BIDDING_WAR'
    | 'READY_TO_SIGN'
    | 'SIGNED'
    | 'WITHDRAWN';

export interface RightsCreativeGuarantee {
    id: string;
    title: string;
    description: string;
}

export interface RightsNegotiation {
    id: string;
    opportunityId: string;
    opportunityTitle: string;
    sellerName: string;
    dealType: RightsDealType;
    openingOffer: number;
    currentOffer: number;
    askingPrice: number;
    agreedAmount?: number;
    counterAmount?: number;
    rivalAmount?: number;
    round: number;
    maxRounds: number;
    status: RightsNegotiationStatus;
    submittedWeek: number;
    responseDueWeek: number;
    responseSummary?: string;
    creativeGuarantee?: RightsCreativeGuarantee;
    isInvestigated: boolean;
    intelligenceSeed: number;
    responseNotifiedAtWeek?: number;
}

export interface OwnedRight {
    id: string;
    sourceOpportunityId: string;
    title: string;
    sellerName: string;
    propertyType: RightsPropertyType;
    archetype: RightsArchetype;
    primaryGenre: Genre;
    rarity: RightsRarity;
    accent: string;
    emblemKey: RightsOpportunity['emblemKey'];
    dealType: RightsDealType;
    purchasePrice: number;
    acquiredWeek: number;
    acquiredYear: number;
    expiresAtWeek?: number;
    projectsAllowed?: number;
    projectsUsed: number;
    creativeGuarantee?: RightsCreativeGuarantee;
    status: 'ACTIVE' | 'EXPIRED';
    ownershipSource?: 'ACQUIRED' | 'STUDIO_ORIGINAL';
    sourceProjectId?: string;
    franchiseId?: string;
    universeId?: UniverseId;
}

export type OwnedRightDevelopmentStrategy = 'FRESH_ADAPTATION' | 'REBOOT';
export type SubsidiaryOperatingModel = 'INDEPENDENT_LABEL' | 'CONTROLLED_SUBSIDIARY' | 'FULL_MERGER';
export type StudioMandateFocus = 'MOVIES_FIRST' | 'SERIES_FIRST' | 'BALANCED_SLATE' | 'FRANCHISE_EXPANSION' | 'PRESTIGE_AWARDS' | 'COMMERCIAL_HITS';
export type StudioMandateBudgetAppetite = 'LEAN' | 'STANDARD' | 'PREMIUM';
export type StudioMandateReleasePace = 'CAREFUL' | 'STEADY' | 'AGGRESSIVE';
export type StudioMandateIpStrategy = 'ORIGINALS' | 'OWNED_IP' | 'SEQUELS_REBOOTS' | 'MIXED';
export type StudioMandateTalentPolicy = 'IN_HOUSE' | 'RISING_STARS' | 'STAR_POWER' | 'MIXED';
export type StudioMandateObjective = 'PROFIT_FIRST' | 'PRESTIGE_FIRST' | 'COMMERCIAL_FIRST' | 'BALANCED';
export type StudioMandateCreativeAppetite = 'SAFE' | 'CALCULATED' | 'BOLD';
export type StudioMandateAutoProduction = 'PAUSED' | 'BOARD_REVIEW' | 'APPROVED';
export type SubsidiaryProjectProposalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_STARTED';
export type SubsidiaryProjectSource = 'ORIGINAL' | 'OWNED_IP' | 'FRANCHISE' | 'UNIVERSE';
export type SubsidiaryPersonality = 'Commercial' | 'Prestige-focused' | 'Franchise-driven' | 'Experimental' | 'Conservative' | 'Aggressive' | 'Streaming-first';
export type SubsidiaryDecisionType = 'RISKY_PRODUCTION' | 'EMERGENCY_CAPITAL' | 'LEADERSHIP_CHANGE' | 'RIGHTS_ACQUISITION' | 'DORMANT_FRANCHISE' | 'PARTNERSHIP' | 'FLOP_RESPONSE' | 'INDEPENDENCE_REQUEST';
export type SubsidiaryDecisionStatus = 'PENDING' | 'RESOLVED' | 'DISMISSED';
export type SubsidiaryDecisionArcStatus = 'ACTIVE' | 'COMPLETED';

export interface StudioOperatingMandate {
    focus: StudioMandateFocus;
    budgetAppetite: StudioMandateBudgetAppetite;
    releasePace: StudioMandateReleasePace;
    ipStrategy: StudioMandateIpStrategy;
    talentPolicy: StudioMandateTalentPolicy;
    objective: StudioMandateObjective;
    creativeAppetite: StudioMandateCreativeAppetite;
    autoProduction: StudioMandateAutoProduction;
    updatedWeek?: number;
    updatedYear?: number;
}

export interface SubsidiaryProjectProposal {
    id: string;
    studioId: string;
    studioName: string;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    budgetTier: BudgetTier;
    estimatedBudget: number;
    source: SubsidiaryProjectSource;
    sourceLabel?: string;
    franchiseId?: string;
    universeId?: UniverseId;
    installmentNumber?: number;
    /** B7 lineage back to the compact B3 idea retained at acquisition. */
    industryContentFingerprintId?: string;
    /** Saved B2 decision score used by the subsidiary mandate adapter. */
    inheritedDecisionScore?: number;
    logline: string;
    mandateSnapshot: StudioOperatingMandate;
    logic: string[];
    status: SubsidiaryProjectProposalStatus;
    createdWeek: number;
    createdYear: number;
    decidedWeek?: number;
    decidedYear?: number;
    startedScriptId?: string;
    startedConceptId?: string;
    startedCommitmentId?: string;
}

export interface SubsidiaryDecisionOption {
    id: 'APPROVE' | 'DECLINE';
    label: string;
    description: string;
    preview: string;
    tone: 'positive' | 'negative' | 'neutral';
}

export interface SubsidiaryDecision {
    id: string;
    studioId: string;
    studioName: string;
    type: SubsidiaryDecisionType;
    status: SubsidiaryDecisionStatus;
    title: string;
    summary: string;
    personality: SubsidiaryPersonality;
    recommendedAmount?: number;
    relatedTitle?: string;
    followUp?: {
        label: string;
        effect: string;
    };
    stakes: string[];
    logic: string[];
    options: SubsidiaryDecisionOption[];
    createdWeek: number;
    createdYear: number;
    dueWeek?: number;
    selectedOptionId?: SubsidiaryDecisionOption['id'];
    resolvedWeek?: number;
    resolvedYear?: number;
    outcomeSummary?: string;
}

export interface SubsidiaryDecisionArcBeat {
    label: string;
    effect: string;
    pulseWeek: number;
    pulseYear: number;
    resolvedWeek?: number;
    resolvedYear?: number;
}

export interface SubsidiaryDecisionArc {
    id: string;
    studioId: string;
    studioName: string;
    sourceDecisionId: string;
    sourceDecisionType: SubsidiaryDecisionType;
    title: string;
    summary: string;
    tone: SubsidiaryDecisionOption['tone'];
    status: SubsidiaryDecisionArcStatus;
    beats: SubsidiaryDecisionArcBeat[];
    beatsResolved: number;
    nextPulseWeek?: number;
    nextPulseYear?: number;
    createdWeek: number;
    createdYear: number;
    completedWeek?: number;
    completedYear?: number;
}

export type StudioSaleDeckStatus = 'DRAFT' | 'LISTED' | 'NEGOTIATING' | 'SIGNING' | 'CLOSED' | 'WITHDRAWN';

export type StudioSaleBuyerType =
    | 'RIVAL_STUDIO'
    | 'FAMOUS_PERSON'
    | 'PRIVATE_EQUITY'
    | 'STREAMING_PLATFORM'
    | 'NPC_PRODUCER';

export type StudioSaleOfferStatus = 'PENDING' | 'COUNTERED' | 'ACCEPTED' | 'REJECTED';

export type StudioSaleNameRights = 'BUYER_KEEPS_NAME' | 'BUYER_REBRANDS' | 'SELLER_RETAINS_NAME';

export type StudioSaleCatalogRights = 'FULL_LIBRARY' | 'FUTURE_SLATE_ONLY' | 'SELLER_RETAINS_BACK_CATALOG';

export interface StudioSaleTransferTerms {
    nameRights: StudioSaleNameRights;
    catalogRights: StudioSaleCatalogRights;
    sellerCredit: boolean;
    staffProtectionWeeks: number;
    royaltyPercent: number;
    royaltyWeeks: number;
}

export interface StudioSaleOffer {
    id: string;
    buyerName: string;
    buyerType: StudioSaleBuyerType;
    headline: string;
    amount: number;
    cashAtClose: number;
    debtAssumed: number;
    bankerFee: number;
    royaltyPercent: number;
    royaltyWeeks: number;
    royaltyEstimate: number;
    availableWeek: number;
    availableYear: number;
    availableAfterWeeks: number;
    counterAmount?: number;
    counterRoyaltyPercent?: number;
    counterStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    reputationImpact: number;
    buyerIntent: string;
    conditions: string[];
    status: StudioSaleOfferStatus;
}

export interface StudioSaleDeck {
    id: string;
    studioId: string;
    studioName: string;
    status: StudioSaleDeckStatus;
    askPrice: number;
    minimumPrice: number;
    indicativeValuation: number;
    debtAtListing?: number;
    listedWeek: number;
    listedYear: number;
    offerWindowWeeks: number;
    offersCloseWeek: number;
    offersCloseYear: number;
    transferTerms: StudioSaleTransferTerms;
    offers: StudioSaleOffer[];
    acceptedOfferId?: string;
    signingStartedWeek?: number;
    signingStartedYear?: number;
    closedWeek?: number;
    closedYear?: number;
}

export interface OwnedRightDevelopmentChoice {
    format: Extract<ProjectType, 'MOVIE' | 'SERIES'>;
    strategy: OwnedRightDevelopmentStrategy;
}

export interface StudioState {
    scripts: Script[];
    concepts: ProjectConcept[]; // NEW: Drafts
    writers: Writer[];
    ipMarket: Script[];
    lastMarketRefreshWeek: number;
    lastWriterRefreshWeek: number;
    lastMarketRefreshAbsoluteWeek?: number;
    lastWriterRefreshAbsoluteWeek?: number;
    lastTalentRefreshWeek?: number;
    departments?: StudioDepartments;
    equipment?: StudioEquipment;
    talentRoster?: StudioContract[];
    purchasedIPTitles?: string[];
    productionFund?: number; // NEW: Funds provided by a streaming platform for the next project
    lockedStreamingFunds?: LockedStreamingFunding[];
    platformRelations?: Record<string, PlatformFundingRelationship>;
    investorRelationships?: ProjectInvestorRelationship[];
    investorLeadershipChanges?: ProjectInvestorLeadershipChange[];
    financeLedger?: StudioFinanceEntry[];
    genreReputation?: Record<string, number>;
    marketTrends?: GenreMarketTrend[];
    rightsMarket?: RightsOpportunity[];
    rightsMarketCycle?: number;
    lastRightsMarketAdvanceWeek?: number;
    lastRightsScoutingCycle?: number;
    rightsMarketNotices?: RightsMarketNotice[];
    rightsNegotiations?: RightsNegotiation[];
    ownedRights?: OwnedRight[];
    acquisitionOrigin?: 'STUDIO_ACQUISITION';
    acquiredWeek?: number;
    acquiredYear?: number;
    acquisitionPortfolio?: StudioAcquisitionPortfolio;
    formerNames?: string[];
    lastRenamedWeek?: number;
    lastRenamedYear?: number;
    brokenAcquisitionCommitments?: Array<'PRESERVE_STUDIO_NAME'>;
    operatingModel?: SubsidiaryOperatingModel;
    operatingModelChangedWeek?: number;
    operatingModelChangedYear?: number;
    operatingMandate?: StudioOperatingMandate;
    subsidiaryProjectProposals?: SubsidiaryProjectProposal[];
    lastSubsidiaryOperationWeek?: number;
    lastSubsidiaryOperationYear?: number;
    subsidiaryPersonality?: SubsidiaryPersonality;
    subsidiaryDecisions?: SubsidiaryDecision[];
    activeDecisionArcs?: SubsidiaryDecisionArc[];
    lastSubsidiaryDecisionWeek?: number;
    lastSubsidiaryDecisionYear?: number;
    mergedIntoStudioId?: StudioId;
    mergerIntegratedWeek?: number;
    mergerIntegratedYear?: number;
    mergerIntegrationCost?: number;
    mergerPreIntegrationBalance?: number;
    mergerPreIntegrationStats?: BusinessStats;
    saleDeck?: StudioSaleDeck;
    /** Exact private company state captured when compact AI control becomes player gameplay. */
    industryHandoffSnapshot?: StudioIndustryHandoffSnapshot;
}

export interface StudioIndustryHandoffSnapshot {
    schemaVersion: 1;
    sourceStudioId: StudioId;
    materializedAtAbsoluteWeek: number;
    ai: StudioAiRuntimeState;
    activeIndustryProductionIds: string[];
}

export interface GenreMarketTrend {
    genre: Genre;
    demand: number;
    label: 'Cold' | 'Soft' | 'Stable' | 'Hot' | 'Breakout';
    reason: string;
}

export interface LockedStreamingFunding {
    id: string;
    platformId: string;
    platformName: string;
    amount: number;
    sourceProjectId: string;
    sourceTitle: string;
    franchiseId?: string;
    installmentNumber?: number;
    projectType?: ProjectType;
    createdWeek?: number;
    createdYear?: number;
    usedByProjectId?: string;
    tier?: NextSeasonFundingTier;
    reason?: string;
    warningStage?: 'FIRST' | 'FINAL';
    deadlineExtensionWeeks?: number;
    /** Links a platform commission to the existing studio Greenlight workflow. */
    ownedStreamingCommissionId?: string;
    fundingSource?: 'EXTERNAL_PLATFORM' | 'OWNED_STREAMING_PLATFORM' | 'AI_PLATFORM_COMMISSION';
    /** External Platform AI brief that owns this fixed production cap. */
    playerPlatformCommissionOfferId?: string;
    fixedBudgetCap?: boolean;
}

export type NextSeasonFundingTier = 'CONSERVATIVE' | 'STANDARD' | 'PREMIUM' | 'BREAKOUT' | 'RISKY_BET';

export interface PlatformFundingRelationship {
    trustModifier: number;
    recoveryWeeksRemaining: number;
    lastBreachWeek?: number;
    lastBreachYear?: number;
    completedDeals?: number;
    profitableDeals?: number;
    loyaltyScore?: number;
    realizedPartnerValue?: number;
}

export type PlatformAiPlayerCommissionStatus =
    | 'PENDING'
    | 'ACCEPTED'
    | 'DECLINED'
    | 'EXPIRED'
    | 'GREENLIT'
    | 'IN_PRODUCTION'
    | 'DELIVERED'
    | 'TRANSFERRED'
    | 'CANCELLED';

/** A streaming platform's persisted offer for the player's studio to physically produce an original. */
export interface PlatformAiPlayerCommissionOffer {
    id: string;
    platformId: PlatformId;
    platformName: string;
    platformContentPlanId: string;
    /** Stable contract identity shown until a script supplies the final production title. */
    briefReference: string;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience?: TargetAudience;
    status: PlatformAiPlayerCommissionStatus;
    productionBudget: number;
    producerFee: number;
    producerFeePaid: number;
    productionBudgetReturned: number;
    minimumImdbRating: number;
    deliveryAllowanceWeeks: number;
    createdAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    acceptedAtAbsoluteWeek: number | null;
    greenlitAtAbsoluteWeek: number | null;
    deliveredAtAbsoluteWeek: number | null;
    deliveryDeadlineAtAbsoluteWeek: number | null;
    cooldownUntilAbsoluteWeek: number | null;
    studioId: string | null;
    scriptId: string | null;
    commitmentId: string | null;
    canonicalProductionId: string | null;
    finalQualityScore: number | null;
    deliveredImdbRating: number | null;
    releasedAtAbsoluteWeek: number | null;
}

export interface StudioFinanceEntry {
    id: string;
    week: number;
    year: number;
    amount: number;
    type: 'THEATRICAL' | 'STREAMING_DEAL' | 'STREAMING_ROYALTY' | 'SOUNDTRACK' | 'UNIVERSE' | 'CAPITAL_INJECTION' | 'CAPITAL_WITHDRAWAL' | 'PRODUCTION_SPEND' | 'FUNDING_SURPLUS' | 'INVESTOR_FUNDING' | 'INVESTOR_PAYOUT' | 'ACQUISITION_MERGER' | 'IP_ACQUISITION' | 'STUDIO_SALE' | 'REBRAND' | 'LEGAL';
    label: string;
    projectId?: string;
}

export interface ProjectHiddenStats {
    scriptQuality: number;
    directorQuality: number;
    castingStrength: number;
    distributionPower: number;
    rawHype: number;
    qualityScore: number;
    prestigeBonus: number;
    fameMultiplier?: number; // New: Multiplier for box office based on talent fame
    castDepthScore?: number;
    castDepthNote?: string;
    studioPrestigeScore?: number;
    isRecast?: boolean;
    connectedProjectIntent?: 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';
    linkedUniverseCastCount?: number;
    releaseWeek?: number;
    platformId?: string | null;
    streamingPlatformIds?: string[];
    streamingContractIds?: string[];
    festivalPremiere?: string | null;
    redCarpetHype?: number;
    campaignFitScore?: number;
    falseMarketingRisk?: CampaignRiskLevel;
    campaignOverspendRisk?: CampaignRiskLevel;
    campaignPromise?: CampaignPositioning;
    campaignTimeline?: CampaignTimeline;
    campaignRealityChecked?: boolean;
    campaignRealityOutcome?: CampaignRealityOutcome;
    campaignReachMultiplier?: number;
    campaignReachLabel?: 'LIMITED' | 'TARGETED' | 'WIDE' | 'EVENT';
    backendPct?: number;
    musicBuzz?: number;
    musicRisk?: number;
    musicBudget?: number;
    musicOpeningLiftPct?: number;
    musicAudienceReachLiftPct?: number;
    musicSocialHypeLift?: number;
    musicTrailerStrengthLift?: number;
    musicControversyRisk?: number;
    musicMismatchBacklashRisk?: number;
    musicAwardChanceLift?: number;
    musicStreamingInterestLiftPct?: number;
    musicImpactLabel?: string;
    nextSeasonFundingAmount?: number;
    nextSeasonFundingPlatformId?: string | null;
    nextSeasonFundingSourceProjectId?: string;
    nextSeasonFundingUsedByProjectId?: string;
    nextSeasonFundingTier?: NextSeasonFundingTier;
    nextSeasonFundingReason?: string;
    // Exact current-season financing. Keep this separate from nextSeasonFundingAmount,
    // which is a future renewal cap until a continuation actually uses it.
    platformProductionFundingApplied?: number;
    productionFundApplied?: number;
    studioCashAtRisk?: number;
    investorFundingApplied?: number;
    greenlightPackageBudget?: number;
    platformFundedPremiere?: boolean;
    platformFundedPremiereConfirmed?: boolean;
    ownedStreamingCommissionId?: string;
    ownedStreamingOriginal?: boolean;
    ownedStreamingCommissionedBy?: string;
    playerPlatformCommissionOfferId?: string;
    playerPlatformCommissionMinimumImdb?: number;
    playerPlatformCommissionDeadlineAbsoluteWeek?: number;
    ownedStreamingPhysicalProducerName?: string;
    ownedStreamingReleaseScope?: StreamingOriginalReleaseScope;
    ownedStreamingReleasePattern?: StreamingOriginalReleasePattern;
    ownedStreamingLocalizationPackage?: StreamingOriginalLocalizationPackage;
    rareChaosResolved?: boolean;
    rareChaosKind?: RareHollywoodChaosKind;
    rareChaosReason?: string;
    rareChaosPlatformId?: string | null;
    rareChaosFundingCap?: number;
    rareChaosResolvedWeek?: number;
    rareChaosResolvedYear?: number;
    forcedRareChaosKind?: RareHollywoodChaosKind;
    boxOfficeCapRoll?: number;
    boxOfficeTotalCap?: number;
    boxOfficeCapLabel?: 'STANDARD' | 'EVENT' | 'BREAKOUT' | 'LIMITED';
    // Marks a streaming deal generated by an autonomous subsidiary rather than the player-facing deal room.
    subsidiaryStreamingContract?: boolean;
    subsidiaryStreamingUpfrontPaid?: boolean;
    selfRunProduction?: boolean;
    selfRunLoad?: number;
    studioSlateFatigueScore?: number;
    studioSlateFatigueLabel?: 'FRESH' | 'CROWDED' | 'FATIGUED';
    /** One bounded story-coherence result. Downstream ratings and reviews read this snapshot; they do not re-penalize it. */
    characterStoryFitScore?: number;
    characterStoryFitLabel?: CharacterStoryFitLabel;
    characterStoryFitAdjustment?: number;
    characterStoryFitSummary?: string;
    characterStoryFitStrengths?: string[];
    characterStoryFitWarnings?: string[];
    /** Compact cast-versus-conflict read reused by canon screens, news, and social reactions. */
    castStoryArchetype?: CastStoryArchetype;
    castStoryHeadline?: string;
    castStorySummary?: string;
    castStoryBalanceScore?: number;
    backgroundAuthenticity?: number;
    backgroundReliability?: number;
    backgroundSetCare?: number;
    backgroundDiscoveryPotential?: number;
}

export type RareHollywoodChaosKind =
    | 'FLOP_SEQUEL_GAMBLE'
    | 'CANCELLED_SHOW_REVIVAL'
    | 'PLATFORM_MOONSHOT'
    | 'STUDIO_REBOOT_GAMBLE';

export type OwnedProductionTrackType = 'ACTING' | 'DIRECTING' | 'PRODUCING';
export type OwnedProductionActionId =
    | 'ACTOR_PREP'
    | 'ACTOR_SCENE'
    | 'ACTOR_BIG_PUSH'
    | 'DIRECTOR_PLAN'
    | 'DIRECTOR_SHOT_DECISION'
    | 'DIRECTOR_MAJOR_PUSH'
    | 'DIRECTOR_RISKY_DECISION'
    | 'DIRECTOR_CUT'
    | 'PRODUCER_SCRIPT_REVIEW'
    | 'PRODUCER_CAST_CREW_PREP'
    | 'PRODUCER_SET_QUALITY'
    | 'PRODUCER_EDIT_NOTES'
    | 'PRODUCER_RELEASE_POSITIONING';

export interface ProductionCalendar {
    preProductionWeeks: number;
    productionWeeks: number;
    postProductionWeeks: number;
    totalWeeks: number;
    focusWindowWeeks: number;
    elapsedWeeks: number;
    startedAbsoluteWeek?: number;
}

export interface PlayerProductionFocus {
    isPlayerActor?: boolean;
    isPlayerDirector?: boolean;
    isPlayerProducer?: boolean;
    actorPrep?: number;
    actorSceneRehearsal?: number;
    actorBigPerformance?: number;
    actorPerformance?: number;
    actorPromotion?: number;
    directorPrep?: number;
    directorShotDecision?: number;
    directorMajorCreativePush?: number;
    directorRiskyDecision?: number;
    directorPerformance?: number;
    directorPost?: number;
    producerScriptPolish?: number;
    producerCastCrewPrep?: number;
    producerSetQuality?: number;
    producerEditNotes?: number;
    producerReleasePositioning?: number;
    producerPrep?: number;
    producerPerformance?: number;
    producerPost?: number;
    qualityLift?: number;
}

export interface CastMember {
    id: string;
    name: string;
    role: string;
    isPlayer: boolean;
    image: string;
    type: 'ACTOR' | 'DIRECTOR';
    npcId?: string;
    isReturning?: boolean;
    salary?: number;
    roleId?: string;
    roleName?: string;
    roleType?: RoleType;
    actorId?: string;
    actorName?: string;
    status?: 'PENDING' | 'CONFIRMED' | 'REJECTED';
    characterId?: string;
    characterName?: string;
    sourceUniverseId?: UniverseId;
    storyFunction?: CharacterStoryFunction;
    storyRole?: CharacterStoryRole;
    abilityType?: CharacterAbilityType;
    nature?: CharacterNature;
    identitySource?: CharacterIdentitySource;
}

export interface Review {
    id: string;
    author: string;
    publication: string;
    text: string;
    sentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE';
    type: 'CRITIC' | 'AUDIENCE';
    rating: number;
}

export interface AudienceReactionQuote {
    id: string;
    author: string;
    text: string;
    sentiment: 'POSITIVE' | 'MIXED' | 'NEGATIVE';
    rating: number;
    week: number;
    year: number;
}

export interface AudienceReception {
    openingScore: number;
    currentScore: number;
    previousScore?: number;
    trend: 'RISING' | 'STEADY' | 'FALLING';
    label: string;
    summary: string;
    sampleSize: number;
    updatedWeek: number;
    updatedYear: number;
    isFinal: boolean;
    quotes: AudienceReactionQuote[];
}

export interface EpisodeRating {
    episode: number;
    rating: number;
}

export interface SeasonEpisodeRatings {
    season: number;
    episodes: EpisodeRating[];
    averageRating: number;
    verdict: 'AWESOME' | 'GREAT' | 'GOOD' | 'REGULAR' | 'BAD' | 'GARBAGE';
}

export interface PosterElement {
    id: string;
    type: 'TEXT' | 'ICON' | 'IMAGE';
    content: string; // text, icon name, or base64 image
    x: number;
    y: number;
    scale: number;
    rotation: number;
    color?: string;
    fontFamily?: string;
    fontWeight?: string;
    zIndex: number;
}

export interface CustomPoster {
    type: 'CONFIG' | 'IMAGE' | 'CANVA';
    bgGradient?: string;
    icon?: string;
    textColor?: string;
    posterMediaId?: string;
    imageData?: string; // base64 compressed image
    layout?: 'CENTER' | 'TOP' | 'BOTTOM' | 'MINIMAL';
    tagline?: string;
    overlay?: 'NONE' | 'VINTAGE' | 'GRITTY' | 'GLOSSY' | 'NEON';
    credits?: string;
    canvasData?: {
        background: string; // hex, gradient class, or base64 image
        elements: PosterElement[];
    };
}

export interface MusicArtist {
    id: string;
    stageName: string;
    realName: string;
    genre: string;
    gender: MusicArtistGender;
    subgenre: string;
    fameTier: MusicArtistFameTier;
    reputation: number;
    audience: string;
    region: string;
    costLow: number;
    costHigh: number;
    socialFollowers: number;
    soundtrackFitTags: string[];
    strengths: string[];
    risks: string[];
    scandalRisk: MusicArtistScandalRisk;
    availability: MusicArtistAvailability;
    personality: string;
    dealPreference: string;
}

export interface ProjectMusicCredit {
    artistId: string;
    artistName: string;
    genre: string;
    role: MusicCreditRole;
    songTitle: string;
    dealType: string;
    estimatedCost: number;
    buzz: number;
    risk: number;
}

export interface ProjectMusicPlan {
    strategy: ProjectMusicStrategy;
    artistTargetCount?: number;
    selectedCreditRoles?: MusicCreditRole[];
    credits: ProjectMusicCredit[];
    musicBudget: number;
    musicBuzz: number;
    musicRisk: number;
    soundtrackTitle?: string;
    generatedWeek?: number;
}

export interface ProjectMusicImpact {
    openingWeekendLiftPct: number;
    audienceReachLiftPct: number;
    socialHypeLift: number;
    trailerStrengthLift: number;
    controversyRisk: number;
    mismatchBacklashRisk: number;
    awardChanceLift: number;
    streamingInterestLiftPct: number;
    score: number;
    label: string;
    headline: string;
    strengths: string[];
    warnings: string[];
}

export interface ProjectSoundtrackRevenueBreakdown {
    albumRevenue: number;
    leadSingleRevenue: number;
    musicVideoRevenue: number;
    streamingBuzzRevenue: number;
    viralSongRevenue: number;
    totalRevenue: number;
}

export type ProjectInvestorKind =
    | 'PRODUCER'
    | 'FILM_FUND'
    | 'PRIVATE_INVESTOR'
    | 'COPRODUCTION_COMPANY'
    | 'REGIONAL_COMPANY'
    | 'STREAMING_FINANCE'
    | 'BRAND_MEDIA';

export type ProjectInvestorFundingMode = 'LEAD' | 'SYNDICATE';

export interface ProjectInvestorRelationship {
    investorId: string;
    trustScore: number;
    totalFunded: number;
    totalPayout: number;
    projectsBacked: number;
    profitableProjects: number;
    failedProjects: number;
    lastProjectTitle?: string;
    lastProjectId?: string;
    lastInteractionWeek?: number;
    lastInteractionYear?: number;
}

export interface ProjectInvestorLeadershipChange {
    investorId: string;
    previousOwnerName?: string;
    newOwnerName: string;
    newOwnerNpcId: string;
    title: string;
    reason: string;
    week: number;
    year: number;
}

export interface ProjectInvestor {
    id: string;
    name: string;
    kind: ProjectInvestorKind;
    source?: 'NPC' | 'COMPANY' | 'FUND';
    sourceNpcId?: string;
    ownerNpcId?: string;
    ownerName?: string;
    ownerTitle?: string;
    headquarters?: string;
    investorTags: string[];
    personality: string;
    profile: string;
    preferredFundingModes?: ProjectInvestorFundingMode[];
    reputation: number;
    cashCapacity: number;
    minInvestment: number;
    maxInvestment: number;
    preferredGenres: Genre[];
    riskTolerance: number;
    relationshipBias?: number;
    description: string;
}

export interface ProjectInvestorOffer {
    investorId: string;
    investorName: string;
    kind: ProjectInvestorKind;
    fundingMode?: ProjectInvestorFundingMode;
    ownerNpcId?: string;
    ownerName?: string;
    ownerTitle?: string;
    headquarters?: string;
    investorTags: string[];
    personality: string;
    relationshipScore?: number;
    relationshipLabel?: string;
    amount: number;
    cleanEquityPercent?: number;
    equityPercent: number;
    equityPremiumPercent?: number;
    confidence: number;
    reputation: number;
    fitLabel?: string;
    note: string;
}

export interface ProjectInvestorCommitment {
    investorId: string;
    investorName: string;
    kind: ProjectInvestorKind;
    ownerNpcId?: string;
    ownerName?: string;
    ownerTitle?: string;
    investorTags?: string[];
    amount: number;
    equityPercent: number;
    cleanEquityPercent?: number;
    offeredAmount?: number;
    targetRole?: 'LEAD' | 'SYNDICATE' | 'EXCESS';
}

export interface ProjectInvestorPlan {
    fundingMode?: ProjectInvestorFundingMode;
    sourceProjectId?: string;
    sourceTitle?: string;
    targetRaise: number;
    totalRaised: number;
    investorEquityPercent: number;
    studioEquityPercent: number;
    commitments: ProjectInvestorCommitment[];
    createdWeek?: number;
    createdYear?: number;
}

export interface ProjectInvestorPayoutSummary {
    lifetimeInvestorPayout: number;
    weeklyInvestorPayouts?: number[];
}

export type OutsideProductionStatus = 'INVITED' | 'FUNDED' | 'RELEASED' | 'STREAMING' | 'FINISHED' | 'CANCELLED';

export interface OutsideProductionScoutReport {
    scriptQuality: number;
    directorQuality: number;
    castQuality: number;
    budgetDiscipline: number;
    marketFit: number;
    buzz: number;
    risk: number;
    roiLowPct: number;
    roiHighPct: number;
}

export interface OutsideProducerInvestmentOffer {
    id: string;
    projectId: string;
    projectTitle: string;
    producerName: string;
    studioName: string;
    producerType?: string;
    ownerName?: string;
    trackRecord?: number;
    genre: Genre;
    logline: string;
    budget: number;
    cashAsk: number;
    offeredStakePercent: number;
    maxStakePercent: number;
    minCashAsk: number;
    maxCashAsk: number;
    flexible: boolean;
    finalTerms: boolean;
    acceptanceChance: number;
    scoutReport: OutsideProductionScoutReport;
    directorName: string;
    castNames: string[];
    expectedReleaseWeeks: number;
    expectedRunWeeks: number;
    releasePath: 'THEATRICAL' | 'STREAMING' | 'FESTIVAL';
    counterUsed?: boolean;
    counterAttempts?: number;
    maxCounterAttempts?: number;
    counterClosed?: boolean;
    counterClosedReason?: string;
    lastCounterFeedback?: {
        accepted: boolean;
        declined: boolean;
        chance: number;
        cashAmount: number;
        stakePercent: number;
        week: number;
        year: number;
        attempt?: number;
        reason?: string;
    };
    fraudRisk?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    riskSignals?: Array<'GENEROUS_TERMS' | 'UNVERIFIED_FINANCING' | 'SHELL_COMPANY' | 'RUSHED_CLOSE'>;
    financingStatus?: 'VERIFIED' | 'UNVERIFIED_FINANCING' | 'SHELL_COMPANY';
    legalExposure?: number;
    createdWeek: number;
    createdYear: number;
    expiresInWeeks: number;
}

export interface OutsideProductionInvestment {
    id: string;
    offerId: string;
    projectId: string;
    projectTitle: string;
    producerName: string;
    studioName: string;
    producerType?: string;
    ownerName?: string;
    trackRecord?: number;
    genre: Genre;
    logline: string;
    budget: number;
    investedAmount: number;
    stakePercent: number;
    status: OutsideProductionStatus;
    scoutReport: OutsideProductionScoutReport;
    directorName: string;
    castNames: string[];
    releasePath: 'THEATRICAL' | 'STREAMING' | 'FESTIVAL';
    acceptedWeek: number;
    acceptedYear: number;
    releaseWeek: number;
    releaseYear: number;
    finishWeek?: number;
    finishYear?: number;
    grossRevenue?: number;
    producerReceipts?: number;
    playerPayout?: number;
    profit?: number;
    reputationImpact?: number;
    resultSummary?: string;
    finalOutcome?: 'HIT' | 'PROFIT' | 'BREAK_EVEN' | 'LOSS' | 'CANCELLED' | 'FRAUD_CASE';
    fraudRisk?: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
    riskSignals?: Array<'GENEROUS_TERMS' | 'UNVERIFIED_FINANCING' | 'SHELL_COMPANY' | 'RUSHED_CLOSE'>;
    financingStatus?: 'VERIFIED' | 'UNVERIFIED_FINANCING' | 'SHELL_COMPANY';
    legalExposure?: number;
    fraudFalloutAbsoluteWeek?: number;
    fraudFalloutResolved?: boolean;
    legalFees?: number;
    eventLog?: string[];
}

export interface ProjectDetails {
    title: string;
    sourceScriptId?: string;
    // Persist the credited writer when a script is greenlit. The studio roster
    // can change later, but continuations still need to know who wrote the
    // previous installment.
    writerId?: string;
    writerName?: string;
    writerSkill?: number;
    isOriginal?: boolean;
    type: ProjectType;
    description: string;
    studioId: StudioId;
    subtype: ProjectSubtype;
    genre: Genre;
    originalLanguageId?: string;
    format?: ProjectFormat;
    subjectName?: string;
    subjectType?: ScriptSubjectType;
    /** Shared story intent used by scripts, Greenlight, offers, and reactions. */
    storyCompass?: StoryCompass;
    connectedProjectIntent?: 'AUTO' | 'SOLO' | 'CROSSOVER' | 'EVENT' | 'REBOOT';
    targetAudience?: TargetAudience;
    budgetTier: BudgetTier;
    estimatedBudget: number;
    releaseScale?: ReleaseScale;
    releaseStrategy?: ReleaseStrategy;
    visibleHype: 'LOW' | 'MID' | 'HIGH';
    hiddenStats: ProjectHiddenStats;
    playerProductionFocus?: PlayerProductionFocus;
    directorName: string;
    directorId?: string;
    director?: any;
    visibleDirectorTier: string;
    visibleScriptBuzz: string;
    visibleCastStrength: string;
    universeId?: UniverseId;
    universeSagaName?: string;
    universePhaseName?: string;
    newUniverseName?: string;
    isFamous?: boolean;
    castList?: CastMember[];
    backgroundCastingPlan?: BackgroundCastingPlan;
    crewList?: CrewMember[]; // NEW: Crew roster
    location?: LocationDetails; // NEW: Filming location
    reviews?: Review[];
    audienceReception?: AudienceReception;
    episodeRatings?: SeasonEpisodeRatings[];
    episodes?: number;
    tone?: number; // 0 = Practical, 100 = CGI
    visualStyle?: 'REALISTIC' | 'STYLISTIC' | 'GRITTY' | 'VIBRANT';
    pacing?: 'SLOW' | 'MODERATE' | 'FAST' | 'FRENETIC';
    reservedMarketingBudget?: number;
    marketingBudgetSpent?: number;
    marketingBudgetRemaining?: number;
    equipmentChoices?: Record<string, string>;
    franchiseId?: string;
    installmentNumber?: number;
    screeningStrategy?: ScreeningStrategy;
    releaseRegionIds?: BoxOfficeRegionId[];
    releaseChainSelections?: Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>;
    campaignPositioning?: CampaignPositioning;
    campaignTimeline?: CampaignTimeline;
    campaignFitSnapshot?: CampaignFitSnapshot;
    campaignForecastSnapshot?: CampaignForecastSnapshot;
    campaignRealitySnapshot?: CampaignRealitySnapshot;
    marketingChannelAllocations?: MarketingChannelAllocations;
    returnedMarketingBudget?: number;
    campaignItems?: string[]; // IDs of selected campaign items
    totalCampaignSpend?: number;
    releaseDate?: number; // Week of release
    streamingRevenue?: number;
    releasePlanningDraft?: ReleasePlanningDraft;
    customPoster?: CustomPoster;
    musicPlan?: ProjectMusicPlan;
    investorPlan?: ProjectInvestorPlan;
    investorPayouts?: ProjectInvestorPayoutSummary;
    /** B7 lineage for an active production inherited through company ownership. */
    industryProductionId?: string;
    canonicalIndustryProjectId?: string;
    inheritedFromStudioAi?: boolean;
    inheritedPaidMillions?: number;
    inheritedProblemIds?: string[];
    inheritedProductionStatus?: IndustryProductionStatus;
    /** Stable private-industry idea lineage when a subsidiary develops inherited strategy. */
    industryContentFingerprintId?: string;
}

export interface ReleasePlanningDraft {
    step: number;
    releaseType: 'THEATRICAL' | 'STREAMING_ONLY' | null;
    screeningStrategy: ScreeningStrategy | null;
    selectedRegionIds: BoxOfficeRegionId[];
    distributionChainSelections: Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>;
    campaignPositioning: CampaignPositioning;
    campaignTimeline: CampaignTimeline;
    channelAllocations: MarketingChannelAllocations;
    selectedPlatform: string | null;
    selectedStreamingPlatformIds?: string[];
    selectedStreamingContractIds?: string[];
    festivalPremiere: string | null;
    releaseWeek: number;
    /** Signing is the real-world commitment boundary for platform rights. */
    commitmentState?: 'DRAFT' | 'SIGNED';
    /** Platform-selected premiere shared by every accepted non-exclusive licence. */
    lockedPremiereAbsoluteWeek?: number | null;
    updatedAt: number;
}

export interface CrewMember {
    id: string;
    name: string;
    role: 'DIRECTOR' | 'CINEMATOGRAPHER' | 'COMPOSER' | 'LINE_PRODUCER' | 'STUNT_COORDINATOR' | 'VFX_SUPERVISOR';
    stats: {
        vision?: number;
        style?: number;
        temperament?: number;
        lighting?: number;
        composition?: number;
        melody?: number;
        atmosphere?: number;
        logistics?: number;
        thrift?: number;
        safety?: number;
        spectacle?: number;
        technical?: number;
    };
    salary: number;
    status: 'PENDING' | 'SIGNED' | 'REJECTED';
    offerWeek?: number;
    tier: 'INDIE' | 'PROFESSIONAL' | 'AUTEUR' | 'LEGEND';
    isPlayer?: boolean;
}

export interface LocationDetails {
    id: string;
    name: string;
    region: string;
    costModifier: number; // e.g., 0.8 for tax credits, 1.5 for expensive
    qualityBonus: number; // Visual bonus
    genreBonus?: Genre[]; // Genres that get a bonus here
    status: 'PENDING' | 'SECURED' | 'DENIED';
    description: string;
    coordinates: { x: number, y: number }; // For map placement
}

export interface StreamingState {
    platformId: PlatformId;
    /** Reference to the actor-neutral world streaming-rights contract. */
    contractId?: string;
    weekOnPlatform: number;
    totalViews: number;
    weeklyViews: number[];
    isLeaving: boolean;
    startWeek?: number;
    startWeekAbsolute?: number;
}

/** One independently simulated and settled buyer in a shared streaming release. */
export interface StreamingPlatformRun {
    platformId: string;
    contractId: string;
    startWeekAbsolute: number;
    weekOnPlatform: number;
    totalViews: number;
    weeklyViews: number[];
    isLeaving: boolean;
}

/**
 * The player's owned streaming company is intentionally separate from
 * StreamingState, which tracks a single title licensed to a third-party
 * platform. Catalog entries reference existing project IDs so movie and show
 * data continues to have one source of truth.
 */
export type OwnedStreamingPlatformLifecycle = 'LOCKED' | 'ELIGIBLE' | 'FOUNDING' | 'ACTIVE' | 'SUSPENDED';
export type StreamingInfrastructureStrategy = 'UNDECIDED' | 'CLOUD_FIRST' | 'OWNED_INFRASTRUCTURE' | 'HYBRID';
export type StreamingLogoKey = 'FRAME_PLAY' | 'SIGNAL_RING' | 'SPOTLIGHT' | 'WORDMARK';
export type StreamingWordmarkStyleId = 'WORDMARK' | 'SIDE' | 'STACK' | 'ICON';
export type StreamingTypefaceId = 'GROTESK' | 'GEOMETRIC' | 'SERIF' | 'CONDENSED' | 'MONO' | 'SLAB';
export type StreamingSoundIdentKey =
    | 'PULSE' | 'ASCENT' | 'PREMIERE' | 'SILENT' | 'CHOIR' | 'MACHINE'
    | 'SPARK' | 'IMPACT' | 'ORBIT' | 'BLOOM' | 'PRISM' | 'EMBER'
    | 'SIGNAL' | 'HORIZON' | 'ANALOG';
export type StreamingBrandPromiseId =
    | 'EVENT_HOUSE'
    | 'BINGE_MACHINE'
    | 'FANDOM_FOREVER'
    | 'WORLD_STAGE'
    | 'EVERYONES_SCREEN'
    | 'TECHNOLOGY_FIRST'
    | 'BALANCED';
/** Retained only to migrate founding records created before schema v7. */
export type StreamingLaunchScale = 'FOCUSED' | 'NATIONAL' | 'GLOBAL';
/** Retained only to migrate founding records created before schema v7. */
export type StreamingFundingPlan = 'FOUNDER_FUNDED' | 'GROWTH_LOAN' | 'MINORITY_ROUND';
export type StreamingTechnologyBranch =
    | 'DELIVERY_CAPACITY'
    | 'PLAYBACK_QUALITY'
    | 'RELIABILITY'
    | 'DATA_RECOMMENDATIONS'
    | 'SECURITY'
    | 'CONTENT_OPERATIONS'
    | 'ADVERTISING_COMMERCE'
    | 'PRODUCT_EXPERIENCE';

export type StreamingProductLineId =
    | 'CORE'
    | 'KIDS'
    | 'FREE'
    | 'LIVE'
    | 'FAN'
    | 'STORE'
    | 'INTERACTIVE';
export type StreamingProductLaunchMode = 'VALIDATED' | 'BALANCED' | 'FIRST_TO_MARKET';
export type StreamingProductLineStatus = 'UNDER_DEVELOPMENT' | 'ACTIVE' | 'PAUSED';
export type StreamingProductRisk = 'LOW' | 'MODERATE' | 'HIGH';

export interface OwnedStreamingProductBenefit {
    acquisitionRateDelta: number;
    churnRateDelta: number;
    engagementRateDelta: number;
    weeklyRevenuePerSubscriber: number;
    productExperienceLevel: number;
    advertisingCommerceLevel: number;
}

export interface OwnedStreamingProductLine {
    id: string;
    idempotencyKey: string;
    lineId: Exclude<StreamingProductLineId, 'CORE'>;
    title: string;
    status: StreamingProductLineStatus;
    launchMode: StreamingProductLaunchMode;
    capitalCost: number;
    weeklyOperatingCost: number;
    staffRequired: number;
    peakLoadPercent: number;
    developmentWeeks: number;
    benefit: OwnedStreamingProductBenefit;
    risk: StreamingProductRisk;
    riskNote: string;
    strategicConsequence: string;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    launchedAtAbsoluteWeek: number | null;
    lastStatusChangedAtAbsoluteWeek: number;
}

export interface OwnedStreamingPlatformIdentity {
    name: string;
    slug: string;
    primaryColor: string;
    secondaryColor: string;
    logoKey: StreamingLogoKey;
    /** Exact visual mark chosen in the brand studio; logoKey remains the compatibility family. */
    visualMarkId?: string;
    customMarkDataUrl?: string | null;
    wordmarkStyleId?: StreamingWordmarkStyleId;
    typefaceId?: StreamingTypefaceId;
    /** Legacy founding choice. New companies configure their ident after incorporation. */
    soundIdentKey?: StreamingSoundIdentKey;
    brandPromiseId: StreamingBrandPromiseId;
    /** Player-authored public copy. Strategy remains driven by brandPromiseId. */
    publicManifesto: string;
    /** Legacy founding choice. New companies choose opening markets after incorporation. */
    dayOneMarketIds?: string[];
    /** Legacy founding choice. New companies choose servers in Build. */
    launchServerCityId?: string | null;
    foundedAtAbsoluteWeek: number;
}

export interface OwnedStreamingFoundingDraft {
    currentStep: number;
    name: string;
    logoKey: StreamingLogoKey;
    primaryColor: string;
    secondaryColor: string;
    visualMarkId?: string;
    customMarkDataUrl?: string | null;
    wordmarkStyleId?: StreamingWordmarkStyleId;
    typefaceId?: StreamingTypefaceId;
    /** Legacy resume compatibility only; omitted by simplified founding. */
    soundIdentKey?: StreamingSoundIdentKey;
    brandPromiseId: StreamingBrandPromiseId;
    publicManifesto: string;
    /** Legacy resume compatibility only; omitted by simplified founding. */
    dayOneMarketIds?: string[];
    /** Legacy resume compatibility only; omitted by simplified founding. */
    launchServerCityId?: string | null;
    updatedAtAbsoluteWeek: number;
}

export type OwnedStreamingIncorporationModel =
    | 'FIXED_V8_ZERO_TREASURY'
    | 'FIXED_V7'
    | 'LEGACY_PRE_V7';

export interface OwnedStreamingLegacyFoundingTerms {
    launchScale: StreamingLaunchScale;
    fundingPlan: StreamingFundingPlan;
    launchBudget: number;
    foundingExecutiveIds: string[];
}

export interface OwnedStreamingFoundingProfile {
    incorporationModel: OwnedStreamingIncorporationModel;
    founderCashCharged: number;
    setupCostsConsumed: number;
    openingTreasuryCash: number;
    outsideCapitalRaisedAtIncorporation: number;
    debtPrincipalAtIncorporation: number;
    founderOwnershipPercentAtIncorporation: number;
    founderWasCeoAtIncorporation: true;
    incorporatedAtAbsoluteWeek: number;
    legacyTerms?: OwnedStreamingLegacyFoundingTerms;
}

/**
 * Canonical pre-launch and expansion facts. These records are intentionally
 * presentation-agnostic: screens derive progress, labels and colour from them.
 */
export type StreamingLaunchProgramStatus = 'NOT_STARTED' | 'PLANNING' | 'READY' | 'LAUNCHED';
export type StreamingDefineLaunchStepId =
    | 'FUND'
    | 'MARKETS'
    | 'CLEARANCE'
    | 'IDENTITY'
    | 'STOREFRONT'
    | 'CATALOGUE'
    | 'PRICING'
    | 'BLUEPRINT';
export type StreamingBuildLaunchStepId =
    | 'BLUEPRINT'
    | 'FACILITIES'
    | 'RACKS'
    | 'CAPACITY'
    | 'COMMISSIONING'
    | 'REHEARSAL';
export type StreamingMarketOperationScope = 'COUNTRY' | 'LEGACY_REGION';
export type StreamingMarketEntryKind = 'OPENING' | 'EXPANSION' | 'LEGACY_REGION_ACCESS';
export type StreamingMarketOperationStatus =
    | 'NOT_ENTERED'
    | 'EVALUATING'
    | 'PLANNED'
    | 'AWAITING_FUNDING'
    | 'CLEARANCE'
    | 'INFRASTRUCTURE_PREPARATION'
    | 'READY'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'EXITED';
export type StreamingMarketOperationSource = 'PLAYER_ACTION' | 'PLATFORM_AI' | 'LEGACY_DAY_ONE' | 'LEGACY_REGIONAL';

export interface OwnedStreamingLaunchProgramState {
    status: StreamingLaunchProgramStatus;
    startedAtAbsoluteWeek: number | null;
    configurationRevision: number;
    serviceConfigurationCommittedAtAbsoluteWeek: number | null;
    lastRehearsalSignature: string | null;
    completedAtAbsoluteWeek: number | null;
    defineCurrentStep: StreamingDefineLaunchStepId;
    buildCurrentStep: StreamingBuildLaunchStepId;
    lastBlueprintSignature: string | null;
    blueprintSavedAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingMarketCostBreakdown {
    rights: number;
    compliance: number;
    localization: number;
    infrastructure: number;
    other: number;
    total: number;
}

export type StreamingMarketLocalizationPreference = 'ORIGINAL_AUDIO' | 'SUBTITLE_FIRST' | 'DUB_FIRST' | 'MIXED';
export type StreamingMarketRightsAvailability = 'OPEN' | 'LIMITED' | 'TIGHT';
export type StreamingMarketPolicyClimate = 'OPEN' | 'BALANCED' | 'PROTECTIVE';
export type StreamingMarketPrivacyComplianceLevel = 'STANDARD' | 'ENHANCED' | 'STRICT';
export type StreamingMarketClearanceStage =
    | 'APPLICATION_FILED'
    | 'RIGHTS_VERIFICATION'
    | 'REGULATORY_REVIEW'
    | 'CONSUMER_DATA_COMPLIANCE'
    | 'FINAL_APPROVAL';
export type StreamingMarketClearanceOutcome =
    | 'PENDING'
    | 'APPROVED'
    | 'APPROVED_WITH_CONDITIONS'
    | 'DELAYED'
    | 'ADDITIONAL_REQUIREMENT'
    | 'TEMPORARILY_REJECTED';

export interface OwnedStreamingCountryLanguageShare {
    language: string;
    audiencePercent: number;
}

export interface OwnedStreamingCountryNetworkFootprint {
    recommendedCityId: string;
    edgeSites: number;
    originCapacitySharePercent: number;
    peakConcurrentStreams: number;
    bandwidthGbps: number;
}

/** Stable game-world country facts copied into the save when a market is first evaluated. */
export interface OwnedStreamingCountryMarketProfile {
    countryId: string;
    country: string;
    regionId: string;
    audienceSize: number;
    annualGrowthPercent: number;
    languageDistribution: OwnedStreamingCountryLanguageShare[];
    localizationPreference: StreamingMarketLocalizationPreference;
    competitors: Array<{ id: string; name: string; watchSharePercent: number }>;
    rightsAvailability: StreamingMarketRightsAvailability;
    entryCosts: OwnedStreamingMarketCostBreakdown;
    approvalPeriodWeeks: { minimum: number; maximum: number };
    taxBaselinePercent: number;
    streamingLevyBaselinePercent: number;
    localContentObligationPercent: number;
    privacyComplianceLevel: StreamingMarketPrivacyComplianceLevel;
    complianceRequirements: string[];
    recommendedNetworkFootprint: OwnedStreamingCountryNetworkFootprint;
}

export interface OwnedStreamingMarketPolicySnapshot {
    effectiveTaxPercent: number;
    streamingLevyPercent: number;
    localContentObligationPercent: number;
    privacyComplianceLevel: StreamingMarketPrivacyComplianceLevel;
    policyClimate: StreamingMarketPolicyClimate;
    revision: number;
    nextElectionAtAbsoluteWeek: number;
    capturedAtAbsoluteWeek: number;
}

export interface OwnedStreamingMarketClearanceHistoryEntry {
    absoluteWeek: number;
    stage: StreamingMarketClearanceStage;
    outcome: StreamingMarketClearanceOutcome;
    summary: string;
}

export interface OwnedStreamingMarketClearanceState {
    stage: StreamingMarketClearanceStage;
    progressPercent: number;
    outcome: StreamingMarketClearanceOutcome;
    condition: string | null;
    additionalPayment: number;
    submittedAtAbsoluteWeek: number;
    stageStartedAtAbsoluteWeek: number;
    nextReviewAtAbsoluteWeek: number;
    resumeAllowedAtAbsoluteWeek: number | null;
    reviewAttempt: number;
    history: OwnedStreamingMarketClearanceHistoryEntry[];
}

export interface OwnedStreamingMarketOperation {
    id: string;
    idempotencyKey: string;
    scope: StreamingMarketOperationScope;
    scopeId: string;
    countryId: string | null;
    regionId: string;
    entryKind: StreamingMarketEntryKind;
    status: StreamingMarketOperationStatus;
    plannedCosts: OwnedStreamingMarketCostBreakdown;
    committedCosts: OwnedStreamingMarketCostBreakdown;
    weeklyOperatingCost: number;
    countryProfile?: OwnedStreamingCountryMarketProfile | null;
    policySnapshot: OwnedStreamingMarketPolicySnapshot | null;
    policyHistory?: OwnedStreamingMarketPolicySnapshot[];
    clearance?: OwnedStreamingMarketClearanceState | null;
    plannedAtAbsoluteWeek: number;
    committedAtAbsoluteWeek: number | null;
    approvalReadyAtAbsoluteWeek: number | null;
    activatedAtAbsoluteWeek: number | null;
    suspendedAtAbsoluteWeek: number | null;
    exitedAtAbsoluteWeek: number | null;
    source: StreamingMarketOperationSource;
    platformAiEfficiencySnapshot?: PlatformAiEfficiencySnapshot | null;
    platformAiPartnership?: {
        partnerId: string;
        weeklyPremium: number;
        performanceCeilingPercent: number;
    } | null;
    /** Per-actor weekly idempotency guard. Phase 7 owns the global turn checkpoint. */
    lastProcessedAbsoluteWeek?: number;
}

export type StreamingServiceConfigurationSource = 'UNCONFIGURED' | 'PLAYER_ACTION' | 'LEGACY_FOUNDING';
export type StreamingIdentPackageId = 'STANDARD' | 'FULL' | 'CINEMATIC' | 'GENRE' | 'ADAPTIVE' | 'LIVING';

export type StreamingRevenueStreamId =
    | 'subs' | 'ads' | 'rentals' | 'premium' | 'daypass' | 'sponsor' | 'metered' | 'patron';

export type StreamingPricingPlanColorId =
    | 'emerald' | 'ocean' | 'teal' | 'rose' | 'magenta' | 'graphite';

export interface OwnedStreamingPricingPlan {
    id: string;
    name: string;
    monthly: number;
    featureIds: string[];
    ads: boolean;
    colorId?: StreamingPricingPlanColorId;
}

export interface OwnedStreamingPricingConfiguration {
    streams: StreamingRevenueStreamId[];
    plans: OwnedStreamingPricingPlan[];
    annualDiscount: number;
    introOffer: number;
    ads: { minutesPerHour: number; cpm: number };
    rentals: { rent: number; buy: number; windowWeeks: number };
    premium: { price: number };
    daypass: { price: number };
    sponsor: { perTitle: number; titles: number };
    metered: { perHour: number };
    patron: { monthly: number };
}

export interface OwnedStreamingServiceConfiguration {
    source: StreamingServiceConfigurationSource;
    soundIdentKey: StreamingSoundIdentKey | null;
    identPackageId: StreamingIdentPackageId | null;
    identDurationSeconds: number;
    /** Player-supplied ident audio is stored locally after being shortened,
        downmixed and re-encoded for mobile WebViews. Absent for presets. */
    customIdentAudio?: OwnedStreamingCustomIdentAudio | null;
    storefrontLayoutId: string | null;
    pricingApproach: string | null;
    pricing: OwnedStreamingPricingConfiguration;
    committedCost: number;
    committedAtAbsoluteWeek: number | null;
    revision: number;
}

export interface OwnedStreamingCustomIdentAudio {
    dataUrl: string;
    originalName: string;
    durationSeconds: number;
    sampleRate: number;
    byteLength: number;
    fingerprint: string;
}

export type StreamingInstalledCapabilityStatus = 'OPERATING' | 'LEGACY_GRANT';

export interface OwnedStreamingInstalledCapability {
    capabilityId: string;
    branch: StreamingTechnologyBranch;
    status: StreamingInstalledCapabilityStatus;
    installedAtAbsoluteWeek: number;
    sourceProjectId: string | null;
    legacyLevelFloor: number;
}

export interface OwnedStreamingCapabilityPortfolio {
    installed: OwnedStreamingInstalledCapability[];
    legacyLevelFloors: Record<StreamingTechnologyBranch, number>;
}

export interface OwnedStreamingLocalizationProvider {
    id: string;
    name: string;
    status: 'AVAILABLE' | 'CONTRACTED' | 'SUSPENDED';
    languageIds: string[];
    contractedAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingLocalizationFacility {
    id: string;
    name: string;
    status: 'PLANNED' | 'BUILDING' | 'ACTIVE';
    languageIds: string[];
    readyAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingLocalizationJob {
    id: string;
    titleId: string;
    languageId: string;
    mode: 'SUBTITLE' | 'DUB';
    status: 'PLANNED' | 'IN_PROGRESS' | 'READY';
    providerId: string | null;
    facilityId: string | null;
    cashCost: number;
    readyAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingTitleLanguageAsset {
    id: string;
    titleId: string;
    languageId: string;
    subtitleReady: boolean;
    dubReady: boolean;
    readyAtAbsoluteWeek: number;
}

export interface OwnedStreamingLegacyLocalizationGrant {
    id: string;
    originalCommissionId: string;
    packageId: StreamingOriginalLocalizationPackage;
    subtitleLanguageCount: number;
    dubbedLanguageCount: number;
    readyAtAbsoluteWeek: number;
}

export interface OwnedStreamingLocalizationOperationsState {
    providers: OwnedStreamingLocalizationProvider[];
    facilities: OwnedStreamingLocalizationFacility[];
    jobs: OwnedStreamingLocalizationJob[];
    titleLanguageAssets: OwnedStreamingTitleLanguageAsset[];
    legacyPackageGrants: OwnedStreamingLegacyLocalizationGrant[];
}

export type StreamingCostCommitmentCategory =
    | 'MARKET'
    | 'SERVICE'
    | 'TECHNOLOGY'
    | 'LOCALIZATION'
    | 'NETWORK'
    | 'CONTENT'
    | 'OTHER';
export type StreamingCostCommitmentStatus = 'PLANNED' | 'COMMITTED' | 'PAID' | 'CANCELLED' | 'REFUNDED' | 'MIGRATED';

export interface OwnedStreamingCostCommitment {
    id: string;
    idempotencyKey: string;
    category: StreamingCostCommitmentCategory;
    label: string;
    status: StreamingCostCommitmentStatus;
    plannedAmount: number;
    committedAmount: number;
    paidAmount: number;
    weeklyAmount: number;
    createdAtAbsoluteWeek: number;
    committedAtAbsoluteWeek: number | null;
    paidAtAbsoluteWeek: number | null;
    sourceReferenceId: string | null;
}

export type StreamingHqSection = 'HOME' | 'CONTENT' | 'TECH' | 'MARKET' | 'COMPANY';
export type StreamingHqTourStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export type StreamingExecutiveRole =
    | 'COO'
    | 'CTO'
    | 'CFO'
    | 'CHIEF_CONTENT_OFFICER'
    | 'PRODUCT_HEAD'
    | 'MARKETING_HEAD'
    | 'ADVERTISING_HEAD'
    | 'INTERNATIONAL_HEAD'
    | 'SECURITY_TRUST_HEAD';
export type StreamingExecutiveAppointmentStatus = 'ACTIVE' | 'RESIGNED' | 'DISMISSED';
export type StreamingExecutiveStrategy =
    | 'GROWTH_FIRST'
    | 'CREATIVE_FIRST'
    | 'TECHNOLOGY_FIRST'
    | 'MARGIN_FIRST'
    | 'TRUST_FIRST'
    | 'GLOBAL_FIRST'
    | 'BALANCED';
export type StreamingExecutiveLevel = 1 | 2 | 3 | 4 | 5;

export interface OwnedStreamingExecutiveAppointment {
    id: string;
    executiveId: string;
    role: StreamingExecutiveRole;
    nameAtAppointment: string;
    status: StreamingExecutiveAppointmentStatus;
    origin: 'PLAYER_HIRED' | 'INTERNAL_PROMOTION' | 'LEGACY_FOUNDING';
    appointedAtAbsoluteWeek: number;
    endedAtAbsoluteWeek: number | null;
    weeklyCompensation: number;
    skill: number;
    loyalty: number;
    ambition: number;
    ethics: number;
    preferredStrategy: StreamingExecutiveStrategy;
    founderRelationship: number;
    internalRelationship: number;
    performance: number;
    level: StreamingExecutiveLevel;
    experience: number;
}

export type StreamingExecutiveDevelopmentTrack =
    | 'ROLE_MASTERY'
    | 'FOUNDER_ALIGNMENT'
    | 'ETHICS_TRUST'
    | 'PERFORMANCE_COACHING';

export interface OwnedStreamingExecutiveDevelopment {
    id: string;
    idempotencyKey: string;
    executiveId: string;
    track: StreamingExecutiveDevelopmentTrack;
    status: 'IN_PROGRESS' | 'COMPLETED';
    capitalCost: number;
    developmentWeeks: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
}

export type StreamingIncidentPolicy = 'CONTAIN_FIRST' | 'TRANSPARENT_FIRST' | 'SERVICE_FIRST';

export interface OwnedStreamingDelegationMandate {
    maximumRightsBid: number;
    minimumCapacityHeadroomPercent: number;
    weeklyCampaignLimit: number;
    renewalMinimumMarginPercent: number;
    incidentPolicy: StreamingIncidentPolicy;
    updatedAtAbsoluteWeek: number;
}

export interface OwnedStreamingLeadershipState {
    currentCeo: {
        holderType: 'FOUNDER' | 'EXECUTIVE';
        executiveId: string | null;
        sinceAbsoluteWeek: number;
    };
    appointments: OwnedStreamingExecutiveAppointment[];
    developmentPrograms: OwnedStreamingExecutiveDevelopment[];
    delegation: OwnedStreamingDelegationMandate;
}

export type StreamingBoardSeatType = 'INDEPENDENT' | 'INVESTOR_NOMINEE';
export type StreamingBoardMotionId =
    | 'RIGHTS_AUTHORITY'
    | 'CAPACITY_GUARDRAIL'
    | 'GROWTH_AUTHORITY'
    | 'TRUST_CHARTER';

export interface OwnedStreamingBoardDirector {
    id: string;
    candidateId: string;
    name: string;
    seatType: StreamingBoardSeatType;
    status: 'ACTIVE' | 'DEPARTED';
    preferredStrategy: StreamingExecutiveStrategy;
    independence: number;
    founderRelationship: number;
    weeklyCompensation: number;
    appointedAtAbsoluteWeek: number;
    endedAtAbsoluteWeek: number | null;
    linkedInvestorId: string | null;
}

export interface OwnedStreamingBoardVote {
    directorId: string;
    directorName: string;
    vote: 'FOR' | 'AGAINST';
    rationale: string;
}

export interface OwnedStreamingBoardMotion {
    id: string;
    idempotencyKey: string;
    motionId: StreamingBoardMotionId;
    title: string;
    status: 'APPROVED' | 'REJECTED';
    binding: boolean;
    founderVote: 'FOR' | 'AGAINST';
    votes: OwnedStreamingBoardVote[];
    boardConfidenceDelta: number;
    calledAtAbsoluteWeek: number;
    resolvedAtAbsoluteWeek: number;
    consequence: string;
}

export interface OwnedStreamingCelebrityInvestor {
    id: string;
    candidateId: string;
    name: string;
    status: 'ACCEPTED' | 'DECLINED';
    investedCapital: number;
    ownershipPercent: number;
    boardSeatGranted: boolean;
    profitParticipationPercent: number;
    influenceDemand: string;
    decisionAtAbsoluteWeek: number;
}

export interface OwnedStreamingGovernanceState {
    boardConfidence: number;
    directors: OwnedStreamingBoardDirector[];
    motions: OwnedStreamingBoardMotion[];
    celebrityInvestors: OwnedStreamingCelebrityInvestor[];
}

export type StreamingRivalStrategy =
    | 'SCALE_DOMINANCE'
    | 'PRESTIGE_FIRST'
    | 'FRANCHISE_FORTRESS'
    | 'AGILE_CURATOR'
    | 'ATTENTION_ECOSYSTEM';

export type StreamingRivalMoveType =
    | 'COUNTER_PROGRAM'
    | 'RIGHTS_OVERBID'
    | 'EXECUTIVE_POACH'
    | 'PRICE_CUT'
    | 'BUNDLE_LAUNCH'
    | 'RESCUE_CANCELLED_SHOW'
    | 'ALLIANCE_SIGNAL'
    | 'REGIONAL_ORIGINAL'
    | 'MARKETING_BLITZ'
    | 'TECH_COPY'
    | 'SABOTAGE_ATTEMPT'
    | 'OUTAGE_EXPLOITATION'
    | 'REGION_EXPANSION'
    | 'REGION_WITHDRAWAL';

export type StreamingWarBattlefront =
    | 'PRICE'
    | 'CONTENT'
    | 'RIGHTS'
    | 'DISTRIBUTION'
    | 'MARKETING'
    | 'TECHNOLOGY'
    | 'OPERATIONS'
    | 'TALENT'
    | 'TERRITORY';

export type StreamingRivalMoveStatus =
    | 'OPEN'
    | 'MISFIRED'
    | 'DEFENDED'
    | 'ACCEPTED_PRESSURE'
    | 'EXPIRED';

export type StreamingRivalResponseId =
    | 'STAY_COURSE'
    | 'DEFEND_POSITION'
    | 'COUNTER_PROGRAM'
    | 'BACKCHANNEL'
    | 'MATCH_PACKAGE'
    | 'EXPAND_MANDATE'
    | 'LET_DEPART';

export interface OwnedStreamingRivalMemory {
    respect: number;
    resentment: number;
    encounters: number;
    rivalWins: number;
    playerDefences: number;
    lastMoveType: StreamingRivalMoveType | null;
}

export interface OwnedStreamingRivalProfile {
    platformId: PlatformId;
    platformName: string;
    ceoName: string;
    ceoPersonality: string;
    strategy: StreamingRivalStrategy;
    cashReserveMillions: number;
    subscribersMillions: number;
    /** Canonical Phase 7 projection; optional only for legacy saved rival rows. */
    standaloneValuationBillions?: number;
    technology: number;
    catalogPower: number;
    prestige: number;
    aggression: number;
    baseMonthlyPrice: number;
    perceivedValue: number;
    activeRegionIds: StreamingRegionId[];
    copiedTechnologyBranches: StreamingTechnologyBranch[];
    preferredGenres: string[];
    preferredRegions: StreamingRegionId[];
    cooldownUntilAbsoluteWeek: number;
    lastMoveAbsoluteWeek: number | null;
    mistakes: number;
    memory: OwnedStreamingRivalMemory;
}

export interface OwnedStreamingRivalMove {
    id: string;
    idempotencyKey: string;
    platformId: PlatformId;
    platformName: string;
    ceoName: string;
    type: StreamingRivalMoveType;
    battlefront: StreamingWarBattlefront;
    targetRegionId: StreamingRegionId | null;
    targetTechnologyBranch: StreamingTechnologyBranch | null;
    strategyReason: string;
    playerImpact: string;
    rivalPriceBefore: number | null;
    rivalPriceAfter: number | null;
    title: string;
    detail: string;
    status: StreamingRivalMoveStatus;
    /** Tariff table that priced this action. Legacy moves default to version 1. */
    pricingVersion?: number;
    cashCostMillions: number;
    rivalCashBeforeMillions: number;
    rivalCashAfterMillions: number;
    createdAtAbsoluteWeek: number;
    pressureStartsAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    prestigeDelta: number;
    targetExecutiveId: string | null;
    targetExecutiveName: string | null;
    responseId: StreamingRivalResponseId | null;
    responseCost: number;
    responseAtAbsoluteWeek: number | null;
    outcomeNote: string;
}

export interface OwnedStreamingRivalWeeklySnapshot {
    id: string;
    absoluteWeek: number;
    platformId: PlatformId;
    platformName: string;
    subscribersBeforeMillions: number;
    subscribersAfterMillions: number;
    netMovementMillions: number;
    driver: string;
}

export type StreamingRegionId =
    | 'HOME_MARKET'
    | 'NORTH_AMERICA'
    | 'LATIN_AMERICA'
    | 'EUROPE'
    | 'SOUTH_ASIA'
    | 'EAST_ASIA'
    | 'MIDDLE_EAST_AFRICA';

export type StreamingRegionalLaunchApproach =
    | 'LOCAL_PARTNERSHIP'
    | 'PREMIUM_ENTRY'
    | 'MASS_MARKET';

export interface OwnedStreamingRegionalLaunch {
    id: string;
    idempotencyKey: string;
    regionId: StreamingRegionId;
    regionName: string;
    approach: StreamingRegionalLaunchApproach;
    status: 'ACTIVE' | 'IN_PROGRESS';
    capitalCost: number;
    weeklyOperatingCost: number;
    addressableAudienceMillions: number;
    acquisitionRateDelta: number;
    peakLoadPercent: number;
    localizationDepth: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    launchedAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingMarketShareEntry {
    id: PlatformId | 'PLAYER';
    name: string;
    subscribersMillions: number;
    sharePercent: number;
}

export interface OwnedStreamingMarketShareSnapshot {
    id: string;
    absoluteWeek: number;
    entries: OwnedStreamingMarketShareEntry[];
}

export type StreamingAwardCategoryId =
    | 'PLATFORM_OF_THE_YEAR'
    | 'ORIGINAL_OF_THE_YEAR'
    | 'AUDIENCE_CHOICE'
    | 'TECHNICAL_EXCELLENCE'
    | 'GLOBAL_BREAKTHROUGH';

export interface OwnedStreamingAwardNominee {
    id: PlatformId | 'PLAYER';
    name: string;
    score: number;
    evidence: string;
}

export interface OwnedStreamingAwardResult {
    categoryId: StreamingAwardCategoryId;
    categoryName: string;
    nominees: OwnedStreamingAwardNominee[];
    winnerId: PlatformId | 'PLAYER';
    winnerName: string;
    playerNominated: boolean;
    playerWon: boolean;
}

export interface OwnedStreamingAwardSeason {
    id: string;
    idempotencyKey: string;
    seasonNumber: number;
    absoluteWeek: number;
    results: OwnedStreamingAwardResult[];
    playerNominations: number;
    playerWins: number;
}

export interface OwnedStreamingCompetitiveWorldState {
    initializedAtAbsoluteWeek: number | null;
    lastSimulatedAbsoluteWeek: number | null;
    rivalryHeat: number;
    globalPrestige: number;
    rivals: OwnedStreamingRivalProfile[];
    moves: OwnedStreamingRivalMove[];
    weeklyRivalHistory: OwnedStreamingRivalWeeklySnapshot[];
    regionalLaunches: OwnedStreamingRegionalLaunch[];
    marketShareHistory: OwnedStreamingMarketShareSnapshot[];
    awardSeasons: OwnedStreamingAwardSeason[];
}

export type StreamingAcquisitionDealStructure = 'FULL_ACQUISITION' | 'STRATEGIC_MERGER';

export type StreamingAcquisitionStatus =
    | 'SCOUTED'
    | 'VALUED'
    | 'OFFER_COUNTERED'
    | 'DILIGENCE'
    | 'COUNTERBID'
    | 'APPROVALS'
    | 'APPROVAL_BLOCKED'
    | 'REGULATORY_REVIEW'
    | 'REGULATORY_BLOCKED'
    | 'FINANCING'
    | 'READY_TO_SIGN'
    | 'SIGNED'
    | 'WITHDRAWN';

export type StreamingAcquisitionCommitmentId =
    | 'SERVICE_CONTINUITY'
    | 'EMPLOYEE_PROTECTION'
    | 'CREATOR_GUARANTEE'
    | 'DATA_SEPARATION';

export type StreamingRegulatoryStrategy = 'CLEAN_COMMITMENTS' | 'ASSET_CARVEOUT' | 'CONTEST_REVIEW';

export type StreamingAcquisitionFundingSource = 'TREASURY' | 'ACQUISITION_DEBT' | 'HYBRID';

export type StreamingIntegrationMode =
    | 'PRESERVE_BRAND'
    | 'SUB_PLATFORM'
    | 'MERGE_CATALOGS'
    | 'BUNDLE'
    | 'FULL_ABSORPTION'
    | 'TECH_ONLY'
    | 'CATALOG_ONLY'
    | 'SUNSET_MIGRATE';

export interface OwnedStreamingAcquisitionValuation {
    standaloneValue: number;
    subscriberValue: number;
    catalogValue: number;
    technologyValue: number;
    brandValue: number;
    strategicPremium: number;
    debtAndLiabilities: number;
    fairValue: number;
    sellerFloor: number;
    valuationCost: number;
    valuedAtAbsoluteWeek: number;
}

export interface OwnedStreamingAcquisitionOffer {
    dealStructure: StreamingAcquisitionDealStructure;
    offeredPrice: number;
    commitments: StreamingAcquisitionCommitmentId[];
    sellerResponse: 'COUNTERED' | 'ACCEPTED';
    sellerCounterPrice: number | null;
    submittedAtAbsoluteWeek: number;
    revision: number;
}

export interface OwnedStreamingDiligenceIssue {
    id: string;
    title: string;
    detail: string;
    severity: 'WATCH' | 'MATERIAL' | 'SEVERE';
    valueImpact: number;
    integrationRisk: number;
}

export interface OwnedStreamingDueDiligence {
    commissionedCost: number;
    issues: OwnedStreamingDiligenceIssue[];
    adjustedFairValue: number;
    verifiedDebt: number;
    contentLiability: number;
    technicalDebt: number;
    churnExposure: number;
    completedAtAbsoluteWeek: number;
}

export interface OwnedStreamingAcquisitionCounterbid {
    bidderPlatformId: PlatformId;
    bidderName: string;
    bidderCeoName: string;
    amount: number;
    pursuitCostMillions: number;
    playerRequiredBid: number;
    status: 'OPEN' | 'BEATEN' | 'WON_BY_RIVAL';
    createdAtAbsoluteWeek: number;
    resolvedAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingAcquisitionApproval {
    binding: boolean;
    status: 'APPROVED' | 'REJECTED';
    founderVote: 'FOR';
    votes: OwnedStreamingBoardVote[];
    confidenceDelta: number;
    commitments: StreamingAcquisitionCommitmentId[];
    resolvedAtAbsoluteWeek: number;
}

export interface OwnedStreamingRegulatoryReview {
    scrutinyScore: number;
    strategy: StreamingRegulatoryStrategy;
    status: 'CLEARED' | 'CLEARED_WITH_REMEDIES' | 'BLOCKED';
    remedyCost: number;
    subscriberRetentionPercent: number;
    catalogRetentionPercent: number;
    technologyRetentionPercent: number;
    rationale: string;
    resolvedAtAbsoluteWeek: number;
}

export interface OwnedStreamingAcquisitionFinancing {
    source: StreamingAcquisitionFundingSource;
    totalConsideration: number;
    treasuryContribution: number;
    debtPrincipal: number;
    equityConsideration: number;
    weeklyInterestRate: number;
    lenderName: string | null;
    founderOwnershipBefore: number;
    founderOwnershipAfter: number;
    lockedAtAbsoluteWeek: number;
}

export interface OwnedStreamingAcquisitionCase {
    id: string;
    idempotencyKey: string;
    targetPlatformId: PlatformId;
    targetPlatformName: string;
    targetCeoName: string;
    status: StreamingAcquisitionStatus;
    openedAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    valuation: OwnedStreamingAcquisitionValuation | null;
    offer: OwnedStreamingAcquisitionOffer | null;
    diligence: OwnedStreamingDueDiligence | null;
    counterbid: OwnedStreamingAcquisitionCounterbid | null;
    approval: OwnedStreamingAcquisitionApproval | null;
    regulatoryReview: OwnedStreamingRegulatoryReview | null;
    financing: OwnedStreamingAcquisitionFinancing | null;
    integrationMode: StreamingIntegrationMode | null;
    finalPurchasePrice: number | null;
    signedAtAbsoluteWeek: number | null;
    acquiredSubscriberCount: number;
    outcomeNote: string | null;
}

export interface OwnedStreamingAcquisitionIntegration {
    id: string;
    idempotencyKey: string;
    acquisitionCaseId: string;
    targetPlatformId: PlatformId;
    targetPlatformName: string;
    mode: StreamingIntegrationMode;
    status: 'IN_PROGRESS' | 'INTEGRATED';
    capitalReserve: number;
    weeklyOperatingCost: number;
    integrationWeeks: number;
    subscriberRetentionPercent: number;
    acquiredSubscriberCount: number;
    catalogAssetCount: number;
    technologyLevelDelta: number;
    acquisitionRateDelta: number;
    churnRateDelta: number;
    reliabilityRisk: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingCorporateDevelopmentState {
    acquisitionCases: OwnedStreamingAcquisitionCase[];
    integrations: OwnedStreamingAcquisitionIntegration[];
    acquiredPlatformIds: PlatformId[];
}

export type StreamingPublicCompanyLifecycle = 'PRIVATE' | 'IPO_PREPARATION' | 'ROADSHOW' | 'PUBLIC';
export type StreamingIpoNarrative = 'AUDIENCE_SCALE' | 'PROFITABLE_GROWTH' | 'TECHNOLOGY_NETWORK' | 'GLOBAL_ORIGINALS';
export type StreamingGuidanceTone = 'CONSERVATIVE' | 'BALANCED' | 'AMBITIOUS';

export interface OwnedStreamingIpoPlan {
    ticker: string;
    venueName: string;
    narrative: StreamingIpoNarrative;
    offerPercent: number;
    targetCapital: number;
    lowPrice: number;
    highPrice: number;
    institutionalDemandScore: number;
    retailDemandScore: number;
    roadshowStops: string[];
    startedAtAbsoluteWeek: number;
}

export interface OwnedStreamingIpoJourney {
    id: string;
    idempotencyKey: string;
    status: 'ACTIVE' | 'COMPLETED';
    startedAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    scene: string;
    ask: number;
    shares: number;
    revision: number;
    bankId: string | null;
    marks: Array<{ id: string; label: string; short: string; bookCost: number }>;
    omit: Record<string, boolean>;
    answers: Record<string, 'FULL' | 'BRIEF' | 'RESTATE'>;
    attempt: number;
    diligenceWeeks: number;
    cut: number;
    lowPrice: number;
    highPrice: number;
    anchorDiscountAccepted: boolean | null;
    employeeQuotaPercent: number;
    interviewMove: number;
    book: { cover: number; buckets: number[]; price: number; extended: boolean } | null;
    closePrice: number;
    ticker: string;
}

export interface OwnedStreamingListingRecord {
    listedAtAbsoluteWeek: number;
    ticker: string;
    venueName: string;
    offerPercent: number;
    sharesOutstanding: number;
    publicShares: number;
    offerPrice: number;
    capitalRaised: number;
    founderOwnershipBefore: number;
    founderOwnershipAfter: number;
    preIpoShares: number;
    newShares: number;
    employeeQuotaPercent: number;
    underwriterId: string;
    underwriterName: string;
    firmBook: boolean;
    bookCoverage: number;
    anchorDiscountAccepted: boolean;
    governanceMarks: string[];
    diligenceWeeks: number;
    regulatorAttempts: number;
}

export interface OwnedStreamingMarketQuote {
    id: string;
    absoluteWeek: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    marketCap: number;
    changePercent: number;
    drivers: string[];
}

export interface OwnedStreamingPublicGuidance {
    id: string;
    cycleNumber: number;
    tone: StreamingGuidanceTone;
    issuedAtAbsoluteWeek: number;
    subscriberTarget: number;
    revenueTarget: number;
    cashContributionTarget: number;
    playbackTarget: number;
    status: 'ACTIVE' | 'RESOLVED';
}

export interface OwnedStreamingEarningsRecord {
    id: string;
    cycleNumber: number;
    reportedAtAbsoluteWeek: number;
    guidanceId: string | null;
    outcome: 'BEAT' | 'MIXED' | 'MISS';
    score: number;
    subscriberActual: number;
    revenueActual: number;
    cashContributionActual: number;
    playbackActual: number;
    stockReactionPercent: number;
    headline: string;
}

export type StreamingShareholderVoteType = 'DIRECTOR_MANDATE' | 'EXECUTIVE_PAY' | 'CAPITAL_AUTHORITY' | 'STRATEGIC_REVIEW';

export interface OwnedStreamingShareholderVote {
    id: string;
    cycleNumber: number;
    type: StreamingShareholderVoteType;
    title: string;
    summary: string;
    status: 'OPEN' | 'APPROVED' | 'REJECTED';
    createdAtAbsoluteWeek: number;
    dueAtAbsoluteWeek: number;
    institutionalSupport: number;
    founderVote: 'FOR' | 'AGAINST' | null;
    finalSupport: number | null;
    consequence: string | null;
}

export type StreamingActivistDemand = 'MARGIN_DISCIPLINE' | 'SLATE_REFRESH' | 'BOARD_SEAT' | 'ASSET_REVIEW';

export interface OwnedStreamingActivistCampaign {
    id: string;
    investorName: string;
    ownershipPercent: number;
    demand: StreamingActivistDemand;
    status: 'ACTIVE' | 'NEGOTIATED' | 'DEFEATED' | 'ACCEPTED';
    pressure: number;
    openedAtAbsoluteWeek: number;
    resolvedAtAbsoluteWeek: number | null;
    response: 'ENGAGE' | 'REFUSE' | 'ACCEPT' | null;
    consequence: string | null;
}

export type StreamingTakeoverDefence = 'INDEPENDENCE_CAMPAIGN' | 'WHITE_KNIGHT' | 'RIGHTS_PLAN' | 'NEGOTIATE';

export interface OwnedStreamingHostileTakeover {
    id: string;
    bidderPlatformId: PlatformId;
    bidderName: string;
    offerPrice: number;
    premiumPercent: number;
    bidderSupportPercent: number;
    status: 'ACTIVE' | 'DEFENDED' | 'SETTLED' | 'BIDDER_WITHDREW';
    openedAtAbsoluteWeek: number;
    resolvedAtAbsoluteWeek: number | null;
    defence: StreamingTakeoverDefence | null;
    consequence: string | null;
}

export interface OwnedStreamingPublicCompanyState {
    lifecycle: StreamingPublicCompanyLifecycle;
    ipoPlan: OwnedStreamingIpoPlan | null;
    ipoJourney: OwnedStreamingIpoJourney | null;
    listing: OwnedStreamingListingRecord | null;
    quoteHistory: OwnedStreamingMarketQuote[];
    guidance: OwnedStreamingPublicGuidance[];
    earnings: OwnedStreamingEarningsRecord[];
    shareholderVotes: OwnedStreamingShareholderVote[];
    activistCampaigns: OwnedStreamingActivistCampaign[];
    hostileTakeovers: OwnedStreamingHostileTakeover[];
}

export type StreamingCrisisType =
    | 'PLATFORM_OUTAGE'
    | 'ACCOUNT_BREACH'
    | 'CONTENT_LEAK'
    | 'RECOMMENDATION_BACKLASH'
    | 'RIGHTS_COMPLIANCE'
    | 'EMPLOYEE_ALLEGATION';

export type StreamingCrisisSeverity = 'MINOR' | 'SERIOUS' | 'MAJOR' | 'CRITICAL';
export type StreamingCrisisStage = 'DETECTED' | 'RECOVERING' | 'RESOLVED';
export type StreamingCrisisCompensation = 'NONE' | 'TARGETED' | 'FULL';
export type StreamingCrisisCommunication = 'HOLDING_STATEMENT' | 'FACTUAL_UPDATE' | 'FULL_DISCLOSURE';

export interface OwnedStreamingCrisis {
    id: string;
    idempotencyKey: string;
    type: StreamingCrisisType;
    severity: StreamingCrisisSeverity;
    stage: StreamingCrisisStage;
    title: string;
    detail: string;
    cause: string;
    detectedAtAbsoluteWeek: number;
    affectedSubscribers: number;
    estimatedRevenueAtRisk: number;
    responseDoctrine: StreamingIncidentPolicy | null;
    compensation: StreamingCrisisCompensation | null;
    communication: StreamingCrisisCommunication | null;
    responseCost: number;
    weeklyRecoveryCost: number;
    recoveryReadyAtAbsoluteWeek: number | null;
    resolvedAtAbsoluteWeek: number | null;
    outcomeNote: string | null;
}

export type StreamingShadowOperationType =
    | 'INTELLIGENCE_PURCHASE'
    | 'WHISPER_CAMPAIGN'
    | 'CONTRACT_PRESSURE'
    | 'COVERT_CONTENT_LEAK'
    | 'CORPORATE_ESPIONAGE'
    | 'SERVICE_DISRUPTION_ATTEMPT';

export type StreamingShadowOperationStatus =
    | 'EVIDENCE_PENDING'
    | 'EXPOSED'
    | 'CLEARED';

export interface OwnedStreamingShadowOperation {
    id: string;
    idempotencyKey: string;
    type: StreamingShadowOperationType;
    targetPlatformId: PlatformId;
    targetPlatformName: string;
    status: StreamingShadowOperationStatus;
    cashCost: number;
    successEstimatePercent: number;
    exposureRiskPercent: number;
    expectedImpact: string;
    committedAtAbsoluteWeek: number;
    evidenceDueAtAbsoluteWeek: number;
    succeeded: boolean;
    outcomeNote: string;
    exposureConsequence: string | null;
}

export type StreamingTrustInitiativeType =
    | 'SECURITY_DRILL'
    | 'WHISTLEBLOWER_CHANNEL'
    | 'TRANSPARENCY_REPORT'
    | 'INDEPENDENT_AUDIT';

export interface OwnedStreamingTrustInitiative {
    id: string;
    idempotencyKey: string;
    type: StreamingTrustInitiativeType;
    title: string;
    cashCost: number;
    completedAtAbsoluteWeek: number;
    outcomeNote: string;
}

export interface OwnedStreamingRegulatoryCase {
    id: string;
    idempotencyKey: string;
    title: string;
    status: 'OPEN' | 'CLOSED';
    scrutinyAtOpening: number;
    openedAtAbsoluteWeek: number;
    response: 'COOPERATE' | 'CONTEST' | 'REMEDIATE' | null;
    responseCost: number;
    resolvedAtAbsoluteWeek: number | null;
    outcomeNote: string | null;
}

export interface OwnedStreamingWhistleblowerReport {
    id: string;
    idempotencyKey: string;
    title: string;
    allegation: string;
    status: 'OPEN' | 'RESOLVED';
    sourceConfidence: number;
    openedAtAbsoluteWeek: number;
    response: 'PROTECT_AND_INVESTIGATE' | 'DISCREDIT' | 'DISCLOSE' | null;
    responseCost: number;
    resolvedAtAbsoluteWeek: number | null;
    outcomeNote: string | null;
}

export type StreamingInfrastructureIncidentType =
    | 'POWER_FAILURE'
    | 'COOLING_INCIDENT'
    | 'FIBRE_CUT'
    | 'TRAFFIC_SPIKE'
    | 'REGIONAL_OUTAGE'
    | 'CYBERATTACK'
    | 'DDOS_ATTACK'
    | 'RIVAL_SABOTAGE';
export type StreamingInfrastructureResponseAction =
    | 'FAILOVER_BACKUP'
    | 'REROUTE_TRAFFIC'
    | 'ISOLATE_AND_REPAIR'
    | 'EMERGENCY_CAPACITY';
export type StreamingInfrastructureInsuranceTier = 'NONE' | 'STANDARD' | 'PREMIUM';
export type StreamingMaintenanceCadence = 'REACTIVE' | 'BALANCED' | 'PREVENTIVE';
export type StreamingInfrastructureProgressionTier =
    | 'RENTED_CABINET'
    | 'PRIVATE_CAGE'
    | 'DEDICATED_HALL'
    | 'OWNED_DATA_CENTRE'
    | 'GLOBAL_HYPERSCALE_CAMPUS';
export type StreamingInfrastructureAwardCategory =
    | 'RELIABILITY_LEADERSHIP'
    | 'RECOVERY_EXCELLENCE'
    | 'SUSTAINABLE_SCALE'
    | 'GLOBAL_BACKBONE';

export interface OwnedStreamingInfrastructurePerformancePoint {
    absoluteWeek: number;
    tier: StreamingInfrastructureProgressionTier;
    facilityCount: number;
    installedRacks: number;
    averageConditionPercent: number;
    reliabilityPercent: number;
    playbackSuccessRate: number;
    capacityUtilizationPercent: number;
    energyKwhWeekly: number;
    waterLitresWeekly: number;
    weeklyOperatingCost: number;
    activeIncidentCount: number;
}

export interface OwnedStreamingInfrastructureAward {
    id: string;
    idempotencyKey: string;
    category: StreamingInfrastructureAwardCategory;
    title: string;
    evidence: string;
    score: number;
    awardedAtAbsoluteWeek: number;
    factId: string;
}

export interface OwnedStreamingInfrastructureIncident {
    id: string;
    idempotencyKey: string;
    type: StreamingInfrastructureIncidentType;
    severity: StreamingCrisisSeverity;
    stage: StreamingCrisisStage;
    title: string;
    detail: string;
    cause: string;
    facilityId: string;
    cityId: string;
    detectedAtAbsoluteWeek: number;
    affectedSubscribers: number;
    capacityLossPercent: number;
    conditionLossPercent: number;
    responseAction: StreamingInfrastructureResponseAction | null;
    rerouteFacilityId: string | null;
    compensation: StreamingCrisisCompensation | null;
    insuranceClaimed: boolean;
    responseCost: number;
    insuranceRecovery: number;
    recoveryReadyAtAbsoluteWeek: number | null;
    resolvedAtAbsoluteWeek: number | null;
    assistedHandled: boolean;
    publicReaction: string;
    subscriberReaction: string;
    outcomeNote: string | null;
}

export interface OwnedStreamingInfrastructureOperationsState {
    maintenanceCadence: StreamingMaintenanceCadence;
    insuranceTier: StreamingInfrastructureInsuranceTier;
    lastProcessedAbsoluteWeek: number | null;
    incidents: OwnedStreamingInfrastructureIncident[];
    totalMaintenanceSpend: number;
    totalCompensationPaid: number;
    totalInsuranceRecovered: number;
    assistedResponseCount: number;
    reliabilityStreakWeeks: number;
    lastProgressionTier: StreamingInfrastructureProgressionTier;
    performanceHistory: OwnedStreamingInfrastructurePerformancePoint[];
    awards: OwnedStreamingInfrastructureAward[];
    orchestratedFactIds: string[];
}

export interface OwnedStreamingCrisisSecurityState {
    publicTrust: number;
    regulatoryScrutiny: number;
    employeeLoyalty: number;
    evidenceTrail: number;
    securityPressure: number;
    lastEvaluatedAbsoluteWeek: number | null;
    crises: OwnedStreamingCrisis[];
    shadowOperations: OwnedStreamingShadowOperation[];
    trustInitiatives: OwnedStreamingTrustInitiative[];
    regulatoryCases: OwnedStreamingRegulatoryCase[];
    whistleblowerReports: OwnedStreamingWhistleblowerReport[];
    infrastructureOperations: OwnedStreamingInfrastructureOperationsState;
}

export type StreamingCapitalActionType =
    | 'INCORPORATION'
    | 'FOUNDER_CONTRIBUTION'
    | 'LOAN_DRAW'
    | 'LOAN_REPAYMENT'
    | 'EQUITY_ISSUANCE';

export interface OwnedStreamingCapitalAction {
    id: string;
    idempotencyKey: string;
    type: StreamingCapitalActionType;
    absoluteWeek: number;
    amount: number;
    treasuryDelta: number;
    personalCashDelta: number;
    debtDelta: number;
    ownershipBefore: number;
    ownershipAfter: number;
}

export interface OwnedStreamingLoanPosition {
    id: string;
    lenderName: string;
    status: 'ACTIVE' | 'REPAID' | 'LEGACY_NO_TERMS';
    principal: number;
    outstandingPrincipal: number;
    weeklyInterestRate: number;
    openedAtAbsoluteWeek: number;
}

export interface OwnedStreamingEquityPosition {
    id: string;
    holderName: string;
    ownershipPercent: number;
    investedCapital: number;
    issuedAtAbsoluteWeek: number;
}

export interface OwnedStreamingFinanceState {
    capitalActions: OwnedStreamingCapitalAction[];
    loans: OwnedStreamingLoanPosition[];
    equityHolders: OwnedStreamingEquityPosition[];
}

export interface OwnedStreamingHqOnboardingState {
    status: StreamingHqTourStatus;
    currentStep: number;
    visitedSections: StreamingHqSection[];
    startedAtAbsoluteWeek: number | null;
    completedAtAbsoluteWeek: number | null;
}

export type StreamingCapacityPackageId = 'STARTER' | 'ESSENTIAL' | 'GROWTH' | 'PREMIERE';
export type StreamingInfrastructureRolloutPace = 'SAFE' | 'STANDARD' | 'RUSHED';
export type StreamingSubscriptionTierId = 'BASIC' | 'PREMIUM' | 'FAMILY';
export type StreamingLoadTestStatus = 'PASS' | 'CONDITIONAL' | 'FAIL';
export type StreamingNetworkNodeRole = 'CORE_ORIGIN' | 'REGIONAL_HUB' | 'EDGE_CACHE';
export type StreamingRackDuty =
    | 'CONTENT_ORIGIN'
    | 'REGIONAL_CACHE'
    | 'LOCAL_EDGE'
    | 'ENCODING'
    | 'PLATFORM_SERVICES'
    | 'LIVE_EVENT'
    | 'SPECIALIZED';
export type StreamingInfrastructureManagementMode = 'ASSISTED' | 'HANDS_ON';
export type StreamingAssistedNetworkPriority = 'ECONOMY' | 'BALANCED' | 'RELIABLE' | 'PREMIUM';
export type StreamingAssistedRiskTolerance = 'LOW' | 'MEDIUM' | 'HIGH';
export type StreamingFacilityType =
    | 'CLOUD_ALLOCATION'
    | 'RENTED_CABINET'
    | 'PRIVATE_CAGE'
    | 'PRIVATE_SUITE'
    | 'DEDICATED_DATA_HALL'
    /** Research-gated long-term facility; visible in the market before it is buildable. */
    | 'OWNED_DATA_CENTRE'
    /** Migration-only contract that preserves oversized facilities from old saves. */
    | 'LEGACY_CAMPUS';

export type StreamingFacilitySecurityGrade = 'STANDARD' | 'REINFORCED' | 'FORTIFIED';
export type StreamingFacilityFibreGrade = 'METRO' | 'CARRIER' | 'GLOBAL_BACKBONE';
export type StreamingCoolingMode = 'AIR' | 'DIRECT_LIQUID' | 'IMMERSION';
export type StreamingBackupPowerMode = 'NONE' | 'UPS' | 'GENERATOR' | 'N_PLUS_ONE';

/**
 * The engineering envelope of a facility. It is optional for migration safety;
 * normalizers materialize it before any forecast uses the facility.
 */
export interface OwnedStreamingFacilityPhysicalState {
    powerContractKw: number;
    backupPowerKw: number;
    backupPowerMode: StreamingBackupPowerMode;
    coolingCapacityKw: number;
    coolingMode: StreamingCoolingMode;
    bandwidthMbps: number;
    burstBandwidthMbps: number;
    maintenanceConditionPercent: number;
    lastMaintenanceAbsoluteWeek: number;
    powerUpgradeCount: number;
    coolingUpgradeCount: number;
    bandwidthUpgradeCount: number;
    equipmentReplacementCount: number;
}

/**
 * Commercial terms frozen when a player chooses a city listing. Keeping the
 * snapshot on the facility means a future market refresh cannot rewrite an
 * already accepted draft or commissioned lease.
 */
export interface StreamingFacilityLeaseSnapshot {
    listingId: string;
    providerName: string;
    rackPositions: number;
    depositCost: number;
    setupCost: number;
    weeklyRent: number;
    electricityRatePerKwh: number;
    taxRatePercent: number;
    reliabilityPercent: number;
    securityGrade: StreamingFacilitySecurityGrade;
    fibreGrade: StreamingFacilityFibreGrade;
    contractWeeks: number;
    provisioningWeeks: number;
    expansionRackPositions: number;
}

export interface OwnedStreamingNetworkPlacement {
    cityId: string;
    racks: number;
    role: StreamingNetworkNodeRole;
}

export interface StreamingRackDutyMigration {
    fromDuty: StreamingRackDuty;
    toDuty: StreamingRackDuty;
    weeks: number;
    pressurePercent: number;
}

/** A physical set of racks sharing one workload inside a facility. */
export interface OwnedStreamingRackGroup {
    id: string;
    name: string;
    rackCount: number;
    duty: StreamingRackDuty;
    /** Present while a draft is being rewired; finalized when the revision commissions. */
    migration?: StreamingRackDutyMigration;
}

/**
 * A real leased/owned space inside a city. Network placements remain as the
 * aggregate compatibility model read by launch, reach and rival simulations;
 * facilities are the player-owned source of truth for what physically fits.
 */
export interface OwnedStreamingFacility {
    id: string;
    cityId: string;
    type: StreamingFacilityType;
    installedRacks: number;
    role: StreamingNetworkNodeRole;
    /** Canonical Phase 4 workload layout. Missing only on older saves. */
    rackGroups?: OwnedStreamingRackGroup[];
    /** Absent only on Phase 1/legacy saves, which keep their original economics. */
    lease?: StreamingFacilityLeaseSnapshot;
    /** Phase 5 physical limits; absent only on older saves and auto-migrated. */
    physical?: OwnedStreamingFacilityPhysicalState;
}

/**
 * Player preference layer for Network Build. This never changes simulation
 * math by itself: Assisted mode drafts the same facilities that Hands-On mode
 * edits directly, and commissioning remains the only treasury boundary.
 */
export interface StreamingInfrastructureManagementPolicy {
    mode: StreamingInfrastructureManagementMode;
    priority: StreamingAssistedNetworkPriority;
    maximumBudget: number;
    riskTolerance: StreamingAssistedRiskTolerance;
    preferredCityIds: string[];
    requireApprovalForExpensiveChanges: boolean;
    approvalThreshold: number;
}

export interface OwnedStreamingInfrastructureSetupDraft {
    currentStep: number;
    strategy: Exclude<StreamingInfrastructureStrategy, 'UNDECIDED'>;
    capacityPackageId: StreamingCapacityPackageId;
    rolloutPace: StreamingInfrastructureRolloutPace;
    subscriptionPrices: Record<StreamingSubscriptionTierId, number>;
    /** Physical network plan. Founding chooses markets; Network Build owns these machines. */
    networkPlacements: OwnedStreamingNetworkPlacement[];
    /** Explicit spaces and their fixed rack limits. Optional for legacy saves. */
    facilities?: OwnedStreamingFacility[];
    /** Optional for legacy saves; normalized to a deterministic default. */
    managementPolicy?: StreamingInfrastructureManagementPolicy;
    /** Exact opening-night demand handed over by the Day-One Markets rehearsal. */
    openingDemandForecast?: {
        low: number;
        likely: number;
        high: number;
    };
    lastLoadTestSignature: string | null;
    /** Country and facility evidence from the last visual launch rehearsal. */
    lastLaunchRehearsal?: OwnedStreamingLaunchRehearsalSnapshot;
    updatedAtAbsoluteWeek: number;
}

export interface OwnedStreamingLaunchRehearsalSnapshot {
    configurationSignature: string;
    scenario: 'QUIET' | 'LIKELY' | 'SURGE';
    verdict: 'HELD' | 'BURST' | 'BROKE';
    peakConcurrentStreams: number;
    steadyCapacity: number;
    burstCapacity: number;
    peakLoadPercent: number;
    spareCapacityPercent: number;
    failedPercent: number;
    estimatedDowntimeMinutes: number;
    catalogueAvailabilityPercent: number;
    regionalSinglePointFailures: string[];
    warningSummary: string;
    countries: Array<{
        marketId: string;
        country: string;
        demand: number;
        startupTimeMs: number | null;
        bufferingRiskPercent: number;
        catalogueAvailabilityPercent: number;
        outageResistance: 'REDUNDANT' | 'EXPOSED' | 'SINGLE_POINT' | 'UNSERVED';
        verdict: 'HELD' | 'BURST' | 'BROKE';
        failedPercent: number;
        viewerConsequence: string;
    }>;
    facilities: Array<{
        facilityId: string;
        cityId: string;
        demand: number;
        loadPercent: number;
        state: 'CLEAR' | 'STRESSED' | 'BURSTING' | 'FAILED';
        verdict: 'HELD' | 'BURST' | 'BROKE';
        failedPercent: number;
        limitingFactor: string;
    }>;
    completedAtAbsoluteWeek: number;
}

/** Physical utility footprint frozen with a commissioned infrastructure revision. */
export interface OwnedStreamingInfrastructurePhysicalSummary {
    energyKwhWeekly: number;
    waterLitresWeekly: number;
    physicalWeeklyOperatingCost: number;
    sustainabilityScore: number;
    publicReputation: number;
    reliabilityPercent: number;
    backupCoveragePercent: number;
    limitingFactors: string[];
}

export interface OwnedStreamingLoadTestSnapshot {
    configurationSignature: string;
    forecastLowConcurrentStreams: number;
    forecastLikelyConcurrentStreams: number;
    forecastHighConcurrentStreams: number;
    testedBurstCapacity: number;
    headroomPercent: number;
    status: StreamingLoadTestStatus;
    driverKeys: string[];
    launchRehearsal?: OwnedStreamingLaunchRehearsalSnapshot;
    completedAtAbsoluteWeek: number;
}

export interface OwnedStreamingInfrastructureSetup {
    capacityPackageId: StreamingCapacityPackageId;
    rolloutPace: StreamingInfrastructureRolloutPace;
    storageCapacityHours: number;
    reliabilityTarget: number;
    weeklyOperatingCost: number;
    staffRequired: number;
    capitalInvested: number;
    technicalDebt: number;
    networkPlacements: OwnedStreamingNetworkPlacement[];
    /** Commissioned spaces. Old saves are upgraded into deterministic legacy facilities. */
    facilities?: OwnedStreamingFacility[];
    /** Retained so players can switch workflows after launch without losing preferences. */
    managementPolicy?: StreamingInfrastructureManagementPolicy;
    /** Optional only for saves commissioned before physical infrastructure existed. */
    physicalSummary?: OwnedStreamingInfrastructurePhysicalSummary;
    readyAtAbsoluteWeek: number;
    revision: number;
    committedAtAbsoluteWeek: number;
    loadTest: OwnedStreamingLoadTestSnapshot;
}

export type StreamingTechnologyCampusBranch =
    | 'DELIVERY_CAPACITY'
    | 'PLAYBACK_QUALITY'
    | 'RELIABILITY'
    | 'DATA_RECOMMENDATIONS'
    | 'SECURITY'
    | 'CONTENT_OPERATIONS';
export type StreamingTechnologyBuildMode = 'HARDENED' | 'BALANCED' | 'SPRINT';
export type StreamingTechnologyProjectStatus = 'UNDER_CONSTRUCTION' | 'COMPLETED';
export type StreamingTechnologyRisk = 'LOW' | 'MODERATE' | 'HIGH';

export interface OwnedStreamingTechnologyBenefit {
    baselineConcurrentStreamsDelta: number;
    burstConcurrentStreamsDelta: number;
    reliabilityDelta: number;
    playbackQualityDelta: number;
    recommendationDelta: number;
    securityDelta: number;
    contentOperationsDelta: number;
}

export interface OwnedStreamingTechnologyProject {
    id: string;
    idempotencyKey: string;
    definitionId: string;
    branch: StreamingTechnologyCampusBranch;
    title: string;
    targetLevel: number;
    buildMode: StreamingTechnologyBuildMode;
    status: StreamingTechnologyProjectStatus;
    capitalCost: number;
    weeklyOperatingCostDelta: number;
    staffRequired: number;
    constructionWeeks: number;
    benefit: OwnedStreamingTechnologyBenefit;
    risk: StreamingTechnologyRisk;
    riskNote: string;
    technicalDebtDelta: number;
    startedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
}

export type StreamingResearchCategory =
    | 'NETWORK_INFRASTRUCTURE'
    | 'SERVERS_DELIVERY'
    | 'COOLING_ENERGY'
    | 'STREAMING_EXPERIENCE'
    | 'PLATFORM_PRODUCTS'
    | 'SECURITY_RELIABILITY'
    | 'EXPERIMENTAL_TECHNOLOGY';
export type StreamingResearchLifecycleStage =
    | 'RESEARCHING'
    | 'PROTOTYPING'
    | 'TESTING'
    | 'AWAITING_IP'
    | 'READY_TO_INSTALL'
    | 'INSTALLING'
    | 'OPERATING';
export type StreamingResearchIpStrategy = 'PATENT' | 'LICENSE';
export type StreamingResearchInstallTargetType =
    | 'TECHNOLOGY_PROJECT'
    | 'FACILITY'
    | 'RACK_GROUP'
    | 'PRODUCT_LINE'
    | 'LOCALIZATION_CAPABILITY'
    | 'CONSTRUCTION_PROGRAM';

/** Research unlocks a real installation; it never grants the installation benefit itself. */
export interface OwnedStreamingResearchProgram {
    id: string;
    idempotencyKey: string;
    definitionId: string;
    title: string;
    category: StreamingResearchCategory;
    stage: StreamingResearchLifecycleStage;
    buildMode: StreamingTechnologyBuildMode;
    ipStrategy: StreamingResearchIpStrategy | null;
    researchCost: number;
    patentCost: number;
    installationCost: number;
    weeklyOperatingCost: number;
    licenseWeeklyCost: number;
    staffRequired: number;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
    startedAtAbsoluteWeek: number;
    stageStartedAtAbsoluteWeek: number;
    stageReadyAtAbsoluteWeek: number;
    installationTargetType: StreamingResearchInstallTargetType;
    installationTargetId: string | null;
    installationTargetLabel: string | null;
    rivalInterestPercent: number;
    completedAtAbsoluteWeek: number | null;
}

export type StreamingCampusScale = 'OWNED_DATA_CENTRE' | 'GIGA_CAMPUS';
export type StreamingCampusConstructionStage =
    | 'PERMITS'
    | 'UTILITIES'
    | 'DESIGN'
    | 'SYSTEMS'
    | 'DATA_HALLS'
    | 'RACK_INSTALLATION'
    | 'COMMISSIONING';
export type StreamingCampusProjectStatus = 'AWAITING_DECISION' | 'IN_PROGRESS' | 'DELAYED' | 'READY_TO_OPEN' | 'OPEN';

export interface OwnedStreamingCampusEvent {
    id: string;
    stage: StreamingCampusConstructionStage;
    type: 'PERMIT_DELAY' | 'CONTRACTOR_OVERRUN' | 'GRID_SHORTAGE' | 'WATER_RESTRICTION' | 'LOCAL_OPPOSITION' | 'FIBRE_DISPUTE' | 'COOLING_DEFECT' | 'INDUSTRIAL_ESPIONAGE';
    title: string;
    detail: string;
    delayWeeks: number;
    cost: number;
    occurredAtAbsoluteWeek: number;
}

/** Major owned-facility construction. No OwnedStreamingFacility exists until this project opens. */
export interface OwnedStreamingCampusProject {
    id: string;
    idempotencyKey: string;
    name: string;
    cityId: string;
    scale: StreamingCampusScale;
    status: StreamingCampusProjectStatus;
    stage: StreamingCampusConstructionStage;
    currentStageOptionId: string | null;
    campusDesignId: string | null;
    utilitiesPackageId: string | null;
    systemsPackageId: string | null;
    rackPackageId: string | null;
    hallCount: number;
    rackCapacity: number;
    installedRacks: number;
    landCost: number;
    capitalCommitted: number;
    weeklyOperatingCost: number;
    staffRequired: number;
    startedAtAbsoluteWeek: number;
    stageStartedAtAbsoluteWeek: number;
    stageReadyAtAbsoluteWeek: number;
    openedAtAbsoluteWeek: number | null;
    facilityId: string | null;
    events: OwnedStreamingCampusEvent[];
    expansionCount: number;
    expansionReadyAtAbsoluteWeek: number | null;
}

export type StreamingStarterCatalogPackageId = 'CURATED_PREMIERE' | 'BROAD_APPEAL' | 'PRESTIGE_VAULT';
export type StreamingLicenseTerritory = 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL';
export type StreamingLicenseExclusivity = 'NON_EXCLUSIVE' | 'EXCLUSIVE';
export type StreamingCatalogNegotiationStatus = 'BUILDING' | 'COUNTERED' | 'READY_TO_SIGN';
export type StreamingCatalogLicenseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'TRANSFERRED_OUT';
export type StreamingRightsSellerType = 'STUDIO' | 'PLATFORM';
export type StreamingRightsWindowType = 'FIRST_WINDOW' | 'SECOND_WINDOW' | 'PERMANENT';
export type StreamingRightsNegotiationKind = 'ACQUIRE' | 'RENEW' | 'SUBLICENSE_OUT' | 'TRANSFER_OUT';
export type StreamingRightsNegotiationStatus =
    | 'OPEN'
    | 'COUNTERED'
    | 'READY_TO_SIGN'
    | 'SIGNED'
    | 'LOST'
    | 'WITHDRAWN'
    | 'EXPIRED';
export type StreamingPrivateOfferResponseStatus =
    | 'AWAITING_RESPONSE'
    | 'SELLER_COUNTERED'
    | 'SELLER_ACCEPTED'
    | 'SELLER_DECLINED'
    | 'RIGHTS_SOLD'
    | 'WITHDRAWN'
    | 'EXPIRED'
    | 'SIGNED';
export type StreamingRightsChangeOfControl = 'NONE' | 'NOTICE' | 'CONSENT_REQUIRED';
export type StreamingRightsObligationType = 'MARKETING_SPEND' | 'VIEWERSHIP_THRESHOLD' | 'FUTURE_GREENLIGHT';
export type StreamingRightsObligationStatus = 'PENDING' | 'ON_TRACK' | 'SATISFIED' | 'BREACHED';
export const STREAMING_RIGHTS_CONTRACT_SCHEMA_VERSION = 2 as const;
export type StreamingRightsContractPartyType =
    | 'PLAYER_STUDIO'
    | 'NPC_STUDIO'
    | 'PLAYER_PLATFORM'
    | 'AI_PLATFORM';
export type StreamingRightsDealStructure =
    | 'FLAT_LICENSE'
    | 'GUARANTEE_BONUS'
    | 'GUARANTEE_REVENUE_SHARE'
    | 'PERMANENT_ACQUISITION'
    | 'PRE_BUY'
    | 'INTERNAL_ALLOCATION';
export type StreamingRightsLocalizationTerms = 'NONE' | 'SUBTITLES' | 'DUBS_AND_SUBTITLES';
export type StreamingRightsGuaranteeDisposition = 'PENDING' | 'PAID' | 'LEGACY_PAID' | 'INTERNAL';
export type StreamingRightsContractLegacySource =
    | 'OWNED_PLATFORM_LICENSE'
    | 'PLATFORM_AI_LICENSE'
    | 'PRODUCTION_RELEASE';

export interface StreamingRightsContractParty {
    type: StreamingRightsContractPartyType;
    id: string;
    name: string;
    /** Canonical ecosystem operator id. Includes seeded and generated platforms. */
    platformId: string | null;
}

export interface StreamingRightsContractSettlement {
    guarantee: StreamingRightsGuaranteeDisposition;
    paymentKey: string;
    settledAtAbsoluteWeek: number | null;
}

export interface OwnedStreamingCatalogSetupDraft {
    currentStep: number;
    selectedOwnedProjectIds: string[];
    packageId: StreamingStarterCatalogPackageId;
    opportunityProjectId: string | null;
    territory: StreamingLicenseTerritory;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    minimumGuarantee: number;
    platformRevenueShare: number;
    negotiationStatus: StreamingCatalogNegotiationStatus;
    counterMinimumGuarantee: number | null;
    counterPlatformRevenueShare: number | null;
    negotiationRound: number;
    updatedAtAbsoluteWeek: number;
}

export interface OwnedStreamingStarterCatalog {
    packageId: StreamingStarterCatalogPackageId;
    ownedProjectIds: string[];
    licensedProjectIds: string[];
    establishedAtAbsoluteWeek: number;
}

export interface OwnedStreamingCatalogLicense {
    id: string;
    sourceProjectId: string;
    titleAtSigning: string;
    projectType?: 'MOVIE' | 'SERIES';
    genre?: string;
    licensorName: string;
    territory: StreamingLicenseTerritory;
    /**
     * Exact country snapshot for bounded territory contracts. GLOBAL contracts
     * intentionally leave this empty so future markets remain covered.
     */
    countryIds?: string[];
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    minimumGuarantee: number;
    platformRevenueShare: number;
    licensorRevenueShare: number;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    status: StreamingCatalogLicenseStatus;
    origin?: 'STARTER' | 'STUDIO_MARKET' | 'PLATFORM_TRADE' | 'RENEWAL' | 'OWNED_STUDIO_TRANSFER' | 'CATALOGUE_ACQUISITION';
    buyerPlatformId?: string | null;
    platformContentPlanId?: string | null;
    cataloguePackageId?: string | null;
    /** Future-release market sale that originated this contract. */
    upcomingRightsSaleId?: string | null;
    contentSource?: PlatformAiContentSource;
    sellerType?: StreamingRightsSellerType;
    sellerPlatformId?: string | null;
    windowType?: StreamingRightsWindowType;
    permanentPurchase?: boolean;
    marketingGuarantee?: number;
    viewershipBonusThreshold?: number;
    viewershipBonusAmount?: number;
    renewalOption?: boolean;
    sublicensingAllowed?: boolean;
    sequelRightsIncluded?: boolean;
    changeOfControl?: StreamingRightsChangeOfControl;
    cancellationPenalty?: number;
    renewedFromLicenseId?: string | null;
}

/** Actor-neutral canonical record shared by production and distribution views. */
export interface StreamingRightsContract extends OwnedStreamingCatalogLicense {
    schemaVersion: typeof STREAMING_RIGHTS_CONTRACT_SCHEMA_VERSION;
    idempotencyKey: string;
    biddingSessionId: string | null;
    sourceOfferId: string | null;
    seller: StreamingRightsContractParty;
    buyer: StreamingRightsContractParty;
    dealStructure: StreamingRightsDealStructure;
    productionFunding: number;
    futureSeasonFunding: number;
    localization: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    backendBasis: StreamingBackendBasis;
    guaranteeRecoupment: StreamingGuaranteeRecoupment;
    backendCap: number | null;
    cumulativeRoyaltyAccrued: number;
    cumulativeRoyaltyPaid: number;
    settlement: StreamingRightsContractSettlement;
    legacySource?: StreamingRightsContractLegacySource;
    /** Original studio-to-platform contract at the start of this rights chain. */
    rootContractId: string;
    /** Immediately preceding contract position; null for an original grant. */
    parentContractId: string | null;
    /** A6 transaction that created this successor; null for an original grant. */
    rightsTransactionId: string | null;
    /** Successor contract after a full transfer closes this position. */
    transferredToContractId: string | null;
    transferredAtAbsoluteWeek: number | null;
}

export type StreamingRightsContractRegistry = Record<string, StreamingRightsContract>;

export const STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION = 1 as const;
export type StreamingRightsTransactionKind = 'LICENSE_TRANSFER' | 'SUBLICENSE' | 'PERMANENT_ACQUISITION';
export type StreamingRightsTransactionStatus = 'LISTED' | 'OPEN' | 'ACCEPTED' | 'SETTLED' | 'CANCELLED' | 'INVALIDATED';
export type StreamingRightsTransactionController = 'AI' | 'PLAYER';

export interface StreamingRightsTransaction {
    schemaVersion: typeof STREAMING_RIGHTS_TRANSACTION_SCHEMA_VERSION;
    id: string;
    idempotencyKey: string;
    kind: StreamingRightsTransactionKind;
    status: StreamingRightsTransactionStatus;
    originalOwner: StreamingRightsContractParty;
    seller: StreamingRightsContractParty;
    buyer: StreamingRightsContractParty;
    sourceContractId: string;
    rootContractId: string;
    successorContractId: string | null;
    sourceProjectId: string;
    title: string;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    exclusivity: StreamingLicenseExclusivity;
    windowType: StreamingRightsWindowType;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    askingPrice: number;
    acceptedPrice: number;
    sellerReceipt: number;
    /** Downstream transfers never create a new payment to the original studio. */
    originalOwnerParticipation: 0;
    controllerAtCommitment: {
        seller: StreamingRightsTransactionController;
        buyer: StreamingRightsTransactionController;
    };
    groupId: string | null;
    listedAtAbsoluteWeek: number;
    committedAtAbsoluteWeek: number | null;
    settledAtAbsoluteWeek: number | null;
    resolvedAtAbsoluteWeek: number | null;
    resolutionReason: string | null;
}

export type StreamingRightsTransactionRegistry = Record<string, StreamingRightsTransaction>;

export const STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION = 2 as const;
export type StreamingRightsControlMode = 'STRATEGY' | 'CUSTOM' | 'FULL';
export type StreamingRightsFinancialPriority = 'UPFRONT_SECURITY' | 'BALANCED_RETURN' | 'BACKEND_UPSIDE';
export type StreamingRightsDistributionPriority = 'GLOBAL_PARTNER' | 'REGIONAL_OPTIMIZATION' | 'BROAD_NON_EXCLUSIVE';
export type StreamingRightsExclusivityPolicy = 'ALLOW_WITHIN_LIMITS' | 'RESTRICT' | 'REQUIRE_APPROVAL';
export type StreamingRightsDurationPreference = 'SHORT' | 'BALANCED' | 'LONG';
export type StreamingRightsPartnerPreference = 'STRONGEST_ECONOMICS' | 'WIDEST_REACH' | 'TRUSTED_RELATIONSHIPS';
export type StreamingRightsTitleControlOverride = 'MANUAL' | 'DELEGATED';
export type StreamingRightsRenewalPreference =
    | 'BALANCED'
    | 'RENEW_WINNERS'
    | 'RETEST_MARKET'
    | 'UPFRONT_SECURITY'
    | 'BACKEND_UPSIDE'
    | 'RELATIONSHIP_FIRST';
export type StreamingRightsRenewalCaseStatus =
    | 'WATCHING'
    | 'OFFER_AVAILABLE'
    | 'ACTION_REQUIRED'
    | 'RENEWAL_SECURED'
    | 'RETURNING_TO_MARKET'
    | 'LETTING_EXPIRE'
    | 'NO_OFFER'
    | 'EXPIRED';
export type StreamingRightsRenewalOutcome =
    | 'PENDING'
    | 'ACCEPTED'
    | 'DELEGATED_ACCEPTED'
    | 'RETURN_TO_MARKET'
    | 'LET_EXPIRE'
    | 'NO_OFFER';
export type StreamingRightsRenewalOfferDisposition = 'PENDING' | 'OFFERED' | 'DECLINED';

export interface StreamingRightsRenewalPolicy {
    noticeWeeks: number;
    preference: StreamingRightsRenewalPreference;
    autoRenewMinimumScore: number;
    letWeakContractsExpireBelowScore: number;
    maximumAutomaticGuarantee: number;
    maximumAutomaticDurationWeeks: number;
    protectGlobalExclusives: boolean;
    protectFranchises: boolean;
}

export interface StreamingRightsStudioMandate {
    studioId: string;
    controlMode: StreamingRightsControlMode;
    financialPriority: StreamingRightsFinancialPriority;
    distributionPriority: StreamingRightsDistributionPriority;
    exclusivityPolicy: StreamingRightsExclusivityPolicy;
    durationPreference: StreamingRightsDurationPreference;
    partnerPreference: StreamingRightsPartnerPreference;
    renewalPreference: StreamingRightsRenewalPreference;
    maximumAutomaticGuarantee: number;
    maximumAutomaticDurationWeeks: number;
    protectGlobalExclusives: boolean;
    protectFranchises: boolean;
    titleOverrides: Record<string, StreamingRightsTitleControlOverride>;
    revision: number;
    updatedAtAbsoluteWeek: number;
}

export interface StreamingRightsDelegationTrace {
    mandateStudioId: string;
    mandateRevision: number;
    controlMode: StreamingRightsControlMode;
    rule: string;
    facts: Record<string, string | number | boolean | null>;
    explanation: string;
}

export interface StreamingRightsManagementState {
    schemaVersion: typeof STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION;
    controlMode: StreamingRightsControlMode;
    policy: StreamingRightsRenewalPolicy;
    packagePolicy?: StreamingCataloguePackagePolicy;
    protectedProjectIds: string[];
    manualContractIds: string[];
    studioMandates: Record<string, StreamingRightsStudioMandate>;
    updatedAtAbsoluteWeek: number;
}

export interface StreamingRightsRenewalPerformanceSnapshot {
    attributedRevenue: number;
    viewingAccounts: number;
    watchHours: number;
    subscriberAcquisition: number;
    subscriberRetention: number;
    royaltiesPaid: number;
    rating: number;
    awards: number;
    performanceScore: number;
    marketDemandScore: number;
    relationshipScore: number;
    rivalInterestScore: number;
    affordabilityScore: number;
}

export interface StreamingRightsRenewalEconomics {
    minimumGuarantee: number;
    platformRevenueShare: number;
    licensorRevenueShare: number;
    durationWeeks: number;
    offerExpiresAtAbsoluteWeek: number;
}

export interface StreamingRightsRenewalCase {
    id: string;
    idempotencyKey: string;
    sourceContractId: string;
    sourceProjectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    exclusivity: StreamingLicenseExclusivity;
    windowType: StreamingRightsWindowType;
    seller: StreamingRightsContractParty;
    incumbentBuyer: StreamingRightsContractParty;
    sourceExpiresAtAbsoluteWeek: number;
    renewalStartsAtAbsoluteWeek: number;
    openedAtAbsoluteWeek: number;
    decisionDeadlineAbsoluteWeek: number;
    renewalOption: boolean;
    status: StreamingRightsRenewalCaseStatus;
    offerDisposition: StreamingRightsRenewalOfferDisposition;
    performance: StreamingRightsRenewalPerformanceSnapshot | null;
    proposedEconomics: StreamingRightsRenewalEconomics | null;
    controlModeAtOpen: StreamingRightsControlMode;
    policyPreferenceAtOpen: StreamingRightsRenewalPreference;
    protectionReasons: string[];
    delegatedReason: string | null;
    delegationTrace?: StreamingRightsDelegationTrace | null;
    outcome: StreamingRightsRenewalOutcome;
    replacementContractId: string | null;
    resolvedAtAbsoluteWeek: number | null;
    lastProcessedAbsoluteWeek: number;
}

export type StreamingRightsRenewalCaseRegistry = Record<string, StreamingRightsRenewalCase>;

export interface StreamingRightsCalendarDigest {
    id: string;
    absoluteWeek: number;
    actionRequired: number;
    approachingExpiry: number;
    delegatedRenewals: number;
    returnedToMarket: number;
    expired: number;
    summary: string;
}

export interface StreamingRightsCalendarState {
    schemaVersion: typeof STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION;
    renewalCases: StreamingRightsRenewalCaseRegistry;
    digests: StreamingRightsCalendarDigest[];
    urgentNoticeKeys: string[];
    lastProcessedAbsoluteWeek: number;
}

export const STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION = 1 as const;

export interface StreamingRightsOfficeDigest {
    id: string;
    absoluteWeek: number;
    actionRequired: number;
    delegatedDecisions: number;
    renewals: number;
    expiries: number;
    packages: number;
    transfers: number;
    royaltySettlements: number;
    summary: string;
}

export interface StreamingRightsOfficeState {
    schemaVersion: typeof STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION;
    digests: StreamingRightsOfficeDigest[];
    lastProcessedAbsoluteWeek: number;
}

export type StreamingBiddingSessionStatus = 'LIVE' | 'CLOSING' | 'ACCEPTED' | 'LEFT';
export type StreamingBiddingPlatformStatus = 'WAITING' | 'RESPONDING' | 'FINAL' | 'WITHDRAWN';
export type StreamingOfferStatus = 'ACTIVE' | 'FINAL' | 'REPLACED' | 'WITHDRAWN' | 'ACCEPTED';
export type StreamingGuaranteeRecoupment = 'NON_RECOUPABLE' | 'RECOUPABLE';
export type StreamingBackendBasis = 'ADJUSTED_GROSS_RECEIPTS';
export type StreamingBiddingEventType = 'OPENED' | 'PITCHED' | 'REVISED' | 'FINAL' | 'WITHDREW' | 'CLOSED' | 'ACCEPTED' | 'LEFT';

/** Immutable rights scope shared by every offer in one bidding room. */
export interface StreamingBiddingRightsLot {
    id: string;
    sourceProjectId: string;
    territory: StreamingLicenseTerritory;
    /** Exact canonical country snapshot, including for a worldwide lot. */
    countryIds: string[];
    excludedCountryIds: string[];
    startsAtAbsoluteWeek: number;
    maximumDurationWeeks: number;
    windowType: StreamingRightsWindowType;
    notice: string | null;
}

export interface StreamingBiddingPlatformInput {
    id: string;
    name: string;
    color: string;
    /** Full currency available for new fixed commitments. */
    cashAvailable: number;
    baseBid: number;
    acquisitionCeiling: number;
    qualityPreference: number;
    relationshipMultiplier: number;
    /** False when administration or funding covenants prohibit fresh rights bids. */
    canStartNewBids?: boolean;
    /** Highest public localization term backed by currently operating language tiers. */
    localizationLevelCap?: StreamingRightsLocalizationTerms;
    /** Exact language scope behind the public three-value term. */
    localizationRequirements?: StreamingLocalizationPromise[];
    /** Markets this platform values strategically for this title. */
    strategicCountryIds?: string[];
    /** Optional deterministic strategy inputs; 1 is neutral. */
    catalogueGapMultiplier?: number;
    subscriberOpportunityMultiplier?: number;
    /** Company-specific chance (0-1) of attaching adjusted-gross participation. */
    backendPreference?: number;
    /** Company-specific chance (0-1) of requesting a shared rather than exclusive licence. */
    sharedRightsPreference?: number;
    /** Platform calendar slots this bidder can contractually promise for the title. */
    availablePremiereAbsoluteWeeks?: number[];
    /** Earliest currently available slot, retained for compact UI adapters. */
    availablePremiereAbsoluteWeek?: number;
}

export interface StreamingOfferVersion {
    id: string;
    sessionId: string;
    platformId: string;
    platformName: string;
    revision: number;
    status: StreamingOfferStatus;
    replacesOfferId: string | null;
    isClearingOffer: boolean;
    dealStructure: StreamingRightsDealStructure;
    minimumGuarantee: number;
    productionFunding: number;
    futureSeasonFunding: number;
    licensorRevenueShare: number;
    platformRevenueShare: number;
    backendBasis: StreamingBackendBasis;
    guaranteeRecoupment: StreamingGuaranteeRecoupment;
    backendCap: number | null;
    durationWeeks: number;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    exclusivity: StreamingLicenseExclusivity;
    localization: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    renewalOption: boolean;
    fixedExposure: number;
    expectedRoyaltyCost: number;
    expectedTotalCost: number;
    expectedPlatformValue: number;
    createdAtActiveSecond: number;
    /** Premiere date promised by this specific contract offer. */
    proposedPremiereAbsoluteWeek?: number;
    cataloguePackageId?: string | null;
    componentTerms?: StreamingCataloguePackageOfferRow[];
}

export interface StreamingBiddingPlatformState {
    platformId: string;
    platformName: string;
    color: string;
    status: StreamingBiddingPlatformStatus;
    actionCooldownSeconds: number;
    secondsUntilAction: number;
    revision: number;
    currentOfferId: string | null;
    isClearingBidder: boolean;
    fixedExposureCeiling: number;
    expectedTitleGross: number;
    relationshipMultiplier: number;
    rightsLotValueMultiplier: number;
    localizationLevelCap?: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    catalogueComponentValues?: Record<string, number>;
    backendPreference?: number;
    sharedRightsPreference?: number;
    availablePremiereAbsoluteWeeks?: number[];
    availablePremiereAbsoluteWeek?: number;
}

export interface StreamingBiddingEvent {
    id: string;
    type: StreamingBiddingEventType;
    activeSecond: number;
    platformId: string | null;
    offerId: string | null;
}

export interface StreamingBiddingSession {
    id: string;
    idempotencyKey: string;
    projectId: string;
    title: string;
    sellerStudioId: string;
    sellerStudioName: string;
    absoluteWeek: number;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    rightsLot: StreamingBiddingRightsLot;
    status: StreamingBiddingSessionStatus;
    roomSecondsRemaining: number;
    activeSecondsElapsed: number;
    materialEventCount: number;
    platformStates: StreamingBiddingPlatformState[];
    offers: StreamingOfferVersion[];
    events: StreamingBiddingEvent[];
    acceptedOfferId: string | null;
    closedAtActiveSecond: number | null;
    /** Shared licences in one room must all use this date after the first signature. */
    lockedPremiereAbsoluteWeek?: number | null;
    subjectKind?: 'TITLE' | 'CATALOGUE_PACKAGE';
    cataloguePackageId?: string | null;
    componentLots?: StreamingBiddingRightsLot[];
    catalogueComponents?: StreamingCataloguePackageComponent[];
}

export type StreamingBiddingSessionRegistry = Record<string, StreamingBiddingSession>;

export type StreamingBuyerAuctionStatus = 'LIVE' | 'WON' | 'LOST' | 'NO_SALE' | 'WITHDRAWN' | 'INVALIDATED';
export type StreamingBuyerAuctionBidStatus = 'ACTIVE' | 'OUTBID' | 'WITHDRAWN' | 'WON' | 'LOST';
export type StreamingBuyerAuctionEventType = 'OPENED' | 'BID_PLACED' | 'BID_REVISED' | 'RIVAL_BID' | 'RIVAL_WITHDREW' | 'CLOSED' | 'SETTLED' | 'INVALIDATED';

export interface StreamingBuyerAuctionAllowedTerms {
    backendMinimum: number;
    backendMaximum: number;
    marketingMaximum: number;
    futureGreenlightAllowed: boolean;
    futureGreenlightReserve: number;
}

export interface StreamingBuyerAuctionSellerPriorities {
    cash: number;
    backend: number;
    marketing: number;
    futureGreenlight: number;
}

export interface StreamingBuyerAuctionLot {
    id: string;
    listingId: string;
    listingSignature: string;
    listingKind: 'TITLE' | 'CATALOGUE_PACKAGE';
    sourceProjectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    sellerId: string;
    sellerName: string;
    sourceLicenseId: string | null;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    excludedCountryIds: string[];
    windowType: StreamingRightsWindowType;
    exclusivity: StreamingLicenseExclusivity;
    durationWeeks: number;
    startsAtAbsoluteWeek: number;
    referenceValue: number;
    minimumGuarantee: number;
    minimumBidIncrement: number;
    reserveSellerValue: number;
    allowedTerms: StreamingBuyerAuctionAllowedTerms;
    sellerPriorities: StreamingBuyerAuctionSellerPriorities;
    notice: string | null;
    cataloguePackageId: string | null;
    /** CM4 future-release sale represented by this lot, when applicable. */
    upcomingRightsSaleId?: string | null;
    /** Frozen component projects when the lot represents an all-or-nothing catalogue package. */
    catalogueComponentIds?: string[];
}

export interface StreamingBuyerAuctionBid {
    id: string;
    sessionId: string;
    bidderId: string;
    bidderName: string;
    platformId: string | null;
    isPlayer: boolean;
    revision: number;
    status: StreamingBuyerAuctionBidStatus;
    replacesBidId: string | null;
    minimumGuarantee: number;
    licensorRevenueShare: number;
    marketingGuarantee: number;
    futureGreenlight: boolean;
    guaranteedExposure: number;
    sellerValue: number;
    createdAtActiveSecond: number;
}

export interface StreamingBuyerAuctionRival {
    bidderId: string;
    platformId: string;
    platformName: string;
    color: string;
    cashAvailable: number;
    sellerValueCeiling: number;
    preferredBackend: number;
    marketingLimit: number;
    nextActionSecond: number;
    revision: number;
    status: 'WATCHING' | 'ACTIVE' | 'FINAL' | 'WITHDRAWN';
    currentBidId: string | null;
}

export interface StreamingBuyerAuctionEvent {
    id: string;
    type: StreamingBuyerAuctionEventType;
    activeSecond: number;
    bidderId: string | null;
    bidId: string | null;
}

export interface StreamingBuyerAuctionSession {
    id: string;
    idempotencyKey: string;
    lot: StreamingBuyerAuctionLot;
    status: StreamingBuyerAuctionStatus;
    openedAtAbsoluteWeek: number;
    roomSecondsRemaining: number;
    activeSecondsElapsed: number;
    hardClosesAtSecond: number;
    materialEventCount: number;
    lastRealtimeAtMs: number;
    playerBidderId: string;
    playerBidId: string | null;
    rivals: StreamingBuyerAuctionRival[];
    bids: StreamingBuyerAuctionBid[];
    events: StreamingBuyerAuctionEvent[];
    leaderBidId: string | null;
    winnerBidId: string | null;
    closedAtActiveSecond: number | null;
    settledAtAbsoluteWeek: number | null;
    resultReason: string | null;
    outcomeMessageId: string | null;
}

export type StreamingUpcomingRightsSaleStatus = 'ANNOUNCED' | 'LIVE' | 'ACQUIRED' | 'LOST' | 'CLOSED' | 'WITHDRAWN';
export type StreamingUpcomingRightsInterest = 'EMERGING' | 'ACTIVE' | 'HIGH' | 'EVENT';

/** A saved public sale window for a real canonical production that has not released yet. */
export interface StreamingUpcomingRightsSale {
    schemaVersion: 1;
    id: string;
    idempotencyKey: string;
    sourceProductionId: string;
    sourceProjectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    sellerId: string;
    sellerName: string;
    announcedAtAbsoluteWeek: number;
    opensAtAbsoluteWeek: number;
    originalAvailabilityAbsoluteWeek: number;
    plannedAvailabilityAbsoluteWeek: number;
    durationWeeks: number;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    exclusivity: StreamingLicenseExclusivity;
    referenceValue: number;
    minimumGuarantee: number;
    publicInterestScore: number;
    publicInterest: StreamingUpcomingRightsInterest;
    publicInterestDrivers: string[];
    status: StreamingUpcomingRightsSaleStatus;
    followedAtAbsoluteWeek: number | null;
    openedNotificationId: string | null;
    auctionSessionId: string | null;
    winningContractId: string | null;
    winnerName: string | null;
    resolvedAtAbsoluteWeek: number | null;
    lastProcessedAbsoluteWeek: number;
}

export const STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION = 1 as const;
export type StreamingCataloguePackageLifecycle =
    | 'DRAFT'
    | 'READY'
    | 'LIVE'
    | 'SIGNED'
    | 'WITHDRAWN'
    | 'INVALIDATED';
export type StreamingCataloguePackageSource =
    | 'PLAYER_CURATED'
    | 'RIGHTS_DESK_PROPOSAL'
    | 'PLATFORM_AI_SOURCING'
    | 'OWNED_PLATFORM_MARKET';
export type StreamingCataloguePackageAutomation = 'SUGGEST_ONLY' | 'ROUTINE_AUTOMATIC';

export interface StreamingCataloguePackagePolicy {
    automation: StreamingCataloguePackageAutomation;
    preferredSize: { min: number; max: number };
    maximumAutomaticSize: number;
    maximumAutomaticDurationWeeks: number;
    allowAutomaticExclusive: boolean;
    allowAutomaticGlobal: boolean;
    minimumGuaranteeRatio: number;
}

export interface StreamingCataloguePackageExclusion {
    projectId: string;
    title: string;
    code: string;
    detail: string;
}

export interface StreamingCataloguePackageComponent {
    sourceProjectId: string;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    originalLanguageId: string;
    sellerStudioId: string;
    quality: number;
    audience: number;
    budget: number;
    theatricalGross: number;
    streamingRevenue: number;
    franchiseProtected: boolean;
    rightsLot: StreamingBiddingRightsLot;
    referenceValue: number;
    referenceWeight: number;
}

export interface StreamingCataloguePackageOfferRow {
    componentProjectId: string;
    componentLotId: string;
    minimumGuarantee: number;
    licensorRevenueShare: number;
    platformRevenueShare: number;
    backendBasis: StreamingBackendBasis;
    guaranteeRecoupment: StreamingGuaranteeRecoupment;
    backendCap: number | null;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    localization: StreamingRightsLocalizationTerms;
    localizationRequirements?: StreamingLocalizationPromise[];
    expectedRoyaltyCost: number;
    expectedTotalCost: number;
    referenceAllocation: number;
    bidderWeight: number;
}

export interface StreamingCataloguePackageDigest {
    id: string;
    absoluteWeek: number;
    proposed: number;
    signed: number;
    skipped: number;
    summary: string;
}

export interface StreamingCataloguePackage {
    schemaVersion: typeof STREAMING_CATALOGUE_PACKAGE_SCHEMA_VERSION;
    id: string;
    idempotencyKey: string;
    source: StreamingCataloguePackageSource;
    lifecycle: StreamingCataloguePackageLifecycle;
    name: string;
    seller: StreamingRightsContractParty;
    createdAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    requestedWindowType: StreamingRightsWindowType;
    requestedExclusivity: StreamingLicenseExclusivity;
    requestedCountryIds: string[];
    maximumDurationWeeks: number;
    components: StreamingCataloguePackageComponent[];
    excluded: StreamingCataloguePackageExclusion[];
    controlModeAtCreation: StreamingRightsControlMode;
    protectionReasons: string[];
    delegatedReason: string | null;
    delegationTrace?: StreamingRightsDelegationTrace | null;
    manualApprovalRequired: boolean;
    biddingSessionId: string | null;
    acceptedOfferId: string | null;
    signedAtAbsoluteWeek: number | null;
    totalGuarantee: number;
    totalExpectedExposure: number;
    acceptedTerms: StreamingCataloguePackageOfferRow[];
    componentContractIds: string[];
    digestId: string | null;
}

export type StreamingCataloguePackageRegistry = Record<string, StreamingCataloguePackage>;

export interface StreamingTitleRevenueSignal {
    projectId: string;
    viewingAccounts: number;
    watchHours: number;
    subscriberAcquisition: number;
    subscriberRetention: number;
    advertisingRevenue: number;
    transactionalRevenue: number;
    taxesRefundsAndStorefrontFees: number;
}

export interface StreamingTitleRevenueAttribution {
    projectId: string;
    contributionWeight: number;
    attributedSubscriptionRevenue: number;
    attributedAdvertisingRevenue: number;
    attributedTransactionalRevenue: number;
    allowedDeductions: number;
    adjustedGrossReceipts: number;
}

export interface StreamingRoyaltySettlement {
    id: string;
    idempotencyKey: string;
    contractId: string;
    projectId: string;
    buyerPlatformId: string | null;
    sellerStudioId: string;
    absoluteWeek: number;
    adjustedGrossReceipts: number;
    grossRoyaltyAccrued: number;
    royaltyPaid: number;
    recoupmentRemaining: number;
    capRemaining: number | null;
}

export type StreamingRoyaltySettlementRegistry = Record<string, StreamingRoyaltySettlement>;

export interface OwnedStreamingRightsNegotiation {
    id: string;
    idempotencyKey: string;
    kind: StreamingRightsNegotiationKind;
    sourceProjectId: string;
    sourceLicenseId: string | null;
    title: string;
    projectType: 'MOVIE' | 'SERIES';
    genre: string;
    sellerType: StreamingRightsSellerType;
    sellerId: string;
    sellerName: string;
    buyerPlatformId: PlatformId | null;
    buyerName: string | null;
    territory: StreamingLicenseTerritory;
    /** Exact bounded scope captured when the term sheet opens. GLOBAL uses []. */
    countryIds: string[];
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    windowType: StreamingRightsWindowType;
    minimumGuarantee: number;
    platformRevenueShare: number;
    marketingGuarantee: number;
    viewershipBonusThreshold: number;
    viewershipBonusAmount: number;
    renewalOption: boolean;
    sublicensingAllowed: boolean;
    sequelRightsIncluded: boolean;
    changeOfControl: StreamingRightsChangeOfControl;
    cancellationPenalty: number;
    rivalPlatformId: PlatformId | null;
    rivalPlatformName: string | null;
    rivalBidAmount: number;
    marketHeat: 'COOL' | 'ACTIVE' | 'HOT';
    status: StreamingRightsNegotiationStatus;
    round: number;
    counterMinimumGuarantee: number | null;
    counterPlatformRevenueShare: number | null;
    createdAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    /** CM2 metadata exists only for offers submitted through the Content Market. */
    proposalVersion?: number;
    submittedAtAbsoluteWeek?: number | null;
    responseDueAbsoluteWeek?: number | null;
    responseStatus?: StreamingPrivateOfferResponseStatus | null;
    responseReason?: string | null;
    respondedAtAbsoluteWeek?: number | null;
    processedProposalVersion?: number | null;
    signingDeadlineAbsoluteWeek?: number | null;
    responseMessageId?: string | null;
    /** Earliest canonical availability for a pre-release acquisition. */
    availabilityAtAbsoluteWeek?: number | null;
    /** Future-release sale that opened this term sheet. */
    upcomingRightsSaleId?: string | null;
}

export interface OwnedStreamingSublicenseDeal {
    id: string;
    sourceLicenseId: string;
    sourceProjectId: string;
    title: string;
    buyerPlatformId: PlatformId;
    buyerName: string;
    territory: StreamingLicenseTerritory;
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    upfrontFee: number;
    sellerRevenueShare: number;
    buyerRevenueShare: number;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
    changeOfControl: StreamingRightsChangeOfControl;
    cancellationPenalty: number;
}

export interface OwnedStreamingRightsObligation {
    id: string;
    licenseId: string;
    sourceProjectId: string;
    title: string;
    type: StreamingRightsObligationType;
    targetAmount: number;
    observedAmount: number;
    dueAtAbsoluteWeek: number;
    status: StreamingRightsObligationStatus;
    breachPenalty: number;
    successPayment: number;
    resolvedAtAbsoluteWeek: number | null;
    /** Optional producer/counterparty required by a future-greenlight promise. */
    counterpartyId?: string | null;
    createdAtAbsoluteWeek?: number | null;
}

export type StreamingOriginalGapId =
    | 'SERIES_RETENTION'
    | 'GENRE_WHITE_SPACE'
    | 'PRESTIGE_ANCHOR'
    | 'BROAD_AUDIENCE';
export type StreamingOriginalCommissionStatus = 'READY_FOR_GREENLIGHT' | 'GREENLIT' | 'IN_PRODUCTION' | 'DELIVERED' | 'RELEASED';
export type StreamingOriginalReleasePattern = 'SINGLE_PREMIERE' | 'FULL_SEASON' | 'WEEKLY' | 'SPLIT_VOLUME';
export type StreamingSlateMarketingPlan = 'LEAN' | 'STANDARD' | 'EVENT';
export type StreamingSlateEntrySource = 'ORIGINAL' | 'OWNED_LIBRARY' | 'LICENSED_WINDOW';
export type StreamingOriginalStrategy =
    | 'EVENT_BLOCKBUSTER'
    | 'WEEKLY_RETENTION'
    | 'PRESTIGE_LIMITED'
    | 'REGIONAL_BREAKOUT'
    | 'KIDS_EVERGREEN'
    | 'REALITY_ENGAGEMENT'
    | 'DOCUMENTARY_HALO'
    | 'EXPERIMENTAL_CULT';
export type StreamingOriginalLocalizationPackage = 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL';
export type StreamingOriginalReleaseScope = 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL';
export type StreamingOriginalLifecycleDecisionType = 'RENEW' | 'CANCEL' | 'LICENSE_WINDOW' | 'FRANCHISE';

export interface OwnedStreamingOriginalContract {
    platformRightsPercent: number;
    producerBackendPercent: number;
    exclusiveWindowWeeks: number;
    sequelRightsIncluded: boolean;
}

export interface OwnedStreamingOriginalLocalization {
    packageId: StreamingOriginalLocalizationPackage;
    subtitleLanguageCount: number;
    dubbedLanguageCount: number;
    cashCost: number;
    committedAtAbsoluteWeek: number;
    readyAtAbsoluteWeek: number;
}

export interface OwnedStreamingOriginalReleasePlan {
    scope: StreamingOriginalReleaseScope;
    releasePattern: StreamingOriginalReleasePattern;
    marketingPlan: StreamingSlateMarketingPlan;
    premiereAtAbsoluteWeek: number;
    authorizedAtAbsoluteWeek: number;
}

export interface OwnedStreamingOriginalLifecycleDecision {
    id: string;
    type: StreamingOriginalLifecycleDecisionType;
    decidedAtAbsoluteWeek: number;
    evidenceWeeks: number;
    evidenceSummary: string;
    exclusiveWindowWeeks: number | null;
}

export interface OwnedStreamingOriginalCommissionDraft {
    currentStep: number;
    gapId: StreamingOriginalGapId;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    episodes: number;
    targetAudience: TargetAudience;
    producerStudioId: string | null;
    productionBudgetCap: number;
    updatedAtAbsoluteWeek: number;
    strategy?: StreamingOriginalStrategy;
    platformRightsPercent?: number;
    exclusiveWindowWeeks?: number;
    sequelRightsIncluded?: boolean;
    parentCommissionId?: string | null;
    lineageId?: string | null;
    seasonNumber?: number;
}

export interface OwnedStreamingOriginalCommission {
    id: string;
    scriptId: string;
    canonicalProjectId: string | null;
    title: string;
    gapId: StreamingOriginalGapId;
    projectType: ProjectType;
    genre: Genre;
    episodes: number;
    producerStudioId: string;
    producerStudioName: string;
    commissionedByPlatformName: string;
    productionBudgetCap: number;
    productionFundingApplied: number;
    status: StreamingOriginalCommissionStatus;
    commissionedAtAbsoluteWeek: number;
    greenlitAtAbsoluteWeek: number | null;
    strategy?: StreamingOriginalStrategy;
    parentCommissionId?: string | null;
    lineageId?: string;
    seasonNumber?: number;
    contract?: OwnedStreamingOriginalContract;
    localization?: OwnedStreamingOriginalLocalization | null;
    releasePlan?: OwnedStreamingOriginalReleasePlan | null;
    lifecycleDecision?: OwnedStreamingOriginalLifecycleDecision | null;
}

export interface OwnedStreamingSlateEntry {
    id: string;
    projectId: string;
    title: string;
    source: StreamingSlateEntrySource;
    projectType: ProjectType;
    genre: string;
    launchWeek: number;
    releasePattern: StreamingOriginalReleasePattern;
    marketingPlan: StreamingSlateMarketingPlan;
}

export interface OwnedStreamingLaunchSlate {
    entries: OwnedStreamingSlateEntry[];
    programmedAtAbsoluteWeek: number;
    revision: number;
}

export type StreamingLaunchCapacityPlan = 'STANDARD' | 'CLOUD_BURST' | 'STAGGERED_PREMIERE';
export type StreamingLaunchOutcomeTier = 'SMOOTH_OPENING' | 'PRESSURED_OPENING' | 'DEGRADED_OPENING';

/**
 * Immutable Phase 8 launch-night facts. Phase 9 may present and expand these
 * results, but it must never reroll them when a cinematic is skipped/replayed.
 */
export interface OwnedStreamingLaunchCommit {
    id: string;
    idempotencyKey: string;
    committedAtAbsoluteWeek: number;
    capacityPlan: StreamingLaunchCapacityPlan;
    capacityPlanCost: number;
    readinessScore: number;
    forecastLikelyConcurrentStreams: number;
    forecastHighConcurrentStreams: number;
    protectedPeakConcurrentStreams: number;
    launchHeadroomPercent: number;
    initialSubscribers: number;
    openingDemandIndex: number;
    playbackSuccessRate: number;
    outcomeTier: StreamingLaunchOutcomeTier;
    openingTitleCount: number;
    openingOriginalTitle: string;
}

export interface OwnedStreamingPlatformMetrics {
    subscribers: number;
    netSubscriberMovement: number;
    churnRate: number;
    engagementRate: number;
    averageRevenuePerUser: number;
    cashRunwayWeeks: number;
    technologyHealth: number;
}

export type StreamingWeeklyPlanId =
    | 'AUDIENCE_PUSH'
    | 'RELIABILITY_GUARD'
    | 'RETENTION_SPOTLIGHT';

export interface OwnedStreamingWeeklyDecision {
    id: string;
    idempotencyKey: string;
    planId: StreamingWeeklyPlanId;
    label: string;
    selectedAtAbsoluteWeek: number;
    targetAbsoluteWeek: number;
    cashCost: number;
    status: 'LOCKED' | 'APPLIED';
    appliedAtAbsoluteWeek: number | null;
    outcomeNote: string | null;
}

export type StreamingCampaignChannelId = 'TRAILER' | 'BILLBOARD' | 'SOCIAL' | 'REGIONAL';
export type StreamingHomepagePlacement = 'NONE' | 'HERO' | 'TOP_TEN' | 'GENRE_SPOTLIGHT';
export type StreamingRecommendationObjective = 'BALANCED' | 'RETENTION' | 'CATALOG_DISCOVERY' | 'BREAKOUT';
export type StreamingArtworkVariant = 'FACE_FORWARD' | 'WORLD_BUILDING' | 'MYSTERY_HOOK';

export interface OwnedStreamingGrowthAttribution {
    attributedViewingAccounts: number;
    attributedJoins: number;
    costPerAttributedJoin: number | null;
    artworkWinner: StreamingArtworkVariant | null;
    artworkWinnerLiftPercent: number | null;
    observedDiscoveryMix: OwnedStreamingTitleDiscoveryMix | null;
    summary: string;
}

export interface OwnedStreamingGrowthAction {
    id: string;
    idempotencyKey: string;
    projectId: string;
    title: string;
    selectedAtAbsoluteWeek: number;
    targetAbsoluteWeek: number;
    channels: StreamingCampaignChannelId[];
    homepagePlacement: StreamingHomepagePlacement;
    recommendationObjective: StreamingRecommendationObjective;
    explorationPercent: number;
    artworkVariants: StreamingArtworkVariant[];
    cashCost: number;
    status: 'LOCKED' | 'APPLIED';
    appliedAtAbsoluteWeek: number | null;
    outcome: OwnedStreamingGrowthAttribution | null;
}

export interface OwnedStreamingWeeklyCausalDriver {
    id: string;
    label: string;
    detail: string;
    impact: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

export interface OwnedStreamingWeeklyOperations {
    programWeek: number;
    releaseTitles: string[];
    joinedSubscribers: number;
    cancellations: number;
    reactivations: number;
    subscriptionRevenue: number;
    worldCompetitionTargetSubscribers?: number;
    worldCompetitionEffectiveMonthlyPrice?: number;
    worldCompetitionPlanAllocations?: WorldStreamingPlanAllocation[];
    worldCustomerStartingPaidAccounts?: number;
    worldCustomerEndingPaidAccounts?: number;
    worldCustomerPayingHouseholds?: number;
    worldCustomerUpgrades?: number;
    worldCustomerDowngrades?: number;
    worldCustomerSwitchIns?: number;
    worldCustomerSwitchOuts?: number;
    worldCustomerExternalSharedHouseholds?: number;
    worldCustomerSharedActiveViewers?: number;
    worldCustomerPiracyReach?: number;
    worldCustomerAccessLoadAccounts?: number;
    worldCustomerMonthlySubscriptionRevenue?: number;
    worldCustomerPlanAllocations?: WorldStreamingCustomerPlanSummary[];
    audienceEnforcementCost?: number;
    worldViewingAccounts?: number;
    worldViewingHours?: number;
    worldViewingUnmetDemandAccounts?: number;
    worldViewingAdvertisingRevenue?: number;
    worldViewingTransactionRevenue?: number;
    worldViewingSponsorshipRevenue?: number;
    worldViewingIncrementalRevenue?: number;
    partnerRevenueShareCost: number;
    infrastructureCost: number;
    leadershipCost: number;
    financingCost: number;
    weeklyPlanCost: number;
    growthPlanCost?: number;
    rightsComplianceCost?: number;
    marketPolicyCost?: number;
    marketOperatingCost?: number;
    technologyCampusCost?: number;
    productSuiteCost?: number;
    productRevenue?: number;
    productPeakLoadPercent?: number;
    governanceCost?: number;
    competitiveOperationsCost?: number;
    acquisitionIntegrationCost?: number;
    crisisRecoveryCost?: number;
    totalCashCost: number;
    netCashContribution: number;
    contentAmortization: number;
    accountingContribution: number;
    peakConcurrentStreams: number;
    capacityUtilizationPercent: number;
    playbackSuccessRate: number;
    appliedDecisionId: string | null;
    appliedGrowthActionId?: string | null;
    headline: string;
    summary: string;
    nextWeekHook: string;
    causalDrivers: OwnedStreamingWeeklyCausalDriver[];
    titlePerformance?: OwnedStreamingTitleWeekPerformance[];
}

export interface OwnedStreamingTitleDiscoveryMix {
    homepagePercent: number;
    recommendationsPercent: number;
    searchPercent: number;
    directPercent: number;
    marketingPercent?: number;
    externalBuzzPercent?: number;
}

export interface OwnedStreamingTitleWeekPerformance {
    id: string;
    projectId: string;
    title: string;
    source: StreamingSlateEntrySource;
    projectType: ProjectType;
    genre: string;
    absoluteWeek: number;
    programWeek: number;
    weeksAvailable: number;
    viewingAccounts: number;
    estimatedViewers?: number;
    starts?: number;
    hoursViewed: number;
    completionRate: number;
    repeatViewingRate: number;
    abandonmentRate?: number;
    paidViewingAccounts?: number;
    sharedViewingAccounts?: number;
    piracyViewingAccounts?: number;
    topCountryId?: string | null;
    acquisitionAttributedAccounts?: number;
    retentionAttributedAccounts?: number;
    satisfactionScore: number;
    discoveryMix: OwnedStreamingTitleDiscoveryMix;
    attributedSubscriptionRevenue: number;
    advertisingRevenue?: number;
    premiumRevenue?: number;
    rentalRevenue?: number;
    purchaseRevenue?: number;
    sponsorshipRevenue?: number;
    incrementalRevenue?: number;
    allocatedCashCost: number;
    allocatedContentAmortization: number;
    cashContribution: number;
    accountingContribution: number;
    playbackSuccessRate: number;
}

export interface OwnedStreamingWeeklySnapshot extends OwnedStreamingPlatformMetrics {
    id: string;
    absoluteWeek: number;
    causeMarkers: string[];
    operations?: OwnedStreamingWeeklyOperations;
}

export type StreamingCycleReviewKind = 'FOUR_WEEK_BEAT' | 'TWELVE_WEEK_REVIEW';
export type StreamingStrategicIdentity =
    | 'AUDIENCE_HUNTER'
    | 'RETENTION_HOUSE'
    | 'RELIABLE_OPERATOR'
    | 'EVENT_DESTINATION'
    | 'CASH_COMPOUNDER'
    | 'BALANCED_SERVICE'
    | 'FRAGILE_MOMENTUM';
export type StreamingCyclePerformanceTier = 'BREAKOUT' | 'GROWING' | 'STEADY' | 'UNDER_PRESSURE';
export type StreamingTechnicalVerdict = 'RESILIENT' | 'HEALTHY' | 'WATCH_LOAD' | 'AT_RISK';
export type StreamingRivalPressure = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OwnedStreamingRivalMovement {
    platformId: PlatformId;
    platformName: string;
    pressure: StreamingRivalPressure;
    signal: string;
}

export interface OwnedStreamingCycleReview {
    id: string;
    idempotencyKey: string;
    ledgerFactId: string;
    kind: StreamingCycleReviewKind;
    cycleNumber: number;
    startAbsoluteWeek: number;
    endAbsoluteWeek: number;
    weeksIncluded: number;
    strategicIdentity: StreamingStrategicIdentity;
    performanceTier: StreamingCyclePerformanceTier;
    subscriberStart: number;
    subscriberEnd: number;
    subscriberNetMovement: number;
    averageChurnRate: number;
    averageEngagementRate: number;
    averagePlaybackSuccessRate: number;
    peakCapacityUtilizationPercent: number;
    totalSubscriptionRevenue: number;
    totalCashContribution: number;
    totalAccountingContribution: number;
    technicalVerdict: StreamingTechnicalVerdict;
    rivalMovement: OwnedStreamingRivalMovement;
    hits: string[];
    misses: string[];
    headline: string;
    boardVerdict: string;
    nextMandate: string;
    acknowledgedAtAbsoluteWeek: number | null;
}

export type StreamingLegacyIdentity =
    | 'AUDIENCE_ARCHITECT'
    | 'ORIGINALS_TITAN'
    | 'TECHNOLOGY_PIONEER'
    | 'GLOBAL_BRIDGE'
    | 'TRUSTED_STEWARD'
    | 'CORPORATE_STRATEGIST'
    | 'COMEBACK_BUILDER'
    | 'BALANCED_EMPIRE';

export type StreamingEraMandate =
    | 'BALANCED'
    | 'AUDIENCE_GROWTH'
    | 'ORIGINALS_PRESTIGE'
    | 'TECHNOLOGY_LEADERSHIP'
    | 'GLOBAL_EXPANSION'
    | 'TRUST_AND_RESILIENCE'
    | 'CASH_DISCIPLINE';

export type StreamingFounderOfficeRole =
    | 'FOUNDER_CEO'
    | 'EXECUTIVE_CHAIR'
    | 'FOUNDER_EMERITUS';

export interface OwnedStreamingSuccessionPlan {
    id: string;
    candidateType: 'EXECUTIVE' | 'FAMILY_HEIR';
    candidateId: string;
    candidateName: string;
    readinessScore: number;
    selectedAtAbsoluteWeek: number;
    mandate: StreamingEraMandate;
    status: 'DESIGNATED' | 'TRANSITIONED';
}

export interface OwnedStreamingCompanyEra {
    id: string;
    eraNumber: number;
    title: string;
    leaderName: string;
    leaderType: 'FOUNDER' | 'EXECUTIVE' | 'FAMILY_HEIR';
    mandate: StreamingEraMandate;
    legacyIdentity: StreamingLegacyIdentity;
    startedAtAbsoluteWeek: number;
    endedAtAbsoluteWeek: number;
    closingReason: 'FOUNDER_TRANSITION' | 'GENERATION_HANDOFF' | 'NEW_MANDATE';
    subscriberStart: number;
    subscriberEnd: number;
    treasuryEnd: number;
    globalPrestigeEnd: number;
    publicTrustEnd: number;
    highlightFactIds: string[];
}

export interface OwnedStreamingLegacyMontageChapter {
    id: string;
    title: string;
    caption: string;
    absoluteWeek: number;
    factId: string;
}

export interface OwnedStreamingLegacyMontage {
    id: string;
    idempotencyKey: string;
    eraNumber: number;
    createdAtAbsoluteWeek: number;
    identity: StreamingLegacyIdentity;
    title: string;
    chapters: OwnedStreamingLegacyMontageChapter[];
}

export interface OwnedStreamingLegacyState {
    founderOfficeRole: StreamingFounderOfficeRole;
    currentEraNumber: number;
    currentEraStartedAtAbsoluteWeek: number;
    currentMandate: StreamingEraMandate;
    successionPlan: OwnedStreamingSuccessionPlan | null;
    closedEras: OwnedStreamingCompanyEra[];
    montages: OwnedStreamingLegacyMontage[];
    endlessMode: boolean;
    transitionCount: number;
}

export type OwnedStreamingLedgerEventType =
    | 'FOUNDATION_CREATED'
    | 'FOUNDER_CAPITAL_CONTRIBUTED'
    | 'LOAN_DRAWN'
    | 'LOAN_REPAID'
    | 'EQUITY_ISSUED'
    | 'EXECUTIVE_APPOINTED'
    | 'EXECUTIVE_DEPARTED'
    | 'EXECUTIVE_DEVELOPMENT_STARTED'
    | 'EXECUTIVE_DEVELOPMENT_COMPLETED'
    | 'DELEGATION_MANDATE_UPDATED'
    | 'BOARD_DIRECTOR_APPOINTED'
    | 'BOARD_VOTE_RESOLVED'
    | 'CELEBRITY_INVESTMENT_ACCEPTED'
    | 'RIVAL_MOVE_COMMITTED'
    | 'RIVAL_MOVE_RESPONDED'
    | 'REGIONAL_LAUNCH_STARTED'
    | 'REGIONAL_LAUNCH_COMPLETED'
    | 'MARKET_CLEARANCE_STARTED'
    | 'MARKET_CLEARANCE_UPDATED'
    | 'MARKET_CLEARANCE_COMPLETED'
    | 'MARKET_REQUIREMENT_RESOLVED'
    | 'MARKET_POLICY_CHANGED'
    | 'SERVICE_CONFIGURATION_COMMITTED'
    | 'MARKET_SHARE_COMMITTED'
    | 'STREAMING_AWARDS_RESOLVED'
    | 'ACQUISITION_SCOUTED'
    | 'ACQUISITION_VALUED'
    | 'ACQUISITION_OFFER_SUBMITTED'
    | 'ACQUISITION_DILIGENCE_COMPLETED'
    | 'ACQUISITION_COUNTERBID_RESOLVED'
    | 'ACQUISITION_APPROVAL_RESOLVED'
    | 'ACQUISITION_REGULATORY_RESOLVED'
    | 'ACQUISITION_FINANCING_LOCKED'
    | 'STREAMING_PLATFORM_ACQUIRED'
    | 'ACQUISITION_INTEGRATION_COMPLETED'
    | 'IPO_ROADSHOW_STARTED'
    | 'IPO_LISTED'
    | 'PUBLIC_GUIDANCE_ISSUED'
    | 'PUBLIC_EARNINGS_REPORTED'
    | 'SHAREHOLDER_VOTE_RESOLVED'
    | 'ACTIVIST_CAMPAIGN_RESOLVED'
    | 'HOSTILE_TAKEOVER_OPENED'
    | 'HOSTILE_TAKEOVER_DEFENDED'
    | 'CRISIS_DETECTED'
    | 'CRISIS_RESPONSE_LOCKED'
    | 'CRISIS_RECOVERED'
    | 'INFRASTRUCTURE_INCIDENT_DETECTED'
    | 'INFRASTRUCTURE_RESPONSE_LOCKED'
    | 'INFRASTRUCTURE_INCIDENT_RECOVERED'
    | 'INFRASTRUCTURE_MAINTENANCE_COMPLETED'
    | 'INFRASTRUCTURE_OPERATIONS_POLICY_UPDATED'
    | 'TRUST_INITIATIVE_COMPLETED'
    | 'SHADOW_OPERATION_COMMITTED'
    | 'SHADOW_EVIDENCE_RESOLVED'
    | 'REGULATORY_CASE_OPENED'
    | 'REGULATORY_CASE_RESOLVED'
    | 'WHISTLEBLOWER_REPORT_OPENED'
    | 'WHISTLEBLOWER_REPORT_RESOLVED'
    | 'SUCCESSION_PLAN_UPDATED'
    | 'SUCCESSOR_APPOINTED'
    | 'FOUNDER_ROLE_CHANGED'
    | 'COMPANY_ERA_CLOSED'
    | 'COMPANY_ERA_OPENED'
    | 'LEGACY_FILM_COMMITTED'
    | 'GENERATION_HANDOFF'
    | 'INFRASTRUCTURE_COMMITTED'
    | 'TECHNOLOGY_PROJECT_STARTED'
    | 'TECHNOLOGY_PROJECT_COMPLETED'
    | 'CAMPUS_PROJECT_STARTED'
    | 'CAMPUS_STAGE_COMPLETED'
    | 'CAMPUS_OPENED'
    | 'PRODUCT_DEVELOPMENT_STARTED'
    | 'PRODUCT_LAUNCHED'
    | 'PRODUCT_STATUS_CHANGED'
    | 'CATALOG_IMPORTED'
    | 'LICENSE_NEGOTIATION_UPDATED'
    | 'LICENSE_SIGNED'
    | 'ORIGINAL_COMMISSIONED'
    | 'ORIGINAL_GREENLIT'
    | 'ORIGINAL_LOCALIZATION_COMMITTED'
    | 'TITLE_LOCALIZATION_COMMITTED'
    | 'TITLE_LOCALIZATION_READY'
    | 'ORIGINAL_RELEASE_AUTHORIZED'
    | 'ORIGINAL_LIFECYCLE_DECIDED'
    | 'LAUNCH_SLATE_PROGRAMMED'
    | 'LAUNCH_COMMITTED'
    | 'LIFECYCLE_CHANGED'
    | 'WEEKLY_PLAN_SELECTED'
    | 'GROWTH_ACTION_LOCKED'
    | 'GROWTH_ACTION_APPLIED'
    | 'WEEK_CHECKPOINT'
    | 'METRICS_COMMITTED'
    | 'QUARTER_BEAT_COMMITTED'
    | 'SEASON_REVIEW_COMMITTED'
    | 'CINEMATIC_QUEUED'
    | 'MILESTONE_REACHED'
    | 'SYSTEM_REPAIR';

export interface OwnedStreamingLedgerEntry {
    id: string;
    idempotencyKey: string;
    absoluteWeek: number;
    type: OwnedStreamingLedgerEventType;
    summary: string;
    source: 'MIGRATION' | 'FOUNDING' | 'WEEK_PROCESSOR' | 'PLAYER_ACTION' | 'SYSTEM';
    metadata?: Record<string, string | number | boolean | null>;
}

export type OwnedStreamingCinematicType =
    | 'FOUNDING_KEYNOTE'
    | 'LAUNCH_NIGHT'
    | 'BREAKOUT_HIT'
    | 'PLATFORM_OUTAGE'
    | 'BOARD_REVIEW'
    | 'CELEBRITY_INVESTOR_REVEAL'
    | 'PLATFORM_WAR_DECLARATION'
    | 'MARKET_SHARE_BREAKTHROUGH'
    | 'GLOBAL_DOMINANCE'
    | 'STREAMING_AWARDS_CEREMONY'
    | 'ACQUISITION_SIGNING'
    | 'IPO_LISTING'
    | 'HOSTILE_TAKEOVER_DEFENCE'
    | 'CRISIS_EXPOSURE'
    | 'WHISTLEBLOWER_REVEAL'
    | 'REGULATORY_HEARING'
    | 'SHADOW_OPERATION'
    | 'LEGACY_MONTAGE'
    | 'SUCCESSION_CEREMONY'
    | 'NEW_ERA_KEYNOTE'
    | 'FIRST_ORIGINAL_ANNOUNCEMENT'
    | 'FACILITY_OPENING'
    | 'SERVER_HALL_EVOLUTION'
    | 'GIGA_CAMPUS_CONSTRUCTION'
    | 'OPENING_NIGHT_CONTROL_ROOM'
    | 'INFRASTRUCTURE_RECOVERY'
    | 'PATENT_ANNOUNCEMENT'
    | 'RIVAL_ESPIONAGE_STORY'
    | 'INFRASTRUCTURE_AWARDS'
    | 'GLOBAL_RELIABILITY_MILESTONE'
    | 'MILESTONE';

export interface OwnedStreamingCinematicEvent {
    id: string;
    idempotencyKey: string;
    type: OwnedStreamingCinematicType;
    status: 'QUEUED' | 'VIEWED' | 'DISMISSED';
    priority: 'STANDARD' | 'IMPORTANT' | 'MAJOR';
    availableAtAbsoluteWeek: number;
    title: string;
    factIds: string[];
}

export interface OwnedStreamingPlatformState {
    schemaVersion: number;
    lifecycle: OwnedStreamingPlatformLifecycle;
    identity: OwnedStreamingPlatformIdentity | null;
    foundingDraft: OwnedStreamingFoundingDraft | null;
    foundingProfile: OwnedStreamingFoundingProfile | null;
    leadership: OwnedStreamingLeadershipState;
    governance: OwnedStreamingGovernanceState;
    competitiveWorld: OwnedStreamingCompetitiveWorldState;
    corporateDevelopment: OwnedStreamingCorporateDevelopmentState;
    publicCompany: OwnedStreamingPublicCompanyState;
    crisisSecurity: OwnedStreamingCrisisSecurityState;
    legacy: OwnedStreamingLegacyState;
    finance: OwnedStreamingFinanceState;
    launchProgram: OwnedStreamingLaunchProgramState;
    marketOperations: OwnedStreamingMarketOperation[];
    serviceConfiguration: OwnedStreamingServiceConfiguration;
    capabilities: OwnedStreamingCapabilityPortfolio;
    localizationOperations: OwnedStreamingLocalizationOperationsState;
    costCommitments: OwnedStreamingCostCommitment[];
    hqOnboarding: OwnedStreamingHqOnboardingState;
    infrastructureSetupDraft: OwnedStreamingInfrastructureSetupDraft | null;
    infrastructureSetup: OwnedStreamingInfrastructureSetup | null;
    technologyProjects: OwnedStreamingTechnologyProject[];
    researchPrograms: OwnedStreamingResearchProgram[];
    campusProjects: OwnedStreamingCampusProject[];
    productLines: OwnedStreamingProductLine[];
    catalogSetupDraft: OwnedStreamingCatalogSetupDraft | null;
    contentMarketDraft?: { tab: 'ALL' | 'MOVIE' | 'SERIES' | 'COLLECTIONS' | 'OWNED' | 'OFFERS' | 'AUCTIONS' | 'UPCOMING'; search: string; selectedId: string | null; ownedIds: string[] } | null;
    buyerAuctionSessions: StreamingBuyerAuctionSession[];
    upcomingRightsSales: StreamingUpcomingRightsSale[];
    starterCatalog: OwnedStreamingStarterCatalog | null;
    catalogLicenses: OwnedStreamingCatalogLicense[];
    rightsNegotiations: OwnedStreamingRightsNegotiation[];
    sublicenseDeals: OwnedStreamingSublicenseDeal[];
    rightsObligations: OwnedStreamingRightsObligation[];
    originalCommissionDraft: OwnedStreamingOriginalCommissionDraft | null;
    originalCommissions: OwnedStreamingOriginalCommission[];
    launchSlateDraft: OwnedStreamingLaunchSlate | null;
    launchSlate: OwnedStreamingLaunchSlate | null;
    launchCommit: OwnedStreamingLaunchCommit | null;
    subscriptionPrices: Record<StreamingSubscriptionTierId, number>;
    founderOwnershipPercent: number;
    treasuryCash: number;
    debtPrincipal: number;
    infrastructureStrategy: StreamingInfrastructureStrategy;
    capacity: {
        baselineConcurrentStreams: number;
        burstConcurrentStreams: number;
    };
    technologyLevels: Record<StreamingTechnologyBranch, number>;
    metrics: OwnedStreamingPlatformMetrics;
    audienceAccessPolicy: WorldStreamingCustomerAccessPolicy;
    catalogProjectIds: string[];
    simulationSeed: string;
    lastProcessedAbsoluteWeek: number | null;
    processedWeekKeys: string[];
    weeklyDecisions: OwnedStreamingWeeklyDecision[];
    growthActions: OwnedStreamingGrowthAction[];
    lastAcknowledgedWeeklyReportAbsoluteWeek: number | null;
    weeklyHistory: OwnedStreamingWeeklySnapshot[];
    cycleReviews: OwnedStreamingCycleReview[];
    eventLedger: OwnedStreamingLedgerEntry[];
    cinematicQueue: OwnedStreamingCinematicEvent[];
    milestoneKeys: string[];
}

export const OWNED_STREAMING_PLATFORM_SCHEMA_VERSION = 25;

export const createInitialOwnedStreamingPlatformState = (playerId = ''): OwnedStreamingPlatformState => ({
    schemaVersion: OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    lifecycle: 'LOCKED',
    identity: null,
    foundingDraft: null,
    foundingProfile: null,
    leadership: {
        currentCeo: {
            holderType: 'FOUNDER',
            executiveId: null,
            sinceAbsoluteWeek: 0,
        },
        appointments: [],
        developmentPrograms: [],
        delegation: {
            maximumRightsBid: 50_000_000,
            minimumCapacityHeadroomPercent: 20,
            weeklyCampaignLimit: 10_000_000,
            renewalMinimumMarginPercent: 15,
            incidentPolicy: 'SERVICE_FIRST',
            updatedAtAbsoluteWeek: 0,
        },
    },
    governance: {
        boardConfidence: 72,
        directors: [],
        motions: [],
        celebrityInvestors: [],
    },
    competitiveWorld: {
        initializedAtAbsoluteWeek: null,
        lastSimulatedAbsoluteWeek: null,
        rivalryHeat: 0,
        globalPrestige: 0,
        rivals: [],
        moves: [],
        weeklyRivalHistory: [],
        regionalLaunches: [],
        marketShareHistory: [],
        awardSeasons: [],
    },
    corporateDevelopment: {
        acquisitionCases: [],
        integrations: [],
        acquiredPlatformIds: [],
    },
    publicCompany: {
        lifecycle: 'PRIVATE',
        ipoPlan: null,
        ipoJourney: null,
        listing: null,
        quoteHistory: [],
        guidance: [],
        earnings: [],
        shareholderVotes: [],
        activistCampaigns: [],
        hostileTakeovers: [],
    },
    crisisSecurity: {
        publicTrust: 72,
        regulatoryScrutiny: 0,
        employeeLoyalty: 75,
        evidenceTrail: 0,
        securityPressure: 15,
        lastEvaluatedAbsoluteWeek: null,
        crises: [],
        shadowOperations: [],
        trustInitiatives: [],
        regulatoryCases: [],
        whistleblowerReports: [],
        infrastructureOperations: {
            maintenanceCadence: 'BALANCED',
            insuranceTier: 'NONE',
            lastProcessedAbsoluteWeek: null,
            incidents: [],
            totalMaintenanceSpend: 0,
            totalCompensationPaid: 0,
            totalInsuranceRecovered: 0,
            assistedResponseCount: 0,
            reliabilityStreakWeeks: 0,
            lastProgressionTier: 'RENTED_CABINET',
            performanceHistory: [],
            awards: [],
            orchestratedFactIds: [],
        },
    },
    legacy: {
        founderOfficeRole: 'FOUNDER_CEO',
        currentEraNumber: 1,
        currentEraStartedAtAbsoluteWeek: 0,
        currentMandate: 'BALANCED',
        successionPlan: null,
        closedEras: [],
        montages: [],
        endlessMode: false,
        transitionCount: 0,
    },
    finance: {
        capitalActions: [],
        loans: [],
        equityHolders: [],
    },
    launchProgram: {
        status: 'NOT_STARTED',
        startedAtAbsoluteWeek: null,
        configurationRevision: 0,
        serviceConfigurationCommittedAtAbsoluteWeek: null,
        lastRehearsalSignature: null,
        completedAtAbsoluteWeek: null,
        defineCurrentStep: 'FUND',
        buildCurrentStep: 'BLUEPRINT',
        lastBlueprintSignature: null,
        blueprintSavedAtAbsoluteWeek: null,
    },
    marketOperations: [],
    serviceConfiguration: {
        source: 'UNCONFIGURED',
        soundIdentKey: null,
        identPackageId: null,
        identDurationSeconds: 0,
        customIdentAudio: null,
        storefrontLayoutId: null,
        pricingApproach: null,
        pricing: {
            streams: ['subs'],
            plans: [
                { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: [], ads: false },
                { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: [], ads: false },
                { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: [], ads: false },
            ],
            annualDiscount: 15,
            introOffer: 0,
            ads: { minutesPerHour: 4, cpm: 22 },
            rentals: { rent: 5.99, buy: 19.99, windowWeeks: 6 },
            premium: { price: 29.99 },
            daypass: { price: 7.99 },
            sponsor: { perTitle: 4_000_000, titles: 0 },
            metered: { perHour: 1 },
            patron: { monthly: 10 },
        },
        committedCost: 0,
        committedAtAbsoluteWeek: null,
        revision: 0,
    },
    capabilities: {
        installed: [],
        legacyLevelFloors: {
            DELIVERY_CAPACITY: 0,
            PLAYBACK_QUALITY: 0,
            RELIABILITY: 0,
            DATA_RECOMMENDATIONS: 0,
            SECURITY: 0,
            CONTENT_OPERATIONS: 0,
            ADVERTISING_COMMERCE: 0,
            PRODUCT_EXPERIENCE: 0,
        },
    },
    localizationOperations: {
        providers: [],
        facilities: [],
        jobs: [],
        titleLanguageAssets: [],
        legacyPackageGrants: [],
    },
    costCommitments: [],
    hqOnboarding: {
        status: 'NOT_STARTED',
        currentStep: 0,
        visitedSections: [],
        startedAtAbsoluteWeek: null,
        completedAtAbsoluteWeek: null,
    },
    infrastructureSetupDraft: null,
    infrastructureSetup: null,
    technologyProjects: [],
    researchPrograms: [],
    campusProjects: [],
    productLines: [],
    catalogSetupDraft: null,
    buyerAuctionSessions: [],
    upcomingRightsSales: [],
    starterCatalog: null,
    catalogLicenses: [],
    rightsNegotiations: [],
    sublicenseDeals: [],
    rightsObligations: [],
    originalCommissionDraft: null,
    originalCommissions: [],
    launchSlateDraft: null,
    launchSlate: null,
    launchCommit: null,
    subscriptionPrices: {
        BASIC: 7.99,
        PREMIUM: 13.99,
        FAMILY: 18.99,
    },
    founderOwnershipPercent: 100,
    treasuryCash: 0,
    debtPrincipal: 0,
    infrastructureStrategy: 'UNDECIDED',
    capacity: {
        baselineConcurrentStreams: 0,
        burstConcurrentStreams: 0,
    },
    technologyLevels: {
        DELIVERY_CAPACITY: 0,
        PLAYBACK_QUALITY: 0,
        RELIABILITY: 0,
        DATA_RECOMMENDATIONS: 0,
        SECURITY: 0,
        CONTENT_OPERATIONS: 0,
        ADVERTISING_COMMERCE: 0,
        PRODUCT_EXPERIENCE: 0,
    },
    metrics: {
        subscribers: 0,
        netSubscriberMovement: 0,
        churnRate: 0,
        engagementRate: 0,
        averageRevenuePerUser: 0,
        cashRunwayWeeks: 0,
        technologyHealth: 0,
    },
    audienceAccessPolicy: {
        sharingPosture: 'BALANCED',
        enforcementInvestment: 'STANDARD',
        source: 'LEADERSHIP_DEFAULT',
        updatedAtAbsoluteWeek: 0,
    },
    catalogProjectIds: [],
    simulationSeed: playerId ? `owned-streaming:${playerId}` : '',
    lastProcessedAbsoluteWeek: null,
    processedWeekKeys: [],
    weeklyDecisions: [],
    growthActions: [],
    lastAcknowledgedWeeklyReportAbsoluteWeek: null,
    weeklyHistory: [],
    cycleReviews: [],
    eventLedger: [],
    cinematicQueue: [],
    milestoneKeys: [],
});

export interface FuturePotential {
    sequelChance: number;
    franchiseChance: number;
    rebootChance: number;
    renewalChance: number;
    isFranchiseStarter: boolean;
    isSequelGreenlit: boolean;
    isRenewed: boolean;
    seriesStatus: SeriesStatus;
    playerReturnStatus?: PlayerReturnStatus;
    returnStatusNote?: string;
}

export type TheatricalExtensionReason = 'STRONG_HOLD' | 'BREAKOUT_DEMAND' | 'SLEEPER_MOMENTUM';

export interface TheatricalExtensionDecision {
    reviewWeek: number;
    addedWeeks: number;
    reason: TheatricalExtensionReason;
    weeklyGross: number;
    holdPercent: number;
    marketDemand: number;
}

export interface ActiveRelease {
    id: string;
    name: string;
    type: ProjectType;
    roleType: RoleType;
    projectDetails: ProjectDetails;
    distributionPhase: 'THEATRICAL' | 'STREAMING_BIDDING' | 'STREAMING';
    weekNum: number;
    weeklyGross: number[];
    totalGross: number;
    weeklyStudioReceipts?: number[];
    totalStudioReceipts?: number;
    weeklyExhibitorReceipts?: number[];
    totalExhibitorReceipts?: number;
    weeklyDistributionBreakdowns?: TheatricalDistributionBreakdown[];
    budget: number;
    status: 'RUNNING' | 'BLOCKBUSTER_TRACK' | 'FLOP_WARNING' | 'FINISHED';
    imdbRating?: number;
    productionPerformance: number;
    maxTheatricalWeeks?: number;
    baseTheatricalWeeks?: number;
    theatricalExtensionWeeks?: number;
    theatricalExtensionHistory?: TheatricalExtensionDecision[];
    weeksInTheaters?: number;
    streaming?: StreamingState;
    /** Canonical per-contract runs. `streaming` remains the aggregate legacy projection. */
    streamingRuns?: StreamingPlatformRun[];
    /** Canonical rights record shared with the buyer platform. */
    streamingContractId?: string;
    streamingRevenue?: number;
    weeklyStreamingBreakdowns?: StreamingDistributionBreakdown[];
    soundtrackRevenue?: number;
    weeklySoundtrackRevenue?: number[];
    soundtrackRevenueBreakdown?: ProjectSoundtrackRevenueBreakdown;
    weeklySoundtrackBreakdowns?: ProjectSoundtrackRevenueBreakdown[];
    investorPlan?: ProjectInvestorPlan;
    investorPayouts?: ProjectInvestorPayoutSummary;
    audienceReception?: AudienceReception;
    studioRoyaltyPercentage?: number;
    // Keep contract cash separate from later view-based royalties. Older saves may only have streamingRevenue.
    streamingUpfrontFee?: number;
    streamingRoyaltyRevenue?: number;
    streamingFundingAmount?: number;
    platformProductionFunding?: number;
    studioCashAtRisk?: number;
    productionFundApplied?: number;
    bids?: { platformId: PlatformId, upfront: number, royalty: number, duration: number, fundingAmount?: number }[];
    sequelDecisionWeek?: number;
    sequelDecisionMade?: boolean;
    futurePotential?: FuturePotential;
    promotionalBuzz?: number;
    royaltyPercentage?: number;
    previousBestBidValue?: number;
    generatedNewsKeys?: string[];
    releaseWeek?: number;
    releaseYear?: number;
    releasedAtAbsoluteWeek?: number;
}

export interface Award {
    id: string;
    name: string;
    category: string;
    year: number;
    outcome: 'WON' | 'NOMINATED';
    projectId: string;
    projectName: string;
    type: AwardType;
}

export interface PastProject {
    id: string;
    name: string;
    type: 'ACTING_GIG';
    roleType: RoleType;
    playerCharacterProfile?: CharacterIdentityProfile;
    playerRolePerformance?: number;
    year: number;
    earnings: number;
    rating: number;
    reception: string;
    projectQuality: number;
    imdbRating?: number;
    boxOfficeResult: string;
    outcomeTier: OutcomeTier;
    subtype: ProjectSubtype;
    futurePotential: FuturePotential;
    studioId: StudioId;
    streamingPlatform?: PlatformId;
    streamingContractId?: string;
    /** Final per-contract platform runs for shared or exclusive streaming releases. */
    streamingRuns?: StreamingPlatformRun[];
    totalViews?: number;
    weeklyViews?: number[];
    streamingRevenue?: number;
    platformProductionFunding?: number;
    studioCashAtRisk?: number;
    productionFundApplied?: number;
    weeklyStreamingBreakdowns?: StreamingDistributionBreakdown[];
    soundtrackRevenue?: number;
    weeklySoundtrackRevenue?: number[];
    soundtrackRevenueBreakdown?: ProjectSoundtrackRevenueBreakdown;
    weeklySoundtrackBreakdowns?: ProjectSoundtrackRevenueBreakdown[];
    investorPlan?: ProjectInvestorPlan;
    investorPayouts?: ProjectInvestorPayoutSummary;
    castList?: CastMember[];
    backgroundCastingPlan?: BackgroundCastingPlan;
    reviews?: Review[];
    audienceReception?: AudienceReception;
    episodeRatings?: SeasonEpisodeRatings[];
    campaignRealitySnapshot?: CampaignRealitySnapshot;
    campaignPositioning?: CampaignPositioning;
    campaignTimeline?: CampaignTimeline;
    campaignFitSnapshot?: CampaignFitSnapshot;
    campaignForecastSnapshot?: CampaignForecastSnapshot;
    marketingChannelAllocations?: MarketingChannelAllocations;
    reservedMarketingBudget?: number;
    marketingBudgetSpent?: number;
    marketingBudgetRemaining?: number;
    returnedMarketingBudget?: number;
    totalCampaignSpend?: number;
    budget: number;
    gross: number;
    weeklyGross?: number[];
    weeklyStudioReceipts?: number[];
    totalStudioReceipts?: number;
    weeklyExhibitorReceipts?: number[];
    totalExhibitorReceipts?: number;
    weeklyDistributionBreakdowns?: TheatricalDistributionBreakdown[];
    releaseRegionIds?: BoxOfficeRegionId[];
    releaseChainSelections?: Partial<Record<BoxOfficeRegionId, CinemaChainId[]>>;
    boxOfficeArchiveVersion?: number;
    baseTheatricalWeeks?: number;
    theatricalExtensionWeeks?: number;
    theatricalExtensionHistory?: TheatricalExtensionDecision[];
    genre: Genre;
    format?: ProjectFormat;
    subjectName?: string;
    subjectType?: ScriptSubjectType;
    description?: string;
    projectType: ProjectType;
    royaltyPercentage?: number;
    awards?: Award[];
    franchiseId?: string;
    universeId?: UniverseId;
    universeSagaName?: string;
    universePhaseName?: string;
    installmentNumber?: number;
    directorId?: string;
    releaseWeek?: number;
    releaseYear?: number;
    releasedAtAbsoluteWeek?: number;
    customPoster?: CustomPoster;
    /** Developer-only archive fixture. It renders in Box Office but must not affect the player's career or awards. */
    isQaArchive?: boolean;
    musicPlan?: ProjectMusicPlan;
    sourceScriptId?: string;
    isOriginal?: boolean;
}

export interface Commitment {
    id: string;
    name: string;
    nameKey?: string;
    type: 'ACTING_GIG' | 'JOB' | 'COURSE' | 'GYM' | 'DIRECTOR_GIG' | 'WRITER_GIG';
    roleType?: RoleType;
    energyCost: number;
    income: number;
    lumpSum?: number;
    weeklyCost?: number;
    upfrontCost?: number;
    payoutType: 'WEEKLY' | 'LUMPSUM';
    projectDetails?: ProjectDetails;
    projectPhase?: 'AUDITION' | 'PLANNING' | 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION' | 'SCHEDULED' | 'AWAITING_RELEASE';
    phaseWeeksLeft?: number;
    totalPhaseDuration?: number;
    productionCalendar?: ProductionCalendar;
    auditionPerformance?: number;
    productionPerformance?: number;
    promotionalBuzz?: number;
    lastPressWeek?: number;
    lastPressAbsolute?: number;
    weeksCompleted?: number;
    totalDuration?: number;
    skillGains?: Partial<ActorSkills>;
    statGains?: Partial<Stats>;
    writerGains?: Partial<WriterStats>;
    directorGains?: Partial<DirectorStats>;
    agentCommission?: number;
    royaltyPercentage?: number;
    durationLeft?: number;
    previousBestBidValue?: number;
}

export interface ContractFilm {
    title: string;
    role: RoleType;
    type: ProjectSubtype;
    weeksOffset: number;
}

export interface UniverseContract {
    universeId: UniverseId;
    characterName: string;
    films: ContractFilm[];
    salaryTotal: number;
    fanTrust: number;
    startWeek: number;
}

export interface AuditionOpportunity {
    id: string;
    roleType: RoleType;
    projectName: string;
    genre: Genre;
    config: { label: string, difficulty: number, energyCost: number, baseIncome: number, expGain: number };
    project: ProjectDetails;
    estimatedIncome: number;
    source: 'CASTING_APP' | 'AGENT' | 'DIRECTOR' | 'DIRECT';
    royaltyPercentage?: number;
    universeContract?: UniverseContract;
    /** The authored character offer, separate from billing size such as LEAD. */
    characterProfile?: CharacterIdentityProfile;
    characterName?: string;
    /** How the authored character fits this script, separate from the actor's career/typecasting fit. */
    characterStoryFit?: CharacterStoryFit;
    roleFit?: {
        score: number;
        label: 'NATURAL_FIT' | 'STRONG_FIT' | 'STRETCH' | 'AGAINST_TYPE';
        reasons: string[];
    };
    /** Why the market produced this role, derived from recent work rather than stored as permanent state. */
    industryContext?: {
        kind: 'OPEN' | 'MOMENTUM' | 'TYPECAST' | 'RANGE';
        marketRole?: CharacterStoryRole;
        originalRole: CharacterStoryRole;
        demand: number;
        typecastingPressure: number;
        label: string;
        reason: string;
    };
}

export interface NegotiationData {
    opportunity: AuditionOpportunity;
    basePay: number;
    currentOffer: number;
    roundsUsed: number;
    maxRounds: number;
    status: 'PENDING' | 'ACCEPTED' | 'FAILED';
    studioPatience: number;
    hasRoyaltyOption: boolean;
    royaltyPercentage?: number;
}

export interface SponsorshipOffer {
    id: string;
    brandName: string;
    category: SponsorshipCategory;
    weeklyPay: number;
    durationWeeks: number;
    requirements: {
        type: SponsorshipActionType;
        energyCost: number;
        totalRequired: number; // Replaced weekly count with Total Required over contract
        progress: number; // Tasks completed so far
    };
    isExclusive: boolean;
    penalty: number;
    description: string;
    expiresIn?: number;
    weeksCompleted?: number;
}

export interface YoutubeCollabOffer {
    id: string;
    creatorId?: string;
    creatorName: string;
    creatorHandle: string;
    creatorAvatar: string;
    conceptTitle: string;
    requiredType: YoutubeVideoType;
    energyCost: number;
    qualityBonus: number;
    bonusViews: number;
    bonusSubscribers: number;
    description: string;
    expiresInWeeks: number;
}

export interface YoutubeBrandDeal {
    id: string;
    brandName: string;
    category: SponsorshipCategory;
    description: string;
    payout: number;
    requiredType: YoutubeVideoType;
    energyCost: number;
    bonusViews: number;
    penalty: number;
    expiresInWeeks: number;
}

export interface YoutubeMusicVideoFeatureOffer {
    id: string;
    artistId: string;
    artistName: string;
    artistHandle: string;
    songTitle: string;
    genre: string;
    description: string;
    appearanceFee: number;
    energyCost: number;
    bonusViews: number;
    followerGain: number;
    fameBoost: number;
    reputationRisk: number;
    expiresInWeeks: number;
}

export interface Festival {
    id: string;
    name: string;
    nameKey?: string;
    weeks: number[]; // Week of the year (1-52)
    prestigeReq: number;
    cost: number;
    description: string;
    descriptionKey?: string;
}

export interface RedCarpetInterview {
    id: string;
    question: string;
    options: {
        text: string;
        style: 'FUNNY' | 'PROFESSIONAL' | 'CONTROVERSIAL';
        impact: number; // Hype impact
    }[];
}

export type ScheduledEventType = 'AWARD_CEREMONY' | 'PREMIERE' | 'PARTY' | 'PRODUCTION_CRISIS' | 'DIRECTOR_DECISION' | 'LIFE_EVENT' | 'LEGAL_HEARING' | 'SCANDAL' | 'UNDERWORLD_OFFER' | 'STOCK_CONTROL';

export type LocalizedTextVars = Record<string, string | number>;

export interface ProductionCrisisImpactResult {
    updatedPlayer: Player;
    updatedProject: Commitment;
    log: string;
    logKey?: string;
    logVars?: LocalizedTextVars;
}

export interface ProductionCrisisOption {
    label: string;
    labelKey?: string;
    textVars?: LocalizedTextVars;
    isGolden?: boolean;
    impact: (player: Player, project: Commitment) => ProductionCrisisImpactResult;
}

export interface ProductionCrisis {
    id: string;
    title: string;
    titleKey?: string;
    description: string;
    descriptionKey?: string;
    textVars?: LocalizedTextVars;
    options: ProductionCrisisOption[];
}

export interface LegalCase {
    id: string;
    title: string;
    description: string;
    weeksRemaining: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    evidence: number; // 0-100, higher is worse for player
}

export interface LifeEventOption {
    id?: string;
    label: string;
    labelKey?: string;
    description?: string;
    descriptionKey?: string;
    textVars?: LocalizedTextVars;
    isGolden?: boolean; // Requires Ad
    previewEffects?: EventImpactSignal[];
    impact?: (player: Player) => LifeEventImpactResult;
}

export interface EventImpactSignal {
    label: string;
    labelKey?: string;
    textVars?: LocalizedTextVars;
    value: string;
    valueKey?: string;
    tone?: 'positive' | 'negative' | 'neutral';
}

export interface LifeEventImpactResult {
    updatedPlayer: Player;
    log: string;
    logKey?: string;
    logVars?: LocalizedTextVars;
    effects?: EventImpactSignal[];
    feedbackDelay?: number;
    feedbackType?: string;
}

export interface LifeEvent {
    id: string;
    type: 'LIFE' | 'POLITICS' | 'CRIME' | 'SCANDAL' | 'LEGAL' | 'NETWORKING' | 'CONFLICT' | 'EARLY_LIFE';
    title: string;
    titleKey?: string;
    description: string;
    descriptionKey?: string;
    textVars?: LocalizedTextVars;
    options: LifeEventOption[];
    image?: string;
    category?: string;
}

export interface LegalCase {
    id: string;
    title: string;
    description: string;
    currentHearing: number;
    totalHearings: number;
    nextHearingWeek: number;
    evidenceStrength: number; // 0-100
    playerDefense: number; // 0-100
    status: 'ACTIVE' | 'WON' | 'LOST' | 'SETTLED';
    history: { hearing: number, choice: string }[];
    caseType?: 'STUDIO_NAME_RIGHTS' | string;
    studioId?: string;
    claimantName?: string;
    protectedStudioName?: string;
    rebrandedStudioName?: string;
    settlementDemand?: number;
    legalFeePerHearing?: number;
    restorationCost?: number;
}

export interface ScheduledEvent {
    id: string;
    week: number;
    type: ScheduledEventType;
    title: string;
    description?: string;
    data?: any;
}

export interface PendingEvent extends ScheduledEvent {}

export interface YoutubeVideo {
    id: string;
    title: string;
    type: YoutubeVideoType;
    thumbnailColor: string;
    thumbnailMediaId?: string;
    views: number;
    likes: number;
    earnings: number;
    weekUploaded: number;
    yearUploaded?: number; // Added to prevent age calculation bugs across years
    isPlayer: boolean;
    authorName: string;
    qualityScore: number;
    uploadPlan?: YoutubeUploadPlan;
    controversyScore?: number;
    trustImpact?: number;
    weeklyHistory: number[];
    comments: string[];
    sourceArtistId?: string;
    sourceArtistName?: string;
    /** C7 player-selected project promoted by this upload. */
    promotedProjectId?: string;
    /** C7 exact-once promotion attribution record. */
    promotionAttributionId?: string;
    songTitle?: string;
    isMusicVideo?: boolean;
    assetContext?: {
        assetId: string;
        assetName: string;
        assetType: 'Property' | 'Vehicle' | 'Clothing';
        label: string;
        qualityBonus: number;
        viewBoost: number;
    };
    /** C4 presentation-only metadata for a saved NPC industry creator video. */
    industryContext?: {
        videoId: string;
        industryEventId: string;
        mediaStoryId: string;
        personalityId: string;
        institutionId?: string;
        format: IndustryMediaYoutubeFormat;
        claimMode: IndustryMediaClaimMode;
        summary: string;
        confirmedFacts: string;
        interpretation?: string;
        creatorSubscribers: number;
        creatorCredibility: number;
        creatorAvatar: string;
        primaryColor: string;
        secondaryColor: string;
        thumbnailLabel: string;
        thumbnailMotif: string;
        outcome: IndustryMediaYoutubeOutcome;
        responseOutcome?: IndustryMediaResponseOutcome;
        mediaClaimId?: string;
    };
}

export interface YoutubeChannel {
    handle: string;
    subscribers: number;
    videos: YoutubeVideo[];
    lifetimeEarnings: number;
    isMonetized: boolean;
    bannerColor: string;
    totalChannelViews: number;
    activeCollabs: YoutubeCollabOffer[];
    activeBrandDeals: YoutubeBrandDeal[];
    audienceTrust: number;
    fanMood: number;
    controversy: number;
    membershipsActive: boolean;
    members: number;
    lastLivestreamWeek: number;
    lastMerchDropWeek: number;
    lastMerchResult?: string;
    lastMerchOutcome?: {
        id: string;
        tier: YoutubeMerchTier;
        result: YoutubeMerchResult;
        grossRevenue: number;
        productionCost: number;
        netProfit: number;
        cashAfter: number;
        week: number;
        year: number;
    };
    creatorIdentity: YoutubeCreatorIdentity;
    lastIdentityChangeWeek: number;
}

export interface NewsItem {
    id: string;
    headline: string;
    subtext?: string;
    category: NewsCategory;
    week: number;
    year: number;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    projectId?: string;
    universeId?: UniverseId;
    /** B7 shared public-world fact reference. */
    industryEventId?: string;
    /** C1 shared media-story reference. */
    mediaStoryId?: string;
    /** C2 recurring media-institution reference. */
    mediaInstitutionId?: string;
    /** C2 recurring journalist or commentator reference. */
    mediaPersonalityId?: string;
    /** C3 public-discussion lineage. */
    mediaDiscussionId?: string;
    /** C3 player-response lineage. */
    mediaResponseId?: string;
    /** C6 rumour/leak/prediction lineage. */
    mediaClaimId?: string;
    /** Saved player-facing publisher name; legacy items continue to infer a source. */
    sourceName?: string;
    /** Saved player-facing journalist or commentator byline. */
    byline?: string;
    companyId?: string;
}

export interface Message {
    id: string;
    sender: string;
    subject: string;
    text: string;
    type: 'OFFER_ROLE' | 'OFFER_AUDITION' | 'OFFER_SPONSORSHIP' | 'OFFER_NEGOTIATION' | 'OFFER_EVENT' | 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' | 'OFFER_PLATFORM_COMMISSION' | YoutubeMessageType | 'TEXT' | 'SYSTEM' | 'CASTING_FEEDBACK' | 'RIGHTS_REPORT' | 'RIGHTS_NEGOTIATION' | 'STUDIO_ACQUISITION' | 'STUDIO_CONTINUATION' | 'SHAREHOLDER_VOTE';
    data?: AuditionOpportunity | SponsorshipOffer | NegotiationData | ScheduledEvent | YoutubeCollabOffer | YoutubeBrandDeal | YoutubeMusicVideoFeatureOffer | any;
    isRead: boolean;
    weekSent: number;
    expiresIn?: number;
    isExpired?: boolean;
    expiredAtWeek?: number;
    expiredNoticeWeeks?: number;
}

export interface Business {
    id: string;
    name: string;
    type: BusinessType;
    subtype: BusinessSubtype;
    logo: string;
    color: string;
    foundedWeek: number;
    balance: number;
    isActive: boolean;
    config: BusinessConfig;
    stats: BusinessStats;
    staff: BusinessStaff[];
    products: BusinessProduct[];
    hiringPool: EmployeeCandidate[];
    lastHiringRefreshWeek: number;
    history: { week: number, profit: number }[];
    studioState?: StudioState;
}

export interface Agent {
    id: string;
    name: string;
    description: string;
    descriptionKey?: string;
    annualFee: number;
    commission: number;
    specialty: 'FILM' | 'TV' | 'BALANCED';
    tier: 'ROOKIE' | 'STANDARD' | 'ELITE' | 'LEGEND';
    studioAccess: 'LOW' | 'MID' | 'HIGH';
}

export interface Manager {
    id: string;
    name: string;
    description: string;
    descriptionKey?: string;
    annualFee: number;
    commission: number;
    tier: 'ROOKIE' | 'STANDARD' | 'ELITE';
    sponsorshipPower: number;
}

export interface TeamMember {
    id: string;
    name: string;
    type: 'TRAINER' | 'STYLIST' | 'THERAPIST' | 'PUBLICIST' | 'WELLNESS';
    tier: 'ROOKIE' | 'STANDARD' | 'ELITE' | 'LEGEND';
    weeklyCost: number;
    description: string;
    descriptionKey?: string;
    perks: string;
    perksKey?: string;
}

export interface InstaPost {
    id: string;
    authorId: string;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    type: InstaPostType;
    caption: string;
    week: number;
    year: number;
    likes: number;
    comments: number;
    shares?: number;
    saves?: number;
    commentList?: string[];
    engagementScore?: number;
    mood?: 'SUPPORTIVE' | 'MESSY' | 'FASHION' | 'INDUSTRY' | 'ROMANCE' | 'NEUTRAL';
    contentMediaId?: string;
    hasLiked?: boolean;
    hasSaved?: boolean;
    isPlayer: boolean;
    contentImage?: string;
    /** B7 shared public-world fact reference. */
    industryEventId?: string;
    /** C1 shared media-story reference. */
    mediaStoryId?: string;
    /** C2 recurring media-institution reference. */
    mediaInstitutionId?: string;
    /** C2 recurring media-personality reference. */
    mediaPersonalityId?: string;
    /** C4 saved industry creator-video reference. */
    industryYoutubeVideoId?: string;
    /** C5 persistent fandom reference. */
    fandomId?: string;
    /** C5 public-campaign reference. */
    campaignId?: string;
    /** C5 saved campaign-moment reference. */
    campaignMomentId?: string;
    /** C6 rumour/leak/prediction lineage. */
    mediaClaimId?: string;
    companyId?: string;
    projectId?: string;
    /** C7 player-selected project promoted by this post. */
    promotedProjectId?: string;
    /** C7 exact-once promotion attribution record. */
    promotionAttributionId?: string;
}

export interface XPost {
    id: string;
    authorId: string;
    authorName: string;
    authorHandle: string;
    authorAvatar: string;
    content: string;
    timestamp: number;
    likes: number;
    retweets: number;
    replies: number;
    isPlayer: boolean;
    isLiked: boolean;
    isRetweeted: boolean;
    isVerified: boolean;
    postType?: 'CAREER' | 'HOT_TAKE' | 'JOKE' | 'FILM_OPINION' | 'PR_STATEMENT' | 'DRAMA_REPLY' | 'FAN_THANKS' | 'GENERAL';
    replyList?: string[];
    quoteList?: string[];
    controversyScore?: number;
    sentiment?: 'SUPPORTIVE' | 'MESSY' | 'FUNNY' | 'INDUSTRY' | 'NEUTRAL';
    quoteOfId?: string;
    /** B7 shared public-world fact reference. */
    industryEventId?: string;
    /** C1 shared media-story reference. */
    mediaStoryId?: string;
    /** C2 recurring media-institution reference. */
    mediaInstitutionId?: string;
    /** C2 recurring media-personality reference. */
    mediaPersonalityId?: string;
    /** C4 saved industry creator-video reference. */
    industryYoutubeVideoId?: string;
    /** C5 persistent fandom reference. */
    fandomId?: string;
    /** C5 public-campaign reference. */
    campaignId?: string;
    /** C5 saved campaign-moment reference. */
    campaignMomentId?: string;
    /** C3 public-discussion lineage. */
    mediaDiscussionId?: string;
    /** C3 player-response lineage. */
    mediaResponseId?: string;
    /** C6 rumour/leak/prediction lineage. */
    mediaClaimId?: string;
    /** C3 direct-reply source post. */
    replyToId?: string;
    /** Canonical entered week used by C3; legacy timestamp remains presentation-compatible. */
    publishedAbsoluteWeek?: number;
    companyId?: string;
    projectId?: string;
    /** C7 player-selected project promoted by this post. */
    promotedProjectId?: string;
    /** C7 exact-once promotion attribution record. */
    promotionAttributionId?: string;
}

export interface StudioContract {
    id: string;
    /** Owning production house. Missing on older saves means the parent/HQ studio. */
    studioId?: string;
    npcId: string;
    type: ContractType;
    paymentMode: PaymentMode;
    totalAmount: number;
    maintenanceFee: number;
    installmentsPaid: number;
    totalInstallments: number;
    moviesRemaining: number;
    totalMovies: number;
    startWeek: number;
    status: 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
}

export interface NPCActor {
    id: string;
    name: string;
    handle: string;
    gender: Gender;
    avatar: string;
    tier: NPCTier;
    prestigeBias: NPCPrestige;
    openness: number;
    followers: number;
    netWorth: number;
    occupation: 'ACTOR' | 'DIRECTOR' | 'MUSIC_ARTIST' | 'INVESTOR' | 'EXECUTIVE' | CrewOccupation;
    crewRole?: CrewOccupation;
    crewTier?: CrewMarketTier;
    salary?: number;
    specialties?: string[];
    bio: string;
    age?: number;
    forbesCategory?: string;
    stats?: Partial<Stats>;
    traits?: ActorTrait[];
    potential?: number; // 0-100
    isIndependent?: boolean; // If true, harder to sign to multi-movie deals
    contractId?: string; // ID of the active contract with the player's studio
}

export interface NPCState {
    npcId: string;
    isFollowing: boolean;
    isFollowedBy: boolean;
    relationshipScore: number;
    relationshipLevel: string;
    lastInteractionWeek: number;
    hasMet: boolean;
    chatHistory: {
        sender: 'PLAYER'|'NPC';
        text: string;
        timestamp: number;
        tag?: string;
        action?: {
            id: string;
            kind: 'IG_REFERRAL' | 'IG_BRAND_OFFER' | 'IG_RIVALRY';
            status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
            payload?: any;
        };
    }[];
}

export interface DatingMatch {
    id: string;
    name: string;
    age: number;
    gender?: Gender;
    job: string;
    image: string;
    type: 'RANDOM' | 'NPC';
    npcId?: string;
    chemistry: number;
    isPremium: boolean;
    chatHistory?: { sender: 'PLAYER'|'MATCH', text: string; tag?: string }[];
    bio?: string;
    handle?: string;
    netWorth?: number;
    followers?: number;
    prestigeBias?: NPCPrestige;
    prestigeTier?: 'Celebrity' | 'Power Player' | 'Old Money' | 'Industry Royalty' | 'Rising Elite';
    luxeTraits?: string[];
    relationshipIntent?: 'CASUAL' | 'PRIVATE_ROMANCE' | 'POWER_COUPLE' | 'LONG_TERM' | 'DISCREET';
    privacyStyle?: 'LOW_KEY' | 'PUBLIC_FACING' | 'MEDIA_MAGNET';
    compatibility?: number;
    matchReason?: string;
    lastActiveLabel?: string;
    inviteHistory?: { kind: string; mode: 'PRIVATE' | 'PUBLIC'; outcome: 'SUCCESS' | 'REJECTED' }[];
    hasGoneOnDate?: boolean;
    officialStatus?: 'MATCHED' | 'SEEING' | 'COOLDOWN' | 'GHOSTED' | 'DATING';
    officialSinceWeek?: number;
    dateCount?: number;
    intimacyCount?: number;
    scandalHeat?: number;
    lastInteractionAbsolute?: number;
    tinderStage?: 'MATCHED' | 'TALKING' | 'CASUAL' | 'FWB' | 'GHOSTED' | 'DATING';
}

export interface DatingPreferences {
    gender: 'MALE' | 'FEMALE' | 'ALL';
    minAge: number;
    maxAge: number;
}

export interface Stock {
    id: string;
    symbol: string;
    name: string;
    sector: 'TECH' | 'MEDIA' | 'FASHION' | 'BEVERAGE' | 'AUTOMOTIVE';
    price: number;
    outstandingShares?: number;
    publicFloatPercent?: number;
    lastShareIssueWeek?: number;
    volatility: number;
    dividendYield: number;
    relatedBrandName?: string;
    relatedStudioId?: StudioId;
    priceHistory: number[];
    lastDividendPayoutWeek: number;
}

export type ShareholderInfluenceLevel =
    | 'PASSIVE_INVESTOR'
    | 'SHAREHOLDER_VOTER'
    | 'STRATEGIC_INFLUENCE'
    | 'BOARD_SEAT'
    | 'CONTROLLING_OWNER';

export type ShareholderVoteType =
    | 'DIVIDEND_POLICY'
    | 'SLATE_APPROVAL'
    | 'CEO_CONFIDENCE'
    | 'CAPITAL_RAISE';

export interface ShareholderVote {
    id: string;
    stockId: string;
    stockSymbol: string;
    companyName: string;
    type: ShareholderVoteType;
    title: string;
    summary: string;
    stakes: string[];
    status: 'OPEN' | 'RESOLVED' | 'EXPIRED';
    playerVotingPower: number;
    expectedSupport: number;
    createdWeek: number;
    createdYear: number;
    dueWeek: number;
    dueYear?: number;
    selectedVote?: 'FOR' | 'AGAINST';
    outcomeSummary?: string;
    resolvedWeek?: number;
    resolvedYear?: number;
}

export type StockTakeoverRoute =
    | 'FRIENDLY_TAKEOVER'
    | 'SHAREHOLDER_ALLIANCE'
    | 'HOSTILE_TAKEOVER'
    | 'CONTROL_TRANSFER';

export type StockTakeoverStatus =
    | 'ACTIVE'
    | 'READY_FOR_CONTROL'
    | 'RIVAL_DEFENCE'
    | 'CONTROLLED'
    | 'FAILED';

export interface StockTakeoverCase {
    id: string;
    stockId: string;
    stockSymbol: string;
    companyName: string;
    relatedStudioId?: StudioId;
    route: StockTakeoverRoute;
    status: StockTakeoverStatus;
    ownershipPercent: number;
    alliedSupportPercent: number;
    effectiveControlPercent: number;
    supportScore: number;
    rivalDefenceRisk: number;
    cost: number;
    summary: string;
    createdWeek: number;
    createdYear: number;
    resolvedWeek?: number;
    resolvedYear?: number;
    acquiredBusinessId?: string;
}

export interface PortfolioItem {
    stockId: string;
    shares: number;
    averageCost?: number;
    totalInvested?: number;
}

export interface Transaction {
    id: string;
    week: number;
    year: number;
    amount: number;
    category: TransactionCategory;
    description: string;
}

export interface PlayerLoan {
    id: string;
    lenderName: string;
    principal: number;
    originalPrincipal: number;
    annualInterestRate: number;
    weeklyPayment: number;
    termWeeks: number;
    weeksRemaining: number;
    takenWeek: number;
    takenYear: number;
    takenAbsoluteWeek: number;
    missedPayments: number;
    successfulPayments: number;
    status: 'ACTIVE' | 'PAID' | 'DEFAULTED';
}

export interface CreditHistory {
    successfulPayments: number;
    missedPayments: number;
    defaults: number;
    totalBorrowed: number;
    totalRepaid: number;
    lastLoanAbsoluteWeek?: number;
}

export interface YearlyFinance {
    year: number;
    totalIncome: number;
    totalExpenses: number;
    incomeByCategory: Record<TransactionCategory, number>;
}

export interface IndustryProject {
    id: string;
    title: string;
    genre: Genre;
    originalLanguageId?: string;
    mediaType?: ProjectType;
    targetAudience?: TargetAudience;
    studioId: StudioId;
    budgetTier: BudgetTier;
    quality: number;
    rating?: number;
    boxOffice: number;
    year: number;
    weekReleased: number;
    leadActorId: string;
    leadActorName: string;
    directorId?: string;
    directorName: string;
    reviews: string;
    awardProfile?: {
        leadPerformance: number;
        directing: number;
        screenplay: number;
        cinematography: number;
        picture: number;
        originalScore: number;
        originalSong: number;
        campaign: number;
    };
    universeId?: UniverseId;
    isFamous?: boolean;
    /** @deprecated Legacy single-platform projection. `streamingWindows` is canonical. */
    streamingPlatformId?: PlatformId;
    /** @deprecated Legacy single-platform projection. `streamingWindows` is canonical. */
    platformRelationship?: 'ORIGINAL_COMMISSIONER' | 'LICENSEE' | 'OWNED_STUDIO' | 'CATALOGUE_RIGHTSHOLDER';
    physicalProducerStudioId?: StudioId;
    platformContentSource?: PlatformAiContentSource;
    platformContentPlanId?: string;
    /** Stable B5 lineage for AI-studio projects materialized by the temporary legacy bridge. */
    studioAiSlateCommitmentId?: string;
    industryContentFingerprintId?: string;
    releaseStrategy?: ReleaseStrategy;
    /** Every platform window is retained so non-exclusive licences can coexist. */
    streamingWindows?: PlatformAiProjectStreamingWindow[];
    /** Latest explicit performance observation; settlement remains the weekly economy's responsibility. */
    streamingPerformance?: PlatformAiStreamingPerformance;
}

export interface UniverseCharacter {
    id?: string;
    name: string;
    actorId: string;
    actorName: string;
    status: 'ACTIVE' | 'RECAST' | 'RETIRED';
    fanApproval: number;
    characterId?: string;
    roleType?: RoleType;
    storyFunction?: CharacterStoryFunction;
    storyRole?: CharacterStoryRole;
    abilityType?: CharacterAbilityType;
    nature?: CharacterNature;
    identitySource?: CharacterIdentitySource;
    firstAppearanceTitle?: string;
    latestAppearanceTitle?: string;
    appearances?: number;
    description?: string;
    fame?: number;
    appeal?: number;
    type?: string;
}

export interface UniverseSaga {
    id: string;
    name: string;
    phases: {
        id: string;
        name: string;
        number: number;
    }[];
}

export type UniverseStatus = 'ACTIVE' | 'RETIRED';

export interface UniverseLifecycleEvent {
    id: string;
    type: 'RETIRED' | 'REBOOTED';
    year: number;
    week: number;
    label: string;
}

export interface Universe {
    id: UniverseId;
    name: string;
    description?: string;
    studioId: StudioId;
    /** Canonical owner metadata for studio- and platform-originated universes. */
    ownerCompanyId?: string;
    ownerCompanyKind?: IndustryCompanyKind;
    /** Stable private-intelligence lineage; WorldState.universes remains authoritative. */
    blueprintId?: string;
    originFingerprintId?: string;
    currentPhase: UniversePhase | string;
    saga: number | string;
    currentSagaName?: string;
    currentPhaseName?: string;
    sagas?: UniverseSaga[];
    momentum: number;
    brandPower: number;
    marketShare: number;
    color: string;
    roster: UniverseCharacter[];
    slate: ProjectDetails[];
    products?: BusinessProduct[];
    stats?: {
        weeklyRevenue: number;
        lifetimeRevenue: number;
    };
    weeksUntilNextPhase: number;
    status?: UniverseStatus;
    retiredAt?: {
        year: number;
        week: number;
    };
    lastRebootAt?: {
        year: number;
        week: number;
    };
    rebootCount?: number;
    lifecycleHistory?: UniverseLifecycleEvent[];
}

export interface MusicArtistWorldState {
    artistId: string;
    artistName: string;
    genre: string;
    rank: number;
    momentum: number;
    followers: number;
    followersLastWeek?: number;
    weeklyFollowerGain?: number;
    socialGrowthPct?: number;
    youtubeViews?: number;
    peakRank?: number;
    chartMovement?: number;
    scandalHeat?: number;
    rivalryHeat?: number;
    lastReleaseWeek?: number;
    lastReleaseYear?: number;
    lastScandalWeek?: number;
    lastScandalYear?: number;
    currentSingle?: string;
    rivalArtistId?: string;
}

export interface MusicChartEntry {
    artistId: string;
    artistName: string;
    songTitle: string;
    genre: string;
    score: number;
    week: number;
    year: number;
    previousRank?: number;
    currentRank?: number;
    movement?: number;
}

export type MusicReleaseKind = 'SINGLE' | 'VIDEO' | 'REMIX' | 'EP' | 'ALBUM';

export interface MusicReleaseRecord {
    id: string;
    artistId: string;
    artistName: string;
    songTitle: string;
    genre: string;
    kind: MusicReleaseKind;
    score: number;
    week: number;
    year: number;
    previousRank?: number;
    currentRank?: number;
    movement?: number;
    followerGain: number;
    socialGrowthPct: number;
    youtubeViews: number;
}

export interface MusicRivalryRecord {
    id: string;
    artistIds: string[];
    artistNames: string[];
    reason: string;
    heat: number;
    startedWeek: number;
    startedYear: number;
    lastEventWeek: number;
    lastEventYear: number;
    status: 'ACTIVE' | 'COOLING' | 'ENDED';
}

export interface MusicScandalRecord {
    id: string;
    artistId: string;
    artistName: string;
    headline: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    week: number;
    year: number;
    momentumHit: number;
    followerLoss: number;
}

export type MusicCultureMomentType =
    | 'FANBASE_WAR'
    | 'SONG_BEATS_SONG'
    | 'ARTIST_BREAKOUT'
    | 'SOUNDTRACK_TREND'
    | 'CONTROVERSIAL_CAMPAIGN'
    | 'SONG_BIGGER_THAN_MOVIE';

export interface MusicCultureMomentRecord {
    id: string;
    type: MusicCultureMomentType;
    headline: string;
    description: string;
    artistIds: string[];
    artistNames: string[];
    songTitle?: string;
    projectTitle?: string;
    heat: number;
    week: number;
    year: number;
    impactLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface MusicIndustryState {
    artists: Record<string, MusicArtistWorldState>;
    generatedArtists?: MusicArtist[];
    chart: MusicChartEntry[];
    recentReleases?: MusicReleaseRecord[];
    rivalries?: MusicRivalryRecord[];
    scandals?: MusicScandalRecord[];
    cultureMoments?: MusicCultureMomentRecord[];
    lastProcessedWeek?: number;
    history: string[];
}

export interface AwardHistoryEntry {
    year: number;
    type: AwardType;
    winners: {
        category: string;
        winnerName: string;
        projectName: string;
        /** Stable identity lets later systems observe awards without title matching. */
        projectId?: string;
        isPlayer: boolean;
    }[];
}

export type IndustryTalentBookingRole = 'ACTOR' | 'DIRECTOR';
export type IndustryTalentBookingOwner = 'PLAYER_COMMITMENT' | 'INDUSTRY_PRODUCTION';
export type IndustryTalentBookingStatus = 'BOOKED' | 'CANCELLED' | 'RELEASED';

export interface IndustryTalentBooking {
    id: string;
    npcId: string;
    role: IndustryTalentBookingRole;
    projectId: string;
    projectOwner: IndustryTalentBookingOwner;
    producerStudioId: StudioId;
    commissioningPlatformId?: PlatformId;
    startAbsoluteWeek: number;
    endAbsoluteWeek: number;
    status: IndustryTalentBookingStatus;
    cancelledAtAbsoluteWeek?: number;
    releasedAtAbsoluteWeek?: number;
}

export type IndustryProductionStatus =
    | 'PLANNED'
    | 'PRE_PRODUCTION'
    | 'PRODUCTION'
    | 'POST_PRODUCTION'
    | 'DELIVERED'
    | 'AWAITING_RELEASE'
    | 'TURNAROUND'
    | 'RELEASED'
    | 'ON_HOLD'
    | 'CANCELLED';

export type IndustryProductionSource = 'PLATFORM_COMMISSION' | 'STUDIO_INDEPENDENT';
export type StudioAiProductionMilestone = 'PRE_PRODUCTION_START' | 'PRODUCTION_START' | 'POST_PRODUCTION_START' | 'DELIVERY';
export type StudioAiProductionCheckpoint = 'PRODUCTION_START' | 'PRODUCTION_35' | 'PRODUCTION_70' | 'POST_PRODUCTION_START';
export type StudioAiProductionProblemType = 'DELAY' | 'OVERRUN' | 'QUALITY_LOSS' | 'TALENT_ISSUE' | 'FINANCING_HOLD' | 'POST_PRODUCTION_DIFFICULTY';
export type StudioAiProductionRecovery = 'NONE' | 'CONTINGENCY_SPEND' | 'SCHEDULE_EXTENSION' | 'SCOPE_REDUCTION' | 'QUALITY_PROTECTION' | 'RELEASE_DELAY' | 'FINANCING_HOLD' | 'TURNAROUND' | 'CANCEL';
export type StudioAiReleaseMode = 'LIMITED_THEATRICAL' | 'WIDE_THEATRICAL' | 'EVENT_THEATRICAL' | 'PRESTIGE_THEATRICAL' | 'STREAMING_ONLY' | 'THEATRICAL_THEN_STREAMING' | 'HOLD' | 'TURNAROUND';

export interface StudioAiProductionProblem {
    id: string;
    checkpoint: StudioAiProductionCheckpoint;
    type: StudioAiProductionProblemType;
    severity: number;
    occurredAtAbsoluteWeek: number;
    delayWeeks: number;
    overrunMillions: number;
    qualityImpact: number;
    response: StudioAiProductionRecovery;
    responseAppliedAtAbsoluteWeek: number | null;
}

export interface StudioAiProductionTalent {
    leadActorId: string;
    leadActorName: string;
    directorId: string;
    directorName: string;
    packageScore: number;
    estimatedCostMillions: number;
}

export interface StudioAiFinalQuality {
    creativeQuality: number;
    executionQuality: number;
    commercialPotential: number;
    prestigePotential: number;
    downsideRisk: number;
}

export interface StudioAiCommercialResult {
    releasedAtAbsoluteWeek: number;
    theatricalGrossMillions: number;
    streamingValueMillions: number;
    studioReceiptsMillions: number;
    productionSpendMillions: number;
    marketingSpendMillions: number;
    netResultMillions: number;
    rating: number;
    outcome: 'HIT' | 'SOLID' | 'FLOP';
}

export interface StudioAiProductionRecord {
    schemaVersion: 1;
    source: 'STUDIO_INDEPENDENT';
    slateCommitmentId: string;
    fingerprintId: string;
    /** Immutable creative input retained after bounded planning history evicts the source fingerprint. */
    fingerprintSnapshot?: IndustryContentFingerprint;
    originalProducerStudioId?: StudioId;
    controllerAtLastProgression: StudioAiController;
    selectedReleaseMode: StudioAiReleaseMode | null;
    publicReleaseStrategy: ReleaseStrategy | null;
    releasePlannedAtAbsoluteWeek?: number;
    plannedReleaseAbsoluteWeek?: number;
    releaseBlockedReason?: 'MISSING_STREAMING_RIGHTS' | 'INSUFFICIENT_MARKETING' | 'RELEASE_CAPACITY' | 'NONE';
    talentSelected: boolean;
    talent: StudioAiProductionTalent | null;
    finalQuality: StudioAiFinalQuality | null;
    result: StudioAiCommercialResult | null;
    problems: StudioAiProductionProblem[];
    paidMilestoneIds?: StudioAiProductionMilestone[];
    processedKeys: string[];
    holdStartedAtAbsoluteWeek?: number | null;
    nextReviewAbsoluteWeek?: number | null;
    lastProgressedAbsoluteWeek: number;
}

export interface IndustryProductionCommitment {
    id: string;
    canonicalProjectId: string;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    producerStudioId: StudioId;
    commissioningPlatformId?: PlatformId;
    platformContentPlanId?: string;
    source?: IndustryProductionSource;
    status: IndustryProductionStatus;
    productionCalendar: ProductionCalendar;
    budgetMillions: number;
    paidMillions: number;
    talentBookingIds: string[];
    writerSource: 'IN_HOUSE_TEAM';
    writerId: null;
    writerName: string;
    writerSkill: number;
    /** Deterministic execution metadata for AI-commissioned productions. */
    aiExecution?: PlatformAiProductionRecord;
    /** B6 deterministic execution metadata for independent AI-studio productions. */
    studioAiExecution?: StudioAiProductionRecord;
    studioAiSlateCommitmentId?: string;
    industryContentFingerprintId?: string;
    universeId?: UniverseId;
    createdAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    /** Exactly-once B7 boundary between compact rival AI and detailed player workflow. */
    playerHandoff?: {
        schemaVersion: 1;
        playerCommitmentId: string;
        materializedAtAbsoluteWeek: number;
        lastPlayerControlledAbsoluteWeek: number;
        dematerializedAtAbsoluteWeek: number | null;
    };
}

export const INDUSTRY_INTELLIGENCE_SCHEMA_VERSION = 1 as const;

export type IndustryCompanyKind = 'PRODUCTION_STUDIO' | 'STREAMING_PLATFORM';
export type IndustryDecisionLane = 'CONTENT_STRATEGY' | 'PRODUCTION_REVIEW' | 'RELEASE_REVIEW' | 'FINANCE_REVIEW' | 'MARKET_EXPANSION' | 'CAPABILITY_GROWTH';
export type IndustryCapabilityDimension = 'DEVELOPMENT' | 'CREATIVE' | 'PRODUCTION' | 'FINANCE' | 'MARKETING_DISCOVERY' | 'DISTRIBUTION_MARKET' | 'NEGOTIATION' | 'TALENT_RELATIONSHIP' | 'TECHNOLOGY' | 'CATALOGUE' | 'LOCALIZATION';
export type IndustryIntelligenceProposalStatus = 'SHADOW' | 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'EXECUTED' | 'EXPIRED' | 'SUPERSEDED';
export type IndustryIntelligenceReasonCode =
    | 'STRATEGIC_NEED'
    | 'AUDIENCE_OPPORTUNITY'
    | 'CAPABILITY_GAP'
    | 'COMPETITIVE_PRESSURE'
    | 'RELATIONSHIP_VALUE'
    | 'FINANCIAL_PRESSURE'
    | 'CAPACITY_PRESSURE'
    | 'FATIGUE_PRESSURE'
    | 'PLAYER_CONTROLLED'
    | 'TERMINAL_COMPANY'
    | 'INSUFFICIENT_RUNWAY'
    | 'INSUFFICIENT_CAPACITY'
    | 'SPENDING_RESTRICTED'
    | 'MISSING_CAPABILITY'
    | 'RIGHTS_CONFLICT'
    | 'DUPLICATE_COMMITMENT'
    | 'NO_ELIGIBLE_OPTION';

export interface IndustryIntelligenceScore {
    total: number;
    need: number;
    strategyFit: number;
    expectedUpside: number;
    relationshipValue: number;
    competitiveValue: number;
    financialRisk: number;
    capacityPressure: number;
    fatigue: number;
    executionRisk: number;
}

export interface IndustryIntelligenceLearningSample {
    id: string;
    evidenceId: string;
    absoluteWeek: number;
    lane: IndustryDecisionLane;
    outcomeScore: number;
    capabilityDelta: number;
    momentumDelta: number;
}

export interface IndustryIntelligenceLearningState {
    averageOutcomeByLane: Partial<Record<IndustryDecisionLane, number>>;
    capabilityProgress: Partial<Record<IndustryCapabilityDimension, number>>;
    repetitionFatigue: number;
    franchiseFatigue: number;
    samples: IndustryIntelligenceLearningSample[];
    processedEvidenceIds: string[];
}

export interface IndustryIntelligenceProposal {
    id: string;
    idempotencyKey: string;
    companyId: string;
    companyKind: IndustryCompanyKind;
    lane: IndustryDecisionLane;
    decisionCycle: number;
    absoluteWeek: number;
    actionFamily: string;
    optionId: string;
    urgency: number;
    confidence: number;
    expectedExposureMillions: number;
    affordabilityCeilingMillions: number;
    score: IndustryIntelligenceScore;
    reasonCodes: IndustryIntelligenceReasonCode[];
    uncertaintyKey: string;
    /** B3 winner consumed by later canonical activation phases. */
    contentFingerprintId?: string;
    status: IndustryIntelligenceProposalStatus;
    nextReviewAbsoluteWeek: number;
}

export type IndustryIntelligenceShadowDivergence =
    | 'MATCH'
    | 'ACT_VS_HOLD'
    | 'ACTION_FAMILY_DIFFERENCE'
    | 'EXPOSURE_BAND_DIFFERENCE'
    | 'TIMING_DIFFERENCE'
    | 'ELIGIBILITY_DIFFERENCE'
    | 'NO_AUTHORITATIVE_OBSERVATION';

export interface IndustryIntelligenceShadowComparison {
    id: string;
    idempotencyKey: string;
    companyId: string;
    lane: IndustryDecisionLane;
    absoluteWeek: number;
    proposalId: string;
    shadowActionFamily: string;
    authoritativeActionFamily: string | null;
    divergence: IndustryIntelligenceShadowDivergence;
}

export type IndustryContentFormat = 'MOVIE' | 'SERIES' | 'LIMITED_SERIES';
export type IndustryContentSourceIntent =
    | 'ORIGINAL'
    | 'INTERNAL_DEVELOPMENT'
    | 'PLATFORM_ORIGINAL'
    | 'INDIVIDUAL_COMMISSION'
    | 'LICENSED_WORK'
    | 'ACQUIRED_IP'
    | 'SEQUEL'
    | 'PREQUEL'
    | 'REBOOT'
    | 'SPIN_OFF'
    | 'UNIVERSE_ENTRY'
    | 'UNIVERSE_CROSSOVER'
    | 'UNIVERSE_EVENT'
    | 'INHERITED';
export type IndustryContentRelationship =
    | 'STANDALONE'
    | 'SEQUEL'
    | 'PREQUEL'
    | 'REBOOT'
    | 'SPIN_OFF'
    | 'UNIVERSE_ENTRY'
    | 'UNIVERSE_CROSSOVER'
    | 'UNIVERSE_EVENT'
    | 'FOUND_UNIVERSE';
export type IndustryContentLifecycle = 'SELECTED' | 'COMMITTED' | 'PUBLIC' | 'MATERIALIZED' | 'ABANDONED' | 'CANCELLED';
export type IndustryContentReleasePath = 'THEATRICAL_FIRST' | 'STREAMING_FIRST' | 'HYBRID' | 'LIMITED_EVENT';
export type IndustryUniverseBlueprintLifecycle = 'PLANNED' | 'EMERGING' | 'ACTIVE' | 'PAUSED' | 'RETIRED' | 'FAILED' | 'MATERIALIZED';

export interface IndustryBudgetSuitability {
    minimumMillions: number;
    idealLowMillions: number;
    idealHighMillions: number;
    ambitiousMaximumMillions: number;
}

export interface IndustryContentFingerprint {
    id: string;
    seed: string;
    ownerCompanyId: string;
    ownerCompanyKind: IndustryCompanyKind;
    format: IndustryContentFormat;
    primaryGenre: Genre;
    secondaryGenre?: Genre;
    subgenre: string;
    tone: string;
    theme: string;
    setting: string;
    period: string;
    targetAudience: string;
    originalLanguage: string;
    priorityMarket: string;
    commercialIntent: number;
    prestigeIntent: number;
    creativeRisk: number;
    starPowerTarget: number;
    releasePath: IndustryContentReleasePath;
    sourceIntent: IndustryContentSourceIntent;
    relationship: IndustryContentRelationship;
    budgetSuitability: IndustryBudgetSuitability;
    noveltySignature: string;
    noveltyScore: number;
    createdAtAbsoluteWeek: number;
    decisionCycle: number;
    lifecycle: IndustryContentLifecycle;
    sourceRightId?: string;
    relatedFingerprintId?: string;
    universeBlueprintId?: string;
    canonicalProjectId?: string;
    canonicalUniverseId?: UniverseId;
}

export interface IndustryUniverseBlueprint {
    id: string;
    seed: string;
    ownerCompanyId: string;
    ownerCompanyKind: IndustryCompanyKind;
    anchorFingerprintId: string;
    coreWorldSignature: string;
    creativePillars: string[];
    supportedFormats: IndustryContentFormat[];
    branchFamilies: string[];
    currentSagaLabel: string;
    currentPhaseLabel: string;
    plannedCadenceWeeks: number;
    financialScale: number;
    crossoverPotential: number;
    confidence: number;
    momentum: number;
    fatigue: number;
    lifecycle: IndustryUniverseBlueprintLifecycle;
    createdAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    canonicalUniverseId?: UniverseId;
}

export interface IndustryContentIntelligenceState {
    selectedFingerprints: IndustryContentFingerprint[];
    universeBlueprints: IndustryUniverseBlueprint[];
    recentNoveltySignatures: string[];
    materializationKeys: string[];
}

export interface IndustryIntelligenceState {
    schemaVersion: typeof INDUSTRY_INTELLIGENCE_SCHEMA_VERSION;
    companyId: string;
    companyKind: IndustryCompanyKind;
    seed: string;
    lastProcessedAbsoluteWeek: number;
    nextDueAbsoluteWeek: Record<IndustryDecisionLane, number | null>;
    decisionCycleByLane: Record<IndustryDecisionLane, number>;
    momentum: number;
    learning: IndustryIntelligenceLearningState;
    proposals: IndustryIntelligenceProposal[];
    shadowComparisons: IndustryIntelligenceShadowComparison[];
    processedKeys: string[];
    content: IndustryContentIntelligenceState;
    /** Streaming-only B4 execution ledger; absent for studio shadow intelligence. */
    platformMigration?: PlatformIntelligenceMigrationState;
}

export type PlatformAiController = 'AI' | 'PLAYER';
export type PlatformIntelligenceIntentRoute =
    | 'COMMISSION_ORIGINAL'
    | 'LICENSE_TITLE'
    | 'ACQUIRE_CATALOGUE'
    | 'TRANSFER_OWNED_TITLE'
    | 'RESEARCH_TECHNOLOGY'
    | 'RESEARCH_LOCALIZATION'
    | 'ENTER_MARKET'
    | 'LOCALIZE_COMMITTED_CONTENT'
    | 'HOLD';
export type PlatformIntelligenceOutcomeStatus = 'EXECUTED' | 'REJECTED' | 'HELD';

export interface PlatformIntelligenceOutcome {
    id: string;
    proposalId: string;
    proposalKey: string;
    intentRoute: PlatformIntelligenceIntentRoute;
    status: PlatformIntelligenceOutcomeStatus;
    absoluteWeek: number;
    reason: string;
    canonicalReferenceIds: string[];
}

export interface PlatformIntelligenceMigrationState {
    schemaVersion: 1;
    activatedAtAbsoluteWeek: number;
    legacyPlanningRetiredAtAbsoluteWeek: number;
    processedProposalKeys: string[];
    outcomes: PlatformIntelligenceOutcome[];
}
export type PlatformAiCompanyStatus = 'ACTIVE' | 'DISTRESSED' | 'RESTRUCTURING' | 'DORMANT';
export type PlatformAiContentSource = 'COMMISSIONED_ORIGINAL' | 'LICENSED_RELEASED_TITLE' | 'OWNED_STUDIO_TRANSFER' | 'CATALOGUE_ACQUISITION';
export type PlatformAiPlanStatus = 'SCOUTED' | 'BRIEF' | 'PRODUCER_SELECTED' | 'GREENLIT' | 'IN_PRODUCTION' | 'NEGOTIATING' | 'CONTRACTED' | 'RIGHTS_READY' | 'DELIVERED' | 'LOCALIZED' | 'SCHEDULED' | 'RELEASED' | 'ON_HOLD' | 'CANCELLED' | 'SOLD';
export type PlatformAiStreamingWindow = 'ORIGINAL_STREAMING_PREMIERE' | 'POST_THEATRICAL_WINDOW' | 'CATALOGUE_WINDOW' | 'OWNED_STUDIO_STREAMING_WINDOW';
export type PlatformAiLocalizationLevel = 'NONE' | 'SUBTITLES' | 'DUBS_AND_SUBTITLES';
export type PlatformAiReleasePattern =
    | 'MOVIE_SINGLE_PREMIERE'
    | 'SERIES_FULL_SEASON'
    | 'SERIES_WEEKLY'
    | 'SERIES_SPLIT_VOLUME';

export interface PlatformAiStreamingPerformance {
    calculatedAtAbsoluteWeek: number;
    /** Unique viewers in millions. */
    viewsMillions: number;
    /** Forecast subscriber movement in millions; Phase 5 applies any settlement. */
    subscriberImpactMillions: number;
    /** Optional at legacy-save and test-fixture boundaries; Phase 6 calculators always materialize it. */
    acquiredSubscribersMillions?: number;
    retainedSubscribersMillions?: number;
    churnedSubscribersMillions?: number;
    /** Bounded change to a 0-100 engagement index, expressed in points. */
    engagementIndexDelta: number;
    /** Bounded contribution used by catalogue projection and future planning. */
    catalogueStrengthDelta?: number;
    commercialScore: number;
    prestigeScore: number;
    localizationSupportMultiplier: number;
    outcome: 'FLOP' | 'SOLID' | 'HIT';
    regionalResults?: PlatformAiRegionalStreamingPerformance[];
    seed: string;
}

export interface PlatformAiRegionalStreamingPerformance {
    countryId: string;
    localizationState: 'NATIVE_OR_COMPATIBLE' | 'DUBBED' | 'SUBTITLED' | 'UNLOCALIZED';
    reachMultiplier: number;
    appreciationMultiplier: number;
    completionMultiplier: number;
    viewsMillions: number;
    commercialScore: number;
    subscriberImpactMillions: number;
}

export interface PlatformAiProjectStreamingWindow {
    id: string;
    platformId: string;
    platformContentPlanId: string;
    rightsContractId: string | null;
    contentSource: PlatformAiContentSource;
    platformRelationship: 'ORIGINAL_COMMISSIONER' | 'LICENSEE' | 'OWNED_STUDIO' | 'CATALOGUE_RIGHTSHOLDER';
    countryIds: string[];
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    exclusivity: StreamingLicenseExclusivity;
    localizationLevel: PlatformAiLocalizationLevel;
    releasePattern: PlatformAiReleasePattern;
    installmentAbsoluteWeeks: number[];
    performance: PlatformAiStreamingPerformance;
}

export interface PlatformAiReleaseEntry {
    id: string;
    sourceProjectId: string | null;
    canonicalProjectId: string;
    rightsContractId: string | null;
    premiereAtAbsoluteWeek: number;
    localizationReadyAtAbsoluteWeek: number;
    countryIds: string[];
    releasePattern: PlatformAiReleasePattern;
    installmentAbsoluteWeeks: number[];
    status: 'SCHEDULED' | 'RELEASED';
    releasedAtAbsoluteWeek: number | null;
    streamingWindowId: string | null;
}

export type PlatformAiReleaseReadinessBlocker =
    | 'PRODUCTION_NOT_DELIVERED'
    | 'SOURCE_NOT_FOUND'
    | 'RIGHTS_NOT_ACTIVE'
    | 'RIGHTS_NOT_COVERED'
    | 'COUNTRY_NOT_ACTIVE'
    | 'LOCALIZATION_INSUFFICIENT'
    | 'LOCALIZATION_NOT_READY'
    | 'RELEASE_CAPACITY_EXCEEDED'
    | 'ROLLOUT_OUTSIDE_RIGHTS_WINDOW';

export type PlatformAiPremiereSelectionReason =
    | 'EARLY_AVAILABILITY'
    | 'RIGHTS_EXPIRY_URGENCY'
    | 'LOW_CONGESTION'
    | 'AVOID_SELF_CANNIBALIZATION'
    | 'AWARDS_POSITIONING';

/** Persisted explanation of the canonical evidence used to approve a streaming schedule. */
export interface PlatformAiReleaseReadinessSnapshot {
    evaluatedAtAbsoluteWeek: number;
    premiereAtAbsoluteWeek: number;
    latestRequiredAbsoluteWeek: number;
    ready: boolean;
    blockers: PlatformAiReleaseReadinessBlocker[];
    canonicalProjectIds: string[];
    rightsContractIds: string[];
    countryIds: string[];
    localizationReadyAtAbsoluteWeek: number;
    scheduledTitleCount: number;
    releaseCapacity: number;
    selectionScore: number | null;
    selectionReasons: PlatformAiPremiereSelectionReason[];
}

export interface PlatformAiCompetence {
    strategy: number;
    creative: number;
    production: number;
    commercial: number;
    prestige: number;
    finance: number;
    technology: number;
    negotiation: number;
}

export type PlatformAiCompanyScale = 'REGIONAL' | 'GROWTH' | 'MATURE' | 'GLOBAL';
export type PlatformAiLocalizationMode = 'SUBTITLE' | 'DUB';

export interface PlatformAiOperatingEfficiencyPolicy {
    recurringOperationsCostMultiplier: number;
    researchCostMultiplier: number;
    installationCostMultiplier: number;
    marketEntryCostMultiplier: number;
    localizationCostMultiplier: number;
    leadTimeMultiplier: number;
    localizationThroughputMultiplier: number;
    localPartnershipEligible: boolean;
}

export interface PlatformAiEfficiencySnapshot {
    controller: 'AI' | 'PLAYER';
    policyVersion: number;
    kind: 'RESEARCH' | 'INSTALLATION' | 'MARKET_ENTRY' | 'LOCALIZATION';
    costMultiplier: number;
    leadTimeMultiplier: number;
    standardCostMillions: number;
    appliedCostMillions: number;
    savingMillions: number;
    standardLeadWeeks: number;
    appliedLeadWeeks: number;
}

export interface PlatformAiRecurringEfficiencySnapshot {
    controller: 'AI' | 'PLAYER';
    policyVersion: number;
    costMultiplier: number;
    standardEligibleCostMillions: number;
    appliedEligibleCostMillions: number;
    savingMillions: number;
}

export interface PlatformAiLanguageCapability {
    languageId: string;
    subtitleLevel: 0 | 1 | 2 | 3;
    dubbingLevel: 0 | 1 | 2 | 3;
    source: 'HISTORICAL_PROFILE' | 'LANGUAGE_PACKAGE' | 'PLAYER_HANDOFF';
    sourceReferenceId: string;
    activatedAtAbsoluteWeek: number;
}

export interface PlatformAiCapabilities {
    activeCountryIds: string[];
    technologyLevels: Record<StreamingTechnologyBranch, number>;
    subtitleCoveragePercent: number;
    dubCoveragePercent: number;
}

export interface PlatformAiResearchItem {
    id: string;
    idempotencyKey: string;
    researchDefinitionId: string;
    technologyDefinitionId: string;
    branch: StreamingTechnologyCampusBranch;
    targetLevel: number;
    buildMode: StreamingTechnologyBuildMode;
    stage: StreamingResearchLifecycleStage;
    ipStrategy: StreamingResearchIpStrategy;
    researchCostMillions: number;
    ipCostMillions: number;
    installationCostMillions: number;
    researchWeeklyOperatingCostMillions: number;
    licenseWeeklyCostMillions: number;
    /** Live technology operating cost, charged only after installation reaches OPERATING. */
    technologyWeeklyOperatingCostMillions?: number;
    efficiencySnapshot?: PlatformAiEfficiencySnapshot | null;
    installationEfficiencySnapshot?: PlatformAiEfficiencySnapshot | null;
    researchWeeks: number;
    prototypeWeeks: number;
    testWeeks: number;
    installationWeeks: number;
    startedAtAbsoluteWeek: number;
    stageStartedAtAbsoluteWeek: number;
    stageReadyAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
    lastProcessedAbsoluteWeek: number;
}

export type PlatformAiExpenseClass = 'CONTRACTUAL' | 'LOCALIZATION' | 'DISCRETIONARY';

export interface PlatformAiHeldObligation {
    expenseClass: PlatformAiExpenseClass;
    amountMillions: number;
    status: 'ON_HOLD';
}

export interface PlatformAiPendingOneTimeObligation {
    /** Stable idempotency key supplied by the owning system or derived from week and category. */
    id: string;
    category: PlatformAiExpenseClass;
    amountMillions: number;
    createdWeek: number;
    status: 'HELD' | 'SETTLED';
    settledWeek: number | null;
}

export type PlatformAiRightsRenewalStatus = 'PENDING_PAYMENT' | 'PAYMENT_SETTLED' | 'CONTRACTED';

/** Persisted before payment so renewal replay cannot duplicate either cash or rights. */
export interface PlatformAiRightsRenewalRecord {
    /** Stable id derived from the previous licence and the next non-overlapping start week. */
    id: string;
    platformId: PlatformId;
    previousLicenseId: string;
    sourceProjectId: string;
    platformContentPlanId: string;
    nextStartsAtAbsoluteWeek: number;
    durationWeeks: number;
    minimumGuaranteeMillions: number;
    /** Stable id consumed by the existing one-time economy settlement. */
    obligationId: string;
    status: PlatformAiRightsRenewalStatus;
    /** Written only when the economy changes this renewal's obligation from HELD to SETTLED. */
    paymentSettledAtAbsoluteWeek: number | null;
    renewalLicenseId: string | null;
    createdAtAbsoluteWeek: number;
    activatedAtAbsoluteWeek: number | null;
}

export interface PlatformAiAudienceSettlement {
    /** Stable key derived from streaming-window, canonical-project, and content-plan identity. */
    id: string;
    streamingWindowId: string;
    projectId: string;
    planId: string;
    subscriberImpactMillions: number;
    acquiredSubscribersMillions?: number;
    retainedSubscribersMillions?: number;
    churnedSubscribersMillions?: number;
    engagementIndexDelta?: number;
    catalogueStrengthDelta?: number;
    status: 'PENDING' | 'SETTLED';
    createdAtAbsoluteWeek: number;
    settledAtAbsoluteWeek: number | null;
}

export interface PlatformAiAudienceHealth {
    engagementIndex: number;
    catalogueStrengthIndex: number;
    acquiredSubscribersMillions: number;
    retainedSubscribersMillions: number;
    churnedSubscribersMillions: number;
}

export interface PlatformAiWorldEconomyFeedback {
    asOfAbsoluteWeek: number;
    endingPaidAccounts: number;
    viewingAccounts: number;
    hoursViewed: number;
    weeklyRevenue: number;
    weeklyOperatingResult: number;
    audienceMomentum: number;
    churnPressure: number;
    viewingDepth: number;
    unmetDemandPressure: number;
    strongestCountryId: string | null;
}

export type PlatformAiLocalizationJobStatus = 'WAITING_FOR_FUNDS' | 'IN_PROGRESS' | 'READY' | 'CANCELLED';

/** A paid, immutable localization promise for one canonical content plan. */
export interface PlatformAiLocalizationJob {
    id: string;
    platformId: PlatformId;
    contentPlanId: string;
    projectId: string;
    countryIds: string[];
    level: PlatformAiLocalizationLevel;
    languageId: string;
    mode: PlatformAiLocalizationMode;
    capabilityTierAtPlanning: 1 | 2 | 3;
    qualityForecast: number;
    efficiencySnapshot: PlatformAiEfficiencySnapshot | null;
    quoteVersion: 0 | 1;
    legacyObligationId?: string | null;
    contentOperationsLevelAtPlanning: number;
    costMillions: number;
    leadWeeks: number;
    obligationId: string;
    status: PlatformAiLocalizationJobStatus;
    createdAtAbsoluteWeek: number;
    startedAtAbsoluteWeek: number | null;
    readyAtAbsoluteWeek: number | null;
    cancelledAtAbsoluteWeek: number | null;
}

export interface StreamingLocalizationPromise {
    sourceProjectId?: string | null;
    languageId: string;
    mode: PlatformAiLocalizationMode;
    countryIds: string[];
    capabilityTierAtPromise: 1 | 2 | 3;
    mandatory: boolean;
}

export interface PlatformAiProductionRecord {
    standardDurationWeeks: number;
    effectiveDurationWeeks: number;
    qualityForecast: number;
    executionRoll: number;
    delayRoll: number;
    overrunRoll: number;
    failureRoll: number;
    delayWeeks: number;
    overrunMillions: number;
    leadActorId: string | null;
    leadActorName: string | null;
    directorId: string | null;
    directorName: string | null;
    writerId: string | null;
    writerName: string | null;
    finalQuality: number | null;
    failureDecision: 'NONE' | 'ADD_CONTINGENCY' | 'DELAY_RELEASE' | 'REPLACE_TALENT' | 'REDUCE_MARKETING' | 'SELL_OR_COPRODUCE' | 'CANCEL';
    failureResponse: 'NONE' | 'PENDING' | 'CONTINGENCY_TRANSFERRED' | 'MARKETING_TRANSFERRED' | 'SCHEDULE_EXTENDED' | 'ON_HOLD';
    failureResponseAmountMillions: number;
    failureResponseAppliedAtAbsoluteWeek: number | null;
    paidMilestoneIds: Array<'COMMISSIONING' | 'PROGRESS_35' | 'PROGRESS_70' | 'DELIVERY'>;
    controllerAtLastProgression: PlatformAiController;
    lastProgressedAbsoluteWeek: number;
    holdReason: 'INSUFFICIENT_CASH' | 'SCHEDULE_CONFLICT' | 'FAILURE_RESPONSE_UNAVAILABLE' | 'TALENT_DECEASED' | null;
}

export type PlatformAiProductionEscrowStatus = 'UNFUNDED' | 'FUNDED' | 'SETTLED';

/** Persisted proof that production reserves were actually removed from platform cash. */
export interface PlatformAiProductionEscrow {
    status: PlatformAiProductionEscrowStatus;
    fundingId: string | null;
    /** Original funded campaign value retained for release and award scoring. */
    marketingCampaignMillions: number;
    marketingBalanceMillions: number;
    contingencyBalanceMillions: number;
    fundedAtAbsoluteWeek: number | null;
    settledAtAbsoluteWeek: number | null;
    settlementReason: 'RELEASED' | 'CANCELLED' | null;
}

export interface PlatformAiCommissioningLifecycle {
    status: 'PENDING' | 'COMMISSIONED' | 'CANCELLED';
    attemptCount: number;
    lastAttemptAtAbsoluteWeek: number | null;
    deadlineAtAbsoluteWeek: number;
    lastFailureReason: string | null;
    /** The initial five-percent commitment remains refundable until commissioning succeeds. */
    depositEscrowMillions: number;
    depositRefundedAtAbsoluteWeek: number | null;
}

export interface PlatformAiContentPlan {
    id: string;
    platformId: PlatformId;
    controllerAtCommitment: PlatformAiController;
    source: PlatformAiContentSource;
    status: PlatformAiPlanStatus;
    title: string;
    projectType: ProjectType;
    genre: Genre;
    targetAudience: TargetAudience;
    sourceProjectIds: string[];
    rightsContractIds: string[];
    cataloguePackageId: string | null;
    commissionId: string | null;
    sourceStudioId: StudioId | null;
    streamingWindow: PlatformAiStreamingWindow;
    localizationLevel: PlatformAiLocalizationLevel;
    localizationRequirements?: StreamingLocalizationPromise[];
    releaseCountryIds: string[];
    minimumGuaranteeMillions: number;
    rightsCostMillions: number;
    productionFundingMillions: number;
    paidSpendMillions: number;
    marketingReserveMillions: number;
    contingencyMillions: number;
    /** Optional only at the raw-save boundary; schema normalization always materializes it. */
    productionEscrow?: PlatformAiProductionEscrow;
    /** Optional only for legacy saves and fixtures; new original briefs persist the lifecycle. */
    commissioningLifecycle?: PlatformAiCommissioningLifecycle | null;
    committedAtAbsoluteWeek: number | null;
    rightsReadyAtAbsoluteWeek: number | null;
    localizationReadyAtAbsoluteWeek: number | null;
    premiereAtAbsoluteWeek: number | null;
    releasePattern: PlatformAiReleasePattern | null;
    releaseEntries: PlatformAiReleaseEntry[];
    /** Optional only at raw-save/fixture boundaries; scheduled plans persist this readiness proof. */
    releaseReadiness?: PlatformAiReleaseReadinessSnapshot | null;
    scheduledAtAbsoluteWeek: number | null;
    releasedAtAbsoluteWeek: number | null;
    industryProductionId: string | null;
    /** First week a production milestone remained unfundable after considering escrow. */
    productionHoldStartedAtAbsoluteWeek?: number | null;
    forecast: { strategic: number; creative: number; commercial: number; prestige: number; risk: number };
}

export interface PlatformAiReleaseMemory {
    projectId: string;
    releasedAtAbsoluteWeek: number;
    genre: Genre;
    targetAudience: TargetAudience;
    leadActorId: string | null;
    directorId: string | null;
    quality: number;
    commercialScore: number;
    prestigeScore: number;
    subscriberImpactMillions: number;
    outcome: PlatformAiStreamingPerformance['outcome'];
    awardWins: number;
    observedAwardKeys: string[];
    regionalResults?: PlatformAiRegionalStreamingPerformance[];
    localizationLevel?: PlatformAiLocalizationLevel;
    releasePattern?: PlatformAiReleasePattern | null;
    productionDelayWeeks?: number;
}

export interface PlatformAiRegionalReleaseBelief {
    releases: number;
    averageCommercialScore: number;
    averageSubscriberImpact: number;
}

export interface PlatformAiLocalizationBelief {
    releases: number;
    averageCommercialScore: number;
    averageReachMultiplier: number;
}

export interface PlatformAiTalentPairBelief {
    releases: number;
    averageCommercialScore: number;
    averagePrestigeScore: number;
}

export interface PlatformAiReleasePatternBelief {
    releases: number;
    averageCommercialScore: number;
    averageEngagementDelta: number;
}

export interface PlatformAiProductionOutcomeMemory {
    observedProductions: number;
    deliveredProductions: number;
    delayedProductions: number;
    cancelledProductions: number;
    averageDelayWeeks: number;
    observedProductionIds: string[];
}

export interface PlatformAiFinanceSnapshot {
    absoluteWeek: number;
    openingCashMillions: number;
    subscriptionRevenueMillions: number;
    advertisingRevenueMillions: number;
    verifiedContractIncomeMillions: number;
    rescueIncomeMillions: number;
    /** Portion of a parent rescue applied directly to principal before cash is replenished. */
    rescueDebtReductionMillions: number;
    externalInvestmentIncomeMillions: number;
    externalInvestmentDebtReductionMillions: number;
    externalInvestmentArrearsReductionMillions: number;
    revenueMillions: number;
    deliveryCostMillions: number;
    baseOperationsCostMillions: number;
    marketOperatingCostMillions: number;
    marketPolicyCostMillions: number;
    partnerRevenueShareCostMillions: number;
    administrationCostMillions: number;
    recurringEfficiency: PlatformAiRecurringEfficiencySnapshot;
    /** Exact current-week PLATFORM_TRADE seller allocations; durable authority is mirrored in the buyer decision ledger. */
    platformTradeRoyaltyAllocations?: PlatformAiTradeRoyaltyAllocation[];
    operatingCostMillions: number;
    contentCostMillions: number;
    researchCostMillions: number;
    technologyCostMillions: number;
    localizationCostMillions: number;
    contractualCostAccruedMillions: number;
    contractualCostMillions: number;
    localizationCostAccruedMillions: number;
    discretionaryCostAccruedMillions: number;
    discretionaryCostMillions: number;
    heldObligations: PlatformAiHeldObligation[];
    /** Recurring mandatory cost accrued before any cash shortfall is financed. */
    mandatoryCostAccruedMillions: number;
    /** Mandatory cost actually settled from cash in the exact reconciliation. */
    mandatoryCostMillions: number;
    settledObligationAccruedMillions: number;
    settledObligationCostMillions: number;
    financingCostAccruedMillions: number;
    financingCostMillions: number;
    unfundedMandatoryCostMillions: number;
    unfundedSettledObligationCostMillions: number;
    unfundedFinancingCostMillions: number;
    operatingNetCashFlowMillions: number;
    debtIncurredMillions: number;
    reserveAllocationMillions: number;
    allocations: PlatformAiReserveAllocation[];
    netCashFlowMillions: number;
    closingCashMillions: number;
    closingDebtMillions: number;
    reserveTargetMillions: number;
    reserveCoverageWeeks: number;
    lossRunwayWeeks: number | null;
    /** Backward-compatible alias for lossRunwayWeeks. */
    runwayWeeks: number | null;
}

export interface PlatformAiTradeRoyaltyAllocation {
    contractId: string;
    sellerPlatformId: string;
    amountMillions: number;
}

export type PlatformAiReserveAllocationType =
    | 'APPROVED_CONTENT'
    | 'APPROVED_RESEARCH'
    | 'DEBT_REDUCTION'
    | 'SHAREHOLDER_DISTRIBUTION';

export interface PlatformAiReserveAllocation {
    type: PlatformAiReserveAllocationType;
    amountMillions: number;
    referenceId: string | null;
}

export type PlatformAiDistressAction =
    | 'FREEZE_GREENLIGHTS'
    | 'PAUSE_RESEARCH'
    | 'HOLD_COMMISSION'
    | 'LICENSE_CATALOGUE'
    | 'WITHDRAW_REGION'
    | 'RESTRUCTURE'
    | 'PARENT_RESCUE'
    | 'EXTERNAL_RECAPITALIZATION'
    | 'BANKRUPTCY_ADMINISTRATION'
    | 'DORMANT';

export type PlatformAiDistressEpisodeStatus =
    | 'ACTIVE'
    | 'MONITORING_RESTRUCTURE'
    | 'MONITORING_RESCUE'
    | 'MONITORING_RECAPITALIZATION'
    | 'ADMINISTRATION'
    | 'RECOVERED'
    | 'DORMANT';

export type PlatformAiDistressStageOutcome = 'PENDING' | 'APPLIED' | 'UNAVAILABLE' | 'FAILED';

export interface PlatformAiDistressStageResult {
    stage: PlatformAiDistressAction;
    outcome: PlatformAiDistressStageOutcome;
    enteredAtAbsoluteWeek: number;
    resolvedAtAbsoluteWeek: number | null;
    reason: string;
    referenceId: string | null;
}

/** Authoritative persisted distress progression. Decision history is presentation only. */
export interface PlatformAiDistressEpisode {
    id: string;
    platformId: PlatformId;
    status: PlatformAiDistressEpisodeStatus;
    startedAtAbsoluteWeek: number;
    completedAtAbsoluteWeek: number | null;
    currentStageIndex: number;
    lastAdvancedAtAbsoluteWeek: number;
    stageResults: PlatformAiDistressStageResult[];
}

export type PlatformAiCatalogueDistressDealStatus = 'PENDING_PAYMENT' | 'TRANSFERRED' | 'CANCELLED';
export type PlatformAiCataloguePaymentDisposition =
    | 'HELD'
    | 'CAPTURED'
    | 'REFUNDED'
    | 'VOIDED'
    | 'INVALID_EVIDENCE';

/** World-level ledger for a cross-platform distress catalogue licence. */
export interface PlatformAiCatalogueDistressDeal {
    id: string;
    episodeId: string;
    sellerPlatformId: PlatformId;
    buyerPlatformId: PlatformId;
    sourceProjectId: string;
    sellerEntitlementId: string;
    /** Canonical parent grant for a sublicense; null when the seller owns the original. */
    sourceContractId: string | null;
    sellerEntitlementExpiresAtAbsoluteWeek: number;
    territory: StreamingLicenseTerritory;
    /** Exact immutable buyer-market scope negotiated at queue time. */
    countryIds: string[];
    windowType: StreamingRightsWindowType;
    priceMillions: number;
    buyerObligationId: string;
    buyerPlanId: string;
    buyerContractId: string;
    durationWeeks: number;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    status: PlatformAiCatalogueDistressDealStatus;
    paymentDisposition: PlatformAiCataloguePaymentDisposition;
    createdAtAbsoluteWeek: number;
    paymentSettledAtAbsoluteWeek: number | null;
    refundedAtAbsoluteWeek: number | null;
    refundedAmountMillions: number;
    transferredAtAbsoluteWeek: number | null;
    cancelledAtAbsoluteWeek: number | null;
    cancellationReason: string | null;
}

export interface PlatformAiDecisionRecord {
    id: string;
    absoluteWeek: number;
    type: string;
    summary: string;
    reason: string;
    cashImpactMillions: number;
    action?: PlatformAiDistressAction | PlatformAiReserveAllocationType;
}

export type PlatformAiExternalCommitmentStatus = 'PENDING_PAYMENT' | 'SETTLED';

/** Canonical payment record for a Platform Wars action that already executed in the market. */
export interface PlatformAiExternalCommitment {
    /** Stable canonical identifier. Equal to the matching one-time obligation identifier. */
    id: string;
    moveId: string;
    obligationId: string;
    platformId: PlatformId;
    moveType: StreamingRivalMoveType;
    /** Immutable tariff table used when the move was created. */
    pricingVersion: number;
    outcome: 'SUCCESS' | 'MISFIRED';
    costMillions: number;
    createdAtAbsoluteWeek: number;
    status: PlatformAiExternalCommitmentStatus;
    settledAtAbsoluteWeek: number | null;
}

export type PlatformAiExternalRecapitalizationStatus =
    | 'OFFERED'
    | 'DECLINED'
    | 'SETTLED'
    | 'FAILED';

export interface PlatformAiSpendingRestrictions {
    source: 'NONE' | 'RESTRUCTURE' | 'PARENT_RESCUE' | 'EXTERNAL_RECAPITALIZATION' | 'ADMINISTRATION';
    blocksNewBids: boolean;
    blocksNewGreenlights: boolean;
    blocksNewResearch: boolean;
    blocksExpansion: boolean;
    expiresAtAbsoluteWeek: number | null;
}

export interface PlatformAiExternalRecapitalization {
    id: string;
    idempotencyKey: string;
    episodeId: string;
    platformId: PlatformId;
    status: PlatformAiExternalRecapitalizationStatus;
    investorArchetype: 'PRIVATE_EQUITY' | 'MEDIA_GROUP' | 'TECH_GROUP' | 'TELECOM_GROUP' | 'SOVEREIGN_FUND';
    offeredMillions: number;
    settledMillions: number;
    arrearsReductionMillions: number;
    debtReductionMillions: number;
    cashRemainderMillions: number;
    dilutionPercent: number;
    autonomyPenalty: number;
    valuationConfidenceMultiplier: number;
    offeredAtAbsoluteWeek: number;
    settledAtAbsoluteWeek: number | null;
    cooldownUntilAbsoluteWeek: number | null;
    reason: string;
}

export interface PlatformAiAdministrationState {
    enteredAtAbsoluteWeek: number;
    episodeId: string;
    outcome: 'PENDING' | 'ACQUISITION_AVAILABLE' | 'REGIONAL_DOWNSIZE' | 'DORMANT';
    resolvedAtAbsoluteWeek: number | null;
    referenceId: string | null;
}

export const PLATFORM_AI_RUNTIME_SCHEMA_VERSION = 11 as const;

export interface PlatformAiRuntimeState {
    schemaVersion: typeof PLATFORM_AI_RUNTIME_SCHEMA_VERSION;
    profileId: PlatformId;
    operatingProfileVersion: number;
    /** First canonical week AI operating advantages were converted to player-standard future terms. */
    playerAcquisitionHandoffAtAbsoluteWeek: number | null;
    competence: PlatformAiCompetence;
    effectiveCompetenceDelta: number;
    lastProcessedAbsoluteWeek: number;
    nextPlanningAbsoluteWeek: number;
    strategyCycle: number;
    status: PlatformAiCompanyStatus;
    capabilities: PlatformAiCapabilities;
    languageCapabilities: PlatformAiLanguageCapability[];
    researchQueue: PlatformAiResearchItem[];
    marketOperations: OwnedStreamingMarketOperation[];
    slate: PlatformAiContentPlan[];
    rightsContracts: OwnedStreamingCatalogLicense[];
    talentBookingRefs: string[];
    releaseMemory: PlatformAiReleaseMemory[];
    genreMemory: Partial<Record<Genre, { releases: number; averageQuality: number; averageCommercialScore: number }>>;
    audienceMemory: Partial<Record<TargetAudience, { releases: number; averageCommercialScore: number; averageSubscriberImpact: number }>>;
    regionalMemory: Record<string, PlatformAiRegionalReleaseBelief>;
    localizationMemory: Partial<Record<PlatformAiLocalizationLevel, PlatformAiLocalizationBelief>>;
    talentPairMemory: Record<string, PlatformAiTalentPairBelief>;
    releasePatternMemory: Partial<Record<PlatformAiReleasePattern, PlatformAiReleasePatternBelief>>;
    productionOutcomeMemory: PlatformAiProductionOutcomeMemory;
    financeHistory: PlatformAiFinanceSnapshot[];
    decisionHistory: PlatformAiDecisionRecord[];
    distressEpisodes: PlatformAiDistressEpisode[];
    externalRecapitalizations: PlatformAiExternalRecapitalization[];
    administration: PlatformAiAdministrationState | null;
    spendingRestrictions: PlatformAiSpendingRestrictions;
    externalCommitments: PlatformAiExternalCommitment[];
    pendingOneTimeObligations: PlatformAiPendingOneTimeObligation[];
    localizationJobs: PlatformAiLocalizationJob[];
    rightsRenewals: PlatformAiRightsRenewalRecord[];
    pendingAudienceSettlements: PlatformAiAudienceSettlement[];
    audienceHealth: PlatformAiAudienceHealth;
    worldEconomyFeedback?: PlatformAiWorldEconomyFeedback;
    debtMillions: number;
    lastRescueAbsoluteWeek: number | null;
    rescueCount: number;
    standaloneValuationBillions: number;
    healthyOperatingWeeks: number;
    restructuringStartedAtAbsoluteWeek: number | null;
    restructuringFailedAtAbsoluteWeek: number | null;
    restructuringInterestRateMultiplier: number;
    debtInterestRateAnnualPercent: number;
    outstandingApprovedContentMillions?: number;
    outstandingApprovedResearchMillions?: number;
    intelligence?: IndustryIntelligenceState;
}

export interface PlatformState {
    id: PlatformId;
    name: string;
    subscribers: number; // in millions
    valuation: number; // in billions
    reputation: number; // 0-100
    cashReserve: number; // in millions
    recentHits: number;
    color: string;
    churnRate: 'FAST' | 'MEDIUM' | 'SLOW';
    ai?: PlatformAiRuntimeState;
}

export interface NPCStudioState {
    id: StudioId;
    name: string;
    valuation: number; // in billions
    reputation: number; // 0-100
    cashReserve: number; // in millions
    recentHits: number;
    archetype: string;
    projectsReleased?: number;
    hits?: number;
    flops?: number;
    slateMomentum?: number;
    lastReleaseTitle?: string;
    lastReleaseWeek?: number;
    lastReleaseYear?: number;
    lifetimeBoxOffice?: number;
    lifetimeProfit?: number;
    ownerNpcId?: string;
    ownerName?: string;
    isNpcVenture?: boolean;
    ai?: StudioAiRuntimeState;
}

export const STUDIO_AI_RUNTIME_SCHEMA_VERSION = 1 as const;

export type StudioAiController = 'AI' | 'PLAYER';
export type StudioAiCompanyStatus = 'ACTIVE' | 'DISTRESSED' | 'RESTRUCTURING' | 'DORMANT' | 'SOLD_MERGED' | 'CLOSED';
export type StudioAiOrigin = 'ESTABLISHED' | 'REGIONAL' | 'GENERATED' | 'PLATFORM_OWNED' | 'PLAYER_FOUNDED';
export type StudioAiStrategy = 'BALANCED' | 'PRESTIGE' | 'COMMERCIAL' | 'FRANCHISE' | 'GENRE_SPECIALIST' | 'CREATOR_LED';
export type StudioAiLaunchClass = 'ESTABLISHED_MAJOR' | 'ESTABLISHED_LABEL' | 'BOOTSTRAPPED_BOUTIQUE' | 'FOUNDER_BACKED' | 'INVESTOR_BACKED' | 'BREAKOUT_COMPANY' | 'STRATEGIC_SPINOUT' | 'MAJOR_CHALLENGER';

export interface StudioAiCompetence {
    development: number;
    creative: number;
    finance: number;
    production: number;
    marketing: number;
    distribution: number;
    negotiation: number;
    talentRelations: number;
}

export interface StudioAiProfile {
    strategy: StudioAiStrategy;
    launchClass: StudioAiLaunchClass;
    riskTolerance: number;
    budgetAppetite: number;
    creativePatience: number;
    franchiseDependence: number;
    prestigeAmbition: number;
    financialDiscipline: number;
}

export interface StudioAiFinanceState {
    debtPrincipalMillions: number;
    weeklyOperatingCostMillions: number;
    committedSpendMillions: number;
    runwayWeeks: number;
    consecutiveLossWeeks: number;
    restructuringStartedAtAbsoluteWeek: number | null;
}

export interface StudioAiCapacityState {
    developmentSlots: number;
    productionSlots: number;
    releaseSlotsPerQuarter: number;
    committedDevelopmentSlots: number;
    committedProductionSlots: number;
}

export type StudioAiSlateStatus = 'DEVELOPING' | 'REWRITE' | 'ON_HOLD' | 'GREENLIT' | 'HANDED_OFF' | 'TURNAROUND' | 'ABANDONED' | 'CANCELLED';
export type StudioAiSlateSource = 'INDEPENDENT' | 'COMMISSION';

export interface StudioAiSlateScores {
    creative: number;
    commercial: number;
    prestige: number;
    execution: number;
    financialRisk: number;
    greenlightConfidence: number;
}

export interface StudioAiSlateCommitment {
    id: string;
    proposalId: string;
    proposalKey: string;
    fingerprintId: string;
    source: StudioAiSlateSource;
    industryProductionId?: string;
    commissioningPlatformId?: PlatformId;
    status: StudioAiSlateStatus;
    createdAtAbsoluteWeek: number;
    updatedAtAbsoluteWeek: number;
    nextReviewAbsoluteWeek: number | null;
    developmentSpendMillions: number;
    rewriteCount: number;
    proposedBudgetMillions: number;
    proposalSnapshot?: {
        confidence: number;
        affordabilityCeilingMillions: number;
        score: IndustryIntelligenceScore;
        uncertaintyKey: string;
    };
    greenlightBudgetMillions?: number;
    greenlitAtAbsoluteWeek?: number;
    scores?: StudioAiSlateScores;
    legacyReleaseConsumedAtAbsoluteWeek?: number;
}

export interface StudioAiSlateState {
    schemaVersion: 1;
    activatedAtAbsoluteWeek: number;
    legacyProjectOriginRetiredAtAbsoluteWeek: number;
    commitments: StudioAiSlateCommitment[];
    processedProposalKeys: string[];
    processedReviewKeys: string[];
}

export type StudioAiLedgerCategory = 'CATALOGUE_OPERATIONS' | 'DEVELOPMENT' | 'REWRITE' | 'PRODUCTION' | 'RELEASE_MARKETING' | 'RIGHTS_INCOME' | 'TURNAROUND' | 'OPERATING_COST' | 'DEBT_SERVICE' | 'PROJECT_OUTCOME' | 'SHORTFALL_BORROWING' | 'OWNERSHIP_HANDOFF';

export interface StudioAiLedgerEntry {
    id: string;
    absoluteWeek: number;
    category: StudioAiLedgerCategory;
    amountMillions: number;
    balanceAfterMillions: number;
    description: string;
}

export interface StudioAiEventRecord {
    id: string;
    absoluteWeek: number;
    type: 'MIGRATED' | 'STATUS_CHANGED' | 'OWNERSHIP_CHANGED' | 'VENTURE_SYNCED';
    summary: string;
}

export interface StudioAiDecisionRecord {
    id: string;
    absoluteWeek: number;
    type: 'FOUNDATION_WEEK' | 'OWNERSHIP_HANDOFF';
    summary: string;
}

export interface StudioAiRuntimeState {
    schemaVersion: typeof STUDIO_AI_RUNTIME_SCHEMA_VERSION;
    studioId: StudioId;
    origin: StudioAiOrigin;
    controller: StudioAiController;
    status: StudioAiCompanyStatus;
    seed: string;
    profile: StudioAiProfile;
    competence: StudioAiCompetence;
    finance: StudioAiFinanceState;
    capacity: StudioAiCapacityState;
    ledger: StudioAiLedgerEntry[];
    decisions: StudioAiDecisionRecord[];
    events: StudioAiEventRecord[];
    /** Temporary compatibility payload while the older venture scheduler is retired in B2-B5. */
    legacyVenture?: NpcVentureState;
    migrationKeys: string[];
    handoffKeys: string[];
    lastProcessedAbsoluteWeek: number;
    intelligence?: IndustryIntelligenceState;
    /** B5 compact private development and greenlight slate. */
    slate?: StudioAiSlateState;
}

export type NpcVentureArchetype = 'PRESTIGE_LABEL' | 'COMMERCIAL_STUDIO' | 'GENRE_HOUSE' | 'CREATOR_MEDIA' | 'AWARDS_BOUTIQUE';
export type NpcVentureStatus = 'ACTIVE' | 'CLOSED';

export interface NpcVentureProjectHistory {
    id: string;
    title: string;
    week: number;
    year: number;
    budgetTier: BudgetTier;
    quality: number;
    revenue: number;
    profit: number;
    outcome: 'HIT' | 'SOLID' | 'FLOP';
}

export interface NpcVentureState {
    id: string;
    name: string;
    ownerNpcId: string;
    ownerName: string;
    archetype: NpcVentureArchetype;
    status: NpcVentureStatus;
    valuation: number; // in billions
    cashReserve: number; // in millions
    hype: number;
    reputation: number;
    creativeQuality: number;
    risk: number;
    foundedWeek: number;
    foundedYear: number;
    lastProjectWeek: number;
    nextProjectWeek: number;
    projectsReleased: number;
    hits: number;
    flops: number;
    history: NpcVentureProjectHistory[];
    closureReason?: string;
}

export type WorldPopulationRegionId =
    | 'NORTH_AMERICA'
    | 'SOUTH_AMERICA'
    | 'EUROPE'
    | 'AFRICA'
    | 'ASIA'
    | 'OCEANIA';

export type WorldPopulationAgeBandId =
    | 'CHILD'
    | 'TEEN'
    | 'YOUNG_ADULT'
    | 'ADULT'
    | 'OLDER';

export type WorldPopulationIncomeBandId =
    | 'SUBSISTENCE'
    | 'WORKING'
    | 'MIDDLE'
    | 'AFFLUENT'
    | 'WEALTHY'
    | 'ULTRA_WEALTHY';

export type WorldCountryDevelopmentProfile = 'LOW' | 'EMERGING' | 'DEVELOPED' | 'ADVANCED';

export interface WorldPopulationMacroState {
    purchasingPowerIndex: number;
    inflationPressure: number;
    unemploymentPressure: number;
    consumerConfidence: number;
    inequalityIndex: number;
    annualPopulationGrowthPercent: number;
}

export interface WorldPopulationCountryState {
    id: string;
    name: string;
    regionId: WorldPopulationRegionId;
    developmentProfile: WorldCountryDevelopmentProfile;
    languages: string[];
    population: number;
    households: number;
    averageHouseholdSize: number;
    ageBands: Record<WorldPopulationAgeBandId, number>;
    incomeBands: Record<WorldPopulationIncomeBandId, number>;
    urbanPercent: number;
    reliableInternetPercent: number;
    smartphoneAccessPercent: number;
    homeScreenAccessPercent: number;
    digitalPaymentAccessPercent: number;
    cinemaAccessPercent: number;
    macro: WorldPopulationMacroState;
    lastDemographicYear: number;
    lastMacroPeriod: number;
}

export interface WorldPopulationRegionSummary {
    id: WorldPopulationRegionId;
    population: number;
    households: number;
    countryCount: number;
}

export interface WorldPopulationGlobalSummary {
    population: number;
    households: number;
    countryCount: number;
    weightedUrbanPercent: number;
    weightedReliableInternetPercent: number;
    weightedDigitalPaymentAccessPercent: number;
    weightedCinemaAccessPercent: number;
}

export interface WorldPopulationSnapshot {
    absoluteWeek: number;
    population: number;
    households: number;
    weightedPurchasingPowerIndex: number;
    weightedConsumerConfidence: number;
}

export interface WorldPopulationState {
    schemaVersion: 1;
    epochAbsoluteWeek: number;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    countries: Record<string, WorldPopulationCountryState>;
    regions: Record<WorldPopulationRegionId, WorldPopulationRegionSummary>;
    global: WorldPopulationGlobalSummary;
    snapshots: WorldPopulationSnapshot[];
}

export type WorldAudiencePersonaId =
    | 'FAMILY_HOUSEHOLDS'
    | 'VALUE_SEEKERS'
    | 'FANDOM_LOYALISTS'
    | 'PRESTIGE_EXPLORERS'
    | 'LOCAL_FIRST'
    | 'HABIT_STREAMERS';

export type WorldAudienceLifeStageId =
    | 'YOUTH'
    | 'YOUNG_ADULT'
    | 'FAMILY'
    | 'ADULT'
    | 'MATURE';

export type WorldAudiencePersonaAffinity = [number, number, number, number, number, number];

export interface WorldAudienceCohortState {
    id: string;
    primaryPersonaId: WorldAudiencePersonaId;
    incomeBandId: WorldPopulationIncomeBandId;
    lifeStageId: WorldAudienceLifeStageId;
    households: number;
    people: number;
    entertainmentAppetiteIndex: number;
    priceSensitivityIndex: number;
    accessReadinessIndex: number;
    localLanguageAffinityIndex: number;
    legalConsumptionIndex: number;
    sharingTendencyIndex: number;
    piracyTendencyIndex: number;
    monthlyEntertainmentBudgetPerHousehold: number;
    totalMonthlyEntertainmentBudget: number;
    personaAffinity: WorldAudiencePersonaAffinity;
}

export interface WorldAudienceCountryState {
    id: string;
    population: number;
    households: number;
    commercialPopulation: number;
    commercialHouseholds: number;
    nonParticipantPopulation: number;
    nonParticipantHouseholds: number;
    averageMonthlyEntertainmentBudget: number;
    totalMonthlyEntertainmentBudget: number;
    budgetPressureIndex: number;
    personaShares: Record<WorldAudiencePersonaId, number>;
    cohorts: WorldAudienceCohortState[];
    lastMacroPeriod: number;
}

export interface WorldAudienceGlobalSummary {
    population: number;
    households: number;
    commercialPopulation: number;
    commercialHouseholds: number;
    nonParticipantPopulation: number;
    nonParticipantHouseholds: number;
    averageMonthlyEntertainmentBudget: number;
    totalMonthlyEntertainmentBudget: number;
    cohortCount: number;
    countryCount: number;
}

export interface WorldAudienceEconomySnapshot {
    absoluteWeek: number;
    commercialHouseholds: number;
    nonParticipantHouseholds: number;
    averageMonthlyEntertainmentBudget: number;
    totalMonthlyEntertainmentBudget: number;
}

export interface WorldAudienceEconomyState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    countries: Record<string, WorldAudienceCountryState>;
    global: WorldAudienceGlobalSummary;
    snapshots: WorldAudienceEconomySnapshot[];
}

export type WorldAudienceParticipationBarrierId =
    | 'CONNECTIVITY'
    | 'DEVICE_ACCESS'
    | 'PAYMENT_ACCESS'
    | 'AFFORDABILITY'
    | 'CINEMA_ACCESS'
    | 'TRAVEL_ACCESS'
    | 'LANGUAGE_ACCESS'
    | 'LEISURE_TIME'
    | 'LOW_INTEREST'
    | 'NONE';

export interface WorldAudienceParticipationCohortState {
    cohortId: string;
    streamingEligibilityIndex: number;
    streamingInterestIndex: number;
    cinemaEligibilityIndex: number;
    cinemaInterestIndex: number;
    streamingOnlyHouseholds: number;
    cinemaOnlyHouseholds: number;
    dualParticipantHouseholds: number;
    neitherHouseholds: number;
    totalMonthlyStreamingBudget: number;
    totalMonthlyCinemaBudget: number;
    totalMonthlyOtherEntertainmentBudget: number;
    totalMonthlyUncommittedBudget: number;
    streamingBarrierId: WorldAudienceParticipationBarrierId;
    streamingBarrierIndex: number;
    cinemaBarrierId: WorldAudienceParticipationBarrierId;
    cinemaBarrierIndex: number;
}

export interface WorldAudienceParticipationCountryState {
    id: string;
    population: number;
    households: number;
    commercialHouseholds: number;
    nonParticipantHouseholds: number;
    streamingOnlyHouseholds: number;
    cinemaOnlyHouseholds: number;
    dualParticipantHouseholds: number;
    commercialNeitherHouseholds: number;
    neitherHouseholds: number;
    streamingReachableHouseholds: number;
    cinemaReachableHouseholds: number;
    totalMonthlyStreamingBudget: number;
    totalMonthlyCinemaBudget: number;
    totalMonthlyOtherEntertainmentBudget: number;
    totalMonthlyUncommittedBudget: number;
    topStreamingBarrierId: WorldAudienceParticipationBarrierId;
    topCinemaBarrierId: WorldAudienceParticipationBarrierId;
    cohorts: WorldAudienceParticipationCohortState[];
    lastMacroPeriod: number;
}

export interface WorldAudienceParticipationGlobalSummary {
    population: number;
    households: number;
    commercialHouseholds: number;
    nonParticipantHouseholds: number;
    streamingOnlyHouseholds: number;
    cinemaOnlyHouseholds: number;
    dualParticipantHouseholds: number;
    commercialNeitherHouseholds: number;
    neitherHouseholds: number;
    streamingReachableHouseholds: number;
    cinemaReachableHouseholds: number;
    totalMonthlyStreamingBudget: number;
    totalMonthlyCinemaBudget: number;
    totalMonthlyOtherEntertainmentBudget: number;
    totalMonthlyUncommittedBudget: number;
    cohortCount: number;
    countryCount: number;
}

export interface WorldAudienceParticipationSnapshot {
    absoluteWeek: number;
    streamingReachableHouseholds: number;
    cinemaReachableHouseholds: number;
    dualParticipantHouseholds: number;
    neitherHouseholds: number;
}

export interface WorldAudienceParticipationState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    countries: Record<string, WorldAudienceParticipationCountryState>;
    global: WorldAudienceParticipationGlobalSummary;
    snapshots: WorldAudienceParticipationSnapshot[];
}

export interface WorldStreamingPlanOffer {
    id: string;
    name: string;
    monthlyPrice: number;
    effectiveMonthlyPrice: number;
    featureIds: string[];
    ads: boolean;
    appealIndex: number;
}

export interface WorldStreamingPlatformOffer {
    platformId: string;
    name: string;
    isPlayer: boolean;
    activeCountryIds: string[];
    plans: WorldStreamingPlanOffer[];
    annualDiscountPercent: number;
    introOfferPercent: number;
    catalogueStrengthIndex: number;
    localizationStrengthIndex: number;
    reputationIndex: number;
    reliabilityIndex: number;
    marketingIndex: number;
    loyaltyIndex: number;
    countryMomentum: Record<string, number>;
    preferredGenres: Genre[];
    sourceFingerprint: string;
}

export interface WorldStreamingOfferRegistry {
    schemaVersion: 1;
    absoluteWeek: number;
    offers: WorldStreamingPlatformOffer[];
    byCountry: Record<string, string[]>;
    fingerprint: string;
}

export interface WorldStreamingPlanAllocation {
    planId: string;
    planName: string;
    households: number;
    effectiveMonthlyPrice: number;
    monthlySubscriptionRevenue: number;
}

export interface WorldStreamingPlatformAllocation {
    platformId: string;
    platformName: string;
    households: number;
    primaryHouseholds: number;
    monthlySubscriptionRevenue: number;
    planAllocations: WorldStreamingPlanAllocation[];
    strongestDriver: string;
}

export interface WorldStreamingCompetitionCountryState {
    countryId: string;
    streamingReachableHouseholds: number;
    subscribingHouseholds: number;
    unclaimedHouseholds: number;
    totalSubscriptions: number;
    totalMonthlyStreamingBudget: number;
    totalMonthlySubscriptionSpend: number;
    evaluatedCohortCount: number;
    eligiblePlatformCount: number;
    platformAllocations: WorldStreamingPlatformAllocation[];
}

export interface WorldStreamingCompetitionGlobalSummary {
    streamingReachableHouseholds: number;
    subscribingHouseholds: number;
    unclaimedHouseholds: number;
    totalSubscriptions: number;
    totalMonthlyStreamingBudget: number;
    totalMonthlySubscriptionSpend: number;
    playerHouseholds: number;
    playerPrimaryHouseholds: number;
    playerMonthlySubscriptionRevenue: number;
    playerPlanAllocations: WorldStreamingPlanAllocation[];
    playerOfferPresent: boolean;
    countryCount: number;
    offerCount: number;
}

export interface WorldStreamingCompetitionSnapshot {
    absoluteWeek: number;
    subscribingHouseholds: number;
    totalSubscriptions: number;
    playerHouseholds: number;
    playerMonthlySubscriptionRevenue: number;
}

export interface WorldStreamingCompetitionState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    sourceFingerprint: string;
    countries: Record<string, WorldStreamingCompetitionCountryState>;
    global: WorldStreamingCompetitionGlobalSummary;
    snapshots: WorldStreamingCompetitionSnapshot[];
}

export type WorldStreamingCustomerMovementKind =
    | 'JOIN'
    | 'CANCEL'
    | 'REACTIVATE'
    | 'UPGRADE'
    | 'DOWNGRADE'
    | 'SWITCH'
    | 'ADD_SECONDARY'
    | 'DROP_SECONDARY';

export type WorldStreamingCustomerReasonId =
    | 'PRICE'
    | 'PLAN_VALUE'
    | 'CATALOGUE'
    | 'RELEASE'
    | 'LOCALIZATION'
    | 'RELIABILITY'
    | 'MARKETING'
    | 'COMPETITOR'
    | 'PROMO_EXPIRY'
    | 'ROTATION'
    | 'ECONOMY'
    | 'SHARING_POLICY'
    | 'PIRACY_ACCESS'
    | 'OTHER';

export type StreamingSharingPosture = 'REACH_FIRST' | 'BALANCED' | 'HOUSEHOLD_ONLY';
export type StreamingEnforcementInvestment = 'LIGHT' | 'STANDARD' | 'AGGRESSIVE';

export interface WorldStreamingCustomerAccessPolicy {
    sharingPosture: StreamingSharingPosture;
    enforcementInvestment: StreamingEnforcementInvestment;
    source: 'LEADERSHIP_DEFAULT' | 'PLAYER_ACTION';
    updatedAtAbsoluteWeek: number;
}

export interface WorldStreamingCustomerPlanCell {
    platformId: string;
    platformName: string;
    planId: string;
    planName: string;
    paidAccounts: number;
    primaryHouseholds: number;
    effectiveMonthlyPrice: number;
    monthlySubscriptionRevenue: number;
    tenureNewAccounts: number;
    tenureEstablishedAccounts: number;
    tenureLoyalAccounts: number;
    externalSharedHouseholds: number;
    sharedActiveViewers: number;
    piracyReach: number;
    accessLoadAccounts: number;
}

export interface WorldStreamingCustomerLapsedCell {
    platformId: string;
    planId: string;
    households: number;
    lastActiveAbsoluteWeek: number;
}

export interface WorldStreamingCustomerCohortState {
    cohortId: string;
    reachableHouseholds: number;
    payingHouseholds: number;
    profiles: number;
    activeViewers: number;
    externalSharedHouseholds: number;
    sharedActiveViewers: number;
    piracyReach: number;
    accessLoadAccounts: number;
    planCells: WorldStreamingCustomerPlanCell[];
    lapsedCells: WorldStreamingCustomerLapsedCell[];
}

export interface WorldStreamingCustomerMovement {
    id: string;
    absoluteWeek: number;
    countryId: string;
    cohortId: string;
    kind: WorldStreamingCustomerMovementKind;
    households: number;
    sourcePlatformId: string | null;
    destinationPlatformId: string | null;
    fromPlanId: string | null;
    toPlanId: string | null;
    reasonId: WorldStreamingCustomerReasonId;
}

export interface WorldStreamingCustomerPlanSummary {
    planId: string;
    planName: string;
    paidAccounts: number;
    effectiveMonthlyPrice: number;
    monthlySubscriptionRevenue: number;
}

export interface WorldStreamingCustomerPlatformSummary {
    platformId: string;
    platformName: string;
    startingPaidAccounts: number;
    endingPaidAccounts: number;
    payingHouseholds: number;
    joins: number;
    cancellations: number;
    reactivations: number;
    upgrades: number;
    downgrades: number;
    switchIns: number;
    switchOuts: number;
    externalSharedHouseholds: number;
    sharedActiveViewers: number;
    piracyReach: number;
    accessLoadAccounts: number;
    monthlySubscriptionRevenue: number;
    planAllocations: WorldStreamingCustomerPlanSummary[];
    strongestReasonId: WorldStreamingCustomerReasonId;
}

export interface WorldStreamingCustomerCountryState {
    countryId: string;
    reachableHouseholds: number;
    startingPaidAccounts: number;
    endingPaidAccounts: number;
    payingHouseholds: number;
    profiles: number;
    activeViewers: number;
    joins: number;
    cancellations: number;
    reactivations: number;
    upgrades: number;
    downgrades: number;
    switchIns: number;
    switchOuts: number;
    externalSharedHouseholds: number;
    sharedActiveViewers: number;
    piracyReach: number;
    accessLoadAccounts: number;
    monthlySubscriptionRevenue: number;
    cohorts: WorldStreamingCustomerCohortState[];
    platformSummaries: WorldStreamingCustomerPlatformSummary[];
}

export interface WorldStreamingCustomerGlobalSummary {
    reachableHouseholds: number;
    startingPaidAccounts: number;
    endingPaidAccounts: number;
    payingHouseholds: number;
    profiles: number;
    activeViewers: number;
    joins: number;
    cancellations: number;
    reactivations: number;
    upgrades: number;
    downgrades: number;
    switchIns: number;
    switchOuts: number;
    externalSharedHouseholds: number;
    sharedActiveViewers: number;
    piracyReach: number;
    accessLoadAccounts: number;
    monthlySubscriptionRevenue: number;
    playerStartingPaidAccounts: number;
    playerEndingPaidAccounts: number;
    playerPayingHouseholds: number;
    playerJoins: number;
    playerCancellations: number;
    playerReactivations: number;
    playerUpgrades: number;
    playerDowngrades: number;
    playerSwitchIns: number;
    playerSwitchOuts: number;
    playerExternalSharedHouseholds: number;
    playerSharedActiveViewers: number;
    playerPiracyReach: number;
    playerAccessLoadAccounts: number;
    playerMonthlySubscriptionRevenue: number;
    playerPlanAllocations: WorldStreamingCustomerPlanSummary[];
    playerOfferPresent: boolean;
    countryCount: number;
    platformCount: number;
}

export interface WorldStreamingCustomerSnapshot {
    absoluteWeek: number;
    endingPaidAccounts: number;
    payingHouseholds: number;
    externalSharedHouseholds: number;
    piracyReach: number;
    playerEndingPaidAccounts: number;
    playerMonthlySubscriptionRevenue: number;
}

export interface WorldStreamingCustomerState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    sourceFingerprint: string;
    playerAccessPolicy: WorldStreamingCustomerAccessPolicy;
    countries: Record<string, WorldStreamingCustomerCountryState>;
    global: WorldStreamingCustomerGlobalSummary;
    recentMovements: WorldStreamingCustomerMovement[];
    snapshots: WorldStreamingCustomerSnapshot[];
}

export interface WorldStreamingViewingDiscoveryMix {
    homepagePercent: number;
    recommendationsPercent: number;
    searchPercent: number;
    directPercent: number;
    marketingPercent: number;
    externalBuzzPercent: number;
}

export interface WorldStreamingViewingAccessMix {
    paidViewingAccounts: number;
    sharedViewingAccounts: number;
    piracyViewingAccounts: number;
}

export interface WorldStreamingViewingRevenue {
    attributedSubscriptionRevenue: number;
    advertisingImpressions: number;
    advertisingRevenue: number;
    premiumTransactions: number;
    premiumRevenue: number;
    rentalTransactions: number;
    rentalRevenue: number;
    purchaseTransactions: number;
    purchaseRevenue: number;
    sponsorshipImpressions: number;
    sponsorshipRevenue: number;
    totalIncrementalRevenue: number;
}

export interface WorldStreamingViewingCountryTitleState {
    projectId: string;
    title: string;
    countryId: string;
    viewingAccounts: number;
    estimatedViewers: number;
    starts: number;
    hoursViewed: number;
    completionRate: number;
    repeatViewingRate: number;
    abandonmentRate: number;
    accessMix: WorldStreamingViewingAccessMix;
    revenue: WorldStreamingViewingRevenue;
}

export interface WorldStreamingViewingTitleState {
    projectId: string;
    title: string;
    source: StreamingSlateEntrySource;
    projectType: ProjectType;
    genre: string;
    weeksAvailable: number;
    viewingAccounts: number;
    estimatedViewers: number;
    starts: number;
    hoursViewed: number;
    completionRate: number;
    repeatViewingRate: number;
    abandonmentRate: number;
    satisfactionScore: number;
    acquisitionAttributedAccounts: number;
    retentionAttributedAccounts: number;
    accessMix: WorldStreamingViewingAccessMix;
    discoveryMix: WorldStreamingViewingDiscoveryMix;
    revenue: WorldStreamingViewingRevenue;
    topCountryId: string | null;
    countryPerformance: WorldStreamingViewingCountryTitleState[];
}

export interface WorldStreamingViewingPlatformSummary {
    platformId: string;
    platformName: string;
    totalViewingAccounts: number;
    estimatedViewers: number;
    totalStarts: number;
    totalHoursViewed: number;
    averageCompletionRate: number;
    averageRepeatViewingRate: number;
    unmetDemandAccounts: number;
    accessMix: WorldStreamingViewingAccessMix;
    revenue: WorldStreamingViewingRevenue;
    streamLoadAccounts: number;
    titlePerformance: WorldStreamingViewingTitleState[];
}

export interface WorldStreamingViewingCountryPlatformSummary {
    platformId: string;
    platformName: string;
    totalViewingAccounts: number;
    estimatedViewers: number;
    totalStarts: number;
    totalHoursViewed: number;
    unmetDemandAccounts: number;
    accessMix: WorldStreamingViewingAccessMix;
    revenue: WorldStreamingViewingRevenue;
}

export interface WorldStreamingViewingCountryState {
    countryId: string;
    accessibleAccounts: number;
    totalViewingAccounts: number;
    estimatedViewers: number;
    totalStarts: number;
    totalHoursViewed: number;
    unmetDemandAccounts: number;
    accessMix: WorldStreamingViewingAccessMix;
    revenue: WorldStreamingViewingRevenue;
    titlePerformance: WorldStreamingViewingCountryTitleState[];
    platformPerformance?: Record<string, WorldStreamingViewingCountryPlatformSummary>;
}

export interface WorldStreamingViewingGlobalSummary {
    totalViewingAccounts: number;
    estimatedViewers: number;
    totalStarts: number;
    totalHoursViewed: number;
    unmetDemandAccounts: number;
    accessMix: WorldStreamingViewingAccessMix;
    revenue: WorldStreamingViewingRevenue;
    platformCount: number;
    countryCount: number;
    titleCount: number;
}

export interface WorldStreamingViewingSnapshot {
    absoluteWeek: number;
    totalViewingAccounts: number;
    totalHoursViewed: number;
    unmetDemandAccounts: number;
    incrementalRevenue: number;
}

export interface WorldStreamingViewingState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    sourceFingerprint: string;
    countries: Record<string, WorldStreamingViewingCountryState>;
    platforms: Record<string, WorldStreamingViewingPlatformSummary>;
    global: WorldStreamingViewingGlobalSummary;
    snapshots: WorldStreamingViewingSnapshot[];
}

export interface WorldStreamingPlatformOperatingCostPolicy {
    controller: 'AI' | 'PLAYER';
    policyVersion: 1;
    standardCostMultiplier: 1;
    appliedCostMultiplier: number;
    aiAssistanceActive: boolean;
}

export interface WorldStreamingPlatformCountryEconomy {
    countryId: string;
    endingPaidAccounts: number;
    payingHouseholds: number;
    monthlySubscriptionRevenue: number;
    viewingAccounts: number;
    hoursViewed: number;
    joinAccounts: number;
    cancellationAccounts: number;
}

export interface WorldStreamingPlatformStrategySignals {
    audienceMomentum: number;
    churnPressure: number;
    viewingDepth: number;
    unmetDemandPressure: number;
    revenuePerPaidAccount: number;
    strongestCountryId: string | null;
}

export interface WorldStreamingPlatformEconomySummary {
    platformId: string;
    platformName: string;
    controller: 'AI' | 'PLAYER';
    endingPaidAccounts: number;
    payingHouseholds: number;
    joins: number;
    cancellations: number;
    reactivations: number;
    sharedActiveViewers: number;
    piracyReach: number;
    viewingAccounts: number;
    estimatedViewers: number;
    hoursViewed: number;
    unmetDemandAccounts: number;
    monthlySubscriptionRevenue: number;
    weeklySubscriptionRevenue: number;
    weeklyIncrementalRevenue: number;
    weeklyRevenue: number;
    standardWeeklyOperatingCost: number;
    appliedWeeklyOperatingCost: number;
    weeklyOperatingResult: number;
    operatingCostPolicy: WorldStreamingPlatformOperatingCostPolicy;
    countryEconomy: WorldStreamingPlatformCountryEconomy[];
    strategySignals: WorldStreamingPlatformStrategySignals;
}

export interface WorldStreamingPlatformEconomyGlobalSummary {
    platformCount: number;
    endingPaidAccounts: number;
    payingHouseholds: number;
    viewingAccounts: number;
    hoursViewed: number;
    monthlySubscriptionRevenue: number;
    weeklySubscriptionRevenue: number;
    weeklyIncrementalRevenue: number;
    weeklyRevenue: number;
    standardWeeklyOperatingCost: number;
    appliedWeeklyOperatingCost: number;
    weeklyOperatingResult: number;
}

export interface WorldStreamingPlatformEconomySnapshot {
    absoluteWeek: number;
    platformCount: number;
    endingPaidAccounts: number;
    viewingAccounts: number;
    weeklyRevenue: number;
    weeklyOperatingResult: number;
}

export interface WorldStreamingPlatformEconomyHistoryEntry {
    absoluteWeek: number;
    controller: 'AI' | 'PLAYER';
    endingPaidAccounts: number;
    viewingAccounts: number;
    hoursViewed: number;
    weeklyRevenue: number;
    weeklyOperatingResult: number;
}

export interface WorldStreamingPlatformEconomyState {
    schemaVersion: 1;
    initializedAtAbsoluteWeek: number;
    lastProcessedAbsoluteWeek: number;
    sourceFingerprint: string;
    platforms: Record<string, WorldStreamingPlatformEconomySummary>;
    global: WorldStreamingPlatformEconomyGlobalSummary;
    snapshots: WorldStreamingPlatformEconomySnapshot[];
    historyByPlatform: Record<string, WorldStreamingPlatformEconomyHistoryEntry[]>;
}

export interface WorldState {
    projects: IndustryProject[];
    trendingGenre: Genre;
    universes: Record<UniverseId, Universe>;
    famousMoviesReleased: string[];
    awardHistory: AwardHistoryEntry[];
    upcomingRivals: IndustryProject[];
    platforms?: Record<PlatformId, PlatformState>;
    studios?: Record<StudioId, NPCStudioState>;
    talentBookings?: IndustryTalentBooking[];
    industryProductions?: Record<string, IndustryProductionCommitment>;
    platformAiPlayerCommissionOffers?: Record<string, PlatformAiPlayerCommissionOffer>;
    platformAiCatalogueDistressDeals?: PlatformAiCatalogueDistressDeal[];
    streamingRightsContracts?: StreamingRightsContractRegistry;
    streamingRightsTransactions?: StreamingRightsTransactionRegistry;
    streamingRightsCalendar?: StreamingRightsCalendarState;
    streamingRightsOffice?: StreamingRightsOfficeState;
    streamingBiddingSessions?: StreamingBiddingSessionRegistry;
    streamingCataloguePackages?: StreamingCataloguePackageRegistry;
    streamingCataloguePackageDigests?: StreamingCataloguePackageDigest[];
    streamingCataloguePackagesLastProcessedWeek?: number;
    streamingRoyaltySettlements?: StreamingRoyaltySettlementRegistry;
    streamingPlatformEcosystem?: StreamingPlatformEcosystemState;
    industryEvents?: IndustryEventLedgerState;
    industryMedia?: IndustryMediaWorldState;
    npcVentures?: Record<string, NpcVentureState>;
    npcVentureLastProcessedAbsoluteWeek?: number;
    musicIndustry?: MusicIndustryState;
    worldPopulation?: WorldPopulationState;
    worldAudienceEconomy?: WorldAudienceEconomyState;
    worldAudienceParticipation?: WorldAudienceParticipationState;
    worldStreamingCompetition?: WorldStreamingCompetitionState;
    worldStreamingCustomers?: WorldStreamingCustomerState;
    worldStreamingViewing?: WorldStreamingViewingState;
    worldStreamingPlatformEconomy?: WorldStreamingPlatformEconomyState;
}

export interface LogEntry {
    week: number;
    year: number;
    message: string;
    type: 'positive' | 'negative' | 'neutral';
}

export interface Application {
    id: string;
    type: 'AUDITION';
    name: string;
    weeksRemaining: number;
    data: any;
}

export interface PressInteraction {
    id: string;
    question: string;
    options: {
        text: string;
        style: 'RISKY' | 'SAFE' | 'BOLD' | 'HUMBLE';
        consequences: Partial<Stats> & { buzz?: number };
    }[];
}

export interface SocialEventOption {
    label: string;
    impact: Partial<Stats> & { relationship?: number, money?: number };
    logMessage: string;
}

export interface SocialEvent {
    id: string;
    title: string;
    description: string;
    options: SocialEventOption[];
}

export interface Property {
    id: string;
    baseAssetId?: string;
    name: string;
    type: 'Property';
    price: number;
    weeklyExpense: number;
    moodBonus: number;
    customizations?: string[];
    location?: string; // New: City/Region
    address?: string; // New: Specific address flavor text
}

export interface Vehicle {
    id: string;
    baseAssetId?: string;
    name: string;
    type: 'Vehicle';
    vehicleType: 'Car' | 'Motorcycle' | 'Boat' | 'Aircraft';
    price: number;
    reputationBonus: number;
    energySave: number;
    customizations?: string[];
}

export interface ClothingItem {
    id: string;
    name: string;
    category: ClothingCategory;
    subCategory?: 'EYEWEAR' | 'WATCH' | 'BAG' | 'JEWELRY'; // NEW: Accessory Subtypes
    type: 'Clothing';
    price: number;
    style: SettableClothingStyle | 'Casual' | 'Premium' | 'Luxury';
    auditionBonus: number;
}

export interface Studio {
    id: StudioId;
    name: string;
    archetype: StudioArchetype;
    valuation: number;
    castingBias: { reputation: number, followers: number, experience: number };
    qualityBias: { script: number, hype: number, distribution: number };
    payMultiplier: number;
    budgetComfort: BudgetTier[];
}

export interface Relationship {
    id: string;
    name: string;
    relation: 'Parent' | 'Friend' | 'Partner' | 'Spouse' | 'Ex-Partner' | 'Ex-Spouse' | 'Child' | 'Pet' | 'Connection' | 'Agent' | 'Director' | 'Manager' | 'Colleague' | 'Networking' | 'Deceased Parent' | 'Sibling';
    familyTitle?: 'Child' | 'Son' | 'Daughter' | 'Heir';
    closeness: number;
    image: string;
    lastInteractionWeek: number;
    lastInteractionAbsolute?: number;
    npcId?: string;
    age?: number;
    gender?: Gender;
    birthWeekAbsolute?: number;
    petSpecies?: string;
    petBreed?: string;
    petEmoji?: string;
    petAcquisition?: 'shelter' | 'breeder' | 'endangered' | 'exotic';
    petRarity?: 'common' | 'premium' | 'endangered' | 'exotic';
    petStoreName?: string;
    petHomeSetup?: string;
    petAccessory?: string;
    petCustomization?: string;
}

export interface ImprovementOption {
    id: string;
    label: string;
    nameKey?: string;
    energyCost: number;
    moneyCost: number;
    gains: Partial<Stats> & Partial<ActorSkills>;
    writerGains?: Partial<WriterStats>;
    directorGains?: Partial<DirectorStats>;
    risk: number;
    description: string;
    descriptionKey?: string;
}

export interface ImprovementActivity {
    id: string;
    name: string;
    nameKey?: string;
    description: string;
    descriptionKey?: string;
    options: ImprovementOption[];
}

export type LifestyleActivityCategory = 'TRAVEL' | 'NIGHTLIFE' | 'FAMILY' | 'WELLNESS' | 'IMAGE' | 'LEGACY' | 'COMPANION';

export type LifestyleActivityChoiceKind = 'SCALE' | 'PRIVACY' | 'INVITE' | 'DURATION' | 'EXTRA' | 'DESTINATION' | 'CITY' | 'STAY' | 'TRAVEL_MODE' | 'TRIP_ACTIVITY' | 'NIGHTLIFE_TYPE' | 'NIGHTLIFE_VENUE' | 'NIGHTLIFE_GUEST' | 'NIGHTLIFE_CROWD' | 'NIGHTLIFE_CONTROL' | 'WELLNESS_PROGRAM' | 'WELLNESS_PROVIDER' | 'WELLNESS_FOCUS' | 'WELLNESS_SUPPORT' | 'ADOPTION_CHILD' | 'ADOPTION_ROUTE' | 'ADOPTION_HOME_PREP' | 'ADOPTION_SUPPORT' | 'INDUSTRY_EVENT' | 'INDUSTRY_VENUE' | 'INDUSTRY_INVITE_GROUP' | 'INDUSTRY_GUEST' | 'INDUSTRY_HOSTING_STYLE' | 'INDUSTRY_SERVICE' | 'INDUSTRY_ADDON' | 'CHARITY_CAUSE' | 'CHARITY_FORMAT' | 'CHARITY_DONATION' | 'CHARITY_GUEST_CIRCLE' | 'CHARITY_PRESS' | 'CHARITY_ADDON' | 'COMPANION_STORE' | 'COMPANION_CATEGORY' | 'COMPANION_PET' | 'COMPANION_CARE' | 'COMPANION_HOME' | 'COMPANION_ACCESSORY' | 'COMPANION_CUSTOMIZATION' | 'COMPANION_PERMIT';

export interface LifestyleActivityChoice {
    id: string;
    label: string;
    labelKey?: string;
    description: string;
    descriptionKey?: string;
    kind: LifestyleActivityChoiceKind;
    costMultiplier?: number;
    flatCost?: number;
    statEffects?: Partial<Stats>;
    riskShift?: number;
    memoryTag?: string;
}

export interface LifestyleActivityDefinition {
    id: string;
    category: LifestyleActivityCategory;
    name: string;
    shortDescription: string;
    longDescription: string;
    baseCost: number;
    baseRisk: number;
    baseEffects: Partial<Stats>;
    cooldownWeeks: number;
    recommendedWhen?: string;
    scales: LifestyleActivityChoice[];
    privacyOptions: LifestyleActivityChoice[];
    inviteOptions: LifestyleActivityChoice[];
    durationOptions: LifestyleActivityChoice[];
    extras?: LifestyleActivityChoice[];
}

export interface LifestyleActivitySelections {
    scaleId: string;
    privacyId: string;
    inviteId: string;
    durationId: string;
    extraIds: string[];
    tripDestinationId?: string;
    tripCityId?: string;
    tripDurationDays?: number;
    tripStayId?: string;
    tripTravelId?: string;
    tripActivityIds?: string[];
    nightlifeTypeId?: string;
    nightlifeVenueId?: string;
    nightlifeGuestId?: string;
    nightlifeCrowdId?: string;
    nightlifeControlId?: string;
    wellnessProgramId?: string;
    wellnessProviderId?: string;
    wellnessFocusId?: string;
    wellnessSupportId?: string;
    adoptionChildId?: string;
    adoptionRouteId?: string;
    adoptionHomePrepId?: string;
    adoptionSupportId?: string;
    adoptionCustomName?: string;
    adoptionTitle?: 'Child' | 'Son' | 'Daughter' | 'Heir';
    industryEventId?: string;
    industryVenueId?: string;
    industryInviteGroupIds?: string[];
    industryGuestIds?: string[];
    industryHostingStyleId?: string;
    industryServiceId?: string;
    industryAddonIds?: string[];
    charityCauseId?: string;
    charityFormatId?: string;
    charityDonationId?: string;
    charityCustomDonationAmount?: number;
    charityGuestCircleId?: string;
    charityPressId?: string;
    charityAddonIds?: string[];
    companionStoreId?: string;
    companionCategoryId?: string;
    companionPetId?: string;
    companionCareId?: string;
    companionHomeId?: string;
    companionAccessoryId?: string;
    companionCustomizationId?: string;
    companionPermitId?: string;
    companionCustomName?: string;
}

export interface LifestyleActivityQuote {
    totalCost: number;
    risk: number;
    statEffects: Partial<Stats>;
    effectSummary: string[];
    selectedLabels: string[];
    assetSignals?: { label: string; description: string }[];
}

export interface LifestyleActivityMemory {
    id: string;
    activityId: string;
    title: string;
    summary: string;
    category: LifestyleActivityCategory;
    cost: number;
    risk: number;
    year: number;
    week: number;
    createdAbsoluteWeek: number;
    selections: LifestyleActivitySelections;
    effectSummary: string[];
    socialMoment?: string;
}

export type HealthConditionSeverity = 'MINOR' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
export type HealthConditionSource = 'WORKLOAD' | 'PRODUCTION' | 'NIGHTLIFE' | 'ILLNESS' | 'OLD_AGE' | 'LIFESTYLE';

export interface HealthConditionState {
    id: string;
    conditionId: string;
    label: string;
    labelKey?: string;
    summaryKey?: string;
    severity: HealthConditionSeverity;
    source: HealthConditionSource;
    startedWeekAbsolute: number;
    expectedRecoveryWeekAbsolute?: number;
    healthCap: number;
    weeklyHealthDrain: number;
    workPenalty: number;
    treatmentTags: string[];
    treatedWeeks: number;
    ignoredWeeks: number;
    isPublic?: boolean;
    deathRisk?: number;
    lastProgressWeekAbsolute?: number;
}

export interface LifestyleActivityState {
    memories: LifestyleActivityMemory[];
    cooldowns: Record<string, number>;
    totalSpent: number;
    lifetimeActivityCounts?: Record<string, number>;
    lifetimeCategoryCounts?: Partial<Record<LifestyleActivityCategory, number>>;
    lifetimeTripDays?: number;
    lifetimeCharityGiven?: number;
    lifetimeFriendEncounters?: number;
    lifestyleIdentity?: string;
    lastActivityWeek?: number;
}

export interface BloodlineMember {
    id: string;
    name: string;
    finalAge: number;
    netWorth: number;
    moviesMade: number;
    awards: number;
    generation: number;
    avatar: string;
    peakFame?: number;
    businessCount?: number;
    legacyScore?: number;
}

export type DynastyCareerStatus = 'ACTIVE' | 'SELECTIVE' | 'HIATUS' | 'RETIRED' | 'DECEASED';
export type DynastyCareerEventType = 'SUCCESSION' | 'PROJECT_JOINED' | 'PROJECT_COMPLETED' | 'HIATUS_STARTED' | 'RETURNED' | 'RETIRED' | 'DIED';

export interface DynastyCareerEvent {
    id: string;
    type: DynastyCareerEventType;
    absoluteWeek: number;
    title: string;
    detail: string;
    projectId?: string;
}

export interface DynastyCareerMember {
    id: string;
    playerId: string;
    npcId: string;
    name: string;
    avatar: string;
    gender: Gender;
    generation: number;
    ageAtSuccession: number;
    successionAbsoluteWeek: number;
    health: number;
    fame: number;
    talent: number;
    ambition: number;
    selectivity: number;
    familyLoyalty: number;
    status: DynastyCareerStatus;
    currentProjectIds: string[];
    completedProjectIds: string[];
    lastDecisionAbsoluteWeek: number;
    nextDecisionAbsoluteWeek: number;
    hiatusUntilAbsoluteWeek?: number;
    retiredAtAbsoluteWeek?: number;
    diedAtAbsoluteWeek?: number;
    deathCause?: string;
    history: DynastyCareerEvent[];
}

export interface DynastyCareerState {
    schemaVersion: 1;
    members: Record<string, DynastyCareerMember>;
    lastProcessedAbsoluteWeek: number;
}

export interface FamilyObligation {
    id: string;
    type: 'CHILD_SUPPORT' | 'ALIMONY';
    targetId: string;
    targetName: string;
    weeklyAmount: number;
    active: boolean;
    startedWeek: number;
    startedYear: number;
    startedAbsoluteWeek: number;
    reason: 'ABANDONMENT' | 'DIVORCE';
}

export type GameLanguage = 'en' | 'pt-BR' | 'fr' | 'es' | 'tr' | 'de';

export interface PlayerSettings {
    language: GameLanguage;
    smoothMode?: boolean;
}

export interface PlayerAssetState {
    assetId: string;
    condition: number;
    currentValue?: number;
    valueTrend?: number;
    marketCycle?: string;
    neighborhoodTier?: string;
    rentDemand?: number;
    vacancyChance?: number;
    vacancyWeeks?: number;
    rentalListed?: boolean;
    weeklyRent?: number;
    lifetimeRevenue?: number;
    listedWeek?: number;
    lastMaintainedWeek?: number;
}

export interface Player {
    id: string;
    name: string;
    age: number;
    totalPlayTimeMs: number;
    gender: Gender;
    avatar: string;
    settings: PlayerSettings;
    money: number;
    energy: { current: number; max: number };
    stats: Stats;
    writerStats?: WriterStats;
    directorStats?: DirectorStats;
    currentWeek: number;
    assets: string[];
    customItems: (Property | Vehicle)[];
    assetStates: PlayerAssetState[];
    residenceId: string | null;
    activeVehicleId: string | null;
    commitments: Commitment[];
    activeReleases: ActiveRelease[];
    pastProjects: PastProject[];
    outsideProductions?: OutsideProductionInvestment[];
    applications: Application[];
    relationships: Relationship[];
    bloodline?: BloodlineMember[];
    team: {
        agent: Agent | null;
        manager: Manager | null;
        personalTrainer: TeamMember | null;
        stylist: TeamMember | null;
        therapist: TeamMember | null;
        publicist: TeamMember | null;
        wellness: TeamMember | null;
        lastAgentFeePaidWeek: number;
        lastManagerFeePaidWeek: number;
        availableAgents: Agent[];
        availableManagers: Manager[];
        availableTrainers: TeamMember[];
        availableStylists: TeamMember[];
        availableTherapists: TeamMember[];
        availablePublicists: TeamMember[];
        availableWellness: TeamMember[];
    };
    news: NewsItem[];
    inbox: Message[];
    instagram: {
        handle: string;
        followers: number;
        posts: InstaPost[];
        feed: InstaPost[];
        npcStates: Record<string, NPCState>;
        weeklyPostCount: number;
        lastPostWeek: number;
        aesthetic: number;
        authenticity: number;
        controversy: number;
        fashionInfluence: number;
        fanLoyalty: number;
        lastBrandOfferWeek?: number;
    };
    x: {
        handle: string;
        followers: number; // SEPARATE FOLLOWER COUNT
        posts: XPost[];
        feed: XPost[];
        lastPostWeek: number;
    };
    youtube: YoutubeChannel;
    dating: {
        isTinderActive: boolean;
        isLuxeActive: boolean;
        preferences: DatingPreferences;
        matches: DatingMatch[];
        luxeRefreshOffset?: number;
        luxeCycleStartAbsoluteWeek?: number;
    };
    finance: {
        history: Transaction[];
        yearly: YearlyFinance[];
        loans: PlayerLoan[];
        credit: CreditHistory;
    };
    lifestyleActivities?: LifestyleActivityState;
    activeHealthConditions?: HealthConditionState[];
    businesses: Business[];
    activeSponsorships: SponsorshipOffer[];
    stocks: Stock[];
    portfolio: PortfolioItem[];
    shareholderVotes: ShareholderVote[];
    stockTakeovers: StockTakeoverCase[];
    world: WorldState;
    ownedStreamingPlatform: OwnedStreamingPlatformState;
    streamingRightsManagement?: StreamingRightsManagementState;
    flags: Record<string, any>;
    weeklyOpportunities: {
        auditions: AuditionOpportunity[];
        jobs: Commitment[];
    };
    awards: Award[];
    scheduledEvents: ScheduledEvent[];
    pendingEvent: PendingEvent | null;
    pendingEvents?: PendingEvent[];
    activeUniverseContract?: UniverseContract;
    lastForbesRank?: number;
    studioMemory: Record<StudioId, { projectOutcomes: number[] }>;
    heat: number;
    activeCases: LegalCase[];
    studio: {
        isUnlocked: boolean;
        baseType: 'GARAGE' | 'STUDIO_LOT' | null;
        talentRoster: StudioContract[];
        lastTalentRefreshWeek: number;
    };
    logs: LogEntry[];
    activePregnancy?: {
        partnerId: string;
        partnerName?: string;
        pregnancyCarrier?: PregnancyCarrier;
        babyGender?: 'MALE' | 'FEMALE';
        suggestedFirstName?: string;
        birthWeekAbsolute?: number;
        conceptionWeekAbsolute?: number;
        shouldCreateScandalNews?: boolean;
        weeksLeft: number;
    };
}

export const INITIAL_PLAYER: Player = {
    id: 'player',
    name: 'New Player',
    age: 15,
    totalPlayTimeMs: 0,
    gender: 'MALE',
    avatar: '',
    settings: { language: 'en', smoothMode: false },
    money: 2000,
    energy: { current: 100, max: 100 },
    stats: {
        health: 80, happiness: 80, looks: 70, body: 70,
        fame: 0, reputation: 0, experience: 0, talent: 0, followers: 0, // Starts at 0
        skills: { delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0 },
        directorSkills: { vision: 0, technical: 0, leadership: 0, style: 0 },
        genreXP: { ACTION: 0, DRAMA: 0, COMEDY: 0, ROMANCE: 0, THRILLER: 0, MYSTERY: 0, HORROR: 0, SCI_FI: 0, ADVENTURE: 0, SUPERHERO: 0, MUSICAL: 0, BIOPIC: 0, SPORTS: 0, ANIMATION: 0, FANTASY: 0, CRIME: 0, DOCUMENTARY: 0 }
    },
    writerStats: { creativity: 0, dialogue: 0, structure: 0, pacing: 0 },
    directorStats: { vision: 0, technical: 0, leadership: 0, style: 0 },
    currentWeek: 1,
    assets: [],
    customItems: [], // NEW
    assetStates: [],
    residenceId: null,
    activeVehicleId: null,
    commitments: [],
    activeReleases: [],
    pastProjects: [],
    outsideProductions: [],
    applications: [],
    relationships: [
        { id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 85, image: '', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 46, gender: 'FEMALE' },
        { id: 'rel_dad', name: 'Dad', relation: 'Parent', closeness: 80, image: '', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 49, gender: 'MALE' }
    ],
    team: {
        agent: null, manager: null, lastAgentFeePaidWeek: 0, lastManagerFeePaidWeek: 0, availableAgents: [], availableManagers: [],
        personalTrainer: null, stylist: null, therapist: null, publicist: null, wellness: null,
        availableTrainers: [], availableStylists: [], availableTherapists: [], availablePublicists: [], availableWellness: []
    },
    news: [],
    inbox: [
        {
            id: 'msg_dev_welcome',
            sender: 'Zeesh (Developer)',
            subject: 'A Note from the Creator',
            text: "Hey,\n\nThank you for playing this game.\n\nThis project has been a dream I’ve carried for a long time to build an experience where you don’t just play a career, but actually live through it. The struggles, the choices, the highs, the setbacks , all of it.\n\nAs you start your journey here, remember there’s no single “right” path. Take risks. Make mistakes. Chase the roles you believe in. Build your legacy your own way.\n\nI genuinely hope this world gives you moments you enjoy, stories you remember, and a career you feel proud of , even if it’s fictional.\n\nWishing you the very best for your journey ahead.\n\nZeesh\nZeesh Apps",
            type: 'SYSTEM',
            isRead: false,
            weekSent: 1,
            expiresIn: 10
        }
    ],
    instagram: { handle: '@player', followers: 0, posts: [], feed: [], npcStates: {}, weeklyPostCount: 0, lastPostWeek: 0, aesthetic: 50, authenticity: 55, controversy: 0, fashionInfluence: 10, fanLoyalty: 45 },
    x: { handle: '@player', followers: 0, posts: [], feed: [], lastPostWeek: 0 }, // Starts at 0
    youtube: { handle: '@player', subscribers: 0, videos: [], lifetimeEarnings: 0, isMonetized: false, bannerColor: 'bg-gradient-to-r from-red-900 to-zinc-900', totalChannelViews: 0, activeCollabs: [], activeBrandDeals: [], audienceTrust: 55, fanMood: 55, controversy: 0, membershipsActive: false, members: 0, lastLivestreamWeek: 0, lastMerchDropWeek: 0, creatorIdentity: 'ACTOR_VLOGGER', lastIdentityChangeWeek: 0 },
    dating: { isTinderActive: false, isLuxeActive: false, preferences: { gender: 'ALL', minAge: 18, maxAge: 35 }, matches: [], luxeRefreshOffset: 0, luxeCycleStartAbsoluteWeek: 0 },
    finance: {
        history: [],
        yearly: [],
        loans: [],
        credit: {
            successfulPayments: 0,
            missedPayments: 0,
            defaults: 0,
            totalBorrowed: 0,
            totalRepaid: 0
        }
    },
    lifestyleActivities: {
        memories: [],
        cooldowns: {},
        totalSpent: 0
    },
    businesses: [],
    activeSponsorships: [],
    stocks: [],
    portfolio: [],
    shareholderVotes: [],
    stockTakeovers: [],
    ownedStreamingPlatform: createInitialOwnedStreamingPlatformState(),
    streamingRightsManagement: {
        schemaVersion: STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
        controlMode: 'CUSTOM',
        policy: {
            noticeWeeks: 8,
            preference: 'BALANCED',
            autoRenewMinimumScore: 62,
            letWeakContractsExpireBelowScore: 35,
            maximumAutomaticGuarantee: 150_000_000,
            maximumAutomaticDurationWeeks: 104,
            protectGlobalExclusives: true,
            protectFranchises: true,
        },
        packagePolicy: {
            automation: 'SUGGEST_ONLY',
            preferredSize: { min: 3, max: 6 },
            maximumAutomaticSize: 7,
            maximumAutomaticDurationWeeks: 104,
            allowAutomaticExclusive: false,
            allowAutomaticGlobal: false,
            minimumGuaranteeRatio: 0.85,
        },
        protectedProjectIds: [],
        manualContractIds: [],
        studioMandates: {},
        updatedAtAbsoluteWeek: 0,
    },
    world: {
        projects: [],
        trendingGenre: 'ACTION',
        universes: {
            MCU: {
                id: 'MCU',
                name: 'Marvel Cinematic Universe',
                description: 'The biggest franchise in history, focusing on interconnected superhero stories.',
                studioId: 'MARVEL_STUDIOS',
                currentPhase: 'PHASE_4_MULTIVERSE',
                saga: 2,
                momentum: 85,
                brandPower: 95,
                marketShare: 45,
                color: '#e23636',
                roster: [],
                slate: [],
                weeksUntilNextPhase: 52
            },
            DCU: {
                id: 'DCU',
                name: 'DC Universe',
                description: 'A rebooted universe of iconic heroes like Superman and Batman.',
                studioId: 'DC_STUDIOS',
                currentPhase: 'PHASE_1_ORIGINS',
                saga: 1,
                momentum: 60,
                brandPower: 75,
                marketShare: 25,
                color: '#0476f2',
                roster: [],
                slate: [],
                weeksUntilNextPhase: 104
            },
            SW: {
                id: 'SW',
                name: 'Star Wars',
                description: 'A galaxy far, far away, spanning generations of Jedi and Sith.',
                studioId: 'LUCASFILM',
                currentPhase: 'PHASE_3_WAR',
                saga: 3,
                momentum: 70,
                brandPower: 88,
                marketShare: 30,
                color: '#ffe81f',
                roster: [],
                slate: [],
                weeksUntilNextPhase: 156
            }
        },
        famousMoviesReleased: [],
        awardHistory: [],
        upcomingRivals: [],
        talentBookings: [],
        industryProductions: {},
        industryEvents: {
            schemaVersion: 1,
            lastProcessedAbsoluteWeek: -1,
            lastProjectedAbsoluteWeek: -1,
            events: [],
            publishedEventKeys: [],
        },
        streamingRightsContracts: {},
        streamingRightsTransactions: {},
        streamingRightsCalendar: {
            schemaVersion: STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
            renewalCases: {},
            digests: [],
            urgentNoticeKeys: [],
            lastProcessedAbsoluteWeek: -1,
        },
        streamingRightsOffice: {
            schemaVersion: STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION,
            digests: [],
            lastProcessedAbsoluteWeek: -1,
        },
        streamingBiddingSessions: {},
        streamingCataloguePackages: {},
        streamingCataloguePackageDigests: [],
        streamingCataloguePackagesLastProcessedWeek: -1,
        streamingRoyaltySettlements: {},
        platforms: {
            NETFLIX: { id: 'NETFLIX', name: 'Netflix', subscribers: 260, valuation: 260, reputation: 80, cashReserve: 5000, recentHits: 0, color: 'text-red-600', churnRate: 'FAST' },
            APPLE_TV: { id: 'APPLE_TV', name: 'Apple TV+', subscribers: 45, valuation: 2900, reputation: 95, cashReserve: 20000, recentHits: 0, color: 'text-zinc-400', churnRate: 'SLOW' },
            DISNEY_PLUS: { id: 'DISNEY_PLUS', name: 'Disney+', subscribers: 150, valuation: 180, reputation: 85, cashReserve: 8000, recentHits: 0, color: 'text-blue-500', churnRate: 'SLOW' },
            HULU: { id: 'HULU', name: 'Hulu', subscribers: 48, valuation: 27, reputation: 75, cashReserve: 2000, recentHits: 0, color: 'text-emerald-500', churnRate: 'MEDIUM' },
            YOUTUBE: { id: 'YOUTUBE', name: 'YouTube', subscribers: 2500, valuation: 1800, reputation: 60, cashReserve: 15000, recentHits: 0, color: 'text-red-500', churnRate: 'FAST' }
        },
        studios: {
            PARAMOUNT: { id: 'PARAMOUNT', name: 'Paramount Pictures', valuation: 22, reputation: 85, cashReserve: 3000, recentHits: 0, archetype: 'LEGACY' },
            HBO: { id: 'HBO', name: 'HBO', valuation: 18, reputation: 94, cashReserve: 3200, recentHits: 0, archetype: 'PRESTIGE' },
            WARNER_BROS: { id: 'WARNER_BROS', name: 'Warner Bros.', valuation: 74, reputation: 90, cashReserve: 5000, recentHits: 0, archetype: 'LEGACY' },
            UNIVERSAL: { id: 'UNIVERSAL', name: 'Universal Pictures', valuation: 65, reputation: 88, cashReserve: 4500, recentHits: 0, archetype: 'LEGACY' },
            ARTISAN_PICTURES: { id: 'ARTISAN_PICTURES', name: 'Artisan Pictures', valuation: 3, reputation: 95, cashReserve: 500, recentHits: 0, archetype: 'PRESTIGE' },
            NETFLIX: { id: 'NETFLIX', name: 'Netflix', valuation: 260, reputation: 80, cashReserve: 5000, recentHits: 0, archetype: 'PLATFORM' },
            APPLE_TV: { id: 'APPLE_TV', name: 'Apple TV+', valuation: 2900, reputation: 95, cashReserve: 20000, recentHits: 0, archetype: 'PLATFORM' },
            DISNEY_PLUS: { id: 'DISNEY_PLUS', name: 'Disney+', valuation: 180, reputation: 85, cashReserve: 8000, recentHits: 0, archetype: 'PLATFORM' },
            HULU: { id: 'HULU', name: 'Hulu', valuation: 27, reputation: 75, cashReserve: 2000, recentHits: 0, archetype: 'PLATFORM' },
            YOUTUBE: { id: 'YOUTUBE', name: 'YouTube', valuation: 1800, reputation: 60, cashReserve: 15000, recentHits: 0, archetype: 'PLATFORM' },
            MARVEL_STUDIOS: { id: 'MARVEL_STUDIOS', name: 'Marvel Studios', valuation: 50, reputation: 90, cashReserve: 6000, recentHits: 0, archetype: 'FRANCHISE' },
            DC_STUDIOS: { id: 'DC_STUDIOS', name: 'DC Studios', valuation: 30, reputation: 80, cashReserve: 4000, recentHits: 0, archetype: 'FRANCHISE' },
            LUCASFILM: { id: 'LUCASFILM', name: 'Lucasfilm', valuation: 40, reputation: 85, cashReserve: 5000, recentHits: 0, archetype: 'FRANCHISE' },
            SONY_PICTURES: { id: 'SONY_PICTURES', name: 'Sony Pictures', valuation: 45, reputation: 84, cashReserve: 3500, recentHits: 0, archetype: 'LEGACY' },
            LIONSGATE: { id: 'LIONSGATE', name: 'Lionsgate', valuation: 7, reputation: 76, cashReserve: 900, recentHits: 0, archetype: 'LEGACY' },
            MGM: { id: 'MGM', name: 'MGM', valuation: 8, reputation: 82, cashReserve: 1200, recentHits: 0, archetype: 'LEGACY' },
            DREAMWORKS: { id: 'DREAMWORKS', name: 'DreamWorks Pictures', valuation: 15, reputation: 83, cashReserve: 2200, recentHits: 0, archetype: 'LEGACY' },
            PIXAR: { id: 'PIXAR', name: 'Pixar', valuation: 20, reputation: 96, cashReserve: 3000, recentHits: 0, archetype: 'PRESTIGE' },
            SEARCHLIGHT: { id: 'SEARCHLIGHT', name: 'Searchlight Pictures', valuation: 5, reputation: 93, cashReserve: 650, recentHits: 0, archetype: 'PRESTIGE' },
            AMAZON_STUDIOS: { id: 'AMAZON_STUDIOS', name: 'Amazon Studios', valuation: 150, reputation: 82, cashReserve: 8000, recentHits: 0, archetype: 'PLATFORM' }
        },
        npcVentures: {}
    },
    flags: {},
    weeklyOpportunities: { auditions: [], jobs: [] },
    awards: [],
    scheduledEvents: [],
    pendingEvent: null,
    heat: 0,
    activeCases: [],
    studioMemory: {} as any,
    studio: {
        isUnlocked: false,
        baseType: null,
        talentRoster: [],
        lastTalentRefreshWeek: 0
    },
    logs: [
        { week: 1, year: 15, message: "Welcome to Hollywood. Your journey starts today.", type: 'neutral' },
        { week: 1, year: 15, message: "🔔 Check your Message App for a note from the developer.", type: 'positive' }
    ]
};
