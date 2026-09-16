import { useEffect, useMemo, useState } from 'react';
import type {
    RegionMapLocationPin,
    RegionMapLocationRoute,
} from '../../../../services/regionMap';
import {
    WORLD_VIEW,
    countryView,
    regionView,
    type RegionMapCinematicOptions,
    type RegionMapView,
} from './regionMapView';

export interface RegionMapCinematicFrame {
    atMs: number;
    view: RegionMapView;
    visiblePinIds: string[];
    visibleRouteIds: string[];
    complete: boolean;
}

export interface RegionMapCinematicTimeline {
    durationMs: number;
    frames: RegionMapCinematicFrame[];
}

export interface ActiveRegionMapCinematicFrame extends RegionMapCinematicFrame {
    frameIndex: number;
    reducedMotion: boolean;
}

const routeId = (route: RegionMapLocationRoute): string => `${route.fromId}->${route.toId}`;

const focusViewForPin = (pin: RegionMapLocationPin): RegionMapView => {
    if (pin.countryId) return countryView(pin.countryId, pin.regionId);
    if (pin.regionId) return regionView(pin.regionId);
    return WORLD_VIEW;
};

export const createRegionMapCinematicTimeline = (
    pins: readonly RegionMapLocationPin[],
    routes: readonly RegionMapLocationRoute[],
    requestedDurationMs = 4_800,
): RegionMapCinematicTimeline => {
    const durationMs = Math.max(1, Math.round(requestedDurationMs));
    const intervalMs = durationMs / (pins.length + 1);
    const frames: RegionMapCinematicFrame[] = [{
        atMs: 0,
        view: WORLD_VIEW,
        visiblePinIds: [],
        visibleRouteIds: [],
        complete: false,
    }];

    pins.forEach((pin, index) => {
        const visiblePinIds = pins.slice(0, index + 1).map(candidate => candidate.id);
        const visiblePinSet = new Set(visiblePinIds);
        frames.push({
            atMs: Math.round(intervalMs * (index + 1)),
            view: focusViewForPin(pin),
            visiblePinIds,
            visibleRouteIds: routes
                .filter(route => visiblePinSet.has(route.fromId) && visiblePinSet.has(route.toId))
                .map(routeId),
            complete: false,
        });
    });

    frames.push({
        atMs: durationMs,
        view: WORLD_VIEW,
        visiblePinIds: pins.map(pin => pin.id),
        visibleRouteIds: routes.map(routeId),
        complete: true,
    });

    return { durationMs, frames };
};

export const resolveRegionMapCinematicFrame = (
    timeline: RegionMapCinematicTimeline,
    elapsedMs: number,
    reducedMotion = false,
): RegionMapCinematicFrame => {
    if (reducedMotion) return timeline.frames[timeline.frames.length - 1];
    const safeElapsedMs = Math.max(0, elapsedMs);
    for (let index = timeline.frames.length - 1; index >= 0; index -= 1) {
        if (safeElapsedMs >= timeline.frames[index].atMs) return timeline.frames[index];
    }
    return timeline.frames[0];
};

const systemPrefersReducedMotion = (): boolean => (
    typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
);

export const useRegionMapCinematicFrame = (
    timeline: RegionMapCinematicTimeline,
    options: RegionMapCinematicOptions = {},
    enabled = true,
): ActiveRegionMapCinematicFrame => {
    const reducedMotion = options.reducedMotion ?? systemPrefersReducedMotion();
    const [frame, setFrame] = useState(() => resolveRegionMapCinematicFrame(timeline, 0, reducedMotion));

    useEffect(() => {
        if (!enabled) return;
        const startedAt = Date.now();
        let timeoutId: ReturnType<typeof setTimeout> | undefined;

        const update = () => {
            const nextFrame = resolveRegionMapCinematicFrame(timeline, Date.now() - startedAt, reducedMotion);
            setFrame(nextFrame);
            if (nextFrame.complete || reducedMotion) return;
            const nextIndex = timeline.frames.indexOf(nextFrame) + 1;
            const nextAtMs = timeline.frames[nextIndex]?.atMs ?? timeline.durationMs;
            timeoutId = setTimeout(update, Math.max(1, nextAtMs - (Date.now() - startedAt)));
        };

        update();
        const resumeFromElapsedTime = () => {
            if (document.visibilityState === 'visible') {
                if (timeoutId) clearTimeout(timeoutId);
                update();
            }
        };
        document.addEventListener('visibilitychange', resumeFromElapsedTime);
        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            document.removeEventListener('visibilitychange', resumeFromElapsedTime);
        };
    }, [enabled, options.replayKey, reducedMotion, timeline]);

    return useMemo(() => ({
        ...frame,
        frameIndex: timeline.frames.indexOf(frame),
        reducedMotion,
    }), [frame, reducedMotion, timeline.frames]);
};
