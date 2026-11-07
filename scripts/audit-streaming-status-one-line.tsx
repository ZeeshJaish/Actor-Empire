/**
 * #102 STATUS, a line a section (Zeesh, 2026-11-01, Hindi, voice: "tech ka ek pura row ho jaye simple single … same
 * goes with servers, ek single row ho"; "zyada se zyada ek saal ka incident"; then, asked why the lines began grey:
 * "haan teeno bana do, service bhi launch se shuru karo"):
 *  - every line from the launch while the service is younger than 30 weeks (streamingStatusLineWeeks): the board's, and
 *    the service strips', each bar its own week's close; "Launch" under the first bar, "since launch" over the strips;
 *  - the servers and the tech a line each, the worst of their rows each week ("All 12 cities working", "1 city down ·
 *    1 slow", "Apps and devices down · 1 more"); closed while all is well, a tap opens the rows (a region opens to its
 *    cities); in trouble it opens itself, each troubled row saying why, and closed it says why under the line;
 *  - the incident history: the last 12 months, a line each (what, where, the week, how long), the first five, then
 *    "Show all N"; a tap tells what happened.
 * Renders the page from made-up boards (no save); the rules on the full test company are in
 * audit:streaming-status-board, the screens (320–430 px) in codex-handoff/evidence/102/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { PlatformStatus } from '../components/streaming-transplant/PlatformStatus';
import type { NetworkState } from '../components/streaming-transplant/StreamingNetworkExperience';
import {
    STREAMING_STATUS_HISTORY_WEEKS, streamingStatusLineWeeks,
    type StreamingStatusBoard, type StreamingStatusDay, type StreamingStatusIncident, type StreamingStatusRow, type StreamingStatusSection,
} from '../services/streamingStatusBoard';

/* ── the weeks a line shows ── */
const weeks = (now: number, launch: number | null) => {
    const span = streamingStatusLineWeeks(now, launch);
    return [span.length, span[0], span.at(-1)];
};
assert.deepEqual(weeks(765, 743), [23, 743, 765], 'Launched 22 weeks ago: 23 weeks, the launch\'s own the first (it was 30, the first 7 grey)');
assert.deepEqual(weeks(765, 736), [30, 736, 765], 'Launched 29 weeks ago: the full 30');
assert.deepEqual(weeks(765, 700), [30, 736, 765], 'Older: the last 30');
assert.deepEqual(weeks(765, null), [30, 736, 765], 'No launch on record (an older save): the last 30, as before');
assert.deepEqual(weeks(765, 765), [1, 765, 765], 'Launched this week: one bar');
assert.equal(STREAMING_STATUS_HISTORY_WEEKS, 52, 'The history goes back a year');
console.log('PASS weeks: from the launch while younger than 30 weeks (23 for one launched 22 weeks ago), else the last 30');

/* ── made-up boards ── */
const line = (length: number, marks: Record<number, StreamingStatusDay> = {}, from = 0): StreamingStatusDay[] => (
    Array.from({ length }, (_, n) => (n < from ? 'NONE' : marks[n] ?? 'WORKING'))
);
const row = (id: string, label: string, status: StreamingStatusRow['status'], history: StreamingStatusDay[], extra: Partial<StreamingStatusRow> = {}): StreamingStatusRow => ({
    id, label, detail: '', status, history, ...extra,
});
const past = (n: number): StreamingStatusIncident => ({
    id: `past-${n}`, source: 'CRISIS', title: `Past title ${n}`, kind: `Kind ${n}`, where: n === 1 ? 'Mumbai · Atlas Compute' : null,
    severity: n === 1 ? 'MAJOR' : 'MINOR', major: n === 1, stage: 'RESOLVED', openedAtWeek: 760 - n * 3, weeks: n === 2 ? 0 : 2,
    readyAtWeek: null, weeksLeft: null, resolvedAtWeek: 762 - n * 3, affectedViewers: 0, damage: [], cause: '', note: `What came of ${n}.`,
    hits: [], region: null, repairPath: null, weeksToRunItsCourse: null,
});
const section = (id: StreamingStatusSection['id'], title: string, rows: StreamingStatusRow[], label: string, status: StreamingStatusRow['status'], reason?: string): StreamingStatusSection => ({
    id, title, rows, empty: '',
    overview: { label, status: status === 'OFF' ? 'WORKING' : status, ...(reason ? { reason } : {}), history: rows[0].history! },
});
const state = (fromLaunch: boolean, length: number): NetworkState => ({
    live: true,
    components: ['DELIVERY', 'ACCOUNTS', 'RECOMMENDATIONS', 'RIGHTS'].map(id => ({
        id, name: id, status: 'operational' as const, uptime: 99.9, history: Array.from({ length }, () => 0), fromLaunch,
    })),
    cities: [], tech: [], products: [], incidents: [], peakLoad: 40, headroom: '', technicalDebt: 0,
});
const board = (sections: StreamingStatusSection[], history: StreamingStatusIncident[], lineFromLaunch: boolean): StreamingStatusBoard => ({
    live: true, overall: 'WORKING', headline: 'All systems working', line: 'Subscribers are watching normally', open: [],
    service: { DELIVERY: 'WORKING', ACCOUNTS: 'WORKING', RECOMMENDATIONS: 'WORKING', RIGHTS: 'WORKING' }, sections, lineFromLaunch, history,
});
const render = (value: StreamingStatusBoard, network: NetworkState) => renderToStaticMarkup(createElement(PlatformStatus, { state: network, board: value }));

/* a young service with nothing wrong: closed lines from the launch, five of seven past incidents */
const young = line(23);
const calmPage = render(board([
    section('SERVERS', 'Servers', [row('SERVER:NORTH_AMERICA', 'North America', 'WORKING', young, {
        cities: [row('CITY:ASHBURN', 'Ashburn', 'WORKING', young), row('CITY:SEATTLE', 'Seattle', 'WORKING', line(23, {}, 14))],
    })], 'All 12 cities working', 'WORKING'),
    section('TECH', 'Tech', [row('TECH:PICTURE', 'Picture', 'WORKING', young)], 'All 7 working', 'WORKING'),
], [1, 2, 3, 4, 5, 6, 7].map(past), true), state(true, 23));
assert.match(calmPage, /Service[\s\S]*since launch[\s\S]*Launch[\s\S]*this week/, 'The service strips from the launch, "since launch" over them');
assert.match(calmPage, /Servers[\s\S]*aria-expanded="false"[\s\S]*All 12 cities working[\s\S]*Launch[\s\S]*Tech[\s\S]*aria-expanded="false"[\s\S]*All 7 working/,
    'The servers and the tech: a line each, closed while all is well, "Launch" under the first bar');
assert.doesNotMatch(calmPage, /North America|Ashburn|not running yet|weeks ago/, 'Closed: no region, no city, no grey to explain, nothing before the launch');
assert.match(calmPage, /Incident history[\s\S]*last 12 months[\s\S]*Kind 1 · Mumbai[\s\S]*WK 757 · 2 wks[\s\S]*Kind 2[\s\S]*WK 754<[\s\S]*Kind 5[\s\S]*Show all 7 ›/,
    'The history: a line each (what, where, the week, how long; nothing when it ended the week it began), the first five, then "Show all 7"');
assert.doesNotMatch(calmPage, /Kind 6|Kind 7|Past title|What came of/, 'The rest on a tap; what happened on a tap');
console.log('PASS calm: service "since launch"; servers and tech a closed line each from the launch; five of seven past incidents, a line each');

/* in trouble: the servers open themselves, the troubled region says why; the tech opens to its groups */
const troubled = render(board([
    section('SERVERS', 'Servers', [
        row('SERVER:NORTH_AMERICA', 'North America', 'DOWN', line(30, { 29: 'DOWN' }), {
            reason: 'Ashburn: traffic spike, 34% of capacity lost',
            cities: [row('CITY:ASHBURN', 'Ashburn', 'DOWN', line(30, { 29: 'DOWN' }), { reason: 'Ashburn: traffic spike, 34% of capacity lost' })],
        }),
        row('SERVER:EUROPE', 'Europe', 'WORKING', line(30), { cities: [row('CITY:LONDON', 'London', 'WORKING', line(30))] }),
    ], '1 city down', 'DOWN', 'Ashburn: traffic spike, 34% of capacity lost'),
    section('TECH', 'Tech', [
        row('TECH:APPS', 'Apps and devices', 'DOWN', line(30, { 29: 'DOWN' }), { reason: 'The Smart TV app keeps crashing' }),
        row('TECH:PICTURE', 'Picture', 'SLOW', line(30, { 29: 'SLOW' }), { reason: 'Plans sell 8K; viewers get 1080p (peak load 88%)' }),
        row('TECH:SMART_AI', 'Smart AI', 'WORKING', line(30, {}, 20)),
    ], 'Apps and devices down · 1 more', 'DOWN', 'The Smart TV app keeps crashing'),
], [], false), state(false, 30));
assert.match(troubled, /Servers[\s\S]*aria-expanded="true"[\s\S]*1 city down[\s\S]*30 weeks ago[\s\S]*North America[\s\S]*Ashburn: traffic spike, 34% of capacity lost[\s\S]*Europe/,
    'Servers in trouble: open, its regions, the troubled one saying why');
assert.doesNotMatch(troubled, /London/, 'A region opens to its cities on a tap');
assert.match(troubled, /Tech[\s\S]*aria-expanded="true"[\s\S]*Apps and devices down · 1 more[\s\S]*not running yet[\s\S]*Apps and devices[\s\S]*The Smart TV app keeps crashing[\s\S]*Picture[\s\S]*Plans sell 8K[\s\S]*Smart AI/,
    'Tech in trouble: open, every group a line, the troubled saying why; grey explained when a line has it');
assert.match(troubled, /Incident history[\s\S]*No incidents in the last 12 months\./);
console.log('PASS trouble: servers and tech open themselves, the troubled rows say why, a region\'s cities wait for a tap');

/* ── the source: the board, the strips, the page, the look ── */
const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);
const statusBoard = source('services/streamingStatusBoard.ts');
for (const [needle, why] of [
    ['const lineWeeks = streamingStatusLineWeeks(absoluteWeek, launchedAt);', 'the board\'s lines from the launch'],
    ['history: worstDay(serverRows.map(row => row.history ?? [])),', 'the servers\' line: the worst region (city) each week'],
    ['history: worstDay(techRows.map(row => row.history ?? [])),', 'the tech\'s line: the worst group each week'],
    ['lineFromLaunch: lineWeeks.length < STREAMING_STATUS_LINE_WEEKS,', '"Launch" under the first bar'],
    ['&& absoluteWeek - (item.resolvedAtWeek ?? item.openedAtWeek) < STREAMING_STATUS_HISTORY_WEEKS),', 'the history: the last year, all of it (it was the newest 8)'],
] as const) has(statusBoard, needle, why);
const presentation = source('components/streaming-transplant/createCanonicalStreamingPresentation.ts');
has(presentation, 'const weeks = streamingStatusLineWeeks(absoluteWeek, platform.launchCommit?.committedAtAbsoluteWeek ?? null);', 'the strips: the same weeks');
has(presentation, 'const snapshot = closes.get(week);', 'each bar its own week\'s close (it padded the weeks before the launch with green)');
const page = source('components/streaming-transplant/PlatformStatus.tsx');
has(page, "const [open, setOpen] = useState(overview.status !== 'WORKING');", 'in trouble it opens itself');
has(page, '{overview.reason && !open && <em className={st.fwhy}>{overview.reason}</em>}', 'closed, it says why under the line');
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/PlatformStatus.module.css');
has(css, '.board .fhead{display:grid;grid-template-columns:minmax(0,1fr) auto 8px;', 'the line\'s head: what it says, its word, a chevron');
has(css, '.board .lcities .lname{padding-left:13px}', 'a region\'s cities under its name');
has(css, '.board .pwhen{font-size:9.5px;font-weight:700;color:#7d8698;white-space:nowrap}', 'a past incident\'s week never splits');
console.log('PASS source: the weeks, the two lines, the year of history, the strips\' weeks; the look');
console.log('done');
