import assert from 'node:assert/strict';
import {
    buildSharedIndustryB8Scenario,
    describeSharedIndustryB8Scenario,
} from './helpers/sharedIndustryB8Scenarios';

const baselineA = buildSharedIndustryB8Scenario('BASELINE', 'b8-baseline-01');
const baselineB = buildSharedIndustryB8Scenario('BASELINE', 'b8-baseline-01');
assert.deepEqual(baselineB, baselineA, 'the same B8 regime and seed must create the same canonical world');
assert.ok(Object.keys(baselineA.world.studios || {}).length >= 4);
assert.ok(Object.keys(baselineA.world.platforms || {}).length >= 5);

const baselineDescription = describeSharedIndustryB8Scenario(baselineA);
const lean = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('LEAN', 'b8-lean-01'));
const boom = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('BOOM', 'b8-boom-01'));
assert.ok(lean.aggregateCompanyCashMillions < boom.aggregateCompanyCashMillions);
assert.ok(boom.activeCompanyCount >= lean.activeCompanyCount);

const crowded = describeSharedIndustryB8Scenario(buildSharedIndustryB8Scenario('CROWDED', 'b8-crowded-01'));
assert.ok(crowded.activeCompanyCount > baselineDescription.activeCompanyCount);

const alternate = buildSharedIndustryB8Scenario('BASELINE', 'b8-baseline-02');
assert.notDeepEqual(
    describeSharedIndustryB8Scenario(alternate).companyPotentialDigest,
    baselineDescription.companyPotentialDigest,
    'different seeds must produce meaningfully different company potential',
);

for (const player of [baselineA, buildSharedIndustryB8Scenario('ADVERSE', 'b8-adverse-01')]) {
    const studioIds = Object.keys(player.world.studios || {});
    const platformIds = Object.keys(player.world.platforms || {});
    assert.equal(new Set(studioIds).size, studioIds.length, 'B8 studio IDs must be unique within their registry');
    assert.equal(new Set(platformIds).size, platformIds.length, 'B8 platform IDs must be unique within their registry');
    Object.values(player.world.studios || {}).forEach(studio => {
        assert.ok(studio.ai, `${studio.id} must have normalized Studio AI state`);
        assert.equal(studio.ai?.controller, 'AI');
        assert.ok(Number.isFinite(studio.cashReserve));
    });
    Object.values(player.world.platforms || {}).forEach(platform => {
        assert.ok(
            platform.ai?.intelligence?.platformMigration,
            `${platform.id} must retain the B4 execution migration ledger`,
        );
    });
}

console.log('Shared Industry B8 scenario audit passed.');
