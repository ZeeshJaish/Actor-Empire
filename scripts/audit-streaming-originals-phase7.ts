import { readFileSync } from 'node:fs';
import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import {
    STREAMING_MINIMUM_ORIGINAL_BUDGET,
    commissionFirstStreamingOriginal,
    createDefaultStreamingOriginalDraft,
    createRecommendedStreamingSlate,
    finalizeOwnedStreamingOriginalGreenlight,
    getStreamingAudienceGaps,
    getStreamingOriginalLiveStatus,
    getStreamingSlateCandidates,
    getStreamingSlateWarnings,
    programStreamingLaunchSlate,
} from '../services/streamingOriginals';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const platform = createInitialOwnedStreamingPlatformState('phase7-player');
    return {
        ...base,
        id: 'phase7-player',
        name: 'Originals Founder',
        age: 43,
        currentWeek: 8,
        businesses: [{
            id: 'producer-studio',
            name: 'Red Horizon Pictures',
            type: 'PRODUCTION_HOUSE',
            subtype: 'MAJOR_STUDIO',
            logo: 'RH',
            color: '#7b5cff',
            foundedWeek: 1,
            balance: 420_000_000,
            isActive: true,
            config: {} as any,
            stats: {} as any,
            staff: [],
            products: [],
            hiringPool: [],
            lastHiringRefreshWeek: 0,
            history: [],
            studioState: {
                scripts: [],
                concepts: [],
                writers: [],
                ipMarket: [],
                lastMarketRefreshWeek: 0,
                lastWriterRefreshWeek: 0,
                lockedStreamingFunds: [],
                productionFund: 0,
            },
        }],
        pastProjects: [
            { id: 'catalog-movie', name: 'Glass City', studioId: 'producer-studio', projectType: 'MOVIE', genre: 'THRILLER', rating: 7.8 } as any,
            { id: 'catalog-series', name: 'Long Winter', studioId: 'producer-studio', projectType: 'SERIES', genre: 'DRAMA', rating: 8.1 } as any,
            { id: 'catalog-comedy', name: 'After Hours', studioId: 'producer-studio', projectType: 'MOVIE', genre: 'COMEDY', rating: 7.2 } as any,
        ],
        ownedStreamingPlatform: {
            ...platform,
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
            starterCatalog: {
                packageId: 'BROAD_APPEAL',
                ownedProjectIds: ['catalog-movie', 'catalog-series', 'catalog-comedy'],
                licensedProjectIds: [],
                establishedAtAbsoluteWeek: 2_101,
            },
            catalogProjectIds: ['catalog-movie', 'catalog-series', 'catalog-comedy'],
            treasuryCash: 300_000_000,
            milestoneKeys: ['starter-catalog-established'],
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 25, 'The current schema should retain the Phase 7 Original and slate records.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 5 }, 'legacy-phase7');
assert(migrated.schemaVersion === 25, 'Phase 5 saves should normalize to the current schema.');
assert(migrated.originalCommissionDraft === null && migrated.originalCommissions.length === 0, 'Older saves should receive safe empty Original records.');
assert(migrated.launchSlateDraft === null && migrated.launchSlate === null, 'Older saves should receive safe empty slate records.');

const fixture = createFixture();
const gaps = getStreamingAudienceGaps(fixture);
assert(gaps.length === 4, 'Audience research should produce four explainable commissioning opportunities.');
assert(gaps.every(gap => gap.demandScore > 0 && gap.rationale.length > 20), 'Audience gaps need player-facing evidence and a demand signal.');

const draft = {
    ...createDefaultStreamingOriginalDraft(fixture),
    currentStep: 3,
    title: 'Midnight Frequency',
    projectType: 'SERIES' as const,
    genre: 'MYSTERY' as const,
    episodes: 8,
    producerStudioId: 'producer-studio',
    productionBudgetCap: 100_000_000,
};

const underfundedFixture: Player = {
    ...createFixture(),
    ownedStreamingPlatform: {
        ...createFixture().ownedStreamingPlatform,
        treasuryCash: STREAMING_MINIMUM_ORIGINAL_BUDGET - 1,
    },
};
const underfundedResult = commissionFirstStreamingOriginal(underfundedFixture, {
    ...draft,
    productionBudgetCap: STREAMING_MINIMUM_ORIGINAL_BUDGET,
});
assert(
    !underfundedResult.changed && underfundedResult.reason === 'INSUFFICIENT_TREASURY',
    'The service must reject an Original when treasury cannot back the $5M minimum cap.',
);
assert(
    underfundedResult.player.ownedStreamingPlatform.treasuryCash
        === STREAMING_MINIMUM_ORIGINAL_BUDGET - 1
        && underfundedResult.player.ownedStreamingPlatform.originalCommissions.length === 0,
    'An underfunded Original attempt must not reserve cash or create a commission.',
);

const beforeTreasury = fixture.ownedStreamingPlatform.treasuryCash;
const beforeStudioCash = fixture.businesses[0].balance;
const commissioned = commissionFirstStreamingOriginal(fixture, draft);
assert(commissioned.changed && commissioned.target, 'A valid mandate should commission the first Original.');
assert(commissioned.player.ownedStreamingPlatform.treasuryCash === beforeTreasury - draft.productionBudgetCap, 'The commission cap should reserve EMPIRE+ treasury once.');
assert(commissioned.player.businesses[0].balance === beforeStudioCash, 'Commission approval should not charge the physical producer before Greenlight.');
assert(commissioned.player.businesses[0].studioState?.scripts.some(script => script.id === commissioned.target?.scriptId), 'The commission should create a real script inside the selected production house.');
const commissionedScript = commissioned.player.businesses[0].studioState?.scripts.find(script => script.id === commissioned.target?.scriptId);
assert(commissionedScript?.lockedStreamingFunding?.ownedStreamingCommissionId === commissioned.target?.commissionId, 'The real Greenlight funding record should retain the platform commission ID.');
assert(commissionedScript?.lockedStreamingFunding?.fundingSource === 'OWNED_STREAMING_PLATFORM', 'Owned-platform commission money must be distinct from third-party renewal funding.');

const duplicate = commissionFirstStreamingOriginal(commissioned.player, draft);
assert(!duplicate.changed, 'The first Original mandate must not be commissioned twice.');
assert(duplicate.player.ownedStreamingPlatform.treasuryCash === commissioned.player.ownedStreamingPlatform.treasuryCash, 'A duplicate attempt must not reserve treasury again.');

const target = commissioned.target!;
const afterGreenlightInput: Player = {
    ...commissioned.player,
    commitments: [{
        id: 'canonical-original-project',
        name: 'Midnight Frequency',
        type: 'JOB',
        energyCost: 0,
        income: 0,
        payoutType: 'LUMPSUM',
        projectPhase: 'PRE_PRODUCTION',
        projectDetails: {
            title: 'Midnight Frequency',
            sourceScriptId: target.scriptId,
            type: 'SERIES',
            genre: 'MYSTERY',
            targetAudience: 'PG-13',
            budgetTier: 'MID',
            estimatedBudget: 86_000_000,
            visibleHype: 'LOW',
            hiddenStats: {
                scriptQuality: 70,
                directorQuality: 70,
                castingStrength: 70,
                distributionPower: 70,
                rawHype: 60,
                qualityScore: 70,
                prestigeBonus: 0,
                platformProductionFundingApplied: 86_000_000,
                ownedStreamingCommissionId: target.commissionId,
                ownedStreamingOriginal: true,
            },
            castList: [],
        } as any,
    }],
};
const greenlit = finalizeOwnedStreamingOriginalGreenlight(afterGreenlightInput);
const original = greenlit.ownedStreamingPlatform.originalCommissions[0];
assert(original.canonicalProjectId === 'canonical-original-project', 'Greenlight should attach the commission to one canonical production project.');
assert(greenlit.ownedStreamingPlatform.treasuryCash === commissioned.player.ownedStreamingPlatform.treasuryCash + 14_000_000, 'Unused commission cap should return to EMPIRE+ treasury.');
assert(greenlit.ownedStreamingPlatform.milestoneKeys.includes('first-original-greenlit'), 'Greenlight should complete the first Original milestone.');
assert(greenlit.ownedStreamingPlatform.cinematicQueue.some(event => event.type === 'FIRST_ORIGINAL_ANNOUNCEMENT'), 'Greenlight should queue the first Original announcement scene.');
assert(getStreamingOriginalLiveStatus(greenlit, original) === 'IN_PRODUCTION', 'The HQ should derive live Original status from the canonical production phase.');
assert(finalizeOwnedStreamingOriginalGreenlight(greenlit).ownedStreamingPlatform.treasuryCash === greenlit.ownedStreamingPlatform.treasuryCash, 'Greenlight finalization must be idempotent.');

const recommendedSlate = createRecommendedStreamingSlate(greenlit);
assert(recommendedSlate.entries.some(entry => entry.source === 'ORIGINAL'), 'The recommended slate should include the first Original.');
assert(recommendedSlate.entries.every(entry => entry.launchWeek >= 1 && entry.launchWeek <= 12), 'Every slate entry should remain inside the twelve-week window.');
assert(recommendedSlate.entries.find(entry => entry.source === 'ORIGINAL')?.marketingPlan === 'EVENT', 'The platform-defining Original should receive event-level marketing beats.');
const warnings = getStreamingSlateWarnings(greenlit, recommendedSlate);
assert(!warnings.some(warning => warning.severity === 'BLOCKER'), 'A varied catalog plus its Original should produce a lockable recommended slate.');
assert(warnings.some(warning => warning.id === 'original-in-production'), 'Programming should truthfully warn that delivery is still underway.');

const fabricatedSlate = {
    ...recommendedSlate,
    entries: recommendedSlate.entries.map((entry, index) => index === 0 ? {
        ...entry,
        projectId: 'fabricated-project',
        title: 'Fabricated Project',
    } : entry),
};
const fabricatedResult = programStreamingLaunchSlate(greenlit, fabricatedSlate);
assert(
    !fabricatedResult.changed && fabricatedResult.reason === 'INVALID_CONTENT',
    'Slate programming must reject project IDs outside the canonical current candidate set.',
);
assert(
    fabricatedResult.player.ownedStreamingPlatform.launchSlate === null
        && !fabricatedResult.player.ownedStreamingPlatform.milestoneKeys.includes('launch-slate-programmed'),
    'A fabricated slate must not create canonical slate state or a completion milestone.',
);

const sourceMismatchSlate = {
    ...recommendedSlate,
    entries: recommendedSlate.entries.map((entry, index) => index === 0 ? {
        ...entry,
        source: entry.source === 'ORIGINAL' ? 'OWNED_LIBRARY' as const : 'ORIGINAL' as const,
    } : entry),
};
assert(
    programStreamingLaunchSlate(greenlit, sourceMismatchSlate).reason === 'INVALID_CONTENT',
    'Slate programming must reject a caller-forged source for an otherwise valid project ID.',
);

const expiredRightsPlayer: Player = {
    ...greenlit,
    ownedStreamingPlatform: {
        ...greenlit.ownedStreamingPlatform,
        catalogProjectIds: [
            ...greenlit.ownedStreamingPlatform.catalogProjectIds,
            'expired-license-title',
        ],
        catalogLicenses: [
            ...greenlit.ownedStreamingPlatform.catalogLicenses,
            {
                id: 'expired-license',
                sourceProjectId: 'expired-license-title',
                titleAtSigning: 'Expired License Title',
                licensorName: 'Former Rights Holder',
                territory: 'DOMESTIC',
                durationWeeks: 52,
                exclusivity: 'NON_EXCLUSIVE',
                minimumGuarantee: 5_000_000,
                platformRevenueShare: 70,
                licensorRevenueShare: 30,
                signedAtAbsoluteWeek: 1,
                startsAtAbsoluteWeek: 1,
                expiresAtAbsoluteWeek: 53,
                status: 'ACTIVE',
            },
        ],
    },
};
assert(
    !getStreamingSlateCandidates(expiredRightsPlayer)
        .some(candidate => candidate.projectId === 'expired-license-title'),
    'Expired licensed windows must not remain canonical slate candidates.',
);

const lockedSlate = programStreamingLaunchSlate(greenlit, recommendedSlate);
assert(lockedSlate.changed, 'A blocker-free slate should lock.');
assert(lockedSlate.player.ownedStreamingPlatform.launchSlate?.entries.length === recommendedSlate.entries.length, 'The canonical slate should preserve all programmed title references.');
assert(lockedSlate.player.ownedStreamingPlatform.milestoneKeys.includes('launch-slate-programmed'), 'Locking should complete the Phase 7 slate milestone.');

const hqSource = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const commissioningSource = readFileSync('components/StreamingOriginalCommissioning.tsx', 'utf8');
const slateSource = readFileSync('components/StreamingSlatePlanner.tsx', 'utf8');
const productionSource = readFileSync('views/lifestyle/business/ProductionHouseGame.tsx', 'utf8');
const styleSource = readFileSync('styles/streaming-hq.css', 'utf8');
const contentStyleSource = readFileSync('styles/streaming-content-workspaces.css', 'utf8');
[
    'COMMISSION ORIGINAL',
    'Choose who physically makes it.',
    'Commissioner / rights holder',
    'Physical producer',
    'Approve & open Greenlight',
].forEach(fragment => assert(commissioningSource.includes(fragment), `Commissioning UI should include ${fragment}.`));
[
    'Twelve-week launch slate',
    'CONTENT-GAP MONITOR',
    'Pattern',
    'Campaign',
    'Lock launch slate',
].forEach(fragment => assert(slateSource.includes(fragment), `Slate UI should include ${fragment}.`));
assert(hqSource.includes('FIRST_ORIGINAL_ANNOUNCEMENT'), 'HQ should render the canonical first Original cutscene.');
assert(productionSource.includes('initialStreamingOriginal'), 'Production House should accept the streaming commission handoff.');
assert(commissioningSource.includes('className="oc streaming-content-workspace"'), 'Original commissioning should use the ZIP control-room presentation.');
assert(contentStyleSource.includes('.ocstats'), 'Original commissioning should retain the ZIP stat-strip grammar.');
assert(contentStyleSource.includes('max-width: 520px'), 'Original commissioning should retain the ZIP mobile frame.');
assert(styleSource.includes('grid-template-columns: repeat(12'), 'The slate should render a real twelve-week timeline.');
assert(styleSource.includes('100dvh'), 'Phase 7 workspaces should use mobile-safe dynamic viewport height.');

console.log('EMPIRE+ Phase 7 Original and twelve-week slate audit passed.');
