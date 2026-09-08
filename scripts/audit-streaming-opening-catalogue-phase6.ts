import { INITIAL_PLAYER, createInitialOwnedStreamingPlatformState, type Player } from '../types';
import {
    createDefaultStreamingCatalogDraft,
    establishOwnedStreamingStarterCatalog,
    getStreamingLicenseOpportunities,
} from '../services/streamingCatalog';
import { saveStreamingMarketPlan } from '../services/streamingMarkets';
import {
    advanceStreamingTitleLocalization,
    doesStreamingLicenseCoverCountry,
    getStreamingOpeningCatalogueView,
    scheduleStreamingTitleLocalization,
} from '../services/streamingOpeningCatalogue';
import { getStreamingLaunchDefinitionSignature } from '../services/streamingLaunchProgram';
import { getAbsoluteWeek } from '../services/legacyLogic';

const assert = (condition: unknown, message: string) => {
    if (!condition) throw new Error(message);
};

const createFixture = (): Player => {
    const base = structuredClone(INITIAL_PLAYER) as Player;
    const platform = createInitialOwnedStreamingPlatformState('opening-catalogue-phase6');
    return {
        ...base,
        id: 'opening-catalogue-phase6',
        name: 'Programming Founder',
        age: 41,
        currentWeek: 10,
        money: 800_000_000,
        businesses: [{
            id: 'founder-pictures', name: 'Founder Pictures', type: 'PRODUCTION_HOUSE', subtype: 'MAJOR_STUDIO',
            logo: 'FP', color: '#6d5cff', foundedWeek: 1, balance: 200_000_000, isActive: true,
            config: {} as any, stats: {} as any, staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 0, history: [],
        }],
        pastProjects: [
            { id: 'owned-film', name: 'Signal House', studioId: 'founder-pictures', projectType: 'MOVIE', genre: 'DRAMA', rating: 8.1, imdbRating: 8.1, gross: 180_000_000, year: 40, releaseYear: 40 } as any,
            { id: 'external-series', name: 'Glass City', studioId: 'outside-studio', projectType: 'SERIES', genre: 'THRILLER', rating: 7.8, imdbRating: 7.8, gross: 120_000_000, year: 40, releaseYear: 40 } as any,
        ],
        ownedStreamingPlatform: {
            ...platform,
            lifecycle: 'FOUNDING',
            identity: {
                name: 'Signal+', slug: 'signal-plus', primaryColor: '#7464ff', secondaryColor: '#0b0b10',
                logoKey: 'FRAME_PLAY', soundIdentKey: 'PULSE', brandPromiseId: 'BALANCED',
                publicManifesto: 'Stories worth crossing borders for.', foundedAtAbsoluteWeek: 2_100,
            },
            foundingProfile: {
                incorporationModel: 'FIXED_V8_ZERO_TREASURY', founderCashCharged: 85_000_000,
                setupCostsConsumed: 85_000_000, openingTreasuryCash: 0, outsideCapitalRaisedAtIncorporation: 0,
                debtPrincipalAtIncorporation: 0, founderOwnershipPercentAtIncorporation: 100,
                founderWasCeoAtIncorporation: true, incorporatedAtAbsoluteWeek: 2_100,
            },
            treasuryCash: 90_000_000,
        },
    };
};

let player = createFixture();
player = saveStreamingMarketPlan(player, ['US', 'IN'], 'OPENING').player;
const beforeWallet = player.money;
const beforeStudioBalance = player.businesses[0].balance;
const beforeTreasury = player.ownedStreamingPlatform.treasuryCash;
const draft = {
    ...createDefaultStreamingCatalogDraft(player),
    selectedOwnedProjectIds: ['owned-film'],
    packageId: 'CURATED_PREMIERE' as const,
};
const established = establishOwnedStreamingStarterCatalog(player, draft);
assert(established.changed, 'An eligible owned release should establish the opening catalogue without an external contract.');
player = established.player;
assert(player.money === beforeWallet, 'Importing an owned title must not charge the founder wallet.');
assert(player.businesses[0].balance === beforeStudioBalance, 'Importing an owned title must not fabricate production-house revenue.');
assert(player.ownedStreamingPlatform.treasuryCash === beforeTreasury, 'Importing an owned title must not charge Studio Finance.');
assert(player.ownedStreamingPlatform.catalogLicenses.length === 0, 'An owned-only opening must not fabricate an external license.');

let coverage = getStreamingOpeningCatalogueView(player);
assert(coverage.titles.length === 1, 'The programming desk should read the canonical opening title.');
assert(coverage.rightsReady && coverage.rightsReadyCountryCount === 2, 'Owned distribution rights should cover both selected opening countries.');
assert(!coverage.qualityReady, 'India should expose optional language reach work instead of silently granting localization.');

const signatureBeforeLanguage = getStreamingLaunchDefinitionSignature(player);
const localization = scheduleStreamingTitleLocalization(player, {
    titleId: 'owned-film', languageId: 'Hindi', mode: 'SUBTITLE', delivery: 'OUTSOURCE',
});
assert(localization.changed && localization.job?.status === 'IN_PROGRESS', 'A valid outsourced subtitle order should enter production.');
assert(localization.player.ownedStreamingPlatform.treasuryCash < player.ownedStreamingPlatform.treasuryCash, 'Localization must charge Studio Finance once.');
player = localization.player;
assert(getStreamingLaunchDefinitionSignature(player) === signatureBeforeLanguage, 'Optional language work must not invalidate the saved launch definition.');
const duplicateLocalization = scheduleStreamingTitleLocalization(player, {
    titleId: 'owned-film', languageId: 'Hindi', mode: 'SUBTITLE', delivery: 'OUTSOURCE',
});
assert(!duplicateLocalization.changed && duplicateLocalization.reason === 'ALREADY_EXISTS', 'The same title-language-mode job must be idempotent.');
assert(duplicateLocalization.player.ownedStreamingPlatform.treasuryCash === player.ownedStreamingPlatform.treasuryCash, 'A duplicate language order must not charge treasury twice.');

const readyAt = localization.job!.readyAtAbsoluteWeek!;
const currentAbsolute = getAbsoluteWeek(player.age, player.currentWeek);
const weeksToAdvance = Math.max(1, readyAt - currentAbsolute);
player = { ...player, currentWeek: player.currentWeek + weeksToAdvance };
const delivered = advanceStreamingTitleLocalization(player);
assert(delivered.changed, 'Language production should complete when its absolute game week arrives.');
player = delivered.player;
assert(player.ownedStreamingPlatform.localizationOperations.titleLanguageAssets.some(asset => asset.titleId === 'owned-film' && asset.languageId === 'hindi' && asset.subtitleReady), 'Completion should create a canonical lowercase title-language asset.');

const opportunity = getStreamingLicenseOpportunities(player).find(item => item.id === 'external-series');
assert(opportunity, 'The fixture should retain one real external rights opportunity.');
const absoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const domesticLicense = {
    id: 'domestic-license', sourceProjectId: 'external-series', titleAtSigning: 'Glass City', projectType: 'SERIES' as const,
    genre: 'THRILLER', licensorName: 'Outside Studio', territory: 'DOMESTIC' as const, countryIds: ['US'], durationWeeks: 104,
    exclusivity: 'NON_EXCLUSIVE' as const, minimumGuarantee: 5_000_000, platformRevenueShare: 70, licensorRevenueShare: 30,
    signedAtAbsoluteWeek: absoluteWeek, startsAtAbsoluteWeek: absoluteWeek, expiresAtAbsoluteWeek: absoluteWeek + 104, status: 'ACTIVE' as const,
};
player = {
    ...player,
    ownedStreamingPlatform: {
        ...player.ownedStreamingPlatform,
        catalogLicenses: [...player.ownedStreamingPlatform.catalogLicenses, domesticLicense],
        catalogProjectIds: [...player.ownedStreamingPlatform.catalogProjectIds, 'external-series'],
        starterCatalog: {
            ...player.ownedStreamingPlatform.starterCatalog!,
            licensedProjectIds: ['external-series'],
        },
    },
};
coverage = getStreamingOpeningCatalogueView(player);
const india = coverage.countries.find(country => country.countryId === 'IN');
assert(india?.missingRightsTitles.includes('Glass City'), 'A domestic external license must expose a rights gap in another selected country.');
assert(coverage.rightsReady, 'A US-only acquisition must not invalidate the existing eligible India catalogue.');
assert(india!.rightsCoveredTitles < india!.totalTitles, 'Excluded countries must not gain playback rights or title counts.');
assert(doesStreamingLicenseCoverCountry({ ...domesticLicense, territory: 'GLOBAL', countryIds: [] }, 'IN', ['US', 'IN']), 'A global license should cover future and existing countries.');

console.log('Streaming opening catalogue, rights and localization Phase 6 audit passed.');
