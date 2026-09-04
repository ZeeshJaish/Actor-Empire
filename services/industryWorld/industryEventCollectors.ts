import type {
    IndustryEventFact,
    IndustryEventImportance,
    IndustryEventType,
    IndustryProductionCommitment,
    PlatformAiDecisionRecord,
    StreamingEcosystemEvent,
    WorldState,
} from '../../types';
import { createIndustryEventFact } from './industryEventLedger';

const ids = <T extends { id: string }>(items: T[] | undefined): Set<string> => (
    new Set((Array.isArray(items) ? items : []).map(item => item.id))
);

const platformDecisionType = (decision: PlatformAiDecisionRecord): IndustryEventType | null => {
    if (decision.type === 'RELEASE_HIT') return 'PROJECT_HIT';
    if (decision.type === 'RELEASE_FLOP') return 'PROJECT_FLOP';
    if (decision.type === 'MAJOR_GREENLIGHT' || decision.type === 'ORIGINAL_COMMISSION') return 'PROJECT_GREENLIT';
    if (decision.type === 'CAST_COMPETITION') return 'PROJECT_CAST';
    if (decision.type === 'CANCELLATION' || decision.type === 'PRODUCTION_CANCELLED') return 'PROJECT_CANCELLED';
    if (decision.type === 'PRODUCTION_DELIVERY') return 'PROJECT_RELEASE_PLANNED';
    if (decision.type === 'MAJOR_RELEASE') return 'PROJECT_RELEASED';
    if (decision.type === 'AWARDS_PUSH') return 'AWARD_NOMINATED';
    if (decision.type === 'PARENT_RESCUE') return 'COMPANY_FUNDED';
    if (decision.type === 'RESTRUCTURING') return 'COMPANY_RESTRUCTURED';
    if (decision.type === 'REGION_WITHDRAWAL') return 'COMPANY_DISTRESS';
    if (decision.action === 'PARENT_RESCUE' || decision.action === 'EXTERNAL_RECAPITALIZATION') return 'COMPANY_FUNDED';
    if (decision.action === 'RESTRUCTURE') return 'COMPANY_RESTRUCTURED';
    return null;
};

const platformDecisionImportance = (type: IndustryEventType): IndustryEventImportance => (
    ['PROJECT_HIT', 'PROJECT_FLOP', 'PROJECT_CANCELLED', 'PROJECT_RELEASED', 'COMPANY_FUNDED']
        .includes(type) ? 'HIGH' : 'MEDIUM'
);

const collectPlatformFacts = (before: WorldState, after: WorldState, absoluteWeek: number): IndustryEventFact[] => (
    Object.values(after.platforms || {}).flatMap(platform => {
        const known = ids(before.platforms?.[platform.id]?.ai?.decisionHistory);
        return (platform.ai?.decisionHistory || []).flatMap(decision => {
            if (known.has(decision.id) || decision.absoluteWeek !== absoluteWeek) return [];
            const type = platformDecisionType(decision);
            if (!type) return [];
            return [createIndustryEventFact({
                idempotencyKey: `platform-decision:${platform.id}:${decision.id}`,
                absoluteWeek,
                type,
                importance: platformDecisionImportance(type),
                companyId: platform.id,
                companyName: platform.name,
                platformId: platform.id,
                headline: decision.summary,
                detail: decision.reason || 'The platform changed its competitive position.',
                evidence: [{ kind: 'PLATFORM', id: platform.id }, { kind: 'TRANSACTION', id: decision.id }],
            })];
        });
    })
);

const ecosystemType = (event: StreamingEcosystemEvent): IndustryEventType => ({
    LAUNCH: 'COMPANY_LAUNCHED',
    PROMOTED: 'COMPANY_PROMOTED',
    EXPANSION: 'COMPANY_EXPANDED',
    DISTRESS: 'COMPANY_DISTRESS',
    RECOVERY: 'COMPANY_RECOVERED',
    ACQUIRED: 'COMPANY_ACQUIRED',
    CLOSED: 'COMPANY_CLOSED',
} as const)[event.type];

const collectEcosystemFacts = (before: WorldState, after: WorldState, absoluteWeek: number): IndustryEventFact[] => {
    const known = ids(before.streamingPlatformEcosystem?.eventHistory);
    return (after.streamingPlatformEcosystem?.eventHistory || []).flatMap(event => {
        if (known.has(event.id) || event.absoluteWeek !== absoluteWeek) return [];
        const operator = after.streamingPlatformEcosystem?.operators?.[event.operatorId];
        return [createIndustryEventFact({
            idempotencyKey: `streaming-ecosystem:${event.id}`,
            absoluteWeek,
            type: ecosystemType(event),
            importance: ['PROMOTED', 'ACQUIRED', 'CLOSED'].includes(event.type) ? 'HIGH' : 'MEDIUM',
            companyId: event.operatorId,
            companyName: operator?.name,
            platformId: event.operatorId,
            headline: event.headline,
            detail: event.detail,
            evidence: [{ kind: 'PLATFORM', id: event.operatorId }],
        })];
    });
};

const studioStatusType = (summary: string, status?: string): IndustryEventType => {
    const signal = `${status || ''} ${summary}`.toUpperCase();
    if (signal.includes('CLOSED') || signal.includes('WIND')) return 'COMPANY_CLOSED';
    if (signal.includes('RESTRUCTUR')) return 'COMPANY_RESTRUCTURED';
    if (signal.includes('RECOVER') || signal.includes('STEAD')) return 'COMPANY_RECOVERED';
    if (signal.includes('ACQUIR') || signal.includes('PLAYER CONTROL')) return 'COMPANY_ACQUIRED';
    return 'COMPANY_DISTRESS';
};

const collectStudioFacts = (before: WorldState, after: WorldState, absoluteWeek: number): IndustryEventFact[] => (
    Object.values(after.studios || {}).flatMap(studio => {
        const known = ids(before.studios?.[studio.id]?.ai?.events);
        return (studio.ai?.events || []).flatMap(event => {
            if (known.has(event.id) || event.absoluteWeek !== absoluteWeek) return [];
            if (event.type !== 'STATUS_CHANGED' && event.type !== 'OWNERSHIP_CHANGED') return [];
            const type = event.type === 'OWNERSHIP_CHANGED'
                ? 'COMPANY_ACQUIRED'
                : studioStatusType(event.summary, studio.ai?.status);
            return [createIndustryEventFact({
                idempotencyKey: `studio-event:${studio.id}:${event.id}`,
                absoluteWeek,
                type,
                importance: type === 'COMPANY_CLOSED' || type === 'COMPANY_ACQUIRED' ? 'HIGH' : 'MEDIUM',
                companyId: studio.id,
                companyName: studio.name,
                headline: event.summary,
                detail: type === 'COMPANY_ACQUIRED'
                    ? `${studio.name}'s ownership changed while its saved operations and slate were preserved.`
                    : `${studio.name}'s public financial and slate evidence changed materially.`,
                evidence: [{ kind: 'COMPANY', id: studio.id }],
            })];
        });
    })
);

const productionProblemFacts = (
    beforeProduction: IndustryProductionCommitment | undefined,
    production: IndustryProductionCommitment,
    companyName: string,
    absoluteWeek: number,
): IndustryEventFact[] => {
    const knownProblems = new Set(beforeProduction?.studioAiExecution?.problems.map(problem => problem.id) || []);
    return (production.studioAiExecution?.problems || []).flatMap(problem => {
        if (knownProblems.has(problem.id) || problem.occurredAtAbsoluteWeek !== absoluteWeek) return [];
        const type: IndustryEventType = problem.type === 'DELAY' ? 'PROJECT_DELAYED'
            : problem.type === 'OVERRUN' ? 'PROJECT_OVERRUN'
                : production.status === 'ON_HOLD' ? 'PROJECT_HELD' : 'PROJECT_DELAYED';
        return [createIndustryEventFact({
            idempotencyKey: `production-problem:${production.id}:${problem.id}`,
            absoluteWeek,
            type,
            importance: problem.severity >= 65 ? 'HIGH' : 'MEDIUM',
            companyId: production.producerStudioId,
            companyName,
            projectId: production.canonicalProjectId,
            productionId: production.id,
            headline: `${production.title} ${type === 'PROJECT_OVERRUN' ? 'faces a budget overrun' : type === 'PROJECT_HELD' ? 'is placed on hold' : 'moves behind schedule'}`,
            detail: `${companyName} is responding to a saved production problem; the consequence remains attached to the project.`,
            evidence: [{ kind: 'PRODUCTION', id: production.id }, { kind: 'PROJECT', id: production.canonicalProjectId }],
        })];
    });
};

const collectProductionFacts = (before: WorldState, after: WorldState, absoluteWeek: number): IndustryEventFact[] => (
    Object.values(after.industryProductions || {}).flatMap(production => {
        if (production.source !== 'STUDIO_INDEPENDENT') return [];
        const previous = before.industryProductions?.[production.id];
        const studioName = after.studios?.[production.producerStudioId]?.name || String(production.producerStudioId);
        const common = {
            absoluteWeek,
            companyId: production.producerStudioId,
            companyName: studioName,
            projectId: production.canonicalProjectId,
            productionId: production.id,
            evidence: [
                { kind: 'PRODUCTION' as const, id: production.id },
                { kind: 'PROJECT' as const, id: production.canonicalProjectId },
            ],
        };
        const facts: IndustryEventFact[] = [];
        if (!previous) facts.push(createIndustryEventFact({
            ...common,
            idempotencyKey: `production-created:${production.id}`,
            type: 'PROJECT_GREENLIT',
            importance: 'LOW',
            headline: `${studioName} greenlights ${production.title}`,
            detail: `${production.title} entered the canonical physical-production pipeline.`,
        }));
        if (production.studioAiExecution?.talentSelected && !previous?.studioAiExecution?.talentSelected) {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-cast:${production.id}`,
                type: 'PROJECT_CAST',
                importance: 'MEDIUM',
                headline: `${production.title} assembles its principal creative team`,
                detail: `${studioName} attached canonical talent to the production.`,
            }));
        }
        if (production.studioAiExecution?.plannedReleaseAbsoluteWeek !== undefined
            && previous?.studioAiExecution?.plannedReleaseAbsoluteWeek === undefined) {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-release-plan:${production.id}`,
                type: 'PROJECT_RELEASE_PLANNED',
                importance: 'MEDIUM',
                headline: `${studioName} dates ${production.title}`,
                detail: `${production.title} is planned for absolute week ${production.studioAiExecution.plannedReleaseAbsoluteWeek}.`,
            }));
        }
        if (production.status === 'CANCELLED' && previous?.status !== 'CANCELLED') facts.push(createIndustryEventFact({
            ...common,
            idempotencyKey: `production-cancelled:${production.id}`,
            type: 'PROJECT_CANCELLED',
            importance: 'HIGH',
            headline: `${studioName} cancels ${production.title}`,
            detail: `The production ended with its spending, bookings, and problems preserved.`,
        }));
        if (production.status === 'RELEASED' && previous?.status !== 'RELEASED') {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-released:${production.id}`,
                type: 'PROJECT_RELEASED',
                importance: 'HIGH',
                headline: `${production.title} is released`,
                detail: `${studioName} completed the saved release plan for ${production.title}.`,
            }));
            const outcome = production.studioAiExecution?.result?.outcome;
            if (outcome === 'HIT' || outcome === 'FLOP') facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-result:${production.id}:${outcome}`,
                type: outcome === 'HIT' ? 'PROJECT_HIT' : 'PROJECT_FLOP',
                importance: 'HIGH',
                headline: `${production.title} ${outcome === 'HIT' ? 'breaks out' : 'falls short'}`,
                detail: `${studioName}'s exact commercial settlement records a ${outcome.toLowerCase()} result.`,
            }));
        }
        facts.push(...productionProblemFacts(previous, production, studioName, absoluteWeek));
        return facts;
    })
);

export const collectIndustryEventFacts = (
    before: WorldState,
    after: WorldState,
    absoluteWeek: number,
): IndustryEventFact[] => [
    ...collectPlatformFacts(before, after, absoluteWeek),
    ...collectEcosystemFacts(before, after, absoluteWeek),
    ...collectStudioFacts(before, after, absoluteWeek),
    ...collectProductionFacts(before, after, absoluteWeek),
].sort((left, right) => left.idempotencyKey.localeCompare(right.idempotencyKey));
