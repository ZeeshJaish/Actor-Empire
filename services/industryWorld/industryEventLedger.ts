import type {
    IndustryEventEvidence,
    IndustryEventFact,
    IndustryEventImportance,
    IndustryEventLedgerState,
    IndustryEventType,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';

export const INDUSTRY_EVENT_SCHEMA_VERSION = 1 as const;
export const INDUSTRY_EVENT_LIMIT = 520;
export const INDUSTRY_EVENT_PUBLISHED_KEY_LIMIT = INDUSTRY_EVENT_LIMIT * 2;

const EVENT_TYPES = new Set<IndustryEventType>([
    'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS',
    'COMPANY_RECOVERED', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED', 'COMPANY_ACQUIRED',
    'COMPANY_CLOSED', 'PROJECT_GREENLIT', 'PROJECT_CAST', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_SOLD', 'PROJECT_CANCELLED',
    'PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED', 'PROJECT_HIT', 'PROJECT_FLOP',
    'PROJECT_SLEEPER', 'RIGHTS_DEAL', 'RIGHTS_TRANSFER', 'FRANCHISE_DECISION',
    'AWARD_NOMINATED', 'AWARD_WON', 'PARTNERSHIP_REPEATED',
]);
const IMPORTANCE = new Set<IndustryEventImportance>(['LOW', 'MEDIUM', 'HIGH']);
const EVIDENCE_KINDS = new Set<IndustryEventEvidence['kind']>([
    'COMPANY', 'PROJECT', 'PRODUCTION', 'PLATFORM', 'RIGHTS_CONTRACT', 'TRANSACTION', 'AWARD',
]);

const cleanText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const optionalText = (value: unknown): string | undefined => cleanText(value) || undefined;

const normalizeEvidence = (value: unknown): IndustryEventEvidence[] => {
    if (!Array.isArray(value)) return [];
    const seen = new Set<string>();
    return value.flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const candidate = item as Partial<IndustryEventEvidence>;
        const kind = candidate.kind;
        const id = cleanText(candidate.id);
        if (!kind || !EVIDENCE_KINDS.has(kind) || !id) return [];
        const metric = optionalText(candidate.metric);
        const key = `${kind}:${id}:${metric || ''}`;
        if (seen.has(key)) return [];
        seen.add(key);
        const numericValue = typeof candidate.value === 'number' && Number.isFinite(candidate.value)
            ? candidate.value
            : undefined;
        const stringValue = typeof candidate.value === 'string' ? optionalText(candidate.value) : undefined;
        return [{
            kind,
            id,
            ...(metric ? { metric } : {}),
            ...(numericValue !== undefined ? { value: numericValue } : stringValue ? { value: stringValue } : {}),
        }];
    });
};

const normalizeEvent = (value: unknown): IndustryEventFact | null => {
    if (!value || typeof value !== 'object') return null;
    const candidate = value as Partial<IndustryEventFact>;
    const idempotencyKey = cleanText(candidate.idempotencyKey);
    const type = candidate.type;
    const importance = candidate.importance;
    const absoluteWeek = Number(candidate.absoluteWeek);
    const headline = cleanText(candidate.headline);
    const detail = cleanText(candidate.detail);
    if (
        !idempotencyKey || !type || !EVENT_TYPES.has(type)
        || !importance || !IMPORTANCE.has(importance)
        || !Number.isFinite(absoluteWeek) || absoluteWeek < 0
        || !headline || !detail
    ) return null;

    return {
        schemaVersion: INDUSTRY_EVENT_SCHEMA_VERSION,
        id: createDeterministicId('industry_event', idempotencyKey),
        idempotencyKey,
        absoluteWeek: Math.round(absoluteWeek),
        type,
        importance,
        ...(optionalText(candidate.companyId) ? { companyId: optionalText(candidate.companyId) } : {}),
        ...(optionalText(candidate.companyName) ? { companyName: optionalText(candidate.companyName) } : {}),
        ...(optionalText(candidate.projectId) ? { projectId: optionalText(candidate.projectId) } : {}),
        ...(optionalText(candidate.productionId) ? { productionId: optionalText(candidate.productionId) } : {}),
        ...(optionalText(candidate.platformId) ? { platformId: optionalText(candidate.platformId) } : {}),
        ...(optionalText(candidate.rightsContractId) ? { rightsContractId: optionalText(candidate.rightsContractId) } : {}),
        ...(optionalText(candidate.transactionId) ? { transactionId: optionalText(candidate.transactionId) } : {}),
        ...(optionalText(candidate.awardEventId) ? { awardEventId: optionalText(candidate.awardEventId) } : {}),
        headline,
        detail,
        evidence: normalizeEvidence(candidate.evidence),
    };
};

const boundEvents = (events: IndustryEventFact[]): IndustryEventFact[] => {
    if (events.length <= INDUSTRY_EVENT_LIMIT) return events;
    const high = events.filter(event => event.importance === 'HIGH');
    const retainedHigh = high.slice(-Math.min(high.length, Math.floor(INDUSTRY_EVENT_LIMIT / 2)));
    const retainedIds = new Set(retainedHigh.map(event => event.id));
    const recent = events
        .filter(event => !retainedIds.has(event.id))
        .slice(-(INDUSTRY_EVENT_LIMIT - retainedHigh.length));
    return [...retainedHigh, ...recent]
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));
};

export const createIndustryEventFact = (
    input: Omit<IndustryEventFact, 'schemaVersion' | 'id'>,
): IndustryEventFact => normalizeEvent(input)!;

export const normalizeIndustryEventLedger = (value: unknown): IndustryEventLedgerState => {
    const source = value && typeof value === 'object' ? value as Partial<IndustryEventLedgerState> : {};
    const byKey = new Map<string, IndustryEventFact>();
    (Array.isArray(source.events) ? source.events : []).forEach(raw => {
        const event = normalizeEvent(raw);
        if (event && !byKey.has(event.idempotencyKey)) byKey.set(event.idempotencyKey, event);
    });
    const events = boundEvents([...byKey.values()]
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id)));
    const publishedEventKeys = [...new Set((Array.isArray(source.publishedEventKeys)
        ? source.publishedEventKeys
        : []).map(cleanText).filter(Boolean))].slice(-INDUSTRY_EVENT_PUBLISHED_KEY_LIMIT);
    const projected = Number(source.lastProjectedAbsoluteWeek);
    const processed = Number(source.lastProcessedAbsoluteWeek);
    return {
        schemaVersion: INDUSTRY_EVENT_SCHEMA_VERSION,
        lastProcessedAbsoluteWeek: Number.isFinite(processed) ? Math.round(processed) : -1,
        lastProjectedAbsoluteWeek: Number.isFinite(projected) ? Math.round(projected) : -1,
        events,
        publishedEventKeys,
    };
};

export const appendIndustryEventFacts = (
    ledger: unknown,
    facts: IndustryEventFact[],
): IndustryEventLedgerState => {
    const normalized = normalizeIndustryEventLedger(ledger);
    const existingKeys = new Set(normalized.events.map(event => event.idempotencyKey));
    const additions: IndustryEventFact[] = [];
    facts.forEach(raw => {
        const event = normalizeEvent(raw);
        if (!event || existingKeys.has(event.idempotencyKey)) return;
        existingKeys.add(event.idempotencyKey);
        additions.push(event);
    });
    if (!additions.length) return normalized;
    return normalizeIndustryEventLedger({ ...normalized, events: [...normalized.events, ...additions] });
};
