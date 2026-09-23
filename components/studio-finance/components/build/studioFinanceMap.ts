import type { BoxOfficeRegionId, StreamingNetworkNodeRole } from '../../../../types';
import {
  getProductionLocation,
  PRODUCTION_LOCATION_CATALOG,
} from '../../../../services/productionLocations';
import { getCountryIdByShapeId, getCountryShapeId } from '../../../../services/worldEconomy/worldCountryGeography';
import type {
  RegionMapLocationPin,
  RegionMapLocationRoute,
} from '../../../../services/regionMap';
import type { RegionMapView } from '../../../../views/lifestyle/business/components/regionMapView';
import { ROLE_VARIANT, radiusForStreamingRacks } from '../../../streaming-transplant/streamingNetworkMap';
import { projectFacilityNetworkRole } from '../../../../services/streamingRackGroups';
import { DUTIES, DUTY_TO_RACK_DUTY, facilityRacks, type BuildData, type BuildDraft, type CountryService } from '../../finance/build';

/** What the wizard calls the three network roles. The engine's own vocabulary is
    CORE_ORIGIN / REGIONAL_HUB / EDGE_CACHE; a player reads "Main library". The
    words come from `DUTIES` so the pin, the room card and the rack tray cannot
    call the same thing three names. */
const ROLE_LABEL: Record<StreamingNetworkNodeRole, string> = {
  CORE_ORIGIN: DUTIES.ORIGIN.name,
  REGIONAL_HUB: DUTIES.REGIONAL.name,
  EDGE_CACHE: DUTIES.EDGE.name,
};

export interface StudioFinanceMapModel {
  selectedRegionIds: BoxOfficeRegionId[];
  marketRegionIds: BoxOfficeRegionId[];
  /** Regions holding a market the network is not actually serving well. The
      atlas has painted this all along; this model passed it zero times, which
      is why "this region is not done yet" was invisible on the one screen
      whose whole job is to answer it. */
  warningRegionIds: BoxOfficeRegionId[];
  /** The opening markets, drawn solid at every zoom. */
  filledCountryIds: string[];
  /** How well each of them is being served, 0–1, as the strength of that fill. */
  countryFillStrength: Record<string, number>;
  activeRegionId: BoxOfficeRegionId | null;
  locationPins: RegionMapLocationPin[];
  locationRoutes: RegionMapLocationRoute[];
  interaction: 'drilldown';
  maximumViewLevel: 'country';
  minimumPinViewLevel: 'world';
  view: RegionMapView;
}

/* These two used to route through `PRODUCTION_LOCATION_CATALOG` — the film
   location catalogue, which knows 25 countries. Every market outside those 25
   returned `undefined`, so the map could not paint it: Indonesia, Russia,
   Pakistan and 170 others were selectable and invisible. They read the country
   geography table now, which covers all 197. */

/** Translate shared-atlas numeric country ids back into Studio Finance ids. */
export function financeCountryMapId(data: BuildData, countryId: string): string | undefined {
  const countryCode = getCountryIdByShapeId(countryId);
  return countryCode
    ? data.countries.find(country => country.code.toUpperCase() === countryCode)?.id
    : undefined;
}

export function studioFinanceCountryNumericId(data: BuildData, financeCountryId: string): string | undefined {
  const countryCode = data.countries.find(country => country.id === financeCountryId)?.code.toUpperCase();
  return countryCode ? getCountryShapeId(countryCode) ?? undefined : undefined;
}

export function createStudioFinanceMapModel(
  data: BuildData,
  draft: BuildDraft,
  selectedCityId: string | undefined,
  view: RegionMapView,
  showNetworkRoutes: boolean,
  /** The engine's own verdict per market. Without it the map can draw where the
      rooms are but not whether they are working, which was the whole complaint. */
  services: CountryService[] = [],
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
  /* A region is a warning when a market inside it is not being served properly.
     READY and WATCH are a market being served; POOR, UNSTABLE and NONE are not,
     and those are the engine's own words for it. */
  const warningRegionIds = Array.from(new Set(services.flatMap(service => {
    if (service.state === 'READY' || service.state === 'WATCH') return [];
    const country = data.countries.find(candidate => candidate.code === service.code
      || candidate.code === service.marketId);
    return country ? [country.regionId as BoxOfficeRegionId] : [];
  })));

  /* The markets you are opening in, and how well each is actually served — the
     engine's own five-state verdict turned into the strength of a fill. */
  const SERVED: Record<string, number> = { READY: 1, WATCH: .72, POOR: .38, UNSTABLE: .2, NONE: 0 };
  const filledCountryIds: string[] = [];
  const countryFillStrength: Record<string, number> = {};
  data.countries.forEach(country => {
    if (!country.opening) return;
    const numericId = studioFinanceCountryNumericId(data, country.id);
    if (!numericId) return;
    filledCountryIds.push(numericId);
    const service = services.find(entry => entry.code === country.code || entry.marketId === country.code);
    countryFillStrength[numericId] = service ? SERVED[service.state] ?? 0 : 0;
  });

  const selectedCity = data.cities.find(city => city.id === selectedCityId);
  const activeRegionId = selectedCity
    ? countryById.get(selectedCity.countryId)?.regionId as BoxOfficeRegionId | undefined
    : view.regionId ?? undefined;

  const locationPins: RegionMapLocationPin[] = data.cities.map(city => {
    const canonical = getProductionLocation(city.id);
    const facilities = facilitiesByCity.get(city.id) ?? [];
    const built = facilities.some(facility => facility.built);
    const planned = facilities.length > 0 && !built;
    /* Merely looking at a city used to mark it `active`, which the atlas draws
       as a live site — so browsing Atlanta labelled it an active facility on a
       network with nothing in it, directly above a strip reading "0 sites".
       Being selected is not the same as being held. */
    const held = built || planned;
    const state: RegionMapLocationPin['state'] = held && city.id === selectedCityId
      ? 'active'
      : built
        ? 'built'
        : planned
          ? 'planned'
          : city.recommended
            ? 'recommended'
            : 'idle';
    /* What this city is FOR, in the engine's vocabulary, so a room full of
       caches cannot draw itself as an origin. `projectFacilityNetworkRole` is
       the engine's own precedence rule and `DUTY_TO_GAME` the one translation
       of the wizard's plain-English duties into it. */
    /* A facility from an older save or a thin fixture may carry no rack groups
       at all. The map is drawn on every frame of this stage now, so one of those
       must leave a pin undecorated rather than take the page down. */
    const drawn = facilities.filter(facility => Array.isArray(facility.groups) && facility.groups.length > 0);
    const racks = drawn.reduce((sum, facility) => sum + facilityRacks(facility), 0);
    const role = drawn.length > 0
      ? projectFacilityNetworkRole(drawn.flatMap(facility => facility.groups.map(group => ({
        id: group.id,
        name: group.name,
        rackCount: group.racks,
        duty: DUTY_TO_RACK_DUTY[group.duty],
      }))))
      : undefined;
    /* The atlas can also draw how hard a site is working, and the figure exists
       — `cityStandings` carries each city's anchored peak against its capacity.
       It is not wired here yet: that function re-projects the whole draft
       through the canonical bridge, and this model runs on every frame of a map
       that is now always on screen. It needs a cheaper source before it is
       worth the redraw. */

    return {
      id: city.id,
      name: city.name,
      /* Every city used to shout a badge — "RECOMMENDED MARKET", "FACILITY
         MARKET" — under its name, so two cities near each other overlapped into
         unreadable stacked capitals. A place you do not hold has nothing to say
         beyond its name. A place you do says what is in it. */
      badge: drawn.length > 0
        ? `${ROLE_LABEL[role ?? 'EDGE_CACHE']} · ${racks} ${racks === 1 ? 'rack' : 'racks'}`
        : undefined,
      /* `plot` is the legacy hand-placed position and a city may not carry one;
         the atlas projects from longitude and latitude anyway. It never mattered
         while the map was only drawn during shopping — now that the map is the
         page, a city without a plot must not take the whole stage down. */
      x: city.plot?.x ?? 50,
      y: city.plot?.y ?? 50,
      longitude: canonical?.longitude ?? city.coord?.lng,
      latitude: canonical?.latitude ?? city.coord?.lat,
      selected: city.id === selectedCityId,
      market: Boolean(countryById.get(city.countryId)?.opening),
      regionId: canonical?.regionId ?? countryById.get(city.countryId)?.regionId as BoxOfficeRegionId | undefined,
      countryId: canonical?.countryId,
      countryCode: canonical?.countryCode ?? city.code,
      state,
      built,
      /* The three the atlas has always been able to draw and this model never
         sent: what kind of site it is, how big it is, and how hard it is
         working. */
      variant: role ? ROLE_VARIANT[role] : undefined,
      size: drawn.length > 0 ? radiusForStreamingRacks(racks) : undefined,
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
    warningRegionIds,
    filledCountryIds,
    countryFillStrength,
    activeRegionId: activeRegionId ?? null,
    locationPins,
    locationRoutes,
    interaction: 'drilldown',
    maximumViewLevel: 'country',
    /* Sites were hidden until you had drilled into a region, so the world view
       of the real map showed coloured ground and no network at all — which is
       why an abstract constellation had to exist to show one. */
    minimumPinViewLevel: 'world',
    view,
  };
}
