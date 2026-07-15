import React, { useId, useMemo } from 'react';
import { geoNaturalEarth1, geoPath } from 'd3-geo';
import { feature, merge } from 'topojson-client';
import countriesTopology from 'world-atlas/countries-110m.json';
import type { BoxOfficeRegionId } from '../../../../types';
import { REGION_MAP_OVERLAYS, getRegionMapSummary } from '../../../../services/regionMap';

export interface RegionMapLocationPin {
    id: string;
    name: string;
    x: number;
    y: number;
    longitude?: number;
    latitude?: number;
    selected?: boolean;
    regionId?: BoxOfficeRegionId;
}

interface InteractiveRegionMapProps {
    selectedRegionIds: BoxOfficeRegionId[];
    onSelectRegion?: (regionId: BoxOfficeRegionId) => void;
    locationPins?: RegionMapLocationPin[];
    onSelectLocation?: (locationId: string, regionId?: BoxOfficeRegionId) => void;
    visualTone?: 'release' | 'production';
    compact?: boolean;
}

const MAP_ROUTE_ARCS = [
    'M178 176 C316 72 454 88 536 166',
    'M536 166 C628 92 710 96 750 206',
    'M565 322 C642 274 736 278 846 419',
    'M247 355 C342 290 456 287 565 322'
];

const WORLD_TOPOLOGY = countriesTopology as any;
const WORLD_COUNTRIES = WORLD_TOPOLOGY.objects.countries.geometries as Array<{ id: string | number }>;
const formatCountryId = (countryId: string | number): string => String(countryId).padStart(3, '0');
const WORLD_FEATURES = feature(WORLD_TOPOLOGY, WORLD_TOPOLOGY.objects.countries) as any;
const WORLD_VISIBLE_FEATURES = {
    ...WORLD_FEATURES,
    features: WORLD_FEATURES.features.filter((country: { id: string | number }) => formatCountryId(country.id) !== '010')
};

export const InteractiveRegionMap: React.FC<InteractiveRegionMapProps> = ({
    selectedRegionIds,
    onSelectRegion,
    locationPins = [],
    onSelectLocation,
    visualTone = 'release',
    compact = false
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
    const summary = useMemo(() => getRegionMapSummary(selectedRegionIds), [selectedRegionIds]);
    const canInteract = Boolean(onSelectRegion);
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
            const regionCountries = WORLD_COUNTRIES.filter(country => regionCountrySet.has(formatCountryId(country.id)));
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

    const handleKeyDown = (event: React.KeyboardEvent<SVGPathElement>, regionId: BoxOfficeRegionId) => {
        if (!canInteract) return;
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelectRegion?.(regionId);
        }
    };

    return (
        <div className={`interactive-region-map rounded-[1.7rem] border p-3 shadow-2xl ${
            isProduction
                ? 'border-sky-200/35 bg-sky-950/20 shadow-sky-950/30'
                : 'border-amber-200/25 bg-sky-950/25 shadow-sky-950/40'
        }`}>
            <svg
                viewBox="0 0 1000 520"
                className="w-full overflow-visible"
                role="img"
                aria-label="Interactive box office release region map"
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

                <rect x="0" y="0" width="1000" height="520" rx="34" fill={`url(#${svgIds.ocean})`} />
                <path d="M58 118 C206 86 316 112 462 96 C642 76 778 44 940 88" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
                <path d="M62 401 C210 434 366 410 524 433 C680 456 812 480 942 430" fill="none" stroke="#ffffff" strokeOpacity="0.16" strokeWidth="2" />

                <g className="region-map-route-arc" fill="none" stroke="#fef3c7" strokeLinecap="round" strokeWidth="2.2" strokeDasharray="10 14" strokeOpacity="0.38">
                    {MAP_ROUTE_ARCS.map(path => <path key={path} d={path} />)}
                </g>

                <g className="region-map-landmass region-map-country-topology" filter={`url(#${svgIds.softShadow})`}>
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        return (
                            <g key={`land-${region.id}`}>
                                {isSelected && (
                                    <path
                                        d={region.path}
                                        fill={region.accent}
                                        fillOpacity="0.2"
                                        stroke={region.accent}
                                        strokeOpacity="0.72"
                                        strokeWidth="8"
                                        filter={`url(#${svgIds.glow})`}
                                    />
                                )}
                                <path
                                    d={region.path}
                                    fill={isSelected ? region.accent : `url(#${svgIds.landBase})`}
                                    fillOpacity={isSelected ? 0.88 : 0.58}
                                    stroke={isSelected ? '#ffffff' : '#ecfeff'}
                                    strokeOpacity={isSelected ? 0.72 : 0.28}
                                    strokeWidth={isSelected ? 2.4 : 1.1}
                                />
                                <path
                                    d={region.path}
                                    fill={`url(#${svgIds.selectedGloss})`}
                                    fillOpacity={isSelected ? 0.72 : 0.22}
                                    clipPath={`url(#${svgIds.clip(region.id)})`}
                                />
                            </g>
                        );
                    })}
                </g>

                <g>
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        return (
                            <path
                                key={region.id}
                                d={region.path}
                                role="button"
                                aria-label={`${region.label} release region`}
                                aria-pressed={isSelected}
                                tabIndex={canInteract ? 0 : -1}
                                onClick={() => onSelectRegion?.(region.id)}
                                onKeyDown={event => handleKeyDown(event, region.id)}
                                className="region-map-hit-area cursor-pointer transition-all duration-200 outline-none"
                                fill="#ffffff"
                                fillOpacity={0.001}
                                stroke={isSelected ? region.accent : '#ffffff'}
                                strokeOpacity={isSelected ? 0.48 : 0}
                                strokeWidth={isSelected ? 4 : 1}
                            />
                        );
                    })}
                </g>

                <g pointerEvents="none">
                    {projectedRegions.map(region => {
                        const isSelected = selectedRegionSet.has(region.id);
                        return (
                            <g key={region.id} className="region-map-label">
                                <text
                                    className="region-map-continent-name"
                                    x={region.labelX}
                                    y={region.labelY}
                                    textAnchor="middle"
                                    fill={isSelected ? '#f8fafc' : '#f0fdfa'}
                                    opacity={isSelected ? 1 : 0.86}
                                    fontSize={isSelected ? 18 : 15}
                                    fontWeight={900}
                                    letterSpacing="2"
                                    style={{ textShadow: '0 2px 8px rgba(7,89,133,0.65)' }}
                                >
                                    {region.shortLabel}
                                </text>
                                {isSelected && !showProductionPins && (
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
                                        {region.label.toUpperCase()}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </g>

                {showProductionPins && (
                    <g className="region-map-location-dot">
                        {locationPins.map(pin => {
                            const point = getPinPoint(pin);
                            return (
                                <g
                                    key={pin.id}
                                    role="button"
                                    aria-label={`${pin.name} production location`}
                                    aria-pressed={Boolean(pin.selected)}
                                    tabIndex={onSelectLocation ? 0 : -1}
                                    className="cursor-pointer outline-none"
                                    onClick={() => onSelectLocation?.(pin.id, pin.regionId)}
                                    onKeyDown={event => {
                                        if (!onSelectLocation) return;
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            onSelectLocation(pin.id, pin.regionId);
                                        }
                                    }}
                                >
                                    {pin.selected && (
                                        <circle cx={point.x} cy={point.y} r="18" fill="#facc15" opacity="0.24" />
                                    )}
                                    <circle cx={point.x} cy={point.y} r={pin.selected ? 7 : 4.2} fill={pin.selected ? '#facc15' : '#ffffff'} stroke="#075985" strokeWidth="2" />
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

            {!showProductionPins && (
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
