/** STATUS as the health board, with one incident list, Phase 3 #49 (codex-handoff/plans/
 *  platform-tech-plan.md §7: "STATUS is the health board of everything running: servers by
 *  region and provider; each tech that is live; products. Each shows working, slow or down."
 *  "One incident list. Crises and infrastructure incidents are shown together, and both reach
 *  the HQ alert."). On the full test company, with incidents put into its save, it checks:
 *  - a server incident nobody answered: first in the list, its damage as the weekly close charges
 *    it, video delivery and its region down, the HQ alert; repairing: slow, weeks left, less damage;
 *  - a platform outage takes delivery, accounts and launched products down; a backlash slows
 *    recommendations; resolved incidents from both systems in one history, newest first;
 *  - a site behind on maintenance is slow; Picture is slow or down when the network delivers less
 *    than the plans sell; Stabilization is slow under heavy debt;
 *  - the Platform room's STATUS renders the board, and without one the prototype's page. */
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
    INITIAL_PLAYER, type OwnedStreamingCrisis, type OwnedStreamingInfrastructureIncident, type OwnedStreamingPlatformState, type Player,
} from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { getStreamingServerSite } from '../services/streamingServerSites';
import { getStreamingIncidentAlert, getStreamingStatusBoard } from '../services/streamingStatusBoard';
import { createCanonicalNetworkState } from '../components/streaming-transplant/createCanonicalStreamingPresentation';
import { PlatformDesk } from '../components/streaming-transplant/StreamingNetworkExperience';
import type { Brand } from '../components/streaming-transplant/StreamingBrandVisuals';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Status Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const brand: Brand = {
    name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE',
    publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL',
    lockupId: 'WORDMARK', serverCity: null,
};

async function main() {
    const started = performance.now();
    const qa = await buildStreamingFullPlatformQa(fresh('status-board-qa'), { processWeek: processGameWeek, persistWeek: async next => next });
    console.log(`test company built in ${Math.round((performance.now() - started) / 1000)} s`);
    const week = getAbsoluteWeek(qa.age, qa.currentWeek);
    const base = normalizeOwnedStreamingPlatformState(qa.ownedStreamingPlatform, qa.id);
    /* a clean slate: no incidents in either system, the night at 48% load */
    const clean: OwnedStreamingPlatformState = {
        ...base,
        crisisSecurity: { ...base.crisisSecurity, crises: [], infrastructureOperations: { ...base.crisisSecurity.infrastructureOperations, incidents: [] } },
        weeklyHistory: base.weeklyHistory.map((snapshot, index) => (index === base.weeklyHistory.length - 1 && snapshot.operations
            ? { ...snapshot, operations: { ...snapshot.operations, capacityUtilizationPercent: 48 } } : snapshot)),
        metrics: { ...base.metrics, technologyHealth: 90 },
    };
    const playerWith = (platform: OwnedStreamingPlatformState): Player => ({ ...qa, ownedStreamingPlatform: platform });
    const facilities = clean.infrastructureSetup?.facilities || [];
    assert.ok(facilities.length > 0, 'The test company has servers');

    /* ── the board with nothing wrong ── */
    const timer = performance.now();
    const calm = getStreamingStatusBoard(playerWith(clean));
    const boardMs = Math.round(performance.now() - timer);
    assert.deepEqual([calm.overall, calm.headline, calm.open.length, calm.history.length], ['WORKING', 'All systems working', 0, 0]);
    const servers = calm.sections.find(section => section.id === 'SERVERS')!;
    const tech = calm.sections.find(section => section.id === 'TECH')!;
    assert.equal(servers.rows.reduce((sum, row) => sum + (row.cities?.length ?? 0), 0), new Set(facilities.map(item => item.cityId)).size,
        'Every city is in its region, a line a city (#101; it counted sites)');
    assert.ok(servers.rows.every(row => row.status === 'WORKING'), 'All regions working');
    assert.deepEqual(tech.rows.map(row => row.label), ['Picture', 'HDR', 'Colour', 'Sound', 'Optimisation', 'Stabilization', 'Playback', 'Apps and devices', 'Trust and safety', 'Smart AI', 'Profiles and family', 'Ads tech'].filter(name => tech.rows.some(row => row.label === name)),
        'Tech rows in the tree\'s order');
    // #52: the phone app every service has, and Playback on the standard player with the Downloads the test company was given
    assert.deepEqual(['Playback', 'Apps and devices'].map(name => tech.rows.find(row => row.label === name)?.detail),
        ['Standard player, plus Downloads', 'Phone and web apps · Basic']);
    console.log(`PASS calm: ${servers.rows.map(row => `${row.label} (${row.detail})`).join(' · ')}; tech ${tech.rows.map(row => `${row.label} ${row.detail}`).join(' · ')}; the board reads in ${boardMs} ms`);

    /* ── a server incident nobody has answered ── */
    const site = facilities[0];
    const siteRegion = getStreamingServerSite(site.cityId)!.regionId;
    const spike: OwnedStreamingInfrastructureIncident = {
        id: 'audit-spike', idempotencyKey: 'audit-spike', type: 'TRAFFIC_SPIKE', severity: 'MAJOR', stage: 'DETECTED',
        title: 'Premiere traffic overwhelmed a site', detail: 'Viewers in the region are buffering.', cause: 'Peak demand beyond the site.',
        facilityId: site.id, cityId: site.cityId, detectedAtAbsoluteWeek: week - 1, affectedSubscribers: 640_000,
        capacityLossPercent: 34, conditionLossPercent: 6, responseAction: null, rerouteFacilityId: null, compensation: null,
        insuranceClaimed: false, responseCost: 0, insuranceRecovery: 0, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: null,
        assistedHandled: false, publicReaction: '', subscriberReaction: '', outcomeNote: null,
    };
    const withIncident = (incidents: OwnedStreamingInfrastructureIncident[], crises: OwnedStreamingCrisis[] = []): OwnedStreamingPlatformState => ({
        ...clean,
        crisisSecurity: { ...clean.crisisSecurity, crises, infrastructureOperations: { ...clean.crisisSecurity.infrastructureOperations, incidents } },
    });
    const open = getStreamingStatusBoard(playerWith(withIncident([spike])));
    const card = open.open[0];
    assert.deepEqual([card.id, card.kind, card.stage, card.major, card.weeks, card.affectedViewers], ['audit-spike', 'Traffic spike', 'OPEN', true, 1, 640_000]);
    assert.equal(card.where?.split(' · ')[0], getStreamingServerSite(site.cityId)!.name, 'Where: the site\'s city, by name');
    /* what it does to viewers first (#51: its reach × a traffic spike's harm), then the engines' own */
    assert.match(card.damage[0], /^Viewing −\d+\.\d%$/);
    assert.match(card.damage[1], /^Churn \+\d+\.\d\d% a week$/);
    assert.deepEqual(card.damage.slice(2), ['Playback −2.2 points', 'Capacity −34%', 'Tech health −3.5 a week'],
        'Its damage, as the weekly close charges a major server incident (−1.4 × 1.55 playback, the capacity it took, the tech-health charge)');
    assert.deepEqual([open.overall, open.service.DELIVERY, open.service.ACCOUNTS], ['DOWN', 'DOWN', 'DOWN'], 'A third of a site\'s capacity gone, unanswered: delivery down');
    const downRegion = open.sections[0].rows.find(row => row.id === `SERVER:${siteRegion}`)!;
    assert.deepEqual([downRegion.status, downRegion.incidentId], ['DOWN', 'audit-spike']);
    assert.match(downRegion.reason!, /traffic spike, 34% of capacity lost/);
    assert.match(open.headline, /^Traffic spike in /);
    assert.equal(createCanonicalNetworkState(playerWith(withIncident([spike]))).components.find(comp => comp.id === 'DELIVERY')!.status, 'outage',
        'The Video delivery strip reads the server incident (before #49 it only read crises)');
    assert.deepEqual(getStreamingIncidentAlert(withIncident([spike])), {
        count: 1, first: { id: 'audit-spike', title: spike.title, kind: 'Traffic spike', severity: 'MAJOR', major: true, stage: 'OPEN', waiting: false },
    }, 'The HQ alert counts it (it counted crises only)');
    console.log(`PASS open: "${open.headline}", ${card.damage.join(', ')}; ${downRegion.label} down: ${downRegion.reason}; HQ alert 1`);

    /* ── the same incident with a response under way ── */
    const repairing = { ...spike, stage: 'RECOVERING' as const, responseAction: 'FAILOVER_BACKUP' as const, recoveryReadyAtAbsoluteWeek: week + 3 };
    const fixing = getStreamingStatusBoard(playerWith(withIncident([repairing])));
    const fixingCard = fixing.open[0];
    assert.deepEqual([fixingCard.stage, fixingCard.weeksLeft, fixingCard.damage.slice(2)], ['REPAIRING', 3,
        ['Playback −1.0 points', 'Capacity −12%', 'Tech health −3.5 a week', 'Recovery $496K a week']],
        'Repairing: the failover takes back 65% of the loss and the harm is about half; the repair costs $320K × 1.55 a week');
    assert.deepEqual([fixing.service.DELIVERY, fixing.sections[0].rows.find(row => row.id === `SERVER:${siteRegion}`)!.status, fixing.overall], ['SLOW', 'SLOW', 'SLOW']);
    assert.equal(getStreamingIncidentAlert(withIncident([repairing])).first?.stage, 'REPAIRING');
    console.log(`PASS repairing: ${fixingCard.weeksLeft} weeks left, ${fixingCard.damage.join(', ')}; delivery and the region slow`);

    /* ── crises in the same list; one history for both systems ── */
    const crisis = (id: string, type: OwnedStreamingCrisis['type'], stage: OwnedStreamingCrisis['stage'], detected: number, resolved: number | null): OwnedStreamingCrisis => ({
        id, idempotencyKey: id, type, severity: 'SERIOUS', stage, title: `Audit ${type.toLowerCase()}`, detail: 'Audit crisis.', cause: 'Audit.',
        detectedAtAbsoluteWeek: detected, affectedSubscribers: 120_000, estimatedRevenueAtRisk: 0, responseDoctrine: null, compensation: null,
        communication: null, responseCost: 0, weeklyRecoveryCost: 650_000, recoveryReadyAtAbsoluteWeek: null, resolvedAtAbsoluteWeek: resolved,
        outcomeNote: resolved !== null ? 'Recovered.' : null,
    });
    const outage = getStreamingStatusBoard(playerWith(withIncident([], [crisis('audit-outage', 'PLATFORM_OUTAGE', 'DETECTED', week, null)])));
    assert.deepEqual([outage.service.DELIVERY, outage.service.ACCOUNTS, outage.service.RECOMMENDATIONS, outage.overall], ['DOWN', 'DOWN', 'DOWN', 'DOWN'],
        'A platform outage turns the page red, as the status page always has');
    assert.deepEqual(outage.open[0].damage.slice(2), ['Playback −2.2 points', 'Tech health −2 a week'], 'A serious outage: −2.2 playback, −2 tech health');
    assert.match(outage.open[0].damage[0], /^Viewing −/, 'and what it does to viewers (#51)');
    const backlash = getStreamingStatusBoard(playerWith(withIncident([], [crisis('audit-backlash', 'RECOMMENDATION_BACKLASH', 'DETECTED', week, null)])));
    assert.deepEqual([backlash.service.DELIVERY, backlash.service.RECOMMENDATIONS, backlash.overall], ['WORKING', 'SLOW', 'SLOW']);
    const resolvedSpike = { ...spike, id: 'audit-old-spike', stage: 'RESOLVED' as const, detectedAtAbsoluteWeek: week - 20, resolvedAtAbsoluteWeek: week - 17, outcomeNote: 'Failover held.' };
    const history = getStreamingStatusBoard(playerWith(withIncident([resolvedSpike], [crisis('audit-old-leak', 'CONTENT_LEAK', 'RESOLVED', week - 9, week - 5)]))).history;
    assert.deepEqual(history.map(item => [item.id, item.source, item.weeks]), [['audit-old-leak', 'CRISIS', 4], ['audit-old-spike', 'INFRASTRUCTURE', 3]],
        'One history, newest first: the leak (resolved 5 weeks ago, in 4), then the spike (17 weeks ago, in 3)');
    console.log('PASS both systems: an outage takes delivery, accounts and the rest down; a backlash slows recommendations; one history, newest first');

    /* ── #101 lines (Zeesh: "city wise … ek line server ka … server yellow kahin gir raha to samajh aa jayega"): a
       city's last 30 weeks from the incidents kept, down until a repair began and slow while it ran; its region the
       worst of its cities; grey before an order opened it; tech groups alike ── */
    const cityRow = (board: typeof calm) => board.sections[0].rows.flatMap(row => row.cities ?? []).find(row => row.id === `CITY:${site.cityId}`)!;
    const regionRow = (board: typeof calm) => board.sections[0].rows.find(row => row.id === `SERVER:${siteRegion}`)!;
    /* #102 (Zeesh asked why the lines began grey): from the launch while the service is younger than 30 weeks, as the
       test company is */
    const launched = clean.launchCommit!.committedAtAbsoluteWeek;
    const span = week - launched + 1;
    const ago = (weeks: number) => span - 1 - weeks;
    assert.ok(span < 30, `The test company launched ${week - launched} weeks ago: its lines start at the launch`);
    assert.deepEqual([cityRow(calm).history!.length, calm.lineFromLaunch], [span, true], 'A week a bar since the launch (#102; it was 30, grey before the launch)');
    assert.ok(cityRow(calm).history!.every(day => day === 'WORKING'), 'A calm city: working every week since the launch, no grey');
    const liveSpike = { ...resolvedSpike, id: 'audit-live-spike', detectedAtAbsoluteWeek: week - 12, resolvedAtAbsoluteWeek: week - 9 };
    const pastLine = cityRow(getStreamingStatusBoard(playerWith(withIncident([liveSpike])))).history!;
    assert.deepEqual([12, 11, 10, 9].map(weeks => pastLine[ago(weeks)]), ['DOWN', 'DOWN', 'DOWN', 'WORKING'],
        'A spike found 12 weeks ago and ended 9 weeks ago, nobody answering: down 12, 11 and 10 weeks ago');
    const fixedLine = cityRow(getStreamingStatusBoard(playerWith(withIncident([{ ...liveSpike, statusRepair: { path: 'FIX', atAbsoluteWeek: week - 11, cash: 2_000_000, energy: 0 } }])))).history!;
    assert.deepEqual([12, 11, 10].map(weeks => fixedLine[ago(weeks)]), ['DOWN', 'SLOW', 'SLOW'], 'Fixed from 11 weeks ago: slow from then');
    const nowBoard = getStreamingStatusBoard(playerWith(withIncident([spike])));
    assert.deepEqual([cityRow(nowBoard).history!.at(-2), cityRow(nowBoard).history!.at(-1), cityRow(nowBoard).status], ['DOWN', 'DOWN', 'DOWN'], 'An open spike: last week and now');
    assert.deepEqual([regionRow(nowBoard).history!.at(-2), regionRow(nowBoard).history!.at(-1)], ['DOWN', 'DOWN'], 'Its region\'s line: the worst of its cities');
    const ordered = getStreamingStatusBoard(playerWith({
        ...clean,
        networkOrders: [{
            id: 'audit-order', regionId: siteRegion, status: 'DONE', racksDelta: { SCOUT: 0, WORKHORSE: 1, TITAN: 0 }, cloudDelta: 0, newRoomIds: [], newCityIds: [site.cityId],
            capitalCost: 0, refund: 0, buildWeeks: 3, orderedAtAbsoluteWeek: week - 8, readyAtAbsoluteWeek: week - 5, completedAtAbsoluteWeek: week - 5,
        } as never],
    }));
    assert.deepEqual([cityRow(ordered).history![ago(6)], cityRow(ordered).history![ago(5)]], ['NONE', 'WORKING'], 'A city an order opened 5 weeks ago: grey before');
    const crashed = getStreamingStatusBoard(playerWith(withIncident([], [{ ...crisis('audit-crash', 'APP_CRASH', 'RESOLVED', week - 8, week - 5), severity: 'MAJOR' }])));
    const appsLine = crashed.sections[1].rows.find(row => row.id === 'TECH:APPS')!.history!;
    assert.deepEqual([8, 7, 6, 5].map(weeks => appsLine[ago(weeks)]), ['DOWN', 'DOWN', 'DOWN', 'WORKING'], 'An app crash nobody fixed: Apps down for its weeks');
    const brokeLine = getStreamingStatusBoard(playerWith(withIncident([], [crisis('audit-broken', 'FEATURE_BROKEN', 'RESOLVED', week - 6, week - 4)])))
        .sections[1].rows.find(row => row.id === 'TECH:PLAYBACK')!.history!;
    assert.deepEqual([6, 5, 4].map(weeks => brokeLine[ago(weeks)]), ['SLOW', 'SLOW', 'WORKING'], 'A broken feature: Playback slow');
    assert.ok(calm.sections[1].rows.every(row => row.history?.length === span), 'Every tech group has its line');
    console.log(`PASS lines: ${cityRow(calm).label} ${span} weeks, from the launch; a past spike down 3 weeks, slow once fixed; open now down with its region; grey before an order; Apps down for a crash, Playback slow for a broken feature`);

    /* ── #102 (Zeesh: "tech ka ek pura row ho jaye simple single … same goes with servers, ek single row ho"; "service bhi
       launch se shuru karo"; "zyada se zyada ek saal ka incident"): the servers and the tech a line each, the worst of
       their rows each week; the strips from the launch; the last year's incidents ── */
    const serversLine = (board: typeof calm) => board.sections[0].overview!;
    const techLine = (board: typeof calm) => board.sections[1].overview!;
    const cityTotal = new Set(facilities.map(item => item.cityId)).size;
    assert.deepEqual([serversLine(calm).label, serversLine(calm).status, serversLine(calm).reason, serversLine(calm).history.length],
        [`All ${cityTotal} cities working`, 'WORKING', undefined, span], 'Calm servers: one line, every city working');
    assert.deepEqual([techLine(calm).label, techLine(calm).status, techLine(calm).history.length], [`All ${tech.rows.length} working`, 'WORKING', span], 'Calm tech: one line');
    assert.deepEqual([serversLine(nowBoard).label, serversLine(nowBoard).status, serversLine(nowBoard).history.at(-1)], ['1 city down', 'DOWN', 'DOWN'], 'A spike: one city down, red now');
    assert.match(serversLine(nowBoard).reason!, /: traffic spike, 34% of capacity lost$/, 'and why');
    const pastServers = serversLine(getStreamingStatusBoard(playerWith(withIncident([liveSpike])))).history;
    assert.deepEqual([12, 11, 10, 9].map(weeks => pastServers[ago(weeks)]), ['DOWN', 'DOWN', 'DOWN', 'WORKING'], 'The servers\' line: the worst city each week');
    const crashOpen = getStreamingStatusBoard(playerWith(withIncident([], [{ ...crisis('audit-crash-now', 'APP_CRASH', 'DETECTED', week, null), severity: 'MAJOR' }])));
    assert.deepEqual([techLine(crashOpen).label, techLine(crashOpen).status, techLine(crashOpen).reason], ['Apps and devices down', 'DOWN', 'Audit app_crash'],
        'An app crash now: the tech line names the group, and why');
    assert.deepEqual([8, 7, 6, 5].map(weeks => techLine(crashed).history[ago(weeks)]), ['DOWN', 'DOWN', 'DOWN', 'WORKING'], 'The tech line: the worst group each week');
    const strips = createCanonicalNetworkState(playerWith(clean)).components;
    assert.ok(strips.every(comp => comp.history.length === span && comp.fromLaunch), 'Every strip a bar a week since the launch (the weeks before were green)');
    const yearOld = (id: string, resolvedAgo: number) => ({ ...resolvedSpike, id, detectedAtAbsoluteWeek: week - resolvedAgo - 2, resolvedAtAbsoluteWeek: week - resolvedAgo });
    assert.deepEqual(getStreamingStatusBoard(playerWith(withIncident([yearOld('audit-51', 51), yearOld('audit-52', 52)]))).history.map(item => item.id), ['audit-51'],
        'The history: the last 12 months (resolved 51 weeks ago, in; 52, out)');
    console.log(`PASS one line: "${serversLine(calm).label}" / "${serversLine(nowBoard).label}: ${serversLine(nowBoard).reason}"; "${techLine(calm).label}" / "${techLine(crashOpen).label}"; strips ${span} weeks from the launch; a year of history`);

    /* ── slow without an incident ── */
    const worn = { ...site, physical: { ...site.physical!, maintenanceConditionPercent: 50 } };
    const wornBoard = getStreamingStatusBoard(playerWith({ ...clean, infrastructureSetup: { ...clean.infrastructureSetup!, facilities: facilities.map(item => (item.id === site.id ? worn : item)) } }));
    const wornRow = wornBoard.sections[0].rows.find(row => row.id === `SERVER:${siteRegion}`)!;
    assert.equal(wornRow.status, 'SLOW');
    assert.match(wornRow.reason!, /50% condition, maintenance has fallen behind/);
    const busy = (load: number, health: number): OwnedStreamingPlatformState => ({
        ...clean,
        metrics: { ...clean.metrics, technologyHealth: health },
        weeklyHistory: clean.weeklyHistory.map((snapshot, index) => (index === clean.weeklyHistory.length - 1 && snapshot.operations
            ? { ...snapshot, operations: { ...snapshot.operations, capacityUtilizationPercent: load } } : snapshot)),
    });
    const sold = calm.sections[1].rows.find(row => row.label === 'Picture')!.detail.split(' · ')[0];
    const peak = getStreamingStatusBoard(playerWith(busy(88, 90))).sections[1].rows.find(row => row.label === 'Picture')!;
    assert.equal(peak.status, 'SLOW');
    assert.match(peak.reason!, /^Plans sell (4K|8K|12K|16K|24K); viewers get 1080p \(peak load 88%\)$/, 'At 88% load the network holds a 4K-or-better offer to 1080p');
    const weak = getStreamingStatusBoard(playerWith(busy(40, 40))).sections[1].rows.find(row => row.label === 'Picture')!;
    assert.deepEqual([weak.status, weak.reason?.endsWith('viewers get 480p (tech health 40)')], ['DOWN', true]);
    const indebted = getStreamingStatusBoard(playerWith({ ...clean, infrastructureSetup: { ...clean.infrastructureSetup!, technicalDebt: 70 } }))
        .sections[1].rows.find(row => row.label === 'Stabilization')!;
    assert.equal(indebted.status, 'SLOW');
    console.log(`PASS slow: a site at 50% condition; Picture (${sold} owned) "${peak.reason}" at 88% load and 480p at tech health 40; Stabilization under debt`);

    /* ── the Platform room's STATUS ── */
    const page = renderToStaticMarkup(createElement(PlatformDesk, {
        brand, state: createCanonicalNetworkState(playerWith(withIncident([spike]))), onBack: () => undefined, initialTab: 'STATUS',
        statusBoard: open, onRespondToIncident: () => undefined,
    }));
    assert.match(page, /Open incidents[\s\S]*Premiere traffic overwhelmed a site[\s\S]*Capacity −34%[\s\S]*Respond ›/);
    assert.match(page, /Service[\s\S]*Video delivery[\s\S]*Servers[\s\S]*Tech[\s\S]*Coverage[\s\S]*Incident history/);
    /* #126: products are coming in a future update, so the Products group shows only once a save runs one */
    assert.doesNotMatch(page, /<h2>Products<\/h2>/, 'No Products group while no product runs (#126)');
    /* #101/#102: the servers a line that opens itself in trouble, its troubled region saying why; the tech a line; every
       line from the launch; the last year's incidents */
    assert.match(page, new RegExp(`Servers[\\s\\S]*aria-expanded="true"[\\s\\S]*1 city down[\\s\\S]*Launch[\\s\\S]*${getStreamingServerSite(site.cityId)!.name}: traffic spike[\\s\\S]*Tech[\\s\\S]*All \\d+ working`));
    assert.doesNotMatch(page, /weeks ago|wks ago/, 'Nothing drawn before the launch (#102)');
    assert.match(page, /Incident history[\s\S]*last 12 months[\s\S]*No incidents in the last 12 months\./);
    assert.doesNotMatch(page, /Viewers in the region are buffering/, 'An open incident has no paragraph (#101)');
    const prototype = renderToStaticMarkup(createElement(PlatformDesk, {
        brand, state: createCanonicalNetworkState(playerWith(withIncident([spike]))), onBack: () => undefined, initialTab: 'STATUS',
    }));
    assert.match(prototype, /Components[\s\S]*Incident history/);
    assert.doesNotMatch(prototype, /Open incidents|Respond ›/, 'Without a board (the prototype) the page is as it was');
    console.log('PASS page: open incidents, service, servers, tech, products, coverage, history; the prototype\'s page without a board');

    /* #91: a load incident leads to the Network tab's load test, when the tab has the live desk */
    const statusPage = (board: typeof open, desk: boolean) => renderToStaticMarkup(createElement(PlatformDesk, {
        brand, state: createCanonicalNetworkState(playerWith(withIncident([spike]))), onBack: () => undefined, initialTab: 'STATUS',
        statusBoard: board, onRespondToIncident: () => undefined, ...(desk ? { networkDesk: createElement('div', null, 'desk') } : {}),
    }));
    assert.match(statusPage(open, true), /Premiere traffic overwhelmed a site[\s\S]*Test the load on Network ›/, 'A traffic spike leads to the load test');
    assert.doesNotMatch(statusPage(open, false), /Test the load/, 'Before launch (no desk) there is no load test to go to');
    const power = getStreamingStatusBoard(playerWith(withIncident([{ ...spike, type: 'POWER_FAILURE' }])));
    assert.equal(power.open[0].kind, 'Power failure');
    assert.doesNotMatch(statusPage(power, true), /Test the load/, 'A power failure is not the network\'s load');
    console.log('PASS load test link: a traffic spike leads to Network\'s load test; none before launch or for a power failure');
    console.log(`done in ${Math.round((performance.now() - started) / 1000)} s`);
}

main().catch(error => { console.error(error); process.exit(1); });
