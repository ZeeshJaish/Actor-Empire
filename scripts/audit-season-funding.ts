import { strict as assert } from 'node:assert';
import * as fundingLogic from '../services/streamingFundingLogic';
import { LockedStreamingFunding } from '../types';

const { applyLockedSeasonFunding, markHiddenSeasonFundingUsed } = fundingLogic;

const netflixFund: LockedStreamingFunding = {
    id: 'fund_netflix_s2',
    platformId: 'NETFLIX',
    platformName: 'Netflix',
    amount: 80_000_000,
    sourceProjectId: 'series_s1',
    sourceTitle: 'Vault Rain',
    franchiseId: 'vault_rain',
    installmentNumber: 1,
    projectType: 'SERIES',
    createdWeek: 12,
    createdYear: 24
};

const underCap = applyLockedSeasonFunding({
    budget: 60_000_000,
    lockedFunding: netflixFund,
    projectId: 'series_s2',
    studioBalance: 100_000_000,
    productionFund: 0,
    week: 19,
    year: 18,
    newsYear: 2026
});

assert.equal(underCap.lockedFundApplied, 60_000_000);
assert.equal((underCap as any).unusedFundingReturned, 20_000_000);
assert.equal(underCap.studioSpend, 0);
assert.equal(underCap.nextStudioBalance, 100_000_000);
assert.equal(underCap.updatedLockedStreamingFunds.length, 0);
assert.equal(underCap.ledgerEntries.length, 1);
assert.equal(underCap.ledgerEntries[0].type, 'PRODUCTION_SPEND');
assert.equal(underCap.ledgerEntries[0].year, 18);
assert.deepEqual(underCap.feedbackMessages, [
    'Netflix renewed Vault Rain. Season 2 funding cap used: $60.0M.',
    'Netflix already committed Season 2 funding, so the bidding room stayed closed.',
    'Unused $20.0M of the Netflix cap returned to the platform.'
]);
assert.equal(underCap.news?.headline, 'Netflix renews Vault Rain');
assert.equal(underCap.news?.year, 2026);
assert.match(underCap.news?.subtext || '', /unused funding returned to the platform/i);

const overCap = applyLockedSeasonFunding({
    budget: 95_000_000,
    lockedFunding: netflixFund,
    projectId: 'series_s2_expensive',
    studioBalance: 100_000_000,
    productionFund: 0
});

assert.equal(overCap.lockedFundApplied, 80_000_000);
assert.equal((overCap as any).unusedFundingReturned, 0);
assert.equal(overCap.studioSpend, 15_000_000);
assert.equal(overCap.nextStudioBalance, 85_000_000);
assert.deepEqual(overCap.feedbackMessages, [
    'Netflix renewed Vault Rain. Season 2 funding cap used: $80.0M.',
    'Netflix already committed Season 2 funding, so the bidding room stayed closed.',
    'Studio added $15.0M above the Netflix cap.'
]);
assert.match(overCap.news?.subtext || '', /studio added \$15\.0M above the platform cap/i);

const noDoubleUse = applyLockedSeasonFunding({
    budget: 40_000_000,
    lockedFunding: { ...netflixFund, usedByProjectId: 'series_s2' },
    projectId: 'series_s3',
    studioBalance: 100_000_000,
    productionFund: 0
});

assert.equal(noDoubleUse.lockedFundApplied, 0);
assert.equal((noDoubleUse as any).unusedFundingReturned, 0);
assert.equal(noDoubleUse.studioSpend, 40_000_000);
assert.deepEqual(noDoubleUse.feedbackMessages, []);
assert.equal(noDoubleUse.news, null);

const sourceDetails = markHiddenSeasonFundingUsed({
    hiddenStats: {
        nextSeasonFundingAmount: 80_000_000,
        nextSeasonFundingPlatformId: 'NETFLIX',
        nextSeasonFundingSourceProjectId: 'series_s1'
    }
}, netflixFund, 'series_s2');

assert.equal((sourceDetails?.hiddenStats as any)?.nextSeasonFundingUsedByProjectId, 'series_s2');

const usedSourceDetails = markHiddenSeasonFundingUsed({
    hiddenStats: {
        nextSeasonFundingAmount: 80_000_000,
        nextSeasonFundingPlatformId: 'NETFLIX',
        nextSeasonFundingSourceProjectId: 'series_s1',
        nextSeasonFundingUsedByProjectId: 'series_s2'
    }
}, netflixFund, 'series_s3');

assert.equal((usedSourceDetails?.hiddenStats as any)?.nextSeasonFundingUsedByProjectId, 'series_s2');

assert.equal(
    typeof (fundingLogic as any).processStreamingFundingContracts,
    'function',
    'The weekly contract processor should exist.'
);

const processStreamingFundingContracts = (fundingLogic as any).processStreamingFundingContracts as (input: any) => any;

const firstWarning = processStreamingFundingContracts({
    lockedStreamingFunds: [netflixFund],
    platformRelations: {},
    currentWeek: 38,
    currentYear: 25
});

assert.equal(firstWarning.events.length, 1);
assert.equal(firstWarning.events[0].type, 'WARNING');
assert.equal(firstWarning.events[0].weeksRemaining, 26);
assert.equal(firstWarning.lockedStreamingFunds[0].warningStage, 'FIRST');

const finalWarning = processStreamingFundingContracts({
    lockedStreamingFunds: firstWarning.lockedStreamingFunds,
    platformRelations: firstWarning.platformRelations,
    currentWeek: 4,
    currentYear: 26
});

assert.equal(finalWarning.events.length, 1);
assert.equal(finalWarning.events[0].type, 'FINAL_WARNING');
assert.equal(finalWarning.events[0].weeksRemaining, 8);
assert.equal(finalWarning.lockedStreamingFunds[0].warningStage, 'FINAL');

const extendedContract = processStreamingFundingContracts({
    lockedStreamingFunds: [{
        ...finalWarning.lockedStreamingFunds[0],
        deadlineExtensionWeeks: 26
    }],
    platformRelations: finalWarning.platformRelations,
    currentWeek: 12,
    currentYear: 26
});

assert.equal(extendedContract.events.length, 0);
assert.equal(extendedContract.lockedStreamingFunds.length, 1);

const expiredContract = processStreamingFundingContracts({
    lockedStreamingFunds: finalWarning.lockedStreamingFunds,
    platformRelations: finalWarning.platformRelations,
    currentWeek: 12,
    currentYear: 26
});

assert.equal(expiredContract.events.length, 1);
assert.equal(expiredContract.events[0].type, 'DEFAULT');
assert.equal(expiredContract.lockedStreamingFunds.length, 0);
assert.equal(expiredContract.platformRelations.NETFLIX.trustModifier, -4);
assert.equal(expiredContract.platformRelations.NETFLIX.recoveryWeeksRemaining, 24);
assert.equal(
    fundingLogic.getPlatformFundingRelationshipMultiplier(expiredContract.platformRelations.NETFLIX),
    0.92
);

const repeatedBreach = processStreamingFundingContracts({
    lockedStreamingFunds: [{
        ...netflixFund,
        id: 'fund_netflix_s3',
        sourceProjectId: 'series_s2',
        installmentNumber: 2,
        createdWeek: 12,
        createdYear: 24,
        warningStage: 'FINAL'
    }],
    platformRelations: expiredContract.platformRelations,
    currentWeek: 12,
    currentYear: 26
});

assert.equal(repeatedBreach.events[0].type, 'DEFAULT');
assert.equal(repeatedBreach.platformRelations.NETFLIX.trustModifier, -8);
assert.ok(repeatedBreach.platformRelations.NETFLIX.recoveryWeeksRemaining <= 36);
assert.equal(
    fundingLogic.getPlatformFundingRelationshipMultiplier(repeatedBreach.platformRelations.NETFLIX),
    0.84
);

let recoveringRelations = expiredContract.platformRelations;
for (let week = 0; week < 24; week += 1) {
    recoveringRelations = processStreamingFundingContracts({
        lockedStreamingFunds: [],
        platformRelations: recoveringRelations,
        currentWeek: 13 + week,
        currentYear: 26
    }).platformRelations;
}

assert.equal(recoveringRelations.NETFLIX, undefined);

console.log('Season funding audit passed.');
