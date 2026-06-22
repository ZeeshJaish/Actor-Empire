import { strict as assert } from 'node:assert';
import { calculateBalancedNextSeasonFundingCap, PlatformFundingProfile } from '../services/streamingFundingLogic';

const youtube: PlatformFundingProfile = {
    id: 'YOUTUBE',
    name: 'YouTube Premium',
    baseBid: 3_000_000,
    qualityReq: 38,
    maxBudget: 80_000_000
};

const hulu: PlatformFundingProfile = {
    id: 'HULU',
    name: 'Hulu',
    baseBid: 7_500_000,
    qualityReq: 58,
    maxBudget: 180_000_000
};

const netflix: PlatformFundingProfile = {
    id: 'NETFLIX',
    name: 'Netflix',
    baseBid: 12_000_000,
    qualityReq: 72,
    maxBudget: 420_000_000
};

const youtubeMid = calculateBalancedNextSeasonFundingCap({
    projectBudget: 180_000_000,
    packageScore: 66,
    currentOffer: 90_000_000,
    platform: youtube,
    genre: 'ACTION',
    rating: 7.0,
    seasonOneViews: 12_000_000,
    streamingRevenue: 8_000_000,
    rawHype: 55,
    randomFactor: 0.5
});

assert.ok(youtubeMid.amount <= 85_000_000, `YouTube normal cap too high: ${youtubeMid.amount}`);
assert.notEqual(youtubeMid.tier, 'BREAKOUT');
assert.notEqual(youtubeMid.tier, 'PREMIUM');

const huluSolid = calculateBalancedNextSeasonFundingCap({
    projectBudget: 120_000_000,
    packageScore: 68,
    currentOffer: 80_000_000,
    platform: hulu,
    genre: 'DRAMA',
    rating: 7.2,
    seasonOneViews: 22_000_000,
    streamingRevenue: 76_000_000,
    rawHype: 68,
    randomFactor: 0.5
});

assert.ok(huluSolid.amount >= 80_000_000, `Hulu solid cap too low: ${huluSolid.amount}`);
assert.ok(huluSolid.amount <= 170_000_000, `Hulu solid cap too high: ${huluSolid.amount}`);
assert.ok(['STANDARD', 'PREMIUM'].includes(huluSolid.tier), `Unexpected Hulu tier: ${huluSolid.tier}`);

const youtubeMonster = calculateBalancedNextSeasonFundingCap({
    projectBudget: 180_000_000,
    packageScore: 92,
    currentOffer: 145_000_000,
    platform: youtube,
    genre: 'DOCUMENTARY',
    rating: 8.8,
    seasonOneViews: 145_000_000,
    streamingRevenue: 135_000_000,
    rawHype: 96,
    hasProvenIp: true,
    randomFactor: 0.9
});

assert.ok(youtubeMonster.amount > youtubeMid.amount, 'Breakout YouTube season should beat normal YouTube cap.');
assert.ok(youtubeMonster.amount <= 170_000_000, `YouTube breakout cap should still stay platform-aware: ${youtubeMonster.amount}`);
assert.equal(youtubeMonster.tier, 'BREAKOUT');

const netflixBreakout = calculateBalancedNextSeasonFundingCap({
    projectBudget: 180_000_000,
    packageScore: 93,
    currentOffer: 170_000_000,
    platform: netflix,
    genre: 'DRAMA',
    rating: 8.7,
    seasonOneViews: 120_000_000,
    streamingRevenue: 210_000_000,
    rawHype: 94,
    hasProvenIp: true,
    randomFactor: 0.85
});

assert.ok(netflixBreakout.amount >= 220_000_000, `Netflix breakout cap too low: ${netflixBreakout.amount}`);
assert.equal(netflixBreakout.tier, 'BREAKOUT');

const weakExpensiveBet = calculateBalancedNextSeasonFundingCap({
    projectBudget: 240_000_000,
    packageScore: 52,
    currentOffer: 120_000_000,
    platform: netflix,
    genre: 'ACTION',
    rating: 5.8,
    seasonOneViews: 5_000_000,
    streamingRevenue: 20_000_000,
    rawHype: 38,
    randomFactor: 0.45
});

assert.ok(weakExpensiveBet.amount <= 180_000_000, `Weak expensive renewal cap too generous: ${weakExpensiveBet.amount}`);
assert.ok(['CONSERVATIVE', 'RISKY_BET'].includes(weakExpensiveBet.tier), `Unexpected weak tier: ${weakExpensiveBet.tier}`);

console.log('Platform funding balance audit passed.');
