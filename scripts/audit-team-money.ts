/** #171 (plan §21.17): the Money (CFO) and Trust seats' jobs on the full test company.
 *  - the cash floor follows the CFO's strategy (Rafael, margin first: 16 weeks; 12 without a CFO);
 *  - investors' offers come as Ask me cards with the CFO's read (what it values us at against our worth); approving
 *    opens OWNERSHIP, nothing is signed;
 *  - a price idea a quarter, from the Offer tab's own forecast; approving saves it through the Offer tab's own save;
 *  - once public, the quarter's guidance through the public markets' own service, its tone from strategy and trend;
 *  - Trust (a head hired): a leak taken down with filed requests, a trust incident fixed, a major one asks; tech
 *    incidents are not Trust's. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    approveStreamingTeamCard,
    getStreamingTeamCandidates,
    getStreamingTeamCashFloor,
    hireStreamingTeamCandidate,
    runStreamingTeamWeek,
    setStreamingTeamJobMode,
} from '../services/team/streamingTeam';
import { runGuidance, runInvestorOffers, runLeaks, runPriceIdeas, runTrustIncidents } from '../services/team/teamMoney';
import { callStreamingInvestorRound, processStreamingInvestorRoundsWeek } from '../services/streamingInvestorOffers';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';
import type { StreamingTeamSeatId } from '../types';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Money', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const withEnergy = (player: Player, amount: number): Player => ({
    ...player, energy: { current: amount, max: amount }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 },
});
const rich = (player: Player): Player => ({ ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 50_000_000_000 } });
const contextOf = (player: Player, seatId: StreamingTeamSeatId): StreamingTeamJobContext => {
    const platform = platformOf(player);
    const executive = streamingTeamSeatHolders(platform.leadership.appointments).holders.get(seatId)!;
    const seat = platform.leadership.team!.seats.find(item => item.seatId === seatId)!;
    return { player, platform, absoluteWeek: weekOf(player), seat, executive, moneyLeft: seat.weeklyMoney, energyLeft: Math.min(seat.weeklyEnergy, player.energy.current) };
};
/* the build's own weekly close already ran the team this week; run it again as a fresh week's run, from an empty tray */
const rerun = (player: Player, seatId: StreamingTeamSeatId): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return runStreamingTeamWeek({ ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: {
        ...team, lastRunAbsoluteWeek: null, tray: team.tray.filter(card => card.seatId !== seatId),
        seats: team.seats.map(seat => ({ ...seat, usageWeek: 0, moneyUsed: 0, energyUsed: 0, actionsUsed: 0 })),
    } } } });
};
/* the build's own weekly runs (every job at Ask me) left this seat's cards; start a part from an empty tray */
const clearSeat = (player: Player, seatId: StreamingTeamSeatId): Player => {
    const platform = platformOf(player);
    const team = platform.leadership.team!;
    return { ...player, ownedStreamingPlatform: { ...platform, leadership: { ...platform.leadership, team: { ...team, tray: team.tray.filter(card => card.seatId !== seatId) } } } };
};
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-money'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = rich(withEnergy(player, 100));
    const rafael = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.get('MONEY')!;
    assert.equal(rafael.preferredStrategy, 'MARGIN_FIRST');

    /* ── the cash floor ── */
    const floor = getStreamingTeamCashFloor(platformOf(player));
    assert.equal(floor.weeks, 16);
    const withoutCfo = getStreamingTeamCashFloor({ ...platformOf(player), leadership: { ...platformOf(player).leadership, appointments: platformOf(player).leadership.appointments.filter(item => item.id !== rafael.id) } });
    assert.equal(withoutCfo.weeks, 12);
    pass(`the cash floor: ${rafael.nameAtAppointment} (margin first) holds 16 weeks of costs ($${(floor.amount / 1e6).toFixed(0)}M); 12 without a CFO`);

    /* ── investors' offers: #186, a round's (called, then three weeks later) ── */
    const rounded = (() => {
        const called = callStreamingInvestorRound(withEnergy(player, 100), 'SMALL');
        assert.ok(called.changed, called.message);
        const total = called.player.currentWeek - 1 + 3;
        return withEnergy(processStreamingInvestorRoundsWeek({ ...called.player, age: called.player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 }), 100);
    })();
    const offers = runInvestorOffers(contextOf(rounded, 'MONEY'));
    assert.ok(offers.length > 0 && offers.every(item => item.askOnly && item.action.kind === 'OPEN_ROOM' && item.action.room === 'OWNERSHIP'));
    offers.forEach(item => pass(`offer: "${item.title}" · ${item.detail} · ${item.reason}`));
    const asked = rerun(setStreamingTeamJobMode(rounded, 'MONEY', 'OFFERS', 'ASK').player, 'MONEY');
    const card = platformOf(asked).leadership.team!.tray.find(item => item.jobId === 'OFFERS' && item.status === 'WAITING')!;
    const investorsBefore = platformOf(asked).governance.celebrityInvestors.length;
    const opened = approveStreamingTeamCard(asked, card.id);
    assert.ok(opened.changed && opened.openRoom?.room === 'OWNERSHIP');
    assert.equal(platformOf(opened.player).governance.celebrityInvestors.length, investorsBefore, 'nothing signed');
    pass('approving an offer opens its term sheet in OWNERSHIP; nothing is signed');

    /* ── a price idea ── */
    player = clearSeat(player, 'MONEY');
    let idea = runPriceIdeas(contextOf(player, 'MONEY'))[0];
    let priced = player;
    if (!idea) {
        /* far under what rivals charge: a dollar up earns more */
        const platform = platformOf(player);
        const pricing = platform.serviceConfiguration.pricing;
        const entry = pricing.plans.filter(plan => plan.monthly > 0).sort((left, right) => left.monthly - right.monthly)[0];
        priced = { ...player, ownedStreamingPlatform: { ...platform, serviceConfiguration: { ...platform.serviceConfiguration, pricing: { ...pricing, plans: pricing.plans.map(plan => (plan.id === entry.id ? { ...plan, monthly: 2.99 } : plan)) } } } };
        idea = runPriceIdeas(contextOf(priced, 'MONEY'))[0];
    }
    assert.ok(idea && idea.askOnly && idea.action.kind === 'PRICE_CHANGE');
    pass(`price idea: "${idea.title}" · ${idea.detail} · ${idea.reason}`);
    /* investors' offers come first in a week (#172 brings new ones); this part reads the price idea alone */
    const pricedAsk = rerun(setStreamingTeamJobMode(setStreamingTeamJobMode(priced, 'MONEY', 'OFFERS', 'OFF').player, 'MONEY', 'PRICE_IDEAS', 'ASK').player, 'MONEY');
    const priceCard = platformOf(pricedAsk).leadership.team!.tray.find(item => item.jobId === 'PRICE_IDEAS' && item.status === 'WAITING')!;
    const applied = approveStreamingTeamCard(pricedAsk, priceCard.id);
    assert.ok(applied.changed);
    const action = idea.action as { planId: string; monthly: number };
    assert.equal(platformOf(applied.player).serviceConfiguration.pricing.plans.find(plan => plan.id === action.planId)!.monthly, action.monthly);
    assert.equal(runPriceIdeas(contextOf(applied.player, 'MONEY')).length, 0, 'once a quarter');
    pass(`approved: the entry plan is ${action.monthly.toFixed(2)} through the Offer tab's own save; no second idea this quarter`);

    /* ── guidance, once public ── */
    assert.equal(runGuidance(contextOf(player, 'MONEY')).length, 0, 'private: no guidance');
    const listed: Player = (() => {
        const platform = platformOf(player);
        return { ...player, ownedStreamingPlatform: { ...platform, publicCompany: { ...platform.publicCompany, lifecycle: 'PUBLIC', guidance: [] } } };
    })();
    const guidance = runGuidance(contextOf(listed, 'MONEY'))[0];
    assert.ok(guidance && guidance.action.kind === 'GUIDANCE');
    let guided = setStreamingTeamJobMode(listed, 'MONEY', 'GUIDANCE', 'DO').player;
    guided = rerun(guided, 'MONEY');
    const issued = platformOf(guided).publicCompany.guidance.find(item => item.status === 'ACTIVE')!;
    assert.ok(issued && issued.tone === (guidance.action as { posture: string }).posture);
    pass(`public: "${guidance.title}" · ${guidance.detail} · ${guidance.reason} Issued at Do it.`);

    /* ── Trust ── */
    const candidate = getStreamingTeamCandidates(player, 'TRUST')[0];
    const hired = hireStreamingTeamCandidate(player, 'TRUST', candidate.id);
    assert.ok(hired.changed, hired.message);
    let trusted = hired.player;
    const head = streamingTeamSeatHolders(platformOf(trusted).leadership.appointments).holders.get('TRUST')!;
    pass(`Trust: hired ${head.nameAtAppointment} (${head.preferredStrategy.toLowerCase().replace('_', ' ')})`);
    const week = weekOf(trusted);
    const template = platformOf(trusted).crisisSecurity.crises[0];
    const crisis = (id: string, type: OwnedStreamingCrisis['type'], severity: OwnedStreamingCrisis['severity'], title: string): OwnedStreamingCrisis => ({
        ...template, id, idempotencyKey: id, type, severity, stage: 'DETECTED', title, detectedAtAbsoluteWeek: week, resolvedAtAbsoluteWeek: null,
        recoveryReadyAtAbsoluteWeek: null, responseCost: 0, weeklyRecoveryCost: 0, outcomeNote: null, affectedSubscribers: 300_000, statusRepair: undefined,
    });
    const platform = platformOf(trusted);
    trusted = { ...trusted, ownedStreamingPlatform: { ...platform, crisisSecurity: { ...platform.crisisSecurity, crises: [
        ...platform.crisisSecurity.crises.filter(item => item.stage !== 'DETECTED'),
        crisis('audit-leak', 'CONTENT_LEAK', 'MINOR', 'Northern Signal is on pirate sites'),
        crisis('audit-breach', 'ACCOUNT_BREACH', 'SERIOUS', 'Accounts taken over by a phishing wave'),
        crisis('audit-backlash', 'RECOMMENDATION_BACKLASH', 'MAJOR', 'Recommendations push the wrong shows to kids'),
        crisis('audit-crash', 'APP_CRASH', 'MINOR', 'The TV app keeps crashing'),
    ] } } };
    const leak = runLeaks(contextOf(trusted, 'TRUST'));
    assert.equal(leak.length, 1);
    assert.ok(leak[0].title.startsWith('File takedowns: ') && leak[0].cost > 0);
    pass(`leak: "${leak[0].title}" · ${leak[0].detail} · ${leak[0].reason}`);
    const trust = runTrustIncidents(contextOf(trusted, 'TRUST'));
    assert.equal(trust.length, 2, 'the breach and the backlash; the app crash is Technology\'s');
    const major = trust.find(item => item.dedupeKey.endsWith('audit-backlash'))!;
    assert.ok(major.askOnly);
    pass(`trust: "${trust.find(item => !item.askOnly)!.title}"; the major backlash asks: "${major.title}"`);
    let doing = trusted;
    (['LEAKS', 'TRUST_INCIDENTS'] as const).forEach(jobId => { doing = setStreamingTeamJobMode(doing, 'TRUST', jobId, 'DO').player; });
    doing = rerun(doing, 'TRUST');
    const after = platformOf(doing).crisisSecurity.crises;
    const leakAfter = after.find(item => item.id === 'audit-leak')!;
    assert.ok(leakAfter.stage === 'RECOVERING' && leakAfter.statusRepair?.by === head.nameAtAppointment);
    assert.equal(after.find(item => item.id === 'audit-backlash')!.stage, 'DETECTED');
    assert.equal(after.find(item => item.id === 'audit-crash')!.stage, 'DETECTED');
    pass(`Do it: takedowns filed by ${head.nameAtAppointment.split(' ')[0]} (STATUS: "Takedown filed by ${head.nameAtAppointment.split(' ')[0]}"); the major one waits for you; the app crash stays Technology's`);

    console.log(`Team Money audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
