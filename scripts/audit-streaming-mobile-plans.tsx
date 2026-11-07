/**
 * #106 Phones-only plans (Zeesh, 2026-11-01: "स्क्रीन में भी हो सकता है कि एक मोबाइल या दो लैपटॉप … पता नहीं वो हमारे
 * वर्ल्ड पॉपुलेशन के साथ अलाइन होगा या नहीं होगा, तो सब एक बार ही देख लो"; plan §18.10, §18.11):
 *  - a Devices row: every device, or phones and tablets only (Netflix's Mobile plan); the free tier and the store have none;
 *  - a phones-only plan is weighed by each market's homes that watch on a phone alone (the world population's smartphone
 *    and home-screen access) and, by its price, the price-minded: it draws in phone-first markets and gives up the
 *    homes that watch on a TV;
 *  - its viewers stream 0.6 of the load (a smaller screen); its screens are phones, in the table and the viewer app;
 *  - a service without a phones-only plan is exactly as before.
 * Builds the full-platform test company (~40 s).
 */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type OwnedStreamingPricingPlan, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { streamingAverageViewerLoad, streamingOfferLoad } from '../services/streamingDeliveryLoad';
import { STREAMING_MOBILE_PLAN, normalizeStreamingPlanOffer, streamingPhoneOnlyShare } from '../services/streamingPlanOffer';
import {
    STREAMING_FREE_TIER_ROWS, STREAMING_STORE_ROWS, applyStreamingPlanBuilderChoice, describeStreamingPlanChanges, getStreamingPlanBuilderView,
} from '../services/streamingPlanBuilder';
import { getStreamingViewerPlans } from '../services/streamingViewerQuality';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { PlanBuilder } from '../components/streaming-transplant/PlanBuilder';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Mobile Plans Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const pct = (value: number) => `${(value * 100).toFixed(1)}%`;

async function main() {
    const started = performance.now();

    /* ── the market: homes that watch on a phone alone ── */
    assert.deepEqual([[49, 24], [71, 47], [86, 76], [94, 89]].map(([phones, screens]) => streamingPhoneOnlyShare({ smartphoneAccessPercent: phones, homeScreenAccessPercent: screens })),
        [.51, .338, .116, .053], 'The four development profiles: about half of the poorest markets\' phone homes have no TV-sized screen, one in twenty of the richest');
    console.log('PASS market: phone-only homes .51 / .338 / .116 / .053 across the four development profiles');

    /* ── the row and the offer ── */
    const newService = getStreamingPlanBuilderView(null);
    const ids = newService.rows.map(row => row.id);
    assert.equal(ids.indexOf('devices'), ids.indexOf('screens') - 1, 'Devices comes just before Screens');
    assert.deepEqual(newService.rows.find(row => row.id === 'devices')!.options.map(option => [option.value, option.label]),
        [['all', 'Every device'], ['mobile', 'Phones and tablets only']]);
    assert.ok(!STREAMING_FREE_TIER_ROWS.includes('devices') && !STREAMING_STORE_ROWS.includes('devices'), 'The free tier and the store play on every device');

    const qa = await buildStreamingFullPlatformQa(fresh('mobile-plans-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const view = getStreamingPlanBuilderView(qa.ownedStreamingPlatform);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id).serviceConfiguration.pricing;
    const basic = base.plans.find(plan => plan.monthly > 0)!;
    const mobileOffer = { ...normalizeStreamingPlanOffer(basic.offer ?? { picture: 'PICTURE_720P', colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', screens: 1 })!, devices: 'MOBILE' as const };
    const mobilePlan: OwnedStreamingPricingPlan = {
        id: 'MOBILE', name: 'Mobile', monthly: Math.max(1.99, Math.round((basic.monthly * .45) * 100) / 100), featureIds: ['catalogue', 'noads'], ads: false, offer: mobileOffer,
    };
    const withMobile = normalizeStreamingPricingConfiguration({ ...base, plans: [mobilePlan, ...base.plans] });
    assert.deepEqual(withMobile.plans[0].offer?.devices, 'MOBILE', 'A phones-only offer is kept');
    assert.equal(JSON.stringify(normalizeStreamingPricingConfiguration(withMobile)), JSON.stringify(withMobile), 'Normalising is idempotent');
    const toAll = applyStreamingPlanBuilderChoice(withMobile, 'MOBILE', 'devices', 'all', view);
    assert.equal(toAll.plans[0].offer?.devices, undefined, 'Every device again: the field goes, the offer is as any other');
    assert.equal(normalizeStreamingPlanOffer({ ...mobileOffer, devices: 'WATCH' }).devices, undefined, 'An unknown device set is dropped');
    assert.deepEqual(describeStreamingPlanChanges(toAll, withMobile, view).filter(line => line.startsWith('Mobile:')), ['Mobile: phones and tablets only'],
        'The receipt names it');
    console.log('PASS offer: Devices sits before Screens; phones-only is kept, idempotent, undone by Every device, named in the receipt');

    /* ── load ── */
    const { devices: _devices, ...everyDevice } = mobileOffer;
    assert.equal(Math.round(streamingOfferLoad(mobileOffer) / streamingOfferLoad(everyDevice) * 1000) / 1000, STREAMING_MOBILE_PLAN.load, 'A phone viewer streams 0.6 of the same plan on a TV');
    const platformWith = (pricing: OwnedStreamingPricingConfiguration) => ({ ...qa.ownedStreamingPlatform, serviceConfiguration: { ...qa.ownedStreamingPlatform.serviceConfiguration, pricing } });
    const mixed = streamingAverageViewerLoad(platformWith(withMobile), [{ planId: 'MOBILE', paidAccounts: 1_000 }, { planId: basic.id, paidAccounts: 1_000 }]);
    const allBasic = streamingAverageViewerLoad(platformWith(withMobile), [{ planId: basic.id, paidAccounts: 2_000 }]);
    assert.ok(mixed < allBasic, `Phone viewers lower the average load: ${mixed.toFixed(3)} against ${allBasic.toFixed(3)}`);
    console.log(`PASS load: a phone viewer streams ×${STREAMING_MOBILE_PLAN.load}; half on Mobile, the average load ${allBasic.toFixed(3)} → ${mixed.toFixed(3)}`);

    /* ── the world: phone-first markets take it, TV markets keep their plans ── */
    const playerWith = (pricing: OwnedStreamingPricingConfiguration): Player => ({ ...qa, ownedStreamingPlatform: platformWith(pricing) } as Player);
    const before = getWorldStreamingOffers(qa, week).offers.find(offer => offer.isPlayer)!;
    const unchanged = getWorldStreamingOffers(playerWith(normalizeStreamingPricingConfiguration(base)), week).offers.find(offer => offer.isPlayer)!;
    assert.equal(unchanged.sourceFingerprint, before.sourceFingerprint, 'Without a phones-only plan the offer is exactly as before');
    assert.ok(!before.phoneOnlyShareByCountry && before.plans.every(plan => !plan.mobileOnly), 'No phone-only shares, no mobile plans');
    const offers = getWorldStreamingOffers(playerWith(withMobile), week).offers;
    const mine = offers.find(offer => offer.isPlayer)!;
    assert.deepEqual(mine.plans.filter(plan => plan.mobileOnly).map(plan => plan.id), ['MOBILE'], 'The world sees the phones-only plan');
    assert.equal(Object.keys(mine.phoneOnlyShareByCountry ?? {}).length, mine.activeCountryIds.length, 'and each market\'s phone-only homes');
    const shareOf = (countryId: string) => mine.phoneOnlyShareByCountry![countryId];
    const markets = mine.activeCountryIds.filter(id => qa.world.worldAudienceEconomy?.countries[id] && qa.world.worldAudienceParticipation?.countries[id])
        .sort((left, right) => shareOf(right) - shareOf(left) || left.localeCompare(right));
    const phoneFirst = markets.slice(0, 4);
    const tvFirst = markets.slice(-4);
    const homesIn = (player: Player, list: string[]) => {
        const registry = getWorldStreamingOffers(player, week).offers;
        let total = 0;
        let mobile = 0;
        for (const countryId of list) {
            const audience = player.world.worldAudienceEconomy!.countries[countryId];
            const participation = player.world.worldAudienceParticipation!.countries[countryId];
            audience.cohorts.forEach(cohort => {
                const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
                if (!overlay) return;
                allocateStreamingAudienceChoice(countryId, cohort, overlay, registry).allocations
                    .filter(row => row.platformId === 'PLAYER' && row.kind === 'SUBSCRIPTION').forEach(row => {
                        total += row.primaryHouseholds;
                        if (row.planId === 'MOBILE') mobile += row.primaryHouseholds;
                    });
            });
        }
        return { total, mobile, share: total ? mobile / total : 0 };
    };
    const phoneMarkets = homesIn(playerWith(withMobile), phoneFirst);
    const tvMarkets = homesIn(playerWith(withMobile), tvFirst);
    const phoneBefore = homesIn(qa, phoneFirst);
    const tvBefore = homesIn(qa, tvFirst);
    const named = (list: string[]) => list.map(id => `${id} ${shareOf(id)}`).join(', ');
    assert.ok(phoneMarkets.share > tvMarkets.share + .1,
        `Phone-first markets (${named(phoneFirst)}) take Mobile ${pct(phoneMarkets.share)}; TV markets (${named(tvFirst)}) ${pct(tvMarkets.share)}`);
    assert.ok(tvMarkets.share < .5, `TV markets keep their plans: Mobile ${pct(tvMarkets.share)} of the service's homes there`);
    assert.ok(phoneMarkets.total > phoneBefore.total && tvMarkets.total > tvBefore.total,
        `It draws price-minded homes the plans did not, everywhere: ${phoneBefore.total.toLocaleString()} → ${phoneMarkets.total.toLocaleString()}, ${tvBefore.total.toLocaleString()} → ${tvMarkets.total.toLocaleString()}`);
    const kept = (after: { total: number; mobile: number }, was: { total: number }) => (after.total - after.mobile) / Math.max(1, was.total);
    assert.ok(kept(tvMarkets, tvBefore) > kept(phoneMarkets, phoneBefore) && kept(tvMarkets, tvBefore) > .8,
        `TV homes keep their plans (${pct(kept(tvMarkets, tvBefore))} of the full plans' homes stay), phone-first homes move more (${pct(kept(phoneMarkets, phoneBefore))})`);
    console.log(`PASS world: phone-first ${named(phoneFirst)}: Mobile ${pct(phoneMarkets.share)}, homes ${phoneBefore.total.toLocaleString()} → ${phoneMarkets.total.toLocaleString()}, `
        + `full plans keep ${pct(kept(phoneMarkets, phoneBefore))}; TV-first ${named(tvFirst)}: Mobile ${pct(tvMarkets.share)}, homes ${tvBefore.total.toLocaleString()} → ${tvMarkets.total.toLocaleString()}, `
        + `full plans keep ${pct(kept(tvMarkets, tvBefore))}`);

    /* ── where the player sees it: the table and the viewer app ── */
    const table = renderToStaticMarkup(createElement(PlanBuilder, { pricing: withMobile, builder: view, onChange: () => undefined }));
    assert.match(table, /aria-label="Mobile Devices: Mobile\. Change"[\s\S]*?<small>Phones<\/small>/, 'The Devices row: Mobile, drawn as a phone and a tablet');
    assert.match(table, new RegExp(`aria-label="${basic.name} Devices: All\\. Change"[\\s\\S]*?<small>Every device</small>`), 'Every other plan: every device');
    const screensCell = table.slice(table.indexOf('aria-label="Mobile Screens:'), table.indexOf('</td>', table.indexOf('aria-label="Mobile Screens:')));
    assert.ok(screensCell.includes('M5.5 7.6h1') && !screensCell.includes('M4.3 9h3.4'), 'Its screens are phones');
    assert.match(table, /aria-label="Free with ads Devices: not part of it"/, 'The free tier has no Devices cell');
    const viewer = getStreamingViewerPlans(platformWith(withMobile) as typeof qa.ownedStreamingPlatform, week).plans.find(plan => plan.id === 'MOBILE')!;
    assert.ok(viewer.features.includes('Phones and tablets only') && viewer.features.includes('1 phone at a time'), `The app's card says so: ${viewer.features.join(' · ')}`);
    console.log('PASS UI: the Devices row (Mobile as a phone and a tablet, others every device), phone screens, the app\'s card');
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
