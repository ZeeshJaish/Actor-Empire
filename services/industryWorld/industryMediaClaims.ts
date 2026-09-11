import type {
    IndustryEventFact,
    IndustryEventType,
    IndustryMediaClaim,
    IndustryMediaClaimCategory,
    IndustryMediaClaimKind,
    IndustryMediaClaimTarget,
    IndustryMediaInstitution,
    IndustryMediaLeakIntentSnapshot,
    IndustryMediaPersonality,
    IndustryMediaStory,
    Player,
} from '../../types';
import { createDeterministicId, createDeterministicRng } from '../deterministicRandom';
import { normalizeIndustryEventLedger } from './industryEventLedger';
import { normalizeIndustryMediaWorld } from './industryMediaLedger';

const CLAIM_RELEVANCE_WEEKS = 12;

export interface IndustryMediaClaimCopyInput {
    kind: IndustryMediaClaimKind;
    category: IndustryMediaClaimCategory;
    subjectName: string;
    sourceName: string;
    targetName: string;
    evidenceSummary: string;
}

export interface IndustryMediaClaimCopy {
    headline: string;
    summary: string;
    knownEvidence: string;
    interpretation: string;
}

export interface IndustryMediaClaimCandidate {
    event: IndustryEventFact;
    story: IndustryMediaStory;
    kind: IndustryMediaClaimKind;
    category: IndustryMediaClaimCategory;
    subjectName: string;
    targetName: string;
    target: IndustryMediaClaimTarget;
    evidenceEventIds: string[];
    score: number;
    leakIntentSnapshot?: IndustryMediaLeakIntentSnapshot;
}

const displayName = (value: string): string => value
    .replace(/[_:-]+/g, ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
    .trim();

const eventEvidence = (event: IndustryEventFact, kind: IndustryEventFact['evidence'][number]['kind'], metric?: string) => (
    event.evidence.find(item => item.kind === kind && (!metric || item.metric === metric))
);

const deterministicOutcome = (event: IndustryEventFact): IndustryEventType => {
    const rng = createDeterministicRng(`c6:outcome:${event.id}`);
    const roll = rng();
    return roll < 0.42 ? 'PROJECT_HIT' : roll < 0.72 ? 'PROJECT_SLEEPER' : 'PROJECT_FLOP';
};

const companyMove = (event: IndustryEventFact): IndustryEventType => {
    const rng = createDeterministicRng(`c6:company-move:${event.id}`);
    const options: IndustryEventType[] = [
        'COMPANY_FUNDED', 'COMPANY_RESTRUCTURED', 'COMPANY_RECOVERED', 'COMPANY_ACQUIRED', 'COMPANY_CLOSED',
    ];
    return options[Math.floor(rng() * options.length)] || 'COMPANY_RESTRUCTURED';
};

const subjectNameFor = (event: IndustryEventFact): string => (
    event.projectId ? displayName(event.projectId) : event.companyName || displayName(event.companyId || event.platformId || 'industry subject')
);

const candidate = (
    event: IndustryEventFact,
    story: IndustryMediaStory,
    category: IndustryMediaClaimCategory,
    kind: IndustryMediaClaimKind,
    target: IndustryMediaClaimTarget,
    targetName: string,
    absoluteWeek: number,
): IndustryMediaClaimCandidate => {
    const importance = event.importance === 'HIGH' ? 60 : event.importance === 'MEDIUM' ? 40 : 18;
    const recency = Math.max(0, 18 - (absoluteWeek - event.absoluteWeek) * 3);
    const rng = createDeterministicRng(`c6:candidate:${event.id}:${category}`);
    return {
        event,
        story,
        category,
        kind,
        subjectName: subjectNameFor(event),
        targetName,
        target,
        evidenceEventIds: [event.id],
        score: importance + recency + Math.round(rng() * 20),
    };
};

const candidatesForEvent = (
    event: IndustryEventFact,
    story: IndustryMediaStory,
    absoluteWeek: number,
): IndustryMediaClaimCandidate[] => {
    const items: IndustryMediaClaimCandidate[] = [];
    const projectId = event.projectId;
    const companyId = event.companyId || event.platformId;
    const releaseWeekEvidence = eventEvidence(event, 'PROJECT', 'expectedReleaseWeek');
    const releaseWeek = typeof releaseWeekEvidence?.value === 'number' ? Math.round(releaseWeekEvidence.value) : undefined;
    const talent = eventEvidence(event, 'TALENT', 'candidate');
    const destination = eventEvidence(event, 'PLATFORM', 'candidateDestination');
    const universe = eventEvidence(event, 'UNIVERSE', 'continuationCandidate');

    if (event.type === 'PROJECT_GREENLIT' && projectId && talent) {
        items.push(candidate(event, story, 'CASTING', 'RUMOUR', {
            expectedEventTypes: ['PROJECT_CAST'], projectId, talentId: talent.id,
        }, displayName(talent.id), absoluteWeek));
    }
    if (['PROJECT_GREENLIT', 'PROJECT_RELEASE_PLANNED'].includes(event.type) && projectId && releaseWeek !== undefined) {
        items.push(candidate(event, story, 'RELEASE_WINDOW', 'PREDICTION', {
            expectedEventTypes: ['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'], projectId,
            expectedAbsoluteWeek: releaseWeek, toleranceWeeks: 4,
        }, `week ${releaseWeek}`, absoluteWeek));
    }
    if (event.type === 'PROJECT_RELEASE_PLANNED' && projectId && destination) {
        items.push(candidate(event, story, 'PLATFORM_DESTINATION', 'PREDICTION', {
            expectedEventTypes: ['RIGHTS_DEAL', 'RIGHTS_TRANSFER'], projectId, platformId: destination.id,
        }, displayName(destination.id), absoluteWeek));
    }
    if (event.type === 'RIGHTS_SALE_ANNOUNCED' && projectId) {
        items.push(candidate(event, story, 'PLATFORM_DESTINATION', 'RUMOUR', {
            expectedEventTypes: ['RIGHTS_DEAL', 'RIGHTS_TRANSFER'], projectId,
        }, 'a major streaming buyer', absoluteWeek));
    }
    if (['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'].includes(event.type) && projectId) {
        const expected = deterministicOutcome(event);
        items.push(candidate(event, story, 'PROJECT_OUTCOME', 'PREDICTION', {
            expectedEventTypes: [expected], projectId, expectedOutcome: expected.replace('PROJECT_', ''),
        }, expected.replace('PROJECT_', '').toLowerCase(), absoluteWeek));
    }
    if (['PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD'].includes(event.type) && projectId) {
        items.push(candidate(event, story, 'PROJECT_STATUS', 'PREDICTION', {
            expectedEventTypes: ['PROJECT_RELEASED'], projectId, expectedOutcome: 'RELEASED',
        }, 'a completed release', absoluteWeek));
    }
    if (['PROJECT_HIT', 'PROJECT_SLEEPER'].includes(event.type) && projectId && universe) {
        items.push(candidate(event, story, 'FRANCHISE_DIRECTION', 'RUMOUR', {
            expectedEventTypes: ['FRANCHISE_DECISION'], projectId, universeId: universe.id,
        }, 'a franchise continuation', absoluteWeek));
    }
    if (event.type === 'AWARD_NOMINATED' && (event.awardEventId || eventEvidence(event, 'AWARD'))) {
        items.push(candidate(event, story, 'AWARDS', 'PREDICTION', {
            expectedEventTypes: ['AWARD_WON'], projectId, awardEventId: event.awardEventId || eventEvidence(event, 'AWARD')?.id,
        }, 'an award win', absoluteWeek));
    }
    if (event.type === 'COMPANY_DISTRESS' && companyId) {
        const expected = companyMove(event);
        items.push(candidate(event, story, 'COMPANY_MOVE', 'PREDICTION', {
            expectedEventTypes: [expected], companyId, expectedOutcome: expected.replace('COMPANY_', ''),
        }, expected.replace('COMPANY_', '').toLowerCase(), absoluteWeek));
    }
    return items;
};

export const renderIndustryMediaClaimCopy = (input: IndustryMediaClaimCopyInput): IndustryMediaClaimCopy => {
    const label = input.kind === 'LEAK' ? 'Unconfirmed industry sources'
        : input.kind === 'PREDICTION' ? `${input.sourceName}'s prediction`
            : 'Industry chatter';
    const action = ({
        CASTING: `could connect ${input.subjectName} with ${input.targetName}`,
        PROJECT_STATUS: `may move ${input.subjectName} toward ${input.targetName}`,
        PLATFORM_DESTINATION: `believes ${input.targetName} could emerge as the destination for ${input.subjectName}`,
        RELEASE_WINDOW: `believes ${input.subjectName} may arrive around ${input.targetName}`,
        FRANCHISE_DIRECTION: `may point ${input.subjectName} toward ${input.targetName}`,
        AWARDS: `could put ${input.subjectName} in position for ${input.targetName}`,
        COMPANY_MOVE: `believes ${input.subjectName} may be heading toward ${input.targetName}`,
        PROJECT_OUTCOME: `predicts ${input.subjectName} could finish as ${input.targetName}`,
    } as Record<IndustryMediaClaimCategory, string>)[input.category];
    return {
        headline: `${label}: ${input.subjectName}`,
        summary: `${label} ${action}. The report remains unconfirmed.`,
        knownEvidence: `Confirmed context: ${input.evidenceSummary}`,
        interpretation: `What is being claimed: ${input.targetName} is considered a plausible next outcome, not a confirmed fact.`,
    };
};

export const buildIndustryMediaClaimCandidates = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaClaimCandidate[] => {
    const ledger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const storyByEventId = new Map<string, IndustryMediaStory>();
    state.stories.forEach(story => story.industryEventIds.forEach(eventId => storyByEventId.set(eventId, story)));
    const openSignatures = new Set(state.claims.filter(claim => claim.status === 'OPEN').map(claim => (
        `${claim.subjectKey}:${claim.category}:${JSON.stringify(claim.target)}`
    )));
    const publicCandidates = ledger.events
        .filter(event => event.importance !== 'LOW' && event.absoluteWeek <= absoluteWeek && absoluteWeek - event.absoluteWeek <= CLAIM_RELEVANCE_WEEKS)
        .flatMap(event => {
            const story = storyByEventId.get(event.id);
            return story ? candidatesForEvent(event, story, absoluteWeek) : [];
        })
        .filter(item => !openSignatures.has(`${item.story.subjectKey}:${item.category}:${JSON.stringify(item.target)}`));
    const leakCandidates = buildIndustryMediaLeakCandidates(player, absoluteWeek)
        .filter(item => !openSignatures.has(`${item.story.subjectKey}:${item.category}:${JSON.stringify(item.target)}`));
    return [...publicCandidates, ...leakCandidates]
        .sort((left, right) => right.score - left.score || left.event.id.localeCompare(right.event.id) || left.category.localeCompare(right.category));
};

type LeakProposal = {
    id?: unknown;
    companyId?: unknown;
    absoluteWeek?: unknown;
    actionFamily?: unknown;
    optionId?: unknown;
    status?: unknown;
    nextReviewAbsoluteWeek?: unknown;
};

const leakCategory = (
    actionFamily: string,
    companyId: string,
    subjectId: string,
    nextReviewAbsoluteWeek: number,
): Pick<IndustryMediaClaimCandidate, 'category' | 'targetName' | 'target'> | null => {
    const action = actionFamily.toUpperCase();
    if (action.includes('COMMISSION')) return {
        category: 'PROJECT_STATUS',
        targetName: 'a new platform commission',
        target: { expectedEventTypes: ['PROJECT_GREENLIT'], companyId, projectId: subjectId, expectedOutcome: 'GREENLIT' },
    };
    if (action.includes('FRANCHISE') || action.includes('SEQUEL') || action.includes('SPIN')) return {
        category: 'FRANCHISE_DIRECTION',
        targetName: 'a franchise continuation',
        target: { expectedEventTypes: ['FRANCHISE_DECISION'], companyId, projectId: subjectId },
    };
    if (action.includes('RELEASE')) return {
        category: 'RELEASE_WINDOW',
        targetName: `a release around week ${nextReviewAbsoluteWeek}`,
        target: {
            expectedEventTypes: ['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'], companyId, projectId: subjectId,
            expectedAbsoluteWeek: nextReviewAbsoluteWeek, toleranceWeeks: 4,
        },
    };
    if (action.includes('RIGHTS') || action.includes('LICENSE') || action.includes('CATALOGUE')) return {
        category: 'PLATFORM_DESTINATION',
        targetName: displayName(companyId),
        target: { expectedEventTypes: ['RIGHTS_DEAL', 'RIGHTS_TRANSFER'], projectId: subjectId, platformId: companyId },
    };
    return null;
};

const cleanProposalText = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

export const buildIndustryMediaLeakCandidates = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaClaimCandidate[] => {
    const state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const ledger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const eventById = new Map(ledger.events.map(event => [event.id, event]));
    const acquiredPlatformIds = new Set(player.ownedStreamingPlatform?.corporateDevelopment?.acquiredPlatformIds || []);
    const ownedStudioIds = new Set(player.businesses.filter(business => business.type === 'PRODUCTION_HOUSE').flatMap(business => (
        [business.id, business.studioState?.acquisitionPortfolio?.sourceStudioId].filter(Boolean) as string[]
    )));
    const sources: Array<{
        sourceSystem: IndustryMediaLeakIntentSnapshot['sourceSystem'];
        companyId: string;
        controlled: boolean;
        proposals: LeakProposal[];
    }> = [];
    Object.entries(player.world?.platforms || {}).forEach(([companyId, platform]) => {
        const raw = platform as typeof platform & { ai?: { playerAcquisitionHandoffAtAbsoluteWeek?: number | null; intelligence?: { proposals?: LeakProposal[] } } };
        sources.push({
            sourceSystem: 'PLATFORM_AI',
            companyId,
            controlled: acquiredPlatformIds.has(companyId as never) || raw.ai?.playerAcquisitionHandoffAtAbsoluteWeek != null,
            proposals: Array.isArray(raw.ai?.intelligence?.proposals) ? raw.ai!.intelligence!.proposals! : [],
        });
    });
    Object.entries(player.world?.studios || {}).forEach(([companyId, studio]) => {
        const raw = studio as typeof studio & { ai?: { intelligence?: { proposals?: LeakProposal[] } } };
        sources.push({
            sourceSystem: 'STUDIO_AI',
            companyId,
            controlled: ownedStudioIds.has(companyId),
            proposals: Array.isArray(raw.ai?.intelligence?.proposals) ? raw.ai!.intelligence!.proposals! : [],
        });
    });

    const candidates: IndustryMediaClaimCandidate[] = [];
    sources.filter(source => !source.controlled).forEach(source => {
        source.proposals.forEach(raw => {
            const intentionId = cleanProposalText(raw.id);
            const proposalCompanyId = cleanProposalText(raw.companyId) || source.companyId;
            const actionFamily = cleanProposalText(raw.actionFamily);
            const optionId = cleanProposalText(raw.optionId).replace(/^(project|content|title):/i, '');
            const status = cleanProposalText(raw.status);
            const created = Number(raw.absoluteWeek);
            const nextReview = Number(raw.nextReviewAbsoluteWeek);
            if (
                !intentionId || proposalCompanyId !== source.companyId || !actionFamily || !optionId
                || !['PROPOSED', 'ACCEPTED'].includes(status)
                || !Number.isFinite(created) || created > absoluteWeek || absoluteWeek - created > 8
                || !Number.isFinite(nextReview) || nextReview < created
            ) return;
            const story = [...state.stories].reverse().find(item => item.subjectKey === `project:${optionId}`);
            if (!story) return;
            const anchorEventId = story.industryEventIds[story.industryEventIds.length - 1];
            const event = eventById.get(anchorEventId);
            if (!event) return;
            const mapped = leakCategory(actionFamily, source.companyId, optionId, Math.round(nextReview));
            if (!mapped) return;
            const leakIntentSnapshot: IndustryMediaLeakIntentSnapshot = {
                sourceSystem: source.sourceSystem,
                intentionId,
                intentionType: mapped.category === 'PROJECT_STATUS' ? 'COMMISSION'
                    : mapped.category === 'FRANCHISE_DIRECTION' ? 'FRANCHISE'
                        : mapped.category === 'RELEASE_WINDOW' ? 'RELEASE_WINDOW'
                            : 'RIGHTS_TARGET',
                companyId: source.companyId,
                subjectId: optionId,
                ...(mapped.target.platformId ? { targetId: mapped.target.platformId } : {}),
                ...(mapped.target.expectedAbsoluteWeek !== undefined ? { targetAbsoluteWeek: mapped.target.expectedAbsoluteWeek } : {}),
                capturedAbsoluteWeek: absoluteWeek,
            };
            candidates.push({
                event,
                story,
                kind: 'LEAK',
                category: mapped.category,
                subjectName: subjectNameFor(event),
                targetName: mapped.targetName,
                target: mapped.target,
                evidenceEventIds: [event.id],
                score: 92 + Math.round(createDeterministicRng(`c6:leak:${intentionId}`)() * 24),
                leakIntentSnapshot,
            });
        });
    });
    return candidates.sort((left, right) => right.score - left.score || left.event.id.localeCompare(right.event.id));
};

const focusForCategory = (category: IndustryMediaClaimCategory): IndustryMediaStory['category'] => ({
    CASTING: 'PROJECT_DEVELOPMENT',
    PROJECT_STATUS: 'PROJECT_PRODUCTION',
    PLATFORM_DESTINATION: 'RIGHTS',
    RELEASE_WINDOW: 'PROJECT_RELEASE',
    FRANCHISE_DIRECTION: 'FRANCHISE',
    AWARDS: 'AWARDS',
    COMPANY_MOVE: 'COMPANY',
    PROJECT_OUTCOME: 'PROJECT_OUTCOME',
} satisfies Record<IndustryMediaClaimCategory, IndustryMediaStory['category']>)[category];

const sourceFor = (
    state: ReturnType<typeof normalizeIndustryMediaWorld>,
    item: IndustryMediaClaimCandidate,
): { institution: IndustryMediaInstitution; personality?: IndustryMediaPersonality } | null => {
    const focus = focusForCategory(item.category);
    const institutions = new Map(state.institutions.map(institution => [institution.id, institution]));
    const candidates = state.personalities.filter(personality => {
        const institution = personality.institutionId ? institutions.get(personality.institutionId) : undefined;
        return personality.isActive && personality.channels.includes('X') && personality.focusCategories.includes(focus)
            && Boolean(institution?.isActive && institution.channels.includes('X'));
    }).sort((left, right) => {
        const leftInstitution = institutions.get(left.institutionId || '');
        const rightInstitution = institutions.get(right.institutionId || '');
        const leftScore = left.credibility + (leftInstitution?.access || 0) - Math.max(0, left.lastAppearanceAbsoluteWeek - item.event.absoluteWeek + 4) * 4;
        const rightScore = right.credibility + (rightInstitution?.access || 0) - Math.max(0, right.lastAppearanceAbsoluteWeek - item.event.absoluteWeek + 4) * 4;
        if (leftScore !== rightScore) return rightScore - leftScore;
        const leftTie = createDeterministicRng(`c6:source:${item.event.id}:${item.category}:${left.id}`)();
        const rightTie = createDeterministicRng(`c6:source:${item.event.id}:${item.category}:${right.id}`)();
        return rightTie - leftTie || left.id.localeCompare(right.id);
    });
    const personality = candidates[0];
    const institution = personality?.institutionId ? institutions.get(personality.institutionId) : undefined;
    if (institution) return { institution, personality };
    const fallback = state.institutions.find(itemInstitution => itemInstitution.isActive && itemInstitution.channels.includes('X') && itemInstitution.focusCategories.includes(focus));
    return fallback ? { institution: fallback } : null;
};

const expiryWeeks = (category: IndustryMediaClaimCategory): number => ({
    CASTING: 12,
    PROJECT_STATUS: 20,
    PLATFORM_DESTINATION: 18,
    RELEASE_WINDOW: 24,
    FRANCHISE_DIRECTION: 26,
    AWARDS: 16,
    COMPANY_MOVE: 20,
    PROJECT_OUTCOME: 18,
})[category];

export const createIndustryMediaClaim = (
    player: Player,
    absoluteWeek: number,
): { player: Player; claim?: IndustryMediaClaim } => {
    const state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const weekKey = `c6:created-week:${Math.round(absoluteWeek)}`;
    if (state.processedClaimKeys.includes(weekKey)) return { player };
    const candidates = buildIndustryMediaClaimCandidates({ ...player, world: { ...player.world, industryMedia: state } }, absoluteWeek);
    const selected = candidates[0];
    if (!selected) return { player };
    const source = sourceFor(state, selected);
    if (!source) return { player };
    const targetSignature = JSON.stringify(selected.target);
    const claimKey = `c6:${selected.story.subjectKey}:${selected.category}:${selected.event.id}:${targetSignature}`;
    if (state.claims.some(claim => claim.claimKey === claimKey) || state.processedClaimKeys.includes(claimKey)) return { player };
    const sourceName = source.personality?.name || source.institution.name;
    const copy = renderIndustryMediaClaimCopy({
        kind: selected.kind,
        category: selected.category,
        subjectName: selected.subjectName,
        sourceName,
        targetName: selected.targetName,
        evidenceSummary: selected.event.detail,
    });
    const confidenceScore = source.institution.credibility + source.institution.access + (source.personality?.credibility || 50);
    const claim: IndustryMediaClaim = {
        schemaVersion: 1,
        id: createDeterministicId('industry_media_claim', claimKey),
        claimKey,
        kind: selected.kind,
        status: 'OPEN',
        category: selected.category,
        confidence: confidenceScore >= 245 ? 'STRONG_SOURCING' : confidenceScore >= 190 ? 'CREDIBLE_CHATTER' : 'TENTATIVE',
        subjectKey: selected.story.subjectKey,
        subjectName: selected.subjectName,
        anchorIndustryEventId: selected.event.id,
        anchorStoryId: selected.story.id,
        evidenceEventIds: selected.evidenceEventIds,
        institutionId: source.institution.id,
        ...(source.personality ? { personalityId: source.personality.id } : {}),
        publicationChannel: 'X',
        importance: selected.event.importance,
        ...copy,
        target: selected.target,
        createdAbsoluteWeek: absoluteWeek,
        earliestResolutionAbsoluteWeek: absoluteWeek + 1,
        expiryAbsoluteWeek: absoluteWeek + expiryWeeks(selected.category),
        lastEvaluatedAbsoluteWeek: absoluteWeek,
        playerRelated: selected.event.companyId === player.id,
        ...(selected.leakIntentSnapshot ? { leakIntentSnapshot: selected.leakIntentSnapshot } : {}),
    };
    const nextState = normalizeIndustryMediaWorld({
        ...state,
        claims: [...state.claims, claim],
        processedClaimKeys: [...state.processedClaimKeys, claimKey, weekKey],
        personalities: state.personalities.map(personality => personality.id === claim.personalityId ? {
            ...personality,
            lastAppearanceAbsoluteWeek: absoluteWeek,
            recentStoryIds: [...personality.recentStoryIds.filter(id => id !== selected.story.id), selected.story.id].slice(-12),
        } : personality),
    });
    const normalizedClaim = nextState.claims.find(item => item.id === claim.id);
    if (!normalizedClaim) return { player };
    return {
        player: { ...player, world: { ...player.world, industryMedia: nextState } },
        claim: normalizedClaim,
    };
};
