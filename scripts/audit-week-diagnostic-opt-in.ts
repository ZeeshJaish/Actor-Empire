import assert from 'node:assert/strict';
import {INITIAL_PLAYER} from '../types';
import {markWeekProcessingStage} from '../services/firebaseService';
const values=new Map<string,string>();
Object.defineProperty(globalThis,'window',{configurable:true,value:{localStorage:{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)}}});
const player=structuredClone(INITIAL_PLAYER),stringify=JSON.stringify;let encodings=0;
JSON.stringify=((...args:Parameters<typeof JSON.stringify>)=>{if(args[0]===player)encodings++;return stringify(...args);}) as typeof JSON.stringify;
const read=()=>JSON.parse([...values.values()][0]);
try{
 const context={run_id:'normal-week',save_slot:3};
 for(const stage of ['start','game_loop_done','persist_prepare_done','indexeddb_write_done','success'])markWeekProcessingStage(stage,player,context);
 assert.equal(encodings,0,'Routine weekly tracing must not encode an entire retained save just to measure optional diagnostics');
 assert.equal(read().save_size_basis,'UNKNOWN');
 markWeekProcessingStage('start',player,{...context,run_id:'detailed-week',measure_save_size:true});
 markWeekProcessingStage('success',player,{...context,run_id:'detailed-week',measure_save_size:true});
 assert.equal(encodings,1);assert.equal(read().save_size,stringify(player).length);assert.equal(read().save_size_basis,'SOURCE_AT_WEEK_START');
 player.money+=10;markWeekProcessingStage('start',player,{...context,run_id:'fresh-detailed-week',measure_save_size:true});assert.equal(encodings,2);
 markWeekProcessingStage('start',player,{...context,run_id:'unsampled-week'});assert.equal(encodings,2);assert.equal(read().save_size_basis,'LAST_RECORDED');
 markWeekProcessingStage('persist_prepare_done',player,{...context,run_id:'unsampled-week',save_size:123});assert.equal(encodings,2);assert.equal(read().save_size,123);assert.equal(read().save_size_basis,'EXPLICIT');
}finally{JSON.stringify=stringify;}
console.log(JSON.stringify({diagnosticChecks:11,routineFullSaveEncodings:0,optInSourceSizeAccurate:true,staleSizesLabelled:true}));
