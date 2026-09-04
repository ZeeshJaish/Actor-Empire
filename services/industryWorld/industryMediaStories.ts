import type {
    IndustryEventFact,
    IndustryEventImportance,
    IndustryMediaChannel,
    IndustryMediaStory,
    IndustryMediaStoryCategory,
    IndustryMediaStoryStage,
    IndustryMediaWorldState,
} from '../../types';
import { createDeterministicId } from '../deterministicRandom';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

export const INDUSTRY_MEDIA_RELEVANCE_WEEKS = 8;

const TERMINAL_STAGES = new Set<IndustryMediaStoryStage>(['RESOLVED', 'FADED', 'SUPERSEDED']);

const RESOLVED_EVENT_TYPES = new Set<IndustryEventFact['type']>([
    'COMPANY_RECOVERED', 'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
    'PROJECT_CANCELLED', 'PROJECT_HIT', 'PROJECT_FLOP', 'PROJECT_SLEEPER',
    'AWARD_WON',
]);

const DEVELOPING_EVENT_TYPES = new Set<IndustryEventFact['type']>([
    'COMPANY_DISTRESS', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED',
    'PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_SOLD',
]);

const COMPANY_EVENT_TYPES = new Set<IndustryEventFact['type']>([
    'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS',
    'COMPANY_RECOVERED', 'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED',
    'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
]);

const importanceRank: Record<IndustryEventImportance, number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

const strongerImportance = (
    left: IndustryEventImportance,
    right: IndustryEventImportance,
): IndustryEventImportance => importanceRank[right] > importanceRank[left] ? right : left;

export const getIndustryMediaSubjectKey = (event: IndustryEventFact): string => {
    if (event.type === 'RIGHTS_DEAL' || event.type === 'RIGHTS_TRANSFER') {
        if (event.rightsContractId) return `rights:${event.rightsContractId}`;
        if (event.projectId) return `project:${event.projectId}`;
    }
    if (event.projectId) return `project:${event.projectId}`;
    if (event.productionId) return `production:${event.productionId}`;
    if (COMPANY_EVENT_TYPES.has(event.type) || event.type === 'PARTNERSHIP_REPEATED') {
        if (event.companyId) return `company:${event.companyId}`;
        if (event.platformId) return `company:${event.platformId}`;
    }
    if (event.rightsContractId) return `rights:${event.rightsContractId}`;
    if (event.awardEventId) return `award:${event.awardEventId}`;
    if (event.companyId) return `company:${event.companyId}`;
    if (event.platformId) return `company:${event.platformId}`;
    return `event:${event.id}`;
};

export const getIndustryMediaCategory = (event: IndustryEventFact): IndustryMediaStoryCategory => {
    if (COMPANY_EVENT_TYPES.has(event.type)) return 'COMPANY';
    if (event.type === 'RIGHTS_DEAL' || event.type === 'RIGHTS_TRANSFER') return 'RIGHTS';
    if (event.type === 'FRANCHISE_DECISION') return 'FRANCHISE';
    if (event.type === 'AWARD_NOMINATED' || event.type === 'AWARD_WON') return 'AWARDS';
    if (event.type === 'PARTNERSHIP_REPEATED') return 'PARTNERSHIP';
    if (event.type === 'PROJECT_GREENLIT' || event.type === 'PROJECT_CAST') return 'PROJECT_DEVELOPMENT';
    if (['PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_SOLD', 'PROJECT_CANCELLED']
        .includes(event.type)) return 'PROJECT_PRODUCTION';
    if (event.type === 'PROJECT_RELEASE_PLANNED' || event.type === 'PROJECT_RELEASED') return 'PROJECT_RELEASE';
    return 'PROJECT_OUTCOME';
};

export const getIndustryMediaStage = (event: IndustryEventFact): IndustryMediaStoryStage => {
    if (RESOLVED_EVENT_TYPES.has(event.type)) return 'RESOLVED';
    if (DEVELOPING_EVENT_TYPES.has(event.type)) return 'DEVELOPING';
    return 'CONFIRMED';
};

const channelEligibilityFor = (event: IndustryEventFact): IndustryMediaChannel[] => {
    const channels: IndustryMediaChannel[] = [];
    if (event.importance === 'HIGH' || [
        'COMPANY_LAUNCHED', 'COMPANY_EXPANDED', 'COMPANY_DISTRESS', 'COMPANY_FUNDED',
        'COMPANY_RESTRUCTURED', 'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
        'PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_CANCELLED',
        'PROJECT_RELEASED', 'RIGHTS_DEAL', 'RIGHTS_TRANSFER', 'AWARD_WON',
    ].includes(event.type)) channels.push('NEWS');
    if (event.importance !== 'LOW') channels.push('X');
    if (event.importance === 'HIGH' && [
        'COMPANY_LAUNCHED', 'PROJECT_CAST', 'PROJECT_RELEASED', 'AWARD_WON',
    ].includes(event.type)) channels.push('INSTAGRAM');
    if ([
        'FRANCHISE_DECISION', 'PROJECT_RELEASED', 'PROJECT_HIT', 'PROJECT_FLOP',
        'PROJECT_SLEEPER', 'AWARD_NOMINATED', 'AWARD_WON',
    ].includes(event.type)) channels.push('YOUTUBE');
    return [...new Set(channels)];
};

const nextPublicationWeekFor = (event: IndustryEventFact): number | undefined => {
    if (event.importance === 'LOW') return undefined;
    return event.absoluteWeek + (event.importance === 'HIGH' ? 1 : 2);
};

const storyRefs = (event: IndustryEventFact) => ({
    ...(event.companyId ? { companyId: event.companyId } : {}),
    ...(event.companyName ? { companyName: event.companyName } : {}),
    ...(event.platformId ? { platformId: event.platformId } : {}),
    ...(event.projectId ? { projectId: event.projectId } : {}),
    ...(event.productionId ? { productionId: event.productionId } : {}),
    ...(event.rightsContractId ? { rightsContractId: event.rightsContractId } : {}),
    ...(event.transactionId ? { transactionId: event.transactionId } : {}),
    ...(event.awardEventId ? { awardEventId: event.awardEventId } : {}),
});

const createStory = (event: IndustryEventFact): IndustryMediaStory => {
    const subjectKey = getIndustryMediaSubjectKey(event);
    const stage = getIndustryMediaStage(event);
    return {
        schemaVersion: 1,
        id: createDeterministicId('industry_media_story', `${subjectKey}:${event.id}`),
        subjectKey,
        category: getIndustryMediaCategory(event),
        stage,
        importance: event.importance,
        primaryIndustryEventId: event.id,
        industryEventIds: [event.id],
        firstAbsoluteWeek: event.absoluteWeek,
        lastAdvancedAbsoluteWeek: event.absoluteWeek,
        ...(nextPublicationWeekFor(event) !== undefined
            ? { nextEligiblePublicationWeek: nextPublicationWeekFor(event) }
            : {}),
        headline: event.headline,
        detail: event.detail,
        channelEligibility: channelEligibilityFor(event),
        publishedChannels: [],
        ...storyRefs(event),
        ...(stage === 'RESOLVED' ? {
            resolutionIndustryEventId: event.id,
            resolutionAbsoluteWeek: event.absoluteWeek,
        } : {}),
    };
};

const advanceStory = (story: IndustryMediaStory, event: IndustryEventFact): IndustryMediaStory => {
    const stage = getIndustryMediaStage(event);
    return {
        ...story,
        category: getIndustryMediaCategory(event),
        stage,
        importance: strongerImportance(story.importance, event.importance),
        industryEventIds: [...story.industryEventIds, event.id],
        lastAdvancedAbsoluteWeek: event.absoluteWeek,
        ...(nextPublicationWeekFor(event) !== undefined
            ? { nextEligiblePublicationWeek: nextPublicationWeekFor(event) }
            : { nextEligiblePublicationWeek: undefined }),
        headline: event.headline,
        detail: event.detail,
        channelEligibility: [...new Set([...story.channelEligibility, ...channelEligibilityFor(event)])],
        ...storyRefs(event),
        ...(stage === 'RESOLVED' ? {
            resolutionIndustryEventId: event.id,
            resolutionAbsoluteWeek: event.absoluteWeek,
        } : {
            resolutionIndustryEventId: undefined,
            resolutionAbsoluteWeek: undefined,
        }),
    };
};

const fadeInactiveStories = (
    stories: IndustryMediaStory[],
    absoluteWeek: number,
): { stories: IndustryMediaStory[]; fadedStoryIds: string[] } => {
    const fadedStoryIds: string[] = [];
    const nextStories = stories.map(story => {
        if (
            TERMINAL_STAGES.has(story.stage)
            || absoluteWeek - story.lastAdvancedAbsoluteWeek <= INDUSTRY_MEDIA_RELEVANCE_WEEKS
        ) return story;
        fadedStoryIds.push(story.id);
        return { ...story, stage: 'FADED' as const, nextEligiblePublicationWeek: undefined };
    });
    return { stories: nextStories, fadedStoryIds };
};

export interface IndustryMediaAdvanceResult {
    state: IndustryMediaWorldState;
    changedStoryIds: string[];
    eventStoryIds: Record<string, string>;
}

export const advanceIndustryMediaStories = (
    inputState: unknown,
    inputEvents: IndustryEventFact[],
    absoluteWeek: number,
): IndustryMediaAdvanceResult => {
    const normalized = normalizeIndustryMediaWorld(inputState);
    const faded = fadeInactiveStories(normalized.stories, absoluteWeek);
    const stories = [...faded.stories];
    const knownEvents = new Set(Object.keys(normalized.eventStoryIndex));
    const changedStoryIds = [...faded.fadedStoryIds];
    const eventStoryIds: Record<string, string> = {};
    const orderedEvents = [...inputEvents]
        .filter(event => event.absoluteWeek <= absoluteWeek)
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id));

    orderedEvents.forEach(event => {
        const knownStoryId = normalized.eventStoryIndex[event.id];
        if (knownStoryId) {
            eventStoryIds[event.id] = knownStoryId;
            return;
        }
        if (knownEvents.has(event.id)) return;
        const subjectKey = getIndustryMediaSubjectKey(event);
        let storyIndex = -1;
        for (let index = stories.length - 1; index >= 0; index -= 1) {
            if (stories[index].subjectKey === subjectKey && !TERMINAL_STAGES.has(stories[index].stage)) {
                storyIndex = index;
                break;
            }
        }
        const nextStory = storyIndex >= 0
            ? advanceStory(stories[storyIndex], event)
            : createStory(event);
        if (storyIndex >= 0) stories[storyIndex] = nextStory;
        else stories.push(nextStory);
        knownEvents.add(event.id);
        eventStoryIds[event.id] = nextStory.id;
        if (!changedStoryIds.includes(nextStory.id)) changedStoryIds.push(nextStory.id);
    });

    const state = normalizeIndustryMediaWorld({
        ...normalized,
        lastProcessedAbsoluteWeek: Math.max(normalized.lastProcessedAbsoluteWeek, Math.round(absoluteWeek)),
        stories,
    });
    orderedEvents.forEach(event => {
        const storyId = state.eventStoryIndex[event.id];
        if (storyId) eventStoryIds[event.id] = storyId;
    });
    return {
        state,
        changedStoryIds: changedStoryIds.filter(id => state.stories.some(story => story.id === id)),
        eventStoryIds,
    };
};
