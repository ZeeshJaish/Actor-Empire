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

export const evaluateOffer = (
    npc: NPCActor, 
    duration: number, // movies for MOVIE_DEAL
    offeredAmount: number,
    paymentMode: PaymentMode,
    playerFame: number,
    studioValuation: number
): { success: boolean, message: string, maintenanceFee: number, totalContractValue: number } => {
    
    // Independence check
    if (npc.isIndependent && Math.random() < 0.3 && npc.tier !== 'UNKNOWN') {
        return { success: false, message: "I'm not looking for a long-term commitment right now. I prefer to stay independent.", maintenanceFee: 0, totalContractValue: 0 };
    }

    if (duration > 10) {
        return { success: false, message: "A deal for that many movies is unrealistic. I'm not signing my life away.", maintenanceFee: 0, totalContractValue: 0 };
    }
    if (duration < 1) {
        return { success: false, message: "I need at least a one-movie commitment.", maintenanceFee: 0, totalContractValue: 0 };
    }

    const ask = calculateNPCAsk(npc, duration);
    const baseAsk = paymentMode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment;
    
    // Player fame and studio valuation give a discount (up to 20% combined)
    const fameDiscount = Math.min(0.1, playerFame / 1000); 
    const studioDiscount = Math.min(0.1, studioValuation / 1000000000); 
    
    // Base acceptable is 90% of ask. With max fame/studio, it can go down to 70%.
    const minAcceptable = baseAsk * (0.9 - fameDiscount - studioDiscount);

    const totalContractValue = paymentMode === 'UPFRONT' ? offeredAmount : offeredAmount * 52;

    if (offeredAmount >= minAcceptable) {
        return { 
            success: true, 
            message: `I accept your offer of $${offeredAmount.toLocaleString()}${paymentMode === 'WEEKLY_INSTALLMENTS' ? '/wk' : ''}. Let's make some great movies!`,
            maintenanceFee: ask.maintenanceFee,
            totalContractValue
        };
    } else {
        return { 
            success: false, 
            message: `That's too low. I know my worth.`,
            maintenanceFee: ask.maintenanceFee,
            totalContractValue: 0
        };
    }
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
