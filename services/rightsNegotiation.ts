import {
    OwnedRight,
    OwnedRightDevelopmentChoice,
    RightsCreativeGuarantee,
    RightsDealType,
    RightsNegotiation,
    RightsOpportunity,
    RightsSignal,
    Script,
} from '../types';

export const RIGHTS_NEGOTIATION_MAX_ROUNDS = 3;
export const RIGHTS_OPTION_TERM_WEEKS = 104;
export const RIGHTS_LICENSE_TERM_WEEKS = 156;

const ACTIVE_STATUSES = new Set<RightsNegotiation['status']>([
    'AWAITING_RESPONSE',
    'ACCEPTED',
    'COUNTEROFFER',
    'CREATIVE_GUARANTEE',
    'RIVAL_OFFER',
    'BIDDING_WAR',
    'READY_TO_SIGN',
]);

const hashString = (value: string) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
};

const seededRandom = (seed: number) => {
    let state = seed >>> 0;
    return () => {
        state += 0x6D2B79F5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const roundMoney = (value: number) => {
    const step = value >= 100_000_000 ? 5_000_000 : value >= 10_000_000 ? 1_000_000 : 250_000;
    return Math.max(step, Math.round(value / step) * step);
};

const DEAL_MULTIPLIER: Record<RightsDealType, number> = {
    OPTION: 0.24,
    LICENSE: 0.62,
    BUYOUT: 1,
    CATALOG_PURCHASE: 1,
};

const INVESTIGATION_STATUS = new Set(['REPORT_READY', 'PURSUIT_READY']);

export interface RightsDealQuote {
    available: boolean;
    suggestedOffer: number;
    minimumOffer: number;
    maximumOffer: number;
    expiresAtWeek?: number;
    projectsAllowed?: number;
    label: string;
    description: string;
}

export type RightsOpportunityActionState =
    | 'AVAILABLE'
    | 'PENDING'
    | 'RESPONSE'
    | 'SIGNING'
    | 'COMPLETED'
    | 'CLOSED';

export interface RightsOpportunityAction {
    state: RightsOpportunityActionState;
    label: string;
    negotiation?: RightsNegotiation;
}

export const getRightsOpportunityAction = (
    negotiations: RightsNegotiation[] = [],
    opportunityId: string,
): RightsOpportunityAction => {
    const negotiation = getLatestRightsNegotiation(negotiations, opportunityId);
    if (!negotiation || negotiation.status === 'WITHDRAWN') {
        return { state: 'AVAILABLE', label: 'Acquire' };
    }
    if (negotiation.status === 'AWAITING_RESPONSE') {
        return { state: 'PENDING', label: 'Offer Submitted', negotiation };
    }
    if (negotiation.status === 'READY_TO_SIGN') {
        return { state: 'SIGNING', label: 'Sign Contract', negotiation };
    }
    if (negotiation.status === 'SIGNED') {
        return { state: 'COMPLETED', label: 'Acquired', negotiation };
    }
    if (negotiation.status === 'REJECTED') {
        return { state: 'CLOSED', label: 'Offer Rejected', negotiation };
    }
    return {
        state: 'RESPONSE',
        label: negotiation.status === 'ACCEPTED' ? 'Offer Accepted' : 'Review Response',
        negotiation,
    };
};

export const getRightsDealQuote = (
    opportunity: RightsOpportunity,
    dealType: RightsDealType,
    currentWeek = opportunity.listedAtWeek,
): RightsDealQuote => {
    const catalogOnly = dealType === 'CATALOG_PURCHASE' && opportunity.propertyType !== 'CATALOG';
    const multiplier = DEAL_MULTIPLIER[dealType];
    const suggestedOffer = roundMoney(opportunity.askingPrice * multiplier);
    const common = {
        available: !catalogOnly,
        suggestedOffer,
        minimumOffer: roundMoney(suggestedOffer * 0.55),
        maximumOffer: roundMoney(suggestedOffer * 1.6),
    };
    if (dealType === 'OPTION') {
        return {
            ...common,
            expiresAtWeek: currentWeek + RIGHTS_OPTION_TERM_WEEKS,
            projectsAllowed: 1,
            label: 'Screen Option',
            description: 'Temporary exclusive control to develop one screen project. The seller keeps permanent ownership.',
        };
    }
    if (dealType === 'LICENSE') {
        return {
            ...common,
            expiresAtWeek: currentWeek + RIGHTS_LICENSE_TERM_WEEKS,
            projectsAllowed: opportunity.propertyType === 'CATALOG' ? 4 : 2,
            label: 'Limited License',
            description: 'Temporary permission to make a limited number of screen projects. The seller still owns the IP.',
        };
    }
    if (dealType === 'CATALOG_PURCHASE') {
        return {
            ...common,
            label: 'Catalog Purchase',
            description: 'Permanent ownership of the complete listed package.',
        };
    }
    return {
        ...common,
        label: 'Permanent Buyout',
        description: 'Your studio owns the IP permanently, with no expiry date or project limit.',
    };
};

export const getReservedRightsCapital = (negotiations: RightsNegotiation[] = []) =>
    negotiations.reduce((total, negotiation) => {
        if (!ACTIVE_STATUSES.has(negotiation.status)) return total;
        return total + (negotiation.agreedAmount || negotiation.counterAmount || negotiation.currentOffer || 0);
    }, 0);

export const getActiveRightsNegotiation = (
    negotiations: RightsNegotiation[] = [],
    opportunityId: string,
) => negotiations.find(item => item.opportunityId === opportunityId && ACTIVE_STATUSES.has(item.status));

export const getLatestRightsNegotiation = (
    negotiations: RightsNegotiation[] = [],
    opportunityId: string,
) => [...negotiations].reverse().find(item => item.opportunityId === opportunityId);

export const startRightsNegotiation = (input: {
    opportunity: RightsOpportunity;
    negotiations: RightsNegotiation[];
    dealType: RightsDealType;
    offerAmount: number;
    currentWeek: number;
    studioBalance: number;
    studioPrestige: number;
}): {
    negotiations: RightsNegotiation[];
    negotiation?: RightsNegotiation;
    changed: boolean;
    reason?: 'UNAVAILABLE' | 'DEAL_NOT_AVAILABLE' | 'ACTIVE_NEGOTIATION' | 'INVALID_OFFER' | 'INSUFFICIENT_AVAILABLE_CAPITAL';
} => {
    if (input.opportunity.marketStatus !== 'AVAILABLE' || input.currentWeek >= input.opportunity.expiresAtWeek) {
        return { negotiations: input.negotiations, changed: false, reason: 'UNAVAILABLE' };
    }
    const quote = getRightsDealQuote(input.opportunity, input.dealType, input.currentWeek);
    if (!quote.available) return { negotiations: input.negotiations, changed: false, reason: 'DEAL_NOT_AVAILABLE' };
    const existing = getLatestRightsNegotiation(input.negotiations, input.opportunity.id);
    if (existing && !['WITHDRAWN'].includes(existing.status)) {
        return { negotiations: input.negotiations, changed: false, reason: 'ACTIVE_NEGOTIATION' };
    }
    const amount = roundMoney(input.offerAmount);
    if (!Number.isFinite(amount) || amount < quote.minimumOffer || amount > quote.maximumOffer) {
        return { negotiations: input.negotiations, changed: false, reason: 'INVALID_OFFER' };
    }
    const availableCapital = input.studioBalance - getReservedRightsCapital(input.negotiations);
    if (availableCapital < amount) {
        return { negotiations: input.negotiations, changed: false, reason: 'INSUFFICIENT_AVAILABLE_CAPITAL' };
    }
    const negotiation: RightsNegotiation = {
        id: `rights_deal_${input.opportunity.id}_${input.currentWeek}_${input.dealType.toLowerCase()}`,
        opportunityId: input.opportunity.id,
        opportunityTitle: input.opportunity.title,
        sellerName: input.opportunity.sellerName,
        dealType: input.dealType,
        openingOffer: amount,
        currentOffer: amount,
        askingPrice: quote.suggestedOffer,
        round: 1,
        maxRounds: RIGHTS_NEGOTIATION_MAX_ROUNDS,
        status: 'AWAITING_RESPONSE',
        submittedWeek: input.currentWeek,
        responseDueWeek: input.currentWeek + 1,
        isInvestigated: INVESTIGATION_STATUS.has(input.opportunity.investigationStatus || 'NONE'),
        intelligenceSeed: input.opportunity.intelligenceSeed ^ hashString(`${input.dealType}:${input.currentWeek}`),
    };
    return {
        negotiations: [...input.negotiations, negotiation],
        negotiation,
        changed: true,
    };
};

const rivalWeight: Record<RightsSignal, number> = {
    LOW: 0,
    MEDIUM: 0.08,
    HIGH: 0.18,
    EXTREME: 0.3,
};

const creativeGuaranteeFor = (opportunity: RightsOpportunity): RightsCreativeGuarantee => {
    if (opportunity.archetype === 'PRESTIGE_PROPERTY') {
        return {
            id: 'estate_approval',
            title: 'Estate Approval',
            description: 'The rights holder keeps approval over the lead and final screenplay.',
        };
    }
    if (opportunity.archetype === 'DORMANT_HERO') {
        return {
            id: 'legacy_custodian',
            title: 'Legacy Custodian',
            description: 'A franchise custodian must approve major canon changes.',
        };
    }
    return {
        id: 'creator_consultation',
        title: 'Creator Consultation',
        description: 'The original creator receives consultation rights through production.',
    };
};

const evaluateResponse = (
    negotiation: RightsNegotiation,
    opportunity: RightsOpportunity,
    studioPrestige: number,
): RightsNegotiation => {
    const random = seededRandom(negotiation.intelligenceSeed ^ (negotiation.round * 0x9E3779B9));
    const investigationLeverage = negotiation.isInvestigated ? 0.06 : 0;
    const prestigeLeverage = Math.max(-0.06, Math.min(0.1, (studioPrestige - 45) / 500));
    const asking = Math.max(1, negotiation.askingPrice);
    const offerRatio = negotiation.currentOffer / asking;
    const ownerFloor = 0.88 + (random() * 0.14) + rivalWeight[opportunity.rivalInterest] - investigationLeverage - prestigeLeverage;
    const acceptanceLine = Math.max(0.76, ownerFloor);
    const rivalRoll = random();
    const guaranteeRoll = random();

    if (offerRatio >= Math.max(1.35, acceptanceLine + 0.25)) {
        return {
            ...negotiation,
            status: 'ACCEPTED',
            agreedAmount: negotiation.currentOffer,
            responseSummary: `${opportunity.sellerName} accepted the premium offer without reopening terms.`,
        };
    }

    if (
        guaranteeRoll < 0.22
        && offerRatio >= acceptanceLine - 0.06
        && ['PRESTIGE_PROPERTY', 'DORMANT_HERO', 'VIRAL_STORY'].includes(opportunity.archetype)
    ) {
        return {
            ...negotiation,
            status: 'CREATIVE_GUARANTEE',
            counterAmount: negotiation.currentOffer,
            creativeGuarantee: creativeGuaranteeFor(opportunity),
            responseSummary: `${opportunity.sellerName} will proceed if the studio accepts a creative protection clause.`,
        };
    }

    if (
        ['HIGH', 'EXTREME'].includes(opportunity.rivalInterest)
        && rivalRoll < (opportunity.rivalInterest === 'EXTREME' ? 0.62 : 0.42)
        && offerRatio >= 0.72
    ) {
        const rivalAmount = roundMoney(Math.max(negotiation.currentOffer * 1.08, asking * (0.9 + (random() * 0.18))));
        return {
            ...negotiation,
            status: negotiation.round >= 2 ? 'BIDDING_WAR' : 'RIVAL_OFFER',
            rivalAmount,
            counterAmount: rivalAmount,
            responseSummary: `A rival studio entered at ${rivalAmount.toLocaleString()}. The owner opened a limited bidding round.`,
        };
    }

    if (offerRatio >= acceptanceLine) {
        return {
            ...negotiation,
            status: 'ACCEPTED',
            agreedAmount: negotiation.currentOffer,
            responseSummary: `${opportunity.sellerName} accepted the proposed terms.`,
        };
    }

    if (offerRatio >= 0.62 && negotiation.round < negotiation.maxRounds) {
        const counterAmount = roundMoney(Math.max(negotiation.currentOffer * 1.08, asking * acceptanceLine));
        return {
            ...negotiation,
            status: 'COUNTEROFFER',
            counterAmount,
            responseSummary: `${opportunity.sellerName} remains interested but wants stronger financial terms.`,
        };
    }

    return {
        ...negotiation,
        status: 'REJECTED',
        responseSummary: offerRatio < 0.55
            ? 'The owner considered the offer too far below the IP’s market position.'
            : 'The owner chose another direction after reviewing the studio and offer.',
    };
};

export const advanceRightsNegotiations = (input: {
    negotiations: RightsNegotiation[];
    opportunities: RightsOpportunity[];
    currentWeek: number;
    studioPrestige: number;
}): { negotiations: RightsNegotiation[]; newResponses: RightsNegotiation[] } => {
    const newResponses: RightsNegotiation[] = [];
    const negotiations = input.negotiations.map(negotiation => {
        if (negotiation.status !== 'AWAITING_RESPONSE' || input.currentWeek < negotiation.responseDueWeek) {
            return negotiation;
        }
        const opportunity = input.opportunities.find(item => item.id === negotiation.opportunityId);
        if (!opportunity || opportunity.marketStatus !== 'AVAILABLE') {
            const rejected = {
                ...negotiation,
                status: 'REJECTED' as const,
                responseSummary: 'The IP left the market before terms could be completed.',
            };
            newResponses.push(rejected);
            return rejected;
        }
        const response = evaluateResponse(negotiation, opportunity, input.studioPrestige);
        newResponses.push(response);
        return response;
    });
    return { negotiations, newResponses };
};

export const submitRightsCounter = (input: {
    negotiations: RightsNegotiation[];
    negotiationId: string;
    amount: number;
    currentWeek: number;
    studioBalance: number;
}): {
    negotiations: RightsNegotiation[];
    changed: boolean;
    reason?: 'NOT_FOUND' | 'INVALID_STATE' | 'ROUND_LIMIT' | 'INVALID_OFFER' | 'INSUFFICIENT_AVAILABLE_CAPITAL';
} => {
    const target = input.negotiations.find(item => item.id === input.negotiationId);
    if (!target) return { negotiations: input.negotiations, changed: false, reason: 'NOT_FOUND' };
    if (!['COUNTEROFFER', 'RIVAL_OFFER', 'BIDDING_WAR', 'REJECTED'].includes(target.status)) {
        return { negotiations: input.negotiations, changed: false, reason: 'INVALID_STATE' };
    }
    if (target.round >= target.maxRounds) {
        return { negotiations: input.negotiations, changed: false, reason: 'ROUND_LIMIT' };
    }
    const amount = roundMoney(input.amount);
    if (!Number.isFinite(amount) || amount <= target.currentOffer) {
        return { negotiations: input.negotiations, changed: false, reason: 'INVALID_OFFER' };
    }
    const otherReserved = getReservedRightsCapital(input.negotiations.filter(item => item.id !== target.id));
    if ((input.studioBalance - otherReserved) < amount) {
        return { negotiations: input.negotiations, changed: false, reason: 'INSUFFICIENT_AVAILABLE_CAPITAL' };
    }
    return {
        negotiations: input.negotiations.map(item => item.id === target.id ? {
            ...item,
            currentOffer: amount,
            counterAmount: undefined,
            rivalAmount: undefined,
            round: item.round + 1,
            status: 'AWAITING_RESPONSE',
            submittedWeek: input.currentWeek,
            responseDueWeek: input.currentWeek + 1,
            responseSummary: undefined,
            responseNotifiedAtWeek: undefined,
        } : item),
        changed: true,
    };
};

export const acceptRightsTerms = (
    negotiations: RightsNegotiation[],
    negotiationId: string,
    acceptCreativeGuarantee = true,
): { negotiations: RightsNegotiation[]; changed: boolean; reason?: 'NOT_FOUND' | 'INVALID_STATE' } => {
    const target = negotiations.find(item => item.id === negotiationId);
    if (!target) return { negotiations, changed: false, reason: 'NOT_FOUND' };
    if (!['ACCEPTED', 'COUNTEROFFER', 'CREATIVE_GUARANTEE', 'RIVAL_OFFER', 'BIDDING_WAR'].includes(target.status)) {
        return { negotiations, changed: false, reason: 'INVALID_STATE' };
    }
    const agreedAmount = target.agreedAmount || target.counterAmount || target.rivalAmount || target.currentOffer;
    return {
        negotiations: negotiations.map(item => item.id === target.id ? {
            ...item,
            status: 'READY_TO_SIGN',
            agreedAmount,
            creativeGuarantee: target.status === 'CREATIVE_GUARANTEE' && acceptCreativeGuarantee
                ? target.creativeGuarantee
                : item.creativeGuarantee,
        } : item),
        changed: true,
    };
};

export const withdrawRightsNegotiation = (
    negotiations: RightsNegotiation[],
    negotiationId: string,
): { negotiations: RightsNegotiation[]; changed: boolean; reason?: 'NOT_FOUND' | 'ALREADY_SIGNED' } => {
    const target = negotiations.find(item => item.id === negotiationId);
    if (!target) return { negotiations, changed: false, reason: 'NOT_FOUND' };
    if (target.status === 'SIGNED') return { negotiations, changed: false, reason: 'ALREADY_SIGNED' };
    return {
        negotiations: negotiations.map(item => item.id === target.id ? {
            ...item,
            status: 'WITHDRAWN',
            responseSummary: 'Your studio withdrew from the negotiation.',
        } : item),
        changed: true,
    };
};

export const signRightsAgreement = (input: {
    negotiations: RightsNegotiation[];
    negotiationId: string;
    opportunity: RightsOpportunity;
    currentWeek: number;
    studioBalance: number;
    studioName: string;
}): {
    negotiations: RightsNegotiation[];
    ownedRight?: OwnedRight;
    balance: number;
    changed: boolean;
    reason?: 'NOT_FOUND' | 'NOT_READY' | 'ALREADY_SIGNED' | 'INSUFFICIENT_FUNDS';
} => {
    const target = input.negotiations.find(item => item.id === input.negotiationId);
    if (!target) return { negotiations: input.negotiations, balance: input.studioBalance, changed: false, reason: 'NOT_FOUND' };
    if (target.status === 'SIGNED') {
        return { negotiations: input.negotiations, balance: input.studioBalance, changed: false, reason: 'ALREADY_SIGNED' };
    }
    if (target.status !== 'READY_TO_SIGN') {
        return { negotiations: input.negotiations, balance: input.studioBalance, changed: false, reason: 'NOT_READY' };
    }
    const amount = target.agreedAmount || target.currentOffer;
    if (input.studioBalance < amount) {
        return { negotiations: input.negotiations, balance: input.studioBalance, changed: false, reason: 'INSUFFICIENT_FUNDS' };
    }
    const quote = getRightsDealQuote(input.opportunity, target.dealType, input.currentWeek);
    const ownedRight: OwnedRight = {
        id: `owned_${input.opportunity.id}_${input.currentWeek}`,
        sourceOpportunityId: input.opportunity.id,
        title: input.opportunity.title,
        sellerName: input.opportunity.sellerName,
        propertyType: input.opportunity.propertyType,
        archetype: input.opportunity.archetype,
        primaryGenre: input.opportunity.primaryGenre,
        rarity: input.opportunity.rarity,
        accent: input.opportunity.accent,
        emblemKey: input.opportunity.emblemKey,
        dealType: target.dealType,
        purchasePrice: amount,
        acquiredWeek: input.currentWeek,
        acquiredYear: Math.floor(input.currentWeek / 52) + 1,
        expiresAtWeek: quote.expiresAtWeek,
        projectsAllowed: quote.projectsAllowed,
        projectsUsed: 0,
        creativeGuarantee: target.creativeGuarantee,
        status: 'ACTIVE',
    };
    return {
        negotiations: input.negotiations.map(item => item.id === target.id ? {
            ...item,
            status: 'SIGNED',
            agreedAmount: amount,
            responseSummary: `${input.studioName} completed the acquisition.`,
        } : item),
        ownedRight,
        balance: input.studioBalance - amount,
        changed: true,
    };
};

export type OwnedRightRenewalReason = 'PERMANENT' | 'STUDIO_ORIGINAL' | 'TOO_EARLY' | 'INSUFFICIENT_FUNDS';

export const getOwnedRightRenewalQuote = (input: {
    ownedRight: OwnedRight;
    currentWeek: number;
}): {
    available: boolean;
    cost: number;
    extensionWeeks: number;
    reason?: Exclude<OwnedRightRenewalReason, 'INSUFFICIENT_FUNDS'>;
} => {
    if (input.ownedRight.ownershipSource === 'STUDIO_ORIGINAL') {
        return { available: false, cost: 0, extensionWeeks: 104, reason: 'STUDIO_ORIGINAL' };
    }
    if (input.ownedRight.expiresAtWeek === undefined) {
        return { available: false, cost: 0, extensionWeeks: 104, reason: 'PERMANENT' };
    }
    if (input.ownedRight.expiresAtWeek - input.currentWeek > 26) {
        return { available: false, cost: 0, extensionWeeks: 104, reason: 'TOO_EARLY' };
    }
    return {
        available: true,
        cost: Math.max(1, Math.round(input.ownedRight.purchasePrice * 0.35)),
        extensionWeeks: 104,
    };
};

export const renewOwnedRight = (input: {
    ownedRight: OwnedRight;
    currentWeek: number;
    studioBalance: number;
}): {
    changed: boolean;
    ownedRight: OwnedRight;
    balance: number;
    cost: number;
    reason?: OwnedRightRenewalReason;
} => {
    const quote = getOwnedRightRenewalQuote(input);
    if (!quote.available) {
        return {
            changed: false,
            ownedRight: input.ownedRight,
            balance: input.studioBalance,
            cost: 0,
            reason: quote.reason,
        };
    }
    if (input.studioBalance < quote.cost) {
        return {
            changed: false,
            ownedRight: input.ownedRight,
            balance: input.studioBalance,
            cost: quote.cost,
            reason: 'INSUFFICIENT_FUNDS',
        };
    }
    const extensionBase = Math.max(input.currentWeek, input.ownedRight.expiresAtWeek || input.currentWeek);
    return {
        changed: true,
        ownedRight: {
            ...input.ownedRight,
            expiresAtWeek: extensionBase + quote.extensionWeeks,
            status: 'ACTIVE',
        },
        balance: input.studioBalance - quote.cost,
        cost: quote.cost,
    };
};

export const developOwnedRight = (input: {
    ownedRight: OwnedRight;
    currentWeek: number;
    choice?: OwnedRightDevelopmentChoice;
}): {
    ownedRight?: OwnedRight;
    script?: Script;
    changed: boolean;
    reason?: 'EXPIRED' | 'PROJECT_LIMIT';
} => {
    const expired = input.ownedRight.expiresAtWeek !== undefined
        && input.currentWeek > input.ownedRight.expiresAtWeek;
    if (expired) {
        return {
            ownedRight: { ...input.ownedRight, status: 'EXPIRED' },
            changed: false,
            reason: 'EXPIRED',
        };
    }
    if (
        input.ownedRight.projectsAllowed !== undefined
        && input.ownedRight.projectsUsed >= input.ownedRight.projectsAllowed
    ) {
        return { ownedRight: input.ownedRight, changed: false, reason: 'PROJECT_LIMIT' };
    }
    const projectNumber = input.ownedRight.projectsUsed + 1;
    const choice: OwnedRightDevelopmentChoice = input.choice || {
        format: input.ownedRight.propertyType === 'CATALOG' ? 'SERIES' : 'MOVIE',
        strategy: 'FRESH_ADAPTATION',
    };
    const isReboot = choice.strategy === 'REBOOT';
    const script: Script = {
        id: `rights_script_${input.ownedRight.id}_${projectNumber}`,
        title: projectNumber === 1
            ? `Untitled ${input.ownedRight.title} Project`
            : `Untitled ${input.ownedRight.title} Project ${projectNumber}`,
        genres: [input.ownedRight.primaryGenre],
        status: 'CONCEPT',
        quality: 38,
        options: [],
        writerId: null,
        weeksInDevelopment: 0,
        totalDevelopmentWeeks: 6,
        isOriginal: false,
        projectType: choice.format,
        sourceMaterial: 'ADAPTATION',
        sourceMaterialType: 'SCREENPLAY',
        subjectName: input.ownedRight.title,
        logline: `A new screen project built from the acquired ${input.ownedRight.title} rights.`,
        connectedProjectIntent: isReboot ? 'REBOOT' : 'SOLO',
        tags: [
            'ACQUIRED_RIGHTS',
            input.ownedRight.archetype,
            `OWNED_RIGHT:${input.ownedRight.id}`,
            ...(isReboot ? ['REBOOT'] : []),
        ],
        createdAtWeek: input.currentWeek,
    };
    return {
        ownedRight: {
            ...input.ownedRight,
            projectsUsed: projectNumber,
        },
        script,
        changed: true,
    };
};
