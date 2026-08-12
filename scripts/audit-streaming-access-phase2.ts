import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    STREAMING_ELIGIBILITY_THRESHOLDS,
    claimStreamingLaunchEligibility,
    evaluateStreamingEligibility,
} from '../services/streamingEligibility';
import { STREAMING_INCORPORATION_ECONOMY } from '../services/streamingFounding';
import { transitionOwnedStreamingLifecycle } from '../services/ownedStreamingPlatform';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const qualifiedPlayer = (overrides: {
    money?: number;
    fame?: number;
    reputation?: number;
} = {}): Player => ({
    ...clone(INITIAL_PLAYER),
    id: 'streaming-launch-candidate',
    money: overrides.money ?? STREAMING_ELIGIBILITY_THRESHOLDS.LIQUID_CASH,
    stats: {
        ...clone(INITIAL_PLAYER.stats),
        fame: overrides.fame ?? STREAMING_ELIGIBILITY_THRESHOLDS.FAME,
        reputation: overrides.reputation ?? STREAMING_ELIGIBILITY_THRESHOLDS.REPUTATION,
    },
});

const freshPlayer = clone(INITIAL_PLAYER);
const freshReport = evaluateStreamingEligibility(freshPlayer);
assert(!freshReport.eligible && freshReport.status === 'LOCKED', 'A fresh career should not immediately clear launch readiness.');
assert(freshReport.metrics.length === 3, 'Launch readiness should contain exactly capital, fame, and reputation.');
assert(freshReport.clearedMetrics === 0, 'A fresh career should start with no cleared launch metrics.');
assert(freshReport.nextRequirement, 'A locked career should receive one concrete next requirement.');
assert(
    freshReport.metrics.map(metric => metric.label).join(',') === 'Personal Cash,Fame,Reputation',
    'Streaming qualification must use the same Personal Cash, Fame, and Reputation names shown by the core game.',
);

const cashOnlyPlayer = qualifiedPlayer({ fame: 0, reputation: 0 });
const cashOnlyReport = evaluateStreamingEligibility(cashOnlyPlayer);
assert(!cashOnlyReport.eligible, 'Capital alone must not clear streaming launch readiness.');
assert(cashOnlyReport.clearedMetrics === 1, 'Exactly $85M should clear only the capital metric.');
assert(cashOnlyReport.metrics.find(metric => metric.id === 'LIQUID_CASH')?.met, 'The $85M capital threshold should be inclusive.');
assert(
    STREAMING_ELIGIBILITY_THRESHOLDS.LIQUID_CASH === STREAMING_INCORPORATION_ECONOMY.cashRequired,
    'Career qualification and fixed incorporation must share the exact $85M cash threshold.',
);

const fameAndTrustOnly = qualifiedPlayer({ money: STREAMING_ELIGIBILITY_THRESHOLDS.LIQUID_CASH - 1 });
assert(!evaluateStreamingEligibility(fameAndTrustOnly).eligible, 'Fame and reputation must not bypass the capital requirement.');
assert(!evaluateStreamingEligibility(qualifiedPlayer({
    fame: STREAMING_ELIGIBILITY_THRESHOLDS.FAME - 1,
})).eligible, 'Fame below 65 must block launch readiness.');
assert(!evaluateStreamingEligibility(qualifiedPlayer({
    reputation: STREAMING_ELIGIBILITY_THRESHOLDS.REPUTATION - 1,
})).eligible, 'Reputation below 55 must block launch readiness.');

const exactPlayer = qualifiedPlayer();
const exactReport = evaluateStreamingEligibility(exactPlayer);
assert(exactReport.eligible && exactReport.clearedMetrics === 3, 'The exact $85M, Fame 65, and Reputation 55 thresholds should qualify.');
assert(exactReport.readiness === 1, 'A fully qualified career should report 100 percent readiness.');

const claimResult = claimStreamingLaunchEligibility(exactPlayer);
assert(claimResult.changed && claimResult.reason === 'LAUNCH_CLEARED', 'An eligible player should be able to clear the launch desk.');
assert(claimResult.player.ownedStreamingPlatform.lifecycle === 'ELIGIBLE', 'Launch clearance should persist the ELIGIBLE lifecycle.');
assert(
    claimResult.player.ownedStreamingPlatform.milestoneKeys.includes('streaming-launch-clearance'),
    'Launch clearance should persist the streaming launch milestone.',
);
assert(
    claimResult.player.ownedStreamingPlatform.eventLedger.some(entry => entry.type === 'LIFECYCLE_CHANGED'),
    'Launch clearance should create an auditable lifecycle fact.',
);

const duplicateClaim = claimStreamingLaunchEligibility(claimResult.player);
assert(!duplicateClaim.changed && duplicateClaim.reason === 'ALREADY_CLEARED', 'Launch clearance should be idempotent.');
assert(
    duplicateClaim.player.ownedStreamingPlatform.eventLedger.length === claimResult.player.ownedStreamingPlatform.eventLedger.length,
    'A repeated clearance must not duplicate ledger entries.',
);
assert(
    claimStreamingLaunchEligibility(freshPlayer).reason === 'NOT_ELIGIBLE',
    'The launch action must not bypass career qualification.',
);
assert(
    transitionOwnedStreamingLifecycle(freshPlayer.ownedStreamingPlatform, 'ACTIVE', 100).lifecycle === 'LOCKED',
    'The lifecycle must not skip directly from LOCKED to ACTIVE.',
);

const componentSource = readFileSync('components/StreamingLockedScreen.tsx', 'utf8');
const styleSource = readFileSync('styles/streaming-lock.css', 'utf8');
const lifestyleSource = readFileSync('views/LifestylePage.tsx', 'utf8');

[
    'A NEW COMPANY • LEVEL 0',
    'Build the service behind the screen.',
    'Four rooms. One living platform.',
    'Build the library',
    'Engineer the signal',
    'Face the audience',
    'FOUNDER QUALIFICATION',
    'Open Platform Registration',
    'The $85M rule is exact.',
    'Register. Enter Level 0. Build upward.',
    'AccessibleDialog',
    'aria-labelledby="stream-clearance-title"',
].forEach(fragment => {
    assert(componentSource.includes(fragment), `Phase 2 streaming UI should include ${fragment}.`);
});

[
    'No pay-to-qualify',
    'One path is enough',
    'Founder access',
    'founder route',
    'Notify me on release',
    'Future Update',
].forEach(fragment => {
    assert(!componentSource.toLowerCase().includes(fragment.toLowerCase()), `Rejected entry copy should remain absent: ${fragment}.`);
});

assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'The streaming screen should respect reduced motion.');
assert(styleSource.includes('env(safe-area-inset-bottom)'), 'The mobile navigation should respect device safe areas.');
assert(styleSource.includes('.stream-entry-room-grid'), 'The entry should present the four operating rooms as a scene-driven grid.');
assert(styleSource.includes('grid-template-columns: repeat(4'), 'The operating-room preview should expand cleanly beyond phone widths.');
assert(styleSource.includes('100dvh'), 'System and cutscene states should use a mobile-safe dynamic viewport.');
assert(lifestyleSource.includes('streamingEligibility.readiness'), 'Lifestyle should show total launch readiness.');
assert(!lifestyleSource.includes('streamingStrongestRoute'), 'Lifestyle should not expose the removed route system.');
assert(lifestyleSource.includes('player={player}'), 'The streaming entry screen should receive live player data.');

console.log('EMPIRE+ Phase 2 streaming entry audit passed.');
