import { useMemo, type KeyboardEvent } from 'react';
import type { Country } from '../../finance/launch';
import { buildStreamingGroupMarketMap } from '../../finance/groupMarketMap';
import { WORLD_LAND_PATH } from '../../../../views/lifestyle/business/components/worldMapDetailedGeometry';

interface Props {
  countries: Country[];
  selectedIds: ReadonlySet<string>;
  onToggle: (countryId: string) => void;
}

export default function GroupMarketMap({ countries, selectedIds, onToggle }: Props) {
  const model = useMemo(
    () => buildStreamingGroupMarketMap(countries.map(country => country.id), selectedIds),
    [countries, selectedIds],
  );
  const names = new Map(countries.map(country => [country.id, country.name]));
  const [x, y, width, height] = model.viewBox;
  const activate = (event: KeyboardEvent<SVGGElement>, countryId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onToggle(countryId);
    }
  };

  return (
    <div className="lw-group-map">
      <svg viewBox={`${x} ${y} ${width} ${height}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Group market map">
        <path className="lw-group-map-land" d={WORLD_LAND_PATH} aria-hidden="true" />
        {model.countries.map(country => (
          <g
            key={country.id}
            className={country.selected ? 'lw-group-map-country is-on' : 'lw-group-map-country'}
            role="button"
            tabIndex={0}
            aria-label={`${country.selected ? 'Remove' : 'Add'} ${names.get(country.id) ?? country.id}`}
            aria-pressed={country.selected}
            onClick={() => onToggle(country.id)}
            onKeyDown={event => activate(event, country.id)}
          >
            <title>{names.get(country.id) ?? country.id}{country.markerOnly ? ' · position marker' : ''}</title>
            {country.path && <path d={country.path} />}
            <circle className="lw-group-map-hit" cx={country.x} cy={country.y} r="11" />
            <circle className="lw-group-map-pin" cx={country.x} cy={country.y} r={country.markerOnly ? '5' : '3.5'} />
          </g>
        ))}
      </svg>
      <div className="lw-group-map-key">
        <span><i className="is-picked" /> Opening day</span>
        <span><i /> Not selected</span>
        <small>Small islands use a position pin. The country list below is also selectable.</small>
      </div>
    </div>
  );
}
