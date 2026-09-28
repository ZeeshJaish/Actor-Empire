import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createInitialOwnedStreamingPlatformState } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { createPlatformAiFixture } from './helpers/platformAiFixture';
import { StepPricing } from '../components/studio-finance/components/launch/StepPricing';

const fresh = createInitialOwnedStreamingPlatformState('pricing-p1');
const render = (pricing: typeof fresh.serviceConfiguration.pricing) => renderToStaticMarkup(createElement(StepPricing, {
    data: { pricing, market: { rivalAveragePrice: 12, reachRate: .3 }, capabilityLocks: {} },
    draft: { pricing }, chosen: [], patch: () => undefined, handlers: {},
} as any));
// The old default subscription must not appear as a player choice.
assert.doesNotMatch(render(fresh.serviceConfiguration.pricing), /aria-pressed="true"|Compare subscription plans|Conditional opening forecast|Autosaved as you edit/,
    'fresh pricing shows only unselected core choices, not default plans or forecasts');
assert.equal((fresh.serviceConfiguration.pricing.commercialOffers as any)?.coreModelSelected, false);
const normalizedFresh = normalizeOwnedStreamingPlatformState(JSON.parse(JSON.stringify(fresh)), 'pricing-p1');
assert.equal((normalizedFresh.serviceConfiguration.pricing.commercialOffers as any)?.coreModelSelected, false,
    'save normalization must retain the explicit unchosen state');
const founding = createPlatformAiFixture();
founding.ownedStreamingPlatform.identity = { name: 'Test', slug: 'test', primaryColor: '#111111', secondaryColor: '#eeeeee',
    logoKey: 'FRAME_PLAY', brandPromiseId: 'BALANCED', publicManifesto: '', dayOneMarketIds: ['US'],
    launchServerCityId: null, foundedAtAbsoluteWeek: 12 };
assert.equal(saveStreamingPricingPlan(founding, fresh.serviceConfiguration.pricing).reason, 'INCOMPLETE',
    'autosaving untouched defaults cannot complete pricing');
const selected = configureStreamingPricingOffer(fresh.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'ADVERTISING' });
assert.equal(saveStreamingPricingPlan(founding, selected).changed, true);
assert.equal((normalizeStreamingPricingConfiguration(JSON.parse(JSON.stringify(selected))).commercialOffers as any)?.coreModelSelected, true);
assert.match(render(selected), /aria-label="Edit Free with ads offer"[^>]*aria-expanded="false"/,
    'ad configuration starts inside one collapsed offer card');
assert.doesNotMatch(render(selected), /Target CPM|Optional ad-free passes|Also offer/,
    'closed cards must not spill their controls onto the pricing page');
const store = configureStreamingPricingOffer(selected, { kind: 'CORE', coreModel: 'STORE' });
assert.match(render(store), /aria-label="Edit Rent or buy offer"[^>]*aria-expanded="false"/);
const legacy = { ...selected, commercialOffers: undefined };
assert.equal((normalizeStreamingPricingConfiguration(legacy).commercialOffers as any)?.coreModelSelected, true,
    'older configured saves without the marker remain selected');
const legacyPlatform = structuredClone(fresh);
legacyPlatform.serviceConfiguration.pricing = legacy;
legacyPlatform.serviceConfiguration.pricingApproach = 'CUSTOM';
legacyPlatform.serviceConfiguration.source = 'PLAYER_ACTION';
assert.equal(normalizeOwnedStreamingPlatformState(legacyPlatform, 'pricing-p1').serviceConfiguration.pricing.commercialOffers?.coreModelSelected, true,
    'full legacy platform normalization retains an existing configured offer');
let edited = configureStreamingPricingOffer({ ...selected, plans: [{ ...selected.plans[0], name: 'A custom membership', monthly: 18.5 }] },
    { kind: 'BENEFIT', offer: 'PLAN', planId: selected.plans[0].id, premiumAccess: true, earlyAccessWeeks: 3 });
edited = configureStreamingPricingOffer(edited, { kind: 'PASS', duration: 'DAY', price: 4 });
edited = configureStreamingPricingOffer(edited, { kind: 'CORE', coreModel: 'STORE' });
edited = configureStreamingPricingOffer(edited, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
assert.equal(edited.plans[0].name, 'A custom membership');
assert.equal(edited.plans[0].monthly, 18.5);
assert.equal(edited.commercialOffers?.benefits.plans[edited.plans[0].id].earlyAccessWeeks, 3);
assert.equal(edited.commercialOffers?.adFreePasses.dayPrice, 4);
// Turning ads off must not destroy a dormant ad-funded tier's terms.
let adPlans = configureStreamingPricingOffer(selected, { kind: 'TOGGLE', offer: 'SUBSCRIPTION', enabled: true });
adPlans.plans[0] = { ...adPlans.plans[0], monthly: 0, ads: true };
adPlans = configureStreamingPricingOffer(adPlans, { kind: 'CORE', coreModel: 'STORE' });
adPlans = configureStreamingPricingOffer(adPlans, { kind: 'CORE', coreModel: 'SUBSCRIPTION' });
adPlans = configureStreamingPricingOffer(adPlans, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
assert.equal(adPlans.plans[0].ads, true, 're-enabling ads restores the dormant tier assignment');
assert.equal(adPlans.plans[0].monthly, 0, 'a dormant free tier remains free when ads return');
console.log('PASS pricing P1: fresh selection, save gate, legacy restore, collapsed cards, retained definitions');
