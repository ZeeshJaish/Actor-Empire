/**
 * #111 Define the Launch: Markets and Clearance (plan §18.10: "सारा सब कुछ एक ही साथ करना है … एक ही साथ कर दो"; Zeesh,
 * 2026-11-01: "काफ़ी ख़राब बटन्स एंड ऑल स्टफ है" … "थोड़ा गेम वाला भी फील आना चाहिए"):
 *  - Markets: the regions as six tiles, each a meter of its markets taken; a region bar of readouts (chosen, viewers,
 *    filing energy) that opens the footprint, beside one Add all / Remove all control; a market added and dropped with
 *    one switch (a bloc's switch half-lit when partly taken), beside Full report / Pick countries;
 *  - Clearance: the count a gauge with a legend for the bar's colours; the note reads the whole board (it said "Nothing
 *    filed yet" with every market cleared); the review's five stages named under their dots;
 *  - Define the Launch's buttons are lit keys (`.sf.dl`), Build keeps its own.
 * Renders with react-dom/server. (~1 s)
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Country, LaunchData, LaunchDraft } from '../components/studio-finance/finance/launch';
import type { StepProps } from '../components/studio-finance/components/launch/LaunchWizard';
import { StepMarkets } from '../components/studio-finance/components/launch/StepMarkets';
import { StepClearance } from '../components/studio-finance/components/launch/StepClearance';
import { shellCountry, shellData, shellDraft } from './fixtures/streaming-launch-shell-data';

const REGIONS = ['North America', 'South America', 'Europe', 'Africa', 'Asia', 'Oceania'];
const hero = (id: string, name: string): Country => ({ ...shellCountry(id, name, id), featured: true });
const bloc = (id: string, name: string): Country => ({ ...shellCountry(id, name, id), featured: false, subRegionId: 'CARIB', subRegion: 'Caribbean' });
const countries = [hero('US', 'United States'), hero('CA', 'Canada'), bloc('JM', 'Jamaica'), bloc('BS', 'Bahamas'),
    { ...hero('BR', 'Brazil'), region: 'South America' }];

const props = (selected: string[], clearance: LaunchData['clearance'] = []): StepProps => {
    const data = { ...shellData('fresh'), regions: REGIONS, countries, selectedCountryIds: selected, clearance } as LaunchData;
    const draft: LaunchDraft = { ...shellDraft('fresh'), selectedCountryIds: selected };
    return {
        data, draft, patch: () => undefined, chosen: countries.filter(c => selected.includes(c.id)),
        treasury: data.treasury, free: 100_000_000, gap: 0, handlers: {},
    };
};
const text = (markup: string) => markup.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/* ── Markets ── */
const markets = renderToStaticMarkup(createElement(StepMarkets, props(['US', 'JM'])));
assert.equal((markets.match(/class="lw-theatre[ "]/g) ?? []).length, 6, 'Six region tiles');
assert.match(markets, /aria-label="North America: 2 of 4 markets chosen" class="lw-theatre is-on has-picks"[\s\S]*?<i style="width:50%"><\/i>/,
    'The region you are in is lit, its meter filled to what is taken');
assert.match(markets, /aria-label="South America: 0 of 1 markets chosen" class="lw-theatre"/, 'An untouched region is dark');
assert.match(text(markets), /Chosen 2 \/4 Viewers 24M To file \d+E ›/, 'The region bar reads like instruments');
assert.match(markets, /<button type="button" class="lw-bulk"><i aria-hidden="true">\+<\/i>Add all 4<\/button>/, 'Add all, while any is left');
assert.match(renderToStaticMarkup(createElement(StepMarkets, props(['US', 'CA', 'JM', 'BS']))), /class="lw-bulk is-on"><i aria-hidden="true">−<\/i>Remove all/,
    'and Remove all once the region is taken: one control both ways');
assert.match(markets, /class="lw-switch is-on" aria-pressed="true"><span>On opening day<\/span>/, 'A chosen market: the switch on');
assert.match(markets, /class="lw-switch" aria-pressed="false"><span>Add to opening day<\/span>/, 'An unchosen market: the switch off');
assert.match(markets, /class="lw-report"><svg[\s\S]*?<\/svg>Full report<\/button>/, 'Full report beside it');
assert.match(markets, /class="lw-report"><svg[\s\S]*?<\/svg>Pick countries<\/button>/, 'A bloc opens to pick its countries');
assert.match(markets, /class="lw-switch is-part" aria-pressed="false"><span>1 of 2 · add all<\/span>/, 'A bloc partly taken: the switch half-lit');
assert.doesNotMatch(markets, /class="lw-regions"|class="lw-region |lw-regionhead|lw-regionsum-facts/, 'The chips and the old summary line are gone');
console.log('PASS markets: six region tiles with meters, the region bar\'s readouts and one Add all / Remove all, a switch a market');

/* ── Clearance ── */
const none = renderToStaticMarkup(createElement(StepClearance, props(['US', 'CA'])));
assert.match(none, /class="cl-legend"[^>]*><li class="is-none"><i><\/i>2 not filed<\/li><\/ul>/, 'The legend names the bar\'s colours');
assert.match(none, /Nothing filed yet\. Reviews run 4–6 weeks once they start\./);
const all = renderToStaticMarkup(createElement(StepClearance, props(['US', 'CA'], [
    { countryId: 'US', outcome: 'APPROVED', stage: 'APPROVAL' }, { countryId: 'CA', outcome: 'APPROVED', stage: 'APPROVAL' }])));
assert.match(all, /Every market is cleared for opening day\./, 'Every market cleared: the note says so');
assert.doesNotMatch(all, /Nothing filed yet/, '(it said "Nothing filed yet" with every market cleared)');
const mixed = renderToStaticMarkup(createElement(StepClearance, props(['US', 'CA'], [{ countryId: 'US', outcome: 'IN_REVIEW', stage: 'REGULATORY' }])));
assert.match(text(mixed), /1 in review 1 not filed/, 'Mixed: each colour counted');
assert.match(none, /class="cl-track-names" aria-hidden="true"><span>Filed<\/span><span>Access<\/span><span>Review<\/span><span>Data<\/span><span>Approval<\/span>/,
    'The five stages named under their dots');
assert.match(mixed, /<span class="is-done">Filed<\/span><span class="is-done">Access<\/span><span class="is-done">Review<\/span><span>Data<\/span>/,
    'and lit up to the stage the filing is on');
console.log('PASS clearance: a gauge with a legend, the note reads the whole board, the five stages named');

/* ── the buttons ── */
const css = readFileSync(resolve(process.cwd(), 'components/studio-finance/styles/launch.css'), 'utf8');
assert.match(css, /\.sf\.dl \.sf-btn--primary \{[^}]*radial-gradient/, 'Define the Launch\'s primary buttons are lit keys');
assert.ok(readFileSync(resolve(process.cwd(), 'components/studio-finance/components/launch/LaunchWizard.tsx'), 'utf8').includes('className="sf lw dl"'),
    'scoped to Define the Launch (Build is .sf.lw.bw)');
for (const rule of ['.sf .lw-theatre {', '.sf .lw-switch {', '.sf .lw-report {', '.sf .lw-bulk {', '.sf .lw-regionsum {']) assert.ok(css.includes(rule), `${rule} beats .sf button`);
console.log('PASS buttons: lit keys inside Define the Launch only; every new control scoped past the reset');
console.log('done');
