import type { Player } from '../types';
import type { ForbesStudioProfile } from './forbesStudioProfile';
import { getStockOwnershipPercent } from './stockLogic';

export interface CompanyEquityPosition {
    studioId: string;
    percent: number;
    investedAmount: number;
    acquiredWeek?: number;
    acquiredYear?: number;
}

export interface CompanyPosition {
    shares: number;
    stockValue: number;
    stockPercent: number;
    negotiatedPercent: number;
    investedValue: number;
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
            stockPercent: 0,
            negotiatedPercent: 0,
            investedValue: Math.max(0, profile.valuation || 0),
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
    const stockPercent = linkedStock ? getStockOwnershipPercent(shares, linkedStock) : 0;
    const negotiatedPositions = getCompanyEquityPositions(player).filter(position => position.studioId === profile.id);
    const negotiatedPercent = roundPercent(negotiatedPositions.reduce((sum, position) => sum + position.percent, 0));
    const investedValue = negotiatedPositions.reduce((sum, position) => sum + Math.max(0, position.investedAmount || 0), 0);
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
        stockPercent,
        negotiatedPercent,
        investedValue,
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
