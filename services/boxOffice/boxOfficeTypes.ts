import type { Genre, ProjectType, RoleType } from '../../types';

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
    titles: readonly CinemaTitleInput[];
    cohorts: readonly CinemaExposureCohort[];
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
