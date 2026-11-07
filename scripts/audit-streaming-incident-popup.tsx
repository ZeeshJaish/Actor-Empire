/** The week's popup for a new incident, #75 (codex-handoff/plans/platform-tech-plan.md §7, §14; Zeesh: "koi
 *  aadmi game khel raha hai hamara to baar baar to nahi streaming platform mein jayega, phir wahan se status
 *  kholega … us popup ka use karke"; the golden option: "ad dekho → free repair"; "Open STATUS" in English).
 *  Checks:
 *  - queue: the week an incident opens on STATUS, the popup is queued once; a service not live queues none;
 *  - answers: the golden ad repairs it now with no energy and no cash, and the save keeps that it was an ad;
 *    Repair now, Fix and Wait it out are STATUS's own;
 *  - the popup: the incident, the four answers with their costs, "Open STATUS ›"; settled, an OK. */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player, type ScheduledEvent } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import {
    answerStreamingIncidentEvent,
    getStreamingIncidentEventView,
    queueStreamingIncidentEvents,
    streamingIncidentEventData,
} from '../services/streamingIncidentEvent';
import { StreamingIncidentEventModal } from '../components/StreamingIncidentEventModal';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Incident Popup Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const render = (player: Player, event: ScheduledEvent) => renderToStaticMarkup(React.createElement(StreamingIncidentEventModal, {
    player, event, onResolve: () => undefined, onOpenStatus: () => undefined,
}));
const crisisOf = (player: Player, id: string) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).crisisSecurity.crises.find(item => item.id === id);

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('incident-popup'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);

    /* ── queue: real weeks; the game loop queues the popup the week an incident opens ── */
    let event: ScheduledEvent | undefined;
    for (let week = 0; week < 40 && !event; week++) {
        const next = (await processGameWeek(player)).player;
        event = next.pendingEvents?.find(item => item.type === 'STREAMING_INCIDENT' && streamingIncidentEventData(item)?.source === 'CRISIS');
        if (event) {
            player = next;
            const opened = getStreamingIncidentEventView(player, streamingIncidentEventData(event)!)!.incident.openedAtWeek;
            assert.equal(queueStreamingIncidentEvents(player, opened).pendingEvents?.length, player.pendingEvents?.length, 'Queued once');
        } else {
            /* the popups answered (an ad for anything still open), so the next one can come */
            player = { ...next, pendingEvents: [] };
            normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).crisisSecurity.crises.filter(item => item.stage === 'DETECTED')
                .forEach(item => { const result = answerStreamingIncidentEvent(player, { source: 'CRISIS', incidentId: item.id }, 'AD'); if (result.changed) player = result.player; });
        }
    }
    assert.ok(event, 'Within 40 weeks a big service has an incident on STATUS, and it pops up');
    const data = streamingIncidentEventData(event)!;
    const view = getStreamingIncidentEventView(player, data)!;
    assert.ok(view && view.open, 'It is open');
    assert.deepEqual((view.incident.repairs || []).map(option => option.path), ['ENERGY', 'FIX', 'WAIT'], 'STATUS\'s three answers');
    const notLive = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, launchCommit: null } } as Player;
    assert.equal(queueStreamingIncidentEvents({ ...notLive, pendingEvents: [] }, getAbsoluteWeek(player.age, player.currentWeek) - 1).pendingEvents?.length || 0, 0, 'A service not live queues none');
    console.log(`PASS queue: "${view.incident.title}" (${view.incident.severity.toLowerCase()} ${view.incident.kind.toLowerCase()}) pops up the week it opens, once`);

    /* ── answers ── */
    const energy = player.energy.current;
    const cash = normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id).treasuryCash;
    const ad = answerStreamingIncidentEvent(player, data, 'AD');
    assert.ok(ad.changed, ad.message);
    const adCrisis = crisisOf(ad.player, data.incidentId)!;
    assert.equal(adCrisis.stage, 'RESOLVED', 'The ad repairs it now');
    assert.deepEqual([adCrisis.statusRepair?.path, adCrisis.statusRepair?.paidBy, adCrisis.statusRepair?.energy, adCrisis.statusRepair?.cash], ['ENERGY', 'AD', 0, 0]);
    assert.equal(ad.player.energy.current, energy, 'No energy');
    assert.equal(normalizeOwnedStreamingPlatformState(ad.player.ownedStreamingPlatform, ad.player.id).treasuryCash, cash, 'No cash');
    assert.equal(crisisOf({ ...ad.player, ownedStreamingPlatform: JSON.parse(JSON.stringify(ad.player.ownedStreamingPlatform)) }, data.incidentId)?.statusRepair?.paidBy, 'AD', 'The save keeps that it was an ad');
    const repaired = answerStreamingIncidentEvent(player, data, 'ENERGY');
    const option = view.incident.repairs!.find(item => item.path === 'ENERGY')!;
    assert.equal(player.energy.current - repaired.player.energy.current, option.energy, 'Repair now costs its energy');
    assert.equal(crisisOf(repaired.player, data.incidentId)?.stage, 'RESOLVED');
    const fixed = answerStreamingIncidentEvent(player, data, 'FIX');
    assert.equal(crisisOf(fixed.player, data.incidentId)?.stage, 'RECOVERING', 'Fix starts a repair');
    const waited = answerStreamingIncidentEvent(player, data, 'WAIT');
    assert.equal(crisisOf(waited.player, data.incidentId)?.statusRepair?.path, 'WAIT', 'Wait it out is noted');
    assert.equal(getStreamingIncidentEventView(waited.player, data)?.open, false, 'and settles the popup');
    console.log(`PASS answers: ad "${ad.message}" (energy ${energy} → ${ad.player.energy.current}, cash unchanged); Repair now −${option.energy}⚡; Fix → recovering; Wait it out → waiting`);

    /* ── the popup ── */
    const html = render(player, event!);
    ['Watch an ad', 'Repair now', 'Fix', 'Wait it out', 'Open STATUS ›', view.service].forEach(text => assert.ok(html.includes(text), `The popup shows "${text}"`));
    assert.ok(html.includes(view.incident.title.replace(/&/g, '&amp;').replace(/'/g, '&#x27;')), 'and the incident');
    const settled = render(ad.player, event!);
    assert.ok(settled.includes('>OK<') && !settled.includes('Watch an ad'), 'Settled: just an OK');
    console.log(`PASS popup: "${view.service} · Incident", the title, Watch an ad · repair free, Repair now, Fix, Wait it out, Open STATUS ›; once settled, an OK`);
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
