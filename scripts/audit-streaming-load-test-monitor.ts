/**
 * #98 the load test screen, in the founding wizard and on the Network tab alike (Zeesh, 2026-11-01: "entire country,
 * har jagah open market … select kar sakoon"; "Northern Signal playing … kaafi plain … aisa bana ki lage ki video chal
 * raha hai non-stop … wizard mein bhi"). Reads the source:
 *  - the viewer check starts on every market (REHEARSAL_ALL_MARKETS), offered first in the market browser, and a market
 *    can still be picked; every market's state at this moment of the night is counted, and the monitor's one state for
 *    all of them is the rehearsal's own (half or more gone or stuttering says so; fewer is a word over a playing picture);
 *    every market is a lamp; what struggles is named;
 *  - the program monitor plays: a picture that drifts under a slow camera move, grain and a light sweep; LIVE; a viewer
 *    count (load over viewers' own load on the Network tab); a clock that runs only while it plays; a playhead that never
 *    stops; sound bars; a quality badge. Buffering dims and stalls it; a stream that is gone is static and OFF AIR;
 *  - reduced motion stills it;
 *  - one component for both: the wizard's rehearsal and the Network tab's live load test render the same RehearsalMonitor.
 * The screens themselves (a surge with every market, a broken market, 320–430 px) are checked in a live career:
 * codex-handoff/evidence/098/checks.log. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
const has = (text: string, needle: string, why: string) => assert.ok(text.includes(needle), why);

const markets = source('components/streaming-transplant/RehearsalMarkets.tsx');
const rehearsal = source('components/streaming-transplant/StreamingBuildoutExperience.tsx');
const monitor = source('components/streaming-transplant/RehearsalMonitor.tsx');
const css = source('components/streaming-transplant/presentation/screens/Buildout/Buildout.module.css');

has(markets, "export const REHEARSAL_ALL_MARKETS = 'ALL';", 'every market, as a choice');
has(markets, 'className={css.marketAll} aria-pressed={selected === REHEARSAL_ALL_MARKETS}', 'offered first');
has(markets, "onClick={() => onSelect(country.marketId)}", 'one market can still be picked');
has(rehearsal, 'useState<string | null>(REHEARSAL_ALL_MARKETS)', 'the viewer check starts on every market');
has(rehearsal, 'const allView = viewerMarketId === REHEARSAL_ALL_MARKETS;', 'all markets mode');
has(rehearsal, "const state: 'PLAYING' | 'BUFFERING' | 'DOWN' = total && down / total >= .5 ? 'DOWN' : total && (down + buffering) / total >= .5 ? 'BUFFERING' : 'PLAYING';", 'one state for all of them');
has(rehearsal, 'streamingRehearsalPlayback(country, forecast, at)', 'each market\'s own state at this moment');
has(rehearsal, '`${everyMarket.down + everyMarket.buffering} of ${everyMarket.total} markets struggling`', 'a word over a playing picture');
has(rehearsal, '<div className={css.rhwlamps} aria-hidden="true">', 'every market as a lamp');
has(rehearsal, '`Struggling: ${everyMarket.struggling.slice(0, 3)', 'what struggles, named');
has(rehearsal, '/ Math.max(.01, inp.viewerLoad ?? 1));', 'viewers, not load, on the Network tab');
console.log('PASS every market: the first choice and the start, a market can still be picked, one state for all, lamps, names');

has(rehearsal, '<RehearsalMonitor', 'one monitor for the wizard and the Network tab');
for (const [needle, why] of [
    ["{state === 'DOWN' ? 'OFF AIR' : 'LIVE'}", 'LIVE, or off air'], ['watching</>', 'a viewer count'],
    ["if (state !== 'PLAYING') return undefined;", 'the clock runs only while it plays'], ['setSeconds(value => value + 1);', 'a running clock'],
    ["{state === 'DOWN' ? 'STREAM UNAVAILABLE' : 'BUFFERING'}", 'what it is when it is not playing'],
    ["{state === 'PLAYING' ? '1080p' : state === 'BUFFERING' ? '480p' : '—'}", 'a quality badge'],
    ['<span className={css.rhweq} aria-hidden="true"><i /><i /><i /><i /></span>', 'sound bars'],
    ['<i className={css.rhwbuffered} /><i className={css.rhwplayed} />', 'a playhead'],
    ['<div className={css.rhwscene} aria-hidden="true"><i /><i /><i /><i /></div>', 'a picture'],
] as const) has(monitor, needle, why);
for (const frames of ['@keyframes rhw-camera', '@keyframes rhw-drift-a', '@keyframes rhw-sweep', '@keyframes rhw-grain', '@keyframes rhw-play', '@keyframes rhw-eq', '@keyframes rhw-blink'])
    has(css, frames, frames);
has(css, '.bld .rhwlivefeed.burst .rhwscene { filter:brightness(.5) saturate(.55) blur(2px); }', 'buffering dims the picture');
has(css, '.bld .rhwlivefeed.broke .rhwscene { opacity:0; }', 'gone is static');
has(css, '.bld .rhwcenter { inset:16% 0 48% 0;', 'the spinner never on the title');
has(css, '.bld .rhwscene i,.bld .rhwgrain,.bld .rhwlive i,.bld .rhwplayed,.bld .rhwbuffered,.bld .rhweq i { animation:none !important; }', 'reduced motion stills it');
console.log('PASS monitor: a moving picture, LIVE, a ticking count, a running clock, a playhead that never stops, sound bars; buffering dims and stalls, gone is static; reduced motion');

console.log('done');
