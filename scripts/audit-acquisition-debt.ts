import { INITIAL_PLAYER, type Business, type Player } from '../types';
import {
    getAcquisitionDebtSummary,
    payDownAcquisitionDebt,
    processAcquisitionDebtService,
    syncAcquisitionDebtLedger,
} from '../services/acquisitionDebt';
import { getWorldReactionState } from '../services/worldReactions';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const makeStudio = (id: string, name: string, balance = 120_000_000): Business => ({
    id,
    name,
    type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO',
    logo: 'DBT',
    color: 'bg-sky-500',
    foundedWeek: 1,
    balance,
    isActive: true,
    config: {
        quality: 'PREMIUM',
        pricing: 'MARKET',
        marketing: 'MEDIUM',
    },
    stats: {
        weeklyRevenue: 40_000_000,
        weeklyExpenses: 28_000_000,
        weeklyProfit: 12_000_000,
        lifetimeRevenue: 2_000_000_000,
        valuation: 8_000_000_000,
        brandHealth: 75,
        customerSatisfaction: 72,
        riskLevel: 34,
        hype: 68,
        studioMomentum: 70,
        investorConfidence: 74,
    },
    staff: [],
    products: [],
    hiringPool: [],
    lastHiringRefreshWeek: 1,
    history: [],
});

const makePlayer = (money = 500_000_000): Player => ({
    ...INITIAL_PLAYER,
    id: 'audit_acquisition_debt',
    name: 'Debt Auditor',
    age: 40,
    currentWeek: 122,
    money,
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures'),
        makeStudio('WARNER_BROS', 'Warner Bros.'),
    ],
    flags: {
        ...INITIAL_PLAYER.flags,
        studioAcquisitionCases: [{
            studioId: 'WARNER_BROS',
            studioName: 'Warner Bros.',
            acquisitionState: 'PUBLICLY_TRADED',
            publicValuation: 260_000_000_000,
            approachedWeek: 118,
            approachedYear: 40,
            status: 'ACQUIRED',
            closing: {
                finalPrice: 0,
                acquiredBusinessId: 'WARNER_BROS',
                signedWeek: 118,
                signedYear: 40,
                funding: { source: 'PERSONAL' },
                verifiedDebt: 12_000_000_000,
                hiddenLiabilities: 4_000_000_000,
                expectedAnnualIncome: 7_000_000_000,
                assetSummary: 'public-market control transfer',
            },
        }],
    },
    news: [],
    logs: [],
});

const synced = syncAcquisitionDebtLedger(makePlayer());
const summary = getAcquisitionDebtSummary(synced);
assert(summary.entries.length === 1, 'Acquired studio liabilities should create one debt ledger entry.');
assert(summary.totalRemainingPrincipal === 16_000_000_000, 'Ledger principal should include verified debt plus hidden liabilities.');
assert(summary.weeklyInterestDue > 0, 'Debt summary should calculate weekly interest due.');
assert(summary.entries[0].source === 'STOCK_CONTROL_TRANSFER', 'Zero-price stock control transfer should still inherit debt without adding purchase price.');

const serviced = processAcquisitionDebtService(synced);
assert(serviced.servicedAmount === summary.weeklyInterestDue, 'Weekly debt service should pay the interest due when cash is available.');
assert(serviced.player.money === synced.money - serviced.servicedAmount, 'Debt service should deduct cash exactly once.');
assert(serviced.player.finance.history.some(tx => tx.description === 'Acquisition Debt Interest'), 'Debt service should add a finance transaction.');

const servicedAgain = processAcquisitionDebtService(serviced.player);
assert(servicedAgain.servicedAmount === 0, 'Processing the same week should not charge acquisition debt twice.');
assert(servicedAgain.player.money === serviced.player.money, 'Same-week reprocessing should not change cash.');

const paydown = payDownAcquisitionDebt(serviced.player, 100_000_000);
assert(paydown.success, 'Player should be able to pay down active acquisition debt.');
assert(paydown.summary.totalRemainingPrincipal === 15_900_000_000, 'Paydown should reduce remaining principal.');
assert(paydown.player.finance.history.some(tx => tx.description === 'Acquisition Debt Paydown'), 'Paydown should create a finance transaction.');

const scopedPaydown = payDownAcquisitionDebt(serviced.player, 50_000_000, 'WARNER_BROS');
assert(scopedPaydown.success, 'Studio command center should be able to pay down the visible studio debt.');
assert(
    scopedPaydown.summary.entries.find(entry => entry.studioId === 'WARNER_BROS')?.remainingPrincipal === 15_950_000_000,
    'Studio-scoped paydown should reduce that studio principal.',
);

const unrelatedLedgerPlayer: Player = {
    ...serviced.player,
    money: 500_000_000,
    businesses: [
        ...serviced.player.businesses,
        makeStudio('OTHER_STUDIO', 'Other Studio'),
    ],
    flags: {
        ...serviced.player.flags,
        studioAcquisitionCases: [],
        acquisitionDebtLedger: [{
            id: 'acq_debt_OTHER_40_120',
            studioId: 'OTHER_STUDIO',
            studioName: 'Other Studio',
            originalPrincipal: 600_000_000,
            remainingPrincipal: 600_000_000,
            annualInterestRate: 0.12,
            originatedWeek: 120,
            originatedYear: 40,
            source: 'NEGOTIATED_ACQUISITION',
            status: 'ACTIVE',
            interestPaidToDate: 0,
            missedServiceAmount: 0,
            missedPayments: 0,
        }],
    },
};
const wrongStudioPaydown = payDownAcquisitionDebt(unrelatedLedgerPlayer, 50_000_000, 'WARNER_BROS');
assert(!wrongStudioPaydown.success && wrongStudioPaydown.reason === 'NO_ACTIVE_DEBT', 'Studio-scoped paydown should fail when that studio has no active debt.');
assert(wrongStudioPaydown.summary.totalRemainingPrincipal === 600_000_000, 'Studio-scoped paydown should not reduce another studio debt.');
assert(wrongStudioPaydown.player.money === unrelatedLedgerPlayer.money, 'Failed scoped paydown should not spend cash.');

const orphanDebtPlayer: Player = {
    ...serviced.player,
    money: 500_000_000,
    businesses: serviced.player.businesses.filter(business => business.id !== 'WARNER_BROS'),
    flags: {
        ...serviced.player.flags,
        studioAcquisitionCases: [],
        acquisitionDebtLedger: [{
            id: 'acq_debt_WARNER_BROS_40_120',
            studioId: 'WARNER_BROS',
            studioName: 'Warner Bros.',
            originalPrincipal: 600_000_000,
            remainingPrincipal: 600_000_000,
            annualInterestRate: 0.12,
            originatedWeek: 120,
            originatedYear: 40,
            source: 'NEGOTIATED_ACQUISITION',
            status: 'ACTIVE',
            interestPaidToDate: 0,
            missedServiceAmount: 0,
            missedPayments: 0,
        }],
    },
};
const orphanSynced = syncAcquisitionDebtLedger(orphanDebtPlayer);
assert(
    orphanSynced.flags?.acquisitionDebtLedger?.[0]?.status === 'PAID_OFF'
        && orphanSynced.flags?.acquisitionDebtLedger?.[0]?.closureReason === 'ORPHANED_STUDIO_ASSET',
    'Debt ledger should close active debt when the linked studio asset no longer exists.',
);
const orphanSummary = getAcquisitionDebtSummary(orphanSynced);
assert(orphanSummary.totalRemainingPrincipal === 0, 'Orphaned studio debt should not remain in active debt totals.');
const orphanService = processAcquisitionDebtService({ ...orphanDebtPlayer, currentWeek: 123 });
assert(orphanService.servicedAmount === 0, 'Orphaned studio debt should not charge weekly interest.');

const missingBusinessCase = syncAcquisitionDebtLedger({
    ...makePlayer(),
    businesses: makePlayer().businesses.filter(business => business.id !== 'WARNER_BROS'),
});
assert(
    getAcquisitionDebtSummary(missingBusinessCase).entries.length === 0,
    'Acquired-case flags should not recreate debt when the acquired studio business is gone.',
);

const mergedDebtPlayer = syncAcquisitionDebtLedger({
    ...makePlayer(),
    businesses: [
        makeStudio('PLAYER_MAIN', 'Player Pictures'),
        {
            ...makeStudio('WARNER_BROS', 'Warner Bros.'),
            isActive: false,
            balance: 0,
            stats: {
                ...makeStudio('WARNER_BROS', 'Warner Bros.').stats,
                weeklyRevenue: 0,
                weeklyExpenses: 0,
                weeklyProfit: 0,
                valuation: 0,
            },
            studioState: {
                acquisitionOrigin: 'STUDIO_ACQUISITION',
                operatingModel: 'FULL_MERGER',
                mergedIntoStudioId: 'PLAYER_MAIN',
            },
        } as Business,
    ],
});
const mergedSummary = getAcquisitionDebtSummary(mergedDebtPlayer);
assert(mergedSummary.entries.length === 1, 'Full-merged studio debt should stay active because HQ absorbed the liability.');
assert(mergedSummary.totalRemainingPrincipal === 16_000_000_000, 'Full-merged studio debt should still reflect acquired liabilities.');

const missed = processAcquisitionDebtService({
    ...makePlayer(1_000),
    currentWeek: 123,
});
assert(missed.unpaidAmount > 0, 'Insufficient cash should create unpaid interest.');
assert(missed.player.news.some(item => /debt/i.test(item.headline)), 'Missed service should create acquisition debt news.');
assert(missed.player.logs.some(log => /missed/i.test(log.message)), 'Missed service should create a readable negative log.');
assert((missed.player.businesses.find(studio => studio.id === 'WARNER_BROS')?.stats.investorConfidence || 100) < 74, 'High debt pressure should lower investor confidence.');

const worldState = getWorldReactionState(serviced.player);
assert(worldState.acquisitionDebtPressure > 0, 'World reactions should read acquisition debt ledger pressure.');

console.log('Acquisition debt audit passed.');
