import { Immer, enablePatches, type Patch } from 'immer';
import type {
    LifeEvent,
    LifeEventImpactResult,
    LifeEventOption,
    LifeEventPatchOperation,
    MaterializedLifeEventImpactPayload,
    Player,
    ScheduledEvent,
} from '../types';
import { resolveYoutubeEventChoice, type YoutubeEventResolution } from './youtubeEventLogic';
import {
    createUnresolvableLegacyLifeEventResult,
    resolveLegacyLifeEventChoice,
} from './legacyLifeEventResolution';

enablePatches();
const patchEngine = new Immer({ autoFreeze: false });
const MATERIALIZED_IMPACT_ID = 'MATERIALIZED_PATCH_V1' as const;
const MAX_PATCHES_PER_OPTION = 2_000;
const MAX_PATCH_PAYLOAD_BYTES = 1_500_000;
const FORBIDDEN_PATH_PARTS = new Set(['__proto__', 'prototype', 'constructor']);

const hashText = (value: string): number => {
    let hash = 0x811c9dc5;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 0x01000193);
    }
    return hash >>> 0;
};

const createSeededRandom = (seed: string) => {
    let state = hashText(seed) || 0x6d2b79f5;
    return () => {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
};

const withDeterministicGlobals = <T>(seed: string, operation: () => T): T => {
    const originalRandom = Math.random;
    const originalNow = Date.now;
    const random = createSeededRandom(seed);
    const baseTimestamp = 1_700_000_000_000 + hashText(seed);
    let timestampOffset = 0;
    Math.random = random;
    Date.now = () => baseTimestamp + timestampOffset++;
    try {
        return operation();
    } finally {
        Math.random = originalRandom;
        Date.now = originalNow;
    }
};

const cloneSerializable = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const assertSafePayload = (payload: MaterializedLifeEventImpactPayload): void => {
    if (!Array.isArray(payload.patches) || payload.patches.length > MAX_PATCHES_PER_OPTION) {
        throw new Error('Life-event impact patch count is invalid.');
    }
    payload.patches.forEach(patch => {
        if (!['add', 'remove', 'replace'].includes(patch.op)) {
            throw new Error('Life-event impact contains an unsupported patch operation.');
        }
        if (!Array.isArray(patch.path) || patch.path.some(part => FORBIDDEN_PATH_PARTS.has(String(part)))) {
            throw new Error('Life-event impact contains an unsafe patch path.');
        }
    });
    if (JSON.stringify(payload).length > MAX_PATCH_PAYLOAD_BYTES) {
        throw new Error('Life-event impact payload exceeds the safe size limit.');
    }
};

const createStableOptionId = (event: ScheduledEvent, option: LifeEventOption, optionIndex: number): string => {
    if (option.id) return option.id;
    const identity = `${event.id}|${option.labelKey || option.label}|${optionIndex}`;
    return `option_${hashText(identity).toString(36)}`;
};

export const getLifeEventOptionIdentity = createStableOptionId;

const materializeOption = (
    player: Player,
    event: ScheduledEvent,
    option: LifeEventOption,
    optionIndex: number,
): LifeEventOption => {
    if (option.impactId || option.noEffect || typeof option.impact !== 'function') {
        return option.id ? option : { ...option, id: createStableOptionId(event, option, optionIndex) };
    }

    const id = createStableOptionId(event, option, optionIndex);
    const resolutionSeed = `${event.id}:${id}:v1`;
    let outcome: Omit<LifeEventImpactResult, 'updatedPlayer'> | null = null;
    const [, patches] = withDeterministicGlobals(resolutionSeed, () => patchEngine.produceWithPatches(
        player,
        draft => {
            const result = option.impact!(draft as unknown as Player);
            const { updatedPlayer, ...resultOutcome } = result;
            outcome = cloneSerializable(resultOutcome);
            if (updatedPlayer !== (draft as unknown as Player)) {
                Object.entries(updatedPlayer).forEach(([key, value]) => {
                    const draftRecord = draft as unknown as Record<string, unknown>;
                    if (draftRecord[key] !== value) draftRecord[key] = value;
                });
            }
        },
    ));
    if (!outcome) throw new Error('Life-event impact did not provide an outcome.');

    const persistenceSafePatches = patches.filter(patch => patch.path[0] !== 'pendingEvents');
    const impactPayload: MaterializedLifeEventImpactPayload = {
        patches: cloneSerializable(persistenceSafePatches) as LifeEventPatchOperation[],
        outcome,
    };
    assertSafePayload(impactPayload);
    return {
        ...option,
        id,
        impactId: MATERIALIZED_IMPACT_ID,
        impactPayload,
        resolutionSeed,
    };
};

const materializeEvent = (player: Player, event: ScheduledEvent, strict: boolean): ScheduledEvent => {
    const lifeEvent = event.data?.lifeEvent as LifeEvent | undefined;
    if (!lifeEvent || !Array.isArray(lifeEvent.options)) return event;
    try {
        return {
            ...event,
            data: {
                ...event.data,
                lifeEvent: {
                    ...lifeEvent,
                    eventSchemaVersion: 1,
                    options: lifeEvent.options.map((option, index) => materializeOption(player, event, option, index)),
                },
            },
        };
    } catch (error) {
        if (strict) throw error;
        return event;
    }
};

export const materializePlayerLifeEventImpacts = (
    player: Player,
    options: { strict?: boolean } = {},
): Player => {
    const strict = options.strict === true;
    const pendingEvents = (player.pendingEvents || []).map(event => materializeEvent(player, event, strict));
    const scheduledEvents = (player.scheduledEvents || []).map(event => materializeEvent(player, event, strict));
    return {
        ...player,
        pendingEvents,
        scheduledEvents,
    };
};

type LifeEventImpactResolver = (
    player: Player,
    payload: MaterializedLifeEventImpactPayload | undefined,
) => LifeEventImpactResult;

const resolveMaterializedPatch: LifeEventImpactResolver = (player, payload) => {
    if (!payload) throw new Error('Life-event impact payload is missing.');
    assertSafePayload(payload);
    const updatedPlayer = patchEngine.applyPatches(player, payload.patches as Patch[]) as Player;
    return {
        updatedPlayer,
        ...cloneSerializable(payload.outcome),
        resolutionKind: 'SERIALIZED',
    };
};

const impactRegistry: Record<string, LifeEventImpactResolver> = {
    [MATERIALIZED_IMPACT_ID]: resolveMaterializedPatch,
};

export const resolveLifeEventChoice = (
    player: Player,
    event: ScheduledEvent,
    lifeEvent: LifeEvent,
    option: LifeEventOption,
    _optionIndex: number,
): LifeEventImpactResult | null => {
    const registeredResolver = option.impactId ? impactRegistry[option.impactId] : undefined;
    if (registeredResolver) return registeredResolver(player, option.impactPayload);
    if (option.impactId) throw new Error(`Life-event resolver is not registered: ${option.impactId}`);
    const youtubeResolution = event.data?.youtubeResolution as YoutubeEventResolution | undefined;
    if (youtubeResolution?.domain === 'YOUTUBE' && option.id) {
        return {
            ...resolveYoutubeEventChoice(player, youtubeResolution, option.id),
            resolutionKind: 'SERIALIZED_ADAPTER',
        };
    }
    if (typeof option.impact === 'function') {
        return { ...option.impact(player), resolutionKind: 'RUNTIME_CALLBACK' };
    }
    if (option.noEffect) return { updatedPlayer: player, log: '', resolutionKind: 'EXPLICIT_NO_EFFECT' };
    if (lifeEvent.eventSchemaVersion && lifeEvent.eventSchemaVersion >= 1) {
        throw new Error('New-schema life-event option has no registered resolver.');
    }
    const reconstructed = resolveLegacyLifeEventChoice(player, event, lifeEvent, option);
    return reconstructed || createUnresolvableLegacyLifeEventResult(player);
};

export const isRegisteredLifeEventImpactId = (impactId: unknown): boolean => (
    typeof impactId === 'string' && typeof impactRegistry[impactId] === 'function'
);

export const getLifeEventResolutionContractViolations = (player: Player): string[] => {
    const events = [...(player.pendingEvents || []), ...(player.scheduledEvents || [])];
    const violations: string[] = [];
    events.forEach(event => {
        const lifeEvent = event.data?.lifeEvent as LifeEvent | undefined;
        if (!lifeEvent || !Array.isArray(lifeEvent.options)) return;
        if (lifeEvent.options.some(option => option.impactId) && lifeEvent.eventSchemaVersion !== 1) {
            violations.push(`${event.id}: event schema version is missing or unsupported`);
        }
        lifeEvent.options.forEach((option, optionIndex) => {
            const identity = `${event.id}:${option.id || optionIndex}`;
            if (!option.id) {
                violations.push(`${identity}: option id is missing`);
                return;
            }
            if (option.noEffect) return;
            if (event.data?.youtubeResolution?.domain === 'YOUTUBE') return;
            if (event.type === 'LEGAL_HEARING' && typeof event.data?.caseId === 'string') return;
            if (!isRegisteredLifeEventImpactId(option.impactId)) {
                violations.push(`${identity}: resolver is missing or unregistered`);
                return;
            }
            try {
                assertSafePayload(option.impactPayload as MaterializedLifeEventImpactPayload);
            } catch (error) {
                violations.push(`${identity}: ${error instanceof Error ? error.message : 'payload is invalid'}`);
            }
        });
    });
    return violations;
};
