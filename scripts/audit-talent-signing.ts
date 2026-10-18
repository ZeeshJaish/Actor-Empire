import { getAvailableTalent } from '../services/npcLogic';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NPCActor, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import { calculateNPCAsk, calculateActorRoleSalary, evaluateOffer } from '../services/talentService';
import { negotiateTalentContract, getTalentNegotiationState, repairTalentNegotiations } from '../services/talentNegotiation';
import { consumeTalentUses, settleTalentContractWeek, talentAmountOutstanding, mergeParentStudioTalentRosters } from '../services/talentRoster';
import { migratePlayerSave } from '../services/saveMigration';
const npc = { id: 'audit_icon', name: 'Audit Icon', tier: 'ICON', occupation: 'ACTOR', stats: { fame: 80, talent: 90 }, traits: ['DIVA'], openness: 20, netWorth: 500_000_000, isIndependent: true, prestigeBias: 'PRESTIGE' } as NPCActor;
function fixture(): Player {
    const p = structuredClone(INITIAL_PLAYER); p.id = 'negotiation_audit'; p.age = 30; p.currentWeek = 49; p.money = 5_000_000_000;
    const hq = createBusiness('Audit Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 49);
    hq.id = 'audit_hq'; hq.stats.brandHealth = 95; hq.stats.studioMomentum = 90;
    const sub = structuredClone(hq); sub.id = 'audit_sub'; sub.config.productionType = 'Acquired Studio'; sub.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION'; sub.balance = 5_000_000_000;
    p.businesses = [hq, sub]; p.studio.talentRoster = []; return p;
}
const ask = calculateNPCAsk(npc, 3);
const send = (p: Player, amount: number, duration = 3, studioId = 'audit_hq', mode: 'UPFRONT' | 'WEEKLY_INSTALLMENTS' = 'UPFRONT') => negotiateTalentContract(p, studioId, npc, duration, amount, mode);
for (const mode of ['UPFRONT', 'WEEKLY_INSTALLMENTS'] as const) {
    let previous = 0;
    const base = mode === 'UPFRONT' ? ask.totalAmount : ask.weeklyInstallment;
    for (let i = 50; i <= 160; i++) {
        const r = evaluateOffer(npc, 3, Math.ceil(base * i / 100), mode, 30, 500_000_000, 'en', { studioPrestige: 95, roll: 0.999999 });
        assert.ok((r.acceptanceChance || 0) >= previous, `monotonic ${mode} ${i}`); previous = r.acceptanceChance || 0;
        if (i >= 150) assert.equal(r.success, true);
    }
}
const discounted = Math.floor(ask.totalAmount * 550 / 600);
const lowPrestige = evaluateOffer(npc, 3, discounted, 'UPFRONT', 0, 0, 'en', { studioPrestige: 0, roll: 0.99 });
const highPrestige = evaluateOffer(npc, 3, discounted, 'UPFRONT', 0, 0, 'en', { studioPrestige: 100, roll: 0.99 });
assert.ok(highPrestige.acceptanceChance! > lowPrestige.acceptanceChance! && lowPrestige.acceptanceChance! > 0);
assert.equal(evaluateOffer(npc, 3, discounted, 'UPFRONT', 0, 0, 'en', { studioPrestige: 100, roll: highPrestige.acceptanceChance! - 0.00001 }).success, true);
assert.ok(calculateActorRoleSalary(npc, 'LEAD') >= 40_000_000);
console.log('PASS monotonic money, prestige discounts, guarantee and ICON salary');
let p = fixture(); const before = JSON.stringify(p); const amount = Math.ceil(ask.totalAmount * 1.5);
let response = send(p, amount); assert.equal(response.result.success, true); assert.equal(JSON.stringify(p), before);
assert.equal(response.player.money, p.money - amount); assert.equal(response.player.studio.talentRoster[0].amountPaid, amount);
assert.equal(response.player.finance.history.filter(t => t.description.includes('Talent')).length, 1);
assert.equal(send(response.player, amount).result.success, false); assert.equal(response.player.studio.talentRoster.length, 1);
p = fixture(); p.money = 1; response = send(p, amount); assert.equal(response.result.success, false); assert.equal(response.player.money, 1); assert.equal(getTalentNegotiationState(response.player, 'audit_hq', npc.id).attempts, 0);
response = send(p, 0); assert.equal(response.result.success, false); assert.equal(getTalentNegotiationState(response.player, 'audit_hq', npc.id).attempts, 0);
console.log('PASS immutable signing, one charge, duplicate, zero and affordability guards');
p = fixture(); p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.999999, rejectedOffers: [] } };
for (const ratio of [0.6, 0.65, 0.7]) { response = send(p, Math.floor(ask.totalAmount * ratio)); p = response.player; assert.equal(response.result.success, false); }
assert.equal(getTalentNegotiationState(p, 'audit_hq', npc.id).attempts, 3);
const locked = send(p, amount); assert.equal(locked.result.success, false); assert.match(locked.result.message, /12 week/);
p = JSON.parse(JSON.stringify(p)); p.age = 31; p.currentWeek = 8;
assert.equal(send(p, amount).result.success, false);
p.currentWeek = 9; assert.equal(getTalentNegotiationState(p, 'audit_hq', npc.id).attempts, 0); assert.equal(send(p, amount).result.success, true);
console.log('PASS persisted attempts and exact 12-week cooldown across new year');
p = fixture(); p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.999999, rejectedOffers: [] } };
response = send(p, Math.floor(ask.totalAmount * 0.8));
const repeated = send(JSON.parse(JSON.stringify(response.player)), Math.floor(ask.totalAmount * 0.8));
assert.equal(repeated.result.success, false); assert.equal(getTalentNegotiationState(repeated.player, 'audit_hq', npc.id).attempts, 1);
assert.equal(send(repeated.player, amount).result.success, true);
console.log('PASS revising upwards uses fixed saved roll; repeating identical offer cannot reroll');
p = fixture(); response = send(p, amount, 3, 'audit_sub'); assert.equal(response.result.success, true);
assert.equal(response.player.money, p.money); assert.equal(response.player.businesses[1].balance, p.businesses[1].balance - amount); assert.equal(response.player.studio.talentRoster.length, 0);
console.log('PASS subsidiary owner treasury and roster isolation');
p = fixture(); response = send(p, Math.ceil(ask.weeklyInstallment * 1.5), 3, 'audit_hq', 'WEEKLY_INSTALLMENTS');
assert.equal(response.result.success, true); assert.equal(response.player.money, p.money);
let c = response.player.studio.talentRoster[0];
for (const id of ['film1', 'film2', 'film3']) c = consumeTalentUses([c], [npc.id, npc.id], id)[0];
assert.equal(c.moviesRemaining, 0); assert.ok(talentAmountOutstanding(c) > 0);
assert.equal(consumeTalentUses([c], [npc.id], 'film3')[0].moviesRemaining, 0);
let total = 0;
for (let week = 1; week <= 52; week++) {
    const payment = settleTalentContractWeek(c, 2000 + week); total += payment.installment; c = payment.contract;
    assert.equal(payment.maintenance, 0); assert.equal(settleTalentContractWeek(c, 2000 + week).installment, 0);
    if (week === 12) c = migratePlayerSave({ ...response.player, studio: { ...response.player.studio, talentRoster: [c] }, businesses: response.player.businesses.map((b, i) => i === 0 ? { ...b, studioState: { ...b.studioState!, talentRoster: [c] } } : b) }).studio.talentRoster[0];
}
assert.equal(total, c.totalAmount); assert.equal(c.amountPaid, c.totalAmount); assert.equal(talentAmountOutstanding(c), 0); assert.equal(settleTalentContractWeek(c, 2100).installment, 0);
const legacy = { ...c, totalAmount: 52_000_007, installmentsPaid: 51, amountPaid: undefined };
assert.equal(settleTalentContractWeek(legacy, 2200).installment, 1_000_007);
console.log('PASS film obligations finish early, migration midway, exact settlement and no duplicate weekly charges');
const original = response.player.studio.talentRoster[0];
const exhausted = { ...original, moviesRemaining: 0, status: 'EXPIRED' as const };
const resigned = { ...original, id: 'resigned_deal' };
assert.equal(mergeParentStudioTalentRosters('audit_hq', [exhausted, resigned]).length, 2);
assert.equal(consumeTalentUses([exhausted, resigned], [npc.id], 'new_film')[1].moviesRemaining, 2);
const terminated = { ...resigned, status: 'TERMINATED' as const };
assert.equal(consumeTalentUses([terminated], [npc.id], 'film')[0].moviesRemaining, 3);
console.log('PASS re-sign preserves prior debt; inactive contracts never consume uses');
p = fixture(); (p.studioMemory as any).cooldowns = { [npc.id]: 61 }; p.currentWeek = 2;
const repaired = repairTalentNegotiations(p); assert.equal(getTalentNegotiationState(repaired, 'audit_hq', npc.id).attempts, 3);
repaired.currentWeek = 10; assert.equal(getTalentNegotiationState(repaired, 'audit_hq', npc.id).attempts, 0);
console.log('PASS legacy unreachable week 61 cooldown repaired and expires');

// The prestige displayed by the studio dashboard must be the same reputation
// that helps negotiate a below-ask offer, rather than an unrelated brand stat.
p = fixture(); p.stats.fame = 0; p.businesses[0].stats.brandHealth = 0; p.businesses[0].stats.studioMomentum = 0; p.businesses[0].stats.valuation = 0;
p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.50, rejectedOffers: [] } };
assert.equal(send(p, discounted).result.success, false);
p.pastProjects = Array.from({ length: 8 }, (_, i) => ({ id: `prestige_film_${i}`, title: `Award Film ${i}`, studioId: 'audit_hq', rating: 9, gross: 300_000_000, awards: [{ outcome: 'WON' }] })) as any;
assert.equal(send(p, discounted).result.success, true, 'awards and studio filmography must influence below-ask acceptance');
console.log('PASS real studio prestige from awards and filmography improves discount acceptance');
p = fixture(); p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.99, rejectedOffers: [] } };
const rejectedBeforeReload = send(p, Math.floor(ask.totalAmount * 0.8));
const rebuiltNPC = { ...npc, stats: { fame: 0, talent: 0 } };
const afterReload = negotiateTalentContract(JSON.parse(JSON.stringify(rejectedBeforeReload.player)), 'audit_hq', rebuiltNPC, 3, Math.floor(ask.totalAmount * 0.8), 'UPFRONT');
assert.equal(afterReload.result.success, false, 'runtime NPC regeneration must not reroll a rejected quote');
assert.equal(afterReload.result.acceptanceChance, rejectedBeforeReload.result.acceptanceChance);
console.log('PASS saved negotiation quote survives runtime NPC stats regeneration');

p = fixture(); response = send(p, amount);
assert.ok(response.player.flags.extraNPCs.some((a: NPCActor) => a.id === npc.id), 'signed actor identity must survive a fresh runtime');
p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.99, rejectedOffers: [] } };
response = send(p, Math.floor(ask.totalAmount * 0.8));
assert.ok(response.player.flags.extraNPCs.some((a: NPCActor) => a.id === npc.id), 'rejected actor must remain available to resume negotiation after reload');
const marketActor = getAvailableTalent(49, 'ACTOR')[0];
assert.equal(getAvailableTalent(49, 'ACTOR', [marketActor]).filter(a => a.id === marketActor.id).length, 1, 'saved actor must not duplicate the market card');
console.log('PASS full actor identity saved on signing/rejection and unique market cards');
p = fixture(); p.talentNegotiations = { [`audit_hq:${npc.id}`]: { attempts: 0, roll: 0.99, rejectedOffers: [] } };
const experiencedActor = { ...npc, stats: { ...npc.stats, genreXP: { DRAMA: 75 } } } as NPCActor;
const firstAttempt = negotiateTalentContract(p, 'audit_hq', experiencedActor, 3, Math.floor(ask.totalAmount * 0.8), 'UPFRONT');
const signedAfterRetry = negotiateTalentContract(firstAttempt.player, 'audit_hq', experiencedActor, 3, amount, 'UPFRONT');
assert.deepEqual(signedAfterRetry.player.flags.extraNPCs.find((a: NPCActor) => a.id === npc.id).stats.genreXP, { DRAMA: 75 });
console.log('PASS negotiation retry preserves actor genre experience');
