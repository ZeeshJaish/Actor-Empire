import type { Transaction } from '../types';

/** Capital moving between owned wallets is not earned income, including legacy saves. */
export const isOperatingBankTransaction = (transaction: Transaction): boolean => {
    if (!Number.isFinite(transaction.amount) || transaction.category === 'LOAN') return false;
    if (transaction.cashFlowType) return transaction.cashFlowType === 'OPERATING';
    // Historical studio transfers/sales predate cashFlowType. Match stable IDs and exact
    // generated descriptions; ordinary external BUSINESS revenue remains bankable.
    if (/^(studio_treasury_tx_|tx_studio_sale_|tx_studio_acquisition_)/.test(transaction.id)) return false;
    if (/ (owner withdrawal|capital injection|sale proceeds)$/i.test(transaction.description)) return false;
    if (/^(Acquisition Debt Paydown|Amortização da Dívida de Aquisição)$/.test(transaction.description)) return false;
    if (transaction.category === 'ASSET') return /^Rental income \(/i.test(transaction.description);
    return true;
};

/** Keep real cashflow independent of repeated moves between capital wallets.
 * Input is newest-first; preserve chronology for the history UI and old saves.
 */
export const retainBankTransactionHistory = (history: Transaction[]): Transaction[] => {
    let operating = 0;
    let capital = 0;
    return history.filter(transaction => isOperatingBankTransaction(transaction) ? operating++ < 200 : capital++ < 40);
};
