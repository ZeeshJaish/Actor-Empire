import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type React from 'react';

/** x' = x + k·px, y' = y + k·py, in map units. */
export interface ViewTransform {
    k: number;
    x: number;
    y: number;
}

export const IDENTITY_TRANSFORM: ViewTransform = { k: 1, x: 0, y: 0 };

export const applyTransform = (transform: ViewTransform, point: [number, number]): [number, number] => [
    transform.x + transform.k * point[0],
    transform.y + transform.k * point[1],
];

export type MapBounds = [[number, number], [number, number]];

export interface MapViewportFrame {
    width: number;
    height: number;
    originY: number;
    minScale: number;
    maxScale: number;
}

interface MapBoundsFitFrame extends MapViewportFrame {
    boundsMaxScale: number;
    /** Fraction of the viewport the fitted bounds should occupy. */
    fillRatio?: number;
}

export const clampMapTransform = (
    next: ViewTransform,
    { width, height, originY, minScale, maxScale }: MapViewportFrame,
): ViewTransform => {
    const k = Math.min(maxScale, Math.max(minScale, next.k));
    const minX = width - k * width;
    const bottom = originY + height;
    const minY = bottom - k * bottom;
    const maxY = originY - k * originY;
    return {
        k,
        x: Math.min(0, Math.max(minX, next.x)),
        y: Math.min(maxY, Math.max(minY, next.y)),
    };
};

export const fitMapBoundsTransform = (
    bounds: MapBounds,
    frame: MapBoundsFitFrame,
): ViewTransform => {
    const [[x0, y0], [x1, y1]] = bounds;
    const spanX = Math.max(1, x1 - x0) / frame.width;
    const spanY = Math.max(1, y1 - y0) / frame.height;
    const fillRatio = frame.fillRatio ?? 0.78;
    const k = Math.max(
        frame.minScale,
        Math.min(frame.boundsMaxScale, frame.maxScale, fillRatio / Math.max(spanX, spanY)),
    );
    const centreX = frame.width / 2;
    const centreY = frame.originY + frame.height / 2;
    return clampMapTransform({
        k,
        x: centreX - k * (x0 + x1) / 2,
        y: centreY - k * (y0 + y1) / 2,
    }, frame);
};

/** Keep an identity-scale tap on its country/region path; capture only real map gestures. */
export const shouldCaptureMapPointer = (pointerCount: number, scale: number): boolean => (
    pointerCount >= 2 || scale > 1.01
);

interface UseMapViewportOptions {
    /** Map units the content spans horizontally. */
    width: number;
    /** Map units the frame spans vertically. */
    height: number;
    /** Top of the frame in map units (negative when the frame is taller than the base map). */
    originY: number;
    minScale?: number;
    maxScale?: number;
    /** When false, gestures are ignored and the transform stays at identity. */
    enabled: boolean;
    /** Milliseconds for programmatic flights. */
    duration?: number;
}

export interface MapViewport {
    transform: ViewTransform;
    /** The scale the current or pending flight ends at. Use it to size things that must not scale with the map. */
    targetScale: number;
    fitBounds: (bounds: MapBounds, maxScale: number, fillRatio?: number) => void;
    reset: () => void;
    /** Spread onto the <svg>. */
    handlers: {
        onPointerDown: React.PointerEventHandler<SVGSVGElement>;
        onPointerMove: React.PointerEventHandler<SVGSVGElement>;
        onPointerUp: React.PointerEventHandler<SVGSVGElement>;
        onPointerCancel: React.PointerEventHandler<SVGSVGElement>;
        onWheel: React.WheelEventHandler<SVGSVGElement>;
    };
}

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const prefersReducedMotion = (): boolean => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
        ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
        : false
);

/**
 * Pan, pinch and fly-to for an SVG map, without d3-zoom. React owns the DOM; this hook owns
 * one transform and keeps it inside the frame.
 */
export function useMapViewport({
    width,
    height,
    originY,
    minScale = 1,
    maxScale = 16,
    enabled,
    duration = 720,
}: UseMapViewportOptions): MapViewport {
    const [transform, setTransform] = useState<ViewTransform>(IDENTITY_TRANSFORM);
    const transformRef = useRef<ViewTransform>(IDENTITY_TRANSFORM);
    const targetRef = useRef<ViewTransform>(IDENTITY_TRANSFORM);
    const frameRef = useRef<number | null>(null);
    const pointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
    const gestureRef = useRef<{ transform: ViewTransform; distance: number; centre: [number, number] } | null>(null);

    const clamp = useCallback((next: ViewTransform): ViewTransform => {
        return clampMapTransform(next, { width, height, originY, minScale, maxScale });
    }, [width, height, originY, minScale, maxScale]);

    const commit = useCallback((next: ViewTransform) => {
        const clamped = clamp(next);
        transformRef.current = clamped;
        setTransform(clamped);
    }, [clamp]);

    const stopAnimation = useCallback(() => {
        if (frameRef.current !== null && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
    }, []);

    const animateTo = useCallback((target: ViewTransform) => {
        stopAnimation();
        const to = clamp(target);
        targetRef.current = to;
        const from = transformRef.current;
        const total = prefersReducedMotion() ? 0 : duration;
        // Hidden tabs pause requestAnimationFrame; a game coming back from the background should
        // land on the target, not on a half-finished flight.
        const hidden = typeof document !== 'undefined' && document.hidden;
        if (total === 0 || hidden || typeof requestAnimationFrame !== 'function') { commit(to); return; }
        const start = performance.now();
        const logFrom = Math.log(from.k);
        const logTo = Math.log(to.k);
        const step = (now: number) => {
            const progress = Math.min(1, (now - start) / total);
            const eased = easeInOutCubic(progress);
            const k = Math.exp(logFrom + (logTo - logFrom) * eased);
            commit({ k, x: from.x + (to.x - from.x) * eased, y: from.y + (to.y - from.y) * eased });
            if (progress < 1) frameRef.current = requestAnimationFrame(step);
            else { frameRef.current = null; commit(to); }
        };
        frameRef.current = requestAnimationFrame(step);
    }, [clamp, commit, duration, stopAnimation]);

    const fitBounds = useCallback((bounds: MapBounds, boundsMaxScale: number, fillRatio?: number) => {
        animateTo(fitMapBoundsTransform(bounds, {
            width,
            height,
            originY,
            minScale,
            maxScale,
            boundsMaxScale,
            fillRatio,
        }));
    }, [animateTo, width, height, originY, minScale, maxScale]);

    const reset = useCallback(() => animateTo(IDENTITY_TRANSFORM), [animateTo]);

    useEffect(() => {
        if (!enabled) { stopAnimation(); targetRef.current = IDENTITY_TRANSFORM; commit(IDENTITY_TRANSFORM); }
    }, [enabled, commit, stopAnimation]);

    useEffect(() => () => stopAnimation(), [stopAnimation]);

    /** Client pixels → map units, using the SVG's rendered size. */
    const toMapUnits = (svg: SVGSVGElement, clientX: number, clientY: number): [number, number] => {
        const rect = svg.getBoundingClientRect();
        const scale = rect.width / width || 1;
        return [(clientX - rect.left) / scale, originY + (clientY - rect.top) / scale];
    };

    const handlers = useMemo<MapViewport['handlers']>(() => ({
        onPointerDown: event => {
            if (!enabled) return;
            const svg = event.currentTarget;
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const pointers = [...pointersRef.current.values()];
            if (shouldCaptureMapPointer(pointers.length, transformRef.current.k)) {
                pointersRef.current.forEach((_, pointerId) => {
                    try { svg.setPointerCapture(pointerId); } catch { /* not all targets allow capture */ }
                });
            }
            if (pointers.length === 1 && transformRef.current.k > 1.01) {
                stopAnimation();
                gestureRef.current = { transform: transformRef.current, distance: 0, centre: toMapUnits(svg, pointers[0].x, pointers[0].y) };
            } else if (pointers.length === 2) {
                stopAnimation();
                const [a, b] = pointers;
                const centre = toMapUnits(svg, (a.x + b.x) / 2, (a.y + b.y) / 2);
                gestureRef.current = { transform: transformRef.current, distance: Math.hypot(a.x - b.x, a.y - b.y) || 1, centre };
            }
        },
        onPointerMove: event => {
            if (!enabled || !pointersRef.current.has(event.pointerId)) return;
            pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
            const gesture = gestureRef.current;
            if (!gesture) return;
            const svg = event.currentTarget;
            const pointers = [...pointersRef.current.values()];
            const base = gesture.transform;
            if (pointers.length === 1) {
                const now = toMapUnits(svg, pointers[0].x, pointers[0].y);
                commit({ k: base.k, x: base.x + (now[0] - gesture.centre[0]), y: base.y + (now[1] - gesture.centre[1]) });
            } else if (pointers.length >= 2) {
                const [a, b] = pointers;
                const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
                const k = Math.min(maxScale, Math.max(minScale, base.k * (distance / gesture.distance)));
                const centre = toMapUnits(svg, (a.x + b.x) / 2, (a.y + b.y) / 2);
                // Keep the map point that was under the gesture centre under it.
                const mapPoint: [number, number] = [(gesture.centre[0] - base.x) / base.k, (gesture.centre[1] - base.y) / base.k];
                commit({ k, x: centre[0] - k * mapPoint[0], y: centre[1] - k * mapPoint[1] });
            }
            targetRef.current = transformRef.current;
        },
        onPointerUp: event => {
            pointersRef.current.delete(event.pointerId);
            try { event.currentTarget.releasePointerCapture(event.pointerId); } catch { /* ignore */ }
            const remaining = [...pointersRef.current.values()];
            if (remaining.length === 0) gestureRef.current = null;
            else if (remaining.length === 1 && transformRef.current.k > 1.01) {
                gestureRef.current = { transform: transformRef.current, distance: 0, centre: toMapUnits(event.currentTarget, remaining[0].x, remaining[0].y) };
            }
        },
        onPointerCancel: event => {
            pointersRef.current.delete(event.pointerId);
            if (pointersRef.current.size === 0) gestureRef.current = null;
        },
        onWheel: event => {
            // Trackpad pinch arrives as ctrl+wheel. Plain wheel keeps scrolling the page.
            if (!enabled || !(event.ctrlKey || event.metaKey)) return;
            event.preventDefault();
            stopAnimation();
            const svg = event.currentTarget;
            const base = transformRef.current;
            const k = Math.min(maxScale, Math.max(minScale, base.k * Math.exp(-event.deltaY * 0.002)));
            const cursor = toMapUnits(svg, event.clientX, event.clientY);
            const mapPoint: [number, number] = [(cursor[0] - base.x) / base.k, (cursor[1] - base.y) / base.k];
            commit({ k, x: cursor[0] - k * mapPoint[0], y: cursor[1] - k * mapPoint[1] });
            targetRef.current = transformRef.current;
        },
    // toMapUnits reads only stable options.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }), [enabled, commit, stopAnimation, minScale, maxScale, width, originY]);

    return {
        transform,
        targetScale: targetRef.current.k,
        fitBounds,
        reset,
        handlers,
    };
}
