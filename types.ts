
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
        sourceUniverseId?: UniverseId
    }[];
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
    type: 'THEATRICAL' | 'STREAMING_DEAL' | 'STREAMING_ROYALTY' | 'SOUNDTRACK' | 'UNIVERSE' | 'CAPITAL_INJECTION' | 'CAPITAL_WITHDRAWAL' | 'PRODUCTION_SPEND' | 'FUNDING_SURPLUS' | 'INVESTOR_FUNDING' | 'INVESTOR_PAYOUT' | 'ACQUISITION_MERGER' | 'IP_ACQUISITION';
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
    rareChaosResolved?: boolean;
    rareChaosKind?: RareHollywoodChaosKind;
    rareChaosReason?: string;
    rareChaosPlatformId?: string | null;
    rareChaosFundingCap?: number;
    rareChaosResolvedWeek?: number;
    rareChaosResolvedYear?: number;
    forcedRareChaosKind?: RareHollywoodChaosKind;
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
    isOriginal?: boolean;
    type: ProjectType;
    description: string;
    studioId: StudioId;
    subtype: ProjectSubtype;
    genre: Genre;
    format?: ProjectFormat;
    subjectName?: string;
    subjectType?: ScriptSubjectType;
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
    customPoster?: CustomPoster;
    musicPlan?: ProjectMusicPlan;
    investorPlan?: ProjectInvestorPlan;
    investorPayouts?: ProjectInvestorPayoutSummary;
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
    weeklyStreamingBreakdowns?: StreamingDistributionBreakdown[];
    soundtrackRevenue?: number;
    weeklySoundtrackRevenue?: number[];
    soundtrackRevenueBreakdown?: ProjectSoundtrackRevenueBreakdown;
    weeklySoundtrackBreakdowns?: ProjectSoundtrackRevenueBreakdown[];
    investorPlan?: ProjectInvestorPlan;
    investorPayouts?: ProjectInvestorPayoutSummary;
    castList?: CastMember[];
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
}

export interface Message {
    id: string;
    sender: string;
    subject: string;
    text: string;
    type: 'OFFER_ROLE' | 'OFFER_AUDITION' | 'OFFER_SPONSORSHIP' | 'OFFER_NEGOTIATION' | 'OFFER_EVENT' | 'OFFER_OUTSIDE_PRODUCER_INVESTMENT' | YoutubeMessageType | 'TEXT' | 'SYSTEM' | 'CASTING_FEEDBACK' | 'RIGHTS_REPORT' | 'RIGHTS_NEGOTIATION' | 'STUDIO_ACQUISITION' | 'SHAREHOLDER_VOTE';
    data?: AuditionOpportunity | SponsorshipOffer | NegotiationData | ScheduledEvent | YoutubeCollabOffer | YoutubeBrandDeal | YoutubeMusicVideoFeatureOffer | any;
    isRead: boolean;
    weekSent: number;
    expiresIn?: number;
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
    occupation: 'ACTOR' | 'DIRECTOR' | 'MUSIC_ARTIST' | 'INVESTOR';
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
    status: 'OPEN' | 'RESOLVED';
    playerVotingPower: number;
    expectedSupport: number;
    createdWeek: number;
    createdYear: number;
    dueWeek: number;
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
    targetAudience?: TargetAudience;
    studioId: StudioId;
    budgetTier: BudgetTier;
    quality: number;
    boxOffice: number;
    year: number;
    weekReleased: number;
    leadActorId: string;
    leadActorName: string;
    directorName: string;
    reviews: string;
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
    age: 18,
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
        { week: 1, year: 18, message: "Welcome to Hollywood. Your journey starts today.", type: 'neutral' },
        { week: 1, year: 18, message: "🔔 Check your Message App for a note from the developer.", type: 'positive' }
    ]
};
