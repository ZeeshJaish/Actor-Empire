/** Regression for signed cash preservation, found during a real fresh career. */
import assert from 'node:assert/strict';
import {INITIAL_PLAYER} from '../types';
import {migratePlayerSave} from '../services/saveMigration';
import {prepareVerifiedPlayerForPersistence} from '../services/savePreparation';
import {saveVerifiedGameData,loadVerifiedGameData} from '../services/saveGenerations';
import {CinemaMemorySaveStore} from './fixtures/cinemaSaveStore';
const player=migratePlayerSave(structuredClone(INITIAL_PLAYER));
player.money=-33019;
const prepared=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
assert.deepEqual(prepared.comparison,{ok:true});
const store=new CinemaMemorySaveStore();
await saveVerifiedGameData(store,'audit-negative-wallet',prepared.player,prepared.manifest);
const loaded=await loadVerifiedGameData(store,'audit-negative-wallet');
assert.equal(loaded.status,'CURRENT');
assert.equal(loaded.player!.money,-33019,'Raw verified generation retains the incurred wallet deficit');
const migrated=migratePlayerSave(loaded.player!);
const failures:string[]=[];
try{assert.equal(migrated.money,-33019,'Reload migration must preserve the actual finite wallet balance')}catch(e){failures.push(String(e))}
const refund=migratePlayerSave({...player,money:-1500,finance:{...player.finance,history:[{id:'tx_acq_debt_negative_recovery',week:player.currentWeek,year:player.age,amount:-1000,category:'EXPENSE',description:'Acquisition Debt Interest'}]},flags:{...player.flags,acquisitionDebtLegacyRefundWeekKey:`${player.age}:${player.currentWeek}`,acquisitionDebtLegacyRefundApplied:false}} as any);
try{assert.equal(refund.money,-500,'A valid legacy refund must offset the incurred deficit without erasing it')}catch(e){failures.push(String(e))}
for(const value of [0,2000,12345.67,'50000','-42.5'])assert.equal(migratePlayerSave({...player,money:value} as any).money,Number(value));
for(const value of [Number.NaN,Number.POSITIVE_INFINITY,'bad'])assert.throws(()=>migratePlayerSave({...player,money:value} as any),(error:any)=>error.code==='STOCK_SAVE_RECOVERY_REQUIRED','Nonfinite imports retain verified-recovery handling');
if(failures.length)throw Error(failures.join('\n'));
assert.equal(migratePlayerSave(refund).money,-500,'An already applied refund cannot be applied again');
console.log('Negative-wallet round-trip preserved');
