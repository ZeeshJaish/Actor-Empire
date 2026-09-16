import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { BoxOfficeRegionId } from '../../../../types';
import {
    ASSIGNED_COUNTRY_IDS,
    REGION_MAP_OVERLAYS,
    getRegionIdForCountry,
    getRegionMapSummary,
    type RegionMapLocationPin,
    type RegionMapLocationRoute,
} from '../../../../services/regionMap';
import {
    MAP_BASE_HEIGHT,
    MAP_WIDTH,
    WORLD_BORDERS_PATH,
    WORLD_COUNTRY_NUMERIC_BY_ALPHA2,
    WORLD_GRATICULE_PATH,
    WORLD_LAND_PATH,
    WORLD_SHELF_PATH,
    boundsForCountry,
    boundsForLonLatBox,
    countryDisplayName,
    getCountryLabelPoint,
    getCountryPath,
    getRegionGeometry,
    getUnassignedLandPath,
    hasCountry,
    projectLonLat,
} from './worldMapDetailedGeometry';
import {
    IDENTITY_TRANSFORM,
    applyTransform,
    fitMapBoundsTransform,
    useMapViewport,
} from './useMapViewport';
import {
    createRegionMapCinematicTimeline,
    useRegionMapCinematicFrame,
} from './regionMapCinematic';
import { selectRegionMapPinLabelIds } from './regionMapLabels';
import {
    WORLD_VIEW,
    resolveRegionMapCountryTap,
    resolveRegionMapRegionTap,
    type DrilldownRegionSelection,
    type InteractiveRegionMapProps,
    type MaximumRegionMapViewLevel,
    type RegionMapLevel,
    type RegionMapView,
} from './regionMapView';
import './interactiveRegionMap.css';

export type { RegionMapLocationPin, RegionMapLocationRoute } from '../../../../services/regionMap';

export type { InteractiveRegionMapProps, RegionMapLevel, RegionMapView } from './regionMapView';
export { WORLD_VIEW, countryView, parentView, regionView } from './regionMapView';

const readableRegionName = (regionId: BoxOfficeRegionId, label: string): string => (
    label.trim() || regionId.toLowerCase().split('_').map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
);

const arcPath = (from: [number, number], to: [number, number]): string => {
    const dx = to[0] - from[0];
    const dy = to[1] - from[1];
    const distance = Math.hypot(dx, dy) || 1;
    let normalX = -dy / distance;
    let normalY = dx / distance;
    if (normalY > 0) { normalX = -normalX; normalY = -normalY; }
    const lift = Math.min(distance * 0.22, 90);
    const middleX = (from[0] + to[0]) / 2 + normalX * lift;
    const middleY = (from[1] + to[1]) / 2 + normalY * lift;
    return `M${from[0].toFixed(1)},${from[1].toFixed(1)} Q${middleX.toFixed(1)},${middleY.toFixed(1)} ${to[0].toFixed(1)},${to[1].toFixed(1)}`;
};

const activateOnKey = (action: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        action();
    }
};

interface ResolvedPin {
    pin: RegionMapLocationPin;
    countryId?: string;
    regionId?: BoxOfficeRegionId;
    point: [number, number];
}

const MAP_LEVEL_RANK: Record<RegionMapLevel, number> = { world: 0, region: 1, country: 2 };
const SHORT_COUNTRY_NAME: Record<string, string> = { '826': 'UK', '840': 'USA', '784': 'UAE' };
const LANDMARK_COUNTRY_IDS = new Set([
    '840', '124', '484',
    '076', '032',
    '826', '250', '276', '380', '724',
    '356', '156', '392', '410', '360',
    '710', '818', '566',
    '036', '554',
]);

export const InteractiveRegionMapV2: React.FC<InteractiveRegionMapProps> = ({
    selectedRegionIds,
    marketRegionIds = [],
    warningRegionIds = [],
    activeRegionId = null,
    onSelectRegion,
    locationPins = [],
    locationRoutes = [],
    onSelectLocation,
    accentColor = '#6d4aff',
    visualTone = 'release',
    compact = false,
    showPreview = true,
    ariaLabel = 'Interactive box office release region map',
    interaction = 'toggle',
    cinematic,
    drilldownRegionSelection = 'navigate' as DrilldownRegionSelection,
    maximumViewLevel = 'country' as MaximumRegionMapViewLevel,
    minimumPinViewLevel = 'world',
    showSelectedPinsAcrossViews = false,
    focusedLocationId = null,
    view: controlledView,
    defaultView = WORLD_VIEW,
    onViewChange,
    frameHeight,
    showRegionTints = true,
    showRoutes = true,
    showGraticule = true,
    showBorders = true,
    showWorldRegionLabels = true,
    showBreadcrumb = true,
    showCountryLabels = true,
    emphasizeFocusedCountry = false,
    highlightMappedCountries = true,
    showCountryFocus = true,
    showShelf = true,
    showRelief = true,
    className = '',
}) => {
    const drilldown = interaction === 'drilldown';
    const cinematicMode = interaction === 'cinematic';
    const viewportActive = drilldown || cinematicMode;
    const cinematicTimeline = useMemo(
        () => createRegionMapCinematicTimeline(locationPins, locationRoutes, cinematic?.durationMs),
        [cinematic?.durationMs, locationPins, locationRoutes],
    );
    const cinematicFrame = useRegionMapCinematicFrame(cinematicTimeline, cinematic, cinematicMode);
    const visiblePinIdSet = useMemo(
        () => new Set(cinematicFrame.visiblePinIds),
        [cinematicFrame.visiblePinIds],
    );
    const visibleRouteIdSet = useMemo(
        () => new Set(cinematicFrame.visibleRouteIds),
        [cinematicFrame.visibleRouteIds],
    );
    const presentedLocationPins = cinematicMode
        ? locationPins.filter(pin => visiblePinIdSet.has(pin.id))
        : locationPins;
    const presentedLocationRoutes = cinematicMode
        ? locationRoutes.filter(route => visibleRouteIdSet.has(`${route.fromId}->${route.toId}`))
        : locationRoutes;
    const isProduction = visualTone === 'production';
    const mapInstanceId = useId().replace(/[:]/g, '');
    const svgIds = {
        ocean: `irm-ocean-${mapInstanceId}`,
        vignette: `irm-vignette-${mapInstanceId}`,
        land: `irm-land-${mapInstanceId}`,
        gloss: `irm-gloss-${mapInstanceId}`,
        glow: `irm-glow-${mapInstanceId}`,
        frame: `irm-frame-${mapInstanceId}`,
    };

    const height = frameHeight ?? (viewportActive ? 720 : MAP_BASE_HEIGHT);
    const originY = -(height - MAP_BASE_HEIGHT) / 2;
    const [internalView, setInternalView] = useState<RegionMapView>(defaultView);
    const view = cinematicMode ? cinematicFrame.view : controlledView ?? internalView;
    const navigate = useCallback((next: RegionMapView) => {
        if (!controlledView) setInternalView(next);
        onViewChange?.(next);
    }, [controlledView, onViewChange]);
    const level: RegionMapLevel = viewportActive ? view.level : 'world';
    const focusRegionId = level === 'world' ? null : view.regionId;
    const focusCountryId = level === 'country' ? view.countryId : null;

    const viewport = useMapViewport({ width: MAP_WIDTH, height, originY, enabled: viewportActive, maxScale: 16 });
    const { fitBounds, reset, transform } = viewport;
    const svgRef = useRef<SVGSVGElement>(null);
    const [pixelScale, setPixelScale] = useState(0.39);
    const [hoveredCountryId, setHoveredCountryId] = useState<string | null>(null);
    useLayoutEffect(() => {
        const svg = svgRef.current;
        if (!svg) return undefined;
        const measure = () => {
            const renderedWidth = svg.getBoundingClientRect().width;
            if (renderedWidth > 0) setPixelScale(renderedWidth / MAP_WIDTH);
        };
        measure();
        if (typeof ResizeObserver === 'undefined') return undefined;
        const observer = new ResizeObserver(measure);
        observer.observe(svg);
        return () => observer.disconnect();
    }, []);
    useEffect(() => {
        if (!viewportActive) return;
        if (level === 'world') { reset(); return; }
        if (level === 'region' && focusRegionId) {
            const region = REGION_MAP_OVERLAYS.find(entry => entry.id === focusRegionId);
            if (region) fitBounds(boundsForLonLatBox(region.fitBox), 6, 0.88);
            return;
        }
        if (level === 'country' && focusCountryId) fitBounds(boundsForCountry(focusCountryId), 12, 0.88);
    }, [fitBounds, focusCountryId, focusRegionId, level, reset, viewportActive]);

    const selectedRegionSet = useMemo(() => new Set(selectedRegionIds), [selectedRegionIds]);
    const marketRegionSet = useMemo(() => new Set(marketRegionIds), [marketRegionIds]);
    const warningRegionSet = useMemo(() => new Set(warningRegionIds), [warningRegionIds]);
    const summary = useMemo(() => getRegionMapSummary(selectedRegionIds), [selectedRegionIds]);
    const regions = useMemo(() => REGION_MAP_OVERLAYS.map(region => {
        const geometry = getRegionGeometry(region.countryIds);
        return { ...region, ...geometry };
    }), []);
    const unassignedLandPath = useMemo(() => getUnassignedLandPath(ASSIGNED_COUNTRY_IDS), []);
    const pins = useMemo<ResolvedPin[]>(() => presentedLocationPins.flatMap(pin => {
        const countryId = pin.countryId ?? (pin.countryCode ? WORLD_COUNTRY_NUMERIC_BY_ALPHA2[pin.countryCode.toUpperCase()] : undefined);
        const regionId = pin.regionId ?? getRegionIdForCountry(countryId);
        const projected = typeof pin.longitude === 'number' && typeof pin.latitude === 'number'
            ? projectLonLat(pin.longitude, pin.latitude)
            : null;
        const point = projected ?? [pin.x * 10, pin.y * 5] as [number, number];
        return Number.isFinite(point[0]) && Number.isFinite(point[1]) ? [{ pin, countryId, regionId, point }] : [];
    }), [presentedLocationPins]);
    const pinById = useMemo(() => new Map(pins.map(pin => [pin.pin.id, pin])), [pins]);
    const focusedLocation = focusedLocationId ? pinById.get(focusedLocationId) : undefined;
    const focusedLocationPin = focusedLocation?.pin;
    const focusedRegionLocationPin = level === 'region' && focusedLocation?.regionId === focusRegionId
        ? focusedLocation.pin
        : undefined;
    const routes = useMemo(() => presentedLocationRoutes.flatMap(route => {
        const from = pinById.get(route.fromId);
        const to = pinById.get(route.toId);
        return from && to ? [{ from, to, route }] : [];
    }), [pinById, presentedLocationRoutes]);
    const focusRegion = focusRegionId ? regions.find(region => region.id === focusRegionId) : undefined;
    const focusRegionName = focusRegion ? readableRegionName(focusRegion.id, focusRegion.label) : '';
    const focusCountries = useMemo(
        () => (focusRegion ? focusRegion.countryIds.filter(hasCountry) : []),
        [focusRegion],
    );
    const labelPlacementTransform = useMemo(() => {
        const frame = { width: MAP_WIDTH, height, originY, minScale: 1, maxScale: 16 };
        if (level === 'region' && focusRegion) {
            return fitMapBoundsTransform(boundsForLonLatBox(focusRegion.fitBox), {
                ...frame,
                boundsMaxScale: 6,
                fillRatio: 0.88,
            });
        }
        if (level === 'country' && focusCountryId) {
            return fitMapBoundsTransform(boundsForCountry(focusCountryId), {
                ...frame,
                boundsMaxScale: 12,
                fillRatio: 0.88,
            });
        }
        return IDENTITY_TRANSFORM;
    }, [focusCountryId, focusRegion, height, level, originY]);
    const viewAllowsPins = MAP_LEVEL_RANK[level] >= MAP_LEVEL_RANK[minimumPinViewLevel];
    const visiblePins = useMemo(() => {
        return pins
            .filter(({ pin, regionId, countryId }) => {
                if (!viewAllowsPins && !(showSelectedPinsAcrossViews && pin.selected)) return false;
                return level === 'world'
                    || (level === 'region' && regionId === focusRegionId)
                    || (level === 'country' && countryId === focusCountryId);
            })
            .map(resolved => ({ ...resolved, screenPoint: applyTransform(transform, resolved.point) }));
    }, [focusCountryId, focusRegionId, level, pins, showSelectedPinsAcrossViews, transform, viewAllowsPins]);
    const pinLabelIds = useMemo(() => {
        if (!viewAllowsPins) return new Set<string>();
        if (level === 'country' && focusedLocationId) {
            return new Set(visiblePins.some(({ pin }) => pin.id === focusedLocationId) ? [focusedLocationId] : []);
        }
        return new Set(selectRegionMapPinLabelIds(visiblePins.map(({ pin, screenPoint }) => ({
            id: pin.id,
            point: [screenPoint[0] * pixelScale, (screenPoint[1] - originY) * pixelScale] as [number, number],
            pin,
        })), level));
    }, [focusedLocationId, level, originY, pixelScale, viewAllowsPins, visiblePins]);
    const focusedVisiblePin = focusedLocationId
        ? visiblePins.find(({ pin }) => pin.id === focusedLocationId)
        : undefined;
    const countryLabelIds = useMemo(() => new Set(selectRegionMapPinLabelIds(
        focusCountries.flatMap(countryId => {
            const point = getCountryLabelPoint(countryId);
            if (!point) return [];
            const screenPoint = applyTransform(transform, point);
            const hasContent = pins.some(pin => pin.countryId === countryId);
            const pinned = countryId === focusCountryId
                || countryId === hoveredCountryId
                || hasContent
                || LANDMARK_COUNTRY_IDS.has(countryId);
            return [{
                id: countryId,
                point: [screenPoint[0] * pixelScale, (screenPoint[1] - originY) * pixelScale] as [number, number],
                pin: {
                    id: countryId,
                    name: countryDisplayName(countryId),
                    x: 0,
                    y: 0,
                    selected: pinned,
                    state: hasContent ? 'built' as const : 'idle' as const,
                },
            }];
        }),
        level === 'country' ? 'country' : 'region',
    )), [focusCountries, focusCountryId, hoveredCountryId, level, originY, pins, pixelScale, transform]);

    const handleRegionTap = (regionId: BoxOfficeRegionId) => {
        if (cinematicMode) return;
        if (!drilldown) {
            onSelectRegion?.(regionId);
            return;
        }
        const resolution = resolveRegionMapRegionTap(regionId, drilldownRegionSelection);
        if (resolution.shouldSelectRegion) onSelectRegion?.(regionId);
        navigate(resolution.nextView);
    };
    const handleCountryTap = (countryId: string) => {
        if (!drilldown || cinematicMode) return;
        navigate(resolveRegionMapCountryTap(view, countryId, maximumViewLevel));
    };

    const footprintLabel = summary.regionCount >= 5
        ? 'worldwide footprint'
        : summary.regionCount >= 3
            ? 'wide footprint'
            : summary.regionCount > 0 ? 'focused footprint' : '';
    const shellClass = isProduction
        ? 'border-slate-500/35 bg-[#0a0f18] shadow-lg shadow-black/25'
        : 'border-amber-200/25 bg-sky-950/25 shadow-2xl shadow-sky-950/40';

    return (
        <div
            className={`interactive-region-map relative rounded-[1.7rem] border p-3 ${shellClass}${cinematicMode ? ' irm-cinematic' : ''} ${className}`}
            data-cinematic-frame={cinematicMode ? cinematicFrame.frameIndex : undefined}
            data-cinematic-complete={cinematicMode ? cinematicFrame.complete : undefined}
            data-visible-pin-count={cinematicMode ? pins.length : undefined}
            data-visible-route-count={cinematicMode ? routes.length : undefined}
            data-pin-label-count={pinLabelIds.size}
            data-country-label-count={level === 'world' ? undefined : countryLabelIds.size}
        >
            {showBreadcrumb && drilldown && level !== 'world' && (
                <nav
                    className="irm-breadcrumb"
                    aria-label="Map location breadcrumb"
                >
                    <button type="button" onClick={() => navigate(WORLD_VIEW)} aria-label="Return to world map">
                        World
                    </button>
                    <span aria-hidden="true">/</span>
                    {level === 'country' || focusedRegionLocationPin ? (
                        <>
                            <button
                                type="button"
                                onClick={() => focusRegionId && navigate({ level: 'region', regionId: focusRegionId, countryId: null })}
                                aria-label={`Return to ${focusRegionName} map`}
                            >
                                {focusRegionName}
                            </button>
                            <span aria-hidden="true">/</span>
                            <span>{focusedRegionLocationPin?.name ?? focusedLocationPin?.name ?? (focusCountryId ? countryDisplayName(focusCountryId) : '')}</span>
                        </>
                    ) : (
                        <span>{focusRegionName}</span>
                    )}
                </nav>
            )}
            <svg
                ref={svgRef}
                viewBox={`0 ${originY} ${MAP_WIDTH} ${height}`}
                className={`irm-svg${drilldown ? ' irm-drilldown' : ''}${cinematicMode ? ' irm-cinematic-svg' : ''}${transform.k > 1.01 ? ' irm-zoomed' : ''}`}
                role="img"
                aria-label={ariaLabel}
                {...(drilldown ? viewport.handlers : {})}
            >
                <defs>
                    <linearGradient id={svgIds.ocean} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="48%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#075985" />
                    </linearGradient>
                    <radialGradient id={svgIds.vignette} cx="50%" cy="50%" r="72%">
                        <stop offset="0%" stopColor="#082f49" stopOpacity="0" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0.5" />
                    </radialGradient>
                    <linearGradient id={svgIds.land} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#bbf7d0" />
                        <stop offset="55%" stopColor="#34d399" />
                        <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                    <linearGradient id={svgIds.gloss} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </linearGradient>
                    <filter id={svgIds.glow} x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                    <clipPath id={svgIds.frame}><rect x="0" y={originY} width={MAP_WIDTH} height={height} rx="34" /></clipPath>
                </defs>

                <rect x="0" y={originY} width={MAP_WIDTH} height={height} rx="34" fill={isProduction ? '#080d16' : `url(#${svgIds.ocean})`} />
                {!isProduction && <rect x="0" y={originY} width={MAP_WIDTH} height={height} rx="34" fill={`url(#${svgIds.vignette})`} />}
                <g clipPath={`url(#${svgIds.frame})`}>
                    <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.k})`}>
                        {showGraticule && <path d={WORLD_GRATICULE_PATH} fill="none" stroke="#fff" strokeOpacity="0.07" strokeWidth="1" vectorEffect="non-scaling-stroke" />}
                        {showShelf && !isProduction && ([[16, 0.07], [8, 0.1], [3, 0.15]] as Array<[number, number]>).map(([width, opacity]) => (
                            <path key={width} d={WORLD_SHELF_PATH} fill="none" stroke="#bae6fd" strokeOpacity={opacity} strokeWidth={width} vectorEffect="non-scaling-stroke" />
                        ))}
                        {showRelief && !isProduction && <>
                            <path d={WORLD_LAND_PATH} transform="translate(0,7)" fill="#075985" fillOpacity="0.28" />
                            <path d={WORLD_LAND_PATH} transform="translate(0,12)" fill="#082f49" fillOpacity="0.18" />
                        </>}
                        {unassignedLandPath && <path d={unassignedLandPath} fill={isProduction ? '#3b4452' : `url(#${svgIds.land})`} fillOpacity={isProduction ? 0.3 : 0.55} />}

                        <g className="region-map-landmass">
                            {regions.map(region => {
                                const selected = selectedRegionSet.has(region.id);
                                const market = marketRegionSet.has(region.id);
                                const warning = warningRegionSet.has(region.id);
                                const active = activeRegionId === region.id;
                                const focused = focusRegionId === region.id;
                                const dimmed = level !== 'world' && !focused;
                                const fill = isProduction
                                    ? selected ? accentColor : market ? '#5446c7' : '#3b4452'
                                    : selected ? region.accent : `url(#${svgIds.land})`;
                                const strongCountryFocus = emphasizeFocusedCountry && level === 'country' && focused;
                                const opacity = strongCountryFocus
                                    ? 0.24
                                    : isProduction
                                        ? selected ? 0.9 : market ? 0.58 : 0.34
                                        : selected ? 0.9 : dimmed ? 0.18 : 0.68;
                                const name = readableRegionName(region.id, region.label);
                                const tap = () => handleRegionTap(region.id);
                                const regionInteractive = !cinematicMode && level === 'world';
                                return <g key={region.id}>
                                    {selected && <path d={region.path} fill={region.accent} fillOpacity="0.22" stroke={region.accent} strokeOpacity="0.7" strokeWidth="8" filter={`url(#${svgIds.glow})`} />}
                                    <path
                                        d={region.path}
                                    className={`irm-region-base irm-hit${warning ? ' irm-region-warning' : ''}`}
                                        role={cinematicMode ? undefined : 'button'}
                                        aria-label={drilldown ? `${name}, ${region.countryCount} countries` : `${name} release region`}
                                        aria-pressed={selected}
                                        aria-current={active ? 'true' : undefined}
                                        tabIndex={cinematicMode ? undefined : level === 'world' ? 0 : -1}
                                        onClick={regionInteractive ? tap : undefined}
                                        onKeyDown={regionInteractive ? activateOnKey(tap) : undefined}
                                        fill={fill}
                                        fillOpacity={opacity}
                                        stroke={warning && !selected && !active ? '#fb7185' : selected || market || active ? '#fff' : '#d1fae5'}
                                        strokeOpacity={selected || active ? 0.78 : warning ? 0.82 : market ? 0.4 : 0.28}
                                        strokeWidth={selected || active ? 2.4 : warning ? 2 : 1.1}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                    {showRegionTints && drilldown && <path className="irm-region-tint" d={region.path} fill={region.accent} fillOpacity={focused ? strongCountryFocus ? 0.08 : 0.42 : level === 'world' ? 0.14 : 0} />}
                                </g>;
                            })}
                        </g>

                        {focusRegion?.countryIds.map(countryId => {
                            const hasPin = pins.some(pin => pin.countryId === countryId);
                            const focused = focusCountryId === countryId;
                            const canOpenCountry = drilldown && maximumViewLevel === 'country';
                            const tap = () => handleCountryTap(countryId);
                            const mappedCountry = highlightMappedCountries && hasPin;
                            const countryFocused = showCountryFocus && focused;
                            const strongCountryFocus = emphasizeFocusedCountry && level === 'country' && showCountryFocus;
                            return <path
                                key={countryId}
                                d={getCountryPath(countryId)}
                                className={`irm-country${strongCountryFocus && countryFocused ? ' irm-country-focused' : ''}`}
                                role={canOpenCountry ? 'button' : undefined}
                                tabIndex={canOpenCountry ? 0 : undefined}
                                aria-label={canOpenCountry ? `${countryDisplayName(countryId)}${hasPin ? ', mapped location' : ''}` : undefined}
                                aria-hidden={canOpenCountry ? undefined : true}
                                fill={strongCountryFocus && countryFocused ? accentColor : focusRegion.accent}
                                fillOpacity={strongCountryFocus ? countryFocused ? 0.88 : mappedCountry ? 0.08 : 0.025 : countryFocused ? 0.62 : mappedCountry ? 0.28 : 0.04}
                                stroke={strongCountryFocus && countryFocused ? '#d1fae5' : '#fff'}
                                strokeOpacity={strongCountryFocus ? countryFocused ? 1 : 0.1 : countryFocused ? 0.9 : 0.08}
                                strokeWidth={strongCountryFocus && countryFocused ? 2.8 : 1.5}
                                vectorEffect="non-scaling-stroke"
                                onClick={canOpenCountry ? tap : undefined}
                                onKeyDown={canOpenCountry ? activateOnKey(tap) : undefined}
                                onPointerDown={canOpenCountry ? event => event.stopPropagation() : undefined}
                                onPointerEnter={() => setHoveredCountryId(countryId)}
                                onPointerLeave={() => setHoveredCountryId(current => current === countryId ? null : current)}
                                pointerEvents={canOpenCountry ? 'auto' : 'none'}
                            />;
                        })}

                        <path d={WORLD_LAND_PATH} fill={`url(#${svgIds.gloss})`} fillOpacity={showRelief && !isProduction ? 0.38 : 0.18} pointerEvents="none" />
                        {showBorders && <path d={WORLD_BORDERS_PATH} fill="none" stroke="#f0fdfa" strokeOpacity={level === 'world' ? 0.18 : 0.34} strokeWidth="0.9" vectorEffect="non-scaling-stroke" pointerEvents="none" />}

                        {showRoutes && routes.map(({ from, to, route }, index) => {
                            const path = arcPath(from.point, to.point);
                            return <g key={`${from.pin.id}-${to.pin.id}`} className={`irm-route${route.planned ? ' irm-route-planned' : ''}`} style={{ animationDelay: `${index * 0.09}s` }} pointerEvents="none">
                                <path className="irm-route-glow" d={path} vectorEffect="non-scaling-stroke" />
                                <path className="irm-route-core" d={path} vectorEffect="non-scaling-stroke" />
                                <circle className="irm-route-end" cx={from.point[0]} cy={from.point[1]} r="2.4" vectorEffect="non-scaling-stroke" />
                                <circle className="irm-route-end" cx={to.point[0]} cy={to.point[1]} r="2.4" vectorEffect="non-scaling-stroke" />
                                {route.animated !== false && !(cinematicMode && cinematicFrame.reducedMotion) && <circle className="irm-route-head" r="3.2"><animateMotion dur={`${2.8 + index * 0.35}s`} repeatCount="indefinite" path={path} /></circle>}
                            </g>;
                        })}
                    </g>

                    <g
                        className="irm-screen-overlay"
                        transform={`scale(${(1 / pixelScale).toFixed(5)})`}
                    >
                        {level === 'world' && showWorldRegionLabels && regions.map(region => {
                            const point = projectLonLat(region.labelLonLat[0], region.labelLonLat[1]) ?? region.centroid;
                            const screenPoint = applyTransform(transform, point);
                            const label = readableRegionName(region.id, region.label).toUpperCase();
                            const labelWidth = Math.max(58, label.length * 7.2);
                            const tap = () => handleRegionTap(region.id);
                            return <g
                                key={region.id}
                                className="irm-region-label-hit"
                                transform={`translate(${(screenPoint[0] * pixelScale).toFixed(2)} ${(screenPoint[1] * pixelScale).toFixed(2)})`}
                                onClick={!cinematicMode ? tap : undefined}
                                onPointerDown={!cinematicMode ? event => event.stopPropagation() : undefined}
                                pointerEvents={!cinematicMode ? 'all' : 'none'}
                            >
                                <rect
                                    x={-labelWidth / 2}
                                    y="-15"
                                    width={labelWidth}
                                    height="24"
                                    rx="7"
                                    fill="#fff"
                                    fillOpacity="0.001"
                                />
                                <text
                                    className="irm-lbl"
                                    x="0"
                                    y="0"
                                    textAnchor="middle"
                                    fontSize="10.5"
                                >{label}</text>
                            </g>;
                        })}
                        {showCountryLabels && level !== 'world' && focusRegion && focusCountries.map(countryId => {
                            const point = getCountryLabelPoint(countryId);
                            if (!point) return null;
                            const screenPoint = applyTransform(transform, point);
                            const hasContent = pins.some(pin => pin.countryId === countryId);
                            const visible = level === 'country'
                                ? countryId === focusCountryId || countryId === hoveredCountryId
                                : countryLabelIds.has(countryId);
                            const name = level === 'region'
                                ? SHORT_COUNTRY_NAME[countryId] ?? countryDisplayName(countryId)
                                : countryDisplayName(countryId).toUpperCase();
                            const fontSize = level === 'country' && countryId === focusCountryId ? 11.5 : 9.5;
                            const screenX = screenPoint[0] * pixelScale;
                            const screenWidth = MAP_WIDTH * pixelScale;
                            const estimatedTextWidth = name.length * fontSize * 0.62;
                            const anchoredVisible = visible
                                && screenX - estimatedTextWidth / 2 >= 6
                                && screenX + estimatedTextWidth / 2 <= screenWidth - 6;
                            return <g
                                key={countryId}
                                className={`irm-country-marker ${anchoredVisible ? 'irm-country-marker-visible' : 'irm-country-marker-hidden'}${hasContent ? ' irm-country-has-content' : ''}`}
                                transform={`translate(${(screenPoint[0] * pixelScale).toFixed(2)} ${(screenPoint[1] * pixelScale).toFixed(2)})`}
                                pointerEvents="none"
                            >
                                {hasContent && anchoredVisible && <circle className="irm-country-content-dot" cy={level === 'country' ? -26 : -8} r="3.5" />}
                                <text
                                    className="irm-country-lbl"
                                    x="0"
                                    y={level === 'country' ? -16 : 4}
                                    textAnchor="middle"
                                    fontSize={fontSize}
                                    opacity={anchoredVisible ? 0.96 : 0}
                                >{name}</text>
                            </g>;
                        })}

                        {visiblePins.map(({ pin, regionId, point, screenPoint }) => {
                            const selected = Boolean(pin.selected);
                            const focused = pin.id === focusedLocationId;
                            const state = pin.state ?? 'idle';
                            const variant = pin.variant ?? 'default';
                            const crossViewLocator = !viewAllowsPins && selected;
                            const contextOnly = level === 'country' && Boolean(focusedLocationId) && !focused;
                            const dotRadius = crossViewLocator ? 4 : contextOnly ? 3.5 : pin.size ?? (pin.market ? 7 : focused ? 7 : 6);
                            const load = Math.max(0, Math.min(1, pin.load ?? 0));
                            const loadRadius = dotRadius + 4;
                            const loadCircumference = 2 * Math.PI * loadRadius;
                            const tap = () => onSelectLocation?.(pin.id, regionId);
                            const pinInteractive = !cinematicMode && Boolean(onSelectLocation);
                            const showLabel = !crossViewLocator && pinLabelIds.has(pin.id);
                            const badgeEligible = level === 'country' && Boolean(pin.badge) && (selected || state !== 'idle');
                            const estimatedLabelWidth = Math.max(
                                pin.name.length * 6,
                                badgeEligible ? (pin.badge?.length ?? 0) * 5.8 : 0,
                            );
                            const screenX = screenPoint[0] * pixelScale;
                            const screenWidth = MAP_WIDTH * pixelScale;
                            const hasGeographicPoint = typeof pin.longitude === 'number' && typeof pin.latitude === 'number';
                            const placementScreenX = (hasGeographicPoint
                                ? applyTransform(labelPlacementTransform, point)[0]
                                : point[0]) * pixelScale;
                            const leftLabelFits = screenX - dotRadius - 6 - estimatedLabelWidth >= 8;
                            const rightLabelFits = screenX + dotRadius + 6 + estimatedLabelWidth <= screenWidth - 8;
                            const isNearFocusedPin = level === 'region'
                                && selected
                                && !focused
                                && Boolean(focusedVisiblePin)
                                && Math.hypot(
                                    (screenPoint[0] - (focusedVisiblePin?.screenPoint[0] ?? screenPoint[0])) * pixelScale,
                                    (screenPoint[1] - (focusedVisiblePin?.screenPoint[1] ?? screenPoint[1])) * pixelScale,
                                ) < 88;
                            const preferOppositeSide = isNearFocusedPin
                                && screenX <= (focusedVisiblePin?.screenPoint[0] ?? screenPoint[0]) * pixelScale;
                            const placeLabelLeft = preferOppositeSide && leftLabelFits
                                ? true
                                : !rightLabelFits && leftLabelFits
                                    ? true
                                    : placementScreenX + dotRadius + 6 + estimatedLabelWidth > screenWidth - 8;
                            const labelX = placeLabelLeft ? -(dotRadius + 6) : dotRadius + 6;
                            const labelAnchor = placeLabelLeft ? 'end' : 'start';
                            const labelFits = placeLabelLeft ? leftLabelFits : rightLabelFits;
                            const showAnchoredLabel = showLabel && labelFits;
                            const showBadge = showAnchoredLabel && badgeEligible;
                            return <g
                                key={pin.id}
                                className={`irm-pin irm-pin-${state}${variant !== 'default' ? ` irm-pin-${variant}` : ''}${pin.market ? ' irm-pin-market' : ''}${selected ? ' irm-pin-selected' : ''}${focused ? ' irm-pin-focused' : ''}${contextOnly ? ' irm-pin-context' : ''}${crossViewLocator ? ' irm-pin-world-locator' : ''}`}
                                transform={`translate(${(screenPoint[0] * pixelScale).toFixed(2)} ${(screenPoint[1] * pixelScale).toFixed(2)})`}
                                pointerEvents={pinInteractive ? 'all' : 'none'}
                                role={cinematicMode ? undefined : 'button'}
                                tabIndex={cinematicMode ? undefined : onSelectLocation ? 0 : -1}
                                aria-label={pin.ariaLabel ?? pin.name}
                                aria-pressed={selected}
                                aria-current={focused ? 'location' : undefined}
                                onClick={pinInteractive ? tap : undefined}
                                onKeyDown={pinInteractive ? activateOnKey(tap) : undefined}
                                onPointerDown={pinInteractive ? event => event.stopPropagation() : undefined}
                            >
                                <circle className="irm-pin-hit" r={Math.max(22, dotRadius + 10)} />
                                {typeof pin.load === 'number' && <circle
                                    className="irm-pin-load"
                                    r={loadRadius}
                                    pathLength={loadCircumference}
                                    strokeDasharray={`${loadCircumference * load} ${loadCircumference * (1 - load)}`}
                                />}
                                {(selected || focused) && !contextOnly && !crossViewLocator && <circle className="irm-pin-ring" r={Math.max(10, dotRadius + 4)} />}
                                <circle className="irm-pin-dot" r={dotRadius} />
                                {showAnchoredLabel && <text className="irm-pin-lbl" x={labelX} y="3" fontSize={level === 'country' ? 10.5 : 9.5} textAnchor={labelAnchor}>{pin.name}</text>}
                                {showBadge && <text className="irm-pin-badge" x={labelX} y="15" fontSize="8.5" textAnchor={labelAnchor}>{pin.badge}</text>}
                            </g>;
                        })}
                    </g>
                </g>
            </svg>

            {locationPins.length === 0 && !drilldown && !cinematicMode && showPreview && (
                <div className={`mt-3 flex ${compact ? 'flex-col gap-2' : 'flex-col gap-3 md:flex-row md:items-center md:justify-between'}`}>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300/90">Region preview</div>
                        <div className="mt-1 text-sm font-semibold text-white/85">
                            {summary.regionCount > 0 ? `${summary.regionCount} regions selected, ${footprintLabel}` : 'Tap regions to build the release footprint.'}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {summary.shortLabels.length > 0 ? summary.shortLabels.map(label => (
                            <span key={label} className="rounded-full border border-emerald-100/35 bg-emerald-300/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-50">{label}</span>
                        )) : <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">No region selected</span>}
                    </div>
                </div>
            )}
        </div>
    );
};
