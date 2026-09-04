import type {
    StreamingRightsDelegationTrace,
    StreamingRightsStudioMandate,
} from '../types';

const cleanText = (value: unknown, fallback = '', maxLength = 240): string => {
    const text = typeof value === 'string' ? value.trim() : '';
    return (text || fallback).slice(0, maxLength);
};

export interface CreateStreamingRightsDelegationTraceInput {
    mandate: StreamingRightsStudioMandate;
    rule: string;
    facts: Record<string, string | number | boolean | null | undefined>;
    explanation: string;
}

export const createStreamingRightsDelegationTrace = (
    input: CreateStreamingRightsDelegationTraceInput,
): StreamingRightsDelegationTrace => ({
    mandateStudioId: input.mandate.studioId,
    mandateRevision: Math.max(1, Math.round(input.mandate.revision)),
    controlMode: input.mandate.controlMode,
    rule: cleanText(input.rule, 'DELEGATED_WITHIN_MANDATE', 120),
    facts: Object.fromEntries(Object.entries(input.facts)
        .filter((entry): entry is [string, string | number | boolean | null] => entry[1] !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, value]) => [cleanText(key, 'fact', 80), typeof value === 'number' && !Number.isFinite(value) ? 0 : value])),
    explanation: cleanText(input.explanation, 'Routine decision completed within the saved mandate.'),
});

export const normalizeStreamingRightsDelegationTrace = (
    value: unknown,
): StreamingRightsDelegationTrace | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const source = value as Record<string, unknown>;
    const studioId = cleanText(source.mandateStudioId, '', 120);
    const rule = cleanText(source.rule, '', 120);
    if (!studioId || !rule) return null;
    const controlMode = source.controlMode === 'STRATEGY' || source.controlMode === 'FULL' ? source.controlMode : 'CUSTOM';
    const rawFacts = source.facts && typeof source.facts === 'object' && !Array.isArray(source.facts)
        ? source.facts as Record<string, unknown>
        : {};
    return {
        mandateStudioId: studioId,
        mandateRevision: Math.max(1, Math.round(Number(source.mandateRevision) || 1)),
        controlMode,
        rule,
        facts: Object.fromEntries(Object.entries(rawFacts).flatMap(([key, fact]): Array<[string, string | number | boolean | null]> => {
            if (!['string', 'number', 'boolean'].includes(typeof fact) && fact !== null) return [];
            const value = typeof fact === 'number' && !Number.isFinite(fact) ? 0 : fact;
            return [[cleanText(key, 'fact', 80), value as string | number | boolean | null]];
        }).sort(([left], [right]) => left.localeCompare(right))),
        explanation: cleanText(source.explanation, 'Routine decision completed within the saved mandate.'),
    };
};
