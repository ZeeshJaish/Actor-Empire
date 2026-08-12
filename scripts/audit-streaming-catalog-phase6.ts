import {
    INITIAL_PLAYER,
    OWNED_STREAMING_PLATFORM_SCHEMA_VERSION,
    createInitialOwnedStreamingPlatformState,
    type Player,
} from '../types';
import {
    acceptStreamingCatalogCounter,
    createDefaultStreamingCatalogDraft,
    getEligibleOwnedStreamingTitles,
    getStreamingCatalogLicenseStatus,
    getStreamingLicenseOpportunities,
    getStreamingLicenseQuote,
    saveStreamingCatalogDraft,
    signStreamingStarterCatalog,
    submitStreamingCatalogOffer,
} from '../services/streamingCatalog';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const platform = createInitialOwnedStreamingPlatformState('phase6-player');
    return {
        ...base,
        id: 'phase6-player',
        name: 'Catalog Founder',
        age: 42,
        currentWeek: 12,
        money: 900_000_000,
        businesses: [{
            id: 'owned-studio',
            name: 'Founder Pictures',
            type: 'PRODUCTION_HOUSE',
            subtype: 'MAJOR_STUDIO',
            logo: 'FP',
            color: '#6547ff',
            foundedWeek: 1,
            balance: 310_000_000,
            isActive: true,
            config: {} as any,
            stats: {} as any,
            staff: [],
            products: [],
            hiringPool: [],
            lastHiringRefreshWeek: 0,
            history: [],
        }],
        pastProjects: [
            {
                id: 'owned-release',
                name: 'Night Signal',
                studioId: 'owned-studio',
                projectType: 'MOVIE',
                genre: 'THRILLER',
                rating: 8.2,
                imdbRating: 8.2,
                gross: 240_000_000,
                year: 40,
                releaseYear: 40,
            } as any,
            {
                id: 'external-release',
                name: 'Glass Harbor',
                studioId: 'outside-studio',
                projectType: 'SERIES',
                genre: 'DRAMA',
                rating: 7.7,
                imdbRating: 7.7,
                gross: 130_000_000,
                year: 41,
                releaseYear: 41,
            } as any,
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
            infrastructureSetup: {
                capacityPackageId: 'GROWTH',
                rolloutPace: 'STANDARD',
                storageCapacityHours: 40_000,
                reliabilityTarget: 99.8,
                weeklyOperatingCost: 1_300_000,
                staffRequired: 14,
                capitalInvested: 40_000_000,
                technicalDebt: 4,
                readyAtAbsoluteWeek: 2_106,
                revision: 1,
                committedAtAbsoluteWeek: 2_100,
                loadTest: {
                    configurationSignature: 'HYBRID:GROWTH:STANDARD',
                    forecastLowConcurrentStreams: 700_000,
                    forecastLikelyConcurrentStreams: 1_000_000,
                    forecastHighConcurrentStreams: 1_550_000,
                    testedBurstCapacity: 3_450_000,
                    headroomPercent: 122.6,
                    status: 'PASS',
                    driverKeys: ['national-launch'],
                    completedAtAbsoluteWeek: 2_100,
                },
            },
            treasuryCash: 250_000_000,
        },
    };
};

assert(OWNED_STREAMING_PLATFORM_SCHEMA_VERSION === 22, 'The current schema should retain the Phase 6 catalog fields.');
const migrated = normalizeOwnedStreamingPlatformState({ schemaVersion: 4, catalogProjectIds: ['legacy-title'] }, 'legacy-player');
assert(migrated.schemaVersion === OWNED_STREAMING_PLATFORM_SCHEMA_VERSION, 'Older saves should normalize into the current schema.');
assert(migrated.catalogSetupDraft === null && migrated.starterCatalog === null, 'Older saves should receive empty Phase 6 setup fields.');
assert(migrated.catalogLicenses.length === 0, 'Older saves should receive an empty catalog license ledger.');

const fixture = createFixture();
const ownedTitles = getEligibleOwnedStreamingTitles(fixture);
assert(ownedTitles.length === 1 && ownedTitles[0].id === 'owned-release', 'Only released projects from player-owned production houses should import as owned titles.');
const opportunities = getStreamingLicenseOpportunities(fixture);
assert(opportunities.some(item => item.id === 'external-release'), 'A released outside-studio project should become a licensing opportunity.');
assert(!opportunities.some(item => item.id === 'owned-release'), 'Owned projects must never appear as external license targets.');

let draft = createDefaultStreamingCatalogDraft(fixture);
assert(draft.selectedOwnedProjectIds.includes('owned-release'), 'The opening draft should suggest eligible owned titles by reference.');
assert(draft.opportunityProjectId === 'external-release', 'The opening draft should choose an actual external project, not an invented title.');
const target = opportunities.find(item => item.id === draft.opportunityProjectId)!;
const quote = getStreamingLicenseQuote(target, draft.territory, draft.durationWeeks, draft.exclusivity);
draft = {
    ...draft,
    currentStep: 3,
    minimumGuarantee: quote.minimumGuarantee,
    platformRevenueShare: Math.min(90, quote.targetPlatformRevenueShare + 8),
};

const saved = saveStreamingCatalogDraft(fixture, draft);
const response = submitStreamingCatalogOffer(saved, draft);
assert(response.changed && response.draft.negotiationStatus === 'COUNTERED', 'A licensor should counter a low, platform-heavy opening offer.');
assert(response.draft.counterMinimumGuarantee !== null, 'The counteroffer should persist an explicit minimum guarantee.');
assert(response.draft.counterPlatformRevenueShare !== null, 'The counteroffer should persist a negotiated platform split.');

const countered = acceptStreamingCatalogCounter(response.player);
assert(countered.changed && countered.draft.negotiationStatus === 'READY_TO_SIGN', 'Accepting the counter should prepare the final contract.');
const beforePlayerCash = countered.player.money;
const beforeStudioCash = countered.player.businesses[0].balance;
const beforeTreasury = countered.player.ownedStreamingPlatform.treasuryCash;
const signed = signStreamingStarterCatalog(countered.player);
assert(signed.changed, 'A ready agreement with sufficient treasury should sign.');
const signedPlatform = signed.player.ownedStreamingPlatform;
assert(signedPlatform.starterCatalog?.ownedProjectIds.includes('owned-release'), 'Signing should link the selected owned project to the starter catalog.');
assert(signedPlatform.catalogProjectIds.includes('owned-release') && signedPlatform.catalogProjectIds.includes('external-release'), 'The catalog should contain canonical owned and licensed project IDs.');
assert(signedPlatform.catalogLicenses.length === 1, 'Signing should create exactly one external license contract.');
assert(signedPlatform.treasuryCash === beforeTreasury - countered.draft.minimumGuarantee, 'The minimum guarantee should be charged once from EMPIRE+ treasury.');
assert(signed.player.money === beforePlayerCash, 'Signing a platform license must not charge the player wallet.');
assert(signed.player.businesses[0].balance === beforeStudioCash, 'Importing an owned title must not create or remove production-house cash.');
const contract = signedPlatform.catalogLicenses[0];
assert(contract.licensorRevenueShare === 100 - contract.platformRevenueShare, 'Revenue shares must always total 100%.');
assert(contract.expiresAtAbsoluteWeek === contract.startsAtAbsoluteWeek + contract.durationWeeks, 'The contract expiry must use absolute game-week math.');
assert(getStreamingCatalogLicenseStatus(contract, contract.expiresAtAbsoluteWeek - 1) === 'ACTIVE', 'The license should remain active before expiry.');
assert(getStreamingCatalogLicenseStatus(contract, contract.expiresAtAbsoluteWeek) === 'EXPIRED', 'The license should expire at its absolute expiry week.');
assert(signedPlatform.milestoneKeys.includes('starter-catalog-established'), 'Signing should complete the Phase 6 catalog milestone.');

const duplicate = signStreamingStarterCatalog(signed.player);
assert(!duplicate.changed, 'The starter catalog agreement must not sign twice.');
assert(duplicate.player.ownedStreamingPlatform.treasuryCash === signedPlatform.treasuryCash, 'A duplicate signing attempt must not charge treasury again.');

console.log('Streaming catalog Phase 6 audit passed.');
