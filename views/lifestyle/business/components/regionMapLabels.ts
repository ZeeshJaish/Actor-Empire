import type { RegionMapLocationPin } from '../../../../services/regionMap';
import type { RegionMapLevel } from './regionMapView';

export interface RegionMapPinLabelCandidate {
    id: string;
    point: [number, number];
    pin: RegionMapLocationPin;
}

const STATE_PRIORITY: Record<NonNullable<RegionMapLocationPin['state']>, number> = {
    idle: 100,
    recommended: 300,
    planned: 400,
    built: 500,
    active: 700,
};

export const regionMapPinPriority = (pin: RegionMapLocationPin): number => {
    if (pin.selected) return 1_000;
    if (pin.state === 'active') return 700;
    if (pin.variant === 'origin') return 600;
    return STATE_PRIORITY[pin.state ?? 'idle'] + (pin.market ? 25 : 0);
};

const MINIMUM_LABEL_DISTANCE: Record<RegionMapLevel, number> = {
    world: 78,
    region: 42,
    country: 27,
};

/**
 * Selects text labels only. Pin dots and their hit areas remain untouched.
 * Input order breaks equal-priority ties so every result is deterministic.
 */
export const selectRegionMapPinLabelIds = (
    candidates: readonly RegionMapPinLabelCandidate[],
    level: RegionMapLevel,
): string[] => {
    const minimumDistance = MINIMUM_LABEL_DISTANCE[level];
    const accepted: RegionMapPinLabelCandidate[] = [];
    const ranked = candidates
        .map((candidate, index) => ({ candidate, index }))
        .sort((a, b) => regionMapPinPriority(b.candidate.pin) - regionMapPinPriority(a.candidate.pin) || a.index - b.index);

    ranked.forEach(({ candidate }) => {
        const collides = accepted.some(existing => (
            Math.hypot(candidate.point[0] - existing.point[0], candidate.point[1] - existing.point[1]) < minimumDistance
        ));
        if (candidate.pin.selected || !collides) accepted.push(candidate);
    });

    return accepted.map(candidate => candidate.id);
};
