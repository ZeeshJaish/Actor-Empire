/**
 * Crash fix (19 Nov 2026), qa/2026-11-19-crash-scene/FIX-PLAN.md item 1.9: the phone's memory class from its real
 * memory.
 *
 * Android's WebView reports navigator.deviceMemory rounded to a power of two and capped at 8: a 4 GB phone and a
 * 6 GB phone both read 4, so Phase 1's RAM classes on Android were only lt3, 4_6 and 8p, and every gate built on them
 * treated 4 GB phones as 6 GB ones. The real total comes from, in this order:
 * - iOS: window.__aeDeviceMemoryGB, written by the app before the page loads (ios/App/App/ViewController.swift);
 * - the game's native plugin (services/nativeSupport.ts getNativeDeviceInfo: ActivityManager's totalMem on
 *   Android). It answers asynchronously, so its answer is kept on the phone and used from the moment it arrives,
 *   and from the start of every later launch;
 * - otherwise navigator.deviceMemory (the web build, or an Android launch whose plugin has not answered yet).
 * The classes are GiB of real memory: 4 GB phones report about 3.5-3.8 (3_4), 6 GB phones about 5.4-5.7 (4_6),
 * 8 GB phones about 7.3-7.6 (6_8), 12 GB and up 8p.
 */
export type RamClass = 'lt3' | '3_4' | '4_6' | '6_8' | '8p' | 'unknown';

// Not an 'actorEmpire' key: save transfers copy those to other phones, and this belongs to this phone.
const NATIVE_MEMORY_KEY = 'ae.nativeMemGb.v1';

const positive = (value: unknown): number => {
    const number = typeof value === 'string' && !value.trim() ? NaN : Number(value);
    return Number.isFinite(number) && number > 0 ? number : NaN;
};

/** undefined: not read from storage yet; NaN: nothing kept. */
let nativeGiB: number | undefined;

const keptNativeGiB = (): number => {
    if (nativeGiB === undefined) {
        try { nativeGiB = positive(globalThis.localStorage?.getItem(NATIVE_MEMORY_KEY)); } catch { nativeGiB = NaN; }
    }
    return nativeGiB;
};

/** The native plugin's answer (GiB): used at once and kept for later launches. */
export const rememberNativeMemoryGiB = (gib: unknown) => {
    const value = positive(gib);
    if (!Number.isFinite(value)) return;
    nativeGiB = value;
    try { globalThis.localStorage?.setItem(NATIVE_MEMORY_KEY, String(value)); } catch { /* private mode: this launch only */ }
};

/** The phone's memory in GiB (NaN when nothing reports it); real is false for navigator.deviceMemory. */
export const getDeviceMemory = (): { gib: number; real: boolean } => {
    const ios = positive((globalThis as { __aeDeviceMemoryGB?: unknown }).__aeDeviceMemoryGB);
    if (Number.isFinite(ios)) return { gib: ios, real: true };
    const native = keptNativeGiB();
    if (Number.isFinite(native)) return { gib: native, real: true };
    return { gib: positive((globalThis.navigator as { deviceMemory?: unknown } | undefined)?.deviceMemory), real: false };
};

export const ramClassOfGiB = (gib: number): RamClass => (!(gib > 0) ? 'unknown'
    : gib < 3 ? 'lt3' : gib < 4 ? '3_4' : gib < 6 ? '4_6' : gib < 8 ? '6_8' : '8p');

export const getRamClass = (): RamClass => ramClassOfGiB(getDeviceMemory().gib);

/** Test-only: forget what this module read or learned. */
export const resetDeviceMemoryForTest = () => { nativeGiB = undefined; };
