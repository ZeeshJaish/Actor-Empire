import { gameWeekText } from '../gameWeek';
import type {
    IndustryEventFact,
    IndustryEventImportance,
    IndustryEventType,
    IndustryProductionCommitment,
    PlatformAiDecisionRecord,
    StreamingEcosystemEvent,
    WorldState,
} from '../../types';
import { fillCopy, pickCopy, pickFreshCopy, sentenceStart, type CopyVars } from './mediaCopyVariety';
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

/* 2026-11-09 (Zeesh: "ek hi title baar baar repeat ho raha hai, bas naam aur subject alag hai"): each studio film
   event is written one of several ways, picked by the event's own key, so a story never changes once written.
   Details say what happened in plain words; they stay facts. */
type StudioEventFamily = { headlines: readonly string[]; details: readonly string[] };
const STUDIO_GREENLIT: StudioEventFamily = {
    headlines: ['{company} greenlights {title}', '{title} gets the green light', '{company} says yes to {title}', 'Green light for {title} at {company}', '{company} puts {title} into production', '{title} is a go', '{company} bets on {title}', 'New from {company}: {title}'],
    details: ['{title} is now in production at {company}.', '{company} has started work on {title}.', 'Work begins on {title}, a new {company} film.'],
};
const STUDIO_CAST: StudioEventFamily = {
    headlines: ['{title} assembles its principal creative team', '{title} finds its cast', 'The team behind {title} is set', 'Casting wraps on {title}', '{title} locks in its leads'],
    details: ['{company} has signed the main cast and crew for {title}.', 'The key people on {title} are now attached.', '{company} has finished putting the {title} team together.'],
};
const STUDIO_DATED: StudioEventFamily = {
    headlines: ['{company} dates {title}', '{title} gets a release date', 'Mark the calendar: {title}', '{company} sets {title} for {when}', '{title} arrives in {when}', 'It is official: {title} lands in {when}', '{company} locks in {title}', 'Release date set for {title}'],
    details: ['{title} is set for {when}.', '{company} plans to release {title} in {when}.', 'The release of {title} is planned for {when}.'],
};
const STUDIO_CANCELLED: StudioEventFamily = {
    headlines: ['{company} cancels {title}', '{title} is cancelled', '{company} pulls the plug on {title}', 'The end of the road for {title}', '{title} will not be finished'],
    details: ['{company} has stopped work on {title} for good.', 'Work on {title} is over; {company} has cancelled it.', '{company} has walked away from {title}.'],
};
const STUDIO_RELEASED: StudioEventFamily = {
    headlines: ['{title} is released', '{title} opens', '{title} arrives', '{title} is out now', 'Release day for {title}', '{company} unveils {title}', '{title} hits screens', 'The wait is over for {title}'],
    details: ['{company} has released {title}.', '{title} is now out from {company}.', 'Audiences can now see {title}, from {company}.'],
};
const STUDIO_HIT: StudioEventFamily = {
    headlines: ['{title} breaks out', '{title} is a hit', 'Audiences turn up for {title}', '{title} pays off for {company}', 'A big win for {title}', '{company} strikes gold with {title}', '{title} beats expectations', 'Crowds keep coming for {title}'],
    details: ['{company} has a hit on its hands with {title}.', '{title} finished with a strong result for {company}.', 'The final numbers make {title} a hit for {company}.'],
};
const STUDIO_FLOP: StudioEventFamily = {
    headlines: ['{title} falls short', '{title} disappoints', 'A tough result for {title}', '{title} misses its mark', 'Audiences pass on {title}', 'No lift-off for {title}', '{title} comes up short for {company}', 'A quiet run for {title}'],
    details: ['{title} finished below what {company} needed.', '{title} did not deliver for {company}.', 'The final numbers make {title} a miss for {company}.'],
};
const STUDIO_PROBLEMS: Record<'PROJECT_DELAYED' | 'PROJECT_OVERRUN' | 'PROJECT_HELD', StudioEventFamily> = {
    PROJECT_DELAYED: {
        headlines: ['{title} moves behind schedule', '{title} hits a delay', 'Delay for {title}', '{title} slips back', 'Schedule trouble for {title}'],
        details: ['{company} is dealing with a production problem on {title}.', 'A production problem has slowed {title} at {company}.', '{company} has a schedule problem on {title}.'],
    },
    PROJECT_OVERRUN: {
        headlines: ['{title} faces a budget overrun', '{title} runs over budget', 'Costs climb on {title}', 'Budget trouble for {title}', '{title} gets more expensive'],
        details: ['{company} is covering extra costs on {title}.', 'Spending on {title} has gone past the plan at {company}.', '{company} now expects {title} to cost more than planned.'],
    },
    PROJECT_HELD: {
        headlines: ['{title} is placed on hold', '{title} goes on hold', 'Work stops on {title}', '{company} pauses {title}', '{title} is on ice'],
        details: ['{company} has paused {title} while it deals with a production problem.', 'Production on {title} is stopped for now at {company}.', '{company} has put {title} on hold.'],
    },
};
/** headlines already out (the last half year of events, plus this week's as they are written): a new headline takes
    a frame none of them used, so two flops never read the same until every flop frame has been used */
type StudioEventFramesUsed = string[];
const studioEventCopy = (
    family: StudioEventFamily,
    key: string,
    vars: CopyVars,
    used?: StudioEventFramesUsed,
): { headline: string; detail: string } => {
    const headline = sentenceStart(fillCopy(pickFreshCopy(`studio-event:${key}`, family.headlines, used), vars));
    used?.push(headline);
    return {
        headline,
        detail: sentenceStart(fillCopy(pickCopy(`studio-event-detail:${key}`, family.details), vars)),
    };
};

const productionProblemFacts = (
    beforeProduction: IndustryProductionCommitment | undefined,
    production: IndustryProductionCommitment,
    companyName: string,
    absoluteWeek: number,
    used?: StudioEventFramesUsed,
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
            ...studioEventCopy(STUDIO_PROBLEMS[type === 'PROJECT_OVERRUN' || type === 'PROJECT_HELD' ? type : 'PROJECT_DELAYED'],
                `production-problem:${production.id}:${problem.id}`, { title: production.title, company: companyName }, used),
            evidence: [{ kind: 'PRODUCTION', id: production.id }, { kind: 'PROJECT', id: production.canonicalProjectId }],
        })];
    });
};

const collectProductionFacts = (before: WorldState, after: WorldState, absoluteWeek: number): IndustryEventFact[] => {
    const used: StudioEventFramesUsed = (after.industryEvents?.events || [])
        .filter(event => absoluteWeek - event.absoluteWeek <= 26)
        .map(event => event.headline);
    return Object.values(after.industryProductions || {}).flatMap(production => {
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
            ...studioEventCopy(STUDIO_GREENLIT, `production-created:${production.id}`, { title: production.title, company: studioName }, used),
        }));
        if (production.studioAiExecution?.talentSelected && !previous?.studioAiExecution?.talentSelected) {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-cast:${production.id}`,
                type: 'PROJECT_CAST',
                importance: 'MEDIUM',
                ...studioEventCopy(STUDIO_CAST, `production-cast:${production.id}`, { title: production.title, company: studioName }, used),
            }));
        }
        if (production.studioAiExecution?.plannedReleaseAbsoluteWeek !== undefined
            && previous?.studioAiExecution?.plannedReleaseAbsoluteWeek === undefined) {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-release-plan:${production.id}`,
                type: 'PROJECT_RELEASE_PLANNED',
                importance: 'MEDIUM',
                ...studioEventCopy(STUDIO_DATED, `production-release-plan:${production.id}`, {
                    title: production.title, company: studioName, when: gameWeekText(production.studioAiExecution.plannedReleaseAbsoluteWeek),
                }, used),
            }));
        }
        if (production.status === 'CANCELLED' && previous?.status !== 'CANCELLED') facts.push(createIndustryEventFact({
            ...common,
            idempotencyKey: `production-cancelled:${production.id}`,
            type: 'PROJECT_CANCELLED',
            importance: 'HIGH',
            ...studioEventCopy(STUDIO_CANCELLED, `production-cancelled:${production.id}`, { title: production.title, company: studioName }, used),
        }));
        if (production.status === 'RELEASED' && previous?.status !== 'RELEASED') {
            facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-released:${production.id}`,
                type: 'PROJECT_RELEASED',
                importance: 'HIGH',
                ...studioEventCopy(STUDIO_RELEASED, `production-released:${production.id}`, { title: production.title, company: studioName }, used),
            }));
        }
        const result=production.studioAiExecution?.result;
        if(result?.cinemaSettlement==='WEEKLY_CLOSED' && previous?.studioAiExecution?.result?.cinemaSettlement!=='WEEKLY_CLOSED' || production.status==='RELEASED' && previous?.status!=='RELEASED' && !result?.cinemaSettlement){
            const outcome = result?.outcome;
            if (outcome === 'HIT' || outcome === 'FLOP') facts.push(createIndustryEventFact({
                ...common,
                idempotencyKey: `production-result:${production.id}:${outcome}`,
                type: outcome === 'HIT' ? 'PROJECT_HIT' : 'PROJECT_FLOP',
                importance: 'HIGH',
                ...studioEventCopy(outcome === 'HIT' ? STUDIO_HIT : STUDIO_FLOP, `production-result:${production.id}:${outcome}`, { title: production.title, company: studioName }, used),
            }));
        }
        facts.push(...productionProblemFacts(previous, production, studioName, absoluteWeek, used));
        return facts;
    });
};

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
