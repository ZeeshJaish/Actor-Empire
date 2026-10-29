import type { Player, YoutubeChannel, YoutubeVideo, YoutubeEconomyState } from '../types';
import { getAbsoluteWeek } from './legacyLogic';
import { creatorNumber as n, creatorClamp as clamp, readCreatorWorld, readCreatorLedger, availableCreatorSpend, claimCreatorAction, creatorPositiveReward } from './creatorEconomy';
const videoTotal = (channel: YoutubeChannel) => channel.videos.reduce((sum, v) => sum + n(v.views), 0);
export const readYoutubeEconomy = (channel: YoutubeChannel): YoutubeEconomyState => channel.economy?.schemaVersion === 1 ? channel.economy : { schemaVersion: 1, lifetimeViews: Math.max(n(channel.totalChannelViews), videoTotal(channel)), observedVideoViews: videoTotal(channel), lastProcessedAbsoluteWeek: -1, recentWeeks: [], recentPublicationKeys: [], merchDemand: 1 };
const age = (p: Player, v: YoutubeVideo) => Math.max(0, (p.age - (v.yearUploaded ?? p.age)) * 52 + p.currentWeek - v.weekUploaded);
export const readYoutubeAudience = (p: Player) => {
    const world = readCreatorWorld(p), channel = p.youtube, e = readYoutubeEconomy(channel);
    const subs = Math.min(n(channel.subscribers), world.eligiblePeople);
    const recent = e.recentWeeks.filter(w => w.week <= world.week && world.week - w.week < 8);
    const observed = recent.length ? recent.reduce((sum, w) => sum + n(w.views), 0) / recent.length :
        channel.videos.filter(v => age(p, v) <= 12).slice(0, 8).reduce((sum, v) => sum + n(v.views) / Math.max(1, age(p, v) + 1), 0);
    const base = Math.min(subs * .08, Math.sqrt(subs) * 120);
    // Bootstrap legacy channels gently; measured viewing replaces most idle subscriber reach over eight weeks.
    const bootstrapReach = base * Math.max(.1, 1 - recent.length / 8);
    const engaged = Math.min(world.eligiblePeople * .15, Math.max(bootstrapReach, observed * .65)) * (.4 + .6 * clamp(n(channel.audienceTrust, 55) / 100));
    return { ...world, subscribers: subs, observedWeeklyViews: observed, engagedPeople: Math.floor(engaged), newPeopleRemaining: Math.max(0, world.eligiblePeople - n(channel.subscribers)) };
};
/** Publication/event views are added once, not reconstructed from a shrinking video list. */
export const recordYoutubeViews = (p: Player, key: string, previousTotal: number, delta: number): Player => {
    const old = p.youtube.economy;
    if (old?.recentPublicationKeys.includes(key))
        return p;
    const e = old || { ...readYoutubeEconomy(p.youtube), lifetimeViews: Math.max(n(previousTotal), Math.max(0, videoTotal(p.youtube) - n(delta))) };
    const week = getAbsoluteWeek(p.age, p.currentWeek), history = e.recentWeeks.filter(w => w.week !== week);
    const current = e.recentWeeks.find(w => w.week === week);
    const lifetime = Math.max(n(previousTotal), e.lifetimeViews) + n(delta);
    return { ...p, youtube: { ...p.youtube, totalChannelViews: lifetime, economy: { ...e, lifetimeViews: lifetime, observedVideoViews: videoTotal(p.youtube),
                recentWeeks: [...history, { week, views: n(current?.views) + n(delta), newSubscribers: n(current?.newSubscribers) }].slice(-12), recentPublicationKeys: [...e.recentPublicationKeys, key].slice(-128) } } };
};
export const quoteYoutubeUpload = (p: Player, video: YoutubeVideo, seededViews = 0, committedReach = false) => {
    const a = readYoutubeAudience(p), count = readCreatorLedger(p).actions.YOUTUBE || 0;
    const quality = clamp(n(video.qualityScore, 50) / 100);
    const fatigue = 1 / (1 + count * .55) ** 1.3;
    const plan = video.uploadPlan === 'PROJECT_PROMO' ? 1.2 : video.uploadPlan === 'VIRAL_BAIT' ? 1.18 : 1;
    const discovery = (250 + 1200 * quality + Math.pow(clamp(p.stats.fame / 100), 2) * a.eligiblePeople * .000001) * plan;
    const organic = (a.engagedPeople * .12 + discovery) * (.35 + quality) * fatigue;
    const promise = committedReach ? n(seededViews) : Math.min(n(seededViews), a.engagedPeople * .8 + discovery * 4) * fatigue;
    return Math.floor(Math.min(a.eligiblePeople, organic + promise));
};
export const quoteYoutubeNewSubscribers = (p: Player, views: number, quality = 70) => {
    const a = readYoutubeAudience(p), saturation = a.eligiblePeople ? a.newPeopleRemaining / a.eligiblePeople : 0;
    return Math.floor(Math.min(a.newPeopleRemaining, n(views) * .3 * (.004 + .016 * clamp(quality / 100)) * saturation));
};
export const resolveYoutubeWeek = (p: Player, random: () => number = Math.random) => {
    const channel = p.youtube, e = readYoutubeEconomy(channel), a = readYoutubeAudience(p);
    if (e.lastProcessedAbsoluteWeek >= a.week)
        return { channel, weeklyRevenue: 0, newSubs: 0, notifications: [] as string[] };
    const weighted = channel.videos.map(v => ({ v, weight: (.05 + clamp(n(v.qualityScore, 50) / 100) ** 2) / (1 + age(p, v) / 4) ** 1.6 }));
    const weight = weighted.reduce((sum, w) => sum + w.weight, 0);
    const meanQuality = weight ? weighted.reduce((sum, w) => sum + w.weight * clamp(n(w.v.qualityScore, 50) / 100), 0) / weight : 0;
    const fresh = weighted.some(w => age(p, w.v) <= 2);
    const discovery = fresh ? (500 + meanQuality * 2500 + Math.pow(clamp(p.stats.fame / 100), 2) * a.eligiblePeople * .000002) : 0;
    const variance = .85 + clamp(random()) * .3;
    const impressions = Math.floor(Math.min(a.eligiblePeople, ((a.engagedPeople * (1 - Math.exp(-weight * .6))) + discovery) * (.25 + meanQuality) * variance));
    const revenue = channel.isMonetized ? Math.floor(impressions / 1000 * Math.min(4, a.referenceCpm * .15)) : 0;
    let allocated = 0, paidCents = 0, newSubs = 0;
    const videos = weighted.map(({ v, weight: w }, i) => {
        const views = weight ? i === weighted.length - 1 ? Math.max(0, impressions - allocated) : Math.floor(impressions * w / weight) : 0;
        allocated += views;
        const cumulativeCents = impressions ? Math.floor(allocated / impressions * revenue * 100) : 0;
        const earned = (cumulativeCents - paidCents) / 100;
        paidCents = cumulativeCents;
        return { ...v, yearUploaded: v.yearUploaded ?? p.age, views: n(v.views) + views, earnings: n(v.earnings) + earned, weeklyHistory: [...(v.weeklyHistory || []), views].slice(-104) };
    });
    // Returning audience is not a fresh subscriber pool. Conversion is channel-wide.
    newSubs = quoteYoutubeNewSubscribers(p, impressions, meanQuality * 100);
    const lifetime = Math.max(e.lifetimeViews, n(channel.totalChannelViews), videoTotal(channel)) + allocated;
    const recent = e.recentWeeks.filter(w => w.week !== a.week), prior = e.recentWeeks.find(w => w.week === a.week);
    const next: YoutubeChannel = { ...channel, videos, subscribers: n(channel.subscribers) + newSubs, lifetimeEarnings: n(channel.lifetimeEarnings) + revenue, totalChannelViews: lifetime,
        economy: { ...e, lifetimeViews: lifetime, observedVideoViews: videoTotal({ ...channel, videos }), lastProcessedAbsoluteWeek: a.week, recentWeeks: [...recent, { week: a.week, views: n(prior?.views) + allocated, newSubscribers: n(prior?.newSubscribers) + newSubs }].slice(-12) } };
    const notifications = [] as string[];
    if (!next.isMonetized && next.subscribers >= 1000 && next.totalChannelViews >= 4000) {
        next.isMonetized = true;
        notifications.push('🎉 You are now eligible for YouTube Monetization! Revenue enabled.');
    }
    return { channel: next, weeklyRevenue: revenue, newSubs, notifications };
};
export const quoteYoutubeBrand = (p: Player, category: string, random: () => number = Math.random) => {
    const a = readYoutubeAudience(p), fit = category === 'LUXURY' || category === 'AUTOMOTIVE' ? .35 : .65;
    const qualified = Math.min(a.eligiblePeople, (a.observedWeeklyViews || a.engagedPeople * .25) * fit * (.75 + clamp(random()) * .5));
    const media = qualified * a.referenceCpm / 1000;
    const fameFee = (100 + 3000 * clamp(p.stats.fame / 100) ** 3) * a.purchasingPower;
    const buyer = a.eligiblePeople ? a.weeklyAdBudget * a.engagedPeople / a.eligiblePeople * .025 : 0;
    const payout = Math.floor(Math.max(0, Math.min(media + fameFee, buyer)));
    return { payout, bonusViews: Math.floor(Math.min(a.eligiblePeople, qualified / Math.max(.1, fit))), basis: { version: 1 as const, qualifiedViews: Math.floor(qualified), buyerBudget: Math.floor(buyer) } };
};
/** Platform-funded bonus uses qualified recent viewing and a small advertiser envelope. */
export const quoteYoutubeCreatorBonus = (p: Player, random: () => number = Math.random) => {
    const audience = readYoutubeAudience(p);
    const qualified = Math.min(audience.eligiblePeople, audience.observedWeeklyViews, audience.engagedPeople * 1.5);
    const mediaValue = qualified / 1000 * audience.referenceCpm * .3 * (.7 + clamp(random()) * .6);
    const buyerBudget = audience.eligiblePeople ? audience.weeklyAdBudget * audience.engagedPeople / audience.eligiblePeople * .005 : 0;
    return Math.floor(Math.max(0, Math.min(mediaValue, buyerBudget)));
};
export const quoteYoutubeLive = (p: Player, viewMultiplier = 1, memberBoost = 0, random: () => number = Math.random) => {
    const a = readYoutubeAudience(p), fatigue = 1 / (1 + (readCreatorLedger(p).actions.YOUTUBE || 0) * .3);
    const views = Math.floor(Math.min(a.eligiblePeople, (300 + a.engagedPeople * (.1 + clamp(random()) * .1)) * clamp(viewMultiplier, .5, 1.5) * fatigue));
    const donations = Math.floor(Math.min(availableCreatorSpend(p, a.engagedPeople), views * .012 * (1 + clamp(memberBoost, 0, .5)) * (1 + clamp(p.youtube.fanMood / 100)) * a.purchasingPower));
    return { views, donations, newSubscribers: quoteYoutubeNewSubscribers(p, views, 70) };
};
export const quoteYoutubeMemberships = (p: Player) => {
    const a = readYoutubeAudience(p), trust = clamp(p.youtube.audienceTrust / 100), mood = clamp(p.youtube.fanMood / 100);
    const target = Math.floor(Math.min(a.eligiblePayers, a.engagedPeople * .008 * (.4 + trust * .3 + mood * .3)));
    const members = Math.max(0, Math.floor(n(p.youtube.members) * .85 + target * .15));
    const paidMembers = Math.min(members, target, Math.floor(availableCreatorSpend(p, a.engagedPeople) / 4));
    return { members, paidMembers, revenue: paidMembers * 4 };
};
/** Reconcile one action's positive stat rewards without altering its signed cash terms. */
export const settleYoutubeActivity = (before: Player, after: Player, key: string, viewDelta: number): Player => {
    const action = claimCreatorAction(before, 'YOUTUBE', key);
    if (action.duplicate)
        return before;
    let next: Player = { ...after, creatorEconomy: action.player.creatorEconomy };
    const values = [['trust', before.youtube.audienceTrust, after.youtube.audienceTrust, 3], ['mood', before.youtube.fanMood, after.youtube.fanMood, 3], ['fame', before.stats.fame, after.stats.fame, 2], ['reputation', before.stats.reputation, after.stats.reputation, 2]] as const;
    for (const [stat, oldValue, newValue, limit] of values) {
        const delta = newValue - oldValue;
        const reward = creatorPositiveReward(next, stat, delta > 0 ? delta * action.rewardScale : delta, limit);
        next = reward.player;
        if (stat === 'trust' || stat === 'mood')
            next = { ...next, youtube: { ...next.youtube, [stat === 'trust' ? 'audienceTrust' : 'fanMood']: clamp(oldValue + reward.delta, 0, 100) } };
        else
            next = { ...next, stats: { ...next.stats, [stat]: clamp(oldValue + reward.delta, 0, 100) } };
    }
    const published = next.youtube.videos[0];
    if (published && published.id !== before.youtube.videos[0]?.id && !before.youtube.videos.some(video => video.id === published.id)) {
        next = {...next,youtube:{...next.youtube,videos:[{...published,trustImpact:next.youtube.audienceTrust-before.youtube.audienceTrust},...next.youtube.videos.slice(1)]}};
    }
    return recordYoutubeViews(next, key, n(before.youtube.totalChannelViews), viewDelta);
};
