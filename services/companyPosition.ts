import type { Player } from '../types';
import type { ForbesStudioProfile } from './forbesStudioProfile';
import { getStockOwnershipPercent } from './stockLogic';

export interface CompanyEquityPosition {
    studioId: string;
    studioName?: string;
    percent: number;
    investedAmount: number;
    acquiredWeek?: number;
    acquiredYear?: number;
    entryCompanyValuation?: number;
    currentCompanyValuation?: number;
    annualProfitEstimate?: number;
    lastReviewAbsoluteWeek?: number;
    lastQuarterChangePercent?: number;
    lastQuarterOutcome?: 'DISTRIBUTION' | 'RETAINED' | 'NO_DISTRIBUTION' | 'VALUE_REVIEW';
    lastQuarterSummary?: string;
    lifetimeDistributions?: number;
    lastDistributionAbsoluteWeek?: number;
    nextExitEligibleAbsoluteWeek?: number;
    exit?: {
        status: 'MARKETING' | 'OFFER_READY';
        percentForSale: number;
        requestedAbsoluteWeek: number;
        offerReadyAbsoluteWeek: number;
        offerExpiresAbsoluteWeek?: number;
        referenceValue?: number;
        liquidityDiscountRate?: number;
        advisoryFee?: number;
        netProceeds?: number;
    };
}

export interface CompanyPosition {
    shares: number;
    stockValue: number;
    /** Cash originally committed to the shares still held. */
    stockCostBasis: number;
    stockPercent: number;
    negotiatedPercent: number;
    investedValue: number;
    privatePositionValue: number;
    privateUnrealizedGain: number;
    privateLifetimeDistributions: number;
    privateLastQuarterChangePercent: number;
    privateLastQuarterOutcome?: CompanyEquityPosition['lastQuarterOutcome'];
    privateLastQuarterSummary?: string;
    privateAcquiredWeek?: number;
    privateAcquiredYear?: number;
    privateNextExitEligibleAbsoluteWeek?: number;
    privateExit?: CompanyEquityPosition['exit'];
    ownershipPercent: number;
    strategicThreshold: 20 | 25 | 30;
    influenceStatus: 'NO_STAKE' | 'FINANCIAL_STAKE' | 'STRATEGIC_STAKE' | 'CONTROLLING_OWNER';
    estimatedAnnualDividend: number;
    linkedStockId?: string;
    linkedStockSymbol?: string;
}

const roundPercent = (value: number) => Math.round(value * 10_000) / 10_000;

export const getCompanyEquityPositions = (player: Pick<Player, 'flags'>): CompanyEquityPosition[] => (
    Array.isArray(player.flags?.companyEquityPositions)
        ? player.flags.companyEquityPositions.filter((position: CompanyEquityPosition) => (
            typeof position?.studioId === 'string'
            && Number.isFinite(position.percent)
            && position.percent > 0
        ))
        : []
);

export const getStrategicStakeThreshold = (
    profile: Pick<ForbesStudioProfile, 'acquisitionState' | 'ownershipStructure'>,
): 20 | 25 | 30 => {
    if (profile.acquisitionState === 'PUBLICLY_TRADED' || /public company|institutional/i.test(profile.ownershipStructure)) {
        return 20;
    }
    if (/founder|family|protected|parent-company/i.test(profile.ownershipStructure)) {
        return 30;
    }
    return 25;
};

export const getCompanyPosition = (
    player: Pick<Player, 'stocks' | 'portfolio' | 'flags'>,
    profile: Pick<ForbesStudioProfile, 'id' | 'isPlayerOwned' | 'valuation' | 'acquisitionState' | 'ownershipStructure'>,
): CompanyPosition => {
    const strategicThreshold = getStrategicStakeThreshold(profile);
    if (profile.isPlayerOwned) {
        return {
            shares: 0,
            stockValue: 0,
            stockCostBasis: 0,
            stockPercent: 0,
            negotiatedPercent: 0,
            investedValue: Math.max(0, profile.valuation || 0),
            privatePositionValue: 0,
            privateUnrealizedGain: 0,
            privateLifetimeDistributions: 0,
            privateLastQuarterChangePercent: 0,
            ownershipPercent: 100,
            strategicThreshold,
            influenceStatus: 'CONTROLLING_OWNER',
            estimatedAnnualDividend: 0,
        };
    }

    const linkedStock = (player.stocks || []).find(stock => stock.relatedStudioId === profile.id);
    const holding = linkedStock
        ? (player.portfolio || []).find(item => item.stockId === linkedStock.id)
        : undefined;
    const shares = Math.max(0, holding?.shares || 0);
    const stockValue = linkedStock ? shares * Math.max(0, linkedStock.price || 0) : 0;
    const stockCostBasis = Math.max(0, holding?.totalInvested ?? (shares * Math.max(0, holding?.averageCost || linkedStock?.price || 0)));
    const stockPercent = linkedStock ? getStockOwnershipPercent(shares, linkedStock) : 0;
    const negotiatedPositions = getCompanyEquityPositions(player).filter(position => position.studioId === profile.id);
    const negotiatedPercent = roundPercent(negotiatedPositions.reduce((sum, position) => sum + position.percent, 0));
    const investedValue = negotiatedPositions.reduce((sum, position) => sum + Math.max(0, position.investedAmount || 0), 0);
    const privatePositionValue = negotiatedPositions.reduce((sum, position) => (
        sum + Math.max(0, Number(position.currentCompanyValuation || profile.valuation || 0)) * (position.percent / 100)
    ), 0);
    const primaryPrivatePosition = negotiatedPositions[0];
    const ownershipPercent = roundPercent(Math.min(100, stockPercent + negotiatedPercent));
    const influenceStatus = ownershipPercent <= 0
        ? 'NO_STAKE'
        : ownershipPercent >= 50
            ? 'CONTROLLING_OWNER'
            : ownershipPercent >= strategicThreshold
                ? 'STRATEGIC_STAKE'
                : 'FINANCIAL_STAKE';

    return {
        shares,
        stockValue,
        stockCostBasis,
        stockPercent,
        negotiatedPercent,
        investedValue,
        privatePositionValue: Math.round(privatePositionValue),
        privateUnrealizedGain: Math.round(privatePositionValue - investedValue),
        privateLifetimeDistributions: negotiatedPositions.reduce((sum, position) => sum + Math.max(0, position.lifetimeDistributions || 0), 0),
        privateLastQuarterChangePercent: Number(primaryPrivatePosition?.lastQuarterChangePercent || 0),
        privateLastQuarterOutcome: primaryPrivatePosition?.lastQuarterOutcome,
        privateLastQuarterSummary: primaryPrivatePosition?.lastQuarterSummary,
        privateAcquiredWeek: primaryPrivatePosition?.acquiredWeek,
        privateAcquiredYear: primaryPrivatePosition?.acquiredYear,
        privateNextExitEligibleAbsoluteWeek: primaryPrivatePosition?.nextExitEligibleAbsoluteWeek,
        privateExit: primaryPrivatePosition?.exit,
        ownershipPercent,
        strategicThreshold,
        influenceStatus,
        estimatedAnnualDividend: linkedStock
            ? Math.round(stockValue * Math.max(0, linkedStock.dividendYield || 0))
            : 0,
        linkedStockId: linkedStock?.id,
        linkedStockSymbol: linkedStock?.symbol,
    };
};
