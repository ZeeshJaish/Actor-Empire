/** #191 (plan §22.4, §22.7 Q5): stepping down, on the full test company.
 *  - TEAM › If you step down › Step down, as Executive Chair (shares and a seat) or leaving the board (shares only);
 *    the named successor becomes Chief Executive (`enactStreamingSuccession`);
 *  - they run the company through the team: every job they can do themselves is set to Do it;
 *  - the board's confidence and, once listed, the share price react to their skill ("A new chief executive");
 *  - you can come back as CEO: yours at 51% or more; under it the board decides, and agrees from 60 confidence. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingPlatformState, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { commitStreamingPublicMarketWeek } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { getStreamingTeamView, nameStreamingTeamSuccessor } from '../services/team/streamingTeam';
import { STREAMING_TEAM_JOBS } from '../services/team/teamState';
import { getStreamingStepDownView, returnAsStreamingCeo, stepDownFromStreamingCompany } from '../services/streamingStepDown';
import { TeamSheets, TeamTab, type BoardroomTeamActions } from '../components/streaming-transplant/BoardroomTeam';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Step Down Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const withPlatform = (player: Player, change: (platform: OwnedStreamingPlatformState) => OwnedStreamingPlatformState): Player => ({ ...player, ownedStreamingPlatform: change(platformOf(player)) });
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const noop = () => undefined;
const ok = () => ({ ok: true });
const actions: BoardroomTeamActions = { setMode: noop, setLimits: noop, hire: ok, train: ok, dismiss: noop, approve: ok, decline: noop, change: noop, nameSuccessor: noop, stepDown: ok, returnAsCeo: ok } as unknown as BoardroomTeamActions;
const sheet = (player: Player) => text(renderToStaticMarkup(<TeamSheets team={getStreamingTeamView(player)} sheet={{ kind: 'SUCCESSION' }} onClose={noop} onOpen={noop} actions={actions} stepDown={getStreamingStepDownView(player)} />));
const tab = (player: Player) => text(renderToStaticMarkup(<TeamTab team={getStreamingTeamView(player)} founderInitials="SD" onOpen={noop} stepDown={getStreamingStepDownView(player)} />));

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('step-down'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 } };

    /* ── a successor first ── */
    assert.equal(stepDownFromStreamingCompany(player, 'EXECUTIVE_CHAIR').message, 'Name a successor first.');
    const candidate = getStreamingTeamView(player).succession.candidates.find(item => item.type === 'EXECUTIVE')!;
    assert.ok(candidate, 'an executive can be named');
    const named = nameStreamingTeamSuccessor(player, 'EXECUTIVE', candidate.id);
    assert.ok(named.changed);
    player = named.player;
    const before = sheet(player);
    for (const words of ['STEP DOWN', `${candidate.name} takes over`, 'Executive Chair', 'Leave the board']) assert.ok(before.includes(words), `TEAM shows "${words}"`);
    pass(`a successor first: refused without one; ${candidate.name} named, TEAM offers Executive Chair or leaving the board`);

    /* ── Executive Chair ── */
    const founder = platformOf(player).founderOwnershipPercent;
    const confidence = platformOf(player).governance.boardConfidence;
    const chair = stepDownFromStreamingCompany(player, 'EXECUTIVE_CHAIR');
    assert.ok(chair.changed, chair.message);
    const after = platformOf(chair.player);
    const successor = after.leadership.appointments.find(item => item.executiveId === candidate.id)!;
    assert.equal(after.leadership.currentCeo.holderType, 'EXECUTIVE');
    assert.equal(after.leadership.currentCeo.executiveId, candidate.id);
    assert.equal(after.legacy.founderOfficeRole, 'EXECUTIVE_CHAIR');
    assert.equal(after.founderOwnershipPercent, founder, 'you keep your shares');
    assert.equal(after.governance.boardConfidence, Math.max(0, Math.min(100, Math.round(confidence + (successor.skill - 60) / 4))), 'the board reacts to their skill');
    assert.ok(after.eventLedger.some(entry => entry.type === 'SUCCESSOR_APPOINTED'));
    for (const seat of after.leadership.team!.seats) {
        for (const [jobId, mode] of Object.entries(seat.jobs)) {
            const job = STREAMING_TEAM_JOBS.find(item => item.id === jobId)!;
            if (job.modes.includes('DO')) assert.equal(mode, 'DO', `${jobId} is done by the team`);
        }
    }
    assert.equal(stepDownFromStreamingCompany(chair.player, 'EXECUTIVE_CHAIR').message, 'You have already stepped down.');
    const chairSheet = sheet(chair.player);
    for (const words of ['CHIEF EXECUTIVE', `${successor.nameAtAppointment} runs the company`, 'You chair the board', 'Come back as CEO']) assert.ok(chairSheet.includes(words), `after: "${words}"`);
    assert.ok(tab(chair.player).includes('CHIEF EXECUTIVE') && tab(chair.player).includes(successor.nameAtAppointment), 'the TEAM tab shows who runs it');
    pass(`Executive Chair: ${successor.nameAtAppointment} (skill ${successor.skill}) is Chief Executive, you keep ${founder.toFixed(2)}%, every job they can do is Do it, board confidence ${confidence} → ${after.governance.boardConfidence}`);

    /* ── leaving the board ── */
    const left = stepDownFromStreamingCompany(player, 'LEAVE_BOARD');
    assert.ok(left.changed);
    assert.equal(platformOf(left.player).legacy.founderOfficeRole, 'FOUNDER_EMERITUS');
    assert.ok(sheet(left.player).includes('You keep your shares; you left the board.'));
    pass('leaving the board: shares only (Founder Emeritus)');

    /* ── the market reacts ── */
    const listed = listStreamingCompanyForQa(player, { ticker: 'STEP' });
    assert.ok(listed.changed, listed.reason);
    const steppedListed = stepDownFromStreamingCompany(listed.player, 'EXECUTIVE_CHAIR');
    assert.ok(steppedListed.changed, steppedListed.message);
    const quoteOf = (source: Player) => {
        const platform = platformOf(source);
        const snapshot = { ...platform.weeklyHistory.at(-1)!, absoluteWeek: platform.publicCompany.quoteHistory.at(-1)!.absoluteWeek + 1 };
        return commitStreamingPublicMarketWeek(platform, source, snapshot).publicCompany.quoteHistory.at(-1)!;
    };
    /* the new CEO's fact dated after the listing day's quote */
    const dated = withPlatform(steppedListed.player, platform => ({ ...platform, eventLedger: platform.eventLedger.map(entry => (entry.type === 'SUCCESSOR_APPOINTED' ? { ...entry, absoluteWeek: platform.publicCompany.quoteHistory.at(-1)!.absoluteWeek + 1 } : entry)) }));
    const withCeo = quoteOf(dated);
    const without = quoteOf(listed.player);
    assert.ok(withCeo.drivers.includes('A new chief executive'), withCeo.drivers.join(', '));
    const expected = Math.sign(successor.skill - 60);
    assert.ok(expected === 0 || Math.sign(withCeo.close - without.close) === expected, `the price moves with their skill (${without.close} → ${withCeo.close})`);
    pass(`listed: the week's quote reads "A new chief executive" (${without.close.toFixed(2)} without them, ${withCeo.close.toFixed(2)} with a skill-${successor.skill} CEO)`);

    /* ── coming back ── */
    const back = returnAsStreamingCeo(chair.player);
    assert.ok(back.changed, back.message);
    const backPlatform = platformOf(back.player);
    assert.equal(backPlatform.leadership.currentCeo.holderType, 'FOUNDER');
    assert.equal(backPlatform.legacy.founderOfficeRole, 'FOUNDER_CEO');
    assert.equal(backPlatform.legacy.successionPlan!.status, 'DESIGNATED', 'the successor stays named');
    /* #192: no farming the board: a round trip gives the lift back and then some, and the next handover waits 26 weeks */
    assert.equal(backPlatform.governance.boardConfidence, after.governance.boardConfidence - Math.max(0, Math.round((successor.skill - 60) / 4)) - 2);
    assert.ok(backPlatform.governance.boardConfidence < confidence, `a round trip costs the board's confidence (${confidence} → ${backPlatform.governance.boardConfidence})`);
    assert.equal(stepDownFromStreamingCompany(back.player, 'EXECUTIVE_CHAIR').message, 'The board takes one handover at a time: the next in 26 weeks.');
    const total = back.player.currentWeek - 1 + 26;
    const halfYear = { ...back.player, age: back.player.age + Math.floor(total / 52), currentWeek: (total % 52) + 1 };
    assert.ok(stepDownFromStreamingCompany(halfYear, 'EXECUTIVE_CHAIR').changed, 'and can take over again after 26 weeks');
    const minority = withPlatform(chair.player, platform => ({ ...platform, founderOwnershipPercent: 40, governance: { ...platform.governance, boardConfidence: 45 } }));
    assert.match(returnAsStreamingCeo(minority).message, /^The board backs .+: it wants them to stay \(confidence 45, it needs 60\)\.$/);
    const trusted = withPlatform(minority, platform => ({ ...platform, governance: { ...platform.governance, boardConfidence: 70 } }));
    assert.equal(returnAsStreamingCeo(trusted).message, 'The board agreed: you are Chief Executive again.');
    pass(`coming back: yours at 51% or more; under it the board decides (refused at 45 confidence, agreed at 70); the successor stays named; a round trip costs the board (${confidence} → ${backPlatform.governance.boardConfidence}) and the next handover waits 26 weeks`);

    console.log(`\nstep down audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
