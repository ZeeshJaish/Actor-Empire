import assert from 'node:assert/strict';
import {readCinemaAuditCheckpoint} from './fixtures/cinemaAuditCheckpoint';
import {foundEarnedStudio,developRealConcept,greenlightRealPackage,releaseRealPackage} from './fixtures/cinemaOwnedStudioActions';
import {NPC_DATABASE} from '../services/npcLogic';
import {PHASE_ONE_ENERGY_COSTS} from '../services/energyCosts';
const origin=readCinemaAuditCheckpoint<any>('cinema-verification.local/mature-ui-gated-09edec4/final-corrected/career-0.json.gz');
assert.ok(origin?.player);if(origin.npcDatabase){NPC_DATABASE.length=0;NPC_DATABASE.push(...origin.npcDatabase);}
origin.player.world.talentBookings=[]; // Controlled callback wiring only; the real owner audit keeps all bookings.
const style=(process.env.OWNED_PACKAGE_STYLE||'GLOBAL') as 'GLOBAL'|'WEAK_WIDE'|'SMALL_WIDE';
const launched=foundEarnedStudio(origin.player,style==='GLOBAL'?1_300_000_000:100_000_000,style==='GLOBAL'?{}:{name:'Lantern Stories',specialty:'FINANCE'});
const developed=developRealConcept(launched.player,launched.studioId,'Controlled wiring case','FANTASY');
assert.ok(developed.developmentWeeks>0);
// This deliberately omits development/production weeks to test callback wiring.
// It is NOT a normal career or earnings case and is never an origin for that audit.
const studio=developed.player.businesses.find(b=>b.id===launched.studioId)!;
const script=studio.studioState!.scripts.find(s=>s.id===developed.scriptId)!;
script.status='READY';
assert.ok(developed.player.energy.current>=PHASE_ONE_ENERGY_COSTS.GREENLIGHT_OWNED_PROJECT);
const built=await greenlightRealPackage(developed.player,launched.studioId,developed.scriptId,style);
assert.ok(!built.waiting&&built.quote,built.waiting);
assert.ok(built.quote.budget.total>0&&built.quote.reservedCampaign>=0);
const initialStudioBalance=launched.player.businesses.find(b=>b.id===launched.studioId)!.balance;
const paidStudioBalance=built.player.businesses.find(b=>b.id===launched.studioId)!.balance;
assert.equal(Math.round(initialStudioBalance-paidStudioBalance),Math.round(built.quote.budget.total+built.quote.reservedCampaign),'Previously paid writer development belongs in the film budget once, without a second cash debit');
const c=built.player.commitments.find(c=>c.id===built.id)!;c.projectPhase='AWAITING_RELEASE';
const released=releaseRealPackage(built.player,launched.studioId,built.id,true);
assert.equal(released.campaignSpent+released.campaignReturned,built.quote.reservedCampaign);
console.log(JSON.stringify({kind:'CONTROLLED_UI_WIRING_NOT_CAREER_OR_EARNINGS_PROOF',passed:4,quote:built.quote,campaignSpent:released.campaignSpent}));
