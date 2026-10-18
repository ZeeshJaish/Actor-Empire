import { negotiateTalentContract } from '../services/talentNegotiation';
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type NPCActor, type Player } from '../types';
import { createBusiness } from '../services/businessLogic';
import * as talent from '../services/talentService';
import * as roster from '../services/talentRoster';
import { processGameWeek } from '../services/gameLoop';
import { migratePlayerSave } from '../services/saveMigration';

export const actor = { id: 'audit_icon', name: 'Audit Icon', tier: 'ICON', occupation: 'ACTOR', stats: { fame: 80, talent: 90 }, traits: ['DIVA'], openness: 20, netWorth: 500_000_000, isIndependent: true, prestigeBias: 'PRESTIGE' } as NPCActor;
export function fixture(): Player {
    const p = structuredClone(INITIAL_PLAYER);
    p.id = 'talent_audit'; p.name = 'Talent Audit'; p.age = 30; p.currentWeek = 49; p.money = 5_000_000_000;
    p.flags.extraNPCs = [actor]; p.pendingEvents = []; p.scheduledEvents = []; p.commitments = []; p.activeReleases = [];
    p.logs = []; p.news = []; p.inbox = []; p.studio.talentRoster = [];
    const hq = createBusiness('Audit Pictures', 'PRODUCTION_HOUSE', 'MAJOR_STUDIO', {} as any, '🎬', 49);
    hq.id = 'audit_hq'; hq.stats.brandHealth = 90; hq.stats.studioMomentum = 90;
    const sub = structuredClone(hq); sub.id = 'audit_sub'; sub.name = 'Audit Subsidiary'; sub.balance = 5_000_000_000;
    sub.config.productionType = 'Acquired Studio'; sub.studioState!.acquisitionOrigin = 'STUDIO_ACQUISITION';
    p.businesses = [hq, sub]; return p;
}
const failures: string[] = [];
async function check(name: string, run: () => unknown) {
    try { await run(); console.log('PASS', name); } catch (error) { failures.push(name); console.error('FAIL', name, String(error)); }
}
const ask = talent.calculateNPCAsk(actor, 3);
await check('1.5x guarantees acceptance even for independent ICON', () => {
    const saved = Math.random; Math.random = () => 0.999999;
    try { assert.equal(talent.evaluateOffer(actor, 3, Math.ceil(ask.totalAmount * 1.5), 'UPFRONT', 0, 0).success, true); }
    finally { Math.random = saved; }
});
await check('invalid zero offer cannot sign', () => {
    const saved = Math.random; Math.random = () => 0;
    try { assert.equal(talent.evaluateOffer(actor, 3, 0, 'UPFRONT', 0, 0).success, false); }
    finally { Math.random = saved; }
});
await check('exhausted film uses retain and settle pending installments', async () => {
    const p = fixture(); const c = { ...talent.createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 1, 52_000_007, 5000, 49), studioId: 'audit_hq', moviesRemaining: 0, status: 'EXPIRED' as const, installmentsPaid: 10, amountPaid: undefined };
    p.studio.talentRoster = [c]; p.businesses[0].studioState!.talentRoster = structuredClone([c]);
    const next = (await processGameWeek(p)).player;
    assert.equal(next.studio.talentRoster[0]?.installmentsPaid, 11);
    assert.equal(next.finance.history.filter(t => t.description.startsWith('Talent Maintenance')).length, 0);
    assert.equal(next.finance.history.filter(t => t.description.startsWith('Talent Installment')).length, 1);
});
await check('stale HQ mirror cannot restore consumed uses or lose paid installments', () => {
    const c = { ...talent.createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 3, 52_000_007, 5000, 49), studioId: 'audit_hq' };
    const merged = roster.mergeParentStudioTalentRosters('audit_hq', [{ ...c, moviesRemaining: 1, installmentsPaid: 10 }], [c]);
    assert.equal(merged[0].moviesRemaining, 1); assert.equal(merged[0].installmentsPaid, 10);
});
await check('migration preserves signed prices and legacy paid installments', () => {
    const p = fixture(); const c = { ...talent.createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 3, 52_000_007, 5000, 49), studioId: 'audit_hq', installmentsPaid: 10, amountPaid: undefined, moviesRemaining: 1 };
    p.studio.talentRoster = [c]; p.businesses[0].studioState!.talentRoster = structuredClone([c]);
    const next = migratePlayerSave(JSON.parse(JSON.stringify(p)));
    assert.equal(next.studio.talentRoster[0].totalAmount, 52_000_007);
    assert.equal(next.studio.talentRoster[0].installmentsPaid, 10);
    assert.equal(next.studio.talentRoster[0].moviesRemaining, 1);
});
await check('signed weekly contract bills first next week once and mirrors both rosters', async () => {
    const p = fixture();
    const signed = negotiateTalentContract(p, 'audit_hq', actor, 3, Math.ceil(ask.weeklyInstallment * 1.5), 'WEEKLY_INSTALLMENTS');
    assert.equal(signed.result.success, true);
    const next = (await processGameWeek(signed.player)).player;
    assert.equal(next.studio.talentRoster[0].installmentsPaid, 1);
    assert.equal(next.businesses[0].studioState!.talentRoster![0].installmentsPaid, 1);
    assert.equal(next.finance.history.filter(t => t.description.startsWith('Talent Installment')).length, 1);
});
await check('subsidiary expired deal continues EMI on its own treasury only', async () => {
    const p = fixture();
    const c = { ...talent.createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 1, 52_000_007, 5000, 49), studioId: 'audit_sub', moviesRemaining: 0, status: 'EXPIRED' as const, installmentsPaid: 10, amountPaid: undefined };
    p.businesses[1].studioState!.talentRoster = [c];
    const next = (await processGameWeek(p)).player;
    const sub = next.businesses.find(b => b.id === 'audit_sub')!;
    assert.equal(sub.studioState!.talentRoster![0].installmentsPaid, 11);
    assert.equal(sub.studioState!.financeLedger!.filter(t => t.label.startsWith('Talent payroll'))[0].amount, -1_000_000);
    assert.equal(next.finance.history.filter(t => t.description.startsWith('Talent Installment')).length, 0);
});
await check('EMI ends before uses: no extra installment but upkeep continues', async () => {
    const p = fixture(); const c = { ...talent.createContract(actor.id, 'MOVIE_DEAL', 'WEEKLY_INSTALLMENTS', 3, 52_000_007, 5000, 49), studioId: 'audit_hq', installmentsPaid: 51, amountPaid: undefined };
    p.studio.talentRoster = [c]; p.businesses[0].studioState!.talentRoster = structuredClone([c]);
    let next = (await processGameWeek(p)).player;
    assert.equal(next.finance.history.find(t => t.description.startsWith('Talent Installment'))?.amount, -1_000_007);
    next.finance.history = [];
    next = (await processGameWeek(next)).player;
    assert.equal(next.studio.talentRoster[0].installmentsPaid, 52);
    assert.equal(next.studio.talentRoster[0].moviesRemaining, 3);
    assert.equal(next.finance.history.filter(t => t.description.startsWith('Talent Installment')).length, 0);
    assert.equal(next.finance.history.find(t => t.description.startsWith('Talent Maintenance'))?.amount, -5000);
});
if (failures.length) throw new Error(`${failures.length} regressions: ${failures.join(', ')}`);
