/**
 * #99 the Network page as a game's (Zeesh, 2026-11-01: "this need more work. more clean, symmetric and good premium …
 * redesign that load, market, a week and also load test section in such a way like its a game bro but its feeling like
 * a saas app"). Renders the dials and reads the source:
 *  - the strip is three dials of one kind (a 270° arc of ticks round a dark well, the value at its heart, the name
 *    under it): LOAD lights a tick a step, green, amber from 70%, red from 85%, the red line faint when unreached and the
 *    tip breathing; MARKETS a tick a market (80%+ green, some amber, none dark), the best first; COSTS the week by part
 *    in the brand's shades (incidents red), and a tap opens every part with its shade beside it;
 *  - the load test is a level's card: the verdict as a result ("All nights hold", "Surge breaks", "Two nights break"),
 *    the three nights as a bar of three with light running through what holds, a play button, YOUR CHANGES on a
 *    drawing; Suggest a fix is a full row in plain words; nothing runs across the words;
 *  - the bar is even: where and when on one line; a slot a maker in the board's order (its mark, + or − and how many,
 *    its name), the same slots added up for every change; Undo beside one button, money back from a sale under its
 *    price; Suggested as a tag on the slots;
 *  - motion: the dials come in, ticks light in turn, a light runs along, the tip breathes, the bars fill and flow, the
 *    play ring pulses, the button's sheen; reduced motion stills them all, pseudo-elements too.
 * The screens themselves (320–430 px, a mixed change, a sale, four makers, a broken night, Suggest) are checked in a
 * live career: codex-handoff/evidence/099/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LoadDial, MarketsDial, MoneyDial } from '../components/streaming-transplant/NetworkDeskGauges';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);
const lacks = (text: string, needle: string, why: string) => assert.ok(!text.includes(needle), why);
/** each tick of a dial, as its class list */
const ticks = (element: React.ReactElement) => [...renderToStaticMarkup(element).matchAll(/<line([^>]*)>/g)]
  .map(match => /class="([^"]*)"/.exec(match[1])?.[1] ?? '');
const lit = (list: string[]) => list.filter(item => item.split(' ').includes('is-on'));

/* LOAD */
const load20 = ticks(<LoadDial percent={20} />);
assert.equal(load20.length, 28, 'a 270° arc of 28 ticks');
assert.equal(lit(load20).length, 6, '20% lights six of them');
assert.ok(lit(load20).every(item => item.includes('is-good')), 'green under 70%');
assert.equal(load20.findIndex(item => item.includes('is-tip')), 5, 'the last lit is the tip');
assert.ok(load20.slice(23).every(item => item === 'is-bad'), 'the red line from 85%, unlit');
const load90 = ticks(<LoadDial percent={90} />);
assert.equal(lit(load90).length, 25, '90% lights 25');
assert.equal(lit(load90).filter(item => item.includes('is-warn')).length, 4, 'amber from 70%');
assert.equal(lit(load90).filter(item => item.includes('is-bad')).length, 2, 'red from 85%');
assert.equal(lit(ticks(<LoadDial percent={0} />)).length, 0, 'nothing at 0%');
console.log('PASS load: a tick a step, green, amber from 70%, red from 85%, the red line faint, the tip');

/* MARKETS */
const markets = ticks(<MarketsDial shares={[.5, 1, 0, .85, .9]} />);
assert.deepEqual(markets, ['is-on is-good', 'is-on is-good', 'is-on is-good', 'is-on is-warn', ''], 'a tick a market, the best first: 80%+ green, some amber, none dark');
assert.equal(ticks(<MarketsDial shares={Array.from({ length: 60 }, () => 1)} />).length, 60, 'sixty markets, sixty ticks');
console.log('PASS markets: a tick a market, 80% or more green, some amber, none dark, the best first');

/* COSTS */
const costs = ticks(<MoneyDial parts={[{ weekly: 75, shade: 0 }, { weekly: 25, shade: 2 }]} />);
assert.equal(costs.filter(item => item.includes('is-p0')).length, 21, 'three quarters in the first shade');
assert.equal(costs.filter(item => item.includes('is-p2')).length, 7, 'a quarter in its own');
assert.equal(lit(ticks(<MoneyDial parts={[]} />)).length, 0, 'no costs, a dark ring');
console.log('PASS costs: the week by part, each in its shade');

const desk = source('components/streaming-transplant/NetworkDeskBoard.tsx');
const css = source('components/streaming-transplant/presentation/screens/NetworkDesk/NetworkDeskBoard.css');
for (const [needle, why] of [
    ['<div className="nd-hud">', 'one strip of dials'], ['<LoadDial percent={desk.peakLoadPercent} />', 'load'],
    ['<MarketsDial shares={standing.map(service => service.coveredShare)} />', 'markets'], ['<MoneyDial parts={moneyRows} />', 'the week'],
    ['<span className="nd-dial-read"><b>{desk.peakLoadPercent}%</b><em>of {compact(desk.capacityStreams)}</em></span>', 'the value at the heart, of the capacity'],
    ['<span className="nd-dial-read"><b>{servedMarkets}</b><em>of {standing.length}</em></span>', 'markets of markets'],
    ['<em>a week</em>', 'money a week'], ['<span className="nd-hud-name">COSTS<i aria-hidden="true" /></span>', 'a tap opens the costs'],
    ["shade: /^incident/i.test(row.label) ? 4 : Math.min(3, index)", 'a shade a part, incidents red'], ['<i className={`nd-swatch is-p${row.shade}`} aria-hidden="true" />', 'each row\'s shade'],
] as const) has(desk, needle, why);
lacks(desk, 'className="nd-stats"', 'the old strip is gone');
console.log('PASS strip: three dials of one kind, the value at the heart, the costs open with their shades');

for (const [needle, why] of [
    ["const title = broke.length === nights.length ? 'Every night breaks'", 'a result'], ["`${broke[0].name} breaks`", 'the night that breaks'],
    ["`${tight[0].name} runs tight`", 'or runs tight'], [": 'All nights hold';", 'or all hold'],
    ['<b className="nd-test-title" key={testLine.title}>{testLine.title}</b>', 'the verdict in big letters'],
    ['<span className="nd-test-nights" aria-hidden="true">', 'the three nights as a bar of three'],
    ["moved: Boolean(night.after && night.after.verdict !== night.now.verdict),", 'a night the drawing moved'],
    ['<span className="nd-test-play" aria-hidden="true">', 'a play button'], ["LOAD TEST{drawnDiffers ? ' · YOUR CHANGES' : ''}", 'on a drawing'],
    ["<span><b>{suggesting === 'ALL' ? 'Working it out…' : 'Suggest a fix'}</b><em>Draws what each short region needs. Nothing is bought until you build.</em></span>", 'the fix in plain words'],
] as const) has(desk, needle, why);
lacks(desk, 'nd-test-lanes', 'nothing runs across the words');
lacks(desk, 'nd-test-row', 'the old row is gone');
console.log('PASS load test: a level\'s card, the verdict, three nights with what moved, a play button; the fix in plain words');

for (const [needle, why] of [
    ["const PART_ORDER: PartTier[] = [...TIERS, 'CLOUD'];", 'the board\'s order of makers'],
    ['const mergeParts = (lists: ChangePart[][]): ChangePart[] => {', 'every change, added up'],
    ["className={['nd-slots', count === 1 ? 'is-single' : '', count > 3 ? 'is-dense' : ''].filter(Boolean).join(' ')}", 'even slots; one reads as a line; four drop names'],
    ["<b key={part.count} aria-hidden=\"true\">{part.sign > 0 ? '+' : '−'}{part.count}</b>", '+ or − and how many'],
    ['<p className="nd-bar-where"><b>{regionName(openId)}</b><em>ready in {weeksWord(preview.buildWeeks)}</em></p>', 'where and when on one line'],
    ['<ChangeSlots parts={changeParts(preview)}', 'the open region\'s slots'], ['<ChangeSlots parts={mergeParts(pending.map(change => changeParts(change.preview)))}', 'every change\'s'],
    ['<div className="nd-bar-actions">', 'Undo beside the button'], ['back from the sale</small>', 'money back under the price'],
] as const) has(desk, needle, why);
lacks(desk, 'nd-bar-marks', 'the old marks are gone');
const actions = desk.slice(desk.indexOf('<div className="nd-bar-actions">'), desk.indexOf('</div>', desk.indexOf('<div className="nd-bar-actions">')));
assert.ok(actions.indexOf('nd-bar-icon') < actions.indexOf('nd-bar-build'), 'Undo first, then the button');
has(css, '.nd-desk .nd-slots { position: relative; display: grid; grid-template-columns: repeat(var(--n, 1), minmax(0, 1fr)); gap: 7px; }', 'the slots share the width evenly');
has(css, '.nd-desk .nd-slots > .nd-bar-tag {', 'Suggested as a tag on the slots');
console.log('PASS bar: where and when, a slot a maker in the board\'s order, the same added up for every change, Undo beside one button');

for (const frames of ['@keyframes nd-dial-in', '@keyframes nd-tick-on', '@keyframes nd-tip', '@keyframes nd-chase', '@keyframes nd-fill', '@keyframes nd-flow',
    '@keyframes nd-flicker', '@keyframes nd-moved', '@keyframes nd-play-ring', '@keyframes nd-sheen'])
    has(css, frames, frames);
has(css, '.nd-desk *::before, .nd-desk *::after { animation: none !important; }', 'reduced motion stills the pseudo-elements too');
has(css, '.nd-desk .nd-check::after { transform: rotate(45deg) scale(1); }', 'and the check stays drawn');
const added = css.slice(css.indexOf('/* ── the strip (#99)'), css.indexOf('/* every part of the week'));
assert.ok(!/font[^;]*\b([0-9]|10)(\.\d+)?px/.test(added.replace(/\d+px\/[\d.]+/g, '')), 'no text under 11px on the dials');
console.log('PASS motion: dials come in, ticks light, a light runs, the tip breathes, bars fill and flow, the ring pulses, the sheen; reduced motion');

console.log('done');
