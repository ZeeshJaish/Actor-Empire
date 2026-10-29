import {calculateInstagramPostOutcome} from '../services/instagramLogic';
import {createWorldPopulationState} from '../services/worldEconomy/worldPopulation';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { generateYoutubeBrandDeal, calculateYoutubeMerchQuote, resolveYoutubeMerchDrop } from '../services/youtubeLogic';
import { readCreatorWorld, claimCreatorAction, creatorPositiveReward } from '../services/creatorEconomy';
import { quoteYoutubeLive, quoteYoutubeMemberships } from '../services/youtubeEconomy';
const p = structuredClone(INITIAL_PLAYER);
p.age = 40;
p.currentWeek = 20;
p.money = 1e6;
p.energy = { current: 100, max: 100 };
Object.assign(p.youtube, { subscribers: 1e10, isMonetized: true, audienceTrust: 80, fanMood: 80, controversy: 0, videos: [] });
const random = Math.random;
Math.random = () => .5;
try {
    const smaller = structuredClone(p);
    smaller.youtube.subscribers = 1e8;
    const a = generateYoutubeBrandDeal(p)!, b = generateYoutubeBrandDeal(smaller)!;
    assert.ok(a.payout < b.payout * 20, 'Future brand quotes must saturate active reach rather than pay 100x for 100x paper subscribers');
    const q = calculateYoutubeMerchQuote(p, 'LUXURY', () => .5);
    assert.ok(q.productionCost > 100000, 'Manufacturing cost must scale with units rather than stay at the setup fee');
    assert.ok(q.productionCost <= p.money, 'Quoted inventory must be funded before sales');
    assert.ok(q.netProfit < 1e7, 'A dormant inflated legacy counter must not produce billions in one drop');
    const r = resolveYoutubeMerchDrop(p, 'LUXURY', () => .5);
    assert.ok(r.success);
    assert.equal(r.player.money, p.money + q.netProfit);
    assert.equal(resolveYoutubeMerchDrop(r.player, 'BASIC', () => .5).success, false);
    assert.equal(p.youtube.subscribers, 1e10, 'Do not rewrite earned legacy counters');
    const live = quoteYoutubeLive(p);
    assert.ok(live.donations < 1e7);
    assert.equal(live.newSubscribers, 0, 'Paper counts beyond reachable population cannot convert more unique people');
    p.youtube.members = 1e9;
    assert.ok(quoteYoutubeMemberships(p).revenue < 1e7);
    let spam = structuredClone(p), reward = 0;
    for (let i = 0; i < 50; i++) {
        const c = claimCreatorAction(spam, 'YOUTUBE', 'upload-' + i);
        spam = c.player;
        const r = creatorPositiveReward(spam, 'trust', 4 * c.rewardScale, 3);
        spam = r.player;
        reward += r.delta;
    }
    assert.equal(reward, 3, 'Repeated safe uploads must not farm unlimited trust');
    const next = structuredClone(spam);
    next.currentWeek++;
    assert.equal(claimCreatorAction(next, 'YOUTUBE', 'new-week').rewardScale, 1);
    assert.ok(readCreatorWorld(p).eligiblePeople > 0);
    console.log('Creator monetization and weekly reward regressions passed.');
}
finally {
    Math.random = random;
}

{
 const rich=structuredClone(p);rich.world.worldPopulation=createWorldPopulationState(2000);
 const snapshot=JSON.stringify(rich.world);const richWorld=readCreatorWorld(rich);assert.equal(JSON.stringify(rich.world),snapshot);
 const poor=structuredClone(rich);
 for(const country of Object.values(poor.world.worldPopulation!.countries)){country.reliableInternetPercent=5;country.smartphoneAccessPercent=5;country.digitalPaymentAccessPercent=1;country.macro.purchasingPowerIndex=5;}
 const poorWorld=readCreatorWorld(poor);assert.ok(poorWorld.eligiblePeople<richWorld.eligiblePeople);assert.ok(poorWorld.purchasingPower<richWorld.purchasingPower);
 assert.ok(calculateYoutubeMerchQuote(poor,'BASIC',()=>.5).grossRevenue<calculateYoutubeMerchQuote(rich,'BASIC',()=>.5).grossRevenue,'Purchasing/access constraints must affect merch demand');
 const ig=structuredClone(p);ig.stats.followers=1e10;ig.instagram.followers=1e10;
 assert.equal(calculateInstagramPostOutcome(ig,'SELFIE',0).followerGain,0,'Inflated legacy followers are preserved, without more impossible unique followers');
 assert.ok(Object.values(calculateInstagramPostOutcome(ig,'SELFIE',2).statDeltas).every(v=>v<=0),'Third same-week Instagram post cannot farm extra positive attributes');
 assert.equal(ig.stats.followers,1e10);assert.equal(creatorPositiveReward(ig,'fame',-3,2).delta,-3,'Negative consequences must not be suppressed by reward caps');
 console.log('World access, spending, Instagram saturation and positive-stat spam regressions passed.');
}
// Two genuine events with identical terms must stay distinct; replay of one event must not charge again.
{
 const {resolveYoutubeEventChoice}=require('../services/youtubeEventLogic');
 const source=structuredClone(p);source.money=10000;
 const claim={domain:'YOUTUBE',kind:'COPYRIGHT',payload:{videoTitle:'Same title',claimAmount:1000,evidenceStrength:60}};
 const first=resolveYoutubeEventChoice(source,{...claim,eventId:'legal-a'},'ACCEPT_CLAIM',()=>.5).updatedPlayer;
 const second=resolveYoutubeEventChoice(first,{...claim,eventId:'legal-b'},'ACCEPT_CLAIM',()=>.5).updatedPlayer;
 assert.equal(second.money,8000,'Distinct genuine legal events cannot be collapsed by an overly broad replay key');
 assert.equal(resolveYoutubeEventChoice(second,{...claim,eventId:'legal-b'},'ACCEPT_CLAIM',()=>.5).updatedPlayer.money,8000,'The same legal event must charge only once');
}

{
 const {resolveYoutubeWeek,quoteYoutubeMemberships}=require('../services/youtubeEconomy');
 let idle=structuredClone(p);idle.youtube.videos=[];idle.youtube.members=1e9;delete idle.youtube.economy;
 const first=quoteYoutubeMemberships(idle).revenue;
 for(let week=0;week<8;week++){idle.youtube=resolveYoutubeWeek(idle,()=>.5).channel;idle.currentWeek++;}
 assert.ok(quoteYoutubeMemberships(idle).revenue<=first*.2,'Observed inactivity must taper legacy fallback income without erasing subscribers');assert.equal(idle.youtube.subscribers,1e10);
}

{
 const {generateYoutubeCollabOffer}=require('../services/youtubeLogic');
 const legacy=structuredClone(p);legacy.youtube.videos=[{qualityScore:90},{qualityScore:90}] as any;
 assert.ok(generateYoutubeCollabOffer(legacy),'Inflated legacy display counts must not make every world creator ineligible for future collaborations');
}
