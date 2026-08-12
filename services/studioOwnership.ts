import type { Business, Player } from '../types';
import { getCompanyEquityPositions } from './companyPosition';
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
            const negotiatedPercent = getCompanyEquityPositions(player)
                .filter(position => (
                    position.studioId === takeover.relatedStudioId
                    || position.studioId === studio.id
                ))
                .reduce((sum, position) => sum + position.percent, 0);
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
    const negotiatedPercent = getCompanyEquityPositions(player)
        .filter(position => position.studioId === originalStudioId || position.studioId === studio.id)
        .reduce((sum, position) => sum + position.percent, 0);
    const livePercent = clampPercent(stockPercent + negotiatedPercent);
    return livePercent >= 50 ? livePercent : 51;
};

export const getStudioOwnershipPercent = (player: Player, studio: Business): number => {
    if (!isAcquiredStudioAsset(studio)) return 100;
    return getStockControlPercent(player, studio) ?? 100;
};
