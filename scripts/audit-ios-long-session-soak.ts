import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';

import { INITIAL_PLAYER, type Player } from '../types';
import { createDeterministicRng } from '../services/deterministicRandom';
import { processGameWeek } from '../services/gameLoop';
import { getAbsoluteWeek } from '../services/legacyLogic';
import { compactPlayerForPersistence } from '../services/saveCompaction';
import { estimateSaveJsonBytes, prepareVerifiedPlayerForPersistence } from '../services/savePreparation';
import { migratePlayerSave } from '../services/saveMigration';

type TimingSummary = {
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
};

const summarize = (samples: number[]): TimingSummary => {
  const sorted = [...samples].sort((left, right) => left - right);
  const percentile = (value: number) => sorted[Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * value) - 1),
  )] || 0;
  return {
    p50Ms: Number(percentile(0.5).toFixed(2)),
    p95Ms: Number(percentile(0.95).toFixed(2)),
    maxMs: Number((sorted[sorted.length - 1] || 0).toFixed(2)),
  };
};

const countState = (player: Player) => ({
  worldProjects: player.world?.projects?.length || 0,
  rightsContracts: Object.keys(player.world?.streamingRightsContracts || {}).length,
  platformPlans: Object.values(player.world?.platforms || {})
    .reduce((sum, platform) => sum + (platform.ai?.slate?.length || 0), 0),
  industryEvents: player.world?.industryEvents?.events?.length || 0,
  pendingEvents: player.pendingEvents?.length || 0,
  industryProductionStatuses: Object.values(player.world?.industryProductions || {})
    .reduce<Record<string, number>>((counts, item) => {
      counts[item.status] = (counts[item.status] || 0) + 1;
      return counts;
    }, {}),
});

const measureHistoryDomains = (player: Player) => ({
  worldProjects: estimateSaveJsonBytes(player.world?.projects || []),
  industryProductions: estimateSaveJsonBytes(player.world?.industryProductions || {}),
  terminalIndustryProductions: estimateSaveJsonBytes(Object.fromEntries(
    Object.entries(player.world?.industryProductions || {})
      .filter(([, item]) => item.status === 'RELEASED' || item.status === 'CANCELLED'),
  )),
  pastProjects: estimateSaveJsonBytes(player.pastProjects || []),
  instagramPosts: estimateSaveJsonBytes(player.instagram?.posts || []),
  xPosts: estimateSaveJsonBytes(player.x?.posts || []),
  youtubeVideos: estimateSaveJsonBytes(player.youtube?.videos || []),
  worldStreamingAiCatalogue: estimateSaveJsonBytes(player.world?.aiCatalogue || []),
});

const largestWorldDomains = (player: Player) => Object.entries(player.world || {})
  .map(([domain, value]) => ({ domain, bytes: estimateSaveJsonBytes(value) }))
  .sort((left, right) => right.bytes - left.bytes)
  .slice(0, 12);

const requestedWeeks = Math.max(1, Math.round(Number(process.env.IOS_LONG_SESSION_WEEKS || 468)));
const persistEachWeek = process.env.IOS_LONG_SESSION_PERSIST_EACH_WEEK === '1';
const freezeSharedDomains = process.env.IOS_LONG_SESSION_FREEZE_SHARED === '1';
const deepFreeze = (value: unknown, seen = new WeakSet<object>()): void => {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  for (const child of Object.values(value)) deepFreeze(child, seen);
  Object.freeze(value);
};
let player = migratePlayerSave(structuredClone(INITIAL_PLAYER) as Player);
player = {
  ...player,
  id: 'ios-long-session-soak',
  age: 18,
  currentWeek: 1,
};

const startingAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const timings: number[] = [];
const checkpoints: Array<{
  simulatedWeek: number;
  age: number;
  week: number;
  runtimeBytes: number;
  persistedBytes: number;
  heapUsedMiB: number;
  counts: ReturnType<typeof countState>;
  historyDomainBytes: ReturnType<typeof measureHistoryDomains>;
  largestWorldDomains: ReturnType<typeof largestWorldDomains>;
}> = [];

for (let index = 0; index < requestedWeeks; index += 1) {
  // The production UI pauses for player decisions. The soak resolves that pause
  // by dismissing only transient prompts; it does not prune any durable game data.
  player = {
    ...player,
    pendingEvent: null,
    pendingEvents: [],
  } as Player;
  if (freezeSharedDomains) {
    deepFreeze(player.world?.industryProductions);
    deepFreeze(player.world?.talentBookings);
  }

  const originalRandom = Math.random;
  const originalNow = Date.now;
  Math.random = createDeterministicRng(`ios-long-session:${index}:${player.age}:${player.currentWeek}`);
  Date.now = () => 4_000_000_000_000 + index;
  const startedAt = performance.now();
  try {
    player = (await processGameWeek(player)).player;
  } finally {
    timings.push(performance.now() - startedAt);
    Math.random = originalRandom;
    Date.now = originalNow;
  }

  const simulatedWeek = index + 1;
  if (persistEachWeek) {
    const prepared = prepareVerifiedPlayerForPersistence(player, 'PROCESS_WEEK');
    assert.equal(prepared.comparison.ok, true, `Week ${simulatedWeek} must preserve protected state.`);
    player = prepared.runtimePlayer;
  }
  if (simulatedWeek % 52 === 0 || simulatedWeek === requestedWeeks) {
    const compacted = compactPlayerForPersistence(player);
    checkpoints.push({
      simulatedWeek,
      age: player.age,
      week: player.currentWeek,
      runtimeBytes: estimateSaveJsonBytes(player),
      persistedBytes: estimateSaveJsonBytes(compacted),
      heapUsedMiB: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)),
      counts: countState(player),
      historyDomainBytes: measureHistoryDomains(player),
      largestWorldDomains: largestWorldDomains(player),
    });
    console.log(`iOS long-session checkpoint ${simulatedWeek}/${requestedWeeks}`);
  }
}

const finalCheckpoint = checkpoints[checkpoints.length - 1];
const endingAbsoluteWeek = getAbsoluteWeek(player.age, player.currentWeek);
const report = {
  evidenceClass: 'deterministic-node-ios-long-session-soak',
  simulatedWeeks: requestedWeeks,
  simulatedYears: Number((requestedWeeks / 52).toFixed(2)),
  persistEachWeek,
  freezeSharedDomains,
  exactWeeksAdvanced: endingAbsoluteWeek - startingAbsoluteWeek,
  checkpointCount: checkpoints.length,
  timing: summarize(timings),
  peakCheckpointHeapMiB: Math.max(...checkpoints.map(item => item.heapUsedMiB)),
  final: finalCheckpoint,
};

console.log(JSON.stringify(report, null, 2));

assert.equal(report.exactWeeksAdvanced, requestedWeeks, 'Every simulated week must advance exactly once.');
assert.equal(report.checkpointCount, Math.ceil(requestedWeeks / 52), 'The soak must retain one bounded checkpoint per simulated year.');
assert.ok(finalCheckpoint.runtimeBytes <= 32_000_000,
  `Runtime state exceeded the Phase 2 baseline ceiling: ${finalCheckpoint.runtimeBytes} bytes.`);
assert.ok(finalCheckpoint.persistedBytes <= 32_000_000,
  `Persisted state exceeded the Phase 2 baseline ceiling: ${finalCheckpoint.persistedBytes} bytes.`);
assert.ok(finalCheckpoint.counts.industryEvents <= 520,
  `Industry event retention is unbounded: ${finalCheckpoint.counts.industryEvents}.`);
assert.ok(report.timing.p95Ms <= 1_500,
  `Process Week p95 ${report.timing.p95Ms}ms exceeded the desktop soak safety ceiling.`);

console.log('iOS long-session soak audit passed.');
