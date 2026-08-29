/* ============================================================================
   COUNTRY SHAPES

   A country should look like itself. These are simplified silhouettes — not
   cartography, and not pretending to be: enough of the real outline that a
   player recognises the United States or Japan at 90 pixels, drawn in code so
   the game never waits on a map service or an asset pack.

   Cities plot onto the shape from a stored 0–100 position rather than from
   latitude, because a projection accurate enough to land Los Angeles on a
   stylised coastline is more trouble than it is worth.
   ========================================================================== */

const SHAPES: Record<string, string> = {
  /* Lower 48 with the Great Lakes notch and Florida. */
  us: 'M6 30 L30 26 L52 24 L74 25 L92 30 L88 38 L84 36 L78 42 L82 52 L76 62 L70 66 L66 78 L60 74 L52 70 L38 68 L24 60 L14 48 Z',
  /* Wide, with Hudson Bay bitten out of the middle. */
  ca: 'M4 44 L14 26 L30 18 L44 22 L48 34 L56 26 L64 20 L82 18 L94 28 L92 44 L80 52 L66 50 L58 58 L44 56 L30 62 L16 58 Z',
  mx: 'M12 20 L40 18 L52 26 L58 40 L70 44 L80 56 L88 76 L76 74 L66 60 L54 52 L40 44 L24 34 Z',
  br: 'M30 12 L52 10 L66 18 L74 34 L78 54 L66 74 L50 86 L36 78 L28 60 L22 40 L24 22 Z',
  ar: 'M44 10 L58 14 L60 34 L56 56 L50 78 L44 90 L38 74 L40 50 L38 28 Z',
  /* Great Britain, with Ireland beside it. */
  uk: 'M46 8 L56 14 L58 26 L64 32 L60 44 L64 56 L58 70 L48 78 L42 66 L46 52 L40 40 L44 24 Z M18 34 L30 32 L34 44 L28 54 L18 50 L14 42 Z',
  fr: 'M20 30 L34 20 L52 18 L66 24 L74 36 L70 52 L58 66 L44 72 L30 66 L20 52 L16 40 Z',
  de: 'M34 12 L52 10 L62 20 L58 32 L66 42 L60 58 L48 70 L36 62 L30 48 L34 34 L28 22 Z',
  es: 'M14 30 L36 22 L60 24 L78 32 L74 48 L58 58 L36 60 L20 50 Z',
  /* The subcontinent: broad north, tapering to a point. */
  in: 'M22 16 L44 10 L62 14 L76 24 L70 38 L62 50 L54 68 L46 86 L38 66 L32 48 L24 32 Z',
  /* An arc of islands. */
  jp: 'M70 10 L78 16 L74 26 L62 36 L54 48 L44 56 L36 66 L26 74 L20 84 L14 80 L22 66 L32 56 L42 44 L52 32 L60 20 Z',
  cn: 'M14 26 L40 16 L64 18 L84 28 L86 44 L74 58 L58 66 L40 62 L26 52 L16 40 Z',
  au: 'M12 34 L30 24 L52 22 L74 26 L88 38 L84 54 L70 66 L52 70 L40 62 L44 52 L34 56 L20 50 Z',
  za: 'M18 30 L40 24 L62 28 L78 40 L72 58 L54 70 L36 66 L22 52 Z',
  ng: 'M18 32 L38 26 L58 28 L74 38 L70 54 L52 62 L34 58 L20 46 Z',
};

const GENERIC = 'M18 32 L40 22 L64 24 L82 34 L78 52 L58 66 L36 62 L20 48 Z';

interface Props {
  shape: string;
  /** Cities to plot: 0–100 positions on the silhouette. */
  pins?: Array<{ id: string; x: number; y: number; state?: 'idle' | 'picked' | 'built' }>;
  /** Fill the outline — used when the country is an opening market. */
  active?: boolean;
  height?: number;
  onPin?: (id: string) => void;
}

export function CountryShape({ shape, pins = [], active, height = 96, onPin }: Props) {
  const path = SHAPES[shape] ?? GENERIC;
  return (
    <svg
      className={active ? 'ctry is-active' : 'ctry'}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      style={{ height }}
      aria-hidden="true"
    >
      <path className="ctry-land" d={path} />
      <path className="ctry-edge" d={path} />
      {pins.map((pin) => (
        <g key={pin.id} className={`ctry-pin is-${pin.state ?? 'idle'}`} onClick={() => onPin?.(pin.id)}>
          <circle className="ctry-pin-halo" cx={pin.x} cy={pin.y} r="7" />
          <circle className="ctry-pin-dot" cx={pin.x} cy={pin.y} r="3" />
        </g>
      ))}
    </svg>
  );
}
