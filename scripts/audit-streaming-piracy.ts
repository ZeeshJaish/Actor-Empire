/** Piracy, Phase 3 #55 (codex-handoff/plans/platform-tech-plan.md §4.1 row 8, Content protection;
 *  Zeesh's piracy idea: a title leaks to pirate sites as a STATUS incident with takedowns, energy
 *  quick, cash slower, waiting lets the views keep leaking; better anti-piracy tech, less piracy).
 *  Checks:
 *  - the catalogue: the Takedown network and AI hunter shorten a takedown; Content protection's
 *    share of home piracy stopped (1 − its leak factor);
 *  - a takedown's answers and its weeks: Take it down now, File takedowns (half the weeks with the
 *    Takedown network), Let it run; anything else keeps its weeks; the words;
 *  - a leak nobody takes down fades sooner with the Takedown network;
 *  - a leak names a title watched this week (new releases three times as likely), reaches the
 *    share of its viewers who take the pirated copy, and keeps the title in the save;
 *  - its harm: the viewers it reaches watch the pirated copy (viewing 0.35, churn 0.02);
 *  - STATUS: "Title piracy", worded as a takedown, its weeks after the Takedown network;
 *  - the world offer: Content protection past DRM sets protectionIndex (DRM alone: not set);
 *  - one real week, A/B: fewer people pirate the player's titles, more homes sign up;
 *  - the Tech tab: "Leaks and piracy N% lower", "Takedowns take N% less time";
 *  - #57, a free tier draws pirates in (§1: "a cheap or free tier also draws pirates in"): homes left
 *    outside every service come to the player's free tier by their piracy tendency (paying homes
 *    untouched, every home still counted once), and fewer people pirate the player's titles. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type OwnedStreamingWeeklySnapshot, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    getStreamingTechGroupLadder, normalizeStreamingTechTreeState, streamingTechPiracyProtection, streamingTechTakedownSpeed, streamingTechTrustMain,
} from '../services/streamingTechTreeCatalogue';
import { commitStreamingCrisisSecurityWeek, getStreamingLeakCopy, pickStreamingLeakedTitle } from '../services/streamingCrisisSecurity';
import { STREAMING_INCIDENT_HARM, getStreamingIncidentHarm } from '../services/streamingIncidentHarm';
import { getStreamingIncidentRepairOptions, repairStreamingIncident, streamingIncidentSpeed, streamingIncidentWaitEndsAt } from '../services/streamingIncidentRepair';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { allocateStreamingAudienceChoice } from '../services/worldEconomy/worldStreamingAudienceChoice';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { STREAMING_FREE_TIER_PIRACY, streamingFreeTierPiracyCut } from '../services/streamingPlanOffer';
import type { OwnedStreamingPlanOffer, OwnedStreamingPricingConfiguration } from '../types';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Piracy Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const withoutIds = (tree: OwnedStreamingTechTreeState, ids: string[]): OwnedStreamingTechTreeState => ({
    ...tree, techs: Object.fromEntries(Object.entries(tree.techs).filter(([id]) => !ids.includes(id))) as OwnedStreamingTechTreeState['techs'],
});
const pct = (value: number) => `${Math.round(value * 100)}%`;

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const ladder = getStreamingTechGroupLadder('TRUST');
    assert.deepEqual(ladder.filter(item => item.takedownFactor).map(item => [item.id, item.takedownFactor]), [['TRUST_TAKEDOWN', [.5, .45, .4]], ['TRUST_AI_HUNTER', [.3, .25, .2]]]);
    const studio = withTechs(bare, [['TRUST_STUDIO_DRM', 1]]);
    const watermark = withTechs(studio, [['TRUST_WATERMARK', 2]]);
    const takedown = withTechs(watermark, [['TRUST_TAKEDOWN', 1]]);
    const hunter = withTechs(takedown, [['TRUST_AI_HUNTER', 3]]);
    assert.deepEqual([bare, watermark, takedown, withTechs(takedown, [['TRUST_TAKEDOWN', 3]]), hunter].map(streamingTechTakedownSpeed), [1, 1, .5, .4, .2],
        'Takedown weeks: DRM and Watermarking ×1, the Takedown network ×0.5 (×0.4 at version 3), the AI hunter v3 ×0.2');
    /* #85: Watermarking v2 under the Takedown network is an older step past version 1, so it cuts leaks 2% more (55% → 56%) */
    assert.deepEqual([bare, studio, takedown, hunter].map(streamingTechPiracyProtection), [0, .2, .56, .8], 'Home piracy stopped: DRM alone none, Studio DRM 20%, Takedown network 55% (56% with Watermarking v2 under it), AI hunter v3 80%');
    assert.equal(streamingTechPiracyProtection(withTechs(takedown, [['TRUST_WATERMARK', 1]])), .55, 'With Watermarking at version 1 the Takedown network stops 55%');
    assert.deepEqual(streamingTechTrustMain(bare), { id: 'TRUST_DRM', name: 'DRM', version: 1 });
    assert.deepEqual(streamingTechTrustMain(takedown), { id: 'TRUST_TAKEDOWN', name: 'Takedown network', version: 1 });
    console.log('PASS catalogue: takedowns ×1 / ×0.5 (Takedown network) / ×0.2 (AI hunter v3); home piracy stopped 0 / 20% / 55% / 80%');

    /* ── the test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('piracy-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.equal(streamingTechTrustMain(base.techTree!)?.id, 'TRUST_TAKEDOWN', 'The test company protects its titles with the Takedown network');
    const playerWith = (tree: OwnedStreamingTechTreeState, crises?: OwnedStreamingCrisis[], extra: Partial<OwnedStreamingPlatformState> = {}): Player => ({
        ...qa,
        energy: { current: 100, max: 100 },
        flags: { ...qa.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 },
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            ...extra,
            techTree: tree,
            ...(crises ? { crisisSecurity: { ...base.crisisSecurity, ...(extra.crisisSecurity || {}), crises, infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } } } : {}),
        } as OwnedStreamingPlatformState, qa.id),
    });
    const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, qa.id);
    const leak = (id: string, severity: OwnedStreamingCrisis['severity'], detectedAt: number, title = 'Midnight Harbor'): OwnedStreamingCrisis => {
        const copy = getStreamingLeakCopy(title);
        return {
            id, idempotencyKey: id, type: 'CONTENT_LEAK', severity, stage: 'DETECTED', title: copy.title, detail: copy.detail, cause: 'Audit.',
            detectedAtAbsoluteWeek: detectedAt, affectedSubscribers: 300_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null, communication: null,
            responseCost: 0, weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null, outcomeNote: null, projectId: 'audit-project',
        };
    };
    const breach = (id: string): OwnedStreamingCrisis => ({ ...leak(id, 'SERIOUS', week), type: 'ACCOUNT_BREACH', title: 'Account-trust controls reported a breach', projectId: undefined });

    /* ── a takedown's answers ── */
    const paths = (options: ReturnType<typeof getStreamingIncidentRepairOptions>) => options.map(option => `${option.path}:${option.weeks}`);
    assert.deepEqual(paths(getStreamingIncidentRepairOptions(leak('a', 'SERIOUS', week), week, 100, 1e9, .5)), ['ENERGY:0', 'FIX:2', 'WAIT:3'], 'Takedown network, a minor leak: filed takedowns 2 weeks, up 3 if left');
    assert.deepEqual(paths(getStreamingIncidentRepairOptions(leak('a', 'MAJOR', week), week, 100, 1e9, .5)), ['ENERGY:0', 'FIX:3', 'WAIT:5'], 'A major leak: 3 and 5');
    assert.deepEqual(paths(getStreamingIncidentRepairOptions(leak('a', 'MAJOR', week), week, 100, 1e9, .2)), ['ENERGY:0', 'FIX:1', 'WAIT:2'], 'AI hunter v3: 1 and 2');
    assert.deepEqual(paths(getStreamingIncidentRepairOptions(leak('a', 'SERIOUS', week), week, 100, 1e9)), ['ENERGY:0', 'FIX:3', 'WAIT:6'], 'Without either: the usual 3 and 6');
    const piratedPlayer = playerWith(base.techTree!, [leak('pirated', 'SERIOUS', week)]);
    assert.deepEqual([streamingIncidentSpeed(platformOf(piratedPlayer), leak('x', 'SERIOUS', week)), streamingIncidentSpeed(platformOf(piratedPlayer), breach('y'))], [.5, 1],
        'Only a pirated title is a takedown; a breach keeps its weeks');
    const takenDown = repairStreamingIncident(piratedPlayer, 'CRISIS', 'pirated', 'ENERGY');
    assert.equal(takenDown.message, 'Taken down: the copies are gone, and its viewers are back on your service.');
    assert.equal(platformOf(takenDown.player).crisisSecurity.crises.find(item => item.id === 'pirated')!.stage, 'RESOLVED');
    const filed = repairStreamingIncident(piratedPlayer, 'CRISIS', 'pirated', 'FIX');
    const filedLeak = platformOf(filed.player).crisisSecurity.crises.find(item => item.id === 'pirated')!;
    assert.equal(filed.message, 'Takedowns filed: the copies come down in 2 weeks, about half of them right away.');
    assert.deepEqual([filedLeak.stage, filedLeak.recoveryReadyAtAbsoluteWeek, filedLeak.outcomeNote], ['RECOVERING', week + 2, `$2M of takedown requests filed: the copies come down by week ${week + 2}.`]);
    const letRun = repairStreamingIncident(piratedPlayer, 'CRISIS', 'pirated', 'WAIT');
    assert.equal(letRun.message, 'Letting it run: 3 more weeks of viewers watching pirated copies, no cash.');
    console.log(`PASS takedown: "${takenDown.message}" · "${filed.message}" · "${letRun.message}"; a breach keeps 3 and 6 weeks`);

    /* ── a leak nobody takes down fades sooner ── */
    const calmOperations = { ...base.weeklyHistory.at(-1)!.operations!, capacityUtilizationPercent: 40, playbackSuccessRate: 99.5 };
    const snapshotAt = (absoluteWeek: number): OwnedStreamingWeeklySnapshot => ({ ...base.weeklyHistory.at(-1)!, absoluteWeek, operations: calmOperations });
    const left = (tree: OwnedStreamingTechTreeState, at: number) => {
        const player = playerWith(tree, [leak('fading', 'SERIOUS', week)], { crisisSecurity: { ...base.crisisSecurity, lastEvaluatedAbsoluteWeek: week - 1 } });
        return commitStreamingCrisisSecurityWeek(platformOf(player), player, snapshotAt(at)).crisisSecurity.crises.find(item => item.id === 'fading')!;
    };
    const faded = left(base.techTree!, week + 3);
    assert.equal(faded.stage, 'RESOLVED', 'With the Takedown network, 3 weeks');
    assert.equal(faded.outcomeNote, 'The pirated copies faded after 3 weeks: nobody filed takedowns, and its viewers watched them for free.');
    const noNetwork = withoutIds(base.techTree!, ['TRUST_TAKEDOWN']);
    assert.equal(left(noNetwork, week + 3).stage, 'DETECTED', 'Without it, still up at 3 weeks');
    assert.equal(left(noNetwork, week + 6).stage, 'RESOLVED', 'and gone at 6');
    assert.equal(streamingIncidentWaitEndsAt(leak('z', 'SERIOUS', week), .5), week + 3);
    console.log(`PASS fading: a leak nobody answers comes down after 3 weeks with the Takedown network, 6 without ("${faded.outcomeNote}")`);

    /* ── a leak names its title ── */
    const titles = base.weeklyHistory.at(-1)!.operations!.titlePerformance || [];
    assert.ok(titles.length >= 2, `The test company's week has titles (${titles.length})`);
    const pickedRelease: Record<string, number> = {};
    const two = [
        { ...titles[0], projectId: 'old', title: 'Old Favourite', viewingAccounts: 1000, hoursViewed: 1000, weeksAvailable: 30 },
        { ...titles[1], projectId: 'new', title: 'New Release', viewingAccounts: 1000, hoursViewed: 1000, weeksAvailable: 2 },
    ];
    for (let index = 0; index < 4000; index += 1) {
        const picked = pickStreamingLeakedTitle(base, { absoluteWeek: index, operations: { ...calmOperations, titlePerformance: two } })!;
        pickedRelease[picked.projectId] = (pickedRelease[picked.projectId] || 0) + 1;
    }
    const newShare = pickedRelease.new / 4000;
    assert.ok(newShare > .71 && newShare < .79, `A new release with the same hours is picked 3 times as often: ${pct(newShare)} of 4,000`);
    assert.equal(pickStreamingLeakedTitle(base, { absoluteWeek: week, operations: { ...calmOperations, titlePerformance: [] } }), null, 'No title watched: unnamed');

    // a real detection: Security under 20 opens a breach or a leak; find the first leak
    const exposed = playerWith(base.techTree!, [], { technologyLevels: { ...base.technologyLevels, SECURITY: 10 }, crisisSecurity: { ...base.crisisSecurity, lastEvaluatedAbsoluteWeek: week - 1 } });
    const exposedPlatform = platformOf(exposed);
    let detected: OwnedStreamingCrisis | undefined;
    let detectedWeek = 0;
    for (let at = week + 1; at <= week + 400 && !detected; at += 1) {
        const crisis = commitStreamingCrisisSecurityWeek(exposedPlatform, exposed, snapshotAt(at)).crisisSecurity.crises.find(item => item.detectedAtAbsoluteWeek === at);
        if (crisis?.type === 'CONTENT_LEAK') { detected = crisis; detectedWeek = at; }
    }
    assert.ok(detected, 'A leak opens within 400 weeks at Security 10');
    const title = titles.find(item => item.projectId === detected!.projectId);
    assert.ok(title, `The leak names a title watched this week (${detected!.projectId})`);
    assert.equal(detected!.title, `“${title!.title}” is on pirate sites`);
    assert.equal(detected!.cause, 'Takedown network at Basic: leak risk 45%');
    const subscribers = snapshotAt(detectedWeek).subscribers;
    const multiplier = { MINOR: .75, SERIOUS: 1, MAJOR: 1.65, CRITICAL: 2.5 }[detected!.severity];
    const expectedReach = Math.round(Math.min(subscribers * .22, Math.max(subscribers * .01, title!.viewingAccounts * .3 * multiplier)));
    assert.ok(Math.abs(detected!.affectedSubscribers - expectedReach) <= 1, `It reaches the share of its viewers who take the copy: ${detected!.affectedSubscribers.toLocaleString()} (expected ${expectedReach.toLocaleString()})`);
    const kept = normalizeOwnedStreamingPlatformState(compactOwnedStreamingPlatformForPersistence({ ...base, crisisSecurity: { ...base.crisisSecurity, crises: [detected!] } }, qa.id), qa.id).crisisSecurity.crises[0];
    assert.equal(kept.projectId, detected!.projectId, 'The save keeps the pirated title');
    console.log(`PASS named leak: week ${detectedWeek - week} after the build, ${detected!.severity} "${detected!.title}" (${detected!.cause}), reaching ${detected!.affectedSubscribers.toLocaleString()} of ${title!.viewingAccounts.toLocaleString()} viewers; a new release is picked ${pct(newShare)} of the time against an old title with the same hours`);

    /* ── its harm ── */
    assert.deepEqual(STREAMING_INCIDENT_HARM.CONTENT_LEAK, { viewing: .35, churn: .02 });
    const harm = getStreamingIncidentHarm(platformOf(piratedPlayer)).rows[0];
    const reach = Math.min(.5, 300_000 / Math.max(1, base.weeklyHistory.at(-1)!.subscribers));
    assert.ok(Math.abs(harm.viewingLoss - reach * .35) < 1e-9 && Math.abs(harm.extraChurn - reach * .02) < 1e-9, `Viewing −${(harm.viewingLoss * 100).toFixed(2)}%, churn +${(harm.extraChurn * 100).toFixed(3)}% a week`);
    console.log(`PASS harm: 300,000 viewers on the pirated copy cost ${(harm.viewingLoss * 100).toFixed(2)}% of viewing and ${(harm.extraChurn * 100).toFixed(3)}% extra churn a week`);

    /* ── STATUS ── */
    const board = getStreamingStatusBoard(piratedPlayer);
    const card = board.open.find(item => item.id === 'pirated')!;
    assert.deepEqual([card.kind, card.takedown, card.weeksToRunItsCourse, card.repairs?.map(option => `${option.path}:${option.weeks}`)], ['Title piracy', true, 3, ['ENERGY:0', 'FIX:2', 'WAIT:3']]);
    const breachCard = getStreamingStatusBoard(playerWith(base.techTree!, [breach('b')])).open.find(item => item.id === 'b')!;
    assert.deepEqual([breachCard.takedown, breachCard.weeksToRunItsCourse], [undefined, 6], 'A breach is not a takedown');
    console.log(`PASS status: "${card.title}" · ${card.kind} · takedown · up ${card.weeksToRunItsCourse} weeks if left; a breach keeps 6`);

    /* ── the world offer ── */
    const offerOf = (tree: OwnedStreamingTechTreeState) => getWorldStreamingOffers(playerWith(tree), week).offers.find(offer => offer.isPlayer)!;
    const drmOnly = withoutIds(base.techTree!, ['TRUST_STUDIO_DRM', 'TRUST_WATERMARK', 'TRUST_TAKEDOWN']);
    const studioOnly = withoutIds(base.techTree!, ['TRUST_WATERMARK', 'TRUST_TAKEDOWN']);
    const withHunter = withTechs(base.techTree!, [['TRUST_AI_HUNTER', 3]]);
    assert.deepEqual([offerOf(drmOnly).protectionIndex, offerOf(studioOnly).protectionIndex, offerOf(base.techTree!).protectionIndex, offerOf(withHunter).protectionIndex], [undefined, 20, 55, 80]);
    assert.notEqual(offerOf(studioOnly).sourceFingerprint, offerOf(base.techTree!).sourceFingerprint, 'It joins the fingerprint once set');
    assert.ok(getWorldStreamingOffers(qa, week).offers.filter(offer => !offer.isPlayer).every(offer => offer.protectionIndex === undefined), 'Rivals: never');
    console.log('PASS offer: protection DRM alone not set, Studio DRM 20, Takedown network 55, AI hunter v3 80; rivals never');

    /* ── one real week, A/B ── */
    const weekOf = async (tree: OwnedStreamingTechTreeState) => {
        const snapshot = normalizeOwnedStreamingPlatformState((await processGameWeek(playerWith(tree))).player.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
        return { piracy: snapshot.operations?.worldCustomerPiracyReach || 0, joins: snapshot.operations?.joinedSubscribers || 0, subscribers: snapshot.subscribers };
    };
    const low = await weekOf(studioOnly);
    const mid = await weekOf(base.techTree!);
    const high = await weekOf(withHunter);
    assert.ok(low.piracy > 0, `People pirate the test company's titles (${low.piracy.toLocaleString()})`);
    assert.ok(mid.piracy < low.piracy * .7 && high.piracy < mid.piracy * .6, `Piracy of its titles: ${low.piracy.toLocaleString()} → ${mid.piracy.toLocaleString()} → ${high.piracy.toLocaleString()}`);
    assert.ok(mid.joins > low.joins && high.joins > mid.joins, `Sign-ups: ${low.joins.toLocaleString()} → ${mid.joins.toLocaleString()} → ${high.joins.toLocaleString()}`);
    console.log(`PASS week: people pirating its titles ${low.piracy.toLocaleString()} (Studio DRM) → ${mid.piracy.toLocaleString()} (Takedown network) → ${high.piracy.toLocaleString()} (AI hunter v3); sign-ups ${low.joins.toLocaleString()} → ${mid.joins.toLocaleString()} → ${high.joins.toLocaleString()}; subscribers after the week ${low.subscribers.toLocaleString()} / ${mid.subscribers.toLocaleString()} / ${high.subscribers.toLocaleString()}`);

    /* ── #57: a free tier draws pirates in ── */
    assert.deepEqual([streamingFreeTierPiracyCut(undefined), streamingFreeTierPiracyCut(-8), streamingFreeTierPiracyCut(40)], [.2, .16, .32],
        'Of the people pirating the player\'s titles, a free tier takes 20% (×0.8 to ×1.6 with its quality)');
    // the draw alone: each of a market's real cohorts with the draw and without it (everything else the same)
    const offersNow = getWorldStreamingOffers(qa, week).offers;
    const freeCountry = offersNow.find(offer => offer.isPlayer)!.activeCountryIds.find(id => qa.world.worldAudienceEconomy?.countries[id] && qa.world.worldAudienceParticipation?.countries[id])!;
    const playerFree = (choice: ReturnType<typeof allocateStreamingAudienceChoice>) => choice.allocations
        .filter(row => row.platformId === 'PLAYER' && row.kind === 'FREE_AD').reduce((sum, row) => sum + row.households, 0);
    const draw = STREAMING_FREE_TIER_PIRACY as { draw: number };
    let drawnHomes = 0;
    let proneDrawn = 0;
    let calmDrawn = 0;
    qa.world.worldAudienceEconomy!.countries[freeCountry].cohorts.forEach(cohort => {
        const overlay = qa.world.worldAudienceParticipation!.countries[freeCountry].cohorts.find(item => item.cohortId === cohort.id);
        if (!overlay) return;
        const drawing = allocateStreamingAudienceChoice(freeCountry, cohort, overlay, offersNow);
        const kept = draw.draw;
        draw.draw = 0;
        const without = allocateStreamingAudienceChoice(freeCountry, cohort, overlay, offersNow);
        draw.draw = kept;
        assert.equal(drawing.primarySubscriptions, without.primarySubscriptions, 'Paying homes are untouched');
        const drawn = playerFree(drawing) - playerFree(without);
        assert.equal(without.outsideHouseholds - drawing.outsideHouseholds, drawn, 'The homes drawn in come from outside every service');
        [without, drawing].forEach(choice => assert.equal(choice.reachableHouseholds, choice.primarySubscriptions + choice.freeAdHouseholds + choice.storeHouseholds + choice.outsideHouseholds,
            'Every home is still counted once'));
        drawnHomes += drawn;
        if (cohort.piracyTendencyIndex >= 50) proneDrawn += drawn; else calmDrawn += drawn;
    });
    assert.ok(drawnHomes > 0, `Piracy-prone cohorts come to the free tier: ${drawnHomes.toLocaleString()} homes in ${freeCountry}`);
    // one real week: a 480p free tier against a 4K HDR one (better quality draws, and cuts, more)
    const freeOffer = (rows: Partial<OwnedStreamingPlanOffer>): OwnedStreamingPlanOffer => ({
        picture: 'PICTURE_720P', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 1, downloads: false, ...rows,
    });
    const qaPricing = base.serviceConfiguration.pricing;
    assert.ok(qaPricing.commercialOffers?.freeAdAccess, 'The test company runs Free with ads');
    const freeWeek = async (free: OwnedStreamingPlanOffer) => {
        const pricing = normalizeStreamingPricingConfiguration({ ...qaPricing, freeAdOffer: free } as OwnedStreamingPricingConfiguration);
        const next = (await processGameWeek(playerWith(base.techTree!, undefined, { serviceConfiguration: { ...base.serviceConfiguration, pricing } }))).player;
        const snapshot = normalizeOwnedStreamingPlatformState(next.ownedStreamingPlatform, qa.id).weeklyHistory.at(-1)!;
        return { piracy: snapshot.operations?.worldCustomerPiracyReach || 0, free: next.world.worldStreamingViewing?.platforms?.PLAYER?.accessMix.freeViewingAccounts || 0 };
    };
    const sdFree = await freeWeek(freeOffer({ picture: 'PICTURE_480P' }));
    const uhdFree = await freeWeek(freeOffer({ picture: 'PICTURE_4K', hdr: 'HDR_HDR', colour: 'COLOUR_10BIT' }));
    assert.ok(uhdFree.piracy < sdFree.piracy && uhdFree.free > sdFree.free, `Piracy of its titles ${sdFree.piracy.toLocaleString()} → ${uhdFree.piracy.toLocaleString()}, free viewers ${sdFree.free.toLocaleString()} → ${uhdFree.free.toLocaleString()}`);
    console.log(`PASS free tier (#57): it takes ${pct(streamingFreeTierPiracyCut(undefined))} of the piracy of the player's titles (16–32% with its quality); in ${freeCountry} the draw brings ${drawnHomes.toLocaleString()} homes from outside every service to the free tier (${proneDrawn.toLocaleString()} from cohorts at piracy tendency 50 or more, ${calmDrawn.toLocaleString()} from the rest), paying homes untouched; one week, 480p → 4K HDR free tier: piracy of its titles ${sdFree.piracy.toLocaleString()} → ${uhdFree.piracy.toLocaleString()}, free viewers ${sdFree.free.toLocaleString()} → ${uhdFree.free.toLocaleString()}`);

    /* ── the Tech tab ── */
    const desk = getStreamingTechDesk(playerWith(base.techTree!));
    const step = (id: string) => desk.groups.find(item => item.id === 'TRUST')!.steps.find(item => item.id === id)!;
    assert.deepEqual(step('TRUST_AI_HUNTER').more, ['Leaks and piracy 33% lower', 'Takedowns take 40% less time']);
    assert.deepEqual(step('TRUST_TAKEDOWN').more, ['Leaks and piracy 11% lower', 'Takedowns take 10% less time'], 'Takedown network Basic → Hardened');
    console.log(`PASS tech tab: AI piracy hunter "${step('TRUST_AI_HUNTER').more.join('", "')}"; Takedown network to Hardened "${step('TRUST_TAKEDOWN').more.join('", "')}"`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
