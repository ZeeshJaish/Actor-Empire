import { useMemo } from 'react';
import type { BoxOfficeRegionId } from '../../../../types';
import {
  InteractiveRegionMap,
  type RegionMapLocationPin,
} from '../../../../views/lifestyle/business/components/InteractiveRegionMap';
import type { BuildData, BuildDraft, CountryService } from '../../finance/build';

interface Props {
  data: BuildData;
  draft: BuildDraft;
  services: CountryService[];
  selectedCityId?: string;
  onSelectCity?: (cityId: string) => void;
}

/**
 * Build uses the exact interactive map component from Production House's
 * Scout Location step. Only the pins and selected regions come from the
 * infrastructure draft; the projection, topology, ocean, land treatment and
 * interaction remain shared with Production House.
 */
export function WorldMap({ data, draft, selectedCityId, onSelectCity }: Props) {
  const countryById = useMemo(
    () => new Map(data.countries.map(country => [country.id, country])),
    [data.countries],
  );
  const facilityCityIds = useMemo(
    () => new Set(draft.facilities.map(facility => facility.cityId)),
    [draft.facilities],
  );
  const selectedCity = data.cities.find(city => city.id === selectedCityId);
  const selectedRegionIds = useMemo<BoxOfficeRegionId[]>(() => Array.from(new Set(
    data.cities.flatMap(city => {
      if (!facilityCityIds.has(city.id)) return [];
      const regionId = countryById.get(city.countryId)?.regionId;
      return regionId ? [regionId as BoxOfficeRegionId] : [];
    }),
  )), [countryById, data.cities, facilityCityIds]);
  const activeRegionId = selectedCity
    ? countryById.get(selectedCity.countryId)?.regionId as BoxOfficeRegionId | undefined
    : undefined;
  const locationPins = useMemo<RegionMapLocationPin[]>(() => data.cities.map(city => ({
    id: city.id,
    name: city.name,
    x: city.plot.x,
    y: city.plot.y,
    longitude: city.coord.lng,
    latitude: city.coord.lat,
    selected: facilityCityIds.has(city.id),
    regionId: countryById.get(city.countryId)?.regionId as BoxOfficeRegionId | undefined,
  })), [countryById, data.cities, facilityCityIds]);

  return (
    <div className="bw-game-map">
      <InteractiveRegionMap
        selectedRegionIds={selectedRegionIds}
        activeRegionId={activeRegionId ?? null}
        onSelectRegion={regionId => {
          const firstCity = data.cities.find(
            city => countryById.get(city.countryId)?.regionId === regionId,
          );
          if (firstCity) onSelectCity?.(firstCity.id);
        }}
        locationPins={locationPins}
        onSelectLocation={cityId => onSelectCity?.(cityId)}
        visualTone="production"
        compact
        showPreview={false}
        ariaLabel={`Infrastructure scout map: ${draft.facilities.length} ${draft.facilities.length === 1 ? 'site' : 'sites'} placed`}
      />
    </div>
  );
}
