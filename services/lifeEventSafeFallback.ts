import type {
    EventImpactSignal,
    LifeEvent,
    LifeEventImpactResult,
    LifeEventOption,
    LifeEventSafeFallbackStat,
    Player,
    ScheduledEvent,
} from '../types';
import { resolveLifeEventChoice } from './lifeEventResolver';

const SAFE_STATS: readonly LifeEventSafeFallbackStat[] = ['fame', 'reputation', 'happiness'];
const PREVIEW_KEY_TO_STAT: Readonly<Record<string, LifeEventSafeFallbackStat>> = {
    'life.effect.fame': 'fame',
    'life.effect.reputation': 'reputation',
    'life.effect.happiness': 'happiness',
};
const DEFAULT_LOG = 'Your choice was acknowledged. The game used a safe result and continued without risking your career save.';
const DEFAULT_LOG_KEY = 'life.modal.safeFallback.log';

type SafeDeltas = Partial<Record<LifeEventSafeFallbackStat, number>>;
type PrimaryLifeEventResolver = typeof resolveLifeEventChoice;

export interface LifeEventSafeResolution {
    result: LifeEventImpactResult;
    primaryError?: unknown;
}

const cloneRuntimeValue = <T>(value: T, seen = new WeakMap<object, unknown>()): T => {
    if (value === null || (typeof value !== 'object' && typeof value !== 'function')) return value;
    if (typeof value === 'function') return value;
    if (value instanceof Date) return new Date(value.getTime()) as T;
    const cached = seen.get(value as object);
    if (cached) return cached as T;
    if (Array.isArray(value)) {
        const copy: unknown[] = [];
        seen.set(value, copy);
        value.forEach(item => copy.push(cloneRuntimeValue(item, seen)));
        return copy as T;
    }
    if (value instanceof Map) {
        const copy = new Map();
        seen.set(value, copy);
        value.forEach((mapValue, key) => copy.set(
            cloneRuntimeValue(key, seen),
            cloneRuntimeValue(mapValue, seen),
        ));
        return copy as T;
    }
    if (value instanceof Set) {
        const copy = new Set();
        seen.set(value, copy);
        value.forEach(setValue => copy.add(cloneRuntimeValue(setValue, seen)));
        return copy as T;
    }
    const copy = Object.create(Object.getPrototypeOf(value)) as Record<PropertyKey, unknown>;
    seen.set(value as object, copy);
    Reflect.ownKeys(value as object).forEach(key => {
        copy[key] = cloneRuntimeValue((value as Record<PropertyKey, unknown>)[key], seen);
    });
    return copy as T;
};

const clampStat = (value: number): number => Math.max(0, Math.min(100, value));

const directionOf = (value: unknown): number => (
    typeof value === 'number' && Number.isFinite(value) && value !== 0
        ? Math.sign(value)
        : 0
);

const previewDirectionOf = (value: unknown): number => {
    if (typeof value !== 'string') return 0;
    const normalized = value.trim();
    if (!/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(normalized)) return 0;
    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric !== 0 ? Math.sign(numeric) : 0;
};

const explicitDeltasFor = (option: LifeEventOption): SafeDeltas => {
    const configured = option.safeFallback?.statDeltas;
    if (!configured || typeof configured !== 'object') return {};
    return SAFE_STATS.reduce<SafeDeltas>((deltas, stat) => {
        const direction = directionOf(configured[stat]);
        if (direction) deltas[stat] = direction;
        return deltas;
    }, {});
};

const previewDeltasFor = (option: LifeEventOption): SafeDeltas => {
    if (!Array.isArray(option.previewEffects)) return {};
    return option.previewEffects.reduce<SafeDeltas>((deltas, signal) => {
        const stat = signal?.labelKey ? PREVIEW_KEY_TO_STAT[signal.labelKey] : undefined;
        if (!stat || deltas[stat]) return deltas;
        const direction = previewDirectionOf(signal.value);
        if (direction) deltas[stat] = direction;
        return deltas;
    }, {});
};

const effectFor = (stat: LifeEventSafeFallbackStat, delta: number): EventImpactSignal => ({
    label: stat === 'fame' ? 'Fame' : stat === 'reputation' ? 'Reputation' : 'Happiness',
    labelKey: `life.effect.${stat}`,
    value: delta > 0 ? `+${delta}` : String(delta),
    tone: delta > 0 ? 'positive' : 'negative',
});

/**
 * Produces a deliberately narrow recovery result when the real life-event resolver fails.
 * It never reads player-facing prose and can only adjust three non-economic stats by one point.
 */
export const createSafeLifeEventFallback = (
    player: Player,
    _event: ScheduledEvent,
    _lifeEvent: LifeEvent,
    option: LifeEventOption,
    _optionIndex: number,
    reason: string,
): LifeEventImpactResult => {
    const hasExplicitFallback = Boolean(option.safeFallback);
    const requestedDeltas = hasExplicitFallback
        ? explicitDeltasFor(option)
        : previewDeltasFor(option);
    const updatedPlayer: Player = {
        ...player,
        stats: { ...player.stats },
    };
    const effects: EventImpactSignal[] = [];

    SAFE_STATS.forEach(stat => {
        const requestedDelta = requestedDeltas[stat];
        const current = player.stats?.[stat];
        if (!requestedDelta || typeof current !== 'number' || !Number.isFinite(current)) return;
        const next = clampStat(current + requestedDelta);
        const appliedDelta = next - current;
        if (!appliedDelta) return;
        updatedPlayer.stats[stat] = next;
        effects.push(effectFor(stat, appliedDelta));
    });

    const fallbackSource = hasExplicitFallback
        ? 'EXPLICIT'
        : effects.length > 0
            ? 'STRUCTURED_PREVIEW'
            : 'NO_CHANGE';

    return {
        updatedPlayer,
        log: option.safeFallback?.log || DEFAULT_LOG,
        logKey: option.safeFallback?.logKey || (option.safeFallback?.log ? undefined : DEFAULT_LOG_KEY),
        logVars: option.safeFallback?.logVars,
        effects,
        resolutionKind: 'SAFE_FALLBACK',
        fallbackReason: reason,
        fallbackSource,
    };
};

const fallbackReasonFor = (error: unknown): string => {
    if (!(error instanceof Error)) return 'PRIMARY_RESOLVER_UNKNOWN_ERROR';
    const errorType = error.name.replace(/[^a-z0-9]+/gi, '_').toUpperCase() || 'ERROR';
    return `PRIMARY_RESOLVER_${errorType}`;
};

/** Executes the real resolver first and converts only a resolver failure into the bounded fallback. */
export const resolveLifeEventChoiceWithSafeFallback = (
    player: Player,
    event: ScheduledEvent,
    lifeEvent: LifeEvent,
    option: LifeEventOption,
    optionIndex: number,
    primaryResolver: PrimaryLifeEventResolver = resolveLifeEventChoice,
): LifeEventSafeResolution => {
    const resolverPlayer = cloneRuntimeValue(player);
    try {
        const result = primaryResolver(resolverPlayer, event, lifeEvent, option, optionIndex);
        if (!result) throw new Error('Life-event choice did not produce a resolution.');
        return { result };
    } catch (primaryError) {
        return {
            result: createSafeLifeEventFallback(
                player,
                event,
                lifeEvent,
                option,
                optionIndex,
                fallbackReasonFor(primaryError),
            ),
            primaryError,
        };
    }
};
