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
    const publicFinancialsValid = !publicCompany || !studio
        || (validLedgerAmount(studio.cashReserve) && (rawDebt === undefined || validLedgerAmount(rawDebt)));
    const currentDebt = publicCompany && rawDebt !== undefined ? listed?.debt : undefined;
    const inheritedCapital = listed?.cash ?? ('capital' in profile ? Number(profile.capital) : 0);
    const amount = getAcquisitionContractPrice(acquisitionCase);
    const terms = {
        outcome: publicCompany ? 'CONTROL' as const : acquisitionCase?.offer?.type === 'MINORITY' ? 'MINORITY_STAKE' as const : 'FULL_BUYOUT' as const,
        additionalPrice: readiness.eligible ? 0 : amount,
        funding: readiness.eligible ? { source: 'PERSONAL' as const } : acquisitionCase?.offer?.funding || { source: 'PERSONAL' as const },
        verifiedDebt: minorityOnly ? 0 : currentDebt ?? report?.verifiedDebt ?? Math.round(Math.max(0, listed?.debt ?? profile.debt) * 100) / 100,
        hiddenLiabilities: minorityOnly ? 0 : report?.hiddenLiabilities ?? roundMoney(Math.max(0, profile.valuation) * (publicCompany ? 0 : 0.035)),
        expectedAnnualIncome: minorityOnly ? Math.round(Math.max(0, profile.profitability) * (acquisitionCase?.offer?.minorityPercent || 25) / 100)
            : report?.expectedAnnualIncome ?? (publicCompany ? Math.round(Math.max(0, profile.profitability) * 100) / 100 : roundMoney(Math.max(0, profile.profitability, profile.valuation * 0.02))),
        ownershipPercent: readiness.ownershipPercent,
        inheritedCapital,
        equityValue: listed?.equityMarketCap ?? profile.valuation,
        sourceVersion: 1 as const,
    };
    const financialSource = publicCompany ? { cashMillions: studio?.cashReserve, debtMillions: rawDebt } : undefined;
    return { ...terms, quoteKey: JSON.stringify([profile.id, terms, financialSource]), valid: publicFinancialsValid && listed?.registerValid !== false && [terms.additionalPrice, terms.verifiedDebt, terms.hiddenLiabilities, terms.expectedAnnualIncome, terms.inheritedCapital, terms.equityValue]
        .every(n => Number.isFinite(n) && n >= 0 && Number.isSafeInteger(Math.round(n * 100))) };
};
