import type { ActiveRelease, AudienceReception, AudienceReactionQuote, Genre } from '../types';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

const hashString = (value: string) => value.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);

const getGenreVoice = (genre: Genre | string) => {
    const normalized = String(genre || '').toUpperCase();
    if (['ACTION', 'SUPERHERO', 'SCI_FI', 'THRILLER'].includes(normalized)) {
        return {
            positive: ['The set pieces are carrying the whole room.', 'Crowd went loud for the big final act.'],
            mixed: ['Big moments land, but some scenes drag between them.'],
            negative: ['Looks expensive, but the story is not hitting everyone.']
        };
    }
    if (['ROMANCE', 'DRAMA', 'MUSICAL'].includes(normalized)) {
        return {
            positive: ['People are leaving emotional and recommending it.', 'The chemistry is doing real work here.'],
            mixed: ['Some loved the emotion, others wanted a tighter story.'],
            negative: ['The mood is there, but the audience is split on the payoff.']
        };
    }
    if (['HORROR', 'MYSTERY', 'CRIME'].includes(normalized)) {
        return {
            positive: ['The late-night crowd is selling this one hard.', 'The tension is getting strong word of mouth.'],
            mixed: ['The premise is sticky, but the ending is dividing people.'],
            negative: ['The buzz is more curious than fully positive right now.']
        };
    }
    if (['COMEDY', 'FAMILY', 'ANIMATION'].includes(normalized)) {
        return {
            positive: ['Easy crowd movie. People are bringing friends back.', 'Families are reacting better than expected.'],
            mixed: ['It plays fine, but not everyone is calling it special.'],
            negative: ['The laughs are not landing evenly across audiences.']
        };
    }
    return {
        positive: ['Word of mouth is stronger than the raw numbers suggest.', 'Viewers are calling it worth the ticket.'],
        mixed: ['Audience reaction is still settling after the opening wave.'],
        negative: ['The first wave is colder than the campaign expected.']
    };
};

const getLabel = (score: number, trend: AudienceReception['trend']) => {
    if (score >= 86) return trend === 'RISING' ? 'Breakout Crowd Favorite' : 'Crowd Favorite';
    if (score >= 74) return 'Strong Word of Mouth';
    if (score >= 60) return 'Generally Positive';
    if (score >= 46) return 'Divided Audience';
    if (score >= 32) return 'Soft Reaction';
    return 'Audience Backlash';
};

const getSummary = (score: number, trend: AudienceReception['trend'], isFinal: boolean) => {
    const movement = trend === 'RISING'
        ? 'Audience score is climbing as more viewers come in.'
        : trend === 'FALLING'
            ? 'Audience score is cooling as the wider crowd catches up.'
            : 'Audience score is holding steady for now.';
    const finalText = isFinal
        ? 'Final audience read is locked after the run.'
        : 'This can still move before the run ends.';
    if (score >= 74) return `${movement} Strong recommendations are helping the run. ${finalText}`;
    if (score >= 46) return `${movement} Viewers are split enough that the next weeks still matter. ${finalText}`;
    return `${movement} The reaction is a drag on the run unless late viewers soften it. ${finalText}`;
};

const createQuote = (
    id: string,
    author: string,
    text: string,
    sentiment: AudienceReactionQuote['sentiment'],
    rating: number,
    week: number,
    year: number
): AudienceReactionQuote => ({
    id,
    author,
    text,
    sentiment,
    rating,
    week,
    year
});

const buildQuotes = (
    release: ActiveRelease,
    score: number,
    trend: AudienceReception['trend'],
    week: number,
    year: number
): AudienceReactionQuote[] => {
    const voices = getGenreVoice(release.projectDetails.genre);
    const baseId = `${release.id}_${year}_${week}`;
    const seed = hashString(`${release.id}_${week}_${Math.round(score)}`);
    const authorPool = ['Opening Night Viewer', 'Weekend Crowd', 'Film Fan', 'Matinee Regular', 'Fan Forum'];
    const author = (offset: number) => authorPool[(seed + offset) % authorPool.length];

    if (score >= 74) {
        return [
            createQuote(`${baseId}_pos`, author(1), voices.positive[seed % voices.positive.length], 'POSITIVE', Math.min(5, Math.max(4, score / 20)), week, year),
            createQuote(`${baseId}_trend`, author(2), trend === 'FALLING' ? voices.mixed[0] : 'Already feels like the crowd has picked a side in its favor.', 'POSITIVE', Math.min(5, Math.max(3.5, score / 21)), week, year)
        ];
    }
    if (score >= 46) {
        return [
            createQuote(`${baseId}_mix`, author(1), voices.mixed[0], 'MIXED', Math.max(2.5, Math.min(4, score / 22)), week, year),
            createQuote(`${baseId}_pos`, author(2), voices.positive[(seed + 1) % voices.positive.length], score >= 60 ? 'POSITIVE' : 'MIXED', Math.max(2.5, Math.min(4.5, score / 21)), week, year)
        ];
    }
    return [
        createQuote(`${baseId}_neg`, author(1), voices.negative[0], 'NEGATIVE', Math.max(1, Math.min(2.5, score / 24)), week, year),
        createQuote(`${baseId}_mix`, author(2), voices.mixed[0], 'MIXED', Math.max(1.5, Math.min(3, score / 22)), week, year)
    ];
};

export const buildAudienceReception = (
    release: ActiveRelease,
    previous: AudienceReception | undefined,
    week: number,
    year: number,
    options: { isFinal?: boolean } = {}
): AudienceReception => {
    const quality = clamp(Number(release.projectDetails.hiddenStats?.qualityScore ?? release.productionPerformance ?? 50));
    const ratingScore = clamp((Number(release.imdbRating || 5) / 10) * 100);
    const budget = Math.max(1, Number(release.budget || release.projectDetails.estimatedBudget || 1));
    const totalGross = Math.max(0, Number(release.totalGross || 0));
    const weeklyGross = Array.isArray(release.weeklyGross) ? release.weeklyGross : [];
    const latestGross = weeklyGross.length ? weeklyGross[weeklyGross.length - 1] : 0;
    const previousGross = weeklyGross.length > 1 ? weeklyGross[weeklyGross.length - 2] : latestGross;
    const streamingViews = Math.max(0, Number(release.streaming?.totalViews || 0));
    const openingProof = clamp((latestGross / budget) * 170, -25, 28);
    const runProof = clamp((totalGross / budget) * 28, -12, 28);
    const holdProof = previousGross > 0
        ? clamp(((latestGross / Math.max(previousGross, 1)) - 0.55) * 35, -12, 12)
        : 0;
    const streamingProof = clamp((streamingViews / 8_000_000) * 8, 0, 12);
    const musicLift = release.projectDetails.musicPlan?.credits?.length ? 2 : 0;
    const seedNoise = ((hashString(`${release.id}_${week}_${year}`) % 9) - 4) * 0.7;
    const weekSoftening = Math.min(5, Math.max(0, (release.weekNum - 1) * 0.45));

    const rawScore = (quality * 0.34)
        + (ratingScore * 0.34)
        + 18
        + openingProof
        + runProof
        + holdProof
        + streamingProof
        + musicLift
        + seedNoise
        - weekSoftening;
    const currentScore = Math.round(clamp(rawScore, 8, 98));
    const previousScore = previous?.currentScore;
    const trend: AudienceReception['trend'] = previousScore === undefined
        ? 'STEADY'
        : currentScore >= previousScore + 2
            ? 'RISING'
            : currentScore <= previousScore - 2
                ? 'FALLING'
                : 'STEADY';
    const sampleBase = Math.max(latestGross, totalGross * 0.22, streamingViews * 0.16, budget * 0.02);
    const sampleSize = Math.max(650, Math.round(sampleBase / 3200));
    const isFinal = Boolean(options.isFinal);

    return {
        openingScore: previous?.openingScore ?? currentScore,
        currentScore,
        previousScore,
        trend,
        label: getLabel(currentScore, trend),
        summary: getSummary(currentScore, trend, isFinal),
        sampleSize,
        updatedWeek: week,
        updatedYear: year,
        isFinal,
        quotes: buildQuotes(release, currentScore, trend, week, year)
    };
};
