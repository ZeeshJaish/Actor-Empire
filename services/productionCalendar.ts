import type { Commitment, ProductionCalendar } from '../types';
import { getAbsoluteWeek } from './legacyLogic';

type ProductionCalendarPhase = Extract<NonNullable<Commitment['projectPhase']>, 'PRE_PRODUCTION' | 'PRODUCTION' | 'POST_PRODUCTION'>;

const DEFAULT_PHASE_WEEKS: Record<ProductionCalendarPhase, number> = {
    PRE_PRODUCTION: 8,
    PRODUCTION: 10,
    POST_PRODUCTION: 12,
};

const PHASE_DURATION_KEY: Record<ProductionCalendarPhase, keyof Pick<ProductionCalendar, 'preProductionWeeks' | 'productionWeeks' | 'postProductionWeeks'>> = {
    PRE_PRODUCTION: 'preProductionWeeks',
    PRODUCTION: 'productionWeeks',
    POST_PRODUCTION: 'postProductionWeeks',
};

const ACTIVE_CALENDAR_PHASES = new Set<Commitment['projectPhase']>(['PRE_PRODUCTION', 'PRODUCTION', 'POST_PRODUCTION']);

const clampNumber = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const safeWeekCount = (value: unknown, fallback: number) => {
    const numeric = Math.round(Number(value));
    if (!Number.isFinite(numeric) || numeric <= 0) return Math.max(1, Math.round(fallback));
    return Math.max(1, numeric);
};

export const createProductionCalendar = ({
    preProductionWeeks,
    productionWeeks,
    postProductionWeeks,
    age,
    week,
}: {
    preProductionWeeks: number;
    productionWeeks: number;
    postProductionWeeks: number;
    age?: number;
    week?: number;
}): ProductionCalendar => {
    const pre = safeWeekCount(preProductionWeeks, DEFAULT_PHASE_WEEKS.PRE_PRODUCTION);
    const production = safeWeekCount(productionWeeks, DEFAULT_PHASE_WEEKS.PRODUCTION);
    const post = safeWeekCount(postProductionWeeks, DEFAULT_PHASE_WEEKS.POST_PRODUCTION);
    const totalWeeks = pre + production + post;
    const focusWindowWeeks = clampNumber(Math.round(totalWeeks * 0.75), 1, totalWeeks);
    const hasStartDate = Number.isFinite(Number(age)) && Number.isFinite(Number(week));

    return {
        preProductionWeeks: pre,
        productionWeeks: production,
        postProductionWeeks: post,
        totalWeeks,
        focusWindowWeeks,
        elapsedWeeks: 0,
        startedAbsoluteWeek: hasStartDate ? getAbsoluteWeek(Number(age), Number(week)) : undefined,
    };
};

export const normalizeProductionCalendar = (calendar?: Partial<ProductionCalendar>): ProductionCalendar | undefined => {
    if (!calendar || typeof calendar !== 'object') return undefined;
    const pre = safeWeekCount(calendar.preProductionWeeks, DEFAULT_PHASE_WEEKS.PRE_PRODUCTION);
    const production = safeWeekCount(calendar.productionWeeks, DEFAULT_PHASE_WEEKS.PRODUCTION);
    const post = safeWeekCount(calendar.postProductionWeeks, DEFAULT_PHASE_WEEKS.POST_PRODUCTION);
    const summedWeeks = pre + production + post;
    const totalWeeks = Math.max(summedWeeks, safeWeekCount(calendar.totalWeeks, summedWeeks));
    const focusWindowWeeks = clampNumber(
        safeWeekCount(calendar.focusWindowWeeks, Math.round(totalWeeks * 0.75)),
        1,
        totalWeeks
    );
    const elapsedWeeks = clampNumber(
        Math.round(Number(calendar.elapsedWeeks) || 0),
        0,
        totalWeeks
    );
    const startedAbsoluteWeek = Number.isFinite(Number(calendar.startedAbsoluteWeek))
        ? Number(calendar.startedAbsoluteWeek)
        : undefined;

    return {
        preProductionWeeks: pre,
        productionWeeks: production,
        postProductionWeeks: post,
        totalWeeks,
        focusWindowWeeks,
        elapsedWeeks,
        startedAbsoluteWeek,
    };
};

export const inferProductionCalendarForCommitment = (commitment: Commitment): ProductionCalendar => {
    const existing = normalizeProductionCalendar(commitment.productionCalendar);
    if (existing) return existing;

    const phase = commitment.projectPhase;
    const phaseDuration = safeWeekCount(
        commitment.totalPhaseDuration || commitment.phaseWeeksLeft,
        phase && phase in DEFAULT_PHASE_WEEKS ? DEFAULT_PHASE_WEEKS[phase as ProductionCalendarPhase] : DEFAULT_PHASE_WEEKS.PRE_PRODUCTION
    );
    const weeksLeft = Math.max(0, Math.round(Number(commitment.phaseWeeksLeft) || phaseDuration));
    const elapsedInPhase = clampNumber(phaseDuration - weeksLeft, 0, phaseDuration);

    let preProductionWeeks = DEFAULT_PHASE_WEEKS.PRE_PRODUCTION;
    let productionWeeks = DEFAULT_PHASE_WEEKS.PRODUCTION;
    let postProductionWeeks = DEFAULT_PHASE_WEEKS.POST_PRODUCTION;
    let elapsedWeeks = 0;

    if (phase === 'PRE_PRODUCTION') {
        preProductionWeeks = phaseDuration;
        elapsedWeeks = elapsedInPhase;
    } else if (phase === 'PRODUCTION') {
        productionWeeks = phaseDuration;
        elapsedWeeks = preProductionWeeks + elapsedInPhase;
    } else if (phase === 'POST_PRODUCTION') {
        postProductionWeeks = phaseDuration;
        elapsedWeeks = preProductionWeeks + productionWeeks + elapsedInPhase;
    }

    const calendar = createProductionCalendar({
        preProductionWeeks,
        productionWeeks,
        postProductionWeeks,
    });

    return {
        ...calendar,
        elapsedWeeks: clampNumber(elapsedWeeks, 0, calendar.totalWeeks),
    };
};

export const ensureProductionCalendarForCommitment = (commitment: Commitment): Commitment => ({
    ...commitment,
    productionCalendar: inferProductionCalendarForCommitment(commitment),
});

export const getProductionCalendarPhaseDuration = (
    commitment: Commitment,
    phase: ProductionCalendarPhase,
    fallback: number
): number => {
    const calendar = inferProductionCalendarForCommitment(commitment);
    return safeWeekCount(calendar[PHASE_DURATION_KEY[phase]], fallback);
};

export const advanceProductionCalendarWeek = (commitment: Commitment): Commitment => {
    if (!ACTIVE_CALENDAR_PHASES.has(commitment.projectPhase)) return commitment;
    const calendar = normalizeProductionCalendar(commitment.productionCalendar);
    if (!calendar) return commitment;
    return {
        ...commitment,
        productionCalendar: {
            ...calendar,
            elapsedWeeks: clampNumber(calendar.elapsedWeeks + 1, 0, calendar.totalWeeks),
        },
    };
};

export const getProductionCalendarProgress = (commitment: Commitment) => {
    const calendar = inferProductionCalendarForCommitment(commitment);
    const elapsedWeeks = clampNumber(calendar.elapsedWeeks, 0, calendar.totalWeeks);

    return {
        elapsedWeeks,
        projectWeek: clampNumber(elapsedWeeks + 1, 1, calendar.totalWeeks),
        totalProjectWeeks: calendar.totalWeeks,
        focusWindowWeeks: calendar.focusWindowWeeks,
        focusWeeksUsed: clampNumber(elapsedWeeks, 0, calendar.focusWindowWeeks),
        focusWeeksRemaining: Math.max(0, calendar.focusWindowWeeks - elapsedWeeks),
    };
};
