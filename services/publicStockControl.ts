import type { Player } from '../types';
import type { ForbesStudioProfile } from './forbesStudioProfile';
import type { AcquisitionCase } from './studioAcquisition';
import { getCompanyPosition } from './companyPosition';
import { getStockOutstandingShares, getStockMarketCapCeiling } from './stockLogic';
import { isStreamingPlatformStudio } from './studioClassification';

export const PUBLIC_CONTROL_PERCENT = 50;
export const getPublicControlReadiness = (player: Player, profile: Pick<ForbesStudioProfile, 'id' | 'isPlayerOwned' | 'acquisitionState'> & Partial<Pick<ForbesStudioProfile, 'name' | 'archetype' | 'valuation' | 'ownershipStructure'>>) => {
    const stock = (player.stocks || []).find(stock => stock.relatedStudioId === profile.id);
    const position = getCompanyPosition(player, { ...profile, valuation: profile.valuation || 0, ownershipStructure: profile.ownershipStructure || '' });
    const outstandingShares = stock ? getStockOutstandingShares(stock) : 0;
    const holdings = (player.portfolio || []).filter(row => row.stockId === stock?.id);
    const holding = holdings[0];
    const rawShares = holding?.shares ?? 0;
    let allocated = 0;
    const fundingValid = holding?.equityFunding === undefined || (Array.isArray(holding.equityFunding)
        && holding.equityFunding.every(row => {
            if (!row || typeof row.ownerStudioId !== 'string' || !row.ownerStudioId.trim()
                || !Number.isSafeInteger(row.shares) || row.shares < 0) return false;
            allocated += row.shares;
            return Number.isSafeInteger(allocated) && allocated <= rawShares;
        }));
    const validRegistry = !!stock && Number.isSafeInteger(stock.outstandingShares ?? outstandingShares)
        && (stock.outstandingShares ?? outstandingShares) === outstandingShares
        && outstandingShares * .01 <= getStockMarketCapCeiling(stock)
        && holdings.length <= 1 && fundingValid
        && Number.isSafeInteger(rawShares) && rawShares >= 0 && rawShares <= outstandingShares;
    // Compare actual rights before the rounded display can turn 49.99999% into control.
    const neededShares = Math.ceil(outstandingShares * Math.max(0, PUBLIC_CONTROL_PERCENT - position.negotiatedPercent) / 100);
    const remainingSharesForControl = Math.max(0, neededShares - rawShares);
    // Whole-percent new tenders must cover actual rights, even when a display
    // rounds a holding one share below a threshold up to that threshold.
    const minimumTenderPercent = validRegistry && outstandingShares > 0
        ? Number((BigInt(remainingSharesForControl) * 100n + BigInt(outstandingShares) - 1n) / BigInt(outstandingShares))
        : PUBLIC_CONTROL_PERCENT;
    const eligible = validRegistry && profile.acquisitionState === 'PUBLICLY_TRADED'
        && !profile.isPlayerOwned && !(player.businesses || []).some(b => b.id === profile.id)
        && !isStreamingPlatformStudio(profile) && rawShares >= neededShares;
    return { eligible, shares: rawShares, outstandingShares, remainingSharesForControl, minimumTenderPercent, ownershipPercent: position.ownershipPercent, additionalPrice: eligible ? 0 : undefined, linkedStockId: stock?.id };
};

export const beginPublicControlTransfer = ({ player, profile }: { player: Player; profile: ForbesStudioProfile }) => {
    if (!getPublicControlReadiness(player, profile).eligible) return { success: false, player, reason: 'CONTROL_NOT_READY' };
    const cases: AcquisitionCase[] = player.flags?.studioAcquisitionCases || [];
    const existing = cases.find(c => c.studioId === profile.id);
    const acquisitionCase: AcquisitionCase = {
        ...(existing || { studioId: profile.id, studioName: profile.name, acquisitionState: profile.acquisitionState,
            publicValuation: profile.valuation, approachedWeek: player.currentWeek, approachedYear: player.age, status: 'DRAFT' as const }),
        publicControlIntent: { kind: 'PUBLIC_MAJORITY', initiatedYear: player.age, initiatedWeek: player.currentWeek },
    };
    return { success: true, player: { ...player, flags: { ...player.flags, studioAcquisitionCases: [...cases.filter(c => c.studioId !== profile.id), acquisitionCase] } }, acquisitionCase };
};
