import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    normalizeOwnedStreamingPlatformState,
} from '../services/ownedStreamingPlatform';
import {
    STREAMING_CAPACITY_PACKAGES,
    STREAMING_INFRASTRUCTURE_STRATEGIES,
    STREAMING_ROLLOUT_PACES,
    STREAMING_SUBSCRIPTION_TIERS,
    commitStreamingInfrastructureSetup,
    createDefaultStreamingInfrastructureDraft,
    getStreamingInfrastructureForecast,
    runStreamingInfrastructureLoadTest,
    saveStreamingInfrastructureDraft,
    validateStreamingInfrastructureDraft,
} from '../services/streamingInfrastructure';
import {
    createDefaultStreamingFoundingDraft,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
} from '../services/streamingFounding';
import { getStreamingHqSnapshot } from '../services/streamingHq';
import { resolveOwnedStreamingReach } from '../services/streamingProgression';
import { contributeStreamingFounderCapital } from '../services/streamingCompany';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const createIncorporatedPlayer = (): Player => {
    const eligible: Player = {
        ...clone(INITIAL_PLAYER),
        id: 'phase5-infrastructure-founder',
        name: 'Infrastructure Founder',
        money: 900_000_000,
        ownedStreamingPlatform: {
            ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
            lifecycle: 'ELIGIBLE',
            simulationSeed: 'owned-streaming:phase5-infrastructure-founder',
            milestoneKeys: ['streaming-launch-clearance'],
        },
    };
    const drafted = saveStreamingFoundingDraft(eligible, {
        ...createDefaultStreamingFoundingDraft(100),
        currentStep: 2,
        name: 'Northstar+',
        dayOneMarketIds: ['US', 'CA'],
        launchServerCityId: null,
    });
    const result = incorporateOwnedStreamingPlatform(drafted);
    assert(result.changed, 'The Phase 5 fixture should incorporate successfully.');
    const funded = contributeStreamingFounderCapital(result.player, 100_000_000, 'phase5-opening-capital');
    assert(funded.changed, 'The Phase 5 fixture should explicitly fund company treasury after incorporation.');
    return funded.player;
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 27, 'The current schema should retain Phase 5 infrastructure fields and pending revisions.');
assert(STREAMING_INFRASTRUCTURE_STRATEGIES.length === 3, 'Cloud, owned and hybrid strategies should all remain available.');
assert(
    STREAMING_CAPACITY_PACKAGES.map(item => item.id).join(',') === 'STARTER,ESSENTIAL,GROWTH,PREMIERE',
    'Phase 5 should offer the entry-level Starter Rack plus three earned expansion packages.',
);
assert(STREAMING_ROLLOUT_PACES.some(item => item.id === 'STANDARD'), 'Legacy saves must retain a neutral rollout value.');
assert(STREAMING_SUBSCRIPTION_TIERS.map(item => item.id).join(',') === 'BASIC,PREMIUM,FAMILY', 'Basic, Premium and Family should be the opening subscription tiers.');

const incorporated = createIncorporatedPlayer();
assert(incorporated.ownedStreamingPlatform.treasuryCash === 100_000_000, 'Infrastructure should begin only after an explicit founder capital injection.');
assert(resolveOwnedStreamingReach(incorporated).level === 0, 'An incorporated platform should begin at Reach Level 0.');
const defaultDraft = createDefaultStreamingInfrastructureDraft(incorporated);
assert(defaultDraft.strategy === 'HYBRID', 'An undecided foundation should receive the balanced Hybrid suggestion without locking the choice.');
assert(defaultDraft.capacityPackageId === 'STARTER', 'A new company should begin with the affordable entry-level Starter Rack.');
assert(defaultDraft.currentStep === 0, 'A fresh setup should begin at network design.');
assert(defaultDraft.networkPlacements.length === 0, 'A new company must choose its first network instead of receiving hidden placements.');
const chosenDraft = {
    ...defaultDraft,
    networkPlacements: [{ cityId: 'LA', racks: 2, role: 'CORE_ORIGIN' as const }],
};
assert(getStreamingInfrastructureForecast(incorporated, chosenDraft).reachLevel === 1, 'The opening load model should project the Regional reach earned by the player-selected Starter Rack.');

const cloudForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    strategy: 'CLOUD_FIRST',
});
const ownedForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    strategy: 'OWNED_INFRASTRUCTURE',
});
assert(cloudForecast.upfrontCost < ownedForecast.upfrontCost, 'Cloud-first should require less opening capital than owned infrastructure.');
assert(cloudForecast.weeklyOperatingCost > ownedForecast.weeklyOperatingCost, 'Cloud-first should cost more per operating week than owned infrastructure.');
assert(cloudForecast.burstConcurrentStreams > ownedForecast.burstConcurrentStreams, 'Cloud-first should provide more elastic premiere burst capacity.');
assert(cloudForecast.buildWeeks <= ownedForecast.buildWeeks, 'Cloud-first must never take longer than an equivalent owned build.');

const safeForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    rolloutPace: 'SAFE',
});
const rushedForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    rolloutPace: 'RUSHED',
});
assert(safeForecast.buildWeeks === rushedForecast.buildWeeks, 'A retired hidden pace value must not change construction time.');
assert(safeForecast.transactionCost === rushedForecast.transactionCost, 'A retired hidden pace value must not change build cost.');
assert(safeForecast.technicalDebt === rushedForecast.technicalDebt, 'A retired hidden pace value must not create technical debt.');
assert(safeForecast.reliabilityTarget === rushedForecast.reliabilityTarget, 'A retired hidden pace value must not change reliability.');
assert(safeForecast.buildWeeks >= 4 && safeForecast.buildWeeks <= 15, 'Every infrastructure forecast must remain inside the disclosed 4–15 week range.');

const nationalForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    capacityPackageId: 'GROWTH',
    networkPlacements: [
        { cityId: 'LA', racks: 20, role: 'CORE_ORIGIN' },
        { cityId: 'NYC', racks: 2, role: 'REGIONAL_HUB' },
        { cityId: 'TOR', racks: 2, role: 'EDGE_CACHE' },
    ],
});
assert(nationalForecast.reachLevel === 2, 'A physically expanded network should project the National reach its real capacity earns.');
const failureForecast = getStreamingInfrastructureForecast(incorporated, {
    ...chosenDraft,
    strategy: 'OWNED_INFRASTRUCTURE',
    capacityPackageId: 'STARTER',
    rolloutPace: 'RUSHED',
});
assert(failureForecast.reachLevel === 1, 'Infrastructure demand should follow the reach projected from the proposed stack, not a founding launch-scale choice.');
assert(failureForecast.loadTestStatus === 'FAIL', 'A rigid Starter Rack should be allowed to expose a Regional premiere overload risk.');
assert(failureForecast.demandDrivers.length >= 4, 'Capacity forecast should expose its important drivers.');
assert(failureForecast.demandDrivers.some(driver => driver.label.includes('network city')), 'Capacity forecast should explain the physical city plan.');
assert(failureForecast.forecastLowConcurrentStreams < failureForecast.forecastLikelyConcurrentStreams, 'Demand should be presented as an ordered range.');
assert(failureForecast.forecastLikelyConcurrentStreams < failureForecast.forecastHighConcurrentStreams, 'High-case demand should remain visibly distinct from likely demand.');

const playerCashBeforeDraft = incorporated.money;
const treasuryBeforeDraft = incorporated.ownedStreamingPlatform.treasuryCash;
const saved = saveStreamingInfrastructureDraft(incorporated, {
    ...chosenDraft,
    currentStep: 2,
    assistedPlanApproved: true,
    assistedPlanClass: 'GROWTH',
});
assert(saved.ownedStreamingPlatform.infrastructureSetupDraft?.currentStep === 2, 'The setup should persist interrupted-flow progress.');
assert(saved.ownedStreamingPlatform.infrastructureSetupDraft?.assistedPlanApproved === true, 'An approved assisted plan must remain approved after persistence.');
assert(saved.ownedStreamingPlatform.infrastructureSetupDraft?.assistedPlanClass === 'GROWTH', 'The approved assisted plan class must survive persistence.');
assert(
    (saved.ownedStreamingPlatform.infrastructureSetupDraft?.regionPlans?.length || 0) > 0,
    'Saving an older facility drawing must derive durable regional intent.',
);
assert(saved.money === playerCashBeforeDraft, 'Saving infrastructure choices must not touch personal money.');
assert(saved.ownedStreamingPlatform.treasuryCash === treasuryBeforeDraft, 'Saving infrastructure choices must not charge company treasury.');

const untestedValidation = validateStreamingInfrastructureDraft(saved);
assert(untestedValidation.issues.some(issue => issue.code === 'LOAD_TEST_REQUIRED'), 'The exact configuration must be load tested before approval.');
const tested = runStreamingInfrastructureLoadTest(saved);
assert(tested.changed, 'Running a new configuration load test should persist its signature.');
assert(
    tested.player.ownedStreamingPlatform.infrastructureSetupDraft?.lastLoadTestSignature === tested.forecast.configurationSignature,
    'The completed load test should be tied to the exact infrastructure signature.',
);

const changedAfterTest = saveStreamingInfrastructureDraft(tested.player, {
    ...tested.player.ownedStreamingPlatform.infrastructureSetupDraft!,
    rolloutPace: 'RUSHED',
});
assert(
    changedAfterTest.ownedStreamingPlatform.infrastructureSetupDraft?.rolloutPace === 'STANDARD',
    'Retired rollout choices must normalize to the neutral value instead of remaining as hidden gameplay state.',
);
assert(
    !validateStreamingInfrastructureDraft(changedAfterTest).issues.some(issue => issue.code === 'LOAD_TEST_REQUIRED'),
    'A retired rollout field must not invalidate an otherwise current load test.',
);

const invalidPricingDraft = {
    ...tested.player.ownedStreamingPlatform.infrastructureSetupDraft!,
    subscriptionPrices: {
        BASIC: 12.99,
        PREMIUM: 13.99,
        FAMILY: 15.99,
    },
};
assert(
    validateStreamingInfrastructureDraft(tested.player, invalidPricingDraft).issues.some(issue => issue.code === 'PRICE_ORDER'),
    'Pricing should preserve understandable value separation between tiers.',
);

const beforeCommitTreasury = tested.player.ownedStreamingPlatform.treasuryCash;
const beforeCommitPersonalCash = tested.player.money;
const committed = commitStreamingInfrastructureSetup(tested.player);
assert(committed.changed && committed.reason === 'COMMITTED', 'A tested and affordable setup should commit atomically.');
assert(committed.player.money === beforeCommitPersonalCash, 'Infrastructure setup should never charge personal money.');
assert(
    committed.player.ownedStreamingPlatform.treasuryCash === beforeCommitTreasury - committed.forecast.transactionCost,
    'Only the company treasury should pay the disclosed capital commitment.',
);
assert(committed.player.ownedStreamingPlatform.infrastructureSetup !== null, 'The approved setup should become canonical company state.');
assert(committed.player.ownedStreamingPlatform.infrastructureSetupDraft === null, 'The approved draft should clear atomically.');
assert(committed.player.ownedStreamingPlatform.infrastructureSetup?.capacityPackageId === 'STARTER', 'The affordable Starter Rack should remain the canonical first setup.');
assert(committed.player.ownedStreamingPlatform.infrastructureSetup?.networkPlacements[0]?.cityId === 'LA', 'The committed setup should retain the actual server city.');
assert(committed.player.ownedStreamingPlatform.infrastructureSetup?.networkPlacements[0]?.racks >= 1, 'The committed setup should retain the actual rack count.');
assert(
    (committed.player.ownedStreamingPlatform.infrastructureSetup?.regionPlans?.length || 0) > 0,
    'Commissioning must retain the canonical regional plan independently from facility placement.',
);
assert(committed.player.ownedStreamingPlatform.capacity.baselineConcurrentStreams === committed.forecast.baselineConcurrentStreams, 'Canonical capacity should match the approved forecast.');
assert(committed.player.ownedStreamingPlatform.capacity.burstConcurrentStreams === committed.forecast.burstConcurrentStreams, 'Canonical burst capacity should match the load-tested setup.');
assert(committed.player.ownedStreamingPlatform.subscriptionPrices.BASIC === defaultDraft.subscriptionPrices.BASIC, 'Approved Basic pricing should persist.');
assert(committed.player.ownedStreamingPlatform.milestoneKeys.includes('infrastructure-and-plans-configured'), 'Phase 5 should create the durable infrastructure milestone.');
assert(
    committed.player.ownedStreamingPlatform.eventLedger.some(event => event.type === 'INFRASTRUCTURE_COMMITTED'),
    'The atomic commitment should create an auditable company fact.',
);
assert(committed.player.ownedStreamingPlatform.technologyLevels.DELIVERY_CAPACITY > 0, 'Starting capacity should activate the delivery branch.');
assert(committed.player.ownedStreamingPlatform.technologyLevels.RELIABILITY > 0, 'Starting reliability should activate the reliability branch.');
assert(committed.player.ownedStreamingPlatform.metrics.subscribers === 0, 'Phase 5 must not grant subscribers.');
assert(committed.player.ownedStreamingPlatform.metrics.averageRevenuePerUser === 0, 'Planned ARPU must not become real ARPU before launch.');
assert(resolveOwnedStreamingReach(committed.player).level === 1, 'The Starter Rack should earn Regional reach once the first delivery stack is committed.');
const committedStateForecast = getStreamingInfrastructureForecast(committed.player);
assert(
    committed.player.ownedStreamingPlatform.infrastructureSetup?.loadTest.configurationSignature === committedStateForecast.configurationSignature,
    'The committed load test must remain current after the purchased stack raises earned reach.',
);
assert(
    committed.forecast.reachLevel === resolveOwnedStreamingReach(committed.player).level,
    'The approval forecast should model the reach created by the proposed infrastructure, not the pre-purchase company.',
);

const hqSnapshot = getStreamingHqSnapshot(committed.player);
assert(hqSnapshot.infrastructureConfigured, 'HQ should recognize the canonical setup.');
assert(hqSnapshot.completedChecklistItems === 2, 'Infrastructure approval should advance the launch checklist to two completed items.');
assert(hqSnapshot.loadTestStatus === committed.forecast.loadTestStatus, 'HQ should display the committed load-test status.');
assert(hqSnapshot.infrastructureWeeklyCost === committed.forecast.weeklyOperatingCost, 'HQ weekly cost should derive from the committed setup.');

const repeated = commitStreamingInfrastructureSetup(committed.player);
assert(!repeated.changed && repeated.reason === 'ALREADY_CONFIGURED', 'Repeated approval of the same committed state must not charge twice.');
assert(repeated.player.ownedStreamingPlatform.treasuryCash === committed.player.ownedStreamingPlatform.treasuryCash, 'Repeated approval must preserve company cash.');

const priceDraft = createDefaultStreamingInfrastructureDraft(committed.player);
const testedPriceDraftPlayer = saveStreamingInfrastructureDraft(committed.player, {
    ...priceDraft,
    subscriptionPrices: {
        ...priceDraft.subscriptionPrices,
        BASIC: 8.49,
    },
});
const priceRevision = commitStreamingInfrastructureSetup(testedPriceDraftPlayer);
assert(priceRevision.changed, 'Pre-launch pricing should remain revisable.');
assert(priceRevision.forecast.transactionCost === 0, 'A pricing-only revision should not create a fake infrastructure capital bill.');
assert(priceRevision.player.ownedStreamingPlatform.subscriptionPrices.BASIC === 8.49, 'Pricing revision should persist the explicit player choice.');

const lowTreasuryPlayer: Player = {
    ...tested.player,
    ownedStreamingPlatform: {
        ...tested.player.ownedStreamingPlatform,
        treasuryCash: 1,
    },
};
const unaffordable = commitStreamingInfrastructureSetup(lowTreasuryPlayer);
assert(!unaffordable.changed && unaffordable.reason === 'INSUFFICIENT_TREASURY', 'Unaffordable approval should fail without partial mutation.');
assert(unaffordable.player.ownedStreamingPlatform.infrastructureSetup === null, 'Failed approval must not create infrastructure.');

const migratedPhase4 = normalizeOwnedStreamingPlatformState({
    ...clone(incorporated.ownedStreamingPlatform),
    schemaVersion: 3,
    infrastructureSetupDraft: undefined,
    infrastructureSetup: undefined,
    subscriptionPrices: undefined,
});
assert(migratedPhase4.schemaVersion === OWNED_STREAMING_PLATFORM_SCHEMA_VERSION, 'Phase 4 saves should normalize into the current streaming schema.');
assert(migratedPhase4.infrastructureSetup === null && migratedPhase4.infrastructureSetupDraft === null, 'Older saves should receive safe empty infrastructure records.');
assert(migratedPhase4.subscriptionPrices.BASIC === 7.99, 'Older saves should receive balanced default pricing without fake subscribers.');

const componentSource = readFileSync('components/StreamingInfrastructureSetup.tsx', 'utf8');
const buildSource = readFileSync('components/streaming-transplant/StreamingBuildoutExperience.tsx', 'utf8');
const hqSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const styleSource = readFileSync('styles/streaming-infrastructure.css', 'utf8');
const serviceSource = readFileSync('services/streamingInfrastructure.ts', 'utf8');
const phase5Source = `${componentSource}\n${buildSource}\n${hqSource}\n${serviceSource}`;

[
    'NETWORK DESIGN',
    'DELIVERY PLAN',
    'LOAD LAB',
    'PLAN STUDIO',
    'OPERATING REVIEW',
    'Nothing is charged until final CEO approval.',
    'Range, not a promise',
    'Basic',
    'Premium',
    'Family',
    'Continue with risk',
    'This approves capacity and prices only.',
].forEach(fragment => assert(phase5Source.includes(fragment), `Phase 5 UI should include ${fragment}.`));
assert(hqSource.includes('setShowCinematicBuild(true)'), 'Technology Campus should route infrastructure work into the canonical Build room.');
assert(!hqSource.includes('<StreamingInfrastructureSetup'), 'HQ must not expose the retired duplicate infrastructure configurator.');
assert(buildSource.includes('isBuilt'), 'The Build room should resume and revise already-commissioned infrastructure.');
assert(styleSource.includes('env(safe-area-inset-bottom)'), 'Phase 5 footer should respect mobile safe areas.');
assert(styleSource.includes('@media (min-width: 700px)'), 'Phase 5 should adapt beyond phone widths.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'Phase 5 should respect reduced-motion preferences.');
assert(!serviceSource.includes('Math.random'), 'Infrastructure forecasts must remain deterministic.');
assert(!componentSource.includes('real-time'), 'Infrastructure construction must use game weeks, not real-time waiting.');
assert(!componentSource.includes('Buy stronger server'), 'Phase 5 must not frame gameplay power as a commercial purchase.');

console.log('EMPIRE+ Phase 5 infrastructure and subscription setup audit passed.');
