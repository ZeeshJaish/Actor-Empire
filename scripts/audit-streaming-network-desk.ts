/**
 * #90 the Network tab of a live company (codex-handoff/plans/platform-tech-plan.md §17). Reads the source:
 *  - the Platform room shows the desk on NETWORK for a live company (no change from Build under way), and the old
 *    page (with its door to Build) only before launch;
 *  - the HQ hands it Build's experience in desk mode with this week's peak as the busiest hour, the network as it
 *    stands, and the three actions on the latest player (preview, order, speed up);
 *  - the Build experience draws NetworkDeskBoard instead of the wizard when it has desk hooks;
 *  - Build's board and map in live mode: no Suggest or what-ifs (they price standing hardware), no "ready week" (an
 *    order's time is its own), the busiest hour / at peak instead of the opening night, only the weekly cost;
 *  - the desk: the four numbers, online this week, building with the energy speed-up, changes with Build it and
 *    Undo, sell-back at the region's rate under an open region, sites, and what the network costs;
 *  - the wizard itself is unchanged (its own copy and controls stay when it is not live).
 * The flow itself (build, speed-up, sell-back, a week passing, 320–430 px) is checked in a live career:
 * codex-handoff/evidence/090/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);

const network = source('components/streaming-transplant/StreamingNetworkExperience.tsx');
has(network, "{tab === 'CAPACITY' && networkDesk}", 'the Network tab shows the desk');
has(network, "{tab === 'CAPACITY' && !networkDesk && network && (", 'the old page only without a desk');
console.log('PASS tab: NETWORK shows the desk for a live company, the old page (and its door to Build) before launch');

const hq = source('components/StreamingPlatformHQ.tsx');
has(hq, 'networkDesk={platform.launchCommit && platform.infrastructureSetup ? (() => {', 'every live company (#92: also while an old Build change finishes)');
has(hq, 'preview: (regionId, facilities) => previewStreamingNetworkOrder(localizationPlayerRef.current, { regionId, facilities })', 'preview on the latest player');
has(hq, 'order: (regionId, facilities, regionPlan) => runNetwork(current => orderStreamingNetworkRegion(current, { regionId, facilities, regionPlan }))', 'order');
has(hq, 'speedUp: orderId => runNetwork(current => speedUpStreamingNetworkOrder(current, orderId))', 'speed-up');
has(hq, 'const livePeak = Math.max(0, Math.round(latest?.peakConcurrentStreams ?? 0));', 'the busiest hour is this week\'s peak');
has(hq, 'openingDemandForecast: { low: bigNight, likely, high: Math.round(likely * 1.9), byMarket }', 'the map\'s busiest hour (#91 put the load test\'s nights around it)');
has(hq, 'sel={liveBuildSelection()}', 'the network as it stands');
has(hq, 'desk={hooks}', 'desk mode');
console.log('PASS HQ: desk mode with this week\'s peak, the standing network, and preview / order / speed-up on the latest player');

const experience = source('components/streaming-transplant/StreamingBuildWizardExperience.tsx');
has(experience, 'if (props.desk) {', 'desk mode');
has(experience, '<NetworkDeskBoard', 'draws the desk');
has(experience, 'facilityToBuild(facility, true)', 'standing rooms drawn as built');
console.log('PASS Build: the desk instead of the wizard when it has desk hooks');

const board = source('components/studio-finance/components/build/RegionBoard.tsx');
has(board, "{!live && <button type=\"button\" className=\"bw-suggest-entry\"", 'no Suggest when live');
has(board, '{!live && <details className="bw-rg-alternatives"', 'no what-ifs when live');
has(board, "{live ? 'at peak' : 'on the night'}", 'at peak');
has(board, "{live ? 'Your regions' : 'Regions you open in'}", 'your regions');
has(board, "${live ? '' : ` · ready week ${Math.max(1, readyWeeks)}`}", 'no ready week when live');
has(board, '{live && extra}', 'the desk\'s controls in an open region, above its levers (#96)');
const map = source('components/studio-finance/components/build/NetworkMapBox.tsx');
has(map, "{live ? 'at the busiest hour' : 'on the night'}", 'the busiest hour');
has(map, "{live ? `${money(weeklyCostShown)}/wk` : `${money(buildCostShown)} once · ${money(weeklyCostShown)}/wk`}", 'only the weekly cost when live');
console.log('PASS live board and map: no Suggest or what-ifs, no ready week, at peak / the busiest hour, the weekly cost only; the wizard keeps its own');

const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
for (const [needle, why] of [
    ['<span className="nd-hud-name">MARKETS</span>', 'the strip (#96: one row, not four cards; #99 three dials)'], ['<b>ONLINE</b>', 'online this week'], ['−1 wk · {energy}⚡', 'the speed-up'],
    ['Build it', 'build it'], ['Undo', 'undo'], ['sells back at', 'sell-back at the region\'s rate'],
    ['The whole network', 'the money'], ['renderRegionExtra={regionExtra}', 'controls in an open region'], ['live\n', 'live board'],
] as const) has(desk, needle, why);
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDeskBoard.css');
has(css, '.sf.nd-desk .bw-rg-who b,', 'region names wrap instead of "…"');
has(css, '.sf.nd-desk .bw-rg-prov { grid-template-columns: repeat(3, minmax(0, 1fr)); }', 'the cloud companies fit');
console.log('PASS desk: the strip, online, building and speed-up, Build it and Undo, sell-back at the region\'s rate, sites, money; narrow-width rules');

console.log('done');
