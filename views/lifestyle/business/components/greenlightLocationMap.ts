import type { BoxOfficeRegionId } from '../../../../types';
import type {
    ProductionLocation,
    ProductionLocationContinentId,
} from '../../../../services/productionLocations';
import type { RegionMapLocationPin } from '../../../../services/regionMap';
import type { RegionMapView } from './regionMapView';

export interface GreenlightLocationMapModel {
    interaction: 'drilldown';
    maximumViewLevel: 'region';
    minimumPinViewLevel: 'region';
    locationPins: RegionMapLocationPin[];
    selectedRegionIds: BoxOfficeRegionId[];
    visibleLocations: ProductionLocation[];
    visibleLocationIds: string[];
}

export const toggleProductionLocationSelection = (
    selectedIds: readonly string[],
    locationId: string,
): string[] => (
    selectedIds.includes(locationId)
        ? selectedIds.filter(id => id !== locationId)
        : [...selectedIds, locationId]
);

export const createGreenlightLocationPins = (
    locations: readonly ProductionLocation[],
    selectedIds: readonly string[],
): RegionMapLocationPin[] => locations.map(location => ({
    id: location.id,
    name: location.name,
    x: location.x,
    y: location.y,
    longitude: location.longitude,
    latitude: location.latitude,
    selected: selectedIds.includes(location.id),
    regionId: location.regionId,
    countryId: location.countryId,
    countryCode: location.countryCode,
}));

export const getGreenlightVisibleLocations = (
    locations: readonly ProductionLocation[],
    selectedContinentId: ProductionLocationContinentId | null,
    view: RegionMapView,
): ProductionLocation[] => {
    if (!selectedContinentId && !view.regionId) return [];
    return locations.filter(location => (
        selectedContinentId
            ? location.continentId === selectedContinentId
            : location.regionId === view.regionId
    ));
};

export const createGreenlightLocationMapModel = (
    locations: readonly ProductionLocation[],
    selectedIds: readonly string[],
    view: RegionMapView,
): GreenlightLocationMapModel => {
    const selectedLocationIds = new Set(selectedIds);
    const selectedRegionIds = new Set<BoxOfficeRegionId>();
    if (view.regionId) selectedRegionIds.add(view.regionId);
    locations.forEach(location => {
        if (selectedLocationIds.has(location.id)) selectedRegionIds.add(location.regionId);
    });
    const selectedContinentId = view.regionId
        ? locations.find(location => location.regionId === view.regionId)?.continentId ?? null
        : null;
    const visibleLocations = getGreenlightVisibleLocations(locations, selectedContinentId, view);

    return {
        interaction: 'drilldown',
        maximumViewLevel: 'region',
        minimumPinViewLevel: 'region',
        locationPins: createGreenlightLocationPins(locations, selectedIds),
        selectedRegionIds: [...selectedRegionIds],
        visibleLocations,
        visibleLocationIds: visibleLocations.map(location => location.id),
    };
};
