/** Trust and safety, Phase 3 #54 (codex-handoff/plans/platform-tech-plan.md §4.1 row 8: "Account
 *  security, Content protection (DRM → Studio DRM → Watermarking → Takedown network → AI piracy
 *  hunter✦)… Safe payments, Privacy | Fewer breach and leak incidents; better rights deals (Content
 *  protection; 4K and up need strong DRM); fewer failed payments"; §4.3: SECURITY from Trust and
 *  safety). Piracy is #55 (audit:streaming-piracy), Sharing control #56. Checks:
 *  - the catalogue: the ladder, its starter, the side lines, prices;
 *  - the bridge: Security from the best Content protection step plus Account security, never lowered;
 *  - old saves: Security's steps (Studio DRM 15, Watermarking 25, Takedown network 45), and Studio
 *    DRM wherever Playback stands for 4K; a schema-3 tree joins once; rivals selling 4K own it;
 *  - 4K and above need Studio DRM in plans ("Unlock Studio DRM in Tech");
 *  - fewer leaks (Content protection) and breaches (Account security) in the crisis draw; Safe
 *    payments cuts churn in the world offer; Privacy's share of scrutiny;
 *  - the campus: the Security line points to Tech, and a node under way grants its steps;
 *  - the Tech tab and STATUS. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingPlatformState, type OwnedStreamingTechTreeState, type OwnedStreamingTechnologyProject, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactOwnedStreamingPlatformForPersistence, normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import {
    STREAMING_TECH_TREE_SCHEMA, applyStreamingTechBridge, convertStreamingTechTreeFromLevels, deriveStreamingTechEngineLevel, getStreamingTechGroupLadder,
    normalizeStreamingTechTreeState, resolveRivalStreamingTechTree, streamingTechBreachFactor, streamingTechChurnCut, streamingTechFeatureAllowed,
    streamingTechFeatureLockReason, streamingTechLeakFactor, streamingTechScrutinyFactor,
} from '../services/streamingTechTreeCatalogue';
import { streamingPlanOfferLocks } from '../services/streamingPlanOffer';
import { chooseStreamingCrisisType, getStreamingCrisisCopy } from '../services/streamingCrisisSecurity';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingTechDesk } from '../services/streamingTechDesk';
import { STREAMING_SECURITY_MOVED_BLOCKER, STREAMING_TECHNOLOGY_DEFINITIONS, completeDueStreamingTechnologyProjects, getStreamingTechnologyCampus } from '../services/streamingTechnologyCampus';
import { getWorldStreamingOffers } from '../services/worldEconomy/worldStreamingOffers';
import { createDeterministicRng } from '../services/deterministicRandom';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Trust Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const owned = (tree: OwnedStreamingTechTreeState) => Object.keys(tree.techs).filter(id => id.startsWith('TRUST_')).sort();
const withTechs = (tree: OwnedStreamingTechTreeState, entries: Array<[string, number]>): OwnedStreamingTechTreeState => ({
    ...tree,
    techs: { ...tree.techs, ...Object.fromEntries(entries.map(([id, version]) => [id, { version, progress: 0, unlockedAtAbsoluteWeek: 0, versionReachedAtAbsoluteWeek: 0 }])) },
});
const without = (tree: OwnedStreamingTechTreeState, prefix: string): OwnedStreamingTechTreeState => ({
    ...tree, techs: Object.fromEntries(Object.entries(tree.techs).filter(([id]) => !id.startsWith(prefix) || id === 'TRUST_DRM')) as OwnedStreamingTechTreeState['techs'],
});

async function main() {
    const started = performance.now();

    /* ── the catalogue ── */
    const trust = getStreamingTechGroupLadder('TRUST');
    assert.deepEqual(trust.map(item => `${item.name}${item.sideLine ? '*' : ''}${item.starter ? '(start)' : ''}${item.futuristic ? '✦' : ''}`), [
        'DRM(start)', 'Studio DRM', 'Watermarking', 'Takedown network', 'AI piracy hunter✦', 'Account security*', 'Safe payments*', 'Privacy*',
        // #56: Sharing control (audit:streaming-sharing-control)
        'Household detection*', 'Device check*', 'Paid extra member*',
    ]);
    assert.deepEqual(trust.filter(item => !item.starter).map(item => item.unlockCost / 1e6), [15, 40, 90, 200, 6, 5, 4, 6, 15, 25], 'Prices in $M');
    assert.equal(STREAMING_TECH_TREE_SCHEMA, 8, 'Schema 8 since Ads tech (#61)');
    console.log(`PASS catalogue: ${trust.map(item => item.name).join(', ')}`);

    /* ── the bridge ── */
    const bare = normalizeStreamingTechTreeState(undefined, {});
    const protectedTree = withTechs(bare, [['TRUST_STUDIO_DRM', 1], ['TRUST_WATERMARK', 2], ['TRUST_ACCOUNT', 1]]);
    assert.equal(deriveStreamingTechEngineLevel(protectedTree, 'SECURITY'), 28 + 5, 'Security = the best Content protection step (Watermarking v2 28) + Account security 5');
    const levels = { PLAYBACK_QUALITY: 0, DELIVERY_CAPACITY: 0, RELIABILITY: 0, DATA_RECOMMENDATIONS: 0, SECURITY: 20, CONTENT_OPERATIONS: 0, ADVERTISING_COMMERCE: 0, PRODUCT_EXPERIENCE: 0 };
    assert.deepEqual([applyStreamingTechBridge(levels, protectedTree).SECURITY, applyStreamingTechBridge({ ...levels, SECURITY: 60 }, protectedTree).SECURITY], [33, 60], 'Raised to what the tree stands for, never lowered');
    console.log('PASS bridge: Security 33 from Watermarking v2 and Account security; never lowered');

    /* ── old saves ── */
    const trustOf = (security: number, playback = 0) => owned(convertStreamingTechTreeFromLevels({ SECURITY: security, PLAYBACK_QUALITY: playback }));
    assert.deepEqual(trustOf(10), ['TRUST_DRM']);
    assert.deepEqual(trustOf(20), ['TRUST_DRM', 'TRUST_STUDIO_DRM']);
    assert.deepEqual(trustOf(30), ['TRUST_DRM', 'TRUST_STUDIO_DRM', 'TRUST_WATERMARK']);
    assert.deepEqual(trustOf(90), ['TRUST_DRM', 'TRUST_STUDIO_DRM', 'TRUST_TAKEDOWN', 'TRUST_WATERMARK'], 'Never the AI hunter, never a side line');
    assert.deepEqual(trustOf(0, 58), ['TRUST_DRM', 'TRUST_STUDIO_DRM'], 'Playback that stands for 4K: Studio DRM, so its 4K plans keep 4K');
    const schemaThree = { schemaVersion: 3, convertedFromLegacy: false, techs: { PICTURE_4K: { version: 1 } } };
    const joined = normalizeStreamingTechTreeState(schemaThree, { SECURITY: 26, PLAYBACK_QUALITY: 58 });
    assert.deepEqual([joined.schemaVersion, owned(joined), joined.techs.TRUST_STUDIO_DRM?.granted], [8, ['TRUST_DRM', 'TRUST_STUDIO_DRM', 'TRUST_WATERMARK'], true], 'A schema-3 tree joins once, as given steps');
    assert.deepEqual(owned(normalizeStreamingTechTreeState({ ...joined, techs: { ...joined.techs, TRUST_WATERMARK: undefined } }, { SECURITY: 90 })), ['TRUST_DRM', 'TRUST_STUDIO_DRM'], 'Never again');
    const rival = resolveRivalStreamingTechTree(90, 70);
    assert.ok(streamingTechFeatureAllowed(rival, 'uhd') && owned(rival).includes('TRUST_STUDIO_DRM'), 'A rival whose Playback stands for 4K keeps selling it');
    console.log('PASS old saves: Security 20 → Studio DRM, 30 → + Watermarking, 90 → + Takedown network; Playback 58 → Studio DRM; a schema-3 tree joins once; rivals selling 4K own Studio DRM');

    /* ── 4K and above need Studio DRM ── */
    const fourK = withTechs(bare, [['PICTURE_720P', 1], ['PICTURE_1080P', 1], ['PICTURE_4K', 1], ['HDR_HDR', 1]]);
    const offer = { picture: 'PICTURE_4K' as const, hdr: 'HDR_HDR' as const, colour: 'COLOUR_8BIT' as const, sound: 'SOUND_STEREO' as const, dialogue: false, screens: 1 as const, downloads: false };
    assert.deepEqual(streamingPlanOfferLocks(offer, fourK, levels).map(lock => [lock.row, lock.needs, lock.techId]), [['picture', 'Unlock Studio DRM in Tech', 'TRUST_STUDIO_DRM']]);
    assert.deepEqual(streamingPlanOfferLocks(offer, withTechs(fourK, [['TRUST_STUDIO_DRM', 1]]), levels), [], 'With Studio DRM, offered');
    assert.deepEqual(streamingPlanOfferLocks({ ...offer, picture: 'PICTURE_1080P' }, fourK, levels), [], '1080p HDR never needed it');
    assert.equal(streamingTechFeatureLockReason(fourK, 'uhd'), 'Unlock Studio DRM in Tech');
    console.log('PASS 4K: a 4K plan without Studio DRM is refused ("Unlock Studio DRM in Tech", Go to Tech opens it); 1080p never needed it');

    /* ── leaks, breaches, failed payments, scrutiny ── */
    assert.deepEqual([streamingTechLeakFactor(bare), streamingTechLeakFactor(withTechs(bare, [['TRUST_STUDIO_DRM', 1]])), streamingTechLeakFactor(withTechs(bare, [['TRUST_STUDIO_DRM', 1], ['TRUST_WATERMARK', 1], ['TRUST_TAKEDOWN', 3]]))],
        [1, .8, .35], 'Leaks: DRM alone 1, Studio DRM 0.8, Takedown network v3 0.35');
    assert.deepEqual([streamingTechBreachFactor(bare), streamingTechBreachFactor(withTechs(bare, [['TRUST_ACCOUNT', 2]]))], [1, .4]);
    assert.deepEqual([streamingTechScrutinyFactor(bare), streamingTechScrutinyFactor(withTechs(bare, [['TRUST_PRIVACY', 1]]))], [1, .7]);
    assert.equal(streamingTechChurnCut(withTechs(bare, [['TRUST_PAYMENTS', 1]])), .0002, 'Safe payments: 0.02 points of weekly churn');

    const qa = await buildStreamingFullPlatformQa(fresh('trust-safety-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    assert.deepEqual([base.technologyLevels.SECURITY, owned(base.techTree!)], [45, ['TRUST_DRM', 'TRUST_STUDIO_DRM', 'TRUST_TAKEDOWN', 'TRUST_WATERMARK']],
        'The test company: Security 45, Content protection to Takedown network (the campus no longer builds Security)');
    const playerWith = (tree: OwnedStreamingTechTreeState, crises?: OwnedStreamingCrisis[]): Player => ({
        ...qa,
        ownedStreamingPlatform: compactOwnedStreamingPlatformForPersistence({
            ...base,
            techTree: tree,
            ...(crises ? { crisisSecurity: { ...base.crisisSecurity, crises, infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } } } : {}),
        } as OwnedStreamingPlatformState, qa.id),
    });
    const calmNight = { operations: { ...base.weeklyHistory.at(-1)!.operations!, capacityUtilizationPercent: 40, playbackSuccessRate: 99.5 } };
    const draw = (tree: OwnedStreamingTechTreeState) => {
        const platform = normalizeOwnedStreamingPlatformState(playerWith(tree).ownedStreamingPlatform, qa.id);
        const counts: Record<string, number> = {};
        for (let index = 0; index < 4000; index += 1) {
            const { type } = chooseStreamingCrisisType(platform, calmNight, createDeterministicRng(`trust-audit:${index}`));
            counts[type] = (counts[type] || 0) + 1;
        }
        return counts;
    };
    const weak = draw(without(base.techTree!, 'TRUST_'));
    const strong = draw(withTechs(base.techTree!, [['TRUST_ACCOUNT', 3]]));
    assert.ok(strong.CONTENT_LEAK < weak.CONTENT_LEAK * .7 && strong.ACCOUNT_BREACH < weak.ACCOUNT_BREACH * .7,
        `Leaks ${weak.CONTENT_LEAK} → ${strong.CONTENT_LEAK}, breaches ${weak.ACCOUNT_BREACH} → ${strong.ACCOUNT_BREACH} of 4,000 draws`);
    const churnOf = (tree: OwnedStreamingTechTreeState) => {
        const countries = Object.values(getWorldStreamingOffers(playerWith(tree), week).offers.find(item => item.isPlayer)!.customerExperienceByCountry || {});
        return countries.reduce((sum, row) => sum + row.weeklyChurnRate, 0) / Math.max(1, countries.length);
    };
    const churnCut = churnOf(base.techTree!) - churnOf(withTechs(base.techTree!, [['TRUST_PAYMENTS', 1]]));
    assert.ok(Math.abs(churnCut - .0002) < .00002, `Safe payments takes ${(churnCut * 100).toFixed(3)} points off each market's weekly churn`);
    console.log(`PASS protection: in 4,000 calm draws leaks ${weak.CONTENT_LEAK} → ${strong.CONTENT_LEAK} (DRM alone → Takedown network), breaches ${weak.ACCOUNT_BREACH} → ${strong.ACCOUNT_BREACH} (Account security v3); Safe payments −0.02 points of churn; Privacy lets 70% of a crisis's scrutiny through`);

    /* ── the campus ── */
    const campus = getStreamingTechnologyCampus(qa);
    const securityNodes = campus.facilities.find(facility => facility.definition.id === 'SECURITY')!.nodes.filter(node => node.status !== 'INSTALLED' && node.status !== 'BUILDING');
    assert.ok(securityNodes.length > 0 && securityNodes.every(node => node.blockers.includes(STREAMING_SECURITY_MOVED_BLOCKER)), 'Every open Security node points to Tech');
    const node = STREAMING_TECHNOLOGY_DEFINITIONS.find(item => item.branch === 'SECURITY' && item.targetLevel >= 45 && item.targetLevel < 75)!;
    const project: OwnedStreamingTechnologyProject = {
        id: 'trust-audit-node', idempotencyKey: 'trust-audit-node', definitionId: node.id, branch: 'SECURITY', title: node.title, targetLevel: node.targetLevel,
        buildMode: 'BALANCED', status: 'UNDER_CONSTRUCTION', capitalCost: 0, weeklyOperatingCostDelta: 0, staffRequired: 0, constructionWeeks: 1, benefit: node.benefit,
        risk: node.risk, riskNote: node.riskNote, technicalDebtDelta: 0, startedAtAbsoluteWeek: week - 1, readyAtAbsoluteWeek: week, completedAtAbsoluteWeek: null,
    };
    const lowered = { ...base, technologyLevels: { ...base.technologyLevels, SECURITY: 20 }, techTree: without(base.techTree!, 'TRUST_'), technologyProjects: [project] };
    const built = completeDueStreamingTechnologyProjects(lowered as OwnedStreamingPlatformState, week).platform;
    assert.deepEqual([built.technologyLevels.SECURITY, owned(built.techTree!)], [node.targetLevel, ['TRUST_DRM', 'TRUST_STUDIO_DRM', 'TRUST_TAKEDOWN', 'TRUST_WATERMARK']],
        'A Security node under way finishes, and its level grants the steps it stands for');
    console.log(`PASS campus: ${securityNodes.length} open Security node${securityNodes.length === 1 ? '' : 's'} read "${STREAMING_SECURITY_MOVED_BLOCKER}"; ${node.title} (${node.targetLevel}) under way finishes and grants Studio DRM, Watermarking and Takedown network`);

    /* ── the Tech tab and STATUS ── */
    const desk = getStreamingTechDesk(playerWith(without(base.techTree!, 'TRUST_')));
    const group = desk.groups.find(item => item.id === 'TRUST')!;
    const step = (id: string) => group.steps.find(item => item.id === id)!;
    assert.deepEqual([group.accent, group.name, group.focus], ['#94a3b8', 'Trust and safety', 'TRUST_STUDIO_DRM']);
    // #55: Content protection cuts home piracy of the titles by the same share as leaks
    assert.deepEqual(step('TRUST_STUDIO_DRM').more, ['Leaks and piracy 20% lower']);
    assert.ok(step('TRUST_STUDIO_DRM').effect?.kind === 'SECURITY', 'Studio DRM moves the Security level');
    assert.deepEqual(step('TRUST_ACCOUNT').more, ['Breaches 50% less likely']);
    assert.deepEqual(step('TRUST_PAYMENTS').more, ['Churn −0.02% a week']);
    assert.deepEqual(step('TRUST_PRIVACY').more, ['30% less scrutiny reaches the regulator']);
    const breach = (stage: OwnedStreamingCrisis['stage']): OwnedStreamingCrisis => {
        const copy = getStreamingCrisisCopy('ACCOUNT_BREACH', undefined);
        return {
            id: 'trust-breach', idempotencyKey: 'trust-breach', type: 'ACCOUNT_BREACH', severity: 'SERIOUS', stage, title: copy.title, detail: copy.detail, cause: 'Audit.',
            detectedAtAbsoluteWeek: week - 1, affectedSubscribers: 200_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null, communication: null,
            responseCost: 0, weeklyRecoveryCost: 0, recoveryReadyAtAbsoluteWeek: stage === 'RECOVERING' ? week + 3 : null, resolvedAtAbsoluteWeek: null, outcomeNote: null,
        };
    };
    const row = getStreamingStatusBoard(playerWith(base.techTree!, [breach('DETECTED')])).sections.find(section => section.id === 'TECH')!.rows.find(item => item.id === 'TECH:TRUST')!;
    assert.deepEqual([row.status, row.reason, row.detail], ['SLOW', 'Account-trust controls reported a breach', 'Takedown network · Basic']);
    console.log(`PASS tech tab and status: steel accent; Studio DRM "${step('TRUST_STUDIO_DRM').more.join(', ')}"; Account security "${step('TRUST_ACCOUNT').more[0]}"; a breach puts Trust and safety SLOW ("${row.reason}")`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
