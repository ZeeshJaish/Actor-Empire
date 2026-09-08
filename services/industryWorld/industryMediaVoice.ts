import type {
    IndustryEventFact,
    IndustryMediaChannel,
    IndustryMediaInstitution,
    IndustryMediaPersonality,
    IndustryMediaStory,
    IndustryMediaStoryAssignment,
} from '../../types';

export interface IndustryMediaVoiceInput {
    event: IndustryEventFact;
    story: IndustryMediaStory;
    institution: IndustryMediaInstitution;
    personality?: IndustryMediaPersonality;
    assignment: IndustryMediaStoryAssignment;
    channel: IndustryMediaChannel;
}

export interface IndustryMediaVoiceResult {
    headline: string;
    detail: string;
    content: string;
    claimMode: IndustryMediaStoryAssignment['angle'];
    industryEventId: string;
    mediaStoryId: string;
    mediaInstitutionId: string;
    mediaPersonalityId?: string;
    sourceName: string;
    byline?: string;
    usedNeutralFallback: boolean;
}

const POSITIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_LAUNCHED', 'COMPANY_PROMOTED', 'COMPANY_EXPANDED', 'COMPANY_RECOVERED',
    'COMPANY_FUNDED', 'PROJECT_GREENLIT', 'PROJECT_RELEASED', 'PROJECT_HIT',
    'AWARD_NOMINATED', 'AWARD_WON', 'RIGHTS_DEAL',
]);
const NEGATIVE_EVENTS = new Set<IndustryEventFact['type']>([
    'COMPANY_DISTRESS', 'COMPANY_RESTRUCTURED', 'COMPANY_CLOSED', 'PROJECT_DELAYED',
    'PROJECT_OVERRUN', 'PROJECT_HELD', 'PROJECT_FLOP', 'PROJECT_CANCELLED',
]);
const UNCERTAINTY_PATTERN = /\b(may|might|could|possibly|theory|suggests|perhaps)\b/i;
const INVENTION_PATTERN = /\b(inside source|exclusive leak|sources? confirmed|confirmed crossover|secret deal)\b/i;
const numericTokens = (value: string): string[] => value.match(/\b\d+(?:\.\d+)?%?\b/g) || [];

const canonicalTextFor = (input: IndustryMediaVoiceInput): string => [
    input.event.headline,
    input.event.detail,
    input.story.headline,
    input.story.detail,
].join(' ');

const opinionLine = (input: IndustryMediaVoiceInput): string => {
    const personality = input.personality;
    if (personality?.signatureRole === 'ANTAGONIST') {
        if (POSITIVE_EVENTS.has(input.event.type) && ['PROJECT_HIT', 'AWARD_WON', 'COMPANY_RECOVERED'].includes(input.event.type)) {
            return 'Even I have to admit the result landed, but one win does not settle the larger argument.';
        }
        if (NEGATIVE_EVENTS.has(input.event.type)) {
            return 'This is the risk critics warned about, and the people responsible still have plenty to prove.';
        }
        return 'This looks expensive, risky, and still has plenty to prove.';
    }
    if (personality?.signatureRole === 'SUPPORTER') {
        if (NEGATIVE_EVENTS.has(input.event.type)) {
            return 'This is a setback, but it does not erase the record or the ambition behind the work.';
        }
        return 'Ambition deserves credit when the public record supports taking the swing.';
    }
    if (personality?.role === 'CRITIC') {
        return 'The announcement has promise, although the finished work still has to justify that confidence.';
    }
    if (personality?.voiceArchetype === 'POPULIST') {
        return 'The audience will decide whether this is a real moment or only a loud one.';
    }
    return 'The real test is whether the finished result earns the confidence now being placed in it.';
};

const analysisLine = (input: IndustryMediaVoiceInput): string => {
    if (input.story.category === 'RIGHTS') return 'The strategic question is how much value this window can create for both sides.';
    if (input.story.category === 'COMPANY') return 'The next results will show whether this decision strengthens the wider business.';
    if (input.story.category === 'PROJECT_OUTCOME') return 'The outcome now becomes evidence for the company\'s next slate decision.';
    return 'The numbers-first question is whether the project can sustain the momentum behind this decision.';
};

const speculationLine = (): string => (
    'Theory: this could suggest a wider connection, but nothing beyond the saved announcement is confirmed.'
);

const neutralResult = (input: IndustryMediaVoiceInput): IndustryMediaVoiceResult => ({
    headline: input.event.headline,
    detail: input.event.detail,
    content: `${input.event.headline} ${input.event.detail}`,
    claimMode: 'FACT',
    industryEventId: input.event.id,
    mediaStoryId: input.story.id,
    mediaInstitutionId: input.institution.id,
    ...(input.personality ? { mediaPersonalityId: input.personality.id } : {}),
    sourceName: input.institution.name,
    ...(input.personality ? { byline: input.personality.name } : {}),
    usedNeutralFallback: true,
});

const framedLine = (input: IndustryMediaVoiceInput): string => {
    if (input.assignment.angle === 'SPECULATION') return speculationLine();
    if (input.assignment.angle === 'OPINION') return opinionLine(input);
    if (input.assignment.angle === 'ANALYSIS') return analysisLine(input);
    return '';
};

const buildCandidate = (input: IndustryMediaVoiceInput): IndustryMediaVoiceResult => {
    const frame = framedLine(input);
    const detail = frame ? `${input.event.detail} ${frame}` : input.event.detail;
    return {
        headline: input.event.headline,
        detail,
        content: `${input.event.headline} ${detail}`,
        claimMode: input.assignment.angle,
        industryEventId: input.event.id,
        mediaStoryId: input.story.id,
        mediaInstitutionId: input.institution.id,
        ...(input.personality ? { mediaPersonalityId: input.personality.id } : {}),
        sourceName: input.institution.name,
        ...(input.personality ? { byline: input.personality.name } : {}),
        usedNeutralFallback: false,
    };
};

export const validateIndustryMediaVoice = (
    result: IndustryMediaVoiceResult,
    input: IndustryMediaVoiceInput,
): boolean => {
    if (!result.headline.trim() || !result.detail.trim() || !result.content.trim()) return false;
    if (result.industryEventId !== input.event.id || result.mediaStoryId !== input.story.id) return false;
    if (result.mediaInstitutionId !== input.institution.id) return false;
    if ((result.mediaPersonalityId || undefined) !== (input.personality?.id || undefined)) return false;
    if (INVENTION_PATTERN.test(`${result.headline} ${result.detail} ${result.content}`)) return false;
    if (result.claimMode === 'SPECULATION' && !UNCERTAINTY_PATTERN.test(result.content)) return false;
    const allowedNumbers = new Set(numericTokens(canonicalTextFor(input)));
    if (numericTokens(`${result.headline} ${result.detail} ${result.content}`).some(token => !allowedNumbers.has(token))) return false;
    return true;
};

export const ensureFactSafeIndustryMediaVoice = (
    candidate: IndustryMediaVoiceResult,
    input: IndustryMediaVoiceInput,
): IndustryMediaVoiceResult => validateIndustryMediaVoice(candidate, input) ? candidate : neutralResult(input);

export const createIndustryMediaVoice = (input: IndustryMediaVoiceInput): IndustryMediaVoiceResult => (
    ensureFactSafeIndustryMediaVoice(buildCandidate(input), input)
);
