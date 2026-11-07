/** The HQ's rooms in one order and the incident as one slim line, #76 (codex-handoff/plans/platform-tech-plan.md
 *  §14, 2026-10-30; Zeesh: "chahe pehle ya baad ho ek hi same order mein rakhna … sabse pehle wo rakhna hai jo
 *  sabse zyada use karega: audience … boardroom ka humne sabse kone mein isliye rakha hai kyunki uska kaam sabse
 *  kam rehta hai", and on the incident card: "minimal look"). Checks:
 *  - order: before launch and after, the rooms are Audience, Content, Platform, Boardroom;
 *  - incident: the HQ's incident is a compact line ("Minor incident" / "Major incident", its title, STATUS), amber
 *    when minor and red when major, never the hero card; the deck draws it with the compact style. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hq = readFileSync('components/StreamingPlatformHQ.tsx', 'utf8');
const deck = readFileSync('components/streaming-transplant/StreamingPlatformCommandDeck.tsx', 'utf8');
const css = readFileSync('components/streaming-transplant/presentation/screens/CommandDesk/CommandDesk.module.css', 'utf8');

/* ── order ── */
const from = hq.indexOf('divisions: isPreLaunch ? [');
const to = hq.indexOf('      events,', from);
assert.ok(from > 0 && to > from, 'The HQ builds its rooms in one place');
const [before, after] = hq.slice(from, to).split('\n      ] : [\n');
assert.ok(before && after, 'One list before launch and one after');
const ids = (block: string) => [...block.matchAll(/id: '(AUDIENCE|CONTENT|PLATFORM|BOARDROOM)', label:/g)].map(match => match[1]);
assert.deepEqual(ids(before), ['AUDIENCE', 'CONTENT', 'PLATFORM', 'BOARDROOM'], 'Before launch');
assert.deepEqual(ids(after), ['AUDIENCE', 'CONTENT', 'PLATFORM', 'BOARDROOM'], 'After launch, the same order');
console.log(`PASS order: before launch ${ids(before).join(' · ')}; after launch ${ids(after).join(' · ')}`);

/* ── incident ── */
const start = hq.indexOf("id: 'INCIDENT',");
const event = hq.slice(start, hq.indexOf('});', start));
assert.ok(start > 0, 'The HQ raises an incident line');
assert.match(event, /label: `\$\{openIncident\.major \? 'Major' : 'Minor'\} incident`/, '"Minor incident" or "Major incident"');
assert.match(event, /line: `\$\{openIncident\.title\}/, 'then its title');
assert.match(event, /tone: openIncident\.major \? 'urgent' : 'warn'/, 'amber when minor, red when major');
assert.match(event, /meta: 'STATUS'/);
assert.match(event, /compact: true/, 'a compact line');
assert.doesNotMatch(event, /hero: true/, 'never the hero card');
assert.ok(deck.includes("(event.compact ? css.compact : '')"), 'The deck draws it compact');
assert.match(css, /\.hq \.eventbar\.compact \.evtxt span\{[^}]*white-space:normal/, 'its title wraps, nothing clipped');
console.log('PASS incident: one slim line, "Minor incident" (amber) or "Major incident" (red), the title wrapping, STATUS ›; never the hero card');
