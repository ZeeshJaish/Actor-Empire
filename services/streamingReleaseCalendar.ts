import type { Player } from '../types';
import { getForbesStreamingCompanies } from './streamingPlatformEcosystem';

export interface StreamingPlatformCalendarEntry {
    platformId: string;
    platformName: string;
    weeklyCapacity: number;
    occupiedByWeek: Record<number, number>;
}

export interface StreamingPlatformLaunchCalendar {
    fromAbsoluteWeek: number;
    platforms: Record<string, StreamingPlatformCalendarEntry>;
}

export const getStreamingWeeklyPremiereCapacity = (subscribersMillions: number): number => {
    const subscribers = Math.max(0, Number(subscribersMillions) || 0);
    if (subscribers >= 150) return 4;
    if (subscribers >= 75) return 3;
    if (subscribers >= 25) return 2;
    return 1;
};

export const buildStreamingPlatformLaunchCalendar = (
    player: Pick<Player, 'world'>,
    fromAbsoluteWeek: number,
): StreamingPlatformLaunchCalendar => {
    const platforms = Object.fromEntries(
        getForbesStreamingCompanies(player)
            .filter(company => company.kind !== 'PLAYER' && company.lifecycle !== 'CLOSED' && company.lifecycle !== 'ACQUIRED')
            .map(company => [
                company.id,
                {
                    platformId: company.id,
                    platformName: company.name,
                    weeklyCapacity: getStreamingWeeklyPremiereCapacity(company.subscribersMillions || 0),
                    occupiedByWeek: {},
                } satisfies StreamingPlatformCalendarEntry,
            ]),
    );
    const occupiedTitles = new Set<string>();

    const occupy = (platformId: string | null | undefined, absoluteWeek: number, sourceProjectId: string): void => {
        const entry = platformId ? platforms[platformId] : undefined;
        const week = Math.round(Number(absoluteWeek));
        if (!entry || !Number.isFinite(week) || week < fromAbsoluteWeek) return;
        const key = `${platformId}:${week}:${sourceProjectId}`;
        if (occupiedTitles.has(key)) return;
        occupiedTitles.add(key);
        entry.occupiedByWeek[week] = (entry.occupiedByWeek[week] || 0) + 1;
    };

    for (const contract of Object.values(player.world.streamingRightsContracts || {})) {
        if (contract.status !== 'ACTIVE') continue;
        occupy(contract.buyer.platformId, contract.startsAtAbsoluteWeek, contract.sourceProjectId);
    }

    for (const project of player.world.projects || []) {
        for (const window of project.streamingWindows || []) {
            occupy(window.platformId, window.startsAtAbsoluteWeek, project.id);
        }
    }

    for (const [platformId, platform] of Object.entries(player.world.platforms || {})) {
        for (const plan of platform.ai?.slate || []) {
            for (const release of plan.releaseEntries || []) {
                occupy(platformId, release.premiereAtAbsoluteWeek, release.sourceProjectId || release.canonicalProjectId);
            }
        }
    }

    return { fromAbsoluteWeek, platforms };
};

export const getStreamingPlatformAvailablePremiereWeeks = (
    calendar: StreamingPlatformLaunchCalendar,
    platformId: string,
    fromAbsoluteWeek: number,
    searchWeeks = 12,
): number[] => {
    const platform = calendar.platforms[platformId];
    if (!platform) return [];
    const start = Math.max(calendar.fromAbsoluteWeek, Math.round(fromAbsoluteWeek));
    const length = Math.max(0, Math.round(searchWeeks));
    return Array.from({ length }, (_, offset) => start + offset)
        .filter(week => (platform.occupiedByWeek[week] || 0) < platform.weeklyCapacity);
};

export const findStreamingPlatformPremiereWeek = (
    calendar: StreamingPlatformLaunchCalendar,
    platformId: string,
    fromAbsoluteWeek: number,
    searchWeeks = 12,
): number | null => (
    getStreamingPlatformAvailablePremiereWeeks(calendar, platformId, fromAbsoluteWeek, searchWeeks)[0] ?? null
);
