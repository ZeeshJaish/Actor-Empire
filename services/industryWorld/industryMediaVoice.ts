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
/* what the media say about a service going down and coming back (Phase 5, #67), and about its prices
   (#68: "the way real critics react"): against, for, and anyone else */
const PLATFORM_OPINIONS: Partial<Record<IndustryEventFact['type'], { against: string; for: string; neutral: string }>> = {
    PLATFORM_OUTAGE: {
        against: 'Subscribers pay for a service that works, and this week it did not.',
        for: 'Every service has a bad night; what matters is how fast this one is fixed.',
        neutral: 'The real test is how quickly the service is working again.',
    },
    PLATFORM_RESTORED: {
        against: 'Fixed, yes, but subscribers will remember the week it went down.',
        for: 'A clean fix, and the right one.',
        neutral: 'The service works again; the question is whether it stays that way.',
    },
    PLATFORM_PRICE_RAISED: {
        against: 'Subscribers are paying more for the same shows. That is not fair.',
        for: 'Great shows cost more to make; a higher price was always coming.',
        neutral: 'The question is how many subscribers stay at the new price.',
    },
    PLATFORM_ADS_ADDED: {
        against: 'People paid to get away from ads. Putting them back is not fair.',
        for: 'Ads keep prices down for everyone, as long as the breaks stay short.',
        neutral: 'Viewers will decide whether the ads are worth what they save.',
    },
    PLATFORM_PRICE_CUT: {
        against: 'Cutting prices like this looks like a service that needs subscribers badly.',
        for: 'A cheaper way in is good news for viewers.',
        neutral: 'Cheaper is good for viewers; the question is what it costs the service.',
    },
    /* "their picture is better" (#70) */
    PLATFORM_QUALITY_GAP: {
        against: 'Subscribers are paying for a picture a rival now beats.',
        for: 'Picture is not everything; the shows still decide where people watch.',
        neutral: 'Viewers who care about picture now have a reason to look elsewhere.',
    },
    /* #117 (plan §18.7: "fans split, and critics weigh in"; Zeesh: "कोई क्रिटिसाइज करे, कोई इंजॉय करे, कोई बोले कि अरे उसका तो
       सस्ता है फिर भी इतना कुछ ऑफर कर रहा है") */
    PLATFORM_REBRANDED: {
        against: 'A new logo is the easy part; the shows are the same as last week.',
        for: 'The new look finally matches the service it has become.',
        neutral: 'Viewers will judge the new look in the app, not in the announcement.',
    },
    /* #200 */
    PLATFORM_EXECUTIVE_LEFT: {
        against: 'People do not leave a company that has its act together.',
        for: 'Every service loses people. New blood is rarely the worst thing that can happen.',
        neutral: 'The real story is who takes the chair next.',
    },
    PLATFORM_EXECUTIVE_HIRED: {
        against: 'A new name at the table is not a plan.',
        for: 'A serious hire. It says the service is serious about what comes next.',
        neutral: 'A new chief gets a year; the numbers will say the rest.',
    },
    PLATFORM_APP_REDESIGNED: {
        against: 'Moving everything around annoys the people who pay; habits are a feature.',
        for: 'The new home screen puts the shows first. Finding something to watch is faster.',
        neutral: 'The test is whether people find something to watch faster.',
    },
    PLATFORM_FREE_TIER: {
        against: 'Free with ads is how a service fills the gap in its subscriber count.',
        for: 'Anyone can watch now, and the ads pay for it. That is a fair deal.',
        neutral: 'Free viewers bring ad money; the question is how many go on to pay.',
    },
    PLATFORM_OFFER_CHANGED: {
        against: 'Changing how the service is sold leaves the people paying for it guessing.',
        for: 'A clearer offer, and a bolder one.',
        neutral: 'Viewers will vote with their sign-ups.',
    },
    PLATFORM_VALUE_PRAISED: {
        against: 'Cheap is easy at the start; the test is whether it lasts once they need the money.',
        for: 'More for less than anyone else charges. Viewers win.',
        neutral: 'Value pulls in price-minded homes; the question is whether the shows keep them.',
    },
    /* #143: the weekly Top 10's notable weeks */
    PLATFORM_CHART_MOMENT: {
        against: 'One big week is not a habit; the chart is won by the titles people come back to.',
        for: 'People are watching, and that is the only review that counts.',
        neutral: 'The chart rewards whoever keeps the next hit coming.',
    },
    /* #149: a campaign's big night, famous screen or big result */
    PLATFORM_CAMPAIGN_MOMENT: {
        against: 'A lit-up landmark is a photo, not a reason to subscribe; watch who is still paying in a month.',
        for: 'This is how you make a whole city talk about a show. Big swing, and it looks incredible.',
        neutral: 'Big moments buy attention for a night; the catalogue has to keep it.',
    },
    PLATFORM_VALUE_CRITICISED: {
        against: 'Subscribers here pay more and get less than the rivals give.',
        for: 'The price buys the shows, and the shows are worth it.',
        neutral: 'Anyone comparing plans will notice the gap.',
    },
};
const PLATFORM_ANALYSIS: Partial<Record<IndustryEventFact['type'], string>> = {
    PLATFORM_OUTAGE: 'The number to watch is how many subscribers cancel over it in the weeks ahead.',
    PLATFORM_RESTORED: 'What matters now is whether the subscribers who left come back.',
    PLATFORM_PRICE_RAISED: 'The test is whether the extra revenue outruns the cancellations it causes.',
    PLATFORM_ADS_ADDED: 'Ads add revenue for every hour watched, but only while the plan keeps its viewers.',
    PLATFORM_PRICE_CUT: 'A lower price brings subscribers in; the question is whether revenue per subscriber holds.',
    PLATFORM_QUALITY_GAP: 'Viewers who chase picture weigh the best on offer; the gap will show in who signs up.',
    PLATFORM_REBRANDED: 'A new look earns its cost only if it brings in sign-ups.',
    PLATFORM_APP_REDESIGNED: 'A home screen earns its keep in how fast viewers press play.',
    PLATFORM_EXECUTIVE_LEFT: 'An empty chair slows what that chair ran; how long it stays empty is the number to watch.',
    PLATFORM_EXECUTIVE_HIRED: 'A new chief changes what a service does first; it takes a year to show in the numbers.',
    PLATFORM_FREE_TIER: 'A free tier widens the door; the money is in how many walk on to a paid plan.',
    PLATFORM_OFFER_CHANGED: 'How a service sells itself decides who it reaches; the weeks ahead will show who it lost.',
    PLATFORM_VALUE_PRAISED: 'Price-minded homes compare plans line by line; this one wins that comparison today.',
    PLATFORM_VALUE_CRITICISED: 'Price-minded homes compare plans line by line; this one loses that comparison today.',
    PLATFORM_CHART_MOMENT: 'Views are the chart; what matters for the service is whether those viewers stay for what comes next.',
    PLATFORM_CAMPAIGN_MOMENT: 'Stunts buy reach in one night; what they were worth shows in the sign-ups of the weeks after.',
};
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
    const platform = PLATFORM_OPINIONS[input.event.type];
    if (platform) {
        return personality?.signatureRole === 'ANTAGONIST' ? platform.against
            : personality?.signatureRole === 'SUPPORTER' ? platform.for : platform.neutral;
    }
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
    const platform = PLATFORM_ANALYSIS[input.event.type];
    if (platform) return platform;
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
