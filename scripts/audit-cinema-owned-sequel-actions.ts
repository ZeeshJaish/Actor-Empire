import assert from 'node:assert/strict';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {developActualSequel,greenlightRealPackage} from './fixtures/cinemaOwnedStudioActions';
import {NPC_DATABASE} from '../services/npcLogic';
const parent=readCinemaAuditCheckpoint<any>('cinema-verification.local/owned-studio-20261029/production-v2/career-0.json.gz');assert.ok(parent);
NPC_DATABASE.length=0;NPC_DATABASE.push(...parent.npcDatabase);
const predecessor=parent.films.find((f:any)=>f.scale==='GLOBAL');assert.ok(predecessor?.paid?.closed);
const developed=developActualSequel(parent.player,parent.studioId,predecessor.id);
const script=developed.player.businesses.find(b=>b.id===parent.studioId)!.studioState!.scripts.find(s=>s.id===developed.scriptId)!;
assert.ok(script.totalDevelopmentWeeks>0);
script.status='READY'; // Controlled callback wiring only, excluded from all earning/career claims.
const style=process.env.OWNED_PACKAGE_STYLE==='EPIC'?'EPIC':'GLOBAL';
const built=await greenlightRealPackage(developed.player,parent.studioId,script.id,style);assert.ok(built.quote&&!built.waiting);
const c=built.player.commitments.find(c=>c.id===built.id)!;assert.equal(c.projectDetails?.franchiseId,predecessor.id);assert.equal(c.projectDetails?.installmentNumber,2,'A real first sequel is installment two, even before a franchise history group exists');
console.log(JSON.stringify({passed:3,kind:'CONTROLLED_SEQUEL_ACTIONS_NOT_CAREER_RESULTS',quote:built.quote}));
