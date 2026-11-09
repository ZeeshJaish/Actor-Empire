import type { Player } from '../types';
import { createDeterministicRng } from './deterministicRandom';

/* Zeesh, 2026-11-09: players of 1.0.25 reported billions of followers and views. The October creator economy stopped
   new runaway growth, but its only limit was the whole online world (about 5 billion people), and old saves kept their
   billions. Real accounts top out near 600M on Instagram, 200M on X and 300M YouTube subscribers, and only the most
   famous people come close. Growth now slows as an account nears what its fame can hold, and old saves settle under
   each platform's top. */
export type SocialPlatform = 'INSTAGRAM' | 'X' | 'YOUTUBE';

export const SOCIAL_PLATFORM_MAX: Readonly<Record<SocialPlatform, number>> = {
    INSTAGRAM: 600_000_000,
    X: 200_000_000,
    YOUTUBE: 300_000_000,
};
const SOCIAL_PLATFORM_FLOOR: Readonly<Record<SocialPlatform, number>> = {
    INSTAGRAM: 250_000,
    X: 120_000,
    YOUTUBE: 300_000,
};
/** The most one video, a channel's lifetime, one week of a channel and one post can show. */
export const SOCIAL_VIEW_LIMITS = Object.freeze({
    VIDEO: 1_500_000_000,
    CHANNEL_LIFETIME: 120_000_000_000,
    CHANNEL_WEEK: 400_000_000,
    INSTAGRAM_POST_LIKES: 60_000_000,
    X_POST_LIKES: 12_000_000,
});

const count = (value: unknown): number => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, number) : 0;
};

/** The audience this much fame can hold: fame 100 reaches the platform's top, fame 50 about a fifth of it. */
export const socialAudienceCeiling = (platform: SocialPlatform, fame: number): number => {
    const share = Math.pow(Math.min(100, count(fame)) / 100, 2.2);
    return Math.max(SOCIAL_PLATFORM_FLOOR[platform], Math.round(SOCIAL_PLATFORM_MAX[platform] * share));
};

/** The share of a new gain that still lands: nearly all of it far below the ceiling, less near it, none above it. */
export const socialGrowthRoom = (current: number, ceiling: number): number => (
    Math.pow(Math.max(0, 1 - count(current) / Math.max(1, ceiling)), 1.5)
);

/** A gain on one platform after the room its fame leaves. Losses pass through untouched. */
export const limitSocialGain = (platform: SocialPlatform, fame: number, current: number, gain: number): number => (
    gain > 0 ? Math.floor(gain * socialGrowthRoom(current, socialAudienceCeiling(platform, fame))) : gain
);

/** A number past its limit (an old save) lands between 86% and 98% of where it belongs, by its own id, so old billions
    do not all turn into the same figure. Values within the limit are kept as they are. */
export const settleOverLimit = (value: unknown, limit: number, seed: string, landing = limit): number => (
    count(value) <= limit ? count(value) : Math.round(landing * (0.86 + 0.12 * createDeterministicRng(`social-limit:${seed}`)()))
);
const within = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value));

const over = (value: unknown, limit: number): boolean => count(value) > limit;

/** Old saves (1.0.25 and before) can hold billions. Follower counts, video views, a channel's lifetime and weekly
    views, and post likes settle under the platform's top; everything else is kept. The same object comes back when
    nothing is over. */
export const settleLegacySocialCounts = (player: Player): Player => {
    if (!player || typeof player !== 'object') return player;
    const limits = SOCIAL_VIEW_LIMITS;
    const seed = String(player.id || 'player');
    /* where an inflated number lands: what this player's fame can hold, not every platform's top */
    const fame = count(player.stats?.fame);
    const igHome = socialAudienceCeiling('INSTAGRAM', fame);
    const xHome = socialAudienceCeiling('X', fame);
    const ytHome = socialAudienceCeiling('YOUTUBE', fame);
    const videoHome = within(ytHome * 5, 5_000_000, limits.VIDEO);
    const lifetimeHome = within(ytHome * 400, 50_000_000, limits.CHANNEL_LIFETIME);
    const weekHome = within(ytHome * 1.5, 1_000_000, limits.CHANNEL_WEEK);
    const igPostHome = within(igHome * 0.1, 50_000, limits.INSTAGRAM_POST_LIKES);
    const xPostHome = within(xHome * 0.06, 10_000, limits.X_POST_LIKES);
    const instagram = player.instagram;
    const x = player.x;
    const youtube = player.youtube;
    const igPosts = Array.isArray(instagram?.posts) ? instagram.posts : [];
    const xPosts = Array.isArray(x?.posts) ? x.posts : [];
    const xFeed = Array.isArray(x?.feed) ? x.feed : [];
    const videos = Array.isArray(youtube?.videos) ? youtube.videos : [];
    const economy = youtube?.economy;
    const recentWeeks = Array.isArray(economy?.recentWeeks) ? economy.recentWeeks : [];
    const needed = over(player.stats?.followers, SOCIAL_PLATFORM_MAX.INSTAGRAM)
        || over(instagram?.followers, SOCIAL_PLATFORM_MAX.INSTAGRAM)
        || over(x?.followers, SOCIAL_PLATFORM_MAX.X)
        || over(youtube?.subscribers, SOCIAL_PLATFORM_MAX.YOUTUBE)
        || over(youtube?.totalChannelViews, limits.CHANNEL_LIFETIME)
        || over(economy?.lifetimeViews, limits.CHANNEL_LIFETIME)
        || videos.some(video => over(video?.views, limits.VIDEO))
        || recentWeeks.some(week => over(week?.views, limits.CHANNEL_WEEK))
        || igPosts.some(post => over(post?.likes, limits.INSTAGRAM_POST_LIKES))
        || xPosts.some(post => over(post?.likes, limits.X_POST_LIKES))
        || xFeed.some(post => post?.isPlayer && over(post?.likes, limits.X_POST_LIKES));
    if (!needed) return player;

    /* a post keeps its shape: comments, shares and retweets shrink with its likes */
    const scalePost = <T extends { id?: string; likes?: number }>(post: T, limit: number, landing: number, kind: string): T => {
        if (!over(post?.likes, limit)) return post;
        const likes = settleOverLimit(post.likes, limit, `${kind}:${post.id}`, landing);
        const ratio = likes / Math.max(1, count(post.likes));
        const scaled: Record<string, unknown> = { ...post, likes };
        for (const key of ['comments', 'shares', 'saves', 'retweets', 'replies']) {
            if (typeof (post as Record<string, unknown>)[key] === 'number') scaled[key] = Math.round(count((post as Record<string, unknown>)[key]) * ratio);
        }
        return scaled as T;
    };
    const nextVideos = videos.map(video => {
        if (!over(video?.views, limits.VIDEO)) return video;
        const views = settleOverLimit(video.views, limits.VIDEO, `video:${video.id}`, videoHome);
        return { ...video, views, ...(typeof video.likes === 'number' ? { likes: Math.min(count(video.likes), views) } : {}) };
    });
    const videoTotal = nextVideos.reduce((sum, video) => sum + count(video?.views), 0);
    const lifetime = Math.max(videoTotal, settleOverLimit(youtube?.totalChannelViews, limits.CHANNEL_LIFETIME, `channel-lifetime:${seed}`, lifetimeHome));
    const followers = settleOverLimit(player.stats?.followers, SOCIAL_PLATFORM_MAX.INSTAGRAM, `instagram:${seed}`, igHome);

    return {
        ...player,
        ...(player.stats ? { stats: { ...player.stats, followers } } : {}),
        ...(instagram ? {
            instagram: {
                ...instagram,
                followers: settleOverLimit(instagram.followers, SOCIAL_PLATFORM_MAX.INSTAGRAM, `instagram:${seed}`, igHome),
                posts: igPosts.map(post => scalePost(post, limits.INSTAGRAM_POST_LIKES, igPostHome, 'instagram-post')),
            },
        } : {}),
        ...(x ? {
            x: {
                ...x,
                followers: settleOverLimit(x.followers, SOCIAL_PLATFORM_MAX.X, `x:${seed}`, xHome),
                posts: xPosts.map(post => scalePost(post, limits.X_POST_LIKES, xPostHome, 'x-post')),
                feed: xFeed.map(post => (post?.isPlayer ? scalePost(post, limits.X_POST_LIKES, xPostHome, 'x-post') : post)),
            },
        } : {}),
        ...(youtube ? {
            youtube: {
                ...youtube,
                subscribers: settleOverLimit(youtube.subscribers, SOCIAL_PLATFORM_MAX.YOUTUBE, `youtube:${seed}`, ytHome),
                videos: nextVideos,
                totalChannelViews: lifetime,
                ...(economy ? {
                    economy: {
                        ...economy,
                        lifetimeViews: Math.min(count(economy.lifetimeViews), lifetime) || lifetime,
                        observedVideoViews: Math.min(count(economy.observedVideoViews), videoTotal),
                        recentWeeks: recentWeeks.map(week => (over(week?.views, limits.CHANNEL_WEEK)
                            ? { ...week, views: settleOverLimit(week.views, limits.CHANNEL_WEEK, `channel-week:${seed}:${week.week}`, weekHome) }
                            : week)),
                    },
                } : {}),
            },
        } : {}),
    };
};

/** One week of growth from every source (posts, events, life events, organic growth), limited together by what the
    player's fame can hold; then anything left from an old save settles. Losses pass through. */
export const settleSocialAudiences = (before: Player, after: Player): Player => {
    if (!after || typeof after !== 'object') return after;
    const fame = count(after.stats?.fame);
    const grow = (platform: SocialPlatform, was: unknown, now: unknown): number => {
        const start = count(was);
        const end = count(now);
        return end > start ? start + limitSocialGain(platform, fame, start, end - start) : end;
    };
    return settleLegacySocialCounts({
        ...after,
        ...(after.stats ? { stats: { ...after.stats, followers: grow('INSTAGRAM', before?.stats?.followers, after.stats.followers) } } : {}),
        ...(after.instagram ? { instagram: { ...after.instagram, followers: grow('INSTAGRAM', before?.instagram?.followers, after.instagram.followers) } } : {}),
        ...(after.x ? { x: { ...after.x, followers: grow('X', before?.x?.followers, after.x.followers) } } : {}),
        ...(after.youtube ? { youtube: { ...after.youtube, subscribers: grow('YOUTUBE', before?.youtube?.subscribers, after.youtube.subscribers) } } : {}),
    });
};
