/** Plans v2, Phase 2 #43–#44 (codex-handoff/plans/platform-tech-plan.md §6.2–§6.4, §6.7). Checks:
 *  - a plan saved before Phase 2 reads as the offer its features stand for (Phase 1's reading),
 *    and its features round-trip unchanged, so old saves stream and sell what they did;
 *  - an offer's rows are real steps; its features (hd, uhd, spatial, screens, downloads) follow it;
 *  - up to 12 plans; ad levels only on ad plans; normalising is idempotent and the save keeps both;
 *  - a locked row is refused with what it needs and nothing is saved; a Phase 1 plan's locked
 *    feature is dropped and reported; an unlocked offer saves;
 *  - the Build wizard's three price tiers follow the paid plans and always pass its checks;
 *  - load and the viewer's quality follow the offer (an 8K plan streams 8K);
 *  - #44 appeal: a plan's tech rows are worth what Phase 1 gave them (1080p 5, 4K HDR 12, Spatial
 *    5) and the steps past them add; ad levels cost light 5 / standard 9 / heavy 15 of appeal;
 *    prestige viewers weigh 4K HDR and beyond against the best rival picture; on real cohorts the
 *    test company's plans keep their appeal, a better picture or lighter ads win more households,
 *    and the new starter plans both win households where the old three left two empty. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPlanOffer, type OwnedStreamingPricingConfiguration, type OwnedStreamingPricingPlan, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingEconomy';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import {
    STREAMING_MAX_PLANS, applyStreamingPlanOfferFeatures, deriveStreamingPlanOffer, normalizeStreamingPlanOffer,
    resolveStreamingPlanAdLevel, resolveStreamingPlanOffer, streamingPlanOfferFeatureIds, streamingPlanOfferLocks,
} from '../services/streamingPlanOffer';
import { convertStreamingTechTreeFromLevels, normalizeStreamingTechTreeState, resolveStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import { unlockStreamingTech } from '../services/streamingTechTree';
import { streamingAverageViewerLoad, streamingOfferLoad, streamingPlanLoad } from '../services/streamingDeliveryLoad';
import { getStreamingViewerQuality } from '../services/streamingViewerQuality';
import { STREAMING_AD_LEVEL_EFFECTS, streamingPlanOfferAppeal, streamingPrestigePictureBonus } from '../services/streamingPlanOffer';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateWorldStreamingCohort } from '../services/worldEconomy/worldStreamingCompetition';
import { createInitialOwnedStreamingPlatformState } from '../types';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Plans Audit', age: 15, currentWeek: 1 });
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
        ...createDefaultStreamingFoundingDraft(weekOf(player)), currentStep: 2, name: 'PLANLINE', primaryColor: '#2F7BFF', secondaryColor: '#0B1220',
    }));
    assert.ok(founded.changed, `The company is registered: ${founded.reason}`);
    const funded = contributeStreamingFounderCapital({ ...founded.player, money: founded.player.money + 500_000_000 }, 500_000_000, 'plans-v2:capital');
    assert.ok(funded.changed, `Founder capital: ${funded.reason}`);
    return funded.player;
};
const sorted = (ids: string[]) => [...ids].sort();
const offer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
    picture: 'PICTURE_480P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
});
const pricingWith = (player: Player, plans: OwnedStreamingPricingPlan[]): OwnedStreamingPricingConfiguration => ({
    ...configureStreamingPricingOffer(normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).serviceConfiguration.pricing,
        { kind: 'CORE', coreModel: 'SUBSCRIPTION' }),
    plans,
});

async function main() {
    const started = performance.now();

    /* ── Phase 1 plans read as the offer their features stand for ── */
    const tree58 = convertStreamingTechTreeFromLevels({ PLAYBACK_QUALITY: 58, DELIVERY_CAPACITY: 45, RELIABILITY: 42 });
    const testPlans = [
        ['noads', 'catalogue'],
        ['noads', 'catalogue', 'hd', 'streams2', 'downloads'],
        ['noads', 'catalogue', 'uhd', 'spatial', 'streams4', 'downloads', 'early'],
    ];
    const derived = testPlans.map(featureIds => deriveStreamingPlanOffer(featureIds, tree58));
    assert.deepEqual(derived.map(row => [row.picture, row.hdr, row.colour, row.sound, row.dialogue, row.screens, row.downloads]), [
        ['PICTURE_720P', null, 'COLOUR_8BIT', 'SOUND_STEREO', false, 1, false],
        ['PICTURE_1080P', null, 'COLOUR_8BIT', 'SOUND_STEREO', false, 2, true],
        ['PICTURE_4K', 'HDR_HDR', 'COLOUR_10BIT', 'SOUND_SPATIAL', false, 4, true],
    ], 'The test company\'s plans: 720p, 1080p, 4K HDR with Spatial, as Phase 1 read them (Phase 1 sold no surround or dialogue)');
    testPlans.forEach((featureIds, index) => assert.deepEqual(sorted(applyStreamingPlanOfferFeatures(featureIds, derived[index])), sorted(featureIds),
        `Plan ${index + 1}: its features round-trip through its offer unchanged`));
    assert.deepEqual([deriveStreamingPlanOffer([], convertStreamingTechTreeFromLevels(0)).picture, deriveStreamingPlanOffer(['uhd'], convertStreamingTechTreeFromLevels(0)).hdr],
        ['PICTURE_480P', 'HDR_HDR'], 'Without features a new service streams 480p; a 4K HDR plan reads as what it sells (the save checks it may)');
    assert.deepEqual(testPlans.map(featureIds => Math.round(streamingPlanLoad(featureIds, tree58) * 1000) / 1000), [.64, 1, 2.64],
        'Their load is #42\'s: 720p 0.64, 1080p 1, 4K HDR 2.64');
    console.log('PASS Phase 1 plans: 720p / 1080p / 4K HDR read from features, features round-trip, loads 0.64 / 1 / 2.64');

    /* ── offers: rows, features, normalising ── */
    const eightK = offer({ picture: 'PICTURE_8K', hdr: 'HDR_PRO', colour: 'COLOUR_12BIT', sound: 'SOUND_LOSSLESS', screens: 4, downloads: true });
    assert.deepEqual(streamingPlanOfferFeatureIds(eightK), ['uhd', 'spatial', 'streams4', 'downloads'], '8K HDR Pro reads as uhd for the engines that read features');
    assert.deepEqual(streamingPlanOfferFeatureIds(offer({ picture: 'PICTURE_4K' })), ['hd'], '4K without HDR is HD to the feature engines');
    assert.deepEqual(applyStreamingPlanOfferFeatures(['noads', 'catalogue', 'uhd', 'early', 'live'], offer({ picture: 'PICTURE_1080P', screens: 2 })),
        ['noads', 'catalogue', 'early', 'live', 'hd', 'streams2'], 'Only the offer\'s features are replaced');
    assert.equal(normalizeStreamingPlanOffer({ ...eightK, picture: 'PICTURE_99K' }), undefined, 'An unknown picture drops the offer');
    assert.equal(normalizeStreamingPlanOffer({ ...eightK, sound: 'SOUND_CLEAR_DIALOGUE' }), undefined, 'Clear dialogue is its own row, not a sound');
    assert.deepEqual(normalizeStreamingPlanOffer({ ...eightK, screens: 3, hdr: 'NOPE', dialogue: 'yes' }), { ...eightK, screens: 2, hdr: null, dialogue: false });
    assert.deepEqual(normalizeStreamingPlanOffer(eightK), eightK, 'A clean offer normalises to itself');
    assert.deepEqual([
        resolveStreamingPlanAdLevel({ ads: false, adLevel: 'HEAVY' }), resolveStreamingPlanAdLevel({ ads: true }),
        resolveStreamingPlanAdLevel({ ads: true, adLevel: 'LIGHT' }), resolveStreamingPlanAdLevel({ ads: true, adLevel: 'NONE' }),
    ], ['NONE', 'STANDARD', 'LIGHT', 'STANDARD'], 'Ad level: none without ads, standard by default');
    const base: OwnedStreamingPricingConfiguration = normalizeStreamingPricingConfiguration({
        ...normalizeOwnedStreamingPlatformState(fresh('plans-v2-base').ownedStreamingPlatform, 'plans-v2-base').serviceConfiguration.pricing,
        streams: ['subs', 'ads'],
    });
    const thirteen = normalizeStreamingPricingConfiguration({ ...base, plans: Array.from({ length: 13 }, (_, index): OwnedStreamingPricingPlan => ({
        id: `P${index}`, name: `Plan ${index}`, monthly: 5 + index, featureIds: ['catalogue'], ads: index % 3 === 0,
        adLevel: index % 3 === 0 ? 'HEAVY' : 'LIGHT', ...(index === 4 ? { offer: offer({ picture: 'PICTURE_1080P', screens: 2 }) } : {}),
    })) });
    assert.equal(thirteen.plans.length, STREAMING_MAX_PLANS, 'Twelve plans at most');
    assert.deepEqual(thirteen.plans.slice(0, 3).map(plan => [plan.ads, plan.adLevel]), [[true, 'HEAVY'], [false, undefined], [false, undefined]], 'An ad level stays only on an ad plan');
    assert.deepEqual(thirteen.plans[4].featureIds, ['catalogue', 'hd', 'streams2', 'noads'], 'A plan\'s features follow its offer');
    assert.equal(JSON.stringify(normalizeStreamingPricingConfiguration(thirteen)), JSON.stringify(thirteen), 'Normalising is idempotent');
    const savedRoot = { ...normalizeOwnedStreamingPlatformState(fresh('plans-v2-save').ownedStreamingPlatform, 'plans-v2-save') };
    savedRoot.serviceConfiguration = { ...savedRoot.serviceConfiguration, pricing: thirteen };
    const reloaded = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(savedRoot)), 'plans-v2-save').serviceConfiguration.pricing;
    assert.deepEqual([reloaded.plans.length, reloaded.plans[4].offer, reloaded.plans[0].adLevel], [12, thirteen.plans[4].offer, 'HEAVY'], 'The save keeps twelve plans, offers and ad levels');
    console.log('PASS offers: rows checked, features follow the offer, 12 plans, ad levels on ad plans, idempotent, kept by the save');

    /* ── locked rows are refused with what they need ── */
    let company = foundCompany('plans-v2-company');
    const tree = () => resolveStreamingTechTree(company.ownedStreamingPlatform);
    const levels = () => company.ownedStreamingPlatform.technologyLevels;
    assert.deepEqual(streamingPlanOfferLocks(offer({ picture: 'PICTURE_1080P' }), tree(), levels()).map(lock => lock.needs), ['Unlock 1080p in Tech']);
    assert.deepEqual(streamingPlanOfferLocks(offer({ screens: 2, downloads: true }), tree(), levels()).map(lock => lock.needs),
        ['Unlock Profiles and screens in Tech', 'Unlock Downloads in Tech']); // Playback's Downloads since #52; Profiles and screens since #60
    const asked = pricingWith(company, [
        { id: 'BASIC', name: 'Basic', monthly: 5.99, featureIds: ['catalogue'], ads: false },
        { id: 'HD', name: 'HD', monthly: 9.99, featureIds: ['catalogue'], ads: false, offer: offer({ picture: 'PICTURE_1080P' }) },
    ]);
    const refused = saveStreamingPricingPlan(company, asked);
    assert.deepEqual([refused.changed, refused.reason, refused.player === company], [false, 'LOCKED_OPTION', true], 'A locked row is refused and nothing is saved');
    assert.deepEqual(refused.locked?.map(lock => [lock.planId, lock.row, lock.needs, lock.techId]), [['HD', 'picture', 'Unlock 1080p in Tech', 'PICTURE_1080P']]);
    // Studio DRM since #54: studios license 4K only with strong DRM, and the old plan below sells 4K
    for (const id of ['PICTURE_720P', 'PICTURE_1080P', 'PICTURE_4K', 'HDR_HDR', 'COLOUR_10BIT', 'TRUST_STUDIO_DRM'] as const) {
        const unlocked = unlockStreamingTech(company, id);
        assert.ok(unlocked.changed, `Unlock ${id}: ${unlocked.reason}`);
        company = unlocked.player;
    }
    assert.deepEqual(streamingPlanOfferLocks(offer({ picture: 'PICTURE_720P', hdr: 'HDR_HDR' }), tree(), levels()).map(lock => lock.needs), ['HDR needs a 1080p or better picture']);
    const saved = saveStreamingPricingPlan(company, pricingWith(company, [
        ...asked.plans,
        { id: 'OLD', name: 'Old way', monthly: 14.99, featureIds: ['catalogue', 'uhd', 'spatial'], ads: false },
    ]));
    assert.ok(saved.changed && saved.reason === 'SAVED', `With 1080p unlocked the offer saves: ${saved.reason}`);
    assert.deepEqual(saved.dropped, [{ planId: 'OLD', planName: 'Old way', featureId: 'spatial' }], 'A Phase 1 plan\'s locked feature is dropped and reported');
    company = saved.player;
    const savedPlans = company.ownedStreamingPlatform.serviceConfiguration.pricing.plans;
    assert.deepEqual(savedPlans.map(plan => sorted(plan.featureIds)), [['catalogue', 'noads'], ['catalogue', 'hd', 'noads'], ['catalogue', 'noads', 'uhd']]);
    console.log(`PASS locks: 1080p before Tech refused ("Unlock 1080p in Tech"), screens and downloads name their needs, HDR needs 1080p; after Tech the offer saves; a Phase 1 plan's Spatial is dropped and reported`);

    /* ── the Build wizard's tiers follow the paid plans ── */
    const tiersFor = (prices: number[]) => {
        const result = saveStreamingPricingPlan(company, normalizeStreamingPricingConfiguration({ ...pricingWith(company, prices.map((monthly, index) => (
            { id: `T${index}`, name: `Tier ${index}`, monthly, featureIds: ['catalogue'], ads: monthly === 0 }))), streams: ['subs', 'ads'] }));
        assert.ok(result.changed, `Prices ${prices.join('/')}: ${result.reason}`);
        return result.player.ownedStreamingPlatform.subscriptionPrices;
    };
    for (const prices of [[0, 5.99, 9.99], [19.99], [2.99, 3.49, 3.99, 49.99], [7.99, 12.99, 17.99]]) {
        const tiers = tiersFor(prices);
        assert.ok(tiers.BASIC >= 3.99 && tiers.BASIC <= 14.99 && tiers.PREMIUM >= 7.99 && tiers.PREMIUM <= 24.99 && tiers.FAMILY >= 11.99 && tiers.FAMILY <= 34.99
            && tiers.PREMIUM >= tiers.BASIC + 2 && tiers.FAMILY >= tiers.PREMIUM + 3, `Prices ${prices.join('/')} → tiers ${JSON.stringify(tiers)} pass the Build checks`);
    }
    assert.deepEqual(tiersFor([7.99, 12.99, 17.99]), { BASIC: 7.99, PREMIUM: 12.99, FAMILY: 17.99 }, 'Three ordinary plans mirror exactly');
    assert.deepEqual(tiersFor([0, 5.99, 9.99]), { BASIC: 5.99, PREMIUM: 9.99, FAMILY: 12.99 }, 'A free ad tier is never a price tier');
    console.log('PASS tiers: free, single, extreme and ordinary line-ups all pass the Build wizard\'s price checks');

    /* ── load and the viewer follow the offer ── */
    const eightTree = normalizeStreamingTechTreeState({ schemaVersion: 2, techs: Object.fromEntries(['PICTURE_720P', 'PICTURE_1080P', 'PICTURE_4K', 'PICTURE_8K', 'HDR_HDR', 'HDR_PRO', 'COLOUR_10BIT', 'COLOUR_12BIT', 'SOUND_51', 'SOUND_71', 'SOUND_SPATIAL', 'SOUND_LOSSLESS']
        .map(id => [id, { version: 1, progress: 0, unlockedAtAbsoluteWeek: 5, versionReachedAtAbsoluteWeek: 5 }])) }, {});
    assert.ok(Math.abs(streamingOfferLoad(eightK) - 5.6 * (1 + .15 + .05 + .03)) < 1e-9, '8K HDR Pro, 12-bit, lossless: 5.6 × 1.23');
    const eightPlatform = { serviceConfiguration: { pricing: { plans: [
        { id: 'A', name: 'Basic', monthly: 7, featureIds: ['hd'], ads: false },
        { id: 'B', name: 'Ultra', monthly: 30, featureIds: [], ads: false, offer: eightK },
    ] } }, techTree: eightTree } as unknown as Parameters<typeof streamingAverageViewerLoad>[0];
    assert.ok(Math.abs(streamingAverageViewerLoad(eightPlatform, [{ planId: 'A', paidAccounts: 3 }, { planId: 'B', paidAccounts: 1 }]) - (3 * 1 + streamingOfferLoad(eightK)) / 4) < 1e-9,
        'The viewers\' load weighs each plan\'s offer');
    const viewerPlatform = { ...normalizeOwnedStreamingPlatformState(company.ownedStreamingPlatform, company.id), techTree: eightTree };
    viewerPlatform.serviceConfiguration = { ...viewerPlatform.serviceConfiguration, pricing: { ...viewerPlatform.serviceConfiguration.pricing,
        plans: [{ id: 'B', name: 'Ultra', monthly: 30, featureIds: ['catalogue'], ads: false, offer: eightK }] } };
    const ultra = getStreamingViewerQuality(viewerPlatform, weekOf(company), []);
    assert.deepEqual([ultra.planMax, ultra.badges, ultra.menu[0]?.label], ['8K', ['4K', 'HDR', 'Spatial audio'], '8K'], 'An 8K plan\'s viewer watches 8K');
    assert.equal(resolveStreamingPlanOffer({ featureIds: ['hd'], offer: eightK }, eightTree), eightK, 'An offer is read before features');
    console.log(`PASS load and viewer: an 8K HDR Pro plan is ${streamingOfferLoad(eightK).toFixed(2)} units a viewer and its viewer watches ${ultra.planMax}`);

    /* ── #44: appeal from the offer, ad levels, prestige against rivals ── */
    const appealOf = (rows: Partial<OwnedStreamingPlanOffer>, tree = eightTree) => Math.round(streamingPlanOfferAppeal(offer(rows), tree) * 100) / 100;
    assert.deepEqual([appealOf({ picture: 'PICTURE_720P' }), appealOf({ picture: 'PICTURE_1080P' }), appealOf({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', colour: 'COLOUR_10BIT' }),
        appealOf({ picture: 'PICTURE_720P', sound: 'SOUND_SPATIAL' })], [0, 5, 12, 5], 'Phase 1\'s points: 720p 0, 1080p 5, 4K HDR 12, Spatial 5');
    assert.deepEqual([appealOf({ picture: 'PICTURE_480P' }), appealOf({ picture: 'PICTURE_4K' }), appealOf({ picture: 'PICTURE_8K', hdr: 'HDR_HDR' }),
        appealOf({ picture: 'PICTURE_8K', hdr: 'HDR_PRO', colour: 'COLOUR_12BIT' }), appealOf({ picture: 'PICTURE_720P', sound: 'SOUND_LOSSLESS' }),
        appealOf({ picture: 'PICTURE_720P', sound: 'SOUND_71', dialogue: true }, tree58)],
        [-3, 8, 16, 18.5, 7, 4], 'Past them: 480p −3, 4K without HDR 8, 8K HDR 16, + HDR Pro and 12-bit 18.5, Lossless 7, 7.1 with Clear dialogue 4 (whether it may be sold is the locks\' question)');
    assert.deepEqual(['LIGHT', 'STANDARD', 'HEAVY'].map(level => STREAMING_AD_LEVEL_EFFECTS[level as 'LIGHT'].appeal), [5, 9, 15], 'Ads cost 5 / 9 / 15 of appeal; standard is what ads always cost');
    assert.deepEqual([streamingPrestigePictureBonus(3, 3), streamingPrestigePictureBonus(4, 3), streamingPrestigePictureBonus(3, 4), streamingPrestigePictureBonus(3, 2), streamingPrestigePictureBonus(5, 4)],
        [13, 16, 6.5, 13, 16], 'Prestige: 4K HDR against 4K rivals is the old 13; 8K against 4K 16; 4K against an 8K rival 6.5; 12K against 8K 16');

    const qaBase = await buildStreamingFullPlatformQa(fresh('plans-v2-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const qaWeek = weekOf(qaBase);
    const playerPlansOf = (player: Player) => getWorldStreamingOffers(player, qaWeek).offers.find(row => row.isPlayer)!.plans;
    assert.deepEqual(playerPlansOf(qaBase).map(plan => plan.appealIndex).slice(0, 2), [38, 58], 'The test company\'s Basic and Standard keep their appeal (38, 58)');
    const withPlans = (plans: OwnedStreamingPricingPlan[]): Player => {
        const pricing = normalizeStreamingPricingConfiguration({ ...qaBase.ownedStreamingPlatform.serviceConfiguration.pricing, streams: ['subs', 'ads', 'rentals'], plans });
        return { ...qaBase, ownedStreamingPlatform: { ...qaBase.ownedStreamingPlatform,
            serviceConfiguration: { ...qaBase.ownedStreamingPlatform.serviceConfiguration, pricing } } } as Player;
    };
    /** Households each of the player's plans wins across eight big markets' real cohorts. */
    const shares = (player: Player): Record<string, number> => {
        const offers = getWorldStreamingOffers(player, qaWeek).offers;
        const totals: Record<string, number> = {};
        for (const countryId of ['US', 'GB', 'IN', 'DE', 'BR', 'JP', 'FR', 'MX']) {
            const audience = player.world.worldAudienceEconomy?.countries[countryId];
            const participation = player.world.worldAudienceParticipation?.countries[countryId];
            if (!audience || !participation) continue;
            const here = offers.filter(row => row.activeCountryIds.includes(countryId));
            audience.cohorts.forEach(cohort => {
                const overlay = participation.cohorts.find(item => item.cohortId === cohort.id);
                if (!overlay) return;
                allocateWorldStreamingCohort(countryId, cohort, overlay, here).allocations
                    .filter(row => row.offer.isPlayer).forEach(row => { totals[row.plan.id] = (totals[row.plan.id] || 0) + row.households; });
            });
        }
        return totals;
    };
    const percent = (totals: Record<string, number>) => {
        const all = Object.values(totals).reduce((sum, value) => sum + value, 0) || 1;
        return Object.fromEntries(Object.entries(totals).map(([id, value]) => [id, Math.round(value / all * 1000) / 10]));
    };
    // The old starter plans: one offer at three prices, so two of three won nobody (plan §12's bug).
    const oldDefaults = percent(shares(withPlans([
        { id: 'BASIC', name: 'Essential', monthly: 7.99, featureIds: [], ads: false },
        { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: [], ads: false },
        { id: 'FAMILY', name: 'Premiere', monthly: 17.99, featureIds: [], ads: false },
    ])));
    assert.deepEqual([oldDefaults.PREMIUM ?? 0, oldDefaults.FAMILY ?? 0], [0, 0], 'The old starters: Standard and Premiere won no households');
    const starters = createInitialOwnedStreamingPlatformState().serviceConfiguration.pricing;
    assert.deepEqual(starters.plans.map(plan => [plan.name, plan.monthly, plan.ads]), [['Basic with ads', 7.99, true], ['Standard', 9.99, false]], 'The new starters differ by ads');
    const newDefaults = percent(shares(withPlans(starters.plans)));
    assert.ok((newDefaults.BASIC ?? 0) >= 25 && (newDefaults.PREMIUM ?? 0) >= 25, `Both new starters win households: ${JSON.stringify(newDefaults)}`);
    // Lighter ads win more households than heavier ones at the same price.
    const levelShares = percent(shares(withPlans([
        { id: 'LIGHT', name: 'Light', monthly: 7.99, featureIds: [], ads: true, adLevel: 'LIGHT' },
        { id: 'HEAVY', name: 'Heavy', monthly: 7.99, featureIds: [], ads: true, adLevel: 'HEAVY' },
    ])));
    assert.ok((levelShares.LIGHT ?? 0) > (levelShares.HEAVY ?? 0), `Light ads beat heavy ads at one price: ${JSON.stringify(levelShares)}`);
    // A better picture wins prestige households: 8K HDR beats 4K HDR at one price.
    const qaTree = resolveStreamingTechTree(qaBase.ownedStreamingPlatform);
    const eightOwned = { ...qaBase, ownedStreamingPlatform: { ...qaBase.ownedStreamingPlatform, techTree: { ...qaTree,
        techs: { ...qaTree.techs, PICTURE_8K: { version: 1, progress: 0, unlockedAtAbsoluteWeek: 5, versionReachedAtAbsoluteWeek: 5 } } } } } as Player;
    const pictureShares = (() => {
        const pricing = normalizeStreamingPricingConfiguration({ ...eightOwned.ownedStreamingPlatform.serviceConfiguration.pricing, streams: ['subs', 'ads', 'rentals'], plans: [
            { id: 'FOUR', name: '4K', monthly: 14.99, featureIds: ['catalogue'], ads: false, offer: offer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR' }) },
            { id: 'EIGHT', name: '8K', monthly: 14.99, featureIds: ['catalogue'], ads: false, offer: offer({ picture: 'PICTURE_8K', hdr: 'HDR_HDR' }) },
        ] });
        return percent(shares({ ...eightOwned, ownedStreamingPlatform: { ...eightOwned.ownedStreamingPlatform,
            serviceConfiguration: { ...eightOwned.ownedStreamingPlatform.serviceConfiguration, pricing } } } as Player));
    })();
    assert.ok((pictureShares.EIGHT ?? 0) > (pictureShares.FOUR ?? 0), `8K HDR beats 4K HDR at one price: ${JSON.stringify(pictureShares)}`);
    console.log(`PASS appeal: Phase 1 points kept (test company 38 / 58); old starters ${JSON.stringify(oldDefaults)} → new ${JSON.stringify(newDefaults)}; light vs heavy ads ${JSON.stringify(levelShares)}; 4K vs 8K ${JSON.stringify(pictureShares)}`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
