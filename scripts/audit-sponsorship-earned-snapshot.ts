import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {generateManagerOffer} from '../services/teamLogic';
import {getCareerCommercialMultiplier} from '../services/actorCareerBalance';
import {calculateYoutubeCreatorScore} from '../services/youtubeLogic';
import {createDeterministicRng} from '../services/deterministicRandom';
const file='cinema-verification.local/mature-ui-gated-09edec4/final-corrected/career-0.json.gz';
const data=readCinemaAuditCheckpoint<any>(file),p=data.player;assert.ok(p&&p.activeSponsorships.length===0);
const protectedState=JSON.stringify({cash:p.money,stats:p.stats,sponsors:p.activeSponsorships,posts:p.instagram.posts});
const rows:any[]=[];
for(let seed=0;seed<256;seed++){
 Math.random=createDeterministicRng('earned-commercial-snapshot:'+seed);const offer=generateManagerOffer(p);if(!offer)continue;
 // Exact old scalar calculation at the SAME immutable player and SAME offer terms.
 // This is a controlled quote comparison, never a signed or collected payment.
 const fame=p.stats.fame;
 const base=fame<20?500+fame*50:fame<50?2000+(fame-20)*200:fame<80?10000+(fame-50)*1000:50000+(fame-80)*5000;
 let old=base+Math.floor(p.stats.followers*.05);
 if(p.youtube?.subscribers>=10000)old=Math.floor(old*(.88+Math.min(.34,calculateYoutubeCreatorScore(p)/250)));
 old*=getCareerCommercialMultiplier(p);old=Math.floor(old*(.8+p.team.manager.sponsorshipPower*.07));
 if(offer.requirements.type==='SHOOT')old*=1.5;if(offer.isExclusive)old*=2;
 rows.push({brand:offer.brandName,type:offer.requirements.type,category:offer.category,weeks:offer.durationWeeks,required:offer.requirements.totalRequired,
  oldWeekly:old,newWeekly:offer.weeklyPay,newContractValue:offer.weeklyPay*offer.durationWeeks,basis:offer.valueBasis});
}
assert.ok(rows.length>30);assert.equal(JSON.stringify({cash:p.money,stats:p.stats,sponsors:p.activeSponsorships,posts:p.instagram.posts}),protectedState);
const quantiles=(key:string)=>{const values=rows.map(r=>r[key]).sort((a,b)=>a-b);return{min:values[0],median:values[Math.floor(values.length/2)],max:values.at(-1)}};
const report={kind:'CONTROLLED_QUOTES_AT_REAL_EARNED_SNAPSHOT_NOT_PAYMENTS_OR_CAREER_RESULTS',checkpointSha256:createHash('sha256').update(readFileSync(file)).digest('hex'),
 followers:p.stats.followers,fame:p.stats.fame,quotes:rows.length,oldWeekly:quantiles('oldWeekly'),newWeekly:quantiles('newWeekly'),rows};
writeFileSync('docs/reports/2026-10-29-box-office-followup/sponsorship-earned-snapshot.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,rows:undefined}));
