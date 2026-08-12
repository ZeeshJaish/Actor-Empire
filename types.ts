
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
    fundingSource?: 'EXTERNAL_PLATFORM' | 'OWNED_STREAMING_PLATFORM';
}

export type NextSeasonFundingTier = 'CONSERVATIVE' | 'STANDARD' | 'PREMIUM' | 'BREAKOUT' | 'RISKY_BET';

export interface PlatformFundingRelationship {
    trustModifier: number;
    recoveryWeeksRemaining: number;
    lastBreachWeek?: number;
    lastBreachYear?: number;
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
    festivalPremiere: string | null;
    releaseWeek: number;
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
    weekOnPlatform: number;
    totalViews: number;
    weeklyViews: number[];
    isLeaving: boolean;
    startWeek?: number;
    startWeekAbsolute?: number;
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
export type StreamingSoundIdentKey = 'PULSE' | 'ASCENT' | 'PREMIERE' | 'SILENT';
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
    soundIdentKey: StreamingSoundIdentKey;
    brandPromiseId: StreamingBrandPromiseId;
    /** Player-authored public copy. Strategy remains driven by brandPromiseId. */
    publicManifesto: string;
    /** Countries where viewers may subscribe on opening day. */
    dayOneMarketIds?: string[];
    /** Legacy pre-Day-One-Markets field. New companies choose servers in Build. */
    launchServerCityId: string | null;
    foundedAtAbsoluteWeek: number;
}

export interface OwnedStreamingFoundingDraft {
    currentStep: number;
    name: string;
    logoKey: StreamingLogoKey;
    primaryColor: string;
    secondaryColor: string;
    soundIdentKey: StreamingSoundIdentKey;
    brandPromiseId: StreamingBrandPromiseId;
    publicManifesto: string;
    dayOneMarketIds?: string[];
    /** Legacy resume compatibility only; new founding drafts always keep this null. */
    launchServerCityId: string | null;
    updatedAtAbsoluteWeek: number;
}

export type OwnedStreamingIncorporationModel = 'FIXED_V7' | 'LEGACY_PRE_V7';

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
    | 'ALLIANCE_SIGNAL';

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
    technology: number;
    catalogPower: number;
    prestige: number;
    aggression: number;
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
    title: string;
    detail: string;
    status: StreamingRivalMoveStatus;
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

export interface OwnedStreamingNetworkPlacement {
    cityId: string;
    racks: number;
    role: StreamingNetworkNodeRole;
}

export interface OwnedStreamingInfrastructureSetupDraft {
    currentStep: number;
    strategy: Exclude<StreamingInfrastructureStrategy, 'UNDECIDED'>;
    capacityPackageId: StreamingCapacityPackageId;
    rolloutPace: StreamingInfrastructureRolloutPace;
    subscriptionPrices: Record<StreamingSubscriptionTierId, number>;
    /** Physical network plan. The first core origin normally comes from founding. */
    networkPlacements: OwnedStreamingNetworkPlacement[];
    lastLoadTestSignature: string | null;
    updatedAtAbsoluteWeek: number;
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

export type StreamingStarterCatalogPackageId = 'CURATED_PREMIERE' | 'BROAD_APPEAL' | 'PRESTIGE_VAULT';
export type StreamingLicenseTerritory = 'DOMESTIC' | 'MULTI_REGION' | 'GLOBAL';
export type StreamingLicenseExclusivity = 'NON_EXCLUSIVE' | 'EXCLUSIVE';
export type StreamingCatalogNegotiationStatus = 'BUILDING' | 'COUNTERED' | 'READY_TO_SIGN';
export type StreamingCatalogLicenseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';
export type StreamingRightsSellerType = 'STUDIO' | 'PLATFORM';
export type StreamingRightsWindowType = 'FIRST_WINDOW' | 'SECOND_WINDOW' | 'PERMANENT';
export type StreamingRightsNegotiationKind = 'ACQUIRE' | 'RENEW' | 'SUBLICENSE_OUT';
export type StreamingRightsNegotiationStatus =
    | 'OPEN'
    | 'COUNTERED'
    | 'READY_TO_SIGN'
    | 'SIGNED'
    | 'LOST'
    | 'WITHDRAWN'
    | 'EXPIRED';
export type StreamingRightsChangeOfControl = 'NONE' | 'NOTICE' | 'CONSENT_REQUIRED';
export type StreamingRightsObligationType = 'MARKETING_SPEND' | 'VIEWERSHIP_THRESHOLD';
export type StreamingRightsObligationStatus = 'PENDING' | 'ON_TRACK' | 'SATISFIED' | 'BREACHED';

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
    durationWeeks: number;
    exclusivity: StreamingLicenseExclusivity;
    minimumGuarantee: number;
    platformRevenueShare: number;
    licensorRevenueShare: number;
    signedAtAbsoluteWeek: number;
    startsAtAbsoluteWeek: number;
    expiresAtAbsoluteWeek: number;
    status: StreamingCatalogLicenseStatus;
    origin?: 'STARTER' | 'STUDIO_MARKET' | 'PLATFORM_TRADE' | 'RENEWAL';
    sellerType?: StreamingRightsSellerType;
    sellerPlatformId?: PlatformId | null;
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
}

export interface OwnedStreamingSublicenseDeal {
    id: string;
    sourceLicenseId: string;
    sourceProjectId: string;
    title: string;
    buyerPlatformId: PlatformId;
    buyerName: string;
    territory: StreamingLicenseTerritory;
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
    partnerRevenueShareCost: number;
    infrastructureCost: number;
    leadershipCost: number;
    financingCost: number;
    weeklyPlanCost: number;
    growthPlanCost?: number;
    rightsComplianceCost?: number;
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
    hoursViewed: number;
    completionRate: number;
    repeatViewingRate: number;
    satisfactionScore: number;
    discoveryMix: OwnedStreamingTitleDiscoveryMix;
    attributedSubscriptionRevenue: number;
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
    | 'PRODUCT_DEVELOPMENT_STARTED'
    | 'PRODUCT_LAUNCHED'
    | 'PRODUCT_STATUS_CHANGED'
    | 'CATALOG_IMPORTED'
    | 'LICENSE_NEGOTIATION_UPDATED'
    | 'LICENSE_SIGNED'
    | 'ORIGINAL_COMMISSIONED'
    | 'ORIGINAL_GREENLIT'
    | 'ORIGINAL_LOCALIZATION_COMMITTED'
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
    hqOnboarding: OwnedStreamingHqOnboardingState;
    infrastructureSetupDraft: OwnedStreamingInfrastructureSetupDraft | null;
    infrastructureSetup: OwnedStreamingInfrastructureSetup | null;
    technologyProjects: OwnedStreamingTechnologyProject[];
    productLines: OwnedStreamingProductLine[];
    catalogSetupDraft: OwnedStreamingCatalogSetupDraft | null;
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

export const OWNED_STREAMING_PLATFORM_SCHEMA_VERSION = 22;

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
    productLines: [],
    catalogSetupDraft: null,
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
}

export interface Message {
    id: string;
    sender: string;
    subject: string;
    text: string;
    type: 'OFFER_ROLE' | 'OFFER_AUDITION' | 'OFFER_SPONSORSHIP' | 'OFFER_NEGOTIATION' | 'OFFER_EVENT' | 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' | YoutubeMessageType | 'TEXT' | 'SYSTEM' | 'CASTING_FEEDBACK' | 'RIGHTS_REPORT' | 'RIGHTS_NEGOTIATION' | 'STUDIO_ACQUISITION' | 'STUDIO_CONTINUATION' | 'SHAREHOLDER_VOTE';
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
        isPlayer: boolean;
    }[];
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

export interface WorldState {
    projects: IndustryProject[];
    trendingGenre: Genre;
    universes: Record<UniverseId, Universe>;
    famousMoviesReleased: string[];
    awardHistory: AwardHistoryEntry[];
    upcomingRivals: IndustryProject[];
    platforms?: Record<PlatformId, PlatformState>;
    studios?: Record<StudioId, NPCStudioState>;
    npcVentures?: Record<string, NpcVentureState>;
    musicIndustry?: MusicIndustryState;
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
    avatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Felix',
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
        { id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 85, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Sophie', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 46, gender: 'FEMALE' },
        { id: 'rel_dad', name: 'Dad', relation: 'Parent', closeness: 80, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Arthur', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 49, gender: 'MALE' }
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
