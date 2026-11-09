import { gameWeekText } from '../gameWeek';
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
import { composeCopy, fillCopy, pickCopy, pickFreshCopy, sentenceStart } from './mediaCopyVariety';

const CLAIM_RELEVANCE_WEEKS = 12;

export interface IndustryMediaClaimCopyInput {
    kind: IndustryMediaClaimKind;
    category: IndustryMediaClaimCategory;
    subjectName: string;
    sourceName: string;
    targetName: string;
    evidenceSummary: string;
    /** the claim's own key: the same claim always reads the same, two claims rarely read alike */
    seed?: string;
    /** headlines already out (news and X): the new headline takes a frame none of them used */
    recentLines?: readonly string[];
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

/** Real names for the ids an event carries (2026-11-09: the news printed "Studio Ai Project 1cug4ph", a project id). */
export interface IndustryMediaClaimNames {
    project: (id: string | undefined) => string | undefined;
    platform: (id: string | undefined) => string | undefined;
}

export const createIndustryMediaClaimNames = (player: Player): IndustryMediaClaimNames => {
    const titles = new Map<string, string>();
    Object.values(player.world?.industryProductions || {}).forEach(production => {
        const title = typeof production?.title === 'string' ? production.title.trim() : '';
        if (!title) return;
        titles.set(production.id, title);
        if (production.canonicalProjectId) titles.set(production.canonicalProjectId, title);
    });
    (player.pastProjects || []).forEach(project => {
        const title = typeof project?.name === 'string' ? project.name.trim() : '';
        if (title && typeof project.id === 'string') titles.set(project.id, title);
    });
    const platforms = (player.world?.platforms || {}) as unknown as Record<string, { name?: unknown } | undefined>;
    return {
        project: id => (id ? titles.get(id) : undefined),
        platform: id => {
            const name = id ? platforms[id]?.name : undefined;
            return typeof name === 'string' && name.trim() ? name.trim() : undefined;
        },
    };
};

const subjectNameFor = (event: IndustryEventFact, names?: IndustryMediaClaimNames): string => (
    names?.project(event.productionId) || names?.project(event.projectId)
    || (event.projectId
        ? (event.companyName ? `${event.companyName}'s next film` : 'an untitled film')
        : event.companyName || displayName(event.companyId || event.platformId || 'industry subject'))
);

const candidate = (
    event: IndustryEventFact,
    story: IndustryMediaStory,
    category: IndustryMediaClaimCategory,
    kind: IndustryMediaClaimKind,
    target: IndustryMediaClaimTarget,
    targetName: string,
    absoluteWeek: number,
    names?: IndustryMediaClaimNames,
): IndustryMediaClaimCandidate => {
    const importance = event.importance === 'HIGH' ? 60 : event.importance === 'MEDIUM' ? 40 : 18;
    const recency = Math.max(0, 18 - (absoluteWeek - event.absoluteWeek) * 3);
    const rng = createDeterministicRng(`c6:candidate:${event.id}:${category}`);
    return {
        event,
        story,
        category,
        kind,
        subjectName: subjectNameFor(event, names),
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
    names?: IndustryMediaClaimNames,
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
        }, displayName(talent.id), absoluteWeek, names));
    }
    if (['PROJECT_GREENLIT', 'PROJECT_RELEASE_PLANNED'].includes(event.type) && projectId && releaseWeek !== undefined) {
        items.push(candidate(event, story, 'RELEASE_WINDOW', 'PREDICTION', {
            expectedEventTypes: ['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'], projectId,
            expectedAbsoluteWeek: releaseWeek, toleranceWeeks: 4,
        }, gameWeekText(releaseWeek), absoluteWeek, names));
    }
    if (event.type === 'PROJECT_RELEASE_PLANNED' && projectId && destination) {
        items.push(candidate(event, story, 'PLATFORM_DESTINATION', 'PREDICTION', {
            expectedEventTypes: ['RIGHTS_DEAL', 'RIGHTS_TRANSFER'], projectId, platformId: destination.id,
        }, names?.platform(destination.id) || displayName(destination.id), absoluteWeek, names));
    }
    if (event.type === 'RIGHTS_SALE_ANNOUNCED' && projectId) {
        items.push(candidate(event, story, 'PLATFORM_DESTINATION', 'RUMOUR', {
            expectedEventTypes: ['RIGHTS_DEAL', 'RIGHTS_TRANSFER'], projectId,
        }, 'a major streaming buyer', absoluteWeek, names));
    }
    if (['PROJECT_RELEASE_PLANNED', 'PROJECT_RELEASED'].includes(event.type) && projectId) {
        const expected = deterministicOutcome(event);
        items.push(candidate(event, story, 'PROJECT_OUTCOME', 'PREDICTION', {
            expectedEventTypes: [expected], projectId, expectedOutcome: expected.replace('PROJECT_', ''),
        }, expected.replace('PROJECT_', '').toLowerCase(), absoluteWeek, names));
    }
    if (['PROJECT_DELAYED', 'PROJECT_OVERRUN', 'PROJECT_HELD'].includes(event.type) && projectId) {
        items.push(candidate(event, story, 'PROJECT_STATUS', 'PREDICTION', {
            expectedEventTypes: ['PROJECT_RELEASED'], projectId, expectedOutcome: 'RELEASED',
        }, 'a completed release', absoluteWeek, names));
    }
    if (['PROJECT_HIT', 'PROJECT_SLEEPER'].includes(event.type) && projectId && universe) {
        items.push(candidate(event, story, 'FRANCHISE_DIRECTION', 'RUMOUR', {
            expectedEventTypes: ['FRANCHISE_DECISION'], projectId, universeId: universe.id,
        }, 'a franchise continuation', absoluteWeek, names));
    }
    if (event.type === 'AWARD_NOMINATED' && (event.awardEventId || eventEvidence(event, 'AWARD'))) {
        items.push(candidate(event, story, 'AWARDS', 'PREDICTION', {
            expectedEventTypes: ['AWARD_WON'], projectId, awardEventId: event.awardEventId || eventEvidence(event, 'AWARD')?.id,
        }, 'an award win', absoluteWeek, names));
    }
    if (event.type === 'COMPANY_DISTRESS' && companyId) {
        const expected = companyMove(event);
        items.push(candidate(event, story, 'COMPANY_MOVE', 'PREDICTION', {
            expectedEventTypes: [expected], companyId, expectedOutcome: expected.replace('COMPANY_', ''),
        }, expected.replace('COMPANY_', '').toLowerCase(), absoluteWeek, names));
    }
    return items;
};

/* Rumours, leaks and predictions (2026-11-09, Zeesh: the same title kept repeating with only the name changed).
   A headline is a kind frame around a category core; a summary is opener + claim + hedge, each picked on its own.
   Every claim line keeps a hedge word (could, may, believed, reportedly, understood): a claim is never a fact. */
const CLAIM_TARGET_WORDS: Partial<Record<IndustryMediaClaimCategory, Record<string, string>>> = {
    PROJECT_OUTCOME: { hit: 'a hit', sleeper: 'a sleeper hit', flop: 'a flop' },
    COMPANY_MOVE: { funded: 'new money', restructured: 'a shake-up', recovered: 'a comeback', acquired: 'a sale', closed: 'closing its doors' },
};

const CLAIM_HEADLINE_CORES: Record<IndustryMediaClaimCategory, readonly string[]> = {
    CASTING: ['{target} circling {subject}', '{target} in talks for {subject}?', '{subject} eyes {target}', 'Could {target} lead {subject}?', '{target} and {subject}, a match in the making?'],
    PROJECT_STATUS: ['{subject} back on track?', 'Signs of life for {subject}', '{subject} could still reach the finish line', 'Do not count out {subject}', '{subject} may yet make it'],
    PLATFORM_DESTINATION: ['{target} eyeing {subject}', '{subject} could land at {target}', 'Is {target} the home for {subject}?', 'Bidding talk around {subject}', '{target} said to be circling {subject}'],
    RELEASE_WINDOW: ['{subject} eyes {target}', 'Date watch: {subject}', 'When does {subject} arrive? Talk points to {target}', '{subject} could open around {target}', 'Calendar chatter: {subject}', 'Is {subject} closer than we think?', 'A date is taking shape for {subject}', '{subject} may be coming sooner than you think'],
    FRANCHISE_DIRECTION: ['More {subject} on the way?', 'Is {subject} the start of something bigger?', '{subject} could grow into a franchise', 'Sequel talk follows {subject}', 'The next chapter of {subject}?'],
    AWARDS: ['{subject} in the awards race?', 'Can {subject} go all the way?', 'Awards buzz builds around {subject}', '{subject} is suddenly a contender', 'Trophy talk for {subject}'],
    COMPANY_MOVE: ['What next for {subject}?', 'Pressure builds at {subject}', '{subject} weighs its options', 'Big change coming at {subject}?', 'All eyes on {subject}'],
    PROJECT_OUTCOME: ['{subject} looks like {target}', 'Early read: {subject} is {target}', 'Is {subject} {target} in the making?', 'The case for {subject} as {target}', 'What to expect from {subject}', 'Why {subject} could be {target}', '{subject} has {target} written all over it', 'The numbers point to {target} for {subject}'],
};

const CLAIM_HEADLINE_FRAMES: Record<IndustryMediaClaimKind, readonly string[]> = {
    PREDICTION: ['{core}', '{core}', '{source} calls it: {core}', 'Forecast: {core}', 'Early call: {core}', '{source}: {core}'],
    RUMOUR: ['{core}', '{core}', 'Rumour: {core}', 'Buzz: {core}', 'Word is: {core}', 'Whispers: {core}'],
    LEAK: ['{core}', 'Exclusive: {core}', 'Sources: {core}', 'Insiders: {core}', 'Leaked: {core}', 'Behind the scenes: {core}'],
};

const CLAIM_OPENERS: Record<IndustryMediaClaimKind, readonly string[]> = {
    PREDICTION: ['{source} is making an early call.', '{source} has a theory.', '{source} is not waiting for the numbers.', '{source} has been reading the signs.', 'Here is a bold one from {source}.', ''],
    RUMOUR: ['Word is going around the business.', 'The chatter started this week.', 'People close to the business are talking.', 'A rumour is doing the rounds.', 'Industry gossip has a new favourite.', ''],
    LEAK: ['Sources close to the project are talking.', 'Something slipped out this week.', 'Insiders are passing this around.', 'A leak is making the rounds.', 'Details are getting out early.', ''],
};

const CLAIM_LINES: Record<IndustryMediaClaimCategory, readonly string[]> = {
    CASTING: ['{target} could end up attached to {subject}.', 'The name reportedly in the frame for {subject} is {target}.', '{target} is understood to be in the conversation for {subject}.', '{subject} may be building around {target}.'],
    PROJECT_STATUS: ['{subject} could still get to {target}.', 'Despite the trouble, {subject} may yet reach {target}.', '{subject} is believed to be getting back on course.', '{subject} may not be finished yet.'],
    PLATFORM_DESTINATION: ['{target} could end up as the home for {subject}.', '{subject} may be headed to {target}.', 'The buyer reportedly in the frame for {subject} is {target}.', '{target} is believed to want {subject}.'],
    RELEASE_WINDOW: ['{subject} could arrive around {target}.', '{subject} may turn up around {target}.', 'The window reportedly floated for {subject} is {target}.', '{subject} is understood to be pencilled in for {target}.'],
    FRANCHISE_DIRECTION: ['{subject} could turn into {target}.', 'There is reportedly talk of {target} off the back of {subject}.', '{subject} may be the first step toward {target}.', '{subject} could keep growing, if this is right.'],
    AWARDS: ['{subject} could be in line for {target}.', '{subject} may have a real shot at {target}.', '{subject} is believed to be in the mix for {target}.', 'Voters may not be able to ignore {subject}.'],
    COMPANY_MOVE: ['{subject} may be heading toward {target}.', 'The next move for {subject} could be {target}.', '{subject} could be preparing for {target}.', '{target} may be coming at {subject}.'],
    PROJECT_OUTCOME: ['The read is that {subject} could finish as {target}.', '{subject} may well turn out to be {target}.', 'The bet is that {subject} could end up {target}.', '{subject} is believed to be heading for {target}.'],
};

const CLAIM_HEDGES: Record<IndustryMediaClaimKind, readonly string[]> = {
    PREDICTION: ['It is a call, not a fact.', 'Nothing is confirmed yet.', 'The numbers will settle it.', 'Treat it as a guess for now.', 'Time will tell.'],
    RUMOUR: ['Nothing is confirmed yet.', 'None of this is official.', 'No one involved has said a word.', 'Treat it as gossip until there is proof.', 'There is no official word.'],
    LEAK: ['Nothing is confirmed yet.', 'No one has gone on the record.', 'There is no official word.', 'The people involved have not commented.', 'It is still unconfirmed.'],
};

/** Every evidence line opens by saying it is the confirmed part (the C6 copy audit holds this). */
export const CLAIM_EVIDENCE_LEADS = ['Confirmed context:', 'What is confirmed:', 'On the record:', 'The confirmed facts:', 'Known so far:'] as const;

const CLAIM_INTERPRETATIONS = [
    'What is being claimed: {target} is a plausible next outcome, not a confirmed fact.',
    'The claim: {target} is possible, but nothing is confirmed.',
    'Read it as a possibility, not a fact: {target}.',
    'On the table: {target}. It is not confirmed.',
] as const;

export const renderIndustryMediaClaimCopy = (input: IndustryMediaClaimCopyInput): IndustryMediaClaimCopy => {
    const seed = `claim-copy:${input.seed || `${input.kind}:${input.category}:${input.subjectName}:${input.targetName}`}`;
    const target = CLAIM_TARGET_WORDS[input.category]?.[input.targetName.trim().toLowerCase()] || input.targetName;
    const vars = { subject: input.subjectName, target, source: input.sourceName };
    const core = fillCopy(pickFreshCopy(`${seed}:core`, CLAIM_HEADLINE_CORES[input.category], input.recentLines), vars);
    const headline = sentenceStart(fillCopy(pickCopy(`${seed}:frame`, CLAIM_HEADLINE_FRAMES[input.kind]), { ...vars, core }));
    return {
        headline,
        summary: composeCopy(`${seed}:summary`, [CLAIM_OPENERS[input.kind], CLAIM_LINES[input.category], CLAIM_HEDGES[input.kind]], vars),
        knownEvidence: `${pickCopy(`${seed}:evidence`, CLAIM_EVIDENCE_LEADS)} ${input.evidenceSummary}`,
        interpretation: sentenceStart(fillCopy(pickCopy(`${seed}:interpretation`, CLAIM_INTERPRETATIONS), vars)),
    };
};

export const buildIndustryMediaClaimCandidates = (
    player: Player,
    absoluteWeek: number,
): IndustryMediaClaimCandidate[] => {
    const ledger = normalizeIndustryEventLedger(player.world?.industryEvents);
    const state = normalizeIndustryMediaWorld(player.world?.industryMedia);
    const names = createIndustryMediaClaimNames(player);
    const storyByEventId = new Map<string, IndustryMediaStory>();
    state.stories.forEach(story => story.industryEventIds.forEach(eventId => storyByEventId.set(eventId, story)));
    const openSignatures = new Set(state.claims.filter(claim => claim.status === 'OPEN').map(claim => (
        `${claim.subjectKey}:${claim.category}:${JSON.stringify(claim.target)}`
    )));
    const publicCandidates = ledger.events
        .filter(event => event.importance !== 'LOW' && event.absoluteWeek <= absoluteWeek && absoluteWeek - event.absoluteWeek <= CLAIM_RELEVANCE_WEEKS)
        .flatMap(event => {
            const story = storyByEventId.get(event.id);
            return story ? candidatesForEvent(event, story, absoluteWeek, names) : [];
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
        targetName: `a release around ${gameWeekText(nextReviewAbsoluteWeek)}`,
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
    const names = createIndustryMediaClaimNames(player);
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
                subjectName: subjectNameFor(event, names),
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
        seed: claimKey,
        recentLines: [
            ...(player.news || []).slice(0, 40).map(item => item.headline),
            ...(player.x?.feed || []).slice(0, 60).map(post => String(post.content || '').split('\n')[0]),
        ],
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
