import { useEffect, useMemo, useState } from 'react';
import { getProductionLocation } from '../../../../services/productionLocations';
import {
  InteractiveRegionMap,
  WORLD_VIEW,
  countryView,
  regionView,
  type RegionMapView,
} from '../../../../views/lifestyle/business/components/InteractiveRegionMap';
import { MapNavigationToolbar } from '../../../../views/lifestyle/business/components/MapNavigationToolbar';
import type { BuildData, BuildDraft, CountryService } from '../../finance/build';
import {
  createStudioFinanceMapModel,
  financeCountryMapId,
  studioFinanceCountryNumericId,
} from './studioFinanceMap';

interface Props {
  data: BuildData;
  draft: BuildDraft;
  services: CountryService[];
  selectedRegionId?: string;
  selectedCountryId?: string;
  selectedCityId?: string;
  onSelectRegion?: (regionId: string) => void;
  onSelectCountry?: (countryId: string) => void;
  onSelectCity?: (cityId: string) => void;
  showNetworkRoutes?: boolean;
  cinematic?: boolean;
  cinematicDurationMs?: number;
  cinematicReplayKey?: string | number;
}

/**
 * Build uses the exact interactive map component from Production House's
 * Scout Location step. Only the pins and selected regions come from the
 * infrastructure draft; the projection, topology, ocean, land treatment and
 * interaction remain shared with Production House.
 */
export function WorldMap({
  data,
  draft,
  selectedRegionId,
  selectedCountryId,
  selectedCityId,
  onSelectRegion,
  onSelectCountry,
  onSelectCity,
  showNetworkRoutes = false,
  cinematic = false,
  cinematicDurationMs,
  cinematicReplayKey,
}: Props) {
  const selectedView = useMemo<RegionMapView>(() => {
    const selectedCityCountryId = selectedCityId ? getProductionLocation(selectedCityId)?.countryId : undefined;
    const selectedCountryMapId = selectedCountryId
      ? studioFinanceCountryNumericId(data, selectedCountryId)
      : undefined;
    if (selectedCityCountryId) return countryView(selectedCityCountryId);
    if (selectedCountryMapId) return countryView(selectedCountryMapId);
    if (selectedRegionId) return regionView(selectedRegionId as RegionMapView['regionId'] & string);
    return WORLD_VIEW;
  }, [data, selectedCityId, selectedCountryId, selectedRegionId]);
  const [mapView, setMapView] = useState<RegionMapView>(selectedView);
  useEffect(() => setMapView(selectedView), [selectedView]);
  const model = useMemo(
    () => createStudioFinanceMapModel(data, draft, selectedCityId, mapView, showNetworkRoutes),
    [data, draft, mapView, selectedCityId, showNetworkRoutes],
  );
  const presentedModel = useMemo(() => {
    if (!cinematic) return model;
    const committedCityIds = new Set(draft.facilities.map(facility => facility.cityId));
    return {
      ...model,
      locationPins: model.locationPins.filter(pin => committedCityIds.has(pin.id)),
    };
  }, [cinematic, draft.facilities, model]);
  const toolbarTitle = useMemo(() => {
    if (mapView.level === 'world') return 'Infrastructure world';
    if (mapView.level === 'region') {
      return data.regions.find(region => region.id === mapView.regionId)?.name ?? 'Infrastructure region';
    }
    const financeCountryId = mapView.countryId ? financeCountryMapId(data, mapView.countryId) : undefined;
    const country = data.countries.find(candidate => candidate.id === financeCountryId);
    const selectedCity = data.cities.find(candidate => candidate.id === selectedCityId);
    return selectedCity?.name ?? country?.name ?? 'Infrastructure country';
  }, [data, mapView, selectedCityId]);

  const handleViewChange = (next: RegionMapView) => {
    setMapView(next);
    if (next.level === 'region' && next.regionId) {
      if (onSelectRegion) onSelectRegion(next.regionId);
      else {
        const firstCity = data.cities.find(city => (
          data.countries.find(country => country.id === city.countryId)?.regionId === next.regionId
        ));
        if (firstCity) onSelectCity?.(firstCity.id);
      }
    }
    if (next.level === 'country' && next.countryId) {
      const financeCountryId = financeCountryMapId(data, next.countryId);
      if (financeCountryId) onSelectCountry?.(financeCountryId);
    }
  };

  const handleCitySelect = (cityId: string) => {
    const countryId = getProductionLocation(cityId)?.countryId;
    if (countryId) setMapView(countryView(countryId));
    onSelectCity?.(cityId);
  };

  return (
    <div className="bw-game-map">
      {!cinematic && (
        <MapNavigationToolbar
          scope="finance"
          title={toolbarTitle}
          status={`${draft.facilities.length} ${draft.facilities.length === 1 ? 'site' : 'sites'}`}
          view={mapView}
          onWorld={() => setMapView(WORLD_VIEW)}
          tone="production"
        />
      )}
      <InteractiveRegionMap
        {...presentedModel}
        interaction={cinematic ? 'cinematic' : presentedModel.interaction}
        minimumPinViewLevel={cinematic ? 'world' : presentedModel.minimumPinViewLevel}
        showSelectedPinsAcrossViews={!cinematic}
        showBreadcrumb={cinematic ? undefined : false}
        cinematic={cinematic ? { durationMs: cinematicDurationMs, replayKey: cinematicReplayKey } : undefined}
        onViewChange={cinematic ? undefined : handleViewChange}
        onSelectLocation={cinematic ? undefined : handleCitySelect}
        accentColor={data.company.brandHex}
        visualTone="production"
        compact
        showPreview={false}
        ariaLabel={`Infrastructure scout map: ${draft.facilities.length} ${draft.facilities.length === 1 ? 'site' : 'sites'} placed`}
      />
    </div>
  );
}
