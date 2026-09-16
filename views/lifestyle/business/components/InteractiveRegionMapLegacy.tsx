import React, { useId, useMemo } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { merge } from 'topojson-client';
import type { BoxOfficeRegionId } from '../../../../types';
import {
    REGION_MAP_OVERLAYS,
    getRegionMapSummary,
    type RegionMapLocationPin,
} from '../../../../services/regionMap';
import {
    WORLD_COUNTRIES,
    WORLD_TOPOLOGY,
    WORLD_VISIBLE_FEATURES,
    formatWorldCountryId,
} from './worldMapGeometry';
import type { InteractiveRegionMapProps } from './regionMapView';

const MAP_ROUTE_ARCS = [
    'M178 176 C316 72 454 88 536 166',
    'M536 166 C628 92 710 96 750 206',
    'M565 322 C642 274 736 278 846 419',
    'M247 355 C342 290 456 287 565 322'
];

const readableRegionName = (regionId: BoxOfficeRegionId, label: string): string => (
    label.trim() || regionId
        .toLowerCase()
        .split('_')
        .map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
        .join(' ')
);

export const InteractiveRegionMapLegacy: React.FC<InteractiveRegionMapProps> = ({
    selectedRegionIds,
    marketRegionIds = [],
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
    frameHeight = 520,
    showWorldRegionLabels = true,
    className = '',
}) => {
    // SVG ids are global in the document. Namespace every map instance so Android
    // WebView cannot resolve this map's gradients/clips against another screen's SVG.
    const mapInstanceId = useId().replace(/[:]/g, '');
    const svgIds = {
        ocean: `regionMapOcean-${mapInstanceId}`,
        landBase: `regionMapLandBase-${mapInstanceId}`,
        selectedGloss: `regionMapSelectedGloss-${mapInstanceId}`,
        glow: `regionMapGlow-${mapInstanceId}`,
        softShadow: `regionMapSoftShadow-${mapInstanceId}`,
        clip: (regionId: string) => `regionMapClip-${mapInstanceId}-${regionId}`,
    };
    const selectedRegionSet = useMemo(() => new Set(selectedRegionIds), [selectedRegionIds]);
    const marketRegionSet = useMemo(() => new Set(marketRegionIds), [marketRegionIds]);
    const summary = useMemo(() => getRegionMapSummary(selectedRegionIds), [selectedRegionIds]);
    const cinematicMode = interaction === 'cinematic';
    const canInteract = !cinematicMode && Boolean(onSelectRegion);
    const showProductionPins = locationPins.length > 0;
    const isProduction = visualTone === 'production';
    const footprintLabel = summary.regionCount >= 5
        ? 'worldwide footprint'
        : summary.regionCount >= 3
            ? 'wide footprint'
            : summary.regionCount > 0
                ? 'focused footprint'
                : '';
    const mapProjection = useMemo(() => {
        const projection = geoNaturalEarth1().fitExtent([[38, 34], [962, 482]], WORLD_VISIBLE_FEATURES);
        const [translateX, translateY] = projection.translate();
        projection.translate([translateX + 18, translateY]);
        return projection;
    }, []);
    const projectedRegions = useMemo(() => {
        const pathGenerator = geoPath(mapProjection);

        return REGION_MAP_OVERLAYS.map(region => {
            const regionCountrySet = new Set(region.countryIds);
            const regionCountries = WORLD_COUNTRIES.filter(country => regionCountrySet.has(formatWorldCountryId(country.id)));
            const geometry = regionCountries.length > 0
                ? merge(WORLD_TOPOLOGY, regionCountries as any)
                : null;
            const projectedPath = geometry ? pathGenerator(geometry as any) : null;
            const projectedCentroid = geometry ? pathGenerator.centroid(geometry as any) : [region.labelX, region.labelY];
            const centroidX = Number.isFinite(projectedCentroid[0]) ? projectedCentroid[0] : region.labelX;
            const centroidY = Number.isFinite(projectedCentroid[1]) ? projectedCentroid[1] : region.labelY;

            return {
                ...region,
                path: projectedPath || region.path,
                labelX: centroidX,
                labelY: centroidY
            };
        });
    }, [mapProjection]);

    const getPinPoint = (pin: RegionMapLocationPin): { x: number; y: number } => {
        if (typeof pin.longitude === 'number' && typeof pin.latitude === 'number') {
            const projectedPin = mapProjection([pin.longitude, pin.latitude]);
            if (projectedPin && Number.isFinite(projectedPin[0]) && Number.isFinite(projectedPin[1])) {
                return { x: projectedPin[0], y: projectedPin[1] };
            }
        }

        return { x: pin.x * 10, y: pin.y * 5 };
    };
    const routePaths = locationRoutes.flatMap((route) => {
        const from = locationPins.find(pin => pin.id === route.fromId);
        const to = locationPins.find(pin => pin.id === route.toId);
        if (!from || !to) return [];
        const start = getPinPoint(from);
        const end = getPinPoint(to);
        const lift = Math.min(105, Math.abs(end.x - start.x) * 0.14 + 28);
        return [{
            ...route,
            path: `M${start.x.toFixed(1)},${start.y.toFixed(1)} Q${((start.x + end.x) / 2).toFixed(1)},${(Math.min(start.y, end.y) - lift).toFixed(1)} ${end.x.toFixed(1)},${end.y.toFixed(1)}`,
        }];
    });

    const handleKeyDown = (event: React.KeyboardEvent<SVGPathElement>, regionId: BoxOfficeRegionId) => {
        if (!canInteract) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectRegion?.(regionId);
        }
    };

    return (
        <div className={`interactive-region-map rounded-[1.7rem] border p-3 ${
            isProduction
                ? 'border-slate-500/35 bg-[#0a0f18] shadow-lg shadow-black/25'
                : 'border-amber-200/25 bg-sky-950/25 shadow-2xl shadow-sky-950/40'
        }${cinematicMode ? ' irm-cinematic' : ''} ${className}`}>
            <svg
                viewBox={`0 ${(520 - frameHeight) / 2} 1000 ${frameHeight}`}
                className="w-full overflow-visible"
                role="img"
                aria-label={ariaLabel}
            >
                <defs>
                    <linearGradient id={svgIds.ocean} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#38bdf8" />
                        <stop offset="45%" stopColor="#0ea5e9" />
                        <stop offset="100%" stopColor="#0369a1" />
                    </linearGradient>
                    <linearGradient id={svgIds.landBase} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#bbf7d0" stopOpacity="0.95" />
                        <stop offset="55%" stopColor="#34d399" stopOpacity="0.82" />
                        <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.78" />
                    </linearGradient>
                    <linearGradient id={svgIds.selectedGloss} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
                        <stop offset="44%" stopColor="#ffffff" stopOpacity="0.05" />
                        <stop offset="100%" stopColor="#020617" stopOpacity="0.08" />
                    </linearGradient>
                    {projectedRegions.map(region => (
                        <clipPath key={`clip-${region.id}`} id={svgIds.clip(region.id)}>
                            <path d={region.path} />
                        </clipPath>
                    ))}
                    <filter id={svgIds.glow} x="-25%" y="-25%" width="150%" height="150%">
                        <feGaussianBlur stdDeviation="6" result="blur" />
                        <feMerge>
                            <feMergeNode in="blur" />
                            <feMergeNode in="SourceGraphic" />
                        </feMerge>
                    </filter>
                    <filter id={svgIds.softShadow} x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="0" dy="11" stdDeviation="8" floodColor="#075985" floodOpacity="0.35" />
                    </filter>
                </defs>

                <rect x="0" y="0" width="1000" height="520" rx="34" fill={isProduction ? '#080d16' : `url(#${svgIds.ocean})`} />
                <path d="M58 118 C206 86 316 112 462 96 C642 76 778 44 940 88" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
                <path d="M62 401 C210 434 366 410 524 433 C680 456 812 480 942 430" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2" />

                <g className="region-map-route-arc" fill="none" stroke="#fef3c7" strokeLinecap="round" strokeWidth="2.2" strokeDasharray="10 14" strokeOpacity="0.38">
                    {MAP_ROUTE_ARCS.map(path => <path key={path} d={path} />)}
                </g>

                <g className="region-map-landmass region-map-country-topology" filter={`url(#${svgIds.softShadow})`}>
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        const isMarket = marketRegionSet.has(region.id);
                        const isActive = activeRegionId === region.id;
                        const regionFill = isProduction
                            ? isSelected ? accentColor : isMarket ? '#5446c7' : '#3b4452'
                            : isSelected ? region.accent : `url(#${svgIds.landBase})`;
                        const regionFillOpacity = isProduction
                            ? isSelected ? 0.9 : isMarket ? 0.58 : 0.34
                            : isSelected ? 0.88 : 0.58;
                        return (
                            <g key={`land-${region.id}`}>
                                {isSelected && (
                                    <path
                                        d={region.path}
                                        fill={isProduction ? accentColor : region.accent}
                                        fillOpacity="0.2"
                                        stroke={isProduction ? accentColor : region.accent}
                                        strokeOpacity="0.72"
                                        strokeWidth="8"
                                        filter={`url(#${svgIds.glow})`}
                                    />
                                )}
                                {isActive && (
                                    <path
                                        d={region.path}
                                        fill="transparent"
                                        stroke="#ffffff"
                                        strokeOpacity="0.92"
                                        strokeWidth="4"
                                        filter={`url(#${svgIds.glow})`}
                                    />
                                )}
                                <path
                                    d={region.path}
                                    fill={regionFill}
                                    fillOpacity={regionFillOpacity}
                                    stroke={isSelected || isMarket ? '#ffffff' : '#94a3b8'}
                                    strokeOpacity={isSelected ? 0.72 : isMarket ? 0.38 : 0.18}
                                    strokeWidth={isSelected ? 2.4 : 1.1}
                                />
                                {!isProduction && (
                                    <path
                                        d={region.path}
                                        fill={`url(#${svgIds.selectedGloss})`}
                                        fillOpacity={isSelected ? 0.72 : 0.22}
                                        clipPath={`url(#${svgIds.clip(region.id)})`}
                                    />
                                )}
                            </g>
                        );
                    })}
                </g>

                {locationRoutes.length > 0 && (
                    <g className="region-map-location-route" data-route-count={routePaths.length} pointerEvents="none">
                        {routePaths.map((route, index) => (
                            <g key={`${route.fromId}-${route.toId}`} style={{ ['--route-index' as string]: index }}>
                                <path className="region-map-flight-path" d={route.path} pathLength="1" />
                                <circle className="region-map-flight-head" r="4.5">
                                    {!(cinematicMode && cinematic?.reducedMotion) && <animateMotion path={route.path} dur={`${1.65 + index * .12}s`} begin={`${index * .14}s`} repeatCount="indefinite" />}
                                </circle>
                            </g>
                        ))}
                    </g>
                )}

                <g>
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        const isMarket = marketRegionSet.has(region.id);
                        const isActive = activeRegionId === region.id;
                        const regionName = readableRegionName(region.id, region.label);
                        const statusLabel = isProduction
                            ? [regionName, isMarket ? 'launch market' : '', isSelected ? 'infrastructure live' : ''].filter(Boolean).join(', ')
                            : `${regionName} release region`;
                        return (
                            <path
                                key={region.id}
                                d={region.path}
                                role={cinematicMode ? undefined : 'button'}
                                aria-label={statusLabel}
                                aria-pressed={isSelected}
                                aria-current={isActive ? 'true' : undefined}
                                tabIndex={cinematicMode ? undefined : canInteract ? 0 : -1}
                                onClick={canInteract ? () => onSelectRegion?.(region.id) : undefined}
                                onKeyDown={canInteract ? event => handleKeyDown(event, region.id) : undefined}
                                className={`region-map-hit-area transition-all duration-200 outline-none${canInteract ? ' cursor-pointer' : ''}`}
                                fill="#ffffff"
                                fillOpacity={0.001}
                                stroke={isActive ? '#ffffff' : isSelected ? (isProduction ? accentColor : region.accent) : '#ffffff'}
                                strokeOpacity={isActive ? 0.82 : isSelected ? 0.48 : 0}
                                strokeWidth={isActive ? 5 : isSelected ? 4 : 1}
                            />
                        );
                    })}
                </g>

                {showWorldRegionLabels && <g pointerEvents="none">
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        const isMarket = marketRegionSet.has(region.id);
                        const isActive = activeRegionId === region.id;
                        return (
                            <g key={region.id} className="region-map-label">
                                <text
                                    className="region-map-continent-name"
                                    x={region.labelX}
                                    y={region.labelY}
                                    textAnchor="middle"
                                    fill={isSelected ? '#f8fafc' : isMarket ? '#ddd6fe' : '#a8b1bf'}
                                    opacity={isSelected ? 1 : isMarket ? 0.92 : 0.68}
                                    fontSize={isSelected || isActive ? 18 : 15}
                                    fontWeight={900}
                                    letterSpacing="2"
                                    style={{ textShadow: '0 2px 8px rgba(7,89,133,0.65)' }}
                                >
                                    {region.shortLabel}
                                </text>
                                {(isSelected || isActive) && !showProductionPins && (
                                    <text
                                        className="region-map-continent-name"
                                        x={region.labelX}
                                        y={region.labelY + 18}
                                        textAnchor="middle"
                                        fill="#fef3c7"
                                        opacity="0.92"
                                        fontSize="8"
                                        fontWeight={900}
                                        letterSpacing="1.4"
                                    >
                                        {isActive ? 'VIEWING' : region.label.toUpperCase()}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>}

                {showProductionPins && (
                    <g className="region-map-location-dot">
                        {locationPins.map(pin => {
                            if (isProduction && !pin.selected && !pin.market && pin.regionId !== activeRegionId) return null;
                            const point = getPinPoint(pin);
                            const pinFill = pin.selected ? accentColor : pin.market ? '#8b7cff' : '#94a3b8';
                            return (
                                <g
                                    key={pin.id}
                                    role={cinematicMode ? undefined : 'button'}
                                    aria-label={`${pin.name}${pin.market ? ', launch market' : ''}${pin.selected ? ', infrastructure site' : ', available city'}`}
                                    aria-pressed={Boolean(pin.selected)}
                                    tabIndex={cinematicMode ? undefined : onSelectLocation ? 0 : -1}
                                    className={`${!cinematicMode && onSelectLocation ? 'cursor-pointer ' : ''}outline-none`}
                                    onClick={!cinematicMode && onSelectLocation ? () => onSelectLocation(pin.id, pin.regionId) : undefined}
                                    onKeyDown={!cinematicMode && onSelectLocation ? event => {
                                        if (!onSelectLocation) return;
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelectLocation(pin.id, pin.regionId);
                                        }
                                    } : undefined}
                                >
                                    {(pin.selected || pin.market) && (
                                        <circle cx={point.x} cy={point.y} r={pin.selected ? 18 : 12} fill={pinFill} opacity={pin.selected ? 0.24 : 0.18} />
                                    )}
                                    <circle cx={point.x} cy={point.y} r={pin.selected ? 7 : pin.market ? 5.2 : 3.5} fill={pinFill} stroke="#e2e8f0" strokeOpacity={pin.selected ? 0.9 : 0.45} strokeWidth="2" />
                                    {pin.selected && (
                                        <text
                                            x={point.x}
                                            y={point.y - 15}
                                            textAnchor="middle"
                                            fill="#ffffff"
                                            fontSize="10"
                                            fontWeight={900}
                                            style={{ textShadow: '0 2px 6px rgba(2,6,23,0.8)' }}
                                        >
                                            {pin.name}
                                        </text>
                                    )}
                                </g>
                            );
                        })}
                    </g>
                )}
            </svg>

            {!showProductionPins && showPreview && (
                <div className={`mt-3 flex ${compact ? 'flex-col gap-2' : 'flex-col gap-3 md:flex-row md:items-center md:justify-between'}`}>
                    <div>
                        <div className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-300/90">Region preview</div>
                        <div className="mt-1 text-sm font-semibold text-white/85">
                            {summary.regionCount > 0
                                ? `${summary.regionCount} regions selected, ${footprintLabel}`
                                : 'Tap regions to build the release footprint.'}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {summary.shortLabels.length > 0 ? summary.shortLabels.map(label => (
                            <span key={label} className="rounded-full border border-emerald-100/35 bg-emerald-300/20 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-emerald-50">
                                {label}
                            </span>
                        )) : (
                            <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                                No region selected
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
