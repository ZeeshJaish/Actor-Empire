// AE-005: every rewarded ad settles, a reward needs the SDK's word, and a tap never waits without bound.
// Bundles services/adLogic.ts with a scripted AdMob plugin and a fake clock, then plays the cases players hit:
// a full watch, an early close, a failed show, no fill, a slow load, an ad that never opens, an expired ad,
// a double tap, a reward reported only by the show call, and the interstitial beside it.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ---- fake clock: setTimeout / clearTimeout / Date.now under test control ----
let now = 1_700_000_000_000;
let nextTimerId = 1;
const timers = new Map();
const fakeSetTimeout = (fn, ms = 0) => { const id = nextTimerId++; timers.set(id, { at: now + Math.max(0, ms), fn }); return id; };
const fakeClearTimeout = id => { timers.delete(id); };
const flush = async () => { for (let i = 0; i < 6; i += 1) await new Promise(resolve => setImmediate(resolve)); };
const advance = async ms => {
  const target = now + ms;
  for (;;) {
    let due = null;
    for (const [id, timer] of timers) if (timer.at <= target && (!due || timer.at < due[1].at)) due = [id, timer];
    if (!due) break;
    timers.delete(due[0]);
    now = due[1].at;
    due[1].fn();
    await flush();
  }
  now = target;
  await flush();
};
Date.now = () => now;

// ---- scripted plugin ----
const listeners = new Map();
const calls = { prepare: 0, show: 0, interstitialShow: 0 };
const script = { prepare: () => Promise.resolve({}), show: () => new Promise(() => {}) };
const emit = (event, data) => { for (const fn of [...(listeners.get(event) || [])]) fn(data); };
globalThis.__admobMock = {
  AdMob: {
    initialize: async () => {},
    requestConsentInfo: async () => ({ status: 'NOT_REQUIRED', isConsentFormAvailable: false }),
    prepareInterstitial: async () => ({}),
    showInterstitial: async () => { calls.interstitialShow += 1; },
    prepareRewardVideoAd: () => { calls.prepare += 1; return script.prepare(); },
    showRewardVideoAd: () => { calls.show += 1; return script.show(); },
    addListener: async (event, fn) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return { remove: async () => { listeners.get(event)?.delete(fn); } };
    },
  },
};
const R = { Loaded: 'onRewardedVideoAdLoaded', FailedToLoad: 'onRewardedVideoAdFailedToLoad', Showed: 'onRewardedVideoAdShowed', FailedToShow: 'onRewardedVideoAdFailedToShow', Dismissed: 'onRewardedVideoAdDismissed', Rewarded: 'onRewardedVideoAdReward' };
const I = { Dismissed: 'interstitialAdDismissed', FailedToShow: 'interstitialAdFailedToShow' };

const docListeners = new Set();
globalThis.document = {
  visibilityState: 'visible',
  addEventListener: (type, fn) => { if (type === 'visibilitychange') docListeners.add(fn); },
  removeEventListener: (type, fn) => { if (type === 'visibilitychange') docListeners.delete(fn); },
};
globalThis.window = {
  setTimeout: fakeSetTimeout,
  clearTimeout: fakeClearTimeout,
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'android' },
};
globalThis.setTimeout = fakeSetTimeout;
globalThis.clearTimeout = fakeClearTimeout;
console.log = () => {};
console.warn = () => {};
console.error = () => {};

const admobPlugin = {
  name: 'admob-mock',
  setup(b) {
    b.onResolve({ filter: /^@capacitor-community\/admob$/ }, () => ({ path: 'admob-mock', namespace: 'admob-mock' }));
    b.onLoad({ filter: /.*/, namespace: 'admob-mock' }, () => ({
      contents: `export const AdMob = globalThis.__admobMock.AdMob;
export const RewardAdPluginEvents = ${JSON.stringify(R)};
export const InterstitialAdPluginEvents = ${JSON.stringify(I)};
export const MaxAdContentRating = { General: 'General', Teen: 'Teen' };`,
      loader: 'js',
    }));
  },
};
const out = await build({
  entryPoints: [path.join(root, 'services/adLogic.ts')], bundle: true, write: false, format: 'esm', platform: 'neutral',
  plugins: [admobPlugin], logLevel: 'error',
});
const ads = await import('data:text/javascript;base64,' + Buffer.from(out.outputFiles[0].text).toString('base64'));

const results = [];
const check = async (name, fn) => {
  listeners.clear();
  await fn();
  results.push(name);
  process.stdout.write(`PASS ${name}\n`);
};
// a show that settles within `limit` fake ms, or fails the case
const settles = async (promise, limit) => {
  let value; let done = false;
  promise.then(v => { value = v; done = true; });
  for (let t = 0; t < limit && !done; t += 250) await advance(250);
  assert.equal(done, true, `the ad request did not settle within ${limit} ms`);
  return value;
};

await ads.initAds();
await flush();
assert.equal(calls.prepare, 1, 'start-up loads one rewarded ad in the background');

await check('a full watch pays once, settles on close, and loads the next ad', async () => {
  let earned = 0;
  script.show = () => new Promise(resolve => { fakeSetTimeout(() => { emit(R.Showed); }, 50); fakeSetTimeout(() => { emit(R.Rewarded, { type: 'coins', amount: 1 }); resolve({ type: 'coins', amount: 1 }); }, 30_000); fakeSetTimeout(() => emit(R.Dismissed), 33_000); });
  const before = calls.prepare;
  const result = await settles(ads.showAd('REWARDED_CASH', { onEarned: () => { earned += 1; } }), 40_000);
  assert.deepEqual(result, { success: true });
  assert.equal(earned, 1, 'onEarned runs exactly once');
  await advance(2_000);
  assert.equal(calls.prepare, before + 1, 'the next ad is loaded after the close');
});

await check('closing early settles with no reward (the old hang)', async () => {
  let earned = 0;
  script.show = () => new Promise(() => { fakeSetTimeout(() => emit(R.Showed), 50); fakeSetTimeout(() => emit(R.Dismissed), 5_000); });
  const result = await settles(ads.showAd('REWARDED_BAILOUT', { onEarned: () => { earned += 1; } }), 10_000);
  assert.deepEqual(result, { success: false, reason: 'NOT_COMPLETED' });
  assert.equal(earned, 0);
  await advance(2_000);
});

await check('an ad that fails to show settles as an error', async () => {
  script.show = () => new Promise(() => { fakeSetTimeout(() => emit(R.FailedToShow, { code: 0 }), 100); });
  const result = await settles(ads.showAd('REWARDED_BAILOUT'), 5_000);
  assert.deepEqual(result, { success: false, reason: 'ERROR' });
  await advance(2_000);
});

await check('a show call that rejects settles as an error', async () => {
  script.show = () => Promise.reject(new Error('Reward Video is Not Ready Yet'));
  const result = await settles(ads.showAd('REWARDED_BAILOUT'), 5_000);
  assert.deepEqual(result, { success: false, reason: 'ERROR' });
  await advance(2_000);
});

await check('no fill answers "no ad" within the tap budget and never shows', async () => {
  await advance(60_000);
  script.prepare = () => Promise.reject(new Error('No fill'));
  await advance(46_000);
  // force the ready ad (if any) to expire so this tap must load
  await advance(56 * 60_000);
  const shows = calls.show;
  const result = await settles(ads.showAd('REWARDED_ENERGY'), 9_000);
  assert.deepEqual(result, { success: false, reason: 'UNAVAILABLE' });
  assert.equal(calls.show, shows, 'nothing is shown without a loaded ad');
});

await check('a slow load is kept for the next tap and never shown on its own', async () => {
  await advance(60_000);
  script.prepare = () => new Promise(resolve => fakeSetTimeout(() => resolve({}), 12_000));
  script.show = () => new Promise(resolve => { fakeSetTimeout(() => emit(R.Showed), 50); fakeSetTimeout(() => { emit(R.Rewarded); resolve({ type: 'x', amount: 1 }); }, 1_000); fakeSetTimeout(() => emit(R.Dismissed), 1_500); });
  const shows = calls.show;
  const first = await settles(ads.showAd('REWARDED_ENERGY'), 9_000);
  assert.deepEqual(first, { success: false, reason: 'UNAVAILABLE' });
  await advance(10_000);
  assert.equal(calls.show, shows, 'the late ad was not shown by itself');
  const second = await settles(ads.showAd('REWARDED_ENERGY'), 3_000);
  assert.deepEqual(second, { success: true });
  assert.equal(calls.show, shows + 1);
  await advance(3_000);
});

await check('an ad that never opens is released after the open timeout', async () => {
  script.prepare = () => Promise.resolve({});
  await advance(60_000);
  script.show = () => new Promise(() => {});
  const result = await settles(ads.showAd('REWARDED_BAILOUT'), 20_000);
  assert.deepEqual(result, { success: false, reason: 'ERROR' });
  await advance(2_000);
});

await check('an ad loaded over 55 minutes ago is replaced before showing', async () => {
  script.show = () => new Promise(resolve => { fakeSetTimeout(() => emit(R.Showed), 50); fakeSetTimeout(() => { emit(R.Rewarded); resolve({ type: 'x', amount: 1 }); }, 500); fakeSetTimeout(() => emit(R.Dismissed), 800); });
  await advance(56 * 60_000);
  const loads = calls.prepare;
  const result = await settles(ads.showAd('REWARDED_STATS'), 5_000);
  assert.deepEqual(result, { success: true });
  assert.ok(calls.prepare > loads, 'a fresh ad was loaded');
  await advance(3_000);
});

await check('a second request while an ad is up gets "no ad", not a second show', async () => {
  script.show = () => new Promise(resolve => { fakeSetTimeout(() => emit(R.Showed), 50); fakeSetTimeout(() => { emit(R.Rewarded); resolve({ type: 'x', amount: 1 }); }, 2_000); fakeSetTimeout(() => emit(R.Dismissed), 2_500); });
  await advance(5_000);
  const first = ads.showAd('REWARDED_CASH');
  await advance(100);
  const second = await settles(ads.showAd('REWARDED_CASH'), 1_000);
  assert.deepEqual(second, { success: false, reason: 'UNAVAILABLE' });
  assert.deepEqual(await settles(first, 5_000), { success: true });
  await advance(3_000);
});

await check('a reward reported only by the show call still pays', async () => {
  let earned = 0;
  script.show = () => new Promise(resolve => { fakeSetTimeout(() => emit(R.Showed), 50); fakeSetTimeout(() => resolve({ type: 'x', amount: 1 }), 700); fakeSetTimeout(() => emit(R.Dismissed), 900); });
  await advance(5_000);
  const result = await settles(ads.showAd('REWARDED_SKILL', { onEarned: () => { earned += 1; } }), 3_000);
  assert.deepEqual(result, { success: true });
  assert.equal(earned, 1);
  await advance(3_000);
});

await check('the interstitial beside it still shows and settles', async () => {
  const shows = calls.interstitialShow;
  const shown = ads.showPreloadedInterstitial('test');
  await advance(100);
  emit(I.Dismissed);
  assert.equal(await settles(shown, 1_000), true);
  assert.equal(calls.interstitialShow, shows + 1);
});

console.info(`Rewarded ad lifecycle audit passed (${results.length} cases).`);
