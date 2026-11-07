/**
 * #207: what your death does to the company, through the app's own handoff.
 *  - The estate: 25% of the stake's value, from the cash inherited (if it covers it), or a quarter of the shares.
 *  - Who runs it: a chief executive in place stays; if you ran it, at 51% the heir chooses, under it the board picks.
 *  - The reaction: the board −5; listed, −3 to −8%, "The founder's death", once. The news names who runs it.
 *  - A company you sold stays sold, and `soldStreamingCompanies` carries over.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Relationship } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { commitStreamingPublicMarketWeek } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingEstate } from '../services/streamingLegacy';
import { getStreamingChairRule } from '../services/streamingChair';
import { getStreamingNewCompanyWait } from '../services/streamingCompanySale';
import { returnAsStreamingCeo, stepDownFromStreamingCompany, streamingChiefExecutive } from '../services/streamingStepDown';
import { nameStreamingTeamSuccessor, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { continueThroughAppHandler } from './fixtures/legacySuccessionHandler';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: ReturnType<typeof platformOf>) => ReturnType<typeof platformOf>): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const money = (value: number) => (value >= 1e9 ? `$${(value / 1e9).toFixed(2)}B` : `$${Math.round(value / 1e6)}M`);
const dead = (player: Player): Player => ({ ...copy(player), flags: { ...player.flags, isDead: true } } as Player);

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'death-rules', name: 'Old Founder', age: 58, currentWeek: 1 });
    let base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });
    const child = { id: 'child_rule', name: 'Aarav Founder', relation: 'Child', closeness: 80, age: 30, gender: 'MALE', image: '', lastInteractionWeek: 0 } as Relationship;
    base = { ...base, energy: { current: 100, max: 100 }, pendingEvents: [], money: 20e9, relationships: [...(base.relationships || []), child] };
    const stake = platformOf(base).founderOwnershipPercent;
    const board = platformOf(base).governance.boardConfidence;

    /* ── the estate ── */
    const estate = getStreamingEstate(base)!;
    assert.equal(estate.tax, Math.round(estate.stakeValue * 0.25), '25% of the stake');
    assert.ok(estate.canPayCash, 'the cash covers it');
    const cash = continueThroughAppHandler(dead(base), child, { estate: 'PAY_CASH' });
    assert.equal(cash.money, estate.inheritedMoney - estate.tax, 'paid from the cash inherited');
    assert.equal(platformOf(cash).founderOwnershipPercent, stake, 'and the shares stay');
    const sold = continueThroughAppHandler(dead(base), child, { estate: 'SELL_SHARES' });
    assert.equal(sold.money, estate.inheritedMoney, 'the cash stays');
    assert.ok(Math.abs(platformOf(sold).founderOwnershipPercent - stake * 0.75) < 0.02, 'a quarter of the shares goes');
    const holders = platformOf(sold).finance.equityHolders.reduce((sum, holder) => sum + holder.ownershipPercent, 0) + platformOf(sold).founderOwnershipPercent;
    assert.ok(Math.abs(holders - 100) < 0.1, `the cap table adds up: ${holders}`);
    /* cash short: shares are sold, whatever was asked */
    const poor = { ...base, money: 1_000_000 };
    assert.equal(getStreamingEstate(poor)!.canPayCash, false);
    const poorHeir = continueThroughAppHandler(dead(poor), child, { estate: 'PAY_CASH' });
    assert.ok(platformOf(poorHeir).founderOwnershipPercent < stake, 'cash short: shares are sold');
    assert.equal(poorHeir.money, getStreamingEstate(poor)!.inheritedMoney);
    /* cash in the company does not escape it */
    const injected = withPlatform(base, platform => ({ ...platform, treasuryCash: platform.treasuryCash + 5e9 }));
    assert.ok(getStreamingEstate(injected)!.tax > estate.tax, 'cash put into the company is in the bill');
    pass(`the estate: ${money(estate.stakeValue)} of stake owes ${money(estate.tax)}; in cash the shares stay at ${stake}%, or sold they fall to ${platformOf(sold).founderOwnershipPercent}%; injected cash does not escape it`);

    /* ── who runs it ── */
    assert.equal(platformOf(cash).leadership.currentCeo.holderType, 'FOUNDER', 'at 51%, by default the heir runs it');
    assert.equal(getStreamingEstate(base)!.heirChooses, true);
    const holder = streamingTeamSeatHolders(platformOf(base).leadership.appointments).holders.get('MONEY')!;
    const named = nameStreamingTeamSuccessor(base, 'EXECUTIVE', holder.executiveId).player;
    const handed = continueThroughAppHandler(dead(named), child, { estate: 'PAY_CASH', run: 'SUCCESSOR' });
    assert.equal(streamingChiefExecutive(platformOf(handed))?.name, holder.nameAtAppointment, 'or the one you named');
    assert.equal(platformOf(handed).legacy.founderOfficeRole, 'EXECUTIVE_CHAIR', 'and the heir chairs');
    /* a chief executive in place stays */
    const stepped = stepDownFromStreamingCompany(named, 'EXECUTIVE_CHAIR');
    assert.ok(stepped.changed, stepped.message);
    const estateChair = getStreamingEstate(stepped.player)!;
    assert.equal(estateChair.ceoStays, holder.nameAtAppointment);
    const stays = continueThroughAppHandler(dead(stepped.player), child, { estate: 'PAY_CASH' });
    assert.equal(streamingChiefExecutive(platformOf(stays))?.name, holder.nameAtAppointment, 'a chief executive in place stays');
    assert.equal(platformOf(stays).legacy.founderOfficeRole, 'EXECUTIVE_CHAIR', 'the heir holds the chair you held');
    assert.ok(getStreamingChairRule(stays), 'and watches from it');
    assert.ok(returnAsStreamingCeo(stays).changed, 'with Take over by the same rule');
    /* under 51%, the board picks */
    const minority = withPlatform(base, platform => ({ ...platform, founderOwnershipPercent: 40 }));
    const picks = getStreamingEstate(minority)!;
    assert.ok(picks.boardPicks && !picks.heirChooses, 'the board picks');
    const picked = continueThroughAppHandler(dead(minority), child, { estate: 'PAY_CASH', run: 'HEIR' });
    assert.equal(streamingChiefExecutive(platformOf(picked))?.name, picks.boardPicks!.name, 'whatever the heir wanted');
    /* the heir was running it already */
    const named2 = nameStreamingTeamSuccessor(base, 'FAMILY_HEIR', child.id).player;
    const running = stepDownFromStreamingCompany(named2, 'EXECUTIVE_CHAIR');
    assert.ok(running.changed, running.message);
    const self = continueThroughAppHandler(dead(running.player), child, { estate: 'PAY_CASH' });
    assert.equal(platformOf(self).leadership.currentCeo.holderType, 'FOUNDER', 'the heir who already ran it just carries on');
    assert.equal(platformOf(self).legacy.founderOfficeRole, 'FOUNDER_CEO');
    pass(`who runs it: the heir, or ${holder.nameAtAppointment} if named; a chief executive in place stays; under 51% the board picks ${picks.boardPicks!.name}`);

    /* ── the reaction ── */
    assert.equal(platformOf(cash).governance.boardConfidence, Math.max(0, board - 5), 'the board −5');
    const listed = listStreamingCompanyForQa(base, { ticker: 'DIED' });
    assert.ok(listed.changed, listed.reason);
    const listedHeir = continueThroughAppHandler(dead({ ...listed.player, money: 20e9 }), child, { estate: 'PAY_CASH' });
    const death = platformOf(listedHeir).governance.founderDeath!;
    assert.ok(death.move <= -0.03 && death.move >= -0.08, `−3 to −8%: ${death.move}`);
    const snapshot = { ...platformOf(listedHeir).weeklyHistory.at(-1)!, absoluteWeek: getAbsoluteWeek(listedHeir.age, listedHeir.currentWeek) + 1 };
    const fell = commitStreamingPublicMarketWeek(platformOf(listedHeir), listedHeir, snapshot);
    assert.ok(fell.publicCompany.quoteHistory.at(-1)!.drivers.includes("The founder's death"), 'among the reasons');
    assert.equal(fell.governance.founderDeath?.pricedAtAbsoluteWeek, snapshot.absoluteWeek, 'priced once');
    const calm = commitStreamingPublicMarketWeek(withPlatform(listedHeir, platform => ({ ...platform, governance: { ...platform.governance, founderDeath: null } })).ownedStreamingPlatform!, listedHeir, snapshot);
    assert.ok(fell.publicCompany.quoteHistory.at(-1)!.close < calm.publicCompany.quoteHistory.at(-1)!.close, 'the price falls by it');
    const after = commitStreamingPublicMarketWeek(fell, listedHeir, { ...snapshot, absoluteWeek: snapshot.absoluteWeek + 1 });
    assert.ok(!after.publicCompany.quoteHistory.at(-1)!.drivers.includes("The founder's death"), 'and never again');
    pass(`the reaction: the board −5; a listed price ${(death.move * 100).toFixed(1)}%: $${calm.publicCompany.quoteHistory.at(-1)!.close} → $${fell.publicCompany.quoteHistory.at(-1)!.close}, "The founder's death", once`);

    /* ── the words ── */
    const heirWeek = getAbsoluteWeek(handed.age, handed.currentWeek);
    const facts = collectOwnedStreamingPlatformFacts(handed, heirWeek - 1, heirWeek + 1);
    const story = facts.find(fact => /founder has died/.test(fact.headline));
    assert.ok(story, 'the news carries it');
    assert.match(story!.headline, /NORTHSTAR\+/, 'names the service');
    assert.match(story!.detail, new RegExp(holder.nameAtAppointment), 'and who runs it');
    pass(`the news: "${story!.headline}": "${story!.detail}"`);

    /* ── a company you sold ── */
    const record = { name: 'OLD+', soldAtAbsoluteWeek: 100, buyerName: 'A buyer', price: 5e9, founderCash: 4e9 };
    const soldCompany = withPlatform({ ...base, soldStreamingCompanies: [record] }, platform => ({
        ...platform, lifecycle: 'SOLD', governance: { ...platform.governance, departure: { atAbsoluteWeek: getAbsoluteWeek(base.age, base.currentWeek) - 52, proceeds: 1e9 } },
    }));
    assert.equal(getStreamingEstate(soldCompany), null, 'nothing to tax');
    const afterSale = continueThroughAppHandler(dead(soldCompany), child);
    assert.equal(platformOf(afterSale).lifecycle, 'SOLD', 'still sold');
    assert.deepEqual(afterSale.soldStreamingCompanies, [record], 'the record carries over');
    assert.equal(getStreamingNewCompanyWait(afterSale), 52, 'and the wait counts on');
    assert.equal(afterSale.money, Math.floor(base.money * 0.75), 'no estate on it');
    pass('a company you sold or left stays that way: the record and the wait carry over, with nothing to tax');

    /* ── on through the weeks ── */
    const week = runStreamingTeamWeek({ ...handed, currentWeek: handed.currentWeek + 1 });
    assert.equal(streamingChiefExecutive(platformOf(week))?.name, holder.nameAtAppointment, 'the new chief executive carries on');
    pass('the week\'s run carries on under them');

    console.log(`Death rules audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
