/**
 * #209: your own money from the company: the table in plan §23.10.
 */
import { atTheTable } from './fixtures/atTheTable';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { commitStreamingPublicMarketWeek, getStreamingEquityValuation, getStreamingOwnTicker } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingTeamCashFloor } from '../services/team/teamState';
import { valueOwnedStreamingPlatform } from '../services/valuation/streamingValuation';
import { stepDownFromStreamingCompany } from '../services/streamingStepDown';
import { nameStreamingTeamSuccessor } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    STREAMING_DIVIDEND_WEEKS,
    getStreamingYourMoneyView,
    payStreamingFounderBonus,
    processStreamingFounderMoneyWeek,
    setStreamingDividend,
    setStreamingFounderSalary,
    streamingCeoMarketPay,
    takeStreamingMoneyOut,
} from '../services/streamingYourMoney';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const worth = (player: Player) => getStreamingEquityValuation(platformOf(player));
const millions = (value: number) => `$${(value / 1e6).toFixed(1)}M`;
/* everyone but the founder bought out, by hand */
const sole = (player: Player): Player => withPlatform(player, platform => ({ ...platform, founderOwnershipPercent: 100, finance: { ...platform.finance, equityHolders: [] } }));

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'your-money', name: 'Money Founder', age: 40, currentWeek: 1 });
    let base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    base = { ...base, energy: { current: 100, max: 100 }, pendingEvents: [], money: 1e8 };
    const floor = getStreamingTeamCashFloor(platformOf(base)).amount;
    const treasury = platformOf(base).treasuryCash;

    /* ── private, 100% yours: any amount, to the floor ── */
    const mine = sole(base);
    const view = getStreamingYourMoneyView(mine)!;
    assert.equal(view.takeOut.allowed, true);
    assert.equal(view.takeOut.mostToYou, Math.round(treasury - floor), 'all of it, to the floor');
    const out = takeStreamingMoneyOut(mine, 100_000_000);
    assert.ok(out.changed, out.message);
    assert.equal(out.player.money, mine.money + 100_000_000, 'yours');
    assert.equal(platformOf(out.player).treasuryCash, treasury - 100_000_000, 'out of the treasury');
    assert.equal(worth(mine) - worth(out.player), 100_000_000, 'the value falls by exactly as much');
    const greedy = takeStreamingMoneyOut(mine, treasury);
    assert.ok(!greedy.changed && /weeks of costs/.test(greedy.message), 'never under the floor');
    pass(`private, all yours: $100M out, the value down exactly $100M; up to ${millions(view.takeOut.mostToYou)} before the floor of ${millions(floor)}`);

    /* ── private, others hold shares: a dividend to everyone ── */
    const founder = platformOf(base).founderOwnershipPercent;
    assert.ok(founder >= 51 && founder < 100, 'the test company has investors');
    const shared = takeStreamingMoneyOut(base, 79_000_000);
    assert.ok(shared.changed, shared.message);
    const leaves = Math.round(79_000_000 / (founder / 100));
    assert.equal(treasury - platformOf(shared.player).treasuryCash, leaves, '$79M to you costs the company more: everyone is paid');
    assert.equal(shared.player.money, base.money + 79_000_000);
    const minority = withPlatform(base, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 5 } }));
    const refused = atTheTable(minority, takeStreamingMoneyOut(minority, 1_000_000), next => takeStreamingMoneyOut(next, 1_000_000));
    assert.ok(!refused.carried, 'under 51% the board decides, and an unhappy one says no');
    assert.match(takeStreamingMoneyOut(refused.player, 1_000_000).message, /said no/, 'and will not hear it again for a while');
    const trusted = withPlatform(minority, platform => ({ ...platform, governance: { ...platform.governance, boardConfidence: 100 } }));
    const agreed = atTheTable(trusted, takeStreamingMoneyOut(trusted, 1_000_000), next => takeStreamingMoneyOut(next, 1_000_000));
    assert.ok(agreed.carried && agreed.done?.changed, 'a board that trusts you agrees');
    pass(`with other holders: $79M to you at ${founder.toFixed(1)}% takes ${millions(leaves)} from the treasury; under 51% it is the board's`);

    /* ── a salary ── */
    const market = streamingCeoMarketPay(platformOf(base));
    const salaried = setStreamingFounderSalary(mine, 500_000);
    assert.ok(salaried.changed, salaried.message);
    const beforeCash = platformOf(salaried.player).treasuryCash;
    const beforeEarnings = valueOwnedStreamingPlatform(platformOf(salaried.player)).margin;
    const week = processStreamingFounderMoneyWeek(salaried.player);
    assert.equal(platformOf(week).treasuryCash, beforeCash - 500_000, 'it comes out of the company');
    assert.equal(week.money, salaried.player.money + 500_000, 'and into your wallet');
    assert.ok(week.finance.history.some(item => item.category === 'SALARY' && item.amount === 500_000), 'as income, for the tax');
    assert.ok(valueOwnedStreamingPlatform(platformOf(week)).margin < beforeEarnings, 'it is a cost: the margin falls');
    assert.equal(getStreamingYourMoneyView(week)!.thisYear.salary, 500_000);
    assert.equal(getStreamingYourMoneyView(week)!.thisYear.tax, 75_000, '15%');
    /* under 51%, the board's */
    const minorSalary = setStreamingFounderSalary(minority, market * 3);
    assert.ok(!minorSalary.changed && minorSalary.vote, 'more than the market goes to a board vote');
    assert.ok(setStreamingFounderSalary(minority, market).changed, 'up to the market');
    /* above the market, with others holding: the board starts to mind */
    const bigPay = setStreamingFounderSalary(base, market * 3);
    assert.ok(bigPay.changed, 'at 51% it is yours');
    let quarter = bigPay.player;
    while (getAbsoluteWeek(quarter.age, quarter.currentWeek) % 13 !== 0) quarter = later(quarter);
    const boardBefore = platformOf(quarter).governance.boardConfidence;
    assert.equal(platformOf(processStreamingFounderMoneyWeek(quarter)).governance.boardConfidence, boardBefore - 2, 'the board minds');
    pass(`salary: $500K a week out of the company and into your wallet, a cost, 15% tax; under 51% up to ${millions(market)}; above the market the board minds`);

    /* ── a bonus ── */
    const bonus = payStreamingFounderBonus(mine, 50_000_000);
    assert.ok(bonus.changed, bonus.message);
    assert.equal(bonus.player.money, mine.money + 50_000_000);
    assert.equal(platformOf(bonus.player).treasuryCash, treasury - 50_000_000);
    assert.ok(valueOwnedStreamingPlatform(platformOf(bonus.player)).margin < valueOwnedStreamingPlatform(platformOf(mine)).margin, 'a cost, like a salary');
    assert.ok(!payStreamingFounderBonus(mine, treasury).changed, 'never under the floor');
    pass('a bonus: $50M, a cost, never under the floor');

    /* ── stepping down ── */
    const holder = streamingTeamSeatHolders(platformOf(salaried.player).leadership.appointments).holders.get('MONEY')!;
    const named = nameStreamingTeamSuccessor(salaried.player, 'EXECUTIVE', holder.executiveId).player;
    const chair = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR').player;
    assert.equal(processStreamingFounderMoneyWeek(chair).money, chair.money + 125_000, 'a chair takes a quarter');
    assert.ok(!setStreamingFounderSalary(chair, 900_000).changed, 'and cannot set it');
    const left = stepDownFromStreamingCompany(named, 'LEAVE_BOARD').player;
    assert.equal(processStreamingFounderMoneyWeek(left).money, left.money, 'off the board, nothing');
    assert.ok(!takeStreamingMoneyOut(left, 1_000_000).changed, 'and no taking out');
    pass('stepping down: a chair takes a quarter; off the board nothing but dividends');

    /* ── listed ── */
    const listed = listStreamingCompanyForQa(base, { ticker: 'MINE' });
    assert.ok(listed.changed, listed.reason);
    const public1 = { ...listed.player, money: 1e8 };
    assert.ok(!takeStreamingMoneyOut(public1, 1_000_000).changed, 'listed: no direct withdrawal');
    assert.equal(getStreamingYourMoneyView(public1)!.takeOut.allowed, false);
    /* the board agrees a little; more is a vote */
    const asks = streamingCeoMarketPay(platformOf(public1)) * 5;
    const voted = setStreamingFounderSalary(public1, asks);
    assert.ok(!voted.changed && voted.vote, 'a big rise goes to the shareholders');
    assert.equal(platformOf(voted.player).governance.founderMoney?.weeklySalary ?? 0, 0, 'nothing changes yet');
    const counted = atTheTable(public1, voted, next => setStreamingFounderSalary(next, asks));
    assert.equal(counted.meeting.mode, 'HOLDERS', 'they are counted by percent');
    if (counted.carried) assert.equal(platformOf(counted.done!.player).governance.founderMoney?.weeklySalary, asks, 'carried: it is your salary');
    else assert.equal(platformOf(counted.player).governance.founderMoney?.weeklySalary ?? 0, 0, 'not carried: it stays');
    pass(`listed: no withdrawal; a salary of ${millions(asks)} went to the shareholders (${counted.forPercent}% for: ${counted.carried ? 'carried' : 'not carried'})`);

    /* ── the dividend ── */
    const raised = setStreamingDividend(public1, 0.25);
    assert.ok(raised.changed, raised.message);
    const ticker = getStreamingOwnTicker(raised.player)!;
    assert.ok(ticker.dividendYield > 0, 'the yield shows in the Stocks app');
    const snapshot = { ...platformOf(raised.player).weeklyHistory.at(-1)!, absoluteWeek: getAbsoluteWeek(raised.player.age, raised.player.currentWeek) + 1 };
    const plain = commitStreamingPublicMarketWeek(platformOf(public1), public1, snapshot);
    const up = commitStreamingPublicMarketWeek(platformOf(raised.player), raised.player, snapshot);
    assert.ok(up.publicCompany.quoteHistory.at(-1)!.close > plain.publicCompany.quoteHistory.at(-1)!.close, 'a raise lifts the price');
    assert.ok(up.publicCompany.quoteHistory.at(-1)!.drivers.includes('A dividend raised'));
    assert.equal(up.governance.pendingPriceMoves?.length || 0, 0, 'once');
    const cutting = setStreamingDividend({ ...raised.player, ownedStreamingPlatform: up }, 0.05);
    assert.ok(cutting.changed);
    const down = commitStreamingPublicMarketWeek(platformOf(cutting.player), cutting.player, { ...snapshot, absoluteWeek: snapshot.absoluteWeek + 1 });
    const flat = commitStreamingPublicMarketWeek(up, raised.player, { ...snapshot, absoluteWeek: snapshot.absoluteWeek + 1 });
    assert.ok(down.publicCompany.quoteHistory.at(-1)!.close < flat.publicCompany.quoteHistory.at(-1)!.close, 'a cut hurts it');
    /* the quarter pays */
    let due = raised.player;
    while (getAbsoluteWeek(due.age, due.currentWeek) % STREAMING_DIVIDEND_WEEKS !== 0) due = later(due);
    const shares = platformOf(due).publicCompany.listing!.sharesOutstanding;
    const total = Math.round(0.25 * shares);
    const dueFounder = platformOf(due).founderOwnershipPercent;
    const paidOut = processStreamingFounderMoneyWeek(due);
    assert.equal(platformOf(due).treasuryCash - platformOf(paidOut).treasuryCash, total, 'out of the treasury, to every shareholder');
    assert.equal(paidOut.money - due.money, Math.round(total * dueFounder / 100), 'your share comes to you');
    assert.ok(paidOut.finance.history.some(item => item.category === 'DIVIDEND'), 'as income');
    /* not again the same week */
    assert.equal(processStreamingFounderMoneyWeek(paidOut).money, paidOut.money, 'once a quarter');
    /* a company that cannot pay it */
    const skint = withPlatform(due, platform => ({ ...platform, treasuryCash: getStreamingTeamCashFloor(platform).amount + 1 }));
    const cannot = processStreamingFounderMoneyWeek(skint);
    assert.equal(platformOf(cannot).governance.dividend?.perShareQuarter, 0, 'cannot pay: it ends');
    assert.ok((platformOf(cannot).governance.pendingPriceMoves || []).some(item => item.reason === 'The dividend ended'), 'and the market hears');
    /* under 51%: the board */
    const minorListed = withPlatform(public1, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 45 } }));
    assert.ok(setStreamingDividend(minorListed, 0.25).vote, 'under 51%, the board votes');
    pass(`the dividend: $0.25 a share is ${ticker.dividendYield}% a year; ${millions(total)} a quarter, ${millions(total * dueFounder / 100)} to you; a raise lifts the price, a cut hurts it; a company that cannot pay ends it`);

    console.log(`Your money audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
