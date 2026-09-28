import { readFileSync } from 'node:fs';

const app = readFileSync('App.tsx', 'utf8');
const storage = readFileSync('services/storage.ts', 'utf8');
const startMenu = readFileSync('views/StartMenu.tsx', 'utf8');
const root = readFileSync('index.tsx', 'utf8');

const startupStart = app.indexOf('const runStartupInitialization = useCallback');
const selectionStart = app.indexOf('const handleSelectSlot = async');
const startupEnd = app.indexOf('useEffect(() => {\n    void runStartupInitialization();', startupStart);
const startupSource = app.slice(startupStart, startupEnd);
const selectionSource = app.slice(selectionStart, app.indexOf('const handleDeleteSlot', selectionStart));

const checks = [
  [storage, 'export type SaveSlotSummary', 'Storage exposes lightweight slot summaries.'],
  [storage, 'export const listGameDataKeys', 'Storage can list occupied slots without loading saves.'],
  [storage, 'export const createDeferredSaveSlotSummary', 'Storage can represent a career without parsing its full save.'],
  [startupSource, 'new Set(await listGameDataKeysStrict())', 'Startup lists keys before reading full saves.'],
  [app, "cachedSummary || createDeferredSaveSlotSummary(saveKey, 'indexeddb')", 'Startup uses a cached or deferred summary.'],
  [app, 'if (!existingSave && saveSlotSummaries[slot])', 'The selected slot is loaded lazily.'],
  [selectionSource, 'const verifiedLoad = await loadVerifiedGameData(storageKey)', 'The full IndexedDB save is read and verified only after slot selection.'],
  [app, 'skipNextPlayingMigrationRef.current = true', 'A selected save is not deep-cloned again during PLAYING hydration.'],
  [app, "skipMigration ? { ...prev } : migratePlayerSave(prev)", 'Hydration keeps normal new-career migration while reusing a prepared save.'],
  [app, 'suppressNextAutosaveRef.current = true', 'A committed week suppresses the duplicate autosave.'],
  [startMenu, 'Record<number, SaveSlotSummary | null>', 'The start menu consumes summaries instead of full players.'],
  [root, 'class RootRecoveryBoundary', 'Root rendering has a visible recovery screen.'],
  [root, 'Restart Game', 'The recovery screen offers a clean restart.'],
];

if (/Open Safe Menu|Continue Offline/i.test(root)) {
  failures.push([root, 'Retry and Restart Game only', 'Root recovery must not expose an offline or safe-menu bypass.']);
}

const failures = checks.filter(([source, snippet]) => !source.includes(snippet));
if (startupSource.includes('loadGameData(')) {
  failures.push([startupSource, 'no loadGameData(', 'Startup must not parse any full save before the player selects it.']);
}
if (startupSource.includes('prepareLoadedPlayerSave(')) {
  failures.push([startupSource, 'no prepareLoadedPlayerSave(', 'Startup must not migrate a full save before selection.']);
}
if (startupSource.includes('await ensureTrackingPermission()') || startupSource.includes('await initAds()')) {
  failures.push([startupSource, 'deferred native services', 'Tracking and ads must not block the save menu.']);
}
if (failures.length) {
  failures.forEach(([, snippet, message]) => console.error(`- ${message} Missing: ${snippet}`));
  process.exit(1);
}

console.log('Large-save startup audit passed.');
