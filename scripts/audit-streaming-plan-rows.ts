/** Phase 4's plan rows, #62 (codex-handoff/plans/platform-tech-plan.md §13 Phase 4: "Groups Smart AI,
 *  Profiles and family, Ads tech; their plan rows"; §6.2: "The offer rows: … AI channels, autoplay, kids
 *  profiles"; done when "kids and screens work as plan features"). Six screens arrived with #60. Checks:
 *  - the plan builder: Kids profiles, AI channels and Autoplay rows (the free tier's too), locked until
 *    their tech is owned, with what to unlock;
 *  - a plan takes each once its tech is owned, unless it turns it off; an offer saved before them is
 *    byte-identical;
 *  - Kids profiles: family households read it on the plans that include it (Watch party stays on the
 *    whole service);
 *  - AI channels and Autoplay: the viewers of a plan that turns them off get neither, exactly as if
 *    the service did not own them; one real week on the test company, A/B;
 *  - the viewer app's plan cards and the Tech tab's cards name them. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPlatformState, type OwnedStreamingPricingConfiguration, type OwnedStreamingTechTreeState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeStreamingTechTreeState, streamingTechSmartAiEffects } from '../services/streamingTechTreeCatalogue';
import { normalizeStreamingPlanOffer, resolveStreamingPlanOffer, streamingPlanIncludes, streamingPlanOfferLocks } from '../services/streamingPlanOffer';
import { getStreamingPlanBuilderView, streamingFreeTierOptionLock, streamingPlanBuilderValue } from '../services/streamingPlanBuilder';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { getStreamingViewerPlans } from '../services/streamingViewerQuality';
import { getStreamingTechDesk } from '../services/streamingTechDesk';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Plan Rows Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withTechs = (state: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...state,
    techs: { ...state.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_480P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});

async function main() {
    const started = performance.now();

    /* ── the rule and the locks ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const owning = withTechs(bare, [['FAM_SCREENS', 1], ['FAM_KIDS', 1], ['AI_BECAUSE', 1], ['AI_CHANNELS', 1], ['AI_AUTOPLAY', 1]]);
    assert.deepEqual([streamingPlanIncludes(offer({}), 'kids', bare), streamingPlanIncludes(offer({}), 'kids', owning), streamingPlanIncludes(offer({ kids: false }), 'kids', owning)],
        [false, true, false], 'Without the tech never; with it, unless the plan turns it off');
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 0, DATA_RECOMMENDATIONS: 0, SECURITY: 0, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 0, PRODUCT_EXPERIENCE: 0 };
    assert.deepEqual(streamingPlanOfferLocks(offer({ kids: true, aiChannels: true, autoplay: true }), bare, levels).map(lock => [lock.row, lock.needs, lock.techId]), [
        ['kids', 'Unlock Kids profiles and parental controls in Tech', 'FAM_KIDS'],
        ['aiChannels', 'Unlock AI channels in Tech', 'AI_CHANNELS'],
        ['autoplay', 'Unlock Autoplay and previews in Tech', 'AI_AUTOPLAY'],
    ]);
    assert.deepEqual(streamingPlanOfferLocks(offer({ kids: false }), bare, levels), [], 'Off needs nothing');
    const old = offer({});
    assert.equal(JSON.stringify(normalizeStreamingPlanOffer(old)), JSON.stringify(old), 'An offer saved before them is byte-identical');
    assert.deepEqual(normalizeStreamingPlanOffer({ ...old, kids: false, aiChannels: 'yes', autoplay: true }), { ...old, kids: false, autoplay: true }, 'Only true or false is kept');
    console.log('PASS rule: on with the tech unless a plan turns it off; locked without it ("Unlock Kids profiles and parental controls in Tech", "Unlock AI channels in Tech", "Unlock Autoplay and previews in Tech"); old offers unchanged');

    /* ── the plan builder ── */
    const builder = getStreamingPlanBuilderView(null);
    assert.ok(['kids', 'aiChannels', 'autoplay'].every(id => builder.rows.some(row => row.id === id)), 'The table has the three rows');

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('plan-rows-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const playerWith = (state: OwnedStreamingTechTreeState, pricing?: OwnedStreamingPricingConfiguration): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base, techTree: state, ...(pricing ? { serviceConfiguration: { ...base.serviceConfiguration, pricing } } : {}),
        } as OwnedStreamingPlatformState, qa.id),
    });
    /* every paid plan with these rows set (its offer from its features), the rest as it was */
    const plansWith = (state: OwnedStreamingTechTreeState, rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPricingConfiguration => ({
        ...base.serviceConfiguration.pricing,
        plans: base.serviceConfiguration.pricing.plans.map(plan => ({ ...plan, offer: { ...resolveStreamingPlanOffer(plan, state), ...rows } })),
    });
    const familyTree = withTechs(base.techTree!, [['FAM_KIDS', 3], ['FAM_WATCH_PARTY', 3]]);
    const builderView = getStreamingPlanBuilderView(playerWith(familyTree).ownedStreamingPlatform);
    const qaPricing = base.serviceConfiguration.pricing;
    const firstPlan = qaPricing.plans[0];
    assert.equal(streamingPlanBuilderValue(qaPricing, firstPlan, 'kids', builderView.tree), 'on', 'Owned and never set: on');
    assert.equal(streamingPlanBuilderValue(qaPricing, firstPlan, 'aiChannels', builderView.tree), 'off', 'AI channels not owned: off');
    assert.ok(streamingFreeTierOptionLock(qaPricing, 'aiChannels', 'on', builderView), 'The free tier\'s AI channels row is locked without the tech');
    console.log('PASS builder: Kids profiles, AI channels and Autoplay rows (the free tier\'s too); Kids profiles reads on once owned, AI channels off and locked without it');

    /* ── Kids profiles on the plans, Watch party on the service ── */
    const offersOf = (player: Player) => getWorldStreamingOffers(player, week).offers;
    const country = offersOf(qa).find(item => item.isPlayer)!.activeCountryIds.find(id => qa.world.worldAudienceEconomy?.countries[id] && qa.world.worldAudienceParticipation?.countries[id])!;
    const familyHomes = (offers: ReturnType<typeof offersOf>) => qa.world.worldAudienceEconomy!.countries[country].cohorts.reduce((sum, cohort) => {
        const overlay = qa.world.worldAudienceParticipation!.countries[country].cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay || cohort.lifeStageId !== 'FAMILY') return sum;
        return sum + allocateStreamingAudienceChoice(country, cohort, overlay, offers).allocations
            .filter(row => row.platformId === 'PLAYER' && row.kind === 'SUBSCRIPTION').reduce((total, row) => total + row.households, 0);
    }, 0);
    const none = familyHomes(offersOf(qa));
    const kidsOff = familyHomes(offersOf(playerWith(familyTree, plansWith(familyTree, { kids: false }))));
    const kidsOn = familyHomes(offersOf(playerWith(familyTree)));
    const kidsSet = familyHomes(offersOf(playerWith(familyTree, plansWith(familyTree, {}))));
    assert.equal(kidsSet, kidsOn, 'Offers written out with the rows unset read exactly as plans without offers');
    assert.ok(none < kidsOff && kidsOff < kidsOn, `Family homes in ${country}: ${none.toLocaleString()} → ${kidsOff.toLocaleString()} (Watch party, Kids profiles off every plan) → ${kidsOn.toLocaleString()} (on)`);
    console.log(`PASS kids: family homes paying in ${country} ${none.toLocaleString()} without either → ${kidsOff.toLocaleString()} with Watch party and Kids profiles turned off on every plan → ${kidsOn.toLocaleString()} with them on`);

    /* ── AI channels and Autoplay ── */
    const aiTree = withTechs(base.techTree!, [['AI_CHANNELS', 3], ['AI_AUTOPLAY', 3]]);
    assert.deepEqual(streamingTechSmartAiEffects(aiTree, { aiChannels: false, autoplay: false }), streamingTechSmartAiEffects(base.techTree!),
        'A plan with both off: exactly what the service gives without them');
    const hoursOf = async (player: Player) => {
        const next = (await processGameWeek(player)).player;
        const viewing = next.world.worldStreamingViewing!.platforms!.PLAYER!;
        return { hours: viewing.totalHoursViewed, paid: viewing.accessMix.paidViewingAccounts || 0 };
    };
    const without = await hoursOf(playerWith(base.techTree!, plansWith(base.techTree!, {})));
    const off = await hoursOf(playerWith(aiTree, plansWith(aiTree, { aiChannels: false, autoplay: false })));
    const on = await hoursOf(playerWith(aiTree, plansWith(aiTree, {})));
    assert.ok(off.hours > without.hours && on.hours > off.hours,
        `Hours ${without.hours.toLocaleString()} (neither owned) → ${off.hours.toLocaleString()} (owned, off every paid plan: the free tier keeps them) → ${on.hours.toLocaleString()} (on)`);
    assert.ok(on.paid > off.paid, `Paid viewers watching ${off.paid.toLocaleString()} → ${on.paid.toLocaleString()}`);
    console.log(`PASS ai: AI channels v3 + Autoplay v3, hours watched in a week ${without.hours.toLocaleString()} without them → ${off.hours.toLocaleString()} off every paid plan (free viewers keep them) → ${on.hours.toLocaleString()} on; paid viewers watching ${off.paid.toLocaleString()} → ${on.paid.toLocaleString()}`);

    /* ── the viewer app and the Tech tab ── */
    const cards = getStreamingViewerPlans(normalizeOwnedStreamingPlatformState(playerWith(withTechs(familyTree, [['AI_CHANNELS', 1], ['AI_AUTOPLAY', 1]])).ownedStreamingPlatform, qa.id), week).plans;
    const paidCard = cards.find(item => item.id !== 'FREE_AD')!;
    assert.ok(['Kids profiles', 'AI channels', 'Autoplay'].every(name => paidCard.features.includes(name)), `A plan card lists them: ${paidCard.features.join(', ')}`);
    const offCards = getStreamingViewerPlans(normalizeOwnedStreamingPlatformState(playerWith(withTechs(familyTree, [['AI_CHANNELS', 1], ['AI_AUTOPLAY', 1]]),
        plansWith(familyTree, { kids: false, aiChannels: false, autoplay: false })).ownedStreamingPlatform, qa.id), week).plans;
    assert.ok(!['Kids profiles', 'AI channels', 'Autoplay'].some(name => offCards.find(item => item.id === paidCard.id)!.features.includes(name)), 'Turned off: not listed');
    const desk = getStreamingTechDesk(qa);
    const feeds = (group: string, id: string) => desk.groups.find(item => item.id === group)!.steps.find(item => item.id === id)!.feeds;
    assert.deepEqual([feeds('FAMILY', 'FAM_KIDS'), feeds('SMART_AI', 'AI_CHANNELS'), feeds('SMART_AI', 'AI_AUTOPLAY')], [['Kids profiles'], ['AI channels'], ['Autoplay']]);
    console.log(`PASS cards: "${paidCard.name}" lists ${paidCard.features.filter(name => ['Kids profiles', 'AI channels', 'Autoplay'].includes(name)).join(', ')}, none when turned off; the Tech tab's cards read "Plans: Kids profiles" (AI channels, Autoplay)`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
