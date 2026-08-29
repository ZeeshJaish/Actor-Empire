/* ============================================================================
   FLAG FIELD

   A territory's flag as atmosphere behind its money. Two modes:

   · `src` given — the game's own flag artwork is used, untouched.
   · nothing given — a field is CONSTRUCTED from the country code: real flags
     are overwhelmingly bands, a canton, a cross or a disc, so a code-driven
     construction in that country's real colours reads unmistakably as that
     flag's family without claiming to be the flag itself.

   That fallback is the point: the screen never ships broken artwork, never
   waits on an asset pipeline, and never needs a file that will not survive a
   handoff. Codes it does not know still get a plausible two-band field.
   ========================================================================== */

import type { ReactElement } from 'react';

type Layout = 'h' | 'v' | 'canton' | 'stripes' | 'cross' | 'union' | 'disc' | 'hoist' | 'kenya' | 'taegeuk';

/* code → [layout, ...colours]. Colours are the flag's real ones; the layout is
   the family, not a facsimile. */
const FIELDS: Record<string, [Layout, ...string[]]> = {
  US: ['stripes', '#b22234', '#ffffff', '#3c3b6e'],
  CA: ['v', '#d52b1e', '#ffffff', '#d52b1e'],
  MX: ['v', '#006847', '#ffffff', '#ce1126'],
  BR: ['h', '#009c3b', '#ffdf00', '#002776'],
  AR: ['h', '#74acdf', '#ffffff', '#74acdf'],
  CL: ['canton', '#d52b1e', '#ffffff', '#0039a6'],
  CO: ['h', '#fcd116', '#003893', '#ce1126'],
  UK: ['union', '#012169', '#ffffff', '#c8102e'],
  GB: ['union', '#012169', '#ffffff', '#c8102e'],
  IE: ['v', '#169b62', '#ffffff', '#ff883e'],
  FR: ['v', '#0055a4', '#ffffff', '#ef4135'],
  DE: ['h', '#000000', '#dd0000', '#ffce00'],
  ES: ['h', '#aa151b', '#f1bf00', '#aa151b'],
  IT: ['v', '#008c45', '#f4f5f0', '#cd212a'],
  NL: ['h', '#ae1c28', '#ffffff', '#21468b'],
  PT: ['v', '#046a38', '#da291c'],
  PL: ['h', '#ffffff', '#dc143c'],
  SE: ['cross', '#006aa7', '#fecc00'],
  NO: ['cross', '#ba0c2f', '#ffffff'],
  DK: ['cross', '#c8102e', '#ffffff'],
  FI: ['cross', '#ffffff', '#002f6c'],
  RU: ['h', '#ffffff', '#0039a6', '#d52b1e'],
  TR: ['disc', '#e30a17', '#ffffff'],
  IN: ['h', '#ff9933', '#ffffff', '#138808'],
  JP: ['disc', '#ffffff', '#bc002d'],
  KR: ['taegeuk', '#ffffff', '#cd2e3a', '#0047a0', '#111111'],
  CN: ['canton', '#de2910', '#ffde00', '#de2910'],
  ID: ['h', '#ff0000', '#ffffff'],
  PH: ['canton', '#0038a8', '#ffffff', '#ce1126'],
  TH: ['h', '#a51931', '#f4f5f8', '#2d2a4a'],
  VN: ['disc', '#da251d', '#ffff00'],
  AU: ['canton', '#00247d', '#ffffff', '#cc142b'],
  NZ: ['canton', '#00247d', '#ffffff', '#cc142b'],
  ZA: ['h', '#007a4d', '#ffffff', '#de3831'],
  KE: ['kenya', '#000000', '#bb0000', '#006600', '#ffffff'],
  NG: ['v', '#008751', '#ffffff', '#008751'],
  EG: ['h', '#ce1126', '#ffffff', '#000000'],
  SA: ['h', '#006c35', '#ffffff'],
  AE: ['hoist', '#00732f', '#ffffff', '#000000', '#ce1126'],
  SG: ['h', '#ed2939', '#ffffff'],
};

/* Codes with no entry still get a stable, plausible field. */
const NEUTRAL: string[] = ['#2f4a6b', '#7d8ea3', '#c3ccd8', '#4b6b52', '#8a6b45'];

/** The colour a territory is recognised by — used to light its card. White and
    near-white are skipped, because a flag's white band is not its identity. */
export function flagAccent(code: string): string | undefined {
  const field = FIELDS[code.toUpperCase()];
  if (!field) return undefined;
  const [, ...colors] = field;
  return colors.find((color) => !isPale(color));
}

function isPale(hex: string): boolean {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return (r + g + b) / 3 > 190;
}

interface Props {
  code: string;
  /** The game's own flag art. Given this, nothing is generated. */
  src?: string;
  /** Wide market headers retain an atmospheric field and place the real flag
      card above it. Compact uses show only the supplied flag artwork. */
  variant?: 'icon' | 'band';
}

interface CountryFlagSvgProps {
  code: string;
  className?: string;
  fit?: 'contain' | 'stretch';
}

const FLAG_SHEET = '/assets/streaming/country-flags.svg';
const FLAG_CELL = {
  xStep: 111.474,
  yStep: 115.875,
  artworkX: 2.538,
  artworkY: 10.152,
  artworkWidth: 76.141,
  artworkHeight: 60.913,
} as const;

/* The supplied Figma sheet is alphabetic but flattened. These coordinates are
   the canonical markets currently supported by EMPIRE+. Keeping the mapping
   here means every market surface reads the same artwork and unknown future
   countries still receive the code-driven fallback below. */
const FLAG_CELLS: Record<string, { row: number; column: number }> = {
  AR: { row: 0, column: 9 },
  AU: { row: 1, column: 2 },
  BR: { row: 2, column: 9 },
  CA: { row: 3, column: 7 },
  CL: { row: 4, column: 3 },
  CO: { row: 4, column: 5 },
  EG: { row: 6, column: 1 },
  FR: { row: 7, column: 4 },
  DE: { row: 8, column: 0 },
  IN: { row: 9, column: 8 },
  ID: { row: 9, column: 9 },
  IT: { row: 10, column: 5 },
  JP: { row: 10, column: 8 },
  KE: { row: 11, column: 2 },
  MX: { row: 13, column: 8 },
  NG: { row: 15, column: 6 },
  NZ: { row: 15, column: 3 },
  PH: { row: 17, column: 0 },
  ZA: { row: 19, column: 7 },
  KR: { row: 19, column: 9 },
  ES: { row: 20, column: 1 },
  TH: { row: 21, column: 1 },
  TR: { row: 21, column: 7 },
  GB: { row: 22, column: 3 },
  UK: { row: 22, column: 3 },
  US: { row: 22, column: 4 },
};

/** The supplied Figma artwork without any market-card styling. Settings and
    streaming surfaces both use this primitive so a country never changes flag
    simply because the player entered a different room. */
export function CountryFlagSvg({ code, className, fit = 'contain' }: CountryFlagSvgProps) {
  const key = code.toUpperCase();
  const cell = FLAG_CELLS[key];
  if (!cell) {
    const [layout, ...colors] = FIELDS[key] ?? neutralField(key);
    return (
      <svg className={className} viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true">
        {render(layout, colors)}
      </svg>
    );
  }
  const x = cell.column * FLAG_CELL.xStep + FLAG_CELL.artworkX;
  const y = cell.row * FLAG_CELL.yStep + FLAG_CELL.artworkY;
  return (
    <svg
      className={className}
      viewBox={`${x} ${y} ${FLAG_CELL.artworkWidth} ${FLAG_CELL.artworkHeight}`}
      preserveAspectRatio={fit === 'stretch' ? 'none' : 'xMidYMid meet'}
      aria-hidden="true"
    >
      <image href={FLAG_SHEET} x="0" y="0" width="1085" height="2748" />
    </svg>
  );
}

export function FlagField({ code, src, variant = 'icon' }: Props) {
  if (src) return <img className="sf-flag-img" src={src} alt="" />;

  const key = code.toUpperCase();
  const field = FIELDS[key] ?? neutralField(key);
  const [layout, ...colors] = field;
  const supplied = FLAG_CELLS[key];

  if (supplied && variant === 'icon') {
    return <CountryFlagSvg code={key} className="sf-flag sf-flag--kit" />;
  }

  if (supplied && variant === 'band') {
    const needsWideField = key === 'KE' || key === 'JP' || key === 'KR';
    return (
      <span className="sf-flag-composite" aria-hidden="true">
        {/* Large cards use the original cinematic field only. The supplied SVG
            is deliberately reserved for compact selectors and Language, where
            its native flag-card proportions belong. */}
        {needsWideField ? (
          <span className={`sf-flag-wide-field sf-flag-wide-field--${key.toLowerCase()}`}>
            {key !== 'KE' && <span className="sf-flag-wide-field__roundel" />}
          </span>
        ) : (
          <svg className="sf-flag sf-flag--field-base" viewBox="0 0 60 40" preserveAspectRatio="none">
            {render(layout, colors)}
          </svg>
        )}
        <span className="sf-flag-code-badge">{key}</span>
      </span>
    );
  }

  return (
    /* Stretched to the band rather than cropped to it: a flag scaled to fill a
       wide header keeps its bands and its cross, while `slice` throws away the
       canton and leaves an unidentifiable middle stripe. Real artwork passed as
       `src` is still cropped, because a photograph cannot be stretched. */
    <svg className="sf-flag" viewBox="0 0 60 40" preserveAspectRatio="none" aria-hidden="true">
      {render(layout, colors)}
    </svg>
  );
}

function render(layout: Layout, colors: string[]): ReactElement {
  const [a, b, c, d] = colors;

  if (layout === 'v') {
    const width = 60 / colors.length;
    return <>{colors.map((color, i) => <rect key={i} x={i * width} width={width} height="40" fill={color} />)}</>;
  }

  if (layout === 'stripes') {
    /* Striped field with a canton — the US family. */
    return (
      <>
        <rect width="60" height="40" fill={a} />
        {[1, 3, 5, 7, 9, 11].map((i) => (
          <rect key={i} y={(i * 40) / 13} width="60" height={40 / 13} fill={b ?? '#ffffff'} />
        ))}
        <rect width="26" height={(40 / 13) * 7} fill={c ?? '#3c3b6e'} />
      </>
    );
  }

  if (layout === 'canton') {
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <rect width="26" height="18" fill={b ?? '#ffffff'} opacity="0.9" />
        {/* A scatter in the fly: the southern-cross family reads wrong as an
            empty field, and a single disc reads as Japan. */}
        {[[42, 11], [50, 19], [42, 29], [34, 22], [52, 8]].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r={i === 4 ? 1.1 : 1.7} fill={c ?? '#ffffff'} opacity="0.9" />
        ))}
      </>
    );
  }

  if (layout === 'cross') {
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <rect x="16" width="9" height="40" fill={b ?? '#ffffff'} />
        <rect y="16" width="60" height="9" fill={b ?? '#ffffff'} />
        {c && (
          <>
            <rect x="18.5" width="4" height="40" fill={c} />
            <rect y="18.5" width="60" height="4" fill={c} />
          </>
        )}
      </>
    );
  }

  if (layout === 'union') {
    /* Diagonals as well as the upright cross — without them the UK reads as a
       Nordic flag, which is the wrong country and the wrong continent. */
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <g stroke={b ?? '#ffffff'} strokeWidth="7">
          <line x1="0" y1="0" x2="60" y2="40" />
          <line x1="60" y1="0" x2="0" y2="40" />
        </g>
        <g stroke={c ?? '#c8102e'} strokeWidth="3">
          <line x1="0" y1="0" x2="60" y2="40" />
          <line x1="60" y1="0" x2="0" y2="40" />
        </g>
        <rect x="23" width="14" height="40" fill={b ?? '#ffffff'} />
        <rect y="13" width="60" height="14" fill={b ?? '#ffffff'} />
        <rect x="26" width="8" height="40" fill={c ?? '#c8102e'} />
        <rect y="16" width="60" height="8" fill={c ?? '#c8102e'} />
      </>
    );
  }

  if (layout === 'disc') {
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <circle cx="30" cy="20" r="10" fill={b ?? '#ffffff'} />
      </>
    );
  }

  if (layout === 'kenya') {
    /* Kenya needs its black/red/green field and white fimbriation to remain
       recognisable even after the wide cinematic stretch. */
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <rect y="12" width="60" height="3" fill={d ?? '#ffffff'} />
        <rect y="15" width="60" height="10" fill={b ?? '#bb0000'} />
        <rect y="25" width="60" height="3" fill={d ?? '#ffffff'} />
        <rect y="28" width="60" height="12" fill={c ?? '#006600'} />
        <path d="M30 9 C24 14 24 26 30 31 C36 26 36 14 30 9 Z" fill="#9f1d20" />
        <path d="M30 11 C27.5 16 27.5 24 30 29 C32.5 24 32.5 16 30 11 Z" fill="#111111" />
        <path d="M28.5 10 L31.5 30 M31.5 10 L28.5 30" stroke={d ?? '#ffffff'} strokeWidth="0.9" />
      </>
    );
  }

  if (layout === 'taegeuk') {
    /* South Korea: a true red/blue taegeuk with four dark trigrams. The former
       red-only disc made the card read as Japan. */
    return (
      <>
        <rect width="60" height="40" fill={a} />
        <circle cx="30" cy="20" r="9" fill={c ?? '#0047a0'} />
        <path
          d="M21 20 A9 9 0 0 1 39 20 A4.5 4.5 0 0 1 30 20 A4.5 4.5 0 0 0 21 20 Z"
          fill={b ?? '#cd2e3a'}
        />
        <g fill={d ?? '#111111'}>
          <g transform="translate(9 8) rotate(-32 5 4)">
            <rect width="10" height="1.5" /><rect y="3" width="10" height="1.5" /><rect y="6" width="10" height="1.5" />
          </g>
          <g transform="translate(41 8) rotate(32 5 4)">
            <rect width="10" height="1.5" /><rect y="3" width="4" height="1.5" /><rect x="6" y="3" width="4" height="1.5" /><rect y="6" width="10" height="1.5" />
          </g>
          <g transform="translate(9 25) rotate(32 5 4)">
            <rect width="4" height="1.5" /><rect x="6" width="4" height="1.5" /><rect y="3" width="10" height="1.5" /><rect y="6" width="4" height="1.5" /><rect x="6" y="6" width="4" height="1.5" />
          </g>
          <g transform="translate(41 25) rotate(-32 5 4)">
            <rect width="4" height="1.5" /><rect x="6" width="4" height="1.5" /><rect y="3" width="4" height="1.5" /><rect x="6" y="3" width="4" height="1.5" /><rect y="6" width="4" height="1.5" /><rect x="6" y="6" width="4" height="1.5" />
          </g>
        </g>
      </>
    );
  }

  if (layout === 'hoist') {
    const bands = [b, c, d].filter(Boolean) as string[];
    const height = 40 / Math.max(1, bands.length);
    return (
      <>
        {bands.map((color, i) => <rect key={i} y={i * height} width="60" height={height} fill={color} />)}
        <rect width="17" height="40" fill={a} />
      </>
    );
  }

  const height = 40 / colors.length;
  return <>{colors.map((color, i) => <rect key={i} y={i * height} width="60" height={height} fill={color} />)}</>;
}

/** Same code, same field, every session. */
function neutralField(code: string): [Layout, ...string[]] {
  let hash = 0;
  for (let i = 0; i < code.length; i += 1) hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
  const layouts: Layout[] = ['h', 'v', 'canton'];
  const first = NEUTRAL[hash % NEUTRAL.length];
  const second = NEUTRAL[(hash >> 3) % NEUTRAL.length];
  return [layouts[hash % layouts.length], first, second === first ? NEUTRAL[(hash >> 5) % NEUTRAL.length] : second];
}
