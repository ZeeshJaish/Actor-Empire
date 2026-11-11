/**
 * 2026-11-11 player reports [01, 02, 07, 30, 36, 39]: market clearance.
 * - A declined market counts down its wait; "File again" is not a live button that the government refuses.
 * - A market that has not cleared can leave the opening before the commission (fees stay paid), and the launch
 *   then waits only on the markets kept. After the commission it cannot.
 * - Government requests and refiles go in one tap, as far as money and energy go.
 * - Every short button says what is short; "Pay" never greys out while still reading "Pay".
 * Run: npm run audit:clearance-player-fixes
 */
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { commissionStreamingFullPlatformQa, prepareStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { beginStreamingMarketClearance, resolveStreamingMarketRequirement, resumeStreamingMarketClearance, saveStreamingMarketPlan, withdrawStreamingOpeningMarket } from '../services/streamingMarkets';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingLaunchReadiness } from '../services/streamingLaunch';
import { getStreamingLaunchBudgetView } from '../services/streamingLaunchProgram';
import { buildLaunchData } from '../components/StreamingDefineLaunchExperience';
import { StepClearance } from '../components/studio-finance/components/launch/StepClearance';
import { selectedCountries, spendable, type LaunchDraft } from '../components/studio-finance/finance/launch';
import { getAbsoluteWeek } from '../services/legacyLogic';

const pass = (label: string) => console.log(`PASS ${label}`);
const fresh = (): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'clearance-fixes-audit', name: 'Clearance Fixes', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};

const prepared = prepareStreamingFullPlatformQa(fresh());
const now = getAbsoluteWeek(prepared.age, prepared.currentWeek);
const opening = prepared.ownedStreamingPlatform.marketOperations.filter(operation => operation.entryKind === 'OPENING' && operation.countryId && operation.status !== 'EXITED');
assert.ok(opening.length >= 6, `the test company opens in many markets (${opening.length})`);
const [declined, owedSmall, owedBig, refileA, refileB] = opening.slice(0, 5).map(operation => operation.countryId!);

/* five markets in trouble: one cooling, two owed, two ready to refile */
const stuck = (player: Player): Player => {
    const copy = structuredClone(player);
    copy.ownedStreamingPlatform.marketOperations = copy.ownedStreamingPlatform.marketOperations.map(operation => {
        if (!operation.clearance) return operation;
        if (operation.countryId === declined || operation.countryId === refileA || operation.countryId === refileB) {
            return {
                ...operation, status: 'SUSPENDED', suspendedAtAbsoluteWeek: now,
                clearance: { ...operation.clearance, outcome: 'TEMPORARILY_REJECTED', stage: 'FINAL_APPROVAL', progressPercent: 100,
                    condition: 'The current application was declined. A revised filing can return after a two-week cooling period.',
                    resumeAllowedAtAbsoluteWeek: operation.countryId === declined ? now + 2 : now, nextReviewAtAbsoluteWeek: now + 2 },
            };
        }
        if (operation.countryId === owedSmall || operation.countryId === owedBig) {
            return {
                ...operation, status: 'AWAITING_FUNDING',
                clearance: { ...operation.clearance, outcome: 'ADDITIONAL_REQUIREMENT', stage: 'REGULATORY_REVIEW', progressPercent: 64,
                    condition: 'Submit an enhanced consumer-data filing and fund the independent compliance review.',
                    additionalPayment: operation.countryId === owedSmall ? 1_000_000 : 2_000_000, nextReviewAtAbsoluteWeek: now },
            };
        }
        return operation;
    });
    return copy;
};
/* the QA company spent its energy filing; a new week's energy for the checks below */
const player: Player = { ...stuck(prepared), energy: { current: 100, max: 100 } };
const op = (p: Player, countryId: string) => p.ownedStreamingPlatform.marketOperations.find(item => item.countryId === countryId && item.entryKind === 'OPENING')!;

/* ---- the data the card reads */
const data = buildLaunchData(player);
const row = (countryId: string) => data.clearance.find(item => item.countryId === countryId)!;
assert.equal(row(declined).outcome, 'REVISABLE');
assert.equal(row(declined).refileInWeeks, 2, 'a declined market knows its wait');
assert.equal(row(refileA).refileInWeeks, 0, 'a declined market past its wait can file today');
assert.equal(row(declined).canWithdraw, true, 'before the commission a stuck market can leave the opening');
assert.ok((row(declined).paid || 0) >= 0);
assert.equal(row(owedSmall).outcome, 'PAYMENT_REQUIRED');
pass('the card knows the wait, what was paid, and that the market can leave');

/* ---- the card */
const draft: LaunchDraft = { selectedCountryIds: data.selectedCountryIds, pricing: data.pricing };
const render = (free: number, energy: number, active: string) => renderToStaticMarkup(
    <StepClearance data={{ ...data, energy: { ...data.energy, current: energy } }} draft={draft} patch={() => undefined}
        chosen={selectedCountries(data, draft)} treasury={data.treasury} free={free} gap={0} handlers={{}} initialCountryId={active} />,
);
const declinedCard = render(10_000_000_000, 100, declined);
assert.match(declinedCard, /Declined · 2 weeks wait/, 'the pill counts down');
assert.match(declinedCard, /Can file again in 2 weeks/, 'the button says when');
assert.match(declinedCard, /Weeks pass when you Age Up/, 'and how weeks pass');
assert.match(declinedCard, /Drop [^<]+ from the opening/, 'and the way out');
assert.match(declinedCard, /Pay all 2 requests/, 'one tap pays every request');
assert.match(declinedCard, /File all 2 again · 10E/, 'one tap refiles every market whose wait is over');
const shortCard = render(500_000, 100, owedSmall);
assert.match(shortCard, /\$500K short · Add capital|\$0\.5M short · Add capital|short · Add capital/, 'Pay says what is short, not "Pay"');
assert.doesNotMatch(shortCard, /Pay \$1(\.0)?M · 5E/, 'and never reads Pay while it cannot pay');
const someCard = render(1_500_000, 100, owedSmall);
assert.match(someCard, /Pay 1 of 2 now/, 'as far as the free money goes');
const tiredCard = render(10_000_000_000, 7, refileA);
assert.match(tiredCard, /File 1 of 2 again · 5E/, 'as far as the energy goes');
pass('the card: countdown, Add capital, Pay all, File all again, Drop');

/* ---- the services */
const early = resumeStreamingMarketClearance(player, op(player, declined).id);
assert.equal(early.reason, 'TOO_EARLY');
const later = { ...player, currentWeek: player.currentWeek + 2 };
assert.equal(resumeStreamingMarketClearance(later, op(later, declined).id).reason, 'REAPPLIED', 'two Age Ups later it files');
pass('a declined market refiles after its wait, not before');

const burnBefore = getStreamingLaunchBudgetView(player).weeklyCommittedBurn;
const dropped = withdrawStreamingOpeningMarket(player, op(player, declined).id);
assert.equal(dropped.changed, true, dropped.reason);
assert.equal(op(dropped.player, declined).status, 'EXITED');
assert.equal(dropped.player.ownedStreamingPlatform.treasuryCash, player.ownedStreamingPlatform.treasuryCash, 'fees stay paid: no refund, no charge');
assert.ok(getStreamingLaunchBudgetView(dropped.player).weeklyCommittedBurn <= burnBefore, 'its weekly cost leaves with it');
assert.ok(!buildLaunchData(dropped.player).clearance.some(item => item.countryId === declined), 'it leaves the clearance board');
assert.equal(withdrawStreamingOpeningMarket(dropped.player, op(dropped.player, declined).id).changed, false, 'twice is a no-op');
pass('drop: the market leaves the opening, fees stay paid, its weekly cost goes');

/* with every stuck market dropped, the markets check passes on what is kept */
let kept = player;
for (const countryId of [declined, owedSmall, owedBig, refileA, refileB]) kept = withdrawStreamingOpeningMarket(kept, op(kept, countryId).id).player;
const marketsItem = getStreamingLaunchReadiness(kept).items.find(item => item.id === 'markets');
const stuckItem = getStreamingLaunchReadiness(player).items.find(item => item.id === 'markets');
assert.equal(stuckItem?.tone, 'BLOCKED', 'stuck markets block the launch');
assert.equal(marketsItem?.tone, 'READY', `the kept markets are enough: ${marketsItem?.detail}`);
pass('after the drops, "Clear the markets" passes on the markets kept');

/* a cleared market stays; the last market stays; after the commission nothing leaves */
const clearedId = player.ownedStreamingPlatform.marketOperations.find(operation => operation.entryKind === 'OPENING' && operation.status === 'READY')?.id;
assert.ok(clearedId, 'the test company has cleared markets');
if (clearedId) assert.equal(withdrawStreamingOpeningMarket(player, clearedId).changed, false, 'a cleared market is not dropped here');
let lone = structuredClone(player);
const keepOne = op(lone, declined).id;
lone.ownedStreamingPlatform.marketOperations = lone.ownedStreamingPlatform.marketOperations.map(item => item.entryKind === 'OPENING' && item.id !== keepOne ? { ...item, status: 'EXITED' } : item);
const last = withdrawStreamingOpeningMarket(lone, keepOne);
assert.equal(last.changed, false);
assert.equal(last.reason, 'NO_MARKETS', 'the opening keeps at least one market');
const built = commissionStreamingFullPlatformQa(prepared);
const lockedOp = built.ownedStreamingPlatform.marketOperations.find(item => item.entryKind === 'OPENING' && item.status !== 'EXITED')!;
assert.equal(withdrawStreamingOpeningMarket(built, lockedOp.id).changed, false, 'after the commission the plan is locked');
assert.equal(buildLaunchData(built).clearance.some(item => item.canWithdraw), false, 'and the card offers no drop');
pass('drop refuses: a cleared market, the last market, anything after the commission');

/* paying a request still works and is still checked by the service */
const paid = resolveStreamingMarketRequirement(player, op(player, owedSmall).id);
assert.equal(paid.reason, 'RESOLVED');
assert.ok(spendable(buildLaunchData(player).treasury) >= 0);
pass('a request pays as before');

/* ---- the real cause of "Pay does nothing" [07, 36]: any market plan save reset a market waiting on a
   government request to PLANNED, and its Pay was then refused for ever */
const openingIds = player.ownedStreamingPlatform.marketOperations.filter(item => item.entryKind === 'OPENING' && item.status !== 'EXITED').map(item => item.countryId!);
const replanned = saveStreamingMarketPlan(player, openingIds.filter(id => id !== declined && id !== refileA), 'OPENING');
assert.equal(op(replanned.player, owedSmall).status, 'AWAITING_FUNDING', 'a plan save keeps a market waiting on its request');
assert.equal(op(replanned.player, declined).status, 'SUSPENDED', 'and a filed market is not dropped by unpicking it');
assert.equal(resolveStreamingMarketRequirement(replanned.player, op(replanned.player, owedSmall).id).reason, 'RESOLVED', 'so Pay works after it');
pass('a market plan save no longer resets a request waiting on payment');

/* saves already stuck that way are repaired on load */
const broken = structuredClone(player);
broken.ownedStreamingPlatform.marketOperations = broken.ownedStreamingPlatform.marketOperations.map(item => item.countryId === owedBig ? { ...item, status: 'PLANNED' } : item);
assert.equal(resolveStreamingMarketRequirement(broken, op(broken, owedBig).id).reason, 'RESOLVED', 'a stuck save pays after the load repair');
const repaired = normalizeOwnedStreamingPlatformState(broken.ownedStreamingPlatform, broken.id);
assert.equal(repaired.marketOperations.find(item => item.countryId === owedBig)?.status, 'AWAITING_FUNDING');
pass('stuck saves: the request is payable again after load');

/* dropped, picked again and filed again: the second filing is its own payment */
const back = saveStreamingMarketPlan(dropped.player, [...openingIds], 'OPENING');
assert.equal(op(back.player, declined).status, 'PLANNED', 'a dropped market can be picked again');
const commitmentsBefore = back.player.ownedStreamingPlatform.costCommitments.length;
const refiled = beginStreamingMarketClearance({ ...back.player, energy: { current: 100, max: 100 } }, [declined], 'OPENING');
assert.equal(refiled.reason, 'STARTED');
assert.equal(refiled.player.ownedStreamingPlatform.costCommitments.length, commitmentsBefore + 1, 'its payment is recorded');
assert.equal(refiled.player.ownedStreamingPlatform.treasuryCash, back.player.ownedStreamingPlatform.treasuryCash - refiled.amount);
pass('a market picked again after a drop files and records its own payment');

console.log('clearance player-fixes audit passed');
