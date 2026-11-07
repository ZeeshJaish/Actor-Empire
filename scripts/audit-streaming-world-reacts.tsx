/**
 * #117 The world reacts (plan §18.7; Zeesh, 2026-11-01: "लोगो चेंज का भी ऑप्शन हमें कहीं डालना है ताकि जब आगे चल कहीं कभी
 * लोगो चेंज करे तो उसके ऊपर भी मीडिया एंड ऑल थोड़ा रिएक्ट एंड स्टफ करे" … "कोई क्रिटिसाइज करे, कोई इंजॉय करे, कोई बोले कि
 * अरे उसका तो सस्ता है फिर भी इतना कुछ ऑफर कर रहा है"):
 *  - the offer's moves, each typed for what it is: the main offer switched ("goes free with ads"), subscriptions off,
 *    a free tier opened or closed, the store opened, ads off a plan; a new ad plan is no longer "a free plan with ads";
 *  - a new look or ident from the brand studio, and a new front page, make stories;
 *  - value against the global rivals: praise ("the cheapest 4K plan around") and criticism ("charges more for less"),
 *    at most one a week, each verdict told once;
 *  - the media voice them in News, X and Instagram, critics for and against.
 * (~10 s)
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type IndustryEventFact, type OwnedStreamingPricingConfiguration, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { createDefaultStreamingFoundingDraft, incorporateOwnedStreamingPlatform, saveStreamingFoundingDraft } from '../services/streamingFounding';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { createStreamingPricingForCoreModel } from '../services/streamingCommercialOffers';
import { describeStreamingPricingChange } from '../services/streamingPricingChange';
import { saveStreamingPricingPlan, saveStreamingStorefrontPlan } from '../services/streamingLaunchProgram';
import { applyStreamingBrandLook, getStreamingBrandLook, rebrandStreamingIdent } from '../services/streamingBrandStudio';
import { collectOwnedStreamingPlatformFacts } from '../services/streamingPlatformNews';
import { STREAMING_VALUE_CLEAR_GAP, collectStreamingValueFacts, getStreamingValueVerdict } from '../services/streamingValueNews';
import { getWorldStreamingRivalOffers } from '../services/worldEconomy/worldStreamingOffers';
import { processIndustryWorldWeek } from '../services/industryWorld';

const started = performance.now();

/* ── a live service in a fresh world: Northstar+, $50M, 2M subscribers, opening in the US, Canada and Mexico ── */
const live = (() => {
    const base = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'world-reacts', name: 'World Reacts', age: 24, currentWeek: 10, money: 300_000_000 });
    const eligible: Player = { ...base, ownedStreamingPlatform: { ...base.ownedStreamingPlatform, lifecycle: 'ELIGIBLE', simulationSeed: 'owned-streaming:world-reacts', milestoneKeys: ['streaming-launch-clearance'] } };
    const founded = incorporateOwnedStreamingPlatform(saveStreamingFoundingDraft(eligible, { ...createDefaultStreamingFoundingDraft(100), currentStep: 2, name: 'Northstar+' })).player;
    const platform = founded.ownedStreamingPlatform;
    const pricing = normalizeStreamingPricingConfiguration({ ...platform.serviceConfiguration.pricing,
        commercialOffers: { ...platform.serviceConfiguration.pricing.commercialOffers!, coreModelSelected: true } });
    return { ...founded, ownedStreamingPlatform: { ...platform, lifecycle: 'ACTIVE', treasuryCash: 50_000_000, launchCommit: { idempotencyKey: 'launch' } as never,
        metrics: { ...platform.metrics, subscribers: 2_000_000 },
        serviceConfiguration: { ...platform.serviceConfiguration, storefrontLayoutId: 'cinema', pricing } } } as Player;
})();
const week = getAbsoluteWeek(live.age, live.currentWeek);
const name = live.ownedStreamingPlatform.identity!.name;
/* next week's industry pass reads this week's ledger */
const stories = (player: Player) => collectOwnedStreamingPlatformFacts(player, week, week + 1);
const only = (player: Player): IndustryEventFact => {
    const facts = stories(player);
    assert.equal(facts.length, 1, `one story: ${facts.map(fact => fact.headline).join(' | ')}`);
    return facts[0];
};

/* ── the offer's moves, typed for what they are ── */
const pricing = live.ownedStreamingPlatform.serviceConfiguration.pricing;
const withPricing = (next: OwnedStreamingPricingConfiguration) => normalizeStreamingPricingConfiguration(next);
const subsOnly = withPricing({ ...pricing, streams: ['subs'], plans: pricing.plans.filter(plan => !plan.ads) });
const freeTier = withPricing({ ...pricing, commercialOffers: { ...pricing.commercialOffers!, freeAdAccess: true } });
const kind = (before: OwnedStreamingPricingConfiguration, after: OwnedStreamingPricingConfiguration) => describeStreamingPricingChange(before, after)?.change ?? null;
assert.equal(kind(subsOnly, pricing), 'NEW_CHEAPER', 'A new ad plan ("Basic with ads") is a cheaper plan, not a free tier (the false story)');
assert.equal(kind(pricing, freeTier), 'FREE_TIER', 'Free with ads opened');
assert.equal(kind(freeTier, pricing), 'FREE_TIER_CLOSED', 'Free with ads closed');
const goesFree = createStreamingPricingForCoreModel(pricing, 'ADVERTISING');
assert.deepEqual([kind(pricing, goesFree), describeStreamingPricingChange(pricing, goesFree)?.plan], ['MAIN_SWITCHED', 'ADVERTISING'], 'The main offer moved to Free with ads, the plans still on sale');
const noSubs = withPricing({ ...freeTier, streams: ['ads'] });
assert.equal(kind(freeTier, noSubs), 'SUBSCRIPTIONS_OFF', 'Subscriptions off is the news, not the front door it moved');
assert.equal(kind(pricing, withPricing({ ...pricing, streams: [...pricing.streams, 'rentals'] })), 'STORE_OPENED');
assert.equal(kind(withPricing({ ...pricing, streams: [...pricing.streams, 'rentals'] }), pricing), 'STORE_CLOSED');
assert.equal(kind(noSubs, freeTier), 'SUBSCRIPTIONS_ON', 'Plans back on sale');
assert.equal(kind(pricing, withPricing({ ...pricing, plans: pricing.plans.map(plan => ({ ...plan, ads: false })) })), 'ADS_REMOVED');
console.log('PASS kinds: a new ad plan is a cheaper plan (not a free tier); free tier opened / closed; main offer switched; subscriptions off / on; store opened / closed; ads off');

/* saved on the live service, then told as next week's news */
const saved = (next: OwnedStreamingPricingConfiguration, from: Player = live) => {
    const result = saveStreamingPricingPlan(from, next, 'OPERATIONS');
    assert.ok(result.changed, `saved: ${result.reason}`);
    return result.player;
};
const told = [
    [saved(freeTier), 'PLATFORM_FREE_TIER', 'HIGH', `${name} opens a free tier with ads`],
    [saved(goesFree), 'PLATFORM_OFFER_CHANGED', 'HIGH', `${name} goes free with ads`],
    [saved(noSubs, saved(freeTier)), 'PLATFORM_OFFER_CHANGED', 'HIGH', `${name} drops subscriptions`],
    [saved(pricing, saved(freeTier)), 'PLATFORM_OFFER_CHANGED', 'HIGH', `${name} closes its free tier`],
    [saved(withPricing({ ...pricing, streams: [...pricing.streams, 'rentals'] })), 'PLATFORM_OFFER_CHANGED', 'HIGH', `${name} opens a store`],
    [saved(withPricing({ ...pricing, plans: pricing.plans.map(plan => ({ ...plan, ads: false })) })), 'PLATFORM_OFFER_CHANGED', 'MEDIUM', `${name} drops ads from Basic with ads`],
] as const;
told.forEach(([player, type, importance, headline]) => {
    const fact = stories(player).at(-1)!;
    assert.deepEqual([fact.type, fact.importance, fact.headline], [type, importance, headline]);
});
const newAdPlan = only(saved(pricing, { ...live, ownedStreamingPlatform: { ...live.ownedStreamingPlatform, serviceConfiguration: { ...live.ownedStreamingPlatform.serviceConfiguration, pricing: subsOnly } } }));
assert.deepEqual([newAdPlan.type, newAdPlan.headline], ['PLATFORM_PRICE_CUT', `${name} adds a cheaper plan`], 'The false story is fixed');
assert.ok(!told.some(([player]) => stories(player).some(fact => fact.type === 'PLATFORM_PRICE_CUT')), 'A free tier, the offer\'s moves and ads off are not "a price cut"');
console.log(`PASS told: ${told.map(([, , , headline]) => `"${headline}"`).join(', ')}; a new ad plan: "${newAdPlan.headline}"`);

/* ── the brand: a new look, a new ident, a new front page ── */
const look = applyStreamingBrandLook(live, { ...getStreamingBrandLook(live.ownedStreamingPlatform.identity!), visualMarkId: 'ORBIT', primaryColor: '#8B5CF6' });
assert.ok(look.changed, look.message);
const rebrand = only(look.player);
assert.deepEqual([rebrand.type, rebrand.importance, rebrand.headline], ['PLATFORM_REBRANDED', 'HIGH', `${name} unveils a new look`]);
assert.equal(rebrand.detail, 'A new logo and new colours; the name stays. Fans are split: some miss the old look.');
const ident = rebrandStreamingIdent(live, { soundIdentKey: 'PREMIERE', identPackageId: 'STANDARD' });
assert.ok(ident.changed, ident.message);
assert.deepEqual([only(ident.player).type, only(ident.player).importance, only(ident.player).headline], ['PLATFORM_REBRANDED', 'MEDIUM', `${name} has a new ident`]);
const front = saveStreamingStorefrontPlan(live, { storefrontLayoutId: 'shelves' }, 'OPERATIONS');
assert.ok(front.changed);
const redesign = only(front.player);
assert.deepEqual([redesign.type, redesign.headline, redesign.detail], ['PLATFORM_APP_REDESIGNED', `${name} redesigns its app`,
    'A new home screen, Shelves, greets viewers when they open the app.']);
const twice = saveStreamingStorefrontPlan(saveStreamingStorefrontPlan(live, { storefrontLayoutId: 'wall' }, 'OPERATIONS').player, { storefrontLayoutId: 'shelves' }, 'OPERATIONS');
assert.equal(only(twice.player).detail, redesign.detail, 'Two front pages in a week: one story, the last');
const before = { ...live, ownedStreamingPlatform: { ...live.ownedStreamingPlatform, launchCommit: null, lifecycle: 'FOUNDING' } } as Player;
const opening = saveStreamingStorefrontPlan(before, { storefrontLayoutId: 'shelves' }, 'OPENING');
assert.ok(opening.changed && !opening.player.ownedStreamingPlatform.eventLedger.some(entry => entry.metadata?.kind === 'FRONT_PAGE_CHANGED'), 'Before launch the front page is planning, not news');
console.log(`PASS brand: "${rebrand.headline}" (HIGH: "${rebrand.detail}"), a new ident (MEDIUM), "${redesign.headline}"; before launch, no story`);

/* ── value against the global rivals ── */
const globals = getWorldStreamingRivalOffers(live, week).filter(item => item.kind === 'CORE_GLOBAL' || item.kind === 'GLOBAL_REAL');
const rival4k = globals.flatMap(item => item.offer.plans.filter(plan => plan.monthlyPrice > 0 && (plan.pictureRank ?? 0) >= 3 && !plan.ads).map(plan => plan.monthlyPrice));
const cheapest4k = Math.min(...rival4k);
assert.ok(Number.isFinite(cheapest4k), 'The global rivals sell 4K');
const offer4k = { picture: 'PICTURE_4K', hdr: null, colour: 'COLOUR_8BIT', sound: 'SOUND_STEREO', dialogue: false, screens: 2, downloads: false } as const;
const plans = (premium: number, standard?: number) => ({ ...live, ownedStreamingPlatform: { ...live.ownedStreamingPlatform, serviceConfiguration: { ...live.ownedStreamingPlatform.serviceConfiguration,
    pricing: withPricing({ ...pricing, streams: ['subs'], plans: [
        ...(standard ? [{ id: 'STANDARD', name: 'Standard', monthly: standard, featureIds: [], ads: false, offer: { ...offer4k, picture: 'PICTURE_1080P' as const } }] : []),
        { id: 'PREMIUM', name: 'Premium', monthly: premium, featureIds: [], ads: false, offer: { ...offer4k } },
    ] }) } } } as Player);
const cheap = Math.floor(cheapest4k * (1 - STREAMING_VALUE_CLEAR_GAP) * 100 - 1) / 100;
const praise = collectStreamingValueFacts(plans(cheap), week + 1);
assert.equal(praise.length, 1);
assert.deepEqual([praise[0].type, praise[0].importance, praise[0].headline], ['PLATFORM_VALUE_PRAISED', 'HIGH', `${name} has the cheapest 4K plan around`]);
assert.match(praise[0].detail, new RegExp(`^Premium streams in 4K for \\$${cheap.toFixed(2)} a month\\. The next cheapest, .+'s .+, costs \\$${cheapest4k.toFixed(2)}\\.$`));
assert.equal(collectStreamingValueFacts(plans(Math.round(cheapest4k * .9 * 100) / 100), week + 1).length, 0, '10% cheaper is not clearly cheaper');
const dear = Math.ceil(cheapest4k / (1 - STREAMING_VALUE_CLEAR_GAP) * 100 + 1) / 100;
const criticism = collectStreamingValueFacts(plans(dear), week + 1);
assert.deepEqual([criticism[0]?.type, criticism[0]?.headline.endsWith('4K plan costs more than ' + criticism[0]?.detail.split('; ')[1].split("'s ")[0] + "'s")], ['PLATFORM_VALUE_CRITICISED', true]);
const less = getStreamingValueVerdict(plans(cheapest4k, 30), week + 1);
assert.deepEqual([less?.kind, less?.mine.id], ['CRITICISED', 'STANDARD'], 'A 1080p plan dearer than a rival\'s 4K: pays more for less');
const lessFact = collectStreamingValueFacts(plans(cheapest4k, 30), week + 1)[0];
assert.equal(lessFact.headline, `${name} charges more for less`);
assert.match(lessFact.detail, /^Standard costs \$30\.00 a month for 1080p; .+'s .+ streams 4K for \$\d+\.\d\d\.$/, 'The most damning cheaper plan: a better picture');
const starter = collectStreamingValueFacts(live, week + 1)[0];
assert.ok(!starter || starter.type === 'PLATFORM_VALUE_CRITICISED', 'The starter plans (480p) are read as the world reads them');
assert.equal(collectStreamingValueFacts(plans(cheapest4k * 1.05), week + 1).length, 0, 'Priced like the rivals: no story');
assert.equal(collectStreamingValueFacts({ ...plans(cheap), ownedStreamingPlatform: { ...plans(cheap).ownedStreamingPlatform, launchCommit: null } } as Player, week + 1).length, 0, 'Before launch: no story');
console.log(`PASS value: 4K at $${cheap} vs the rivals' cheapest $${cheapest4k}: "${praise[0].headline}"; at $${dear}: "${criticism[0].headline}"; 1080p at $30: "charges more for less"; like the rivals: nothing`);

/* ── the media voice them: News, X and Instagram, critics for and against ── */
const world = (player: Player) => processIndustryWorldWeek(player, player.world, week + 1);
const reacted = world({ ...look.player, ownedStreamingPlatform: { ...look.player.ownedStreamingPlatform, serviceConfiguration: plans(cheap).ownedStreamingPlatform.serviceConfiguration } });
const events = reacted.world.industryEvents!.events.filter(event => event.absoluteWeek === week + 1 && event.companyId === live.ownedStreamingPlatform.identity!.slug);
assert.deepEqual(events.map(event => event.type).sort(), ['PLATFORM_REBRANDED', 'PLATFORM_VALUE_PRAISED'], 'Two stories in one week: the new look, and the value');
const lines = [
    'A new logo is the easy part; the shows are the same as last week.',
    'The new look finally matches the service it has become.',
    'Viewers will judge the new look in the app, not in the announcement.',
    'A new look earns its cost only if it brings in sign-ups.',
];
const rebrandNews = reacted.player.news.filter(item => item.industryEventId === events.find(event => event.type === 'PLATFORM_REBRANDED')!.id);
assert.ok(rebrandNews.length && rebrandNews.every(item => item.category === 'TOP_STORY'), 'The new look is a top story');
const said = [...rebrandNews.map(item => item.subtext || ''), ...reacted.player.x.feed.filter(post => post.industryEventId === rebrandNews[0].industryEventId).map(post => post.content)];
assert.ok(said.some(text => lines.some(line => text.endsWith(line))) || said.every(text => text.endsWith('Fans are split: some miss the old look.')), 'Critics weigh in on the new look');
const valueEvent = events.find(event => event.type === 'PLATFORM_VALUE_PRAISED')!;
assert.ok(reacted.player.news.some(item => item.industryEventId === valueEvent.id) && reacted.player.x.feed.some(post => post.industryEventId === valueEvent.id), 'The value story in News and on X');
const instagram = reacted.player.instagram?.feed?.filter(post => post.industryEventId && events.some(event => event.id === post.industryEventId)) || [];
const again = world({ ...reacted.player, currentWeek: reacted.player.currentWeek + 1 });
assert.ok(!again.world.industryEvents!.events.some(event => event.type === 'PLATFORM_VALUE_PRAISED' && event.absoluteWeek === week + 2), 'The same verdict at the same price is told once');
console.log(`PASS media: "${rebrandNews[0].headline}" — ${rebrandNews[0].sourceName}: "${rebrandNews[0].subtext}"; value on News and X; Instagram ${instagram.length}; told once`);
console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
