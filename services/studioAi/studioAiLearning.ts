/* 18 Nov 2026 (rival studio debt plan v2, D0: rivals learn from their own releases). Zeesh: rivals should learn from
   their mistakes, stop making the kind of title that keeps losing money, and keep trying to make ones that pay, like a
   human studio would.

   What a studio remembers (its last STUDIO_AI_LESSON_LIMIT releases, one lesson each):
   - when a release's result is known (a cinema run closes in boxOfficeLiveSettlement.ts, or any other release settles
     in studioAiCommercialResult.ts): its format (movie, series, limited series), its size (the four release sizes:
     LOW, MID, HIGH, BLOCKBUSTER), what it cost, what came back, and for a movie planned on the cinema market forecast
     (studioAiCinemaInvestment.ts), what that forecast said.

   What it learns from them, for one kind of title (format and size):
     experience = (evidence × what its record says + doubt × 1) / (evidence + doubt)
   - "what its record says" is money that came back over money expected: over what it cost for its track record,
     over the cinema forecast for a movie's forecast;
   - "evidence" counts its own releases of that kind fully and other studios' at a quarter (what it reads in the
     trades); a release counts half after two years, a quarter after four, as memories fade;
   - "doubt" is how many releases it needs before it trusts its record over its plans: 1 to 3 by boldness, halved by
     a strong finance team, half again more with a weak one.
   With no releases of that kind anywhere, experience is 1 and the studio plans exactly as it always did.

   Where it is used, the way people use a track record:
   1. choosing which idea to develop (industryContentNovelty.ts): an idea of a kind that has paid ranks higher, one of a
      kind that has lost ranks lower, next to how fresh the idea is;
   2. the greenlight meeting (studioAiGreenlight.ts), for a title with no cinema forecast (series, limited series):
      the expected return moves its commercial outlook and its financial risk;
   3. sizing a movie (studioAiCinemaInvestment.ts): the cinema forecast is scaled by how its forecasts at that size
      have come in, and the studio then picks the biggest budget that still pays back.
   A lesson fades, so a studio that stopped making a kind of title tries it again after a few years, as people do. */
import type {
    BudgetTier, IndustryContentFormat, NPCStudioState, StudioAiReleaseLesson, StudioAiUnderwriting, WorldState,
} from '../../types';

export const STUDIO_AI_LESSON_LIMIT = 16;
/** a lesson counts half after this many weeks, a quarter after twice as many */
export const STUDIO_AI_LESSON_HALF_LIFE_WEEKS = 104;
/** another studio's release counts this much of one's own */
export const STUDIO_AI_INDUSTRY_LESSON_WEIGHT = 0.25;
/** points an idea or a greenlight score moves by the track record: 50 x ln(experience), about 5 points for each 10%
 *  its kind of title has made or lost near break-even. A doubling adds as many points as a halving takes away, so a
 *  run of hits does not drown out everything else in the decision. */
export const STUDIO_AI_TRACK_RECORD_POINTS = 50;

const TIERS = new Set<BudgetTier>(['LOW', 'MID', 'HIGH', 'BLOCKBUSTER']);
const FORMATS = new Set<IndustryContentFormat>(['MOVIE', 'SERIES', 'LIMITED_SERIES']);
const OUTCOMES = new Set(['HIT', 'SOLID', 'FLOP']);
const finite = (value: unknown, fallback = 0): number => Number.isFinite(Number(value)) ? Number(value) : fallback;
const whole = (value: unknown): number => Math.max(0, Math.round(finite(value)));
/* a lesson keeps money to the thousand dollars: enough to judge a release, and small in the save */
const money = (value: unknown): number => Math.round(Math.max(0, finite(value)) * 1e3) / 1e3;
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/** the same budget sizes a release is filed under (studioAiCommercialResult.ts) */
export const studioAiBudgetTier = (budgetMillions: number): BudgetTier => budgetMillions >= 150 ? 'BLOCKBUSTER'
    : budgetMillions >= 80 ? 'HIGH' : budgetMillions >= 30 ? 'MID' : 'LOW';

export const normalizeStudioAiUnderwriting = (value: unknown): StudioAiUnderwriting | undefined => {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Partial<StudioAiUnderwriting>;
    const marketForecastReceiptsMillions = money(raw.marketForecastReceiptsMillions);
    return {
        absoluteWeek: whole(raw.absoluteWeek),
        productionMillions: money(raw.productionMillions),
        campaignMillions: money(raw.campaignMillions),
        marketForecastReceiptsMillions,
        expectedReceiptsMillions: raw.expectedReceiptsMillions === undefined ? marketForecastReceiptsMillions : money(raw.expectedReceiptsMillions),
    };
};

export const normalizeStudioAiLessons = (value: unknown): StudioAiReleaseLesson[] => {
    const rows = (Array.isArray(value) ? value : []).flatMap(item => {
        if (!item || typeof item !== 'object') return [];
        const raw = item as Partial<StudioAiReleaseLesson>;
        if (!raw.productionId || !TIERS.has(raw.budgetTier as BudgetTier)) return [];
        const forecast = money(raw.marketForecastReceiptsMillions);
        const row: StudioAiReleaseLesson = {
            productionId: String(raw.productionId),
            absoluteWeek: whole(raw.absoluteWeek),
            format: FORMATS.has(raw.format as IndustryContentFormat) ? raw.format as IndustryContentFormat : 'MOVIE',
            budgetTier: raw.budgetTier as BudgetTier,
            costMillions: money(raw.costMillions),
            receiptsMillions: money(raw.receiptsMillions),
            ...(forecast > 0 ? { marketForecastReceiptsMillions: forecast } : {}),
            outcome: OUTCOMES.has(String(raw.outcome)) ? raw.outcome as StudioAiReleaseLesson['outcome'] : 'SOLID',
        };
        return [row];
    });
    const unique = [...new Map(rows.map(row => [row.productionId, row])).values()];
    return unique.sort((left, right) => left.absoluteWeek - right.absoluteWeek || left.productionId.localeCompare(right.productionId))
        .slice(-STUDIO_AI_LESSON_LIMIT);
};

/** Adds one release to the studio's memory, once. A studio without its AI state is returned unchanged. */
export const recordStudioAiReleaseLesson = (studio: NPCStudioState, lesson: StudioAiReleaseLesson): NPCStudioState => {
    if (!studio.ai) return studio;
    const existing = studio.ai.lessons || [];
    if (existing.some(item => item.productionId === lesson.productionId)) return studio;
    return { ...studio, ai: { ...studio.ai, lessons: normalizeStudioAiLessons([...existing, lesson]) } };
};

/** How many releases the studio needs before it trusts its record over its plans: 1 to 3 by boldness, times 0.5 to
 *  1.5 by its finance team (a strong one learns faster). */
export const studioAiLessonDoubt = (studio: NPCStudioState): number => {
    const risk = clamp01(finite(studio.ai?.profile?.riskTolerance, 50) / 100);
    const finance = clamp01(finite(studio.ai?.competence?.finance, 50) / 100);
    return (1 + 2 * risk) * (1.5 - finance);
};

export interface StudioExperience {
    /** what share of the expected money the studio now expects to come back (1: as planned) */
    factor: number;
    /** its own releases of that kind, counted by age */
    ownWeight: number;
    /** other studios' releases of that kind, counted by age and at a quarter */
    industryWeight: number;
}

const ageWeight = (absoluteWeek: number, lessonWeek: number): number =>
    Math.pow(0.5, Math.max(0, absoluteWeek - lessonWeek) / STUDIO_AI_LESSON_HALF_LIFE_WEEKS);

/** The studio's experience with one kind of title. measure 'FORECAST': how cinema forecasts for movies of that size
 *  came in (only movies planned on one); 'RETURN': money back over money spent. */
export const getStudioExperience = (input: {
    world?: WorldState;
    studio: NPCStudioState;
    absoluteWeek: number;
    format: IndustryContentFormat;
    budgetMillions: number;
    measure: 'FORECAST' | 'RETURN';
}): StudioExperience => {
    const tier = studioAiBudgetTier(input.budgetMillions);
    let came = 0, expected = 0, ownWeight = 0, industryWeight = 0;
    const add = (lesson: StudioAiReleaseLesson, share: number, own: boolean) => {
        if (lesson.format !== input.format || lesson.budgetTier !== tier) return;
        const basis = input.measure === 'FORECAST' ? lesson.marketForecastReceiptsMillions || 0 : lesson.costMillions;
        if (!(basis > 0)) return;
        const weight = ageWeight(input.absoluteWeek, lesson.absoluteWeek) * share;
        came += weight * lesson.receiptsMillions;
        expected += weight * basis;
        if (own) ownWeight += weight; else industryWeight += weight;
    };
    for (const lesson of input.studio.ai?.lessons || []) add(lesson, 1, true);
    for (const other of Object.values(input.world?.studios || {})) {
        if (!other || other.id === input.studio.id) continue;
        for (const lesson of other.ai?.lessons || []) add(lesson, STUDIO_AI_INDUSTRY_LESSON_WEIGHT, false);
    }
    const evidence = ownWeight + industryWeight;
    if (!(expected > 0) || !(evidence > 0)) return { factor: 1, ownWeight, industryWeight };
    const record = came / expected;
    const doubt = studioAiLessonDoubt(input.studio);
    return { factor: (evidence * record + doubt) / (evidence + doubt), ownWeight, industryWeight };
};

/** Points a pitch or a greenlight score moves by the studio's track record with that kind of title. */
export const studioAiTrackRecordPoints = (factor: number): number => {
    const value = finite(factor, 1);
    return value > 0 ? STUDIO_AI_TRACK_RECORD_POINTS * Math.log(value) : 0;
};

/** One studio's track record by kind of title, worked out once per kind while it compares its pitches. */
export const createStudioTrackRecordReader = (world: WorldState | undefined, studio: NPCStudioState, absoluteWeek: number) => {
    const known = new Map<string, number>();
    return (format: IndustryContentFormat, budgetMillions: number): number => {
        const key = `${format}:${studioAiBudgetTier(budgetMillions)}`;
        if (!known.has(key)) known.set(key, getStudioExperience({ world, studio, absoluteWeek, format, budgetMillions, measure: 'RETURN' }).factor);
        return known.get(key)!;
    };
};
