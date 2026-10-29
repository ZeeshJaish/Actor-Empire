import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player, type YoutubeVideo } from '../types';
import { createDeterministicRng } from '../services/deterministicRandom';
import { readCreatorWorld } from '../services/creatorEconomy';
import { quoteYoutubeUpload, quoteYoutubeNewSubscribers, settleYoutubeActivity, readYoutubeAudience, quoteYoutubeBrand, quoteYoutubeLive, quoteYoutubeMemberships } from '../services/youtubeEconomy';
import { processYoutubeChannel, calculateYoutubeMerchQuote } from '../services/youtubeLogic';
import { spendPlayerEnergy } from '../services/premiumLogic';
const make = (subs = 1000) => { const p = structuredClone(INITIAL_PLAYER); p.age = 25; p.currentWeek = 1; p.money = 1e6; p.stats.fame = 10; p.stats.reputation = 50; Object.assign(p.youtube, { subscribers: subs, isMonetized: subs >= 1000, audienceTrust: 55, fanMood: 55, videos: [], totalChannelViews: 0, lifetimeEarnings: 0 }); return p; };
const rows: any[] = [];
for (const initialSubscribers of [0,1000])
for (const boosted of [false, true])
    for (let seed = 1; seed <= 5; seed++) {
        Math.random = createDeterministicRng('creator-curve:' + seed);
        let p = make(initialSubscribers);
        const points: any[] = [];
        let spentEnergy = 0;
        for (let week = 1; week <= 104; week++) {
            p.flags.weeklyBaseEnergyRemaining = 100;
            p.flags.bonusEnergyBank = boosted ? 80 : 0;
            p.energy = { current: boosted ? 180 : 100, max: 100 };
            const posts = boosted ? 12 : 4;
            for (let i = 0; i < posts; i++) {
                const quality = 40 + Math.min(45, week * .45);
                const v = { id: `${seed}-${week}-${i}`, title: 'Creator curve', type: 'VLOG', qualityScore: quality, views: 0, likes: 0, earnings: 0, weekUploaded: p.currentWeek, yearUploaded: p.age, weeklyHistory: [], comments: [], isPlayer: true, uploadPlan: 'SAFE' } as YoutubeVideo;
                const views = quoteYoutubeUpload(p, v);
                v.views = views;
                v.weeklyHistory = [views];
                const next = { ...p, youtube: { ...p.youtube, videos: [v, ...p.youtube.videos], subscribers: p.youtube.subscribers + quoteYoutubeNewSubscribers(p, views, quality), audienceTrust: Math.min(100, p.youtube.audienceTrust + 5), fanMood: Math.min(100, p.youtube.fanMood + 2) } };
                spendPlayerEnergy(next, 15, 'Creator audit VLOG');
                spentEnergy += 15;
                p = settleYoutubeActivity(p, next, `upload:${v.id}`, views);
            }
            const result = processYoutubeChannel(p);
            p = { ...p, youtube: result.channel, money: p.money + result.weeklyRevenue };
            assert.ok(p.youtube.subscribers <= readCreatorWorld(p).eligiblePeople);
            assert.ok(p.youtube.audienceTrust <= 100);
            if ([4, 12, 26, 52, 104].includes(week))
                points.push({ week, subscribers: p.youtube.subscribers, views: p.youtube.totalChannelViews, adIncome: p.youtube.lifetimeEarnings, weeklyAds: result.weeklyRevenue, trust: p.youtube.audienceTrust });
            if (p.currentWeek === 52) {
                p.age++;
                p.currentWeek = 1;
            }
            else
                p.currentWeek++;
        }
        rows.push({ initialSubscribers, seed, route: boosted ? 'BOOSTED_CONTENT_BUDGET_180E' : 'FREE_CONTENT_BUDGET_60E', uploads: boosted ? 1248 : 416, spentEnergy, points });
    }
for(const initialSubscribers of [0,1000])for(let seed=1;seed<=5;seed++){
 const pair=rows.filter(r=>r.initialSubscribers===initialSubscribers&&r.seed===seed);
 assert.ok(pair[1].points.at(-1).subscribers>pair[0].points.at(-1).subscribers,'Boosted energy should retain useful reach');
 assert.ok(pair[1].points.at(-1).adIncome>pair[0].points.at(-1).adIncome,'Extra qualified views should retain useful income');
 assert.ok(pair[0].points[0].subscribers>initialSubscribers,'Early content should earn subscribers');
}
const mature = [];
for (const [subs, views] of [[1000, 2500], [1e6, 1e6], [1e8, 40e6], [1e10, 0]]) {
    const p = make(subs);
    p.stats.fame = 80;
    p.youtube.audienceTrust = 80;
    p.youtube.fanMood = 80;
    if (views)
        p.youtube.economy = { schemaVersion: 1, lifetimeViews: views * 4, observedVideoViews: 0, lastProcessedAbsoluteWeek: -1, recentWeeks: [{ week: 1248, views, newSubscribers: 0 }], recentPublicationKeys: [], merchDemand: 1 };
    // Use the actual current week, independent of fixture age constants.
    if (p.youtube.economy)
        p.youtube.economy.recentWeeks[0].week = readCreatorWorld(p).week;
    mature.push({ subscribers: subs, observedWeeklyViews: views, audience: readYoutubeAudience(p), brand: quoteYoutubeBrand(p, 'TECH', () => .5), merch: calculateYoutubeMerchQuote(p, 'BASIC', () => .5), live: quoteYoutubeLive(p, 1, 0, () => .5), membership: quoteYoutubeMemberships(p) });
}
const result = { scope: 'Actual creator functions and energy spend; fixed exogenous quality progression and content energy budgets, not a full actor career or real IAP transaction', rows, mature };
writeFileSync(process.env.CREATOR_CURVE_OUTPUT || '/tmp/ae-creator-curves.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ routes: rows.map(r => ({ initialSubscribers:r.initialSubscribers, seed: r.seed, route: r.route, final: r.points.at(-1) })), mature: mature.map(p => ({ subscribers: p.subscribers, views: p.observedWeeklyViews, engaged: p.audience.engagedPeople, brand: p.brand.payout, merch: p.merch.netProfit, production: p.merch.productionCost, live: p.live.donations, membership: p.membership.revenue })) }));
