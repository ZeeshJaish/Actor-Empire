import { useEffect, useMemo, useState } from 'react';
import { createWorldCountryCutout } from '../../../../views/lifestyle/business/components/worldMapGeometry';

type CountryCutoutFactory = typeof createWorldCountryCutout;

let detailedCountryCutoutFactoryPromise: Promise<CountryCutoutFactory> | undefined;

export function loadDetailedCountryCutoutFactory(): Promise<CountryCutoutFactory> {
  detailedCountryCutoutFactoryPromise ??= import(
    '../../../../views/lifestyle/business/components/worldMapDetailedGeometry'
  ).then(module => module.createWorldCountryCutout);
  return detailedCountryCutoutFactoryPromise;
}

interface Props {
  shape: string;
  countryCode?: string;
  countryName?: string;
  pins?: Array<{
    id: string;
    x: number;
    y: number;
    longitude?: number;
    latitude?: number;
    state?: 'idle' | 'picked' | 'built';
  }>;
  /** Fill the outline — used when the country is an opening market. */
  active?: boolean;
  height?: number;
  onPin?: (id: string) => void;
}

export function CountryShape({
  shape,
  countryCode,
  countryName,
  pins = [],
  active,
  height = 96,
  onPin,
}: Props) {
  const resolvedCode = (countryCode || (shape === 'uk' ? 'GB' : shape)).toUpperCase();
  const resolvedName = countryName || resolvedCode;
  const [cutoutFactory, setCutoutFactory] = useState<CountryCutoutFactory>(() => createWorldCountryCutout);

  useEffect(() => {
    let mounted = true;
    void loadDetailedCountryCutoutFactory()
      .then(factory => {
        if (mounted) setCutoutFactory(() => factory);
      })
      .catch(() => {
        // The lightweight atlas remains a complete, interactive fallback.
      });
    return () => { mounted = false; };
  }, []);

  const cutout = useMemo(
    () => cutoutFactory(resolvedCode, resolvedName, 128, 100),
    [cutoutFactory, resolvedCode, resolvedName],
  );
  const mapDetail = cutoutFactory === createWorldCountryCutout ? '110m' : '50m';

  const pinPoints = pins.map(pin => {
    if (cutout && typeof pin.longitude === 'number' && typeof pin.latitude === 'number') {
      const projected = cutout.projection([pin.longitude, pin.latitude]);
      if (projected && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
        return { ...pin, x: projected[0], y: projected[1] };
      }
    }
    return pin;
  });

  return (
    <svg
      className={active ? 'ctry is-active' : 'ctry'}
      viewBox="0 0 128 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ height }}
      role="img"
      aria-label={`${resolvedName} infrastructure map`}
      data-map-source={cutout ? 'world-atlas' : 'coordinate-fallback'}
      data-map-detail={cutout ? mapDetail : undefined}
      data-country-geometry={cutout?.id}
    >
      {cutout && <path className="ctry-land" d={cutout.path} />}
      {cutout && <path className="ctry-edge" d={cutout.path} />}
      {pinPoints.map((pin) => (
        <g
          key={pin.id}
          className={`ctry-pin is-${pin.state ?? 'idle'}`}
          data-location-id={pin.id}
          onClick={() => onPin?.(pin.id)}
        >
          <circle className="ctry-pin-halo" cx={pin.x} cy={pin.y} r="7" />
          <circle className="ctry-pin-dot" cx={pin.x} cy={pin.y} r="3" />
        </g>
      ))}
    </svg>
  );
}
