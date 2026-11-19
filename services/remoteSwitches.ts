/**
 * Week-speed plan Phase 1 (2026-11-17), item 8: switches for the risky parts of a release, set from Firebase.
 *
 * - The switches live in one Firestore document, config/switches, read once per launch through the REST client the
 *   game already has (no new dependency). Each field is a switch: { on: bool, percent?: 0-100, ram?: [classes],
 *   minVersion?: 'x.y.z', maxVersion?: 'x.y.z', limits?: { key: number } } (limits since the 19 Nov crash fix).
 * - What a launch reads is kept on the device and used from the NEXT launch: a switch never changes a running
 *   game. A launch with nothing kept (first launch, no network, no document, no read rule) uses the defaults below,
 *   which are the build as it was tested: every switch on.
 * - percent rolls a switch out to that share of installs: a stable hash of the install id and the switch name.
 *   ram limits it to phone memory classes (lt3, 3_4, 4_6, 6_8, 8p, unknown).
 * - Each launch sets one Crashlytics key, `switches`, naming the switches that are on, so ANRs and crashes can be
 *   split by what was on (it takes the place of the old player_health key).
 *
 * Nothing changes until Zeesh deploys the read rule (firestore.rules: config/{doc}) and creates the document.
 */
export type SwitchName = 'weekAhead' | 'hideSaveSkip' | 'openSaveSkip' | 'androidTrimFilter' | 'forecastWorkerCopy'
    /* Crash fix (19 Nov 2026), qa/2026-11-19-crash-scene/FIX-PLAN.md: launchPreload is item 2.1 (the start menu
       reads a career only where it fits), launchLadder item 1.8 (the start-up guard and the light start),
       adsAfterOpen item 2.2 (the ad SDK and its two full-screen ads start after a career has opened). */
    | 'launchPreload' | 'launchLadder' | 'adsAfterOpen';

/** Short names for the Crashlytics key (it holds at most 1 KB). */
const SHORT: Record<SwitchName, string> = {
    weekAhead: 'wa', hideSaveSkip: 'hide', openSaveSkip: 'open', androidTrimFilter: 'trim', forecastWorkerCopy: 'fc',
    launchPreload: 'lp', launchLadder: 'ld', adsAfterOpen: 'ad',
};
export const SWITCH_NAMES = Object.keys(SHORT) as SwitchName[];
const DEFAULTS: Record<SwitchName, boolean> = {
    weekAhead: true, hideSaveSkip: true, openSaveSkip: true, androidTrimFilter: true, forecastWorkerCopy: true,
    launchPreload: true, launchLadder: true, adsAfterOpen: true,
};

/** limits (crash fix, 19 Nov 2026): numbers a switch reads, by key, used only where the rule applies to this
 *  install (the same version, ram and percent conditions as `on`). launchPreload: the biggest career, in
 *  saveSizeUnits, that a RAM class reads at start-up (0 never, a negative number no limit). weekAhead: 1 or 0 per
 *  RAM class. A key the rule does not name keeps the build's own value. */
export type SwitchRule = { on: boolean; percent?: number; ram?: string[]; minVersion?: string; maxVersion?: string; limits?: Record<string, number> };
export type SwitchDocument = Partial<Record<SwitchName, SwitchRule>>;
type Kept = { fetchedAt: number; rules: SwitchDocument; recoverFromVersions?: string[] };

const KEPT_KEY = 'ae.switches.v1';
const INSTALL_KEY = 'ae.installId.v1';

const store = (): Storage | null => {
    try { return globalThis.localStorage ?? null; } catch { return null; }
};

/** A stable id for this install (made once), for the percent rollouts. */
export const getInstallId = (): string => {
    const local = store();
    try {
        const held = local?.getItem(INSTALL_KEY);
        if (held) return held;
        const made = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
        local?.setItem(INSTALL_KEY, made);
        return made;
    } catch { return 'no-storage'; }
};

const bucketOf = (text: string): number => {
    let hash = 5381;
    for (let index = 0; index < text.length; index++) hash = ((hash * 33) ^ text.charCodeAt(index)) >>> 0;
    return hash % 100;
};

const versionParts = (version: string): number[] => version.split('.').map(part => Number.parseInt(part, 10) || 0);
const compareVersions = (left: string, right: string): number => {
    const a = versionParts(left), b = versionParts(right);
    for (let index = 0; index < Math.max(a.length, b.length); index++) {
        const diff = (a[index] || 0) - (b[index] || 0);
        if (diff) return diff;
    }
    return 0;
};

type SwitchDevice = { installId: string; ramClass: string; version: string };

/** Whether a rule applies to this install, phone and version (otherwise the switch keeps its default). */
const ruleApplies = (name: SwitchName, rule: SwitchRule | undefined, device: SwitchDevice): rule is SwitchRule => {
    if (!rule || typeof rule.on !== 'boolean') return false;
    if (rule.minVersion && compareVersions(device.version, rule.minVersion) < 0) return false;
    if (rule.maxVersion && compareVersions(device.version, rule.maxVersion) > 0) return false;
    if (Array.isArray(rule.ram) && rule.ram.length && !rule.ram.includes(device.ramClass)) return false;
    const percent = typeof rule.percent === 'number' && Number.isFinite(rule.percent) ? Math.max(0, Math.min(100, rule.percent)) : 100;
    return bucketOf(`${device.installId}:${name}`) < percent;
};

/** One switch from its rule, for this install, phone and version. */
export const resolveSwitch = (
    name: SwitchName,
    rule: SwitchRule | undefined,
    device: SwitchDevice,
): boolean => (ruleApplies(name, rule, device) ? rule.on : DEFAULTS[name]);

/** A rule's limits for this install: only where the rule applies. */
export const resolveSwitchLimits = (name: SwitchName, rule: SwitchRule | undefined, device: SwitchDevice): Record<string, number> => (
    ruleApplies(name, rule, device) && rule.limits ? { ...rule.limits } : {}
);

/** A rule's limits from the document: finite numbers only, at most 16 keys. */
const limitsOf = (raw: unknown): { limits?: Record<string, number> } => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    const entries = Object.entries(raw as Record<string, unknown>)
        .filter((entry): entry is [string, number] => typeof entry[1] === 'number' && Number.isFinite(entry[1]))
        .slice(0, 16);
    return entries.length ? { limits: Object.fromEntries(entries) } : {};
};

/** Firestore's REST document → plain switch rules (fields it does not know are ignored). */
export const parseSwitchDocument = (document: unknown): SwitchDocument => {
    const valueOf = (value: any): unknown => {
        if (!value || typeof value !== 'object') return undefined;
        if ('booleanValue' in value) return Boolean(value.booleanValue);
        if ('integerValue' in value) return Number(value.integerValue);
        if ('doubleValue' in value) return Number(value.doubleValue);
        if ('stringValue' in value) return String(value.stringValue);
        if ('arrayValue' in value) return (value.arrayValue?.values || []).map(valueOf);
        if ('mapValue' in value) return Object.fromEntries(Object.entries(value.mapValue?.fields || {}).map(([k, v]) => [k, valueOf(v)]));
        return undefined;
    };
    const fields = (document as { fields?: Record<string, unknown> })?.fields || {};
    const rules: SwitchDocument = {};
    for (const name of SWITCH_NAMES) {
        const raw = valueOf(fields[name]) as Record<string, unknown> | undefined;
        if (!raw || typeof raw !== 'object' || typeof raw.on !== 'boolean') continue;
        rules[name] = {
            on: raw.on,
            ...(typeof raw.percent === 'number' ? { percent: raw.percent } : {}),
            ...(Array.isArray(raw.ram) ? { ram: raw.ram.map(String) } : {}),
            ...(typeof raw.minVersion === 'string' ? { minVersion: raw.minVersion } : {}),
            ...(typeof raw.maxVersion === 'string' ? { maxVersion: raw.maxVersion } : {}),
            ...limitsOf(raw.limits),
        };
    }
    return rules;
};

/** Week-speed Phase 2a (2026-11-17), the recovery list's second case (D15): app versions flagged as buggy, from the
 *  document's `recoverFromVersions` field (an array of 'x.y.z' strings, at most 10). A career that played on one of
 *  them is offered, once, its copy from before that version (services/recoveryList.ts). Like every switch it is used
 *  from the next launch; with no document the list is empty and the recovery list opens only for a save that fails. */
export const parseRecoveryVersions = (document: unknown): string[] => {
    const raw = (document as { fields?: Record<string, any> })?.fields?.recoverFromVersions;
    const values = raw?.arrayValue?.values;
    if (!Array.isArray(values)) return [];
    return [...new Set(values
        .map((value: any) => (typeof value?.stringValue === 'string' ? value.stringValue.trim() : ''))
        .filter((version: string) => /^\d{1,3}(\.\d{1,4}){1,3}$/.test(version)))]
        .slice(0, 10);
};

const readKept = (): Kept | null => {
    try {
        const parsed = JSON.parse(store()?.getItem(KEPT_KEY) || 'null');
        return parsed && typeof parsed === 'object' && parsed.rules && typeof parsed.rules === 'object' ? parsed as Kept : null;
    } catch { return null; }
};

let session: Record<SwitchName, boolean> | null = null;
let sessionLimits: Partial<Record<SwitchName, Record<string, number>>> = {};

/** This launch's switches: worked out once, from what the previous launch kept, then fixed for the session. */
export const startSessionSwitches = (device: { ramClass: string; version: string }): Record<SwitchName, boolean> => {
    if (session) return session;
    const kept = readKept();
    const installId = getInstallId();
    session = Object.fromEntries(SWITCH_NAMES.map(name => [name, resolveSwitch(name, kept?.rules[name], { installId, ...device })])) as Record<SwitchName, boolean>;
    sessionLimits = Object.fromEntries(SWITCH_NAMES.map(name => [name, resolveSwitchLimits(name, kept?.rules[name], { installId, ...device })]));
    return session;
};

/** One of a switch's numbers for this session (crash fix, 19 Nov 2026), or the build's own value. */
export const getSwitchLimit = (name: SwitchName, key: string, fallback: number): number => {
    const value = sessionLimits[name]?.[key];
    return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
};

let sessionRecoveryVersions: string[] | null = null;
/** Phase 2a: this session's flagged versions (what the previous launch kept), fixed for the session. */
export const getRecoveryFlaggedVersions = (): string[] => {
    if (!sessionRecoveryVersions) {
        const kept = readKept()?.recoverFromVersions;
        sessionRecoveryVersions = Array.isArray(kept) ? kept.filter(version => typeof version === 'string') : [];
    }
    return sessionRecoveryVersions;
};

/** A switch for this session (the tested default until startSessionSwitches has run). */
export const isSwitchOn = (name: SwitchName): boolean => (session ? session[name] : DEFAULTS[name]);

/** The Crashlytics value: the switches that are on, short names, comma-separated. */
export const describeSessionSwitches = (): string => SWITCH_NAMES.filter(isSwitchOn).map(name => SHORT[name]).join(',');

/** Keeps a fetched document for the next launch. */
export const keepSwitchDocument = (document: unknown, now = Date.now()) => {
    try { store()?.setItem(KEPT_KEY, JSON.stringify({ fetchedAt: now, rules: parseSwitchDocument(document), recoverFromVersions: parseRecoveryVersions(document) } satisfies Kept)); }
    catch { /* private mode: the next launch uses the defaults */ }
};
/** A launch that found no document (404) keeps "no rules", so the next launch is back on the defaults. */
export const keepNoSwitches = (now = Date.now()) => {
    try { store()?.setItem(KEPT_KEY, JSON.stringify({ fetchedAt: now, rules: {} } satisfies Kept)); } catch { /* private mode */ }
};

/** Test-only: forget this session's switches. */
export const resetSessionSwitchesForTest = () => { session = null; sessionLimits = {}; sessionRecoveryVersions = null; };
