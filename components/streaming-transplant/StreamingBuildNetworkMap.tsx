/**
 * EMPIRE+ — THE NETWORK MAP
 *
 * The Build screen used to describe the network in three different lists: a
 * route of chips, a preset summary line, and a grid of facility cards. Three
 * readings of one fact, none of which told the player the thing that actually
 * matters — where the machines are, how big each site is, and which parts of
 * the world they cannot reach.
 *
 * This draws it once. Continents are the same dot matrix the founding map uses,
 * so the player recognises the projection they already chose their markets on.
 * On top of it:
 *
 *   · one node per facility, its RADIUS set by rack count — size is capacity
 *   · a ring around each node filled by how hard opening night pushes it, so a
 *     site running hot reads before a number is read
 *   · links from every relay and cache back to the origin, because that
 *     dependency is real and the rehearsal punishes players who forget it
 *   · a pulse travelling those links, which is the only decoration here and
 *     exists so a built network looks alive rather than diagrammed
 *   · day-one markets you cannot serve, marked in the failure colour
 *
 * It renders the drawing, never the truth: `built` marks which facilities are
 * actually standing so planned sites can be drawn as outlines. The screen above
 * owns every number; this component derives nothing.
 */
import React, { useMemo, useState } from 'react';
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';
import type { RegionId } from './StreamingBrandVisuals';
import {
  InteractiveRegionMap,
  WORLD_VIEW,
  countryView,
  type RegionMapView,
} from '../../views/lifestyle/business/components/InteractiveRegionMap';
import { MapNavigationToolbar } from '../../views/lifestyle/business/components/MapNavigationToolbar';
import {
  createStreamingNetworkMapModel,
  type NetworkMapNode,
} from './streamingNetworkMap';

export type { NetworkMapNode } from './streamingNetworkMap';

export const StreamingBuildNetworkMap: React.FC<{
  nodes: NetworkMapNode[];
  /** every region the app can be opened in, lit under the network */
  coverage: RegionId[];
  /** day-one regions with no node able to serve them */
  unserved: RegionId[];
  selectedFacilityId?: string | null;
  onSelect?: (facilityId: string) => void;
  /** suppresses the traffic pulse before anything is commissioned */
  live?: boolean;
  /** Render with its own map skin when mounted outside the legacy Build shell. */
  embedded?: boolean;
}> = ({ nodes, coverage, unserved, selectedFacilityId, onSelect, live, embedded }) => {
  const [mapView, setMapView] = useState<RegionMapView>(WORLD_VIEW);
  const model = useMemo(
    () => createStreamingNetworkMapModel(nodes, coverage, unserved, selectedFacilityId, live, mapView),
    [coverage, live, mapView, nodes, selectedFacilityId, unserved],
  );
  const toolbarTitle = mapView.level === 'world'
    ? 'Network world'
    : nodes.find(node => node.facilityId === selectedFacilityId)?.city.label
      ?? mapView.regionId?.toLowerCase().split('_').map(part => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(' ')
      ?? 'Network region';

  if (!nodes.length) {
    return (
      <div className={cx(css.mapEmpty, embedded ? css.mapEmbeddedEmpty : '')}>
        <span className={css.mapEmptyMark} aria-hidden="true" />
        <b>No machines anywhere yet</b>
        <p>Pick a network size below and your team will place the first sites.</p>
      </div>
    );
  }

  return (
    <div className={cx(css.map, embedded ? css.mapEmbedded : '')}>
      <MapNavigationToolbar
        scope="streaming"
        title={toolbarTitle}
        status={`${nodes.length} ${nodes.length === 1 ? 'site' : 'sites'}`}
        view={mapView}
        onWorld={() => setMapView(WORLD_VIEW)}
        tone="network"
      />
      <InteractiveRegionMap
        {...model}
        onViewChange={setMapView}
        onSelectLocation={facilityId => {
          const countryId = nodes.find(node => node.facilityId === facilityId)?.city.countryId;
          if (countryId) setMapView(countryView(countryId));
          onSelect?.(facilityId);
        }}
        visualTone="production"
        compact
        frameHeight={560}
        showPreview={false}
        showWorldRegionLabels={false}
        showBreadcrumb={false}
        showShelf={false}
        showRelief={false}
        ariaLabel={`Network map: ${nodes.length} ${nodes.length === 1 ? 'site' : 'sites'} placed`}
      />

      {/* The legend is three words, not a table — it exists so the ring and the
          hollow node are readable without a tutorial. */}
      <div className={css.mapKey} aria-label="Network map legend">
        <span><i className={css.keyOrigin} />Origin</span>
        <span><i className={css.keyHub} />Relay</span>
        <span><i className={css.keyEdge} />Cache</span>
        <span><i className={css.keyPlanned} />Drawn</span>
      </div>
    </div>
  );
};
