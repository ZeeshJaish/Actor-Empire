import type { Business, Player, Stock } from '../types';
import { getAcquisitionDebtSummary, getAcquisitionDebtWeeklyDue } from './acquisitionDebt';
import { getStudioGroup } from './studioGroup';
import { getStudioOwnershipPercent } from './studioOwnership';
import { getStudioStandaloneEquityValue } from './studioEquityCash';
import { getStudioCorporatePrivateHoldings } from './companyPosition';

const getStandaloneValue = (business: Business) => business.type === 'PRODUCTION_HOUSE'
    ? getStudioStandaloneEquityValue(business)
    : Math.max(
    0,
    Number(business.stats?.valuation || 0),
    Number(business.balance || 0),
);

const getMatchingAcquisitionCase = (player: Player, studio: Business): any => (
    (Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [])
        .find((acquisitionCase: any) => (
            acquisitionCase?.studioId === studio.id
            || acquisitionCase?.closing?.acquiredBusinessId === studio.id
        ))
);

export { getStudioOwnershipPercent } from './studioOwnership';

export interface StudioHoldingValuation {
    studioId: string;
    studioName: string;
    standaloneValue: number;
    ownershipPercent: number;
    attributableValue: number;
    weeklyResult: number;
    attributableWeeklyResult: number;
}

export interface StudioGroupValuation {
    hqOperatingValue: number;
    parentHoldingsValue: number;
    acquisitionDebt: number;
    parentCompanyValue: number;
    groupOperatingValue: number;
    minorityInterest: number;
    groupCapital: number;
    groupWeeklyResult: number;
    ownerWeeklyResult: number;
    holdings: StudioHoldingValuation[];
}

export const getStudioGroupValuation = (player: Player): StudioGroupValuation => {
    const group = getStudioGroup(player);
    const controlledCompanyIds = new Set(group.allStudios.map(studio => studio.id));
    for (const acquisitionCase of Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : []) {
        if (controlledCompanyIds.has(acquisitionCase?.closing?.acquiredBusinessId)) controlledCompanyIds.add(acquisitionCase.studioId);
    }
    const getStudioValue = (studio: Business) => getStandaloneValue(studio)
        + getStudioCorporatePrivateHoldings(player, studio.id)
            // Controlled operating assets are already valued as group banners.
            .filter(holding => !controlledCompanyIds.has(holding.studioId))
            .reduce((sum, holding) => sum + holding.value, 0);
    const hqOperatingValue = group.parentStudio ? getStudioValue(group.parentStudio) : 0;
    const hqWeeklyResult = Number(group.parentStudio?.stats?.weeklyProfit || 0);
    // Saves can own an acquired studio without a separate founder HQ. The
    // display parent is not necessarily wholly owned by the player.
    const hqOwnershipShare = group.parentStudio ? getStudioOwnershipPercent(player, group.parentStudio) / 100 : 0;
    const hqAttributableValue = hqOperatingValue * hqOwnershipShare;
    const activeSubsidiaries = group.subsidiaries.filter(studio => studio.id !== group.parentStudio?.id);
    const holdings = activeSubsidiaries.map(studio => {
        const standaloneValue = getStudioValue(studio);
        const ownershipPercent = getStudioOwnershipPercent(player, studio);
        const ownershipShare = ownershipPercent / 100;
        const weeklyResult = Number(studio.stats?.weeklyProfit || 0);
        return {
            studioId: studio.id,
            studioName: studio.name,
            standaloneValue,
            ownershipPercent,
            attributableValue: standaloneValue * ownershipShare,
            weeklyResult,
            attributableWeeklyResult: weeklyResult * ownershipShare,
        };
    });
    const parentHoldingsValue = holdings.reduce((sum, holding) => sum + holding.attributableValue, 0);
    const minorityInterest = holdings.reduce(
        (sum, holding) => sum + Math.max(0, holding.standaloneValue - holding.attributableValue),
        Math.max(0, hqOperatingValue - hqAttributableValue),
    );
    const acquisitionDebtSummary = getAcquisitionDebtSummary(player);
    /* 18 Nov 2026 (rival studio debt plan v2): a loan belongs to the studio that owes it and is paid from its treasury,
       so the owner carries it in proportion to the stake they hold in that studio (a merged studio's loan sits with the
       studio it merged into). */
    const shareOf = (studioId: string) => {
        const owing = (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.id === studioId);
        const payerId = owing?.studioState?.mergedIntoStudioId || studioId;
        const payer = (player.businesses || []).find(business => business.type === 'PRODUCTION_HOUSE' && business.id === payerId) || owing;
        return payer ? getStudioOwnershipPercent(player, payer) / 100 : 1;
    };
    const acquisitionDebt = acquisitionDebtSummary.entries.reduce((sum, entry) => sum + entry.remainingPrincipal * shareOf(entry.studioId), 0);
    const ownerDebtPayments = acquisitionDebtSummary.entries.reduce((sum, entry) => sum + getAcquisitionDebtWeeklyDue(entry) * shareOf(entry.studioId), 0);
    const groupWeeklyResult = hqWeeklyResult + holdings.reduce((sum, holding) => sum + holding.weeklyResult, 0);
    const ownerWeeklyResult = (hqWeeklyResult * hqOwnershipShare)
        + holdings.reduce((sum, holding) => sum + holding.attributableWeeklyResult, 0)
        - ownerDebtPayments;

    return {
        hqOperatingValue,
        parentHoldingsValue,
        acquisitionDebt,
        parentCompanyValue: Math.max(0, hqAttributableValue + parentHoldingsValue - acquisitionDebt),
        groupOperatingValue: hqOperatingValue + holdings.reduce((sum, holding) => sum + holding.standaloneValue, 0),
        minorityInterest,
        groupCapital: group.allStudios.reduce((sum, studio) => sum + Number(studio.balance || 0), 0),
        groupWeeklyResult,
        ownerWeeklyResult,
        holdings,
    };
};

export const getPlayerBusinessEquityValue = (player: Player): number => {
    const nonStudioValue = (player.businesses || [])
        .filter(business => business.type !== 'PRODUCTION_HOUSE')
        .reduce((sum, business) => sum + getStandaloneValue(business), 0);
    return nonStudioValue + getStudioGroupValuation(player).parentCompanyValue;
};

export const isStockRepresentedByControlledStudio = (
    player: Player,
    stock: Pick<Stock, 'relatedStudioId'>,
): boolean => {
    if (!stock.relatedStudioId) return false;
    const group = getStudioGroup(player);
    return group.subsidiaries.some(studio => {
        const acquisitionCase = getMatchingAcquisitionCase(player, studio);
        return studio.id === stock.relatedStudioId
            || acquisitionCase?.studioId === stock.relatedStudioId;
    });
};
