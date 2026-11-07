/**
 * #92 the Network page's clean-up (codex-handoff/plans/platform-tech-plan.md §17.2, §17.6 "Removed"). Reads the source:
 *  - no way into the Build wizard for a live company: every opener (the INFRA chip, Finance, the campus, campus
 *    construction, Define the Launch, the old page's button) goes through one helper that lands a live company on
 *    Platform › Network; the wizard does not draw for a live company, and its commit refuses (no opening commission
 *    again);
 *  - the desk also while a whole-network change from Build (before #89) finishes, with a note; its orders wait for it
 *    (the orders' own CHANGE_IN_PROGRESS refusal, in audit:streaming-network-orders);
 *  - the room's BUILDING strip is a live company's network orders under way (the desk's own number; counted in
 *    audit:streaming-network-orders), not campus builds;
 *  - before launch the old page stays (the door to Build) without the made-up numbers: no latency, no "HD streams",
 *    no building-bucket labels, the markets served by the engine's 80% rule instead of its own 50% "served well";
 *  - #95: the HQ home's STREAM CAPACITY and PLATFORM tile show the burst capacity, as the Network page does.
 * The flow itself is checked in a live career: codex-handoff/evidence/092/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);
const lacks = (text: string, needle: string, why: string) => assert.ok(!text.includes(needle), why);
const count = (text: string, needle: string) => text.split(needle).length - 1;

const hq = source('components/StreamingPlatformHQ.tsx');
has(hq, `  const openBuild = () => {
    if (platform.launchCommit && platform.infrastructureSetup) {
      setBuildInitialSheet(undefined);
      openPlatformTab('CAPACITY');
      return;
    }
    setShowCinematicBuild(true);
  };`, 'one way into Build: a live company lands on the Network tab');
assert.equal(count(hq, 'setShowCinematicBuild(true)'), 1, 'nothing opens the wizard but the helper');
assert.ok(count(hq, 'openBuild()') >= 11, 'every opener goes through it');
for (const [needle, why] of [
    ["if (chip === 'INFRA') return openBuild();", 'the INFRA chip'],
    ['setShowFinanceRoom(false);\n          openBuild();', 'Finance'],
    ['setShowTechnologyCampus(false);\n            openBuild();', 'the technology campus'],
    ['setShowCampusConstruction(false);\n            openBuild();', 'campus construction'],
    ['setShowDefineLaunch(false);\n          openBuild();', 'Define the Launch'],
    ['onAddCity={() => openBuild()}', 'the old page\'s button'],
] as const) has(hq, needle, why);
has(hq, "  if (showCinematicBuild && !showFinanceRoom && !platform.launchCommit) {", 'the wizard does not draw for a live company');
has(hq, "    if (platform.launchCommit) return { ok: false, message: 'The service is live: change the network on Platform › Network, region by region.' } as const;",
    'its commit refuses: no opening commission again');
console.log('PASS live path: every way into Build lands a live company on Platform › Network; the wizard neither draws nor commits for it');

has(hq, 'networkDesk={platform.launchCommit && platform.infrastructureSetup ? (() => {', 'the desk for every live company');
has(hq, 'pendingChange: readPlatform.pendingInfrastructureSetup', 'the old change handed to the desk');
const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
has(desk, 'A network change from Build is finishing: in service', 'the note');
has(desk, 'New orders open when it is.', 'orders wait for it');
console.log('PASS old change: the desk also while a Build change finishes, with a note; orders wait for it');

const room = source('components/streaming-transplant/StreamingNetworkExperience.tsx');
has(room, '<div><span>PLAYBACK</span>', 'the strip\'s third number is playback (#97: BUILDING moved to the desk\'s own rows)');
const state = source('components/streaming-transplant/createCanonicalStreamingPresentation.ts');
has(state, "networkBuilding: (platform.networkOrders ?? []).filter(order => order.status === 'BUILDING').length,", 'regions under way');
console.log('PASS strip: PLAYBACK (#97); the network orders under way are counted for the desk\'s Building rows');

const old = source('components/streaming-transplant/PlatformNetwork.tsx');
lacks(old, 'latencyMs', 'no made-up latency');
lacks(old, 'HD streams', 'no "HD streams"');
lacks(old, 'SERVED WELL', 'no page-own coverage');
lacks(old, 'city?.campus', 'no building-bucket labels');
has(old, 'const servedMarkets = map.markets.filter(market => market.served >= .8).length;', 'the 80% rule');
has(old, 'Change the network →', 'before launch the door to Build stays');
const mapView = source('services/streamingNetworkMapView.ts');
has(mapView, "state: market.served >= .8 ? 'SERVED' as const : market.reached > 0 ? 'THIN' as const : 'DARK' as const,", 'the map\'s SERVED, legend and Needs work by the same 80% rule');
console.log('PASS before launch: the old page and its door to Build, without latency, "HD streams", bucket labels or its own 50% rule');

/* #95 (Zeesh: "HQ home pe stream capacity … wahi burst wala"): one capacity everywhere */
has(hq, 'const currentCapacity = Math.max(0, readPlatform.capacity.burstConcurrentStreams);', 'the HQ home counts burst, as the desk and the peak load do');
has(hq, "statLabel: 'CAPACITY', stat: currentCapacity > 0 ?", 'the PLATFORM tile says capacity, not baseline');
console.log('PASS one capacity: the HQ home\'s STREAM CAPACITY and PLATFORM tile show the burst capacity the Network page and the peak load use');

console.log('done');
