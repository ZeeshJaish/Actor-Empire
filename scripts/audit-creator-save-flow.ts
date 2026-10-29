import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { INITIAL_PLAYER, type Player, type YoutubeVideo } from '../types';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { saveVerifiedGameData, loadVerifiedGameData } from '../services/saveGenerations';
import { CinemaMemorySaveStore } from './fixtures/cinemaSaveStore';
import { claimCreatorAction, readCreatorLedger, readCreatorWorld, creatorPositiveReward } from '../services/creatorEconomy';
import { recordYoutubeViews, readYoutubeEconomy, settleYoutubeActivity, resolveYoutubeWeek, quoteYoutubeBrand } from '../services/youtubeEconomy';
import { createDeterministicRng } from '../services/deterministicRandom';
async function main() {
    const originalRandom = Math.random;
    Math.random = createDeterministicRng('creator-full-flow');
    try {
        let p = structuredClone(INITIAL_PLAYER);
        p.age = 25;
        p.currentWeek = 4;
        p.money = 1234567;
        p.stats.fame = 15;
        p.youtube.activeBrandDeals = [{ id: 'legacy-signed', brandName: 'Legacy signed brand', category: 'TECH', description: 'Saved accepted terms', payout: 2900000000, requiredType: 'VLOG', energyCost: 16, bonusViews: 1000000, penalty: 50000, expiresInWeeks: 52 }];
        p.youtube.subscribers = 1e10;
        p.youtube.totalChannelViews = 305000;
        p.youtube.videos = [];
        p.youtube.members = 1e9;
        p.youtube.membershipsActive = true;
        p.youtube.isMonetized = true;
        const savedContracts = structuredClone(p.youtube.activeBrandDeals);
        const savedRoster = structuredClone(p.studio.talentRoster);
        p = migratePlayerSave(p);
        assert.equal(p.money, 1234567);
        assert.equal(p.youtube.subscribers, 1e10);
        assert.equal(p.youtube.totalChannelViews, 305000);
        const worldBefore = JSON.stringify(p.world);
        const world = readCreatorWorld(p);
        assert.equal(JSON.stringify(p.world), worldBefore, 'World pricing reads must not debit or alter world ledgers');
        const empty = structuredClone(p);
        empty.world.worldPopulation = { schemaVersion: 1, countries: {} } as any;
        assert.equal(readCreatorWorld(empty).eligiblePeople, 0);
        assert.equal(quoteYoutubeBrand(empty, 'TECH', () => .5).payout, 0);
        let activity = { ...p, youtube: { ...p.youtube, totalChannelViews: p.youtube.totalChannelViews + 900, audienceTrust: p.youtube.audienceTrust + 5 } };
        activity = settleYoutubeActivity(p, activity, 'save-flow-publication', 900);
        assert.equal(activity.youtube.totalChannelViews, 305900);
        assert.equal(settleYoutubeActivity(activity, { ...activity, money: activity.money + 1e9 }, 'save-flow-publication', 900).money, activity.money, 'Duplicate publication cannot settle money twice');
        p = activity;
        const store = new CinemaMemorySaveStore();
        const observations: any[] = [];
        const roundTrip = async (source: Player) => { const prepared = prepareVerifiedPlayerForPersistence(source, 'AUTOSAVE'); await saveVerifiedGameData(store, 'creator-audit', prepared.player, prepared.manifest); const loaded = await loadVerifiedGameData(store, 'creator-audit'); assert.equal(loaded.status, 'CURRENT'); assert.ok(loaded.player); assert.equal(loaded.player.money, prepared.player.money); assert.deepEqual(loaded.player.youtube.economy, prepared.player.youtube.economy); assert.deepEqual(loaded.player.creatorEconomy, prepared.player.creatorEconomy); assert.deepEqual(loaded.player.youtube.activeBrandDeals, prepared.player.youtube.activeBrandDeals); return loaded.player; };
        p = await roundTrip(p);
        p.youtube.audienceTrust=80;p.youtube.fanMood=80;p.youtube.videos=[{id:'active-legacy-video',title:'Active creator flow',type:'VLOG',qualityScore:90,views:900,earnings:0,likes:30,weekUploaded:p.currentWeek,yearUploaded:p.age,weeklyHistory:Array(104).fill(0),comments:[],isPlayer:true} as YoutubeVideo];
        const replay = settleYoutubeActivity(p, { ...p, money: p.money + 1e9 }, 'save-flow-publication', 900);
        assert.equal(replay.money, p.money, 'Reload must not reset replay protection');
        const sameWeek = resolveYoutubeWeek(p, () => .5);
        const again = resolveYoutubeWeek({ ...p, youtube: sameWeek.channel }, () => .5);
        assert.equal(again.weeklyRevenue, 0);
        assert.equal(again.channel.totalChannelViews, sameWeek.channel.totalChannelViews);
        for (let week = 1; week <= 6; week++) {
            const before = p.youtube.totalChannelViews;
            p = (await processGameWeek(p)).player;
            assert.ok(p.youtube.totalChannelViews >= before, 'Next Week must retain non-video views');
            assert.equal(p.youtube.economy?.lifetimeViews,p.youtube.totalChannelViews,'Weekly audience events must settle the same lifetime counter');assert.ok(p.youtube.videos.every(v=>v.weeklyHistory.length<=104));
            assert.equal(p.youtube.subscribers, 1e10, 'Legacy subscriber counter must survive saturation unchanged');
            assert.ok(Number.isFinite(p.money));
            assert.ok(p.youtube.members >= 0);
            p = await roundTrip(p);
            observations.push({ week, subscribers: p.youtube.subscribers, totalViews: p.youtube.totalChannelViews, money: p.money, paidMembers: p.youtube.economy?.paidMembers, weeklyFanSpend: p.creatorEconomy?.fanSpend });
        }
        assert.equal(p.youtube.activeBrandDeals[0].payout, savedContracts[0].payout);
        assert.equal(p.youtube.activeBrandDeals[0].penalty, savedContracts[0].penalty);
        assert.equal(p.youtube.activeBrandDeals[0].expiresInWeeks, 46);
        assert.deepEqual(p.studio.talentRoster, savedRoster);
        const rolled = claimCreatorAction(p, 'YOUTUBE', 'after-rollover');
        assert.equal(rolled.rewardScale, 1, 'Positive action allowance renews next week');
        const reward = creatorPositiveReward(rolled.player, 'trust', 100, 3);
        assert.ok(reward.delta <= 3);
        // Event views survive even when the entire retained video library is absent.
        const noVideos = { ...p, youtube: { ...p.youtube, videos: [] } };
        const event = recordYoutubeViews(noVideos, 'final-event', p.youtube.totalChannelViews, 1234);
        assert.equal(event.youtube.totalChannelViews, p.youtube.totalChannelViews + 1234);
        assert.ok(readYoutubeEconomy(event.youtube).recentWeeks.length <= 12);
        assert.ok(readCreatorLedger(event).publicationKeys.length <= 128);
        writeFileSync('/tmp/ae-creator-save-flow.json', JSON.stringify({ world, observations, status: 'PASS' }, null, 2));
        console.log('Creator full Next Week / verified save / reload flow passed.');
    }
    finally {
        Math.random = originalRandom;
    }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
