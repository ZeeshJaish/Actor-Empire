/** #180 (plan §22.7): hiring from the industry.
 *  - an empty chair is shown three people for its job from the industry's people, a spread of grades, never one at
 *    our table; every 3 weeks a fresh set, and no one is shown twice within 4 sets;
 *  - each asks for their own package: by who they are (grade, ambition, leaving a job) and by who we are (an
 *    attractive company pays less cash);
 *  - hiring at the ask pays the signing bonus from the treasury (it shows in the books) and grants options: every
 *    holder diluted, the cap table still 100%; never under the founder's 51%;
 *  - 15% less: answered once per person and set; a no spends the energy and they are gone for the set;
 *  - options vest a sixteenth a quarter; whoever leaves returns the rest;
 *  - of the people passed on, some join a rival or a studio when the set turns. */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingFinanceRoom } from '../services/streamingFinanceRoom';
import { getIndustryPerson, industryEmployerOf } from '../services/industry/industryPeople';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import {
    dismissStreamingTeamExecutive,
    getStreamingTeamCandidates,
    getStreamingTeamView,
    hireStreamingTeamCandidate,
    runStreamingTeamWeek,
    walkAwayFromStreamingCandidate,
} from '../services/team/streamingTeam';
import { TEAM_OPTIONS_HOLDER, streamingCandidateAsk, streamingCompanyAppeal, streamingOfferChance } from '../services/team/teamHiring';

const fresh = (id: string, name = 'Hiring Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withEnergy = (player: Player, amount = 100): Player => ({ ...player, energy: { current: amount, max: Math.max(100, amount) }, flags: { ...player.flags, weeklyBaseEnergyRemaining: amount, bonusEnergyBank: 0 } });
/** the same career, some weeks later (only the week moves) */
const later = (player: Player, weeks: number): Player => {
    const total = player.currentWeek - 1 + weeks;
    return withEnergy({ ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 });
};
const pass = (label: string) => console.log(`✓ ${label}`);
const money = (value: number) => `$${Math.round(value / 1_000)}K`;
const millions = (value: number) => `$${(value / 1e6).toFixed(2)}M`;

async function main() {
    const started = performance.now();
    let player = withEnergy(await buildStreamingFullPlatformQa(fresh('team-hiring'), { processWeek: processGameWeek, persistWeek: async next => next }));
    player = runStreamingTeamWeek(later(player, 1));
    assert.ok(!streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders.has('TRUST'), 'the Trust chair is empty');

    /* ── three people, a spread, never ours ── */
    const candidates = getStreamingTeamCandidates(player, 'TRUST');
    assert.equal(candidates.length, 3, 'three people');
    candidates.forEach(candidate => {
        const person = getIndustryPerson(player, candidate.id)!;
        assert.equal(person.role, 'SECURITY_TRUST_HEAD', `${candidate.name} does the job`);
        assert.notEqual(industryEmployerOf(player, person).kind, 'OURS');
        assert.ok(candidate.ask.weekly > 0 && candidate.ask.signing > 0 && candidate.ask.optionsPercent > 0, 'each asks for pay, a signing bonus and options');
    });
    assert.ok(new Set(candidates.map(candidate => candidate.grade)).size >= 2, 'a spread of grades');
    pass(`the Trust chair: ${candidates.map(candidate => `${candidate.name} (${candidate.grade.toLowerCase()}, ${candidate.where.toLowerCase()}, asks ${millions(candidate.ask.weekly)}/wk, ${millions(candidate.ask.signing)} to sign, ${candidate.ask.optionsPercent}%)`).join('; ')}`);

    /* ── a fresh set every 3 weeks; no one twice within 4 sets ── */
    const shown: string[][] = [candidates.map(candidate => candidate.id)];
    let rolling = player;
    for (let set = 1; set < 4; set += 1) {
        rolling = runStreamingTeamWeek(later(rolling, 3));
        shown.push(getStreamingTeamCandidates(rolling, 'TRUST').map(candidate => candidate.id));
    }
    const all = shown.flat();
    assert.equal(new Set(all).size, all.length, 'no one shown twice within 4 sets');
    const moves = (rolling.world.industryPeople?.moves || []).filter(move => shown.slice(0, 3).flat().includes(move.personId) && ['RIVAL', 'STUDIO'].includes(move.to.kind));
    pass(`4 sets, 12 different people (${shown.map(set => set.map(id => getIndustryPerson(player, id)!.name.split(' ')[0]).join('/')).join(' → ')}); ${moves.length} of those passed on joined a rival or a studio`);

    /* ── the ask: who they are, who we are ── */
    const platform = platformOf(player);
    const someone = getIndustryPerson(player, candidates[0].id)!;
    const asFree = streamingCandidateAsk({ ...player, world: { ...player.world, industryPeople: { ...player.world.industryPeople!, employers: { ...player.world.industryPeople!.employers, [someone.id]: { kind: 'FREE', name: 'Between roles' } } } } }, platform, someone);
    const asRival = streamingCandidateAsk({ ...player, world: { ...player.world, industryPeople: { ...player.world.industryPeople!, employers: { ...player.world.industryPeople!.employers, [someone.id]: { kind: 'RIVAL', id: 'NETFLIX', name: 'Netflix' } } } } }, platform, someone);
    assert.ok(asRival.weekly > asFree.weekly && asRival.signing > asFree.signing, 'leaving a job costs more');
    const small = { ...platform, metrics: { ...platform.metrics, subscribers: 900_000, netSubscriberMovement: -40_000 }, treasuryCash: 0 };
    assert.ok(streamingCompanyAppeal(small).appeal < streamingCompanyAppeal(platform).appeal, 'a small, shrinking, broke company appeals less');
    assert.ok(streamingCandidateAsk(player, small, someone).weekly > streamingCandidateAsk(player, platform, someone).weekly, 'so it pays more cash');
    assert.ok(streamingCandidateAsk(player, small, someone).optionsPercent >= streamingCandidateAsk(player, platform, someone).optionsPercent, 'and gives at least as many options');
    pass(`${someone.name}: between roles ${millions(asFree.weekly)}/wk, leaving Netflix ${millions(asRival.weekly)}/wk; appeal ${streamingCompanyAppeal(platform).appeal.toFixed(2)} here, ${streamingCompanyAppeal(small).appeal.toFixed(2)} for a small broke service`);

    /* ── hiring at the ask: the bonus paid, the options granted ── */
    const pick = candidates[0];
    const before = platformOf(player);
    const hired = hireStreamingTeamCandidate(player, 'TRUST', pick.id, 'ASK');
    assert.ok(hired.changed, hired.message);
    const after = platformOf(hired.player);
    const appointment = after.leadership.appointments.find(item => item.executiveId === pick.id && item.status === 'ACTIVE')!;
    assert.equal(appointment.weeklyCompensation, pick.ask.weekly, 'paid what they asked');
    assert.equal(appointment.signingBonus, pick.ask.signing);
    assert.equal(after.treasuryCash, before.treasuryCash - pick.ask.signing, 'the signing bonus left the treasury');
    assert.equal(appointment.options?.percent, pick.ask.optionsPercent);
    const pool = after.finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER)!;
    assert.ok(Math.abs(pool.ownershipPercent - pick.ask.optionsPercent) < 0.01, 'the options sit as Team options');
    assert.ok(Math.abs(after.founderOwnershipPercent - before.founderOwnershipPercent * (1 - pick.ask.optionsPercent / 100)) < 0.01, 'the founder diluted');
    const total = after.founderOwnershipPercent + after.finance.equityHolders.reduce((sum, holder) => sum + holder.ownershipPercent, 0);
    assert.ok(Math.abs(total - 100) < 0.05, `the cap table still adds up (${total.toFixed(3)}%)`);
    assert.equal(hired.player.energy.current, player.energy.current - 15);
    const books = getStreamingFinanceRoom(hired.player, 'ALL').ledger.find(entry => entry.label === 'Signing bonus');
    assert.ok(books && books.cashDelta === -pick.ask.signing, 'the signing bonus shows in the books');
    const view = getStreamingTeamView(hired.player).seats.find(seat => seat.seatId === 'TRUST')!;
    assert.deepEqual(view.executive?.options, { percent: pick.ask.optionsPercent, vested: 0 });
    pass(`hired ${pick.name} at their ask: ${millions(pick.ask.signing)} paid to sign (in the books), ${pick.ask.optionsPercent}% options, founder ${before.founderOwnershipPercent.toFixed(2)}% → ${after.founderOwnershipPercent.toFixed(2)}%`);

    /* ── vesting, and leaving ── */
    let vested = runStreamingTeamWeek(later(hired.player, 26));
    const seatNow = getStreamingTeamView(vested).seats.find(seat => seat.seatId === 'TRUST')!;
    assert.equal(seatNow.executive?.options?.vested, 2 / 16, 'two quarters vested');
    const poolBefore = platformOf(vested).finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER)!.ownershipPercent;
    const founderBefore = platformOf(vested).founderOwnershipPercent;
    vested = dismissStreamingTeamExecutive(vested, 'TRUST').player;
    vested = runStreamingTeamWeek(later(vested, 1));
    const poolAfter = platformOf(vested).finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER)?.ownershipPercent ?? 0;
    assert.ok(poolAfter < poolBefore * 0.2, 'the part not vested went back');
    assert.ok(platformOf(vested).founderOwnershipPercent > founderBefore, "the founder's share grew back");
    const settledTwice = runStreamingTeamWeek(later(vested, 1));
    assert.ok(Math.abs((platformOf(settledTwice).finance.equityHolders.find(holder => holder.holderName === TEAM_OPTIONS_HOLDER)?.ownershipPercent ?? 0) - poolAfter) < 0.0001, 'settled once');
    pass(`26 weeks on: 12.5% vested; let go, the pool ${poolBefore.toFixed(3)}% → ${poolAfter.toFixed(3)}%, the founder ${founderBefore.toFixed(2)}% → ${platformOf(vested).founderOwnershipPercent.toFixed(2)}%`);

    /* ── 15% less: one answer per person and set ── */
    let yes = 0;
    let no = 0;
    let probe = vested;
    for (let attempt = 0; attempt < 8 && (yes === 0 || no === 0); attempt += 1) {
        probe = runStreamingTeamWeek(later(probe, 3));
        const offer = getStreamingTeamCandidates(probe, 'TRUST')[0];
        if (!offer) continue;
        const result = hireStreamingTeamCandidate(withEnergy(probe), 'TRUST', offer.id, offer.lower);
        if (result.reason === 'COUNTERED') {
            no += 1;
            assert.equal(result.player.energy.current, 85, 'a no still spends the energy');
            const asked = getStreamingTeamCandidates(result.player, 'TRUST').find(item => item.id === offer.id)!;
            assert.ok(asked.counter, 'a no comes with a counter');
            assert.ok(asked.counter!.weekly > offer.lower.weekly && asked.counter!.weekly <= offer.ask.weekly, 'the counter sits between your offer and their ask');
            assert.ok(asked.counter!.optionsPercent > 0, 'and keeps its options');
            /* the answer is set: the same offer gets the same no */
            const again = hireStreamingTeamCandidate(withEnergy(result.player), 'TRUST', offer.id, offer.lower);
            assert.equal(again.reason, 'COUNTERED', 'asking again changes nothing');
            /* taking it costs no more energy */
            const taken = hireStreamingTeamCandidate(withEnergy(result.player), 'TRUST', offer.id, 'COUNTER');
            assert.ok(taken.changed, taken.message);
            assert.equal(taken.player.energy.current, 100, 'the counter costs no more energy');
            assert.equal(platformOf(taken.player).leadership.appointments.find(item => item.executiveId === offer.id && item.status === 'ACTIVE')!.weeklyCompensation, asked.counter!.weekly, 'hired at the counter');
            /* walking away ends it */
            const gone = walkAwayFromStreamingCandidate(result.player, offer.id);
            assert.ok(gone.changed, 'you can walk away');
            assert.ok(!getStreamingTeamCandidates(gone.player, 'TRUST').some(item => item.id === offer.id), 'and they are gone for the set');
            probe = gone.player;
        } else {
            assert.ok(result.changed, result.message);
            yes += 1;
            const taken = platformOf(result.player).leadership.appointments.find(item => item.executiveId === offer.id && item.status === 'ACTIVE')!;
            assert.equal(taken.weeklyCompensation, offer.lower.weekly, 'hired at 15% less');
            probe = dismissStreamingTeamExecutive(result.player, 'TRUST').player;
        }
    }
    assert.ok(yes + no > 0, 'lower offers were made');
    pass(`15% less: ${yes} took it, ${no} said no (each no spent ⚡15, came with a counter, and left them gone once you walked away)`);

    /* #198: above their ask buys loyalty; far under it, no talks */
    {
        const open = runStreamingTeamWeek(later(withEnergy(player), 60));
        const person = getStreamingTeamCandidates(open, 'TRUST')[0];
        assert.ok(person, 'a person to offer to');
        const basis = person.offerBasis;
        assert.equal(streamingOfferChance(basis, basis.ask), 1, 'their ask is a yes');
        assert.ok(Math.abs(streamingOfferChance(basis, { weekly: person.lower.weekly, signing: person.lower.signing, optionsPercent: person.lower.optionsPercent }) - basis.lowerChance) < 0.12, '15% under keeps the chance on the CV');
        assert.equal(streamingOfferChance(basis, { weekly: 5_000, signing: 0, optionsPercent: 0 }), 0, 'far under is no talks');
        const generous = { ...basis.ask, weekly: Math.round(basis.ask.weekly * 1.3 / 5_000) * 5_000 };
        const glad = hireStreamingTeamCandidate(withEnergy(open), 'TRUST', person.id, generous);
        assert.ok(glad.changed, glad.message);
        const signed = platformOf(glad.player).leadership.appointments.find(item => item.executiveId === person.id && item.status === 'ACTIVE')!;
        assert.equal(signed.weeklyCompensation, generous.weekly, 'your figure is their pay');
        assert.ok(signed.loyalty > person.loyalty, 'more than they asked buys loyalty');
        const insulted = hireStreamingTeamCandidate(withEnergy(open), 'TRUST', person.id, { weekly: 5_000, signing: 0, optionsPercent: 0 });
        assert.equal(insulted.reason, 'REFUSED', 'no talks');
        assert.ok(!getStreamingTeamCandidates(insulted.player, 'TRUST').some(item => item.id === person.id), 'and they are gone for the set');
        pass(`Your own offer: ${money(generous.weekly)} against an ask of ${money(basis.ask.weekly)} buys loyalty ${person.loyalty} → ${signed.loyalty}; ${money(5_000)} gets no talks`);
    }

    /* ── never under 51% ── */
    const controlled = (() => {
        const current = platformOf(probe);
        return withEnergy({ ...probe, ownedStreamingPlatform: { ...current, founderOwnershipPercent: 51.05 } } as Player);
    })();
    const next = getStreamingTeamCandidates(controlled, 'TRUST')[0];
    if (next) {
        const blocked = hireStreamingTeamCandidate(controlled, 'TRUST', next.id, 'ASK');
        assert.equal(blocked.reason, 'CONTROL', 'options that would take the founder under 51% are refused');
        pass(`at 51.05%, hiring ${next.name} (${next.ask.optionsPercent}% options) is refused: "${blocked.message}"`);
    }

    console.log(`Team hiring audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
