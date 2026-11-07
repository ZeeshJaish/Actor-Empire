/**
 * #91 the Network tab's load test (codex-handoff/plans/platform-tech-plan.md §17.5). Reads the source:
 *  - the desk tries three nights on the network as it stands (this week, a big night, a surge), and on the drawing
 *    too when it differs (now → with your changes); a tap opens the night;
 *  - the night opens Build's own load rehearsal (the graph that climbs and falls) in a live mode: its own nights, the
 *    one tapped first, "LOAD TEST", "RUN THE NIGHT", "BACK TO THE NETWORK", and no founder override;
 *  - the night is weighed as the weekly close weighs it: viewers × their load (Optimisation), against capacity;
 *  - the HQ's nights: this week's peak, the biggest hour of 12 weeks (at least a third more), and a surge;
 *  - STATUS: a load incident (traffic spike, slow streaming, platform or regional outage) leads to the load test (its
 *    render, with and without the desk, is in audit:streaming-status-board);
 *  - the founding wizard keeps its rehearsal as it was (premiere night, the override, back to the build).
 * The flow itself (a night run, before → after on a drawing, 320–430 px) is checked in a live career:
 * codex-handoff/evidence/091/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);

const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
for (const [needle, why] of [
    ["{ id: 'LIKELY', name: 'This week'", 'this week'], ["{ id: 'QUIET', name: 'Big night'", 'a big night'], ["{ id: 'SURGE', name: 'Surge'", 'a surge'],
    ['<small><i aria-hidden="true" />LOAD TEST{drawnDiffers ? \' · YOUR CHANGES\' : \'\'}</small>', 'one card (#97 one row, #99 a level\'s card)'], ['`With your changes: ${moved.name}', 'before → after on a drawing'],
    ['after: drawnDiffers ? run(draft, night.id) : null', 'the drawing tried too'], ['onWatchNight?.(drawnDiffers ? draft : initialDraft, testLine.openOn)', 'a tap opens the test, on its worst night'],
] as const) has(desk, needle, why);
console.log('PASS desk: the three nights in one card (#97, #99), on what stands and on the drawing when it differs; a tap opens the test');

const experience = source('components/streaming-transplant/StreamingBuildWizardExperience.tsx');
has(experience, 'live={{ scenarios: STREAMING_NETWORK_NIGHTS, initialScenario: deskNight }}', 'the rehearsal in live mode, on the night tapped');
has(experience, 'demand: Math.round(service.peak * scenarioMultiplier * (inputs.viewerLoad ?? 1))', 'viewers × their load');
console.log('PASS Build: the night opens the rehearsal in live mode, weighed as viewers × their load');

const rehearsal = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
for (const [needle, why] of [
    ['live: liveMode }) => {', 'live mode'], ['const scenarios = liveMode?.scenarios || SCENARIOS;', 'its own nights'],
    ["useState<Scenario>(liveMode?.initialScenario || 'LIKELY')", 'the one tapped first'],
    ["{liveMode ? 'LOAD TEST' : 'LOAD REHEARSAL'}", 'load test'], ["{liveMode ? 'RUN THE NIGHT' : 'RUN THE REHEARSAL'}", 'run the night'],
    ["{liveMode ? 'BACK TO THE NETWORK' : 'BACK TO THE BUILD'}", 'back to the network'],
    ["{result.verdict !== 'HELD' && !liveMode && (", 'no founder override'],
    ["'Load over the night · viewers × their load (Optimisation)'", 'the graph in load'],
    ["{liveMode ? nightName.toUpperCase() : 'PREMIERE NIGHT'}", 'the night by name'],
] as const) has(rehearsal, needle, why);
console.log('PASS rehearsal: live mode with its own nights, the load graph, no override; the founding copy stays');

const hq = source('components/StreamingPlatformHQ.tsx');
has(hq, 'openingDemandForecast: { low: bigNight, likely, high: Math.round(likely * 1.9), byMarket }', 'the three nights');
has(hq, 'Math.round(likely * 1.35),', 'a big night is at least a third over this week');
has(hq, '...readPlatform.weeklyHistory.slice(-12).map(week => Math.round((week.operations?.peakConcurrentStreams ?? 0)', 'or the biggest hour of 12 weeks');
has(hq, 'viewerLoad: latest?.viewerLoad && latest.viewerLoad > 0 ? latest.viewerLoad : 1,', 'this week\'s viewer load');
console.log('PASS HQ: this week, the biggest hour of 12 weeks (a third more at least), a surge; this week\'s viewer load');

const status = source('components/streaming-transplant/PlatformStatus.tsx');
has(status, "const LOAD_INCIDENT_KINDS = new Set(['Traffic spike', 'Slow streaming', 'Platform outage', 'Regional outage']);", 'load incidents');
has(status, 'LOAD_INCIDENT_KINDS.has(incident.kind)', 'by kind');
has(status, 'Test the load on Network ›', 'the link');
const network = source('components/streaming-transplant/StreamingNetworkExperience.tsx');
has(network, "onTestLoad={networkDesk ? () => setTab('CAPACITY') : undefined}", 'to the Network tab, when it has the desk');
const board = source('services/streamingStatusBoard.ts');
for (const kind of ['Traffic spike', 'Slow streaming', 'Platform outage', 'Regional outage']) has(board, `'${kind}'`, `${kind} is a kind the board names`);
console.log('PASS STATUS: a load incident leads to the load test on the Network tab');

console.log('done');
