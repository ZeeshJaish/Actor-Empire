export const PERFORMANCE_SETTINGS_SCHEMA_VERSION = 1 as const;
export const PERFORMANCE_NOTICE_VERSION = 1;

export type PerformancePreference = 'AUTOMATIC' | 'CINEMATIC' | 'PERFORMANCE';

export type PlayerPerformanceSettings = {
  schemaVersion: typeof PERFORMANCE_SETTINGS_SCHEMA_VERSION;
  preference: PerformancePreference;
  noticeVersion: number;
};

const VALID_PREFERENCES = new Set<PerformancePreference>([
  'AUTOMATIC',
  'CINEMATIC',
  'PERFORMANCE',
]);

const isRecord = (value: unknown): value is Record<string, unknown> => (
  value !== null && typeof value === 'object' && !Array.isArray(value)
);

export const normalizePerformanceSettings = (
  value: unknown,
  legacySmoothMode: unknown,
): PlayerPerformanceSettings => {
  const raw = isRecord(value) ? value : {};
  const rawPreference = typeof raw.preference === 'string'
    ? raw.preference as PerformancePreference
    : undefined;
  const preference = rawPreference && VALID_PREFERENCES.has(rawPreference)
    ? rawPreference
    : legacySmoothMode === true
      ? 'PERFORMANCE'
      : 'AUTOMATIC';
  const noticeVersion = typeof raw.noticeVersion === 'number' && Number.isFinite(raw.noticeVersion)
    ? Math.max(0, Math.floor(raw.noticeVersion))
    : 0;

  return {
    schemaVersion: PERFORMANCE_SETTINGS_SCHEMA_VERSION,
    preference,
    noticeVersion,
  };
};

export const withPerformancePreference = (
  current: PlayerPerformanceSettings,
  preference: PerformancePreference,
): PlayerPerformanceSettings => ({
  ...normalizePerformanceSettings(current, false),
  preference,
});

