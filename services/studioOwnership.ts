import type { Business, Player } from '../types';
import { getStockOwnershipPercent } from './stockLogic';

const clampPercent = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const isAcquiredStudioAsset = (studio: Business): boolean => (
    studio.type === 'PRODUCTION_HOUSE'
    && (
        studio.studioState?.acquisitionOrigin === 'STUDIO_ACQUISITION'
        || studio.config.productionType === 'Acquired Studio'
    )
);

const getMatchingAcquisitionCase = (player: Player, studio: Business): any => (
    (Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [])
        .find((acquisitionCase: any) => (
            acquisitionCase?.studioId === studio.id
            || acquisitionCase?.closing?.acquiredBusinessId === studio.id
        ))
);

const getStockControlPercent = (player: Player, studio: Business): number | null => {
    const takeover = (player.stockTakeovers || []).find(candidate => (
        candidate.acquiredBusinessId === studio.id
        || candidate.relatedStudioId === studio.id
    ));
    if (takeover) {
        const takeoverStock = (player.stocks || []).find(candidate => (
            candidate.id === takeover.stockId
            || candidate.relatedStudioId === takeover.relatedStudioId
            || candidate.relatedStudioId === studio.id
        ));
        const takeoverHolding = takeoverStock
            ? (player.portfolio || []).find(candidate => candidate.stockId === takeoverStock.id)
            : undefined;
        if (takeoverStock && takeoverHolding) {
            const stockPercent = getStockOwnershipPercent(Math.max(0, takeoverHolding.shares || 0), takeoverStock);
            const negotiatedPercent = (Array.isArray(player.flags?.companyEquityPositions) ? player.flags.companyEquityPositions : [])
                .filter((position: {studioId: string; percent: number}) => (
                    position.studioId === takeover.relatedStudioId
                    || position.studioId === studio.id
                ))
                .reduce((sum: number, position: {percent: number}) => sum + position.percent, 0);
            return clampPercent(stockPercent + negotiatedPercent);
        }
        if (Number.isFinite(takeover.ownershipPercent)) {
            // Imported saves may retain the closing percentage without their old
            // share registry. Keep that percentage rather than treating it as zero.
            return clampPercent(takeover.ownershipPercent);
        }
    }

    const acquisitionCase = getMatchingAcquisitionCase(player, studio);
    if (acquisitionCase?.closing?.outcome !== 'CONTROL') return null;
    const originalStudioId = String(acquisitionCase.studioId || studio.id);
    const stock = (player.stocks || []).find(candidate => (
        candidate.relatedStudioId === originalStudioId
        || candidate.relatedStudioId === studio.id
    ));
    const holding = stock
        ? (player.portfolio || []).find(candidate => candidate.stockId === stock.id)
        : undefined;
    const stockPercent = stock && holding
        ? getStockOwnershipPercent(Math.max(0, holding.shares || 0), stock)
        : 0;
    const negotiatedPercent = (Array.isArray(player.flags?.companyEquityPositions) ? player.flags.companyEquityPositions : [])
        .filter((position: {studioId: string; percent: number}) => position.studioId === originalStudioId || position.studioId === studio.id)
        .reduce((sum: number, position: {percent: number}) => sum + position.percent, 0);
    const livePercent = clampPercent(stockPercent + negotiatedPercent);
    return livePercent >= 50 ? livePercent : 51;
};

export interface StudioEquityFunding { ownerStudioId: string; percent: number }

/** Only completed, unambiguous legacy buyouts establish a corporate holder. */
export const getStudioEquityFunding = (player: Pick<Player, 'businesses' | 'flags'>, studio: Business): StudioEquityFunding[] => {
    const stock = (player as Player).stocks?.find(candidate => candidate.relatedStudioId === studio.id);
    const holding = stock && (player as Player).portfolio?.find(candidate => candidate.stockId === stock.id);
    if (!stock && studio.studioState?.equityFunding) return studio.studioState.equityFunding;
    if (!stock && studio.studioState?.equityOwnerStudioId) return [{ ownerStudioId: studio.studioState.equityOwnerStudioId, percent: 100 }];
    const privatePositions = (Array.isArray(player.flags?.companyEquityPositions) ? player.flags.companyEquityPositions : [])
        .filter((position: { studioId: string }) => position.studioId === studio.id || position.studioId === stock?.relatedStudioId);
    const corporatePrivateFunding = privatePositions.flatMap((position: { percent: number; investedAmount: number; equityFunding?: StudioEquityFunding[]; studioId: string }) => {
        if (position.equityFunding) return position.equityFunding;
        const cases = (Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : []).filter((entry: any) =>
            entry?.status === 'ACQUIRED' && entry.studioId === position.studioId && entry.closing?.outcome === 'MINORITY_STAKE');
        if (cases.length !== 1 || cases[0].closing.funding?.source !== 'STUDIO'
            || Math.abs(Number(cases[0].closing.finalPrice || 0) - position.investedAmount) > 1) return [];
        const ownerStudioId = cases[0].closing.funding.businessId;
        return ownerStudioId && player.businesses.some(business => business.id === ownerStudioId) ? [{ ownerStudioId, percent: position.percent }] : [];
    });
    if (holding?.equityFunding || corporatePrivateFunding.length) {
        return [...(holding?.equityFunding || []).map(allocation => ({ ownerStudioId: allocation.ownerStudioId,
            percent: getStockOwnershipPercent(Math.min(holding!.shares, Math.max(0, allocation.shares)), stock!) })), ...corporatePrivateFunding];
    }
    if (studio.studioState?.equityFunding) return studio.studioState.equityFunding;
    if (studio.studioState?.equityOwnerStudioId) return [{ ownerStudioId: studio.studioState.equityOwnerStudioId, percent: 100 }];
    const cases = (Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [])
        .filter((entry: any) => entry?.status === 'ACQUIRED' && entry.closing?.outcome === 'FULL_BUYOUT'
            && entry.closing?.acquiredBusinessId === studio.id);
    if (cases.length !== 1) return [];
    const closing = cases[0].closing;
    const ownerId = String(closing.funding?.businessId || '');
    return closing.funding?.source === 'STUDIO' && ownerId !== studio.id && player.businesses.some(business => business.id === ownerId)
        ? [{ ownerStudioId: ownerId, percent: 100 }] : [];
};

export const getStudioEquityDescendantIds = (player: Pick<Player, 'businesses' | 'flags'>, studioId: string): string[] => {
    const included = new Set([studioId]);
    let added = true;
    while (added) {
        added = false;
        player.businesses.forEach(business => {
            if (!included.has(business.id) && getStudioEquityFunding(player, business).some(owner => included.has(owner.ownerStudioId))) {
                included.add(business.id); added = true;
            }
        });
    }
    return [...included];
};

export const getStudioHeldEquityPercent = (player: Player, studio: Business): number => (
    isAcquiredStudioAsset(studio) ? getStockControlPercent(player, studio) ?? 100 : 100
);

const resolveBeneficialOwnership = (player: Player, studio: Business, visited: Set<string>): number => {
    if (visited.has(studio.id)) return 0;
    const nextVisited = new Set(visited).add(studio.id);
    const controlledPercent = getStudioHeldEquityPercent(player, studio);
    const funding = getStudioEquityFunding(player, studio);
    let remaining = controlledPercent;
    let beneficialPercent = 0;
    for (const allocation of funding) {
        const percent = Math.min(remaining, clampPercent(allocation.percent));
        remaining -= percent;
        const owner = player.businesses.find(business => business.id === allocation.ownerStudioId);
        if (owner) beneficialPercent += percent * resolveBeneficialOwnership(player, owner, nextVisited) / 100;
    }
    return clampPercent(remaining + beneficialPercent);
};

export const getStudioOwnershipPercent = (player: Player, studio: Business): number => (
    resolveBeneficialOwnership(player, studio, new Set())
);
