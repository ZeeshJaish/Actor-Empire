// Social audiences stay believable (Zeesh, 2026-11-09: players of 1.0.25 reached billions of followers and views).
// Run: esbuild scripts/audit-social-audience-limits.ts --bundle --platform=node --format=esm --loader:.csv=text --outfile=/tmp/a.mjs && node /tmp/a.mjs
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import {
    SOCIAL_PLATFORM_MAX, limitSocialGain, settleLegacySocialCounts, settleSocialAudiences, socialAudienceCeiling,
} from '../services/socialAudienceLimits';
import { calculateInstagramPostOutcome } from '../services/instagramLogic';
import { quoteYoutubeNewSubscribers, quoteYoutubeUpload, recordYoutubeViews, resolveYoutubeWeek } from '../services/youtubeEconomy';

/* fame decides the room: monotonic, the top only at fame 100 */
for (const platform of ['INSTAGRAM', 'X', 'YOUTUBE'] as const) {
    let last = 0;
    for (const fame of [0, 10, 30, 50, 80, 100]) {
        const ceiling = socialAudienceCeiling(platform, fame);
        assert.ok(ceiling >= last, `${platform} ceiling grows with fame`);
        last = ceiling;
    }
    assert.equal(socialAudienceCeiling(platform, 100), SOCIAL_PLATFORM_MAX[platform]);
    assert.equal(limitSocialGain(platform, 100, 1_000, 500), 499, 'far below the ceiling a gain nearly all lands');
    assert.equal(limitSocialGain(platform, 20, socialAudienceCeiling(platform, 20), 10_000), 0, 'at the ceiling nothing more lands');
    assert.equal(limitSocialGain(platform, 20, 5, -3), -3, 'losses pass through');
}

/* old saves: billions settle where the player's fame belongs; normal saves come back untouched */
const legacy = structuredClone(INITIAL_PLAYER) as Player;
legacy.id = 'audit_legacy';
legacy.stats.fame = 100;
legacy.stats.followers = 5e9;
legacy.instagram.followers = 5e9;
legacy.x.followers = 2e9;
Object.assign(legacy.youtube, { subscribers: 1e10, totalChannelViews: 4e12, videos: [{ id: 'v_big', views: 5e10, likes: 1e9 }, { id: 'v_small', views: 3e6 }] });
const settled = settleLegacySocialCounts(legacy);
assert.ok(settled.youtube.subscribers <= SOCIAL_PLATFORM_MAX.YOUTUBE && settled.youtube.subscribers > 2e8);
assert.ok(settled.instagram.followers <= SOCIAL_PLATFORM_MAX.INSTAGRAM && settled.stats.followers === settled.instagram.followers);
assert.ok(settled.x.followers <= SOCIAL_PLATFORM_MAX.X);
assert.ok(settled.youtube.videos[0].views <= 1.5e9 && settled.youtube.videos[1].views === 3e6, 'only the inflated video changes');
assert.ok(settled.youtube.totalChannelViews <= 1.2e11 && settled.youtube.totalChannelViews >= settled.youtube.videos[0].views);
assert.deepEqual(settleLegacySocialCounts(settled), settled, 'settling twice changes nothing');
const modest = { ...legacy, id: 'audit_modest', stats: { ...legacy.stats, fame: 30 } };
assert.ok(settleLegacySocialCounts(modest).youtube.subscribers < 25e6, 'fame 30 lands far lower than a fame-100 star');
const normal = structuredClone(INITIAL_PLAYER) as Player;
normal.youtube.subscribers = 50_000;
assert.equal(settleLegacySocialCounts(normal), normal, 'a normal save is returned as it was');

/* a week from every source is limited together */
const before = structuredClone(INITIAL_PLAYER) as Player;
before.stats.fame = 20;
before.x.followers = socialAudienceCeiling('X', 20);
const after = { ...before, x: { ...before.x, followers: before.x.followers + 5_000_000 } };
assert.equal(settleSocialAudiences(before, after).x.followers, before.x.followers, 'no growth past what fame 20 can hold');

/* ten years of the most social a fame-100 star can be, through the game's own functions: still believable */
let seed = 7;
Math.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
let p = structuredClone(INITIAL_PLAYER) as Player;
p.age = 25; p.currentWeek = 1; p.stats.fame = 100; p.stats.reputation = 100;
p.stats.followers = 1_000_000; p.instagram.followers = 1_000_000; p.youtube.subscribers = 100_000;
for (let week = 0; week < 520; week += 1) {
    const start = p;
    for (let post = 0; post < 3; post += 1) {
        const outcome = calculateInstagramPostOutcome(p, 'REEL' as never, post);
        p = { ...p, stats: { ...p.stats, followers: p.stats.followers + outcome.followerGain }, instagram: { ...p.instagram, followers: p.instagram.followers + outcome.followerGain } };
    }
    const video = { id: `audit_${week}`, title: 'Audit', type: 'VLOG', uploadPlan: 'SAFE', qualityScore: 85, views: 0, likes: 0, earnings: 0,
        weekUploaded: p.currentWeek, yearUploaded: p.age, weeklyHistory: [], comments: [], isPlayer: true } as never;
    const views = quoteYoutubeUpload(p, video, 0, false);
    const total = p.youtube.totalChannelViews || 0;
    p = { ...p, youtube: { ...p.youtube, subscribers: p.youtube.subscribers + quoteYoutubeNewSubscribers(p, views, 85), videos: [{ ...(video as object), views } as never, ...p.youtube.videos] } };
    p = recordYoutubeViews(p, `audit-upload-${week}`, total, views);
    p = { ...p, youtube: resolveYoutubeWeek(p, Math.random).channel };
    p = settleSocialAudiences(start, p);
    p = { ...p, currentWeek: p.currentWeek >= 52 ? 1 : p.currentWeek + 1, age: p.currentWeek >= 52 ? p.age + 1 : p.age };
}
assert.ok(p.instagram.followers > 1_000_000 && p.instagram.followers < SOCIAL_PLATFORM_MAX.INSTAGRAM, `Instagram after ten years: ${p.instagram.followers}`);
assert.ok(p.youtube.subscribers > 100_000 && p.youtube.subscribers < SOCIAL_PLATFORM_MAX.YOUTUBE, `YouTube after ten years: ${p.youtube.subscribers}`);
assert.ok(p.youtube.videos.every(item => (item as { views: number }).views < 1.5e9), 'no video near a billion views from ordinary uploads');

console.log(`Social audience limits audit passed (ten heavy years at fame 100: Instagram ${Math.round(p.instagram.followers / 1e6)}M, YouTube ${Math.round(p.youtube.subscribers / 1e3)}K).`);
