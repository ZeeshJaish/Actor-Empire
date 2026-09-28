import assert from 'node:assert/strict';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { saveStreamingMarketPlan } from '../services/streamingMarkets';
import { createDefaultStreamingCatalogDraft, establishOwnedStreamingStarterCatalog } from '../services/streamingCatalog';
import { getAbsoluteWeek } from '../services/legacyLogic';
import * as offers from '../services/streamingCommercialOffers';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { forecastPricing } from '../components/studio-finance/finance/launch';
import { getStreamingLaunchReadiness, calculateOpeningPaidSubscriberSeed } from '../services/streamingLaunch';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepPricing } from '../components/studio-finance/components/launch/StepPricing';

const fixture = createPlatformAiFixture();
const base = offers.createStreamingPricingForCoreModel(fixture.ownedStreamingPlatform.serviceConfiguration.pricing, 'SUBSCRIPTION');

// A missing editor action must fail as an observable inability to configure a hybrid.
const configureOffer = (offers as Record<string, unknown>).configureStreamingPricingOffer as
    ((pricing: typeof base, action: unknown) => typeof base) | undefined;
assert.equal(typeof configureOffer, 'function', 'the pricing UI needs a canonical offer action');
const adCore = configureOffer!(base, { kind: 'CORE', coreModel: 'ADVERTISING' });
assert.equal(offers.projectStreamingCommercialOffers(adCore).coreModel, 'ADVERTISING');
assert.equal(offers.projectStreamingCommercialOffers(adCore).freeAdOffer?.price, 0);
const hybrid = configureOffer!(adCore, { kind: 'TOGGLE', offer: 'STORE', enabled: true });
assert.equal(offers.projectStreamingCommercialOffers(hybrid).storeOffer?.rent, base.rentals.rent);
const early = configureOffer!(hybrid, { kind: 'BENEFIT', offer: 'STORE', premiumAccess: true, earlyAccessWeeks: 3 });
assert.equal(offers.projectStreamingCommercialOffers(early).storeOffer?.benefits.earlyAccessWeeks, 3);
const planEarly = configureOffer!(base, { kind: 'BENEFIT', offer: 'PLAN', planId: base.plans[0].id,
    premiumAccess: true, earlyAccessWeeks: 2 });
assert.equal(offers.projectStreamingCommercialOffers(planEarly).subscriptions[0].benefits.earlyAccessWeeks, 2);
assert.ok(planEarly.plans[0].featureIds.includes('early'),
    'the canonical audience appeal should reflect the configured early-access benefit');
const pass = configureOffer!(early, { kind: 'PASS', duration: 'ONE_HOUR', price: 2.5 });
assert.equal(offers.projectStreamingCommercialOffers(pass).adFreePasses.oneHourPrice, 2.5);

const freeOnly = configureOffer!(base, { kind: 'CORE', coreModel: 'ADVERTISING' });
const founding = structuredClone(fixture);
founding.ownedStreamingPlatform.identity = {
    name: 'C5 Service', slug: 'c5-service', primaryColor: '#111', secondaryColor: '#eee',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '',
    dayOneMarketIds: ['US'], launchServerCityId: null, foundedAtAbsoluteWeek: 12,
};
const savedFree = saveStreamingPricingPlan(founding, freeOnly);
assert.equal(savedFree.changed, true, 'an ad-led offer can be saved at founding without research');
assert.deepEqual(savedFree.player.ownedStreamingPlatform.serviceConfiguration.pricing.streams, ['ads']);
const savedStore = saveStreamingPricingPlan(founding, configureOffer!(base, { kind: 'CORE', coreModel: 'STORE' }));
assert.equal(savedStore.changed, true, 'a store-led offer can be saved at founding without research');
assert.deepEqual(savedStore.player.ownedStreamingPlatform.serviceConfiguration.pricing.streams, ['rentals']);
const savedEarly = saveStreamingPricingPlan(founding, planEarly);
assert.ok(savedEarly.player.ownedStreamingPlatform.serviceConfiguration.pricing.plans[0].featureIds.includes('early'),
    'saving an entitled early benefit must not silently remove its audience appeal');
const buildPricing = (offers as Record<string, unknown>).summarizeStreamingBuildPricing as
    ((pricing: typeof base) => { sellable: number; label: string }) | undefined;
assert.equal(typeof buildPricing, 'function', 'Build needs the saved offer, not cinematic shadow pricing');
assert.equal(buildPricing!(freeOnly).sellable, 1, 'a free-ad offer is sellable without a paid tier');
assert.equal(buildPricing!(savedStore.player.ownedStreamingPlatform.serviceConfiguration.pricing).label, 'Rent or buy',
    'Build should identify the store-only model accurately');
assert.equal(calculateOpeningPaidSubscriberSeed(freeOnly, 1000, 85, 1), 0,
    'free-ad opening audiences must not be booked as paying subscribers');
assert.equal(calculateOpeningPaidSubscriberSeed(savedStore.player.ownedStreamingPlatform.serviceConfiguration.pricing, 1000, 85, 1), 0,
    'store-only opening audiences must not be booked as paying subscribers');
assert.ok(calculateOpeningPaidSubscriberSeed(base, 1000, 85, 1) > 0,
    'subscription-led opening can seed paying subscribers');
const worldForecast = {
    reachableHouseholds: 1000, subscribers: 0, monthlySubscriptionRevenue: 0,
    freeAdHouseholds: 250, storeHouseholds: 0,
    estimatedWeeklyAdRevenueIfPlayable: 100,
    estimatedWeeklyPassRevenueIfPlayable: 0,
    estimatedWeeklyRentalRevenueIfPlayable: 0,
    estimatedWeeklyPurchaseRevenueIfPlayable: 0,
    adAvailableImpressions: 1000, adFilledImpressions: 500,
    adFillRate: .5, adRealizedCpm: 20,
    firstYearSubscriptionRevenue: 0, planAllocations: [], activeRivalCount: 1, rivalMedianEntryPrice: 7,
    monthlySubscribers: 0, annualSubscribers: 0,
    estimatedWeeklyPassBuyersIfPlayable: 0,
    estimatedWeeklyRentalBuyersIfPlayable: 0,
    estimatedWeeklyPurchaseBuyersIfPlayable: 0,
    countries: [{ countryId: 'US', reachableHouseholds: 1000, accounts: 0,
        monthlySubscribers: 0, annualSubscribers: 0, monthlySubscriptionRevenue: 0,
        freeAdHouseholds: 250, storeHouseholds: 0,
        estimatedWeeklyAdRevenueIfPlayable: 100, estimatedWeeklyPassRevenueIfPlayable: 0,
        estimatedWeeklyRentalRevenueIfPlayable: 0, estimatedWeeklyPurchaseRevenueIfPlayable: 0,
        estimatedWeeklyPassBuyersIfPlayable: 0, estimatedWeeklyRentalBuyersIfPlayable: 0,
        estimatedWeeklyPurchaseBuyersIfPlayable: 0,
        adAvailableImpressions: 1000, adFilledImpressions: 500, adFillRate: .5, adRealizedCpm: 20 }],
};
const preview = forecastPricing(freeOnly, 1000, { rivalAveragePrice: 7, reachRate: .1 }, [], worldForecast);
assert.equal(preview.streams.find(row => row.id === 'ads')?.monthly, 100 * 52 / 12,
    'launch ad preview must read the C4 country forecast rather than a synthetic fixed CPM');
assert.equal(preview.streams.some(row => row.id === 'sponsor'), false,
    'new launch forecasts cannot invent sponsor deals');

const renderPricing = (pricing: typeof base): string => renderToStaticMarkup(createElement(StepPricing, {
    data: { pricing, market: { rivalAveragePrice: 7, reachRate: .1 }, capabilityLocks: {} },
    draft: { pricing }, chosen: [], patch: () => undefined,
    handlers: { onForecastPricing: () => worldForecast },
} as any));
const adMarkup = renderPricing(freeOnly);
assert.match(adMarkup, /Your offers/, 'the player selects a core offer, not eight revenue streams');
assert.match(adMarkup, /Free with ads/, 'ad-led services need a single free offer card');
assert.match(adMarkup, /Change model/, 'a saved model remains changeable');
assert.match(adMarkup, /aria-label="Edit Free with ads offer" aria-expanded="false"/, 'ad-led services begin with one collapsed editable card');
assert.doesNotMatch(adMarkup, /Sponsored titles|Fund the show/, 'obsolete launch price controls stay out of the new editor');
assert.doesNotMatch(adMarkup, /Target CPM|Optional ad-free passes/, 'ad controls remain inside the closed editor');
assert.match(adMarkup, /Subscription 0 monthly · 0 annual/, 'country drill-down separates monthly and annual buyers');
assert.match(adMarkup, /Expected ads \$100\/wk/, 'country drill-down exposes conditional ad income');
const storeMarkup = renderPricing(configureOffer!(base, { kind: 'CORE', coreModel: 'STORE' }));
assert.match(storeMarkup, /Rent or buy/, 'store-led services need one uniform-price offer card');
assert.match(storeMarkup, /aria-label="Edit Rent or buy offer" aria-expanded="false"/, 'the selected store has one collapsed editable card');
const sixPlanMarkup = renderPricing(normalizeStreamingPricingConfiguration({
    ...base,
    plans: Array.from({ length: 6 }, (_, index) => ({ ...base.plans[0], id: `C5-${index}`, name: `Tier ${index}` })),
}));
assert.match(sixPlanMarkup, /disabled=""[^>]*>Six-plan limit/, 'the plan editor caps custom tiers at six');

// Existing market/title readiness is not enough if the saved offer has no playable route.
const readiness = getStreamingLaunchReadiness(fixture);
assert.ok(readiness.items.some(item => item.id === 'offer-coverage'),
    'commissioning needs a title-route check for every opening country');
let coveragePlayer = structuredClone(fixture);
coveragePlayer.ownedStreamingPlatform = {
    ...createInitialOwnedStreamingPlatformState(coveragePlayer.id),
    lifecycle: 'FOUNDING',
    identity: { ...founding.ownedStreamingPlatform.identity!, dayOneMarketIds: ['US', 'IN'] },
    treasuryCash: 200_000_000,
};
coveragePlayer.businesses = [{ id: 'studio-c5', name: 'C5 Studio', type: 'PRODUCTION_HOUSE',
    subtype: 'MAJOR_STUDIO', logo: 'C5', color: '#ff2222', foundedWeek: 1,
    balance: 200_000_000, isActive: true, config: {} as any, stats: {} as any,
    staff: [], products: [], hiringPool: [], lastHiringRefreshWeek: 0, history: [] }];
coveragePlayer.pastProjects = [{ id: 'film-c5', name: 'C5 Film', studioId: 'studio-c5',
    projectType: 'MOVIE', genre: 'DRAMA', rating: 8, imdbRating: 8, gross: 100_000_000,
    year: 40, releaseYear: 40 } as any];
coveragePlayer = saveStreamingMarketPlan(coveragePlayer, ['US', 'IN'], 'OPENING').player;
coveragePlayer = establishOwnedStreamingStarterCatalog(coveragePlayer, {
    ...createDefaultStreamingCatalogDraft(coveragePlayer),
    selectedOwnedProjectIds: ['film-c5'], packageId: 'CURATED_PREMIERE',
}).player;
const paidCoverage = getStreamingLaunchReadiness(coveragePlayer).items.find(item => item.id === 'offer-coverage');
assert.equal(paidCoverage?.tone, 'READY',
    'an owned playable subscription title should cover each opening country');
coveragePlayer.ownedStreamingPlatform.serviceConfiguration.pricing = configureOffer!(
    coveragePlayer.ownedStreamingPlatform.serviceConfiguration.pricing,
    { kind: 'CORE', coreModel: 'STORE' },
);
const storeCoverage = getStreamingLaunchReadiness(coveragePlayer).items.find(item => item.id === 'offer-coverage');
assert.equal(storeCoverage?.tone, 'READY',
    'an owned title can fulfill the store-only offer in both opening countries');
coveragePlayer.ownedStreamingPlatform.starterCatalog = null;
coveragePlayer.ownedStreamingPlatform.catalogProjectIds = [];
const emptyCoverage = getStreamingLaunchReadiness(coveragePlayer).items.find(item => item.id === 'offer-coverage');
assert.equal(emptyCoverage?.tone, 'BLOCKED',
    'a store-only service without any connected opening title cannot be commissioned');
const rightsWeek = getAbsoluteWeek(coveragePlayer.age, coveragePlayer.currentWeek);
coveragePlayer.pastProjects.push({ id: 'licensed-c5', name: 'Licensed C5', studioId: 'external-studio',
    projectType: 'MOVIE', genre: 'DRAMA', rating: 7.5, imdbRating: 7.5,
    gross: 80_000_000, year: 40, releaseYear: 40 } as any);
coveragePlayer.ownedStreamingPlatform.starterCatalog = {
    ...createDefaultStreamingCatalogDraft(coveragePlayer) as any,
    ownedProjectIds: [], licensedProjectIds: ['licensed-c5'], packageId: 'CURATED_PREMIERE',
};
coveragePlayer.ownedStreamingPlatform.catalogProjectIds = ['licensed-c5'];
coveragePlayer.ownedStreamingPlatform.catalogLicenses = [{ id: 'c5-license', sourceProjectId: 'licensed-c5',
    titleAtSigning: 'Licensed C5', projectType: 'MOVIE', genre: 'DRAMA', licensorName: 'External Studio',
    territory: 'DOMESTIC', countryIds: ['US'], durationWeeks: 52,
    exclusivity: 'NON_EXCLUSIVE', minimumGuarantee: 1_000_000,
    platformRevenueShare: 70, licensorRevenueShare: 30,
    signedAtAbsoluteWeek: rightsWeek, startsAtAbsoluteWeek: rightsWeek,
    expiresAtAbsoluteWeek: rightsWeek + 52, status: 'ACTIVE',
    accessGrant: { schemaVersion: 1, modes: ['SUBSCRIPTION'], earlyWindowWeeks: 0,
        purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
} as any];
const noStoreRoute = getStreamingLaunchReadiness(coveragePlayer).items.find(item => item.id === 'offer-coverage');
assert.equal(noStoreRoute?.tone, 'BLOCKED',
    'a licensed subscription-only title must not cover a store-only offer');
coveragePlayer.ownedStreamingPlatform.serviceConfiguration.pricing = base;
const secondCountryGap = getStreamingLaunchReadiness(coveragePlayer).items.find(item => item.id === 'offer-coverage');
assert.equal(secondCountryGap?.tone, 'BLOCKED',
    'a US-only subscription license cannot satisfy the second opening country');
assert.match(secondCountryGap?.detail || '', /India/,
    'the missing country is named for repair');

console.log('Streaming commercial C5 audit passed.');
