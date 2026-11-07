/**
 * #215: your name on the stock market. Chosen on MARKETS before the listing; two to five letters; not one another company
 * trades under; the listing starts from it and lists under it; once it has begun, it is settled.
 */
import assert from 'node:assert/strict';
import { INITIAL_PLAYER, type Player } from '../types';
import { migratePlayerSave } from '../services/saveMigration';
import { processGameWeek } from '../services/gameLoop';
import { buildStreamingFullPlatformQa } from '../services/streamingFullPlatformQa';
import { normalizeOwnedStreamingPlatformState } from '../services/ownedStreamingPlatform';
import { getStreamingListingDesk } from '../services/streamingListingDesk';
import { getStreamingPublicMarkets, startStreamingCinematicIpoJourney } from '../services/streamingPublicMarkets';
import { listStreamingCompanyForQa } from '../services/streamingListingQa';
import { cleanStreamingTicker, setStreamingProposedTicker, streamingTickerProblem } from '../services/streamingTicker';

const auditStart = Date.now();
const pass = (label: string) => console.log(`✓ ${label}`);
const platformOf = (player: Player) => normalizeOwnedStreamingPlatformState(player.ownedStreamingPlatform, player.id);

const main = async () => {
    const seed = migratePlayerSave({ ...structuredClone(INITIAL_PLAYER), id: 'ticker', name: 'Ticker Founder', age: 40, currentWeek: 1 });
    const base = await buildStreamingFullPlatformQa({ ...seed, energy: { current: 100, max: 100 }, flags: { ...seed.flags, weeklyBaseEnergyRemaining: 100, bonusEnergyBank: 0 } }, { processWeek: processGameWeek, persistWeek: async next => next });

    /* the rules */
    assert.equal(cleanStreamingTicker('st4r plus!'), 'STRPL', 'letters only, five at most');
    assert.match(streamingTickerProblem(base, 'A') || '', /2 to 5 letters/);
    assert.match(streamingTickerProblem(base, 'aapl') || '', /Apple/, 'another company\'s symbol');
    assert.equal(streamingTickerProblem(base, 'star'), null);
    assert.equal(setStreamingProposedTicker(base, 'NFLX').changed, false, 'Netflix has it');
    pass('two to five letters, and not one another company trades under');

    /* chosen, it is everywhere */
    const before = getStreamingListingDesk(base);
    assert.ok(before.tickerFrom, 'yours to choose');
    const chosen = setStreamingProposedTicker(base, 'star');
    assert.ok(chosen.changed, chosen.message);
    assert.equal(getStreamingListingDesk(chosen.player).ticker, 'STAR');
    assert.equal(getStreamingPublicMarkets(chosen.player).suggestedTicker, 'STAR', 'the listing starts from it');
    const reloaded = migratePlayerSave(JSON.parse(JSON.stringify(chosen.player)));
    assert.equal(platformOf(reloaded).publicCompany.proposedTicker, 'STAR', 'and a reload keeps it');
    pass(`${before.ticker} was only a suggestion: STAR is on the plate, and the listing starts from it`);

    /* a listing under way can still change it */
    const started = startStreamingCinematicIpoJourney({ ...chosen.player, energy: { current: 100, max: 100 } }, { ticker: 'STAR', ask: 1_000_000_000, shares: 10_000_000 });
    assert.ok(started.changed, started.reason);
    assert.equal(getStreamingListingDesk(started.player).ticker, 'STAR');
    assert.ok(getStreamingListingDesk(started.player).tickerFrom, 'still yours to choose');
    const changedMidway = setStreamingProposedTicker(started.player, 'NSTR');
    assert.ok(changedMidway.changed, changedMidway.message);
    assert.equal(platformOf(changedMidway.player).publicCompany.ipoJourney!.ticker, 'NSTR', 'the listing under way takes it');
    assert.equal(getStreamingListingDesk(changedMidway.player).ticker, 'NSTR');
    pass('a listing under way can still change it');

    /* listed under it */
    const listed = listStreamingCompanyForQa(chosen.player);
    assert.ok(listed.changed, listed.reason);
    const desk = getStreamingListingDesk(listed.player);
    assert.equal(desk.share?.ticker, 'STAR', 'the stock trades under it');
    assert.equal(desk.tickerFrom, null, 'settled');
    assert.equal(setStreamingProposedTicker(listed.player, 'NEWS').changed, false, 'and it cannot change');
    pass('it lists as STAR, and once listed it is settled');

    console.log(`Ticker audit passed in ${Math.round((Date.now() - auditStart) / 1000)} s.`);
};

main().catch(error => { console.error(error); process.exit(1); });
