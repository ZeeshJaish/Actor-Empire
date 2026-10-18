import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { createBusiness, recalculateBusinessValuation, processBusinessWeek, injectCapital, withdrawCapital } from '../services/businessLogic';
import { performStudioTreasuryTransfer } from '../services/studioGroup';
import { getEstimatedNetWorth, getAbsoluteBorrowingCeiling } from '../services/loanLogic';
import { getStudioGroupValuation } from '../services/studioGroupValuation';
import { migratePlayerSave } from '../services/saveMigration';
import { getAcquisitionDebtSummary, payDownAcquisitionDebt } from '../services/acquisitionDebt';
import { processWorldReactions } from '../services/worldReactions';
import { processAcquisitionMarketPulse } from '../services/acquisitionMarketPulse';

let checks = 0;
const test = (name: string, run: () => void) => { run(); checks += 1; console.log(`PASS ${name}`); };
const fixture = (): Player => {
    const player = structuredClone(INITIAL_PLAYER);
    Object.assign(player, { age: 36, currentWeek: 22, money: 200_000_000, flags: {}, portfolio: [], stocks: [], stockTakeovers: [] });
    player.finance = { history: [], yearly: [], loans: [], credit: { successfulPayments: 0, missedPayments: 0, defaults: 0, totalBorrowed: 0, totalRepaid: 0 } };
    const hq = createBusiness('Equity HQ', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, 'FILM', 1, 36);
    hq.id = 'equity-hq'; hq.balance = 10_000_000; hq.stats.valuation = 50_000_000;
    const sub = createBusiness('Equity Subsidiary', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, 'FILM', 1, 36);
    sub.id = 'equity-sub'; sub.balance = 800_000_000; sub.stats.valuation = 1_000_000_000; sub.stats.weeklyExpenses = 1_000_000;
    sub.config.productionType = 'Acquired Studio';
    Object.assign(sub.studioState!, { acquisitionOrigin: 'STUDIO_ACQUISITION', operatingModel: 'CONTROLLED_SUBSIDIARY', acquiredYear: 35, acquiredWeek: 1 });
    player.businesses = [hq, sub];
    return player;
};
const transfer = (player: Player, action: 'WITHDRAW' | 'INJECT', amount: number, counterparty: 'PERSONAL' | 'HQ' = 'PERSONAL', studioId = 'equity-sub') => {
    const result = performStudioTreasuryTransfer({ player, studioId, action, amount, counterparty });
    assert.ok(result.success, result.reason);
    return result.player;
};

test('legacy studio operating value is preserved before a capital move', () => {
    assert.equal(getEstimatedNetWorth(fixture()), 1_250_000_000);
});
test('shared business capital helpers retain studio cash-neutral equity', () => {
    const player = fixture(); const before = getEstimatedNetWorth(player);
    player.businesses[1] = injectCapital(player.businesses[1], 100_000_000); player.money -= 100_000_000;
    assert.equal(getEstimatedNetWorth(player), before);
    const withdrawal = withdrawCapital(player.businesses[1], 100_000_000); assert.ok(withdrawal.success);
    player.businesses[1] = withdrawal.updated; player.money += 100_000_000;
    assert.equal(getEstimatedNetWorth(player), before);
});
test('personal withdrawal does not duplicate studio cash in bank collateral', () => {
    const player = fixture(); const before = getEstimatedNetWorth(player);
    const next = transfer(player, 'WITHDRAW', 500_000_000);
    assert.equal(next.money, 700_000_000);
    assert.equal(next.businesses[1].balance, 300_000_000);
    assert.equal(getEstimatedNetWorth(next), before);
    assert.equal(getStudioGroupValuation(next).holdings[0].standaloneValue, 500_000_000);
});
test('cash injected beyond the old valuation remains worth one dollar per dollar', () => {
    const player = fixture(); player.money = 2_000_000_000;
    const next = transfer(player, 'INJECT', 1_500_000_000);
    assert.equal(getEstimatedNetWorth(next), getEstimatedNetWorth(player));
});
test('HQ to subsidiary and return preserve consolidated collateral', () => {
    let player = fixture(); player.businesses[0].balance = 600_000_000; player.businesses[0].stats.valuation = 650_000_000;
    const before = getEstimatedNetWorth(player);
    player = transfer(player, 'INJECT', 500_000_000, 'HQ');
    assert.equal(getEstimatedNetWorth(player), before);
    player = transfer(player, 'WITHDRAW', 500_000_000, 'HQ');
    assert.equal(getEstimatedNetWorth(player), before);
});
test('founder HQ withdrawal preserves collateral', () => {
    const player = fixture();
    assert.equal(getEstimatedNetWorth(transfer(player, 'WITHDRAW', 5_000_000, 'PERSONAL', 'equity-hq')), getEstimatedNetWorth(player));
});
test('minority distribution removes only the player attributable value', () => {
    const player = fixture();
    player.stockTakeovers = [{ id: 'control', acquiredBusinessId: 'equity-sub', relatedStudioId: 'equity-sub', ownershipPercent: 52 } as any];
    const next = transfer(player, 'WITHDRAW', 260_000_000);
    assert.equal(next.businesses[1].balance, 300_000_000);
    assert.equal(getEstimatedNetWorth(next), getEstimatedNetWorth(player));
});
test('an acquired studio used as HQ still respects minority ownership', () => {
    const player = fixture(); player.businesses = [player.businesses[1]];
    player.stockTakeovers = [{ id: 'control', acquiredBusinessId: 'equity-sub', relatedStudioId: 'equity-sub', ownershipPercent: 52 } as any];
    assert.equal(getEstimatedNetWorth(player), 720_000_000);
    assert.equal(getEstimatedNetWorth(transfer(player, 'WITHDRAW', 260_000_000)), 720_000_000);
});
test('company-funded private shares replace spent cash without granting minority equity to the player', () => {
    const player = fixture();
    player.stockTakeovers = [{ id: 'control', acquiredBusinessId: 'equity-sub', relatedStudioId: 'equity-sub', ownershipPercent: 52 } as any];
    const before = getEstimatedNetWorth(player);
    const paid = withdrawCapital(player.businesses[1], 55_000_000); assert.ok(paid.success);
    player.businesses[1] = paid.updated;
    player.flags.companyEquityPositions = [{ studioId: 'private-target', percent: 11, investedAmount: 55_000_000,
        currentCompanyValuation: 500_000_000, equityFunding: [{ ownerStudioId: 'equity-sub', percent: 11 }] }];
    assert.equal(getEstimatedNetWorth(player), before);
    player.flags.companyEquityPositions[0].currentCompanyValuation = 600_000_000;
    assert.equal(getEstimatedNetWorth(player), before + (11_000_000 * .52));
});
test('twelve round trips cannot create collateral or borrowing capacity', () => {
    let player = fixture(); const before = getEstimatedNetWorth(player); const capacity = getAbsoluteBorrowingCeiling(player);
    for (let i = 0; i < 12; i += 1) player = transfer(transfer(player, 'WITHDRAW', 100_000_000), 'INJECT', 100_000_000);
    assert.equal(getEstimatedNetWorth(player), before);
    assert.equal(getAbsoluteBorrowingCeiling(player), capacity);
});
test('same-week real business cash receipts remain additional assets', () => {
    const player = transfer(fixture(), 'WITHDRAW', 500_000_000); const before = getEstimatedNetWorth(player);
    player.businesses[1].balance += 75_000_000;
    assert.equal(getEstimatedNetWorth(player), before + 75_000_000);
});
test('save reload and migration retain the corrected cash basis', () => {
    const player = transfer(fixture(), 'WITHDRAW', 500_000_000); const expected = getEstimatedNetWorth(player);
    assert.equal(getEstimatedNetWorth(JSON.parse(JSON.stringify(player))), expected);
    assert.equal(getEstimatedNetWorth(migratePlayerSave(JSON.parse(JSON.stringify(player)))), expected);
});
test('fresh valuation refresh is honored and later withdrawals stay neutral', () => {
    const player = transfer(fixture(), 'WITHDRAW', 100_000_000);
    player.businesses[1].stats.lifetimeRevenue = 5_000_000_000;
    player.businesses[1] = recalculateBusinessValuation(player.businesses[1], player);
    const before = getEstimatedNetWorth(player);
    assert.ok(player.businesses[1].stats.valuation > 1_000_000_000, 'genuine earned revenue retains its operating value');
    assert.equal(getEstimatedNetWorth(transfer(player, 'WITHDRAW', 100_000_000)), before);
});
test('a real appraisal prices cash at par irrespective of the studio risk multiple', () => {
    for (const trust of [0, 50, 100]) {
        const before = fixture();
        Object.assign(before.businesses[1].stats, { studioMomentum: trust, investorConfidence: trust });
        const after = transfer(before, 'WITHDRAW', 500_000_000);
        before.businesses[1] = recalculateBusinessValuation(before.businesses[1], before);
        after.businesses[1] = recalculateBusinessValuation(after.businesses[1], after);
        assert.equal(getEstimatedNetWorth(after), getEstimatedNetWorth(before));
    }
});
test('weekly revaluation rebases current cash and later withdrawals stay neutral', () => {
    const player = transfer(fixture(), 'WITHDRAW', 100_000_000);
    player.businesses[1] = processBusinessWeek(player.businesses[1], 50, 23, 'en', 36).updated;
    const before = getEstimatedNetWorth(player);
    assert.equal(getEstimatedNetWorth(transfer(player, 'WITHDRAW', 100_000_000)), before);
});
test('withdrawal then acquisition debt paydown does not double deduct or duplicate equity', () => {
    const player = fixture();
    player.flags.acquisitionDebtLedger = [{
        id: 'equity-debt', studioId: 'equity-sub', studioName: 'Equity Subsidiary', originalPrincipal: 250_000_000,
        remainingPrincipal: 250_000_000, annualInterestRate: .1, originatedWeek: 1, originatedYear: 35,
        source: 'NEGOTIATED_ACQUISITION', status: 'ACTIVE', interestPaidToDate: 0, missedServiceAmount: 0,
        missedPayments: 0, trackingOrigin: 'SIGNED',
    }];
    const before = getEstimatedNetWorth(player);
    const withdrawn = transfer(player, 'WITHDRAW', 500_000_000);
    assert.equal(getEstimatedNetWorth(withdrawn), before);
    const paid = payDownAcquisitionDebt(withdrawn, 250_000_000, 'equity-sub'); assert.ok(paid.success);
    assert.equal(paid.player.money, withdrawn.money - 250_000_000);
    assert.equal(getAcquisitionDebtSummary(paid.player).totalRemainingPrincipal, 0);
    assert.equal(getEstimatedNetWorth(paid.player), before);
});
for (const [name, process] of [['world reaction', processWorldReactions], ['acquisition market pulse', processAcquisitionMarketPulse]] as const) {
    test(`${name} cannot revive withdrawn cash or apply its premium to deposited cash`, () => {
        const original = fixture();
        original.flags.studioAcquisitionCases = [{
            studioId: 'equity-sub', studioName: 'Equity Subsidiary', status: 'ACQUIRED', publicValuation: 1_000_000_000,
            closing: { acquiredBusinessId: 'equity-sub', finalPrice: 1_000_000_000, signedYear: 35, signedWeek: 1,
                funding: { source: 'PERSONAL' }, verifiedDebt: 0, hiddenLiabilities: 0,
                expectedAnnualIncome: 100_000_000, assetSummary: 'Franchise catalogue', },
        }];
        const withdrawn = transfer(original, 'WITHDRAW', 500_000_000);
        const before = getEstimatedNetWorth(process(original));
        const after = getEstimatedNetWorth(process(withdrawn));
        assert.ok(before > getEstimatedNetWorth(original), 'legitimate operating asset appreciation remains');
        assert.equal(after, before);
        const injected = transfer(withdrawn, 'INJECT', 500_000_000);
        assert.equal(getEstimatedNetWorth(process(injected)), before);
        const processed = process(withdrawn);
        assert.equal(getEstimatedNetWorth(transfer(processed, 'WITHDRAW', 100_000_000)), after);
    });
}
console.log(`Bank studio equity audit passed (${checks} checks).`);
