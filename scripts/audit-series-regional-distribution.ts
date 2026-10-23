import assert from 'node:assert/strict';
import { makeCinemaFixture } from './fixtures/boxOfficeScenarios';
import { calculateStreamingDistributionBreakdown } from '../services/distributionRevenue';
const project = makeCinemaFixture().project; project.type = 'SERIES';
let breakdown: ReturnType<typeof calculateStreamingDistributionBreakdown>;
assert.doesNotThrow(() => { breakdown = (calculateStreamingDistributionBreakdown as any)(project, 'REGIONAL_SERIES_BUYER', 9_000_000, 500_000, 2, 'NETFLIX'); },
    'A regional buyer uses the same known audience-size simulation profile without changing the signed buyer');
assert.equal(breakdown!.platformId, 'REGIONAL_SERIES_BUYER');
assert.equal(breakdown!.regionBreakdowns.reduce((sum, row) => sum + row.views, 0), 9_000_000);
assert.equal(breakdown!.regionBreakdowns.reduce((sum, row) => sum + row.revenue, 0), 500_000);
console.log('PASS regional series distribution keeps signed buyer identity and exact view/revenue totals');
