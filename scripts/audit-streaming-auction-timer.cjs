// Real auction services and room handlers, with only React scheduling replaced
// by a deterministic hook/clock harness. No browser, storage, or career writes.
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const Module = require('node:module');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'auction-timer-'));
const options = { bundle: true, platform: 'node', format: 'cjs', external: ['react'],
  loader: { '.csv': 'text', '.css': 'empty' }, logLevel: 'silent',
  tsconfigRaw: { compilerOptions: { jsx: 'react' } } };
esbuild.buildSync({ ...options, stdin: { contents: `
  export * from './services/streamingBuyerAuctions';
  export * from './services/streamingPresentationInputs';
  export * from './services/ownedStreamingPlatform';
  export * from './services/streamingRightsCore';
  export * from './services/streamingCommercialOffers';
  export * from './services/streamingPlatformEcosystem';
  export * from './services/playerUiState';
  export * from './scripts/helpers/contentMarketFixture';
  export {default as Room} from './components/StreamingBuyerAuctionRoom';
`, resolveDir: process.cwd(), loader: 'ts' }, outfile: path.join(dir, 'current.cjs') });
// Fixed pre-task implementation is an independent oracle for clock/rivals,
// reconciliation, anti-sniping, and final canonical settlement.
esbuild.buildSync({ ...options, stdin: {
  contents: execFileSync('git', ['show', '610d364:services/streamingBuyerAuctions.ts'], { encoding: 'utf8' }),
  resolveDir: path.resolve('services'), loader: 'ts',
}, outfile: path.join(dir, 'baseline.cjs') });

let activeHarness;
const hooks = {
  createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
  forwardRef: value => value,
  useRef: value => activeHarness.ref(value),
  useState: value => activeHarness.state(value),
  useMemo: (fn, deps) => activeHarness.memo(fn, deps),
  useEffect: (fn, deps) => activeHarness.effect(fn, deps),
};
const load = Module._load;
Module._load = function(request, ...args) { return request === 'react' ? hooks : load.call(this, request, ...args); };
const api = require(path.join(dir, 'current.cjs'));
const baseline = require(path.join(dir, 'baseline.cjs'));
Module._load = load;
const sameDeps = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
let now = 1000;
const realNow = Date.now;
Date.now = () => now;
const timers = new Map();
const deferred = [];
let timerId = 0;
global.window = {
  setInterval: fn => { timers.set(++timerId, fn); return timerId; },
  clearInterval: id => timers.delete(id),
  setTimeout: fn => { deferred.push(fn); return ++timerId; },
};
global.requestAnimationFrame = fn => { deferred.push(fn); return ++timerId; };
global.cancelAnimationFrame = () => {};
const harness = () => ({
  slots: [], cursor: 0, pending: [],
  ref(value) { const i = this.cursor++; return this.slots[i] ||= { current: value }; },
  state(initial) { const slot = this.ref(typeof initial === 'function' ? initial() : initial);
    return [slot.current, value => { slot.current = typeof value === 'function' ? value(slot.current) : value; }]; },
  memo(fn, deps) { const i = this.cursor++; const slot = this.slots[i];
    if (!slot || !sameDeps(slot.deps, deps)) this.slots[i] = { value: fn(), deps };
    return this.slots[i].value; },
  effect(fn, deps) { const i = this.cursor++; const slot = this.slots[i];
    if (!slot || !sameDeps(slot.deps, deps)) this.pending.push(() => {
      slot?.cleanup?.(); this.slots[i] = { deps, cleanup: fn() };
    }); },
  render(player, session, update = () => {}) {
    this.cursor = 0; activeHarness = this;
    const tree = api.Room({ player, session, onUpdatePlayer: update, onExit() {} });
    this.pending.splice(0).forEach(fn => fn()); return tree;
  },
  close() { this.slots.forEach(slot => slot?.cleanup?.()); },
});
const findNode = (node, predicate) => {
  if (!node || typeof node !== 'object') return null;
  if (predicate(node)) return node;
  return (node.props?.children || []).flat(Infinity).map(child => findNode(child, predicate)).find(Boolean);
};
const fixture = (rivals = 3) => {
  const player = api.contentMarketFixture();
  player.world.studios['seller-cm1'] = { id: 'seller-cm1', name: 'Fixture studio' };
  const ecosystem = api.normalizeStreamingPlatformEcosystem(undefined, 1312);
  Object.values(ecosystem.operators).forEach((operator, index) => {
    operator.cashMillions = index < rivals ? 500000 : 0; operator.activeCountryIds = ['US', 'IN'];
  });
  player.world.streamingPlatformEcosystem = ecosystem;
  const lot = api.getStreamingBuyerAuctionLots(player).find(row => row.listingKind === 'TITLE' && !row.upcomingRightsSaleId);
  const opened = api.openStreamingBuyerAuction(player, lot.id, now);
  assert.ok(opened.session);
  // Initial defaults first materialize universe fixtures; the second pass is
  // the canonical UI shape used by a loaded career.
  opened.player = api.prepareTrustedMarketUpdateForUi(api.prepareTrustedMarketUpdateForUi(opened.player));
  return { ...opened, session: opened.player.ownedStreamingPlatform.buyerAuctionSessions.find(row => row.id === opened.session.id) };
};
const largeFixture = () => {
  const opened = fixture();
  const player = opened.player;
  const template = api.createStreamingLicenseContract({
    id: 'retained', sourceProject: { id: 'retained-title', title: 'Retained title', mediaType: 'MOVIE', genre: 'DRAMA' },
    buyerPlatformId: null, platformContentPlanId: null, cataloguePackageId: null, licensorName: 'Fixture studio',
    territory: 'GLOBAL', countryIds: ['US', 'IN'], durationWeeks: 104, exclusivity: 'NON_EXCLUSIVE',
    minimumGuarantee: 200000, platformRevenueShare: 90, signedAtAbsoluteWeek: 1300, startsAtAbsoluteWeek: 1300,
    marketingGuarantee: 300000, sublicensingAllowed: true, sequelRightsIncluded: true,
    accessGrant: { schemaVersion: 1, modes: ['RENTAL'], earlyWindowWeeks: 0, purchaseFulfillment: 'NONE', source: 'EXPLICIT' },
  });
  player.ownedStreamingPlatform.catalogLicenses = Array.from({ length: 5000 }, (_, index) => ({
    ...template, id: `retained-${index}`, sourceProjectId: `retained-title-${index}`,
  }));
  player.ownedStreamingPlatform.catalogProjectIds = player.ownedStreamingPlatform.catalogLicenses.map(row => row.sourceProjectId);
  player.world.streamingRightsContracts = Object.fromEntries(player.ownedStreamingPlatform.catalogLicenses.map(row => [row.id, row]));
  return { ...opened, player };
};
const observeLicenses = player => {
  let reads = 0;
  const licenses = player.ownedStreamingPlatform.catalogLicenses.map(row => {
    const observed = { ...row };
    Object.defineProperty(observed, 'minimumGuarantee', { enumerable: true, get() { reads++; return row.minimumGuarantee; } });
    return observed;
  });
  return { player: { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, catalogLicenses: licenses } },
    reads: () => reads, reset: () => { reads = 0; } };
};
let passed = 0;
const failures = [];
const check = (name, run) => {
  try { run(); passed++; console.log(`PASS ${name}`); }
  catch (error) { failures.push(name); console.error(`FAIL ${name}: ${error.message}`); }
  finally { timers.clear(); deferred.length = 0; now = 1000; }
};
try {
  const large = largeFixture();
  check('three live ticks preserve 5000 licences without traversing their fields', () => {
    const observed = observeLicenses(large.player);
    let player = observed.player;
    for (let second = 1; second <= 3; second++) player = api.advanceStreamingBuyerAuction(player, large.session.id, 1, 1000 + second * 1000).player;
    console.log(`  catalogue field reads: ${observed.reads()}`);
    assert.equal(observed.reads(), 0);
    assert.equal(player.ownedStreamingPlatform.catalogLicenses, observed.player.ownedStreamingPlatform.catalogLicenses);
    assert.equal(player.world, large.player.world);
  });
  check('room timer/session and inbox renders reuse presentation; terminal rooms schedule no work', () => {
    const observed = observeLicenses(large.player);
    let player = observed.player;
    const room = harness();
    const update = value => { player = value; };
    try {
      room.render(player, large.session, update); observed.reset();
      now = 2000;
      [...timers.values()].forEach(fn => fn());
      const tickReads = observed.reads();
      player = api.prepareTrustedMarketUpdateForUi(player);
      assert.ok(api.reuseStreamingPresentationSource(observed.player, player, 'AUCTION_ROOM') === observed.player, 'timer/trusted UI inputs are reusable');
      assert.ok(api.reuseStreamingPresentationSource(observed.player, player) === observed.player, 'HQ and market presentation also reuse clock-only updates');
      room.render(player, player.ownedStreamingPlatform.buyerAuctionSessions.find(row => row.id === large.session.id), update);
      const renderReads = observed.reads();
      player = { ...player, inbox: [...player.inbox] };
      room.render(player, player.ownedStreamingPlatform.buyerAuctionSessions.find(row => row.id === large.session.id), update);
      console.log(`  room catalogue reads tick=${tickReads} render=${renderReads} inbox=${observed.reads()}`);
      assert.equal(observed.reads(), 0);
      const terminal = { ...large.session, status: 'NO_SALE' };
      room.render(player, terminal, update);
      assert.equal(timers.size, 0);
    } finally { room.close(); }
  });
  check('already terminal mount installs no interval and does not normalize catalogue', () => {
    const terminal = { ...large.session, status: 'NO_SALE' };
    const player = { ...large.player, ownedStreamingPlatform: { ...large.player.ownedStreamingPlatform, buyerAuctionSessions: [terminal] } };
    const room = harness();
    try { room.render(player, terminal); assert.equal(timers.size, 0); }
    finally { room.close(); }
    const observed = observeLicenses(player);
    assert.equal(api.advanceStreamingBuyerAuction(observed.player, terminal.id).reason, 'NOT_LIVE');
    assert.equal(api.reconcileStreamingBuyerAuction(observed.player, terminal.id).reason, 'NOT_LIVE');
    assert.equal(observed.reads(), 0);
  });
  check('catchup and live final tick stop scheduling before the parent rerenders', () => {
    for (const catchup of [false, true]) {
      const opened = fixture(0), room = harness();
      let player = opened.player;
      const session = { ...opened.session, roomSecondsRemaining: 1 };
      player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, buyerAuctionSessions: [session] } };
      try {
        if (catchup) now = 80000;
        room.render(player, session, result => { player = result; });
        if (!catchup) { assert.equal(timers.size, 1); now = 2000; [...timers.values()].forEach(fn => fn()); }
        assert.equal(player.ownedStreamingPlatform.buyerAuctionSessions[0].status, 'NO_SALE');
        assert.equal(timers.size, 0);
      } finally { room.close(); now = 1000; }
    }
  });
  check('clock/rival events, anti-sniping, catchup and settlement match pre-task canonical service', () => {
    const opened = fixture(5);
    let actual = opened.player, expected = structuredClone(opened.player);
    for (let second = 1; second <= 76; second++) {
      if ([10, 14].includes(second)) {
        const terms = { minimumGuarantee: 20000000 + second * 100000, licensorRevenueShare: 0, marketingGuarantee: 0, futureGreenlight: false };
        actual = api.placeStreamingBuyerAuctionBid(actual, opened.session.id, terms, second * 1000).player;
        expected = baseline.placeStreamingBuyerAuctionBid(expected, opened.session.id, terms, second * 1000).player;
      }
      actual = api.advanceStreamingBuyerAuction(actual, opened.session.id, 1, (second + 1) * 1000).player;
      expected = baseline.advanceStreamingBuyerAuction(expected, opened.session.id, 1, (second + 1) * 1000).player;
      assert.deepEqual(actual, expected, `second ${second}`);
    }
    const resumed = api.reconcileStreamingBuyerAuction(opened.player, opened.session.id, 25000);
    assert.deepEqual(resumed, baseline.reconcileStreamingBuyerAuction(structuredClone(opened.player), opened.session.id, 25000));
  });
  check('timer then JSON reload retains all 5000 refs, explicit terms, registry and treasury', () => {
    const ticked = api.advanceStreamingBuyerAuction(large.player, large.session.id, 3, 4000).player;
    const reloaded = JSON.parse(JSON.stringify(ticked));
    reloaded.ownedStreamingPlatform = api.normalizeOwnedStreamingPlatformState(reloaded.ownedStreamingPlatform, reloaded.id);
    const canonical = api.normalizeOwnedStreamingPlatformState(large.player.ownedStreamingPlatform, large.player.id);
    assert.equal(reloaded.ownedStreamingPlatform.catalogLicenses.length, 5000);
    reloaded.ownedStreamingPlatform.catalogLicenses.forEach((row, index) => assert.deepEqual(row, canonical.catalogLicenses[index], `licence ${index}`));
    assert.deepEqual(reloaded.ownedStreamingPlatform.catalogProjectIds, canonical.catalogProjectIds);
    assert.equal(JSON.stringify(reloaded.world.streamingRightsContracts), JSON.stringify(large.player.world.streamingRightsContracts));
    assert.equal(reloaded.ownedStreamingPlatform.treasuryCash, canonical.treasuryCash);
  });
  check('legacy malformed/session duplicates use the same bounded fresh parser', () => {
    const opened = fixture();
    const sessions = [null, {}, ...Array.from({ length: 44 }, (_, i) => ({ ...opened.session, id: `legacy-${i}`, activeSecondsElapsed: '2', roomSecondsRemaining: 100 }))];
    const player = { ...opened.player, ownedStreamingPlatform: { ...opened.player.ownedStreamingPlatform, buyerAuctionSessions: sessions } };
    const actual = api.advanceStreamingBuyerAuction(player, 'legacy-43', 1, 2000);
    const expected = baseline.advanceStreamingBuyerAuction(player, 'legacy-43', 1, 2000);
    assert.deepEqual(actual.session, expected.session);
    assert.deepEqual(actual.player.ownedStreamingPlatform.buyerAuctionSessions, expected.player.ownedStreamingPlatform.buyerAuctionSessions);
    assert.equal(actual.player.ownedStreamingPlatform.buyerAuctionSessions.length, 40);
    assert.equal(api.advanceStreamingBuyerAuction(player, 'legacy-0').reason, 'NOT_FOUND');
  });
  check('presentation invalidates on current rights, funds, configuration, countries, week and continuation inputs', () => {
    const { player } = fixture();
    const platformChanges = {
      treasuryCash: 1,
      costCommitments: [{ id: 'new-reserve', status: 'COMMITTED', committedAmount: 1000000 }],
      catalogLicenses: [{ id: 'new-grant', accessGrant: { modes: ['RENTAL'] } }],
      marketOperations: [{ countryId: 'JP' }],
      serviceConfiguration: { ...player.ownedStreamingPlatform.serviceConfiguration, revision: 99 },
      rightsObligations: [{ id: 'new-continuation' }],
      originalCommissions: [{ id: 'new-season' }],
      unknownFutureAuthority: 'changed',
    };
    for (const [key, value] of Object.entries(platformChanges)) {
      const current = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, [key]: value } };
      assert.ok(api.reuseStreamingPresentationSource(player, current, 'AUCTION_ROOM') === current, key);
    }
    for (const key of ['projects', 'streamingRightsContracts', 'streamingPlatformEcosystem', 'streamingCataloguePackages']) {
      const current = { ...player, world: { ...player.world, [key]: structuredClone(player.world[key] || {}) } };
      assert.ok(api.reuseStreamingPresentationSource(player, current, 'AUCTION_ROOM') === current, key);
    }
    for (const key of ['currentWeek', 'age']) {
      const current = { ...player, [key]: player[key] + 1 };
      assert.ok(api.reuseStreamingPresentationSource(player, current, 'AUCTION_ROOM') === current, key);
    }
    const continuation = { ...player, commitments: [...player.commitments, { id: 'new-sequel' }] };
    assert.ok(api.reuseStreamingPresentationSource(player, continuation, 'AUCTION_ROOM') === continuation);
  });
  check('mutable default backend and bid APIs see grant and cash changes after timer', () => {
    const opened = fixture(0);
    const player = api.advanceStreamingBuyerAuction(opened.player, opened.session.id, 1, 2000).player;
    const platform = player.ownedStreamingPlatform;
    platform.serviceConfiguration.pricing = api.configureStreamingPricingOffer(platform.serviceConfiguration.pricing, { kind: 'CORE', coreModel: 'STORE' });
    const lot = platform.buyerAuctionSessions[0].lot;
    lot.sourceLicenseId = 'current-grant';
    platform.catalogLicenses.push({ id: 'current-grant', accessGrant: { schemaVersion: 1, modes: ['RENTAL'], source: 'EXPLICIT', earlyWindowWeeks: 0, purchaseFulfillment: 'NONE' } });
    const terms = { minimumGuarantee: lot.minimumGuarantee, licensorRevenueShare: 4, marketingGuarantee: 0, futureGreenlight: false };
    assert.equal(api.getStreamingBuyerAuctionBackendCapability(player, lot).rental, true);
    platform.catalogLicenses.at(-1).accessGrant.modes = ['SUBSCRIPTION'];
    assert.equal(api.getStreamingBuyerAuctionBackendCapability(player, lot).rental, false);
    assert.equal(api.placeStreamingBuyerAuctionBid(player, opened.session.id, terms, 2001).changed, false);
    platform.treasuryCash = 0;
    assert.equal(api.placeStreamingBuyerAuctionBid(player, opened.session.id, { ...terms, licensorRevenueShare: 0 }, 2002).reason, 'INSUFFICIENT_TREASURY');
  });
  check('settlement rechecks changed source and cash, and never charges twice', () => {
    for (const mutation of ['cash', 'source']) {
      const opened = fixture(0);
      const terms = { minimumGuarantee: 100000000, licensorRevenueShare: 0, marketingGuarantee: 0, futureGreenlight: false };
      const bid = api.placeStreamingBuyerAuctionBid(opened.player, opened.session.id, terms, 1001);
      assert.equal(bid.changed, true);
      const player = api.advanceStreamingBuyerAuction(bid.player, opened.session.id, 1, 2000).player;
      if (mutation === 'cash') player.ownedStreamingPlatform.treasuryCash = 0;
      else player.world.projects = player.world.projects.filter(row => row.id !== opened.session.lot.sourceProjectId);
      const cash = player.ownedStreamingPlatform.treasuryCash;
      const result = api.advanceStreamingBuyerAuction(player, opened.session.id, 75, 80000);
      assert.deepEqual(result, baseline.advanceStreamingBuyerAuction(structuredClone(player), opened.session.id, 75, 80000));
      assert.equal(result.session.status, 'INVALIDATED', mutation);
      assert.equal(result.player.ownedStreamingPlatform.treasuryCash, cash, mutation);
      assert.equal(api.advanceStreamingBuyerAuction(result.player, opened.session.id, 75, 90000).changed, false);
    }
  });
  check('real room bid handler uses latest player after queued click and matches fresh service', () => {
    for (const changeCash of [false, true]) {
      const opened = fixture(0), room = harness();
      let player = opened.player, sent;
      const update = value => { sent = value; player = value; };
      try {
        let tree = room.render(player, opened.session, update);
        const offer = findNode(tree, node => node.props?.label === 'Upfront bid');
        const amount = Number(offer.props.draft);
        const button = findNode(tree, node => node.type === 'button' && node.props['aria-busy'] !== undefined);
        assert.equal(button.props.disabled, false);
        button.props.onClick();
        if (changeCash) player = { ...player, ownedStreamingPlatform: { ...player.ownedStreamingPlatform, treasuryCash: 0 } };
        tree = room.render(player, opened.session, update);
        const expected = api.placeStreamingBuyerAuctionBid(player, opened.session.id,
          { minimumGuarantee: amount, licensorRevenueShare: 0, marketingGuarantee: 0, futureGreenlight: false, productionFunding: 0 }, now);
        while (deferred.length) deferred.shift()();
        if (changeCash) { assert.equal(sent, undefined); assert.equal(expected.reason, 'INSUFFICIENT_TREASURY'); }
        else { assert.ok(sent); assert.deepEqual(sent, expected.player); }
      } finally { room.close(); }
    }
  });
} finally {
  Date.now = realNow;
  fs.rmSync(dir, { recursive: true, force: true });
}
console.log(JSON.stringify({ passed, failures }));
if (failures.length) process.exitCode = 1;
