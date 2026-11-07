/**
 * #221: the estate over 5 years. A third way to pay on the death screen: 20 quarters at 4% a year, from the wallet. A payment
 * the wallet cannot cover sells shares for what is short; selling the company brings the rest due; it can be paid off.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Relationship } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { STREAMING_ESTATE_QUARTERS, payOffStreamingEstate, processStreamingEstatePlanWeek, streamingEstateQuarterly } from '../services/streamingEstatePlan';
import { getStreamingEstate } from '../services/streamingLegacy';
import { getStreamingYourMoneyView } from '../services/streamingYourMoney';
import { getStreamingDecisionView, queueStreamingDecisionEvents, streamingDecisionEventData } from '../services/streamingDecisionEvent';
import { continueThroughAppHandler } from './fixtures/legacySuccessionHandler';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const millions = (value: number) => `$${(value / 1e6).toFixed(1)}M`;
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
};
const events = (player: Player) => (player.pendingEvents || []).map(event => streamingDecisionEventData(event)).filter(Boolean);

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'estate', name: 'Estate Founder', age: 58, currentWeek: 1 });
    let parent = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    const child = { id: 'child_e', name: 'Aria Founder', relation: 'Child', closeness: 80, age: 28, gender: 'FEMALE', image: '', lastInteractionWeek: 0 } as Relationship;
    parent = { ...parent, money: 200_000_000, pendingEvents: [], relationships: [...(parent.relationships || []), child] };

    /* ── the choice ── */
    const estate = getStreamingEstate(parent, { estate: 'OVER_TIME' })!;
    assert.equal(estate.estate, 'OVER_TIME');
    assert.equal(estate.canPayCash, false, 'the heir cannot pay it at once');
    assert.equal(estate.cashPaid, 0, 'nothing now');
    assert.equal(estate.percentAfter, estate.stakePercent, 'and the shares are kept');
    assert.equal(estate.overTime.quarters, STREAMING_ESTATE_QUARTERS);
    assert.equal(estate.overTime.quarterly, streamingEstateQuarterly(estate.tax));
    assert.ok(Math.abs(estate.overTime.quarterly * 20 / estate.tax - 1.108) < 0.01, `4% a year over 5 years: ${estate.overTime.quarterly * 20 / estate.tax}`);
    pass(`a ${millions(estate.stakeValue)} stake owes ${millions(estate.tax)}: ${millions(estate.overTime.quarterly)} a quarter for 20 quarters, with ${millions(200_000_000 * 0.75)} in cash inherited`);

    /* ── the heir ── */
    const heir = continueThroughAppHandler({ ...copy(parent), flags: { ...parent.flags, isDead: true } } as Player, child, { estate: 'OVER_TIME' });
    const plan = platformOf(heir).governance.estatePlan!;
    assert.equal(plan.owed, estate.tax);
    assert.equal(plan.quartersLeft, 20);
    assert.equal(plan.nextDueAbsoluteWeek, getAbsoluteWeek(heir.age, heir.currentWeek) + 13);
    assert.equal(platformOf(heir).founderOwnershipPercent, estate.stakePercent, 'the stake stays whole');
    assert.equal(Math.round(heir.money), Math.round(200_000_000 * 0.75), 'and all the cash');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(heir)));
    assert.deepEqual(platformOf(reloaded).governance.estatePlan, plan, 'a reload keeps it');
    assert.ok(getStreamingYourMoneyView(heir)!.estate, 'Your money shows it');

    /* ── a payment the wallet covers: through the real week ── */
    let running: Player = { ...heir, money: 5_000_000_000 };
    running = later(running, 12);
    const beforeWeek = running.money;
    const paidUp = processStreamingEstatePlanWeek(later(running, 1));
    const afterPlan = platformOf(paidUp).governance.estatePlan!;
    assert.equal(Math.round(beforeWeek - paidUp.money), plan.quarterly, 'one quarter from the wallet');
    assert.equal(afterPlan.quartersLeft, 19);
    assert.equal(afterPlan.owed, plan.owed + Math.round(plan.owed * 0.01) - plan.quarterly, 'interest in, the payment off');
    assert.equal(afterPlan.nextDueAbsoluteWeek, plan.nextDueAbsoluteWeek + 13);
    assert.equal(platformOf(paidUp).founderOwnershipPercent, estate.stakePercent, 'no shares sold');
    assert.equal(processStreamingEstatePlanWeek(paidUp).money, paidUp.money, 'once');
    pass(`a quarter paid: ${millions(plan.quarterly)} from the wallet, ${afterPlan.quartersLeft} left, ${millions(afterPlan.owed)} still owed`);

    /* ── the week itself reaches it ── */
    const dueNextWeek = { ...platformOf(heir), governance: { ...platformOf(heir).governance, estatePlan: { ...plan, nextDueAbsoluteWeek: getAbsoluteWeek(heir.age, heir.currentWeek) + 1 } } };
    const closed = await processGameWeek({ ...heir, ownedStreamingPlatform: dueNextWeek, money: 5_000_000_000, energy: { current: 100, max: 100 }, pendingEvents: [], stats: { ...heir.stats, health: 100, happiness: 100 }, activeHealthConditions: [] });
    assert.equal(platformOf(closed.player).governance.estatePlan!.quartersLeft, 19, 'the weekly close pays it');

    /* ── a wallet too thin: warned, then shares ── */
    const thin: Player = { ...later(heir, 11), money: 1_000_000 };
    const warned = queueStreamingDecisionEvents({ ...thin, pendingEvents: [] }, getAbsoluteWeek(thin.age, thin.currentWeek));
    const warning = events(warned).find(data => data!.kind === 'ESTATE_SHORT')!;
    assert.ok(warning, 'two weeks before: a popup');
    assert.match(getStreamingDecisionView(warned, warning)!.title, /is due in 2 weeks/);
    assert.equal(getStreamingDecisionView({ ...warned, money: 5_000_000_000 }, warning), null, 'filled in time, it closes');
    const shortPlayer = { ...later(heir, 13), money: 1_000_000 };
    const forced = processStreamingEstatePlanWeek(shortPlayer);
    const forcedPlan = platformOf(forced).governance.estatePlan!;
    assert.equal(Math.round(forced.money), 0, 'the wallet goes first');
    assert.ok(platformOf(forced).founderOwnershipPercent < estate.stakePercent, 'then shares');
    assert.ok(forcedPlan.lastSold && forcedPlan.lastSold.amount === plan.quarterly - 1_000_000);
    assert.ok(platformOf(forced).governance.boardConfidence < platformOf(heir).governance.boardConfidence, 'the board marks it');
    const told = queueStreamingDecisionEvents({ ...forced, pendingEvents: [] }, getAbsoluteWeek(forced.age, forced.currentWeek));
    const soldEvent = events(told).find(data => data!.kind === 'ESTATE_SOLD')!;
    assert.match(getStreamingDecisionView(told, soldEvent)!.title, /% of your shares were sold/);
    pass(`too thin: a popup 2 weeks before; then ${forcedPlan.lastSold!.percent}% sold for ${millions(forcedPlan.lastSold!.amount)}, the board marks it, a popup says so`);

    /* ── paying it off ── */
    assert.equal(payOffStreamingEstate({ ...heir, money: 1_000 }).changed, false, 'not with an empty wallet');
    const off = payOffStreamingEstate({ ...heir, money: plan.owed + 10_000_000 });
    assert.ok(off.changed, off.message);
    assert.equal(Math.round(off.player.money), 10_000_000);
    assert.equal(platformOf(off.player).governance.estatePlan ?? null, null);
    assert.equal(getStreamingYourMoneyView(off.player)!.estate, null);
    pass('paid off at once for what is owed, with no more interest');

    /* ── sold: the rest falls due ── */
    const now = platformOf(heir);
    const soldOut: Player = { ...heir, money: plan.owed + 7_000_000, ownedStreamingPlatform: { ...now, lifecycle: 'SOLD', founderOwnershipPercent: 0 } };
    const settled = processStreamingEstatePlanWeek(soldOut);
    assert.equal(Math.round(settled.money), 7_000_000, 'out of what the sale paid');
    assert.equal(settled.ownedStreamingPlatform!.governance.estatePlan ?? null, null);
    pass('the company sold: the rest falls due at once');

    /* ── another death with it unpaid ── */
    const secondParent: Player = { ...copy(heir), flags: { ...heir.flags, isDead: true } } as Player;
    const second = getStreamingEstate(secondParent, { estate: 'SELL_SHARES' })!;
    const fresh = getStreamingEstate({ ...copy(secondParent), ownedStreamingPlatform: { ...platformOf(secondParent), governance: { ...platformOf(secondParent).governance, estatePlan: null } } }, { estate: 'SELL_SHARES' })!;
    assert.equal(second.tax, fresh.tax + plan.owed, 'what was unpaid falls due with the new bill');
    assert.ok(second.percentIfSold < fresh.percentIfSold, 'and takes more shares');
    pass('a second death: the unpaid part joins the new bill');

    console.log(`Estate over time audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
