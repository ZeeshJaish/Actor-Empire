import { NPCActor, StudioContract, ContractType, PaymentMode, NPCTier } from '../types';

const TIER_BASE_VALUE: Record<NPCTier, number> = {
    'ICON': 40_000_000,
    'A_LIST': 15_000_000,
    'ESTABLISHED': 4_000_000,
    'RISING': 800_000,
    'INDIE': 150_000,
    'UNKNOWN': 30_000
};

export const calculateNPCAsk = (npc: NPCActor, duration: number): { totalAmount: number, weeklyInstallment: number, maintenanceFee: number } => {
    const tierBase = TIER_BASE_VALUE[npc.tier] || TIER_BASE_VALUE.UNKNOWN;
    const fameFactor = 1 + ((npc.stats?.fame || 0) / 100);
    const talentFactor = 1 + ((npc.stats?.talent || 50) / 100);
    
    // Price per movie decreases slightly for bulk
    const bulkDiscount = Math.max(0.7, 1 - (duration * 0.05));
    const totalAmount = Math.floor(tierBase * fameFactor * talentFactor * duration * bulkDiscount);
    
    // 10% premium for weekly installments, spread over 52 weeks
    const weeklyInstallment = Math.ceil((totalAmount * 1.1) / 52);
    
    // Maintenance fee (0.1% of total deal per week, min $500, max $50k)
    const maintenanceFee = Math.min(50000, Math.max(500, Math.floor(totalAmount * 0.001)));
    
    return { totalAmount, weeklyInstallment, maintenanceFee };
};

type NegotiationProfileId = 'INDEPENDENT' | 'PRESTIGE' | 'MONEY' | 'EGO' | 'BREAKOUT' | 'PROFESSIONAL';

interface NegotiationProfile {
    id: NegotiationProfileId;
    label: string;
    summary: string;
}

export interface TalentOfferEvaluation {
    success: boolean;
    message: string;
    maintenanceFee: number;
    totalContractValue: number;
    acceptanceChance?: number;
    profileLabel?: string;
    offerRatio?: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const getTalentNegotiationProfile = (npc: NPCActor): NegotiationProfile => {
    const traits = new Set(npc.traits || []);

    if (traits.has('DIVA') || traits.has('UNRELIABLE')) {
        return {
            id: 'EGO',
            label: 'Ego Driven',
            summary: 'Needs a premium or a very convincing studio pitch.'
        };
    }

    if (npc.isIndependent && npc.tier !== 'UNKNOWN') {
        return {
            id: 'INDEPENDENT',
            label: 'Independent',
            summary: 'Harder to lock down, especially for long commitments.'
        };
    }

    if (npc.prestigeBias === 'PRESTIGE' || traits.has('METHOD')) {
        return {
            id: 'PRESTIGE',
            label: 'Prestige Driven',
            summary: 'Cares about studio reputation as much as money.'
        };
    }

    if ((npc.tier === 'UNKNOWN' || npc.tier === 'INDIE' || npc.tier === 'RISING') && (npc.potential || 0) >= 80) {
        return {
            id: 'BREAKOUT',
            label: 'Breakout Hungry',
            summary: 'May accept a leaner deal if the opportunity feels real.'
        };
    }

    if (npc.prestigeBias === 'COMMERCIAL' || (npc.netWorth || 0) < 15_000_000) {
        return {
            id: 'MONEY',
            label: 'Money Motivated',
            summary: 'A stronger number can quickly change the mood.'
        };
    }

    return {
        id: 'PROFESSIONAL',
        label: 'Professional',
        summary: 'Usually responds to fair money and reasonable terms.'
    };
};

const getMoneyScore = (offerRatio: number, profile: NegotiationProfile): number => {
    let score = 0;

    if (offerRatio < 0.5) {
        score = offerRatio * 34;
    } else if (offerRatio < 1) {
        score = 17 + ((offerRatio - 0.5) * 72);
    } else if (offerRatio < 2) {
        score = 53 + ((offerRatio - 1) * 24);
    } else if (offerRatio < 5) {
        score = 77 + ((offerRatio - 2) * 6);
    } else {
        score = 96;
    }

    if (profile.id === 'MONEY') score += Math.max(0, offerRatio - 0.75) * 8;
    if (profile.id === 'EGO') score += Math.max(0, offerRatio - 1.25) * 7;
    if (profile.id === 'PRESTIGE' && offerRatio < 1) score -= 8;
    if (profile.id === 'BREAKOUT' && offerRatio >= 0.55) score += 8;

    return score;
};

const buildNegotiationMessage = (
    npc: NPCActor,
    profile: NegotiationProfile,
    success: boolean,
    offerRatio: number,
    paymentMode: PaymentMode,
    offeredAmount: number,
    studioPull: number
) => {
    const amount = `$${offeredAmount.toLocaleString()}${paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}`;

    if (success) {
        if (offerRatio >= 2) {
            return `That number changes things. I accept ${amount}.`;
        }

        if (offerRatio < 0.8) {
            return `I believe in what your studio is building. I will take the chance at ${amount}.`;
        }

        if (profile.id === 'PRESTIGE' && studioPull >= 14) {
            return `The money is fair, and the studio momentum makes it worth it. I am in.`;
        }

        if (profile.id === 'INDEPENDENT') {
            return `I usually stay independent, but this deal makes sense. I accept.`;
        }

        return `I accept your offer of ${amount}. Let's make something great.`;
    }

    if (offerRatio >= 2.5) {
        return `The offer is huge, but the timing and commitment still do not feel right for me.`;
    }

    if (profile.id === 'INDEPENDENT') {
        return `I would consider something shorter or richer, but I am not ready to be locked in like that.`;
    }

    if (profile.id === 'PRESTIGE' && studioPull < 12) {
        return `The money helps, but I am chasing the right project and reputation right now.`;
    }

    if (profile.id === 'EGO') {
        return `For a long-term deal, I need an undeniable number.`;
    }

    if (offerRatio < 0.7) {
        return `That is too far below my market. I cannot take it seriously.`;
    }

    return `It is close, but not enough for me to sign this commitment.`;
};

export const evaluateOffer = (
    npc: NPCActor, 
    duration: number, // movies for MOVIE_DEAL
    offeredAmount: number,
    paymentMode: PaymentMode,
    playerFame: number,
    studioValuation: number
): TalentOfferEvaluation => {
    if (duration > 10) {
        return { success: false, message: "A deal for that many movies is unrealistic. I'm not signing my life away.", maintenanceFee: 0, totalContractValue: 0 };
    }
    if (duration < 1) {
        return { success: false, message: "I need at least a one-movie commitment.", maintenanceFee: 0, totalContractValue: 0 };
    }

    const ask = calculateNPCAsk(npc, duration);
    const baseAsk = paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment;
    const profile = getTalentNegotiationProfile(npc);
    const offerRatio = baseAsk > 0 ? offeredAmount / baseAsk : 0;
    const totalContractValue = paymentMode === 'UPFRONT' ? offeredAmount : offeredAmount * 52;
    const traits = new Set(npc.traits || []);

    const studioPull = clamp((playerFame / 4) + (studioValuation / 50_000_000), 0, 25);
    const opennessScore = clamp(((npc.openness || 35) - 45) * 0.35, -14, 18);
    const durationPenalty = Math.max(0, duration - 1) * (profile.id === 'INDEPENDENT' ? 3.5 : 2.4);
    const moneyScore = getMoneyScore(offerRatio, profile);

    let score = 8 + moneyScore + studioPull + opennessScore - durationPenalty;

    if (profile.id === 'INDEPENDENT') score -= 14;
    if (profile.id === 'PRESTIGE') score += (studioPull * 0.45) - 6;
    if (profile.id === 'EGO') score -= 9;
    if (profile.id === 'BREAKOUT') score += 11;
    if (profile.id === 'PROFESSIONAL') score += offerRatio >= 0.85 ? 7 : 0;

    if (traits.has('EASY_GOING')) score += 7;
    if (traits.has('PROFESSIONAL')) score += 4;
    if (traits.has('WORKAHOLIC') && duration <= 4) score += 4;
    if (traits.has('AMBITIOUS')) score += studioPull >= 10 ? 5 : -3;
    if (traits.has('BOX_OFFICE_POISON')) score += 5;

    if (offerRatio >= 3) score += 10;
    if (offerRatio >= 5) score = Math.max(score, 98);
    if (offeredAmount <= 0) score = 0;

    const acceptanceChance = clamp(score / 100, 0.03, 0.98);
    const success = Math.random() < acceptanceChance;

    return {
        success,
        message: buildNegotiationMessage(npc, profile, success, offerRatio, paymentMode, offeredAmount, studioPull),
        maintenanceFee: ask.maintenanceFee,
        totalContractValue: success ? totalContractValue : 0,
        acceptanceChance,
        profileLabel: profile.label,
        offerRatio
    };
};

export const createContract = (
    npcId: string,
    type: ContractType,
    paymentMode: PaymentMode,
    duration: number,
    totalAmount: number,
    maintenanceFee: number,
    startWeek: number
): StudioContract => {
    const totalInstallments = paymentMode === 'WEEKLY_INSTALLMENTS' ? 52 : 1;

    return {
        id: `contract_${npcId}_${Date.now()}`,
        npcId,
        type,
        paymentMode,
        totalAmount,
        maintenanceFee,
        installmentsPaid: 0,
        totalInstallments,
        moviesRemaining: duration,
        totalMovies: duration,
        startWeek,
        status: 'ACTIVE'
    };
};
