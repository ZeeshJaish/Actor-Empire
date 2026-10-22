/* ============================================================================
   NETWORK MAP — the Platform room's picture of the delivery network.

   The same light world the Audience room draws (AtlasWorld), framed on the
   ground the network covers, with three things on it:

     · every market the service sells in, washed by how well it is served:
       your colour where it is served to the standard, amber where it is
       thin, red where no room reaches it;
     · every room's field — the radius the reach model gives it — as a soft
       disc, so more racks visibly take more ground;
     · every site as a marker sized by its racks, the core origin ringed.

   Every shape is a figure from the save (getStreamingNetworkMapView); nothing
   is decoration. Tapping a site names it; tapping the sea clears the name.
   ========================================================================== */

import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
/* the Audience desk's reset must reach the page before the atlas sheet: the
   two have equal specificity (see the note in AudienceAtlas.tsx) */
import './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import atlas from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import css from './presentation/screens/NetworkDesk/NetworkMap.module.css';
import { cx } from './presentation/cx';
import { AtlasWorld, ATLAS_H, ATLAS_W, atlasFitBox, countryGeoOf, type AtlasBox } from './AudienceAtlas';
import { lightHasCountry, lightMergedPath, lightWorld } from './audienceAtlasGeometry';
import { projectLonLat } from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';

const STATE_CLASS = { SERVED: 'served', THIN: 'thin', DARK: 'dark' } as const;
const MIN_BOX_W = 150;
/* field edges are drawn for small networks only; past this they are noise */
const FIELD_EDGE_LIMIT = 12;
const CROWDED_SITES = 30;
type Verdict = keyof typeof STATE_CLASS;

/* one merged shape per verdict, and a dot for markets too small to draw */
const territoryOf = (markets: StreamingNetworkMapView['markets']) => {
  const keys: Record<Verdict, string[]> = { SERVED: [], THIN: [], DARK: [] };
  const dots: Array<{ id: string; point: [number, number]; state: Verdict }> = [];
  const points: Array<[number, number]> = [];
  markets.forEach(market => {
    const geo = countryGeoOf(market.countryId);
    if (geo.point) points.push(geo.point);
    if (geo.shapeId && lightHasCountry(geo.shapeId)) keys[market.state].push(geo.shapeId);
    else if (geo.point) dots.push({ id: market.countryId, point: geo.point, state: market.state });
  });
  return {
    paths: (Object.keys(keys) as Verdict[]).map(state => ({ state, d: keys[state].length ? lightMergedPath(keys[state]) : '' })),
    dots,
    points,
  };
};

/** Merges (and caches) the market shapes a network view draws. The HQ runs it
    while idle, so the first open of the Network page does not pay for the
    merge — on a 197-country service that was most of the tap. */
export const warmNetworkMap = (view: StreamingNetworkMapView): void => { territoryOf(view.markets); };

/* A field's radius in the drawing space: project a point that far east of
   the site and measure. Natural Earth is not conformal, but over one field the
   difference does not show. */
const fieldRadius = (lat: number, lng: number, km: number): number => {
  const centre = projectLonLat(lng, lat);
  const east = projectLonLat(lng + km / (111.32 * Math.max(0.2, Math.cos(lat * Math.PI / 180))), lat);
  if (!centre || !east) return 0;
  return Math.hypot(east[0] - centre[0], east[1] - centre[1]);
};

export const NetworkMap = React.memo(function NetworkMap({ accent, view, selectedSiteId, onSelectSite }: {
  accent: string;
  view: StreamingNetworkMapView;
  selectedSiteId?: string | null;
  onSelectSite?: (siteId: string | null) => void;
}) {
  const uid = useId().replace(/:/g, '');
  const frame = useRef<SVGSVGElement>(null);
  const [frameSize, setFrameSize] = useState({ w: 347, h: 214 });
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setFrameSize({ w: width, h: height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const aspect = frameSize.w / frameSize.h;

  const sites = useMemo(() => view.sites.flatMap(site => {
    const point = projectLonLat(site.lng, site.lat);
    return point ? [{ ...site, point, radius: fieldRadius(site.lat, site.lng, site.reachKm) }] : [];
  }), [view.sites]);

  const territory = useMemo(() => territoryOf(view.markets), [view.markets]);

  /* frame the ground the network answers for: its markets and its fields */
  const target = useMemo<AtlasBox>(() => {
    const xs: number[] = [];
    const ys: number[] = [];
    territory.points.forEach(([x, y]) => { xs.push(x); ys.push(y); });
    sites.forEach(site => {
      const reach = Math.min(site.radius, 120);
      xs.push(site.point[0] - reach, site.point[0] + reach);
      ys.push(site.point[1] - reach, site.point[1] + reach);
    });
    if (!xs.length) return atlasFitBox({ x: 120, y: 48, w: 870, h: 420 }, aspect);
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    let w = Math.max(MIN_BOX_W, (x1 - x0) * 1.3);
    let h = Math.max(MIN_BOX_W / aspect, (y1 - y0) * 1.3);
    w = Math.min(w, ATLAS_W + 80); h = Math.min(h, ATLAS_H + 80);
    return atlasFitBox({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h }, aspect);
  }, [territory.points, sites, aspect]);
  /* No camera flight: this map never refocuses, and flying from the first
     guess of the frame's size to the measured one re-drew a hundred-site
     network on every frame of the 620 ms flight. */
  const box = target;
  const unit = box.w / Math.max(1, frameSize.w);
  const maxRacks = Math.max(1, ...sites.map(site => site.racks));
  const crowded = sites.length > CROWDED_SITES;
  const selected = sites.find(site => site.id === selectedSiteId) ?? null;
  const counts = {
    SERVED: view.markets.filter(market => market.state === 'SERVED').length,
    THIN: view.markets.filter(market => market.state === 'THIN').length,
    DARK: view.markets.filter(market => market.state === 'DARK').length,
  };

  return (
    <div className={cx(atlas.atlas, css.map)} style={{ ['--atlas-accent' as string]: accent }}>
      <svg ref={frame} className={atlas.atlasSvg} viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
        preserveAspectRatio="xMidYMid slice" role="group" aria-label="Delivery network map">
        <AtlasWorld uid={uid} onSea={() => onSelectSite?.(null)} />

        {/* the markets, by verdict */}
        <g className={atlas.markets}>
          {territory.paths.map(path => path.d && (
            <path key={path.state} d={path.d} className={cx(css.market, css[STATE_CLASS[path.state]])} vectorEffect="non-scaling-stroke" />
          ))}
          {territory.dots.map(dot => (
            <circle key={dot.id} cx={dot.point[0]} cy={dot.point[1]} r={2.6 * unit} className={cx(css.market, css[STATE_CLASS[dot.state]])} vectorEffect="non-scaling-stroke" />
          ))}
        </g>
        <path d={lightWorld().borders} className={atlas.coast} vectorEffect="non-scaling-stroke" />

        {/* every room's field, as one shape: solid discs inside a group whose
            opacity is applied once, after they are composited, so overlapping
            fields read as one covered area instead of stacking into a blot */}
        <g className={css.fields}>
          {sites.map(site => site.radius > 0 && (
            <circle key={site.id} cx={site.point[0]} cy={site.point[1]} r={site.radius} />
          ))}
        </g>
        {sites.length <= FIELD_EDGE_LIMIT && (
          <g className={css.fieldEdges}>
            {sites.map(site => site.radius > 0 && (
              <circle key={site.id} cx={site.point[0]} cy={site.point[1]} r={site.radius} className={css.fieldEdge} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        )}

        {/* the sites */}
        <g className={css.sites}>
          {sites.map(site => {
            /* a big network gets smaller markers, so a hundred sites stay a map */
            const r = (crowded ? 1.6 + 1.6 * Math.sqrt(site.racks / maxRacks) : 3 + 3.4 * Math.sqrt(site.racks / maxRacks)) * unit;
            return (
              <g key={site.id} className={cx(css.site, site.id === selectedSiteId && css.siteOn)}
                onClick={event => { event.stopPropagation(); onSelectSite?.(site.id === selectedSiteId ? null : site.id); }}>
                <circle cx={site.point[0]} cy={site.point[1]} r={r + 7 * unit} className={css.siteHit} />
                {site.role === 'CORE ORIGIN' && !crowded && <circle cx={site.point[0]} cy={site.point[1]} r={r + 2.6 * unit} className={css.siteRing} vectorEffect="non-scaling-stroke" />}
                <circle cx={site.point[0]} cy={site.point[1]} r={r} className={css.siteCore} vectorEffect="non-scaling-stroke" />
              </g>
            );
          })}
        </g>

        {selected && (
          <text x={selected.point[0]} y={selected.point[1] - (10 + 3.4) * unit} className={css.siteLabel}
            fontSize={10 * unit} strokeWidth={3 * unit} textAnchor="middle">{selected.name.toUpperCase()}</text>
        )}
      </svg>

      <div className={css.key} aria-hidden="true">
        <span><i className={css.keyServed} />SERVED {counts.SERVED}</span>
        {counts.THIN > 0 && <span><i className={css.keyThin} />THIN {counts.THIN}</span>}
        {counts.DARK > 0 && <span><i className={css.keyDark} />DARK {counts.DARK}</span>}
      </div>
      <div className={css.reading}>
        <b>{Math.round(view.served * 100)}%</b>
        <span>of your audience<br />served well</span>
      </div>
      <div className={css.readingSide}>
        <b>{view.sites.length}</b>
        <span>{view.sites.length === 1 ? 'site' : 'sites'}</span>
      </div>
    </div>
  );
});
