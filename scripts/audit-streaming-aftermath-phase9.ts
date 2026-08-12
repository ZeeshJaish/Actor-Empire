import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { getStreamingLaunchAftermath } from '../services/streamingAftermath';
import { getAbsoluteWeek } from '../services/legacyLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const platform = createInitialOwnedStreamingPlatformState('phase9-player');
    return {
        ...base,
        id: 'phase9-player',
        name: 'Viewer Founder',
        age: 43,
        currentWeek: 8,
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'ACTIVE',
            identity: {
                name: 'Northstar+',
                slug: 'northstar-plus',
                primaryColor: '#735cff',
                secondaryColor: '#101014',
                logoKey: 'FRAME_PLAY',
                soundIdentKey: 'PULSE',
                brandPromiseId: 'BALANCED',
                foundedAtAbsoluteWeek: 2_100,
            },
            launchCommit: {
                id: 'launch-commit',
                idempotencyKey: 'platform-launch:northstar-plus',
                committedAtAbsoluteWeek: getAbsoluteWeek(43, 8),
                capacityPlan: 'CLOUD_BURST',
                capacityPlanCost: 2_600_000,
                readinessScore: 93,
                forecastLikelyConcurrentStreams: 1_200_000,
                forecastHighConcurrentStreams: 1_850_000,
                protectedPeakConcurrentStreams: 5_250_000,
                launchHeadroomPercent: 184,
                initialSubscribers: 4_164_000,
                openingDemandIndex: 78,
                playbackSuccessRate: 99.67,
                outcomeTier: 'SMOOTH_OPENING',
                openingTitleCount: 5,
                openingOriginalTitle: 'Midnight Frequency',
            },
            metrics: {
                ...platform.metrics,
                subscribers: 4_164_000,
                netSubscriberMovement: 4_164_000,
                averageRevenuePerUser: 12.16,
                technologyHealth: 100,
            },
            milestoneKeys: ['platform-launch-ready', 'platform-launched'],
        },
    };
};

const prelaunch = getStreamingLaunchAftermath({
    ...createFixture(),
    ownedStreamingPlatform: {
        ...createFixture().ownedStreamingPlatform,
        lifecycle: 'FOUNDING',
        launchCommit: null,
    },
});
assert(!prelaunch.available && prelaunch.signals.length === 0, 'Pre-launch Viewer Mode must not invent launch signals.');
assert(prelaunch.pendingReportCount === 5, 'All audience reports should remain unavailable before launch.');

const fixture = createFixture();
const aftermath = getStreamingLaunchAftermath(fixture);
assert(aftermath.available && aftermath.weeksLive === 1 && aftermath.programWeek === 1, 'Launch week should create the first live Viewer Home program week.');
assert(aftermath.signals.find(signal => signal.id === 'SUBSCRIBERS')?.value === '4.2M', 'Subscriber story must use the committed launch total.');
assert(aftermath.signals.find(signal => signal.id === 'PLAYBACK')?.value === '99.67%', 'Technical signal must preserve committed playback success.');
assert(aftermath.signals.find(signal => signal.id === 'HEADROOM')?.value === '+184%', 'Capacity signal must preserve committed launch headroom.');
assert(aftermath.reactions.length === 3, 'Phase 9 should provide audience, industry and operations reactions.');
assert(aftermath.reactions.every(reaction => reaction.detail.length > 25), 'Launch reactions need explainable, fact-grounded detail.');
assert(aftermath.reports.every(report => report.status === 'PENDING'), 'Launch night alone must not fabricate weekly reports.');
assert(aftermath.reports.find(report => report.id === 'CHURN')?.value === null, 'Pending churn must be blank rather than fake zero.');
assert(aftermath.reports.find(report => report.id === 'MARKET_SHARE')?.detail.includes('not inferred'), 'Opening subscribers must not be mislabeled as market share.');

const nextWeek = {
    ...fixture,
    currentWeek: 9,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        weeklyHistory: [{
            id: 'week-one',
            absoluteWeek: getAbsoluteWeek(43, 9),
            subscribers: 4_350_000,
            netSubscriberMovement: 186_000,
            churnRate: 0.031,
            engagementRate: 0.64,
            averageRevenuePerUser: 12.16,
            cashRunwayWeeks: 22,
            technologyHealth: 98,
            causeMarkers: ['FIRST_WEEK'],
        }],
    },
} satisfies Player;
const weeklyAftermath = getStreamingLaunchAftermath(nextWeek);
assert(weeklyAftermath.programWeek === 2, 'The live storefront should advance its slate program week from the absolute game week.');
assert(weeklyAftermath.reports.find(report => report.id === 'SUBSCRIBER_TREND')?.value === '186,000', 'Processed subscriber movement should replace the pending state.');
assert(weeklyAftermath.reports.find(report => report.id === 'CHURN')?.value === '3.1%', 'Processed churn should use the first weekly snapshot.');
assert(weeklyAftermath.reports.find(report => report.id === 'ENGAGEMENT')?.value === '64.0%', 'Processed engagement should use the first weekly snapshot.');
assert(weeklyAftermath.reports.find(report => report.id === 'MARKET_SHARE')?.status === 'PENDING', 'Market share should remain pending until competitive simulation exists.');
assert(weeklyAftermath.reports.find(report => report.id === 'TITLE_PERFORMANCE')?.status === 'PENDING', 'Per-title performance should remain pending until title analytics exist.');

const degradedFixture: Player = {
    ...fixture,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        launchCommit: {
            ...fixture.ownedStreamingPlatform.launchCommit!,
            outcomeTier: 'DEGRADED_OPENING',
            playbackSuccessRate: 95.4,
            launchHeadroomPercent: -31,
        },
    },
};
const degraded = getStreamingLaunchAftermath(degradedFixture);
assert(degraded.outcomeLabel === 'Degraded opening', 'A degraded launch needs a truthful aftermath label.');
assert(degraded.reactions.find(reaction => reaction.id === 'OPERATIONS')?.tone === 'CRITICAL', 'Severe playback and headroom pressure must surface as an operations warning.');

const viewerSource = readFileSync(resolve(process.cwd(), 'components/StreamingViewerMode.tsx'), 'utf8');
const aftermathSource = readFileSync(resolve(process.cwd(), 'components/StreamingLaunchAftermathPanel.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const viewerStyle = readFileSync(resolve(process.cwd(), 'styles/streaming-viewer-mode.css'), 'utf8');
const hqStyle = readFileSync(resolve(process.cwd(), 'styles/streaming-hq.css'), 'utf8');

[
    'VIEWER HOME • LIVE',
    'Customer experience and launch pulse',
    'Top picks this week',
    'New this week',
    'Series to start',
    'Films for tonight',
    'Coming next',
    'Opening facts stay visible; unprocessed weekly metrics are never shown as zero.',
].forEach(fragment => assert(viewerSource.includes(fragment), `Live Viewer Home should include ${fragment}.`));
assert(!viewerSource.includes('Continue Watching'), 'The customer home must not invent viewing history.');
[
    'PHASE 9 • LAUNCH AFTERMATH',
    'REACTION ROOM',
    'REPORT QUEUE',
    'Open live Viewer Home',
].forEach(fragment => assert(aftermathSource.includes(fragment), `HQ aftermath should include ${fragment}.`));
assert(hqSource.includes('<StreamingLaunchAftermathPanel'), 'Platform HQ should surface the Phase 9 aftermath after launch.');
assert(viewerStyle.includes('.stream-viewer-opening-story'), 'Viewer Home needs a live opening-week visual treatment.');
assert(viewerStyle.includes('.stream-viewer-live-pin'), 'Available titles should receive an honest live badge.');
assert(hqStyle.includes('.hq-aftermath-signals'), 'HQ should visually separate committed launch signals.');
assert(hqStyle.includes('@media (max-width: 620px)'), 'Launch aftermath should retain the HQ mobile breakpoint.');
assert(viewerStyle.includes('@media (prefers-reduced-motion: reduce)'), 'Viewer Home should keep reduced-motion support.');

console.log('Streaming Viewer Home and launch aftermath Phase 9 audit passed.');
