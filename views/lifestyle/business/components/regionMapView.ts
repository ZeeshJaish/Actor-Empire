import type { BoxOfficeRegionId } from '../../../../types';
import { getRegionIdForCountry } from '../../../../services/regionMap';
import type {
    RegionMapLocationPin,
    RegionMapLocationRoute,
} from '../../../../services/regionMap';

export type RegionMapLevel = 'world' | 'region' | 'country';

export interface RegionMapView {
    level: RegionMapLevel;
    regionId: BoxOfficeRegionId | null;
    countryId: string | null;
}

export const WORLD_VIEW: RegionMapView = { level: 'world', regionId: null, countryId: null };
export const regionView = (regionId: BoxOfficeRegionId): RegionMapView => ({ level: 'region', regionId, countryId: null });
export const countryView = (countryId: string, regionId?: BoxOfficeRegionId | null): RegionMapView => ({
    level: 'country',
    regionId: regionId ?? getRegionIdForCountry(countryId) ?? null,
    countryId,
});
export const parentView = (view: RegionMapView): RegionMapView => (
    view.level === 'country' && view.regionId ? regionView(view.regionId) : WORLD_VIEW
);

export type DrilldownRegionSelection = 'navigate' | 'toggle';
export type MaximumRegionMapViewLevel = 'region' | 'country';

export interface RegionMapCinematicOptions {
    durationMs?: number;
    replayKey?: string | number;
    /** Optional deterministic override for review surfaces and server rendering. */
    reducedMotion?: boolean;
}

export interface RegionMapRegionTapResolution {
    nextView: RegionMapView;
    shouldSelectRegion: boolean;
}

export const resolveRegionMapRegionTap = (
    regionId: BoxOfficeRegionId,
    selectionMode: DrilldownRegionSelection,
): RegionMapRegionTapResolution => ({
    nextView: regionView(regionId),
    shouldSelectRegion: selectionMode === 'toggle',
});

export const resolveRegionMapCountryTap = (
    currentView: RegionMapView,
    countryId: string,
    maximumViewLevel: MaximumRegionMapViewLevel,
): RegionMapView => (
    maximumViewLevel === 'country'
        ? countryView(countryId, currentView.regionId)
        : currentView
);

export interface InteractiveRegionMapProps {
    selectedRegionIds: BoxOfficeRegionId[];
    marketRegionIds?: BoxOfficeRegionId[];
    warningRegionIds?: BoxOfficeRegionId[];
    activeRegionId?: BoxOfficeRegionId | null;
    onSelectRegion?: (regionId: BoxOfficeRegionId) => void;
    locationPins?: RegionMapLocationPin[];
    locationRoutes?: RegionMapLocationRoute[];
    onSelectLocation?: (locationId: string, regionId?: BoxOfficeRegionId) => void;
    accentColor?: string;
    visualTone?: 'release' | 'production';
    compact?: boolean;
    showPreview?: boolean;
    ariaLabel?: string;
    interaction?: 'toggle' | 'drilldown' | 'cinematic';
    cinematic?: RegionMapCinematicOptions;
    drilldownRegionSelection?: DrilldownRegionSelection;
    maximumViewLevel?: MaximumRegionMapViewLevel;
    minimumPinViewLevel?: RegionMapLevel;
    showSelectedPinsAcrossViews?: boolean;
    focusedLocationId?: string | null;
    view?: RegionMapView;
    defaultView?: RegionMapView;
    onViewChange?: (view: RegionMapView) => void;
    frameHeight?: number;
    showRegionTints?: boolean;
    showRoutes?: boolean;
    showGraticule?: boolean;
    showBorders?: boolean;
    showWorldRegionLabels?: boolean;
    showBreadcrumb?: boolean;
    showCountryLabels?: boolean;
    emphasizeFocusedCountry?: boolean;
    highlightMappedCountries?: boolean;
    showCountryFocus?: boolean;
    showShelf?: boolean;
    showRelief?: boolean;
    className?: string;
}
