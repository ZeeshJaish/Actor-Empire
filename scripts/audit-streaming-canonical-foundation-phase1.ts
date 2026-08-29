import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    getStreamingLaunchBudgetView,
    getStreamingLaunchProgramView,
    getStreamingLocalizationPortfolioView,
    getStreamingMarketPortfolioView,
    getStreamingServiceConfigurationView,
    getStreamingTechnologyStatusView,
} from '../services/streamingPresentationModels';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const legacy = structuredClone(createInitialOwnedStreamingPlatformState('canonical-phase1')) as any;
legacy.schemaVersion = 22;
delete legacy.launchProgram;
delete legacy.marketOperations;
delete legacy.serviceConfiguration;
delete legacy.capabilities;
delete legacy.localizationOperations;
delete legacy.costCommitments;
legacy.lifecycle = 'FOUNDING';
legacy.treasuryCash = 12_000_000;
legacy.identity = {
    name: 'Northstar+',
    slug: 'northstar-plus',
    primaryColor: '#7357ff',
    secondaryColor: '#090b14',
    logoKey: 'SIGNAL_RING',
    soundIdentKey: 'ASCENT',
    brandPromiseId: 'EVERYONES_SCREEN',
    publicManifesto: 'A screen worth gathering around.',
    dayOneMarketIds: ['US', 'CA', 'MX'],
    launchServerCityId: null,
    foundedAtAbsoluteWeek: 200,
};
legacy.technologyLevels.PLAYBACK_QUALITY = 37;
legacy.competitiveWorld.regionalLaunches = [{
    regionId: 'EUROPE',
    status: 'IN_PROGRESS',
    capitalCost: 8_000_000,
    weeklyOperatingCost: 180_000,
    startedAtAbsoluteWeek: 205,
    readyAtAbsoluteWeek: 210,
    launchedAtAbsoluteWeek: null,
}];
legacy.originalCommissions = [{
    id: 'original-1',
    localization: {
        packageId: 'MULTI_REGION',
        subtitleLanguageCount: 6,
        dubbedLanguageCount: 2,
        readyAtAbsoluteWeek: 208,
    },
}];

const treasuryBefore = legacy.treasuryCash;
const normalized = normalizeOwnedStreamingPlatformState(legacy, 'canonical-phase1');
const normalizedAgain = normalizeOwnedStreamingPlatformState(normalized, 'canonical-phase1');

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 23, 'Phase 1 must advance the canonical streaming save schema to v23.');
assert(normalized.schemaVersion === 23, 'Legacy saves must normalize to the current canonical schema.');
assert(normalized.treasuryCash === treasuryBefore, 'Migration must never charge treasury cash.');
assert(JSON.stringify(normalizedAgain) === JSON.stringify(normalized), 'Canonical normalization must be idempotent.');
assert(normalized.marketOperations.filter(operation => operation.scope === 'COUNTRY').length === 3, 'Every legacy Day-One country must become one canonical country operation.');
assert(normalized.marketOperations.find(operation => operation.countryId === 'US')?.status === 'PLANNED', 'Unlaunched Day-One markets must remain plans, not become active by migration.');
assert(normalized.marketOperations.find(operation => operation.countryId === 'US')?.committedCosts.total === 0, 'Legacy market selection must not fabricate a paid commitment.');
assert(normalized.marketOperations.some(operation => operation.scope === 'LEGACY_REGION' && operation.regionId === 'EUROPE'), 'Broad regional expansion facts must remain available as explicit legacy-region operations.');
assert(normalized.serviceConfiguration.source === 'LEGACY_FOUNDING', 'The old ident must remain visible through a legacy service-configuration adapter.');
assert(normalized.serviceConfiguration.soundIdentKey === 'ASCENT', 'The old ident choice must survive migration exactly.');
assert(normalized.capabilities.legacyLevelFloors.PLAYBACK_QUALITY === 37, 'Existing technology levels must become inherited floors without granting new capabilities.');
assert(normalized.capabilities.installed.length === 0, 'Migration must not invent installed research capabilities.');
assert(normalized.localizationOperations.legacyPackageGrants.length === 1, 'Old package localization must remain represented without inventing language assets.');
assert(normalized.localizationOperations.titleLanguageAssets.length === 0, 'Migration must not fabricate title-language readiness.');

const player: Player = {
    ...structuredClone(INITIAL_PLAYER),
    id: 'canonical-phase1',
    ownedStreamingPlatform: normalized,
};
const marketView = getStreamingMarketPortfolioView(player);
const serviceView = getStreamingServiceConfigurationView(player);
const technologyView = getStreamingTechnologyStatusView(player);
const localizationView = getStreamingLocalizationPortfolioView(player);
const budgetView = getStreamingLaunchBudgetView(player);
const launchView = getStreamingLaunchProgramView(player);

assert(marketView.opening.length === 3, 'Presentation adapters must expose the opening portfolio from canonical country operations.');
assert(marketView.opening.find(card => card.operation.countryId === 'US')?.market?.country === 'United States', 'The existing Day-One country-card data must remain the visual content source.');
assert(marketView.opening.find(card => card.operation.countryId === 'MX')?.presentation.localName === 'México', 'The existing localized country presentation must remain reusable.');
assert(serviceView.configured && serviceView.soundIdentKey === 'ASCENT', 'Service screens must read the migrated ident through the canonical adapter.');
assert(technologyView.find(branch => branch.branch === 'PLAYBACK_QUALITY')?.inheritedLevelFloor === 37, 'Tech screens must read legacy progress through capability floors.');
assert(localizationView.legacyGrantCount === 1 && localizationView.readyAssetCount === 0, 'Localization screens must distinguish legacy packages from real language assets.');
assert(budgetView.availableTreasury === treasuryBefore && budgetView.plannedSpend > 0, 'The launch budget must distinguish previewed plans from available cash.');
assert(budgetView.shortfall > 0, 'The launch budget must expose a shortfall without allowing overlapping negative-money UI.');
assert(launchView.recommendedNextAction?.milestoneId === 'MARKET_CLEARANCES', 'The guided journey must derive one clear next step from canonical facts.');

const launchedLegacy = structuredClone(legacy);
launchedLegacy.lifecycle = 'ACTIVE';
launchedLegacy.launchCommit = { committedAtAbsoluteWeek: 214 };
const launched = normalizeOwnedStreamingPlatformState(launchedLegacy, 'canonical-phase1-launched');
assert(launched.launchProgram.status === 'LAUNCHED', 'A legacy launch commit must migrate to a completed launch program.');
assert(launched.marketOperations.filter(operation => operation.scope === 'COUNTRY').every(operation => operation.status === 'ACTIVE'), 'Legacy opening countries must remain active after launch migration.');
assert(launched.treasuryCash === treasuryBefore, 'Launched-save migration must also be financially inert.');

console.log('Streaming canonical foundation Phase 1 audit passed.');
