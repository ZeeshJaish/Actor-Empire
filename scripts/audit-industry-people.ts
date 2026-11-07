/** #178 (plan §22): the industry's people in the NPC database.
 *  - who: 25 executives a job (the old candidates among them, with their ids, names and stats), the five rival CEOs,
 *    40 investors (the old 13, 12 new people, 15 firms); one name per person, none taken from another NPC;
 *  - the same people every time a career loads, and other people in another career;
 *  - the weekly upkeep: our chairs work for us, employed executives bank pay, every 3 weeks two contracts end and two
 *    people are hired; the saved part stays small;
 *  - the Forbes list: executives and investor people with a worth that grows with their pay and their stake in us. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { NPC_DATABASE } from '../services/npcLogic';
import { STREAMING_EXECUTIVE_CANDIDATES } from '../services/streamingCompany';
import {
    INDUSTRY_SEAT_ROLES,
    findIndustryInvestor,
    getIndustryNpcs,
    getIndustryPeople,
    getIndustryPerson,
    industryEmployerOf,
    industryNetWorthOf,
    processIndustryPeopleWeek,
} from '../services/industry/industryPeople';
import { industryStakeGain } from '../services/industry/industryStakes';

const fresh = (id: string, name = 'Industry Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const pass = (label: string) => console.log(`✓ ${label}`);
const millions = (value: number) => `$${(value / 1e6).toFixed(1)}M`;

async function main() {
    const started = performance.now();

    /* ── who ── */
    const blank = fresh('industry', 'Ada Founder');
    const t0 = performance.now();
    const people = getIndustryPeople(blank);
    const firstDraw = performance.now() - t0;
    const executives = people.filter(person => person.kind === 'EXECUTIVE' && person.role !== 'CEO');
    INDUSTRY_SEAT_ROLES.forEach(role => {
        const count = executives.filter(person => person.role === role || (role === 'INTERNATIONAL_HEAD' && person.role === 'COO')).length;
        assert.equal(count, 25, `25 people do ${role}`);
    });
    const ceos = people.filter(person => person.role === 'CEO');
    assert.equal(ceos.length, 5, 'the five rival CEOs');
    assert.ok(ceos.every(ceo => ceo.start.kind === 'RIVAL'), 'each at their service');
    const investors = people.filter(person => person.kind === 'INVESTOR');
    assert.equal(investors.length, 40, 'forty investors');
    assert.equal(investors.filter(person => person.person).length, 20, 'twenty of them people (8 old, 12 new), twenty firms');
    STREAMING_EXECUTIVE_CANDIDATES.forEach(candidate => {
        const person = getIndustryPerson(blank, candidate.id);
        assert.ok(person && person.name === candidate.name && person.skill === candidate.skill && person.weeklyCompensation === candidate.weeklyCompensation, `${candidate.name} keeps their id, name and stats`);
    });
    const names = people.map(person => person.name.toLowerCase());
    assert.equal(new Set(names).size, names.length, 'one name per person');
    const legacyNames = new Set([...STREAMING_EXECUTIVE_CANDIDATES.map(item => item.name.toLowerCase()), ...ceos.map(item => item.name.toLowerCase()), ...investors.filter(item => item.legacyId).map(item => item.name.toLowerCase())]);
    const npcNames = new Set(NPC_DATABASE.map(npc => npc.name.toLowerCase()));
    const clashes = people.filter(person => !legacyNames.has(person.name.toLowerCase()) && npcNames.has(person.name.toLowerCase()));
    assert.deepEqual(clashes.map(person => person.name), [], 'no new person takes an NPC\'s name');
    assert.equal(getIndustryPerson(blank, 'priya-raman')?.name, 'Priya Raman', 'the candidate keeps her name');
    const priya = findIndustryInvestor(blank, 'priya-raman')!;
    assert.ok(priya.name === 'Priya Ramanathan' && priya.legacyName === 'Priya Raman', 'the investor who shared it is Priya Ramanathan (her records still match)');
    const grades = executives.reduce<Record<string, number>>((tally, person) => ({ ...tally, [person.grade]: (tally[person.grade] || 0) + 1 }), {});
    pass(`the industry: ${executives.length} executives (25 a job; ${Object.entries(grades).map(([grade, count]) => `${count} ${grade.toLowerCase()}`).join(', ')}), 5 rival CEOs, 40 investors (20 people, 20 firms); unique names; drawn in ${Math.round(firstDraw)} ms`);

    /* ── the same people for a career, other people for another ── */
    const again = getIndustryPeople(fresh('industry', 'Ada Founder'));
    assert.deepEqual(again.map(person => person.name), people.map(person => person.name), 'the same career draws the same people');
    const other = getIndustryPeople(fresh('industry', 'Bo Founder'));
    const generatedHere = people.filter(person => person.id.startsWith('exec-')).map(person => person.name);
    const generatedThere = other.filter(person => person.id.startsWith('exec-')).map(person => person.name);
    const shared = generatedHere.filter(name => generatedThere.includes(name)).length;
    assert.ok(shared < generatedHere.length * 0.1, `another career meets other people (${shared} of ${generatedHere.length} names shared)`);
    pass(`one career, the same people; another career, other people (${shared} of ${generatedHere.length} new names shared)`);

    /* ── the weekly upkeep, on the test company ── */
    let player = await buildStreamingFullPlatformQa(fresh('industry-week'), { processWeek: processGameWeek, persistWeek: async next => next });
    const platform = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
    const ours = platform.leadership.appointments.filter(item => item.status === 'ACTIVE');
    assert.ok(ours.length >= 4, 'the test company has a team');
    ours.forEach(appointment => {
        const person = getIndustryPerson(player, appointment.executiveId)!;
        assert.equal(industryEmployerOf(player, person).kind, 'OURS', `${person.name} works for us`);
    });
    const jonah = getIndustryPerson(player, ours[0].executiveId)!;
    const before = industryNetWorthOf(player, jonah);
    const startWeek = player.world.industryPeople!.lastWeek;
    for (let index = 0; index < 6; index += 1) player = (await processGameWeek(player)).player;
    const after = industryNetWorthOf(player, jonah);
    assert.ok(after > before, `${jonah.name} banks pay at our company`);
    const state = player.world.industryPeople!;
    /* the moves list keeps the latest 24, so count by week */
    const newMoves = state.moves.filter(move => move.absoluteWeek > startWeek);
    assert.ok(newMoves.length >= 4, 'two contracts end and two people are hired every 3 weeks');
    assert.ok(newMoves.some(move => move.to.kind === 'FREE') && newMoves.some(move => ['RIVAL', 'STUDIO'].includes(move.to.kind)), 'some leave, some are hired');
    const size = JSON.stringify(state).length;
    assert.ok(size < 20_000, `the saved part stays small (${size} bytes)`);
    const t2 = performance.now();
    processIndustryPeopleWeek({ ...player, currentWeek: player.currentWeek + 1 > 52 ? 1 : player.currentWeek + 1, age: player.currentWeek + 1 > 52 ? player.age + 1 : player.age });
    const oneUpkeep = performance.now() - t2;
    pass(`6 weeks: our ${ours.length} chairs work for us; ${jonah.name} ${millions(before)} → ${millions(after)}; ${newMoves.length} moves (e.g. ${getIndustryPerson(player, newMoves.at(-1)!.personId)!.name} → ${newMoves.at(-1)!.to.name}); saved part ${size} bytes; one upkeep ${oneUpkeep.toFixed(1)} ms`);

    /* ── the Forbes list ── */
    const sofia = findIndustryInvestor(player, 'investor-sofia-laurent')!;
    const withStake: Player = (() => {
        const current = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
        return { ...player, ownedStreamingPlatform: { ...current, finance: { ...current.finance, equityHolders: [...current.finance.equityHolders.filter(item => item.holderName !== sofia.name), { id: 'audit-sofia', holderName: sofia.name, ownershipPercent: 10, investedCapital: 200_000_000, issuedAtAbsoluteWeek: 1 }] } } } as Player;
    })();
    const npcs = getIndustryNpcs(withStake, industryStakeGain(withStake), true);
    assert.ok(npcs.some(npc => npc.occupation === 'EXECUTIVE') && npcs.some(npc => npc.occupation === 'INVESTOR'), 'executives and investors are listed');
    assert.ok(!npcs.some(npc => getIndustryPerson(player, npc.id)?.person === false), 'firms are not people');
    const sofiaNpc = npcs.find(npc => npc.id === sofia.id)!;
    assert.ok(sofiaNpc.netWorth > industryNetWorthOf(player, sofia), 'an investor\'s stake in us adds to their worth');
    const jonahNpc = npcs.find(npc => npc.id === jonah.id)!;
    assert.ok(jonahNpc.bio.includes(normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).identity!.name), 'an executive\'s line names where they work');
    const forbes = readFileSync(resolve(process.cwd(), 'views/mobile/ForbesApp.tsx'), 'utf8');
    assert.ok(forbes.includes("'EXECUTIVE',") && forbes.includes('...getIndustryNpcs(player, industryStakeGain(player), true),'), 'Forbes ranks them, ahead of the static copies');
    /* the list carries investors, the rivals' CEOs and our people: someone who joins us appears on it */
    const notable = npcs.filter(npc => npc.occupation === 'EXECUTIVE');
    assert.equal(notable.length, 5 + ours.length, 'the rich list carries the rivals\' CEOs and our team');
    const someoneFree = getIndustryPeople(player).find(person => person.kind === 'EXECUTIVE' && industryEmployerOf(player, person).kind === 'FREE')!;
    assert.ok(!npcs.some(npc => npc.id === someoneFree.id), 'an executive between roles is not on it');
    const hired: Player = { ...withStake, world: { ...withStake.world, industryPeople: { ...withStake.world.industryPeople!, employers: { ...withStake.world.industryPeople!.employers, [someoneFree.id]: { kind: 'OURS', name: 'NORTHSTAR+' } } } } };
    assert.ok(getIndustryNpcs(hired, undefined, true).some(npc => npc.id === someoneFree.id), 'joining us puts them on it');
    assert.ok(Math.max(...npcs.filter(npc => npc.occupation === 'INVESTOR').map(npc => getIndustryPerson(player, npc.id)!.baseNetWorth)) <= 6e9, "investors' worth sits among the celebrities'");
    pass(`Forbes: ${npcs.length} people; ${sofia.name} ${millions(industryNetWorthOf(player, sofia))} + her stake → ${millions(sofiaNpc.netWorth)}; "${jonahNpc.bio}"`);

    console.log(`Industry people audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
