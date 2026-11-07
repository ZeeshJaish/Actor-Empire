/** #189 (plan §22.4): the listing wizard, redesigned as the one flow.
 *  - THE ASK is the only place the ticker and the float are chosen: four suggestions or your own, the worth from our
 *    value (the valuation engine's), and the float as a % (10–30%, 20% to start);
 *  - THE TABLE seats your CFO, your CTO and the board with their faces; a listing saved at an old scene resumes at the
 *    one that took its place (the resolution → the ask; the CFO, the CTO, the board → the table; the cover → the data
 *    room; the after-bill → listing day);
 *  - the float is a % of the company, so a big company is no longer held to 40M new shares (#173's float bug);
 *  - MARKETS shows what a 10–30% float would raise and leave you, and no float picker of its own;
 *  - the old roadshow is gone: a company lists only through the listing's own commit. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingPublicMarkets, startStreamingCinematicIpoJourney } from '../services/streamingPublicMarkets';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { Listing, sharesForFloat, type StreamingListingCheckpoint } from '../components/streaming-transplant/StreamingListingExperience';
import type { StreamingIpoPresentationInputs } from '../components/streaming-transplant/streamingIpoPresentationModel';

const fresh = (id: string): Player => {
    const player = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id, name: 'Listing Audit', age: 15, currentWeek: 1 });
    return { ...player, energy: { current: 100, max: 100 }, flags: { ...player.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } };
};
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ');
const pass = (label: string) => console.log(`✓ ${label}`);
const brand = { name: 'NORTHSTAR+', markId: 'NONE', customMark: null, hue: 212, sat: 72, identId: 'NONE', customIdent: null, promiseId: 'NONE', publicManifesto: '', layoutId: 'cinema', typeId: 'GROTESK', accentHue: 30, identMode: 'none', identLen: 2, ratingId: 'ALL', lockupId: 'WORDMARK', serverCity: null } as never;

async function main() {
    const started = performance.now();

    /* ── the source: the old roads are gone ── */
    const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');
    const markets = read('services/streamingPublicMarkets.ts');
    const wizard = read('components/streaming-transplant/StreamingListingExperience.tsx');
    const marketsTab = read('components/streaming-transplant/BoardroomMarkets.tsx');
    assert.ok(!markets.includes('export const startStreamingIpoRoadshow') && !markets.includes('export const listStreamingPlatform'), 'the old roadshow is gone');
    for (const scene of ['RESOLUTION', 'CFO', 'CTO', 'BOARD', 'STANDS', 'AFTER']) assert.ok(!wizard.includes(`{scene === '${scene}'`), `no ${scene} scene`);
    assert.ok(!marketsTab.includes('floatPick'), "MARKETS has no float picker of its own");
    pass('the old roadshow, the six old scenes and MARKETS’ float picker are gone');

    /* ── the float as a % ── */
    assert.equal(sharesForFloat(500_000_000, 10), 55_500_000);
    assert.equal(sharesForFloat(500_000_000, 20), 125_000_000);
    assert.equal(sharesForFloat(500_000_000, 30), 214_250_000);
    pass('a float as a %: 500M shares sell 55.5M new ones for 10%, 125M for 20%, 214.25M for 30%');

    /* ── THE ASK ── */
    const inputs: StreamingIpoPresentationInputs = {
        founderName: 'Listing Audit', founderPct: 56, subscribers: 21_000_000, arpu: 8, churnPct: 2.2, peakLoad: 11.4, techDebt: 0, weeklyNet: 47_000_000,
        treasury: 1_900_000_000, checks: [], risks: [], rivals: ['Rival One', 'Rival Two'],
        executiveNames: { cfo: 'Rafael Silva', cto: 'Marcus Vale', coo: 'Ava Chen' },
        boardSeats: [{ id: 'founder', name: 'Listing Audit', kind: 'FOUNDER · CHAIR' }, { id: 'd1', name: 'Meera Sen', kind: 'INDEPENDENT' }],
        preIpoShares: 500_000_000, initialNewShares: sharesForFloat(500_000_000, 20), simulationSeed: 'listing-audit', absoluteWeek: 900, fairValue: 6_600_000_000,
        people: { 'Rafael Silva': { gender: 'MALE' }, 'Marcus Vale': { gender: 'MALE' }, 'Ava Chen': { gender: 'FEMALE' }, 'Meera Sen': { gender: 'FEMALE' }, 'Listing Audit': { gender: 'FEMALE' } },
    };
    const render = (checkpoint: Partial<StreamingListingCheckpoint> | null) => renderToStaticMarkup(
        <Listing brand={brand} inputs={inputs} onDone={() => undefined} onBack={() => undefined}
            initialCheckpoint={checkpoint ? ({ ask: 6_600_000_000, shares: 125_000_000, revision: 1, bankId: null, marks: [], omit: {}, answers: {}, attempt: 1, diligenceWeeks: 0, cut: 0, lowPrice: 0, highPrice: 0, anchorDiscountAccepted: null, employeeQuotaPercent: 2, interviewMove: 0, book: null, closePrice: 0, ticker: 'NSTR', ...checkpoint } as StreamingListingCheckpoint) : null} />,
    );
    const ask = text(render(null));
    for (const words of ['Shape the listing', 'YOUR NAME ON THE STOCK MARKET', 'EMPIRE EXCHANGE', 'YOUR OWN', 'WHAT IT IS WORTH', '1.00× our value', 'Our value: $6.60B', 'HOW MUCH YOU SELL', '20%', '125.0M new shares', 'A SHARE', 'RAISES', 'YOU KEEP', 'TAKE IT TO THE TABLE'])
        assert.ok(ask.includes(words), `THE ASK shows "${words}"`);
    pass('THE ASK: the ticker on the plate with four suggestions and TYPE, the worth from our value ($6.60B, 1.00×), the float at 20% (125.0M new shares), one gold action');

    /* ── old scenes resume at the new ones ── */
    assert.ok(text(render({ scene: 'RESOLUTION' } as never)).includes('Shape the listing'), 'the resolution → the ask');
    const tableHtml = render({ scene: 'CFO' } as never);
    const table = text(tableHtml);
    for (const words of ['THE TABLE', 'Rafael Silva', 'CHIEF FINANCIAL OFFICER', 'Marcus Vale', 'CHIEF TECHNOLOGY OFFICER', 'THE BOARD · CARRIES ON 4', 'SEND IT ROUND THE TABLE'])
        assert.ok(table.includes(words), `THE TABLE shows "${words}"`);
    const faces = (tableHtml.match(/<img /g) || []).length;
    assert.ok(faces >= 6, `faces at the table (${faces})`);
    assert.ok(text(render({ scene: 'BOARD' } as never)).includes('THE TABLE') && text(render({ scene: 'CTO' } as never)).includes('THE TABLE'));
    pass(`a listing saved at the resolution resumes at the ask, at the CFO, the CTO or the board at the table; ${faces} faces at the table`);

    /* ── the services ── */
    let player = await buildStreamingFullPlatformQa(fresh('listing-wizard'), { processWeek: processGameWeek, persistWeek: async next => next });
    player = { ...player, energy: { current: 100, max: 100 } };
    const view = getStreamingPublicMarkets(player);
    const preIpoShares = Math.max(5_000_000, Math.min(500_000_000, Math.round(view.valuation / 10 / 250_000) * 250_000));
    const big = sharesForFloat(preIpoShares, 20);
    assert.ok(big > 40_000_000, 'a 20% float is more than the old 40M cap');
    const journey = startStreamingCinematicIpoJourney(player, { ticker: 'WIZD', ask: view.valuation, shares: big });
    assert.ok(journey.changed, journey.reason);
    const saved = platformOf(journey.player).publicCompany.ipoJourney!;
    assert.equal(saved.scene, 'ASK', 'the listing opens on the ask');
    assert.equal(saved.shares, big, 'the journey keeps a big float');
    const listed = listStreamingCompanyForQa(player, { ticker: 'WIZD', floatPercent: 30 });
    assert.ok(listed.changed, listed.reason);
    const listing = platformOf(listed.player).publicCompany.listing!;
    assert.ok(Math.abs(listing.offerPercent - 30) < 0.2 && listing.newShares > 40_000_000, `the float listed is the float chosen (${listing.offerPercent}%, ${(listing.newShares / 1e6).toFixed(1)}M new shares)`);
    pass(`#173's float bug: a ${(view.valuation / 1e9).toFixed(1)}B company opens on ${(big / 1e6).toFixed(0)}M new shares (20%) and lists 30% as ${(listing.newShares / 1e6).toFixed(1)}M (the old cap held every float to 40M)`);

    /* ── MARKETS before listing ── */
    const desk = getStreamingListingDesk(player);
    assert.deepEqual([desk.range.low.percent, desk.range.high.percent], [10, 30]);
    assert.ok(desk.range.low.raise < desk.range.high.raise && desk.range.low.keep > desk.range.high.keep);
    assert.equal(getStreamingListingDesk(journey.player).ticker, 'WIZD', 'a listing under way shows its own ticker');
    pass(`MARKETS before listing: selling 10–30% raises $${(desk.range.low.raise / 1e9).toFixed(2)}–${(desk.range.high.raise / 1e9).toFixed(2)}B and leaves you ${desk.range.high.keep}–${desk.range.low.keep}%; a listing under way shows its ticker`);

    console.log(`\nlisting wizard audit passed in ${((performance.now() - started) / 1000).toFixed(1)}s`);
}

main().catch(error => {
    console.error(error);
    process.exit(1);
});
