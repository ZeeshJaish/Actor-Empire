/** The plan builder, Phase 2 #45 (codex-handoff/plans/platform-tech-plan.md §6.2–§6.6). Checks:
 *  - the rows a plan sets (price, ads, the offer, the extras) and every step of each, with the
 *    version a service owns and, for a step it cannot sell, what to unlock and where;
 *  - each edit the table makes: offer rows (a lower picture takes HDR off), ad levels (the first
 *    ad plan switches advertising on without a free tier, the last one switches it off), early
 *    premieres, extras, price limits, add / duplicate / remove / rename / colour, the starters;
 *    a locked choice changes nothing, and every edit normalises to itself;
 *  - the starter plans differ, from what the service owns, and each one saves;
 *  - the receipt names every change; the save refuses a builder plan's locked extras;
 *  - both hosts render the table: the wizard's Pricing step (editable, with its forecast row)
 *    and the Offer tab (read-only until Change pricing, accounts under each plan). */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPricingConfiguration, type OwnedStreamingPricingPlan, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingEconomy';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { configureStreamingPricingOffer, projectStreamingCommercialOffers } from '../services/streamingCommercialOffers';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { streamingPlanOfferLocks } from '../services/streamingPlanOffer';
import { resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import {
    addStreamingPlan, applyStreamingPlanBuilderChoice, describeStreamingPlanChanges, duplicateStreamingPlan, getStreamingPlanBuilderView,
    removeStreamingPlan, renameStreamingPlan, replaceWithStreamingStarterPlans, setStreamingPlanColour, setStreamingPlanPrice,
    streamingPlanBuilderCellLock, streamingPlanBuilderOptionLock, streamingPlanBuilderValue, type StreamingPlanBuilderView,
} from '../services/streamingPlanBuilder';
import { PlanBuilder } from '../components/streaming-transplant/PlanBuilder';
import { PlatformOffer, type PlatformOfferData } from '../components/streaming-transplant/PlatformOffer';
import { StepPricing } from '../components/studio-finance/components/launch/StepPricing';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Builder Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const foundCompany = (id: string): Player => {
    let player = fresh(id);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    player = {
        ...player, money: STREAMING_INCORPORATION_ECONOMY.cashRequired, stats: { ...player.stats, fame: 80, reputation: 80 },
        ownedStreamingPlatform: { ...platform, lifecycle: 'ELIGIBLE', milestoneKeys: [...new Set([...platform.milestoneKeys, 'streaming-launch-clearance'])] },
    };
    const founded = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(player, {
        ...createDefaultStreamingFoundingDraft(weekOf(player)), currentStep: 2, name: 'BUILDER', primaryColor: '#2F7BFF', secondaryColor: '#0B1220',
    }));
    assert.ok(founded.changed, `The company is registered: ${founded.reason}`);
    const funded = contributeStreamingFounderCapital({ ...founded.player, money: founded.player.money + 500_000_000 }, 500_000_000, 'plan-builder:capital');
    assert.ok(funded.changed, `Founder capital: ${funded.reason}`);
    return funded.player;
};
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_480P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});
const plan = (id: string, monthly: number, rows: Partial<OwnedStreamingPlanOffer> = {}, extra: Partial<OwnedStreamingPricingPlan> = {}): OwnedStreamingPricingPlan => ({
    id, name: id, monthly, featureIds: ['catalogue', 'noads'], ads: false, offer: offer(rows), ...extra,
});
const subscriptionOnly = (plans: OwnedStreamingPricingPlan[]): OwnedStreamingPricingConfiguration => normalizeStreamingPricingConfiguration({
    ...configureStreamingPricingOffer(normalizeOwnedStreamingPlatformState(fresh('builder-pricing').ownedStreamingPlatform, 'builder-pricing').serviceConfiguration.pricing,
        { kind: 'CORE', coreModel: 'SUBSCRIPTION' }),
    plans,
});
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const idempotent = (pricing: OwnedStreamingPricingConfiguration, label: string) => assert.ok(
    same(normalizeStreamingPricingConfiguration(pricing), pricing), `${label}: the edit normalises to itself`);
const valueOf = (pricing: OwnedStreamingPricingConfiguration, id: string, row: Parameters<typeof streamingPlanBuilderValue>[2], view: StreamingPlanBuilderView) => (
    streamingPlanBuilderValue(pricing, pricing.plans.find(item => item.id === id)!, row, view.tree)
);

async function main() {
    const started = performance.now();

    /* ── rows and steps ── */
    const newService = getStreamingPlanBuilderView(null);
    assert.deepEqual(newService.rows.map(row => row.id),
        ['ads', 'picture', 'hdr', 'colour', 'sound', 'dialogue', 'devices', 'screens', 'downloads', 'kids', 'aiChannels', 'autoplay', 'early', 'live', 'extraseat', 'catalogue'],
        'Ads, the offer (Kids profiles, AI channels and Autoplay since #62; Devices since #106), then the extras');
    const pictures = newService.rows.find(row => row.id === 'picture')!.options;
    assert.deepEqual(pictures.map(option => option.label), ['480p', '720p', '1080p', '4K', '8K', '12K', '16K', '24K'], 'Picture runs 480p to 24K');
    assert.deepEqual([pictures[0].line, pictures[1].line], ['Version 1 · Basic', null], 'An owned step shows its version; one not owned shows none');
    assert.deepEqual(newService.rows.find(row => row.id === 'sound')!.options.map(option => option.short), ['Stereo', '5.1', '7.1', 'Spatial', 'Lossless', 'Personal'],
        'The table shows short sound names');
    assert.equal(newService.maxPlans, 12);
    const mid = getStreamingPlanBuilderView({
        technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 },
        productLines: [{ lineId: 'LIVE', status: 'PROPOSED' }],
        launchCommit: { committedAtAbsoluteWeek: 1 },
    });
    assert.deepEqual(mid.extraLocks, { live: 'Live & Sports is coming in a future update', extraseat: 'Unlock Paid extra member in Tech' }, 'Live needs EMPIRE+ Live running; an extra member, Paid extra member (#56)');
    // #109 (plan §18.5, 2): before launch Live events say when they come instead of a lock that cannot open
    assert.equal(getStreamingPlanBuilderView({ technologyLevels: {}, productLines: [] }).extraLocks.live, 'Live & Sports is coming in a future update');
    const late = getStreamingPlanBuilderView({
        technologyLevels: { PLAYBACK_QUALITY: 70, RELIABILITY: 50, DELIVERY_CAPACITY: 60, PRODUCT_EXPERIENCE: 40, ADVERTISING_COMMERCE: 35 },
        productLines: [{ lineId: 'LIVE', status: 'ACTIVE' }],
    });
    assert.deepEqual(late.extraLocks, { extraseat: 'Unlock Paid extra member in Tech' }, 'With EMPIRE+ Live running Live is open; Commerce 35 no longer opens an extra member (#56)');
    const sharing = { version: 1, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 };
    const members = getStreamingPlanBuilderView({
        technologyLevels: { PLAYBACK_QUALITY: 70, RELIABILITY: 50, DELIVERY_CAPACITY: 60, PRODUCT_EXPERIENCE: 40, ADVERTISING_COMMERCE: 0 },
        productLines: [{ lineId: 'LIVE', status: 'ACTIVE' }],
        techTree: { schemaVersion: 5, convertedFromLegacy: false, techs: { TRUST_HOUSEHOLD: sharing, TRUST_DEVICE_CHECK: sharing, TRUST_EXTRA_MEMBER: sharing } },
    });
    assert.deepEqual(members.extraLocks, {}, 'With Paid extra member, both extras are open');
    console.log('PASS rows: ads, 10 offer rows, 4 extras; 480p–24K with versions; extras need EMPIRE+ Live and Paid extra member');

    /* ── locks: what to unlock, and where ── */
    const base = subscriptionOnly([plan('BASE', 7.99), plan('MID', 12.99, { picture: 'PICTURE_1080P', screens: 2, downloads: true })]);
    const basePlan = base.plans[0];
    const lockOf = (view: StreamingPlanBuilderView, row: Parameters<typeof streamingPlanBuilderOptionLock>[2], value: string, target = basePlan) => (
        streamingPlanBuilderOptionLock(base, target, row, value, view)
    );
    assert.deepEqual(lockOf(newService, 'picture', 'PICTURE_720P'), { row: 'picture', needs: 'Unlock 720p in Tech', techId: 'PICTURE_720P' });
    assert.deepEqual(lockOf(newService, 'screens', '2'), { row: 'screens', needs: 'Unlock Profiles and screens in Tech', techId: 'FAM_SCREENS' }); // #60
    // since #52 downloads come from Playback's Downloads, so Go to Tech opens it
    assert.deepEqual(lockOf(newService, 'downloads', 'on'), { row: 'downloads', needs: 'Unlock Downloads in Tech', techId: 'PLAY_DOWNLOADS' });
    assert.deepEqual(lockOf(mid, 'hdr', 'HDR_HDR'), { row: 'hdr', needs: 'HDR needs a 1080p or better picture', techId: null, combination: true },
        'HDR on a 480p plan is a combination it cannot have, not something to unlock');
    assert.equal(lockOf(mid, 'picture', 'PICTURE_4K'), null, '4K is open to a service with Playback 60');
    assert.deepEqual(lockOf(mid, 'picture', 'PICTURE_8K')?.needs, 'Unlock 8K in Tech');
    assert.deepEqual(lockOf(mid, 'live', 'on'), { row: 'live', needs: 'Live & Sports is coming in a future update', techId: null });
    assert.equal(lockOf(mid, 'live', 'off'), null, 'Taking an extra off is never locked');
    assert.equal(lockOf(mid, 'catalogue', 'on'), null, 'The full catalogue needs nothing');
    assert.equal(streamingPlanBuilderCellLock(base, base.plans[1], 'picture', newService)?.needs, 'Unlock 1080p in Tech',
        'A plan holding a step the tree does not cover shows the lock in its cell');
    console.log('PASS locks: unlock-in-Tech steps name their tech; combinations and levels say what they need; a held locked step shows in its cell');

    /* ── edits ── */
    let pricing = applyStreamingPlanBuilderChoice(base, 'MID', 'picture', 'PICTURE_4K', mid);
    pricing = applyStreamingPlanBuilderChoice(pricing, 'MID', 'hdr', 'HDR_HDR', mid);
    assert.deepEqual([valueOf(pricing, 'MID', 'picture', mid), valueOf(pricing, 'MID', 'hdr', mid)], ['PICTURE_4K', 'HDR_HDR']);
    assert.ok(pricing.plans[1].featureIds.includes('uhd'), '4K with HDR reads as uhd to the feature engines');
    pricing = applyStreamingPlanBuilderChoice(pricing, 'MID', 'picture', 'PICTURE_720P', mid);
    assert.deepEqual([valueOf(pricing, 'MID', 'picture', mid), valueOf(pricing, 'MID', 'hdr', mid)], ['PICTURE_720P', 'off'], 'Dropping below 1080p takes HDR off with it');
    idempotent(pricing, 'offer rows');
    const refusedEdit = applyStreamingPlanBuilderChoice(pricing, 'MID', 'picture', 'PICTURE_8K', mid);
    assert.equal(refusedEdit, pricing, 'A locked choice changes nothing');

    /* ads: the first ad plan turns advertising on without a free tier; the last turns it off */
    assert.deepEqual(base.streams, ['subs']);
    const withAds = applyStreamingPlanBuilderChoice(base, 'BASE', 'ads', 'LIGHT', mid);
    assert.deepEqual([withAds.streams.includes('ads'), withAds.commercialOffers?.freeAdAccess, withAds.plans[0].ads, withAds.plans[0].adLevel],
        [true, false, true, 'LIGHT'], 'Light ads on a plan: advertising on, no free tier');
    assert.ok(withAds.ads.minutesPerHour > 0, 'Advertising starts with a cadence');
    assert.equal(projectStreamingCommercialOffers(withAds).freeAdOffer, null, 'No free offer appears');
    assert.ok(!withAds.plans[0].featureIds.includes('noads'));
    idempotent(withAds, 'ads on');
    const heavy = applyStreamingPlanBuilderChoice(withAds, 'BASE', 'ads', 'HEAVY', mid);
    assert.equal(heavy.plans[0].adLevel, 'HEAVY');
    const adsOff = applyStreamingPlanBuilderChoice(heavy, 'BASE', 'ads', 'NONE', mid);
    assert.deepEqual([adsOff.streams.includes('ads'), adsOff.plans[0].ads, adsOff.plans[0].adLevel, adsOff.plans[0].featureIds.includes('noads')],
        [false, false, undefined, true], 'The last ad plan going ad-free switches advertising off');
    const freeTier = configureStreamingPricingOffer(withAds, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
    assert.equal(freeTier.commercialOffers?.freeAdAccess, true);
    const freeKept = applyStreamingPlanBuilderChoice(freeTier, 'BASE', 'ads', 'NONE', mid);
    assert.deepEqual([freeKept.streams.includes('ads'), freeKept.commercialOffers?.freeAdAccess], [true, true], 'A free tier keeps advertising on');

    /* early premieres, extras, price */
    const early = applyStreamingPlanBuilderChoice(base, 'MID', 'early', '2', mid);
    assert.deepEqual([early.commercialOffers?.benefits.plans.MID, early.plans[1].featureIds.includes('early'), valueOf(early, 'MID', 'early', mid)],
        [{ premiumAccess: true, earlyAccessWeeks: 2 }, true, '2'], 'Two weeks early: the plan benefit and its feature');
    const onRelease = applyStreamingPlanBuilderChoice(early, 'MID', 'early', 'off', mid);
    assert.deepEqual([onRelease.commercialOffers?.benefits.plans.MID, onRelease.plans[1].featureIds.includes('early')], [{ premiumAccess: false, earlyAccessWeeks: 0 }, false]);
    const live = applyStreamingPlanBuilderChoice(base, 'MID', 'live', 'on', late);
    assert.ok(live.plans[1].featureIds.includes('live'));
    assert.ok(!applyStreamingPlanBuilderChoice(base, 'MID', 'catalogue', 'off', late).plans[1].featureIds.includes('catalogue'));
    assert.deepEqual([setStreamingPlanPrice(base, 'BASE', .25).plans[0].monthly, setStreamingPlanPrice(base, 'BASE', 250).plans[0].monthly,
        setStreamingPlanPrice(base, 'BASE', 6.499).plans[0].monthly], [.99, 100, 6.5], 'A paid plan stays between $0.99 and $100, to the cent');
    idempotent(early, 'early premieres');

    /* add, duplicate, remove, rename, colour */
    const added = addStreamingPlan(base, mid);
    assert.equal(added.planId, 'PLAN_3');
    const addedPlan = added.pricing.plans[2];
    assert.deepEqual([addedPlan.name, addedPlan.monthly, addedPlan.offer], ['Plan 3', 15.99, base.plans[1].offer], 'A new plan copies the last one at $3 more');
    const twelve = subscriptionOnly(Array.from({ length: 12 }, (_, index) => plan(`T${index}`, 5 + index)));
    assert.equal(addStreamingPlan(twelve, mid).planId, null, 'Twelve plans at most');
    assert.equal(duplicateStreamingPlan(twelve, 'T0', mid).planId, null);
    const copied = duplicateStreamingPlan(early, 'MID', mid);
    assert.deepEqual(copied.pricing.plans.map(item => item.name), ['BASE', 'MID', 'MID copy'], 'A copy sits right after its plan');
    assert.ok(!copied.pricing.plans[2].featureIds.includes('early'), 'A copy does not take its plan\'s early premieres');
    const aimed = normalizeStreamingPricingConfiguration({ ...early, introOfferPlanId: 'MID' });
    const removed = removeStreamingPlan(aimed, 'MID');
    assert.deepEqual([removed.plans.map(item => item.id), removed.introOfferPlanId, removed.commercialOffers?.benefits.plans.MID], [['BASE'], undefined, undefined],
        'A removed plan takes its aimed offer and its benefit with it');
    assert.equal(removeStreamingPlan(removed, 'BASE'), removed, 'The last plan stays');
    assert.equal(renameStreamingPlan(base, 'BASE', '  Mobile   only ').plans[0].name, 'Mobile only');
    assert.equal(renameStreamingPlan(base, 'BASE', '   '), base, 'An empty name is ignored');
    assert.equal(setStreamingPlanColour(base, 'BASE', 'rose').plans[0].colorId, 'rose');
    console.log('PASS edits: offer rows settle, locked choices change nothing, ads switch advertising on and off without a free tier, early premieres, extras, prices, add / copy / remove / rename / colour');

    /* ── starters ── */
    const starterRows = (view: StreamingPlanBuilderView) => view.suggestions.map(item => [item.name, item.monthly, item.adLevel ?? 'NONE', item.offer!.picture, item.offer!.hdr, item.offer!.sound, item.offer!.screens]);
    assert.deepEqual(starterRows(newService), [
        ['Basic with ads', 7.99, 'STANDARD', 'PICTURE_480P', null, 'SOUND_STEREO', 1],
        ['Standard', 9.99, 'NONE', 'PICTURE_480P', null, 'SOUND_STEREO', 1],
    ], 'A new service: two starters, set apart by ads (Premium would offer nothing more)');
    assert.deepEqual(starterRows(mid), [
        ['Basic with ads', 7.99, 'STANDARD', 'PICTURE_1080P', null, 'SOUND_STEREO', 1],
        ['Standard', 9.99, 'NONE', 'PICTURE_1080P', 'HDR_HDR', 'SOUND_71', 2],
        ['Premium', 14.99, 'NONE', 'PICTURE_4K', 'HDR_HDR', 'SOUND_SPATIAL', 4],
    ], 'Mid-game: three starters that differ');
    const eightK = getStreamingPlanBuilderView({ techTree: { schemaVersion: 2, convertedFromLegacy: false, techs: {
        ...resolveStreamingTechTree({ technologyLevels: { PLAYBACK_QUALITY: 70 } }).techs,
        PICTURE_8K: { version: 1, progress: 0, unlockedAtAbsoluteWeek: 1, granted: true },
    } }, technologyLevels: { PLAYBACK_QUALITY: 70, RELIABILITY: 40, PRODUCT_EXPERIENCE: 30 } });
    assert.deepEqual([eightK.suggestions[2].offer!.picture, eightK.suggestions[2].monthly], ['PICTURE_8K', 17.99], 'Premium with 8K: $3 more per step past 4K');
    [newService, mid, late, eightK].forEach((view, index) => view.suggestions.forEach(item => assert.deepEqual(
        streamingPlanOfferLocks(item.offer!, view.tree, view.levels), [], `Starter ${item.name} (view ${index}) is sellable`)));
    const replaced = replaceWithStreamingStarterPlans(early, mid);
    assert.deepEqual([replaced.plans.map(item => item.name), replaced.commercialOffers?.benefits.plans, replaced.streams.includes('ads'), replaced.commercialOffers?.freeAdAccess],
        [['Basic with ads', 'Standard', 'Premium'], {}, true, false], 'Starters replace every plan; Basic with ads switches advertising on, without a free tier');
    idempotent(replaced, 'starters');
    console.log('PASS starters: 2 for a new service, 3 that differ mid-game, Premium +$3 a step past 4K, all sellable');

    /* ── the receipt ── */
    let draft = applyStreamingPlanBuilderChoice(base, 'BASE', 'ads', 'LIGHT', mid);
    draft = applyStreamingPlanBuilderChoice(draft, 'MID', 'picture', 'PICTURE_4K', mid);
    draft = applyStreamingPlanBuilderChoice(draft, 'MID', 'screens', '4', mid);
    draft = applyStreamingPlanBuilderChoice(draft, 'MID', 'early', '2', mid);
    draft = applyStreamingPlanBuilderChoice(draft, 'MID', 'catalogue', 'off', mid);
    draft = renameStreamingPlan(setStreamingPlanPrice(draft, 'MID', 13.49), 'MID', 'Family');
    draft = addStreamingPlan(draft, mid).pricing;
    const receipt = describeStreamingPlanChanges(base, draft, mid);
    assert.deepEqual(receipt, [
        'BASE: No ads → Light ads',
        'MID renamed Family',
        'Family $12.99 → $13.49',
        'Family: Picture 1080p → 4K',
        'Family: 2 screens → 4 screens',
        'Family: premieres 2 weeks early',
        'Family: Full catalogue off',
        'Plan 3 added at $16.49',
    ], 'Every change, in words');
    assert.deepEqual(describeStreamingPlanChanges(draft, removeStreamingPlan(draft, 'BASE'), mid), ['BASE removed']);
    assert.deepEqual(describeStreamingPlanChanges(base, base, mid), [], 'No change, no lines');
    console.log('PASS receipt: added, removed, renamed, price, ads, picture, screens, early premieres, extras');

    /* ── the save: builder plans save; their locked extras are refused ── */
    const company = foundCompany('plan-builder-company');
    const view = getStreamingPlanBuilderView(company.ownedStreamingPlatform);
    const starters = replaceWithStreamingStarterPlans(configureStreamingPricingOffer(
        normalizeOwnedStreamingPlatformState(company.ownedStreamingPlatform, company.id).serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'SUBSCRIPTION' }), view);
    const savedStarters = saveStreamingPricingPlan(company, starters);
    assert.deepEqual([savedStarters.changed, savedStarters.reason, savedStarters.locked, savedStarters.dropped], [true, 'SAVED', undefined, undefined], 'The starters save as they are');
    const savedPricing = savedStarters.player.ownedStreamingPlatform.serviceConfiguration.pricing;
    assert.deepEqual(savedPricing.plans.map(item => [item.name, item.adLevel ?? 'NONE']), [['Basic with ads', 'STANDARD'], ['Standard', 'NONE']]);
    const withLive = { ...starters, plans: starters.plans.map((item, index) => index === 1 ? { ...item, featureIds: [...item.featureIds, 'live'] } : item) };
    const liveRefused = saveStreamingPricingPlan(company, withLive);
    assert.deepEqual([liveRefused.changed, liveRefused.reason, liveRefused.locked?.map(lock => [lock.planName, lock.row, lock.needs])],
        [false, 'LOCKED_OPTION', [['Standard', 'live', 'Live & Sports is coming in a future update']]], 'A builder plan\'s locked extra is refused with what it needs');
    console.log('PASS save: the starters save; a builder plan\'s locked extra is refused (LOCKED_OPTION)');

    /* ── both hosts render the table ── */
    const readOnly = renderToStaticMarkup(createElement(PlanBuilder, {
        pricing: draft, builder: mid, footer: { label: 'On it', cells: { BASE: { value: '19.1M', detail: '86%' } }, empty: 'new' },
    }));
    assert.match(readOnly, /BASE[\s\S]*Family[\s\S]*Plan 3/, 'Plans are columns');
    // #105: each plan's price sits in its column's head, so the rows start at Ads
    assert.match(readOnly, /<b>\$7\.99<\/b><small>a month<\/small>[\s\S]*Ads[\s\S]*Picture[\s\S]*Early premieres[\s\S]*Full catalogue[\s\S]*On it/, 'Prices in the heads, rows in order, the footer last');
    assert.doesNotMatch(readOnly, /\. Change"|\+ Add plan|Suggest plans/, 'Read-only: no cell is a button, no add or suggest');
    assert.match(readOnly, /19\.1M[\s\S]*86%[\s\S]*new/, 'The footer shows each plan\'s figure, or "new"');
    const editable = renderToStaticMarkup(createElement(PlanBuilder, {
        pricing: draft, builder: mid, saved: base, onChange: () => undefined, suggest: true, colours: ['rose'],
    }));
    assert.match(editable, /aria-label="Family Picture: 4K\. Change"/, 'Every cell is a tap');
    assert.match(editable, /\+ Add plan/);
    assert.match(editable, /Suggest plans from my tech/);
    assert.match(editable, />NEW</, 'A plan added in this edit is tagged NEW');
    const wizardData = { pricing: base, market: { rivalAveragePrice: 12, reachRate: .3 }, capabilityLocks: {}, planBuilder: mid };
    const wizard = renderToStaticMarkup(createElement(StepPricing, { data: wizardData, draft: { pricing: base }, chosen: [], patch: () => undefined, handlers: {} } as any));
    assert.match(wizard, /aria-label="Plans side by side"/, 'The wizard\'s Pricing step shows the table');
    assert.match(wizard, /Forecast/, 'with its forecast row');
    // #107: the discounts are the Deals control, under the plans
    assert.match(wizard, /aria-label="Plans side by side"[\s\S]*aria-label="DEALS"/, 'The discounts stay under the plans');
    assert.doesNotMatch(wizard, /pr-plan-tab|Compare subscription plans/, 'The old plan tabs are gone');
    const offerData = {
        live: true, pricing: base, planStats: { BASE: { accounts: 900, monthlyRevenue: 7191 }, MID: { accounts: 100, monthlyRevenue: 1299 } },
        earnings: { subscription: 8490, ads: 0, store: 0, settled: true },
        storefront: { currentId: null, layouts: [] }, ident: { label: 'Pulse', detail: 'Sting' }, planBuilder: mid,
    } as PlatformOfferData;
    const offerTab = renderToStaticMarkup(createElement(PlatformOffer, { accent: '#2F7BFF', offer: offerData, actions: { applyPricing: () => ({ ok: true, message: '' }) } }));
    assert.match(offerTab, /aria-label="Plans side by side"[\s\S]*On it[\s\S]*900[\s\S]*90%[\s\S]*100[\s\S]*10%/, 'The Offer tab: the table with who is on each plan');
    assert.doesNotMatch(offerTab, /\. Change"/, 'Read-only until Change pricing');
    console.log('PASS render: read-only and editable tables, the wizard\'s Pricing step, the Offer tab');

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
