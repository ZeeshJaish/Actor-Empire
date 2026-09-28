import type { LifeEvent, LifeEventOption, ScheduledEvent } from '../types';

export type LifeEventResolutionPath =
    | 'SERIALIZED_IMPACT'
    | 'SERIALIZED_YOUTUBE'
    | 'REBUILT_LEGAL'
    | 'RUNTIME_CALLBACK'
    | 'LEGACY_RECOVERY'
    | 'LEGACY_UNRESOLVABLE'
    | 'MISSING';

interface LifeEventSource {
    source: string;
    detail: string;
}

const stringValue = (value: unknown): string => typeof value === 'string' && value.trim()
    ? value.trim()
    : 'UNKNOWN';

const resolveLifeEventSource = (event: ScheduledEvent, lifeEvent?: LifeEvent): LifeEventSource => {
    const data = event.data && typeof event.data === 'object' ? event.data : {};
    if (data.youtubeResolution?.domain === 'YOUTUBE') {
        return { source: 'YOUTUBE', detail: stringValue(data.youtubeResolution?.kind) };
    }
    if (event.type === 'LEGAL_HEARING' && typeof data.caseId === 'string') {
        return { source: 'LEGAL_HEARING', detail: data.caseId };
    }

    const taggedSources: Array<[string, unknown]> = [
        ['WORLD_REACTION', data.worldReactionEventType],
        ['REGULATOR_PRESSURE', data.regulatorPressureEventType],
        ['TALENT_INSTABILITY', data.talentInstabilityEventType],
        ['RIVAL_RETALIATION', data.rivalRetaliationEventType],
        ['STOCK_DECISION', data.stockDecisionType],
    ];
    const tagged = taggedSources.find(([, value]) => typeof value === 'string' && value.length > 0);
    if (tagged) return { source: tagged[0], detail: tagged[1] as string };

    if (lifeEvent?.id.startsWith('funding_breach_')) return { source: 'FUNDING_BREACH', detail: 'PLATFORM_FUNDING' };
    if (lifeEvent?.id.startsWith('audit_')) return { source: 'GOVERNMENT_AUDIT', detail: 'DELAYED_AUDIT' };
    if (lifeEvent?.id.startsWith('luxe_')) return { source: 'LUXE_LIFE_EVENT', detail: stringValue(lifeEvent.type) };

    return {
        source: 'LIFE_EVENT_LOGIC',
        detail: stringValue(lifeEvent?.category || lifeEvent?.type),
    };
};

const resolvePath = (
    event: ScheduledEvent,
    lifeEvent: LifeEvent | undefined,
    option: LifeEventOption,
): LifeEventResolutionPath => {
    if (option.impactId) return 'SERIALIZED_IMPACT';
    if (event.data?.youtubeResolution?.domain === 'YOUTUBE' && option.id) return 'SERIALIZED_YOUTUBE';
    if (event.type === 'LEGAL_HEARING' && typeof event.data?.caseId === 'string') return 'REBUILT_LEGAL';
    if (typeof option.impact === 'function') return 'RUNTIME_CALLBACK';
    const hasTaggedLegacyResolver = Boolean(option.id) && Boolean(
        event.data?.worldReactionEventType
        || event.data?.regulatorPressureEventType
        || event.data?.talentInstabilityEventType
        || event.data?.rivalRetaliationEventType
        || (event.data?.stockDecisionType === 'SHAREHOLDER_VOTE' && event.data?.voteId),
    );
    const hasAuditResolver = Boolean(
        lifeEvent?.id.startsWith('audit_')
        && (
            option.labelKey === 'life.event.audit.government.fight.label'
            || option.labelKey === 'life.event.audit.government.pay.label'
        ),
    );
    if (hasTaggedLegacyResolver || hasAuditResolver) return 'LEGACY_RECOVERY';
    if (!lifeEvent?.eventSchemaVersion) return 'LEGACY_UNRESOLVABLE';
    return 'MISSING';
};

export const buildLifeEventDiagnosticContext = (
    event: ScheduledEvent,
    lifeEvent: LifeEvent | undefined,
    option: LifeEventOption,
    optionIndex: number,
) => {
    const source = resolveLifeEventSource(event, lifeEvent);
    return {
        event_id: stringValue(event.id),
        event_type: stringValue(event.type),
        life_event_id: stringValue(lifeEvent?.id),
        life_event_type: stringValue(lifeEvent?.type),
        life_event_category: stringValue(lifeEvent?.category),
        event_source: source.source,
        event_source_detail: source.detail,
        option_id: stringValue(option.id),
        option_index: optionIndex,
        golden: option.isGolden === true,
        resolution_path: resolvePath(event, lifeEvent, option),
    };
};
