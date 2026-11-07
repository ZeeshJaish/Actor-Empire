/** Rival tech styles and pace, #69 (codex-handoff/plans/platform-tech-plan.md §9, Phase 5: "Each rival has a
 *  style: one chases picture and HDR; one is cheap, ads-heavy and optimised; one goes family and kids; the
 *  YouTube-like one is ad-first. … Ecosystem operators get a tech pace, a steady climb with no year locks.
 *  The best offer in each market sets the bar"; §1: "AI rivals use the same system and improve over time").
 *  Checks:
 *  - styles: the five core rivals by name, the rest by a stable hash; the pace by strength;
 *  - growth: the steps each style takes, foundations first, a step it has passed over without costing time;
 *  - exactness: with no steps taken (no pace week, or the pace week this week) every rival offer is exactly
 *    as before #69;
 *  - four years on: Apple TV+ sells 8K (the bar for 4K plans rises), Disney+ kids profiles and six screens,
 *    YouTube better ads; one real week on the test company shows what the player loses to them;
 *  - the pace week is stamped the first week a live service runs, and kept. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type WorldStreamingPlatformOffer } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { resolveRivalStreamingTechGrowth, streamingRivalTechStepWeeks, streamingRivalTechStyle } from '../services/streamingRivalTech';
import { resolveRivalStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Rival Tech Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const stepNames = (platformId: string, technology: number, playback: number | undefined, weeks: number) => resolveRivalStreamingTechGrowth(platformId, technology, playback, weeks)
    .steps.map(step => `${step.techId}${step.version > 1 ? ` v${step.version}` : ''}`);

async function main() {
    const started = performance.now();

    /* ── styles and pace ── */
    assert.deepEqual(['APPLE_TV', 'DISNEY_PLUS', 'HULU', 'YOUTUBE', 'NETFLIX'].map(streamingRivalTechStyle), ['PICTURE', 'FAMILY', 'VALUE', 'AD_FIRST', 'BALANCED']);
    const others = ['PRIME_VIDEO', 'JIOHOTSTAR', 'CRAVE', 'RAIPLAY', 'TVNZ_PLUS', 'STAN', 'VIX', 'GLOBOPLAY', 'SHAHID', 'ZEE5', 'TVING', 'COUPANG_PLAY'];
    const otherStyles = others.map(streamingRivalTechStyle);
    assert.ok(otherStyles.every(style => style !== 'AD_FIRST'), 'Only YouTube is ad-first');
    assert.ok(new Set(otherStyles).size >= 3, 'The rest spread over the other styles');
    assert.deepEqual(others.map(streamingRivalTechStyle), otherStyles, 'and keep them');
    assert.deepEqual([99, 98, 94, 88, 76, 72, 40, 10, 200].map(streamingRivalTechStepWeeks), [37, 37, 39, 41, 48, 51, 91, 91, 30]);
    console.log(`PASS style: Apple TV+ picture, Disney+ family, Hulu value, YouTube ad-first, Netflix balanced; others: ${others.map((id, index) => `${id} ${otherStyles[index]}`).join(', ')}; a step every 37 weeks at technology 99, 48 at 76, 51 at 72`);

    /* ── growth ── */
    assert.deepEqual(resolveRivalStreamingTechGrowth('APPLE_TV', 98, 25, 0).tree, resolveRivalStreamingTechTree(98, 25), 'No weeks: the Phase 1 tree');
    assert.deepEqual(stepNames('APPLE_TV', 98, 25, 37 * 6), ['HDR_PRO', 'COLOUR_12BIT', 'PICTURE_4K v2', 'PICTURE_8K', 'HDR_PRO v2', 'SOUND_LOSSLESS'],
        'Apple TV+ already has 4K, HDR and Spatial, so its first step is HDR Pro; 8K is its fourth');
    assert.deepEqual(stepNames('DISNEY_PLUS', 88, 12, 41 * 4), ['FAM_SCREENS', 'FAM_SCREENS v2', 'FAM_KIDS', 'PLAY_DOWNLOADS']);
    assert.deepEqual(stepNames('YOUTUBE', 99, 25, 37 * 4), ['ADS_CONTEXTUAL', 'ADS_AUDIENCE', 'ADS_BREAKS', 'AI_BECAUSE']);
    assert.deepEqual(stepNames('NETFLIX', 94, 25, 39 * 3), ['AI_BECAUSE', 'APPS_TV', 'PLAY_DOWNLOADS']);
    assert.deepEqual(stepNames('HULU', 76, 12, 48 * 3), ['OPT_HEVC', 'ADS_CONTEXTUAL', 'OPT_AV1']);
    const weak = resolveRivalStreamingTechGrowth('APPLE_TV', 60, 0, streamingRivalTechStepWeeks(60) * 3);
    assert.deepEqual(weak.steps.map(step => step.techId).slice(0, 3), ['HDR_HDR', 'PICTURE_4K', 'TRUST_STUDIO_DRM'], 'A rival without 4K takes the foundations first');
    console.log(`PASS growth: Apple TV+ ${stepNames('APPLE_TV', 98, 25, 37 * 6).join(' → ')}; Disney+ ${stepNames('DISNEY_PLUS', 88, 12, 41 * 4).join(' → ')}; YouTube ${stepNames('YOUTUBE', 99, 25, 37 * 4).join(' → ')}`);

    /* ── the test company's world ── */
    const qa = await buildStreamingFullPlatformQa(fresh('rival-tech-pace'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const platform = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.ok(Number.isFinite(platform.rivalTechFromWeek), 'The test company\'s weeks stamped the pace week');
    const withPace = (from: number | undefined): Player => ({ ...qa, ownedStreamingPlatform: { ...qa.ownedStreamingPlatform, rivalTechFromWeek: from } as Player['ownedStreamingPlatform'] });
    const rivals = (player: Player) => getWorldStreamingOffers(player, week).offers.filter(offer => !offer.isPlayer);
    const strip = (offers: WorldStreamingPlatformOffer[]) => JSON.stringify(offers.map(offer => ({ ...offer, sourceFingerprint: undefined })));
    const unset = rivals(withPace(undefined));
    const now = rivals(withPace(week));
    assert.equal(JSON.stringify(now), JSON.stringify(unset), 'With the pace week this week, every rival offer is exactly what it is without one');
    assert.ok(unset.every(offer => offer.habitAppealIndex === undefined && offer.kidsAppealIndex === undefined && offer.adSlotFactor === undefined
        && offer.plans.every(plan => (plan.pictureRank ?? 0) <= 3)), 'and holds nothing #69 adds: no rival past 4K');
    console.log(`PASS exact: ${unset.length} rival offers with no steps taken are exactly as before, field for field and fingerprint for fingerprint`);

    const later = rivals(withPace(week - 52 * 4));
    assert.notEqual(strip(later), strip(unset), 'Four years on, rivals have moved');
    const offerOf = (offers: WorldStreamingPlatformOffer[], id: string) => offers.find(offer => offer.platformId === id);
    const apple = offerOf(later, 'APPLE_TV');
    const disney = offerOf(later, 'DISNEY_PLUS');
    const youtube = offerOf(later, 'YOUTUBE');
    assert.ok(apple && Math.max(...apple.plans.map(plan => plan.pictureRank ?? 0)) === 4, 'Apple TV+ sells 8K four years on');
    assert.ok(disney && disney.plans.some(plan => plan.featureIds.includes('kids')) && (disney.kidsAppealIndex ?? 0) > 0, 'Disney+ has kids profiles');
    assert.ok(youtube && (youtube.adAudienceQualityBonus ?? 0) > 0 && (youtube.adPenaltyFactor ?? 1) < 1, 'YouTube\'s ads win more of the market and cost it less with viewers');
    console.log(`PASS later: four years on, Apple TV+ ${apple!.plans.map(plan => `${plan.name} rank ${plan.pictureRank}`).join(', ')}; Disney+ kids appeal ${disney!.kidsAppealIndex}${disney!.familyAppealIndex ? `, watch party ${disney!.familyAppealIndex}` : ''}; YouTube ad quality +${youtube!.adAudienceQualityBonus}, ads cost ×${youtube!.adPenaltyFactor}${youtube!.adSlotFactor ? `, slots ×${youtube!.adSlotFactor}` : ''}`);

    /* ── one real week: what the player loses ── */
    const paying = async (player: Player) => {
        const next = (await processGameWeek(player)).player;
        return normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, next.id).metrics.subscribers;
    };
    const today = await paying(withPace(week));
    const behind = await paying(withPace(week - 52 * 4));
    assert.ok(behind < today, 'The same week against rivals four years on: fewer subscribers');
    console.log(`PASS week: subscribers after one week ${today.toLocaleString('en-US')} against rivals as they are → ${behind.toLocaleString('en-US')} against rivals four years on (${((behind / today - 1) * 100).toFixed(2)}%)`);

    /* ── the stamp ── */
    const unstamped = (await processGameWeek(withPace(undefined))).player;
    const stamped = normalizeOwnedStreamingPlatformState(unstamped.ownedStreamingPlatform, unstamped.id).rivalTechFromWeek;
    assert.equal(stamped, getAbsoluteWeek(unstamped.age, unstamped.currentWeek), 'A live service with no pace week gets this week');
    const kept = (await processGameWeek(withPace(week - 10))).player;
    assert.equal(normalizeOwnedStreamingPlatformState(kept.ownedStreamingPlatform, kept.id).rivalTechFromWeek, week - 10, 'and keeps one it has');
    console.log('PASS stamp: a live service with no pace week is stamped the week it runs; a stamped one keeps its week');
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
