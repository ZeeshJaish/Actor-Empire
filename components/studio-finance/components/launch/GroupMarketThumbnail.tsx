import { useMemo } from 'react';
import type { Country } from '../../finance/launch';
import { buildStreamingGroupMarketMap } from '../../finance/groupMarketMap';
import { WORLD_GRATICULE_PATH, WORLD_LAND_PATH } from '../../../../views/lifestyle/business/components/worldMapDetailedGeometry';

interface Props {
  name: string;
  countries: Country[];
  selectedIds: ReadonlySet<string>;
}

/** A compact, non-interactive view of the same geography used by the group report. */
export default function GroupMarketThumbnail({ name, countries, selectedIds }: Props) {
  const model = useMemo(
    () => buildStreamingGroupMarketMap(countries.map(country => country.id), selectedIds),
    [countries, selectedIds],
  );
  const [x, y, width, height] = model.viewBox;
  const pinRadius = Math.max(2.5, Math.min(4, width / 95));

  return (
    <svg
      className="lw-group-atlas"
      viewBox={`${x} ${y} ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`${name} market map preview`}
    >
      <path className="lw-group-atlas-graticule" d={WORLD_GRATICULE_PATH} aria-hidden="true" />
      <path className="lw-group-atlas-land" d={WORLD_LAND_PATH} aria-hidden="true" />
      {model.countries.map(country => (
        <g key={country.id} className={country.selected ? 'lw-group-atlas-country is-on' : 'lw-group-atlas-country'} aria-hidden="true">
          {country.path && <path d={country.path} />}
          <circle cx={country.x} cy={country.y} r={pinRadius + 1.8} className="lw-group-atlas-pin-ring" />
          <circle cx={country.x} cy={country.y} r={pinRadius} className="lw-group-atlas-pin" />
        </g>
      ))}
    </svg>
  );
}
