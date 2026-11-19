/**
 * Week-speed plan Phase 1 (2026-11-17), item 3: the time limit for writing a week's save, per slot and by size.
 *
 * B3 (2026-11-15) made the limit learn the phone: three times its last save plus 4 s, 12-90 s, doubled after a
 * timeout, one value per device (`ae.saveWriteLimitMs`). One value per device let a quick save in a small slot set
 * the limit for a big slot, whose next save then timed out once before the doubling rescued it. Now:
 * - each slot keeps its own last save time and size (`ae.saveWriteRecord.<save key>`);
 * - the limit scales that time by this save's size: clamp(12 s, 3 × last ms × (this size ÷ last size) + 4 s, 90 s);
 * - a timeout still doubles the slot's next limit (12 → 24 → 48 → 90 s);
 * - a slot with no record yet starts from B3's device value, which is still learned from every save.
 *
 * The size is a cheap count (saveSizeUnits), not bytes. Measured on five careers on 17 Nov, it grows faster than
 * the bytes from a small career to a big one (about 1,100 units per MB at 6 MB, 4,200-5,100 at 50-70 MB), so a
 * size jump makes the limit too long rather than too short: the safe side, since the limit only ends a stuck save.
 *
 * Workers have no localStorage: the main thread hands a slot's record to the Week Ahead worker
 * (importSaveWriteRecord), and keeps what the worker learned (exportSaveWriteRecord → persistSaveWriteRecord).
 */
export const SAVE_WRITE_LIMIT_MIN_MS = 12_000;
export const SAVE_WRITE_LIMIT_MAX_MS = 90_000;
const DEVICE_KEY = 'ae.saveWriteLimitMs';
const SLOT_PREFIX = 'ae.saveWriteRecord.';

export type SaveWriteRecord = {
    /** The last finished write of this slot, from the moment IndexedDB started it to its commit. */
    ms: number;
    /** saveSizeUnits of that save. */
    units: number;
    /** Set by a timeout: the next limit, doubled. Cleared by the next finished write. */
    nextLimitMs?: number;
    /** The limit the last write ran with (telemetry: process_game_week's save_limit_ms). */
    limitMs?: number;
};

const clampLimit = (ms: number): number => Math.round(Math.min(SAVE_WRITE_LIMIT_MAX_MS, Math.max(SAVE_WRITE_LIMIT_MIN_MS, ms)));
const memory = new Map<string, SaveWriteRecord>();
const localStore = (): Storage | null => {
    try { return globalThis.localStorage ?? null; } catch { return null; }
};
const isRecord = (value: unknown): value is SaveWriteRecord => Boolean(value && typeof value === 'object'
    && Number.isFinite((value as SaveWriteRecord).ms) && Number.isFinite((value as SaveWriteRecord).units));

/** A cheap size count: the items one to three levels into the career (array lengths and key counts), with no
 *  deeper walk. About 1 ms on a 70 MB career on a laptop. */
export const saveSizeUnits = (player: unknown): number => {
    let total = 0;
    const count = (value: unknown) => (Array.isArray(value) ? value.length : value && typeof value === 'object' ? Object.keys(value).length : 0);
    const visit = (value: unknown, depth: number) => {
        total += count(value);
        if (depth >= 3 || !value || typeof value !== 'object') return;
        for (const child of Object.values(value as object)) visit(child, depth + 1);
    };
    if (player && typeof player === 'object') for (const value of Object.values(player as object)) visit(value, 1);
    return total;
};

export const readSaveWriteRecord = (saveKey: string): SaveWriteRecord | null => {
    const held = memory.get(saveKey);
    if (held) return held;
    try {
        const parsed = JSON.parse(localStore()?.getItem(SLOT_PREFIX + saveKey) || 'null');
        return isRecord(parsed) ? parsed : null;
    } catch { return null; }
};

const writeRecord = (saveKey: string, record: SaveWriteRecord) => {
    memory.set(saveKey, record);
    try { localStore()?.setItem(SLOT_PREFIX + saveKey, JSON.stringify(record)); } catch { /* private mode: memory only */ }
};

const deviceLimitMs = (): number => {
    let learned = 0;
    try { learned = Number(localStore()?.getItem(DEVICE_KEY)) || 0; } catch { learned = 0; }
    return clampLimit(learned);
};
const learnDeviceLimit = (nextMs: number) => {
    try { localStore()?.setItem(DEVICE_KEY, String(clampLimit(nextMs))); } catch { /* private mode */ }
};

/** The limit for writing a save of `units` to this slot. */
export const saveWriteLimitMs = (saveKey: string, units: number): number => {
    const record = readSaveWriteRecord(saveKey);
    if (record?.nextLimitMs) return clampLimit(record.nextLimitMs);
    if (record && record.ms > 0) {
        const scale = units > 0 && record.units > 0 ? units / record.units : 1;
        return clampLimit(3 * record.ms * scale + 4_000);
    }
    return deviceLimitMs();
};

/** After a write: a finished one sets the slot's record (and B3's device value); a timeout doubles the next limit. */
export const learnSaveWrite = (
    saveKey: string,
    outcome: { timedOut: true; limitMs: number; units: number } | { timedOut?: false; ms: number; units: number; limitMs: number },
) => {
    if (outcome.timedOut === true) {
        const before = readSaveWriteRecord(saveKey);
        const doubled = clampLimit(outcome.limitMs * 2);
        writeRecord(saveKey, { ms: before?.ms ?? 0, units: before?.units ?? outcome.units, nextLimitMs: doubled, limitMs: outcome.limitMs });
        learnDeviceLimit(doubled);
        return;
    }
    const ms = Math.max(0, Math.round(outcome.ms));
    writeRecord(saveKey, { ms, units: Math.max(0, Math.round(outcome.units)), limitMs: outcome.limitMs });
    learnDeviceLimit(ms * 3 + 4_000);
};

/** For the Week Ahead worker: the slot's record as the main thread knows it, and what the worker learned. */
export const exportSaveWriteRecord = (saveKey: string): SaveWriteRecord | null => {
    const record = readSaveWriteRecord(saveKey);
    return record ? { ...record } : null;
};
export const importSaveWriteRecord = (saveKey: string, record: SaveWriteRecord | null | undefined) => {
    if (isRecord(record)) memory.set(saveKey, { ...record });
};
/** Main thread: keeps a record the worker learned (a newer write than this thread's own record). */
export const persistSaveWriteRecord = (saveKey: string, record: SaveWriteRecord | null | undefined) => {
    if (isRecord(record)) writeRecord(saveKey, { ...record });
};
/** A slot deleted or replaced by another career: its record no longer says anything about the next save. */
export const forgetSaveWriteRecord = (saveKey: string) => {
    memory.delete(saveKey);
    try { localStore()?.removeItem(SLOT_PREFIX + saveKey); } catch { /* private mode */ }
};
