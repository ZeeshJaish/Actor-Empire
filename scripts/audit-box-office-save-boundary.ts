import { getAbsoluteWeek } from '../services/legacyLogic';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeCinemaLongSave } from './fixtures/boxOfficeLongRun';
import { prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { normalizeStudioAiState } from '../services/studioAi';
import type { Player } from '../types';
const player=process.env.CINEMA_FAILURE_SAVE ? JSON.parse(readFileSync(process.env.CINEMA_FAILURE_SAVE,'utf8')) as Player : makeCinemaLongSave('founder-small');
const studio=Object.values(player.world.studios!)[0],week=getAbsoluteWeek(player.age,player.currentWeek);
studio.ai=normalizeStudioAiState(studio,{absoluteWeek:week});
studio.ai.ledger=Array.from({length:160},(_,i)=>({id:`retained-receipt-${i}`,absoluteWeek:week-160+i,category:'RIGHTS_INCOME',amountMillions:1,balanceAfterMillions:studio.cashReserve,description:'Historical paid receipt'}));
const before=structuredClone(player),saved=prepareVerifiedPlayerForPersistence(player,'PROCESS_WEEK');
assert.deepEqual(player,before);for(const [id,s] of Object.entries(before.world.studios!)){assert.equal(saved.player.world.studios![id].cashReserve,s.cashReserve);assert.deepEqual(saved.player.world.studios![id].ai?.ledger.map(l=>l.id).sort(),s.ai?.ledger.map(l=>l.id).sort());}
console.log('PASS canonical 160-entry paid studio ledger survives verified compaction with identical cash and receipt IDs');
