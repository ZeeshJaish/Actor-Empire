import type { GameLanguage } from '../types';
import { t } from './i18n';

interface ReleaseTimingFallback {
    currentAge?: number;
    currentWeek?: number;
    allowCurrentAgeFallback?: boolean;
}

interface ReleaseTimingOptions {
    includeWeek?: boolean;
    emptyLabel?: string;
    language?: GameLanguage;
    compact?: boolean;
}

export interface ProjectReleaseTiming {
    releaseYear?: number;
    releaseWeek?: number;
    releasedAtAbsoluteWeek?: number;
    hasExactWeek: boolean;
}

const toFiniteNumber = (value: unknown): number | undefined => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
};

const readFirstNumber = (...values: unknown[]): number | undefined => {
    for (const value of values) {
        const parsed = toFiniteNumber(value);
        if (parsed !== undefined) return parsed;
    }
    return undefined;
};

const timingFromAbsoluteWeek = (absoluteWeek: number) => ({
    releaseYear: Math.floor(absoluteWeek / 52) + 1,
    releaseWeek: (absoluteWeek % 52) + 1
});

const hasActiveReleaseShape = (project: any): boolean => Boolean(project && (
    typeof project.weekNum === 'number' ||
    typeof project.distributionPhase === 'string' ||
    project.status === 'RUNNING' ||
    project.status === 'STREAMING'
));

export const getProjectReleaseTiming = (
    project: any,
    fallback: ReleaseTimingFallback = {}
): ProjectReleaseTiming => {
    const details = project?.projectDetails || {};
    const hiddenStats = details?.hiddenStats || project?.hiddenStats || {};

    const releasedAtAbsoluteWeek = readFirstNumber(
        project?.releasedAtAbsoluteWeek,
        details?.releasedAtAbsoluteWeek,
        hiddenStats?.releasedAtAbsoluteWeek
    );

    let releaseYear = readFirstNumber(
        project?.releaseYear,
        details?.releaseYear,
        hiddenStats?.releaseYear
    );

    let releaseWeek = readFirstNumber(
        project?.releaseWeek,
        details?.releaseWeek,
        hiddenStats?.releaseWeek
    );

    if ((releaseYear === undefined || releaseWeek === undefined) && releasedAtAbsoluteWeek !== undefined) {
        const absoluteTiming = timingFromAbsoluteWeek(Math.max(0, Math.floor(releasedAtAbsoluteWeek)));
        releaseYear = releaseYear ?? absoluteTiming.releaseYear;
        releaseWeek = releaseWeek ?? absoluteTiming.releaseWeek;
    }

    const canUseCurrentAgeFallback = fallback.allowCurrentAgeFallback || hasActiveReleaseShape(project);
    releaseYear = releaseYear ?? readFirstNumber(
        project?.year,
        details?.year,
        canUseCurrentAgeFallback ? fallback.currentAge : undefined
    );

    const safeWeek = releaseWeek !== undefined && releaseWeek >= 1 && releaseWeek <= 52
        ? Math.floor(releaseWeek)
        : undefined;

    return {
        releaseYear: releaseYear !== undefined ? Math.max(1, Math.floor(releaseYear)) : undefined,
        releaseWeek: safeWeek,
        releasedAtAbsoluteWeek,
        hasExactWeek: safeWeek !== undefined
    };
};

export const getProjectReleaseLabel = (
    project: any,
    fallback: ReleaseTimingFallback = {},
    options: ReleaseTimingOptions = {}
) => {
    const timing = getProjectReleaseTiming(project, fallback);
    const language = options.language || 'en';
    if (!timing.releaseYear) return options.emptyLabel || t(language, 'release.timing.tba');

    const base = t(language, 'release.timing.age', { age: timing.releaseYear });
    if (options.includeWeek && timing.releaseWeek) {
        return options.compact
            ? t(language, 'release.timing.ageWeekCompact', { age: timing.releaseYear, week: timing.releaseWeek })
            : t(language, 'release.timing.ageWeek', { age: timing.releaseYear, week: timing.releaseWeek });
    }
    return base;
};

export const getProjectReleaseSortValue = (project: any, fallback: ReleaseTimingFallback = {}) => {
    const timing = getProjectReleaseTiming(project, fallback);
    if (!timing.releaseYear) return 0;
    return (timing.releaseYear * 60) + (timing.releaseWeek || 0);
};
