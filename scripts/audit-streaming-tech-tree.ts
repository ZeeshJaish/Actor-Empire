/** Platform tech tree, Phases 1–2 (codex-handoff/plans/platform-tech-plan.md). Checks:
 *  - the catalogue: Picture, HDR, Colour, Sound, Optimisation and Stabilization; ladders in
 *    order, dearer as they climb; starters free; every requirement comes earlier; the Playback
 *    level the tree stands for;
 *  - older saves: a save without a tree converts from its Playback level (0 / 20 / 45 / 58),
 *    idempotent, with no change to money, time or the level itself; a messy tree is cleaned;
 *  - a new career: found a company, every refusal, unlock 720p → 1080p → 4K and HDR with
 *    cash, put energy in (+5 kept between presses, FILL, this week first), reach versions;
 *    the ledger, the Finance room row, the bridge to Playback Quality, the weekly upkeep;
 *    a plan keeps 1080p / 4K HDR / Spatial only when their techs are unlocked;
 *  - the developer test company keeps hd / uhd / spatial; one more tech is billed in its week;
 *    a higher version makes the plan offering it more appealing, and only that plan;
 *  - given techs (converted from an old save, or arriving with an acquisition) carry no upkeep:
 *    their running cost is already in what that save pays (#35);
 *  - the Tech tab's data (getStreamingTechDesk): groups, states, focus, needs, plan chips;
 *  - the old research flow is retired (#36): no programme starts; engineering builds no longer
 *    wait for research; Playback campus nodes point to Tech except to finish research already
 *    done; Kids Mode needs no research;
 *  - rivals (#37): each rival's plans offer only the picture and sound its tech allows (its
 *    researched Playback level, or its technology strength less 25); a premium tier without
 *    4K HDR keeps HD;
 *  - the viewer (#38): what the viewer's plan streams, the quality menu (dearer steps greyed),
 *    badges, "Now in 4K"; progress bars as a 0–1 share; "Leaving Soon" only within 8 weeks;
 *  - Phase 1 bugs (#39): public trust moves +0.35 / −0.2 a week instead of being set to 0.35;
 *    a save that ran under the bug gets the starting 72 back once; the TECH DEBT figure is
 *    the infrastructure's own, not finished projects counted twice;
 *  - Optimisation, Stabilization and tech debt (#41): load and cost factors, paydown, overload
 *    softening, the Delivery and Reliability bridge; every unlock and version of Picture, HDR,
 *    Colour and Sound adds debt; the weekly close pays the tree's debt first, then the
 *    infrastructure's; debt costs playback; old saves (no tree, or a schema-1 tree) get the
 *    Optimisation and Stabilization steps their Delivery and Reliability levels stand for,
 *    once, with no upkeep; the Reliability campus line points to Stabilization. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type Player, type StreamingTechId } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingEconomy';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { getStreamingTechnologyWeeklyCost } from '../services/streamingTechnologyCampus';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { STREAMING_TECH_GROUP_ACCENT, getStreamingTechDesk } from '../services/streamingTechDesk';
import { STREAMING_RESEARCH_RETIRED_REASON, startStreamingResearchProgram } from '../services/streamingResearchLifecycle';
import { STREAMING_PLAYBACK_MOVED_BLOCKER, STREAMING_RELIABILITY_MOVED_BLOCKER, getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getStreamingProductSuite } from '../services/streamingProductSuite';
import { normalizeStreamingPlatformEcosystem } from '../services/streamingPlatformEcosystem';
import { gateRivalStreamingPlanFeatures, resolveRivalStreamingTechTree } from '../services/streamingTechTreeCatalogue';
import { getStreamingViewerQuality } from '../services/streamingViewerQuality';
import { createCanonicalNetworkState, createCanonicalViewerState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { STREAMING_PUBLIC_TRUST_RESTORED_KEY } from '../services/streamingCrisisSecurity';
import {
    STREAMING_TECH_DEFINITIONS, STREAMING_TECH_GROUPS, convertStreamingTechTreeFromLevels, deriveStreamingTechEngineLevel, deriveStreamingTechPlaybackLevel,
    getStreamingTechGroupLadder, getStreamingTechTreeWeeklyUpkeep, normalizeStreamingTechTreeState, payDownStreamingTechDebt,
    resolveStreamingPlatformTechDebt, resolveStreamingTechDebt, resolveStreamingTechTree, streamingTechCostFactor, streamingTechDebtFor,
    streamingTechDebtPaydown, streamingTechFeatureAllowed, streamingTechFeatureLockReason, streamingTechFeatureQuality,
    streamingTechLoadFactor, streamingTechOverloadFactor, streamingTechVersion,
} from '../services/streamingTechTreeCatalogue';
import {
    completeStreamingTechVersion, contributeStreamingTechEnergy, streamingTechVersionLabel, unlockStreamingTech, type StreamingTechActionResult,
} from '../services/streamingTechTree';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Tech Tree Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, weekly: number, bank: number): Player => ({
    ...player, energy: { ...player.energy, current: weekly + bank, max: weekly + bank },
    flags: { ...player.flags, weeklyBaseEnergyRemaining: weekly, bonusEnergyBank: bank },
});
const withTreasury = (player: Player, treasuryCash: number): Player => ({
    ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, treasuryCash },
});
const refused = (label: string, result: StreamingTechActionResult, reason: string, player: Player) => {
    assert.equal(result.changed, false, `${label} is refused`);
    assert.equal(result.reason, reason, `${label}: ${reason}`);
    assert.equal(result.player, player, `${label}: the save is untouched`);
};
const done = (label: string, result: StreamingTechActionResult): Player => {
    assert.ok(result.changed, `${label}: ${result.reason || 'refused'}`);
    return result.player;
};
const tree = (player: Player) => resolveStreamingTechTree(player.ownedStreamingPlatform);
const version = (player: Player, id: StreamingTechId) => streamingTechVersion(tree(player), id);
const progress = (player: Player, id: StreamingTechId) => tree(player).techs[id]?.progress ?? -1;
const playback = (player: Player) => player.ownedStreamingPlatform.technologyLevels.PLAYBACK_QUALITY;
const owned = (state: ReturnType<typeof resolveStreamingTechTree>) => Object.keys(state.techs).sort();
const fmt = (value: number) => Math.round(value).toLocaleString('en-US');

/** A new career's company: registered through the real founding service (treasury 0). */
const foundCompany = (id: string): Player => {
    let player = fresh(id);
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    player = {
        ...player, money: STREAMING_INCORPORATION_ECONOMY.cashRequired, stats: { ...player.stats, fame: 80, reputation: 80 },
        ownedStreamingPlatform: { ...platform, lifecycle: 'ELIGIBLE', milestoneKeys: [...new Set([...platform.milestoneKeys, 'streaming-launch-clearance'])] },
    };
    const founded = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(player, {
        ...createDefaultStreamingFoundingDraft(weekOf(player)), currentStep: 2, name: 'TREELINE', primaryColor: '#2F7BFF', secondaryColor: '#0B1220',
    }));
    assert.ok(founded.changed, `The company is registered: ${founded.reason}`);
    return founded.player;
};
/** Founder capital through the real service; personal cash is topped up first. */
const fund = (player: Player, amount: number, key: string): Player => {
    const result = contributeStreamingFounderCapital({ ...player, money: player.money + amount }, amount, key);
    assert.ok(result.changed, `Founder capital: ${result.reason}`);
    return result.player;
};
/** Three plans asking for every tech-gated feature. */
const pricingAsking = (player: Player): OwnedStreamingPricingConfiguration => {
    const current = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).serviceConfiguration.pricing;
    return {
        ...configureStreamingPricingOffer(current, { kind: 'CORE', coreModel: 'SUBSCRIPTION' }),
        plans: [
            { id: 'BASIC', name: 'Basic', monthly: 6.99, featureIds: ['noads', 'catalogue'], ads: false },
            { id: 'PREMIUM', name: 'Standard', monthly: 12.99, featureIds: ['noads', 'catalogue', 'hd'], ads: false },
            { id: 'FAMILY', name: 'Premium', monthly: 19.99, featureIds: ['noads', 'catalogue', 'uhd', 'spatial'], ads: false },
        ],
    };
};
const planFeatures = (player: Player) => Object.fromEntries(player.ownedStreamingPlatform.serviceConfiguration.pricing.plans
    .map(plan => [plan.id, plan.featureIds.filter(id => id === 'hd' || id === 'uhd' || id === 'spatial').join('+') || '-']));
const playerPlans = (player: Player) => getWorldStreamingOffers(player, weekOf(player)).offers.find(offer => offer.isPlayer)!.plans;

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    assert.deepEqual(STREAMING_TECH_GROUPS.map(group => group.id), ['PICTURE', 'HDR', 'COLOUR', 'SOUND', 'OPTIMISATION', 'STABILIZATION', 'PLAYBACK', 'APPS', 'TRUST', 'SMART_AI', 'FAMILY', 'ADS']);
    assert.deepEqual(getStreamingTechGroupLadder('PICTURE').map(item => item.name), ['480p', '720p', '1080p', '4K', '8K', '12K', '16K', '24K']);
    assert.deepEqual(getStreamingTechGroupLadder('HDR').map(item => item.name), ['HDR', 'HDR Pro', 'HDR Ultra']);
    assert.deepEqual(getStreamingTechGroupLadder('COLOUR').map(item => item.name), ['8-bit', '10-bit', '12-bit', '16-bit']);
    assert.deepEqual(getStreamingTechGroupLadder('SOUND').map(item => item.name), ['Stereo', '5.1 Surround', '7.1 Surround', 'Spatial 3D', 'Lossless', 'Personal sound', 'Clear dialogue']);
    assert.deepEqual(getStreamingTechGroupLadder('OPTIMISATION').map(item => item.name), ['H.264', 'HEVC', 'AV1', 'Next-gen codec', 'Neural codec', 'Smart encoding', 'Edge cache', 'App optimisation']);
    assert.deepEqual(getStreamingTechGroupLadder('STABILIZATION').map(item => item.name), ['Monitoring', 'Auto-scaling', 'Redundancy', 'Chaos testing', 'Self-healing', 'Load testing']);
    assert.equal(new Set(STREAMING_TECH_DEFINITIONS.map(item => item.id)).size, STREAMING_TECH_DEFINITIONS.length, 'Every tech id is unique');
    const starters = STREAMING_TECH_DEFINITIONS.filter(item => item.starter);
    assert.deepEqual(starters.map(item => item.id), ['PICTURE_480P', 'COLOUR_8BIT', 'SOUND_STEREO', 'OPT_H264', 'STAB_MONITORING', 'APPS_PHONE', 'TRUST_DRM', 'AI_TRENDING', 'ADS_BASIC'],
        'Nine starters (the phone app since #52, DRM since #54, Trending rows since #59, the Basic ad server since #61)');
    assert.ok(starters.every(item => item.unlockCost === 0 && item.weeklyUpkeep === 0 && !item.requires.length), 'Starters are free');
    STREAMING_TECH_DEFINITIONS.forEach((item, index) => {
        assert.ok(item.requires.every(id => STREAMING_TECH_DEFINITIONS.findIndex(other => other.id === id) < index && STREAMING_TECH_DEFINITIONS.some(other => other.id === id)),
            `${item.name}: every requirement exists and comes earlier`);
        assert.ok(item.versionEnergy[0] > 0 && item.versionEnergy[1] > item.versionEnergy[0], `${item.name}: version 3 needs more energy than version 2`);
        assert.ok(item.playbackPoints[0] <= item.playbackPoints[1] && item.playbackPoints[1] <= item.playbackPoints[2], `${item.name}: a version never lowers quality`);
        assert.ok(item.starter || (item.unlockCost > 0 && item.weeklyUpkeep > 0), `${item.name}: costs cash and upkeep`);
    });
    STREAMING_TECH_GROUPS.forEach(group => {
        const ladder = getStreamingTechGroupLadder(group.id).filter(item => !item.sideLine);
        ladder.slice(1).forEach((item, index) => {
            assert.ok(item.unlockCost > ladder[index].unlockCost, `${group.name}: ${item.name} costs more than ${ladder[index].name}`);
            assert.ok(item.versionEnergy[0] >= ladder[index].versionEnergy[0], `${group.name}: ${item.name} needs at least as much energy`);
        });
    });
    assert.ok(STREAMING_TECH_DEFINITIONS.filter(item => item.futuristic).every(item => item.unlockCost >= 120_000_000), 'Futuristic steps are just dear, never year-locked');
    assert.equal(deriveStreamingTechPlaybackLevel(convertStreamingTechTreeFromLevels(0)), 0, 'Starters stand for Playback 0');
    assert.equal(deriveStreamingTechPlaybackLevel(normalizeStreamingTechTreeState({ techs: { PICTURE_1080P: { version: 1 } } }, {})), 20, '1080p v1 stands for 20');
    assert.equal(deriveStreamingTechPlaybackLevel(normalizeStreamingTechTreeState({ techs: { PICTURE_4K: { version: 1 } } }, {})), 55, '4K v1 stands for 55');
    const everything = normalizeStreamingTechTreeState({ techs: Object.fromEntries(STREAMING_TECH_DEFINITIONS.map(item => [item.id, { version: 3 }])) }, {});
    assert.equal(deriveStreamingTechPlaybackLevel(everything), 100, 'The whole tree at version 3 is Playback 100');
    assert.equal(streamingTechVersionLabel('PICTURE_4K', 2), '4K · Sharp');
    console.log(`PASS catalogue: ${STREAMING_TECH_DEFINITIONS.length} techs in ${STREAMING_TECH_GROUPS.length} groups, starters free, ladders dearer as they climb; 1080p = 20, 4K = 55, all at v3 = 100`);

    /* ── older saves: converted from the Playback level ── */
    const conversions = [0, 20, 45, 58].map(level => ({ level, tree: convertStreamingTechTreeFromLevels(level) }));
    assert.deepEqual(owned(conversions[0].tree), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_8BIT', 'OPT_H264', 'PICTURE_480P', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM']);
    assert.deepEqual(owned(conversions[1].tree), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_8BIT', 'OPT_H264', 'PICTURE_1080P', 'PICTURE_480P', 'PICTURE_720P', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM']);
    assert.deepEqual(owned(conversions[2].tree), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_8BIT', 'OPT_H264', 'PICTURE_1080P', 'PICTURE_480P', 'PICTURE_720P', 'SOUND_51', 'SOUND_71', 'SOUND_SPATIAL', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM']);
    assert.deepEqual(owned(conversions[3].tree), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_10BIT', 'COLOUR_8BIT', 'HDR_HDR', 'OPT_H264', 'PICTURE_1080P', 'PICTURE_480P', 'PICTURE_4K', 'PICTURE_720P', 'SOUND_51', 'SOUND_71', 'SOUND_SPATIAL', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM', 'TRUST_STUDIO_DRM']);
    // The old plan features needed Playback 20 (hd), 45 (spatial) and 55 (uhd): each stays offered.
    assert.deepEqual(conversions.map(row => ['hd', 'spatial', 'uhd'].filter(feature => streamingTechFeatureAllowed(row.tree, feature)).join('+')),
        ['', 'hd', 'hd+spatial', 'hd+spatial+uhd']);
    assert.deepEqual(conversions.map(row => row.tree.convertedFromLegacy), [false, true, true, true]);
    conversions.forEach(row => assert.equal(JSON.stringify(normalizeStreamingTechTreeState(row.tree, {})), JSON.stringify(row.tree), `Playback ${row.level}: a converted tree normalises to the same bytes`));
    assert.ok(Object.values(conversions[3].tree.techs).every(row => row!.version === 1 && row!.progress === 0), 'Converted techs arrive at version 1');
    assert.equal(getStreamingTechTreeWeeklyUpkeep(conversions[3].tree), 0, 'Converted techs carry no upkeep: the old save already pays for what runs them');
    assert.ok(Object.entries(conversions[3].tree.techs).every(([id, row]) => STREAMING_TECH_DEFINITIONS.find(item => item.id === id)!.starter ? !row!.granted : row!.granted === true), 'Converted techs are marked given; starters are not');
    // A tree saved by #34 (no flag): its week-0 techs are read as given, so loading it adds no bill.
    const fromEntry34 = normalizeStreamingTechTreeState({ schemaVersion: 1, convertedFromLegacy: true, techs: { PICTURE_480P: { version: 1, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }, PICTURE_4K: { version: 1, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }, PICTURE_8K: { version: 1, progress: 0, unlockedAtAbsoluteWeek: 812, versionReachedAtAbsoluteWeek: 812 } } }, {});
    assert.deepEqual([fromEntry34.techs.PICTURE_4K!.granted, fromEntry34.techs.PICTURE_8K!.granted, getStreamingTechTreeWeeklyUpkeep(fromEntry34)], [true, undefined, 300_000], 'Week-0 4K is given; 8K bought at week 812 pays its $300K');
    assert.equal(streamingTechFeatureLockReason(conversions[0].tree, 'uhd'), 'Unlock 4K, HDR and Studio DRM in Tech');
    assert.equal(streamingTechFeatureLockReason(conversions[0].tree, 'hd'), 'Unlock 1080p in Tech');
    assert.equal(streamingTechFeatureLockReason(conversions[3].tree, 'uhd'), null);
    assert.equal(getStreamingTechTreeWeeklyUpkeep(conversions[0].tree), 0, 'Starters cost nothing a week');
    // A messy saved tree: versions clamp, progress stays within its bar (a full bar is kept: it waits for its price, #84), unknown ids drop, starters return.
    const messy = normalizeStreamingTechTreeState({ techs: { PICTURE_4K: { version: 9, progress: 999 }, PICTURE_1080P: { version: 2, progress: 999 }, MOON_8K: { version: 1 }, HDR_HDR: { version: 0 } } }, { PLAYBACK_QUALITY: 90 });
    assert.deepEqual(owned(messy), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_8BIT', 'OPT_H264', 'PICTURE_1080P', 'PICTURE_480P', 'PICTURE_4K', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM', 'TRUST_STUDIO_DRM'], 'A saved tree is kept as saved (Trust and safety, which it predates, joins from its levels: Playback 90 sells 4K, so Studio DRM), not re-converted from the level');
    assert.deepEqual([messy.techs.PICTURE_4K!.version, messy.techs.PICTURE_4K!.progress, messy.techs.PICTURE_1080P!.version, messy.techs.PICTURE_1080P!.progress], [3, 0, 2, 20], '1080p v3 needs 20: 999 is a full bar, kept');
    assert.equal(JSON.stringify(normalizeStreamingTechTreeState(messy, { PLAYBACK_QUALITY: 0 })), JSON.stringify(messy), 'Normalising a tree is idempotent');
    console.log(`PASS conversion: Playback 0 / 20 / 45 / 58 → ${conversions.map(row => Object.keys(row.tree.techs).length).join(' / ')} techs; every old plan feature stays offered; a messy tree is cleaned`);

    /* ── a new career ── */
    const unfounded = fresh('tech-tree-unfounded');
    refused('Unlocking before founding', unlockStreamingTech(unfounded, 'PICTURE_720P'), 'NOT_FOUNDED', unfounded);
    let company = foundCompany('tech-tree-new-career');
    const lifecycle = company.ownedStreamingPlatform.lifecycle;
    assert.ok(lifecycle === 'FOUNDING' || lifecycle === 'ACTIVE', `A founded company (${lifecycle})`);
    assert.deepEqual(owned(tree(company)), ['ADS_BASIC', 'AI_TRENDING', 'APPS_PHONE', 'COLOUR_8BIT', 'OPT_H264', 'PICTURE_480P', 'SOUND_STEREO', 'STAB_MONITORING', 'TRUST_DRM'], 'A new company owns the starters only');
    assert.equal(resolveStreamingTechDebt(tree(company)), 0, 'A new company has no tech debt');
    assert.equal(playback(company), 0);
    // Plans cannot offer what the company has not unlocked.
    const lockedSave = saveStreamingPricingPlan(company, pricingAsking(company));
    assert.ok(lockedSave.changed, `The plans are saved: ${lockedSave.reason}`);
    assert.deepEqual(planFeatures(lockedSave.player), { BASIC: '-', PREMIUM: '-', FAMILY: '-' }, 'Before Tech: 1080p, 4K HDR and Spatial are dropped from the plans');
    company = lockedSave.player;
    refused('Unlocking with an empty treasury', unlockStreamingTech(company, 'PICTURE_720P'), 'INSUFFICIENT_TREASURY', company);
    company = fund(company, 120_000_000, 'tech-tree-audit:capital'); // $120M since #54: 4K plans need Studio DRM ($15M) too
    const funded = company.ownedStreamingPlatform.treasuryCash;
    const revision = company.ownedStreamingPlatform.launchProgram.configurationRevision;
    refused('An unknown tech', unlockStreamingTech(company, 'PICTURE_99K' as StreamingTechId), 'UNKNOWN_TECH', company);
    refused('A starter', unlockStreamingTech(company, 'PICTURE_480P'), 'ALREADY_UNLOCKED', company);
    const skip = unlockStreamingTech(company, 'PICTURE_1080P');
    refused('1080p before 720p', skip, 'NEEDS_EARLIER_TECH', company);
    assert.equal(skip.missing, '720p', 'It names the step before');
    refused('HDR before 1080p', unlockStreamingTech(company, 'HDR_HDR'), 'NEEDS_EARLIER_TECH', company);
    refused('Energy into a locked tech', contributeStreamingTechEnergy(company, 'PICTURE_720P', 5), 'LOCKED', company);

    const energyBefore = company.energy.current;
    company = done('Unlock 720p', unlockStreamingTech(company, 'PICTURE_720P'));
    let platform = company.ownedStreamingPlatform;
    assert.equal(funded - platform.treasuryCash, 2_000_000, '720p costs $2M from the treasury');
    assert.equal(company.energy.current, energyBefore, 'Unlocking costs no energy');
    assert.deepEqual([version(company, 'PICTURE_720P'), progress(company, 'PICTURE_720P')], [1, 0], '720p arrives at version 1');
    assert.equal(platform.launchProgram.configurationRevision, revision + 1, 'The offer is re-read');
    const commitment = platform.costCommitments.find(row => row.sourceReferenceId === 'tech-tree:PICTURE_720P')!;
    assert.deepEqual([commitment.status, commitment.paidAmount, commitment.weeklyAmount, commitment.category], ['PAID', 2_000_000, 20_000, 'TECHNOLOGY']);
    const unlockEntry = platform.eventLedger.find(row => row.metadata?.kind === 'TECH_UNLOCKED' && row.metadata?.techId === 'PICTURE_720P')!;
    assert.ok(unlockEntry && unlockEntry.type === 'TECHNOLOGY_PROJECT_STARTED' && unlockEntry.metadata?.capitalCost === 2_000_000, 'The ledger records the unlock');
    const financeRow = getStreamingFinanceRoom(company, 'ALL').ledger.find(row => row.label === 'Technology program funded' && row.displayAmount === 2_000_000);
    assert.ok(financeRow && financeRow.cashDelta === -2_000_000, 'The Finance room shows it as a technology outflow');
    assert.equal(playback(company), 8, 'Playback Quality follows the tree: 720p v1 = 8');
    assert.equal(resolveStreamingTechDebt(tree(company)), 2, '720p adds 2 tech debt');
    assert.equal(unlockEntry.metadata?.techDebt, 2, 'The ledger records the debt added');
    refused('Unlocking 720p again', unlockStreamingTech(company, 'PICTURE_720P'), 'ALREADY_UNLOCKED', company);
    company = done('Unlock 1080p', unlockStreamingTech(company, 'PICTURE_1080P'));
    assert.equal(playback(company), 20, '1080p v1 = 20');
    assert.equal(funded - company.ownedStreamingPlatform.treasuryCash, 8_000_000);
    console.log(`PASS unlock: refusals first (not founded, empty treasury, unknown, starter, 1080p before 720p, HDR before 1080p, energy while locked); 720p then 1080p for $8M, ledger + Finance row, Playback 0 → 8 → 20`);

    /* energy: +5 kept between presses, FILL puts what there is, this week first */
    company = withEnergy(company, 7, 0);
    const beforePress = company;
    let step = contributeStreamingTechEnergy(company, 'PICTURE_1080P', 5);
    company = done('A press', step);
    assert.deepEqual([step.contributed, version(company, 'PICTURE_1080P'), progress(company, 'PICTURE_1080P'), company.flags.weeklyBaseEnergyRemaining], [5, 1, 5, 2]);
    assert.equal(beforePress.flags.weeklyBaseEnergyRemaining, 7, 'The old save is not mutated');
    // #84: energy never costs money; a full bar waits for its price
    assert.equal(company.ownedStreamingPlatform.treasuryCash, beforePress.ownedStreamingPlatform.treasuryCash, 'Energy costs no cash');
    refused('A press with 2⚡ left', contributeStreamingTechEnergy(company, 'PICTURE_1080P', 5), 'INSUFFICIENT_ENERGY', company);
    step = contributeStreamingTechEnergy(company, 'PICTURE_1080P', 'FILL');
    company = done('FILL with 2 left', step);
    assert.deepEqual([step.contributed, progress(company, 'PICTURE_1080P'), step.completed], [2, 7, undefined], 'FILL puts in what there is; kept: 5 + 2');
    company = withEnergy(company, 3, 50);
    const revisionBeforeVersion = company.ownedStreamingPlatform.launchProgram.configurationRevision;
    const cashBeforeVersion = company.ownedStreamingPlatform.treasuryCash;
    step = contributeStreamingTechEnergy(company, 'PICTURE_1080P', 'FILL');
    company = done('FILL the bar of version 2', step);
    assert.deepEqual([step.contributed, step.ready, step.completed, version(company, 'PICTURE_1080P'), progress(company, 'PICTURE_1080P')], [8, true, undefined, 1, 15],
        '1080p v2 needs 15: 7 kept + 8; the full bar waits for its price (#84)');
    assert.deepEqual([company.flags.weeklyBaseEnergyRemaining, company.flags.bonusEnergyBank], [0, 45], "This week's energy first, then the bank");
    assert.equal(company.ownedStreamingPlatform.treasuryCash, cashBeforeVersion, 'A full bar has cost no money yet');
    refused('More energy into a full bar', contributeStreamingTechEnergy(company, 'PICTURE_1080P', 5), 'ENERGY_FULL', company);
    const short = withTreasury(company, 2_399_999);
    refused('Paying with $1 short', completeStreamingTechVersion(short, 'PICTURE_1080P'), 'INSUFFICIENT_TREASURY', short);
    step = completeStreamingTechVersion(company, 'PICTURE_1080P');
    company = done('Pay to complete version 2', step);
    assert.deepEqual([step.completed?.version, version(company, 'PICTURE_1080P'), progress(company, 'PICTURE_1080P')], [2, 2, 0]);
    assert.equal(company.ownedStreamingPlatform.launchProgram.configurationRevision, revisionBeforeVersion + 1);
    assert.equal(cashBeforeVersion - company.ownedStreamingPlatform.treasuryCash, 2_400_000, 'Version 2 is paid to complete it: 40% of 1080p\'s $6M (#84)');
    assert.ok(company.ownedStreamingPlatform.eventLedger.some(row => row.type === 'TECHNOLOGY_PROJECT_COMPLETED' && row.metadata?.kind === 'TECH_VERSION_REACHED' && row.metadata?.techId === 'PICTURE_1080P' && row.metadata?.version === 2));
    assert.ok((company.flags.weeklyEnergySpendLog || []).some((row: { label: string }) => row.label === 'Tech: 1080p · Sharp'), 'The energy log names it');
    assert.equal(playback(company), 23, '1080p v2 = 23');
    refused('Paying before the bar is full', completeStreamingTechVersion(company, 'PICTURE_1080P'), 'ENERGY_NOT_FULL', company);
    company = done('FILL the bar of version 3', contributeStreamingTechEnergy(withEnergy(company, 100, 0), 'PICTURE_1080P', 'FILL'));
    company = done('Pay to complete version 3', completeStreamingTechVersion(company, 'PICTURE_1080P'));
    assert.deepEqual([version(company, 'PICTURE_1080P'), playback(company)], [3, 26]);
    assert.equal(resolveStreamingTechDebt(tree(company)), 9, '1080p adds 3 unlocked, then 2 at each version (half, rounded up): 2 + 3 + 2 + 2');
    refused('Past version 3', contributeStreamingTechEnergy(company, 'PICTURE_1080P', 5), 'MAX_VERSION', company);
    console.log('PASS energy: 5 kept, a press with 2 left refused, FILL puts 2 then 8 (week first, then bank); the full bar waits (no more energy, no cash taken, $1 short refused) → pay $2.4M → 1080p v2; paying before full refused; FILL + pay → v3; ledger + energy log; Playback 23 → 26');

    /* 4K, HDR and Spatial: the plans can offer them now */
    // studios license 4K only with strong DRM (#54): Studio DRM goes with it
    for (const id of ['PICTURE_4K', 'HDR_HDR', 'SOUND_51', 'SOUND_71', 'SOUND_SPATIAL', 'TRUST_STUDIO_DRM'] as StreamingTechId[]) {
        company = done(`Unlock ${id}`, unlockStreamingTech(company, id));
    }
    assert.equal(funded - company.ownedStreamingPlatform.treasuryCash, 108_600_000, '720p → Spatial 3D and Studio DRM cost $102M to unlock, and 1080p\'s versions $2.4M + $4.2M (#84)');
    assert.equal(playback(company), 62, '4K v1 55 + HDR 2 + Spatial 3 = 60, and 1080p\'s two versions past 1 still add 2 under 4K (#85: phones on mobile data)');
    assert.equal(resolveStreamingTechDebt(tree(company)), 24, '4K 5, HDR 3, 5.1 1, 7.1 2, Spatial 3, Studio DRM 1: 9 + 15 = 24 debt');
    const upkeep = getStreamingTechTreeWeeklyUpkeep(tree(company));
    assert.equal(upkeep, 535_000, 'Eight techs bought: $535K a week (Studio DRM $75K)');
    assert.ok(Object.values(tree(company).techs).every(row => !row!.granted), 'Bought techs are never marked given');
    assert.equal(getStreamingTechnologyWeeklyCost(normalizeOwnedStreamingPlatformState(company.ownedStreamingPlatform, company.id)), upkeep, 'The weekly technology bill carries the upkeep');
    const openSave = saveStreamingPricingPlan(company, pricingAsking(company));
    assert.ok(openSave.changed);
    assert.deepEqual(planFeatures(openSave.player), { BASIC: '-', PREMIUM: 'hd', FAMILY: 'uhd+spatial' }, 'After Tech: the plans keep 1080p, 4K HDR and Spatial');
    /* the Tech tab's data */
    const desk = getStreamingTechDesk(company);
    assert.deepEqual(desk.groups.map(group => group.id), ['PICTURE', 'HDR', 'COLOUR', 'SOUND', 'OPTIMISATION', 'STABILIZATION', 'PLAYBACK', 'APPS', 'TRUST', 'SMART_AI', 'FAMILY', 'ADS']);
    assert.deepEqual(desk.groups.map(group => group.accent), Object.values(STREAMING_TECH_GROUP_ACCENT));
    assert.ok(desk.founded && !desk.live, 'A founded company before launch can use the tab');
    assert.deepEqual([desk.owned, desk.total, desk.weeklyUpkeep, desk.energy.step], [17, 76, 535_000, 5]); // #52: the phone app and 12 Playback and Apps steps; #54: DRM, Studio DRM and 8 Trust steps; #56: 3 Sharing control steps; #59: 7 Smart AI steps; #60: 3 Profiles and family steps; #61: the ad server and 6 Ads tech steps
    assert.deepEqual([desk.debt, desk.debtPaydown, desk.loadFactor, desk.costFactor], [24, 1, 1, 1], 'Debt 24 before launch, Monitoring pays 1 a week, H.264 cuts nothing');
    const picture = desk.groups[0];
    assert.deepEqual(picture.steps.map(step => step.state), ['OWNED', 'OWNED', 'OWNED', 'OWNED', 'OPEN', 'LOCKED', 'LOCKED', 'LOCKED']);
    assert.deepEqual([picture.best?.name, picture.best?.version, picture.focus], ['4K', 1, 'PICTURE_8K'], 'Picture: best 4K v1; the next move is 8K');
    const p1080 = picture.steps.find(step => step.id === 'PICTURE_1080P')!;
    assert.deepEqual([p1080.version, p1080.versionName, p1080.nextVersion, p1080.nextEnergy], [3, 'Reference', null, null], '1080p at version 3: nothing more to raise');
    const p4k = picture.steps.find(step => step.id === 'PICTURE_4K')!;
    assert.deepEqual([p4k.versionName, p4k.nextVersion, p4k.nextVersionName, p4k.nextEnergy, p4k.feeds], ['Basic', 2, 'Sharp', 40, ['4K HDR']]); // #72: 4K's versions 40 / 60
    const hdrPro = desk.groups[1].steps.find(step => step.id === 'HDR_PRO')!;
    assert.deepEqual([hdrPro.state, hdrPro.unlockCost, hdrPro.affordable], ['OPEN', 40_000_000, false], 'HDR Pro is open; the $13M left cannot cover it');
    const tenBit = desk.groups[2].steps.find(step => step.id === 'COLOUR_10BIT')!;
    assert.deepEqual([tenBit.state, tenBit.needs, tenBit.needIds], ['OPEN', [], []]);
    const twelveBit = desk.groups[2].steps.find(step => step.id === 'COLOUR_12BIT')!;
    assert.deepEqual([twelveBit.state, twelveBit.needs, twelveBit.needIds], ['LOCKED', ['10-bit', 'HDR Pro'], ['COLOUR_10BIT', 'HDR_PRO']], '12-bit needs a step in another group too');
    assert.ok(desk.groups[3].steps.at(-1)!.sideLine && desk.groups[3].steps.at(-1)!.id === 'SOUND_CLEAR_DIALOGUE', 'Side lines come last');
    const hevc = desk.groups[4].steps.find(step => step.id === 'OPT_HEVC')!;
    assert.deepEqual([hevc.state, hevc.unlockCost, hevc.debtNext, hevc.effect], ['OPEN', 15_000_000, 0, { kind: 'LOAD', now: 1, next: .85, costNow: 1, costNext: .85 }], 'HEVC: −15% load and cost, no debt');
    const autoscaling = desk.groups[5].steps.find(step => step.id === 'STAB_AUTOSCALING')!;
    assert.deepEqual([autoscaling.state, autoscaling.effect], ['OPEN', { kind: 'PAYDOWN', now: 1, next: 2 }], 'Auto-scaling pays 2 a week instead of Monitoring\'s 1');
    assert.equal(desk.groups[0].steps.find(step => step.id === 'PICTURE_8K')!.debtNext, 8, '8K would add 8 debt');
    assert.deepEqual(desk.features.map(feature => `${feature.id}:${feature.allowed}`), ['hd:true', 'uhd:true', 'spatial:true']);
    const freshDesk = getStreamingTechDesk(foundCompany('tech-tree-desk-fresh'));
    assert.deepEqual(freshDesk.features.map(feature => `${feature.id}:${feature.needs}:${feature.needsStep}`),
        ['hd:1080p:PICTURE_1080P', 'uhd:4K, HDR and Studio DRM:PICTURE_4K', 'spatial:Spatial 3D:SOUND_SPATIAL'], 'A new company: each plan chip names what to unlock and jumps to its first step');
    assert.deepEqual(freshDesk.groups.map(group => group.focus), ['PICTURE_720P', 'HDR_HDR', 'COLOUR_8BIT', 'SOUND_51', 'OPT_HEVC', 'STAB_AUTOSCALING', 'PLAY_FAST_START', 'APPS_TV', 'TRUST_STUDIO_DRM', 'AI_BECAUSE', 'FAM_SCREENS', 'ADS_CONTEXTUAL'], 'Each group opens on its next move');
    assert.deepEqual(freshDesk.groups.map(group => group.best?.name ?? null), ['480p', null, '8-bit', 'Stereo', 'H.264', 'Monitoring', null, 'Phone and web apps', 'DRM', 'Trending rows', null, 'Basic ad server'], 'No HDR yet, and a standard player');
    console.log(`PASS desk: ${desk.groups.length} groups, ${desk.owned}/${desk.total} owned, debt ${desk.debt} (−${desk.debtPaydown} a week), Picture opens on 8K, 12-bit needs 10-bit and HDR Pro, HEVC −15% load, a new company's chips point at 1080p / 4K / Spatial 3D`);

    /* the viewer meets it: plan, menu, badges, "Now in 4K" */
    const viewerCompany = openSave.player;
    const basicView = getStreamingViewerQuality(viewerCompany.ownedStreamingPlatform, weekOf(viewerCompany), []);
    assert.deepEqual([basicView.planName, basicView.planMax, basicView.badges], ['Basic', '720p', []], 'No households yet: the first plan, Basic, streams 720p');
    assert.deepEqual(basicView.menu.map(option => `${option.label}:${option.state}`), ['4K:UPGRADE', '1080p:UPGRADE', '720p:AVAILABLE', '480p:AVAILABLE'], 'Dearer pictures are greyed with Upgrade plan');
    assert.equal(basicView.nowIn, 'Now in 4K', '4K arrived this week and a plan streams it');
    const premiumView = getStreamingViewerQuality(viewerCompany.ownedStreamingPlatform, weekOf(viewerCompany), [
        { planId: 'FAMILY', planName: 'Premium', households: 10, monthlyHouseholds: 10, annualHouseholds: 0, effectiveMonthlyPrice: 19.99, monthlySubscriptionRevenue: 0 },
    ]);
    assert.deepEqual([premiumView.planName, premiumView.planMax, premiumView.badges], ['Premium', '4K', ['4K', 'HDR', 'Spatial audio']], 'On Premium: 4K, HDR and Spatial audio');
    assert.ok(premiumView.menu.every(option => option.state === 'AVAILABLE'));
    assert.equal(getStreamingViewerQuality(viewerCompany.ownedStreamingPlatform, weekOf(viewerCompany) + 2, []).nowIn, null, '"Now in 4K" shows for two weeks');
    console.log(`PASS viewer: Basic streams ${basicView.planMax} (4K and 1080p greyed "Upgrade plan"), Premium ${premiumView.planMax} with ${premiumView.badges.join(' · ')}; "${basicView.nowIn}" for two weeks`);

    // The bridge never lowers a level raised elsewhere.
    const high = { ...company, ownedStreamingPlatform: { ...company.ownedStreamingPlatform, technologyLevels: { ...company.ownedStreamingPlatform.technologyLevels, PLAYBACK_QUALITY: 90 } } };
    assert.equal(playback(done('Unlock Clear dialogue', unlockStreamingTech(high, 'SOUND_CLEAR_DIALOGUE'))), 90, 'The bridge never lowers Playback Quality');
    console.log(`PASS new career: 4K, HDR, Spatial and Studio DRM unlocked (total $102M, upkeep $${fmt(upkeep)} a week in the technology bill); plans before: none, after: Standard hd, Premium uhd+spatial`);

    /* ── the developer test company ── */
    const base = await buildStreamingFullPlatformQa(fresh('tech-tree-audit'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const baseline = { PLAYBACK_QUALITY: 58, DELIVERY_CAPACITY: 45, RELIABILITY: 42, PRODUCT_EXPERIENCE: 30, SECURITY: 45, DATA_RECOMMENDATIONS: 24, ADVERTISING_COMMERCE: 34 };
    assert.deepEqual(owned(tree(base)), owned(convertStreamingTechTreeFromLevels(baseline)),
        'It owns what Playback 58, Delivery 45, Reliability 42, (#52) Product Experience 30, (#54) Security 45, (#59) Recommendations 24 and (#61) Commerce 34 stand for');
    assert.ok(['OPT_HEVC', 'OPT_AV1', 'STAB_AUTOSCALING', 'STAB_REDUNDANCY', 'AI_BECAUSE', 'AI_ARTWORK'].every(id => tree(base).techs[id as StreamingTechId]?.granted),
        'HEVC, AV1, Auto-scaling, Redundancy, Because you watched and Personal artwork are given');
    assert.equal(getStreamingTechTreeWeeklyUpkeep(tree(base)), 0, 'Its granted techs carry no upkeep');
    assert.deepEqual(planFeatures(base), { BASIC: '-', PREMIUM: 'hd', FAMILY: 'uhd+spatial' }, 'Its plans keep hd, uhd and spatial');
    assert.equal(JSON.stringify(normalizeOwnedStreamingPlatformState(base.ownedStreamingPlatform, base.id)), JSON.stringify(normalizeOwnedStreamingPlatformState(normalizeOwnedStreamingPlatformState(base.ownedStreamingPlatform, base.id), base.id)), 'Normalising the company is idempotent');

    /* one more tech is billed in the week */
    const richer = withTreasury(base, Math.max(base.ownedStreamingPlatform.treasuryCash, 200_000_000));
    const with8k = done('Unlock 8K', unlockStreamingTech(richer, 'PICTURE_8K'));
    const weekA = (await processGameWeek(richer)).player;
    const weekB = (await processGameWeek(with8k)).player;
    const billA = weekA.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.technologyCampusCost || 0;
    const billB = weekB.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.technologyCampusCost || 0;
    assert.equal(billB - billA, 300_000, '8K adds its $300K upkeep to the week');
    console.log(`PASS weekly bill: technology $${fmt(billA)} → $${fmt(billB)} with 8K (+$300K)`);

    /* a higher version makes the plan offering it more appealing */
    let sharper = withEnergy(base, 100, 0);
    sharper = done('4K to version 2', completeStreamingTechVersion(done('4K energy', contributeStreamingTechEnergy(sharper, 'PICTURE_4K', 'FILL')), 'PICTURE_4K'));
    sharper = done('HDR to version 2', completeStreamingTechVersion(done('HDR energy', contributeStreamingTechEnergy(sharper, 'HDR_HDR', 'FILL')), 'HDR_HDR'));
    assert.equal(streamingTechFeatureQuality(tree(sharper), 'uhd'), 1.2);
    assert.equal(streamingTechFeatureQuality(tree(sharper), 'hd'), 1, '1080p is still version 1');
    const plansA = Object.fromEntries(playerPlans(base).map(plan => [plan.id, plan.appealIndex]));
    const plansB = Object.fromEntries(playerPlans(sharper).map(plan => [plan.id, plan.appealIndex]));
    assert.equal(Math.round((plansB.FAMILY - plansA.FAMILY) * 100) / 100, 2.4, 'Premium (4K HDR) gains 12 × 0.2');
    assert.deepEqual([plansB.BASIC, plansB.PREMIUM], [plansA.BASIC, plansA.PREMIUM], 'Plans without 4K are unchanged');
    console.log(`PASS appeal: 4K + HDR at version 2 → Premium ${plansA.FAMILY} → ${plansB.FAMILY}; Basic ${plansA.BASIC} and Standard ${plansA.PREMIUM} unchanged`);

    /* Phase 1 bugs (#39): public trust, the TECH DEBT figure */
    assert.ok(base.ownedStreamingPlatform.milestoneKeys.includes(STREAMING_PUBLIC_TRUST_RESTORED_KEY), 'A company built with the fix is marked at its first close');
    assert.ok(base.ownedStreamingPlatform.crisisSecurity.publicTrust > 40, `Trust is no longer reset each week (${base.ownedStreamingPlatform.crisisSecurity.publicTrust.toFixed(2)})`);
    const buggedRoot = structuredClone(base.ownedStreamingPlatform) as unknown as Record<string, any>;
    buggedRoot.milestoneKeys = buggedRoot.milestoneKeys.filter((key: string) => key !== STREAMING_PUBLIC_TRUST_RESTORED_KEY);
    buggedRoot.crisisSecurity.publicTrust = 0.35;
    const bugged = { ...base, ownedStreamingPlatform: buggedRoot } as unknown as Player;
    const restoredWeek = (await processGameWeek(bugged)).player;
    const restoredTrust = restoredWeek.ownedStreamingPlatform.crisisSecurity.publicTrust;
    assert.ok(restoredTrust > 55 && restoredTrust < 90, `A save stuck at 0.35 gets the starting 72 back at its next close (${restoredTrust.toFixed(2)})`);
    assert.ok(restoredWeek.ownedStreamingPlatform.milestoneKeys.includes(STREAMING_PUBLIC_TRUST_RESTORED_KEY), '…once: the save is marked');
    const nextWeek = (await processGameWeek(restoredWeek)).player;
    const drift = nextWeek.ownedStreamingPlatform.crisisSecurity.publicTrust - restoredTrust;
    assert.ok(Math.abs(drift) < 15, `The week after moves by its events and ±0.35, not back to 0.35 (${drift.toFixed(2)})`);
    const debtShown = createCanonicalNetworkState(base).technicalDebt;
    assert.equal(debtShown, Math.min(100, Math.round(resolveStreamingPlatformTechDebt(base.ownedStreamingPlatform))), 'TECH DEBT shows the platform\'s debt (the infrastructure\'s plus the tree\'s), not projects again');
    const doubled = Math.min(100, Math.round((base.ownedStreamingPlatform.infrastructureSetup?.technicalDebt ?? 0) + base.ownedStreamingPlatform.technologyProjects.reduce((sum, item) => sum + item.technicalDebtDelta, 0)));
    console.log(`PASS bugs: trust ${base.ownedStreamingPlatform.crisisSecurity.publicTrust.toFixed(1)} in the test company; a save stuck at 0.35 → ${restoredTrust.toFixed(1)} at its next close, then ${drift >= 0 ? '+' : ''}${drift.toFixed(2)}; TECH DEBT ${debtShown} (was shown as ${doubled})`);

    /* the viewer app of the test company: progress bars and Leaving Soon (#38) */
    const app = createCanonicalViewerState(base);
    const withProgress = app.titles.filter(title => title.progress !== undefined);
    assert.ok(withProgress.length > 0 && withProgress.every(title => title.progress! > 0.01 && title.progress! < 0.99), 'Progress is a share between 0 and 1, never an empty or full bar');
    assert.ok(new Set(withProgress.map(title => Math.round(title.progress! * 100))).size > 1, 'Progress bars differ by title');
    assert.ok(app.titles.every(title => title.leavingInWeeks === undefined || title.leavingInWeeks <= 8), 'Leaving Soon lists only licences ending within 8 weeks');
    const permanentIds = new Set(base.ownedStreamingPlatform.catalogLicenses.filter(row => row.expiresAtAbsoluteWeek >= Number.MAX_SAFE_INTEGER).map(row => row.sourceProjectId));
    assert.ok(app.titles.filter(title => permanentIds.has(title.id)).every(title => title.leavingInWeeks === undefined), 'A permanent licence never leaves');
    assert.ok(app.quality && app.quality.menu.length > 0, 'The app carries the quality model');
    console.log(`PASS viewer app: ${withProgress.length} titles with progress (${Math.min(...withProgress.map(t => Math.round(t.progress! * 100)))}–${Math.max(...withProgress.map(t => Math.round(t.progress! * 100)))}%), ${app.titles.filter(t => t.leavingInWeeks !== undefined).length} leaving within 8 weeks, ${permanentIds.size} permanent licences never leaving; plan ${app.quality!.planName} streams ${app.quality!.planMax}`);

    /* the old research flow is retired (#36) */
    for (const id of ['edge-orchestration', 'kids-mode', 'adaptive-startup', 'giga-campus', 'fibre-coherent-dwdm', 'zero-trust-sessions']) {
        const attempt = startStreamingResearchProgram(base, id, 'BALANCED');
        assert.ok(!attempt.changed && attempt.reason === STREAMING_RESEARCH_RETIRED_REASON, `${id}: no new research`);
    }
    assert.ok(/Content Desk/.test(startStreamingResearchProgram(base, 'subtitle-operations-l1', 'BALANCED').reason || ''), 'Localization research still points to the Content Desk');
    const campusNodes = getStreamingTechnologyCampus(base).facilities.flatMap(facility => facility.nodes);
    assert.ok(campusNodes.every(node => !node.blockers.some(blocker => /research and IP clearance/.test(blocker))), 'No engineering build waits for research');
    const playbackNodes = campusNodes.filter(node => node.definition.branch === 'PLAYBACK_QUALITY');
    assert.ok(playbackNodes.filter(node => node.status !== 'INSTALLED').every(node => node.blockers.includes(STREAMING_PLAYBACK_MOVED_BLOCKER)), 'Playback nodes point to Tech');
    const unblocked = campusNodes.filter(node => ['delivery_capacity-2', 'security-1', 'content_operations-2'].includes(node.definition.id));
    assert.ok(unblocked.length === 3 && unblocked.every(node => node.status === 'INSTALLED' || node.blockers.every(blocker => !/research/i.test(blocker))), 'Nodes that used to need research do not any more');
    // Research already done for a Playback node can still be installed there (its level then grants the techs).
    const readyRoot = structuredClone(base.ownedStreamingPlatform) as unknown as Record<string, any>;
    readyRoot.technologyLevels.PLAYBACK_QUALITY = 0;
    readyRoot.researchPrograms = [...readyRoot.researchPrograms, {
        id: 'audit-adaptive', idempotencyKey: 'research-program:adaptive-startup', definitionId: 'adaptive-startup', title: 'Adaptive Startup',
        category: 'STREAMING_EXPERIENCE', stage: 'INSTALLING', buildMode: 'BALANCED', ipStrategy: 'LICENSE', researchCost: 1, patentCost: 1, installationCost: 1,
        weeklyOperatingCost: 1, licenseWeeklyCost: 1, staffRequired: 1, researchWeeks: 1, prototypeWeeks: 1, testWeeks: 1, installationWeeks: 1,
        startedAtAbsoluteWeek: 1, stageStartedAtAbsoluteWeek: 1, stageReadyAtAbsoluteWeek: 2, installationTargetType: 'TECHNOLOGY_PROJECT',
        installationTargetId: null, installationTargetLabel: null, rivalInterestPercent: 0, completedAtAbsoluteWeek: null,
    }];
    const readyPlayer = { ...base, ownedStreamingPlatform: readyRoot } as unknown as Player;
    const firstPlayback = getStreamingTechnologyCampus(readyPlayer).facilities.find(facility => facility.definition.id === 'PLAYBACK_QUALITY')!.nodes[0];
    assert.ok(!firstPlayback.blockers.includes(STREAMING_PLAYBACK_MOVED_BLOCKER), `Playback node 1 with its research installing is not sent to Tech (${firstPlayback.blockers.join('; ') || 'no blockers'})`);
    const kids = getStreamingProductSuite(base).lines.find(line => line.definition.id === 'KIDS')!;
    assert.ok(!kids.blockers.some(blocker => /research/i.test(blocker)), `Kids Mode needs no research (${kids.blockers.join('; ') || 'no blockers'})`);
    console.log(`PASS old research retired: 6 programmes refused, ${campusNodes.length} campus nodes with no research gate, ${playbackNodes.length} Playback nodes point to Tech (one with research installing stays buildable), Kids needs no research`);

    /* rivals offer only what their tech allows (#37) */
    assert.deepEqual(gateRivalStreamingPlanFeatures(resolveRivalStreamingTechTree(72), ['uhd', 'spatial', 'streams4', 'noads']), ['hd', 'spatial', 'streams4', 'noads'], 'Strength 72: no 4K HDR, so its premium tier streams in HD');
    assert.deepEqual(gateRivalStreamingPlanFeatures(resolveRivalStreamingTechTree(40), ['hd', 'catalogue']), ['catalogue'], 'Strength 40 (Playback 15): no HD yet');
    assert.deepEqual(gateRivalStreamingPlanFeatures(resolveRivalStreamingTechTree(40, 45), ['uhd', 'hd', 'spatial']), ['hd', 'spatial'], 'Its own research counts: Playback 45 brings HD and Spatial');
    const week = weekOf(base);
    const ecosystem = normalizeStreamingPlatformEcosystem(base.world.streamingPlatformEcosystem, week);
    const rivalOffers = getWorldStreamingOffers(base, week).offers.filter(offer => !offer.isPlayer);
    assert.ok(rivalOffers.length >= 10, 'The world has its rivals');
    const gated = ['hd', 'uhd', 'spatial'];
    let withUhd = 0;
    const hdOnly: string[] = [];
    rivalOffers.forEach(offer => {
        const operator = ecosystem.operators[offer.platformId]!;
        const ai = operator.corePlatformId ? base.world.platforms?.[operator.corePlatformId]?.ai : null;
        const rivalTree = resolveRivalStreamingTechTree(operator.technology, ai?.capabilities.technologyLevels.PLAYBACK_QUALITY);
        offer.plans.forEach(plan => plan.featureIds.filter(id => gated.includes(id)).forEach(id => {
            assert.ok(streamingTechFeatureAllowed(rivalTree, id), `${offer.name} ${plan.name} offers ${id} only if it owns it`);
        }));
        if (offer.plans.some(plan => plan.featureIds.includes('uhd'))) withUhd += 1;
        if (streamingTechFeatureAllowed(rivalTree, 'hd') && !streamingTechFeatureAllowed(rivalTree, 'uhd')) {
            // (a rival selling no subscription, ads or store only, has no plans at all)
            assert.ok(offer.plans.every(plan => !plan.featureIds.includes('uhd')) && (!offer.plans.length || offer.plans.some(plan => plan.featureIds.includes('hd'))), `${offer.name} (${operator.technology}) offers HD, not 4K HDR: ${offer.plans.map(plan => `${plan.id}[${plan.featureIds.join(',')}]`).join(' ')}`);
            hdOnly.push(`${offer.name} ${Math.round(operator.technology)}`);
        }
    });
    const netflix = rivalOffers.find(offer => offer.platformId === 'NETFLIX');
    assert.ok(netflix && netflix.plans.some(plan => plan.featureIds.includes('uhd')), 'Netflix offers 4K HDR');
    console.log(`PASS rivals: ${rivalOffers.length} rival offers, every 1080p / 4K HDR / Spatial feature backed by their tech; ${withUhd} offer 4K HDR (Netflix among them); HD without 4K: ${hdOnly.join(', ') || 'none'}`);

    /* older saves: the company without its tree */
    const legacyRoot = structuredClone(base.ownedStreamingPlatform) as unknown as Record<string, any>;
    delete legacyRoot.techTree;
    const firstLoad = normalizeOwnedStreamingPlatformState(structuredClone(legacyRoot), base.id);
    assert.equal(JSON.stringify(normalizeOwnedStreamingPlatformState(firstLoad, base.id)), JSON.stringify(firstLoad), 'The first load of an old save is already stable');
    const legacyPlayer = { ...base, ownedStreamingPlatform: legacyRoot } as unknown as Player;
    // Loaded the way a save is: from its JSON (the test company's pending life events can hold
    // functions, which a save never carries and structuredClone refuses).
    const loaded = migratePlayerSave(JSON.parse(JSON.stringify(legacyPlayer)));
    const loadedPlatform = normalizeOwnedStreamingPlatformState(loaded.ownedStreamingPlatform, loaded.id);
    assert.deepEqual(owned(loadedPlatform.techTree!), owned(convertStreamingTechTreeFromLevels(base.ownedStreamingPlatform.technologyLevels)), 'An old save loads with the techs its levels stand for');
    assert.ok(['PICTURE_4K', 'OPT_AV1', 'STAB_REDUNDANCY'].every(id => loadedPlatform.techTree!.techs[id as StreamingTechId]?.granted), '…4K from Playback, AV1 from Delivery, Redundancy from Reliability, all given');
    assert.equal(getStreamingTechTreeWeeklyUpkeep(loadedPlatform.techTree), 0, '…with no upkeep');
    assert.equal(loadedPlatform.techTree!.convertedFromLegacy, true);
    assert.deepEqual([loaded.money, loaded.age, loaded.currentWeek], [base.money, base.age, base.currentWeek], 'Loading never moves money or time');
    assert.deepEqual([loadedPlatform.treasuryCash, loadedPlatform.lastProcessedAbsoluteWeek], [base.ownedStreamingPlatform.treasuryCash, base.ownedStreamingPlatform.lastProcessedAbsoluteWeek], '…nor the treasury or the week');
    assert.equal(loadedPlatform.technologyLevels.PLAYBACK_QUALITY, 58, `Loading does not raise Playback Quality (the tree stands for ${deriveStreamingTechPlaybackLevel(loadedPlatform.techTree)})`);
    assert.equal(JSON.stringify(normalizeOwnedStreamingPlatformState(loadedPlatform, base.id)), JSON.stringify(loadedPlatform), 'The conversion is idempotent');
    console.log('PASS older saves: the test company without a tree loads with 720p → 4K, HDR, 10-bit and Spatial, HEVC and AV1, Auto-scaling and Redundancy; money, time and Playback 58 unchanged; idempotent');

    /* ── Optimisation, Stabilization and tech debt (#41) ── */
    const at = (techs: Record<string, number>) => normalizeStreamingTechTreeState({ schemaVersion: 2, techs: Object.fromEntries(Object.entries(techs)
        .map(([id, level]) => [id, { version: level, progress: 0, unlockedAtAbsoluteWeek: 5, versionReachedAtAbsoluteWeek: 5 }])) }, {});
    const definition = (id: string) => STREAMING_TECH_DEFINITIONS.find(item => item.id === id)!;
    assert.deepEqual(['OPT_HEVC', 'OPT_AV1', 'OPT_VVC', 'OPT_NEURAL'].map(id => [definition(id).unlockCost, ...definition(id).versionEnergy]),
        [[15_000_000, 40, 60], [50_000_000, 60, 80], [150_000_000, 200, 240], [400_000_000, 420, 540]], 'Codec prices and energy as the plan sets them (§4.2, #72)');
    assert.equal(streamingTechLoadFactor(at({})), 1, 'H.264 alone cuts nothing');
    assert.equal(streamingTechLoadFactor(at({ OPT_HEVC: 1 })), .85);
    assert.ok(Math.abs(streamingTechLoadFactor(at({ OPT_HEVC: 3, OPT_AV1: 2 })) - .6 * .97) < 1e-9, 'The best codec owned counts in full; HEVC\'s two versions past 1 still cut 3% (#85: TVs that cannot play AV1)');
    const allOptimised = at(Object.fromEntries(getStreamingTechGroupLadder('OPTIMISATION').map(item => [item.id, 3])));
    const fullLoad = streamingTechLoadFactor(allOptimised);
    const fullCost = streamingTechCostFactor(allOptimised);
    // #85: the four codecs below Neural at version 3 still cut 1.5% a version past 1 (8 × 1.5% = 12%) for the TVs that play only them
    assert.ok(fullLoad > .125 && fullLoad < .145 && fullCost > .11 && fullCost < .13, `Fully optimised: load ×${fullLoad.toFixed(3)}, cost ×${fullCost.toFixed(3)} (the plan's about ×0.14, less 12% for the older codecs' versions)`);
    assert.deepEqual([streamingTechDebtPaydown(at({})), streamingTechDebtPaydown(at({ STAB_AUTOSCALING: 1 })), streamingTechDebtPaydown(at({ STAB_SELF_HEALING: 3, STAB_LOAD_TESTING: 3 }))],
        [1, 2, 11], 'Monitoring pays 1 a week, Auto-scaling 2; Self-healing v3 and Load testing v3 pay 11');
    assert.deepEqual([streamingTechOverloadFactor(at({})), streamingTechOverloadFactor(at({ STAB_LOAD_TESTING: 3 }))], [1, .65], 'Load testing v3 leaves 65% of an overload\'s harm');
    assert.deepEqual([deriveStreamingTechEngineLevel(at({ OPT_HEVC: 1 }), 'DELIVERY_CAPACITY'), deriveStreamingTechEngineLevel(at({ OPT_AV1: 1 }), 'DELIVERY_CAPACITY'),
        deriveStreamingTechEngineLevel(at({ STAB_AUTOSCALING: 1 }), 'RELIABILITY'), deriveStreamingTechEngineLevel(at({ STAB_REDUNDANCY: 1 }), 'RELIABILITY')],
        [20, 40, 10, 35], 'HEVC = Delivery 20, AV1 = 40; Auto-scaling = Reliability 10 (two screens), Redundancy = 35 (four)');
    assert.deepEqual([streamingTechDebtFor(definition('PICTURE_4K'), 1), streamingTechDebtFor(definition('PICTURE_4K'), 2), streamingTechDebtFor(definition('OPT_AV1'), 1)], [5, 3, 0],
        '4K adds 5 debt, 3 at each version; Optimisation adds none');
    // Old saves: the levels they reached become Optimisation and Stabilization steps, never a futuristic one.
    const levelled = convertStreamingTechTreeFromLevels({ PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 100, RELIABILITY: 100 });
    assert.deepEqual(owned(levelled).filter(id => /^(OPT|STAB)_/.test(id)), ['OPT_AV1', 'OPT_H264', 'OPT_HEVC', 'OPT_VVC', 'STAB_AUTOSCALING', 'STAB_CHAOS', 'STAB_MONITORING', 'STAB_REDUNDANCY'],
        'Delivery and Reliability 100: up to the next-gen codec and Chaos testing, no Neural codec or Self-healing');
    const legacyLevels = base.ownedStreamingPlatform.technologyLevels;
    assert.ok(deriveStreamingTechEngineLevel(convertStreamingTechTreeFromLevels(legacyLevels), 'DELIVERY_CAPACITY') <= legacyLevels.DELIVERY_CAPACITY
        && deriveStreamingTechEngineLevel(convertStreamingTechTreeFromLevels(legacyLevels), 'RELIABILITY') <= legacyLevels.RELIABILITY, 'What is given never stands above the level it came from');
    // A tree saved before Optimisation and Stabilization (schema 1) is given them once, from its levels.
    const schemaOneRoot = structuredClone(base.ownedStreamingPlatform) as unknown as Record<string, any>;
    schemaOneRoot.techTree = { schemaVersion: 1, convertedFromLegacy: true, techs: Object.fromEntries(Object.entries(schemaOneRoot.techTree.techs).filter(([id]) => !/^(OPT|STAB)_/.test(id))) };
    const joined = normalizeOwnedStreamingPlatformState(structuredClone(schemaOneRoot), base.id);
    assert.deepEqual([joined.techTree!.schemaVersion, owned(joined.techTree!)], [8, owned(tree(base))], 'A schema-1 tree joins Optimisation and Stabilization from its Delivery and Reliability levels (and, since #52, Playback and Apps from Product Experience)');
    assert.equal(getStreamingTechTreeWeeklyUpkeep(joined.techTree), getStreamingTechTreeWeeklyUpkeep(tree(base)), '…with no upkeep added');
    assert.deepEqual([joined.treasuryCash, joined.technologyLevels], [base.ownedStreamingPlatform.treasuryCash, base.ownedStreamingPlatform.technologyLevels], '…and no money or level moved');
    assert.equal(JSON.stringify(normalizeOwnedStreamingPlatformState(joined, base.id)), JSON.stringify(joined), '…idempotently');
    const sold = { ...joined, techTree: { ...joined.techTree!, techs: Object.fromEntries(Object.entries(joined.techTree!.techs).filter(([id]) => id !== 'OPT_AV1')) } };
    assert.ok(!normalizeOwnedStreamingPlatformState(sold, base.id).techTree!.techs.OPT_AV1, 'A schema-2 tree is never given them again');

    // A new career: codecs raise Delivery, Stabilization raises Reliability; the screens plans can offer come
    // from Profiles and screens since #60 (Reliability 10 and 35 opened them before).
    let builder = fund(foundCompany('tech-tree-phase2'), 100_000_000, 'tech-tree-audit:phase2');
    const deliveryBefore = builder.ownedStreamingPlatform.technologyLevels.DELIVERY_CAPACITY;
    builder = done('Unlock HEVC', unlockStreamingTech(builder, 'OPT_HEVC'));
    assert.deepEqual([builder.ownedStreamingPlatform.technologyLevels.DELIVERY_CAPACITY, resolveStreamingTechDebt(tree(builder)), getStreamingTechTreeWeeklyUpkeep(tree(builder))],
        [Math.max(20, deliveryBefore), 0, 75_000], 'HEVC raises Delivery to 20, adds no debt and $75K upkeep');
    const screensAsking = (player: Player): OwnedStreamingPricingConfiguration => {
        const asked = pricingAsking(player);
        return { ...asked, plans: asked.plans.map((plan, index) => ({ ...plan, featureIds: [...plan.featureIds, index === 2 ? 'streams4' : 'streams2'] })) };
    };
    const screens = (player: Player) => player.ownedStreamingPlatform.serviceConfiguration.pricing.plans.map(plan => plan.featureIds.filter(id => id.startsWith('streams')).join('+') || '-');
    assert.deepEqual(screens(saveStreamingPricingPlan(builder, screensAsking(builder)).player), ['-', '-', '-'], 'Before Profiles and screens: no plan offers more screens');
    builder = done('Unlock Auto-scaling', unlockStreamingTech(builder, 'STAB_AUTOSCALING'));
    assert.equal(builder.ownedStreamingPlatform.technologyLevels.RELIABILITY >= 10, true, 'Auto-scaling raises Reliability to 10');
    assert.deepEqual(screens(saveStreamingPricingPlan(builder, screensAsking(builder)).player), ['-', '-', '-'], 'Auto-scaling no longer opens screens (#60)');
    builder = done('Unlock Profiles and screens', unlockStreamingTech(builder, 'FAM_SCREENS'));
    assert.deepEqual(screens(saveStreamingPricingPlan(builder, screensAsking(builder)).player), ['streams2', 'streams2', '-'], 'Profiles and screens: two screens');
    builder = done('Profiles and screens to version 2', completeStreamingTechVersion(done('Profiles and screens energy', contributeStreamingTechEnergy(withEnergy(builder, 100, 0), 'FAM_SCREENS', 'FILL')), 'FAM_SCREENS'));
    assert.deepEqual(screens(saveStreamingPricingPlan(builder, screensAsking(builder)).player), ['streams2', 'streams2', 'streams4'], 'Version 2: four screens');
    builder = done('Unlock Redundancy', unlockStreamingTech(builder, 'STAB_REDUNDANCY'));
    assert.equal(getStreamingTechDesk(builder).debtPaydown, 3, 'Redundancy pays 3 a week');
    const highDelivery = done('Unlock Smart encoding on the test company', unlockStreamingTech(richer, 'OPT_SMART_ENCODING'));
    assert.equal(highDelivery.ownedStreamingPlatform.technologyLevels.DELIVERY_CAPACITY, richer.ownedStreamingPlatform.technologyLevels.DELIVERY_CAPACITY, 'The bridge never lowers Delivery (45 stays)');

    // The weekly close: Redundancy (the test company's best) pays 3 a week, the tree's own debt first.
    const owing = { ...richer, ownedStreamingPlatform: { ...richer.ownedStreamingPlatform, infrastructureSetup: { ...richer.ownedStreamingPlatform.infrastructureSetup!, technicalDebt: 10 } } };
    const owing8k = done('Unlock 8K with campus debt', unlockStreamingTech(owing, 'PICTURE_8K'));
    const paidPlain = (await processGameWeek(owing)).player;
    const paid8k = (await processGameWeek(owing8k)).player;
    const debts = (player: Player) => [resolveStreamingTechDebt(tree(player)), player.ownedStreamingPlatform.infrastructureSetup!.technicalDebt];
    assert.deepEqual([debts(owing8k), debts(paid8k)], [[8, 10], [5, 10]], '8K adds 8 debt; the week pays 3 of the tree\'s, the campus debt waits');
    assert.deepEqual(debts(paidPlain), [0, 7], 'With no tree debt the 3 go to the campus debt');
    assert.equal(tree(paid8k).debtPaidAtAbsoluteWeek, weekOf(paid8k), 'The paid week is stamped');
    const again = payDownStreamingTechDebt(tree(paid8k), 10, weekOf(paid8k));
    assert.deepEqual([again.paid, again.tree, again.infrastructureDebt], [0, tree(paid8k), 10], 'Paying the same week again pays nothing');
    assert.deepEqual(debts((await processGameWeek(paid8k)).player), [2, 10], 'The next week pays 3 more');
    assert.equal(createCanonicalNetworkState(paid8k).technicalDebt, 15, 'The Platform room shows the campus debt plus the tree\'s');
    assert.equal(getStreamingTechDesk(paid8k).debt, 15, '…and so does the Tech tab');
    // Debt costs playback: 20 more debt is 0.7 points of playback success (20 × 0.035), the same week otherwise
    // (from 20 to 40, as the debt-free week sits at the 99.98 ceiling).
    const weekWithDebt = async (debt: number) => (await processGameWeek({ ...richer, ownedStreamingPlatform: { ...richer.ownedStreamingPlatform, techTree: { ...tree(richer), debt } } })).player;
    const week20 = await weekWithDebt(20);
    const week40 = await weekWithDebt(40);
    const playbackA = week20.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.playbackSuccessRate;
    const playbackDebt = week40.ownedStreamingPlatform.weeklyHistory.at(-1)!.operations!.playbackSuccessRate;
    assert.ok(Math.abs((playbackA - playbackDebt) - .7) < .02, `20 more debt costs 0.7 playback (${playbackA} → ${playbackDebt})`);
    assert.ok(week40.ownedStreamingPlatform.metrics.technologyHealth < week20.ownedStreamingPlatform.metrics.technologyHealth, 'and technology health');
    // The Reliability campus line moved to Stabilization.
    const reliabilityNodes = getStreamingTechnologyCampus(base).facilities.find(facility => facility.definition.id === 'RELIABILITY')!.nodes;
    assert.ok(reliabilityNodes.filter(node => node.status !== 'INSTALLED' && node.status !== 'BUILDING').every(node => node.blockers.includes(STREAMING_RELIABILITY_MOVED_BLOCKER)), 'Reliability nodes point to Stabilization');
    console.log(`PASS optimisation and debt: codecs at the plan's prices; fully optimised load ×${fullLoad.toFixed(2)} cost ×${fullCost.toFixed(2)}; HEVC → Delivery 20; Profiles and screens v1 / v2 → two / four screens (no longer Auto-scaling, #60); debt 8 → 5 → 2 while the campus's 10 waits (10 → 7 without tree debt); 20 debt = −${(playbackA - playbackDebt).toFixed(2)} playback; schema-1 trees join once; Reliability campus → Stabilization`);

    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
