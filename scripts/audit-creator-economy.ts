import assert from 'node:assert/strict';
import { INITIAL_PLAYER } from '../types';
import { processYoutubeChannel } from '../services/youtubeLogic';
const make = () => { const p = structuredClone(INITIAL_PLAYER); p.age = 40; p.currentWeek = 20; p.youtube.subscribers = 1e6; p.youtube.totalChannelViews = 305000; p.youtube.videos = []; return p; };
const prior = Math.random;
Math.random = () => .5;
try {
    const p = make();
    assert.equal(processYoutubeChannel(p).channel.totalChannelViews, 305000, 'Weekly processing must not erase recorded event/live views');
    const views = (qualityScore: number) => { const p = make(); p.youtube.videos = [{ id: 'v', title: 'Q', type: 'VLOG', qualityScore, views: 0, earnings: 0, weekUploaded: 20, yearUploaded: 40, weeklyHistory: [], comments: [], likes: 0, isPlayer: true } as any]; return processYoutubeChannel(p).channel.videos[0].views; };
    assert.ok(views(0) < views(1), 'Zero-quality uploads must not receive the quality-50 fallback');
    console.log('Creator economy core regressions passed.');
}
finally {
    Math.random = prior;
}
// A crowded library shares audience; old videos must not each mint a full channel audience.
{
 const p=structuredClone(INITIAL_PLAYER);p.age=25;p.currentWeek=10;p.youtube.subscribers=1e6;p.youtube.isMonetized=true;
 const v={id:'one',title:'Library check',type:'VLOG',qualityScore:90,views:0,earnings:0,likes:0,weekUploaded:9,yearUploaded:25,weeklyHistory:[],comments:[],isPlayer:true} as any;
 const previousRandom=Math.random;Math.random=()=>.5;
 const single=processYoutubeChannel({...p,youtube:{...p.youtube,videos:[v]}});
 const many=processYoutubeChannel({...p,youtube:{...p.youtube,videos:Array.from({length:100},(_,i)=>({...v,id:'video-'+i}))}});
 assert.ok(many.channel.totalChannelViews<single.channel.totalChannelViews*4,'Library size cannot multiply the entire subscriber audience');
 assert.ok(Math.abs(many.channel.videos.reduce((n,v)=>n+v.earnings,0)-many.weeklyRevenue)<.01,'Channel ad settlement must apportion rounded income without per-video loss');
 Math.random=previousRandom;console.log('Crowded library and channel ad-pool regressions passed.');
}
