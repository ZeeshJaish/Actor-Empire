import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

const appSource = read('App.tsx');
const firebaseSource = read('services/firebaseService.ts');
const gameLoopSource = read('services/gameLoop.ts');

const requiredSnippets = [
  {
    source: firebaseSource,
    label: 'Firebase week debug local snapshot key',
    snippet: 'actorEmpire.weekProcessingDebug.v1',
  },
  {
    source: firebaseSource,
    label: 'Firebase week stage helper export',
    snippet: 'export const markWeekProcessingStage',
  },
  {
    source: firebaseSource,
    label: 'Issue reports include persisted week debug fields',
    snippet: '...getWeekProcessingDebugFields(player)',
  },
  {
    source: firebaseSource,
    label: 'Week diagnostics are isolated per save slot',
    snippet: 'WEEK_PROCESSING_DEBUG_SLOT_PREFIX',
  },
  {
    source: firebaseSource,
    label: 'Interrupted week runs are recovered on the next launch',
    snippet: 'export const recoverInterruptedWeekProcessingTrace',
  },
  {
    source: firebaseSource,
    label: 'Week diagnostics retain a compact stage timing timeline',
    snippet: 'week_debug_stage_timeline',
  },
  {
    source: firebaseSource,
    label: 'Week diagnostics measure source size at the start of a run',
    snippet: "safeStage === 'start'",
  },
  {
    source: firebaseSource,
    label: 'Diagnostic source-size basis remains visible in support reports',
    snippet: 'week_debug_save_size_basis',
  },
  {
    source: firebaseSource,
    label: 'Trace context stores week stage',
    snippet: 'week_process_stage',
  },
  {
    source: appSource,
    label: 'Age Up flow marks week start',
    snippet: "markWeekProcessingStage('start'",
  },
  {
    source: appSource,
    label: 'Age Up flow records game loop callback stages',
    snippet: 'onStage: (stage, context)',
  },
  {
    source: appSource,
    label: 'Age Up flow records IndexedDB write stage',
    snippet: "markWeekProcessingStage('indexeddb_write_start'",
  },
  {
    source: appSource,
    label: 'Age Up flow has an immediate duplicate-tap lock',
    snippet: 'weekProcessingLockRef.current = true',
  },
  {
    source: appSource,
    label: 'Age Up flow records rejected duplicate taps',
    snippet: "markWeekProcessingStage('input_rejected_busy'",
  },
  {
    source: appSource,
    label: 'Age Up failure records failed stage',
    snippet: "markWeekProcessingStage('failed'",
  },
  {
    source: gameLoopSource,
    label: 'processGameWeek accepts diagnostics callback',
    snippet: 'ProcessGameWeekDiagnostics',
  },
  {
    source: gameLoopSource,
    label: 'Game loop emits stable stage labels',
    snippet: 'emitLoopStage',
  },
];

const requiredStages = [
  'state_cloned',
  'state_normalized',
  'world_industry_start',
  'world_turn_done',
  'music_industry_done',
  'markets_done',
  'business_sim_start',
  'health_social_done',
  'commitments_releases_done',
  'awards_done',
  'weekly_events_done',
  'weekly_news_done',
  'weekly_social_done',
  'weekly_offers_done',
  'studio_funding_done',
  'subsidiaries_done',
  'final_trim_done',
];

const failures = [];

for (const item of requiredSnippets) {
  if (!item.source.includes(item.snippet)) {
    failures.push(`${item.label} is missing: ${item.snippet}`);
  }
}

for (const stage of requiredStages) {
  if (!gameLoopSource.includes(`'${stage}'`)) {
    failures.push(`Game loop diagnostic stage is missing: ${stage}`);
  }
}

// Week Ahead (2026-11-12): the week is saved on one of two paths (the prepared week, or the week App plays);
// both pass the week run id into persistence diagnostics.
for (const call of ['persistCurrentSlotSnapshot(sync.player, {', 'persistCurrentSlotSnapshot(preparedWeekPlayer, {']) {
  const at = appSource.indexOf(call);
  if (at < 0 || !appSource.slice(at, at + 200).includes('runId: weekRunId')) {
    failures.push(`Age Up flow must pass the week run id into persistence diagnostics (${call}).`);
  }
}

if (failures.length > 0) {
  console.error('Week processing diagnostics audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Week processing diagnostics audit passed.');
