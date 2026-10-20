import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Player } from '../types';
import { filedMarketFixture } from './helpers/streamingFiledMarketFixture';
import { addStreamingAuditCatalogueTitle } from './helpers/streamingGrantedCatalogueFixture';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createStreamingCatalogueReadContext } from '../services/streamingContentAvailability';
import { getStreamingLaunchProgramView, getStreamingLaunchBudgetView, getStreamingOpeningMarketDecisionState,
    getStreamingIdentPurchaseView, getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { createDefaultStreamingInfrastructureDraft } from '../services/streamingInfrastructure';

const fixture = () => {
    const player = filedMarketFixture();
    const platform = player.ownedStreamingPlatform;
    for (let index = 0; index < 128; index++) {
        const id = `launch-read-${index}`;
        addStreamingAuditCatalogueTitle(player, getAbsoluteWeek(player.age, player.currentWeek), id);
        platform.catalogProjectIds.push(id);
    }
    platform.starterCatalog = { packageId: 'BROAD_APPEAL', ownedProjectIds: [], licensedProjectIds: platform.catalogProjectIds.slice() } as any;
    platform.infrastructureSetupDraft = createDefaultStreamingInfrastructureDraft(player);
    return player;
};
const observeProfiles = (player: Player) => {
    let reads = 0;
    player.ownedStreamingPlatform.marketOperations = player.ownedStreamingPlatform.marketOperations.map(operation => {
        const observed = { ...operation };
        Object.defineProperty(observed, 'countryProfile', { enumerable: true, get: () => { reads++; return operation.countryProfile; } });
        return observed;
    });
    return () => reads;
};
const allCases: Record<string, Player> = { titles128: fixture() };
const stressPath = process.argv.find(value => value.startsWith('--stress-player='))?.split('=').slice(1).join('=');
if (stressPath) {
    const stress = JSON.parse(readFileSync(stressPath, 'utf8')) as Player;
    stress.ownedStreamingPlatform.infrastructureSetupDraft = createDefaultStreamingInfrastructureDraft(stress);
    allCases.titles1040 = stress;
}
let passed = 0;
const failures: string[] = [];
const check = (name: string, run: () => void) => {
    try { run(); passed++; console.log(`PASS ${name}`); }
    catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};
for (const [name, input] of Object.entries(allCases)) check(`${name} launch view prepares the full platform only once`, () => {
    const player = structuredClone(input);
    const reads = observeProfiles(player);
    const context = createStreamingCatalogueReadContext(player);
    const view = getStreamingLaunchProgramView(player, context);
    assert.equal(view.milestones.length, 15);
    console.log(JSON.stringify({ scenario: name, countryProfileReads: reads() }));
    assert.equal(reads(), 197, 'pure helper reads must reuse the current launch-view platform snapshot');
});

check('public helper reads honor current money, markets, ident purchases and launch definition', () => {
    const player = structuredClone(allCases.titles128);
    const initialBudget = getStreamingLaunchBudgetView(player);
    assert.ok(initialBudget.availableTreasury > 0);
    createStreamingCatalogueReadContext(player);
    player.ownedStreamingPlatform.treasuryCash = 0;
    assert.equal(getStreamingLaunchBudgetView(player).availableTreasury, 0);
    assert.equal(getStreamingLaunchProgramView(player).budget.availableTreasury, 0);
    const operation = player.ownedStreamingPlatform.marketOperations[0];
    operation.clearance!.outcome = 'ADDITIONAL_REQUIREMENT';
    assert.ok(getStreamingOpeningMarketDecisionState(player).actionRequiredOperationIds.includes(operation.id));
    assert.equal(getStreamingOpeningMarketDecisionState(player).readyToCommission, false);
    const ident = getStreamingIdentPurchaseView(player);
    player.ownedStreamingPlatform.costCommitments.push({ id: 'launch-read-ident', idempotencyKey: 'launch-read-ident',
        category: 'SERVICE_IDENT', status: 'PAID', paidAmount: 4_500_000, plannedAmount: 4_500_000,
        committedAmount: 4_500_000, sourceReferenceId: `service-ident:${ident.campaignId}:FULL` } as any);
    assert.ok(getStreamingIdentPurchaseView(player).purchasedPackageIds.includes('FULL'));
    const signature = getStreamingLaunchDefinitionSignature(player);
    player.ownedStreamingPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
    player.ownedStreamingPlatform.serviceConfiguration.soundIdentKey = 'PULSE';
    assert.notEqual(getStreamingLaunchDefinitionSignature(player), signature);
});

check('network changes update launch milestones while rehearsal remains bound to its exact drawing', () => {
    const player = structuredClone(allCases.titles128);
    const first = getStreamingLaunchProgramView(player);
    assert.equal(first.milestones.find(row => row.id === 'NETWORK_BLUEPRINT')!.complete, false);
    player.ownedStreamingPlatform.infrastructureSetupDraft!.networkPlacements = [{ cityId: 'LA', racks: 3, role: 'CORE_ORIGIN' }];
    const next = getStreamingLaunchProgramView(player);
    assert.equal(next.milestones.find(row => row.id === 'NETWORK_BLUEPRINT')!.complete, true);
    assert.equal(next.milestones.find(row => row.id === 'REHEARSAL')!.complete, false);
    assert.equal(next.milestones.find(row => row.id === 'COMMISSIONING')!.complete, false);
});

check('a read context from a different player cannot hide current treasury or market state', () => {
    const first = structuredClone(allCases.titles128);
    const context = createStreamingCatalogueReadContext(first);
    const next = structuredClone(first);
    next.ownedStreamingPlatform.treasuryCash = 0;
    assert.equal(getStreamingLaunchBudgetView(next, context).availableTreasury, 0);
    assert.equal(getStreamingLaunchProgramView(next, context).budget.availableTreasury, 0);
});

check('the complete default launch projection preserves its pre-optimization fingerprint', () => {
    const output = { titles128: getStreamingLaunchProgramView(allCases.titles128) };
    assert.equal(createHash('sha256').update(JSON.stringify(output)).digest('hex'),
        '74d4e0c4c1bd519259a8d35cd4bd154ca0ff47be2a61d44259d878be0f4cedc0');
});

const goldenPath = process.argv.find(value => value.startsWith('--write-golden='))?.split('=').slice(1).join('=');
const comparisonPath = process.argv.find(value => value.startsWith('--compare-golden='))?.split('=').slice(1).join('=');
if (goldenPath || comparisonPath) {
    const outputs = Object.fromEntries(Object.entries(allCases).map(([name, player]) => [name, getStreamingLaunchProgramView(player)]));
    if (goldenPath) writeFileSync(goldenPath, JSON.stringify(outputs));
    if (comparisonPath) check('complete 128/1040 launch projections match the captured pre-optimization values', () => {
        assert.deepEqual(outputs, JSON.parse(readFileSync(comparisonPath, 'utf8')));
    });
    console.log(`OUTPUT_HASH ${createHash('sha256').update(JSON.stringify(outputs)).digest('hex')}`);
}
console.log(JSON.stringify({ passed, failed: failures.length }));
if (failures.length) process.exitCode = 1;
