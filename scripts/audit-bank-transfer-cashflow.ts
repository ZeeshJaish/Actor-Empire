import { initializeStocks, normalizeStockPrice } from '../services/stockLogic';
import { createBusiness } from '../services/businessLogic';
import { payDownAcquisitionDebt, processAcquisitionDebtService } from '../services/acquisitionDebt';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Transaction } from '../types';
import { retainBankTransactionHistory } from '../services/bankTransactionHistory';
import { issuePersonalLoan, repayPersonalLoan } from '../services/playerBanking';
import { getAverageWeeklyCashFlow, getCreditScore, getAbsoluteBorrowingCeiling, getEstimatedNetWorth } from '../services/loanLogic';

const player = (): Player => {
    const p = structuredClone(INITIAL_PLAYER);
    p.age = 36; p.currentWeek = 20; p.money = 300_000_000;
    p.businesses = []; p.portfolio = []; p.customItems = [];
    p.finance.history = []; p.finance.loans = [];
    return p;
};
const transaction = (p: Player, amount: number, category: Transaction['category'], description: string, id = 'fixture'): Transaction =>
    ({ id, amount, category, description, week: p.currentWeek, year: p.age });
let checks = 0;
const check = (name: string, action: () => void) => { action(); checks++; console.log(`PASS ${name}`); };
check('withdraw/reinject capital cannot manufacture operating income or a credit upgrade', () => {
    const p = player(); const baseline = getAverageWeeklyCashFlow(p); const score = getCreditScore(p); const cap = getAbsoluteBorrowingCeiling(p);
    for (let i = 0; i < 12; i++) p.finance.history.unshift(
        transaction(p, 100_000_000, 'BUSINESS', 'Anushka Studios owner withdrawal', `studio_treasury_tx_${i}`),
        transaction(p, -100_000_000, 'ASSET', 'Anushka Studios capital injection', `studio_treasury_tx_inject_${i}`),
    );
    assert.deepEqual(getAverageWeeklyCashFlow(p), baseline);
    assert.equal(getCreditScore(p), score); assert.equal(getAbsoluteBorrowingCeiling(p), cap);
});
check('borrowed principal, repayments and sale proceeds are capital not operating income', () => {
    const p = player();
    p.finance.history = [transaction(p, 100_000_000, 'LOAN', 'Personal loan funded'), transaction(p, -1_000_000, 'LOAN', 'Manual loan payment'), transaction(p, 500_000_000, 'BUSINESS', 'Anushka sale proceeds', 'tx_studio_sale_36_20_1')];
    assert.deepEqual(getAverageWeeklyCashFlow(p), { income: 0, expenses: 0, freeCashFlow: 0 });
});
check('real salary royalties operating revenue and rental income remain bankable', () => {
    const p = player(); p.finance.history = [transaction(p, 2_600_000, 'SALARY', 'Acting salary'), transaction(p, 2_600_000, 'ROYALTY', 'Film royalties'), transaction(p, 2_600_000, 'BUSINESS', 'YouTube ad revenue'), transaction(p, 2_600_000, 'ASSET', 'Rental income (Penthouse)'), transaction(p, -2_600_000, 'EXPENSE', 'Living expenses')];
    assert.deepEqual(getAverageWeeklyCashFlow(p), { income: 400_000, expenses: 100_000, freeCashFlow: 300_000 });
});
check('future and out-of-window entries do not inflate current operating income', () => {
    const p = player(); p.finance.history = [{ ...transaction(p, 1_000_000_000, 'SALARY', 'future'), week: 21 }, { ...transaction(p, 1_000_000_000, 'SALARY', 'old'), year: 35, week: 46 }];
    assert.equal(getAverageWeeklyCashFlow(p).income, 0);
});


check('actual bank funding and repayment conserve principal and never become operating cashflow', () => {
    const p = player(); const issued = issuePersonalLoan(p, 50_000, 26);
    assert.equal(issued.success, true); assert(issued.loan);
    assert.equal(issued.player.money, p.money + 50_000);
    assert.equal(getAverageWeeklyCashFlow(issued.player).income, 0);
    const repaid = repayPersonalLoan(issued.player, issued.loan.id, 'BALANCE');
    assert.equal(repaid.success, true); assert.equal(repaid.player.money, p.money);
    assert.equal(repaid.player.finance.loans.find(item => item.id === issued.loan!.id)?.status, 'PAID');
    assert.deepEqual(getAverageWeeklyCashFlow(repaid.player), { income: 0, expenses: 0, freeCashFlow: 0 });
    const duplicate = repayPersonalLoan(repaid.player, issued.loan.id, 'BALANCE');
    assert.equal(duplicate.success, false); assert.equal(duplicate.player, repaid.player);
});
check('same-week manual payment splitting does not farm successful payment credit', () => {
    const p = player(); const issued = issuePersonalLoan(p, 50_000, 26); assert(issued.loan);
    let current = issued.player;
    for (let i = 0; i < 4; i++) { const result = repayPersonalLoan(current, issued.loan.id, 'SCHEDULED'); assert.equal(result.success, true); current = result.player; }
    assert.equal(current.finance.credit.successfulPayments - p.finance.credit.successfulPayments, 1);
    assert(current.finance.credit.totalRepaid > 0);
    assert.equal(current.finance.loans[0].principal, 50_000 - current.finance.credit.totalRepaid);
});
check('actual bank actions reject invalid amounts terms stale IDs and insufficient cash', () => {
    const p = player();
    for (const amount of [-50_000, 0, NaN, Infinity, 50_000.5]) assert.equal(issuePersonalLoan(p, amount, 26).success, false);
    assert.equal(issuePersonalLoan(p, 50_000, 0).success, false);
    assert.equal(issuePersonalLoan(p, getAbsoluteBorrowingCeiling(p) + 1, 26).success, false);
    assert.equal(repayPersonalLoan(p, 'missing', 'BALANCE').success, false);
    const issued = issuePersonalLoan(p, 50_000, 26); assert(issued.loan);
    issued.player.money = 0;
    assert.equal(repayPersonalLoan(issued.player, issued.loan.id, 'BALANCE').success, false);
});

check('capital spam cannot evict a real operating loss and improve the credit quote', () => {
    const p = player(); p.finance.history = [transaction(p, -2_600_000, 'EXPENSE', 'Real operating loss')];
    const baseline = getAverageWeeklyCashFlow(p); const score = getCreditScore(p); const cap = getAbsoluteBorrowingCeiling(p);
    for (let i = 0; i < 250; i++) p.finance.history = retainBankTransactionHistory([
        transaction(p, 100_000_000, 'BUSINESS', 'Anushka Studios owner withdrawal', `studio_treasury_tx_${i}`),
        transaction(p, -100_000_000, 'ASSET', 'Anushka Studios capital injection', `studio_treasury_tx_inject_${i}`), ...p.finance.history,
    ]);
    assert.deepEqual(getAverageWeeklyCashFlow(p), baseline); assert.equal(getCreditScore(p), score); assert.equal(getAbsoluteBorrowingCeiling(p), cap);
    assert(p.finance.history.length <= 240);
});

check('acquisition principal paydown remains capital while real interest remains operating expense', () => {
    const p = player();
    const studio = createBusiness('Anushka Acquisition', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' }, 'FILM', 1, 35);
    p.businesses = [studio];
    p.flags.acquisitionDebtLedger = [{ id: 'fixture_debt', studioId: studio.id, studioName: studio.name, originalPrincipal: 10_000_000, remainingPrincipal: 10_000_000, annualInterestRate: .1, originatedYear: 35, originatedWeek: 1, source: 'NEGOTIATED_ACQUISITION', status: 'ACTIVE', interestPaidToDate: 0, missedServiceAmount: 0, missedPayments: 0 }];
    const paid = payDownAcquisitionDebt(p, 1_000_000); assert.equal(paid.success, true);
    assert.equal(paid.player.money, p.money - 1_000_000);
    assert.equal(getAverageWeeklyCashFlow(paid.player).expenses, 0);
    const serviced = processAcquisitionDebtService(paid.player);
    assert(serviced.servicedAmount > 0);
    assert.equal(getAverageWeeklyCashFlow(serviced.player).expenses, serviced.servicedAmount / 26);
});


check('corporate-funded portfolio contributes only beneficial shares to personal borrowing assets', () => {
    const p = player(); const studio = createBusiness('Funding Studio', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', { quality: 'PREMIUM', pricing: 'MARKET', marketing: 'MEDIUM' }, 'FILM', 1, 35);
    studio.studioState!.equityFunding = [{ ownerStudioId: 'outside_owner', percent: 48 }];
    p.businesses = [studio]; p.stocks = initializeStocks(); const stock = p.stocks.find(item => item.id === 'stk_apple')!;
    const baseline = getEstimatedNetWorth(p);
    p.portfolio = [{ stockId: stock.id, shares: 100, equityFunding: [{ ownerStudioId: studio.id, shares: 80 }] }];
    assert(Math.abs(getEstimatedNetWorth(p) - baseline - normalizeStockPrice(stock, stock.price) * (20 + 80 * .52)) < .001);
    p.portfolio = [{ stockId: stock.id, shares: 100, equityFunding: [{ ownerStudioId: 'missing_owner', shares: 100 }] }];
    assert.equal(getEstimatedNetWorth(p), baseline);
});
console.log(`Bank cashflow/actions audit passed: ${checks} total checks.`);
