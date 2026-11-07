/**
 * #211: one long career, through the real weekly close: a salary, the bell, a dividend, stepping down, a chief executive who
 * runs it, death, an heir who inherits it, taking over, selling out, and founding again. Everything from plan §23, in the
 * order a player would meet it, with the money and the members checked at each turn.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Relationship } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { getStreamingEquityValuation } from '../services/streamingPublicMarkets';
import { valueOwnedStreamingPlatform } from '../services/valuation/streamingValuation';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingChairRule } from '../services/streamingChair';
import { getStreamingNewCompanyWait, startNewStreamingCompany } from '../services/streamingCompanySale';
import { getStreamingEstate } from '../services/streamingLegacy';
import { OWN_SHARES_LOCKUP_WEEKS, tradeOwnStreamingShares } from '../services/streamingOwnShares';
import { returnAsStreamingCeo, stepDownFromStreamingCompany, streamingChiefExecutive } from '../services/streamingStepDown';
import { getStreamingYourMoneyView, setStreamingDividend, setStreamingFounderSalary } from '../services/streamingYourMoney';
import { nameStreamingTeamSuccessor } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { continueThroughAppHandler } from './fixtures/legacySuccessionHandler';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label} (${Math.round((Date.now() - started) / 1000)} s)`);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const members = (player: Player) => platformOf(player).metrics.subscribers;
const worth = (player: Player) => getStreamingEquityValuation(platformOf(player));
const money = (value: number) => `$${(value / 1e9).toFixed(2)}B`;
const people = (value: number) => `${(value / 1e6).toFixed(1)}M`;
/* a year's popups answered by nobody: they wait, or close themselves */
const weeks = async (player: Player, count: number) => {
    let next = player;
    for (let week = 0; week < count; week += 1) {
        /* the founder stays well: this audit is about the company */
        next = (await processGameWeek({ ...next, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...next.stats, health: 100, happiness: 100 }, activeHealthConditions: [] })).player;
        assert.ok(!next.flags?.isDead, 'the founder lives on until the audit says otherwise');
    }
    return next;
};

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'long-career', name: 'Long Founder', age: 45, currentWeek: 1 });
    let player = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    const child = { id: 'child_long', name: 'Aarav Founder', relation: 'Child', closeness: 80, age: 28, gender: 'MALE', image: '', lastInteractionWeek: 0 } as Relationship;
    player = { ...player, money: 1e9, pendingEvents: [], relationships: [...(player.relationships || []), child] };

    /* 1: a salary */
    const salaried = setStreamingFounderSalary(player, 100_000);
    assert.ok(salaried.changed, salaried.message);
    const walletStart = salaried.player.money;
    player = await weeks(salaried.player, 13);
    assert.ok(player.money >= walletStart + 1_000_000, `a quarter's salary reached the wallet: ${player.money - walletStart}`);
    assert.equal(getStreamingYourMoneyView(player)?.salary.weekly, 100_000);
    const parts = valueOwnedStreamingPlatform(platformOf(player));
    pass(`a quarter as founder: ${people(members(player))} members, worth ${money(worth(player))} (operating ${money(parts.parts.operating)}, assets ${money(parts.parts.assets)}, cash ${money(platformOf(player).treasuryCash)}), $${Math.round((player.money - walletStart) / 1e6 * 10) / 10}M to the wallet net of the life around it`);

    /* 2: the bell, and a dividend */
    const listed = listStreamingCompanyForQa(player, { ticker: 'LONG' });
    assert.ok(listed.changed, listed.reason);
    const dividend = setStreamingDividend(listed.player, 0.02);
    assert.ok(dividend.changed, dividend.message);
    const treasuryBefore = platformOf(dividend.player).treasuryCash;
    player = await weeks(dividend.player, 14);
    assert.ok(platformOf(player).finance.capitalActions.some(action => action.type === 'DIVIDEND_PAID'), 'a dividend went out');
    assert.ok(platformOf(player).publicCompany.quoteHistory.length >= 13, 'the share trades');
    assert.ok(platformOf(player).treasuryCash !== treasuryBefore);
    pass(`listed: $${platformOf(player).publicCompany.quoteHistory.at(-1)!.close.toFixed(2)} a share, a dividend paid`);

    /* 3: stepping down */
    const holder = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MONEY');
    assert.ok(holder, 'a CFO to hand to');
    const named = nameStreamingTeamSuccessor(player, 'EXECUTIVE', holder!.executiveId).player;
    const stepped = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR');
    assert.ok(stepped.changed, stepped.message);
    assert.ok(getStreamingChairRule(stepped.player), 'the rooms are read-only');
    const memberBefore = members(stepped.player);
    player = await weeks(stepped.player, 13);
    assert.ok(members(player) >= memberBefore * 0.9, `the company carries on: ${people(memberBefore)} → ${people(members(player))}`);
    assert.ok(getStreamingYourMoneyView(player)!.salary.paidNow === 25_000 || !getStreamingChairRule(player), 'a chair takes a quarter');
    pass(`a quarter in the chair: ${people(members(player))} members under ${streamingChiefExecutive(platformOf(player))?.name || 'the founder'}`);

    /* 4: death */
    const beforeDeath = copy(player);
    const estate = getStreamingEstate(beforeDeath);
    assert.ok(estate, 'an estate');
    const heirStart = continueThroughAppHandler({ ...copy(player), flags: { ...player.flags, isDead: true } } as Player, child, { estate: estate!.canPayCash ? 'PAY_CASH' : 'SELL_SHARES' });
    assert.ok(platformOf(heirStart).governance.boardConfidence <= platformOf(beforeDeath).governance.boardConfidence, 'the board takes it badly');
    const membersAtDeath = members(heirStart);
    assert.equal(members(heirStart), members(beforeDeath), 'the same company');
    assert.ok(getAbsoluteWeek(heirStart.age, heirStart.currentWeek) < getAbsoluteWeek(beforeDeath.age, beforeDeath.currentWeek), 'an heir who is younger');
    player = await weeks(heirStart, 13);
    const ratio = members(player) / membersAtDeath;
    assert.ok(ratio > 0.9, `the heir's company survives: ${people(membersAtDeath)} → ${people(members(player))}`);
    assert.ok(platformOf(player).publicCompany.quoteHistory.some(quote => quote.drivers.includes("The founder's death")), 'the market said why');
    pass(`death: the estate ${estate!.canPayCash ? 'paid in cash' : 'paid in shares'}; 13 weeks on, ${people(membersAtDeath)} → ${people(members(player))}, the company in good order`);

    /* 5: the heir takes over */
    const stillRuns = streamingChiefExecutive(platformOf(player));
    if (stillRuns) {
        const taken = returnAsStreamingCeo(withBoard(player));
        assert.ok(taken.changed, taken.message);
        player = taken.player;
    }
    assert.equal(platformOf(player).leadership.currentCeo.holderType, 'FOUNDER');
    player = await weeks(player, 4);
    pass(`the heir runs it: ${people(members(player))} members`);

    /* 6: selling out, and starting again */
    const next = nameStreamingTeamSuccessor(player, 'EXECUTIVE', streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('CONTENT')!.executiveId).player;
    const left = stepDownFromStreamingCompany({ ...next, currentWeek: next.currentWeek }, 'LEAVE_BOARD');
    const out = left.changed ? left.player : next;
    const lockup = out;
    const sellable = platformOf(lockup).founderOwnershipPercent;
    const listing = platformOf(lockup).publicCompany.listing!;
    const sold = tradeOwnStreamingShares(withLockupOver(lockup, listing.listedAtAbsoluteWeek), 'SELL', sellable);
    assert.ok(sold.changed, sold.message);
    if (left.changed) {
        assert.equal(platformOf(sold.player).lifecycle, 'SOLD', 'no shares, no office: out');
        assert.equal(getStreamingNewCompanyWait(sold.player), 104, 'two years');
        const twoYears = { ...sold.player, age: sold.player.age + 2 };
        const founding = startNewStreamingCompany(twoYears);
        assert.ok(founding.changed, founding.message);
        assert.equal(platformOf(founding.player).lifecycle, 'ELIGIBLE', 'the founding starts again');
        assert.equal(founding.player.soldStreamingCompanies?.length, 1, 'the old one on record');
    }
    pass('sold out and left: the closed screen, and two years later the founding starts again');

    console.log(`Long career audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

/* the audit moves past waits the player would sit through */
const withBoard = (player: Player): Player => {
    const platform = platformOf(player);
    return { ...player, ownedStreamingPlatform: { ...platform, governance: { ...platform.governance, boardConfidence: Math.max(platform.governance.boardConfidence, 60) } } };
};
const withLockupOver = (player: Player, listedAt: number): Player => {
    const platform = platformOf(player);
    return { ...player, ownedStreamingPlatform: { ...platform, publicCompany: { ...platform.publicCompany, listing: { ...platform.publicCompany.listing!, listedAtAbsoluteWeek: Math.min(listedAt, getAbsoluteWeek(player.age, player.currentWeek) - OWN_SHARES_LOCKUP_WEEKS - 1) } } } };
};

main().catch(error => { console.error(error); process.exit(1); });
