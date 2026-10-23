// scripts/audit-industry-budget-suitability-b3.ts
import assert from "node:assert/strict";

// types.ts
var STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION = 2;
var STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION = 1;
var OWNED_STREAMING_PLATFORM_SCHEMA_VERSION = 27;
var createInitialOwnedStreamingPlatformState = (playerId = "") => ({
  schemaVersion: OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
  marketQuotePolicy: { version: 3, effectiveCycle: 0 },
  lifecycle: "LOCKED",
  identity: null,
  foundingDraft: null,
  foundingProfile: null,
  leadership: {
    currentCeo: {
      holderType: "FOUNDER",
      executiveId: null,
      sinceAbsoluteWeek: 0
    },
    appointments: [],
    developmentPrograms: [],
    delegation: {
      maximumRightsBid: 5e7,
      minimumCapacityHeadroomPercent: 20,
      weeklyCampaignLimit: 1e7,
      renewalMinimumMarginPercent: 15,
      incidentPolicy: "SERVICE_FIRST",
      updatedAtAbsoluteWeek: 0
    }
  },
  governance: {
    boardConfidence: 72,
    directors: [],
    motions: [],
    celebrityInvestors: []
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
    awardSeasons: []
  },
  corporateDevelopment: {
    acquisitionCases: [],
    integrations: [],
    acquiredPlatformIds: []
  },
  publicCompany: {
    lifecycle: "PRIVATE",
    ipoPlan: null,
    ipoJourney: null,
    listing: null,
    quoteHistory: [],
    guidance: [],
    earnings: [],
    shareholderVotes: [],
    activistCampaigns: [],
    hostileTakeovers: []
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
      maintenanceCadence: "BALANCED",
      insuranceTier: "NONE",
      lastProcessedAbsoluteWeek: null,
      incidents: [],
      totalMaintenanceSpend: 0,
      totalCompensationPaid: 0,
      totalInsuranceRecovered: 0,
      assistedResponseCount: 0,
      reliabilityStreakWeeks: 0,
      lastProgressionTier: "RENTED_CABINET",
      performanceHistory: [],
      awards: [],
      orchestratedFactIds: []
    }
  },
  legacy: {
    founderOfficeRole: "FOUNDER_CEO",
    currentEraNumber: 1,
    currentEraStartedAtAbsoluteWeek: 0,
    currentMandate: "BALANCED",
    successionPlan: null,
    closedEras: [],
    montages: [],
    endlessMode: false,
    transitionCount: 0
  },
  finance: {
    capitalActions: [],
    loans: [],
    equityHolders: []
  },
  launchProgram: {
    status: "NOT_STARTED",
    startedAtAbsoluteWeek: null,
    configurationRevision: 0,
    serviceConfigurationCommittedAtAbsoluteWeek: null,
    lastRehearsalSignature: null,
    completedAtAbsoluteWeek: null,
    defineCurrentStep: "FUND",
    buildCurrentStep: "BLUEPRINT",
    lastBlueprintSignature: null,
    blueprintSavedAtAbsoluteWeek: null,
    defineDraft: null
  },
  openingProgrammeCommission: null,
  marketOperations: [],
  serviceConfiguration: {
    source: "UNCONFIGURED",
    soundIdentKey: null,
    identPackageId: null,
    identDurationSeconds: 0,
    customIdentAudio: null,
    storefrontLayoutId: null,
    pricingApproach: null,
    pricing: {
      commercialOffers: {
        schemaVersion: 1,
        coreModel: "SUBSCRIPTION",
        coreModelSelected: false,
        freeAdAccess: false,
        adFreePasses: { oneHourPrice: null, dayPrice: null },
        benefits: {
          plans: {},
          freeAds: { premiumAccess: false, earlyAccessWeeks: 0 },
          store: { premiumAccess: false, earlyAccessWeeks: 0 }
        }
      },
      streams: ["subs"],
      plans: [
        { id: "BASIC", name: "Essential", monthly: 7.99, featureIds: [], ads: false },
        { id: "PREMIUM", name: "Standard", monthly: 12.99, featureIds: [], ads: false },
        { id: "FAMILY", name: "Premiere", monthly: 17.99, featureIds: [], ads: false }
      ],
      annualDiscount: 15,
      introOffer: 0,
      ads: { minutesPerHour: 4, cpm: 22 },
      rentals: { rent: 5.99, buy: 19.99, windowWeeks: 6 },
      premium: { price: 29.99 },
      daypass: { price: 7.99 },
      sponsor: { perTitle: 4e6, titles: 0 },
      metered: { perHour: 1 },
      patron: { monthly: 10 }
    },
    committedCost: 0,
    committedAtAbsoluteWeek: null,
    revision: 0
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
      PRODUCT_EXPERIENCE: 0
    }
  },
  localizationOperations: {
    providers: [],
    facilities: [],
    jobs: [],
    titleLanguageAssets: [],
    legacyPackageGrants: []
  },
  costCommitments: [],
  hqOnboarding: {
    status: "NOT_STARTED",
    currentStep: 0,
    visitedSections: [],
    startedAtAbsoluteWeek: null,
    completedAtAbsoluteWeek: null
  },
  infrastructureSetupDraft: null,
  infrastructureSetup: null,
  pendingInfrastructureSetup: null,
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
  launchMarketingDraft: {
    schemaVersion: 1,
    objective: "PLATFORM_INTRODUCTION",
    timeline: "BALANCED",
    budgetCeiling: 0,
    allocationMode: "AUTO",
    countryWeights: {},
    channelAllocations: {},
    updatedAtAbsoluteWeek: 0,
    revision: 0
  },
  launchMarketingPlan: null,
  launchCommit: null,
  subscriptionPrices: {
    BASIC: 7.99,
    PREMIUM: 13.99,
    FAMILY: 18.99
  },
  founderOwnershipPercent: 100,
  treasuryCash: 0,
  debtPrincipal: 0,
  infrastructureStrategy: "UNDECIDED",
  capacity: {
    baselineConcurrentStreams: 0,
    burstConcurrentStreams: 0
  },
  technologyLevels: {
    DELIVERY_CAPACITY: 0,
    PLAYBACK_QUALITY: 0,
    RELIABILITY: 0,
    DATA_RECOMMENDATIONS: 0,
    SECURITY: 0,
    CONTENT_OPERATIONS: 0,
    ADVERTISING_COMMERCE: 0,
    PRODUCT_EXPERIENCE: 0
  },
  metrics: {
    subscribers: 0,
    netSubscriberMovement: 0,
    churnRate: 0,
    engagementRate: 0,
    averageRevenuePerUser: 0,
    cashRunwayWeeks: 0,
    technologyHealth: 0
  },
  audienceAccessPolicy: {
    sharingPosture: "BALANCED",
    enforcementInvestment: "STANDARD",
    source: "LEADERSHIP_DEFAULT",
    updatedAtAbsoluteWeek: 0
  },
  catalogProjectIds: [],
  simulationSeed: playerId ? `owned-streaming:${playerId}` : "",
  lastProcessedAbsoluteWeek: null,
  processedWeekKeys: [],
  weeklyDecisions: [],
  growthActions: [],
  lastAcknowledgedWeeklyReportAbsoluteWeek: null,
  weeklyHistory: [],
  cycleReviews: [],
  eventLedger: [],
  cinematicQueue: [],
  milestoneKeys: []
});
var INITIAL_PLAYER = {
  id: "player",
  name: "New Player",
  age: 15,
  totalPlayTimeMs: 0,
  gender: "MALE",
  avatar: "",
  settings: {
    language: "en",
    smoothMode: false
  },
  money: 2e3,
  energy: { current: 100, max: 100 },
  stats: {
    health: 80,
    happiness: 80,
    looks: 70,
    body: 70,
    fame: 0,
    reputation: 0,
    experience: 0,
    talent: 0,
    followers: 0,
    // Starts at 0
    skills: { delivery: 0, memorization: 0, expression: 0, improvisation: 0, discipline: 0, presence: 0, charisma: 0, writing: 0 },
    directorSkills: { vision: 0, technical: 0, leadership: 0, style: 0 },
    genreXP: { ACTION: 0, DRAMA: 0, COMEDY: 0, ROMANCE: 0, THRILLER: 0, MYSTERY: 0, HORROR: 0, SCI_FI: 0, ADVENTURE: 0, SUPERHERO: 0, MUSICAL: 0, BIOPIC: 0, SPORTS: 0, ANIMATION: 0, FANTASY: 0, CRIME: 0, DOCUMENTARY: 0 }
  },
  writerStats: { creativity: 0, dialogue: 0, structure: 0, pacing: 0 },
  directorStats: { vision: 0, technical: 0, leadership: 0, style: 0 },
  currentWeek: 1,
  assets: [],
  customItems: [],
  // NEW
  assetStates: [],
  residenceId: null,
  activeVehicleId: null,
  commitments: [],
  activeReleases: [],
  pastProjects: [],
  outsideProductions: [],
  applications: [],
  relationships: [
    { id: "rel_mom", name: "Mom", relation: "Parent", closeness: 85, image: "", lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 46, gender: "FEMALE" },
    { id: "rel_dad", name: "Dad", relation: "Parent", closeness: 80, image: "", lastInteractionWeek: 0, lastInteractionAbsolute: 0, age: 49, gender: "MALE" }
  ],
  team: {
    agent: null,
    manager: null,
    lastAgentFeePaidWeek: 0,
    lastManagerFeePaidWeek: 0,
    availableAgents: [],
    availableManagers: [],
    personalTrainer: null,
    stylist: null,
    therapist: null,
    publicist: null,
    wellness: null,
    availableTrainers: [],
    availableStylists: [],
    availableTherapists: [],
    availablePublicists: [],
    availableWellness: []
  },
  news: [],
  inbox: [
    {
      id: "msg_dev_welcome",
      sender: "Zeesh (Developer)",
      subject: "A Note from the Creator",
      text: "Hey,\n\nThank you for playing this game.\n\nThis project has been a dream I\u2019ve carried for a long time to build an experience where you don\u2019t just play a career, but actually live through it. The struggles, the choices, the highs, the setbacks , all of it.\n\nAs you start your journey here, remember there\u2019s no single \u201Cright\u201D path. Take risks. Make mistakes. Chase the roles you believe in. Build your legacy your own way.\n\nI genuinely hope this world gives you moments you enjoy, stories you remember, and a career you feel proud of , even if it\u2019s fictional.\n\nWishing you the very best for your journey ahead.\n\nZeesh\nZeesh Apps",
      type: "SYSTEM",
      isRead: false,
      weekSent: 1,
      expiresIn: 10
    }
  ],
  instagram: { handle: "@player", followers: 0, posts: [], feed: [], npcStates: {}, weeklyPostCount: 0, lastPostWeek: 0, aesthetic: 50, authenticity: 55, controversy: 0, fashionInfluence: 10, fanLoyalty: 45 },
  x: { handle: "@player", followers: 0, posts: [], feed: [], lastPostWeek: 0 },
  // Starts at 0
  youtube: { handle: "@player", subscribers: 0, videos: [], lifetimeEarnings: 0, isMonetized: false, bannerColor: "bg-gradient-to-r from-red-900 to-zinc-900", totalChannelViews: 0, activeCollabs: [], activeBrandDeals: [], audienceTrust: 55, fanMood: 55, controversy: 0, membershipsActive: false, members: 0, lastLivestreamWeek: 0, lastMerchDropWeek: 0, creatorIdentity: "ACTOR_VLOGGER", lastIdentityChangeWeek: 0 },
  dating: { isTinderActive: false, isLuxeActive: false, preferences: { gender: "ALL", minAge: 18, maxAge: 35 }, matches: [], luxeRefreshOffset: 0, luxeCycleStartAbsoluteWeek: 0 },
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
    controlMode: "CUSTOM",
    policy: {
      noticeWeeks: 8,
      preference: "BALANCED",
      autoRenewMinimumScore: 62,
      letWeakContractsExpireBelowScore: 35,
      maximumAutomaticGuarantee: 15e7,
      maximumAutomaticDurationWeeks: 104,
      protectGlobalExclusives: true,
      protectFranchises: true
    },
    packagePolicy: {
      automation: "SUGGEST_ONLY",
      preferredSize: { min: 3, max: 6 },
      maximumAutomaticSize: 7,
      maximumAutomaticDurationWeeks: 104,
      allowAutomaticExclusive: false,
      allowAutomaticGlobal: false,
      minimumGuaranteeRatio: 0.85
    },
    protectedProjectIds: [],
    manualContractIds: [],
    studioMandates: {},
    updatedAtAbsoluteWeek: 0
  },
  world: {
    projects: [],
    trendingGenre: "ACTION",
    universes: {
      MCU: {
        id: "MCU",
        name: "Marvel Cinematic Universe",
        description: "The biggest franchise in history, focusing on interconnected superhero stories.",
        studioId: "MARVEL_STUDIOS",
        currentPhase: "PHASE_4_MULTIVERSE",
        saga: 2,
        momentum: 85,
        brandPower: 95,
        marketShare: 45,
        color: "#e23636",
        roster: [],
        slate: [],
        weeksUntilNextPhase: 52
      },
      DCU: {
        id: "DCU",
        name: "DC Universe",
        description: "A rebooted universe of iconic heroes like Superman and Batman.",
        studioId: "DC_STUDIOS",
        currentPhase: "PHASE_1_ORIGINS",
        saga: 1,
        momentum: 60,
        brandPower: 75,
        marketShare: 25,
        color: "#0476f2",
        roster: [],
        slate: [],
        weeksUntilNextPhase: 104
      },
      SW: {
        id: "SW",
        name: "Star Wars",
        description: "A galaxy far, far away, spanning generations of Jedi and Sith.",
        studioId: "LUCASFILM",
        currentPhase: "PHASE_3_WAR",
        saga: 3,
        momentum: 70,
        brandPower: 88,
        marketShare: 30,
        color: "#ffe81f",
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
      publishedEventKeys: []
    },
    streamingRightsContracts: {},
    streamingRightsTransactions: {},
    streamingRightsCalendar: {
      schemaVersion: STREAMING_RIGHTS_CALENDAR_SCHEMA_VERSION,
      renewalCases: {},
      digests: [],
      urgentNoticeKeys: [],
      lastProcessedAbsoluteWeek: -1
    },
    streamingRightsOffice: {
      schemaVersion: STREAMING_RIGHTS_OFFICE_SCHEMA_VERSION,
      digests: [],
      lastProcessedAbsoluteWeek: -1
    },
    streamingBiddingSessions: {},
    streamingCataloguePackages: {},
    streamingCataloguePackageDigests: [],
    streamingCataloguePackagesLastProcessedWeek: -1,
    streamingRoyaltySettlements: {},
    platforms: {
      NETFLIX: { id: "NETFLIX", name: "Netflix", subscribers: 260, valuation: 260, reputation: 80, cashReserve: 5e3, recentHits: 0, color: "text-red-600", churnRate: "FAST" },
      APPLE_TV: { id: "APPLE_TV", name: "Apple TV+", subscribers: 45, valuation: 2900, reputation: 95, cashReserve: 2e4, recentHits: 0, color: "text-zinc-400", churnRate: "SLOW" },
      DISNEY_PLUS: { id: "DISNEY_PLUS", name: "Disney+", subscribers: 150, valuation: 180, reputation: 85, cashReserve: 8e3, recentHits: 0, color: "text-blue-500", churnRate: "SLOW" },
      HULU: { id: "HULU", name: "Hulu", subscribers: 48, valuation: 27, reputation: 75, cashReserve: 2e3, recentHits: 0, color: "text-emerald-500", churnRate: "MEDIUM" },
      YOUTUBE: { id: "YOUTUBE", name: "YouTube", subscribers: 2500, valuation: 1800, reputation: 60, cashReserve: 15e3, recentHits: 0, color: "text-red-500", churnRate: "FAST" }
    },
    studios: {
      PARAMOUNT: { id: "PARAMOUNT", name: "Paramount Pictures", valuation: 22, reputation: 85, cashReserve: 3e3, recentHits: 0, archetype: "LEGACY" },
      HBO: { id: "HBO", name: "HBO", valuation: 18, reputation: 94, cashReserve: 3200, recentHits: 0, archetype: "PRESTIGE" },
      WARNER_BROS: { id: "WARNER_BROS", name: "Warner Bros.", valuation: 74, reputation: 90, cashReserve: 5e3, recentHits: 0, archetype: "LEGACY" },
      UNIVERSAL: { id: "UNIVERSAL", name: "Universal Pictures", valuation: 65, reputation: 88, cashReserve: 4500, recentHits: 0, archetype: "LEGACY" },
      ARTISAN_PICTURES: { id: "ARTISAN_PICTURES", name: "Artisan Pictures", valuation: 3, reputation: 95, cashReserve: 500, recentHits: 0, archetype: "PRESTIGE" },
      NETFLIX: { id: "NETFLIX", name: "Netflix", valuation: 260, reputation: 80, cashReserve: 5e3, recentHits: 0, archetype: "PLATFORM" },
      APPLE_TV: { id: "APPLE_TV", name: "Apple TV+", valuation: 2900, reputation: 95, cashReserve: 2e4, recentHits: 0, archetype: "PLATFORM" },
      DISNEY_PLUS: { id: "DISNEY_PLUS", name: "Disney+", valuation: 180, reputation: 85, cashReserve: 8e3, recentHits: 0, archetype: "PLATFORM" },
      HULU: { id: "HULU", name: "Hulu", valuation: 27, reputation: 75, cashReserve: 2e3, recentHits: 0, archetype: "PLATFORM" },
      YOUTUBE: { id: "YOUTUBE", name: "YouTube", valuation: 1800, reputation: 60, cashReserve: 15e3, recentHits: 0, archetype: "PLATFORM" },
      MARVEL_STUDIOS: { id: "MARVEL_STUDIOS", name: "Marvel Studios", valuation: 50, reputation: 90, cashReserve: 6e3, recentHits: 0, archetype: "FRANCHISE" },
      DC_STUDIOS: { id: "DC_STUDIOS", name: "DC Studios", valuation: 30, reputation: 80, cashReserve: 4e3, recentHits: 0, archetype: "FRANCHISE" },
      LUCASFILM: { id: "LUCASFILM", name: "Lucasfilm", valuation: 40, reputation: 85, cashReserve: 5e3, recentHits: 0, archetype: "FRANCHISE" },
      SONY_PICTURES: { id: "SONY_PICTURES", name: "Sony Pictures", valuation: 45, reputation: 84, cashReserve: 3500, recentHits: 0, archetype: "LEGACY" },
      LIONSGATE: { id: "LIONSGATE", name: "Lionsgate", valuation: 7, reputation: 76, cashReserve: 900, recentHits: 0, archetype: "LEGACY" },
      MGM: { id: "MGM", name: "MGM", valuation: 8, reputation: 82, cashReserve: 1200, recentHits: 0, archetype: "LEGACY" },
      DREAMWORKS: { id: "DREAMWORKS", name: "DreamWorks Pictures", valuation: 15, reputation: 83, cashReserve: 2200, recentHits: 0, archetype: "LEGACY" },
      PIXAR: { id: "PIXAR", name: "Pixar", valuation: 20, reputation: 96, cashReserve: 3e3, recentHits: 0, archetype: "PRESTIGE" },
      SEARCHLIGHT: { id: "SEARCHLIGHT", name: "Searchlight Pictures", valuation: 5, reputation: 93, cashReserve: 650, recentHits: 0, archetype: "PRESTIGE" },
      AMAZON_STUDIOS: { id: "AMAZON_STUDIOS", name: "Amazon Studios", valuation: 150, reputation: 82, cashReserve: 8e3, recentHits: 0, archetype: "PLATFORM" }
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
  studioMemory: {},
  studio: {
    isUnlocked: false,
    baseType: null,
    talentRoster: [],
    lastTalentRefreshWeek: 0
  },
  logs: [
    { week: 1, year: 15, message: "Welcome to Hollywood. Your journey starts today.", type: "neutral" },
    { week: 1, year: 15, message: "\u{1F514} Check your Message App for a note from the developer.", type: "positive" }
  ]
};

// services/productionLocations.ts
var COUNTRY_BY_LOCATION_ID = {
  LA: { countryId: "840", countryCode: "US", countryName: "United States" },
  ATL: { countryId: "840", countryCode: "US", countryName: "United States" },
  NYC: { countryId: "840", countryCode: "US", countryName: "United States" },
  VAN: { countryId: "124", countryCode: "CA", countryName: "Canada" },
  MEX: { countryId: "484", countryCode: "MX", countryName: "Mexico" },
  TOR: { countryId: "124", countryCode: "CA", countryName: "Canada" },
  LDN: { countryId: "826", countryCode: "GB", countryName: "United Kingdom" },
  PAR: { countryId: "250", countryCode: "FR", countryName: "France" },
  PRG: { countryId: "203", countryCode: "CZ", countryName: "Czechia" },
  ROM: { countryId: "380", countryCode: "IT", countryName: "Italy" },
  BER: { countryId: "276", countryCode: "DE", countryName: "Germany" },
  MAD: { countryId: "724", countryCode: "ES", countryName: "Spain" },
  TOK: { countryId: "392", countryCode: "JP", countryName: "Japan" },
  SEO: { countryId: "410", countryCode: "KR", countryName: "South Korea" },
  BOM: { countryId: "356", countryCode: "IN", countryName: "India" },
  HKG: { countryId: "344", countryCode: "HK", countryName: "Hong Kong" },
  BEI: { countryId: "156", countryCode: "CN", countryName: "China" },
  BKK: { countryId: "764", countryCode: "TH", countryName: "Thailand" },
  RIO: { countryId: "076", countryCode: "BR", countryName: "Brazil" },
  BUE: { countryId: "032", countryCode: "AR", countryName: "Argentina" },
  BOG: { countryId: "170", countryCode: "CO", countryName: "Colombia" },
  LIM: { countryId: "604", countryCode: "PE", countryName: "Peru" },
  CPT: { countryId: "710", countryCode: "ZA", countryName: "South Africa" },
  CAI: { countryId: "818", countryCode: "EG", countryName: "Egypt" },
  MAR: { countryId: "504", countryCode: "MA", countryName: "Morocco" },
  LAG: { countryId: "566", countryCode: "NG", countryName: "Nigeria" },
  SYD: { countryId: "036", countryCode: "AU", countryName: "Australia" },
  MEL: { countryId: "036", countryCode: "AU", countryName: "Australia" },
  AKL: { countryId: "554", countryCode: "NZ", countryName: "New Zealand" }
};
var location = (continentId, regionId, value) => {
  const country = COUNTRY_BY_LOCATION_ID[value.id];
  if (!country) throw new Error(`Production location ${value.id} is missing country metadata.`);
  return { ...value, ...country, continentId, regionId };
};
var PRODUCTION_LOCATION_CATALOG = [
  location("NA", "NORTH_AMERICA", { id: "LA", name: "Los Angeles", desc: "The heart of Hollywood. Expensive but high quality.", cost: 15e6, quality: 10, x: 15, y: 35, longitude: -118.2437, latitude: 34.0522 }),
  location("NA", "NORTH_AMERICA", { id: "ATL", name: "Atlanta", desc: "Generous tax credits. Good facilities.", cost: 5e6, quality: 5, x: 22, y: 38, longitude: -84.388, latitude: 33.749 }),
  location("NA", "NORTH_AMERICA", { id: "NYC", name: "New York", desc: "Iconic urban scenery. Very expensive.", cost: 2e7, quality: 9, x: 25, y: 32, longitude: -74.006, latitude: 40.7128 }),
  location("NA", "NORTH_AMERICA", { id: "VAN", name: "Vancouver", desc: "Versatile and budget friendly.", cost: 3e6, quality: 6, x: 12, y: 28, longitude: -123.1207, latitude: 49.2827 }),
  location("NA", "NORTH_AMERICA", { id: "MEX", name: "Mexico City", desc: "Vibrant culture and unique architecture.", cost: 4e6, quality: 7, x: 18, y: 45, longitude: -99.1332, latitude: 19.4326 }),
  location("NA", "NORTH_AMERICA", { id: "TOR", name: "Toronto", desc: "Urban double for New York and Chicago.", cost: 35e5, quality: 6, x: 20, y: 30, longitude: -79.3832, latitude: 43.6532 }),
  location("EU", "EUROPE", { id: "LDN", name: "London", desc: "World-class studios and talent.", cost: 12e6, quality: 9, x: 48, y: 28, longitude: -0.1276, latitude: 51.5072 }),
  location("EU", "EUROPE", { id: "PAR", name: "Paris", desc: "Romantic and historic.", cost: 1e7, quality: 8, x: 50, y: 32, longitude: 2.3522, latitude: 48.8566 }),
  location("EU", "EUROPE", { id: "PRG", name: "Prague", desc: "Old-world charm on a budget.", cost: 2e6, quality: 7, x: 54, y: 30, longitude: 14.4378, latitude: 50.0755 }),
  location("EU", "EUROPE", { id: "ROM", name: "Rome", desc: "Eternal city with epic scale.", cost: 9e6, quality: 9, x: 53, y: 36, longitude: 12.4964, latitude: 41.9028 }),
  location("EU", "EUROPE", { id: "BER", name: "Berlin", desc: "Gritty urban spaces and modern technology.", cost: 7e6, quality: 8, x: 53, y: 28, longitude: 13.405, latitude: 52.52 }),
  location("EU", "EUROPE", { id: "MAD", name: "Madrid", desc: "Sunny and historic.", cost: 5e6, quality: 7, x: 46, y: 38, longitude: -3.7038, latitude: 40.4168 }),
  location("AS", "ASIA", { id: "TOK", name: "Tokyo", desc: "Neon, precision, and futuristic infrastructure.", cost: 14e6, quality: 9, x: 88, y: 35, longitude: 139.6503, latitude: 35.6762 }),
  location("AS", "ASIA", { id: "SEO", name: "Seoul", desc: "Modern and efficient.", cost: 8e6, quality: 8, x: 84, y: 34, longitude: 126.978, latitude: 37.5665 }),
  location("AS", "ASIA", { id: "BOM", name: "Mumbai", desc: "The home of Bollywood.", cost: 6e6, quality: 7, x: 72, y: 48, longitude: 72.8777, latitude: 19.076 }),
  location("AS", "ASIA", { id: "HKG", name: "Hong Kong", desc: "Dense urban neon.", cost: 11e6, quality: 9, x: 80, y: 42, longitude: 114.1694, latitude: 22.3193 }),
  location("AS", "ASIA", { id: "BEI", name: "Beijing", desc: "Grand scale and history.", cost: 12e6, quality: 8, x: 78, y: 32, longitude: 116.4074, latitude: 39.9042 }),
  location("AS", "ASIA", { id: "BKK", name: "Bangkok", desc: "Fast-moving energy and landmark architecture.", cost: 3e6, quality: 6, x: 75, y: 45, longitude: 100.5018, latitude: 13.7563 }),
  location("SA", "SOUTH_AMERICA", { id: "RIO", name: "Rio de Janeiro", desc: "Stunning natural beauty.", cost: 5e6, quality: 8, x: 32, y: 72, longitude: -43.1729, latitude: -22.9068 }),
  location("SA", "SOUTH_AMERICA", { id: "BUE", name: "Buenos Aires", desc: "European flair in South America.", cost: 4e6, quality: 7, x: 30, y: 85, longitude: -58.3816, latitude: -34.6037 }),
  location("SA", "SOUTH_AMERICA", { id: "BOG", name: "Bogota", desc: "High-altitude urban character.", cost: 2e6, quality: 6, x: 25, y: 58, longitude: -74.0721, latitude: 4.711 }),
  location("SA", "SOUTH_AMERICA", { id: "LIM", name: "Lima", desc: "Coastal desert city.", cost: 25e5, quality: 6, x: 22, y: 65, longitude: -77.0428, latitude: -12.0464 }),
  location("AF", "AFRICA", { id: "CPT", name: "Cape Town", desc: "Diverse landscapes and excellent light.", cost: 4e6, quality: 8, x: 53, y: 82, longitude: 18.4241, latitude: -33.9249 }),
  location("AF", "AFRICA", { id: "CAI", name: "Cairo", desc: "Ancient landmarks and desert scale.", cost: 7e6, quality: 7, x: 56, y: 42, longitude: 31.2357, latitude: 30.0444 }),
  location("AF", "AFRICA", { id: "MAR", name: "Marrakesh", desc: "Rich colors and distinctive textures.", cost: 3e6, quality: 8, x: 46, y: 42, longitude: -7.9811, latitude: 31.6295 }),
  location("AF", "AFRICA", { id: "LAG", name: "Lagos", desc: "Bustling energy and a rapidly growing media scene.", cost: 2e6, quality: 5, x: 48, y: 55, longitude: 3.3792, latitude: 6.5244 }),
  location("OC", "OCEANIA", { id: "SYD", name: "Sydney", desc: "Modern harbor and coastal beauty.", cost: 1e7, quality: 9, x: 88, y: 82, longitude: 151.2093, latitude: -33.8688 }),
  location("OC", "OCEANIA", { id: "MEL", name: "Melbourne", desc: "Arts and culture hub.", cost: 8e6, quality: 8, x: 86, y: 86, longitude: 144.9631, latitude: -37.8136 }),
  location("OC", "OCEANIA", { id: "AKL", name: "Auckland", desc: "Large-scale landscapes and experienced crews.", cost: 6e6, quality: 10, x: 94, y: 88, longitude: 174.7633, latitude: -36.8485 })
];
var PRODUCTION_LOCATIONS_BY_CONTINENT = PRODUCTION_LOCATION_CATALOG.reduce(
  (result, item) => {
    result[item.continentId].push(item);
    return result;
  },
  { NA: [], SA: [], EU: [], AS: [], AF: [], OC: [] }
);

// services/worldEconomy/worldCountryRegistry.ts
var WORLD_POPULATION_BASELINE = 812e7;
var rows = (regionId, source) => source.trim().split("\n").map((line) => line.trim()).filter(Boolean).map((line) => {
  const [id, name, populationMillions, languageList] = line.split("|");
  return {
    id,
    name,
    regionId,
    populationMillions: Number(populationMillions),
    languages: languageList.split(",").map((language2) => language2.trim()).filter(Boolean)
  };
});
var RAW_COUNTRIES = [
  ...rows("NORTH_AMERICA", `
AG|Antigua and Barbuda|0.10|English
BS|Bahamas|0.41|English
BB|Barbados|0.28|English
BZ|Belize|0.42|English,Spanish
CA|Canada|41.0|English,French
CR|Costa Rica|5.2|Spanish
CU|Cuba|11.0|Spanish
DM|Dominica|0.07|English
DO|Dominican Republic|11.5|Spanish
SV|El Salvador|6.4|Spanish
GD|Grenada|0.13|English
GT|Guatemala|18.4|Spanish
HT|Haiti|11.9|Haitian Creole,French
HN|Honduras|10.8|Spanish
JM|Jamaica|2.8|English
MX|Mexico|131.0|Spanish
NI|Nicaragua|7.0|Spanish
PA|Panama|4.5|Spanish
KN|Saint Kitts and Nevis|0.05|English
LC|Saint Lucia|0.18|English
VC|Saint Vincent and the Grenadines|0.10|English
TT|Trinidad and Tobago|1.5|English
US|United States|342.0|English,Spanish
`),
  ...rows("SOUTH_AMERICA", `
AR|Argentina|46.0|Spanish
BO|Bolivia|12.5|Spanish,Quechua
BR|Brazil|218.0|Portuguese
CL|Chile|20.0|Spanish
CO|Colombia|53.0|Spanish
EC|Ecuador|18.5|Spanish
GY|Guyana|0.84|English
PY|Paraguay|7.0|Spanish,Guaran\xED
PE|Peru|34.5|Spanish,Quechua
SR|Suriname|0.64|Dutch
UY|Uruguay|3.4|Spanish
VE|Venezuela|29.0|Spanish
`),
  ...rows("EUROPE", `
AL|Albania|2.8|Albanian
AD|Andorra|0.08|Catalan
AT|Austria|9.2|German
BY|Belarus|9.1|Belarusian,Russian
BE|Belgium|11.8|Dutch,French,German
BA|Bosnia and Herzegovina|3.2|Bosnian,Croatian,Serbian
BG|Bulgaria|6.7|Bulgarian
HR|Croatia|3.9|Croatian
CY|Cyprus|1.3|Greek,Turkish
CZ|Czechia|10.9|Czech
DK|Denmark|6.0|Danish
EE|Estonia|1.4|Estonian
FI|Finland|5.6|Finnish,Swedish
FR|France|66.5|French
DE|Germany|84.5|German
GR|Greece|10.3|Greek
HU|Hungary|9.6|Hungarian
IS|Iceland|0.40|Icelandic
IE|Ireland|5.4|English,Irish
IT|Italy|59.0|Italian
XK|Kosovo|1.8|Albanian,Serbian
LV|Latvia|1.9|Latvian
LI|Liechtenstein|0.04|German
LT|Lithuania|2.9|Lithuanian
LU|Luxembourg|0.68|Luxembourgish,French,German
MT|Malta|0.55|Maltese,English
MD|Moldova|3.0|Romanian
MC|Monaco|0.04|French
ME|Montenegro|0.63|Montenegrin
NL|Netherlands|18.0|Dutch
MK|North Macedonia|1.8|Macedonian,Albanian
NO|Norway|5.6|Norwegian
PL|Poland|38.5|Polish
PT|Portugal|10.4|Portuguese
RO|Romania|19.0|Romanian
RU|Russia|144.0|Russian
SM|San Marino|0.03|Italian
RS|Serbia|6.7|Serbian
SK|Slovakia|5.4|Slovak
SI|Slovenia|2.1|Slovenian
ES|Spain|49.0|Spanish,Catalan
SE|Sweden|10.6|Swedish
CH|Switzerland|9.0|German,French,Italian
UA|Ukraine|37.0|Ukrainian
GB|United Kingdom|69.0|English
VA|Vatican City|0.001|Italian,Latin
`),
  ...rows("AFRICA", `
DZ|Algeria|47.0|Arabic,Berber
AO|Angola|38.0|Portuguese
BJ|Benin|14.5|French
BW|Botswana|2.7|English,Tswana
BF|Burkina Faso|24.0|French
BI|Burundi|14.0|Kirundi,French
CV|Cabo Verde|0.53|Portuguese
CM|Cameroon|29.5|French,English
CF|Central African Republic|5.5|French,Sango
TD|Chad|20.0|French,Arabic
KM|Comoros|0.88|Comorian,French,Arabic
CD|DR Congo|109.0|French
CG|Republic of the Congo|6.4|French
CI|C\xF4te d\u2019Ivoire|31.5|French
DJ|Djibouti|1.2|Arabic,French
EG|Egypt|116.0|Arabic
GQ|Equatorial Guinea|1.9|Spanish,French
ER|Eritrea|3.6|Tigrinya,Arabic
SZ|Eswatini|1.2|Swazi,English
ET|Ethiopia|132.0|Amharic
GA|Gabon|2.5|French
GM|Gambia|2.8|English
GH|Ghana|35.0|English
GN|Guinea|15.0|French
GW|Guinea-Bissau|2.2|Portuguese
KE|Kenya|56.5|Swahili,English
LS|Lesotho|2.3|Sesotho,English
LR|Liberia|5.6|English
LY|Libya|7.4|Arabic
MG|Madagascar|31.5|Malagasy,French
MW|Malawi|21.5|English,Chichewa
ML|Mali|25.0|French
MR|Mauritania|5.1|Arabic
MU|Mauritius|1.3|English,French
MA|Morocco|38.0|Arabic,Berber
MZ|Mozambique|35.0|Portuguese
NA|Namibia|3.0|English
NE|Niger|28.0|French
NG|Nigeria|232.0|English,Hausa,Yoruba,Igbo
RW|Rwanda|14.5|Kinyarwanda,English,French
ST|S\xE3o Tom\xE9 and Pr\xEDncipe|0.24|Portuguese
SN|Senegal|19.0|French
SC|Seychelles|0.13|Seychellois Creole,English,French
SL|Sierra Leone|8.9|English
SO|Somalia|19.0|Somali,Arabic
ZA|South Africa|64.0|English,Zulu,Afrikaans
SS|South Sudan|12.0|English
SD|Sudan|51.0|Arabic,English
TZ|Tanzania|69.0|Swahili,English
TG|Togo|9.5|French
TN|Tunisia|12.4|Arabic,French
UG|Uganda|50.0|English,Swahili
ZM|Zambia|21.5|English
ZW|Zimbabwe|16.8|English,Shona,Ndebele
`),
  ...rows("ASIA", `
AF|Afghanistan|43.5|Dari,Pashto
AM|Armenia|3.0|Armenian
AZ|Azerbaijan|10.4|Azerbaijani
BH|Bahrain|1.6|Arabic
BD|Bangladesh|175.0|Bengali
BT|Bhutan|0.80|Dzongkha
BN|Brunei|0.46|Malay
KH|Cambodia|17.6|Khmer
CN|China|1410.0|Mandarin
GE|Georgia|3.7|Georgian
IN|India|1450.0|Hindi,English,Tamil,Telugu,Bengali
ID|Indonesia|284.0|Indonesian
IR|Iran|91.0|Persian
IQ|Iraq|46.0|Arabic,Kurdish
IL|Israel|9.8|Hebrew,Arabic
JP|Japan|124.0|Japanese
JO|Jordan|11.5|Arabic
KZ|Kazakhstan|20.5|Kazakh,Russian
KW|Kuwait|5.0|Arabic
KG|Kyrgyzstan|7.2|Kyrgyz,Russian
LA|Laos|7.8|Lao
LB|Lebanon|5.8|Arabic,French
MY|Malaysia|35.5|Malay,English,Mandarin,Tamil
MV|Maldives|0.53|Dhivehi
MN|Mongolia|3.5|Mongolian
MM|Myanmar|55.0|Burmese
NP|Nepal|30.0|Nepali
KP|North Korea|26.5|Korean
OM|Oman|5.3|Arabic
PK|Pakistan|252.0|Urdu,English
PS|Palestine|5.5|Arabic
PH|Philippines|116.0|Filipino,English
QA|Qatar|3.0|Arabic
SA|Saudi Arabia|35.0|Arabic
SG|Singapore|6.0|English,Mandarin,Malay,Tamil
KR|South Korea|52.0|Korean
LK|Sri Lanka|23.0|Sinhala,Tamil
SY|Syria|25.0|Arabic
TW|Taiwan|23.5|Mandarin
TJ|Tajikistan|10.7|Tajik
TH|Thailand|71.5|Thai
TL|Timor-Leste|1.4|Tetum,Portuguese
TR|T\xFCrkiye|87.0|Turkish
TM|Turkmenistan|7.5|Turkmen
AE|United Arab Emirates|11.0|Arabic,English
UZ|Uzbekistan|37.0|Uzbek
VN|Vietnam|101.0|Vietnamese
YE|Yemen|41.0|Arabic
`),
  ...rows("OCEANIA", `
AU|Australia|27.5|English
FJ|Fiji|0.94|English,Fijian,Hindi
KI|Kiribati|0.14|English,Gilbertese
MH|Marshall Islands|0.04|Marshallese,English
FM|Micronesia|0.12|English
NR|Nauru|0.013|Nauruan,English
NZ|New Zealand|5.3|English,M\u0101ori
PW|Palau|0.018|Palauan,English
PG|Papua New Guinea|10.7|English,Tok Pisin
WS|Samoa|0.23|Samoan,English
SB|Solomon Islands|0.84|English
TO|Tonga|0.11|Tongan,English
TV|Tuvalu|0.011|Tuvaluan,English
VU|Vanuatu|0.34|Bislama,English,French
`)
];
var ADVANCED_IDS = /* @__PURE__ */ new Set([
  "AU",
  "AT",
  "BE",
  "CA",
  "DK",
  "FI",
  "FR",
  "DE",
  "IS",
  "IE",
  "IL",
  "IT",
  "JP",
  "KR",
  "LU",
  "NL",
  "NZ",
  "NO",
  "SG",
  "ES",
  "SE",
  "CH",
  "GB",
  "US",
  "AE",
  "QA",
  "KW",
  "BH",
  "BN",
  "LI",
  "MC",
  "SM",
  "AD"
]);
var DEVELOPED_IDS = /* @__PURE__ */ new Set([
  "AR",
  "BS",
  "BB",
  "BW",
  "BR",
  "BG",
  "CL",
  "CN",
  "CR",
  "HR",
  "CY",
  "CZ",
  "EE",
  "GR",
  "HU",
  "KZ",
  "LV",
  "LT",
  "MY",
  "MT",
  "MU",
  "MX",
  "OM",
  "PA",
  "PL",
  "PT",
  "RO",
  "RU",
  "SA",
  "SC",
  "SK",
  "SI",
  "ZA",
  "TT",
  "TR",
  "UY",
  "TW",
  "ME",
  "RS",
  "MK"
]);
var LOW_IDS = /* @__PURE__ */ new Set([
  "AF",
  "BF",
  "BI",
  "CF",
  "TD",
  "CD",
  "ER",
  "ET",
  "GM",
  "GN",
  "GW",
  "HT",
  "LR",
  "MG",
  "MW",
  "ML",
  "MZ",
  "NE",
  "RW",
  "SL",
  "SO",
  "SS",
  "SD",
  "TG",
  "UG",
  "YE"
]);
var resolveDevelopmentProfile = (id) => {
  if (ADVANCED_IDS.has(id)) return "ADVANCED";
  if (DEVELOPED_IDS.has(id)) return "DEVELOPED";
  if (LOW_IDS.has(id)) return "LOW";
  return "EMERGING";
};
var rawTotal = RAW_COUNTRIES.reduce((sum, country) => sum + country.populationMillions, 0);
var populationScale = WORLD_POPULATION_BASELINE / Math.max(1, rawTotal * 1e6);
var scaledPopulations = RAW_COUNTRIES.map((country) => Math.max(1, Math.round(
  country.populationMillions * 1e6 * populationScale
)));
var scaledTotal = scaledPopulations.reduce((sum, population) => sum + population, 0);
scaledPopulations[scaledPopulations.length - 1] += WORLD_POPULATION_BASELINE - scaledTotal;
var WORLD_COUNTRY_DEFINITIONS = RAW_COUNTRIES.map((country, index) => ({
  id: country.id,
  name: country.name,
  regionId: country.regionId,
  baselinePopulation: scaledPopulations[index],
  developmentProfile: resolveDevelopmentProfile(country.id),
  languages: country.languages
}));
var WORLD_COUNTRY_DEFINITIONS_BY_ID = Object.fromEntries(
  WORLD_COUNTRY_DEFINITIONS.map((country) => [country.id, country])
);

// services/streamingMarketSubRegions.ts
var group = (id, name, regionId, servedFromCityId, codes) => ({
  id,
  name,
  regionId,
  servedFromCityId,
  countryIds: codes.trim().split(/\s+/)
});
var STREAMING_MARKET_SUB_REGIONS = [
  /* --- the Americas ------------------------------------------------------ */
  group("NORTHERN_AMERICA", "Northern America", "NORTH_AMERICA", "LA", "US CA"),
  group("CENTRAL_AMERICA", "Central America", "NORTH_AMERICA", "MEX", "MX GT HN SV NI CR PA BZ"),
  group("CARIBBEAN", "Caribbean", "NORTH_AMERICA", "MEX", "CU DO HT JM TT BS BB AG DM GD KN LC VC"),
  group("SOUTHERN_CONE", "Brazil & the Southern Cone", "SOUTH_AMERICA", "RIO", "BR AR CL UY PY"),
  group("ANDEAN", "Andean states", "SOUTH_AMERICA", "BOG", "CO PE EC BO VE"),
  group("GUIANAS", "The Guianas", "SOUTH_AMERICA", "RIO", "GY SR"),
  /* --- Europe ------------------------------------------------------------- */
  group("WESTERN_EUROPE", "Western Europe", "EUROPE", "PAR", "GB IE FR BE NL LU MC"),
  group("NORDICS", "Nordics", "EUROPE", "LDN", "SE NO DK FI IS"),
  group("SOUTHERN_EUROPE", "Southern Europe", "EUROPE", "MAD", "ES PT IT GR MT CY AD SM VA"),
  group("CENTRAL_EUROPE", "Central Europe", "EUROPE", "BER", "DE PL CZ AT CH SK HU SI LI"),
  group("EASTERN_EUROPE", "Eastern Europe", "EUROPE", "PRG", "RU UA BY RO BG MD LT LV EE"),
  group("BALKANS", "The Balkans", "EUROPE", "ROM", "HR RS BA AL MK ME XK"),
  /* --- Africa -------------------------------------------------------------- */
  group("NORTH_AFRICA", "North Africa", "AFRICA", "CAI", "EG MA DZ TN LY SD"),
  group("WEST_AFRICA", "West Africa", "AFRICA", "LAG", "NG GH CI SN ML BF NE GN BJ TG SL LR MR GM GW CV"),
  group("EAST_AFRICA", "East Africa", "AFRICA", "CPT", "KE ET TZ UG RW BI SS SO DJ ER MG MU SC KM"),
  group("CENTRAL_AFRICA", "Central Africa", "AFRICA", "LAG", "CD CM AO TD CG CF GA GQ ST"),
  group("SOUTHERN_AFRICA", "Southern Africa", "AFRICA", "CPT", "ZA ZW ZM MZ BW NA MW LS SZ"),
  /* --- Asia ---------------------------------------------------------------- */
  group("EAST_ASIA", "East Asia", "ASIA", "TOK", "CN JP KR TW MN KP"),
  group("SOUTHEAST_ASIA", "Southeast Asia", "ASIA", "BKK", "ID TH VN PH MY SG MM KH LA BN TL"),
  group("SOUTH_ASIA", "South Asia", "ASIA", "BOM", "IN PK BD LK NP AF BT MV"),
  group("MIDDLE_EAST", "Middle East", "ASIA", "BOM", "SA AE IL TR IR IQ JO LB KW QA BH OM YE SY PS"),
  group("CENTRAL_ASIA", "Central Asia & the Caucasus", "ASIA", "BOM", "KZ UZ TM KG TJ GE AM AZ"),
  /* --- Oceania -------------------------------------------------------------- */
  group("AUSTRALASIA", "Australasia", "OCEANIA", "SYD", "AU NZ PG"),
  group("PACIFIC_ISLANDS", "Pacific Islands", "OCEANIA", "SYD", "FJ SB VU WS TO KI FM MH PW NR TV")
];
var SUB_REGION_BY_COUNTRY_ID = (() => {
  const index = {};
  const duplicates = [];
  STREAMING_MARKET_SUB_REGIONS.forEach((subRegion) => subRegion.countryIds.forEach((id) => {
    if (index[id]) duplicates.push(id);
    index[id] = subRegion;
  }));
  if (duplicates.length > 0) {
    throw new Error(`Countries in more than one sub-region: ${duplicates.join(", ")}`);
  }
  const missing = WORLD_COUNTRY_DEFINITIONS.filter((country) => !index[country.id]).map((country) => country.id);
  if (missing.length > 0) {
    throw new Error(`Countries in no sub-region: ${missing.join(", ")}`);
  }
  const unknown = Object.keys(index).filter((id) => !WORLD_COUNTRY_DEFINITIONS.some((country) => country.id === id));
  if (unknown.length > 0) {
    throw new Error(`Sub-regions name countries the world registry does not hold: ${unknown.join(", ")}`);
  }
  const misfiled = STREAMING_MARKET_SUB_REGIONS.flatMap((subRegion) => subRegion.countryIds.filter((id) => {
    const country = WORLD_COUNTRY_DEFINITIONS.find((candidate) => candidate.id === id);
    return country && country.regionId !== subRegion.regionId;
  }).map((id) => `${id} in ${subRegion.id}`));
  if (misfiled.length > 0) {
    throw new Error(`Countries filed under the wrong region: ${misfiled.join(", ")}`);
  }
  return index;
})();
var getStreamingMarketSubRegion = (countryId) => SUB_REGION_BY_COUNTRY_ID[String(countryId || "").trim().toUpperCase()] || null;

// services/streamingDayOneMarkets.ts
var rival = (id, name, watchSharePercent) => ({ id, name, watchSharePercent });
var netflix = (share) => rival("NETFLIX", "Netflix", share);
var disney = (share) => rival("DISNEY_PLUS", "Disney+", share);
var prime = (share) => rival("AMAZON_PRIME", "Prime Video", share);
var apple = (share) => rival("APPLE_TV", "Apple TV+", share);
var hulu = (share) => rival("HULU", "Hulu", share);
var youtube = (share) => rival("YOUTUBE", "YouTube", share);
var STREAMING_DAY_ONE_MARKETS = [
  { id: "US", country: "United States", regionId: "NORTH_AMERICA", streamingAudience: 225e6, annualGrowthPercent: 3, growth: "MATURE", openingRightsEstimate: 48e6, languages: ["English", "Spanish"], competition: "FIERCE", launchDifficulty: "HARD", localizationNote: "English launch; Spanish audio widens household reach.", marketNote: "Huge spending power, but every major rival protects this market.", recommendedCityId: "LA", rivals: [netflix(24), prime(18), disney(15), hulu(10)] },
  { id: "CA", country: "Canada", regionId: "NORTH_AMERICA", streamingAudience: 29e6, annualGrowthPercent: 4, growth: "STEADY", openingRightsEstimate: 11e6, languages: ["English", "French"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "French support matters in Quebec.", marketNote: "High subscription comfort and a manageable opening footprint.", recommendedCityId: "TOR", rivals: [netflix(28), prime(17), disney(14), apple(7)] },
  { id: "MX", country: "Mexico", regionId: "NORTH_AMERICA", streamingAudience: 73e6, annualGrowthPercent: 9, growth: "FAST", openingRightsEstimate: 14e6, languages: ["Spanish"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "Neutral Spanish dubbing travels well across the region.", marketNote: "A large, fast-growing audience with strong local-content demand.", recommendedCityId: "MEX", rivals: [netflix(30), prime(19), disney(16), youtube(9)] },
  { id: "BR", country: "Brazil", regionId: "SOUTH_AMERICA", streamingAudience: 108e6, annualGrowthPercent: 10, growth: "FAST", openingRightsEstimate: 18e6, languages: ["Portuguese"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "Brazilian Portuguese dubbing is essential.", marketNote: "The continent\u2019s biggest opening audience and a powerful fandom culture.", recommendedCityId: "RIO", rivals: [netflix(31), prime(20), disney(15), youtube(8)] },
  { id: "AR", country: "Argentina", regionId: "SOUTH_AMERICA", streamingAudience: 26e6, annualGrowthPercent: 7, growth: "STEADY", openingRightsEstimate: 7e6, languages: ["Spanish"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "Regional Spanish works; local pricing is sensitive.", marketNote: "Engaged viewers, but price changes can move subscribers quickly.", recommendedCityId: "BUE", rivals: [netflix(34), prime(18), disney(14), youtube(9)] },
  { id: "CO", country: "Colombia", regionId: "SOUTH_AMERICA", streamingAudience: 3e7, annualGrowthPercent: 11, growth: "FAST", openingRightsEstimate: 6e6, languages: ["Spanish"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "Spanish launch; local drama improves discovery.", marketNote: "Good growth and lower opening costs than the largest markets.", recommendedCityId: "BOG", rivals: [netflix(29), prime(16), disney(12), youtube(10)] },
  { id: "CL", country: "Chile", regionId: "SOUTH_AMERICA", streamingAudience: 13e6, annualGrowthPercent: 6, growth: "STEADY", openingRightsEstimate: 4e6, languages: ["Spanish"], competition: "OPEN", launchDifficulty: "EASY", localizationNote: "Regional Spanish is enough for day one.", marketNote: "Smaller audience, dependable payments, easier opening.", recommendedCityId: "BUE", rivals: [netflix(32), prime(17), disney(13), apple(6)] },
  { id: "GB", country: "United Kingdom", regionId: "EUROPE", streamingAudience: 49e6, annualGrowthPercent: 3, growth: "MATURE", openingRightsEstimate: 2e7, languages: ["English"], competition: "FIERCE", launchDifficulty: "HARD", localizationNote: "No dubbing needed; local programming expectations are high.", marketNote: "Prestige market with fierce rivals and strong press influence.", recommendedCityId: "LDN", rivals: [netflix(25), prime(21), disney(14), apple(9)] },
  { id: "DE", country: "Germany", regionId: "EUROPE", streamingAudience: 56e6, annualGrowthPercent: 5, growth: "STEADY", openingRightsEstimate: 17e6, languages: ["German"], competition: "BUSY", launchDifficulty: "HARD", localizationNote: "High-quality German dubbing is expected.", marketNote: "Large paying audience with strict privacy and service expectations.", recommendedCityId: "BER", rivals: [netflix(27), prime(23), disney(12), apple(7)] },
  { id: "FR", country: "France", regionId: "EUROPE", streamingAudience: 45e6, annualGrowthPercent: 5, growth: "STEADY", openingRightsEstimate: 16e6, languages: ["French"], competition: "BUSY", launchDifficulty: "HARD", localizationNote: "French dubbing and local-content commitments matter.", marketNote: "Strong cinema culture rewards a serious local slate.", recommendedCityId: "PAR", rivals: [netflix(29), prime(16), disney(14), apple(6)] },
  { id: "ES", country: "Spain", regionId: "EUROPE", streamingAudience: 32e6, annualGrowthPercent: 6, growth: "STEADY", openingRightsEstimate: 1e7, languages: ["Spanish", "Catalan"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "Spanish dubbing required; Catalan adds goodwill.", marketNote: "Strong series audience and a useful bridge to Latin America.", recommendedCityId: "MAD", rivals: [netflix(31), prime(20), disney(13), apple(6)] },
  { id: "IT", country: "Italy", regionId: "EUROPE", streamingAudience: 37e6, annualGrowthPercent: 6, growth: "STEADY", openingRightsEstimate: 11e6, languages: ["Italian"], competition: "BUSY", launchDifficulty: "MODERATE", localizationNote: "Italian dubbing is a day-one expectation.", marketNote: "Broad household audience with room for local originals.", recommendedCityId: "ROM", rivals: [netflix(30), prime(21), disney(13), apple(5)] },
  { id: "ZA", country: "South Africa", regionId: "AFRICA", streamingAudience: 24e6, annualGrowthPercent: 12, growth: "FAST", openingRightsEstimate: 6e6, languages: ["English", "Zulu", "Afrikaans"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "English opens the door; local subtitles grow trust.", marketNote: "Best-developed opening base in the region with good expansion potential.", recommendedCityId: "CPT", rivals: [netflix(28), prime(13), disney(9), youtube(12)] },
  { id: "NG", country: "Nigeria", regionId: "AFRICA", streamingAudience: 31e6, annualGrowthPercent: 19, growth: "FAST", openingRightsEstimate: 5e6, languages: ["English", "Hausa", "Yoruba", "Igbo"], competition: "OPEN", launchDifficulty: "HARD", localizationNote: "English works; local-language discovery unlocks scale.", marketNote: "Explosive mobile growth and a powerful local film industry.", recommendedCityId: "LAG", rivals: [netflix(20), prime(11), youtube(18), disney(5)] },
  { id: "EG", country: "Egypt", regionId: "AFRICA", streamingAudience: 28e6, annualGrowthPercent: 14, growth: "FAST", openingRightsEstimate: 6e6, languages: ["Arabic"], competition: "OPEN", launchDifficulty: "HARD", localizationNote: "Arabic dubbing and careful local review are required.", marketNote: "A gateway to Arabic-speaking audiences with higher launch care.", recommendedCityId: "CAI", rivals: [netflix(22), prime(12), youtube(16), disney(8)] },
  { id: "KE", country: "Kenya", regionId: "AFRICA", streamingAudience: 14e6, annualGrowthPercent: 17, growth: "FAST", openingRightsEstimate: 3e6, languages: ["English", "Swahili"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "English and Swahili subtitles cover most viewers.", marketNote: "Mobile-first audience and a relatively open competitive field.", recommendedCityId: "LAG", rivals: [netflix(18), youtube(20), prime(9), disney(5)] },
  { id: "IN", country: "India", regionId: "ASIA", streamingAudience: 31e7, annualGrowthPercent: 16, growth: "FAST", openingRightsEstimate: 34e6, languages: ["Hindi", "Tamil", "Telugu", "Bengali", "English"], competition: "FIERCE", launchDifficulty: "HARD", localizationNote: "Multi-language dubbing is essential for national reach.", marketNote: "Enormous scale, fierce pricing, and many distinct audience cultures.", recommendedCityId: "BOM", rivals: [prime(19), netflix(17), disney(16), youtube(15)] },
  { id: "JP", country: "Japan", regionId: "ASIA", streamingAudience: 67e6, annualGrowthPercent: 6, growth: "STEADY", openingRightsEstimate: 22e6, languages: ["Japanese"], competition: "FIERCE", launchDifficulty: "HARD", localizationNote: "Premium Japanese dubbing and subtitles are expected.", marketNote: "High-value audience with strong local anime and drama rivals.", recommendedCityId: "TOK", rivals: [netflix(23), prime(22), disney(11), apple(7)] },
  { id: "KR", country: "South Korea", regionId: "ASIA", streamingAudience: 39e6, annualGrowthPercent: 8, growth: "STEADY", openingRightsEstimate: 14e6, languages: ["Korean"], competition: "BUSY", launchDifficulty: "HARD", localizationNote: "Korean localization and local originals drive credibility.", marketNote: "A trend-setting export market where hits can travel worldwide.", recommendedCityId: "SEO", rivals: [netflix(31), youtube(13), disney(11), prime(9)] },
  { id: "ID", country: "Indonesia", regionId: "ASIA", streamingAudience: 95e6, annualGrowthPercent: 18, growth: "FAST", openingRightsEstimate: 1e7, languages: ["Indonesian"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "Indonesian subtitles are essential; dubbing helps families.", marketNote: "Large mobile audience with strong growth and price sensitivity.", recommendedCityId: "BKK", rivals: [netflix(19), prime(12), disney(10), youtube(18)] },
  { id: "TH", country: "Thailand", regionId: "ASIA", streamingAudience: 34e6, annualGrowthPercent: 13, growth: "FAST", openingRightsEstimate: 7e6, languages: ["Thai"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "Thai subtitles are required; dubbing lifts family viewing.", marketNote: "Fast growth with strong demand for Asian drama and variety.", recommendedCityId: "BKK", rivals: [netflix(23), youtube(17), prime(10), disney(8)] },
  { id: "PH", country: "Philippines", regionId: "ASIA", streamingAudience: 48e6, annualGrowthPercent: 15, growth: "FAST", openingRightsEstimate: 7e6, languages: ["Filipino", "English"], competition: "OPEN", launchDifficulty: "MODERATE", localizationNote: "English works widely; Filipino localization improves mass reach.", marketNote: "Social, mobile audience that responds strongly to fandom.", recommendedCityId: "HKG", rivals: [netflix(24), youtube(20), disney(10), prime(9)] },
  { id: "AU", country: "Australia", regionId: "OCEANIA", streamingAudience: 2e7, annualGrowthPercent: 4, growth: "MATURE", openingRightsEstimate: 9e6, languages: ["English"], competition: "FIERCE", launchDifficulty: "MODERATE", localizationNote: "No dubbing needed; local catalog depth matters.", marketNote: "High subscription use, but most households already know the rivals.", recommendedCityId: "SYD", rivals: [netflix(26), prime(20), disney(15), apple(8)] },
  { id: "NZ", country: "New Zealand", regionId: "OCEANIA", streamingAudience: 4e6, annualGrowthPercent: 4, growth: "MATURE", openingRightsEstimate: 2e6, languages: ["English", "M\u0101ori"], competition: "BUSY", launchDifficulty: "EASY", localizationNote: "English launch; M\u0101ori support builds local trust.", marketNote: "Small, stable audience that pairs naturally with Australia.", recommendedCityId: "AKL", rivals: [netflix(28), prime(19), disney(14), apple(7)] }
];
var PROFILE_PENETRATION = {
  ADVANCED: 0.68,
  DEVELOPED: 0.52,
  EMERGING: 0.26,
  LOW: 0.1
};
var PROFILE_RIGHTS_PER_VIEWER = {
  ADVANCED: 0.34,
  DEVELOPED: 0.24,
  EMERGING: 0.17,
  LOW: 0.12
};
var PROFILE_GROWTH = {
  ADVANCED: 3.2,
  DEVELOPED: 6.4,
  EMERGING: 11,
  LOW: 15
};
var PROFILE_GROWTH_BAND = {
  ADVANCED: "MATURE",
  DEVELOPED: "STEADY",
  EMERGING: "FAST",
  LOW: "FAST"
};
var PROFILE_LOCALIZATION = {
  ADVANCED: "Subtitles and dubs expected from day one.",
  DEVELOPED: "Subtitles expected; dubbing on the biggest titles.",
  EMERGING: "Subtitles carry most of the catalogue.",
  LOW: "Subtitles only, and a light catalogue to start."
};
var derivedMarketNote = (country, audience) => {
  const size = audience >= 4e7 ? "A large audience" : audience >= 8e6 ? "A mid-sized audience" : audience >= 1e6 ? "A small audience" : "A very small audience";
  const habit = country.developmentProfile === "ADVANCED" ? "already paying for several services" : country.developmentProfile === "DEVELOPED" ? "used to paying for one or two services" : country.developmentProfile === "EMERGING" ? "new to paying for streaming and growing fast" : "mostly watching on mobile, with little paid habit yet";
  return `${size} ${habit}. ${country.languages.length > 1 ? `${country.languages.length} languages to serve.` : `${country.languages[0]}-speaking.`}`;
};
var derivedRivals = (profile2) => profile2 === "ADVANCED" ? [
  { id: "NETFLIX", name: "Netflix", watchSharePercent: 31 },
  { id: "AMAZON_PRIME", name: "Amazon Prime Video", watchSharePercent: 17 },
  { id: "DISNEY_PLUS", name: "Disney+", watchSharePercent: 12 }
] : profile2 === "DEVELOPED" ? [
  { id: "NETFLIX", name: "Netflix", watchSharePercent: 26 },
  { id: "AMAZON_PRIME", name: "Amazon Prime Video", watchSharePercent: 11 }
] : profile2 === "EMERGING" ? [
  { id: "NETFLIX", name: "Netflix", watchSharePercent: 17 },
  { id: "YOUTUBE", name: "YouTube", watchSharePercent: 14 }
] : [
  { id: "YOUTUBE", name: "YouTube", watchSharePercent: 12 }
];
var deriveMarket = (country) => {
  const profile2 = country.developmentProfile;
  const audience = Math.max(2e4, Math.round(country.baselinePopulation * PROFILE_PENETRATION[profile2]));
  const competition = profile2 === "ADVANCED" ? "BUSY" : profile2 === "DEVELOPED" && audience >= 2e7 ? "BUSY" : "OPEN";
  const effort = (audience >= 4e7 ? 2 : audience >= 6e6 ? 1 : 0) + (country.languages.length >= 3 ? 1 : 0) + (profile2 === "LOW" ? 1 : 0);
  const launchDifficulty = effort >= 3 ? "HARD" : effort >= 1 ? "MODERATE" : "EASY";
  return {
    id: country.id,
    country: country.name,
    regionId: country.regionId,
    streamingAudience: audience,
    annualGrowthPercent: PROFILE_GROWTH[profile2],
    growth: PROFILE_GROWTH_BAND[profile2],
    openingRightsEstimate: Math.round(audience * PROFILE_RIGHTS_PER_VIEWER[profile2]),
    languages: country.languages,
    competition,
    launchDifficulty,
    localizationNote: PROFILE_LOCALIZATION[profile2],
    marketNote: derivedMarketNote(country, audience),
    recommendedCityId: getStreamingMarketSubRegion(country.id)?.servedFromCityId || "LDN",
    rivals: derivedRivals(profile2)
  };
};
var STREAMING_WORLD_MARKETS = (() => {
  const authored = new Map(STREAMING_DAY_ONE_MARKETS.map((market) => [market.id, market]));
  return WORLD_COUNTRY_DEFINITIONS.map((country) => authored.get(country.id) || deriveMarket(country));
})();
var MARKET_BY_ID = new Map(STREAMING_WORLD_MARKETS.map((market) => [market.id, market]));
var VALID_CITY_IDS = new Set(PRODUCTION_LOCATION_CATALOG.map((city) => city.id));

// services/i18n.ts
var SUPPORTED_LANGUAGES = [
  {
    id: "en",
    flagEmoji: "\u{1F1FA}\u{1F1F8}",
    flagCode: "US",
    label: "English",
    nativeLabel: "English",
    status: "AVAILABLE",
    coverageLabel: "Source",
    coverageSubtext: "Original text and fallback."
  },
  {
    id: "pt-BR",
    flagEmoji: "\u{1F1E7}\u{1F1F7}",
    flagCode: "BR",
    label: "Portuguese (Brazil)",
    nativeLabel: "Portugu\xEAs (Brasil)",
    status: "IN_PROGRESS",
    coverageLabel: "Interface",
    coverageSubtext: "Menus translated. Story text in progress."
  },
  {
    id: "fr",
    flagEmoji: "\u{1F1EB}\u{1F1F7}",
    flagCode: "FR",
    label: "French",
    nativeLabel: "Fran\xE7ais",
    status: "IN_PROGRESS",
    coverageLabel: "Draft",
    coverageSubtext: "Selectable draft. Translation polish in progress."
  },
  {
    id: "es",
    flagEmoji: "\u{1F1EA}\u{1F1F8}",
    flagCode: "ES",
    label: "Spanish",
    nativeLabel: "Espa\xF1ol",
    status: "IN_PROGRESS",
    coverageLabel: "Draft",
    coverageSubtext: "Selectable draft. Translation polish in progress."
  },
  {
    id: "tr",
    flagEmoji: "\u{1F1F9}\u{1F1F7}",
    flagCode: "TR",
    label: "Turkish",
    nativeLabel: "T\xFCrk\xE7e",
    status: "IN_PROGRESS",
    coverageLabel: "Beta",
    coverageSubtext: "Selectable beta. Translation polish in progress."
  },
  {
    id: "de",
    flagEmoji: "\u{1F1E9}\u{1F1EA}",
    flagCode: "DE",
    label: "German",
    nativeLabel: "Deutsch",
    status: "IN_PROGRESS",
    coverageLabel: "Beta",
    coverageSubtext: "Selectable beta. Translation polish in progress."
  }
];
var SUPPORTED_LANGUAGE_IDS = new Set(SUPPORTED_LANGUAGES.map((language2) => language2.id));

// services/streamingStorefront.ts
var tech = (branch, level, label) => ({ kind: "TECH", branch, level, label });
var STREAMING_STOREFRONT_LAYOUTS = [
  // Permanent, content-neutral ways to arrange the same catalogue. Product
  // features, recommendation systems and campaign takeovers live elsewhere.
  { id: "cinema", name: "Cinema", line: "One premiere commands the room, with the library waiting below.", effects: ["Strong premium signal", "Makes one title feel important", "Needs a dependable headline"], family: "cinema", composition: "hero", category: "CORE" },
  { id: "spotlight", name: "Spotlight", line: "A restrained hero and one decisive row keep the next choice obvious.", effects: ["Fastest path to play", "Works with a small catalogue", "Offers less browsing depth"], family: "cinema", composition: "hero", category: "CORE" },
  { id: "wall", name: "Wall", line: "Everything at once, arranged as one visual field of taste.", effects: ["Whole catalogue is visible", "Rewards library depth", "Can overwhelm a thin slate"], family: "wall", composition: "wall", category: "CORE" },
  { id: "shelves", name: "Shelves", line: "Horizontal rows divide the catalogue into clear browsing lanes.", effects: ["Familiar browsing rhythm", "Scales with catalogue depth", "Can feel repetitive without varied artwork"], family: "discovery", composition: "shelves", category: "CORE" },
  { id: "timeline", name: "Timeline", line: "Dated rows stack releases into a clear vertical chronology.", effects: ["Clear release rhythm", "Simple to scan", "Shows fewer titles at once"], family: "timeline", composition: "timeline", category: "CORE" },
  { id: "quiet-shelf", name: "Quiet Shelf", line: "A calm, low-choice front page built around a few confident selections.", effects: ["Low decision fatigue", "Feels deliberate and premium", "Browsing moves more slowly"], family: "cinema", composition: "vault", category: "CORE" },
  // More authored arrangements. Their unlocks represent layout-production
  // complexity only; they do not smuggle platform features into this list.
  { id: "marquee", name: "Marquee", line: "Wide theatrical banners sell the service as a sequence of premieres.", effects: ["Big campaign moments", "Excellent trailer placement", "Requires frequent art refreshes"], family: "cinema", composition: "split", category: "EDITORIAL", requirements: [tech("PRODUCT_EXPERIENCE", 10, "Product Experience 10")] },
  { id: "editorial-index", name: "Editorial Index", line: "A numbered index pairs one focused title with a navigable catalogue.", effects: ["Clear editorial hierarchy", "Gives every title useful context", "Needs steady curation"], family: "rooms", composition: "vault", category: "EDITORIAL", requirements: [tech("CONTENT_OPERATIONS", 12, "Content Operations 12")] },
  { id: "chapters", name: "Chapters", line: "The front page reads as hand-built editorial chapters, not generic rails.", effects: ["Creates a clear voice", "Surfaces unexpected titles", "Editorial work repeats weekly"], family: "rooms", composition: "rooms", category: "EDITORIAL", requirements: [tech("CONTENT_OPERATIONS", 18, "Content Operations 18")] },
  { id: "split-hero", name: "Split Hero", line: "Two equal headline spaces divide the opening screen.", effects: ["Balances two priorities", "Creates immediate contrast", "Divides attention between anchors"], family: "cinema", composition: "split", category: "EDITORIAL", requirements: [tech("PRODUCT_EXPERIENCE", 18, "Product Experience 18")] },
  { id: "mosaic", name: "Mosaic", line: "Mixed poster sizes create an asymmetric visual field.", effects: ["Makes browsing visually energetic", "Highlights titles at different weights", "Needs strong artwork coverage"], family: "wall", composition: "wall", category: "EDITORIAL", requirements: [tech("PRODUCT_EXPERIENCE", 24, "Product Experience 24")] },
  { id: "vertical-feed", name: "Vertical Feed", line: "Full-width cards move vertically, one strong title at a time.", effects: ["Designed for one-handed browsing", "Keeps every title legible", "Shows fewer titles at once"], family: "feed", composition: "feed", category: "FRONTIER", requirements: [tech("PRODUCT_EXPERIENCE", 28, "Product Experience 28")] },
  { id: "freeform-canvas", name: "Freeform Canvas", line: "Poster tiles occupy a freeform spatial canvas instead of fixed rows.", effects: ["Creates a distinctive browsing rhythm", "Uses mixed tile scale well", "Demands advanced navigation controls"], family: "wall", composition: "canvas", category: "FRONTIER", experimental: true, requirements: [tech("PRODUCT_EXPERIENCE", 55, "Product Experience 55")] }
];

// services/streamingLocalizationCapabilities.ts
var normalizeStreamingLanguageId = (value) => String(value || "").trim().toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
var STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS = [
  { id: "LOCALIZATION_FOUNDATION", prerequisiteIds: [], subtitleLevel: 0, dubbingLevel: 0, contentOperationsFloor: 10 },
  { id: "SUBTITLE_OPERATIONS_L1", prerequisiteIds: ["LOCALIZATION_FOUNDATION"], subtitleLevel: 1, dubbingLevel: 0, contentOperationsFloor: 10 },
  { id: "SUBTITLE_OPERATIONS_L2", prerequisiteIds: ["SUBTITLE_OPERATIONS_L1"], subtitleLevel: 2, dubbingLevel: 0, contentOperationsFloor: 22 },
  { id: "SUBTITLE_OPERATIONS_L3", prerequisiteIds: ["SUBTITLE_OPERATIONS_L2"], subtitleLevel: 3, dubbingLevel: 0, contentOperationsFloor: 40 },
  { id: "DUBBING_OPERATIONS_L1", prerequisiteIds: ["LOCALIZATION_FOUNDATION"], subtitleLevel: 0, dubbingLevel: 1, contentOperationsFloor: 22 },
  { id: "DUBBING_OPERATIONS_L2", prerequisiteIds: ["DUBBING_OPERATIONS_L1"], subtitleLevel: 0, dubbingLevel: 2, contentOperationsFloor: 40 },
  { id: "DUBBING_OPERATIONS_L3", prerequisiteIds: ["DUBBING_OPERATIONS_L2"], subtitleLevel: 0, dubbingLevel: 3, contentOperationsFloor: 65 },
  { id: "SIMULTANEOUS_LOCALIZATION", prerequisiteIds: ["SUBTITLE_OPERATIONS_L3", "DUBBING_OPERATIONS_L2"], subtitleLevel: 3, dubbingLevel: 2, contentOperationsFloor: 65 }
];
var STREAMING_LANGUAGE_PACKAGES = [
  { id: "INDIA_CORE", name: "India Core Languages", languageIds: ["hindi", "tamil", "telugu", "bengali"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 9e6, weeklyOperatingCost: 145e3 },
  { id: "EAST_ASIA_CORE", name: "East Asia Core Languages", languageIds: ["japanese", "korean"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 8e6, weeklyOperatingCost: 12e4 },
  { id: "LATIN_AMERICA_CORE", name: "Latin America Core Languages", languageIds: ["spanish", "portuguese"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 65e5, weeklyOperatingCost: 95e3 },
  { id: "WESTERN_EUROPE_CORE", name: "Western Europe Core Languages", languageIds: ["english", "french", "german", "italian"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 75e5, weeklyOperatingCost: 11e4 },
  { id: "SOUTHEAST_ASIA_CORE", name: "Southeast Asia Core Languages", languageIds: ["indonesian", "thai", "filipino"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 7e6, weeklyOperatingCost: 105e3 },
  { id: "MIDDLE_EAST_AFRICA_CORE", name: "Middle East and Africa Core Languages", languageIds: ["arabic", "swahili", "hausa", "yoruba", "igbo"], prerequisiteCapabilityIds: ["LOCALIZATION_FOUNDATION"], activationCost: 85e5, weeklyOperatingCost: 125e3 }
];
var CAPABILITY_BY_ID = new Map(STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.map((item) => [item.id, item]));
var KNOWN_LANGUAGE_IDS = /* @__PURE__ */ new Set([
  ...STREAMING_DAY_ONE_MARKETS.flatMap((market) => market.languages.map(normalizeStreamingLanguageId)),
  ...STREAMING_LANGUAGE_PACKAGES.flatMap((item) => item.languageIds)
]);
var validateLocalizationDefinitions = () => {
  const capabilityIds = new Set(STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.map((item) => item.id));
  if (capabilityIds.size !== STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS.length) {
    throw new Error("Duplicate streaming localization capability ID.");
  }
  for (const definition2 of STREAMING_LOCALIZATION_CAPABILITY_DEFINITIONS) {
    if (!definition2.prerequisiteIds.every((id) => capabilityIds.has(id))) {
      throw new Error(`Unknown prerequisite in ${definition2.id}.`);
    }
  }
  const packageIds = /* @__PURE__ */ new Set();
  for (const languagePackage of STREAMING_LANGUAGE_PACKAGES) {
    if (packageIds.has(languagePackage.id) || !languagePackage.languageIds.length) {
      throw new Error(`Invalid streaming language package ${languagePackage.id}.`);
    }
    packageIds.add(languagePackage.id);
    if (new Set(languagePackage.languageIds).size !== languagePackage.languageIds.length || !languagePackage.languageIds.every((id) => id === normalizeStreamingLanguageId(id) && KNOWN_LANGUAGE_IDS.has(id)) || !languagePackage.prerequisiteCapabilityIds.every((id) => capabilityIds.has(id))) throw new Error(`Invalid language membership in ${languagePackage.id}.`);
  }
};
validateLocalizationDefinitions();

// services/streamingEconomy.ts
var STREAMING_INCORPORATION_ECONOMY = Object.freeze({
  cashRequired: 85e6,
  setupCostsConsumed: 85e6,
  openingTreasuryCash: 0
});

// services/streamingBrandImage.ts
var STREAMING_BRAND_MARK_SOURCE_LIMIT = 12 * 1024 * 1024;

// services/streamingPlatformEcosystemSeeds.ts
var lang = (languageId, subtitleLevel, dubbingLevel) => ({ languageId, subtitleLevel, dubbingLevel });
var seed = (id, name, kind, corePlatformId, origin, homeCountryId, activeCountryIds, scores, preferredGenres, languageCapabilities) => ({
  id,
  name,
  brandRegistryKey: id,
  kind,
  corePlatformId,
  origin,
  startingClass: kind === "CORE_GLOBAL" || kind === "GLOBAL_REAL" ? "GLOBAL_ENTRANT" : "REGIONAL_CHALLENGER",
  homeCountryId,
  activeCountryIds,
  cashMillions: scores[0],
  valuationBillions: scores[1],
  subscriberMillions: scores[2],
  technology: scores[3],
  cataloguePower: scores[4],
  localization: scores[5],
  brandPower: scores[6],
  prestige: scores[7],
  efficiency: scores[8],
  risk: kind === "DYNAMIC_FICTIONAL" ? 60 : 35,
  preferredGenres,
  languageCapabilities
});
var ALL_MARKETS = ["US", "CA", "MX", "BR", "AR", "CO", "CL", "GB", "DE", "FR", "ES", "IT", "ZA", "NG", "EG", "KE", "IN", "JP", "KR", "ID", "TH", "PH", "AU", "NZ"];
var STREAMING_ECOSYSTEM_OPERATOR_SEEDS = [
  seed("NETFLIX", "Netflix", "CORE_GLOBAL", "NETFLIX", "TECH_BACKED", "US", ALL_MARKETS, [5e3, 260, 260, 94, 94, 95, 96, 84, 91], ["THRILLER", "CRIME", "DRAMA"], [lang("english", 3, 3), lang("spanish", 3, 3), lang("hindi", 3, 3)]),
  seed("APPLE_TV", "Apple TV+", "CORE_GLOBAL", "APPLE_TV", "TECH_BACKED", "US", ["US", "CA", "GB", "DE", "FR", "IN", "JP", "KR", "AU"], [2e4, 2900, 45, 98, 72, 86, 88, 96, 94], ["DRAMA", "SCI_FI", "THRILLER"], [lang("english", 3, 3), lang("french", 3, 2), lang("japanese", 3, 2)]),
  seed("DISNEY_PLUS", "Disney+", "CORE_GLOBAL", "DISNEY_PLUS", "CONGLOMERATE_BACKED", "US", ["US", "CA", "MX", "BR", "GB", "DE", "FR", "IN", "JP", "AU"], [8e3, 180, 150, 88, 95, 96, 95, 91, 88], ["ANIMATION", "SUPERHERO", "FANTASY"], [lang("english", 3, 3), lang("spanish", 3, 3), lang("hindi", 3, 3)]),
  seed("HULU", "Hulu", "CORE_GLOBAL", "HULU", "BROADCASTER_BACKED", "US", ["US", "JP"], [2e3, 27, 48, 76, 82, 62, 79, 76, 80], ["COMEDY", "DRAMA", "CRIME"], [lang("english", 3, 2), lang("japanese", 2, 1)]),
  seed("YOUTUBE", "YouTube", "CORE_GLOBAL", "YOUTUBE", "TECH_BACKED", "US", ALL_MARKETS, [15e3, 1800, 2500, 99, 75, 88, 99, 65, 96], ["DOCUMENTARY", "COMEDY", "MUSICAL"], [lang("english", 3, 2), lang("spanish", 3, 2), lang("hindi", 3, 2)]),
  seed("PRIME_VIDEO", "Prime Video", "GLOBAL_REAL", null, "CONGLOMERATE_BACKED", "US", ALL_MARKETS, [12e3, 1600, 210, 93, 91, 88, 94, 79, 91], ["ACTION", "DRAMA", "THRILLER"], [lang("english", 3, 3), lang("spanish", 3, 3), lang("hindi", 3, 3)]),
  seed("CRAVE", "Crave", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "CA", ["CA"], [420, 3.2, 4, 72, 78, 82, 76, 84, 70], ["DRAMA", "COMEDY", "DOCUMENTARY"], [lang("english", 3, 3), lang("french", 3, 2)]),
  seed("VIX", "ViX", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "MX", ["US", "MX", "AR", "CO", "CL"], [700, 5.2, 9, 75, 85, 94, 82, 72, 74], ["DRAMA", "ROMANCE", "COMEDY"], [lang("spanish", 3, 3)]),
  seed("GLOBOPLAY", "Globoplay", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "BR", ["BR"], [800, 6.5, 8, 78, 92, 92, 91, 79, 76], ["DRAMA", "ROMANCE", "COMEDY"], [lang("portuguese", 3, 3)]),
  seed("NOW", "NOW", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "GB", ["GB"], [900, 8, 6, 80, 84, 76, 82, 81, 77], ["DRAMA", "CRIME", "SPORTS"], [lang("english", 3, 3)]),
  seed("ITVX", "ITVX", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "GB", ["GB"], [500, 4, 5, 74, 86, 72, 84, 76, 72], ["DRAMA", "COMEDY", "CRIME"], [lang("english", 3, 2)]),
  seed("RTL_PLUS", "RTL+", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "DE", ["DE"], [650, 5, 5, 76, 84, 88, 81, 71, 73], ["DRAMA", "CRIME", "COMEDY"], [lang("german", 3, 3)]),
  seed("CANAL_PLUS", "CANAL+", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "FR", ["FR"], [1400, 10, 8, 82, 91, 91, 89, 92, 80], ["DRAMA", "THRILLER", "SPORTS"], [lang("french", 3, 3)]),
  seed("MOVISTAR_PLUS", "Movistar Plus+", "REGIONAL_REAL", null, "TELECOM_BACKED", "ES", ["ES"], [950, 7, 5, 82, 86, 91, 86, 82, 78], ["DRAMA", "SPORTS", "THRILLER"], [lang("spanish", 3, 3), lang("catalan", 3, 2)]),
  seed("RAIPLAY", "RaiPlay", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "IT", ["IT"], [500, 4, 7, 72, 89, 90, 88, 78, 69], ["DRAMA", "DOCUMENTARY", "COMEDY"], [lang("italian", 3, 3)]),
  seed("DSTV_STREAM", "DStv Stream", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "ZA", ["ZA", "NG", "KE"], [750, 5, 7, 76, 86, 69, 89, 72, 74], ["SPORTS", "DRAMA", "DOCUMENTARY"], [lang("english", 3, 2), lang("zulu", 2, 1), lang("swahili", 2, 1)]),
  seed("SHAHID", "Shahid", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "EG", ["EG"], [850, 6, 8, 80, 90, 94, 91, 82, 78], ["DRAMA", "COMEDY", "THRILLER"], [lang("arabic", 3, 3)]),
  seed("JIOHOTSTAR", "JioHotstar", "REGIONAL_REAL", null, "CONGLOMERATE_BACKED", "IN", ["IN"], [2400, 18, 120, 91, 96, 97, 98, 84, 88], ["SPORTS", "DRAMA", "ACTION"], [lang("hindi", 3, 3), lang("tamil", 3, 3), lang("telugu", 3, 3), lang("english", 3, 3)]),
  seed("ZEE5", "ZEE5", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "IN", ["IN"], [700, 5, 20, 77, 89, 94, 87, 74, 72], ["DRAMA", "ROMANCE", "COMEDY"], [lang("hindi", 3, 3), lang("tamil", 3, 2), lang("telugu", 3, 2)]),
  seed("SONY_LIV", "Sony LIV", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "IN", ["IN"], [750, 6, 18, 82, 88, 90, 88, 82, 76], ["SPORTS", "DRAMA", "CRIME"], [lang("hindi", 3, 3), lang("english", 3, 2)]),
  seed("U_NEXT", "U-NEXT", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "JP", ["JP"], [1100, 8, 5, 86, 94, 96, 88, 85, 82], ["ANIMATION", "DRAMA", "DOCUMENTARY"], [lang("japanese", 3, 3)]),
  seed("ABEMA", "ABEMA", "REGIONAL_REAL", null, "TECH_BACKED", "JP", ["JP"], [650, 5, 7, 89, 84, 93, 89, 73, 84], ["ANIMATION", "SPORTS", "COMEDY"], [lang("japanese", 3, 3)]),
  seed("TVING", "TVING", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "KR", ["KR"], [900, 7, 8, 85, 94, 96, 92, 87, 81], ["DRAMA", "ROMANCE", "COMEDY"], [lang("korean", 3, 3)]),
  seed("WAVVE", "Wavve", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "KR", ["KR"], [620, 4.5, 5, 79, 88, 94, 82, 77, 74], ["DRAMA", "CRIME", "DOCUMENTARY"], [lang("korean", 3, 3)]),
  seed("COUPANG_PLAY", "Coupang Play", "REGIONAL_REAL", null, "TECH_BACKED", "KR", ["KR"], [1500, 12, 6, 93, 78, 91, 87, 75, 89], ["SPORTS", "DRAMA", "COMEDY"], [lang("korean", 3, 3)]),
  seed("VIU", "Viu", "REGIONAL_REAL", null, "TELECOM_BACKED", "ID", ["ID", "TH", "PH", "ZA", "EG"], [950, 7, 16, 85, 87, 94, 86, 78, 82], ["DRAMA", "ROMANCE", "COMEDY"], [lang("indonesian", 3, 2), lang("thai", 3, 2), lang("filipino", 3, 2), lang("arabic", 2, 1)]),
  seed("VIDIO", "Vidio", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "ID", ["ID"], [650, 5, 8, 81, 91, 94, 91, 72, 77], ["SPORTS", "DRAMA", "COMEDY"], [lang("indonesian", 3, 3)]),
  seed("TRUE_ID", "TrueID", "REGIONAL_REAL", null, "TELECOM_BACKED", "TH", ["TH"], [550, 4, 7, 83, 86, 93, 89, 70, 78], ["DRAMA", "SPORTS", "COMEDY"], [lang("thai", 3, 3)]),
  seed("IWANT_TFC", "iWantTFC", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "PH", ["PH"], [480, 3.5, 6, 76, 91, 91, 90, 75, 71], ["DRAMA", "ROMANCE", "COMEDY"], [lang("filipino", 3, 3), lang("english", 3, 2)]),
  seed("STAN", "Stan", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "AU", ["AU"], [850, 6, 4, 84, 88, 76, 91, 87, 81], ["DRAMA", "SPORTS", "THRILLER"], [lang("english", 3, 3)]),
  seed("BINGE", "Binge", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "AU", ["AU"], [620, 4.5, 3, 79, 84, 73, 85, 79, 75], ["DRAMA", "COMEDY", "CRIME"], [lang("english", 3, 3)]),
  seed("NEON", "Neon", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "NZ", ["NZ"], [280, 2, 1.5, 74, 80, 70, 82, 78, 70], ["DRAMA", "COMEDY", "THRILLER"], [lang("english", 3, 3), lang("maori", 2, 1)]),
  seed("TVNZ_PLUS", "TVNZ+", "REGIONAL_REAL", null, "BROADCASTER_BACKED", "NZ", ["NZ"], [240, 1.8, 1.8, 72, 86, 72, 89, 73, 69], ["DRAMA", "DOCUMENTARY", "COMEDY"], [lang("english", 3, 2), lang("maori", 2, 1)])
];

// services/streamingPlatformBrandRegistry.ts
var HEX = /^#[0-9A-F]{6}$/;
var normalizeStreamingBrandHex = (value, fallback) => {
  const normalized = String(value || "").trim().toUpperCase();
  return HEX.test(normalized) ? normalized : fallback;
};
var channel = (hex, offset) => Number.parseInt(hex.slice(offset, offset + 2), 16);
var relativeLuminance = (hex) => {
  const normalized = normalizeStreamingBrandHex(hex, "#000000");
  const linear = (value) => {
    const srgb = value / 255;
    return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(channel(normalized, 1)) + 0.7152 * linear(channel(normalized, 3)) + 0.0722 * linear(channel(normalized, 5));
};
var contrastRatio = (left, right) => {
  const lighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (lighter + 0.05) / (darker + 0.05);
};
var getReadableStreamingBrandInk = (background) => {
  const darkInk = "#07090D";
  const lightInk = "#FFFFFF";
  return contrastRatio(background, darkInk) >= contrastRatio(background, lightInk) ? darkInk : lightInk;
};
var buildRealBrand = (platformId, input) => {
  const primaryColor = normalizeStreamingBrandHex(input.primaryColor, "#8A8F98");
  const secondaryColor = normalizeStreamingBrandHex(input.secondaryColor || primaryColor, primaryColor);
  const accentColors = Array.from(new Set(
    [primaryColor, secondaryColor, ...input.accentColors || []].map((color) => normalizeStreamingBrandHex(color, primaryColor))
  )).slice(0, 4);
  const surfaceColor = normalizeStreamingBrandHex(input.surfaceColor || "#0A0B0E", "#0A0B0E");
  return {
    platformId,
    displayName: input.displayName,
    primaryColor,
    secondaryColor,
    accentColors,
    surfaceColor,
    onPrimaryColor: getReadableStreamingBrandInk(primaryColor),
    onSurfaceColor: normalizeStreamingBrandHex(input.onSurfaceColor || getReadableStreamingBrandInk(surfaceColor), "#FFFFFF"),
    markKind: input.markKind || "WORDMARK",
    markKey: input.markKey || `${platformId}_WORDMARK`,
    typefaceId: input.typefaceId || "GROTESK",
    lockupId: input.lockupId || "WORDMARK"
  };
};
var REAL_BRAND_INPUTS = {
  NETFLIX: { displayName: "Netflix", primaryColor: "#E50914", secondaryColor: "#B20710", markKind: "VECTOR_MARK", markKey: "NETFLIX_N", typefaceId: "CONDENSED", lockupId: "SIDE" },
  APPLE_TV: { displayName: "Apple TV+", primaryColor: "#F5F5F7", secondaryColor: "#A1A1A6", surfaceColor: "#050505", markKey: "APPLE_TV_WORDMARK", typefaceId: "GROTESK" },
  DISNEY_PLUS: { displayName: "Disney+", primaryColor: "#113CCF", secondaryColor: "#64B5F6", markKey: "DISNEY_PLUS_WORDMARK", typefaceId: "SERIF" },
  HULU: { displayName: "Hulu", primaryColor: "#1CE783", secondaryColor: "#0B6B3A", surfaceColor: "#071B11", markKey: "HULU_WORDMARK", typefaceId: "GROTESK" },
  YOUTUBE: { displayName: "YouTube", primaryColor: "#FF0000", secondaryColor: "#282828", markKind: "VECTOR_MARK", markKey: "YOUTUBE_PLAY", lockupId: "SIDE" },
  PRIME_VIDEO: { displayName: "Prime Video", primaryColor: "#00A8E1", secondaryColor: "#146EB4", markKind: "VECTOR_MARK", markKey: "PRIME_SMILE", lockupId: "SIDE" },
  CRAVE: { displayName: "Crave", primaryColor: "#00AEEF", secondaryColor: "#0066B3", markKey: "CRAVE_WORDMARK", typefaceId: "GROTESK" },
  VIX: { displayName: "ViX", primaryColor: "#FF5A36", secondaryColor: "#7A2CF6", accentColors: ["#FFB800"], markKey: "VIX_WORDMARK", typefaceId: "GEOMETRIC" },
  GLOBOPLAY: { displayName: "Globoplay", primaryColor: "#E11D48", secondaryColor: "#7C3AED", accentColors: ["#F97316"], markKey: "GLOBOPLAY_WORDMARK" },
  NOW: { displayName: "NOW", primaryColor: "#00E6A8", secondaryColor: "#0066FF", accentColors: ["#F5EF3B"], markKey: "NOW_WORDMARK", typefaceId: "GEOMETRIC" },
  ITVX: { displayName: "ITVX", primaryColor: "#DE00FF", secondaryColor: "#00D9FF", accentColors: ["#FFD400"], markKey: "ITVX_WORDMARK", typefaceId: "GEOMETRIC" },
  RTL_PLUS: { displayName: "RTL+", primaryColor: "#E6007E", secondaryColor: "#FA6400", accentColors: ["#00AEEF"], markKey: "RTL_PLUS_WORDMARK" },
  CANAL_PLUS: { displayName: "CANAL+", primaryColor: "#FFFFFF", secondaryColor: "#1E1E1E", surfaceColor: "#050505", markKey: "CANAL_PLUS_WORDMARK", typefaceId: "GROTESK" },
  MOVISTAR_PLUS: { displayName: "Movistar Plus+", primaryColor: "#019BE1", secondaryColor: "#7B2CBF", markKey: "MOVISTAR_PLUS_WORDMARK" },
  RAIPLAY: { displayName: "RaiPlay", primaryColor: "#6539B4", secondaryColor: "#9B5DE5", markKey: "RAIPLAY_WORDMARK" },
  DSTV_STREAM: { displayName: "DStv Stream", primaryColor: "#0B73CE", secondaryColor: "#00AEEF", markKey: "DSTV_STREAM_WORDMARK" },
  SHAHID: { displayName: "Shahid", primaryColor: "#00B894", secondaryColor: "#007A66", markKey: "SHAHID_WORDMARK", typefaceId: "GEOMETRIC" },
  JIOHOTSTAR: { displayName: "JioHotstar", primaryColor: "#FF6B00", secondaryColor: "#066CFF", accentColors: ["#7B2CFF"], markKey: "JIOHOTSTAR_WORDMARK", typefaceId: "GROTESK" },
  ZEE5: { displayName: "ZEE5", primaryColor: "#9500FF", secondaryColor: "#00FFFF", accentColors: ["#FF5500", "#00FFAA"], surfaceColor: "#111116", markKey: "ZEE5_WORDMARK", typefaceId: "GEOMETRIC" },
  SONY_LIV: { displayName: "Sony LIV", primaryColor: "#7B2FF7", secondaryColor: "#F107A3", accentColors: ["#00C9FF"], markKey: "SONY_LIV_WORDMARK" },
  U_NEXT: { displayName: "U-NEXT", primaryColor: "#00A1E9", secondaryColor: "#005BAC", markKey: "U_NEXT_WORDMARK", typefaceId: "GROTESK" },
  ABEMA: { displayName: "ABEMA", primaryColor: "#00D95F", secondaryColor: "#00AEEF", markKey: "ABEMA_WORDMARK", typefaceId: "GEOMETRIC" },
  TVING: { displayName: "TVING", primaryColor: "#FF153C", secondaryColor: "#FF4B8B", markKey: "TVING_WORDMARK", typefaceId: "GROTESK" },
  WAVVE: { displayName: "Wavve", primaryColor: "#1351F9", secondaryColor: "#00C2FF", markKey: "WAVVE_WORDMARK", typefaceId: "GROTESK" },
  COUPANG_PLAY: { displayName: "Coupang Play", primaryColor: "#3478F6", secondaryColor: "#8B5CF6", markKey: "COUPANG_PLAY_WORDMARK" },
  VIU: { displayName: "Viu", primaryColor: "#FFBF00", secondaryColor: "#F26A00", surfaceColor: "#17120A", markKey: "VIU_WORDMARK", typefaceId: "GEOMETRIC" },
  VIDIO: { displayName: "Vidio", primaryColor: "#EA1265", secondaryColor: "#9F0A50", markKey: "VIDIO_WORDMARK" },
  TRUE_ID: { displayName: "TrueID", primaryColor: "#E51B23", secondaryColor: "#7A1218", markKey: "TRUE_ID_WORDMARK" },
  IWANT_TFC: { displayName: "iWantTFC", primaryColor: "#00AEEF", secondaryColor: "#ED1C24", markKey: "IWANT_TFC_WORDMARK" },
  STAN: { displayName: "Stan", primaryColor: "#00E6B8", secondaryColor: "#009FE3", markKey: "STAN_WORDMARK", typefaceId: "GROTESK" },
  BINGE: { displayName: "Binge", primaryColor: "#00D9C0", secondaryColor: "#183B8C", markKey: "BINGE_WORDMARK" },
  NEON: { displayName: "Neon", primaryColor: "#FF5A36", secondaryColor: "#FFB000", markKey: "NEON_WORDMARK", typefaceId: "GROTESK" },
  TVNZ_PLUS: { displayName: "TVNZ+", primaryColor: "#00B8A9", secondaryColor: "#0057B8", markKey: "TVNZ_PLUS_WORDMARK" },
  HBO_MAX: { displayName: "HBO Max", primaryColor: "#002BE7", secondaryColor: "#11131A", markKey: "HBO_MAX_WORDMARK", typefaceId: "GROTESK" },
  PARAMOUNT_PLUS: { displayName: "Paramount+", primaryColor: "#0064FF", secondaryColor: "#003C96", markKey: "PARAMOUNT_PLUS_WORDMARK", typefaceId: "SERIF" },
  PEACOCK: { displayName: "Peacock", primaryColor: "#FFFFFF", secondaryColor: "#F5B71D", accentColors: ["#E91E63", "#00AEEF"], surfaceColor: "#050505", markKey: "PEACOCK_WORDMARK", typefaceId: "GROTESK" },
  SKY: { displayName: "Sky", primaryColor: "#19A0FF", secondaryColor: "#000FF5", accentColors: ["#00E6FF"], markKey: "SKY_WORDMARK", typefaceId: "GROTESK" },
  SHOWMAX: { displayName: "Showmax", primaryColor: "#FF0049", secondaryColor: "#8C0028", markKey: "SHOWMAX_WORDMARK", typefaceId: "GROTESK" },
  FLOW: { displayName: "Flow", primaryColor: "#6C2BD9", secondaryColor: "#321275", markKey: "FLOW_WORDMARK", typefaceId: "GEOMETRIC" }
};
var REAL_STREAMING_PLATFORM_BRANDS = Object.freeze(
  Object.fromEntries(Object.entries(REAL_BRAND_INPUTS).map(([id, input]) => [id, buildRealBrand(id, input)]))
);
var LEGACY_STREAMING_PLATFORM_ALIASES = Object.freeze({
  AMAZON_PRIME: "PRIME_VIDEO",
  PRIME: "PRIME_VIDEO",
  PRIME_VIDEO: "PRIME_VIDEO",
  NETFLIX: "NETFLIX",
  APPLE_TV: "APPLE_TV",
  DISNEY_PLUS: "DISNEY_PLUS",
  HULU: "HULU",
  YOUTUBE: "YOUTUBE",
  HBO_MAX: "HBO_MAX",
  MAX: "HBO_MAX",
  PARAMOUNT_PLUS: "PARAMOUNT_PLUS",
  PARAMOUNT: "PARAMOUNT_PLUS",
  PEACOCK: "PEACOCK",
  SKY: "SKY",
  SHOWMAX: "SHOWMAX",
  FLOW: "FLOW"
});
var LEGACY_STREAMING_PLATFORM_NAME_ALIASES = Object.freeze({
  netflix: "NETFLIX",
  "prime video": "PRIME_VIDEO",
  "amazon prime": "PRIME_VIDEO",
  amazon: "PRIME_VIDEO",
  "disney+": "DISNEY_PLUS",
  disney: "DISNEY_PLUS",
  hulu: "HULU",
  max: "HBO_MAX",
  "hbo max": "HBO_MAX",
  hbo: "HBO_MAX",
  "apple tv+": "APPLE_TV",
  "apple tv": "APPLE_TV",
  "paramount+": "PARAMOUNT_PLUS",
  paramount: "PARAMOUNT_PLUS",
  peacock: "PEACOCK",
  sky: "SKY",
  crave: "CRAVE",
  stan: "STAN",
  globoplay: "GLOBOPLAY",
  vix: "VIX",
  jiohotstar: "JIOHOTSTAR",
  "jio hotstar": "JIOHOTSTAR",
  "u-next": "U_NEXT",
  "movistar+": "MOVISTAR_PLUS",
  showmax: "SHOWMAX",
  dstv: "DSTV_STREAM",
  "dstv stream": "DSTV_STREAM",
  "rtl+": "RTL_PLUS",
  "canal+": "CANAL_PLUS",
  flow: "FLOW"
});

// services/streamingPlatformBrandGenerator.ts
var GENERATED_STREAMING_BRAND_MARK_IDS = [
  "BOLT",
  "ORBIT",
  "PRISM",
  "PULSE",
  "APERTURE",
  "SIGNALTOWER",
  "CROWN",
  "MONOLITH",
  "RIFT",
  "ECLIPSE",
  "LETTER_SOLID",
  "LETTER_OUTLINE",
  "LETTER_SLAB"
];
var TYPEFACE_IDS = ["GROTESK", "GEOMETRIC", "SERIF", "CONDENSED", "MONO", "SLAB"];
var LOCKUP_IDS = ["WORDMARK", "SIDE", "STACK", "ICON"];
var MARK_ID_SET = new Set(GENERATED_STREAMING_BRAND_MARK_IDS);
var TYPEFACE_ID_SET = new Set(TYPEFACE_IDS);
var LOCKUP_ID_SET = new Set(LOCKUP_IDS);

// services/streamingPlatformEcosystem.ts
var MARKET_IDS = new Set(STREAMING_DAY_ONE_MARKETS.map((market) => market.id));

// services/streamingRightsCompatibility.ts
var CANONICAL_COUNTRY_IDS = STREAMING_DAY_ONE_MARKETS.map((market) => market.id).sort();

// services/streamingCloudProviders.ts
var STREAMING_CLOUD_PROVIDERS = [
  {
    id: "ATLAS",
    name: "Atlas Compute",
    line: "Everywhere, at the going rate, and further than a building.",
    rateMultiplier: 1,
    reachMultiplier: 1.2,
    ceilingMultiplier: 1,
    regions: "ALL"
  },
  {
    id: "NORTHWIND",
    name: "Northwind",
    line: "Cheaper, and reaches no further than a building. Not sold in Africa or South America.",
    rateMultiplier: 0.7,
    reachMultiplier: 1,
    ceilingMultiplier: 1,
    regions: ["NORTH_AMERICA", "EUROPE", "ASIA", "OCEANIA"]
  },
  {
    id: "MERIDIAN",
    name: "Meridian Edge",
    line: "Reaches furthest, sells the smallest plans, sends the biggest bill.",
    rateMultiplier: 1.45,
    reachMultiplier: 1.5,
    ceilingMultiplier: 0.6,
    regions: "ALL"
  }
];
var PROVIDERS_BY_ID = new Map(STREAMING_CLOUD_PROVIDERS.map((provider) => [provider.id, provider]));

// services/streamingFibreLadder.ts
var STREAMING_FIBRE_GENERATIONS = [
  { id: "G1", name: "Standard single-mode", line: "What the landlord already ran into the building.", floor: 1, ceiling: 1.1 },
  { id: "G2", name: "Coherent DWDM", line: "More colours of light down the same strand.", floor: 1.1, ceiling: 1.21 },
  { id: "G3", name: "Hollow-core", line: "Light through air rather than glass, and faster for it.", floor: 1.21, ceiling: 1.32 },
  { id: "G4", name: "Multi-band amplified", line: "Bands nobody else is lighting, amplified end to end.", floor: 1.32, ceiling: 1.43 },
  { id: "G5", name: "Photonic mesh", line: "The network routes itself in light, without asking.", floor: 1.43, ceiling: 1.55 }
];
(() => {
  const broken = STREAMING_FIBRE_GENERATIONS.slice(0, -1).map((generation, index) => ({ generation, next: STREAMING_FIBRE_GENERATIONS[index + 1] })).filter(({ generation, next }) => Math.abs(generation.ceiling - next.floor) > 1e-9).map(({ generation, next }) => `${generation.id} tops out at ${generation.ceiling} but ${next.id} starts at ${next.floor}`);
  if (broken.length > 0) {
    throw new Error(`The fibre ladder has a step in it: ${broken.join("; ")}`);
  }
})();

// services/streamingServerSites.ts
var site = (id, name, countryCode, regionId, continentId, latitude, longitude, tier, quality, costIndex, powerPricePerKwh, transit) => ({
  id,
  name,
  countryCode,
  regionId,
  continentId,
  latitude,
  longitude,
  tier,
  quality,
  costIndex,
  powerPricePerKwh,
  transit
});
var STREAMING_SERVER_SITES = [
  /* --- North America ------------------------------------------------------
     Ashburn is the largest exchange point on earth and would never appear in a
     catalogue of places to shoot a film, which is the whole argument for this
     file existing. */
  site("ASH", "Ashburn", "US", "NORTH_AMERICA", "NA", 39.04, -77.49, 1, 10, 9e6, 7.4, 1),
  site("NYC", "New York", "US", "NORTH_AMERICA", "NA", 40.71, -74.01, 1, 9, 2e7, 14.2, 0.95),
  site("LA", "Los Angeles", "US", "NORTH_AMERICA", "NA", 34.05, -118.24, 1, 9, 15e6, 15.8, 0.93),
  site("CHI", "Chicago", "US", "NORTH_AMERICA", "NA", 41.88, -87.63, 2, 8, 95e5, 8.1, 0.82),
  site("DAL", "Dallas", "US", "NORTH_AMERICA", "NA", 32.78, -96.8, 2, 8, 75e5, 7.9, 0.8),
  site("MIA", "Miami", "US", "NORTH_AMERICA", "NA", 25.76, -80.19, 2, 8, 9e6, 9.6, 0.84),
  site("ATL", "Atlanta", "US", "NORTH_AMERICA", "NA", 33.75, -84.39, 2, 7, 65e5, 7.2, 0.74),
  site("TOR", "Toronto", "CA", "NORTH_AMERICA", "NA", 43.65, -79.38, 2, 7, 65e5, 8.8, 0.7),
  site("VAN", "Vancouver", "CA", "NORTH_AMERICA", "NA", 49.28, -123.12, 3, 6, 55e5, 7.1, 0.55),
  site("MEX", "Mexico City", "MX", "NORTH_AMERICA", "NA", 19.43, -99.13, 2, 6, 5e6, 10.4, 0.6),
  /* More of the continent (#109): the audience is served from where it
     lives, and the placer lands rooms only where a site is — so a country
     with two sites could never be covered however much was bought. Major
     metros in every region now, so full compute can paint the world. */
  site("SEA", "Seattle", "US", "NORTH_AMERICA", "NA", 47.61, -122.33, 2, 8, 85e5, 8.2, 0.78),
  site("SFO", "San Francisco", "US", "NORTH_AMERICA", "NA", 37.77, -122.42, 1, 9, 16e6, 17.4, 0.94),
  site("DEN", "Denver", "US", "NORTH_AMERICA", "NA", 39.74, -104.99, 2, 7, 65e5, 9.1, 0.66),
  site("PHX", "Phoenix", "US", "NORTH_AMERICA", "NA", 33.45, -112.07, 2, 7, 6e6, 9.8, 0.62),
  site("HOU", "Houston", "US", "NORTH_AMERICA", "NA", 29.76, -95.37, 2, 8, 7e6, 8, 0.72),
  site("MSP", "Minneapolis", "US", "NORTH_AMERICA", "NA", 44.98, -93.27, 2, 7, 6e6, 8.6, 0.6),
  site("BOS", "Boston", "US", "NORTH_AMERICA", "NA", 42.36, -71.06, 2, 8, 9e6, 15.1, 0.76),
  site("YUL", "Montreal", "CA", "NORTH_AMERICA", "NA", 45.5, -73.57, 2, 8, 6e6, 6.9, 0.68),
  site("YYC", "Calgary", "CA", "NORTH_AMERICA", "NA", 51.05, -114.07, 3, 6, 5e6, 7.4, 0.48),
  site("GDL", "Guadalajara", "MX", "NORTH_AMERICA", "NA", 20.66, -103.35, 3, 5, 35e5, 10.6, 0.42),
  site("MTY", "Monterrey", "MX", "NORTH_AMERICA", "NA", 25.69, -100.32, 3, 6, 4e6, 10.2, 0.48),
  site("PTY", "Panama City", "PA", "NORTH_AMERICA", "NA", 8.98, -79.52, 3, 6, 4e6, 11.9, 0.52),
  /* The far corners (#111): buy everything and the map should be green
     everywhere, so somewhere has to throw a field over Alaska, the Pacific
     and the Canadian north. Greenland has no market record of its own; it is
     reached from Reykjavik and Anchorage. */
  site("ANC", "Anchorage", "US", "NORTH_AMERICA", "NA", 61.22, -149.9, 3, 5, 45e5, 11.4, 0.34),
  site("HNL", "Honolulu", "US", "NORTH_AMERICA", "NA", 21.31, -157.86, 3, 6, 55e5, 28.4, 0.44),
  site("YWG", "Winnipeg", "CA", "NORTH_AMERICA", "NA", 49.9, -97.14, 3, 5, 4e6, 7, 0.36),
  site("YHZ", "Halifax", "CA", "NORTH_AMERICA", "NA", 44.65, -63.58, 3, 5, 4e6, 9.2, 0.38),
  /* The interiors (#113): a room's green reaches about 650km, and Kansas,
     Utah and the Canadian prairie sit further than that from every coast, so
     a region could never fill in however much was bought. */
  site("MCI", "Kansas City", "US", "NORTH_AMERICA", "NA", 39.1, -94.58, 3, 6, 5e6, 8.4, 0.44),
  site("SLC", "Salt Lake City", "US", "NORTH_AMERICA", "NA", 40.76, -111.89, 3, 6, 5e6, 8, 0.46),
  site("YEG", "Edmonton", "CA", "NORTH_AMERICA", "NA", 53.55, -113.49, 3, 5, 45e5, 6.8, 0.36),
  /* The far north (#115): small places, but places — northern Canada was the
     last quarter of a region that could not be reached at any price. */
  site("YZF", "Yellowknife", "CA", "NORTH_AMERICA", "NA", 62.45, -114.37, 3, 3, 35e5, 7.6, 0.2),
  site("YXY", "Whitehorse", "CA", "NORTH_AMERICA", "NA", 60.72, -135.06, 3, 3, 35e5, 8, 0.18),
  site("YFB", "Iqaluit", "CA", "NORTH_AMERICA", "NA", 63.75, -68.52, 3, 2, 35e5, 18.4, 0.16),
  /* --- South America ------------------------------------------------------- */
  site("SAO", "S\xE3o Paulo", "BR", "SOUTH_AMERICA", "SA", -23.55, -46.63, 1, 8, 8e6, 11.8, 0.82),
  site("RIO", "Rio de Janeiro", "BR", "SOUTH_AMERICA", "SA", -22.91, -43.17, 2, 7, 6e6, 12.1, 0.62),
  /* The subsea landing for Brazil's north-east. Without it Salvador and
     Recife sit 1,200–1,900 km from the nearest room and a residency country
     cannot reach Strong at any price (#106). */
  site("FOR", "Fortaleza", "BR", "SOUTH_AMERICA", "SA", -3.73, -38.52, 3, 5, 35e5, 12.4, 0.5),
  site("BUE", "Buenos Aires", "AR", "SOUTH_AMERICA", "SA", -34.6, -58.38, 3, 6, 45e5, 9.4, 0.5),
  site("BOG", "Bogota", "CO", "SOUTH_AMERICA", "SA", 4.71, -74.07, 3, 5, 3e6, 10.8, 0.48),
  site("LIM", "Lima", "PE", "SOUTH_AMERICA", "SA", -12.05, -77.04, 3, 5, 3e6, 10.2, 0.42),
  site("SCL", "Santiago", "CL", "SOUTH_AMERICA", "SA", -33.45, -70.67, 2, 7, 55e5, 10.4, 0.6),
  site("CCS", "Caracas", "VE", "SOUTH_AMERICA", "SA", 10.48, -66.9, 3, 4, 3e6, 8.8, 0.36),
  site("UIO", "Quito", "EC", "SOUTH_AMERICA", "SA", -0.18, -78.47, 3, 5, 3e6, 9.6, 0.4),
  site("BSB", "Bras\xEDlia", "BR", "SOUTH_AMERICA", "SA", -15.79, -47.88, 3, 6, 4e6, 12, 0.46),
  site("CNF", "Belo Horizonte", "BR", "SOUTH_AMERICA", "SA", -19.92, -43.94, 3, 6, 4e6, 11.9, 0.46),
  site("SSA", "Salvador", "BR", "SOUTH_AMERICA", "SA", -12.97, -38.51, 3, 5, 35e5, 12.2, 0.42),
  site("REC", "Recife", "BR", "SOUTH_AMERICA", "SA", -8.05, -34.88, 3, 5, 35e5, 12.3, 0.44),
  site("POA", "Porto Alegre", "BR", "SOUTH_AMERICA", "SA", -30.03, -51.23, 3, 6, 4e6, 11.7, 0.46),
  site("MAO", "Manaus", "BR", "SOUTH_AMERICA", "SA", -3.12, -60.02, 3, 4, 35e5, 13, 0.3),
  site("MDE", "Medell\xEDn", "CO", "SOUTH_AMERICA", "SA", 6.25, -75.56, 3, 5, 3e6, 10.6, 0.42),
  site("LPB", "La Paz", "BO", "SOUTH_AMERICA", "SA", -16.5, -68.15, 3, 4, 25e5, 9.2, 0.32),
  site("ASU", "Asunci\xF3n", "PY", "SOUTH_AMERICA", "SA", -25.26, -57.58, 3, 4, 25e5, 8.6, 0.34),
  site("MVD", "Montevideo", "UY", "SOUTH_AMERICA", "SA", -34.9, -56.16, 3, 6, 35e5, 11, 0.46),
  site("PUQ", "Punta Arenas", "CL", "SOUTH_AMERICA", "SA", -53.16, -70.91, 3, 3, 25e5, 10.6, 0.24),
  site("BEL", "Bel\xE9m", "BR", "SOUTH_AMERICA", "SA", -1.46, -48.49, 3, 4, 3e6, 12.4, 0.3),
  site("COR", "C\xF3rdoba", "AR", "SOUTH_AMERICA", "SA", -31.42, -64.18, 3, 4, 3e6, 9, 0.32),
  site("CGB", "Cuiab\xE1", "BR", "SOUTH_AMERICA", "SA", -15.6, -56.1, 3, 4, 3e6, 12.6, 0.28),
  /* --- Europe --------------------------------------------------------------
     FLAP-D — Frankfurt, London, Amsterdam, Paris, Dublin — is where European
     traffic actually lands. Berlin is the capital and not the hub; Rome and
     Prague are beautiful and neither is a carrier hotel. */
  site("FRA", "Frankfurt", "DE", "EUROPE", "EU", 50.11, 8.68, 1, 10, 11e6, 23.4, 1),
  site("LDN", "London", "GB", "EUROPE", "EU", 51.51, -0.13, 1, 9, 12e6, 21.8, 0.96),
  site("AMS", "Amsterdam", "NL", "EUROPE", "EU", 52.37, 4.9, 1, 9, 1e7, 19.6, 0.95),
  site("PAR", "Paris", "FR", "EUROPE", "EU", 48.86, 2.35, 1, 9, 1e7, 17.2, 0.9),
  site("MAD", "Madrid", "ES", "EUROPE", "EU", 40.42, -3.7, 2, 7, 6e6, 16.4, 0.7),
  site("MIL", "Milan", "IT", "EUROPE", "EU", 45.46, 9.19, 2, 7, 75e5, 20.1, 0.68),
  site("STO", "Stockholm", "SE", "EUROPE", "EU", 59.33, 18.07, 2, 8, 7e6, 9.2, 0.66),
  site("WAW", "Warsaw", "PL", "EUROPE", "EU", 52.23, 21.01, 2, 6, 45e5, 14.8, 0.62),
  site("BER", "Berlin", "DE", "EUROPE", "EU", 52.52, 13.4, 2, 7, 7e6, 23.9, 0.64),
  /* Russia insists on rooms inside Russia and had nowhere to rent one, so a
     launch there could never be served (#106). Moscow and St Petersburg are
     two-thirds of the audience; the Urals and Siberia stay far. */
  site("MOW", "Moscow", "RU", "EUROPE", "EU", 55.76, 37.62, 2, 6, 6e6, 6.8, 0.55),
  site("SVX", "Yekaterinburg", "RU", "EUROPE", "EU", 56.84, 60.6, 3, 5, 4e6, 6.2, 0.4),
  site("PRG", "Prague", "CZ", "EUROPE", "EU", 50.08, 14.44, 3, 6, 35e5, 15.2, 0.52),
  site("ROM", "Rome", "IT", "EUROPE", "EU", 41.9, 12.5, 3, 5, 55e5, 21.4, 0.44),
  site("DUB", "Dublin", "IE", "EUROPE", "EU", 53.35, -6.26, 2, 8, 8e6, 20.4, 0.8),
  site("LIS", "Lisbon", "PT", "EUROPE", "EU", 38.72, -9.14, 2, 7, 6e6, 18.6, 0.66),
  site("BCN", "Barcelona", "ES", "EUROPE", "EU", 41.39, 2.17, 2, 7, 65e5, 16.8, 0.7),
  site("VIE", "Vienna", "AT", "EUROPE", "EU", 48.21, 16.37, 2, 8, 7e6, 19.2, 0.7),
  site("ZRH", "Zurich", "CH", "EUROPE", "EU", 47.38, 8.54, 2, 9, 95e5, 21, 0.78),
  site("MUC", "Munich", "DE", "EUROPE", "EU", 48.14, 11.58, 2, 8, 75e5, 23.6, 0.7),
  site("HAM", "Hamburg", "DE", "EUROPE", "EU", 53.55, 9.99, 2, 7, 7e6, 23.7, 0.64),
  site("CPH", "Copenhagen", "DK", "EUROPE", "EU", 55.68, 12.57, 2, 8, 75e5, 22.1, 0.72),
  site("OSL", "Oslo", "NO", "EUROPE", "EU", 59.91, 10.75, 2, 8, 7e6, 8.9, 0.66),
  site("HEL", "Helsinki", "FI", "EUROPE", "EU", 60.17, 24.94, 2, 8, 65e5, 9.4, 0.64),
  site("MAN", "Manchester", "GB", "EUROPE", "EU", 53.48, -2.24, 2, 7, 7e6, 21.6, 0.66),
  site("BRU", "Brussels", "BE", "EUROPE", "EU", 50.85, 4.35, 2, 8, 7e6, 19.8, 0.72),
  site("MRS", "Marseille", "FR", "EUROPE", "EU", 43.3, 5.37, 2, 7, 65e5, 17, 0.7),
  site("ATH", "Athens", "GR", "EUROPE", "EU", 37.98, 23.73, 3, 6, 45e5, 17.4, 0.5),
  site("BUH", "Bucharest", "RO", "EUROPE", "EU", 44.43, 26.1, 3, 6, 4e6, 13.8, 0.5),
  site("BUD", "Budapest", "HU", "EUROPE", "EU", 47.5, 19.04, 3, 6, 4e6, 14.4, 0.52),
  site("KBP", "Kyiv", "UA", "EUROPE", "EU", 50.45, 30.52, 3, 5, 35e5, 9.8, 0.42),
  site("BEG", "Belgrade", "RS", "EUROPE", "EU", 44.79, 20.46, 3, 5, 35e5, 12.2, 0.44),
  site("SOF", "Sofia", "BG", "EUROPE", "EU", 42.7, 23.32, 3, 5, 35e5, 12.6, 0.44),
  site("NAP", "Naples", "IT", "EUROPE", "EU", 40.85, 14.27, 3, 5, 5e6, 21.2, 0.44),
  site("LED", "St Petersburg", "RU", "EUROPE", "EU", 59.93, 30.32, 3, 6, 45e5, 6.6, 0.46),
  site("OVB", "Novosibirsk", "RU", "EUROPE", "EU", 55.03, 82.92, 3, 5, 4e6, 6, 0.36),
  site("KEF", "Reykjavik", "IS", "EUROPE", "EU", 64.15, -21.94, 3, 6, 45e5, 5.4, 0.42),
  site("IKT", "Irkutsk", "RU", "EUROPE", "EU", 52.29, 104.3, 3, 4, 35e5, 5.8, 0.28),
  site("YKS", "Yakutsk", "RU", "EUROPE", "EU", 62.03, 129.68, 3, 2, 35e5, 6.4, 0.16),
  site("MMK", "Murmansk", "RU", "EUROPE", "EU", 68.97, 33.08, 3, 3, 35e5, 5.8, 0.2),
  site("NSK", "Norilsk", "RU", "EUROPE", "EU", 69.35, 88.2, 3, 2, 35e5, 6, 0.14),
  site("GDX", "Magadan", "RU", "EUROPE", "EU", 59.56, 150.8, 3, 2, 35e5, 6.6, 0.16),
  site("VVO", "Vladivostok", "RU", "EUROPE", "EU", 43.12, 131.89, 3, 5, 4e6, 6.2, 0.34),
  site("KJA", "Krasnoyarsk", "RU", "EUROPE", "EU", 56.01, 92.87, 3, 4, 35e5, 5.6, 0.3),
  site("KUF", "Samara", "RU", "EUROPE", "EU", 53.2, 50.15, 3, 5, 4e6, 6, 0.36),
  /* --- Asia ---------------------------------------------------------------- */
  site("SIN", "Singapore", "SG", "ASIA", "AS", 1.35, 103.82, 1, 10, 12e6, 14.6, 1),
  site("TOK", "Tokyo", "JP", "ASIA", "AS", 35.68, 139.65, 1, 9, 14e6, 18.2, 0.92),
  /* Hong Kong is not one of the world registry's 197 markets — it is a
     territory, not a country you open in. It is here because a site does not
     have to be a market: it is one of the best places on earth to serve the
     region FROM, which is a different question and the only one this file
     asks. Its residency lookup simply answers no. */
  site("HKG", "Hong Kong", "HK", "ASIA", "AS", 22.32, 114.17, 1, 9, 11e6, 15.1, 0.9),
  site("BOM", "Mumbai", "IN", "ASIA", "AS", 19.08, 72.88, 1, 8, 65e5, 9.8, 0.86),
  site("SEO", "Seoul", "KR", "ASIA", "AS", 37.57, 126.98, 2, 8, 85e5, 11.4, 0.7),
  site("BEI", "Beijing", "CN", "ASIA", "AS", 39.9, 116.41, 2, 7, 12e6, 9.1, 0.58),
  site("DXB", "Dubai", "AE", "ASIA", "AS", 25.2, 55.27, 2, 8, 9e6, 8.4, 0.74),
  site("IST", "Istanbul", "TR", "ASIA", "AS", 41.01, 28.98, 2, 6, 5e6, 12.6, 0.62),
  site("JKT", "Jakarta", "ID", "ASIA", "AS", -6.21, 106.85, 2, 6, 45e5, 9.6, 0.58),
  site("CHN", "Chennai", "IN", "ASIA", "AS", 13.08, 80.27, 2, 7, 45e5, 9.4, 0.68),
  /* Nearly half of India lives in the north, 1,150 km and more from Mumbai
     and Chennai — the largest market in the game could not reach Strong (#106). */
  site("DEL", "Delhi", "IN", "ASIA", "AS", 28.61, 77.21, 2, 7, 5e6, 8.9, 0.6),
  site("CCU", "Kolkata", "IN", "ASIA", "AS", 22.57, 88.36, 3, 6, 35e5, 9, 0.5),
  site("BKK", "Bangkok", "TH", "ASIA", "AS", 13.76, 100.5, 3, 6, 35e5, 11.2, 0.5),
  site("BLR", "Bangalore", "IN", "ASIA", "AS", 12.97, 77.59, 2, 8, 55e5, 9.1, 0.66),
  site("HYD", "Hyderabad", "IN", "ASIA", "AS", 17.39, 78.49, 3, 7, 45e5, 9, 0.54),
  site("KHI", "Karachi", "PK", "ASIA", "AS", 24.86, 67.01, 2, 6, 45e5, 10.8, 0.56),
  site("LHE", "Lahore", "PK", "ASIA", "AS", 31.55, 74.34, 3, 5, 35e5, 10.6, 0.42),
  site("DAC", "Dhaka", "BD", "ASIA", "AS", 23.81, 90.41, 3, 5, 35e5, 9.4, 0.44),
  site("CMB", "Colombo", "LK", "ASIA", "AS", 6.93, 79.86, 3, 5, 3e6, 11.8, 0.46),
  site("KUL", "Kuala Lumpur", "MY", "ASIA", "AS", 3.14, 101.69, 2, 8, 65e5, 9.9, 0.74),
  site("MNL", "Manila", "PH", "ASIA", "AS", 14.6, 120.98, 2, 6, 5e6, 13.2, 0.6),
  site("SGN", "Ho Chi Minh City", "VN", "ASIA", "AS", 10.82, 106.63, 2, 6, 45e5, 8.7, 0.58),
  site("HAN", "Hanoi", "VN", "ASIA", "AS", 21.03, 105.85, 3, 5, 35e5, 8.6, 0.44),
  site("TPE", "Taipei", "TW", "ASIA", "AS", 25.03, 121.57, 2, 8, 8e6, 10.4, 0.78),
  site("OSA", "Osaka", "JP", "ASIA", "AS", 34.69, 135.5, 2, 8, 95e5, 18, 0.76),
  site("SHA", "Shanghai", "CN", "ASIA", "AS", 31.23, 121.47, 1, 8, 13e6, 9.3, 0.82),
  site("SZX", "Shenzhen", "CN", "ASIA", "AS", 22.54, 114.06, 2, 8, 9e6, 9.2, 0.72),
  site("CTU", "Chengdu", "CN", "ASIA", "AS", 30.57, 104.07, 3, 6, 6e6, 8.8, 0.5),
  site("RUH", "Riyadh", "SA", "ASIA", "AS", 24.71, 46.68, 2, 7, 7e6, 6.4, 0.6),
  site("DOH", "Doha", "QA", "ASIA", "AS", 25.29, 51.53, 3, 7, 6e6, 6.2, 0.56),
  site("TLV", "Tel Aviv", "IL", "ASIA", "AS", 32.09, 34.78, 2, 8, 75e5, 13.6, 0.7),
  site("THR", "Tehran", "IR", "ASIA", "AS", 35.69, 51.39, 3, 4, 4e6, 5.8, 0.34),
  site("ALA", "Almaty", "KZ", "ASIA", "AS", 43.24, 76.89, 3, 5, 35e5, 6.8, 0.4),
  site("TAS", "Tashkent", "UZ", "ASIA", "AS", 41.3, 69.24, 3, 4, 3e6, 6.4, 0.34),
  site("SUB", "Surabaya", "ID", "ASIA", "AS", -7.26, 112.75, 3, 5, 35e5, 9.7, 0.44),
  site("MES", "Medan", "ID", "ASIA", "AS", 3.6, 98.67, 3, 5, 35e5, 9.8, 0.42),
  site("UPG", "Makassar", "ID", "ASIA", "AS", -5.15, 119.43, 3, 4, 3e6, 10, 0.32),
  site("DJJ", "Jayapura", "ID", "ASIA", "AS", -2.53, 140.72, 3, 2, 3e6, 12.4, 0.16),
  site("RGN", "Yangon", "MM", "ASIA", "AS", 16.87, 96.2, 3, 4, 3e6, 10.2, 0.32),
  site("PUS", "Busan", "KR", "ASIA", "AS", 35.18, 129.08, 3, 7, 6e6, 11.2, 0.56),
  site("ULN", "Ulaanbaatar", "MN", "ASIA", "AS", 47.89, 106.91, 3, 4, 3e6, 7.2, 0.28),
  site("KBL", "Kabul", "AF", "ASIA", "AS", 34.56, 69.21, 3, 3, 25e5, 9, 0.22),
  site("BGW", "Baghdad", "IQ", "ASIA", "AS", 33.32, 44.36, 3, 4, 35e5, 5.6, 0.3),
  site("MCT", "Muscat", "OM", "ASIA", "AS", 23.59, 58.41, 3, 6, 45e5, 6, 0.46),
  site("KTM", "Kathmandu", "NP", "ASIA", "AS", 27.72, 85.32, 3, 4, 3e6, 8.8, 0.28),
  site("PNH", "Phnom Penh", "KH", "ASIA", "AS", 11.56, 104.92, 3, 4, 3e6, 10.4, 0.32),
  site("URC", "Urumqi", "CN", "ASIA", "AS", 43.83, 87.62, 3, 4, 4e6, 7.8, 0.3),
  site("XIY", "Xi'an", "CN", "ASIA", "AS", 34.34, 108.94, 3, 6, 55e5, 8.6, 0.46),
  site("NAG", "Nagpur", "IN", "ASIA", "AS", 21.15, 79.09, 3, 5, 35e5, 9.2, 0.38),
  /* --- Africa --------------------------------------------------------------- */
  site("JNB", "Johannesburg", "ZA", "AFRICA", "AF", -26.2, 28.05, 2, 7, 5e6, 9.8, 0.66),
  site("CPT", "Cape Town", "ZA", "AFRICA", "AF", -33.92, 18.42, 2, 7, 45e5, 10.1, 0.6),
  site("LAG", "Lagos", "NG", "AFRICA", "AF", 6.52, 3.38, 2, 5, 35e5, 14.8, 0.52),
  site("CAI", "Cairo", "EG", "AFRICA", "AF", 30.04, 31.24, 2, 6, 4e6, 7.6, 0.58),
  site("NBO", "Nairobi", "KE", "AFRICA", "AF", -1.29, 36.82, 3, 5, 3e6, 12.4, 0.44),
  /* Kept because a save may hold a room here. It is a fine place to shoot and a
     poor place to put a rack, and the two scores now say so separately. */
  site("MAR", "Marrakesh", "MA", "AFRICA", "AF", 31.63, -7.98, 3, 4, 25e5, 11.6, 0.34),
  site("CAS", "Casablanca", "MA", "AFRICA", "AF", 33.57, -7.59, 2, 6, 45e5, 11.4, 0.58),
  site("ALG", "Algiers", "DZ", "AFRICA", "AF", 36.75, 3.06, 3, 5, 35e5, 7.8, 0.42),
  site("TUN", "Tunis", "TN", "AFRICA", "AF", 36.81, 10.18, 3, 5, 35e5, 9.6, 0.44),
  site("ALY", "Alexandria", "EG", "AFRICA", "AF", 31.2, 29.92, 3, 5, 35e5, 7.8, 0.46),
  site("ACC", "Accra", "GH", "AFRICA", "AF", 5.6, -0.19, 3, 5, 35e5, 13.6, 0.46),
  site("ABJ", "Abidjan", "CI", "AFRICA", "AF", 5.36, -4.01, 3, 5, 35e5, 13.2, 0.44),
  site("DKR", "Dakar", "SN", "AFRICA", "AF", 14.72, -17.47, 3, 5, 35e5, 14.4, 0.46),
  site("ABV", "Abuja", "NG", "AFRICA", "AF", 9.06, 7.49, 3, 5, 35e5, 14.6, 0.42),
  site("KAN", "Kano", "NG", "AFRICA", "AF", 12, 8.52, 3, 4, 3e6, 15, 0.34),
  site("ADD", "Addis Ababa", "ET", "AFRICA", "AF", 9.03, 38.74, 3, 5, 35e5, 8.4, 0.4),
  site("DAR", "Dar es Salaam", "TZ", "AFRICA", "AF", -6.79, 39.28, 3, 5, 35e5, 12, 0.42),
  site("EBB", "Kampala", "UG", "AFRICA", "AF", 0.35, 32.58, 3, 4, 3e6, 12.8, 0.36),
  site("FIH", "Kinshasa", "CD", "AFRICA", "AF", -4.32, 15.31, 3, 4, 35e5, 13.4, 0.32),
  site("LAD", "Luanda", "AO", "AFRICA", "AF", -8.84, 13.23, 3, 4, 4e6, 12.6, 0.38),
  site("LUN", "Lusaka", "ZM", "AFRICA", "AF", -15.39, 28.32, 3, 4, 3e6, 10.8, 0.34),
  site("HRE", "Harare", "ZW", "AFRICA", "AF", -17.83, 31.05, 3, 4, 3e6, 11.6, 0.34),
  site("MPM", "Maputo", "MZ", "AFRICA", "AF", -25.97, 32.57, 3, 4, 3e6, 11.2, 0.38),
  site("DUR", "Durban", "ZA", "AFRICA", "AF", -29.86, 31.03, 3, 6, 4e6, 10, 0.5),
  site("KRT", "Khartoum", "SD", "AFRICA", "AF", 15.5, 32.56, 3, 3, 3e6, 9.4, 0.28),
  site("WDH", "Windhoek", "NA", "AFRICA", "AF", -22.56, 17.08, 3, 4, 3e6, 11, 0.3),
  site("TNR", "Antananarivo", "MG", "AFRICA", "AF", -18.88, 47.51, 3, 3, 25e5, 12.4, 0.24),
  site("BKO", "Bamako", "ML", "AFRICA", "AF", 12.64, -8, 3, 3, 25e5, 14.2, 0.24),
  site("TIP", "Tripoli", "LY", "AFRICA", "AF", 32.89, 13.19, 3, 4, 3e6, 6.8, 0.3),
  site("NDJ", "N'Djamena", "TD", "AFRICA", "AF", 12.13, 15.06, 3, 3, 25e5, 15, 0.2),
  site("MGQ", "Mogadishu", "SO", "AFRICA", "AF", 2.05, 45.32, 3, 3, 25e5, 14.6, 0.22),
  site("NIM", "Niamey", "NE", "AFRICA", "AF", 13.51, 2.13, 3, 3, 25e5, 15.4, 0.2),
  site("FBM", "Lubumbashi", "CD", "AFRICA", "AF", -11.66, 27.48, 3, 3, 25e5, 13, 0.22),
  /* --- Oceania -------------------------------------------------------------- */
  site("SYD", "Sydney", "AU", "OCEANIA", "OC", -33.87, 151.21, 1, 9, 1e7, 16.2, 0.84),
  site("MEL", "Melbourne", "AU", "OCEANIA", "OC", -37.81, 144.96, 2, 8, 8e6, 15.8, 0.62),
  site("AKL", "Auckland", "NZ", "OCEANIA", "OC", -36.85, 174.76, 3, 6, 6e6, 13.4, 0.4),
  site("BNE", "Brisbane", "AU", "OCEANIA", "OC", -27.47, 153.03, 2, 7, 7e6, 15.6, 0.6),
  site("PER", "Perth", "AU", "OCEANIA", "OC", -31.95, 115.86, 2, 7, 7e6, 16, 0.58),
  site("ADL", "Adelaide", "AU", "OCEANIA", "OC", -34.93, 138.6, 3, 6, 55e5, 16.4, 0.48),
  site("WLG", "Wellington", "NZ", "OCEANIA", "OC", -41.29, 174.78, 3, 6, 5e6, 13.2, 0.42),
  site("POM", "Port Moresby", "PG", "OCEANIA", "OC", -9.44, 147.18, 3, 3, 3e6, 16.8, 0.22),
  site("SUV", "Suva", "FJ", "OCEANIA", "OC", -18.14, 178.44, 3, 4, 35e5, 18.2, 0.26),
  site("DRW", "Darwin", "AU", "OCEANIA", "OC", -12.46, 130.84, 3, 5, 45e5, 17, 0.34),
  site("CNS", "Cairns", "AU", "OCEANIA", "OC", -16.92, 145.77, 3, 4, 4e6, 17.4, 0.28),
  site("CHC", "Christchurch", "NZ", "OCEANIA", "OC", -43.53, 172.64, 3, 5, 45e5, 13.6, 0.32),
  site("ASP", "Alice Springs", "AU", "OCEANIA", "OC", -23.7, 133.88, 3, 3, 3e6, 18, 0.2)
];
var SITE_BY_ID = new Map(STREAMING_SERVER_SITES.map((entry) => [entry.id, entry]));

// services/streamingSitePlaces.ts
var ARCHETYPES = [
  {
    id: "CLOUD",
    label: "Cloud allocation",
    note: "No building at all. Running this week, and expensive for as long as you keep it.",
    /* Not read for a cloud region — `CLOUD_CAP_BY_TIER` below is. */
    racks: 10,
    expansion: 0,
    fibre: "CITY",
    security: "STANDARD",
    transit: 0.78,
    power: 1,
    tenures: ["CLOUD"],
    legacyType: "CLOUD_ALLOCATION",
    worstTier: 3
  },
  {
    id: "SHARED_CAGE",
    label: "Shared floor",
    note: "A few racks on somebody else\u2019s floor. Small, short term, quick to start.",
    racks: 3,
    expansion: 0.6,
    fibre: "CARRIER",
    security: "STANDARD",
    transit: 0.74,
    power: 1.05,
    tenures: ["RENTED"],
    legacyType: "RENTED_CABINET",
    worstTier: 3
  },
  {
    id: "BUSINESS_PARK",
    label: "Business park hall",
    note: "The sensible middle. Decent fibre, fair power, room to grow a little.",
    racks: 12,
    expansion: 0.75,
    fibre: "CARRIER",
    security: "REINFORCED",
    transit: 0.87,
    power: 0.95,
    tenures: ["RENTED", "OWNED"],
    legacyType: "PRIVATE_SUITE",
    worstTier: 3
  },
  {
    id: "INDUSTRIAL_SHED",
    label: "Industrial park",
    note: "Cheap, big, and room to double \u2014 a long way from the exchange.",
    racks: 26,
    expansion: 1.2,
    fibre: "METRO",
    security: "REINFORCED",
    transit: 0.59,
    power: 0.72,
    tenures: ["RENTED", "OWNED"],
    legacyType: "DEDICATED_DATA_HALL",
    worstTier: 3
  },
  {
    id: "CARRIER_HOTEL",
    label: "Carrier hotel",
    note: "Everything in the country crosses this floor. Dear, and there is no room to grow.",
    racks: 8,
    expansion: 0,
    fibre: "GLOBAL_BACKBONE",
    security: "FORTIFIED",
    transit: 1,
    power: 1.35,
    tenures: ["RENTED"],
    legacyType: "PRIVATE_CAGE",
    worstTier: 1
  },
  {
    id: "CAMPUS",
    label: "Campus",
    note: "Your own ground, your own power, and as much of it as you can pay for.",
    racks: 72,
    expansion: 1.5,
    fibre: "GLOBAL_BACKBONE",
    security: "FORTIFIED",
    transit: 0.83,
    power: 0.6,
    tenures: ["OWNED"],
    legacyType: "OWNED_DATA_CENTRE",
    worstTier: 2
  }
];
var QUARTERS = ["North", "South", "East", "West", "Central", "Harbour", "Airport", "Riverside"];
var AUTHORED_NAMES = {
  ASH: { CARRIER_HOTEL: "Beaumeade Exchange", INDUSTRIAL_SHED: "Loudoun Data Campus", BUSINESS_PARK: "Waxpool Hall" },
  NYC: { CARRIER_HOTEL: "Hudson Exchange", INDUSTRIAL_SHED: "Secaucus Industrial Park", BUSINESS_PARK: "Harlem River Hall" },
  LA: { CARRIER_HOTEL: "Wilshire Exchange", INDUSTRIAL_SHED: "Vernon Industrial Park", BUSINESS_PARK: "El Segundo Hall" },
  TOR: { CARRIER_HOTEL: "Front Street Exchange", INDUSTRIAL_SHED: "Vaughan Industrial Park", BUSINESS_PARK: "Markham Tech Campus" },
  LDN: { CARRIER_HOTEL: "Docklands Exchange", INDUSTRIAL_SHED: "Slough Trading Estate", BUSINESS_PARK: "Park Royal Hall" },
  FRA: { CARRIER_HOTEL: "Kleyerstrasse Exchange", INDUSTRIAL_SHED: "Offenbach Industrial Park", BUSINESS_PARK: "Niederrad Hall" },
  AMS: { CARRIER_HOTEL: "Science Park Exchange", INDUSTRIAL_SHED: "Schiphol-Rijk Industrial Park", BUSINESS_PARK: "Zuidoost Hall" },
  PAR: { CARRIER_HOTEL: "Aubervilliers Exchange", INDUSTRIAL_SHED: "Saint-Denis Industrial Park", BUSINESS_PARK: "Courbevoie Hall" },
  SIN: { CARRIER_HOTEL: "Tanjong Pagar Exchange", INDUSTRIAL_SHED: "Jurong Industrial Park", BUSINESS_PARK: "Paya Lebar Hall" },
  TOK: { CARRIER_HOTEL: "Otemachi Exchange", INDUSTRIAL_SHED: "Inzai Industrial Park", BUSINESS_PARK: "Shinagawa Hall" },
  BOM: { CARRIER_HOTEL: "Nariman Point Exchange", INDUSTRIAL_SHED: "Navi Mumbai Industrial Park", BUSINESS_PARK: "Powai Hall" },
  CHN: { INDUSTRIAL_SHED: "Ambattur Industrial Park", BUSINESS_PARK: "Siruseri Tech Hall", SHARED_CAGE: "Guindy Shared Floor" },
  SAO: { CARRIER_HOTEL: "Avenida Paulista Exchange", INDUSTRIAL_SHED: "Barueri Industrial Park", BUSINESS_PARK: "Santana Hall" },
  SYD: { CARRIER_HOTEL: "Harbour Exchange", INDUSTRIAL_SHED: "Erskine Park Industrial Park", BUSINESS_PARK: "Macquarie Hall" },
  JNB: { INDUSTRIAL_SHED: "Isando Industrial Park", BUSINESS_PARK: "Bryanston Hall", SHARED_CAGE: "Rosebank Shared Floor" }
};
var hash = (value) => {
  let out = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    out ^= value.charCodeAt(index);
    out = Math.imul(out, 16777619);
  }
  return out >>> 0;
};
var nameFor = (site2, archetype, seed2) => {
  const authored = AUTHORED_NAMES[site2.id]?.[archetype.id];
  if (authored) return authored;
  const quarter = QUARTERS[seed2 % QUARTERS.length];
  if (archetype.id === "CLOUD") return "Cloud region";
  if (archetype.id === "CARRIER_HOTEL") return `${site2.name} Exchange`;
  if (archetype.id === "SHARED_CAGE") return "Shared Floor";
  if (archetype.id === "INDUSTRIAL_SHED") return `${quarter} Industrial Park`;
  if (archetype.id === "CAMPUS") return `${quarter} Campus`;
  return `${quarter} Hall`;
};
var clamp = (value, low, high) => Math.min(high, Math.max(low, value));
var even = (value) => Math.max(2, Math.round(value / 2) * 2);
var CLOUD_CAP_BY_TIER = { 1: 16, 2: 10, 3: 6 };
function placesForSite(site2) {
  const scale = site2.tier === 1 ? 1.35 : site2.tier === 2 ? 1 : 0.7;
  return ARCHETYPES.filter((archetype) => site2.tier <= archetype.worstTier).map((archetype) => {
    const seed2 = hash(`${site2.id}.${archetype.id}.places-v1`);
    const wobble = 0.88 + seed2 % 1e3 / 1e3 * 0.24;
    const racks = archetype.id === "CLOUD" ? CLOUD_CAP_BY_TIER[site2.tier] : even(archetype.racks * scale * wobble);
    const fibre = archetype.fibre === "CITY" ? site2.quality >= 8 ? "CARRIER" : "METRO" : archetype.fibre;
    const transit = clamp(site2.transit * archetype.transit, 0.12, 1);
    return {
      id: `PLACE-${site2.id}-${archetype.id}`,
      cityId: site2.id,
      archetype: archetype.id,
      name: nameFor(site2, archetype, seed2),
      note: archetype.note,
      rackPositions: racks,
      /* `even` floors at two, so a building with no room to grow — a cloud
         region, a carrier hotel — was quoting two spare positions it does
         not have. None is none. */
      expansionRackPositions: archetype.expansion > 0 ? even(racks * archetype.expansion) : 0,
      fibre,
      security: archetype.security,
      transit,
      uptime: clamp(99.7 + site2.quality * 0.022 + (fibre === "GLOBAL_BACKBONE" ? 0.05 : fibre === "CARRIER" ? 0.02 : 0), 99.5, 99.999),
      powerPricePerKwh: Math.round(site2.powerPricePerKwh * archetype.power * 100) / 100,
      tenures: archetype.tenures,
      legacyType: archetype.legacyType
    };
  });
}
var STREAMING_SITE_PLACES = STREAMING_SERVER_SITES.flatMap(placesForSite);
var BY_CITY = /* @__PURE__ */ new Map();
STREAMING_SITE_PLACES.forEach((place) => {
  const held = BY_CITY.get(place.cityId);
  if (held) held.push(place);
  else BY_CITY.set(place.cityId, [place]);
});
var BY_ID = new Map(STREAMING_SITE_PLACES.map((place) => [place.id, place]));
var getStreamingSitePlaces = (cityId) => [...BY_CITY.get(String(cityId || "").trim().toUpperCase()) || []].sort((a, b) => a.rackPositions - b.rackPositions);
var listingIdForPlace = (place) => `LEASE-${place.cityId}-${place.legacyType}-V1`;
var BY_LISTING_ID = new Map(STREAMING_SITE_PLACES.map((place) => [listingIdForPlace(place), place]));
var OFFERED_TENURES = ["CLOUD", "RENTED", "OWNED"];
var getOfferedTenures = (place) => place.tenures.filter((tenure) => OFFERED_TENURES.includes(tenure));
(() => {
  const empty = STREAMING_SERVER_SITES.filter((site2) => getStreamingSitePlaces(site2.id).filter((place) => getOfferedTenures(place).length > 0).length === 0).map((site2) => site2.id);
  if (empty.length > 0) {
    throw new Error(`Cities with no place you can take: ${empty.join(", ")}`);
  }
  const duplicates = STREAMING_SITE_PLACES.map((place) => place.id).filter((id, index, all) => all.indexOf(id) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate place ids: ${duplicates.join(", ")}`);
  }
})();

// services/worldEconomy/worldPopulationClusters.generated.ts
var POPULATION_CLUSTERS = {
  AG: [[17.08, -61.79, 1]],
  BS: [[24.7, -78.04, 1]],
  BB: [[13.18, -59.56, 1]],
  BZ: [[17.19, -88.72, 1]],
  CA: [[43.65, -79.38, 0.485], [45.5, -73.57, 0.299], [49.28, -123.12, 0.216]],
  CR: [[9.98, -84.19, 1]],
  CU: [[21.63, -78.91, 0.619], [22.89, -82.43, 0.381]],
  DM: [[15.44, -61.36, 1]],
  DO: [[18.9, -70.51, 1]],
  SV: [[13.74, -88.87, 1]],
  GD: [[12.12, -61.68, 1]],
  GT: [[15.69, -90.37, 1]],
  HT: [[18.93, -72.68, 1]],
  HN: [[14.83, -86.62, 0.619], [15.13, -83.69, 0.381]],
  JM: [[18.16, -77.31, 1]],
  MX: [[19.43, -99.13, 0.415], [20.66, -103.35, 0.256], [25.69, -100.32, 0.185], [21.16, -86.85, 0.144]],
  NI: [[12.85, -85.03, 0.619], [14.9, -83.43, 0.381]],
  PA: [[8.53, -80.11, 1]],
  KN: [[17.33, -62.75, 1]],
  LC: [[13.89, -60.97, 1]],
  VC: [[13.25, -61.2, 1]],
  TT: [[10.42, -61.29, 1]],
  US: [[40.71, -74.01, 0.341], [34.05, -118.24, 0.21], [41.88, -87.63, 0.151], [29.76, -95.37, 0.118], [33.75, -84.39, 0.097], [25.76, -80.19, 0.083]],
  AR: [[-34.6, -58.38, 0.485], [-31.42, -64.18, 0.299], [-32.95, -60.64, 0.216]],
  BO: [[-16.68, -64.7, 0.619], [-16.94, -59.03, 0.381]],
  BR: [[-23.55, -46.63, 0.341], [-22.91, -43.17, 0.21], [-19.92, -43.94, 0.151], [-15.79, -47.88, 0.118], [-12.97, -38.5, 0.097], [-8.05, -34.88, 0.083]],
  CL: [[-33.5, -70.7, 0.619], [-28.35, -70.83, 0.381]],
  CO: [[4.71, -74.07, 0.485], [6.24, -75.58, 0.299], [3.45, -76.53, 0.216]],
  EC: [[-1.44, -78.39, 0.619], [0.03, -76.06, 0.381]],
  GY: [[4.79, -58.98, 1]],
  PY: [[-23.21, -58.44, 0.619], [-25.94, -55.66, 0.381]],
  PE: [[-12.05, -77.04, 0.485], [-16.41, -71.54, 0.299], [-8.11, -79.03, 0.216]],
  SR: [[4.13, -55.91, 1]],
  UY: [[-32.79, -56.03, 1]],
  VE: [[10.2, -67.5, 0.485], [5.62, -65.49, 0.299], [1.55, -66.37, 0.216]],
  AL: [[41.13, 20.05, 1]],
  AD: [[42.54, 1.56, 1]],
  AT: [[47.59, 14.11, 0.619], [47.22, 10.03, 0.381]],
  BY: [[53.52, 28.02, 0.619], [52.34, 24.09, 0.381]],
  BE: [[50.64, 4.65, 1]],
  BA: [[44.17, 17.77, 1]],
  BG: [[42.77, 25.21, 0.619], [43.69, 28.46, 0.381]],
  HR: [[45.16, 16.42, 1]],
  CY: [[34.92, 33.01, 1]],
  CZ: [[49.74, 15.32, 1]],
  DK: [[56.23, 9.35, 1]],
  EE: [[58.68, 25.84, 1]],
  FI: [[60.5, 24.5, 0.619], [64.84, 26.58, 0.381]],
  FR: [[48.86, 2.35, 0.485], [45.76, 4.84, 0.299], [43.3, 5.37, 0.216]],
  DE: [[52.52, 13.4, 0.415], [48.14, 11.58, 0.256], [50.94, 6.96, 0.185], [53.55, 9.99, 0.144]],
  GR: [[39.46, 22.57, 0.619], [41.03, 25.24, 0.381]],
  HU: [[47.17, 19.38, 1]],
  IS: [[65, -18.58, 1]],
  IE: [[53.16, -8.14, 1]],
  IT: [[45.46, 9.19, 0.485], [41.9, 12.5, 0.299], [40.85, 14.27, 0.216]],
  XK: [[42.6, 20.9, 1]],
  LV: [[56.86, 24.92, 1]],
  LI: [[47.14, 9.54, 1]],
  LT: [[55.32, 23.9, 1]],
  LU: [[49.77, 6.07, 1]],
  MT: [[35.89, 14.44, 1]],
  MD: [[47.19, 28.47, 1]],
  MC: [[43.75, 7.41, 1]],
  ME: [[42.79, 19.24, 1]],
  NL: [[52.28, 5.63, 1]],
  MK: [[41.6, 21.68, 1]],
  NO: [[60, 10.8, 0.619], [65.81, 14.19, 0.381]],
  PL: [[52.23, 21.01, 0.485], [50.06, 19.94, 0.299], [51.11, 17.04, 0.216]],
  PT: [[39.65, -7.98, 0.619], [37.04, -8.91, 0.381]],
  RO: [[45.85, 24.98, 0.619], [47.7, 22.44, 0.381]],
  RU: [[55.75, 37.62, 0.415], [59.93, 30.34, 0.256], [56.84, 60.65, 0.185], [55.03, 82.92, 0.144]],
  SM: [[43.94, 12.46, 1]],
  RS: [[44.21, 20.81, 1]],
  SK: [[48.71, 19.47, 1]],
  SI: [[46.12, 14.8, 1]],
  ES: [[40.42, -3.7, 0.485], [41.39, 2.17, 0.299], [39.47, -0.38, 0.216]],
  SE: [[59, 17, 0.619], [65.43, 20.78, 0.381]],
  CH: [[46.8, 8.21, 1]],
  UA: [[50.45, 30.52, 0.485], [49.84, 24.03, 0.299], [46.48, 30.73, 0.216]],
  GB: [[51.51, -0.13, 0.485], [53.48, -2.24, 0.299], [52.49, -1.89, 0.216]],
  VA: [[41.9, 12.43, 1]],
  DZ: [[36.75, 3.06, 0.485], [35.7, -0.63, 0.299], [36.37, 6.61, 0.216]],
  AO: [[-12.31, 17.56, 0.485], [-15.21, 20.59, 0.299], [-10.3, 21.4, 0.216]],
  BJ: [[9.64, 2.33, 0.619], [6.78, 2.67, 0.381]],
  BW: [[-22.17, 23.81, 1]],
  BF: [[12.27, -1.76, 0.485], [11.58, -4.26, 0.299], [11.98, 1.04, 0.216]],
  BI: [[-3.36, 29.88, 1]],
  CV: [[15.08, -23.64, 1]],
  CM: [[5.68, 12.73, 0.485], [10.09, 14.43, 0.299], [2.64, 12.99, 0.216]],
  CF: [[6.57, 20.46, 0.619], [9.63, 22.79, 0.381]],
  TD: [[12.5, 15, 0.619], [17.06, 18.69, 0.381]],
  KM: [[-11.65, 43.34, 1]],
  CD: [[-4.32, 15.31, 0.415], [-11.66, 27.48, 0.256], [-6.14, 23.6, 0.185], [0.52, 25.2, 0.144]],
  CG: [[-0.84, 15.22, 0.619], [-2.96, 13.5, 0.381]],
  CI: [[7.63, -5.57, 0.485], [5.07, -7.42, 0.299], [9.31, -3.01, 0.216]],
  DJ: [[11.75, 42.56, 1]],
  EG: [[30.04, 31.24, 0.415], [31.2, 29.92, 0.256], [25.69, 32.64, 0.185], [30.79, 31, 0.144]],
  GQ: [[1.57, 10.47, 1]],
  ER: [[15.36, 38.85, 1]],
  SZ: [[-26.56, 31.48, 1]],
  ET: [[9.01, 38.76, 0.415], [7.68, 36.83, 0.256], [11.59, 37.39, 0.185], [13.5, 39.47, 0.144]],
  GA: [[-0.59, 11.79, 1]],
  GM: [[13.45, -15.4, 1]],
  GH: [[7.95, -1.22, 0.485], [5.4, -1.87, 0.299], [10.56, -0.8, 0.216]],
  GN: [[10.44, -10.93, 0.619], [9.58, -8.16, 0.381]],
  GW: [[12.06, -14.92, 1]],
  KE: [[0.6, 37.8, 0.485], [2.29, 40.03, 0.299], [4.73, 34.86, 0.216]],
  LS: [[-29.58, 28.23, 1]],
  LR: [[6.45, -9.32, 0.619], [4.39, -7.58, 0.381]],
  LY: [[32.5, 14.5, 0.619], [29.89, 22.95, 0.381]],
  MG: [[-19.32, 46.74, 0.485], [-17.75, 49.25, 0.299], [-15.82, 46.72, 0.216]],
  MW: [[-13.21, 34.28, 0.485], [-16, 34.43, 0.299], [-10.33, 33.79, 0.216]],
  ML: [[13.5, -7.5, 0.485], [17.88, -1.46, 0.299], [16.92, 1.37, 0.216]],
  MR: [[18.1, -15.9, 0.619], [21.24, -10.34, 0.381]],
  MU: [[-20.28, 57.57, 1]],
  MA: [[33.57, -7.59, 0.485], [34.02, -6.84, 0.299], [31.63, -8.01, 0.216]],
  MZ: [[-17.2, 35.6, 0.485], [-24.93, 33.08, 0.299], [-13.5, 35.42, 0.216]],
  NA: [[-22.07, 17.2, 1]],
  NE: [[13.6, 5, 0.485], [19.73, 7.47, 0.299], [17.33, 8.65, 0.216]],
  NG: [[6.52, 3.38, 0.341], [9.06, 7.49, 0.21], [12, 8.52, 0.151], [7.38, 3.9, 0.118], [4.82, 7.05, 0.097], [11.83, 13.15, 0.083]],
  RW: [[-1.99, 29.92, 1]],
  ST: [[0.24, 6.61, 1]],
  SN: [[14.36, -14.47, 0.619], [12.53, -11.65, 0.381]],
  SC: [[-4.66, 55.48, 1]],
  SL: [[8.57, -11.79, 1]],
  SO: [[4.74, 45.68, 0.619], [11.42, 50.02, 0.381]],
  ZA: [[-26.2, 28.04, 0.485], [-33.92, 18.42, 0.299], [-29.86, 31.02, 0.216]],
  SS: [[7.31, 30.25, 0.619], [6.51, 34.28, 0.381]],
  SD: [[15.5, 32.56, 0.485], [19.62, 37.22, 0.299], [13.18, 30.22, 0.216]],
  TZ: [[-6.27, 34.79, 0.485], [-7.95, 37.15, 0.299], [-6.03, 32.15, 0.216]],
  TG: [[8.52, 0.96, 0.619], [11.02, 0.24, 0.381]],
  TN: [[34.09, 9.55, 0.619], [36.69, 8.54, 0.381]],
  UG: [[1.27, 32.37, 0.485], [3.74, 31.73, 0.299], [-0.31, 29.99, 0.216]],
  ZM: [[-13.46, 27.81, 0.485], [-10.11, 29.81, 0.299], [-16.96, 26.86, 0.216]],
  ZW: [[-19, 29.85, 0.619], [-16.67, 31.36, 0.381]],
  AF: [[33.82, 65.93, 0.485], [37.05, 65.05, 0.299], [34.73, 62.04, 0.216]],
  AM: [[40.29, 44.94, 1]],
  AZ: [[40.34, 47.67, 1]],
  BH: [[26.04, 50.54, 1]],
  BD: [[23.81, 90.41, 0.415], [22.36, 91.78, 0.256], [24.9, 91.87, 0.185], [24.37, 88.6, 0.144]],
  BT: [[27.41, 90.4, 1]],
  BN: [[4.49, 114.59, 1]],
  KH: [[12.72, 104.91, 0.619], [13.47, 102.32, 0.381]],
  CN: [[31.23, 121.47, 0.3], [39.9, 116.41, 0.185], [23.13, 113.26, 0.133], [22.54, 114.06, 0.104], [30.57, 104.07, 0.086], [29.56, 106.55, 0.073], [34.34, 108.94, 0.063], [45.8, 126.53, 0.056]],
  GE: [[42.17, 43.52, 1]],
  IN: [[28.61, 77.21, 0.3], [19.08, 72.88, 0.185], [12.97, 77.59, 0.133], [22.57, 88.36, 0.104], [13.08, 80.27, 0.086], [17.39, 78.49, 0.073], [23.02, 72.57, 0.063], [26.85, 80.95, 0.056]],
  ID: [[-6.21, 106.85, 0.341], [-7.25, 112.75, 0.21], [-6.92, 107.61, 0.151], [-7, 110.42, 0.118], [3.59, 98.67, 0.097], [-5.15, 119.44, 0.083]],
  IR: [[35.69, 51.39, 0.415], [38.08, 46.29, 0.256], [32.65, 51.68, 0.185], [29.59, 52.58, 0.144]],
  IQ: [[33.01, 43.77, 0.485], [34.98, 41.74, 0.299], [30.25, 44.8, 0.216]],
  IL: [[31.9, 35, 1]],
  JP: [[35.68, 139.69, 0.415], [34.69, 135.5, 0.256], [35.18, 136.91, 0.185], [43.06, 141.35, 0.144]],
  JO: [[31.24, 36.76, 0.619], [33.28, 38.71, 0.381]],
  KZ: [[43.24, 76.89, 0.485], [51.16, 71.47, 0.299], [42.34, 69.6, 0.216]],
  KW: [[29.32, 47.56, 1]],
  KG: [[41.47, 74.51, 0.619], [41.52, 78.18, 0.381]],
  LA: [[18.49, 103.78, 0.619], [21.2, 102.83, 0.381]],
  LB: [[33.92, 35.88, 1]],
  MY: [[3.14, 101.69, 0.485], [5.41, 100.34, 0.299], [1.49, 103.74, 0.216]],
  MV: [[4.2, 73.5, 1]],
  MN: [[47.9, 106.9, 1]],
  MM: [[16.87, 96.2, 0.485], [21.95, 96.09, 0.299], [22, 96.11, 0.216]],
  NP: [[28.26, 83.95, 0.485], [27.6, 87.19, 0.299], [29.68, 81.33, 0.216]],
  KP: [[40.14, 127.16, 0.485], [42.07, 129.98, 0.299], [37.92, 125.45, 0.216]],
  OM: [[23.6, 58.4, 0.619], [19.9, 55.22, 0.381]],
  PK: [[24.86, 67.01, 0.341], [31.55, 74.34, 0.21], [33.69, 73.06, 0.151], [31.42, 73.08, 0.118], [30.18, 66.98, 0.097], [34.02, 71.58, 0.083]],
  PS: [[31.95, 35.25, 1]],
  PH: [[14.6, 120.98, 0.415], [10.32, 123.89, 0.256], [7.19, 125.46, 0.185], [16.41, 120.6, 0.144]],
  QA: [[25.3, 51.18, 1]],
  SA: [[24.71, 46.68, 0.485], [21.49, 39.19, 0.299], [26.42, 50.09, 0.216]],
  SG: [[1.36, 103.82, 1]],
  KR: [[37.57, 126.98, 0.485], [35.18, 129.08, 0.299], [35.87, 128.6, 0.216]],
  LK: [[7.61, 80.7, 1]],
  SY: [[35.02, 38.49, 0.485], [32.76, 36.99, 0.299], [36.63, 41.64, 0.216]],
  TW: [[23.75, 120.96, 1]],
  TJ: [[38.53, 71.03, 0.619], [39.24, 67.84, 0.381]],
  TH: [[13.76, 100.5, 0.485], [18.79, 98.99, 0.299], [7.89, 98.4, 0.216]],
  TL: [[-8.81, 125.92, 1]],
  TR: [[41.01, 28.98, 0.415], [39.93, 32.86, 0.256], [38.42, 27.14, 0.185], [36.89, 30.71, 0.144]],
  TM: [[39.13, 59.45, 0.619], [37.94, 65.72, 0.381]],
  AE: [[23.9, 54.3, 0.619], [26.03, 56.11, 0.381]],
  UZ: [[41.78, 63.29, 0.485], [42.79, 59.16, 0.299], [38.87, 66.99, 0.216]],
  VN: [[21.03, 105.85, 0.415], [10.82, 106.63, 0.256], [16.05, 108.22, 0.185], [10.05, 105.77, 0.144]],
  YE: [[15.94, 47.52, 0.485], [13.98, 44.7, 0.299], [17.24, 51.3, 0.216]],
  AU: [[-33.87, 151.21, 0.485], [-37.81, 144.96, 0.299], [-27.47, 153.03, 0.216]],
  FJ: [[-17.82, 177.97, 1]],
  KI: [[1.85, -157.37, 1]],
  MH: [[7.11, 171.19, 1]],
  FM: [[6.89, 158.23, 1]],
  NR: [[-0.52, 166.93, 1]],
  NZ: [[-37, 175, 0.619], [-45.7, 167.48, 0.381]],
  PW: [[7.51, 134.58, 1]],
  PG: [[-6.6, 144.23, 0.619], [-8.46, 141.22, 0.381]],
  WS: [[-13.63, -172.44, 1]],
  SB: [[-9.62, 160.17, 1]],
  TO: [[-21.17, -175.22, 1]],
  TV: [[-7.11, 179.19, 1]],
  VU: [[-15.23, 166.85, 1]]
};

// services/worldPopulationClusters.ts
(() => {
  const broken = Object.entries(POPULATION_CLUSTERS).map(([countryId, clusters]) => ({
    countryId,
    total: clusters.reduce((sum, cluster) => sum + cluster[2], 0)
  })).filter((entry) => Math.abs(entry.total - 1) > 0.02).map((entry) => `${entry.countryId}=${entry.total.toFixed(3)}`);
  if (broken.length > 0) {
    throw new Error(`Population shares that do not sum to 1: ${broken.join(", ")}`);
  }
})();

// services/streamingFacilities.ts
var STREAMING_FACILITY_CONTRACTS = [
  {
    type: "CLOUD_ALLOCATION",
    name: "Cloud allocation",
    shortName: "Cloud block",
    description: "Reserved streaming capacity inside a provider-operated cloud region.",
    capacityRacks: 4,
    setupCost: 7e4,
    weeklyLease: 62e3,
    coolingKwPerRack: 11,
    provisioningWeeks: 1,
    playerSelectable: true,
    marketplaceVisible: true
  },
  {
    type: "RENTED_CABINET",
    name: "Rented cabinet",
    shortName: "Cabinet",
    description: "A lockable starter cabinet inside a shared data centre.",
    capacityRacks: 2,
    setupCost: 18e4,
    weeklyLease: 18e3,
    coolingKwPerRack: 11,
    provisioningWeeks: 1,
    playerSelectable: true,
    marketplaceVisible: true
  },
  {
    type: "PRIVATE_CAGE",
    name: "Private cage",
    shortName: "Cage",
    description: "Your own secured cage with room for a small launch cluster.",
    capacityRacks: 8,
    setupCost: 62e4,
    weeklyLease: 54e3,
    coolingKwPerRack: 11,
    provisioningWeeks: 2,
    playerSelectable: true,
    marketplaceVisible: true
  },
  {
    type: "PRIVATE_SUITE",
    name: "Private server suite",
    shortName: "Suite",
    description: "A dedicated room with stronger power, cooling and physical security.",
    capacityRacks: 16,
    setupCost: 165e4,
    weeklyLease: 126e3,
    coolingKwPerRack: 12,
    provisioningWeeks: 3,
    playerSelectable: true,
    marketplaceVisible: true
  },
  {
    type: "DEDICATED_DATA_HALL",
    name: "Dedicated data hall",
    shortName: "Data hall",
    description: "A full hall reserved for your platform and its expansion.",
    capacityRacks: 32,
    setupCost: 48e5,
    weeklyLease: 31e4,
    coolingKwPerRack: 12,
    provisioningWeeks: 5,
    playerSelectable: true,
    marketplaceVisible: true
  },
  {
    type: "OWNED_DATA_CENTRE",
    name: "Owned data centre",
    shortName: "Owned campus",
    description: "Buy land and construct a permanent campus after the required technology is researched.",
    capacityRacks: 96,
    setupCost: 38e6,
    weeklyLease: 18e4,
    coolingKwPerRack: 13,
    provisioningWeeks: 18,
    playerSelectable: false,
    marketplaceVisible: true
  },
  {
    type: "LEGACY_CAMPUS",
    name: "Legacy commissioned campus",
    shortName: "Legacy campus",
    description: "An existing pre-facility save preserved without changing capacity or cost.",
    capacityRacks: 96,
    setupCost: 0,
    weeklyLease: 0,
    coolingKwPerRack: 10,
    provisioningWeeks: 0,
    playerSelectable: false,
    marketplaceVisible: false
  }
];

// services/ownedStreamingPlatform.ts
var STREAMING_FACILITY_TYPES = STREAMING_FACILITY_CONTRACTS.map((contract) => contract.type);

// services/streamingResearchLifecycle.ts
var research = (id, category, categoryLabel, title, codename, description, unlockSummary, installationLocation, gameplayChange, installTargetType, mappedTechnologyId, mappedProductLineId, requiredRackDuty, researchCost, patentCost, installationCost, weeklyOperatingCost, licenseWeeklyCost, staffRequired, researchWeeks, prototypeWeeks, testWeeks, installationWeeks, accent) => ({
  id,
  category,
  categoryLabel,
  title,
  codename,
  description,
  unlockSummary,
  installationLocation,
  gameplayChange,
  installTargetType,
  mappedTechnologyId,
  mappedProductLineId,
  requiredRackDuty,
  researchCost,
  patentCost,
  installationCost,
  weeklyOperatingCost,
  licenseWeeklyCost,
  staffRequired,
  researchWeeks,
  prototypeWeeks,
  testWeeks,
  installationWeeks,
  accent
});
var fibreResearch = (id, generation, title, codename, description, gameplayChange, researchCost, patentCost, installationCost, weeklyOperatingCost, licenseWeeklyCost, staffRequired, researchWeeks, prototypeWeeks, testWeeks, installationWeeks, accent) => ({
  id,
  category: "NETWORK_INFRASTRUCTURE",
  categoryLabel: "Network Infrastructure",
  title,
  codename,
  description,
  unlockSummary: `${title} transponder programme`,
  installationLocation: "Every room on the network",
  gameplayChange,
  installTargetType: "NETWORK_FIBRE",
  mappedTechnologyId: null,
  mappedProductLineId: null,
  requiredRackDuty: null,
  mappedFibreGeneration: generation,
  researchCost,
  patentCost,
  installationCost,
  weeklyOperatingCost,
  licenseWeeklyCost,
  staffRequired,
  researchWeeks,
  prototypeWeeks,
  testWeeks,
  installationWeeks,
  accent
});
var STREAMING_RESEARCH_DEFINITIONS = [
  /* --- the fibre ladder ---------------------------------------------------
         Four projects, because G1 is what the landlord already ran into the
         building and costs nothing. Each one lifts the whole network a
         generation — see `streamingFibreLadder.ts` for what a generation is
         worth and why a maxed one equals a fresh next one.
  
         They rise steeply in cost and in weeks, because the ladder is meant to
         span a career rather than a season, and because the levels underneath
         each one are the cheaper answer while you save for the jump. */
  fibreResearch(
    "fibre-coherent-dwdm",
    1,
    "Coherent DWDM",
    "SPECTRUM",
    "Drive many colours of light down a strand nobody has to re-lay.",
    "+10% reach across every room you hold, rented or owned",
    6e6,
    4e6,
    14e6,
    85e3,
    12e4,
    6,
    2,
    1,
    1,
    2,
    "#22d3ee"
  ),
  fibreResearch(
    "fibre-hollow-core",
    2,
    "Hollow-core",
    "AIRLINE",
    "Send the signal through air rather than glass, and arrive sooner.",
    "+10% reach again, on top of Coherent DWDM",
    13e6,
    75e5,
    3e7,
    16e4,
    22e4,
    10,
    3,
    1,
    1,
    3,
    "#38bdf8"
  ),
  fibreResearch(
    "fibre-multi-band",
    3,
    "Multi-band amplified",
    "WIDEBAND",
    "Light the bands the incumbents left dark, and amplify end to end.",
    "+9% reach again, on top of Hollow-core",
    26e6,
    14e6,
    58e6,
    28e4,
    38e4,
    15,
    4,
    2,
    1,
    4,
    "#818cf8"
  ),
  fibreResearch(
    "fibre-photonic-mesh",
    4,
    "Photonic mesh",
    "LIGHTHOUSE",
    "Let the network route itself in light, without asking anyone.",
    "+8% reach again, and the top of the ladder",
    48e6,
    24e6,
    96e6,
    45e4,
    6e5,
    22,
    5,
    2,
    2,
    5,
    "#a78bfa"
  ),
  research("edge-orchestration", "NETWORK_INFRASTRUCTURE", "Network Infrastructure", "Edge Orchestration", "LATTICE R&D", "Prototype traffic control that routes viewers across a national delivery mesh.", "National Traffic Mesh installation blueprint", "Technology Campus \xB7 Edge Grid Complex", "+1M normal and +2M burst streams after construction", "TECHNOLOGY_PROJECT", "delivery_capacity-2", null, null, 75e5, 5e6, 24e6, 15e4, 21e4, 8, 2, 1, 1, 3, "#22d3ee"),
  research("perceptual-compression", "SERVERS_DELIVERY", "Servers and Delivery", "Perceptual Compression", "PRISM R&D", "Test a codec pipeline that spends bandwidth where viewers perceive the difference.", "Premium Codec Pipeline installation blueprint", "An ENCODING rack group", "Higher playback quality at the same bandwidth after deployment", "RACK_GROUP", "playback_quality-2", null, "ENCODING", 6e6, 42e5, 18e6, 12e4, 17e4, 7, 2, 1, 1, 3, "#818cf8"),
  research("immersion-cooling", "COOLING_ENERGY", "Cooling and Energy", "Immersion Cooling", "DEEPBLUE", "Validate non-conductive cooling for high-density private infrastructure.", "Immersion retrofit engineering package", "A commissioned private cage, suite, hall or owned centre", "More cooling headroom and lower weekly energy pressure at that facility", "FACILITY", null, null, null, 9e6, 65e5, 28e6, 95e3, 145e3, 9, 3, 1, 1, 3, "#38bdf8"),
  research("adaptive-startup", "STREAMING_EXPERIENCE", "Streaming Experience", "Adaptive Startup", "FLOW R&D", "Model startup and bitrate behavior across unstable devices and connections.", "Adaptive Playback Engine blueprint", "Technology Campus \xB7 Playback Foundry", "Fewer avoidable playback failures after construction", "TECHNOLOGY_PROJECT", "playback_quality-1", null, null, 35e5, 25e5, 6e6, 55e3, 8e4, 5, 1, 1, 1, 2, "#a78bfa"),
  research("localization-exchange", "STREAMING_EXPERIENCE", "Streaming Experience", "Localization Exchange", "POLYGLOT R&D", "Build a rights-aware operating pipeline for subtitles, dubbing and regional masters.", "Localization Exchange installation blueprint", "Technology Campus \xB7 Content Pipeline Works", "Paid localization jobs can serve researched subtitle and dubbing coverage", "TECHNOLOGY_PROJECT", "content_operations-2", null, null, 8e6, 4e6, 16e6, 1e5, 14e4, 8, 2, 1, 1, 3, "#fbbf24"),
  research("global-publishing-orchestrator", "STREAMING_EXPERIENCE", "Streaming Experience", "Global Publishing Orchestrator", "WORLDLINE R&D", "Coordinate dubbing, subtitles and rights-aware masters across synchronized regional launches.", "Global Publishing Orchestrator installation blueprint", "Technology Campus \xB7 Content Pipeline Works", "Dubs and subtitles can be commissioned for researched multi-region launches", "TECHNOLOGY_PROJECT", "content_operations-3", null, null, 18e6, 9e6, 44e6, 22e4, 3e5, 14, 3, 1, 1, 4, "#fb923c"),
  research("kids-mode", "PLATFORM_PRODUCTS", "Platform Products", "Kids Mode", "GARDEN R&D", "Design guardian controls, child profiles and age-aware discovery before product development.", "EMPIRE+ Kids product development", "Product Lab \xB7 Kids line", "Family acquisition and retention effects begin only after product launch", "PRODUCT_LINE", null, "KIDS", null, 5e6, 35e5, 18e6, 0, 85e3, 6, 2, 1, 1, 3, "#fbbf24"),
  research("zero-trust-sessions", "SECURITY_RELIABILITY", "Security and Reliability", "Zero-Trust Sessions", "SENTRY R&D", "Test stricter account and session controls against realistic sign-in traffic.", "Account Trust Gateway blueprint", "A PLATFORM SERVICES rack group", "Account protection improves only after live gateway construction", "RACK_GROUP", "security-1", null, "PLATFORM_SERVICES", 45e5, 32e5, 65e5, 6e4, 9e4, 6, 2, 1, 1, 2, "#fb7185"),
  research("giga-campus", "EXPERIMENTAL_TECHNOLOGY", "Experimental Technology", "Giga Campus", "TITAN", "Prove the land, power and network thesis for a future owned hyperscale campus.", "Giga Campus construction planning for Phase 8", "Future Construction Planning \xB7 no facility is created", "Unlocks a build plan; construction, land and equipment still require separate approval", "CONSTRUCTION_PROGRAM", null, null, null, 35e6, 24e6, 0, 0, 42e4, 18, 4, 2, 2, 0, "#4ade80"),
  { ...research("localization-foundation", "STREAMING_EXPERIENCE", "Streaming Experience", "Localization Foundation", "LINGUA BASE", "Establish language-master governance, vendor QA and rights-safe localization handoffs.", "Localization Foundation operating capability", "Technology Campus \xB7 Content Pipeline Works", "Unlocks independent subtitle and dubbing research paths after installation", "LOCALIZATION_CAPABILITY", null, null, null, 4e6, 24e5, 5e6, 55e3, 75e3, 5, 1, 1, 1, 2, "#fbbf24"), mappedLocalizationCapabilityId: "LOCALIZATION_FOUNDATION" },
  { ...research("subtitle-operations-l1", "STREAMING_EXPERIENCE", "Streaming Experience", "Subtitle Operations I", "SCRIPTLINE I", "Build repeatable subtitle timing, translation and review workflows.", "Subtitle Operations Level 1 capability", "Technology Campus \xB7 Content Pipeline Works", "Enables basic subtitle assets in activated languages", "LOCALIZATION_CAPABILITY", null, null, null, 35e5, 2e6, 45e5, 45e3, 65e3, 4, 1, 1, 1, 2, "#fde047"), mappedLocalizationCapabilityId: "SUBTITLE_OPERATIONS_L1" },
  { ...research("subtitle-operations-l2", "STREAMING_EXPERIENCE", "Streaming Experience", "Subtitle Operations II", "SCRIPTLINE II", "Add specialist review, accessibility conventions and faster multi-title coordination.", "Subtitle Operations Level 2 capability", "Technology Campus \xB7 Content Pipeline Works", "Improves subtitle quality and throughput", "LOCALIZATION_CAPABILITY", null, null, null, 7e6, 4e6, 11e6, 85e3, 115e3, 8, 2, 1, 1, 3, "#facc15"), mappedLocalizationCapabilityId: "SUBTITLE_OPERATIONS_L2" },
  { ...research("subtitle-operations-l3", "STREAMING_EXPERIENCE", "Streaming Experience", "Subtitle Operations III", "SCRIPTLINE III", "Run premium, accessibility-rich subtitle publishing across a global release slate.", "Subtitle Operations Level 3 capability", "Technology Campus \xB7 Content Pipeline Works", "Unlocks premium subtitle quality and high-capacity release support", "LOCALIZATION_CAPABILITY", null, null, null, 15e6, 8e6, 28e6, 175e3, 235e3, 13, 3, 1, 1, 4, "#eab308"), mappedLocalizationCapabilityId: "SUBTITLE_OPERATIONS_L3" },
  { ...research("dubbing-operations-l1", "STREAMING_EXPERIENCE", "Streaming Experience", "Dubbing Operations I", "VOICEHOUSE I", "Establish casting, recording, dialogue adaptation and mix approval for dubbed masters.", "Dubbing Operations Level 1 capability", "Technology Campus \xB7 Content Pipeline Works", "Enables basic dubbed assets in activated languages", "LOCALIZATION_CAPABILITY", null, null, null, 6e6, 35e5, 9e6, 9e4, 125e3, 7, 2, 1, 1, 3, "#fb923c"), mappedLocalizationCapabilityId: "DUBBING_OPERATIONS_L1" },
  { ...research("dubbing-operations-l2", "STREAMING_EXPERIENCE", "Streaming Experience", "Dubbing Operations II", "VOICEHOUSE II", "Coordinate premium voice talent, cultural adaptation and multi-market dub schedules.", "Dubbing Operations Level 2 capability", "Technology Campus \xB7 Content Pipeline Works", "Improves dub quality and production throughput", "LOCALIZATION_CAPABILITY", null, null, null, 14e6, 75e5, 26e6, 19e4, 26e4, 14, 3, 1, 1, 4, "#f97316"), mappedLocalizationCapabilityId: "DUBBING_OPERATIONS_L2" },
  { ...research("dubbing-operations-l3", "STREAMING_EXPERIENCE", "Streaming Experience", "Dubbing Operations III", "VOICEHOUSE III", "Operate premium global dubbing with dense casting, mix and editorial capacity.", "Dubbing Operations Level 3 capability", "Technology Campus \xB7 Content Pipeline Works", "Unlocks premium global dub quality and capacity", "LOCALIZATION_CAPABILITY", null, null, null, 28e6, 15e6, 58e6, 38e4, 51e4, 22, 4, 2, 1, 5, "#ea580c"), mappedLocalizationCapabilityId: "DUBBING_OPERATIONS_L3" },
  { ...research("simultaneous-localization", "STREAMING_EXPERIENCE", "Streaming Experience", "Simultaneous Localization", "DAYBREAK", "Coordinate locked scripts, voice production and subtitle masters for synchronized global premieres.", "Simultaneous Localization capability", "Technology Campus \xB7 Content Pipeline Works", "Reduces localization delay for global event releases", "LOCALIZATION_CAPABILITY", null, null, null, 24e6, 13e6, 46e6, 32e4, 43e4, 20, 4, 1, 1, 5, "#f59e0b"), mappedLocalizationCapabilityId: "SIMULTANEOUS_LOCALIZATION" }
];

// services/platformAi/platformAiOperatingProfiles.ts
var clamp2 = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
var clampPlatformAiEfficiencyPolicy = (value) => ({
  recurringOperationsCostMultiplier: clamp2(value?.recurringOperationsCostMultiplier ?? 0.9, 0.88, 0.95),
  researchCostMultiplier: clamp2(value?.researchCostMultiplier ?? 0.9, 0.8, 0.95),
  installationCostMultiplier: clamp2(value?.installationCostMultiplier ?? 0.9, 0.8, 0.95),
  marketEntryCostMultiplier: clamp2(value?.marketEntryCostMultiplier ?? 0.9, 0.8, 0.95),
  localizationCostMultiplier: clamp2(value?.localizationCostMultiplier ?? 0.9, 0.8, 0.95),
  leadTimeMultiplier: clamp2(value?.leadTimeMultiplier ?? 0.93, 0.85, 1),
  localizationThroughputMultiplier: clamp2(value?.localizationThroughputMultiplier ?? 1.1, 1, 1.2),
  localPartnershipEligible: value?.localPartnershipEligible === true
});
var language = (platformId, languageId, subtitleLevel, dubbingLevel) => ({
  languageId: normalizeStreamingLanguageId(languageId),
  subtitleLevel,
  dubbingLevel,
  source: "HISTORICAL_PROFILE",
  sourceReferenceId: `platform-ai-operating-profile:${platformId}:v1`,
  activatedAtAbsoluteWeek: 0
});
var profile = (platformId, scale, homeCountryIds, startingCountryIds, historicalResearchDefinitionIds, startingLanguageCapabilities, researchOrganizationLevel, expansionAmbition, localizationAmbition, efficiency) => ({
  platformId,
  version: 1,
  scale,
  homeCountryIds: [...homeCountryIds],
  startingCountryIds: [...startingCountryIds],
  historicalResearchDefinitionIds: [...historicalResearchDefinitionIds],
  startingLanguageCapabilities: startingLanguageCapabilities.map((item) => ({ ...item })),
  researchOrganizationLevel: clamp2(researchOrganizationLevel, 1, 10),
  expansionAmbition: clamp2(expansionAmbition, 0, 1),
  localizationAmbition: clamp2(localizationAmbition, 0, 1),
  efficiency: clampPlatformAiEfficiencyPolicy(efficiency)
});
var PLATFORM_AI_OPERATING_PROFILES = {
  NETFLIX: profile(
    "NETFLIX",
    "GLOBAL",
    ["US"],
    ["US", "CA", "MX", "BR", "GB", "DE", "FR", "ES", "IT", "ZA", "IN", "JP", "KR", "AU"],
    ["adaptive-startup", "edge-orchestration", "perceptual-compression", "localization-exchange", "global-publishing-orchestrator", "zero-trust-sessions"],
    [language("NETFLIX", "english", 3, 3), language("NETFLIX", "spanish", 3, 3), language("NETFLIX", "french", 3, 3), language("NETFLIX", "german", 3, 2), language("NETFLIX", "hindi", 3, 3), language("NETFLIX", "japanese", 3, 2), language("NETFLIX", "korean", 3, 2)],
    10,
    0.92,
    0.95,
    { recurringOperationsCostMultiplier: 0.88, researchCostMultiplier: 0.82, installationCostMultiplier: 0.84, marketEntryCostMultiplier: 0.82, localizationCostMultiplier: 0.82, leadTimeMultiplier: 0.86, localizationThroughputMultiplier: 1.18, localPartnershipEligible: true }
  ),
  APPLE_TV: profile(
    "APPLE_TV",
    "GLOBAL",
    ["US"],
    ["US", "CA", "GB", "DE", "FR", "IN", "JP", "KR", "AU"],
    ["adaptive-startup", "perceptual-compression", "localization-exchange", "global-publishing-orchestrator", "zero-trust-sessions"],
    [language("APPLE_TV", "english", 3, 3), language("APPLE_TV", "spanish", 3, 2), language("APPLE_TV", "portuguese", 2, 1), language("APPLE_TV", "french", 3, 2), language("APPLE_TV", "german", 3, 2), language("APPLE_TV", "hindi", 2, 2), language("APPLE_TV", "japanese", 3, 2), language("APPLE_TV", "korean", 3, 2)],
    9,
    0.72,
    0.86,
    { recurringOperationsCostMultiplier: 0.89, researchCostMultiplier: 0.84, installationCostMultiplier: 0.82, marketEntryCostMultiplier: 0.87, localizationCostMultiplier: 0.86, leadTimeMultiplier: 0.85, localizationThroughputMultiplier: 1.15, localPartnershipEligible: true }
  ),
  DISNEY_PLUS: profile(
    "DISNEY_PLUS",
    "GLOBAL",
    ["US"],
    ["US", "CA", "MX", "BR", "GB", "DE", "FR", "IN", "JP", "AU"],
    ["adaptive-startup", "edge-orchestration", "localization-exchange", "global-publishing-orchestrator", "zero-trust-sessions"],
    [language("DISNEY_PLUS", "english", 3, 3), language("DISNEY_PLUS", "spanish", 3, 3), language("DISNEY_PLUS", "french", 3, 3), language("DISNEY_PLUS", "german", 3, 3), language("DISNEY_PLUS", "hindi", 3, 3), language("DISNEY_PLUS", "japanese", 3, 3)],
    9,
    0.78,
    0.96,
    { recurringOperationsCostMultiplier: 0.9, researchCostMultiplier: 0.85, installationCostMultiplier: 0.85, marketEntryCostMultiplier: 0.84, localizationCostMultiplier: 0.8, leadTimeMultiplier: 0.88, localizationThroughputMultiplier: 1.2, localPartnershipEligible: true }
  ),
  HULU: profile(
    "HULU",
    "MATURE",
    ["US"],
    ["US", "JP"],
    ["adaptive-startup", "localization-exchange", "zero-trust-sessions"],
    [language("HULU", "english", 3, 2), language("HULU", "japanese", 2, 1), language("HULU", "spanish", 2, 1)],
    7,
    0.48,
    0.62,
    { recurringOperationsCostMultiplier: 0.94, researchCostMultiplier: 0.93, installationCostMultiplier: 0.94, marketEntryCostMultiplier: 0.95, localizationCostMultiplier: 0.93, leadTimeMultiplier: 0.95, localizationThroughputMultiplier: 1.06, localPartnershipEligible: true }
  ),
  YOUTUBE: profile(
    "YOUTUBE",
    "GLOBAL",
    ["US"],
    STREAMING_DAY_ONE_MARKETS.map((market) => market.id),
    ["adaptive-startup", "edge-orchestration", "perceptual-compression", "localization-exchange", "global-publishing-orchestrator", "zero-trust-sessions"],
    [language("YOUTUBE", "english", 3, 2), language("YOUTUBE", "spanish", 3, 2), language("YOUTUBE", "french", 3, 2), language("YOUTUBE", "german", 3, 2), language("YOUTUBE", "hindi", 3, 2), language("YOUTUBE", "japanese", 3, 2), language("YOUTUBE", "korean", 3, 2), language("YOUTUBE", "portuguese", 3, 2)],
    10,
    0.9,
    0.84,
    { recurringOperationsCostMultiplier: 0.88, researchCostMultiplier: 0.8, installationCostMultiplier: 0.8, marketEntryCostMultiplier: 0.8, localizationCostMultiplier: 0.86, leadTimeMultiplier: 0.85, localizationThroughputMultiplier: 1.16, localPartnershipEligible: true }
  )
};
var validateProfiles = () => {
  const validCountries = new Set(STREAMING_DAY_ONE_MARKETS.map((market) => market.id));
  const validResearch = new Set(STREAMING_RESEARCH_DEFINITIONS.map((definition2) => definition2.id));
  for (const [platformId, value] of Object.entries(PLATFORM_AI_OPERATING_PROFILES)) {
    const duplicateCountries = new Set(value.startingCountryIds).size !== value.startingCountryIds.length;
    const duplicateLanguages = new Set(value.startingLanguageCapabilities.map((item) => item.languageId)).size !== value.startingLanguageCapabilities.length;
    if (value.platformId !== platformId || duplicateCountries || duplicateLanguages) {
      throw new Error(`Invalid Platform AI operating profile identity for ${platformId}.`);
    }
    if (!value.homeCountryIds.every((id) => value.startingCountryIds.includes(id))) {
      throw new Error(`${platformId} home countries must be active at game start.`);
    }
    if (!value.startingCountryIds.every((id) => validCountries.has(id))) {
      throw new Error(`${platformId} references an unknown starting country.`);
    }
    if (!value.historicalResearchDefinitionIds.every((id) => validResearch.has(id))) {
      throw new Error(`${platformId} references an unknown historical research definition.`);
    }
  }
};
validateProfiles();

// services/streamingTechnologyCampus.ts
var benefit = (partial) => ({
  baselineConcurrentStreamsDelta: 0,
  burstConcurrentStreamsDelta: 0,
  reliabilityDelta: 0,
  playbackQualityDelta: 0,
  recommendationDelta: 0,
  securityDelta: 0,
  contentOperationsDelta: 0,
  ...partial
});
var definition = (branch, tier, title, codename, description, targetLevel, baseCapitalCost, baseWeeklyOperatingCost, baseConstructionWeeks, staffRequired, projectBenefit, benefitSummary, risk, riskNote, baseTechnicalDebt) => ({
  id: `${branch.toLowerCase()}-${tier}`,
  branch,
  tier,
  title,
  codename,
  description,
  targetLevel,
  baseCapitalCost,
  baseWeeklyOperatingCost,
  baseConstructionWeeks,
  staffRequired,
  benefit: benefit(projectBenefit),
  benefitSummary,
  risk,
  riskNote,
  baseTechnicalDebt,
  prerequisiteId: tier > 1 ? `${branch.toLowerCase()}-${tier - 1}` : null,
  ctoRequired: tier >= 3
});
var STREAMING_TECHNOLOGY_DEFINITIONS = [
  definition("DELIVERY_CAPACITY", 1, "Regional Edge Pods", "NEARLINE", "Deploy compact caching clusters near the first audience footprint.", 15, 8e6, 9e4, 2, 6, { baselineConcurrentStreamsDelta: 25e4, burstConcurrentStreamsDelta: 5e5 }, "+250K normal and +500K burst streams", "LOW", "A conservative edge rollout with limited vendor lock-in.", 1),
  definition("DELIVERY_CAPACITY", 2, "National Traffic Mesh", "LATTICE", "Route demand across redundant national points of presence.", 30, 24e6, 24e4, 3, 10, { baselineConcurrentStreamsDelta: 1e6, burstConcurrentStreamsDelta: 2e6 }, "+1M normal and +2M burst streams", "MODERATE", "Routing complexity raises coordination overhead.", 3),
  definition("DELIVERY_CAPACITY", 3, "Multi-Region Edge Fabric", "CONSTELLATION", "Bind regional clusters into one elastic delivery fabric.", 50, 68e6, 62e4, 5, 18, { baselineConcurrentStreamsDelta: 3e6, burstConcurrentStreamsDelta: 6e6 }, "+3M normal and +6M burst streams", "MODERATE", "A failed traffic policy can amplify a regional overload.", 5),
  definition("DELIVERY_CAPACITY", 4, "Orbital Relay Backbone", "HORIZON", "Prototype a globally synchronized relay and edge network.", 75, 155e6, 145e4, 7, 28, { baselineConcurrentStreamsDelta: 8e6, burstConcurrentStreamsDelta: 16e6 }, "+8M normal and +16M burst streams", "HIGH", "Frontier network orchestration carries meaningful technical debt.", 9),
  definition("PLAYBACK_QUALITY", 1, "Adaptive Playback Engine", "FLOW", "Tune bitrate ladders for unstable devices and connections.", 12, 6e6, 7e4, 2, 5, { playbackQualityDelta: 12 }, "Fewer avoidable playback failures", "LOW", "Low-risk codec and player tuning.", 1),
  definition("PLAYBACK_QUALITY", 2, "Premium Codec Pipeline", "PRISM", "Introduce higher-efficiency picture and sound masters.", 25, 18e6, 19e4, 3, 9, { playbackQualityDelta: 13 }, "Higher playback quality at the same bandwidth", "MODERATE", "Older devices need a larger compatibility matrix.", 2),
  definition("PLAYBACK_QUALITY", 3, "Device Resilience Matrix", "MOSAIC", "Continuously certify playback across a wider device universe.", 45, 48e6, 42e4, 4, 16, { playbackQualityDelta: 20 }, "Stronger device compatibility and playback trust", "MODERATE", "Certification breadth can slow emergency player releases.", 3),
  definition("PLAYBACK_QUALITY", 4, "Perceptual Stream Synthesis", "LUCID", "Research scene-aware encoding that spends bits where viewers feel them.", 70, 118e6, 98e4, 6, 24, { playbackQualityDelta: 25 }, "Frontier quality with lower delivery pressure", "HIGH", "An immature model can create visible artifacts in edge cases.", 7),
  definition("RELIABILITY", 1, "Automated Recovery Ring", "GUARDIAN", "Detect common service failures and recover without a war room.", 15, 75e5, 85e3, 2, 6, { reliabilityDelta: 0.03 }, "+0.03 reliability target", "LOW", "Automation is limited to known failure classes.", -1),
  definition("RELIABILITY", 2, "Active-Active Control Plane", "TWINLINE", "Keep two live control paths ready to absorb failure.", 30, 22e6, 26e4, 4, 11, { reliabilityDelta: 0.05 }, "+0.05 reliability target", "MODERATE", "Replication mistakes can reproduce a bad state twice.", -2),
  definition("RELIABILITY", 3, "Chaos Verification Range", "FIREBREAK", "Continuously test failover using contained simulated failures.", 50, 55e6, 51e4, 5, 18, { reliabilityDelta: 0.08 }, "+0.08 reliability and technical-debt reduction", "MODERATE", "Poorly contained exercises can disturb live operations.", -4),
  definition("RELIABILITY", 4, "Self-Healing Service Mesh", "PHOENIX", "Research autonomous diagnosis and progressive recovery.", 75, 132e6, 11e5, 7, 27, { reliabilityDelta: 0.12 }, "+0.12 reliability and major debt reduction", "HIGH", "Incorrect autonomous remediation can obscure a root cause.", -7),
  definition("DATA_RECOMMENDATIONS", 1, "Taste Graph Foundation", "COMPASS", "Build a transparent baseline model from real viewing behavior.", 10, 55e5, 65e3, 2, 5, { recommendationDelta: 10 }, "Better catalog discovery and campaign modeling", "LOW", "Sparse early data limits confidence.", 1),
  definition("DATA_RECOMMENDATIONS", 2, "Contextual Ranking Engine", "MOMENT", "Balance taste, title freshness and viewing context.", 24, 17e6, 18e4, 3, 9, { recommendationDelta: 14 }, "Stronger title targeting and recommendation control", "MODERATE", "Short-term signals can overreact to one breakout week.", 2),
  definition("DATA_RECOMMENDATIONS", 3, "Exploration Intelligence", "SERENDIPITY", "Reserve discovery space for deep-catalog and emerging tastes.", 45, 46e6, 39e4, 4, 15, { recommendationDelta: 21 }, "More effective exploration and long-tail promotion", "MODERATE", "Too much exploration can weaken immediate conversion.", 3),
  definition("DATA_RECOMMENDATIONS", 4, "Causal Audience Engine", "ORACLE", "Research models that separate correlation from campaign effect.", 70, 112e6, 92e4, 6, 23, { recommendationDelta: 25 }, "Highest campaign attribution confidence", "HIGH", "The model is expensive and can still encode bad assumptions.", 6),
  definition("SECURITY", 1, "Account Trust Gateway", "SENTRY", "Harden identity, sessions and suspicious login handling.", 10, 65e5, 8e4, 2, 6, { securityDelta: 10 }, "Stronger account and session protection", "LOW", "Stricter checks can add limited sign-in friction.", 0),
  definition("SECURITY", 2, "Rights Watermark Grid", "TRACE", "Trace premium content copies across delivery paths.", 25, 19e6, 21e4, 3, 10, { securityDelta: 15 }, "Better content-rights enforcement", "MODERATE", "Watermark operations add encoding complexity.", 2),
  definition("SECURITY", 3, "Zero-Trust Operations Fabric", "CITADEL", "Require continuous authorization across internal systems.", 45, 52e6, 45e4, 5, 17, { securityDelta: 20 }, "Lower internal attack surface and stronger evidence", "MODERATE", "Misconfigured policies can block legitimate operators.", 2),
  definition("SECURITY", 4, "Autonomous Threat Observatory", "AEGIS", "Research predictive detection across accounts, content and infrastructure.", 70, 125e6, 105e4, 7, 26, { securityDelta: 25 }, "Frontier defensive intelligence for future crises", "HIGH", "False positives can consume the security organization.", 5),
  definition("CONTENT_OPERATIONS", 1, "Master Ingest Line", "FOUNDRY", "Standardize quality control and publishing packages.", 10, 5e6, 6e4, 2, 5, { contentOperationsDelta: 10 }, "Faster, safer title ingest", "LOW", "Strict templates need disciplined production handoffs.", 0),
  definition("CONTENT_OPERATIONS", 2, "Localization Exchange", "POLYGLOT", "Coordinate subtitles, dubbing and regional master delivery.", 22, 16e6, 17e4, 3, 9, { contentOperationsDelta: 12 }, "Stronger multi-region localization readiness", "MODERATE", "Vendor coordination can create queue pressure.", 1),
  definition("CONTENT_OPERATIONS", 3, "Global Publishing Orchestrator", "WORLDLINE", "Publish synchronized regional packages with rights-aware controls.", 40, 44e6, 38e4, 4, 15, { contentOperationsDelta: 18 }, "Global release operations and fewer manual mistakes", "MODERATE", "A bad policy can delay several regions together.", 2),
  definition("CONTENT_OPERATIONS", 4, "Real-Time Localization Stage", "BABEL", "Research secure near-live adaptation for global events.", 65, 105e6, 86e4, 6, 22, { contentOperationsDelta: 25 }, "Frontier global-event localization capacity", "HIGH", "Speed increases editorial and rights-review pressure.", 6)
];

// services/streamingCompetitiveWorld.ts
var STREAMING_RIVAL_MOVE_COST_MILLIONS_V1 = Object.freeze({
  COUNTER_PROGRAM: 38,
  RIGHTS_OVERBID: 52,
  EXECUTIVE_POACH: 18,
  PRICE_CUT: 64,
  BUNDLE_LAUNCH: 46,
  RESCUE_CANCELLED_SHOW: 34,
  ALLIANCE_SIGNAL: 28,
  REGIONAL_ORIGINAL: 44,
  MARKETING_BLITZ: 31,
  TECH_COPY: 58,
  SABOTAGE_ATTEMPT: 26,
  OUTAGE_EXPLOITATION: 22,
  REGION_EXPANSION: 67,
  REGION_WITHDRAWAL: 4
});
var STREAMING_RIVAL_MOVE_COSTS_BY_VERSION = Object.freeze({
  1: STREAMING_RIVAL_MOVE_COST_MILLIONS_V1
});
var STREAMING_RIVAL_MOVE_COST_MILLIONS = STREAMING_RIVAL_MOVE_COST_MILLIONS_V1;

// services/platformAi/platformAiExternalCommitments.ts
var MOVE_TYPES = new Set(
  Object.keys(STREAMING_RIVAL_MOVE_COST_MILLIONS)
);

// services/industryIntelligence/industryBudgetSuitability.ts
var finite = (value, fallback) => Number.isFinite(value) ? value : fallback;
var bounded = (value) => Math.max(0, Math.min(100, Math.round(value * 10) / 10));
var money = (value) => Math.max(0.1, Math.round(value * 10) / 10);
var createIndustryBudgetSuitability = (input) => {
  const formatScale = input.format === "SERIES" ? 1.4 : input.format === "LIMITED_SERIES" ? 1.18 : 1;
  const genreScale = ["ACTION", "SCI_FI", "SUPERHERO", "FANTASY", "ANIMATION", "ADVENTURE", "MUSICAL"].includes(input.primaryGenre) ? 1.34 : 1;
  const risk = bounded(input.creativeRisk);
  const stars = bounded(input.starPowerTarget);
  const commercial = bounded(input.commercialIntent);
  const moviePlan = input.theatricalPlanning && input.format === "MOVIE";
  const naturalIdeal = moviePlan ? (3 + Math.pow(stars / 100, 2) * 32 + risk * 0.07 + commercial * 0.04) * (genreScale > 1 ? 2.3 : 1) : (6 + stars * 0.72 + risk * 0.18 + commercial * 0.12) * formatScale * genreScale;
  const ceiling = Math.max(5, finite(input.affordabilityCeilingMillions, naturalIdeal));
  const idealHighMillions = money(Math.max(3.1, Math.min(naturalIdeal * 1.18, ceiling)));
  const idealLowMillions = money(Math.max(2.1, Math.min(idealHighMillions - 0.1, idealHighMillions * 0.68)));
  const minimumMillions = money(Math.max(1, Math.min(idealLowMillions - 0.1, idealLowMillions * 0.56)));
  const ambitiousMaximumMillions = money(Math.max(idealHighMillions + 0.1, Math.min(Math.max(ceiling, idealHighMillions * 1.25), idealHighMillions * 1.7)));
  return { minimumMillions, idealLowMillions, idealHighMillions, ambitiousMaximumMillions };
};
var evaluateIndustryBudgetSuitability = (curve, proposedBudgetMillions) => {
  const budget = Math.max(0, finite(proposedBudgetMillions, 0));
  if (budget < curve.minimumMillions) {
    const ratio = budget / Math.max(0.1, curve.minimumMillions);
    return { executionEfficiency: bounded(18 + ratio * 62), qualityBonus: bounded(ratio * 2), downsideRisk: bounded(88 - ratio * 25), band: "UNDERFUNDED" };
  }
  if (budget < curve.idealLowMillions) {
    const ratio = (budget - curve.minimumMillions) / Math.max(0.1, curve.idealLowMillions - curve.minimumMillions);
    return { executionEfficiency: bounded(72 + ratio * 23), qualityBonus: bounded(2 + ratio * 4), downsideRisk: bounded(48 - ratio * 22), band: "VIABLE" };
  }
  if (budget <= curve.idealHighMillions) {
    return { executionEfficiency: 100, qualityBonus: 7, downsideRisk: 20, band: "IDEAL" };
  }
  if (budget <= curve.ambitiousMaximumMillions) {
    const ratio = (budget - curve.idealHighMillions) / Math.max(0.1, curve.ambitiousMaximumMillions - curve.idealHighMillions);
    return { executionEfficiency: bounded(100 - ratio * 4), qualityBonus: bounded(7 + ratio), downsideRisk: bounded(20 + ratio * 25), band: "AMBITIOUS" };
  }
  const excessRatio = Math.min(2, (budget - curve.ambitiousMaximumMillions) / Math.max(0.1, curve.ambitiousMaximumMillions));
  return { executionEfficiency: bounded(94 - excessRatio * 12), qualityBonus: 8, downsideRisk: bounded(52 + excessRatio * 24), band: "EXCESSIVE" };
};

// scripts/audit-industry-budget-suitability-b3.ts
var smallMovie = createIndustryBudgetSuitability({ format: "MOVIE", primaryGenre: "DRAMA", creativeRisk: 35, starPowerTarget: 30, commercialIntent: 45, affordabilityCeilingMillions: 100 });
var largeSeries = createIndustryBudgetSuitability({ format: "SERIES", primaryGenre: "SCI_FI", creativeRisk: 70, starPowerTarget: 85, commercialIntent: 85, affordabilityCeilingMillions: 300 });
var plannedMovie = (genre, stars) => createIndustryBudgetSuitability({
  format: "MOVIE",
  primaryGenre: genre,
  creativeRisk: 35,
  starPowerTarget: stars,
  commercialIntent: 65,
  affordabilityCeilingMillions: 500,
  theatricalPlanning: true
});
var modestDrama = plannedMovie("DRAMA", 30);
var starDrama = plannedMovie("DRAMA", 90);
var effectsFilm = plannedMovie("SCI_FI", 90);
assert.ok(modestDrama.idealHighMillions < 15, "A modest movie is not budgeted like a tentpole");
assert.ok(starDrama.idealHighMillions < 65, "One strong star target does not automatically make every drama a $100M production");
assert.ok(effectsFilm.idealHighMillions > starDrama.idealHighMillions * 1.5, "Effects scope retains real production cost");
for (const curve of [smallMovie, largeSeries]) {
  assert.ok(Number.isFinite(curve.minimumMillions) && curve.minimumMillions > 0);
  assert.ok(curve.minimumMillions < curve.idealLowMillions);
  assert.ok(curve.idealLowMillions <= curve.idealHighMillions);
  assert.ok(curve.idealHighMillions < curve.ambitiousMaximumMillions);
}
assert.ok(largeSeries.idealLowMillions > smallMovie.idealLowMillions, "scale, stars and production load must increase suitable spend");
var under = evaluateIndustryBudgetSuitability(smallMovie, smallMovie.minimumMillions * 0.5);
var ideal = evaluateIndustryBudgetSuitability(smallMovie, (smallMovie.idealLowMillions + smallMovie.idealHighMillions) / 2);
var excess = evaluateIndustryBudgetSuitability(smallMovie, smallMovie.ambitiousMaximumMillions * 1.5);
assert.ok(under.executionEfficiency < 55, "funding below minimum must sharply reduce execution efficiency");
assert.ok(ideal.executionEfficiency >= 95, "the ideal range must be operationally efficient");
assert.ok(excess.executionEfficiency <= ideal.executionEfficiency, "overspending cannot guarantee better execution");
assert.ok(excess.downsideRisk > ideal.downsideRisk, "overspending beyond the ambitious maximum increases downside");
assert.ok(excess.qualityBonus <= 8, "money above the curve has strictly diminishing creative benefit");
console.log("Industry Content B3 budget suitability audit passed.");
