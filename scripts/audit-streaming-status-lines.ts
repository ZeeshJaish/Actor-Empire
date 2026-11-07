/**
 * #101 STATUS, minimal and in lines (Zeesh, 2026-11-01, Hindi, voice: "server section mein … city wise daalne ka,
 * achchha ek line server ka daal de … hamara server agar yellow kahin gir raha to samajh aa jayega … same tech ka …
 * open incident wala … thoda sa minimal kar dijiye"). Reads the source:
 *  - the board's rows carry 30 weeks (STREAMING_STATUS_LINE_WEEKS), from the incidents both systems keep: down until a
 *    repair began, slow while it ran, the week now the row's own state, grey before a city opened (an order, or the
 *    launch) or a tech ran; a region's line is the worst of its cities, and it holds a line a city;
 *  - the page: a region is a line that opens to its cities (a region in trouble opens itself); each tech group a line;
 *    what grey means, only when a line has grey;
 *  - an open incident, minimal: no paragraph, what it does each week on one line (a phrase never split), its answers
 *    side by side with their price in a few words (the full words for a screen reader), and how long it runs if left
 *    is the Wait button's own number.
 * Every rule of the lines on the full test company, and the page, is in audit:streaming-status-board; the screens
 * (320–430 px) in codex-handoff/evidence/101/checks.log. #102 put the servers and the tech in a line each that opens
 * to these rows, and starts every line at the launch while the service is younger: audit:streaming-status-one-line.
 * (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);
const lacks = (text: string, needle: string, why: string) => assert.ok(!text.includes(needle), why);

const board = source('services/streamingStatusBoard.ts');
for (const [needle, why] of [
    ['export const STREAMING_STATUS_LINE_WEEKS = 30;', 'thirty weeks, as the service strips'],
    ["export type StreamingStatusDay = StreamingStatusLevel | 'NONE';", 'a week: working, slow, down, or not yet'],
    ['history?: StreamingStatusDay[];', 'a row\'s line'], ['cities?: StreamingStatusRow[];', 'a region\'s cities'],
    ["? item.statusRepair.path === 'WAIT' ? null : item.statusRepair.atAbsoluteWeek", 'a repair begins when STATUS answered; waiting is no repair'],
    ['if (week === absoluteWeek) return now;', 'the week now is the row\'s own state'],
    ["return (repair === null || week < repair) && downWhenUnanswered(item) ? 'DOWN' : 'SLOW';", 'down until a repair began, slow while it ran'],
    ["return week < from ? 'NONE' : 'WORKING';", 'grey before it ran'],
    ["item.status === 'DONE' && item.completedAtAbsoluteWeek !== null && item.newCityIds.includes(cityId)", 'a city opens with the order that added it'],
    ['history: worstDay(cities.map(city => city.history ?? [])),', 'a region: the worst of its cities'],
    ['const from = Math.max(first, launchedAt ?? Number.NEGATIVE_INFINITY);', 'tech never before the launch'],
    ["item => (item as OwnedStreamingCrisis).type === 'APP_CRASH'", 'an app crash is down, the rest slow'],
] as const) has(board, needle, why);
console.log('PASS board: 30 weeks a row from the incidents kept; down until a repair, slow while it runs; grey before it ran; a region the worst of its cities');

const page = source('components/streaming-transplant/PlatformStatus.tsx');
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/PlatformStatus.module.css');
/* #102 shows them inside the servers' and the tech's one line: a region still opens to a line a city */
for (const [needle, why] of [
    ['? <RegionRow key={row.id} row={row} open={regions.has(row.id)} onToggle={() => toggle(row.id)} />', 'a line a region'],
    ['{(row.cities ?? []).map(city => <LineRow key={city.id} row={city} />)}', 'a region opens to a line a city'],
    [': <LineRow key={row.id} row={row} />))}', 'a line a tech group'],
    ['{grey && <span className={st.lgrey} aria-hidden="true"><i />not running yet</span>}', 'what grey means, when there is grey'],
] as const) has(page, needle, why);
console.log('PASS page: a line a region, opening to a line a city; a line a tech group; grey explained when shown');

for (const [needle, why] of [
    ["return incident.repairPath === 'WAIT' ? `Waiting it out · ${weeksWords(left)} left` : 'Needs a response';", 'how long it runs is the Wait button\'s'],
    ["<span>{line.replace(/ a week$/, '/wk')}</span>", 'what it does, one line'],
    ['aria-label={`${repairTitle(incident, option.path)}: ${repairWords(option, incident.takedown)}`}', 'the full words for a screen reader'],
    ["option.path === 'FIX' ? <>{money(option.cash)} · {weeksShort(option.weeks)}</>", 'a price in a few words'],
] as const) has(page, needle, why);
lacks(page, 'st.incnote', 'no paragraph on an open incident');
has(css, '.board .repairs{display:grid;grid-template-columns:repeat(var(--n,3),minmax(0,1fr));', 'the answers side by side');
has(css, '.board .damage span{white-space:nowrap}', 'a phrase is never split');
has(css, '.board .line{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr);', 'a bar a week, as many as the line has (#102: thirty, or from the launch)');
for (const [day, colour] of [['dslow', '#ffb020'], ['ddown', '#ff5a5f'], ['dnone', '#20262e']] as const)
    has(css, `.board .line i.${day}{background:${colour}}`, `${day}: the service strips' colour`);
has(css, '@media (prefers-reduced-motion:reduce){ .board .line i,.board .frows,.board .lcities,.board .pnote,.board .lrow.down .ldot{animation:none}', 'reduced motion stills the lines');
console.log('PASS incident: minimal (no paragraph, one line of damage, answers side by side, prices in a few words); the lines\' colours and motion');

console.log('done');
