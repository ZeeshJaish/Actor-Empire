import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
    INITIAL_PLAYER,
    createInitialOwnedStreamingPlatformState,
    type OwnedStreamingPlatformState,
    type Player,
} from '../types';
import {
    commitOwnedStreamingLaunch,
    getStreamingLaunchReadiness,
} from '../services/streamingLaunch';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const initial = createInitialOwnedStreamingPlatformState('phase8-player');
    const platform: OwnedStreamingPlatformState = {
        ...initial,
        lifecycle: 'FOUNDING',
        identity: {
            name: 'Northstar+',
            slug: 'northstar-plus',
            primaryColor: '#735cff',
            secondaryColor: '#101014',
            logoKey: 'FRAME_PLAY',
            soundIdentKey: 'PULSE',
            brandPromiseId: 'BALANCED',
            foundedAtAbsoluteWeek: 2_100,
            publicManifesto: 'One screen for every kind of story.',
        },
        foundingProfile: {
            incorporationModel: 'FIXED_V7',
            founderCashCharged: 85_000_000,
            setupCostsConsumed: 70_000_000,
            openingTreasuryCash: 15_000_000,
            outsideCapitalRaisedAtIncorporation: 0,
            debtPrincipalAtIncorporation: 0,
            founderOwnershipPercentAtIncorporation: 100,
            founderWasCeoAtIncorporation: true,
            incorporatedAtAbsoluteWeek: 2_100,
        },
        infrastructureStrategy: 'HYBRID',
        marketOperations: [{
            id: 'market-us', idempotencyKey: 'market:opening:us', scope: 'COUNTRY', scopeId: 'US', countryId: 'US',
            regionId: 'NORTH_AMERICA', entryKind: 'OPENING', status: 'READY',
            plannedCosts: { rights: 48_000_000, compliance: 5_000_000, localization: 0, infrastructure: 0, other: 0, total: 53_000_000 },
            committedCosts: { rights: 48_000_000, compliance: 5_000_000, localization: 0, infrastructure: 0, other: 0, total: 53_000_000 },
            weeklyOperatingCost: 0, policySnapshot: null, plannedAtAbsoluteWeek: 2_100, committedAtAbsoluteWeek: 2_101,
            approvalReadyAtAbsoluteWeek: 2_105, activatedAtAbsoluteWeek: null, suspendedAtAbsoluteWeek: null, exitedAtAbsoluteWeek: null, source: 'PLAYER_ACTION',
        }],
        serviceConfiguration: {
            source: 'PLAYER_ACTION', soundIdentKey: 'PULSE', identPackageId: 'STANDARD', identDurationSeconds: 3,
            storefrontLayoutId: 'CINEMA', pricingApproach: 'PREMIUM',
            pricing: createInitialOwnedStreamingPlatformState().serviceConfiguration.pricing,
            committedCost: 0, committedAtAbsoluteWeek: 2_101, revision: 1,
        },
        infrastructureSetup: {
            capacityPackageId: 'GROWTH',
            networkPlacements: [],
            rolloutPace: 'STANDARD',
            storageCapacityHours: 40_000,
            reliabilityTarget: 99.8,
            weeklyOperatingCost: 1_300_000,
            staffRequired: 14,
            capitalInvested: 40_000_000,
            technicalDebt: 4,
            readyAtAbsoluteWeek: 0,
            revision: 1,
            committedAtAbsoluteWeek: 2_101,
            loadTest: {
                configurationSignature: 'phase8-load-test',
                forecastLowConcurrentStreams: 700_000,
                forecastLikelyConcurrentStreams: 1_000_000,
                forecastHighConcurrentStreams: 1_550_000,
                testedBurstCapacity: 3_000_000,
                headroomPercent: 94,
                status: 'PASS',
                driverKeys: ['national-reach', 'event-original'],
                completedAtAbsoluteWeek: 2_101,
            },
        },
        capacity: {
            baselineConcurrentStreams: 1_500_000,
            burstConcurrentStreams: 3_000_000,
        },
        technologyLevels: {
            ...initial.technologyLevels,
            DELIVERY_CAPACITY: 20,
            RELIABILITY: 18,
            PLAYBACK_QUALITY: 12,
            CONTENT_OPERATIONS: 10,
            PRODUCT_EXPERIENCE: 8,
        },
        starterCatalog: {
            packageId: 'BROAD_APPEAL',
            ownedProjectIds: ['catalog-drama', 'catalog-comedy'],
            licensedProjectIds: [],
            establishedAtAbsoluteWeek: 2_101,
        },
        catalogProjectIds: ['catalog-drama', 'catalog-comedy'],
        originalCommissions: [{
            id: 'original-commission',
            scriptId: 'original-script',
            canonicalProjectId: 'original-project',
            title: 'Midnight Frequency',
            gapId: 'SERIES_RETENTION',
            projectType: 'SERIES',
            genre: 'MYSTERY',
            episodes: 8,
            producerStudioId: 'producer-studio',
            producerStudioName: 'Red Horizon Pictures',
            commissionedByPlatformName: 'Northstar+',
            productionBudgetCap: 50_000_000,
            productionFundingApplied: 45_000_000,
            status: 'GREENLIT',
            commissionedAtAbsoluteWeek: 2_102,
            greenlitAtAbsoluteWeek: 2_103,
        }],
        launchSlate: {
            revision: 1,
            programmedAtAbsoluteWeek: 2_104,
            entries: [
                {
                    id: 'slate-original',
                    projectId: 'original-project',
                    title: 'Midnight Frequency',
                    source: 'ORIGINAL',
                    projectType: 'SERIES',
                    genre: 'MYSTERY',
                    launchWeek: 1,
                    releasePattern: 'WEEKLY',
                    marketingPlan: 'EVENT',
                },
                {
                    id: 'slate-drama',
                    projectId: 'catalog-drama',
                    title: 'Glass City',
                    source: 'OWNED_LIBRARY',
                    projectType: 'MOVIE',
                    genre: 'DRAMA',
                    launchWeek: 3,
                    releasePattern: 'SINGLE_PREMIERE',
                    marketingPlan: 'STANDARD',
                },
                {
                    id: 'slate-comedy',
                    projectId: 'catalog-comedy',
                    title: 'After Hours',
                    source: 'OWNED_LIBRARY',
                    projectType: 'MOVIE',
                    genre: 'COMEDY',
                    launchWeek: 6,
                    releasePattern: 'SINGLE_PREMIERE',
                    marketingPlan: 'STANDARD',
                },
            ],
        },
        treasuryCash: 80_000_000,
        milestoneKeys: [
            'starter-catalog-established',
            'first-original-greenlit',
            'launch-slate-programmed',
        ],
    };
    const player: Player = {
        ...base,
        id: 'phase8-player',
        name: 'Launch Founder',
        age: 43,
        currentWeek: 8,
        pastProjects: [
            { id: 'catalog-drama', name: 'Glass City', projectType: 'MOVIE', genre: 'DRAMA' } as any,
            { id: 'catalog-comedy', name: 'After Hours', projectType: 'MOVIE', genre: 'COMEDY' } as any,
        ],
        commitments: [{
            id: 'original-project',
            name: 'Midnight Frequency',
            type: 'JOB',
            energyCost: 0,
            income: 0,
            payoutType: 'LUMPSUM',
            projectPhase: 'AWAITING_RELEASE',
            projectDetails: {
                title: 'Midnight Frequency',
                type: 'SERIES',
                genre: 'MYSTERY',
            } as any,
        }],
        ownedStreamingPlatform: platform,
    };
    const blueprintSignature = getStreamingLaunchDefinitionSignature(player);
    const withBlueprint: Player = {
        ...player,
        ownedStreamingPlatform: {
            ...player.ownedStreamingPlatform,
            launchProgram: {
                ...player.ownedStreamingPlatform.launchProgram,
                status: 'PLANNING',
                lastBlueprintSignature: blueprintSignature,
                blueprintSavedAtAbsoluteWeek: 2_104,
            },
        },
    };
    return {
        ...withBlueprint,
        ownedStreamingPlatform: {
            ...withBlueprint.ownedStreamingPlatform,
            launchProgram: {
                ...withBlueprint.ownedStreamingPlatform.launchProgram,
                lastBlueprintSignature: getStreamingLaunchDefinitionSignature(withBlueprint),
            },
        },
    };
};

const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 7 }, 'phase8-migration');
assert(migrated.schemaVersion === 23 && migrated.launchCommit === null, 'Schema v7 saves should migrate with a safe empty launch commit.');

const productionBlocked: Player = {
    ...createFixture(),
    commitments: createFixture().commitments.map(commitment => ({
        ...commitment,
        projectPhase: 'PRODUCTION',
    })),
};
const productionReadiness = getStreamingLaunchReadiness(productionBlocked);
assert(!productionReadiness.canLaunch, 'An unfinished Original must block premiere night.');
assert(productionReadiness.items.find(item => item.id === 'original')?.tone === 'BLOCKED', 'Original delivery needs a deep-linked blocker.');
assert(!commitOwnedStreamingLaunch(productionBlocked, 'STANDARD').changed, 'A blocked launch must not mutate state.');

const fixture = createFixture();
const readiness = getStreamingLaunchReadiness(fixture);
assert(readiness.canLaunch && readiness.blockerCount === 0, 'A delivered Original, live stack and canonical slate should open the commit window.');
assert(readiness.items.length >= 6, 'Launch Command should derive a complete go/no-go board.');
assert(readiness.capacityOptions.length === 3, 'Players should receive standard, cloud-burst and staggered premiere choices.');
assert(readiness.demandRegions.length >= 2, 'Earned reach should produce a modeled demand map.');

const cloudOption = readiness.capacityOptions.find(option => option.id === 'CLOUD_BURST')!;
assert(cloudOption.cost > 0 && cloudOption.protectedPeakConcurrentStreams > fixture.ownedStreamingPlatform.capacity.burstConcurrentStreams, 'Cloud burst should trade company treasury for real temporary protection.');
const treasuryBefore = fixture.ownedStreamingPlatform.treasuryCash;
const launched = commitOwnedStreamingLaunch(fixture, 'CLOUD_BURST');
assert(launched.changed && launched.launchCommit, 'A ready platform should commit its launch exactly once.');
assert(launched.player.ownedStreamingPlatform.lifecycle === 'ACTIVE', 'Launch commit should activate the platform.');
assert(launched.player.ownedStreamingPlatform.treasuryCash === treasuryBefore - cloudOption.cost, 'Emergency capacity should charge company treasury once.');
assert(launched.player.ownedStreamingPlatform.metrics.subscribers === launched.launchCommit?.initialSubscribers, 'Committed opening subscribers should become the first canonical metric.');
assert(launched.player.ownedStreamingPlatform.eventLedger.some(event => event.type === 'LAUNCH_COMMITTED'), 'Launch facts need a permanent ledger record.');
const premiere = launched.player.ownedStreamingPlatform.cinematicQueue.find(event => event.type === 'LAUNCH_NIGHT');
assert(premiere?.status === 'QUEUED', 'A committed launch should queue Premiere Night.');
assert(premiere?.factIds.every(id => launched.player.ownedStreamingPlatform.eventLedger.some(event => event.id === id)), 'Premiere Night must reference already-committed ledger facts.');

const launchedTwice = commitOwnedStreamingLaunch(launched.player, 'STANDARD');
assert(!launchedTwice.changed && launchedTwice.reason === 'ALREADY_LIVE', 'Launch must be idempotent after lifecycle activation.');
assert(launchedTwice.player.ownedStreamingPlatform.treasuryCash === launched.player.ownedStreamingPlatform.treasuryCash, 'A repeated launch action must not charge treasury twice.');
assert(launchedTwice.player.ownedStreamingPlatform.metrics.subscribers === launched.player.ownedStreamingPlatform.metrics.subscribers, 'A repeated action must not reroll subscribers.');

const underfunded: Player = {
    ...fixture,
    ownedStreamingPlatform: {
        ...fixture.ownedStreamingPlatform,
        treasuryCash: cloudOption.cost - 1,
    },
};
const underfundedResult = commitOwnedStreamingLaunch(underfunded, 'CLOUD_BURST');
assert(!underfundedResult.changed && underfundedResult.reason === 'INSUFFICIENT_TREASURY', 'Unaffordable emergency capacity must fail without a partial launch.');

const componentSource = readFileSync(resolve(process.cwd(), 'components/StreamingLaunchCommand.tsx'), 'utf8');
const premiereSource = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/StreamingPremiereExperience.tsx'), 'utf8');
const hqSource = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
const styleSource = readFileSync(resolve(process.cwd(), 'styles/streaming-launch.css'), 'utf8');
const premiereStyleSource = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/presentation/screens/PremiereNight/PremiereNight.module.css'), 'utf8');
[
    'Final readiness forecast',
    'Fix in',
    'Choose how the gates open.',
    'DEMAND MAP',
    'Commit platform launch',
    'Result locks before the premiere cinematic begins.',
    'COMMITTED RESULT',
].forEach(fragment => assert(componentSource.includes(fragment), `Phase 8 UI should include ${fragment}.`));
assert(hqSource.includes('<StreamingPremiereExperience'), 'Platform HQ should expose the transplanted Launch Command and premiere flow.');
assert(hqSource.includes('onLaunch={commitCinematicLaunch}'), 'The transplanted launch control must commit through the canonical launch transaction.');
assert(!hqSource.includes('StreamingLaunchCommand'), 'The legacy Launch Command must not re-enter the transplanted HQ flow.');
assert(premiereSource.includes('disabled={!launchAllowed}'), 'Canonical readiness blockers must disable the transplanted launch control.');
assert(styleSource.includes('@media (max-width: 620px)'), 'Launch Command should have a deliberate mobile layout.');
assert(premiereStyleSource.includes('@media (prefers-reduced-motion:reduce)'), 'Premiere animations should respect reduced-motion preferences.');

console.log('Streaming launch Phase 8 audit passed.');
