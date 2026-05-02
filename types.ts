
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
export type Genre = 'ACTION' | 'DRAMA' | 'COMEDY' | 'ROMANCE' | 'THRILLER' | 'HORROR' | 'SCI_FI' | 'ADVENTURE' | 'SUPERHERO';
export type RoleType = 'MINOR' | 'CAMEO' | 'SUPPORTING' | 'ENSEMBLE' | 'LEAD';
export type BudgetTier = 'LOW' | 'MID' | 'HIGH' | 'BLOCKBUSTER';
export type TargetAudience = 'G' | 'PG' | 'PG-13' | 'R' | 'NC-17';
export type ProjectType = 'MOVIE' | 'SERIES';
export type StudioId = 'PARAMOUNT' | 'WARNER_BROS' | 'UNIVERSAL' | 'ARTISAN_PICTURES' | 'NETFLIX' | 'APPLE_TV' | 'DISNEY_PLUS' | 'HULU' | 'YOUTUBE' | 'MARVEL_STUDIOS' | 'DC_STUDIOS' | 'LUCASFILM' | string;
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
export type YoutubeVideoType = 'VLOG' | 'SKIT' | 'Q_AND_A' | 'TRAILER' | 'COVER' | 'STORYTIME';
export type YoutubeMessageType = 'OFFER_YOUTUBE_COLLAB' | 'OFFER_YOUTUBE_BRAND';
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

export interface CampaignItem {
    id: string;
    name: string;
    cost: number;
    buzzImpact: number;
    description: string;
    type: 'SOCIAL' | 'TV' | 'EVENT' | 'PREMIERE' | 'OTHER';
}
export type OutcomeTier = 'MASSIVE_SUCCESS' | 'SUCCESS' | 'NEUTRAL' | 'FAILURE' | 'MAJOR_FAILURE';
export type ProjectSubtype = 'STANDALONE' | 'SEQUEL' | 'SPINOFF' | 'UNIVERSE_ENTRY' | 'UNIVERSE_EVENT' | 'UNIVERSE_CROSSOVER';
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
    targetAudience?: TargetAudience;
    episodes?: number;
    baseQuality?: number;
    logline?: string;
    attributes?: ScriptAttributes;
    sourceMaterial?: 'ORIGINAL' | 'ADAPTATION' | 'SEQUEL' | 'SPINOFF';
    sourceMaterialType?: 'BOOK' | 'ARTICLE' | 'SCREENPLAY' | 'GAME' | 'GRAPHIC_NOVEL' | 'SPEC_SCRIPT';
    author?: string;
    hype?: number;
    tags?: string[];
    franchiseId?: string;
    installmentNumber?: number;
    customPoster?: CustomPoster;
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
        characterName?: string
    }[];
    selectedLocations: string[]; // Changed from selectedLocation: string | null
    tone: number;
    equipmentChoices?: Record<string, string>;
    lastStep?: 'SELECT_SCRIPT' | 'DIRECTOR' | 'CAST' | 'CREW' | 'EQUIPMENT' | 'LOCATION' | 'TONE' | 'CONFIRM';
    customPoster?: CustomPoster;
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
    financeLedger?: StudioFinanceEntry[];
}

export interface StudioFinanceEntry {
    id: string;
    week: number;
    year: number;
    amount: number;
    type: 'THEATRICAL' | 'STREAMING_DEAL' | 'STREAMING_ROYALTY' | 'UNIVERSE' | 'CAPITAL_INJECTION' | 'CAPITAL_WITHDRAWAL' | 'PRODUCTION_SPEND';
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
    isRecast?: boolean;
    releaseWeek?: number;
    platformId?: string | null;
    festivalPremiere?: string | null;
    redCarpetHype?: number;
    backendPct?: number;
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

export interface ProjectDetails {
    title: string;
    type: ProjectType;
    description: string;
    studioId: StudioId;
    subtype: ProjectSubtype;
    genre: Genre;
    targetAudience?: TargetAudience;
    budgetTier: BudgetTier;
    estimatedBudget: number;
    releaseScale?: ReleaseScale;
    releaseStrategy?: ReleaseStrategy;
    visibleHype: 'LOW' | 'MID' | 'HIGH';
    hiddenStats: ProjectHiddenStats;
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
    episodes?: number;
    tone?: number; // 0 = Practical, 100 = CGI
    visualStyle?: 'REALISTIC' | 'STYLISTIC' | 'GRITTY' | 'VIBRANT';
    pacing?: 'SLOW' | 'MODERATE' | 'FAST' | 'FRENETIC';
    equipmentChoices?: Record<string, string>;
    franchiseId?: string;
    installmentNumber?: number;
    screeningStrategy?: ScreeningStrategy;
    campaignItems?: string[]; // IDs of selected campaign items
    totalCampaignSpend?: number;
    releaseDate?: number; // Week of release
    streamingRevenue?: number;
    customPoster?: CustomPoster;
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
    budget: number;
    status: 'RUNNING' | 'BLOCKBUSTER_TRACK' | 'FLOP_WARNING' | 'FINISHED';
    imdbRating?: number;
    productionPerformance: number;
    maxTheatricalWeeks?: number;
    weeksInTheaters?: number;
    streaming?: StreamingState;
    streamingRevenue?: number;
    studioRoyaltyPercentage?: number;
    bids?: { platformId: PlatformId, upfront: number, royalty: number, duration: number }[];
    sequelDecisionWeek?: number;
    sequelDecisionMade?: boolean;
    futurePotential?: FuturePotential;
    promotionalBuzz?: number;
    royaltyPercentage?: number;
    previousBestBidValue?: number;
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
    streamingRevenue?: number;
    castList?: CastMember[];
    reviews?: Review[];
    budget: number;
    gross: number;
    genre: Genre;
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
    customPoster?: CustomPoster;
}

export interface Commitment {
    id: string;
    name: string;
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

export interface ProductionCrisis {
    id: string;
    title: string;
    description: string;
    options: {
        label: string;
        impact: (player: Player, project: Commitment) => { updatedPlayer: Player, updatedProject: Commitment, log: string };
    }[];
}

export interface Festival {
    id: string;
    name: string;
    weeks: number[]; // Week of the year (1-52)
    prestigeReq: number;
    cost: number;
    description: string;
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

export type ScheduledEventType = 'AWARD_CEREMONY' | 'PREMIERE' | 'PARTY' | 'PRODUCTION_CRISIS' | 'DIRECTOR_DECISION' | 'LIFE_EVENT' | 'LEGAL_HEARING' | 'SCANDAL' | 'UNDERWORLD_OFFER';

export interface LegalCase {
    id: string;
    title: string;
    description: string;
    weeksRemaining: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    evidence: number; // 0-100, higher is worse for player
}

export interface LifeEventOption {
    label: string;
    description?: string;
    isGolden?: boolean; // Requires Ad
    impact: (player: Player) => { updatedPlayer: Player, log: string, feedbackDelay?: number, feedbackType?: string };
}

export interface LifeEvent {
    id: string;
    type: 'LIFE' | 'POLITICS' | 'CRIME' | 'SCANDAL' | 'LEGAL' | 'NETWORKING' | 'CONFLICT' | 'EARLY_LIFE';
    title: string;
    description: string;
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
    type: 'OFFER_ROLE' | 'OFFER_SPONSORSHIP' | 'OFFER_NEGOTIATION' | 'OFFER_EVENT' | YoutubeMessageType | 'TEXT' | 'SYSTEM';
    data?: AuditionOpportunity | SponsorshipOffer | NegotiationData | ScheduledEvent | YoutubeCollabOffer | YoutubeBrandDeal | any;
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
    annualFee: number;
    commission: number;
    tier: 'ROOKIE' | 'STANDARD' | 'ELITE';
    sponsorshipPower: number;
}

export interface TeamMember {
    id: string;
    name: string;
    type: 'TRAINER' | 'STYLIST' | 'THERAPIST' | 'PUBLICIST';
    tier: 'ROOKIE' | 'STANDARD' | 'ELITE' | 'LEGEND';
    weeklyCost: number;
    description: string;
    perks: string;
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
    occupation: 'ACTOR' | 'DIRECTOR';
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
    volatility: number;
    dividendYield: number;
    relatedBrandName?: string;
    relatedStudioId?: StudioId;
    priceHistory: number[];
    lastDividendPayoutWeek: number;
}

export interface PortfolioItem {
    stockId: string;
    shares: number;
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
    relation: 'Parent' | 'Friend' | 'Partner' | 'Spouse' | 'Ex-Partner' | 'Ex-Spouse' | 'Child' | 'Connection' | 'Agent' | 'Director' | 'Manager' | 'Colleague' | 'Networking' | 'Deceased Parent' | 'Sibling';
    closeness: number;
    image: string;
    lastInteractionWeek: number;
    lastInteractionAbsolute?: number;
    npcId?: string;
    age?: number;
    gender?: Gender;
    birthWeekAbsolute?: number;
}

export interface ImprovementOption {
    id: string;
    label: string;
    energyCost: number;
    moneyCost: number;
    gains: Partial<Stats> & Partial<ActorSkills>; 
    writerGains?: Partial<WriterStats>;
    directorGains?: Partial<DirectorStats>;
    risk: number; 
    description: string;
}

export interface ImprovementActivity {
    id: string;
    name: string;
    description: string;
    options: ImprovementOption[];
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

export interface Player {
    id: string;
    name: string;
    age: number;
    gender: Gender;
    avatar: string;
    money: number;
    energy: { current: number; max: number };
    stats: Stats;
    writerStats?: WriterStats;
    directorStats?: DirectorStats;
    currentWeek: number;
    assets: string[];
    customItems: (Property | Vehicle)[];
    residenceId: string | null;
    activeClothingStyle: SettableClothingStyle;
    commitments: Commitment[];
    activeReleases: ActiveRelease[];
    pastProjects: PastProject[];
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
        lastAgentFeePaidWeek: number;
        lastManagerFeePaidWeek: number;
        availableAgents: Agent[];
        availableManagers: Manager[];
        availableTrainers: TeamMember[];
        availableStylists: TeamMember[];
        availableTherapists: TeamMember[];
        availablePublicists: TeamMember[];
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
    businesses: Business[];
    activeSponsorships: SponsorshipOffer[];
    stocks: Stock[];
    portfolio: PortfolioItem[];
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
        weeksLeft: number;
    };
}

export const INITIAL_PLAYER: Player = {
    id: 'player',
    name: 'New Player',
    age: 18,
    gender: 'MALE',
    avatar: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Felix',
    money: 2000,
    energy: { current: 100, max: 100 },
    stats: {
        health: 80, happiness: 80, looks: 70, body: 70,
        fame: 0, reputation: 0, experience: 0, talent: 0, followers: 0, // Starts at 0
        skills: { delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0 },
        directorSkills: { vision: 0, technical: 0, leadership: 0, style: 0 },
        genreXP: { ACTION: 0, DRAMA: 0, COMEDY: 0, ROMANCE: 0, THRILLER: 0, HORROR: 0, SCI_FI: 0, ADVENTURE: 0, SUPERHERO: 0 }
    },
    writerStats: { creativity: 0, dialogue: 0, structure: 0, pacing: 0 },
    directorStats: { vision: 0, technical: 0, leadership: 0, style: 0 },
    currentWeek: 1,
    assets: [],
    customItems: [], // NEW
    residenceId: null,
    activeClothingStyle: 'Casual',
    commitments: [],
    activeReleases: [],
    pastProjects: [],
    applications: [],
    relationships: [
        { id: 'rel_mom', name: 'Mom', relation: 'Parent', closeness: 85, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Sophie', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 46, gender: 'FEMALE' },
        { id: 'rel_dad', name: 'Dad', relation: 'Parent', closeness: 80, image: 'https://api.dicebear.com/8.x/pixel-art/svg?seed=Arthur', lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 49, gender: 'MALE' }
    ],
    team: { 
        agent: null, manager: null, lastAgentFeePaidWeek: 0, lastManagerFeePaidWeek: 0, availableAgents: [], availableManagers: [],
        personalTrainer: null, stylist: null, therapist: null, publicist: null,
        availableTrainers: [], availableStylists: [], availableTherapists: [], availablePublicists: []
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
    businesses: [],
    activeSponsorships: [],
    stocks: [],
    portfolio: [],
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
            LUCASFILM: { id: 'LUCASFILM', name: 'Lucasfilm', valuation: 40, reputation: 85, cashReserve: 5000, recentHits: 0, archetype: 'FRANCHISE' }
        }
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
