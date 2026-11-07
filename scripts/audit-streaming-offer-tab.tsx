/**
 * #108 The Offer tab assembled (plan §18.4, 18.11; Zeesh, 2026-11-01: "जो हमारा कंप्लीट ऑफर पेज है, ऑफर पेज को रीडिज़ाइन
 * जो भी करना कर दो" … on account sharing's figures: "आउटसाइड होम, पब्लिकली क्लोज, पायरेसी, उसको थोड़ा सा और बेटर दिखाना होगा"):
 *  - in this order: the money engine, the plans, the Pricing step's controls (ad breaks, store, deals: read-only until
 *    Change pricing, then the one editor each, the table's free Ads cell and store price opening them), account sharing;
 *  - everything the wizard set can change after launch (plan §18.3, 7), and the receipt names it: Pay yearly, First three
 *    months and its plan, the passes, who can buy, early access;
 *  - account sharing: the posture a dial of three stops, enforcement three levels of bars, each figure a gauge from none
 *    to the most any of the nine policies would give, the pick filled and today's ticked;
 *  - while editing, a pinned bar with the count and the last change.
 * Renders with react-dom/server; class names from the CSS modules (esbuild local-css). (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { OwnedStreamingPricingConfiguration, WorldStreamingCustomerAccessPolicy } from '../types';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { configureStreamingPricingOffer } from '../services/streamingCommercialOffers';
import { getStreamingPlanBuilderView, replaceWithStreamingStarterPlans } from '../services/streamingPlanBuilder';
import { normalizeStreamingPricingConfiguration } from '../services/streamingPricingEconomy';
import { STREAMING_NO_SHARING_CONTROL } from '../services/streamingSharingPolicy';
import { PlatformOffer, changesBetween, type PlatformOfferData } from '../components/streaming-transplant/PlatformOffer';
import { SharingPolicyCard } from '../components/streaming-transplant/SharingPolicyCard';
import sharingCss from '../components/streaming-transplant/presentation/screens/AudienceDesk/SharingPolicy.module.css';

const sc = sharingCss as unknown as Record<string, string>;
const view = getStreamingPlanBuilderView({ technologyLevels: { PLAYBACK_QUALITY: 60, RELIABILITY: 40, DELIVERY_CAPACITY: 40, PRODUCT_EXPERIENCE: 30, ADVERTISING_COMMERCE: 10 } });
const base = normalizeOwnedStreamingPlatformState(undefined, 'offer-tab-audit').serviceConfiguration.pricing;
let saved: OwnedStreamingPricingConfiguration = replaceWithStreamingStarterPlans(configureStreamingPricingOffer(base, { kind: 'CORE', coreModel: 'SUBSCRIPTION' }), view);
saved = configureStreamingPricingOffer(saved, { kind: 'TOGGLE', offer: 'ADS', enabled: true });
saved = configureStreamingPricingOffer(saved, { kind: 'TOGGLE', offer: 'STORE', enabled: true });

/* ── the receipt: what the controls change, after launch too ── */
let draft = normalizeStreamingPricingConfiguration({ ...saved, annualDiscount: saved.annualDiscount === 20 ? 25 : 20, introOffer: 30, introOfferPlanId: saved.plans[0].id });
draft = configureStreamingPricingOffer(draft, { kind: 'PASS', duration: 'ONE_HOUR', price: 1.99 });
draft = configureStreamingPricingOffer(draft, { kind: 'STORE_ELIGIBILITY', scope: 'MEMBERSHIP_PLANS', planIds: [saved.plans[0].id] });
draft = configureStreamingPricingOffer(draft, { kind: 'BENEFIT', offer: 'FREE_AD', premiumAccess: true, earlyAccessWeeks: 2 });
const lines = changesBetween(saved, draft, view);
const want = [
    /^Pay yearly: (\d+% off|off) → \d+% off$/,
    new RegExp(`^First three months: off → 30% off on ${saved.plans[0].name}$`),
    /^1 hour ad-free pass: off → \$1\.99$/,
    /^Who can rent or buy: everyone → members of 1 plan$/,
    /^Free tier early access: off → 2 weeks early$/,
];
for (const pattern of want) assert.ok(lines.some(line => pattern.test(line)), `The receipt says ${pattern}: ${JSON.stringify(lines)}`);
assert.deepEqual(changesBetween(saved, saved, view), [], 'Nothing changed, no lines');
console.log(`PASS receipt: ${lines.length} lines (deals, the intro's plan, a pass, who can buy, early access)`);

/* ── the page, live and read-only ── */
const offer: PlatformOfferData = {
    live: true, pricing: saved,
    planStats: Object.fromEntries(saved.plans.map((plan, index) => [plan.id, { accounts: 1000 * (index + 1), monthlyRevenue: 1000 * (index + 1) * plan.monthly }])),
    earnings: { subscription: 90_000, ads: 20_000, store: 5_000, settled: true },
    storefront: { currentId: null, layouts: [] }, ident: { label: 'Pulse', detail: 'Sting' }, planBuilder: view,
};
const policy: WorldStreamingCustomerAccessPolicy = { sharingPosture: 'BALANCED', enforcementInvestment: 'STANDARD', source: 'PLAYER_ACTION', updatedAtAbsoluteWeek: 1 };
const settled = { paidAccounts: 2_000_000, sharedHomes: 300_000, piracyReach: 900_000, accessLoadAccounts: 2_300_000 };
const page = renderToStaticMarkup(createElement(PlatformOffer, {
    accent: '#2F7BFF', offer, actions: { applyPricing: () => ({ ok: true, message: '' }) },
    sharing: { policy, settled, control: STREAMING_NO_SHARING_CONTROL, available: true, appliesNextWeek: false, onApply: () => undefined },
}));
const order = ['Your money engine', 'aria-label="Plans side by side"', 'Breaks, store and deals', 'Change pricing', 'Who can watch on one paid account?'].map(token => page.indexOf(token));
assert.ok(order.every(at => at > 0) && order.every((at, index) => index === 0 || at > order[index - 1]), `The tab: engine → plans → controls → Change pricing → sharing (${order})`);
assert.match(page, /aria-label="AD BREAKS"[\s\S]*aria-label="STORE"[\s\S]*aria-label="DEALS"/, 'The three controls');
// the controls' own markup, up to the Change pricing button that follows them
const controls = page.slice(page.indexOf('Breaks, store and deals'), page.lastIndexOf('<button', page.indexOf('Change pricing')));
assert.doesNotMatch(controls, /<button/, 'Read-only until Change pricing');
assert.doesNotMatch(page, /AD BREAKS<\/span><b>|STORE PRICES/, 'The old ad breaks and store rows are gone');
console.log('PASS page: engine → plans → breaks, store and deals (read-only) → Change pricing → account sharing');

/* ── account sharing: a dial, levels, gauges ── */
const card = (props: Partial<Parameters<typeof SharingPolicyCard>[0]> = {}) => renderToStaticMarkup(createElement(SharingPolicyCard, {
    accent: '#2F7BFF', policy, settled, settledAvailable: true, onApply: () => undefined, ...props,
}));
const sharing = card();
assert.match(sharing, new RegExp(`class="${sc.dial}" role="radiogroup" aria-label="Sharing posture" style="--at:50%"`), 'The posture: a dial, at Balanced (the middle stop)');
assert.equal((sharing.match(new RegExp(`class="${sc.stop}`, 'g')) ?? []).length, 3, 'with three stops');
const levels = sharing.slice(sharing.indexOf('aria-label="Enforcement"'), sharing.indexOf(sc.outlook));
assert.equal((levels.match(new RegExp(`class="${sc.lit}"`, 'g')) ?? []).length, 1 + 2 + 3, 'Enforcement: one, two and three bars lit');
assert.equal((sharing.match(new RegExp(`class="${sc.gauge}"`, 'g')) ?? []).length, 5, 'Five gauges: outside homes, load, policing cost, cancellations, piracy');
assert.match(sharing, /Outside homes on your accounts[\s\S]*Network load[\s\S]*Policing cost[\s\S]*Extra cancellations[\s\S]*Piracy/);
assert.match(sharing, new RegExp(`style="--g:#ffb020"[\\s\\S]*?<i class="${sc.gauge}" aria-hidden="true"><em style="width:\\d+%"></em></i>`), 'Each a bar filled where the policy lands');
const paying = card({ control: { ...STREAMING_NO_SHARING_CONTROL, extraMemberShare: .3, sellsExtraMember: true } });
assert.equal((paying.match(new RegExp(`class="${sc.gauge}"`, 'g')) ?? []).length, 6, 'With Paid extra member sold: a sixth gauge, paying extra members');
assert.match(card({ settledAvailable: false }), /The first settled week fills this in/, 'Before a settled week, it waits');
console.log('PASS sharing: the posture a dial of three stops, enforcement one-two-three bars, five gauges (six with paying extra members)');

/* ── editing: the one editor each, the pinned bar ── */
const source = readFileSync(resolve(process.cwd(), 'components/streaming-transplant/PlatformOffer.tsx'), 'utf8');
assert.ok(source.includes('onOpenControl={editing ? openControl : undefined}'), 'While editing, the table\'s free Ads cell and store price open their control');
assert.ok(source.includes("<OfferControls pricing={shown} tree={builder.tree} onChange={editing ? update : undefined}"), 'The controls edit the draft, only while editing');
assert.ok(source.includes("`YOUR CHANGES · ${changes.length}`") && source.includes("changes.at(-1) ?? 'Change anything above'"), 'The pinned bar: the count and the last change');
console.log('PASS editing: the controls edit the draft; the table opens them; the pinned bar shows the count and the last change');
console.log('done');
