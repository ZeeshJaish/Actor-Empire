import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as marketModel from '../content-market-exact/model';
import { RegionBoard } from '../components/studio-finance/components/build/RegionBoard';
import { contentMarketFixture } from './helpers/contentMarketFixture';
import { prepareExternalPlayerUpdateForUi } from '../services/playerUiState';
import { refreshStreamingPaidScout, getStreamingPaidScoutQuote } from '../services/paidMarketScouting';
import { getStreamingBuyerAuctionLots } from '../services/streamingBuyerAuctions';

let passed = 0;
const failures: string[] = [];
const check = (name: string, read: () => void) => {
  try { read(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${String(error)}`); }
};

check('acquired result waits for actual presentation, holds three seconds and gates early skip', () => {
  const create = (marketModel as any).createMarketResultPresentation;
  assert.equal(typeof create, 'function', 'Result lifetime must start at presentation rather than transaction completion');
  let clock = 0, next = 0, shown = 0, dismissed = 0;
  const timers = new Map<number, { at: number; read: () => void }>();
  const advance = (ms: number) => {
    clock += ms;
    for (const [id, timer] of [...timers]) if (timer.at <= clock) { timers.delete(id); timer.read(); }
  };
  const setup = () => create({
    schedule: (read: () => void, delay: number) => { const id = ++next; timers.set(id, { at: clock + delay, read }); return id; },
    cancel: (id: number) => timers.delete(id),
    onPresented: () => shown++, onDismiss: () => dismissed++,
  });
  const first = setup();
  advance(10_000);
  assert.equal(first.skip(), false);
  assert.equal(dismissed, 0, 'Slow render must not consume the hold time');
  first.present(); first.present();
  assert.equal(shown, 1);
  advance(2_999); assert.equal(dismissed, 0);
  advance(1); assert.equal(dismissed, 1);
  assert.equal(first.skip(), false, 'An already dismissed result cannot fire again');
  const second = setup(); second.present();
  assert.equal(second.skip(), true);
  advance(3_000); assert.equal(dismissed, 2, 'Skip must cancel automatic dismissal');
  const abandoned = setup(); abandoned.present(); abandoned.dispose();
  const replacement = setup();
  advance(10_000); assert.equal(dismissed, 2, 'Old timers must never dismiss a replacement');
  replacement.present(); advance(3_000); assert.equal(dismissed, 3);
});

check('Build opens at world scope with regions unselected', () => {
  const data: any = {
    company: { name: 'Empire+', week: 1 },
    regions: [{ id: 'NORTH_AMERICA', name: 'North America', line: '' }],
    countries: [{ id: 'country:US', code: 'US', name: 'United States', regionId: 'NORTH_AMERICA', opening: true }],
    markets: [{ id: 'US', code: 'US', name: 'United States', demand: 100, catalogue: 1 }],
    cities: [], listings: [], existing: [], repairs: [], presets: [], campaigns: [],
    team: { priority: 'BALANCED', risk: 'CAREFUL', maxBudget: 1000 },
  };
  const draft: any = { facilities: [], architecture: 'HYBRID', ownedShare: .6, doctrine: 'STANDARD', repairIds: [], mode: 'HANDS', instructions: data.team };
  const totals: any = { racks: 0, compute: 0, weeklyCost: 0, capacity: 0, burst: 0, redundancy: 'SINGLE' };
  const html = renderToStaticMarkup(<RegionBoard data={data} draft={draft} totals={totals} services={[]}
    patch={() => {}} plan={{} as any} handlers={{}} managed={false} teamProposal={null} setTeamProposal={() => {}} />);
  assert.doesNotMatch(html, /aria-expanded="true"/, 'No region should be auto-opened or focused at entry');
});

check('paid scouting replaces its direct offers and preserves the current public auctions and fee', () => {
  let player = prepareExternalPlayerUpdateForUi(contentMarketFixture());
  player.ownedStreamingPlatform.treasuryCash = 1_000_000_000_000;
  const auctionIds = getStreamingBuyerAuctionLots(player).map(row => row.id).sort();
  assert.ok(auctionIds.length > 0);
  let priorPrivateIds: string[] = [];
  for (let index = 0; index < 3; index++) {
    const quote = getStreamingPaidScoutQuote(player);
    const before = player.ownedStreamingPlatform.treasuryCash;
    const result = refreshStreamingPaidScout(player);
    assert.equal(result.changed, true, result.detail);
    player = result.player;
    assert.equal(player.ownedStreamingPlatform.treasuryCash, before - quote.price);
    const ids = player.world.streamingOpportunityMarket!.scoutedOffers!.map(row => row.id);
    assert.equal(ids.length, 20);
    assert.equal(ids.some(id => priorPrivateIds.includes(id)), false);
    assert.deepEqual(getStreamingBuyerAuctionLots(player).map(row => row.id).sort(), auctionIds);
    priorPrivateIds = ids;
  }
});

console.log(JSON.stringify({ passed, failed: failures.length, failures }));
if (failures.length) process.exitCode = 1;
