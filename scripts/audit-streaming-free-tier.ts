/** Free with ads' own quality, Phase 2 #46 (codex-handoff/plans/platform-tech-plan.md §6.5:
 *  "the player sets its picture and sound quality, screens and ad load. Better quality brings more
 *  viewers and watch time (more ad money) but costs more to stream"). Checks:
 *  - the factors: a 720p stereo free tier (appeal 0) is ×1, worse draws fewer, better more, capped;
 *  - the save keeps a free tier's offer (normalised, through the canonical normaliser) and refuses
 *    a locked row of it with what it needs;
 *  - the builder's free column: where it starts, its edits (quality, ad breaks), its locks, receipt;
 *  - unset is exactly as before: the same world offer fingerprint, the same free households, the
 *    same viewer load;
 *  - on the test company's real cohorts, a better free tier draws more free households (and keeps
 *    more of them from paying); one week of the full game: more free viewers and hours, more load
 *    and a bigger bandwidth bill at 4K HDR than at 480p. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingCanonicalFoundation } from '../services/streamingCanonicalState';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { streamingAverageViewerLoad } from '../services/streamingDeliveryLoad';
import {
    STREAMING_FREE_TIER_ID, streamingFreeTierChoiceFactor, streamingFreeTierEngagementFactor, streamingPlanOfferAppeal,
} from '../services/streamingPlanOffer';
import { resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import {
    applyStreamingFreeTierChoice, describeStreamingPlanChanges, getStreamingPlanBuilderView, streamingFreeTierOffer,
    streamingFreeTierOptionLock, streamingFreeTierValue,
} from '../services/streamingPlanBuilder';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlanBuilder } from '../components/streaming-transplant/PlanBuilder';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Free Tier Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const ops = (player: Player) => player.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!;
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_720P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});
const round = (value: number, places = 3) => Math.round(value * 10 ** places) / 10 ** places;

async function main() {
    const started = performance.now();

    /* ── the factors ── */
    assert.deepEqual([undefined, 0, -3, 5, 12, 40].map(appeal => round(streamingFreeTierChoiceFactor(appeal))), [1, 1, .925, 1.125, 1.3, 1.6],
        'Choice: unset and 720p stereo ×1; 480p ×0.925, 1080p ×1.125, 4K HDR ×1.3, capped at ×1.6');
    assert.deepEqual([undefined, 0, -3, 5, 12, 40].map(appeal => round(streamingFreeTierEngagementFactor(appeal))), [1, 1, .97, 1.05, 1.12, 1.25],
        'Watching: unset and 720p stereo ×1; 480p ×0.97, 1080p ×1.05, 4K HDR ×1.12, capped at ×1.25');
    console.log('PASS factors: a 720p stereo free tier is ×1; 480p ×0.925 choice / ×0.97 watching; 4K HDR ×1.3 / ×1.12; capped');

    /* ── the save ── */
    const qa = await buildStreamingFullPlatformQa(fresh('free-tier-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = weekOf(qa);
    const qaPricing = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id).serviceConfiguration.pricing;
    assert.ok(qaPricing.commercialOffers?.freeAdAccess && !qaPricing.freeAdOffer, 'The test company runs Free with ads, its quality not set');
    const withFree = (player: Player, free: OwnedStreamingPlanOffer | undefined): Player => {
        const { freeAdOffer: _unset, ...rest } = player.ownedStreamingPlatform.serviceConfiguration.pricing;
        const pricing = normalizeStreamingPricingConfiguration({ ...rest, ...(free ? { freeAdOffer: free } : {}) } as OwnedStreamingPricingConfiguration);
        return { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform,
            serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration, pricing } } } as Player;
    };
    const tenEighty = offer({ picture: 'PICTURE_1080P' });
    const set = normalizeStreamingPricingConfiguration({ ...qaPricing, freeAdOffer: tenEighty });
    assert.deepEqual(set.freeAdOffer, tenEighty, 'A free tier\'s offer is kept');
    assert.equal(JSON.stringify(normalizeStreamingPricingConfiguration(set)), JSON.stringify(set), 'Normalising is idempotent');
    assert.equal(normalizeStreamingPricingConfiguration({ ...qaPricing, freeAdOffer: { ...tenEighty, picture: 'PICTURE_99K' } } as unknown as OwnedStreamingPricingConfiguration).freeAdOffer,
        undefined, 'A broken offer is dropped');
    const canonical = normalizeStreamingCanonicalFoundation({ serviceConfiguration: { source: 'PLAYER_ACTION', pricing: set } });
    assert.deepEqual(canonical.serviceConfiguration.pricing.freeAdOffer, tenEighty, 'The canonical normaliser keeps it');
    const saved = saveStreamingPricingPlan(qa, set, 'OPERATIONS');
    assert.deepEqual([saved.changed, saved.reason], [true, 'SAVED'], 'An owned free tier saves');
    assert.deepEqual(saved.player.ownedStreamingPlatform.serviceConfiguration.pricing.freeAdOffer, tenEighty);
    const refused = saveStreamingPricingPlan(qa, { ...set, freeAdOffer: offer({ picture: 'PICTURE_24K' }) }, 'OPERATIONS');
    assert.deepEqual([refused.changed, refused.reason, refused.locked?.map(lock => [lock.planId, lock.planName, lock.row, lock.needs])],
        [false, 'LOCKED_OPTION', [[STREAMING_FREE_TIER_ID, 'Free with ads', 'picture', 'Unlock 24K in Tech']]], 'A locked free tier is refused with what it needs');
    console.log('PASS save: the free tier\'s offer is kept (normalised, canonical) and a locked row of it is refused');

    /* ── the builder's free column ── */
    const view = getStreamingPlanBuilderView(qa.ownedStreamingPlatform);
    const start = streamingFreeTierOffer(qaPricing, view.tree);
    assert.deepEqual([start.set, start.offer.picture, start.offer.downloads], [false, 'PICTURE_720P', false], 'Unset, the column starts at the cheapest plan (Basic, 720p), without downloads');
    const newService = getStreamingPlanBuilderView(null);
    assert.equal(streamingFreeTierOffer({ ...qaPricing, plans: [] }, newService.tree).offer.picture, 'PICTURE_480P', 'A new service with no plans starts at 480p');
    assert.deepEqual(['ads', 'picture', 'downloads', 'early'].map(row => streamingFreeTierValue(qaPricing, row as 'ads', view.tree)), ['custom', 'PICTURE_720P', null, null],
        'Its rows: the ad breaks (4 ad minutes an hour, off the presets), its quality; no downloads or extras');
    const picked = applyStreamingFreeTierChoice(qaPricing, 'picture', 'PICTURE_1080P', view);
    assert.deepEqual(picked.freeAdOffer, { ...start.offer, picture: 'PICTURE_1080P' }, 'A quality pick sets the free tier\'s own offer from where it stood');
    assert.equal(applyStreamingFreeTierChoice(picked, 'ads', '10', view).ads.minutesPerHour, 3, 'The ad row sets a break every 10 minutes (3 ad minutes an hour)');
    assert.equal(applyStreamingFreeTierChoice(picked, 'ads', '7', view), picked, 'Only the presets');
    assert.equal(streamingFreeTierOptionLock(picked, 'picture', 'PICTURE_24K', view)?.needs, 'Unlock 24K in Tech');
    assert.equal(applyStreamingFreeTierChoice(picked, 'picture', 'PICTURE_24K', view), picked, 'A locked choice changes nothing');
    const lowered = applyStreamingFreeTierChoice(applyStreamingFreeTierChoice(picked, 'hdr', 'HDR_HDR', view), 'picture', 'PICTURE_720P', view);
    assert.deepEqual([lowered.freeAdOffer?.picture, lowered.freeAdOffer?.hdr], ['PICTURE_720P', null], 'Below 1080p takes HDR off with it');
    assert.deepEqual(describeStreamingPlanChanges(qaPricing, picked, view), ['Free with ads gets its own quality', 'Free with ads: Picture 720p → 1080p'],
        'The receipt names it');
    const mixed = renderToStaticMarkup(createElement(PlanBuilder, { pricing: qaPricing, builder: view, onChange: () => undefined }));
    assert.match(mixed, /Free with ads[\s\S]*Quality not set[\s\S]*Basic[\s\S]*Standard/, 'The free column comes first, marked until its quality is set');
    assert.match(mixed, /aria-label="Free with ads Picture: 720p\. Change"/, 'Its quality cells are taps');
    assert.match(mixed, /aria-label="Free with ads Downloads: not part of it"/, 'Rows it does not have read "—"');
    const adOnly = configureStreamingPricingOffer(picked, { kind: 'CORE', coreModel: 'ADVERTISING', alone: true });
    assert.deepEqual([adOnly.streams, adOnly.freeAdOffer?.picture], [['ads'], 'PICTURE_1080P'], 'An ad-only service keeps the free tier\'s quality');
    const alone = renderToStaticMarkup(createElement(PlanBuilder, { pricing: adOnly, builder: view, onChange: () => undefined }));
    assert.doesNotMatch(alone, /\+ Add plan|of 12 plans|Early premieres|Basic/, 'Alone: no plans, no add, only its own rows');
    assert.match(alone, /Free with ads[\s\S]*Picture[\s\S]*1080p/);
    console.log('PASS builder: the free column starts at the cheapest plan, sets its own quality, its ad breaks, locks and receipt; first in the table, alone on an ad-only service');

    /* ── unset is exactly as before; a better free tier draws more ── */
    const playerOffer = (player: Player) => getWorldStreamingOffers(player, week).offers.find(row => row.isPlayer)!;
    const unsetOffer = playerOffer(qa);
    assert.equal(unsetOffer.freeAdQualityIndex, undefined, 'Unset: no quality on the world offer');
    const qaTree = resolveStreamingTechTree(qa.ownedStreamingPlatform);
    assert.deepEqual([playerOffer(withFree(qa, offer({}))).freeAdQualityIndex, playerOffer(withFree(qa, tenEighty)).freeAdQualityIndex],
        [0, streamingPlanOfferAppeal(tenEighty, qaTree)], 'Set: the offer\'s appeal (720p stereo 0)');
    /** The player's free households and paid subscriptions across eight big markets' real cohorts. */
    const homes = (player: Player) => {
        const offers = getWorldStreamingOffers(player, week).offers;
        let free = 0;
        let paid = 0;
        for (const countryId of ['US', 'GB', 'IN', 'DE', 'BR', 'JP', 'FR', 'MX']) {
            const audience = player.world.worldAudienceEconomy?.countries[countryId];
            const participation = player.world.worldAudienceParticipation?.countries[countryId];
            if (!audience || !participation) continue;
            audience.cohorts.forEach(cohort => {
                const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
                if (!overlay) return;
                const choice = allocateStreamingAudienceChoice(countryId, cohort, overlay, offers);
                [...choice.allocations, ...choice.freeAdOpportunities].filter(row => row.platformId === 'PLAYER').forEach(row => {
                    if (row.kind === 'FREE_AD') free += row.households;
                    if (row.kind === 'SUBSCRIPTION') paid += row.primaryHouseholds;
                });
            });
        }
        return { free, paid };
    };
    const unset = homes(qa);
    const asBasic = homes(withFree(qa, offer({})));
    assert.deepEqual(asBasic, unset, `A 720p stereo free tier is exactly the unset one: ${JSON.stringify(unset)}`);
    const sd = homes(withFree(qa, offer({ picture: 'PICTURE_480P' })));
    const hd = homes(withFree(qa, tenEighty));
    const uhd = homes(withFree(qa, offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', colour: 'COLOUR_10BIT' })));
    assert.ok(sd.free < unset.free && unset.free < hd.free && hd.free < uhd.free,
        `Free households rise with quality: 480p ${sd.free}, 720p ${unset.free}, 1080p ${hd.free}, 4K HDR ${uhd.free}`);
    assert.ok(uhd.paid <= sd.paid, `A better free tier keeps more households from paying: paid at 480p ${sd.paid}, at 4K HDR ${uhd.paid}`);
    console.log(`PASS choice: unset = 720p stereo (${unset.free.toLocaleString()} free homes); 480p ${sd.free.toLocaleString()} → 1080p ${hd.free.toLocaleString()} → 4K HDR ${uhd.free.toLocaleString()}; paid ${sd.paid.toLocaleString()} → ${uhd.paid.toLocaleString()}`);

    /* ── load: unset counts free viewers at the plans' mix, set at the free tier's own load ── */
    const loadPlatform = (free?: OwnedStreamingPlanOffer) => withFree(qa, free).ownedStreamingPlatform;
    const allocations = ops(qa).worldCustomerPlanAllocations || [];
    const viewers = { free: 1_000_000, others: 1_000_000 };
    const mix = streamingAverageViewerLoad(loadPlatform(), allocations);
    assert.equal(streamingAverageViewerLoad(loadPlatform(), allocations, viewers), mix, 'Unset: free viewers count at the plans\' mix, as before');
    const loadAt = (free: OwnedStreamingPlanOffer) => streamingAverageViewerLoad(loadPlatform(free), allocations, viewers);
    assert.ok(Math.abs(loadAt(offer({ picture: 'PICTURE_480P' })) - (mix + .4) / 2) < 1e-9, 'Set: half the viewers at 480p\'s 0.4');
    assert.ok(loadAt(offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR' })) > mix, '4K HDR free viewers raise the average');
    console.log(`PASS load: unset ${mix.toFixed(3)} (the plans' mix); half free at 480p ${loadAt(offer({ picture: 'PICTURE_480P' })).toFixed(3)}, at 4K HDR ${loadAt(offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR' })).toFixed(3)}`);

    /* ── one week of the full game: 480p against 4K HDR ── */
    const weekAt = async (free: OwnedStreamingPlanOffer) => {
        const next = (await processGameWeek(withFree(qa, free))).player;
        const viewing = next.world.worldStreamingViewing!.platforms!.PLAYER!;
        const last = ops(next);
        return { freeViewers: viewing.accessMix.freeViewingAccounts || 0, hours: viewing.totalHoursViewed, ads: viewing.revenue.advertisingRevenue,
            load: last.viewerLoad!, peak: last.peakLoadUnits!, bill: last.streamingDeliveryCost! };
    };
    const low = await weekAt(offer({ picture: 'PICTURE_480P' }));
    const high = await weekAt(offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', colour: 'COLOUR_10BIT' }));
    assert.ok(high.freeViewers > low.freeViewers, `More free viewers: ${low.freeViewers} → ${high.freeViewers}`);
    assert.ok(high.hours > low.hours, `More hours: ${low.hours} → ${high.hours}`);
    assert.ok(high.load > low.load && high.peak > low.peak, `More load: ${low.load} → ${high.load}, peak ${low.peak} → ${high.peak}`);
    assert.ok(high.bill > low.bill, `A bigger bandwidth bill: ${low.bill} → ${high.bill}`);
    console.log(`PASS week: 480p → 4K HDR free tier: free viewers ${low.freeViewers.toLocaleString()} → ${high.freeViewers.toLocaleString()}, hours ${low.hours.toLocaleString()} → ${high.hours.toLocaleString()}, ad revenue $${Math.round(low.ads).toLocaleString()} → $${Math.round(high.ads).toLocaleString()}, viewer load ${low.load} → ${high.load}, bill $${low.bill.toLocaleString()} → $${high.bill.toLocaleString()}`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
