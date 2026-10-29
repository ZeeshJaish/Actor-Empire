import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
import {INITIAL_PLAYER,type YoutubeVideo} from '../types';
import {processGameWeek} from '../services/gameLoop';
import {t} from '../services/i18n';
async function main(){const previous=Math.random;Math.random=()=>.3;
 try{
 const rows=[];
 for(const subscribers of [1e8,1e10]){
  const p=structuredClone(INITIAL_PLAYER);p.age=25;p.currentWeek=5;p.money=1e6;p.stats.fame=15;p.youtube.subscribers=subscribers;p.youtube.isMonetized=true;p.youtube.audienceTrust=80;p.youtube.fanMood=80;p.youtube.membershipsActive=false;p.flags.lastYoutubeEventAbsWeek=0;
  p.youtube.videos=[{id:'bonus-video',title:'Active channel bonus probe',type:'VLOG',qualityScore:50,views:1000,earnings:0,likes:10,weekUploaded:5,yearUploaded:25,weeklyHistory:[1000],comments:[],isPlayer:true} as YoutubeVideo];p.youtube.totalChannelViews=1000;
  const next=(await processGameWeek(p)).player;
  const bonus=next.finance.history.find(tx=>tx.description===t('en','services.gameLoop.youtubeAudience.finance.creatorBonus'));
  assert.ok(bonus,'The forced deterministic creator-bonus branch must execute');
  rows.push({subscribers,bonus:bonus.amount,afterSubscribers:next.youtube.subscribers});
 }
 assert.ok(rows[1].bonus<1e6,'Weekly creator bonus must not mint hundreds of millions from a legacy subscriber counter');assert.ok(rows[1].bonus<rows[0].bonus*50,'Subscriber inflation must not linearly inflate weekly creator bonuses');

 const viral=structuredClone(INITIAL_PLAYER);viral.age=25;viral.currentWeek=52;viral.money=1e6;viral.stats.fame=15;viral.stats.followers=1e10;viral.x.followers=1e10;Object.assign(viral.youtube,{subscribers:1e10,isMonetized:true,audienceTrust:80,fanMood:80,totalChannelViews:1000});
 viral.flags.youtubeMilestonesUnlocked=['subs_10000','views_1000000','subs_100000'];
 viral.youtube.videos=[{id:'viral-video',title:'Viral cap probe',type:'VLOG',qualityScore:90,views:1000,earnings:0,likes:10,weekUploaded:52,yearUploaded:25,weeklyHistory:Array(104).fill(0),comments:[],isPlayer:true} as YoutubeVideo];
 const viralNext=(await processGameWeek(viral)).player;
 assert.equal(viralNext.currentWeek,1);assert.equal(viralNext.age,26);assert.equal(viralNext.youtube.subscribers,1e10);assert.equal(viralNext.x.followers,1e10);assert.equal(viralNext.stats.followers,1e10);
 assert.equal(viralNext.youtube.totalChannelViews,viralNext.youtube.economy?.lifetimeViews,'Viral events must use the canonical lifetime counter');assert.ok(viralNext.youtube.videos[0].weeklyHistory.length<=104);
 assert.ok(viralNext.youtube.fanMood-viral.youtube.fanMood<=3,'Weekly viral events obey the positive mood budget');
 rows.push({subscribers:1e10,bonus:0,afterSubscribers:viralNext.youtube.subscribers,case:'VIRAL_YEAR_ROLLOVER',views:viralNext.youtube.totalChannelViews});
 writeFileSync('/tmp/ae-creator-week-events.json',JSON.stringify({status:'PASS',rows},null,2));console.log(JSON.stringify(rows));
 }finally{Math.random=previous;}}
main().catch(e=>{console.error(e);process.exitCode=1});
