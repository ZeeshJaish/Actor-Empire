import type {
    IndustryEventFact,
    IndustryMediaNarrative,
    IndustryMediaNarrativeLandmark,
    IndustryMediaNarrativePolarity,
    IndustryMediaNarrativeStage,
    IndustryMediaNarrativeTheme,
    IndustryMediaWorldState,
    NewsItem,
    Player,
    XPost,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { createIndustryMediaAvatar } from './industryMediaIdentities';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const clamp = (value: number, minimum: number, maximum: number): number => (
    Math.max(minimum, Math.min(maximum, Math.round(value)))
);

const THEME_BY_EVENT: Partial<Record<IndustryEventFact['type'], IndustryMediaNarrativeTheme>> = {
    PROJECT_GREENLIT: 'AMBITIOUS_RISK_TAKER',
    PROJECT_OVERRUN: 'RECKLESS_SPENDER',
    AWARD_NOMINATED: 'AWARDS_POWERHOUSE',
    AWARD_WON: 'AWARDS_POWERHOUSE',
    FRANCHISE_DECISION: 'FRANCHISE_ARCHITECT',
    PROJECT_HIT: 'RELIABLE_HITMAKER',
    PROJECT_SLEEPER: 'UNDERDOG',
    PROJECT_FLOP: 'DECLINE',
    PROJECT_CANCELLED: 'DECLINE',
    COMPANY_EXPANDED: 'GLOBAL_EXPANSION',
    COMPANY_DISTRESS: 'FADING_DOMINANCE',
    COMPANY_CLOSED: 'DECLINE',
};

const POLARITY_BY_THEME: Record<IndustryMediaNarrativeTheme, IndustryMediaNarrativePolarity> = {
    AMBITIOUS_RISK_TAKER: 'MIXED',
    RECKLESS_SPENDER: 'NEGATIVE',
    AWARDS_POWERHOUSE: 'POSITIVE',
    FRANCHISE_ARCHITECT: 'POSITIVE',
    OVERHYPED_STAR: 'NEGATIVE',
    RELIABLE_HITMAKER: 'POSITIVE',
    COMEBACK: 'POSITIVE',
    DECLINE: 'NEGATIVE',
    GLOBAL_EXPANSION: 'POSITIVE',
    FADING_DOMINANCE: 'NEGATIVE',
    DIFFICULT_COLLABORATOR: 'NEGATIVE',
    UNDERDOG: 'POSITIVE',
};

const POSITIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_RECOVERED', 'COMPANY_FUNDED',
    'PROJECT_HIT', 'PROJECT_SLEEPER', 'AWARD_NOMINATED', 'AWARD_WON', 'PARTNERSHIP_REPEATED',
]);
const NEGATIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_DISTRESS', 'COMPANY_RESTRUCTURED', 'COMPANY_CLOSED', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_SOLD', 'PROJECT_CANCELLED', 'PROJECT_FLOP',
]);

const subjectNameFor = (event: IndustryEventFact, fallback: string): string => (
    event.companyName?.trim() || fallback || 'The subject'
);

const eventImpact = (event: IndustryEventFact): number => (
    event.importance === 'HIGH' ? 18 : event.importance === 'MEDIUM' ? 11 : 6
);

const supportsTheme = (theme: IndustryMediaNarrativeTheme, event: IndustryEventFact): boolean => {
    if (theme === 'AMBITIOUS_RISK_TAKER') {
        return ['PROJECT_GREENLIT', 'PROJECT_OVERRUN', 'PROJECT_DELAYED', 'PROJECT_FLOP'].includes(event.type);
    }
    if (['AWARDS_POWERHOUSE', 'RELIABLE_HITMAKER', 'COMEBACK', 'GLOBAL_EXPANSION', 'UNDERDOG', 'FRANCHISE_ARCHITECT']
        .includes(theme)) return POSITIVE_EVENTS.has(event.type) || event.type === 'FRANCHISE_DECISION';
    return NEGATIVE_EVENTS.has(event.type);
};

const stageFor = (
    strength: number,
    support: number,
    contradiction: number,
    previous: IndustryMediaNarrativeStage,
): IndustryMediaNarrativeStage => {
    if (previous === 'RESOLVED') return previous;
    if (contradiction >= support + 3 && strength < 24) return 'RESOLVED';
    if (contradiction >= support && strength < 42) return 'FADING';
    if (strength >= 78 && support >= 4) return 'DEFINING';
    if (strength >= 45 && support >= 2) return 'ESTABLISHED';
    return 'EMERGING';
};

const landmarkFor = (
    event: IndustryEventFact,
    narrative: Pick<IndustryMediaNarrative, 'id' | 'theme' | 'supportingEvidence' | 'contradictingEvidence'>,
    supporting: boolean,
    media: IndustryMediaWorldState,
): IndustryMediaNarrativeLandmark => {
    const claim = media.claims.find(item => item.resolution?.eventIds.includes(event.id));
    const response = media.playerResponses.find(item => item.industryEventId === event.id && item.status === 'RESOLVED');
    const isOrigin = narrative.supportingEvidence + narrative.contradictingEvidence === 0;
    return {
        id: createDeterministicId('industry_media_narrative_landmark', narrative.id, event.id),
        kind: claim ? 'CLAIM_RESOLUTION' : response ? 'PLAYER_CONFRONTATION' : isOrigin ? 'ORIGIN' : supporting ? 'SUPPORT' : 'CONTRADICTION',
        industryEventIds: [event.id],
        absoluteWeek: event.absoluteWeek,
        summary: event.detail,
        impact: supporting ? eventImpact(event) : -eventImpact(event),
        ...(claim ? { mediaClaimId: claim.id } : {}),
        ...(response ? { mediaResponseId: response.id } : {}),
    };
};

const createNarrative = (
    player: Player,
    media: IndustryMediaWorldState,
    event: IndustryEventFact,
    theme: IndustryMediaNarrativeTheme,
): IndustryMediaNarrative | undefined => {
    const story = media.stories.find(item => item.industryEventIds.includes(event.id));
    if (!story) return undefined;
    const subjectName = subjectNameFor(event, story.companyName || player.name);
    const narrativeKey = `${story.subjectKey}:${theme}`;
    const id = createDeterministicId('industry_media_narrative', narrativeKey);
    const seed: IndustryMediaNarrative = {
        schemaVersion: 1,
        id,
        narrativeKey,
        subjectKey: story.subjectKey,
        subjectName,
        theme,
        polarity: POLARITY_BY_THEME[theme],
        stage: 'EMERGING',
        strength: eventImpact(event) + 12,
        confidence: event.importance === 'HIGH' ? 48 : 36,
        supportingEvidence: 0,
        contradictingEvidence: 0,
        primaryStoryId: story.id,
        primaryIndustryEventId: event.id,
        firstAbsoluteWeek: event.absoluteWeek,
        lastAdvancedAbsoluteWeek: event.absoluteWeek,
        nextEligiblePublicationAbsoluteWeek: event.absoluteWeek + 8,
        landmarks: [],
        playerRelated: event.companyId === player.id || event.companyName === player.name,
    };
    const landmark = landmarkFor(event, seed, true, media);
    return { ...seed, supportingEvidence: 1, landmarks: [landmark] };
};

const advanceNarrative = (
    narrative: IndustryMediaNarrative,
    event: IndustryEventFact,
    media: IndustryMediaWorldState,
): IndustryMediaNarrative => {
    const supporting = supportsTheme(narrative.theme, event);
    const impact = eventImpact(event);
    const supportingEvidence = narrative.supportingEvidence + (supporting ? 1 : 0);
    const contradictingEvidence = narrative.contradictingEvidence + (supporting ? 0 : 1);
    const strength = clamp(narrative.strength + (supporting ? Math.ceil(impact * 0.65) : -impact), 0, 100);
    const confidence = clamp(narrative.confidence + (supporting ? 7 : -9), 0, 100);
    const landmark = landmarkFor(event, narrative, supporting, media);
    const landmarks = [...narrative.landmarks.filter(item => item.id !== landmark.id), landmark].slice(-8);
    const stage = stageFor(strength, supportingEvidence, contradictingEvidence, narrative.stage);
    return {
        ...narrative,
        strength,
        confidence,
        supportingEvidence,
        contradictingEvidence,
        stage,
        lastAdvancedAbsoluteWeek: event.absoluteWeek,
        ...(stage === 'RESOLVED' ? { resolvedAbsoluteWeek: event.absoluteWeek } : {}),
        landmarks,
    };
};

export interface IndustryMediaNarrativeResult {
    player: Player;
    createdNarratives: IndustryMediaNarrative[];
    advancedNarratives: IndustryMediaNarrative[];
    retrospectiveNews: NewsItem[];
    retrospectiveXPosts: XPost[];
}

const makeRetrospective = (
    player: Player,
    media: IndustryMediaWorldState,
    narrative: IndustryMediaNarrative,
    event: IndustryEventFact,
): { news: NewsItem; post: XPost } | undefined => {
    const story = media.stories.find(item => item.industryEventIds.includes(event.id))
        || media.stories.find(item => item.id === narrative.primaryStoryId);
    const assignment = story
        ? media.storyAssignments.find(item => item.storyId === story.id)
        : undefined;
    const personality = assignment
        ? media.personalities.find(item => item.id === assignment.personalityId)
        : media.personalities[0];
    const institution = media.institutions.find(item => item.id === (assignment?.institutionId || personality?.institutionId))
        || media.institutions[0];
    if (!story || !institution) return undefined;
    const latest = narrative.landmarks[narrative.landmarks.length - 1];
    const origin = narrative.landmarks[0];
    const label = THEME_LABELS[narrative.theme];
    const headline = `${narrative.subjectName}'s ${label} narrative enters a new chapter`;
    const history = origin && latest && origin.id !== latest.id
        ? `The latest result follows an earlier chapter: ${origin.summary}`
        : 'The latest result adds another verified chapter to the subject’s industry history.';
    const subtext = `${latest?.summary || event.detail} ${history}`;
    const authorName = personality?.name || institution.name;
    const authorHandle = personality?.handle || institution.handles.X || `@${institution.id}`;
    const rng = createDeterministicRng(`c7:narrative-retrospective:${narrative.id}:${event.absoluteWeek}`);
    const scale = narrative.stage === 'DEFINING' ? 4 : narrative.stage === 'ESTABLISHED' ? 2 : 1;
    const common = {
        industryEventId: event.id,
        mediaStoryId: story.id,
        mediaInstitutionId: institution.id,
        ...(personality ? { mediaPersonalityId: personality.id } : {}),
        ...(event.companyId ? { companyId: event.companyId } : {}),
        ...(event.projectId ? { projectId: event.projectId } : {}),
    };
    return {
        news: {
            id: `news_narrative_${narrative.id}_${event.absoluteWeek}`,
            headline,
            subtext,
            category: narrative.stage === 'DEFINING' ? 'TOP_STORY' : 'INDUSTRY',
            week: player.currentWeek,
            year: player.age,
            impactLevel: narrative.stage === 'DEFINING' ? 'HIGH' : 'MEDIUM',
            sourceName: institution.name,
            ...(personality ? { byline: personality.name } : {}),
            ...common,
        },
        post: {
            id: `x_narrative_${narrative.id}_${event.absoluteWeek}`,
            authorId: personality?.id || institution.id,
            authorName,
            authorHandle,
            authorAvatar: createIndustryMediaAvatar(authorName, institution.primaryColor),
            content: `${headline}\n\n${subtext}`,
            timestamp: event.absoluteWeek,
            publishedAbsoluteWeek: event.absoluteWeek,
            likes: Math.round((180 + rng() * 520) * scale),
            retweets: Math.round((20 + rng() * 120) * scale),
            replies: Math.round((12 + rng() * 75) * scale),
            isPlayer: false,
            isLiked: false,
            isRetweeted: false,
            isVerified: personality?.verified ?? true,
            postType: 'FILM_OPINION',
            sentiment: narrative.polarity === 'NEGATIVE' ? 'MESSY' : 'INDUSTRY',
            ...common,
        },
    };
};

export const advanceIndustryMediaNarratives = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaNarrativeResult => {
    const media = normalizeIndustryMediaWorld(player.world.industryMedia);
    const ledger = normalizeIndustryEventLedger(player.world.industryEvents);
    const processed = new Set(media.processedC7Keys);
    const narratives = [...media.narratives];
    const createdNarratives: IndustryMediaNarrative[] = [];
    const advancedNarratives: IndustryMediaNarrative[] = [];
    const retrospectiveNews: NewsItem[] = [];
    const retrospectiveXPosts: XPost[] = [];
    let createdThisWeek = false;
    let retrospectivePublishedThisWeek = false;
    const latestGlobalRetrospectiveWeek = narratives.reduce(
        (latest, item) => Math.max(latest, item.lastPublishedAbsoluteWeek ?? -1_000_000),
        -1_000_000,
    );

    ledger.events
        .filter(event => event.absoluteWeek <= absoluteWeek && THEME_BY_EVENT[event.type])
        .sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.id.localeCompare(right.id))
        .forEach(event => {
            const processKey = `narrative:event:${event.id}`;
            if (processed.has(processKey)) return;
            const story = media.stories.find(item => item.industryEventIds.includes(event.id));
            if (!story) return;
            const existingIndex = narratives.findIndex(item => item.subjectKey === story.subjectKey && item.stage !== 'RESOLVED');
            if (existingIndex >= 0) {
                const previous = narratives[existingIndex];
                let next = advanceNarrative(previous, event, media);
                const retrospectiveKey = `narrative:retrospective:${next.id}:${event.absoluteWeek}`;
                if (!retrospectivePublishedThisWeek
                    && event.absoluteWeek >= latestGlobalRetrospectiveWeek + 8
                    && event.absoluteWeek >= previous.nextEligiblePublicationAbsoluteWeek
                    && !processed.has(retrospectiveKey)) {
                    const retrospective = makeRetrospective(player, media, next, event);
                    if (retrospective) {
                        retrospectiveNews.push(retrospective.news);
                        retrospectiveXPosts.push(retrospective.post);
                        processed.add(retrospectiveKey);
                        retrospectivePublishedThisWeek = true;
                        next = {
                            ...next,
                            lastPublishedAbsoluteWeek: event.absoluteWeek,
                            nextEligiblePublicationAbsoluteWeek: event.absoluteWeek + 8,
                        };
                    }
                }
                narratives[existingIndex] = next;
                advancedNarratives.push(next);
                processed.add(processKey);
                return;
            }
            if (createdThisWeek) return;
            const next = createNarrative(player, media, event, THEME_BY_EVENT[event.type]!);
            if (!next) return;
            narratives.push(next);
            createdNarratives.push(next);
            createdThisWeek = true;
            processed.add(processKey);
        });

    if (!createdNarratives.length && !advancedNarratives.length) {
        return { player, createdNarratives, advancedNarratives, retrospectiveNews, retrospectiveXPosts };
    }
    const nextMedia = normalizeIndustryMediaWorld({
        ...media,
        narratives,
        processedC7Keys: [...processed],
    });
    const nextPlayer = {
        ...player,
        news: [...retrospectiveNews, ...(player.news || [])]
            .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
            .slice(0, 50),
        x: {
            ...player.x,
            feed: [...retrospectiveXPosts, ...(player.x?.feed || [])]
                .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
                .slice(0, 80),
        },
        world: { ...player.world, industryMedia: nextMedia },
    };
    return {
        player: nextPlayer,
        createdNarratives,
        advancedNarratives,
        retrospectiveNews,
        retrospectiveXPosts,
    };
};

const THEME_LABELS: Record<IndustryMediaNarrativeTheme, string> = {
    AMBITIOUS_RISK_TAKER: 'ambitious risk-taker',
    RECKLESS_SPENDER: 'reckless spender',
    AWARDS_POWERHOUSE: 'awards powerhouse',
    FRANCHISE_ARCHITECT: 'franchise architect',
    OVERHYPED_STAR: 'overhyped star',
    RELIABLE_HITMAKER: 'reliable hitmaker',
    COMEBACK: 'comeback story',
    DECLINE: 'decline narrative',
    GLOBAL_EXPANSION: 'global expansion story',
    FADING_DOMINANCE: 'fading dominance narrative',
    DIFFICULT_COLLABORATOR: 'difficult collaborator',
    UNDERDOG: 'underdog story',
};

export interface IndustryNarrativeContext {
    narrativeId: string;
    theme: IndustryMediaNarrativeTheme;
    stage: IndustryMediaNarrativeStage;
    headline: string;
    summary: string;
    evidenceEventIds: string[];
    strength: number;
}

export const getIndustryNarrativeContext = (
    mediaInput: unknown,
    subjectKey: string,
): IndustryNarrativeContext | undefined => {
    const media = normalizeIndustryMediaWorld(mediaInput);
    const narrative = [...media.narratives]
        .filter(item => item.subjectKey === subjectKey)
        .sort((left, right) => right.lastAdvancedAbsoluteWeek - left.lastAdvancedAbsoluteWeek || right.strength - left.strength)[0];
    if (!narrative) return undefined;
    const latest = narrative.landmarks[narrative.landmarks.length - 1];
    return {
        narrativeId: narrative.id,
        theme: narrative.theme,
        stage: narrative.stage,
        headline: `${narrative.subjectName}'s ${THEME_LABELS[narrative.theme]} narrative`,
        summary: latest?.summary || `Recent industry events are shaping how ${narrative.subjectName} is discussed.`,
        evidenceEventIds: [...new Set(narrative.landmarks.flatMap(item => item.industryEventIds))],
        strength: narrative.strength,
    };
};
