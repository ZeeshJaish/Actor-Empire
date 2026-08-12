import { strict as assert } from 'node:assert';
import {
    getProjectFundingEconomics,
    getProjectMarketOutcomeRevenue,
    getStudioReturnPercent
} from '../services/projectFundingEconomics';

const fundedContinuation = {
    id: 'series_s2',
    budget: 65_800_000,
    platformProductionFunding: 65_800_000,
    studioCashAtRisk: 0,
    projectDetails: {
        hiddenStats: {
            platformFundedPremiere: true,
            nextSeasonFundingUsedByProjectId: 'series_s2'
        }
    }
};

const fullyFunded = getProjectFundingEconomics(fundedContinuation);
assert.equal(fullyFunded.platformFunding, 65_800_000);
assert.equal(fullyFunded.studioCashAtRisk, 0);
assert.equal(fullyFunded.isPlatformFundedPremiere, true);
assert.equal(
    getProjectMarketOutcomeRevenue(fundedContinuation, 354_000),
    66_154_000,
    'A funded continuation should include its contract value once for market outcome.'
);
assert.equal(
    getStudioReturnPercent(fundedContinuation, 354_000),
    null,
    'A fully financed season should show protected capital instead of an infinite or -99% ROI.'
);

const legacyContinuation = {
    id: 'legacy_s2',
    budget: 60_000_000,
    streamingFundingAmount: 80_000_000,
    projectDetails: {
        hiddenStats: {
            nextSeasonFundingAmount: 80_000_000,
            nextSeasonFundingUsedByProjectId: 'legacy_s2'
        }
    }
};
assert.equal(
    getProjectFundingEconomics(legacyContinuation).platformFunding,
    60_000_000,
    'Old saves should recover used funding without treating an unused cap as current-season value.'
);

const futureFundingOnly = {
    id: 'series_s1',
    budget: 60_000_000,
    streamingFundingAmount: 80_000_000,
    projectDetails: {
        hiddenStats: {
            nextSeasonFundingAmount: 80_000_000
        }
    }
};
assert.equal(
    getProjectFundingEconomics(futureFundingOnly).platformFunding,
    0,
    'A future renewal cap must not improve the current season outcome.'
);

const overCapContinuation = {
    id: 'series_s2_over_cap',
    budget: 95_000_000,
    platformProductionFunding: 80_000_000,
    studioCashAtRisk: 15_000_000,
    projectDetails: { hiddenStats: { platformFundedPremiere: true } }
};
assert.equal(
    Math.round(getStudioReturnPercent(overCapContinuation, 20_000_000) || 0),
    33,
    'Over-cap returns should use only the studio cash actually exposed.'
);

console.log('Funded streaming premiere audit passed.');
