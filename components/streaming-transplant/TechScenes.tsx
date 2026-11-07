/**
 * Platform room · Tech: the pictures of seven groups, as worlds you can see working (#79; Zeesh 2026-10-30: "need
 * better visualizer for optimisiation, playback, apps and devices, trust and safety, smart ai, profile and family
 * and also ad tech"). Picture, HDR, Colour, Sound and Stabilization keep theirs (TechDesk.tsx).
 *
 * Each world fills the whole frame and is drawn twice, now and next; the split shows the left of now and the right
 * of next, so a world keeps its own words at its outer edge (`mirror`: the right) and lays its parts out so each
 * half shows its share. Words are few: one caption a side; the facts under the picture carry the numbers.
 *
 * Motion is CSS where it only loops (TechDesk.module.css) and SVG <animate> where its timing comes from the tech
 * (Playback's start, Smart AI's search). Reduced motion shows the moment after.
 */
import React from 'react';
import t from './presentation/screens/NetworkDesk/TechDesk.module.css';
import type { StreamingTechAdsLook, StreamingTechAiLook, StreamingTechFamilyLook } from '../../services/streamingTechDesk';

const FONT = 'Inter, system-ui, sans-serif';
const still = (): boolean => typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

/** a dark pill of small capitals at a world's outer top corner */
const Caption: React.FC<{ text: string; mirror: boolean; y?: number; ink?: string; dot?: string }> = ({ text, mirror, y = 8, ink = '#e7eaf2', dot }) => {
  const words = Math.round(text.length * 5.2);
  const width = words + (dot ? 22 : 14);
  const x = mirror ? 320 - 8 - width : 8;
  return (
    <g fontFamily={FONT} data-caption={text}>
      <rect x={x} y={y} width={width} height="15" rx="7.5" fill="#05070c" opacity=".78" />
      {dot && <circle cx={x + 9} cy={y + 7.5} r="2.6" fill={dot} />}
      <text x={x + (dot ? 15 : 7)} y={y + 10.3} fontSize="6.6" fontWeight="900" letterSpacing=".9" fill={ink}
        textLength={words} lengthAdjust="spacingAndGlyphs">{text}</text>
    </g>
  );
};

/** a world's sky: a dusk gradient, with a few stars */
const STARS: Array<[number, number]> = [[18, 30], [52, 14], [88, 40], [126, 22], [170, 12], [204, 36], [238, 18], [276, 34], [304, 14], [146, 48]];
const Sky: React.FC<{ id: string; top?: string; low?: string; stars?: boolean }> = ({ id, top = '#070b18', low = '#17153a', stars = true }) => (
  <>
    <defs>
      <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={top} /><stop offset="1" stopColor={low} /></linearGradient>
    </defs>
    <rect width="320" height="180" fill={`url(#${id})`} />
    {stars && STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r=".9" fill="#c7d2fe" opacity=".55" />)}
  </>
);

/* ═══ Optimisation: one fibre line feeds the town ═══════════════════════════════════════════════════
   The same line carries every home's stream. A heavy stream (no optimisation) is a big, slow, red block and the
   line has room for few homes; each codec makes it smaller, faster and greener, and more homes light up on the
   same line. Homes light in turn on both halves, so each side shows its share. */
const TOWN = [
  { cx: 20, w: 30, h: 40 }, { cx: 60, w: 28, h: 32 }, { cx: 100, w: 32, h: 46 }, { cx: 140, w: 28, h: 36 },
  { cx: 180, w: 30, h: 42 }, { cx: 220, w: 28, h: 32 }, { cx: 260, w: 32, h: 46 }, { cx: 300, w: 28, h: 36 },
];
const TOWN_ORDER = [1, 5, 3, 7, 0, 4, 2, 6];
/** the homes the line carries: three with no optimisation, all eight once the stream is a third the size */
export const optimisationHomes = (load: number) => clamp(Math.round(8 * Math.min(1, .36 / clamp(load, .05, 1))), 1, 8);
export const OptimisationWorld: React.FC<{ uid: string; load: number; accent: string; mirror: boolean }> = ({ uid, load, accent, mirror }) => {
  const heavy = clamp(load, .05, 1);
  const homes = optimisationHomes(load);
  const lit = new Set(TOWN_ORDER.slice(0, homes));
  const heat = load > .8 ? '#ff6b5f' : load > .5 ? '#ffb020' : '#4ade80';
  const size = 6 + 24 * heavy;
  return (
    <g fontFamily={FONT} data-world="OPTIMISATION" data-homes={homes}>
      <Sky id={`${uid}-sky`} />
      <path d="M0 124C40 110 78 120 118 108S200 116 240 104 300 110 320 102V160H0Z" fill="#141838" />
      <path d="M0 140C50 128 96 138 150 128S250 138 320 126V160H0Z" fill="#0f1230" />
      <rect y="160" width="320" height="20" fill="#080b15" />
      {Array.from({ length: 11 }, (_, index) => <rect key={index} x={6 + index * 30} y="170" width="14" height="1.6" fill="#f5c46b" opacity=".5" />)}
      {/* the line, and the streams on it */}
      <rect x="-8" y="30" width="336" height="14" rx="7" fill="#0f1529" stroke="#28314f" strokeWidth="1" />
      <g className={t.lane} style={{ animationDuration: `${(1 + 1.6 * heavy).toFixed(2)}s` }}>
        {Array.from({ length: 10 }, (_, index) => (
          <rect key={index} x={index * 40 - 40} y="33" width={size} height="8" rx="4" fill={heat} opacity=".92" />
        ))}
      </g>
      {TOWN.map(({ cx, w, h }, index) => {
        const on = lit.has(index);
        const top = 160 - h;
        return (
          <g key={cx}>
            <circle cx={cx} cy="44.5" r="2.4" fill={on ? accent : '#28314f'} />
            <line x1={cx} y1="47" x2={cx} y2={top - 14} stroke={on ? accent : '#1b2236'} strokeWidth={on ? 1.8 : 1.2}
              className={on ? t.beam : undefined} style={on ? { animationDelay: `${(index * 170) % 900}ms` } : undefined} />
            <path d={`M${cx - w / 2 - 3} ${top}L${cx} ${top - 12}L${cx + w / 2 + 3} ${top}Z`} fill={on ? '#33295a' : '#171c33'} />
            <rect x={cx - w / 2} y={top} width={w} height={h} fill={on ? '#211f45' : '#11152b'} />
            {on && <rect x={cx - 11} y={top + 6} width="22" height="16" rx="4" fill="#8ec5ff" opacity=".2" />}
            <rect x={cx - 7.5} y={top + 9} width="15" height="10" rx="1.5" fill={on ? '#8ec5ff' : '#0a0e1b'} stroke={on ? 'none' : '#242c46'} strokeWidth=".8"
              className={on ? t.tv : undefined} style={on ? { animationDelay: `${(index * 410) % 2600}ms` } : undefined} />
            <rect x={cx - 3.5} y="148" width="7" height="12" rx="1" fill={on ? '#ffcf7a' : '#0c1020'} opacity={on ? .6 : 1} />
          </g>
        );
      })}
      <Caption text={`${homes} HOMES ON ONE LINE`} mirror={mirror} y={8} dot={heat} />
    </g>
  );
};

/* ═══ Playback: press play ═══════════════════════════════════════════════════════════════════════════
   Both halves press play together, every eight seconds. The screen stays dark with the spinner for the start
   time (scaled), then the film runs; a player that buffers stalls once on the way. The extras sit on the
   player: Skip intro, subtitles, the download mark, continue on another screen. Each half's player controls
   are its own (the film is shared), so its start and its stall read on its own side. */
export interface PlaybackWorldLook { start: number; smooth: boolean; live: boolean; extras: string[] }
const PLAY_CYCLE = 8;
export const PlaybackWorld: React.FC<{ uid: string; movie: string; look: PlaybackWorldLook; accent: string; mirror: boolean }> = ({ uid, movie, look, accent, mirror }) => {
  const at = (from: number, width = 0) => (mirror ? 320 - from - width : from);
  const delay = clamp(look.start * .62, .35, 4.2);
  const stall = look.smooth ? null : [delay + 1.4, delay + 2.4];
  const end = PLAY_CYCLE - .35;
  const k = (seconds: number) => (seconds / PLAY_CYCLE).toFixed(4);
  const calm = still();
  const tone = look.start <= 1.5 ? '#4ade80' : look.start <= 3 ? '#ffb020' : '#ff6b6f';
  /* the dark veil: over the film while it loads and while it stalls */
  const veil = stall
    ? { keyTimes: `0;${k(delay)};${k(delay + .25)};${k(stall[0])};${k(stall[0] + .15)};${k(stall[1])};${k(stall[1] + .2)};${k(end)};1`, values: '1;1;0;0;.78;.78;0;0;1' }
    : { keyTimes: `0;${k(delay)};${k(delay + .25)};${k(end)};1`, values: '1;1;0;0;1' };
  const spin = stall
    ? { keyTimes: `0;${k(delay)};${k(delay + .01)};${k(stall[0])};${k(stall[0] + .01)};${k(stall[1])};${k(stall[1] + .01)};1`, values: '1;1;0;0;1;1;0;0' }
    : { keyTimes: `0;${k(delay)};${k(delay + .01)};1`, values: '1;1;0;0' };
  /* the bar fills while the film plays, and holds through a stall */
  const bar = 120;
  const fill = stall
    ? { keyTimes: `0;${k(delay)};${k(stall[0])};${k(stall[1])};${k(end)};1`, values: `0;0;${(bar * (stall[0] - delay) / (end - delay - 1)).toFixed(1)};${(bar * (stall[0] - delay) / (end - delay - 1)).toFixed(1)};${bar};0` }
    : { keyTimes: `0;${k(delay)};${k(end)};1`, values: `0;0;${bar};0` };
  const spinner = { x: at(80), y: 84 };
  const extras = look.extras.slice(0, 3);
  const subtitles = look.extras.some(word => word.startsWith('Subtitles'));
  const skip = look.extras.includes('Skip intro');
  return (
    <g fontFamily={FONT} data-world="PLAYBACK" data-start={look.start} data-delay={delay.toFixed(2)} data-stall={stall ? 1 : 0}>
      <use href={`#${movie}`} />
      {/* the film runs: a car drives along the road */}
      <g className={calm ? undefined : t.drive}>
        <rect x="0" y="163" width="22" height="7" rx="2.5" fill="#d9465f" />
        <rect x="5" y="159.5" width="11" height="5" rx="2" fill="#f3a1b0" />
        <circle cx="22" cy="166.5" r="1.6" fill="#fff4c2" />
      </g>
      {subtitles && (
        <g>
          <rect x={at(36, 88)} y="128" width="88" height="13" rx="2.5" fill="#000" opacity=".66" />
          <text x={at(80)} y="137" textAnchor="middle" fontSize="6.6" fontWeight="700" fill="#fff">{'We have to go. Now.'}</text>
        </g>
      )}
      {skip && (
        <g>
          <rect x={at(104, 44)} y="106" width="44" height="15" rx="3" fill="#0b0d14" opacity=".86" stroke="#fff" strokeOpacity=".5" />
          <text x={at(126)} y="116" textAnchor="middle" fontSize="6.2" fontWeight="800" fill="#fff">Skip intro ›</text>
        </g>
      )}
      <rect width="320" height="180" fill="#05060b" opacity={calm ? 0 : 1}>
        {!calm && <animate attributeName="opacity" dur={`${PLAY_CYCLE}s`} repeatCount="indefinite" keyTimes={veil.keyTimes} values={veil.values} />}
      </rect>
      {!calm && (
        <g opacity="0">
          <animate attributeName="opacity" dur={`${PLAY_CYCLE}s`} repeatCount="indefinite" calcMode="discrete" keyTimes={spin.keyTimes} values={spin.values} />
          <circle cx={spinner.x} cy={spinner.y} r="13" fill="none" stroke="#ffffff" strokeOpacity=".12" strokeWidth="4" />
          <path d={`M${spinner.x} ${spinner.y - 13}a13 13 0 0 1 13 13`} fill="none" stroke={accent} strokeWidth="4" strokeLinecap="round">
            <animateTransform attributeName="transform" type="rotate" from={`0 ${spinner.x} ${spinner.y}`} to={`360 ${spinner.x} ${spinner.y}`} dur=".9s" repeatCount="indefinite" />
          </path>
        </g>
      )}
      {/* the player's controls, on this side */}
      <rect x={at(20, bar)} y="157" width={bar} height="4" rx="2" fill="#ffffff" opacity=".22" />
      <rect x={at(20, bar)} y="157" width={calm ? bar * .6 : 0} height="4" rx="2" fill={accent}>
        {!calm && <animate attributeName="width" dur={`${PLAY_CYCLE}s`} repeatCount="indefinite" keyTimes={fill.keyTimes} values={fill.values} />}
      </rect>
      {extras.length > 0 && (
        <g>
          {extras.map((word, index) => {
            const x = at(20 + index * 40, 36);
            return (
              <g key={word}>
                <rect x={x} y="165" width="36" height="11" rx="5.5" fill="#05070c" opacity=".8" stroke={accent} strokeOpacity=".55" />
                <text x={x + 18} y="172.6" textAnchor="middle" fontSize="5.2" fontWeight="800" fill="#d6dbe6">{word.replace('Continue anywhere', 'Any screen').replace('Subtitles + AD', 'Subtitles')}</text>
              </g>
            );
          })}
        </g>
      )}
      <Caption text={`STARTS IN ${look.start.toFixed(1)} S`} mirror={mirror} dot={tone} />
      {look.live && <Caption text="LIVE · 2 S BEHIND" mirror={mirror} y={26} dot="#ff3b30" />}
    </g>
  );
};

/* ═══ Apps and devices: every screen in the house ════════════════════════════════════════════════════
   Phone, Smart TV, console, car and headset stand in a row (where the handle's start is worked out); the ones
   the service reaches glow with it, a light on the floor under each, and the one a move adds rings once. */
const DEVICE_X = [32, 96, 160, 224, 288];
export const AppsWorld: React.FC<{ uid: string; lit: number; fresh: boolean; accent: string; mirror: boolean }> = ({ uid, lit, fresh, accent, mirror }) => {
  const screen = (on: boolean) => (on ? `url(#${uid}-glass)` : '#0a0e1a');
  const glow = (on: boolean) => (on ? t.tv : undefined);
  return (
    <g fontFamily={FONT} data-world="APPS" data-lit={lit + 1}>
      <Sky id={`${uid}-sky`} top="#0a0f1f" low="#161a35" stars={false} />
      <defs>
        <linearGradient id={`${uid}-glass`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b2b6b" /><stop offset=".6" stopColor="#b0507a" /><stop offset="1" stopColor="#ffb36b" />
        </linearGradient>
      </defs>
      {/* the wall's shelf line and the floor */}
      <rect y="128" width="320" height="52" fill="#0a0d19" />
      <rect y="127" width="320" height="1.5" fill="#262f4d" />
      {DEVICE_X.map((x, index) => {
        const on = index <= lit;
        const body = on ? '#262d47' : '#151a2c';
        return (
          <g key={x}>
            {on && <ellipse cx={x} cy="131" rx="28" ry="5" fill="#8ec5ff" opacity=".14" />}
            {index === 0 && (
              <g>
                <path d={`M${x - 8} 128l3-8h10l3 8Z`} fill={body} />
                <rect x={x - 10} y="82" width="20" height="40" rx="4" fill={body} />
                <rect x={x - 8} y="86" width="16" height="32" rx="2" fill={screen(on)} className={glow(on)} />
              </g>
            )}
            {index === 1 && (
              <g>
                <rect x={x - 24} y="116" width="48" height="12" rx="2" fill="#141a2c" />
                <rect x={x - 30} y="74" width="60" height="38" rx="3" fill={body} />
                <rect x={x - 27} y="77" width="54" height="32" rx="1.5" fill={screen(on)} className={glow(on)} />
                <rect x={x - 3} y="112" width="6" height="4" fill={body} />
              </g>
            )}
            {index === 2 && (
              <g>
                <rect x={x - 22} y="78" width="44" height="28" rx="2.5" fill={body} />
                <rect x={x - 19} y="81" width="38" height="22" rx="1.5" fill={screen(on)} className={glow(on)} />
                <rect x={x - 16} y="113" width="32" height="15" rx="3" fill={body} />
                <rect x={x - 10} y="119" width="20" height="2" rx="1" fill={on ? accent : '#232a42'} />
                <path d={`M${x + 18} 124c4-5 14-5 18 0 2 3-1 6-4 4l-2-2h-6l-2 2c-3 2-6-1-4-4Z`} fill={body} />
              </g>
            )}
            {index === 3 && (
              <g>
                <path d={`M${x - 30} 120v-9l10-3 9-11h22l11 11 7 2v10Z`} fill={body} />
                <path d={`M${x - 9} 99h20l8 9h-28Z`} fill={on ? '#18234a' : '#0d1120'} />
                <rect x={x - 5} y="101" width="12" height="7" rx="1" fill={screen(on)} />
                <circle cx={x - 17} cy="121" r="6" fill="#0b0e19" stroke={body} strokeWidth="3" />
                <circle cx={x + 18} cy="121" r="6" fill="#0b0e19" stroke={body} strokeWidth="3" />
              </g>
            )}
            {index === 4 && (
              <g>
                <rect x={x - 1.5} y="104" width="3" height="20" fill="#1b2136" />
                <rect x={x - 10} y="124" width="20" height="4" rx="2" fill="#1b2136" />
                <rect x={x - 22} y="86" width="44" height="20" rx="10" fill={body} />
                <rect x={x - 17} y="90" width="14" height="12" rx="6" fill={screen(on)} />
                <rect x={x + 3} y="90" width="14" height="12" rx="6" fill={screen(on)} />
              </g>
            )}
            {on && index < 3 && <path d={`M${x - 3} ${index === 0 ? 98 : 88}v9l7.5-4.5Z`} fill="#fff" opacity=".9" />}
            {fresh && index === lit && <circle cx={x} cy="100" r="30" fill="none" stroke={accent} strokeWidth="1.5" className={t.halo} />}
          </g>
        );
      })}
    </g>
  );
};

/* ═══ Trust and safety: the vault ═════════════════════════════════════════════════════════════════════
   The service's titles on a shelf under a dome of protection, one ring for each layer the Security level stands
   for (DRM, Studio DRM, Watermarking, Takedown network, the AI hunter at 0, 15, 25, 45, 70). Pirates wait at
   both edges; copies slip out to them as often as the leak risk says (up to four a side), and the rest bounce
   off the dome with a spark. */
const TRUST_LAYERS = [0, 15, 25, 45, 70];
const SHELF = [38, 69, 100, 131, 165, 196, 227, 258];
const SHELF_HUE = [8, 205, 150, 280, 35, 190, 330, 95];
export const TrustWorld: React.FC<{ uid: string; security: number; leak: number; accent: string; mirror: boolean }> = ({ uid, security, leak, accent, mirror }) => {
  const layers = TRUST_LAYERS.filter(at => security >= at).length;
  const slips = clamp(Math.round(leak * 4), 0, 4);
  const marks = { 'data-world': 'TRUST', 'data-layers': layers, 'data-slips': slips };
  /* a hooded pirate, facing the shelf, an arm reaching for it */
  const pirate = (x: number, face: 1 | -1) => (
    <g>
      <path d={`M${x + 8 * face} 134l${14 * face} -9`} stroke="#2c3350" strokeWidth="4.5" strokeLinecap="round" />
      <path d={`M${x - 12} 152v-28c0-16 24-16 24 0v28Z`} fill="#2c3350" stroke="#46507a" strokeWidth="1" />
      <path d={`M${x - 8} 125c0-11 16-11 16 0v4h-16Z`} fill="#0b0d16" />
      <circle cx={x - 3 + face} cy="123.5" r="1.5" fill="#ff4d4f" />
      <circle cx={x + 3 + face} cy="123.5" r="1.5" fill="#ff4d4f" />
      <path d={`M${x - 5} 140h10M${x - 4} 145h8`} stroke="#46507a" strokeWidth="1" />
    </g>
  );
  return (
    <g fontFamily={FONT} {...marks}>
      <Sky id={`${uid}-sky`} top="#070a14" low="#121a30" stars={false} />
      <rect y="150" width="320" height="30" fill="#090c16" />
      {/* the dome: its rings, brightest inside */}
      {TRUST_LAYERS.map((_, index) => {
        const r = 66 + index * 11;
        const on = index < layers;
        return (
          <path key={r} d={`M${160 - r} 132A${r} ${r} 0 0 1 ${160 + r} 132`} fill="none" stroke={on ? accent : '#1a2134'}
            strokeWidth={on ? 2.6 : 1.2} strokeOpacity={on ? .95 - index * .13 : .9} strokeDasharray={on ? undefined : '3 4'} />
        );
      })}
      {layers > 0 && <path d={`M${160 - 66} 132A66 66 0 0 1 ${160 + 66} 132Z`} fill={accent} opacity={.04 + layers * .025} />}
      {/* the titles */}
      <rect x="32" y="132" width="256" height="5" rx="1.5" fill="#2b3350" />
      {SHELF.map((x, index) => (
        <g key={x}>
          <rect x={x} y="96" width="24" height="36" rx="2" fill={`hsl(${SHELF_HUE[index]} 50% 34%)`} />
          <circle cx={x + 12} cy="108" r="6" fill={`hsl(${SHELF_HUE[index]} 70% 62%)`} opacity=".75" />
          <rect x={x + 3} y="124" width="18" height="3" rx="1" fill="#fff" opacity=".55" />
        </g>
      ))}
      {pirate(16, 1)}
      {pirate(304, -1)}
      {/* copies that slip out, and the tries the dome stops */}
      {[0, 1, 2, 3].map(index => {
        const left = { from: SHELF[index], dx: 16 - SHELF[index] - 6 };
        const right = { from: SHELF[7 - index], dx: 304 - SHELF[7 - index] - 18 };
        const slip = index < slips;
        return [left, right].map(({ from, dx }, side) => (slip ? (
          <rect key={`${index}-${side}`} x={from} y="96" width="24" height="36" rx="2" fill="none" stroke="#ff5a5f" strokeWidth="1.3" strokeDasharray="3 2"
            className={t.slip} style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: '14px', animationDelay: `${index * .9 + side * .45}s` }} />
        ) : layers > 0 && index < 2 ? (() => {
          const r = 66 + (layers - 1) * 11;
          const cy = 116 - index * 26;
          const dx = Math.sqrt(r * r - (132 - cy) * (132 - cy));
          return <circle key={`${index}-${side}`} cx={side ? 160 + dx : 160 - dx} cy={cy} r="3" fill="#fff"
            className={t.spark} style={{ animationDelay: `${index * 1.1 + side * .55}s` }} />;
        })() : null));
      })}
      <Caption text={`LEAK RISK ${Math.round(leak * 100)}%`} mirror={mirror} dot={leak > .5 ? '#ff5a5f' : leak > .25 ? '#ffb020' : '#4ade80'} />
    </g>
  );
};

/* ═══ Sharing control (Trust and safety, #56): one password, many homes ══════════════════════════════════
   The paying home (each side has its own, inside its half) and six homes around it, watching on its password (a
   key's dotted line to each). Device check turns homes away (dark, locked); Paid extra member keeps some of those as paying
   members (gold, a coin); the caption counts the homes still on the one password. */
const SHARERS: Array<[number, number]> = [[26, 148], [30, 106], [62, 82], [102, 70], [142, 88], [66, 136]];
const PAYER: [number, number] = [118, 152];
export const SharingWorld: React.FC<{ uid: string; check: number; share: number; accent: string; mirror: boolean }> = ({ uid, check, share, accent, mirror }) => {
  const sharing = Math.round(SHARERS.length * clamp(check, 0, 1));
  const away = SHARERS.length - sharing;
  const paying = share > 0 && away > 0 ? Math.max(1, Math.round(away * share)) : 0;
  const house = (x: number, y: number, tone: 'on' | 'pay' | 'off', size = 1) => {
    const w = 22 * size;
    const h = 16 * size;
    const fill = tone === 'off' ? '#11152b' : '#211f45';
    const glass = tone === 'pay' ? '#f5c451' : tone === 'on' ? '#8ec5ff' : '#0a0e1b';
    return (
      <g>
        <path d={`M${x - w / 2 - 2.5} ${y - h}L${x} ${y - h - 10 * size}L${x + w / 2 + 2.5} ${y - h}Z`} fill={tone === 'off' ? '#171c33' : '#33295a'} />
        <rect x={x - w / 2} y={y - h} width={w} height={h} fill={fill} />
        <rect x={x - 5.5 * size} y={y - h + 4 * size} width={11 * size} height={7 * size} rx="1.2" fill={glass} className={tone === 'off' ? undefined : t.tv} />
      </g>
    );
  };
  return (
    <g fontFamily={FONT} data-world="SHARING" data-sharing={sharing} data-paying={paying}>
      <Sky id={`${uid}-sky`} />
      <path d="M0 132C50 120 96 130 150 120S250 130 320 118V180H0Z" fill="#11143a" />
      <rect y="164" width="320" height="16" fill="#080b15" />
      {SHARERS.map(([fx, y], index) => {
        const x = mirror ? 320 - fx : fx;
        const on = index < sharing;
        const pays = !on && index < sharing + paying;
        return (
          <g key={index}>
            {(on || pays) && <line x1={mirror ? 320 - PAYER[0] : PAYER[0]} y1={PAYER[1] - 38} x2={x} y2={y - 22} stroke={pays ? '#f5c451' : accent} strokeWidth={pays ? 2 : 1.6}
              className={pays ? undefined : t.beam} strokeOpacity={pays ? .9 : .85} style={pays ? undefined : { animationDelay: `${index * 160}ms` }} />}
            {house(x, y, on ? 'on' : pays ? 'pay' : 'off')}
            {pays && <><circle cx={x + 12} cy={y - 30} r="5.5" fill="#f5c451" stroke="#080b15" strokeWidth="1.2" />
              <text x={x + 12} y={y - 27.8} textAnchor="middle" fontSize="6.6" fontWeight="900" fill="#5c3d07">$</text></>}
            {!on && !pays && <g>
              <rect x={x - 4} y={y - 30} width="8" height="6.5" rx="1.4" fill="#58607a" />
              <path d={`M${x - 2.4} ${y - 30}v-2a2.4 2.4 0 0 1 4.8 0v2`} fill="none" stroke="#58607a" strokeWidth="1.2" />
            </g>}
          </g>
        );
      })}
      {/* the paying home, its password a key over the roof */}
      {(() => {
        const x = mirror ? 320 - PAYER[0] : PAYER[0];
        const y = PAYER[1];
        return (
          <g>
            {house(x, y, 'on', 1.5)}
            <circle cx={x} cy={y - 50} r="7" fill={accent} />
            <circle cx={x - 2.6} cy={y - 50} r="2.4" fill="none" stroke="#080b15" strokeWidth="1.4" />
            <path d={`M${x - .2} ${y - 50}h5M${x + 3} ${y - 50}v2.6`} stroke="#080b15" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        );
      })()}
      <Caption text={`${sharing} HOMES ON ONE PASSWORD`} mirror={mirror} dot={accent} />
      {paying > 0 && <Caption text={`${paying} NOW PAY TO STAY`} mirror={mirror} y={26} dot="#f5c451" ink="#f5d58a" />}
    </g>
  );
};

/* ═══ Smart AI: the right pick, sooner ════════════════════════════════════════════════════════════════
   A viewer on the sofa, what they feel like tonight in a thought bubble (a space film), and their TV, which hunts through
   titles for as long as the AI needs, every six seconds. With the same rows for all (Trending) it passes four of the
   week's top titles (✕) and settles on the #1, which is not their thing: no match, the viewer sighs. Each step of the
   ladder reads the viewer better (Because you watched: two passes; Personal artwork: one, on art made for them, its
   trailer playing; the Taste engine: straight to it, "FOR YOU TONIGHT"), lands on a space film with its match, plays it,
   and the viewer's heart pops. Over the TV the AI's network grows (3, 5, 7 nodes; the Taste engine's core glows), the
   taste running along its links from the bubble to the screen; Trending is a TOP 10 chart the bubble never reaches.
   Autoplay adds "NEXT EP" as the film ends, AI channels a LIVE tag on the TV while it hunts, Voice search the viewer
   asking aloud (one pass fewer). #82 (Zeesh: "need better visual for smart ai"): was the home screen's rows. */
const AI_CYCLE = 6;
const AI_HOP = .62;
const AI_PASSES = [4, 2, 1, 0];
const AI_MATCH = [0, 84, 93, 98];
/** the AI's network: a core and a ring of six; the ladder lights 3, 5, then all 7 */
const AI_NODES: Array<[number, number]> = [[0, 0], [11, 0], [-5.5, 9.5], [-11, 0], [5.5, -9.5], [-5.5, -9.5], [5.5, 9.5]];
const AI_LINKS: Array<[number, number]> = [[0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [1, 6], [6, 2], [2, 3], [3, 5], [5, 4], [4, 1]];
const AI_LIT = [0, 3, 5, 7];
type AiGenre = 'GHOST' | 'CROWN' | 'STAR' | 'HEART' | 'WESTERN' | 'ROCKET';
/** the titles it passes on, in turn */
const AI_PASSED: AiGenre[] = ['GHOST', 'CROWN', 'STAR', 'HEART'];
const GENRE: Record<AiGenre, { bg: string; ink: string; path: string }> = {
  GHOST: { bg: '#34385a', ink: '#ece9ff', path: 'M-7 7v-8a7 7 0 0 1 14 0v8l-2.3-2-2.4 2-2.3-2-2.3 2-2.4-2Z' },
  CROWN: { bg: '#5b3a17', ink: '#ffcf5a', path: 'M-8 5v-9l4 4 4-6 4 6 4-4v9Z' },
  STAR: { bg: '#1d5a4a', ink: '#bff7e0', path: 'M0-8l2.4 5 5.4.6-4 3.7 1.1 5.4L0 4l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6Z' },
  HEART: { bg: '#6a2340', ink: '#ff9cbd', path: 'M0 6.5c-6-4-8.5-7-8.5-10a4.2 4.2 0 0 1 8.5-1.2 4.2 4.2 0 0 1 8.5 1.2c0 3-2.5 6-8.5 10Z' },
  WESTERN: { bg: '#7a3f14', ink: '#ffc27a', path: 'M-10 3.5c3 2.4 17 2.4 20 0-2.2 3.6-17.8 3.6-20 0ZM-5.5 2.8c0-5.5 1.4-9 5.5-9s5.5 3.5 5.5 9Z' },
  ROCKET: { bg: '#16225a', ink: '#ffffff', path: 'M0-9c4.2 3 5.2 8.2 4.2 12.6h-8.4c-1-4.4 0-9.6 4.2-12.6ZM-4.2 1.4l-3.2 4.6h3.6ZM4.2 1.4l3.2 4.6h-3.6Z' },
};
/** the TV's screen */
const AI_SCREEN = { x: 78, y: 63, w: 72, h: 44 };
export const SmartAiWorld: React.FC<{ uid: string; look: StreamingTechAiLook; accent: string; mirror: boolean }> = ({ uid, look, accent, mirror }) => {
  const calm = still();
  const X = (x: number) => (mirror ? 320 - x : x);
  const S = AI_SCREEN;
  const rank = clamp(Math.round(look.rank), 0, 3);
  const passes = Math.max(0, AI_PASSES[rank] - (look.voice ? 1 : 0));
  const land = .3 + passes * AI_HOP;
  const play = land + .8;
  const end = AI_CYCLE - .4;
  const k = (seconds: number) => (clamp(seconds, 0, AI_CYCLE) / AI_CYCLE).toFixed(4);
  /* shown in these windows of the cycle (discrete); with reduced motion, shown only if it belongs to the moment after */
  const blink = (windows: Array<[number, number]>) => {
    const times = ['0'];
    const values = [windows.some(([from]) => from <= 0) ? '1' : '0'];
    windows.forEach(([from, to]) => {
      if (from > 0) { times.push(k(from)); values.push('1'); }
      times.push(k(to)); values.push('0');
    });
    return <animate attributeName="opacity" dur={`${AI_CYCLE}s`} repeatCount="indefinite" calcMode="discrete" keyTimes={times.join(';')} values={values.join(';')} />;
  };
  const during = (windows: Array<[number, number]>, after: boolean, content: React.ReactNode) => (
    <g opacity={calm ? (after ? 1 : 0) : 0}>{!calm && blink(windows)}{content}</g>
  );
  const glide = (from: string, to: string, start: number, stop: number) => (calm ? null : (
    <animateTransform attributeName="transform" type="translate" dur={`${AI_CYCLE}s`} repeatCount="indefinite" additive="sum"
      keyTimes={`0;${k(start)};${k(stop)};1`} values={`${from};${from};${to};${to}`} />
  ));
  /* a title's art on the TV: its colour, its sign, its name in bars; Personal artwork draws a space scene made for them */
  const card = (genre: AiGenre, rich = false) => {
    const art = GENRE[genre];
    return (
      <>
        <rect x={S.x} y={S.y} width={S.w} height={S.h} fill={rich ? `url(#${uid}-space)` : art.bg} />
        {rich && <>
          {[[6, 8], [30, 5], [62, 9], [48, 36], [12, 37], [66, 28]].map(([x, y]) => <circle key={`${x}-${y}`} cx={S.x + x} cy={S.y + y} r=".8" fill="#fff" opacity=".8" />)}
          <circle cx={S.x + 58} cy={S.y + 31} r="9" fill="#8b5cf6" />
          <ellipse cx={S.x + 58} cy={S.y + 31} rx="14" ry="3.4" fill="none" stroke="#d8c8ff" strokeWidth="1.2" opacity=".8" />
        </>}
        <g transform={`translate(${S.x + 20} ${S.y + 22}) scale(1.25)`}>
          <path d={art.path} fill={art.ink} />
          {genre === 'ROCKET' && <><circle cy="-2.6" r="1.7" fill={rich ? '#1d2c7a' : art.bg} /><path d="M-2.2 4l2.2 4.6 2.2-4.6Z" fill="#ff9a3c" /></>}
          {(genre === 'GHOST') && <><circle cx="-2.4" cy="-1.6" r="1.2" fill={art.bg} /><circle cx="2.4" cy="-1.6" r="1.2" fill={art.bg} /></>}
        </g>
        {!rich && <>
          <rect x={S.x + 40} y={S.y + 14} width="26" height="4.5" rx="2" fill="#fff" opacity=".85" />
          <rect x={S.x + 40} y={S.y + 22} width="18" height="3" rx="1.5" fill="#fff" opacity=".45" />
          <rect x={S.x + 40} y={S.y + 29} width="11" height="5" rx="2.5" fill="#fff" opacity=".25" />
        </>}
      </>
    );
  };
  const lit = AI_LIT[rank];
  const brain = { x: 114, y: 36 };
  /* a tag on the TV (text, so drawn outside the mirrored art): its outer edge at x */
  const tag = (x: number, y: number, text: string, fill: string, ink: string, grows: 'in' | 'out') => {
    const width = Math.round(text.length * 4.3) + 9;
    const edge = X(x);
    const right = (grows === 'in') !== mirror;
    const left = right ? edge : edge - width;
    return (
      <>
        <rect x={left} y={y} width={width} height="10" rx="3" fill={fill} />
        <text x={left + width / 2} y={y + 7.2} textAnchor="middle" fontSize="5.8" fontWeight="900" fill={ink} textLength={width - 9} lengthAdjust="spacingAndGlyphs">{text}</text>
      </>
    );
  };
  return (
    <g fontFamily={FONT} data-world="SMART_AI" data-personal={rank} data-passes={passes} data-match={AI_MATCH[rank]}>
      <defs>
        <linearGradient id={`${uid}-wall`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0b1024" /><stop offset="1" stopColor="#171d3c" /></linearGradient>
        <linearGradient id={`${uid}-space`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#0b1340" /><stop offset="1" stopColor="#2a2f8a" /></linearGradient>
        <linearGradient id={`${uid}-west`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffb25c" /><stop offset="1" stopColor="#8a3412" /></linearGradient>
        <radialGradient id={`${uid}-core`}><stop offset="0" stopColor={accent} stopOpacity=".6" /><stop offset="1" stopColor={accent} stopOpacity="0" /></radialGradient>
        <clipPath id={`${uid}-screen`}><rect x={S.x} y={S.y} width={S.w} height={S.h} /></clipPath>
      </defs>
      <rect width="320" height="180" fill={`url(#${uid}-wall)`} />
      <g transform={mirror ? 'matrix(-1 0 0 1 320 0)' : undefined}>
        {/* the far wall: a window on the night, and a lamp (seen past the handle) */}
        <rect x="196" y="30" width="74" height="58" rx="3" fill="#0d1638" stroke="#252c4c" strokeWidth="2" />
        <path d="M233 30v58M196 59h74" stroke="#252c4c" strokeWidth="2" />
        <circle cx="252" cy="44" r="6" fill="#e9e3c8" opacity=".85" />
        <circle cx="290" cy="112" r="22" fill="#ffcf7a" opacity=".07" />
        <path d="M284 100h12l-3 10h-6Z" fill="#3a3355" /><rect x="289" y="110" width="2" height="36" fill="#2a2f50" />
        <rect y="146" width="320" height="34" fill="#0a0d1b" />
        <ellipse cx="80" cy="161" rx="72" ry="7" fill="#141936" />
        {/* the AI: its network over the TV, or Trending's chart */}
        {rank === 0 ? (
          <g>
            <rect x="100" y="26" width="28" height="20" rx="4" fill="#141a2e" stroke="#2f3756" />
            {[[105, 10], [112, 7], [119, 4]].map(([x, h]) => <rect key={x} x={x} y={42 - h} width="5" height={h} rx="1" fill="#58607a" />)}
            <path d="M114 46V60" stroke="#3a4260" strokeWidth="1.6" />
          </g>
        ) : (
          <g>
            {rank >= 3 && <circle cx={brain.x} cy={brain.y} r="19" fill={`url(#${uid}-core)`} className={t.glow} />}
            <path d="M41 45C58 26 84 26 102 34" fill="none" stroke={accent} strokeWidth="1.8" className={t.beam} />
            <path d={`M${brain.x} ${brain.y + 12}V60`} fill="none" stroke={accent} strokeWidth="1.8" className={t.beam} style={{ animationDelay: '.4s' }} />
            {AI_LINKS.map(([a, b]) => {
              const on = a < lit && b < lit;
              return <line key={`${a}-${b}`} x1={brain.x + AI_NODES[a][0]} y1={brain.y + AI_NODES[a][1]} x2={brain.x + AI_NODES[b][0]} y2={brain.y + AI_NODES[b][1]}
                stroke={on ? accent : '#262d48'} strokeWidth={on ? 1.3 : 1} strokeOpacity={on ? .85 : 1} />;
            })}
            {AI_NODES.map(([dx, dy], index) => (
              <circle key={index} cx={brain.x + dx} cy={brain.y + dy} r={index < lit ? (index === 0 ? 3.4 : 2.5) : 1.9} fill={index < lit ? accent : '#2a3150'}
                stroke={index < lit ? '#fff' : 'none'} strokeOpacity=".5" strokeWidth=".6" />
            ))}
            {rank >= 3 && <path d={`M${brain.x + 14} ${brain.y - 16}l1.4 3.6 3.6 1.4-3.6 1.4-1.4 3.6-1.4-3.6-3.6-1.4 3.6-1.4Z`} fill="#fff" className={t.spark} />}
          </g>
        )}
        {/* the TV and what it shows: the home screen, the titles it passes on, the pick, then the film */}
        <ellipse cx="114" cy="150" rx="46" ry="5" fill={accent} opacity=".12" />
        <rect x="110" y="111" width="8" height="31" fill="#151a2e" />
        <rect x="98" y="142" width="32" height="4" rx="2" fill="#1b2138" />
        <rect x={S.x - 4} y={S.y - 4} width={S.w + 8} height={S.h + 8} rx="4" fill="#0a0d18" stroke="#2a3254" />
        <g clipPath={`url(#${uid}-screen)`}>
          <rect x={S.x} y={S.y} width={S.w} height={S.h} fill="#0e1326" />
          {[0, 1, 2].map(index => <rect key={index} x={S.x + 5 + index * 23} y={S.y + 16} width="19" height="24" rx="2" fill="#1b2240" />)}
          {AI_PASSED.slice(0, passes).map((genre, index) => {
            const from = .3 + index * AI_HOP;
            const to = from + AI_HOP;
            return (
              <g key={genre}>
                {during([[from, to]], false, card(genre))}
                {during([[to - .26, to]], false, <>
                  <circle cx={S.x + 58} cy={S.y + 30} r="7" fill="#ff4d5e" />
                  <path d={`M${S.x + 55} ${S.y + 27}l6 6m0-6l-6 6`} stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
                </>)}
              </g>
            );
          })}
          {during([[land, play]], false, <>
            {card(rank === 0 ? 'WESTERN' : 'ROCKET', rank >= 2)}
            {rank >= 2 && <g><circle cx={S.x + 38} cy={S.y + 31} r="5.5" fill="#000" opacity=".5" /><path d={`M${S.x + 36.6} ${S.y + 28.4}v5.2l4.2-2.6Z`} fill="#fff" /></g>}
          </>)}
          {during([[play, end]], true, <>
            {rank === 0 ? (
              <>
                <rect x={S.x} y={S.y} width={S.w} height={S.h} fill={`url(#${uid}-west)`} />
                <circle cx={S.x + 50} cy={S.y + 18} r="7" fill="#ffe28a" />
                <rect x={S.x} y={S.y + 34} width={S.w} height="10" fill="#4a1c0a" />
                <path d={`M${S.x + 14} ${S.y + 34}v-12m0 5h-4v-4m4 6h4v-6`} stroke="#2a0f05" strokeWidth="2.4" strokeLinecap="round" fill="none" />
              </>
            ) : (
              <>
                <rect x={S.x} y={S.y} width={S.w} height={S.h} fill={`url(#${uid}-space)`} />
                {[[8, 10], [24, 30], [40, 8], [58, 36], [66, 12], [14, 38], [50, 24]].map(([x, y]) => <circle key={`${x}-${y}`} cx={S.x + x} cy={S.y + y} r=".8" fill="#fff" opacity=".85" />)}
                <circle cx={S.x + 60} cy={S.y + 30} r="10" fill="#8b5cf6" />
                <g transform={calm ? `translate(${S.x + 30} ${S.y + 22})` : undefined}>
                  {glide(`${S.x + 10} ${S.y + 34}`, `${S.x + 52} ${S.y + 10}`, play, end)}
                  <g transform="rotate(45) scale(.8)">
                    <path d={GENRE.ROCKET.path} fill="#fff" />
                    <circle cy="-2.6" r="1.7" fill="#1d2c7a" />
                    <path d="M-2.2 4l2.2 4.6 2.2-4.6Z" fill="#ff9a3c" />
                  </g>
                </g>
              </>
            )}
            <rect x={S.x + 4} y={S.y + S.h - 5} width={S.w - 8} height="2.4" rx="1.2" fill="#fff" opacity=".2" />
            <rect x={S.x + 4} y={S.y + S.h - 5} width={calm ? (S.w - 8) * .55 : 0} height="2.4" rx="1.2" fill={accent}>
              {!calm && <animate attributeName="width" dur={`${AI_CYCLE}s`} repeatCount="indefinite" keyTimes={`0;${k(play)};${k(end)};1`} values={`0;0;${S.w - 8};${S.w - 8}`} />}
            </rect>
          </>)}
        </g>
        {/* the viewer: on the sofa, remote in hand, tonight's wish in the bubble */}
        <rect x="6" y="108" width="13" height="40" rx="5" fill="#2c315c" />
        <rect x="6" y="130" width="60" height="18" rx="6" fill="#363c6e" />
        <rect x="56" y="122" width="11" height="26" rx="5" fill="#2c315c" />
        <rect x="35" y="124" width="23" height="8" rx="4" fill="#2b3157" />
        <rect x="52" y="127" width="7" height="19" rx="3" fill="#2b3157" />
        <rect x="25" y="103" width="20" height="29" rx="8" fill="#e86a5c" />
        <path d="M41 109l11 5" stroke="#e86a5c" strokeWidth="5.2" strokeLinecap="round" />
        <rect x="50" y="111.5" width="10" height="4" rx="1.6" fill="#10142a" />
        <circle cx="36" cy="93" r="9.5" fill="#f1c27d" />
        <path d="M26.5 95a9.6 9.6 0 0 1 18.4-4.6c-5-1.2-10.4-.4-13.6 2.6-1.6 1.6-2.8 2.4-4.8 2Z" fill="#2b2140" />
        <circle cx="40.6" cy="92" r="1.3" fill="#1b1530" />
        <path d="M38.6 98.2h4.4" stroke="#1b1530" strokeWidth="1.2" strokeLinecap="round" opacity={calm ? (rank === 0 ? 1 : 0) : 1}>
          {!calm && rank > 0 && <animate attributeName="opacity" dur={`${AI_CYCLE}s`} repeatCount="indefinite" calcMode="discrete" keyTimes={`0;${k(land)};${k(end)};1`} values="1;0;1;1" />}
        </path>
        {rank > 0 && during([[land, end]], true, <path d="M38.4 97.4q2.4 2.8 4.8 0" fill="none" stroke="#1b1530" strokeWidth="1.2" strokeLinecap="round" />)}
        {rank > 0
          ? during([[land, land + 1]], false, (
            <g>
              {glide('0 0', '0 -12', land, land + 1)}
              <path d="M48 84c-4.4-3-6.2-5.2-6.2-7.4a3 3 0 0 1 6.2-.9 3 3 0 0 1 6.2.9c0 2.2-1.8 4.4-6.2 7.4Z" fill="#ff5c8a" />
            </g>
          ))
          : during([[land, end]], true, <>{[0, 1, 2].map(index => <circle key={index} cx={48 + index * 4} cy="82" r="1.4" fill="#9aa3bb" />)}</>)}
        <circle cx="26" cy="52" r="16" fill="#eef1fb" opacity=".95" />
        <circle cx="31" cy="73" r="3.4" fill="#eef1fb" opacity=".9" />
        <circle cx="34.5" cy="81" r="2.2" fill="#eef1fb" opacity=".85" />
        <g transform="translate(26 52) scale(.95)">
          <path d={GENRE.ROCKET.path} fill="#24307a" />
          <circle cy="-2.6" r="1.7" fill="#eef1fb" />
          <path d="M-2.2 4l2.2 4.6 2.2-4.6Z" fill="#ff8a3c" />
        </g>
        {look.voice && (
          <g>
            <circle cx="55" cy="99" r="6.5" fill="#1b2140" stroke={accent} strokeWidth="1.2" />
            <rect x="53" y="95" width="4" height="6" rx="2" fill={accent} />
            <path d="M51.8 99a3.2 3.2 0 0 0 6.4 0M55 102.2v1.6" fill="none" stroke={accent} strokeWidth="1" strokeLinecap="round" />
            <path d="M63.5 96q3 3 0 6M67 93.5q5.5 5.5 0 11" fill="none" stroke={accent} strokeWidth="1.3" strokeLinecap="round" className={t.glow} />
          </g>
        )}
      </g>
      {/* words on the TV, kept the right way round */}
      {/* its match (the Taste engine's pick is tonight's), and Autoplay's next episode, on the screen; AI channels' LIVE over the TV */}
      {rank > 0
        ? during([[land, end]], true, tag(S.x + S.w - 3, S.y + 3, rank >= 3 ? `${AI_MATCH[rank]}% · TONIGHT` : `${AI_MATCH[rank]}% MATCH`, '#16a34a', '#fff', 'out'))
        : during([[land, play]], false, tag(S.x + S.w - 3, S.y + 3, '#1 THIS WEEK', '#475069', '#fff', 'out'))}
      {look.autoplay && during([[end - 1.2, end]], true, tag(S.x + S.w - 3, S.y + S.h - 18, 'NEXT EP ›', '#000000cc', '#fff', 'out'))}
      {look.channels && tag(S.x - 4, S.y - 15, '● LIVE', '#e11d48', '#fff', 'in')}
      <Caption text={look.lift > 0 ? `FINDS SOMETHING +${Math.round(look.lift * 100)}%` : 'SAME ROWS FOR ALL'} mirror={mirror} dot={look.lift > 0 ? accent : '#58607a'} />
    </g>
  );
};

/* ═══ Profiles and family: everyone on their own screen ═══════════════════════════════════════════════
   A family of six in a house cut open: the kid's and the teen's rooms upstairs, the living room and its TV below. With
   one screen at a time they all crowd the sofa in front of the one TV, the teen and the kid sulking, grandad asleep.
   Each screen more sends someone to a screen of their own, lit in their own colour (their profile): the kid's tablet,
   the teen's laptop, then tablets for mum, gran and grandad on the sofa. Kids profiles turns the kid's tablet from a
   16+ film to a cartoon, a shield on the wall; Watch party puts friends on the TV, hearts rise from it, and the house
   next door watches the same film in sync. #82 (Zeesh: "need better visual for … profile and family"): was a house of
   eight rooms lit in turn. */
type FamilyMember = { id: 'DAD' | 'KID' | 'TEEN' | 'MUM' | 'GRAN' | 'GRANDAD'; shirt: string; skin: string; hair: string; size: number; long?: boolean };
/** in the order screens go to them: Dad keeps the TV */
const FAMILY: FamilyMember[] = [
  { id: 'DAD', shirt: '#4f7cff', skin: '#e0ac7e', hair: '#3a2a20', size: 1 },
  { id: 'KID', shirt: '#ffc93c', skin: '#f1c9a0', hair: '#5a3a22', size: .76 },
  { id: 'TEEN', shirt: '#3ecf8e', skin: '#c68b59', hair: '#1d1a22', size: .94 },
  { id: 'MUM', shirt: '#ff7a6b', skin: '#e9b48c', hair: '#6b3b2a', size: .95, long: true },
  { id: 'GRAN', shirt: '#b48cff', skin: '#f0c9a8', hair: '#dfe2ea', size: .92, long: true },
  { id: 'GRANDAD', shirt: '#2ec5c5', skin: '#d7a27a', hair: '#c7cbd6', size: .96 },
];
type FamilyMood = 'HAPPY' | 'FLAT' | 'SAD' | 'SHOCKED' | 'ASLEEP';
/** "4 SCREENS AT ONCE"; with Kids profiles or Watch party, what the home has */
const familyCaption = (look: StreamingTechFamilyLook) => {
  const screens = look.screens > 1 ? `${look.screens} SCREENS` : '1 SCREEN';
  const more = [look.kids && 'KIDS', look.party && 'PARTY'].filter(Boolean);
  return more.length ? [screens, ...more].join(' · ') : look.screens > 1 ? `${screens} AT ONCE` : 'ONE SCREEN FOR ALL';
};
export const FamilyWorld: React.FC<{ uid: string; look: StreamingTechFamilyLook; accent: string; mirror: boolean }> = ({ uid, look, accent, mirror }) => {
  const X = (x: number) => (mirror ? 320 - x : x);
  const screens = clamp(Math.round(look.screens), 1, 6);
  const own = (id: FamilyMember['id']) => FAMILY.findIndex(member => member.id === id) < screens;
  const kidRoom = own('KID');
  const teenRoom = own('TEEN');
  /* the sofa, nearest the TV first: Dad, then whoever has no room of their own */
  const sofa = FAMILY.filter(member => !(member.id === 'KID' && kidRoom) && !(member.id === 'TEEN' && teenRoom));
  const gap = sofa.length > 1 ? Math.min(18, 72 / (sofa.length - 1)) : 0;
  const sharing = sofa.filter(member => member.id === 'DAD' || !own(member.id)).length;
  const moodOf = (member: FamilyMember): FamilyMood => {
    if (member.id === 'DAD' || own(member.id)) return member.id === 'KID' && !look.kids ? 'SHOCKED' : 'HAPPY';
    if (member.id === 'TEEN' || member.id === 'KID') return 'SAD';
    if (member.id === 'GRANDAD') return 'ASLEEP';
    return 'FLAT';
  };
  /* a person sitting, facing the TV (right, before mirroring); a screen of their own lights them in their colour */
  const person = (member: FamilyMember, x: number, base: number, screen: string | null) => {
    const s = member.size * 1.18;
    const r = 5.6 * s;
    const hx = x + .6 * s;
    const hy = base - 13.5 * s - r + 1;
    const mood = moodOf(member);
    const ink = '#1b1530';
    return (
      <g key={member.id}>
        {screen && <circle cx={x + 6 * s} cy={base - 12 * s} r={11 * s} fill={screen} opacity=".2" />}
        {member.long && <rect x={hx - r * 1.05} y={hy - r * .3} width={r * 1.1} height={r * 1.9} rx={r * .5} fill={member.hair} />}
        <rect x={x - 5.5 * s} y={base - 13.5 * s} width={11 * s} height={13.5 * s} rx={4.5 * s} fill={member.shirt} />
        <circle cx={hx} cy={hy} r={r} fill={member.skin} />
        <path d={`M${hx - r} ${hy + r * .3}A${r} ${r} 0 0 1 ${hx + r * .8} ${hy - r * .55}Q${hx} ${hy - r * .25} ${hx - r * .3} ${hy + r * .35}Z`} fill={member.hair} />
        {mood === 'ASLEEP'
          ? <path d={`M${hx + r * .22} ${hy - r * .05}h${r * .5}`} stroke={ink} strokeWidth=".9" strokeLinecap="round" />
          : <circle cx={hx + r * .45} cy={hy - r * .12} r={.85 * s} fill={ink} />}
        {mood === 'HAPPY' && <path d={`M${hx + r * .12} ${hy + r * .38}q${r * .32} ${r * .34} ${r * .66} 0`} fill="none" stroke={ink} strokeWidth=".9" strokeLinecap="round" />}
        {(mood === 'FLAT' || mood === 'ASLEEP') && <path d={`M${hx + r * .18} ${hy + r * .45}h${r * .5}`} stroke={ink} strokeWidth=".9" strokeLinecap="round" />}
        {mood === 'SAD' && <path d={`M${hx + r * .12} ${hy + r * .6}q${r * .32} -${r * .34} ${r * .66} 0`} fill="none" stroke={ink} strokeWidth=".9" strokeLinecap="round" />}
        {mood === 'SHOCKED' && <ellipse cx={hx + r * .48} cy={hy + r * .5} rx={r * .17} ry={r * .24} fill={ink} />}
        {mood === 'ASLEEP' && <path d={`M${hx + 3.5} ${hy - r - .5}h3l-3 3h3`} fill="none" stroke="#aab2d6" strokeWidth=".9" className={t.glow} />}
        {screen && (
          <g>
            <path d={`M${x + 2 * s} ${base - 9 * s}l${5 * s} ${-1.5 * s}`} stroke={member.shirt} strokeWidth={3.2 * s} strokeLinecap="round" />
            <rect x={x + 6 * s} y={base - 15 * s} width={4.4 * s} height={7 * s} rx={.9 * s} fill="#0b0e19" />
            <rect x={x + 6.7 * s} y={base - 14.2 * s} width={3 * s} height={5.4 * s} rx={.5 * s} fill={screen} className={t.tv} />
          </g>
        )}
      </g>
    );
  };
  const kid = FAMILY[1];
  const teen = FAMILY[2];
  return (
    <g fontFamily={FONT} data-world="FAMILY" data-screens={screens} data-sofa={sharing} data-kids={look.kids ? 1 : 0} data-party={look.party ? 1 : 0}>
      <Sky id={`${uid}-sky`} />
      <defs>
        <linearGradient id={`${uid}-tv`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#9ad0ff" /><stop offset="1" stopColor="#3b5bdb" /></linearGradient>
        <linearGradient id={`${uid}-cartoon`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7dd3fc" /><stop offset="1" stopColor="#fde68a" /></linearGradient>
      </defs>
      <g transform={mirror ? 'matrix(-1 0 0 1 320 0)' : undefined}>
        <rect y="158" width="320" height="22" fill="#0b0e1a" />
        <rect y="157" width="320" height="2" fill="#1f3a2c" />
        {/* next door (seen past the handle): with Watch party, friends watch the same film, in sync */}
        <circle cx="186" cy="132" r="13" fill="#14243a" /><rect x="185" y="140" width="3" height="18" fill="#1b2030" />
        <path d="M206 112 252 86 298 112Z" fill="#221f44" />
        <rect x="212" y="112" width="80" height="46" fill="#171a33" />
        <rect x="228" y="120" width="48" height="28" rx="2" fill={look.party ? '#2b2448' : '#0d1022'} />
        {look.party && <>
          <rect x="246" y="124" width="22" height="13" rx="1.5" fill={`url(#${uid}-tv)`} className={t.tv} />
          <circle cx="236" cy="138" r="3.4" fill="#f2b38a" /><rect x="232" y="141" width="8" height="7" rx="3" fill="#f472b6" />
          <circle cx="244" cy="139" r="3.2" fill="#c68b59" /><rect x="240" y="142" width="8" height="6" rx="3" fill="#60a5fa" />
          <path d="M150 124C178 104 208 108 246 124" fill="none" stroke={accent} strokeWidth="1.6" className={t.beam} />
        </>}
        {/* the house, cut open */}
        <path d="M0 54 80 28 160 54Z" fill="#2a2550" />
        <rect x="4" y="54" width="152" height="104" fill="#191c38" />
        {/* upstairs, the kid's room: a bed and a tablet; a shield on the wall with Kids profiles */}
        <rect x="8" y="58" width="70" height="44" fill={kidRoom ? (look.kids ? '#3b3358' : '#3a2234') : '#0f1325'} />
        <rect x="14" y="90" width="38" height="8" rx="2" fill={kidRoom ? '#6b4a8a' : '#1c2038'} />
        <rect x="15" y="85.5" width="10" height="5" rx="2" fill={kidRoom ? '#e9e3ff' : '#22273f'} />
        <rect x="60" y="64" width="12" height="12" rx="1.5" fill={kidRoom ? '#2a2f55' : '#151a30'} />
        <path d="M66 66.5l1.3 2.7 3 .4-2.2 2 .6 2.9-2.7-1.4-2.7 1.4.6-2.9-2.2-2 3-.4Z" fill={kidRoom ? '#ffd56b' : '#232842'} />
        {kidRoom && look.kids && <path d="M63 82h8v5c0 3.4-4 5-4 5s-4-1.6-4-5Z" fill="#22c55e" />}
        {kidRoom && look.kids && <path d="M65.2 86.4l1.4 1.4 2.6-2.8" fill="none" stroke="#fff" strokeWidth="1" strokeLinecap="round" />}
        {kidRoom && person(kid, 34, 90, look.kids ? '#ffd56b' : '#ff4d5e')}
        {/* upstairs, the teen's room: a desk and a laptop */}
        <rect x="82" y="58" width="70" height="44" fill={teenRoom ? '#1f3a35' : '#0f1325'} />
        <rect x="106" y="88" width="42" height="3" rx="1" fill={teenRoom ? '#4a3a5e' : '#1c2038'} />
        <rect x="108" y="91" width="2.5" height="11" fill="#1c2038" /><rect x="143" y="91" width="2.5" height="11" fill="#1c2038" />
        <rect x="116" y="76" width="16" height="11" rx="1.2" fill={teenRoom ? teen.shirt : '#0b0e19'} stroke={teenRoom ? 'none' : '#262b45'} strokeWidth=".8"
          className={teenRoom ? t.tv : undefined} />
        <rect x="113" y="86.4" width="22" height="1.8" rx=".9" fill="#2a2f50" />
        <rect x="134" y="62" width="10" height="14" rx="1" fill={teenRoom ? '#2a4a44' : '#151a30'} />
        <path d="M137 72v-6l5-1v6" fill="none" stroke={teenRoom ? '#9be7c4' : '#232842'} strokeWidth="1" />
        <rect x="88" y="92" width="16" height="3" rx="1.5" fill={teenRoom ? '#3a3355' : '#1a1e36'} />
        {teenRoom && person(teen, 98, 93, teen.shirt)}
        <rect x="4" y="102" width="152" height="4" fill="#262a4a" />
        {/* the living room: the TV, and whoever shares it on the sofa */}
        <rect x="8" y="106" width="144" height="52" fill="#221f44" />
        <ellipse cx="96" cy="152" rx="56" ry="6" fill="#8ec5ff" opacity=".07" />
        <rect x="116" y="140" width="34" height="10" rx="2" fill="#2d2a52" />
        <rect x="132" y="134" width="4" height="6" fill="#151a2e" />
        <rect x="119" y="113" width="30" height="21" rx="2" fill="#0a0d18" />
        <rect x="121" y="115" width="26" height="17" rx="1.2" fill={`url(#${uid}-tv)`} className={t.tv} />
        {screens > 1 && <rect x="122.5" y="116.5" width="5" height="5" rx="1" fill={FAMILY[0].shirt} stroke="#fff" strokeWidth=".6" />}
        {look.party && <>
          <circle cx="143" cy="119.5" r="2.6" fill="#f472b6" stroke="#fff" strokeWidth=".6" />
          <circle cx="143" cy="126.5" r="2.6" fill="#60a5fa" stroke="#fff" strokeWidth=".6" />
          {[0, 1, 2].map(index => (
            <path key={index} d={`M${126 + index * 7} 112c-1.6-2.4-5-1-3.4 1.8l3.4 3 3.4-3c1.6-2.8-1.8-4.2-3.4-1.8Z`} fill="#ff5c8a"
              className={t.rise} style={{ animationDelay: `${index * .6}s` }} />
          ))}
        </>}
        <rect x="14" y="128" width="96" height="12" rx="4" fill="#3b2f5c" />
        <rect x="12" y="139" width="100" height="13" rx="4" fill="#4a3b70" />
        <rect x="8" y="133" width="8" height="19" rx="3" fill="#3b2f5c" />
        <rect x="108" y="133" width="8" height="19" rx="3" fill="#3b2f5c" />
        {sofa.map((member, index) => person(member, 100 - index * gap, 140, member.id !== 'DAD' && own(member.id) ? member.shirt : null))}
      </g>
      {kidRoom && !look.kids && (
        <g>
          <rect x={mirror ? 320 - 44 - 16 : 44} y="69" width="16" height="9" rx="2" fill="#ff4d5e" />
          <text x={X(52)} y="75.6" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fff">16+</text>
        </g>
      )}
      <Caption text={familyCaption({ ...look, screens })} mirror={mirror} dot={accent} />
    </g>
  );
};

/* ═══ Ads tech: every hour pays ══════════════════════════════════════════════════════════════════════
   A break on a viewer's TV. The ad is the same for all with the Basic ad server; then it fits the show, the
   viewer (it shows what they were thinking of), one home, then is made for them, with its match. The money
   it earns drops into the jar, faster the better the targeting (Commerce). Along the TV's foot, the title's
   breaks: mid-scene, or on the scene cuts with Smarter ad breaks; New ad formats adds a pause ad to shop. */
const AD_LINES = ['SAME AD FOR ALL', 'FITS THE SHOW', 'FITS THE VIEWER', 'ONE AD, ONE HOME', 'MADE FOR THEM'];
const AD_MATCH = [0, 60, 75, 88, 96];
export const AdsWorld: React.FC<{ uid: string; look: StreamingTechAdsLook; accent: string; mirror: boolean }> = ({ uid, look, accent, mirror }) => {
  const at = (from: number, width = 0) => (mirror ? 320 - from - width : from);
  const rank = clamp(look.rank, 0, 4);
  const smart = look.breakSlope < 1;
  const cuts = [.2, .46, .71];
  const breaks = smart ? cuts : [.14, .38, .58, .86];
  const coinEvery = clamp(2.6 - look.commerce / 40, .55, 2.6);
  const ad = rank === 0 ? '#2a3150' : `hsl(${[0, 160, 30, 280, 340][rank]} 52% 40%)`;
  /* a trainer, 30 wide and 14 tall, its toe outward */
  const trainer = (x: number, y: number, fill: string, scale = 1) => (
    <path transform={`translate(${x} ${y}) scale(${(mirror ? -1 : 1) * scale} ${scale})${mirror ? ' translate(-30 0)' : ''}`}
      d="M0 14h30c0-4.5-4.5-6-9-6.8l-6-6c-1.5-1.5-3.8-.8-4.5.8l-1.5 3C5 5 2 6 0 8.5Z" fill={fill} />
  );
  const tvX = at(14, 112);
  const coinFrom = at(104);
  const jar = at(126, 26);
  return (
    <g fontFamily={FONT} data-world="ADS" data-rank={rank} data-coin-every={coinEvery.toFixed(2)} data-jar={clamp(look.commerce / 100, .1, 1).toFixed(2)}>
      <Sky id={`${uid}-sky`} top="#0a0d1c" low="#1a1530" stars={false} />
      <rect y="146" width="320" height="34" fill="#0c0d1a" />
      {/* the TV and the ad on it */}
      <rect x={tvX} y="28" width="112" height="66" rx="4" fill="#1c2236" />
      <rect x={tvX + 3} y="31" width="106" height="60" rx="2" fill={ad} />
      <rect x={at(20, 18)} y="35" width="18" height="9" rx="2" fill="#000" opacity=".55" />
      <text x={at(29)} y="41.6" textAnchor="middle" fontSize="5.4" fontWeight="900" fill="#fff">AD</text>
      {rank > 0 && (
        <g>
          <rect x={at(76, 44)} y="35" width="44" height="9" rx="4.5" fill="#000" opacity=".55" />
          <text x={at(98)} y="41.4" textAnchor="middle" fontSize="5.2" fontWeight="900" fill={rank >= 2 ? accent : '#e7eaf2'}>{AD_MATCH[rank]}% MATCH</text>
        </g>
      )}
      {trainer(at(40, 42), 54, rank === 0 ? '#59627d' : '#ffffff', 1.4)}
      {look.slots > 1 && (
        <g>
          <rect x={at(96, 24)} y="64" width="24" height="13" rx="3" fill="#000" opacity=".8" stroke={accent} strokeOpacity=".7" />
          <text x={at(108)} y="72.6" textAnchor="middle" fontSize="5" fontWeight="900" fill="#e7eaf2">SHOP</text>
        </g>
      )}
      {/* the title's timeline along the screen's foot, and its breaks */}
      <rect x={at(20, 100)} y="84" width="100" height="2.6" rx="1.3" fill="#000" opacity=".5" />
      {cuts.map(cut => <rect key={cut} x={at(20 + cut * 100, 1)} y="81.5" width="1" height="7.5" fill="#c6ccda" opacity=".55" />)}
      {breaks.map(spot => <rect key={spot} x={at(20 + spot * 100 - 2.5, 5)} y="82.8" width="5" height="5" rx="1" fill={smart ? accent : '#f5c451'} />)}
      {/* the viewer on the sofa, and what they were thinking of */}
      <rect x={at(18, 74)} y="132" width="74" height="10" rx="5" fill="#33294d" />
      <rect x={at(22, 66)} y="140" width="66" height="14" rx="4" fill="#2a2342" />
      <circle cx={at(52)} cy="116" r="7" fill="#e0b48c" />
      <rect x={at(44, 16)} y="123" width="16" height="17" rx="5" fill="#3b5bdb" />
      {rank >= 2 && (
        <g>
          <circle cx={at(63)} cy="111" r="1.8" fill="#e7eaf2" opacity=".8" />
          <circle cx={at(68)} cy="106" r="2.6" fill="#e7eaf2" opacity=".85" />
          <rect x={at(73, 30)} y="96" width="30" height="16" rx="8" fill="#e7eaf2" />
          {trainer(at(78, 20), 99, '#3b2b5e', .68)}
        </g>
      )}
      {/* the money: coins drop from the TV into the jar, faster the better the targeting */}
      <defs>
        <clipPath id={`${uid}-jar`}><path d={`M${jar} 124h26v28a5 5 0 0 1-5 5h-16a5 5 0 0 1-5-5Z`} /></clipPath>
      </defs>
      <path d={`M${jar} 124h26v28a5 5 0 0 1-5 5h-16a5 5 0 0 1-5-5Z`} fill="#0f1a28" opacity=".9" />
      <g clipPath={`url(#${uid}-jar)`}>
        <rect x={jar} y={157 - 33 * clamp(look.commerce / 100, .1, 1)} width="26" height="34" fill="#f5c451" />
        {[0, 1, 2].map(index => <rect key={index} x={jar} y={157 - 33 * clamp(look.commerce / 100, .1, 1) + 3 + index * 6} width="26" height="1" fill="#b7862a" opacity=".6" />)}
      </g>
      <path d={`M${jar} 124h26v28a5 5 0 0 1-5 5h-16a5 5 0 0 1-5-5Z`} fill="none" stroke="#9fb3cc" strokeOpacity=".55" />
      <rect x={jar + 4} y="128" width="2.5" height="22" rx="1.2" fill="#fff" opacity=".18" />
      <rect x={jar - 2} y="120" width="30" height="5" rx="2.5" fill="#3a4a63" />
      {[0, 1, 2].map(index => (
        <g key={index} className={t.coin}
          style={{ ['--dx' as string]: `${(jar + 13) - coinFrom}px`, ['--dy' as string]: '60px', animationDuration: `${(coinEvery * 3).toFixed(2)}s`, animationDelay: `${(index * coinEvery).toFixed(2)}s` }}>
          <circle cx={coinFrom} cy="70" r="5" fill="#f5c451" stroke="#b7862a" strokeWidth="1" />
          <text x={coinFrom} y="72.4" textAnchor="middle" fontSize="6" fontWeight="900" fill="#7a5512">$</text>
        </g>
      ))}
      <Caption text={AD_LINES[rank]} mirror={mirror} y={8} dot={rank === 0 ? '#58607a' : accent} />
      <text x={mirror ? 300 : 20} y="170" textAnchor={mirror ? 'end' : 'start'} fontSize="6" fontWeight="900" letterSpacing="1" fill={smart ? accent : '#8b93a5'}>
        {smart ? 'BREAKS AT SCENE CUTS' : 'BREAKS MID-SCENE'}
      </text>
    </g>
  );
};
