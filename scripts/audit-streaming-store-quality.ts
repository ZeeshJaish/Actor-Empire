/** Rent or buy's own quality and editions, Phase 2 #47 (codex-handoff/plans/platform-tech-plan.md
 *  §6.5: "Rent or buy: set prices per quality (e.g. rent HD $3.99, rent 4K $5.99, buy 4K $19.99)
 *  and the rental length. Rent or buy uses the same tech as plans."). Checks:
 *  - the factors: a 1080p stereo store (5 points, what rentals sold before) is ×1; the top
 *    edition's share falls as it costs more; the editions' average prices;
 *  - the save keeps the store's quality and its top edition (normalised, canonical) and refuses a
 *    locked row;
 *  - the builder's store column: where it starts, its edits, its prices and rental length, locks,
 *    receipt; last in the table, alone on a store-only service;
 *  - the load: store viewers stream the HD and top editions in their shares once set;
 *  - one week of the full game: a 1080p stereo store sells exactly what the unset store sold;
 *    a 4K HDR store with a pricier 4K edition sells more, earns more a sale and loads more. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingCanonicalFoundation } from '../services/streamingCanonicalState';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { streamingAverageViewerLoad } from '../services/streamingDeliveryLoad';
import {
    STREAMING_STORE_ID, resolveStreamingStoreEditions, streamingStoreQualityFactor, streamingStoreTopEditionShare,
} from '../services/streamingStoreEditions';
import {
    applyStreamingStoreChoice, describeStreamingPlanChanges, getStreamingPlanBuilderView, setStreamingStoreTerms,
    setStreamingStoreTopEdition, streamingStoreOffer, streamingStoreOptionLock, streamingStoreValue,
} from '../services/streamingPlanBuilder';
import { resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import { PlanBuilder } from '../components/streaming-transplant/PlanBuilder';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Store Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const ops = (player: Player) => player.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_1080P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});
const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;
const near = (actual: number, expected: number, tolerance: number, label: string) => (
    assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} vs ${expected}`)
);

async function main() {
    const started = performance.now();

    /* ── the factors and the editions ── */
    assert.deepEqual([undefined, 5, -3, 0, 12, 16, 40].map(appeal => round(streamingStoreQualityFactor(appeal))), [1, 1, .85, .9, 1.14, 1.22, 1.35],
        'A 1080p stereo store ×1; 480p ×0.85 (floor), 720p ×0.9, 4K HDR ×1.14, 8K HDR ×1.22, capped at ×1.35');
    assert.deepEqual([[3.99, 3.99], [3.99, 4.99], [3.99, 5.99], [3.99, 9.99]].map(([hd, top]) => round(streamingStoreTopEditionShare(hd, top), 2)),
        [.6, .4, .2, .05], 'The top edition: 60% at the HD price, 40% at +25%, 20% at +50%, at least 5%');
    const tree = resolveStreamingTechTree({ technologyLevels: { PLAYBACK_QUALITY: 60 } });
    const prices = (rows: Partial<OwnedStreamingPricingConfiguration>) => ({
        rentals: { rent: 3.99, buy: 14.99, windowWeeks: 4 }, ...rows,
    }) as Pick<OwnedStreamingPricingConfiguration, 'rentals' | 'storeQuality' | 'storeTopEdition'>;
    const unset = resolveStreamingStoreEditions(prices({}), tree);
    assert.deepEqual([unset.set, unset.rentPrice, unset.buyPrice, unset.qualityFactor, unset.hdOffer], [false, 3.99, 14.99, 1, null], 'Unset: the HD prices, ×1');
    const hdOnly = resolveStreamingStoreEditions(prices({ storeQuality: offer({}) }), tree);
    assert.deepEqual([hdOnly.topPicture, hdOnly.topRentShare, hdOnly.rentPrice, hdOnly.qualityFactor], [null, 0, 3.99, 1], 'A 1080p store has one edition');
    const samePrice = resolveStreamingStoreEditions(prices({ storeQuality: offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR' }) }), tree);
    assert.deepEqual([samePrice.topPicture, samePrice.topRentShare, samePrice.rentPrice, samePrice.buyPrice], ['PICTURE_4K', .6, 3.99, 14.99],
        'A 4K store without its own 4K prices sells 4K at the HD prices (60% take it)');
    const ownPrice = resolveStreamingStoreEditions(prices({ storeQuality: offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR' }), storeTopEdition: { rent: 5.99, buy: 19.99 } }), tree);
    assert.deepEqual([round(ownPrice.topRentShare, 2), ownPrice.rentPrice, round(ownPrice.topBuyShare, 2), ownPrice.buyPrice], [.2, 4.39, .33, 16.66],
        'Rent HD $3.99 / 4K $5.99: 20% take 4K, $4.39 a rental; buy $14.99 / $19.99: 33%, $16.66 a purchase');
    assert.equal(round(ownPrice.qualityFactor, 2), 1.14, '4K HDR converts ×1.14');
    console.log('PASS factors: 1080p stereo ×1, 4K HDR ×1.14; 4K edition 60% at the HD price, 20% at +50%; rent HD $3.99 / 4K $5.99 earns $4.39 a rental');

    /* ── the save ── */
    const qa = await buildStreamingFullPlatformQa(fresh('store-quality-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const qaPricing = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id).serviceConfiguration.pricing;
    assert.ok(qaPricing.streams.includes('rentals') && !qaPricing.storeQuality && !qaPricing.storeTopEdition, 'The test company runs Rent or buy, its quality not set');
    const fourK = offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', colour: 'COLOUR_10BIT' });
    const set = normalizeStreamingPricingConfiguration({ ...qaPricing, storeQuality: fourK, storeTopEdition: { rent: 5.99, buy: 19.99 } });
    assert.deepEqual([set.storeQuality, set.storeTopEdition], [fourK, { rent: 5.99, buy: 19.99 }], 'The store\'s quality and its 4K prices are kept');
    assert.equal(JSON.stringify(normalizeStreamingPricingConfiguration(set)), JSON.stringify(set), 'Normalising is idempotent');
    assert.equal(normalizeStreamingPricingConfiguration({ ...set, storeTopEdition: { rent: 0, buy: 19.99 } }).storeTopEdition, undefined, 'A top edition needs both prices');
    const canonical = normalizeStreamingCanonicalFoundation({ serviceConfiguration: { source: 'PLAYER_ACTION', pricing: set } });
    assert.deepEqual([canonical.serviceConfiguration.pricing.storeQuality, canonical.serviceConfiguration.pricing.storeTopEdition], [fourK, { rent: 5.99, buy: 19.99 }],
        'The canonical normaliser keeps both');
    const saved = saveStreamingPricingPlan(qa, set, 'OPERATIONS');
    assert.deepEqual([saved.changed, saved.reason], [true, 'SAVED'], 'An owned store quality saves');
    const refused = saveStreamingPricingPlan(qa, { ...set, storeQuality: offer({ picture: 'PICTURE_24K' }) }, 'OPERATIONS');
    assert.deepEqual([refused.reason, refused.locked?.map(lock => [lock.planId, lock.planName, lock.needs])],
        ['LOCKED_OPTION', [[STREAMING_STORE_ID, 'Rent or buy', 'Unlock 24K in Tech']]], 'A locked store row is refused with what it needs');
    console.log('PASS save: the store\'s quality and 4K prices are kept (normalised, canonical); a locked row is refused');

    /* ── the builder's store column ── */
    const view = getStreamingPlanBuilderView(qa.ownedStreamingPlatform);
    const start = streamingStoreOffer(qaPricing, view.tree);
    assert.deepEqual([start.set, start.offer.picture, start.offer.sound], [false, 'PICTURE_1080P', 'SOUND_STEREO'], 'Unset, the column starts at 1080p stereo');
    assert.deepEqual(['picture', 'screens', 'ads', 'early'].map(row => streamingStoreValue(qaPricing, row as 'picture', view.tree)), ['PICTURE_1080P', null, null, null],
        'Its rows: its quality; no screens, ads or extras');
    const picked = applyStreamingStoreChoice(qaPricing, 'picture', 'PICTURE_4K', view);
    assert.deepEqual(picked.storeQuality?.picture, 'PICTURE_4K', 'A pick sets the store\'s own quality');
    assert.equal(streamingStoreOptionLock(picked, 'picture', 'PICTURE_24K', view)?.needs, 'Unlock 24K in Tech');
    assert.equal(applyStreamingStoreChoice(picked, 'picture', 'PICTURE_24K', view), picked, 'A locked choice changes nothing');
    const terms = setStreamingStoreTerms(picked, { rent: 4.49, windowWeeks: 30 });
    assert.deepEqual([terms.rentals.rent, terms.rentals.windowWeeks], [4.49, 16], 'HD prices, and a rental of at most 16 weeks');
    const topped = setStreamingStoreTopEdition(terms, { rent: 2, buy: 24.99 });
    assert.deepEqual(topped.storeTopEdition, { rent: 4.49, buy: 24.99 }, 'A 4K price is never below the HD one');
    assert.equal(setStreamingStoreTopEdition(topped, null).storeTopEdition, undefined, 'Back to the HD prices');
    assert.deepEqual(describeStreamingPlanChanges(qaPricing, picked, view).filter(line => line.startsWith('Rent or buy')),
        ['Rent or buy gets its own quality', 'Rent or buy: Picture 1080p → 4K'], 'The receipt names it');
    const mixed = renderToStaticMarkup(createElement(PlanBuilder, { pricing: picked, builder: view, onChange: () => undefined }));
    assert.match(mixed, /Free with ads[\s\S]*Basic[\s\S]*Premium[\s\S]*Rent or buy[\s\S]*\+ Add plan/, 'The store column comes last, before "+ Add plan"');
    // #105: the store's prices sit in its column's head, its rental big and the purchase under it
    assert.match(mixed, /aria-label="Rent or buy prices: rent \$3\.99, buy \$14\.99\. Change"><b>\$3\.99<\/b><small>rent · buy \$14\.99<\/small>/, 'Its price opens its prices');
    const storeOnly = configureStreamingPricingOffer(picked, { kind: 'CORE', coreModel: 'STORE', alone: true });
    const alone = renderToStaticMarkup(createElement(PlanBuilder, { pricing: storeOnly, builder: view, onChange: () => undefined }));
    assert.doesNotMatch(alone, /\+ Add plan|Basic|Screens|Early premieres/, 'Alone: no plans, only its rows');
    assert.match(alone, /Rent or buy[\s\S]*Picture[\s\S]*4K/);
    console.log('PASS builder: the store column starts at 1080p stereo, sets its own quality, prices, rental length, locks and receipt; last in the table, alone on a store-only service');

    /* ── load ── */
    const withStore = (player: Player, quality: OwnedStreamingPlanOffer | undefined, top?: { rent: number; buy: number }): Player => {
        const { storeQuality: _q, storeTopEdition: _t, ...rest } = player.ownedStreamingPlatform.serviceConfiguration.pricing;
        const pricing = normalizeStreamingPricingConfiguration({ ...rest, ...(quality ? { storeQuality: quality } : {}), ...(top ? { storeTopEdition: top } : {}) } as OwnedStreamingPricingConfiguration);
        return { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
            serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration, pricing } } } as Player;
    };
    const allocations = ops(qa).worldCustomerPlanAllocations || [];
    const viewers = { free: 0, store: 1_000_000, others: 1_000_000 };
    const mix = streamingAverageViewerLoad(withStore(qa, undefined).ownedStreamingPlatform, allocations);
    assert.equal(streamingAverageViewerLoad(withStore(qa, undefined).ownedStreamingPlatform, allocations, viewers), mix, 'Unset: store viewers count at the plans\' mix');
    near(streamingAverageViewerLoad(withStore(qa, offer({ picture: 'PICTURE_4K' })).ownedStreamingPlatform, allocations, viewers), (mix + (.4 * 1 + .6 * 2.4)) / 2, 1e-9,
        'A 4K store at the HD prices: 40% stream the HD edition (1), 60% 4K (2.4)');
    console.log(`PASS load: unset ${mix.toFixed(3)}; half store viewers at a 4K store ${((mix + 1.84) / 2).toFixed(3)}`);

    /* ── one week of the full game ── */
    const weekAt = async (quality: OwnedStreamingPlanOffer | undefined, top?: { rent: number; buy: number }) => {
        const next = (await processGameWeek(withStore(qa, quality, top))).player;
        const revenue = next.world.worldStreamingViewing!.platforms!.PLAYER!.revenue;
        const last = ops(next);
        return { rentals: revenue.rentalTransactions, purchases: revenue.purchaseTransactions,
            rentalRevenue: revenue.rentalRevenue, purchaseRevenue: revenue.purchaseRevenue, load: last.viewerLoad! };
    };
    const before = await weekAt(undefined);
    const asBefore = await weekAt(offer({}));
    assert.deepEqual([asBefore.rentals, asBefore.purchases, asBefore.rentalRevenue, asBefore.purchaseRevenue],
        [before.rentals, before.purchases, before.rentalRevenue, before.purchaseRevenue], `A 1080p stereo store sells what the unset one did: ${JSON.stringify(before)}`);
    const better = await weekAt(fourK, { rent: 5.99, buy: 19.99 });
    assert.ok(better.rentals > before.rentals && better.purchases >= before.purchases, `More sales: rentals ${before.rentals} → ${better.rentals}, purchases ${before.purchases} → ${better.purchases}`);
    assert.ok(better.rentalRevenue / Math.max(1, better.rentals) > before.rentalRevenue / Math.max(1, before.rentals), 'More a rental (the 4K edition)');
    assert.ok(better.load > asBefore.load, `More load: ${asBefore.load} → ${better.load}`);
    console.log(`PASS week: unset = 1080p stereo (${before.rentals.toLocaleString()} rentals, $${before.rentalRevenue.toLocaleString()}); 4K HDR with a $5.99 / $19.99 4K edition: ${better.rentals.toLocaleString()} rentals, $${better.rentalRevenue.toLocaleString()} rentals + $${better.purchaseRevenue.toLocaleString()} purchases, viewer load ${asBefore.load} → ${better.load}`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
