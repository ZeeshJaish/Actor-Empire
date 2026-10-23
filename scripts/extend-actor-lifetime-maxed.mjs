import {readFileSync,writeFileSync,existsSync,mkdirSync,copyFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gunzipSync,gzipSync} from 'node:zlib';
const digest=p=>createHash('sha256').update(readFileSync(p)).digest('hex');
for(const mode of (process.env.LIFETIME_MODES||'focused,neglect,overbooked').split(',')){
 const source=`/tmp/ae-lifetime-maxed-slots-boosted-${mode}`,out=`/tmp/ae-lifetime-maxed-long-boosted-${mode}`;
 if(existsSync(out+'/executable.json'))throw Error('Preserving existing extension '+out);
 const old=JSON.parse(readFileSync(source+'/boosted/career-0-results.json'));
 if(old.status!=='HORIZON_COMPLETE'||old.weeks!==807)throw Error('Finish the same first52-week save boundary for every case before extending');
 const raw=readFileSync(source+'/boosted/career-0.json.gz'),c=JSON.parse(gunzipSync(raw));
 const initial=readFileSync(source+'/prefix.json.gz'),prefix=JSON.parse(gunzipSync(initial));
 if(prefix.weeks!==755)throw Error('Expected actual earned all100 starting state');
 mkdirSync(out+'/boosted',{recursive:true});
 copyFileSync(source+'/worker.mjs',out+'/worker.mjs');writeFileSync(out+'/prefix.json.gz',initial);writeFileSync(out+'/resume-prefix.json.gz',raw);
 c.horizon=859;
 writeFileSync(out+'/boosted/career-0.json.gz',gzipSync(JSON.stringify(c),{level:1}));
 writeFileSync(out+'/boosted/career-0-results.json',JSON.stringify({...old,status:'CHECKPOINT_READY',horizon:859}));
 const meta=JSON.parse(readFileSync(source+'/executable.json'));meta.horizon=859;meta.sameFirstYearBoundary=807;
 writeFileSync(out+'/executable.json',JSON.stringify(meta,null,2));
 const lineage=JSON.parse(readFileSync(source+'/lineage.json'));
 writeFileSync(out+'/lineage.json',JSON.stringify({...lineage,horizon:859,resumeWeek:c.weeks,resumeSource:source+'/boosted/career-0.json.gz',resumeCheckpointSha256:digest(out+'/resume-prefix.json.gz'),resumePlayerHash:createHash('sha256').update(JSON.stringify(c.player)).digest('hex'),changes:[...lineage.changes,'Audit horizon only807→859, retaining identical player/RNG/clock. Every case completes and reloads at807 before extension, so a role that starts near the end of year1 can wrap in year2. No outcome or resource edits.']},null,2));
 console.log(JSON.stringify({mode,start:prefix.weeks,resume:c.weeks,horizon:859}));
}
