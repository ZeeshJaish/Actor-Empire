import type { BoxOfficeRegionId, CinemaChainId, Genre, ProjectType, RoleType, WorldAudiencePersonaId } from '../../types';

export interface CinemaOwnerRef {
    id: string;
    route: 'PLAYER_STUDIO' | 'ACCEPTED_ROLE' | 'NPC_STUDIO';
}

export interface CinemaCreditedPerson {
    personId: string;
    name: string;
    roleType: RoleType;
    roleWeight: number;
    fame: number;
    stature?: number;
    isPlayer: boolean;
    characterIds: string[];
}

/** Normalized production facts. Audience/market contracts are added with their consumers. */
export interface CinemaTitleInput {
    id: string;
    owner: CinemaOwnerRef;
    projectType: ProjectType;
    genre: Genre;
    budgetCents: number;
    cast: CinemaCreditedPerson[];
    directorId?: string;
    playerCredited: boolean;
    delivery: CinemaDeliveryInput;
    exposure?: CinemaExposureRecord;
    market?: CinemaTitleMarketFacts;
}

export interface CinemaDeliveryInput {
    estimatedQuality?: number;
    deliveredQuality?: number;
    qualityRange?: readonly [number, number];
    scriptQuality: number;
    directorQuality: number;
    castingStrength: number;
}

export type CinemaExposureKind = 'ANNOUNCEMENT' | 'PAID_CAMPAIGN' | 'PROMOTION' | 'LOCAL_DISCOVERY' | 'STREAMING_CHANNEL' | 'LEGACY_ESTIMATE';
export interface CinemaExposureEvent {
    id: string;
    titleId: string;
    absoluteWeek: number;
    kind: CinemaExposureKind;
    channel: string;
    /** Qualified impressions, not unique people or admissions. */
    impressions: number;
    countryIds?: readonly string[];
    paidCostCents?: number;
    actualFootfall?: number;
    accessiblePeople?: number;
    sentiment?: number;
    /** Conservative recognition frozen at a real announcement, never today's growing fame. */
    recognitionShare?: number;
    impressionsEstimated?: boolean;
}
export interface CinemaExposureRecord {
    version: 1;
    attentionPotential: number;
    attentionBasis: 'PACKAGE' | 'LEGACY_ESTIMATE';
    storyAttention?: number;
    musicAttention?: number;
    events: readonly CinemaExposureEvent[];
}
export interface CinemaRecognitionEvidence {
    recognition: number;
    favoriteFraction?: number;
    experiencedPeople?: number;
}
export interface CinemaExposureCohort {
    id: string;
    countryId: string;
    people: number;
    priorAwarePeople?: number;
    actors?: Readonly<Record<string, CinemaRecognitionEvidence>>;
    studioTrust?: { strength: number; experiencedPeople: number };
    market?: CinemaCohortMarketFacts;
}
export interface CinemaStudioRecognition {
    releasedTitleCount: number;
    prestige: number;
    /** Health is deliberately not existing recognition. */
    brandHealth?: number;
}
export interface CinemaExposureInput {
    titleId: string;
    absoluteWeek: number;
    cast: readonly CinemaCreditedPerson[];
    studio: CinemaStudioRecognition;
    storyAttention: number;
    musicAttention: number;
    cohorts: readonly CinemaExposureCohort[];
    events: readonly CinemaExposureEvent[];
    appliedEventIds?: readonly string[];
}
export interface CinemaExposureResult {
    attentionPotential: number;
    awarePeople: number;
    newlyAwarePeople: number;
    cohorts: Array<{ cohortId: string; countryId: string; people: number; awarePeople: number; newlyAwarePeople: number }>;
    sources: Array<{ eventId: string; kind: CinemaExposureKind; qualifiedImpressions: number; newlyAwarePeople: number; estimated: boolean }>;
    appliedEventIds: string[];
    recognitionEstimated: boolean;
}
/** Phase 2 adds exposure/knowledge only; shared supply and market state arrive with their consumers. */
export interface CinemaWeekInput {
    absoluteWeek: number;
    seed: number;
    tuningVersion: number;
    knowledge: 'OBSERVED' | 'FORECAST';
    live?: { clockEpoch:number; sourceSignature:string };
    titles: readonly CinemaTitleInput[];
    cohorts: readonly CinemaExposureCohort[];
    countries?: readonly CinemaCountryFacts[];
    supply?: CinemaSupplyQuote;
    marketState?: CinemaMarketState;
    history?: readonly CinemaViewingEvidence[];
}
export interface CinemaKnownInputs {
    titles: ReadonlyArray<Omit<CinemaTitleInput, 'delivery'> & { delivery: Omit<CinemaDeliveryInput, 'deliveredQuality'> & { qualityRange: readonly [number, number] } }>;
    cohorts: readonly CinemaExposureCohort[];
}

export interface CinemaGrossSplit {
    grossCents: number;
    producerReceiptsCents: number;
    exhibitorReceiptsCents: number;
    distributionDeductionsCents: number;
}
export type CinemaLedgerCategory = 'THEATRICAL_GROSS' | 'PRODUCER_RECEIPTS' | 'STREAMING_RECEIPTS' | 'SOUNDTRACK_RECEIPTS'
    | 'PRODUCTION_COST' | 'MARKETING_COST' | 'BOOKING_COST' | 'LOCALIZATION_COST' | 'INVESTOR_PAYOUT' | 'TALENT_BACKEND' | 'ACTOR_PAY';
export interface CinemaLedger {
    titleId: string;
    entries: ReadonlyArray<{ id: string; category: CinemaLedgerCategory; amountCents: number }>;
}
export interface CinemaFinanceSummary {
    publicGrossCents: number;
    theatricalProducerReceiptsCents: number;
    /** Combined collected producer receipts across theater, streaming and soundtrack. */
    producerReceiptsCents: number;
    netStudioReceiptsCents: number;
    totalPaidCostsCents: number;
    investorPayoutCents: number;
    talentBackendCents: number;
    netProfitCents: number;
    actorEarningsCents: number;
}

/** Phase 3 contracts. Counts are aggregate segments, never individual simulated people. */
export interface CinemaTitleMarketFacts {
    releaseWeek: number;
    runtimeMinutes: number;
    languages: readonly string[];
    countryIds: readonly string[];
    chainIds: readonly CinemaChainId[];
    chainIdsByCountry?: Readonly<Record<string,readonly CinemaChainId[]>>;
    format: 'STANDARD' | 'PREMIUM';
    universeId?: string;
    returningCharacterIds?: readonly string[];
    payoff: number;
    accessibility: number;
    urgency: number;
    /** Only a publicly known window can cause window-specific waiting. */
    streamingWindow?: { platformId: string; countryIds: readonly string[]; absoluteWeek: number; publiclyKnown: boolean };
    streamingWindows?:ReadonlyArray<NonNullable<CinemaTitleMarketFacts['streamingWindow']>>;
}
export interface CinemaCohortMarketFacts {
    eligiblePeople: number;
    /** Participation's cinema-only monthly allocation, integer cents. */
    monthlyCinemaBudgetCents: number;
    weeklyLeisureMinutes: number;
    interest: number;
    priceSensitivity: number;
    persona: WorldAudiencePersonaId;
    languages: readonly string[];
    travelMinutes: number;
}
export interface CinemaCountryFacts {
    id: string;
    regionId: BoxOfficeRegionId;
    population: number;
    cinemaAccess: number;
    purchasingPower: number;
    inflation: number;
    languages: readonly string[];
}
export interface CinemaSeenBand {
    people: number;
    satisfaction: number;
    repeatAdmissions: number;
    lastViewedWeek: number;
}
export interface CinemaAudienceCell {
    cohortId: string;
    awarePeople: number;
    seenBands: CinemaSeenBand[];
    deferredPeople: number;
    lastDiscoveryWeek: number;
    lastChoiceWeek?: number;
    pendingLocalFootfall?: { absoluteWeek: number; otherFilmAdmissions: number };
    lastAppliedLocalFootfallWeek?: number;
    /** Qualified lifetime contacts already spent by this title/cohort's seen audience. */
    discoveryContactsUsed?: number;
}
export interface CinemaTitleAudienceState {
    titleId: string;
    ownerId: string;
    cast: CinemaCreditedPerson[];
    universeId?: string;
    releaseWeek: number;
    appliedExposureIds: string[];
    cells: CinemaAudienceCell[];
}
export interface CinemaViewingEvidence {
    id: string;
    titleId: string;
    ownerId: string;
    cohortId: string;
    people: number;
    satisfaction: number;
    absoluteWeek: number;
    cast: readonly CinemaCreditedPerson[];
    universeId?: string;
    source: 'THEATER' | 'STREAMING_ESTIMATE';
}
export interface CinemaAffinity {
    cohortId: string;
    kind: 'ACTOR' | 'STUDIO' | 'UNIVERSE';
    id: string;
    people: number;
    strength: number;
    lastWeek: number;
}
export interface CinemaRunState {
    titleId: string;
    poolId: string;
    quietWeeks: number;
    closed: boolean;
}
export interface CinemaMarketState {
    schemaVersion: 1;
    tuningVersion: number;
    lastProcessedAbsoluteWeek: number;
    cohortPopulations?: Readonly<Record<string, number>>;
    titles: CinemaTitleAudienceState[];
    affinities: CinemaAffinity[];
    runs: CinemaRunState[];
}
export interface CinemaChoiceRequest {
    kind: 'FIRST' | 'REPEAT' | 'DEFER';
    cohortId: string;
    titleId: string;
    requestedAdmissions: number;
    interestedPeople: number;
    utility: number;
    priceCents: number;
    minutesPerVisit: number;
    awarePeople: number;
    reachableUnseenPeople: number;
    repeatEligiblePeople: number;
    satisfaction: number;
    attachment: number;
    universeFamiliarity: number;
    discoveryPeople: number;
    localDiscoveryPeople: number;
    reasons: string[];
}
export interface CinemaSupplyPool {
    id: string;
    countryId: string;
    chainId: CinemaChainId;
    format: 'STANDARD' | 'PREMIUM';
    locationId?: string;
    screens: number;
    seatsPerShow: number;
    weeklyScreenMinutes: number;
    ticketPriceCents: number;
    exhibitorBasisPoints: number;
    distributionBasisPoints: number;
    bookingCentsPerShow: number;
}
export interface CinemaSupplyQuote {
    pools: CinemaSupplyPool[];
    offers: Array<{ titleId: string; poolId: string }>;
}
export interface CinemaAdmissionAllocation {
    titleId: string;
    cohortId: string;
    poolId: string;
    kind: 'FIRST' | 'REPEAT';
    admissions: number;
    priceCents: number;
    minutesPerVisit: number;
    satisfaction: number;
}
export interface CinemaCountryResult extends CinemaGrossSplit {
    countryId: string;
    firstAdmissions: number;
    repeatAdmissions: number;
}
export interface CinemaAudienceSignals {
    awarePeople:number; discoveryPeople:number; familiarPeople:number; homeWaitingPeople:number;
    countries:Array<{countryId:string;awarePeople:number;deferredPeople:number}>;
}
export interface CinemaWeekResult {
    absoluteWeek: number;
    tuningVersion: number;
    mode: 'SHADOW' | 'LIVE';
    live?: { clockEpoch:number; sourceSignature:string };
    /** Diagnostic identity, not an authorization or settlement receipt. */
    inputFingerprint: string;
    titles: Array<CinemaGrossSplit & { titleId: string; audienceSignals?:CinemaAudienceSignals; screens?:number; firstAdmissions: number; repeatAdmissions: number; deferredPeople: number; satisfactionScore: number | null; countries: CinemaCountryResult[] }>;
    cohorts: Array<{ cohortId: string; walletCents: number; spentCents: number; unspentCents: number; leisureMinutes: number; usedMinutes: number }>;
    supply: Array<{ poolId: string; shows: number; usedScreenMinutes: number; availableScreenMinutes: number; seats: number; admissions: number }>;
    allocations: CinemaAdmissionAllocation[];
    exhibition?:Array<{titleId:string;poolId:string;shows:number;screens:number}>;
    costEvents: Array<{ id: string; titleId: string; poolId: string; category: 'BOOKING_COST'; amountCents: number }>;
    nextState: CinemaMarketState;
}

/** Versioned live settlement facts. Audience matrices are separate from paid money summaries. */
export type CinemaSettlementBasis = 'UNSETTLED_WEEKLY' | 'LEGACY_ACTIVE' | 'LEGACY_FULLY_SETTLED';
export interface CinemaProjectMarker {
    schemaVersion: 1;
    settlementBasis: CinemaSettlementBasis;
    activationWeek: number;
    audienceBasis: 'TRACKED' | 'LEGACY_ESTIMATE';
}
export interface CinemaSettledTitle {
    audienceSignals?:CinemaAudienceSignals;
    titleId: string;
    ownerId: string;
    basis: CinemaSettlementBasis;
    activationWeek: number;
    legacyGrossCents: number;
    legacyGrossKnown?:boolean;
    legacyProducerReceiptsCents: number | null;
    grossCents: number;
    producerReceiptsCents: number;
    exhibitorReceiptsCents: number;
    distributionDeductionsCents: number;
    bookingCostCents: number;
    investorPaidCents: number;
    talentPaidCents: number;
    actorPaidCents: number;
    firstAdmissions: number;
    repeatAdmissions: number;
    satisfactionScoreUnits?:number;
    satisfactionAdmissions?:number;
    lastSettledWeek: number;
    closed: boolean;
}
export interface CinemaCommittedTitle extends CinemaGrossSplit {
    soundtrackReceiptsCents?:number;
    titleId: string;
    ownerId: string;
    ownerRoute: CinemaOwnerRef['route'];
    firstAdmissions: number;
    repeatAdmissions: number;
    costsCents: number;
    investorPaidCents: number;
    talentPaidCents: number;
    actorPaidCents: number;
    satisfactionScore: number | null;
    closed: boolean;
    screens: number;
}
export interface CinemaCommittedWeek {
    id: string;
    absoluteWeek: number;
    clockEpoch: number;
    inputFingerprint: string;
    /** Exact compact receipt equality, independently of the kernel's diagnostic hash. */
    receiptSignature: string;
    titles: CinemaCommittedTitle[];
}
export interface CinemaSavedState {
    /** Maximum observed weekly viewing homes; a conservative overlap lower bound, not cumulative starts. */
    streamingSeen?:Record<string,{lastWeek:number;countries:Record<string,number>}>;
    /** External investment counterparties have no simulated bank; signed net receivables/payables. */
    externalProducerBalancesCents?:Record<string,number>;
    schemaVersion: 1;
    tuningVersion: number;
    clockEpoch: number;
    activationWeek: number;
    lastProcessedAbsoluteWeek: number;
    market: CinemaMarketState;
    titles: Record<string,CinemaSettledTitle>;
    weeks: CinemaCommittedWeek[];
}
export interface CinemaMigrationResult {
    player: import('../../types').Player;
    status: 'MIGRATED' | 'UNCHANGED' | 'REJECTED';
    diagnostics: Array<{code:string;titleId?:string;estimated?:boolean}>;
}
export interface CinemaCommitResult {
    player: import('../../types').Player;
    applied: boolean;
    receipt?: CinemaCommittedWeek;
}
