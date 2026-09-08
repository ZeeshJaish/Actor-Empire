import type {
    IndustryEventFact,
    IndustryMediaChannel,
    IndustryMediaClaimMode,
    IndustryMediaInstitution,
    IndustryMediaPersonality,
    IndustryMediaStory,
    IndustryMediaStoryAssignment,
    IndustryMediaWorldState,
    Player,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const PLAYER_REFERENCE_IDS = new Set(['PLAYER', 'PLAYER_STUDIO', 'PLAYER_PLATFORM']);
const POSITIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_RECOVERED',
    'COMPANY_FUNDED', 'PROJECT_GREENLIT', 'PROJECT_RELEASED', 'PROJECT_HIT',
    'AWARD_NOMINATED', 'AWARD_WON', 'RIGHTS_DEAL',
]);
const NEGATIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_DISTRESS', 'COMPANY_RESTRUCTURED', 'COMPANY_CLOSED', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_FLOP', 'PROJECT_CANCELLED',
]);
const REGIONS: Array<{ id: string; pattern: RegExp }> = [
    { id: 'INDIA', pattern: /\bindia|indian|bollywood\b/i },
    { id: 'EAST_ASIA', pattern: /\bkorea|korean|japan|japanese|east asia\b/i },
    { id: 'LATIN_AMERICA', pattern: /\blatin america|mexico|brazil|argentina|colombia\b/i },
    { id: 'AFRICA', pattern: /\bafrica|nigeria|south africa|kenya|ghana\b/i },
    { id: 'EUROPE', pattern: /\beurope|uk|britain|france|germany|italy|spain\b/i },
    { id: 'NORTH_AMERICA', pattern: /\bnorth america|united states|usa|canada|hollywood\b/i },
];

export interface AssignIndustryMediaCoverageInput {
    state: unknown;
    story: IndustryMediaStory;
    event: IndustryEventFact;
    channel: IndustryMediaChannel;
    player: Player;
    absoluteWeek: number;
}

export interface IndustryMediaCoverageResult {
    institution: IndustryMediaInstitution;
    personality?: IndustryMediaPersonality;
    assignment: IndustryMediaStoryAssignment;
    state: IndustryMediaWorldState;
}

const playerSubjectIds = (player: Player): Set<string> => {
    const ids = new Set<string>([...PLAYER_REFERENCE_IDS, player.id]);
    (player.businesses || []).forEach(business => ids.add(business.id));
    const platformSlug = player.ownedStreamingPlatform?.identity?.slug;
    if (platformSlug) ids.add(platformSlug);
    Object.values(player.world?.studios || {}).forEach(studio => {
        if (studio.ai?.controller === 'PLAYER') ids.add(studio.id);
    });
    return ids;
};

export const getIndustryMediaCoverageSubjectKey = (
    story: IndustryMediaStory,
    _player: Player,
): string => story.subjectKey || (
    story.projectId ? `project:${story.projectId}`
        : story.companyId ? `company:${story.companyId}`
            : `story:${story.id}`
);

const isPlayerStory = (
    story: IndustryMediaStory,
    event: IndustryEventFact,
    player: Player,
): boolean => {
    const ids = playerSubjectIds(player);
    if ([event.companyId, event.platformId, story.companyId, story.platformId].some(id => id && ids.has(id))) return true;
    const text = `${event.companyName || ''} ${event.headline} ${event.detail}`.toLowerCase();
    const playerName = player.name.trim().toLowerCase();
    return Boolean(playerName && playerName.length >= 3 && text.includes(playerName));
};

const regionsFor = (story: IndustryMediaStory, event: IndustryEventFact): string[] => {
    const text = `${story.headline} ${story.detail} ${event.headline} ${event.detail}`;
    const matched = REGIONS.filter(item => item.pattern.test(text)).map(item => item.id);
    return matched.length ? matched : ['GLOBAL'];
};

const kindFit = (institution: IndustryMediaInstitution, story: IndustryMediaStory): number => {
    if (story.category === 'RIGHTS' && ['STREAMING', 'BUSINESS', 'TRADE'].includes(institution.kind)) return 32;
    if (story.category === 'COMPANY' && ['BUSINESS', 'TRADE', 'STREAMING'].includes(institution.kind)) return 30;
    if (['PROJECT_RELEASE', 'PROJECT_OUTCOME', 'AWARDS'].includes(story.category)
        && ['PRESTIGE', 'TRADE', 'REGIONAL'].includes(institution.kind)) return 28;
    if (story.category === 'FRANCHISE' && institution.kind === 'FANDOM') return 38;
    if (story.category === 'PROJECT_PRODUCTION' && ['TRADE', 'TABLOID'].includes(institution.kind)) return 24;
    return 0;
};

const roleFit = (personality: IndustryMediaPersonality, story: IndustryMediaStory): number => {
    if (story.category === 'RIGHTS' && personality.role === 'BUSINESS_ANALYST') return 38;
    if (story.category === 'COMPANY' && ['BUSINESS_ANALYST', 'INVESTIGATOR'].includes(personality.role)) return 36;
    if (['PROJECT_RELEASE', 'PROJECT_OUTCOME', 'AWARDS'].includes(story.category) && personality.role === 'CRITIC') return 38;
    if (story.category === 'FRANCHISE' && personality.role === 'THEORY_CREATOR') return 44;
    if (['PROJECT_DEVELOPMENT', 'PROJECT_PRODUCTION'].includes(story.category)
        && ['REPORTER', 'INVESTIGATOR'].includes(personality.role)) return 30;
    if (['COLUMNIST', 'COMMENTATOR'].includes(personality.role)) return 12;
    return 5;
};

const affinityFor = (
    state: IndustryMediaWorldState,
    personality: IndustryMediaPersonality,
    subjectKey: string,
    playerRelated: boolean,
): number => state.subjectStances.find(item => (
    item.personalityId === personality.id && item.subjectKey === subjectKey
))?.affinity ?? (playerRelated ? personality.baselinePlayerAffinity : 0);

const fatiguePenalty = (
    personality: IndustryMediaPersonality,
    story: IndustryMediaStory,
    absoluteWeek: number,
): number => {
    const weeksSince = personality.lastAppearanceAbsoluteWeek < 0
        ? Number.MAX_SAFE_INTEGER
        : absoluteWeek - personality.lastAppearanceAbsoluteWeek;
    const recentPenalty = weeksSince <= 0 ? 125 : weeksSince === 1 ? 90 : weeksSince <= 3 ? 52 : weeksSince <= 5 ? 22 : 0;
    return recentPenalty + (personality.recentStoryIds.includes(story.id) ? 18 : 0);
};

const signatureTargetFor = (storyId: string): 'ANTAGONIST' | 'SUPPORTER' => (
    createDeterministicRng(`media-signature:${storyId}`)() < 0.5 ? 'ANTAGONIST' : 'SUPPORTER'
);

const angleFor = (personality?: IndustryMediaPersonality): IndustryMediaClaimMode => {
    if (!personality) return 'FACT';
    if (personality.role === 'THEORY_CREATOR') return 'SPECULATION';
    if (['COMMENTATOR', 'COLUMNIST', 'CRITIC'].includes(personality.role)) return 'OPINION';
    if (personality.role === 'BUSINESS_ANALYST') return 'ANALYSIS';
    return 'FACT';
};

interface Candidate {
    institution: IndustryMediaInstitution;
    personality?: IndustryMediaPersonality;
    score: number;
}

const candidatesFor = (
    state: IndustryMediaWorldState,
    story: IndustryMediaStory,
    event: IndustryEventFact,
    channel: IndustryMediaChannel,
    player: Player,
    absoluteWeek: number,
): Candidate[] => {
    const regions = regionsFor(story, event);
    const playerRelated = isPlayerStory(story, event, player);
    const signatureTarget = signatureTargetFor(story.id);
    const subjectKey = getIndustryMediaCoverageSubjectKey(story, player);
    const institutionCandidates = state.institutions.filter(item => (
        item.isActive && item.channels.includes(channel) && item.focusCategories.includes(story.category)
    ));
    const candidates: Candidate[] = [];
    institutionCandidates.forEach(institution => {
        const exactHome = regions.includes(institution.homeRegionId);
        const coversRegion = institution.coveredRegionIds.some(region => regions.includes(region));
        const globalCoverage = institution.coveredRegionIds.includes('GLOBAL');
        const regionalScore = exactHome ? 180 : coversRegion ? 75 : globalCoverage ? 12 : -45;
        const institutionScore = regionalScore
            + kindFit(institution, story)
            + institution.credibility * 0.18
            + institution.access * 0.12
            + institution.reach * 0.08
            - institution.sensationalism * 0.025;
        const personalities = state.personalities.filter(personality => (
            personality.isActive
            && personality.institutionId === institution.id
            && personality.channels.includes(channel)
            && personality.focusCategories.includes(story.category)
        ));
        if (!personalities.length) candidates.push({ institution, score: institutionScore - 12 });
        personalities.forEach(personality => {
            const signatureScore = playerRelated
                ? personality.signatureRole === signatureTarget ? 300
                    : personality.signatureRole ? 72 : 0
                : personality.signatureRole ? -85 : 0;
            const affinity = affinityFor(state, personality, subjectKey, playerRelated);
            const stanceExpression = ['COMMENTATOR', 'COLUMNIST', 'CRITIC'].includes(personality.role)
                ? Math.abs(affinity) * 0.16
                : 0;
            const jitter = createDeterministicRng(
                `media-coverage:${story.id}:${event.id}:${absoluteWeek}:${channel}:${institution.id}:${personality.id}`,
            )() * 18;
            candidates.push({
                institution,
                personality,
                score: institutionScore
                    + roleFit(personality, story)
                    + personality.credibility * 0.12
                    + personality.reach * 0.08
                    + stanceExpression
                    + signatureScore
                    - fatiguePenalty(personality, story, absoluteWeek)
                    + jitter,
            });
        });
    });
    return candidates.sort((left, right) => (
        right.score - left.score
        || left.institution.id.localeCompare(right.institution.id)
        || (left.personality?.id || '').localeCompare(right.personality?.id || '')
    ));
};

const updatePersonalityMemory = (
    state: IndustryMediaWorldState,
    personalityId: string | undefined,
    storyId: string,
    absoluteWeek: number,
): IndustryMediaWorldState => {
    if (!personalityId) return state;
    return {
        ...state,
        personalities: state.personalities.map(item => item.id !== personalityId ? item : {
            ...item,
            lastAppearanceAbsoluteWeek: absoluteWeek,
            recentStoryIds: [...new Set([...item.recentStoryIds, storyId])].slice(-12),
        }),
    };
};

export const advanceIndustryMediaStance = (
    inputState: unknown,
    assignment: IndustryMediaStoryAssignment,
    event: IndustryEventFact,
    subjectKey: string,
    playerRelated: boolean,
): IndustryMediaWorldState => {
    const state = normalizeIndustryMediaWorld(inputState);
    if (!assignment.personalityId) return state;
    const personality = state.personalities.find(item => item.id === assignment.personalityId);
    if (!personality) return state;
    const current = state.subjectStances.find(item => (
        item.personalityId === personality.id && item.subjectKey === subjectKey
    ));
    const starting = current?.affinity ?? (playerRelated ? personality.baselinePlayerAffinity : 0);
    const movement = current?.lastIndustryEventId === event.id
        ? 0
        : POSITIVE_EVENTS.has(event.type) ? 2 : NEGATIVE_EVENTS.has(event.type) ? -2 : 0;
    const affinity = Math.max(personality.stanceFloor, Math.min(personality.stanceCeiling, starting + movement));
    const stance = {
        id: `${personality.id}:${subjectKey}`,
        personalityId: personality.id,
        subjectKey,
        affinity,
        lastUpdatedAbsoluteWeek: event.absoluteWeek,
        lastIndustryEventId: event.id,
    };
    return normalizeIndustryMediaWorld({
        ...state,
        subjectStances: [
            ...state.subjectStances.filter(item => item.id !== stance.id),
            stance,
        ],
    });
};

export const assignIndustryMediaCoverage = (
    input: AssignIndustryMediaCoverageInput,
): IndustryMediaCoverageResult => {
    const normalizedInputState = normalizeIndustryMediaWorld(input.state);
    let state = normalizedInputState.stories.some(item => item.id === input.story.id)
        ? normalizedInputState
        : normalizeIndustryMediaWorld({
            ...normalizedInputState,
            stories: [...normalizedInputState.stories, input.story],
        });
    const institutionById = new Map(state.institutions.map(item => [item.id, item]));
    const personalityById = new Map(state.personalities.map(item => [item.id, item]));
    const reusable = state.storyAssignments
        .filter(item => item.storyId === input.story.id && item.channel === input.channel)
        .sort((left, right) => right.lastUsedAbsoluteWeek - left.lastUsedAbsoluteWeek || left.id.localeCompare(right.id))
        .find(item => {
            const institution = institutionById.get(item.institutionId);
            const personality = item.personalityId ? personalityById.get(item.personalityId) : undefined;
            return institution?.isActive
                && institution.channels.includes(input.channel)
                && (!item.personalityId || (personality?.isActive && personality.channels.includes(input.channel)));
        });
    const selected = reusable ? {
        institution: institutionById.get(reusable.institutionId)!,
        personality: reusable.personalityId ? personalityById.get(reusable.personalityId) : undefined,
    } : candidatesFor(
        state,
        input.story,
        input.event,
        input.channel,
        input.player,
        input.absoluteWeek,
    )[0];
    const fallbackInstitution = state.institutions.find(item => item.id === 'screenline_trade') || state.institutions[0];
    const institution = selected?.institution || fallbackInstitution;
    const personality = selected?.personality;
    const assignmentId = reusable?.id || createDeterministicId(
        'media_assignment', input.story.id, input.channel, institution.id, personality?.id || 'desk',
    );
    const assignment: IndustryMediaStoryAssignment = {
        id: assignmentId,
        storyId: input.story.id,
        industryEventId: input.event.id,
        channel: input.channel,
        institutionId: institution.id,
        ...(personality ? { personalityId: personality.id } : {}),
        angle: reusable?.angle || angleFor(personality),
        assignedAbsoluteWeek: reusable?.assignedAbsoluteWeek ?? input.absoluteWeek,
        lastUsedAbsoluteWeek: input.absoluteWeek,
    };
    state = normalizeIndustryMediaWorld({
        ...state,
        storyAssignments: [
            ...state.storyAssignments.filter(item => item.id !== assignment.id),
            assignment,
        ],
    });
    state = updatePersonalityMemory(state, personality?.id, input.story.id, input.absoluteWeek);
    const subjectKey = getIndustryMediaCoverageSubjectKey(input.story, input.player);
    state = advanceIndustryMediaStance(
        state,
        assignment,
        input.event,
        subjectKey,
        isPlayerStory(input.story, input.event, input.player),
    );
    return {
        institution: state.institutions.find(item => item.id === institution.id) || institution,
        personality: personality
            ? state.personalities.find(item => item.id === personality.id) || personality
            : undefined,
        assignment,
        state,
    };
};
