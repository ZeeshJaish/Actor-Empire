interface ReleaseTimingFallback {
    currentAge?: number;
    currentWeek?: number;
}

interface ReleaseTimingOptions {
    includeWeek?: boolean;
    emptyLabel?: string;
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

    releaseYear = releaseYear ?? readFirstNumber(project?.year, details?.year, fallback.currentAge);

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
    if (!timing.releaseYear) return options.emptyLabel || 'Release TBA';

    const base = `Age ${timing.releaseYear}`;
    if (options.includeWeek && timing.releaseWeek) {
        return `${base}, Week ${timing.releaseWeek}`;
    }
    return base;
};

export const getProjectReleaseSortValue = (project: any, fallback: ReleaseTimingFallback = {}) => {
    const timing = getProjectReleaseTiming(project, fallback);
    if (!timing.releaseYear) return 0;
    return (timing.releaseYear * 60) + (timing.releaseWeek || 0);
};
