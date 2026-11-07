/**
 * #209 (plan §23.10, §23.12): your own money from the company. Zeesh (2026-11-04): "agar company listed nahi hai to hm log
 * kitna bhi capital personal wallet me le satke hai right and sayad khud ko bhi slary de sakte werhee as list ke baad
 * direct withrdawrl nahi kar sakt either bonus ke roop me dena hoga"; "listed ke baad yeh bhi baad me changes karna rahe ki
 * diviend kitna dena hai share holder ko".
 *
 *                     private, 100% yours        private, others hold shares          listed
 *   take money out    any amount, to the floor   only as a dividend to everyone       not possible
 *                                                (yours at 51%, else the board's)
 *   salary            you set it                 you at 51%; else the board's         the board's; a big rise: a vote
 *   bonus             yours                      as salary                            by results; a big one: a vote
 *   dividend          as taking out              as above                             per share, set on MARKETS; the price reacts
 *
 * Never under the cash floor. Money taken out lowers the value by exactly as much, at face. Salary and bonus are company
 * costs, so they lower what it earns and its value. All of it is income for the yearly 15% tax. Stepping down ends the
 * salary: a chair takes a quarter of it; off the board, nothing but dividends.
 */
import type {
    OwnedStreamingFounderMoney,
    OwnedStreamingPlatformState,
    Player,
} from '../types';
import { spendStreamingApproval, streamingApprovalGate, type StreamingApprovalVote } from './streamingApproval';
import { streamingCapitalAction } from './streamingBuybacks';
import { getStreamingEstatePlanView, type StreamingEstatePlanView } from './streamingEstatePlan';
import { getAbsoluteWeek } from './legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from './ownedStreamingPlatform';
import { getStreamingAdditionalOperatingExpense } from './streamingOperatingExpenses';
import { getStreamingEquityValuation } from './streamingPublicMarkets';
import { getStreamingTeamCashFloor } from './team/teamState';

export const STREAMING_DIVIDEND_WEEKS = 13;
const CONTROL = 51;
const CHAIR_SHARE = 0.25;
const OVERPAID_AT = 1.25;
const INCOME_TAX = 0.15;

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const money = (value: number) => {
    const abs = Math.abs(value);
    return abs >= 1e9 ? `$${(abs / 1e9).toFixed(2).replace(/\.?0+$/, '')}B` : abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace(/\.0$/, '')}M` : abs >= 500 ? `$${Math.round(abs / 1e3)}K` : '$0';
};
const moneyOf = (platform: OwnedStreamingPlatformState): OwnedStreamingFounderMoney => platform.governance.founderMoney || { weeklySalary: 0, salaryPaid: 0, bonusPaid: 0, takenOut: 0, dividendsPaid: 0 };
const save = (player: Player, platform: OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence(platform, player.id) });
const isListed = (platform: OwnedStreamingPlatformState) => platform.publicCompany.lifecycle === 'PUBLIC';
const roleOf = (platform: OwnedStreamingPlatformState): 'CEO' | 'CHAIR' | 'OFF_BOARD' => (
    platform.leadership.currentCeo.holderType !== 'EXECUTIVE' ? 'CEO' : platform.legacy.founderOfficeRole === 'EXECUTIVE_CHAIR' ? 'CHAIR' : 'OFF_BOARD'
);
const othersHold = (platform: OwnedStreamingPlatformState) => Math.max(0, 100 - platform.founderOwnershipPercent);
const round5k = (value: number) => Math.round(value / 5_000) * 5_000;

/** what a chief executive of a company this size is paid: about 0.3% of its revenue, a week */
export const streamingCeoMarketPay = (platform: OwnedStreamingPlatformState) => {
    const weeks = (platform.weeklyHistory || []).filter(item => item.operations).slice(-52);
    const revenue = weeks.length ? weeks.reduce((sum, item) => sum + Math.max(0, (item.operations!.subscriptionRevenue || 0) + (item.operations!.productRevenue || 0)), 0) * 52 / weeks.length : 0;
    return round5k(clamp(revenue * 0.003 / 52, 50_000, 2_500_000));
};
/** a bonus the board would pay without asking: 1% of the last quarter's profit, on the books */
const boardBonus = (platform: OwnedStreamingPlatformState) => {
    const quarter = (platform.weeklyHistory || []).filter(item => item.operations).slice(-13);
    const profit = quarter.reduce((sum, item) => sum + (item.operations!.accountingContribution ?? item.operations!.netCashContribution ?? 0), 0);
    return Math.max(0, Math.round(profit * 0.01 / 1_000_000) * 1_000_000);
};
const boardBonusWords = (most: number) => (most > 0 ? `up to ${money(most)}` : 'nothing yet, with no profit this quarter');

/* money in your wallet, on your bank statement, and in next year's tax */
const paid = (player: Player, amount: number, category: 'SALARY' | 'DIVIDEND', description: string): Player => ({
    ...player,
    money: (player.money || 0) + Math.round(amount),
    finance: {
        ...player.finance,
        history: [{
            id: `tx_streaming_${getAbsoluteWeek(player.age, player.currentWeek)}_${category}_${Math.round(amount)}`,
            week: player.currentWeek, year: player.age, amount: Math.round(amount), category, description,
        }, ...(player.finance?.history || [])],
    },
});
/* a company cost: it shows in the week's costs and so in what the company earns */
const asCost = (platform: OwnedStreamingPlatformState, amount: number): OwnedStreamingPlatformState => {
    const last = platform.weeklyHistory.at(-1);
    if (!last?.operations || amount <= 0) return platform;
    const before = getStreamingAdditionalOperatingExpense(platform, last.absoluteWeek, last.operations.additionalOperatingExpense);
    return { ...platform, weeklyHistory: [...platform.weeklyHistory.slice(0, -1), { ...last, operations: { ...last.operations, additionalOperatingExpense: before + Math.round(amount) } }] };
};

export interface StreamingYourMoneyView {
    wallet: number;
    stakePercent: number;
    stakeValue: number;
    listed: boolean;
    role: 'CEO' | 'CHAIR' | 'OFF_BOARD';
    treasury: number;
    floor: number;
    floorWeeks: number;
    marketPay: number;
    salary: { weekly: number; paidNow: number; canSet: boolean; mostWithoutAsking: number | null; line: string };
    bonus: { canPay: boolean; mostWithoutAsking: number | null; line: string };
    takeOut: { allowed: boolean; yourShare: number; mostToYou: number; line: string };
    dividend: StreamingDividendView | null;
    sellLine: string;
    thisYear: { salary: number; bonus: number; dividends: number; takenOut: number; tax: number };
    allTime: { salary: number; bonus: number; dividends: number; takenOut: number };
    /** a vote on your pay is open on MARKETS */
    voteOpen: boolean;
    /** #221: the estate, while it is being paid */
    estate: StreamingEstatePlanView | null;
}
export interface StreamingDividendView {
    perShare: number;
    yieldPercent: number;
    price: number;
    shares: number;
    nextInWeeks: number;
    yourShare: number;
    canSet: boolean;
    line: string;
}

const dividendView = (platform: OwnedStreamingPlatformState, absoluteWeek: number): StreamingDividendView | null => {
    const listing = isListed(platform) ? platform.publicCompany.listing : null;
    if (!listing) return null;
    const price = platform.publicCompany.quoteHistory.at(-1)?.close || listing.offerPrice;
    const perShare = platform.governance.dividend?.perShareQuarter || 0;
    const founder = platform.founderOwnershipPercent;
    const blocked = founder < CONTROL ? streamingApprovalGate(platform, { kind: 'DIVIDEND' }, absoluteWeek) : null;
    const canSet = roleOf(platform) !== 'OFF_BOARD' && blocked?.state !== 'BLOCKED';
    return {
        perShare,
        yieldPercent: price > 0 ? Math.round(perShare * 4 / price * 1000) / 10 : 0,
        price,
        shares: listing.sharesOutstanding,
        nextInWeeks: STREAMING_DIVIDEND_WEEKS - (absoluteWeek % STREAMING_DIVIDEND_WEEKS),
        yourShare: founder / 100,
        canSet,
        line: roleOf(platform) === 'OFF_BOARD' ? 'You left the board: the board sets it.'
            : founder >= CONTROL ? 'Paid every quarter to every shareholder. A raise lifts the price; a cut hurts it.'
                : blocked?.state === 'BLOCKED' ? blocked.line : 'Under 51%, the board votes on it. A raise lifts the price; a cut hurts it.',
    };
};

/** MARKETS' card */
export const getStreamingDividendView = (player: Player): StreamingDividendView | null => (
    player.ownedStreamingPlatform?.publicCompany?.lifecycle === 'PUBLIC' ? dividendView(platformOf(player), getAbsoluteWeek(player.age, player.currentWeek)) : null
);

export const getStreamingYourMoneyView = (player: Player): StreamingYourMoneyView | null => {
    const source = player.ownedStreamingPlatform;
    if (!source?.identity || source.lifecycle !== 'ACTIVE' || !source.launchCommit) return null;
    const platform = normalizeOwnedStreamingPlatformState(source, player.id);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const record = moneyOf(platform);
    const role = roleOf(platform);
    const listed = isListed(platform);
    const founder = platform.founderOwnershipPercent;
    const solo = othersHold(platform) <= 0.01;
    const market = streamingCeoMarketPay(platform);
    const floor = getStreamingTeamCashFloor(platform);
    const cashLeft = Math.max(0, platform.treasuryCash - floor.amount);
    const yourShare = founder / 100;
    const mostSalary = listed ? Math.round(market * 1.1 / 5_000) * 5_000 : founder < CONTROL ? market : null;
    const year = (player.finance?.history || []).filter(item => item.year === player.age && item.id?.startsWith('tx_streaming_'));
    const sum = (test: (description: string) => boolean) => year.filter(item => test(item.description)).reduce((total, item) => total + item.amount, 0);
    const salaryYear = sum(words => words.startsWith('Salary'));
    const bonusYear = sum(words => words.startsWith('Bonus'));
    const dividendYear = sum(words => words.startsWith('Dividend'));
    const takenYear = sum(words => words.startsWith('Taken out'));
    const salaryNow = role === 'CEO' ? record.weeklySalary : role === 'CHAIR' ? Math.round(record.weeklySalary * CHAIR_SHARE) : 0;
    return {
        wallet: Math.round(player.money || 0),
        stakePercent: founder,
        stakeValue: Math.round(getStreamingEquityValuation(platform) * founder / 100),
        listed,
        role,
        treasury: Math.round(platform.treasuryCash),
        floor: floor.amount,
        floorWeeks: floor.weeks,
        marketPay: market,
        salary: {
            weekly: record.weeklySalary,
            paidNow: salaryNow,
            canSet: role === 'CEO',
            mostWithoutAsking: mostSalary,
            line: role === 'CHAIR' ? (salaryNow > 0 ? `You chair the board: you are paid a quarter of your salary, ${money(salaryNow)} a week.` : 'You chair the board: a chair takes a quarter of a salary, and you were paying yourself none.')
                : role === 'OFF_BOARD' ? 'You left the board: no salary, only dividends.'
                    : listed ? `The board agrees up to ${money(mostSalary!)} a week; more goes to the shareholders.`
                        : founder < CONTROL ? `Under 51%, up to ${money(market)} a week is agreed; more goes to a board vote.`
                            : solo ? `It is your company. A chief executive here is paid about ${money(market)} a week. It is a cost, so it lowers what the company earns.`
                                : `You set it at 51%. Past about ${money(Math.round(market * OVERPAID_AT))} a week, the board starts to mind. It is a cost, so it lowers what the company earns.`,
        },
        bonus: {
            canPay: role === 'CEO',
            mostWithoutAsking: listed || founder < CONTROL ? boardBonus(platform) : null,
            line: role !== 'CEO' ? 'Only a chief executive is paid a bonus.'
                : listed ? `By results, the board pays ${boardBonusWords(boardBonus(platform))}; more goes to the shareholders.`
                    : founder < CONTROL ? `Under 51%, the board pays by results: ${boardBonusWords(boardBonus(platform))}; more goes to a board vote.`
                        : 'Yours to pay yourself, from the treasury. It is a cost, like your salary.',
        },
        takeOut: {
            allowed: !listed && role !== 'OFF_BOARD' && (founder >= CONTROL || streamingApprovalGate(platform, { kind: 'MONEY_OUT' }, absoluteWeek).state !== 'BLOCKED'),
            yourShare,
            mostToYou: Math.round(cashLeft * yourShare),
            line: listed ? 'Listed, nobody takes money out directly. It leaves as a dividend, to every shareholder.'
                : role === 'OFF_BOARD' ? 'You left the board: the board decides any dividend.'
                    : solo ? `It is all yours: any amount, as long as the treasury keeps ${floor.weeks} weeks of costs.`
                        : founder >= CONTROL ? `Others own ${Math.round(othersHold(platform) * 10) / 10}%, so money only leaves as a dividend to everyone. ${floor.weeks} weeks of costs must stay.`
                            : (() => { const gate = streamingApprovalGate(platform, { kind: 'MONEY_OUT' }, absoluteWeek); return gate.state === 'BLOCKED' ? gate.line : 'Under 51%, the board votes on it. It is paid to every holder.'; })(),
        },
        dividend: dividendView(platform, absoluteWeek),
        sellLine: listed ? 'Your shares sell in the Stocks app, after the lock-up.' : role === 'CEO' ? 'While private, you can sell your stake once you have stepped down.' : 'Sell your stake on OWNERSHIP.',
        thisYear: { salary: salaryYear, bonus: bonusYear, dividends: dividendYear, takenOut: takenYear, tax: Math.round((salaryYear + bonusYear + dividendYear + takenYear) * INCOME_TAX) },
        allTime: { salary: record.salaryPaid, bonus: record.bonusPaid, dividends: record.dividendsPaid, takenOut: record.takenOut },
        voteOpen: platform.publicCompany.shareholderVotes.some(vote => vote.status === 'OPEN' && (vote.founderPayWeekly !== undefined || vote.founderBonus !== undefined)),
        estate: getStreamingEstatePlanView(player),
    };
};

export interface StreamingYourMoneyResult { player: Player; changed: boolean; message: string; vote?: StreamingApprovalVote }

/* the public's read of your pay: the bigger the ask over the market, the less support it has */
const publicForPay = (ratio: number) => clamp(70 - (ratio - 1) * 60, 10, 80) / 100;

export const setStreamingFounderSalary = (player: Player, weekly: number): StreamingYourMoneyResult => {
    const platform = platformOf(player);
    if (roleOf(platform) !== 'CEO') return { player, changed: false, message: 'Only a chief executive is paid a salary.' };
    const asked = Math.max(0, round5k(Number(weekly) || 0));
    const record = moneyOf(platform);
    if (asked === record.weeklySalary) return { player, changed: false, message: 'That is your salary now.' };
    const market = streamingCeoMarketPay(platform);
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const set = { ...record, weeklySalary: asked };
    const listed = isListed(platform);
    const limit = listed ? Math.round(market * 1.1 / 5_000) * 5_000 : market;
    const asking = asked > record.weeklySalary && asked > limit && (listed || platform.founderOwnershipPercent < CONTROL);
    const ask = { kind: 'SALARY' as const, amount: asked };
    if (asking) {
        const gate = streamingApprovalGate(platform, ask, absoluteWeek);
        if (gate.state === 'BLOCKED') return { player, changed: false, message: gate.line };
        if (gate.state === 'ASK') {
            const ratio = asked / Math.max(1, market);
            return { player, changed: false, message: '', vote: { ask, context: {
                cost: asked * 13, ratio, publicFor: publicForPay(ratio),
                headline: `${money(asked)} a week`,
                chip: `${ratio.toFixed(1)}× what the job pays`,
                chipWarn: ratio > 1.25,
                what: `${listed ? 'The board agrees' : 'Agreed without a vote:'} up to ${money(limit)} a week. You are asking for more.`,
                title: `Your salary is ${money(asked)} a week`,
            } } };
        }
    }
    return {
        changed: true,
        message: asked ? `Your salary is ${money(asked)} a week.` : 'You take no salary.',
        player: save(player, spendStreamingApproval({ ...platform, governance: { ...platform.governance, founderMoney: set } }, ask)),
    };
};

/* money out of the treasury to you, as a cost */
const payBonus = (player: Player, platform: OwnedStreamingPlatformState, amount: number): Player => {
    const record = moneyOf(platform);
    const next = asCost({
        ...platform,
        treasuryCash: platform.treasuryCash - amount,
        governance: { ...platform.governance, founderMoney: { ...record, bonusPaid: record.bonusPaid + amount } },
    }, amount);
    return paid(save(player, next), amount, 'SALARY', `Bonus from ${platform.identity?.name || 'the company'}`);
};

export const payStreamingFounderBonus = (player: Player, amount: number): StreamingYourMoneyResult => {
    const platform = platformOf(player);
    if (roleOf(platform) !== 'CEO') return { player, changed: false, message: 'Only a chief executive is paid a bonus.' };
    const sum = Math.max(0, Math.round((Number(amount) || 0) / 100_000) * 100_000);
    if (sum <= 0) return { player, changed: false, message: 'Choose an amount.' };
    const floor = getStreamingTeamCashFloor(platform);
    if (platform.treasuryCash - sum < floor.amount) return { player, changed: false, message: `The treasury must keep ${floor.weeks} weeks of costs, ${money(floor.amount)}.` };
    const most = boardBonus(platform);
    const listed = isListed(platform);
    const ask = { kind: 'BONUS' as const, amount: sum };
    if (sum > most && (listed || platform.founderOwnershipPercent < CONTROL)) {
        const gate = streamingApprovalGate(platform, ask, getAbsoluteWeek(player.age, player.currentWeek));
        if (gate.state === 'BLOCKED') return { player, changed: false, message: gate.line };
        if (gate.state === 'ASK') {
            const ratio = sum / Math.max(1, most || sum / 3);
            return { player, changed: false, message: '', vote: { ask, context: {
                cost: sum, ratio, publicFor: publicForPay(ratio),
                headline: money(sum),
                chip: most > 0 ? `${ratio.toFixed(1)}× what results pay` : 'No profit this quarter',
                chipWarn: true,
                what: `By results, the board pays ${boardBonusWords(most)}. You are asking for more.`,
                title: `${money(sum)} paid to you, before tax`,
            } } };
        }
    }
    return { changed: true, message: `${money(sum)} paid to you, before tax.`, player: payBonus(player, spendStreamingApproval(platform, ask), sum) };
};

/** private only: money out, down to the floor. With other holders it is a dividend: they get their share too */
export const takeStreamingMoneyOut = (player: Player, toYou: number): StreamingYourMoneyResult => {
    const platform = platformOf(player);
    if (isListed(platform)) return { player, changed: false, message: 'Listed, money leaves only as a dividend.' };
    if (roleOf(platform) === 'OFF_BOARD') return { player, changed: false, message: 'You left the board: the board decides any dividend.' };
    const founder = platform.founderOwnershipPercent;
    if (founder <= 0) return { player, changed: false, message: 'You hold no shares.' };
    const yours = Math.max(0, Math.round(Number(toYou) || 0));
    if (yours <= 0) return { player, changed: false, message: 'Choose an amount.' };
    const leaves = Math.round(yours / (founder / 100));
    const floor = getStreamingTeamCashFloor(platform);
    if (platform.treasuryCash - leaves < floor.amount) return { player, changed: false, message: `The treasury must keep ${floor.weeks} weeks of costs, ${money(floor.amount)}.` };
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const ask = { kind: 'MONEY_OUT' as const, amount: yours };
    if (founder < CONTROL) {
        const gate = streamingApprovalGate(platform, ask, absoluteWeek);
        if (gate.state === 'BLOCKED') return { player, changed: false, message: gate.line };
        if (gate.state === 'ASK') {
            return { player, changed: false, message: '', vote: { ask, context: {
                cost: leaves,
                headline: money(leaves),
                chip: `${Math.round(leaves / Math.max(1, platform.treasuryCash) * 100)}% of the treasury`,
                chipWarn: leaves / Math.max(1, platform.treasuryCash) > 0.25,
                what: `Paid as a dividend to every holder: ${money(yours)} of it to you.`,
                title: `${money(leaves)} paid out: ${money(yours)} to you`,
            } } };
        }
    }
    const record = moneyOf(platform);
    const key = `founder-withdrawal:${absoluteWeek}:${platform.finance.capitalActions.length}`;
    const next: OwnedStreamingPlatformState = {
        ...platform,
        treasuryCash: platform.treasuryCash - leaves,
        finance: { ...platform.finance, capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, key, 'FOUNDER_WITHDRAWAL', absoluteWeek, leaves, -leaves, yours, founder, founder)] },
        governance: { ...spendStreamingApproval(platform, ask).governance, founderMoney: { ...record, takenOut: record.takenOut + yours } },
    };
    return {
        changed: true,
        message: othersHold(platform) > 0.01 ? `${money(leaves)} paid out as a dividend: ${money(yours)} to you.` : `${money(yours)} is yours now.`,
        player: paid(save(player, next), yours, 'DIVIDEND', `Taken out of ${platform.identity?.name || 'the company'}`),
    };
};

/** MARKETS: what a share pays each quarter; a raise lifts the price, a cut hurts it */
export const setStreamingDividend = (player: Player, perShareQuarter: number): StreamingYourMoneyResult => {
    const platform = platformOf(player);
    const view = dividendView(platform, getAbsoluteWeek(player.age, player.currentWeek));
    if (!view) return { player, changed: false, message: 'Dividends are for a listed company.' };
    if (!view.canSet) return { player, changed: false, message: view.line };
    const next = Math.max(0, Math.round((Number(perShareQuarter) || 0) * 100) / 100);
    if (next === view.perShare) return { player, changed: false, message: 'That is the dividend now.' };
    const cost = next * view.shares;
    const floor = getStreamingTeamCashFloor(platform);
    if (next > view.perShare && platform.treasuryCash - cost < floor.amount) return { player, changed: false, message: `A quarter of that is ${money(cost)}: the treasury must keep ${floor.weeks} weeks of costs.` };
    const ask = { kind: 'DIVIDEND' as const, amount: Math.round(next * 100) };
    if (platform.founderOwnershipPercent < CONTROL) {
        const gate = streamingApprovalGate(platform, ask, getAbsoluteWeek(player.age, player.currentWeek));
        if (gate.state === 'BLOCKED') return { player, changed: false, message: gate.line };
        if (gate.state === 'ASK') {
            return { player, changed: false, message: '', vote: { ask, context: {
                cost: next > view.perShare ? cost : 0,
                cut: next < view.perShare,
                headline: `$${next.toFixed(2)} a share`,
                chip: next > view.perShare ? `${money(cost)} a quarter` : 'A cut',
                chipWarn: next < view.perShare,
                what: `What a share pays every quarter, now $${view.perShare.toFixed(2)}.`,
                title: next ? `The dividend is $${next.toFixed(2)} a share each quarter` : 'No dividend from now on',
            } } };
        }
    }
    const yieldChange = (next - view.perShare) * 4 / Math.max(0.01, view.price);
    const raising = next > view.perShare;
    const move = raising ? Math.min(0.03, 0.005 + yieldChange * 0.5) : Math.max(-0.08, -0.03 + yieldChange);
    return {
        changed: true,
        message: next ? `The dividend is $${next.toFixed(2)} a share each quarter.` : 'No dividend from now on.',
        player: save(player, {
            ...platform,
            governance: {
                ...spendStreamingApproval(platform, ask).governance,
                dividend: { perShareQuarter: next, setAtAbsoluteWeek: getAbsoluteWeek(player.age, player.currentWeek) },
                pendingPriceMoves: [...(platform.governance.pendingPriceMoves || []), { move, reason: raising ? 'A dividend raised' : next === 0 ? 'The dividend ended' : 'A dividend cut' }],
            },
        }),
    };
};

/** the weekly close: your salary, a bonus the shareholders voted, the quarter's dividend, and a board that minds */
export const processStreamingFounderMoneyWeek = (input: Player): Player => {
    const source = input.ownedStreamingPlatform;
    if (!source?.identity || source.lifecycle !== 'ACTIVE' || !source.launchCommit) return input;
    if (!source.governance?.founderMoney && !source.governance?.dividend) return input;
    let platform = normalizeOwnedStreamingPlatformState(source, input.id);
    let player = input;
    const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
    const name = platform.identity?.name || 'the company';
    const record = moneyOf(platform);
    const role = roleOf(platform);

    /* your salary: a cost to the company */
    const salary = role === 'CEO' ? record.weeklySalary : role === 'CHAIR' ? Math.round(record.weeklySalary * CHAIR_SHARE) : 0;
    let salaryPaid = record.salaryPaid;
    if (salary > 0 && platform.treasuryCash >= salary) {
        platform = asCost({ ...platform, treasuryCash: platform.treasuryCash - salary }, salary);
        salaryPaid += salary;
        player = paid(player, salary, 'SALARY', `Salary from ${name}`);
    }
    /* paid well above the market, a board with a say starts to mind, a little each quarter */
    let confidence = platform.governance.boardConfidence;
    if (role === 'CEO' && othersHold(platform) > 0.01 && absoluteWeek % STREAMING_DIVIDEND_WEEKS === 0 && record.weeklySalary > streamingCeoMarketPay(platform) * OVERPAID_AT) confidence = Math.max(0, confidence - 2);
    platform = { ...platform, governance: { ...platform.governance, boardConfidence: confidence, founderMoney: { ...moneyOf(platform), salaryPaid } } };

    /* a bonus the shareholders agreed */
    const bonus = record.pendingBonus || 0;
    if (bonus > 0) {
        const floor = getStreamingTeamCashFloor(platform).amount;
        const { pendingBonus: _gone, ...rest } = moneyOf(platform);
        platform = { ...platform, governance: { ...platform.governance, founderMoney: rest } };
        if (platform.treasuryCash - bonus >= floor) {
            player = { ...player, ownedStreamingPlatform: platform };
            player = payBonus(player, platform, bonus);
            platform = platformOf(player);
        }
    }

    /* the quarter's dividend, to every shareholder; a company that cannot pay it cuts it, and is punished */
    const dividend = platform.governance.dividend;
    const listing = isListed(platform) ? platform.publicCompany.listing : null;
    if (dividend && dividend.perShareQuarter > 0 && listing && absoluteWeek % STREAMING_DIVIDEND_WEEKS === 0 && dividend.lastPaidAbsoluteWeek !== absoluteWeek) {
        const total = Math.round(dividend.perShareQuarter * listing.sharesOutstanding);
        const floor = getStreamingTeamCashFloor(platform).amount;
        if (platform.treasuryCash - total < floor) {
            platform = {
                ...platform,
                governance: {
                    ...platform.governance,
                    boardConfidence: Math.max(0, platform.governance.boardConfidence - 3),
                    dividend: { ...dividend, perShareQuarter: 0 },
                    pendingPriceMoves: [...(platform.governance.pendingPriceMoves || []), { move: -0.05, reason: 'The dividend ended' }],
                },
            };
        } else {
            const founder = platform.founderOwnershipPercent;
            const yours = Math.round(total * founder / 100);
            const key = `streaming-dividend:${absoluteWeek}`;
            const money2 = moneyOf(platform);
            platform = {
                ...platform,
                treasuryCash: platform.treasuryCash - total,
                finance: { ...platform.finance, capitalActions: [...platform.finance.capitalActions, streamingCapitalAction(platform, key, 'DIVIDEND_PAID', absoluteWeek, total, -total, yours, founder, founder)] },
                governance: { ...platform.governance, dividend: { ...dividend, lastPaidAbsoluteWeek: absoluteWeek }, founderMoney: { ...money2, dividendsPaid: money2.dividendsPaid + yours } },
            };
            if (yours > 0) player = paid(player, yours, 'DIVIDEND', `Dividend from ${name}`);
        }
    }
    return save(player, platform);
};
