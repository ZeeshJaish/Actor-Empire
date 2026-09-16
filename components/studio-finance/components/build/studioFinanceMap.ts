import type { BoxOfficeRegionId } from '../../../../types';
import {
  getProductionLocation,
  PRODUCTION_LOCATION_CATALOG,
} from '../../../../services/productionLocations';
import type {
  RegionMapLocationPin,
  RegionMapLocationRoute,
} from '../../../../services/regionMap';
import type { RegionMapView } from '../../../../views/lifestyle/business/components/regionMapView';
import type { BuildData, BuildDraft } from '../../finance/build';

export interface StudioFinanceMapModel {
  selectedRegionIds: BoxOfficeRegionId[];
  marketRegionIds: BoxOfficeRegionId[];
  activeRegionId: BoxOfficeRegionId | null;
  locationPins: RegionMapLocationPin[];
  locationRoutes: RegionMapLocationRoute[];
  interaction: 'drilldown';
  maximumViewLevel: 'country';
  minimumPinViewLevel: 'region';
  view: RegionMapView;
}

/** Translate shared-atlas numeric country ids back into Studio Finance ids. */
export function financeCountryMapId(data: BuildData, countryId: string): string | undefined {
  const countryCode = PRODUCTION_LOCATION_CATALOG.find(location => location.countryId === countryId)?.countryCode;
  return countryCode
    ? data.countries.find(country => country.code.toUpperCase() === countryCode)?.id
    : undefined;
}

export function studioFinanceCountryNumericId(data: BuildData, financeCountryId: string): string | undefined {
  const countryCode = data.countries.find(country => country.id === financeCountryId)?.code.toUpperCase();
  return countryCode
    ? PRODUCTION_LOCATION_CATALOG.find(location => location.countryCode === countryCode)?.countryId
    : undefined;
}

export function createStudioFinanceMapModel(
  data: BuildData,
  draft: BuildDraft,
  selectedCityId: string | undefined,
  view: RegionMapView,
  showNetworkRoutes: boolean,
): StudioFinanceMapModel {
  const countryById = new Map(data.countries.map(country => [country.id, country]));
  const facilitiesByCity = new Map<string, BuildDraft['facilities']>();
  draft.facilities.forEach(facility => {
    const facilities = facilitiesByCity.get(facility.cityId) ?? [];
    facilities.push(facility);
    facilitiesByCity.set(facility.cityId, facilities);
  });

  const selectedRegionIds = Array.from(new Set(draft.facilities.flatMap(facility => {
    const city = data.cities.find(candidate => candidate.id === facility.cityId);
    const regionId = city ? countryById.get(city.countryId)?.regionId : undefined;
    return regionId ? [regionId as BoxOfficeRegionId] : [];
  })));
  const marketRegionIds = Array.from(new Set(data.countries.flatMap(country => (
    country.opening ? [country.regionId as BoxOfficeRegionId] : []
  ))));
  const selectedCity = data.cities.find(city => city.id === selectedCityId);
  const activeRegionId = selectedCity
    ? countryById.get(selectedCity.countryId)?.regionId as BoxOfficeRegionId | undefined
    : view.regionId ?? undefined;

  const locationPins: RegionMapLocationPin[] = data.cities.map(city => {
    const canonical = getProductionLocation(city.id);
    const facilities = facilitiesByCity.get(city.id) ?? [];
    const built = facilities.some(facility => facility.built);
    const planned = facilities.length > 0 && !built;
    const state: RegionMapLocationPin['state'] = city.id === selectedCityId
      ? 'active'
      : built
        ? 'built'
        : planned
          ? 'planned'
          : city.recommended
            ? 'recommended'
            : 'idle';
    return {
      id: city.id,
      name: city.name,
      badge: state === 'active'
        ? 'ACTIVE FACILITY'
        : built
          ? 'BUILT FACILITY'
          : planned
            ? 'PLANNED FACILITY'
            : city.recommended
              ? 'RECOMMENDED MARKET'
              : 'FACILITY MARKET',
      x: city.plot.x,
      y: city.plot.y,
      longitude: canonical?.longitude ?? city.coord.lng,
      latitude: canonical?.latitude ?? city.coord.lat,
      selected: city.id === selectedCityId,
      market: Boolean(countryById.get(city.countryId)?.opening),
      regionId: canonical?.regionId ?? countryById.get(city.countryId)?.regionId as BoxOfficeRegionId | undefined,
      countryId: canonical?.countryId,
      countryCode: canonical?.countryCode ?? city.code,
      state,
      built,
    };
  });

  const facilityCityIds = Array.from(new Set(draft.facilities.map(facility => facility.cityId)));
  const hubId = facilityCityIds[0];
  const builtByCity = new Map(locationPins.map(pin => [pin.id, pin.built]));
  const locationRoutes: RegionMapLocationRoute[] = showNetworkRoutes && hubId
    ? facilityCityIds.slice(1).map(toId => {
        const planned = !builtByCity.get(hubId) || !builtByCity.get(toId);
        return { fromId: hubId, toId, planned, animated: !planned };
      })
    : [];

  return {
    selectedRegionIds,
    marketRegionIds,
    activeRegionId: activeRegionId ?? null,
    locationPins,
    locationRoutes,
    interaction: 'drilldown',
    maximumViewLevel: 'country',
    minimumPinViewLevel: 'region',
    view,
  };
}
