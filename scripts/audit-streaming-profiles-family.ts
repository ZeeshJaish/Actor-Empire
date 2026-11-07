/** Profiles and family, Phase 4 #60 (codex-handoff/plans/platform-tech-plan.md §4.1 row 10: "Profiles
 *  and screens (2 / 4 / 6), Kids profiles and parental controls, Watch party | Screens and Kids as plan
 *  features; Family appeal"; §4.3: Product Experience from Profiles and family; §13 Phase 4: "kids and
 *  screens work as plan features"). Checks:
 *  - the catalogue: Profiles and screens, whose versions are screens, and the side lines Kids profiles
 *    and parental controls and Watch party;
 *  - screens: what a plan can sell at each version; the row's locks name Profiles and screens, and
 *    Reliability alone opens none; six screens round-trip as `streams6`;
 *  - old saves: Reliability 10 → 2 screens, 35 → 4 screens, given; a schema-6 tree joins once;
 *  - a new career: Auto-scaling opens no screens, Profiles and screens does; the side lines raise
 *    Product Experience and family appeal;
 *  - the test company keeps its 2- and 4-screen plans;
 *  - family households choose the player more with Kids profiles and Watch party, and with six
 *    screens; every other household is as it was;
 *  - one real week on the test company, A/B: more sign-ups;
 *  - the Tech tab and STATUS. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingEconomy';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import {
    STREAMING_TECH_TREE_SCHEMA, convertStreamingTechTreeFromLevels, getStreamingTechGroupLadder, getStreamingTechVersionNames, normalizeStreamingTechTreeState,
    resolveStreamingTechTree, streamingTechFamilyAppeal, streamingTechScreens,
} from '../services/streamingTechTreeCatalogue';
import { completeStreamingTechVersion, contributeStreamingTechEnergy, unlockStreamingTech, type StreamingTechActionResult } from '../services/streamingTechTree';
import { normalizeStreamingPlanOffer, streamingPlanOfferFeatureIds, streamingPlanOfferLocks } from '../services/streamingPlanOffer';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingTechDesk } from '../services/streamingTechDesk';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Profiles and Family Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withEnergy = (player: Player, weekly: number, bank: number): Player => ({
    ...player, energy: { ...player.energy, current: weekly + bank, max: weekly + bank },
    flags: { ...player.flags, weeklyBaseEnergyRemaining: weekly, bonusEnergyBank: bank },
});
const done = (label: string, result: StreamingTechActionResult): Player => {
    assert.ok(result.changed, `${label}: ${result.reason || 'refused'}`);
    return result.player;
};
const tree = (player: Player) => resolveStreamingTechTree(player.ownedStreamingPlatform);
const foundCompany = (id: string): Player => {
    let player = fresh(id);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    player = {
        ...player, money: STREAMING_INCORPORATION_ECONOMY.cashRequired, stats: { ...player.stats, fame: 80, reputation: 80 },
        ownedStreamingPlatform: { ...platform, lifecycle: 'ELIGIBLE', milestoneKeys: [...new Set([...platform.milestoneKeys, 'streaming-launch-clearance'])] },
    };
    const founded = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(player, {
        ...createDefaultStreamingFoundingDraft(getAbsoluteWeek(player.age, player.currentWeek)), currentStep: 2, name: 'HEARTH', primaryColor: '#F08A4B', secondaryColor: '#14100C',
    }));
    assert.ok(founded.changed, `The company is registered: ${founded.reason}`);
    const funded = contributeStreamingFounderCapital({ ...founded.player, money: founded.player.money + 100_000_000 }, 100_000_000, `${id}:capital`);
    assert.ok(funded.changed, `Founder capital: ${funded.reason}`);
    return funded.player;
};
const withTechs = (state: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...state,
    techs: { ...state.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const screensGiven = (state: OwnedStreamingTechTreeState) => [state.techs.FAM_SCREENS?.version ?? 0, state.techs.FAM_SCREENS?.granted ?? false];
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_480P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const ladder = getStreamingTechGroupLadder('FAMILY');
    assert.deepEqual(ladder.map(item => `${item.name}${item.sideLine ? '*' : ''}`), ['Profiles and screens', 'Kids profiles and parental controls*', 'Watch party*']);
    assert.deepEqual(ladder.map(item => [item.unlockCost / 1e6, item.weeklyUpkeep / 1e3, item.requires.join('+') || '-']), [[5, 30, '-'], [10, 50, 'FAM_SCREENS'], [6, 30, 'FAM_SCREENS']]);
    assert.deepEqual([getStreamingTechVersionNames('FAM_SCREENS'), getStreamingTechVersionNames('FAM_KIDS')], [['2 screens', '4 screens', '6 screens'], ['Basic', 'Plus', 'Max']]);
    assert.equal(STREAMING_TECH_TREE_SCHEMA, 8, 'Schema 8 since Ads tech (#61)');
    console.log(`PASS catalogue: ${ladder.map(item => item.name).join(', ')}; Profiles and screens' versions read ${getStreamingTechVersionNames('FAM_SCREENS').join(' / ')}`);

    /* ── screens ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    assert.deepEqual([0, 1, 2, 3].map(version => streamingTechScreens(version ? withTechs(bare, [['FAM_SCREENS', version]]) : bare)), [1, 2, 4, 6]);
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 100, DATA_RECOMMENDATIONS: 0, SECURITY: 0, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 0, PRODUCT_EXPERIENCE: 0 };
    const lockOf = (state: OwnedStreamingTechTreeState, screens: OwnedStreamingPlanOffer['screens']) => (
        streamingPlanOfferLocks(offer({ screens }), state, levels).map(lock => [lock.needs, lock.techId])
    );
    assert.deepEqual(lockOf(bare, 2), [['Unlock Profiles and screens in Tech', 'FAM_SCREENS']], 'Reliability 100 alone opens no screens');
    assert.deepEqual([lockOf(withTechs(bare, [['FAM_SCREENS', 1]]), 2), lockOf(withTechs(bare, [['FAM_SCREENS', 1]]), 4)],
        [[], [['Raise Profiles and screens to 4 screens in Tech', 'FAM_SCREENS']]]);
    assert.deepEqual([lockOf(withTechs(bare, [['FAM_SCREENS', 2]]), 6), lockOf(withTechs(bare, [['FAM_SCREENS', 3]]), 6)],
        [[['Raise Profiles and screens to 6 screens in Tech', 'FAM_SCREENS']], []]);
    assert.deepEqual(streamingPlanOfferFeatureIds(offer({ screens: 6 })), ['streams6']);
    assert.deepEqual([normalizeStreamingPlanOffer({ ...offer({}), screens: 7 })?.screens, normalizeStreamingPlanOffer({ ...offer({}), screens: 5 })?.screens], [6, 4]);
    const pricing = normalizeOwnedStreamingPlatformState(fresh('profiles-family-pricing').ownedStreamingPlatform, 'profiles-family-pricing').serviceConfiguration.pricing;
    const settled = normalizeStreamingPricingConfiguration({ ...pricing, plans: [{ id: 'FAMILY', name: 'Family', monthly: 19.99, featureIds: ['streams2', 'streams4', 'streams6'], ads: false }] });
    assert.deepEqual(settled.plans[0].featureIds, ['streams6', 'noads'], 'Six screens stand for two and four');
    console.log('PASS screens: 1 / 2 / 4 / 6 by version; "Unlock Profiles and screens in Tech" (Reliability 100 alone opens none), "Raise Profiles and screens to 4 / 6 screens in Tech"; six screens = streams6');

    /* ── old saves ── */
    assert.deepEqual([9, 10, 35, 100].map(reliability => screensGiven(convertStreamingTechTreeFromLevels({ RELIABILITY: reliability }))),
        [[0, false], [1, true], [2, true], [2, true]], 'Reliability 10 → 2 screens, 35 → 4 screens, as given steps; never 6, never a side line');
    const schemaSix = { schemaVersion: 6, convertedFromLegacy: false, techs: { PICTURE_1080P: { version: 1 } } };
    const joined = normalizeStreamingTechTreeState(schemaSix, { RELIABILITY: 42 });
    assert.deepEqual([joined.schemaVersion, screensGiven(joined), Boolean(joined.techs.FAM_KIDS)], [8, [2, true], false], 'A schema-6 tree joins once');
    assert.deepEqual(screensGiven(normalizeStreamingTechTreeState({ ...joined, techs: { ...joined.techs, FAM_SCREENS: undefined } }, { RELIABILITY: 42 })), [0, false], 'Never again');
    console.log('PASS old saves: Reliability 10 → Profiles and screens at 2 screens, 35 → at 4 screens, given; a schema-6 tree joins once');

    /* ── a new career ── */
    let company = foundCompany('profiles-family-career');
    company = done('Unlock Auto-scaling', unlockStreamingTech(company, 'STAB_AUTOSCALING'));
    assert.deepEqual([company.ownedStreamingPlatform.technologyLevels.RELIABILITY >= 10, streamingTechScreens(tree(company))], [true, 1], 'Auto-scaling raises Reliability, no screens');
    company = done('Unlock Profiles and screens', unlockStreamingTech(company, 'FAM_SCREENS'));
    assert.equal(streamingTechScreens(tree(company)), 2);
    const productBefore = company.ownedStreamingPlatform.technologyLevels.PRODUCT_EXPERIENCE;
    company = done('Unlock Kids profiles', unlockStreamingTech(company, 'FAM_KIDS'));
    company = done('Unlock Watch party', unlockStreamingTech(company, 'FAM_WATCH_PARTY'));
    assert.deepEqual([company.ownedStreamingPlatform.technologyLevels.PRODUCT_EXPERIENCE, streamingTechFamilyAppeal(tree(company))], [Math.max(productBefore, 8), 11],
        'Kids profiles 5 and Watch party 3 stand for Product Experience; family appeal 8 + 3');
    // #84: the bar fills, then its price completes the version
    company = done('Profiles and screens to version 2', completeStreamingTechVersion(done('Profiles and screens energy', contributeStreamingTechEnergy(withEnergy(company, 100, 0), 'FAM_SCREENS', 'FILL')), 'FAM_SCREENS'));
    assert.equal(streamingTechScreens(tree(company)), 4);
    console.log(`PASS new career: Auto-scaling (Reliability ${company.ownedStreamingPlatform.technologyLevels.RELIABILITY}) opens no screens; Profiles and screens 2, version 2 → 4; Kids profiles + Watch party: Product Experience ${productBefore} → ${company.ownedStreamingPlatform.technologyLevels.PRODUCT_EXPERIENCE}, family appeal 11`);

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('profiles-family-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.deepEqual(screensGiven(base.techTree!), [2, true], 'The test company: Profiles and screens at 4 screens, given (Reliability 42)');
    const screensSold = base.serviceConfiguration.pricing.plans.map(plan => plan.featureIds.filter(id => id.startsWith('streams')).join('+') || '-');
    assert.ok(screensSold.includes('streams2') && screensSold.includes('streams4'), `Its plans keep two and four screens: ${screensSold.join(', ')}`);
    const playerWith = (state: OwnedStreamingTechTreeState, extra: Partial<OwnedStreamingPlatformState> = {}): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({ ...base, ...extra, techTree: state } as OwnedStreamingPlatformState, qa.id),
    });

    /* ── family households ── */
    const offers = getWorldStreamingOffers(qa, week).offers;
    assert.equal(offers.find(item => item.isPlayer)!.familyAppealIndex, undefined, 'Without Kids profiles or Watch party: not set');
    const family = getWorldStreamingOffers(playerWith(withTechs(base.techTree!, [['FAM_KIDS', 3], ['FAM_WATCH_PARTY', 3]])), week).offers;
    assert.deepEqual([family.find(item => item.isPlayer)!.familyAppealIndex, family.find(item => item.isPlayer)!.kidsAppealIndex], [5, 12],
        'Watch party v3 5 on the whole service, Kids profiles v3 12 on the plans that include them (#62)');
    const paid = (choice: ReturnType<typeof allocateStreamingAudienceChoice>, planId?: string) => choice.allocations
        .filter(row => row.platformId === 'PLAYER' && row.kind === 'SUBSCRIPTION' && (!planId || row.planId === planId)).reduce((sum, row) => sum + row.households, 0);
    const country = offers.find(item => item.isPlayer)!.activeCountryIds.find(id => qa.world.worldAudienceEconomy?.countries[id] && qa.world.worldAudienceParticipation?.countries[id])!;
    // Families take a service's best affordable plan, and at the test company's prices that is Basic ($6.99).
    // Six screens are weighed on its four-screen plan at Basic's price, so families can choose it.
    const priced = (set: typeof offers, screens: string) => set.map(item => {
        if (!item.isPlayer) return item;
        const cheapest = item.plans.find(plan => plan.id === 'BASIC')!;
        return {
            ...item,
            plans: item.plans.map(plan => (plan.id === 'FAMILY' ? {
                ...plan, featureIds: plan.featureIds.map(id => (id === 'streams4' ? screens : id)), monthlyPrice: cheapest.monthlyPrice,
                monthlyBillingPrice: cheapest.monthlyBillingPrice, annualBillingMonthlyPrice: cheapest.annualBillingMonthlyPrice, effectiveMonthlyPrice: cheapest.effectiveMonthlyPrice,
            } : plan)),
        };
    });
    const totals = { familyPlain: 0, familyApp: 0, fourScreens: 0, sixScreens: 0, others: 0 };
    qa.world.worldAudienceEconomy!.countries[country].cohorts.forEach(cohort => {
        const overlay = qa.world.worldAudienceParticipation!.countries[country].cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay) return;
        const [plain, withApp] = [offers, family].map(set => paid(allocateStreamingAudienceChoice(country, cohort, overlay, set)));
        if (cohort.lifeStageId === 'FAMILY') {
            totals.familyPlain += plain; totals.familyApp += withApp;
            totals.fourScreens += paid(allocateStreamingAudienceChoice(country, cohort, overlay, priced(offers, 'streams4')), 'FAMILY');
            totals.sixScreens += paid(allocateStreamingAudienceChoice(country, cohort, overlay, priced(offers, 'streams6')), 'FAMILY');
        } else {
            assert.equal(withApp, plain, `${cohort.id}: not a family, as it was`);
            totals.others += plain;
        }
    });
    assert.ok(totals.familyApp > totals.familyPlain, `Family households paying the player in ${country}: ${totals.familyPlain.toLocaleString()} → ${totals.familyApp.toLocaleString()}`);
    assert.ok(totals.sixScreens > totals.fourScreens, `On its four-screen plan at Basic's price: ${totals.fourScreens.toLocaleString()} → ${totals.sixScreens.toLocaleString()} with six`);
    console.log(`PASS families (${country}): homes paying the player ${totals.familyPlain.toLocaleString()} → ${totals.familyApp.toLocaleString()} with Kids profiles v3 + Watch party v3 (+${Math.round((totals.familyApp / totals.familyPlain - 1) * 100)}%); its four-screen plan at Basic's price ${totals.fourScreens.toLocaleString()} → ${totals.sixScreens.toLocaleString()} with six screens; ${totals.others.toLocaleString()} other homes unchanged`);

    /* ── one real week, A/B ── */
    const weekOf = async (state: OwnedStreamingTechTreeState) => {
        const snapshot = normalizeOwnedStreamingPlatformState((await processGameWeek(playerWith(state))).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
        return { joins: snapshot.operations?.joinedSubscribers || 0, subscribers: snapshot.subscribers };
    };
    const plainWeek = await weekOf(base.techTree!);
    const familyWeek = await weekOf(withTechs(base.techTree!, [['FAM_KIDS', 3], ['FAM_WATCH_PARTY', 3]]));
    assert.ok(familyWeek.joins > plainWeek.joins, `Sign-ups ${plainWeek.joins.toLocaleString()} → ${familyWeek.joins.toLocaleString()}`);
    console.log(`PASS week: Kids profiles v3 + Watch party v3 on the test company: sign-ups ${plainWeek.joins.toLocaleString()} → ${familyWeek.joins.toLocaleString()}, subscribers after the week ${plainWeek.subscribers.toLocaleString()} → ${familyWeek.subscribers.toLocaleString()}`);

    /* ── the Tech tab and STATUS ── */
    const desk = getStreamingTechDesk(qa);
    const group = desk.groups.find(item => item.id === 'FAMILY')!;
    const step = (id: string) => group.steps.find(item => item.id === id)!;
    assert.deepEqual([group.accent, group.name, group.best?.id, group.best?.versionName], ['#fdba74', 'Profiles and family', 'FAM_SCREENS', '4 screens']);
    assert.deepEqual([step('FAM_SCREENS').nextVersionName, step('FAM_SCREENS').more], ['6 screens', ['Plans can sell 6 screens at once']]);
    assert.deepEqual([step('FAM_KIDS').more, step('FAM_WATCH_PARTY').more], [['+8 appeal with families'], ['+3 appeal with families']]);
    const kids = step('FAM_KIDS').effect;
    assert.ok(kids?.kind === 'FAMILY' && kids.next.kids && !kids.now.kids && kids.next.appeal === 8, 'Kids profiles: the scene gains its Kids profile');
    const row = getStreamingStatusBoard(qa).sections.find(section => section.id === 'TECH')!.rows.find(item => item.id === 'TECH:FAMILY')!;
    assert.deepEqual([row.status, row.detail], ['WORKING', 'Profiles and screens · 4 screens']);
    console.log(`PASS tech tab and status: peach; "${step('FAM_SCREENS').more[0]}"; Kids profiles "${step('FAM_KIDS').more[0]}", Watch party "${step('FAM_WATCH_PARTY').more[0]}"; STATUS "${row.detail}"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
