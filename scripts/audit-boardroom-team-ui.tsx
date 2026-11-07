/** #165 (plan §21.17): the Boardroom's TEAM on screen, on the full test company.
 *  - the tab is TEAM, the head counts the team (5/6 after the reorganisation), the founder chairs the table;
 *  - every chair names its person, seat and level; the empty Trust chair offers to hire for 15⚡;
 *  - the pinned bar shows the waiting count and the week's report;
 *  - the in-tray: each card is a memo from its executive with its reason, price and Approve / Change / No;
 *    a rival's call offers Match the package, Bigger role, Let go;
 *  - the dossier: level and experience, the four stats, each job's three-way switch (Ask-only jobs without Do it),
 *    the limits, Train with its price, Let go;
 *  - the CVs: three candidates with their stats, strengths, cautions and Hire · ⚡15;
 *  - the minutes: what the team did and why. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { Boardroom } from '../components/streaming-transplant/StreamingBoardroomExperience';
import { TeamSheets, type BoardroomTeamActions } from '../components/streaming-transplant/BoardroomTeam';
import { createCanonicalBoardroomState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { getStreamingTeamView, runStreamingTeamWeek } from '../services/team/streamingTeam';
import { STREAMING_TEAM_RUNNERS } from '../services/team/teamJobs';

const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
} as Brand;
const noop = () => undefined;
const actions: BoardroomTeamActions = {
    setMode: noop, setLimits: noop, hire: () => ({ ok: true }), train: () => ({ ok: true }), dismiss: noop,
    approve: () => ({ ok: true }), decline: noop, change: noop, nameSuccessor: noop,
};
const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Screen', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-screen'), { processWeek: processGameWeek, persistWeek: async next => next });
    /* a demo job, so the in-tray has a memo (the real jobs are #167–#171) */
    STREAMING_TEAM_RUNNERS.CAPACITY = () => [{
        jobId: 'CAPACITY', dedupeKey: 'ui:mumbai', title: 'Order 24 racks in Mumbai', detail: 'Workhorse racks · ready in 3 weeks',
        reason: 'Peak load at 84% of capacity; your floor is 80%.', cost: 31_000_000, energy: 0, action: { kind: 'NETWORK_ORDER', input: {} },
    }];
    player = runStreamingTeamWeek({ ...player, currentWeek: player.currentWeek + 1 > 52 ? 1 : player.currentWeek + 1, age: player.currentWeek + 1 > 52 ? player.age + 1 : player.age });
    const team = getStreamingTeamView(player);
    assert.equal(team.totals.filled, 5, 'five chairs filled after the reorganisation');
    assert.ok(team.tray.some(card => card.title === 'Order 24 racks in Mumbai'));

    /* ── the tab ── */
    const room = text(renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop}
            initialTab="TABLE" onOpenAcquisitions={noop} team={team} teamActions={actions} />,
    ));
    assert.match(room, / TEAM /);
    /* #179: every chair and row shows the person's portrait, the founder their own picture */
    const tableMarkup = renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} founderGender={player.gender} state={createCanonicalBoardroomState(player)} onBack={noop}
            initialTab="TABLE" team={team} teamActions={actions} />,
    );
    const faces = (tableMarkup.match(/<img /g) || []).length;
    assert.ok(faces >= 1 + 5 * 2, `faces at the table and in the rows (${faces})`);
    assert.match(room, /TEAM 5\/6/);
    assert.match(room, /Your team 5 of 6 chairs filled/);
    assert.match(room, /YOU · CHAIR/);
    /* #182: the long table: three chairs a side in facing pairs; the in-tray and the minutes lie on it */
    const seatsInOrder = ['Marketing', 'Content', 'Technology', 'International', 'Money', 'Trust'].map(label => tableMarkup.indexOf(`<small>${label}</small>`));
    assert.ok(seatsInOrder.every((at, index) => at > 0 && (index === 0 || at > seatsInOrder[index - 1])), 'pairs: Marketing ↔ Content, Technology ↔ International, Money ↔ Trust');
    assert.match(tableMarkup, /aria-label="In-tray, \d+ waiting"/);
    assert.match(tableMarkup, /aria-label="Minutes, week \d+"/);
    team.seats.filter(seat => seat.executive).forEach(seat => {
        assert.ok(room.includes(seat.executive!.name), `${seat.executive!.name} has a row`);
    });
    assert.match(room, /Trust chair is empty/);
    assert.match(room, /Hire · ⚡15/);
    assert.match(room, /1 waiting/);
    assert.match(room, /Week's report/);
    assert.match(room, /Cash floor · \d+ weeks of costs/);
    pass('TEAM: the head counts 5/6, the founder chairs the long table, the chairs in facing pairs with name plates, the in-tray and the minutes on the table, the empty Trust chair, the pinned bar');

    /* ── the in-tray ── */
    const tray = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'TRAY' }} onClose={noop} onOpen={noop} actions={actions} />));
    assert.match(tray, new RegExp(`IN-TRAY · WEEK ${team.companyWeek}`));
    assert.match(tray, /MEMO/);
    assert.match(tray, /From Marcus Vale, Technology · To You/);
    assert.match(tray, /Order 24 racks in Mumbai/);
    assert.match(tray, /Why Peak load at 84% of capacity; your floor is 80%\./);
    assert.match(tray, /Approve \$31M/);
    assert.match(tray, /Change/);
    pass('the in-tray: a memo from Marcus with its reason, its price, Approve $31M / Change / No');

    /* ── the dossier ── */
    const dossier = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'SEAT', seatId: 'MONEY' }} onClose={noop} onOpen={noop} actions={actions} />));
    const cfo = team.seats.find(seat => seat.seatId === 'MONEY')!;
    assert.match(dossier, new RegExp(cfo.executive!.name));
    assert.match(dossier, /LEVEL \d/);
    /* #183: four equal tiles, each with what the stat does; pay and rival risk as chips */
    assert.match(dossier, /SKILL \d+ Jobs .+ LOYALTY \d+ .+ AMBITION \d+ .+ ETHICS \d+/);
    assert.match(dossier, /PAY \$[\d.]+[KM] \/wk .+ RIVAL RISK \d+%/);
    assert.match(dossier, /Investor offers .* Ask me Off/);
    const offersRow = dossier.slice(dossier.indexOf('Investor offers'), dossier.indexOf('Price ideas'));
    assert.ok(offersRow.includes('Ask me') && !offersRow.includes('Do it'), 'an Ask-only job has no Do it');
    assert.match(dossier, /Train to level \d \$\d+M · ⚡10 · \d wk/);
    assert.match(dossier, /Let go/);
    const marketing = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'SEAT', seatId: 'MARKETING' }} onClose={noop} onOpen={noop} actions={actions} />));
    assert.match(marketing, /Premiere push .* Do it Ask me Off/);
    assert.match(marketing, /Money a week \$\d+M up to \$\d+M/);
    assert.match(marketing, /Energy a week ⚡\d+ up to ⚡40/);
    pass('the dossier: a player card (level ring, four stat tiles with their meaning, pay and rival risk), one-size switches (Ask-only without Do it), three limits, Train | Let go');

    /* ── the CVs ── */
    const hire = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'HIRE', seatId: 'TRUST' }} onClose={noop} onOpen={noop} actions={actions} />));
    const trust = team.seats.find(seat => seat.seatId === 'TRUST')!;
    assert.equal(trust.candidates.length, 3);
    trust.candidates.forEach(candidate => assert.ok(hire.includes(candidate.name)));
    /* #180: each CV asks for its own package, with two offers */
    assert.equal((hire.match(/Hire at their ask ⚡15/g) || []).length, 3);
    assert.equal((hire.match(/15% less/g) || []).length, 3);
    assert.ok(hire.includes('PAY') && hire.includes('TO SIGN') && hire.includes('OPTIONS'), 'the ask: pay, signing, options');
    assert.match(hire, /\+ /);
    assert.match(hire, /− /);
    pass('the CVs: three candidates, their stats, strengths and cautions, Hire · ⚡15');

    /* ── the minutes ── */
    const minutes = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'REPORT' }} onClose={noop} onOpen={noop} actions={actions} />));
    assert.match(minutes, /Your team this week/);
    assert.match(minutes, /ASKED YOU|Asked you/i);
    assert.match(minutes, /Order 24 racks in Mumbai/);
    pass('the minutes: what the team did and why');

    /* ── #166: the frame ── */
    const review = { weeksUntilNext: 8, latest: { quarter: 1, tier: 'Breakout cycle', identity: 'Reliable Operator', headline: 'The platform found another gear.',
        verdict: 'A strong quarter.', hits: ['Best week ever'], misses: ['A quiet week'], subscribersNet: 1_200_000, revenue: 281_000_000, cash: 210_700_000 } };
    const money = text(renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop}
            initialTab="MONEY" mnaComingSoon boardReview={review} onOpenFinance={noop} team={team} teamActions={actions} />,
    ));
    assert.match(money, /MONEY · TEAM · OWNERSHIP/);
    assert.match(money, /Board review next in 8 weeks/);
    assert.match(money, /QUARTER 1 Breakout cycle The platform found another gear\./);
    /* #176: the card opens nothing, quotes nothing, and reads its figures short */
    assert.ok(!money.includes('open the review') && !money.includes('“'), 'no link to the weekly brief, no quoted verdict');
    assert.match(money, /MEMBERS \+1\.2M REVENUE \$281M CASH \+\$210\.7M/);
    const long = text(renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop} initialTab="MONEY" mnaComingSoon
            boardReview={{ ...review, latest: { ...review.latest, tierId: 'BREAKOUT' as const, subscribersNet: 11_921_736, hits: ['The strongest catalog week delivered +1,527,079 net members.'], misses: ['The quietest week added only 709,005 net members.'] } }} />,
    ));
    assert.ok(long.includes('+11.9M') && long.includes('+1.5M net members') && long.includes('only 709K net members'), 'long figures read short');
    assert.ok(!money.includes('CEO brief'), 'no CEO brief door on MONEY');
    const deals = text(renderToStaticMarkup(
        <Boardroom brand={brand} founderName={player.name} state={createCanonicalBoardroomState(player)} onBack={noop}
            initialTab="DEALS" mnaComingSoon mnaRivals={['Pulse+', 'Orbit TV']} team={team} teamActions={actions} />,
    ));
    /* #177: M&A is THE DEAL ROOM, a teaser: rumours, six deals, nothing to open */
    for (const words of ['M&A · COMING IN A FUTURE UPDATE', 'THE DEAL ROOM', 'RUMOUR', 'Buy a rival', "Buy a studio's library", 'Buy into a market', 'Bidding wars', 'Hostile takeovers', 'Merge two brands']) {
        assert.ok(deals.includes(words), `M&A shows "${words}"`);
    }
    assert.ok(deals.includes('Bankers circle Orbit TV after a quiet quarter') && deals.includes('NORTHSTAR+ named in takeover chatter'), "the rumours name this world's rivals and us");
    assert.ok(!deals.includes('Open M&A'));
    const succession = text(renderToStaticMarkup(<TeamSheets team={team} sheet={{ kind: 'SUCCESSION' }} onClose={noop} onOpen={noop} actions={actions} />));
    assert.match(succession, /If you step down/);
    team.succession.candidates.slice(0, 3).forEach(candidate => assert.ok(succession.includes(candidate.name)));
    assert.match(room, /IF YOU STEP DOWN/);
    const hq = readFileSync(resolve(process.cwd(), 'components/StreamingPlatformHQ.tsx'), 'utf8');
    assert.ok(hq.includes("{ id: 'TEAM', label: 'TEAM', alert: getStreamingTeamWaitingCount(readPlayer) > 0 }")
        && hq.includes("{ id: 'MONEY', label: 'MONEY' }") && hq.includes("{ id: 'OWNERSHIP', label: 'OWNERSHIP' }")
        && hq.includes("{ id: 'ACQUISITIONS', label: 'M&A · SOON' }"), 'the HQ tile\'s chips are the Boardroom\'s tabs');
    assert.ok(!hq.includes("label: 'CEO BRIEF'") && !hq.includes("{ id: 'LEGACY', label: 'LEGACY' }"), 'no CEO BRIEF or LEGACY chip');
    assert.ok(!hq.includes('<StreamingLeadershipSuite') && !hq.includes('<StreamingLegacyOffice') && !hq.includes('<StreamingAcquisitionCommand'));
    assert.ok(!hq.includes('<h2>Executive pulse</h2>') && !hq.includes('<h2>What matters now</h2>'), 'no old HQ page');
    /* #176: the weekly brief left the game: no dialog, no dashboard bar, no door from the board review */
    assert.ok(!hq.includes('WEEKLY BRIEF') && !hq.includes('renderOperationsOffice') && !hq.includes("id: 'WEEKLY'") && !hq.includes('onOpenReview'), 'no weekly brief anywhere in the HQ');
    pass('#166 frame: MONEY · TEAM · OWNERSHIP, the board review on MONEY, M&A coming soon, succession on TEAM, the HQ chips, the old rooms gone');

    delete STREAMING_TEAM_RUNNERS.CAPACITY;
    console.log(`Boardroom TEAM screen audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
