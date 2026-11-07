/** #174 (plan §21.17): what the team did shows where it happened, and the in-tray's buttons say what they do.
 *  - Campaign Studio: "Run by Jonah" on a campaign the team started;
 *  - Content › Rights: "Handled by Nia" and "Renewed by Nia";
 *  - Platform › STATUS: "Fix ordered by Marcus" on an open incident, "Fixed by Marcus" in the history;
 *  - Content › Localization: "reached by Elena" on the region's line;
 *  - the in-tray: a pitch's cover page (Take it to the desk / Pass), "Open the term sheet", "Set $X", "Approve ⚡N",
 *    "Approve $X". */
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingTeamCard, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { normalizeStreamingRightsCalendarState } from '../services/streamingRightsCalendar';
import { getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { getStreamingLocalizationDesk } from '../services/streamingLocalizationDesk';
import { getStreamingTeamView } from '../services/team/streamingTeam';
import { streamingTeamSeatHolders } from '../services/team/teamState';
import { executeCampaignStart, runBrandCampaign } from '../services/team/teamMarketing';
import { executeRenewal } from '../services/team/teamContent';
import { executeIncidentRepair } from '../services/team/teamTechnology';
import { executeLocalizationLevel } from '../services/team/teamInternational';
import type { StreamingTeamJobContext } from '../services/team/teamJobs';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';
import { CampaignStudio } from '../components/campaigns/studio/CampaignStudio';
import { ContentDesk } from '../components/streaming-transplant/StreamingContentExperience';
import { PlatformDesk } from '../components/streaming-transplant/StreamingNetworkExperience';
import { TeamSheets, type BoardroomTeamActions } from '../components/streaming-transplant/BoardroomTeam';
import { createCanonicalContentDeskState, createCanonicalNetworkState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';

const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
} as Brand;
const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Team Chips', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const weekOf = (player: Player) => getAbsoluteWeek(player.age, player.currentWeek);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const noop = () => ({ ok: true, message: '' });

async function main() {
    const started = performance.now();
    let player = await buildStreamingFullPlatformQa(fresh('team-chips'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, ownedStreamingPlatform: { ...platformOf(player), treasuryCash: 50_000_000_000 } };
    const holders = streamingTeamSeatHolders(platformOf(player).leadership.appointments).holders;
    const name = (seat: 'MARKETING' | 'CONTENT' | 'TECHNOLOGY' | 'INTERNATIONAL') => holders.get(seat)!.nameAtAppointment;
    const first = (full: string) => full.split(' ')[0];
    const ctx = (seat: 'MARKETING' | 'CONTENT' | 'TECHNOLOGY' | 'INTERNATIONAL') => ({ absoluteWeek: weekOf(player), executiveName: name(seat) });

    /* ── Campaign Studio: Run by Jonah ── */
    const seat = platformOf(player).leadership.team!.seats.find(item => item.seatId === 'MARKETING')!;
    const context: StreamingTeamJobContext = { player, platform: platformOf(player), absoluteWeek: weekOf(player), seat: { ...seat, actionMoney: 500_000_000 }, executive: holders.get('MARKETING')!, moneyLeft: 500_000_000, energyLeft: 40 };
    const brandCampaign = runBrandCampaign(context)[0];
    const started_ = executeCampaignStart(player, brandCampaign.action, ctx('MARKETING'));
    assert.ok(started_.changed, started_.reason);
    player = started_.player;
    const studio = text(renderToStaticMarkup(<CampaignStudio player={player} brand={brand} onUpdatePlayer={() => undefined} onClose={() => undefined} />));
    assert.ok(studio.includes(`Run by ${first(name('MARKETING'))}`));
    pass(`Campaign Studio: "Run by ${first(name('MARKETING'))}"`);

    /* ── Content › Rights: Renewed by Nia ── */
    const renewal = Object.values(normalizeStreamingRightsCalendarState(player.world.streamingRightsCalendar).renewalCases)
        .find(item => item.incumbentBuyer.type === 'PLAYER_PLATFORM' && item.outcome === 'PENDING' && item.offerDisposition === 'OFFERED' && item.sourceExpiresAtAbsoluteWeek >= weekOf(player))!;
    const renewed = executeRenewal(player, { kind: 'RENEWAL', caseId: renewal.id, decision: 'ACCEPT_RENEWAL' }, ctx('CONTENT'));
    assert.ok(renewed.changed, renewed.reason);
    player = renewed.player;
    const rights = text(renderToStaticMarkup(<ContentDesk brand={brand} state={createCanonicalContentDeskState(player)} onBack={() => undefined} initialTab="RIGHTS" onRenewalDecision={noop} onOpenRightsCalendar={() => undefined} />));
    assert.ok(rights.includes(`Handled by ${first(name('CONTENT'))}`) && rights.includes(`Renewed by ${first(name('CONTENT'))}`) && rights.includes(`${first(name('CONTENT'))} renewed it.`));
    pass(`Content › Rights: "Handled by ${first(name('CONTENT'))}", "Renewed by ${first(name('CONTENT'))}", "${first(name('CONTENT'))} renewed it."`);

    /* ── Platform › STATUS: Fix ordered by / Fixed by Marcus ── */
    const template = platformOf(player).crisisSecurity.crises[0];
    const crisis = (id: string, type: OwnedStreamingCrisis['type'], title: string): OwnedStreamingCrisis => ({
        ...template, id, idempotencyKey: id, type, severity: 'MINOR', stage: 'DETECTED', title, detectedAtAbsoluteWeek: weekOf(player), resolvedAtAbsoluteWeek: null,
        recoveryReadyAtAbsoluteWeek: null, responseCost: 0, weeklyRecoveryCost: 0, outcomeNote: null, affectedSubscribers: 200_000, statusRepair: undefined,
    });
    player = { ...player, ownedStreamingPlatform: { ...platformOf(player), crisisSecurity: { ...platformOf(player).crisisSecurity, crises: [...platformOf(player).crisisSecurity.crises, crisis('chip-fix', 'APP_CRASH', 'The TV app keeps crashing'), crisis('chip-now', 'FEATURE_BROKEN', 'Downloads stopped working')] } } };
    player = executeIncidentRepair(player, { kind: 'INCIDENT_REPAIR', source: 'CRISIS', incidentId: 'chip-fix', option: 'FIX' }, ctx('TECHNOLOGY')).player;
    player = executeIncidentRepair(player, { kind: 'INCIDENT_REPAIR', source: 'CRISIS', incidentId: 'chip-now', option: 'ENERGY' }, ctx('TECHNOLOGY')).player;
    const status = text(renderToStaticMarkup(<PlatformDesk brand={brand} state={createCanonicalNetworkState(player)} onBack={() => undefined} initialTab="STATUS" statusBoard={getStreamingStatusBoard(player)} onRepairIncident={noop} />));
    assert.ok(status.includes(`Fix ordered by ${first(name('TECHNOLOGY'))}`) && status.includes(`Fixed by ${first(name('TECHNOLOGY'))}`));
    pass(`Platform › STATUS: "Fix ordered by ${first(name('TECHNOLOGY'))}" and, in the history, "Fixed by ${first(name('TECHNOLOGY'))}"`);

    /* ── Content › Localization: reached by Elena ── */
    const desk = getStreamingLocalizationDesk(player);
    const pick = desk.regions.find(region => region.open && (region.tracks.SUBTITLES.level < 3 || region.tracks.DUBBING.level < 3))!;
    const track = pick.tracks.SUBTITLES.level < 3 ? 'SUBTITLES' : 'DUBBING';
    const reached = executeLocalizationLevel(player, { kind: 'LOCALIZATION_LEVEL', regionId: pick.packageId, track, level: pick.tracks[track].level + 1 }, ctx('INTERNATIONAL'));
    assert.ok(reached.changed, reached.reason);
    player = reached.player;
    const languages = text(renderToStaticMarkup(<ContentDesk brand={brand} state={createCanonicalContentDeskState(player)} onBack={() => undefined} initialTab="LOCALIZATION"
        localizationDesk={getStreamingLocalizationDesk(player)} localizationActions={{ onOpenRegion: noop, onContribute: noop }} />));
    assert.ok(languages.includes(`reached by ${first(name('INTERNATIONAL'))}`));
    pass(`Content › Localization: "${pick.name} … reached by ${first(name('INTERNATIONAL'))}"`);

    /* ── the in-tray's buttons say what they do ── */
    const view = getStreamingTeamView(player);
    const card = (id: string, extra: Partial<OwnedStreamingTeamCard>): OwnedStreamingTeamCard => ({
        id, dedupeKey: id, seatId: 'CONTENT', jobId: 'ORIGINAL_PITCH', appointmentId: holders.get('CONTENT')!.id, createdAtAbsoluteWeek: weekOf(player),
        expiresAtAbsoluteWeek: weekOf(player) + 2, title: 'A card', detail: '', reason: '', cost: 0, energy: 0, action: { kind: 'OPEN_ROOM', room: 'NETWORK' },
        status: 'WAITING', resolvedAtAbsoluteWeek: null, ...extra,
    });
    const tray = [
        card('pitch', { title: '“Salt and Iron”', detail: 'Crime series, 8 episodes · a budget near $90M', action: { kind: 'ORIGINAL_PITCH', draft: {} } }),
        card('offer', { seatId: 'MONEY', jobId: 'OFFERS', action: { kind: 'OPEN_ROOM', room: 'OWNERSHIP' } }),
        card('price', { seatId: 'MONEY', jobId: 'PRICE_IDEAS', action: { kind: 'PRICE_CHANGE', planId: 'basic', monthly: 7.99 } }),
        card('language', { seatId: 'INTERNATIONAL', jobId: 'LANGUAGES', energy: 10, action: { kind: 'LOCALIZATION_LEVEL', regionId: 'INDIA_CORE', track: 'SUBTITLES', level: 1, energy: 10 } }),
        card('fix', { seatId: 'TECHNOLOGY', jobId: 'INCIDENTS', cost: 2_000_000, action: { kind: 'INCIDENT_REPAIR', source: 'CRISIS', incidentId: 'x', option: 'FIX' } }),
    ];
    const actions: BoardroomTeamActions = {
        setMode: () => undefined, setLimits: () => undefined, walkAway: () => undefined, hire: noop, train: noop, dismiss: () => undefined,
        approve: noop, decline: () => undefined, change: () => undefined, nameSuccessor: () => undefined,
    };
    const trayText = text(renderToStaticMarkup(<TeamSheets team={{ ...view, tray }} sheet={{ kind: 'TRAY' }} onClose={() => undefined} onOpen={() => undefined} actions={actions} />));
    for (const words of ['PITCH · ORIGINAL', '“Salt and Iron”', 'Take it to the desk', 'Pass', 'Open the term sheet', 'Set $7.99', 'Approve ⚡10', 'Approve $2M']) {
        assert.ok(trayText.includes(words), `the in-tray shows "${words}"`);
    }
    pass('the in-tray: a pitch on its cover page (Take it to the desk / Pass), "Open the term sheet", "Set $7.99", "Approve ⚡10", "Approve $2M"');

    console.log(`Team chips audit passed in ${Math.round((performance.now() - started) / 1000)} s.`);
}

main().catch(error => { console.error(error); process.exit(1); });
