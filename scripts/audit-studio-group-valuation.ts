import type { Business, Player } from '../types';
import { INITIAL_PLAYER } from '../types';
import { createDefaultStudioState } from '../services/businessLogic';
import {
    getPlayerBusinessEquityValue,
    getStudioGroupValuation,
    getStudioOwnershipPercent,
} from '../services/studioGroupValuation';
import { getEstimatedNetWorth } from '../services/loanLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = ({
    id,
    name,
    valuation,
    weeklyProfit,
    acquired = false,
}: {
    id: string;
    name: string;
    valuation: number;
    weeklyProfit: number;
    acquired?: boolean;
}): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: 'FILM',
    color: 'bg-amber-500',
    foundedWeek: 1,
    balance: 10_000_000,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
        ...(acquired ? { productionType: 'Acquired Studio' } : {}),
    },
    stats: {
        weeklyRevenue: Math.max(0, weeklyProfit) + 5_000_000,
        weeklyExpenses: Math.max(0, 5_000_000 - weeklyProfit),
        weeklyProfit,
        lifetimeRevenue: valuation,
        valuation,
        brandHealth: 70,
        customerSatisfaction: 70,
        riskLevel: 20,
        hype: 65,
        investorConfidence: 70,
        locations: 1,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
    studioState: {
        ...createDefaultStudioState(1),
        ...(acquired ? {
            acquisitionOrigin: 'STUDIO_ACQUISITION' as const,
            operatingModel: 'CONTROLLED_SUBSIDIARY' as const,
            acquiredWeek: 1,
            acquiredYear: 35,
        } : {}),
    },
});

const parent = makeStudio({
    id: 'hq',
    name: 'Empire Studios',
    valuation: 900_000_000,
    weeklyProfit: 10_000_000,
});
const subsidiary = makeStudio({
    id: 'acquired_studio',
    name: 'Public Pictures',
    valuation: 400_000_000,
    weeklyProfit: 20_000_000,
    acquired: true,
});

const player: Player = {
    ...structuredClone(INITIAL_PLAYER),
    age: 35,
    currentWeek: 20,
    money: 100_000_000,
    businesses: [parent, subsidiary],
    stocks: [{
        id: 'stk_para',
        symbol: 'PPIX',
        name: 'Public Pictures',
        sector: 'MEDIA',
        price: 100,
        outstandingShares: 1_000_000_000,
        publicFloatPercent: 100,
        volatility: 0.04,
        dividendYield: 0,
        relatedStudioId: 'public_studio',
        priceHistory: [100],
        lastDividendPayoutWeek: 0,
    }],
    portfolio: [{
        stockId: 'stk_para',
        shares: 520_000_000,
        averageCost: 90,
        totalInvested: 46_800_000_000,
    }],
    stockTakeovers: [{
        id: 'takeover_public',
        stockId: 'stk_para',
        stockSymbol: 'PPIX',
        companyName: 'Public Pictures',
        relatedStudioId: 'public_studio',
        route: 'CONTROL_TRANSFER',
        status: 'CONTROLLED',
        ownershipPercent: 52,
        alliedSupportPercent: 0,
        effectiveControlPercent: 52,
        supportScore: 80,
        rivalDefenceRisk: 10,
        cost: 0,
        summary: 'Control secured',
        createdWeek: 20,
        createdYear: 35,
        resolvedWeek: 20,
        resolvedYear: 35,
        acquiredBusinessId: subsidiary.id,
    }],
    flags: {
        studioAcquisitionCases: [{
            studioId: 'public_studio',
            studioName: subsidiary.name,
            status: 'ACQUIRED',
            closing: {
                acquiredBusinessId: subsidiary.id,
                finalPrice: 0,
                signedWeek: 20,
                signedYear: 35,
                verifiedDebt: 50_000_000,
                hiddenLiabilities: 0,
                outcome: 'CONTROL',
            },
        }],
        acquisitionDebtLedger: [{
            id: 'acq_debt_public',
            studioId: subsidiary.id,
            studioName: subsidiary.name,
            originalPrincipal: 50_000_000,
            remainingPrincipal: 50_000_000,
            annualInterestRate: 0.10,
            originatedWeek: 20,
            originatedYear: 35,
            source: 'STOCK_CONTROL_TRANSFER',
            status: 'ACTIVE',
            interestPaidToDate: 0,
            missedServiceAmount: 0,
            missedPayments: 0,
        }],
    },
};

const valuation = getStudioGroupValuation(player);
assert(getStudioOwnershipPercent(player, subsidiary) === 52, 'A stock-controlled subsidiary must retain the player’s actual ownership percentage.');
assert(valuation.hqOperatingValue === 900_000_000, 'HQ operations should remain a standalone value.');
assert(valuation.parentHoldingsValue === 208_000_000, 'Parent holdings should include only 52% of the controlled subsidiary.');
assert(valuation.acquisitionDebt === 50_000_000, 'Parent equity should recognize outstanding acquisition debt.');
assert(valuation.parentCompanyValue === 1_058_000_000, 'Parent value should equal HQ operations plus owned stakes minus acquisition debt.');
assert(valuation.groupOperatingValue === 1_300_000_000, 'Combined operations should show 100% of controlled studio operations.');
assert(valuation.minorityInterest === 192_000_000, 'The unowned 48% should be identified as minority interest.');
assert(
    Math.abs(valuation.ownerWeeklyResult - (10_000_000 + 10_400_000 - 96_000)) < 1,
    'Owner weekly result should be ownership-weighted and subtract acquisition interest.',
);

const weakerPlayer: Player = {
    ...player,
    businesses: [
        parent,
        makeStudio({
            id: subsidiary.id,
            name: subsidiary.name,
            valuation: 100_000_000,
            weeklyProfit: -4_000_000,
            acquired: true,
        }),
    ],
};
const weakerValuation = getStudioGroupValuation(weakerPlayer);
assert(
    valuation.parentCompanyValue - weakerValuation.parentCompanyValue === 156_000_000,
    'A subsidiary decline should hit the parent only by the owned 52% share, not the full loss.',
);
assert(
    valuation.groupOperatingValue - weakerValuation.groupOperatingValue === 300_000_000,
    'Combined operations should still reflect the subsidiary’s full standalone decline.',
);

const expectedEquity = valuation.parentCompanyValue;
assert(getPlayerBusinessEquityValue(player) === expectedEquity, 'Business equity must not add the subsidiary twice.');
assert(
    getEstimatedNetWorth(player) === player.money + expectedEquity,
    'Net worth must not count both the controlled studio and the stock holding representing the same ownership.',
);

console.log('Studio group valuation audit passed.');
