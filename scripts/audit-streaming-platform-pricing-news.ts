/** Price and plan changes draw critic reactions, #68 (codex-handoff/plans/platform-tech-plan.md §10, Phase 5:
 *  "pricing and plan changes, with critic reactions (price rises, ads added to Premium, a cheaper ad
 *  plan…), the way real critics react"; §1: "Pricing and plan changes draw critic reactions such as
 *  "yeh fair nahi hai""). Checks:
 *  - which change the news leads with: ads put on a paid plan, the biggest rise, a free tier, a new
 *    cheaper plan, the biggest cut, ads taken off; small moves and renames are not news (#117: a new ad
 *    plan is a cheaper plan, not a free tier; the offer's other moves are checked in audit:streaming-world-reacts);
 *  - saving new pricing on the live test company records the change on its ledger; a change that is
 *    not news records nothing;
 *  - the next week's industry pass: "<name> raises <plan> to $X a month" as a top story and on X, in the
 *    critics' own words for a price rise; ads put on a plan the same way. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingPricingConfiguration, type OwnedStreamingPricingPlan, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { saveStreamingPricingPlan } from '../services/streamingLaunchProgram';
import { describeStreamingPricingChange } from '../services/streamingPricingChange';
import { processIndustryWorldWeek } from '../services/industryWorld';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Pricing News Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const plan = (id: string, name: string, monthly: number, ads = false): OwnedStreamingPricingPlan => ({ id, name, monthly, featureIds: ['catalogue'], ads });
const pricing = (plans: OwnedStreamingPricingPlan[], streams: OwnedStreamingPricingConfiguration['streams'] = ['subs']) => ({ plans, streams });

async function main() {
    const started = performance.now();

    /* ── which change is news ── */
    const before = pricing([plan('BASIC', 'Basic', 7.99), plan('STANDARD', 'Standard', 12.99, true), plan('PREMIUM', 'Premium', 17.99)]);
    const kinds = (after: ReturnType<typeof pricing>) => {
        const change = describeStreamingPricingChange(before, after);
        return change ? [change.change, change.plan, change.from, change.to, change.percent] : null;
    };
    assert.deepEqual(kinds(pricing([plan('BASIC', 'Basic', 7.99), plan('STANDARD', 'Standard', 12.99, true), plan('PREMIUM', 'Premium', 17.99, true)])),
        ['ADS_ADDED', 'Premium', 0, 0, 0], 'Ads put on Premium');
    assert.deepEqual(kinds(pricing([plan('BASIC', 'Basic', 7.99), plan('STANDARD', 'Standard', 12.99, true), plan('PREMIUM', 'Premium', 19.99, true)]))?.[0],
        'ADS_ADDED', 'Ads on Premium lead a rise the same day');
    assert.deepEqual(kinds(pricing([plan('BASIC', 'Basic', 8.99), plan('STANDARD', 'Standard', 12.99, true), plan('PREMIUM', 'Premium', 19.99)])),
        ['RAISED', 'Basic', 7.99, 8.99, 13], 'The biggest rise in percent');
    assert.deepEqual(kinds(pricing([...before.plans, plan('FREE', 'Free', 0, true)], ['subs', 'ads'])), ['FREE_TIER', '', 0, 0, 0], 'A free tier');
    /* #117: a new ad plan is not "a free plan with ads" */
    assert.deepEqual(kinds(pricing([...before.plans, plan('LITE', 'Lite', 3.99, true)], ['subs', 'ads']))?.[0], 'NEW_CHEAPER', 'A new ad plan is a cheaper plan, not a free tier');
    assert.deepEqual(kinds(pricing([...before.plans, plan('LITE', 'Lite', 3.99, true)])), ['NEW_CHEAPER', 'Lite', 0, 3.99, 0], 'A plan cheaper than all before');
    assert.deepEqual(kinds(pricing([plan('BASIC', 'Basic', 6.99), before.plans[1], before.plans[2]])), ['CUT', 'Basic', 7.99, 6.99, 13], 'A cut');
    assert.deepEqual(kinds(pricing([before.plans[0], plan('STANDARD', 'Standard', 12.99), before.plans[2]])), ['ADS_REMOVED', 'Standard', 0, 0, 0], 'Ads taken off');
    assert.equal(kinds(pricing([plan('BASIC', 'Essentials', 8.19), before.plans[1], before.plans[2]])), null, 'A rename and a 3% move are not news');
    assert.equal(kinds(pricing([...before.plans, plan('ULTRA', 'Ultra', 24.99)])), null, 'A dearer plan added is not news');
    console.log('PASS change: ads on Premium (even with a rise), the biggest rise (Basic +13%), a free tier, a cheaper plan (Lite $3.99), a cut (−13%), ads off; renames, 3% moves and a dearer plan are not news');

    /* ── saving it on the live test company ── */
    const qa = await buildStreamingFullPlatformQa(fresh('platform-pricing-news'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const platform = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    const name = platform.identity!.name;
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const current = platform.serviceConfiguration.pricing;
    const top = [...current.plans].filter(item => item.monthly > 0).sort((left, right) => right.monthly - left.monthly)[0];
    assert.ok(top, 'The test company sells a paid plan');
    const raisedPrice = Math.round(top.monthly * 1.2 * 100) / 100;
    const raised = saveStreamingPricingPlan(qa, { ...current, plans: current.plans.map(item => (item.id === top.id ? { ...item, monthly: raisedPrice } : item)) }, 'OPERATIONS');
    assert.ok(raised.changed, 'The price is saved');
    const ledger = normalizeOwnedStreamingPlatformState(raised.player.ownedStreamingPlatform, qa.id).eventLedger;
    const entry = ledger.find(item => item.type === 'PRICING_CHANGED');
    assert.ok(entry, 'The change is on the ledger');
    assert.deepEqual([entry!.absoluteWeek, entry!.source, entry!.metadata?.change, entry!.metadata?.plan, entry!.metadata?.to, entry!.metadata?.percent],
        [week, 'PLAYER_ACTION', 'RAISED', top.name, raisedPrice, 20]);
    const quiet = saveStreamingPricingPlan(qa, { ...current, plans: current.plans.map(item => (item.id === top.id ? { ...item, name: `${item.name} Plus` } : item)) }, 'OPERATIONS');
    assert.ok(quiet.changed && !normalizeOwnedStreamingPlatformState(quiet.player.ownedStreamingPlatform, qa.id).eventLedger.some(item => item.type === 'PRICING_CHANGED'),
        'A rename is saved but makes no news');
    console.log(`PASS save: ${top.name} ${top.monthly} → ${raisedPrice} on the live test company is on its ledger (RAISED, 20%); a rename records nothing`);

    /* ── the next week's industry pass ── */
    const pass = processIndustryWorldWeek(raised.player, raised.player.world, week + 1);
    const fact = pass.world.industryEvents!.events.find(item => item.type === 'PLATFORM_PRICE_RAISED' && item.absoluteWeek === week + 1);
    assert.ok(fact, 'The rise is a fact');
    const money = (amount: number) => `$${amount.toFixed(2)}`;
    assert.deepEqual([fact!.importance, fact!.headline, fact!.detail],
        ['HIGH', `${name} raises ${top.name} to ${money(raisedPrice)} a month`, `${top.name} goes from ${money(top.monthly)} to ${money(raisedPrice)} a month, 20% more.`]);
    const news = pass.player.news.find(item => item.id === `news_${fact!.id}`);
    assert.ok(news && news.category === 'TOP_STORY', 'A top story');
    assert.ok(pass.player.x.feed.some(item => item.id === `x_${fact!.id}`), 'and on X');
    const said = news!.subtext || '';
    const reactions = [
        'Subscribers are paying more for the same shows. That is not fair.',
        'Great shows cost more to make; a higher price was always coming.',
        'The question is how many subscribers stay at the new price.',
        'The test is whether the extra revenue outruns the cancellations it causes.',
    ];
    assert.ok(reactions.some(line => said.endsWith(line)) || said === fact!.detail, 'The critics react to a price rise as a price rise');
    console.log(`PASS week: "${news!.headline}" — top story (${news!.sourceName}${news!.byline ? `, ${news!.byline}` : ''}) and X`);
    console.log(`  News: "${said}"`);

    /* ── ads on a paid plan ── */
    const adFree = current.plans.find(item => item.monthly > 0 && !item.ads);
    if (adFree) {
        const withAds = saveStreamingPricingPlan(qa, { ...current, streams: current.streams.includes('ads') ? current.streams : [...current.streams, 'ads'],
            plans: current.plans.map(item => (item.id === adFree.id ? { ...item, ads: true, adLevel: 'STANDARD' as const } : item)) }, 'OPERATIONS');
        assert.ok(withAds.changed, 'Ads are saved');
        const adsPass = processIndustryWorldWeek(withAds.player, withAds.player.world, week + 1);
        const adsFact = adsPass.world.industryEvents!.events.find(item => item.type === 'PLATFORM_ADS_ADDED' && item.absoluteWeek === week + 1);
        assert.ok(adsFact && adsFact.importance === 'HIGH' && adsFact.headline === `${name} puts ads on ${adFree.name}`, 'Ads put on a plan are big news');
        assert.ok(adsPass.player.news.some(item => item.id === `news_${adsFact!.id}`), 'In the News app');
        console.log(`PASS ads: "${adsFact!.headline}" — ${adsFact!.detail}`);
    } else {
        console.log('SKIP ads: every paid plan of the test company already carries ads');
    }
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
