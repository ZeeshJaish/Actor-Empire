import { readFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    STREAMING_FOUNDING_STEP_COUNT,
    STREAMING_INCORPORATION_ECONOMY,
    createDefaultStreamingFoundingDraft,
    getStreamingIncorporationBreakdown,
    incorporateOwnedStreamingPlatform,
    saveStreamingFoundingDraft,
    validateStreamingFoundingDraft,
} from '../services/streamingFounding';
import {
    STREAMING_EXECUTIVE_CANDIDATES,
    STREAMING_FOUNDING_EXECUTIVE_ROLES,
    getStreamingFoundingExecutiveCandidates,
    resolveStreamingCompanyCapabilities,
} from '../services/streamingCompany';
import { PRODUCTION_LOCATION_CATALOG } from '../services/productionLocations';
import {
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    markOwnedStreamingCinematicStatus,
    normalizeOwnedStreamingPlatformState,
} from '../services/ownedStreamingPlatform';
import { resolveOwnedStreamingReach } from '../services/streamingProgression';
import {
    getRecommendedStreamingCoreCityIds,
    summarizeStreamingDayOneMarkets,
} from '../services/streamingDayOneMarkets';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

const eligiblePlayer = (id: string, money = 500_000_000): Player => ({
    ...clone(INITIAL_PLAYER),
    id,
    name: 'Founder Test',
    money,
    ownedStreamingPlatform: {
        ...clone(INITIAL_PLAYER.ownedStreamingPlatform),
        lifecycle: 'ELIGIBLE',
        simulationSeed: `owned-streaming:${id}`,
        milestoneKeys: ['streaming-launch-clearance'],
    },
});

const defaultDraft = createDefaultStreamingFoundingDraft(100);
const reviewDraft = { ...defaultDraft, currentStep: 2 };
const openingMarketSummary = summarizeStreamingDayOneMarkets(['US', 'CA', 'GB']);
assert(
    openingMarketSummary.marketCount === 3
        && openingMarketSummary.regionCount === 2
        && openingMarketSummary.streamingAudience === 303_000_000,
    'Day-One Market forecasts should aggregate deterministic country records.',
);
assert(
    getRecommendedStreamingCoreCityIds(['IN', 'ZA'], 2).join(',') === 'BOM,CPT',
    'The later Build should receive an editable cross-region city recommendation from the selected markets.',
);
assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'The fixed founding model should survive the current schema migration.');
assert(STREAMING_FOUNDING_STEP_COUNT === 3, 'Phase 3 should contain identity, promise, and fixed incorporation review.');
assert(
    !validateStreamingFoundingDraft(defaultDraft, 500_000_000).valid,
    'The company must reach the fixed review before incorporation.',
);
assert(validateStreamingFoundingDraft(reviewDraft, 500_000_000).valid, 'The balanced reviewed founding draft should be valid.');
assert(!validateStreamingFoundingDraft({ ...reviewDraft, name: ' ' }, 500_000_000).valid, 'A blank platform name must block incorporation.');
assert(
    !validateStreamingFoundingDraft(reviewDraft, STREAMING_INCORPORATION_ECONOMY.cashRequired - 1).valid,
    'The exact incorporation threshold must not be bypassed.',
);

const incorporationBreakdown = getStreamingIncorporationBreakdown(100_000_000);
assert(
    STREAMING_INCORPORATION_ECONOMY.cashRequired === 85_000_000
        && STREAMING_INCORPORATION_ECONOMY.setupCostsConsumed === 85_000_000
        && STREAMING_INCORPORATION_ECONOMY.openingTreasuryCash === 0,
    'V8 incorporation must fully consume the exact $85M charge and open treasury at $0.',
);
assert(
    incorporationBreakdown.affordable
        && incorporationBreakdown.remainingPersonalCash === 15_000_000
        && incorporationBreakdown.shortfall === 0,
    'The shared incorporation breakdown should expose the exact player-wallet result.',
);

const candidate = eligiblePlayer('founding-atomic');
const savedDraftPlayer = saveStreamingFoundingDraft(candidate, {
    ...reviewDraft,
    name: 'Northstar+',
    brandPromiseId: 'EVERYONES_SCREEN',
    publicManifesto: 'One screen. Every generation. No arguments.',
    visualMarkId: 'ORBIT',
    wordmarkStyleId: 'STACK',
    typefaceId: 'SERIF',
    soundIdentKey: 'ASCENT',
    dayOneMarketIds: ['US', 'CA', 'GB'],
    launchServerCityId: null,
});
assert(savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.currentStep === 2, 'The wizard should persist its three-step resume point.');
assert(
    savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.brandPromiseId === 'EVERYONES_SCREEN'
        && savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.publicManifesto === 'One screen. Every generation. No arguments.',
    'Public manifesto copy should persist separately without replacing the selected gameplay promise.',
);
assert(
    savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.wordmarkStyleId === 'STACK'
        && savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.typefaceId === 'SERIF'
        && savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.visualMarkId === 'ORBIT',
    'The legal mark, wordmark, and typeface should survive a resumable founding draft.',
);
assert(
    savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.soundIdentKey === undefined
        && savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.dayOneMarketIds === undefined
        && savedDraftPlayer.ownedStreamingPlatform.foundingDraft?.launchServerCityId === undefined,
    'Simplified founding must discard ident, market, and server configuration from new drafts.',
);
assert(savedDraftPlayer.ownedStreamingPlatform.identity === null, 'Saving a draft must not create the company early.');
assert(savedDraftPlayer.money === candidate.money, 'Saving draft progress must not charge the player.');

const beforeCash = savedDraftPlayer.money;
const incorporated = incorporateOwnedStreamingPlatform(savedDraftPlayer);
assert(incorporated.changed && incorporated.reason === 'INCORPORATED', 'A valid final review should incorporate the company.');
assert(incorporated.player.ownedStreamingPlatform.lifecycle === 'FOUNDING', 'Incorporation should move ELIGIBLE to FOUNDING.');
assert(incorporated.player.ownedStreamingPlatform.identity?.name === 'Northstar+', 'The chosen identity should become canonical only at incorporation.');
assert(
    incorporated.player.ownedStreamingPlatform.identity?.brandPromiseId === 'EVERYONES_SCREEN'
        && incorporated.player.ownedStreamingPlatform.identity?.publicManifesto === 'One screen. Every generation. No arguments.',
    'Incorporation should preserve custom public wording while gameplay remains keyed to brandPromiseId.',
);
assert(
    incorporated.player.ownedStreamingPlatform.identity?.wordmarkStyleId === 'STACK'
        && incorporated.player.ownedStreamingPlatform.identity?.typefaceId === 'SERIF'
        && incorporated.player.ownedStreamingPlatform.identity?.visualMarkId === 'ORBIT',
    'Incorporation should preserve the complete legal brand identity.',
);
assert(
    incorporated.player.ownedStreamingPlatform.identity?.soundIdentKey === undefined
        && incorporated.player.ownedStreamingPlatform.identity?.dayOneMarketIds === undefined
        && incorporated.player.ownedStreamingPlatform.identity?.launchServerCityId === undefined,
    'Incorporation must not silently configure ident, opening markets, or network placement.',
);
assert(incorporated.player.ownedStreamingPlatform.foundingDraft === null, 'The completed draft should be cleared atomically.');
const foundingProfile = incorporated.player.ownedStreamingPlatform.foundingProfile!;
assert(foundingProfile.incorporationModel === 'FIXED_V8_ZERO_TREASURY', 'New companies should use the fixed v8 zero-treasury incorporation model.');
assert(
    foundingProfile.founderCashCharged === 85_000_000
        && foundingProfile.setupCostsConsumed === 85_000_000
        && foundingProfile.openingTreasuryCash === 0,
    'The canonical profile should preserve the exact incorporation economics.',
);
assert(
    foundingProfile.outsideCapitalRaisedAtIncorporation === 0
        && foundingProfile.debtPrincipalAtIncorporation === 0
        && foundingProfile.founderOwnershipPercentAtIncorporation === 100
        && foundingProfile.founderWasCeoAtIncorporation,
    'Incorporation should create no debt, dilution, outside capital, or forced executive.',
);
assert(incorporated.player.ownedStreamingPlatform.founderOwnershipPercent === 100, 'Fixed incorporation should remain 100% player owned.');
assert(incorporated.player.ownedStreamingPlatform.treasuryCash === 0, 'Operating treasury should open unfunded.');
assert(incorporated.player.money === beforeCash - 85_000_000, 'Exactly $85M should leave personal cash.');
assert(incorporated.player.ownedStreamingPlatform.debtPrincipal === 0, 'Fixed incorporation must not create platform debt.');
assert(
    incorporated.player.ownedStreamingPlatform.marketOperations.length === 0
        && incorporated.player.ownedStreamingPlatform.serviceConfiguration.source === 'UNCONFIGURED'
        && incorporated.player.ownedStreamingPlatform.serviceConfiguration.soundIdentKey === null
        && incorporated.player.ownedStreamingPlatform.infrastructureSetupDraft === null
        && incorporated.player.ownedStreamingPlatform.infrastructureSetup === null
        && incorporated.player.ownedStreamingPlatform.costCommitments.length === 0,
    'The incorporated company should enter pre-launch headquarters with no operational configuration.',
);
assert(
    incorporated.player.ownedStreamingPlatform.capabilities.installed.length === 0
        && Object.values(incorporated.player.ownedStreamingPlatform.capabilities.legacyLevelFloors).every(level => level === 0)
        && Object.values(incorporated.player.ownedStreamingPlatform.technologyLevels).every(level => level === 0),
    'Technology should begin completely empty after simplified founding.',
);
assert(
    incorporated.player.ownedStreamingPlatform.leadership.currentCeo.holderType === 'FOUNDER'
        && incorporated.player.ownedStreamingPlatform.leadership.appointments.length === 0,
    'The founder should remain CEO while the optional leadership roster starts empty.',
);
const incorporationAction = incorporated.player.ownedStreamingPlatform.finance.capitalActions.find(
    action => action.type === 'INCORPORATION',
);
assert(
    incorporationAction?.amount === 85_000_000
        && incorporationAction.treasuryDelta === 0
        && incorporationAction.personalCashDelta === -85_000_000
        && incorporationAction.debtDelta === 0,
    'The finance ledger should record the exact atomic incorporation movement.',
);
const startingReach = resolveOwnedStreamingReach(incorporated.player);
assert(
    startingReach.available && startingReach.level === 0 && startingReach.key === 'LEVEL_0',
    'Every newly incorporated company should begin at earned Reach Level 0.',
);
const startingCapabilities = resolveStreamingCompanyCapabilities(incorporated.player);
assert(
    startingCapabilities.capabilities.HIRE_EXECUTIVE
        && startingCapabilities.capabilities.CONFIGURE_BASIC_INFRASTRUCTURE
        && !startingCapabilities.capabilities.ADVANCED_OPERATIONS,
    'Founder authority should unlock the base game while specialist leadership remains dynamically hireable.',
);
assert(
    incorporated.player.ownedStreamingPlatform.eventLedger.some(event => event.type === 'FOUNDATION_CREATED'),
    'Incorporation should create a deterministic foundation fact.',
);
assert(
    incorporated.player.ownedStreamingPlatform.cinematicQueue.some(event => event.type === 'FOUNDING_KEYNOTE' && event.status === 'QUEUED'),
    'The founding reveal should be queued from committed incorporation state.',
);
assert(
    incorporated.player.ownedStreamingPlatform.milestoneKeys.includes('platform-incorporated'),
    'Incorporation should store a durable milestone.',
);
assert(savedDraftPlayer.money === beforeCash, 'The service must not mutate its input player object.');

const repeated = incorporateOwnedStreamingPlatform(incorporated.player);
assert(!repeated.changed && repeated.reason === 'ALREADY_INCORPORATED', 'Repeated confirmation should be idempotent.');
assert(repeated.player.money === incorporated.player.money, 'Repeated confirmation must never charge twice.');

const queuedReveal = incorporated.player.ownedStreamingPlatform.cinematicQueue.find(event => event.type === 'FOUNDING_KEYNOTE')!;
const viewedPlatform = markOwnedStreamingCinematicStatus(
    incorporated.player.ownedStreamingPlatform,
    queuedReveal.id,
    'VIEWED',
);
assert(viewedPlatform.cinematicQueue.find(event => event.id === queuedReveal.id)?.status === 'VIEWED', 'Viewing the reveal should update only its presentation status.');
assert(markOwnedStreamingCinematicStatus(viewedPlatform, queuedReveal.id, 'DISMISSED').cinematicQueue.find(event => event.id === queuedReveal.id)?.status === 'VIEWED', 'A consumed cinematic should not be rewritten.');

const lowCashPlayer = saveStreamingFoundingDraft(
    eligiblePlayer('founding-low-cash', STREAMING_INCORPORATION_ECONOMY.cashRequired - 1),
    reviewDraft,
);
const lowCashResult = incorporateOwnedStreamingPlatform(lowCashPlayer);
assert(!lowCashResult.changed && lowCashResult.reason === 'INSUFFICIENT_CASH', 'An unaffordable founder commitment should fail without partial mutation.');
assert(
    lowCashResult.player.money === STREAMING_INCORPORATION_ECONOMY.cashRequired - 1
        && lowCashResult.player.ownedStreamingPlatform.identity === null,
    'Failed incorporation must not move cash or create identity.',
);

const lockedSaveAttempt = saveStreamingFoundingDraft(clone(INITIAL_PLAYER), reviewDraft);
assert(lockedSaveAttempt.ownedStreamingPlatform.foundingDraft === null, 'A locked career must not create a founding draft.');

const migratedV1 = normalizeOwnedStreamingPlatformState({
    schemaVersion: 1,
    lifecycle: 'ELIGIBLE',
    founderOwnershipPercent: 100,
    infrastructureStrategy: 'UNDECIDED',
    identity: null,
}, 'phase3-migration');
assert(migratedV1.schemaVersion === OWNED_STREAMING_PLATFORM_SCHEMA_VERSION, 'Phase 1 saves should normalize to the Phase 3 platform schema.');
assert(migratedV1.foundingDraft === null && migratedV1.foundingProfile === null, 'Older saves should receive safe empty founding fields.');
assert(migratedV1.treasuryCash === 0 && migratedV1.debtPrincipal === 0, 'Older saves should receive safe financial defaults.');

assert(PRODUCTION_LOCATION_CATALOG.length === 29, 'Streaming and Greenlight should share the complete 29-city production location catalog.');
STREAMING_FOUNDING_EXECUTIVE_ROLES.forEach(role => {
    assert(
        STREAMING_EXECUTIVE_CANDIDATES.filter(candidate => candidate.role === role).length >= 5,
        `${role} should have enough real candidates to rotate the founding shortlist.`,
    );
});
const foundingExecutiveMarket = getStreamingFoundingExecutiveCandidates(candidate, 4);
STREAMING_FOUNDING_EXECUTIVE_ROLES.forEach(role => {
    assert(
        foundingExecutiveMarket.filter(executive => executive.role === role).length === 4,
        `${role} should show four deterministic founding choices.`,
    );
});
assert(
    JSON.stringify(getStreamingFoundingExecutiveCandidates(candidate, 4)) === JSON.stringify(foundingExecutiveMarket),
    'The founding executive market must remain stable while the player is making a choice.',
);

const boundedContributionActions = Array.from({ length: 80 }, (_, index) => ({
    id: `bounded-contribution-${index}`,
    idempotencyKey: `bounded-contribution:${index}`,
    type: 'FOUNDER_CONTRIBUTION' as const,
    absoluteWeek: 101 + index,
    amount: 1_000_000,
    treasuryDelta: 1_000_000,
    personalCashDelta: -1_000_000,
    debtDelta: 0,
    ownershipBefore: 100,
    ownershipAfter: 100,
}));
const boundedFinanceOnce = normalizeOwnedStreamingPlatformState({
    ...incorporated.player.ownedStreamingPlatform,
    finance: {
        ...incorporated.player.ownedStreamingPlatform.finance,
        capitalActions: [
            incorporationAction!,
            ...boundedContributionActions,
        ],
    },
}, incorporated.player.id);
const boundedFinanceTwice = normalizeOwnedStreamingPlatformState(
    boundedFinanceOnce,
    incorporated.player.id,
);
assert(
    boundedFinanceOnce.finance.capitalActions.length === 80
        && boundedFinanceOnce.finance.capitalActions[0]?.type === 'INCORPORATION',
    'Bounded finance history should permanently reserve one slot for incorporation.',
);
assert(
    !boundedFinanceOnce.finance.capitalActions.some(action => action.idempotencyKey === 'bounded-contribution:0')
        && boundedFinanceOnce.finance.capitalActions.some(action => action.idempotencyKey === 'bounded-contribution:79'),
    'Bounded finance history should retain incorporation plus the newest real capital actions.',
);
assert(
    JSON.stringify(boundedFinanceTwice.finance.capitalActions)
        === JSON.stringify(boundedFinanceOnce.finance.capitalActions),
    'Capital-action normalization must be idempotent at the persistence limit.',
);

const componentSource = readFileSync('components/StreamingFoundingWizard.tsx', 'utf8');
const styleSource = readFileSync('styles/streaming-founding.css', 'utf8');
const entrySource = readFileSync('components/StreamingLockedScreen.tsx', 'utf8');
const journeySource = readFileSync('components/StreamingFoundingJourney.tsx', 'utf8');
const transplantSource = readFileSync('components/streaming-transplant/StreamingPrototypeOrchestrator.tsx', 'utf8');
const cinematicSource = readFileSync('components/streaming-transplant/StreamingCinematicsExperience.tsx', 'utf8');
const cinematicCssSource = readFileSync('components/streaming-transplant/presentation/screens/Cinematics/Cinematics.module.css', 'utf8');
const greenlightSource = readFileSync('views/lifestyle/business/GreenlightWizard.tsx', 'utf8');
const npcSource = readFileSync('services/npcLogic.ts', 'utf8');

[
    'BRAND STUDIO',
    'AUDIENCE PROMISE',
    'FIXED INCORPORATION CHARTER',
    'Your first $85M has one job.',
    '100% founder-owned',
    'No cash moves until you confirm',
    'AccessibleDialog',
    'aria-labelledby="founding-reveal-title"',
    'Replay reveal',
].forEach(fragment => {
    assert(componentSource.includes(fragment), `Phase 3 UI should include ${fragment}.`);
});
assert(entrySource.includes('<StreamingFoundingWizard'), 'The eligible streaming entry should route into the founding wizard.');
assert(!journeySource.includes('getStreamingFoundingExecutiveCandidates'), 'Founding must remain a solo-founder flow; executive hiring belongs in the later Boardroom system.');
assert(!journeySource.includes('getGenderedAvatar(candidate.gender, candidate.name)'), 'The founding journey must not render the retired executive-selection table.');
assert(
    transplantSource.includes("const STEPS = ['NAME', 'MARK', 'WORDMARK', 'TYPE', 'COLOUR', 'MANIFESTO', 'BILL']"),
    'The live wizard should expose only the simplified legal founding sequence.',
);
assert(!transplantSource.includes("step === 'IDENT'"), 'Ident configuration must not appear during founding.');
assert(!transplantSource.includes("step === 'LAYOUT'"), 'Storefront configuration must not appear during founding.');
assert(!transplantSource.includes("step === 'REGIONS'"), 'Day-One Markets must not appear during founding.');
assert(!journeySource.includes('createDefaultStreamingInfrastructureDraft'), 'Incorporation must not create an infrastructure draft automatically.');
assert(!journeySource.includes('saveStreamingInfrastructureDraft'), 'Incorporation must not save infrastructure planning automatically.');
assert(!journeySource.includes('<Activation'), 'The live founding handoff must not fake configured territories, devices, DRM, or an ident.');
assert(journeySource.includes("onOpenHeadquarters('FINANCE')"), 'The completed filing should enter the unfunded pre-launch headquarters through Finance.');
assert(!transplantSource.includes('LAUNCH DATA CENTRE'), 'Founding must not purchase or limit a data-centre location.');
assert(greenlightSource.includes('PRODUCTION_LOCATIONS_BY_CONTINENT'), 'Greenlight should use the same shared location catalog as streaming.');
assert(npcSource.includes('STREAMING_EXECUTIVE_NPCS') && npcSource.includes("occupation: 'EXECUTIVE'"), 'Streaming executives should live in the canonical NPC database.');
assert(cinematicSource.includes('Open {brand.name} Streaming Hall'), 'The activation exit should name the player platform and Streaming Hall.');
assert(cinematicCssSource.includes('.liveover') && cinematicCssSource.includes('pointer-events:auto'), 'The activation exit overlay must remain clickable.');
assert(styleSource.includes('@media (min-width: 768px)'), 'The wizard should include tablet layout behavior.');
assert(styleSource.includes('@media (min-width: 1100px)'), 'The wizard should include desktop layout behavior.');
assert(styleSource.includes('@media (prefers-reduced-motion: reduce)'), 'The wizard should respect reduced motion.');
assert(styleSource.includes('env(safe-area-inset-bottom)'), 'The wizard footer and reveal should respect mobile safe areas.');
assert(!componentSource.includes('real-time'), 'The founding wizard should not introduce real-time waiting.');
['LAUNCH FOOTPRINT', 'OWNERSHIP & FUNDING', 'FOUNDING TEAM', 'LAUNCH BUDGET'].forEach(fragment => {
    assert(!componentSource.includes(fragment), `V7 founding should not ask for the removed ${fragment} choice.`);
});

console.log('EMPIRE+ Phase 2 simplified founding audit passed.');
