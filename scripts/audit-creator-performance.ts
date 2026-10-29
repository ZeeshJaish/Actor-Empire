import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {writeFileSync} from 'node:fs';
import {INITIAL_PLAYER,type YoutubeVideo} from '../types';
import {readCreatorWorld} from '../services/creatorEconomy';
import {resolveYoutubeWeek} from '../services/youtubeEconomy';
const p=structuredClone(INITIAL_PLAYER);p.age=25;p.currentWeek=52;p.youtube.subscribers=1e8;p.youtube.isMonetized=true;
p.youtube.videos=Array.from({length:5000},(_,i)=>({id:'perf-'+i,title:'Retained upload '+i,type:'VLOG',qualityScore:80,views:1000,likes:40,earnings:0,weekUploaded:1,yearUploaded:25,weeklyHistory:Array(104).fill(1000),comments:[],isPlayer:true} as YoutubeVideo));
readCreatorWorld(p);const samples=[];
for(let i=0;i<7;i++){
 const start=performance.now();const r=resolveYoutubeWeek(p,()=>.5);samples.push(performance.now()-start);
 assert.equal(r.channel.videos.length,5000);assert.ok(r.channel.videos.every(v=>v.weeklyHistory.length<=104));assert.ok(JSON.stringify(r.channel.economy).length<2048);assert.ok(Number.isFinite(r.weeklyRevenue));
}
samples.sort((a,b)=>a-b);const result={scope:'Node service only, not native device frame timing',retainedVideos:5000,samplesMs:samples,medianMs:samples[3],maxMs:samples[6],boundedHistory:104,status:'PASS'};
writeFileSync('/tmp/ae-creator-performance.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
