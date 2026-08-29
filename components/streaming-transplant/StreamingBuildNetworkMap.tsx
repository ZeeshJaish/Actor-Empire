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
import React, { useMemo } from 'react';
import css from './presentation/screens/Buildout/Buildout.module.css';
import { cx } from './presentation/cx';
import {
  CITIES,
  REGION_OF,
  WORLD_MASK,
  type City,
  type RegionId,
} from './StreamingBrandVisuals';
import type { StreamingNetworkNodeRole } from '../../types';

export interface NetworkMapNode {
  facilityId: string;
  city: City;
  racks: number;
  role: StreamingNetworkNodeRole;
  /** 0–1+; how much of this site's own ceiling a likely premiere night uses */
  load: number;
  /** false while the site is still only drawn */
  built: boolean;
}

/** How far up the brand ramp each role sits. An origin is the brightest thing
 *  on the map because it is the one site the network cannot lose. */
const ROLE_TONE: Record<StreamingNetworkNodeRole, { fill: string; rank: number }> = {
  CORE_ORIGIN: { fill: 'var(--epx-brand)', rank: 3 },
  REGIONAL_HUB: { fill: 'var(--epx-brand-lift)', rank: 2 },
  EDGE_CACHE: { fill: 'var(--epx-brand-deep)', rank: 1 },
};

const loadTone = (load: number) => (
  load >= 0.92 ? 'var(--epx-bad)' : load >= 0.75 ? 'var(--epx-warn)' : 'var(--epx-good)'
);

/** Rack count → node radius, in viewBox units. Deliberately compressed: a
 *  1-rack site must still read as a place on the map, and a 40-rack site must
 *  not swallow its neighbours. */
const radiusFor = (racks: number) => 0.95 + Math.min(1.9, Math.sqrt(Math.max(0, racks)) * 0.42);

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
  const dots = useMemo(() => {
    const out: { x: number; y: number; region: RegionId }[] = [];
    WORLD_MASK.forEach((row, y) => {
      [...row].forEach((char, x) => {
        const region = REGION_OF[char];
        if (region) out.push({ x, y, region });
      });
    });
    return out;
  }, []);

  /* The origin anchors every link. Falling back to the largest node keeps the
     map readable on legacy saves whose roles never got assigned. */
  const origin = useMemo(() => {
    if (!nodes.length) return null;
    return [...nodes].sort((a, b) => (
      ROLE_TONE[b.role].rank - ROLE_TONE[a.role].rank || b.racks - a.racks
    ))[0];
  }, [nodes]);

  const coverageSet = useMemo(() => new Set(coverage), [coverage]);
  const unservedSet = useMemo(() => new Set(unserved), [unserved]);

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
      <svg viewBox="0 0 64 26" preserveAspectRatio="xMidYMid meet" role="img"
        aria-label={`Network map: ${nodes.length} ${nodes.length === 1 ? 'site' : 'sites'} placed`}>

        {/* ── the world, dim ── */}
        <g>
          {dots.map((dot, i) => (
            <circle key={i} cx={dot.x + 0.5} cy={dot.y + 0.5}
              r={coverageSet.has(dot.region) ? 0.34 : 0.26}
              className={cx(
                css.mapDot,
                coverageSet.has(dot.region) ? css.lit : '',
                unservedSet.has(dot.region) ? css.dark : '',
              )} />
          ))}
        </g>

        {/* ── dependency links back to the origin ── */}
        {origin && (
          <g>
            {nodes.filter(node => node.facilityId !== origin.facilityId).map(node => {
              const key = `${origin.facilityId}-${node.facilityId}`;
              return (
                <g key={key}>
                  <line
                    x1={origin.city.x + 0.5} y1={origin.city.y + 0.5}
                    x2={node.city.x + 0.5} y2={node.city.y + 0.5}
                    className={cx(css.mapLink, node.built ? '' : css.planned)} />
                  {live && node.built && (
                    <circle r="0.22" className={cx(css.mapPulse, 'loop')}>
                      {/* The pulse rides the same geometry as its link, so the two
                          can never disagree about where a route goes. */}
                      <animate attributeName="cx" dur="2.6s" repeatCount="indefinite"
                        values={`${origin.city.x + 0.5};${node.city.x + 0.5}`} />
                      <animate attributeName="cy" dur="2.6s" repeatCount="indefinite"
                        values={`${origin.city.y + 0.5};${node.city.y + 0.5}`} />
                      <animate attributeName="opacity" dur="2.6s" repeatCount="indefinite"
                        values="0;1;1;0" keyTimes="0;0.1;0.8;1" />
                    </circle>
                  )}
                </g>
              );
            })}
          </g>
        )}

        {/* ── the sites ── */}
        {nodes.map(node => {
          const r = radiusFor(node.racks);
          const selected = node.facilityId === selectedFacilityId;
          const cx0 = node.city.x + 0.5;
          const cy0 = node.city.y + 0.5;
          /* Circumference of the load ring, so stroke-dasharray can fill it by
             percentage without any layout maths. */
          const ringR = r + 0.5;
          const circumference = 2 * Math.PI * ringR;
          const filled = Math.min(1, Math.max(0, node.load)) * circumference;

          return (
            <g key={node.facilityId}
              className={cx(css.mapNode, selected ? css.on : '', node.built ? '' : css.planned)}
              onClick={onSelect ? () => onSelect(node.facilityId) : undefined}
              role={onSelect ? 'button' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onKeyDown={onSelect ? event => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(node.facilityId);
                }
              } : undefined}
              aria-label={`${node.city.label}, ${node.racks} racks, ${Math.round(node.load * 100)}% of capacity`}>

              {/* a generous invisible target — the visible node is far too small to tap */}
              <circle cx={cx0} cy={cy0} r="1.9" fill="transparent" />

              <circle cx={cx0} cy={cy0} r={ringR}
                className={css.mapRing}
                style={{
                  strokeDasharray: `${filled} ${circumference}`,
                  stroke: loadTone(node.load),
                  transform: `rotate(-90deg)`,
                  transformOrigin: `${cx0}px ${cy0}px`,
                }} />

              <circle cx={cx0} cy={cy0} r={r}
                className={css.mapCore}
                style={{ fill: node.built ? ROLE_TONE[node.role].fill : 'transparent',
                         stroke: ROLE_TONE[node.role].fill }} />

              {node.role === 'CORE_ORIGIN' && node.built && (
                <circle cx={cx0} cy={cy0} r={r * 0.36} className={css.mapOriginPip} />
              )}
            </g>
          );
        })}
      </svg>

      {/* City names are HTML rather than <text>, because SVG text scales with
          the viewBox and would land far below the 11px legibility floor on a
          phone. Positioning by percentage keeps them locked to their node. */}
      <div className={css.mapLabels} aria-hidden="true">
        {nodes.map(node => {
          const xPercent = ((node.city.x + 0.5) / 64) * 100;
          /* A label centred on a node near either edge would be clipped by the
             card, so the anchor flips instead of the label being cut. Sydney
             and Vancouver sit far enough out for this to matter. */
          const edge = xPercent > 82 ? 'end' : xPercent < 18 ? 'start' : 'mid';
          return (
            <span key={node.facilityId}
              className={cx(
                css.mapLabel,
                edge === 'end' ? css.alignEnd : edge === 'start' ? css.alignStart : '',
                node.facilityId === selectedFacilityId ? css.on : '',
              )}
              style={{
                left: `${xPercent}%`,
                top: `${((node.city.y + 0.5) / 26) * 100}%`,
              }}>
              {node.city.label}
            </span>
          );
        })}
      </div>

      {/* The legend is three words, not a table — it exists so the ring and the
          hollow node are readable without a tutorial. */}
      <div className={css.mapKey}>
        <span><i className={css.keyOrigin} />Origin</span>
        <span><i className={css.keyHub} />Relay</span>
        <span><i className={css.keyEdge} />Cache</span>
        <span><i className={css.keyPlanned} />Drawn</span>
      </div>
    </div>
  );
};
