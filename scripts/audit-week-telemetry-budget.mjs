#!/usr/bin/env node
// Perf plan (2026-11-08): what one week of telemetry costs on a phone.
// 1. A real week: bundles the game loop and the telemetry with fake native plugins and a fake phone
//    storage, plays real weeks the way App.tsx marks them, and counts the debug-note writes and every
//    native bridge call (Crashlytics keys and logs, analytics, anything else).
// 2. The safety net, on the telemetry alone: a week stopped halfway still leaves its last checkpoint,
//    hiding the app writes the latest stage, a restart reports the interrupted stage, a failure is
//    written at once, and an unchanged crash key is not sent twice.
// Usage: node scripts/audit-week-telemetry-budget.mjs [--root <game folder>] [--report-only]
import { build } from 'esbuild';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const rootArg = args.indexOf('--root');
const root = rootArg >= 0 ? path.resolve(args[rootArg + 1]) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportOnly = args.includes('--report-only');
const SLOT = 1;

// ---- fake phone storage and window (no DOM: the game's Node audits run without one) ----
const store = new Map();
let debugWrites = 0;
let debugBytes = 0;
const localStorage = {
  getItem: (k) => (store.has(String(k)) ? store.get(String(k)) : null),
  setItem: (k, v) => {
    const key = String(k);
    if (key.startsWith('actorEmpire.weekProcessingDebug')) { debugWrites += 1; debugBytes += String(v).length; }
    store.set(key, String(v));
  },
  removeItem: (k) => { store.delete(String(k)); },
  key: (i) => [...store.keys()][i] ?? null,
  get length() { return store.size; },
};
globalThis.localStorage = localStorage;
globalThis.window = {
  localStorage, addEventListener() {}, removeEventListener() {},
  setTimeout, clearTimeout, setInterval, clearInterval, location: { href: 'http://localhost/' },
};

// ---- fake native plugins: every call counted ----
const calls = { setCustomKey: 0, crashlyticsLog: 0, crashlyticsOther: 0, analytics: 0, performance: 0, messaging: 0, otherPlugins: 0 };
const counter = (bucket, special) => new Proxy({}, {
  get: (_, name) => (name === 'then' ? undefined : async (...rest) => {
    if (special && special[name]) special[name](...rest); else calls[bucket] += 1;
    return {};
  }),
});
globalThis.__telemetryMock = {
  Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios', isPluginAvailable: () => true, registerPlugin: () => counter('otherPlugins') },
  FirebaseCrashlytics: counter('crashlyticsOther', { setCustomKey: () => { calls.setCustomKey += 1; }, log: () => { calls.crashlyticsLog += 1; } }),
  FirebaseAnalytics: counter('analytics'),
  FirebasePerformance: counter('performance'),
  FirebaseMessaging: counter('messaging'),
};
const mockPlugin = {
  name: 'telemetry-mocks',
  setup(b) {
    const map = {
      '@capacitor/core': [
        'export const Capacitor = globalThis.__telemetryMock.Capacitor;',
        'export const registerPlugin = globalThis.__telemetryMock.Capacitor.registerPlugin;',
        'export class WebPlugin { addListener() { return Promise.resolve({ remove: () => Promise.resolve() }); } removeAllListeners() { return Promise.resolve(); } notifyListeners() {} unimplemented() { return new Error("unimplemented"); } unavailable() { return new Error("unavailable"); } }',
        'export class CapacitorException extends Error {}',
        'export const ExceptionCode = { Unimplemented: "UNIMPLEMENTED", Unavailable: "UNAVAILABLE" };',
        'export const CapacitorHttp = {}; export const CapacitorCookies = {}; export const WebView = {}; export const buildRequestInit = () => ({});',
      ].join('\n'),
      '@capacitor-firebase/crashlytics': 'export const FirebaseCrashlytics = globalThis.__telemetryMock.FirebaseCrashlytics;',
      '@capacitor-firebase/analytics': 'export const FirebaseAnalytics = globalThis.__telemetryMock.FirebaseAnalytics;',
      '@capacitor-firebase/performance': 'export const FirebasePerformance = globalThis.__telemetryMock.FirebasePerformance;',
      '@capacitor-firebase/messaging': 'export const FirebaseMessaging = globalThis.__telemetryMock.FirebaseMessaging;',
    };
    b.onResolve({ filter: /^@capacitor(-firebase)?\// }, (a) => (map[a.path] ? { path: a.path, namespace: 'tm' } : undefined));
    b.onLoad({ filter: /.*/, namespace: 'tm' }, (a) => ({ contents: map[a.path], loader: 'js' }));
  },
};
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ae-telemetry-audit-'));
const bundle = async (entry, name) => {
  const outfile = path.join(tmp, `${name}.mjs`);
  await build({
    stdin: { contents: entry, resolveDir: root, loader: 'ts', sourcefile: `${name}.ts` }, bundle: true, outfile,
    format: 'esm', platform: 'node', plugins: [mockPlugin], logLevel: 'error', loader: { '.csv': 'text' },
  });
  return outfile;
};
const load = (file, instance) => import(`${pathToFileURL(file).href}?instance=${instance}`);
const total = () => Object.values(calls).reduce((a, b) => a + b, 0);
const resetCounts = () => { debugWrites = 0; debugBytes = 0; Object.keys(calls).forEach(k => { calls[k] = 0; }); };
const failures = [];
const check = (ok, message) => { if (!ok) failures.push(message); };
const report = {};

// ---- 1. real weeks ----
{
  const file = await bundle([
    "export { markWeekProcessingStage } from './services/firebaseService';",
    "export { processGameWeek } from './services/gameLoop';",
    "export { migratePlayerSave } from './services/saveMigration';",
    "export { INITIAL_PLAYER } from './types';",
  ].join('\n'), 'real-week');
  const game = await load(file, 'week');
  const APP_BEFORE = ['start', 'game_loop_start'];
  const APP_AFTER = ['game_loop_done', 'post_week_sync_start', 'post_week_sync_done', 'persist_prepare_start', 'persist_prepare_done', 'indexeddb_write_start', 'indexeddb_write_done', 'success'];
  let career = game.migratePlayerSave({ ...structuredClone(game.INITIAL_PLAYER), id: 'telemetry-audit', name: 'Telemetry Audit', age: 18, currentWeek: 1 });
  const playRealWeek = async (n) => {
    let stages = 0;
    const ctx = (elapsed) => ({ run_id: `real_week_${n}`, screen: 'HOME', save_slot: SLOT, elapsed_ms: elapsed });
    APP_BEFORE.forEach((stage, i) => { stages += 1; game.markWeekProcessingStage(stage, career, { ...(stage === 'start' ? { status: 'started' } : {}), ...ctx(i) }); });
    const before = career;
    const result = await game.processGameWeek(career, { onStage: (stage, context) => { stages += 1; game.markWeekProcessingStage(`loop_${stage}`, before, { ...context, ...ctx(10) }); } });
    career = result.player;
    APP_AFTER.forEach((stage, i) => { stages += 1; game.markWeekProcessingStage(stage, career, ctx(100 + i)); });
    return stages;
  };
  await playRealWeek(1); // the first week also sends the one-time keys
  const weeks = [];
  for (let n = 2; n <= 4; n += 1) {
    resetCounts();
    const stages = await playRealWeek(n);
    weeks.push({ stages, debugWrites, debugKB: Math.round(debugBytes / 102.4) / 10, nativeCalls: total(), ...calls });
  }
  report.realWeeks = weeks;
  const worst = weeks.reduce((a, b) => (b.nativeCalls > a.nativeCalls ? b : a));
  if (!reportOnly) {
    check(worst.debugWrites <= 14, `a week wrote the debug note ${worst.debugWrites} times (budget 14)`);
    check(worst.nativeCalls <= 120, `a week made ${worst.nativeCalls} native bridge calls (budget 120)`);
  }
}

// ---- 2. the safety net, on the telemetry alone ----
{
  const docListeners = {};
  globalThis.document = { visibilityState: 'visible', addEventListener: (t, fn) => { (docListeners[t] ||= []).push(fn); }, removeEventListener() {} };
  const file = await bundle("export { markWeekProcessingStage, recoverInterruptedWeekProcessingTrace, setCrashKey } from './services/firebaseService';", 'telemetry');
  const app = await load(file, 'first-start');
  const loopSource = fs.readFileSync(path.join(root, 'services/gameLoop.ts'), 'utf8');
  const weekStages = ['start', 'game_loop_start', ...[...loopSource.matchAll(/emitLoopStage\('([a-z0-9_]+)'/g)].map(m => `loop_${m[1]}`), 'game_loop_done', 'success'];
  const player = { id: 'audit-player', name: 'Audit', age: 22, currentWeek: 5, money: 1500000, stats: { fame: 12, reputation: 40, health: 90 }, pendingEvents: [], commitments: [], activeReleases: [], inbox: [], businesses: [] };
  const stored = () => { const raw = store.get(`actorEmpire.weekProcessingDebug.v1.slot.${SLOT}`); return raw ? JSON.parse(raw) : null; };
  const ownedIndex = weekStages.indexOf('loop_owned_streaming_start');
  const lastMarked = weekStages[ownedIndex + 3];
  weekStages.slice(0, ownedIndex + 4).forEach((stage, i) => app.markWeekProcessingStage(stage, player, { ...(stage === 'start' ? { status: 'started' } : {}), run_id: 'week_halfway', screen: 'HOME', save_slot: SLOT, elapsed_ms: i }));
  const midway = stored();
  report.stoppedHalfway = { lastStageMarked: lastMarked, stageInStorage: midway?.stage, status: midway?.status };
  check(midway?.run_id === 'week_halfway' && midway?.status === 'running', 'a week stopped halfway left no running note in storage');
  check(midway && weekStages.indexOf(midway.stage) >= weekStages.indexOf('loop_end_week_start'), `a week stopped halfway left an old stage in storage: ${midway?.stage}`);
  globalThis.document.visibilityState = 'hidden';
  (docListeners.visibilitychange || []).forEach(fn => fn());
  report.afterHide = stored()?.stage;
  check(stored()?.stage === lastMarked, `hiding the app did not write the latest stage (got ${stored()?.stage})`);
  globalThis.document.visibilityState = 'visible';
  const restarted = await load(file, 'restart');
  const recovered = restarted.recoverInterruptedWeekProcessingTrace(player, { saveSlot: SLOT, screen: 'START_MENU' });
  report.restartReports = recovered?.interrupted_stage;
  check(recovered?.interrupted_stage === lastMarked, `a restart did not report the interrupted stage (got ${recovered?.interrupted_stage})`);
  const writesBefore = debugWrites;
  restarted.markWeekProcessingStage('start', player, { status: 'started', run_id: 'week_fail', screen: 'HOME', save_slot: SLOT });
  restarted.markWeekProcessingStage('loop_state_cloned', player, { run_id: 'week_fail', screen: 'HOME', save_slot: SLOT });
  restarted.markWeekProcessingStage('failed', player, { status: 'failed', error: new Error('audit failure'), run_id: 'week_fail', screen: 'HOME', save_slot: SLOT });
  check(stored()?.status === 'failed' && stored()?.run_id === 'week_fail' && debugWrites > writesBefore, 'a failed week was not written at once');
  const keyCalls = calls.setCustomKey;
  restarted.setCrashKey('audit_key', 'one');
  restarted.setCrashKey('audit_key', 'one');
  const afterSame = calls.setCustomKey - keyCalls;
  restarted.setCrashKey('audit_key', 'two');
  const afterChange = calls.setCustomKey - keyCalls;
  report.crashKeyCalls = { sameValueTwice: afterSame, thenChanged: afterChange };
  if (!reportOnly) check(afterSame === 1 && afterChange === 2, `an unchanged crash key was sent again (${afterSame}, then ${afterChange})`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify(report, null, 1));
if (failures.length) {
  console.error(`${reportOnly ? 'would fail' : 'FAIL'} week telemetry budget:\n- ${failures.join('\n- ')}`);
  if (!reportOnly) process.exit(1);
}
if (!reportOnly) console.log('PASS week telemetry budget');
