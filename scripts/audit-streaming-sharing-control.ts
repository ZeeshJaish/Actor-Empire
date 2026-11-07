/** Sharing control, Phase 3 #56 (codex-handoff/plans/platform-tech-plan.md §1, Zeesh's piracy
 *  message: "Sharing control ladder: household detection → device check → paid extra member
 *  (sharers become payers). Aggressive enforcement's cancellations shrink"; §4.1 row 8). Checks:
 *  - the catalogue: three side lines of Trust and safety, each needing the one before;
 *  - the gate: a plan sells Extra member with Paid extra member, not Commerce level 30; Go to Tech opens it;
 *  - old saves: a save selling Extra member is given Sharing control once (schema 5), others nothing;
 *  - the world offer: none owned, nothing set; each step sets its factor; rivals never;
 *  - one real week on the test company under Household only + Aggressive, A/B: Household
 *    detection cuts the crackdown's cancellations, Device check the outside homes, and Paid extra
 *    member on plans selling Extra member turns sharers into paying members (revenue up);
 *  - the Offer tab's sharing preview and the Tech tab's lines. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    STREAMING_SHARING_CONTROL_IDS, getStreamingTechGroupLadder, normalizeStreamingTechTreeState, streamingPlatformSellsExtraMember,
    streamingTechCrackdownFactor, streamingTechExtraMemberAllowed, streamingTechExtraMemberShare, streamingTechSharingFactor,
} from '../services/streamingTechTreeCatalogue';
import { getStreamingPlanBuilderView, streamingPlanBuilderOptionLock } from '../services/streamingPlanBuilder';
import { previewStreamingSharingPolicy } from '../services/streamingSharingPolicy';
import { getStreamingPlatformOfferView } from '../services/streamingPlatformOffer';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Sharing Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const sharingOf = (tree: OwnedStreamingTechTreeState) => STREAMING_SHARING_CONTROL_IDS.filter(id => tree.techs[id]);
const CHAIN: Array<[string, number]> = [['TRUST_HOUSEHOLD', 1], ['TRUST_DEVICE_CHECK', 1], ['TRUST_EXTRA_MEMBER', 1]];

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const ladder = getStreamingTechGroupLadder('TRUST').filter(item => STREAMING_SHARING_CONTROL_IDS.includes(item.id));
    assert.deepEqual(ladder.map(item => [item.name, item.sideLine, item.requires, item.unlockCost / 1e6, item.weeklyUpkeep]), [
        ['Household detection', true, [], 6, 30_000],
        ['Device check', true, ['TRUST_HOUSEHOLD'], 15, 75_000],
        ['Paid extra member', true, ['TRUST_DEVICE_CHECK'], 25, 125_000],
    ]);
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const full = withTechs(bare, CHAIN);
    assert.deepEqual([streamingTechCrackdownFactor(bare), streamingTechSharingFactor(bare), streamingTechExtraMemberShare(bare), streamingTechExtraMemberAllowed(bare)], [1, 1, 0, false]);
    assert.deepEqual([streamingTechCrackdownFactor(full), streamingTechSharingFactor(full), streamingTechExtraMemberShare(full), streamingTechExtraMemberAllowed(full)], [.5, .75, .35, true]);
    const top = withTechs(bare, [['TRUST_HOUSEHOLD', 3], ['TRUST_DEVICE_CHECK', 3], ['TRUST_EXTRA_MEMBER', 3]]);
    assert.deepEqual([streamingTechCrackdownFactor(top), streamingTechSharingFactor(top), streamingTechExtraMemberShare(top)], [.3, .65, .45]);
    console.log('PASS catalogue: Household detection $6M → Device check $15M → Paid extra member $25M; crackdown cancellations ×0.5 (×0.3 at v3), outside homes ×0.75 (×0.65), 35% (45%) of turned-away sharers pay');

    /* ── the gate ── */
    const view = (tree: OwnedStreamingTechTreeState) => getStreamingPlanBuilderView({
        technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 60 },
        productLines: [], techTree: tree,
    });
    const closed = view(bare);
    const pricing = { plans: [{ id: 'P', name: 'Premium', monthlyPrice: 15, featureIds: ['hd'], ads: false }] } as never;
    const plan = { id: 'P', name: 'Premium', monthlyPrice: 15, featureIds: ['hd'], ads: false } as never;
    assert.deepEqual(streamingPlanBuilderOptionLock(pricing, plan, 'extraseat', 'on', closed), { row: 'extraseat', needs: 'Unlock Paid extra member in Tech', techId: 'TRUST_EXTRA_MEMBER' },
        'Commerce 60 no longer opens it; Go to Tech opens Paid extra member');
    assert.equal(streamingPlanBuilderOptionLock(pricing, plan, 'extraseat', 'on', view(full)), null, 'With Paid extra member, a plan may sell it');
    console.log('PASS gate: Extra member needs Paid extra member ("Unlock Paid extra member in Tech", Go to Tech), whatever the Commerce level');

    /* ── old saves ── */
    const sellsLive = { serviceConfiguration: { pricing: { plans: [{ featureIds: ['hd', 'extraseat'] }] } } };
    const sellsDraft = { launchProgram: { defineDraft: { pricing: { plans: [{ featureIds: ['extraseat'] }] } } } };
    assert.deepEqual([streamingPlatformSellsExtraMember(sellsLive), streamingPlatformSellsExtraMember(sellsDraft), streamingPlatformSellsExtraMember({ serviceConfiguration: { pricing: { plans: [{ featureIds: ['hd'] }] } } })], [true, true, false]);
    const schemaFour = { schemaVersion: 4, convertedFromLegacy: false, techs: { PICTURE_1080P: { version: 1 } } };
    const given = normalizeStreamingTechTreeState(schemaFour, {}, { sellsExtraMember: true });
    assert.deepEqual([given.schemaVersion, sharingOf(given), STREAMING_SHARING_CONTROL_IDS.map(id => given.techs[id]?.granted)], [8, STREAMING_SHARING_CONTROL_IDS, [true, true, true]],
        'A schema-4 save selling Extra member is given Sharing control, with no upkeep');
    assert.deepEqual(sharingOf(normalizeStreamingTechTreeState(schemaFour, {}, { sellsExtraMember: false })), [], 'One that does not sell it, nothing');
    assert.deepEqual(sharingOf(normalizeStreamingTechTreeState({ ...given, techs: { ...given.techs, TRUST_EXTRA_MEMBER: undefined } }, {}, { sellsExtraMember: true })), ['TRUST_HOUSEHOLD', 'TRUST_DEVICE_CHECK'], 'Once: a schema-5 tree is never given it again');
    assert.deepEqual(sharingOf(normalizeStreamingTechTreeState(undefined, { ADVERTISING_COMMERCE: 40 }, { sellsExtraMember: true })), STREAMING_SHARING_CONTROL_IDS, 'A save from before the tree selling it, too');
    console.log('PASS old saves: a save selling Extra member (live plans or the Define the Launch draft) is given Household detection, Device check and Paid extra member once, with no upkeep; others nothing');

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('sharing-control-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.deepEqual(sharingOf(base.techTree!), [], 'The test company sells no Extra member, so it was given no Sharing control');
    const strict = { sharingPosture: 'HOUSEHOLD_ONLY' as const, enforcementInvestment: 'AGGRESSIVE' as const, source: 'PLAYER_ACTION' as const, updatedAtAbsoluteWeek: week - 1 };
    const pricingWithMembers = {
        ...base.serviceConfiguration.pricing,
        plans: base.serviceConfiguration.pricing.plans.map(item => ({ ...item, featureIds: item.featureIds.includes('extraseat') ? item.featureIds : [...item.featureIds, 'extraseat'] })),
    };
    const playerWith = (techs: Array<[string, number]>, members = false): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            audienceAccessPolicy: strict,
            techTree: withTechs(base.techTree!, techs),
            ...(members ? { serviceConfiguration: { ...base.serviceConfiguration, pricing: pricingWithMembers } } : {}),
        } as OwnedStreamingPlatformState, qa.id),
    });

    /* ── the world offer ── */
    const offerOf = (player: Player) => getWorldStreamingOffers(player, week).offers.find(offer => offer.isPlayer)!;
    const none = offerOf(playerWith([]));
    assert.deepEqual([none.crackdownFactor, none.sharingCheckFactor, none.extraMemberShare], [undefined, undefined, undefined], 'None owned: nothing set');
    const owned = offerOf(playerWith(CHAIN));
    assert.deepEqual([owned.crackdownFactor, owned.sharingCheckFactor, owned.extraMemberShare], [.5, .75, .35]);
    assert.notEqual(owned.sourceFingerprint, none.sourceFingerprint, 'They join the fingerprint once set');
    assert.ok(getWorldStreamingOffers(playerWith(CHAIN), week).offers.filter(offer => !offer.isPlayer).every(offer => offer.crackdownFactor === undefined && offer.sharingCheckFactor === undefined && offer.extraMemberShare === undefined), 'Rivals: never');
    console.log('PASS offer: none owned, nothing set; the chain sets crackdown 0.5, check 0.75, extra members 35%; rivals never');

    /* ── one real week, A/B, under Household only + Aggressive ── */
    const weekOf = async (player: Player) => {
        const snapshot = normalizeOwnedStreamingPlatformState((await processGameWeek(player)).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
        const operations = snapshot.operations!;
        return {
            cancellations: operations.cancellations, shared: operations.worldCustomerExternalSharedHouseholds || 0,
            members: operations.worldCustomerExtraMemberHouseholds || 0, memberRevenue: operations.worldCustomerExtraMemberRevenue || 0,
            subscription: operations.subscriptionRevenue, load: operations.worldCustomerAccessLoadAccounts || 0,
        };
    };
    const plain = await weekOf(playerWith([]));
    const detection = await weekOf(playerWith([['TRUST_HOUSEHOLD', 1]]));
    const checked = await weekOf(playerWith([['TRUST_HOUSEHOLD', 1], ['TRUST_DEVICE_CHECK', 1]]));
    const paying = await weekOf(playerWith(CHAIN, true));
    assert.ok(detection.cancellations < plain.cancellations, `Household detection: cancellations ${plain.cancellations.toLocaleString()} → ${detection.cancellations.toLocaleString()}`);
    assert.ok(checked.shared < plain.shared * .8 && checked.shared > plain.shared * .7, `Device check: outside homes ${plain.shared.toLocaleString()} → ${checked.shared.toLocaleString()}`);
    assert.equal(plain.members + detection.members + checked.members, 0, 'No extra members before Paid extra member');
    assert.ok(paying.members > 0 && paying.memberRevenue > 0, `Paid extra member: ${paying.members.toLocaleString()} sharers pay ${paying.memberRevenue.toLocaleString()} a week`);
    assert.ok(paying.subscription > checked.subscription, `Subscription revenue ${checked.subscription.toLocaleString()} → ${paying.subscription.toLocaleString()}`);
    console.log(`PASS week (Household only + Aggressive): cancellations ${plain.cancellations.toLocaleString()} → ${detection.cancellations.toLocaleString()} with Household detection; outside homes ${plain.shared.toLocaleString()} → ${checked.shared.toLocaleString()} with Device check; with Paid extra member and Extra member on every plan, ${paying.members.toLocaleString()} sharers pay to stay ($${Math.round(paying.memberRevenue).toLocaleString()} a week), subscription revenue $${Math.round(checked.subscription).toLocaleString()} → $${Math.round(paying.subscription).toLocaleString()} a week, network load ${checked.load.toLocaleString()} → ${paying.load.toLocaleString()} accounts`);

    /* ── the Offer tab's preview ── */
    const settled = { paidAccounts: 1_000_000, sharedHomes: 100_000, piracyReach: 50_000, accessLoadAccounts: 1_144_000, extraMembers: 100_000 };
    const control = { crackdownFactor: .5, sharingCheck: .75, extraMemberShare: .35, sellsExtraMember: true };
    const outlook = previewStreamingSharingPolicy(settled, { sharingPosture: 'BALANCED', enforcementInvestment: 'STANDARD' }, { sharingPosture: 'HOUSEHOLD_ONLY', enforcementInvestment: 'AGGRESSIVE' }, control);
    assert.deepEqual([outlook.now.extraWeeklyCancellation, outlook.next.extraWeeklyCancellation], [0, .004], 'Household only + Aggressive: 0.8% a week, halved by Household detection');
    const openest = 1.3 * 1.08;
    assert.equal(outlook.next.extraMembers, Math.round(100_000 * (openest - .24 * .48 * .75) / (openest - .75 * .78 * .75)), 'Extra members follow the sharers turned away');
    assert.equal(outlook.next.accessLoadAccounts, 1_000_000 + Math.round((outlook.next.sharedHomes + outlook.next.extraMembers) * .72));
    const offerView = getStreamingPlatformOfferView(playerWith(CHAIN, true));
    assert.deepEqual(offerView.sharing.control, { crackdownFactor: .5, sharingCheck: .75, extraMemberShare: .35, sellsExtraMember: true });
    console.log(`PASS preview: Balanced + Standard → Household only + Aggressive adds ${outlook.next.extraWeeklyCancellation * 100}% cancellations a week (half without Household detection), extra members 100,000 → ${outlook.next.extraMembers.toLocaleString()}`);

    /* ── the Tech tab ── */
    const desk = getStreamingTechDesk(playerWith([]));
    const step = (id: string) => desk.groups.find(item => item.id === 'TRUST')!.steps.find(item => item.id === id)!;
    assert.deepEqual(step('TRUST_HOUSEHOLD').more, ['Crackdown cancellations 50% lower']);
    assert.deepEqual(step('TRUST_DEVICE_CHECK').needs, ['Household detection'], 'Device check needs Household detection first');
    const deskChecked = getStreamingTechDesk(playerWith([['TRUST_HOUSEHOLD', 1], ['TRUST_DEVICE_CHECK', 1]]));
    const later = (id: string) => deskChecked.groups.find(item => item.id === 'TRUST')!.steps.find(item => item.id === id)!;
    assert.deepEqual(step('TRUST_DEVICE_CHECK').more, ['25% fewer homes on shared passwords']);
    assert.deepEqual(later('TRUST_EXTRA_MEMBER').more, ['Plans can sell Extra member', '35% of turned-away sharers pay to stay']);
    console.log(`PASS tech tab: "${step('TRUST_HOUSEHOLD').more[0]}"; "${step('TRUST_DEVICE_CHECK').more[0]}"; "${later('TRUST_EXTRA_MEMBER').more.join('", "')}"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
