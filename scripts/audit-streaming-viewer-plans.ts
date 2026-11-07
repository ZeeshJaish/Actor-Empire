/** The plans as a viewer meets them, Phase 2 #48 (codex-handoff/plans/platform-tech-plan.md §8:
 *  "a plan picker or paywall screen built from the real plans; ad breaks in the player on ad
 *  plans"). Checks:
 *  - the plan list: the free tier first when it runs, then the paid plans, each with its price,
 *    headline picture, features and ads in the apps' words, from the normalised pricing;
 *  - ad spots: the service's ad minutes an hour by each plan's level (#44), as the engine counts
 *    them; none when advertising is off; the free tier at the full cadence;
 *  - each plan's view: its menu (dearer pictures greyed), badges, and "Now in 4K on Premium" on a
 *    plan without the new picture;
 *  - the plan the app opens on: the most households, else the first paid plan, else the free tier;
 *    an ad-only service shows only the free tier, a store-only one no plans;
 *  - the ad breaks the player plays for a plan's spots;
 *  - Phase 1's view is the opening plan's view (the same quality object);
 *  - the app: the avatar opens the plans, "Watching as …", the upsell banner; the canonical
 *    viewer state carries the plans. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPlatformState, type OwnedStreamingPricingConfiguration,
    type OwnedStreamingTechTreeState, type Player, type WorldStreamingPlanAllocation,
} from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { resolveStreamingTechTree, streamingTechVersion } from '../services/streamingTechTreeCatalogue';
import { getStreamingViewerPlans, getStreamingViewerQuality, streamingViewerAdBreaks } from '../services/streamingViewerQuality';
import { createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { ViewerApp, type AppState } from '../components/streaming-transplant/StreamingViewerExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_1080P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});
const allocation = (planId: string, households: number): WorldStreamingPlanAllocation => ({
    planId, planName: planId, households, monthlyHouseholds: households, annualHouseholds: 0, effectiveMonthlyPrice: 0, monthlySubscriptionRevenue: 0,
});

function main() {
    const started = performance.now();
    const base = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'viewer-plans', name: 'Viewer Plans Audit', age: 15, currentWeek: 1 });
    const week = 900;
    /* a service with 4K, HDR and spatial sound, all given; and the same with 4K bought this week */
    const given = resolveStreamingTechTree({ technologyLevels: { PLAYBACK_QUALITY: 60 } });
    assert.ok(['PICTURE_4K', 'HDR_HDR', 'SOUND_SPATIAL', 'SOUND_51'].every(id => streamingTechVersion(given, id as never) >= 1), 'The audit tree owns 4K, HDR, 5.1 and spatial sound');
    const { granted: _granted, ...fourK } = given.techs.PICTURE_4K!;
    const boughtFourK: OwnedStreamingTechTreeState = {
        ...given, techs: { ...given.techs, PICTURE_4K: { ...fourK, unlockedAtAbsoluteWeek: week, versionReachedAtAbsoluteWeek: week } },
    };
    const platformWith = (pricing: OwnedStreamingPricingConfiguration, tree = given): OwnedStreamingPlatformState => ({
        ...base.ownedStreamingPlatform,
        techTree: tree,
        serviceConfiguration: { ...base.ownedStreamingPlatform.serviceConfiguration, pricing },
    });

    /* ── the plan list ── */
    const start = base.ownedStreamingPlatform.serviceConfiguration.pricing;
    let pricing = normalizeStreamingPricingConfiguration({
        ...start,
        streams: ['subs', 'ads'],
        ads: { minutesPerHour: 4, cpm: 22 },
        plans: [
            { id: 'BASIC', name: 'Basic with ads', monthly: 7.99, featureIds: [], ads: true, adLevel: 'LIGHT', offer: offer({ screens: 2 }), colorId: 'ocean' },
            { id: 'STANDARD', name: 'Standard', monthly: 9.99, featureIds: [], ads: true, adLevel: 'STANDARD', offer: offer({ screens: 2, sound: 'SOUND_51' }) },
            { id: 'PREMIUM', name: 'Premium', monthly: 14.99, featureIds: [], ads: false, colorId: 'magenta',
                offer: offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', sound: 'SOUND_SPATIAL', dialogue: true, screens: 4, downloads: true }) },
            { id: 'LITE', name: 'Lite', monthly: 4.99, featureIds: [], ads: true, adLevel: 'HEAVY', offer: offer({ picture: 'PICTURE_720P' }) },
        ],
    });
    pricing = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
    pricing = configureStreamingPricingOffer(pricing, { kind: 'BENEFIT', offer: 'PLAN', planId: 'PREMIUM', premiumAccess: true, earlyAccessWeeks: 2 });
    assert.ok(pricing.commercialOffers?.freeAdAccess && !pricing.freeAdOffer, 'The audit service runs Free with ads, its quality not set');
    const view = getStreamingViewerPlans(platformWith(pricing), week);
    assert.deepEqual(view.plans.map(plan => plan.id), ['FREE_AD', 'BASIC', 'STANDARD', 'PREMIUM', 'LITE'], 'The free tier first, then the plans as the table lists them');
    assert.deepEqual(view.plans.map(plan => plan.price), ['Free', '$7.99 a month', '$9.99 a month', '$14.99 a month', '$4.99 a month']);
    assert.deepEqual(view.plans.map(plan => plan.ads), ['With ads', 'Limited ads', 'With ads', 'No ads', 'More ads'], 'Ads in the apps\' words');
    const premium = view.plans.find(plan => plan.id === 'PREMIUM')!;
    assert.deepEqual([premium.picture, premium.features],
        ['4K HDR', ['Spatial audio', 'Clear dialogue', '4 screens at once', 'Downloads', 'Premieres 2 weeks early']], 'Premium\'s card: its offer, then its premieres');
    assert.deepEqual([view.plans[1].picture, view.plans[1].features, view.plans[1].colorId], ['1080p Full HD', ['2 screens at once'], 'ocean'],
        'Basic\'s card, in the colour the table gives it');
    assert.deepEqual([view.plans[2].features], [['5.1 surround sound', '2 screens at once']]);
    const free = view.plans[0];
    assert.deepEqual([free.qualityNotSet, free.picture, free.features], [true, '720p', ['1 screen at a time']],
        'The free tier, its quality unset, starts from the cheapest plan (Lite, 720p) without downloads (#46)');
    console.log(`PASS list: ${view.plans.map(plan => `${plan.name} ${plan.price} (${plan.picture}, ${plan.ads.toLowerCase()})`).join(' · ')}`);

    /* ── ad spots: the engine's ad minutes an hour by level, two 30-second spots a minute ── */
    assert.deepEqual(view.plans.map(plan => plan.adSpotsPerHour), [8, 4, 8, 0, 16],
        'At 4 ad minutes an hour: free 8 spots, limited 4, standard 8, none 0, more 16');
    /* #103 (plan §18.3): Free with ads off closes the free tier only; each plan keeps its own ads (it took them all) */
    const adsOff = configureStreamingPricingOffer(pricing, { kind: 'TOGGLE', offer: 'ADS', enabled: false });
    const offView = getStreamingViewerPlans(platformWith(adsOff), week);
    assert.deepEqual([offView.plans.map(plan => plan.id), offView.plans.map(plan => plan.adSpotsPerHour)],
        [['BASIC', 'STANDARD', 'PREMIUM', 'LITE'], [4, 8, 0, 16]], 'Free with ads off: no free tier; the plans keep their ads');
    const busier = getStreamingViewerPlans(platformWith(normalizeStreamingPricingConfiguration({ ...pricing, ads: { minutesPerHour: 12, cpm: 22 } })), week);
    assert.deepEqual(busier.plans.map(plan => plan.adSpotsPerHour), [24, 12, 24, 0, 48], 'A busier cadence scales every plan with ads');
    console.log('PASS spots: free 8, limited 4, with ads 8, more 16 an hour at 4 ad minutes; Free with ads off closes the free tier, the plans keep theirs');

    /* ── the ad breaks the player plays ── */
    const breaks = (spots: number) => streamingViewerAdBreaks(spots).map(item => `${item.at}${item.spots > 1 ? `×${item.spots}` : ''}`).join(' ');
    assert.deepEqual([0, 4, 8, 16, 24, 48].map(breaks), ['', '0 50', '0 33 67', '0 25 50 75', '0×2 25×2 50×2 75×2', '0×3 25×3 50×3 75×3'],
        'A pre-roll and 1–3 mid-rolls by spots an hour; busier plans get longer breaks');
    console.log(`PASS breaks: limited [${breaks(4)}], with ads [${breaks(8)}], more [${breaks(16)}], busy [${breaks(24)}] (percent into the title, ×spots)`);

    /* ── each plan's view, and "Now in 4K on Premium" ── */
    const basic = view.plans[1].quality;
    assert.deepEqual([basic.planName, basic.planMax, basic.badges, basic.menu.map(option => `${option.label}:${option.state}`)],
        ['Basic with ads', '1080p', ['HD'], ['4K:UPGRADE', '1080p:AVAILABLE', '720p:AVAILABLE', '480p:AVAILABLE']], 'Basic sees 1080p and 4K greyed');
    assert.deepEqual([premium.quality.planMax, premium.quality.badges], ['4K', ['4K', 'HDR', 'Spatial audio']]);
    assert.deepEqual([basic.nowIn, premium.quality.nowIn], [null, null], 'Given tech brings no "Now in"');
    const fresh = getStreamingViewerPlans(platformWith(pricing, boughtFourK), week);
    const freshBasic = fresh.plans.find(plan => plan.id === 'BASIC')!.quality;
    const freshPremium = fresh.plans.find(plan => plan.id === 'PREMIUM')!.quality;
    assert.deepEqual([freshBasic.nowIn, freshBasic.nowInOn], ['Now in 4K', { plan: 'Premium', picture: '4K' }],
        'On Basic, the 4K the service just bought is on Premium');
    assert.deepEqual([freshPremium.nowIn, freshPremium.nowInOn], ['Now in 4K', undefined], 'On Premium, it is theirs');
    assert.equal(getStreamingViewerPlans(platformWith(pricing, boughtFourK), week + 2).plans[1].quality.nowIn, null, 'For two weeks');
    console.log('PASS views: Basic 1080p with 4K greyed, Premium 4K HDR spatial; "Now in 4K on Premium" on Basic the week 4K is bought');

    /* ── the plan the app opens on; ad-only and store-only services ── */
    assert.equal(view.currentId, 'BASIC', 'No households yet: the first plan');
    assert.equal(getStreamingViewerPlans(platformWith(pricing), week, [allocation('BASIC', 3), allocation('PREMIUM', 10)]).currentId, 'PREMIUM', 'The most households');
    const adOnly = configureStreamingPricingOffer(pricing, { kind: 'CORE', coreModel: 'ADVERTISING', alone: true });
    const adOnlyView = getStreamingViewerPlans(platformWith(adOnly), week);
    assert.deepEqual([adOnlyView.plans.map(plan => plan.id), adOnlyView.currentId], [['FREE_AD'], 'FREE_AD'], 'Ad-only: the free tier alone');
    const storeOnly = configureStreamingPricingOffer(pricing, { kind: 'CORE', coreModel: 'STORE', alone: true });
    assert.deepEqual([getStreamingViewerPlans(platformWith(storeOnly), week).plans, getStreamingViewerPlans(platformWith(storeOnly), week).currentId], [[], null],
        'Store-only: no plans to pick');
    console.log('PASS opening plan: the most households (Premium at 10), else the first plan; ad-only shows Free with ads alone; store-only none');

    /* ── Phase 1's view is the opening plan's view ── */
    const phaseOne = getStreamingViewerQuality(platformWith(pricing, boughtFourK), week);
    assert.deepEqual(phaseOne, freshBasic, 'The app opens on the same quality Phase 1 showed');
    console.log('PASS Phase 1: getStreamingViewerQuality equals the opening plan\'s view');

    /* ── the app ── */
    const brand: Brand = {
        name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
        publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
        lockupId: 'WORDMARK', serverCity: null,
    };
    const state: AppState = {
        live: true, layoutId: 'cinema', watchingNow: 12000, network: { peakLoad: 40, tier: '4K', latencyMs: 30 },
        titles: [{ id: 't1', title: 'Atlas Rising', kind: 'ORIGINAL', format: 'Series', genre: 'Drama', hue: 214, logline: 'A drama.', rank: 1 }],
        quality: phaseOne, plans: fresh.plans, currentPlanId: fresh.currentId,
    };
    const app = renderToStaticMarkup(createElement(ViewerApp, { brand, state, onBack: () => undefined }));
    assert.match(app, /aria-label="Your plan: Basic with ads\. Change plan"/, 'The avatar opens the plans');
    assert.match(app, /Watching as <b>Basic with ads<\/b><\/span><em>Change ›<\/em>/, '"Watching as Basic with ads", without saying "with ads" twice');
    assert.match(app, /<b>Now in 4K<\/b><span>on Premium<\/span><em>›<\/em>/, 'The banner names the plan that has 4K, and opens it');
    const onStandard = renderToStaticMarkup(createElement(ViewerApp, { brand, state: { ...state, currentPlanId: 'STANDARD' }, onBack: () => undefined }));
    assert.match(onStandard, /Watching as <b>Standard<\/b> · with ads/, 'A plan whose name does not say so gets "with ads"');
    const noPlans = renderToStaticMarkup(createElement(ViewerApp, { brand, state: { ...state, plans: undefined, currentPlanId: undefined }, onBack: () => undefined }));
    assert.doesNotMatch(noPlans, /Watching as|Change plan/, 'Without plans (the prototype\'s state) the app is as before');
    const player: Player = { ...base, ownedStreamingPlatform: platformWith(pricing) };
    const canonical = createCanonicalViewerState(player);
    assert.deepEqual([canonical.plans?.map(plan => plan.id), canonical.currentPlanId], [['FREE_AD', 'BASIC', 'STANDARD', 'PREMIUM', 'LITE'], 'BASIC'],
        'The game\'s viewer state carries the plans');
    console.log('PASS app: avatar and "Watching as Basic with ads · Change", "Now in 4K on Premium ›", unchanged without plans; the canonical state carries the plans');
    console.log(`done in ${Math.round(performance.now() - started)} ms`);
}

main();
