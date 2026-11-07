/**
 * #253: the network at night: the world dark, the service's markets faintly its colour, and a light for every city that is online. The opening's waiting
 * screen lights them as the weeks pass; the opening night's record has them all on. Two layers on purpose: the world is drawn once and never repaints, and
 * only the small pulses above it move, so a big network costs no frames.
 */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { AtlasWorld, ATLAS_H, ATLAS_W, atlasFitBox, countryGeoOf, type AtlasBox } from './AudienceAtlas';
import { lightHasCountry, lightMergedPath, lightWorld } from './audienceAtlasGeometry';
import { projectLonLat } from '../../views/lifestyle/business/components/worldMapDetailedGeometry';
import type { StreamingNetworkMapView } from '../../services/streamingNetworkMapView';
import { cx } from './presentation/cx';
import './presentation/screens/AudienceDesk/AudienceDesk.module.css';
import atlas from './presentation/screens/AudienceDesk/AudienceAtlas.module.css';
import css from './presentation/screens/OpeningBuild/LightsMap.module.css';

const MIN_BOX_W = 170;
/* crews at work: the next few cities in line */
const CREW_PULSES = 4;

export const StreamingLightsMap = React.memo(function StreamingLightsMap({ accent, network, lit, className }: {
  accent: string;
  network: StreamingNetworkMapView;
  /** how many cities are online, in the network's own order */
  lit: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, '');
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 390, h: 300 });
  useEffect(() => {
    const element = frame.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const aspect = size.w / size.h;

  const sites = useMemo(() => network.sites.flatMap(site => {
    const point = projectLonLat(site.lng, site.lat);
    return point ? [{ ...site, point }] : [];
  }), [network.sites]);

  const territory = useMemo(() => {
    const shapes: string[] = [];
    const points: Array<[number, number]> = [];
    network.markets.forEach(market => {
      const geo = countryGeoOf(market.countryId);
      if (geo.point) points.push(geo.point);
      if (geo.shapeId && lightHasCountry(geo.shapeId)) shapes.push(geo.shapeId);
    });
    return { path: shapes.length ? lightMergedPath(shapes) : '', points };
  }, [network.markets]);

  const box = useMemo<AtlasBox>(() => {
    const xs = [...territory.points.map(point => point[0]), ...sites.map(site => site.point[0])];
    const ys = [...territory.points.map(point => point[1]), ...sites.map(site => site.point[1])];
    if (!xs.length) return atlasFitBox({ x: 120, y: 48, w: 870, h: 420 }, aspect);
    const x0 = Math.min(...xs); const x1 = Math.max(...xs);
    const y0 = Math.min(...ys); const y1 = Math.max(...ys);
    let w = Math.max(MIN_BOX_W, (x1 - x0) * 1.24);
    let h = Math.max(MIN_BOX_W / aspect, (y1 - y0) * 1.5);
    w = Math.min(w, ATLAS_W + 80); h = Math.min(h, ATLAS_H + 80);
    /* the words sit over the bottom of the picture: the ground goes above them */
    return atlasFitBox({ x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h * 0.62, w, h }, aspect);
  }, [territory.points, sites, aspect]);

  const unit = box.w / Math.max(1, size.w);
  const maxRacks = Math.max(1, ...sites.map(site => site.racks));
  const viewBox = `${box.x} ${box.y} ${box.w} ${box.h}`;
  const lights = Math.max(0, Math.min(sites.length, lit));
  const crowded = sites.length > 40;
  const radius = (racks: number) => (crowded ? 1.5 + 1.5 * Math.sqrt(racks / maxRacks) : 2.4 + 2.6 * Math.sqrt(racks / maxRacks)) * unit;

  return (
    <div ref={frame} className={cx(css.lights, className)} style={{ ['--lights-accent' as string]: accent }} aria-hidden="true">
      {/* the world: drawn once */}
      <svg className={css.layer} viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
        {/* a sea past the world's own, for a frame taller than the map */}
        <rect x={box.x - 400} y={box.y - 400} width={box.w + 800} height={box.h + 800} className={css.deep} />
        <AtlasWorld uid={uid} onSea={NOTHING} />
        <rect x={box.x - 400} y={box.y - 400} width={box.w + 800} height={box.h + 800} className={css.night} />
        {territory.path && <path d={territory.path} className={css.markets} vectorEffect="non-scaling-stroke" />}
        <path d={lightWorld().borders} className={cx(atlas.coast, css.coast)} vectorEffect="non-scaling-stroke" />
      </svg>
      {/* the cities: repainted only when a week lights another */}
      <svg className={css.layer} viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
        {sites.map((site, index) => {
          const on = index < lights;
          const r = radius(site.racks);
          return on
            ? <g key={site.id}><circle cx={site.point[0]} cy={site.point[1]} r={r * 3.2} className={css.halo} /><circle cx={site.point[0]} cy={site.point[1]} r={r} className={css.on} /></g>
            : <circle key={site.id} cx={site.point[0]} cy={site.point[1]} r={Math.max(r * 0.62, 1.1 * unit)} className={css.off} />;
        })}
      </svg>
      {/* the crews at work: the only thing that moves */}
      {lights < sites.length && (
        <svg className={css.layer} viewBox={viewBox} preserveAspectRatio="xMidYMid slice">
          {sites.slice(lights, lights + CREW_PULSES).map((site, index) => (
            <circle key={site.id} cx={site.point[0]} cy={site.point[1]} r={6 * unit} className={css.crew} style={{ animationDelay: `${index * 0.45}s` }} />
          ))}
        </svg>
      )}
    </div>
  );
});

const NOTHING = () => undefined;
