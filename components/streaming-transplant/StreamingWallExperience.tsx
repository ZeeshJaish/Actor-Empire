/**
 * EMPIRE+ v2 — THE WALL OF SCREENS  (gate / unlock screen)
 *
 * A streaming market-monitor wall. Eight rival services launch one by one and play
 * their own programming. One screen in the middle is dead — it holds the
 * player's reflection, and it bleeds glimpses of the future they haven't
 * claimed yet (launch night, originals, global, rivals, awards, IPO, crisis,
 * legacy). Camera racks focus onto it, the room dims, and the gate appears with
 * the three real requirements.
 *
 * AVATAR: pass `avatarUrl` — the PNG data URL exported by the game's
 * CharacterCreator (112×128 HD pixel portrait). A built-in placeholder in the
 * same style is drawn only when no URL is supplied.
 */
import css from './presentation/screens/WallOfScreens/WallOfScreens.module.css';
import { cx } from './presentation/cx';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MARKS } from './StreamingBrandVisuals';

/* ============================================================
   TYPES
   ============================================================ */
export interface WallRival {
  name: string; hue: number; markId: string;
  subs: string; show: string; genre: string;
  /** real-world platforms render as a typographic wordmark instead of a glyph */
  wordmark?: boolean;
  /** explicit screen colour (e.g. Apple TV+ reads silver-white, not blue) */
  color?: string;
}
export interface Requirement {
  id: string; label: string; have: number; need: number;
  fmt: (n: number) => string;
}
export interface WallProps {
  playerName: string;
  avatarUrl?: string;
  rivals: WallRival[];
  requirements: Requirement[];
  setupCost: string;      // "$85M"
  treasury: string;       // "$0"
  totalCost: string;      // "$85M"
  onEnter: () => void;
  onClose: () => void;
  /** Activation only: re-render the same room with the slot already taken.
   *  When set, the gate, rack, glimpses and copy are all suppressed — this is
   *  a cinematic backdrop, not an interactive screen. */
  claimed?: { mark: React.ReactNode; name: string; color: string };
}

/* ============================================================
   PLACEHOLDER AVATAR — same HD-pixel language as CharacterCreator
   (only used when the game does not supply avatarUrl)
   ============================================================ */
export const PlaceholderAvatar: React.FC<{ className?: string }> = ({ className }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current?.getContext('2d');
    if (!ctx) return;
    const S = 2, W = 112, H = 128;
    const px = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c; ctx.fillRect(x * S, y * S, w * S, h * S);
    };
    ctx.clearRect(0, 0, W * S, H * S);
    const SKIN = '#d8a479', SHADE = '#b07f57', EDGE = '#2a1a10';
    const HAIR = '#1e1712', HAIRLIT = '#3a2c22';
    const SUIT = '#171a22', SUITLIT = '#232833';
    // shoulders
    px(20, 104, 72, 24, SUIT); px(20, 104, 72, 2, EDGE);
    px(26, 108, 12, 20, SUITLIT); px(74, 108, 12, 20, SUITLIT);
    // neck
    px(48, 92, 16, 16, SHADE); px(48, 92, 16, 3, EDGE);
    // head
    for (let y = 22; y < 98; y++) {
      const t = (y - 22) / 76;
      const hw = Math.round(20 + Math.sin(Math.PI * Math.min(1, t * 1.15)) * 12);
      px(56 - hw, y, hw * 2, 1, SKIN);
      px(56 - hw, y, 2, 1, EDGE); px(56 + hw - 2, y, 2, 1, EDGE);
      if (t > 0.55) px(56 + hw - 8, y, 6, 1, SHADE);
    }
    px(36, 20, 40, 3, EDGE);
    // hair mass
    for (let y = 16; y < 46; y++) {
      const t = (y - 16) / 30;
      const hw = Math.round(18 + t * 15);
      px(56 - hw, y, hw * 2, 1, HAIR);
      if (y < 30) px(56 - hw + 4, y, 10, 1, HAIRLIT);
    }
    px(34, 40, 8, 22, HAIR); px(70, 40, 8, 22, HAIR);
    // brows / eyes
    px(38, 56, 14, 4, '#241a12'); px(60, 56, 14, 4, '#241a12');
    px(40, 63, 12, 7, '#f3ece2'); px(60, 63, 12, 7, '#f3ece2');
    px(45, 64, 5, 6, '#4a3career'.slice(0, 7)); px(64, 64, 5, 6, '#4a3a2a');
    px(45, 64, 5, 6, '#3b2a1c'); px(64, 64, 5, 6, '#3b2a1c');
    px(40, 62, 12, 2, EDGE); px(60, 62, 12, 2, EDGE);
    // nose + mouth
    px(53, 70, 6, 12, SHADE); px(53, 80, 8, 3, EDGE);
    px(46, 88, 20, 3, '#8d4b45'); px(46, 87, 20, 1, EDGE);
    // jaw shadow
    px(38, 94, 36, 3, SHADE);
  }, []);
  return <canvas ref={ref} width={224} height={256} className={className}
    style={{ imageRendering: 'pixelated', display: 'block' }} />;
};

/* ============================================================
   FUTURE GLIMPSES — what plays on the dead channel
   ============================================================ */
type Glimpse = { id: string; label: string; render: (c: string) => React.ReactNode };

const GLIMPSES: Glimpse[] = [
  {
    id: 'launch', label: 'LAUNCH NIGHT',
    render: () => (
      <div className={cx(css.gl, css['gl-launch'])}>
        <div className={css.cd}>00:03</div>
        <div className={css.cdlabel}>GOING LIVE</div>
        <div className={css.pulsering} />
      </div>
    ),
  },
  {
    id: 'original', label: 'YOUR ORIGINAL',
    render: () => (
      <div className={cx(css.gl, css['gl-orig'])}>
        <div className={css.poster}><span>DEAD<br />SIGNAL</span></div>
        <div className={css.tag}>ORIGINAL</div>
      </div>
    ),
  },
  {
    id: 'subs', label: 'SUBSCRIBERS',
    render: () => (
      <div className={cx(css.gl, css['gl-subs'])}>
        <div className={css.num}>1,240,918</div>
        <div className={css.spark}>{Array.from({ length: 14 }).map((_, i) =>
          <i key={i} style={{ height: `${14 + i * 5.5}%`, animationDelay: `${i * 0.03}s` }} />)}</div>
      </div>
    ),
  },
  {
    id: 'global', label: 'GLOBAL',
    render: () => (
      <div className={cx(css.gl, css['gl-global'])}>
        <div className={css.dots}>{Array.from({ length: 54 }).map((_, i) =>
          <i key={i} style={{ animationDelay: `${(i % 9) * 0.05 + Math.floor(i / 9) * 0.04}s` }} />)}</div>
      </div>
    ),
  },
  {
    id: 'rival', label: 'RIVALS',
    render: () => (
      <div className={cx(css.gl, css['gl-rival'])}>
        <svg viewBox="0 0 60 60"><g fill="#0a0b0f">
          <circle cx="30" cy="20" r="11" /><path d="M8 60 Q30 34 52 60Z" /></g>
          <circle cx="25" cy="19" r="1.8" fill="currentColor" /><circle cx="35" cy="19" r="1.8" fill="currentColor" />
        </svg>
        <span>THEY WILL COME FOR YOU</span>
      </div>
    ),
  },
  {
    id: 'awards', label: 'AWARDS',
    render: () => (
      <div className={cx(css.gl, css['gl-award'])}>
        <svg viewBox="0 0 40 54"><g fill="currentColor">
          <path d="M12 4h16v12a8 8 0 0 1-16 0z" /><rect x="18" y="24" width="4" height="12" />
          <rect x="11" y="36" width="18" height="5" rx="1" /><rect x="8" y="41" width="24" height="6" rx="1.5" />
        </g><path d="M12 6H6v5a6 6 0 0 0 6 6M28 6h6v5a6 6 0 0 1-6 6" fill="none" stroke="currentColor" strokeWidth="2" /></svg>
      </div>
    ),
  },
  {
    id: 'ipo', label: 'PUBLIC MARKETS',
    render: () => (
      <div className={cx(css.gl, css['gl-ipo'])}>
        <svg viewBox="0 0 100 46" preserveAspectRatio="none">
          <polyline points="0,40 12,34 24,37 36,26 48,30 60,18 72,21 84,9 100,3"
            fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" />
        </svg>
        <span>+412%</span>
      </div>
    ),
  },
  {
    id: 'crisis', label: 'OUTAGE',
    render: () => (
      <div className={cx(css.gl, css['gl-crisis'])}>
        <div className={css.alert}>◤ SERVICE DOWN ◢</div>
        <div className={css.bars}>{Array.from({ length: 6 }).map((_, i) =>
          <i key={i} style={{ animationDelay: `${i * 0.07}s` }} />)}</div>
      </div>
    ),
  },
  {
    id: 'legacy', label: 'LEGACY',
    render: () => (
      <div className={cx(css.gl, css['gl-legacy'])}>
        <svg viewBox="0 0 60 46"><g fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 42V20a6 6 0 0 1 6-6h20a6 6 0 0 1 6 6v22" /><path d="M10 42h40M18 14V8h24v6" />
        </g></svg>
        <span>WHAT YOU LEAVE BEHIND</span>
      </div>
    ),
  },
];

/* ============================================================
   THE RACK — locked channel slots naming what comes with it
   ============================================================ */
const RACK: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: 'orig', label: 'ORIGINALS', icon: <path d="M5 6h14v12H5zM9 6v12M15 6v12M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.7" /> },
  { id: 'launch', label: 'LAUNCH NIGHT', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="7" /><path d="M12 8v4l3 2" /></g> },
  { id: 'global', label: 'GLOBAL', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="7.5" /><ellipse cx="12" cy="12" rx="3.2" ry="7.5" /><path d="M4.6 12h14.8" /></g> },
  { id: 'rivals', label: 'RIVAL CEOS', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="8.5" cy="9" r="2.8" /><circle cx="16" cy="9" r="2.8" /><path d="M3.5 19c.6-3 2.6-4.4 5-4.4M20.5 19c-.6-3-2.6-4.4-5-4.4" /></g> },
  { id: 'awards', label: 'AWARDS', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M8 3h8v6a4 4 0 0 1-8 0z" /><path d="M12 13v4M9 21h6M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3" /></g> },
  { id: 'mna', label: 'ACQUISITIONS', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="8" width="8" height="11" /><rect x="13" y="4" width="8" height="15" /><path d="M11 13h2" /></g> },
  { id: 'ipo', label: 'GOING PUBLIC', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 18l5-5 3 3 7-8" /><path d="M15 8h4v4" /></g> },
  { id: 'legacy', label: 'LEGACY', icon: <g fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M7 20V10a5 5 0 0 1 10 0v10M4 20h16M9 6V4h6v2" /></g> },
];

const TheRack: React.FC<{ live: number; variant?: 'grid' | 'strip' }> = ({ live, variant = 'grid' }) => (
  <div className={cx(css.rack, (variant === 'strip' ? css.strip : ''))}>
    <div className={css.rackhead}><i /><span>WHAT YOU'RE BUILDING</span><i /></div>
    <div className={css.rackgrid}>
      {RACK.map((r, i) => (
        <div key={r.id} className={cx(css.slot, (live > i ? css.on : ''))} style={{ ['--epx-wall2-d' as string]: `${i * 0.08}s` }}>
          <span className={css.ic}><svg viewBox="0 0 24 24">{r.icon}</svg></span>
          <b>{r.label}</b>
          <i className={css.sweep} />
        </div>
      ))}
    </div>
  </div>
);

/* ============================================================
   RIVAL SCREEN — powers on, then plays its own programming
   ============================================================ */
const RivalScreen: React.FC<{ r: WallRival; i: number; on: boolean }> = ({ r, i, on }) => {
  const c = r.color ?? `hsl(${r.hue} 74% 56%)`;
  return (
    <div className={cx(css.scr, (on ? css.lit : ''))} style={{ ['--epx-wall2-rc' as string]: c, ['--epx-wall2-d' as string]: `${i * 0.19}s` }}>
      <div className={css.crt} />
      <div className={css.content}>
        {/* layer A — app ident */}
        <div className={cx(css.lay, css.a)}>
          {r.wordmark
            ? <span className={css.wordmark} style={{ color: c }}>{r.name}</span>
            : <><span className={css.mk}><svg viewBox="0 0 48 48">{MARKS[r.markId]?.svg}</svg></span><b>{r.name}</b></>}
        </div>
        {/* layer B — TOP 10 TODAY strip */}
        <div className={cx(css.lay, css.b)}>
          <em>TOP 10 TODAY</em>
          <div className={css.toprow}>
            {[1, 2, 3].map(n => (
              <span key={n} className={css.rank}><i>{n}</i><u /></span>
            ))}
          </div>
        </div>
        {/* layer C — continue watching */}
        <div className={cx(css.lay, css.c)}>
          <div className={css.herorow}>
            <span className={css.playbtn}><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
            <div className={css.herometa}><b>{r.show}</b><em>{r.genre}</em></div>
          </div>
          <div className={css.progress}><i /></div>
        </div>
      </div>
      <div className={css.glass} />
      <div className={css.scan} />
      <div className={css.spill} />
    </div>
  );
};

/* ============================================================
   THE WALL
   ============================================================ */
export const WallOfScreens: React.FC<WallProps> = ({
  playerName, avatarUrl, rivals, requirements, setupCost, treasury, totalCost, onEnter, onClose, claimed,
}) => {
  const [beat, setBeat] = useState<0 | 1 | 2>(0);
  const [lit, setLit] = useState(0);
  const [gi, setGi] = useState(0);
  const [rackLive, setRackLive] = useState(0);
  const [flash, setFlash] = useState(false);
  const timers = useRef<number[]>([]);
  const T = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const qualified = requirements.every(r => r.have >= r.need);
  const shortfall = requirements.find(r => r.have < r.need);

  /* power-on cascade → glitch → rack focus */
  useEffect(() => {
    if (claimed) { setLit(rivals.length); setBeat(2); return; }
    rivals.forEach((_, i) => T(() => setLit(i + 1), 380 + i * 190));
    const wallDone = 380 + rivals.length * 190;
    T(() => setBeat(1), wallDone + 500);
    RACK.forEach((_, i) => T(() => setRackLive(i + 1), wallDone + 900 + i * 330));
    T(() => setBeat(2), wallDone + 900 + RACK.length * 330 + 1400);
  }, []); // eslint-disable-line

  /* future glimpses cycle on the dead channel */
  useEffect(() => {
    if (beat === 0) return;
    const iv = window.setInterval(() => {
      setFlash(true);
      window.setTimeout(() => { setGi(g => (g + 1) % GLIMPSES.length); setFlash(false); }, 150);
    }, 1250);
    return () => window.clearInterval(iv);
  }, [beat]);

  const glimpse = GLIMPSES[gi];
  const showGlimpse = !claimed && (beat === 1 || (beat === 2 && !qualified));

  const skip = () => { if (!claimed && beat < 2) { setLit(rivals.length); setRackLive(RACK.length); setBeat(2); } };

  return (
    <div className={cx(css.wall2, css['b' + (beat)], (claimed ? css.claimed : ''))} data-epx-root onClick={skip}
      style={claimed ? { ['--epx-wall2-own' as string]: claimed.color } : undefined}>
      {/* ── the room ── */}
      <div className={css.room}>
        <div className={css.haze} />
        <div className={css.grid}>
          {rivals.slice(0, 4).map((r, i) => <RivalScreen key={r.name} r={r} i={i} on={lit > i} />)}

          {/* the dead channel */}
          <div className={cx(css.scr, css.dead, (!claimed && beat >= 1 ? css.glitching : ''), (claimed ? css.owned : ''))}>
            <div className={css.reflection}>
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <PlaceholderAvatar />}
            </div>
            {showGlimpse && (
              <div className={cx(css.glimpse, (flash ? css.flash : ''))} key={glimpse.id}>
                {glimpse.render('')}
                <span className={css.gllabel}>{glimpse.label}</span>
              </div>
            )}
            {claimed && (
              <div className={cx(css.slotcard, css.owned)}>
                <div className={css.ownmark}>{claimed.mark}</div>
                <b className={css.ownname}>{claimed.name}</b>
                <em className={css.ownlive}><i />LIVE</em>
              </div>
            )}
            {!claimed && beat === 2 && qualified && (
              <div className={cx(css.slotcard, css.ready)}>
                <div className={css.iconph}><i className={css.cur} /></div>
                <b>CLEARED TO LAUNCH</b>
                <em>SLOT RESERVED · {playerName.toUpperCase()}</em>
              </div>
            )}
            <div className={css.noise} />
            <div className={css.glass} />
            <div className={css.scan} />
            {!claimed && beat < 2 && (
              <div className={css.slotcard}>
                <div className={css.iconph}><i className={css.cur} /></div>
                <b>NO SERVICE</b>
              </div>
            )}
          </div>
          {rivals.slice(4, 8).map((r, i) => <RivalScreen key={r.name} r={r} i={i + 4} on={lit > i + 4} />)}
        </div>

      </div>

      {/* what the channel becomes — UI layer, outside the camera */}
      {!claimed && beat < 2 && <TheRack live={rackLive} />}

      <div className={css.vig} />

      {/* ── copy ── */}
      {!claimed && beat === 0 && (
        <div className={css.cap}>
          <span>THE STREAMING FLOOR</span>
          <b>Every screen here belongs to someone.</b>
        </div>
      )}

      {!claimed && beat === 2 && (
        <div className={css.gate}>
          <TheRack live={RACK.length} variant="strip" />
          <div className={cx(css.tally, (qualified ? css.ok : ''))}>
            <i className={css.dot} />
            <span>{qualified ? 'CLEARED TO LAUNCH' : 'NOT YET ELIGIBLE'}</span>
          </div>
          <div className={css.gh}>There is one screen<br />nobody owns.</div>

          <div className={css.reqs}>
            {requirements.map((r, i) => {
              const pct = Math.min(100, Math.round((r.have / r.need) * 100));
              const met = r.have >= r.need;
              return (
                <div key={r.id} className={cx(css.req, (met ? css.met : ''))} style={{ animationDelay: `${0.1 + i * 0.08}s` }}>
                  <div className={css.rtop}>
                    <b>{r.label}</b>
                    <em>{r.fmt(r.have)} <i>/ {r.fmt(r.need)}</i></em>
                  </div>
                  <div className={css.rbar}><span style={{ width: `${pct}%` }} /></div>
                </div>
              );
            })}
          </div>

          <div className={css.cost}>
            {totalCost} to incorporate — <b>{setupCost}</b> fully consumed by registration, legal &amp; foundational rights · operating treasury opens at <b>{treasury}</b>.
          </div>

          <div className={css.gbtns}>
            <button className={cx(css.wbtn, css.ghost)} onClick={onClose}>Not Yet</button>
            <button className={cx(css.wbtn, css.go, (qualified ? '' : css.locked))} onClick={() => qualified && onEnter()}>
              {qualified ? 'Start Your Platform →' : `${shortfall!.fmt(shortfall!.need - shortfall!.have)} more to start`}
            </button>
          </div>
        </div>
      )}

      {!claimed && beat < 2 && <div className={css.skip}>tap to skip</div>}
    </div>
  );
};

/* ============================================================
   STYLE
   ============================================================ */
/* Styles now live in presentation/screens/WallOfScreens/WallOfScreens.module.css */
