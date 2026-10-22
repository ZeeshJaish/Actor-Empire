import type { Player, Stock, NPCStudioState } from '../types';
import { getStockOutstandingShares, normalizeStockPrice, getInitialStockForStudio, getStockMarketCapCeiling } from './stockLogic';

const ledgerDollars = (millions: unknown): number | undefined => {
    if (typeof millions !== 'number' || !Number.isFinite(millions) || millions < 0) return undefined;
    const dollars = millions * 1_000_000;
    return Number.isSafeInteger(Math.round(dollars * 100)) ? dollars : undefined;
};

/** A listed equity quote is not an appraisal or a source of new cash/debt. */
export const getListedCompanyValuation = (player: Pick<Player, 'world'>, stock: Stock) => {
    const price = normalizeStockPrice(stock, stock.price);
    const outstandingShares = getStockOutstandingShares(stock);
    const equityMarketCap = Math.round(price * 100) * outstandingShares / 100;
    const registerValid = Number.isSafeInteger(stock.outstandingShares ?? outstandingShares)
        && (stock.outstandingShares ?? outstandingShares) === outstandingShares
        && outstandingShares * .01 <= getStockMarketCapCeiling(stock);
    const studio = stock.relatedStudioId ? player.world?.studios?.[stock.relatedStudioId] : undefined;
    const cash = ledgerDollars(studio?.cashReserve);
    const debt = ledgerDollars(studio?.ai?.finance?.debtPrincipalMillions);
    const enterprise = cash !== undefined && debt !== undefined ? equityMarketCap + debt - cash : undefined;
    const enterpriseValue = enterprise !== undefined && Number.isSafeInteger(Math.round(enterprise * 100))
        ? Math.max(0, enterprise) : undefined;
    return {
        price, outstandingShares, equityMarketCap, cash, debt, enterpriseValue, registerValid,
        financialsVerified: registerValid && cash !== undefined && debt !== undefined,
        quoteAdjusted: !Number.isFinite(stock.price) || stock.price !== price,
        originalPrice: stock.price,
    };
};

/** Only unowned listed appraisals follow public-company limits; cash/debt and owned achievements are facts. */
export const boundListedStudioAppraisal = (studio: NPCStudioState, proposedValue: number, absoluteWeek: number): NPCStudioState => {
    if (studio.ai?.controller === 'PLAYER') return { ...studio, valuation: proposedValue };
    const metadata = getInitialStockForStudio(studio.id);
    if (!metadata) return { ...studio, valuation: proposedValue };
    if (!Number.isFinite(studio.valuation) || studio.valuation < 0 || Number.isNaN(proposedValue)) throw new RangeError('INVALID_LISTED_STUDIO_APPRAISAL');
    const ceilingBillions = getStockMarketCapCeiling(metadata) / 1_000_000_000;
    const valuation = Math.max(0, Math.min(ceilingBillions, proposedValue));
    const adjustment = studio.listedValuationAdjustment || (studio.valuation > ceilingBillions || proposedValue > ceilingBillions ? {
        version: 1 as const,
        originalValuationBillions: studio.valuation > ceilingBillions ? studio.valuation : proposedValue,
        firstAdjustedAbsoluteWeek: absoluteWeek,
        ceilingBillions,
    } : undefined);
    return { ...studio, valuation, ...(adjustment ? { listedValuationAdjustment: adjustment } : {}) };
};
