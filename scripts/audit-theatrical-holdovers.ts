import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    ABSOLUTE_THEATRICAL_WEEK_CAP,
    MAX_THEATRICAL_EXTENSION_WEEKS,
    evaluateTheatricalExtension,
    getTheatricalWeekRange,
} from '../services/theatricalRunLogic';

const strongRun = evaluateTheatricalExtension({
    weekNum: 12,
    baseTheatricalWeeks: 12,
    maxTheatricalWeeks: 12,
    weeklyGross: [80_000_000, 63_000_000],
    budget: 120_000_000,
    imdbRating: 8.2,
    marketDemand: 1.08,
    remainingBoxOfficeHeadroom: 300_000_000,
});

assert.equal(strongRun.shouldExtend, true, 'a strongly held run should earn a holdover');
assert.equal(strongRun.addedWeeks, 2, 'an exceptional run may earn two weeks');
assert.equal(strongRun.newMaxTheatricalWeeks, 14);
assert.equal(strongRun.decision?.reason, 'STRONG_HOLD');

const repeatedReview = evaluateTheatricalExtension({
    weekNum: 12,
    baseTheatricalWeeks: 12,
    maxTheatricalWeeks: 12,
    extensionHistory: [strongRun.decision!],
    weeklyGross: [80_000_000, 63_000_000],
    budget: 120_000_000,
    imdbRating: 8.2,
    marketDemand: 1.08,
    remainingBoxOfficeHeadroom: 300_000_000,
});

assert.equal(repeatedReview.shouldExtend, false, 'the same run week cannot grant an extension twice');

const weakRun = evaluateTheatricalExtension({
    weekNum: 12,
    baseTheatricalWeeks: 12,
    maxTheatricalWeeks: 12,
    weeklyGross: [14_000_000, 3_000_000],
    budget: 120_000_000,
    imdbRating: 6.2,
    marketDemand: 0.82,
    remainingBoxOfficeHeadroom: 200_000_000,
});

assert.equal(weakRun.shouldExtend, false, 'a weak run must still close');

const sleeperRun = evaluateTheatricalExtension({
    weekNum: 10,
    baseTheatricalWeeks: 10,
    maxTheatricalWeeks: 10,
    weeklyGross: [4_000_000, 3_000_000],
    budget: 24_000_000,
    imdbRating: 7.8,
    marketDemand: 0.94,
    remainingBoxOfficeHeadroom: 40_000_000,
});

assert.equal(sleeperRun.shouldExtend, true, 'a small-budget sleeper can earn an extension');
assert.equal(sleeperRun.decision?.reason, 'STRONG_HOLD');

const cappedRun = evaluateTheatricalExtension({
    weekNum: ABSOLUTE_THEATRICAL_WEEK_CAP,
    baseTheatricalWeeks: 16,
    maxTheatricalWeeks: ABSOLUTE_THEATRICAL_WEEK_CAP,
    extensionWeeks: MAX_THEATRICAL_EXTENSION_WEEKS,
    weeklyGross: [100_000_000, 95_000_000],
    budget: 200_000_000,
    imdbRating: 9.5,
    marketDemand: 1.36,
    remainingBoxOfficeHeadroom: 1_000_000_000,
});

assert.equal(cappedRun.shouldExtend, false, 'even a hit cannot pass the hard theatrical cap');
assert.deepEqual(getTheatricalWeekRange('BLOCKBUSTER'), { min: 13, max: 16 }, 'blockbusters need their own base window');

const gameLoopSource = readFileSync(resolve(process.cwd(), 'services/gameLoop.ts'), 'utf8');
const boxOfficeSource = readFileSync(resolve(process.cwd(), 'views/mobile/BoxOfficeApp.tsx'), 'utf8');

assert.ok(
    !gameLoopSource.includes('weeklyDistributionBreakdowns || []), finalDistributionBreakdown].slice(-16)'),
    'extended runs must not discard their opening regional reports'
);
assert.ok(
    boxOfficeSource.includes('Permanent box-office record'),
    'archived releases need a permanent dossier state'
);
assert.ok(
    boxOfficeSource.includes('setSelectedArchivedRelease(entry.releaseRecord)'),
    'all-time history rows must open the archived dossier'
);
assert.ok(
    !/getAllTimeMetricValue[\s\S]{0,250}\.slice\(0,\s*12\)/.test(boxOfficeSource),
    'lower-ranked archived releases must remain reachable'
);
assert.ok(
    boxOfficeSource.includes('Regional detail was not recorded for this older release'),
    'old saves must explain missing regional data instead of fabricating it'
);

console.log('Theatrical holdover and permanent archive audit passed.');
