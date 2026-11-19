/**
 * The 18 Nov 2026 correction of inherited studio debt (rival studio debt plan v2, qa/2026-11-18-studio-debt/PLAN.md).
 * Runs once on load, behind `flags.acquisitionDebtRepairVersion`.
 *
 * The trigger: an iOS player took control of Warner Bros. and was handed $7,623.6B of debt, with $12.4B of interest
 * a week.
 *
 * Where such a number came from:
 * - Up to 1.0.25 a rival had no books. The debt shown and inherited was a formula: 8–26% of the studio's value, by a
 *   hash of its id (Warner Bros. 19%).
 * - "Hidden liabilities" were also a share of the value. In diligence that share was 2.5–15.5% (×1.7 when distressed);
 *   without diligence it was 3.5%.
 * - The old economy let rival values grow about 5× a game year without a ceiling, so the formula reached trillions.
 *   The 1.0.27 repair bounded the rivals but never the debts players had already taken over.
 *
 * What this repair does, and what it never does:
 * - A debt from a rival's books (1.0.26 on) is kept to the cent.
 * - A formula debt on a legitimate value is kept to the cent. The player signed it and paid a lower price for it.
 * - Only a formula part on a value above what the game allows that company is corrected: the same formula, run on the
 *   allowed value. The limits are the game's own:
 *   - a listed studio: the stock market's ceiling for it (getStockMarketCapCeiling);
 *   - a catalogue studio: its starting value × 3, the stock market's growth multiple for media (in 30-year runs on today's
 *     economy, values grew at most 1.13× private and 1.47× listed);
 *   - a generated venture: the 1.0.27 economy repair's ceiling.
 * - The interest paid on the removed part, and any principal paid down past the corrected amount, go back to the
 *   player. Missed payments caused by the inflated amount are cleared.
 * - Deals still open get their diligence debt figures re-read from the books before the player signs.
 */
import type { Message, Player, Transaction } from '../types';
import { retainBankTransactionHistory } from './bankTransactionHistory';
import { getAbsoluteWeek } from './legacyLogic';
import { getRivalBooksDebtDollars, getRivalUnpaidBillsDollars } from './rivalBooks';
import { getInitialStockForStudio, getStockMarketCapCeiling } from './stockLogic';
import { STUDIO_CATALOG } from './studioLogic';
import { RIVAL_VALUATION_CEILING_BILLIONS } from './worldEconomyRepair';

export const ACQUISITION_DEBT_REPAIR_VERSION = 2;
/** The stock market's growth multiple for media companies (stockLogic MARKET_CAP_GROWTH_MULTIPLE_BY_SECTOR.MEDIA). */
const MEDIA_GROWTH_MULTIPLE = 3;

const roundMoney = (value: number) => Math.max(0, Math.round((Number.isFinite(value) ? value : 0) / 1_000) * 1_000);
const positive = (value: unknown) => Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0);

/* the old formulas' hash (forbesStudioProfile.ts, studioAcquisition.ts) */
const stableHash = (value: string) => Array.from(value).reduce((hash, character) => ((hash * 31) + character.charCodeAt(0)) >>> 0, 2166136261);
const formulaDebtRatio = (studioId: string) => 0.08 + ((stableHash(studioId) % 19) / 100);
const diligenceDebtFactor = (playerId: string, studioId: string) => 0.88 + ((stableHash(`${playerId}:${studioId}:diligence`) % 29) / 100);

/** The most the game lets this company be worth (dollars), or null when it cannot say. */
export const getLegitimateStudioValuation = (player: Pick<Player, 'stocks'>, studioId: string): number | null => {
    const stock = (player.stocks || []).find(item => item.relatedStudioId === studioId) || getInitialStockForStudio(studioId);
    if (stock) {
        const ceiling = getStockMarketCapCeiling(stock);
        return Number.isFinite(ceiling) && ceiling > 0 ? ceiling : null;
    }
    const catalog = (STUDIO_CATALOG as Record<string, { valuation?: number }>)[studioId];
    if (catalog && positive(catalog.valuation) > 0) return positive(catalog.valuation) * 1_000_000_000 * MEDIA_GROWTH_MULTIPLE;
    return RIVAL_VALUATION_CEILING_BILLIONS * 1_000_000_000;
};

/**
 * A verified debt the old formula made: its share of the value matches that studio's formula share, with or without
 * this player's diligence factor. The tolerance covers the value moving between the approach and the signing (about
 * 3% a week in the old economy). A books debt in the old economy was a tiny share of an inflated value and never
 * matches.
 */
const isFormulaVerifiedDebt = (verifiedDebt: number, valuation: number, studioId: string, playerId: string) => {
    if (!(verifiedDebt > 0) || !(valuation > 0)) return false;
    const share = verifiedDebt / valuation;
    const base = formulaDebtRatio(studioId);
    return [base, base * diligenceDebtFactor(playerId, studioId)].some(rate => share >= rate * 0.6 && share <= rate * 1.6);
};

const caseStudioIds = (acquisitionCase: any): string[] => [acquisitionCase?.studioId, acquisitionCase?.closing?.acquiredBusinessId]
    .filter(Boolean).map(String);

const money = (value: number) => {
    const abs = Math.abs(value);
    if (abs >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
    if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${Math.round(value).toLocaleString('en-US')}`;
};

export interface AcquisitionDebtRepairResult {
    player: Player;
    corrected: number;
    refunded: number;
}

export const repairInheritedAcquisitionDebt = (player: Player): AcquisitionDebtRepairResult => {
    if (!player || Number(player.flags?.acquisitionDebtRepairVersion) >= ACQUISITION_DEBT_REPAIR_VERSION) return { player, corrected: 0, refunded: 0 };
    const cases: any[] = Array.isArray(player.flags?.studioAcquisitionCases) ? player.flags.studioAcquisitionCases : [];
    const ledger: any[] = Array.isArray(player.flags?.acquisitionDebtLedger) ? player.flags.acquisitionDebtLedger : [];
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    let corrected = 0;
    let refunded = 0;
    const letters: Message[] = [];

    const nextLedger = ledger.map(entry => {
        /* new Bank loans (from 18 Nov 2026) and history markers are already truthful */
        if (!entry || entry.repayment || entry.closureReason || entry.repair) return entry;
        const acquisitionCase = cases.find(item => item?.status === 'ACQUIRED' && item?.closing && caseStudioIds(item).includes(String(entry.studioId)));
        if (!acquisitionCase) return entry;
        const signedValuation = positive(acquisitionCase.publicValuation);
        const legitimateValuation = getLegitimateStudioValuation(player, String(acquisitionCase.studioId));
        if (!signedValuation || !legitimateValuation || signedValuation <= legitimateValuation) return entry;

        const verifiedDebt = positive(acquisitionCase.closing.verifiedDebt);
        const hiddenLiabilities = positive(acquisitionCase.closing.hiddenLiabilities);
        const formulaPart = (isFormulaVerifiedDebt(verifiedDebt, signedValuation, String(acquisitionCase.studioId), String(player.id)) ? verifiedDebt : 0) + hiddenLiabilities;
        if (formulaPart <= 0) return entry;

        const originalPrincipal = positive(entry.originalPrincipal) || positive(entry.remainingPrincipal);
        const recordScale = originalPrincipal / Math.max(1, verifiedDebt + hiddenLiabilities);
        const removedPrincipal = roundMoney(formulaPart * (1 - legitimateValuation / signedValuation) * recordScale);
        if (removedPrincipal <= 0) return entry;

        const remainingPrincipal = positive(entry.remainingPrincipal);
        const share = Math.min(1, removedPrincipal / Math.max(1, originalPrincipal));
        const refundedInterest = roundMoney(positive(entry.interestPaidToDate) * share);
        const refundedPrincipal = roundMoney(Math.max(0, removedPrincipal - remainingPrincipal));
        const nextRemaining = roundMoney(Math.max(0, remainingPrincipal - removedPrincipal));
        corrected += 1;
        refunded += refundedInterest + refundedPrincipal;

        const studioName = String(entry.studioName || acquisitionCase.studioName || 'your studio');
        letters.push({
            id: `acq_debt_repair_${entry.id}_${absoluteWeek}`,
            sender: 'Studio Finance Desk',
            subject: `${studioName}: inherited debt corrected`,
            text: `The debt ${studioName} came with was worked out from a value the old game let run far past what the company could be worth (${money(signedValuation)}). `
                + `Worked out again on the value the game allows it (${money(legitimateValuation)}), the debt is ${money(nextRemaining)} instead of ${money(remainingPrincipal)}. `
                + (refundedInterest + refundedPrincipal > 0 ? `${money(refundedInterest + refundedPrincipal)} you paid on the removed part is back in your account. ` : '')
                + `From now on ${studioName} pays its own loan from its treasury.`,
            type: 'TEXT',
            isRead: false,
            weekSent: player.currentWeek,
        } as Message);

        return {
            ...entry,
            originalPrincipal: roundMoney(originalPrincipal - removedPrincipal),
            remainingPrincipal: nextRemaining,
            interestPaidToDate: roundMoney(positive(entry.interestPaidToDate) - refundedInterest),
            missedServiceAmount: roundMoney(positive(entry.missedServiceAmount) * (1 - share)),
            missedPayments: 0,
            status: nextRemaining > 0 ? 'ACTIVE' : 'PAID_OFF',
            repair: {
                version: ACQUISITION_DEBT_REPAIR_VERSION,
                absoluteWeek,
                signedValuation,
                legitimateValuation,
                previousOriginalPrincipal: originalPrincipal,
                previousRemainingPrincipal: remainingPrincipal,
                removedPrincipal,
                refundedInterest,
                refundedPrincipal,
            },
        };
    });

    /* open deals: re-read the debt a buyer would take on from the books (old diligence reports hold formula numbers) */
    const nextCases = cases.map(acquisitionCase => {
        const report = acquisitionCase?.diligence?.report;
        if (!report || acquisitionCase.status === 'ACQUIRED' || acquisitionCase.acquisitionState === 'PUBLICLY_TRADED') return acquisitionCase;
        const books = player.world?.studios?.[acquisitionCase.studioId];
        if (!books || books.isNpcVenture) return acquisitionCase;
        return {
            ...acquisitionCase,
            diligence: {
                ...acquisitionCase.diligence,
                report: {
                    ...report,
                    verifiedDebt: roundMoney(getRivalBooksDebtDollars(books)),
                    hiddenLiabilities: roundMoney(getRivalUnpaidBillsDollars(books)),
                },
            },
        };
    });

    let nextPlayer: Player = {
        ...player,
        flags: {
            ...player.flags,
            acquisitionDebtLedger: nextLedger,
            studioAcquisitionCases: nextCases,
            acquisitionDebtRepairVersion: ACQUISITION_DEBT_REPAIR_VERSION,
        },
        ...(letters.length ? { inbox: [...letters, ...(player.inbox || [])] } : {}),
    };
    if (refunded > 0) {
        const transaction: Transaction = {
            id: `tx_acq_debt_repair_${absoluteWeek}`,
            week: player.currentWeek,
            year: player.age,
            amount: Math.trunc(refunded),
            category: 'LOAN',
            cashFlowType: 'FINANCING',
            description: 'Inherited debt correction refund',
        };
        nextPlayer = {
            ...nextPlayer,
            money: Math.max(0, Math.trunc(nextPlayer.money || 0)) + Math.trunc(refunded),
            finance: {
                ...nextPlayer.finance,
                history: retainBankTransactionHistory([transaction, ...(nextPlayer.finance?.history || [])]),
            },
        };
    }
    return { player: nextPlayer, corrected, refunded };
};
