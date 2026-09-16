import type { BoxOfficeRegionId, StreamingNetworkNodeRole } from '../../types';
import type { RegionMapLocationPin, RegionMapLocationRoute } from '../../services/regionMap';
import type { RegionMapView } from '../../views/lifestyle/business/components/regionMapView';
import type { City, RegionId } from './StreamingBrandVisuals';

export interface NetworkMapNode {
  facilityId: string;
  city: City;
  racks: number;
  role: StreamingNetworkNodeRole;
  /** 0–1+; how much of this site's own ceiling a likely premiere night uses. */
  load: number;
  /** False while the site is still only drawn. */
  built: boolean;
}

export interface StreamingNetworkMapModel {
  selectedRegionIds: BoxOfficeRegionId[];
  warningRegionIds: BoxOfficeRegionId[];
  activeRegionId: BoxOfficeRegionId | null;
  locationPins: RegionMapLocationPin[];
  locationRoutes: RegionMapLocationRoute[];
  interaction: 'drilldown';
  maximumViewLevel: 'country';
  minimumPinViewLevel: 'world';
  view: RegionMapView;
}

const ROLE_RANK: Record<StreamingNetworkNodeRole, number> = {
  CORE_ORIGIN: 3,
  REGIONAL_HUB: 2,
  EDGE_CACHE: 1,
};

const ROLE_VARIANT: Record<StreamingNetworkNodeRole, NonNullable<RegionMapLocationPin['variant']>> = {
  CORE_ORIGIN: 'origin',
  REGIONAL_HUB: 'relay',
  EDGE_CACHE: 'cache',
};

/** Rack count becomes a readable screen-pixel radius without swallowing nearby cities. */
export const radiusForStreamingRacks = (racks: number): number => (
  Number((4.5 + Math.min(4.5, Math.sqrt(Math.max(0, racks)) * 0.65)).toFixed(2))
);

export function createStreamingNetworkMapModel(
  nodes: NetworkMapNode[],
  coverage: RegionId[],
  unserved: RegionId[],
  selectedFacilityId: string | null | undefined,
  live: boolean | undefined,
  view: RegionMapView,
): StreamingNetworkMapModel {
  const origin = nodes.length
    ? [...nodes].sort((a, b) => ROLE_RANK[b.role] - ROLE_RANK[a.role] || b.racks - a.racks)[0]
    : undefined;
  const selectedNode = nodes.find(node => node.facilityId === selectedFacilityId);
  const locationPins: RegionMapLocationPin[] = nodes.map(node => ({
    id: node.facilityId,
    name: node.city.label,
    badge: `${node.role.replaceAll('_', ' ')} · ${node.racks} RACKS`,
    ariaLabel: `${node.city.label}, ${node.racks} racks, ${Math.round(node.load * 100)}% of capacity`,
    x: node.city.x / 0.64,
    y: node.city.y / 0.26,
    longitude: node.city.longitude,
    latitude: node.city.latitude,
    regionId: node.city.region,
    countryId: node.city.countryId,
    countryCode: node.city.countryCode,
    selected: node.facilityId === selectedFacilityId,
    market: coverage.includes(node.city.region),
    state: node.facilityId === selectedFacilityId ? 'active' : node.built ? 'built' : 'planned',
    variant: ROLE_VARIANT[node.role],
    size: radiusForStreamingRacks(node.racks),
    load: node.load,
    built: node.built,
  }));
  const locationRoutes: RegionMapLocationRoute[] = origin
    ? nodes.filter(node => node.facilityId !== origin.facilityId).map(node => {
        const planned = !origin.built || !node.built;
        return {
          fromId: origin.facilityId,
          toId: node.facilityId,
          planned,
          animated: Boolean(live && !planned),
        };
      })
    : [];

  return {
    selectedRegionIds: coverage as BoxOfficeRegionId[],
    warningRegionIds: unserved as BoxOfficeRegionId[],
    activeRegionId: selectedNode?.city.region ?? null,
    locationPins,
    locationRoutes,
    interaction: 'drilldown',
    maximumViewLevel: 'country',
    minimumPinViewLevel: 'world',
    view,
  };
}
