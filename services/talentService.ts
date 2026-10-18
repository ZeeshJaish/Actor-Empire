import { GameLanguage, NPCActor, StudioContract, ContractType, PaymentMode, NPCTier } from '../types';
import { t } from './i18n';

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

export const getTalentNegotiationProfile = (npc: NPCActor, language: GameLanguage = 'en'): NegotiationProfile => {
    const traits = new Set(npc.traits || []);

    if (traits.has('DIVA') || traits.has('UNRELIABLE')) {
        return {
            id: 'EGO',
            label: t(language, 'services.talentService.profile.EGO.label'),
            summary: t(language, 'services.talentService.profile.EGO.summary')
        };
    }

    if (npc.isIndependent && npc.tier !== 'UNKNOWN') {
        return {
            id: 'INDEPENDENT',
            label: t(language, 'services.talentService.profile.INDEPENDENT.label'),
            summary: t(language, 'services.talentService.profile.INDEPENDENT.summary')
        };
    }

    if (npc.prestigeBias === 'PRESTIGE' || traits.has('METHOD')) {
        return {
            id: 'PRESTIGE',
            label: t(language, 'services.talentService.profile.PRESTIGE.label'),
            summary: t(language, 'services.talentService.profile.PRESTIGE.summary')
        };
    }

    if ((npc.tier === 'UNKNOWN' || npc.tier === 'INDIE' || npc.tier === 'RISING') && (npc.potential || 0) >= 80) {
        return {
            id: 'BREAKOUT',
            label: t(language, 'services.talentService.profile.BREAKOUT.label'),
            summary: t(language, 'services.talentService.profile.BREAKOUT.summary')
        };
    }

    if (npc.prestigeBias === 'COMMERCIAL' || (npc.netWorth || 0) < 15_000_000) {
        return {
            id: 'MONEY',
            label: t(language, 'services.talentService.profile.MONEY.label'),
            summary: t(language, 'services.talentService.profile.MONEY.summary')
        };
    }

    return {
        id: 'PROFESSIONAL',
        label: t(language, 'services.talentService.profile.PROFESSIONAL.label'),
        summary: t(language, 'services.talentService.profile.PROFESSIONAL.summary')
    };
};

/** Internal model only; negotiation UI deliberately does not expose odds. */
export const evaluateOffer = (
    npc: NPCActor,
    duration: number,
    offeredAmount: number,
    paymentMode: PaymentMode,
    playerFame: number,
    studioValuation: number,
    language: GameLanguage = 'en',
    context: { studioPrestige?: number; roll?: number } = {},
): TalentOfferEvaluation => {
    if (!Number.isInteger(duration) || duration < 1 || duration > 10 || !Number.isSafeInteger(offeredAmount) || offeredAmount <= 0
        || !['UPFRONT', 'WEEKLY_INSTALLMENTS'].includes(paymentMode) || !Number.isSafeInteger(offeredAmount * (paymentMode === 'UPFRONT' ? 1 : 52))) {
        return { success: false, message: 'Enter a positive whole-dollar offer and a commitment of 1–10 movies.', maintenanceFee: 0, totalContractValue: 0, acceptanceChance: 0 };
    }
    const ask = calculateNPCAsk(npc, duration);
    const baseAsk = paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment;
    const offerRatio = offeredAmount / baseAsk;
    const profile = getTalentNegotiationProfile(npc, language);
    const anchors = [[0.5, 0], [0.75, 0.12], [1, 0.70], [1.1, 0.85], [1.25, 0.95], [1.5, 1]];
    let chance = 0;
    for (let i = 1; i < anchors.length; i++) {
        const [lowRatio, lowChance] = anchors[i - 1];
        const [highRatio, highChance] = anchors[i];
        if (offerRatio >= lowRatio) chance = lowChance + (highChance - lowChance) * clamp((offerRatio - lowRatio) / (highRatio - lowRatio), 0, 1);
    }
    const prestige = clamp(context.studioPrestige || 0, 0, 100) / 100;
    const studioPull = clamp(playerFame / 100, 0, 1) * 0.03 + clamp(studioValuation / 2_000_000_000, 0, 1) * 0.02;
    const personality = profile.id === 'INDEPENDENT' || profile.id === 'EGO' ? -0.06 : profile.id === 'BREAKOUT' ? 0.04 : 0;
    // Prestige has the strongest influence on a modest below-ask discount.
    // Fade modifiers toward the guarantee so increasing money never lowers odds.
    const modifier = prestige * (profile.id === 'PRESTIGE' ? 0.16 : 0.12) + studioPull + personality;
    chance += modifier * clamp((offerRatio - 0.5) * 2, 0, 1) * clamp((1.5 - offerRatio) * 2, 0, 1);
    const acceptanceChance = offerRatio >= 1.5 ? 1 : offerRatio <= 0.5 ? 0 : clamp(chance, 0, 0.99);
    const success = acceptanceChance === 1 || (context.roll ?? Math.random()) < acceptanceChance;
    const rejection = offerRatio < 1
        ? 'The offer is below this deal’s asking price. Raise the offer or reduce the number of movies; a stronger studio reputation can help secure a discount.'
        : 'The artist has declined these terms. Raise the offer or reduce the movie commitment before trying again.';
    return {
        success,
        message: success ? t(language, 'services.talentService.negotiation.standardAccept', { amount: `$${offeredAmount.toLocaleString()}${paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}` }) : rejection,
        maintenanceFee: ask.maintenanceFee,
        totalContractValue: success ? offeredAmount * (paymentMode === 'UPFRONT' ? 1 : 52) : 0,
        acceptanceChance, profileLabel: profile.label, offerRatio,
    };
};

/** Explicit ICON tier shared by the actual single-film offer and actor listings. */
export const calculateActorRoleSalary = (actor: Pick<NPCActor, 'tier' | 'stats'>, roleType: string, closeness = 0): number => {
    const bases: Record<NPCTier, number> = { ICON: 40_000_000, A_LIST: 20_000_000, ESTABLISHED: 8_000_000, RISING: 2_000_000, INDIE: 100_000, UNKNOWN: 100_000 };
    const roleMultiplier = ({ SUPPORTING: 0.4, CAMEO: 0.15, EXTRA: 0.05 } as Record<string, number>)[roleType] ?? 1;
    const discount = closeness > 50 ? Math.min(0.7, (closeness - 50) / 100 + 0.2) : 0;
    return Math.floor(Math.floor((bases[actor.tier] || 100_000) * (0.5 + (actor.stats?.fame || 0) / 100) * roleMultiplier) * (1 - discount));
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
        installmentsPaid: paymentMode === 'UPFRONT' ? 1 : 0,
        amountPaid: paymentMode === 'UPFRONT' ? totalAmount : 0,
        accountingVersion: 1,
        consumedProjectIds: [],
        totalInstallments,
        moviesRemaining: duration,
        totalMovies: duration,
        startWeek,
        status: 'ACTIVE'
    };
};
