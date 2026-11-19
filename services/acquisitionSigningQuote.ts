import { getRivalUnpaidBillsDollars } from './studioBank';
import { getListedCompanyValuation } from './stockValuation';
import type { Player } from '../types';
import type { ForbesStudioProfile } from './forbesStudioProfile';
import type { AcquisitionCase, AcquisitionFundingSelection } from './studioAcquisition';
import { getPublicControlReadiness } from './publicStockControl';

const roundMoney = (n: number) => Math.max(0, Math.round(n / 10_000) * 10_000);
/** Accepted contract amounts are settled as agreed, without estimate rounding. */
export const getAcquisitionContractPrice = (acquisitionCase?: AcquisitionCase): number => Math.max(0,
    acquisitionCase?.sellerResponse?.agreedAmount
    ?? acquisitionCase?.sellerResponse?.counterAmount
    ?? acquisitionCase?.offer?.amount
    ?? 0,
);
export interface AcquisitionSigningQuote {
    outcome: 'CONTROL' | 'MINORITY_STAKE' | 'FULL_BUYOUT';
    additionalPrice: number;
    funding: AcquisitionFundingSelection;
    verifiedDebt: number;
    hiddenLiabilities: number;
    expectedAnnualIncome: number;
    ownershipPercent: number;
    inheritedCapital: number;
    equityValue: number;
    sourceVersion: 1;
    quoteKey: string;
    valid: boolean;
    /** B24: the figure that cannot be settled, in words, when valid is false */
    problem?: string;
}
export const buildAcquisitionSigningQuote = ({ player, profile }: { player: Player; profile: Pick<ForbesStudioProfile, 'id'|'name'|'archetype'|'acquisitionState'|'isPlayerOwned'|'valuation'|'debt'|'profitability'> }): AcquisitionSigningQuote => {
    const acquisitionCase = (player.flags?.studioAcquisitionCases || []).find((c: AcquisitionCase) => c.studioId === profile.id) as AcquisitionCase | undefined;
    const readiness = getPublicControlReadiness(player, profile);
    const report = acquisitionCase?.diligence?.report;
    const publicCompany = profile.acquisitionState === 'PUBLICLY_TRADED';
    const minorityOnly = !publicCompany && acquisitionCase?.offer?.type === 'MINORITY';
    const stock = publicCompany ? (player.stocks || []).find(s => s.relatedStudioId === profile.id) : undefined;
    const listed = stock && player.world ? getListedCompanyValuation(player, stock) : undefined;
    const studio = player.world?.studios?.[profile.id];
    const rawDebt = studio?.ai?.finance?.debtPrincipalMillions;
    const validLedgerAmount = (millions: unknown) => typeof millions === 'number' && Number.isFinite(millions)
        && millions >= 0 && Number.isSafeInteger(Math.round(millions * 1_000_000 * 100));
    // Present ledger facts outrank an older unsigned diligence report. Missing legacy
    // fields may use recorded terms; an unsafe known liability must never become zero.
    /* B24 (2026-11-15): cash below zero (cinema costs between the AI's weekly books) is a shortfall the buyer takes on as
       debt (stockValuation), not a reason to refuse the signing */
    const cashValid = validLedgerAmount(Math.abs(Number(studio?.cashReserve)));
    const debtValid = rawDebt === undefined || validLedgerAmount(rawDebt);
    const publicFinancialsValid = !publicCompany || !studio || (cashValid && debtValid);
    const currentDebt = publicCompany && rawDebt !== undefined ? listed?.debt : undefined;
    /* with no debt on its books, the shortfall alone is the debt the buyer takes on */
    const cashShortfall = publicCompany && cashValid && Number(studio?.cashReserve) < 0 ? Math.round(-Number(studio?.cashReserve) * 1_000_000) : 0;
    const inheritedCapital = listed?.cash ?? ('capital' in profile ? Number(profile.capital) : 0);
    const amount = getAcquisitionContractPrice(acquisitionCase);
    const terms = {
        outcome: publicCompany ? 'CONTROL' as const : acquisitionCase?.offer?.type === 'MINORITY' ? 'MINORITY_STAKE' as const : 'FULL_BUYOUT' as const,
        additionalPrice: readiness.eligible ? 0 : amount,
        funding: readiness.eligible ? { source: 'PERSONAL' as const } : acquisitionCase?.offer?.funding || { source: 'PERSONAL' as const },
        verifiedDebt: minorityOnly ? 0 : currentDebt ?? ((report?.verifiedDebt ?? Math.round(Math.max(0, listed?.debt ?? profile.debt) * 100) / 100) + cashShortfall),
        /* 18 Nov 2026 (rival studio debt plan v2): a private studio's unpaid bills from its books (cash below zero), not
           3.5% of its value; a venture's books debt already is its unpaid cash */
        hiddenLiabilities: minorityOnly ? 0 : report?.hiddenLiabilities ?? (publicCompany || studio?.isNpcVenture ? 0 : roundMoney(getRivalUnpaidBillsDollars(studio))),
        expectedAnnualIncome: minorityOnly ? Math.round(Math.max(0, profile.profitability) * (acquisitionCase?.offer?.minorityPercent || 25) / 100)
            : report?.expectedAnnualIncome ?? (publicCompany ? Math.round(Math.max(0, profile.profitability) * 100) / 100 : roundMoney(Math.max(0, profile.profitability, profile.valuation * 0.02))),
        ownershipPercent: readiness.ownershipPercent,
        inheritedCapital,
        equityValue: listed?.equityMarketCap ?? profile.valuation,
        sourceVersion: 1 as const,
    };
    const financialSource = publicCompany ? { cashMillions: studio?.cashReserve, debtMillions: rawDebt } : undefined;
    const settleable = (n: number) => Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n * 100));
    const figures: Array<[string, number]> = [['the price', terms.additionalPrice], ['the verified debt', terms.verifiedDebt],
        ['the hidden liabilities', terms.hiddenLiabilities], ['the expected income', terms.expectedAnnualIncome],
        ['the cash that comes with it', terms.inheritedCapital], ['the equity value', terms.equityValue]];
    const ownerName = profile.name || 'The studio';
    const owner = ownerName.endsWith('s') ? `${ownerName}'` : `${ownerName}'s`;
    /* B24: which figure, in words, so the player (and a report) can say what is wrong */
    const problem = publicCompany && studio && !cashValid ? `${owner} cash reserve (${String(studio.cashReserve)})`
        : publicCompany && studio && !debtValid ? `${owner} debt (${String(rawDebt)})`
            : listed?.registerValid === false ? `${owner} share register`
                : figures.find(([, n]) => !settleable(n))?.[0];
    return { ...terms, quoteKey: JSON.stringify([profile.id, terms, financialSource]), valid: !problem && publicFinancialsValid,
        ...(problem ? { problem } : {}) };
};
