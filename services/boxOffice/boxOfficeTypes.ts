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
}

export interface CinemaDeliveryInput {
    estimatedQuality?: number;
    deliveredQuality: number;
    scriptQuality: number;
    directorQuality: number;
    castingStrength: number;
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
