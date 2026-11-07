/**
 * #110 Define the Launch's shell (plan §18.4; Zeesh, 2026-11-01: "ये जो डिफाइन द लॉन्च का इंटायर पेज है ना वो हमें इंटायर
 * रीडिज़ाइन करना, लाइक काफ़ी ख़राब डिज़ाइन है इसका, काफ़ी ख़राब बटन्स एंड ऑल स्टफ है" … "थोड़ा गेम वाला भी फील आना चाहिए"):
 *  - a launch sequence along the top: seven stages with their glyphs, lit when settled (the bill's own `done`), the
 *    current one big and named, a stage carrying a blocker flagged;
 *  - one HUD bar at the bottom: this step's number, the money left after the plan (or "Short"), the fuel line, the
 *    step's blockers, Back as an icon and the next stage as the big button; the plan strip and the Back | Next row gone;
 *  - the overview (Blueprint) opens as a mission briefing: a GO / NO GO / N open stamp and six objectives.
 * Renders with react-dom/server from `scripts/fixtures/streaming-launch-shell-data.ts`. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LaunchDraft, LaunchStepId } from '../components/studio-finance/finance/launch';
import { STEPS } from '../components/studio-finance/finance/launch';
import { LaunchWizard } from '../components/studio-finance/components/launch/LaunchWizard';
import { shellData, shellDraft, type ShellScenario } from './fixtures/streaming-launch-shell-data';

const render = (scenario: ShellScenario, step: LaunchStepId, draft?: LaunchDraft) => renderToStaticMarkup(createElement(LaunchWizard, {
    data: shellData(scenario), initialStep: step, initialDraft: draft ?? shellDraft(scenario),
}));
const count = (markup: string, pattern: RegExp) => (markup.match(pattern) ?? []).length;
const text = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const slice = (markup: string, from: string, to: string) => markup.slice(markup.indexOf(from), markup.indexOf(to, markup.indexOf(from)));

/* ── the launch sequence ── */
const fresh = render('fresh', 'ident');
const seq = slice(fresh, '<nav class="lw-seq"', '</nav>');
assert.equal(count(seq, /class="lw-seq-stop /g), STEPS.length, 'Seven stages on the rail');
assert.equal(count(seq, /aria-current="step"/g), 1, 'One current stage');
assert.match(seq, /class="lw-seq-stop is-now is-flagged" aria-label="Commission the ident" aria-current="step">[\s\S]*?<span class="lw-seq-name">Ident<\/span>/,
    'The current stage is drawn big (is-now), names itself, and wears its blocker');
assert.match(seq, /class="lw-seq-stop is-open" aria-label="Choose opening markets"/, 'A stage behind you that is not settled stays open (amber)');
assert.match(seq, /class="lw-seq-stop is-lit is-settled" aria-label="Price the service — settled"[\s\S]*?class="lw-seq-tick"/,
    'A settled stage is lit with a tick, wherever it is');
assert.match(seq, /class="lw-seq-stop is-ahead" aria-label="Design the front page"/, 'A stage ahead and unsettled is dark');
assert.equal(count(seq, /class="lw-seq-glyph"/g), STEPS.length, 'Every stage keeps its glyph');
const ready = render('ready', 'ident');
assert.equal(count(slice(ready, '<nav class="lw-seq"', '</nav>'), /is-settled/g), STEPS.length, 'All seven lit when all are settled');
assert.doesNotMatch(fresh + ready, /class="lw-track"|class="lw-stop /, 'The old track is gone from Define the Launch (and, since #157, from The Build)');
console.log('PASS sequence: seven stages with glyphs, lit when settled, the current big and named, open ones amber, blockers flagged');

/* ── the HUD ── */
const hud = slice(fresh, '<footer class="lw-hud', '</footer>');
assert.equal(count(fresh, /<footer class="lw-hud/g), 1, 'One bar at the foot');
assert.doesNotMatch(fresh, /class="lw-foot"|class="kit-strip|class="lw-blockers"/, 'The plan strip, the Back | Next row and the loose blocker list are gone');
assert.match(hud, /class="lw-hud is-over" data-page="ident" data-tone="bad"/, 'Short of money and blocked: the bar says so');
assert.match(hud, /<li class="is-block"><i aria-hidden="true"><\/i>No service ident has been commissioned\.<\/li>/, 'The step\'s blocker sits on the bar');
assert.match(text(hud), /Ident \$0 Short \$40M/, 'This step\'s number, and the shortfall in place of the money left');
assert.match(hud, /class="lw-hud-fuel" role="img" aria-label="Launch plan \$140M of \$100M"/, 'The fuel line: the plan against the money');
assert.match(hud, /class="lw-hud-back" aria-label="Back"/, 'Back is an icon');
assert.match(text(hud), /Next Store$/, 'The big button names the next stage');
assert.match(hud, /class="lw-hud-next"><span class="lw-hud-next-glyph"/, 'with its glyph');
assert.match(text(slice(ready, '<footer class="lw-hud', '</footer>')), /Ident \$0 Money left \$70M/, 'With money to spare: the money left after the plan');
assert.match(render('fresh', 'markets'), /class="lw-hud-back" aria-label="Back" disabled=""/, 'No Back on the first stage');
const last = slice(render('ready', 'blueprint'), '<footer class="lw-hud', '</footer>');
assert.match(text(last), /Next Build the Platform$/, 'The last stage leads to Build the Platform');
const noOffer = shellDraft('fresh');
noOffer.pricing = { ...noOffer.pricing!, commercialOffers: {
    coreModel: 'SUBSCRIPTION', coreModelSelected: false, adFreePasses: {},
    benefits: { plans: {}, freeAds: { premiumAccess: false, earlyAccessWeeks: 0 }, store: { premiumAccess: false, earlyAccessWeeks: 0 } },
} as never };
const pricing = slice(render('fresh', 'pricing', noOffer), '<footer class="lw-hud', '</footer>');
assert.doesNotMatch(pricing, /lw-hud-read/, 'Pricing before an offer: no number to read');
assert.match(pricing, /class="lw-hud-next" disabled=""><span class="lw-hud-next-words"><b>Choose an offer<\/b>/, 'and nowhere to go until one is chosen');
console.log('PASS HUD: one bar — the step\'s number, money left or short, the fuel line, its blockers, Back as an icon, the next stage big');

/* ── the mission briefing ── */
const briefing = slice(render('fresh', 'blueprint'), '<section class="bl-hero', '</section>');
assert.match(briefing, /aria-label="Mission briefing"/);
assert.match(briefing, /<span class="bl-brief-stamp is-blocked">No go<\/span>/, 'Blocked: NO GO');
assert.equal(count(briefing, /class="bl-pip-glyph"/g), 6, 'Six objectives, each with its stage glyph');
assert.match(briefing, /class="is-blocked" aria-label="Ident — blocked"[\s\S]*?class="bl-pip-mark" aria-hidden="true">!<\/span>/, 'A blocked objective is marked');
const go = slice(render('ready', 'blueprint'), '<section class="bl-hero', '</section>');
assert.match(go, /<span class="bl-brief-stamp is-ready">Go<\/span>/, 'All settled: GO');
assert.match(text(go), /Open in 2 markets · 24M viewers · 1\.2K titles/, 'The mission in one line');
assert.equal(count(go, /class="is-ok"/g), 6, 'Six objectives lit');
console.log('PASS briefing: the stamp (GO / NO GO / N open), the mission line, six objectives with their glyphs');

/* ── the styles: scoped past the wizard's button reset, the current stage breathes but not under reduced motion ── */
const css = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/launch.css'), 'utf8');
for (const rule of ['.sf .lw-seq-stop {', '.sf .lw-hud-next {', '.sf .lw-hud-back {', '.sf .lw-hud-read {', '.sf .lw-hud-ways button {', '.sf .bl-hero-pips button {']) {
    assert.ok(css.includes(rule), `${rule} beats .sf button`);
}
assert.match(css, /\.sf \.lw-seq-stop\.is-now \{[^}]*animation: lw-seq-breathe/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\.sf \.lw-seq-stop\.is-now \{ animation: none;/);
assert.doesNotMatch(css, /\.lw-blockers \{/, 'The loose blocker list\'s rules are gone (.lw-foot stays for the market expansion wizard)');
console.log('PASS styles: scoped buttons, the breathing stage, reduced motion respected, dead rules gone');
console.log('done');
