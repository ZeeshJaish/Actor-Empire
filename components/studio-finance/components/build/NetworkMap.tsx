/* ============================================================================
   THE NETWORK MAP

   Not a world map — a constellation. Opening markets and network cities are
   projected from their real coordinates into the frame, then joined by the
   routes traffic would actually take. A market with no line running to it is
   the clearest possible way to say "nobody can watch here".

   Everything is drawn: no tiles, no map service, nothing to fetch.
   ========================================================================== */

import { useMemo } from 'react';
import type { BuildData, BuildDraft, City, CountryService, Coord } from '../../finance/build';
import { cityFor, distanceKm, facilityRacks } from '../../finance/build';

const W = 340;
const H = 190;
const PAD = 26;

interface Props {
  data: BuildData;
  draft: BuildDraft;
  services: CountryService[];
  selectedCityId?: string;
  onSelectCity?: (cityId: string) => void;
}

export function NetworkMap({ data, draft, services, selectedCityId, onSelectCity }: Props) {
  const points = useMemo(() => {
    const all: Coord[] = [
      ...data.markets.map((m) => m.coord),
      ...draft.facilities.map((f) => cityFor(data, f)?.coord).filter(Boolean) as Coord[],
      ...data.cities.filter((c) => c.recommended).map((c) => c.coord),
    ];
    if (all.length === 0) return { project: () => ({ x: W / 2, y: H / 2 }) };

    const lats = all.map((c) => c.lat);
    const lngs = all.map((c) => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const spanLat = Math.max(12, maxLat - minLat);
    const spanLng = Math.max(18, maxLng - minLng);

    return {
      project: (coord: Coord) => ({
        x: PAD + ((coord.lng - minLng) / spanLng) * (W - PAD * 2),
        y: PAD + ((maxLat - coord.lat) / spanLat) * (H - PAD * 2),
      }),
    };
  }, [data, draft.facilities]);

  const built = draft.facilities
    .map((f) => ({ facility: f, city: cityFor(data, f) }))
    .filter((x): x is { facility: typeof x.facility; city: City } => Boolean(x.city));

  return (
    <div className="nm">
      <svg className="nm-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Network map">
        <defs>
          <radialGradient id="nmGlow">
            <stop offset="0%" stopColor="rgb(var(--sf-brand-on-rgb))" stopOpacity="0.55" />
            <stop offset="100%" stopColor="rgb(var(--sf-brand-on-rgb))" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* A faint grid so the frame reads as a map rather than a void. */}
        <g className="nm-grid">
          {[0, 1, 2, 3, 4].map((i) => <line key={`h${i}`} x1="0" x2={W} y1={(H / 4) * i} y2={(H / 4) * i} />)}
          {[0, 1, 2, 3, 4, 5, 6].map((i) => <line key={`v${i}`} y1="0" y2={H} x1={(W / 6) * i} x2={(W / 6) * i} />)}
        </g>

        {/* Routes: every market to the city that serves it. */}
        {services.map((service) => {
          const market = data.markets.find((m) => m.id === service.marketId);
          if (!market) return null;
          const to = points.project(market.coord);
          const serving = built
            .map((b) => ({ ...b, km: distanceKm(market.coord, b.city.coord) }))
            .sort((a, b) => a.km - b.km)[0];
          if (!serving) return null;
          const from = points.project(serving.city.coord);
          return (
            <line
              key={`r-${service.marketId}`}
              className={`nm-route is-${service.state.toLowerCase()}`}
              x1={from.x} y1={from.y} x2={to.x} y2={to.y}
            />
          );
        })}

        {/* Cities the team suggests but nobody has leased. */}
        {data.cities.filter((c) => c.recommended && !built.some((b) => b.city.id === c.id)).map((city) => {
          const p = points.project(city.coord);
          return (
            <g key={`s-${city.id}`} className="nm-suggest" onClick={() => onSelectCity?.(city.id)}>
              <circle cx={p.x} cy={p.y} r="7" />
              <text x={p.x} y={p.y - 11}>{city.name}</text>
            </g>
          );
        })}

        {/* Markets. */}
        {services.map((service) => {
          const market = data.markets.find((m) => m.id === service.marketId);
          if (!market) return null;
          const p = points.project(market.coord);
          return (
            <g key={`m-${market.id}`} className={`nm-market is-${service.state.toLowerCase()}`}>
              <circle cx={p.x} cy={p.y} r="4.5" />
              <text x={p.x} y={p.y + 14}>{market.code}</text>
            </g>
          );
        })}

        {/* Facilities. Size follows rack count, so the shape of the network is
            the shape of where the machines actually are. */}
        {built.map(({ facility, city }) => {
          const p = points.project(city.coord);
          const racks = facilityRacks(facility);
          const size = 8 + Math.min(10, racks * 1.4);
          const on = city.id === selectedCityId;
          return (
            <g
              key={facility.id}
              className={`nm-site${on ? ' is-on' : ''}${facility.built ? ' is-built' : ''}`}
              onClick={() => onSelectCity?.(city.id)}
            >
              <circle cx={p.x} cy={p.y} r={size + 12} fill="url(#nmGlow)" className="nm-site-glow" />
              <rect x={p.x - size / 2} y={p.y - size / 2} width={size} height={size} rx="2.5" />
              <text x={p.x} y={p.y - size / 2 - 6}>{city.name}</text>
              <text className="nm-site-racks" x={p.x} y={p.y + size / 2 + 11}>{racks}</text>
            </g>
          );
        })}
      </svg>

      <div className="nm-key">
        <span><i className="is-ready" />Served</span>
        <span><i className="is-watch" />Strained</span>
        <span><i className="is-none" />No path</span>
      </div>
    </div>
  );
}
