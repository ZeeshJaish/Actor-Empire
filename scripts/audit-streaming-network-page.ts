/**
 * #93 the Network page's last pieces from plan §17.6 (codex-handoff/plans/platform-tech-plan.md), which #90 left out.
 * Reads the source:
 *  - the map is the hero, at the top: Build's region board carries the desk's numbers, load test, building and changes
 *    between its map and its regions (afterMap); the map scrolls like a hero and pins (as in Build) only while a region
 *    is open;
 *  - a change card says what it does to its region before → after: markets served, what it carries, the week's cost;
 *  - Suggest for a region (under its sheet) and for every region (under the load test): Workhorses the placer lays,
 *    sized by the surge's own rooms, a region with no room by its whole surge, failures that are capacity's (not reach's),
 *    then the fewest more (up to 12) that bring each market to 80%; what stays short is named; nothing is ordered;
 *  - a night that breaks with no play failing says a market is partly out of reach;
 *  - NETWORK ONLINE (NETWORK UPDATED for a sell-back): a moment over the whole screen, once per order on this device;
 *  - sites by region with the markets each serves (Build's own two nearest), a tap finds it on the map;
 *  - the money box splits servers and rooms from cloud (Build's own split) and says what was paid up front this year.
 * The year of finished orders it reads is kept by the save's normaliser (audit:streaming-network-orders). The flow is
 * checked in a live career: codex-handoff/evidence/093/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);

const board = source('components/studio-finance/components/build/RegionBoard.tsx');
const stage = source('components/studio-finance/components/build/BuildWizard.tsx');
const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDeskBoard.css');
const hq = source('components/StreamingPlatformHQ.tsx');
const save = source('services/ownedStreamingPlatform.ts');

has(stage, 'afterMap?: React.ReactNode;', 'the slot');
has(board, '{afterMap}\n\n      <p className="bw-rg-title">', 'between the map and the regions');
has(desk, 'afterMap={top}', 'the desk fills it');
has(desk, "className={openId ? 'sf nd-desk is-editing' : 'sf nd-desk'}", 'editing while a region is open');
has(css, '.sf.nd-desk .bw-net-map { position: relative; }', 'a hero that scrolls');
has(css, '.sf.nd-desk.is-editing .bw-net-map { position: sticky; }', 'pinned while a region is open');
console.log('PASS map: the hero at the top, the desk under it, pinned only while a region is open');

for (const [needle, why] of [
    ['carriedBefore: carried(initialDraft, regionId),', 'what it carries, before → after'], ['weeklyAfter: now.weekly,', 'the week'],
    ['if (effect && effect.servedAfter < effect.servedBefore - .005) return `Served here drops to ${percent(effect.servedAfter)}`;', 'served, said when it drops (#97: the bar warns only when worse)'],
    ['const was = view ? regionReport(data, initialDraft, standing, view) : null;', 'before, Build\'s own region reading'],
    ['const now = view ? regionReport(data, draft, services, view) : null;', 'after'],
] as const) has(desk, needle, why);
console.log('PASS change: served, capacity and the week\'s cost worked out before → after; the bar says served when it drops (#97)');

for (const [needle, why] of [
    ['const suggestRegion = (base: BuildDraft, regionId: string)', 'Suggest'],
    ["const result = run(next, 'SURGE');", 'on the surge'],
    ['Math.ceil(Math.max(0, room.demand - room.steadyCapacity * .72) / 65_000)', 'the rehearsal\'s own sizing'],
    ['country.failedPercent > (country.unreachablePercent ?? 0) + .5', 'capacity\'s failures, not reach\'s'],
    ['for (let count = 1; count <= 12; count += 1) {', 'the fewest more for reach'],
    ['placeRegion(data, from, regionId,', 'laid by the placer'],
    ["'Suggest a fix'", 'for every region (#97: when something is short)'], ["'Suggest servers'", 'for a region'],
    ['Still short on a surge:', 'what stays short, named'],
    ["'part of a market out of reach'", 'a night broken by reach says so'],
] as const) has(desk, needle, why);
console.log('PASS suggest: by the surge, capacity then reach, laid by the placer, what stays short named; a night broken by reach says so');

for (const [needle, why] of [
    ['const OnlineMoment: React.FC', 'the moment'], ['createPortal(', 'over the whole screen'],
    ["{grew ? 'NETWORK ONLINE' : 'NETWORK UPDATED'}", 'online, or updated for a sell-back'],
    ["const ONLINE_SEEN_KEY = 'ae.networkOnline.seen';", 'once per order on this device'],
] as const) has(desk, needle, why);
has(css, '.nd-moment {', 'its look');
console.log('PASS moment: NETWORK ONLINE / UPDATED over the screen, once per order');

for (const [needle, why] of [
    ['const siteRegions = useMemo(', 'by region'], ['servedBy.get(site.name)', 'the markets it serves'],
    ['standing.forEach(service => service.servedBy.forEach(', 'Build\'s own two nearest'],
    ['onClick={() => findOnMap(site.regionId)}', 'a tap finds it'], ['aria-label={`${site.name}: find it on the map`}', 'said'],
] as const) has(desk, needle, why);
console.log('PASS sites: by region, the markets each serves, a tap finds it on the map');

has(hq, "{ id: 'NETWORK', label: 'Servers, cloud and rooms'", 'the network row marked');
has(desk, "const servers = { label: 'Servers and rooms', note: 'rent, power, water and staff'", 'servers and rooms');
has(desk, "const cloud = { label: 'Cloud', note: 'rented compute'", 'cloud');
has(desk, 'paid up front this year for', 'the year\'s up-front');
has(save, 'order.orderedAtAbsoluteWeek >= newest - 52).slice(-60);', 'a year of orders kept');
console.log('PASS money: servers and rooms, cloud, the rest; what was paid up front this year');

console.log('done');
