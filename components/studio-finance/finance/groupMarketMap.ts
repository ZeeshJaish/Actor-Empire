import { getCountryPosition, getCountryShapeId } from '../../../services/worldEconomy/worldCountryGeography';
import { boundsForCountry, getCountryPath, projectLonLat } from '../../../views/lifestyle/business/components/worldMapDetailedGeometry';

export interface StreamingGroupMapCountry {
  id: string;
  x: number;
  y: number;
  path: string;
  markerOnly: boolean;
  selected: boolean;
}

export interface StreamingGroupMapModel {
  countries: StreamingGroupMapCountry[];
  viewBox: readonly [number, number, number, number];
}

/** The report map is a view over country geography, never a second market model. */
export const buildStreamingGroupMarketMap = (
  countryIds: readonly string[],
  selectedIds: ReadonlySet<string>,
): StreamingGroupMapModel => {
  const countries = countryIds.map((id): StreamingGroupMapCountry => {
    const position = getCountryPosition(id);
    if (!position) throw new Error(`Group market ${id} has no geographic position`);
    const point = projectLonLat(position.longitude, position.latitude);
    if (!point) throw new Error(`Group market ${id} has no projected position`);
    const shapeId = getCountryShapeId(id);
    const path = shapeId ? getCountryPath(shapeId) : '';
    return { id, x: point[0], y: point[1], path, markerOnly: !path, selected: selectedIds.has(id) };
  });

  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
  countries.forEach((country) => {
    left = Math.min(left, country.x);
    top = Math.min(top, country.y);
    right = Math.max(right, country.x);
    bottom = Math.max(bottom, country.y);
    if (!country.markerOnly) {
      const shapeId = getCountryShapeId(country.id)!;
      const [[x0, y0], [x1, y1]] = boundsForCountry(shapeId);
      /* A territory on another side of the world must not turn a local group
         into a world-wide letterbox. Its marker still anchors the market. */
      left = Math.min(left, Math.max(country.x - 135, x0));
      top = Math.min(top, Math.max(country.y - 95, y0));
      right = Math.max(right, Math.min(country.x + 135, x1));
      bottom = Math.max(bottom, Math.min(country.y + 95, y1));
    }
  });
  if (countries.length === 0) return { countries, viewBox: [0, 0, 1000, 520] };
  const midX = (left + right) / 2;
  const midY = (top + bottom) / 2;
  let width = Math.max(150, right - left + 60);
  let height = Math.max(90, bottom - top + 42);
  const aspect = 16 / 9;
  if (width / height > aspect) height = width / aspect;
  else width = height * aspect;
  return { countries, viewBox: [midX - width / 2, midY - height / 2, width, height] };
};
