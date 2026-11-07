/**
 * #96 the Network page made clean, short and even (Zeesh, 2026-10-31: "page bahut zyada long scroll ho gaya … minimal,
 * clean aur premium … sell aur sell back wala system symmetric nahi hai … build it / done dekhne ke liye scroll karna
 * pad raha … jahan animation need hai wahan daal do"). Reads the source:
 *  - one − / + a maker: the desk's own write sells back below what stands and builds above it (Build's board hands it
 *    every write in live mode); each maker says standing, new or sold, and "sells at N%" below what stands; a region
 *    building rests its levers; the old Sell back section is gone;
 *  - the bar pinned under the page: the open region's change (what, money, weeks, served / capacity / the week) with Undo
 *    and Build it, Done when nothing is drawn, and with no region open every change with Undo all and Build all;
 *  - Build it presses at once and sweeps, orders a beat later, says "Ordered" with a check, and its row comes in under
 *    Building; a region's head carries its badge (building, or what is drawn);
 *  - short: one strip (load, markets, the week, which opens every cost), one line online, building rows, the load test as
 *    three chips, Sites folded, no four cards, no Changes section, no change cards, no What it costs section, Build's
 *    long notes and its Done foot hidden in live mode;
 *  - what a change carries is told in the engine's capacity (Build's model scaled by what stands).
 * The flow itself (+ and − on one stepper, Build it, Build all, 320–430 px) is checked in a live career:
 * codex-handoff/evidence/096/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);
const lacks = (text: string, needle: string, why: string) => assert.ok(!text.includes(needle), why);

const stage = source('components/studio-finance/components/build/BuildWizard.tsx');
const board = source('components/studio-finance/components/build/RegionBoard.tsx');
const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDeskBoard.css');

has(stage, 'liveDesk?: {', 'the board takes the desk');
has(board, `    if (liveDesk) {
      const text = liveDesk.write(regionId, setup);`, 'every live write is the desk\'s');
has(board, "delta > 0 ? `+${delta} new` : delta < 0 ? `−${-delta} sold`", 'standing, new or sold on each maker');
has(board, "`sells at ${resale}%`", 'below what stands, the region\'s rate');
has(board, 'disabled={locked || count === 0}', 'a building region rests its −');
has(board, 'disabled={locked || !addable}', 'and its +');
has(desk, 'const writeRegion = (regionId: string, setup: RegionSetup): string | null => {', 'the desk\'s write');
has(desk, 'const sell = Math.max(0, stand[tier] - setup.servers[tier]);', 'below what stands sells back');
has(desk, 'rooms = sellStreamingNetworkRacks(rooms, regionId, tier, sell);', 'from the standing rooms');
has(desk, 'const placed = placeRegion(data, base, regionId, setup);', 'above it the placer builds');
has(desk, 'locked: regionId => Boolean(busy(regionId)),', 'one build a region at a time');
lacks(desk, 'nd-sell', 'the old Sell back section is gone');
console.log('PASS one stepper: − below what stands sells back at the region\'s rate, + builds; standing / new / sold shown; a building region rests');

has(desk, '<div className="nd-bar-dock">{bar}</div>', 'the bar');
has(css, '.nd-desk .nd-bar-dock {\n  position: sticky; bottom: 0;', 'pinned under the page');
for (const [needle, why] of [
    ['className="nd-bar-icon"', 'Undo'], ["{ordering === openId ? 'Ordering…' : actionFor(preview.capitalCost, preview.refund)}", 'Build it'], ['className="nd-bar-done"', 'Done'],
    ['actionFor(now, back, pending.length > 1)', 'Build all'], ['aria-label="Undo every change"', 'Undo all'], ['review ›', 'review'],
    ['className="nd-bar-warn"', 'what gets worse'],
] as const) has(desk, needle, why);
lacks(desk, 'const ChangeCard', 'no change cards on the page');
lacks(board, '{extra}\n\n          {/* --- done with this region', 'Build\'s own Done foot does not show in live mode');
has(board, '{!live && rooms.length > 0 && (', 'its foot hidden when live');
console.log('PASS bar: the open region\'s change with Undo and Build it, Done, or every change with Undo all and Build all, always in reach');

has(desk, 'const ORDER_SWEEP_MS = 420;', 'the press sweeps first');
has(desk, '<i className="nd-check" aria-hidden="true" />', 'a check');
has(desk, "<b>Ordered</b>", 'Ordered');
has(desk, "className={ordered?.regionIds.includes(order.regionId) ? 'is-new' : undefined}", 'its row comes in');
for (const frames of ['@keyframes nd-sweep', '@keyframes nd-check-pop', '@keyframes nd-check-tick', '@keyframes nd-row-in', '@keyframes nd-bar-in', '@keyframes nd-pop'])
    has(css, frames, frames);
has(css, '@media (prefers-reduced-motion: reduce)', 'still for those who ask');
has(desk, "<span className={ordered?.regionIds.includes(regionId) ? 'nd-badge is-building is-new' : 'nd-badge is-building'}>", 'a building badge');
console.log('PASS motion: Build it sweeps, then Ordered with a check, the new row comes in, badges pop; reduced motion stills it');

for (const [needle, why] of [
    ['<div className="nd-hud">', 'one strip'], ['<span className="nd-hud-name">LOAD</span>', 'load'], ['<span className="nd-hud-name">MARKETS</span>', 'markets'],
    ['<span className="nd-hud-name">COSTS<i aria-hidden="true" /></span>', 'the week (#99: its costs)'],
    ['aria-controls="nd-money-panel"', 'the week opens every cost'], ['<details className="nd-sites-box">', 'Sites folded'],
    ['<section className="nd-test">', 'the load test, one row (#97)'],
] as const) has(desk, needle, why);
lacks(desk, 'className="nd-numbers"', 'no four cards');
lacks(desk, '<b>Changes</b>', 'no Changes section');
lacks(desk, '<b>What it costs</b>', 'no What it costs section');
has(board, "<p className=\"bw-rg-footprint-note\">Green is where your servers reach; only the markets you sell in count.</p>", 'a one-line note');
has(board, '{!live && draft.facilities.length > 0 && (', 'no estate line when live (the strip has the week)');
console.log('PASS short: one strip, one line online, the load test as chips, Sites folded; the four cards, Changes, change cards and What it costs gone');

has(desk, 'return modelled > 0 && desk.capacityStreams > 0 ? desk.capacityStreams / modelled : 1;', 'Build\'s model scaled to the engine');
has(board, "live ? `${regions.length} ${regions.length === 1 ? 'region' : 'regions'}`", 'no model total in the title');
console.log('PASS one capacity: a change\'s capacity in the engine\'s figures; the board\'s title without Build\'s model total');

/* #97 (Zeesh: "sticky … complex lag raha hai … load test mein 3 button … ek button … suggest dabane se kya ho raha samajh nahi aata
   … gradient … BUILDING badal kar kuch aur") */
for (const [needle, why] of [
    ['const ChangeSlots: React.FC<{ parts: ChangePart[]; tag?: string | null }>', 'the makers\' own marks in the bar (#99 as slots)'],
    ["const actionFor = (capital: number, refund: number, all = false) => (capital > 0", 'one button that says what it does'],
    ["`${all ? 'Build all' : 'Build'} · ${money(capital)}`", 'Build · $X'], ["`${all ? 'Sell all' : 'Sell'} · +${money(refund)}`", 'Sell · +$X'],
    ['<UndoIcon />', 'Undo as an icon'], ["setNotice({ title: 'All set', text:", 'Suggest says when nothing is needed, in the bar'],
    ["{tag && <small className=\"nd-bar-tag\">{tag}</small>}", 'and tags what it drew'], ["tag={suggested?.regionIds.includes(openId) ? '✦ Suggested' : null}", 'Suggested'], ['needsFix: shown.verdict !== \'HELD\' || standing.some(service => service.coveredShare < .8),', 'Suggest a fix only when short'],
    ["<b>{suggesting === regionId ? 'Working it out…' : 'Suggest servers'}</b>", 'a region\'s Suggest in plain words'],
] as const) has(desk, needle, why);
const suggestRule = css.slice(css.indexOf('.nd-desk .nd-suggest {'), css.indexOf('.nd-desk .nd-suggest:active'));
assert.ok(suggestRule && !/gradient|dashed/.test(suggestRule), 'Suggest without the gradient or the dashes');
const room = source('components/streaming-transplant/StreamingNetworkExperience.tsx');
has(room, '<div><span>PLAYBACK</span>', 'the room\'s third number is playback');
lacks(room, '<span>BUILDING</span>', 'no BUILDING in the room\'s strip');
console.log('PASS #97: a simple bar (marks, what, where and when, a warning only when worse, Build · $X / Sell · +$X, Undo as an icon); one load test row; Suggest answers in the bar; no gradient; PLAYBACK in the strip');

console.log('done');
