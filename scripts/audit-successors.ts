/**
 * #203: a successor from your connections. Zeesh (2026-11-04): "if we step down to humare pas udahr huamre connection
 * page ke log bhi aana chaiye". Child (18+), Spouse, Partner, Parent, Sibling and Friend can be named; a younger child
 * can be named and waits. Their skill: 35 + closeness × 0.15 + (age − 18, up to 30) × 0.5, ±10, 78 at most. Stepping down
 * works for any of them, and the board and the market react to their skill by the same rule as anyone's.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player, type Relationship } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingSuccessionCandidates, streamingConnectionSkill } from '../services/streamingLegacy';
import { getStreamingStepDownView, returnAsStreamingCeo, stepDownFromStreamingCompany, streamingChiefExecutive, STREAMING_HANDOVER_GAP_WEEKS } from '../services/streamingStepDown';
import { getStreamingTeamView, nameStreamingTeamSuccessor, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';

const started = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const fresh = (id: string, name = 'Successor Audit'): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name, age: 45, currentWeek: 1 });
    return { ...player, money: 2e9, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const later = (player: Player, weeks = 1): Player => {
    const total = player.currentWeek - 1 + weeks;
    return { ...player, age: player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1, energy: { current: 100, max: 100 } };
};
const person = (id: string, name: string, relation: Relationship['relation'], age: number, closeness: number): Relationship => ({
    id, name, relation, age, closeness, image: '', lastInteractionWeek: 0, gender: 'FEMALE',
});

const main = async () => {
    const built = await buildStreamingFullPlatformQa(fresh('successors'), { processWeek: processGameWeek, persistWeek: async next => next });
    const base: Player = {
        ...built,
        relationships: [
            person('r-child', 'Aria Audit', 'Child', 24, 90),
            person('r-young', 'Tomas Audit', 'Child', 12, 95),
            person('r-spouse', 'Lena Audit', 'Spouse', 44, 80),
            person('r-partner', 'Mira Audit', 'Partner', 40, 60),
            person('r-parent', 'Omar Audit', 'Parent', 70, 70),
            person('r-sibling', 'Noor Audit', 'Sibling', 48, 50),
            person('r-friend', 'Kai Audit', 'Friend', 33, 40),
            person('r-agent', 'Ben Audit', 'Agent', 50, 90),
            person('r-pet', 'Rex', 'Pet', 4, 100),
            person('r-ex', 'Ex Audit', 'Ex-Spouse', 44, 70),
        ],
    };

    /* ── who can be named ── */
    const list = getStreamingSuccessionCandidates(base);
    const family = list.filter(item => item.type === 'FAMILY_HEIR');
    assert.deepEqual(family.map(item => item.id).sort(), ['r-child', 'r-friend', 'r-parent', 'r-partner', 'r-sibling', 'r-spouse', 'r-young'], 'family and friends; no agent, pet or ex');
    assert.ok(list.some(item => item.type === 'EXECUTIVE'), 'and the team');
    assert.equal(family.find(item => item.id === 'r-young')?.canOperateNow, false, 'a child waits');
    assert.equal(family.find(item => item.id === 'r-young')?.readinessNote, 'Can take over at 18');
    assert.equal(family.find(item => item.id === 'r-spouse')?.readinessNote, 'Family, not an operator');
    assert.equal(family.find(item => item.id === 'r-friend')?.readinessNote, 'A friend, not an operator');

    /* ── the skill ── */
    const seed = platformOf(base).simulationSeed;
    for (let index = 0; index < 400; index += 1) {
        const skill = streamingConnectionSkill(`${seed}:${index}`, { id: `x${index}`, closeness: 100 }, 80);
        assert.ok(skill <= 78, 'never above 78');
        const middle = streamingConnectionSkill(`${seed}:${index}`, { id: `x${index}`, closeness: 50 }, 30);
        assert.ok(Math.abs(middle - (35 + 7.5 + 6)) <= 10.5, `${middle}: within 10 of the rule`);
    }
    assert.equal(family.find(item => item.id === 'r-child')?.readinessScore, streamingConnectionSkill(seed, { id: 'r-child', closeness: 90 }, 24), 'the same every read');
    pass(`named from connections: ${family.map(item => `${item.name.split(' ')[0]} ${item.readinessScore}`).join(', ')}; never above 78`);

    /* ── a younger child waits ── */
    const namedYoung = nameStreamingTeamSuccessor(base, 'FAMILY_HEIR', 'r-young');
    assert.ok(namedYoung.changed);
    assert.match(getStreamingStepDownView(namedYoung.player)!.stepDownBlocked || '', /can take over at 18/);
    const tooYoung = stepDownFromStreamingCompany(namedYoung.player, 'EXECUTIVE_CHAIR');
    assert.ok(!tooYoung.changed && /18/.test(tooYoung.message || ''), 'not yet');
    pass('a child of 12 can be named, and waits');

    /* ── stepping down to a spouse ── */
    const named = nameStreamingTeamSuccessor(base, 'FAMILY_HEIR', 'r-spouse');
    assert.ok(named.changed);
    const view = getStreamingStepDownView(named.player)!;
    assert.equal(view.successor?.name, 'Lena Audit');
    assert.equal(view.stepDownBlocked, null, 'nothing stops it');
    assert.match(getStreamingTeamView(named.player).succession.plan?.role || '', /Spouse/);
    const before = platformOf(named.player);
    const down = stepDownFromStreamingCompany(named.player, 'EXECUTIVE_CHAIR');
    assert.ok(down.changed, down.message);
    const after = platformOf(down.player);
    const chief = streamingChiefExecutive(after)!;
    assert.equal(chief.name, 'Lena Audit');
    const skill = family.find(item => item.id === 'r-spouse')!.readinessScore;
    assert.equal(chief.skill, skill);
    assert.equal(after.governance.boardConfidence, Math.max(0, Math.min(100, before.governance.boardConfidence + Math.round((skill - 60) / 4))), 'the board reacts to their skill');
    const appointment = after.leadership.appointments.find(item => item.executiveId === chief.executiveId)!;
    assert.equal(appointment.role, 'CEO');
    assert.ok(appointment.weeklyCompensation > 0, 'they are paid');
    const { holders } = streamingTeamSeatHolders(after.leadership.appointments);
    assert.ok(![...holders.values()].some(item => item.id === appointment.id), 'and take no chair at the table');
    assert.equal(holders.size, streamingTeamSeatHolders(before.leadership.appointments).holders.size, 'the team is as it was');
    pass(`step down to a spouse (skill ${skill}): ${chief.name} runs it, at $${Math.round(appointment.weeklyCompensation / 1000)}K a week, the board ${Math.round((skill - 60) / 4)}, no chair taken`);

    /* ── it holds through the weeks ── */
    let run = down.player;
    for (let week = 0; week < 4; week += 1) run = runStreamingTeamWeek(later(run));
    assert.equal(streamingChiefExecutive(platformOf(run))?.name, 'Lena Audit', 'still chief executive four weeks on');
    assert.ok(platformOf(run).leadership.appointments.find(item => item.id === appointment.id)?.status === 'ACTIVE', 'and not reorganised away');
    assert.ok(getStreamingStepDownView(run)!.ceo.you === false);

    /* ── coming back ── */
    const back = returnAsStreamingCeo(later(run, STREAMING_HANDOVER_GAP_WEEKS));
    assert.ok(back.changed, back.message);
    const backPlatform = platformOf(back.player);
    assert.equal(backPlatform.leadership.currentCeo.holderType, 'FOUNDER');
    assert.equal(backPlatform.leadership.appointments.find(item => item.id === appointment.id)?.status, 'RESIGNED', 'they have no chair to go back to');
    assert.ok(backPlatform.leadership.appointments.find(item => item.id === appointment.id)?.exit?.pricedAtAbsoluteWeek !== undefined, 'and no second story');
    assert.equal(getStreamingStepDownView(back.player)!.ceo.you, true);
    pass('coming back: you are chief executive; they leave quietly, with no second reaction');

    console.log(`Successors audit passed in ${Math.round((Date.now() - started) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
